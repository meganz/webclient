var FTSTATE_WAIT_CONNECT = Object.freeze({code:1, text:"Waiting for connect"});
var FTSTATE_WAIT_FILE_HDR = Object.freeze({code:2, text:"Waiting for start of file"});
var FTSTATE_RECEIVE_FILE = Object.freeze({code:3, text:"Receiving file"});
var FTSTATE_SEND_FILE = Object.freeze({code:4, text:"Sending file"});
var FTSTATE_WAIT_FILE_ACK = Object.freeze({code:5, text:"Waiting for file receive acknowledge"});
var FTSTATE_READY_NEXT_FILE = Object.freeze({code:6, text:"Waiting for next file"});
var FTSTATE_ERROR = Object.freeze({code:7, text:"Transfer error"});
var FTSTATE_CANCELING = Object.freeze({code:8, text:"Canceling transfer"});

var FTPTYPE_FILE_LIST = 1;
var FTPTYPE_FILE_START = 2;
var FTPTYPE_FILE_DATA = 3;
var FTPTYPE_FILE_END = 4;
var FTPTYPE_FILE_ACK = 5;
var FTPTYPE_FILE_NACK = 6;

function FileTransferManager(jingle) {
    this._jingle = jingle;
    this._timer = null;
    this._fileUidCtr = 0;
    this.uploads = {};
    this.downloads = {};
    this.updateGui = function(){};
}
;
FileTransferManager.prototype.createDownloadHandler = function(sid, peerJid, files) {
    if (this.downloads[sid])
        throw new Error("Assertion failed: download with the specified sid already exists");
    var result = this.downloads[sid] = new DownloadHandler(this, sid, peerJid, files);
    if (!this._timer)
        this._timer = setInterval(this._onTimer.bind(this), 1000);
    return result;
}

FileTransferManager.prototype.createUploadHandler = function(sid, peerJid, files) {
    if (this.uploads[sid])
        throw new Error("Assertion failed: upload with the specified sid already exists");
    var result = this.uploads[sid] = new UploadHandler(this, sid, peerJid, files);
    if (!this._timer)
        this._timer = setInterval(this._onTimer.bind(this), 1000);
    return result;
}

FileTransferManager.prototype.cancelTransfer = function(sid) {
    var handler = this.uploads[sid];
    if (!handler)
        handler = this.downloads[sid];
    if (!handler)
        return false;
    handler.cancel();
}
FileTransferManager.prototype.checkDisableTimer = function() {
    if (this._timer && (Object.keys(this.downloads).length < 1) &&
     (Object.keys(this.uploads).length < 1)) {
        clearInterval(this._timer);
        this._timer = null;
        return true;
    }
    return false;
}

FileTransferManager.prototype._onTimer = function() {
    var uploads = this.uploads;
    var hasUploads = false;
    for (var sid in uploads) {
        hasUploads = true;
        uploads[sid].onTimer();
    }
    this.updateGui();
    if (!hasUploads && (Object.keys(this.downloads).length < 1) && this._timer) {
        cancelIntrerval(this._timer);
        this._timer = null;
    }
}

FileTransferManager.prototype.sendQueue = function() {
    var result = [];
    for (var sid in this.uploads) {
        var upload = this.uploads[sid];
        for (var i = 0; i<upload._files.length; i++) {
            var file = upload._files[i];
            result.push({ftSess: upload, name: file.name, size: file.size, mime:file.type, uniqueId: file.uniqueId});
        }
    }
    return result;
}

FileTransferManager.prototype.recvQueue = function() {
    var result = [];
    for (var sid in this.downloads) {
        var download = this.downloads[sid];
        for (var f in download._files) {
            var file = download._files[f];
            result.push({ftSess: download, name: f, size: file.size, mime:file.type, uniqueId: file.uniqueId});
        }
    }
    return result;
}

if (window.asmCrypto && asmCrypto.SHA256) {
    FileTransferManager.prototype.createHasher = function() {
        var inst = new asmCrypto.SHA256();
        inst.reset();
        inst.ftHashName = 'sha256'; //we should use some more mangled property name, because just 'type' might conflict with an already existing property
        return inst;
    }
} else {
        console.warn("webrtc FileTransfer: asmcrypto.SHA256 not found, hash checks will be disabled");
}

function TransferHandlerBase() {
}

TransferHandlerBase.prototype.init = function(ftManager, sid, peerJid) {
    this._ftManager = ftManager;
    this._sid = sid;
    this._peerJid = peerJid;
}

TransferHandlerBase.prototype.bindToDataChannel = function(dataChan) {
    this._dataChan = dataChan;
    dataChan.onopen = this.onopen.bind(this);
    dataChan.onclose = this.onclose.bind(this);
    dataChan.onmessage = this.onmessage.bind(this);
    dataChan.onerror = this.onerror.bind(this);
}

TransferHandlerBase.prototype.state = function() {
    return this._state;
}

TransferHandlerBase.prototype.isDownload = function() {
    return (this._isDownload === true);
}

TransferHandlerBase.prototype.sid = function() {
    return this._sid;
}
TransferHandlerBase.prototype.peerJid = function() {
    return this._peerJid;
}

TransferHandlerBase.prototype.cancel = function() {
    this._state = FTSTATE_CANCELING;
    if (!this._ftManager._jingle.terminateBySid(this._sid, 'cancel'))
       this.remove('cancel');
}

TransferHandlerBase.prototype.error = function(e, dontThrow, params) {
    var event = {ftSess:this, error:e};
    if (params)
        for (var k in params)
            event[k] = params[k];
    $(this._ftManager).trigger('error', event);
    if (!dontThrow)
        throw new Error(e);
}
function DownloadHandler(ftManager, sid, peerJid, files) {
    this.init.call(this, ftManager, sid, peerJid);
    this._isDownload = true;
    this._files = files;
    this._currentFile = null;
    this._state = FTSTATE_WAIT_CONNECT;
    this._fileSaver = new BlobChunksFileSaver(this);
}

DownloadHandler.prototype = new TransferHandlerBase();

DownloadHandler.prototype.onopen = function() {
    this._state = FTSTATE_WAIT_FILE_HDR;
    this._sess = this._ftManager._jingle.sessions[this._sid];
    if (!this._sess)
        this.error("Could not find jingle session object after data channel established");
}

DownloadHandler.prototype.onerror = function(e) {
    this._state = FTSTATE_ERROR;
    this.error(e, true);
    //TODO: Implement autoretry
}
DownloadHandler.prototype.onmessage = function(event) {
    var packet = event.data;
    var header = new Uint16Array(packet, 0, 2);
    var ptype = header[0];

    if (ptype === FTPTYPE_FILE_START) {
        if (this._state !== FTSTATE_WAIT_FILE_HDR)
            this.error("Unexpected new file header received");
        var info = JSON.parse(readStringFromArrBuf(packet, 4));
        var listFile = this._files[info.name];
        if (!listFile)
            this.error("Peer pushed unexpected file");
        if (info.size !== listFile.size)
            this.error("File size in file header is different than file size in initial transfer request");
        delete this._files[info.name];
        info.id = header[1];
        info.mime = listFile.mime;
        info = Object.freeze(info);
        this._currentFile = info;
        this._bytesRecv = 0;
        this._fileSaver.newFile(info);
        if (this._ftManager.createHasher)
            this._hasher = this._ftManager.createHasher();
        this._state = FTSTATE_RECEIVE_FILE;
        $(this._ftManager).trigger('recv-queue-updated', {ftSess:this});
        $(this._ftManager).trigger('recv-new', {ftSess: this, file:info});
    }
    else if (ptype === FTPTYPE_FILE_DATA) {
        if (this._state !== FTSTATE_RECEIVE_FILE)
            this.error("File data received, but there is no file transfer at the moment");
        if (header[1] != this._currentFile.id)
            this.error("File data packet received with incorrect fileId");
        var data = new Uint8Array(packet, 4);
        this._bytesRecv+=data.length;
        var chunk = packet.slice(4);
        this._fileSaver.addChunk(chunk);
        if (this._hasher)
            this._hasher.process(chunk);
    }
    else if (ptype === FTPTYPE_FILE_END) {
        if (this._state !== FTSTATE_RECEIVE_FILE)
            this.error("File end mark received, but there is no current file transfer");
        if (header[1] != this._currentFile.id)
            this.error("File end mark received with incorrect fileId");
        var strInfo = readStringFromArrBuf(packet, 4);
        var info = JSON.parse(strInfo);
        if (this._hasher) {
            var hash = this._hasher.ftHashName+':'+byteArrToHexString(this._hasher.finish().result);
            if (hash !== info.hash) {
                this.sendFileNack("Received file hash mismatch");
                this.error("Received file hash mismatch");
            }
        }

        this.sendFileAck();
        var fname = this._currentFile.name;
        var listFile = this._files[fname];
        var info = this._currentFile;
        this._currentFile = null;
        delete this._files[fname];
        this._state = FTSTATE_WAIT_FILE_HDR;
        $(this._ftManager).trigger('recv-complete', info);
        this._fileSaver.completeFile();
    }
    else if (ptype === FTPTYPE_FILE_LIST) {
        if (this._state !== FTSTATE_WAIT_FILE_HDR) {
            if (Object.keys(this._files).length > 0)
                console.warn("New file list received but not all files from previous list received");
            this._files = JSON.parse(readStringFromArrBuf(data, 4));
            $(this._ftManager).trigger('recv-queue-updated', {ftSess: this})
        }
    }
}

DownloadHandler.prototype.sendFileAck = function() {
    var buf = new ArrayBuffer(4);
    var header = new Uint16Array(buf, 0, 2);
    header[0] = FTPTYPE_FILE_ACK;
    header[1] = this._currentFile.id;
    this._dataChan.send(buf);
}
DownloadHandler.prototype.sendFileNack = function(errMsg) {
    var buf = new ArrayBuffer(errMsg.length*2+4);
    var header = new Uint16Array(buf, 0, 2);
    header[0] = FTPTYPE_FILE_NACK;
    header[1] = this._currentFile.id;
    writeStringToArrBuf(errMsg, buf, 4);
    this._dataChan.send(buf);
}

DownloadHandler.prototype.onclose = function() {
    if (this._state === FTSTATE_RECEIVE_FILE)
        this.error("Data channel closed while receiving file");
}

DownloadHandler.prototype.remove = function(reason, text) {
    if ((this._state === FTSTATE_WAIT_FILE_HDR) &&
       ((reason === 'peer-complete') || (reason === 'ice-disconnect'))) {
        $(this._ftManager).trigger('ftsess-remove', {ftSess:this});
    }
     else if ((reason === 'cancel') || (reason === 'peer-cancel')) {
        $(this._ftManager).trigger('ftsess-canceled', {ftSess: this});
    } else {
        this.error("Download session terminated: "+reason, true);
    }
     delete this._ftManager.downloads[this._sid];
     if (this._ftManager.checkDisableTimer())
         this._ftManager.updateGui();
     if (this._files.length > 0)
         $(this._ftManager).trigger('recv-queue-updated', {ftSess: this});

}

DownloadHandler.prototype.progress = function() {
    if (this._state !== FTSTATE_RECEIVE_FILE)
        return 0;
    return ((this._bytesRecv*100)/this._currentFile.size);
}
DownloadHandler.prototype.currentFile = function() {
    return this._currentFile;
}

function BlobChunksFileSaver(parent) {
    this._parent = parent;
    this._fileChunks = null;
    this._fileInfo = null;
}

BlobChunksFileSaver.prototype.newFile = function(fileInfo) {
    this._fileInfo = fileInfo;
    this._fileChunks = [];
}

BlobChunksFileSaver.prototype.addChunk = function(blob) {
    if (!this._fileInfo)
        this._parent.error('FileSaver: Asked to append file chunk, but there is no current file to append to');
    this._fileChunks.push(blob);
 //   console.log("chunk", this._fileChunks.length);
}
BlobChunksFileSaver.prototype.completeFile = function() {
    var assembled = new Blob(this._fileChunks, {type: this._fileInfo.mime});
    if (assembled.size !== this._fileInfo.size)
        this._parent.error('FileSaver: Received file size does not match');
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(assembled);
    link.download = this._fileInfo.name;
    link.click();
}

function UploadHandler(ftManager, sid, peerJid, files) {
    this.init.call(this, ftManager, sid, peerJid);
    this._state = FTSTATE_WAIT_CONNECT;
    this._timer = null;
    this._files = files; //array of File objects
    this._currentSentFile = null;
    this._fileIdGen = 0;
}

UploadHandler.prototype = new TransferHandlerBase();
UploadHandler.SEND_CHUNK_SIZE = 48*1024;
UploadHandler.SEND_QUEUE_BYTES_MIN = 1024*1024;
UploadHandler.SEND_QUEUE_BYTES_MAX = 4*1024*1024;

UploadHandler.prototype.onopen = function() {
    this._sess = this._ftManager._jingle.sessions[this._sid];
    if (!this._sess)
        this.error("Could not find session object after data channel connected");
    this._state = FTSTATE_READY_NEXT_FILE;
    this._timer = setInterval(this.onTimer.bind(this), 1000);
    this.nextFile();
}

UploadHandler.prototype.onerror = function(e) {
    this.error(e, true);
    this._state = FTSTATE_ERROR;
}

UploadHandler.prototype.onclose = function() {
    if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
    }
    if (this._state === FTSTATE_SEND_FILE)
        this.error("Data channel closed while sending file");
}

UploadHandler.prototype.onmessage = function(event) {
    var packet = event.data;
    var header = new Uint16Array(packet, 0, 2);
    var ptype = header[0];
    if (ptype === FTPTYPE_FILE_ACK) {
        if (this._state !== FTSTATE_WAIT_FILE_ACK)
            this.error("Unexpected FILE_ACK received");
        if (header[1] != this._fileSendId)
            this.error("FILE_ACK received with wrong fileId");
        this._state = FTSTATE_READY_NEXT_FILE;
        $(this._ftManager).trigger('send-complete', this._currentSentFile);
        this._currentSentFile = null;
        this.nextFile();
    }
    else if (ptype === FTPTYPE_FILE_NACK) {
        var errMsg = readStringFromArrBuf(packet, 4);
        this.error("Remote error sending file: "+errMsg, this._currentSentFile);
        this._currentSentFile = null;
        $(this._ftManager).trigger("send-queue-updated", {ftSess:this});
    }
}

UploadHandler.prototype.nextFile = function() {
    if (this._state !== FTSTATE_READY_NEXT_FILE)
        this.error("Requested to send next file, but current state does not allow");
    if (this._files.length < 1) {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        this._ftManager._jingle.terminateBySid(this._sid, "complete");
        return false;
    }
    var file = this._currentSentFile = this._files.shift();
    this._fileSendSize = file.size;
    this._fileSendId = ++this._fileIdGen;
    this._fileSendPos = 0;
    this._sendBurst = false;
    if (this._ftManager.createHasher)
        this._hasher = this._ftManager.createHasher();
    $(this._ftManager).trigger("send-queue-updated", {ftSess:this});
    $(this._ftManager).trigger("send-new", {ftSess: this, file: file});
    var info = JSON.stringify({name: file.name, size: file.size, uniqueId: file.uniqueId});
    var nfbuf = new ArrayBuffer(4+info.length*2);
    writeStringToArrBuf(info, nfbuf, 4);
    this.addPacketHeader(nfbuf, FTPTYPE_FILE_START);
    this._dataChan.send(nfbuf);
    this._state = FTSTATE_SEND_FILE;
}

UploadHandler.prototype.addPacketHeader = function(buf, ptype) {
    var header = new Uint16Array(buf, 0, 2);
    header[0] = ptype;
    header[1] = this._fileSendId;
}

UploadHandler.prototype.onTimer = function() {
    if ((this._state !== FTSTATE_SEND_FILE) || this._sendBurst)
        return;
    if (this._dataChan.bufferedAmount <= UploadHandler.SEND_QUEUE_BYTES_MIN) {
        this._sendBurst = true;
        this.sendFileData();
    }
}

UploadHandler.prototype.sendFileData = function() {
    if (this._fileSendPos >= this._fileSendSize) {
        this._sendBurst = false;
        this.endFile();
        return;
    }
    var self = this;
    var reader = new FileReader();
    var end = this._fileSendPos+UploadHandler.SEND_CHUNK_SIZE;
    if (end > this._fileSendSize)
        end = this._fileSendSize;
    var blob = this._currentSentFile.slice(this._fileSendPos, end);
    this._fileSendPos = end;
    reader.onload = function(event) {
        if (self._state !== FTSTATE_SEND_FILE)
            return;
        var arrBuf = event.target.result;
        var packet = new ArrayBuffer(arrBuf.byteLength+4);
        self.addPacketHeader(packet, FTPTYPE_FILE_DATA);
        var payload = new Uint8Array(packet, 4);
        var data = new Uint8Array(arrBuf);
        payload.set(data);
        if (self._hasher)
            self._hasher.process(arrBuf);
        self._dataChan.send(packet);
        if(self._dataChan.bufferedAmount < UploadHandler.SEND_QUEUE_BYTES_MAX) {
 //           console.log("burst mode: output buflen:", self._dataChan.bufferedAmount);
            self.sendFileData();
        }
        else
            self._sendBurst = false;

    }
    reader.onerror = function(event) {
        this._sendBurst = false;
        this.error("File read error: "+event.target.error.name);
    }

    reader.readAsArrayBuffer(blob);
}

UploadHandler.prototype.endFile = function() {
    if (this._state !== FTSTATE_SEND_FILE)
        this.error("endFile called, but no file is being sent");

    var objInfo = this._hasher ? {
            hash:this._hasher.ftHashName+':'+
            byteArrToHexString(this._hasher.finish().result)
        }:{};
    var info = JSON.stringify(objInfo);
    var buf = new ArrayBuffer(4+info.length*2);
    this.addPacketHeader(buf, FTPTYPE_FILE_END);
    writeStringToArrBuf(info, buf, 4);
    this._dataChan.send(buf);
    this._state = FTSTATE_WAIT_FILE_ACK;
}

UploadHandler.prototype.remove = function(reason, text) {
    if (reason === 'complete')
        $(this._ftManager).trigger('ftsess-remove', {ftSess: this});
    else if ((reason === 'cancel' ) || (reason === 'peer-cancel'))
        $(this._ftManager).trigger('ftsess-canceled', {ftSess: this});
    else
        this.error("Upload session terminated: "+reason, true);

    delete this._ftManager.uploads[this._sid];
    if (this._files)
        $(this._ftManager).trigger('send-queue-updated', {ftSess: this});

    if (this._ftManager.checkDisableTimer())
        this._ftManager.updateGui();
}

UploadHandler.prototype.progress = function() {
    if (this._state !== FTSTATE_SEND_FILE)
        return 0;
    return (this._fileSendPos-this._dataChan.bufferedAmount)*100 / this._fileSendSize;
}

UploadHandler.prototype.currentFile = function() {
    return this._currentSentFile;
}

function writeStringToArrBuf(str, buf, offset) {
    if (buf.byteLength < offset + str.length*2) // 2 bytes for each char
        throw new Error("Target buffer too small");

    var bufView = new Uint16Array(buf, offset, str.length);
    for (var i=0, strLen=str.length; i<strLen; i++)
         bufView[i] = str.charCodeAt(i);
    return buf;
}

function readStringFromArrBuf(buf, offset, len) {
    if (len !== undefined) {
        if (len & 1)
            throw new Error("String byte-length must be an even number (string are UTF-16 encoded)");
        if (offset+len >= buf.byteLength)
            throw new Error("Buffer is shorter that required for string len parameter");
    }
    else {
        len = buf.byteLength - offset;
        if (len & 1)
            throw new Error("Uneven number of bytes for string");
        len = len / 2;
    }
    var view = new Uint16Array(buf, offset, len);
    return String.fromCharCode.apply(null, view);
}

function byteArrToHexString(arr) {
    var len = arr.length;
    if (len & 1)
        throw new Error("byteArrToHexString: Array size must be an even number");
    var result = '';
    for (var i=0; i<len; i++)
        result+=arr[i].toString(16);
    return result;
}

