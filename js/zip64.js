/* ezBuffer {{{ */
/**
 *  Your best friend when dealing with buffers
 *
 *  TODO: Perhaps I should be public
 */
function ezBuffer(size) {
	var obj  = new Uint8Array(size)
		, buffer = new DataView(obj.buffer)
		, offset = 0;
	return {
		debug: function() {
			console.error(["DEBUG", offset, obj.length]);
		},
		getArray: function() {
			var bytes = []
			$.each(obj, function(i, val) {
				bytes.push(val);
			});
			return bytes;
		},
		getBytes: function() {
			return obj;
		},
		appendBytes: function(text) {
			var isArray = typeof text != "string";
			for (var i = text.length; i--; ) {
				if (isArray) {
					obj[offset+i] = text[i];
				} else {
					// We assume it is an string
					obj[offset+i] = text.charCodeAt(i);
				}
			}
			offset += text.length
		},
		i64: function(number, bigendian) {
			var buffer = new Int64(number).buffer
			if (!bigendian) {
				// swap the by orders
				var nbuffer = new Uint8Array(buffer.length)
					, len = buffer.length-1
				for (var i = len; i >= 0; i--) {
					nbuffer[i] = buffer[len-i]
				}
				buffer = nbuffer;
			}
			// append the buffer
			this.appendBytes(buffer);
		},
		i32: function(number, bigendian) {
			buffer.setInt32(offset, number, !bigendian);
			offset+=4;
		},
		i16: function(number, bigendian) {
			buffer.setInt16(offset, number, !bigendian);
			offset+=2;
		},
		i8: function(number, bigendian) {
			buffer.setInt8(offset, number, !bigendian);
			offset+=1;
		}, 
		resize: function (newsize) {
			var zclass = obj.constructor
				, zobj = new zclass(newsize)
			zobj.set(obj, 0);
			obj = zobj;
			buffer = new DataView(obj.buffer)
			return obj;
		},
		/**
		 *  Check if the current bytestream has enough 
		 *  size to add "size" more bytes. If it doesn't have
		 *  we return a new bytestream object
		 */
		resizeIfNeeded: function(size) {
			if (obj.length < (size+offset)) {
				return this.resize(size+offset);
			}
			return obj;
		}
	};
}
/* }}} */

var Zips = {};

/**
 *	Pseudo-IO method to simplify zip writings
 */
function dlZipIO(dl, dl_id) {
	var self = this
		, qZips = []
		, ZipObject
		, hashes = {}
		, dirData = []
		, queue = []
		, current = null
		, gOffset = 0
		, realIO = new dlMethod(dl_id, dl) 
		, ready = false;

	// fake set credentials
	realIO.begin = function() {
		ready = true;
	}

	this.size = 0
	this.files = 0
	this.progress	= 0
	this.dl_xr	= getxr()

	this.done = function() {
		current = null
		if (queue.length === 0) {
			var end = ZipObject.writeSuffix(gOffset, dirData);
			$.each(dirData, function(key, value) {
				doWrite(value);
			});
			doWrite(end, function() {
				fm_zipcomplete(dl.zipid);
				dl.onDownloadComplete(dl.dl_id);
				dl.onBeforeDownloadComplete(dl.pos);
				realIO.download(dl.zipname);
			});

		}
	}

	/**
	 *	Peform real write 
	 */
	function doWrite(buffer, next) {
		if (!ready) {
			/**
			 * writer is not ready but 
			 * we cannot call ourself, the system is counting that
			 * gOffset is modified right away
			 */
			var pos = gOffset;
			var retry = setInterval(function() {
				if (ready) {
					realIO.write(buffer, pos, next || function() {});
					clearInterval(retry);
				}
			}, 100)
		} else {
			realIO.write(buffer, gOffset, next || function() {});
		}
		gOffset += buffer.length;
	}

	this.getWriter = function(file) {
		var entryPos = 0
			, expected = 0 /* next chunk */

		this.size += file.size
		this.files++;

		queue.push(file.id);

		return function (buffer, pos, next) {
			if (!ZipObject) {
				realIO.is_zip = true
				realIO.setCredentials("", self.size + self.files*1024);
				ZipObject = new ZIPClass(self.size + self.files*1024);
			}

			if (current === null) {
				current = file.id;
				queue.splice($.inArray(file.id, queue),1);
			}

			if (current != file.id || expected != pos) {
				var my = arguments.callee
					, args = Array.prototype.slice.call(arguments)
					, zself = this

				return setTimeout(function() {
					my.apply(zself, args);
				}, 100);
			}

			expected = pos + buffer.length
			if (pos === 0) {
				var header = ZipObject.writeHeader(
					file.p + file.n,
					file.size,
					file.t
				);
				entryPos = gOffset;
				doWrite(header);
				hashes[file.id] = 0;
			}

			hashes[file.id] = crc32(buffer, hashes[file.id], buffer.length);


			if (pos + buffer.length == file.size ) {
				var centralDir = ZipObject.writeCentralDir(
					file.p + file.n,
					file.size,
					file.t,
					hashes[file.id],
					false,
					entryPos 
				);
				dirData.push(centralDir.dirRecord)
				doWrite(buffer);
				doWrite(centralDir.dataDescriptor, next);
			} else {
				doWrite(buffer, next);
			}
		};
	}

	this.write = function(buffer, position, next, task) {
		if ($.inArray(task.download.id, qZips)==-1) {
			qZips.push(task.download.id)
		}

		if (qZips[0] !== task.download.id || task.pos != pos) {
			DEBUG("retry ", pos, task.pos, qZips[0], task.download.id);
			return setTimeout(function() {
				self.write(buffer, position, next, task);
			}, 100);
		}

		if (task.first) {
			var header = ZipObject.writeHeader(
				task.path,
				task.fsize,
				task.download.t
			);
			entryPos = offset;
			realIO.write(header, offset, function() {});
			offset += header.length;
			hashes[task.download.id] = 0;
		}
		hashes[task.download.id] = crc32(buffer, hashes[task.download.id], buffer.length);

		realIO.write(buffer, offset, function() {
			offset += buffer.length;
			if (task.last) {
				var centralDir = ZipObject.writeCentralDir(
					task.path,
					task.fsize,
					task.download.t,
					hashes[task.download.id],
					false,
					entryPos 
				);
				dirData.push(centralDir.dirRecord)
				realIO.write(centralDir.dataDescriptor, offset, next);
				offset += centralDir.dataDescriptor.length;
				pos     = 0;
				qZips.shift();
				return;
			}
			next();
			pos++;
		}, task);
	};
}


var ZIPClass = function(totalSize) {
	var self = this
		, maxZipSize = Math.pow(2,32) - 4098 /* for headers */
		, isZip64	= totalSize > maxZipSize || localStorage.zip64 == 1

	// Constants
	var fileHeaderLen				= 30
		, noCompression				= 0
		, zipVersion				= isZip64 ? 45 : 20
		, defaultFlags				= 0x808 /* UTF-8 */
		, i32max					= 0xffffffff
		, i16max					= 0xffff
		, zip64ExtraId				= 0x0001
		, zipUtf8ExtraId			= 0x7075
		, directory64LocLen			= 20
		, directory64EndLen			= 56
		, directoryEndLen			= 22
		, fileHeaderSignature		= 0x04034b50
		, directory64LocSignature	= 0x07064b50
		, directory64EndSignature	= 0x06064b50
		, directoryEndSignature		= 0x06054b50
		, dataDescriptorSignature	= 0x08074b50 // de-facto standard; required by OS X Finder
		, directoryHeaderSignature	= 0x02014b50
		, dataDescriptorLen			= 16
		, dataDescriptor64Len		= 24
		, directoryHeaderLen		= 46

	/* ZipHeader  {{{ */ 
	/**
	 *  ZipHeader struct
	 */
	function ZipHeader() {
		this.readerVersion = zipVersion;
		this.Flags	= defaultFlags;
		this.Method	= noCompression;
		this.date	= 0
		this.crc32	= 0;
		this.size	= 0;
		this.unsize	= 0;
		this.file	= ""; 
		this.extra	= [];

		this.getBytes = function() {
			var buf = ezBuffer(fileHeaderLen + this.file.length + this.extra.length);
			buf.i32(fileHeaderSignature)
			buf.i16(this.readerVersion);
			buf.i16(this.Flags)
			buf.i16(this.Method)
			DosDateTime(this.date, buf)
			buf.i32(this.crc32); // crc32
			buf.i32(this.size); // compress size
			buf.i32(this.unsize); // uncompress size
			buf.i16(this.file.length);
			buf.i16(this.extra.length);
			buf.appendBytes(this.file);
			buf.appendBytes(this.extra);
			return buf.getBytes();
		}
	}
	/** }}} */

	// ZipCentralDirectory {{{
	function ZipCentralDirectory() {
		this.creatorVersion = zipVersion;
		this.readerVersion	= zipVersion;
		this.Flags			= defaultFlags;
		this.Method			= noCompression;
		this.date			= 0;
		this.crc32			= 0;
		this.file			= ""
		this.size			= 0; // compressed size
		this.unsize			= 0; // uncompressed size
		this.offset			= 0;
		this.externalAttr	= 0;

		this.getBytes = function() {
			var extra = []
				, ebuf

			if (isZip64) {
				ebuf = ezBuffer(28); // 2xi16 + 3xi64
				ebuf.i16(zip64ExtraId);
				ebuf.i16(24);
				ebuf.i64(this.size);
				ebuf.i64(this.unsize);
				ebuf.i64(this.offset);
				extra = extra.concat( ebuf.getArray() );
			}

			var buf = ezBuffer(directoryHeaderLen + this.file.length + extra.length);
			buf.i32(directoryHeaderSignature);
			buf.i16(this.creatorVersion);
			buf.i16(this.readerVersion);
			buf.i16(this.Flags);
			buf.i16(this.Method)
			DosDateTime(this.date, buf)
			buf.i32(this.crc32);
			buf.i32(isZip64 ? i32max : this.size);
			buf.i32(isZip64 ? i32max : this.unsize);
			buf.i16(this.file.length);
			buf.i16(extra.length);
			buf.i16(0); // no comments
			buf.i32(0); // disk number
			buf.i32(this.externalAttr);
			buf.i32(isZip64 ? i32max : this.offset);
			buf.appendBytes(this.file);
			buf.appendBytes(extra);

			return buf.getBytes();
		}
	}
	// }}}

	// ZipDataDescriptor {{{
	function ZipDataDescriptor() {
		this.crc32	= 0;
		this.size	= 0;
		this.unsize	= 0;

		this.getBytes = function() {
			var buf = ezBuffer(isZip64 ? dataDescriptor64Len : dataDescriptorLen);
			buf.i32(dataDescriptorSignature);
			buf.i32(this.crc32);
			if (isZip64) {
				buf.i64(this.size);
				buf.i64(this.unsize);
			} else {
				buf.i32(this.size);
				buf.i32(this.unsize);
			}
			return buf.getBytes();
		};
	}
	// }}}

	// DosDateTime {{{
	/**
	 *  Set an unix time (or now if missing) in the zip
	 *  expected format
	 */
	function DosDateTime(sec, buf) {
		var date = new Date()
			, dosTime
			, dosDate

		if (sec) {
			date = new Date(sec*1000);
		}

		dosTime = date.getHours();
		dosTime = dosTime << 6;
		dosTime = dosTime | date.getMinutes();
		dosTime = dosTime << 5;
		dosTime = dosTime | date.getSeconds() / 2;

		dosDate = date.getFullYear()-1980;
		dosDate = dosDate << 4;
		dosDate = dosDate | (date.getMonth() + 1);
		dosDate = dosDate << 5;
		dosDate = dosDate | date.getDate();

		buf.i16(dosTime);
		buf.i16(dosDate);
	}
	// }}}

	self.writeCentralDir = function(filename, size, time, crc32, directory, headerpos)
	{
		filename = to8(filename)
		var dirRecord = new ZipCentralDirectory();
		dirRecord.file		= filename;
		dirRecord.date		= time;
		dirRecord.size		= size;
		dirRecord.unsize	= size;
		dirRecord.crc32		= crc32;
		dirRecord.offset	= headerpos;
		dirRecord.externalAttr = directory ? 1 : 0;

		var dataDescriptor = new ZipDataDescriptor();
		dataDescriptor.crc32	= crc32;
		dataDescriptor.size		= size;
		dataDescriptor.unsize   = size;

		return {
			dirRecord: dirRecord.getBytes(),
			dataDescriptor: dataDescriptor.getBytes()
		};
	}

	self.writeSuffix = function(pos, dirData) {
		var dirDatalength=0;	
		for (var i in dirData) dirDatalength += dirData[i].length;

		var buf = ezBuffer(22);
		if (isZip64) {
			var xbuf = new ezBuffer(directory64EndLen + directory64LocLen)
			xbuf.i32(directory64EndSignature)
			// directory64EndLen - 4 bytes - 8 bytes
			xbuf.i64(directory64EndLen - 4 - 8)
			xbuf.i16(zipVersion)
			xbuf.i16(zipVersion)
			xbuf.i32(0) // disk number
			xbuf.i32(0) // number of the disk with the start of the central directory
			xbuf.i64(dirData.length)
			xbuf.i64(dirData.length)
			xbuf.i64(dirDatalength);
			xbuf.i64(pos);

			xbuf.i32(directory64LocSignature)
			xbuf.i32(0)
			xbuf.i64(pos + dirDatalength)
			xbuf.i32(1) // total number of disks
			buf.resize(22 + xbuf.getBytes().length)
			buf.appendBytes(xbuf.getBytes());
		}
		
		buf.i32(directoryEndSignature)
		buf.i32(0); // skip
		buf.i16(isZip64 ? i16max : dirData.length)
		buf.i16(isZip64 ? i16max : dirData.length)
		buf.i32(isZip64 ? i32max : dirDatalength);
		buf.i32(isZip64 ? i32max : pos);
		buf.i16(0); // no comments
		
		return buf.getBytes();
	};

	self.writeHeader = function(filename, size, date) {
		filename = to8(filename)
		var header = new ZipHeader();
		header.file  = filename;
		header.size  = size;
		header.date  = date;

		var ebuf = ezBuffer(1 + 4 + 4 + filename.length)
		ebuf.i16(zipUtf8ExtraId)
		ebuf.i16(5+filename.length) // size
		ebuf.i8(1) // version
		ebuf.i32(crc32(filename))
		ebuf.appendBytes(filename)
		header.extra = ebuf.getArray();

		return header.getBytes();
	}


	DEBUG(self, 'writeHeader');
	DEBUG(self, 'writeCentralDir')
	DEBUG(self, 'writeSuffix')
}

// crc32 {{{
var crc32table = [
	0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
	0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
	0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
	0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
	0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
	0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
	0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
	0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
	0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
	0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
	0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
	0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
	0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
	0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
	0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
	0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
	0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
	0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
	0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
	0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
	0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
	0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
	0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
	0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
	0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
	0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
	0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
	0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
	0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
	0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
	0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
	0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
	0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
	0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
	0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
	0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
	0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
	0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
	0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
	0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
	0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
	0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
	0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
	0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
	0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
	0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
	0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
	0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
	0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
	0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
	0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
	0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
	0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
	0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
	0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
	0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
	0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
	0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
	0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
	0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
	0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
	0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
	0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
	0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D
 ];

function crc32(data, crc, len) 
{
	if (typeof(crc) == "undefined")
	{
		crc = 0;
	}

	var x = 0;
	var y = 0;
	
	var off = data.length-len;

	crc = crc ^ -1;
	
	for (var i = 0, len; i < len; i++)
	{
		y = (crc ^ data[i+off]) & 0xFF;
		x = crc32table[y];
		crc = (crc >>> 8) ^ x;
	}

	return crc ^ -1;
}
// }}}
