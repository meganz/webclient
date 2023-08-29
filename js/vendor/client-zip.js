var clientZip = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    downloadZip: () => downloadZip,
    makeZip: () => makeZip,
    predictLength: () => predictLength
  });

  // src/polyfills.ts
  if (!("stream" in Blob.prototype))
    Object.defineProperty(Blob.prototype, "stream", {
      value() {
        return new Response(this).body;
      }
    });
  if (!("setBigUint64" in DataView.prototype))
    Object.defineProperty(DataView.prototype, "setBigUint64", {
      value(byteOffset, value, littleEndian) {
        const lowWord = Number(value & 0xffffffffn);
        const highWord = Number(value >> 32n);
        this.setUint32(byteOffset + (littleEndian ? 0 : 4), lowWord, littleEndian);
        this.setUint32(byteOffset + (littleEndian ? 4 : 0), highWord, littleEndian);
      }
    });

  // src/utils.ts
  var makeBuffer = (size) => new DataView(new ArrayBuffer(size));
  var makeUint8Array = (thing) => new Uint8Array(thing.buffer || thing);
  var encodeString = (whatever) => new TextEncoder().encode(String(whatever));
  var clampInt32 = (n) => Math.min(4294967295, Number(n));
  var clampInt16 = (n) => Math.min(65535, Number(n));

  // src/input.ts
  function normalizeInput(input, modDate) {
    if (modDate !== void 0 && !(modDate instanceof Date))
      modDate = new Date(modDate);
    if (input instanceof File)
      return {
        isFile: true,
        modDate: modDate || new Date(input.lastModified),
        bytes: input.stream()
      };
    if (input instanceof Response)
      return {
        isFile: true,
        modDate: modDate || new Date(input.headers.get("Last-Modified") || Date.now()),
        bytes: input.body
      };
    if (modDate === void 0)
      modDate = /* @__PURE__ */ new Date();
    else if (isNaN(modDate))
      throw new Error("Invalid modification date.");
    if (input === void 0)
      return { isFile: false, modDate };
    if (typeof input === "string")
      return { isFile: true, modDate, bytes: encodeString(input) };
    if (input instanceof Blob)
      return { isFile: true, modDate, bytes: input.stream() };
    if (input instanceof Uint8Array || input instanceof ReadableStream)
      return { isFile: true, modDate, bytes: input };
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input))
      return { isFile: true, modDate, bytes: makeUint8Array(input) };
    if (Symbol.asyncIterator in input)
      return { isFile: true, modDate, bytes: ReadableFromIterator(input[Symbol.asyncIterator]()) };
    throw new TypeError("Unsupported input format.");
  }
  function ReadableFromIterator(iter, upstream = iter) {
    return new ReadableStream({
      async pull(controller) {
        let pushedSize = 0;
        while (controller.desiredSize > pushedSize) {
          const next = await iter.next();
          if (next.value) {
            const chunk = normalizeChunk(next.value);
            controller.enqueue(chunk);
            pushedSize += chunk.byteLength;
          } else {
            controller.close();
            break;
          }
        }
      },
      cancel(err) {
        upstream.throw?.(err);
      }
    });
  }
  function normalizeChunk(chunk) {
    if (typeof chunk === "string")
      return encodeString(chunk);
    if (chunk instanceof Uint8Array)
      return chunk;
    return makeUint8Array(chunk);
  }

  // src/metadata.ts
  function normalizeMetadata(input, name, size) {
    let [encodedName, nameIsBuffer] = normalizeName(name);
    if (input instanceof File)
      return {
        encodedName: fixFilename(encodedName || encodeString(input.name)),
        uncompressedSize: BigInt(input.size),
        nameIsBuffer
      };
    if (input instanceof Response) {
      const contentDisposition = input.headers.get("content-disposition");
      const filename = contentDisposition && contentDisposition.match(/;\s*filename\*?=["']?(.*?)["']?$/i);
      const urlName = filename && filename[1] || input.url && new URL(input.url).pathname.split("/").findLast(Boolean);
      const decoded = urlName && decodeURIComponent(urlName);
      const length = size || +input.headers.get("content-length");
      return { encodedName: fixFilename(encodedName || encodeString(decoded)), uncompressedSize: BigInt(length), nameIsBuffer };
    }
    encodedName = fixFilename(encodedName, input !== void 0 || size !== void 0);
    if (typeof input === "string")
      return { encodedName, uncompressedSize: BigInt(encodeString(input).length), nameIsBuffer };
    if (input instanceof Blob)
      return { encodedName, uncompressedSize: BigInt(input.size), nameIsBuffer };
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input))
      return { encodedName, uncompressedSize: BigInt(input.byteLength), nameIsBuffer };
    return { encodedName, uncompressedSize: getUncompressedSize(input, size), nameIsBuffer };
  }
  function getUncompressedSize(input, size) {
    if (size > -1) {
      return BigInt(size);
    }
    return input ? void 0 : 0n;
  }
  function normalizeName(name) {
    if (!name)
      return [void 0, false];
    if (name instanceof Uint8Array)
      return [name, true];
    if (ArrayBuffer.isView(name) || name instanceof ArrayBuffer)
      return [makeUint8Array(name), true];
    return [encodeString(name), false];
  }
  function fixFilename(encodedName, isFile = true) {
    if (!encodedName || encodedName.every((c) => c === 47))
      throw new Error("The file must have a name.");
    if (isFile)
      while (encodedName[encodedName.length - 1] === 47)
        encodedName = encodedName.subarray(0, -1);
    else if (encodedName[encodedName.length - 1] !== 47)
      encodedName = new Uint8Array([...encodedName, 47]);
    return encodedName;
  }

  // src/crc32.ts
  var CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; ++i) {
    let crc = i;
    for (let j = 0; j < 8; ++j) {
      crc = crc >>> 1 ^ (crc & 1 && 3988292384);
    }
    CRC_TABLE[i] = crc;
  }
  function crc32(data, crc = 0) {
    crc = crc ^ -1;
    for (var i = 0, l = data.length; i < l; i++) {
      crc = crc >>> 8 ^ CRC_TABLE[crc & 255 ^ data[i]];
    }
    return (crc ^ -1) >>> 0;
  }

  // src/datetime.ts
  function formatDOSDateTime(date, into, offset = 0) {
    const dosTime = date.getSeconds() >> 1 | date.getMinutes() << 5 | date.getHours() << 11;
    const dosDate = date.getDate() | date.getMonth() + 1 << 5 | date.getFullYear() - 1980 << 9;
    into.setUint16(offset, dosTime, true);
    into.setUint16(offset + 2, dosDate, true);
  }

  // src/zip.ts
  var fileHeaderSignature = 1347093252;
  var fileHeaderLength = 30;
  var descriptorSignature = 1347094280;
  var descriptorLength = 16;
  var centralHeaderSignature = 1347092738;
  var centralHeaderLength = 46;
  var endSignature = 1347093766;
  var endLength = 22;
  var zip64endRecordSignature = 1347094022;
  var zip64endRecordLength = 56;
  var zip64endLocatorSignature = 1347094023;
  var zip64endLocatorLength = 20;
  function contentLength(files) {
    let centralLength = BigInt(endLength);
    let offset = 0n;
    let archiveNeedsZip64 = false;
    for (const file of files) {
      if (!file.encodedName)
        throw new Error("Every file must have a non-empty name.");
      if (file.uncompressedSize === void 0)
        throw new Error(`Missing size for file "${new TextDecoder().decode(file.encodedName)}".`);
      const bigFile = file.uncompressedSize >= 0xffffffffn;
      const bigOffset = offset >= 0xffffffffn;
      offset += BigInt(fileHeaderLength + descriptorLength + file.encodedName.length + (bigFile && 8)) + file.uncompressedSize;
      centralLength += BigInt(file.encodedName.length + centralHeaderLength + (bigOffset * 12 | bigFile * 28));
      archiveNeedsZip64 || (archiveNeedsZip64 = bigFile);
    }
    if (archiveNeedsZip64 || offset >= 0xffffffffn)
      centralLength += BigInt(zip64endRecordLength + zip64endLocatorLength);
    return centralLength + offset;
  }
  function flagNameUTF8({ encodedName, nameIsBuffer }, buffersAreUTF8) {
    return (!nameIsBuffer || (buffersAreUTF8 ?? tryUTF8(encodedName))) * 8;
  }
  var UTF8Decoder = new TextDecoder("utf8", { fatal: true });
  function tryUTF8(str) {
    try {
      UTF8Decoder.decode(str);
    } catch {
      return false;
    }
    return true;
  }
  async function* loadFiles(files, options) {
    const centralRecord = [];
    let offset = 0n;
    let fileCount = 0n;
    let archiveNeedsZip64 = false;
    for await (const file of files) {
      const flags = flagNameUTF8(file, options.buffersAreUTF8);
      yield fileHeader(file, flags);
      yield file.encodedName;
      if (file.isFile) {
        yield* fileData(file);
      }
      const bigFile = file.uncompressedSize >= 0xffffffffn;
      const bigOffset = offset >= 0xffffffffn;
      const zip64HeaderLength = bigOffset * 12 | bigFile * 28;
      yield dataDescriptor(file, bigFile);
      centralRecord.push(centralHeader(file, offset, flags, zip64HeaderLength));
      centralRecord.push(file.encodedName);
      if (zip64HeaderLength)
        centralRecord.push(zip64ExtraField(file, offset, zip64HeaderLength));
      if (bigFile)
        offset += 8n;
      fileCount++;
      offset += BigInt(fileHeaderLength + descriptorLength + file.encodedName.length) + file.uncompressedSize;
      archiveNeedsZip64 || (archiveNeedsZip64 = bigFile);
    }
    let centralSize = 0n;
    for (const record of centralRecord) {
      yield record;
      centralSize += BigInt(record.length);
    }
    if (archiveNeedsZip64 || offset >= 0xffffffffn) {
      const endZip64 = makeBuffer(zip64endRecordLength + zip64endLocatorLength);
      endZip64.setUint32(0, zip64endRecordSignature);
      endZip64.setBigUint64(4, BigInt(zip64endRecordLength - 12), true);
      endZip64.setUint32(12, 755182848);
      endZip64.setBigUint64(24, fileCount, true);
      endZip64.setBigUint64(32, fileCount, true);
      endZip64.setBigUint64(40, centralSize, true);
      endZip64.setBigUint64(48, offset, true);
      endZip64.setUint32(56, zip64endLocatorSignature);
      endZip64.setBigUint64(64, offset + centralSize, true);
      endZip64.setUint32(72, 1, true);
      yield makeUint8Array(endZip64);
    }
    const end = makeBuffer(endLength);
    end.setUint32(0, endSignature);
    end.setUint16(8, clampInt16(fileCount), true);
    end.setUint16(10, clampInt16(fileCount), true);
    end.setUint32(12, clampInt32(centralSize), true);
    end.setUint32(16, clampInt32(offset), true);
    yield makeUint8Array(end);
  }
  function fileHeader(file, flags = 0) {
    const header = makeBuffer(fileHeaderLength);
    header.setUint32(0, fileHeaderSignature);
    header.setUint32(4, 754976768 | flags);
    formatDOSDateTime(file.modDate, header, 10);
    header.setUint16(26, file.encodedName.length, true);
    return makeUint8Array(header);
  }
  async function* fileData(file) {
    let { bytes } = file;
    if ("then" in bytes)
      bytes = await bytes;
    if (bytes instanceof Uint8Array) {
      yield bytes;
      file.crc = crc32(bytes, 0);
      file.uncompressedSize = BigInt(bytes.length);
    } else {
      file.uncompressedSize = 0n;
      const reader = bytes.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done)
          break;
        file.crc = crc32(value, file.crc);
        file.uncompressedSize += BigInt(value.length);
        yield value;
      }
    }
  }
  function dataDescriptor(file, needsZip64) {
    const header = makeBuffer(descriptorLength + (needsZip64 ? 8 : 0));
    header.setUint32(0, descriptorSignature);
    header.setUint32(4, file.isFile ? file.crc : 0, true);
    if (needsZip64) {
      header.setBigUint64(8, file.uncompressedSize, true);
      header.setBigUint64(16, file.uncompressedSize, true);
    } else {
      header.setUint32(8, clampInt32(file.uncompressedSize), true);
      header.setUint32(12, clampInt32(file.uncompressedSize), true);
    }
    return makeUint8Array(header);
  }
  function centralHeader(file, offset, flags = 0, zip64HeaderLength = 0) {
    const header = makeBuffer(centralHeaderLength);
    header.setUint32(0, centralHeaderSignature);
    header.setUint32(4, 755182848);
    header.setUint16(8, 2048 | flags);
    formatDOSDateTime(file.modDate, header, 12);
    header.setUint32(16, file.isFile ? file.crc : 0, true);
    header.setUint32(20, clampInt32(file.uncompressedSize), true);
    header.setUint32(24, clampInt32(file.uncompressedSize), true);
    header.setUint16(28, file.encodedName.length, true);
    header.setUint16(30, zip64HeaderLength, true);
    header.setUint16(40, file.isFile ? 33204 : 16893, true);
    header.setUint32(42, clampInt32(offset), true);
    return makeUint8Array(header);
  }
  function zip64ExtraField(file, offset, zip64HeaderLength) {
    const header = makeBuffer(zip64HeaderLength);
    header.setUint16(0, 1, true);
    header.setUint16(2, zip64HeaderLength - 4, true);
    if (zip64HeaderLength & 16) {
      header.setBigUint64(4, file.uncompressedSize, true);
      header.setBigUint64(12, file.uncompressedSize, true);
    }
    header.setBigUint64(zip64HeaderLength - 8, offset, true);
    return makeUint8Array(header);
  }

  // src/index.ts
  function normalizeArgs(file) {
    return file instanceof File || file instanceof Response ? [[file], [file]] : [[file.input, file.name, file.size], [file.input, file.lastModified]];
  }
  function* mapMeta(files) {
    for (const file of files)
      yield normalizeMetadata(...normalizeArgs(file)[0]);
  }
  function mapFiles(files) {
    const iterator = files[Symbol.iterator in files ? Symbol.iterator : Symbol.asyncIterator]();
    return {
      async next() {
        const res = await iterator.next();
        if (res.done)
          return res;
        const [metaArgs, dataArgs] = normalizeArgs(res.value);
        return { done: false, value: Object.assign(normalizeInput(...dataArgs), normalizeMetadata(...metaArgs)) };
      },
      throw: iterator.throw?.bind(iterator),
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  var predictLength = (files) => contentLength(mapMeta(files));
  function downloadZip(files, options = {}) {
    const headers = { "Content-Type": "application/zip", "Content-Disposition": "attachment" };
    if ((typeof options.length === "bigint" || Number.isInteger(options.length)) && options.length > 0)
      headers["Content-Length"] = String(options.length);
    if (options.metadata)
      headers["Content-Length"] = String(predictLength(options.metadata));
    return new Response(makeZip(files, options), { headers });
  }
  function makeZip(files, options = {}) {
    const mapped = mapFiles(files);
    return ReadableFromIterator(loadFiles(mapped, options), mapped);
  }
  return __toCommonJS(src_exports);
})();
