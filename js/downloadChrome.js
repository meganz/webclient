/*global window, FileError,alert,document, DEBUG, clearit */
"use strict";

function FileSystemAPI(dl_id) {
	var dl_storagetype
		, dl_quotabytes = 0
		, dl_instance = 0
		, IO = this
		, fs_instance
		, Fs
		, dl_fw
		, dirid = "mega"
		, testSize = 1024 * 1024 * 1024 * 25
		, dlMain
		, dl_chunks = []
		, dl_chunksizes = []
		, dl_writing
		, dl_ack_write = function() {}
		, targetpos = 0
		, dl_geturl
		, dl_filesize
		, dl_req_storage
		, dl_filename
		, zfileEntry
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
			  alert('File transfers do not work with Chrome Incognito.<br>' + '(Security Error in ' + type + ')');
			  break;
			case FileError.INVALID_MODIFICATION_ERR:
			  alert('INVALID_MODIFICATION_ERR in ' + type);
			  break;
			case FileError.INVALID_STATE_ERR:
				fs_instance = dl_instance;
				console.log('INVALID_STATE_ERROR in ' + type + ', retrying...');
				setTimeout(function() {
					IO.check();				
				}, 500);
				break;
			default:
			  alert('webkitRequestFileSystem failed in ' + type);
		  }
		};	
	}
	// }}}

	// dl_getspace {{{
	function dl_getspace(storagetype,minsize) {		
		storagetype = storagetype || 0;		
		minsize =  minsize || 0;

		window.webkitStorageInfo.queryUsageAndQuota(1, function(used, remaining)  {		
			if (remaining > 0) {
				dl_quotabytes = remaining;
				dl_storagetype=1;
				if (dl_quotabytes < 1073741824) {
					clearit(1,3600);
				} else {
					clearit(1);
				}
				dlMain();
			} else {
				var requestbytes = testSize * 4;
				switch (storagetype) {
				case 0:
					requestbytes = testSize;
					break;
				case 1:
					dl_req_storage = true; 
					break;
				}

				window.webkitStorageInfo.requestQuota(storagetype, requestbytes,function(grantedBytes)  {
				   window.webkitStorageInfo.queryUsageAndQuota(storagetype, function(used, remaining) {						
						if (storagetype === 1) {
							dl_req_storage = false;
						}
						
						dl_quotabytes = remaining;						
						
						if (dl_quotabytes < 1073741824) {
							clearit(storagetype,3600);	
						}
						
						if ((remaining == 0) && (storagetype == 1)) {
							if (!dl_req_storage) { 
								dl_getspace(1,minsize);
							}
							return false;				
						} else if ((minsize > dl_quotabytes) && (storagetype == 0)) {
							if (!dl_req_storage) {
								dl_getspace(1,minsize)
							}
							return false;						
						}	else if ((minsize > dl_quotabytes) && (storagetype == 1)) {
							clearit(storagetype,3600);
						}
						
						if (remaining > 0) { 
							dl_storagetype = storagetype;							
						}
												
						dlMain();
					},  dlError('error: could not query usage and storage quota. (FSFileSystem)'));
				},  dlError('ERROR: Could not grant storage space (FSFileSystem)'));
			}		
		}, dlError('ERROR: Could not query usage and storage quota.'));
	}
	// }}}
	
	function dl_createtmpfile(fs) {
		Fs = fs;
		Fs.root.getDirectory(dirid, {create: true}, function(dirEntry)  {		
			DEBUG('Directory "' + dirid + '" created')
			document.dirEntry = dirEntry;
		}, errorHandler('getDirectory'));
		DEBUG("Opening file for writing: " + dl_id);

		var path = dirid + '/' + dl_id;
		Fs.root.getFile(path, {create: true}, function(fileEntry) {
			fileEntry.createWriter(function(fileWriter) {
				DEBUG('FILE "' + path + '" created');
				dl_fw = fileWriter;
				dl_fw.truncate(0);
				dl_fw.onerror = function(e) {
					DEBUG("Write failed: " + e.toString())
					dl_writing = false;
					dl_write_failed(e);
				};
				dl_fw.onwriteend = function() {
					DEBUG("fileWriter: onwriteend, position: " + this.position + ", expected: " + targetpos);
					dl_writing = false;

					if (this.position == targetpos) { 
						dl_ack_write();
					} else {
						dl_write_failed('Short write (' + this.position + ' / ' + targetpos + ')');
					}
				};

				zfileEntry = fileEntry;
				IO.begin();
			}, errorHandler('createWriter'));
		}, errorHandler('getFile'));
	}

	// Check if the file can be written, return true
	// or fail otherwise
	function check() {
		window.requestFileSystem(
			dl_storagetype, 
			testSize, 
			dl_createtmpfile,
			errorHandler('RequestFileSystem')
		);
	}

	IO.write = function(buffer, position, done) {
		if (dl_writing || position !== dl_fw.position) {
			// busy or not there yet
			DEBUG(dl_writing ? "Writer is busy, I'll retry in a bit" : "Queueing future chunk");
			return setTimeout(function() {
				IO.write(buffer, position, done);
			}, 100);
		}
		dl_writing   = true;
		dl_ack_write = done;
		targetpos    = buffer.length + dl_fw.position;
		DEBUG("Write " + buffer.length + " bytes at " + position  + "/"  + dl_fw.position);
		dl_fw.write(new Blob([buffer]));
	};

	IO.download = function(name, path) {
		document.getElementById('dllink').download = name;
		document.getElementById('dllink').href = zfileEntry.toURL();
		if (!is_chrome_firefox)  {
			document.getElementById('dllink').click();
		}
	}

	IO.setCredentials = function(url, size, filename, chunks, sizes) {
		dl_geturl = url;
		dl_filesize = size;
		dl_filename = filename;
		dl_chunks   = chunks;
		dl_chunksizes = sizes;
		check();
	};

    /**
     *	Static Method Check
     *
     *	Run all the needed async tests to make sure the selected
     *	download method works on the current browser
     *
     */
	IO.check = function(main) {
		dlMain = main;
		dl_getspace(0);
	}
}
