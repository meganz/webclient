
var mozOnSavingDownload = function(file,callback,ask) {

	var options = {
		folder: mozGetDownloadsFolder(),
		saveFolder: 2 == ask
	}, f;

	if(!ask && ((mozOnSavingDownload.last_path && file.folder)
		|| (~file.filename.indexOf('.') && options.folder)))
	{
		f = mozFile(file.folder && mozOnSavingDownload.last_path || options.folder,file.filename,file.folder);
	}
	else
	{
		f = mozFilePicker(file.filename);

		if( f && file.folder ) {
			var s = mozGetPath(f.path);
			f = mozFile(s.path,s.file,file.folder);
		}
	}

	options.saveto = f;
	options.folder = f && f.parent;// && f.parent.path;
	mozOnSavingDownload.last_path = file.folder && f && mozGetPath(f.path,file.folder).path;
	if(d) console.log('Saving To: ' + (f && f.path) + ' -- Next path: ' + mozOnSavingDownload.last_path);

	callback(options);
};

function mozFilePicker(f,m,o) {
	o = o || {};
	var title = o.title || (m === 2 ? 'Select Folder':'Save File As');
	var nsIFilePicker = Ci.nsIFilePicker,
		fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window,'MEGA :: ' + title + '...',m||nsIFilePicker.modeSave);
	fp.appendFilters(nsIFilePicker.filterAll); // TODO: ext2filter?
	if(m !== 2) {
		fp.defaultString = f;
		if(~f.indexOf('.')) {
			fp.defaultExtension = f.replace(/^.*\./,'');
		}
	}
	return fp.show() != nsIFilePicker.returnCancel ? (o.gfp ? fp:fp.file) : null;
}

function mozFile(p,f,e) {
	if(p instanceof Ci.nsIFile) {
		var file = p;
	} else {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		file.initWithPath(p);
	}
	if(e) e.forEach(function(s) file.append(s));
	if(f) file.append(f);
	return file;
}

function mozGetPath(p,e) {
	var path = p.split(/[\\\/]+/),
		file = path.pop();
	if(e) {
		var tmp = [].concat(path), l;
		while((l = tmp.pop()) == e.pop());
		tmp.push(l);
		path = tmp;
	}
	return { file : file, path: path.join(path[0][1] === ':' ? '\\':'/')};
}

function mozAlert(m,x,cb) {
	if(d) console.log('mozAlert: '+m);
	var i = 'resource://mega/icon.png', t = 'MEGA '+(x || mozPrefs.getCharPref('version'));
	try {
		Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService)
			.showAlertNotification(i,t,m,!!cb,"",cb, 'MEGA');
	} catch(e) {
		var aw = Services.ww.openWindow(null,"chrome://global/content/alerts/alert.xul",
			"_blank", "chrome,titlebar=no,popup=yes", null);

		aw.arguments = [i,t,m, !!cb, "", cb, 'MEGA'];
	}
}

function mozSetClipboard(str) {
	Cc["@mozilla.org/widget/clipboardhelper;1"]
		.getService(Ci.nsIClipboardHelper).copyString(str);
}

function mozRunAsync(f) {
	Services.tm.currentThread.dispatch(f,Ci.nsIEventTarget.DISPATCH_NORMAL);
}

function mozCloseStream(s) {
	if(s instanceof Ci.nsISafeOutputStream) {
		try {
			s.finish();
			return;
		} catch (e) {
			Cu.reportError(e);
		}
	}
	s.close();
}

var sTimer;
function mozSetTimeout(f,n) {
	var i = Ci.nsITimer,
		t = Cc["@mozilla.org/timer;1"].createInstance(i);
	t.initWithCallback({notify:f},n||30,i.TYPE_ONE_SHOT);
	return sTimer = t;
}

function mozPlaySound(n) {
	if(0) try {
		var snd = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
		snd.init();
		snd.play(Services.io.newURI('chrome://mega/content/sounds/'+(n||'zap')+'.wav',null,null));
		return true;
	}catch(e){}
	return false;
}

function mozDirtyGetAsEntry(aFile,aDataTransfer)
{
	this.__defineGetter__('isFile', function()
	{
		return aFile.isFile();
	});
	this.__defineGetter__('isDirectory', function()
	{
		return aFile.isDirectory();
	});
	this.__defineGetter__('name', function()
	{
		return aFile.leafName;
	});

	this.file = function(aCallback)
	{
		try {
			var type = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromFile(aFile);
		} catch(e) {}

		aCallback({
			name : aFile.leafName,
			size : aFile.fileSize,
			type : type || '',
			lastModifiedDate : aFile.lastModifiedTime,

			u8: function(aStart,aBytes)
			{
				var nsIFileInputStream = Cc["@mozilla.org/network/file-input-stream;1"]
					.createInstance(Ci.nsIFileInputStream);
				nsIFileInputStream.QueryInterface(Ci.nsISeekableStream);
				nsIFileInputStream.init(aFile, -1, -1, false);

				var nsIBinaryInputStream = Cc["@mozilla.org/binaryinputstream;1"]
					.createInstance(Ci.nsIBinaryInputStream);
				nsIBinaryInputStream.setInputStream(nsIFileInputStream);

				this.u8 = function(aStart,aBytes)
				{
					if (d) console.log('mozDirtyGetAsEntry.u8', aStart,aBytes);

					nsIFileInputStream.seek(0,aStart);
					var data = nsIBinaryInputStream.readByteArray(aBytes);
					return new Uint8Array(data);
				};
				this._close = function()
				{
					mozCloseStream(nsIFileInputStream);
				};

				return this.u8(aStart,aBytes);
			},
			blob: function(aStart,aBytes)
			{
				aStart = aStart || 0;
				aBytes = aBytes || this.size;

				if (d) console.log('mozDirtyGetAsEntry.blob', this.name, this.type, aStart,aBytes);

				return new Blob([this.u8(aStart,aBytes)], { type : this.type || 'application/octet-stream'});
			},
			slice: function(aStart,aEnd)
			{
				return this.blob(aStart,aEnd-aStart);
			}
		});
	};

	this.readEntries = function(aCallback)
	{
		var entries = [], de = aFile.directoryEntries;

		while (de.hasMoreElements())
		{
			var file = de.getNext().QueryInterface(Ci.nsIFile);
			entries.push(new mozDirtyGetAsEntry(file,aDataTransfer));
		}

		aCallback(entries);
	};

	this.createReader = function()
	{
		return this;
	};

	if (d) console.log('mozDirtyGetAsEntry', aFile.path);
}

(function __FileSystemAPI(scope) {
	var LOG = function(m) (console.log(m), Services.console.logStringMessage('MEGA :: ' + m));

	if(scope.requestFileSystem || scope.webkitRequestFileSystem) {
		if(!scope.webkitRequestFileSystem)
			scope.webkitRequestFileSystem = scope.requestFileSystem;
		return;
	}

	scope.webkitStorageInfo = {
		TEMPORARY: 0,
		requestQuota: function(t,s,f) f(s),
		queryUsageAndQuota: function(t,f) f(0,1e11)
	};

	scope.TEMPORARY = 0;

	const fs = {
		name : location.host,
		root : {
			getDirectory : function() {},
			createReader : function() {
				return { readEntries : function() {}}
			},
			getFile : function(name,opts,callback) {
				var File = {
					name : '/' + name,
					toURL : function() {
						// mozRunAsync(mozPlaySound);

						if(!this.streaming) {
							this.finishDownload();
						} else {
							this.hasFinished = !0;
							mozRunAsync(function() {
								var o = document.getElementById('download_statustxt');
								o.textContent = o.textContent + ' (Streaming)';
								File.onStreamBuffering();
							});
						}
					},
					finishDownload : function() {
						var f = this.options.saveto,
							fn = f.path.replace(/^.*[\/\\]/g, '');

						if(this.streaming) {
							this.streaming = !1;
							var o = document.getElementById('download_statustxt');
							if(o) o.textContent = o.textContent.replace(/\s\(.*$/,'');
						}

						mozCloseStream(this.fs);
						if(this.filetime)
						{
							try
							{
								f.lastModifiedTime = this.filetime * 1000;
							}
							catch(e)
							{
								Cu.reportError(e);
							}
						}
						this.guid = this.startTime + this.name;
						try {
							var dbc = Services.downloads.DBConnection;

							var dl = {
								name      : fn,
								source    : document.location.href,
								target    : Services.io.newFileURI(f).spec,
								startTime : this.startTime * 1000,
								endTime   : Date.now() * 1000,
								state     : Ci.nsIDownloadManager.DOWNLOAD_FINISHED,
								currBytes : parseInt(this.filesize),
								maxBytes  : parseInt(this.filesize),
								mimeType  : this.type,
								guid      : this.guid
							};
							var stm = dbc.createAsyncStatement(
									'INSERT INTO moz_downloads ('+Object.keys(dl)+')' +
									'VALUES                    ('+Object.keys(dl).map(function(n) ':'+n)+')');

							for(var n in dl)
								stm.params[n] = dl[n];

							try {
								this.stm = stm.executeAsync(this);
							} finally {
								stm.finalize();
							}
							this.downloadDone(fn);
						} catch(e) {
							// Cu.reportError(e);

							try {
								var { Downloads, DownloadsData }
									= Cu.import("resource://app/modules/DownloadsCommon.jsm", {});

								Downloads.getList(Downloads.PUBLIC).then(function(aList) {

									var mOptions = {
										target : f,
										source : {
											url: location.href,
											referrer: location.href
										},
										startTime   : this.startTime,
										totalBytes  : parseInt(this.filesize),
										succeeded   : true,
										contentType : this.type
									};
									Downloads.createDownload(mOptions).then(function(aDownload) {
										// LOG(aDownload.getSerializationHash());
										try {
											/**
											 * This is a private function which might get replaced
											 * so wrapping in a try/catch since we'll not rely on
											 * its presence for the download being properly added
											 * to the Library. Its only purpose here is that the
											 * correct file size is reported there.
											 */
											aDownload._setBytes(mOptions.totalBytes,mOptions.totalBytes);
										} catch(e) {
											Cu.reportError(e);
										}
										aList.add(aDownload).then(function() {
											// aDownload.refresh().then(null,Cu.reportError);
											mozRunAsync(function() {
												this.downloadDone(fn);
												DownloadsData._notifyDownloadEvent("finish");
												// DownloadsData.onDownloadChanged(aDownload);
												// var dataItem = DownloadsData._downloadToDataItemMap.get(aDownload);
												// console.log('dataItem', dataItem);
											}.bind(this));
										}.bind(this), Cu.reportError);
									}.bind(this), Cu.reportError);
								}.bind(this), Cu.reportError);
							} catch(e) {
								Cu.reportError(e);
								this.downloadDone(fn,1);
							}
						}
					},
					downloadDone: function(fn,f) {
						if(!f) {
							mozAlert(fn,'Download Finished.',function(s,t) {
								if(t == 'alertclickcallback') try {
									if(parseInt(Services.appinfo.version) > 23) throw 2;
									Components.classesByID["{7dfdf0d1-aff6-4a34-bad1-d0fe74601642}"]
										.getService(Ci.nsIDownloadManagerUI).show();
								} catch(e) {
									var fe = 'chrome,dialog=no,menubar=no,status=no,'
									 + 'scrollbars=yes,toolbar=no,location=no,resizable=yes';
									Services.ww.openWindow(null,'about:downloads','mega:downloads',fe,null);
								}
							});
						} else {
							mozAlert('Download ' + fn + ' finished.');
						}
					},
					handleCompletion : function(r) {
						if(d) console.log('handleCompletion with reason ' + r);

						var dmui = Services.wm.getMostRecentWindow('Download:Manager');
						if(dmui) try {
							dmui.buildDownloadList(!0);
						} catch(e) {}

						var guid = this.guid;
						Services.downloads.getDownloadByGUID(guid, function(s, r) {
							if(!Components.isSuccessCode(s)) {
								Cu.reportError(new Components.Exception("Huh, invalid GUID: " + guid));
							} else {
								var {DownloadsData} = Cu.import("resource://app/modules/DownloadsCommon.jsm", {});
								DownloadsData._getOrAddDataItem(r, !1);
								DownloadsData._notifyDownloadEvent("finish");
							}
						});
					},
					handleError : function(e) {
						Cu.reportError(e);
					},
					createWriter : function(callback) {
						this.Writer = {
							DONE : 1,
							WRITING : 0,
							readyState : -1,
							position : 0,
							written : 0,
							write : function(x) {
								this.readyState = this.WRITING;
								this.position = this.targetpos;

								var fr = new window.FileReader();
								fr.onload = function(ev) {
									var c = File.fs.write(ev.target.result,x.size);
									File.Writer.readyState = File.Writer.DONE;
									File.Writer[c?'onwriteend':'onerror']();

									if(File.sNode) {
										File.Writer.written += x.size;

										if(!File.streaming) {
											if(File.Writer.written > File.sBufSize) {
												File.streaming = !0;

												mozRunAsync(File.sLiveStream.bind(File));
											}
										} else {
											File.onStreamBuffering();
										}
									}
								};
								fr.readAsBinaryString(x);
							},
							truncate : function(p) {
								if(p || this.position) {
									alert('Unexpected truncate offset ' + p);
									throw new Error('Unexpected truncate offset ' + p);
								}
							},
							seek : function(p) {
								File.fs.seek(0,p);
							},
							close : function() {
								mozCloseStream(File.fs);
							}
						};

						callback(this.Writer);
					},

					onStreamComplete : function(callback) {
						var e = this.sNode;
						e.pause();
						e.removeEventListener('play', this.onStreamPlaying, false );
						e.src = 'resource://mega/images/download_cloud.webm';
						mozSetTimeout(callback.bind(this),580);
					},

					onStreamBuffering : function() {
						if(this.onStreamPlaying.paused == 2) {
							var e = this.sNode;
							e.src = e.getAttribute('source') +'#t='
								+ this.onStreamPlaying.currentTime;
							e.play();
						}
					},

					onStreamPlaying : function(e) {
						if(d) console.log('onStreamPlaying ' + e.duration);

						this.onStreamPlaying.paused = 0;
						var pause = function() {
							if(d) console.log('onStreamPlaying.pause '
								+ this.onStreamPlaying.currentTime+'/'+e.currentTime+'/'+e.duration);

							this.onStreamPlaying.paused = 1;
							removeListeners(e.currentTime != e.duration);
						}.bind(this);

						var timeupdate = function() {
							if(e.currentTime != e.duration)
								this.onStreamPlaying.currentTime = e.currentTime;
						}.bind(this);

						var error = function() {
							this.onStreamPlaying.paused = 2;
							removeListeners(1);
							if(this.hasFinished) {
								this.onStreamComplete(this.finishDownload);
								return;
							}
						}.bind(this);

						var ended = function() {
							if(d) console.log('onStreamPlaying.ended ' + e.currentTime);

							error();

							if(!this.hasFinished) {

								var now = Date.now();
								if((now - this.onStreamPlaying.lastry) > 2345) {
									this.onStreamPlaying.lastry = now;

									if(d) console.log('restarting playing at '
										+ this.onStreamPlaying.currentTime);

									e.src = e.getAttribute('source')
										+ '#t=' + this.onStreamPlaying.currentTime;
									e.play();
								}
							}
						}.bind(this);

						e.addEventListener('ended', ended, false);
						e.addEventListener('pause', pause, false);
						e.addEventListener('error', error, false);
						e.addEventListener('timeupdate', timeupdate, false);

						var removeListeners = function(all) {
							e.removeEventListener('pause', pause, false);
							if(all) {
								e.removeEventListener('ended', ended, false);
								e.removeEventListener('error', error, false);
								e.removeEventListener('timeupdate', timeupdate, false);
							}
						};

						if(!("lastry" in this.onStreamPlaying))
							this.onStreamPlaying.lastry = -1;
					},

					sLiveStream : function() {
						var e = File.sNode;
						document.querySelector('#download_status > div.download-cloud').appendChild(e);

						this.onStreamPlaying = this.onStreamPlaying.bind(this,e);
						e.addEventListener('play', this.onStreamPlaying, false );

						e.src = e.getAttribute('source');
						mozRunAsync(e.play.bind(e));
					}
				};

				File.filesize = scope.dl_filesize;
				File.filename = (scope.dl_zip && scope.dl_zip.name || scope.dl_filename)
					.replace(/[:\/\\<">|?*]+/g,'.').replace(/\s*\.+/g,'.').substr(0,256);

				try {
					if(scope.dl_queue[scope.dl_queue_num].p && !scope.dl_zip)
						File.folder = ('' + scope.dl_queue[scope.dl_queue_num].p).split(/[\\\/]+/).filter(String);
					File.filetime = scope.dl_queue[scope.dl_queue_num].t;
				} catch(e) {}

				function osd_cb(options) {

					File.options = options;

					var fs, f = options.saveto;

					if( f ) try {
						if(f.exists())
							f.remove(false);

						f.create(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0755",8));
						fs = Cc["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
						fs.QueryInterface(Ci.nsISeekableStream);
						fs.init(f, 0x02 | 0x08 | 0x20, parseInt("0755",8), 0);
					} catch(ex) {
						Cu.reportError(ex);
						var ps = Services.prompt,
							btn = ['Yes','Yes, saving as default'],
							flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING +
								ps.BUTTON_POS_1 * ps.BUTTON_TITLE_CANCEL  +
								ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING,
							msg = 'Unexpected Download Error:\n'
								+ '\nFile: ' + f.path
								+ '\nError: ' + ex.message
								+ '\n\nWould you like to choose a different folder?',
							r = ps.confirmEx(null,'MEGA',msg,flags,
									btn[0],"",btn[1],null,{value:!1});

						switch( r ) {
							case 0: ++r;
							case 2:
								return mozOnSavingDownload(File,osd_cb,r);
						}
						fs = null;
					}

					if((File.fs = fs)) {
						if(options.saveFolder && options.folder) {
							if(d) console.log('Using new downloads folder: ' + options.folder.path);
							mozSetDownloadsFolder(options.folder);
						}

						File.sBufSize = Math.min(4*1024*1024,File.filesize * 1.3 / 100);
						File.startTime = Date.now();

						try {
							File.type = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromFile(f);
						} catch(e) {}

						if(File.type && options.streaming && location.hash.substr(0,3) !== '#fm') {

							mozRunAsync(function() {
								// var e = document.createElement(File.type.split('/').shift());
								var e = document.createElement('video');

								if(e.canPlayType(File.type)) {

									f = mozFile(f.path.replace(/(\.\w+)$/,'-1$1'))

									if(f.exists()) {
										f = Services.io.newFileURI(f,null,null).spec;
										if(d) console.log('Streaming ' + e.nodeName + ' ' + f + ' ('+File.type+')');

										e.setAttribute('width', '360');
										e.setAttribute('height', '202');
										e.setAttribute('source',f);
										e.setAttribute('controls','controls');
										e.setAttribute('poster','resource://mega/images/download_cloud.png');
										e.setAttribute('style','box-shadow:0 0 7px #111;background-color:#444;border-radius:8px');
										// document.body.appendChild(e);
										File.sNode = e;
									}

								} else {
									if(d) console.log('Cannot play type ' + File.type);
								}
							});
						}

						callback(File);

						scope.addEventListener('unload',function() {

							if(downloading || File.streaming) {
								var finish = function() {
									if(File.hasFinished) {
										File.finishDownload();
									} else {
										mozCloseStream(File.fs);
										File.options.saveto.remove(!1);
									}
								};

								if(File.streaming) {
									File.onStreamComplete(finish);
								} else {
									mozRunAsync(finish);
								}

								for (var slot = scope.dl_maxSlots;
									slot--; dl_xhrs[slot].abort());
								scope.dl_cancel();
							}
						}, false);

					} else {
						try {
							scope.downloading = !1;
							document.getElementById('download_statustxt').textContent = 'Download ' + (f ? 'Error!':'Cancelled.');
							document.querySelector('.progress-block').style.display = 'none';
							document.getElementById('download_speed').textContent = '\u221E';
							document.getElementById('download_filename').style.marginBottom = '20px';
						} catch(e) {
							Cu.reportError(e);
						}
					}
				}

				mozOnSavingDownload(File,osd_cb);
			}
		}
	};

	function FakeFileAPI(type, size, callback) {
		if(~[0,1].indexOf(type)) {
			callback(fs);
		}
	}

	scope.webkitRequestFileSystem = scope.requestFileSystem = FakeFileAPI;

})(self);

(function __mozPreferences(scope) {
	scope.mozPrefs = Services.prefs.getBranch('extensions.mega.');

	scope.mozGetDownloadsFolder = function()
	{
		try
		{
			return mozPrefs.getComplexValue('dir', Ci.nsIFile );
		}
		catch(e)
		{
			return mozAskDownloadsFolder();
		}
	};

	scope.mozSetDownloadsFolder = function(folder)
	{
		if (typeof folder === 'string') folder = mozFile(folder);

		mozPrefs.setComplexValue('dir', Ci.nsIFile, folder );
	};

	scope.mozAskDownloadsFolder = function(m)
	{
		var folder = mozFilePicker(null,2,{title : m || 'Please choose downloads folder'});

		if (folder)
		{
			mozSetDownloadsFolder(folder);
		}
		else
		{
			mozAlert('Mandatory downloads folder not chosen.');
		}

		return folder;
	};

	if (!mozPrefs.getPrefType('dir'))
	{
		/**
		 * Downloads will be saved on the Desktop by default
		 */
		mozSetDownloadsFolder(Services.dirsvc.get("Desk", Ci.nsIFile));
	}

	try
	{
		var test = mozGetDownloadsFolder();

		if (!(test && test.exists() && test.isDirectory()))
		{
			// throw new Error('The chosen downloads folder is not valid.');
			mozAskDownloadsFolder();
		}
	}
	catch(e)
	{
		Cu.reportError(e);
		alert(e);
	}
})(self);
