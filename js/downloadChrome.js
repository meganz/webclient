(function (window) {
	"use strict";

	function clearit(storagetype, t, callback)
	{
		var tsec = t || 3600;
		function errorHandler2(e)
		{
			if (d) console.error('error', e);
			if (callback) callback(e);
		}
		function toArray(list)
		{
			return Array.prototype.slice.call(list || [], 0);
		}
		function readentry()
		{
			if (entries.length == 0)
			{
				if (callback) callback(0);
			}
			else if (i < entries.length)
			{
				var file = entries[i];
				if (file.isFile && !isTrasferActive(file.name))
				{
					file.getMetadata(function (metadata)
					{
						// do not delete file while it's being copied from FS to DL folder
						// conservative assumption that a file is being written at 1024 bytes per ms
						// add 30000 ms margin

						var deltime = metadata.modificationTime.getTime() + tsec * 1000 + metadata.size / 1024 + 30000;

						if (deltime < Date.now() && deltime < lastactive)
						{
							file.remove(function ()
							{
								totalsize += metadata.size;
								if (d) console.log('temp file removed', file.name, bytesToSize(metadata.size));
								if (++del == entries.length && callback) callback(totalsize);
							},
							function()
							{
								if (d) console.log('temp file removal failed', file.name, bytesToSize(metadata.size));
								if (++del == entries.length && callback) callback(totalsize);
							});
						}
						else
						{
							if (d) console.log('tmp file too new to remove', file.name, bytesToSize(metadata.size));
							if (++del == entries.length && callback) callback(totalsize);
						}
					});
				}
				i++;
				readentry();
			}
		}
		function onInitFs(fs)
		{
			fs.root.getDirectory('mega', {create:true}, function(dirEntry)
			{
				function readEntries()
				{
					dirReader.readEntries(function (results)
					{
						if (!results.length)
						{
							readentry();
						}
						else
						{
							entries = entries.concat(toArray(results));
							readEntries();
						}
					},errorHandler2);
				}
				var dirReader = dirEntry.createReader();
				readEntries();
			},errorHandler2);
		}
		var i = 0;
		var del = 0;
		var entries = [];
		var totalsize = 0;
		if (window.webkitRequestFileSystem)
		{
			var st = storagetype ? 'Persistent':'Temporary';
			navigator['webkit'+st+'Storage'].queryUsageAndQuota(function(used, remaining)
			{
				if (used+remaining)
				{
					if (d) console.log('Cleaning '+st+' Storage...', bytesToSize(used), bytesToSize(remaining));
					window.webkitRequestFileSystem(storagetype, 1024, onInitFs, errorHandler2);
				}
				else
				{
					if (callback) callback(0);
				}
			}, errorHandler2);
		}
		else errorHandler2();
	}

	var WRITERR_DIAGTITLE = 'Out of HTML5 Offline Storage space', chrome_write_error_msg = 0;
	function free_space(callback, ms)
	{
		/* error */
		clearit(0, 0, function (s)
		{
			if (d) console.log('Freed %s of temporary storage', bytesToSize(s));

			// clear persistent files:
			clearit(1, 0, function (s)
			{
				if (d) console.log('Freed %s of persistent storage', bytesToSize(s));

				if (callback) setTimeout(callback, ms || 2600);
			});
		});
	}

	var HUGE_QUOTA = 1024 * 1024 * 1024 * 100;
	function dl_getspace(reqsize, callback, max_retries)
	{
		function retry(aStorageType, aEvent)
		{
			if (d) console.error('Retrying...', max_retries, arguments);

			if (max_retries) Later(dl_getspace.bind(this, reqsize, callback, --max_retries));
			else
			{
				callback(aStorageType, aEvent, -1);
			}
		}
		var zRetry = retry.bind(null, 0);

		if (typeof max_retries === 'undefined') max_retries = 3;

		if (d) console.log("Requesting disk space for %s (%d bytes)", bytesToSize(reqsize), reqsize);

		navigator.webkitPersistentStorage.queryUsageAndQuota(function onPQU(used, remaining)
		{
			if (d) console.log('Used persistent storage: %s, remaining: %s', bytesToSize(used), bytesToSize(remaining));

			navigator.webkitTemporaryStorage.queryUsageAndQuota(function onTQU(tused, tremaining)
			{
				if (d) console.log('Used temporary storage: %s, remaining: %s', bytesToSize(tused), bytesToSize(tremaining));

				if (used > 0 || remaining > 0)
				{
					if (remaining < reqsize)
					{
						clearit(1, 300, retry.bind(null, 1));
					}
					else
					{
						callback(PERSISTENT);
					}
				}
				else
				{
					/**
					 * Check if our temporary storage quota is sufficient to proceed.
					 * (require 60% margin because the quota can change during the download)
					 */
					if (tremaining > reqsize * 1.5 + 1024 * 1024 * 100)
					{
						callback();
					}
					else if (tused + tremaining > reqsize * 1.5 + 1024 * 1024 * 100)
					{
						clearit(0, 300, zRetry);
					}
					else
					{
						/**
						 * Highly likely that we will run out of 20% of 50% of free our diskspace
						 * -> request persistent storage to be able to use all remaining disk space.
						 */
						navigator.webkitPersistentStorage.requestQuota(HUGE_QUOTA, function onRQ(grantedBytes)
						{
							if (d) console.log('Granted persistent storage: %s', bytesToSize(grantedBytes));

							if (grantedBytes == 0)
							{
								// user canceled the quota request?
								retry(0, {code:FileError.SECURITY_ERR});
							}
							else
							{
								/**
								 * Looks like Chrome is granting storage even in Incognito mode,
								 * ideally it should call our errorHandler without bothering
								 * the user... [CHROME 36.0.1985.125]
								 */
								window.webkitRequestFileSystem(PERSISTENT, grantedBytes,
									function (fs) {
										callback(PERSISTENT);
									},
									retry.bind(null, 1)
								);
							}
						}, zRetry);
					}
				}
			}, zRetry);
		}, zRetry);
	}

	function errorHandler(type, e)
	{
		// TODO: FileError is deprecated. Please use the 'name' or 'message' attributes of DOMError rather than 'code'.
		switch (e.code)
		{
			case FileError.QUOTA_EXCEEDED_ERR:
				alert('Error writing file, is your harddrive almost full? (' + type + ')');
				break;
			case FileError.NOT_FOUND_ERR:
				alert('NOT_FOUND_ERR in ' + type);
				break;
			case FileError.SECURITY_ERR:
				alert('File transfers do not work with Chrome Incognito. (Security Error in ' + type + ')');
				break;
			case FileError.INVALID_MODIFICATION_ERR:
				alert('INVALID_MODIFICATION_ERR in ' + type);
				break;
			case FileError.INVALID_STATE_ERR:
				console.log('INVALID_STATE_ERROR in ' + type + ', retrying...');
				Later(this.fsInitOp.bind(this));
				break;
			default:
				alert('webkitRequestFileSystem failed in ' + type);
		}
	}

	window.FileSystemAPI = function fsIO(dl_id, dl)
	{
		var
			dl_fw,
			dl_chunks = [],
			dl_chunksizes = [],
			dl_writing,
			dl_position = 0,
			dl_buffer,
			dl_geturl,
			dl_filesize,
			dl_filename,
			dl_done,
			dl_storagetype = 0,
			targetpos = 0,
			zfileEntry,
			wTimer,
			failed = false,
			that = this;

		function dl_createtmpfile(fs)
		{
			var options = { create : true };
			fs.root.getDirectory('mega', options, function (dirEntry)
			{
				if (d) console.log("Opening file for writing: mega/" + dl_id);

				if (is_chrome_firefox) options.fxo = Object.create(dl,{size:{value:dl_filesize}});

				fs.root.getFile('mega/' + dl_id, options, function (fileEntry)
				{
					fileEntry.createWriter(function (fileWriter)
					{
						if (d) console.log('File "mega/' + dl_id + '" created');
						dl_fw = fileWriter;

						dl_fw.onerror = function (e)
						{
							/* onwriteend() will take care of it */
							if (d) console.error(e);
						};

						dl_fw.onwriteend = function ()
						{
							if (that)
							{
								ASSERT(dl_fw.readyState === dl_fw.DONE, 'Error truncating file!');
								if (dl_fw.readyState === dl_fw.DONE)
								{
									that.begin();
									that = null;
								}
								return;
							}

							if (dl_fw.position == targetpos)
							{
								chrome_write_error_msg = 0;
								/* reset error counter */
								dl_ack_write();
							}
							else
							{
								console.error('Short write (' + dl_fw.position + ' / ' + targetpos + ')');

								/* try to release disk space and retry */
								free_space(function()
								{
									if (++chrome_write_error_msg % 21 == 0 && !$.msgDialog)
									{
										chrome_write_error_msg = 0;
										msgDialog('warningb', WRITERR_DIAGTITLE,
											'Your browser storage for MEGA is full. '+
											'Your download will continue automatically after you free up some space.');
									}
									failed = true;
									dl_ack_write();
								});
							}
						};
						zfileEntry = fileEntry;
						dl_fw.truncate(0);
					},
					errorHandler.bind(that, 'createWriter'));
				},
				errorHandler.bind(that, 'getFile'));

				options = undefined;
			},
			errorHandler.bind(that, 'getDirectory'));
		}

		this.fsInitOp = function check()
		{
			dl_getspace(dl_filesize, function (aStorageType, aEvent, aFail)
			{
				if (wTimer === null) return;

				if (aFail === -1)
				{
					if (!$.msgDialog)
					{
						msgDialog('warningb', WRITERR_DIAGTITLE,
							'Your available browser storage for MEGA cannot '+
							'handle this download size, please free up some disk space.');
					}
					return wTimer = setTimeout(this.fsInitOp.bind(this), 2801);
				}
				dl_storagetype = aStorageType !== 1 ? 0 : 1;

				if (d) console.log('Using Storage: '+ ({0:'Temporary',1:'Persistent'})[dl_storagetype], aStorageType, aEvent, aFail);

				window.requestFileSystem(
					dl_storagetype,
					dl_filesize,
					dl_createtmpfile,
					errorHandler.bind(this, 'RequestFileSystem')
				);
			}.bind(this));
		};

		this.abort = function (err)
		{
			if (wTimer) clearTimeout(wTimer);
			wTimer = null;

			if (dl_fw)
			{
				if (is_chrome_firefox)
				{
					dl_fw.close(err);
				}
				else if (err)
				{
					dl_fw.onerror=dl_fw.onwriteend=function(){};
					dl_fw.truncate(0);
				}
			}
		};

		function dl_ack_write()
		{
			if (failed)
			{
				/* reset error flag */
				failed = false;
				/* retry */
				dl_fw.seek(dl_position);
				DEBUG('IO: error, retrying');
				return wTimer = setTimeout(function() { dl_fw.write(new Blob([dl_buffer]))}, 2600);
			}

			if ($.msgDialog && $('#msgDialog:visible .fm-dialog-title').text() == WRITERR_DIAGTITLE) closeDialog();

			dl_buffer = null;
			dl_writing = false;
			if (dl_done) dl_done(); /* notify writer */
		}

		this.write = function (buffer, position, done)
		{
			if (dl_writing || position != dl_fw.position)
				throw new Error([position, buffer.length, position + buffer.length, dl_fw.position]);

			failed      = false;
			targetpos   = buffer.length + dl_fw.position;
			dl_writing  = true;
			dl_position = position;
			dl_buffer   = buffer
			dl_done     = done;

			if (d) console.log("Write " + buffer.length + " bytes at " + position + "/" + dl_fw.position);
			dl_fw.write(new Blob([buffer]));
		};

		this.download = function (name, path)
		{
			document.getElementById('dllink').download = name;
			document.getElementById('dllink').href = zfileEntry.toURL();
			if (!is_chrome_firefox) document.getElementById('dllink').click();
		}

		this.setCredentials = function (url, size, filename, chunks, sizes)
		{
			dl_geturl = url;
			dl_filesize = size;
			dl_filename = filename;
			dl_chunks = chunks;
			dl_chunksizes = sizes;
			this.fsInitOp();
		};
	};

	window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

	if (navigator.webkitGetUserMedia) Later(function()
	{
		window.webkitRequestFileSystem(0, 0x10000,
			function (fs)
			{
				free_space();
			},
			function (e)
			{
				if (e && e.code === FileError.SECURITY_ERR)
				{
					console.error('Switching to MemoryIO');
					window.Incognito = true;
					dlMethod = MemoryIO;
				}
			}
		);
	});
})(this);
