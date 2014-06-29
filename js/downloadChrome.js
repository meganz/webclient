/*global window, FileError,alert,document, DEBUG, clearit */
"use strict";

function FileSystemAPI(dl_id, dl) {
	var dl_quotabytes = 0
		, Fs
		, dl_fw
		, dirid = "mega"
		, dl_chunks = []
		, dl_chunksizes = []
		, dialog = false
		, dl_writing
		, dl_position = 0
		, dl_buffer
		, dl_paused = false
		, chrome_write_error_msg = 0
		, targetpos = 0
		, dl_geturl
		, dl_filesize
		, dl_req_storage
		, dl_filename
		, zfileEntry
		, failed = false
		, dl_storagetype = 0
		, dl_done = function() {}
		, IO = this
		;

	window.requestFileSystem = window.webkitRequestFileSystem;

	// errorHandler {{{
	function errorHandler(type) {
		return function (e) {
		  switch (e.code) {
			case FileError.QUOTA_EXCEEDED_ERR:
			  alert('Error writing file, is your harddrive almost full? (' + type + ')');
			  break;
			case FileError.NOT_FOUND_ERR:
			  alert('NOT_FOUND_ERR in ' + type);
			  break;
			case FileError.SECURITY_ERR:
			  dlMethod = MemoryIO; /* change it globaly */
			  dl.io = new MemoryIO(dl_id, dl);
			  dl.io.begin = IO.begin;
			  dl.io.size  = IO.size;
			  dl.io.progress  = IO.progress;
			  dl.io.setCredentials(dl_geturl, dl_filesize, dl_filename, dl_chunks, dl_chunksizes);
			  IO = null
			  break;
			case FileError.INVALID_MODIFICATION_ERR:
			  alert('INVALID_MODIFICATION_ERR in ' + type);
			  break;
			case FileError.INVALID_STATE_ERR:
				console.log('INVALID_STATE_ERROR in ' + type + ', retrying...');
				setTimeout(function() {
					check();
				}, 500);
				break;
			default:
			  alert('webkitRequestFileSystem failed in ' + type);
		  }
		};	
	}
	// }}}

	// dl_createtmpfile  {{{
	var that = this;

	function free_space(error_message) {
		/* error */
		clearit(0,0,function(s) {
			// clear persistent files:
			clearit(1,0,function(s) {
				if (++chrome_write_error_msg % 21 == 0 && !$.msgDialog) {
					chrome_write_error_msg=0;
					msgDialog('warningb','Out of disk space','Your system volume is running out of disk space. Your download will continue automatically after you free up some space.');
					dialog = true;
				}
				
				setTimeout(function() {
					failed = error_message || 'Short write (' + dl_fw.position + ' / ' + targetpos + ')';
					dl_ack_write();
				}, 2000);
			});
		});
	
	}

	function dl_createtmpfile(fs) {
		Fs = fs;
		Fs.root.getDirectory('mega', {create: true}, function(dirEntry) {                
			DEBUG('Directory "mega" created');
			DEBUG("Opening file for writing: " + dl_id);

			var options = {create: true};

			if(is_chrome_firefox) {
				var q = {};
				for(var o in dl_queue) {
					if(dl_queue[o].dl_id == dl_id) {
						q = dl_queue[o];
						break;
					}
				}
				options.fxo = Object.create( q, { size : { value : dl_filesize }});
			}

			fs.root.getFile('mega/' + dl_id, options, function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {     
					DEBUG('File "mega/' + dl_id + '" created');
					dl_fw = fileWriter
					dl_fw.truncate(0);
	
					dl_fw.onerror = function(e) {
						/* onwriteend() will take care of it */
					}
	
					dl_fw.onwriteend = function() {
						if (dl_fw.position == targetpos) {
							chrome_write_error_msg=0; /* reset error counter */
							return dl_ack_write();
						}
	
						/* try to release disk space and retry */
						free_space();
					}
	
					zfileEntry = fileEntry;
					Soon(function() {
						// deferred execution
						that.begin();
						that = null;
					});
				}, errorHandler('createWriter'));
			}, errorHandler('getFile'));
			options = undefined;
		}, errorHandler('getDirectory'));

	}
	// }}}

	function dl_getspace(reqsize, next) {
		DEBUG("reqsize", reqsize);

		function retry() {
			dl_getspace(reqsize, next);
		}

		navigator.webkitPersistentStorage.queryUsageAndQuota(function(used, remaining)  {
			navigator.webkitTemporaryStorage.queryUsageAndQuota(function(tused,tremaining) {
				if (used > 0 || remaining > 0) {
					dl_storagetype = 1
					if (remaining < reqsize) {
						clearit(1, 300, function() {
							retry();
						});
					} else {
						next(true);
					}
				} else {
					// check if our temporary storage quota is sufficient to proceed (require 60% margin because quota the quota can change during the download) :
					dl_storagetype = 0
					if (tremaining > reqsize*1.5+1024*1024*100) {
						next(true);
					} else if (tused+tremaining > reqsize*1.5+1024*1024*100) {
						clearit(0,300,function() {
							retry();
						});
					} else {
						// highly likely that we will run out of 20% of 50% of free our diskspace -> request persistent storage to be able to use all remaining disk space:
						navigator.webkitPersistentStorage.requestQuota(1024*1024*1024*100, function(grantedBytes) {
							if (grantedBytes == 0) return retry();

							dl_storagetype = 1;
							window.webkitRequestFileSystem(PERSISTENT, grantedBytes, function(fs) {
								next(true);
							}, retry);
						}, retry);
					}	
				}
			});
		}, next);
	}

	// Check if the file can be written, return true
	// or fail otherwise
	function check() {
		dl_getspace(dl_filesize, function() {
			window.requestFileSystem(
				dl_storagetype,
				dl_filesize,
				dl_createtmpfile,
				errorHandler('RequestFileSystem')
			);
		});
	}

	if(is_chrome_firefox) {
		this.abort = function(err) {
			if (dl_fw) dl_fw.close(err);
		};
	}

	function dl_ack_write() {
		if (failed) {
			failed = false; /* reset error flag */
			/* retry */
			dl_fw.seek(dl_position);
			DEBUG('IO: error, retrying');
			return setTimeout(function() {
				dl_fw.write(new Blob([dl_buffer]));
			}, 2000);
		}

		if (dialog && $.msgDialog) {
			closeDialog();
			dialog = false;
		}

		dl_writing = false;
		dl_done(); /* notify writer */

		/* release references to callback and buffer */
		dl_buffer = null;
		dl_done   = null;
	}

	this.write = function(buffer, position, done) {
		if (dl.io instanceof MemoryIO) return dl.io.write(buffer, position, done);

		if (position != dl_fw.position) {
			throw new Error([position, buffer.length, position+buffer.length, dl_fw.position]);
		}
		dl_writing  = true;
		failed      = false;
		targetpos   = buffer.length + dl_fw.position;
		dl_position = position
		dl_buffer   = buffer
		dl_done     = done


		DEBUG("Write " + buffer.length + " bytes at " + position  + "/"  + dl_fw.position);
		dl_fw.write(new Blob([buffer]));
	};

	this.download = function(name, path) {
		if (dl.io instanceof MemoryIO) return dl.io.download(name, path);

		document.getElementById('dllink').download = name;
		document.getElementById('dllink').href = zfileEntry.toURL();
		if (!is_chrome_firefox)  {
			document.getElementById('dllink').click();
		}
		IO = null;
	}

	this.setCredentials = function(url, size, filename, chunks, sizes) {
		dl_geturl = url;
		dl_filesize = size;
		dl_filename = filename;
		dl_chunks   = chunks;
		dl_chunksizes = sizes;
		if (this.is_zip || !dl.zipid) {
			check();
		} else {
			// tell the writter everything was fine
			// only on zip, where the IO objects are not
			// doing any write
			this.begin(); 
		}
	};
}
window.requestFileSystem = window.webkitRequestFileSystem;
