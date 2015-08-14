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
	title = 'MEGA '+(mozMEGAExtensionVersion||'')+' :: ' + title + '...';
	fp.init(window,title,m||nsIFilePicker.modeSave);
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
	} else if(":" == p[0]) {
		var file = Services.dirsvc.get(p.substr(1), Ci.nsIFile);
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
		mozAlertsService.showAlertNotification(i,t,m,!!cb,"",cb, 'MEGA');
	} catch(e) {
		var aw = Services.ww.openWindow(null,"chrome://global/content/alerts/alert.xul",
			"_blank", "chrome,titlebar=no,popup=yes", null);

		aw.arguments = [i,t,m, !!cb, "", cb, 'MEGA'];
	}
}

function mozSetClipboard(str) {
	mozClipboardHelper.copyString(str);
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
			mozError(e);
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
	aFile = aFile.clone();

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
		var file = {
			name : aFile.leafName,
			size : aFile.fileSize,
			type : mozGetMIMEType(aFile),
			lastModifiedDate : aFile.lastModifiedTime,
			get mozFile() aFile,

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
					nsIFileInputStream.seek(0,aStart);
					var data = nsIBinaryInputStream.readByteArray(aBytes);

					if (d && (aBytes != 64 || d > 2)) { // 64 == fingerprint
						console.log('mozDirtyGetAsEntry.u8', aStart,aBytes, this.name, this.type,
							this.size, ''+data.slice(0,16).map(function(n) n.toString(16)));
					}

					return new Uint8Array(data);
				};
				this._close = function()
				{
					mozCloseStream(nsIFileInputStream);
					delete this._close;
					aFile = undefined;
				};

				return this.u8(aStart,aBytes);
			},
			blob: function(aStart,aBytes)
			{
				aStart = aStart || 0;
				aBytes = aBytes || this.size;

				return new Blob([this.u8(aStart,aBytes)], { type : this.type || 'application/octet-stream'});
			},
			slice: function(aStart,aEnd)
			{
				return this.blob(aStart,aEnd-aStart);
			}
		};
		var __done = function() {
			aCallback(file);
			__done = file = undefined;
		};
		var nop = true;
		if (aFile.fileSize === 0) {
			// If this is a junction, try to get the real size
			try {
				OS.File.stat(aFile.path)
					.then(function statSucceed(aInfo) {
						if (ASSERT(!aInfo.isDir, 'Stat operation performed over directory')) {
							file.size = +aInfo.size | 0;
						}
						if (d) console.log('Stat.fileSize', file.size, aInfo);
						__done();
					}, function statFailed() {
						mozError(arguments);
						__done();
					});
				nop = false;
			} catch(e) {
				mozError(e);
			}
		}
		if (nop) {
			mozRunAsync(__done);
		}
	};

	this.readEntries = function(aCallback)
	{
		var entries = [], de = aFile.directoryEntries;

		while (de.hasMoreElements())
		{
			var file = de.getNext().QueryInterface(Ci.nsIFile);
			entries.push(new mozDirtyGetAsEntry(file,aDataTransfer));
		}

		mozRunAsync(aCallback.bind(this, entries));
	};

	this.createReader = function()
	{
		return this;
	};

	if (d) console.log('mozDirtyGetAsEntry', aFile.path);
}

function mozAB2S(ab,len) {
	var i = Cc['@mozilla.org/io/arraybuffer-input-stream;1']
			.createInstance(Ci.nsIArrayBufferInputStream),
		s = Cc["@mozilla.org/scriptableinputstream;1"]
			.createInstance(Ci.nsIScriptableInputStream);
	i.setData(ab.buffer || ab, 0, len || ab.byteLength);
	s.init(i);
	return s.readBytes(i.available());
}
function mozAB2SDepad(ab) {
	var ab8 = new Uint8Array(ab), i = ab8.length;
	while (i-- && !ab8[i]);
	return mozAB2S(ab,++i);
}

function mozUConv(cs) {
	var c = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Ci.nsIScriptableUnicodeConverter);
	c.charset = cs || "UTF-8";
	return c;
}

function mozTo8(unicode) {
	var c = mozUConv();
	return c.ConvertFromUnicode(unicode) + c.Finish();
}
function mozFrom8(utf8) {
	return mozUConv().ConvertToUnicode(utf8);
}

function mozNotifyDL(fn,f) {
	if (!mozPrefs.getBoolPref('notifydl')) return false;
	if (!f) return mozAlert('Download ' + fn + ' finished.');

	mozAlert(fn,'Download Finished.',function(s,t)
	{
		if(t == 'alertclickcallback') try {
			if(parseInt(Services.appinfo.version) > 23) throw 2;
			Components.classesByID["{7dfdf0d1-aff6-4a34-bad1-d0fe74601642}"]
				.getService(Ci.nsIDownloadManagerUI).show();
		} catch(e) {
			var dllib = 'about:downloads';
			try {
				Services.io.newChannel(dllib,null,null);
			} catch(e) {
				dllib = 'chrome://communicator/content/downloads/downloadmanager.xul';
			}
			if(BrowserApp) {
				// BrowserApp.addTab('about:downloads');
				f.launch();
			} else {
				var fe = 'chrome,dialog=no,menubar=no,status=no,'
					+ 'scrollbars=yes,toolbar=no,location=no,resizable=yes';
				Services.ww.openWindow(null,dllib,'mega:downloads',fe,null);
			}
		}
	});

	return true;
}

function mozAddToLibrary(file, name, size, st, type, url)
{
	try {
		if (typeof file === 'string') file = mozFile(file);
		if (size < 1) size = file.fileSize;
		url = url || location.href;

		var { Downloads, DownloadsData } = Cu.import("resource://app/modules/DownloadsCommon.jsm", {});

		Downloads.getList(Downloads.PUBLIC).then(function(aList) {

			var mOptions = {
				target : file,
				source : {
					url: url,
					referrer: document.referrer || url,
				},
				startTime   : st,
				totalBytes  : parseInt(size),
				succeeded   : true,
				contentType : type || mozGetMIMEType(file)
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
					mozError(e);
				}
				aList.add(aDownload).then(function() {
					// aDownload.refresh().then(null,mozError);
					mozRunAsync(function() {
						mozNotifyDL(name, file);
						DownloadsData._notifyDownloadEvent("finish");
						// DownloadsData.onDownloadChanged(aDownload);
						// var dataItem = DownloadsData._downloadToDataItemMap.get(aDownload);
						// console.log('dataItem', dataItem);
					});
				}, mozError);
			}, mozError);
		}, mozError);
	} catch(e) {
		mozError(e);
		mozNotifyDL(name);
	}
}

function mozError(e) {
	Cu.reportError(e);
	if (d) console.error(e);
}

function mozSaneFileName(name) {
	// http://msdn.microsoft.com/en-us/library/aa365247(VS.85)
	name = ('' + name).replace(/[:\/\\<">|?*]+/g,'.').replace(/\s*\.+/g,'.');
	if (name.length > 250) name = name.substr(0,250) + name.split('.').pop();
	name = name.replace(/\s+/g,' ').trim();
	var end = name.lastIndexOf('.'); end = ~end && end || name.length;
	if(/^(?:CON|PRN|AUX|NUL|COM\d|LPT\d)$/i.test(name.substr(0,end))) name = '!' + name;
	return name;
}

function mozSanePathTree(path, file) {
	path = (''+(path||'')).split(/[\\\/]+/).map(mozSaneFileName).filter(String);
	if (file) path.push(mozSaneFileName(file));
	return path;
}

function mozGetMIMEType(file) {
	var t;

	try
	{
		if(file instanceof Ci.nsIFile) {
			t = mozMIMEService.getTypeFromFile(file);
		} else {
			t = mozMIMEService.getTypeFromExtension((''+file).replace(/.*\./,'.'));
		}
	}
	catch(e) {}

	return t || '';
}

function mozClearStartupCache() {
	console.log('*** Invalidating startup cache ***');
	Services.obs.notifyObservers(null, "startupcache-invalidate", null);
}

(function __FileSystemAPI(scope) {
	var LOG = function(m) {
		var stack = new Error().stack.split("\n").map(s => s.replace(/^(.*@).+\//,'$1')).join("\n");
		console.log(m,stack); Services.console.logStringMessage('MEGA :: ' + m);
	};

	if(scope.requestFileSystem || scope.webkitRequestFileSystem) {
		if(!scope.webkitRequestFileSystem)
			scope.webkitRequestFileSystem = scope.requestFileSystem;
		return;
	}

	var StorageInfo = Object.freeze({
		TEMPORARY: 0,
		requestQuota: function(t,s,f) {
			if(typeof s === 'function') {
				f = s;
				s = t;
			}

			var q = Services.prompt.confirmEx(scope,
				'MEGA '+(mozMEGAExtensionVersion||'')+' :: Out of disk space',
				'Your drive is running out of disk space. '+
				'Would you like to choose another downloads folder?',1027,'','','',null,{value:!1});

			if (!q) mozAskDownloadsFolder();

			var fld = mozGetDownloadsFolder();
			if (d) console.log('requestQuota',fld && fld.diskSpaceAvailable);

			f(fld && fld.diskSpaceAvailable || 0);
		},
		queryUsageAndQuota: function(t,f) {
			if (typeof t === 'function') f=t;

			var fld = mozGetDownloadsFolder();
			if (d) console.log('queryUsageAndQuota',fld && fld.diskSpaceAvailable);

			f(0, fld && fld.diskSpaceAvailable || 0);
		}
	});

	Object.defineProperty(scope,     'webkitStorageInfo',       { value : StorageInfo });
	Object.defineProperty(navigator, 'webkitTemporaryStorage',  { value : StorageInfo });
	// Object.defineProperty(navigator, 'webkitPersistentStorage', { value : StorageInfo });
	Object.defineProperty(navigator, 'webkitPersistentStorage', {
		value : Object.create(StorageInfo, {
			queryUsageAndQuota : {
				value : function(f) f(0,0)
			}
		})
	});

	scope.TEMPORARY  = 0;
	scope.PERSISTENT = 1;

	const fs = {
		name : location.host,
		root : {
			getDirectory : function(d,o,f) {
				f(this);
			},
			createReader : function() {
				return Object.freeze({
					readEntries : function(f,e) {
						/**
						 * Used at cleartemp.js - calling back 'f' here so that the dialog for
						 * "running out of disk space" is shown when required.
						 */
						f([]);
					}
				});
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

						// mozCloseStream(this.fs);
						this.Writer.close(!!this.preview);
						if (this.preview) return;

						if(this.filetime)
						{
							try
							{
								f.lastModifiedTime = this.filetime * 1000;
							}
							catch(e)
							{
								mozError(e);
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
							this.downloadDone(fn,f);
						} catch(e) {
							// mozError(e);
							mozAddToLibrary(f, fn, this.filesize, this.startTime, this.type, location.href );
						}
					},
					downloadDone: function(fn,f) {
						mozNotifyDL(fn, f);
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
								mozError(new Components.Exception("Huh, invalid GUID: " + guid));
							} else try {
								var {DownloadsData} = Cu.import("resource://app/modules/DownloadsCommon.jsm", {});
								DownloadsData._getOrAddDataItem(r, !1);
								DownloadsData._notifyDownloadEvent("finish");
							} catch(e) {}
						});
					},
					handleError : function(e) {
						mozError(e);
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

								var fr = new window.FileReader();
								fr.onload = function(ev) {
									try {
										var c = File.fs.write(ev.target.result,x.size);
										File.Writer.position += c;
									} catch(e) {
									// Likely 0x80520010 (NS_ERROR_FILE_NO_DEVICE_SPACE)
										mozError(e);
									}
									File.Writer.readyState = File.Writer.DONE;
									/**
									 * Er, onerror() causes a race condition when running
									 * out of disk space, so... :$
									 */
									// File.Writer[c?'onwriteend':'onerror']('');
									File.Writer.onwriteend();

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
								mozRunAsync(function() {
									File.Writer.readyState = File.Writer.DONE;
									File.Writer.onwriteend();
								});
							},
							seek : function(p) {
								File.fs.seek(0,p);
							},
							close : function(aError) {
								var f = File.options.saveto;

								if(d) console.log('Closing stream', f.path);
								mozCloseStream(File.fs);

								if (aError)
								{
									mozRunAsync(function() {
										if(d) console.log('Removing file', f.path);
										if (f.exists()) f.remove(!1);
									});
								}
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

				var q = opts.fxo;
				if (d) LOG(q);
				File.filesize = q.size;
				File.filename = mozSaneFileName(q.zipname || q.n);//.replace(/\.lnk$/i,'-lnk.bin');

				try {
					if(q.p && !q.zipid)
						File.folder = mozSanePathTree(q.p);
					File.filetime = q.t || 0;
				} catch(e) {}

				var fce = 0;
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
						mozError(ex);
						if (++fce == 1 && ex.result === 0x80070057) {
							/**
							 * 0x80070057 (NS_ERROR_ILLEGAL_VALUE) [nsIFileOutputStream.init]
							 * On Windows, this might fail while creating certain filetypes,
							 * such as *.lnk
							 */
							File.filename = String(File.filename).replace(/\.(\w+)$/,'-$1.bin');
							return mozOnSavingDownload(File,osd_cb);
						}
						var ps = Services.prompt,
							btn = ['Yes','Yes, saving as default'],
							flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING +
								ps.BUTTON_POS_1 * ps.BUTTON_TITLE_CANCEL  +
								ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING,
							msg = 'Unexpected Download Error:\n'
								+ '\nFile: ' + f.path
								+ '\nError: ' + ex.message
								+ '\n\nWould you like to choose a different downloads folder?',
							r = ps.confirmEx(null,'MEGA '+(mozMEGAExtensionVersion||''),msg,flags,
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
						File.type = mozGetMIMEType(f);

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

							if(dlmanager.isDownloading || File.streaming) {
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
								scope.dlmanager.abort(null);
							}
						}, false);

					} else {
						if (typeof page !== 'undefined' && page === 'download') {
							try {
								scope.dlmanager.isDownloading = !1;

								$('.downloading-txt.temporary-error').text('Download ' + (f ? 'Error!':'Cancelled.'));
								$('.downloading-txt.temporary-error').removeClass('hidden');
								$('.downloadings-icons').addClass('hidden');
								$('.downloading-progress').hide();
								$('.download-mid-centered-block .new-download-icon').css('background-position','68px -149px').html('');
							} catch(e) {
								mozError(e);
							}
						}
					}
				}

				if(q.preview) {
				// Why is the preview writing to disk? :(
					osd_cb({
						saveto : mozFile(":TmpD", Math.random())
					});
				} else {
					mozOnSavingDownload(File,osd_cb);
				}
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

(function __mozSecurityTraps(scope) {

	const __cE = document.createElement;
	const __cE_NS = document.createElementNS;
	const __XHR_Open = XMLHttpRequest.prototype.open;

	Object.defineProperty(document, 'createElementNS',
	{
		value : function(ns, e)
		{
			if (ns !== 'http://www.w3.org/1999/xhtml' && ns !== 'http://www.w3.org/2000/svg')
			{
				var err = new Error('Blocked namespace: ' + ns);
				setTimeout(function() { throw err }, 4);
				return null;
			}

			var eL = e.split(':').pop().toLowerCase();
			if (eL === 'script' || eL === 'iframe')
			{
				var caller = Components.stack.caller;

				if (caller.filename.substr(0,14) !== 'chrome://mega/' && 'mega:secure' !== caller.filename.substr(0,11))
				{
					var err = new Error('Blocked '+e+' element creation');
					setTimeout(function() { throw err }, 4);
					return null;
				}
			}

			return __cE_NS.call(document, ns, e);
		}
	});
	Object.defineProperty(document, 'createElement',
	{
		value : function(e)
		{
			var eL = e.split(':').pop().toLowerCase();
			if (eL === 'script' || eL === 'iframe')
			{
				var caller = Components.stack.caller;

				if (caller.filename.substr(0,14) !== 'chrome://mega/' && 'mega:secure' !== caller.filename.substr(0,11))
				{
					var err = new Error('Blocked '+e+' element creation');
					setTimeout(function() { throw err }, 4);
					return null;
				}
			}
			return __cE.call(document, e);
		}
	});

	XMLHttpRequest.prototype.open = function(meth, url)
	{
		try
		{
			var uri = Services.io.newURI(url, null, null);

			if (/\.mega(?:\.co)?\.nz$/.test(uri.host)) return __XHR_Open.apply(this, arguments);
		}
		catch(e) {}

		var err = new Error('Blocked XHR to ' + url);
		setTimeout(function() { throw err }, 4);
	};
	// XMLHttpRequest.prototype = Object.freeze(XMLHttpRequest.prototype);

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
		var folder = mozFilePicker(null,2,{title : m || (typeof l !== 'undefined'&&l[136]) || 'Please choose downloads folder'});

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

	if (!mozPrefs.getPrefType('notifydl'))
	{
		mozPrefs.setBoolPref('notifydl', true);
	}

	if (!mozPrefs.getPrefType('dir'))
	{
		/**
		 * Downloads will be saved on the Desktop by default
		 */
		try {
			mozSetDownloadsFolder(Services.dirsvc.get("Desk", Ci.nsIFile));
		} catch(e) {
			mozSetDownloadsFolder(Services.dirsvc.get("DfltDwnld", Ci.nsIFile));
		}
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
		mozError(e);
		alert(e);
	}
})(self);

var mozMEGAExtensionVersion;
try {
	var { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm", {});
	AddonManager.getAddonByID('firefox@mega.co.nz',function(data)
	{
		mozMEGAExtensionVersion = data.version;
		AddonManager = undefined;
	});
} catch(e) {}

const mozLazyGetService = XPCOMUtils.defineLazyServiceGetter.bind(XPCOMUtils, this);

mozLazyGetService( "mozMIMEService",     "@mozilla.org/mime;1",                      "nsIMIMEService"     );
mozLazyGetService( "mozAlertsService",   "@mozilla.org/alerts-service;1",            "nsIAlertsService"   );
mozLazyGetService( "mozClipboardHelper", "@mozilla.org/widget/clipboardhelper;1",    "nsIClipboardHelper" );
mozLazyGetService( "mozRandomGenerator", "@mozilla.org/security/random-generator;1", "nsIRandomGenerator" );

XPCOMUtils.defineLazyModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
const BrowserApp = Services.wm.getMostRecentWindow('navigator:browser').BrowserApp;
if(!BrowserApp) is_chrome_firefox |= 2;
