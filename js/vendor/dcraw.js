/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL License
 *
 * dcraw.js -- Dave Coffin's raw photo decoder JavaScript port
 * Copyright 1997-2015 by Dave Coffin, dcoffin a cybercom o net
 * Copyright 2014-2015 by Mega Limited, dc a mega o nz
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>
 *
 * $Revision: 1.476 $
 * $Date: 2015/05/25 02:29:14 $
 *
 * ***** END LICENSE BLOCK ***** */

!function(exports, global) {
 function globalEval(x) {
  throw "NO_DYNAMIC_EXECUTION was set, cannot eval";
 }
 function assert(condition, text) {
  condition || abort("Assertion failed: " + text);
 }
 function getCFunc(ident) {
  var func = Module["_" + ident];
  return func || abort("NO_DYNAMIC_EXECUTION was set, cannot eval - ccall/cwrap are not functional"), assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)"), func;
 }
 function setValue(ptr, value, type, noSafe) {
  switch (type = type || "i8", "*" === type.charAt(type.length - 1) && (type = "i32"), type) {
  case "i1":
   HEAP8[ptr >> 0] = value;
   break;

  case "i8":
   HEAP8[ptr >> 0] = value;
   break;

  case "i16":
   HEAP16[ptr >> 1] = value;
   break;

  case "i32":
   HEAP32[ptr >> 2] = value;
   break;

  case "i64":
   tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (0 | Math_min(+Math_floor(tempDouble / 4294967296), 4294967295)) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
   break;

  case "float":
   HEAPF32[ptr >> 2] = value;
   break;

  case "double":
   HEAPF64[ptr >> 3] = value;
   break;

  default:
   abort("invalid type for setValue: " + type);
  }
 }
 function getValue(ptr, type, noSafe) {
  switch (type = type || "i8", "*" === type.charAt(type.length - 1) && (type = "i32"), type) {
  case "i1":
   return HEAP8[ptr >> 0];

  case "i8":
   return HEAP8[ptr >> 0];

  case "i16":
   return HEAP16[ptr >> 1];

  case "i32":
   return HEAP32[ptr >> 2];

  case "i64":
   return HEAP32[ptr >> 2];

  case "float":
   return HEAPF32[ptr >> 2];

  case "double":
   return HEAPF64[ptr >> 3];

  default:
   abort("invalid type for setValue: " + type);
  }
  return null;
 }
 function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  "number" == typeof slab ? (zeroinit = !0, size = slab) : (zeroinit = !1, size = slab.length);
  var ret, singleType = "string" == typeof types ? types : null;
  if (ret = allocator == ALLOC_NONE ? ptr : [ _malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc ][void 0 === allocator ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length)), zeroinit) {
   var stop, ptr = ret;
   for (assert(0 == (3 & ret)), stop = ret + (-4 & size); stop > ptr; ptr += 4) HEAP32[ptr >> 2] = 0;
   for (stop = ret + size; stop > ptr; ) HEAP8[ptr++ >> 0] = 0;
   return ret;
  }
  if ("i8" === singleType) return slab.subarray || slab.slice ? HEAPU8.set(slab, ret) : HEAPU8.set(new Uint8Array(slab), ret), ret;
  for (var type, typeSize, previousType, i = 0; size > i; ) {
   var curr = slab[i];
   "function" == typeof curr && (curr = Runtime.getFunctionIndex(curr)), type = singleType || types[i], 0 !== type ? ("i64" == type && (type = "i32"), setValue(ret + i, curr, type), previousType !== type && (typeSize = Runtime.getNativeTypeSize(type), previousType = type), i += typeSize) : i++;
  }
  return ret;
 }
 function getMemory(size) {
  return staticSealed ? "undefined" != typeof _sbrk && !_sbrk.called || !runtimeInitialized ? Runtime.dynamicAlloc(size) : _malloc(size) : Runtime.staticAlloc(size);
 }
 function Pointer_stringify(ptr, length) {
  if (0 === length || !ptr) return "";
  for (var t, hasUtf = 0, i = 0; ;) {
   if (t = HEAPU8[ptr + i >> 0], hasUtf |= t, 0 == t && !length) break;
   if (i++, length && i == length) break;
  }
  length || (length = i);
  var ret = "";
  if (128 > hasUtf) {
   for (var curr, MAX_CHUNK = 1024; length > 0; ) curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK))), ret = ret ? ret + curr : curr, ptr += MAX_CHUNK, length -= MAX_CHUNK;
   return ret;
  }
  return Module.UTF8ToString(ptr);
 }
 function AsciiToString(ptr) {
  for (var str = ""; ;) {
   var ch = HEAP8[ptr++ >> 0];
   if (!ch) return str;
   str += String.fromCharCode(ch);
  }
 }
 function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, !1);
 }
 function UTF8ArrayToString(u8Array, idx) {
  for (var u0, u1, u2, u3, u4, u5, str = ""; ;) {
   if (u0 = u8Array[idx++], !u0) return str;
   if (128 & u0) if (u1 = 63 & u8Array[idx++], 192 != (224 & u0)) if (u2 = 63 & u8Array[idx++], 224 == (240 & u0) ? u0 = (15 & u0) << 12 | u1 << 6 | u2 : (u3 = 63 & u8Array[idx++], 240 == (248 & u0) ? u0 = (7 & u0) << 18 | u1 << 12 | u2 << 6 | u3 : (u4 = 63 & u8Array[idx++], 248 == (252 & u0) ? u0 = (3 & u0) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4 : (u5 = 63 & u8Array[idx++], u0 = (1 & u0) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5))), 65536 > u0) str += String.fromCharCode(u0); else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | 1023 & ch);
   } else str += String.fromCharCode((31 & u0) << 6 | u1); else str += String.fromCharCode(u0);
  }
 }
 function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8, ptr);
 }
 function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  for (var startIdx = outIdx, endIdx = outIdx + maxBytesToWrite - 1, i = 0; str.length > i; ++i) {
   var u = str.charCodeAt(i);
   if (u >= 55296 && 57343 >= u && (u = 65536 + ((1023 & u) << 10) | 1023 & str.charCodeAt(++i)), 127 >= u) {
    if (outIdx >= endIdx) break;
    outU8Array[outIdx++] = u;
   } else if (2047 >= u) {
    if (outIdx + 1 >= endIdx) break;
    outU8Array[outIdx++] = 192 | u >> 6, outU8Array[outIdx++] = 128 | 63 & u;
   } else if (65535 >= u) {
    if (outIdx + 2 >= endIdx) break;
    outU8Array[outIdx++] = 224 | u >> 12, outU8Array[outIdx++] = 128 | u >> 6 & 63, outU8Array[outIdx++] = 128 | 63 & u;
   } else if (2097151 >= u) {
    if (outIdx + 3 >= endIdx) break;
    outU8Array[outIdx++] = 240 | u >> 18, outU8Array[outIdx++] = 128 | u >> 12 & 63, outU8Array[outIdx++] = 128 | u >> 6 & 63, outU8Array[outIdx++] = 128 | 63 & u;
   } else if (67108863 >= u) {
    if (outIdx + 4 >= endIdx) break;
    outU8Array[outIdx++] = 248 | u >> 24, outU8Array[outIdx++] = 128 | u >> 18 & 63, outU8Array[outIdx++] = 128 | u >> 12 & 63, outU8Array[outIdx++] = 128 | u >> 6 & 63, outU8Array[outIdx++] = 128 | 63 & u;
   } else {
    if (outIdx + 5 >= endIdx) break;
    outU8Array[outIdx++] = 252 | u >> 30, outU8Array[outIdx++] = 128 | u >> 24 & 63, outU8Array[outIdx++] = 128 | u >> 18 & 63, outU8Array[outIdx++] = 128 | u >> 12 & 63, outU8Array[outIdx++] = 128 | u >> 6 & 63, outU8Array[outIdx++] = 128 | 63 & u;
   }
  }
  return outU8Array[outIdx] = 0, outIdx - startIdx;
 }
 function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
 }
 function lengthBytesUTF8(str) {
  for (var len = 0, i = 0; str.length > i; ++i) {
   var u = str.charCodeAt(i);
   u >= 55296 && 57343 >= u && (u = 65536 + ((1023 & u) << 10) | 1023 & str.charCodeAt(++i)), 127 >= u ? ++len : len += 2047 >= u ? 2 : 65535 >= u ? 3 : 2097151 >= u ? 4 : 67108863 >= u ? 5 : 6;
  }
  return len;
 }
 function UTF16ToString(ptr) {
  for (var i = 0, str = ""; ;) {
   var codeUnit = HEAP16[ptr + 2 * i >> 1];
   if (0 == codeUnit) return str;
   ++i, str += String.fromCharCode(codeUnit);
  }
 }
 function stringToUTF16(str, outPtr, maxBytesToWrite) {
  if (void 0 === maxBytesToWrite && (maxBytesToWrite = 2147483647), 2 > maxBytesToWrite) return 0;
  maxBytesToWrite -= 2;
  for (var startPtr = outPtr, numCharsToWrite = 2 * str.length > maxBytesToWrite ? maxBytesToWrite / 2 : str.length, i = 0; numCharsToWrite > i; ++i) {
   var codeUnit = str.charCodeAt(i);
   HEAP16[outPtr >> 1] = codeUnit, outPtr += 2;
  }
  return HEAP16[outPtr >> 1] = 0, outPtr - startPtr;
 }
 function lengthBytesUTF16(str) {
  return 2 * str.length;
 }
 function UTF32ToString(ptr) {
  for (var i = 0, str = ""; ;) {
   var utf32 = HEAP32[ptr + 4 * i >> 2];
   if (0 == utf32) return str;
   if (++i, utf32 >= 65536) {
    var ch = utf32 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | 1023 & ch);
   } else str += String.fromCharCode(utf32);
  }
 }
 function stringToUTF32(str, outPtr, maxBytesToWrite) {
  if (void 0 === maxBytesToWrite && (maxBytesToWrite = 2147483647), 4 > maxBytesToWrite) return 0;
  for (var startPtr = outPtr, endPtr = startPtr + maxBytesToWrite - 4, i = 0; str.length > i; ++i) {
   var codeUnit = str.charCodeAt(i);
   if (codeUnit >= 55296 && 57343 >= codeUnit) {
    var trailSurrogate = str.charCodeAt(++i);
    codeUnit = 65536 + ((1023 & codeUnit) << 10) | 1023 & trailSurrogate;
   }
   if (HEAP32[outPtr >> 2] = codeUnit, outPtr += 4, outPtr + 4 > endPtr) break;
  }
  return HEAP32[outPtr >> 2] = 0, outPtr - startPtr;
 }
 function lengthBytesUTF32(str) {
  for (var len = 0, i = 0; str.length > i; ++i) {
   var codeUnit = str.charCodeAt(i);
   codeUnit >= 55296 && 57343 >= codeUnit && ++i, len += 4;
  }
  return len;
 }
 function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
   try {
    throw new Error(0);
   } catch (e) {
    err = e;
   }
   if (!err.stack) return "(no stack trace available)";
  }
  return err.stack.toString();
 }
 function stackTrace() {
  return jsStackTrace();
 }
 function alignMemoryPage(x) {
  return x % 4096 > 0 && (x += 4096 - x % 4096), x;
 }
 function enlargeMemory() {
  var LIMIT = Math.pow(2, 31);
  if (DYNAMICTOP >= LIMIT) return !1;
  for (;DYNAMICTOP >= TOTAL_MEMORY; ) if (LIMIT / 2 > TOTAL_MEMORY) TOTAL_MEMORY = alignMemoryPage(2 * TOTAL_MEMORY); else {
   var last = TOTAL_MEMORY;
   if (TOTAL_MEMORY = alignMemoryPage((3 * TOTAL_MEMORY + LIMIT) / 4), last >= TOTAL_MEMORY) return !1;
  }
  if (TOTAL_MEMORY = Math.max(TOTAL_MEMORY, 16777216), TOTAL_MEMORY >= LIMIT) return !1;
  try {
   if (ArrayBuffer.transfer) buffer = ArrayBuffer.transfer(buffer, TOTAL_MEMORY); else {
    var oldHEAP8 = HEAP8;
    buffer = new ArrayBuffer(TOTAL_MEMORY);
   }
  } catch (e) {
   return !1;
  }
  var success = _emscripten_replace_memory(buffer);
  return success ? (Module.buffer = buffer, Module.HEAP8 = HEAP8 = new Int8Array(buffer), Module.HEAP16 = HEAP16 = new Int16Array(buffer), Module.HEAP32 = HEAP32 = new Int32Array(buffer), Module.HEAPU8 = HEAPU8 = new Uint8Array(buffer), Module.HEAPU16 = HEAPU16 = new Uint16Array(buffer), Module.HEAPU32 = HEAPU32 = new Uint32Array(buffer), Module.HEAPF32 = HEAPF32 = new Float32Array(buffer), Module.HEAPF64 = HEAPF64 = new Float64Array(buffer), ArrayBuffer.transfer || HEAP8.set(oldHEAP8), !0) : !1;
 }
 function callRuntimeCallbacks(callbacks) {
  for (;callbacks.length > 0; ) {
   var callback = callbacks.shift();
   if ("function" != typeof callback) {
    var func = callback.func;
    "number" == typeof func ? void 0 === callback.arg ? Runtime.dynCall("v", func) : Runtime.dynCall("vi", func, [ callback.arg ]) : func(void 0 === callback.arg ? null : callback.arg);
   } else callback();
  }
 }
 function preRun() {
  if (Module.preRun) for ("function" == typeof Module.preRun && (Module.preRun = [ Module.preRun ]); Module.preRun.length; ) addOnPreRun(Module.preRun.shift());
  callRuntimeCallbacks(__ATPRERUN__);
 }
 function ensureInitRuntime() {
  runtimeInitialized || (runtimeInitialized = !0, callRuntimeCallbacks(__ATINIT__));
 }
 function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
 }
 function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__), runtimeExited = !0;
 }
 function postRun() {
  if (Module.postRun) for ("function" == typeof Module.postRun && (Module.postRun = [ Module.postRun ]); Module.postRun.length; ) addOnPostRun(Module.postRun.shift());
  callRuntimeCallbacks(__ATPOSTRUN__);
 }
 function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
 }
 function addOnInit(cb) {
  __ATINIT__.unshift(cb);
 }
 function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
 }
 function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
 }
 function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
 }
 function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1, u8array = new Array(len), numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  return dontAddNull && (u8array.length = numBytesWritten), u8array;
 }
 function intArrayToString(array) {
  for (var ret = [], i = 0; array.length > i; i++) {
   var chr = array[i];
   chr > 255 && (chr &= 255), ret.push(String.fromCharCode(chr));
  }
  return ret.join("");
 }
 function writeStringToMemory(string, buffer, dontAddNull) {
  for (var array = intArrayFromString(string, dontAddNull), i = 0; array.length > i; ) {
   var chr = array[i];
   HEAP8[buffer + i >> 0] = chr, i += 1;
  }
 }
 function writeArrayToMemory(array, buffer) {
  for (var i = 0; array.length > i; i++) HEAP8[buffer++ >> 0] = array[i];
 }
 function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; str.length > i; ++i) HEAP8[buffer++ >> 0] = str.charCodeAt(i);
  dontAddNull || (HEAP8[buffer >> 0] = 0);
 }
 function unSign(value, bits, ignore) {
  return value >= 0 ? value : 32 >= bits ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
 }
 function reSign(value, bits, ignore) {
  if (0 >= value) return value;
  var half = 32 >= bits ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
  return value >= half && (32 >= bits || value > half) && (value = -2 * half + value), value;
 }
 function ___setErrNo(value) {
  return HEAP32[___errno_state >> 2] = value, value;
 }
 function _fflush(stream) {}
 function _lseek(fildes, offset, whence) {
  var stream = FS.getStream(fildes);
  if (!stream) return ___setErrNo(ERRNO_CODES.EBADF), -1;
  try {
   return FS.llseek(stream, offset, whence);
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _fileno(stream) {
  return stream = FS.getStreamFromPtr(stream), stream ? stream.fd : -1;
 }
 function _fseek(stream, offset, whence) {
  var fd = _fileno(stream), ret = _lseek(fd, offset, whence);
  return -1 == ret ? -1 : (stream = FS.getStreamFromPtr(stream), stream.eof = !1, 0);
 }
 function _close(fildes) {
  var stream = FS.getStream(fildes);
  if (!stream) return ___setErrNo(ERRNO_CODES.EBADF), -1;
  try {
   return FS.close(stream), 0;
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _fclose(stream) {
  var fd = _fileno(stream);
  return _close(fd);
 }
 function _tmpnam(s, dir, prefix) {
  dir = dir || "/tmp", dir = dir || "/tmp";
  var folder = FS.findObject(dir);
  if (!(folder && folder.isFolder || (dir = "/tmp", folder = FS.findObject(dir), folder && folder.isFolder))) return 0;
  var name = prefix || "file";
  do name += String.fromCharCode(65 + 25 * Math.random() | 0); while (name in folder.contents);
  var result = dir + "/" + name;
  return _tmpnam.buffer || (_tmpnam.buffer = _malloc(256)), s || (s = _tmpnam.buffer), assert(255 >= result.length), writeAsciiToMemory(result, s), s;
 }
 function _open(path, oflag, varargs) {
  var mode = HEAP32[varargs >> 2];
  path = Pointer_stringify(path);
  try {
   var stream = FS.open(path, oflag, mode);
   return stream.fd;
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _fopen(filename, mode) {
  var flags;
  if (mode = Pointer_stringify(mode), "r" == mode[0]) flags = -1 != mode.indexOf("+") ? 2 : 0; else if ("w" == mode[0]) flags = -1 != mode.indexOf("+") ? 2 : 1, flags |= 64, flags |= 512; else {
   if ("a" != mode[0]) return ___setErrNo(ERRNO_CODES.EINVAL), 0;
   flags = -1 != mode.indexOf("+") ? 2 : 1, flags |= 64, flags |= 1024;
  }
  var fd = _open(filename, flags, allocate([ 511, 0, 0, 0 ], "i32", ALLOC_STACK));
  return -1 === fd ? 0 : FS.getPtrForStream(FS.getStream(fd));
 }
 function _tmpfile() {
  return _tmpfile.mode || (_tmpfile.mode = allocate(intArrayFromString("w+"), "i8", ALLOC_NORMAL)), _fopen(_tmpnam(0), _tmpfile.mode);
 }
 function _mkport() {
  throw "TODO";
 }
 function _send() {}
 function _pwrite(fildes, buf, nbyte, offset) {
  var stream = FS.getStream(fildes);
  if (!stream) return ___setErrNo(ERRNO_CODES.EBADF), -1;
  try {
   var slab = HEAP8;
   return FS.write(stream, slab, buf, nbyte, offset);
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _write(fildes, buf, nbyte) {
  var stream = FS.getStream(fildes);
  if (!stream) return ___setErrNo(ERRNO_CODES.EBADF), -1;
  try {
   var slab = HEAP8;
   return FS.write(stream, slab, buf, nbyte);
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _fwrite(ptr, size, nitems, stream) {
  var bytesToWrite = nitems * size;
  if (0 == bytesToWrite) return 0;
  var fd = _fileno(stream), bytesWritten = _write(fd, ptr, bytesToWrite);
  if (-1 == bytesWritten) {
   var streamObj = FS.getStreamFromPtr(stream);
   return streamObj && (streamObj.error = !0), 0;
  }
  return bytesWritten / size | 0;
 }
 function __reallyNegative(x) {
  return 0 > x || 0 === x && 1 / x === -(1 / 0);
 }
 function __formatString(format, varargs) {
  function getNextArg(type) {
   var ret;
   return argIndex = Runtime.prepVararg(argIndex, type), "double" === type ? (ret = HEAPF64[varargs + argIndex >> 3], argIndex += 8) : "i64" == type ? (ret = [ HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2] ], argIndex += 8) : (assert(0 === (3 & argIndex)), type = "i32", ret = HEAP32[varargs + argIndex >> 2], argIndex += 4), ret;
  }
  assert(0 === (3 & varargs));
  for (var curr, next, currArg, textIndex = format, argIndex = 0, ret = []; ;) {
   var startTextIndex = textIndex;
   if (curr = HEAP8[textIndex >> 0], 0 === curr) break;
   if (next = HEAP8[textIndex + 1 >> 0], 37 == curr) {
    var flagAlwaysSigned = !1, flagLeftAlign = !1, flagAlternative = !1, flagZeroPad = !1, flagPadSign = !1;
    flagsLoop: for (;;) {
     switch (next) {
     case 43:
      flagAlwaysSigned = !0;
      break;

     case 45:
      flagLeftAlign = !0;
      break;

     case 35:
      flagAlternative = !0;
      break;

     case 48:
      if (flagZeroPad) break flagsLoop;
      flagZeroPad = !0;
      break;

     case 32:
      flagPadSign = !0;
      break;

     default:
      break flagsLoop;
     }
     textIndex++, next = HEAP8[textIndex + 1 >> 0];
    }
    var width = 0;
    if (42 == next) width = getNextArg("i32"), textIndex++, next = HEAP8[textIndex + 1 >> 0]; else for (;next >= 48 && 57 >= next; ) width = 10 * width + (next - 48), textIndex++, next = HEAP8[textIndex + 1 >> 0];
    var precisionSet = !1, precision = -1;
    if (46 == next) {
     if (precision = 0, precisionSet = !0, textIndex++, next = HEAP8[textIndex + 1 >> 0], 42 == next) precision = getNextArg("i32"), textIndex++; else for (;;) {
      var precisionChr = HEAP8[textIndex + 1 >> 0];
      if (48 > precisionChr || precisionChr > 57) break;
      precision = 10 * precision + (precisionChr - 48), textIndex++;
     }
     next = HEAP8[textIndex + 1 >> 0];
    }
    0 > precision && (precision = 6, precisionSet = !1);
    var argSize;
    switch (String.fromCharCode(next)) {
    case "h":
     var nextNext = HEAP8[textIndex + 2 >> 0];
     104 == nextNext ? (textIndex++, argSize = 1) : argSize = 2;
     break;

    case "l":
     var nextNext = HEAP8[textIndex + 2 >> 0];
     108 == nextNext ? (textIndex++, argSize = 8) : argSize = 4;
     break;

    case "L":
    case "q":
    case "j":
     argSize = 8;
     break;

    case "z":
    case "t":
    case "I":
     argSize = 4;
     break;

    default:
     argSize = null;
    }
    switch (argSize && textIndex++, next = HEAP8[textIndex + 1 >> 0], String.fromCharCode(next)) {
    case "d":
    case "i":
    case "u":
    case "o":
    case "x":
    case "X":
    case "p":
     var signed = 100 == next || 105 == next;
     argSize = argSize || 4;
     var argText, currArg = getNextArg("i" + 8 * argSize);
     if (8 == argSize && (currArg = Runtime.makeBigInt(currArg[0], currArg[1], 117 == next)), 4 >= argSize) {
      var limit = Math.pow(256, argSize) - 1;
      currArg = (signed ? reSign : unSign)(currArg & limit, 8 * argSize);
     }
     var currAbsArg = Math.abs(currArg), prefix = "";
     if (100 == next || 105 == next) argText = reSign(currArg, 8 * argSize, 1).toString(10); else if (117 == next) argText = unSign(currArg, 8 * argSize, 1).toString(10), currArg = Math.abs(currArg); else if (111 == next) argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8); else if (120 == next || 88 == next) {
      prefix = flagAlternative && 0 != currArg ? "0x" : "";
      if (0 > currArg) {
       currArg = -currArg, argText = (currAbsArg - 1).toString(16);
       for (var buffer = [], i = 0; argText.length > i; i++) buffer.push((15 - parseInt(argText[i], 16)).toString(16));
       for (argText = buffer.join(""); 2 * argSize > argText.length; ) argText = "f" + argText;
      } else argText = currAbsArg.toString(16);
      88 == next && (prefix = prefix.toUpperCase(), argText = argText.toUpperCase());
     } else 112 == next && (0 === currAbsArg ? argText = "(nil)" : (prefix = "0x", argText = currAbsArg.toString(16)));
     if (precisionSet) for (;precision > argText.length; ) argText = "0" + argText;
     for (currArg >= 0 && (flagAlwaysSigned ? prefix = "+" + prefix : flagPadSign && (prefix = " " + prefix)), "-" == argText.charAt(0) && (prefix = "-" + prefix, argText = argText.substr(1)); width > prefix.length + argText.length; ) flagLeftAlign ? argText += " " : flagZeroPad ? argText = "0" + argText : prefix = " " + prefix;
     argText = prefix + argText, argText.split("").forEach(function(chr) {
      ret.push(chr.charCodeAt(0));
     });
     break;

    case "f":
    case "F":
    case "e":
    case "E":
    case "g":
    case "G":
     var argText, currArg = getNextArg("double");
     if (isNaN(currArg)) argText = "nan", flagZeroPad = !1; else if (isFinite(currArg)) {
      var isGeneral = !1, effectivePrecision = Math.min(precision, 20);
      if (103 == next || 71 == next) {
       isGeneral = !0, precision = precision || 1;
       var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
       precision > exponent && exponent >= -4 ? (next = (103 == next ? "f" : "F").charCodeAt(0), precision -= exponent + 1) : (next = (103 == next ? "e" : "E").charCodeAt(0), precision--), effectivePrecision = Math.min(precision, 20);
      }
      101 == next || 69 == next ? (argText = currArg.toExponential(effectivePrecision), /[eE][-+]\d$/.test(argText) && (argText = argText.slice(0, -1) + "0" + argText.slice(-1))) : (102 == next || 70 == next) && (argText = currArg.toFixed(effectivePrecision), 0 === currArg && __reallyNegative(currArg) && (argText = "-" + argText));
      var parts = argText.split("e");
      if (isGeneral && !flagAlternative) for (;parts[0].length > 1 && -1 != parts[0].indexOf(".") && ("0" == parts[0].slice(-1) || "." == parts[0].slice(-1)); ) parts[0] = parts[0].slice(0, -1); else for (flagAlternative && -1 == argText.indexOf(".") && (parts[0] += "."); precision > effectivePrecision++; ) parts[0] += "0";
      argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : ""), 69 == next && (argText = argText.toUpperCase()), currArg >= 0 && (flagAlwaysSigned ? argText = "+" + argText : flagPadSign && (argText = " " + argText));
     } else argText = (0 > currArg ? "-" : "") + "inf", flagZeroPad = !1;
     for (;width > argText.length; ) flagLeftAlign ? argText += " " : argText = !flagZeroPad || "-" != argText[0] && "+" != argText[0] ? (flagZeroPad ? "0" : " ") + argText : argText[0] + "0" + argText.slice(1);
     97 > next && (argText = argText.toUpperCase()), argText.split("").forEach(function(chr) {
      ret.push(chr.charCodeAt(0));
     });
     break;

    case "s":
     var arg = getNextArg("i8*"), argLength = arg ? _strlen(arg) : "(null)".length;
     if (precisionSet && (argLength = Math.min(argLength, precision)), !flagLeftAlign) for (;argLength < width--; ) ret.push(32);
     if (arg) for (var i = 0; argLength > i; i++) ret.push(HEAPU8[arg++ >> 0]); else ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), !0));
     if (flagLeftAlign) for (;argLength < width--; ) ret.push(32);
     break;

    case "c":
     for (flagLeftAlign && ret.push(getNextArg("i8")); --width > 0; ) ret.push(32);
     flagLeftAlign || ret.push(getNextArg("i8"));
     break;

    case "n":
     var ptr = getNextArg("i32*");
     HEAP32[ptr >> 2] = ret.length;
     break;

    case "%":
     ret.push(curr);
     break;

    default:
     for (var i = startTextIndex; textIndex + 2 > i; i++) ret.push(HEAP8[i >> 0]);
    }
    textIndex += 2;
   } else ret.push(curr), textIndex += 1;
  }
  return ret;
 }
 function _fprintf(stream, format, varargs) {
  var result = __formatString(format, varargs), stack = Runtime.stackSave(), ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
  return Runtime.stackRestore(stack), ret;
 }
 function _printf(format, varargs) {
  var stdout = HEAP32[_stdout >> 2];
  return _fprintf(stdout, format, varargs);
 }
 function _fputc(c, stream) {
  var chr = unSign(255 & c);
  HEAP8[_fputc.ret >> 0] = chr;
  var fd = _fileno(stream), ret = _write(fd, _fputc.ret, 1);
  if (-1 == ret) {
   var streamObj = FS.getStreamFromPtr(stream);
   return streamObj && (streamObj.error = !0), -1;
  }
  return chr;
 }
 function _swab(src, dest, nbytes) {
  if (!(0 > nbytes)) {
   nbytes -= nbytes % 2;
   for (var i = 0; nbytes > i; i += 2) {
    var first = HEAP8[src + i >> 0], second = HEAP8[src + (i + 1) >> 0];
    HEAP8[dest + i >> 0] = second, HEAP8[dest + (i + 1) >> 0] = first;
   }
  }
 }
 function _htonl(value) {
  return ((255 & value) << 24) + ((65280 & value) << 8) + ((16711680 & value) >>> 8) + ((4278190080 & value) >>> 24);
 }
 function _ntohl() {
  return _htonl.apply(null, arguments);
 }
 function _emscripten_memcpy_big(dest, src, num) {
  return HEAPU8.set(HEAPU8.subarray(src, src + num), dest), dest;
 }
 function _tzset() {
  function extractZone(date) {
   var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
   return match ? match[1] : "GMT";
  }
  if (!_tzset.called) {
   _tzset.called = !0, HEAP32[_timezone >> 2] = 60 * -new Date().getTimezoneOffset();
   var winter = new Date(2e3, 0, 1), summer = new Date(2e3, 6, 1);
   HEAP32[_daylight >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
   var winterName = extractZone(winter), summerName = extractZone(summer), winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL), summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
   summer.getTimezoneOffset() < winter.getTimezoneOffset() ? (HEAP32[_tzname >> 2] = winterNamePtr, HEAP32[_tzname + 4 >> 2] = summerNamePtr) : (HEAP32[_tzname >> 2] = summerNamePtr, HEAP32[_tzname + 4 >> 2] = winterNamePtr);
  }
 }
 function _mktime(tmPtr) {
  _tzset();
  var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0), dst = HEAP32[tmPtr + 32 >> 2], guessedOffset = date.getTimezoneOffset(), start = new Date(date.getFullYear(), 0, 1), summerOffset = new Date(2e3, 6, 1).getTimezoneOffset(), winterOffset = start.getTimezoneOffset();
  Math.min(winterOffset, summerOffset);
  if (0 > dst) HEAP32[tmPtr + 32 >> 2] = Number(winterOffset != guessedOffset); else if (dst > 0 != (winterOffset != guessedOffset)) {
   var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset(), trueOffset = dst > 0 ? summerOffset : winterOffset;
   date.setTime(date.getTime() + 6e4 * (trueOffset - guessedOffset));
  }
  HEAP32[tmPtr + 24 >> 2] = date.getDay();
  var yday = (date.getTime() - start.getTime()) / 864e5 | 0;
  return HEAP32[tmPtr + 28 >> 2] = yday, date.getTime() / 1e3 | 0;
 }
 function _htons(value) {
  return ((255 & value) << 8) + ((65280 & value) >> 8);
 }
 function _ntohs() {
  return _htons.apply(null, arguments);
 }
 function _putc() {
  return _fputc.apply(null, arguments);
 }
 function _localtime_r(time, tmPtr) {
  _tzset();
  var date = new Date(1e3 * HEAP32[time >> 2]);
  HEAP32[tmPtr >> 2] = date.getSeconds(), HEAP32[tmPtr + 4 >> 2] = date.getMinutes(), HEAP32[tmPtr + 8 >> 2] = date.getHours(), HEAP32[tmPtr + 12 >> 2] = date.getDate(), HEAP32[tmPtr + 16 >> 2] = date.getMonth(), HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900, HEAP32[tmPtr + 24 >> 2] = date.getDay();
  var start = new Date(date.getFullYear(), 0, 1), yday = (date.getTime() - start.getTime()) / 864e5 | 0;
  HEAP32[tmPtr + 28 >> 2] = yday, HEAP32[tmPtr + 36 >> 2] = -(60 * date.getTimezoneOffset());
  var summerOffset = new Date(2e3, 6, 1).getTimezoneOffset(), winterOffset = start.getTimezoneOffset(), dst = date.getTimezoneOffset() == Math.min(winterOffset, summerOffset) | 0;
  HEAP32[tmPtr + 32 >> 2] = dst;
  var zonePtr = HEAP32[_tzname + (dst ? Runtime.QUANTUM_SIZE : 0) >> 2];
  return HEAP32[tmPtr + 40 >> 2] = zonePtr, tmPtr;
 }
 function _localtime(time) {
  return _localtime_r(time, ___tm_current);
 }
 function _recv() {}
 function _pread(fildes, buf, nbyte, offset) {
  var stream = FS.getStream(fildes);
  if (!stream) return ___setErrNo(ERRNO_CODES.EBADF), -1;
  try {
   var slab = HEAP8;
   return FS.read(stream, slab, buf, nbyte, offset);
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _read(fildes, buf, nbyte) {
  var stream = FS.getStream(fildes);
  if (!stream) return ___setErrNo(ERRNO_CODES.EBADF), -1;
  try {
   var slab = HEAP8;
   return FS.read(stream, slab, buf, nbyte);
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _fread(ptr, size, nitems, stream) {
  var bytesToRead = nitems * size;
  if (0 == bytesToRead) return 0;
  var bytesRead = 0, streamObj = FS.getStreamFromPtr(stream);
  if (!streamObj) return ___setErrNo(ERRNO_CODES.EBADF), 0;
  for (;streamObj.ungotten.length && bytesToRead > 0; ) HEAP8[ptr++ >> 0] = streamObj.ungotten.pop(), bytesToRead--, bytesRead++;
  var err = _read(streamObj.fd, ptr, bytesToRead);
  return -1 == err ? (streamObj && (streamObj.error = !0), 0) : (bytesRead += err, bytesToRead > bytesRead && (streamObj.eof = !0), bytesRead / size | 0);
 }
 function _fgetc(stream) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (!streamObj) return -1;
  if (streamObj.eof || streamObj.error) return -1;
  var ret = _fread(_fgetc.ret, 1, 1, stream);
  return 0 == ret ? -1 : -1 == ret ? (streamObj.error = !0, -1) : HEAPU8[_fgetc.ret >> 0];
 }
 function _getc_unlocked() {
  return _fgetc.apply(null, arguments);
 }
 function _longjmp(env, value) {
  throw asm.setThrew(env, value || 1), "longjmp";
 }
 function _emscripten_longjmp(env, value) {
  _longjmp(env, value);
 }
 function _utime(path, times) {
  var time;
  if (times) {
   var offset = 4;
   time = HEAP32[times + offset >> 2], time *= 1e3;
  } else time = Date.now();
  path = Pointer_stringify(path);
  try {
   return FS.utime(path, time, time), 0;
  } catch (e) {
   return FS.handleFSError(e), -1;
  }
 }
 function _fputs(s, stream) {
  var fd = _fileno(stream);
  return _write(fd, s, _strlen(s));
 }
 function _puts(s) {
  var stdout = HEAP32[_stdout >> 2], ret = _fputs(s, stdout);
  if (0 > ret) return ret;
  var newlineRet = _fputc(10, stdout);
  return 0 > newlineRet ? -1 : ret + 1;
 }
 function _strerror_r(errnum, strerrbuf, buflen) {
  if (errnum in ERRNO_MESSAGES) {
   if (ERRNO_MESSAGES[errnum].length > buflen - 1) return ___setErrNo(ERRNO_CODES.ERANGE);
   var msg = ERRNO_MESSAGES[errnum];
   return writeAsciiToMemory(msg, strerrbuf), 0;
  }
  return ___setErrNo(ERRNO_CODES.EINVAL);
 }
 function _strerror(errnum) {
  return _strerror.buffer || (_strerror.buffer = _malloc(256)), _strerror_r(errnum, _strerror.buffer, 256), _strerror.buffer;
 }
 function ___errno_location() {
  return ___errno_state;
 }
 function _perror(s) {
  var stdout = HEAP32[_stdout >> 2];
  s && (_fputs(s, stdout), _fputc(58, stdout), _fputc(32, stdout));
  var errnum = HEAP32[___errno_location() >> 2];
  _puts(_strerror(errnum));
 }
 function _asctime_r(tmPtr, buf) {
  var date = {
   tm_sec: HEAP32[tmPtr >> 2],
   tm_min: HEAP32[tmPtr + 4 >> 2],
   tm_hour: HEAP32[tmPtr + 8 >> 2],
   tm_mday: HEAP32[tmPtr + 12 >> 2],
   tm_mon: HEAP32[tmPtr + 16 >> 2],
   tm_year: HEAP32[tmPtr + 20 >> 2],
   tm_wday: HEAP32[tmPtr + 24 >> 2]
  }, days = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ], months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ], s = days[date.tm_wday] + " " + months[date.tm_mon] + (10 > date.tm_mday ? "  " : " ") + date.tm_mday + (10 > date.tm_hour ? " 0" : " ") + date.tm_hour + (10 > date.tm_min ? ":0" : ":") + date.tm_min + (10 > date.tm_sec ? ":0" : ":") + date.tm_sec + " " + (1900 + date.tm_year) + "\n";
  return writeStringToMemory(s, buf), buf;
 }
 function _ctime_r(time, buf) {
  var stack = Runtime.stackSave(), rv = _asctime_r(_localtime_r(time, Runtime.stackAlloc(44)), buf);
  return Runtime.stackRestore(stack), rv;
 }
 function _ctime(timer) {
  return _ctime_r(timer, ___tm_current);
 }
 function _sbrk(bytes) {
  var self = _sbrk;
  self.called || (DYNAMICTOP = alignMemoryPage(DYNAMICTOP), self.called = !0, assert(Runtime.dynamicAlloc), self.alloc = Runtime.dynamicAlloc, Runtime.dynamicAlloc = function() {
   abort("cannot dynamically allocate, sbrk now has control");
  });
  var ret = DYNAMICTOP;
  if (0 != bytes) {
   var success = self.alloc(bytes);
   if (!success) return -1 >>> 0;
  }
  return ret;
 }
 function __getFloat(text) {
  return /^[+-]?[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(text);
 }
 function __scanString(format, get, unget, varargs) {
  __scanString.whiteSpace || (__scanString.whiteSpace = {}, __scanString.whiteSpace[32] = 1, __scanString.whiteSpace[9] = 1, __scanString.whiteSpace[10] = 1, __scanString.whiteSpace[11] = 1, __scanString.whiteSpace[12] = 1, __scanString.whiteSpace[13] = 1), format = Pointer_stringify(format);
  var soFar = 0;
  if (format.indexOf("%n") >= 0) {
   var _get = get;
   get = function() {
    return soFar++, _get();
   };
   var _unget = unget;
   unget = function() {
    return soFar--, _unget();
   };
  }
  var next, formatIndex = 0, fields = 0, argIndex = 0;
  mainLoop: for (var formatIndex = 0; format.length > formatIndex; ) if ("%" !== format[formatIndex] || "n" != format[formatIndex + 1]) {
   if ("%" === format[formatIndex]) {
    var nextC = format.indexOf("c", formatIndex + 1);
    if (nextC > 0) {
     var maxx = 1;
     if (nextC > formatIndex + 1) {
      var sub = format.substring(formatIndex + 1, nextC);
      maxx = parseInt(sub), maxx != sub && (maxx = 0);
     }
     if (maxx) {
      argIndex = Runtime.prepVararg(argIndex, "*");
      var argPtr = HEAP32[varargs + argIndex >> 2];
      argIndex += Runtime.getAlignSize("void*", null, !0), fields++;
      for (var i = 0; maxx > i; i++) if (next = get(), HEAP8[argPtr++ >> 0] = next, 0 === next) return i > 0 ? fields : fields - 1;
      formatIndex += nextC - formatIndex + 1;
      continue;
     }
    }
   }
   if ("%" === format[formatIndex] && format.indexOf("[", formatIndex + 1) > 0) {
    var match = /\%([0-9]*)\[(\^)?(\]?[^\]]*)\]/.exec(format.substring(formatIndex));
    if (match) {
     for (var middleDashMatch, maxNumCharacters = parseInt(match[1]) || 1 / 0, negateScanList = "^" === match[2], scanList = match[3]; middleDashMatch = /([^\-])\-([^\-])/.exec(scanList); ) {
      for (var rangeStartCharCode = middleDashMatch[1].charCodeAt(0), rangeEndCharCode = middleDashMatch[2].charCodeAt(0), expanded = ""; rangeEndCharCode >= rangeStartCharCode; expanded += String.fromCharCode(rangeStartCharCode++)) ;
      scanList = scanList.replace(middleDashMatch[1] + "-" + middleDashMatch[2], expanded);
     }
     argIndex = Runtime.prepVararg(argIndex, "*");
     var argPtr = HEAP32[varargs + argIndex >> 2];
     argIndex += Runtime.getAlignSize("void*", null, !0), fields++;
     for (var i = 0; maxNumCharacters > i; i++) if (next = get(), negateScanList) {
      if (!(scanList.indexOf(String.fromCharCode(next)) < 0)) {
       unget();
       break;
      }
      HEAP8[argPtr++ >> 0] = next;
     } else {
      if (!(scanList.indexOf(String.fromCharCode(next)) >= 0)) {
       unget();
       break;
      }
      HEAP8[argPtr++ >> 0] = next;
     }
     HEAP8[argPtr++ >> 0] = 0, formatIndex += match[0].length;
     continue;
    }
   }
   for (;;) {
    if (next = get(), 0 == next) return fields;
    if (!(next in __scanString.whiteSpace)) break;
   }
   if (unget(), "%" === format[formatIndex]) {
    formatIndex++;
    var suppressAssignment = !1;
    "*" == format[formatIndex] && (suppressAssignment = !0, formatIndex++);
    for (var maxSpecifierStart = formatIndex; format[formatIndex].charCodeAt(0) >= 48 && format[formatIndex].charCodeAt(0) <= 57; ) formatIndex++;
    var max_;
    formatIndex != maxSpecifierStart && (max_ = parseInt(format.slice(maxSpecifierStart, formatIndex), 10));
    var long_ = !1, half = !1, quarter = !1, longLong = !1;
    "l" == format[formatIndex] ? (long_ = !0, formatIndex++, "l" == format[formatIndex] && (longLong = !0, formatIndex++)) : "h" == format[formatIndex] && (half = !0, formatIndex++, "h" == format[formatIndex] && (quarter = !0, formatIndex++));
    var type = format[formatIndex];
    formatIndex++;
    var curr = 0, buffer = [];
    if ("f" == type || "e" == type || "g" == type || "F" == type || "E" == type || "G" == type) {
     for (next = get(); next > 0 && !(next in __scanString.whiteSpace); ) buffer.push(String.fromCharCode(next)), next = get();
     for (var m = __getFloat(buffer.join("")), last = m ? m[0].length : 0, i = 0; buffer.length - last + 1 > i; i++) unget();
     buffer.length = last;
    } else {
     next = get();
     var first = !0;
     if (("x" == type || "X" == type) && 48 == next) {
      var peek = get();
      120 == peek || 88 == peek ? next = get() : unget();
     }
     for (;(max_ > curr || isNaN(max_)) && next > 0 && !(next in __scanString.whiteSpace || "s" != type && ("d" !== type && "u" != type && "i" != type || !(next >= 48 && 57 >= next || first && 45 == next)) && ("x" !== type && "X" !== type || !(next >= 48 && 57 >= next || next >= 97 && 102 >= next || next >= 65 && 70 >= next))) && (formatIndex >= format.length || next !== format[formatIndex].charCodeAt(0)); ) buffer.push(String.fromCharCode(next)), next = get(), curr++, first = !1;
     unget();
    }
    if (0 === buffer.length) return fields;
    if (suppressAssignment) continue;
    var text = buffer.join("");
    argIndex = Runtime.prepVararg(argIndex, "*");
    var argPtr = HEAP32[varargs + argIndex >> 2];
    argIndex += Runtime.getAlignSize("void*", null, !0);
    var base = 10;
    switch (type) {
    case "X":
    case "x":
     base = 16;

    case "d":
    case "u":
    case "i":
     quarter ? HEAP8[argPtr >> 0] = parseInt(text, base) : half ? HEAP16[argPtr >> 1] = parseInt(text, base) : longLong ? (tempI64 = [ parseInt(text, base) >>> 0, (tempDouble = parseInt(text, base), +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (0 | Math_min(+Math_floor(tempDouble / 4294967296), 4294967295)) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], HEAP32[argPtr >> 2] = tempI64[0], HEAP32[argPtr + 4 >> 2] = tempI64[1]) : HEAP32[argPtr >> 2] = parseInt(text, base);
     break;

    case "F":
    case "f":
    case "E":
    case "e":
    case "G":
    case "g":
    case "E":
     long_ ? HEAPF64[argPtr >> 3] = parseFloat(text) : HEAPF32[argPtr >> 2] = parseFloat(text);
     break;

    case "s":
     for (var array = intArrayFromString(text), j = 0; array.length > j; j++) HEAP8[argPtr + j >> 0] = array[j];
    }
    fields++;
   } else if (format[formatIndex].charCodeAt(0) in __scanString.whiteSpace) {
    for (next = get(); next in __scanString.whiteSpace; ) {
     if (0 >= next) break mainLoop;
     next = get();
    }
    unget(next), formatIndex++;
   } else {
    if (next = get(), format[formatIndex].charCodeAt(0) !== next) {
     unget(next);
     break mainLoop;
    }
    formatIndex++;
   }
  } else {
   argIndex = Runtime.prepVararg(argIndex, "*");
   var argPtr = HEAP32[varargs + argIndex >> 2];
   argIndex += Runtime.getAlignSize("void*", null, !0), HEAP32[argPtr >> 2] = soFar, formatIndex += 2;
  }
  return fields;
 }
 function _ungetc(c, stream) {
  return (stream = FS.getStreamFromPtr(stream)) ? -1 === c ? c : (c = unSign(255 & c), stream.ungotten.push(c), stream.eof = !1, c) : -1;
 }
 function _fscanf(stream, format, varargs) {
  function get() {
   var c = _fgetc(stream);
   return buffer.push(c), c;
  }
  function unget() {
   _ungetc(buffer.pop(), stream);
  }
  var streamObj = FS.getStreamFromPtr(stream);
  if (!streamObj) return -1;
  var buffer = [];
  return __scanString(format, get, unget, varargs);
 }
 function _ftell(stream) {
  return stream = FS.getStreamFromPtr(stream), stream ? FS.isChrdev(stream.node.mode) ? (___setErrNo(ERRNO_CODES.ESPIPE), -1) : stream.position : (___setErrNo(ERRNO_CODES.EBADF), -1);
 }
 function _ftello() {
  return _ftell.apply(null, arguments);
 }
 function _abort() {
  Module.abort();
 }
 function _fgets(s, n, stream) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (!streamObj) return 0;
  if (streamObj.error || streamObj.eof) return 0;
  for (var byte_, i = 0; n - 1 > i && 10 != byte_; i++) {
   if (byte_ = _fgetc(stream), -1 == byte_) {
    if (streamObj.error || streamObj.eof && 0 == i) return 0;
    if (streamObj.eof) break;
   }
   HEAP8[s + i >> 0] = byte_;
  }
  return HEAP8[s + i >> 0] = 0, s;
 }
 function _feof(stream) {
  return stream = FS.getStreamFromPtr(stream), Number(stream && stream.eof);
 }
 function _getc() {
  return _fgetc.apply(null, arguments);
 }
 function _time(ptr) {
  var ret = Date.now() / 1e3 | 0;
  return ptr && (HEAP32[ptr >> 2] = ret), ret;
 }
 function _getcwd(buf, size) {
  if (0 == size) return ___setErrNo(ERRNO_CODES.EINVAL), 0;
  var cwd = FS.cwd();
  return cwd.length + 1 > size ? (___setErrNo(ERRNO_CODES.ERANGE), 0) : (writeAsciiToMemory(cwd, buf), buf);
 }
 function _fseeko() {
  return _fseek.apply(null, arguments);
 }
 function _sysconf(name) {
  switch (name) {
  case 30:
   return PAGE_SIZE;

  case 85:
   return totalMemory / PAGE_SIZE;

  case 132:
  case 133:
  case 12:
  case 137:
  case 138:
  case 15:
  case 235:
  case 16:
  case 17:
  case 18:
  case 19:
  case 20:
  case 149:
  case 13:
  case 10:
  case 236:
  case 153:
  case 9:
  case 21:
  case 22:
  case 159:
  case 154:
  case 14:
  case 77:
  case 78:
  case 139:
  case 80:
  case 81:
  case 82:
  case 68:
  case 67:
  case 164:
  case 11:
  case 29:
  case 47:
  case 48:
  case 95:
  case 52:
  case 51:
  case 46:
   return 200809;

  case 79:
   return 0;

  case 27:
  case 246:
  case 127:
  case 128:
  case 23:
  case 24:
  case 160:
  case 161:
  case 181:
  case 182:
  case 242:
  case 183:
  case 184:
  case 243:
  case 244:
  case 245:
  case 165:
  case 178:
  case 179:
  case 49:
  case 50:
  case 168:
  case 169:
  case 175:
  case 170:
  case 171:
  case 172:
  case 97:
  case 76:
  case 32:
  case 173:
  case 35:
   return -1;

  case 176:
  case 177:
  case 7:
  case 155:
  case 8:
  case 157:
  case 125:
  case 126:
  case 92:
  case 93:
  case 129:
  case 130:
  case 131:
  case 94:
  case 91:
   return 1;

  case 74:
  case 60:
  case 69:
  case 70:
  case 4:
   return 1024;

  case 31:
  case 42:
  case 72:
   return 32;

  case 87:
  case 26:
  case 33:
   return 2147483647;

  case 34:
  case 1:
   return 47839;

  case 38:
  case 36:
   return 99;

  case 43:
  case 37:
   return 2048;

  case 0:
   return 2097152;

  case 3:
   return 65536;

  case 28:
   return 32768;

  case 44:
   return 32767;

  case 75:
   return 16384;

  case 39:
   return 1e3;

  case 89:
   return 700;

  case 71:
   return 256;

  case 40:
   return 255;

  case 2:
   return 100;

  case 180:
   return 64;

  case 25:
   return 20;

  case 5:
   return 16;

  case 6:
   return 6;

  case 73:
   return 4;

  case 84:
   return "object" == typeof navigator ? navigator.hardwareConcurrency || 1 : 1;
  }
  return ___setErrNo(ERRNO_CODES.EINVAL), -1;
 }
 function invoke_iiii(index, a1, a2, a3) {
  try {
   return Module.dynCall_iiii(index, a1, a2, a3);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_di(index, a1) {
  try {
   return Module.dynCall_di(index, a1);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_vi(index, a1) {
  try {
   Module.dynCall_vi(index, a1);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_vii(index, a1, a2) {
  try {
   Module.dynCall_vii(index, a1, a2);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_ii(index, a1) {
  try {
   return Module.dynCall_ii(index, a1);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_viii(index, a1, a2, a3) {
  try {
   Module.dynCall_viii(index, a1, a2, a3);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_v(index) {
  try {
   Module.dynCall_v(index);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_iiiii(index, a1, a2, a3, a4) {
  try {
   return Module.dynCall_iiiii(index, a1, a2, a3, a4);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function invoke_iii(index, a1, a2) {
  try {
   return Module.dynCall_iii(index, a1, a2);
  } catch (e) {
   if ("number" != typeof e && "longjmp" !== e) throw e;
   asm.setThrew(1, 0);
  }
 }
 function ExitStatus(status) {
  this.name = "ExitStatus", this.message = "Program terminated with exit(" + status + ")", this.status = status;
 }
 function run(args) {
  function doRun() {
   Module.calledRun || (Module.calledRun = !0, ABORT || (ensureInitRuntime(), preMain(), ENVIRONMENT_IS_WEB && null !== preloadStartTime && Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms"), Module.onRuntimeInitialized && Module.onRuntimeInitialized(), Module._main && shouldRunNow ? Module.callMain(args) : run = Module.callMain, postRun()));
  }
  args = args || Module.arguments, null === preloadStartTime && (preloadStartTime = Date.now()), runDependencies > 0 || (preRun(), runDependencies > 0 || Module.calledRun || (Module.setStatus ? (Module.setStatus("Running..."), setTimeout(function() {
   setTimeout(function() {
    Module.setStatus("");
   }, 1), doRun();
  }, 1)) : doRun()));
 }
 function exit(status, implicit) {
  if (!implicit || !Module.noExitRuntime) throw Module.noExitRuntime || (ABORT = !0, EXITSTATUS = status, STACKTOP = initialStackTop, exitRuntime(), Module.onExit && Module.onExit(status)), new ExitStatus(status);
 }
 function abort(what) {
  void 0 !== what ? (Module.print(what), Module.printErr(what), what = JSON.stringify(what)) : what = "", ABORT = !0, EXITSTATUS = 1;
  var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.", output = "abort(" + what + ") at " + stackTrace() + extra;
  throw abortDecorators && abortDecorators.forEach(function(decorator) {
   output = decorator(output, what);
  }), output;
 }
 global.dcraw = exports;
 var Module;
 Module || (Module = ("undefined" != typeof DCRawMod ? DCRawMod : null) || {});
 var moduleOverrides = {};
 for (var key in Module) Module.hasOwnProperty(key) && (moduleOverrides[key] = Module[key]);
 var ENVIRONMENT_IS_WEB = "object" == typeof window, ENVIRONMENT_IS_WORKER = "function" == typeof importScripts;
 if (!ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) throw "Unknown runtime environment. Where are we?";
 if ("undefined" != typeof arguments && (Module.arguments = arguments), global.d && "undefined" != typeof console) Module.print || (Module.print = function(x) {
  console.log(x);
 }), Module.printErr || (Module.printErr = function(x) {
  console.log(x);
 }); else {
  var TRY_USE_DUMP = !1;
  Module.print || (Module.print = TRY_USE_DUMP && "undefined" != typeof dump ? function(x) {
   dump(x);
  } : function(x) {});
 }
 ENVIRONMENT_IS_WORKER && (Module.load = importScripts), "undefined" == typeof Module.setWindowTitle && (Module.setWindowTitle = function(title) {
  document.title = title;
 }), (Module.load ? Module.read : 0) && (Module.load = function(f) {
  globalEval(0);
 }), Module.print || (Module.print = function() {}), Module.printErr || (Module.printErr = Module.print), Module.arguments || (Module.arguments = []), Module.thisProgram || (Module.thisProgram = "./dcraw"), Module.print = Module.print, Module.printErr = Module.printErr, Module.preRun = [], Module.postRun = [];
 for (var key in moduleOverrides) moduleOverrides.hasOwnProperty(key) && (Module[key] = moduleOverrides[key]);
 var Runtime = {
  setTempRet0: function(value) {
   tempRet0 = value;
  },
  getTempRet0: function() {
   return tempRet0;
  },
  stackSave: function() {
   return STACKTOP;
  },
  stackRestore: function(stackTop) {
   STACKTOP = stackTop;
  },
  getNativeTypeSize: function(type) {
   switch (type) {
   case "i1":
   case "i8":
    return 1;

   case "i16":
    return 2;

   case "i32":
    return 4;

   case "i64":
    return 8;

   case "float":
    return 4;

   case "double":
    return 8;

   default:
    if ("*" === type[type.length - 1]) return Runtime.QUANTUM_SIZE;
    if ("i" === type[0]) {
     var bits = parseInt(type.substr(1));
     return assert(bits % 8 === 0), bits / 8;
    }
    return 0;
   }
  },
  getNativeFieldSize: function(type) {
   return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function(ptr, type) {
   return "double" === type || "i64" === type ? 7 & ptr && (assert(4 === (7 & ptr)), ptr += 4) : assert(0 === (3 & ptr)), ptr;
  },
  getAlignSize: function(type, size, vararg) {
   return vararg || "i64" != type && "double" != type ? type ? Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE) : Math.min(size, 8) : 8;
  },
  dynCall: function(sig, ptr, args) {
   return args && args.length ? (args.splice || (args = Array.prototype.slice.call(args)), args.splice(0, 0, ptr), Module["dynCall_" + sig].apply(null, args)) : Module["dynCall_" + sig].call(null, ptr);
  },
  functionPointers: [],
  addFunction: function(func) {
   for (var i = 0; Runtime.functionPointers.length > i; i++) if (!Runtime.functionPointers[i]) return Runtime.functionPointers[i] = func, 2 * (1 + i);
   throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.";
  },
  removeFunction: function(index) {
   Runtime.functionPointers[(index - 2) / 2] = null;
  },
  warnOnce: function(text) {
   Runtime.warnOnce.shown || (Runtime.warnOnce.shown = {}), Runtime.warnOnce.shown[text] || (Runtime.warnOnce.shown[text] = 1, Module.printErr(text));
  },
  funcWrappers: {},
  getFuncWrapper: function(func, sig) {
   assert(sig), Runtime.funcWrappers[sig] || (Runtime.funcWrappers[sig] = {});
   var sigCache = Runtime.funcWrappers[sig];
   return sigCache[func] || (sigCache[func] = function() {
    return Runtime.dynCall(sig, func, arguments);
   }), sigCache[func];
  },
  K: 0,
  stackAlloc: function(size) {
   var ret = STACKTOP;
   return STACKTOP = STACKTOP + size | 0, STACKTOP = STACKTOP + 15 & -16, ret;
  },
  staticAlloc: function(size) {
   var ret = STATICTOP;
   return STATICTOP = STATICTOP + size | 0, STATICTOP = STATICTOP + 15 & -16, ret;
  },
  dynamicAlloc: function(size) {
   var ret = DYNAMICTOP;
   if (DYNAMICTOP = DYNAMICTOP + size | 0, DYNAMICTOP = DYNAMICTOP + 15 & -16, DYNAMICTOP >= TOTAL_MEMORY) {
    var success = enlargeMemory();
    if (!success) return DYNAMICTOP = ret, 0;
   }
   return ret;
  },
  alignMemory: function(size, quantum) {
   var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
   return ret;
  },
  makeBigInt: function(low, high, unsigned) {
   var ret = unsigned ? +(low >>> 0) + 4294967296 * +(high >>> 0) : +(low >>> 0) + 4294967296 * +(0 | high);
   return ret;
  },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
 };
 Module.Runtime = Runtime;
 var tempDouble, tempI64, tempRet0, cwrap, ccall, ABORT = !1, EXITSTATUS = 0;
 !function() {
  var JSfuncs = {
   stackSave: function() {
    Runtime.stackSave();
   },
   stackRestore: function() {
    Runtime.stackRestore();
   },
   arrayToC: function(arr) {
    var ret = Runtime.stackAlloc(arr.length);
    return writeArrayToMemory(arr, ret), ret;
   },
   stringToC: function(str) {
    var ret = 0;
    return null !== str && void 0 !== str && 0 !== str && (ret = Runtime.stackAlloc((str.length << 2) + 1), writeStringToMemory(str, ret)), ret;
   }
  }, toC = {
   string: JSfuncs.stringToC,
   array: JSfuncs.arrayToC
  };
  ccall = function(ident, returnType, argTypes, args, opts) {
   var func = getCFunc(ident), cArgs = [], stack = 0;
   if (args) for (var i = 0; args.length > i; i++) {
    var converter = toC[argTypes[i]];
    converter ? (0 === stack && (stack = Runtime.stackSave()), cArgs[i] = converter(args[i])) : cArgs[i] = args[i];
   }
   var ret = func.apply(null, cArgs);
   if ("string" === returnType && (ret = Pointer_stringify(ret)), 0 !== stack) {
    if (opts && opts.async) return void EmterpreterAsync.asyncFinalizers.push(function() {
     Runtime.stackRestore(stack);
    });
    Runtime.stackRestore(stack);
   }
   return ret;
  }, cwrap = function(ident, returnType, argTypes) {
   return function() {
    return ccall(ident, returnType, argTypes, arguments);
   };
  };
 }(), Module.cwrap = cwrap, Module.ccall = ccall, Module.setValue = setValue, Module.getValue = getValue;
 var ALLOC_NORMAL = 0, ALLOC_STACK = 1, ALLOC_STATIC = 2, ALLOC_DYNAMIC = 3, ALLOC_NONE = 4;
 Module.ALLOC_NORMAL = ALLOC_NORMAL, Module.ALLOC_STACK = ALLOC_STACK, Module.ALLOC_STATIC = ALLOC_STATIC, Module.ALLOC_DYNAMIC = ALLOC_DYNAMIC, Module.ALLOC_NONE = ALLOC_NONE, Module.allocate = allocate, Module.getMemory = getMemory, Module.Pointer_stringify = Pointer_stringify, Module.AsciiToString = AsciiToString, Module.stringToAscii = stringToAscii, Module.UTF8ArrayToString = UTF8ArrayToString, Module.UTF8ToString = UTF8ToString, Module.stringToUTF8Array = stringToUTF8Array, Module.stringToUTF8 = stringToUTF8, Module.lengthBytesUTF8 = lengthBytesUTF8, Module.UTF16ToString = UTF16ToString, Module.stringToUTF16 = stringToUTF16, Module.lengthBytesUTF16 = lengthBytesUTF16, Module.UTF32ToString = UTF32ToString, Module.stringToUTF32 = stringToUTF32, Module.lengthBytesUTF32 = lengthBytesUTF32;
 Module.stackTrace = stackTrace;
 var HEAP, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64, byteLength, PAGE_SIZE = 4096, STATIC_BASE = 0, STATICTOP = 0, staticSealed = !1, STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0, DYNAMIC_BASE = 0, DYNAMICTOP = 0;
 byteLength = function(buffer) {
  return buffer.byteLength;
 };
 for (var TOTAL_STACK = Module.TOTAL_STACK || 5242880, TOTAL_MEMORY = Module.TOTAL_MEMORY || 16777216, totalMemory = 65536; TOTAL_MEMORY > totalMemory || 2 * TOTAL_STACK > totalMemory; ) 16777216 > totalMemory ? totalMemory *= 2 : totalMemory += 16777216;
 totalMemory = Math.max(totalMemory, 16777216), totalMemory !== TOTAL_MEMORY && (Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec (and given that TOTAL_STACK=" + TOTAL_STACK + ")"), TOTAL_MEMORY = totalMemory), assert("undefined" != typeof Int32Array && "undefined" != typeof Float64Array && !!new Int32Array(1).subarray && !!new Int32Array(1).set, "JS engine does not provide full typed array support");
 var buffer;
 buffer = new ArrayBuffer(TOTAL_MEMORY), HEAP8 = new Int8Array(buffer), HEAP16 = new Int16Array(buffer), HEAP32 = new Int32Array(buffer), HEAPU8 = new Uint8Array(buffer), HEAPU16 = new Uint16Array(buffer), HEAPU32 = new Uint32Array(buffer), HEAPF32 = new Float32Array(buffer), HEAPF64 = new Float64Array(buffer), HEAP32[0] = 255, assert(255 === HEAPU8[0] && 0 === HEAPU8[3], "Typed arrays 2 must be run on a little-endian system"), Module.HEAP = HEAP, Module.buffer = buffer, Module.HEAP8 = HEAP8, Module.HEAP16 = HEAP16, Module.HEAP32 = HEAP32, Module.HEAPU8 = HEAPU8, Module.HEAPU16 = HEAPU16, Module.HEAPU32 = HEAPU32, Module.HEAPF32 = HEAPF32, Module.HEAPF64 = HEAPF64;
 var __ATPRERUN__ = [], __ATINIT__ = [], __ATMAIN__ = [], __ATEXIT__ = [], __ATPOSTRUN__ = [], runtimeInitialized = !1, runtimeExited = !1;
 Module.addOnPreRun = Module.addOnPreRun = addOnPreRun, Module.addOnInit = Module.addOnInit = addOnInit, Module.addOnPreMain = Module.addOnPreMain = addOnPreMain, Module.addOnExit = Module.addOnExit = addOnExit, Module.addOnPostRun = Module.addOnPostRun = addOnPostRun, Module.intArrayFromString = intArrayFromString, Module.intArrayToString = intArrayToString, Module.writeStringToMemory = writeStringToMemory, Module.writeArrayToMemory = writeArrayToMemory, Module.writeAsciiToMemory = writeAsciiToMemory, Math.imul && -5 === Math.imul(4294967295, 5) || (Math.imul = function(a, b) {
  var ah = a >>> 16, al = 65535 & a, bh = b >>> 16, bl = 65535 & b;
  return al * bl + (ah * bl + al * bh << 16) | 0;
 }), Math.imul = Math.imul, Math.clz32 || (Math.clz32 = function(x) {
  x >>>= 0;
  for (var i = 0; 32 > i; i++) if (x & 1 << 31 - i) return i;
  return 32;
 }), Math.clz32 = Math.clz32;
 var Math_abs = Math.abs, Math_cos = Math.cos, Math_exp = (Math.sin, Math.tan, Math.acos, Math.asin, Math.atan, Math.atan2, Math.exp), Math_log = Math.log, Math_sqrt = Math.sqrt, Math_ceil = Math.ceil, Math_floor = Math.floor, Math_pow = Math.pow, Math_min = (Math.imul, Math.fround, Math.min), runDependencies = (Math.clz32, 0), dependenciesFulfilled = null;
 STATIC_BASE = 8, STATICTOP = STATIC_BASE + 630752, __ATINIT__.push(), allocate([ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 205, 204, 204, 204, 204, 204, 220, 63, 0, 0, 0, 0, 0, 0, 18, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 13, 198, 136, 68, 161, 101, 218, 63, 24, 9, 109, 57, 151, 226, 214, 63, 88, 29, 57, 210, 25, 24, 199, 63, 246, 95, 231, 166, 205, 56, 203, 63, 24, 9, 109, 57, 151, 226, 230, 63, 85, 247, 200, 230, 170, 121, 178, 63, 75, 175, 205, 198, 74, 204, 147, 63, 56, 129, 233, 180, 110, 131, 190, 63, 145, 214, 24, 116, 66, 104, 238, 63, 22, 81, 115, 63, 0, 0, 128, 63, 75, 92, 139, 63 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE), allocate([ 2, 1, 1, 3, 2, 3, 2, 0, 3, 2, 3, 0, 1, 2, 1, 0, 0, 3, 0, 2, 0, 1, 3, 1, 0, 1, 1, 2, 0, 3, 3, 2, 2, 3, 3, 2, 3, 1, 1, 3, 3, 1, 2, 1, 2, 0, 0, 3, 0, 1, 0, 1, 0, 2, 0, 2, 2, 0, 3, 0, 1, 3, 2, 1, 3, 1, 1, 2, 0, 1, 0, 2, 1, 3, 1, 3, 0, 1, 3, 0, 2, 0, 0, 3, 3, 2, 3, 1, 2, 0, 2, 0, 3, 2, 2, 1, 2, 3, 3, 1, 2, 1, 2, 1, 2, 1, 1, 2, 3, 0, 0, 1, 1, 0, 0, 2, 3, 0, 0, 3, 0, 3, 0, 3, 2, 1, 2, 3, 2, 3, 3, 1, 1, 2, 1, 0, 3, 2, 3, 0, 2, 3, 1, 3, 1, 0, 2, 0, 3, 0, 3, 2, 0, 1, 1, 2, 0, 1, 0, 2, 0, 1, 1, 3, 3, 2, 2, 1, 1, 3, 3, 0, 2, 1, 3, 2, 2, 3, 2, 0, 0, 1, 3, 0, 2, 0, 1, 2, 3, 0, 1, 0, 1, 3, 1, 2, 3, 2, 3, 2, 0, 2, 0, 1, 1, 0, 3, 0, 0, 2, 0, 3, 1, 0, 0, 1, 1, 3, 3, 2, 3, 2, 2, 1, 2, 1, 3, 2, 3, 1, 2, 1, 0, 3, 0, 2, 0, 2, 0, 2, 0, 3, 1, 0, 0, 2, 0, 3, 2, 1, 3, 1, 1, 3, 1, 3, 37, 115, 58, 32, 79, 117, 116, 32, 111, 102, 32, 109, 101, 109, 111, 114, 121, 32, 105, 110, 32, 37, 115, 10, 0, 0, 0, 0, 0, 0, 0, 0, 37, 115, 58, 32, 0, 0, 0, 0, 85, 110, 101, 120, 112, 101, 99, 116, 101, 100, 32, 101, 110, 100, 32, 111, 102, 32, 102, 105, 108, 101, 10, 0, 67, 111, 114, 114, 117, 112, 116, 32, 100, 97, 116, 97, 32, 110, 101, 97, 114, 32, 48, 120, 37, 108, 108, 120, 10, 0, 0, 0, 0, 0, 0, 0, 155, 2, 102, 1, 141, 1, 53, 2, 196, 1, 219, 2, 134, 1, 111, 1, 243, 1, 5, 2, 95, 4, 140, 1, 92, 1, 192, 1, 25, 2, 119, 5, 229, 1, 175, 1, 252, 1, 176, 2, 66, 255, 190, 2, 170, 248, 86, 9, 69, 7, 187, 250, 137, 3, 119, 254, 80, 254, 176, 3, 57, 10, 199, 247, 77, 251, 179, 6, 144, 251, 112, 6, 108, 5, 148, 252, 11, 1, 245, 0, 151, 249, 105, 8, 81, 15, 175, 242, 153, 253, 103, 4, 229, 249, 27, 8, 157, 5, 99, 252, 253, 1, 3, 0, 12, 253, 244, 4, 215, 9, 41, 248, 66, 255, 190, 2, 162, 248, 94, 9, 105, 8, 151, 249, 251, 2, 5, 255, 60, 254, 196, 3, 224, 11, 32, 246, 66, 255, 190, 2, 170, 248, 86, 9, 69, 7, 187, 250, 137, 3, 119, 254, 80, 254, 176, 3, 57, 10, 199, 247, 217, 252, 39, 5, 7, 249, 249, 8, 108, 5, 148, 252, 1, 3, 255, 254, 26, 255, 230, 2, 19, 8, 237, 249, 117, 4, 121, 4, 104, 4, 85, 4, 154, 4, 125, 4, 104, 4, 85, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 97, 107, 101, 95, 100, 101, 99, 111, 100, 101, 114, 40, 41, 0, 0, 0, 1, 4, 2, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 3, 5, 6, 2, 7, 1, 8, 9, 0, 10, 11, 255, 0, 2, 2, 3, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 3, 2, 4, 1, 5, 0, 6, 7, 9, 8, 10, 11, 255, 0, 0, 6, 3, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 5, 7, 4, 8, 3, 9, 2, 0, 10, 1, 11, 255, 0, 0, 2, 2, 2, 1, 4, 2, 1, 2, 5, 1, 1, 0, 0, 0, 139, 3, 4, 2, 5, 1, 6, 7, 8, 18, 19, 17, 20, 9, 21, 34, 0, 33, 22, 10, 240, 35, 23, 36, 49, 50, 24, 25, 51, 37, 65, 52, 66, 53, 81, 54, 55, 56, 41, 121, 38, 26, 57, 86, 87, 40, 39, 82, 85, 88, 67, 118, 89, 119, 84, 97, 249, 113, 120, 117, 150, 151, 73, 183, 83, 215, 116, 182, 152, 71, 72, 149, 105, 153, 145, 250, 184, 104, 181, 185, 214, 247, 216, 103, 70, 69, 148, 137, 248, 129, 213, 246, 180, 136, 177, 42, 68, 114, 217, 135, 102, 212, 245, 58, 167, 115, 169, 168, 134, 98, 199, 101, 200, 201, 161, 244, 209, 233, 90, 146, 133, 166, 231, 147, 232, 193, 198, 122, 100, 225, 74, 106, 230, 179, 241, 211, 165, 138, 178, 154, 186, 132, 164, 99, 229, 197, 243, 210, 196, 130, 170, 218, 228, 242, 202, 131, 163, 162, 195, 234, 194, 226, 227, 255, 255, 0, 2, 2, 1, 4, 1, 4, 1, 3, 3, 1, 0, 0, 0, 0, 140, 2, 3, 1, 4, 5, 18, 17, 6, 19, 7, 8, 20, 34, 9, 33, 0, 35, 21, 49, 50, 10, 22, 240, 36, 51, 65, 66, 25, 23, 37, 24, 81, 52, 67, 82, 41, 53, 97, 57, 113, 98, 54, 83, 38, 56, 26, 55, 129, 39, 145, 121, 85, 69, 40, 114, 89, 161, 177, 68, 105, 84, 88, 209, 250, 87, 225, 241, 185, 73, 71, 99, 106, 249, 86, 70, 168, 42, 74, 120, 153, 58, 117, 116, 134, 101, 193, 118, 182, 150, 214, 137, 133, 201, 245, 149, 180, 199, 247, 138, 151, 184, 115, 183, 216, 217, 135, 167, 122, 72, 130, 132, 234, 244, 166, 197, 90, 148, 164, 198, 146, 195, 104, 181, 200, 228, 229, 230, 233, 162, 163, 227, 194, 102, 103, 147, 170, 212, 213, 231, 248, 136, 154, 215, 119, 196, 100, 226, 152, 165, 202, 218, 232, 243, 246, 169, 178, 179, 242, 210, 131, 186, 211, 255, 255, 0, 0, 6, 2, 1, 3, 3, 2, 5, 1, 2, 2, 8, 10, 0, 117, 4, 5, 3, 6, 2, 7, 1, 8, 9, 18, 19, 20, 17, 21, 10, 22, 23, 240, 0, 34, 33, 24, 35, 25, 36, 50, 49, 37, 51, 56, 55, 52, 53, 54, 57, 121, 87, 88, 89, 40, 86, 120, 39, 65, 41, 119, 38, 66, 118, 153, 26, 85, 152, 151, 249, 72, 84, 150, 137, 71, 183, 73, 250, 117, 104, 182, 103, 105, 185, 184, 216, 82, 215, 136, 181, 116, 81, 70, 217, 248, 58, 214, 135, 69, 122, 149, 213, 246, 134, 180, 169, 148, 83, 42, 168, 67, 245, 247, 212, 102, 167, 90, 68, 138, 201, 232, 200, 231, 154, 106, 115, 74, 97, 199, 244, 198, 101, 233, 114, 230, 113, 145, 147, 166, 218, 146, 133, 98, 243, 197, 178, 164, 132, 186, 100, 165, 179, 210, 129, 229, 211, 170, 196, 202, 242, 177, 228, 209, 131, 99, 234, 195, 226, 130, 241, 163, 194, 161, 193, 227, 162, 225, 255, 255, 0, 0, 0, 0, 108, 106, 112, 101, 103, 95, 115, 116, 97, 114, 116, 40, 41, 0, 0, 0, 37, 100, 46, 37, 100, 46, 37, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 112, 97, 99, 107, 101, 100, 95, 100, 110, 103, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 5, 4, 3, 6, 2, 7, 1, 0, 8, 9, 11, 10, 12, 0, 0, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 57, 90, 56, 39, 22, 5, 4, 3, 2, 1, 0, 11, 12, 12, 0, 0, 0, 1, 4, 2, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10, 11, 12, 0, 0, 0, 0, 1, 4, 3, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 5, 6, 4, 7, 8, 3, 9, 2, 1, 0, 10, 11, 12, 13, 14, 0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 8, 92, 75, 58, 41, 7, 6, 5, 4, 3, 2, 1, 0, 13, 14, 0, 0, 1, 4, 2, 2, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 7, 6, 8, 5, 9, 4, 10, 3, 11, 12, 2, 0, 1, 13, 14, 0, 0, 85, 170, 255, 0, 0, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 0, 0, 0, 0, 0, 0, 79, 112, 116, 105, 111, 32, 51, 51, 87, 82, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 0, 0, 69, 51, 50, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 0, 0, 0, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 0, 0, 69, 51, 55, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 51, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 0, 0, 0, 0, 0, 67, 55, 52, 48, 85, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 112, 109, 95, 116, 104, 117, 109, 98, 40, 41, 0, 0, 0, 0, 0, 80, 54, 10, 37, 100, 32, 37, 100, 10, 50, 53, 53, 10, 0, 0, 0, 112, 112, 109, 49, 54, 95, 116, 104, 117, 109, 98, 40, 41, 0, 0, 0, 108, 97, 121, 101, 114, 95, 116, 104, 117, 109, 98, 40, 41, 0, 0, 0, 80, 37, 100, 10, 37, 100, 32, 37, 100, 10, 50, 53, 53, 10, 0, 0, 48, 49, 50, 0, 49, 48, 50, 0, 114, 111, 108, 108, 101, 105, 95, 116, 104, 117, 109, 98, 40, 41, 0, 0, 112, 104, 97, 115, 101, 95, 111, 110, 101, 95, 102, 108, 97, 116, 95, 102, 105, 101, 108, 100, 40, 41, 0, 0, 255, 255, 255, 1, 1, 255, 1, 1, 254, 0, 0, 254, 0, 2, 2, 0, 254, 254, 254, 2, 2, 254, 2, 2, 112, 104, 97, 115, 101, 95, 111, 110, 101, 95, 99, 111, 114, 114, 101, 99, 116, 40, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 104, 97, 115, 101, 95, 111, 110, 101, 95, 108, 111, 97, 100, 95, 114, 97, 119, 95, 99, 40, 41, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 6, 0, 0, 0, 9, 0, 0, 0, 11, 0, 0, 0, 10, 0, 0, 0, 5, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0, 0, 13, 0, 0, 0, 104, 97, 115, 115, 101, 108, 98, 108, 97, 100, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 108, 101, 97, 102, 95, 104, 100, 114, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 0, 115, 105, 110, 97, 114, 95, 52, 115, 104, 111, 116, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 110, 111, 107, 105, 97, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 0, 0, 0, 0, 79, 109, 110, 105, 86, 105, 115, 105, 111, 110 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 297856), 
 allocate([ 167, 255, 196, 255, 212, 255, 224, 255, 234, 255, 241, 255, 248, 255, 254, 255, 2, 0, 8, 0, 15, 0, 22, 0, 32, 0, 44, 0, 60, 0, 89, 0, 253, 255, 255, 255, 1, 0, 3, 0, 251, 255, 255, 255, 1, 0, 5, 0, 248, 255, 254, 255, 2, 0, 8, 0, 243, 255, 253, 255, 3, 0, 13, 0, 237, 255, 252, 255, 4, 0, 19, 0, 228, 255, 250, 255, 6, 0, 28, 0, 0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 8, 0, 9, 0, 11, 0, 12, 0, 13, 0, 14, 0, 15, 0, 16, 0, 17, 0, 18, 0, 19, 0, 20, 0, 21, 0, 22, 0, 23, 0, 24, 0, 25, 0, 26, 0, 27, 0, 28, 0, 29, 0, 30, 0, 32, 0, 33, 0, 34, 0, 35, 0, 36, 0, 37, 0, 38, 0, 39, 0, 40, 0, 41, 0, 42, 0, 43, 0, 44, 0, 45, 0, 46, 0, 47, 0, 48, 0, 49, 0, 50, 0, 51, 0, 53, 0, 54, 0, 55, 0, 56, 0, 57, 0, 58, 0, 59, 0, 60, 0, 61, 0, 62, 0, 63, 0, 64, 0, 65, 0, 66, 0, 67, 0, 68, 0, 69, 0, 70, 0, 71, 0, 72, 0, 74, 0, 75, 0, 76, 0, 77, 0, 78, 0, 79, 0, 80, 0, 81, 0, 82, 0, 83, 0, 84, 0, 86, 0, 88, 0, 90, 0, 92, 0, 94, 0, 97, 0, 99, 0, 101, 0, 103, 0, 105, 0, 107, 0, 110, 0, 112, 0, 114, 0, 116, 0, 118, 0, 120, 0, 123, 0, 125, 0, 127, 0, 129, 0, 131, 0, 134, 0, 136, 0, 138, 0, 140, 0, 142, 0, 144, 0, 147, 0, 149, 0, 151, 0, 153, 0, 155, 0, 158, 0, 160, 0, 162, 0, 164, 0, 166, 0, 168, 0, 171, 0, 173, 0, 175, 0, 177, 0, 179, 0, 181, 0, 184, 0, 186, 0, 188, 0, 190, 0, 192, 0, 195, 0, 197, 0, 199, 0, 201, 0, 203, 0, 205, 0, 208, 0, 210, 0, 212, 0, 214, 0, 216, 0, 218, 0, 221, 0, 223, 0, 226, 0, 230, 0, 235, 0, 239, 0, 244, 0, 248, 0, 252, 0, 1, 1, 5, 1, 9, 1, 14, 1, 18, 1, 22, 1, 27, 1, 31, 1, 35, 1, 40, 1, 44, 1, 49, 1, 53, 1, 57, 1, 62, 1, 66, 1, 70, 1, 75, 1, 79, 1, 83, 1, 88, 1, 92, 1, 96, 1, 101, 1, 105, 1, 109, 1, 114, 1, 118, 1, 123, 1, 127, 1, 131, 1, 136, 1, 140, 1, 144, 1, 149, 1, 153, 1, 157, 1, 162, 1, 166, 1, 170, 1, 175, 1, 179, 1, 184, 1, 188, 1, 192, 1, 197, 1, 201, 1, 205, 1, 210, 1, 214, 1, 218, 1, 223, 1, 227, 1, 231, 1, 236, 1, 240, 1, 244, 1, 252, 1, 7, 2, 19, 2, 30, 2, 41, 2, 52, 2, 63, 2, 75, 2, 86, 2, 97, 2, 108, 2, 119, 2, 131, 2, 142, 2, 153, 2, 164, 2, 175, 2, 186, 2, 198, 2, 209, 2, 220, 2, 231, 2, 242, 2, 254, 2, 9, 3, 20, 3, 31, 3, 42, 3, 54, 3, 65, 3, 76, 3, 87, 3, 98, 3, 110, 3, 121, 3, 132, 3, 143, 3, 154, 3, 165, 3, 177, 3, 188, 3, 199, 3, 210, 3, 221, 3, 233, 3, 244, 3, 255, 3, 16, 0, 16, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 5, 64, 5, 16, 9, 32, 14, 0, 13, 64, 31, 255, 15, 255, 63, 255, 255, 255, 63, 1, 1, 2, 3, 3, 4, 4, 2, 5, 7, 6, 5, 7, 6, 7, 8, 1, 0, 2, 1, 3, 3, 4, 4, 5, 2, 6, 7, 7, 6, 8, 5, 8, 8, 2, 1, 2, 3, 3, 0, 3, 2, 3, 4, 4, 6, 5, 5, 6, 7, 6, 8, 2, 0, 2, 1, 2, 3, 3, 2, 4, 4, 5, 6, 6, 7, 7, 5, 7, 8, 2, 1, 2, 4, 3, 0, 3, 2, 3, 3, 4, 7, 5, 5, 6, 6, 6, 8, 2, 3, 3, 1, 3, 2, 3, 4, 3, 5, 3, 6, 4, 7, 5, 0, 5, 8, 2, 3, 2, 6, 3, 0, 3, 1, 4, 4, 4, 5, 4, 7, 5, 2, 5, 8, 2, 4, 2, 7, 3, 3, 3, 6, 4, 1, 4, 2, 4, 5, 5, 0, 5, 8, 2, 6, 3, 1, 3, 3, 3, 5, 3, 7, 3, 8, 4, 0, 5, 2, 5, 4, 2, 0, 2, 1, 3, 2, 3, 3, 4, 4, 4, 5, 5, 6, 5, 7, 4, 8, 1, 0, 2, 2, 2, 254, 1, 253, 1, 3, 2, 239, 2, 251, 2, 5, 2, 17, 2, 249, 2, 2, 2, 9, 2, 18, 2, 238, 2, 247, 2, 254, 2, 7, 2, 228, 2, 28, 3, 207, 3, 247, 3, 9, 4, 49, 5, 177, 5, 79, 2, 255, 2, 13, 2, 26, 3, 39, 4, 240, 5, 55, 6, 219, 6, 76, 2, 230, 2, 243, 2, 1, 3, 217, 4, 16, 5, 201, 6, 180, 6, 37, 0, 0, 0, 0, 162, 0, 0, 0, 192, 0, 0, 0, 187, 0, 0, 0, 92, 0, 0, 0, 0, 0, 0, 0, 124, 2, 0, 0, 168, 1, 0, 0, 212, 0, 0, 0, 101, 105, 103, 104, 116, 95, 98, 105, 116, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 107, 111, 100, 97, 107, 95, 99, 51, 51, 48, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 107, 111, 100, 97, 107, 95, 99, 54, 48, 51, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 1, 5, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 3, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 107, 111, 100, 97, 107, 95, 50, 54, 50, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 15, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 3, 0, 3, 2, 2, 1, 2, 0, 0, 0, 0, 115, 111, 110, 121, 95, 97, 114, 119, 50, 95, 108, 111, 97, 100, 95, 114, 97, 119, 40, 41, 0, 0, 0, 0, 4, 3, 7, 3, 6, 2, 5, 2, 3, 4, 0, 6, 9, 7, 10, 8, 11, 9, 12, 10, 13, 10, 1, 5, 8, 4, 2, 4, 0, 0, 0, 0, 50, 48, 52, 0, 0, 0, 0, 0, 48, 50, 50, 52, 52, 54, 56, 0, 48, 50, 52, 52, 54, 54, 56, 0, 49, 50, 48, 0, 0, 0, 0, 0, 7, 7, 0, 0, 63, 55, 47, 39, 31, 23, 15, 7, 0, 7, 7, 0, 0, 63, 55, 47, 39, 31, 23, 15, 7, 0, 3, 3, 0, 0, 63, 47, 31, 15 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 316728), allocate([ 37, 115, 58, 32, 100, 101, 99, 111, 100, 101, 114, 32, 116, 97, 98, 108, 101, 32, 111, 118, 101, 114, 102, 108, 111, 119, 10, 0, 0, 0, 0, 0, 102, 111, 118, 101, 111, 110, 95, 116, 104, 117, 109, 98, 40, 41, 0, 0, 102, 111, 118, 101, 111, 110, 95, 108, 111, 97, 100, 95, 99, 97, 109, 102, 40, 41, 0, 0, 0, 0, 0, 0, 37, 115, 32, 104, 97, 115, 32, 117, 110, 107, 110, 111, 119, 110, 32, 67, 65, 77, 70, 32, 116, 121, 112, 101, 32, 37, 100, 46, 10, 0, 0, 0, 67, 77, 98, 0, 0, 0, 0, 0, 102, 111, 118, 101, 111, 110, 95, 99, 97, 109, 102, 95, 109, 97, 116, 114, 105, 120, 40, 41, 0, 0, 0, 0, 37, 115, 58, 32, 34, 37, 115, 34, 32, 109, 97, 116, 114, 105, 120, 32, 110, 111, 116, 32, 102, 111, 117, 110, 100, 33, 10, 0, 0, 0, 0, 0, 102, 111, 118, 101, 111, 110, 95, 109, 97, 107, 101, 95, 99, 117, 114, 118, 101, 40, 41, 0, 0, 0, 0, 0, 68, 97, 114, 107, 83, 104, 105, 101, 108, 100, 67, 111, 108, 82, 97, 110, 103, 101, 0, 0, 0, 0, 0, 0, 80, 111, 115, 116, 80, 111, 108, 121, 77, 97, 116, 114, 105, 120, 0, 0, 83, 97, 116, 117, 114, 97, 116, 105, 111, 110, 76, 101, 118, 101, 108, 0, 75, 101, 101, 112, 73, 109, 97, 103, 101, 65, 114, 101, 97, 0, 0, 0, 65, 99, 116, 105, 118, 101, 73, 109, 97, 103, 101, 65, 114, 101, 97, 0, 67, 104, 114, 111, 109, 97, 68, 81, 0, 0, 0, 0, 0, 0, 0, 0, 73, 110, 99, 108, 117, 100, 101, 66, 108, 111, 99, 107, 115, 0, 0, 0, 67, 111, 108, 111, 114, 68, 81, 0, 67, 111, 108, 111, 114, 68, 81, 67, 97, 109, 82, 71, 66, 0, 0, 0, 67, 111, 108, 117, 109, 110, 70, 105, 108, 116, 101, 114, 0, 0, 0, 0, 68, 97, 114, 107, 68, 114, 105, 102, 116, 0, 0, 0, 0, 0, 0, 0, 68, 97, 114, 107, 83, 104, 105, 101, 108, 100, 66, 111, 116, 116, 111, 109, 0, 0, 0, 0, 0, 0, 0, 0, 68, 97, 114, 107, 83, 104, 105, 101, 108, 100, 84, 111, 112, 0, 0, 0, 87, 104, 105, 116, 101, 66, 97, 108, 97, 110, 99, 101, 73, 108, 108, 117, 109, 105, 110, 97, 110, 116, 115, 0, 37, 115, 58, 32, 73, 110, 118, 97, 108, 105, 100, 32, 119, 104, 105, 116, 101, 32, 98, 97, 108, 97, 110, 99, 101, 32, 34, 37, 115, 34, 10, 0, 87, 104, 105, 116, 101, 66, 97, 108, 97, 110, 99, 101, 67, 111, 114, 114, 101, 99, 116, 105, 111, 110, 115, 0, 37, 115, 82, 71, 66, 78, 101, 117, 116, 114, 97, 108, 0, 0, 0, 0, 83, 112, 97, 116, 105, 97, 108, 71, 97, 105, 110, 0, 0, 0, 0, 0, 66, 97, 100, 80, 105, 120, 101, 108, 115, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 255, 255, 1, 0, 0, 0, 255, 255, 0, 0, 1, 0, 1, 0, 255, 255, 1, 0, 0, 0, 1, 0, 1, 0, 102, 111, 118, 101, 111, 110, 95, 105, 110, 116, 101, 114, 112, 111, 108, 97, 116, 101, 40, 41, 0, 0, 0, 0, 68, 67, 50, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 47, 46, 98, 97, 100, 112, 105, 120, 101, 108, 115, 0, 0, 0, 0, 0, 37, 100, 32, 37, 100, 32, 37, 100, 0, 0, 0, 0, 0, 0, 0, 0, 114, 98, 0, 0, 0, 0, 0, 0, 37, 115, 32, 105, 115, 32, 110, 111, 116, 32, 97, 32, 118, 97, 108, 105, 100, 32, 80, 71, 77, 32, 102, 105, 108, 101, 33, 10, 0, 0, 0, 0, 37, 115, 32, 104, 97, 115, 32, 116, 104, 101, 32, 119, 114, 111, 110, 103, 32, 100, 105, 109, 101, 110, 115, 105, 111, 110, 115, 33, 10, 0, 0, 0, 115, 117, 98, 116, 114, 97, 99, 116, 40, 41, 0, 0, 0, 0, 0, 0, 119, 97, 118, 101, 108, 101, 116, 95, 100, 101, 110, 111, 105, 115, 101, 40, 41, 0, 0, 0, 0, 0, 0, 0, 232, 217, 76, 63, 49, 8, 140, 62, 107, 43, 246, 61, 178, 157, 111, 61, 32, 99, 238, 60, 108, 9, 121, 60, 111, 18, 3, 60, 224, 45, 144, 59, 37, 115, 58, 32, 67, 97, 110, 110, 111, 116, 32, 117, 115, 101, 32, 99, 97, 109, 101, 114, 97, 32, 119, 104, 105, 116, 101, 32, 98, 97, 108, 97, 110, 99, 101, 46, 10, 0, 0, 0, 115, 99, 97, 108, 101, 95, 99, 111, 108, 111, 114, 115, 40, 41, 0, 0, 112, 114, 101, 95, 105, 110, 116, 101, 114, 112, 111, 108, 97, 116, 101, 40, 41, 0, 0, 0, 0, 0, 0, 0, 118, 110, 103, 95, 105, 110, 116, 101, 114, 112, 111, 108, 97, 116, 101, 40, 41, 0, 0, 0, 0, 0, 0, 0, 254, 254, 0, 255, 0, 1, 254, 254, 0, 0, 1, 1, 254, 255, 255, 0, 0, 1, 254, 255, 0, 255, 0, 2, 254, 255, 0, 0, 0, 3, 254, 255, 0, 1, 1, 1, 254, 0, 0, 255, 0, 6, 254, 0, 0, 0, 1, 2, 254, 0, 0, 1, 0, 3, 254, 1, 255, 0, 0, 4, 254, 1, 0, 255, 1, 4, 254, 1, 0, 0, 0, 6, 254, 1, 0, 1, 0, 2, 254, 2, 0, 0, 1, 4, 254, 2, 0, 1, 0, 4, 255, 254, 255, 0, 0, 128, 255, 254, 0, 255, 0, 1, 255, 254, 1, 255, 0, 1, 255, 254, 1, 0, 1, 1, 255, 255, 255, 1, 0, 136, 255, 255, 1, 254, 0, 64, 255, 255, 1, 255, 0, 34, 255, 255, 1, 0, 0, 51, 255, 255, 1, 1, 1, 17, 255, 0, 255, 2, 0, 8, 255, 0, 0, 255, 0, 68, 255, 0, 0, 1, 0, 17, 255, 0, 1, 254, 1, 64, 255, 0, 1, 255, 0, 102, 255, 0, 1, 0, 1, 34, 255, 0, 1, 1, 0, 51, 255, 0, 1, 2, 1, 16, 255, 1, 1, 255, 1, 68, 255, 1, 1, 0, 0, 102, 255, 1, 1, 1, 0, 34, 255, 1, 1, 2, 0, 16, 255, 2, 0, 1, 0, 4, 255, 2, 1, 0, 1, 4, 255, 2, 1, 1, 0, 4, 0, 254, 0, 0, 1, 128, 0, 255, 0, 1, 1, 136, 0, 255, 1, 254, 0, 64, 0, 255, 1, 0, 0, 17, 0, 255, 2, 254, 0, 64, 0, 255, 2, 255, 0, 32, 0, 255, 2, 0, 0, 48, 0, 255, 2, 1, 1, 16, 0, 0, 0, 2, 1, 8, 0, 0, 2, 254, 1, 64, 0, 0, 2, 255, 0, 96, 0, 0, 2, 0, 1, 32, 0, 0, 2, 1, 0, 48, 0, 0, 2, 2, 1, 16, 0, 1, 1, 0, 0, 68, 0, 1, 1, 2, 0, 16, 0, 1, 2, 255, 1, 64, 0, 1, 2, 0, 0, 96, 0, 1, 2, 1, 0, 32, 0, 1, 2, 2, 0, 16, 1, 254, 1, 0, 0, 128, 1, 255, 1, 1, 0, 136, 1, 0, 1, 2, 0, 8, 1, 0, 2, 255, 0, 64, 1, 0, 2, 1, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 255, 1, 0, 1, 1, 1, 1, 0, 1, 255, 0, 255 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 322584), 
 allocate([ 120, 116, 114, 97, 110, 115, 95, 105, 110, 116, 101, 114, 112, 111, 108, 97, 116, 101, 40, 41, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 255, 255, 0, 0, 0, 0, 255, 255, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 255, 255, 2, 0, 0, 0, 255, 255, 0, 0, 1, 0, 1, 0, 1, 0, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 254, 255, 1, 0, 0, 0, 254, 255, 0, 0, 1, 0, 1, 0, 254, 255, 254, 255, 1, 0, 255, 255, 255, 255, 1, 0, 1, 0, 0, 2, 1, 2, 255, 1, 97, 104, 100, 95, 105, 110, 116, 101, 114, 112, 111, 108, 97, 116, 101, 40, 41, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 1, 0, 0, 0, 0, 254, 255, 255, 0, 2, 0, 0, 1, 2, 4, 5, 7, 8, 0, 1, 3, 4, 6, 7, 1, 2, 4, 5, 7, 8, 0, 3, 5, 8, 4, 7, 3, 6, 1, 4, 2, 5, 4, 7, 4, 2, 6, 4, 4, 2, 0, 0, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 0, 0, 215, 179, 221, 63, 215, 179, 221, 191, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 191, 0, 0, 128, 191, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 63, 215, 179, 93, 63, 0, 0, 0, 191, 0, 0, 0, 0, 0, 0, 128, 63, 215, 179, 93, 191, 0, 0, 0, 191, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 191, 0, 0, 128, 63, 0, 0, 128, 191, 0, 0, 128, 191, 0, 0, 128, 63, 114, 101, 99, 111, 118, 101, 114, 95, 104, 105, 103, 104, 108, 105, 103, 104, 116, 115, 40, 41, 0, 0, 0, 0, 255, 255, 255, 0, 255, 1, 0, 1, 1, 1, 1, 0, 1, 255, 0, 255, 49, 49, 49, 50, 52, 56, 49, 49, 50, 52, 56, 52, 56, 52, 0, 0, 78, 111, 107, 105, 97, 0, 0, 0, 75, 68, 75, 0, 0, 0, 0, 0, 86, 69, 82, 0, 0, 0, 0, 0, 73, 73, 73, 73, 0, 0, 0, 0, 77, 77, 77, 77, 0, 0, 0, 0, 75, 67, 0, 0, 0, 0, 0, 0, 77, 76, 89, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 0, 0, 0, 79, 76, 89, 77, 80, 85, 83, 0, 80, 69, 78, 84, 65, 88, 32, 0, 83, 79, 78, 89, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 0, 0, 0, 0, 0, 0, 0, 70, 85, 74, 73, 70, 73, 76, 77, 0, 0, 0, 0, 0, 0, 0, 0, 79, 76, 89, 77, 80, 0, 0, 0, 76, 69, 73, 67, 65, 0, 0, 0, 82, 105, 99, 111, 104, 0, 0, 0, 69, 80, 83, 79, 78, 0, 0, 0, 65, 79, 67, 0, 0, 0, 0, 0, 81, 86, 67, 0, 0, 0, 0, 0, 83, 65, 77, 83, 85, 78, 71, 0, 78, 73, 75, 79, 78, 0, 0, 0, 75, 79, 78, 73, 67, 65, 0, 0, 67, 97, 110, 111, 110, 0, 0, 0, 48, 54, 53, 0, 0, 0, 0, 0, 78, 82, 87, 32, 0, 0, 0, 0, 48, 49, 48, 48, 0, 0, 0, 0, 80, 69, 78, 84, 65, 88, 0, 0, 48, 49, 50, 51, 52, 55, 56, 48, 48, 48, 48, 48, 48, 48, 53, 56, 57, 54, 0, 0, 0, 0, 0, 0, 193, 191, 109, 13, 89, 197, 19, 157, 131, 97, 107, 79, 199, 127, 61, 61, 83, 89, 227, 199, 233, 47, 149, 167, 149, 31, 223, 127, 43, 41, 199, 13, 223, 7, 239, 113, 137, 61, 19, 61, 59, 19, 251, 13, 137, 193, 101, 31, 179, 13, 107, 41, 227, 251, 239, 163, 107, 71, 127, 149, 53, 167, 71, 79, 199, 241, 89, 149, 53, 17, 41, 97, 241, 61, 179, 43, 13, 67, 137, 193, 157, 157, 137, 101, 241, 233, 223, 191, 61, 127, 83, 151, 229, 233, 149, 23, 29, 61, 139, 251, 199, 227, 103, 167, 7, 241, 113, 167, 83, 181, 41, 137, 229, 43, 167, 23, 41, 233, 79, 197, 101, 109, 107, 239, 13, 137, 73, 47, 179, 67, 83, 101, 29, 73, 163, 19, 137, 89, 239, 107, 239, 101, 29, 11, 89, 19, 227, 79, 157, 179, 41, 67, 43, 7, 29, 149, 89, 89, 71, 251, 229, 233, 97, 71, 47, 53, 127, 23, 127, 239, 127, 149, 149, 113, 211, 163, 11, 113, 163, 173, 11, 59, 181, 251, 163, 191, 79, 131, 29, 173, 233, 47, 113, 101, 163, 229, 7, 53, 61, 13, 181, 233, 229, 71, 59, 157, 239, 53, 163, 191, 179, 223, 83, 211, 151, 83, 73, 113, 7, 53, 97, 113, 47, 67, 47, 17, 223, 23, 151, 251, 149, 59, 127, 107, 211, 37, 191, 173, 199, 197, 197, 181, 139, 239, 47, 211, 7, 107, 37, 73, 149, 37, 73, 109, 113, 199, 167, 188, 201, 173, 145, 223, 133, 229, 212, 120, 213, 23, 70, 124, 41, 76, 77, 3, 233, 37, 104, 17, 134, 179, 189, 247, 111, 97, 34, 162, 38, 52, 42, 190, 30, 70, 20, 104, 157, 68, 24, 194, 64, 244, 126, 95, 27, 173, 11, 148, 182, 103, 180, 11, 225, 234, 149, 156, 102, 220, 231, 93, 108, 5, 218, 213, 223, 122, 239, 246, 219, 31, 130, 76, 192, 104, 71, 161, 189, 238, 57, 80, 86, 74, 221, 223, 165, 248, 198, 218, 202, 144, 202, 1, 66, 157, 139, 12, 115, 67, 117, 5, 148, 222, 36, 179, 128, 52, 229, 44, 220, 155, 63, 202, 51, 69, 208, 219, 95, 245, 82, 195, 33, 218, 226, 34, 114, 107, 62, 208, 91, 168, 135, 140, 6, 93, 15, 221, 9, 25, 147, 208, 185, 252, 139, 15, 132, 96, 51, 28, 155, 69, 241, 240, 163, 148, 58, 18, 119, 51, 77, 68, 120, 40, 60, 158, 253, 101, 87, 22, 148, 107, 251, 89, 208, 200, 34, 54, 219, 210, 99, 152, 67, 161, 4, 135, 134, 247, 166, 38, 187, 214, 89, 77, 191, 106, 46, 170, 43, 239, 230, 120, 182, 78, 224, 47, 220, 124, 190, 87, 25, 50, 126, 42, 208, 184, 186, 41, 0, 60, 82, 125, 168, 73, 59, 45, 235, 37, 73, 250, 163, 170, 57, 167, 197, 167, 80, 17, 54, 251, 198, 103, 74, 245, 165, 18, 101, 126, 176, 223, 175, 78, 179, 97, 127, 47, 54, 54, 54, 54, 54, 62, 54, 54, 54, 59, 54, 65, 59, 58, 59, 53, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 15, 0, 0, 53, 48, 49, 51, 50, 52, 54, 55, 0, 0, 0, 0, 0, 0, 0, 0, 65, 100, 111, 98, 101, 0, 0, 0, 100, 99, 114, 97, 119, 0, 0, 0, 85, 70, 82, 97, 119, 0, 0, 0, 66, 105, 98, 98, 108, 101, 0, 0, 78, 105, 107, 111, 110, 32, 83, 99, 97, 110, 0, 0, 0, 0, 0, 0, 68, 105, 103, 105, 116, 97, 108, 32, 80, 104, 111, 116, 111, 32, 80, 114, 111, 102, 101, 115, 115, 105, 111, 110, 97, 108, 0, 0, 0, 0, 0, 0, 68, 83, 76, 82, 45, 65, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5, 0, 0, 0, 0, 0, 77, 65, 84, 82, 73, 88, 0, 0, 37, 102, 0, 0, 0, 0, 0, 0, 76, 101, 97, 102, 0, 0, 0, 0, 73, 109, 97, 99, 111, 110, 0, 0, 73, 120, 112, 114, 101, 115, 115, 32, 37, 100, 45, 77, 112, 0, 0, 0, 78, 101, 117, 116, 114, 97, 108, 32, 0, 0, 0, 0, 0, 0, 0, 0, 37, 102, 32, 37, 102, 32, 37, 102, 0, 0, 0, 0, 0, 0, 0, 0, 72, 97, 115, 115, 101, 108, 98, 108, 97, 100, 0, 0, 0, 0, 0, 0, 37, 100, 58, 37, 100, 58, 37, 100, 32, 37, 100, 58, 37, 100, 58, 37, 100, 0, 0, 0, 0, 0, 0, 0, 69, 65, 83, 84, 77, 65, 78, 0, 56, 48, 2, 64, 50, 56, 58, 191, 111, 16, 157, 190, 110, 77, 106, 190, 76, 169, 157, 63, 6, 127, 63, 187, 55, 84, 12, 188, 153, 243, 28, 190, 36, 183, 148, 63, 0, 0, 0, 0, 74, 80, 69, 71, 95, 112, 114, 101, 118, 105, 101, 119, 95, 100, 97, 116, 97, 0, 0, 0, 0, 0, 0, 0, 105, 99, 99, 95, 99, 97, 109, 101, 114, 97, 95, 112, 114, 111, 102, 105, 108, 101, 0, 0, 0, 0, 0, 0, 83, 104, 111, 111, 116, 79, 98, 106, 95, 98, 97, 99, 107, 95, 116, 121, 112, 101, 0, 0, 0, 0, 0, 0, 37, 100, 0, 0, 0, 0, 0, 0, 248, 137, 9, 0, 104, 92, 9, 0, 168, 135, 9, 0, 176, 135, 9, 0, 184, 135, 9, 0, 192, 135, 9, 0, 200, 135, 9, 0, 216, 135, 9, 0, 232, 135, 9, 0, 248, 135, 9, 0, 248, 137, 9, 0, 8, 136, 9, 0, 24, 136, 9, 0, 40, 136, 9, 0, 56, 136, 9, 0, 72, 136, 9, 0, 88, 136, 9, 0, 104, 136, 9, 0, 120, 136, 9, 0, 128, 136, 9, 0, 136, 136, 9, 0, 144, 136, 9, 0, 160, 136, 9, 0, 248, 137, 9, 0, 176, 136, 9, 0, 248, 137, 9, 0, 248, 137, 9, 0, 192, 136, 9, 0, 208, 136, 9, 0, 248, 137, 9, 0, 248, 137, 9, 0, 248, 137, 9, 0, 248, 137, 9, 0, 224, 136, 9, 0, 240, 136, 9, 0, 248, 137, 9, 0, 0, 137, 9, 0, 248, 137, 9, 0, 16, 137, 9, 0, 0, 0, 0, 0, 105, 99, 99, 95, 99, 97, 109, 101, 114, 97, 95, 116, 111, 95, 116, 111, 110, 101, 95, 109, 97, 116, 114, 105, 120, 0, 0, 0, 0, 0, 0, 0, 67, 97, 112, 116, 80, 114, 111, 102, 95, 99, 111, 108, 111, 114, 95, 109, 97, 116, 114, 105, 120, 0, 0, 0, 67, 97, 112, 116, 80, 114, 111, 102, 95, 110, 117, 109, 98, 101, 114, 95, 111, 102, 95, 112, 108, 97, 110, 101, 115, 0, 0, 0, 0, 0, 0, 0, 67, 97, 112, 116, 80, 114, 111, 102, 95, 114, 97, 119, 95, 100, 97, 116, 97, 95, 114, 111, 116, 97, 116, 105, 111, 110, 0, 0, 0, 0, 0, 0, 67, 97, 112, 116, 80, 114, 111, 102, 95, 109, 111, 115, 97, 105, 99, 95, 112, 97, 116, 116, 101, 114, 110, 0, 73, 109, 103, 80, 114, 111, 102, 95, 114, 111, 116, 97, 116, 105, 111, 110, 95, 97, 110, 103, 108, 101, 0, 0, 78, 101, 117, 116, 79, 98, 106, 95, 110, 101, 117, 116, 114, 97, 108, 115, 0, 0, 0, 0, 0, 0, 0, 0, 82, 111, 119, 115, 95, 100, 97, 116, 97, 0, 0, 0, 0, 0, 0, 0, 148, 97, 22, 73, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 128, 63, 0, 0, 0, 0, 37, 250, 0, 0, 40, 250, 0, 0, 39, 250, 0, 0, 41, 250, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 42, 250, 0, 0, 0, 0, 0, 0, 68, 105, 77, 65, 71, 69, 32, 65, 50, 48, 48, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 68, 69, 66, 85, 71, 32, 82, 65, 87, 0, 0, 0, 0, 0, 0, 0, 112, 97, 114, 115, 101, 95, 101, 120, 116, 101, 114, 110, 97, 108, 95, 106, 112, 101, 103, 40, 41, 0, 0, 0, 46, 106, 112, 103, 0, 0, 0, 0, 46, 74, 80, 71, 0, 0, 0, 0, 70, 97, 105, 108, 101, 100, 32, 116, 111, 32, 114, 101, 97, 100, 32, 109, 101, 116, 97, 100, 97, 116, 97, 32, 102, 114, 111, 109, 32, 37, 115, 10, 0, 0, 0, 0, 0, 0, 0, 0, 16, 4, 243, 69, 0, 0, 0, 0, 80, 114, 111, 49, 0, 0, 0, 0, 48, 49, 50, 51, 52, 54, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 0, 0, 0, 0, 0, 0, 48, 49, 51, 52, 53, 58, 48, 48, 48, 48, 48, 48, 48, 48, 54, 48, 48, 56, 0, 0, 0, 0, 0, 0, 48, 50, 51, 52, 53, 55, 48, 48, 48, 48, 48, 48, 48, 48, 54, 48, 48, 48, 0, 0, 0, 0, 0, 0, 48, 49, 51, 52, 53, 54, 55, 48, 50, 56, 0, 0, 0, 0, 0, 0, 68, 65, 84, 0, 0, 0, 0, 0, 84, 73, 77, 0, 0, 0, 0, 0, 37, 100, 58, 37, 100, 58, 37, 100, 0, 0, 0, 0, 0, 0, 0, 0, 72, 68, 82, 0, 0, 0, 0, 0, 88, 32, 32, 0, 0, 0, 0, 0, 89, 32, 32, 0, 0, 0, 0, 0, 84, 88, 32, 0, 0, 0, 0, 0, 84, 89, 32, 0, 0, 0, 0, 0, 69, 79, 72, 68, 0, 0, 0, 0, 82, 111, 108, 108, 101, 105, 0, 0, 100, 53, 51, 48, 102, 108, 101, 120, 0, 0, 0, 0, 0, 0, 0, 0, 77, 69, 84, 65, 0, 0, 0, 0, 84, 72, 85, 77, 66, 0, 0, 0, 82, 65, 87, 48, 0, 0, 0, 0, 48, 54, 53, 51, 0, 0, 0, 0, 32, 99, 97, 109, 101, 114, 97, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 0, 0, 0, 0, 0, 0, 0, 76, 105, 103, 104, 116, 80, 104, 97, 115, 101, 0, 0, 0, 0, 0, 0, 72, 32, 49, 48, 0, 0, 0, 0, 72, 32, 50, 48, 0, 0, 0, 0, 72, 32, 50, 53, 0, 0, 0, 0, 82, 73, 70, 70, 0, 0, 0, 0, 76, 73, 83, 84, 0, 0, 0, 0, 110, 99, 116, 103, 0, 0, 0, 0, 73, 68, 73, 84, 0, 0, 0, 0, 37, 42, 115, 32, 37, 115, 32, 37, 100, 32, 37, 100, 58, 37, 100, 58, 37, 100, 32, 37, 100, 0, 0, 0, 74, 97, 110, 0, 70, 101, 98, 0, 77, 97, 114, 0, 65, 112, 114, 0, 77, 97, 121, 0, 74, 117, 110, 0, 74, 117, 108, 0, 65, 117, 103, 0, 83, 101, 112, 0, 79, 99, 116, 0, 78, 111, 118, 0, 68, 101, 99, 0, 109, 111, 111, 118, 0, 0, 0, 0, 117, 100, 116, 97, 0, 0, 0, 0, 67, 78, 84, 72, 0, 0, 0, 0, 67, 78, 68, 65, 0, 0, 0, 0, 83, 77, 97, 76, 0, 0, 0, 0, 118, 37, 100, 32, 37, 100, 120, 37, 100, 0, 0, 0, 0, 0, 0, 0, 67, 73, 78, 69, 0, 0, 0, 0, 37, 115, 58, 32, 84, 97, 105, 108, 32, 105, 115, 32, 109, 105, 115, 115, 105, 110, 103, 44, 32, 112, 97, 114, 115, 105, 110, 103, 32, 102, 114, 111, 109, 32, 104, 101, 97, 100, 46, 46, 46, 10, 0, 0, 0, 0, 0, 0, 73, 83, 79, 0, 0, 0, 0, 0, 67, 65, 77, 77, 65, 78, 85, 70, 0, 0, 0, 0, 0, 0, 0, 0, 67, 65, 77, 77, 79, 68, 69, 76, 0, 0, 0, 0, 0, 0, 0, 0, 87, 66, 95, 68, 69, 83, 67, 0, 84, 73, 77, 69, 0, 0, 0, 0, 69, 88, 80, 84, 73, 77, 69, 0, 65, 80, 69, 82, 84, 85, 82, 69, 0, 0, 0, 0, 0, 0, 0, 0, 70, 76, 69, 78, 71, 84, 72, 0, 37, 115, 32, 37, 115, 0, 0, 0, 0, 102, 9, 0, 0, 0, 0, 0, 174, 44, 78, 241, 165, 251, 151, 246, 186, 38, 193, 9, 53, 251, 247, 8, 180, 20, 0, 0, 0, 0, 0, 0, 24, 102, 9, 0, 0, 0, 0, 0, 144, 83, 235, 233, 231, 242, 102, 9, 74, 31, 97, 254, 254, 27, 147, 5, 30, 8, 0, 0, 0, 0, 0, 0, 40, 102, 9, 0, 0, 0, 0, 0, 222, 95, 148, 213, 183, 242, 46, 250, 106, 44, 215, 254, 42, 11, 163, 253, 153, 12, 0, 0, 0, 0, 0, 0, 56, 102, 9, 0, 0, 0, 0, 0, 2, 80, 252, 227, 203, 243, 247, 251, 170, 40, 227, 254, 238, 9, 226, 0, 64, 12, 0, 0, 0, 0, 0, 0, 72, 102, 9, 0, 0, 0, 0, 0, 77, 38, 127, 245, 224, 250, 85, 233, 8, 51, 252, 11, 122, 246, 3, 12, 71, 34, 0, 0, 0, 0, 0, 0, 88, 102, 9, 0, 0, 0, 160, 15, 44, 24, 195, 250, 134, 252, 0, 228, 153, 56, 121, 11, 176, 245, 156, 12, 35, 33, 0, 0, 0, 0, 0, 0, 104, 102, 9, 0, 0, 0, 150, 60, 106, 24, 57, 253, 216, 252, 223, 235, 250, 49, 76, 10, 31, 251, 150, 8, 234, 21, 0, 0, 0, 0, 0, 0, 120, 102, 9, 0, 0, 0, 128, 60, 66, 26, 133, 253, 61, 252, 65, 239, 172, 48, 236, 7, 116, 252, 114, 8, 36, 22, 0, 0, 0, 0, 0, 0, 144, 102, 9, 0, 0, 0, 240, 60, 108, 18, 91, 2, 194, 252, 138, 225, 114, 60, 176, 9, 40, 250, 145, 7, 251, 25, 0, 0, 0, 0, 0, 0, 168, 102, 9, 0, 0, 0, 108, 14, 203, 24, 33, 254, 52, 252, 151, 223, 82, 62, 176, 9, 80, 248, 83, 8, 225, 29, 0, 0, 0, 0, 0, 0, 184, 102, 9, 0, 0, 0, 130, 60, 122, 27, 220, 252, 10, 252, 188, 238, 20, 49, 10, 8, 173, 252, 202, 7, 126, 22, 0, 0, 0, 0, 0, 0, 200, 102, 9, 0, 0, 0, 16, 53, 100, 28, 198, 251, 55, 252, 166, 239, 63, 46, 103, 10, 199, 252, 237, 7, 207, 22, 0, 0, 0, 0, 0, 0, 224, 102, 9, 0, 0, 0, 16, 53, 188, 26, 28, 252, 168, 252, 220, 240, 241, 45, 92, 9, 175, 253, 236, 6, 54, 24, 0, 0, 0, 0, 0, 0, 240, 102, 9, 0, 0, 0, 160, 15, 5, 32, 48, 248, 162, 251, 198, 229, 255, 55, 32, 10, 24, 246, 106, 12, 74, 32, 0, 0, 0, 0, 0, 0, 0, 103, 9, 0, 0, 0, 0, 0, 75, 55, 55, 236, 154, 250, 106, 230, 41, 57, 247, 7, 169, 249, 32, 7, 161, 25, 0, 0, 0, 0, 0, 0, 16, 103, 9, 0, 0, 0, 255, 15, 199, 25, 231, 253, 133, 252, 121, 224, 167, 61, 120, 9, 65, 248, 186, 8, 38, 29, 0, 0, 0, 0, 0, 0, 32, 103, 9, 0, 0, 0, 0, 0, 113, 24, 209, 254, 24, 252, 56, 225, 5, 61, 92, 9, 78, 249, 112, 7, 134, 27, 0, 0, 0, 0, 0, 0, 48, 103, 9, 0, 0, 0, 96, 63, 183, 23, 21, 253, 168, 252, 27, 226, 5, 60, 137, 9, 23, 248, 249, 9, 147, 28, 0, 0, 0, 0, 0, 0, 64, 103, 9, 0, 0, 0, 147, 61, 56, 19, 104, 2, 175, 253, 163, 230, 140, 54, 224, 10, 18, 249, 106, 12, 93, 27, 0, 0, 0, 0, 0, 0, 80, 103, 9, 0, 0, 0, 247, 47, 63, 26, 30, 252, 99, 252, 200, 238, 138, 48, 163, 8, 137, 252, 81, 8, 163, 23, 0, 0, 0, 0, 0, 0, 96, 103, 9, 0, 0, 0, 199, 59, 122, 27, 220, 252, 10, 252, 188, 238, 20, 49, 10, 8, 173, 252, 202, 7, 126, 22, 0, 0, 0, 0, 0, 0, 112, 103, 9, 0, 0, 0, 15, 53, 202, 25, 183, 252, 85, 252, 136, 238, 170, 48, 199, 8, 49, 252, 247, 7, 4, 24, 0, 0, 0, 0, 0, 0, 128, 103, 9, 0, 0, 0, 160, 15, 5, 32, 48, 248, 162, 251, 198, 229, 255, 55, 32, 10, 24, 246, 106, 12, 74, 32, 0, 0, 0, 0, 0, 0, 144, 103, 9, 0, 0, 0, 255, 15, 130, 23, 151, 253, 59, 252, 59, 222, 9, 62, 159, 11, 6, 250, 183, 6, 218, 29, 0, 0, 0, 0, 0, 0, 160, 103, 9, 0, 0, 0, 142, 14, 142, 27, 35, 250, 34, 252, 36, 224, 184, 60, 252, 10, 2, 251, 134, 5, 116, 30, 0, 0, 0, 0, 0, 0, 176, 103, 9, 0, 0, 0, 13, 57, 152, 22, 250, 254, 203, 252, 141, 226, 216, 58, 112, 10, 66, 248, 121, 10, 3, 29, 0, 0, 0, 0, 0, 0, 192, 103, 9, 0, 0, 0, 121, 52, 155, 18, 200, 2, 122, 253, 91, 229, 63, 56, 80, 10, 127, 248, 204, 12, 161, 25, 0, 0, 0, 0, 0, 0, 208, 103, 9, 0, 0, 0, 215, 61, 29, 27, 116, 251, 167, 252, 15, 241, 77, 45, 230, 9, 96, 254, 4, 6, 151, 23, 0, 0, 0, 0, 0, 0, 224, 103, 9, 0, 0, 0, 16, 53, 61, 25, 117, 252, 142, 252, 52, 239, 152, 47, 74, 9, 205, 252, 152, 7, 43, 23, 0, 0, 0, 0, 0, 0, 240, 103, 9, 0, 0, 0, 77, 53, 202, 25, 183, 252, 85, 252, 136, 238, 170, 48, 199, 8, 49, 252, 247, 7, 4, 24, 0, 0, 0, 0, 0, 0, 0, 104, 9, 0, 0, 0, 0, 60, 202, 25, 183, 252, 85, 252, 136, 238, 170, 48, 199, 8, 49, 252, 247, 7, 4, 24, 0, 0, 0, 0, 0, 0, 16, 104, 9, 0, 0, 0, 142, 54, 218, 24, 201, 252, 177, 252, 182, 238, 77, 47, 56, 10, 25, 253, 65, 7, 3, 22, 0, 0, 0, 0, 0, 0, 32, 104, 9, 0, 0, 0, 15, 53, 218, 24, 201, 252, 177, 252, 182, 238, 77, 47, 56, 10, 25, 253, 65, 7, 3, 22, 0, 0, 0, 0, 0, 0, 48, 104, 9, 0, 0, 0, 67, 14, 115, 26, 141, 251, 47, 252, 118, 225, 19, 59, 112, 11, 36, 251, 157, 5, 109, 29, 0, 0, 0, 0, 0, 0, 64, 104, 9, 0, 0, 0, 16, 53, 44, 25, 120, 252, 131, 252, 45, 238, 20, 48, 231, 9, 121, 252, 224, 7, 72, 26, 0, 0, 0, 0, 0, 0, 80, 104, 9, 0, 0, 0, 194, 55, 61, 25, 117, 252, 142, 252, 52, 239, 152, 47, 74, 9, 205, 252, 152, 7, 43, 23, 0, 0, 0, 0, 0, 0, 96, 104, 9, 0, 0, 0, 0, 0, 218, 24, 201, 252, 177, 252, 182, 238, 77, 47, 56, 10, 25, 253, 65, 7, 3, 22, 0, 0, 0, 0, 0, 0, 112, 104, 9, 0, 0, 0, 0, 0, 202, 25, 183, 252, 85, 252, 136, 238, 170, 48, 199, 8, 49, 252, 247, 7, 4, 24, 0, 0, 0, 0, 0, 0, 128, 104, 9, 0, 0, 0, 176, 59, 227, 22, 45, 255, 94, 252, 193, 223, 145, 62, 49, 9, 60, 249, 95, 7, 24, 29, 0, 0, 0, 0, 0, 0, 152, 104, 9, 0, 0, 0, 128, 14, 117, 25, 166, 253, 157, 252, 12, 224, 54, 62, 74, 9, 174, 249, 235, 6, 209, 29, 0, 0, 0, 0, 0, 0, 176, 104, 9, 0, 0, 0, 176, 59, 126, 23, 36, 255, 229, 252, 243, 239, 238, 46, 57, 9, 207, 253, 32, 7, 155, 22, 0, 0, 0, 0, 0, 0, 200, 104, 9, 0, 0, 0, 176, 59, 147, 24, 228, 253, 48, 252, 98, 223, 17, 63, 7, 9, 78, 249, 66, 7, 158, 28, 0, 0, 0, 0, 0, 0, 224, 104, 9, 0, 0, 0, 128, 14, 96, 24, 46, 254, 202, 252, 12, 224, 209, 61, 196, 9, 247, 248, 146, 7, 106, 31, 0, 0, 0, 0, 0, 0, 248, 104, 9, 0, 0, 0, 128, 14, 120, 24, 186, 253, 44, 253, 136, 223, 76, 62, 200, 9, 48, 249, 127, 7, 216, 33, 0, 0, 0, 0, 0, 0, 16, 105, 9, 0, 0, 0, 32, 14, 22, 17, 47, 14, 49, 249, 160, 226, 108, 59, 168, 9, 180, 244, 48, 14, 225, 31, 0, 0, 0, 0, 0, 0, 32, 105, 9, 0, 0, 0, 78, 60, 191, 26, 154, 253, 10, 252, 195, 237, 193, 49, 91, 8, 83, 251, 184, 9, 190, 26, 0, 0, 0, 0, 0, 0, 48, 105, 9, 0, 0, 0, 78, 60, 191, 26, 154, 253, 10, 252, 195, 237, 193, 49, 91, 8, 83, 251, 184, 9, 190, 26, 0, 0, 0, 0, 0, 0, 64, 105, 9, 0, 0, 0, 32, 14, 150, 26, 77, 255, 4, 252, 95, 224, 31, 64, 151, 6, 61, 243, 140, 16, 10, 30, 0, 0, 0, 0, 0, 0, 80, 105, 9, 0, 85, 3, 0, 0, 187, 69, 148, 214, 154, 3, 255, 226, 22, 65, 251, 2, 180, 241, 52, 14, 6, 87, 0, 0, 0, 0, 0, 0, 96, 105, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 120, 105, 9, 0, 0, 0, 0, 0, 76, 235, 118, 38, 240, 6, 108, 13, 172, 2, 99, 15, 92, 234, 151, 38, 56, 24, 132, 250, 167, 43, 217, 0, 144, 105, 9, 0, 0, 0, 0, 0, 63, 237, 3, 37, 160, 7, 110, 11, 75, 6, 254, 15, 117, 235, 180, 39, 59, 23, 238, 249, 131, 42, 35, 2, 168, 105, 9, 0, 0, 0, 0, 0, 85, 43, 190, 240, 252, 251, 73, 236, 204, 48, 63, 11, 21, 252, 214, 6, 185, 21, 0, 0, 0, 0, 0, 0, 192, 105, 9, 0, 0, 0, 0, 0, 145, 47, 47, 237, 211, 251, 180, 249, 136, 38, 1, 8, 158, 255, 82, 3, 119, 17, 0, 0, 0, 0, 0, 0, 216, 105, 9, 0, 0, 0, 0, 0, 188, 51, 131, 234, 32, 251, 28, 250, 130, 38, 143, 7, 242, 254, 59, 4, 14, 17, 0, 0, 0, 0, 0, 0, 240, 105, 9, 0, 0, 0, 0, 0, 50, 29, 3, 247, 201, 253, 40, 240, 192, 44, 159, 11, 34, 255, 204, 2, 85, 16, 0, 0, 0, 0, 0, 0, 8, 106, 9, 0, 0, 0, 0, 0, 84, 31, 129, 245, 86, 253, 136, 241, 103, 46, 4, 8, 59, 252, 129, 7, 180, 21, 0, 0, 0, 0, 0, 0, 32, 106, 9, 0, 0, 0, 0, 0, 210, 28, 25, 251, 237, 251, 8, 240, 219, 47, 0, 8, 148, 252, 154, 7, 173, 22, 0, 0, 0, 0, 0, 0, 56, 106, 9, 0, 0, 0, 0, 0, 86, 237, 251, 36, 124, 8, 135, 18, 139, 251, 248, 16, 230, 235, 180, 38, 189, 23, 226, 249, 43, 43, 45, 2, 80, 106, 9, 0, 0, 0, 0, 0, 127, 35, 123, 245, 231, 251, 197, 229, 46, 56, 233, 9, 13, 247, 3, 11, 110, 30, 0, 0, 0, 0, 0, 0, 104, 106, 9, 0, 0, 0, 0, 0, 252, 35, 35, 245, 207, 251, 83, 230, 109, 55, 45, 10, 4, 247, 28, 11, 240, 29, 0, 0, 0, 0, 0, 0, 128, 106, 9, 0, 0, 0, 0, 0, 29, 38, 200, 244, 91, 252, 172, 232, 37, 54, 253, 8, 170, 249, 24, 9, 44, 28, 0, 0, 0, 0, 0, 0, 152, 106, 9, 0, 0, 0, 0, 0, 149, 38, 65, 241, 153, 252, 67, 226, 215, 57, 0, 12, 88, 250, 25, 5, 61, 29, 0, 0, 0, 0, 0, 0, 176, 106, 9, 0, 0, 0, 0, 0, 130, 37, 17, 241, 87, 252, 88, 244, 231, 44, 139, 6, 105, 254, 135, 5, 185, 19, 0, 0, 0, 0, 0, 0, 200, 106, 9, 0, 0, 0, 0, 0, 200, 28, 163, 247, 170, 253, 11, 234, 198, 51, 65, 10, 118, 250, 160, 6, 111, 22, 0, 0, 0, 0, 0, 0, 224, 106, 9, 0, 0, 0, 0, 0, 78, 39, 62, 242, 25, 252, 37, 226, 13, 59, 170, 10, 3, 253, 49, 3, 155, 28, 0, 0, 0, 0, 0, 0, 248, 106, 9, 0, 34, 0, 0, 0, 197, 239, 90, 38, 249, 5, 99, 15, 231, 255, 170, 17, 111, 234, 142, 38, 210, 25, 66, 247, 121, 42, 62, 5, 16, 107, 9, 0, 0, 0, 0, 0, 157, 236, 168, 38, 187, 8, 34, 18, 37, 252, 198, 16, 214, 235, 27, 39, 227, 22, 22, 249, 222, 43, 65, 2, 40, 107, 9, 0, 0, 0, 0, 0, 70, 41, 188, 241, 151, 251, 104, 230, 70, 57, 214, 7, 107, 247, 21, 10, 246, 29, 0, 0, 0, 0, 0, 0, 64, 107, 9, 0, 0, 0, 0, 0, 62, 33, 73, 246, 84, 252, 43, 229, 151, 55, 84, 11, 242, 246, 13, 11, 53, 35, 0, 0, 0, 0, 0, 0, 88, 107, 9, 0, 0, 0, 0, 0, 227, 31, 227, 246, 69, 252, 230, 229, 94, 55, 191, 10, 227, 247, 37, 10, 105, 31, 0, 0, 0, 0, 0, 0, 112, 107, 9, 0, 0, 0, 0, 0, 178, 34, 245, 245, 161, 252, 52, 231, 154, 55, 240, 8, 20, 250, 124, 8, 169, 25, 0, 0, 0, 0, 0, 0, 136, 107, 9, 0, 0, 0, 0, 0, 91, 34, 78, 246, 227, 252, 132, 225, 43, 60, 13, 10, 114, 250, 204, 7, 170, 27, 0, 0, 0, 0, 0, 0, 160, 107, 9, 0, 0, 0, 0, 0, 248, 38, 30, 241, 192, 252, 53, 228, 127, 56, 90, 11, 123, 252, 221, 3, 209, 30, 0, 0, 0, 0, 0, 0, 184, 107, 9, 0, 0, 0, 0, 0, 86, 48, 104, 236, 231, 251, 115, 249, 174, 38, 30, 8, 173, 255, 84, 3, 75, 18, 0, 0, 0, 0, 0, 0, 208, 107, 9, 0, 0, 0, 0, 0, 128, 52, 248, 232, 1, 251, 44, 251, 126, 37, 139, 7, 76, 255, 233, 3, 43, 18, 0, 0, 0, 0, 0, 0, 232, 107, 9, 0, 0, 0, 0, 0, 32, 31, 251, 245, 132, 253, 199, 244, 201, 41, 209, 9, 180, 0, 155, 2, 115, 16, 0, 0, 0, 0, 0, 0, 0, 108, 9, 0, 0, 0, 0, 0, 103, 31, 173, 245, 114, 253, 57, 241, 222, 43, 114, 11, 50, 255, 178, 2, 98, 16, 0, 0, 0, 0, 0, 0, 24, 108, 9, 0, 0, 0, 0, 0, 49, 27, 107, 249, 73, 253, 239, 237, 145, 50, 44, 7, 166, 251, 104, 8, 142, 21, 0, 0, 0, 0, 0, 0, 48, 108, 9, 0, 0, 0, 0, 0, 178, 25, 253, 254, 10, 254, 170, 232, 230, 50, 237, 12, 204, 254, 34, 4, 106, 19, 0, 0, 0, 0, 0, 0, 72, 108, 9, 0, 0, 0, 0, 0, 144, 48, 111, 237, 33, 251, 194, 247, 195, 41, 93, 6, 100, 254, 87, 6, 62, 19, 0, 0, 0, 0, 0, 0, 96, 108, 9, 0, 0, 0, 0, 0, 105, 51, 181, 234, 192, 250, 59, 248, 158, 41, 251, 5, 209, 255, 247, 4, 91, 19, 0, 0, 0, 0, 0, 0, 120, 108, 9, 0, 0, 0, 0, 0, 74, 42, 186, 241, 1, 252, 113, 243, 46, 44, 114, 7, 0, 0, 231, 3, 96, 19, 0, 0, 0, 0, 0, 0, 144, 108, 9, 0, 0, 0, 0, 0, 225, 48, 201, 238, 38, 251, 136, 245, 36, 40, 101, 9, 146, 252, 167, 8, 126, 18, 0, 0, 0, 0, 0, 0, 168, 108, 9, 0, 0, 0, 0, 0, 231, 60, 254, 230, 200, 249, 11, 235, 142, 51, 120, 8, 236, 250, 32, 7, 211, 19, 0, 0, 0, 0, 0, 0, 192, 108, 9, 0, 0, 0, 0, 0, 161, 59, 207, 231, 234, 249, 227, 239, 84, 47, 218, 7, 136, 252, 103, 6, 100, 20, 0, 0, 0, 0, 0, 0, 216, 108, 9, 0, 0, 0, 0, 0, 121, 55, 68, 235, 35, 249, 57, 232, 136, 56, 81, 6, 113, 247, 33, 12, 228, 20, 0, 0, 0, 0, 0, 0, 240, 108, 9, 0, 0, 0, 0, 0, 68, 51, 47, 235, 146, 250, 238, 241, 138, 45, 152, 7, 180, 249, 47, 11, 21, 19, 0, 0, 0, 0, 0, 0, 8, 109, 9, 0, 0, 0, 0, 0, 211, 36, 36, 244, 65, 252, 235, 245, 175, 41, 119, 7, 241, 251, 190, 7, 78, 17, 0, 0, 0, 0, 0, 0, 32, 109, 9, 0, 0, 0, 0, 0, 237, 56, 150, 234, 246, 249, 14, 251, 71, 38, 188, 5, 240, 251, 120, 7, 226, 14, 0, 0, 0, 0, 0, 0, 56, 109, 9, 0, 0, 0, 0, 0, 238, 54, 177, 235, 90, 250, 152, 237, 182, 48, 195, 8, 250, 250, 236, 7, 228, 18, 0, 0, 0, 0, 0, 0, 80, 109, 9, 0, 0, 0, 0, 0, 54, 55, 56, 234, 9, 250, 57, 248, 223, 41, 249, 4, 122, 251, 137, 7, 253, 13, 0, 0, 0, 0, 0, 0, 112, 109, 9, 0, 0, 0, 0, 0, 74, 54, 44, 236, 89, 250, 131, 250, 125, 39, 17, 5, 12, 255, 68, 7, 103, 14, 0, 0, 0, 0, 0, 0, 136, 109, 9, 0, 0, 0, 0, 0, 114, 45, 172, 240, 152, 251, 152, 236, 154, 50, 223, 7, 204, 249, 88, 10, 38, 28, 0, 0, 0, 0, 0, 0, 152, 109, 9, 0, 0, 0, 0, 0, 67, 42, 223, 240, 181, 251, 217, 236, 162, 53, 151, 4, 37, 249, 167, 14, 24, 18, 0, 0, 0, 0, 0, 0, 168, 109, 9, 0, 128, 0, 255, 15, 62, 38, 246, 242, 165, 253, 239, 246, 238, 39, 51, 8, 168, 254, 249, 4, 191, 18, 0, 0, 0, 0, 0, 0, 184, 109, 9, 0, 0, 0, 0, 0, 62, 13, 224, 1, 12, 254, 224, 252, 26, 14, 84, 1, 218, 253, 32, 9, 168, 4, 0, 0, 0, 0, 0, 0, 200, 109, 9, 0, 0, 0, 0, 0, 62, 13, 224, 1, 12, 254, 224, 252, 26, 14, 84, 1, 218, 253, 32, 9, 168, 4, 0, 0, 0, 0, 0, 0, 40, 252, 8, 0, 0, 0, 0, 0, 215, 78, 57, 239, 89, 254, 156, 240, 226, 59, 145, 15, 232, 254, 6, 19, 72, 38, 0, 0, 0, 0, 0, 0, 216, 109, 9, 0, 0, 0, 30, 15, 97, 30, 5, 5, 227, 251, 192, 219, 159, 64, 100, 11, 163, 241, 47, 22, 148, 27, 0, 0, 0, 0, 0, 0, 240, 109, 9, 0, 0, 0, 0, 0, 171, 26, 170, 248, 36, 253, 19, 223, 140, 62, 4, 10, 64, 253, 80, 2, 233, 27, 0, 0, 0, 0, 0, 0, 0, 110, 9, 0, 0, 0, 0, 0, 36, 43, 208, 240, 160, 251, 176, 227, 64, 59, 160, 8, 5, 250, 229, 8, 133, 31, 0, 0, 0, 0, 0, 0, 16, 110, 9, 0, 0, 0, 0, 0, 223, 35, 34, 246, 202, 251, 219, 226, 223, 58, 14, 10, 26, 248, 136, 9, 191, 33, 0, 0, 0, 0, 0, 0, 32, 110, 9, 0, 0, 0, 0, 0, 122, 53, 18, 235, 62, 250, 215, 242, 80, 45, 206, 7, 124, 255, 18, 6, 43, 17, 0, 0, 0, 0, 0, 0, 48, 110, 9, 0, 0, 0, 0, 0, 122, 53, 18, 235, 62, 250, 215, 242, 80, 45, 206, 7, 124, 255, 18, 6, 43, 17, 0, 0, 0, 0, 0, 0, 64, 110, 9, 0, 0, 0, 233, 15, 122, 53, 18, 235, 62, 250, 215, 242, 80, 45, 206, 7, 124, 255, 18, 6, 43, 17, 0, 0, 0, 0, 0, 0, 80, 110, 9, 0, 0, 0, 0, 0, 20, 39, 109, 243, 79, 251, 132, 228, 199, 58, 59, 8, 185, 248, 5, 10, 56, 30, 0, 0, 0, 0, 0, 0, 96, 110, 9, 0, 0, 0, 0, 0, 122, 53, 18, 235, 62, 250, 215, 242, 80, 45, 206, 7, 124, 255, 18, 6, 43, 17, 0, 0, 0, 0, 0, 0, 112, 110, 9, 0, 2, 2, 0, 0, 1, 45, 253, 238, 215, 251, 132, 230, 199, 53, 242, 11, 70, 250, 192, 7, 157, 23, 0, 0, 0, 0, 0, 0, 128, 110, 9, 0, 0, 0, 0, 0, 9, 48, 238, 236, 78, 251, 198, 247, 195, 41, 87, 6, 168, 255, 32, 5, 182, 18, 0, 0, 0, 0, 0, 0, 144, 110, 9, 0, 0, 0, 0, 0, 20, 39, 109, 243, 79, 251, 132, 228, 199, 58, 59, 8, 185, 248, 5, 10, 56, 30, 0, 0, 0, 0, 0, 0, 160, 110, 9, 0, 0, 2, 255, 63, 137, 44, 110, 238, 224, 250, 32, 236, 207, 49, 53, 10, 186, 252, 32, 6, 53, 23, 0, 0, 0, 0, 0, 0, 176, 110, 9, 0, 128, 0, 0, 0, 204, 48, 174, 237, 134, 250, 135, 228, 63, 60, 111, 6, 29, 250, 63, 8, 17, 30, 0, 0, 0, 0, 0, 0, 192, 110, 9, 0, 0, 0, 0, 0, 31, 46, 252, 237, 242, 250, 33, 221, 72, 66, 196, 7, 184, 247, 181, 10, 70, 31, 0, 0, 0, 0, 0, 0, 208, 110, 9, 0, 0, 0, 0, 0, 12, 48, 10, 236, 232, 250, 99, 220, 247, 66, 206, 7, 101, 248, 144, 9, 164, 31, 0, 0, 0, 0, 0, 0, 224, 110, 9, 0, 0, 0, 0, 0, 50, 34, 84, 245, 5, 252, 220, 227, 221, 58, 228, 8, 90, 249, 30, 9, 70, 27, 0, 0, 0, 0, 0, 0, 240, 110, 9, 0, 0, 0, 0, 0, 164, 46, 177, 238, 25, 251, 146, 229, 92, 56, 238, 9, 31, 252, 141, 4, 253, 28, 0, 0, 0, 0, 0, 0, 0, 111, 9, 0, 0, 0, 0, 0, 164, 46, 177, 238, 25, 251, 146, 229, 92, 56, 238, 9, 31, 252, 141, 4, 253, 28, 0, 0, 0, 0, 0, 0, 16, 111, 9, 0, 0, 0, 0, 0, 164, 37, 12, 245, 36, 252, 238, 226, 192, 58, 29, 10, 245, 248, 7, 9, 173, 33, 0, 0, 0, 0, 0, 0, 32, 111, 9, 0, 0, 0, 0, 0, 164, 37, 12, 245, 36, 252, 238, 226, 192, 58, 29, 10, 245, 248, 7, 9, 173, 33, 0, 0, 0, 0, 0, 0, 48, 111, 9, 0, 0, 0, 0, 0, 84, 49, 233, 236, 135, 250, 51, 229, 148, 58, 170, 7, 106, 247, 222, 10, 179, 27, 0, 0, 0, 0, 0, 0, 64, 111, 9, 0, 0, 0, 0, 0, 206, 39, 78, 242, 224, 250, 15, 228, 203, 58, 190, 8, 45, 248, 95, 9, 81, 29, 0, 0, 0, 0, 0, 0, 80, 111, 9, 0, 0, 0, 0, 0, 251, 40, 161, 242, 135, 251, 39, 227, 179, 58, 234, 9, 239, 248, 227, 8, 244, 33, 0, 0, 0, 0, 0, 0, 96, 111, 9, 0, 0, 0, 0, 0, 251, 40, 161, 242, 135, 251, 39, 227, 179, 58, 234, 9, 239, 248, 227, 8, 244, 33, 0, 0, 0, 0, 0, 0, 112, 111, 9, 0, 0, 0, 0, 0, 55, 48, 93, 238, 251, 250, 3, 228, 51, 58, 131, 9, 153, 248, 192, 9, 96, 34, 0, 0, 0, 0, 0, 0, 128, 111, 9, 0, 0, 0, 0, 0, 55, 48, 93, 238, 251, 250, 3, 228, 51, 58, 131, 9, 153, 248, 192, 9, 96, 34, 0, 0, 0, 0, 0, 0, 144, 111, 9, 0, 0, 0, 0, 0, 185, 45, 90, 239, 173, 251, 22, 247, 39, 42, 173, 6, 213, 253, 177, 6, 81, 19, 0, 0, 0, 0, 0, 0, 160, 111, 9, 0, 0, 0, 0, 0, 213, 83, 201, 213, 95, 250, 228, 246, 103, 41, 207, 7, 33, 1, 107, 3, 23, 30, 0, 0, 0, 0, 0, 0, 176, 111, 9, 0, 0, 0, 0, 0, 12, 48, 10, 236, 232, 250, 99, 220, 247, 66, 206, 7, 101, 248, 144, 9, 164, 31, 0, 0, 0, 0, 0, 0, 192, 111, 9, 0, 0, 0, 104, 15, 152, 48, 142, 240, 97, 251, 157, 251, 202, 37, 172, 6, 173, 255, 78, 6, 246, 15, 0, 0, 0, 0, 0, 0, 216, 111, 9, 0, 0, 0, 0, 0, 122, 53, 18, 235, 62, 250, 215, 242, 80, 45, 206, 7, 124, 255, 18, 6, 43, 17, 0, 0, 0, 0, 0, 0, 232, 111, 9, 0, 0, 0, 0, 0, 122, 53, 18, 235, 62, 250, 215, 242, 80, 45, 206, 7, 124, 255, 18, 6, 43, 17, 0, 0, 0, 0, 0, 0, 248, 111, 9, 0, 0, 0, 0, 0, 53, 47, 137, 237, 71, 252, 71, 243, 225, 44, 210, 7, 1, 254, 254, 7, 240, 17, 0, 0, 0, 0, 0, 0, 16, 112, 9, 0, 0, 0, 0, 0, 53, 47, 137, 237, 71, 252, 71, 243, 225, 44, 210, 7, 1, 254, 254, 7, 240, 17, 0, 0, 0, 0, 0, 0, 40, 112, 9, 0, 0, 0, 0, 0, 96, 41, 90, 239, 16, 252, 70, 242, 91, 44, 161, 9, 154, 252, 233, 7, 242, 24, 0, 0, 0, 0, 0, 0, 56, 112, 9, 0, 0, 0, 0, 0, 96, 41, 90, 239, 16, 252, 70, 242, 91, 44, 161, 9, 154, 252, 233, 7, 242, 24, 0, 0, 0, 0, 0, 0, 72, 112, 9, 0, 0, 0, 0, 0, 129, 47, 151, 238, 211, 251, 86, 236, 74, 50, 96, 9, 229, 252, 188, 6, 248, 26, 0, 0, 0, 0, 0, 0, 88, 112, 9, 0, 0, 0, 0, 0, 197, 52, 201, 231, 26, 251, 178, 238, 189, 49, 73, 7, 181, 254, 161, 5, 158, 19, 0, 0, 0, 0, 0, 0, 104, 112, 9, 0, 0, 0, 0, 0, 248, 45, 149, 236, 147, 251, 216, 236, 127, 50, 135, 8, 32, 254, 187, 6, 253, 17, 0, 0, 0, 0, 0, 0, 120, 112, 9, 0, 0, 0, 0, 0, 40, 48, 120, 235, 136, 251, 139, 238, 127, 50, 139, 6, 169, 255, 11, 5, 255, 16, 0, 0, 0, 0, 0, 0, 136, 112, 9, 0, 0, 0, 0, 0, 173, 40, 100, 240, 31, 252, 119, 241, 120, 45, 57, 9, 35, 253, 4, 6, 123, 23, 0, 0, 0, 0, 0, 0, 152, 112, 9, 0, 0, 0, 0, 0, 78, 43, 53, 238, 185, 252, 72, 242, 46, 44, 213, 9, 209, 252, 61, 5, 52, 23, 0, 0, 0, 0, 0, 0, 168, 112, 9, 0, 0, 0, 0, 0, 11, 42, 48, 238, 107, 252, 238, 242, 47, 44, 18, 9, 37, 254, 111, 4, 211, 22, 0, 0, 0, 0, 0, 0, 184, 112, 9, 0, 0, 0, 0, 0, 173, 40, 100, 240, 31, 252, 119, 241, 120, 45, 57, 9, 35, 253, 4, 6, 123, 23, 0, 0, 0, 0, 0, 0, 200, 112, 9, 0, 0, 0, 0, 0, 10, 33, 109, 246, 169, 252, 11, 238, 159, 48, 103, 9, 61, 250, 178, 9, 126, 25, 0, 0, 0, 0, 0, 0, 216, 112, 9, 0, 0, 0, 0, 0, 173, 40, 100, 240, 31, 252, 119, 241, 120, 45, 57, 9, 35, 253, 4, 6, 123, 23, 0, 0, 0, 0, 0, 0, 232, 112, 9, 0, 0, 0, 0, 0, 197, 52, 201, 231, 26, 251, 178, 238, 189, 49, 73, 7, 181, 254, 161, 5, 158, 19, 0, 0, 0, 0, 0, 0, 248, 112, 9, 0, 0, 0, 0, 0, 10, 33, 109, 246, 169, 252, 11, 238, 159, 48, 103, 9, 61, 250, 178, 9, 126, 25, 0, 0, 0, 0, 0, 0, 8, 113, 9, 0, 0, 0, 0, 0, 197, 52, 201, 231, 26, 251, 178, 238, 189, 49, 73, 7, 181, 254, 161, 5, 158, 19, 0, 0, 0, 0, 0, 0, 24, 113, 9, 0, 0, 0, 0, 0, 36, 36, 112, 245, 216, 251, 251, 232, 185, 55, 181, 6, 179, 251, 37, 9, 253, 16, 0, 0, 0, 0, 0, 0, 40, 113, 9, 0, 0, 0, 0, 0, 113, 27, 121, 250, 64, 253, 188, 235, 197, 53, 144, 5, 32, 251, 182, 10, 150, 23, 0, 0, 0, 0, 0, 0, 56, 113, 9, 0, 0, 0, 0, 0, 67, 54, 89, 232, 221, 252, 47, 254, 191, 38, 130, 2, 73, 8, 82, 0, 11, 5, 0, 0, 0, 0, 0, 0, 72, 113, 9, 0, 8, 0, 0, 0, 115, 68, 37, 237, 50, 246, 244, 2, 98, 33, 119, 255, 225, 23, 113, 6, 202, 8, 0, 0, 0, 0, 0, 0, 88, 113, 9, 0, 8, 0, 0, 0, 140, 80, 108, 226, 15, 245, 153, 255, 89, 39, 116, 254, 223, 13, 23, 255, 172, 8, 0, 0, 0, 0, 0, 0, 104, 113, 9, 0, 0, 0, 0, 0, 116, 42, 196, 248, 124, 253, 255, 249, 75, 43, 228, 1, 39, 9, 116, 2, 168, 8, 0, 0, 0, 0, 0, 0, 120, 113, 9, 0, 0, 0, 0, 0, 96, 41, 98, 247, 57, 252, 104, 248, 165, 45, 230, 0, 158, 8, 158, 2, 249, 4, 0, 0, 0, 0, 0, 0, 136, 113, 9, 0, 0, 0, 0, 0, 96, 41, 98, 247, 57, 252, 104, 248, 165, 45, 230, 0, 158, 8, 158, 2, 249, 4, 0, 0, 0, 0, 0, 0, 152, 113, 9, 0, 0, 0, 0, 0, 170, 38, 116, 245, 84, 252, 82, 246, 187, 47, 206, 0, 193, 7, 122, 2, 7, 4, 0, 0, 0, 0, 0, 0, 168, 113, 9, 0, 178, 0, 0, 0, 222, 95, 148, 213, 183, 242, 46, 250, 106, 44, 215, 254, 42, 11, 163, 253, 153, 12, 0, 0, 0, 0, 0, 0, 184, 113, 9, 0, 177, 0, 0, 0, 2, 80, 252, 227, 203, 243, 247, 251, 170, 40, 227, 254, 238, 9, 226, 0, 64, 12, 0, 0, 0, 0, 0, 0, 200, 113, 9, 0, 177, 0, 0, 0, 65, 92, 65, 216, 179, 243, 250, 247, 229, 45, 240, 254, 26, 10, 23, 254, 125, 13, 0, 0, 0, 0, 0, 0, 216, 113, 9, 0, 176, 0, 0, 0, 39, 51, 169, 231, 154, 0, 189, 47, 235, 255, 167, 247, 127, 3, 250, 17, 210, 8, 0, 0, 0, 0, 0, 0, 232, 113, 9, 0, 173, 0, 0, 0, 68, 71, 49, 231, 77, 245, 233, 252, 185, 43, 247, 253, 127, 14, 127, 255, 242, 10, 0, 0, 0, 0, 0, 0, 248, 113, 9, 0, 0, 0, 0, 0, 255, 45, 4, 233, 182, 3, 84, 37, 54, 7, 250, 250, 5, 252, 77, 24, 168, 10, 0, 0, 0, 0, 0, 0, 8, 114, 9, 0, 0, 0, 0, 0, 239, 64, 91, 231, 125, 250, 8, 239, 99, 54, 67, 1, 237, 8, 18, 1, 110, 11, 0, 0, 0, 0, 0, 0, 24, 114, 9, 0, 0, 0, 0, 0, 118, 21, 89, 9, 24, 255, 229, 230, 26, 54, 30, 11, 172, 248, 157, 15, 69, 21, 0, 0, 0, 0, 0, 0, 48, 114, 9, 0, 0, 0, 0, 0, 118, 21, 89, 9, 24, 255, 229, 230, 26, 54, 30, 11, 172, 248, 157, 15, 69, 21, 0, 0, 0, 0, 0, 0, 72, 114, 9, 0, 0, 0, 0, 0, 111, 30, 56, 12, 248, 252, 116, 222, 74, 64, 247, 7, 105, 246, 166, 15, 54, 24, 0, 0, 0, 0, 0, 0, 96, 114, 9, 0, 0, 0, 0, 0, 30, 64, 84, 232, 66, 250, 29, 242, 237, 50, 217, 1, 241, 9, 122, 0, 84, 19, 0, 0, 0, 0, 0, 0, 120, 114, 9, 0, 0, 0, 0, 0, 187, 82, 132, 223, 154, 244, 109, 252, 11, 43, 91, 255, 149, 13, 76, 255, 114, 16, 0, 0, 0, 0, 0, 0, 136, 114, 9, 0, 0, 0, 0, 0, 186, 37, 14, 243, 201, 252, 213, 235, 151, 49, 208, 10, 194, 250, 51, 7, 156, 23, 0, 0, 0, 0, 0, 0, 152, 114, 9, 0, 0, 0, 124, 15, 15, 41, 4, 241, 178, 251, 222, 228, 251, 56, 254, 9, 55, 250, 0, 7, 102, 24, 0, 0, 0, 0, 0, 0, 168, 114, 9, 0, 0, 0, 255, 15, 5, 50, 202, 237, 160, 250, 200, 226, 163, 59, 56, 9, 166, 249, 146, 8, 224, 30, 0, 0, 0, 0, 0, 0, 184, 114, 9, 0, 0, 0, 0, 0, 49, 44, 25, 242, 179, 251, 203, 240, 115, 46, 209, 8, 66, 251, 94, 9, 44, 19, 0, 0, 0, 0, 0, 0, 208, 114, 9, 0, 0, 0, 0, 0, 185, 49, 147, 237, 92, 251, 169, 250, 227, 35, 22, 10, 18, 1, 92, 3, 59, 17, 0, 0, 0, 0, 0, 0, 232, 114, 9, 0, 0, 0, 237, 15, 229, 45, 48, 240, 227, 250, 181, 248, 76, 41, 209, 5, 118, 255, 169, 5, 170, 17, 0, 0, 0, 0, 0, 0, 0, 115, 9, 0, 0, 0, 241, 14, 1, 44, 66, 239, 32, 252, 170, 237, 55, 48, 87, 10, 190, 251, 243, 5, 71, 21, 0, 0, 0, 0, 0, 0, 24, 115, 9, 0, 0, 0, 0, 0, 112, 15, 141, 8, 193, 1, 211, 229, 249, 56, 227, 8, 72, 238, 181, 28, 136, 25, 0, 0, 0, 0, 0, 0, 40, 115, 9, 0, 0, 0, 0, 0, 112, 15, 141, 8, 193, 1, 211, 229, 249, 56, 227, 8, 72, 238, 181, 28, 136, 25, 0, 0, 0, 0, 0, 0, 56, 115, 9, 0, 0, 0, 0, 0, 44, 32, 210, 6, 222, 250, 197, 223, 81, 62, 124, 9, 167, 241, 154, 22, 139, 22, 0, 0, 0, 0, 0, 0, 72, 115, 9, 0, 0, 0, 0, 0, 234, 30, 134, 5, 90, 251, 183, 221, 198, 64, 232, 8, 5, 245, 253, 17, 186, 21, 0, 0, 0, 0, 0, 0, 88, 115, 9, 0, 0, 0, 0, 0, 234, 30, 134, 5, 90, 251, 183, 221, 198, 64, 232, 8, 5, 245, 253, 17, 186, 21, 0, 0, 0, 0, 0, 0, 80, 247, 8, 0, 0, 0, 0, 0, 44, 32, 210, 6, 222, 250, 197, 223, 81, 62, 124, 9, 167, 241, 154, 22, 139, 22, 0, 0, 0, 0, 0, 0, 104, 115, 9, 0, 0, 0, 0, 0, 221, 29, 19, 10, 173, 250, 15, 222, 77, 65, 223, 7, 128, 241, 53, 23, 73, 23, 0, 0, 0, 0, 0, 0, 120, 115, 9, 0, 110, 0, 0, 0, 55, 65, 79, 241, 153, 247, 155, 0, 210, 37, 163, 0, 105, 13, 183, 3, 40, 19, 0, 0, 0, 0, 0, 0, 136, 115, 9, 0, 0, 0, 125, 15, 23, 35, 130, 244, 61, 252, 100, 230, 140, 56, 189, 8, 134, 246, 71, 11, 78, 31, 0, 0, 0, 0, 0, 0, 160, 115, 9, 0, 0, 0, 125, 15, 104, 44, 202, 240, 38, 251, 135, 230, 22, 56, 35, 9, 85, 246, 240, 11, 117, 28, 0, 0, 0, 0, 0, 0, 184, 115, 9, 0, 0, 0, 125, 15, 184, 35, 39, 245, 26, 252, 236, 229, 220, 56, 233, 8, 90, 246, 203, 11, 64, 30, 0, 0, 0, 0, 0, 0, 208, 115, 9, 0, 0, 0, 139, 15, 58, 36, 13, 246, 113, 251, 228, 223, 195, 63, 151, 7, 31, 247, 160, 10, 148, 32, 0, 0, 0, 0, 0, 0, 232, 115, 9, 0, 0, 0, 0, 0, 112, 33, 73, 246, 38, 252, 80, 224, 175, 60, 211, 10, 71, 251, 44, 5, 63, 30, 0, 0, 0, 0, 0, 0, 0, 116, 9, 0, 0, 0, 143, 15, 137, 35, 90, 245, 227, 251, 119, 224, 146, 60, 202, 10, 58, 252, 213, 3, 83, 30, 0, 0, 0, 0, 0, 0, 24, 116, 9, 0, 0, 0, 0, 0, 16, 44, 20, 242, 166, 250, 209, 237, 86, 48, 234, 8, 113, 250, 120, 8, 20, 21, 0, 0, 0, 0, 0, 0, 48, 116, 9, 0, 0, 0, 251, 15, 44, 40, 45, 243, 194, 251, 235, 224, 146, 61, 12, 9, 195, 252, 114, 3, 244, 25, 0, 0, 0, 0, 0, 0, 64, 116, 9, 0, 0, 0, 251, 15, 255, 39, 224, 243, 181, 251, 155, 224, 111, 61, 147, 9, 97, 252, 157, 3, 215, 26, 0, 0, 0, 0, 0, 0, 80, 116, 9, 0, 0, 0, 0, 0, 194, 34, 35, 252, 247, 251, 36, 243, 99, 45, 138, 6, 107, 253, 106, 12, 96, 20, 0, 0, 0, 0, 0, 0, 96, 116, 9, 0, 0, 0, 0, 0, 14, 23, 91, 252, 242, 252, 233, 220, 79, 65, 50, 9, 134, 250, 175, 5, 64, 25, 0, 0, 0, 0, 0, 0, 112, 116, 9, 0, 0, 0, 0, 0, 153, 29, 138, 247, 98, 252, 226, 226, 232, 60, 142, 7, 183, 246, 248, 10, 158, 33, 0, 0, 0, 0, 0, 0, 128, 116, 9, 0, 0, 0, 0, 0, 22, 30, 59, 247, 49, 252, 102, 220, 90, 67, 83, 7, 137, 245, 239, 11, 73, 33, 0, 0, 0, 0, 0, 0, 144, 116, 9, 0, 0, 0, 0, 0, 132, 65, 138, 237, 163, 247, 69, 226, 97, 61, 180, 7, 226, 244, 166, 13, 49, 37, 0, 0, 0, 0, 0, 0, 160, 116, 9, 0, 0, 0, 188, 15, 175, 32, 56, 247, 5, 253, 202, 221, 63, 64, 118, 9, 9, 250, 14, 6, 117, 31, 0, 0, 0, 0, 0, 0, 176, 116, 9, 0, 0, 0, 0, 0, 78, 22, 123, 252, 153, 253, 110, 222, 233, 64, 232, 7, 97, 244, 24, 16, 174, 26, 0, 0, 0, 0, 0, 0, 192, 116, 9, 0, 0, 0, 0, 0, 247, 39, 47, 245, 25, 251, 147, 223, 28, 62, 248, 9, 227, 252, 168, 2, 236, 27, 0, 0, 0, 0, 0, 0, 208, 116, 9, 0, 0, 0, 0, 0, 32, 34, 102, 246, 89, 252, 141, 220, 254, 65, 203, 8, 182, 250, 218, 4, 71, 32, 0, 0, 0, 0, 0, 0, 224, 116, 9, 0, 0, 0, 0, 0, 231, 30, 137, 247, 211, 252, 49, 235, 94, 51, 104, 9, 248, 250, 179, 9, 32, 31, 0, 0, 0, 0, 0, 0, 240, 116, 9, 0, 0, 0, 185, 15, 101, 27, 128, 250, 133, 253, 108, 235, 102, 50, 80, 10, 66, 250, 241, 10, 211, 28, 0, 0, 0, 0, 0, 0, 0, 117, 9, 0, 0, 0, 0, 0, 76, 27, 152, 250, 54, 253, 1, 234, 98, 52, 143, 9, 51, 250, 156, 8, 150, 28, 0, 0, 0, 0, 0, 0, 16, 117, 9, 0, 0, 0, 0, 0, 70, 35, 56, 248, 53, 253, 239, 222, 174, 63, 207, 8, 127, 245, 145, 12, 133, 31, 0, 0, 0, 0, 0, 0, 32, 117, 9, 0, 0, 0, 0, 0, 3, 28, 62, 248, 120, 253, 107, 224, 195, 60, 158, 10, 134, 247, 208, 9, 33, 29, 0, 0, 0, 0, 0, 0, 48, 117, 9, 0, 0, 0, 0, 0, 124, 34, 154, 246, 74, 253, 246, 236, 59, 49, 237, 9, 108, 253, 229, 5, 163, 29, 0, 0, 0, 0, 0, 0, 64, 117, 9, 0, 0, 0, 0, 0, 203, 31, 133, 247, 105, 253, 213, 221, 157, 64, 247, 8, 123, 248, 216, 7, 157, 31, 0, 0, 0, 0, 0, 0, 80, 117, 9, 0, 0, 0, 0, 0, 115, 34, 17, 246, 113, 252, 191, 220, 32, 66, 103, 8, 207, 250, 189, 4, 1, 33, 0, 0, 0, 0, 0, 0, 96, 117, 9, 0, 0, 0, 0, 0, 80, 27, 124, 249, 218, 252, 54, 224, 132, 61, 239, 9, 150, 252, 82, 3, 217, 30, 0, 0, 0, 0, 0, 0, 112, 117, 9, 0, 0, 0, 0, 0, 150, 33, 224, 244, 167, 252, 14, 234, 38, 53, 147, 8, 22, 252, 237, 6, 225, 27, 0, 0, 0, 0, 0, 0, 128, 117, 9, 0, 0, 0, 0, 0, 150, 33, 224, 244, 167, 252, 14, 234, 38, 53, 147, 8, 22, 252, 237, 6, 225, 27, 0, 0, 0, 0, 0, 0, 144, 117, 9, 0, 0, 0, 0, 0, 150, 33, 224, 244, 167, 252, 14, 234, 38, 53, 147, 8, 22, 252, 237, 6, 225, 27, 0, 0, 0, 0, 0, 0, 160, 117, 9, 0, 0, 0, 0, 15, 141, 28, 133, 250, 249, 253, 230, 222, 136, 62, 62, 10, 127, 246, 10, 11, 128, 31, 0, 0, 0, 0, 0, 0, 176, 117, 9, 0, 0, 0, 230, 61, 6, 32, 65, 247, 44, 253, 249, 236, 101, 48, 238, 10, 237, 251, 2, 8, 13, 28, 0, 0, 0, 0, 0, 0, 192, 117, 9, 0, 0, 0, 0, 0, 130, 32, 216, 243, 233, 251, 33, 231, 6, 56, 131, 8, 36, 252, 102, 6, 250, 24, 0, 0, 0, 0, 0, 0, 208, 117, 9, 0, 0, 0, 0, 0, 76, 27, 152, 250, 54, 253, 1, 234, 98, 52, 143, 9, 51, 250, 156, 8, 150, 28, 0, 0, 0, 0, 0, 0, 224, 117, 9, 0, 0, 0, 0, 0, 117, 34, 134, 244, 239, 252, 174, 239, 110, 47, 239, 8, 200, 252, 115, 6, 204, 26, 0, 0, 0, 0, 0, 0, 240, 117, 9, 0, 0, 0, 0, 0, 52, 30, 138, 246, 235, 252, 210, 223, 12, 62, 194, 9, 165, 252, 15, 3, 162, 28, 0, 0, 0, 0, 0, 0, 0, 118, 9, 0, 0, 0, 7, 62, 242, 31, 59, 247, 159, 253, 7, 237, 106, 48, 216, 10, 73, 251, 38, 8, 130, 28, 0, 0, 0, 0, 0, 0, 16, 118, 9, 0, 0, 0, 0, 0, 242, 31, 59, 247, 159, 253, 7, 237, 106, 48, 216, 10, 73, 251, 38, 8, 130, 28, 0, 0, 0, 0, 0, 0, 32, 118, 9, 0, 0, 0, 0, 0, 32, 34, 102, 246, 89, 252, 141, 220, 254, 65, 203, 8, 182, 250, 218, 4, 71, 32, 0, 0, 0, 0, 0, 0, 48, 118, 9, 0, 0, 0, 0, 0, 6, 32, 65, 247, 44, 253, 249, 236, 101, 48, 238, 10, 237, 251, 2, 8, 13, 28, 0, 0, 0, 0, 0, 0, 64, 118, 9, 0, 0, 0, 0, 0, 130, 32, 216, 243, 233, 251, 33, 231, 6, 56, 131, 8, 36, 252, 102, 6, 250, 24, 0, 0, 0, 0, 0, 0, 80, 118, 9, 0, 0, 0, 0, 0, 130, 32, 216, 243, 233, 251, 33, 231, 6, 56, 131, 8, 36, 252, 102, 6, 250, 24, 0, 0, 0, 0, 0, 0, 96, 118, 9, 0, 0, 0, 0, 0, 60, 35, 182, 244, 53, 253, 73, 238, 148, 48, 44, 9, 90, 252, 127, 7, 174, 27, 0, 0, 0, 0, 0, 0, 112, 118, 9, 0, 0, 0, 0, 0, 203, 31, 133, 247, 105, 253, 213, 221, 157, 64, 247, 8, 123, 248, 216, 7, 157, 31 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 586072), 
 allocate([ 128, 118, 9, 0, 0, 0, 0, 0, 52, 30, 138, 246, 235, 252, 210, 223, 12, 62, 194, 9, 165, 252, 15, 3, 162, 28, 0, 0, 0, 0, 0, 0, 144, 118, 9, 0, 0, 0, 0, 0, 153, 36, 133, 243, 233, 252, 120, 238, 142, 48, 253, 8, 131, 252, 4, 7, 216, 26, 0, 0, 0, 0, 0, 0, 160, 118, 9, 0, 0, 0, 0, 0, 186, 30, 196, 247, 213, 253, 251, 236, 195, 48, 121, 10, 104, 251, 21, 8, 77, 29, 0, 0, 0, 0, 0, 0, 176, 118, 9, 0, 0, 0, 0, 0, 181, 33, 150, 246, 141, 252, 161, 220, 44, 66, 123, 8, 46, 250, 83, 5, 72, 33, 0, 0, 0, 0, 0, 0, 192, 118, 9, 0, 0, 0, 0, 15, 141, 28, 133, 250, 249, 253, 230, 222, 136, 62, 62, 10, 126, 246, 10, 11, 128, 31, 0, 0, 0, 0, 0, 0, 208, 118, 9, 0, 0, 0, 221, 3, 94, 241, 115, 41, 129, 6, 149, 37, 58, 249, 66, 8, 171, 246, 170, 27, 248, 11, 78, 13, 228, 23, 12, 255, 224, 118, 9, 0, 0, 0, 221, 3, 94, 241, 115, 41, 129, 6, 149, 37, 58, 249, 66, 8, 171, 246, 170, 27, 248, 11, 78, 13, 228, 23, 12, 255, 240, 118, 9, 0, 0, 0, 221, 3, 94, 241, 115, 41, 129, 6, 149, 37, 58, 249, 66, 8, 171, 246, 170, 27, 248, 11, 78, 13, 228, 23, 12, 255, 0, 119, 9, 0, 0, 0, 0, 0, 85, 234, 242, 45, 141, 8, 182, 22, 210, 253, 14, 13, 196, 236, 112, 38, 61, 23, 176, 2, 123, 35, 96, 0, 16, 119, 9, 0, 0, 0, 0, 0, 86, 51, 200, 239, 196, 249, 209, 237, 86, 48, 234, 8, 23, 249, 136, 10, 55, 26, 0, 0, 0, 0, 0, 0, 32, 119, 9, 0, 0, 0, 0, 0, 85, 234, 242, 45, 141, 8, 182, 22, 210, 253, 14, 13, 196, 236, 112, 38, 61, 23, 176, 2, 123, 35, 96, 0, 48, 119, 9, 0, 0, 0, 0, 0, 118, 38, 219, 247, 5, 252, 50, 243, 101, 43, 122, 8, 250, 252, 86, 8, 113, 22, 0, 0, 0, 0, 0, 0, 64, 119, 9, 0, 0, 0, 0, 0, 16, 44, 20, 242, 166, 250, 209, 237, 86, 48, 234, 8, 113, 250, 120, 8, 20, 21, 0, 0, 0, 0, 0, 0, 80, 119, 9, 0, 0, 0, 0, 0, 85, 234, 242, 45, 141, 8, 182, 22, 210, 253, 14, 13, 196, 236, 112, 38, 61, 23, 176, 2, 123, 35, 96, 0, 96, 119, 9, 0, 0, 0, 0, 0, 85, 234, 242, 45, 141, 8, 182, 22, 210, 253, 14, 13, 196, 236, 112, 38, 61, 23, 176, 2, 123, 35, 96, 0, 112, 119, 9, 0, 0, 0, 0, 0, 133, 36, 85, 244, 23, 252, 17, 225, 150, 61, 218, 8, 206, 247, 120, 10, 183, 26, 0, 0, 0, 0, 0, 0, 128, 119, 9, 0, 0, 0, 0, 0, 8, 235, 214, 44, 64, 9, 161, 21, 143, 255, 76, 12, 151, 236, 37, 39, 150, 22, 10, 3, 68, 35, 211, 0, 144, 119, 9, 0, 0, 0, 0, 0, 162, 30, 240, 246, 32, 252, 38, 224, 102, 61, 39, 10, 182, 251, 62, 5, 136, 29, 0, 0, 0, 0, 0, 0, 160, 119, 9, 0, 0, 0, 0, 0, 41, 33, 233, 245, 244, 251, 141, 224, 223, 60, 83, 10, 229, 250, 127, 5, 186, 28, 0, 0, 0, 0, 0, 0, 176, 119, 9, 0, 0, 0, 0, 0, 35, 31, 246, 246, 111, 252, 253, 222, 146, 61, 78, 11, 94, 250, 240, 5, 186, 29, 0, 0, 0, 0, 0, 0, 192, 119, 9, 0, 0, 0, 0, 0, 6, 32, 65, 247, 44, 253, 249, 236, 101, 48, 238, 10, 237, 251, 2, 8, 13, 28, 0, 0, 0, 0, 0, 0, 208, 119, 9, 0, 200, 0, 0, 0, 81, 40, 176, 240, 93, 252, 66, 245, 138, 43, 32, 7, 70, 254, 9, 6, 163, 21, 0, 0, 0, 0, 0, 0, 232, 119, 9, 0, 200, 0, 0, 0, 81, 40, 176, 240, 93, 252, 66, 245, 138, 43, 32, 7, 70, 254, 9, 6, 163, 21, 0, 0, 0, 0, 0, 0, 0, 120, 9, 0, 0, 0, 0, 0, 226, 37, 217, 242, 110, 252, 158, 237, 40, 49, 64, 9, 187, 252, 200, 3, 169, 22, 0, 0, 0, 0, 0, 0, 24, 120, 9, 0, 0, 0, 0, 0, 168, 44, 161, 241, 169, 251, 159, 243, 231, 43, 154, 8, 233, 252, 100, 5, 103, 17, 0, 0, 0, 0, 0, 0, 48, 120, 9, 0, 0, 0, 0, 0, 45, 43, 83, 239, 0, 252, 72, 248, 198, 39, 40, 8, 242, 253, 239, 4, 117, 17, 0, 0, 0, 0, 0, 0, 72, 120, 9, 0, 200, 0, 0, 0, 81, 40, 176, 240, 93, 252, 66, 245, 138, 43, 32, 7, 70, 254, 9, 6, 163, 21, 0, 0, 0, 0, 0, 0, 96, 120, 9, 0, 200, 0, 0, 0, 81, 40, 176, 240, 93, 252, 66, 245, 138, 43, 32, 7, 70, 254, 9, 6, 163, 21, 0, 0, 0, 0, 0, 0, 120, 120, 9, 0, 0, 0, 0, 0, 70, 23, 233, 249, 197, 253, 75, 240, 189, 44, 123, 11, 134, 253, 12, 6, 223, 19, 0, 0, 0, 0, 0, 0, 136, 120, 9, 0, 0, 0, 0, 0, 70, 23, 233, 249, 197, 253, 75, 240, 189, 44, 123, 11, 134, 253, 12, 6, 223, 19, 0, 0, 0, 0, 0, 0, 152, 120, 9, 0, 0, 0, 0, 0, 61, 10, 168, 252, 244, 1, 137, 238, 57, 34, 79, 22, 215, 250, 84, 10, 169, 46, 0, 0, 0, 0, 0, 0, 168, 120, 9, 0, 200, 0, 0, 0, 212, 25, 194, 250, 150, 253, 246, 242, 47, 43, 63, 10, 82, 255, 0, 7, 211, 19, 0, 0, 0, 0, 0, 0, 184, 120, 9, 0, 0, 0, 0, 0, 188, 25, 231, 250, 75, 253, 51, 243, 235, 42, 74, 10, 157, 254, 224, 7, 242, 19, 0, 0, 0, 0, 0, 0, 200, 120, 9, 0, 0, 0, 0, 0, 188, 25, 231, 250, 75, 253, 51, 243, 235, 42, 74, 10, 157, 254, 224, 7, 242, 19, 0, 0, 0, 0, 0, 0, 216, 120, 9, 0, 0, 0, 0, 0, 188, 25, 231, 250, 75, 253, 51, 243, 235, 42, 74, 10, 157, 254, 224, 7, 242, 19, 0, 0, 0, 0, 0, 0, 232, 120, 9, 0, 0, 0, 0, 0, 34, 35, 149, 245, 159, 252, 14, 238, 36, 48, 248, 9, 69, 253, 250, 6, 116, 24, 0, 0, 0, 0, 0, 0, 248, 120, 9, 0, 0, 0, 0, 0, 12, 41, 204, 243, 7, 251, 65, 232, 214, 55, 109, 7, 139, 249, 2, 9, 93, 24, 0, 0, 0, 0, 0, 0, 8, 121, 9, 0, 0, 0, 0, 0, 205, 40, 222, 242, 229, 250, 18, 226, 74, 61, 10, 8, 145, 251, 152, 4, 178, 29, 0, 0, 0, 0, 0, 0, 24, 121, 9, 0, 0, 0, 0, 0, 12, 40, 53, 242, 185, 251, 54, 228, 2, 58, 132, 9, 85, 250, 187, 6, 221, 24, 0, 0, 0, 0, 0, 0, 40, 121, 9, 0, 0, 0, 0, 0, 41, 42, 49, 241, 134, 251, 182, 226, 73, 59, 184, 9, 146, 250, 41, 6, 153, 28, 0, 0, 0, 0, 0, 0, 56, 121, 9, 0, 0, 0, 0, 0, 158, 33, 51, 246, 10, 252, 210, 223, 98, 61, 143, 10, 82, 252, 211, 3, 80, 30, 0, 0, 0, 0, 0, 0, 72, 121, 9, 0, 0, 0, 252, 15, 201, 49, 108, 238, 120, 250, 82, 232, 206, 56, 44, 6, 114, 248, 208, 8, 203, 25, 0, 0, 0, 0, 0, 0, 88, 121, 9, 0, 0, 0, 0, 0, 70, 46, 97, 237, 79, 252, 141, 228, 6, 62, 65, 4, 117, 245, 26, 16, 119, 32, 0, 0, 0, 0, 0, 0, 104, 121, 9, 0, 0, 0, 252, 15, 117, 51, 132, 237, 37, 250, 81, 233, 212, 54, 103, 7, 3, 248, 148, 9, 230, 27, 0, 0, 0, 0, 0, 0, 120, 121, 9, 0, 0, 0, 0, 0, 148, 30, 31, 249, 164, 254, 100, 233, 247, 54, 38, 7, 219, 244, 166, 17, 157, 25, 0, 0, 0, 0, 0, 0, 136, 121, 9, 0, 0, 0, 0, 0, 1, 35, 87, 246, 196, 251, 213, 224, 118, 62, 19, 8, 241, 246, 219, 11, 57, 32, 0, 0, 0, 0, 0, 0, 152, 121, 9, 0, 0, 0, 188, 15, 208, 31, 187, 248, 169, 251, 173, 225, 22, 62, 137, 7, 183, 248, 238, 9, 183, 29, 0, 0, 0, 0, 0, 0, 168, 121, 9, 0, 0, 0, 153, 15, 15, 37, 197, 244, 165, 251, 147, 226, 246, 60, 218, 7, 174, 249, 52, 8, 221, 28, 0, 0, 0, 0, 0, 0, 184, 121, 9, 0, 0, 0, 0, 0, 25, 24, 53, 250, 235, 255, 61, 228, 169, 57, 232, 9, 168, 244, 252, 13, 120, 33, 0, 0, 0, 0, 0, 0, 200, 121, 9, 0, 0, 0, 106, 15, 152, 34, 234, 245, 254, 251, 175, 225, 150, 61, 34, 8, 39, 248, 15, 10, 45, 29, 0, 0, 0, 0, 0, 0, 216, 121, 9, 0, 0, 0, 215, 15, 42, 34, 135, 246, 185, 251, 86, 226, 252, 60, 25, 8, 12, 249, 5, 9, 248, 28, 0, 0, 0, 0, 0, 0, 232, 121, 9, 0, 0, 0, 210, 15, 41, 34, 135, 246, 185, 251, 86, 226, 253, 60, 25, 8, 12, 249, 5, 9, 248, 28, 0, 0, 0, 0, 0, 0, 248, 121, 9, 0, 0, 0, 0, 0, 200, 31, 80, 248, 213, 254, 151, 234, 174, 53, 79, 7, 4, 246, 109, 16, 230, 25, 0, 0, 0, 0, 0, 0, 8, 122, 9, 0, 0, 0, 106, 15, 81, 34, 31, 246, 247, 251, 41, 226, 8, 61, 64, 8, 9, 249, 252, 8, 137, 30, 0, 0, 0, 0, 0, 0, 24, 122, 9, 0, 0, 0, 210, 15, 152, 32, 238, 246, 4, 252, 84, 226, 19, 61, 0, 8, 44, 249, 221, 8, 119, 28, 0, 0, 0, 0, 0, 0, 40, 122, 9, 0, 0, 0, 236, 14, 192, 43, 57, 241, 211, 250, 32, 238, 49, 49, 158, 8, 73, 253, 206, 6, 80, 29, 0, 0, 0, 0, 0, 0, 56, 122, 9, 0, 0, 0, 175, 15, 5, 33, 106, 247, 188, 251, 71, 226, 65, 61, 216, 7, 67, 249, 33, 9, 144, 30, 0, 0, 0, 0, 0, 0, 72, 122, 9, 0, 0, 0, 175, 15, 5, 33, 106, 247, 188, 251, 71, 226, 65, 61, 216, 7, 67, 249, 33, 9, 144, 30, 0, 0, 0, 0, 0, 0, 88, 122, 9, 0, 0, 0, 253, 15, 151, 32, 254, 247, 3, 252, 221, 225, 89, 61, 55, 8, 217, 248, 76, 9, 43, 32, 0, 0, 0, 0, 0, 0, 104, 122, 9, 0, 0, 0, 253, 15, 151, 32, 254, 247, 3, 252, 221, 225, 89, 61, 55, 8, 217, 248, 76, 9, 43, 32, 0, 0, 0, 0, 0, 0, 120, 122, 9, 0, 0, 0, 0, 0, 151, 29, 145, 247, 197, 253, 118, 241, 77, 44, 165, 10, 102, 250, 3, 11, 127, 24, 0, 0, 0, 0, 0, 0, 136, 122, 9, 0, 0, 0, 0, 0, 188, 32, 186, 245, 129, 253, 185, 244, 229, 41, 192, 9, 141, 253, 147, 5, 62, 21, 0, 0, 0, 0, 0, 0, 152, 122, 9, 0, 0, 0, 0, 0, 145, 44, 224, 240, 143, 250, 36, 238, 213, 49, 211, 7, 59, 253, 18, 7, 247, 28, 0, 0, 0, 0, 0, 0, 168, 122, 9, 0, 0, 0, 0, 0, 144, 44, 63, 239, 65, 251, 66, 239, 97, 48, 70, 8, 125, 254, 187, 5, 107, 30, 0, 0, 0, 0, 0, 0, 184, 122, 9, 0, 0, 0, 243, 12, 182, 58, 80, 234, 242, 248, 109, 240, 99, 48, 231, 6, 176, 253, 134, 6, 111, 27, 0, 0, 0, 0, 0, 0, 200, 122, 9, 0, 0, 0, 0, 0, 151, 29, 145, 247, 197, 253, 118, 241, 77, 44, 165, 10, 102, 250, 3, 11, 127, 24, 0, 0, 0, 0, 0, 0, 216, 122, 9, 0, 0, 0, 203, 15, 188, 32, 186, 245, 129, 253, 185, 244, 229, 41, 192, 9, 141, 253, 147, 5, 62, 21, 0, 0, 0, 0, 0, 0, 232, 122, 9, 0, 0, 0, 0, 0, 188, 32, 186, 245, 129, 253, 185, 244, 229, 41, 192, 9, 141, 253, 147, 5, 62, 21, 0, 0, 0, 0, 0, 0, 248, 122, 9, 0, 0, 0, 0, 0, 237, 35, 138, 243, 109, 253, 210, 245, 78, 42, 247, 7, 54, 254, 226, 4, 82, 21, 0, 0, 0, 0, 0, 0, 8, 123, 9, 0, 0, 0, 0, 0, 151, 29, 145, 247, 197, 253, 118, 241, 77, 44, 165, 10, 102, 250, 3, 11, 127, 24, 0, 0, 0, 0, 0, 0, 24, 123, 9, 0, 0, 0, 0, 0, 188, 32, 186, 245, 129, 253, 185, 244, 229, 41, 192, 9, 141, 253, 147, 5, 62, 21, 0, 0, 0, 0, 0, 0, 40, 123, 9, 0, 0, 0, 0, 0, 188, 32, 186, 245, 129, 253, 185, 244, 229, 41, 192, 9, 141, 253, 147, 5, 62, 21, 0, 0, 0, 0, 0, 0, 56, 123, 9, 0, 0, 0, 0, 0, 7, 30, 64, 248, 162, 253, 25, 239, 152, 46, 161, 10, 155, 250, 35, 9, 52, 25, 0, 0, 0, 0, 0, 0, 72, 123, 9, 0, 0, 0, 0, 0, 206, 36, 70, 243, 57, 253, 161, 245, 146, 42, 223, 7, 0, 254, 74, 5, 136, 21, 0, 0, 0, 0, 0, 0, 96, 123, 9, 0, 0, 0, 225, 15, 188, 32, 186, 245, 129, 253, 185, 244, 229, 41, 192, 9, 141, 253, 147, 5, 62, 21, 0, 0, 0, 0, 0, 0, 112, 123, 9, 0, 0, 0, 0, 0, 172, 39, 159, 242, 203, 251, 205, 245, 169, 43, 88, 6, 127, 254, 56, 6, 216, 19, 0, 0, 0, 0, 0, 0, 128, 123, 9, 0, 0, 0, 0, 0, 46, 47, 28, 237, 211, 251, 241, 229, 226, 55, 18, 10, 238, 252, 171, 3, 250, 28, 0, 0, 0, 0, 0, 0, 144, 123, 9, 0, 0, 0, 0, 0, 246, 45, 163, 238, 213, 251, 11, 229, 85, 56, 147, 10, 251, 251, 193, 4, 148, 29, 0, 0, 0, 0, 0, 0, 160, 123, 9, 0, 0, 0, 255, 15, 21, 37, 169, 242, 102, 253, 165, 235, 46, 48, 188, 12, 244, 249, 214, 8, 82, 25, 0, 0, 0, 0, 0, 0, 176, 123, 9, 0, 0, 0, 254, 15, 97, 41, 233, 241, 14, 252, 7, 233, 71, 51, 12, 12, 80, 251, 13, 7, 65, 26, 0, 0, 0, 0, 0, 0, 192, 123, 9, 0, 0, 0, 254, 15, 77, 45, 90, 240, 231, 251, 200, 234, 255, 49, 141, 11, 251, 251, 214, 6, 116, 25, 0, 0, 0, 0, 0, 0, 208, 123, 9, 0, 0, 0, 249, 15, 163, 42, 163, 241, 42, 252, 45, 234, 186, 50, 95, 11, 112, 251, 176, 7, 79, 24, 0, 0, 0, 0, 0, 0, 224, 123, 9, 0, 0, 0, 0, 0, 2, 45, 52, 240, 134, 251, 128, 237, 140, 47, 88, 11, 36, 252, 37, 7, 151, 23, 0, 0, 0, 0, 0, 0, 240, 123, 9, 0, 0, 0, 0, 0, 168, 32, 140, 246, 144, 252, 168, 240, 65, 48, 203, 6, 155, 250, 112, 9, 53, 20, 0, 0, 0, 0, 0, 0, 0, 124, 9, 0, 0, 0, 0, 0, 162, 44, 193, 239, 154, 251, 238, 247, 182, 41, 57, 6, 136, 255, 47, 5, 134, 19, 0, 0, 0, 0, 0, 0, 16, 124, 9, 0, 0, 0, 0, 0, 49, 38, 101, 242, 99, 252, 186, 244, 33, 44, 8, 7, 166, 253, 127, 6, 14, 20, 0, 0, 0, 0, 0, 0, 32, 124, 9, 0, 0, 0, 0, 0, 149, 42, 1, 240, 206, 251, 139, 251, 248, 35, 245, 8, 194, 255, 137, 5, 38, 20, 0, 0, 0, 0, 0, 0, 48, 124, 9, 0, 0, 0, 0, 0, 49, 38, 101, 242, 99, 252, 186, 244, 33, 44, 8, 7, 166, 253, 127, 6, 14, 20, 0, 0, 0, 0, 0, 0, 40, 149, 4, 0, 0, 0, 0, 0, 238, 49, 37, 240, 133, 254, 34, 254, 106, 35, 133, 5, 60, 5, 233, 5, 56, 20, 0, 0, 0, 0, 0, 0, 64, 124, 9, 0, 0, 0, 0, 0, 8, 41, 122, 246, 91, 251, 101, 222, 79, 63, 227, 9, 2, 252, 95, 3, 210, 47, 0, 0, 0, 0, 0, 0, 80, 124, 9, 0, 0, 0, 0, 0, 77, 42, 234, 244, 165, 251, 109, 223, 201, 61, 136, 10, 187, 252, 168, 2, 163, 46, 0, 0, 0, 0, 0, 0, 96, 124, 9, 0, 0, 0, 0, 0, 8, 41, 122, 246, 91, 251, 101, 222, 79, 63, 227, 9, 2, 252, 95, 3, 210, 47, 0, 0, 0, 0, 0, 0, 112, 124, 9, 0, 0, 0, 0, 0, 131, 40, 227, 246, 74, 251, 16, 222, 103, 63, 42, 10, 50, 251, 92, 4, 18, 44, 0, 0, 0, 0, 0, 0, 128, 124, 9, 0, 0, 0, 0, 0, 179, 37, 245, 247, 91, 251, 79, 221, 128, 64, 183, 9, 76, 250, 65, 5, 191, 41, 0, 0, 0, 0, 0, 0, 144, 124, 9, 0, 0, 0, 0, 0, 94, 37, 209, 244, 221, 252, 254, 227, 68, 59, 64, 8, 206, 252, 35, 3, 233, 37, 0, 0, 0, 0, 0, 0, 160, 124, 9, 0, 0, 0, 0, 0, 87, 43, 171, 243, 212, 250, 71, 223, 218, 61, 160, 10, 172, 251, 179, 3, 168, 45, 0, 0, 0, 0, 0, 0, 176, 124, 9, 0, 0, 0, 0, 0, 211, 36, 102, 245, 156, 252, 187, 226, 220, 62, 93, 5, 105, 247, 192, 12, 12, 28, 0, 0, 0, 0, 0, 0, 192, 124, 9, 0, 0, 0, 0, 0, 226, 35, 138, 245, 117, 252, 11, 222, 133, 64, 212, 8, 151, 251, 70, 4, 76, 33, 0, 0, 0, 0, 0, 0, 208, 124, 9, 0, 0, 0, 0, 0, 49, 43, 236, 241, 125, 251, 224, 235, 246, 50, 25, 9, 230, 254, 119, 1, 168, 31, 0, 0, 0, 0, 0, 0, 224, 124, 9, 0, 0, 0, 0, 0, 49, 43, 236, 241, 125, 251, 224, 235, 246, 50, 25, 9, 230, 254, 119, 1, 168, 31, 0, 0, 0, 0, 0, 0, 240, 124, 9, 0, 0, 0, 0, 0, 139, 34, 235, 244, 143, 253, 95, 236, 100, 49, 108, 10, 101, 254, 210, 4, 242, 28, 0, 0, 0, 0, 0, 0, 0, 125, 9, 0, 0, 0, 0, 0, 167, 38, 251, 243, 174, 252, 72, 235, 235, 50, 217, 9, 141, 252, 232, 6, 24, 27, 0, 0, 0, 0, 0, 0, 16, 125, 9, 0, 0, 0, 0, 0, 247, 28, 252, 247, 47, 253, 190, 235, 244, 49, 122, 10, 90, 250, 109, 8, 117, 26, 0, 0, 0, 0, 0, 0, 32, 125, 9, 0, 0, 0, 0, 0, 234, 31, 91, 245, 129, 253, 168, 238, 241, 46, 184, 10, 253, 252, 185, 5, 199, 25, 0, 0, 0, 0, 0, 0, 48, 125, 9, 0, 0, 0, 0, 0, 9, 34, 239, 244, 25, 253, 10, 239, 124, 46, 212, 10, 46, 253, 7, 6, 103, 24, 0, 0, 0, 0, 0, 0, 64, 125, 9, 0, 0, 0, 0, 0, 182, 35, 125, 244, 90, 253, 56, 222, 71, 66, 127, 6, 80, 247, 82, 11, 167, 33, 0, 0, 0, 0, 0, 0, 80, 125, 9, 0, 0, 0, 0, 0, 64, 33, 117, 243, 237, 252, 185, 239, 190, 46, 183, 9, 130, 253, 8, 5, 166, 23, 0, 0, 0, 0, 0, 0, 96, 125, 9, 0, 0, 0, 0, 0, 202, 20, 109, 247, 41, 0, 151, 241, 198, 34, 180, 18, 166, 252, 39, 7, 33, 31, 0, 0, 0, 0, 0, 0, 112, 125, 9, 0, 0, 0, 0, 0, 195, 50, 39, 234, 173, 251, 169, 248, 155, 39, 235, 7, 192, 255, 209, 4, 55, 19, 0, 0, 0, 0, 0, 0, 128, 125, 9, 0, 0, 0, 0, 62, 150, 41, 247, 241, 122, 251, 255, 242, 179, 45, 39, 7, 101, 253, 58, 11, 143, 24, 0, 0, 0, 0, 0, 0, 144, 125, 9, 0, 15, 0, 0, 0, 66, 34, 134, 243, 204, 252, 201, 244, 17, 44, 11, 7, 255, 253, 16, 6, 82, 17, 0, 0, 0, 0, 0, 0, 168, 125, 9, 0, 0, 0, 127, 15, 26, 35, 61, 245, 222, 252, 59, 231, 7, 53, 5, 12, 60, 250, 96, 8, 235, 24, 0, 0, 0, 0, 0, 0, 192, 125, 9, 0, 0, 0, 0, 0, 204, 38, 12, 244, 89, 252, 79, 233, 19, 52, 193, 10, 13, 251, 107, 8, 199, 21, 0, 0, 0, 0, 0, 0, 216, 125, 9, 0, 15, 0, 150, 15, 125, 39, 96, 242, 31, 252, 220, 234, 12, 50, 100, 11, 231, 250, 92, 8, 167, 21, 0, 0, 0, 0, 0, 0, 240, 125, 9, 0, 0, 0, 148, 15, 224, 42, 67, 240, 139, 251, 18, 225, 131, 60, 40, 10, 122, 249, 23, 8, 54, 32, 0, 0, 0, 0, 0, 0, 8, 126, 9, 0, 15, 0, 0, 0, 210, 38, 36, 245, 134, 252, 4, 238, 105, 48, 176, 9, 163, 251, 0, 9, 12, 18, 0, 0, 0, 0, 0, 0, 32, 126, 9, 0, 15, 0, 0, 0, 71, 53, 97, 234, 165, 250, 94, 249, 161, 37, 126, 9, 60, 1, 128, 4, 12, 16, 0, 0, 0, 0, 0, 0, 56, 126, 9, 0, 0, 0, 0, 0, 226, 30, 107, 245, 174, 253, 169, 231, 39, 52, 148, 12, 126, 248, 71, 10, 137, 25, 0, 0, 0, 0, 0, 0, 80, 126, 9, 0, 15, 0, 0, 0, 12, 45, 28, 239, 214, 251, 185, 246, 95, 42, 213, 6, 204, 253, 163, 6, 255, 16, 0, 0, 0, 0, 0, 0, 104, 126, 9, 0, 0, 0, 0, 0, 226, 30, 107, 245, 174, 253, 169, 231, 39, 52, 148, 12, 126, 248, 71, 10, 137, 25, 0, 0, 0, 0, 0, 0, 120, 126, 9, 0, 15, 0, 150, 15, 89, 31, 106, 248, 230, 251, 16, 225, 32, 62, 52, 8, 104, 246, 189, 11, 127, 27, 0, 0, 0, 0, 0, 0, 144, 126, 9, 0, 0, 0, 127, 15, 118, 31, 163, 248, 255, 251, 99, 223, 239, 63, 248, 7, 11, 245, 214, 13, 205, 29, 0, 0, 0, 0, 0, 0, 168, 126, 9, 0, 0, 0, 127, 15, 118, 31, 163, 248, 255, 251, 99, 223, 239, 63, 248, 7, 11, 245, 214, 13, 205, 29, 0, 0, 0, 0, 0, 0, 184, 126, 9, 0, 0, 0, 0, 0, 76, 44, 27, 240, 5, 251, 125, 226, 162, 59, 144, 9, 112, 244, 98, 13, 5, 30, 0, 0, 0, 0, 0, 0, 208, 126, 9, 0, 0, 0, 0, 0, 76, 44, 27, 240, 5, 251, 125, 226, 162, 59, 144, 9, 112, 244, 98, 13, 5, 30, 0, 0, 0, 0, 0, 0, 224, 126, 9, 0, 15, 0, 0, 0, 140, 34, 46, 242, 0, 253, 131, 241, 242, 45, 152, 8, 70, 253, 0, 7, 100, 20, 0, 0, 0, 0, 0, 0, 248, 126, 9, 0, 15, 0, 0, 0, 140, 34, 46, 242, 0, 253, 131, 241, 242, 45, 152, 8, 70, 253, 0, 7, 100, 20, 0, 0, 0, 0, 0, 0, 16, 127, 9, 0, 15, 0, 0, 0, 163, 36, 61, 243, 208, 252, 101, 243, 40, 45, 89, 7, 98, 252, 136, 7, 220, 20, 0, 0, 0, 0, 0, 0, 40, 127, 9, 0, 15, 0, 0, 0, 163, 36, 61, 243, 208, 252, 101, 243, 40, 45, 89, 7, 98, 252, 136, 7, 220, 20, 0, 0, 0, 0, 0, 0, 64, 127, 9, 0, 0, 0, 127, 15, 208, 41, 165, 239, 50, 251, 134, 223, 80, 62, 197, 9, 104, 252, 177, 3, 223, 34, 0, 0, 0, 0, 0, 0, 88, 127, 9, 0, 0, 0, 127, 15, 208, 41, 165, 239, 50, 251, 134, 223, 80, 62, 197, 9, 104, 252, 177, 3, 223, 34, 0, 0, 0, 0, 0, 0, 104, 127, 9, 0, 0, 0, 0, 0, 112, 31, 6, 245, 145, 253, 206, 230, 207, 52, 200, 12, 92, 249, 98, 8, 137, 27, 0, 0, 0, 0, 0, 0, 128, 127, 9, 0, 0, 0, 0, 0, 112, 31, 6, 245, 145, 253, 206, 230, 207, 52, 200, 12, 92, 249, 98, 8, 137, 27, 0, 0, 0, 0, 0, 0, 144, 127, 9, 0, 15, 0, 0, 0, 192, 31, 148, 245, 113, 253, 10, 232, 251, 51, 89, 12, 10, 249, 8, 10, 195, 23, 0, 0, 0, 0, 0, 0, 168, 127, 9, 0, 15, 0, 0, 0, 192, 31, 148, 245, 113, 253, 10, 232, 251, 51, 89, 12, 10, 249, 8, 10, 195, 23, 0, 0, 0, 0, 0, 0, 184, 127, 9, 0, 15, 0, 0, 0, 157, 42, 57, 239, 76, 252, 203, 250, 90, 36, 95, 9, 22, 0, 202, 6, 230, 17, 0, 0, 0, 0, 0, 0, 208, 127, 9, 0, 15, 0, 0, 0, 157, 42, 57, 239, 76, 252, 203, 250, 90, 36, 95, 9, 22, 0, 202, 6, 230, 17, 0, 0, 0, 0, 0, 0, 224, 127, 9, 0, 15, 0, 0, 0, 164, 39, 97, 241, 33, 252, 235, 244, 102, 44, 123, 6, 67, 253, 101, 7, 35, 19, 0, 0, 0, 0, 0, 0, 248, 127, 9, 0, 15, 0, 0, 0, 164, 39, 97, 241, 33, 252, 235, 244, 102, 44, 123, 6, 67, 253, 101, 7, 35, 19, 0, 0, 0, 0, 0, 0, 8, 128, 9, 0, 15, 0, 0, 0, 150, 30, 120, 245, 5, 253, 3, 243, 147, 45, 74, 7, 127, 253, 176, 6, 216, 18, 0, 0, 0, 0, 0, 0, 32, 128, 9, 0, 15, 0, 0, 0, 150, 30, 120, 245, 5, 253, 3, 243, 147, 45, 74, 7, 127, 253, 176, 6, 216, 18, 0, 0, 0, 0, 0, 0, 56, 128, 9, 0, 15, 0, 255, 15, 69, 63, 254, 231, 31, 249, 167, 246, 13, 42, 77, 7, 110, 1, 190, 8, 128, 20, 0, 0, 0, 0, 0, 0, 80, 128, 9, 0, 15, 0, 255, 15, 69, 63, 254, 231, 31, 249, 167, 246, 13, 42, 77, 7, 110, 1, 190, 8, 128, 20, 0, 0, 0, 0, 0, 0, 96, 128, 9, 0, 15, 0, 255, 15, 128, 46, 67, 238, 91, 251, 205, 246, 147, 42, 126, 6, 216, 254, 50, 6, 193, 16, 0, 0, 0, 0, 0, 0, 120, 128, 9, 0, 15, 0, 255, 15, 128, 46, 67, 238, 91, 251, 205, 246, 147, 42, 126, 6, 216, 254, 50, 6, 193, 16, 0, 0, 0, 0, 0, 0, 136, 128, 9, 0, 15, 0, 255, 15, 176, 31, 253, 245, 28, 253, 110, 241, 8, 46, 149, 8, 83, 252, 27, 8, 69, 19, 0, 0, 0, 0, 0, 0, 160, 128, 9, 0, 15, 0, 255, 15, 176, 31, 253, 245, 28, 253, 110, 241, 8, 46, 149, 8, 83, 252, 27, 8, 69, 19, 0, 0, 0, 0, 0, 0, 176, 128, 9, 0, 15, 0, 255, 15, 122, 35, 165, 244, 99, 252, 25, 232, 65, 52, 242, 11, 251, 248, 81, 10, 233, 21, 0, 0, 0, 0, 0, 0, 200, 128, 9, 0, 0, 0, 0, 0, 129, 39, 184, 242, 166, 251, 99, 237, 139, 49, 13, 9, 135, 254, 157, 5, 54, 26, 0, 0, 0, 0, 0, 0, 224, 128, 9, 0, 15, 0, 148, 15, 7, 32, 239, 247, 224, 251, 68, 224, 28, 63, 241, 7, 102, 246, 206, 11, 52, 28, 0, 0, 0, 0, 0, 0, 248, 128, 9, 0, 15, 0, 60, 15, 129, 39, 184, 242, 166, 251, 99, 237, 139, 49, 13, 9, 135, 254, 157, 5, 54, 26, 0, 0, 0, 0, 0, 0, 16, 129, 9, 0, 15, 0, 255, 15, 107, 26, 129, 248, 161, 252, 228, 240, 251, 44, 124, 10, 64, 251, 83, 9, 247, 22, 0, 0, 0, 0, 0, 0, 40, 129, 9, 0, 15, 0, 255, 15, 118, 30, 254, 245, 28, 253, 217, 240, 64, 45, 53, 10, 225, 251, 200, 8, 58, 21, 0, 0, 0, 0, 0, 0, 64, 129, 9, 0, 15, 0, 255, 15, 102, 32, 181, 244, 117, 253, 227, 240, 70, 45, 35, 10, 97, 251, 219, 8, 232, 20, 0, 0, 0, 0, 0, 0, 88, 129, 9, 0, 15, 0, 146, 15, 208, 30, 146, 248, 13, 252, 86, 224, 213, 62, 51, 8, 207, 246, 50, 11, 162, 28, 0, 0, 0, 0, 0, 0, 112, 129, 9, 0, 15, 0, 255, 15, 208, 30, 146, 248, 13, 252, 86, 224, 213, 62, 51, 8, 207, 246, 50, 11, 162, 28, 0, 0, 0, 0, 0, 0, 136, 129, 9, 0, 15, 0, 255, 15, 91, 35, 92, 246, 76, 251, 164, 235, 220, 51, 73, 8, 83, 251, 206, 9, 234, 26, 0, 0, 0, 0, 0, 0, 160, 129, 9, 0, 15, 0, 255, 15, 36, 32, 127, 244, 108, 253, 158, 240, 16, 46, 126, 9, 186, 251, 230, 8, 161, 22, 0, 0, 0, 0, 0, 0, 184, 129, 9, 0, 15, 0, 0, 0, 194, 31, 15, 245, 78, 252, 64, 242, 25, 44, 248, 9, 222, 250, 207, 9, 159, 22, 0, 0, 0, 0, 0, 0, 208, 129, 9, 0, 15, 0, 0, 0, 186, 29, 36, 245, 192, 253, 250, 237, 163, 47, 173, 10, 161, 250, 89, 9, 90, 25, 0, 0, 0, 0, 0, 0, 232, 129, 9, 0, 15, 0, 146, 15, 155, 24, 70, 250, 236, 253, 121, 230, 28, 54, 153, 11, 229, 246, 40, 12, 96, 23, 0, 0, 0, 0, 0, 0, 0, 130, 9, 0, 15, 0, 149, 15, 100, 30, 150, 246, 218, 252, 183, 240, 204, 45, 180, 9, 6, 252, 86, 9, 178, 20, 0, 0, 0, 0, 0, 0, 24, 130, 9, 0, 15, 0, 0, 0, 159, 25, 40, 249, 21, 254, 168, 241, 143, 44, 26, 10, 62, 252, 83, 7, 10, 20, 0, 0, 0, 0, 0, 0, 48, 130, 9, 0, 15, 0, 0, 0, 210, 27, 196, 247, 0, 254, 173, 243, 193, 43, 183, 8, 227, 253, 143, 5, 181, 19, 0, 0, 0, 0, 0, 0, 72, 130, 9, 0, 15, 0, 0, 0, 114, 26, 153, 248, 24, 253, 144, 235, 89, 51, 255, 8, 128, 249, 131, 10, 71, 22, 0, 0, 0, 0, 0, 0, 96, 130, 9, 0, 15, 0, 0, 0, 46, 32, 84, 243, 89, 253, 175, 240, 38, 46, 80, 9, 188, 252, 230, 7, 220, 22, 0, 0, 0, 0, 0, 0, 120, 130, 9, 0, 15, 0, 0, 0, 107, 26, 129, 248, 161, 252, 228, 240, 251, 44, 124, 10, 64, 251, 83, 9, 247, 22, 0, 0, 0, 0, 0, 0, 144, 130, 9, 0, 15, 0, 0, 0, 186, 29, 36, 245, 192, 253, 250, 237, 163, 47, 173, 10, 161, 250, 89, 9, 90, 25, 0, 0, 0, 0, 0, 0, 168, 130, 9, 0, 15, 0, 0, 0, 159, 33, 250, 244, 216, 252, 85, 241, 154, 46, 1, 8, 204, 252, 12, 8, 104, 20, 0, 0, 0, 0, 0, 0, 192, 130, 9, 0, 15, 0, 0, 0, 159, 33, 250, 244, 216, 252, 85, 241, 154, 46, 1, 8, 204, 252, 12, 8, 104, 20, 0, 0, 0, 0, 0, 0, 216, 130, 9, 0, 15, 0, 0, 0, 98, 34, 193, 243, 235, 252, 177, 243, 204, 44, 112, 7, 218, 253, 209, 6, 202, 18, 0, 0, 0, 0, 0, 0, 240, 130, 9, 0, 15, 0, 0, 0, 98, 34, 193, 243, 235, 252, 177, 243, 204, 44, 112, 7, 218, 253, 209, 6, 202, 18, 0, 0, 0, 0, 0, 0, 8, 131, 9, 0, 0, 0, 0, 0, 33, 5, 63, 7, 147, 255, 197, 229, 36, 62, 40, 3, 185, 254, 48, 7, 132, 23, 0, 0, 0, 0, 0, 0, 24, 131, 9, 0, 0, 0, 0, 0, 89, 11, 220, 2, 19, 255, 58, 224, 242, 64, 196, 5, 34, 244, 157, 16, 93, 29, 0, 0, 0, 0, 0, 0, 40, 131, 9, 0, 0, 0, 0, 0, 89, 11, 220, 2, 19, 255, 58, 224, 242, 64, 196, 5, 34, 244, 157, 16, 93, 29, 0, 0, 0, 0, 0, 0, 56, 131, 9, 0, 0, 0, 0, 0, 164, 17, 11, 255, 219, 255, 148, 228, 128, 58, 125, 8, 122, 243, 63, 18, 175, 27, 0, 0, 0, 0, 0, 0, 72, 131, 9, 0, 0, 0, 0, 0, 189, 19, 232, 255, 139, 255, 204, 233, 252, 54, 166, 6, 197, 245, 140, 17, 217, 22, 0, 0, 0, 0, 0, 0, 88, 131, 9, 0, 0, 0, 0, 0, 99, 31, 179, 1, 62, 252, 143, 232, 48, 54, 16, 9, 121, 251, 249, 11, 58, 21, 0, 0, 0, 0, 0, 0, 104, 131, 9, 0, 0, 0, 0, 0, 99, 31, 179, 1, 62, 252, 143, 232, 48, 54, 16, 9, 121, 251, 249, 11, 58, 21, 0, 0, 0, 0, 0, 0, 120, 131, 9, 0, 0, 0, 0, 0, 11, 57, 230, 239, 240, 253, 238, 248, 66, 38, 225, 7, 215, 254, 203, 10, 48, 23, 0, 0, 0, 0, 0, 0, 136, 131, 9, 0, 192, 2, 255, 255, 22, 82, 45, 225, 203, 245, 16, 244, 169, 47, 88, 3, 101, 247, 5, 20, 106, 31, 0, 0, 0, 0, 0, 0, 144, 131, 9, 0, 0, 0, 0, 62, 194, 34, 62, 246, 30, 252, 184, 243, 64, 44, 18, 8, 8, 253, 101, 5, 224, 17, 0, 0, 0, 0, 0, 0, 160, 131, 9, 0, 0, 0, 255, 7, 152, 41, 199, 240, 225, 251, 26, 248, 77, 41, 132, 6, 20, 254, 75, 6, 134, 18, 0, 0, 0, 0, 0, 0, 176, 131, 9, 0, 0, 0, 0, 0, 133, 29, 38, 246, 29, 253, 185, 237, 149, 50, 102, 7, 184, 252, 241, 6, 191, 20, 0, 0, 0, 0, 0, 0, 200, 131, 9, 0, 0, 0, 0, 0, 102, 20, 84, 251, 218, 253, 116, 230, 57, 57, 217, 7, 126, 249, 3, 11, 25, 22, 0, 0, 0, 0, 0, 0, 216, 131, 9, 0, 0, 0, 0, 0, 124, 31, 139, 244, 7, 253, 104, 238, 90, 50, 226, 6, 138, 253, 209, 5, 107, 20, 0, 0, 0, 0, 0, 0, 232, 131, 9, 0, 0, 0, 0, 0, 133, 29, 38, 246, 29, 253, 185, 237, 149, 50, 102, 7, 184, 252, 241, 6, 191, 20, 0, 0, 0, 0, 0, 0, 248, 131, 9, 0, 0, 0, 0, 0, 133, 29, 38, 246, 29, 253, 185, 237, 149, 50, 102, 7, 184, 252, 241, 6, 191, 20, 0, 0, 0, 0, 0, 0, 8, 132, 9, 0, 0, 0, 255, 15, 21, 27, 36, 247, 15, 253, 199, 236, 75, 52, 111, 6, 221, 252, 105, 6, 208, 23, 0, 0, 0, 0, 0, 0, 24, 132, 9, 0, 0, 0, 0, 0, 21, 27, 36, 247, 15, 253, 199, 236, 75, 52, 111, 6, 221, 252, 105, 6, 208, 23, 0, 0, 0, 0, 0, 0, 40, 132, 9, 0, 0, 0, 0, 0, 21, 27, 36, 247, 15, 253, 199, 236, 75, 52, 111, 6, 221, 252, 105, 6, 208, 23, 0, 0, 0, 0, 0, 0, 56, 132, 9, 0, 0, 0, 0, 0, 92, 40, 94, 243, 112, 251, 33, 232, 47, 57, 240, 5, 184, 250, 87, 10, 139, 32, 0, 0, 0, 0, 0, 0, 72, 132, 9, 0, 0, 0, 0, 0, 92, 40, 94, 243, 112, 251, 33, 232, 47, 57, 240, 5, 184, 250, 87, 10, 139, 32, 0, 0, 0, 0, 0, 0, 88, 132, 9, 0, 0, 0, 0, 0, 190, 41, 54, 240, 228, 251, 245, 241, 182, 51, 20, 1, 48, 254, 235, 4, 43, 23, 0, 0, 0, 0, 0, 0, 104, 132, 9, 0, 0, 0, 0, 0, 92, 40, 94, 243, 112, 251, 33, 232, 47, 57, 240, 5, 184, 250, 87, 10, 139, 32, 0, 0, 0, 0, 0, 0, 120, 132, 9, 0, 0, 0, 0, 0, 190, 41, 54, 240, 228, 251, 245, 241, 182, 51, 20, 1, 48, 254, 235, 4, 43, 23, 0, 0, 0, 0, 0, 0, 136, 132, 9, 0, 0, 0, 255, 15, 61, 47, 27, 242, 125, 251, 24, 252, 62, 37, 197, 6, 234, 255, 251, 6, 224, 17, 0, 0, 0, 0, 0, 0, 152, 132, 9, 0, 0, 0, 0, 0, 8, 41, 122, 246, 91, 251, 101, 222, 79, 63, 227, 9, 2, 252, 95, 3, 210, 47, 0, 0, 0, 0, 0, 0, 168, 132, 9, 0, 0, 0, 0, 0, 211, 36, 102, 245, 156, 252, 187, 226, 220, 62, 93, 5, 105, 247, 192, 12, 12, 28, 0, 0, 0, 0, 0, 0, 184, 132, 9, 0, 0, 0, 0, 0, 109, 46, 128, 240, 63, 250, 138, 239, 11, 48, 124, 7, 189, 252, 119, 6, 173, 21, 0, 0, 0, 0, 0, 0, 72, 92, 9, 0, 0, 0, 0, 0, 58, 64, 116, 244, 138, 246, 195, 244, 96, 47, 238, 2, 144, 251, 178, 23, 207, 17, 0, 0, 0, 0, 0, 0, 200, 132, 9, 0, 0, 0, 0, 0, 244, 30, 138, 248, 247, 252, 222, 223, 99, 60, 182, 11, 19, 250, 151, 8, 162, 26, 182, 227, 137, 44, 153, 13, 216, 132, 9, 0, 0, 2, 0, 0, 64, 33, 175, 245, 74, 253, 150, 224, 54, 61, 222, 9, 227, 248, 69, 8, 246, 28, 0, 0, 0, 0, 0, 0, 232, 132, 9, 0, 0, 0, 0, 0, 87, 29, 245, 245, 76, 253, 42, 225, 240, 58, 244, 11, 76, 252, 87, 4, 192, 31, 0, 0, 0, 0, 0, 0, 248, 132, 9, 0, 200, 0, 0, 0, 196, 25, 225, 247, 206, 253, 82, 237, 216, 50, 141, 7, 54, 252, 45, 6, 61, 20, 0, 0, 0, 0, 0, 0, 8, 133, 9, 0, 200, 0, 0, 0, 203, 33, 62, 245, 223, 251, 120, 242, 175, 47, 93, 5, 200, 253, 118, 5, 82, 17, 0, 0, 0, 0, 0, 0, 24, 133, 9, 0, 200, 0, 0, 0, 23, 26, 223, 248, 23, 253, 73, 236, 200, 51, 161, 7, 212, 249, 118, 9, 63, 20, 0, 0, 0, 0, 0, 0, 40, 133, 9, 0, 128, 0, 0, 0, 200, 24, 180, 249, 50, 254, 1, 237, 189, 48, 121, 10, 159, 252, 250, 6, 243, 26, 0, 0, 0, 0, 0, 0, 56, 133, 9, 0, 0, 0, 235, 15, 221, 36, 5, 245, 250, 252, 43, 223, 87, 63, 242, 8, 58, 253, 84, 2, 13, 28, 0, 0, 0, 0, 0, 0, 72, 133, 9, 0, 0, 0, 0, 0, 150, 23, 52, 250, 189, 253, 71, 220, 106, 65, 208, 9, 149, 252, 234, 2, 50, 28, 0, 0, 0, 0, 0, 0, 88, 133, 9, 0, 0, 0, 0, 0, 119, 38, 237, 243, 96, 252, 219, 222, 217, 63, 177, 8, 53, 253, 83, 2, 191, 27, 0, 0, 0, 0, 0, 0, 104, 133, 9, 0, 0, 0, 0, 0, 119, 38, 237, 243, 96, 252, 219, 222, 217, 63, 177, 8, 53, 253, 83, 2, 191, 27, 0, 0, 0, 0, 0, 0, 120, 133, 9, 0, 0, 0, 0, 0, 119, 38, 237, 243, 95, 252, 219, 222, 218, 63, 177, 8, 54, 253, 83, 2, 191, 27, 0, 0, 0, 0, 0, 0, 136, 133, 9, 0, 0, 0, 252, 15, 150, 23, 52, 250, 190, 253, 70, 220, 106, 65, 209, 9, 149, 252, 234, 2, 49, 28, 0, 0, 0, 0, 0, 0, 152, 133, 9, 0, 0, 0, 0, 0, 150, 23, 52, 250, 189, 253, 71, 220, 106, 65, 208, 9, 149, 252, 234, 2, 50, 28, 0, 0, 0, 0, 0, 0, 168, 133, 9, 0, 0, 0, 0, 0, 150, 23, 52, 250, 189, 253, 71, 220, 106, 65, 208, 9, 149, 252, 234, 2, 50, 28, 0, 0, 0, 0, 0, 0, 184, 133, 9, 0, 128, 0, 235, 15, 86, 19, 188, 253, 153, 255, 148, 235, 254, 48, 213, 11, 59, 253, 155, 5, 203, 28, 0, 0, 0, 0, 0, 0, 200, 133, 9, 0, 128, 0, 235, 15, 44, 23, 44, 250, 101, 254, 51, 237, 253, 47, 40, 11, 27, 253, 244, 5, 83, 26, 0, 0, 0, 0, 0, 0, 216, 133, 9, 0, 128, 0, 235, 15, 158, 23, 153, 251, 234, 254, 58, 234, 20, 51, 226, 10, 77, 253, 139, 5, 201, 29, 0, 0, 0, 0, 0, 0, 232, 133, 9, 0, 128, 0, 235, 15, 86, 19, 188, 253, 153, 255, 148, 235, 254, 48, 213, 11, 59, 253, 155, 5, 203, 28, 0, 0, 0, 0, 0, 0, 248, 133, 9, 0, 128, 0, 0, 0, 143, 22, 219, 252, 153, 254, 130, 222, 167, 63, 87, 9, 105, 248, 37, 9, 81, 28, 0, 0, 0, 0, 0, 0, 8, 134, 9, 0, 128, 0, 0, 0, 37, 21, 118, 251, 147, 254, 223, 233, 42, 51, 50, 11, 160, 253, 155, 4, 248, 32, 0, 0, 0, 0, 0, 0, 24, 134, 9, 0, 128, 0, 0, 0, 89, 20, 208, 251, 115, 254, 115, 221, 248, 62, 103, 11, 174, 249, 11, 7, 206, 33, 0, 0, 0, 0, 0, 0, 40, 134, 9, 0, 128, 0, 0, 0, 103, 23, 60, 249, 69, 254, 252, 239, 213, 46, 77, 9, 64, 253, 187, 5, 104, 23, 0, 0, 0, 0, 0, 0, 56, 134, 9, 0, 128, 0, 0, 0, 151, 20, 56, 253, 165, 254, 247, 231, 85, 53, 203, 10, 191, 249, 62, 9, 74, 28, 0, 0, 0, 0, 0, 0, 72, 134, 9, 0, 128, 0, 0, 0, 206, 22, 106, 250, 10, 255, 87, 242, 213, 44, 249, 8, 20, 253, 93, 7, 146, 22, 0, 0, 0, 0, 0, 0, 88, 134, 9, 0, 128, 0, 0, 0, 49, 19, 227, 253, 54, 255, 14, 232, 201, 52, 90, 11, 228, 249, 103, 8, 15, 28, 0, 0, 0, 0, 0, 0, 104, 134, 9, 0, 128, 0, 0, 0, 151, 20, 56, 253, 165, 254, 247, 231, 85, 53, 203, 10, 191, 249, 62, 9, 74, 28, 0, 0, 0, 0, 0, 0, 120, 134, 9, 0, 128, 0, 0, 0, 103, 23, 80, 250, 57, 254, 100, 237, 103, 47, 164, 11, 61, 253, 145, 5, 45, 26, 0, 0, 0, 0, 0, 0, 136, 134, 9, 0, 128, 0, 0, 0, 103, 23, 80, 250, 57, 254, 100, 237, 103, 47, 164, 11, 61, 253, 145, 5, 45, 26, 0, 0, 0, 0, 0, 0, 152, 134, 9, 0, 128, 0, 0, 0, 241, 23, 247, 249, 94, 254, 190, 236, 202, 48, 183, 10, 47, 252, 157, 6, 215, 25, 0, 0, 0, 0, 0, 0, 168, 134, 9, 0, 128, 0, 0, 0, 241, 23, 247, 249, 94, 254, 190, 236, 202, 48, 183, 10, 47, 252, 157, 6, 215, 25, 0, 0, 0, 0, 0, 0, 184, 134, 9, 0, 128, 0, 0, 0, 241, 23, 247, 249, 94, 254, 190, 236, 202, 48, 183, 10, 47, 252, 157, 6, 215, 25, 0, 0, 0, 0, 0, 0, 200, 134, 9, 0, 138, 0, 0, 0, 251, 26, 24, 251, 123, 253, 180, 236, 77, 49, 16, 9, 82, 249, 21, 10, 86, 24, 0, 0, 0, 0, 0, 0, 216, 134, 9, 0, 116, 0, 0, 0, 151, 26, 186, 250, 170, 254, 136, 239, 129, 45, 7, 10, 191, 251, 209, 7, 20, 25, 0, 0, 0, 0, 0, 0, 200, 134, 9, 0, 128, 0, 0, 0, 149, 25, 242, 249, 76, 254, 240, 236, 147, 48, 193, 10, 170, 252, 76, 7, 64, 27, 0, 0, 0, 0, 0, 0, 216, 134, 9, 0, 128, 0, 0, 0, 149, 25, 242, 249, 76, 254, 240, 236, 147, 48, 193, 10, 170, 252, 76, 7, 64, 27, 0, 0, 0, 0, 0, 0, 232, 134, 9, 0, 128, 0, 0, 0, 241, 23, 247, 249, 94, 254, 190, 236, 202, 48, 183, 10, 47, 252, 157, 6, 215, 25, 0, 0, 0, 0, 0, 0, 248, 134, 9, 0, 128, 0, 0, 0, 115, 21, 88, 251, 149, 254, 169, 236, 54, 48, 132, 11, 113, 252, 186, 6, 24, 28, 0, 0, 0, 0, 0, 0, 8, 135, 9, 0, 128, 0, 0, 0, 103, 23, 80, 250, 57, 254, 100, 237, 103, 47, 164, 11, 61, 253, 145, 5, 45, 26, 0, 0, 0, 0, 0, 0, 24, 135, 9, 0, 128, 0, 0, 0, 181, 23, 59, 251, 146, 254, 155, 235, 235, 49, 174, 10, 0, 252, 18, 8, 178, 26, 0, 0, 0, 0, 0, 0, 40, 135, 9, 0, 128, 0, 0, 0, 98, 23, 174, 249, 97, 254, 51, 238, 44, 46, 48, 12, 87, 253, 124, 5, 59, 27, 0, 0, 0, 0, 0, 0, 56, 135, 9, 0, 128, 0, 0, 0, 103, 23, 80, 250, 57, 254, 100, 237, 103, 47, 164, 11, 61, 253, 145, 5, 45, 26, 0, 0, 0, 0, 0, 0, 72, 135, 9, 0, 128, 0, 0, 0, 44, 23, 44, 250, 101, 254, 51, 237, 253, 47, 40, 11, 27, 253, 244, 5, 83, 26, 0, 0, 0, 0, 0, 0, 88, 135, 9, 0, 128, 0, 0, 0, 103, 23, 80, 250, 57, 254, 100, 237, 103, 47, 164, 11, 61, 253, 145, 5, 45, 26, 0, 0, 0, 0, 0, 0, 104, 135, 9, 0, 128, 0, 0, 0, 103, 23, 80, 250, 57, 254, 100, 237, 103, 47, 164, 11, 61, 253, 145, 5, 45, 26, 0, 0, 0, 0, 0, 0, 120, 135, 9, 0, 128, 0, 0, 0, 115, 21, 88, 251, 149, 254, 169, 236, 54, 48, 132, 11, 113, 252, 186, 6, 24, 28, 0, 0, 0, 0, 0, 0, 136, 135, 9, 0, 128, 0, 0, 0, 115, 21, 88, 251, 149, 254, 169, 236, 54, 48, 132, 11, 113, 252, 186, 6, 24, 28, 0, 0, 0, 0, 0, 0, 152, 135, 9, 0, 128, 0, 0, 0, 200, 24, 180, 249, 50, 254, 1, 237, 189, 48, 121, 10, 159, 252, 250, 6, 243, 26, 0, 0, 0, 0, 0, 0, 15, 156, 179, 63, 84, 116, 100, 190, 169, 19, 208, 189, 153, 187, 6, 191, 18, 165, 189, 63, 150, 67, 139, 60, 52, 128, 55, 188, 226, 233, 149, 60, 245, 74, 105, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 64, 0, 0, 64, 63, 0, 0, 224, 191, 0, 0, 128, 190, 0, 0, 128, 190, 0, 0, 64, 63, 0, 0, 64, 63, 0, 0, 128, 190, 0, 0, 128, 190, 0, 0, 224, 191, 0, 0, 64, 63, 0, 0, 16, 64, 211, 77, 242, 63, 25, 4, 214, 190, 70, 182, 243, 190, 164, 112, 253, 190, 170, 241, 226, 63, 4, 86, 142, 190, 14, 45, 130, 191, 20, 174, 39, 191, 12, 2, 43, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 216, 247, 191, 235, 116, 230, 63, 253, 103, 185, 191, 144, 101, 37, 64, 0, 227, 179, 63, 115, 99, 6, 191, 155, 3, 148, 190, 129, 62, 209, 62, 75, 60, 154, 191, 240, 136, 138, 63, 91, 63, 60, 64, 83, 203, 232, 191, 72, 69, 65, 80, 67, 67, 68, 82, 0, 0, 0, 0, 0, 0, 0, 0, 255, 216, 255, 225, 0, 0, 0, 0, 69, 120, 105, 102, 0, 0, 0, 0, 65, 82, 69, 67, 79, 89, 75, 0, 67, 111, 110, 116, 97, 120, 0, 0, 78, 32, 68, 105, 103, 105, 116, 97, 108, 0, 0, 0, 0, 0, 0, 0, 80, 88, 78, 0, 0, 0, 0, 0, 76, 111, 103, 105, 116, 101, 99, 104, 0, 0, 0, 0, 0, 0, 0, 0, 70, 111, 116, 111, 109, 97, 110, 32, 80, 105, 120, 116, 117, 114, 97, 0, 113, 107, 116, 107, 0, 0, 0, 0, 65, 112, 112, 108, 101, 0, 0, 0, 81, 117, 105, 99, 107, 84, 97, 107, 101, 32, 49, 48, 48, 0, 0, 0, 113, 107, 116, 110, 0, 0, 0, 0, 81, 117, 105, 99, 107, 84, 97, 107, 101, 32, 49, 53, 48, 0, 0, 0, 102, 116, 121, 112, 113, 116, 32, 32, 32, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 64, 0, 0, 78, 79, 75, 73, 65, 82, 65, 87, 0, 0, 0, 0, 0, 0, 0, 0, 78, 79, 75, 73, 65, 0, 0, 0, 65, 82, 82, 73, 0, 0, 0, 0, 88, 80, 68, 83, 0, 0, 0, 0, 82, 69, 68, 49, 0, 0, 0, 0, 68, 83, 67, 45, 73, 109, 97, 103, 101, 0, 0, 0, 0, 0, 0, 0, 80, 87, 65, 68, 0, 0, 0, 0, 0, 77, 82, 77, 0, 0, 0, 0, 70, 79, 86, 98, 0, 0, 0, 0, 67, 73, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 4, 0, 3, 0, 0, 0, 0, 0, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 48, 56, 48, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 22, 0, 112, 5, 16, 4, 0, 0, 0, 0, 0, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 49, 52, 53, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 76, 29, 0, 64, 6, 176, 4, 0, 0, 0, 0, 0, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 50, 48, 49, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 82, 77, 0, 28, 10, 166, 7, 0, 0, 0, 0, 0, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 53, 49, 48, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 52, 82, 77, 0, 28, 10, 166, 7, 0, 0, 0, 0, 0, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 53, 49, 48, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 80, 164, 154, 0, 28, 10, 166, 7, 0, 0, 0, 0, 9, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 53, 49, 48, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 92, 164, 154, 0, 28, 10, 166, 7, 0, 0, 0, 0, 9, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 53, 49, 48, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 208, 137, 246, 0, 200, 12, 165, 9, 0, 0, 0, 0, 9, 148, 0, 0, 65, 86, 84, 0, 0, 0, 0, 0, 0, 0, 70, 45, 56, 49, 48, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 216, 243, 0, 192, 12, 144, 9, 0, 0, 0, 0, 8, 97, 0, 1, 65, 103, 102, 97, 80, 104, 111, 116, 111, 0, 68, 67, 45, 56, 51, 51, 109, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 247, 146, 0, 228, 9, 110, 7, 0, 0, 0, 0, 96, 97, 0, 0, 65, 108, 99, 97, 116, 101, 108, 0, 0, 0, 53, 48, 51, 53, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 246, 197, 43, 0, 104, 5, 12, 4, 0, 0, 0, 0, 64, 73, 0, 8, 66, 97, 117, 109, 101, 114, 0, 0, 0, 0, 84, 88, 71, 49, 52, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 54, 4, 80, 215, 80, 0, 96, 9, 230, 6, 12, 12, 44, 2, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 68, 51, 48, 48, 0, 0, 0, 0, 0, 0, 0, 96, 255, 99, 0, 104, 10, 176, 7, 4, 4, 44, 4, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 52, 54, 48, 0, 0, 0, 0, 0, 0, 0, 0, 64, 76, 100, 0, 112, 10, 176, 7, 12, 8, 44, 0, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 49, 48, 0, 0, 0, 0, 0, 0, 0, 0, 96, 133, 101, 0, 112, 10, 200, 7, 10, 6, 42, 2, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 240, 168, 117, 0, 72, 11, 88, 8, 44, 8, 4, 0, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 51, 32, 73, 83, 0, 0, 0, 0, 0, 0, 0, 16, 174, 140, 0, 80, 12, 36, 9, 36, 12, 4, 0, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 50, 48, 0, 0, 0, 0, 0, 0, 0, 0, 104, 10, 141, 0, 80, 12, 42, 9, 12, 7, 44, 13, 40, 73, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 52, 55, 48, 0, 0, 0, 0, 0, 0, 0, 0, 224, 204, 157, 0, 8, 13, 176, 9, 6, 5, 32, 3, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 55, 50, 48, 32, 73, 83, 0, 0, 0, 0, 0, 16, 111, 158, 0, 16, 13, 180, 9, 12, 6, 44, 6, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 88, 135, 197, 0, 152, 14, 212, 10, 12, 6, 52, 6, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 52, 48, 0, 0, 0, 0, 0, 0, 0, 0, 16, 151, 238, 0, 8, 16, 232, 11, 48, 12, 24, 12, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 240, 4, 236, 0, 136, 14, 212, 10, 6, 12, 30, 0, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 49, 49, 48, 32, 73, 83, 0, 0, 0, 0, 240, 9, 237, 0, 144, 14, 218, 10, 12, 9, 44, 9, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 49, 50, 48, 32, 73, 83, 0, 0, 0, 0, 64, 162, 28, 1, 240, 15, 232, 11, 24, 12, 24, 12, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 50, 48, 32, 73, 83, 0, 0, 0, 0, 0, 240, 234, 35, 1, 72, 16, 244, 11, 92, 16, 4, 1, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 50, 50, 48, 32, 72, 83, 0, 0, 0, 0, 224, 183, 78, 1, 112, 17, 204, 12, 25, 10, 73, 12, 40, 22, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 51, 48, 32, 73, 83, 0, 0, 0, 0, 0, 0, 67, 121, 1, 96, 18, 176, 13, 8, 16, 56, 8, 40, 148, 0, 2, 67, 97, 110, 111, 110, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 51, 51, 48, 48, 32, 73, 83, 0, 0, 0, 0, 32, 40, 30, 0, 96, 6, 187, 4, 0, 2, 0, 1, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 81, 86, 45, 50, 48, 48, 48, 85, 88, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 25, 49, 0, 32, 8, 11, 6, 0, 0, 10, 1, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 81, 86, 45, 51, 42, 48, 48, 69, 88, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 226, 94, 0, 25, 10, 132, 7, 0, 0, 9, 0, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 81, 86, 45, 53, 55, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 119, 0, 51, 11, 133, 8, 0, 0, 34, 36, 0, 22, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 54, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 212, 44, 0, 85, 6, 184, 4, 0, 0, 1, 0, 0, 148, 7, 13, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 83, 50, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 130, 75, 0, 42, 8, 42, 6, 0, 0, 32, 34, 0, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 83, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 98, 92, 0, 42, 9, 184, 6, 2, 0, 32, 0, 0, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 81, 86, 45, 82, 52, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 82, 113, 0, 8, 10, 136, 7, 0, 0, 0, 0, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 80, 53, 48, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 233, 114, 0, 42, 10, 137, 7, 0, 0, 22, 0, 0, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 81, 86, 45, 82, 53, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 115, 0, 42, 10, 140, 7, 0, 0, 32, 0, 0, 148, 7, 1, 67, 97, 115, 105, 111 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 596312), 
 allocate([ 69, 88, 45, 90, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 99, 115, 0, 42, 10, 145, 7, 0, 0, 25, 0, 0, 22, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 53, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 78, 118, 0, 42, 10, 194, 7, 0, 0, 32, 26, 0, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 53, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29, 142, 0, 42, 11, 124, 8, 0, 0, 14, 30, 0, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 80, 54, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 81, 165, 0, 42, 12, 15, 9, 0, 0, 27, 0, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 55, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 118, 165, 0, 42, 12, 17, 9, 0, 0, 25, 0, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 55, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 135, 167, 0, 42, 12, 46, 9, 0, 0, 32, 32, 0, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 80, 55, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 214, 187, 0, 213, 12, 194, 9, 0, 0, 6, 30, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 56, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 149, 190, 0, 0, 13, 198, 9, 0, 0, 47, 35, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 56, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 236, 0, 170, 14, 192, 10, 0, 0, 82, 0, 0, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 49, 48, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 29, 1, 0, 16, 228, 11, 0, 0, 24, 0, 80, 148, 7, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 69, 88, 45, 90, 82, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 63, 117, 0, 212, 8, 164, 6, 0, 0, 0, 0, 13, 148, 0, 1, 67, 97, 115, 105, 111, 0, 0, 0, 0, 0, 81, 86, 45, 52, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 12, 0, 0, 4, 1, 3, 0, 1, 0, 0, 0, 73, 0, 0, 67, 114, 101, 97, 116, 105, 118, 101, 0, 0, 80, 67, 45, 67, 65, 77, 32, 54, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 230, 183, 1, 32, 17, 216, 12, 0, 0, 0, 0, 36, 97, 0, 0, 68, 74, 73, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48, 231, 0, 0, 18, 216, 12, 0, 0, 0, 0, 0, 148, 0, 0, 77, 97, 116, 114, 105, 120, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 152, 58, 0, 64, 6, 176, 4, 0, 0, 0, 0, 65, 73, 0, 0, 70, 111, 99, 117, 108, 117, 115, 0, 0, 0, 53, 51, 49, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 176, 4, 0, 128, 2, 224, 1, 0, 0, 0, 0, 0, 148, 0, 0, 71, 101, 110, 101, 114, 105, 99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 244, 0, 0, 0, 1, 244, 0, 1, 1, 6, 1, 0, 141, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 68, 67, 50, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 232, 1, 0, 0, 2, 244, 0, 1, 1, 10, 1, 0, 141, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 68, 67, 50, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 56, 25, 0, 0, 6, 52, 4, 0, 52, 0, 0, 0, 97, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 68, 67, 83, 50, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 119, 63, 0, 34, 9, 243, 6, 1, 33, 1, 2, 0, 148, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 51, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 158, 131, 63, 0, 34, 9, 243, 6, 1, 33, 1, 2, 0, 148, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 51, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 88, 12, 0, 74, 34, 0, 208, 4, 144, 3, 0, 0, 16, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 51, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 51, 0, 208, 4, 144, 3, 0, 0, 16, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 51, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 11, 94, 0, 48, 11, 104, 8, 0, 0, 0, 0, 0, 148, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 54, 48, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 216, 23, 94, 0, 48, 11, 104, 8, 0, 0, 0, 0, 0, 148, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 54, 48, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 88, 12, 0, 8, 7, 0, 128, 2, 224, 1, 0, 0, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 54, 48, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 27, 139, 0, 32, 11, 86, 8, 0, 0, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 67, 54, 48, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48, 201, 186, 0, 200, 15, 214, 11, 2, 0, 0, 13, 0, 73, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 49, 50, 77, 80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 68, 187, 0, 200, 15, 214, 11, 2, 0, 0, 13, 0, 73, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 49, 50, 77, 80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 123, 128, 168, 18, 1, 160, 15, 184, 11, 0, 0, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 49, 50, 77, 80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 9, 0, 128, 2, 224, 1, 0, 3, 0, 0, 64, 148, 0, 0, 75, 111, 100, 97, 107, 0, 0, 0, 0, 0, 75, 65, 73, 45, 48, 51, 52, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 234, 0, 128, 12, 96, 9, 0, 0, 0, 0, 96, 22, 0, 0, 76, 101, 110, 111, 118, 111, 0, 0, 0, 0, 65, 56, 50, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 71, 59, 0, 72, 6, 183, 4, 0, 0, 0, 0, 96, 22, 0, 0, 77, 105, 99, 114, 111, 110, 0, 0, 0, 0, 50, 48, 49, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 140, 12, 0, 96, 17, 0, 254, 5, 218, 3, 0, 0, 0, 0, 0, 97, 0, 0, 77, 105, 110, 111, 108, 116, 97, 0, 0, 0, 82, 68, 49, 55, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 32, 24, 0, 25, 5, 201, 3, 0, 0, 18, 6, 6, 30, 4, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 57, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 37, 0, 102, 6, 180, 4, 0, 0, 22, 1, 6, 75, 5, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 57, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 224, 44, 0, 80, 6, 189, 4, 0, 0, 0, 7, 30, 148, 0, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 50, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 208, 72, 0, 16, 8, 5, 6, 0, 0, 0, 1, 6, 225, 0, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 57, 57, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 224, 72, 0, 16, 8, 6, 6, 0, 0, 0, 0, 30, 148, 0, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 51, 55, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 89, 0, 240, 8, 173, 6, 0, 0, 0, 1, 6, 180, 0, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 52, 53, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144, 89, 0, 240, 8, 174, 6, 0, 0, 0, 0, 6, 22, 0, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 52, 51, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 113, 0, 16, 10, 133, 7, 0, 0, 0, 1, 6, 180, 0, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 69, 53, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 137, 0, 16, 11, 70, 8, 0, 0, 0, 0, 30, 148, 7, 1, 78, 105, 107, 111, 110, 0, 0, 0, 0, 0, 67, 79, 79, 76, 80, 73, 88, 32, 83, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 90, 0, 0, 9, 182, 6, 0, 0, 0, 0, 30, 22, 0, 0, 79, 108, 121, 109, 112, 117, 115, 0, 0, 0, 67, 55, 55, 48, 85, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 128, 48, 0, 16, 8, 4, 6, 0, 0, 0, 0, 0, 148, 0, 1, 80, 101, 110, 116, 97, 120, 0, 0, 0, 0, 79, 112, 116, 105, 111, 32, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 226, 73, 0, 42, 8, 8, 6, 0, 0, 22, 0, 0, 148, 7, 1, 80, 101, 110, 116, 97, 120, 0, 0, 0, 0, 79, 112, 116, 105, 111, 32, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 75, 93, 0, 42, 9, 201, 6, 0, 0, 22, 0, 0, 148, 7, 1, 80, 101, 110, 116, 97, 120, 0, 0, 0, 0, 79, 112, 116, 105, 111, 32, 83, 52, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 163, 0, 0, 12, 18, 9, 0, 0, 0, 21, 30, 148, 0, 1, 80, 101, 110, 116, 97, 120, 0, 0, 0, 0, 79, 112, 116, 105, 111, 32, 55, 53, 48, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 72, 63, 0, 128, 7, 56, 4, 0, 0, 0, 0, 0, 73, 0, 0, 80, 104, 111, 116, 114, 111, 110, 0, 0, 0, 66, 67, 50, 45, 72, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 89, 63, 0, 128, 7, 56, 4, 0, 0, 0, 0, 0, 73, 0, 0, 80, 104, 111, 116, 114, 111, 110, 0, 0, 0, 66, 67, 50, 45, 72, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 38, 202, 0, 160, 8, 184, 11, 0, 0, 0, 0, 13, 97, 0, 0, 80, 105, 120, 101, 108, 105, 110, 107, 0, 0, 65, 55, 56, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 0, 0, 8, 0, 6, 0, 0, 0, 0, 96, 97, 0, 0, 82, 111, 118, 101, 114, 83, 104, 111, 116, 0, 51, 51, 50, 48, 65, 70, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144, 193, 4, 0, 132, 2, 228, 1, 0, 0, 0, 0, 0, 22, 0, 8, 83, 84, 32, 77, 105, 99, 114, 111, 0, 0, 83, 84, 86, 54, 56, 48, 32, 86, 71, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 163, 245, 0, 216, 12, 144, 9, 0, 0, 24, 0, 9, 148, 0, 1, 83, 97, 109, 115, 117, 110, 103, 0, 0, 0, 83, 56, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 247, 0, 240, 12, 144, 9, 0, 0, 48, 0, 9, 148, 0, 1, 83, 97, 109, 115, 117, 110, 103, 0, 0, 0, 83, 56, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 156, 56, 1, 64, 14, 248, 10, 0, 0, 0, 0, 13, 148, 5, 1, 83, 97, 109, 115, 117, 110, 103, 0, 0, 0, 87, 66, 53, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 54, 110, 1, 160, 15, 184, 11, 0, 0, 0, 0, 13, 148, 5, 1, 83, 97, 109, 115, 117, 110, 103, 0, 0, 0, 87, 66, 53, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 0, 192, 0, 0, 12, 0, 8, 0, 0, 0, 0, 33, 97, 0, 0, 83, 105, 110, 97, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 0, 68, 2, 252, 1, 240, 15, 240, 15, 0, 0, 0, 0, 33, 97, 0, 0, 83, 105, 110, 97, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 0, 68, 88, 165, 2, 240, 15, 64, 21, 0, 0, 0, 0, 33, 97, 0, 0, 83, 105, 110, 97, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 0, 0, 128, 21, 0, 96, 5, 0, 4, 0, 0, 1, 0, 0, 73, 0, 0, 83, 111, 110, 121, 0, 0, 0, 0, 0, 0, 88, 67, 68, 45, 83, 88, 57, 49, 48, 67, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 96, 5, 0, 4, 0, 0, 1, 0, 97, 73, 0, 0, 83, 111, 110, 121, 0, 0, 0, 0, 0, 0, 88, 67, 68, 45, 83, 88, 57, 49, 48, 67, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 118, 0, 0, 0, 0, 0, 0, 82, 80, 95, 79, 86, 0, 0, 0, 66, 82, 67, 77, 110, 0, 0, 0, 184, 101, 9, 0, 32, 244, 8, 0, 200, 101, 9, 0, 208, 101, 9, 0, 96, 91, 9, 0, 216, 101, 9, 0, 152, 91, 9, 0, 224, 101, 9, 0, 240, 249, 8, 0, 240, 101, 9, 0, 136, 77, 9, 0, 152, 243, 8, 0, 96, 243, 8, 0, 152, 93, 9, 0, 176, 77, 9, 0, 80, 251, 8, 0, 232, 243, 8, 0, 248, 91, 9, 0, 248, 101, 9, 0, 72, 92, 9, 0, 224, 93, 9, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 0, 0, 0, 32, 68, 73, 71, 73, 84, 65, 76, 32, 67, 65, 77, 69, 82, 65, 0, 70, 73, 76, 69, 32, 86, 69, 82, 83, 73, 79, 78, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 0, 0, 70, 105, 110, 101, 80, 105, 120, 32, 0, 0, 0, 0, 0, 0, 0, 0, 68, 105, 103, 105, 116, 97, 108, 32, 67, 97, 109, 101, 114, 97, 32, 0, 75, 45, 114, 0, 0, 0, 0, 0, 75, 45, 120, 0, 0, 0, 0, 0, 75, 45, 53, 0, 0, 0, 0, 0, 75, 45, 55, 0, 0, 0, 0, 0, 75, 45, 51, 0, 0, 0, 0, 0, 54, 52, 53, 68, 0, 0, 0, 0, 152, 7, 136, 5, 0, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 8, 24, 6, 4, 0, 8, 0, 52, 0, 2, 0, 0, 0, 0, 0, 0, 0, 25, 0, 0, 0, 176, 8, 176, 5, 48, 0, 6, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 72, 9, 192, 6, 12, 0, 6, 0, 52, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 10, 176, 7, 12, 0, 6, 0, 44, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 12, 20, 8, 64, 0, 12, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 88, 12, 40, 9, 44, 0, 12, 0, 4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 13, 180, 9, 4, 0, 6, 0, 52, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 188, 13, 24, 9, 42, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 14, 56, 9, 74, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 14, 224, 10, 52, 0, 12, 0, 8, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 15, 62, 10, 30, 0, 18, 0, 6, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 15, 62, 10, 42, 0, 18, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144, 15, 62, 10, 76, 0, 20, 0, 0, 0, 2, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 16, 232, 11, 48, 0, 12, 0, 24, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 16, 130, 8, 4, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 56, 16, 212, 10, 192, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 16, 52, 12, 104, 0, 11, 0, 8, 0, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 16, 246, 11, 96, 0, 17, 0, 8, 0, 0, 0, 0, 0, 16, 0, 0, 0, 7, 0, 73, 0, 96, 16, 246, 11, 96, 0, 17, 0, 24, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 73, 0, 216, 16, 60, 11, 22, 0, 18, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 58, 11, 62, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 124, 17, 138, 11, 90, 0, 34, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 17, 20, 13, 12, 0, 10, 0, 36, 0, 12, 0, 0, 0, 0, 0, 0, 0, 18, 0, 73, 0, 128, 17, 38, 13, 80, 0, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 144, 17, 38, 13, 80, 0, 50, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 18, 188, 13, 96, 0, 16, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 224, 18, 132, 12, 62, 0, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 224, 18, 156, 12, 62, 0, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 244, 19, 21, 13, 98, 0, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 246, 12, 142, 0, 45, 0, 62, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 20, 200, 13, 72, 0, 52, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 224, 20, 188, 13, 142, 0, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 224, 20, 0, 14, 126, 0, 100, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 20, 188, 13, 158, 0, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 21, 124, 14, 72, 0, 38, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 126, 14, 96, 0, 17, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 73, 0, 80, 22, 190, 14, 62, 0, 20, 0, 10, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 22, 220, 14, 158, 0, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 23, 110, 15, 122, 0, 80, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 208, 23, 216, 15, 72, 0, 34, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 34, 32, 23, 160, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 1, 69, 79, 83, 32, 49, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 69, 79, 83, 45, 49, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 1, 69, 79, 83, 32, 50, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 1, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 0, 0, 52, 2, 69, 79, 83, 32, 51, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 2, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 73, 32, 78, 0, 0, 0, 0, 144, 1, 69, 79, 83, 32, 52, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 1, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 73, 73, 0, 0, 0, 0, 0, 97, 2, 69, 79, 83, 32, 53, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 129, 2, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 86, 0, 0, 0, 0, 0, 0, 135, 2, 69, 79, 83, 32, 54, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 1, 69, 79, 83, 45, 49, 68, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 37, 3, 69, 79, 83, 32, 55, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 1, 69, 79, 83, 32, 51, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 136, 1, 69, 79, 83, 45, 49, 68, 115, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 0, 118, 1, 69, 79, 83, 32, 52, 53, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21, 2, 69, 79, 83, 45, 49, 68, 115, 32, 77, 97, 114, 107, 32, 73, 73, 73, 0, 0, 0, 0, 137, 1, 69, 79, 83, 32, 51, 53, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 36, 3, 69, 79, 83, 45, 49, 68, 32, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 54, 2, 69, 79, 83, 32, 52, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 2, 69, 79, 83, 45, 49, 68, 32, 88, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 82, 2, 69, 79, 83, 32, 53, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19, 2, 69, 79, 83, 32, 53, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 2, 69, 79, 83, 32, 53, 53, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 2, 69, 79, 83, 32, 53, 68, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 0, 0, 134, 2, 69, 79, 83, 32, 54, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 133, 2, 69, 79, 83, 32, 53, 68, 32, 77, 97, 114, 107, 32, 73, 73, 73, 0, 0, 0, 0, 0, 1, 3, 69, 79, 83, 32, 54, 53, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 69, 79, 83, 32, 54, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 3, 69, 79, 83, 32, 55, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 2, 69, 79, 83, 32, 55, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 147, 3, 69, 79, 83, 32, 55, 53, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 137, 2, 69, 79, 83, 32, 55, 68, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 0, 0, 71, 3, 69, 79, 83, 32, 55, 54, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84, 2, 69, 79, 83, 32, 49, 48, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 136, 2, 69, 79, 83, 32, 49, 49, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39, 3, 69, 79, 83, 32, 49, 50, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 70, 3, 69, 79, 83, 32, 49, 48, 48, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 68, 83, 67, 45, 82, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 68, 83, 76, 82, 45, 65, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 68, 83, 76, 82, 45, 65, 57, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 68, 83, 76, 82, 45, 65, 55, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 68, 83, 76, 82, 45, 65, 50, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 68, 83, 76, 82, 45, 65, 51, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 1, 68, 83, 76, 82, 45, 65, 51, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 1, 68, 83, 76, 82, 45, 65, 51, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 1, 68, 83, 76, 82, 45, 65, 50, 51, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 1, 68, 83, 76, 82, 45, 65, 50, 57, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 1, 68, 83, 76, 82, 45, 65, 56, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 1, 68, 83, 76, 82, 45, 65, 53, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 1, 68, 83, 76, 82, 45, 65, 53, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19, 1, 68, 83, 76, 82, 45, 65, 52, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 1, 78, 69, 88, 45, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 1, 78, 69, 88, 45, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 24, 1, 83, 76, 84, 45, 65, 51, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 1, 83, 76, 84, 45, 65, 53, 53, 86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26, 1, 68, 83, 76, 82, 45, 65, 53, 54, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 27, 1, 68, 83, 76, 82, 45, 65, 53, 56, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28, 1, 78, 69, 88, 45, 67, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29, 1, 83, 76, 84, 45, 65, 51, 53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 1, 83, 76, 84, 45, 65, 54, 53, 86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 1, 83, 76, 84, 45, 65, 55, 55, 86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 1, 78, 69, 88, 45, 53, 78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33, 1, 78, 69, 88, 45, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 35, 1, 83, 76, 84, 45, 65, 51, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 36, 1, 83, 76, 84, 45, 65, 53, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 37, 1, 78, 69, 88, 45, 70, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 1, 83, 76, 84, 45, 65, 57, 57, 86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 39, 1, 78, 69, 88, 45, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 1, 78, 69, 88, 45, 53, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 1, 68, 83, 67, 45, 82, 88, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42, 1, 68, 83, 67, 45, 82, 88, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 46, 1, 73, 76, 67, 69, 45, 51, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 47, 1, 83, 76, 84, 45, 65, 53, 56, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 49, 1, 78, 69, 88, 45, 51, 78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 1, 73, 76, 67, 69, 45, 55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 51, 1, 78, 69, 88, 45, 53, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 52, 1, 68, 83, 67, 45, 82, 88, 49, 48, 48, 77, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 1, 68, 83, 67, 45, 82, 88, 49, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 54, 1, 68, 83, 67, 45, 82, 88, 49, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 55, 1, 73, 76, 67, 69, 45, 55, 82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 56, 1, 73, 76, 67, 69, 45, 54, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 57, 1, 73, 76, 67, 69, 45, 53, 48, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 61, 1, 68, 83, 67, 45, 82, 88, 49, 48, 48, 77, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 1, 73, 76, 67, 69, 45, 55, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 1, 73, 76, 67, 65, 45, 55, 55, 77, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 83, 1, 73, 76, 67, 69, 45, 53, 49, 48, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84, 1, 73, 76, 67, 69, 45, 55, 77, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 90, 1, 73, 76, 67, 69, 45, 81, 88, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 65, 73, 45, 48, 51, 52, 48, 0, 0, 0, 0, 0, 0, 0, 0, 67, 54, 48, 51, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 54, 48, 48, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 32, 90, 111, 111, 109, 0, 0, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 48, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 80, 114, 111, 55, 48, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 80, 114, 111, 57, 48, 32, 73, 83, 0, 0, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 0, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 49, 48, 0, 0, 83, 50, 32, 73, 83, 0, 0, 0, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 50, 50, 48, 32, 72, 83, 0, 0, 0, 0, 0, 0, 69, 79, 83, 32, 68, 50, 48, 48, 48, 67, 0, 0, 0, 0, 0, 0, 68, 49, 0, 0, 0, 0, 0, 0, 68, 49, 88, 0, 0, 0, 0, 0, 68, 52, 48, 88, 0, 0, 0, 0, 68, 54, 48, 0, 0, 0, 0, 0, 68, 56, 48, 0, 0, 0, 0, 0, 68, 51, 48, 48, 48, 0, 0, 0, 68, 51, 0, 0, 0, 0, 0, 0, 68, 51, 83, 0, 0, 0, 0, 0, 68, 55, 48, 48, 0, 0, 0, 0, 68, 51, 49, 48, 48, 0, 0, 0, 68, 53, 48, 48, 48, 0, 0, 0, 68, 57, 48, 0, 0, 0, 0, 0, 68, 53, 49, 48, 48, 0, 0, 0, 68, 55, 48, 48, 48, 0, 0, 0, 67, 79, 79, 76, 80, 73, 88, 32, 65, 0, 0, 0, 0, 0, 0, 0, 68, 51, 50, 48, 48, 0, 0, 0, 68, 54, 0, 0, 0, 0, 0, 0, 68, 56, 48, 48, 0, 0, 0, 0, 68, 52, 0, 0, 0, 0, 0, 0, 68, 102, 0, 0, 0, 0, 0, 0, 68, 52, 48, 0, 0, 0, 0, 0, 68, 53, 48, 0, 0, 0, 0, 0, 68, 55, 48, 0, 0, 0, 0, 0, 68, 49, 48, 48, 0, 0, 0, 0, 68, 50, 48, 48, 0, 0, 0, 0, 68, 50, 72, 0, 0, 0, 0, 0, 68, 50, 88, 0, 0, 0, 0, 0, 68, 51, 48, 48, 0, 0, 0, 0, 67, 79, 79, 76, 80, 73, 88, 32, 80, 0, 0, 0, 0, 0, 0, 0, 49, 32, 0, 0, 0, 0, 0, 0, 69, 57, 57, 53, 0, 0, 0, 0, 69, 50, 53, 48, 48, 0, 0, 0, 79, 112, 116, 105, 111, 32, 51, 51, 87, 82, 0, 0, 0, 0, 0, 0, 68, 105, 77, 65, 71, 69, 32, 90, 50, 0, 0, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 0, 0, 0, 0, 0, 0, 0, 0, 83, 50, 80, 114, 111, 0, 0, 0, 72, 83, 53, 48, 69, 88, 82, 0, 70, 57, 48, 48, 69, 88, 82, 0, 75, 68, 45, 52, 48, 48, 90, 0, 75, 68, 45, 53, 49, 48, 90, 0, 77, 105, 110, 111, 108, 116, 97, 0, 68, 105, 77, 65, 71, 69, 32, 65, 0, 0, 0, 0, 0, 0, 0, 0, 65, 76, 80, 72, 65, 0, 0, 0, 68, 89, 78, 65, 88, 0, 0, 0, 77, 65, 88, 88, 85, 77, 0, 0, 68, 89, 78, 65, 88, 32, 37, 45, 49, 48, 115, 0, 0, 0, 0, 0, 68, 105, 77, 65, 71, 69, 32, 71, 0, 0, 0, 0, 0, 0, 0, 0, 42, 105, 115, 116, 32, 68, 0, 0, 42, 105, 115, 116, 32, 68, 83, 0, 83, 97, 109, 115, 117, 110, 103, 0, 69, 88, 49, 0, 0, 0, 0, 0, 87, 66, 50, 48, 48, 48, 0, 0, 87, 66, 53, 53, 48, 0, 0, 0, 69, 88, 50, 70, 0, 0, 0, 0, 83, 84, 86, 54, 56, 48, 32, 86, 71, 65, 0, 0, 0, 0, 0, 0, 78, 57, 53, 0, 0, 0, 0, 0, 54, 52, 48, 120, 52, 56, 48, 0, 86, 57, 54, 67, 0, 0, 0, 0, 83, 105, 110, 97, 114, 0, 0, 0, 82, 66, 84, 71, 0, 0, 0, 0, 67, 97, 116, 99, 104, 76, 105, 103, 104, 116, 0, 0, 0, 0, 0, 0, 68, 67, 66, 50, 0, 0, 0, 0, 58, 12, 207, 6, 4, 0, 0, 0, 250, 255, 0, 0, 58, 12, 7, 8, 4, 0, 0, 0, 250, 255, 0, 0, 58, 12, 15, 9, 4, 0, 0, 0, 250, 255, 0, 0, 98, 12, 55, 8, 18, 0, 0, 0, 214, 255, 20, 0, 98, 12, 63, 9, 18, 0, 13, 0, 214, 255, 235, 255, 105, 12, 63, 9, 0, 0, 0, 0, 255, 255, 0, 0, 232, 12, 154, 9, 0, 0, 0, 0, 255, 255, 0, 0, 2, 13, 159, 9, 9, 0, 0, 0, 251, 255, 0, 0, 2, 13, 175, 9, 9, 0, 0, 0, 239, 255, 4, 0, 42, 13, 107, 7, 15, 0, 0, 0, 212, 255, 20, 0, 42, 13, 187, 8, 15, 0, 0, 0, 212, 255, 20, 0, 42, 13, 207, 9, 15, 0, 10, 0, 212, 255, 235, 255, 106, 14, 191, 10, 3, 0, 0, 0, 248, 255, 253, 255, 126, 14, 191, 10, 0, 0, 0, 0, 253, 255, 0, 0, 140, 14, 146, 9, 0, 0, 0, 0, 0, 0, 254, 255, 186, 14, 183, 9, 17, 0, 0, 0, 212, 255, 19, 0, 186, 14, 239, 10, 17, 0, 15, 0, 212, 255, 237, 255, 40, 15, 122, 8, 6, 0, 0, 0, 250, 255, 0, 0, 220, 15, 202, 11, 0, 0, 0, 0, 0, 0, 254, 255, 194, 16, 87, 9, 3, 0, 0, 0, 248, 255, 255, 255, 234, 16, 135, 9, 17, 0, 15, 0, 212, 255, 237, 255, 156, 17, 146, 11, 0, 0, 0, 0, 253, 255, 252, 255, 156, 17, 2, 13, 0, 0, 0, 0, 253, 255, 250, 255, 0, 0, 0, 0, 148, 97, 73, 22, 0, 0, 0, 0, 67, 55, 55, 48, 85, 90, 0, 0, 79, 108, 121, 109, 112, 117, 115, 0, 69, 45, 51, 48, 48, 0, 0, 0, 69, 45, 53, 48, 48, 0, 0, 0, 69, 45, 51, 51, 48, 0, 0, 0, 83, 80, 53, 53, 48, 85, 90, 0, 68, 83, 67, 45, 70, 56, 50, 56, 0, 0, 0, 0, 0, 0, 0, 0, 82, 71, 66, 69, 0, 0, 0, 0, 68, 83, 67, 45, 86, 51, 0, 0, 83, 111, 110, 121, 0, 0, 0, 0, 82, 88, 49, 0, 0, 0, 0, 0, 65, 57, 57, 0, 0, 0, 0, 0, 68, 83, 76, 82, 45, 65, 51, 53, 48, 0, 0, 0, 0, 0, 0, 0, 80, 73, 88, 76, 0, 0, 0, 0, 67, 51, 51, 48, 0, 0, 0, 0, 49, 50, 77, 80, 0, 0, 0, 0, 69, 97, 115, 121, 83, 104, 97, 114, 101, 0, 0, 0, 0, 0, 0, 0, 78, 67, 50, 48, 48, 48, 0, 0, 69, 79, 83, 68, 67, 83, 0, 0, 68, 67, 83, 52, 0, 0, 0, 0, 68, 67, 83, 52, 54, 48, 65, 0, 68, 67, 83, 54, 54, 48, 77, 0, 68, 67, 83, 55, 54, 48, 77, 0, 50, 48, 88, 0, 0, 0, 0, 0, 77, 89, 67, 89, 0, 0, 0, 0, 68, 67, 50, 53, 0, 0, 0, 0, 52, 48, 0, 0, 0, 0, 0, 0, 68, 67, 52, 48, 0, 0, 0, 0, 68, 67, 53, 48, 0, 0, 0, 0, 68, 67, 49, 50, 48, 0, 0, 0, 68, 67, 83, 50, 48, 48, 0, 0, 81, 117, 105, 99, 107, 84, 97, 107, 101, 0, 0, 0, 0, 0, 0, 0, 37, 100, 120, 37, 100, 0, 0, 0, 81, 117, 105, 99, 107, 116, 97, 107, 101, 0, 0, 0, 0, 0, 0, 0, 37, 115, 58, 32, 89, 111, 117, 32, 109, 117, 115, 116, 32, 108, 105, 110, 107, 32, 100, 99, 114, 97, 119, 32, 119, 105, 116, 104, 32, 37, 115, 33, 33, 10, 0, 0, 0, 0, 0, 0, 108, 105, 98, 106, 97, 115, 112, 101, 114, 0, 0, 0, 0, 0, 0, 0, 108, 105, 98, 106, 112, 101, 103, 0, 82, 71, 66, 71, 0, 0, 0, 0, 71, 77, 67, 89, 0, 0, 0, 0, 10, 0, 0, 0, 116, 114, 112, 99, 0, 0, 0, 0, 36, 0, 0, 0, 99, 115, 101, 100, 0, 0, 0, 0, 40, 0, 0, 0, 116, 112, 116, 119, 0, 0, 0, 0, 20, 0, 0, 0, 116, 112, 107, 98, 0, 0, 0, 0, 20, 0, 0, 0, 67, 82, 84, 114, 0, 0, 0, 0, 14, 0, 0, 0, 67, 82, 84, 103, 0, 0, 0, 0, 14, 0, 0, 0, 67, 82, 84, 98, 0, 0, 0, 0, 14, 0, 0, 0, 90, 89, 88, 114, 0, 0, 0, 0, 20, 0, 0, 0, 90, 89, 88, 103, 0, 0, 0, 0, 20, 0, 0, 0, 90, 89, 88, 98, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 99, 111, 110, 118, 101, 114, 116, 95, 116, 111, 95, 114, 103, 98, 40, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 16, 2, 114, 116, 110, 109, 32, 66, 71, 82, 32, 90, 89, 88, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 115, 99, 97, 0, 0, 0, 0, 0, 0, 0, 0, 101, 110, 111, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 214, 246, 0, 0, 0, 0, 1, 0, 45, 211, 0, 0, 112, 101, 9, 0, 120, 101, 9, 0, 144, 101, 9, 0, 160, 101, 9, 0, 176, 101, 9, 0, 0, 0, 0, 0, 81, 243, 0, 0, 0, 0, 1, 0, 204, 22, 1, 0, 0, 0, 0, 0, 118, 114, 117, 99, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 80, 100, 9, 0, 152, 100, 9, 0, 224, 100, 9, 0, 40, 101, 9, 0, 232, 0, 0, 0, 0, 0, 0, 0, 64, 220, 213, 171, 200, 232, 219, 63, 99, 183, 207, 42, 51, 165, 216, 63, 114, 191, 67, 81, 160, 79, 194, 63, 248, 198, 16, 0, 28, 123, 204, 63, 152, 162, 92, 26, 191, 240, 230, 63, 225, 126, 192, 3, 3, 8, 175, 63, 129, 91, 119, 243, 84, 135, 140, 63, 145, 42, 138, 87, 89, 219, 184, 63, 1, 252, 83, 170, 68, 217, 230, 63, 97, 117, 116, 111, 45, 103, 101, 110, 101, 114, 97, 116, 101, 100, 32, 98, 121, 32, 100, 99, 114, 97, 119, 0, 102, 117, 106, 105, 95, 114, 111, 116, 97, 116, 101, 40, 41, 0, 0, 0, 115, 116, 114, 101, 116, 99, 104, 40, 41, 0, 0, 0, 0, 0, 0, 0, 100, 99, 114, 97, 119, 32, 118, 57, 46, 50, 54, 0, 0, 0, 0, 0, 37, 48, 52, 100, 58, 37, 48, 50, 100, 58, 37, 48, 50, 100, 32, 37, 48, 50, 100, 58, 37, 48, 50, 100, 58, 37, 48, 50, 100, 0, 0, 0, 49, 50, 52, 51, 53, 56, 54, 55, 0, 0, 0, 0, 0, 0, 0, 0, 106, 112, 101, 103, 95, 116, 104, 117, 109, 98, 40, 41, 0, 0, 0, 0, 255, 225, 32, 32, 69, 120, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 119, 114, 105, 116, 101, 95, 112, 112, 109, 95, 116, 105, 102, 102, 40, 41, 0, 0, 0, 0, 0, 0, 0, 0, 80, 55, 10, 87, 73, 68, 84, 72, 32, 37, 100, 10, 72, 69, 73, 71, 72, 84, 32, 37, 100, 10, 68, 69, 80, 84, 72, 32, 37, 100, 10, 77, 65, 88, 86, 65, 76, 32, 37, 100, 10, 84, 85, 80, 76, 84, 89, 80, 69, 32, 37, 115, 10, 69, 78, 68, 72, 68, 82, 10, 0, 0, 0, 0, 80, 37, 100, 10, 37, 100, 32, 37, 100, 10, 37, 100, 10, 0, 0, 0, 110, 98, 114, 107, 83, 116, 113, 109, 72, 65, 67, 103, 0, 0, 0, 0, 49, 49, 52, 49, 49, 49, 49, 49, 49, 52, 50, 50, 0, 0, 0, 0, 78, 111, 110, 45, 110, 117, 109, 101, 114, 105, 99, 32, 97, 114, 103, 117, 109, 101, 110, 116, 32, 116, 111, 32, 34, 45, 37, 99, 34, 10, 0, 0, 97, 108, 108, 0, 0, 0, 0, 0, 85, 110, 107, 110, 111, 119, 110, 32, 111, 112, 116, 105, 111, 110, 32, 34, 45, 37, 99, 34, 46, 10, 0, 0, 78, 111, 32, 102, 105, 108, 101, 115, 32, 116, 111, 32, 112, 114, 111, 99, 101, 115, 115, 46, 10, 0, 0, 0, 37, 115, 32, 104, 97, 115, 32, 110, 111, 32, 116, 105, 109, 101, 115, 116, 97, 109, 112, 46, 10, 0, 0, 0, 37, 49, 48, 108, 100, 37, 49, 48, 100, 32, 37, 115, 10, 0, 0, 0, 37, 115, 32, 104, 97, 115, 32, 110, 111, 32, 116, 104, 117, 109, 98, 110, 97, 105, 108, 46, 10, 0, 0, 0, 10, 70, 105, 108, 101, 110, 97, 109, 101, 58, 32, 37, 115, 10, 0, 0, 84, 105, 109, 101, 115, 116, 97, 109, 112, 58, 32, 37, 115, 0, 0, 0, 67, 97, 109, 101, 114, 97, 58, 32, 37, 115, 32, 37, 115, 10, 0, 0, 79, 119, 110, 101, 114, 58, 32, 37, 115, 10, 0, 0, 0, 0, 0, 0, 68, 78, 71, 32, 86, 101, 114, 115, 105, 111, 110, 58, 32, 0, 0, 0, 37, 100, 37, 99, 0, 0, 0, 0, 73, 83, 79, 32, 115, 112, 101, 101, 100, 58, 32, 37, 100, 10, 0, 0, 83, 104, 117, 116, 116, 101, 114, 58, 32, 0, 0, 0, 0, 0, 0, 0, 49, 47, 0, 0, 0, 0, 0, 0, 37, 48, 46, 49, 102, 32, 115, 101, 99, 10, 0, 0, 0, 0, 0, 0, 65, 112, 101, 114, 116, 117, 114, 101, 58, 32, 102, 47, 37, 48, 46, 49, 102, 10, 0, 0, 0, 0, 0, 0, 70, 111, 99, 97, 108, 32, 108, 101, 110, 103, 116, 104, 58, 32, 37, 48, 46, 49, 102, 32, 109, 109, 10, 0, 121, 101, 115, 0, 0, 0, 0, 0, 110, 111, 0, 0, 0, 0, 0, 0, 69, 109, 98, 101, 100, 100, 101, 100, 32, 73, 67, 67, 32, 112, 114, 111, 102, 105, 108, 101, 58, 32, 37, 115, 10, 0, 0, 0, 0, 0, 0, 0, 78, 117, 109, 98, 101, 114, 32, 111, 102, 32, 114, 97, 119, 32, 105, 109, 97, 103, 101, 115, 58, 32, 37, 100, 10, 0, 0, 0, 0, 0, 0, 0, 80, 105, 120, 101, 108, 32, 65, 115, 112, 101, 99, 116, 32, 82, 97, 116, 105, 111, 58, 32, 37, 48, 46, 54, 102, 10, 0, 0, 0, 0, 0, 0, 84, 104, 117, 109, 98, 32, 115, 105, 122, 101, 58, 32, 32, 37, 52, 100, 32, 120, 32, 37, 100, 10, 0, 0, 70, 117, 108, 108, 32, 115, 105, 122, 101, 58, 32, 32, 32, 37, 52, 100, 32, 120, 32, 37, 100, 10, 0, 0, 67, 97, 110, 110, 111, 116, 32, 100, 101, 99, 111, 100, 101, 32, 102, 105, 108, 101, 32, 37, 115, 10, 0, 0, 37, 115, 32, 105, 115, 32, 97, 32, 37, 115, 32, 37, 115, 32, 105, 109, 97, 103, 101, 46, 10, 0, 0, 0, 109, 97, 105, 110, 40, 41, 0, 0, 37, 115, 58, 32, 34, 45, 115, 32, 37, 100, 34, 32, 114, 101, 113, 117, 101, 115, 116, 115, 32, 97, 32, 110, 111, 110, 101, 120, 105, 115, 116, 101, 110, 116, 32, 105, 109, 97, 103, 101, 33, 10, 0, 0, 0, 0, 0, 0, 46, 112, 103, 109, 0, 46, 112, 112, 109, 0, 46, 112, 112, 109, 0, 46, 112, 97, 109, 0, 0, 0, 0, 0, 46, 116, 105, 102, 102, 0, 0, 0, 95, 37, 48, 42, 100, 0, 0, 0, 46, 116, 104, 117, 109, 98, 0, 0, 119, 98, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63, 217, 175, 59, 221, 121, 226, 230, 63, 168, 112, 4, 169, 20, 59, 210, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 187, 13, 106, 191, 181, 19, 165, 63, 150, 35, 100, 32, 207, 174, 238, 63, 27, 217, 149, 150, 145, 250, 226, 63, 102, 78, 151, 197, 196, 230, 217, 63, 161, 246, 91, 59, 81, 18, 98, 63, 210, 253, 156, 130, 252, 108, 184, 63, 157, 246, 148, 156, 19, 251, 234, 63, 253, 219, 101, 191, 238, 116, 175, 63, 68, 20, 147, 55, 192, 204, 135, 63, 239, 171, 114, 161, 242, 175, 177, 63, 49, 94, 243, 170, 206, 106, 237, 63, 74, 240, 134, 52, 42, 240, 224, 63, 119, 245, 42, 50, 58, 32, 213, 63, 218, 226, 26, 159, 201, 254, 193, 63, 207, 17, 249, 46, 165, 46, 185, 63, 165, 107, 38, 223, 108, 243, 235, 63, 224, 73, 11, 151, 85, 216, 156, 63, 167, 236, 244, 131, 186, 72, 145, 63, 235, 1, 243, 144, 41, 31, 190, 63, 71, 4, 227, 224, 210, 177, 235, 63, 115, 82, 71, 66, 0, 0, 0, 0, 65, 100, 111, 98, 101, 32, 82, 71, 66, 32, 40, 49, 57, 57, 56, 41, 0, 0, 0, 0, 0, 0, 0, 0, 87, 105, 100, 101, 71, 97, 109, 117, 116, 32, 68, 54, 53, 0, 0, 0, 80, 114, 111, 80, 104, 111, 116, 111, 32, 68, 54, 53, 0, 0, 0, 0, 88, 89, 90, 0, 0, 0, 0, 0, 65, 103, 102, 97, 80, 104, 111, 116, 111, 0, 0, 0, 0, 0, 0, 0, 67, 97, 115, 105, 111, 0, 0, 0, 69, 112, 115, 111, 110, 0, 0, 0, 77, 97, 109, 105, 121, 97, 0, 0, 77, 111, 116, 111, 114, 111, 108, 97, 0, 0, 0, 0, 0, 0, 0, 0, 75, 111, 110, 105, 99, 97, 0, 0, 83, 105, 103, 109, 97, 0, 0, 0, 65, 103, 102, 97, 80, 104, 111, 116, 111, 32, 68, 67, 45, 56, 51, 51, 109, 0, 0, 0, 0, 0, 0, 0, 65, 112, 112, 108, 101, 32, 81, 117, 105, 99, 107, 84, 97, 107, 101, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 68, 50, 48, 48, 48, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 68, 54, 48, 48, 48, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 68, 51, 48, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 68, 54, 48, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 68, 83, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 68, 32, 77, 97, 114, 107, 32, 73, 73, 73, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 68, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 68, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 54, 68, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 55, 68, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 55, 68, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 49, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 50, 48, 68, 97, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 50, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 51, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 52, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 54, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 55, 48, 68, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 49, 48, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 51, 48, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 51, 53, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 52, 48, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 52, 53, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 48, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 53, 53, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 54, 48, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 54, 53, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 55, 48, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 55, 53, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 55, 54, 48, 68, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 49, 48, 48, 48, 68, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 49, 49, 48, 48, 68, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 49, 50, 48, 48, 68, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 77, 51, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 77, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 115, 32, 77, 97, 114, 107, 32, 73, 73, 73, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 115, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 86, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 73, 73, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 73, 32, 78, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 32, 77, 97, 114, 107, 32, 73, 73, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 83, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 32, 67, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 32, 88, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 45, 49, 68, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 69, 79, 83, 32, 67, 53, 48, 48, 0, 0, 67, 97 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 606554), 
 allocate([ 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 51, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 53, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 49, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 50, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 53, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 54, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 32, 88, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 49, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 50, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 51, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 53, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 54, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 55, 32, 88, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 71, 57, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 80, 114, 111, 49, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 80, 114, 111, 55, 48, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 80, 114, 111, 57, 48, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 51, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 52, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 52, 53, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 53, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 54, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 55, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 57, 48, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 57, 53, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 49, 48, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 49, 49, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 49, 50, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 49, 32, 73, 83, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 53, 48, 32, 72, 83, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 54, 48, 32, 72, 83, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 51, 51, 48, 48, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 52, 55, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 49, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 50, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 51, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 52, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 54, 53, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 65, 55, 50, 48, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 51, 32, 73, 83, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 49, 49, 48, 32, 73, 83, 0, 0, 0, 0, 0, 0, 0, 0, 67, 97, 110, 111, 110, 32, 80, 111, 119, 101, 114, 83, 104, 111, 116, 32, 83, 88, 50, 50, 48, 0, 0, 0, 67, 97, 115, 105, 111, 32, 69, 88, 45, 83, 50, 48, 0, 0, 0, 0, 67, 97, 115, 105, 111, 32, 69, 88, 45, 90, 55, 53, 48, 0, 0, 0, 67, 97, 115, 105, 111, 32, 69, 88, 45, 90, 49, 48, 0, 0, 0, 0, 67, 73, 78, 69, 32, 54, 53, 48, 0, 0, 0, 0, 0, 0, 0, 0, 67, 73, 78, 69, 32, 54, 54, 48, 0, 0, 0, 0, 0, 0, 0, 0, 67, 111, 110, 116, 97, 120, 32, 78, 32, 68, 105, 103, 105, 116, 97, 108, 0, 0, 0, 0, 0, 0, 0, 0, 69, 112, 115, 111, 110, 32, 82, 45, 68, 49, 0, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 69, 53, 53, 48, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 69, 57, 48, 48, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 70, 53, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 70, 54, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 70, 55, 55, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 70, 55, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 70, 56, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 49, 48, 48, 70, 83, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 49, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 50, 48, 80, 114, 111, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 50, 48, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 50, 80, 114, 111, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 51, 80, 114, 111, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 53, 80, 114, 111, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 53, 48, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 53, 49, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 53, 53, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 53, 50, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 53, 54, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 54, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 55, 48, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 57, 48, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 57, 53, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 57, 49, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 57, 54, 48, 48, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 83, 76, 49, 48, 48, 48, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 73, 83, 45, 49, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 73, 83, 32, 80, 114, 111, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 72, 83, 49, 48, 32, 72, 83, 49, 49, 0, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 72, 83, 50, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 72, 83, 51, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 72, 83, 53, 48, 69, 88, 82, 0, 0, 0, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 70, 57, 48, 48, 69, 88, 82, 0, 0, 0, 0, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 49, 48, 48, 83, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 49, 48, 48, 84, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 49, 48, 48, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 49, 48, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 50, 48, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 51, 48, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 80, 114, 111, 49, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 65, 49, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 65, 50, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 69, 49, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 69, 50, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 77, 49, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 83, 49, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 45, 84, 49, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 70, 49, 0, 0, 0, 0, 70, 117, 106, 105, 102, 105, 108, 109, 32, 88, 81, 0, 0, 0, 0, 0, 73, 109, 97, 99, 111, 110, 32, 73, 120, 112, 114, 101, 115, 115, 0, 0, 75, 111, 100, 97, 107, 32, 78, 67, 50, 48, 48, 48, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 51, 49, 53, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 51, 51, 48, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 52, 50, 48, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 52, 54, 48, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 69, 79, 83, 68, 67, 83, 49, 0, 0, 0, 75, 111, 100, 97, 107, 32, 69, 79, 83, 68, 67, 83, 51, 66, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 53, 50, 48, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 53, 54, 48, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 54, 50, 48, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 54, 50, 48, 88, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 54, 54, 48, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 55, 50, 48, 88, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 55, 54, 48, 67, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 32, 80, 114, 111, 32, 83, 76, 82, 0, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 32, 80, 114, 111, 32, 49, 52, 110, 120, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 68, 67, 83, 32, 80, 114, 111, 32, 49, 52, 0, 0, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 80, 114, 111, 66, 97, 99, 107, 54, 52, 53, 0, 0, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 80, 114, 111, 66, 97, 99, 107, 0, 0, 0, 75, 111, 100, 97, 107, 32, 80, 55, 49, 50, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 80, 56, 53, 48, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 80, 56, 56, 48, 0, 0, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 69, 97, 115, 121, 83, 104, 97, 114, 101, 32, 90, 57, 56, 48, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 69, 97, 115, 121, 83, 104, 97, 114, 101, 32, 90, 57, 56, 49, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 69, 97, 115, 121, 83, 104, 97, 114, 101, 32, 90, 57, 57, 48, 0, 0, 0, 0, 75, 111, 100, 97, 107, 32, 69, 65, 83, 89, 83, 72, 65, 82, 69, 32, 90, 49, 48, 49, 53, 0, 0, 0, 76, 101, 97, 102, 32, 67, 77, 111, 115, 116, 0, 0, 0, 0, 0, 0, 76, 101, 97, 102, 32, 86, 97, 108, 101, 111, 32, 54, 0, 0, 0, 0, 76, 101, 97, 102, 32, 65, 112, 116, 117, 115, 32, 53, 52, 83, 0, 0, 76, 101, 97, 102, 32, 65, 112, 116, 117, 115, 32, 54, 53, 0, 0, 0, 76, 101, 97, 102, 32, 65, 112, 116, 117, 115, 32, 55, 53, 0, 0, 0, 77, 97, 109, 105, 121, 97, 32, 90, 68, 0, 0, 0, 0, 0, 0, 0, 77, 105, 99, 114, 111, 110, 32, 50, 48, 49, 48, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 53, 0, 0, 0, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 55, 72, 105, 0, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 55, 0, 0, 0, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 65, 49, 0, 0, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 65, 50, 48, 48, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 65, 50, 0, 0, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 105, 77, 65, 71, 69, 32, 90, 50, 0, 0, 0, 0, 0, 0, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 89, 78, 65, 88, 32, 53, 0, 77, 105, 110, 111, 108, 116, 97, 32, 68, 89, 78, 65, 88, 32, 55, 0, 77, 111, 116, 111, 114, 111, 108, 97, 32, 80, 73, 88, 76, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 49, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 49, 72, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 49, 88, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 49, 0, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 50, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 50, 72, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 50, 88, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 48, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 49, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 50, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 51, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 88, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 83, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 51, 0, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 52, 48, 88, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 52, 48, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 52, 83, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 52, 0, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 102, 0, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 53, 48, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 53, 49, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 53, 50, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 53, 51, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 53, 53, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 53, 48, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 54, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 54, 49, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 54, 48, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 55, 48, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 55, 49, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 55, 50, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 55, 53, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 55, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 55, 48, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 56, 49, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 56, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 56, 48, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 68, 57, 48, 0, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 55, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 56, 48, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 57, 53, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 57, 57, 53, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 50, 49, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 50, 53, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 51, 50, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 52, 51, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 52, 53, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 53, 48, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 53, 52, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 53, 55, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 56, 52, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 56, 55, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 69, 56, 56, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 65, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 51, 51, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 51, 52, 48, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 54, 48, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 55, 48, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 55, 49, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 55, 55, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 67, 79, 79, 76, 80, 73, 88, 32, 80, 55, 56, 48, 48, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 86, 51, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 74, 52, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 74, 53, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 83, 50, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 86, 50, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 74, 51, 0, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 65, 87, 49, 0, 0, 0, 0, 0, 78, 105, 107, 111, 110, 32, 49, 32, 0, 0, 0, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 67, 53, 48, 53, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 67, 53, 48, 54, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 67, 55, 48, 55, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 67, 55, 48, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 67, 56, 48, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 49, 48, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 49, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 50, 48, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 51, 48, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 51, 51, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 51, 48, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 51, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 52, 48, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 52, 49, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 52, 50, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 52, 53, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 53, 48, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 53, 49, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 53, 50, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 53, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 54, 48, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 54, 50, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 49, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 50, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 51, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 53, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 49, 115, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 49, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 50, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 51, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 53, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 54, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 76, 55, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 77, 49, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 80, 77, 50, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 77, 49, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 77, 49, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 77, 53, 77, 97, 114, 107, 73, 73, 0, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 69, 45, 77, 53, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 72, 45, 50, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 51, 53, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 51, 0, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 53, 48, 48, 85, 90, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 53, 49, 48, 85, 90, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 53, 53, 48, 85, 90, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 53, 54, 48, 85, 90, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 80, 53, 55, 48, 85, 90, 0, 79, 108, 121, 109, 112, 117, 115, 32, 83, 84, 89, 76, 85, 83, 49, 0, 79, 108, 121, 109, 112, 117, 115, 32, 84, 71, 45, 52, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 88, 90, 45, 49, 48, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 88, 90, 45, 49, 0, 0, 0, 0, 79, 108, 121, 109, 112, 117, 115, 32, 88, 90, 45, 50, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 42, 105, 115, 116, 32, 68, 76, 50, 0, 80, 101, 110, 116, 97, 120, 32, 42, 105, 115, 116, 32, 68, 76, 0, 0, 80, 101, 110, 116, 97, 120, 32, 42, 105, 115, 116, 32, 68, 83, 50, 0, 80, 101, 110, 116, 97, 120, 32, 42, 105, 115, 116, 32, 68, 83, 0, 0, 80, 101, 110, 116, 97, 120, 32, 42, 105, 115, 116, 32, 68, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 49, 48, 68, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 49, 0, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 50, 48, 68, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 50, 48, 48, 68, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 50, 48, 48, 48, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 109, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 120, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 114, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 51, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 53, 32, 73, 73, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 53, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 55, 0, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 83, 49, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 75, 45, 83, 50, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 81, 45, 83, 49, 0, 0, 0, 0, 0, 80, 101, 110, 116, 97, 120, 32, 54, 52, 53, 68, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 67, 77, 49, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 56, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 49, 56, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 50, 56, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 51, 48, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 51, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 52, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 53, 48, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 55, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 86, 45, 76, 85, 88, 49, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 49, 48, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 49, 0, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 73, 71, 73, 76, 85, 88, 32, 51, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 67, 49, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 73, 71, 73, 76, 85, 88, 32, 50, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 88, 49, 48, 48, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 45, 76, 85, 88, 32, 40, 84, 121, 112, 32, 49, 48, 57, 41, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 70, 49, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 67, 32, 40, 84, 121, 112, 32, 49, 49, 50, 41, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 88, 49, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 45, 76, 85, 88, 50, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 88, 50, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 45, 76, 85, 88, 51, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 88, 51, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 45, 76, 85, 88, 32, 52, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 88, 53, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 45, 76, 85, 88, 32, 53, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 76, 88, 55, 0, 0, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 68, 45, 76, 85, 88, 32, 54, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 49, 48, 48, 48, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 86, 45, 76, 85, 88, 32, 40, 84, 121, 112, 32, 49, 49, 52, 41, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 49, 48, 48, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 86, 45, 76, 85, 88, 32, 50, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 49, 53, 48, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 86, 45, 76, 85, 88, 32, 51, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 90, 50, 48, 48, 0, 0, 0, 0, 0, 76, 101, 105, 99, 97, 32, 86, 45, 76, 85, 88, 32, 52, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 70, 88, 49, 53, 48, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 49, 48, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 49, 0, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 50, 0, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 51, 0, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 53, 0, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 54, 0, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 70, 49, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 70, 50, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 70, 51, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 70, 53, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 70, 54, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 70, 55, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 72, 49, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 72, 50, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 72, 51, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 72, 52, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 77, 49, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 77, 53, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 88, 49, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 71, 88, 55, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 84, 90, 54, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 90, 83, 52, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 84, 90, 55, 0, 0, 0, 0, 0, 0, 0, 80, 97, 110, 97, 115, 111, 110, 105, 99, 32, 68, 77, 67, 45, 90, 83, 53, 0, 0, 0, 0, 0, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 72, 32, 50, 48, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 72, 32, 50, 53, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 80, 32, 50, 0, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 80, 32, 51, 48, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 80, 32, 52, 53, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 80, 52, 48, 0, 0, 0, 80, 104, 97, 115, 101, 32, 79, 110, 101, 32, 80, 54, 53, 0, 0, 0, 80, 104, 111, 116, 114, 111, 110, 32, 66, 67, 50, 45, 72, 68, 0, 0, 82, 101, 100, 32, 79, 110, 101, 0, 83, 97, 109, 115, 117, 110, 103, 32, 69, 88, 49, 0, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 69, 88, 50, 70, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 69, 75, 45, 71, 78, 49, 50, 48, 0, 0, 0, 0, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 32, 109, 105, 110, 105, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 51, 48, 48, 48, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 51, 48, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 50, 48, 48, 48, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 50, 0, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 49, 48, 48, 48, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 49, 49, 48, 48, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 49, 49, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 49, 48, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 53, 48, 48, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 53, 0, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 78, 88, 49, 0, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 87, 66, 50, 48, 48, 48, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 71, 88, 45, 49, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 71, 88, 50, 48, 0, 0, 0, 0, 83, 97, 109, 115, 117, 110, 103, 32, 83, 56, 53, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 70, 56, 50, 56, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 82, 49, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 86, 51, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 82, 88, 49, 48, 48, 77, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 82, 88, 49, 48, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 82, 88, 49, 48, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 67, 45, 82, 88, 49, 0, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 49, 48, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 50, 57, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 50, 0, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 51, 48, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 51, 51, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 51, 53, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 51, 56, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 51, 57, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 52, 53, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 53, 56, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 53, 48, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 53, 0, 0, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 55, 48, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 56, 53, 48, 0, 0, 83, 111, 110, 121, 32, 68, 83, 76, 82, 45, 65, 57, 48, 48, 0, 0, 83, 111, 110, 121, 32, 73, 76, 67, 65, 45, 55, 55, 77, 50, 0, 0, 83, 111, 110, 121, 32, 73, 76, 67, 69, 45, 55, 77, 50, 0, 0, 0, 83, 111, 110, 121, 32, 73, 76, 67, 69, 45, 55, 83, 0, 0, 0, 0, 83, 111, 110, 121, 32, 73, 76, 67, 69, 45, 55, 82, 0, 0, 0, 0, 83, 111, 110, 121, 32, 73, 76, 67, 69, 45, 55, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 73, 76, 67, 69, 0, 0, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 53, 78, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 53, 82, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 53, 84, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 51, 78, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 51, 0, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 53, 0, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 54, 0, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 45, 55, 0, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 78, 69, 88, 0, 0, 0, 0, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 51, 51, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 51, 53, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 51, 55, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 53, 53, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 53, 55, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 53, 56, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 54, 53, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 55, 55, 0, 0, 0, 0, 83, 111, 110, 121, 32, 83, 76, 84, 45, 65, 57, 57, 0, 0, 0, 0, 86, 111, 108, 97, 114, 101, 0, 0, 67, 97, 110, 116, 97, 114, 101, 0, 67, 77, 111, 115, 116, 0, 0, 0, 86, 97, 108, 101, 111, 32, 54, 0, 86, 97, 108, 101, 111, 32, 49, 49, 0, 0, 0, 0, 0, 0, 0, 0, 86, 97, 108, 101, 111, 32, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0, 86, 97, 108, 101, 111, 32, 49, 49, 112, 0, 0, 0, 0, 0, 0, 0, 86, 97, 108, 101, 111, 32, 49, 55, 0, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 49, 55, 0, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 55, 53, 0, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 54, 53, 0, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 53, 52, 83, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 54, 53, 83, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 32, 55, 53, 83, 0, 0, 0, 0, 0, 0, 0, 65, 70, 105, 32, 53, 0, 0, 0, 65, 70, 105, 32, 54, 0, 0, 0, 65, 70, 105, 32, 55, 0, 0, 0, 65, 70, 105, 45, 73, 73, 32, 55, 0, 0, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 55, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 54, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 49, 48, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 53, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 49, 48, 82, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 56, 0, 0, 0, 0, 0, 0, 65, 112, 116, 117, 115, 45, 73, 73, 32, 49, 50, 0, 0, 0, 0, 0, 65, 70, 105, 45, 73, 73, 32, 49, 50, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 192, 3, 0, 0, 192, 4, 0, 0, 192, 5, 0, 0, 192, 6, 0, 0, 192, 7, 0, 0, 192, 8, 0, 0, 192, 9, 0, 0, 192, 10, 0, 0, 192, 11, 0, 0, 192, 12, 0, 0, 192, 13, 0, 0, 192, 14, 0, 0, 192, 15, 0, 0, 192, 16, 0, 0, 192, 17, 0, 0, 192, 18, 0, 0, 192, 19, 0, 0, 192, 20, 0, 0, 192, 21, 0, 0, 192, 22, 0, 0, 192, 23, 0, 0, 192, 24, 0, 0, 192, 25, 0, 0, 192, 26, 0, 0, 192, 27, 0, 0, 192, 28, 0, 0, 192, 29, 0, 0, 192, 30, 0, 0, 192, 31, 0, 0, 192, 0, 0, 0, 179, 1, 0, 0, 195, 2, 0, 0, 195, 3, 0, 0, 195, 4, 0, 0, 195, 5, 0, 0, 195, 6, 0, 0, 195, 7, 0, 0, 195, 8, 0, 0, 195, 9, 0, 0, 195, 10, 0, 0, 195, 11, 0, 0, 195, 12, 0, 0, 195, 13, 0, 0, 211, 14, 0, 0, 195, 15, 0, 0, 195, 0, 0, 12, 187, 1, 0, 12, 195, 2, 0, 12, 195, 3, 0, 12, 195, 4, 0, 12, 211, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 255, 255, 255, 255, 255, 255, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 7, 3, 6, 5, 0, 0, 0, 0, 0, 0, 0, 0, 105, 110, 102, 105, 110, 105, 116, 121, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 100, 0, 0, 0, 232, 3, 0, 0, 16, 39, 0, 0, 160, 134, 1, 0, 64, 66, 15, 0, 128, 150, 152, 0, 0, 225, 245, 5, 93, 61, 127, 102, 158, 160, 230, 63, 0, 0, 0, 0, 0, 136, 57, 61, 68, 23, 117, 250, 82, 176, 230, 63, 0, 0, 0, 0, 0, 0, 216, 60, 254, 217, 11, 117, 18, 192, 230, 63, 0, 0, 0, 0, 0, 120, 40, 189, 191, 118, 212, 221, 220, 207, 230, 63, 0, 0, 0, 0, 0, 192, 30, 61, 41, 26, 101, 60, 178, 223, 230, 63, 0, 0, 0, 0, 0, 0, 216, 188, 227, 58, 89, 152, 146, 239, 230, 63, 0, 0, 0, 0, 0, 0, 188, 188, 134, 147, 81, 249, 125, 255, 230, 63, 0, 0, 0, 0, 0, 216, 47, 189, 163, 45, 244, 102, 116, 15, 231, 63, 0, 0, 0, 0, 0, 136, 44, 189, 195, 95, 236, 232, 117, 31, 231, 63, 0, 0, 0, 0, 0, 192, 19, 61, 5, 207, 234, 134, 130, 47, 231, 63, 0, 0, 0, 0, 0, 48, 56, 189, 82, 129, 165, 72, 154, 63, 231, 63, 0, 0, 0, 0, 0, 192, 0, 189, 252, 204, 215, 53, 189, 79, 231, 63, 0, 0, 0, 0, 0, 136, 47, 61, 241, 103, 66, 86, 235, 95, 231, 63, 0, 0, 0, 0, 0, 224, 3, 61, 72, 109, 171, 177, 36, 112, 231, 63, 0, 0, 0, 0, 0, 208, 39, 189, 56, 93, 222, 79, 105, 128, 231, 63, 0, 0, 0, 0, 0, 0, 221, 188, 0, 29, 172, 56, 185, 144, 231, 63, 0, 0, 0, 0, 0, 0, 227, 60, 120, 1, 235, 115, 20, 161, 231, 63, 0, 0, 0, 0, 0, 0, 237, 188, 96, 208, 118, 9, 123, 177, 231, 63, 0, 0, 0, 0, 0, 64, 32, 61, 51, 193, 48, 1, 237, 193, 231, 63, 0, 0, 0, 0, 0, 0, 160, 60, 54, 134, 255, 98, 106, 210, 231, 63, 0, 0, 0, 0, 0, 144, 38, 189, 59, 78, 207, 54, 243, 226, 231, 63, 0, 0, 0, 0, 0, 224, 2, 189, 232, 195, 145, 132, 135, 243, 231, 63, 0, 0, 0, 0, 0, 88, 36, 189, 78, 27, 62, 84, 39, 4, 232, 63, 0, 0, 0, 0, 0, 0, 51, 61, 26, 7, 209, 173, 210, 20, 232, 63, 0, 0, 0, 0, 0, 0, 15, 61, 126, 205, 76, 153, 137, 37, 232, 63, 0, 0, 0, 0, 0, 192, 33, 189, 208, 66, 185, 30, 76, 54, 232, 63, 0, 0, 0, 0, 0, 208, 41, 61, 181, 202, 35, 70, 26, 71, 232, 63, 0, 0, 0, 0, 0, 16, 71, 61, 188, 91, 159, 23, 244, 87, 232, 63, 0, 0, 0, 0, 0, 96, 34, 61, 175, 145, 68, 155, 217, 104, 232, 63, 0, 0, 0, 0, 0, 196, 50, 189, 149, 163, 49, 217, 202, 121, 232, 63, 0, 0, 0, 0, 0, 0, 35, 189, 184, 101, 138, 217, 199, 138, 232, 63, 0, 0, 0, 0, 0, 128, 42, 189, 0, 88, 120, 164, 208, 155, 232, 63, 0, 0, 0, 0, 0, 0, 237, 188, 35, 162, 42, 66, 229, 172, 232, 63, 0, 0, 0, 0, 0, 40, 51, 61, 250, 25, 214, 186, 5, 190, 232, 63, 0, 0, 0, 0, 0, 180, 66, 61, 131, 67, 181, 22, 50, 207, 232, 63, 0, 0, 0, 0, 0, 208, 46, 189, 76, 102, 8, 94, 106, 224, 232, 63, 0, 0, 0, 0, 0, 80, 32, 189, 7, 120, 21, 153, 174, 241, 232, 63, 0, 0, 0, 0, 0, 40, 40, 61, 14, 44, 40, 208, 254, 2, 233, 63, 0, 0, 0, 0, 0, 176, 28, 189, 150, 255, 145, 11, 91, 20, 233, 63, 0, 0, 0, 0, 0, 224, 5, 189, 249, 47, 170, 83, 195, 37, 233, 63, 0, 0, 0, 0, 0, 64, 245, 60, 74, 198, 205, 176, 55, 55, 233, 63, 0, 0, 0, 0, 0, 32, 23, 61, 174, 152, 95, 43, 184, 72, 233, 63, 0, 0, 0, 0, 0, 0, 9, 189, 203, 82, 200, 203, 68, 90, 233, 63, 0, 0, 0, 0, 0, 104, 37, 61, 33, 111, 118, 154, 221, 107, 233, 63, 0, 0, 0, 0, 0, 208, 54, 189, 42, 78, 222, 159, 130, 125, 233, 63, 0, 0, 0, 0, 0, 0, 1, 189, 163, 35, 122, 228, 51, 143, 233, 63, 0, 0, 0, 0, 0, 0, 45, 61, 4, 6, 202, 112, 241, 160, 233, 63, 0, 0, 0, 0, 0, 164, 56, 189, 137, 255, 83, 77, 187, 178, 233, 63, 0, 0, 0, 0, 0, 92, 53, 61, 91, 241, 163, 130, 145, 196, 233, 63, 0, 0, 0, 0, 0, 184, 38, 61, 197, 184, 75, 25, 116, 214, 233, 63, 0, 0, 0, 0, 0, 0, 236, 188, 142, 35, 227, 25, 99, 232, 233, 63, 0, 0, 0, 0, 0, 208, 23, 61, 2, 243, 7, 141, 94, 250, 233, 63, 0, 0, 0, 0, 0, 64, 22, 61, 77, 229, 93, 123, 102, 12, 234, 63, 0, 0, 0, 0, 0, 0, 245, 188, 246, 184, 142, 237, 122, 30, 234, 63, 0, 0, 0, 0, 0, 224, 9, 61, 39, 46, 74, 236, 155, 48, 234, 63, 0, 0, 0, 0, 0, 216, 42, 61, 93, 10, 70, 128, 201, 66, 234, 63, 0, 0, 0, 0, 0, 240, 26, 189, 155, 37, 62, 178, 3, 85, 234, 63, 0, 0, 0, 0, 0, 96, 11, 61, 19, 98, 244, 138, 74, 103, 234, 63, 0, 0, 0, 0, 0, 136, 56, 61, 167, 179, 48, 19, 158, 121, 234, 63, 0, 0, 0, 0, 0, 32, 17, 61, 141, 46, 193, 83, 254, 139, 234, 63, 0, 0, 0, 0, 0, 192, 6, 61, 210, 252, 121, 85, 107, 158, 234, 63, 0, 0, 0, 0, 0, 184, 41, 189, 184, 111, 53, 33, 229, 176, 234, 63, 0, 0, 0, 0, 0, 112, 43, 61, 129, 243, 211, 191, 107, 195, 234, 63, 0, 0, 0, 0, 0, 0, 217, 60, 128, 39, 60, 58, 255, 213, 234, 63, 0, 0, 0, 0, 0, 0, 228, 60, 163, 210, 90, 153, 159, 232, 234, 63, 0, 0, 0, 0, 0, 144, 44, 189, 103, 243, 34, 230, 76, 251, 234, 63, 0, 0, 0, 0, 0, 80, 22, 61, 144, 183, 141, 41, 7, 14, 235, 63, 0, 0, 0, 0, 0, 212, 47, 61, 169, 137, 154, 108, 206, 32, 235, 63, 0, 0, 0, 0, 0, 112, 18, 61, 75, 26, 79, 184, 162, 51, 235, 63, 0, 0, 0, 0, 0, 71, 77, 61, 231, 71, 183, 21, 132, 70, 235, 63, 0, 0, 0, 0, 0, 56, 56, 189, 58, 89, 229, 141, 114, 89, 235, 63, 0, 0, 0, 0, 0, 0, 152, 60, 106, 197, 241, 41, 110, 108, 235, 63, 0, 0, 0, 0, 0, 208, 10, 61, 80, 94, 251, 242, 118, 127, 235, 63, 0, 0, 0, 0, 0, 128, 222, 60, 178, 73, 39, 242, 140, 146, 235, 63, 0, 0, 0, 0, 0, 192, 4, 189, 3, 6, 161, 48, 176, 165, 235, 63, 0, 0, 0, 0, 0, 112, 13, 189, 102, 111, 154, 183, 224, 184, 235, 63, 0, 0, 0, 0, 0, 144, 13, 61, 255, 193, 75, 144, 30, 204, 235, 63, 0, 0, 0, 0, 0, 160, 2, 61, 111, 161, 243, 195, 105, 223, 235, 63, 0, 0, 0, 0, 0, 120, 31, 189, 184, 29, 215, 91, 194, 242, 235, 63, 0, 0, 0, 0, 0, 160, 16, 189, 233, 178, 65, 97, 40, 6, 236, 63, 0, 0, 0, 0, 0, 64, 17, 189, 224, 82, 133, 221, 155, 25, 236, 63, 0, 0, 0, 0, 0, 224, 11, 61, 238, 100, 250, 217, 28, 45, 236, 63, 0, 0, 0, 0, 0, 64, 9, 189, 47, 208, 255, 95, 171, 64, 236, 63, 0, 0, 0, 0, 0, 208, 14, 189, 21, 253, 250, 120, 71, 84, 236, 63, 0, 0, 0, 0, 0, 102, 57, 61, 203, 208, 87, 46, 241, 103, 236, 63, 0, 0, 0, 0, 0, 16, 26, 189, 182, 193, 136, 137, 168, 123, 236, 63, 0, 0, 0, 0, 128, 69, 88, 189, 51, 231, 6, 148, 109, 143, 236, 63, 0, 0, 0, 0, 0, 72, 26, 189, 223, 196, 81, 87, 64, 163, 236, 63, 0, 0, 0, 0, 0, 0, 203, 60, 148, 144, 239, 220, 32, 183, 236, 63, 0, 0, 0, 0, 0, 64, 1, 61, 137, 22, 109, 46, 15, 203, 236, 63, 0, 0, 0, 0, 0, 32, 240, 60, 18, 196, 93, 85, 11, 223, 236, 63, 0, 0, 0, 0, 0, 96, 243, 60, 59, 171, 91, 91, 21, 243, 236, 63, 0, 0, 0, 0, 0, 144, 6, 189, 188, 137, 7, 74, 45, 7, 237, 63, 0, 0, 0, 0, 0, 160, 9, 61, 250, 200, 8, 43, 83, 27, 237, 63, 0, 0, 0, 0, 0, 224, 21, 189, 133, 138, 13, 8, 135, 47, 237, 63, 0, 0, 0, 0, 0, 40, 29, 61, 3, 162, 202, 234, 200, 67, 237, 63, 0, 0, 0, 0, 0, 160, 1, 61, 145, 164, 251, 220, 24, 88, 237, 63, 0, 0, 0, 0, 0, 0, 223, 60, 161, 230, 98, 232, 118, 108, 237, 63 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 616794), 
 allocate([ 160, 3, 189, 78, 131, 201, 22, 227, 128, 237, 63, 0, 0, 0, 0, 0, 216, 12, 189, 144, 96, 255, 113, 93, 149, 237, 63, 0, 0, 0, 0, 0, 192, 244, 60, 174, 50, 219, 3, 230, 169, 237, 63, 0, 0, 0, 0, 0, 144, 255, 60, 37, 131, 58, 214, 124, 190, 237, 63, 0, 0, 0, 0, 0, 128, 233, 60, 69, 180, 1, 243, 33, 211, 237, 63, 0, 0, 0, 0, 0, 32, 245, 188, 191, 5, 28, 100, 213, 231, 237, 63, 0, 0, 0, 0, 0, 112, 29, 189, 236, 154, 123, 51, 151, 252, 237, 63, 0, 0, 0, 0, 0, 20, 22, 189, 94, 125, 25, 107, 103, 17, 238, 63, 0, 0, 0, 0, 0, 72, 11, 61, 231, 163, 245, 20, 70, 38, 238, 63, 0, 0, 0, 0, 0, 206, 64, 61, 92, 238, 22, 59, 51, 59, 238, 63, 0, 0, 0, 0, 0, 104, 12, 61, 180, 63, 139, 231, 46, 80, 238, 63, 0, 0, 0, 0, 0, 48, 9, 189, 104, 109, 103, 36, 57, 101, 238, 63, 0, 0, 0, 0, 0, 0, 229, 188, 68, 76, 199, 251, 81, 122, 238, 63, 0, 0, 0, 0, 0, 248, 7, 189, 38, 183, 205, 119, 121, 143, 238, 63, 0, 0, 0, 0, 0, 112, 243, 188, 232, 144, 164, 162, 175, 164, 238, 63, 0, 0, 0, 0, 0, 208, 229, 60, 228, 202, 124, 134, 244, 185, 238, 63, 0, 0, 0, 0, 0, 26, 22, 61, 13, 104, 142, 45, 72, 207, 238, 63, 0, 0, 0, 0, 0, 80, 245, 60, 20, 133, 24, 162, 170, 228, 238, 63, 0, 0, 0, 0, 0, 64, 198, 60, 19, 90, 97, 238, 27, 250, 238, 63, 0, 0, 0, 0, 0, 128, 238, 188, 6, 65, 182, 28, 156, 15, 239, 63, 0, 0, 0, 0, 0, 136, 250, 188, 99, 185, 107, 55, 43, 37, 239, 63, 0, 0, 0, 0, 0, 144, 44, 189, 117, 114, 221, 72, 201, 58, 239, 63, 0, 0, 0, 0, 0, 0, 170, 60, 36, 69, 110, 91, 118, 80, 239, 63, 0, 0, 0, 0, 0, 240, 244, 188, 253, 68, 136, 121, 50, 102, 239, 63, 0, 0, 0, 0, 0, 128, 202, 60, 56, 190, 156, 173, 253, 123, 239, 63, 0, 0, 0, 0, 0, 188, 250, 60, 130, 60, 36, 2, 216, 145, 239, 63, 0, 0, 0, 0, 0, 96, 212, 188, 142, 144, 158, 129, 193, 167, 239, 63, 0, 0, 0, 0, 0, 12, 11, 189, 17, 213, 146, 54, 186, 189, 239, 63, 0, 0, 0, 0, 0, 224, 192, 188, 148, 113, 143, 43, 194, 211, 239, 63, 0, 0, 0, 0, 128, 222, 16, 189, 238, 35, 42, 107, 217, 233, 239, 63, 0, 0, 0, 0, 0, 67, 238, 60, 0, 0, 0, 0, 0, 0, 240, 63, 0, 0, 0, 0, 0, 0, 0, 0, 190, 188, 90, 250, 26, 11, 240, 63, 0, 0, 0, 0, 0, 64, 179, 188, 3, 51, 251, 169, 61, 22, 240, 63, 0, 0, 0, 0, 0, 23, 18, 189, 130, 2, 59, 20, 104, 33, 240, 63, 0, 0, 0, 0, 0, 64, 186, 60, 108, 128, 119, 62, 154, 44, 240, 63, 0, 0, 0, 0, 0, 152, 239, 60, 202, 187, 17, 46, 212, 55, 240, 63, 0, 0, 0, 0, 0, 64, 199, 188, 137, 127, 110, 232, 21, 67, 240, 63, 0, 0, 0, 0, 0, 48, 216, 60, 103, 84, 246, 114, 95, 78, 240, 63, 0, 0, 0, 0, 0, 63, 26, 189, 90, 133, 21, 211, 176, 89, 240, 63, 0, 0, 0, 0, 0, 132, 2, 189, 149, 31, 60, 14, 10, 101, 240, 63, 0, 0, 0, 0, 0, 96, 241, 60, 26, 247, 221, 41, 107, 112, 240, 63, 0, 0, 0, 0, 0, 36, 21, 61, 45, 168, 114, 43, 212, 123, 240, 63, 0, 0, 0, 0, 0, 160, 233, 188, 208, 155, 117, 24, 69, 135, 240, 63, 0, 0, 0, 0, 0, 64, 230, 60, 200, 7, 102, 246, 189, 146, 240, 63, 0, 0, 0, 0, 0, 120, 0, 189, 131, 243, 198, 202, 62, 158, 240, 63, 0, 0, 0, 0, 0, 0, 152, 188, 48, 57, 31, 155, 199, 169, 240, 63, 0, 0, 0, 0, 0, 160, 255, 60, 252, 136, 249, 108, 88, 181, 240, 63, 0, 0, 0, 0, 0, 200, 250, 188, 138, 108, 228, 69, 241, 192, 240, 63, 0, 0, 0, 0, 0, 192, 217, 60, 22, 72, 114, 43, 146, 204, 240, 63, 0, 0, 0, 0, 0, 32, 5, 61, 216, 93, 57, 35, 59, 216, 240, 63, 0, 0, 0, 0, 0, 208, 250, 188, 243, 209, 211, 50, 236, 227, 240, 63, 0, 0, 0, 0, 0, 172, 27, 61, 166, 169, 223, 95, 165, 239, 240, 63, 0, 0, 0, 0, 0, 232, 4, 189, 240, 210, 254, 175, 102, 251, 240, 63, 0, 0, 0, 0, 0, 48, 13, 189, 75, 35, 215, 40, 48, 7, 241, 63, 0, 0, 0, 0, 0, 80, 241, 60, 91, 91, 18, 208, 1, 19, 241, 63, 0, 0, 0, 0, 0, 0, 236, 60, 249, 42, 94, 171, 219, 30, 241, 63, 0, 0, 0, 0, 0, 188, 22, 61, 213, 49, 108, 192, 189, 42, 241, 63, 0, 0, 0, 0, 0, 64, 232, 60, 125, 4, 242, 20, 168, 54, 241, 63, 0, 0, 0, 0, 0, 208, 14, 189, 233, 45, 169, 174, 154, 66, 241, 63, 0, 0, 0, 0, 0, 224, 232, 60, 56, 49, 79, 147, 149, 78, 241, 63, 0, 0, 0, 0, 0, 64, 235, 60, 113, 142, 165, 200, 152, 90, 241, 63, 0, 0, 0, 0, 0, 48, 5, 61, 223, 195, 113, 84, 164, 102, 241, 63, 0, 0, 0, 0, 0, 56, 3, 61, 17, 82, 125, 60, 184, 114, 241, 63, 0, 0, 0, 0, 0, 212, 40, 61, 159, 187, 149, 134, 212, 126, 241, 63, 0, 0, 0, 0, 0, 208, 5, 189, 147, 141, 140, 56, 249, 138, 241, 63, 0, 0, 0, 0, 0, 136, 28, 189, 102, 93, 55, 88, 38, 151, 241, 63, 0, 0, 0, 0, 0, 240, 17, 61, 167, 203, 111, 235, 91, 163, 241, 63, 0, 0, 0, 0, 0, 72, 16, 61, 227, 135, 19, 248, 153, 175, 241, 63, 0, 0, 0, 0, 0, 57, 71, 189, 84, 93, 4, 132, 224, 187, 241, 63, 0, 0, 0, 0, 0, 228, 36, 61, 67, 28, 40, 149, 47, 200, 241, 63, 0, 0, 0, 0, 0, 32, 10, 189, 178, 185, 104, 49, 135, 212, 241, 63, 0, 0, 0, 0, 0, 128, 227, 60, 49, 64, 180, 94, 231, 224, 241, 63, 0, 0, 0, 0, 0, 192, 234, 60, 56, 217, 252, 34, 80, 237, 241, 63, 0, 0, 0, 0, 0, 144, 1, 61, 247, 205, 56, 132, 193, 249, 241, 63, 0, 0, 0, 0, 0, 120, 27, 189, 143, 141, 98, 136, 59, 6, 242, 63, 0, 0, 0, 0, 0, 148, 45, 61, 30, 168, 120, 53, 190, 18, 242, 63, 0, 0, 0, 0, 0, 0, 216, 60, 65, 221, 125, 145, 73, 31, 242, 63, 0, 0, 0, 0, 0, 52, 43, 61, 35, 19, 121, 162, 221, 43, 242, 63, 0, 0, 0, 0, 0, 248, 25, 61, 231, 97, 117, 110, 122, 56, 242, 63, 0, 0, 0, 0, 0, 200, 25, 189, 39, 20, 130, 251, 31, 69, 242, 63, 0, 0, 0, 0, 0, 48, 2, 61, 2, 166, 178, 79, 206, 81, 242, 63, 0, 0, 0, 0, 0, 72, 19, 189, 176, 206, 30, 113, 133, 94, 242, 63, 0, 0, 0, 0, 0, 112, 18, 61, 22, 125, 226, 101, 69, 107, 242, 63, 0, 0, 0, 0, 0, 208, 17, 61, 15, 224, 29, 52, 14, 120, 242, 63, 0, 0, 0, 0, 0, 238, 49, 61, 62, 99, 245, 225, 223, 132, 242, 63, 0, 0, 0, 0, 0, 192, 20, 189, 48, 187, 145, 117, 186, 145, 242, 63, 0, 0, 0, 0, 0, 216, 19, 189, 9, 223, 31, 245, 157, 158, 242, 63, 0, 0, 0, 0, 0, 176, 8, 61, 155, 14, 209, 102, 138, 171, 242, 63, 0, 0, 0, 0, 0, 124, 34, 189, 58, 218, 218, 208, 127, 184, 242, 63, 0, 0, 0, 0, 0, 52, 42, 61, 249, 26, 119, 57, 126, 197, 242, 63, 0, 0, 0, 0, 0, 128, 16, 189, 217, 2, 228, 166, 133, 210, 242, 63, 0, 0, 0, 0, 0, 208, 14, 189, 121, 21, 100, 31, 150, 223, 242, 63, 0, 0, 0, 0, 0, 32, 244, 188, 207, 46, 62, 169, 175, 236, 242, 63, 0, 0, 0, 0, 0, 152, 36, 189, 34, 136, 189, 74, 210, 249, 242, 63, 0, 0, 0, 0, 0, 48, 22, 189, 37, 182, 49, 10, 254, 6, 243, 63, 0, 0, 0, 0, 0, 54, 50, 189, 11, 165, 238, 237, 50, 20, 243, 63, 0, 0, 0, 0, 128, 223, 112, 189, 184, 215, 76, 252, 112, 33, 243, 63, 0, 0, 0, 0, 0, 72, 34, 189, 162, 233, 168, 59, 184, 46, 243, 63, 0, 0, 0, 0, 0, 152, 37, 189, 102, 23, 100, 178, 8, 60, 243, 63, 0, 0, 0, 0, 0, 208, 30, 61, 39, 250, 227, 102, 98, 73, 243, 63, 0, 0, 0, 0, 0, 0, 220, 188, 15, 159, 146, 95, 197, 86, 243, 63, 0, 0, 0, 0, 0, 216, 48, 189, 185, 136, 222, 162, 49, 100, 243, 63, 0, 0, 0, 0, 0, 200, 34, 61, 57, 170, 58, 55, 167, 113, 243, 63, 0, 0, 0, 0, 0, 96, 32, 61, 254, 116, 30, 35, 38, 127, 243, 63, 0, 0, 0, 0, 0, 96, 22, 189, 56, 216, 5, 109, 174, 140, 243, 63, 0, 0, 0, 0, 0, 224, 10, 189, 195, 62, 113, 27, 64, 154, 243, 63, 0, 0, 0, 0, 0, 114, 68, 189, 32, 160, 229, 52, 219, 167, 243, 63, 0, 0, 0, 0, 0, 32, 8, 61, 149, 110, 236, 191, 127, 181, 243, 63, 0, 0, 0, 0, 0, 128, 62, 61, 242, 168, 19, 195, 45, 195, 243, 63, 0, 0, 0, 0, 0, 128, 239, 60, 34, 225, 237, 68, 229, 208, 243, 63, 0, 0, 0, 0, 0, 160, 23, 189, 187, 52, 18, 76, 166, 222, 243, 63, 0, 0, 0, 0, 0, 48, 38, 61, 204, 78, 28, 223, 112, 236, 243, 63, 0, 0, 0, 0, 0, 166, 72, 189, 140, 126, 172, 4, 69, 250, 243, 63, 0, 0, 0, 0, 0, 220, 60, 189, 187, 160, 103, 195, 34, 8, 244, 63, 0, 0, 0, 0, 0, 184, 37, 61, 149, 46, 247, 33, 10, 22, 244, 63, 0, 0, 0, 0, 0, 192, 30, 61, 70, 70, 9, 39, 251, 35, 244, 63, 0, 0, 0, 0, 0, 96, 19, 189, 32, 169, 80, 217, 245, 49, 244, 63, 0, 0, 0, 0, 0, 152, 35, 61, 235, 185, 132, 63, 250, 63, 244, 63, 0, 0, 0, 0, 0, 0, 250, 60, 25, 137, 97, 96, 8, 78, 244, 63, 0, 0, 0, 0, 0, 192, 246, 188, 1, 210, 167, 66, 32, 92, 244, 63, 0, 0, 0, 0, 0, 192, 11, 189, 22, 0, 29, 237, 65, 106, 244, 63, 0, 0, 0, 0, 0, 128, 18, 189, 38, 51, 139, 102, 109, 120, 244, 63, 0, 0, 0, 0, 0, 224, 48, 61, 0, 60, 193, 181, 162, 134, 244, 63, 0, 0, 0, 0, 0, 64, 45, 189, 4, 175, 146, 225, 225, 148, 244, 63, 0, 0, 0, 0, 0, 32, 12, 61, 114, 211, 215, 240, 42, 163, 244, 63, 0, 0, 0, 0, 0, 80, 30, 189, 1, 184, 109, 234, 125, 177, 244, 63, 0, 0, 0, 0, 0, 128, 7, 61, 225, 41, 54, 213, 218, 191, 244, 63, 0, 0, 0, 0, 0, 128, 19, 189, 50, 193, 23, 184, 65, 206, 244, 63, 0, 0, 0, 0, 0, 128, 0, 61, 219, 221, 253, 153, 178, 220, 244, 63, 0, 0, 0, 0, 0, 112, 44, 61, 150, 171, 216, 129, 45, 235, 244, 63, 0, 0, 0, 0, 0, 224, 28, 189, 2, 45, 157, 118, 178, 249, 244, 63, 0, 0, 0, 0, 0, 32, 25, 61, 193, 49, 69, 127, 65, 8, 245, 63, 0, 0, 0, 0, 0, 192, 8, 189, 42, 102, 207, 162, 218, 22, 245, 63, 0, 0, 0, 0, 0, 0, 250, 188, 234, 81, 63, 232, 125, 37, 245, 63, 0, 0, 0, 0, 0, 8, 74, 61, 218, 78, 157, 86, 43, 52, 245, 63, 0, 0, 0, 0, 0, 216, 38, 189, 26, 172, 246, 244, 226, 66, 245, 63, 0, 0, 0, 0, 0, 68, 50, 189, 219, 148, 93, 202, 164, 81, 245, 63, 0, 0, 0, 0, 0, 60, 72, 61, 107, 17, 233, 221, 112, 96, 245, 63, 0, 0, 0, 0, 0, 176, 36, 61, 222, 41, 181, 54, 71, 111, 245, 63, 0, 0, 0, 0, 0, 90, 65, 61, 14, 196, 226, 219, 39, 126, 245, 63, 0, 0, 0, 0, 0, 224, 41, 189, 111, 199, 151, 212, 18, 141, 245, 63, 0, 0, 0, 0, 0, 8, 35, 189, 76, 11, 255, 39, 8, 156, 245, 63, 0, 0, 0, 0, 0, 236, 77, 61, 39, 84, 72, 221, 7, 171, 245, 63, 0, 0, 0, 0, 0, 0, 196, 188, 244, 122, 168, 251, 17, 186, 245, 63, 0, 0, 0, 0, 0, 8, 48, 61, 11, 70, 89, 138, 38, 201, 245, 63, 0, 0, 0, 0, 0, 200, 38, 189, 63, 142, 153, 144, 69, 216, 245, 63, 0, 0, 0, 0, 0, 154, 70, 61, 225, 32, 173, 21, 111, 231, 245, 63, 0, 0, 0, 0, 0, 64, 27, 189, 202, 235, 220, 32, 163, 246, 245, 63, 0, 0, 0, 0, 0, 112, 23, 61, 184, 220, 118, 185, 225, 5, 246, 63, 0, 0, 0, 0, 0, 248, 38, 61, 21, 247, 205, 230, 42, 21, 246, 63, 0, 0, 0, 0, 0, 0, 1, 61, 49, 85, 58, 176, 126, 36, 246, 63, 0, 0, 0, 0, 0, 208, 21, 189, 181, 41, 25, 29, 221, 51, 246, 63, 0, 0, 0, 0, 0, 208, 18, 189, 19, 195, 204, 52, 70, 67, 246, 63, 0, 0, 0, 0, 0, 128, 234, 188, 250, 142, 188, 254, 185, 82, 246, 63, 0, 0, 0, 0, 0, 96, 40, 189, 151, 51, 85, 130, 56, 98, 246, 63, 0, 0, 0, 0, 0, 254, 113, 61, 142, 50, 8, 199, 193, 113, 246, 63, 0, 0, 0, 0, 0, 32, 55, 189, 126, 169, 76, 212, 85, 129, 246, 63, 0, 0, 0, 0, 0, 128, 230, 60, 113, 148, 158, 177, 244, 144, 246, 63, 0, 0, 0, 0, 0, 120, 41, 189, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 10, 0, 17, 17, 17, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 15, 10, 17, 17, 17, 3, 10, 7, 0, 1, 19, 9, 11, 11, 0, 0, 9, 6, 11, 0, 0, 11, 0, 6, 17, 0, 0, 0, 17, 17, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 17, 0, 10, 10, 17, 17, 17, 0, 10, 0, 0, 2, 0, 9, 11, 0, 0, 0, 9, 0, 11, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 0, 0, 9, 12, 0, 0, 0, 0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 0, 0, 0, 4, 13, 0, 0, 0, 0, 9, 14, 0, 0, 0, 0, 0, 14, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 16, 0, 0, 0, 0, 0, 16, 0, 0, 16, 0, 0, 18, 0, 0, 0, 18, 18, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 18, 18, 18, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 11, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 0, 0, 9, 12, 0, 0, 0, 0, 0, 12, 0, 0, 12, 0, 0, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 45, 43, 32, 32, 32, 48, 88, 48, 120, 0, 0, 0, 0, 0, 0, 0, 40, 110, 117, 108, 108, 41, 0, 0, 45, 48, 88, 43, 48, 88, 32, 48, 88, 45, 48, 120, 43, 48, 120, 32, 48, 120, 0, 0, 0, 0, 0, 0, 105, 110, 102, 0, 0, 0, 0, 0, 73, 78, 70, 0, 0, 0, 0, 0, 110, 97, 110, 0, 0, 0, 0, 0, 78, 65, 78, 0, 0, 0, 0, 0, 46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE + 627037);
 var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
 assert(tempDoublePtr % 8 == 0);
 var ERRNO_CODES = {
  EPERM: 1,
  ENOENT: 2,
  ESRCH: 3,
  EINTR: 4,
  EIO: 5,
  ENXIO: 6,
  E2BIG: 7,
  ENOEXEC: 8,
  EBADF: 9,
  ECHILD: 10,
  EAGAIN: 11,
  EWOULDBLOCK: 11,
  ENOMEM: 12,
  EACCES: 13,
  EFAULT: 14,
  ENOTBLK: 15,
  EBUSY: 16,
  EEXIST: 17,
  EXDEV: 18,
  ENODEV: 19,
  ENOTDIR: 20,
  EISDIR: 21,
  EINVAL: 22,
  ENFILE: 23,
  EMFILE: 24,
  ENOTTY: 25,
  ETXTBSY: 26,
  EFBIG: 27,
  ENOSPC: 28,
  ESPIPE: 29,
  EROFS: 30,
  EMLINK: 31,
  EPIPE: 32,
  EDOM: 33,
  ERANGE: 34,
  ENOMSG: 42,
  EIDRM: 43,
  ECHRNG: 44,
  EL2NSYNC: 45,
  EL3HLT: 46,
  EL3RST: 47,
  ELNRNG: 48,
  EUNATCH: 49,
  ENOCSI: 50,
  EL2HLT: 51,
  EDEADLK: 35,
  ENOLCK: 37,
  EBADE: 52,
  EBADR: 53,
  EXFULL: 54,
  ENOANO: 55,
  EBADRQC: 56,
  EBADSLT: 57,
  EDEADLOCK: 35,
  EBFONT: 59,
  ENOSTR: 60,
  ENODATA: 61,
  ETIME: 62,
  ENOSR: 63,
  ENONET: 64,
  ENOPKG: 65,
  EREMOTE: 66,
  ENOLINK: 67,
  EADV: 68,
  ESRMNT: 69,
  ECOMM: 70,
  EPROTO: 71,
  EMULTIHOP: 72,
  EDOTDOT: 73,
  EBADMSG: 74,
  ENOTUNIQ: 76,
  EBADFD: 77,
  EREMCHG: 78,
  ELIBACC: 79,
  ELIBBAD: 80,
  ELIBSCN: 81,
  ELIBMAX: 82,
  ELIBEXEC: 83,
  ENOSYS: 38,
  ENOTEMPTY: 39,
  ENAMETOOLONG: 36,
  ELOOP: 40,
  EOPNOTSUPP: 95,
  EPFNOSUPPORT: 96,
  ECONNRESET: 104,
  ENOBUFS: 105,
  EAFNOSUPPORT: 97,
  EPROTOTYPE: 91,
  ENOTSOCK: 88,
  ENOPROTOOPT: 92,
  ESHUTDOWN: 108,
  ECONNREFUSED: 111,
  EADDRINUSE: 98,
  ECONNABORTED: 103,
  ENETUNREACH: 101,
  ENETDOWN: 100,
  ETIMEDOUT: 110,
  EHOSTDOWN: 112,
  EHOSTUNREACH: 113,
  EINPROGRESS: 115,
  EALREADY: 114,
  EDESTADDRREQ: 89,
  EMSGSIZE: 90,
  EPROTONOSUPPORT: 93,
  ESOCKTNOSUPPORT: 94,
  EADDRNOTAVAIL: 99,
  ENETRESET: 102,
  EISCONN: 106,
  ENOTCONN: 107,
  ETOOMANYREFS: 109,
  EUSERS: 87,
  EDQUOT: 122,
  ESTALE: 116,
  ENOTSUP: 95,
  ENOMEDIUM: 123,
  EILSEQ: 84,
  EOVERFLOW: 75,
  ECANCELED: 125,
  ENOTRECOVERABLE: 131,
  EOWNERDEAD: 130,
  ESTRPIPE: 86
 }, ERRNO_MESSAGES = {
  0: "Success",
  1: "Not super-user",
  2: "No such file or directory",
  3: "No such process",
  4: "Interrupted system call",
  5: "I/O error",
  6: "No such device or address",
  7: "Arg list too long",
  8: "Exec format error",
  9: "Bad file number",
  10: "No children",
  11: "No more processes",
  12: "Not enough core",
  13: "Permission denied",
  14: "Bad address",
  15: "Block device required",
  16: "Mount device busy",
  17: "File exists",
  18: "Cross-device link",
  19: "No such device",
  20: "Not a directory",
  21: "Is a directory",
  22: "Invalid argument",
  23: "Too many open files in system",
  24: "Too many open files",
  25: "Not a typewriter",
  26: "Text file busy",
  27: "File too large",
  28: "No space left on device",
  29: "Illegal seek",
  30: "Read only file system",
  31: "Too many links",
  32: "Broken pipe",
  33: "Math arg out of domain of func",
  34: "Math result not representable",
  35: "File locking deadlock error",
  36: "File or path name too long",
  37: "No record locks available",
  38: "Function not implemented",
  39: "Directory not empty",
  40: "Too many symbolic links",
  42: "No message of desired type",
  43: "Identifier removed",
  44: "Channel number out of range",
  45: "Level 2 not synchronized",
  46: "Level 3 halted",
  47: "Level 3 reset",
  48: "Link number out of range",
  49: "Protocol driver not attached",
  50: "No CSI structure available",
  51: "Level 2 halted",
  52: "Invalid exchange",
  53: "Invalid request descriptor",
  54: "Exchange full",
  55: "No anode",
  56: "Invalid request code",
  57: "Invalid slot",
  59: "Bad font file fmt",
  60: "Device not a stream",
  61: "No data (for no delay io)",
  62: "Timer expired",
  63: "Out of streams resources",
  64: "Machine is not on the network",
  65: "Package not installed",
  66: "The object is remote",
  67: "The link has been severed",
  68: "Advertise error",
  69: "Srmount error",
  70: "Communication error on send",
  71: "Protocol error",
  72: "Multihop attempted",
  73: "Cross mount point (not really error)",
  74: "Trying to read unreadable message",
  75: "Value too large for defined data type",
  76: "Given log. name not unique",
  77: "f.d. invalid for this operation",
  78: "Remote address changed",
  79: "Can   access a needed shared lib",
  80: "Accessing a corrupted shared lib",
  81: ".lib section in a.out corrupted",
  82: "Attempting to link in too many libs",
  83: "Attempting to exec a shared library",
  84: "Illegal byte sequence",
  86: "Streams pipe error",
  87: "Too many users",
  88: "Socket operation on non-socket",
  89: "Destination address required",
  90: "Message too long",
  91: "Protocol wrong type for socket",
  92: "Protocol not available",
  93: "Unknown protocol",
  94: "Socket type not supported",
  95: "Not supported",
  96: "Protocol family not supported",
  97: "Address family not supported by protocol family",
  98: "Address already in use",
  99: "Address not available",
  100: "Network interface is not configured",
  101: "Network is unreachable",
  102: "Connection reset by network",
  103: "Connection aborted",
  104: "Connection reset by peer",
  105: "No buffer space available",
  106: "Socket is already connected",
  107: "Socket is not connected",
  108: "Can't send after socket shutdown",
  109: "Too many references",
  110: "Connection timed out",
  111: "Connection refused",
  112: "Host is down",
  113: "Host is unreachable",
  114: "Socket already connected",
  115: "Connection already in progress",
  116: "Stale file handle",
  122: "Quota exceeded",
  123: "No medium (in tape drive)",
  125: "Operation canceled",
  130: "Previous owner died",
  131: "State not recoverable"
 }, ___errno_state = 0, PATH = {
  splitPath: function(filename) {
   var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
   return splitPathRe.exec(filename).slice(1);
  },
  normalizeArray: function(parts, allowAboveRoot) {
   for (var up = 0, i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    "." === last ? parts.splice(i, 1) : ".." === last ? (parts.splice(i, 1), up++) : up && (parts.splice(i, 1), up--);
   }
   if (allowAboveRoot) for (;up--; up) parts.unshift("..");
   return parts;
  },
  normalize: function(path) {
   var isAbsolute = "/" === path.charAt(0), trailingSlash = "/" === path.substr(-1);
   return path = PATH.normalizeArray(path.split("/").filter(function(p) {
    return !!p;
   }), !isAbsolute).join("/"), path || isAbsolute || (path = "."), path && trailingSlash && (path += "/"), (isAbsolute ? "/" : "") + path;
  },
  dirname: function(path) {
   var result = PATH.splitPath(path), root = result[0], dir = result[1];
   return root || dir ? (dir && (dir = dir.substr(0, dir.length - 1)), root + dir) : ".";
  },
  basename: function(path) {
   if ("/" === path) return "/";
   var lastSlash = path.lastIndexOf("/");
   return -1 === lastSlash ? path : path.substr(lastSlash + 1);
  },
  extname: function(path) {
   return PATH.splitPath(path)[3];
  },
  join: function() {
   var paths = Array.prototype.slice.call(arguments, 0);
   return PATH.normalize(paths.join("/"));
  },
  join2: function(l, r) {
   return PATH.normalize(l + "/" + r);
  },
  resolve: function() {
   for (var resolvedPath = "", resolvedAbsolute = !1, i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = i >= 0 ? arguments[i] : FS.cwd();
    if ("string" != typeof path) throw new TypeError("Arguments to path.resolve must be strings");
    if (!path) return "";
    resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = "/" === path.charAt(0);
   }
   return resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
    return !!p;
   }), !resolvedAbsolute).join("/"), (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
  },
  relative: function(from, to) {
   function trim(arr) {
    for (var start = 0; arr.length > start && "" === arr[start]; start++) ;
    for (var end = arr.length - 1; end >= 0 && "" === arr[end]; end--) ;
    return start > end ? [] : arr.slice(start, end - start + 1);
   }
   from = PATH.resolve(from).substr(1), to = PATH.resolve(to).substr(1);
   for (var fromParts = trim(from.split("/")), toParts = trim(to.split("/")), length = Math.min(fromParts.length, toParts.length), samePartsLength = length, i = 0; length > i; i++) if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
   for (var outputParts = [], i = samePartsLength; fromParts.length > i; i++) outputParts.push("..");
   return outputParts = outputParts.concat(toParts.slice(samePartsLength)), outputParts.join("/");
  }
 }, TTY = {
  ttys: [],
  init: function() {},
  shutdown: function() {},
  register: function(dev, ops) {
   TTY.ttys[dev] = {
    input: [],
    output: [],
    ops: ops
   }, FS.registerDevice(dev, TTY.stream_ops);
  },
  stream_ops: {
   open: function(stream) {
    var tty = TTY.ttys[stream.node.rdev];
    if (!tty) throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
    stream.tty = tty, stream.seekable = !1;
   },
   close: function(stream) {
    stream.tty.ops.flush(stream.tty);
   },
   flush: function(stream) {
    stream.tty.ops.flush(stream.tty);
   },
   read: function(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.get_char) throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
    for (var bytesRead = 0, i = 0; length > i; i++) {
     var result;
     try {
      result = stream.tty.ops.get_char(stream.tty);
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
     if (void 0 === result && 0 === bytesRead) throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     if (null === result || void 0 === result) break;
     bytesRead++, buffer[offset + i] = result;
    }
    return bytesRead && (stream.node.timestamp = Date.now()), bytesRead;
   },
   write: function(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.put_char) throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
    for (var i = 0; length > i; i++) try {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    return length && (stream.node.timestamp = Date.now()), i;
   }
  },
  default_tty_ops: {
   get_char: function(tty) {
    if (!tty.input.length) {
     var result = null;
     if ("undefined" != typeof window && "function" == typeof window.prompt ? (result = window.prompt("Input: "), null !== result && (result += "\n")) : "function" == typeof readline && (result = readline(), null !== result && (result += "\n")), !result) return null;
     tty.input = intArrayFromString(result, !0);
    }
    return tty.input.shift();
   },
   put_char: function(tty, val) {
    null === val || 10 === val ? (Module.print(UTF8ArrayToString(tty.output, 0)), tty.output = []) : 0 != val && tty.output.push(val);
   },
   flush: function(tty) {
    tty.output && tty.output.length > 0 && (Module.print(UTF8ArrayToString(tty.output, 0)), tty.output = []);
   }
  },
  default_tty1_ops: {
   put_char: function(tty, val) {
    null === val || 10 === val ? (Module.printErr(UTF8ArrayToString(tty.output, 0)), tty.output = []) : 0 != val && tty.output.push(val);
   },
   flush: function(tty) {
    tty.output && tty.output.length > 0 && (Module.printErr(UTF8ArrayToString(tty.output, 0)), tty.output = []);
   }
  }
 }, MEMFS = {
  ops_table: null,
  mount: function(mount) {
   return MEMFS.createNode(null, "/", 16895, 0);
  },
  createNode: function(parent, name, mode, dev) {
   if (FS.isBlkdev(mode) || FS.isFIFO(mode)) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   MEMFS.ops_table || (MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap,
      msync: MEMFS.stream_ops.msync
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   });
   var node = FS.createNode(parent, name, mode, dev);
   return FS.isDir(node.mode) ? (node.node_ops = MEMFS.ops_table.dir.node, node.stream_ops = MEMFS.ops_table.dir.stream, node.contents = {}) : FS.isFile(node.mode) ? (node.node_ops = MEMFS.ops_table.file.node, node.stream_ops = MEMFS.ops_table.file.stream, node.usedBytes = 0, node.contents = null) : FS.isLink(node.mode) ? (node.node_ops = MEMFS.ops_table.link.node, node.stream_ops = MEMFS.ops_table.link.stream) : FS.isChrdev(node.mode) && (node.node_ops = MEMFS.ops_table.chrdev.node, node.stream_ops = MEMFS.ops_table.chrdev.stream), node.timestamp = Date.now(), parent && (parent.contents[name] = node), node;
  },
  getFileDataAsRegularArray: function(node) {
   if (node.contents && node.contents.subarray) {
    for (var arr = [], i = 0; node.usedBytes > i; ++i) arr.push(node.contents[i]);
    return arr;
   }
   return node.contents;
  },
  getFileDataAsTypedArray: function(node) {
   return node.contents ? node.contents.subarray ? node.contents.subarray(0, node.usedBytes) : new Uint8Array(node.contents) : new Uint8Array();
  },
  expandFileStorage: function(node, newCapacity) {
   if (!node.contents || node.contents.subarray) {
    var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1048576;
    newCapacity = Math.max(newCapacity, prevCapacity * (CAPACITY_DOUBLING_MAX > prevCapacity ? 2 : 1.125) | 0), 0 != prevCapacity && (newCapacity = Math.max(newCapacity, 256));
    var oldContents = node.contents;
    return node.contents = new Uint8Array(newCapacity), void (node.usedBytes > 0 && node.contents.set(oldContents.subarray(0, node.usedBytes), 0));
   }
   for (!node.contents && newCapacity > 0 && (node.contents = []); newCapacity > node.contents.length; ) node.contents.push(0);
  },
  resizeFileStorage: function(node, newSize) {
   if (node.usedBytes != newSize) {
    if (0 == newSize) return node.contents = null, void (node.usedBytes = 0);
    if (!node.contents || node.contents.subarray) {
     var oldContents = node.contents;
     return node.contents = new Uint8Array(new ArrayBuffer(newSize)), oldContents && node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))), void (node.usedBytes = newSize);
    }
    if (node.contents || (node.contents = []), node.contents.length > newSize) node.contents.length = newSize; else for (;newSize > node.contents.length; ) node.contents.push(0);
    node.usedBytes = newSize;
   }
  },
  node_ops: {
   getattr: function(node) {
    var attr = {};
    return attr.dev = FS.isChrdev(node.mode) ? node.id : 1, attr.ino = node.id, attr.mode = node.mode, attr.nlink = 1, attr.uid = 0, attr.gid = 0, attr.rdev = node.rdev, attr.size = FS.isDir(node.mode) ? 4096 : FS.isFile(node.mode) ? node.usedBytes : FS.isLink(node.mode) ? node.link.length : 0, attr.atime = new Date(node.timestamp), attr.mtime = new Date(node.timestamp), attr.ctime = new Date(node.timestamp), attr.blksize = 4096, attr.blocks = Math.ceil(attr.size / attr.blksize), attr;
   },
   setattr: function(node, attr) {
    void 0 !== attr.mode && (node.mode = attr.mode), void 0 !== attr.timestamp && (node.timestamp = attr.timestamp), void 0 !== attr.size && MEMFS.resizeFileStorage(node, attr.size);
   },
   lookup: function(parent, name) {
    throw FS.genericErrors[ERRNO_CODES.ENOENT];
   },
   mknod: function(parent, name, mode, dev) {
    return MEMFS.createNode(parent, name, mode, dev);
   },
   rename: function(old_node, new_dir, new_name) {
    if (FS.isDir(old_node.mode)) {
     var new_node;
     try {
      new_node = FS.lookupNode(new_dir, new_name);
     } catch (e) {}
     if (new_node) for (var i in new_node.contents) throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
    }
    delete old_node.parent.contents[old_node.name], old_node.name = new_name, new_dir.contents[new_name] = old_node, old_node.parent = new_dir;
   },
   unlink: function(parent, name) {
    delete parent.contents[name];
   },
   rmdir: function(parent, name) {
    var node = FS.lookupNode(parent, name);
    for (var i in node.contents) throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
    delete parent.contents[name];
   },
   readdir: function(node) {
    var entries = [ ".", ".." ];
    for (var key in node.contents) node.contents.hasOwnProperty(key) && entries.push(key);
    return entries;
   },
   symlink: function(parent, newname, oldpath) {
    var node = MEMFS.createNode(parent, newname, 41471, 0);
    return node.link = oldpath, node;
   },
   readlink: function(node) {
    if (!FS.isLink(node.mode)) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    return node.link;
   }
  },
  stream_ops: {
   read: function(stream, buffer, offset, length, position) {
    var contents = stream.node.contents;
    if (position >= stream.node.usedBytes) return 0;
    var size = Math.min(stream.node.usedBytes - position, length);
    if (assert(size >= 0), size > 8 && contents.subarray) buffer.set(contents.subarray(position, position + size), offset); else for (var i = 0; size > i; i++) buffer[offset + i] = contents[position + i];
    return size;
   },
   write: function(stream, buffer, offset, length, position, canOwn) {
    if (!length) return 0;
    var node = stream.node;
    if (node.timestamp = Date.now(), buffer.subarray && (!node.contents || node.contents.subarray)) {
     if (canOwn) return node.contents = buffer.subarray(offset, offset + length), node.usedBytes = length, length;
     if (0 === node.usedBytes && 0 === position) return node.contents = new Uint8Array(buffer.subarray(offset, offset + length)), node.usedBytes = length, length;
     if (node.usedBytes >= position + length) return node.contents.set(buffer.subarray(offset, offset + length), position), length;
    }
    if (MEMFS.expandFileStorage(node, position + length), node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else for (var i = 0; length > i; i++) node.contents[position + i] = buffer[offset + i];
    return node.usedBytes = Math.max(node.usedBytes, position + length), length;
   },
   llseek: function(stream, offset, whence) {
    var position = offset;
    if (1 === whence ? position += stream.position : 2 === whence && FS.isFile(stream.node.mode) && (position += stream.node.usedBytes), 0 > position) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
    return position;
   },
   allocate: function(stream, offset, length) {
    MEMFS.expandFileStorage(stream.node, offset + length), stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
   },
   mmap: function(stream, buffer, offset, length, position, prot, flags) {
    if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
    var ptr, allocated, contents = stream.node.contents;
    if (2 & flags || contents.buffer !== buffer && contents.buffer !== buffer.buffer) {
     if ((position > 0 || stream.node.usedBytes > position + length) && (contents = contents.subarray ? contents.subarray(position, position + length) : Array.prototype.slice.call(contents, position, position + length)), allocated = !0, ptr = _malloc(length), !ptr) throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
     buffer.set(contents, ptr);
    } else allocated = !1, ptr = contents.byteOffset;
    return {
     ptr: ptr,
     allocated: allocated
    };
   },
   msync: function(stream, buffer, offset, length, mmapFlags) {
    if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
    if (2 & mmapFlags) return 0;
    MEMFS.stream_ops.write(stream, buffer, 0, length, offset, !1);
    return 0;
   }
  }
 }, _stdin = allocate(1, "i32*", ALLOC_STATIC), _stdout = allocate(1, "i32*", ALLOC_STATIC), _stderr = allocate(1, "i32*", ALLOC_STATIC), FS = {
  root: null,
  mounts: [],
  devices: [ null ],
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: "/",
  initialized: !1,
  ignorePermissions: !0,
  trackingDelegate: {},
  tracking: {
   openFlags: {
    READ: 1,
    WRITE: 2
   }
  },
  ErrnoError: null,
  genericErrors: {},
  handleFSError: function(e) {
   if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
   return ___setErrNo(e.errno);
  },
  lookupPath: function(path, opts) {
   if (path = PATH.resolve(FS.cwd(), path), opts = opts || {}, !path) return {
    path: "",
    node: null
   };
   var defaults = {
    follow_mount: !0,
    recurse_count: 0
   };
   for (var key in defaults) void 0 === opts[key] && (opts[key] = defaults[key]);
   if (opts.recurse_count > 8) throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
   for (var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
    return !!p;
   }), !1), current = FS.root, current_path = "/", i = 0; parts.length > i; i++) {
    var islast = i === parts.length - 1;
    if (islast && opts.parent) break;
    if (current = FS.lookupNode(current, parts[i]), current_path = PATH.join2(current_path, parts[i]), FS.isMountpoint(current) && (!islast || islast && opts.follow_mount) && (current = current.mounted.root), !islast || opts.follow) for (var count = 0; FS.isLink(current.mode); ) {
     var link = FS.readlink(current_path);
     current_path = PATH.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     if (current = lookup.node, count++ > 40) throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
    }
   }
   return {
    path: current_path,
    node: current
   };
  },
  getPath: function(node) {
   for (var path; ;) {
    if (FS.isRoot(node)) {
     var mount = node.mount.mountpoint;
     return path ? "/" !== mount[mount.length - 1] ? mount + "/" + path : mount + path : mount;
    }
    path = path ? node.name + "/" + path : node.name, node = node.parent;
   }
  },
  hashName: function(parentid, name) {
   for (var hash = 0, i = 0; name.length > i; i++) hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
   return (parentid + hash >>> 0) % FS.nameTable.length;
  },
  hashAddNode: function(node) {
   var hash = FS.hashName(node.parent.id, node.name);
   node.name_next = FS.nameTable[hash], FS.nameTable[hash] = node;
  },
  hashRemoveNode: function(node) {
   var hash = FS.hashName(node.parent.id, node.name);
   if (FS.nameTable[hash] === node) FS.nameTable[hash] = node.name_next; else for (var current = FS.nameTable[hash]; current; ) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  },
  lookupNode: function(parent, name) {
   var err = FS.mayLookup(parent);
   if (err) throw new FS.ErrnoError(err, parent);
   for (var hash = FS.hashName(parent.id, name), node = FS.nameTable[hash]; node; node = node.name_next) {
    var nodeName = node.name;
    if (node.parent.id === parent.id && nodeName === name) return node;
   }
   return FS.lookup(parent, name);
  },
  createNode: function(parent, name, mode, rdev) {
   if (!FS.FSNode) {
    FS.FSNode = function(parent, name, mode, rdev) {
     parent || (parent = this), this.parent = parent, this.mount = parent.mount, this.mounted = null, this.id = FS.nextInode++, this.name = name, this.mode = mode, this.node_ops = {}, this.stream_ops = {}, this.rdev = rdev;
    }, FS.FSNode.prototype = {};
    var readMode = 365, writeMode = 146;
    Object.defineProperties(FS.FSNode.prototype, {
     read: {
      get: function() {
       return (this.mode & readMode) === readMode;
      },
      set: function(val) {
       val ? this.mode |= readMode : this.mode &= ~readMode;
      }
     },
     write: {
      get: function() {
       return (this.mode & writeMode) === writeMode;
      },
      set: function(val) {
       val ? this.mode |= writeMode : this.mode &= ~writeMode;
      }
     },
     isFolder: {
      get: function() {
       return FS.isDir(this.mode);
      }
     },
     isDevice: {
      get: function() {
       return FS.isChrdev(this.mode);
      }
     }
    });
   }
   var node = new FS.FSNode(parent, name, mode, rdev);
   return FS.hashAddNode(node), node;
  },
  destroyNode: function(node) {
   FS.hashRemoveNode(node);
  },
  isRoot: function(node) {
   return node === node.parent;
  },
  isMountpoint: function(node) {
   return !!node.mounted;
  },
  isFile: function(mode) {
   return 32768 === (61440 & mode);
  },
  isDir: function(mode) {
   return 16384 === (61440 & mode);
  },
  isLink: function(mode) {
   return 40960 === (61440 & mode);
  },
  isChrdev: function(mode) {
   return 8192 === (61440 & mode);
  },
  isBlkdev: function(mode) {
   return 24576 === (61440 & mode);
  },
  isFIFO: function(mode) {
   return 4096 === (61440 & mode);
  },
  isSocket: function(mode) {
   return 49152 === (49152 & mode);
  },
  flagModes: {
   r: 0,
   rs: 1052672,
   "r+": 2,
   w: 577,
   wx: 705,
   xw: 705,
   "w+": 578,
   "wx+": 706,
   "xw+": 706,
   a: 1089,
   ax: 1217,
   xa: 1217,
   "a+": 1090,
   "ax+": 1218,
   "xa+": 1218
  },
  modeStringToFlags: function(str) {
   var flags = FS.flagModes[str];
   if ("undefined" == typeof flags) throw new Error("Unknown file open mode: " + str);
   return flags;
  },
  flagsToPermissionString: function(flag) {
   var accmode = 2097155 & flag, perms = [ "r", "w", "rw" ][accmode];
   return 512 & flag && (perms += "w"), perms;
  },
  nodePermissions: function(node, perms) {
   return FS.ignorePermissions ? 0 : (-1 === perms.indexOf("r") || 292 & node.mode) && (-1 === perms.indexOf("w") || 146 & node.mode) && (-1 === perms.indexOf("x") || 73 & node.mode) ? 0 : ERRNO_CODES.EACCES;
  },
  mayLookup: function(dir) {
   var err = FS.nodePermissions(dir, "x");
   return err ? err : dir.node_ops.lookup ? 0 : ERRNO_CODES.EACCES;
  },
  mayCreate: function(dir, name) {
   try {
    FS.lookupNode(dir, name);
    return ERRNO_CODES.EEXIST;
   } catch (e) {}
   return FS.nodePermissions(dir, "wx");
  },
  mayDelete: function(dir, name, isdir) {
   var node;
   try {
    node = FS.lookupNode(dir, name);
   } catch (e) {
    return e.errno;
   }
   var err = FS.nodePermissions(dir, "wx");
   if (err) return err;
   if (isdir) {
    if (!FS.isDir(node.mode)) return ERRNO_CODES.ENOTDIR;
    if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return ERRNO_CODES.EBUSY;
   } else if (FS.isDir(node.mode)) return ERRNO_CODES.EISDIR;
   return 0;
  },
  mayOpen: function(node, flags) {
   return node ? FS.isLink(node.mode) ? ERRNO_CODES.ELOOP : FS.isDir(node.mode) && (0 !== (2097155 & flags) || 512 & flags) ? ERRNO_CODES.EISDIR : FS.nodePermissions(node, FS.flagsToPermissionString(flags)) : ERRNO_CODES.ENOENT;
  },
  MAX_OPEN_FDS: 4096,
  nextfd: function(fd_start, fd_end) {
   fd_start = fd_start || 0, fd_end = fd_end || FS.MAX_OPEN_FDS;
   for (var fd = fd_start; fd_end >= fd; fd++) if (!FS.streams[fd]) return fd;
   throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
  },
  getStream: function(fd) {
   return FS.streams[fd];
  },
  createStream: function(stream, fd_start, fd_end) {
   FS.FSStream || (FS.FSStream = function() {}, FS.FSStream.prototype = {}, Object.defineProperties(FS.FSStream.prototype, {
    object: {
     get: function() {
      return this.node;
     },
     set: function(val) {
      this.node = val;
     }
    },
    isRead: {
     get: function() {
      return 1 !== (2097155 & this.flags);
     }
    },
    isWrite: {
     get: function() {
      return 0 !== (2097155 & this.flags);
     }
    },
    isAppend: {
     get: function() {
      return 1024 & this.flags;
     }
    }
   }));
   var newStream = new FS.FSStream();
   for (var p in stream) newStream[p] = stream[p];
   stream = newStream;
   var fd = FS.nextfd(fd_start, fd_end);
   return stream.fd = fd, FS.streams[fd] = stream, stream;
  },
  closeStream: function(fd) {
   FS.streams[fd] = null;
  },
  getStreamFromPtr: function(ptr) {
   return FS.streams[ptr - 1];
  },
  getPtrForStream: function(stream) {
   return stream ? stream.fd + 1 : 0;
  },
  chrdev_stream_ops: {
   open: function(stream) {
    var device = FS.getDevice(stream.node.rdev);
    stream.stream_ops = device.stream_ops, stream.stream_ops.open && stream.stream_ops.open(stream);
   },
   llseek: function() {
    throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
   }
  },
  major: function(dev) {
   return dev >> 8;
  },
  minor: function(dev) {
   return 255 & dev;
  },
  makedev: function(ma, mi) {
   return ma << 8 | mi;
  },
  registerDevice: function(dev, ops) {
   FS.devices[dev] = {
    stream_ops: ops
   };
  },
  getDevice: function(dev) {
   return FS.devices[dev];
  },
  getMounts: function(mount) {
   for (var mounts = [], check = [ mount ]; check.length; ) {
    var m = check.pop();
    mounts.push(m), check.push.apply(check, m.mounts);
   }
   return mounts;
  },
  syncfs: function(populate, callback) {
   function done(err) {
    if (err) {
     if (!done.errored) return done.errored = !0, callback(err);
    } else ++completed >= mounts.length && callback(null);
   }
   "function" == typeof populate && (callback = populate, populate = !1);
   var mounts = FS.getMounts(FS.root.mount), completed = 0;
   mounts.forEach(function(mount) {
    return mount.type.syncfs ? void mount.type.syncfs(mount, populate, done) : done(null);
   });
  },
  mount: function(type, opts, mountpoint) {
   var node, root = "/" === mountpoint, pseudo = !mountpoint;
   if (root && FS.root) throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   if (!root && !pseudo) {
    var lookup = FS.lookupPath(mountpoint, {
     follow_mount: !1
    });
    if (mountpoint = lookup.path, node = lookup.node, FS.isMountpoint(node)) throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
    if (!FS.isDir(node.mode)) throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
   }
   var mount = {
    type: type,
    opts: opts,
    mountpoint: mountpoint,
    mounts: []
   }, mountRoot = type.mount(mount);
   return mountRoot.mount = mount, mount.root = mountRoot, root ? FS.root = mountRoot : node && (node.mounted = mount, node.mount && node.mount.mounts.push(mount)), mountRoot;
  },
  unmount: function(mountpoint) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: !1
   });
   if (!FS.isMountpoint(lookup.node)) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   var node = lookup.node, mount = node.mounted, mounts = FS.getMounts(mount);
   Object.keys(FS.nameTable).forEach(function(hash) {
    for (var current = FS.nameTable[hash]; current; ) {
     var next = current.name_next;
     -1 !== mounts.indexOf(current.mount) && FS.destroyNode(current), current = next;
    }
   }), node.mounted = null;
   var idx = node.mount.mounts.indexOf(mount);
   assert(-1 !== idx), node.mount.mounts.splice(idx, 1);
  },
  lookup: function(parent, name) {
   return parent.node_ops.lookup(parent, name);
  },
  mknod: function(path, mode, dev) {
   var lookup = FS.lookupPath(path, {
    parent: !0
   }), parent = lookup.node, name = PATH.basename(path);
   if (!name || "." === name || ".." === name) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   var err = FS.mayCreate(parent, name);
   if (err) throw new FS.ErrnoError(err);
   if (!parent.node_ops.mknod) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   return parent.node_ops.mknod(parent, name, mode, dev);
  },
  create: function(path, mode) {
   return mode = void 0 !== mode ? mode : 438, mode &= 4095, mode |= 32768, FS.mknod(path, mode, 0);
  },
  mkdir: function(path, mode) {
   return mode = void 0 !== mode ? mode : 511, mode &= 1023, mode |= 16384, FS.mknod(path, mode, 0);
  },
  mkdev: function(path, mode, dev) {
   return "undefined" == typeof dev && (dev = mode, mode = 438), mode |= 8192, FS.mknod(path, mode, dev);
  },
  symlink: function(oldpath, newpath) {
   if (!PATH.resolve(oldpath)) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   var lookup = FS.lookupPath(newpath, {
    parent: !0
   }), parent = lookup.node;
   if (!parent) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   var newname = PATH.basename(newpath), err = FS.mayCreate(parent, newname);
   if (err) throw new FS.ErrnoError(err);
   if (!parent.node_ops.symlink) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   return parent.node_ops.symlink(parent, newname, oldpath);
  },
  rename: function(old_path, new_path) {
   var lookup, old_dir, new_dir, old_dirname = PATH.dirname(old_path), new_dirname = PATH.dirname(new_path), old_name = PATH.basename(old_path), new_name = PATH.basename(new_path);
   try {
    lookup = FS.lookupPath(old_path, {
     parent: !0
    }), old_dir = lookup.node, lookup = FS.lookupPath(new_path, {
     parent: !0
    }), new_dir = lookup.node;
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   }
   if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   if (old_dir.mount !== new_dir.mount) throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
   var old_node = FS.lookupNode(old_dir, old_name), relative = PATH.relative(old_path, new_dirname);
   if ("." !== relative.charAt(0)) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   if (relative = PATH.relative(new_path, old_dirname), "." !== relative.charAt(0)) throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
   var new_node;
   try {
    new_node = FS.lookupNode(new_dir, new_name);
   } catch (e) {}
   if (old_node !== new_node) {
    var isdir = FS.isDir(old_node.mode), err = FS.mayDelete(old_dir, old_name, isdir);
    if (err) throw new FS.ErrnoError(err);
    if (err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name)) throw new FS.ErrnoError(err);
    if (!old_dir.node_ops.rename) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
    if (new_dir !== old_dir && (err = FS.nodePermissions(old_dir, "w"))) throw new FS.ErrnoError(err);
    try {
     FS.trackingDelegate.willMovePath && FS.trackingDelegate.willMovePath(old_path, new_path);
    } catch (e) {
     console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
    }
    FS.hashRemoveNode(old_node);
    try {
     old_dir.node_ops.rename(old_node, new_dir, new_name);
    } catch (e) {
     throw e;
    } finally {
     FS.hashAddNode(old_node);
    }
    try {
     FS.trackingDelegate.onMovePath && FS.trackingDelegate.onMovePath(old_path, new_path);
    } catch (e) {
     console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
    }
   }
  },
  rmdir: function(path) {
   var lookup = FS.lookupPath(path, {
    parent: !0
   }), parent = lookup.node, name = PATH.basename(path), node = FS.lookupNode(parent, name), err = FS.mayDelete(parent, name, !0);
   if (err) throw new FS.ErrnoError(err);
   if (!parent.node_ops.rmdir) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   if (FS.isMountpoint(node)) throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   try {
    FS.trackingDelegate.willDeletePath && FS.trackingDelegate.willDeletePath(path);
   } catch (e) {
    console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
   }
   parent.node_ops.rmdir(parent, name), FS.destroyNode(node);
   try {
    FS.trackingDelegate.onDeletePath && FS.trackingDelegate.onDeletePath(path);
   } catch (e) {
    console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
   }
  },
  readdir: function(path) {
   var lookup = FS.lookupPath(path, {
    follow: !0
   }), node = lookup.node;
   if (!node.node_ops.readdir) throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
   return node.node_ops.readdir(node);
  },
  unlink: function(path) {
   var lookup = FS.lookupPath(path, {
    parent: !0
   }), parent = lookup.node, name = PATH.basename(path), node = FS.lookupNode(parent, name), err = FS.mayDelete(parent, name, !1);
   if (err) throw err === ERRNO_CODES.EISDIR && (err = ERRNO_CODES.EPERM), new FS.ErrnoError(err);
   if (!parent.node_ops.unlink) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   if (FS.isMountpoint(node)) throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   try {
    FS.trackingDelegate.willDeletePath && FS.trackingDelegate.willDeletePath(path);
   } catch (e) {
    console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
   }
   parent.node_ops.unlink(parent, name), FS.destroyNode(node);
   try {
    FS.trackingDelegate.onDeletePath && FS.trackingDelegate.onDeletePath(path);
   } catch (e) {
    console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
   }
  },
  readlink: function(path) {
   var lookup = FS.lookupPath(path), link = lookup.node;
   if (!link) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   if (!link.node_ops.readlink) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link));
  },
  stat: function(path, dontFollow) {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   }), node = lookup.node;
   if (!node) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   if (!node.node_ops.getattr) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   return node.node_ops.getattr(node);
  },
  lstat: function(path) {
   return FS.stat(path, !0);
  },
  chmod: function(path, mode, dontFollow) {
   var node;
   if ("string" == typeof path) {
    var lookup = FS.lookupPath(path, {
     follow: !dontFollow
    });
    node = lookup.node;
   } else node = path;
   if (!node.node_ops.setattr) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   node.node_ops.setattr(node, {
    mode: 4095 & mode | -4096 & node.mode,
    timestamp: Date.now()
   });
  },
  lchmod: function(path, mode) {
   FS.chmod(path, mode, !0);
  },
  fchmod: function(fd, mode) {
   var stream = FS.getStream(fd);
   if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
   FS.chmod(stream.node, mode);
  },
  chown: function(path, uid, gid, dontFollow) {
   var node;
   if ("string" == typeof path) {
    var lookup = FS.lookupPath(path, {
     follow: !dontFollow
    });
    node = lookup.node;
   } else node = path;
   if (!node.node_ops.setattr) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   node.node_ops.setattr(node, {
    timestamp: Date.now()
   });
  },
  lchown: function(path, uid, gid) {
   FS.chown(path, uid, gid, !0);
  },
  fchown: function(fd, uid, gid) {
   var stream = FS.getStream(fd);
   if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
   FS.chown(stream.node, uid, gid);
  },
  truncate: function(path, len) {
   if (0 > len) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   var node;
   if ("string" == typeof path) {
    var lookup = FS.lookupPath(path, {
     follow: !0
    });
    node = lookup.node;
   } else node = path;
   if (!node.node_ops.setattr) throw new FS.ErrnoError(ERRNO_CODES.EPERM);
   if (FS.isDir(node.mode)) throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
   if (!FS.isFile(node.mode)) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   var err = FS.nodePermissions(node, "w");
   if (err) throw new FS.ErrnoError(err);
   node.node_ops.setattr(node, {
    size: len,
    timestamp: Date.now()
   });
  },
  ftruncate: function(fd, len) {
   var stream = FS.getStream(fd);
   if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
   if (0 === (2097155 & stream.flags)) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   FS.truncate(stream.node, len);
  },
  utime: function(path, atime, mtime) {
   var lookup = FS.lookupPath(path, {
    follow: !0
   }), node = lookup.node;
   node.node_ops.setattr(node, {
    timestamp: Math.max(atime, mtime)
   });
  },
  open: function(path, flags, mode, fd_start, fd_end) {
   if ("" === path) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   flags = "string" == typeof flags ? FS.modeStringToFlags(flags) : flags, mode = "undefined" == typeof mode ? 438 : mode, mode = 64 & flags ? 4095 & mode | 32768 : 0;
   var node;
   if ("object" == typeof path) node = path; else {
    path = PATH.normalize(path);
    try {
     var lookup = FS.lookupPath(path, {
      follow: !(131072 & flags)
     });
     node = lookup.node;
    } catch (e) {}
   }
   var created = !1;
   if (64 & flags) if (node) {
    if (128 & flags) throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
   } else node = FS.mknod(path, mode, 0), created = !0;
   if (!node) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
   if (FS.isChrdev(node.mode) && (flags &= -513), !created) {
    var err = FS.mayOpen(node, flags);
    if (err) throw new FS.ErrnoError(err);
   }
   512 & flags && FS.truncate(node, 0), flags &= -641;
   var stream = FS.createStream({
    node: node,
    path: FS.getPath(node),
    flags: flags,
    seekable: !0,
    position: 0,
    stream_ops: node.stream_ops,
    ungotten: [],
    error: !1
   }, fd_start, fd_end);
   stream.stream_ops.open && stream.stream_ops.open(stream), !Module.logReadFiles || 1 & flags || (FS.readFiles || (FS.readFiles = {}), path in FS.readFiles || (FS.readFiles[path] = 1, Module.printErr("read file: " + path)));
   try {
    if (FS.trackingDelegate.onOpenFile) {
     var trackingFlags = 0;
     1 !== (2097155 & flags) && (trackingFlags |= FS.tracking.openFlags.READ), 0 !== (2097155 & flags) && (trackingFlags |= FS.tracking.openFlags.WRITE), FS.trackingDelegate.onOpenFile(path, trackingFlags);
    }
   } catch (e) {
    console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
   }
   return stream;
  },
  close: function(stream) {
   try {
    stream.stream_ops.close && stream.stream_ops.close(stream);
   } catch (e) {
    throw e;
   } finally {
    FS.closeStream(stream.fd);
   }
  },
  llseek: function(stream, offset, whence) {
   if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
   return stream.position = stream.stream_ops.llseek(stream, offset, whence), stream.ungotten = [], stream.position;
  },
  read: function(stream, buffer, offset, length, position) {
   if (0 > length || 0 > position) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   if (1 === (2097155 & stream.flags)) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
   if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
   if (!stream.stream_ops.read) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   var seeking = !0;
   if ("undefined" == typeof position) position = stream.position, seeking = !1; else if (!stream.seekable) throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
   var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
   return seeking || (stream.position += bytesRead), bytesRead;
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
   if (0 > length || 0 > position) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   if (0 === (2097155 & stream.flags)) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
   if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
   if (!stream.stream_ops.write) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   1024 & stream.flags && FS.llseek(stream, 0, 2);
   var seeking = !0;
   if ("undefined" == typeof position) position = stream.position, seeking = !1; else if (!stream.seekable) throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
   var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
   seeking || (stream.position += bytesWritten);
   try {
    stream.path && FS.trackingDelegate.onWriteToFile && FS.trackingDelegate.onWriteToFile(stream.path);
   } catch (e) {
    console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message);
   }
   return bytesWritten;
  },
  allocate: function(stream, offset, length) {
   if (0 > offset || 0 >= length) throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   if (0 === (2097155 & stream.flags)) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
   if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   if (!stream.stream_ops.allocate) throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   stream.stream_ops.allocate(stream, offset, length);
  },
  mmap: function(stream, buffer, offset, length, position, prot, flags) {
   if (1 === (2097155 & stream.flags)) throw new FS.ErrnoError(ERRNO_CODES.EACCES);
   if (!stream.stream_ops.mmap) throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
   return stream && stream.stream_ops.msync ? stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags) : 0;
  },
  munmap: function(stream) {
   return 0;
  },
  ioctl: function(stream, cmd, arg) {
   if (!stream.stream_ops.ioctl) throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
   return stream.stream_ops.ioctl(stream, cmd, arg);
  },
  readFile: function(path, opts) {
   if (opts = opts || {}, opts.flags = opts.flags || "r", opts.encoding = opts.encoding || "binary", "utf8" !== opts.encoding && "binary" !== opts.encoding) throw new Error('Invalid encoding type "' + opts.encoding + '"');
   var ret, stream = FS.open(path, opts.flags), stat = FS.stat(path), length = stat.size, buf = new Uint8Array(length);
   return FS.read(stream, buf, 0, length, 0), "utf8" === opts.encoding ? ret = UTF8ArrayToString(buf, 0) : "binary" === opts.encoding && (ret = buf), FS.close(stream), ret;
  },
  writeFile: function(path, data, opts) {
   if (opts = opts || {}, opts.flags = opts.flags || "w", opts.encoding = opts.encoding || "utf8", "utf8" !== opts.encoding && "binary" !== opts.encoding) throw new Error('Invalid encoding type "' + opts.encoding + '"');
   var stream = FS.open(path, opts.flags, opts.mode);
   if ("utf8" === opts.encoding) {
    var buf = new Uint8Array(lengthBytesUTF8(data) + 1), actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
    FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
   } else "binary" === opts.encoding && FS.write(stream, data, 0, data.length, 0, opts.canOwn);
   FS.close(stream);
  },
  cwd: function() {
   return FS.currentPath;
  },
  chdir: function(path) {
   var lookup = FS.lookupPath(path, {
    follow: !0
   });
   if (!FS.isDir(lookup.node.mode)) throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
   var err = FS.nodePermissions(lookup.node, "x");
   if (err) throw new FS.ErrnoError(err);
   FS.currentPath = lookup.path;
  },
  createDefaultDirectories: function() {
   FS.mkdir("/tmp"), FS.mkdir("/home"), FS.mkdir("/home/diegocr");
  },
  createDefaultDevices: function() {
   FS.mkdir("/dev"), FS.registerDevice(FS.makedev(1, 3), {
    read: function() {
     return 0;
    },
    write: function(stream, buffer, offset, length, pos) {
     return length;
    }
   }), FS.mkdev("/dev/null", FS.makedev(1, 3)), TTY.register(FS.makedev(5, 0), TTY.default_tty_ops), TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops), FS.mkdev("/dev/tty", FS.makedev(5, 0)), FS.mkdev("/dev/tty1", FS.makedev(6, 0));
   var random_device;
   if ("undefined" != typeof crypto) {
    var randomBuffer = new Uint8Array(1);
    random_device = function() {
     return crypto.getRandomValues(randomBuffer), randomBuffer[0];
    };
   } else random_device = function() {
    return 256 * Math.random() | 0;
   };
   FS.createDevice("/dev", "random", random_device), FS.createDevice("/dev", "urandom", random_device), FS.mkdir("/dev/shm"), FS.mkdir("/dev/shm/tmp");
  },
  createStandardStreams: function() {
   Module.stdin ? FS.createDevice("/dev", "stdin", Module.stdin) : FS.symlink("/dev/tty", "/dev/stdin"), Module.stdout ? FS.createDevice("/dev", "stdout", null, Module.stdout) : FS.symlink("/dev/tty", "/dev/stdout"), Module.stderr ? FS.createDevice("/dev", "stderr", null, Module.stderr) : FS.symlink("/dev/tty1", "/dev/stderr");
   var stdin = FS.open("/dev/stdin", "r");
   HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin), assert(0 === stdin.fd, "invalid handle for stdin (" + stdin.fd + ")");
   var stdout = FS.open("/dev/stdout", "w");
   HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout), assert(1 === stdout.fd, "invalid handle for stdout (" + stdout.fd + ")");
   var stderr = FS.open("/dev/stderr", "w");
   HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr), assert(2 === stderr.fd, "invalid handle for stderr (" + stderr.fd + ")");
  },
  ensureErrnoError: function() {
   FS.ErrnoError || (FS.ErrnoError = function(errno, node) {
    this.node = node, this.setErrno = function(errno) {
     this.errno = errno;
     for (var key in ERRNO_CODES) if (ERRNO_CODES[key] === errno) {
      this.code = key;
      break;
     }
    }, this.setErrno(errno), this.message = ERRNO_MESSAGES[errno];
   }, FS.ErrnoError.prototype = new Error(), FS.ErrnoError.prototype.constructor = FS.ErrnoError, [ ERRNO_CODES.ENOENT ].forEach(function(code) {
    FS.genericErrors[code] = new FS.ErrnoError(code), FS.genericErrors[code].stack = "<generic error, no stack>";
   }));
  },
  staticInit: function() {
   FS.ensureErrnoError(), FS.nameTable = new Array(4096), FS.mount(MEMFS, {}, "/"), FS.createDefaultDirectories(), FS.createDefaultDevices();
  },
  init: function(input, output, error) {
   assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)"), FS.init.initialized = !0, FS.ensureErrnoError(), Module.stdin = input || Module.stdin, Module.stdout = output || Module.stdout, Module.stderr = error || Module.stderr, FS.createStandardStreams();
  },
  quit: function() {
   FS.init.initialized = !1;
   for (var i = 0; FS.streams.length > i; i++) {
    var stream = FS.streams[i];
    stream && FS.close(stream);
   }
  },
  getMode: function(canRead, canWrite) {
   var mode = 0;
   return canRead && (mode |= 365), canWrite && (mode |= 146), mode;
  },
  joinPath: function(parts, forceRelative) {
   var path = PATH.join.apply(null, parts);
   return forceRelative && "/" == path[0] && (path = path.substr(1)), path;
  },
  absolutePath: function(relative, base) {
   return PATH.resolve(base, relative);
  },
  standardizePath: function(path) {
   return PATH.normalize(path);
  },
  findObject: function(path, dontResolveLastLink) {
   var ret = FS.analyzePath(path, dontResolveLastLink);
   return ret.exists ? ret.object : (___setErrNo(ret.error), null);
  },
  analyzePath: function(path, dontResolveLastLink) {
   try {
    var lookup = FS.lookupPath(path, {
     follow: !dontResolveLastLink
    });
    path = lookup.path;
   } catch (e) {}
   var ret = {
    isRoot: !1,
    exists: !1,
    error: 0,
    name: null,
    path: null,
    object: null,
    parentExists: !1,
    parentPath: null,
    parentObject: null
   };
   try {
    var lookup = FS.lookupPath(path, {
     parent: !0
    });
    ret.parentExists = !0, ret.parentPath = lookup.path, ret.parentObject = lookup.node, ret.name = PATH.basename(path), lookup = FS.lookupPath(path, {
     follow: !dontResolveLastLink
    }), ret.exists = !0, ret.path = lookup.path, ret.object = lookup.node, ret.name = lookup.node.name, ret.isRoot = "/" === lookup.path;
   } catch (e) {
    ret.error = e.errno;
   }
   return ret;
  },
  createFolder: function(parent, name, canRead, canWrite) {
   var path = PATH.join2("string" == typeof parent ? parent : FS.getPath(parent), name), mode = FS.getMode(canRead, canWrite);
   return FS.mkdir(path, mode);
  },
  createPath: function(parent, path, canRead, canWrite) {
   parent = "string" == typeof parent ? parent : FS.getPath(parent);
   for (var parts = path.split("/").reverse(); parts.length; ) {
    var part = parts.pop();
    if (part) {
     var current = PATH.join2(parent, part);
     try {
      FS.mkdir(current);
     } catch (e) {}
     parent = current;
    }
   }
   return current;
  },
  createFile: function(parent, name, properties, canRead, canWrite) {
   var path = PATH.join2("string" == typeof parent ? parent : FS.getPath(parent), name), mode = FS.getMode(canRead, canWrite);
   return FS.create(path, mode);
  },
  createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
   var path = name ? PATH.join2("string" == typeof parent ? parent : FS.getPath(parent), name) : parent, mode = FS.getMode(canRead, canWrite), node = FS.create(path, mode);
   if (data) {
    if ("string" == typeof data) {
     for (var arr = new Array(data.length), i = 0, len = data.length; len > i; ++i) arr[i] = data.charCodeAt(i);
     data = arr;
    }
    FS.chmod(node, 146 | mode);
    var stream = FS.open(node, "w");
    FS.write(stream, data, 0, data.length, 0, canOwn), FS.close(stream), FS.chmod(node, mode);
   }
   return node;
  },
  createDevice: function(parent, name, input, output) {
   var path = PATH.join2("string" == typeof parent ? parent : FS.getPath(parent), name), mode = FS.getMode(!!input, !!output);
   FS.createDevice.major || (FS.createDevice.major = 64);
   var dev = FS.makedev(FS.createDevice.major++, 0);
   return FS.registerDevice(dev, {
    open: function(stream) {
     stream.seekable = !1;
    },
    close: function(stream) {
     output && output.buffer && output.buffer.length && output(10);
    },
    read: function(stream, buffer, offset, length, pos) {
     for (var bytesRead = 0, i = 0; length > i; i++) {
      var result;
      try {
       result = input();
      } catch (e) {
       throw new FS.ErrnoError(ERRNO_CODES.EIO);
      }
      if (void 0 === result && 0 === bytesRead) throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
      if (null === result || void 0 === result) break;
      bytesRead++, buffer[offset + i] = result;
     }
     return bytesRead && (stream.node.timestamp = Date.now()), bytesRead;
    },
    write: function(stream, buffer, offset, length, pos) {
     for (var i = 0; length > i; i++) try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
     return length && (stream.node.timestamp = Date.now()), i;
    }
   }), FS.mkdev(path, mode, dev);
  },
  createLink: function(parent, name, target, canRead, canWrite) {
   var path = PATH.join2("string" == typeof parent ? parent : FS.getPath(parent), name);
   return FS.symlink(target, path);
  },
  forceLoadFile: 0,
  createLazyFile: 0,
  createPreloadedFile: 0,
  indexedDB: 0,
  DB_NAME: 0,
  DB_VERSION: 0,
  DB_STORE_NAME: 0,
  saveFilesToDB: 0,
  loadFilesFromDB: 0
 };
 Module._i64Subtract = _i64Subtract;
 var _floorf = Math_floor;
 Module._strlen = _strlen;
 var _sqrtf = Math_sqrt;
 Module._strncpy = _strncpy, Module._i64Add = _i64Add;
 Module._memcpy = _memcpy, Module._saveSetjmp = _saveSetjmp;
 var _tzname = allocate(8, "i32*", ALLOC_STATIC), _daylight = allocate(1, "i32*", ALLOC_STATIC), _timezone = allocate(1, "i32*", ALLOC_STATIC), ___tm_current = allocate(44, "i8", ALLOC_STATIC);
 allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);
 Module._bitshift64Ashr = _bitshift64Ashr, Module._bitshift64Lshr = _bitshift64Lshr, Module._memset = _memset;
 Module._testSetjmp = _testSetjmp;
 allocate(44, "i8", ALLOC_STATIC);
 Module._memmove = _memmove;
 var _llvm_pow_f64 = Math_pow;
 Module._strcat = _strcat, Module._bitshift64Shl = _bitshift64Shl;
 var _fabs = Math_abs, _floor = Math_floor, _sqrt = Math_sqrt, _log = Math_log, _cos = Math_cos;
 Module._strcpy = _strcpy;
 var _exp = Math_exp;
 FS.staticInit(), __ATINIT__.unshift(function() {
  Module.noFSInit || FS.init.initialized || FS.init();
 }), __ATMAIN__.push(function() {
  FS.ignorePermissions = !1;
 }), __ATEXIT__.push(function() {
  FS.quit();
 }), ___errno_state = Runtime.staticAlloc(4), HEAP32[___errno_state >> 2] = 0, __ATINIT__.unshift(function() {
  TTY.init();
 }), __ATEXIT__.push(function() {
  TTY.shutdown();
 });
 __ATINIT__.push(function() {}), _fputc.ret = allocate([ 0 ], "i8", ALLOC_STATIC), _fgetc.ret = allocate([ 0 ], "i8", ALLOC_STATIC), STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP), staticSealed = !0, STACK_MAX = STACK_BASE + TOTAL_STACK, DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX), assert(TOTAL_MEMORY > DYNAMIC_BASE, "TOTAL_MEMORY not big enough for stack");
 var cttz_i8 = allocate([ 8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0 ], "i8", ALLOC_DYNAMIC);
 Module.asmGlobalArg = {
  Math: Math,
  Int8Array: Int8Array,
  Int16Array: Int16Array,
  Int32Array: Int32Array,
  Uint8Array: Uint8Array,
  Uint16Array: Uint16Array,
  Uint32Array: Uint32Array,
  Float32Array: Float32Array,
  Float64Array: Float64Array,
  NaN: NaN,
  Infinity: 1 / 0,
  byteLength: byteLength
 }, Module.asmLibraryArg = {
  abort: abort,
  assert: assert,
  invoke_iiii: invoke_iiii,
  invoke_di: invoke_di,
  invoke_vi: invoke_vi,
  invoke_vii: invoke_vii,
  invoke_ii: invoke_ii,
  invoke_viii: invoke_viii,
  invoke_v: invoke_v,
  invoke_iiiii: invoke_iiiii,
  invoke_iii: invoke_iii,
  _fabs: _fabs,
  _exp: _exp,
  _llvm_pow_f64: _llvm_pow_f64,
  _send: _send,
  _fgetc: _fgetc,
  _getcwd: _getcwd,
  _sqrtf: _sqrtf,
  _ntohl: _ntohl,
  _fread: _fread,
  _ctime: _ctime,
  _ctime_r: _ctime_r,
  _lseek: _lseek,
  _open: _open,
  _getc: _getc,
  _ungetc: _ungetc,
  _feof: _feof,
  _ntohs: _ntohs,
  _floor: _floor,
  _longjmp: _longjmp,
  _fflush: _fflush,
  _htonl: _htonl,
  _time: _time,
  _localtime: _localtime,
  _pwrite: _pwrite,
  _strerror_r: _strerror_r,
  _localtime_r: _localtime_r,
  _fscanf: _fscanf,
  __reallyNegative: __reallyNegative,
  _sbrk: _sbrk,
  _tzset: _tzset,
  _emscripten_memcpy_big: _emscripten_memcpy_big,
  _fileno: _fileno,
  _perror: _perror,
  _sysconf: _sysconf,
  _utime: _utime,
  ___setErrNo: ___setErrNo,
  _putc: _putc,
  _fseeko: _fseeko,
  _getc_unlocked: _getc_unlocked,
  _cos: _cos,
  _fseek: _fseek,
  _asctime_r: _asctime_r,
  _pread: _pread,
  _puts: _puts,
  _printf: _printf,
  _fclose: _fclose,
  _floorf: _floorf,
  _sqrt: _sqrt,
  _log: _log,
  _htons: _htons,
  _write: _write,
  _ftell: _ftell,
  ___errno_location: ___errno_location,
  _recv: _recv,
  _swab: _swab,
  _ftello: _ftello,
  _mkport: _mkport,
  __scanString: __scanString,
  _fgets: _fgets,
  __getFloat: __getFloat,
  _fputc: _fputc,
  _abort: _abort,
  _mktime: _mktime,
  _fwrite: _fwrite,
  _tmpnam: _tmpnam,
  _fprintf: _fprintf,
  _strerror: _strerror,
  _emscripten_longjmp: _emscripten_longjmp,
  __formatString: __formatString,
  _fputs: _fputs,
  _tmpfile: _tmpfile,
  _fopen: _fopen,
  _close: _close,
  _read: _read,
  STACKTOP: STACKTOP,
  STACK_MAX: STACK_MAX,
  tempDoublePtr: tempDoublePtr,
  ABORT: ABORT,
  cttz_i8: cttz_i8,
  _stderr: _stderr,
  _stdin: _stdin,
  _stdout: _stdout
 };
 var asm = function(global, env, buffer) {
  "use asm";
  function _emscripten_replace_memory(newBuffer) {
   return q(newBuffer) & 16777215 || q(newBuffer) <= 16777215 || q(newBuffer) > 2147483648 ? !1 : (i = new a(newBuffer), j = new b(newBuffer), k = new c(newBuffer), l = new d(newBuffer), m = new e(newBuffer), n = new f(newBuffer), o = new g(newBuffer), p = new h(newBuffer), buffer = newBuffer, !0);
  }
  function sf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, la = 0, ma = 0, na = 0, oa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0;
   ga = r, r = r + 272 | 0, ea = 4, fa = ug(40) | 0, k[fa >> 2] = 0, k[b + (a << 2) >> 2] = 625144, c = k[b + 4 >> 2] | 0, d = i[c >> 0] | 0;
   a: do if (((d << 24 >> 24) + -2 | 2 | 0) == 43) {
    Q = 1, s = 0, u = 0, v = 0, B = 0, t = 0, E = 0, C = 0, F = 1, W = -1, X = -1, n = -1, q = -1, G = 0;
    b: for (;;) {
     if (D = Q + 1 | 0, h = i[c + 1 >> 0] | 0, z = 0, e = pa(2, 614808, h | 0, 13) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
      S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
      break a;
     }
     c: do if (e) for (c = (i[614824 + (e - 614808) >> 0] | 0) + -48 | 0, f = 0; ;) {
      if ((f | 0) >= (c | 0)) break c;
      if (!(((i[k[b + (f + D << 2) >> 2] >> 0] | 0) + -48 | 0) >>> 0 < 10)) {
       Y = 7;
       break b;
      }
      f = f + 1 | 0;
     } while (0);
     do switch (h | 0) {
     case 102:
      k[28] = 1, e = D, f = W, h = X, D = G;
      break;

     case 97:
      c = D, Y = 59;
      break;

     case 73:
      e = D, t = 1, f = W, h = X, D = G;
      break;

     case 77:
      k[38] = d << 24 >> 24 == 43 ? 3 : 0, e = D, f = W, h = X, D = G;
      break;

     case 98:
      if (e = Q + 2 | 0, z = 0, g = +qa(1, k[b + (D << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      o[18] = g, f = W, h = X, D = G;
      break;

     case 80:
      e = Q + 2 | 0, s = k[b + (D << 2) >> 2] | 0, f = W, h = X, D = G;
      break;

     case 114:
      if (d = Q + 2 | 0, z = 0, g = +qa(1, k[b + (D << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (o[20] = g, e = Q + 3 | 0, z = 0, g = +qa(1, k[b + (d << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (o[21] = g, d = Q + 4 | 0, z = 0, g = +qa(1, k[b + (e << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (o[22] = g, z = 0, g = +qa(1, k[b + (d << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      o[23] = g, e = Q + 5 | 0, f = W, h = X, D = G;
      break;

     case 67:
      if (d = Q + 2 | 0, z = 0, g = +qa(1, k[b + (D << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (p[2] = 1 / g, e = Q + 3 | 0, z = 0, g = +qa(1, k[b + (d << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      p[4] = 1 / g, f = W, h = X, D = G;
      break;

     case 111:
      if (c = k[b + (D << 2) >> 2] | 0, ((i[c >> 0] | 0) + -48 | 0) >>> 0 < 10) if (i[c + 1 >> 0] | 0) e = D, f = W, h = X, D = G; else {
       if (e = Q + 2 | 0, z = 0, c = ta(1, c | 0) | 0, f = z, z = 0, (f | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[f >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(f | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
        S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
        break a;
       }
       k[40] = c, f = W, h = X, D = G;
      } else e = D, f = W, h = X, D = G;
      break;

     case 75:
      e = Q + 2 | 0, u = k[b + (D << 2) >> 2] | 0, f = W, h = X, D = G;
      break;

     case 65:
      if (e = Q + 2 | 0, z = 0, c = ta(1, k[b + (D << 2) >> 2] | 0) | 0, f = z, z = 0, (f | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[f >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(f | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (k[50] = c, h = Q + 3 | 0, z = 0, c = ta(1, k[b + (e << 2) >> 2] | 0) | 0, f = z, z = 0, (f | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[f >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(f | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (k[52] = c, e = Q + 4 | 0, z = 0, c = ta(1, k[b + (h << 2) >> 2] | 0) | 0, f = z, z = 0, (f | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[f >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(f | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (k[54] = c, z = 0, c = ta(1, k[b + (e << 2) >> 2] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (e = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, e || Qa(d | 0, A | 0), O = A) : e = -1, (e | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      k[56] = c, c = Q + 5 | 0, Y = 59;
      break;

     case 99:
      e = D, f = W, h = X, D = G;
      break;

     case 72:
      if (e = Q + 2 | 0, z = 0, c = ta(1, k[b + (D << 2) >> 2] | 0) | 0, f = z, z = 0, (f | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[f >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(f | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      k[32] = c, f = W, h = X, D = G;
      break;

     case 115:
      if (h = k[b + (D << 2) >> 2] | 0, z = 0, c = ta(1, h | 0) | 0, f = z, z = 0, (f | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[f >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(f | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (k[2] = (c | 0) > -1 ? c : 0 - c | 0, e = Q + 2 | 0, z = 0, f = xa(1, h | 0, 614872) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      B = (f | 0) == 0 & 1, f = W, h = X, D = G;
      break;

     case 110:
      if (e = Q + 2 | 0, z = 0, g = +qa(1, k[b + (D << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      o[24] = g, f = W, h = X, D = G;
      break;

     case 103:
      if (d = Q + 2 | 0, z = 0, l = +qa(1, k[b + (D << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      if (p[6] = l, e = Q + 3 | 0, z = 0, g = +qa(1, k[b + (d << 2) >> 2] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(c | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      p[7] = g, l != 0 ? (p[6] = 1 / l, f = W, h = X, D = G) : (f = W, h = X, D = G);
      break;

     case 116:
      if (e = Q + 2 | 0, z = 0, h = ta(1, k[b + (D << 2) >> 2] | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      f = W, D = G;
      break;

     case 109:
      if (e = Q + 2 | 0, z = 0, c = ta(1, k[b + (D << 2) >> 2] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (f = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, f || Qa(d | 0, A | 0), O = A) : f = -1, (f | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      k[46] = c, f = W, h = X, D = G;
      break;

     case 101:
      e = D, E = 1, f = W, h = X, D = G;
      break;

     case 83:
      if (e = Q + 2 | 0, z = 0, q = ta(1, k[b + (D << 2) >> 2] | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      f = W, h = X, D = G;
      break;

     case 105:
      e = D, v = 1, f = W, h = X, D = G;
      break;

     case 118:
      e = D, f = W, h = X, D = 1;
      break;

     case 122:
      e = D, C = 1, f = W, h = X, D = G;
      break;

     case 119:
      k[36] = 1, e = D, f = W, h = X, D = G;
      break;

     case 107:
      if (e = Q + 2 | 0, z = 0, f = ta(1, k[b + (D << 2) >> 2] | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      h = X, D = G;
      break;

     case 104:
      k[26] = 1, e = D, f = W, h = X, D = G;
      break;

     case 113:
      if (e = Q + 2 | 0, z = 0, n = ta(1, k[b + (D << 2) >> 2] | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
       break a;
      }
      f = W, h = X, D = G;
      break;

     case 54:
      Y = 70;
      break;

     case 69:
      k[30] = (k[30] | 0) + 1, Y = 64;
      break;

     case 106:
      Y = 66;
      break;

     case 52:
      k[48] = 1, p[7] = 1, p[6] = 1, Y = 70;
      break;

     case 68:
      Y = 64;
      break;

     case 100:
      Y = 65;
      break;

     case 87:
      k[48] = 1, e = D, f = W, h = X, D = G;
      break;

     case 84:
      k[44] = 1, e = D, f = W, h = X, D = G;
      break;

     default:
      Y = 71;
      break b;
     } while (0);
     if ((Y | 0) == 59 ? (Y = 0, k[34] = 1, e = c, f = W, h = X, D = G) : (Y | 0) == 64 ? (k[30] = (k[30] | 0) + 1, Y = 65) : (Y | 0) == 70 && (Y = 0, k[42] = 16, e = D, f = W, h = X, D = G), (Y | 0) == 65 && (k[30] = (k[30] | 0) + 1, Y = 66), (Y | 0) == 66 && (Y = 0, e = D, F = 0, f = W, h = X, D = G), c = k[b + (e << 2) >> 2] | 0, d = i[c >> 0] | 0, ((d << 24 >> 24) + -2 | 2 | 0) != 43) {
      K = s, X = v, c = B, B = E, d = F, Y = 73;
      break a;
     }
     Q = e, W = f, X = h, G = D;
    }
    if ((Y | 0) == 7) {
     if (c = k[w >> 2] | 0, z = 0, k[ga + 112 >> 2] = h, pa(3, c | 0, 614840, ga + 112 | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
      S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
      break;
     }
     c = 1, Y = 300;
     break;
    }
    if ((Y | 0) == 71) {
     if (c = k[w >> 2] | 0, z = 0, k[ga + 104 >> 2] = h, pa(3, c | 0, 614880, ga + 104 | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
      S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, K = 0, _ = 0, X = 0, Z = 0, f = 0, h = 0, n = 0, q = 0, Y = 80;
      break;
     }
     c = 1, Y = 300;
     break;
    }
   } else e = 1, K = 0, u = 0, X = 0, c = 0, t = 0, B = 0, C = 0, d = 1, f = -1, h = -1, n = -1, q = -1, D = 0, Y = 73; while (0);
   do if ((Y | 0) == 73) {
    if ((e | 0) == (a | 0)) {
     if (c = k[w >> 2] | 0, z = 0, wa(1, 614904, 21, 1, c | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
      S = 0, c = O, T = 0, U = 0, V = 0, W = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, $ = 0, I = 0, J = 0, aa = 0, ba = 0, ca = 0, da = 0, e = 0, _ = u, Z = 0, Y = 80;
      break;
     }
     c = 1, Y = 300;
     break;
    }
    if (s = k[y >> 2] | 0, v = (X | 0) != 0, (e | 0) >= (a | 0)) {
     c = 0, Y = 300;
     break;
    }
    S = s, T = (c | 0) == 0, U = ga + 256 | 0, V = ga + 256 + 4 | 0, W = (X | 0) == 0, L = (d | 0) == 0, M = (q | 0) > 0, N = (f | 0) > -1, P = (n | 0) > -1, Q = (u | 0) == 0, R = k[x >> 2] | 0, H = (t | 0) != 0, I = v, J = k[w >> 2] | 0, G = (B | 0) != 0, E = (C | 0) == 0, F = (h | 0) > -1, C = s, B = K, t = X, s = v & (D | 0) != 0 ^ 1, Y = 78;
    break;
   } while (0);
   d: for (;;) {
    if ((Y | 0) == 78) {
     if (k[32946] = 0, k[32928] = 0, k[41694] = 0, k[41266] = 0, k[33046] = C, fa = Gg(392, 1, fa | 0, ea | 0) | 0, ea = O, z = 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
      c = O, $ = H, aa = G, ba = E, ca = F, da = C, K = B, _ = u, X = t, Z = s, Y = 80;
      continue;
     }
     c = 0, $ = H, aa = G, ba = E, ca = F, da = C, K = B, _ = u, X = t, Z = s, Y = 80;
     continue;
    }
    if ((Y | 0) == 80) {
     Y = 0;
     e: do if (c) {
      if (z = 0, c = ta(2, k[140] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if ((c | 0) > 2 && (z = 0, ta(3, k[140] | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1)) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if (z = 0, c = ta(2, k[33046] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if ((c | 0) > 2) {
       if (z = 0, ta(3, k[33046] | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
        oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
        continue d;
       }
       t = 0, c = 1, Y = 287;
      } else t = 0, c = 1, Y = 287;
     } else {
      if (c = k[b + (e << 2) >> 2] | 0, k[96] = c, z = 0, c = xa(2, c | 0, 323232) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
       Ea = q, Da = n, Ca = h, Ba = f, Aa = Z, za = X, ya = _, oa = K, na = e, ma = da, la = ca, ja = ba, ia = aa, ha = J, d = I, s = $, t = R, u = Q, v = P, B = N, C = M, D = L, E = W, F = V, G = U, H = T, Y = S, c = O, q = Ea, n = Da, h = Ca, f = Ba, Z = Aa, X = za, _ = ya, K = oa, e = na, da = ma, ca = la, ba = ja, aa = ia, J = ha, I = d, $ = s, R = t, Q = u, P = v, N = B, M = C, L = D, W = E, V = F, U = G, T = H, S = Y, Y = 80;
       continue d;
      }
      if (k[140] = c, !c) {
       if (z = 0, ra(1, k[96] | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
        oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
        continue d;
       }
       c = 1;
       break;
      }
      if (z = 0, va(54), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      s = (k[32994] | 0) == 0, ca ? (k[41352] = h, c = h) : c = k[41352] | 0, c = ((c + 3600 | 0) >>> 0) % 360 | 0, (c | 0) == 180 ? k[41352] = 3 : (c | 0) == 270 ? k[41352] = 5 : (c | 0) == 90 && (k[41352] = 6);
      f: do {
       if (ba) {
        k[74464] = 55;
        do if (aa) {
         if (t = k[41342] | 0, !t) {
          if (z = 0, k[ga + 72 >> 2] = k[96], pa(3, J | 0, 614968, ga + 72 | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          c = (t | 0) == 0 & 1;
          break f;
         }
         if (c = k[41678] | 0) {
          k[41268] = c, k[33002] = t, j[65840] = j[66084] | 0, j[65844] = j[66080] | 0, k[80] = 0, k[32932] = 3, d = c, c = (t | 0) == 0 & 1, Y = 119;
          break;
         }
         if (z = 0, pa(4, k[140] | 0, t | 0, 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         d = k[41676] | 0, k[74464] = d, c = (t | 0) == 0 & 1;
        } else d = k[41268] | 0, c = s & 1, Y = 119; while (0);
        if ((Y | 0) == 119) {
         if (Y = 0, (d | 0) == 25 && (Ea = m[65840] | 0, j[65840] = (Ea & 1) + Ea, Ea = m[65844] | 0, j[65844] = (Ea & 1) + Ea), (i[132032] | 0) == 0 | Z) {
          if (s) {
           if (z = 0, k[ga + 216 >> 2] = k[96], pa(3, J | 0, 615344, ga + 216 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           Y = 157;
          }
         } else {
          if (z = 0, k[ga + 64 >> 2] = k[96], xa(3, 614992, ga + 64 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, d = ta(4, 165224) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, k[ga + 56 >> 2] = d, xa(3, 615008, ga + 56 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, k[ga + 40 >> 2] = 132032, k[ga + 40 + 4 >> 2] = 132096, xa(3, 615024, ga + 40 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (i[165416] | 0 && (z = 0, k[ga + 32 >> 2] = 165416, xa(3, 615040, ga + 32 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (k[32960] | 0) {
           if (z = 0, xa(3, 615056, ga + 24 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           if (z = 0, k[ga + 16 >> 2] = (k[32960] | 0) >>> 24, k[ga + 16 + 4 >> 2] = 46, xa(3, 615072, ga + 16 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           if (z = 0, k[ga + 8 >> 2] = (k[32960] | 0) >>> 16 & 255, k[ga + 8 + 4 >> 2] = 46, xa(3, 615072, ga + 8 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           if (z = 0, k[ga >> 2] = (k[32960] | 0) >>> 8 & 255, k[ga + 4 >> 2] = 46, xa(3, 615072, ga | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           if (z = 0, k[ga + 48 >> 2] = k[32960] & 255, k[ga + 48 + 4 >> 2] = 10, xa(3, 615072, ga + 48 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
          }
          if (z = 0, k[ga + 120 >> 2] = ~~+o[41344], xa(3, 615080, ga + 120 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, xa(3, 615096, ga + 136 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (g = +o[41348], g > 0 & g < 1) {
           if (z = 0, xa(3, 615112, ga + 144 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           g = 1 / +o[41348], o[41348] = g;
          }
          if (z = 0, p[ga + 152 >> 3] = g, xa(3, 615120, ga + 152 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, p[ga + 160 >> 3] = +o[41346], xa(3, 615136, ga + 160 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, p[ga + 168 >> 3] = +o[41504], xa(3, 615160, ga + 168 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, k[ga + 176 >> 2] = (k[41540] | 0) != 0 ? 615184 : 615192, xa(3, 615200, ga + 176 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, k[ga + 184 >> 2] = k[32994], xa(3, 615232, ga + 184 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (g = +p[20836], g != 1 && (z = 0, p[ga + 192 >> 3] = g, xa(3, 615264, ga + 192 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (k[41342] | 0 && (d = m[66084] | 0, z = 0, k[ga + 200 >> 2] = m[66080], k[ga + 200 + 4 >> 2] = d, xa(3, 615296, ga + 200 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (d = m[65916] | 0, z = 0, k[ga + 208 >> 2] = m[65896], k[ga + 208 + 4 >> 2] = d, xa(3, 615320, ga + 208 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          Y = 157;
         }
         if ((Y | 0) == 157 && (Y = 0, !(k[32994] | 0))) break;
         if (d = k[80] | 0, d ? (s = k[26] | 0, s = s | X ? (s | 0) != 0 : +o[24] != 0 | +p[2] != 1 ? 1 : +p[4] != 1) : s = 0, j[65848] = s & 1, Ea = s & 1, j[82616] = ((m[65840] | 0) + Ea | 0) >>> Ea, j[65852] = (Ea + (m[65844] | 0) | 0) >>> Ea, I) {
          if (z = 0, k[ga + 224 >> 2] = k[96], k[ga + 224 + 4 >> 2] = 132032, k[ga + 224 + 8 >> 2] = 132096, xa(3, 615368, ga + 224 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          break;
         }
         if (s = k[33050] | 0) {
          if (z = 0, d = ta(5, s | 0) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (k[41266] = d, z = 0, sa(1, d | 0, 615392), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          d = k[80] | 0;
         }
         if ((d | 0) != 0 | (k[32932] | 0) == 1) {
          if (z = 0, d = xa(5, (m[65916] | 0) + 7 | 0, m[65896] << 1 | 0) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (k[32946] = d, z = 0, sa(1, d | 0, 615392), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         } else {
          if (z = 0, d = xa(5, m[82616] | 0, m[65852] << 3 | 0) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (k[32928] = d, z = 0, sa(1, d | 0, 615392), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         }
         if (d = k[2] | 0, d >>> 0 >= (k[32994] | 0) >>> 0 && (z = 0, k[ga + 240 >> 2] = k[96], k[ga + 240 + 4 >> 2] = d, pa(3, J | 0, 615400, ga + 240 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (z = 0, pa(5, k[140] | 0, k[33002] | 0, 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (d = k[32946] | 0, $ & (d | 0) != 0) {
          if (Ea = ka(m[65896] | 0, m[65916] | 0) | 0, z = 0, wa(2, d | 0, 2, Ea | 0, R | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         } else if (z = 0, va(k[41268] | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if ((k[30] | 0) == 3 ? (j[82540] = 0, j[164] = 0, j[168] = 0, d = j[65916] | 0, j[65840] = d, s = j[65896] | 0, j[65844] = s) : (d = j[65840] | 0, s = j[65844] | 0), Ea = m[65848] | 0, t = (Ea + (d & 65535) | 0) >>> Ea, j[82616] = t, d = (Ea + (s & 65535) | 0) >>> Ea, j[65852] = d, k[32946] | 0) {
          if (z = 0, d = xa(5, t & 65535 | 0, d << 3 & 524280 | 0) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (k[32928] = d, z = 0, sa(1, d | 0, 615392), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, va(56), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, ra(2, k[32946] | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         }
         if (k[41692] | 0 && (z = 0, va(57), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (z = 0, ra(3, K | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (!Q && (z = 0, ra(4, _ | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         G = (j[82540] | 0) == 0 | 2, E = m[66131] | 0, s = m[66128] | 0, D = E >>> 0 > s >>> 0 ? s : E, v = m[66129] | 0, D = D >>> 0 > v >>> 0 ? v : D, C = m[66130] | 0, D = D >>> 0 > C >>> 0 ? C : D, j[66128] = s - D, j[66129] = v - D, j[66130] = C - D, j[66131] = E - D, H = (k[32950] | 0) + D | 0, k[32950] = H, d = m[66134] | 0, t = ka(m[66133] | 0, m[66132] | 0) | 0;
         do if (t) {
          u = 0, F = d;
          do Ea = m[132256 + (u + 6 << 1) >> 1] | 0, F = (F | 0) > (Ea | 0) ? Ea : F, u = u + 1 | 0; while ((u | 0) < (t | 0));
          if (!t) {
           B = s - D & 65535, u = v - D & 65535, t = C - D & 65535, s = E - D & 65535, d = F;
           break;
          }
          d = 0;
          do Ea = 132256 + (d + 6 << 1) | 0, j[Ea >> 1] = (m[Ea >> 1] | 0) - F, d = d + 1 | 0; while ((d | 0) < (ka(m[66133] | 0, m[66132] | 0) | 0));
          B = j[66128] | 0, u = j[66129] | 0, t = j[66130] | 0, s = j[66131] | 0, d = F;
         } else B = s - D & 65535, u = v - D & 65535, t = C - D & 65535, s = E - D & 65535; while (0);
         v = N ? f : H + d | 0, k[32950] = v, j[66128] = (B & 65535) + v, j[66129] = (u & 65535) + v, j[66130] = (t & 65535) + v, j[66131] = (s & 65535) + v, v = P ? n : G, M && (k[32952] = q), d = k[30] | 0;
         do if (k[41690] | 0) {
          if (!((d | 0) != 0 | (k[41268] | 0) == 35)) {
           if (z = 0, va(58), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           break;
          }
          if (u = k[32928] | 0, d = j[65840] | 0, s = j[65844] | 0, (ka((d & 65535) << 2, s & 65535) | 0) <= 0) break;
          d = ka((d & 65535) << 2, s & 65535) | 0, t = 0;
          do s = u + (t << 1) | 0, (j[s >> 1] | 0) < 0 && (j[s >> 1] = 0), t = t + 1 | 0; while ((t | 0) != (d | 0));
         } else {
          if ((d | 0) >= 2) break;
          if (z = 0, va(59), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         } while (0);
         if (z = 0, va(60), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         d = k[80] | 0;
         do if (!((d | 0) == 0 | (k[30] | 0) != 0)) {
          if (!v) {
           if (z = 0, va(61), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           break;
          }
          if ((v | 0) == 1 | (k[32932] | 0) >>> 0 > 3) {
           if (z = 0, va(62), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           break;
          }
          if ((v | 0) == 2 & d >>> 0 > 1e3) {
           if (z = 0, va(63), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           break;
          }
          if ((d | 0) == 9) {
           if (z = 0, ra(5, (v << 1) + -3 | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
            oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
            continue d;
           }
           break;
          }
          if (z = 0, va(64), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          break;
         } while (0);
         do if (k[35116] | 0) {
          if (k[32932] = 3, d = k[32928] | 0, s = ka(m[65844] | 0, m[65840] | 0) | 0, !s) {
           d = 3;
           break;
          }
          t = 0;
          do Ea = d + (t << 3) + 2 | 0, j[Ea >> 1] = ((m[d + (t << 3) + 6 >> 1] | 0) + (m[Ea >> 1] | 0) | 0) >>> 1, t = t + 1 | 0; while ((t | 0) < (s | 0));
          d = 3;
         } else d = k[32932] | 0; while (0);
         if (s = k[41690] | 0, (s | 0) == 0 & (d | 0) == 3 && (z = 0, va(65), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(d | 0, A | 0), O = A) : t = -1, (t | 0) == 1)) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (d = k[32] | 0, (s | 0) == 0 & (d | 0) == 2) {
          if (z = 0, va(66), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          s = k[41690] | 0, d = k[32] | 0;
         }
         if ((s | 0) == 0 & (d | 0) > 2 && (z = 0, va(67), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (L) {
          if (z = 0, va(69), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         } else {
          if (z = 0, va(68), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, va(69), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
          if (z = 0, va(70), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
           oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
           continue d;
          }
         }
         d = k[74464] | 0;
        }
        if (v = (d | 0) == 36 ? 588320 : (d | 0) == 55 & (k[44] | 0) != 0 ? 615472 : 615448 + (((k[32932] | 0) * 5 | 0) + -5) | 0, z = 0, d = ta(6, k[96] | 0) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (z = 0, B = ta(5, d + 64 | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (z = 0, sa(1, B | 0, 615392), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (z = 0, xa(6, B | 0, k[96] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (z = 0, d = xa(7, B | 0, 46) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (d && (i[d >> 0] = 0), !T) {
         if (z = 0, u = ta(6, B | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (z = 0, k[ga + 248 >> 2] = (k[32994] | 0) + -1, d = wa(3, 0, 0, 587824, ga + 248 | 0) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         if (Ea = k[2] | 0, z = 0, k[ga + 128 >> 2] = d, k[ga + 128 + 4 >> 2] = Ea, ua(1, B + u | 0, 615480, ga + 128 | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
        }
        if (aa) {
         if (z = 0, t = ta(6, B | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         i[B + t >> 0] = i[615488] | 0, i[B + t + 1 >> 0] = i[615489] | 0, i[B + t + 2 >> 0] = i[615490] | 0, i[B + t + 3 >> 0] = i[615491] | 0, i[B + t + 4 >> 0] = i[615492] | 0, i[B + t + 5 >> 0] = i[615493] | 0, i[B + t + 6 >> 0] = i[615494] | 0;
        }
        if (z = 0, xa(8, B | 0, v | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (z = 0, d = xa(2, B | 0, 615496) | 0, s = z, z = 0, (s | 0) != 0 & (A | 0) != 0 ? (t = Kg(k[s >> 2] | 0, fa | 0, ea | 0) | 0, t || Qa(s | 0, A | 0), O = A) : t = -1, (t | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (k[33046] = d, !d) {
         if (z = 0, ra(1, B | 0), c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
          oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
          continue d;
         }
         t = B, c = 1, Y = 287;
         break e;
        }
        if (z = 0, va(k[74464] | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (z = 0, ta(3, k[140] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        if (d = k[33046] | 0, (d | 0) == (S | 0)) {
         t = B, Y = 287;
         break e;
        }
        if (z = 0, ta(3, d | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        t = B, Y = 287;
        break e;
       }
       if (s = k[41306] | 0, !s) {
        if (z = 0, k[ga + 96 >> 2] = k[96], pa(3, J | 0, 614928, ga + 96 | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        c = (s | 0) == 0 & 1;
        break;
       }
       if (W) {
        if (k[V >> 2] = s, k[U >> 2] = s, z = 0, xa(4, k[96] | 0, ga + 256 | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
         oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
         continue d;
        }
        c = (s | 0) == 0 & 1;
        break;
       }
       if (Ea = k[41350] | 0, c = k[96] | 0, z = 0, k[ga + 80 >> 2] = s, k[ga + 80 + 4 >> 2] = Ea, k[ga + 80 + 8 >> 2] = c, xa(3, 614952, ga + 80 | 0) | 0, c = z, z = 0, (c | 0) != 0 & (A | 0) != 0 ? (d = Kg(k[c >> 2] | 0, fa | 0, ea | 0) | 0, d || Qa(c | 0, A | 0), O = A) : d = -1, (d | 0) == 1) {
        oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
        continue d;
       }
       c = (s | 0) == 0 & 1;
       break;
      } while (0);
      if (z = 0, ta(3, k[140] | 0) | 0, d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
     } while (0);
     do if ((Y | 0) == 287) {
      if (z = 0, ra(2, k[41266] | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if (z = 0, ra(2, t | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if (d = k[41694] | 0, d && (z = 0, ra(2, d | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if (d = k[32928] | 0, d && (z = 0, ra(2, d | 0), d = z, z = 0, (d | 0) != 0 & (A | 0) != 0 ? (s = Kg(k[d >> 2] | 0, fa | 0, ea | 0) | 0, s || Qa(d | 0, A | 0), O = A) : s = -1, (s | 0) == 1)) {
       oa = q, d = n, s = h, ia = f, t = Z, u = X, v = _, B = K, na = e, C = da, D = ca, ma = ba, E = aa, F = J, Ca = I, G = $, H = R, la = Q, ja = P, za = N, Aa = M, Da = L, ya = W, ha = V, Ba = U, Ea = T, Y = S, c = O, q = oa, n = d, h = s, f = ia, Z = t, X = u, _ = v, K = B, e = na, da = C, ca = D, ba = ma, aa = E, J = F, I = Ca, $ = G, R = H, Q = la, P = ja, N = za, M = Aa, L = Da, W = ya, V = ha, U = Ba, T = Ea, S = Y, Y = 80;
       continue d;
      }
      if (!T) {
       if (Ea = (k[2] | 0) + 1 | 0, k[2] = Ea, Ea >>> 0 < (k[32994] | 0) >>> 0) {
        e = e + -1 | 0;
        break;
       }
       k[2] = 0;
       break;
      }
     } while (0);
     if (e = e + 1 | 0, (e | 0) < (a | 0)) {
      H = $, G = aa, E = ba, F = ca, C = da, B = K, u = _, t = X, s = Z, Y = 78;
      continue;
     }
     Y = 300;
     continue;
    }
    if ((Y | 0) == 300) return vg(fa | 0), r = ga, c | 0;
   }
   return 0;
  }
  function jf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, q = 0;
   h = r, r = r + 544 | 0, k[80] = -1, k[41352] = -1, k[41674] = -1, j[65928] = 0, k[41272] = 0, j[82540] = 0, j[65896] = 0, j[65916] = 0, j[164] = 0, j[168] = 0, j[65844] = 0, j[65840] = 0, k[32952] = 0, i[131864] = 0, i[132096] = 0, i[132032] = 0, i[165416] = 0, i[166168] = 0, i[166680] = 0, k[32982] = 0, o[41504] = 0, o[41346] = 0, o[41348] = 0, o[41344] = 0, k[41502] = 0, Jg(165480, 0, 480) | 0, a = 166032, b = a + 128 | 0;
   do k[a >> 2] = 0, a = a + 4 | 0; while ((a | 0) < (b | 0));
   Jg(132256, 0, 8204) | 0, a = 165240, b = a + 128 | 0;
   do j[a >> 1] = 0, a = a + 2 | 0; while ((a | 0) < (b | 0));
   a = 165096, b = a + 128 | 0;
   do k[a >> 2] = 0, a = a + 4 | 0; while ((a | 0) < (b | 0));
   j[66084] = 0, j[66080] = 0, k[33044] = 0, k[41342] = 0, k[41678] = 0, k[41268] = 0, k[41676] = 36, k[32956] = 0, k[32998] = 0, k[33050] = 0, k[33e3] = 0, k[33002] = 0, k[32962] = 0, k[32960] = 0, k[32954] = 0, k[35118] = 0, k[41690] = 0, k[32950] = 0, k[32990] = 0, k[41350] = 0, k[41306] = 0, k[41692] = 0, k[138] = 0, k[41540] = 0, k[35116] = 0, k[32930] = 1, k[32994] = 1, p[20836] = 1, k[32992] = 0, k[32996] = 0, a = 0;
   do n = +((a | 0) == 1 | 0), o[132016 + (a << 2) >> 2] = n, o[131648 + (a << 2) >> 2] = +((a | 0) < 3 | 0), o[165960 + (a << 2) >> 2] = 0, o[165976 + (a << 2) >> 2] = 0, o[165992 + (a << 2) >> 2] = 0, o[131736 + (a << 2) >> 2] = +((a | 0) == 0 | 0), o[131752 + (a << 2) >> 2] = n, o[131768 + (a << 2) >> 2] = +((a | 0) == 2 | 0), a = a + 1 | 0; while ((a | 0) != 4);
   k[32932] = 3, a = 0;
   do j[576 + (a << 1) >> 1] = a, a = a + 1 | 0; while ((a | 0) != 65536);
   b = pc() | 0, j[284] = b, b = rc() | 0, kb(k[140] | 0, 0, 0) | 0, Ga(h + 512 | 0, 1, 32, k[140] | 0) | 0, kb(k[140] | 0, 0, 2) | 0, f = vb(k[140] | 0) | 0, a = kc(h + 512 | 0, 586624) | 0;
   do if (a) g = 7; else if (a = kc(h + 512 | 0, 586616) | 0) g = 7; else {
    if (e = j[284] | 0, e << 16 >> 16 == 19789 | e << 16 >> 16 == 18761) {
     if (!(mg(h + 512 + 6 | 0, 604480, 8) | 0)) {
      k[33002] = b, Te(b, f - b | 0, 0), k[41268] = 3;
      break;
     }
     if (!(Oe(0) | 0)) break;
     Qe();
     break;
    }
    if (!(mg(h + 512 | 0, 604496, 4) | 0 || mg(h + 512 + 6 | 0, 604504, 4) | 0)) {
     kb(k[140] | 0, 4, 0) | 0, e = ((pc() | 0) & 65535) + 4 | 0, k[33002] = e, kb(k[140] | 0, e | 0, 0) | 0, (ib(k[140] | 0) | 0) != 255 && Oe(12) | 0, k[41342] = 0;
     break;
    }
    if (!(mg(h + 512 + 25 | 0, 604512, 7) | 0)) {
     i[132032] = i[604520] | 0, i[132033] = i[604521] | 0, i[132034] = i[604522] | 0, i[132035] = i[604523] | 0, i[132036] = i[604524] | 0, i[132037] = i[604525] | 0, i[132038] = i[604526] | 0, a = 132096, d = 604528, b = a + 10 | 0;
     do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
     kb(k[140] | 0, 33, 0) | 0, He(1), kb(k[140] | 0, 60, 0) | 0, n = +((rc() | 0) >>> 0), o[33004] = n, n = +((rc() | 0) >>> 0), o[33005] = n, n = +((rc() | 0) >>> 0), o[33007] = n, n = +((rc() | 0) >>> 0), o[33006] = n;
     break;
    }
    if (!(og(h + 512 | 0, 604544) | 0)) {
     a = 132032, d = 604552, b = a + 9 | 0;
     do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
     a = 132096, d = 604568, b = a + 16 | 0;
     do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
     break;
    }
    if (!(og(h + 512 | 0, 604584) | 0)) {
     i[132032] = i[604592] | 0, i[132033] = i[604593] | 0, i[132034] = i[604594] | 0, i[132035] = i[604595] | 0, i[132036] = i[604596] | 0, i[132037] = i[604597] | 0, a = 132096, d = 604600, b = a + 14 | 0;
     do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
     k[41268] = 38;
     break;
    }
    if (!(og(h + 512 | 0, 604616) | 0)) {
     i[132032] = i[604592] | 0, i[132033] = i[604593] | 0, i[132034] = i[604594] | 0, i[132035] = i[604595] | 0, i[132036] = i[604596] | 0, i[132037] = i[604597] | 0, a = 132096, d = 604624, b = a + 14 | 0;
     do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
     k[41268] = 39;
     break;
    }
    if (!(mg(h + 512 | 0, 586696, 8) | 0)) {
     kb(k[140] | 0, 84, 0) | 0, e = rc() | 0, k[41342] = e, e = rc() | 0, k[33044] = e, kb(k[140] | 0, 92, 0) | 0, Xe(rc() | 0), (k[41342] | 0) > 120 && (kb(k[140] | 0, 120, 0) | 0, a = rc() | 0, e = ((a | 0) != 0 & 1) + (k[32994] | 0) | 0, k[32994] = e, (k[2] | 0) != 0 & (e | 0) == 2 && Xe(a)), k[41268] = 18, kb(k[140] | 0, ((k[2] | 0) != 0 ? 128 : 100) | 0, 0) | 0, e = rc() | 0, k[33002] = e, Oe(e) | 0, Oe((k[41342] | 0) + 12 | 0) | 0, Qe();
     break;
    }
    if (!(mg(h + 512 | 0, 588680, 4) | 0)) {
     kb(k[140] | 0, 0, 0) | 0, Ze();
     break;
    }
    if (!(mg(h + 512 + 4 | 0, 604640, 9) | 0)) {
     kb(k[140] | 0, 0, 0) | 0, _e(f), k[32994] = 0;
     break;
    }
    if (!(mg(h + 512 | 0, 604656, 6) | 0)) {
     kb(k[140] | 0, 6, 0) | 0, Ga(132032, 1, 8, k[140] | 0) | 0, Ga(132096, 1, 8, k[140] | 0) | 0, Ga(131864, 1, 16, k[140] | 0) | 0, e = (pc() | 0) & 65535, k[33002] = e, pc() | 0, e = pc() | 0, j[65896] = e, e = pc() | 0, j[65916] = e, k[41268] = 10, k[80] = 1633771873;
     break;
    }
    if (!(mg(h + 512 | 0, 604664, 8) | 0)) {
     i[132032] = i[604680] | 0, i[132033] = i[604681] | 0, i[132034] = i[604682] | 0, i[132035] = i[604683] | 0, i[132036] = i[604684] | 0, i[132037] = i[604685] | 0, j[284] = 18761, kb(k[140] | 0, 300, 0) | 0, a = rc() | 0, k[33002] = a, a = rc() | 0, d = pc() | 0, j[65844] = d, d = pc() | 0, j[65840] = d, b = m[65844] | 0, c = (a << 3 | 0) / (ka(b, d & 65535) | 0) | 0, k[32998] = c, (c | 0) == 8 ? k[41268] = 7 : (c | 0) == 10 && (k[41268] = 10), e = (a >>> 0) / ((ka(b, c) | 0) >>> 3 >>> 0) | 0, j[168] = e - (d & 65535), j[65916] = e, k[41277] = 1, k[80] = 1633771873;
     break;
    }
    if (!(mg(h + 512 | 0, 604688, 4) | 0)) {
     j[284] = 18761, kb(k[140] | 0, 20, 0) | 0, e = (rc() | 0) & 65535, j[65844] = e, e = (rc() | 0) & 65535, j[65840] = e, i[132032] = i[604688] | 0, i[132033] = i[604689] | 0, i[132034] = i[604690] | 0, i[132035] = i[604691] | 0, i[132036] = i[604692] | 0, kb(k[140] | 0, 668, 0) | 0, Ga(132096, 1, 64, k[140] | 0) | 0, k[33002] = 4096, k[41268] = 9, k[32962] = 88, k[80] = 1633771873;
     break;
    }
    if (!(mg(h + 512 | 0, 604696, 4) | 0)) {
     j[284] = 18761, kb(k[140] | 0, 2048, 0) | 0, Ga(132032, 1, 41, k[140] | 0) | 0, e = pc() | 0, j[65916] = e, e = pc() | 0, j[65896] = e, kb(k[140] | 0, 56, 1) | 0, Ga(132096, 1, 30, k[140] | 0) | 0, k[33002] = 65536, k[41268] = 40, me(0, 12.25, 1, 1023);
     break;
    }
    if (!(mg(h + 512 + 4 | 0, 604704, 4) | 0)) {
     k[33008] = 6579538, k[33024] = 6647375, bf(), k[41268] = 41, me(.4166666666666667, 12.92, 1, 4095), k[80] = 1229539657;
     break;
    }
    if (!(mg(h + 512 | 0, 604712, 9) | 0)) {
     Ue();
     break;
    }
    if (!(mg(h + 512 | 0, 604728, 4) | 0)) {
     Ve();
     break;
    }
    if (!(mg(h + 512 | 0, 604736, 4) | 0)) {
     Pe(0);
     break;
    }
    if (!(mg(h + 512 | 0, 604744, 4) | 0)) {
     df();
     break;
    }
    if (mg(h + 512 | 0, 604752, 2) | 0) break;
    af();
   } while (0);
   (g | 0) == 7 && (We(a - (h + 512) | 0), (a | 0) != (h + 512 | 0) && Oe(0) | 0 && Qe());
   do if (i[132032] | 0) e = 0; else {
    d = 0;
    do {
     if ((f | 0) == (k[604760 + (d * 48 | 0) >> 2] | 0)) {
      switch (Og(132032, 604760 + (d * 48 | 0) + 16 | 0) | 0, Og(132096, 604760 + (d * 48 | 0) + 26 | 0) | 0, e = i[604760 + (d * 48 | 0) + 15 >> 0] | 0, k[41352] = (e & 255) >>> 2, k[41692] = e & 2, e & 1 && Re(), c = m[604760 + (d * 48 | 0) + 46 >> 1] | 0, k[33002] = c, a = j[604760 + (d * 48 | 0) + 4 >> 1] | 0, j[65896] = a, e = j[604760 + (d * 48 | 0) + 6 >> 1] | 0, j[65916] = e, q = i[604760 + (d * 48 | 0) + 8 >> 0] | 0, j[164] = q & 255, b = i[604760 + (d * 48 | 0) + 9 >> 0] | 0, j[168] = b & 255, j[65844] = (a & 65535) - (q & 255) - (l[604760 + (d * 48 | 0) + 10 >> 0] | 0), j[65840] = (e & 65535) - (b & 255) - (l[604760 + (d * 48 | 0) + 11 >> 0] | 0), b = ka(l[604760 + (d * 48 | 0) + 13 >> 0] | 0, 16843009) | 0, k[80] = b, k[32932] = 4 - ((b & 21845 & b >>> 1 | 0) == 0 & 1), b = l[604760 + (d * 48 | 0) + 12 >> 0] | 0, k[32962] = b, a = (f - c << 3 | 0) / (ka(e & 65535, a & 65535) | 0) | 0, k[32998] = a, a | 0) {
      case 6:
       k[41268] = 42, a = 6;
       break;

      case 16:
       j[284] = 0 - (b & 1) & 1028 | 18761, k[32962] = b >>> 1 & 7, k[32998] = 16 - (b >>> 4) - (b >>> 1 & 7), k[41268] = 18, a = 16 - (b >>> 4) - (b >>> 1 & 7) | 0;
       break;

      case 8:
       k[41268] = 7, a = 8;
       break;

      case 12:
      case 10:
       k[32962] = b | 128, k[41268] = 9;
      }
      k[32952] = (1 << a) - (1 << l[604760 + (d * 48 | 0) + 14 >> 0]);
     }
     d = d + 1 | 0;
    } while ((d | 0) != 100);
    if (i[132032] | 0) e = f; else if ($e(f), i[132032] | 0) e = f; else {
     if (Ye(0), qg(132096, 609560, 2) | 0 ? qg(132096, 609568, 5) | 0 || (g = 75) : g = 75, (g | 0) == 75 && !(kb(k[140] | 0, -6404096, 2) | 0) && Ga(h + 512 | 0, 1, 32, k[140] | 0) | 0 && !(og(h + 512 | 0, 609576) | 0)) {
      a = 132032, d = 300328, b = a + 11 | 0;
      do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
      e = (vb(k[140] | 0) | 0) + 32736 | 0, k[33002] = e, j[65844] = j[65896] | 0, j[65896] = 2611, k[41268] = 10, k[80] = 370546198, e = f;
      break;
     }
     k[32994] = 0, e = f;
    }
   } while (0);
   d = 0;
   do a = k[609584 + (d << 2) >> 2] | 0, lc(132032, a) | 0 && Og(132032, a | 0) | 0, d = d + 1 | 0; while ((d | 0) != 21);
   og(132032, 588272) | 0 ? og(132032, 609672) | 0 || (g = 86) : g = 86;
   do if ((g | 0) == 86) {
    if (a = lc(132096, 609680) | 0, !a && (a = Ff(132096, 609696) | 0, !a)) break;
    i[a >> 0] = 0;
   } while (0);
   if (pg(132096, 586816, 6) | 0 || (i[132032] = i[609712] | 0, i[132033] = i[609713] | 0, i[132034] = i[609714] | 0, i[132035] = i[609715] | 0, i[132036] = i[609716] | 0, i[132037] = i[609717] | 0, i[132038] = i[609718] | 0), a = 132032 + ((Cg(132032) | 0) + -1) | 0, (i[a >> 0] | 0) == 32) do i[a >> 0] = 0, a = a + -1 | 0; while ((i[a >> 0] | 0) == 32);
   if (a = 132096 + ((Cg(132096) | 0) + -1) | 0, (i[a >> 0] | 0) == 32) do i[a >> 0] = 0, a = a + -1 | 0; while ((i[a >> 0] | 0) == 32);
   a = Cg(132032) | 0, pg(132096, 132032, a) | 0 || (i[132096 + a >> 0] | 0) == 32 && Lg(132096, 132096 + (a + 1) | 0, 63 - a | 0) | 0, qg(132096, 609720, 8) | 0 || Og(132096, 132104) | 0, qg(132096, 609736, 15) | 0 || Og(132096, 132111) | 0, i[131927] = 0, i[132159] = 0, i[132095] = 0, i[165479] = 0, i[166679] = 0, c = k[32994] | 0;
   do if (c) {
    a = j[65840] | 0, a << 16 >> 16 || (a = j[65916] | 0, j[65840] = a), d = j[65844] | 0, d << 16 >> 16 || (d = j[65896] | 0, j[65844] = d);
    do {
     if (!(a << 16 >> 16 == 2624 & d << 16 >> 16 == 3936)) {
      if (a << 16 >> 16 == 3136 & d << 16 >> 16 == 4864) {
       j[65840] = 3124, j[65844] = 4688, k[80] = 370546198;
       break;
      }
      if (d << 16 >> 16 == 4352) {
       if (og(132096, 609752) | 0 && og(132096, 609760) | 0) break;
       j[65844] = 4309, k[80] = 370546198;
       break;
      }
      if ((d & 65535) <= 4959) {
       if (d << 16 >> 16 == 4736) {
        if (og(132096, 609776) | 0) break;
        j[65840] = 3122, j[65844] = 4684, k[80] = 370546198, j[168] = 2;
        break;
       }
       if (!(a << 16 >> 16 == 3014 & d << 16 >> 16 == 4096)) break;
       j[65844] = 4014;
       break;
      }
      if (!(qg(132096, 609768, 3) | 0)) {
       j[164] = 10, j[65844] = 4950, k[80] = 370546198;
       break;
      }
      if (d << 16 >> 16 == 6080) {
       if (og(132096, 609784) | 0) break;
       j[164] = 4, j[65844] = 6040;
       break;
      }
      if (d << 16 >> 16 == 7424) {
       if (og(132096, 609792) | 0) break;
       j[65840] = 5502, j[65844] = 7328, k[80] = 1633771873, j[168] = 29, j[164] = 48;
       break;
      }
      break;
     }
     j[65840] = 2616, j[65844] = 3896;
    } while (0);
    do {
     if (k[32960] | 0) {
      if (b = k[80] | 0, (b | 0) == -1 ? (k[80] = 0, a = k[32990] | 0, g = 133) : (a = k[32990] | 0, b ? (e = ka(c, a) | 0, k[32994] = e) : g = 133), (g | 0) == 133 && (k[32932] = a), a = k[32956] | 0, (a | 0) == 7) {
       k[41268] = 44;
       break;
      }
      if ((a | 0) == 34892) {
       k[41268] = 45;
       break;
      }
      if ((a | 0) == 1 | (a | 0) == 0) {
       k[41268] = 43;
       break;
      }
      k[41268] = 0;
      break;
     }
     if (q = (og(132032, 586784) | 0 | e | 0) == 0, q & (k[32998] | 0) != 15) {
      k[41268] | 0 || (k[41268] = 4), a = j[65896] | 0, d = j[65916] | 0, c = 0;
      do {
       do if (a << 16 >> 16 == (j[609800 + (c * 22 | 0) >> 1] | 0)) {
        if (d << 16 >> 16 != (j[609800 + (c * 22 | 0) + 2 >> 1] | 0)) break;
        if (q = j[609800 + (c * 22 | 0) + 4 >> 1] | 0, j[164] = q, b = j[609800 + (c * 22 | 0) + 6 >> 1] | 0, j[168] = b, j[65844] = (a & 65535) - (q & 65535) - (m[609800 + (c * 22 | 0) + 8 >> 1] | 0), j[65840] = (d & 65535) - (b & 65535) - (m[609800 + (c * 22 | 0) + 10 >> 1] | 0), k[41275] = m[609800 + (c * 22 | 0) + 12 >> 1], k[41277] = 0 - (m[609800 + (c * 22 | 0) + 14 >> 1] | 0), k[41279] = m[609800 + (c * 22 | 0) + 16 >> 1], k[41281] = 0 - (m[609800 + (c * 22 | 0) + 18 >> 1] | 0), b = j[609800 + (c * 22 | 0) + 20 >> 1] | 0, !(b << 16 >> 16)) break;
        q = ka(b & 65535, 16843009) | 0, k[80] = q;
       } while (0);
       c = c + 1 | 0;
      } while ((c | 0) != 42);
      (k[32982] | 131072 | 0) == 41025536 ? (j[164] = 8, j[168] = 16, d = 0) : d = 0;
     } else d = 0;
     do {
      do if ((k[32982] | 0) == (m[610728 + (d * 22 | 0) >> 1] | -2147483648 | 0)) {
       if (a = 610728 + (d * 22 | 0) + 2 | 0, ef(586784, a), (i[132100] | 0) != 75) break;
       if ((Cg(132096) | 0) != 8) break;
       Og(132096, a | 0) | 0;
      } while (0);
      d = d + 1 | 0;
     } while ((d | 0) != 38);
     a = 0;
     do (k[32982] | 0) == (m[611568 + (a * 22 | 0) >> 1] | 0) && Og(132096, 611568 + (a * 22 | 0) + 2 | 0) | 0, a = a + 1 | 0; while ((a | 0) != 51);
     do if (!(og(132032, 586648) | 0)) {
      if (k[41268] | 0 || (k[41268] = 9), (i[132096] | 0) != 69) break;
      k[32962] = k[32962] | ((k[33002] | 0) == 0 & 1) << 2 | 2;
     } while (0);
     do if (!(og(132096, 612696) | 0)) {
      if (!(+hf(16, 16, 3840, 5120) < 25)) break;
      j[65840] = 480, k[80] = 0, j[168] = 0, i[132096] = i[612712] | 0, i[132097] = i[612713] | 0, i[132098] = i[612714] | 0, i[132099] = i[612715] | 0, i[132100] = i[612716] | 0;
     } while (0);
     a: do if (k[41690] | 0) a = j[65840] | 0, b = j[65844] | 0, (a & 65535) << 1 >>> 0 < (b & 65535) >>> 0 && (p[20836] = .5), (a & 65535) > (b & 65535) && (p[20836] = 2), k[80] = 0, ff(0), g = 510; else {
      if (q = (og(132032, 586784) | 0) == 0, d = k[32998] | 0, q & (d | 0) == 15) {
       a = j[65844] | 0, (a & 65535 | 0) == 3344 ? (j[65844] = 3278, a = 3278, g = 175) : (a & 65535 | 0) == 3872 && (g = 175), (g | 0) == 175 && (a = (a & 65535) + 65530 & 65535, j[65844] = a), b = j[65840] | 0, (b & 65535) > (a & 65535) ? (j[65844] = b, j[65840] = a, c = j[65896] | 0, j[65896] = j[65916] | 0, j[65916] = c, c = b) : (c = a, a = b), c << 16 >> 16 == 7200 & a << 16 >> 16 == 3888 && (j[65844] = 6480, j[65896] = 6480, j[65840] = 4320, j[65916] = 4320), k[80] = 0, k[32932] = 3, k[32990] = 3, k[41268] = 46, g = 510;
       break;
      }
      if (!(og(132096, 612720) | 0)) {
       j[65840] = 613, j[65844] = 854, j[65896] = 896, k[32932] = 4, k[80] = -505093660, k[41268] = 5, g = 510;
       break;
      }
      do {
       if (og(132096, 612736) | 0) {
        if (!(og(132096, 612752) | 0)) {
         g = 185;
         break;
        }
        if (!(og(132096, 612776) | 0)) {
         j[65840] = 968, j[65844] = 1290, j[65896] = 1320, k[80] = 458115870;
         break;
        }
        if (!(og(132096, 612792) | 0)) {
         j[65840] = 1024, j[65844] = 1552, k[80] = 508251675;
         break;
        }
        do if (og(132096, 612808) | 0) {
         if (!(og(132096, 612832) | 0)) break;
         if (!(og(132096, 612848) | 0)) {
          if (!(Cc() | 0)) {
           g = 510;
           break a;
          }
          i[132106] = i[612864] | 0, i[132107] = i[612865] | 0, i[132108] = i[612866] | 0, i[132109] = i[612867] | 0, i[132110] = i[612868] | 0, i[132111] = i[612869] | 0, g = 510;
          break a;
         }
         if (!(og(132096, 612872) | 0)) {
          k[41281] = -4, g = 510;
          break a;
         }
         if (!(og(132096, 612896) | 0)) {
          k[80] = 1633771873, k[32950] = m[488], g = 510;
          break a;
         }
         if (!(og(132096, 612912) | 0)) {
          o[33004] = +o[33004] * .4857685009487666, o[33006] = +o[33006] * .807570977917981, g = 510;
          break a;
         }
         if (!(og(132096, 612920) | 0)) {
          j[65844] = (m[65844] | 0) + 65532, p[20836] = .5, g = 510;
          break a;
         }
         do if (og(132096, 612928) | 0) {
          if (!(og(132096, 612936) | 0)) break;
          if (!(og(132096, 612944) | 0)) break;
          if (!(og(132096, 612952) | 0)) break;
          do if (og(132096, 612960) | 0) {
           if (!(og(132096, 612968) | 0)) break;
           if (!(og(132096, 612976) | 0)) break;
           if (!(og(132096, 612984) | 0)) {
            j[65844] = (m[65844] | 0) + 65508, j[164] = 6, g = 510;
            break a;
           }
           do if (og(132096, 612992) | 0) {
            if (!(og(132096, 613e3) | 0)) break;
            do if (og(132096, 613008) | 0) {
             if (!(og(132096, 613016) | 0)) break;
             if (!(og(132096, 613024) | 0)) break;
             do if (og(132096, 613040) | 0) {
              if (!(qg(132096, 613048, 2) | 0)) break;
              if (!(qg(132096, 613056, 4) | 0)) break;
              do if (og(132096, 613064) | 0) {
               if (!(og(132096, 613072) | 0)) break;
               do if (qg(132096, 613080, 3) | 0) {
                if (!(qg(132096, 613088, 3) | 0)) break;
                if (!(qg(132096, 613096, 3) | 0)) break;
                if (!(og(132096, 613104) | 0)) {
                 if (!(k[32962] | 0)) {
                  g = 510;
                  break a;
                 }
                 g = m[65844] | 0, j[65844] = g + 3, j[65896] = g + 6, g = 510;
                 break a;
                }
                if (!(og(132096, 613112) | 0)) {
                 j[164] = 1, j[65844] = (m[65844] | 0) + 65532, k[80] = -1802201964, g = 510;
                 break a;
                }
                if (!(qg(132096, 613120, 3) | 0)) {
                 j[164] = 6, j[65844] = (m[65844] | 0) + 65522, g = 510;
                 break a;
                }
                if (!(qg(132096, 613128, 3) | 0)) {
                 if (a = j[65844] | 0, a << 16 >> 16 == 3264) {
                  j[65844] = (a & 65535) + 65504, g = 510;
                  break a;
                 }
                 j[65844] = (a & 65535) + 65528, g = 510;
                 break a;
                }
                if (!(qg(132096, 613136, 4) | 0)) {
                 j[65844] = (m[65844] | 0) + 65504, g = 510;
                 break a;
                }
                if (q = (qg(132096, 613144, 9) | 0) != 0, c = j[65896] | 0, !(q | c << 16 >> 16 == 4032)) {
                 if (k[32962] = 24, k[80] = -1802201964, !((i[132105] | 0) == 55 & +o[41344] >= 400)) {
                  g = 510;
                  break a;
                 }
                 k[32950] = 255, g = 510;
                 break a;
                }
                if (!(qg(132096, 613160, 2) | 0)) {
                 j[65840] = (m[65840] | 0) + 65534, g = 510;
                 break a;
                }
                if ((e | 0) == 2940928) {
                 do if (!(k[41306] | 0)) {
                  if (Xc() | 0) break;
                  i[132096] = i[613176] | 0, i[132097] = i[613177] | 0, i[132098] = i[613178] | 0, i[132099] = i[613179] | 0, i[132100] = i[613180] | 0, i[132101] = i[613181] | 0;
                 } while (0);
                 if (og(132096, 613176) | 0) {
                  g = 510;
                  break a;
                 }
                 j[65840] = (m[65840] | 0) + 65534, k[32962] = 6, k[32932] = 4, k[80] = 1263225675, g = 510;
                 break a;
                }
                if ((e | 0) == 4771840) {
                 do if (!(k[41306] | 0)) {
                  if (!(Wc() | 0)) break;
                  i[132096] = i[613168] | 0, i[132097] = i[613169] | 0, i[132098] = i[613170] | 0, i[132099] = i[613171] | 0, i[132100] = i[613172] | 0;
                 } while (0);
                 if (!(og(132096, 613168) | 0)) {
                  g = 510;
                  break a;
                 }
                 k[80] = -1263225676, ff(3), o[32912] = 1.1959999799728394, o[32913] = 1.246000051498413, o[32914] = 1.0180000066757202, g = 510;
                 break a;
                }
                if ((e | 0) == 3178560) {
                 o[33004] = +o[33004] * 4, o[33006] = +o[33006] * 4, g = 510;
                 break a;
                }
                if ((e | 0) == 6291456) {
                 if (kb(k[140] | 0, 3145728, 0) | 0, g = gf() | 0, j[284] = g, g << 16 >> 16 != 19789) {
                  g = 510;
                  break a;
                 }
                 j[168] = 16, a = (m[65840] | 0) + 65520 & 65535, j[65840] = a, j[164] = 28, j[65844] = (m[65844] | 0) + 65508, k[32952] = 62912, k[33008] = 4674377, i[132096] = 0, g = 512;
                 break a;
                }
                if ((e | 0) == 4775936) {
                 k[41306] | 0 || Yc();
                 do if ((i[132096] | 0) == 69) {
                  if ((jg(132097) | 0) >= 3700) break;
                  k[80] = 1229539657;
                 } while (0);
                 if (og(132096, 613184) | 0 || (k[41352] = 1, k[80] = 370546198), (i[132032] | 0) != 79) {
                  g = 510;
                  break a;
                 }
                 if (b = ~~+hf(12, 32, 1188864, 3576832), a = ~~+hf(12, 32, 2383920, 2387016), (((b | 0) > -1 ? b : 0 - b | 0) | 0) < (((a | 0) > -1 ? a : 0 - a | 0) | 0) ? k[32962] = 24 : a = b, (a | 0) >= 0) {
                  g = 510;
                  break a;
                 }
                 k[80] = 1633771873, g = 510;
                 break a;
                }
                if ((e | 0) == 1581060) {
                 ff(3), o[32912] = 1.2085000276565552, o[32913] = 1.0943000316619873, o[32915] = 1.1102999448776245, g = 510;
                 break a;
                }
                if ((e | 0) == 5869568) {
                 do if (!(k[41306] | 0)) {
                  if (!(Zc() | 0)) break;
                  k[33008] = 1869506893, k[33009] = 6386796, a = 132096, d = 613200, b = a + 10 | 0;
                  do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
                 } while (0);
                 k[32962] = (i[132032] | 0) == 77 ? 30 : 6, g = 510;
                 break a;
                }
                if (!(og(132032, 613216) | 0)) {
                 do if (og(132103, 613232) | 0) {
                  if ((k[41268] | 0) == 9) break;
                  k[32952] = (k[32994] | 0) == 2 & (k[2] | 0) != 0 ? 12032 : 15872;
                 } else i[132096] = i[613232] | 0, i[132097] = i[613233] | 0, i[132098] = i[613234] | 0, i[132099] = i[613235] | 0, i[132100] = i[613236] | 0, i[132101] = i[613237] | 0, j[65840] = 2144, j[65844] = 2880, k[41352] = 6; while (0);
                 if (d = (m[65916] | 0) - (m[65840] | 0) >> 2 << 1, j[168] = d, b = j[65844] | 0, j[164] = (c & 65535) - (b & 65535) >> 2 << 1, b << 16 >> 16 == 3664 | b << 16 >> 16 == 2848 ? (k[80] = 370546198, b << 16 >> 16 == 4952 | b << 16 >> 16 == 4032 ? g = 290 : a = (c & 65535) - (b & 65535) >> 2 << 1) : b << 16 >> 16 == 4952 | b << 16 >> 16 == 4032 ? g = 290 : a = (c & 65535) - (b & 65535) >> 2 << 1, (g | 0) == 290 && (j[164] = 0, a = 0), b << 16 >> 16 == 3328 ? (j[65844] = 3262, j[164] = 34, a = 34, b = 3262) : b << 16 >> 16 == 4936 && (j[164] = 4, a = 4, b = 4936), og(132096, 613240) | 0 ? og(132096, 613248) | 0 || (g = 296) : g = 296, (g | 0) == 296 && (j[65844] = (b & 65535) + 2, j[164] = 0, k[80] = 370546198, a = 0), k[41272] | 0 && (g = (ka(c & 65535, k[32994] | 0) | 0) & 65535, j[65896] = g), (k[80] | 0) != 9) {
                  g = 510;
                  break a;
                 }
                 for (a &= 65535, b = 0; ;) if (i[344 + b >> 0] = i[((a + b | 0) % 6 | 0) + (166720 + ((((d & 65534) + ((b | 0) / 6 | 0) | 0) % 6 | 0) * 6 | 0)) >> 0] | 0, b = b + 1 | 0, (b | 0) == 36) {
                  g = 510;
                  break a;
                 }
                }
                if (og(132096, 613256) | 0) {
                 b: do {
                  if (og(132096, 613264) | 0) {
                   if (!(ng(132032, 613272) | 0)) {
                    if (k[41268] | 0 || (k[32952] = 4095, k[41268] = 18), !(qg(132096, 613280, 8) | 0)) {
                     og(132096, 588256) | 0 || (k[80] = 1229539657), k[32998] = 12, k[41268] = 9, g = 510;
                     break a;
                    }
                    do if (qg(132096, 613296, 5) | 0) {
                     if (!(qg(132096, 613304, 5) | 0)) break;
                     if (!(qg(132096, 613312, 6) | 0)) break;
                     if (qg(132096, 613336, 8) | 0) {
                      g = 510;
                      break a;
                     }
                     if (a = i[132104] | 0, a << 24 >> 24 == 52) {
                      j[65840] = 1716, j[65844] = 2304;
                      break b;
                     }
                     if (a << 24 >> 24 == 54) {
                      j[65840] = 2136, j[65844] = 2848;
                      break b;
                     }
                     if (a << 24 >> 24 == 53) {
                      g = 319;
                      break b;
                     }
                     break b;
                    } while (0);
                    k[h + 16 >> 2] = 132096 + ((i[132096] | 0) == 77 | 6), eg(132116, 613320, h + 16 | 0), ef(132032, 132116), k[41268] = 9, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613352) | 0)) {
                    k[41268] = 18, k[138] = -1, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613360) | 0)) {
                    j[65840] = (m[65840] | 0) + 65534, g = 510;
                    break a;
                   }
                   if (a = (og(132032, 613368) | 0) == 0, c << 16 >> 16 == 4704 & a) {
                    j[168] = 8, j[65840] = (m[65840] | 0) + 65528, j[164] = 8, j[65844] = (m[65844] | 0) + 65520, k[32962] = 32, g = 510;
                    break a;
                   }
                   if (b = j[65916] | 0, a & b << 16 >> 16 == 3714) {
                    j[168] = 18, j[65840] = (m[65840] | 0) + 65518, j[65844] = 5536, j[164] = (c & 65535) + 6e4, c << 16 >> 16 != 5600 && (j[168] = 0, j[164] = 0), k[80] = 1633771873, k[32932] = 3, g = 510;
                    break a;
                   }
                   if (c << 16 >> 16 == 5632 & a) {
                    if (j[284] = 18761, j[65840] = 3694, j[168] = 2, j[164] = d + 32, j[65844] = 5542 - d, (d | 0) != 12) {
                     g = 510;
                     break a;
                    }
                    k[32962] = 80, g = 510;
                    break a;
                   }
                   if (c << 16 >> 16 == 5664 & a) {
                    j[168] = 17, j[65840] = (m[65840] | 0) + 65519, j[164] = 96, j[65844] = 5544, k[80] = 1229539657, g = 510;
                    break a;
                   }
                   if (c << 16 >> 16 == 6496 & a) {
                    k[80] = 1633771873, k[32950] = 1 << d + -7, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613376) | 0)) {
                    if (j[284] = 18761, a = m[65840] | 0, j[65840] = a + 65516, j[168] = 2, b = m[65844] | 0, j[65844] = b + 65530, (b + 65530 & 65535) >>> 0 <= 3682) {
                     g = 510;
                     break a;
                    }
                    j[65840] = a + 65506, j[65844] = b + 65484, j[168] = 8, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613384) | 0)) {
                    if (j[284] = 18761, a = m[65840] | 0, j[65840] = a + 65533, j[168] = 2, b = m[65844] | 0, j[65844] = b + 65526, (b + 65526 & 65535) >>> 0 <= 3718) {
                     g = 510;
                     break a;
                    }
                    j[65840] = a + 65505, j[65844] = b + 65470, j[168] = 8, g = 510;
                    break a;
                   }
                   if (Ff(132096, 613392) | 0) {
                    i[132096] = i[613392] | 0, i[132097] = i[613393] | 0, i[132098] = i[613394] | 0, i[132099] = i[613395] | 0, i[132100] = i[613396] | 0, i[132101] = i[613397] | 0, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613400) | 0)) {
                    j[65840] = 3045, j[65844] = 4070, j[168] = 3, j[284] = 18761, k[80] = 1229539657, k[41268] = 18, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613408) | 0)) {
                    k[32950] = 16, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613424) | 0)) {
                    j[168] = 2, j[65840] = (b & 65535) + 65534, g = 510;
                    break a;
                   }
                   if (!(og(132096, 613432) | 0)) {
                    me(.45, 4.5, 1, 255), g = 510;
                    break a;
                   }
                   if (!(og(132032, 587664) | 0)) {
                    switch ((k[41268] | 0) == 4 && (k[41268] = 47), c << 16 >> 16) {
                    case 7262:
                     j[65840] = 5444, j[65844] = 7248, j[168] = 4, j[164] = 7, k[80] = 1633771873;
                     break;

                    case 8282:
                    case 7410:
                     j[65840] = (m[65840] | 0) + 65452, j[65844] = (m[65844] | 0) + 65454, j[168] = 4, j[164] = 41, k[80] = 1633771873;
                     break;

                    case 9044:
                     j[65840] = 6716, j[65844] = 8964, j[168] = 8, j[164] = 40, k[32962] = 256, k[32950] = (k[32950] | 0) + 256, k[32952] = 33025;
                     break;

                    case 4090:
                     i[132096] = i[613440] | 0, i[132097] = i[613441] | 0, i[132098] = i[613442] | 0, i[132099] = i[613443] | 0, i[132100] = i[613444] | 0, j[168] = 6, j[65840] = (m[65840] | 0) + 65530, j[164] = 3, j[65844] = (m[65844] | 0) + 65526, k[80] = 1633771873;
                    }
                    if (a = k[32990] | 0, a >>> 0 <= 1) {
                     g = 510;
                     break a;
                    }
                    if (k[32994] = a + 1, k[26] | k[2]) {
                     g = 510;
                     break a;
                    }
                    k[80] = 0, g = 510;
                    break a;
                   }
                   if (!(og(132032, 613448) | 0)) {
                    k[41268] | 0 || (k[41268] = 18), ((k[32994] | 0) >>> 0 < 2 ? 1 : (k[26] | k[2] | 0) != 0) || (k[80] = 0), k[32952] = 16383, g = 510;
                    break a;
                   }
                   if (!(og(132032, 587600) | 0)) {
                    k[32952] = 16383, kb(k[140] | 0, k[33002] | 0, 0) | 0;
                    do if (Jc(h + 32 | 0, 1) | 0) {
                     if ((k[h + 32 + 4 >> 2] | 0) != 15) break;
                     k[32952] = 8191;
                    } while (0);
                    if (e = k[32990] | 0, e >>> 0 > 1 ? (k[80] = 0, g = 380) : (k[32992] | 0) >>> 0 < (m[65916] | 0) >>> 0 && (g = 380), (g | 0) == 380 && (k[41268] = 48, j[65896] = k[32996]), b = j[65844] | 0, c = j[65840] | 0, (c | b) << 16 >> 16 == 2048) {
                     if ((e | 0) == 1) {
                      k[80] = 1, i[166680] = i[613456] | 0, i[166681] = i[613457] | 0, i[166682] = i[613458] | 0, i[166683] = i[613459] | 0, i[166684] = i[613460] | 0, a = 132096, d = 613464, b = a + 11 | 0;
                      do i[a >> 0] = i[d >> 0] | 0, a = a + 1 | 0, d = d + 1 | 0; while ((a | 0) < (b | 0));
                      j[168] = 8, j[164] = 18, j[65840] = 2032, j[65844] = 2016, g = 510;
                      break a;
                     }
                     i[132096] = i[613480] | 0, i[132097] = i[613481] | 0, i[132098] = i[613482] | 0, i[132099] = i[613483] | 0, i[132100] = i[613484] | 0, j[168] = 10, j[164] = 16, j[65840] = 2028, j[65844] = 2022, g = 510;
                     break a;
                    }
                    if (((c & 65535) + (b & 65535) | 0) != 5204) {
                     if (b << 16 >> 16 == 2116) {
                      k[33024] = 1701601622, k[33025] = 3547247, j[168] = 30, j[65840] = (c & 65535) + 65476, j[164] = 55, j[65844] = (b & 65535) + 65426, k[80] = 1229539657, g = 510;
                      break a;
                     }
                     if (b << 16 >> 16 == 3171) {
                      k[33024] = 1701601622, k[33025] = 3547247, j[168] = 24, j[65840] = (c & 65535) + 65488, j[164] = 24, j[65844] = (b & 65535) + 65488, k[80] = 370546198, g = 510;
                      break a;
                     }
                     g = 510;
                     break a;
                    }
                    if (a = i[132096] | 0, a << 24 >> 24 ? d = a : (k[33024] = 1953390915, k[33025] = 6648417, d = 67), (b & 65535) > (c & 65535) ? (j[168] = 6, j[164] = 32, j[65840] = 2048, j[65844] = 3072, a = 1633771873) : (j[164] = 6, j[168] = 32, j[65844] = 2048, j[65840] = 3072, a = 370546198), k[80] = a, +o[33004] == 0 | d << 24 >> 24 == 86) {
                     k[80] = 0, g = 510;
                     break a;
                    }
                    k[32994] = e, g = 510;
                    break a;
                   }
                   do if (og(132032, 609672) | 0) {
                    if (!(og(132032, 586680) | 0)) break;
                    if (!(og(132096, 613776) | 0)) {
                     j[65840] = 1718, j[65844] = 2304, k[80] = 370546198, k[41268] = 9, k[32962] = 30, g = 510;
                     break a;
                    }
                    if (!(og(132032, 613784) | 0)) {
                     b = m[65840] | 0, j[65840] = (b & 1) + b, a = k[41506] | 0, a && (k[80] = a), a = j[65844] | 0, a << 16 >> 16 == 9280 ? (j[65844] = 9274, j[65840] = (b & 1) + b + 65530, a = 9274) : a << 16 >> 16 == 4100 ? (j[65844] = 4096, a = 4096) : a << 16 >> 16 == 4080 && (j[65844] = 4056, a = 4056), b = (k[41268] | 0) == 18, b && (k[32962] = 4), k[32998] = 12;
                     do if (og(132096, 613792) | 0) {
                      if (!(og(132096, 613800) | 0)) break;
                      if (og(132096, 613808) | 0) {
                       if (og(132096, 613816) | 0) {
                        g = 510;
                        break a;
                       }
                       k[41342] = 10721280, k[33044] = f + -10721280, j[66084] = 480, j[66080] = 640, g = 510;
                       break a;
                      }
                      if (j[65844] = (a & 65535) + 65506, !b) {
                       g = 510;
                       break a;
                      }
                      k[32952] = 3961, g = 510;
                      break a;
                     } while (0);
                     if (j[65844] = (a & 65535) + 65516, !b) {
                      g = 510;
                      break a;
                     }
                     k[32952] = 4035, Jg(132256, 0, 8204) | 0, g = 510;
                     break a;
                    }
                    if (!(og(132096, 604528) | 0)) {
                     j[65840] = 2047, j[65844] = 3072, k[80] = 1633771873, k[33002] = 6656, k[41268] = 9, g = 510;
                     break a;
                    }
                    if (!(og(132096, 613824) | 0)) {
                     j[65844] = 3288, j[164] = 5, k[41281] = -17, k[33002] = 862144, k[41268] = 6, k[80] = -1667457892, k[32932] = 4, i[166680] = i[613840] | 0, i[166681] = i[613841] | 0, i[166682] = i[613842] | 0, i[166683] = i[613843] | 0, i[166684] = i[613844] | 0, g = 510;
                     break a;
                    }
                    if (!(og(132096, 613848) | 0)) {
                     j[65844] = 3109, j[164] = 59, k[41275] = 9, k[33002] = 787392, k[41268] = 6, g = 510;
                     break a;
                    }
                    if (a = (og(132032, 613856) | 0) == 0, c << 16 >> 16 == 3984 & a) {
                     j[65844] = 3925, j[284] = 19789, g = 510;
                     break a;
                    }
                    if (c << 16 >> 16 == 4288 & a) {
                     j[65844] = (m[65844] | 0) + 65504, g = 510;
                     break a;
                    }
                    if (c << 16 >> 16 == 4928 & a) {
                     if ((m[65840] | 0) >= 3280) {
                      g = 510;
                      break a;
                     }
                     j[65844] = (m[65844] | 0) + 65528, g = 510;
                     break a;
                    }
                    if (c << 16 >> 16 == 5504 & a) {
                     j[65844] = (m[65844] | 0) - ((m[65840] | 0) > 3664 ? 8 : 32), g = 510;
                     break a;
                    }
                    if (c << 16 >> 16 == 6048 & a) {
                     if (a = m[65844] | 0, j[65844] = a + 65512, !(Ff(132096, 613864) | 0 || Ff(132096, 613872) | 0)) {
                      g = 510;
                      break a;
                     }
                     j[65844] = a + 65506, g = 510;
                     break a;
                    }
                    if (c << 16 >> 16 == 7392 & a) {
                     j[65844] = (m[65844] | 0) + 65506, g = 510;
                     break a;
                    }
                    if (!(og(132096, 587560) | 0)) {
                     a = j[65844] | 0, b = j[65840] | 0, a << 16 >> 16 == 3880 ? (j[65840] = b + -1 << 16 >> 16, j[65896] = c + 1 << 16 >> 16, j[65844] = c + 1 << 16 >> 16) : (j[65840] = (b & 65535) + 65532, j[65844] = (a & 65535) + 65532, j[284] = 19789, k[32962] = 2), k[80] = 1633771873, g = 510;
                     break a;
                    }
                    if (!(og(132096, 613880) | 0)) {
                     j[65840] = (m[65840] | 0) + 65532, g = 510;
                     break a;
                    }
                    if (!(og(132096, 613896) | 0)) {
                     j[168] = 4, j[65840] = (m[65840] | 0) + 65532, j[164] = 32, j[65844] = (m[65844] | 0) + 65504, me(0, 7, 1, 255), g = 510;
                     break a;
                    }
                    do if (og(132096, 612712) | 0) {
                     if (!(og(132096, 613904) | 0)) break;
                     if (!(og(132096, 613912) | 0)) break;
                     if (!(pg(132096, 613920, 9) | 0)) {
                      k[33002] = (k[33002] | 0) < 86016 ? 86016 : 94208, k[41268] = 9, g = 510;
                      break a;
                     }
                     if (ng(132032, 588272) | 0) {
                      if (!(og(132096, 604568) | 0)) {
                       j[65840] = 512, j[65844] = 768, k[33002] = 3632, k[41268] = 39, k[80] = 1633771873, ff(2), g = 510;
                       break a;
                      }
                      if (qg(132096, 614048, 9) | 0) {
                       if (g = (og(132032, 588560) | 0) != 0, g | (k[41268] | 0) != 0) {
                        g = 510;
                        break a;
                       }
                       (c & 65535 | 0) == 2568 ? (j[65840] = 1960, j[65844] = 2560, j[168] = 2, j[164] = 8) : (c & 65535 | 0) == 1316 && (j[65840] = 1030, j[65844] = 1300, j[168] = 1, j[164] = 6), k[80] = 370546198, k[41268] = 53, g = 510;
                       break a;
                      }
                      i[h + 512 + 5 >> 0] | 0 && (j[66053] = 12338, j[66054] = 48), kb(k[140] | 0, 544, 0) | 0, a = pc() | 0, j[65840] = a, a = pc() | 0, j[65844] = a, rc() | 0, a = (pc() | 0) << 16 >> 16 == 30, a = a ? 738 : 736, k[33002] = a, b = j[65840] | 0, c = j[65844] | 0, (b & 65535) > (c & 65535) && (j[65844] = b, j[65840] = c, kb(k[140] | 0, a + -6 | 0, 0) | 0, g = ((pc() | 0) & 3) != 3, k[41352] = g ? 5 : 6), k[80] = 1633771873, g = 510;
                      break a;
                     }
                     (k[80] | 0) == -1 && (k[80] = 1633771873);
                     do {
                      if (qg(132096, 613936, 6) | 0) {
                       if (!(qg(132096, 613944, 6) | 0)) {
                        g = 476;
                        break;
                       }
                       if (!(qg(132096, 613952, 4) | 0)) {
                        g = 476;
                        break;
                       }
                       if (og(132096, 613968) | 0) {
                        if (og(132096, 613976) | 0) break;
                        g = 482;
                        break;
                       }
                       k[32950] = 214, g = 482;
                       break;
                      }
                      g = 476;
                     } while (0);
                     if ((g | 0) == 476 && (j[65844] = (m[65844] | 0) + 65532, j[164] = 2, (i[132102] | 0) == 32 && (i[132102] = 0), og(132096, 613960) | 0 || (g = 482)), (g | 0) == 482 && (k[32932] = 1, k[80] = 0), og(132100, 613984) | 0 || (i[166680] = i[613992] | 0, i[166681] = i[613993] | 0, i[166682] = i[613994] | 0, i[166683] = i[613995] | 0, i[166684] = i[613996] | 0), Ff(132096, 614e3) | 0 && (i[132096] = i[614e3] | 0, i[132097] = i[614001] | 0, i[132098] = i[614002] | 0, i[132099] = i[614003] | 0, i[132100] = i[614004] | 0, k[33002] = 15424), !(qg(132096, 323184, 3) | 0)) {
                      j[65840] = 242, j[65916] = 244, j[65896] = (f | 0) < 1e5 ? 256 : 512, j[65844] = (f | 0) < 1e5 ? 249 : 501, p[20836] = (f | 0) < 1e5 ? 1.2958500669344042 : .6384335885869012, j[164] = 1, j[168] = 1, k[32932] = 4, k[80] = -1920103027, ff(1), o[32913] = 1.1790000200271606, o[32914] = 1.2089999914169312, o[32915] = 1.0360000133514404, k[41268] = 7, g = 510;
                      break a;
                     }
                     if (!(og(132096, 614008) | 0)) {
                      i[132096] = i[614016] | 0, i[132097] = i[614017] | 0, i[132098] = i[614018] | 0, i[132099] = i[614019] | 0, i[132100] = i[614020] | 0, j[65840] = 512, j[65844] = 768, k[33002] = 1152, k[41268] = 39, g = 510;
                      break a;
                     }
                     if (Ff(132096, 614024) | 0) {
                      i[132096] = i[614024] | 0, i[132097] = i[614025] | 0, i[132098] = i[614026] | 0, i[132099] = i[614027] | 0, i[132100] = i[614028] | 0, j[65840] = 512, j[65844] = 768, k[33002] = 19712, k[41268] = 39, g = 510;
                      break a;
                     }
                     if (Ff(132096, 614032) | 0) {
                      i[132096] = i[614032] | 0, i[132097] = i[614033] | 0, i[132098] = i[614034] | 0, i[132099] = i[614035] | 0, i[132100] = i[614036] | 0, i[132101] = i[614037] | 0, j[65840] = 976, j[65844] = 848, p[20836] = 1.5345911949685533, k[41268] = (k[32956] | 0) == 7 ? 52 : 51, g = 510;
                      break a;
                     }
                     if (og(132096, 614040) | 0) {
                      g = 510;
                      break a;
                     }
                     j[66084] = 128, j[66080] = 192, k[41342] = 6144, k[33048] = 360, k[41676] = 27, k[32950] = 17, g = 510;
                     break a;
                    } while (0);
                    j[284] = 18761, a = k[80] | 0, b = k[33002] | 0, (a | 0) != 0 & (b | 0) != 0 ? (kb(k[140] | 0, ((b | 0) < 4096 ? 168 : 5252) | 0, 0) | 0, uc(576, 256), a = k[80] | 0) : me(0, 3.875, 1, 255), a ? a = 7 : (a = (og(132096, 613904) | 0) != 0, a = a ? 50 : 49), k[41268] = a, k[32962] = (k[32998] | 0) >>> 0 > 16 & 1, k[32998] = 8, g = 510;
                    break a;
                   } while (0);
                   do if (((f - (k[33002] | 0) | 0) / (((c & 65535) << 3 >>> 0) / 7 | 0 | 0) | 0 | 0) == (b & 65535 | 0)) k[41268] = 11; else {
                    if (k[41268] | 0) break;
                    k[41268] = 18, k[32962] = 4;
                   } while (0);
                   k[41692] = 1, a = (m[65840] | 0) + 12 | 0, a = (a & 65535) >>> 0 > (b & 65535) >>> 0 ? b : a & 65535, j[65840] = a, d = 0;
                   do {
                    do if ((c & 65535 | 0) == (j[613488 + (d * 12 | 0) >> 1] | 0)) {
                     if ((b & 65535 | 0) != (j[613488 + (d * 12 | 0) + 2 >> 1] | 0)) break;
                     j[164] = j[613488 + (d * 12 | 0) + 4 >> 1] | 0, j[168] = j[613488 + (d * 12 | 0) + 6 >> 1] | 0, j[65844] = (m[65844] | 0) + (m[613488 + (d * 12 | 0) + 8 >> 1] | 0), a = (a & 65535) + (m[613488 + (d * 12 | 0) + 10 >> 1] | 0) & 65535, j[65840] = a;
                    } while (0);
                    d = d + 1 | 0;
                   } while ((d | 0) != 23);
                   g = ka(l[613768 + ((m[164] & 1 ^ (k[80] | 0) + 3 ^ m[168] << 1) & 3) >> 0] | 0, 16843009) | 0, k[80] = g, g = 510;
                   break a;
                  }
                  g = 319;
                 } while (0);
                 (g | 0) == 319 && (j[65840] = 1956, j[65844] = 2607, j[65896] = 2624), k[33002] = (k[33002] | 0) + 14, k[80] = 1633771873;
                } else j[65840] = 1712, j[65844] = 2312, j[65896] = 2336;
                k[41268] = 18, k[32952] = 991, j[284] = 19789, g = 510;
                break a;
               } while (0);
               j[65844] = (j[65844] | 0) + -1 << 16 >> 16, g = 510;
               break a;
              } while (0);
              j[65844] = (m[65844] | 0) + 65484, j[164] = 2, g = 510;
              break a;
             } while (0);
             j[65844] = (m[65844] | 0) + 65490, g = 510;
             break a;
            } while (0);
            j[65844] = (m[65844] | 0) + 65492, g = 510;
            break a;
           } while (0);
           j[65844] = (m[65844] | 0) + 65494, g = 510;
           break a;
          } while (0);
          j[65844] = (m[65844] | 0) + 65532, j[164] = 2, g = 510;
          break a;
         } while (0);
         j[65840] = (m[65840] | 0) + 65533, j[65844] = (m[65844] | 0) + 65532, g = 510;
         break a;
        } while (0);
        k[32932] = 4, k[80] = -1263225676, g = 510;
        break a;
       }
       g = 185;
      } while (0);
      (g | 0) == 185 && (j[65840] = 773, j[65844] = 960, j[65896] = 992, p[20836] = 1.0893617021276596, k[80] = 508436046), k[32932] = 4, k[32998] = 10, k[41268] = 9, k[32962] = 40, g = 510;
     } while (0);
     do if ((g | 0) == 510) {
      if (i[132096] | 0) break;
      a = j[65840] | 0, g = 512;
     } while (0);
     if ((g | 0) == 512 && (k[h + 8 >> 2] = m[65844], k[h + 8 + 4 >> 2] = a & 65535, eg(132096, 614064, h + 8 | 0)), (k[80] | 0) == -1 && (k[80] = -1802201964), a = k[41342] | 0, (a | 0) == 0 | (j[66084] | 0) != 0) break;
     if (kb(k[140] | 0, a | 0, 0) | 0, !(Jc(h + 32 | 0, 1) | 0)) break;
     j[66080] = k[h + 32 + 12 >> 2], j[66084] = k[h + 32 + 8 >> 2];
    } while (0);
    if (+o[41490] > .125 ? ((k[32960] | k[36] | 0) != 0 & k[38] | 0) != 0 : 0) {
     a = 131736, d = 165960, b = a + 48 | 0;
     do k[a >> 2] = k[d >> 2], a = a + 4 | 0, d = d + 4 | 0; while ((a | 0) < (b | 0));
     k[32930] = 0;
    } else k[32930] | 0 && (ef(132032, 132096), (k[41268] | 0) == 39 & (k[32930] | 0) != 0 && ef(604592, 614072));
    if (j[82540] | 0 ? (b = k[41272] | 0, d = (m[65844] | 0) >>> ((b | 0) == 0 & 1), j[82540] = d, k[80] = (d & 1 | 0) != 0 ? -1802201964 : 1229539657, b = (d & 65535) + ((m[65840] | 0) >>> b) | 0, j[65844] = b, j[65840] = b + 65535, p[20836] = 1, d = b + 65535 & 65535, b &= 65535) : (a = j[65840] | 0, (m[65916] | 0) < (a & 65535) && (j[65916] = a), b = j[65844] | 0, (m[65896] | 0) < (b & 65535) ? (j[65896] = b, d = a) : d = a), a = k[32998] | 0, a ? c = a : (k[32998] = 12, c = 12), k[32952] | 0 || (k[32952] = (1 << c) + -1), a = k[41268] | 0, (a | 0) == 0 | (d & 65535) < 22 ? g = 535 : (b & 65535) < 22 | c >>> 0 > 16 | (k[32990] | 0) >>> 0 > 6 | (k[32932] | 0) >>> 0 > 4 && (g = 535), (g | 0) == 535 && (k[32994] = 0), (a | 0) == 41 && (a = k[w >> 2] | 0, k[h >> 2] = k[96], k[h + 4 >> 2] = 614128, Jb(a | 0, 614088, h | 0) | 0, k[32994] = 0, a = k[41268] | 0), (a | 0) == 52 | (a | 0) == 45 && (g = k[w >> 2] | 0, k[h + 24 >> 2] = k[96], k[h + 24 + 4 >> 2] = 614144, Jb(g | 0, 614088, h + 24 | 0) | 0, k[32994] = 0), i[166680] | 0 || (g = (k[32932] | 0) == 3 ? 614152 : 614160, i[166680] = i[g >> 0] | 0, i[166681] = i[g + 1 >> 0] | 0, i[166682] = i[g + 2 >> 0] | 0, i[166683] = i[g + 3 >> 0] | 0, i[166684] = i[g + 4 >> 0] | 0), j[65916] | 0 || (j[65916] = j[65840] | 0), j[65896] | 0 || (j[65896] = j[65844] | 0), a = k[80] | 0, !(a >>> 0 > 999 & (k[32932] | 0) == 3)) break;
    k[80] = (a >>> 2 & 572662306 | a << 2 & -2004318072) & a << 1 | a;
   } while (0);
   (k[41352] | 0) == -1 && (g = k[41674] | 0, k[41352] = (g | 0) == -1 ? 0 : g), r = h;
  }
  function sg(a, b, c, d, e) {
   a |= 0, b |= 0, c |= 0, d |= 0, e |= 0;
   var f = 0, g = 0, h = 0, m = 0, n = 0, o = 0, q = 0, s = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, Ka = 0, La = 0, Ma = 0, Na = 0;
   Na = r, r = r + 864 | 0, ja = Na + 832 | 0, ra = Na + 776 + 40 | 0, wa = Na + 816 + 12 | 0, qa = Na + 832 + 9 | 0, y = 0, z = 0, q = 0, n = 0, B = 0;
   a: for (;;) {
    do {
     if ((q | 0) > -1) {
      if ((n | 0) > (2147483647 - q | 0)) {
       _ = wb() | 0, k[_ >> 2] = 75, _ = -1;
       break;
      }
      _ = n + q | 0;
      break;
     }
     _ = q;
    } while (0);
    if (n = i[b >> 0] | 0, !(n << 24 >> 24)) {
     M = 344;
     break;
    }
    for (m = b; ;) {
     if (n << 24 >> 24 == 37) {
      za = m, Ka = m, M = 9;
      break;
     }
     if (!(n << 24 >> 24)) {
      ha = m, ca = m;
      break;
     }
     L = m + 1 | 0, n = i[L >> 0] | 0, m = L;
    }
    b: do if ((M | 0) == 9) for (;;) {
     if (M = 0, (i[za + 1 >> 0] | 0) != 37) {
      ha = za, ca = Ka;
      break b;
     }
     if (m = Ka + 1 | 0, n = za + 2 | 0, (i[n >> 0] | 0) != 37) {
      ha = n, ca = m;
      break;
     }
     za = n, Ka = m;
    } while (0);
    if (n = ca - b | 0, a && cg(b, n, a), (ca | 0) == (b | 0)) {
     m = ha + 1 | 0, q = i[m >> 0] | 0, ((q << 24 >> 24) + -48 | 0) >>> 0 < 10 ? (w = (i[ha + 2 >> 0] | 0) == 36, m = w ? ha + 3 | 0 : m, s = i[m >> 0] | 0, x = w ? (q << 24 >> 24) + -48 | 0 : -1, w = w ? 1 : B) : (s = q, x = -1, w = B), q = s << 24 >> 24;
     c: do if ((q & -32 | 0) == 32) {
      v = 0;
      do {
       if (!(1 << q + -32 & 75913)) break c;
       v = 1 << (s << 24 >> 24) + -32 | v, m = m + 1 | 0, s = i[m >> 0] | 0, q = s << 24 >> 24;
      } while ((q & -32 | 0) == 32);
     } else v = 0; while (0);
     do if (s << 24 >> 24 == 42) {
      if (s = m + 1 | 0, q = (i[s >> 0] | 0) + -48 | 0, q >>> 0 < 10 && (i[m + 2 >> 0] | 0) == 36 ? (k[e + (q << 2) >> 2] = 10, Aa = 1, Ha = m + 3 | 0, Ja = k[d + ((i[s >> 0] | 0) + -48 << 3) >> 2] | 0) : M = 23, (M | 0) == 23) {
       if (M = 0, w) {
        La = -1, M = 363;
        break a;
       }
       if (!a) {
        m = s, L = 0, K = 0;
        break;
       }
       Aa = (k[c >> 2] | 0) + 3 & -4, Ja = k[Aa >> 2] | 0, k[c >> 2] = Aa + 4, Aa = 0, Ha = s;
      }
      (Ja | 0) < 0 ? (v |= 8192, m = Ha, L = Aa, K = 0 - Ja | 0) : (m = Ha, L = Aa, K = Ja);
     } else if (q = (s << 24 >> 24) + -48 | 0, q >>> 0 < 10) {
      s = 0;
      do s = (s * 10 | 0) + q | 0, m = m + 1 | 0, q = (i[m >> 0] | 0) + -48 | 0; while (q >>> 0 < 10);
      if ((s | 0) < 0) {
       La = -1, M = 363;
       break a;
      }
      L = w, K = s;
     } else L = w, K = 0; while (0);
     d: do if ((i[m >> 0] | 0) == 46) {
      if (q = m + 1 | 0, s = i[q >> 0] | 0, s << 24 >> 24 != 42) {
       if (!(((s << 24 >> 24) + -48 | 0) >>> 0 < 10)) {
        m = q, A = 0;
        break;
       }
       for (m = q, q = 0, s = (s << 24 >> 24) + -48 | 0; ;) if (q = (q * 10 | 0) + s | 0, m = m + 1 | 0, s = (i[m >> 0] | 0) + -48 | 0, s >>> 0 >= 10) {
        A = q;
        break d;
       }
      }
      if (s = m + 2 | 0, q = (i[s >> 0] | 0) + -48 | 0, q >>> 0 < 10 && (i[m + 3 >> 0] | 0) == 36) {
       k[e + (q << 2) >> 2] = 10, m = m + 4 | 0, A = k[d + ((i[s >> 0] | 0) + -48 << 3) >> 2] | 0;
       break;
      }
      if (L) {
       La = -1, M = 363;
       break a;
      }
      a ? (m = (k[c >> 2] | 0) + 3 & -4, A = k[m >> 2] | 0, k[c >> 2] = m + 4, m = s) : (m = s, A = 0);
     } else A = -1; while (0);
     for (w = 0; ;) {
      if (q = (i[m >> 0] | 0) + -65 | 0, q >>> 0 > 57) {
       La = -1, M = 363;
       break a;
      }
      if (J = m + 1 | 0, q = i[629688 + (w * 58 | 0) + q >> 0] | 0, !(((q & 255) + -1 | 0) >>> 0 < 8)) break;
      m = J, w = q & 255;
     }
     if (!(q << 24 >> 24)) {
      La = -1, M = 363;
      break;
     }
     s = (x | 0) > -1;
     e: do if (q << 24 >> 24 == 19) {
      if (s) {
       La = -1, M = 363;
       break a;
      }
      la = y, ma = z, M = 62;
     } else {
      if (s) {
       k[e + (x << 2) >> 2] = q & 255, ma = d + (x << 3) | 0, la = k[ma + 4 >> 2] | 0, ma = k[ma >> 2] | 0, M = 62;
       break;
      }
      if (!a) {
       La = 0, M = 363;
       break a;
      }
      if ((q & 255) > 20) sa = z, ta = y; else do switch (q & 255 | 0) {
      case 9:
       ta = (k[c >> 2] | 0) + 3 & -4, sa = k[ta >> 2] | 0, k[c >> 2] = ta + 4, ta = y;
       break e;

      case 10:
       sa = (k[c >> 2] | 0) + 3 & -4, ta = k[sa >> 2] | 0, k[c >> 2] = sa + 4, sa = ta, ta = ((ta | 0) < 0) << 31 >> 31;
       break e;

      case 11:
       ta = (k[c >> 2] | 0) + 3 & -4, sa = k[ta >> 2] | 0, k[c >> 2] = ta + 4, ta = 0;
       break e;

      case 12:
       I = (k[c >> 2] | 0) + 7 & -8, sa = k[I >> 2] | 0, ta = k[I + 4 >> 2] | 0, k[c >> 2] = I + 8;
       break e;

      case 13:
       sa = (k[c >> 2] | 0) + 3 & -4, ta = k[sa >> 2] | 0, k[c >> 2] = sa + 4, sa = ta << 16 >> 16, ta = (((ta & 65535) << 16 >> 16 | 0) < 0) << 31 >> 31;
       break e;

      case 14:
       ta = (k[c >> 2] | 0) + 3 & -4, sa = k[ta >> 2] | 0, k[c >> 2] = ta + 4, sa &= 65535, ta = 0;
       break e;

      case 15:
       sa = (k[c >> 2] | 0) + 3 & -4, ta = k[sa >> 2] | 0, k[c >> 2] = sa + 4, sa = ta << 24 >> 24, ta = (((ta & 255) << 24 >> 24 | 0) < 0) << 31 >> 31;
       break e;

      case 16:
       ta = (k[c >> 2] | 0) + 3 & -4, sa = k[ta >> 2] | 0, k[c >> 2] = ta + 4, sa &= 255, ta = 0;
       break e;

      case 17:
       sa = (k[c >> 2] | 0) + 7 & -8, u = +p[sa >> 3], k[c >> 2] = sa + 8, p[t >> 3] = u, sa = k[t >> 2] | 0, ta = k[t + 4 >> 2] | 0;
       break e;

      case 18:
       sa = (k[c >> 2] | 0) + 7 & -8, u = +p[sa >> 3], k[c >> 2] = sa + 8, p[t >> 3] = u, sa = k[t >> 2] | 0, ta = k[t + 4 >> 2] | 0;
       break e;

      default:
       sa = z, ta = y;
       break e;
      } while (0);
     } while (0);
     if ((M | 0) == 62) {
      if (M = 0, !a) {
       y = la, z = ma, q = _, b = J, B = L;
       continue;
      }
      sa = ma, ta = la;
     }
     x = i[m >> 0] | 0, x = (w | 0) != 0 & (x & 15 | 0) == 3 ? x & -33 : x, s = v & -65537, I = (v & 8192 | 0) == 0 ? v : s;
     f: do switch (x | 0) {
     case 112:
      ya = I | 8, Ba = A >>> 0 > 8 ? A : 8, Ia = 120, M = 73;
      break;

     case 88:
     case 120:
      ya = I, Ba = A, Ia = x, M = 73;
      break;

     case 117:
      ua = ta, va = sa, Da = 0, Ea = 630168, M = 84;
      break;

     case 110:
      switch (w | 0) {
      case 0:
       k[sa >> 2] = _, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      case 1:
       k[sa >> 2] = _, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      case 6:
       k[sa >> 2] = _, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      case 7:
       y = sa, k[y >> 2] = _, k[y + 4 >> 2] = ((_ | 0) < 0) << 31 >> 31, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      case 3:
       j[sa >> 1] = _, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      case 2:
       y = sa, k[y >> 2] = _, k[y + 4 >> 2] = ((_ | 0) < 0) << 31 >> 31, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      case 4:
       i[sa >> 0] = _, y = ta, z = sa, q = _, b = J, B = L;
       continue a;

      default:
       y = ta, z = sa, q = _, b = J, B = L;
       continue a;
      }

     case 83:
      b = sa, A ? (na = b, oa = sa, Ca = A, M = 97) : (Y = sa, Z = b, X = 0, M = 102);
      break;

     case 111:
      if (q = (sa | 0) == 0 & (ta | 0) == 0) g = ra; else {
       g = ra, b = sa, n = ta;
       do g = g + -1 | 0, i[g >> 0] = b & 7 | 48, b = Ig(b | 0, n | 0, 3) | 0, n = O; while (!((b | 0) == 0 & (n | 0) == 0));
      }
      U = sa, V = ta, P = I, Q = A, R = ((I & 8 | 0) == 0 | q) & 1 ^ 1, N = (I & 8 | 0) == 0 | q ? 630168 : 630173, M = 89;
      break;

     case 67:
      k[Na + 8 >> 2] = sa, k[Na + 8 + 4 >> 2] = 0, na = Na + 8 | 0, oa = Na + 8 | 0, Ca = -1, M = 97;
      break;

     case 99:
      i[Na + 776 + 39 >> 0] = sa, ea = ta, fa = sa, ga = Na + 776 + 39 | 0, h = s, $ = 1, aa = 0, ba = 630168, da = ra;
      break;

     case 109:
      xa = wb() | 0, xa = Kb(k[xa >> 2] | 0) | 0, M = 94;
      break;

     case 105:
     case 100:
      if ((ta | 0) < 0) {
       va = Bg(0, 0, sa | 0, ta | 0) | 0, ua = O, Da = 1, Ea = 630168, M = 84;
       break f;
      }
      I & 2048 ? (ua = ta, va = sa, Da = 1, Ea = 630169, M = 84) : (ua = ta, va = sa, Da = I & 1, Ea = (I & 1 | 0) == 0 ? 630168 : 630170, M = 84);
      break;

     case 65:
     case 71:
     case 70:
     case 69:
     case 97:
     case 103:
     case 102:
     case 101:
      k[t >> 2] = sa, k[t + 4 >> 2] = ta, o = +p[t >> 3], k[Na >> 2] = 0, (ta | 0) < 0 ? (o = -o, F = 1, G = 630192) : I & 2048 ? (F = 1, G = 630195) : (F = I & 1, G = (I & 1 | 0) == 0 ? 630193 : 630198), p[t >> 3] = o, H = k[t + 4 >> 2] & 2146435072;
      do if (H >>> 0 < 2146435072 | (H | 0) == 2146435072 & !1) {
       if (o = +Vf(o, Na) * 2, o != 0 && (k[Na >> 2] = (k[Na >> 2] | 0) + -1), (x | 32 | 0) == 97) {
        n = (x & 32 | 0) == 0 ? G : G + 9 | 0, y = F | 2, q = 12 - A | 0;
        do if (!(A >>> 0 > 11 | (q | 0) == 0)) {
         u = 8;
         do q = q + -1 | 0, u *= 16; while ((q | 0) != 0);
         if ((i[n >> 0] | 0) == 45) {
          o = -(u + (-o - u));
          break;
         }
         o = o + u - u;
         break;
        } while (0);
        if (b = k[Na >> 2] | 0, b = (b | 0) < 0 ? 0 - b | 0 : b, (b | 0) < 0) {
         for (q = wa, s = b, b = ((b | 0) < 0) << 31 >> 31; ;) {
          if (H = Vg(s | 0, b | 0, 10, 0) | 0, q = q + -1 | 0, i[q >> 0] = H | 48, H = s, s = Ug(s | 0, b | 0, 10, 0) | 0, !(b >>> 0 > 9 | (b | 0) == 9 & H >>> 0 > 4294967295)) break;
          b = O;
         }
         b = s;
        } else q = wa;
        if (b) for (;;) {
         if (q = q + -1 | 0, i[q >> 0] = (b >>> 0) % 10 | 0 | 48, b >>> 0 < 10) break;
         b = (b >>> 0) / 10 | 0;
        }
        if ((q | 0) == (wa | 0) && (i[Na + 816 + 11 >> 0] = 48, q = Na + 816 + 11 | 0), i[q + -1 >> 0] = (k[Na >> 2] >> 31 & 2) + 43, w = q + -2 | 0, i[w >> 0] = x + 15, I & 8) {
         q = Na + 832 | 0;
         do H = ~~o, b = q + 1 | 0, i[q >> 0] = l[630152 + H >> 0] | x & 32, o = (o - +(H | 0)) * 16, (b - ja | 0) == 1 ? (i[b >> 0] = 46, q = q + 2 | 0) : q = b; while (o != 0);
        } else if ((A | 0) < 1) for (b = Na + 832 | 0; ;) {
         if (H = ~~o, q = b + 1 | 0, i[b >> 0] = l[630152 + H >> 0] | x & 32, o = (o - +(H | 0)) * 16, (q - ja | 0) != 1 | o == 0 || (i[q >> 0] = 46, q = b + 2 | 0), o == 0) break;
         b = q;
        } else for (b = Na + 832 | 0; ;) {
         if (H = ~~o, q = b + 1 | 0, i[b >> 0] = l[630152 + H >> 0] | x & 32, o = (o - +(H | 0)) * 16, (q - ja | 0) == 1 && (i[q >> 0] = 46, q = b + 2 | 0), o == 0) break;
         b = q;
        }
        if (v = (A | 0) != 0 & (-2 - ja + q | 0) < (A | 0) ? wa + 2 + A - w | 0 : wa - ja - w + q | 0, m = (K | 0) > (v + y | 0), (I & 73728 | 0) == 0 & m) {
         if (b = K - (v + y) | 0, Jg(Na + 520 | 0, 32, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
          s = b;
          do cg(Na + 520 | 0, 256, a), s = s + -256 | 0; while (s >>> 0 > 255);
          b &= 255;
         }
         cg(Na + 520 | 0, b, a);
        }
        if (cg(n, y, a), (I & 73728 | 0) == 65536 & m) {
         if (b = K - (v + y) | 0, Jg(Na + 520 | 0, 48, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
          n = b;
          do cg(Na + 520 | 0, 256, a), n = n + -256 | 0; while (n >>> 0 > 255);
          b &= 255;
         }
         cg(Na + 520 | 0, b, a);
        }
        if (cg(Na + 832 | 0, q - ja | 0, a), q = v - (wa - w) - (q - ja) | 0, (q | 0) > 0) {
         if (Jg(Na + 520 | 0, 48, (q >>> 0 > 256 ? 256 : q) | 0) | 0, q >>> 0 > 255) {
          b = q;
          do cg(Na + 520 | 0, 256, a), b = b + -256 | 0; while (b >>> 0 > 255);
          q &= 255;
         }
         cg(Na + 520 | 0, q, a);
        }
        if (cg(w, wa - w | 0, a), (I & 73728 | 0) == 8192 & m) {
         if (b = K - (v + y) | 0, Jg(Na + 520 | 0, 32, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
          q = b;
          do cg(Na + 520 | 0, 256, a), q = q + -256 | 0; while (q >>> 0 > 255);
          b &= 255;
         }
         cg(Na + 520 | 0, b, a);
        }
        n = m ? K : v + y | 0;
        break;
       }
       b = (A | 0) < 0 ? 6 : A, o != 0 ? (q = (k[Na >> 2] | 0) + -28 | 0, k[Na >> 2] = q, o *= 268435456) : q = k[Na >> 2] | 0, H = (q | 0) < 0 ? Na + 16 | 0 : Na + 16 + 288 | 0, n = H;
       do E = ~~o >>> 0, k[n >> 2] = E, n = n + 4 | 0, o = (o - +(E >>> 0)) * 1e9; while (o != 0);
       if (q = k[Na >> 2] | 0, (q | 0) > 0) {
        s = q, q = H;
        do {
         v = (s | 0) > 29 ? 29 : s, s = n + -4 | 0;
         do if (s >>> 0 >= q >>> 0) {
          m = 0;
          do D = Ng(k[s >> 2] | 0, 0, v | 0) | 0, D = Eg(D | 0, O | 0, m | 0, 0) | 0, E = O, C = Vg(D | 0, E | 0, 1e9, 0) | 0, k[s >> 2] = C, m = Ug(D | 0, E | 0, 1e9, 0) | 0, s = s + -4 | 0; while (s >>> 0 >= q >>> 0);
          if (!m) break;
          q = q + -4 | 0, k[q >> 2] = m;
         } while (0);
         for (;;) {
          if (n >>> 0 <= q >>> 0) break;
          if (s = n + -4 | 0, k[s >> 2] | 0) break;
          n = s;
         }
         s = (k[Na >> 2] | 0) - v | 0, k[Na >> 2] = s;
        } while ((s | 0) > 0);
       } else s = q, q = H;
       g: do if ((s | 0) < 0) {
        if ((x | 32 | 0) != 102) for (;;) {
         v = 0 - s | 0, v = (v | 0) > 9 ? 9 : v;
         do if (q >>> 0 < n >>> 0) {
          m = 0, s = q;
          do E = k[s >> 2] | 0, k[s >> 2] = (E >>> v) + m, m = ka(E & (1 << v) + -1, 1e9 >>> v) | 0, s = s + 4 | 0; while (s >>> 0 < n >>> 0);
          if (q = (k[q >> 2] | 0) == 0 ? q + 4 | 0 : q, !m) {
           s = n;
           break;
          }
          k[n >> 2] = m, s = n + 4 | 0;
         } else q = (k[q >> 2] | 0) == 0 ? q + 4 | 0 : q, s = n; while (0);
         if (n = (s - q >> 2 | 0) > (((b + 25 | 0) / 9 | 0) + 1 | 0) ? q + (((b + 25 | 0) / 9 | 0) + 1 << 2) | 0 : s, s = (k[Na >> 2] | 0) + v | 0, k[Na >> 2] = s, (s | 0) >= 0) {
          A = n;
          break g;
         }
        }
        do {
         v = 0 - s | 0, v = (v | 0) > 9 ? 9 : v;
         do if (q >>> 0 < n >>> 0) {
          m = 0, s = q;
          do E = k[s >> 2] | 0, k[s >> 2] = (E >>> v) + m, m = ka(E & (1 << v) + -1, 1e9 >>> v) | 0, s = s + 4 | 0; while (s >>> 0 < n >>> 0);
          if (q = (k[q >> 2] | 0) == 0 ? q + 4 | 0 : q, !m) {
           s = n;
           break;
          }
          k[n >> 2] = m, s = n + 4 | 0;
         } else q = (k[q >> 2] | 0) == 0 ? q + 4 | 0 : q, s = n; while (0);
         n = (s - H >> 2 | 0) > (((b + 25 | 0) / 9 | 0) + 1 | 0) ? H + (((b + 25 | 0) / 9 | 0) + 1 << 2) | 0 : s, s = (k[Na >> 2] | 0) + v | 0, k[Na >> 2] = s;
        } while ((s | 0) < 0);
        A = n;
       } else A = n; while (0);
       do if (q >>> 0 < A >>> 0) {
        if (s = (H - q >> 2) * 9 | 0, m = k[q >> 2] | 0, m >>> 0 < 10) break;
        n = 10;
        do n = n * 10 | 0, s = s + 1 | 0; while (m >>> 0 >= n >>> 0);
       } else s = 0; while (0);
       if (w = b - ((x | 32 | 0) != 102 ? s : 0) + (((b | 0) != 0 & (x | 32 | 0) == 103) << 31 >> 31) | 0, (w | 0) < (((A - H >> 2) * 9 | 0) + -9 | 0)) {
        if (n = H + (((w + 9216 | 0) / 9 | 0) + -1023 << 2) | 0, (((w + 9216 | 0) % 9 | 0) + 1 | 0) < 9) {
         m = 10, v = ((w + 9216 | 0) % 9 | 0) + 1 | 0;
         do m = m * 10 | 0, v = v + 1 | 0; while ((v | 0) != 9);
        } else m = 10;
        y = k[n >> 2] | 0, z = (y >>> 0) % (m >>> 0) | 0, z ? M = 221 : (H + (((w + 9216 | 0) / 9 | 0) + -1022 << 2) | 0) == (A | 0) ? (W = q, T = n, S = s) : M = 221;
        do if ((M | 0) == 221) {
         M = 0, u = (((y >>> 0) / (m >>> 0) | 0) & 1 | 0) == 0 ? 9007199254740992 : 9007199254740994, v = (m | 0) / 2 | 0;
         do if (z >>> 0 < v >>> 0) o = .5; else {
          if ((z | 0) == (v | 0) && (H + (((w + 9216 | 0) / 9 | 0) + -1022 << 2) | 0) == (A | 0)) {
           o = 1;
           break;
          }
          o = 1.5;
         } while (0);
         do if (F) {
          if ((i[G >> 0] | 0) != 45) break;
          u = -u, o = -o;
         } while (0);
         if (k[n >> 2] = y - z, u + o == u) {
          W = q, T = n, S = s;
          break;
         }
         if (W = y - z + m | 0, k[n >> 2] = W, W >>> 0 > 999999999) for (;;) {
          if (s = n + -4 | 0, k[n >> 2] = 0, s >>> 0 < q >>> 0 && (q = q + -4 | 0, k[q >> 2] = 0), W = (k[s >> 2] | 0) + 1 | 0, k[s >> 2] = W, !(W >>> 0 > 999999999)) {
           n = s;
           break;
          }
          n = s;
         }
         if (s = (H - q >> 2) * 9 | 0, v = k[q >> 2] | 0, v >>> 0 < 10) {
          W = q, T = n, S = s;
          break;
         }
         m = 10;
         do m = m * 10 | 0, s = s + 1 | 0; while (v >>> 0 >= m >>> 0);
         W = q, T = n, S = s;
        } while (0);
        n = T + 4 | 0, q = W, s = S, n = A >>> 0 > n >>> 0 ? n : A;
       } else n = A;
       for (y = 0 - s | 0; ;) {
        if (n >>> 0 <= q >>> 0) {
         B = 0;
         break;
        }
        if (m = n + -4 | 0, k[m >> 2] | 0) {
         B = 1;
         break;
        }
        n = m;
       }
       do {
        if ((x | 32 | 0) == 103) {
         if ((((b | 0) != 0 ^ 1) + b | 0) > (s | 0) & (s | 0) > -5 ? (x = x + -1 | 0, b = ((b | 0) != 0 ^ 1) + b + -1 - s | 0) : (x = x + -2 | 0, b = ((b | 0) != 0 ^ 1) + b + -1 | 0), I & 8) {
          A = I & 8;
          break;
         }
         do if (B) {
          if (m = k[n + -4 >> 2] | 0, !m) {
           v = 9;
           break;
          }
          if ((m >>> 0) % 10 | 0) {
           v = 0;
           break;
          }
          w = 10, v = 0;
          do w = w * 10 | 0, v = v + 1 | 0; while (((m >>> 0) % (w >>> 0) | 0 | 0) == 0);
         } else v = 9; while (0);
         if (m = ((n - H >> 2) * 9 | 0) + -9 | 0, (x | 32 | 0) == 102) {
          A = m - v | 0, A = (A | 0) < 0 ? 0 : A, b = (b | 0) < (A | 0) ? b : A, A = 0;
          break;
         }
         A = m + s - v | 0, A = (A | 0) < 0 ? 0 : A, b = (b | 0) < (A | 0) ? b : A, A = 0;
         break;
        }
        A = I & 8;
       } while (0);
       if (C = b | A, z = (x | 32 | 0) == 102) s = (s | 0) > 0 ? s : 0, y = 0; else {
        if (v = (s | 0) < 0 ? y : s, (v | 0) < 0) {
         for (m = wa, w = v, v = ((v | 0) < 0) << 31 >> 31; ;) {
          if (E = Vg(w | 0, v | 0, 10, 0) | 0, m = m + -1 | 0, i[m >> 0] = E | 48, E = w, w = Ug(w | 0, v | 0, 10, 0) | 0, !(v >>> 0 > 9 | (v | 0) == 9 & E >>> 0 > 4294967295)) break;
          v = O;
         }
         v = w;
        } else m = wa;
        if (v) for (;;) {
         if (m = m + -1 | 0, i[m >> 0] = (v >>> 0) % 10 | 0 | 48, v >>> 0 < 10) break;
         v = (v >>> 0) / 10 | 0;
        }
        if ((wa - m | 0) < 2) do m = m + -1 | 0, i[m >> 0] = 48; while ((wa - m | 0) < 2);
        i[m + -1 >> 0] = (s >> 31 & 2) + 43, y = m + -2 | 0, i[y >> 0] = x, s = wa - y | 0;
       }
       if (D = F + 1 + b + ((C | 0) != 0 & 1) + s | 0, E = (K | 0) > (D | 0), (I & 73728 | 0) == 0 & E) {
        if (s = K - D | 0, Jg(Na + 520 | 0, 32, (s >>> 0 > 256 ? 256 : s) | 0) | 0, s >>> 0 > 255) {
         m = s;
         do cg(Na + 520 | 0, 256, a), m = m + -256 | 0; while (m >>> 0 > 255);
         s &= 255;
        }
        cg(Na + 520 | 0, s, a);
       }
       if (cg(G, F, a), (I & 73728 | 0) == 65536 & E) {
        if (s = K - D | 0, Jg(Na + 520 | 0, 48, (s >>> 0 > 256 ? 256 : s) | 0) | 0, s >>> 0 > 255) {
         m = s;
         do cg(Na + 520 | 0, 256, a), m = m + -256 | 0; while (m >>> 0 > 255);
         s &= 255;
        }
        cg(Na + 520 | 0, s, a);
       }
       if (z) {
        v = q >>> 0 > H >>> 0 ? H : q, m = v;
        do {
         if (s = k[m >> 2] | 0) for (q = qa; ;) {
          if (q = q + -1 | 0, i[q >> 0] = (s >>> 0) % 10 | 0 | 48, s >>> 0 < 10) break;
          s = (s >>> 0) / 10 | 0;
         } else q = qa;
         do if ((m | 0) == (v | 0)) {
          if ((q | 0) != (qa | 0)) break;
          i[Na + 832 + 8 >> 0] = 48, q = Na + 832 + 8 | 0;
         } else {
          if (q >>> 0 <= (Na + 832 | 0) >>> 0) break;
          do q = q + -1 | 0, i[q >> 0] = 48; while (q >>> 0 > (Na + 832 | 0) >>> 0);
         } while (0);
         cg(q, qa - q | 0, a), m = m + 4 | 0;
        } while (m >>> 0 <= H >>> 0);
        if (C && cg(630248, 1, a), (b | 0) > 0 & m >>> 0 < n >>> 0) do {
         if (q = k[m >> 2] | 0) {
          for (s = qa; ;) {
           if (s = s + -1 | 0, i[s >> 0] = (q >>> 0) % 10 | 0 | 48, q >>> 0 < 10) break;
           q = (q >>> 0) / 10 | 0;
          }
          s >>> 0 > (Na + 832 | 0) >>> 0 ? (Fa = s, M = 289) : ia = s;
         } else Fa = qa, M = 289;
         if ((M | 0) == 289) for (;;) {
          if (M = 0, q = Fa + -1 | 0, i[q >> 0] = 48, !(q >>> 0 > (Na + 832 | 0) >>> 0)) {
           ia = q;
           break;
          }
          Fa = q;
         }
         H = (b | 0) > 9, cg(ia, H ? 9 : b, a), m = m + 4 | 0, b = b + -9 | 0;
        } while (H & m >>> 0 < n >>> 0);
        if ((b | 0) > 0) {
         if (Jg(Na + 520 | 0, 48, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
          q = b;
          do cg(Na + 520 | 0, 256, a), q = q + -256 | 0; while (q >>> 0 > 255);
          b &= 255;
         }
         cg(Na + 520 | 0, b, a);
        }
       } else {
        x = B ? n : q + 4 | 0;
        do if ((b | 0) > -1) {
         w = (A | 0) == 0, v = q;
         do {
          if (s = k[v >> 2] | 0) {
           for (m = qa; ;) {
            if (n = m + -1 | 0, i[n >> 0] = (s >>> 0) % 10 | 0 | 48, s >>> 0 < 10) break;
            m = n, s = (s >>> 0) / 10 | 0;
           }
           (n | 0) == (qa | 0) ? M = 303 : (pa = m, Ga = n);
          } else M = 303;
          (M | 0) == 303 && (M = 0, i[Na + 832 + 8 >> 0] = 48, pa = qa, Ga = Na + 832 + 8 | 0);
          do if ((v | 0) == (q | 0)) {
           if (cg(Ga, 1, a), w & (b | 0) < 1) {
            s = pa;
            break;
           }
           cg(630248, 1, a), s = pa;
          } else {
           if (!(Ga >>> 0 > (Na + 832 | 0) >>> 0)) {
            s = Ga;
            break;
           }
           s = Ga;
           do s = s + -1 | 0, i[s >> 0] = 48; while (s >>> 0 > (Na + 832 | 0) >>> 0);
          } while (0);
          H = qa - s | 0, cg(s, (b | 0) > (H | 0) ? H : b, a), b = b - H | 0, v = v + 4 | 0;
         } while (v >>> 0 < x >>> 0 & (b | 0) > -1);
         if ((b | 0) <= 0) break;
         if (Jg(Na + 520 | 0, 48, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
          q = b;
          do cg(Na + 520 | 0, 256, a), q = q + -256 | 0; while (q >>> 0 > 255);
          b &= 255;
         }
         cg(Na + 520 | 0, b, a);
        } while (0);
        cg(y, wa - y | 0, a);
       }
       if ((I & 73728 | 0) == 8192 & E) {
        if (b = K - D | 0, Jg(Na + 520 | 0, 32, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
         n = b;
         do cg(Na + 520 | 0, 256, a), n = n + -256 | 0; while (n >>> 0 > 255);
         b &= 255;
        }
        cg(Na + 520 | 0, b, a);
       }
       n = E ? K : D;
      } else {
       if (s = o != o | !1, v = s ? 0 : F, s = s ? (x & 32 | 0) != 0 ? 630232 : 630240 : (x & 32 | 0) != 0 ? 630216 : 630224, m = (K | 0) > (v + 3 | 0), (I & 8192 | 0) == 0 & m) {
        if (q = K - (v + 3) | 0, Jg(Na + 520 | 0, 32, (q >>> 0 > 256 ? 256 : q) | 0) | 0, q >>> 0 > 255) {
         b = q;
         do cg(Na + 520 | 0, 256, a), b = b + -256 | 0; while (b >>> 0 > 255);
         q &= 255;
        }
        cg(Na + 520 | 0, q, a);
       }
       if (cg(G, v, a), cg(s, 3, a), (I & 73728 | 0) == 8192 & m) {
        if (b = K - (v + 3) | 0, Jg(Na + 520 | 0, 32, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
         n = b;
         do cg(Na + 520 | 0, 256, a), n = n + -256 | 0; while (n >>> 0 > 255);
         b &= 255;
        }
        cg(Na + 520 | 0, b, a);
       }
       n = m ? K : v + 3 | 0;
      } while (0);
      y = ta, z = sa, q = _, b = J, B = L;
      continue a;

     case 115:
      xa = (sa | 0) != 0 ? sa : 630184, M = 94;
      break;

     default:
      ea = ta, fa = sa, ga = b, h = I, $ = A, aa = 0, ba = 630168, da = ra;
     } while (0);
     if ((M | 0) == 73) if (b = Ia & 32, (sa | 0) == 0 & (ta | 0) == 0) U = sa, V = ta, g = ra, P = ya, Q = Ba, R = 0, N = 630168, M = 89; else {
      g = ra, m = sa, n = ta;
      do g = g + -1 | 0, i[g >> 0] = l[630152 + (m & 15) >> 0] | b, m = Ig(m | 0, n | 0, 4) | 0, n = O; while (!((m | 0) == 0 & (n | 0) == 0));
      ya & 8 ? (U = sa, V = ta, P = ya, Q = Ba, R = 2, N = 630168 + (Ia >> 4) | 0, M = 89) : (U = sa, V = ta, P = ya, Q = Ba, R = 0, N = 630168, M = 89);
     } else if ((M | 0) == 84) {
      if (ua >>> 0 > 0 | (ua | 0) == 0 & va >>> 0 > 4294967295) for (g = ra, b = va, n = ua; ;) {
       if (V = Vg(b | 0, n | 0, 10, 0) | 0, g = g + -1 | 0, i[g >> 0] = V | 48, V = b, b = Ug(b | 0, n | 0, 10, 0) | 0, !(n >>> 0 > 9 | (n | 0) == 9 & V >>> 0 > 4294967295)) break;
       n = O;
      } else g = ra, b = va;
      if (b) for (;;) {
       if (g = g + -1 | 0, i[g >> 0] = (b >>> 0) % 10 | 0 | 48, b >>> 0 < 10) {
        U = va, V = ua, P = I, Q = A, R = Da, N = Ea, M = 89;
        break;
       }
       b = (b >>> 0) / 10 | 0;
      } else U = va, V = ua, P = I, Q = A, R = Da, N = Ea, M = 89;
     } else if ((M | 0) == 94) M = 0, da = lg(xa, 0, A) | 0, ea = ta, fa = sa, ga = xa, h = s, $ = (da | 0) == 0 ? A : da - xa | 0, aa = 0, ba = 630168, da = (da | 0) == 0 ? xa + A | 0 : da; else if ((M | 0) == 97) {
      for (n = 0, b = 0, q = na; ;) {
       if (m = k[q >> 2] | 0, !m) break;
       if (b = Zf(Na + 828 | 0, m) | 0, (b | 0) < 0 | b >>> 0 > (Ca - n | 0) >>> 0) break;
       if (n = b + n | 0, !(Ca >>> 0 > n >>> 0)) break;
       q = q + 4 | 0;
      }
      if ((b | 0) < 0) {
       La = -1, M = 363;
       break;
      }
      Y = oa, Z = na, X = n, M = 102;
     }
     if ((M | 0) == 89) M = 0, h = (Q | 0) > -1 ? P & -65537 : P, b = (U | 0) != 0 | (V | 0) != 0, b | (Q | 0) != 0 ? ($ = (b & 1 ^ 1) + (ra - g) | 0, ea = V, fa = U, ga = g, $ = (Q | 0) > ($ | 0) ? Q : $, aa = R, ba = N, da = ra) : (ea = V, fa = U, ga = ra, $ = 0, aa = R, ba = N, da = ra); else if ((M | 0) == 102) {
      if (M = 0, s = (K | 0) > (X | 0), (I & 73728 | 0) == 0 & s) {
       if (b = K - X | 0, Jg(Na + 520 | 0, 32, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
        n = b;
        do cg(Na + 520 | 0, 256, a), n = n + -256 | 0; while (n >>> 0 > 255);
        b &= 255;
       }
       cg(Na + 520 | 0, b, a);
      }
      h: do if (X) for (b = 0, n = Z; ;) {
       if (q = k[n >> 2] | 0, !q) break h;
       if (q = Zf(Na + 828 | 0, q) | 0, b = q + b | 0, (b | 0) > (X | 0)) break h;
       if (cg(Na + 828 | 0, q, a), b >>> 0 >= X >>> 0) break;
       n = n + 4 | 0;
      } while (0);
      if ((I & 73728 | 0) == 8192 & s) {
       if (b = K - X | 0, Jg(Na + 520 | 0, 32, (b >>> 0 > 256 ? 256 : b) | 0) | 0, b >>> 0 > 255) {
        n = b;
        do cg(Na + 520 | 0, 256, a), n = n + -256 | 0; while (n >>> 0 > 255);
        b &= 255;
       }
       cg(Na + 520 | 0, b, a);
      }
      y = ta, z = Y, q = _, b = J, n = s ? K : X, B = L;
      continue;
     }
     if (m = da - ga | 0, b = ($ | 0) < (m | 0) ? m : $, v = aa + b | 0, n = (K | 0) < (v | 0) ? v : K, s = h & 73728, (s | 0) == 0 & (n | 0) > (v | 0)) {
      if (Jg(Na + 520 | 0, 32, ((n - v | 0) >>> 0 > 256 ? 256 : n - v | 0) | 0) | 0, (n - v | 0) >>> 0 > 255) {
       q = n - v | 0;
       do cg(Na + 520 | 0, 256, a), q = q + -256 | 0; while (q >>> 0 > 255);
       q = n - v & 255;
      } else q = n - v | 0;
      cg(Na + 520 | 0, q, a);
     }
     if (cg(ba, aa, a), (s | 0) == 65536 & (n | 0) > (v | 0)) {
      if (Jg(Na + 520 | 0, 48, ((n - v | 0) >>> 0 > 256 ? 256 : n - v | 0) | 0) | 0, (n - v | 0) >>> 0 > 255) {
       q = n - v | 0;
       do cg(Na + 520 | 0, 256, a), q = q + -256 | 0; while (q >>> 0 > 255);
       q = n - v & 255;
      } else q = n - v | 0;
      cg(Na + 520 | 0, q, a);
     }
     if ((b | 0) > (m | 0)) {
      if (Jg(Na + 520 | 0, 48, ((b - m | 0) >>> 0 > 256 ? 256 : b - m | 0) | 0) | 0, (b - m | 0) >>> 0 > 255) {
       q = b - m | 0;
       do cg(Na + 520 | 0, 256, a), q = q + -256 | 0; while (q >>> 0 > 255);
       b = b - m & 255;
      } else b = b - m | 0;
      cg(Na + 520 | 0, b, a);
     }
     if (cg(ga, m, a), (s | 0) == 8192 & (n | 0) > (v | 0)) {
      if (Jg(Na + 520 | 0, 32, ((n - v | 0) >>> 0 > 256 ? 256 : n - v | 0) | 0) | 0, (n - v | 0) >>> 0 > 255) {
       b = n - v | 0;
       do cg(Na + 520 | 0, 256, a), b = b + -256 | 0; while (b >>> 0 > 255);
       b = n - v & 255;
      } else b = n - v | 0;
      cg(Na + 520 | 0, b, a);
     }
     y = ea, z = fa, q = _, b = J, B = L;
    } else q = _, b = ha;
   }
   if ((M | 0) == 344) {
    if (a) return e = _, r = Na, e | 0;
    if (!B) return e = 0, r = Na, e | 0;
    for (b = 1; ;) {
     if (g = k[e + (b << 2) >> 2] | 0, !g) {
      Ma = 0, f = b;
      break;
     }
     h = d + (b << 3) | 0;
     i: do if (g >>> 0 <= 20) do switch (g | 0) {
     case 9:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = Ka;
      break i;

     case 10:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = Ka, k[h + 4 >> 2] = ((Ka | 0) < 0) << 31 >> 31;
      break i;

     case 16:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = Ka & 255, k[h + 4 >> 2] = 0;
      break i;

     case 11:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = Ka, k[h + 4 >> 2] = 0;
      break i;

     case 12:
      Ha = (k[c >> 2] | 0) + 7 & -8, Ia = k[Ha >> 2] | 0, Ka = k[Ha + 4 >> 2] | 0, k[c >> 2] = Ha + 8, k[h >> 2] = Ia, k[h + 4 >> 2] = Ka;
      break i;

     case 17:
      Ka = (k[c >> 2] | 0) + 7 & -8, u = +p[Ka >> 3], k[c >> 2] = Ka + 8, p[h >> 3] = u;
      break i;

     case 14:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = Ka & 65535, k[h + 4 >> 2] = 0;
      break i;

     case 15:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = (Ka & 255) << 24 >> 24, k[h + 4 >> 2] = (((Ka & 255) << 24 >> 24 | 0) < 0) << 31 >> 31;
      break i;

     case 18:
      Ka = (k[c >> 2] | 0) + 7 & -8, u = +p[Ka >> 3], k[c >> 2] = Ka + 8, p[h >> 3] = u;
      break i;

     case 13:
      Ia = (k[c >> 2] | 0) + 3 & -4, Ka = k[Ia >> 2] | 0, k[c >> 2] = Ia + 4, k[h >> 2] = (Ka & 65535) << 16 >> 16, k[h + 4 >> 2] = (((Ka & 65535) << 16 >> 16 | 0) < 0) << 31 >> 31;
      break i;

     default:
      break i;
     } while (0); while (0);
     if (b = b + 1 | 0, (b | 0) >= 10) {
      La = 1, M = 363;
      break;
     }
    }
    if ((M | 0) == 363) return r = Na, La | 0;
    for (;;) {
     if (f = f + 1 | 0, Ma) {
      La = -1, M = 363;
      break;
     }
     if ((f | 0) >= 10) {
      La = 1, M = 363;
      break;
     }
     Ma = k[e + (f << 2) >> 2] | 0;
    }
    if ((M | 0) == 363) return r = Na, La | 0;
   } else if ((M | 0) == 363) return r = Na, La | 0;
   return 0;
  }
  function he() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Z = 0;
   X = r, r = r + 800 | 0, o[X + 616 >> 2] = 0, $d(), ce(X + 120 | 0, 4, 322784) | 0, ce(X + 432 | 0, 27, 322808) | 0, ce(X + 192 | 0, 3, 322824) | 0, ce(X + 208 | 0, 4, 322840) | 0, ce(X + 224 | 0, 4, 322856) | 0, ce(X + 276 | 0, 3, 322872) | 0, N = (ae(322888, 322904) | 0) != 0, ce(X + 264 | 0, 3, N ? 322904 : 322912) | 0, ae(322888, 322928) | 0 && ce(X + 616 | 0, 1, 322928) | 0, q = X + 544 | 0, c = q + 72 | 0;
   do k[q >> 2] = 0, q = q + 4 | 0; while ((q | 0) < (c | 0));
   if (ae(322888, 322944) | 0 ? ce(X + 544 + 24 | 0, 12, 322944) | 0 || (W = 5) : W = 5, (W | 0) == 5) {
    x = 0;
    do {
     if (ce(X + 176 | 0, 4, (x | 0) != 0 ? 322960 : 322984) | 0, n = k[X + 176 + 4 >> 2] | 0, t = k[X + 176 + 12 >> 2] | 0, u = k[X + 176 >> 2] | 0, v = k[X + 176 + 8 >> 2] | 0, b = m[65844] | 0, q = k[32928] | 0, x = x + 1 | 0, (n | 0) > (t | 0)) d = X + 544 + (x * 24 | 0) + 12 | 0, h = X + 544 + (x * 24 | 0) + 20 | 0, a = X + 544 + (x * 24 | 0) + 4 | 0; else for (a = X + 544 + (x * 24 | 0) + 4 | 0, d = X + 544 + (x * 24 | 0) + 12 | 0, h = X + 544 + (x * 24 | 0) + 20 | 0, i = n; ;) {
      if (c = ka(b, i) | 0, (u | 0) <= (v | 0)) {
       for (f = +o[a >> 2], e = +o[d >> 2], g = +o[h >> 2], l = u; ;) {
        if (N = c + l | 0, f += +(j[q + (N << 3) >> 1] | 0), e += +(j[q + (N << 3) + 2 >> 1] | 0), g += +(j[q + (N << 3) + 4 >> 1] | 0), (l | 0) >= (v | 0)) break;
        l = l + 1 | 0;
       }
       o[a >> 2] = f, o[d >> 2] = e, o[h >> 2] = g;
      }
      if (!((i | 0) < (t | 0))) break;
      i = i + 1 | 0;
     }
     U = +(ka(v + 1 - u | 0, t + 1 - n | 0) | 0), o[a >> 2] = +o[a >> 2] / U, o[d >> 2] = +o[d >> 2] / U, o[h >> 2] = +o[h >> 2] / U;
    } while ((x | 0) != 2);
   }
   if (a = ae(323e3, 131864) | 0) {
    ce(X + 396 | 0, 9, a) | 0, ce(X + 360 | 0, 9, ae(323056, 131864) | 0) | 0, q = X + 324 | 0, c = q + 36 | 0;
    do k[q >> 2] = 0, q = q + 4 | 0; while ((q | 0) < (c | 0));
    a = 0;
    do {
     e = +o[X + 360 + (a * 12 | 0) >> 2], f = +o[X + 360 + (a * 12 | 0) + 4 >> 2], g = +o[X + 360 + (a * 12 | 0) + 8 >> 2], d = 0;
     do N = X + 324 + (a * 12 | 0) + (d << 2) | 0, o[N >> 2] = +o[N >> 2] + e * +o[X + 396 + (d << 2) >> 2] + f * +o[X + 396 + 12 + (d << 2) >> 2] + g * +o[X + 396 + 24 + (d << 2) >> 2], d = d + 1 | 0; while ((d | 0) != 3);
     a = a + 1 | 0;
    } while ((a | 0) != 3);
    b = 0;
    do {
     c = b, b = b + 1 | 0, d = (b | 0) == 3 ? 0 : b, a = 0;
     do N = a, a = a + 1 | 0, M = (a | 0) == 3 ? 0 : a, o[X + 136 + (N * 12 | 0) + (c << 2) >> 2] = +o[X + 324 + (d * 12 | 0) + (M << 2) >> 2] * +o[X + 324 + (((c + 2 | 0) % 3 | 0) * 12 | 0) + (((N + 2 | 0) % 3 | 0) << 2) >> 2] - +o[X + 324 + (d * 12 | 0) + (((N + 2 | 0) % 3 | 0) << 2) >> 2] * +o[X + 324 + (((c + 2 | 0) % 3 | 0) * 12 | 0) + (M << 2) >> 2]; while ((a | 0) != 3);
    } while ((b | 0) != 3);
    a = 0;
    do o[X + 36 + (a << 2) >> 2] = +o[X + 136 + (a * 12 | 0) >> 2] * .3127 + +o[X + 136 + (a * 12 | 0) + 4 >> 2] * .329 + +o[X + 136 + (a * 12 | 0) + 8 >> 2] * .3583, a = a + 1 | 0; while ((a | 0) != 3);
    k[X + 32 >> 2] = 131864, eg(X + 664 | 0, 323080, X + 32 | 0), ae(322888, X + 664 | 0) | 0 && ce(X + 36 | 0, 3, X + 664 | 0) | 0, R = +o[X + 36 >> 2], U = R > 0 ? R : 0, S = +o[X + 36 + 4 >> 2], U = U < S ? S : U, T = +o[X + 36 + 8 >> 2], U = U < T ? T : U, o[X + 36 >> 2] = R / U, o[X + 36 + 4 >> 2] = S / U, o[X + 36 + 8 >> 2] = T / U, q = X + 288 | 0, c = q + 36 | 0;
    do k[q >> 2] = 0, q = q + 4 | 0; while ((q | 0) < (c | 0));
    a = 0;
    do {
     f = +o[131736 + (a << 4) >> 2], e = +o[131736 + (a << 4) + 4 >> 2], g = +o[131736 + (a << 4) + 8 >> 2], h = 0;
     do N = X + 288 + (a * 12 | 0) + (h << 2) | 0, Q = +o[X + 36 + (h << 2) >> 2], o[N >> 2] = +o[N >> 2] + f * +o[X + 324 + (h << 2) >> 2] * Q + e * +o[X + 324 + 12 + (h << 2) >> 2] * Q + g * +o[X + 324 + 24 + (h << 2) >> 2] * Q, h = h + 1 | 0; while ((h | 0) != 3);
     a = a + 1 | 0;
    } while ((a | 0) != 3);
    for (A = +o[X + 288 >> 2], B = +o[X + 288 + 4 >> 2], C = +o[X + 288 + 8 >> 2], p[X + 8 >> 3] = A + B + C, D = +o[X + 288 + 12 >> 2] + +o[X + 288 + 16 >> 2] + +o[X + 288 + 20 >> 2], p[X + 8 + 8 >> 3] = D, E = +o[X + 288 + 24 >> 2] + +o[X + 288 + 28 >> 2] + +o[X + 288 + 32 >> 2], p[X + 8 + 16 >> 3] = E, f = A, e = A + B + C, g = B, s = C, a = 0; ;) {
     if (o[X + 324 + (a * 12 | 0) >> 2] = ((A + B + C) * 6 + D * 11 + E * 3) / 20 * f / e, o[X + 324 + (a * 12 | 0) + 4 >> 2] = ((A + B + C) * 6 + D * 11 + E * 3) / 20 * g / e, o[X + 324 + (a * 12 | 0) + 8 >> 2] = ((A + B + C) * 6 + D * 11 + E * 3) / 20 * s / e, a = a + 1 | 0, (a | 0) == 3) break;
     f = +o[X + 288 + (a * 12 | 0) >> 2], e = +p[X + 8 + (a << 3) >> 3], g = +o[X + 288 + (a * 12 | 0) + 4 >> 2], s = +o[X + 288 + (a * 12 | 0) + 8 >> 2];
    }
    q = X + 288 | 0, c = q + 36 | 0;
    do k[q >> 2] = 0, q = q + 4 | 0; while ((q | 0) < (c | 0));
    a = 0;
    do {
     f = (a | 0) == 0 ? 32 : -1, e = (a | 0) == 1 ? 32 : -1, g = (a | 0) == 2 ? 32 : -1, h = 0;
     do N = X + 288 + (a * 12 | 0) + (h << 2) | 0, o[N >> 2] = g * +o[X + 324 + 24 + (h << 2) >> 2] / 30 + (e * +o[X + 324 + 12 + (h << 2) >> 2] / 30 + (f * +o[X + 324 + (h << 2) >> 2] / 30 + +o[N >> 2])), h = h + 1 | 0; while ((h | 0) != 3);
     a = a + 1 | 0;
    } while ((a | 0) != 3);
    if (Q = +o[X + 616 >> 2], fe(X + 624 | 0, X + 264 | 0, X + 36 | 0, Q), e = +o[X + 276 >> 2] / 3, o[X + 276 >> 2] = e, g = +o[X + 276 + 4 >> 2] / 3, o[X + 276 + 4 >> 2] = g, s = +o[X + 276 + 8 >> 2] / 3, o[X + 276 + 8 >> 2] = s, fe(X + 624 + 12 | 0, X + 276 | 0, X + 36 | 0, Q), D = ((A + B + C) * 6 + D * 11 + E * 3) / 20 + e / (R / U) + g / (S / U) + s / (T / U), b = ee(D, D, Q) | 0, k[X + 624 + 24 >> 2] = b, a = ee(D * 2, D * 2, Q) | 0, k[X + 624 + 28 >> 2] = a, y = be(X + 240 | 0, 323096) | 0) {
     if (x = k[X + 240 + 4 >> 2] | 0, P = wg(x, 12) | 0, h = j[65844] | 0, I = j[65840] | 0, z = wg(I & 65535, 12) | 0, O = k[32928] | 0, I << 16 >> 16) {
      n = k[X + 120 >> 2] | 0, l = k[X + 120 + 4 >> 2] | 0, i = k[X + 120 + 8 >> 2] | 0, c = k[X + 120 + 12 >> 2] | 0, t = 0;
      do {
       f = +(t | 0) / +((I & 65535) + -1 | 0), d = 0;
       do D = +o[X + 544 + 24 + (d << 2) >> 2], o[X + 544 + (d << 2) >> 2] = D + f * (+o[X + 544 + 48 + (d << 2) >> 2] - D), d = d + 1 | 0; while ((d | 0) != 6);
       d = ka(h & 65535, t) | 0, q = 0;
       do N = O + (d << 3) + (q << 1) | 0, D = +de(N, n, l, Q), D += +de(N, i, c, Q) * 3, o[z + (t * 12 | 0) + (q << 2) >> 2] = (D - +o[X + 544 + (q << 3) >> 2]) * .25 - +o[X + 544 + (q << 3) + 4 >> 2], q = q + 1 | 0; while ((q | 0) != 3);
       t = t + 1 | 0;
      } while ((t | 0) != (I & 65535 | 0));
     }
     v = ((x + -2 + (h & 65535) | 0) >>> 0) / ((x + -1 | 0) >>> 0) | 0, q = z, d = z + 96 | 0, c = q + 96 | 0;
     do k[q >> 2] = k[d >> 2], q = q + 4 | 0, d = d + 4 | 0; while ((q | 0) < (c | 0));
     Fg(z + (((I & 65535) + -11 | 0) * 12 | 0) | 0, z + (((I & 65535) + -22 | 0) * 12 | 0) | 0, 132) | 0, q = X + 324 | 0, d = z, c = q + 36 | 0;
     do k[q >> 2] = k[d >> 2], q = q + 4 | 0, d = d + 4 | 0; while ((q | 0) < (c | 0));
     if (((I & 65535) + -1 | 0) > 1) {
      q = 1;
      do {
       d = 0;
       do f = +o[X + 324 + 12 + (d << 2) >> 2], e = +o[X + 324 + (d << 2) >> 2], g = +o[X + 324 + 24 + (d << 2) >> 2], f > e ? f > g && (o[z + (q * 12 | 0) + (d << 2) >> 2] = e > g ? e : g) : f < g && (o[z + (q * 12 | 0) + (d << 2) >> 2] = e < g ? e : g), d = d + 1 | 0; while ((d | 0) != 3);
       Lg(X + 324 | 0, X + 324 + 12 | 0, 24) | 0, q = q + 1 | 0, N = z + (q * 12 | 0) | 0, k[X + 324 + 24 >> 2] = k[N >> 2], k[X + 324 + 24 + 4 >> 2] = k[N + 4 >> 2], k[X + 324 + 24 + 8 >> 2] = k[N + 8 >> 2];
      } while ((q | 0) != ((I & 65535) + -1 | 0));
     }
     if (N = ((I & 65535) + -1 | 0) > 1 ? (I & 65535) + -1 | 0 : 1, o[z + (N * 12 | 0) >> 2] = (+o[X + 324 >> 2] + +o[X + 324 + 12 >> 2]) * .5, o[z + (N * 12 | 0) + 4 >> 2] = (+o[X + 324 + 4 >> 2] + +o[X + 324 + 16 >> 2]) * .5, o[z + (N * 12 | 0) + 8 >> 2] = (+o[X + 324 + 8 >> 2] + +o[X + 324 + 20 >> 2]) * .5, f = (+o[z + 12 >> 2] + +o[z + 36 >> 2]) * .5, o[z >> 2] = f, g = (+o[z + 16 >> 2] + +o[z + 40 >> 2]) * .5, o[z + 4 >> 2] = g, e = (+o[z + 20 >> 2] + +o[z + 44 >> 2]) * .5, o[z + 8 >> 2] = e, (I & 65535) > 1) {
      A = f, E = g, s = e, d = 1;
      do N = z + (d * 12 | 0) | 0, A += (+o[N >> 2] - A) * .04081054404377937, o[N >> 2] = A, f += A, N = z + (d * 12 | 0) + 4 | 0, E += (+o[N >> 2] - E) * .04081054404377937, o[N >> 2] = E, g += E, N = z + (d * 12 | 0) + 8 | 0, s += (+o[N >> 2] - s) * .04081054404377937, o[N >> 2] = s, e += s, d = d + 1 | 0; while ((d | 0) < (I & 65535 | 0));
     }
     if (N = z + (((I & 65535) + -1 | 0) * 12 | 0) | 0, k[X + 324 >> 2] = k[N >> 2], k[X + 324 + 4 >> 2] = k[N + 4 >> 2], k[X + 324 + 8 >> 2] = k[N + 8 >> 2], s = f / +(I & 65535 | 0), E = g / +(I & 65535 | 0), A = e / +(I & 65535 | 0), I << 16 >> 16) {
      d = I & 65535, f = +o[X + 324 >> 2], e = +o[X + 324 + 4 >> 2], g = +o[X + 324 + 8 >> 2];
      do d = d + -1 | 0, N = z + (d * 12 | 0) | 0, f += (+o[N >> 2] - s - f) * .04081054404377937, o[N >> 2] = f, N = z + (d * 12 | 0) + 4 | 0, e += (+o[N >> 2] - E - e) * .04081054404377937, o[N >> 2] = e, N = z + (d * 12 | 0) + 8 | 0, g += (+o[N >> 2] - A - g) * .04081054404377937, o[N >> 2] = g; while ((d | 0) != 0);
      if (o[X + 324 >> 2] = f, o[X + 324 + 4 >> 2] = e, o[X + 324 + 8 >> 2] = g, k[X + 64 >> 2] = 0, k[X + 64 + 4 >> 2] = 0, k[X + 64 + 8 >> 2] = 0, k[X + 64 + 12 >> 2] = 0, (I & 65535) > 2) {
       t = (h & 65535) > 6 ? (((h & 65535) + -3 | 0) >>> 2) + 1 | 0 : 1, d = 0, q = 0, c = 0, l = 0, u = 2;
       do {
        if (n = ka(h & 65535, u) | 0, (h & 65535) > 2) {
         i = 2;
         do N = n + i | 0, d = d + (j[O + (N << 3) >> 1] | 0) | 0, q = q + (j[O + (N << 3) + 2 >> 1] | 0) | 0, c = c + (j[O + (N << 3) + 4 >> 1] | 0) | 0, i = i + 4 | 0; while ((i | 0) < (h & 65535 | 0));
         l = t + l | 0, k[X + 64 >> 2] = d, k[X + 64 + 4 >> 2] = q, k[X + 64 + 8 >> 2] = c, k[X + 64 + 12 >> 2] = l;
        }
        u = u + 4 | 0;
       } while ((u | 0) < (I & 65535 | 0));
      } else l = 0, d = 0, q = 0, c = 0;
      f = +(l | 0) * 100, g = s * .5 + +(d | 0) / f, e = E * .5 + +(q | 0) / f, f = A * .5 + +(c | 0) / f, d = 0;
      do N = z + (d * 12 | 0) | 0, o[N >> 2] = g + +o[N >> 2], N = z + (d * 12 | 0) + 4 | 0, o[N >> 2] = e + +o[N >> 2], N = z + (d * 12 | 0) + 8 | 0, o[N >> 2] = f + +o[N >> 2], d = d + 1 | 0; while ((d | 0) != (I & 65535 | 0));
      t = (k[X + 240 + 8 >> 2] | 0) + -1 | 0, d = I & 65535, n = 0;
      do {
       f = +(n | 0) / +(d + -1 | 0), d = 0;
       do D = +o[X + 544 + 24 + (d << 2) >> 2], o[X + 544 + (d << 2) >> 2] = D + f * (+o[X + 544 + 48 + (d << 2) >> 2] - D), d = d + 1 | 0; while ((d | 0) != 6);
       if (d = h & 65535, i = O + ((ka(d, n) | 0) << 3) | 0, j[X + 656 >> 1] = j[i >> 1] | 0, j[X + 656 + 2 >> 1] = j[i + 2 >> 1] | 0, j[X + 656 + 4 >> 1] = j[i + 4 >> 1] | 0, c = (((~~(f * +(t >>> 0)) | 0) == (t | 0)) << 31 >> 31) + ~~(f * +(t >>> 0)) | 0, f = f * +(t >>> 0) - +(c | 0), q = ka(x, c) | 0, c = ka(x, c + 1 | 0) | 0, x) {
        l = 0;
        do M = q + l | 0, N = c + l | 0, o[P + (l * 12 | 0) >> 2] = (1 - f) * +o[y + (M * 12 | 0) >> 2] + f * +o[y + (N * 12 | 0) >> 2], o[P + (l * 12 | 0) + 4 >> 2] = (1 - f) * +o[y + (M * 12 | 0) + 4 >> 2] + f * +o[y + (N * 12 | 0) + 4 >> 2], o[P + (l * 12 | 0) + 8 >> 2] = (1 - f) * +o[y + (M * 12 | 0) + 8 >> 2] + f * +o[y + (N * 12 | 0) + 8 >> 2], l = l + 1 | 0; while ((l | 0) != (x | 0));
       }
       if (h << 16 >> 16) for (l = 0; ;) {
        f = +(l | 0) / +(d | 0) + -.5, h = 0;
        do N = i + (h << 1) | 0, K = j[N >> 1] | 0, L = X + 656 + (h << 1) | 0, M = (K << 16 >> 16) - (j[L >> 1] | 0) | 0, j[L >> 1] = K, D = Q * +(((ka(M, M) | 0) >>> 14) + M | 0), N = ~~(+(j[N >> 1] | 0) + +Y(+(D - +o[X + 544 + (h << 3) + 4 >> 2] - +o[X + 544 + (h << 3) >> 2] * f - +o[z + (n * 12 | 0) + (h << 2) >> 2]))), k[X + 48 + (h << 2) >> 2] = N, h = h + 1 | 0; while ((h | 0) != 3);
        h = 0;
        do N = k[X + 48 + (h << 2) >> 2] | 0, M = (ka(N, N) | 0) >>> 14, k[X + 80 + (h << 2) >> 2] = M, N = (ka(M, N) | 0) >> 14, k[X + 80 + 24 + (h << 2) >> 2] = N, N = h, h = h + 1 | 0, M = (ka(k[X + 48 + (((N + 2 | 0) % 3 | 0) << 2) >> 2] | 0, k[X + 48 + (((h | 0) == 3 ? 0 : h) << 2) >> 2] | 0) | 0) >> 14, k[X + 80 + 12 + (2 - N << 2) >> 2] = M; while ((h | 0) != 3);
        h = (l | 0) / (v | 0) | 0, d = (l | 0) % (v | 0) | 0, q = 0;
        do {
         c = 0, f = 0;
         do f = f + +o[X + 432 + (q * 36 | 0) + (c * 12 | 0) >> 2] * +(k[X + 80 + (c * 12 | 0) >> 2] | 0) + +o[X + 432 + (q * 36 | 0) + (c * 12 | 0) + 4 >> 2] * +(k[X + 80 + (c * 12 | 0) + 4 >> 2] | 0) + +o[X + 432 + (q * 36 | 0) + (c * 12 | 0) + 8 >> 2] * +(k[X + 80 + (c * 12 | 0) + 8 >> 2] | 0), c = c + 1 | 0; while ((c | 0) != 3);
         M = X + 48 + (q << 2) | 0, D = +(k[M >> 2] | 0) + +Y(+f), N = ~~+Y(+(D * (+o[P + ((h + 1 | 0) * 12 | 0) + (q << 2) >> 2] * +(d | 0) + +o[P + (h * 12 | 0) + (q << 2) >> 2] * +(v - d | 0)) / +(v | 0) / +o[X + 36 + (q << 2) >> 2])), N = (N | 0) > 32e3 ? 32e3 : N, k[M >> 2] = N, j[i + (q << 1) >> 1] = N, q = q + 1 | 0;
        } while ((q | 0) != 3);
        if (l = l + 1 | 0, h = j[65844] | 0, d = h & 65535, (l | 0) >= (d | 0)) break;
        i = i + 8 | 0;
       } else h = 0;
       n = n + 1 | 0, d = m[65840] | 0;
      } while ((n | 0) < (d | 0));
      M = X + 64 + 12 | 0;
     } else k[X + 64 >> 2] = 0, k[X + 64 + 4 >> 2] = 0, k[X + 64 + 8 >> 2] = 0, k[X + 64 + 12 >> 2] = 0, M = X + 64 + 12 | 0;
     if (vg(z), vg(P), vg(y), q = be(X + 240 | 0, 323112) | 0) {
      if (c = k[X + 240 >> 2] | 0, l = k[X + 208 >> 2] | 0, i = k[X + 208 + 4 >> 2] | 0, n = k[32928] | 0, c) {
       d = j[65840] | 0, v = 0;
       do {
        if (t = k[q + (v << 2) >> 2] | 0, ((t >>> 20) - i + -1 | 0) >>> 0 <= ((d & 65535) + -3 | 0) >>> 0 && (u = m[65844] | 0, ((t >>> 8 & 4095) - l + -1 | 0) >>> 0 <= (u + -3 | 0) >>> 0)) {
         f = 0, e = 0, g = 0, x = 0, h = 0;
         do t & 1 << x && (N = x << 1, L = (ka((j[323128 + (N << 1) >> 1] | 0) + ((t >>> 20) - i) | 0, u) | 0) + ((t >>> 8 & 4095) - l) | 0, N = L + (j[323128 + ((N | 1) << 1) >> 1] | 0) | 0, f += +(j[n + (N << 3) >> 1] | 0), e += +(j[n + (N << 3) + 2 >> 1] | 0), g += +(j[n + (N << 3) + 4 >> 1] | 0), h = h + 1 | 0), x = x + 1 | 0; while ((x | 0) != 8);
         h && (Q = +(h | 0), N = (ka(u, (t >>> 20) - i | 0) | 0) + ((t >>> 8 & 4095) - l) | 0, j[n + (N << 3) >> 1] = ~~(f / Q), j[n + (N << 3) + 2 >> 1] = ~~(e / Q), j[n + (N << 3) + 4 >> 1] = ~~(g / Q));
        }
        v = v + 1 | 0;
       } while ((v | 0) != (c | 0));
      }
      vg(q);
     }
     if (V = wg((m[65844] | 0) * 5 | 0, 12) | 0, mc(V, 323160), L = j[65844] | 0, O = k[32928] | 0, P = j[65840] | 0, ((P & 65535) + -2 | 0) > 2) for (G = 4, H = 2, J = -1, l = 0, h = V, c = V + ((L & 65535) * 12 | 0) | 0, i = V + (((L & 65535) << 1) * 12 | 0) | 0, d = V + (((L & 65535) * 3 | 0) * 12 | 0) | 0, q = V + (((L & 65535) << 2) * 12 | 0) | 0; ;) {
      if (I = (J | 0) > (G | 0), (J | 0) < (H + 2 | 0)) for (v = i, x = h, u = J; ;) {
       if (u = u + 1 | 0, h = x, ((L & 65535) + -2 | 0) > 2) {
        t = O + ((ka(L & 65535, u) | 0) + 2 << 3) | 0, i = j[t >> 1] | 0, n = 2;
        do N = t, t = t + 8 | 0, K = i, i = j[t >> 1] | 0, k[h + (n * 12 | 0) >> 2] = ((K << 16 >> 16) * 6 | 0) + 8 + (j[N + -16 >> 1] | 0) + ((i << 16 >> 16) + (j[N + -8 >> 1] | 0) << 2) + (j[N + 16 >> 1] | 0) >> 4, n = n + 1 | 0; while ((n | 0) != ((L & 65535) + -2 | 0));
       }
       if ((u | 0) == (G | 0)) {
        h = c, c = v, i = d, d = q, q = x;
        break;
       }
       N = q, q = x, x = c, c = v, v = d, d = N;
      }
      if (t = i, u = c, v = d, x = h, y = q, ((L & 65535) + -2 | 0) > 2) for (z = 2, F = O + ((ka(L & 65535, H) | 0) + 2 << 3) | 0; ;) {
       if (n = ((k[t + (z * 12 | 0) >> 2] | 0) * 6 | 0) + 8 + ((k[v + (z * 12 | 0) >> 2] | 0) + (k[u + (z * 12 | 0) >> 2] | 0) << 2) + (k[x + (z * 12 | 0) >> 2] | 0) + (k[y + (z * 12 | 0) >> 2] | 0) >> 4, N = j[F >> 1] | 0, N = (N - ((n * 7 | 0) + ((z | 0) == 2 ? n : l) >> 3) >> 3) + N | 0, j[F >> 1] = (N | 0) > 32e3 ? 32e3 : N & 65535, z = z + 1 | 0, (z | 0) >= ((L & 65535) + -2 | 0)) {
        l = n;
        break;
       }
       F = F + 8 | 0, l = n;
      }
      if (J = I ? J : G, G = G + 1 | 0, (G | 0) == (P & 65535 | 0)) {
       F = i;
       break;
      }
      H = H + 1 | 0;
     } else h = V, c = V + ((L & 65535) * 12 | 0) | 0, F = V + (((L & 65535) << 1) * 12 | 0) | 0, d = V + (((L & 65535) * 3 | 0) * 12 | 0) | 0, q = V + (((L & 65535) << 2) * 12 | 0) | 0;
     if (i = ~~(+(k[X + 192 >> 2] | 0) / (R / U)), i = (i | 0) < 65535 ? i : 65535, N = ~~(+(k[X + 192 + 4 >> 2] | 0) / (S / U)), i = (i | 0) > (N | 0) ? N : i, N = ~~(+(k[X + 192 + 8 >> 2] | 0) / (T / U)), i = ((i | 0) > (N | 0) ? N : i) * 9 >> 4, ka(L & 65535, P & 65535) | 0) {
      z = O;
      do {
       n = j[z >> 1] | 0;
       do if ((n | 0) > (i | 0) && (t = z + 2 | 0, u = j[t >> 1] | 0, (u | 0) > (i | 0) && (v = z + 4 | 0, x = j[v >> 1] | 0, (x | 0) > (i | 0)))) {
        if (l = (n | 0) > (u | 0) ? u : n, y = (n | 0) < (u | 0) ? u : n, l = (l | 0) > (x | 0) ? x : l, y = (y | 0) < (x | 0) ? x : y, (l | 0) < (i << 1 | 0)) {
         N = 16384 - ((ka(16384 - ((l - i << 14 | 0) / (i | 0) | 0) | 0, 16384 - ((l - i << 14 | 0) / (i | 0) | 0) | 0) | 0) >>> 14) | 0, N = (ka(N, N) | 0) >>> 14, K = ((ka(y - n | 0, N) | 0) >>> 14) + n & 65535, j[z >> 1] = K, K = ((ka(y - u | 0, N) | 0) >>> 14) + u & 65535, j[t >> 1] = K, N = ((ka(y - x | 0, N) | 0) >>> 14) + x & 65535, j[v >> 1] = N;
         break;
        }
        j[v >> 1] = y, j[t >> 1] = y, j[z >> 1] = y;
        break;
       } while (0);
       z = z + 8 | 0;
      } while (z >>> 0 < (O + ((ka(L & 65535, P & 65535) | 0) << 3) | 0) >>> 0);
     }
     if (((P & 65535) + -2 | 0) > 2) {
      for (z = 4, G = 2, H = -1, l = F; ;) {
       if (y = (H | 0) > (z | 0), (H | 0) < (G + 2 | 0)) for (u = l, v = h, t = H; ;) {
        if (t = t + 1 | 0, h = v, ((L & 65535) + -2 | 0) > 2) for (i = 2, n = O + ((ka(L & 65535, t) | 0) + 2 << 3) | 0; ;) {
         l = 0;
         do k[h + (i * 12 | 0) + (l << 2) >> 2] = (j[n + (l + -4 << 1) >> 1] | 0) + 2 + (j[n + (l << 1) >> 1] << 1) + (j[n + (l + 4 << 1) >> 1] | 0) >> 2, l = l + 1 | 0; while ((l | 0) != 3);
         if (i = i + 1 | 0, (i | 0) == ((L & 65535) + -2 | 0)) break;
         n = n + 8 | 0;
        }
        if ((t | 0) == (z | 0)) {
         h = c, c = u, l = d, d = q, q = v;
         break;
        }
        N = q, q = v, v = c, c = u, u = d, d = N;
       }
       if (i = c, n = l, t = d, ((L & 65535) + -2 | 0) > 2) for (v = 2, x = O + ((ka(L & 65535, G) | 0) + 2 << 3) | 0; ;) {
        u = 0;
        do N = 0 - (ge(a, (j[x + (u << 1) >> 1] | 0) - ((k[n + (v * 12 | 0) + (u << 2) >> 2] << 1) + (k[i + (v * 12 | 0) + (u << 2) >> 2] | 0) + (k[t + (v * 12 | 0) + (u << 2) >> 2] | 0) >> 2) | 0) | 0) | 0, k[X + 252 + (u << 2) >> 2] = N, u = u + 1 | 0; while ((u | 0) != 3);
        if (J = k[X + 252 >> 2] | 0, F = k[X + 252 + 4 >> 2] | 0, K = k[X + 252 + 8 >> 2] | 0, j[x >> 1] = J - ((F + J + K | 0) >>> 3) + (m[x >> 1] | 0), N = x + 2 | 0, j[N >> 1] = F - ((F + J + K | 0) >>> 3) + (m[N >> 1] | 0), N = x + 4 | 0, j[N >> 1] = K - ((F + J + K | 0) >>> 3) + (m[N >> 1] | 0), v = v + 1 | 0, (v | 0) >= ((L & 65535) + -2 | 0)) break;
        x = x + 8 | 0;
       }
       if (H = y ? H : z, z = z + 1 | 0, (z | 0) == (P & 65535 | 0)) break;
       G = G + 1 | 0;
      }
      if (((P & 65535) + -2 | 0) > 2) for (I = 4, J = 2, K = -1; ;) {
       if (H = (K | 0) > (I | 0), (K | 0) < (J + 2 | 0)) for (v = l, u = K; ;) {
        if (u = u + 1 | 0, l = h, ((L & 65535) + -2 | 0) > 2) for (n = 2, t = O + ((ka(L & 65535, u) | 0) + 2 << 3) | 0; ;) {
         i = 0;
         do k[l + (n * 12 | 0) + (i << 2) >> 2] = (j[t + (i + -8 << 1) >> 1] | 0) + 2 + (j[t + (i + -4 << 1) >> 1] | 0) + (j[t + (i << 1) >> 1] | 0) + (j[t + (i + 4 << 1) >> 1] | 0) + (j[t + (i + 8 << 1) >> 1] | 0) >> 2, i = i + 1 | 0; while ((i | 0) != 3);
         if (n = n + 1 | 0, (n | 0) == ((L & 65535) + -2 | 0)) break;
         t = t + 8 | 0;
        }
        if ((u | 0) == (I | 0)) {
         G = c, c = v, l = d, d = q, q = h;
         break;
        }
        G = q, N = c, q = h, c = v, v = d, d = G, h = N;
       } else G = h;
       if (((L & 65535) + -2 | 0) > 2) for (t = G, u = c, v = l, x = d, y = q, z = 2, F = O + ((ka(L & 65535, J) | 0) + 2 << 3) | 0; ;) {
        k[M >> 2] = 375, h = 0, i = 60;
        do N = X + 64 + (h << 2) | 0, k[N >> 2] = 0, n = k[t + (z * 12 | 0) + (h << 2) >> 2] | 0, k[N >> 2] = n, n = n + (k[u + (z * 12 | 0) + (h << 2) >> 2] | 0) | 0, k[N >> 2] = n, n = n + (k[v + (z * 12 | 0) + (h << 2) >> 2] | 0) | 0, k[N >> 2] = n, n = n + (k[x + (z * 12 | 0) + (h << 2) >> 2] | 0) | 0, k[N >> 2] = n, n = n + (k[y + (z * 12 | 0) + (h << 2) >> 2] | 0) | 0, k[N >> 2] = n, n = (k[M >> 2] | 0) + n | 0, k[M >> 2] = n, i = (j[F + (h << 1) >> 1] | 0) + i | 0, h = h + 1 | 0; while ((h | 0) != 3);
        h = (i | 0) < 0 ? 0 : i, h = (n | 0) > 375 ? (h << 16 | 0) / (n | 0) | 0 : h * 174 | 0, i = 0;
        do Z = (ka(k[X + 64 + (i << 2) >> 2] | 0, h) | 0) + 32768 >> 16, N = F + (i << 1) | 0, n = j[N >> 1] | 0, n = (n & 65535) + (ge(b, Z - (n << 16 >> 16) | 0) | 0) & 65535, j[N >> 1] = n, i = i + 1 | 0; while ((i | 0) != 3);
        if (z = z + 1 | 0, (z | 0) >= ((L & 65535) + -2 | 0)) break;
        F = F + 8 | 0;
       }
       if (K = H ? K : I, I = I + 1 | 0, (I | 0) == (P & 65535 | 0)) {
        I = G, H = c, F = l;
        break;
       }
       J = J + 1 | 0, h = G;
      } else I = h, H = c, F = l;
     } else I = h, H = c;
     if (ka(L & 65535, P & 65535) | 0) {
      h = k[X + 624 >> 2] | 0, d = k[X + 624 + 4 >> 2] | 0, q = k[X + 624 + 8 >> 2] | 0, v = O;
      do {
       i = j[v >> 1] | 0, i = (i & 65535) - (ge(h, i << 16 >> 16) | 0) | 0, j[v >> 1] = i, c = v + 2 | 0, n = j[c >> 1] | 0, n = (n & 65535) - (ge(d, n << 16 >> 16) | 0) | 0, j[c >> 1] = n, l = v + 4 | 0, u = j[l >> 1] | 0, u = (u & 65535) - (ge(q, u << 16 >> 16) | 0) | 0, j[l >> 1] = u, t = (u << 16 >> 16) + (i << 16 >> 16) + (n << 16 >> 15) >> 2, i = i - (ge(h, (i << 16 >> 16) - t | 0) | 0) & 65535, j[v >> 1] = i, n = n - (ge(d, (n << 16 >> 16) - t | 0) | 0) & 65535, j[c >> 1] = n, t = u - (ge(q, (u << 16 >> 16) - t | 0) | 0) & 65535, j[l >> 1] = t, u = 0;
       do U = +o[X + 288 + (u * 12 | 0) >> 2] * +(i << 16 >> 16) + 0 + +o[X + 288 + (u * 12 | 0) + 4 >> 2] * +(n << 16 >> 16) + +o[X + 288 + (u * 12 | 0) + 8 >> 2] * +(t << 16 >> 16), U = U < 0 ? 0 : U, k[X + 48 + (u << 2) >> 2] = U > 24e3 ? 24e3 : ~~(U + .5), u = u + 1 | 0; while ((u | 0) != 3);
       j[v >> 1] = k[X + 48 >> 2], j[c >> 1] = k[X + 48 + 4 >> 2], j[l >> 1] = k[X + 48 + 8 >> 2], v = v + 8 | 0;
      } while (v >>> 0 < (O + ((ka(L & 65535, P & 65535) | 0) << 3) | 0) >>> 0);
      M = X + 48 + 8 | 0, N = X + 48 + 4 | 0, O = X + 48 | 0;
     } else M = X + 48 + 8 | 0, N = X + 48 + 4 | 0, O = X + 48 | 0;
     if (P = wg((P & 65535) >>> 2 & 65535, ((L & 65535) >>> 2 & 65535) * 6 | 0) | 0, mc(P, 323160), K = j[65840] | 0, L = k[32928] | 0, (K & 65535) >>> 2 << 16 >> 16) {
      v = j[65844] | 0, t = (K & 65535) >>> 2 & 65535;
      do if (u = t, t = t + -1 | 0, x = t << 2, y = ka((v & 65535) >>> 2 & 65535, u) | 0, z = ka((v & 65535) >>> 2 & 65535, t) | 0, (v & 65535) >>> 2 << 16 >> 16) {
       G = 0;
       do {
        for (k[M >> 2] = 0, k[N >> 2] = 0, k[O >> 2] = 0, l = G << 2, d = 0, h = 0, q = 0, n = 0; ;) {
         i = ka(v & 65535, n + x | 0) | 0, c = h, h = 0;
         do Z = h + l + i | 0, d = d + (j[L + (Z << 3) >> 1] | 0) | 0, c = c + (j[L + (Z << 3) + 2 >> 1] | 0) | 0, q = q + (j[L + (Z << 3) + 4 >> 1] | 0) | 0, h = h + 1 | 0; while ((h | 0) != 4);
         if (n = n + 1 | 0, (n | 0) == 4) break;
         h = c;
        }
        for (k[O >> 2] = d, k[N >> 2] = c, k[M >> 2] = q, c = y + G | 0, l = z + G | 0, q = 0; ;) {
         if (h = (u | 0) < ((K & 65535) >>> 2 & 65535 | 0) ? ((d * 141 | 0) + 2048 + ((j[P + (c * 6 | 0) + (q << 1) >> 1] | 0) * 1840 | 0) | 0) >>> 12 : d >>> 4, j[P + (l * 6 | 0) + (q << 1) >> 1] = h, h = q + 1 | 0, (h | 0) == 3) break;
         d = k[X + 48 + (h << 2) >> 2] | 0, q = h;
        }
        G = G + 1 | 0;
       } while ((G | 0) != ((v & 65535) >>> 2 & 65535 | 0));
      } while ((t | 0) != 0);
     }
     if (J = H, G = H, H = F, z = F, (K & 65535) > 3) {
      x = j[65844] | 0, y = 0;
      do {
       k[M >> 2] = 0, k[N >> 2] = 0, k[O >> 2] = 0;
       a: do if (y & 3) d = x & 65535, q = x & 65532, W = 182; else {
        if (d = ka((x & 65535) >>> 2 & 65535, (y | 0) / 4 | 0) | 0, !(x & 65532)) {
         k[M >> 2] = 0, k[N >> 2] = 0, k[O >> 2] = 0, d = x & 65535, q = x & 65532, h = (x & 65532 | 0) == 0;
         break;
        }
        for (a = x & 65532, h = 0; ;) {
         if (a = a + -1 | 0, Z = (h * 6707 | 0) + 4096 + ((j[P + ((d + ((a | 0) / 4 | 0) | 0) * 6 | 0) >> 1] | 0) * 1485 | 0) >> 13, k[O >> 2] = Z, k[I + (a * 12 | 0) >> 2] = Z, Z = ((k[N >> 2] | 0) * 6707 | 0) + 4096 + ((j[P + ((d + ((a | 0) / 4 | 0) | 0) * 6 | 0) + 2 >> 1] | 0) * 1485 | 0) >> 13, k[N >> 2] = Z, k[I + (a * 12 | 0) + 4 >> 2] = Z, Z = ((k[M >> 2] | 0) * 6707 | 0) + 4096 + ((j[P + ((d + ((a | 0) / 4 | 0) | 0) * 6 | 0) + 4 >> 1] | 0) * 1485 | 0) >> 13, k[M >> 2] = Z, k[I + (a * 12 | 0) + 8 >> 2] = Z, !a) {
          d = x & 65535, q = x & 65532, W = 182;
          break a;
         }
         h = k[O >> 2] | 0;
        }
       } while (0);
       b: do if ((W | 0) == 182) {
        if (W = 0, k[M >> 2] = 0, k[N >> 2] = 0, k[O >> 2] = 0, h = (q | 0) == 0) break;
        for (b = 0, a = 0; ;) {
         if (Z = ((k[I + (a * 12 | 0) >> 2] | 0) * 1485 | 0) + 4096 + (b * 6707 | 0) >> 13, k[O >> 2] = Z, k[J + (a * 12 | 0) >> 2] = Z, Z = ((k[I + (a * 12 | 0) + 4 >> 2] | 0) * 1485 | 0) + 4096 + ((k[N >> 2] | 0) * 6707 | 0) >> 13, k[N >> 2] = Z, k[J + (a * 12 | 0) + 4 >> 2] = Z, Z = ((k[I + (a * 12 | 0) + 8 >> 2] | 0) * 1485 | 0) + 4096 + ((k[M >> 2] | 0) * 6707 | 0) >> 13, k[M >> 2] = Z, k[J + (a * 12 | 0) + 8 >> 2] = Z, a = a + 1 | 0, (a | 0) == (q | 0)) break b;
         b = k[O >> 2] | 0;
        }
       } while (0);
       do if (y) {
        if (h) break;
        a = 0;
        do Z = z + (a * 12 | 0) | 0, k[Z >> 2] = ((k[Z >> 2] | 0) * 6707 | 0) + 4096 + ((k[J + (a * 12 | 0) >> 2] | 0) * 1485 | 0) >> 13, Z = z + (a * 12 | 0) + 4 | 0, k[Z >> 2] = ((k[Z >> 2] | 0) * 6707 | 0) + 4096 + ((k[J + (a * 12 | 0) + 4 >> 2] | 0) * 1485 | 0) >> 13, Z = z + (a * 12 | 0) + 8 | 0, k[Z >> 2] = ((k[Z >> 2] | 0) * 6707 | 0) + 4096 + ((k[J + (a * 12 | 0) + 8 >> 2] | 0) * 1485 | 0) >> 13, a = a + 1 | 0; while ((a | 0) != (q | 0));
        W = 188;
       } else Fg(H | 0, G | 0, d * 12 | 0) | 0, W = 188; while (0);
       do if ((W | 0) == 188) {
        if (W = 0, h) break;
        v = 0;
        do {
         for (b = (ka(d, y) | 0) + v | 0, t = k[z + (v * 12 | 0) >> 2] | 0, c = j[L + (b << 3) >> 1] | 0, l = j[L + (b << 3) + 2 >> 1] | 0, i = j[L + (b << 3) + 4 >> 1] | 0, n = ((i & 65535) + ((l & 65535) + ((c & 65535) + 30)) << 16 | 0) / ((k[z + (v * 12 | 0) + 8 >> 2] | 0) + ((k[z + (v * 12 | 0) + 4 >> 2] | 0) + (t + 30)) | 0) | 0, u = c, a = 0, h = 0; ;) {
          if (Z = ge(k[X + 624 + (a + 3 << 2) >> 2] | 0, ((ka(t, n) | 0) + 32768 >> 16) - (u << 16 >> 16) | 0) | 0, k[X + 48 + (a << 2) >> 2] = Z, h = Z + h | 0, a = a + 1 | 0, (a | 0) == 3) break;
          t = k[z + (v * 12 | 0) + (a << 2) >> 2] | 0, u = j[L + (b << 3) + (a << 1) >> 1] | 0;
         }
         Z = (k[O >> 2] | 0) - (h >> 3) + (c << 16 >> 16) | 0, j[L + (b << 3) >> 1] = (Z | 0) < 0 ? 0 : Z & 65535, Z = (k[N >> 2] | 0) - (h >> 3) + (l << 16 >> 16) | 0, j[L + (b << 3) + 2 >> 1] = (Z | 0) < 0 ? 0 : Z & 65535, Z = (k[M >> 2] | 0) - (h >> 3) + (i << 16 >> 16) | 0, j[L + (b << 3) + 4 >> 1] = (Z | 0) < 0 ? 0 : Z & 65535, v = v + 1 | 0;
        } while ((v | 0) < (q | 0));
       } while (0);
       y = y + 1 | 0;
      } while ((y | 0) < (K & 65532 | 0));
      b = k[X + 624 + 24 >> 2] | 0, a = k[X + 624 + 28 >> 2] | 0;
     }
     if (vg(P), vg(V), vg(k[X + 624 >> 2] | 0), vg(k[X + 624 + 4 >> 2] | 0), vg(k[X + 624 + 8 >> 2] | 0), vg(k[X + 624 + 12 >> 2] | 0), vg(k[X + 624 + 16 >> 2] | 0), vg(k[X + 624 + 20 >> 2] | 0), vg(b), vg(a), b = k[X + 208 + 4 >> 2] | 0, c = k[X + 224 + 4 >> 2] | 0, k[X + 224 + 4 >> 2] = c - b, h = k[X + 224 + 12 >> 2] | 0, k[X + 224 + 12 >> 2] = h + -2, i = k[X + 224 >> 2] | 0, l = (k[X + 224 + 8 >> 2] | 0) - i | 0, n = (h + -2 - (c - b) | 0) > 0) {
      a = k[32928] | 0, d = j[65844] | 0, q = 0;
      do Fg(a + ((ka(q, l) | 0) << 3) | 0, a + ((ka(d & 65535, c - b + q | 0) | 0) + i << 3) | 0, l << 3 | 0) | 0, q = q + 1 | 0; while ((q | 0) != (b + h + -2 - c | 0));
     }
     j[65844] = l, j[65840] = n ? h + -2 - (c - b) & 65535 : 0;
    }
   } else N = k[w >> 2] | 0, k[X >> 2] = k[96], k[X + 4 >> 2] = 131864, Jb(N | 0, 323024, X | 0) | 0;
   r = X;
  }
  function Ge(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0;
   if (A = r, r = r + 1328 | 0, k[A + 460 >> 2] = 50462976, k[A + 192 >> 2] = k[146846], k[A + 192 + 4 >> 2] = k[146847], k[A + 192 + 8 >> 2] = k[146848], k[A + 192 + 12 >> 2] = k[146849], k[A + 192 + 16 >> 2] = k[146850], k[A + 192 + 20 >> 2] = k[146851], k[A + 192 + 24 >> 2] = k[146852], k[A + 192 + 28 >> 2] = k[146853], k[A + 224 >> 2] = 0, k[A + 224 + 4 >> 2] = 0, k[A + 224 + 8 >> 2] = 0, k[A + 224 + 12 >> 2] = 0, k[A + 224 + 16 >> 2] = 0, k[A + 224 + 20 >> 2] = 0, k[A + 224 + 24 >> 2] = 0, k[A + 224 + 28 >> 2] = 0, k[A + 384 >> 2] = k[146854], k[A + 384 + 4 >> 2] = k[146855], k[A + 384 + 8 >> 2] = k[146856], k[A + 384 + 12 >> 2] = k[146857], k[A + 384 + 16 >> 2] = k[146858], k[A + 384 + 20 >> 2] = k[146859], k[A + 464 >> 2] = k[146860], k[A + 464 + 4 >> 2] = k[146861], k[A + 464 + 8 >> 2] = k[146862], k[A + 464 + 12 >> 2] = k[146863], k[A + 464 + 16 >> 2] = k[146864], k[A + 464 + 20 >> 2] = k[146865], d = k[41502] | 0, d >>> 0 > 9) b = 1; else {
    k[41502] = d + 1, b = 0;
    do p[A + 256 + (b << 5) >> 3] = +((b | 0) == 0 | 0), p[A + 256 + (b << 5) + 8 >> 3] = +((b | 0) == 1 | 0), p[A + 256 + (b << 5) + 16 >> 3] = +((b | 0) == 2 | 0), p[A + 256 + (b << 5) + 24 >> 3] = +((b | 0) == 3 | 0), b = b + 1 | 0; while ((b | 0) != 4);
    if (b = pc() | 0, (b & 65535) > 512) b = 1; else {
     if (b << 16 >> 16) {
      for (z = b & 65535, v = 0, n = 16, w = 0, x = 0, y = 0, e = 0; ;) {
       z = z + -1 | 0, De(a, A + 976 | 0, A + 964 | 0, A + 972 | 0, A + 968 | 0), b = k[A + 976 >> 2] | 0;
       a: do if ((b | 0) == 38 | (b | 0) == 37 | (b | 0) == 36) g = +((pc() | 0) & 65535), o[132016 + (b + -36 << 2) >> 2] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 50716 | (b | 0) == 50715) {
        if (k[A + 972 >> 2] | 0) {
         f = 0, c = 0;
         do c += +tc(k[A + 964 >> 2] | 0), f = f + 1 | 0, b = k[A + 972 >> 2] | 0; while (f >>> 0 < b >>> 0);
        } else b = 0, c = 0;
        k[32950] = ~~(c / +(b >>> 0) + .5 + +((k[32950] | 0) >>> 0)) >>> 0, b = v, s = w, q = x, t = y;
       } else if ((b | 0) == 259) b = sc(k[A + 964 >> 2] | 0) | 0, k[165480 + (d * 48 | 0) + 12 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 11 | (b | 0) == 305) {
        if (Cb(A + 984 | 0, 64, k[140] | 0) | 0, qg(A + 984 | 0, 587480, 5) | 0 && qg(A + 984 | 0, 587488, 5) | 0 && qg(A + 984 | 0, 587496, 5) | 0 && qg(A + 984 | 0, 587504, 6) | 0 && qg(A + 984 | 0, 587512, 10) | 0 && og(A + 984 | 0, 587528) | 0) {
         b = v, s = w, q = x, t = y;
         break a;
        }
        k[32994] = 0, b = v, s = w, q = x, t = y;
       } else if ((b | 0) == 7) b = (pc() | 0) & 65535, j[65844] = (m[65844] | 0) + b, b = v, s = w, q = x, t = y; else if ((b | 0) == 280) (k[A + 964 >> 2] | 0) == 4 ? (k[41268] = 11, k[32962] = 8200, u = 45) : (b = v, s = w, q = x, t = y); else if ((b | 0) == 277) b = (sc(k[A + 964 >> 2] | 0) | 0) & 7, k[165480 + (d * 48 | 0) + 28 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 6) b = pc() | 0, j[65840] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 271) Cb(132032, 64, k[140] | 0) | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 50724 | (b | 0) == 50723) if (b = k[32932] | 0) {
        s = 0;
        do {
         if (b) {
          f = 0;
          do g = +tc(k[A + 964 >> 2] | 0), p[A + 256 + (s << 5) + (f << 3) >> 3] = g, f = f + 1 | 0, b = k[32932] | 0; while (f >>> 0 < b >>> 0);
         } else b = 0;
         s = s + 1 | 0;
        } while (s >>> 0 < b >>> 0);
        b = v, s = w, q = x, t = y;
       } else b = v, s = w, q = x, t = y; else if ((b | 0) == 5) b = pc() | 0, j[65844] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 61447 | (b | 0) == 513 | (b | 0) == 273) u = 45; else if ((b | 0) == 50727) if (k[32932] | 0) {
        b = 0;
        do g = +tc(k[A + 964 >> 2] | 0), p[A + 192 + (b << 3) >> 3] = g, b = b + 1 | 0; while (b >>> 0 < (k[32932] | 0) >>> 0);
        b = v, s = w, q = x, t = y;
       } else b = v, s = w, q = x, t = y; else if ((b | 0) == 61442 | (b | 0) == 257 | (b | 0) == 3) b = sc(k[A + 964 >> 2] | 0) | 0, k[165480 + (d * 48 | 0) + 4 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 61441 | (b | 0) == 256 | (b | 0) == 2) b = sc(k[A + 964 >> 2] | 0) | 0, k[165480 + (d * 48 | 0) >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 18 | (b | 0) == 17) ((k[A + 964 >> 2] | 0) == 3 ? (k[A + 972 >> 2] | 0) == 1 : 0) ? (g = +((pc() | 0) & 65535 | 0) * .00390625, o[132016 + ((b << 1) + -34 << 2) >> 2] = g, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y); else if ((b | 0) == 61443 | (b | 0) == 258) k[165480 + (d * 48 | 0) + 28 >> 2] = k[A + 972 >> 2] & 7, b = sc(k[A + 964 >> 2] | 0) | 0, k[165480 + (d * 48 | 0) + 8 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 272) Cb(132096, 64, k[140] | 0) | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 61446) j[65916] = 0, (k[165480 + (d * 48 | 0) + 8 >> 2] | 0) > 12 ? (b = v, s = w, q = x, t = y) : (k[41268] = 9, b = (rc() | 0) != 0, k[32962] = b ? 24 : 80, b = v, s = w, q = x, t = y); else if ((b | 0) == 274) b = 587464 + ((pc() | 0) & 7) | 0, k[165480 + (d * 48 | 0) + 24 >> 2] = (i[b >> 0] | 0) + -48, b = v, s = w, q = x, t = y; else if ((b | 0) == 61454) g = +((sc(k[A + 964 >> 2] | 0) | 0) >>> 0), o[33005] = g, g = +((sc(k[A + 964 >> 2] | 0) | 0) >>> 0), o[33004] = g, g = +((sc(k[A + 964 >> 2] | 0) | 0) >>> 0), o[33006] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 39) (+o[33004] != 0 ? 1 : (k[A + 972 >> 2] | 0) >>> 0 < 50) ? (b = v, s = w, q = x, t = y) : (kb(k[140] | 0, 12, 1) | 0, g = +((pc() | 0) & 65535), o[33004] = g, g = +((pc() | 0) & 65535), o[33005] = g, g = +((pc() | 0) & 65535), o[33006] = g, b = v, s = w, q = x, t = y); else if ((b | 0) == 50728) if (k[32932] | 0) {
        b = 0;
        do g = +tc(k[A + 964 >> 2] | 0), p[A + 224 + (b << 3) >> 3] = g, b = b + 1 | 0; while (b >>> 0 < (k[32932] | 0) >>> 0);
        b = v, s = w, q = x, t = y;
       } else b = v, s = w, q = x, t = y; else if ((b | 0) == 23) (k[A + 964 >> 2] | 0) == 3 ? (g = +((pc() | 0) & 65535), o[41344] = g, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y); else if ((b | 0) == 61448 | (b | 0) == 514 | (b | 0) == 279) b = rc() | 0, k[165480 + (d * 48 | 0) + 32 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 262) b = (pc() | 0) & 65535, k[165480 + (d * 48 | 0) + 16 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 50714) b = j[66132] | 0, f = j[66133] | 0, u = 170; else if ((b | 0) == 50830) {
        if (k[A + 972 >> 2] | 0) {
         b = 0;
         do h = sc(k[A + 964 >> 2] | 0) | 0, k[165096 + (b << 2) >> 2] = h, b = b + 1 | 0; while ((b | 0) < 32 ? b >>> 0 < (k[A + 972 >> 2] | 0) >>> 0 : 0);
        }
        k[32950] = 0, b = v, s = w, q = x, t = y;
       } else if ((b | 0) == 50722 | (b | 0) == 50721) if (k[32932] | 0) {
        b = 0;
        do g = +tc(k[A + 964 >> 2] | 0), p[A + (b * 24 | 0) >> 3] = g, g = +tc(k[A + 964 >> 2] | 0), p[A + (b * 24 | 0) + 8 >> 3] = g, g = +tc(k[A + 964 >> 2] | 0), p[A + (b * 24 | 0) + 16 >> 3] = g, b = b + 1 | 0; while (b >>> 0 < (k[32932] | 0) >>> 0);
        b = v, s = w, q = x, t = y, e = 1;
       } else b = v, s = w, q = x, t = y, e = 1; else if ((b | 0) == 46) (k[A + 964 >> 2] | 0) == 7 && (ib(k[140] | 0) | 0) == 255 && (ib(k[140] | 0) | 0) == 216 ? (b = (vb(k[140] | 0) | 0) + -2 | 0, k[41342] = b, k[33044] = k[A + 972 >> 2], b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y); else if ((b | 0) == 9) b = pc() | 0, b << 16 >> 16 ? (k[80] = b & 65535, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y); else if ((b | 0) == 270) Ga(166168, 512, 1, k[140] | 0) | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 30 | (b | 0) == 29 | (b | 0) == 28) s = pc() | 0, j[132256 + (b + -28 << 1) >> 1] = s, j[66131] = j[66129] | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 61440) b = k[140] | 0, kb(b | 0, (rc() | 0) + a | 0, 0) | 0, Ge(a) | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 34310) Le(vb(k[140] | 0) | 0), u = 112; else if ((b | 0) == 34303) u = 112; else if ((b | 0) == 330) {
        if (!(og(132096, 587560) | 0) && (k[165480 + (d * 48 | 0) >> 2] | 0) == 3872) {
         k[41268] = 13, b = (rc() | 0) + a | 0, k[33002] = b, d = d + 1 | 0, b = v, s = w, q = x, t = y;
         break a;
        }
        if (h = k[A + 972 >> 2] | 0, k[A + 972 >> 2] = h + -1, h) for (;;) {
         if (b = vb(k[140] | 0) | 0, h = k[140] | 0, kb(h | 0, (rc() | 0) + a | 0, 0) | 0, Ge(a) | 0) {
          b = v, s = w, q = x, t = y;
          break a;
         }
         if (kb(k[140] | 0, b + 4 | 0, 0) | 0, h = k[A + 972 >> 2] | 0, k[A + 972 >> 2] = h + -1, !h) {
          b = v, s = w, q = x, t = y;
          break;
         }
        } else b = v, s = w, q = x, t = y;
       } else if ((b | 0) == 28688) {
        s = ((pc() | 0) & 65535) >>> 2 & 4095, k[A + 464 + 4 >> 2] = s, s = ((pc() | 0) & 65535) >>> 2 & 4095, k[A + 464 + 8 >> 2] = s, s = ((pc() | 0) & 65535) >>> 2 & 4095, k[A + 464 + 12 >> 2] = s, s = ((pc() | 0) & 65535) >>> 2 & 4095, k[A + 464 + 16 >> 2] = s, s = 0, f = 0;
        do if (h = f, f = f + 1 | 0, b = s, s = k[A + 464 + (f << 2) >> 2] | 0, (b + 1 | 0) >>> 0 <= s >>> 0) {
         q = j[576 + (b << 1) >> 1] | 0, b = b + 1 | 0;
         do q = (q & 65535) + (1 << h) & 65535, j[576 + (b << 1) >> 1] = q, b = b + 1 | 0; while (b >>> 0 <= s >>> 0);
        } while ((f | 0) != 5);
        b = v, s = w, q = x, t = y;
       } else {
        if ((b | 0) == 324) {
         if (b = (k[A + 972 >> 2] | 0) >>> 0 > 1 ? vb(k[140] | 0) | 0 : rc() | 0, k[165480 + (d * 48 | 0) + 20 >> 2] = b, b = k[A + 972 >> 2] | 0, (b | 0) == 4) {
          k[41268] = 12, k[32994] = 5, b = v, s = w, q = x, t = y;
          break a;
         }
         if ((b | 0) == 1) {
          k[165480 + (d * 48 | 0) + 40 >> 2] = 0, k[165480 + (d * 48 | 0) + 36 >> 2] = 0, b = v, s = w, q = x, t = y;
          break a;
         }
         b = v, s = w, q = x, t = y;
         break a;
        }
        if ((b | 0) == 34665) b = k[140] | 0, kb(b | 0, (rc() | 0) + a | 0, 0) | 0, Ie(a), b = v, s = w, q = x, t = y; else if ((b | 0) == 34853) b = k[140] | 0, kb(b | 0, (rc() | 0) + a | 0, 0) | 0, Je(a), b = v, s = w, q = x, t = y; else if ((b | 0) == 50831 | (b | 0) == 34675) vb(k[140] | 0) | 0, k[41540] = k[A + 972 >> 2], b = v, s = w, q = x, t = y; else if ((b | 0) == 37122) b = rc() | 0, k[35118] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 37393) b = sc(k[A + 964 >> 2] | 0) | 0, k[41350] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 37386) g = +tc(k[A + 964 >> 2] | 0), o[41504] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 33422) if ((k[80] | 0) == 9) {
         b = 0;
         do h = (ib(k[140] | 0) | 0) & 3, i[344 + b >> 0] = h, b = b + 1 | 0; while ((b | 0) != 36);
         b = v, s = w, q = x, t = y;
        } else u = 97; else if ((b | 0) == 65024 | (b | 0) == 33424) b = k[140] | 0, kb(b | 0, (rc() | 0) + a | 0, 0) | 0, Ne(a), b = v, s = w, q = x, t = y; else if ((b | 0) == 33434) g = +tc(k[A + 964 >> 2] | 0), o[41348] = g, o[165480 + (d * 48 | 0) + 44 >> 2] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 315) Ga(165416, 64, 1, k[140] | 0) | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 400) k[33008] = 1852989779, k[33009] = 6710895, k[32952] = 4095, b = v, s = w, q = x, t = y; else if ((b | 0) == 323) b = sc(k[A + 964 >> 2] | 0) | 0, k[165480 + (d * 48 | 0) + 40 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 29217) b = v, s = rc() | 0, q = x, t = y; else if ((b | 0) == 306) He(0), b = v, s = w, q = x, t = y; else if ((b | 0) == 29264) Pe(vb(k[140] | 0) | 0), j[65896] = 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 322) b = sc(k[A + 964 >> 2] | 0) | 0, k[165480 + (d * 48 | 0) + 36 >> 2] = b, b = v, s = w, q = x, t = y; else if ((b | 0) == 29459) g = +((pc() | 0) & 65535), o[33004] = g, g = +((pc() | 0) & 65535), o[33005] = g, g = +((pc() | 0) & 65535), o[33006] = g, g = +((pc() | 0) & 65535), o[33007] = g, b = (+o[33005] == 1024 & +o[33006] == 1024 & 1) << 1, g = +o[132016 + ((b | 1) << 2) >> 2], c = +o[132016 + (b << 2) >> 2] + g, o[132016 + ((b | 1) << 2) >> 2] = c - g, o[132016 + (b << 2) >> 2] = c - (c - g), b = v, s = w, q = x, t = y; else if ((b | 0) == 29184) b = v, s = w, q = x, t = rc() | 0; else if ((b | 0) == 33405) Cb(131864, 64, k[140] | 0) | 0, b = v, s = w, q = x, t = y; else if ((b | 0) == 33421) (pc() | 0) << 16 >> 16 == 6 && (pc() | 0) << 16 >> 16 == 6 ? (k[80] = 9, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y); else if ((b | 0) == 29443) g = +((pc() | 0) & 65535), o[33005] = g, g = +((pc() | 0) & 65535), o[33004] = g, g = +((pc() | 0) & 65535), o[33006] = g, g = +((pc() | 0) & 65535), o[33007] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 29185) b = v, s = w, q = rc() | 0, t = y; else if ((b | 0) == 34306) g = 4096 / +((pc() | 0) & 65535 | 0), o[33005] = g, g = 4096 / +((pc() | 0) & 65535 | 0), o[33004] = g, g = 4096 / +((pc() | 0) & 65535 | 0), o[33007] = g, g = 4096 / +((pc() | 0) & 65535 | 0), o[33006] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 64777) u = 97; else if ((b | 0) == 33437) g = +tc(k[A + 964 >> 2] | 0), o[41346] = g, b = v, s = w, q = x, t = y; else if ((b | 0) == 34307) if (Ga(A + 984 | 0, 1, 7, k[140] | 0) | 0, qg(A + 984 | 0, 587584, 6) | 0) b = v, s = w, q = x, t = y; else {
         k[32932] = 4, k[32930] = 0, s = 0;
         do t = k[140] | 0, b = 131736 + (s << 4) + 4 | 0, k[A + 456 >> 2] = b, Ya(t | 0, 587592, A + 456 | 0) | 0, t = k[140] | 0, f = 131736 + (s << 4) | 0, k[A + 448 >> 2] = f, Ya(t | 0, 587592, A + 448 | 0) | 0, t = k[140] | 0, h = 131736 + (s << 4) + 12 | 0, k[A + 424 >> 2] = h, Ya(t | 0, 587592, A + 424 | 0) | 0, t = k[140] | 0, q = 131736 + (s << 4) + 8 | 0, k[A + 416 >> 2] = q, Ya(t | 0, 587592, A + 416 | 0) | 0, k[36] | 0 && (C = +o[f >> 2], B = +o[b >> 2], c = +o[q >> 2], g = +o[h >> 2], o[f >> 2] = C / (C + 0 + B + c + g), o[b >> 2] = B / (C + 0 + B + c + g), o[q >> 2] = c / (C + 0 + B + c + g), o[h >> 2] = g / (C + 0 + B + c + g)), s = s + 1 | 0; while ((s | 0) != 3);
         b = v, s = w, q = x, t = y;
        } else if ((b | 0) == 50710) (k[80] | 0) == 9 ? (b = v, s = w, q = x, t = y) : (b = k[A + 972 >> 2] | 0, b >>> 0 > 4 && (k[A + 972 >> 2] = 4, b = 4), k[32932] = b, Ga(A + 460 | 0, 1, b | 0, k[140] | 0) | 0, f = k[32932] | 0, u = 159); else if ((b | 0) == 46274) u = 128; else if ((b | 0) == 50706) h = k[32960] << 8, h = (ib(k[140] | 0) | 0) + h | 0, k[32960] = h, h = (ib(k[140] | 0) | 0) + (h << 8) | 0, k[32960] = h, h = (ib(k[140] | 0) | 0) + (h << 8) | 0, k[32960] = h, h = (ib(k[140] | 0) | 0) + (h << 8) | 0, k[32960] = h, i[132032] | 0 || (k[33008] = 4673092), k[32994] = 1, b = v, s = w, q = x, t = y; else if ((b | 0) == 46275) i[132032] = i[587608] | 0, i[132033] = i[587609] | 0, i[132034] = i[587610] | 0, i[132035] = i[587611] | 0, i[132036] = i[587612] | 0, i[132037] = i[587613] | 0, i[132038] = i[587614] | 0, b = vb(k[140] | 0) | 0, k[33002] = b, b = k[A + 972 >> 2] | 0, s = w, q = x, t = y; else if ((b | 0) == 50458) if (i[132032] | 0) b = v, s = w, q = x, t = y; else {
         b = 132032, f = 587664, h = b + 11 | 0;
         do i[b >> 0] = i[f >> 0] | 0, b = b + 1 | 0, f = f + 1 | 0; while ((b | 0) < (h | 0));
         b = v, s = w, q = x, t = y;
        } else if ((b | 0) == 50455 | (b | 0) == 50454) if (b = k[A + 972 >> 2] | 0, h = ug(b) | 0) {
         Ga(h | 0, 1, b | 0, k[140] | 0) | 0, f = h + -1 | 0;
         do {
          if (f >>> 0 >= (h + (k[A + 972 >> 2] | 0) | 0) >>> 0) break;
          b = f + 1 | 0, qg(b, 587632, 8) | 0 || (k[A + 432 >> 2] = 132016, k[A + 432 + 4 >> 2] = 132020, k[A + 432 + 8 >> 2] = 132024, xf(f + 9 | 0, 587648, A + 432 | 0) | 0), f = Bf(b, 10) | 0;
         } while ((f | 0) != 0);
         vg(h), b = v, s = w, q = x, t = y;
        } else b = v, s = w, q = x, t = y; else if ((b | 0) == 37400) {
         k[32930] = 0, b = 0;
         do +tc(k[A + 964 >> 2] | 0), C = +tc(k[A + 964 >> 2] | 0), o[131736 + (b << 4) >> 2] = C, C = +tc(k[A + 964 >> 2] | 0), o[131736 + (b << 4) + 4 >> 2] = C, C = +tc(k[A + 964 >> 2] | 0), o[131736 + (b << 4) + 8 >> 2] = C, b = b + 1 | 0; while ((b | 0) != 3);
         b = v, s = w, q = x, t = y;
        } else if ((b | 0) == 50459) b = j[284] | 0, q = vb(k[140] | 0) | 0, s = k[41502] | 0, t = pc() | 0, j[284] = t, t = k[140] | 0, pc() | 0, kb(t | 0, (rc() | 0) + q | 0, 0) | 0, Ge(q) | 0, k[32952] = 65535, k[41502] = s, j[284] = b, b = v, s = w, q = x, t = y; else {
         if ((b | 0) == 40976) {
          if (b = rc() | 0, k[33062] = b, b = k[165480 + (d * 48 | 0) + 12 >> 2] | 0, (b | 0) == 32773) {
           k[41268] = 16, b = v, s = w, q = x, t = y;
           break a;
          }
          if ((b | 0) == 32772) {
           k[41268] = 15, b = v, s = w, q = x, t = y;
           break a;
          }
          if ((b | 0) == 32770) {
           k[41268] = 14, b = v, s = w, q = x, t = y;
           break a;
          }
          b = v, s = w, q = x, t = y;
          break a;
         }
         (b | 0) == 46279 ? v ? (kb(k[140] | 0, 38, 1) | 0, u = 128) : (b = 0, s = w, q = x, t = y) : (b | 0) == 50708 ? i[132096] | 0 ? (b = v, s = w, q = x, t = y) : (Cb(132032, 64, k[140] | 0) | 0, b = Bf(132032, 32) | 0, b ? (Og(132096, b + 1 | 0) | 0, i[b >> 0] = 0, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y)) : (b | 0) == 50712 | (b | 0) == 291 ? (Me(k[A + 972 >> 2] | 0), b = v, s = w, q = x, t = y) : (b | 0) == 51009 ? (b = vb(k[140] | 0) | 0, k[33e3] = b, b = v, s = w, q = x, t = y) : (b | 0) == 50740 ? k[32960] | 0 ? (b = v, s = w, q = x, t = y) : (b = (rc() | 0) + a | 0, Pe(b), kb(k[140] | 0, b | 0, 0) | 0, Ge(a) | 0, b = v, s = w, q = x, t = y) : (b | 0) == 50711 ? (pc() | 0) << 16 >> 16 == 2 ? (j[82540] = 1, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y) : (b | 0) == 50717 ? (b = sc(k[A + 964 >> 2] | 0) | 0, k[32952] = b, b = v, s = w, q = x, t = y) : (b | 0) == 50752 ? (uc(131856, 3), b = v, s = w, q = x, t = y) : (b | 0) == 65026 ? (k[A + 964 >> 2] | 0) == 2 ? (Cb(131864, 64, k[140] | 0) | 0, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y) : (b | 0) == 64772 ? (k[A + 972 >> 2] | 0) >>> 0 < 13 ? (b = v, s = w, q = x, t = y) : (kb(k[140] | 0, 16, 1) | 0, b = rc() | 0, k[33002] = b, kb(k[140] | 0, 28, 1) | 0, b = rc() | 0, k[33002] = (k[33002] | 0) + b, k[41268] = 9, b = v, s = w, q = x, t = y) : (b | 0) == 50718 ? (C = +tc(k[A + 964 >> 2] | 0), p[20836] = C, C = +tc(k[A + 964 >> 2] | 0), p[20836] = +p[20836] / C, b = v, s = w, q = x, t = y) : (b | 0) == 50729 ? (B = +tc(k[A + 964 >> 2] | 0), C = +tc(k[A + 964 >> 2] | 0), p[A + 384 + 8 >> 3] = C, p[A + 384 >> 3] = B / .9504560232162476, p[A + 384 + 16 >> 3] = (1 - B - C) / 1.0887540578842163, b = v, s = w, q = x, t = y) : (b | 0) == 50829 ? (b = (sc(k[A + 964 >> 2] | 0) | 0) & 65535, j[168] = b, b = (sc(k[A + 964 >> 2] | 0) | 0) & 65535, j[164] = b, b = sc(k[A + 964 >> 2] | 0) | 0, j[65840] = b - (m[168] | 0), b = sc(k[A + 964 >> 2] | 0) | 0, j[65844] = b - (m[164] | 0), b = v, s = w, q = x, t = y) : (b | 0) == 50713 ? (h = pc() | 0, j[66132] = h, h = pc() | 0, j[66133] = h, (ka(m[66132] | 0, h & 65535) | 0) >>> 0 > 4096 ? (j[66133] = 1, j[66132] = 1, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y)) : (b | 0) == 61450 ? (C = +_(+ +((k[A + 972 >> 2] | 0) >>> 0)), f = C < 64 ? ~~C & 65535 : 64, j[66133] = f, j[66132] = f, b = f, u = 170) : (b = v, s = w, q = x, t = y);
        }
       } while (0);
       do if ((u | 0) == 45) u = 0, b = (rc() | 0) + a | 0, t = 165480 + (d * 48 | 0) + 20 | 0, k[t >> 2] = b, s = 165480 + (d * 48 | 0) + 8 | 0, (k[s >> 2] | 0) == 0 & (b | 0) > 0 ? (kb(k[140] | 0, b | 0, 0) | 0, Jc(A + 488 | 0, 1) | 0 ? (k[165480 + (d * 48 | 0) + 12 >> 2] = 6, b = k[A + 488 + 12 >> 2] | 0, q = 165480 + (d * 48 | 0) | 0, k[q >> 2] = b, f = k[A + 488 + 8 >> 2] | 0, h = 165480 + (d * 48 | 0) + 4 | 0, k[h >> 2] = f, k[s >> 2] = k[A + 488 + 4 >> 2], s = k[A + 488 + 16 >> 2] | 0, k[165480 + (d * 48 | 0) + 28 >> 2] = s, k[A + 488 + 20 >> 2] | s & 1 || (b = ka(b, s) | 0, k[q >> 2] = b), (b | 0) > (f << 2 | 0) & ~s && (k[q >> 2] = (b | 0) / 2 | 0, k[h >> 2] = f << 1), b = j[284] | 0, Oe((k[t >> 2] | 0) + 12 | 0) | 0, j[284] = b, b = v, s = w, q = x, t = y) : (b = v, s = w, q = x, t = y)) : (b = v, s = w, q = x, t = y); else if ((u | 0) == 97) {
        if (n = k[A + 972 >> 2] | 0, n = n >>> 0 > 16 ? 16 : n, Ga(A + 1048 | 0, 1, n | 0, k[140] | 0) | 0, k[32932] = 0, n) {
         b = 0, f = 0, h = 0;
         do u = 1 << l[A + 1048 + h >> 0], b = ((u & f | 0) == 0 & 1) + b | 0, f = u | f, h = h + 1 | 0; while (h >>> 0 < n >>> 0 & b >>> 0 < 4);
         if (k[32932] = b, (f | 0) == 58) {
          k[A + 460 >> 2] = 17040133, f = b, u = 159;
          break;
         }
         if ((f | 0) == 56) {
          i[A + 460 >> 0] = i[587576] | 0, i[A + 460 + 1 >> 0] = i[587577] | 0, i[A + 460 + 2 >> 0] = i[587578] | 0, f = b, u = 159;
          break;
         }
         f = b, u = 159;
         break;
        }
        b = 0, n = 0, u = 161;
       } else if ((u | 0) == 112) u = 0, i[132032] = i[587600] | 0, i[132033] = i[587601] | 0, i[132034] = i[587602] | 0, i[132035] = i[587603] | 0, i[132036] = i[587604] | 0, b = v, s = w, q = x, t = y; else if ((u | 0) == 128) u = 0, kb(k[140] | 0, 40, 1) | 0, h = (rc() | 0) & 65535, j[65896] = h, h = (rc() | 0) & 65535, j[65916] = h, h = (rc() | 0) & 7, j[164] = h, h = (m[65896] | 0) - h | 0, h = h - ((rc() | 0) & 7) & 65535, j[65844] = h, h = (rc() | 0) & 7, j[168] = h, h = (m[65916] | 0) - h | 0, h = h - ((rc() | 0) & 7) & 65535, j[65840] = h, (j[65896] | 0) == 7262 && (j[65840] = 5444, j[65844] = 7244, j[164] = 7), kb(k[140] | 0, 52, 1) | 0, f = rc() | 0, k[33004] = f, f = rc() | 0, k[33005] = f, f = rc() | 0, k[33006] = f, kb(k[140] | 0, 114, 1) | 0, f = (((pc() | 0) & 65535) >>> 7) * 90 | 0, k[41352] = f, b = j[65844] | 0, h = j[65840] | 0, (ka((b & 65535) * 6 | 0, h & 65535) | 0) == (v | 0) && (((f >>> 0) % 180 | 0 | 0) == 90 ? (j[65840] = b, j[65844] = h, q = h) : (q = b, b = h), j[65896] = q, j[65916] = b, k[41352] = 0, k[80] = 0, j[168] = 0, j[164] = 0, h = b, b = q), h = ((ka(b & 65535, h & 65535) | 0) >>> 0) / 1e6 | 0, k[A + 408 >> 2] = h, eg(132096, 587616, A + 408 | 0), k[41268] = 17, k[80] | 0 && (j[164] & 1 && (k[80] = 1633771873), k[41268] = 18), k[32952] = 65535, b = v, s = w, q = x, t = y; else if ((u | 0) == 170) {
        if (u = 0, ka(f & 65535, b & 65535) | 0 || (j[66133] = 1, j[66132] = 1, f = 1, b = 1), ka(f & 65535, b & 65535) | 0) {
         b = 0;
         do h = ~~+tc(k[A + 964 >> 2] | 0) & 65535, j[132256 + (b + 6 << 1) >> 1] = h, b = b + 1 | 0; while ((b | 0) < (ka(m[66133] | 0, m[66132] | 0) | 0));
        }
        k[32950] = 0, b = v, s = w, q = x, t = y;
       } while (0);
       if ((u | 0) == 159) if (f) {
        b = 0;
        do i[A + 1064 + (l[A + 460 + b >> 0] | 0) >> 0] = b, b = b + 1 | 0; while ((b | 0) != (f | 0));
        b = f, u = 161;
       } else b = 0, u = 161;
       if ((u | 0) == 161) {
        for (u = 0, i[166680 + b >> 0] = 0, b = k[80] | 0, f = 15; ;) {
         if (b = l[A + 1064 + (l[A + 1048 + ((f >>> 0) % (n >>> 0) | 0) >> 0] | 0) >> 0] | b << 2, !f) break;
         f = f + -1 | 0;
        }
        k[80] = b - ((b | 0) == 0 & 1), b = v, s = w, q = x, t = y;
       }
       if (kb(k[140] | 0, k[A + 968 >> 2] | 0, 0) | 0, !z) break;
       v = b, w = s, x = q, y = t;
      }
      q && (f = ug(q) | 0, f && (kb(k[140] | 0, t | 0, 0) | 0, Ga(f | 0, q | 0, 1, k[140] | 0) | 0, Jd(f, q >>> 2, 1, s), b = k[140] | 0, d = Ob() | 0, k[140] = d, d && (Hb(f | 0, q | 0, 1, d | 0) | 0, kb(k[140] | 0, 0, 0) | 0, Ge(0 - t | 0) | 0, pb(k[140] | 0) | 0), k[140] = b, vg(f)));
     } else e = 0;
     if (n = k[32932] | 0) {
      d = 0;
      do {
       c = +p[A + 192 + (d << 3) >> 3], b = 0;
       do a = A + 256 + (d << 5) + (b << 3) | 0, p[a >> 3] = c * +p[a >> 3], b = b + 1 | 0; while ((b | 0) != (n | 0));
       d = d + 1 | 0;
      } while ((d | 0) != (n | 0));
     }
     if (h = (e | 0) != 0) {
      if (n) {
       d = 0;
       do {
        e = 0;
        do {
         b = A + 96 + (d * 24 | 0) + (e << 3) | 0, p[b >> 3] = 0, c = +p[A + 384 + (e << 3) >> 3], g = 0, f = 0;
         do g += +p[A + 256 + (d << 5) + (f << 3) >> 3] * +p[A + (f * 24 | 0) + (e << 3) >> 3] * c, f = f + 1 | 0; while ((f | 0) != (n | 0));
         p[b >> 3] = g, e = e + 1 | 0;
        } while ((e | 0) != 3);
        d = d + 1 | 0;
       } while ((d | 0) != (n | 0));
      }
      oe(165960, A + 96 | 0);
     }
     c = +p[A + 224 >> 3];
     b: do if (c != 0 && (o[33007] = 0, n)) for (b = 0; ;) {
      if (o[132016 + (b << 2) >> 2] = 1 / c, b = b + 1 | 0, (b | 0) == (n | 0)) break b;
      c = +p[A + 224 + (b << 3) >> 3];
     } while (0);
     if (h | (n | 0) == 0) b = 0; else {
      b = 0;
      do a = 131648 + (b << 2) | 0, o[a >> 2] = +o[a >> 2] / +p[A + 256 + (b << 5) + (b << 3) >> 3], b = b + 1 | 0; while ((b | 0) != (n | 0));
      b = 0;
     }
    }
   }
   return r = A, b | 0;
  }
  function ug(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0;
   do if (a >>> 0 < 245) {
    if (n = a >>> 0 < 11 ? 16 : a + 11 & -8, f = k[157564] | 0, f >>> (n >>> 3) & 3) {
     a = (f >>> (n >>> 3) & 1 ^ 1) + (n >>> 3) << 1, b = k[630296 + (a + 2 << 2) >> 2] | 0, c = k[b + 8 >> 2] | 0;
     do if ((630296 + (a << 2) | 0) == (c | 0)) k[157564] = f & ~(1 << (f >>> (n >>> 3) & 1 ^ 1) + (n >>> 3)); else {
      if (c >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[c + 12 >> 2] | 0) == (b | 0)) {
       k[c + 12 >> 2] = 630296 + (a << 2), k[630296 + (a + 2 << 2) >> 2] = c;
       break;
      }
      Fb();
     } while (0);
     return A = (f >>> (n >>> 3) & 1 ^ 1) + (n >>> 3) << 3, k[b + 4 >> 2] = A | 3, k[b + (A | 4) >> 2] = k[b + (A | 4) >> 2] | 1, A = b + 8 | 0, A | 0;
    }
    if (d = k[157566] | 0, n >>> 0 > d >>> 0) {
     if (f >>> (n >>> 3)) {
      a = f >>> (n >>> 3) << (n >>> 3) & (2 << (n >>> 3) | 0 - (2 << (n >>> 3))), e = ((a & 0 - a) + -1 | 0) >>> (((a & 0 - a) + -1 | 0) >>> 12 & 16), c = e >>> (e >>> 5 & 8) >>> (e >>> (e >>> 5 & 8) >>> 2 & 4), c = (e >>> 5 & 8 | ((a & 0 - a) + -1 | 0) >>> 12 & 16 | e >>> (e >>> 5 & 8) >>> 2 & 4 | c >>> 1 & 2 | c >>> (c >>> 1 & 2) >>> 1 & 1) + (c >>> (c >>> 1 & 2) >>> (c >>> (c >>> 1 & 2) >>> 1 & 1)) | 0, e = k[630296 + ((c << 1) + 2 << 2) >> 2] | 0, a = k[e + 8 >> 2] | 0;
      do if ((630296 + (c << 1 << 2) | 0) == (a | 0)) k[157564] = f & ~(1 << c), b = d; else {
       if (a >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[a + 12 >> 2] | 0) == (e | 0)) {
        k[a + 12 >> 2] = 630296 + (c << 1 << 2), k[630296 + ((c << 1) + 2 << 2) >> 2] = a, b = k[157566] | 0;
        break;
       }
       Fb();
      } while (0);
      return k[e + 4 >> 2] = n | 3, k[e + (n | 4) >> 2] = (c << 3) - n | 1, k[e + (c << 3) >> 2] = (c << 3) - n, b && (d = k[157569] | 0, b >>>= 3, a = k[157564] | 0, a & 1 << b ? (a = k[630296 + ((b << 1) + 2 << 2) >> 2] | 0, a >>> 0 < (k[157568] | 0) >>> 0 ? Fb() : (g = 630296 + ((b << 1) + 2 << 2) | 0, h = a)) : (k[157564] = a | 1 << b, g = 630296 + ((b << 1) + 2 << 2) | 0, h = 630296 + (b << 1 << 2) | 0), k[g >> 2] = d, k[h + 12 >> 2] = d, k[d + 8 >> 2] = h, k[d + 12 >> 2] = 630296 + (b << 1 << 2)), k[157566] = (c << 3) - n, k[157569] = e + n, A = e + 8 | 0, A | 0;
     }
     if (a = k[157565] | 0) {
      for (h = ((a & 0 - a) + -1 | 0) >>> (((a & 0 - a) + -1 | 0) >>> 12 & 16), i = h >>> (h >>> 5 & 8) >>> (h >>> (h >>> 5 & 8) >>> 2 & 4), i = k[630560 + ((h >>> 5 & 8 | ((a & 0 - a) + -1 | 0) >>> 12 & 16 | h >>> (h >>> 5 & 8) >>> 2 & 4 | i >>> 1 & 2 | i >>> (i >>> 1 & 2) >>> 1 & 1) + (i >>> (i >>> 1 & 2) >>> (i >>> (i >>> 1 & 2) >>> 1 & 1)) << 2) >> 2] | 0, h = (k[i + 4 >> 2] & -8) - n | 0, d = i; ;) {
       if (a = k[d + 16 >> 2] | 0, !a && (a = k[d + 20 >> 2] | 0, !a)) break;
       d = (k[a + 4 >> 2] & -8) - n | 0, A = d >>> 0 < h >>> 0, h = A ? d : h, d = a, i = A ? a : i;
      }
      e = k[157568] | 0, i >>> 0 < e >>> 0 && Fb(), g = i + n | 0, i >>> 0 >= g >>> 0 && Fb(), f = k[i + 24 >> 2] | 0, a = k[i + 12 >> 2] | 0;
      do if ((a | 0) == (i | 0)) {
       if (d = i + 20 | 0, a = k[d >> 2] | 0, !a && (d = i + 16 | 0, a = k[d >> 2] | 0, !a)) {
        j = 0;
        break;
       }
       for (;;) if (b = a + 20 | 0, c = k[b >> 2] | 0) a = c, d = b; else {
        if (b = a + 16 | 0, c = k[b >> 2] | 0, !c) break;
        a = c, d = b;
       }
       if (!(d >>> 0 < e >>> 0)) {
        k[d >> 2] = 0, j = a;
        break;
       }
       Fb();
      } else {
       if (d = k[i + 8 >> 2] | 0, d >>> 0 < e >>> 0 && Fb(), (k[d + 12 >> 2] | 0) != (i | 0) && Fb(), (k[a + 8 >> 2] | 0) == (i | 0)) {
        k[d + 12 >> 2] = a, k[a + 8 >> 2] = d, j = a;
        break;
       }
       Fb();
      } while (0);
      do if (f) {
       if (a = k[i + 28 >> 2] | 0, (i | 0) == (k[630560 + (a << 2) >> 2] | 0)) {
        if (k[630560 + (a << 2) >> 2] = j, !j) {
         k[157565] = k[157565] & ~(1 << a);
         break;
        }
       } else if (f >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[f + 16 >> 2] | 0) == (i | 0) ? k[f + 16 >> 2] = j : k[f + 20 >> 2] = j, !j) break;
       d = k[157568] | 0, j >>> 0 < d >>> 0 && Fb(), k[j + 24 >> 2] = f, a = k[i + 16 >> 2] | 0;
       do if (a) {
        if (!(a >>> 0 < d >>> 0)) {
         k[j + 16 >> 2] = a, k[a + 24 >> 2] = j;
         break;
        }
        Fb();
       } while (0);
       if (a = k[i + 20 >> 2] | 0) {
        if (!(a >>> 0 < (k[157568] | 0) >>> 0)) {
         k[j + 20 >> 2] = a, k[a + 24 >> 2] = j;
         break;
        }
        Fb();
       }
      } while (0);
      return h >>> 0 < 16 ? (A = h + n | 0, k[i + 4 >> 2] = A | 3, A = i + (A + 4) | 0, k[A >> 2] = k[A >> 2] | 1) : (k[i + 4 >> 2] = n | 3, k[i + (n | 4) >> 2] = h | 1, k[i + (h + n) >> 2] = h, b = k[157566] | 0, b && (c = k[157569] | 0, a = k[157564] | 0, a & 1 << (b >>> 3) ? (a = k[630296 + ((b >>> 3 << 1) + 2 << 2) >> 2] | 0, a >>> 0 < (k[157568] | 0) >>> 0 ? Fb() : (l = 630296 + ((b >>> 3 << 1) + 2 << 2) | 0, m = a)) : (k[157564] = a | 1 << (b >>> 3), l = 630296 + ((b >>> 3 << 1) + 2 << 2) | 0, m = 630296 + (b >>> 3 << 1 << 2) | 0), k[l >> 2] = c, k[m + 12 >> 2] = c, k[c + 8 >> 2] = m, k[c + 12 >> 2] = 630296 + (b >>> 3 << 1 << 2)), k[157566] = h, k[157569] = g), A = i + 8 | 0, A | 0;
     }
     r = n;
    } else r = n;
   } else if (a >>> 0 > 4294967231) r = -1; else if (j = a + 11 & -8, h = k[157565] | 0) {
    (a + 11 | 0) >>> 8 ? j >>> 0 > 16777215 ? g = 31 : (g = (a + 11 | 0) >>> 8 << ((((a + 11 | 0) >>> 8) + 1048320 | 0) >>> 16 & 8), g = 14 - ((g + 520192 | 0) >>> 16 & 4 | (((a + 11 | 0) >>> 8) + 1048320 | 0) >>> 16 & 8 | ((g << ((g + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) + (g << ((g + 520192 | 0) >>> 16 & 4) << (((g << ((g + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) >>> 15) | 0, g = j >>> (g + 7 | 0) & 1 | g << 1) : g = 0, a = k[630560 + (g << 2) >> 2] | 0;
    a: do if (a) for (d = 0 - j | 0, b = 0, f = j << ((g | 0) == 31 ? 0 : 25 - (g >>> 1) | 0), e = a, a = 0; ;) {
     if (c = k[e + 4 >> 2] & -8, (c - j | 0) >>> 0 < d >>> 0) {
      if ((c | 0) == (j | 0)) {
       d = c - j | 0, c = e, a = e, s = 90;
       break a;
      }
      d = c - j | 0, a = e;
     }
     if (s = k[e + 20 >> 2] | 0, e = k[e + 16 + (f >>> 31 << 2) >> 2] | 0, b = (s | 0) == 0 | (s | 0) == (e | 0) ? b : s, !e) {
      s = 86;
      break;
     }
     f <<= 1;
    } else d = 0 - j | 0, b = 0, a = 0, s = 86; while (0);
    if ((s | 0) == 86) {
     if ((b | 0) == 0 & (a | 0) == 0) {
      if (a = 2 << g, !(h & (a | 0 - a))) {
       r = j;
       break;
      }
      r = (h & (a | 0 - a) & 0 - (h & (a | 0 - a))) + -1 | 0, a = r >>> (r >>> 12 & 16) >>> (r >>> (r >>> 12 & 16) >>> 5 & 8), b = a >>> (a >>> 2 & 4) >>> (a >>> (a >>> 2 & 4) >>> 1 & 2), b = k[630560 + ((r >>> (r >>> 12 & 16) >>> 5 & 8 | r >>> 12 & 16 | a >>> 2 & 4 | a >>> (a >>> 2 & 4) >>> 1 & 2 | b >>> 1 & 1) + (b >>> (b >>> 1 & 1)) << 2) >> 2] | 0, a = 0;
     }
     b ? (c = b, s = 90) : (i = d, g = a);
    }
    if ((s | 0) == 90) for (;;) if (s = 0, r = (k[c + 4 >> 2] & -8) - j | 0, b = r >>> 0 < d >>> 0, d = b ? r : d, a = b ? c : a, b = k[c + 16 >> 2] | 0) c = b, s = 90; else {
     if (c = k[c + 20 >> 2] | 0, !c) {
      i = d, g = a;
      break;
     }
     s = 90;
    }
    if (g) {
     if (i >>> 0 < ((k[157566] | 0) - j | 0) >>> 0) {
      e = k[157568] | 0, g >>> 0 < e >>> 0 && Fb(), h = g + j | 0, g >>> 0 >= h >>> 0 && Fb(), f = k[g + 24 >> 2] | 0, a = k[g + 12 >> 2] | 0;
      do if ((a | 0) == (g | 0)) {
       if (d = g + 20 | 0, a = k[d >> 2] | 0, !a && (d = g + 16 | 0, a = k[d >> 2] | 0, !a)) {
        n = 0;
        break;
       }
       for (;;) if (b = a + 20 | 0, c = k[b >> 2] | 0) a = c, d = b; else {
        if (b = a + 16 | 0, c = k[b >> 2] | 0, !c) break;
        a = c, d = b;
       }
       if (!(d >>> 0 < e >>> 0)) {
        k[d >> 2] = 0, n = a;
        break;
       }
       Fb();
      } else {
       if (d = k[g + 8 >> 2] | 0, d >>> 0 < e >>> 0 && Fb(), (k[d + 12 >> 2] | 0) != (g | 0) && Fb(), (k[a + 8 >> 2] | 0) == (g | 0)) {
        k[d + 12 >> 2] = a, k[a + 8 >> 2] = d, n = a;
        break;
       }
       Fb();
      } while (0);
      do if (f) {
       if (a = k[g + 28 >> 2] | 0, (g | 0) == (k[630560 + (a << 2) >> 2] | 0)) {
        if (k[630560 + (a << 2) >> 2] = n, !n) {
         k[157565] = k[157565] & ~(1 << a);
         break;
        }
       } else if (f >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[f + 16 >> 2] | 0) == (g | 0) ? k[f + 16 >> 2] = n : k[f + 20 >> 2] = n, !n) break;
       d = k[157568] | 0, n >>> 0 < d >>> 0 && Fb(), k[n + 24 >> 2] = f, a = k[g + 16 >> 2] | 0;
       do if (a) {
        if (!(a >>> 0 < d >>> 0)) {
         k[n + 16 >> 2] = a, k[a + 24 >> 2] = n;
         break;
        }
        Fb();
       } while (0);
       if (a = k[g + 20 >> 2] | 0) {
        if (!(a >>> 0 < (k[157568] | 0) >>> 0)) {
         k[n + 20 >> 2] = a, k[a + 24 >> 2] = n;
         break;
        }
        Fb();
       }
      } while (0);
      b: do if (i >>> 0 < 16) A = i + j | 0, k[g + 4 >> 2] = A | 3, A = g + (A + 4) | 0, k[A >> 2] = k[A >> 2] | 1; else {
       if (k[g + 4 >> 2] = j | 3, k[g + (j | 4) >> 2] = i | 1, k[g + (i + j) >> 2] = i, d = i >>> 3, i >>> 0 < 256) {
        a = k[157564] | 0, a & 1 << d ? (a = k[630296 + ((d << 1) + 2 << 2) >> 2] | 0, a >>> 0 < (k[157568] | 0) >>> 0 ? Fb() : (o = 630296 + ((d << 1) + 2 << 2) | 0, p = a)) : (k[157564] = a | 1 << d, o = 630296 + ((d << 1) + 2 << 2) | 0, p = 630296 + (d << 1 << 2) | 0), k[o >> 2] = h, k[p + 12 >> 2] = h, k[g + (j + 8) >> 2] = p, k[g + (j + 12) >> 2] = 630296 + (d << 1 << 2);
        break;
       }
       if (a = i >>> 8, a ? i >>> 0 > 16777215 ? d = 31 : (d = a << ((a + 1048320 | 0) >>> 16 & 8) << (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4), d = 14 - (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (a + 1048320 | 0) >>> 16 & 8 | (d + 245760 | 0) >>> 16 & 2) + (d << ((d + 245760 | 0) >>> 16 & 2) >>> 15) | 0, d = i >>> (d + 7 | 0) & 1 | d << 1) : d = 0, a = 630560 + (d << 2) | 0, k[g + (j + 28) >> 2] = d, k[g + (j + 20) >> 2] = 0, k[g + (j + 16) >> 2] = 0, b = k[157565] | 0, c = 1 << d, !(b & c)) {
        k[157565] = b | c, k[a >> 2] = h, k[g + (j + 24) >> 2] = a, k[g + (j + 12) >> 2] = h, k[g + (j + 8) >> 2] = h;
        break;
       }
       a = k[a >> 2] | 0;
       c: do if ((k[a + 4 >> 2] & -8 | 0) == (i | 0)) q = a; else {
        for (d = i << ((d | 0) == 31 ? 0 : 25 - (d >>> 1) | 0); ;) {
         if (c = a + 16 + (d >>> 31 << 2) | 0, b = k[c >> 2] | 0, !b) break;
         if ((k[b + 4 >> 2] & -8 | 0) == (i | 0)) {
          q = b;
          break c;
         }
         d <<= 1, a = b;
        }
        if (!(c >>> 0 < (k[157568] | 0) >>> 0)) {
         k[c >> 2] = h, k[g + (j + 24) >> 2] = a, k[g + (j + 12) >> 2] = h, k[g + (j + 8) >> 2] = h;
         break b;
        }
        Fb();
       } while (0);
       if (a = q + 8 | 0, b = k[a >> 2] | 0, A = k[157568] | 0, b >>> 0 >= A >>> 0 & q >>> 0 >= A >>> 0) {
        k[b + 12 >> 2] = h, k[a >> 2] = h, k[g + (j + 8) >> 2] = b, k[g + (j + 12) >> 2] = q, k[g + (j + 24) >> 2] = 0;
        break;
       }
       Fb();
      } while (0);
      return A = g + 8 | 0, A | 0;
     }
     r = j;
    } else r = j;
   } else r = j; while (0);
   if (d = k[157566] | 0, d >>> 0 >= r >>> 0) return a = d - r | 0, b = k[157569] | 0, a >>> 0 > 15 ? (k[157569] = b + r, k[157566] = a, k[b + (r + 4) >> 2] = a | 1, k[b + d >> 2] = a, k[b + 4 >> 2] = r | 3) : (k[157566] = 0, k[157569] = 0, k[b + 4 >> 2] = d | 3, k[b + (d + 4) >> 2] = k[b + (d + 4) >> 2] | 1), A = b + 8 | 0, A | 0;
   if (a = k[157567] | 0, a >>> 0 > r >>> 0) return z = a - r | 0, k[157567] = z, A = k[157570] | 0, k[157570] = A + r, k[A + (r + 4) >> 2] = z | 1, k[A + 4 >> 2] = r | 3, A = A + 8 | 0, A | 0;
   do if (!(k[157682] | 0)) {
    if (a = db(30) | 0, !(a + -1 & a)) {
     k[157684] = a, k[157683] = a, k[157685] = -1, k[157686] = -1, k[157687] = 0, k[157675] = 0, q = (Ta(0) | 0) & -16 ^ 1431655768, k[157682] = q;
     break;
    }
    Fb();
   } while (0);
   if (h = r + 48 | 0, c = k[157684] | 0, i = r + 47 | 0, g = c + i & 0 - c, g >>> 0 <= r >>> 0) return A = 0, A | 0;
   if (a = k[157674] | 0, a && (q = k[157672] | 0, (q + g | 0) >>> 0 <= q >>> 0 | (q + g | 0) >>> 0 > a >>> 0)) return A = 0, A | 0;
   d: do if (k[157675] & 4) a = 0, s = 191; else {
    b = k[157570] | 0;
    e: do if (b) {
     for (a = 630704; ;) {
      if (d = k[a >> 2] | 0, d >>> 0 <= b >>> 0 && (e = a + 4 | 0, (d + (k[e >> 2] | 0) | 0) >>> 0 > b >>> 0)) break;
      if (a = k[a + 8 >> 2] | 0, !a) {
       s = 174;
       break e;
      }
     }
     if (d = c + i - (k[157567] | 0) & 0 - c, d >>> 0 < 2147483647) if (b = _a(d | 0) | 0, q = (b | 0) == ((k[a >> 2] | 0) + (k[e >> 2] | 0) | 0), a = q ? d : 0, q) {
      if ((b | 0) != -1) {
       f = b, q = a, s = 194;
       break d;
      }
     } else f = b, s = 184; else a = 0;
    } else s = 174; while (0);
    do if ((s | 0) == 174) if (e = _a(0) | 0, (e | 0) == -1) a = 0; else if (a = k[157683] | 0, d = a + -1 & e ? g - e + (a + -1 + e & 0 - a) | 0 : g, a = k[157672] | 0, b = a + d | 0, d >>> 0 > r >>> 0 & d >>> 0 < 2147483647) {
     if (c = k[157674] | 0, c && b >>> 0 <= a >>> 0 | b >>> 0 > c >>> 0) {
      a = 0;
      break;
     }
     if (b = _a(d | 0) | 0, a = (b | 0) == (e | 0) ? d : 0, (b | 0) == (e | 0)) {
      f = e, q = a, s = 194;
      break d;
     }
     f = b, s = 184;
    } else a = 0; while (0);
    f: do if ((s | 0) == 184) {
     c = 0 - d | 0;
     do if (h >>> 0 > d >>> 0 & (d >>> 0 < 2147483647 & (f | 0) != -1) && (b = k[157684] | 0, b = i - d + b & 0 - b, b >>> 0 < 2147483647)) {
      if ((_a(b | 0) | 0) == -1) {
       _a(c | 0) | 0;
       break f;
      }
      d = b + d | 0;
      break;
     } while (0);
     if ((f | 0) != -1) {
      q = d, s = 194;
      break d;
     }
    } while (0);
    k[157675] = k[157675] | 4, s = 191;
   } while (0);
   if ((s | 0) == 191 && g >>> 0 < 2147483647 && (d = _a(g | 0) | 0, b = _a(0) | 0, d >>> 0 < b >>> 0 & ((d | 0) != -1 & (b | 0) != -1) && (c = (b - d | 0) >>> 0 > (r + 40 | 0) >>> 0, c && (f = d, q = c ? b - d | 0 : a, s = 194))), (s | 0) == 194) {
    a = (k[157672] | 0) + q | 0, k[157672] = a, a >>> 0 > (k[157673] | 0) >>> 0 && (k[157673] = a), h = k[157570] | 0;
    g: do if (h) {
     a = 630704;
     do {
      if (d = k[a >> 2] | 0, b = a + 4 | 0, c = k[b >> 2] | 0, (f | 0) == (d + c | 0)) {
       s = 204;
       break;
      }
      a = k[a + 8 >> 2] | 0;
     } while ((a | 0) != 0);
     if ((s | 0) == 204 && !(k[a + 12 >> 2] & 8) && h >>> 0 < f >>> 0 & h >>> 0 >= d >>> 0) {
      k[b >> 2] = c + q, A = (k[157567] | 0) + q | 0, z = (h + 8 & 7 | 0) == 0 ? 0 : 0 - (h + 8) & 7, k[157570] = h + z, k[157567] = A - z, k[h + (z + 4) >> 2] = A - z | 1, k[h + (A + 4) >> 2] = 40, k[157571] = k[157686];
      break;
     }
     for (a = k[157568] | 0, f >>> 0 < a >>> 0 ? (k[157568] = f, m = f) : m = a, d = f + q | 0, a = 630704; ;) {
      if ((k[a >> 2] | 0) == (d | 0)) {
       s = 212;
       break;
      }
      if (a = k[a + 8 >> 2] | 0, !a) {
       a = 630704;
       break;
      }
     }
     if ((s | 0) == 212) {
      if (!(k[a + 12 >> 2] & 8)) {
       k[a >> 2] = f, o = a + 4 | 0, k[o >> 2] = (k[o >> 2] | 0) + q, o = f + 8 | 0, o = (o & 7 | 0) == 0 ? 0 : 0 - o & 7, j = f + (q + 8) | 0, j = (j & 7 | 0) == 0 ? 0 : 0 - j & 7, a = f + (j + q) | 0, n = o + r | 0, p = f + n | 0, l = a - (f + o) - r | 0, k[f + (o + 4) >> 2] = r | 3;
       h: do if ((a | 0) == (h | 0)) A = (k[157567] | 0) + l | 0, k[157567] = A, k[157570] = p, k[f + (n + 4) >> 2] = A | 1; else {
        if ((a | 0) == (k[157569] | 0)) {
         A = (k[157566] | 0) + l | 0, k[157566] = A, k[157569] = p, k[f + (n + 4) >> 2] = A | 1, k[f + (A + n) >> 2] = A;
         break;
        }
        if (h = q + 4 | 0, i = k[f + (h + j) >> 2] | 0, (i & 3 | 0) == 1) {
         i: do if (i >>> 0 < 256) {
          d = k[f + ((j | 8) + q) >> 2] | 0, b = k[f + (q + 12 + j) >> 2] | 0;
          do if ((d | 0) != (630296 + (i >>> 3 << 1 << 2) | 0)) {
           if (d >>> 0 < m >>> 0 && Fb(), (k[d + 12 >> 2] | 0) == (a | 0)) break;
           Fb();
          } while (0);
          if ((b | 0) == (d | 0)) {
           k[157564] = k[157564] & ~(1 << (i >>> 3));
           break;
          }
          do if ((b | 0) == (630296 + (i >>> 3 << 1 << 2) | 0)) v = b + 8 | 0; else {
           if (b >>> 0 < m >>> 0 && Fb(), (k[b + 8 >> 2] | 0) == (a | 0)) {
            v = b + 8 | 0;
            break;
           }
           Fb();
          } while (0);
          k[d + 12 >> 2] = b, k[v >> 2] = d;
         } else {
          g = k[f + ((j | 24) + q) >> 2] | 0, d = k[f + (q + 12 + j) >> 2] | 0;
          do if ((d | 0) == (a | 0)) {
           if (b = f + (h + (j | 16)) | 0, d = k[b >> 2] | 0, !d && (b = f + ((j | 16) + q) | 0, d = k[b >> 2] | 0, !d)) {
            x = 0;
            break;
           }
           for (;;) if (c = d + 20 | 0, e = k[c >> 2] | 0) d = e, b = c; else {
            if (c = d + 16 | 0, e = k[c >> 2] | 0, !e) break;
            d = e, b = c;
           }
           if (!(b >>> 0 < m >>> 0)) {
            k[b >> 2] = 0, x = d;
            break;
           }
           Fb();
          } else {
           if (b = k[f + ((j | 8) + q) >> 2] | 0, b >>> 0 < m >>> 0 && Fb(), (k[b + 12 >> 2] | 0) != (a | 0) && Fb(), (k[d + 8 >> 2] | 0) == (a | 0)) {
            k[b + 12 >> 2] = d, k[d + 8 >> 2] = b, x = d;
            break;
           }
           Fb();
          } while (0);
          if (!g) break;
          d = k[f + (q + 28 + j) >> 2] | 0;
          do {
           if ((a | 0) == (k[630560 + (d << 2) >> 2] | 0)) {
            if (k[630560 + (d << 2) >> 2] = x, x) break;
            k[157565] = k[157565] & ~(1 << d);
            break i;
           }
           if (g >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[g + 16 >> 2] | 0) == (a | 0) ? k[g + 16 >> 2] = x : k[g + 20 >> 2] = x, !x) break i;
          } while (0);
          d = k[157568] | 0, x >>> 0 < d >>> 0 && Fb(), k[x + 24 >> 2] = g, a = k[f + ((j | 16) + q) >> 2] | 0;
          do if (a) {
           if (!(a >>> 0 < d >>> 0)) {
            k[x + 16 >> 2] = a, k[a + 24 >> 2] = x;
            break;
           }
           Fb();
          } while (0);
          if (a = k[f + (h + (j | 16)) >> 2] | 0, !a) break;
          if (!(a >>> 0 < (k[157568] | 0) >>> 0)) {
           k[x + 20 >> 2] = a, k[a + 24 >> 2] = x;
           break;
          }
          Fb();
         } while (0);
         a = f + ((i & -8 | j) + q) | 0, e = (i & -8) + l | 0;
        } else e = l;
        if (d = a + 4 | 0, k[d >> 2] = k[d >> 2] & -2, k[f + (n + 4) >> 2] = e | 1, k[f + (e + n) >> 2] = e, d = e >>> 3, e >>> 0 < 256) {
         a = k[157564] | 0;
         do if (a & 1 << d) {
          if (a = k[630296 + ((d << 1) + 2 << 2) >> 2] | 0, a >>> 0 >= (k[157568] | 0) >>> 0) {
           y = 630296 + ((d << 1) + 2 << 2) | 0, z = a;
           break;
          }
          Fb();
         } else k[157564] = a | 1 << d, y = 630296 + ((d << 1) + 2 << 2) | 0, z = 630296 + (d << 1 << 2) | 0; while (0);
         k[y >> 2] = p, k[z + 12 >> 2] = p, k[f + (n + 8) >> 2] = z, k[f + (n + 12) >> 2] = 630296 + (d << 1 << 2);
         break;
        }
        a = e >>> 8;
        do if (a) {
         if (e >>> 0 > 16777215) {
          c = 31;
          break;
         }
         c = a << ((a + 1048320 | 0) >>> 16 & 8) << (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4), c = 14 - (((a << ((a + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (a + 1048320 | 0) >>> 16 & 8 | (c + 245760 | 0) >>> 16 & 2) + (c << ((c + 245760 | 0) >>> 16 & 2) >>> 15) | 0, c = e >>> (c + 7 | 0) & 1 | c << 1;
        } else c = 0; while (0);
        if (a = 630560 + (c << 2) | 0, k[f + (n + 28) >> 2] = c, k[f + (n + 20) >> 2] = 0, k[f + (n + 16) >> 2] = 0, d = k[157565] | 0, b = 1 << c, !(d & b)) {
         k[157565] = d | b, k[a >> 2] = p, k[f + (n + 24) >> 2] = a, k[f + (n + 12) >> 2] = p, k[f + (n + 8) >> 2] = p;
         break;
        }
        a = k[a >> 2] | 0;
        j: do if ((k[a + 4 >> 2] & -8 | 0) == (e | 0)) A = a; else {
         for (c = e << ((c | 0) == 31 ? 0 : 25 - (c >>> 1) | 0); ;) {
          if (b = a + 16 + (c >>> 31 << 2) | 0, d = k[b >> 2] | 0, !d) break;
          if ((k[d + 4 >> 2] & -8 | 0) == (e | 0)) {
           A = d;
           break j;
          }
          c <<= 1, a = d;
         }
         if (!(b >>> 0 < (k[157568] | 0) >>> 0)) {
          k[b >> 2] = p, k[f + (n + 24) >> 2] = a, k[f + (n + 12) >> 2] = p, k[f + (n + 8) >> 2] = p;
          break h;
         }
         Fb();
        } while (0);
        if (a = A + 8 | 0, b = k[a >> 2] | 0, z = k[157568] | 0, b >>> 0 >= z >>> 0 & A >>> 0 >= z >>> 0) {
         k[b + 12 >> 2] = p, k[a >> 2] = p, k[f + (n + 8) >> 2] = b, k[f + (n + 12) >> 2] = A, k[f + (n + 24) >> 2] = 0;
         break;
        }
        Fb();
       } while (0);
       return A = f + (o | 8) | 0, A | 0;
      }
      a = 630704;
     }
     for (;;) {
      if (d = k[a >> 2] | 0, d >>> 0 <= h >>> 0 && (b = k[a + 4 >> 2] | 0, (d + b | 0) >>> 0 > h >>> 0)) break;
      a = k[a + 8 >> 2] | 0;
     }
     if (e = d + (b + -47 + ((d + (b + -39) & 7 | 0) == 0 ? 0 : 0 - (d + (b + -39)) & 7)) | 0, e = e >>> 0 < (h + 16 | 0) >>> 0 ? h : e, A = f + 8 | 0, A = (A & 7 | 0) == 0 ? 0 : 0 - A & 7, z = q + -40 - A | 0, k[157570] = f + A, k[157567] = z, k[f + (A + 4) >> 2] = z | 1, k[f + (q + -36) >> 2] = 40, k[157571] = k[157686], k[e + 4 >> 2] = 27, k[e + 8 >> 2] = k[157676], k[e + 8 + 4 >> 2] = k[157677], k[e + 8 + 8 >> 2] = k[157678], k[e + 8 + 12 >> 2] = k[157679], k[157676] = f, k[157677] = q, k[157679] = 0, k[157678] = e + 8, k[e + 28 >> 2] = 7, (e + 32 | 0) >>> 0 < (d + b | 0) >>> 0) {
      a = e + 28 | 0;
      do A = a, a = a + 4 | 0, k[a >> 2] = 7; while ((A + 8 | 0) >>> 0 < (d + b | 0) >>> 0);
     }
     if ((e | 0) != (h | 0)) {
      if (k[e + 4 >> 2] = k[e + 4 >> 2] & -2, k[h + 4 >> 2] = e - h | 1, k[e >> 2] = e - h, (e - h | 0) >>> 0 < 256) {
       a = k[157564] | 0, a & 1 << ((e - h | 0) >>> 3) ? (a = k[630296 + (((e - h | 0) >>> 3 << 1) + 2 << 2) >> 2] | 0, a >>> 0 < (k[157568] | 0) >>> 0 ? Fb() : (t = 630296 + (((e - h | 0) >>> 3 << 1) + 2 << 2) | 0, u = a)) : (k[157564] = a | 1 << ((e - h | 0) >>> 3), t = 630296 + (((e - h | 0) >>> 3 << 1) + 2 << 2) | 0, u = 630296 + ((e - h | 0) >>> 3 << 1 << 2) | 0), k[t >> 2] = h, k[u + 12 >> 2] = h, k[h + 8 >> 2] = u, k[h + 12 >> 2] = 630296 + ((e - h | 0) >>> 3 << 1 << 2);
       break;
      }
      if ((e - h | 0) >>> 8 ? (e - h | 0) >>> 0 > 16777215 ? d = 31 : (d = (e - h | 0) >>> 8 << ((((e - h | 0) >>> 8) + 1048320 | 0) >>> 16 & 8), d = 14 - ((d + 520192 | 0) >>> 16 & 4 | (((e - h | 0) >>> 8) + 1048320 | 0) >>> 16 & 8 | ((d << ((d + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) + (d << ((d + 520192 | 0) >>> 16 & 4) << (((d << ((d + 520192 | 0) >>> 16 & 4)) + 245760 | 0) >>> 16 & 2) >>> 15) | 0, d = (e - h | 0) >>> (d + 7 | 0) & 1 | d << 1) : d = 0, a = 630560 + (d << 2) | 0, k[h + 28 >> 2] = d, k[h + 20 >> 2] = 0, k[h + 16 >> 2] = 0, b = k[157565] | 0, c = 1 << d, !(b & c)) {
       k[157565] = b | c, k[a >> 2] = h, k[h + 24 >> 2] = a, k[h + 12 >> 2] = h, k[h + 8 >> 2] = h;
       break;
      }
      a = k[a >> 2] | 0;
      k: do if ((k[a + 4 >> 2] & -8 | 0) == (e - h | 0)) w = a; else {
       for (d = e - h << ((d | 0) == 31 ? 0 : 25 - (d >>> 1) | 0); ;) {
        if (c = a + 16 + (d >>> 31 << 2) | 0, b = k[c >> 2] | 0, !b) break;
        if ((k[b + 4 >> 2] & -8 | 0) == (e - h | 0)) {
         w = b;
         break k;
        }
        d <<= 1, a = b;
       }
       if (!(c >>> 0 < (k[157568] | 0) >>> 0)) {
        k[c >> 2] = h, k[h + 24 >> 2] = a, k[h + 12 >> 2] = h, k[h + 8 >> 2] = h;
        break g;
       }
       Fb();
      } while (0);
      if (a = w + 8 | 0, b = k[a >> 2] | 0, A = k[157568] | 0, b >>> 0 >= A >>> 0 & w >>> 0 >= A >>> 0) {
       k[b + 12 >> 2] = h, k[a >> 2] = h, k[h + 8 >> 2] = b, k[h + 12 >> 2] = w, k[h + 24 >> 2] = 0;
       break;
      }
      Fb();
     }
    } else {
     A = k[157568] | 0, (A | 0) == 0 | f >>> 0 < A >>> 0 && (k[157568] = f), k[157676] = f, k[157677] = q, k[157679] = 0, k[157573] = k[157682], k[157572] = -1, a = 0;
     do A = a << 1, k[630296 + (A + 3 << 2) >> 2] = 630296 + (A << 2), k[630296 + (A + 2 << 2) >> 2] = 630296 + (A << 2), a = a + 1 | 0; while ((a | 0) != 32);
     A = f + 8 | 0, A = (A & 7 | 0) == 0 ? 0 : 0 - A & 7, z = q + -40 - A | 0, k[157570] = f + A, k[157567] = z, k[f + (A + 4) >> 2] = z | 1, k[f + (q + -36) >> 2] = 40, k[157571] = k[157686];
    } while (0);
    if (a = k[157567] | 0, a >>> 0 > r >>> 0) return z = a - r | 0, k[157567] = z, A = k[157570] | 0, k[157570] = A + r, k[A + (r + 4) >> 2] = z | 1, k[A + 4 >> 2] = r | 3, A = A + 8 | 0, A | 0;
   }
   return A = wb() | 0, k[A >> 2] = 12, A = 0, A | 0;
  }
  function ye(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0;
   for (ra = r, r = r + 448 | 0, xe(0, 0), na = ug((ka(4 << ((a | 0) > 1 & 1), 2883584) | 0) + 1572864 | 0) | 0, mc(na, 586080), oa = ka(4 << ((a | 0) > 1 & 1), 1572864) | 0, pa = (ka(4 << ((a | 0) > 1 & 1), 2621440) | 0) + 1572864 | 0, ma = j[65844] | 0, y = 0, b = 0, c = 0; ;) {
    for (v = y + 6 | 0, w = y & 65535, x = 0; ;) {
     l = x + 6 | 0, n = x & 65535, p = (i[((l | 0) % 6 | 0) + (344 + (((v | 0) % 6 | 0) * 6 | 0)) >> 0] | 0) == 1, q = p ? 2 : 1, s = 1, t = 0, u = 0, A = b;
     do if (h = t, t = t + 2 | 0, e = s, s = j[586104 + (t << 1) >> 1] | 0, b = s << 16 >> 16, u = (i[((l + b | 0) % 6 | 0) + (344 + (((v + (e << 16 >> 16) | 0) % 6 | 0) * 6 | 0)) >> 0] | 0) == 1 ? 0 : u + 1 | 0, ba = (u | 0) == 4, c = ba ? w : c, A = ba ? n : A, (u | 0) == (q | 0)) {
      d = j[586104 + ((h | 1) << 1) >> 1] | 0, g = j[586104 + (h + 3 << 1) >> 1] | 0, f = 0;
      do Z = f << 1, _ = j[586128 + ((p & 1) << 5) + (Z << 1) >> 1] | 0, aa = ka(_, e << 16 >> 16) | 0, Z = j[586128 + ((p & 1) << 5) + ((Z | 1) << 1) >> 1] | 0, aa = (ka(Z, d) | 0) + aa | 0, _ = (ka(g, Z) | 0) + (ka(b, _) | 0) | 0, Z = _ + (ka(ma & 65535, aa) | 0) & 65535, ba = f ^ (p & 1) << 1 & h, j[ra + 152 + (y * 96 | 0) + (x << 5) + (ba << 1) >> 1] = Z, j[ra + 152 + (y * 96 | 0) + (x << 5) + 16 + (ba << 1) >> 1] = _ + (aa << 9), f = f + 1 | 0; while ((f | 0) != 8);
     } while ((t | 0) < 10);
     if (x = x + 1 | 0, (x | 0) == 3) break;
     b = A;
    }
    if (y = y + 1 | 0, (y | 0) == 3) break;
    b = A;
   }
   if (ja = na + (oa + 1572864) | 0, la = k[32928] | 0, ha = c & 65535, ia = j[65840] | 0, ((ia & 65535) + -2 | 0) > 2) {
    b = 2;
    do {
     if (((ma & 65535) + -2 | 0) > 2) for (f = ma & 65535, l = 2, e = 0, d = -1; ;) {
      do if ((i[((l + 6 | 0) % 6 | 0) + (344 + (((b + 6 | 0) % 6 | 0) * 6 | 0)) >> 0] | 0) == 1) c = l, e = 0, d = -1; else {
       if (h = (ka(f, b) | 0) + l | 0, f = (l | 0) % 3 | 0, g = (b | 0) % 3 | 0, !(e << 16 >> 16)) {
        e = 0, c = 0;
        do ba = j[la + ((j[ra + 152 + (g * 96 | 0) + (f << 5) + (e << 1) >> 1] | 0) + h << 3) + 2 >> 1] | 0, d = (d & 65535) > (ba & 65535) ? ba : d, c = (c & 65535) < (ba & 65535) ? ba : c, e = e + 1 | 0; while ((e | 0) != 6);
        e = c;
       }
       if (j[la + (h << 3) + 2 >> 1] = d, j[la + (h << 3) + 6 >> 1] = e, c = (b - ha | 0) % 3 | 0, (c | 0) == 2) {
        ba = l + 2 | 0, c = ba, e = 0, d = -1, b = (((b | 0) > 2 & (ba | 0) < ((ma & 65535) + -3 | 0)) << 31 >> 31) + b | 0;
        break;
       }
       if ((c | 0) != 1) {
        c = l;
        break;
       }
       (b | 0) < ((ia & 65535) + -3 | 0) ? (c = l + -1 | 0, b = b + 1 | 0) : c = l;
      } while (0);
      if (c = c + 1 | 0, !((c | 0) < ((ma & 65535) + -2 | 0))) break;
      f = ma & 65535, l = c;
     }
     b = b + 1 | 0;
    } while ((b | 0) < ((ia & 65535) + -2 | 0));
   }
   if (aa = A & 65535, ((ia & 65535) + -19 | 0) > 3) for (ba = (4 << ((a | 0) > 1 & 1) | 0) > 0, b = 0, ca = -6, da = -7, ea = -8, fa = -516, ga = 3; ;) {
    if (P = ea - ((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0) | 0, Q = da - ((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0) | 0, R = ca - ((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0) | 0, S = -3 - ((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0) | 0, T = -4 - ((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0) | 0, U = -3 - ((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0) | 0, V = ~((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0), W = ~((fa | 0) > (2 - (ia & 65535) | 0) ? fa : 2 - (ia & 65535) | 0), X = ga + 512 | 0, Y = ga + 2 | 0, Z = ga + 4 - ((ga - ha + 4 | 0) % 3 | 0) | 0, _ = ga + 3 | 0, $ = (ga | 0) < 8 ? ga : 8, ((ma & 65535) + -19 | 0) > 3) for (L = ma & 65535, M = -6, N = -7, O = -516, l = 3; ;) {
     if (J = (X | 0) < ((ia & 65535) + -3 | 0) ? X : (ia & 65535) + -3 | 0, e = l + 512 | 0, K = L + -3 | 0, K = (e | 0) < (K | 0) ? e : K, e = (J | 0) > (ga | 0)) {
      c = (K | 0) > (l | 0), d = 2 - L | 0, d = ~((O | 0) > (d | 0) ? O : d), h = ga;
      do {
       if (n = h - ga | 0, g = ka(L, h) | 0, c) {
        f = l;
        do H = na + (n * 3072 | 0) + ((f - l | 0) * 6 | 0) | 0, G = la + (g + f << 3) | 0, j[H >> 1] = j[G >> 1] | 0, j[H + 2 >> 1] = j[G + 2 >> 1] | 0, j[H + 4 >> 1] = j[G + 4 >> 1] | 0, f = f + 1 | 0; while ((f | 0) != (d | 0));
       }
       h = h + 1 | 0;
      } while ((h | 0) != (W | 0));
      if (Fg(na + 1572864 | 0, na | 0, 1572864) | 0, Fg(na + 3145728 | 0, na | 0, 1572864) | 0, Fg(na + 4718592 | 0, na | 0, 1572864) | 0, e) {
       f = (K | 0) > (l | 0), h = 2 - L | 0, h = ~((O | 0) > (h | 0) ? O : h), w = ga;
       do {
        if (p = (w + 6 | 0) % 6 | 0, q = (w | 0) % 3 | 0, s = w - ga | 0, t = ((w - ha | 0) % 3 | 0 | 0) == 0 & 1, u = ka(L, w) | 0, f) {
         v = l;
         do {
          if (e = i[((v + 6 | 0) % 6 | 0) + (344 + (p * 6 | 0)) >> 0] | 0, e << 24 >> 24 != 1) {
           g = u + v | 0, c = (v | 0) % 3 | 0, n = j[ra + 152 + (q * 96 | 0) + (c << 5) + 2 >> 1] | 0, d = j[ra + 152 + (q * 96 | 0) + (c << 5) >> 1] | 0, n = (((m[la + (d + g << 3) + 2 >> 1] | 0) + (m[la + (n + g << 3) + 2 >> 1] | 0) | 0) * 174 | 0) + (ka((m[la + ((d << 1) + g << 3) + 2 >> 1] | 0) + (m[la + ((n << 1) + g << 3) + 2 >> 1] | 0) | 0, -46) | 0) | 0, k[ra + 32 >> 2] = n, n = j[ra + 152 + (q * 96 | 0) + (c << 5) + 4 >> 1] | 0, d = m[la + (g << 3) + (e << 24 >> 24 << 1) >> 1] | 0, k[ra + 36 >> 2] = ((m[la + (n + g << 3) + 2 >> 1] | 0) * 33 | 0) + ((m[la + ((j[ra + 152 + (q * 96 | 0) + (c << 5) + 6 >> 1] | 0) + g << 3) + 2 >> 1] | 0) * 223 | 0) + ((d - (m[la + (g - n << 3) + (e << 24 >> 24 << 1) >> 1] | 0) | 0) * 92 | 0), n = 0;
           do G = j[ra + 152 + (q * 96 | 0) + (c << 5) + (n + 4 << 1) >> 1] | 0, H = la + (g + (ka(G, -3) | 0) << 3) + (e << 24 >> 24 << 1) | 0, k[ra + 32 + (n + 2 << 2) >> 2] = ((m[la + (g - (G << 1) << 3) + 2 >> 1] | 0) * 92 | 0) + ((m[la + (G + g << 3) + 2 >> 1] | 0) * 164 | 0) + (((d << 1) - (m[la + ((G * 3 | 0) + g << 3) + (e << 24 >> 24 << 1) >> 1] | 0) - (m[H >> 1] | 0) | 0) * 33 | 0), n = n + 1 | 0; while ((n | 0) != 2);
           e = v - l | 0, c = 0;
           do F = m[la + (g << 3) + 2 >> 1] | 0, H = k[ra + 32 + (c << 2) >> 2] >> 8, G = m[la + (g << 3) + 6 >> 1] | 0, G = (H | 0) < (G | 0) ? H : G, H = na + (ka(t ^ c, 1572864) | 0) + (s * 3072 | 0) + (e * 6 | 0) + 2 | 0, j[H >> 1] = (F | 0) > (G | 0) ? F : G, c = c + 1 | 0; while ((c | 0) != 4);
          }
          v = v + 1 | 0;
         } while ((v | 0) != (h | 0));
        }
        w = w + 1 | 0;
       } while ((w | 0) != (V | 0));
      }
     } else Fg(na + 1572864 | 0, na | 0, 1572864) | 0, Fg(na + 3145728 | 0, na | 0, 1572864) | 0, Fg(na + 4718592 | 0, na | 0, 1572864) | 0;
     if (C = l + 2 | 0, D = l + 4 - ((l - aa + 4 | 0) % 3 | 0) | 0, E = l + 3 | 0, (a | 0) > 0) {
      G = 2 - L | 0, F = -3 - ((O | 0) > (G | 0) ? O : G) | 0, G = -4 - ((O | 0) > (G | 0) ? O : G) | 0, H = 2 - L | 0, H = -3 - ((O | 0) > (H | 0) ? O : H) | 0, I = 0, e = na;
      do {
       if (I && ((I | 0) == 1 ? (e = e + 6291456 | 0, Fg(e | 0, na | 0, 6291456) | 0, qa = 44) : qa = 44), (qa | 0) == 44 && (qa = 0, (Y | 0) < (J + -2 | 0))) {
        u = Y;
        do {
         if (d = (u + 6 | 0) % 6 | 0, n = (u | 0) % 3 | 0, g = u - ga | 0, f = ((u - ha | 0) % 3 | 0 | 0) == 0 & 1, (C | 0) < (K + -2 | 0)) {
          s = C;
          do {
           if (h = i[((s + 6 | 0) % 6 | 0) + (344 + (d * 6 | 0)) >> 0] | 0, h << 24 >> 24 != 1) {
            c = (ka(ma & 65535, u) | 0) + s | 0, p = (s | 0) % 3 | 0, q = s - l | 0, t = 3;
            do B = f ^ t + -2, A = j[ra + 152 + (n * 96 | 0) + (p << 5) + 16 + (t << 1) >> 1] | 0, v = e + (ka(B, 1572864) | 0) + (g * 3072 | 0) + ((q - (A << 1) | 0) * 6 | 0) + 2 | 0, sa = e + (ka(B, 1572864) | 0) + (g * 3072 | 0) + ((A + q | 0) * 6 | 0) + 2 | 0, w = e + (ka(B, 1572864) | 0) + (g * 3072 | 0) + ((q - (A << 1) | 0) * 6 | 0) + (h << 24 >> 24 << 1) | 0, A = e + (ka(B, 1572864) | 0) + (g * 3072 | 0) + ((A + q | 0) * 6 | 0) + (h << 24 >> 24 << 1) | 0, x = e + (ka(B, 1572864) | 0) + (g * 3072 | 0) + (q * 6 | 0) + (h << 24 >> 24 << 1) | 0, y = m[la + (c << 3) + 2 >> 1] | 0, x = ((m[sa >> 1] << 1) + (m[v >> 1] | 0) - (m[w >> 1] | 0) - (m[A >> 1] << 1) + ((m[x >> 1] | 0) * 3 | 0) | 0) / 3 | 0, A = m[la + (c << 3) + 6 >> 1] | 0, A = (x | 0) < (A | 0) ? x : A, B = e + (ka(B, 1572864) | 0) + (g * 3072 | 0) + (q * 6 | 0) + 2 | 0, j[B >> 1] = (y | 0) > (A | 0) ? y : A, t = t + 1 | 0; while ((t | 0) != 6);
           }
           s = s + 1 | 0;
          } while ((s | 0) != (F | 0));
         }
         u = u + 1 | 0;
        } while ((u | 0) != (U | 0));
       }
       if ((Z | 0) < (J + -2 | 0)) {
        B = Z;
        do {
         if (v = B - ga | 0, w = (B + 6 | 0) % 6 | 0, (D | 0) < (K + -2 | 0)) {
          x = D;
          do {
           for (d = i[((x + 7 | 0) % 6 | 0) + (344 + (w * 6 | 0)) >> 0] | 0, k[ra + 96 >> 2] = 0, k[ra + 96 + 4 >> 2] = 0, k[ra + 96 + 8 >> 2] = 0, k[ra + 96 + 12 >> 2] = 0, k[ra + 96 + 16 >> 2] = 0, k[ra + 96 + 20 >> 2] = 0, y = 0, A = 1, c = e + (v * 3072 | 0) + ((x - l | 0) * 6 | 0) | 0; ;) {
            for (h = 0 - A | 0, s = (y | 0) > 1, t = ra + 96 + (y << 2) | 0, p = m[c + 2 >> 1] << 1, q = 0, u = d; ;) {
             if (g = A << q, d = m[c + (g * 6 | 0) + 2 >> 1] | 0, f = h << q, n = m[c + (f * 6 | 0) + 2 >> 1] | 0, g = m[c + (g * 6 | 0) + (u << 1) >> 1] | 0, f = m[c + (f * 6 | 0) + (u << 1) >> 1] | 0, k[ra + (u << 5) + (y << 2) >> 2] = p - d - n + g + f, s && (z = +((ka(d - n - g + f | 0, d - n - g + f | 0) | 0) + (ka(p - d - n | 0, p - d - n | 0) | 0) | 0), o[t >> 2] = +o[t >> 2] + z), q = q + 1 | 0, (q | 0) == 2) break;
             u ^= 2;
            }
            d = (y & 1 | 0) == 0;
            do if (!((y | 0) < 2 | d)) {
             if (n = y + -1 | 0, !(+o[ra + 96 + (n << 2) >> 2] < +o[t >> 2])) break;
             k[ra + (y << 2) >> 2] = k[ra + (n << 2) >> 2], k[ra + 64 + (y << 2) >> 2] = k[ra + 64 + (n << 2) >> 2];
            } while (0);
            if (s & d || (sa = k[ra + (y << 2) >> 2] | 0, sa = (sa | 0) < 131070 ? (sa | 0) / 2 | 0 : 65535, j[c >> 1] = (sa | 0) < 0 ? 0 : sa & 65535, sa = k[ra + 64 + (y << 2) >> 2] | 0, sa = (sa | 0) < 131070 ? (sa | 0) / 2 | 0 : 65535, j[c + 4 >> 1] = (sa | 0) < 0 ? 0 : sa & 65535, c = c + 1572864 | 0), y = y + 1 | 0, (y | 0) == 6) break;
            d = u, A ^= 513;
           }
           x = x + 3 | 0;
          } while ((x | 0) < (K + -2 | 0));
         }
         B = B + 3 | 0;
        } while ((B | 0) < (J + -2 | 0));
       }
       if ((_ | 0) < (J + -3 | 0)) {
        s = _;
        do {
         if (c = (s + 6 | 0) % 6 | 0, d = s - ga | 0, n = ((s - ha | 0) % 3 | 0 | 0) != 0 ? 512 : 1, (E | 0) < (K + -3 | 0)) {
          h = E;
          do {
           if (g = 2 - (i[((h + 6 | 0) % 6 | 0) + (344 + (c * 6 | 0)) >> 0] | 0) | 0, (g | 0) != 1) for (p = 0, q = e + (d * 3072 | 0) + ((h - l | 0) * 6 | 0) | 0; ;) {
            do if ((p | 0) > 1) f = n; else {
             if ((p ^ n) & 1) {
              f = n;
              break;
             }
             f = m[q + 2 >> 1] | 0, y = f - (m[q + (n * 6 | 0) + 2 >> 1] | 0) | 0, A = f - (m[q + ((0 - n | 0) * 6 | 0) + 2 >> 1] | 0) | 0, B = f - (m[q + (((n ^ 513) * 3 | 0) * 6 | 0) + 2 >> 1] | 0) | 0, f = f - (m[q + ((0 - ((n ^ 513) * 3 | 0) | 0) * 6 | 0) + 2 >> 1] | 0) | 0, f = ((y >> 31 ^ y) + (y >>> 31) + (A >>> 31) + (A >> 31 ^ A) | 0) < ((B >> 31 ^ B) + (B >>> 31) + (f >>> 31) + (f >> 31 ^ f) << 1 | 0) ? n : (n ^ 513) * 3 | 0;
            } while (0);
            if (B = 0 - f | 0, B = (m[q + (B * 6 | 0) + (g << 1) >> 1] | 0) + (m[q + (f * 6 | 0) + (g << 1) >> 1] | 0) + (m[q + 2 >> 1] << 1) - (m[q + (f * 6 | 0) + 2 >> 1] | 0) - (m[q + (B * 6 | 0) + 2 >> 1] | 0) | 0, B = (B | 0) < 131070 ? (B | 0) / 2 | 0 : 65535, j[q + (g << 1) >> 1] = (B | 0) < 0 ? 0 : B & 65535, p = p + 1 | 0, (p | 0) == 4) break;
            q = q + 1572864 | 0;
           }
           h = h + 1 | 0;
          } while ((h | 0) != (G | 0));
         }
         s = s + 1 | 0;
        } while ((s | 0) != (T | 0));
       }
       if ((Y | 0) < (J + -2 | 0)) {
        x = Y;
        do {
         if ((x - ha | 0) % 3 | 0 && (q = x - ga | 0, s = (x | 0) % 3 | 0, (C | 0) < (K + -2 | 0))) {
          u = C;
          do {
           do if ((u - aa | 0) % 3 | 0) {
            if (t = (u | 0) % 3 | 0, !ba) break;
            for (v = 0, w = e + (q * 3072 | 0) + ((u - l | 0) * 6 | 0) | 0; ;) {
             if (c = ra + 152 + (s * 96 | 0) + (t << 5) + 16 + (v << 1) | 0, d = j[c >> 1] | 0, n = ra + 152 + (s * 96 | 0) + (t << 5) + 16 + ((v | 1) << 1) | 0, g = j[n >> 1] | 0, f = m[w + 2 >> 1] | 0, h = j[w + (d * 6 | 0) + 2 >> 1] | 0, p = j[w + (g * 6 | 0) + 2 >> 1] | 0, (d | 0) == (0 - g | 0) ? (B = (f << 1) - (h & 65535) - (p & 65535) + (m[w + (d * 6 | 0) >> 1] | 0) + (m[w + (g * 6 | 0) >> 1] | 0) | 0, B = (B | 0) < 131070 ? (B | 0) / 2 | 0 : 65535, j[w >> 1] = (B | 0) < 0 ? 0 : B & 65535, c = (f << 1) - (h & 65535) - (p & 65535) + (m[w + ((j[c >> 1] | 0) * 6 | 0) + 4 >> 1] | 0) + (m[w + ((j[n >> 1] | 0) * 6 | 0) + 4 >> 1] | 0) | 0, c = (c | 0) < 131070 ? (c | 0) / 2 | 0 : 65535, c = (c | 0) < 0 ? 0 : c & 65535) : (B = (f * 3 | 0) - ((h & 65535) << 1) - (p & 65535) + (m[w + (d * 6 | 0) >> 1] << 1) + (m[w + (g * 6 | 0) >> 1] | 0) | 0, B = (B | 0) < 196605 ? (B | 0) / 3 | 0 : 65535, j[w >> 1] = (B | 0) < 0 ? 0 : B & 65535, c = (f * 3 | 0) - ((h & 65535) << 1) - (p & 65535) + (m[w + ((j[c >> 1] | 0) * 6 | 0) + 4 >> 1] << 1) + (m[w + ((j[n >> 1] | 0) * 6 | 0) + 4 >> 1] | 0) | 0, c = (c | 0) < 196605 ? (c | 0) / 3 | 0 : 65535, c = (c | 0) < 0 ? 0 : c & 65535), j[w + 4 >> 1] = c, v = v + 2 | 0, (v | 0) >= (4 << ((a | 0) > 1 & 1) | 0)) break;
             w = w + 1572864 | 0;
            }
           } while (0);
           u = u + 1 | 0;
          } while ((u | 0) != (H | 0));
         }
         x = x + 1 | 0;
        } while ((x | 0) != (S | 0));
       }
       I = I + 1 | 0;
      } while ((I | 0) != (a | 0));
     }
     if (q = J - ga | 0, s = K - l | 0, ba) {
      g = 2 - L | 0, n = M - ((O | 0) > (g | 0) ? O : g) | 0, g = N - ((O | 0) > (g | 0) ? O : g) | 0, f = 0;
      do {
       if ((q + -2 | 0) > 2) {
        c = 2;
        do {
         if ((s + -2 | 0) > 2) {
          e = 2;
          do xe(na + (ka(f, 1572864) | 0) + (c * 3072 | 0) + (e * 6 | 0) | 0, na + oa + (c * 3072 | 0) + (e * 6 | 0) | 0), e = e + 1 | 0; while ((e | 0) != (n | 0));
         }
         c = c + 1 | 0;
        } while ((c | 0) != (R | 0));
       }
       if (e = j[586192 + ((f & 3) << 1) >> 1] | 0, (q + -3 | 0) > 3) {
        d = 3;
        do {
         if ((s + -3 | 0) > 3) {
          c = 3;
          do H = c + e | 0, J = c - e | 0, L = (j[na + oa + (d * 3072 | 0) + (c * 6 | 0) >> 1] << 1) - (j[na + oa + (d * 3072 | 0) + (H * 6 | 0) >> 1] | 0) - (j[na + oa + (d * 3072 | 0) + (J * 6 | 0) >> 1] | 0) | 0, K = ka(L, L) | 0, G = (j[na + oa + (d * 3072 | 0) + (c * 6 | 0) + 2 >> 1] << 1) - (j[na + oa + (d * 3072 | 0) + (H * 6 | 0) + 2 >> 1] | 0) - (j[na + oa + (d * 3072 | 0) + (J * 6 | 0) + 2 >> 1] | 0) + ((L * 500 | 0) / 232 | 0) | 0, K = (ka(G, G) | 0) + K | 0, L = (j[na + oa + (d * 3072 | 0) + (c * 6 | 0) + 4 >> 1] << 1) - (j[na + oa + (d * 3072 | 0) + (H * 6 | 0) + 4 >> 1] | 0) - (j[na + oa + (d * 3072 | 0) + (J * 6 | 0) + 4 >> 1] | 0) + ((L * 500 | 0) / -580 | 0) | 0, z = +(K + (ka(L, L) | 0) | 0), o[ja + (f << 20) + (d << 11) + (c << 2) >> 2] = z, c = c + 1 | 0; while ((c | 0) != (g | 0));
         }
         d = d + 1 | 0;
        } while ((d | 0) != (Q | 0));
       }
       f = f + 1 | 0;
      } while ((f | 0) != (4 << ((a | 0) > 1 & 1) | 0));
     }
     if (Jg(na + pa | 0, 0, 4 << ((a | 0) > 1 & 1) << 18 | 0) | 0, (q + -4 | 0) > 4) {
      p = 4;
      do {
       if ((s + -4 | 0) > 4) for (h = 4; ;) {
        if (ba) {
         e = 0, z = 3.4028234663852886e38;
         do ta = +o[ja + (e << 20) + (p << 11) + (h << 2) >> 2], z = z > ta ? ta : z, e = e + 1 | 0; while ((e | 0) != (4 << ((a | 0) > 1 & 1) | 0));
         if (ba) {
          c = h + -1 | 0, e = h + 1 | 0, g = 0;
          do {
           d = na + pa + (g << 18) + (p << 9) + h | 0, f = -1;
           do n = f + p | 0, +o[ja + (g << 20) + (n << 11) + (c << 2) >> 2] <= z * 8 && (i[d >> 0] = (i[d >> 0] | 0) + 1 << 24 >> 24), +o[ja + (g << 20) + (n << 11) + (h << 2) >> 2] <= z * 8 && (i[d >> 0] = (i[d >> 0] | 0) + 1 << 24 >> 24), +o[ja + (g << 20) + (n << 11) + (e << 2) >> 2] <= z * 8 && (i[d >> 0] = (i[d >> 0] | 0) + 1 << 24 >> 24), f = f + 1 | 0; while ((f | 0) != 2);
           g = g + 1 | 0;
          } while ((g | 0) != (4 << ((a | 0) > 1 & 1) | 0));
         } else qa = 106;
        } else qa = 106;
        if ((qa | 0) == 106 && (qa = 0, e = h + 1 | 0), !((e | 0) < (s + -4 | 0))) break;
        h = e;
       }
       p = p + 1 | 0;
      } while ((p | 0) != (P | 0));
     }
     if (u = (ia & 65535) - ga | 0, t = (ma & 65535) - l | 0, u = ((u | 0) < 516 ? u + 2 | 0 : q) + -8 | 0, v = (l | 0) < 8 ? l : 8, t = ((t | 0) < 516 ? t + 2 | 0 : s) + -8 | 0, ($ | 0) < (u | 0)) {
      s = $;
      do {
       if (q = s + ga | 0, (v | 0) < (t | 0)) {
        p = v;
        do {
         if (ba) {
          b = p + -2 | 0, e = p + -1 | 0, c = p + 1 | 0, d = p + 2 | 0, f = 0;
          do {
           n = ra + 120 + (f << 2) | 0, k[n >> 2] = 0, g = 0, h = -2;
           do L = h + s | 0, g = g + (i[na + pa + (f << 18) + (L << 9) + b >> 0] | 0) + (i[na + pa + (f << 18) + (L << 9) + e >> 0] | 0) + (i[na + pa + (f << 18) + (L << 9) + p >> 0] | 0) + (i[na + pa + (f << 18) + (L << 9) + c >> 0] | 0) + (i[na + pa + (f << 18) + (L << 9) + d >> 0] | 0) | 0, h = h + 1 | 0; while ((h | 0) != 3);
           k[n >> 2] = g, f = f + 1 | 0;
          } while ((f | 0) != (4 << ((a | 0) > 1 & 1) | 0));
         }
         if ((4 << ((a | 0) > 1 & 1) | 0) > 4) {
          n = 0;
          do {
           b = ra + 120 + (n << 2) | 0, e = k[b >> 2] | 0, c = ra + 120 + (n + 4 << 2) | 0, d = k[c >> 2] | 0;
           do if ((e | 0) < (d | 0)) k[b >> 2] = 0; else {
            if ((e | 0) <= (d | 0)) break;
            k[c >> 2] = 0;
           } while (0);
           n = n + 1 | 0;
          } while ((n | 0) != ((4 << ((a | 0) > 1 & 1)) + -4 | 0));
         }
         if (d = k[ra + 120 >> 2] | 0, (4 << ((a | 0) > 1 & 1) | 0) > 1) {
          b = d & 65535, e = 1, c = d & 65535;
          do L = k[ra + 120 + (e << 2) >> 2] | 0, c = (b | 0) < (L | 0) ? L & 65535 : c, e = e + 1 | 0, b = c & 65535; while ((e | 0) != (4 << ((a | 0) > 1 & 1) | 0));
         } else b = d & 65535;
         h = b - (b >>> 3) & 65535;
         a: do if (ba) for (n = 0, f = 0, b = 0, c = 0, e = 0, g = 0; ;) {
          if ((d | 0) >= (h | 0) && (J = na + (ka(g, 1572864) | 0) + (s * 3072 | 0) + (p * 6 | 0) | 0, K = na + (ka(g, 1572864) | 0) + (s * 3072 | 0) + (p * 6 | 0) + 2 | 0, L = na + (ka(g, 1572864) | 0) + (s * 3072 | 0) + (p * 6 | 0) + 4 | 0, b = b + 1 | 0, n = b, f = f + (m[J >> 1] | 0) | 0, c = c + (m[K >> 1] | 0) | 0, e = e + (m[L >> 1] | 0) | 0), g = g + 1 | 0, (g | 0) >= (4 << ((a | 0) > 1 & 1) | 0)) {
           d = f;
           break a;
          }
          d = k[ra + 120 + (g << 2) >> 2] | 0;
         } else n = 0, d = 0, b = 0, c = 0, e = 0; while (0);
         L = p + l + (ka(ma & 65535, q) | 0) | 0, j[la + (L << 3) >> 1] = (d | 0) / (n | 0) | 0, j[la + (L << 3) + 2 >> 1] = (c | 0) / (n | 0) | 0, j[la + (L << 3) + 4 >> 1] = (e | 0) / (n | 0) | 0, p = p + 1 | 0;
        } while ((p | 0) < (t | 0));
       }
       s = s + 1 | 0;
      } while ((s | 0) < (u | 0));
     }
     if (l = l + 496 | 0, !((l | 0) < ((ma & 65535) + -19 | 0))) break;
     L = ma & 65535, M = M + -496 | 0, N = N + -496 | 0, O = O + -496 | 0;
    }
    if (ga = ga + 496 | 0, (ga | 0) >= ((ia & 65535) + -19 | 0)) break;
    ca = ca + -496 | 0, da = da + -496 | 0, ea = ea + -496 | 0, fa = fa + -496 | 0;
   }
   vg(na), te(8), r = ra;
  }
  function Fe(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, m = 0, n = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0;
   A = r, r = r + 352 | 0, z = j[284] | 0;
   a: do if (og(132032, 586592) | 0 && (Ga(A + 16 | 0, 1, 10, k[140] | 0) | 0, qg(A + 16 | 0, 586600, 3) | 0 && qg(A + 16 | 0, 586608, 3) | 0 && qg(A + 16 | 0, 586616, 4) | 0 && qg(A + 16 | 0, 586624, 4) | 0)) {
    b: do if (qg(A + 16 | 0, 586632, 2) | 0) if (qg(A + 16 | 0, 586640, 3) | 0) {
     c: do if (og(A + 16 | 0, 586648) | 0) {
      if (og(A + 16 | 0, 586656) | 0 && og(A + 16 | 0, 586664) | 0) {
       do if (qg(A + 16 | 0, 586672, 4) | 0 && og(A + 16 | 0, 586680) | 0) {
        if (!(qg(A + 16 | 0, 586696, 8) | 0)) {
         a = (vb(k[140] | 0) | 0) + -10 | 0;
         break;
        }
        do if (og(A + 16 | 0, 586712) | 0) {
         if (!(og(A + 16 | 0, 586720) | 0)) break;
         if (!(og(A + 16 | 0, 586728) | 0)) break;
         if (!(og(A + 16 | 0, 586736) | 0)) break;
         do if (og(A + 16 | 0, 586744) | 0) {
          if (!(og(A + 16 | 0, 586752) | 0)) break;
          if (kb(k[140] | 0, -10, 1) | 0, qg(132032, 586760, 7) | 0) break c;
          a = vb(k[140] | 0) | 0;
          break c;
         } while (0);
         kb(k[140] | 0, -4, 1) | 0;
         break c;
        } while (0);
        kb(k[140] | 0, -2, 1) | 0;
        break c;
       } while (0);
       j[284] = 18761, kb(k[140] | 0, 2, 1) | 0;
       break;
      }
      a = (vb(k[140] | 0) | 0) + -10 | 0, kb(k[140] | 0, -2, 1) | 0, y = pc() | 0, j[284] = y, (i[A + 16 >> 0] | 0) == 79 && pc() | 0;
     } else {
      if (a = vb(k[140] | 0) | 0, y = pc() | 0, j[284] = y, (pc() | 0) << 16 >> 16 != 42) break b;
      y = rc() | 0, kb(k[140] | 0, y + -8 | 0, 1) | 0;
     } while (0);
     if (e = pc() | 0, (e & 65535) > 1e3) break a;
     if (y = j[284] | 0, e << 16 >> 16) for (x = e & 65535, d = 0, q = 0, e = 0; ;) {
      x = x + -1 | 0, j[284] = y, De(a, A + 12 | 0, A, A + 4 | 0, A + 8 | 0), p = k[A + 12 >> 2] | b << 16, k[A + 12 >> 2] = p;
      d: do if ((p | 0) == 2) w = (Ff(132032, 586768) | 0) == 0, w | +o[41344] != 0 || (pc() | 0, B = +((pc() | 0) & 65535), o[41344] = B), c = k[A >> 2] | 0, g = c, h = k[A + 4 >> 2] | 0, c = (c | 0) == 4, w = 62; else {
       h = k[A + 4 >> 2] | 0, (p | 0) == 4 & (h + -27 | 0) >>> 0 < 8 ? (rc() | 0, e = pc() | 0, e << 16 >> 16 == 32767 | +o[41344] != 0 || (B = +Qf(+(e & 65535) * .03125 + -4) * 50, o[41344] = B), pc() | 0, e = pc() | 0, e << 16 >> 16 == 32767 | +o[41346] != 0 || (B = +Qf(+(e & 65535) * .015625), o[41346] = B), e = pc() | 0, e << 16 >> 16 == -1 | +o[41348] != 0 || (B = +Qf(+(e << 16 >> 16) * -.03125), o[41348] = B), pc() | 0, n = (pc() | 0) & 65535, pc() | 0, w = (pc() | 0) & 65535, k[41350] = w) : n = e;
       do if ((p | 0) == 4 | (p | 0) == 276 && !(qg(132032, 586776, 6) | 0)) {
        if (kb(k[140] | 0, ((p | 0) == 4 ? 140 : 160) | 0, 1) | 0, e = (pc() | 0) & 65535, (e | 0) == 72) {
         k[41352] = 0;
         break;
        }
        if ((e | 0) == 82) {
         k[41352] = 5;
         break;
        }
        if ((e | 0) == 76) {
         k[41352] = 6;
         break;
        }
        break;
       } while (0);
       if (m = k[A >> 2] | 0, (p | 0) == 7 & (m | 0) == 2 & h >>> 0 > 20 && Cb(131864, 64, k[140] | 0) | 0, (p | 0) == 8 & (m | 0) == 4 && (w = rc() | 0, k[41350] = w), (p | 0) == 9) {
        if (og(132032, 586784) | 0) {
         g = m, c = (m | 0) == 4, e = n, w = 62;
         break;
        }
        Ga(165416, 64, 1, k[140] | 0) | 0, g = m, c = (m | 0) == 4, e = n, w = 62;
        break;
       }
       (p | 0) == 12 & (h | 0) == 4 && (B = +tc(m), o[33004] = B, B = +tc(m), o[33006] = B, B = +tc(m), o[33005] = B);
       do if ((p | 0) == 13 & (m | 0) == 7) {
        if ((pc() | 0) << 16 >> 16 != -21846) break;
        if (h >>> 0 > 2) {
         c = 2, e = 2;
         do c = ib(k[140] | 0) | 0 | c << 8, e = e + 1 | 0; while ((c & 65535 | 0) != 48059 & e >>> 0 < h >>> 0);
        } else e = 2;
        if (e = e + 4 | 0, e >>> 0 >= (h + -5 | 0) >>> 0) break;
        do {
         c = (rc() | 0) != 257;
         do if (c | (h | 0) == 0) e = c ? e : 0; else {
          if (rc() | 0, e = ib(k[140] | 0) | 0, e >>> 0 >= 3) {
           e = h;
           break;
          }
          k[41352] = (i[586792 + e >> 0] | 0) + -48, e = h;
         } while (0);
         e = e + 4 | 0;
        } while (e >>> 0 < (h + -5 | 0) >>> 0);
       } while (0);
       (p | 0) == 16 & (m | 0) == 4 && (w = rc() | 0, k[32982] = w);
       do if ((p | 0) == 17 & (k[32994] | 0) != 0) {
        if (qg(132032, 586768, 5) | 0) break;
        w = k[140] | 0, kb(w | 0, (rc() | 0) + a | 0, 0) | 0, Ge(a) | 0;
       } while (0);
       do if ((p | 0) == 20 & (m | 0) == 7) {
        if (e = k[140] | 0, (h | 0) == 2560) {
         kb(e | 0, 1248, 1) | 0, f = 7, h = 2560, c = 20, g = q, e = n, w = 160;
         break d;
        }
        if (Ga(A + 16 | 0, 1, 10, e | 0) | 0, qg(A + 16 | 0, 586800, 4) | 0) break;
        v = k[140] | 0, w = (og(A + 16 + 4 | 0, 586808) | 0) != 0, kb(v | 0, (w ? 46 : 1546) | 0, 1) | 0, B = +((rc() | 0) << 2 >>> 0), o[33004] = B, w = rc() | 0, B = +(((rc() | 0) + w | 0) >>> 0), o[33005] = B, B = +((rc() | 0) << 2 >>> 0), o[33006] = B;
       } while (0);
       if (!((p | 0) == 21 & (m | 0) == 2 & (k[32994] | 0) != 0)) {
        v = m, u = (h | 0) == 4, s = (m | 0) == 4, t = (m | 0) == 7, e = n, w = 86;
        break;
       }
       Ga(132096, 64, 1, k[140] | 0) | 0, v = 2, u = (h | 0) == 4, s = (m | 0) == 4, t = (m | 0) == 7, e = n, w = 86;
      } while (0);
      (w | 0) == 62 && (v = g, u = (h | 0) == 4, s = c, t = (g | 0) == 7, w = 86);
      e: do if ((w | 0) == 86) {
       do {
        if (Ff(132032, 586816) | 0) {
         if ((p | 0) == 27) {
          k[A + 12 >> 2] = 4120, c = 4120, w = 93;
          break;
         }
         if ((p | 0) == 28) {
          k[A + 12 >> 2] = 4119, c = 4119, w = 93;
          break;
         }
         if ((p | 0) == 29) {
          w = 91;
          break;
         }
         w = 94;
         break;
        }
        w = (p | 0) == 29 ? 91 : 94;
       } while (0);
       if ((w | 0) == 91) if (c = ib(k[140] | 0) | 0, (c + 1 | 0) >>> 0 > 1) {
        do w = c + -48 | 0, d = (w >>> 0 < 10 ? w : (c >>> 0) % 10 | 0) + (d * 10 | 0) | 0, c = ib(k[140] | 0) | 0; while ((c + 1 | 0) >>> 0 > 1);
        c = 29, w = 93;
       } else c = 29, w = 93; else (w | 0) == 94 && (w = 0, g = (v | 0) == 1, (p | 0) == 41 & g && (c = e >>> 0 < 18 ? (i[586824 + e >> 0] | 0) + -48 | 0 : 0, kb(k[140] | 0, c << 5 | 8 | 0, 1) | 0, B = +((rc() | 0) >>> 0), o[33005] = B, B = +((rc() | 0) >>> 0), o[33004] = B, B = +((rc() | 0) >>> 0), o[33006] = B, B = +((rc() | 0) >>> 0), o[33007] = B), f = (v | 0) == 3, (p | 0) == 61 & f & u && (n = (pc() | 0) & 65535, j[66128] = n >>> (14 - (k[41396] | 0) | 0), n = (pc() | 0) & 65535, j[66129] = n >>> (14 - (k[41396] | 0) | 0), n = (pc() | 0) & 65535, j[66131] = n >>> (14 - (k[41396] | 0) | 0), n = (pc() | 0) & 65535, j[66130] = n >>> (14 - (k[41396] | 0) | 0)), (p | 0) == 129 & s ? (c = rc() | 0, k[33002] = c, kb(k[140] | 0, c + 41 | 0, 0) | 0, c = ((pc() | 0) & 65535) << 1 & 65535, j[65916] = c, c = pc() | 0, j[65896] = c, k[80] = 1633771873, c = 129, m = 1) : (c = p, m = (p | 0) == 129));
       (w | 0) == 93 && (m = 0, g = (v | 0) == 1, f = (v | 0) == 3), (m | (c | 0) == 256) & t | (c | 0) == 640 & g && (w = vb(k[140] | 0) | 0, k[41342] = w, k[33044] = h), (c | 0) == 136 & s && (g = rc() | 0, k[41342] = g, g && (k[41342] = g + a)), (c | 0) == 137 & s && (w = rc() | 0, k[33044] = w);
       do if ((c | 0) == 140 | (c | 0) == 150) g = vb(k[140] | 0) | 0, k[33e3] = g, g = q, w = 128; else {
        if ((c | 0) == 151) {
         if (g = ((q * 10 | 0) + -48 + (ib(k[140] | 0) | 0) | 0) * 10 | 0, g = (g + -48 + (ib(k[140] | 0) | 0) | 0) * 10 | 0, g = (g + -48 + (ib(k[140] | 0) | 0) | 0) * 10 | 0, g = g + -48 + (ib(k[140] | 0) | 0) | 0, (g | 0) == 100) {
          kb(k[140] | 0, 68, 1) | 0, B = +((pc() | 0) & 65535), o[33004] = B, B = +((pc() | 0) & 65535), o[33006] = B, B = +((pc() | 0) & 65535), o[33005] = B, B = +((pc() | 0) & 65535), o[33007] = B, c = 151, g = 100, w = 128;
          break;
         }
         if ((g | 0) == 102) {
          kb(k[140] | 0, 6, 1) | 0, B = +((pc() | 0) & 65535), o[33004] = B, B = +((pc() | 0) & 65535), o[33005] = B, B = +((pc() | 0) & 65535), o[33007] = B, B = +((pc() | 0) & 65535), o[33006] = B, c = 151, g = 102, w = 128;
          break;
         }
         if ((g | 0) == 103) {
          kb(k[140] | 0, 16, 1) | 0, B = +((pc() | 0) & 65535), o[33004] = B, B = +((pc() | 0) & 65535), o[33005] = B, B = +((pc() | 0) & 65535), o[33006] = B, B = +((pc() | 0) & 65535), o[33007] = B, c = 151, g = 103, w = 128;
          break;
         }
         if (g >>> 0 <= 199) {
          c = 151, w = 128;
          break;
         }
         (g | 0) != 205 && kb(k[140] | 0, 280, 1) | 0, Ga(A + 28 | 0, 324, 1, k[140] | 0) | 0, w = 119;
         break;
        }
        g = q, w = 119;
       } while (0);
       do if ((w | 0) == 119) {
        if (w = 0, (c | 0) == 161 & t && (j[284] = 18761, kb(k[140] | 0, 140, 1) | 0, B = +((rc() | 0) >>> 0), o[33004] = B, B = +((rc() | 0) >>> 0), o[33005] = B, B = +((rc() | 0) >>> 0), o[33006] = B), (c | 0) == 164 & f && (kb(k[140] | 0, e * 48 | 0, 1) | 0, B = +((pc() | 0) & 65535), o[33004] = B, B = +((pc() | 0) & 65535), o[33005] = B, B = +((pc() | 0) & 65535), o[33006] = B), (c | 0) == 167) {
         if (m = g + -200 | 0, m >>> 0 >= 17) {
          c = 167, w = 128;
          break;
         }
         for (n = i[586848 + (d & 255) >> 0] | 0, f = ib(k[140] | 0) | 0, f = (ib(k[140] | 0) | 0) ^ f, f ^= ib(k[140] | 0) | 0, f = 587104 + (f ^ (ib(k[140] | 0) | 0)) | 0, f = i[f >> 0] | 0, p = 96, q = 0; ;) {
          if (f = (ka(p & 255, n & 255) | 0) + (f & 255) | 0, C = A + 28 + q | 0, i[C >> 0] = l[C >> 0] ^ f, q = q + 1 | 0, (q | 0) == 324) break;
          f &= 255, p = p + 1 << 24 >> 24;
         }
         C = (i[587360 + m >> 0] | 0) + -48 | 0, B = +((oc(i[A + 28 + (C & -2) >> 0] | 0, i[A + 28 + (C | 1) >> 0] | 0) | 0) & 65535), o[132016 + ((C & 1) << 2) >> 2] = B, B = +((oc(i[A + 28 + ((C & -2) + 2) >> 0] | 0, i[A + 28 + ((C & -2) + 3) >> 0] | 0) | 0) & 65535), o[132016 + ((C & 1 ^ 1) << 2) >> 2] = B, B = +((oc(i[A + 28 + ((C & -2) + 4) >> 0] | 0, i[A + 28 + ((C & -2) + 5) >> 0] | 0) | 0) & 65535), o[132016 + ((C & 1 ^ 3) << 2) >> 2] = B, B = +((oc(i[A + 28 + ((C & -2) + 6) >> 0] | 0, i[A + 28 + ((C & -2) + 7) >> 0] | 0) | 0) & 65535), o[132016 + ((C & 1 | 2) << 2) >> 2] = B;
        }
        if (f = (c | 0) == 512, !(f & (h | 0) == 3)) {
         n = g;
         break;
        }
        rc() | 0, f = rc() | 0, k[41350] = f, f = 1, c = 512, n = g;
       } while (0);
       (w | 0) == 128 && (w = 0, f = (c | 0) == 512, n = g), f & u && (C = pc() | 0, j[66128] = C, C = pc() | 0, j[66129] = C, C = pc() | 0, j[66131] = C, C = pc() | 0, j[66130] = C), (c | 0) == 513 & u && (B = +((pc() | 0) & 65535), o[33004] = B, B = +((pc() | 0) & 65535), o[33005] = B, B = +((pc() | 0) & 65535), o[33007] = B, B = +((pc() | 0) & 65535), o[33006] = B), (c | 0) == 544 & t && (C = vb(k[140] | 0) | 0, k[33e3] = C), (c | 0) == 1025 & s & u && (C = (rc() | 0) & 65535, j[66128] = C, C = (rc() | 0) & 65535, j[66129] = C, C = (rc() | 0) & 65535, j[66131] = C, C = (rc() | 0) & 65535, j[66130] = C);
       do if ((c | 0) == 3585) {
        if (j[284] = 18761, kb(k[140] | 0, 22, 1) | 0, !(h >>> 0 > 44)) {
         c = 3585;
         break;
        }
        g = 22;
        do c = rc() | 0, kb(k[140] | 0, 14, 1) | 0, f = rc() | 0, (c | 0) == 1990472199 ? (C = (pc() | 0) & 65535, k[41352] = C) : kb(k[140] | 0, f + -4 | 0, 1) | 0, g = g + 18 + f | 0; while ((g + 22 | 0) >>> 0 < h >>> 0);
        k[A + 12 >> 2] = c, w = 146;
       } else w = 146; while (0);
       do if ((w | 0) == 146) {
        if (w = 0, (c | 0) == 3712 & (h | 0) == 256 & t) {
         kb(k[140] | 0, 48, 1) | 0, B = +(((pc() | 0) & 65535) * 508 | 0) * 1.078 * 152587890625e-16, o[33004] = B, B = +(((pc() | 0) & 65535) * 382 | 0) * 1.173 * 152587890625e-16, o[33006] = B, c = 3712;
         break;
        }
        if (!((c | 0) == 3840 & t)) break;
        if ((h | 0) == 734 | (h | 0) == 1502) {
         kb(k[140] | 0, 148, 1) | 0, f = v, c = 3840, g = n, w = 160;
         break e;
        }
        if ((h | 0) == 614) {
         kb(k[140] | 0, 176, 1) | 0, f = v, h = 614, c = 3840, g = n, w = 160;
         break e;
        }
        c = n;
        break e;
       } while (0);
       if ((c | 0) == 541065728 | (c | 0) == 4113 & (h | 0) == 9) {
        f = 0;
        do B = +((pc() | 0) << 16 >> 16) * .00390625, o[165960 + (f << 4) >> 2] = B, B = +((pc() | 0) << 16 >> 16) * .00390625, o[165960 + (f << 4) + 4 >> 2] = B, B = +((pc() | 0) << 16 >> 16) * .00390625, o[165960 + (f << 4) + 8 >> 2] = B, f = f + 1 | 0; while ((f | 0) != 3);
       }
       ((c | 0) == 4114 | (c | 0) == 541066752) & u && (C = pc() | 0, j[66128] = C, C = pc() | 0, j[66129] = C, C = pc() | 0, j[66131] = C, C = pc() | 0, j[66130] = C), (c | 0) == 4119 | (c | 0) == 541065472 ? (B = +((pc() | 0) & 65535 | 0) * .00390625, o[33004] = B, (c | 0) == 4120 | (c | 0) == 541065472 && (w = 158)) : (c | 0) == 4120 && (c = 4120, w = 158), (w | 0) == 158 && (B = +((pc() | 0) & 65535 | 0) * .00390625, o[33006] = B), (c | 0) == 8209 & (h | 0) == 2 ? (f = v, h = 2, c = 8209, g = n, w = 160) : (m = h, f = v, h = d, g = n, w = 161);
      } while (0);
      (w | 0) == 160 && (j[284] = 19789, B = +((pc() | 0) & 65535 | 0) * .00390625, o[33004] = B, B = +((pc() | 0) & 65535 | 0) * .00390625, o[33006] = B, m = h, h = d, w = 161);
      do if ((w | 0) == 161) {
       if (w = 0, (c | 112 | 0) == 8304 && (f | 0) == 4 | (f | 0) == 13 && (C = k[140] | 0, kb(C | 0, (rc() | 0) + a | 0, 0) | 0), (c | 0) == 45096) {
        d = k[140] | 0, kb(d | 0, (rc() | 0) + a | 0, 0) | 0, Ee(a, 136, 137), d = h, c = g;
        break;
       }
       if ((c | 0) == 8256) {
        Fe(a, 8256), d = h, c = g;
        break;
       }
       if ((c | 0) == 8224) {
        Ee(a, 257, 258), d = h, c = g;
        break;
       }
       f: do if ((c | 0) == 16385 & m >>> 0 > 500) {
        do if ((m | 0) == 582) d = 50; else {
         if ((m | 0) == 653) {
          d = 68;
          break;
         }
         d = (m | 0) == 5120 ? 142 : 126;
        } while (0);
        for (kb(k[140] | 0, d | 0, 1) | 0, B = +((pc() | 0) & 65535), o[33004] = B, B = +((pc() | 0) & 65535), o[33005] = B, B = +((pc() | 0) & 65535), o[33007] = B, B = +((pc() | 0) & 65535), o[33006] = B, d = d + 18 | 0; ;) {
         if (d >>> 0 > m >>> 0) break f;
         if (pc() | 0, C = pc() | 0, j[65968] = C, C = pc() | 0, j[65972] = C, pc() | 0, C = pc() | 0, j[65976] = C, (j[65972] | 0) == 1170) break;
         d = d + 10 | 0;
        }
       } while (0);
       if ((c | 0) == 16417) {
        if (!(rc() | 0)) {
         d = h, c = g;
         break;
        }
        if (!(rc() | 0)) {
         d = h, c = g;
         break;
        }
        o[33004] = 1024, o[33005] = 1024, o[33006] = 1024, o[33007] = 1024, d = h, c = g;
        break;
       }
       if ((c | 0) == 40993) {
        B = +((rc() | 0) >>> 0), o[33004] = B, B = +((rc() | 0) >>> 0), o[33005] = B, B = +((rc() | 0) >>> 0), o[33007] = B, B = +((rc() | 0) >>> 0), o[33006] = B, d = h, c = g;
        break;
       }
       if ((c | 0) == 41e3) {
        B = +((rc() | 0) >>> 0), o[33004] = +o[33004] - B, B = +((rc() | 0) >>> 0), o[33005] = +o[33005] - B, B = +((rc() | 0) >>> 0), o[33007] = +o[33007] - B, B = +((rc() | 0) >>> 0), o[33006] = +o[33006] - B, d = h, c = g;
        break;
       }
       if ((c | 0) == 45057) {
        d = (pc() | 0) & 65535, k[32982] = d, d = h, c = g;
        break;
       }
       d = h, c = g;
       break;
      } while (0);
      if (kb(k[140] | 0, k[A + 8 >> 2] | 0, 0) | 0, !x) break;
      q = c;
     }
    } else w = 8; else w = 8; while (0);
    if ((w | 0) == 8 && (j[284] = 19789, C = vb(k[140] | 0) | 0, C >>> 0 < 16384 & C >>> 0 < (k[33002] | 0) >>> 0)) for (c = 0, d = 0, e = 0; ;) {
     if (a = pc() | 0, a << 16 >> 16 == 256 & (c | 0) == 256 & (d + -257 | 0) >>> 0 < 383 & (e + -257 | 0) >>> 0 < 383 && (o[33004] = +(d >>> 0), o[33005] = 256, o[33006] = +(e >>> 0), o[33007] = 256), C = vb(k[140] | 0) | 0, !(C >>> 0 < 16384 & C >>> 0 < (k[33002] | 0) >>> 0)) break;
     C = c, d = e, c = a & 65535, e = C;
    }
    j[284] = z;
   } while (0);
   r = A;
  }
  function Lf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, j = 0, m = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, F = 0, G = 0;
   if (F = r, r = r + 512 | 0, b) if ((b | 0) == 2) C = 53, A = -1074; else {
    if ((b | 0) != 1) return q = 0, r = F, +q;
    C = 53, A = -1074;
   } else C = 24, A = -149;
   do b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0; while ((Hf(b) | 0) != 0);
   do {
    if ((b | 0) == 43 | (b | 0) == 45) {
     if (e = 1 - (((b | 0) == 45 & 1) << 1) | 0, b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0) {
      k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0, B = e;
      break;
     }
     b = Nf(a) | 0, B = e;
     break;
    }
    B = 1;
   } while (0);
   e = 0;
   do {
    if ((b | 32 | 0) != (i[625432 + e >> 0] | 0)) break;
    do if (e >>> 0 < 7) {
     if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0) {
      k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0;
      break;
     }
     b = Nf(a) | 0;
     break;
    } while (0);
    e = e + 1 | 0;
   } while (e >>> 0 < 8);
   do if ((e | 0) == 3) y = 23; else if ((e | 0) != 8) {
    if ((c | 0) != 0 & e >>> 0 > 3) {
     if ((e | 0) == 8) break;
     y = 23;
     break;
    }
    do if (!e) {
     if ((b | 32 | 0) == 110) {
      if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, (b | 32 | 0) != 97) break;
      if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, (b | 32 | 0) != 110) break;
      if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, (b | 0) != 40) return k[a + 100 >> 2] | 0 ? (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, q = D, r = F, +q) : (q = D, r = F, +q);
      for (e = 1; ;) {
       if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, !((b + -48 | 0) >>> 0 < 10 | (b + -65 | 0) >>> 0 < 26 || (b | 0) == 95 | (b + -97 | 0) >>> 0 < 26)) break;
       e = e + 1 | 0;
      }
      return (b | 0) == 41 ? (q = D, r = F, +q) : (b = (k[a + 100 >> 2] | 0) == 0, b || (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), c ? (e | 0) == 0 | b ? (q = D, r = F, +q) : (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + (0 - e), q = D, r = F, +q) : (C = wb() | 0, k[C >> 2] = 22, Mf(a, 0), q = 0, r = F, +q));
     }
     do if ((b | 0) == 48) {
      if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, (b | 32 | 0) != 120) {
       if (!(k[a + 100 >> 2] | 0)) {
        b = 48;
        break;
       }
       k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, b = 48;
       break;
      }
      for (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, m = l[b >> 0] | 0, h = 0) : (m = Nf(a) | 0, h = 0); ;) {
       if ((m | 0) == 46) {
        y = 66;
        break;
       }
       if ((m | 0) != 48) {
        b = 0, w = 0, v = 0, e = 0, u = 0, t = 0, n = 1, g = 0, d = 0;
        break;
       }
       b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, m = l[b >> 0] | 0, h = 1) : (m = Nf(a) | 0, h = 1);
      }
      if ((y | 0) == 66) if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, m = l[b >> 0] | 0) : m = Nf(a) | 0, (m | 0) == 48) {
       g = 0, e = 0;
       do b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, m = l[b >> 0] | 0) : m = Nf(a) | 0, g = Eg(g | 0, e | 0, -1, -1) | 0, e = O; while ((m | 0) == 48);
       b = 0, w = 0, v = g, h = 1, u = 1, t = 0, n = 1, g = 0, d = 0;
      } else b = 0, w = 0, v = 0, e = 0, u = 1, t = 0, n = 1, g = 0, d = 0;
      for (;;) {
       if (j = m + -48 | 0, o = m | 32, j >>> 0 < 10) y = 78; else {
        if (s = (m | 0) == 46, !(s | (o + -97 | 0) >>> 0 < 6)) break;
        if (s) {
         if (u) {
          m = 46;
          break;
         }
         s = w, e = b, j = w, u = 1, o = t, f = n;
        } else y = 78;
       }
       if ((y | 0) == 78) {
        y = 0, m = (m | 0) > 57 ? o + -87 | 0 : j;
        do if ((b | 0) < 0 | (b | 0) == 0 & w >>> 0 < 8) o = t, f = n, g = m + (g << 4) | 0; else {
         if ((b | 0) < 0 | (b | 0) == 0 & w >>> 0 < 14) {
          q = n * .0625, o = t, f = q, d += q * +(m | 0);
          break;
         }
         (t | 0) != 0 | (m | 0) == 0 ? (o = t, f = n) : (o = 1, f = n, d += n * .5);
        } while (0);
        j = Eg(w | 0, b | 0, 1, 0) | 0, s = v, b = O, h = 1;
       }
       m = k[a + 4 >> 2] | 0, m >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = m + 1, w = j, v = s, m = l[m >> 0] | 0, t = o, n = f) : (w = j, v = s, m = Nf(a) | 0, t = o, n = f);
      }
      if (!h) return b = (k[a + 100 >> 2] | 0) == 0, b || (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), c ? b || (b = k[a + 4 >> 2] | 0, k[a + 4 >> 2] = b + -1, u && (k[a + 4 >> 2] = b + -2)) : Mf(a, 0), q = +(B | 0) * 0, r = F, +q;
      if (o = (u | 0) == 0, h = o ? w : v, o = o ? b : e, (b | 0) < 0 | (b | 0) == 0 & w >>> 0 < 8) {
       e = w;
       do g <<= 4, e = Eg(e | 0, b | 0, 1, 0) | 0, b = O; while ((b | 0) < 0 | (b | 0) == 0 & e >>> 0 < 8);
      }
      do if ((m | 32 | 0) == 112) {
       if (e = rg(a, c) | 0, b = O, (e | 0) == 0 & (b | 0) == -2147483648) {
        if (c) {
         if (!(k[a + 100 >> 2] | 0)) {
          e = 0, b = 0;
          break;
         }
         k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, e = 0, b = 0;
         break;
        }
        return Mf(a, 0), q = 0, r = F, +q;
       }
      } else k[a + 100 >> 2] | 0 ? (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, e = 0, b = 0) : (e = 0, b = 0); while (0);
      if (z = Ng(h | 0, o | 0, 2) | 0, z = Eg(z | 0, O | 0, -32, -1) | 0, b = Eg(z | 0, O | 0, e | 0, b | 0) | 0, e = O, !g) return q = +(B | 0) * 0, r = F, +q;
      if ((e | 0) > 0 | (e | 0) == 0 & b >>> 0 > (0 - A | 0) >>> 0) return C = wb() | 0, k[C >> 2] = 34, q = +(B | 0) * 1.7976931348623157e308 * 1.7976931348623157e308, r = F, +q;
      if (z = A + -106 | 0, (e | 0) < (((z | 0) < 0) << 31 >> 31 | 0) | (e | 0) == (((z | 0) < 0) << 31 >> 31 | 0) & b >>> 0 < z >>> 0) return C = wb() | 0, k[C >> 2] = 34, q = +(B | 0) * 2.2250738585072014e-308 * 2.2250738585072014e-308, r = F, +q;
      if ((g | 0) > -1) for (;;) {
       if (z = !(d >= .5), h = z & 1 | g << 1, d += z ? d : d + -1, b = Eg(b | 0, e | 0, -1, -1) | 0, e = O, !((h | 0) > -1)) {
        m = b, g = h ^ 1, n = d;
        break;
       }
       g = h ^ 1;
      } else m = b, n = d;
      b = Bg(32, 0, A | 0, ((A | 0) < 0) << 31 >> 31 | 0) | 0, b = Eg(m | 0, e | 0, b | 0, O | 0) | 0, A = O, 0 > (A | 0) | 0 == (A | 0) & C >>> 0 > b >>> 0 ? (b | 0) < 0 ? (e = 0, y = 119) : y = 117 : (b = C, y = 117);
      do if ((y | 0) == 117) {
       if ((b | 0) < 53) {
        e = b, y = 119;
        break;
       }
       f = +(B | 0), d = 0;
      } while (0);
      return (y | 0) == 119 && (d = +(B | 0), b = e, f = d, d = +Pf(+Wf(1, 84 - e | 0), d)), C = (g & 1 | 0) == 0 & (n != 0 & (b | 0) < 32), d = f * (C ? 0 : n) + (d + f * +(((C & 1) + g | 0) >>> 0)) - d, d == 0 && (C = wb() | 0, k[C >> 2] = 34), q = +Xf(d, m), r = F, +q;
     } while (0);
     for (z = A + C | 0, h = 0; ;) {
      if ((b | 0) == 46) {
       y = 130;
       break;
      }
      if ((b | 0) != 48) {
       e = 0, m = 0, t = 0;
       break;
      }
      b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0, h = 1) : (b = Nf(a) | 0, h = 1);
     }
     if ((y | 0) == 130) if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, (b | 0) == 48) for (e = 0, b = 0; ;) {
      if (e = Eg(e | 0, b | 0, -1, -1) | 0, m = O, b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, (b | 0) != 48) {
       h = 1, t = 1;
       break;
      }
      b = m;
     } else e = 0, m = 0, t = 1;
     k[F >> 2] = 0, g = b + -48 | 0, o = (b | 0) == 46;
     a: do if (o | g >>> 0 < 10) {
      v = 0, j = 0, s = h, w = t, x = 0, h = 0, y = 0;
      b: for (;;) {
       do if (o) {
        if (w) break b;
        e = v, m = j, w = 1, t = y;
       } else {
        if (t = Eg(v | 0, j | 0, 1, 0) | 0, j = O, u = (b | 0) != 48, (h | 0) >= 125) {
         if (!u) {
          v = t, t = y;
          break;
         }
         k[F + 496 >> 2] = k[F + 496 >> 2] | 1, v = t, t = y;
         break;
        }
        o = F + (h << 2) | 0, x && (g = b + -48 + ((k[o >> 2] | 0) * 10 | 0) | 0), k[o >> 2] = g, g = x + 1 | 0, v = t, s = 1, x = (g | 0) == 9 ? 0 : g, h = ((g | 0) == 9 & 1) + h | 0, t = u ? t : y;
       } while (0);
       if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, g = b + -48 | 0, o = (b | 0) == 46, !(o | g >>> 0 < 10)) {
        g = w, o = t, y = 153;
        break a;
       }
       y = t;
      }
      t = v, g = (s | 0) != 0, b = x, o = y, y = 161;
     } else v = 0, j = 0, s = h, g = t, x = 0, h = 0, o = 0, y = 153; while (0);
     do if ((y | 0) == 153) {
      if (g = (g | 0) == 0, e = g ? v : e, m = g ? j : m, g = (s | 0) != 0, !((b | 32 | 0) == 101 & g)) {
       if ((b | 0) > -1) {
        t = v, b = x, y = 161;
        break;
       }
       s = v, b = x, y = 163;
       break;
      }
      if (g = rg(a, c) | 0, b = O, (g | 0) == 0 & (b | 0) == -2147483648) {
       if (!c) {
        Mf(a, 0), d = 0;
        break;
       }
       k[a + 100 >> 2] | 0 ? (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, g = 0, b = 0) : (g = 0, b = 0);
      }
      e = Eg(g | 0, b | 0, e | 0, m | 0) | 0, s = v, m = O, b = x, y = 165;
     } while (0);
     (y | 0) == 161 && (k[a + 100 >> 2] | 0 ? (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, g ? (s = t, y = 165) : y = 164) : (s = t, y = 163)), (y | 0) == 163 && (y = g ? 165 : 164);
     do if ((y | 0) == 164) C = wb() | 0, k[C >> 2] = 22, Mf(a, 0), d = 0; else if ((y | 0) == 165) {
      if (g = k[F >> 2] | 0, !g) {
       d = +(B | 0) * 0;
       break;
      }
      if (((j | 0) < 0 | (j | 0) == 0 & s >>> 0 < 10) & ((e | 0) == (s | 0) & (m | 0) == (j | 0)) && C >>> 0 > 30 | (g >>> C | 0) == 0) {
       d = +(B | 0) * +(g >>> 0);
       break;
      }
      if (a = (A | 0) / -2 | 0, (m | 0) > (((a | 0) < 0) << 31 >> 31 | 0) | (m | 0) == (((a | 0) < 0) << 31 >> 31 | 0) & e >>> 0 > a >>> 0) {
       C = wb() | 0, k[C >> 2] = 34, d = +(B | 0) * 1.7976931348623157e308 * 1.7976931348623157e308;
       break;
      }
      if (a = A + -106 | 0, (m | 0) < (((a | 0) < 0) << 31 >> 31 | 0) | (m | 0) == (((a | 0) < 0) << 31 >> 31 | 0) & e >>> 0 < a >>> 0) {
       C = wb() | 0, k[C >> 2] = 34, d = +(B | 0) * 2.2250738585072014e-308 * 2.2250738585072014e-308;
       break;
      }
      if (b) {
       if ((b | 0) < 9) {
        g = F + (h << 2) | 0, j = k[g >> 2] | 0;
        do j = j * 10 | 0, b = b + 1 | 0; while ((b | 0) != 9);
        k[g >> 2] = j;
       }
       h = h + 1 | 0;
      }
      if ((o | 0) < 9 && (o | 0) <= (e | 0) & (e | 0) < 18) {
       if ((e | 0) == 9) {
        d = +(B | 0) * +((k[F >> 2] | 0) >>> 0);
        break;
       }
       if ((e | 0) < 9) {
        d = +(B | 0) * +((k[F >> 2] | 0) >>> 0) / +(k[625448 + (8 - e << 2) >> 2] | 0);
        break;
       }
       if (a = C + 27 + (ka(e, -3) | 0) | 0, b = k[F >> 2] | 0, (a | 0) > 30 | (b >>> a | 0) == 0) {
        d = +(B | 0) * +(b >>> 0) * +(k[625448 + (e + -10 << 2) >> 2] | 0);
        break;
       }
      }
      if (b = (e | 0) % 9 | 0) {
       if (o = (e | 0) > -1 ? b : b + 9 | 0, m = k[625448 + (8 - o << 2) >> 2] | 0, h) {
        g = 0, b = 0, j = 0;
        do x = F + (j << 2) | 0, c = k[x >> 2] | 0, a = ((c >>> 0) / (m >>> 0) | 0) + b | 0, k[x >> 2] = a, b = ka((c >>> 0) % (m >>> 0) | 0, 1e9 / (m | 0) | 0) | 0, a = (j | 0) == (g | 0) & (a | 0) == 0, j = j + 1 | 0, e = a ? e + -9 | 0 : e, g = a ? j & 127 : g; while ((j | 0) != (h | 0));
        b && (k[F + (h << 2) >> 2] = b, h = h + 1 | 0);
       } else g = 0, h = 0;
       b = 0, e = 9 - o + e | 0;
      } else g = 0, b = 0;
      c: for (;;) {
       if (s = F + (g << 2) | 0, (e | 0) < 18) {
        do {
         for (j = 0, m = h + 127 | 0; ;) {
          if (o = m & 127, m = Ng(k[F + (o << 2) >> 2] | 0, 0, 29) | 0, j = Eg(m | 0, O | 0, j | 0, 0) | 0, m = O, m >>> 0 > 0 | (m | 0) == 0 & j >>> 0 > 1e9 ? (a = Ug(j | 0, m | 0, 1e9, 0) | 0, j = Vg(j | 0, m | 0, 1e9, 0) | 0, m = a) : m = 0, k[F + (o << 2) >> 2] = j, a = (o | 0) == (g | 0), h = (o | 0) != (h + 127 & 127 | 0) | a ? h : (j | 0) == 0 ? o : h, a) break;
          j = m, m = o + -1 | 0;
         }
         b = b + -29 | 0;
        } while ((m | 0) == 0);
        j = m;
       } else {
        if ((e | 0) != 18) break;
        do {
         if ((k[s >> 2] | 0) >>> 0 >= 9007199) {
          e = 18;
          break c;
         }
         for (j = 0, m = h + 127 | 0; ;) {
          if (o = m & 127, m = Ng(k[F + (o << 2) >> 2] | 0, 0, 29) | 0, m = Eg(m | 0, O | 0, j | 0, 0) | 0, j = O, j >>> 0 > 0 | (j | 0) == 0 & m >>> 0 > 1e9 ? (a = Ug(m | 0, j | 0, 1e9, 0) | 0, m = Vg(m | 0, j | 0, 1e9, 0) | 0, j = a) : j = 0, k[F + (o << 2) >> 2] = m, a = (o | 0) == (g | 0), h = (o | 0) != (h + 127 & 127 | 0) | a ? h : (m | 0) == 0 ? o : h, a) break;
          m = o + -1 | 0;
         }
         b = b + -29 | 0;
        } while ((j | 0) == 0);
       }
       g = g + 127 & 127, (g | 0) == (h | 0) && (a = h + 127 & 127, h = F + ((h + 126 & 127) << 2) | 0, k[h >> 2] = k[h >> 2] | k[F + (a << 2) >> 2], h = a), k[F + (g << 2) >> 2] = j, e = e + 9 | 0;
      }
      d: for (;;) {
       for (u = h + 1 & 127, t = F + ((h + 127 & 127) << 2) | 0; ;) {
        for (j = (e | 0) == 18, s = (e | 0) > 27 ? 9 : 1, v = g; ;) {
         o = v & 127, g = (o | 0) == (h | 0);
         do if (g) y = 215; else {
          if (m = k[F + (o << 2) >> 2] | 0, m >>> 0 < 9007199) {
           y = 215;
           break;
          }
          if (m >>> 0 > 9007199) break;
          if (m = v + 1 & 127, (m | 0) == (h | 0)) {
           y = 215;
           break;
          }
          if (m = k[F + (m << 2) >> 2] | 0, m >>> 0 < 254740991) {
           y = 215;
           break;
          }
          if (!(m >>> 0 > 254740991 | j ^ 1)) {
           e = o;
           break d;
          }
         } while (0);
         if ((y | 0) == 215 && (y = 0, j)) {
          y = 216;
          break d;
         }
         if (b = b + s | 0, (v | 0) != (h | 0)) break;
         v = h;
        }
        g = v, o = 0, m = v;
        do x = F + (m << 2) | 0, c = k[x >> 2] | 0, a = (c >>> s) + o | 0, k[x >> 2] = a, o = ka(c & (1 << s) + -1, 1e9 >>> s) | 0, a = (m | 0) == (g | 0) & (a | 0) == 0, m = m + 1 & 127, e = a ? e + -9 | 0 : e, g = a ? m : g; while ((m | 0) != (h | 0));
        if (o) {
         if ((u | 0) != (g | 0)) break;
         k[t >> 2] = k[t >> 2] | 1;
        }
       }
       k[F + (h << 2) >> 2] = o, h = u;
      }
      (y | 0) == 216 && (g ? (k[F + (u + -1 << 2) >> 2] = 0, e = h, h = u) : e = o), d = +((k[F + (e << 2) >> 2] | 0) >>> 0), e = v + 1 & 127, (e | 0) == (h | 0) && (h = v + 2 & 127, k[F + (h + -1 << 2) >> 2] = 0), q = +(B | 0), f = q * (d * 1e9 + +((k[F + (e << 2) >> 2] | 0) >>> 0)), j = b + 53 | 0, o = j - A | 0, g = (o | 0) < (C | 0), e = g ? (o | 0) < 0 ? 0 : o : C, (e | 0) < 53 ? (G = +Pf(+Wf(1, 105 - e | 0), f), n = +Tf(f, +Wf(1, 53 - e | 0)), p = G, d = n, n = G + (f - n)) : (p = 0, d = 0, n = f), m = v + 2 & 127;
      do if ((m | 0) == (h | 0)) f = d; else {
       m = k[F + (m << 2) >> 2] | 0;
       do {
        if (!(m >>> 0 < 5e8)) {
         if (m >>> 0 > 5e8) {
          d = q * .75 + d;
          break;
         }
         if ((v + 3 & 127 | 0) == (h | 0)) {
          d = q * .5 + d;
          break;
         }
         d = q * .75 + d;
         break;
        }
        if (!m && (v + 3 & 127 | 0) == (h | 0)) break;
        d = q * .25 + d;
       } while (0);
       if ((53 - e | 0) <= 1) {
        f = d;
        break;
       }
       if (+Tf(d, 1) != 0) {
        f = d;
        break;
       }
       f = d + 1;
      } while (0);
      d = n + f - p;
      do if ((j & 2147483647 | 0) > (-2 - z | 0)) {
       if (+Z(+d) >= 9007199254740992 ? (e = g & (e | 0) == (o | 0) ? 0 : g & 1, b = b + 1 | 0, d *= .5) : e = g & 1, (b + 50 | 0) <= (0 - z | 0) && !(f != 0 & (e | 0) != 0)) break;
       C = wb() | 0, k[C >> 2] = 34;
      } while (0);
      d = +Xf(d, b);
     } while (0);
     return G = d, r = F, +G;
    } while (0);
    return k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), C = wb() | 0, k[C >> 2] = 22, Mf(a, 0), G = 0, r = F, +G;
   } while (0);
   return (y | 0) == 23 && k[a + 100 >> 2] | 0 && (b = k[a + 4 >> 2] | 0, k[a + 4 >> 2] = b + -1, e >>> 0 < 4 | (c | 0) == 0 || (k[a + 4 >> 2] = b + (2 - e))), G = +(B | 0) * E, r = F, +G;
  }
  function fd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, p = 0, q = 0, s = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0;
   if (E = r, r = r + 384 | 0, (k[26] | 0) == 0 & (k[33050] | 0) != 0 && (kb(k[140] | 0, k[33e3] | 0, 0) | 0, C = pc() | 0, j[284] = C, kb(k[140] | 0, 6, 1) | 0, C = k[140] | 0, a = k[33e3] | 0, kb(C | 0, (rc() | 0) + a | 0, 0) | 0, a = rc() | 0, rc() | 0, a)) {
    for (A = 2147483647, B = 0, d = 0, e = 0; ;) {
     a = a + -1 | 0, q = rc() | 0, b = rc() | 0, z = rc() | 0, C = vb(k[140] | 0) | 0, kb(k[140] | 0, (k[33e3] | 0) + z | 0, 0) | 0;
     a: do switch (q | 0) {
     case 1042:
      kb(k[140] | 0, 36, 1) | 0, b = ((pc() | 0) & 65535) - (k[33054] | 0) | 0, b = (b | 0) > -1 ? b : 0 - b | 0, (A | 0) > (b | 0) ? c = (vb(k[140] | 0) | 0) + -38 | 0 : (b = A, c = B);
      break;

     case 1049:
      rc() | 0, rc() | 0, b = rc() | 0, rc() | 0, z = rc() | 0, rc() | 0, D = rc() | 0, y = rc() | 0, x = rc() | 0, f = (+o[33060] - (k[t >> 2] = x, +o[t >> 2])) * (k[t >> 2] = y, +o[t >> 2]) + 1 + (k[t >> 2] = z, +o[t >> 2]), k[t >> 2] = D, g = +o[t >> 2], k[t >> 2] = b, h = +o[t >> 2], b = 0;
      do l = +(b | 0), l = h + l * (l * g + f) < 65535 ? h + l * (l * g + f) : 65535, j[576 + (b << 1) >> 1] = l < 0 ? 0 : ~~l & 65535, b = b + 1 | 0; while ((b | 0) != 65536);
      D = 7;
      break;

     case 1025:
      ed(1, 2), b = A, c = B;
      break;

     case 1035:
      ed(0, 4), b = A, c = B;
      break;

     case 1050:
      b = rc() | 0, D = rc() | 0, z = rc() | 0, y = rc() | 0, k[t >> 2] = y, f = +o[t >> 2], k[t >> 2] = z, g = +o[t >> 2], k[t >> 2] = D, h = +o[t >> 2], k[t >> 2] = b, l = +o[t >> 2], b = 0;
      do F = +(b | 0), z = F + (F * (F * (F * (F * 0 + f) + g) + h) + l) < 65535, D = (z ? F + (F * (F * (F * (F * 0 + f) + g) + h) + l) : 65535) < 0, j[576 + (b << 1) >> 1] = ~~(D | z ^ 1 ? D ? 0 : 65535 : F + (F * (F * (F * (F * 0 + f) + g) + h) + l)), b = b + 1 | 0; while ((b | 0) != 65536);
      D = 7;
      break;

     case 1024:
      if ((b + -8 | 0) > -1) {
       y = b + -8 | 0;
       do {
        w = pc() | 0, n = pc() | 0, b = pc() | 0, pc() | 0, x = j[65896] | 0;
        do if ((w & 65535) < (x & 65535)) {
         if (b << 16 >> 16 == 129) {
          if ((n & 65535) >= (m[65916] | 0)) break;
          b = (((k[80] | 0) >>> (((n & 65535) - (m[168] | 0) << 1 & 14 | (w & 65535) - (m[164] | 0) & 1) << 1) & 3 | 0) != 1 & 1) << 2, q = b, c = 0;
          do c = (dd((i[300104 + (q << 1) >> 0] | 0) + (n & 65535) | 0, (i[300104 + (q << 1) + 1 >> 0] | 0) + (w & 65535) | 0) | 0) + c | 0, q = q + 1 | 0; while ((q | 0) < (b | 8 | 0));
          z = (ka(x & 65535, n & 65535) | 0) + (w & 65535) | 0, j[(k[32946] | 0) + (z << 1) >> 1] = (c + 4 | 0) >>> 3;
          break;
         }
         if (!(b << 16 >> 16 == 131 | b << 16 >> 16 == 137)) break;
         if (u = j[65916] | 0, u << 16 >> 16) {
          n = k[80] | 0, p = j[168] | 0, s = j[164] | 0, v = 0;
          do {
           if ((n >>> ((v - (p & 65535) << 1 & 14 | (w & 65535) - (s & 65535) & 1) << 1) & 3 | 0) == 1) {
            b = 0, c = 0;
            do z = dd((i[300104 + (b << 1) >> 0] | 0) + v | 0, (i[300104 + (b << 1) + 1 >> 0] | 0) + (w & 65535) | 0) | 0, k[E + 192 + (b << 2) >> 2] = z, c = z + c | 0, b = b + 1 | 0; while ((b | 0) != 4);
            b = 0, q = 0;
            do z = (k[E + 192 + (b << 2) >> 2] << 2) - c | 0, z = (z | 0) > -1 ? z : 0 - z | 0, k[E + 24 + (b << 2) >> 2] = z, q = (k[E + 24 + (q << 2) >> 2] | 0) < (z | 0) ? b : q, b = b + 1 | 0; while ((b | 0) != 4);
            z = (ka(x & 65535, v) | 0) + (w & 65535) | 0, j[(k[32946] | 0) + (z << 1) >> 1] = ~~(+(c - (k[E + 192 + (q << 2) >> 2] | 0) | 0) / 3 + .5);
           } else {
            b = 8, q = 0;
            do q = (dd((i[300104 + (b << 1) >> 0] | 0) + v | 0, (i[300104 + (b << 1) + 1 >> 0] | 0) + (w & 65535) | 0) | 0) + q | 0, b = b + 1 | 0; while ((b | 0) != 12);
            c = dd(v, (w & 65535) + -2 | 0) | 0, c = ~~(+(q | 0) * .0732233 + .5 + +((dd(v, (w & 65535) + 2 | 0) | 0) + c | 0) * .3535534) & 65535, z = (ka(x & 65535, v) | 0) + (w & 65535) | 0, j[(k[32946] | 0) + (z << 1) >> 1] = c;
           }
           v = v + 1 | 0;
          } while ((v | 0) != (u & 65535 | 0));
         }
        } while (0);
        y = y + -8 | 0;
       } while ((y | 0) > -1);
       b = A, c = B;
      } else b = A, c = B;
      break;

     case 1040:
     case 1046:
      ed(0, 2), b = A, c = B;
      break;

     default:
      if (!((d | 0) != 0 | (q | 0) != 1055)) {
       b = 0;
       do z = (rc() | 0) & 65535, j[E + 224 + (b << 1) >> 1] = z, b = b + 1 | 0; while ((b | 0) != 16);
       b = 0;
       do z = (rc() | 0) & 65535, j[E + 224 + 32 + (b << 1) >> 1] = z, b = b + 1 | 0; while ((b | 0) != 16);
       b = 0;
       do z = (rc() | 0) & 65535, j[E + 224 + 64 + (b << 1) >> 1] = z, b = b + 1 | 0; while ((b | 0) != 16);
       b = 0;
       do z = (rc() | 0) & 65535, j[E + 224 + 96 + (b << 1) >> 1] = z, b = b + 1 | 0; while ((b | 0) != 16);
       b = 0;
       do j[E + 352 + (b << 1) >> 1] = ((m[E + 224 + 96 + (b << 1) >> 1] | 0) + ((m[E + 224 + 64 + (b << 1) >> 1] | 0) + ((m[E + 224 + 32 + (b << 1) >> 1] | 0) + (m[E + 224 + (b << 1) >> 1] | 0))) + 2 | 0) >>> 2, b = b + 1 | 0; while ((b | 0) != 16);
       w = (m[E + 352 + 30 >> 1] | 0) * 65535 | 0, z = 0;
       do {
        x = (z | 0) != 0, y = 0;
        do {
         d = 0;
         do v = d, d = d + 1 | 0, k[E + 116 + (d << 2) >> 2] = m[E + 224 + (z << 6) + (y << 5) + (v << 1) >> 1], k[E + 40 + (d << 2) >> 2] = m[E + 352 + (v << 1) >> 1]; while ((d | 0) != 16);
         if (k[E + 40 >> 2] = 0, k[E + 116 >> 2] = 0, v = (w >>> 0) / ((m[E + 224 + (z << 6) + (y << 5) + 30 >> 1] | 0) >>> 0) | 0, k[E + 40 + 68 >> 2] = v, k[E + 116 + 68 >> 2] = v, k[E + 40 + 72 >> 2] = 65535, k[E + 116 + 72 >> 2] = 65535, vc(E + 116 | 0, E + 40 | 0, 19), v = k[33058] | 0, d = x ? v : 0, n = (y | 0) != 0, p = k[33056] | 0, s = n ? p : 0, u = k[32946] | 0, v = x ? m[65916] | 0 : v, d >>> 0 < v >>> 0) {
          c = j[65896] | 0;
          do {
           if (b = n ? c & 65535 : p, s >>> 0 < b >>> 0) {
            q = s;
            do G = u + ((ka(c & 65535, d) | 0) + q << 1) | 0, j[G >> 1] = j[576 + (m[G >> 1] << 1) >> 1] | 0, q = q + 1 | 0; while ((q | 0) != (b | 0));
           }
           d = d + 1 | 0;
          } while ((d | 0) != (v | 0));
         }
         y = y + 1 | 0;
        } while ((y | 0) != 2);
        z = z + 1 | 0;
       } while ((z | 0) != 2);
       b = A, c = B, d = 1;
       break a;
      }
      if (b = (e | 0) != 0, !(b | (q | 0) != 1054)) {
       if (k[E >> 2] = 1065353216, k[E + 4 >> 2] = 1065353216, rc() | 0, rc() | 0, rc() | 0, rc() | 0, e = rc() | 0, o[E >> 2] = (k[t >> 2] = e, +o[t >> 2] + 1), rc() | 0, rc() | 0, rc() | 0, rc() | 0, rc() | 0, e = rc() | 0, o[E + 4 >> 2] = (k[t >> 2] = e, +o[t >> 2] + 1), rc() | 0, rc() | 0, rc() | 0, e = rc() | 0, o[E + 8 >> 2] = (k[t >> 2] = e, +o[t >> 2] + 1), rc() | 0, rc() | 0, rc() | 0, e = rc() | 0, o[E + 12 >> 2] = (k[t >> 2] = e, +o[t >> 2] + 1), e = k[33056] | 0, p = k[33058] | 0, s = k[32946] | 0, u = j[65916] | 0, !(u << 16 >> 16)) {
        b = A, c = B, e = 1;
        break a;
       }
       for (n = j[65896] | 0, b = n, v = 0; ;) {
        if (c = v >>> 0 >= p >>> 0 & 1, b << 16 >> 16) {
         b &= 65535, q = 0;
         do G = s + ((ka(b, v) | 0) + q << 1) | 0, z = ~~(+o[E + (c << 3) + ((q >>> 0 >= e >>> 0 & 1) << 2) >> 2] * +(m[G >> 1] | 0)), z = (z | 0) < 65535 ? z : 65535, j[G >> 1] = (z | 0) < 0 ? 0 : z & 65535, q = q + 1 | 0, b = n & 65535; while (q >>> 0 < b >>> 0);
         b = n;
        } else b = 0;
        if (v = v + 1 | 0, (v | 0) == (u & 65535 | 0)) {
         b = A, c = B, e = 1;
         break a;
        }
       }
      }
      if (b | (q | 0) != 1073) b = A, c = B; else {
       c = (rc() | 0) & 65535, j[E + 208 >> 1] = c, c = (rc() | 0) & 65535, j[E + 208 + 2 >> 1] = c, c = (rc() | 0) & 65535, j[E + 208 + 4 >> 1] = c, c = (rc() | 0) & 65535, j[E + 208 + 6 >> 1] = c, c = (rc() | 0) & 65535, j[E + 208 + 8 >> 1] = c, c = (rc() | 0) & 65535, j[E + 208 + 10 >> 1] = c, c = (rc() | 0) & 65535, j[E + 208 + 12 >> 1] = c, c = 0;
       do {
        b = 0;
        do G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) >> 1] = G, G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) + 2 >> 1] = G, G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) + 4 >> 1] = G, G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) + 6 >> 1] = G, G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) + 8 >> 1] = G, G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) + 10 >> 1] = G, G = (rc() | 0) & 65535, j[E + 224 + (c * 28 | 0) + (b * 14 | 0) + 12 >> 1] = G, b = b + 1 | 0; while ((b | 0) != 2);
        c = c + 1 | 0;
       } while ((c | 0) != 2);
       x = 0;
       do {
        v = (x | 0) != 0, w = 0;
        do {
         b = 0;
         do G = m[E + 208 + (b << 1) >> 1] | 0, z = b, b = b + 1 | 0, k[E + 116 + (b << 2) >> 2] = G, G = ((ka(m[E + 224 + (x * 28 | 0) + (w * 14 | 0) + (z << 1) >> 1] | 0, G) | 0) >>> 0) / 1e4 | 0, k[E + 40 + (b << 2) >> 2] = G; while ((b | 0) != 7);
         if (k[E + 40 >> 2] = 0, k[E + 116 >> 2] = 0, k[E + 40 + 32 >> 2] = 65535, k[E + 116 + 32 >> 2] = 65535, vc(E + 116 | 0, E + 40 | 0, 9), u = k[33058] | 0, d = v ? u : 0, n = (w | 0) != 0, e = k[33056] | 0, p = n ? e : 0, s = k[32946] | 0, u = v ? m[65916] | 0 : u, d >>> 0 < u >>> 0) {
          c = j[65896] | 0;
          do {
           if (b = n ? c & 65535 : e, p >>> 0 < b >>> 0) {
            q = p;
            do G = s + ((ka(c & 65535, d) | 0) + q << 1) | 0, j[G >> 1] = j[576 + (m[G >> 1] << 1) >> 1] | 0, q = q + 1 | 0; while ((q | 0) != (b | 0));
           }
           d = d + 1 | 0;
          } while ((d | 0) != (u | 0));
         }
         w = w + 1 | 0;
        } while ((w | 0) != 2);
        x = x + 1 | 0;
       } while ((x | 0) != 2);
       b = A, c = B, d = 1, e = 1;
      }
     } while (0);
     if ((D | 0) == 7) if (D = 0, b = k[33056] & 0 - (q & 1), c = k[32946] | 0, n = j[65916] | 0, n << 16 >> 16) {
      s = 0;
      do {
       if (p = j[65896] | 0, b >>> 0 < (p & 65535) >>> 0) {
        q = b;
        do G = c + ((ka(p & 65535, s) | 0) + q << 1) | 0, j[G >> 1] = j[576 + (m[G >> 1] << 1) >> 1] | 0, q = q + 1 | 0; while ((q | 0) != (p & 65535 | 0));
       }
       s = s + 1 | 0;
      } while ((s | 0) != (n & 65535 | 0));
      b = A, c = B;
     } else b = A, c = B;
     if (kb(k[140] | 0, C | 0, 0) | 0, !a) break;
     A = b, B = c;
    }
    if (c) {
     if (kb(k[140] | 0, c | 0, 0) | 0, rc() | 0, x = rc() | 0, d = rc() | 0, y = rc() | 0, q = rc() | 0, rc() | 0, rc() | 0, rc() | 0, rc() | 0, z = ka(y & 32767, x & 32767) | 0, w = ka(q & 32767, d & 32767) | 0, A = wg(w + z | 0, 6) | 0, mc(A, 300128), pc() | 0, z) {
      a = ka(y & 32767, x & 32767) | 0, b = 0;
      do G = rc() | 0, k[A + (b << 2) >> 2] = G, b = b + 1 | 0; while ((b | 0) != (a | 0));
     }
     if (w) {
      a = ka(q & 32767, d & 32767) | 0, b = 0;
      do G = rc() | 0, k[A + (z + b << 2) >> 2] = G, b = b + 1 | 0; while ((b | 0) != (a | 0));
     }
     if (z) {
      a = ka(y & 32767, x & 32767) | 0, b = 0;
      do G = pc() | 0, j[A + (w + z << 2) + (b << 1) >> 1] = G, b = b + 1 | 0; while ((b | 0) != (a | 0));
     }
     if (w) {
      a = ka(q & 32767, d & 32767) | 0, b = 0;
      do G = pc() | 0, j[A + (w + z << 2) + (z + b << 1) >> 1] = G, b = b + 1 | 0; while ((b | 0) != (a | 0));
     }
     if (u = k[32946] | 0, s = j[65916] | 0, s << 16 >> 16) {
      p = j[65896] | 0, a = p, v = 0;
      do {
       if (h = +(v >>> 0), a << 16 >> 16) {
        a &= 65535, e = 0;
        do {
         for (g = +(e >>> 0) * +(y & 32767 | 0) / +(a | 0), c = u + ((ka(a, v) | 0) + e << 1) | 0, f = +(m[c >> 1] | 0) * .5, n = ~~g; ;) {
          if (d = ka(x & 32767, n) | 0, x & 32767) {
           a = 0;
           do {
            if (q = d + a | 0, b = m[A + (w + z << 2) + (q << 1) >> 1] | 0, f < +(b | 0)) break;
            a = a + 1 | 0;
           } while ((a | 0) < (x & 32767 | 0));
           (a | 0) == 0 | (a | 0) == (x & 32767 | 0) ? (a = q, D = 93) : (d = q + -1 | 0, l = (+(b | 0) - f) / +(b - (m[A + (w + z << 2) + (q + -1 << 1) >> 1] | 0) | 0), a = q);
          } else a = 0, D = 93;
          if ((D | 0) == 93 && (D = 0, d = a + -1 | 0, l = 0), o[E + 16 + (n - ~~g << 2) >> 2] = l * +o[A + (d << 2) >> 2] + (1 - l) * +o[A + (a << 2) >> 2], !((n | 0) < (~~g + 1 | 0))) break;
          n = n + 1 | 0;
         }
         a = ~~((f + h * ((1 - (g - +(~~g | 0))) * +o[E + 16 >> 2] + (g - +(~~g | 0)) * +o[E + 16 + 4 >> 2])) * 2), a = (a | 0) < 65535 ? a : 65535, j[c >> 1] = (a | 0) < 0 ? 0 : a & 65535, e = e + 1 | 0, a = p & 65535;
        } while (e >>> 0 < a >>> 0);
        a = p;
       } else a = 0;
       v = v + 1 | 0;
      } while ((v | 0) != (s & 65535 | 0));
     }
     vg(A);
    }
   }
   r = E;
  }
  function yf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, m = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0;
   if (B = r, r = r + 304 | 0, d = i[b >> 0] | 0, !(d << 24 >> 24)) return A = 0, r = B, A | 0;
   z = B + 33 + 10 | 0, n = d, d = 0, s = b, t = 0, e = 0, b = 0;
   a: for (;;) {
    b: do if (Hf(n & 255) | 0) {
     for (g = s; ;) {
      if (f = g + 1 | 0, !(Hf(l[f >> 0] | 0) | 0)) break;
      g = f;
     }
     Mf(a, 0);
     do f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0; while ((Hf(f) | 0) != 0);
     f = k[a + 4 >> 2] | 0, k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = f + -1, f = f + -1 | 0), f = (k[a + 108 >> 2] | 0) + t + f - (k[a + 8 >> 2] | 0) | 0;
    } else {
     f = n << 24 >> 24 == 37;
     c: do if (f) {
      m = s + 1 | 0, g = i[m >> 0] | 0;
      do if (g << 24 >> 24 == 42) f = 0, m = s + 2 | 0; else {
       if (g << 24 >> 24 == 37) break c;
       if (((g & 255) + -48 | 0) >>> 0 < 10 && (i[s + 2 >> 0] | 0) == 36) {
        for (k[B + 16 >> 2] = k[c >> 2], g = (g & 255) + -48 | 0; ;) {
         if (y = (k[B + 16 >> 2] | 0) + 3 & -4, f = k[y >> 2] | 0, k[B + 16 >> 2] = y + 4, !(g >>> 0 > 1)) break;
         g = g + -1 | 0;
        }
        m = s + 3 | 0;
        break;
       }
       y = (k[c >> 2] | 0) + 3 & -4, f = k[y >> 2] | 0, k[c >> 2] = y + 4;
      } while (0);
      if (g = i[m >> 0] | 0, ((g & 255) + -48 | 0) >>> 0 < 10) for (q = g & 255, g = 0; ;) {
       if (n = (g * 10 | 0) + -48 + q | 0, m = m + 1 | 0, g = i[m >> 0] | 0, q = g & 255, (q + -48 | 0) >>> 0 >= 10) {
        s = n;
        break;
       }
       g = n;
      } else s = 0;
      switch (g << 24 >> 24 == 109 ? (m = m + 1 | 0, g = i[m >> 0] | 0, y = (f | 0) != 0 & 1, e = 0, b = 0) : y = 0, n = m + 1 | 0, g & 255 | 0) {
      case 110:
      case 112:
      case 67:
      case 83:
      case 91:
      case 99:
      case 115:
      case 88:
      case 71:
      case 70:
      case 69:
      case 65:
      case 103:
      case 102:
      case 101:
      case 97:
      case 120:
      case 117:
      case 111:
      case 105:
      case 100:
       g = m, n = 0;
       break;

      case 108:
       x = (i[n >> 0] | 0) == 108, g = x ? m + 2 | 0 : n, n = x ? 3 : 1;
       break;

      case 106:
       g = n, n = 3;
       break;

      case 116:
      case 122:
       g = n, n = 1;
       break;

      case 76:
       g = n, n = 2;
       break;

      case 104:
       x = (i[n >> 0] | 0) == 104, g = x ? m + 2 | 0 : n, n = x ? -2 : -1;
       break;

      default:
       f = y, A = 163;
       break a;
      }
      if (w = l[g >> 0] | 0, v = (w & 47 | 0) == 3 ? w | 32 : w, w = (w & 47 | 0) == 3 ? 1 : n, (v | 0) == 91) x = t, u = s; else if ((v | 0) == 110) {
       if (!f) {
        f = t;
        break b;
       }
       switch (w | 0) {
       case -2:
        i[f >> 0] = t, f = t;
        break b;

       case -1:
        j[f >> 1] = t, f = t;
        break b;

       case 0:
        k[f >> 2] = t, f = t;
        break b;

       case 3:
        k[f >> 2] = t, k[f + 4 >> 2] = ((t | 0) < 0) << 31 >> 31, f = t;
        break b;

       case 1:
        k[f >> 2] = t, f = t;
        break b;

       default:
        f = t;
        break b;
       }
      } else if ((v | 0) == 99) x = t, u = (s | 0) < 1 ? 1 : s; else {
       Mf(a, 0);
       do n = k[a + 4 >> 2] | 0, n >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = n + 1, n = l[n >> 0] | 0) : n = Nf(a) | 0; while ((Hf(n) | 0) != 0);
       n = k[a + 4 >> 2] | 0, k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = n + -1, n = n + -1 | 0), x = (k[a + 108 >> 2] | 0) + t + n - (k[a + 8 >> 2] | 0) | 0, u = s;
      }
      if (Mf(a, u), n = k[a + 4 >> 2] | 0, m = k[a + 100 >> 2] | 0, n >>> 0 < m >>> 0) k[a + 4 >> 2] = n + 1; else {
       if ((Nf(a) | 0) < 0) {
        f = y, A = 163;
        break a;
       }
       m = k[a + 100 >> 2] | 0;
      }
      m && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1);
      d: do switch (v | 0) {
      case 91:
      case 99:
      case 115:
       e: do if ((v & 239 | 0) == 99) Jg(B + 33 | 0, -1, 257) | 0, i[B + 33 >> 0] = 0, (v | 0) == 115 && (i[B + 33 + 33 >> 0] = 0, i[z >> 0] = 0, i[z + 1 >> 0] = 0, i[z + 2 >> 0] = 0, i[z + 3 >> 0] = 0, i[z + 4 >> 0] = 0); else for (n = g + 1 | 0, q = (i[n >> 0] | 0) == 94, s = q ? n : g, g = q ? g + 2 | 0 : n, Jg(B + 33 | 0, q & 1 | 0, 257) | 0, i[B + 33 >> 0] = 0, n = i[g >> 0] | 0, n << 24 >> 24 == 45 ? (i[B + 33 + 46 >> 0] = q & 1 ^ 1, t = (q & 1 ^ 1) & 255, g = s + 2 | 0) : n << 24 >> 24 == 93 ? (i[B + 33 + 94 >> 0] = q & 1 ^ 1, t = (q & 1 ^ 1) & 255, g = s + 2 | 0) : t = (q & 1 ^ 1) & 255; ;) {
        if (n = i[g >> 0] | 0, n << 24 >> 24 == 45) if (s = g + 1 | 0, n = i[s >> 0] | 0, n << 24 >> 24 == 93 | n << 24 >> 24 == 0) n = 45; else if (q = i[g + -1 >> 0] | 0, (q & 255) < (n & 255)) {
         q &= 255;
         do q = q + 1 | 0, i[B + 33 + q >> 0] = t, n = i[s >> 0] | 0; while ((q | 0) < (n & 255 | 0));
         g = s;
        } else g = s; else {
         if (n << 24 >> 24 == 93) break e;
         if (!(n << 24 >> 24)) {
          f = y, A = 163;
          break a;
         }
        }
        i[B + 33 + ((n & 255) + 1) >> 0] = t, g = g + 1 | 0;
       } while (0);
       s = (v | 0) == 99 ? u + 1 | 0 : 31, t = (y | 0) != 0;
       f: do if ((w | 0) == 1) {
        if (t) {
         if (b = ug(s << 2) | 0, !b) {
          f = y, e = 0, A = 163;
          break a;
         }
        } else b = f;
        k[B >> 2] = 0, k[B + 4 >> 2] = 0, n = 0;
        g: for (;;) {
         if (b) {
          if (!t) {
           e = n, A = 99;
           break;
          }
          for (;;) {
           for (;;) {
            if (e = k[a + 4 >> 2] | 0, e >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = e + 1, e = l[e >> 0] | 0) : e = Nf(a) | 0, !(i[B + 33 + (e + 1) >> 0] | 0)) break g;
            if (i[B + 32 >> 0] = e, e = uf(B + 8 | 0, B + 32 | 0, B) | 0, (e | 0) == -1) {
             f = y, e = 0, A = 163;
             break a;
            }
            if ((e | 0) != -2) break;
           }
           if (k[b + (n << 2) >> 2] = k[B + 8 >> 2], n = n + 1 | 0, (n | 0) == (s | 0)) {
            n = s;
            break;
           }
          }
         } else for (q = t & (n | 0) == (s | 0); ;) {
          if (e = k[a + 4 >> 2] | 0, e >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = e + 1, e = l[e >> 0] | 0) : e = Nf(a) | 0, !(i[B + 33 + (e + 1) >> 0] | 0)) {
           b = 0;
           break g;
          }
          if (i[B + 32 >> 0] = e, e = uf(B + 8 | 0, B + 32 | 0, B) | 0, (e | 0) != -2) {
           if ((e | 0) == -1) {
            f = y, e = 0, b = 0, A = 163;
            break a;
           }
           if (q) break;
          }
         }
         if (e = s << 1 | 1, q = xg(b, e << 2) | 0, !q) {
          f = y, e = 0, A = 163;
          break a;
         }
         s = e, b = q;
        }
        h: do if ((A | 0) == 99) for (;;) {
         for (A = 0; ;) {
          if (n = k[a + 4 >> 2] | 0, n >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = n + 1, n = l[n >> 0] | 0) : n = Nf(a) | 0, !(i[B + 33 + (n + 1) >> 0] | 0)) {
           n = e;
           break h;
          }
          if (i[B + 32 >> 0] = n, n = uf(B + 8 | 0, B + 32 | 0, B) | 0, (n | 0) == -1) {
           f = 0, e = 0, A = 163;
           break a;
          }
          if ((n | 0) != -2) break;
         }
         k[b + (e << 2) >> 2] = k[B + 8 >> 2], e = e + 1 | 0, A = 99;
        } while (0);
        if (!(vf(B) | 0)) {
         f = y, e = 0, A = 163;
         break a;
        }
        e = 0;
       } else {
        if (t) {
         if (e = ug(s) | 0, !e) {
          f = y, e = 0, b = 0, A = 163;
          break a;
         }
         for (n = 0; ;) {
          do {
           if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, b = l[b >> 0] | 0) : b = Nf(a) | 0, !(i[B + 33 + (b + 1) >> 0] | 0)) {
            b = 0;
            break f;
           }
           i[e + n >> 0] = b, n = n + 1 | 0;
          } while ((n | 0) != (s | 0));
          if (n = s << 1 | 1, b = xg(e, n) | 0, !b) {
           f = y, b = 0, A = 163;
           break a;
          }
          m = s, s = n, e = b, n = m;
         }
        }
        if (f) for (b = 0; ;) {
         if (n = k[a + 4 >> 2] | 0, n >>> 0 < m >>> 0 ? (k[a + 4 >> 2] = n + 1, n = l[n >> 0] | 0) : n = Nf(a) | 0, !(i[B + 33 + (n + 1) >> 0] | 0)) {
          n = b, e = f, b = 0;
          break f;
         }
         i[f + b >> 0] = n, m = k[a + 100 >> 2] | 0, b = b + 1 | 0;
        } else for (b = m; ;) {
         if (n = k[a + 4 >> 2] | 0, n >>> 0 < b >>> 0 ? (k[a + 4 >> 2] = n + 1, n = l[n >> 0] | 0) : n = Nf(a) | 0, !(i[B + 33 + (n + 1) >> 0] | 0)) {
          n = 0, e = 0, b = 0;
          break f;
         }
         b = k[a + 100 >> 2] | 0;
        }
       } while (0);
       if (q = k[a + 4 >> 2] | 0, k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = q + -1, q = q + -1 | 0), q = q - (k[a + 8 >> 2] | 0) + (k[a + 108 >> 2] | 0) | 0, !q) {
        f = y;
        break a;
       }
       if (!((q | 0) == (u | 0) | (v | 0) == 99 ^ 1)) {
        f = y;
        break a;
       }
       do if (t) {
        if ((w | 0) == 1) {
         k[f >> 2] = b;
         break;
        }
        k[f >> 2] = e;
        break;
       } while (0);
       (v | 0) != 99 && (b && (k[b + (n << 2) >> 2] = 0), e ? i[e + n >> 0] = 0 : e = 0);
       break;

      case 111:
       n = 8, A = 145;
       break;

      case 71:
      case 103:
      case 70:
      case 102:
      case 69:
      case 101:
      case 65:
      case 97:
       if (h = +Lf(a, w, 0), (k[a + 108 >> 2] | 0) == ((k[a + 8 >> 2] | 0) - (k[a + 4 >> 2] | 0) | 0)) {
        f = y;
        break a;
       }
       if (f) {
        if ((w | 0) == 1) {
         p[f >> 3] = h;
         break d;
        }
        if (w) {
         if ((w | 0) == 2) {
          p[f >> 3] = h;
          break d;
         }
         break d;
        }
        o[f >> 2] = h;
        break d;
       }
       break;

      case 105:
       n = 0, A = 145;
       break;

      case 117:
      case 100:
       n = 10, A = 145;
       break;

      case 120:
      case 88:
      case 112:
       n = 16, A = 145;
      } while (0);
      i: do if ((A | 0) == 145) {
       if (A = 0, n = Kf(a, n, 0, -1, -1) | 0, (k[a + 108 >> 2] | 0) == ((k[a + 8 >> 2] | 0) - (k[a + 4 >> 2] | 0) | 0)) {
        f = y;
        break a;
       }
       if ((f | 0) != 0 & (v | 0) == 112) {
        k[f >> 2] = n;
        break;
       }
       if (f) switch (w | 0) {
       case 0:
        k[f >> 2] = n;
        break i;

       case -2:
        i[f >> 0] = n;
        break i;

       case 3:
        y = f, k[y >> 2] = n, k[y + 4 >> 2] = O;
        break i;

       case 1:
        k[f >> 2] = n;
        break i;

       case -1:
        j[f >> 1] = n;
        break i;

       default:
        break i;
       }
      } while (0);
      d = ((f | 0) != 0 & 1) + d | 0, f = (k[a + 108 >> 2] | 0) + x + (k[a + 4 >> 2] | 0) - (k[a + 8 >> 2] | 0) | 0;
      break b;
     } while (0);
     if (g = s + (f & 1) | 0, Mf(a, 0), f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, (f | 0) != (l[g >> 0] | 0)) {
      A = 19;
      break a;
     }
     f = t + 1 | 0;
    } while (0);
    if (s = g + 1 | 0, n = i[s >> 0] | 0, !(n << 24 >> 24)) {
     A = 167;
     break;
    }
    t = f;
   }
   if ((A | 0) == 19) {
    if (k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), (d | 0) != 0 | (f | 0) > -1) return A = d, r = B, A | 0;
    d = 0, A = 164;
   } else if ((A | 0) == 163) d || (d = f, A = 164); else if ((A | 0) == 167) return r = B, d | 0;
   return (A | 0) == 164 && (f = d, d = -1), f ? (vg(e), vg(b), A = d, r = B, A | 0) : (A = d, r = B, A | 0);
  }
  function ze() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0;
   if (L = r, r = r + 64 | 0, xe(0, 0), te(5), H = ug(6815744) | 0, mc(H, 586200), I = m[65840] | 0, (I + -5 | 0) > 2) for (G = j[65844] | 0, J = -509, a = 3, b = 512, c = 4, K = 2; ;) {
    if (A = K | 1, B = K + 511 | 0, C = K + 2 | 0, D = K + 3 | 0, ((G & 65535) + -5 | 0) > 2) for (E = K + 508 | 0, y = k[80] | 0, z = k[32928] | 0, x = -509, d = 3, e = 512, f = 4, F = 2; ;) {
     for (q = F + 512 | 0, v = K; ;) {
      if ((v | 0) >= (I + -2 | 0)) break;
      if (s = v << 1 & 14, g = y >>> (s << 1) & 1 | F, s = y >>> ((y >>> (s << 1) & 1 | s) << 1) & 3, t = v - K | 0, u = ka(G & 65535, v) | 0, (g | 0) < (q | 0) & (g | 0) < ((G & 65535) + -2 | 0)) do p = u + g | 0, h = j[z + (p + -1 << 3) + 2 >> 1] | 0, l = j[z + (p + 1 << 3) + 2 >> 1] | 0, n = ((m[z + (p << 3) + (s << 1) >> 1] | 0) + (h & 65535) + (l & 65535) << 1) - (m[z + (p + -2 << 3) + (s << 1) >> 1] | 0) - (m[z + (p + 2 << 3) + (s << 1) >> 1] | 0) >> 2, (h & 65535) < (l & 65535) ? (w = (n | 0) < (l & 65535 | 0) ? n : l & 65535, h = (h & 65535 | 0) > (w | 0) ? h & 65535 : w) : (h = (n | 0) < (h & 65535 | 0) ? n : h & 65535, h = (l & 65535 | 0) > (h | 0) ? l & 65535 : h), o = g - F | 0, j[H + (t * 3072 | 0) + (o * 6 | 0) + 2 >> 1] = h, l = j[z + (p - (G & 65535) << 3) + 2 >> 1] | 0, n = j[z + ((G & 65535) + p << 3) + 2 >> 1] | 0, h = ((m[z + (p << 3) + (s << 1) >> 1] | 0) + (l & 65535) + (n & 65535) << 1) - (m[z + (p - ((G & 65535) << 1) << 3) + (s << 1) >> 1] | 0) - (m[z + (((G & 65535) << 1) + p << 3) + (s << 1) >> 1] | 0) >> 2, (l & 65535) < (n & 65535) ? (h = (h | 0) < (n & 65535 | 0) ? h : n & 65535, h = (l & 65535 | 0) > (h | 0) ? l & 65535 : h) : (h = (h | 0) < (l & 65535 | 0) ? h : l & 65535, h = (n & 65535 | 0) > (h | 0) ? n & 65535 : h), j[H + 1572864 + (t * 3072 | 0) + (o * 6 | 0) + 2 >> 1] = h, g = g + 2 | 0; while ((g | 0) < (q | 0) & (g | 0) < ((G & 65535) + -2 | 0));
      if (!((v | 0) < (B | 0))) break;
      v = v + 1 | 0;
     }
     q = F | 1, s = F + 511 | 0, v = 0;
     do {
      a: do if ((A | 0) < (B | 0)) {
       w = A;
       do {
        if ((w | 0) >= (I + -3 | 0)) break a;
        g = w - K | 0, n = w << 1;
        b: do if ((q | 0) < (s | 0)) {
         u = q;
         do {
          if ((u | 0) >= ((G & 65535) + -3 | 0)) break b;
          l = (ka(G & 65535, w) | 0) + u | 0, o = u - F | 0, p = u & 1, h = 2 - (y >>> ((p | n & 14) << 1) & 3) | 0, (h | 0) == 1 ? (N = y >>> ((p | n + 2 & 14) << 1) & 3, M = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + -1 | 0) * 6 | 0) + 2 | 0, h = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + 1 | 0) * 6 | 0) + 2 | 0, h = ((m[z + (l + 1 << 3) + (2 - N << 1) >> 1] | 0) + (m[z + (l + -1 << 3) + (2 - N << 1) >> 1] | 0) - (m[M >> 1] | 0) - (m[h >> 1] | 0) >> 1) + (m[z + (l << 3) + 2 >> 1] | 0) | 0, h = (h | 0) < 65535 ? h : 65535, M = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + (o * 6 | 0) + (2 - N << 1) | 0, j[M >> 1] = (h | 0) < 0 ? 0 : h & 65535, M = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + -512 | 0) * 6 | 0) + 2 | 0, h = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + 512 | 0) * 6 | 0) + 2 | 0, t = N, h = ((m[z + ((G & 65535) + l << 3) + (N << 1) >> 1] | 0) + (m[z + (l - (G & 65535) << 3) + (N << 1) >> 1] | 0) - (m[M >> 1] | 0) - (m[h >> 1] | 0) >> 1) + (m[z + (l << 3) + 2 >> 1] | 0) | 0) : (N = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + (o * 6 | 0) + 2 | 0, Q = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + -513 | 0) * 6 | 0) + 2 | 0, P = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + -511 | 0) * 6 | 0) + 2 | 0, O = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + 511 | 0) * 6 | 0) + 2 | 0, M = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + ((o + 513 | 0) * 6 | 0) + 2 | 0, t = h, h = ((m[z + (l + ~(G & 65535) << 3) + (h << 1) >> 1] | 0) + 1 + (m[z + (1 - (G & 65535) + l << 3) + (h << 1) >> 1] | 0) + (m[z + ((G & 65535) + -1 + l << 3) + (h << 1) >> 1] | 0) + (m[z + ((G & 65535) + 1 + l << 3) + (h << 1) >> 1] | 0) - (m[Q >> 1] | 0) - (m[P >> 1] | 0) - (m[O >> 1] | 0) - (m[M >> 1] | 0) >> 2) + (m[N >> 1] | 0) | 0), O = (h | 0) < 65535 ? h : 65535, P = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + (o * 6 | 0) + (t << 1) | 0, j[P >> 1] = (O | 0) < 0 ? 0 : O & 65535, P = H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + (o * 6 | 0) + ((y >>> ((p | n & 14) << 1) & 3) << 1) | 0, j[P >> 1] = j[z + (l << 3) + ((y >>> ((p | n & 14) << 1) & 3) << 1) >> 1] | 0, xe(H + (ka(v, 1572864) | 0) + (g * 3072 | 0) + (o * 6 | 0) | 0, H + 3145728 + (ka(v, 1572864) | 0) + (g * 3072 | 0) + (o * 6 | 0) | 0), u = u + 1 | 0;
         } while ((u | 0) < (s | 0));
        } while (0);
        w = w + 1 | 0;
       } while ((w | 0) < (B | 0));
      } while (0);
      v = v + 1 | 0;
     } while ((v | 0) != 2);
     if (Jg(H + 6291456 | 0, 0, 524288) | 0, w = F + 2 | 0, p = d - ((f | 0) > ((G & 65535) + -4 | 0) ? f : (G & 65535) + -4 | 0) | 0, p = d - (x >>> 0 > p >>> 0 ? x : p) | 0, q = a - ((c | 0) > (I + -4 | 0) ? c : I + -4 | 0) | 0, q = a - (J >>> 0 > q >>> 0 ? J : q) | 0, (C | 0) != (q | 0)) {
      v = C;
      do {
       if (s = v - K | 0, (w | 0) != (p | 0)) {
        u = w;
        do {
         t = u - F | 0, n = 0;
         do {
          h = H + 3145728 + (ka(n, 1572864) | 0) + (s * 3072 | 0) + (t * 6 | 0) | 0, l = H + 3145728 + (ka(n, 1572864) | 0) + (s * 3072 | 0) + (t * 6 | 0) + 2 | 0, g = H + 3145728 + (ka(n, 1572864) | 0) + (s * 3072 | 0) + (t * 6 | 0) + 4 | 0, h = j[h >> 1] | 0, l = j[l >> 1] | 0, g = j[g >> 1] | 0, o = 0;
          do O = (k[586224 + (o << 2) >> 2] | 0) + t | 0, P = H + 3145728 + (ka(n, 1572864) | 0) + (s * 3072 | 0) + (O * 6 | 0) | 0, P = h - (j[P >> 1] | 0) | 0, k[L + 32 + (n << 4) + (o << 2) >> 2] = (P >> 31 ^ P) - (P >> 31), P = H + 3145728 + (ka(n, 1572864) | 0) + (s * 3072 | 0) + (O * 6 | 0) + 2 | 0, P = l - (j[P >> 1] | 0) | 0, P = ka(P, P) | 0, O = H + 3145728 + (ka(n, 1572864) | 0) + (s * 3072 | 0) + (O * 6 | 0) + 4 | 0, O = g - (j[O >> 1] | 0) | 0, P = (ka(O, O) | 0) + P | 0, k[L + (n << 4) + (o << 2) >> 2] = P, o = o + 1 | 0; while ((o | 0) != 4);
          n = n + 1 | 0;
         } while ((n | 0) != 2);
         for (l = k[L + 32 >> 2] | 0, P = k[L + 32 + 4 >> 2] | 0, P = l >>> 0 > P >>> 0 ? l : P, h = k[L + 32 + 24 >> 2] | 0, g = k[L + 32 + 28 >> 2] | 0, g = h >>> 0 > g >>> 0 ? h : g, g = P >>> 0 < g >>> 0 ? P : g, P = k[L >> 2] | 0, h = k[L + 4 >> 2] | 0, h = P >>> 0 > h >>> 0 ? P : h, P = k[L + 24 >> 2] | 0, n = k[L + 28 >> 2] | 0, n = P >>> 0 > n >>> 0 ? P : n, n = h >>> 0 < n >>> 0 ? h : n, h = 0; ;) {
          if (l >>> 0 <= g >>> 0 && (k[L + (h << 2) >> 2] | 0) >>> 0 <= n >>> 0 && (i[H + 6291456 + (s << 9) + t >> 0] = (i[H + 6291456 + (s << 9) + t >> 0] | 0) + 1 << 24 >> 24), h = h + 1 | 0, (h | 0) == 4) break;
          l = k[L + 32 + (h << 2) >> 2] | 0;
         }
         h = 0;
         do (k[L + 32 + 16 + (h << 2) >> 2] | 0) >>> 0 <= g >>> 0 && (k[L + 16 + (h << 2) >> 2] | 0) >>> 0 <= n >>> 0 && (i[H + 6291456 + 262144 + (s << 9) + t >> 0] = (i[H + 6291456 + 262144 + (s << 9) + t >> 0] | 0) + 1 << 24 >> 24), h = h + 1 | 0; while ((h | 0) != 4);
         u = u + 1 | 0;
        } while ((u | 0) != (p | 0));
       }
       v = v + 1 | 0;
      } while ((v | 0) != (q | 0));
     }
     for (l = F + 3 | 0, n = F + 508 | 0, t = D; ;) {
      if ((t | 0) >= (I + -5 | 0)) break;
      for (o = t - K | 0, s = l; ;) {
       if ((s | 0) >= ((G & 65535) + -5 | 0)) break;
       for (p = s - F | 0, q = 0, g = o + -1 | 0; ;) {
        if (q = q + (i[H + 6291456 + (g << 9) + (p + -1) >> 0] | 0) + (i[H + 6291456 + (g << 9) + p >> 0] | 0) + (i[H + 6291456 + (g << 9) + (p + 1) >> 0] | 0) | 0, (g | 0) >= (o + 1 | 0)) {
         h = 0, g = o + -1 | 0;
         break;
        }
        g = g + 1 | 0;
       }
       for (;;) {
        if (h = h + (i[H + 6291456 + 262144 + (g << 9) + (p + -1) >> 0] | 0) + (i[H + 6291456 + 262144 + (g << 9) + p >> 0] | 0) + (i[H + 6291456 + 262144 + (g << 9) + (p + 1) >> 0] | 0) | 0, (g | 0) >= (o + 1 | 0)) break;
        g = g + 1 | 0;
       }
       if ((q | 0) == (h | 0) ? (P = (ka(G & 65535, t) | 0) + s | 0, j[z + (P << 3) >> 1] = ((m[H + 1572864 + (o * 3072 | 0) + (p * 6 | 0) >> 1] | 0) + (m[H + (o * 3072 | 0) + (p * 6 | 0) >> 1] | 0) | 0) >>> 1, j[z + (P << 3) + 2 >> 1] = ((m[H + 1572864 + (o * 3072 | 0) + (p * 6 | 0) + 2 >> 1] | 0) + (m[H + (o * 3072 | 0) + (p * 6 | 0) + 2 >> 1] | 0) | 0) >>> 1, j[z + (P << 3) + 4 >> 1] = ((m[H + 1572864 + (o * 3072 | 0) + (p * 6 | 0) + 4 >> 1] | 0) + (m[H + (o * 3072 | 0) + (p * 6 | 0) + 4 >> 1] | 0) | 0) >>> 1) : (O = (h | 0) > (q | 0) & 1, Q = H + (ka(O, 1572864) | 0) + (o * 3072 | 0) + (p * 6 | 0) | 0, P = (ka(G & 65535, t) | 0) + s | 0, j[z + (P << 3) >> 1] = j[Q >> 1] | 0, Q = H + (ka(O, 1572864) | 0) + (o * 3072 | 0) + (p * 6 | 0) + 2 | 0, j[z + (P << 3) + 2 >> 1] = j[Q >> 1] | 0, O = H + (ka(O, 1572864) | 0) + (o * 3072 | 0) + (p * 6 | 0) + 4 | 0, j[z + (P << 3) + 4 >> 1] = j[O >> 1] | 0), !((s | 0) < (n | 0))) break;
       s = s + 1 | 0;
      }
      if (!((t | 0) < (E | 0))) break;
      t = t + 1 | 0;
     }
     if (F = F + 506 | 0, d = d + 506 | 0, e = e + 506 | 0, f = f + 506 | 0, (F | 0) >= ((G & 65535) + -5 | 0)) break;
     x = d - ((e | 0) > (f | 0) ? e : f) | 0;
    }
    if (K = K + 506 | 0, a = a + 506 | 0, b = b + 506 | 0, c = c + 506 | 0, (K | 0) >= (I + -5 | 0)) break;
    J = a - ((b | 0) > (c | 0) ? b : c) | 0;
   }
   vg(H), r = L;
  }
  function vg(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0;
   if (a) {
    h = k[157568] | 0, (a + -8 | 0) >>> 0 < h >>> 0 && Fb(), p = k[a + -4 >> 2] | 0, (p & 3 | 0) == 1 && Fb(), o = a + ((p & -8) + -8) | 0;
    do if (p & 1) t = a + -8 | 0, f = p & -8; else {
     if (j = k[a + -8 >> 2] | 0, !(p & 3)) return;
     if (l = a + (-8 - j) | 0, m = j + (p & -8) | 0, l >>> 0 < h >>> 0 && Fb(), (l | 0) == (k[157569] | 0)) {
      if (b = k[a + ((p & -8) + -4) >> 2] | 0, (b & 3 | 0) != 3) {
       t = l, f = m;
       break;
      }
      return k[157566] = m, k[a + ((p & -8) + -4) >> 2] = b & -2, k[a + (-8 - j + 4) >> 2] = m | 1, void (k[o >> 2] = m);
     }
     if (j >>> 0 < 256) {
      if (b = k[a + (-8 - j + 8) >> 2] | 0, e = k[a + (-8 - j + 12) >> 2] | 0, (b | 0) != (630296 + (j >>> 3 << 1 << 2) | 0) && (b >>> 0 < h >>> 0 && Fb(), (k[b + 12 >> 2] | 0) != (l | 0) && Fb()), (e | 0) == (b | 0)) {
       k[157564] = k[157564] & ~(1 << (j >>> 3)), t = l, f = m;
       break;
      }
      (e | 0) == (630296 + (j >>> 3 << 1 << 2) | 0) ? c = e + 8 | 0 : (e >>> 0 < h >>> 0 && Fb(), (k[e + 8 >> 2] | 0) == (l | 0) ? c = e + 8 | 0 : Fb()), k[b + 12 >> 2] = e, k[c >> 2] = b, t = l, f = m;
      break;
     }
     g = k[a + (-8 - j + 24) >> 2] | 0, b = k[a + (-8 - j + 12) >> 2] | 0;
     do if ((b | 0) == (l | 0)) {
      if (b = k[a + (-8 - j + 20) >> 2] | 0) d = a + (-8 - j + 20) | 0; else {
       if (b = k[a + (-8 - j + 16) >> 2] | 0, !b) {
        i = 0;
        break;
       }
       d = a + (-8 - j + 16) | 0;
      }
      for (;;) if (e = b + 20 | 0, c = k[e >> 2] | 0) b = c, d = e; else {
       if (e = b + 16 | 0, c = k[e >> 2] | 0, !c) break;
       b = c, d = e;
      }
      if (!(d >>> 0 < h >>> 0)) {
       k[d >> 2] = 0, i = b;
       break;
      }
      Fb();
     } else {
      if (e = k[a + (-8 - j + 8) >> 2] | 0, e >>> 0 < h >>> 0 && Fb(), (k[e + 12 >> 2] | 0) != (l | 0) && Fb(), (k[b + 8 >> 2] | 0) == (l | 0)) {
       k[e + 12 >> 2] = b, k[b + 8 >> 2] = e, i = b;
       break;
      }
      Fb();
     } while (0);
     if (g) {
      if (b = k[a + (-8 - j + 28) >> 2] | 0, (l | 0) == (k[630560 + (b << 2) >> 2] | 0)) {
       if (k[630560 + (b << 2) >> 2] = i, !i) {
        k[157565] = k[157565] & ~(1 << b), t = l, f = m;
        break;
       }
      } else if (g >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[g + 16 >> 2] | 0) == (l | 0) ? k[g + 16 >> 2] = i : k[g + 20 >> 2] = i, !i) {
       t = l, f = m;
       break;
      }
      e = k[157568] | 0, i >>> 0 < e >>> 0 && Fb(), k[i + 24 >> 2] = g, b = k[a + (-8 - j + 16) >> 2] | 0;
      do if (b) {
       if (!(b >>> 0 < e >>> 0)) {
        k[i + 16 >> 2] = b, k[b + 24 >> 2] = i;
        break;
       }
       Fb();
      } while (0);
      if (b = k[a + (-8 - j + 20) >> 2] | 0) {
       if (!(b >>> 0 < (k[157568] | 0) >>> 0)) {
        k[i + 20 >> 2] = b, k[b + 24 >> 2] = i, t = l, f = m;
        break;
       }
       Fb();
      } else t = l, f = m;
     } else t = l, f = m;
    } while (0);
    if (t >>> 0 >= o >>> 0 && Fb(), c = k[a + ((p & -8) + -4) >> 2] | 0, c & 1 || Fb(), c & 2) k[a + ((p & -8) + -4) >> 2] = c & -2, k[t + 4 >> 2] = f | 1, k[t + f >> 2] = f; else {
     if ((o | 0) == (k[157570] | 0)) {
      if (u = (k[157567] | 0) + f | 0, k[157567] = u, k[157570] = t, k[t + 4 >> 2] = u | 1, (t | 0) != (k[157569] | 0)) return;
      return k[157569] = 0, void (k[157566] = 0);
     }
     if ((o | 0) == (k[157569] | 0)) return u = (k[157566] | 0) + f | 0, k[157566] = u, k[157569] = t, k[t + 4 >> 2] = u | 1, void (k[t + u >> 2] = u);
     f = (c & -8) + f | 0;
     do if (c >>> 0 < 256) {
      if (e = k[a + (p & -8) >> 2] | 0, b = k[a + (p & -8 | 4) >> 2] | 0, (e | 0) != (630296 + (c >>> 3 << 1 << 2) | 0) && (e >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[e + 12 >> 2] | 0) != (o | 0) && Fb()), (b | 0) == (e | 0)) {
       k[157564] = k[157564] & ~(1 << (c >>> 3));
       break;
      }
      (b | 0) == (630296 + (c >>> 3 << 1 << 2) | 0) ? n = b + 8 | 0 : (b >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[b + 8 >> 2] | 0) == (o | 0) ? n = b + 8 | 0 : Fb()), k[e + 12 >> 2] = b, k[n >> 2] = e;
     } else {
      g = k[a + ((p & -8) + 16) >> 2] | 0, b = k[a + (p & -8 | 4) >> 2] | 0;
      do if ((b | 0) == (o | 0)) {
       if (b = k[a + ((p & -8) + 12) >> 2] | 0) d = a + ((p & -8) + 12) | 0; else {
        if (b = k[a + ((p & -8) + 8) >> 2] | 0, !b) {
         q = 0;
         break;
        }
        d = a + ((p & -8) + 8) | 0;
       }
       for (;;) if (e = b + 20 | 0, c = k[e >> 2] | 0) b = c, d = e; else {
        if (e = b + 16 | 0, c = k[e >> 2] | 0, !c) break;
        b = c, d = e;
       }
       if (!(d >>> 0 < (k[157568] | 0) >>> 0)) {
        k[d >> 2] = 0, q = b;
        break;
       }
       Fb();
      } else {
       if (e = k[a + (p & -8) >> 2] | 0, e >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[e + 12 >> 2] | 0) != (o | 0) && Fb(), (k[b + 8 >> 2] | 0) == (o | 0)) {
        k[e + 12 >> 2] = b, k[b + 8 >> 2] = e, q = b;
        break;
       }
       Fb();
      } while (0);
      if (g) {
       if (b = k[a + ((p & -8) + 20) >> 2] | 0, (o | 0) == (k[630560 + (b << 2) >> 2] | 0)) {
        if (k[630560 + (b << 2) >> 2] = q, !q) {
         k[157565] = k[157565] & ~(1 << b);
         break;
        }
       } else if (g >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[g + 16 >> 2] | 0) == (o | 0) ? k[g + 16 >> 2] = q : k[g + 20 >> 2] = q, !q) break;
       e = k[157568] | 0, q >>> 0 < e >>> 0 && Fb(), k[q + 24 >> 2] = g, b = k[a + ((p & -8) + 8) >> 2] | 0;
       do if (b) {
        if (!(b >>> 0 < e >>> 0)) {
         k[q + 16 >> 2] = b, k[b + 24 >> 2] = q;
         break;
        }
        Fb();
       } while (0);
       if (b = k[a + ((p & -8) + 12) >> 2] | 0) {
        if (!(b >>> 0 < (k[157568] | 0) >>> 0)) {
         k[q + 20 >> 2] = b, k[b + 24 >> 2] = q;
         break;
        }
        Fb();
       }
      }
     } while (0);
     if (k[t + 4 >> 2] = f | 1, k[t + f >> 2] = f, (t | 0) == (k[157569] | 0)) return void (k[157566] = f);
    }
    if (c = f >>> 3, f >>> 0 < 256) return b = k[157564] | 0, b & 1 << c ? (b = k[630296 + ((c << 1) + 2 << 2) >> 2] | 0, b >>> 0 < (k[157568] | 0) >>> 0 ? Fb() : (r = 630296 + ((c << 1) + 2 << 2) | 0, s = b)) : (k[157564] = b | 1 << c, r = 630296 + ((c << 1) + 2 << 2) | 0, s = 630296 + (c << 1 << 2) | 0), k[r >> 2] = t, k[s + 12 >> 2] = t, k[t + 8 >> 2] = s, void (k[t + 12 >> 2] = 630296 + (c << 1 << 2));
    b = f >>> 8, b ? f >>> 0 > 16777215 ? e = 31 : (e = b << ((b + 1048320 | 0) >>> 16 & 8) << (((b << ((b + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4), e = 14 - (((b << ((b + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (b + 1048320 | 0) >>> 16 & 8 | (e + 245760 | 0) >>> 16 & 2) + (e << ((e + 245760 | 0) >>> 16 & 2) >>> 15) | 0, e = f >>> (e + 7 | 0) & 1 | e << 1) : e = 0, b = 630560 + (e << 2) | 0, k[t + 28 >> 2] = e, k[t + 20 >> 2] = 0, k[t + 16 >> 2] = 0, c = k[157565] | 0, d = 1 << e;
    a: do if (c & d) {
     b = k[b >> 2] | 0;
     b: do if ((k[b + 4 >> 2] & -8 | 0) == (f | 0)) u = b; else {
      for (e = f << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0); ;) {
       if (d = b + 16 + (e >>> 31 << 2) | 0, c = k[d >> 2] | 0, !c) break;
       if ((k[c + 4 >> 2] & -8 | 0) == (f | 0)) {
        u = c;
        break b;
       }
       e <<= 1, b = c;
      }
      if (!(d >>> 0 < (k[157568] | 0) >>> 0)) {
       k[d >> 2] = t, k[t + 24 >> 2] = b, k[t + 12 >> 2] = t, k[t + 8 >> 2] = t;
       break a;
      }
      Fb();
     } while (0);
     if (b = u + 8 | 0, c = k[b >> 2] | 0, s = k[157568] | 0, c >>> 0 >= s >>> 0 & u >>> 0 >= s >>> 0) {
      k[c + 12 >> 2] = t, k[b >> 2] = t, k[t + 8 >> 2] = c, k[t + 12 >> 2] = u, k[t + 24 >> 2] = 0;
      break;
     }
     Fb();
    } else k[157565] = c | d, k[b >> 2] = t, k[t + 24 >> 2] = b, k[t + 12 >> 2] = t, k[t + 8 >> 2] = t; while (0);
    if (u = (k[157572] | 0) + -1 | 0, k[157572] = u, !u) {
     for (b = 630712; ;) {
      if (b = k[b >> 2] | 0, !b) break;
      b = b + 8 | 0;
     }
     k[157572] = -1;
    }
   }
  }
  function zg(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
   c = k[a + 4 >> 2] | 0;
   do if (c & 1) q = a, g = b; else {
    if (l = k[a >> 2] | 0, !(c & 3)) return;
    if (i = k[157568] | 0, (a + (0 - l) | 0) >>> 0 < i >>> 0 && Fb(), (a + (0 - l) | 0) == (k[157569] | 0)) {
     if (c = k[a + (b + 4) >> 2] | 0, (c & 3 | 0) != 3) {
      q = a + (0 - l) | 0, g = l + b | 0;
      break;
     }
     return k[157566] = l + b, k[a + (b + 4) >> 2] = c & -2, k[a + (4 - l) >> 2] = l + b | 1, void (k[a + b >> 2] = l + b);
    }
    if (l >>> 0 < 256) {
     if (c = k[a + (8 - l) >> 2] | 0, f = k[a + (12 - l) >> 2] | 0, (c | 0) != (630296 + (l >>> 3 << 1 << 2) | 0) && (c >>> 0 < i >>> 0 && Fb(), (k[c + 12 >> 2] | 0) != (a + (0 - l) | 0) && Fb()), (f | 0) == (c | 0)) {
      k[157564] = k[157564] & ~(1 << (l >>> 3)), q = a + (0 - l) | 0, g = l + b | 0;
      break;
     }
     (f | 0) == (630296 + (l >>> 3 << 1 << 2) | 0) ? d = f + 8 | 0 : (f >>> 0 < i >>> 0 && Fb(), (k[f + 8 >> 2] | 0) == (a + (0 - l) | 0) ? d = f + 8 | 0 : Fb()), k[c + 12 >> 2] = f, k[d >> 2] = c, q = a + (0 - l) | 0, g = l + b | 0;
     break;
    }
    h = k[a + (24 - l) >> 2] | 0, c = k[a + (12 - l) >> 2] | 0;
    do if ((c | 0) == (a + (0 - l) | 0)) {
     if (c = k[a + (16 - l + 4) >> 2] | 0) e = a + (16 - l + 4) | 0; else {
      if (c = k[a + (16 - l) >> 2] | 0, !c) {
       j = 0;
       break;
      }
      e = a + (16 - l) | 0;
     }
     for (;;) if (f = c + 20 | 0, d = k[f >> 2] | 0) c = d, e = f; else {
      if (f = c + 16 | 0, d = k[f >> 2] | 0, !d) break;
      c = d, e = f;
     }
     if (!(e >>> 0 < i >>> 0)) {
      k[e >> 2] = 0, j = c;
      break;
     }
     Fb();
    } else {
     if (f = k[a + (8 - l) >> 2] | 0, f >>> 0 < i >>> 0 && Fb(), (k[f + 12 >> 2] | 0) != (a + (0 - l) | 0) && Fb(), (k[c + 8 >> 2] | 0) == (a + (0 - l) | 0)) {
      k[f + 12 >> 2] = c, k[c + 8 >> 2] = f, j = c;
      break;
     }
     Fb();
    } while (0);
    if (h) {
     if (c = k[a + (28 - l) >> 2] | 0, (a + (0 - l) | 0) == (k[630560 + (c << 2) >> 2] | 0)) {
      if (k[630560 + (c << 2) >> 2] = j, !j) {
       k[157565] = k[157565] & ~(1 << c), q = a + (0 - l) | 0, g = l + b | 0;
       break;
      }
     } else if (h >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[h + 16 >> 2] | 0) == (a + (0 - l) | 0) ? k[h + 16 >> 2] = j : k[h + 20 >> 2] = j, !j) {
      q = a + (0 - l) | 0, g = l + b | 0;
      break;
     }
     f = k[157568] | 0, j >>> 0 < f >>> 0 && Fb(), k[j + 24 >> 2] = h, c = k[a + (16 - l) >> 2] | 0;
     do if (c) {
      if (!(c >>> 0 < f >>> 0)) {
       k[j + 16 >> 2] = c, k[c + 24 >> 2] = j;
       break;
      }
      Fb();
     } while (0);
     if (c = k[a + (16 - l + 4) >> 2] | 0) {
      if (!(c >>> 0 < (k[157568] | 0) >>> 0)) {
       k[j + 20 >> 2] = c, k[c + 24 >> 2] = j, q = a + (0 - l) | 0, g = l + b | 0;
       break;
      }
      Fb();
     } else q = a + (0 - l) | 0, g = l + b | 0;
    } else q = a + (0 - l) | 0, g = l + b | 0;
   } while (0);
   if (i = k[157568] | 0, (a + b | 0) >>> 0 < i >>> 0 && Fb(), d = k[a + (b + 4) >> 2] | 0, d & 2) k[a + (b + 4) >> 2] = d & -2, k[q + 4 >> 2] = g | 1, k[q + g >> 2] = g; else {
    if ((a + b | 0) == (k[157570] | 0)) {
     if (p = (k[157567] | 0) + g | 0, k[157567] = p, k[157570] = q, k[q + 4 >> 2] = p | 1, (q | 0) != (k[157569] | 0)) return;
     return k[157569] = 0, void (k[157566] = 0);
    }
    if ((a + b | 0) == (k[157569] | 0)) return p = (k[157566] | 0) + g | 0, k[157566] = p, k[157569] = q, k[q + 4 >> 2] = p | 1, void (k[q + p >> 2] = p);
    g = (d & -8) + g | 0;
    do if (d >>> 0 < 256) {
     if (c = k[a + (b + 8) >> 2] | 0, f = k[a + (b + 12) >> 2] | 0, (c | 0) != (630296 + (d >>> 3 << 1 << 2) | 0) && (c >>> 0 < i >>> 0 && Fb(), (k[c + 12 >> 2] | 0) != (a + b | 0) && Fb()), (f | 0) == (c | 0)) {
      k[157564] = k[157564] & ~(1 << (d >>> 3));
      break;
     }
     (f | 0) == (630296 + (d >>> 3 << 1 << 2) | 0) ? m = f + 8 | 0 : (f >>> 0 < i >>> 0 && Fb(), (k[f + 8 >> 2] | 0) == (a + b | 0) ? m = f + 8 | 0 : Fb()), k[c + 12 >> 2] = f, k[m >> 2] = c;
    } else {
     h = k[a + (b + 24) >> 2] | 0, c = k[a + (b + 12) >> 2] | 0;
     do if ((c | 0) == (a + b | 0)) {
      if (c = k[a + (b + 20) >> 2] | 0) e = a + (b + 20) | 0; else {
       if (c = k[a + (b + 16) >> 2] | 0, !c) {
        n = 0;
        break;
       }
       e = a + (b + 16) | 0;
      }
      for (;;) if (f = c + 20 | 0, d = k[f >> 2] | 0) c = d, e = f; else {
       if (f = c + 16 | 0, d = k[f >> 2] | 0, !d) break;
       c = d, e = f;
      }
      if (!(e >>> 0 < i >>> 0)) {
       k[e >> 2] = 0, n = c;
       break;
      }
      Fb();
     } else {
      if (f = k[a + (b + 8) >> 2] | 0, f >>> 0 < i >>> 0 && Fb(), (k[f + 12 >> 2] | 0) != (a + b | 0) && Fb(), (k[c + 8 >> 2] | 0) == (a + b | 0)) {
       k[f + 12 >> 2] = c, k[c + 8 >> 2] = f, n = c;
       break;
      }
      Fb();
     } while (0);
     if (h) {
      if (c = k[a + (b + 28) >> 2] | 0, (a + b | 0) == (k[630560 + (c << 2) >> 2] | 0)) {
       if (k[630560 + (c << 2) >> 2] = n, !n) {
        k[157565] = k[157565] & ~(1 << c);
        break;
       }
      } else if (h >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[h + 16 >> 2] | 0) == (a + b | 0) ? k[h + 16 >> 2] = n : k[h + 20 >> 2] = n, !n) break;
      f = k[157568] | 0, n >>> 0 < f >>> 0 && Fb(), k[n + 24 >> 2] = h, c = k[a + (b + 16) >> 2] | 0;
      do if (c) {
       if (!(c >>> 0 < f >>> 0)) {
        k[n + 16 >> 2] = c, k[c + 24 >> 2] = n;
        break;
       }
       Fb();
      } while (0);
      if (c = k[a + (b + 20) >> 2] | 0) {
       if (!(c >>> 0 < (k[157568] | 0) >>> 0)) {
        k[n + 20 >> 2] = c, k[c + 24 >> 2] = n;
        break;
       }
       Fb();
      }
     }
    } while (0);
    if (k[q + 4 >> 2] = g | 1, k[q + g >> 2] = g, (q | 0) == (k[157569] | 0)) return void (k[157566] = g);
   }
   if (d = g >>> 3, g >>> 0 < 256) return c = k[157564] | 0, c & 1 << d ? (c = k[630296 + ((d << 1) + 2 << 2) >> 2] | 0, c >>> 0 < (k[157568] | 0) >>> 0 ? Fb() : (o = 630296 + ((d << 1) + 2 << 2) | 0, p = c)) : (k[157564] = c | 1 << d, o = 630296 + ((d << 1) + 2 << 2) | 0, p = 630296 + (d << 1 << 2) | 0), k[o >> 2] = q, k[p + 12 >> 2] = q, k[q + 8 >> 2] = p, void (k[q + 12 >> 2] = 630296 + (d << 1 << 2));
   if (c = g >>> 8, c ? g >>> 0 > 16777215 ? f = 31 : (f = c << ((c + 1048320 | 0) >>> 16 & 8) << (((c << ((c + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4), f = 14 - (((c << ((c + 1048320 | 0) >>> 16 & 8)) + 520192 | 0) >>> 16 & 4 | (c + 1048320 | 0) >>> 16 & 8 | (f + 245760 | 0) >>> 16 & 2) + (f << ((f + 245760 | 0) >>> 16 & 2) >>> 15) | 0, f = g >>> (f + 7 | 0) & 1 | f << 1) : f = 0, c = 630560 + (f << 2) | 0, k[q + 28 >> 2] = f, k[q + 20 >> 2] = 0, k[q + 16 >> 2] = 0, d = k[157565] | 0, e = 1 << f, !(d & e)) return k[157565] = d | e, k[c >> 2] = q, k[q + 24 >> 2] = c, k[q + 12 >> 2] = q, void (k[q + 8 >> 2] = q);
   e = k[c >> 2] | 0;
   a: do if ((k[e + 4 >> 2] & -8 | 0) != (g | 0)) {
    for (f = g << ((f | 0) == 31 ? 0 : 25 - (f >>> 1) | 0); ;) {
     if (d = e + 16 + (f >>> 31 << 2) | 0, c = k[d >> 2] | 0, !c) break;
     if ((k[c + 4 >> 2] & -8 | 0) == (g | 0)) {
      e = c;
      break a;
     }
     f <<= 1, e = c;
    }
    return d >>> 0 < (k[157568] | 0) >>> 0 && Fb(), k[d >> 2] = q, k[q + 24 >> 2] = e, k[q + 12 >> 2] = q, void (k[q + 8 >> 2] = q);
   } while (0);
   c = e + 8 | 0, d = k[c >> 2] | 0, p = k[157568] | 0, d >>> 0 >= p >>> 0 & e >>> 0 >= p >>> 0 || Fb(), k[d + 12 >> 2] = q, k[c >> 2] = q, k[q + 8 >> 2] = d, k[q + 12 >> 2] = e, k[q + 24 >> 2] = 0;
  }
  function wd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0;
   D = r, r = r + 16688 | 0, j[D >> 1] = j[158664] | 0, j[D + 2 >> 1] = j[158665] | 0, j[D + 4 >> 1] = j[158666] | 0, d = 0, g = 2;
   do {
    if (a = d & 65535, C = d, d = j[317336 + (g << 1) >> 1] | 0, c = d & 65535, (d & 65535) >= (C & 65535)) for (b = m[317336 + (g + -1 << 1) >> 1] | 0, e = +((m[317336 + ((g | 1) << 1) >> 1] | 0) - b | 0), f = a; ;) {
     if (j[576 + (f << 1) >> 1] = ~~(+(b | 0) + +(f - a | 0) / +(c - a | 0) * e + .5), !((f | 0) < (c | 0))) break;
     f = f + 1 | 0;
    }
    g = g + 2 | 0;
   } while ((g | 0) < 12);
   for (c = 0, f = 0; ;) {
    if (a = i[317360 + c >> 0] | 0, h = (256 >>> a | 0) > 0 ? 256 >>> a : 0, (256 >>> a | 0) > 0) for (d = (l[317360 + (c | 1) >> 0] | a << 8) & 65535, b = 0, g = f; ;) {
     if (j[D + 6960 + (g << 1) >> 1] = d, b = b + 1 | 0, (b | 0) == (256 >>> a | 0)) break;
     g = g + 1 | 0;
    }
    if (c = c + 2 | 0, c >>> 0 >= 260) break;
    f = f + h | 0;
   }
   a = (k[35118] | 0) == 243 ? 2 : 3, b = 0;
   do j[D + 6960 + 9216 + (b << 1) >> 1] = 1 << a + -1 | 8 - a << 8 | b >> a << a, b = b + 1 | 0; while ((b | 0) != 256);
   k[74604] = 0, k[74606] = 0, k[74608] = 0, a = 0;
   do j[D + 12 + (a << 1) >> 1] = 2048, a = a + 1 | 0; while ((a | 0) != 3474);
   if (j[65840] | 0) for (B = 4, C = 0; ;) {
    for (f = (Dc(6, 0) | 0) & 65535, j[D + 6 >> 1] = f, A = (Dc(6, 0) | 0) & 65535, j[D + 6 + 2 >> 1] = A, A = (Dc(6, 0) | 0) & 65535, j[D + 6 + 4 >> 1] = A, A = C + -1 | 0, d = 0; ;) {
     a = D + (d << 1) | 0, z = f << 16 >> 16, h = ka((16777216 / (j[a >> 1] | 0) | 0) + 2047 >> 12, z) | 0, b = (h | 0) > 65564 ? 10 : 12, c = 0;
     do y = D + 12 + (d * 2316 | 0) + (c << 1) | 0, x = (ka(j[y >> 1] | 0, h << 12 - b) | 0) + ~(-1 << b + -1) >> b & 65535, j[y >> 1] = x, c = c + 1 | 0; while ((c | 0) != 1158);
     for (j[a >> 1] = f, t = (d | 0) != 0, u = D + 12 + (d * 2316 | 0) + 1544 | 0, v = A + d | 0, w = 2 - d | 0, x = D + 12 + (d * 2316 | 0) + ((t & 1 ^ 1) << 1) | 0, a = j[65844] | 0, y = 0; ;) {
      if (h = (a & 65535) >>> 1, j[D + 12 + (d * 2316 | 0) + 1544 + ((h & 65535) << 1) >> 1] = z << 7, j[D + 12 + (d * 2316 | 0) + 772 + ((h & 65535) << 1) >> 1] = z << 7, h << 16 >> 16) {
       a = h & 65535, s = 1;
       do {
        s = (Dc(8, D + 6960 + (s << 9) | 0) | 0) << 24 >> 24;
        do if (s) {
         if (o = a + -2 | 0, (s | 0) == 8) {
          a = a + -1 | 0, q = (ka(z, (Dc(8, D + 6960 + 9216 | 0) | 0) & 255) | 0) & 65535, j[D + 12 + (d * 2316 | 0) + 772 + (a << 1) >> 1] = q, q = (ka(z, (Dc(8, D + 6960 + 9216 | 0) | 0) & 255) | 0) & 65535, j[D + 12 + (d * 2316 | 0) + 772 + (o << 1) >> 1] = q, q = (ka(z, (Dc(8, D + 6960 + 9216 | 0) | 0) & 255) | 0) & 65535, j[D + 12 + (d * 2316 | 0) + 1544 + (a << 1) >> 1] = q, a = (ka(z, (Dc(8, D + 6960 + 9216 | 0) | 0) & 255) | 0) & 65535, j[D + 12 + (d * 2316 | 0) + 1544 + (o << 1) >> 1] = a, a = o;
          break;
         }
         n = D + 6960 + (s + 10 << 9) | 0, q = 1;
         do {
          f = q + -1 | 0, p = a;
          do c = p, p = p + -1 | 0, g = (Dc(8, n) | 0) << 24 >> 20, h = j[D + 12 + (d * 2316 | 0) + (f * 772 | 0) + (p << 1) >> 1] | 0, b = j[D + 12 + (d * 2316 | 0) + (q * 772 | 0) + (c << 1) >> 1] | 0, h = t ? ((b << 16 >> 16) + (h << 16 >> 16) | 0) / 2 | 0 : ((h << 16 >> 16 << 1) + (j[D + 12 + (f * 772 | 0) + (c << 1) >> 1] | 0) + (b << 16 >> 16) | 0) / 4 | 0, j[D + 12 + (d * 2316 | 0) + (q * 772 | 0) + (p << 1) >> 1] = h + g; while ((p | 0) > (o | 0));
          q = q + 1 | 0;
         } while ((q | 0) != 3);
         a = o;
        } else do for (q = (a | 0) > 2 ? ((Dc(8, D + 6960 + 4608 | 0) | 0) << 24 >> 24) + 1 | 0 : 1, f = 0; ;) {
         if (!((a | 0) > 0 & (f | 0) < (q | 0))) break;
         n = a + -2 | 0, g = a + -1 | 0, b = j[D + 12 + (d * 2316 | 0) + (g << 1) >> 1] | 0, o = j[D + 12 + (d * 2316 | 0) + (n << 1) >> 1] | 0, p = 1;
         do h = p + -1 | 0, c = j[D + 12 + (d * 2316 | 0) + (p * 772 | 0) + (a << 1) >> 1] | 0, t ? (b = ((c << 16 >> 16) + (b << 16 >> 16) | 0) / 2 | 0, j[D + 12 + (d * 2316 | 0) + (p * 772 | 0) + (g << 1) >> 1] = b, h = (b + (o << 16 >> 16) | 0) / 2 | 0, b &= 65535) : (b = ((b << 16 >> 16 << 1) + (j[D + 12 + (h * 772 | 0) + (a << 1) >> 1] | 0) + (c << 16 >> 16) | 0) / 4 | 0, j[D + 12 + (p * 772 | 0) + (g << 1) >> 1] = b, h = ((o << 16 >> 16 << 1) + (j[D + 12 + (h * 772 | 0) + (g << 1) >> 1] | 0) + (b << 16 >> 16) | 0) / 4 | 0, b &= 65535), o = h & 65535, j[D + 12 + (d * 2316 | 0) + (p * 772 | 0) + (n << 1) >> 1] = o, p = p + 1 | 0; while ((p | 0) != 3);
         if (f & 1 && (o = (Dc(8, D + 6960 + 5120 | 0) | 0) << 24 >> 20, p = D + 12 + (d * 2316 | 0) + 772 + (g << 1) | 0, j[p >> 1] = (m[p >> 1] | 0) + o, p = D + 12 + (d * 2316 | 0) + 772 + (n << 1) | 0, j[p >> 1] = (m[p >> 1] | 0) + o, p = D + 12 + (d * 2316 | 0) + 1544 + (g << 1) | 0, j[p >> 1] = (m[p >> 1] | 0) + o, p = D + 12 + (d * 2316 | 0) + 1544 + (n << 1) | 0, j[p >> 1] = (m[p >> 1] | 0) + o), f = f + 1 | 0, (f | 0) >= 8) {
          a = n;
          break;
         }
         a = n;
        } while ((q | 0) == 9); while (0);
       } while ((a | 0) > 0);
       a = j[65844] | 0;
      }
      c = k[32946] | 0, b = (y << 1) + C | 0, n = 0;
      do if (o = n, n = n + 1 | 0, (a & 65535) > 1) {
       h = j[65896] | 0, g = 0;
       do f = (j[D + 12 + (d * 2316 | 0) + (n * 772 | 0) + (g << 1) >> 1] << 4 | 0) / (z | 0) | 0, f = (f | 0) < 0 ? 0 : f & 65535, t ? (s = c + (w + (g << 1) + (ka(h & 65535, v + (o << 1) | 0) | 0) << 1) | 0, j[s >> 1] = f) : (s = c + ((g << 1) + o + (ka(h & 65535, b + o | 0) | 0) << 1) | 0, j[s >> 1] = f), g = g + 1 | 0; while ((g | 0) < ((a & 65535) >>> 1 & 65535 | 0));
      } while ((n | 0) != 2);
      if (Fg(x | 0, u | 0, 772 - ((t & 1 ^ 1) << 1) | 0) | 0, !((y | 0) < (t & 1 ^ 1 | 0))) break;
      y = y + 1 | 0;
     }
     if (d = d + 1 | 0, (d | 0) == 3) {
      b = a, f = C;
      break;
     }
     f = j[D + 6 + (d << 1) >> 1] | 0;
    }
    do {
     if (b << 16 >> 16) {
      d = b & 65535, h = 0;
      do h + f & 1 ? (y = h + -1 | 0, A = h + 1 | 0, x = ka(m[65896] | 0, f) | 0, z = c + (x + h << 1) | 0, h = (m[z >> 1] << 1) + -4096 + (((m[c + (x + ((A | 0) < (d | 0) ? A : y) << 1) >> 1] | 0) + (m[c + (x + ((h | 0) != 0 ? y : A) << 1) >> 1] | 0) | 0) >>> 1) | 0, j[z >> 1] = (h | 0) < 0 ? 0 : h & 65535, h = A) : h = h + 1 | 0, d = a & 65535; while ((h | 0) < (d | 0));
      b = a;
     } else b = 0;
     f = f + 1 | 0;
    } while ((f | 0) != (B | 0));
    if (C = C + 4 | 0, b = j[65840] | 0, (C | 0) >= (b & 65535 | 0)) {
     d = b;
     break;
    }
    B = B + 4 | 0;
   } else d = 0, c = k[32946] | 0, a = j[65844] | 0;
   if (a &= 65535, ka(a, d & 65535) | 0) {
    b = 0;
    do C = c + (b << 1) | 0, j[C >> 1] = j[576 + (m[C >> 1] << 1) >> 1] | 0, b = b + 1 | 0; while ((b | 0) < (ka(a, d & 65535) | 0));
   }
   k[32952] = 16383, r = D;
  }
  function re() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0;
   if (H = r, r = r + 128 | 0, +o[20] != 0 && (k[32912] = k[20], k[32913] = k[21], k[32914] = k[22], k[32915] = k[23]), k[34] | 0 ? G = 5 : (c = k[36] | 0, a = +o[33004], (c | 0) != 0 & a == -1 && (G = 5)), (G | 0) == 5) {
    c = H, d = c + 64 | 0;
    do k[c >> 2] = 0, c = c + 4 | 0; while ((c | 0) < (d | 0));
    if (c = k[52] | 0, y = (k[56] | 0) + c | 0, x = m[65840] | 0, x = y >>> 0 < x >>> 0 ? y : x, y = k[50] | 0, A = (k[54] | 0) + y | 0, z = m[65844] | 0, A = A >>> 0 < z >>> 0 ? A : z, B = (k[80] | 0) == 0, C = k[32928] | 0, D = (k[32952] | 0) + -25 | 0, E = m[65848] | 0, F = m[65852] | 0, c >>> 0 < x >>> 0) for (;;) {
     if (v = c, c = c + 8 | 0, y >>> 0 < A >>> 0) {
      u = y;
      do {
       k[H + 88 >> 2] = 0, k[H + 88 + 4 >> 2] = 0, k[H + 88 + 8 >> 2] = 0, k[H + 88 + 12 >> 2] = 0, k[H + 88 + 16 >> 2] = 0, k[H + 88 + 20 >> 2] = 0, k[H + 88 + 24 >> 2] = 0, k[H + 88 + 28 >> 2] = 0, q = u, u = u + 8 | 0, t = v;
       a: for (;;) {
        f = ka(z, t) | 0, e = ka(t >>> E, F) | 0, s = q;
        do {
         for (n = f + s | 0, g = e + (s >>> E) | 0, h = 0; ;) {
          if (h >>> 0 >= 4) break;
          if (B ? (d = C + (n << 3) + (h << 1) | 0, i = h) : (i = jc(t, s) | 0, d = C + (g << 3) + (i << 1) | 0), h = m[d >> 1] | 0, h >>> 0 > D >>> 0) break a;
          if (h = h - (m[132256 + (i << 1) >> 1] | 0) | 0, d = H + 88 + (i << 2) | 0, k[d >> 2] = ((h | 0) < 0 ? 0 : h) + (k[d >> 2] | 0), d = H + 88 + (i + 4 << 2) | 0, k[d >> 2] = (k[d >> 2] | 0) + 1, !B) break;
          h = i + 1 | 0;
         }
         s = s + 1 | 0;
        } while (s >>> 0 < u >>> 0 & s >>> 0 < A >>> 0);
        if (t = t + 1 | 0, !(t >>> 0 < c >>> 0 & t >>> 0 < x >>> 0)) {
         h = 0, G = 21;
         break;
        }
       }
       if ((G | 0) == 21) for (;;) {
        if (G = 0, t = H + (h << 3) | 0, p[t >> 3] = +p[t >> 3] + +((k[H + 88 + (h << 2) >> 2] | 0) >>> 0), h = h + 1 | 0, (h | 0) == 8) break;
        G = 21;
       }
      } while (u >>> 0 < A >>> 0);
     }
     if (c >>> 0 >= x >>> 0) {
      c = 0;
      break;
     }
    } else c = 0;
    do a = +p[H + (c << 3) >> 3], a != 0 && (o[131648 + (c << 2) >> 2] = +p[H + (c + 4 << 3) >> 3] / a), c = c + 1 | 0; while ((c | 0) != 4);
    c = k[36] | 0, a = +o[33004];
   }
   do if ((c | 0) != 0 & a != -1) {
    k[H + 88 >> 2] = 0, k[H + 88 + 4 >> 2] = 0, k[H + 88 + 8 >> 2] = 0, k[H + 88 + 12 >> 2] = 0, k[H + 88 + 16 >> 2] = 0, k[H + 88 + 20 >> 2] = 0, k[H + 88 + 24 >> 2] = 0, k[H + 88 + 28 >> 2] = 0, d = k[80] | 0, h = 0;
    do {
     f = h << 1, g = 0;
     do e = d >>> ((g & 1 | f) << 1) & 3, c = (m[165240 + (h << 4) + (g << 1) >> 1] | 0) - (m[132256 + (e << 1) >> 1] | 0) | 0, (c | 0) > 0 && (k[H + 88 + (e << 2) >> 2] = (k[H + 88 + (e << 2) >> 2] | 0) + c), k[H + 88 + ((e | 4) << 2) >> 2] = (k[H + 88 + ((e | 4) << 2) >> 2] | 0) + 1, g = g + 1 | 0; while ((g | 0) != 8);
     h = h + 1 | 0;
    } while ((h | 0) != 8);
    if (c = k[H + 88 >> 2] | 0, c && (d = k[H + 88 + 4 >> 2] | 0, d && (e = k[H + 88 + 8 >> 2] | 0, e && (f = k[H + 88 + 12 >> 2] | 0)))) {
     o[32912] = +((k[H + 88 + 16 >> 2] | 0) >>> 0) / +(c >>> 0), o[32913] = +((k[H + 88 + 20 >> 2] | 0) >>> 0) / +(d >>> 0), o[32914] = +((k[H + 88 + 24 >> 2] | 0) >>> 0) / +(e >>> 0), o[32915] = +((k[H + 88 + 28 >> 2] | 0) >>> 0) / +(f >>> 0);
     break;
    }
    if (a != 0 & +o[33006] != 0) {
     k[32912] = k[33004], k[32913] = k[33005], k[32914] = k[33006], k[32915] = k[33007];
     break;
    }
    G = k[w >> 2] | 0, k[H + 64 >> 2] = k[96], Jb(G | 0, 323376, H + 64 | 0) | 0;
    break;
   } while (0);
   for (a = +o[32913], a == 0 && (o[32913] = 1, a = 1), b = +o[32915], b == 0 && (b = (k[32932] | 0) >>> 0 < 4 ? a : 1, o[32915] = b), +o[24] != 0 && (qe(), a = +o[32913], b = +o[32915]), d = (k[32952] | 0) - (k[32950] | 0) | 0, k[32952] = d, l = +o[32912], I = l < 1.7976931348623157e308 ? l : 1.7976931348623157e308, J = l > 0 ? l : 0, I = I > a ? a : I, a = J < a ? a : J, J = +o[32914], I = I > J ? J : I, a = a < J ? J : a, b = (k[32] | 0) == 0 ? I > b ? b : I : a < b ? b : a, a = l, c = 0; ;) {
    if (J = a / b, o[131648 + (c << 2) >> 2] = J, o[H + 72 + (c << 2) >> 2] = J * 65535 / +(d >>> 0), c = c + 1 | 0, (c | 0) == 4) break;
    a = +o[131648 + (c << 2) >> 2];
   }
   if (f = k[80] | 0, f >>> 0 > 1e3 && (c = j[66132] | 0, ((c & 65535) + 1 & 131070 | 0) == 2 && (d = j[66133] | 0, ((d & 65535) + 1 & 131070 | 0) == 2))) {
    for (e = 0; ;) {
     if (F = d & 65535, F = 132256 + ((((e & 1) >>> 0) % (F >>> 0) | 0 | 6) + (ka(F, (e >>> 1 >>> 0) % ((c & 65535) >>> 0) | 0) | 0) << 1) | 0, G = 132256 + ((f >>> (e << 1) & 3) << 1) | 0, j[G >> 1] = (m[G >> 1] | 0) + (m[F >> 1] | 0), e = e + 1 | 0, (e | 0) == 4) break;
     c = j[66132] | 0, d = j[66133] | 0;
    }
    j[66133] = 0, j[66132] = 0;
   }
   if (f = m[65852] | 0, e = k[32928] | 0, n = ka(f, m[82616] | 0) | 0, n << 2) {
    i = 0;
    do g = e + (i << 1) | 0, c = j[g >> 1] | 0, c << 16 >> 16 && (h = j[66132] | 0, h << 16 >> 16 ? (d = j[66133] | 0, d << 16 >> 16 ? (G = i >>> 2, G = 132256 + ((ka((((G >>> 0) / (f >>> 0) | 0) >>> 0) % ((h & 65535) >>> 0) | 0, d & 65535) | 0) + 6 + ((((G >>> 0) % (f >>> 0) | 0) >>> 0) % ((d & 65535) >>> 0) | 0) << 1) | 0, c = (c & 65535) - (m[G >> 1] | 0) | 0) : c &= 65535) : c &= 65535, G = i & 3, G = ~~(+o[H + 72 + (G << 2) >> 2] * +(c - (m[132256 + (G << 1) >> 1] | 0) | 0)), G = (G | 0) < 65535 ? G : 65535, j[g >> 1] = (G | 0) < 0 ? 0 : G & 65535), i = i + 1 | 0; while ((i | 0) != (n << 2 | 0));
   }
   a = +p[2];
   b: do if ((a != 1 | +p[4] != 1) & (k[32932] | 0) == 3) for (c = 0; ;) {
    if (h = 16 + (c << 3) | 0, a != 1) {
     if (e = ug(n << 1) | 0, mc(e, 323416), g = k[32928] | 0, n) {
      d = 0;
      do j[e + (d << 1) >> 1] = j[g + (d << 3) + (c << 1) >> 1] | 0, d = d + 1 | 0; while ((d | 0) != (n | 0));
     }
     if (f = j[82616] | 0, f << 16 >> 16) {
      a = +p[h >> 3], i = 0;
      do {
       if (b = +(f & 65535 | 0) * .5 + (+(i >>> 0) - +(f & 65535 | 0) * .5) * a, ~~b >>> 0 >>> 0 <= ((f & 65535) + -2 | 0) >>> 0 && (h = j[65852] | 0, h << 16 >> 16)) {
        d = 0;
        do l = +(h & 65535 | 0) * .5 + (+(d >>> 0) - +(h & 65535 | 0) * .5) * a, ~~l >>> 0 >>> 0 <= ((h & 65535) + -2 | 0) >>> 0 && (F = (~~l >>> 0) + (ka(h & 65535, ~~b >>> 0) | 0) | 0, G = g + ((ka(h & 65535, i) | 0) + d << 3) + (c << 1) | 0, j[G >> 1] = ~~((1 - (b - +(~~b >>> 0 >>> 0))) * ((1 - (l - +(~~l >>> 0 >>> 0))) * +(m[e + (F << 1) >> 1] | 0 | 0) + (l - +(~~l >>> 0 >>> 0)) * +(m[e + (F + 1 << 1) >> 1] | 0 | 0)) + (b - +(~~b >>> 0 >>> 0)) * ((1 - (l - +(~~l >>> 0 >>> 0))) * +(m[e + (F + (h & 65535) << 1) >> 1] | 0 | 0) + (l - +(~~l >>> 0 >>> 0)) * +(m[e + ((h & 65535) + 1 + F << 1) >> 1] | 0 | 0)))), d = d + 1 | 0; while ((d | 0) != (h & 65535 | 0));
       }
       i = i + 1 | 0;
      } while ((i | 0) != (f & 65535 | 0));
     }
     vg(e);
    }
    if (c = c + 2 | 0, c >>> 0 >= 4) break b;
    a = +p[16 + (c << 3) >> 3];
   } while (0);
   r = H;
  }
  function Ff(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, j = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
   if (q = r, r = r + 1056 | 0, m = i[b >> 0] | 0, !(m << 24 >> 24)) return b = a, r = q, b | 0;
   if (n = Bf(a, m << 24 >> 24) | 0, !n) return b = 0, r = q, b | 0;
   if (j = i[b + 1 >> 0] | 0, !(j << 24 >> 24)) return b = n, r = q, b | 0;
   if (d = i[n + 1 >> 0] | 0, !(d << 24 >> 24)) return b = 0, r = q, b | 0;
   if (f = i[b + 2 >> 0] | 0, !(f << 24 >> 24)) {
    for (e = n + 1 | 0, a = d, c = n, d = l[n >> 0] << 8 | d & 255; ;) {
     if (d &= 65535, (d | 0) == (j & 255 | (m & 255) << 8 | 0)) break;
     if (a = e + 1 | 0, c = i[a >> 0] | 0, !(c << 24 >> 24)) {
      c = e, a = 0;
      break;
     }
     b = e, e = a, a = c, d = c & 255 | d << 8, c = b;
    }
    return b = a << 24 >> 24 != 0 ? c : 0, r = q, b | 0;
   }
   if (e = i[n + 2 >> 0] | 0, !(e << 24 >> 24)) return b = 0, r = q, b | 0;
   if (g = i[b + 3 >> 0] | 0, !(g << 24 >> 24)) {
    if (a = (e & 255) << 8 | (d & 255) << 16 | l[n >> 0] << 24, (a | 0) == ((j & 255) << 16 | (m & 255) << 24 | (f & 255) << 8 | 0)) c = n + 2 | 0, a = e; else {
     c = n + 2 | 0, d = a;
     do c = c + 1 | 0, a = i[c >> 0] | 0, d = (a & 255 | d) << 8; while (!(a << 24 >> 24 == 0 ? 1 : (d | 0) == ((j & 255) << 16 | (m & 255) << 24 | (f & 255) << 8 | 0)));
    }
    return b = a << 24 >> 24 != 0 ? c + -2 | 0 : 0, r = q, b | 0;
   }
   if (a = i[n + 3 >> 0] | 0, !(a << 24 >> 24)) return b = 0, r = q, b | 0;
   if (!(i[b + 4 >> 0] | 0)) {
    if (d = (e & 255) << 8 | (d & 255) << 16 | a & 255 | l[n >> 0] << 24, (d | 0) == ((j & 255) << 16 | (m & 255) << 24 | (f & 255) << 8 | g & 255 | 0)) c = n + 3 | 0; else {
     c = n + 3 | 0;
     do c = c + 1 | 0, a = i[c >> 0] | 0, d = a & 255 | d << 8; while (!(a << 24 >> 24 == 0 ? 1 : (d | 0) == ((j & 255) << 16 | (m & 255) << 24 | (f & 255) << 8 | g & 255 | 0)));
    }
    return b = a << 24 >> 24 != 0 ? c + -3 | 0 : 0, r = q, b | 0;
   }
   for (k[q + 1024 >> 2] = 0, k[q + 1024 + 4 >> 2] = 0, k[q + 1024 + 8 >> 2] = 0, k[q + 1024 + 12 >> 2] = 0, k[q + 1024 + 16 >> 2] = 0, k[q + 1024 + 20 >> 2] = 0, k[q + 1024 + 24 >> 2] = 0, k[q + 1024 + 28 >> 2] = 0, a = m, p = 0; ;) {
    if (!(i[n + p >> 0] | 0)) {
     a = 0;
     break;
    }
    if (o = q + 1024 + (((a & 255) >>> 5 & 255) << 2) | 0, k[o >> 2] = k[o >> 2] | 1 << (a & 31), o = p + 1 | 0, k[q + ((a & 255) << 2) >> 2] = o, a = i[b + o >> 0] | 0, !(a << 24 >> 24)) {
     c = 23;
     break;
    }
    p = o;
   }
   a: do if ((c | 0) == 23) {
    b: do if (o >>> 0 > 1) {
     c = 1, h = -1, a = 0;
     c: for (;;) {
      for (g = 1; ;) {
       d: for (;;) {
        for (f = c, d = 1; ;) {
         if (e = i[b + (d + h) >> 0] | 0, c = i[b + f >> 0] | 0, e << 24 >> 24 != c << 24 >> 24) break d;
         if ((d | 0) == (g | 0)) break;
         if (d = d + 1 | 0, c = d + a | 0, c >>> 0 >= o >>> 0) {
          a = h, m = g;
          break c;
         }
         f = c;
        }
        if (a = a + g | 0, c = a + 1 | 0, c >>> 0 >= o >>> 0) {
         a = h, m = g;
         break c;
        }
       }
       if (d = f - h | 0, (e & 255) <= (c & 255)) break;
       if (c = f + 1 | 0, c >>> 0 >= o >>> 0) {
        a = h, m = d;
        break c;
       }
       a = f, g = d;
      }
      if (c = a + 2 | 0, c >>> 0 >= o >>> 0) {
       m = 1;
       break;
      }
      h = a, a = a + 1 | 0;
     }
     for (e = 1, j = -1, d = 0; ;) {
      for (c = 1; ;) {
       e: for (;;) {
        for (h = e, g = 1; ;) {
         if (e = i[b + (g + j) >> 0] | 0, f = i[b + h >> 0] | 0, e << 24 >> 24 != f << 24 >> 24) break e;
         if ((g | 0) == (c | 0)) break;
         if (g = g + 1 | 0, e = g + d | 0, e >>> 0 >= o >>> 0) {
          d = j, e = m;
          break b;
         }
         h = e;
        }
        if (d = d + c | 0, e = d + 1 | 0, e >>> 0 >= o >>> 0) {
         d = j, e = m;
         break b;
        }
       }
       if (c = h - j | 0, (e & 255) >= (f & 255)) break;
       if (e = h + 1 | 0, e >>> 0 >= o >>> 0) {
        d = j, e = m;
        break b;
       }
       d = h;
      }
      if (e = d + 2 | 0, e >>> 0 >= o >>> 0) {
       e = m, c = 1;
       break;
      }
      j = d, d = d + 1 | 0;
     }
    } else a = -1, d = -1, e = 1, c = 1; while (0);
    if (m = (d + 1 | 0) >>> 0 > (a + 1 | 0) >>> 0, j = m ? c : e, m = m ? d : a, mg(b, b + j | 0, m + 1 | 0) | 0) g = o | 63, f = (m >>> 0 > (o - m + -1 | 0) >>> 0 ? m : o - m + -1 | 0) + 1 | 0; else if ((o | 0) == (j | 0)) g = o | 63, f = o; else {
     a = n, g = 0, e = n;
     f: for (;;) {
      c = a;
      do {
       if ((e - c | 0) >>> 0 < o >>> 0) {
        if (d = lg(e, 0, o | 63) | 0) {
         if ((d - c | 0) >>> 0 < o >>> 0) {
          a = 0;
          break a;
         }
         break;
        }
        d = e + (o | 63) | 0;
        break;
       }
       d = e;
      } while (0);
      if (c = i[a + p >> 0] | 0, 1 << (c & 31) & k[q + 1024 + (((c & 255) >>> 5 & 255) << 2) >> 2]) if (c = k[q + ((c & 255) << 2) >> 2] | 0, (o | 0) == (c | 0)) {
       e = (m + 1 | 0) >>> 0 > g >>> 0 ? m + 1 | 0 : g, c = i[b + e >> 0] | 0;
       g: do {
        if (c << 24 >> 24) {
         for (;;) {
          if (c << 24 >> 24 != (i[a + e >> 0] | 0)) break;
          if (e = e + 1 | 0, c = i[b + e >> 0] | 0, !(c << 24 >> 24)) {
           c = m + 1 | 0;
           break g;
          }
         }
         a = a + (e - m) | 0, g = 0, e = d;
         continue f;
        }
        c = m + 1 | 0;
       } while (0);
       do {
        if (c >>> 0 <= g >>> 0) break a;
        c = c + -1 | 0;
       } while ((i[b + c >> 0] | 0) == (i[a + c >> 0] | 0));
       a = a + j | 0, g = o - j | 0, e = d;
      } else a = a + ((g | 0) != 0 & (o - c | 0) >>> 0 < j >>> 0 ? o - j | 0 : o - c | 0) | 0, g = 0, e = d; else a = a + o | 0, g = 0, e = d;
     }
    }
    a = n, d = n;
    h: for (;;) {
     e = a;
     do if ((d - e | 0) >>> 0 < o >>> 0) {
      if (c = lg(d, 0, g) | 0) {
       if ((c - e | 0) >>> 0 < o >>> 0) {
        a = 0;
        break a;
       }
       d = c;
       break;
      }
      d = d + g | 0;
      break;
     } while (0);
     if (c = i[a + p >> 0] | 0, 1 << (c & 31) & k[q + 1024 + (((c & 255) >>> 5 & 255) << 2) >> 2]) if (c = k[q + ((c & 255) << 2) >> 2] | 0, (o | 0) == (c | 0)) {
      c = i[b + (m + 1) >> 0] | 0;
      i: do {
       if (c << 24 >> 24) {
        for (e = m + 1 | 0; ;) {
         if (c << 24 >> 24 != (i[a + e >> 0] | 0)) break;
         if (e = e + 1 | 0, c = i[b + e >> 0] | 0, !(c << 24 >> 24)) {
          c = m + 1 | 0;
          break i;
         }
        }
        a = a + (e - m) | 0;
        continue h;
       }
       c = m + 1 | 0;
      } while (0);
      do {
       if (!c) break a;
       c = c + -1 | 0;
      } while ((i[b + c >> 0] | 0) == (i[a + c >> 0] | 0));
      a = a + f | 0;
     } else a = a + (o - c) | 0; else a = a + o | 0;
    }
   } while (0);
   return b = a, r = q, b | 0;
  }
  function Qe() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, p = 0, q = 0, s = 0, u = 0, v = 0, w = 0, x = 0;
   if (x = r, r = r + 480 | 0, k[33048] = 16, a = k[41342] | 0, a && (kb(k[140] | 0, a | 0, 0) | 0, Jc(x, 1) | 0 && (k[33048] = k[x + 4 >> 2], j[66080] = k[x + 12 >> 2], j[66084] = k[x + 8 >> 2])), w = k[41502] | 0) {
    c = w;
    do c = c + -1 | 0, d = 165480 + (c * 48 | 0) + 44 | 0, b = +o[d >> 2], b != 0 ? (o[41348] = b, o[t >> 2] = b, a = k[t >> 2] | 0) : a = k[41348] | 0, k[d >> 2] = a; while ((c | 0) != 0);
    for (q = k[2] | 0, c = j[65896] | 0, d = j[65916] | 0, s = 0, u = 0, n = -1, p = 0; ;) {
     e = k[165480 + (s * 48 | 0) + 28 >> 2] | 0, a = (u | 0) < (e | 0) ? e : u, u = (a | 0) > 3 ? 3 : a, a = ka(d & 65535, c & 65535) | 0, l = k[165480 + (s * 48 | 0) >> 2] | 0, g = k[165480 + (s * 48 | 0) + 4 >> 2] | 0, f = ka(g, l) | 0, h = k[165480 + (s * 48 | 0) + 12 >> 2] | 0;
     do if ((e | 0) == 3 & (h | 0) == 6) f = n, a = p; else if ((f | 0) != 0 & (g | l | 0) < 65536) {
      if ((f | 0) > (a | 0)) a = 1; else {
       if ((f | 0) != (a | 0)) {
        f = n, a = p;
        break;
       }
       if (a = p + 1 | 0, (q | 0) != (p | 0)) {
        f = n;
        break;
       }
      }
      j[65896] = l, j[65916] = g, k[32998] = k[165480 + (s * 48 | 0) + 8 >> 2], k[32956] = h, k[33002] = k[165480 + (s * 48 | 0) + 20 >> 2], k[41674] = k[165480 + (s * 48 | 0) + 24 >> 2], k[32990] = e, k[32996] = k[165480 + (s * 48 | 0) + 36 >> 2], k[32992] = k[165480 + (s * 48 | 0) + 40 >> 2], k[41348] = k[165480 + (s * 48 | 0) + 44 >> 2], d = g & 65535, c = l & 65535, f = s;
     } else f = n, a = p; while (0);
     if (s = s + 1 | 0, (s | 0) == (w | 0)) break;
     n = f, p = a;
    }
    (a | 0) != 0 & (k[32994] | 0) == 1 ? (k[32994] = a, h = f) : h = f;
   } else u = 0, h = -1;
   if (k[32996] | 0 || (k[32996] = 2147483647), k[32992] | 0 || (k[32992] = 2147483647), w) {
    a = w;
    do a = a + -1 | 0, c = k[165480 + (a * 48 | 0) + 24 >> 2] | 0, c && (k[41674] = c); while ((a | 0) != 0);
   }
   a: do if (!((h | 0) < 0 | (k[41268] | 0) != 0)) {
    a = k[32956] | 0;
    do {
     if ((a | 0) == 65535) {
      k[41268] = 23;
      break a;
     }
     if ((a | 0) == 34713) {
      if (a = m[65896] | 0, c = m[65916] | 0, s = ka((((a + 9 | 0) >>> 0) / 10 | 0) << 4, c) | 0, d = k[165480 + (h * 48 | 0) + 32 >> 2] | 0, (s | 0) == (d | 0)) {
       k[41268] = 9, k[32962] = 1;
       break a;
      }
      if (a = ka(c, a) | 0, (a * 3 | 0) == (d << 1 | 0)) {
       if (k[41268] = 9, (i[132096] | 0) != 78) break a;
       k[32962] = 80;
       break a;
      }
      if ((a * 3 | 0) == (d | 0)) {
       k[41268] = 21, me(.4166666666666667, 12.92, 1, 4095), Jg(132256, 0, 8204) | 0, k[80] = 0;
       break a;
      }
      if ((a << 1 | 0) == (d | 0)) {
       k[41268] = 18, k[32962] = 4, j[284] = 19789;
       break a;
      }
      k[41268] = 22;
      break a;
     }
     if ((a | 0) == 32767) {
      if (a = k[165480 + (h * 48 | 0) + 32 >> 2] | 0, c = m[65916] | 0, d = ka(c, m[65896] | 0) | 0, (a | 0) == (d | 0)) {
       k[32998] = 12, k[41268] = 19;
       break a;
      }
      if ((a << 3 | 0) == (ka(k[32998] | 0, d) | 0)) {
       k[32962] = 79, a = 79, v = 35;
       break;
      }
      j[65916] = c + 8, k[41268] = 13;
      break a;
     }
     if ((a | 0) == 65e3) {
      if (a = k[165480 + (h * 48 | 0) + 16 >> 2] | 0, (a | 0) == 32803) {
       k[41268] = 26;
       break a;
      }
      if ((a | 0) == 6) {
       k[41268] = 25, k[80] = 0;
       break a;
      }
      if ((a | 0) == 2) {
       k[41268] = 24, k[80] = 0;
       break a;
      }
      break a;
     }
     if ((a | 0) == 1 | (a | 0) == 0) s = (qg(132032, 586656, 7) | 0) == 0, c = k[165480 + (h * 48 | 0) + 32 >> 2] | 0, s ? (d = j[65896] | 0, a = j[65916] | 0, (c << 1 | 0) == (ka((d & 65535) * 3 | 0, a & 65535) | 0) && (k[32962] = 24)) : (d = j[65896] | 0, a = j[65916] | 0), (c * 5 | 0) == (ka((d & 65535) << 3, a & 65535) | 0) ? (k[32962] = 81, k[32998] = 12) : v = 42; else if ((a | 0) == 32773 | (a | 0) == 32770) v = 42; else {
      if ((a | 0) == 99 | (a | 0) == 7 | (a | 0) == 6) {
       k[41268] = 4;
       break a;
      }
      if ((a | 0) == 262) {
       k[41268] = 8;
       break a;
      }
      if ((a | 0) == 34892 | (a | 0) == 32867) break a;
      if ((a | 0) != 32769) {
       k[32994] = 0;
       break a;
      }
      a = k[32962] | 0, v = 35;
     }
    } while (0);
    (v | 0) == 35 && (k[32962] = a + 1, v = 42);
    do if ((v | 0) == 42) {
     if (a = k[32998] | 0, (a | 0) == 14) k[32962] = 0; else {
      if ((a | 0) == 12) break;
      if ((a | 0) == 8) {
       k[41268] = 7;
       break a;
      }
      if ((a | 0) != 16) break a;
     }
     if (k[41268] = 18, qg(132032, 586656, 7) | 0) break a;
     if (((k[165480 + (h * 48 | 0) + 32 >> 2] | 0) * 7 | 0) <= (ka(m[65916] | 0, m[65896] | 0) | 0)) break a;
     k[41268] = 20;
     break a;
    } while (0);
    (k[165480 + (h * 48 | 0) + 16 >> 2] | 0) == 2 && (k[32962] = 6), k[41268] = 9;
   } while (0);
   do if (!(k[32960] | 0)) {
    if ((k[32990] | 0) == 3 ? (a = k[32998] | 0, ((a | 0) != 14 ? (k[165480 + (h * 48 | 0) + 32 >> 2] | 0) != 0 : 0) ? (k[32956] & -16 | 0) == 32768 && (v = 74) : v = 74) : (a = k[32998] | 0, v = 74), (v | 0) == 74) {
     if ((a | 0) != 8) break;
     if (lc(132032, 588272) | 0) break;
     if (Ff(131864, 588280) | 0) break;
    }
    k[32994] = 0;
   } while (0);
   do if (w) {
    f = 0, c = -1;
    do (f | 0) != (h | 0) && (k[165480 + (f * 48 | 0) + 28 >> 2] | 0) == (u | 0) && (a = k[165480 + (f * 48 | 0) >> 2] | 0, d = k[165480 + (f * 48 | 0) + 4 >> 2] | 0, q = ka(d, a) | 0, e = k[165480 + (f * 48 | 0) + 8 >> 2] | 0, q = (q | 0) / ((ka(e, e) | 0) + 1 | 0) | 0, s = ka(m[66084] | 0, m[66080] | 0) | 0, v = k[33048] | 0, q >>> 0 > ((s >>> 0) / (((ka(v, v) | 0) + 1 | 0) >>> 0) | 0) >>> 0 && (k[165480 + (f * 48 | 0) + 12 >> 2] | 0) != 34892 && (j[66080] = a, j[66084] = d, k[41342] = k[165480 + (f * 48 | 0) + 20 >> 2], k[33044] = k[165480 + (f * 48 | 0) + 32 >> 2], k[33048] = e, c = f)), f = f + 1 | 0; while ((f | 0) != (w | 0));
    if ((c | 0) > -1) {
     if (k[33048] = k[33048] | k[165480 + (c * 48 | 0) + 28 >> 2] << 5, a = k[165480 + (c * 48 | 0) + 12 >> 2] | 0, (a | 0) == 1) {
      if ((k[165480 + (c * 48 | 0) + 8 >> 2] | 0) < 9) {
       k[41676] = 28;
       break;
      }
      if (og(132032, 587608) | 0) {
       k[41678] = 30;
       break;
      }
      k[41676] = 29;
      break;
     }
     if (a) {
      if ((a | 0) == 65e3) {
       k[41678] = (k[165480 + (c * 48 | 0) + 16 >> 2] | 0) == 6 ? 25 : 24;
       break;
      }
      break;
     }
     k[41676] = 27;
     break;
    }
   } while (0);
   r = x;
  }
  function pf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0;
   h = r, r = r + 32 | 0, Jg(a | 0, 0, 1376) | 0, c = (Sa(1296910665) | 0) >>> 16 & 65535, j[a >> 1] = c, j[a + 2 >> 1] = 42, k[a + 4 >> 2] = 10, k[a + 484 >> 2] = 300, k[a + 476 >> 2] = 300, k[a + 488 >> 2] = 1, k[a + 480 >> 2] = 1, k[a + 496 >> 2] = 1e6, k[a + 504 >> 2] = 1e6, k[a + 512 >> 2] = 1e6, k[a + 492 >> 2] = ~~(+o[41348] * 1e6), k[a + 500 >> 2] = ~~(+o[41346] * 1e6), k[a + 508 >> 2] = ~~(+o[41504] * 1e6), Dg(a + 620 | 0, 166168, 512) | 0, Dg(a + 1132 | 0, 132032, 64) | 0, Dg(a + 1196 | 0, 132096, 64) | 0, c = a + 1260 | 0, d = 614608, e = c + 12 | 0;
   do i[c >> 0] = i[d >> 0] | 0, c = c + 1 | 0, d = d + 1 | 0; while ((c | 0) < (e | 0));
   if (l = Ua(165224) | 0, c = (k[l + 16 >> 2] | 0) + 1 | 0, e = k[l + 12 >> 2] | 0, d = k[l + 8 >> 2] | 0, f = k[l + 4 >> 2] | 0, g = k[l >> 2] | 0, k[h >> 2] = (k[l + 20 >> 2] | 0) + 1900, k[h + 4 >> 2] = c, k[h + 8 >> 2] = e, k[h + 12 >> 2] = d, k[h + 16 >> 2] = f, k[h + 20 >> 2] = g, eg(a + 1292 | 0, 614624, h), Dg(a + 1312 | 0, 165416, 64) | 0, b ? (c = a + 10 + 2 | 0, f = j[a + 10 >> 1] | 0, k[c + ((f & 65535) * 12 | 0) + 8 >> 2] = 0, k[c + ((f & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((f & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((f & 65535) * 12 | 0) >> 1] = 254, e = m[65844] | 0, k[c + ((f + 1 & 65535) * 12 | 0) + 8 >> 2] = e, k[c + ((f + 1 & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((f + 1 & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((f + 1 & 65535) * 12 | 0) >> 1] = 256, d = m[65840] | 0, j[a + 10 >> 1] = f + 3 << 16 >> 16, k[c + ((f + 2 & 65535) * 12 | 0) + 8 >> 2] = d, k[c + ((f + 2 & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((f + 2 & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((f + 2 & 65535) * 12 | 0) >> 1] = 257, f = k[32932] | 0, g = k[42] | 0, of(a, a + 10 | 0, 258, 3, f, g), f >>> 0 > 2 && (k[a + 12 + (((m[a + 10 >> 1] | 0) + -1 | 0) * 12 | 0) + 8 >> 2] = 468), j[a + 468 >> 1] = g, j[a + 470 >> 1] = g, j[a + 472 >> 1] = g, j[a + 474 >> 1] = g, of(a, a + 10 | 0, 259, 3, 1, 1), of(a, a + 10 | 0, 262, 3, 1, f >>> 0 > 1 ? 2 : 1), of(a, a + 10 | 0, 270, 2, 512, 620), of(a, a + 10 | 0, 271, 2, 64, 1132), of(a, a + 10 | 0, 272, 2, 64, 1196), b = k[41694] | 0, b = b ? Fa(k[b >> 2] | 0) | 0 : 0, l = j[a + 10 >> 1] | 0, j[a + 10 >> 1] = l + 1 << 16 >> 16, k[c + ((l & 65535) * 12 | 0) + 8 >> 2] = b + 1376, k[c + ((l & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((l & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((l & 65535) * 12 | 0) >> 1] = 273, of(a, a + 10 | 0, 277, 3, 1, f), l = j[a + 10 >> 1] | 0, k[c + ((l & 65535) * 12 | 0) + 8 >> 2] = d, k[c + ((l & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((l & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((l & 65535) * 12 | 0) >> 1] = 278, d = (ka(ka(ka(e, d) | 0, f) | 0, g) | 0) >>> 3, j[a + 10 >> 1] = l + 2 << 16 >> 16, k[c + ((l + 1 & 65535) * 12 | 0) + 8 >> 2] = d, k[c + ((l + 1 & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((l + 1 & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((l + 1 & 65535) * 12 | 0) >> 1] = 279, d = l + 2 << 16 >> 16) : (of(a, a + 10 | 0, 270, 2, 512, 620), of(a, a + 10 | 0, 271, 2, 64, 1132), of(a, a + 10 | 0, 272, 2, 64, 1196), of(a, a + 10 | 0, 274, 3, 1, (i[614656 + (k[41352] | 0) >> 0] | 0) + -48 | 0), c = a + 10 + 2 | 0, d = j[a + 10 >> 1] | 0, b = 0), f = d & 65535, k[c + (f * 12 | 0) + 8 >> 2] = 476, k[c + (f * 12 | 0) + 4 >> 2] = 1, j[c + (f * 12 | 0) + 2 >> 1] = 5, j[c + (f * 12 | 0) >> 1] = 282, j[a + 10 >> 1] = d + 2 << 16 >> 16, f = d + 1 & 65535, k[c + (f * 12 | 0) + 8 >> 2] = 484, k[c + (f * 12 | 0) + 4 >> 2] = 1, j[c + (f * 12 | 0) + 2 >> 1] = 5, j[c + (f * 12 | 0) >> 1] = 283, of(a, a + 10 | 0, 284, 3, 1, 1), of(a, a + 10 | 0, 296, 3, 1, 2), of(a, a + 10 | 0, 305, 2, 32, 1260), of(a, a + 10 | 0, 306, 2, 20, 1292), of(a, a + 10 | 0, 315, 2, 64, 1312), f = j[a + 10 >> 1] | 0, j[a + 10 >> 1] = f + 1 << 16 >> 16, k[c + ((f & 65535) * 12 | 0) + 8 >> 2] = 294, k[c + ((f & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((f & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((f & 65535) * 12 | 0) >> 1] = -30871, b && of(a, a + 10 | 0, -30861, 7, b, 1376), g = a + 294 + 2 | 0, f = j[a + 294 >> 1] | 0, k[g + ((f & 65535) * 12 | 0) + 8 >> 2] = 492, k[g + ((f & 65535) * 12 | 0) + 4 >> 2] = 1, j[g + ((f & 65535) * 12 | 0) + 2 >> 1] = 5, j[g + ((f & 65535) * 12 | 0) >> 1] = -32102, j[a + 294 >> 1] = f + 2 << 16 >> 16, k[g + ((f + 1 & 65535) * 12 | 0) + 8 >> 2] = 500, k[g + ((f + 1 & 65535) * 12 | 0) + 4 >> 2] = 1, j[g + ((f + 1 & 65535) * 12 | 0) + 2 >> 1] = 5, j[g + ((f + 1 & 65535) * 12 | 0) >> 1] = -32099, of(a, a + 294 | 0, -30681, 3, 1, ~~+o[41344]), f = j[a + 294 >> 1] | 0, j[a + 294 >> 1] = f + 1 << 16 >> 16, k[g + ((f & 65535) * 12 | 0) + 8 >> 2] = 508, k[g + ((f & 65535) * 12 | 0) + 4 >> 2] = 1, j[g + ((f & 65535) * 12 | 0) + 2 >> 1] = 5, j[g + ((f & 65535) * 12 | 0) >> 1] = -28150, k[41509] | 0) {
    d = j[a + 10 >> 1] | 0, j[a + 10 >> 1] = d + 1 << 16 >> 16, k[c + ((d & 65535) * 12 | 0) + 8 >> 2] = 346, k[c + ((d & 65535) * 12 | 0) + 4 >> 2] = 1, j[c + ((d & 65535) * 12 | 0) + 2 >> 1] = 4, j[c + ((d & 65535) * 12 | 0) >> 1] = -30683, of(a, a + 346 | 0, 0, 1, 4, 514), of(a, a + 346 | 0, 1, 2, 2, k[41537] | 0), d = a + 346 + 2 | 0, c = j[a + 346 >> 1] | 0, j[a + 346 >> 1] = c + 1 << 16 >> 16, k[d + ((c & 65535) * 12 | 0) + 8 >> 2] = 516, k[d + ((c & 65535) * 12 | 0) + 4 >> 2] = 3, j[d + ((c & 65535) * 12 | 0) + 2 >> 1] = 5, j[d + ((c & 65535) * 12 | 0) >> 1] = 2, of(a, a + 346 | 0, 3, 2, 2, k[41538] | 0), c = j[a + 346 >> 1] | 0, j[a + 346 >> 1] = c + 1 << 16 >> 16, k[d + ((c & 65535) * 12 | 0) + 8 >> 2] = 540, k[d + ((c & 65535) * 12 | 0) + 4 >> 2] = 3, j[d + ((c & 65535) * 12 | 0) + 2 >> 1] = 5, j[d + ((c & 65535) * 12 | 0) >> 1] = 4, of(a, a + 346 | 0, 5, 1, 1, k[41539] | 0), c = j[a + 346 >> 1] | 0, k[d + ((c & 65535) * 12 | 0) + 8 >> 2] = 588, k[d + ((c & 65535) * 12 | 0) + 4 >> 2] = 1, j[d + ((c & 65535) * 12 | 0) + 2 >> 1] = 5, j[d + ((c & 65535) * 12 | 0) >> 1] = 6, j[a + 346 >> 1] = c + 2 << 16 >> 16, k[d + ((c + 1 & 65535) * 12 | 0) + 8 >> 2] = 564, k[d + ((c + 1 & 65535) * 12 | 0) + 4 >> 2] = 3, j[d + ((c + 1 & 65535) * 12 | 0) + 2 >> 1] = 5, j[d + ((c + 1 & 65535) * 12 | 0) >> 1] = 7, of(a, a + 346 | 0, 18, 2, 12, 596), of(a, a + 346 | 0, 29, 2, 12, 608), c = a + 516 | 0, d = 166032, e = c + 104 | 0;
    do k[c >> 2] = k[d >> 2], c = c + 4 | 0, d = d + 4 | 0; while ((c | 0) < (e | 0));
   }
   r = h;
  }
  function ve() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0;
   D = r, r = r + 1072 | 0, ue(), B = k[80] | 0, A = (B | 0) == 9 ? 6 : (B | 0) == 1 ? 16 : 2, B = (B | 0) == 9 ? 6 : (B | 0) == 1 ? 16 : 8, a = wg(ka(B, A) | 0, 1280) | 0, mc(a, 323456), s = 0;
   do {
    t = s, s = s + 1 | 0, q = 0;
    do {
     k[D + 48 + (t << 6) + (q << 2) >> 2] = a, p = q, q = q + 1 | 0, o = 323480, n = 0;
     do {
      h = i[o >> 0] | 0, b = i[o + 1 >> 0] | 0, c = i[o + 2 >> 0] | 0, l = i[o + 3 >> 0] | 0, f = i[o + 4 >> 0] | 0, g = o, o = o + 6 | 0, k[80966] = o, g = i[g + 5 >> 0] | 0, e = jc(h + t | 0, b + p | 0) | 0;
      do if ((jc(c + t | 0, l + p | 0) | 0) == (e | 0)) {
       if (d = (jc(t, q) | 0) == (e | 0) ? (jc(s, p) | 0) == (e | 0) : 0, d = d ? 2 : 1, (((h - c | 0) > -1 ? h - c | 0 : 0 - (h - c) | 0) | 0) == (d | 0) && (((b - l | 0) > -1 ? b - l | 0 : 0 - (b - l) | 0) | 0) == (d | 0)) break;
       z = m[65844] | 0, b = ((ka(z, h) | 0) + b << 2) + e | 0, k[a >> 2] = b, b = ((ka(z, c) | 0) + l << 2) + e | 0, k[a + 4 >> 2] = b, k[a + 8 >> 2] = f, b = 0, a = a + 12 | 0;
       do 1 << b & g && (k[a >> 2] = b, a = a + 4 | 0), b = b + 1 | 0; while ((b | 0) != 8);
       k[a >> 2] = -1, a = a + 4 | 0;
      } while (0);
      n = n + 1 | 0;
     } while ((n | 0) != 64);
     for (k[a >> 2] = 2147483647, n = j[65844] | 0, f = 323872, h = 0, l = a + 4 | 0; ;) {
      if (b = i[f >> 0] | 0, c = f, f = f + 2 | 0, k[80966] = f, c = i[c + 1 >> 0] | 0, d = (ka(n & 65535, b) | 0) + c | 0, g = l + 4 | 0, k[l >> 2] = d << 2, e = jc(t, p) | 0, b = (jc(b + t | 0, c + p | 0) | 0) == (e | 0) ? 0 : (jc((b << 1) + t | 0, (c << 1) + p | 0) | 0) == (e | 0) ? (d << 3) + e | 0 : 0, k[g >> 2] = b, h = h + 1 | 0, (h | 0) == 8) break;
      l = l + 8 | 0;
     }
     a = a + 68 | 0;
    } while ((q | 0) < (A | 0));
   } while ((s | 0) < (B | 0));
   if (z = wg((n & 65535) * 3 | 0, 8) | 0, mc(z, 323456), y = j[65844] | 0, x = j[65840] | 0, ((x & 65535) + -2 | 0) > 2) for (c = z + ((y & 65535) << 3) | 0, u = z, b = z + ((y & 65535) << 1 << 3) | 0, w = 2; ;) {
    if (q = b, ((y & 65535) + -2 | 0) > 2) {
     s = (w | 0) % (B | 0) | 0, p = k[32928] | 0, v = 2;
     do {
      if (t = (ka(y & 65535, w) | 0) + v | 0, h = k[D + 48 + (s << 6) + (((v | 0) % (A | 0) | 0) << 2) >> 2] | 0, k[D >> 2] = 0, k[D + 4 >> 2] = 0, k[D + 8 >> 2] = 0, k[D + 12 >> 2] = 0, k[D + 16 >> 2] = 0, k[D + 20 >> 2] = 0, k[D + 24 >> 2] = 0, k[D + 28 >> 2] = 0, a = k[h >> 2] | 0, (a | 0) == 2147483647) f = 0; else {
       for (d = h; ;) {
        if (l = (m[p + (t << 3) + (a << 1) >> 1] | 0) - (m[p + (t << 3) + (k[d + 4 >> 2] << 1) >> 1] | 0) | 0, l = (l >> 31 ^ l) - (l >> 31) << k[d + 8 >> 2], h = D + (k[d + 12 >> 2] << 2) | 0, k[h >> 2] = l + (k[h >> 2] | 0), h = d + 20 | 0, a = k[d + 16 >> 2] | 0, (a | 0) != -1) if (k[D + (a << 2) >> 2] = (k[D + (a << 2) >> 2] | 0) + l, d = d + 24 | 0, a = k[h >> 2] | 0, (a | 0) == -1) h = d; else for (;;) {
         if (h = D + (a << 2) | 0, k[h >> 2] = (k[h >> 2] | 0) + l, h = d + 4 | 0, a = k[d >> 2] | 0, (a | 0) == -1) break;
         d = h;
        }
        if (a = k[h >> 2] | 0, (a | 0) == 2147483647) break;
        d = h;
       }
       f = k[D >> 2] | 0;
      }
      a = 1, d = f, l = f;
      do o = k[D + (a << 2) >> 2] | 0, l = (l | 0) > (o | 0) ? o : l, d = (d | 0) < (o | 0) ? o : d, a = a + 1 | 0; while ((a | 0) != 8);
      if (d) {
       for (n = l + (d >> 1) | 0, k[D + 32 >> 2] = 0, k[D + 32 + 4 >> 2] = 0, k[D + 32 + 8 >> 2] = 0, k[D + 32 + 12 >> 2] = 0, o = jc(w, v) | 0, d = f, a = 0, g = h + 4 | 0, e = 0; ;) {
        if ((d | 0) <= (n | 0)) {
         if (h = g + 4 | 0, d = k[32932] | 0) {
          f = 0;
          do (f | 0) == (o | 0) ? (l = k[h >> 2] | 0, l ? k[D + 32 + (o << 2) >> 2] = (((m[p + (t << 3) + (l << 1) >> 1] | 0) + (m[p + (t << 3) + (o << 1) >> 1] | 0) | 0) >>> 1) + (k[D + 32 + (o << 2) >> 2] | 0) : C = 43) : C = 43, (C | 0) == 43 && (C = 0, l = D + 32 + (f << 2) | 0, k[l >> 2] = (k[l >> 2] | 0) + (m[p + (t << 3) + ((k[g >> 2] | 0) + f << 1) >> 1] | 0)), f = f + 1 | 0; while ((f | 0) != (d | 0));
         }
         e = e + 1 | 0;
        }
        if (a = a + 1 | 0, (a | 0) == 8) break;
        d = k[D + (a << 2) >> 2] | 0, g = g + 8 | 0;
       }
       if (h = k[32932] | 0) {
        d = 0;
        do a = m[p + (t << 3) + (o << 1) >> 1] | 0, (d | 0) != (o | 0) && (a = (((k[D + 32 + (d << 2) >> 2] | 0) - (k[D + 32 + (o << 2) >> 2] | 0) | 0) / (e | 0) | 0) + a | 0), n = (a | 0) < 65535 ? a : 65535, j[q + (v << 3) + (d << 1) >> 1] = (n | 0) < 0 ? 0 : n & 65535, d = d + 1 | 0; while ((d | 0) != (h | 0));
       }
      } else n = m[p + (t << 3) >> 1] | m[p + (t << 3) + 2 >> 1] << 16, o = m[p + (t << 3) + 4 >> 1] | m[p + (t << 3) + 4 + 2 >> 1] << 16, t = q + (v << 3) | 0, j[t >> 1] = n, j[t + 2 >> 1] = n >>> 16, j[t + 4 >> 1] = o, j[t + 4 + 2 >> 1] = o >>> 16;
      v = v + 1 | 0;
     } while ((v | 0) != ((y & 65535) + -2 | 0));
    }
    if ((w | 0) > 3 && (v = (ka(y & 65535, w + -2 | 0) | 0) + 2 | 0, Fg((k[32928] | 0) + (v << 3) | 0, u + 16 | 0, ((y & 65535) << 3) + -32 | 0) | 0), w = w + 1 | 0, (w | 0) == ((x & 65535) + -2 | 0)) {
     a = (x & 65535) + -2 | 0;
     break;
    }
    v = b, b = u, u = c, c = v;
   } else c = z, b = z + ((y & 65535) << 3) | 0, a = 2;
   B = (ka(y & 65535, a + -2 | 0) | 0) + 2 | 0, C = k[32928] | 0, Fg(C + (B << 3) | 0, c + 16 | 0, ((y & 65535) << 3) + -32 | 0) | 0, Fg(C + ((ka(y & 65535, a + -1 | 0) | 0) + 2 << 3) | 0, b + 16 | 0, ((y & 65535) << 3) + -32 | 0) | 0, vg(z), vg(k[D + 48 >> 2] | 0), r = D;
  }
  function Kf(a, b, c, d, e) {
   a |= 0, b |= 0, c |= 0, d |= 0, e |= 0;
   var f = 0, g = 0, h = 0, j = 0, m = 0, n = 0, o = 0, p = 0;
   if (b >>> 0 > 36) return e = wb() | 0, k[e >> 2] = 22, e = 0, a = 0, O = e, a | 0;
   do f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0; while ((Hf(f) | 0) != 0);
   do {
    if ((f | 0) == 43 | (f | 0) == 45) {
     if (g = ((f | 0) == 45) << 31 >> 31, f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0) {
      k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0, p = g;
      break;
     }
     f = Nf(a) | 0, p = g;
     break;
    }
    p = 0;
   } while (0);
   do if ((b & -17 | 0) == 0 & (f | 0) == 48) {
    if (f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, (f | 32 | 0) != 120) {
     if (b) {
      n = 32;
      break;
     }
     b = 8, n = 46;
     break;
    }
    if (b = k[a + 4 >> 2] | 0, b >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = b + 1, f = l[b >> 0] | 0) : f = Nf(a) | 0, (l[625152 + (f + 1) >> 0] | 0) > 15) return b = (k[a + 100 >> 2] | 0) == 0, b || (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), c ? b ? (e = 0, a = 0, O = e, a | 0) : (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, e = 0, a = 0, O = e, a | 0) : (Mf(a, 0), e = 0, a = 0, O = e, a | 0);
    b = 16, n = 46;
   } else {
    if (b = (b | 0) == 0 ? 10 : b, !((l[625152 + (f + 1) >> 0] | 0) >>> 0 < b >>> 0)) return k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), Mf(a, 0), e = wb() | 0, k[e >> 2] = 22, e = 0, a = 0, O = e, a | 0;
    n = 32;
   } while (0);
   if ((n | 0) == 32) if ((b | 0) == 10) {
    if (b = f + -48 | 0, b >>> 0 < 10) {
     g = b, b = 0;
     do b = (b * 10 | 0) + g | 0, f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, g = f + -48 | 0; while (g >>> 0 < 10 & b >>> 0 < 429496729);
     c = 0;
    } else b = 0, c = 0;
    if (g = f + -48 | 0, g >>> 0 < 10) {
     for (;;) {
      if (h = Tg(b | 0, c | 0, 10, 0) | 0, j = O, m = ((g | 0) < 0) << 31 >> 31, j >>> 0 > ~m >>> 0 | (j | 0) == (~m | 0) & h >>> 0 > ~g >>> 0) {
       h = b;
       break;
      }
      if (b = Eg(h | 0, j | 0, g | 0, m | 0) | 0, c = O, f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, g = f + -48 | 0, !(g >>> 0 < 10 & (c >>> 0 < 429496729 | (c | 0) == 429496729 & b >>> 0 < 2576980378))) {
       h = b;
       break;
      }
     }
     g >>> 0 > 9 ? b = h : (b = 10, n = 72);
    }
   } else n = 46;
   a: do if ((n | 0) == 46) {
    if (!(b + -1 & b)) {
     if (n = i[625416 + ((b * 23 | 0) >>> 5 & 7) >> 0] | 0, g = i[625152 + (f + 1) >> 0] | 0, (g & 255) >>> 0 < b >>> 0) {
      c = g & 255, h = 0;
      do h = c | h << n, f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, g = i[625152 + (f + 1) >> 0] | 0, c = g & 255; while (h >>> 0 < 134217728 & c >>> 0 < b >>> 0);
      c = 0;
     } else c = 0, h = 0;
     if (j = Ig(-1, -1, n | 0) | 0, m = O, (g & 255) >>> 0 >= b >>> 0 | (c >>> 0 > m >>> 0 | (c | 0) == (m | 0) & h >>> 0 > j >>> 0)) {
      n = 72;
      break;
     }
     for (;;) if (h = Ng(h | 0, c | 0, n | 0) | 0, c = O, h = g & 255 | h, f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, g = i[625152 + (f + 1) >> 0] | 0, (g & 255) >>> 0 >= b >>> 0 | (c >>> 0 > m >>> 0 | (c | 0) == (m | 0) & h >>> 0 > j >>> 0)) {
      n = 72;
      break a;
     }
    }
    if (g = i[625152 + (f + 1) >> 0] | 0, (g & 255) >>> 0 < b >>> 0) {
     c = g & 255, h = 0;
     do h = c + (ka(h, b) | 0) | 0, f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0, g = i[625152 + (f + 1) >> 0] | 0, c = g & 255; while (h >>> 0 < 119304647 & c >>> 0 < b >>> 0);
     c = 0;
    } else h = 0, c = 0;
    if ((g & 255) >>> 0 < b >>> 0) for (n = Ug(-1, -1, b | 0, 0) | 0, o = O; ;) {
     if (c >>> 0 > o >>> 0 | (c | 0) == (o | 0) & h >>> 0 > n >>> 0) {
      n = 72;
      break a;
     }
     if (j = Tg(h | 0, c | 0, b | 0, 0) | 0, m = O, g &= 255, m >>> 0 > 4294967295 | (m | 0) == -1 & j >>> 0 > ~g >>> 0) {
      n = 72;
      break a;
     }
     if (h = Eg(g | 0, 0, j | 0, m | 0) | 0, j = O, c = k[a + 4 >> 2] | 0, c >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = c + 1, f = l[c >> 0] | 0) : f = Nf(a) | 0, g = i[625152 + (f + 1) >> 0] | 0, (g & 255) >>> 0 >= b >>> 0) {
      c = j, n = 72;
      break;
     }
     c = j;
    } else n = 72;
   } while (0);
   if ((n | 0) == 72) if ((l[625152 + (f + 1) >> 0] | 0) >>> 0 < b >>> 0) {
    do f = k[a + 4 >> 2] | 0, f >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = f + 1, f = l[f >> 0] | 0) : f = Nf(a) | 0; while ((l[625152 + (f + 1) >> 0] | 0) >>> 0 < b >>> 0);
    c = wb() | 0, k[c >> 2] = 34, c = e, b = d;
   } else b = h;
   if (k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), !(c >>> 0 < e >>> 0 | (c | 0) == (e | 0) & b >>> 0 < d >>> 0)) {
    if (!((d & 1 | 0) != 0 | !1 | (p | 0) != 0)) return a = wb() | 0, k[a >> 2] = 34, a = Eg(d | 0, e | 0, -1, -1) | 0, e = O, O = e, a | 0;
    if (c >>> 0 > e >>> 0 | (c | 0) == (e | 0) & b >>> 0 > d >>> 0) return a = wb() | 0, k[a >> 2] = 34, a = d, O = e, a | 0;
   }
   return a = ((p | 0) < 0) << 31 >> 31, a = Bg(b ^ p | 0, c ^ a | 0, p | 0, a | 0) | 0, e = O, O = e, a | 0;
  }
  function Oc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
   if (y = r, r = r + 512 | 0, k[y + 12 >> 2] = 0, k[y + 12 + 4 >> 2] = 0, k[y + 12 + 8 >> 2] = 0, Jc(y + 24 | 0, 0) | 0 && (a = k[y + 24 + 16 >> 2] | 0, (a | 0) >= 4)) {
    for (w = k[y + 24 + 12 >> 2] >> 1, k[y + 24 + 12 >> 2] = w, w = ka(w, a) | 0, e = a, b = j[65928] | 0, f = a, u = 0, c = 0, d = 0, h = 0, v = 0; ;) {
     if (a = ((m[65929] << 1 | 0) / (e | 0) | 0) + u | 0, s = m[65896] | 0, t = u, u = b << 16 >> 16 == 0 | (a | 0) > (s + -1 | 0) ? s & 65534 : a, a = j[65840] | 0, a << 16 >> 16) {
      s = (t | 0) < (u | 0), q = 0;
      do {
       if (o = k[32928] | 0, b = j[65844] | 0, p = ka(b & 65535, q) | 0, s) {
        for (g = t, a = h; ;) {
         if (l = (c | 0) % (w | 0) | 0, l ? n = a : (n = Mc(d, y + 24 | 0) | 0, b = j[65844] | 0, f = k[y + 24 + 16 >> 2] | 0, d = d + 1 | 0), a = b & 65535, (g | 0) < (a | 0)) {
          if (h = g + p | 0, (f | 0) > 2) {
           c = f + -2 | 0, e = 0;
           do z = o + (h + (e & 1) + (ka(a, e >> 1) | 0) << 3) | 0, j[z >> 1] = j[n + (e + l << 1) >> 1] | 0, e = e + 1 | 0; while ((e | 0) != (c | 0));
          }
          j[o + (h << 3) + 2 >> 1] = (m[n + (l + -2 + f << 1) >> 1] | 0) + 49152, j[o + (h << 3) + 4 >> 1] = (m[n + (l + -1 + f << 1) >> 1] | 0) + 49152;
         }
         if (g = g + 2 | 0, c = f + l | 0, (g | 0) >= (u | 0)) break;
         a = n;
        }
        e = f, a = j[65840] | 0, h = n;
       }
       q = q + -1 + (e >> 1) | 0;
      } while ((q | 0) < (a & 65535 | 0));
      b = j[65928] | 0, a = h;
     } else a = h;
     if ((v | 0) >= (b & 65535 | 0)) break;
     h = a, v = v + 1 | 0;
    }
    a = i[131864] | 0;
    a: do if (a << 24 >> 24) for (b = 131864; ;) {
     if (((a << 24 >> 24) + -48 | 0) >>> 0 <= 9) {
      a = b;
      break a;
     }
     if (b = b + 1 | 0, a = i[b >> 0] | 0, !(a << 24 >> 24)) {
      a = b;
      break;
     }
    } else a = 131864; while (0);
    if (k[y >> 2] = y + 12, k[y + 4 >> 2] = y + 12 + 4, k[y + 8 >> 2] = y + 12 + 8, xf(a, 299104, y) | 0, o = k[32982] | 0, n = k[y + 24 + 20 >> 2] | 0, o >>> 0 > 2147484288 ? x = 24 : ((o | 0) == -2147483112 ? (((((k[y + 12 >> 2] | 0) * 1e3 | 0) + (k[y + 12 + 4 >> 2] | 0) | 0) * 1e3 | 0) + (k[y + 12 + 8 >> 2] | 0) | 0) > 1000006 : 0) ? x = 24 : p = (n << 2) + 4 | 0, (x | 0) == 24 && (p = n << 1), f = k[32928] | 0, h = j[65840] | 0, h << 16 >> 16) {
     g = j[65844] | 0, a = f, l = 0;
     do {
      if (!((n >> 1 & l | 0) == 0 | g << 16 >> 16 == 0)) {
       c = 0;
       do d = c - (g & 65535) | 0, b = j[a + (d << 3) + 2 >> 1] | 0, (l | 0) == ((h & 65535) + -1 | 0) ? (j[a + (c << 3) + 2 >> 1] = b, d = j[a + (d << 3) + 4 >> 1] | 0) : (j[a + (c << 3) + 2 >> 1] = ((b << 16 >> 16) + 1 + (j[a + ((g & 65535) + c << 3) + 2 >> 1] | 0) | 0) >>> 1, d = ((j[a + (d << 3) + 4 >> 1] | 0) + 1 + (j[a + ((g & 65535) + c << 3) + 4 >> 1] | 0) | 0) >>> 1 & 65535), j[a + (c << 3) + 4 >> 1] = d, c = c + 2 | 0; while ((c | 0) < (g & 65535 | 0));
      }
      if ((g & 65535) > 1) {
       e = 1;
       do d = e + -1 | 0, b = e + 1 | 0, c = j[a + (d << 3) + 2 >> 1] | 0, (e | 0) == ((g & 65535) + -1 | 0) ? (j[a + (e << 3) + 2 >> 1] = c, d = j[a + (d << 3) + 4 >> 1] | 0) : (j[a + (e << 3) + 2 >> 1] = ((c << 16 >> 16) + 1 + (j[a + (b << 3) + 2 >> 1] | 0) | 0) >>> 1, d = ((j[a + (d << 3) + 4 >> 1] | 0) + 1 + (j[a + (b << 3) + 4 >> 1] | 0) | 0) >>> 1 & 65535), j[a + (e << 3) + 4 >> 1] = d, e = e + 2 | 0; while ((e | 0) < (g & 65535 | 0));
       b = g & 65535;
      } else b = g & 65535;
      l = l + 1 | 0, a = a + (b << 3) | 0;
     } while ((l | 0) != (h & 65535 | 0));
     g = a;
    } else g = f;
    b: do if (f >>> 0 < g >>> 0) for (;;) {
     switch (o | 0) {
     case -2147483112:
     case -2147483056:
     case -2147483039:
     case -2147483007:
     case -2147483001:
      b = f + 2 | 0, x = (j[b >> 1] << 2) + p | 0, j[b >> 1] = x, a = f + 4 | 0, z = (j[a >> 1] << 2) + p | 0, j[a >> 1] = z, e = j[f >> 1] | 0, c = (((z << 16 >> 16) * 22929 | 0) + ((x << 16 >> 16) * 50 | 0) >> 14) + e | 0, d = ((ka(z << 16 >> 16, -11751) | 0) + (ka(x << 16 >> 16, -5640) | 0) >> 14) + e | 0, e = (((x << 16 >> 16) * 29040 | 0) + (ka(z << 16 >> 16, -101) | 0) >> 14) + e | 0;
      break;

     default:
      a = j[f >> 1] | 0, o >>> 0 < 2147484184 && (j[f >> 1] = (a & 65535) + 65024, a = (a & 65535) + 65024 & 65535), e = a << 16 >> 16, a = f + 4 | 0, d = j[a >> 1] | 0, b = f + 2 | 0, z = j[b >> 1] | 0, c = d + e | 0, d = ((ka(z, -778) | 0) - (d << 11) >> 12) + e | 0, e = z + e | 0;
     }
     if (z = (ka(m[65968] | 0, c) | 0) >> 10, z = (z | 0) < 65535 ? z : 65535, j[f >> 1] = (z | 0) < 0 ? 0 : z & 65535, z = (ka(m[65972] | 0, d) | 0) >> 10, z = (z | 0) < 65535 ? z : 65535, j[b >> 1] = (z | 0) < 0 ? 0 : z & 65535, z = (ka(m[65976] | 0, e) | 0) >> 10, z = (z | 0) < 65535 ? z : 65535, j[a >> 1] = (z | 0) < 0 ? 0 : z & 65535, f = f + 8 | 0, f >>> 0 >= g >>> 0) break b;
    } while (0);
    Kc(y + 24 | 0), k[32952] = 16383;
   }
   r = y;
  }
  function kf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0;
   v = r, r = r + 256 | 0, c = v + 72 | 0, g = 614168, h = c + 124 | 0;
   do k[c >> 2] = k[g >> 2], c = c + 4 | 0, g = g + 4 | 0; while ((c | 0) < (h | 0));
   me(+p[6], +p[7], 0, 0), c = v + 200 | 0, g = 131736, h = c + 48 | 0;
   do k[c >> 2] = k[g >> 2], c = c + 4 | 0, g = g + 4 | 0; while ((c | 0) < (h | 0));
   if (a = k[32932] | 0, b = k[40] | 0, u = ((a | 0) == 1 | (k[30] | 0) != 0 | (b + -1 | 0) >>> 0 > 4) & 1 | k[32930], k[32930] = u, !u) {
    s = wg(1024, 1) | 0, k[41694] = s, mc(s, 614296), s = k[41694] | 0, c = s, g = 614320, h = c + 80 | 0;
    do k[c >> 2] = k[g >> 2], c = c + 4 | 0, g = g + 4 | 0; while ((c | 0) < (h | 0));
    l = k[40] | 0, (l | 0) == 5 && (k[s + 16 >> 2] = 1482250784), k[s >> 2] = 252, a = 252, b = 0;
    do k[s + (a >>> 2 << 2) >> 2] = (b | 0) == 0 ? 1952807028 : (b | 0) > 1 ? 1482250784 : 1684370275, t = k[s >> 2] | 0, u = b * 3 | 0, k[v + 72 + (u + 2 << 2) >> 2] = t, a = t + ((k[v + 72 + (u + 3 << 2) >> 2] | 0) + 3 & -4) | 0, k[s >> 2] = a, b = b + 1 | 0; while (b >>> 0 < (k[v + 72 >> 2] | 0) >>> 0);
    c = s + 128 | 0, g = v + 72 | 0, h = c + 124 | 0;
    do k[c >> 2] = k[g >> 2], c = c + 4 | 0, g = g + 4 | 0; while ((c | 0) < (h | 0));
    n = k[614400 + (l + -1 << 2) >> 2] | 0, c = (Cg(n | 0) | 0) + 1 | 0, q = k[v + 72 + 20 >> 2] | 0, k[s + ((q >>> 2) + 2 << 2) >> 2] = c, c = s + ((k[v + 72 + 32 >> 2] | 0) + 8) | 0, g = 614424, h = c + 12 | 0;
    do i[c >> 0] = i[g >> 0] | 0, c = c + 1 | 0, g = g + 1 | 0; while ((c | 0) < (h | 0));
    b = (~~(256 / +p[8] + .5) & 65535) << 16, a = k[v + 72 + 56 >> 2] | 0, c = s + a | 0, g = 614440, h = c + 12 | 0;
    do i[c >> 0] = i[g >> 0] | 0, c = c + 1 | 0, g = g + 1 | 0; while ((c | 0) < (h | 0));
    i[s + (a + 12) >> 0] = b, i[s + (a + 12) + 1 >> 0] = b >> 8, i[s + (a + 12) + 2 >> 0] = b >> 16, i[s + (a + 12) + 3 >> 0] = b >> 24, a = k[v + 72 + 68 >> 2] | 0, c = s + a | 0, g = 614440, h = c + 12 | 0;
    do i[c >> 0] = i[g >> 0] | 0, c = c + 1 | 0, g = g + 1 | 0; while ((c | 0) < (h | 0));
    i[s + (a + 12) >> 0] = b, i[s + (a + 12) + 1 >> 0] = b >> 8, i[s + (a + 12) + 2 >> 0] = b >> 16, i[s + (a + 12) + 3 >> 0] = b >> 24, a = k[v + 72 + 80 >> 2] | 0, c = s + a | 0, g = 614440, h = c + 12 | 0;
    do i[c >> 0] = i[g >> 0] | 0, c = c + 1 | 0, g = g + 1 | 0; while ((c | 0) < (h | 0));
    i[s + (a + 12) >> 0] = b, i[s + (a + 12) + 1 >> 0] = b >> 8, i[s + (a + 12) + 2 >> 0] = b >> 16, i[s + (a + 12) + 3 >> 0] = b >> 24, ne(k[614456 + (l + -1 << 2) >> 2] | 0, v, 3), b = 0;
    do {
     a = b + 2 | 0, d = +p[614480 + (b * 24 | 0) >> 3], f = +p[614480 + (b * 24 | 0) + 8 >> 3], e = +p[614480 + (b * 24 | 0) + 16 >> 3], c = 0;
     do k[s + (a + ((k[v + 72 + ((c * 3 | 0) + 23 << 2) >> 2] | 0) >>> 2) << 2) >> 2] = ~~((d * +p[v + (c * 24 | 0) >> 3] + 0 + f * +p[v + (c * 24 | 0) + 8 >> 3] + e * +p[v + (c * 24 | 0) + 16 >> 3]) * 65536 + .5) >>> 0, c = c + 1 | 0; while ((c | 0) != 3);
     b = b + 1 | 0;
    } while ((b | 0) != 3);
    a = 0;
    do u = s + (a << 2) | 0, t = Sa(k[u >> 2] | 0) | 0, k[u >> 2] = t, a = a + 1 | 0; while ((a | 0) != 256);
    c = s + ((k[v + 72 + 8 >> 2] | 0) + 8) | 0, g = 614552, h = c + 24 | 0;
    do i[c >> 0] = i[g >> 0] | 0, c = c + 1 | 0, g = g + 1 | 0; while ((c | 0) < (h | 0));
    Og(s + (q + 12) | 0, n | 0) | 0, a = k[32932] | 0, b = k[40] | 0, c = 0;
    do {
     if (a) {
      g = k[614456 + (b + -1 << 2) >> 2] | 0, d = +p[g + (c * 24 | 0) >> 3], e = +p[g + (c * 24 | 0) + 8 >> 3], f = +p[g + (c * 24 | 0) + 16 >> 3], g = 0;
      do o[v + 200 + (c << 4) + (g << 2) >> 2] = d * +o[131736 + (g << 2) >> 2] + 0 + e * +o[131752 + (g << 2) >> 2] + f * +o[131768 + (g << 2) >> 2], g = g + 1 | 0; while ((g | 0) != (a | 0));
     }
     c = c + 1 | 0;
    } while ((c | 0) != 3);
   }
   if (Jg(166784, 0, 131072) | 0, l = j[65840] | 0, l << 16 >> 16) {
    t = (a | 0) == 0, c = k[32928] | 0, u = 0;
    do {
     if (s = j[65844] | 0, s << 16 >> 16) {
      for (q = 0, n = c; ;) {
       if (k[32930] | 0) k[30] | 0 && (g = n + ((jc(u, q) | 0) << 1) | 0, j[n >> 1] = j[g >> 1] | 0); else {
        if (t) e = 0, f = 0, d = 0; else {
         e = 0, f = 0, d = 0, h = 0;
         do w = +(m[n + (h << 1) >> 1] | 0 | 0), e += +o[v + 200 + (h << 2) >> 2] * w, f += +o[v + 200 + 16 + (h << 2) >> 2] * w, d += +o[v + 200 + 32 + (h << 2) >> 2] * w, h = h + 1 | 0; while ((h | 0) != (a | 0));
        }
        g = ~~e, g = (g | 0) < 65535 ? g : 65535, j[n >> 1] = (g | 0) < 0 ? 0 : g & 65535, g = ~~f, g = (g | 0) < 65535 ? g : 65535, j[n + 2 >> 1] = (g | 0) < 0 ? 0 : g & 65535, g = ~~d, g = (g | 0) < 65535 ? g : 65535, j[n + 4 >> 1] = (g | 0) < 0 ? 0 : g & 65535;
       }
       if (!t) {
        g = 0;
        do h = 166784 + (g << 15) + ((m[n + (g << 1) >> 1] | 0) >>> 3 << 2) | 0, k[h >> 2] = (k[h >> 2] | 0) + 1, g = g + 1 | 0; while ((g | 0) != (a | 0));
       }
       if (q = q + 1 | 0, (q | 0) == (s & 65535 | 0)) break;
       n = n + 8 | 0;
      }
      c = c + ((s & 65535) << 2 << 1) | 0;
     }
     u = u + 1 | 0;
    } while ((u | 0) != (l & 65535 | 0));
   }
   (a | 0) == 4 & (b | 0) != 0 && (k[32932] = 3), (k[30] | 0) != 0 & (k[80] | 0) != 0 && (k[32932] = 1), r = v;
  }
  function qe() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0;
   for (D = r, r = r + 16 | 0, b = k[32952] | 0, a = 1; ;) {
    if (!(b << a >>> 0 < 65536)) break;
    a = a + 1 | 0;
   }
   if (z = a + -1 | 0, k[32952] = b << z, k[32950] = k[32950] << z, j[66128] = (m[66128] | 0) << z, j[66129] = (m[66129] | 0) << z, j[66130] = (m[66130] | 0) << z, j[66131] = (m[66131] | 0) << z, a = j[82616] | 0, b = j[65852] | 0, w = ka(b & 65535, a & 65535) | 0, C = w >>> 0 < 357892096 ? ug((b & 65535) + (a & 65535) + (w * 3 | 0) << 2) | 0 : 0, mc(C, 323320), x = C + (w * 3 << 2) | 0, y = k[32932] | 0, B = k[80] | 0, (((y | 0) == 3 & (B | 0) != 0 & 1) + y | 0) > 0) {
    u = k[32928] | 0, s = ka(b & 65535, a & 65535) | 0, t = 0;
    do {
     if (w) {
      a = 0;
      do v = +_(+ +((m[u + (a << 3) + (t << 1) >> 1] | 0) << z | 0)) * 256, o[C + (a << 2) >> 2] = v, a = a + 1 | 0; while ((a | 0) < (w | 0));
     }
     e = j[82616] | 0, a = e, g = 0, q = 0;
     do {
      if (p = g, g = ka((q & 1) + 1 | 0, w) | 0, l = 1 << q, b = j[65852] | 0, a << 16 >> 16) {
       f = 0;
       do {
        if (a = ka(b & 65535, f) | 0, pe(x, C + (a + p << 2) | 0, 1, b & 65535, l), b << 16 >> 16) {
         d = 0;
         do o[C + (d + g + a << 2) >> 2] = +o[C + (d + (w * 3 | 0) << 2) >> 2] * .25, d = d + 1 | 0; while ((d | 0) != (b & 65535 | 0));
        }
        f = f + 1 | 0;
       } while ((f | 0) < (e & 65535 | 0));
       a = e;
      } else a = 0;
      if (b << 16 >> 16) for (i = b & 65535, f = b & 65535, b = 0; ;) {
       if (d = b + g | 0, pe(x, C + (d << 2) | 0, i, a & 65535, l), e << 16 >> 16) {
        a = 0;
        do A = C + (d + (ka(i, a) | 0) << 2) | 0, o[A >> 2] = +o[C + (a + (w * 3 | 0) << 2) >> 2] * .25, a = a + 1 | 0; while ((a | 0) != (e & 65535 | 0));
       }
       if (b = b + 1 | 0, (b | 0) == (f | 0)) {
        a = e;
        break;
       }
       a = e;
      }
      if (h = +o[24] * +o[323344 + (q << 2) >> 2], w) {
       d = 0;
       do {
        b = C + (d + p << 2) | 0, c = +o[b >> 2] - +o[C + (d + g << 2) >> 2], o[b >> 2] = c;
        do {
         if (!(c < -h)) {
          if (c > h) {
           o[b >> 2] = c - h, c -= h;
           break;
          }
          o[b >> 2] = 0, c = 0;
          break;
         }
         o[b >> 2] = h + c, c = h + c;
        } while (0);
        p && (A = C + (d << 2) | 0, o[A >> 2] = c + +o[A >> 2]), d = d + 1 | 0;
       } while ((d | 0) < (w | 0));
      }
      q = q + 1 | 0;
     } while ((q | 0) != 5);
     if (w) {
      a = 0;
      do v = +o[C + (a << 2) >> 2] + +o[C + (a + s << 2) >> 2], A = (~~(v * v * 152587890625e-16) | 0) < 65535 ? ~~(v * v * 152587890625e-16) : 65535, j[u + (a << 3) + (t << 1) >> 1] = (A | 0) < 0 ? 0 : A & 65535, a = a + 1 | 0; while ((a | 0) < (w | 0));
     }
     t = t + 1 | 0;
    } while ((t | 0) != (y + ((y | 0) == 3 & (B | 0) != 0 & 1) | 0));
   }
   if ((y | 0) == 3 & (B | 0) != 0) {
    a = 0;
    do A = a, a = a + 1 | 0, o[D + 8 + (A << 2) >> 2] = +o[131648 + ((B >>> (a << 2) & 2 | 1) << 2) >> 2] * .125 / +o[131648 + ((B >>> (A << 2) & 2 | 1) << 2) >> 2], k[D + (A << 2) >> 2] = m[132256 + ((B >>> (A << 2) & 2 | 1) << 1) >> 1]; while ((a | 0) != 2);
    if (t = j[65844] | 0, u = k[32928] | 0, v = +o[24] * .001953125, s = j[65840] | 0, ((s & 65535) + -1 | 0) > 1) {
     x = 2, y = 1, a = C, b = C + ((t & 65535) << 1) | 0, d = C + ((t & 65535) << 2) | 0, A = -1;
     do {
      if (z = y, y = y + 1 | 0, w = (A | 0) > (x | 0), (A | 0) < (y | 0)) for (i = a, a = b, b = d, g = A; ;) {
       if (g = g + 1 | 0, d = g << 1 & 14, e = i, (B >>> (d << 1 | 2) & 1) >>> 0 < (t & 65535) >>> 0) {
        f = B >>> (d << 1 | 2) & 1;
        do q = m[65848] | 0, q = u + ((ka(g >> q, m[65852] | 0) | 0) + (f >> q) << 3) + ((B >>> ((f & 1 | d) << 1) & 3) << 1) | 0, j[e + (f << 1) >> 1] = j[q >> 1] | 0, f = f + 2 | 0; while ((f | 0) < (t & 65535 | 0));
       }
       if ((g | 0) == (x | 0)) {
        d = i;
        break;
       }
       p = b, q = a, b = i, a = p, i = q;
      }
      if (f = a, e = d, g = b, ((B >>> ((z << 1 & 14) << 1) & 1) + 1 | 0) < ((t & 65535) + -1 | 0)) {
       l = k[D + ((z & 1 ^ 1) << 2) >> 2] << 2, n = +o[D + 8 + ((z & 1) << 2) >> 2], p = k[D + ((z & 1) << 2) >> 2] | 0, q = (B >>> ((z << 1 & 14) << 1) & 1) + 1 | 0;
       do E = q + -1 | 0, i = q + 1 | 0, c = n * +((m[f + (i << 1) >> 1] | 0) + (m[f + (E << 1) >> 1] | 0) + (m[e + (E << 1) >> 1] | 0) + (m[e + (i << 1) >> 1] | 0) - l | 0) + +((m[g + (q << 1) >> 1] | 0) + p | 0) * .5, c = c < 0 ? 0 : +_(+c), i = m[65848] | 0, i = u + ((ka(z >> i, m[65852] | 0) | 0) + (q >> i) << 3) + ((B >>> ((q & 1 | z << 1 & 14) << 1) & 3) << 1) | 0, h = +_(+ +(m[i >> 1] | 0)) - c, h < -v ? h = v + h : h > v ? h -= v : h = 0, h = c + h, E = (~~(h * h + .5) | 0) < 65535 ? ~~(h * h + .5) : 65535, j[i >> 1] = (E | 0) < 0 ? 0 : E & 65535, q = q + 2 | 0; while ((q | 0) < ((t & 65535) + -1 | 0));
      }
      A = w ? A : x, x = x + 1 | 0;
     } while ((x | 0) != (s & 65535 | 0));
    }
   }
   vg(C), r = D;
  }
  function Ce() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0;
   if (O = r, r = r + 16 | 0, c = +tf(4 - (k[32] | 0) | 0), d = k[32932] | 0) {
    a = 0;
    do k[O + (a << 2) >> 2] = ~~(+o[131648 + (a << 2) >> 2] * 32e3), a = a + 1 | 0; while ((a | 0) != (d | 0));
    if (d >>> 0 > 1) {
     b = 1, a = 0;
     do a = +o[131648 + (a << 2) >> 2] < +o[131648 + (b << 2) >> 2] ? b : a, b = b + 1 | 0; while ((b | 0) != (d | 0));
    } else a = 0;
   } else a = 0;
   if (D = 4 >>> (m[65848] | 0), C = ((m[65840] | 0) >>> 0) / (D >>> 0) | 0, D = ((m[65844] | 0) >>> 0) / (D >>> 0) | 0, E = wg(C, D << 2) | 0, mc(E, 586536), F = k[32932] | 0, G = ka(D, C) | 0, H = k[32928] | 0, I = ~~(32 / c), F) {
    M = 0;
    do {
     if ((M | 0) != (a | 0)) {
      if (Jg(E | 0, 0, G << 2 | 0) | 0, J = j[65848] | 0, K = m[65844] | 0, L = O + (M << 2) | 0, t = ka(4 >>> (J & 65535), 4 >>> (J & 65535)) | 0, C) for (y = 4 >>> (J & 65535), B = 0; ;) {
       if (u = ka(4 >>> (J & 65535), B) | 0, v = ka(B, D) | 0, B = B + 1 | 0, D) for (w = u >>> 0 < (ka(4 >>> (J & 65535), B) | 0) >>> 0, x = 4 >>> (J & 65535), z = 0; ;) {
        if (p = ka(4 >>> (J & 65535), z) | 0, A = z, z = z + 1 | 0, w) {
         q = p >>> 0 < (ka(4 >>> (J & 65535), z) | 0) >>> 0, h = 0, s = u, g = 0, e = 0;
         do {
          if (n = ka(K, s) | 0, q) {
           l = k[L >> 2] | 0, f = p;
           do {
            d = n + f | 0, b = m[H + (d << 3) + (M << 1) >> 1] | 0;
            do if (((b | 0) / (l | 0) | 0 | 0) == 1) {
             if (d = j[H + (d << 3) + (a << 1) >> 1] | 0, (d & 65535) <= 24e3) break;
             h = h + 1 | 0, g += +(b | 0), e += +(d & 65535 | 0);
            } while (0);
            f = f + 1 | 0;
           } while ((f | 0) != (x | 0));
          }
          s = s + 1 | 0;
         } while ((s | 0) != (y | 0));
        } else h = 0, g = 0, e = 0;
        if ((h | 0) == (t | 0) && (o[E + (A + v << 2) >> 2] = g / e), z >>> 0 >= D >>> 0) break;
        x = x + (4 >>> (J & 65535)) | 0;
       }
       if (B >>> 0 >= C >>> 0) {
        s = I;
        break;
       }
       y = y + (4 >>> (J & 65535)) | 0;
      } else s = I;
      for (;;) {
       if (!s) {
        N = 42;
        break;
       }
       if (s = s + -1 | 0, C) {
        q = 0;
        do {
         if (n = ka(q, D) | 0, D) {
          p = 0;
          do {
           if (l = E + (p + n << 2) | 0, +o[l >> 2] == 0) {
            for (h = 0, f = 0, e = 0; ;) {
             d = (i[586560 + (f << 1) >> 0] | 0) + q | 0, b = (i[586560 + (f << 1) + 1 >> 0] | 0) + p | 0;
             do if (d >>> 0 < C >>> 0 & b >>> 0 < D >>> 0) {
              if (B = E + ((ka(d, D) | 0) + b << 2) | 0, g = +o[B >> 2], !(g > 0)) {
               d = h;
               break;
              }
              B = (f & 1) + 1 | 0, d = B + h | 0, e += +(B >>> 0) * g;
             } else d = h; while (0);
             if (f = f + 1 | 0, (f | 0) == 8) break;
             h = d;
            }
            (d | 0) > 3 && (o[l >> 2] = -(c + e) / (c + +(d | 0)));
           }
           p = p + 1 | 0;
          } while (p >>> 0 < D >>> 0);
         }
         q = q + 1 | 0;
        } while (q >>> 0 < C >>> 0);
       }
       if (!G) break;
       d = 0, f = 0;
       do b = E + (f << 2) | 0, e = +o[b >> 2], e < 0 && (o[b >> 2] = -e, d = 1), f = f + 1 | 0; while ((f | 0) != (G | 0));
       if (!d) {
        N = 42;
        break;
       }
      }
      if ((N | 0) == 42 && (N = 0, G)) {
       b = 0;
       do d = E + (b << 2) | 0, +o[d >> 2] == 0 && (o[d >> 2] = 1), b = b + 1 | 0; while ((b | 0) != (G | 0));
      }
      if (C) {
       t = 0;
       do if (u = t, t = t + 1 | 0, p = ka(u, D) | 0, D) {
        q = 0;
        do if (d = ka(4 >>> (J & 65535), u) | 0, s = q, q = q + 1 | 0, d >>> 0 < (ka(4 >>> (J & 65535), t) | 0) >>> 0) {
         b = 4 >>> (J & 65535);
         do {
          if (b = ka(b, s) | 0, b >>> 0 < (ka(4 >>> (J & 65535), q) | 0) >>> 0) {
           n = k[L >> 2] | 0;
           do {
            f = (ka(K, d) | 0) + b | 0, h = H + (f << 3) + (M << 1) | 0, l = m[h >> 1] | 0;
            do if (((l | 0) / (n | 0) | 0 | 0) > 1) {
             if (f = ~~(+o[E + (s + p << 2) >> 2] * +(m[H + (f << 3) + (a << 1) >> 1] | 0)), (l | 0) >= (f | 0)) break;
             B = (f | 0) < 65535 ? f : 65535, j[h >> 1] = (B | 0) < 0 ? 0 : B & 65535;
            } while (0);
            b = b + 1 | 0;
           } while (b >>> 0 < (ka(4 >>> (J & 65535), q) | 0) >>> 0);
          }
          d = d + 1 | 0, b = 4 >>> (J & 65535);
         } while (d >>> 0 < (ka(b, t) | 0) >>> 0);
        } while (q >>> 0 < D >>> 0);
       } while (t >>> 0 < C >>> 0);
      }
     }
     M = M + 1 | 0;
    } while ((M | 0) != (F | 0));
   }
   vg(E), r = O;
  }
  function Te(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, m = 0, n = 0, q = 0;
   n = r, r = r + 16 | 0, k[n >> 2] = 1173554192, kb(k[140] | 0, a + -4 + b | 0, 0) | 0, b = (rc() | 0) + a | 0, kb(k[140] | 0, b | 0, 0) | 0, b = pc() | 0;
   a: do if ((b & 65535 | c | 0) <= 127 && b << 16 >> 16) for (l = b & 65535, e = 1040, b = -1; ;) {
    l = l + -1 | 0, f = pc() | 0, g = rc() | 0, m = (vb(k[140] | 0) | 0) + 4 | 0, d = k[140] | 0, kb(d | 0, (rc() | 0) + a | 0, 0) | 0, (((f & 65535) >>> 8) + 8 | 8 | 0) == 56 && Te(vb(k[140] | 0) | 0, g, c + 1 | 0);
    b: do switch (f << 16 >> 16) {
    case 2058:
     Ga(132032, 64, 1, k[140] | 0) | 0, kb(k[140] | 0, (Cg(132032) | 0) + -63 | 0, 1) | 0, Ga(132096, 64, 1, k[140] | 0) | 0, d = e;
     break;

    case 8199:
     d = vb(k[140] | 0) | 0, k[41342] = d, k[33044] = g, d = e;
     break;

    case 6168:
     rc() | 0, d = rc() | 0, q = +Qf((k[t >> 2] = d, - +o[t >> 2])), o[41348] = q, d = rc() | 0, q = +Qf((k[t >> 2] = d, +o[t >> 2] * .5)), o[41346] = q, d = e;
     break;

    case 50:
     if ((g | 0) == 768) {
      if (kb(k[140] | 0, 72, 1) | 0, q = 1024 / +((pc() | 0) & 65535 | 0), o[33004] = q, q = 1024 / +((pc() | 0) & 65535 | 0), o[33005] = q, q = 1024 / +((pc() | 0) & 65535 | 0), o[33007] = q, q = 1024 / +((pc() | 0) & 65535 | 0), o[33006] = q, b) {
       d = e;
       break b;
      }
      o[33004] = -1, d = e, b = 0;
      break b;
     }
     if (+o[33004] != 0) d = e; else {
      (pc() | 0) << 16 >> 16 == e << 16 >> 16 ? (d = (Ff(132096, 588384) | 0) != 0, d = (i[(d ? 588392 : 588416) + b >> 0] | 0) + -46 | 0) : (d = (i[588440 + b >> 0] | 0) + -48 | 0, j[n + 2 >> 1] = 0, j[n >> 1] = 0, e = 0), kb(k[140] | 0, (d << 3) + 78 | 0, 1) | 0, d = 0;
      do h = pc() | 0, o[132016 + ((d ^ 1 ^ d >> 1) << 2) >> 2] = +((j[n + ((d & 1) << 1) >> 1] ^ h) & 65535 | 0), d = d + 1 | 0; while ((d | 0) != 4);
      b ? (d = e, h = 31) : (o[33004] = -1, d = e, b = 0, h = 31);
     }
     break;

    case 4138:
     rc() | 0, q = +Qf(+((pc() | 0) & 65535 | 0) * .03125 + -4) * 50, o[41344] = q, pc() | 0, q = +Qf(+((pc() | 0) << 16 >> 16) * .015625), o[41346] = q, q = +Qf(+(0 - ((pc() | 0) << 16 >> 16) | 0) * .03125), o[41348] = q, pc() | 0, b = pc() | 0, b = (b & 65535) > 17 ? 0 : b & 65535, kb(k[140] | 0, 32, 1) | 0, +o[41348] > 1e6 ? (q = +((pc() | 0) & 65535 | 0) / 10, o[41348] = q, d = e) : d = e;
     break;

    case 4265:
     (g | 0) > 66 && (b = (i[588464 + b >> 0] | 0) + -48 | 0), kb(k[140] | 0, b << 3 | 2 | 0, 1) | 0, q = +((pc() | 0) & 65535), o[33004] = q, q = +((pc() | 0) & 65535), o[33005] = q, q = +((pc() | 0) & 65535), o[33007] = q, q = +((pc() | 0) & 65535), o[33006] = q, d = e, h = 31;
     break;

    case 6160:
     d = (rc() | 0) & 65535, j[65844] = d, d = (rc() | 0) & 65535, j[65840] = d, d = rc() | 0, p[20836] = (k[t >> 2] = d, +o[t >> 2]), d = rc() | 0, k[41352] = d, d = e;
     break;

    case 6197:
     d = rc() | 0, k[32956] = d, d = e;
     break;

    case 4140:
     if (g = ((pc() | 0) & 65535) > 512, d = k[140] | 0, g) {
      kb(d | 0, 118, 1) | 0, q = +((pc() | 0) & 65535), o[33006] = q, q = +((pc() | 0) & 65535), o[33007] = q, q = +((pc() | 0) & 65535), o[33004] = q, q = +((pc() | 0) & 65535), o[33005] = q, d = e;
      break b;
     }
     kb(d | 0, 98, 1) | 0, q = +((pc() | 0) & 65535), o[33005] = q, q = +((pc() | 0) & 65535), o[33004] = q, q = +((pc() | 0) & 65535), o[33006] = q, q = +((pc() | 0) & 65535), o[33007] = q, d = e;
     break b;

    case 2064:
     Ga(165416, 64, 1, k[140] | 0) | 0, d = e;
     break;

    default:
     d = e, h = 31;
    } while (0);
    do if ((h | 0) == 31) {
     if (h = 0, f << 16 >> 16 == 4144) {
      if (!(98368 >>> b & 1)) break;
      Se();
      break;
     }
     if (f << 16 >> 16 == 22547) {
      k[32916] = g;
      break;
     }
     if (f << 16 >> 16 == 22551) {
      k[41350] = g;
      break;
     }
     if (f << 16 >> 16 == 20521) {
      if (o[41504] = +(g >> 16 | 0), (g & 65535 | 0) != 2) break;
      o[41504] = +(g >> 16 | 0) * .03125;
      break;
     }
     if (f << 16 >> 16 == 22542) {
      k[41306] = g;
      break;
     }
     if (f << 16 >> 16 == 22548) {
      k[32918] = g;
      break;
     }
     if (f << 16 >> 16 == 6158) {
      g = rc() | 0, k[41306] = g;
      break;
     }
     if (f << 16 >> 16 == 4145) {
      pc() | 0, g = pc() | 0, j[65896] = g, g = pc() | 0, j[65916] = g;
      break;
     }
     if (f << 16 >> 16 == 22580) {
      k[32982] = g;
      break;
     }
     break;
    } while (0);
    if (kb(k[140] | 0, m | 0, 0) | 0, !l) break a;
    e = d;
   } while (0);
   r = n;
  }
  function ie() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0;
   if (u = r, r = r + 32 | 0, s = k[41268] | 0, (s | 0) == 1 | (s | 0) == 2 && fd(), l = j[82540] | 0, l << 16 >> 16) {
    if (n = (k[41272] | 0) != 0, d = k[32946] | 0, b = k[80] | 0, c = k[32928] | 0, i = m[65916] | 0, f = m[168] | 0, i >>> 0 > f << 1 >>> 0) {
     q = 0;
     do if (e = q >> 1, s = q, q = q + 1 | 0, g = q >> 1, ((l & 65535) << (n & 1 ^ 1) | 0) > 0) {
      h = l & 65535, p = 0;
      do n ? (a = e - p | 0, o = p + g | 0) : (a = s - (p >> 1) | 0, o = (p + 1 >> 1) + s | 0), a = a + (h + -1) | 0, a >>> 0 < (m[65840] | 0) >>> 0 && o >>> 0 < (m[65844] | 0) >>> 0 && (h = ka(f + s | 0, m[65896] | 0) | 0, v = m[65848] | 0, o = c + ((ka(a >>> v, m[65852] | 0) | 0) + (o >>> v) << 3) + ((b >>> ((a << 1 & 14 | o & 1) << 1) & 3) << 1) | 0, j[o >> 1] = j[d + ((m[164] | 0) + p + h << 1) >> 1] | 0), p = p + 1 | 0, h = l & 65535; while ((p | 0) < (h << (n & 1 ^ 1) | 0));
     } while ((q | 0) < (i - (f << 1) | 0));
    }
   } else if (l = j[65840] | 0, l << 16 >> 16) {
    i = j[65844] | 0, a = i, n = 0;
    do {
     if (a << 16 >> 16) {
      g = j[168] | 0, a = j[65896] | 0, d = j[164] | 0, b = k[32946] | 0, c = j[65848] | 0, e = j[65852] | 0, f = k[32928] | 0, h = 0;
      do q = b + ((d & 65535) + h + (ka((g & 65535) + n | 0, a & 65535) | 0) << 1) | 0, q = j[q >> 1] | 0, s = f + ((ka(n >> (c & 65535), e & 65535) | 0) + (h >> (c & 65535)) << 3) + ((jc(n, h) | 0) << 1) | 0, j[s >> 1] = q, h = h + 1 | 0; while ((h | 0) < (i & 65535 | 0));
      a = i;
     } else a = 0;
     n = n + 1 | 0;
    } while ((n | 0) != (l & 65535 | 0));
   }
   a = k[41277] | 0;
   a: do if ((a | 0) <= 0) {
    b = k[41268] | 0;
    do if ((b | 0) == 3 | (b | 0) == 4) t = (k[41279] | 0) + 2 | 0, k[41279] = t, k[41275] = t, k[41277] = a + -2, a = a + -2 | 0, t = 29; else if ((b | 0) == 5 | (b | 0) == 6) t = 29; else {
     if ((b | 0) == 7) {
      if (qg(132096, 323184, 3) | 0) {
       t = 29;
       break;
      }
      break a;
     }
     if ((b | 0) == 8) t = 29; else if ((b | 0) == 9) {
      if (!(k[32962] & 32)) break a;
      t = 29;
     }
    } while (0);
    (t | 0) == 29 && (v = m[168] | 0, k[41278] = v, k[41274] = v, v = (m[65840] | 0) + v | 0, k[41280] = v, k[41276] = v, v = m[164] | 0, k[41277] = a + v, k[41279] = (m[65844] | 0) + v + (k[41279] | 0), k[41281] = (k[41281] | 0) + (m[65896] | 0)), (b | 0) == 10 && (k[41276] = m[168], k[41277] = m[65844]);
   } while (0);
   k[u >> 2] = 0, k[u + 4 >> 2] = 0, k[u + 8 >> 2] = 0, k[u + 12 >> 2] = 0, k[u + 16 >> 2] = 0, k[u + 20 >> 2] = 0, k[u + 24 >> 2] = 0, k[u + 28 >> 2] = 0, l = j[65916] | 0, n = j[65896] | 0, o = k[80] | 0, p = m[168] | 0, q = m[164] | 0, s = k[32946] | 0, t = 0, a = 0;
   do {
    if (d = k[165096 + (t << 4) >> 2] | 0, d = (d | 0) > 0 ? d : 0, h = k[165096 + (t << 4) + 8 >> 2] | 0, (d | 0) < (((h | 0) < (l & 65535 | 0) ? h : l & 65535) | 0)) {
     f = k[165096 + (t << 4) + 4 >> 2] | 0, f = (f | 0) > 0 ? f : 0, g = k[165096 + (t << 4) + 12 >> 2] | 0, e = (f | 0) < (((g | 0) < (n & 65535 | 0) ? g : n & 65535) | 0), g = (n & 65535 | 0) > (g | 0) ? g : n & 65535, i = (l & 65535 | 0) > (h | 0) ? h : l & 65535;
     do {
      if (h = d - p << 1 & 14, b = ka(n & 65535, d) | 0, e) {
       c = f;
       do w = o >>> ((h | c - q & 1) << 1) & 3, v = j[s + (b + c << 1) >> 1] | 0, k[u + (w << 2) >> 2] = (k[u + (w << 2) >> 2] | 0) + (v & 65535), k[u + ((w | 4) << 2) >> 2] = (k[u + ((w | 4) << 2) >> 2] | 0) + 1, a = (v << 16 >> 16 == 0 & 1) + a | 0, c = c + 1 | 0; while ((c | 0) != (g | 0));
      }
      d = d + 1 | 0;
     } while ((d | 0) != (i | 0));
    }
    t = t + 1 | 0;
   } while ((t | 0) != 8);
   (k[41268] | 0) == 5 & (m[65844] | 0) < (n & 65535) ? (k[32950] = ((((k[u + 4 >> 2] | 0) + (k[u >> 2] | 0) + (k[u + 8 >> 2] | 0) + (k[u + 12 >> 2] | 0) | 0) >>> 0) / (((k[u + 20 >> 2] | 0) + (k[u + 16 >> 2] | 0) + (k[u + 24 >> 2] | 0) + (k[u + 28 >> 2] | 0) | 0) >>> 0) | 0) + -4, Bc()) : (d = k[u + 16 >> 2] | 0, a >>> 0 < d >>> 0 && (a = k[u + 20 >> 2] | 0, a && (b = k[u + 24 >> 2] | 0, b && (c = k[u + 28 >> 2] | 0, c && (j[66128] = ((k[u >> 2] | 0) >>> 0) / (d >>> 0) | 0, j[66129] = ((k[u + 4 >> 2] | 0) >>> 0) / (a >>> 0) | 0, j[66130] = ((k[u + 8 >> 2] | 0) >>> 0) / (b >>> 0) | 0, j[66131] = ((k[u + 12 >> 2] | 0) >>> 0) / (c >>> 0) | 0, j[66134] = 0, j[66133] = 0, j[66132] = 0))))), r = u;
  }
  function we() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0;
   if (q = r, r = r + 48 | 0, k[q + 16 >> 2] = 1, n = m[65844] | 0, k[q + 16 + 4 >> 2] = n, k[q + 16 + 8 >> 2] = -1, k[q + 16 + 12 >> 2] = 0 - n, k[q + 16 + 16 >> 2] = 1, te(3), o = k[80] | 0, p = k[32928] | 0, l = j[65840] | 0, ((l & 65535) + -3 | 0) > 3) for (c = 0, a = 0, i = 3; ;) {
    if (b = i << 1 & 14, g = o >>> ((o >>> (b << 1 | 2) & 1 | b) << 1 ^ 2) & 3, ((o >>> (b << 1 | 2) & 1) + 3 | 0) < (n + -3 | 0)) {
     f = (o >>> (b << 1 | 2) & 1) + 3 | 0;
     do {
      h = (ka(n, i) | 0) + f | 0, a = m[p + (h << 3) + (g << 1) >> 1] | 0, b = 1, c = 0;
      do d = m[p + (h - b << 3) + 2 >> 1] | 0, e = m[p + (b + h << 3) + 2 >> 1] | 0, s = b << 1, t = m[p + (h - s << 3) + (g << 1) >> 1] | 0, s = m[p + (s + h << 3) + (g << 1) >> 1] | 0, k[q + 8 + (c << 2) >> 2] = (a + d + e << 1) - t - s, v = (m[p + ((b * 3 | 0) + h << 3) + 2 >> 1] | 0) - e | 0, u = p + (h + (ka(b, -3) | 0) << 3) + 2 | 0, u = (m[u >> 1] | 0) - d | 0, k[q + (c << 2) >> 2] = ((v >> 31 ^ v) + (v >>> 31) + (u >>> 31) + (u >> 31 ^ u) << 1) + (((t - a >> 31 ^ t - a) + ((t - a | 0) >>> 31) + ((s - a | 0) >>> 31) + (s - a >> 31 ^ s - a) + ((d - e | 0) >>> 31) + (d - e >> 31 ^ d - e) | 0) * 3 | 0), c = c + 1 | 0, b = k[q + 16 + (c << 2) >> 2] | 0; while ((b | 0) > 0);
      a = k[q >> 2] | 0, b = k[q + 4 >> 2] | 0, c = k[q + 16 + (((a | 0) > (b | 0) & 1) << 2) >> 2] | 0, d = j[p + (c + h << 3) + 2 >> 1] | 0, c = j[p + (h - c << 3) + 2 >> 1] | 0, e = k[q + 8 + (((a | 0) > (b | 0) & 1) << 2) >> 2] >> 2, (d & 65535) < (c & 65535) ? (c = (e | 0) < (c & 65535 | 0) ? e : c & 65535, c = (d & 65535 | 0) > (c | 0) ? d & 65535 : c) : (v = (e | 0) < (d & 65535 | 0) ? e : d & 65535, c = (c & 65535 | 0) > (v | 0) ? c & 65535 : v), j[p + (h << 3) + 2 >> 1] = c, f = f + 2 | 0;
     } while ((f | 0) < (n + -3 | 0));
    } else b = c;
    if (i = i + 1 | 0, (i | 0) == ((l & 65535) + -3 | 0)) {
     c = b;
     break;
    }
    c = b;
   } else c = 0, a = 0;
   if (((l & 65535) + -1 | 0) > 1) {
    h = 1;
    do {
     if (b = h << 1 & 14, ((o >>> (b << 1) & 1) + 1 | 0) < (n + -1 | 0)) {
      d = o >>> ((o >>> (b << 1) & 1 | b) << 1) & 3, g = (o >>> (b << 1) & 1) + 1 | 0;
      do {
       e = (ka(n, h) | 0) + g | 0, f = 1, b = 0;
       do u = e - f | 0, v = f + e | 0, v = (m[p + (v << 3) + (d << 1) >> 1] | 0) + (m[p + (u << 3) + (d << 1) >> 1] | 0) + ((m[p + (e << 3) + 2 >> 1] | 0) << 1) - (m[p + (u << 3) + 2 >> 1] | 0) - (m[p + (v << 3) + 2 >> 1] | 0) >> 1, v = (v | 0) < 65535 ? v : 65535, j[p + (e << 3) + (d << 1) >> 1] = (v | 0) < 0 ? 0 : v & 65535, d = 2 - d | 0, b = b + 1 | 0, f = k[q + 16 + (b << 2) >> 2] | 0; while ((f | 0) > 0);
       g = g + 2 | 0;
      } while ((g | 0) < (n + -1 | 0));
     }
     h = h + 1 | 0;
    } while ((h | 0) != ((l & 65535) + -1 | 0));
    if (((l & 65535) + -1 | 0) > 1) for (i = 1; ;) {
     if (b = i << 1 & 14, g = 2 - (o >>> ((o >>> (b << 1 | 2) & 1 | b) << 1 ^ 2) & 3) | 0, ((o >>> (b << 1 | 2) & 1) + 1 | 0) < (n + -1 | 0)) {
      e = (o >>> (b << 1 | 2) & 1) + 1 | 0;
      do {
       for (h = (ka(n, i) | 0) + e | 0, d = m[p + (h << 3) + 2 >> 1] | 0, b = n + 1 | 0, c = 1, f = n, a = 0; ;) {
        if (u = h - b | 0, t = m[p + (u << 3) + (g << 1) >> 1] | 0, v = b + h | 0, s = m[p + (v << 3) + (g << 1) >> 1] | 0, u = m[p + (u << 3) + 2 >> 1] | 0, v = m[p + (v << 3) + 2 >> 1] | 0, k[q + (a << 2) >> 2] = (t - s >> 31 ^ t - s) + ((t - s | 0) >>> 31) + ((u - d | 0) >>> 31) + (u - d >> 31 ^ u - d) + ((v - d | 0) >>> 31) + (v - d >> 31 ^ v - d), k[q + 8 + (a << 2) >> 2] = s + t + (d << 1) - u - v, a = c + 1 | 0, v = f, f = k[q + 16 + (a << 2) >> 2] | 0, b = f + v | 0, (b | 0) <= 0) break;
        v = c, c = a, a = v;
       }
       a = k[q >> 2] | 0, b = k[q + 4 >> 2] | 0, (a | 0) == (b | 0) ? (c = (k[q + 8 + 4 >> 2] | 0) + (k[q + 8 >> 2] | 0) >> 2, c = (c | 0) < 65535 ? c : 65535, c = (c | 0) < 0 ? 0 : c & 65535) : (c = k[q + 8 + (((a | 0) > (b | 0) & 1) << 2) >> 2] >> 1, c = (c | 0) < 65535 ? c : 65535, c = (c | 0) < 0 ? 0 : c & 65535), j[p + (h << 3) + (g << 1) >> 1] = c, e = e + 2 | 0;
      } while ((e | 0) < (n + -1 | 0));
     } else b = c;
     if (i = i + 1 | 0, (i | 0) == ((l & 65535) + -1 | 0)) break;
     c = b;
    }
   }
   r = q;
  }
  function ed(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, p = 0, q = 0, s = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0;
   if (C = r, r = r + 32 | 0, uc(C + 16 | 0, 8), u = j[C + 16 + 4 >> 1] | 0, y = j[C + 16 + 6 >> 1] | 0, A = ka(y & 65535, u & 65535) | 0, z = j[C + 16 + 8 >> 1] | 0, A = ka(A, z & 65535) | 0, v = j[C + 16 + 10 >> 1] | 0, ka(A, v & 65535) | 0) {
    if (w = (((u & 65535) % (z & 65535) | 0) << 16 >> 16 != 0 & 1) + (((u & 65535) / (z & 65535) | 0) & 65535) | 0, x = wg(ka(w, b) | 0, 4) | 0, mc(x, 300080), (((y & 65535) % (v & 65535) | 0) << 16 >> 16 != 0 & 1) + (((y & 65535) / (v & 65535) | 0) & 65535) | 0) {
     A = 0;
     do {
      if (e = (A | 0) == 0, w) {
       g = 0;
       do {
        if (b) {
         f = 0;
         do a ? (s = rc() | 0, k[t >> 2] = s, c = +o[t >> 2]) : c = +((pc() | 0) & 65535 | 0) * 30517578125e-15, d = x + ((ka(f, w) | 0) + g << 2) | 0, e ? o[d >> 2] = c : (s = x + ((ka(f | 1, w) | 0) + g << 2) | 0, o[s >> 2] = (c - +o[d >> 2]) / +(m[C + 16 + 10 >> 1] | 0 | 0)), f = f + 2 | 0; while (f >>> 0 < b >>> 0);
        }
        g = g + 1 | 0;
       } while ((g | 0) != (w | 0));
      }
      a: do if (!e && (d = j[C + 16 + 2 >> 1] | 0, f = j[C + 16 + 10 >> 1] | 0, n = (ka(f & 65535, A) | 0) + (d & 65535) | 0, p = k[80] | 0, q = k[32946] | 0, s = m[65916] | 0, (n - (f & 65535) | 0) >>> 0 < n >>> 0 & (n - (f & 65535) | 0) >>> 0 < s >>> 0)) for (e = f, f = n - (f & 65535) | 0; ;) {
       if (f >>> 0 >= ((m[C + 16 + 6 >> 1] | 0) + (d & 65535) - (e & 65535) | 0) >>> 0) break a;
       if (w >>> 0 > 1) {
        l = 1;
        do {
         if (e = j[C + 16 + 8 >> 1] | 0, b) {
          d = 0;
          do i = (ka(d, w) | 0) + l | 0, c = +o[x + (i + -1 << 2) >> 2], o[C + (d << 2) >> 2] = c, o[C + ((d | 1) << 2) >> 2] = (+o[x + (i << 2) >> 2] - c) / +(e & 65535 | 0), d = d + 2 | 0; while (d >>> 0 < b >>> 0);
         }
         d = j[C + 16 >> 1] | 0, h = (ka(e & 65535, l) | 0) + (d & 65535) | 0, i = m[65896] | 0;
         b: do if ((h - (e & 65535) | 0) >>> 0 < h >>> 0 & (h - (e & 65535) | 0) >>> 0 < i >>> 0) for (g = e, e = h - (e & 65535) | 0; ;) {
          if (e >>> 0 >= ((m[C + 16 + 4 >> 1] | 0) + (d & 65535) - (g & 65535) | 0) >>> 0) break b;
          if ((b | 0) > 2 ? (d = p >>> ((f - (m[168] | 0) << 1 & 14 | e - (m[164] | 0) & 1) << 1), d & 1 || (d &= 3, B = 25)) : (d = 0, B = 25), (B | 0) == 25 && (B = 0, g = q + ((ka(i, f) | 0) + e << 1) | 0, d = ~~(+o[C + (d << 2) >> 2] * +(m[g >> 1] | 0 | 0)) >>> 0, j[g >> 1] = d >>> 0 < 65535 ? d & 65535 : -1), b) {
           d = 0;
           do g = C + (d << 2) | 0, o[g >> 2] = +o[C + ((d | 1) << 2) >> 2] + +o[g >> 2], d = d + 2 | 0; while (d >>> 0 < b >>> 0);
          }
          if (e = e + 1 | 0, !(e >>> 0 < h >>> 0 & e >>> 0 < i >>> 0)) break b;
          d = j[C + 16 >> 1] | 0, g = j[C + 16 + 8 >> 1] | 0;
         } while (0);
         l = l + 1 | 0;
        } while ((l | 0) != ((((u & 65535) % (z & 65535) | 0) << 16 >> 16 != 0 & 1) + (((u & 65535) / (z & 65535) | 0) & 65535) | 0));
       }
       if (w) {
        e = 0;
        do {
         if (b) {
          d = 0;
          do g = x + ((ka(d | 1, w) | 0) + e << 2) | 0, i = x + ((ka(d, w) | 0) + e << 2) | 0, o[i >> 2] = +o[g >> 2] + +o[i >> 2], d = d + 2 | 0; while (d >>> 0 < b >>> 0);
         }
         e = e + 1 | 0;
        } while ((e | 0) != (w | 0));
       }
       if (f = f + 1 | 0, !(f >>> 0 < n >>> 0 & f >>> 0 < s >>> 0)) break a;
       d = j[C + 16 + 2 >> 1] | 0, e = j[C + 16 + 10 >> 1] | 0;
      } while (0);
      A = A + 1 | 0;
     } while ((A | 0) != ((((y & 65535) % (v & 65535) | 0) << 16 >> 16 != 0 & 1) + (((y & 65535) / (v & 65535) | 0) & 65535) | 0));
    }
    vg(x);
   }
   r = C;
  }
  function yg(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0;
   if (n = k[a + 4 >> 2] | 0, i = a + (n & -8) | 0, h = k[157568] | 0, (n & 3 | 0) != 1 & a >>> 0 >= h >>> 0 & a >>> 0 < i >>> 0 || Fb(), m = k[a + (n & -8 | 4) >> 2] | 0, m & 1 || Fb(), !(n & 3)) return b >>> 0 < 256 ? (a = 0, a | 0) : (n & -8) >>> 0 >= (b + 4 | 0) >>> 0 && ((n & -8) - b | 0) >>> 0 <= k[157684] << 1 >>> 0 ? a | 0 : (a = 0, a | 0);
   if ((n & -8) >>> 0 >= b >>> 0) return ((n & -8) - b | 0) >>> 0 <= 15 ? a | 0 : (k[a + 4 >> 2] = n & 1 | b | 2, k[a + (b + 4) >> 2] = (n & -8) - b | 3, k[a + (n & -8 | 4) >> 2] = k[a + (n & -8 | 4) >> 2] | 1, zg(a + b | 0, (n & -8) - b | 0), a | 0);
   if ((i | 0) == (k[157570] | 0)) return c = (k[157567] | 0) + (n & -8) | 0, c >>> 0 <= b >>> 0 ? (a = 0, a | 0) : (k[a + 4 >> 2] = n & 1 | b | 2, k[a + (b + 4) >> 2] = c - b | 1, k[157570] = a + b, k[157567] = c - b, a | 0);
   if ((i | 0) == (k[157569] | 0)) return c = (k[157566] | 0) + (n & -8) | 0, c >>> 0 < b >>> 0 ? (a = 0, a | 0) : ((c - b | 0) >>> 0 > 15 ? (k[a + 4 >> 2] = n & 1 | b | 2, k[a + (b + 4) >> 2] = c - b | 1, k[a + c >> 2] = c - b, k[a + (c + 4) >> 2] = k[a + (c + 4) >> 2] & -2, d = a + b | 0, c = c - b | 0) : (k[a + 4 >> 2] = n & 1 | c | 2, k[a + (c + 4) >> 2] = k[a + (c + 4) >> 2] | 1, d = 0, c = 0), k[157566] = c, k[157569] = d, a | 0);
   if (m & 2) return a = 0, a | 0;
   if (((m & -8) + (n & -8) | 0) >>> 0 < b >>> 0) return a = 0, a | 0;
   l = (m & -8) + (n & -8) - b | 0;
   do if (m >>> 0 < 256) {
    if (c = k[a + ((n & -8) + 8) >> 2] | 0, d = k[a + ((n & -8) + 12) >> 2] | 0, (c | 0) != (630296 + (m >>> 3 << 1 << 2) | 0) && (c >>> 0 < h >>> 0 && Fb(), (k[c + 12 >> 2] | 0) != (i | 0) && Fb()), (d | 0) == (c | 0)) {
     k[157564] = k[157564] & ~(1 << (m >>> 3));
     break;
    }
    (d | 0) == (630296 + (m >>> 3 << 1 << 2) | 0) ? e = d + 8 | 0 : (d >>> 0 < h >>> 0 && Fb(), (k[d + 8 >> 2] | 0) == (i | 0) ? e = d + 8 | 0 : Fb()), k[c + 12 >> 2] = d, k[e >> 2] = c;
   } else {
    g = k[a + ((n & -8) + 24) >> 2] | 0, d = k[a + ((n & -8) + 12) >> 2] | 0;
    do if ((d | 0) == (i | 0)) {
     if (c = k[a + ((n & -8) + 20) >> 2] | 0) f = a + ((n & -8) + 20) | 0; else {
      if (c = k[a + ((n & -8) + 16) >> 2] | 0, !c) {
       j = 0;
       break;
      }
      f = a + ((n & -8) + 16) | 0;
     }
     for (;;) if (d = c + 20 | 0, e = k[d >> 2] | 0) c = e, f = d; else {
      if (d = c + 16 | 0, e = k[d >> 2] | 0, !e) break;
      c = e, f = d;
     }
     if (!(f >>> 0 < h >>> 0)) {
      k[f >> 2] = 0, j = c;
      break;
     }
     Fb();
    } else {
     if (c = k[a + ((n & -8) + 8) >> 2] | 0, c >>> 0 < h >>> 0 && Fb(), (k[c + 12 >> 2] | 0) != (i | 0) && Fb(), (k[d + 8 >> 2] | 0) == (i | 0)) {
      k[c + 12 >> 2] = d, k[d + 8 >> 2] = c, j = d;
      break;
     }
     Fb();
    } while (0);
    if (g) {
     if (c = k[a + ((n & -8) + 28) >> 2] | 0, (i | 0) == (k[630560 + (c << 2) >> 2] | 0)) {
      if (k[630560 + (c << 2) >> 2] = j, !j) {
       k[157565] = k[157565] & ~(1 << c);
       break;
      }
     } else if (g >>> 0 < (k[157568] | 0) >>> 0 && Fb(), (k[g + 16 >> 2] | 0) == (i | 0) ? k[g + 16 >> 2] = j : k[g + 20 >> 2] = j, !j) break;
     d = k[157568] | 0, j >>> 0 < d >>> 0 && Fb(), k[j + 24 >> 2] = g, c = k[a + ((n & -8) + 16) >> 2] | 0;
     do if (c) {
      if (!(c >>> 0 < d >>> 0)) {
       k[j + 16 >> 2] = c, k[c + 24 >> 2] = j;
       break;
      }
      Fb();
     } while (0);
     if (c = k[a + ((n & -8) + 20) >> 2] | 0) {
      if (!(c >>> 0 < (k[157568] | 0) >>> 0)) {
       k[j + 20 >> 2] = c, k[c + 24 >> 2] = j;
       break;
      }
      Fb();
     }
    }
   } while (0);
   return l >>> 0 < 16 ? (k[a + 4 >> 2] = (m & -8) + (n & -8) | n & 1 | 2, k[a + ((m & -8) + (n & -8) | 4) >> 2] = k[a + ((m & -8) + (n & -8) | 4) >> 2] | 1, a | 0) : (k[a + 4 >> 2] = n & 1 | b | 2, k[a + (b + 4) >> 2] = l | 3, k[a + ((m & -8) + (n & -8) | 4) >> 2] = k[a + ((m & -8) + (n & -8) | 4) >> 2] | 1, zg(a + b | 0, l), a | 0);
  }
  function vd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, m = 0, n = 0, o = 0, p = 0;
   if (p = r, r = r + 311696 | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, Jg(p | 0, -128, 311696) | 0, a = j[65840] | 0, a << 16 >> 16) {
    c = j[65844] | 0, h = 2, b = 0;
    do {
     if (d = h & 1, e = h + -1 | 0, m = h, h = h + 1 | 0, g = (d ^ 1) + (p + (h * 644 | 0)) | 0, (d | 2) >>> 0 < ((c & 65535) + 2 | 0) >>> 0) {
      f = d | 2;
      do a = f + 1 + (p + (e * 644 | 0)) | 0, d = f + -2 + (p + (m * 644 | 0)) | 0, o = ((l[a >> 0] << 1) + (l[f + -1 + (p + (e * 644 | 0)) >> 0] | 0) + (l[d >> 0] | 0) | 0) >>> 2, b = 316736 + ((Dc(4, 0) | 0) << 1) | 0, b = o + (j[b >> 1] | 0) | 0, b = (b | 0) < 255 ? b : 255, b = (b | 0) < 0 ? 0 : b, i[p + (m * 644 | 0) + f >> 0] = b, (f | 0) < 4 && (i[g >> 0] = b, i[d >> 0] = b), (m | 0) == 2 && (i[f + 3 + (p + (e * 644 | 0)) >> 0] = b, i[a >> 0] = b), o = f, f = f + 2 | 0, a = j[65844] | 0; while ((o | 0) < (a & 65535 | 0));
      c = a, a = j[65840] | 0, d = f;
     } else d |= 2;
     i[p + (m * 644 | 0) + d >> 0] = b;
    } while ((m | 0) < ((a & 65535) + 1 | 0));
    b = a, o = 0;
   } else b = 0, a = 0, o = 0;
   do {
    if ((o | 0) < (a & 65535 | 0)) {
     a = j[65844] | 0, n = o;
     do if (m = n, n = n + 2 | 0, d = n & 1 ^ 3, h = (n | 0) < 4, d >>> 0 < ((a & 65535) + 2 | 0) >>> 0) {
      for (;;) {
       if (g = (d | 0) < 4, a = i[p + (m * 644 | 0) + d >> 0] | 0, h | g ? (b = d + -2 | 0, f = a & 255, c = b, b = i[p + (n * 644 | 0) + b >> 0] | 0, a = 2) : (c = d + -2 | 0, b = i[p + (n * 644 | 0) + c >> 0] | 0, e = l[p + (m * 644 | 0) + c >> 0] | 0, e = ((a & 255) - (b & 255) >> 31 ^ (a & 255) - (b & 255)) + (((a & 255) - (b & 255) | 0) >>> 31) + (((a & 255) - e | 0) >>> 31) + ((a & 255) - e >> 31 ^ (a & 255) - e) + (((b & 255) - e >> 31 ^ (b & 255) - e) - ((b & 255) - e >> 31)) | 0, (e | 0) < 4 ? (f = a & 255, a = 0) : (e | 0) < 8 ? (f = a & 255, a = 1) : (e | 0) < 16 ? (f = a & 255, a = 2) : (e | 0) < 32 ? (f = a & 255, a = 3) : (f = a & 255, a = (e | 0) < 48 ? 4 : 5)), a = 316768 + (a << 3) + ((Dc(2, 0) | 0) << 1) | 0, a = (((b & 255) + f | 0) >>> 1) + (j[a >> 1] | 0) | 0, a = (a | 0) < 255 ? a : 255, a = (a | 0) < 0 ? 0 : a & 255, i[p + (n * 644 | 0) + d >> 0] = a, h && (i[d + 2 + (p + (m * 644 | 0)) >> 0] = a), g && (i[p + ((m + 4 | 0) * 644 | 0) + c >> 0] = a), a = j[65844] | 0, !((d | 0) < (a & 65535 | 0))) break;
       d = d + 2 | 0;
      }
      b = j[65840] | 0;
     } while ((n | 0) < (b & 65535 | 0));
     a = b;
    }
    o = o + 1 | 0;
   } while ((o | 0) != 2);
   if (g = j[65844] | 0, a << 16 >> 16) {
    for (c = (a & 65535) + 1 | 0, d = 2; ;) {
     if (a = d & 1 ^ 3, a >>> 0 < ((g & 65535) + 2 | 0) >>> 0) do o = p + (d * 644 | 0) + a | 0, n = (((l[o >> 0] << 2) + (l[a + -1 + (p + (d * 644 | 0)) >> 0] | 0) + (l[a + 1 + (p + (d * 644 | 0)) >> 0] | 0) | 0) >>> 1) + -256 | 0, n = (n | 0) < 255 ? n : 255, i[o >> 0] = (n | 0) < 0 ? 0 : n & 255, a = a + 2 | 0; while ((a | 0) < ((g & 65535) + 2 | 0));
     if ((d | 0) == (c | 0)) break;
     d = d + 1 | 0;
    }
    e = k[32946] | 0, a = g, f = 0;
    do {
     if (c = f + 2 | 0, a << 16 >> 16) {
      a = j[65896] | 0, d = 0;
      do o = e + ((ka(a & 65535, f) | 0) + d << 1) | 0, j[o >> 1] = j[316816 + (l[d + 2 + (p + (c * 644 | 0)) >> 0] << 1) >> 1] | 0, d = d + 1 | 0; while ((d | 0) < (g & 65535 | 0));
      a = g;
     } else a = 0;
     f = f + 1 | 0;
    } while ((f | 0) < (b & 65535 | 0));
   }
   k[32952] = 1023, r = p;
  }
  function vc(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0;
   if (s = wg((c << 3) + 20 | 0, c << 1) | 0) {
    if (k[s >> 2] = s + (c << 1 << 2), (c << 1 | 0) > 1) {
     d = s + (c << 1 << 2) | 0, e = 1;
     do d = d + ((ka(e, c << 1) | 0) << 2) | 0, k[s + (e << 2) >> 2] = d, e = e + 1 | 0, d = k[s >> 2] | 0; while ((e | 0) != (c << 1 | 0));
    } else d = s + (c << 1 << 2) | 0;
    if (r = (c << 1 | 0) > 1 ? c << 1 : 1, q = ka(r, r) | 0, n = q + r + r | 0, p = n + r + c | 0, (c | 0) > 0) {
     e = 0;
     do o[d + (e + (n + r) << 2) >> 2] = +(k[a + (e << 2) >> 2] | 0) / 65535, o[d + (e + p << 2) >> 2] = +(k[b + (e << 2) >> 2] | 0) / 65535, e = e + 1 | 0; while ((e | 0) != (c | 0));
     if ((c | 0) > 1) {
      e = c + -1 | 0;
      do h = e, e = e + -1 | 0, b = d + (h + (n + r) << 2) | 0, g = d + (e + (n + r) << 2) | 0, o[d + (h + q << 2) >> 2] = (+o[d + (h + p << 2) >> 2] - +o[d + (e + p << 2) >> 2]) / (+o[b >> 2] - +o[g >> 2]), o[d + (e + n << 2) >> 2] = +o[b >> 2] - +o[g >> 2]; while ((h | 0) > 1);
      m = c + -1 | 0;
     } else m = c + -1 | 0;
    } else m = c + -1 | 0;
    if ((m | 0) > 1) {
     g = d, h = 1;
     do e = h + -1 | 0, a = d + (e + n << 2) | 0, b = g, g = k[s + (h << 2) >> 2] | 0, o[g + (h << 2) >> 2] = (+o[a >> 2] + +o[d + (h + n << 2) >> 2]) * 2, (h | 0) > 1 && (k[g + (e << 2) >> 2] = k[a >> 2], k[b + (h << 2) >> 2] = k[a >> 2]), b = h, h = h + 1 | 0, o[g + (m << 2) >> 2] = (+o[d + (h + q << 2) >> 2] - +o[d + (b + q << 2) >> 2]) * 6; while ((h | 0) != (m | 0));
    }
    if ((c + -2 | 0) > 1) {
     a = k[s + 4 >> 2] | 0, b = 1;
     do if (h = b, b = b + 1 | 0, e = a, a = k[s + (b << 2) >> 2] | 0, f = +o[a + (h << 2) >> 2] / +o[e + (h << 2) >> 2], (c | 0) >= 2) for (g = 1; ;) {
      if (h = a + (g << 2) | 0, o[h >> 2] = +o[h >> 2] - f * +o[e + (g << 2) >> 2], !((g | 0) < (m | 0))) break;
      g = g + 1 | 0;
     } while ((b | 0) != (c + -2 | 0));
    }
    if ((c | 0) > 2) for (b = c + -2 | 0; ;) {
     if (e = k[s + (b << 2) >> 2] | 0, (b | 0) > (c + -2 | 0)) f = 0; else for (f = 0, a = b; ;) {
      if (f += +o[e + (a << 2) >> 2] * +o[d + (a + (q + r) << 2) >> 2], !((a | 0) < (c + -2 | 0))) break;
      a = a + 1 | 0;
     }
     if (o[d + (b + (q + r) << 2) >> 2] = (+o[e + (m << 2) >> 2] - f) / +o[e + (b << 2) >> 2], !((b | 0) > 1)) break;
     b = b + -1 | 0;
    }
    b = 0;
    do {
     if (l = +(b | 0) / 65535, (c | 0) > 1) {
      a = 0, f = 0;
      a: for (;;) {
       for (;;) {
        if (i = +o[d + (a + (n + r) << 2) >> 2], e = a + 1 | 0, i <= l && l <= +o[d + (e + (n + r) << 2) >> 2]) break;
        if (!((e | 0) < (m | 0))) break a;
        a = e;
       }
       if (w = +o[d + (a + p << 2) >> 2], f = +o[d + (a + n << 2) >> 2], u = +o[d + (a + (q + r) << 2) >> 2], v = +o[d + (e + (q + r) << 2) >> 2], f = (l - i) * ((l - i) * (u * .5)) + (w + (l - i) * ((+o[d + (e + p << 2) >> 2] - w) / f - (f * 2 * u + f * v) / 6)) + (l - i) * ((l - i) * ((l - i) * ((v - u) / (f * 6)))), !((e | 0) < (m | 0))) break;
       a = e;
      }
      f < 0 ? e = 0 : f >= 1 ? e = 65535 : t = 32;
     } else f = 0, t = 32;
     (t | 0) == 32 && (t = 0, e = ~~(f * 65535 + .5) & 65535), j[576 + (b << 1) >> 1] = e, b = b + 1 | 0;
    } while ((b | 0) != 65536);
    vg(s);
   }
  }
  function We(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   f = r, r = r + 48 | 0, c = 132208, d = c + 36 | 0;
   do k[c >> 2] = 0, c = c + 4 | 0; while ((c | 0) < (d | 0));
   kb(k[140] | 0, a | 0, 0) | 0, d = (rc() | 0) & 65535, j[284] = d;
   do if (((rc() | 0) & -256 | 0) == 1382119168) {
    b = k[140] | 0, kb(b | 0, (rc() | 0) + a | 0, 0) | 0, b = rc() | 0, rc() | 0;
    a: do if (b) for (;;) {
     b = b + -1 | 0, g = rc() | 0, rc() | 0, c = rc() | 0, d = rc() | 0, e = vb(k[140] | 0) | 0, kb(k[140] | 0, d + a | 0, 0) | 0;
     do switch (g | 0) {
     case 548:
      k[33058] = d;
      break;

     case 541:
      k[33055] = d;
      break;

     case 271:
      k[33002] = d + a;
      break;

     case 540:
      k[33062] = d + a;
      break;

     case 266:
      j[164] = d;
      break;

     case 265:
      j[65916] = d;
      break;

     case 546:
      k[33056] = d;
      break;

     case 269:
      j[65840] = d;
      break;

     case 528:
      k[33060] = d;
      break;

     case 262:
      g = rc() | 0, k[f >> 2] = g, g = rc() | 0, k[f + 4 >> 2] = g, g = rc() | 0, k[f + 8 >> 2] = g, g = rc() | 0, k[f + 12 >> 2] = g, g = rc() | 0, k[f + 16 >> 2] = g, g = rc() | 0, k[f + 20 >> 2] = g, g = rc() | 0, k[f + 24 >> 2] = g, g = rc() | 0, k[f + 28 >> 2] = g, g = rc() | 0, k[f + 32 >> 2] = g, Ke(f);
      break;

     case 274:
      k[33053] = e + -4;
      break;

     case 549:
      k[33059] = d + a;
      break;

     case 268:
      j[65844] = d;
      break;

     case 547:
      k[33057] = d + a;
      break;

     case 769:
      i[132159] = 0, Ga(132096, 1, 63, k[140] | 0) | 0, c = Ff(132096, 588616) | 0, c && (i[c >> 0] = 0);
      break;

     case 272:
      k[33e3] = d + a, k[33050] = c;
      break;

     case 256:
      k[41352] = (i[588608 + (d & 3) >> 0] | 0) + -48;
      break;

     case 264:
      j[65896] = d;
      break;

     case 538:
      k[33054] = d;
      break;

     case 263:
      g = rc() | 0, k[33004] = g, g = rc() | 0, k[33005] = g, g = rc() | 0, k[33006] = g;
      break;

     case 270:
      k[33052] = d;
      break;

     case 267:
      j[168] = d;
     } while (0);
     if (kb(k[140] | 0, e | 0, 0) | 0, !b) break a;
    } while (0);
    k[41268] = (k[33052] | 0) < 3 ? 1 : 2, k[32952] = 65535, c = 132032, b = 588624, d = c + 10 | 0;
    do i[c >> 0] = i[b >> 0] | 0, c = c + 1 | 0, b = b + 1 | 0; while ((c | 0) < (d | 0));
    if (!(i[132096] | 0)) {
     if (b = m[65916] | 0, (b | 0) == 2682) {
      i[132096] = i[588656] | 0, i[132097] = i[588657] | 0, i[132098] = i[588658] | 0, i[132099] = i[588659] | 0, i[132100] = i[588660] | 0;
      break;
     }
     if ((b | 0) == 4128) {
      i[132096] = i[588664] | 0, i[132097] = i[588665] | 0, i[132098] = i[588666] | 0, i[132099] = i[588667] | 0, i[132100] = i[588668] | 0;
      break;
     }
     if ((b | 0) == 5488) {
      i[132096] = i[588672] | 0, i[132097] = i[588673] | 0, i[132098] = i[588674] | 0, i[132099] = i[588675] | 0, i[132100] = i[588676] | 0;
      break;
     }
     if ((b | 0) == 2060) {
      c = 132096, b = 588640, d = c + 11 | 0;
      do i[c >> 0] = i[b >> 0] | 0, c = c + 1 | 0, b = b + 1 | 0; while ((c | 0) < (d | 0));
      break;
     }
     break;
    }
   } while (0);
   r = f;
  }
  function Qd(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0;
   w = r, r = r + 64 | 0, c = w + 14 | 0, d = 318456, e = c + 39 | 0;
   do i[c >> 0] = i[d >> 0] | 0, c = c + 1 | 0, d = d + 1 | 0; while ((c | 0) < (e | 0));
   if (j[w + 12 >> 1] = 0, kb(k[140] | 0, (k[a + 4 >> 2] | 0) + 1 | 0, 0) | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, c = k[a >> 2] | 0, c >>> 0 < (k[a + 8 >> 2] | 0) >>> 0) for (g = 0, d = 0, h = 255, e = 8, f = 0; ;) {
    for (n = d, o = f, u = 0; ;) {
     for (d = Dc(e, 0) | 0 | (n & 65535) << e, (g | 0) < 0 && (t = g + 1 + e | 0, g = (t | 0) < 1 ? e + g | 0 : 0, e = t); ;) {
      if (f = e + -1 | 0, (e | 0) <= 0) {
       t = d;
       break;
      }
      if (((d & 65535) >>> f & 255 | 0) == 255) {
       v = 8;
       break;
      }
      e = f;
     }
     for ((v | 0) == 8 && (v = 0, (e | 0) > 1 && (t = 1 << e + -2, d = ((t & (d & 65535)) << 1) + d & -1 << f | (t + 65535 & (d & 65535)) << 1), g = e + -9 | 0, t = (Dc(1, 0) | 0) + d | 0), o &= 65535, e = h >> 4, f = ((((t & 65535) - o << 2) + 4 & 262140) + -1 | 0) / (e | 0) | 0, q = 0; ;) {
      if (d = l[q + 5 + (w + 14 + (u * 13 | 0)) >> 0] | 0, !((d | 0) > (f | 0))) break;
      q = q + 1 | 0;
     }
     for (d = (ka(d, e) | 0) >> 2, f = q ? (ka(l[q + 4 + (w + 14 + (u * 13 | 0)) >> 0] | 0, e) | 0) >> 2 : h, f = f - d | 0, e = 0; ;) {
      if (s = f << e, !((s | 0) < 128)) break;
      e = e + 1 | 0;
     }
     f = d + o << e, p = w + 14 + (u * 13 | 0) + 1 | 0, n = l[p >> 0] | 0, d = w + 14 + (u * 13 | 0) + 2 | 0, o = (i[d >> 0] | 0) + 1 << 24 >> 24, i[d >> 0] = o, h = w + 14 + (u * 13 | 0) + 3 | 0, (o & 255) > (l[h >> 0] | 0) ? (o = (l[w + 14 + (u * 13 | 0) >> 0] | 0) & n + 1, i[h >> 0] = ((l[o + 4 + (w + 14 + (u * 13 | 0)) >> 0] | 0) - (l[o + 5 + (w + 14 + (u * 13 | 0)) >> 0] | 0) | 0) >>> 2, i[d >> 0] = 1) : o = n;
     a: do if (((l[n + 4 + (w + 14 + (u * 13 | 0)) >> 0] | 0) - (l[n + 5 + (w + 14 + (u * 13 | 0)) >> 0] | 0) | 0) > 1) {
      if ((q | 0) < (n | 0)) for (d = q; ;) if (n = d + 5 + (w + 14 + (u * 13 | 0)) | 0, i[n >> 0] = (i[n >> 0] | 0) + -1 << 24 >> 24, d = d + 1 | 0, (d | 0) >= (l[p >> 0] | 0 | 0)) break a;
      if ((o | 0) <= (q | 0) & (n | 0) < (q | 0)) for (h = q + -1 | 0, d = n; ;) {
       if (n = d + 5 + (w + 14 + (u * 13 | 0)) | 0, i[n >> 0] = (i[n >> 0] | 0) + 1 << 24 >> 24, (d | 0) == (h | 0)) break a;
       d = d + 1 | 0;
      }
     } while (0);
     if (i[p >> 0] = o, k[w + (u << 2) >> 2] = q, d = u + 1 | 0, (d | 0) == 3) break;
     n = t, h = s, o = f, u = d;
    }
    if (u = k[w >> 2] | 0, d = k[w + 4 >> 2] << 2 | k[w + 8 >> 2] << 5 | u & 3, u & 4 && (d = (d & 255 | 0) == 0 ? 128 : 0 - (d & 255) | 0), q = (vb(k[140] | 0) | 0) + 12 | 0, u = c & 1, q = (l[w + 12 + u >> 0] | 0) + (q >>> 0 < (k[a + 12 >> 2] | 0) >>> 0 ? d : 0) | 0, i[w + 12 + u >> 0] = q, j[(k[32946] | 0) + (c << 1) >> 1] = q & 255, u || (c = (1 << (((c | 0) / (m[65896] | 0 | 0) | 0) - (m[65916] | 0) & 7) & b | 0) == 0 ? c : c + 2 | 0), c = c + 1 | 0, !(c >>> 0 < (k[a + 8 >> 2] | 0) >>> 0)) break;
    d = t, h = s;
   }
   k[32952] = 255, r = w;
  }
  function yc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, p = 0, q = 0, s = 0, t = 0;
   s = r, r = r + 128 | 0, k[s >> 2] = 0, k[s + 4 >> 2] = 0, a = s + 8 | 0, b = a + 64 | 0;
   do k[a >> 2] = 0, a = a + 4 | 0; while ((a | 0) < (b | 0));
   if (a = ~~(+o[32918] + .5), a = (a | 0) < 10 ? 150 : (a | 0) > 12 ? 20 : (ka(a, -20) | 0) + 280 | 0, n = +o[32916] != 0 ? 80 : a, i = (m[65840] | 0) + -14 | 0, (i | 0) > 14) {
    d = j[65844] | 0, p = 14;
    do {
     if ((d & 65535) > 10) {
      e = k[80] | 0, f = j[65848] | 0, g = j[65852] | 0, h = k[32928] | 0, l = 10;
      do {
       a = 0;
       do b = (a >> 1) + p | 0, c = a & 1, t = h + ((ka(b >> (f & 65535), g & 65535) | 0) + ((c | l) >> (f & 65535)) << 3) + ((e >>> ((b << 1 & 14 | c) << 1) & 3) << 1) | 0, k[s + 96 + ((e >>> ((b << 1 & 14 | c) << 1) & 3 | a & 4) << 2) >> 2] = m[t >> 1], a = a + 1 | 0; while ((a | 0) != 8);
       for (a = 0; ;) {
        if ((a | 0) >= 8) {
         a = 0, q = 12;
         break;
        }
        if (((k[s + 96 + (a << 2) >> 2] | 0) + -150 | 0) >>> 0 > 1350) break;
        a = a + 1 | 0;
       }
       a: do if ((q | 0) == 12) {
        for (;;) {
         if (q = 0, (a | 0) >= 4) {
          a = 0;
          break;
         }
         if (t = (k[s + 96 + (a << 2) >> 2] | 0) - (k[s + 96 + (a + 4 << 2) >> 2] | 0) | 0, (((t | 0) > -1 ? t : 0 - t | 0) | 0) > 50) break a;
         a = a + 1 | 0, q = 12;
        }
        do b = a << 2, c = k[s + 96 + (b << 2) >> 2] | 0, t = s + 72 + (a << 3) | 0, k[t >> 2] = ((k[s + 96 + ((b | 1) << 2) >> 2] | 0) - c << 10 | 0) / (c | 0) | 0, c = k[s + 96 + ((b | 2) << 2) >> 2] | 0, k[s + 72 + (a << 3) + 4 >> 2] = ((k[s + 96 + ((b | 3) << 2) >> 2] | 0) - c << 10 | 0) / (c | 0) | 0, t = xc(t, n) | 0, k[s + 88 + (a << 2) >> 2] = t, a = a + 1 | 0; while ((a | 0) != 2);
        if (a = k[s + 88 >> 2] | 0, c = k[s + 88 + 4 >> 2] | a, (c | 0) <= 1) {
         for (b = 0; ;) {
          if (a && (t = b << 2, a = (ka((k[s + 72 + (b << 3) >> 2] | 0) + 1024 | 0, k[s + 96 + (t << 2) >> 2] | 0) | 0) >> 10, k[s + 96 + ((t | 1) << 2) >> 2] = a, a = (ka((k[s + 72 + (b << 3) + 4 >> 2] | 0) + 1024 | 0, k[s + 96 + ((t | 2) << 2) >> 2] | 0) | 0) >> 10, k[s + 96 + ((t | 3) << 2) >> 2] = a), b = b + 1 | 0, (b | 0) == 2) {
           a = 0;
           break;
          }
          a = k[s + 88 + (b << 2) >> 2] | 0;
         }
         do t = s + 8 + (c << 5) + (a << 2) | 0, k[t >> 2] = (k[t >> 2] | 0) + (k[s + 96 + (a << 2) >> 2] | 0), a = a + 1 | 0; while ((a | 0) != 8);
         k[s + (c << 2) >> 2] = (k[s + (c << 2) >> 2] | 0) + 1;
        }
       } while (0);
       l = l + 2 | 0;
      } while ((l | 0) < (d & 65535 | 0));
     }
     p = p + 4 | 0;
    } while ((p | 0) < (i | 0));
    a = k[s + 4 >> 2] | 0, b = k[s >> 2] | 0;
   } else a = 0, b = 0;
   a | b && (t = (b * 200 | 0) < (a | 0) & 1, o[32912] = 1 / +((k[s + 8 + (t << 5) + 16 >> 2] | 0) + (k[s + 8 + (t << 5) >> 2] | 0) | 0), o[32913] = 1 / +((k[s + 8 + (t << 5) + 20 >> 2] | 0) + (k[s + 8 + (t << 5) + 4 >> 2] | 0) | 0), o[32914] = 1 / +((k[s + 8 + (t << 5) + 24 >> 2] | 0) + (k[s + 8 + (t << 5) + 8 >> 2] | 0) | 0), o[32915] = 1 / +((k[s + 8 + (t << 5) + 28 >> 2] | 0) + (k[s + 8 + (t << 5) + 12 >> 2] | 0) | 0)), r = s;
  }
  function td() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0;
   for (q = r, r = r + 8224 | 0, j[q + 24 >> 1] = 3084, e = 11, a = 12, g = 0; ;) {
    if (f = 2048 >>> e, a = (a << 8 | e) & 65535, d = (f | 0) > 0 ? f : 0, (f | 0) > 0) {
     b = 0, c = g;
     do c = c + 1 | 0, j[q + 24 + (c << 1) >> 1] = a, b = b + 1 | 0; while ((b | 0) != (f | 0));
    }
    if (!e) break;
    a = e, e = e + -1 | 0, g = g + d | 0;
   }
   if (kb(k[140] | 0, 7, 1) | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, a = j[65840] | 0, a << 16 >> 16) {
    b = j[65896] | 0, p = 0;
    do {
     if (k[q >> 2] = 0, k[q + 4 >> 2] = 0, k[q + 8 >> 2] = 0, k[q + 12 >> 2] = 0, k[q + 16 >> 2] = 0, k[q + 20 >> 2] = 0, n = (p | 0) < 2, o = p + -2 | 0, b << 16 >> 16) {
      l = 0;
      do {
       for (b = l & 1, c = k[q + (b * 12 | 0) + 8 >> 2] | 0, a = k[q + (b * 12 | 0) >> 2] & 65535, d = (((c | 0) < 3 & 1) << 1) + 2 | 0; ;) {
        if (!(a >>> (d + (((c | 0) < 3 & 1) << 1) | 0))) break;
        d = d + 1 | 0;
       }
       if (i = Dc(3, 0) | 0, a = Dc(12, q + 24 | 0) | 0, (a | 0) == 12 && (a = (Dc(16 - d | 0, 0) | 0) >>> 1), g = a << d | (Dc(d, 0) | 0), k[q + (b * 12 | 0) >> 2] = g, h = k[q + (b * 12 | 0) + 4 >> 2] | 0, k[q + (b * 12 | 0) + 4 >> 2] = (((g ^ i << 29 >> 31) + h | 0) * 3 | 0) + h >> 5, k[q + (b * 12 | 0) + 8 >> 2] = (g | 0) > 16 ? 0 : c + 1 | 0, (l | 0) < (m[65844] | 0 | 0)) {
        a = (l | 0) < 2, d = j[65896] | 0;
        do if (n & a) b = d & 65535, d = k[32946] | 0, a = 0; else {
         if (n) {
          a = l + -2 + (ka(d & 65535, p) | 0) | 0, e = k[32946] | 0, b = d & 65535, d = e, a = m[e + (a << 1) >> 1] | 0;
          break;
         }
         if (a) {
          a = (ka(d & 65535, o) | 0) + l | 0, e = k[32946] | 0, b = d & 65535, d = e, a = m[e + (a << 1) >> 1] | 0;
          break;
         }
         if (e = l + -2 | 0, c = (ka(d & 65535, p) | 0) + e | 0, a = k[32946] | 0, c = j[a + (c << 1) >> 1] | 0, b = ka(d & 65535, o) | 0, f = j[a + (b + l << 1) >> 1] | 0, e = j[a + (b + e << 1) >> 1] | 0, !((c & 65535) < (e & 65535) & (f & 65535) > (e & 65535) || (f & 65535) < (e & 65535) & (c & 65535) > (e & 65535))) {
          b = d & 65535, d = a, a = (((c & 65535) - (e & 65535) >> 31 ^ (c & 65535) - (e & 65535)) - ((c & 65535) - (e & 65535) >> 31) | 0) > (((f & 65535) - (e & 65535) >> 31 ^ (f & 65535) - (e & 65535)) - ((f & 65535) - (e & 65535) >> 31) | 0) ? c & 65535 : f & 65535;
          break;
         }
         if ((((c & 65535) - (e & 65535) >> 31 ^ (c & 65535) - (e & 65535)) - ((c & 65535) - (e & 65535) >> 31) | 0) <= 32 && (((f & 65535) - (e & 65535) >> 31 ^ (f & 65535) - (e & 65535)) - ((f & 65535) - (e & 65535) >> 31) | 0) <= 32) {
          b = d & 65535, d = a, a = ((f & 65535) + (c & 65535) | 0) >>> 1;
          break;
         }
         b = d & 65535, d = a, a = (f & 65535) + (c & 65535) - (e & 65535) | 0;
        } while (0);
        g = a + ((g ^ i << 29 >> 31) + h << 2 | i & 3) | 0, e = d + ((ka(b, p) | 0) + l << 1) | 0, j[e >> 1] = g, g & 61440 && nc();
       }
       l = l + 1 | 0, b = j[65896] | 0;
      } while ((l | 0) < (b & 65535 | 0));
      a = j[65840] | 0;
     } else b = 0;
     p = p + 1 | 0;
    } while ((p | 0) < (a & 65535 | 0));
   }
   r = q;
  }
  function Jc(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0;
   g = r, r = r + 65552 | 0, Jg(a | 0, 0, 476) | 0, k[a + 28 >> 2] = 2147483647, ib(k[140] | 0) | 0;
   a: do if ((ib(k[140] | 0) | 0) == 216) if (Ga(g + 8 | 0, 2, 2, k[140] | 0) | 0) {
    b: for (;;) {
     if (c = l[g + 8 + 1 >> 0] | 0, f = (l[g + 8 >> 0] | 0) << 8 | c, f >>> 0 < 65281) {
      c = 0;
      break a;
     }
     e = ((l[g + 8 + 2 >> 0] | 0) << 8 | (l[g + 8 + 3 >> 0] | 0)) + 65534 & 65535, Ga(g + 8 | 0, 1, e | 0, k[140] | 0) | 0;
     c: do switch (f | 0) {
     case 65498:
      d = 12;
      break b;

     case 65499:
      c = 0;
      do e = c << 1, j[a + 56 + (c << 1) >> 1] = (l[g + 8 + (e | 1) >> 0] | 0) << 8 | (l[g + 8 + (e + 2) >> 0] | 0), c = c + 1 | 0; while ((c | 0) != 64);
      d = 15;
      break;

     case 65501:
      k[a + 28 >> 2] = (l[g + 8 >> 0] | 0) << 8 | (l[g + 8 + 1 >> 0] | 0);
      break;

     case 65475:
      d = l[g + 8 + 7 >> 0] | 0, d = (ka(d >>> 4, d & 15) | 0) + 3 & 3, k[a + 20 >> 2] = d, d = 6;
      break;

     case 65472:
     case 65473:
      d = 6;
      break;

     case 65476:
      if (!b && (k[g >> 2] = g + 8, e)) for (c = g + 8 | 0; ;) {
       if (k[g >> 2] = c + 1, c = l[c >> 0] | 0, c & 236) {
        d = 15;
        break c;
       }
       if (d = Ec(g) | 0, k[a + 312 + (c << 2) >> 2] = d, k[a + 392 + (c << 2) >> 2] = d, c = k[g >> 2] | 0, c >>> 0 >= (g + 8 + e | 0) >>> 0) {
        d = 15;
        break;
       }
      }
     } while (0);
     if ((d | 0) == 6) d = 0, k[a >> 2] = c, k[a + 4 >> 2] = l[g + 8 >> 0], k[a + 8 >> 2] = (l[g + 8 + 1 >> 0] | 0) << 8 | (l[g + 8 + 2 >> 0] | 0), k[a + 12 >> 2] = (l[g + 8 + 3 >> 0] | 0) << 8 | (l[g + 8 + 4 >> 0] | 0), k[a + 16 >> 2] = (l[g + 8 + 5 >> 0] | 0) + (k[a + 20 >> 2] | 0), (e | 0) != 9 | (k[32960] | 0) != 0 || La(k[140] | 0) | 0; else if ((d | 0) == 15 && (d = 0, (f | 0) == 65498)) break;
     if (!(Ga(g + 8 | 0, 2, 2, k[140] | 0) | 0)) {
      c = 0;
      break a;
     }
    }
    if ((d | 0) == 12 && (e = (l[g + 8 >> 0] | 0) << 1, k[a + 24 >> 2] = l[g + 8 + (e | 1) >> 0], k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) - ((l[g + 8 + (e + 3) >> 0] | 0) & 15)), b) c = 1; else if ((k[a + 16 >> 2] | 0) > 6) c = 0; else if (k[a + 312 >> 2] | 0) {
     d = 0;
     do e = d, d = d + 1 | 0, c = a + 312 + (d << 2) | 0, k[c >> 2] | 0 || (k[c >> 2] = k[a + 312 + (e << 2) >> 2]); while ((d | 0) != 19);
     if (c = k[a + 20 >> 2] | 0, c && (b = k[a + 316 >> 2] | 0, k[a + 320 >> 2] = b, k[a + 324 >> 2] = b, k[a + 328 >> 2] = b, k[a + 332 >> 2] = b, (c | 0) > 0)) {
      d = 0, e = 0;
      do k[a + 312 + (d + 1 << 2) >> 2] = k[a + 312 >> 2], e = e + 1 << 16 >> 16, d = e & 65535; while ((d | 0) < (c | 0));
     }
     c = wg(ka(k[a + 16 >> 2] | 0, k[a + 12 >> 2] | 0) | 0, 4) | 0, k[a + 472 >> 2] = c, mc(c, 299088), k[32954] = 1, c = 1;
    } else c = 0;
   } else c = 0; else c = 0; while (0);
   return r = g, c | 0;
  }
  function Pd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
   if (x = r, r = r + 32 | 0, j[284] = 18761, kb(k[140] | 0, 9, 1) | 0, p = ib(k[140] | 0) | 0, pc() | 0, t = (pc() | 0) & 65535, j[65916] | 0) {
    u = 0;
    do {
     if (q = k[140] | 0, v = k[33002] | 0, kb(q | 0, v - (vb(q | 0) | 0) & 15 | 0, 1) | 0, k[75038] = 0, k[75040] = 0, k[75041] = 0, q = (u | 0) < 2, v = q ? 7 : 4, j[x + 16 >> 1] = v, j[x + 16 + 2 >> 1] = v, j[x + 16 + 4 >> 1] = v, j[x + 16 + 6 >> 1] = v, j[x + 16 + 8 >> 1] = v, j[x + 16 + 10 >> 1] = v, v = j[65896] | 0, s = u & 1, n = (0 - (s << 1) | 1) + (ka(v & 65535, u + -1 | 0) | 0) | 0, o = k[32946] | 0, k[x + (s << 2) >> 2] = o + (n << 1), o = o + ((ka(v & 65535, u + -2 | 0) | 0) << 1) | 0, k[x + ((s ^ 1) << 2) >> 2] = o, (v & 65535) > 15) {
      b = 0, c = 7, v = 0;
      do {
       do if (!(v & 48 | p & 4)) {
        if (a = hd(2, 0) | 0, (a | 0) < 3) {
         b = b + -50 + (i[318424 + a >> 0] | 0) | 0;
         break;
        }
        b = hd(12, 0) | 0;
        break;
       } while (0);
       a = hd(1, 0) | 0, p & 2 ? c = 7 - (a << 2) | 0 : a || (c = hd(3, 0) | 0), p & 1 ? w = 14 : hd(1, 0) | 0 || (w = 14);
       a: do if ((w | 0) == 14) for (w = 0, d = (hd(2, 0) | 0) & 65535, j[x + 8 >> 1] = d, a = (hd(2, 0) | 0) & 65535, j[x + 8 + 2 >> 1] = a, a = (hd(2, 0) | 0) & 65535, j[x + 8 + 4 >> 1] = a, a = (hd(2, 0) | 0) & 65535, j[x + 8 + 6 >> 1] = a, a = 0; ;) {
        if (f = ((a & 1 | s << 1) >>> 0) % 3 | 0, (d & 65535) < 3 ? (e = x + 16 + (f << 2) | 0, d = (m[x + 16 + (f << 2) >> 1] | 0) + -49 + (i[318448 + (d & 65535) >> 0] | 0) | 0) : (e = x + 16 + (f << 2) | 0, d = hd(4, 0) | 0), o = d & 65535, j[x + 8 + (a << 1) >> 1] = o, j[e >> 1] = j[x + 16 + (f << 2) + 2 >> 1] | 0, j[x + 16 + (f << 2) + 2 >> 1] = o, a = a + 1 | 0, (a | 0) == 4) break a;
        d = j[x + 8 + (a << 1) >> 1] | 0;
       } while (0);
       o = q | (c | 0) == 7, f = (v | 0) == 0, e = v + -2 | 0, g = b << 1 | 1, h = 318432 + c | 0, l = 318440 + c | 0, n = 0;
       do d = (n >> 3 ^ s ^ n << 1 & 14) + v | 0, o ? f ? a = t : (a = (ka(m[65896] | 0, u) | 0) + (d & 1 | e) | 0, a = m[(k[32946] | 0) + (a << 1) >> 1] | 0) : (a = k[x + ((d & 1) << 2) >> 2] | 0, a = ((m[a + ((i[h >> 0] | 0) + (d + -52) << 1) >> 1] | 0) + 1 + (m[a + ((i[l >> 0] | 0) + (d + -52) << 1) >> 1] | 0) | 0) >>> 1), y = m[x + 8 + (n >> 2 << 1) >> 1] | 0, z = hd(y, 0) | 0, y = a + b + (ka(z - ((z >> y + -1 | 0) == 0 ? 0 : 1 << y) | 0, g) | 0) & 65535, a = m[65896] | 0, d = (ka(a, u) | 0) + d | 0, j[(k[32946] | 0) + (d << 1) >> 1] = y, n = n + 1 | 0; while ((n | 0) != 16);
       v = v + 16 | 0;
      } while ((v | 15 | 0) < (a | 0));
     }
     u = u + 1 | 0;
    } while ((u | 0) < (m[65916] | 0));
   }
   r = x;
  }
  function Le(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   if (e = r, r = r + 208 | 0, k[e + 120 >> 2] = 0, kb(k[140] | 0, a | 0, 0) | 0, (rc() | 0) == 1347114067) {
    b = 0;
    do {
     if (rc() | 0, Ga(e + 160 | 0, 1, 40, k[140] | 0) | 0, c = rc() | 0, d = vb(k[140] | 0) | 0, og(e + 160 | 0, 587752) | 0 || (k[41342] = d, k[33044] = c), og(e + 160 | 0, 587776) | 0 || (k[41540] = c), og(e + 160 | 0, 587800) | 0 || (a = k[140] | 0, k[e + 56 >> 2] = e + 100, Ya(a | 0, 587824, e + 56 | 0) | 0, a = k[e + 100 >> 2] | 0, a >>> 0 < 39 && Og(132096, k[587832 + (a << 2) >> 2] | 0) | 0), !(og(e + 160 | 0, 587992) | 0)) {
      k[e + 100 >> 2] = 0;
      do f = rc() | 0, a = k[e + 100 >> 2] | 0, k[e + 124 + (a << 2) >> 2] = f, k[e + 100 >> 2] = a + 1; while ((a + 1 | 0) < 9);
      Ke(e + 124 | 0);
     }
     if (!(og(e + 160 | 0, 588024) | 0)) {
      k[e + 100 >> 2] = 0, a = 0;
      do f = k[140] | 0, k[e + 48 >> 2] = e + 124 + (a << 2), Ya(f | 0, 587592, e + 48 | 0) | 0, a = (k[e + 100 >> 2] | 0) + 1 | 0, k[e + 100 >> 2] = a; while ((a | 0) < 9);
      Ke(e + 124 | 0);
     }
     og(e + 160 | 0, 588048) | 0 || (f = k[140] | 0, k[e + 40 >> 2] = e + 120, Ya(f | 0, 587824, e + 40 | 0) | 0), og(e + 160 | 0, 588080) | 0 || (f = k[140] | 0, k[e + 64 >> 2] = 165408, Ya(f | 0, 587824, e + 64 | 0) | 0), og(e + 160 | 0, 588112) | 0 || (f = k[140] | 0, k[e + 24 >> 2] = e + 100, Ya(f | 0, 587824, e + 24 | 0) | 0, b = (k[e + 100 >> 2] | 0) == 1 ? 0 : b, f = k[140] | 0, k[e >> 2] = e + 100, Ya(f | 0, 587824, e | 0) | 0, b = (k[e + 100 >> 2] | 0) == 1 ? 1 : b, f = k[140] | 0, k[e + 8 >> 2] = e + 100, Ya(f | 0, 587824, e + 8 | 0) | 0, b = (k[e + 100 >> 2] | 0) == 1 ? 3 : b, f = k[140] | 0, k[e + 16 >> 2] = e + 100, Ya(f | 0, 587824, e + 16 | 0) | 0, b = (k[e + 100 >> 2] | 0) == 1 ? 2 : b), og(e + 160 | 0, 588136) | 0 || (f = k[140] | 0, k[e + 72 >> 2] = e + 100, Ya(f | 0, 587824, e + 72 | 0) | 0, k[41352] = (k[e + 100 >> 2] | 0) - (k[41352] | 0)), f = (og(e + 160 | 0, 588160) | 0) != 0, f | +o[33004] != 0 || (f = k[140] | 0, k[e + 80 >> 2] = e + 104, Ya(f | 0, 587824, e + 80 | 0) | 0, f = k[140] | 0, k[e + 88 >> 2] = e + 104 + 4, Ya(f | 0, 587824, e + 88 | 0) | 0, f = k[140] | 0, k[e + 96 >> 2] = e + 104 + 8, Ya(f | 0, 587824, e + 96 | 0) | 0, f = k[140] | 0, k[e + 32 >> 2] = e + 104 + 12, Ya(f | 0, 587824, e + 32 | 0) | 0, g = +(k[e + 104 >> 2] | 0), o[33004] = g / +(k[e + 104 + 4 >> 2] | 0), o[33005] = g / +(k[e + 104 + 8 >> 2] | 0), o[33006] = g / +(k[e + 104 + 12 >> 2] | 0)), og(e + 160 | 0, 588184) | 0 || (f = rc() | 0, k[32962] = f), Le(d), kb(k[140] | 0, d + c | 0, 0) | 0;
    } while ((rc() | 0) == 1347114067);
    a = k[e + 120 >> 2] | 0, a && (f = ka(l[588200 + ((((k[41352] | 0) >>> 0) / 90 | 0) + b & 3) >> 0] | 0, (a | 0) == 1 ? 16843009 : 0) | 0, k[80] = f);
   }
   r = e;
  }
  function jd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;
   if (D = r, r = r + 528 | 0, Jc(D + 48 | 0, 0) | 0) {
    if (j[284] = 18761, k[75038] = 0, k[75040] = 0, k[75041] = 0, C = wg(m[65896] | 0, 12) | 0, mc(C, 300232), b = j[65896] | 0, A = k[32990] | 0, j[66134] = (m[66134] | 0) >>> (A >>> 0 > 1 & 1), B = k[2] | 0, B = B >>> 0 < A >>> 0 ? B : A, B = (B | 0) == 0 ? 0 : B + -1 | 0, a = j[65916] | 0, a << 16 >> 16) for (d = A, y = C + ((b & 65535) << 2) | 0, c = b, z = C, w = C + ((b & 65535) << 1 << 2) | 0, x = 0; ;) {
     if (s = z, t = (x | 0) > 1, u = y, v = 0 - (x & 1) & 3, c << 16 >> 16) {
      for (b = d, p = 0, q = 2; ;) {
       if (b & 2147483647) {
        c = 0;
        do d = k[D + 48 + 312 >> 2] | 0, d = hd(m[d >> 1] | 0, d + 2 | 0) | 0, b = k[D + 48 + 312 >> 2] | 0, b = hd(m[b >> 1] | 0, b + 2 | 0) | 0, a = hd(d, 0) | 0, 1 << d + -1 & a || (a = a + 1 + (-1 << d) | 0), k[D + (c << 2) >> 2] = (a | 0) == 65535 ? -32768 : a, a = hd(b, 0) | 0, 1 << b + -1 & a || (a = a + 1 + (-1 << b) | 0), k[D + ((c | 1) << 2) >> 2] = (a | 0) == 65535 ? -32768 : a, c = c + 2 | 0, b = k[32990] | 0; while (c >>> 0 < b << 1 >>> 0);
       }
       i = (p | 0) != 0, l = k[32946] | 0, n = k[32928] | 0, h = k[32962] | 0, o = p;
       do {
        if (i ? (d = o + -2 | 0, a = k[s + (d << 2) >> 2] | 0, t & i & (k[D + 48 + 24 >> 2] | 0) == 11 && (a = ((k[u + (o << 2) >> 2] | 0) / 2 | 0) + a + ((k[u + (d << 2) >> 2] | 0) / -2 | 0) | 0)) : a = h + 32768 | 0, e = o + p & 1 ^ v, f = b & 0 - (o & 1), b) {
         g = 0;
         do a = (k[D + (f + g << 2) >> 2] | 0) + a | 0, (g | 0) == (B | 0) & (l | 0) != 0 && (c = l + ((ka(m[65896] | 0, x) | 0) + o << 1) | 0, j[c >> 1] = a >> (A >>> 0 > 1 & 1)), n && (F = x - (m[168] | 0) + (g & 1) | 0, E = p - (m[164] | 0) - (g >>> 1 & 1) | 0, c = m[65844] | 0, d = n + ((ka(F, c) | 0) + E << 3) + (e << 1) | 0, F >>> 0 < (m[65840] | 0) >>> 0 & E >>> 0 < c >>> 0 && (c = (g | 0) < 4 ? a >> (A >>> 0 > 1 & 1) & 65535 : ((m[d >> 1] | 0) + (a >> (A >>> 0 > 1 & 1) & 65535) | 0) >>> 1, j[d >> 1] = c)), g = g + 1 | 0; while ((g | 0) != (b | 0));
        }
        k[s + (o << 2) >> 2] = a, o = o + 1 | 0;
       } while ((o | 0) != (q | 0));
       if (p = p + 2 | 0, c = j[65896] | 0, (p | 0) >= (c & 65535 | 0)) break;
       q = q + 2 | 0;
      }
      a = j[65916] | 0;
     } else c = 0, b = d;
     if (x = x + 1 | 0, (x | 0) >= (a & 65535 | 0)) break;
     E = w, d = b, w = z, z = y, y = E;
    }
    vg(C), Kc(D + 48 | 0), k[32928] | 0 && (k[35116] = 1);
   }
   r = D;
  }
  function Wg(a, b, c, d, e) {
   a |= 0, b |= 0, c |= 0, d |= 0, e |= 0;
   var f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   if (!b) return d ? e ? (k[e >> 2] = a | 0, k[e + 4 >> 2] = b & 0, d = 0, e = 0, O = d, e | 0) : (d = 0, e = 0, O = d, e | 0) : (e && (k[e >> 2] = (a >>> 0) % (c >>> 0), k[e + 4 >> 2] = 0), d = 0, e = (a >>> 0) / (c >>> 0) >>> 0, O = d, e | 0);
   do {
    if (c) {
     if (d) {
      if (g = (ma(d | 0) | 0) - (ma(b | 0) | 0) | 0, g >>> 0 <= 31) {
       n = g + 1 | 0, h = a >>> ((g + 1 | 0) >>> 0) & g - 31 >> 31 | b << 31 - g, m = b >>> ((g + 1 | 0) >>> 0) & g - 31 >> 31, f = 0, g = a << 31 - g;
       break;
      }
      return e ? (k[e >> 2] = a | 0, k[e + 4 >> 2] = b | b & 0, d = 0, e = 0, O = d, e | 0) : (d = 0, e = 0, O = d, e | 0);
     }
     if (c - 1 & c) {
      g = (ma(c | 0) | 0) + 33 - (ma(b | 0) | 0) | 0, n = g, h = 32 - g - 1 >> 31 & b >>> ((g - 32 | 0) >>> 0) | (b << 32 - g | a >>> (g >>> 0)) & g - 32 >> 31, m = g - 32 >> 31 & b >>> (g >>> 0), f = a << 64 - g & 32 - g >> 31, g = (b << 64 - g | a >>> ((g - 32 | 0) >>> 0)) & 32 - g >> 31 | a << 32 - g & g - 33 >> 31;
      break;
     }
     return e && (k[e >> 2] = c - 1 & a, k[e + 4 >> 2] = 0), (c | 0) == 1 ? (d = b | b & 0, e = a | 0 | 0, O = d, e | 0) : (e = Pg(c | 0) | 0, d = b >>> (e >>> 0) | 0, e = b << 32 - e | a >>> (e >>> 0) | 0, O = d, e | 0);
    }
    if (!d) return e && (k[e >> 2] = (b >>> 0) % (c >>> 0), k[e + 4 >> 2] = 0), d = 0, e = (b >>> 0) / (c >>> 0) >>> 0, O = d, e | 0;
    if (!a) return e && (k[e >> 2] = 0, k[e + 4 >> 2] = (b >>> 0) % (d >>> 0)), c = 0, e = (b >>> 0) / (d >>> 0) >>> 0, O = c, e | 0;
    if (!(d - 1 & d)) return e && (k[e >> 2] = a | 0, k[e + 4 >> 2] = d - 1 & b | b & 0), c = 0, e = b >>> ((Pg(d | 0) | 0) >>> 0), O = c, e | 0;
    if (g = (ma(d | 0) | 0) - (ma(b | 0) | 0) | 0, g >>> 0 <= 30) {
     n = g + 1 | 0, h = b << 31 - g | a >>> ((g + 1 | 0) >>> 0), m = b >>> ((g + 1 | 0) >>> 0), f = 0, g = a << 31 - g;
     break;
    }
    return e ? (k[e >> 2] = a | 0, k[e + 4 >> 2] = b | b & 0, d = 0, e = 0, O = d, e | 0) : (d = 0, e = 0, O = d, e | 0);
   } while (0);
   if (n) {
    j = Eg(c | 0 | 0, d | d & 0 | 0, -1, -1) | 0, l = O, i = g, b = m, a = n, g = 0;
    do p = i, i = f >>> 31 | i << 1, f = g | f << 1, p = h << 1 | p >>> 31 | 0, o = h >>> 31 | b << 1 | 0, Bg(j, l, p, o) | 0, n = O, m = n >> 31 | ((n | 0) < 0 ? -1 : 0) << 1, g = m & 1, h = Bg(p, o, m & (c | 0), (((n | 0) < 0 ? -1 : 0) >> 31 | ((n | 0) < 0 ? -1 : 0) << 1) & (d | d & 0)) | 0, b = O, a = a - 1 | 0; while ((a | 0) != 0);
    a = 0;
   } else i = g, b = m, a = 0, g = 0;
   return e && (k[e >> 2] = h, k[e + 4 >> 2] = b), o = (f | 0) >>> 31 | i << 1 | (0 | f >>> 31) & 0 | a, p = (f << 1 | 0) & -2 | g, O = o, p | 0;
  }
  function id() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0;
   if (u = r, r = r + 16 | 0, s = wg((m[65916] << 2) + ((m[65896] | 0) * 3 | 0) | 0, 2) | 0, mc(s, 300168), q = s + (m[65896] << 1) | 0, kb(k[140] | 0, k[33062] | 0, 0) | 0, a = j[65916] | 0, a << 16 >> 16) {
    b = 0;
    do a = rc() | 0, k[q + (b << 2) >> 2] = a, b = b + 1 | 0, a = m[65916] | 0; while ((b | 0) < (a | 0));
   } else a &= 65535;
   kb(k[140] | 0, k[33057] | 0, 0) | 0, k[33057] | 0 && uc(q + (a << 2) | 0, m[65916] << 1), p = (m[65916] | 0) + a | 0, kb(k[140] | 0, k[33059] | 0, 0) | 0, k[33059] | 0 ? (uc(q + (p << 2) | 0, m[65896] << 1), b = 0) : b = 0;
   do o = ~~(+(ka(b, b) | 0) / 3.969 + .5) & 65535, j[576 + (b << 1) >> 1] = o, b = b + 1 | 0; while ((b | 0) != 256);
   if (j[65916] | 0) {
    o = 0;
    do {
     if (kb(k[140] | 0, (k[q + (o << 2) >> 2] | 0) + (k[33002] | 0) | 0, 0) | 0, k[75038] = 0, k[75040] = 0, k[75041] = 0, k[u + 4 >> 2] = 0, k[u >> 2] = 0, b = j[65896] | 0, b << 16 >> 16) {
      c = b & 65535, h = 0;
      do {
       if ((h | 0) < (c & 65528 | 0)) {
        if (!(h & 7)) {
         c = 0;
         do hd(1, 0) | 0 || (hd(1, 0) | 0 ? (b = 2, t = 18) : hd(1, 0) | 0 ? (b = 4, t = 18) : hd(1, 0) | 0 ? (b = 6, t = 18) : hd(1, 0) | 0 ? (b = 8, t = 18) : b = 10, (t | 0) == 18 && (t = 0), n = 300192 + (b + -2 + (hd(1, 0) | 0) << 2) | 0, k[u + 8 + (c << 2) >> 2] = k[n >> 2]), c = c + 1 | 0; while ((c | 0) != 2);
        }
       } else k[u + 8 + 4 >> 2] = 14, k[u + 8 >> 2] = 14;
       b = h & 1, c = k[u + 8 + (b << 2) >> 2] | 0, (c | 0) == 14 ? (n = hd(16, 0) | 0, k[u + (b << 2) >> 2] = n, b = n) : (n = hd(c, 0) | 0, n = (-1 << c + -1) + 1 + n + (k[u + (b << 2) >> 2] | 0) | 0, k[u + (b << 2) >> 2] = n, b = n), c = s + (h << 1) | 0, j[c >> 1] = b, b >>> 0 > 65535 && nc(), (k[33052] | 0) == 5 && (b = j[c >> 1] | 0, (b & 65535) < 256 && (j[c >> 1] = j[576 + ((b & 65535) << 1) >> 1] | 0)), h = h + 1 | 0, b = j[65896] | 0, c = b & 65535;
      } while ((h | 0) < (c | 0));
     } else b = 0;
     if (f = k[33055] | 0, g = k[33056] | 0, h = q + (o + a << 2) | 0, i = (o | 0) >= (k[33058] | 0) & 1, l = k[32946] | 0, b << 16 >> 16) {
      e = b & 65535, c = b, n = 0;
      do d = (m[s + (n << 1) >> 1] << 2) - f + (j[h + (((n | 0) >= (g | 0) & 1) << 1) >> 1] | 0) + (j[q + (n + p << 2) + (i << 1) >> 1] | 0) | 0, (d | 0) > 0 && (c = l + ((ka(e, o) | 0) + n << 1) | 0, j[c >> 1] = d, c = b), n = n + 1 | 0, e = c & 65535; while ((n | 0) < (e | 0));
     }
     o = o + 1 | 0;
    } while ((o | 0) < (m[65916] | 0));
   }
   vg(s), k[32952] = 65532 - (k[33055] | 0), r = u;
  }
  function Be() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, p = 0, q = 0, s = 0, t = 0;
   if (s = r, r = r + 80 | 0, q = k[32932] | 0, (q + -3 | 0) >>> 0 <= 1) {
    if (q) {
     b = 0, a = 2147483647;
     do p = ~~(+o[131648 + (b << 2) >> 2] * 65535), a = (a | 0) > (p | 0) ? p : a, b = b + 1 | 0; while ((b | 0) != (q | 0));
    } else a = 2147483647;
    if (i = k[32928] | 0, l = +(a | 0), n = j[65840] | 0, n << 16 >> 16) {
     h = j[65844] | 0, b = h, p = 0;
     do {
      if (b << 16 >> 16) for (b &= 65535, g = 0; ;) {
       d = (ka(b, p) | 0) + g | 0;
       a: do if (q) {
        b = 0;
        do {
         if ((m[i + (d << 3) + (b << 1) >> 1] | 0 | 0) > (a | 0)) break a;
         b = b + 1 | 0;
        } while (b >>> 0 < q >>> 0);
       } else b = 0; while (0);
       if ((b | 0) != (q | 0)) {
        if (q) {
         b = 0;
         do c = +(m[i + (d << 3) + (b << 1) >> 1] | 0), o[s + 40 + (b << 2) >> 2] = c, o[s + 40 + 16 + (b << 2) >> 2] = c < l ? c : l, b = b + 1 | 0; while ((b | 0) != (q | 0));
         f = 0;
        } else f = 0;
        do {
         if (q) {
          b = 0;
          do {
           d = s + (f << 4) + (b << 2) | 0, o[d >> 2] = 0, c = 0, e = 0;
           do c += +o[586280 + (q + -3 << 6) + (b << 4) + (e << 2) >> 2] * +o[s + 40 + (f << 4) + (e << 2) >> 2], e = e + 1 | 0; while ((e | 0) != (q | 0));
           o[d >> 2] = c, b = b + 1 | 0;
          } while ((b | 0) != (q | 0));
         }
         if (b = s + 32 + (f << 2) | 0, o[b >> 2] = 0, q >>> 0 > 1) {
          c = 0, d = 1;
          do t = +o[s + (f << 4) + (d << 2) >> 2], c += t * t, d = d + 1 | 0; while ((d | 0) != (q | 0));
          o[b >> 2] = c;
         }
         f = f + 1 | 0;
        } while ((f | 0) != 2);
        if (c = +_(+(+o[s + 32 + 4 >> 2] / +o[s + 32 >> 2])), q >>> 0 > 1) {
         b = 1;
         do e = s + (b << 2) | 0, o[e >> 2] = c * +o[e >> 2], b = b + 1 | 0; while ((b | 0) != (q | 0));
        }
        if (q) {
         d = 0;
         do {
          b = s + 40 + (d << 2) | 0, o[b >> 2] = 0, c = 0, e = 0;
          do c += +o[586408 + (q + -3 << 6) + (d << 4) + (e << 2) >> 2] * +o[s + (e << 2) >> 2], e = e + 1 | 0; while ((e | 0) != (q | 0));
          o[b >> 2] = c, d = d + 1 | 0;
         } while ((d | 0) != (q | 0));
         b = 0;
         do e = i + ((ka(h & 65535, p) | 0) + g << 3) + (b << 1) | 0, j[e >> 1] = ~~(+o[s + 40 + (b << 2) >> 2] / +(q >>> 0)), b = b + 1 | 0; while ((b | 0) != (q | 0));
        }
       }
       if (g = g + 1 | 0, b = h & 65535, (g | 0) >= (b | 0)) {
        b = h;
        break;
       }
      } else b = 0;
      p = p + 1 | 0;
     } while ((p | 0) != (n & 65535 | 0));
    }
   }
   r = s;
  }
  function df() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0;
   l = r, r = r + 2176 | 0, j[284] = 18761, kb(k[140] | 0, 36, 0) | 0, g = rc() | 0, k[41352] = g, kb(k[140] | 0, -4, 2) | 0, g = k[140] | 0, kb(g | 0, rc() | 0, 0) | 0;
   a: do if ((rc() | 0) == 1682130259 && (rc() | 0, a = rc() | 0)) {
    b = 0;
    do {
     if (a = a + -1 | 0, g = rc() | 0, e = rc() | 0, c = rc() | 0, h = vb(k[140] | 0) | 0, kb(k[140] | 0, g | 0, 0) | 0, (rc() | 0) != (c << 24 | 541279571 | 0)) break a;
     if ((c | 0) == 1347375696) {
      if (rc() | 0, c = rc() | 0, kb(k[140] | 0, 12, 1) | 0, e = (c ^ -256) >>> 0 > 4294967039 ? ~c : -257, -2 - (e << 1) | 0) {
       d = 0;
       do f = g + 24 + (c << 3) + ((rc() | 0) << 1) | 0, k[l + (d << 2) >> 2] = f, d = d + 1 | 0; while ((d | 0) != (-2 - (e << 1) | 0));
      }
      if ((e | 0) != -1) {
       c = 0;
       do cf(k[l + (c << 3) >> 2] | 0, l + 2112 | 0), cf(k[l + (c << 3) + 4 >> 2] | 0, l + 2048 | 0), og(l + 2112 | 0, 588896) | 0 || (n = +(jg(l + 2048 | 0) | 0), o[41344] = n), og(l + 2112 | 0, 588904) | 0 || Og(132032, l + 2048 | 0) | 0, og(l + 2112 | 0, 588920) | 0 || Og(132096, l + 2048 | 0) | 0, og(l + 2112 | 0, 588936) | 0 || Og(131864, l + 2048 | 0) | 0, og(l + 2112 | 0, 588944) | 0 || (g = jg(l + 2048 | 0) | 0, k[41306] = g), og(l + 2112 | 0, 588952) | 0 || (n = +(jg(l + 2048 | 0) | 0) / 1e6, o[41348] = n), og(l + 2112 | 0, 588960) | 0 || (n = +ig(l + 2048 | 0), o[41346] = n), og(l + 2112 | 0, 588976) | 0 || (n = +ig(l + 2048 | 0), o[41504] = n), c = c + 1 | 0; while ((c | 0) != (~e | 0));
      }
     } else (c | 0) == 1179468099 ? (k[33e3] = g + 8, k[33050] = e + -28) : (c | 0) == 843140425 | (c | 0) == 1195461961 && (kb(k[140] | 0, 8, 1) | 0, d = rc() | 0, c = rc() | 0, f = rc() | 0, (c | 0) > (m[65896] | 0 | 0) && (f | 0) > (m[65916] | 0 | 0) && ((d | 0) == 5 ? (k[32962] = 1, i = 9) : (d | 0) == 30 ? k[41268] = 35 : (d | 0) == 6 ? i = 9 : k[41268] = 0, (i | 0) == 9 && (i = 0, k[41268] = 34), j[65896] = c, j[65916] = f, k[33002] = g + 28, k[41690] = 1), kb(k[140] | 0, g + 28 | 0, 0) | 0, (ib(k[140] | 0) | 0) == 255 && (ib(k[140] | 0) | 0) == 216 && (k[33044] | 0) >>> 0 < (e + -28 | 0) >>> 0 && (k[41342] = g + 28, k[33044] = e + -28, k[41676] = 36), b = b + 1 | 0, (b | 0) != 2 | (k[33044] | 0) != 0 || (k[41342] = g + 24, j[66080] = c, j[66084] = f, k[41676] = 37, b = 2));
     kb(k[140] | 0, h | 0, 0) | 0;
    } while ((a | 0) != 0);
   } while (0);
   r = l;
  }
  function rf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
   if (z = r, r = r + 1424 | 0, a = j[65844] | 0, l = j[65840] | 0, b = ~~(+(ka(l & 65535, a & 65535) | 0) * .01), b = (j[82540] | 0) == 0 ? b : (b | 0) / 2 | 0, k[32] & -3 | k[48]) c = 65536; else if (d = k[32932] | 0) {
    e = 0, h = 0;
    do {
     f = 0, g = 8192;
     do {
      if (g = g + -1 | 0, (g | 0) <= 32) break;
      f = (k[166784 + (e << 15) + (g << 2) >> 2] | 0) + f | 0;
     } while ((f | 0) <= (b | 0));
     h = (h | 0) < (g | 0) ? g : h, e = e + 1 | 0;
    } while ((e | 0) != (d | 0));
    c = +(h << 3 | 0);
   } else c = 0;
   me(+p[6], +p[7], 2, ~~(c / +o[18])), j[82616] = l, j[65852] = a, k[41352] & 4 && (j[65844] = l, j[65840] = a, a = l), y = wg(a & 65535, (ka(k[42] | 0, k[32932] | 0) | 0) >>> 3) | 0, mc(y, 614704);
   do {
    if (!(k[44] | 0)) {
     if (a = k[32932] | 0, b = k[33046] | 0, a >>> 0 > 3) {
      w = m[65840] | 0, x = (1 << k[42]) + -1 | 0, k[z >> 2] = m[65844], k[z + 4 >> 2] = w, k[z + 8 >> 2] = a, k[z + 12 >> 2] = x, k[z + 16 >> 2] = 166680, Jb(b | 0, 614728, z | 0) | 0;
      break;
     }
     v = m[65844] | 0, w = m[65840] | 0, x = (1 << k[42]) + -1 | 0, k[z + 24 >> 2] = (a >>> 1) + 5, k[z + 24 + 4 >> 2] = v, k[z + 24 + 8 >> 2] = w, k[z + 24 + 12 >> 2] = x, Jb(b | 0, 614792, z + 24 | 0) | 0;
     break;
    }
    pf(z + 40 | 0, 1), Hb(z + 40 | 0, 1376, 1, k[33046] | 0) | 0, a = k[41694] | 0, a && (x = Fa(k[a >> 2] | 0) | 0, Hb(a | 0, x | 0, 1, k[33046] | 0) | 0);
   } while (0);
   v = nf(0, 0) | 0, w = nf(0, 1) | 0, x = nf(1, 0) | 0, a = j[65844] | 0, x = x - (nf(0, a & 65535) | 0) | 0;
   a: do if (j[65840] | 0) for (b = 0, l = v; ;) {
    if (d = k[42] | 0, h = k[32932] | 0, e = k[32928] | 0, u = a & 65535, a << 16 >> 16) {
     for (g = a & 65535, n = ka(w - v | 0, g + -1 | 0) | 0, s = 0, t = l; ;) {
      if (q = ka(h, s) | 0, (d | 0) == 8) {
       if (h) {
        f = 0;
        do i[y + (q + f) >> 0] = (m[576 + (m[e + (t << 3) + (f << 1) >> 1] << 1) >> 1] | 0) >>> 8, f = f + 1 | 0; while ((f | 0) != (h | 0));
       }
      } else if (h) {
       f = 0;
       do j[y + (q + f << 1) >> 1] = j[576 + (m[e + (t << 3) + (f << 1) >> 1] << 1) >> 1] | 0, f = f + 1 | 0; while ((f | 0) != (h | 0));
      }
      if (s = s + 1 | 0, (s | 0) == (g | 0)) break;
      t = w - v + t | 0;
     }
     l = w - v + l + n | 0;
    }
    if ((d | 0) != 16 | (k[44] | 0) != 0 || ((tb(21930) | 0) << 16 >> 16 == 21930 ? d = 16 : (yb(y | 0, y | 0, ka(u << 1, h) | 0), d = k[42] | 0, h = k[32932] | 0, a = j[65844] | 0)), u = (ka(d, h) | 0) >>> 3, Hb(y | 0, u | 0, a & 65535 | 0, k[33046] | 0) | 0, b = b + 1 | 0, (b | 0) >= (m[65840] | 0)) break a;
    a = j[65844] | 0, l = x + l | 0;
   } while (0);
   vg(y), r = z;
  }
  function Uc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0;
   p = r, r = r + 16 | 0, kb(k[140] | 0, k[33e3] | 0, 0) | 0, a = ib(k[140] | 0) | 0, b = (ib(k[140] | 0) | 0) & 65535, (a & 65535 | 0) == 73 | (b | 0) == 88 && kb(k[140] | 0, 2110, 1) | 0, o = (a & 65535 | 0) == 70 ? 2 : 0, o = (k[32998] | 0) == 14 ? o + 3 | 0 : o, uc(p + 8 | 0, 4), d = k[32998] | 0, c = pc() | 0, e = (c & 65535) > 1 ? (1 << d & 32767 | 0) / ((c & 65535) + -1 | 0) | 0 : 0;
   do if ((a & 65535 | 0) == 70) a = 1 << d & 32767, n = 0; else if ((a & 65535 | 0) == 68) {
    if (!((b | 0) == 32 & (e | 0) > 0)) {
     if ((c & 65535) < 16386) {
      f = 14;
      break;
     }
     a = 1 << d & 32767, n = 0;
     break;
    }
    if (c << 16 >> 16) {
     a = 0;
     do l = pc() | 0, n = 576 + ((ka(a, e) | 0) << 1) | 0, j[n >> 1] = l, a = a + 1 | 0; while ((a | 0) != (c & 65535 | 0));
    }
    if (d >>> 0 <= 14) {
     a = 0;
     do l = (a | 0) % (e | 0) | 0, g = a - l | 0, n = ka(m[576 + (g << 1) >> 1] | 0, e - l | 0) | 0, n = (((ka(m[576 + (g + e << 1) >> 1] | 0, l) | 0) + n | 0) / (e | 0) | 0) & 65535, j[576 + (a << 1) >> 1] = n, a = a + 1 | 0; while ((a | 0) != (1 << d & 32767 | 0));
    }
    kb(k[140] | 0, (k[33e3] | 0) + 562 | 0, 0) | 0, a = 1 << d & 32767, n = (pc() | 0) & 65535;
   } else (c & 65535) < 16386 ? f = 14 : (a = 1 << d & 32767, n = 0); while (0);
   for ((f | 0) == 14 && (uc(576, c & 65535), a = c & 65535, n = 0), b = a; ;) {
    if (a = b + -1 | 0, (j[576 + (b + -2 << 1) >> 1] | 0) != (j[576 + (a << 1) >> 1] | 0)) break;
    b = a;
   }
   if (a = Fc(299648 + (o << 5) | 0) | 0, kb(k[140] | 0, k[33002] | 0, 0) | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, l = (n | 0) != 0, j[65840] | 0) {
    d = 0, i = 0;
    do {
     if (l & (i | 0) == (n | 0) && (vg(a), a = Fc(299648 + (o + 1 << 5) | 0) | 0, b = b + 32 | 0, d = 16), e = a + 2 | 0, g = i & 1, j[65896] | 0) {
      h = 0;
      do f = Dc(m[a >> 1] | 0, e) | 0, c = ((Dc((f & 15) - (f >> 4) | 0, 0) | 0) << 1 | 1) << (f >> 4) >>> 1, c & 1 << (f & 15) + -1 || (c = ((f >> 4 | 0) == 0 & 1) + (-1 << (f & 15)) + c | 0), (h | 0) < 2 ? (f = p + 8 + (g << 2) + (h << 1) | 0, c = (m[f >> 1] | 0) + c & 65535, j[f >> 1] = c, j[p + (h << 1) >> 1] = c, c = j[p + ((h & 1) << 1) >> 1] | 0) : (f = p + ((h & 1) << 1) | 0, c = (m[f >> 1] | 0) + c & 65535, j[f >> 1] = c), ((c & 65535) + d & 65535 | 0) >= (b | 0) && nc(), q = c << 16 >> 16 < 16383 ? c << 16 >> 16 : 16383, f = m[65896] | 0, c = (ka(f, i) | 0) + h | 0, j[(k[32946] | 0) + (c << 1) >> 1] = j[576 + (((q | 0) < 0 ? 0 : q) << 1) >> 1] | 0, h = h + 1 | 0; while ((h | 0) < (f | 0));
     }
     i = i + 1 | 0;
    } while ((i | 0) < (m[65840] | 0));
   }
   vg(a), r = p;
  }
  function se() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0;
   do if (j[65848] | 0) {
    if (!(k[26] | 0)) {
     if (f = wg(m[65840] | 0, m[65844] << 3) | 0, mc(f, 323432), a = j[65840] | 0, a << 16 >> 16) {
      d = j[65844] | 0, i = 0;
      do {
       if (e = i >> 1, g = ka(d & 65535, i) | 0, d << 16 >> 16) {
        b = j[65852] | 0, c = k[32928] | 0, h = 0;
        do l = jc(i, h) | 0, n = c + ((ka(b & 65535, e) | 0) + (h >> 1) << 3) + (l << 1) | 0, j[f + (g + h << 3) + (l << 1) >> 1] = j[n >> 1] | 0, h = h + 1 | 0; while ((h | 0) != (d & 65535 | 0));
       }
       i = i + 1 | 0;
      } while ((i | 0) != (a & 65535 | 0));
     }
     vg(k[32928] | 0), k[32928] = f, j[65848] = 0;
     break;
    }
    if (h = j[82616] | 0, j[65840] = h, i = j[65852] | 0, j[65844] = i, (k[80] | 0) == 9) {
     for (e = k[32928] | 0, c = 0; ;) {
      if (a = ka(i & 65535, c) | 0, !((j[e + (a + 1 << 3) + 4 >> 1] | j[e + (a + 1 << 3) >> 1]) << 16 >> 16)) {
       b = 1, a = c;
       break;
      }
      if (!((j[e + (a + 2 << 3) + 4 >> 1] | j[e + (a + 2 << 3) >> 1]) << 16 >> 16)) {
       b = 2, a = c;
       break;
      }
      if (!((j[e + (a + 3 << 3) + 4 >> 1] | j[e + (a + 3 << 3) >> 1]) << 16 >> 16)) {
       b = 3, a = c;
       break;
      }
      if (a = c + 1 | 0, !((a | 0) < 3)) {
       b = 4;
       break;
      }
      c = a;
     }
     if ((a | 0) < (h & 65535 | 0)) do {
      if (b = (b + -1 | 0) % 3 | 0, (b + 1 | 0) < ((i & 65535) + -1 | 0)) {
       for (c = (((i & 65535) + -1 | 0) > (b + 4 | 0) ? (i & 65535) + -1 | 0 : b + 4 | 0) + -2 - b | 0, f = i & 65535, d = b + 1 | 0; ;) {
        if (n = (ka(f, a) | 0) + d | 0, j[e + (n << 3) >> 1] = ((m[e + (n + 1 << 3) >> 1] | 0) + (m[e + (n + -1 << 3) >> 1] | 0) | 0) >>> 1, j[e + (n << 3) + 4 >> 1] = ((m[e + (n + 1 << 3) + 4 >> 1] | 0) + (m[e + (n + -1 << 3) + 4 >> 1] | 0) | 0) >>> 1, d = d + 3 | 0, !((d | 0) < ((i & 65535) + -1 | 0))) break;
        f = i & 65535;
       }
       b = b + 4 + (c - ((c >>> 0) % 3 | 0)) | 0;
      } else b = b + 1 | 0;
      a = a + 3 | 0;
     } while ((a | 0) < (h & 65535 | 0));
    }
   } while (0);
   f = k[80] | 0;
   do if (f >>> 0 > 1e3 & (k[32932] | 0) == 3) {
    if (n = k[28] | 0, a = k[26] | 0, k[35116] = a ^ n, a | n) {
     k[32932] = 4;
     break;
    }
    if (d = k[32928] | 0, e = m[65840] | 0, (f >>> 5 & 1) >>> 0 < e >>> 0) {
     c = j[65844] | 0, g = f >>> 5 & 1;
     do {
      if (b = f >>> (g << 2 & 28 | 2) & 1, b >>> 0 < (c & 65535) >>> 0) do n = (ka(c & 65535, g) | 0) + b | 0, j[d + (n << 3) + 2 >> 1] = j[d + (n << 3) + 6 >> 1] | 0, b = b + 2 | 0; while ((b | 0) < (c & 65535 | 0));
      g = g + 2 | 0;
     } while ((g | 0) < (e | 0));
    }
    k[80] = ((f << 1 | 1431655765) ^ -1431655766) & f;
   } else a = k[26] | 0; while (0);
   a && (k[80] = 0);
  }
  function Sf(a, b) {
   a = +a, b = +b;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0;
   if (p[t >> 3] = a, c = k[t >> 2] | 0, m = k[t + 4 >> 2] | 0, p[t >> 3] = b, j = k[t >> 2] | 0, l = k[t + 4 >> 2] | 0, g = Ig(c | 0, m | 0, 52) | 0, i = Ig(j | 0, l | 0, 52) | 0, e = Ng(j | 0, l | 0, 1) | 0, h = O, !((e | 0) == 0 & (h | 0) == 0 || (l & 2147483647) >>> 0 > 2146435072 | (l & 2147483647 | 0) == 2146435072 & j >>> 0 > 0 | (g & 2047 | 0) == 2047)) {
    if (f = Ng(c | 0, m | 0, 1) | 0, d = O, !(d >>> 0 > h >>> 0 | (d | 0) == (h | 0) & f >>> 0 > e >>> 0)) return +((f | 0) == (e | 0) & (d | 0) == (h | 0) ? a * 0 : a);
    if (g & 2047) e = m & 1048575 | 1048576, d = g & 2047; else {
     if (d = Ng(c | 0, m | 0, 12) | 0, e = O, (e | 0) > -1 | (e | 0) == -1 & d >>> 0 > 4294967295) {
      f = d, d = 0;
      do d = d + -1 | 0, f = Ng(f | 0, e | 0, 1) | 0, e = O; while ((e | 0) > -1 | (e | 0) == -1 & f >>> 0 > 4294967295);
     } else d = 0;
     c = Ng(c | 0, m | 0, 1 - d | 0) | 0, e = O;
    }
    if (i & 2047) l = l & 1048575 | 1048576, h = i & 2047; else {
     if (f = Ng(j | 0, l | 0, 12) | 0, g = O, (g | 0) > -1 | (g | 0) == -1 & f >>> 0 > 4294967295) {
      h = 0;
      do h = h + -1 | 0, f = Ng(f | 0, g | 0, 1) | 0, g = O; while ((g | 0) > -1 | (g | 0) == -1 & f >>> 0 > 4294967295);
     } else h = 0;
     j = Ng(j | 0, l | 0, 1 - h | 0) | 0, l = O;
    }
    g = Bg(c | 0, e | 0, j | 0, l | 0) | 0, f = O;
    a: do {
     if ((d | 0) > (h | 0)) {
      for (i = (f | 0) > -1 | (f | 0) == -1 & g >>> 0 > 4294967295; ;) {
       if (i) {
        if ((c | 0) == (j | 0) & (e | 0) == (l | 0)) break;
        c = g, e = f;
       }
       if (c = Ng(c | 0, e | 0, 1) | 0, e = O, d = d + -1 | 0, g = Bg(c | 0, e | 0, j | 0, l | 0) | 0, f = O, !((d | 0) > (h | 0))) {
        h = (f | 0) > -1 | (f | 0) == -1 & g >>> 0 > 4294967295;
        break a;
       }
       i = (f | 0) > -1 | (f | 0) == -1 & g >>> 0 > 4294967295;
      }
      return a *= 0, +a;
     }
     h = (f | 0) > -1 | (f | 0) == -1 & g >>> 0 > 4294967295;
    } while (0);
    if (h) {
     if ((c | 0) == (j | 0) & (e | 0) == (l | 0)) return a *= 0, +a;
     e = f, c = g;
    }
    if (e >>> 0 < 1048576 | (e | 0) == 1048576 & c >>> 0 < 0) do c = Ng(c | 0, e | 0, 1) | 0, e = O, d = d + -1 | 0; while (e >>> 0 < 1048576 | (e | 0) == 1048576 & c >>> 0 < 0);
    return (d | 0) > 0 ? (g = Eg(c | 0, e | 0, 0, -1048576) | 0, c = O, d = Ng(d | 0, 0, 52) | 0, c |= O, d = g | d) : (d = Ig(c | 0, e | 0, 1 - d | 0) | 0, c = O), k[t >> 2] = d, k[t + 4 >> 2] = c | m & -2147483648, a = +p[t >> 3], +a;
   }
   return a = a * b / (a * b), +a;
  }
  function ke(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
   z = r, r = r + 160 | 0;
   a: do if (k[80] | 0) {
    if (a) y = Pb(a | 0, 323192) | 0; else {
     for (a = 32; ;) {
      if (e = ug(a) | 0, !e) break a;
      if (Da(e | 0, a + -16 | 0) | 0) break;
      if (vg(e), y = wb() | 0, (k[y >> 2] | 0) != 34) break a;
      a <<= 1;
     }
     a = Cg(e | 0) | 0;
     b: do if ((i[e >> 0] | 0) == 47) for (a = (i[e + (a + -1) >> 0] | 0) == 47 ? e + (a + -1) | 0 : e + a | 0; ;) {
      b = a, c = 323200, d = b + 12 | 0;
      do i[b >> 0] = i[c >> 0] | 0, b = b + 1 | 0, c = c + 1 | 0; while ((b | 0) < (d | 0));
      if (b = Pb(e | 0, 323192) | 0, (a | 0) == (e | 0) | (b | 0) != 0) {
       a = b;
       break b;
      }
      do a = a + -1 | 0; while ((i[a >> 0] | 0) != 47);
      if ((i[e >> 0] | 0) != 47) {
       a = 0;
       break;
      }
     } else a = 0; while (0);
     vg(e), y = a;
    }
    if (y) {
     if (Cb(z + 24 | 0, 128, y | 0) | 0) do if (a = Bf(z + 24 | 0, 35) | 0, a && (i[a >> 0] = 0), k[z >> 2] = z + 20, k[z + 4 >> 2] = z + 16, k[z + 8 >> 2] = z + 12, (xf(z + 24 | 0, 323216, z) | 0) == 3 && (p = k[z + 20 >> 2] | 0, q = m[65844] | 0, p >>> 0 < q >>> 0 && (s = k[z + 16 >> 2] | 0, t = m[65840] | 0, s >>> 0 < t >>> 0 && (k[z + 12 >> 2] | 0) <= (k[41306] | 0)))) {
      u = m[65848] | 0, v = m[65852] | 0, w = k[32928] | 0, x = 1, a = 0;
      do {
       if (b = s - x | 0, l = s + x | 0, n = p - x | 0, o = p + x | 0, (b | 0) > (l | 0)) d = 0; else for (d = 0; ;) {
        if (e = (b | 0) == (s | 0), f = ka(b >> u, v) | 0, (n | 0) <= (o | 0)) for (h = b >>> 0 >= t >>> 0, g = n; ;) {
         do if (!(g >>> 0 >= q >>> 0 | h | (g | 0) == (p | 0) & e)) {
          if (c = jc(b, g) | 0, (c | 0) != (jc(s, p) | 0)) break;
          d = d + 1 | 0, a = (m[w + (f + (g >> u) << 3) + (c << 1) >> 1] | 0) + a | 0;
         } while (0);
         if (!((g | 0) < (o | 0))) break;
         g = g + 1 | 0;
        }
        if (!((b | 0) < (l | 0))) break;
        b = b + 1 | 0;
       }
       x = x + 1 | 0;
      } while ((x | 0) < 3 & (d | 0) == 0);
      x = w + ((ka(s >> u, v) | 0) + (p >> u) << 3) + ((jc(s, p) | 0) << 1) | 0, j[x >> 1] = (a | 0) / (d | 0) | 0;
     } while ((Cb(z + 24 | 0, 128, y | 0) | 0) != 0);
     pb(y | 0) | 0;
    }
   } while (0);
   r = z;
  }
  function Mc(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0;
   if (c = k[b + 12 >> 2] | 0, q = ka(c, a) | 0, (q | 0) % (k[b + 28 >> 2] | 0) | 0) q = b + 4 | 0; else {
    if (q = 1 << (k[b + 4 >> 2] | 0) + -1, k[b + 32 >> 2] = q, k[b + 36 >> 2] = q, k[b + 40 >> 2] = q, k[b + 44 >> 2] = q, k[b + 48 >> 2] = q, k[b + 52 >> 2] = q, a) {
     kb(k[140] | 0, -2, 1) | 0, c = 0;
     do q = ib(k[140] | 0) | 0, c = (c << 8 & 16776960) + q | 0; while (!((q | 0) == -1 | (c & 65520 | 0) == 65488));
     c = k[b + 12 >> 2] | 0;
    }
    k[74604] = 0, k[74606] = 0, k[74608] = 0, q = b + 4 | 0;
   }
   if (o = k[b + 472 >> 2] | 0, d = k[b + 16 >> 2] | 0, p = ka(d, c) | 0, (c | 0) > 0) {
    n = 0, g = o + ((p & 0 - (a & 1)) << 1) | 0, f = o + ((p & 0 - (a & 1 ^ 1)) << 1) | 0, e = 0;
    do {
     if (i = (n | 0) == 0, l = (a | 0) != 0 & (n | 0) != 0, (d | 0) > 0) {
      h = 0;
      do {
       d = Lc(k[b + 312 + (h << 2) >> 2] | 0) | 0, c = k[b + 20 >> 2] | 0;
       do {
        if ((h | n | 0) == 0 | ((c | 0) == 0 | (h | 0) > (c | 0))) {
         if (i) {
          s = b + 32 + (h << 2) | 0, c = k[s >> 2] | 0, k[s >> 2] = c + d;
          break;
         }
         c = m[g + (0 - (k[b + 16 >> 2] | 0) << 1) >> 1] | 0, r = 14;
         break;
        }
        c = e, r = 14;
       } while (0);
       a: do if ((r | 0) == 14 && (r = 0, l)) switch (k[b + 24 >> 2] | 0) {
       case 2:
        c = m[f >> 1] | 0;
        break a;

       case 7:
        c = (m[f >> 1] | 0) + c >> 1;
        break a;

       case 4:
        c = (m[f >> 1] | 0) + c - (m[f + (0 - (k[b + 16 >> 2] | 0) << 1) >> 1] | 0) | 0;
        break a;

       case 5:
        c = ((m[f >> 1] | 0) - (m[f + (0 - (k[b + 16 >> 2] | 0) << 1) >> 1] | 0) >> 1) + c | 0;
        break a;

       case 3:
        c = m[f + (0 - (k[b + 16 >> 2] | 0) << 1) >> 1] | 0;
        break a;

       case 1:
        break a;

       case 6:
        c = (c - (m[f + (0 - (k[b + 16 >> 2] | 0) << 1) >> 1] | 0) >> 1) + (m[f >> 1] | 0) | 0;
        break a;

       default:
        c = 0;
        break a;
       } while (0);
       s = c + d | 0, j[g >> 1] = s, (s & 65535) >>> (k[q >> 2] | 0) && nc(), (h | 0) <= (k[b + 20 >> 2] | 0) && (e = m[g >> 1] | 0), g = g + 2 | 0, f = f + 2 | 0, h = h + 1 | 0, d = k[b + 16 >> 2] | 0;
      } while ((h | 0) < (d | 0));
      c = k[b + 12 >> 2] | 0;
     }
     n = n + 1 | 0;
    } while ((n | 0) < (c | 0));
   }
   return o + ((p & 0 - (a & 1)) << 1) | 0;
  }
  function Nd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0;
   if (n = r, r = r + 32 | 0, j[284] = 18761, j[65916] | 0) {
    l = 0;
    do {
     if (kb(k[140] | 0, (k[33062] | 0) + (l << 2) | 0, 0) | 0, e = k[140] | 0, g = k[33002] | 0, kb(e | 0, (rc() | 0) + g | 0, 0) | 0, k[75038] = 0, k[75040] = 0, k[75041] = 0, g = (l | 0) < 2 ? 7 : 4, k[n >> 2] = g, k[n + 4 >> 2] = g, k[n + 8 >> 2] = g, k[n + 12 >> 2] = g, j[65896] | 0) {
      i = 0;
      do {
       for (h = hd(1, 0) | 0, b = hd(2, 0) | 0, k[n + 16 >> 2] = b, a = hd(2, 0) | 0, k[n + 16 + 4 >> 2] = a, a = hd(2, 0) | 0, k[n + 16 + 8 >> 2] = a, a = hd(2, 0) | 0, k[n + 16 + 12 >> 2] = a, a = 0; ;) {
        if ((b | 0) == 2 ? (g = n + (a << 2) | 0, k[g >> 2] = (k[g >> 2] | 0) + -1) : (b | 0) == 3 ? (g = hd(4, 0) | 0, k[n + (a << 2) >> 2] = g) : (b | 0) == 1 && (g = n + (a << 2) | 0, k[g >> 2] = (k[g >> 2] | 0) + 1), a = a + 1 | 0, (a | 0) == 4) break;
        b = k[n + 16 + (a << 2) >> 2] | 0;
       }
       c = (i | 0) == 0, g = 0;
       do {
        f = k[n + ((g << 1 & 2 | g >> 3) << 2) >> 2] | 0, f = (hd(f, 0) | 0) << 32 - f >> 32 - f;
        do {
         if (!h) {
          if (a = j[65896] | 0, c) {
           e = 128, b = k[32946] | 0;
           break;
          }
          e = (g | -2) + i + (ka(a & 65535, l) | 0) | 0, b = k[32946] | 0, e = m[b + (e << 1) >> 1] | 0;
          break;
         }
         a = j[65896] | 0, e = g + i + (ka(a & 65535, ((g | -2) ^ 1) + l | 0) | 0) | 0, b = k[32946] | 0, e = m[b + (e << 1) >> 1] | 0;
        } while (0);
        d = a & 65535, b = b + (g + i + (ka(d, l) | 0) << 1) | 0, j[b >> 1] = e + f, g = (g | 0) == 14 ? 1 : g + 2 | 0;
       } while ((g | 0) < 16);
       i = i + 16 | 0;
      } while ((i | 0) < (d | 0));
      g = a;
     } else g = 0;
     l = l + 1 | 0, f = j[65916] | 0;
    } while ((l | 0) < (f & 65535 | 0));
    if (a = k[32946] | 0, (f & 65535) > 1) {
     e = 0;
     do {
      if (b = e | 1, (g & 65535) > 1) {
       c = g & 65535, d = 0;
       do l = a + ((ka(c, e) | 0) + (d | 1) << 1) | 0, h = a + ((ka(c, b) | 0) + d << 1) | 0, i = (m[h >> 1] | 0) + (m[l >> 1] | 0) | 0, j[l >> 1] = i, i = i - (m[h >> 1] | 0) | 0, j[h >> 1] = i, j[l >> 1] = (m[l >> 1] | 0) - i, d = d + 2 | 0; while ((d | 0) < (c + -1 | 0));
      }
      e = e + 2 | 0;
     } while ((e | 0) < ((f & 65535) + -1 | 0));
    }
   }
   r = n;
  }
  function Rf(a) {
   a = +a;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   i = r, r = r + 16 | 0, p[t >> 3] = a, b = k[t >> 2] | 0, c = k[t + 4 >> 2] | 0, d = Ig(b | 0, c | 0, 63) | 0;
   do if ((c & 2147483647) >>> 0 > 1078159481) {
    if ((c & 2147483647) >>> 0 > 2146435072 | (c & 2147483647 | 0) == 2146435072 & b >>> 0 > 0) return h = a, r = i, +h;
    if (d) return h = -1, r = i, +h;
    if (a > 709.782712893384) return h = a * 8.98846567431158e307, r = i, +h;
    g = 11;
   } else {
    if ((c & 2147483647) >>> 0 > 1071001154) {
     if ((c & 2147483647) >>> 0 >= 1072734898) {
      g = 11;
      break;
     }
     if (d) {
      a += .6931471803691238, d = -1, e = -1.9082149292705877e-10, g = 12;
      break;
     }
     a += -.6931471803691238, d = 1, e = 1.9082149292705877e-10, g = 12;
     break;
    }
    if ((c & 2147483647) >>> 0 < 1016070144) return (c & 2147483647) >>> 0 >= 1048576 ? (h = a, r = i, +h) : (o[i >> 2] = a, h = a, r = i, +h);
    h = a, f = 0, c = 0;
   } while (0);
   return (g | 0) == 11 && (c = ~~(a * 1.4426950408889634 + ((d | 0) != 0 ? -.5 : .5)), a -= +(c | 0) * .6931471803691238, d = c, e = +(c | 0) * 1.9082149292705877e-10, g = 12), (g | 0) == 12 && (f = a - e, h = f, f = a - f - e, c = d), e = h * .5, a = h * e, e = 3 - e * (a * (a * (a * (a * (4008217827329362e-21 - a * 2.0109921818362437e-7) + -793650757867488e-19) + .0015873015872548146) + -.03333333333333313) + 1), e = a * ((a * (a * (a * (a * (4008217827329362e-21 - a * 2.0109921818362437e-7) + -793650757867488e-19) + .0015873015872548146) + -.03333333333333313) + 1 - e) / (6 - h * e)), c ? (a = h * (e - f) - f - a, (c | 0) == 1 ? h < -.25 ? (h = (a - (h + .5)) * -2, r = i, +h) : (h = (h - a) * 2 + 1, r = i, +h) : (c | 0) == -1 ? (h = (h - a) * .5 + -.5, r = i, +h) : (d = Ng(c + 1023 | 0, 0, 52) | 0, g = O, k[t >> 2] = d, k[t + 4 >> 2] = g, e = +p[t >> 3], c >>> 0 > 56 ? (h = h - a + 1, h = ((c | 0) == 1024 ? h * 2 * 8.98846567431158e307 : e * h) + -1, r = i, +h) : (d = Ng(1023 - c | 0, 0, 52) | 0, b = O, (c | 0) < 20 ? (k[t >> 2] = d, k[t + 4 >> 2] = b, a = 1 - +p[t >> 3] + (h - a)) : (k[t >> 2] = d, k[t + 4 >> 2] = b, a = h - (+p[t >> 3] + a) + 1), h = e * a, r = i, +h))) : (h -= h * e - a, r = i, +h);
  }
  function Ic() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0;
   if (q = r, r = r + 272 | 0, Gc(k[32956] | 0, q + 264 | 0), p = Hc() | 0, p || (k[32952] = 1023), a = ka(m[65916] | 0, p) | 0, kb(k[140] | 0, ((ka(a, m[65896] | 0) | 0) / 4 | 0) + 540 | 0, 0) | 0, k[32954] = 1, k[74604] = 0, k[74606] = 0, k[74608] = 0, a = j[65916] | 0, a << 16 >> 16) {
    a &= 65535, b = 0, n = 0, o = 0;
    do {
     if (i = k[32946] | 0, g = m[65896] | 0, l = ka(g, o) | 0, f = a - o | 0, f = (ka(g, (f | 0) > 8 ? 8 : f) | 0) >> 6, g = (f | 0) > 0 ? f << 6 : 0, (f | 0) > 0) for (e = 0, h = n; ;) {
      Jg(q | 0, 0, 256) | 0, a = 0;
      do {
       if (c = k[q + 264 + (((a | 0) > 0 & 1) << 2) >> 2] | 0, c = Dc(m[c >> 1] | 0, c + 2 | 0) | 0, (a | 0) != 0 & (c | 0) == 0) break;
       (c | 0) != 255 && (a = (c >> 4) + a | 0, c & 15 && (d = Dc(c & 15, 0) | 0, d & 1 << (c & 15) + -1 || (d = (-1 << (c & 15)) + 1 + d | 0), (a | 0) < 64 && (k[q + (a << 2) >> 2] = d))), a = a + 1 | 0;
      } while ((a | 0) < 64);
      for (b = (k[q >> 2] | 0) + b | 0, k[q >> 2] = b, a = (e << 6) + l | 0, d = 0, c = h; ;) {
       if ((c | 0) % (m[65896] | 0) | 0 || (k[q + 256 + 4 >> 2] = 512, k[q + 256 >> 2] = 512), t = q + 256 + ((d & 1) << 2) | 0, s = (k[t >> 2] | 0) + (k[q + (d << 2) >> 2] | 0) | 0, k[t >> 2] = s, j[i + (a + d << 1) >> 1] = s, s & 64512 && nc(), d = d + 1 | 0, (d | 0) == 64) break;
       c = c + 1 | 0;
      }
      if (e = e + 1 | 0, (e | 0) == (f | 0)) break;
      h = h + 64 | 0;
     }
     if (n = n + g | 0, p) {
      if (h = vb(k[140] | 0) | 0, kb(k[140] | 0, ((ka(m[65896] | 0, o) | 0) / 4 | 0) + 26 | 0, 0) | 0, a = k[140] | 0, j[65896] | 0) for (g = 0, f = i + (l << 1) | 0; ;) {
       for (a = ib(a | 0) | 0, e = j[65896] | 0, c = f, d = 0; ;) {
        if (t = m[c >> 1] << 2 | a >> d & 3, j[c >> 1] = e << 16 >> 16 == 2672 & t >>> 0 < 512 ? t + 2 | 0 : t, d = d + 2 | 0, (d | 0) >= 8) break;
        c = c + 2 | 0;
       }
       if (g = g + 1 | 0, a = k[140] | 0, (g | 0) >= ((e & 65535) << 1 | 0)) break;
       f = f + 8 | 0;
      }
      kb(a | 0, h | 0, 0) | 0;
     }
     o = o + 8 | 0, a = m[65916] | 0;
    } while ((a | 0) > (o | 0));
   }
   vg(k[q + 264 >> 2] | 0), vg(k[q + 264 + 4 >> 2] | 0), r = q;
  }
  function ue() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0;
   q = r, r = r + 32784 | 0, p = (k[80] | 0) == 9 ? 6 : 16, te(1), l = 0;
   do {
    i = 0;
    do {
     h = jc(l, i) | 0, k[q >> 2] = 0, k[q + 4 >> 2] = 0, k[q + 8 >> 2] = 0, k[q + 12 >> 2] = 0, a = q + 16 + (l << 11) + (i << 7) + 4 | 0, g = -1;
     do {
      e = (g | 0) == 0 & 1, f = g + l | 0, d = -1;
      do b = ((d | 0) == 0 & 1) + e | 0, c = jc(f, d + i | 0) | 0, (c | 0) != (h | 0) && (o = ((ka(m[65844] | 0, g) | 0) + d << 2) + c | 0, k[a >> 2] = o, k[a + 4 >> 2] = b, k[a + 8 >> 2] = c, k[q + (c << 2) >> 2] = (k[q + (c << 2) >> 2] | 0) + (1 << b), a = a + 12 | 0), d = d + 1 | 0; while ((d | 0) != 2);
      g = g + 1 | 0;
     } while ((g | 0) != 2);
     if (o = q + 16 + (l << 11) + (i << 7) | 0, k[o >> 2] = (a - o >> 2 | 0) / 3 | 0, o = k[32932] | 0) {
      b = 0;
      do (b | 0) != (h | 0) && (k[a >> 2] = b, k[a + 4 >> 2] = 256 / (k[q + (b << 2) >> 2] | 0) | 0, a = a + 8 | 0), b = b + 1 | 0; while ((b | 0) != (o | 0));
     }
     i = i + 1 | 0;
    } while ((i | 0) != (p | 0));
    l = l + 1 | 0;
   } while ((l | 0) < (p | 0));
   if (e = k[32928] | 0, g = j[65840] | 0, ((g & 65535) + -1 | 0) > 1) {
    f = j[65844] | 0, n = 1;
    do {
     if (((f & 65535) + -1 | 0) > 1) {
      h = (n | 0) % (p | 0) | 0, l = 1;
      do {
       if (i = (ka(f & 65535, n) | 0) + l | 0, b = (l | 0) % (p | 0) | 0, k[q >> 2] = 0, k[q + 4 >> 2] = 0, k[q + 8 >> 2] = 0, k[q + 12 >> 2] = 0, c = k[q + 16 + (h << 11) + (b << 7) >> 2] | 0) for (a = c, d = q + 16 + (h << 11) + (b << 7) + 4 | 0; ;) {
        if (a = a + -1 | 0, s = q + (k[d + 8 >> 2] << 2) | 0, k[s >> 2] = (k[s >> 2] | 0) + ((m[e + (i << 3) + (k[d >> 2] << 1) >> 1] | 0) << k[d + 4 >> 2]), !a) break;
        d = d + 12 | 0;
       }
       if (o + -1 | 0) for (d = o + -1 | 0, a = q + 16 + ((h << 9) + (b << 5) + (c * 3 | 0) + 1 << 2) | 0; ;) {
        if (s = k[a >> 2] | 0, c = (ka(k[a + 4 >> 2] | 0, k[q + (s << 2) >> 2] | 0) | 0) >>> 8 & 65535, j[e + (i << 3) + (s << 1) >> 1] = c, d = d + -1 | 0, !d) break;
        a = a + 8 | 0;
       }
       l = l + 1 | 0;
      } while ((l | 0) != ((f & 65535) + -1 | 0));
     }
     n = n + 1 | 0;
    } while ((n | 0) != ((g & 65535) + -1 | 0));
   }
   r = q;
  }
  function Ed(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0;
   for (l = r, r = r + 784 | 0, e = vb(k[140] | 0) | 0, d = 0; ;) {
    if ((d | 0) >= (b + 3 & -4 | 0)) {
     d = 10;
     break;
    }
    if (c = ib(k[140] | 0) | 0, i[l + 16 + d >> 0] = c & 15, (c & 15) >>> 0 > 12) {
     d = 5;
     break;
    }
    if (i[l + 16 + (d | 1) >> 0] = c >>> 4 & 15, (c >>> 4 & 15) >>> 0 > 12) {
     d = 5;
     break;
    }
    d = d + 2 | 0;
   }
   if ((d | 0) == 5) if (kb(k[140] | 0, e | 0, 0) | 0, (b + 3 & -4 | 0) > 0) {
    f = 0;
    do {
     for (uc(l, 6), e = j[l >> 1] | 0, j[a + (f << 1) >> 1] = (m[l + 4 >> 1] | 0) >>> 12 << 4 | (e & 65535) >>> 12 << 8 | (m[l + 8 >> 1] | 0) >>> 12, j[a + ((f | 1) << 1) >> 1] = (m[l + 6 >> 1] | 0) >>> 12 << 4 | (m[l + 2 >> 1] | 0) >>> 12 << 8 | (m[l + 10 >> 1] | 0) >>> 12, d = f | 2, c = 0; ;) {
      if (j[a + (c + d << 1) >> 1] = e & 4095, c = c + 1 | 0, (c | 0) == 6) break;
      e = j[l + (c << 1) >> 1] | 0;
     }
     f = f + 8 | 0;
    } while ((f | 0) < (b + 3 & -4 | 0));
    c = 1;
   } else c = 1; else if ((d | 0) == 10) if (b + 3 & 4 ? (c = (ib(k[140] | 0) | 0) << 8, d = ib(k[140] | 0) | 0, c = Eg(d | 0, ((d | 0) < 0) << 31 >> 31 | 0, c | 0, ((c | 0) < 0) << 31 >> 31 | 0) | 0, d = O, e = 16) : (c = 0, d = 0, e = 0), (b + 3 & -4 | 0) > 0) for (h = 0; ;) {
    if (g = i[l + 16 + h >> 0] | 0, (e | 0) < (g & 255 | 0) && (f = ib(k[140] | 0) | 0, f = Ng(f | 0, ((f | 0) < 0) << 31 >> 31 | 0, e + 8 | 0) | 0, d = Eg(f | 0, O | 0, c | 0, d | 0) | 0, c = O, f = ib(k[140] | 0) | 0, f = Ng(f | 0, ((f | 0) < 0) << 31 >> 31 | 0, e | 0) | 0, c = Eg(f | 0, O | 0, d | 0, c | 0) | 0, d = O, f = ib(k[140] | 0) | 0, f = Ng(f | 0, ((f | 0) < 0) << 31 >> 31 | 0, e + 24 | 0) | 0, d = Eg(f | 0, O | 0, c | 0, d | 0) | 0, c = O, f = ib(k[140] | 0) | 0, f = Ng(f | 0, ((f | 0) < 0) << 31 >> 31 | 0, e + 16 | 0) | 0, c = Eg(f | 0, O | 0, d | 0, c | 0) | 0, d = O, e = e + 32 | 0), f = c & 65535 >>> (16 - (g & 255) | 0), c = Hg(c | 0, d | 0, g & 255 | 0) | 0, d = f & 1 << (g & 255) + -1 ? f : (-1 << (g & 255)) + 1 + f | 0, j[a + (h << 1) >> 1] = d, h = h + 1 | 0, (h | 0) == (b + 3 & -4 | 0)) {
     c = 0;
     break;
    }
    d = O, e = e - (g & 255) | 0;
   } else c = 0;
   return r = l, c | 0;
  }
  function Rc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0;
   n = r, r = r + 480 | 0;
   a: do if (j[65916] | 0) for (h = 0, i = 0; ;) {
    if (g = vb(k[140] | 0) | 0, (k[32992] | 0) >>> 0 < 2147483647 && (e = k[140] | 0, kb(e | 0, rc() | 0, 0) | 0), !(Jc(n + 4 | 0, 0) | 0)) break a;
    if (b = k[n + 4 + 12 >> 2] | 0, f = ka((k[80] | 0) == 0 ? 1 : k[n + 4 + 16 >> 2] | 0, b) | 0, a = k[32994] | 0, e = k[32990] | 0, e = (f >>> 0) / ((a >>> 0 < e >>> 0 ? a : e) >>> 0) | 0, a = k[n + 4 >> 2] | 0, (a | 0) == 195) {
     if (k[n + 4 + 8 >> 2] | 0) {
      b = 0, f = 0, a = 0;
      do {
       if (c = Mc(f, n + 4 | 0) | 0, k[n >> 2] = c, e) {
        c = k[32996] | 0, d = 0;
        do Pc(a + i | 0, b + h | 0, n), b = b + 1 | 0, b >>> 0 < c >>> 0 ? b >>> 0 >= (m[65896] | 0) >>> 0 && (l = 19) : l = 19, (l | 0) == 19 && (l = 0, b = 0, a = a + 1 | 0), d = d + 1 | 0; while (d >>> 0 < e >>> 0);
       }
       f = f + 1 | 0;
      } while (f >>> 0 < (k[n + 4 + 8 >> 2] | 0) >>> 0);
     }
    } else if ((a | 0) == 193 && (k[n + 4 + 32 >> 2] = 16384, k[74604] = 0, k[74606] = 0, k[74608] = 0, a = k[n + 4 + 8 >> 2] | 0, a >>> 0 > 7)) {
     f = 0;
     do {
      if (e = (f << 1) + i | 0, b >>> 0 > 7) {
       d = 0;
       do {
        Qc(n + 4 | 0), k[n >> 2] = n + 4 + 184, b = k[32996] | 0, a = ((d >>> 0) % (b >>> 0) | 0) + h | 0, b = e + ((d >>> 0) / (b >>> 0) | 0) | 0, c = 0;
        do o = b + c | 0, Pc(o, a, n), Pc(o, a + 1 | 0, n), Pc(o, a + 2 | 0, n), Pc(o, a + 3 | 0, n), Pc(o, a + 4 | 0, n), Pc(o, a + 5 | 0, n), Pc(o, a + 6 | 0, n), Pc(o, a + 7 | 0, n), c = c + 2 | 0; while (c >>> 0 < 16);
        d = d + 8 | 0, b = k[n + 4 + 12 >> 2] | 0;
       } while ((d | 7) >>> 0 < b >>> 0);
       a = k[n + 4 + 8 >> 2] | 0;
      }
      f = f + 8 | 0;
     } while ((f | 7) >>> 0 < a >>> 0);
    }
    if (kb(k[140] | 0, g + 4 | 0, 0) | 0, a = (k[32996] | 0) + h | 0, b = a >>> 0 < (m[65896] | 0) >>> 0, i = (b ? 0 : k[32992] | 0) + i | 0, Kc(n + 4 | 0), i >>> 0 >= (m[65916] | 0) >>> 0) break;
    h = b ? a : 0;
   } while (0);
   r = n;
  }
  function ne(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0;
   m = r, r = r + 144 | 0, f = 0;
   do {
    g = f + 3 | 0, p[m + (f * 48 | 0) >> 3] = 0, p[m + (f * 48 | 0) + 8 >> 3] = 0, p[m + (f * 48 | 0) + 16 >> 3] = 0, p[m + (f * 48 | 0) + 24 >> 3] = +((f | 0) == 0 | 0), p[m + (f * 48 | 0) + 32 >> 3] = +((g | 0) == 4 | 0), p[m + (f * 48 | 0) + 40 >> 3] = +((g | 0) == 5 | 0), g = 0;
    do {
     if (d = m + (f * 48 | 0) + (g << 3) | 0, (c | 0) > 0) {
      e = +p[d >> 3], i = 0;
      do e += +p[a + (i * 24 | 0) + (f << 3) >> 3] * +p[a + (i * 24 | 0) + (g << 3) >> 3], i = i + 1 | 0; while ((i | 0) != (c | 0));
      p[d >> 3] = e;
     }
     g = g + 1 | 0;
    } while ((g | 0) != 3);
    f = f + 1 | 0;
   } while ((f | 0) != 3);
   k = 0;
   do {
    e = +p[m + (k * 48 | 0) + (k << 3) >> 3], d = m + (k * 48 | 0) | 0, p[d >> 3] = +p[d >> 3] / e, f = m + (k * 48 | 0) + 8 | 0, p[f >> 3] = +p[f >> 3] / e, g = m + (k * 48 | 0) + 16 | 0, p[g >> 3] = +p[g >> 3] / e, i = m + (k * 48 | 0) + 24 | 0, p[i >> 3] = +p[i >> 3] / e, h = m + (k * 48 | 0) + 32 | 0, p[h >> 3] = +p[h >> 3] / e, j = m + (k * 48 | 0) + 40 | 0, p[j >> 3] = +p[j >> 3] / e, l = 0;
    do (l | 0) != (k | 0) && (e = +p[m + (l * 48 | 0) + (k << 3) >> 3], n = m + (l * 48 | 0) | 0, p[n >> 3] = +p[n >> 3] - e * +p[d >> 3], n = m + (l * 48 | 0) + 8 | 0, p[n >> 3] = +p[n >> 3] - e * +p[f >> 3], n = m + (l * 48 | 0) + 16 | 0, p[n >> 3] = +p[n >> 3] - e * +p[g >> 3], n = m + (l * 48 | 0) + 24 | 0, p[n >> 3] = +p[n >> 3] - e * +p[i >> 3], n = m + (l * 48 | 0) + 32 | 0, p[n >> 3] = +p[n >> 3] - e * +p[h >> 3], n = m + (l * 48 | 0) + 40 | 0, p[n >> 3] = +p[n >> 3] - e * +p[j >> 3]), l = l + 1 | 0; while ((l | 0) != 3);
    k = k + 1 | 0;
   } while ((k | 0) != 3);
   if ((c | 0) > 0) {
    h = 0;
    do {
     d = a + (h * 24 | 0) | 0, f = a + (h * 24 | 0) + 8 | 0, g = a + (h * 24 | 0) + 16 | 0, i = 0;
     do n = b + (h * 24 | 0) + (i << 3) | 0, p[n >> 3] = 0, e = +p[m + (i * 48 | 0) + 24 >> 3] * +p[d >> 3] + 0, p[n >> 3] = e, e += +p[m + (i * 48 | 0) + 32 >> 3] * +p[f >> 3], p[n >> 3] = e, p[n >> 3] = e + +p[m + (i * 48 | 0) + 40 >> 3] * +p[g >> 3], i = i + 1 | 0; while ((i | 0) != 3);
     h = h + 1 | 0;
    } while ((h | 0) != (c | 0));
   }
   r = m;
  }
  function le(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0;
   q = r, r = r + 32 | 0, k[q + 12 >> 2] = 0, k[q + 12 + 4 >> 2] = 0, k[q + 12 + 8 >> 2] = 0, p = Pb(a | 0, 323232) | 0;
   do if (p) {
    (ib(p | 0) | 0) == 80 && (ib(p | 0) | 0) == 53 ? (l = 0, g = 0, b = 0) : h = 5, (h | 0) == 5 && (l = 1, g = 0, b = 0);
    a: for (;;) {
     for (i = (g | 0) < 3, f = (l | 0) == 0 & i, e = q + 12 + (g << 2) | 0; ;) {
      c = 0;
      do {
       if (!f) {
        h = 16;
        break a;
       }
       if (d = ib(p | 0) | 0, (d | 0) == 35) c = 1; else if ((d | 0) == -1) break a;
       c = (d | 0) == 10 ? 0 : c;
      } while ((c | 0) != 0);
      if (b = (d + -48 | 0) >>> 0 < 10 ? 1 : b) {
       if ((d + -48 | 0) >>> 0 >= 10) break;
       k[e >> 2] = d + -48 + ((k[e >> 2] | 0) * 10 | 0);
      } else b = 0;
     }
     o = (Hf(d) | 0) == 0, l = o & 1, g = (o & 1 ^ 1) + g | 0, b = o ? b : 0;
    }
    if ((h | 0) == 16 && !((l | 0) != 0 | i)) {
     if (b = k[q + 12 >> 2] | 0, (b | 0) == (m[65844] | 0) && (k[q + 12 + 4 >> 2] | 0) == (m[65840] | 0) && (k[q + 12 + 8 >> 2] | 0) == 65535) {
      if (n = wg(b, 2) | 0, mc(n, 323304), j[65840] | 0) {
       b = j[65844] | 0, o = 0;
       do {
        if (Ga(n | 0, 2, b & 65535 | 0, p | 0) | 0, g = k[80] | 0, h = o << 1 & 14, i = k[32928] | 0, b = j[65844] | 0, b << 16 >> 16) {
         e = j[65848] | 0, f = j[65852] | 0, a = 0;
         do l = i + ((ka(o >> (e & 65535), f & 65535) | 0) + (a >> (e & 65535)) << 3) + ((g >>> ((a & 1 | h) << 1) & 3) << 1) | 0, c = j[l >> 1] | 0, d = Oa(j[n + (a << 1) >> 1] | 0) | 0, c = (c & 65535) > (d & 65535) ? (c & 65535) - (d & 65535) | 0 : 0, j[l >> 1] = c, a = a + 1 | 0; while ((a | 0) != (b & 65535 | 0));
        } else b = 0;
        o = o + 1 | 0;
       } while ((o | 0) < (m[65840] | 0));
      }
      vg(n), pb(p | 0) | 0, Jg(132256, 0, 8204) | 0, k[32950] = 0;
      break;
     }
     o = k[w >> 2] | 0, k[q + 8 >> 2] = a, Jb(o | 0, 323272, q + 8 | 0) | 0, pb(p | 0) | 0;
     break;
    }
    o = k[w >> 2] | 0, k[q >> 2] = a, Jb(o | 0, 323240, q | 0) | 0, pb(p | 0) | 0;
   } else cb(a | 0); while (0);
   r = q;
  }
  function mf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, q = 0, r = 0, s = 0;
   if (a = +p[20836], a != 1) {
    if (a < 1) {
     if (g = ~~(+(m[65840] | 0 | 0) / a + .5) & 65535, b = wg(m[65844] | 0, (g & 65535) << 3) | 0, mc(b, 614592), c = k[32928] | 0, l = k[32932] | 0, s = +p[20836], g << 16 >> 16) for (h = j[65844] | 0, o = 0, r = 0; ;) {
      if (d = ~~o, a = o - +(d | 0), e = ka(h & 65535, d) | 0, i = ka(h & 65535, r) | 0, h << 16 >> 16) for (n = 0, q = c + (e << 3) | 0, f = (d + 1 | 0) < (m[65840] | 0 | 0) ? c + (e << 3) + ((h & 65535) << 2 << 1) | 0 : c + (e << 3) | 0; ;) {
       if (d = i + n | 0, l) {
        e = 0;
        do j[b + (d << 3) + (e << 1) >> 1] = ~~((1 - a) * +(m[q + (e << 1) >> 1] | 0 | 0) + a * +(m[f + (e << 1) >> 1] | 0 | 0) + .5), e = e + 1 | 0; while ((e | 0) != (l | 0));
       }
       if (n = n + 1 | 0, (n | 0) == (h & 65535 | 0)) break;
       q = q + 8 | 0, f = f + 8 | 0;
      }
      if (r = r + 1 | 0, (r | 0) == (g & 65535 | 0)) break;
      o += s;
     }
     j[65840] = g;
    } else {
     if (l = ~~(a * +(m[65844] | 0 | 0) + .5) & 65535, b = wg(m[65840] | 0, (l & 65535) << 3) | 0, mc(b, 614592), c = k[32928] | 0, n = k[32932] | 0, a = 1 / +p[20836], l << 16 >> 16) for (i = j[65844] | 0, h = j[65840] | 0, q = 0, s = 0; ;) {
      if (d = ~~s, o = s - +(d | 0), h << 16 >> 16) for (r = c + (d << 3) | 0, f = (d + 1 | 0) < (i & 65535 | 0) ? c + (d << 3) + 8 | 0 : c + (d << 3) | 0, g = 0; ;) {
       if (d = (ka(g, l & 65535) | 0) + q | 0, n) {
        e = 0;
        do j[b + (d << 3) + (e << 1) >> 1] = ~~((1 - o) * +(m[r + (e << 1) >> 1] | 0 | 0) + o * +(m[f + (e << 1) >> 1] | 0 | 0) + .5), e = e + 1 | 0; while ((e | 0) != (n | 0));
       }
       if (g = g + 1 | 0, (g | 0) == (h & 65535 | 0)) break;
       r = r + ((i & 65535) << 2 << 1) | 0, f = f + ((i & 65535) << 2 << 1) | 0;
      }
      if (q = q + 1 | 0, (q | 0) == (l & 65535 | 0)) break;
      s += a;
     }
     j[65844] = l;
    }
    vg(c), k[32928] = b;
   }
  }
  function Ne(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0;
   if (m = r, r = r + 32 | 0, k[m + 12 >> 2] = k[147052], k[m + 12 + 4 >> 2] = k[147053], k[m + 12 + 8 >> 2] = k[147054], b = pc() | 0, (b + -1 & 65535) <= 1023) for (i = b & 65535, b = -2, d = 6500; ;) {
    if (i = i + -1 | 0, De(a, m + 24 | 0, m, m + 4 | 0, m + 8 | 0), l = k[m + 24 >> 2] | 0, (l | 0) == 1020 ? (b = sc(k[m >> 2] | 0) | 0, c = k[m + 4 >> 2] | 0, h = d) : (c = k[m + 4 >> 2] | 0, (l | 0) == 1021 & (c | 0) == 72 && (kb(k[140] | 0, 40, 1) | 0, f = 2048 / +((pc() | 0) & 65535 | 0), o[33004] = f, f = 2048 / +((pc() | 0) & 65535 | 0), o[33005] = f, f = 2048 / +((pc() | 0) & 65535 | 0), o[33006] = f, b = -2), h = (l | 0) == 2118 ? sc(k[m >> 2] | 0) | 0 : d), d = (b | 0) > -1, d & (l | 0) == (b + 2120 | 0) && (g = k[m >> 2] | 0, f = 2048 / +tc(g), o[33004] = f, f = 2048 / +tc(g), o[33005] = f, f = 2048 / +tc(g), o[33006] = f), (l | 0) == (b + 2130 | 0) && (g = k[m >> 2] | 0, f = +tc(g), o[m + 12 >> 2] = f, f = +tc(g), o[m + 12 + 4 >> 2] = f, f = +tc(g), o[m + 12 + 8 >> 2] = f), d & (l | 0) == (b + 2140 | 0)) {
     d = k[m >> 2] | 0, e = +(h | 0) / 100, f = +$(+e, 3), g = 0;
     do n = +tc(d) + 0, n += +tc(d) * e, n += +tc(d) * (e * e), n += +tc(d) * f, o[132016 + (g << 2) >> 2] = 2048 / (n * +o[m + 12 + (g << 2) >> 2]), g = g + 1 | 0; while ((g | 0) != 3);
    }
    if ((l | 0) == 2317 ? Me(c) : (l | 0) == 64013 ? b = ib(k[140] | 0) | 0 : (l | 0) == 6020 && (n = +((sc(k[m >> 2] | 0) | 0) >>> 0), o[41344] = n), b >>> 0 < 7 && (l | 0) == (k[588224 + (b << 2) >> 2] | 0) && (n = +((rc() | 0) >>> 0), o[33004] = n, n = +((rc() | 0) >>> 0), o[33005] = n, n = +((rc() | 0) >>> 0), o[33006] = n), (l | 0) == 64020 ? (g = (sc(k[m >> 2] | 0) | 0) + 1 & 65534, j[65840] = g) : (l | 0) == 64019 && (g = (sc(k[m >> 2] | 0) | 0) & 65535, j[65844] = g), kb(k[140] | 0, k[m + 8 >> 2] | 0, 0) | 0, !i) break;
    d = h;
   }
   r = m;
  }
  function od() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0;
   n = ka(m[65896] | 0, k[32998] | 0) | 0, o = k[32962] | 0, i = j[65916] | 0, l = (ka(((i & 65535) + 1 | 0) >>> 1, 0 - ((o & 1 | 0) == 0 ? (n >>> 3 & o >>> 7) + (n >>> 3) | 0 : ((n >>> 3 & o >>> 7) + (n >>> 3) << 4 | 0) / 15 | 0) | 0) | 0) & -2048;
   a: do if (i << 16 >> 16) for (d = 0, f = 0, c = o, h = 0, b = 0; ;) {
    do if (c & 2) {
     if (a = (((h | 0) % (((i & 65535) + 1 | 0) >>> 1 | 0) | 0) << 1) + ((h | 0) / (((i & 65535) + 1 | 0) >>> 1 | 0) | 0) | 0, !((c & 4 | 0) == 0 | (a | 0) != 1)) {
      if (a = k[140] | 0, k[32956] | 0) {
       kb(a | 0, (k[33002] | 0) - l | 0, 0) | 0, a = 1, e = 0;
       break;
      }
      kb(a | 0, 0, 2) | 0, a = k[140] | 0, kb(a | 0, (vb(a | 0) | 0) >> 3 << 2 | 0, 0) | 0, a = 1, e = 0;
      break;
     }
     e = b;
    } else a = h, e = b; while (0);
    if (b = j[65896] | 0, b << 16 >> 16) {
     g = 0;
     do {
      if (c = k[32998] | 0, e = e - c | 0, (e | 0) < 0) {
       b = f;
       do {
        d = Ng(d | 0, b | 0, (o & 24) + 8 | 0) | 0, b = O, c = 0;
        do d = (ib(k[140] | 0) | 0) << c | d, c = c + 8 | 0; while ((c | 0) < ((o & 24) + 8 | 0));
        e = e + ((o & 24) + 8) | 0;
       } while ((e | 0) < 0);
       c = k[32998] | 0, f = b, b = j[65896] | 0;
      }
      p = 64 - c | 0, c = Ng(d | 0, f | 0, p - e | 0) | 0, p = Ig(c | 0, O | 0, p | 0) | 0, b = ka(b & 65535, a) | 0, c = k[32962] | 0, j[(k[32946] | 0) + ((c >>> 6 & 1 ^ g) + b << 1) >> 1] = p, (c & 1 | 0) != 0 & ((g | 0) % 10 | 0 | 0) == 9 && ib(k[140] | 0) | 0 && (a | 0) < ((m[168] | 0) + (m[65840] | 0) | 0) && (g | 0) < ((m[164] | 0) + (m[65844] | 0) | 0) && nc(), g = g + 1 | 0, b = j[65896] | 0;
     } while ((g | 0) < (b & 65535 | 0));
     b = f;
    } else b = f;
    if (a = h + 1 | 0, (a | 0) >= (m[65916] | 0 | 0)) break a;
    f = b, c = k[32962] | 0, h = a, b = n - ((n >>> 3 & o >>> 7) + (n >>> 3) << 3) + e | 0;
   } while (0);
  }
  function Qc(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   if (h = r, r = r + 768 | 0, +o[74780] == 0) {
    b = 0;
    do e = +aa(+(+(b & 31 | 0) * 3.141592653589793 * .0625)) * .5, o[299120 + (b << 2) >> 2] = e, b = b + 1 | 0; while ((b | 0) != 106);
   }
   for (Jg(h | 0, 0, 768) | 0, b = Lc(k[a + 312 >> 2] | 0) | 0, b = ka(m[a + 56 >> 1] | 0, b) | 0, b = b + (k[a + 32 >> 2] | 0) | 0, k[a + 32 >> 2] = b, o[h >> 2] = +(b | 0), b = 1; ;) {
    if (c = k[a + 376 >> 2] | 0, c = Dc(m[c >> 1] | 0, c + 2 | 0) | 0, d = (c >> 4) + b | 0, (c & 15 | 0) == 0 & (c >> 4 | 0) < 15) {
     b = 0;
     break;
    }
    if (b = Dc(c & 15, 0) | 0, b & 1 << (c & 15) + -1 || (b = (-1 << (c & 15)) + 1 + b | 0), e = +(ka(m[a + 56 + (d << 1) >> 1] | 0, b) | 0), o[h + ((l[299544 + d >> 0] | 0) << 2) >> 2] = e, b = d + 1 | 0, (b | 0) >= 64) {
     b = 0;
     break;
    }
   }
   do g = h + (b << 2) | 0, o[g >> 2] = +o[g >> 2] * .7071067811865476, b = b + 1 | 0; while ((b | 0) != 8);
   b = 0;
   do g = h + (b << 5) | 0, o[g >> 2] = +o[g >> 2] * .7071067811865476, b = b + 1 | 0; while ((b | 0) != 8);
   f = 0;
   do {
    g = 0;
    do {
     b = g << 1 | 1, c = h + 256 + (f << 5) + (g << 2) | 0, e = +o[c >> 2], d = 0;
     do i = 299120 + ((ka(d, b) | 0) << 2) | 0, e += +o[h + (f << 5) + (d << 2) >> 2] * +o[i >> 2], o[c >> 2] = e, d = d + 1 | 0; while ((d | 0) != 8);
     g = g + 1 | 0;
    } while ((g | 0) != 8);
    f = f + 1 | 0;
   } while ((f | 0) != 8);
   f = 0;
   do {
    b = f << 1 | 1, g = 0;
    do {
     c = h + 512 + (f << 5) + (g << 2) | 0, e = +o[c >> 2], d = 0;
     do i = 299120 + ((ka(d, b) | 0) << 2) | 0, e += +o[h + 256 + (d << 5) + (g << 2) >> 2] * +o[i >> 2], o[c >> 2] = e, d = d + 1 | 0; while ((d | 0) != 8);
     g = g + 1 | 0;
    } while ((g | 0) != 8);
    f = f + 1 | 0;
   } while ((f | 0) != 8);
   b = 0;
   do i = ~~(+o[h + 512 + (b << 2) >> 2] + .5), i = (i | 0) < 65535 ? i : 65535, j[a + 184 + (b << 1) >> 1] = (i | 0) < 0 ? 0 : i & 65535, b = b + 1 | 0; while ((b | 0) != 64);
   r = h;
  }
  function Gd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0;
   if (v = r, r = r + 784 | 0, k[32928] | 0 && (a = j[65840] | 0, a << 16 >> 16)) {
    b = j[65844] | 0, u = 0;
    do {
     if (b << 16 >> 16) {
      a = b & 65535, t = 0;
      do {
       if (a = a - t | 0, a = (a | 0) > 128 ? 128 : a, Ed(v + 16 | 0, a * 3 | 0) | 0, k[v + 12 >> 2] = 0, k[v + 4 >> 2] = 0, (a | 0) > 0) for (i = v + 16 | 0, n = 0, o = 0, p = 0; ;) {
        for (n = (j[i + 8 >> 1] | 0) + n | 0, o = (j[i + 10 >> 1] | 0) + o | 0, c = n + 2 + o >> 2, d = n - c | 0, e = o - c | 0, f = p + t | 0, l = i, q = 0; ;) {
         for (g = q + u | 0, m = l, s = 0; ;) {
          if (h = (j[m >> 1] | 0) + (k[v + (q << 3) + ((s ^ 1) << 2) >> 2] | 0) | 0, k[v + (q << 3) + (s << 2) >> 2] = h, h >>> 0 > 1023 && nc(), b = j[65844] | 0, w = f + s + (ka(b & 65535, g) | 0) | 0, x = k[32928] | 0, y = (e + h | 0) < 4095 ? e + h | 0 : 4095, j[x + (w << 3) >> 1] = j[576 + (((y | 0) < 0 ? 0 : y) << 1) >> 1] | 0, y = (h - c | 0) < 4095 ? h - c | 0 : 4095, j[x + (w << 3) + 2 >> 1] = j[576 + (((y | 0) < 0 ? 0 : y) << 1) >> 1] | 0, h = (d + h | 0) < 4095 ? d + h | 0 : 4095, j[x + (w << 3) + 4 >> 1] = j[576 + (((h | 0) < 0 ? 0 : h) << 1) >> 1] | 0, s = s + 1 | 0, (s | 0) == 2) break;
          m = m + 2 | 0;
         }
         if (q = q + 1 | 0, (q | 0) == 2) break;
         l = l + 4 | 0;
        }
        if (p = p + 2 | 0, (p | 0) >= (a | 0)) break;
        i = i + 12 | 0;
       } else b = j[65844] | 0;
       t = t + 128 | 0, a = b & 65535;
      } while ((a | 0) > (t | 0));
      a = j[65840] | 0;
     } else b = 0;
     u = u + 2 | 0;
    } while ((u | 0) < (a & 65535 | 0));
   }
   r = v;
  }
  function Ae() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, n = 0, o = 0, p = 0, q = 0;
   if (q = r, r = r + 48 | 0, i = k[46] | 0, n = k[32928] | 0, (i | 0) >= 1) for (g = j[65844] | 0, h = j[65840] | 0, p = 1; ;) {
    o = 0;
    do {
     if (a = ka(h & 65535, g & 65535) | 0) {
      b = n;
      do j[b + 6 >> 1] = j[b + (o << 1) >> 1] | 0, b = b + 8 | 0; while (b >>> 0 < (n + (a << 3) | 0) >>> 0);
     }
     if ((g & 65535 | 0) < (ka((h & 65535) + -1 | 0, g & 65535) | 0)) {
      c = g & 65535, f = n + ((g & 65535) << 3) | 0;
      do {
       if ((((f - n >> 3) + 1 | 0) % (c | 0) | 0 | 0) >= 2) {
        if (a = 0 - c | 0, (c | 0) < (a | 0)) e = 0; else for (b = 0; ;) {
         if (e = a + -1 | 0, k[q + (b << 2) >> 2] = (m[f + (e << 3) + 6 >> 1] | 0) - (m[f + (e << 3) + 2 >> 1] | 0), k[q + (b + 1 << 2) >> 2] = (m[f + (a << 3) + 6 >> 1] | 0) - (m[f + (a << 3) + 2 >> 1] | 0), e = a + 1 | 0, k[q + (b + 2 << 2) >> 2] = (m[f + (e << 3) + 6 >> 1] | 0) - (m[f + (e << 3) + 2 >> 1] | 0), (a | 0) > 0) {
          e = 0;
          break;
         }
         a = c + a | 0, b = b + 3 | 0;
        }
        do a = q + ((l[586240 + e >> 0] | 0) << 2) | 0, b = k[a >> 2] | 0, c = q + ((l[586240 + (e | 1) >> 0] | 0) << 2) | 0, d = k[c >> 2] | 0, (b | 0) > (d | 0) && (k[a >> 2] = d + b, b = d + b - (k[c >> 2] | 0) | 0, k[c >> 2] = b, k[a >> 2] = (k[a >> 2] | 0) - b), e = e + 2 | 0; while (e >>> 0 < 38);
        e = (m[f + 2 >> 1] | 0) + (k[q + 16 >> 2] | 0) | 0, e = (e | 0) < 65535 ? e : 65535, j[f + (o << 1) >> 1] = (e | 0) < 0 ? 0 : e & 65535;
       }
       f = f + 8 | 0, c = g & 65535;
      } while (f >>> 0 < (n + ((ka((h & 65535) + -1 | 0, c) | 0) << 3) | 0) >>> 0);
     }
     o = o + 2 | 0;
    } while ((o | 0) < 3);
    if ((p | 0) == (i | 0)) break;
    p = p + 1 | 0;
   }
   r = q;
  }
  function Tc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (g = r, r = r + 8272 | 0, k[g >> 2] = 0, k[g + 4 >> 2] = 0, kb(k[140] | 0, k[33e3] | 0, 0) | 0, f = pc() | 0, kb(k[140] | 0, 12, 1) | 0, (f & 65535) + 12 & 15) {
    a = 0;
    do e = pc() | 0, j[g + 8208 + (a << 1) >> 1] = e, a = a + 1 | 0; while ((a | 0) != ((f & 65535) + 12 & 15 | 0));
    a = 0;
    do e = (ib(k[140] | 0) | 0) & 65535, j[g + 8208 + 30 + (a << 1) >> 1] = e, a = a + 1 | 0; while ((a | 0) != ((f & 65535) + 12 & 15 | 0));
    d = 0;
    do {
     if (a = m[g + 8208 + (d << 1) >> 1] | 0, b = m[g + 8208 + 30 + (d << 1) >> 1] | 0, c = (b << 8 | d) & 65535, a >>> 0 <= (a + 4095 + (4096 >>> b) & 4095) >>> 0) {
      e = a;
      do h = e, e = e + 1 | 0, j[g + 8 + (e << 1) >> 1] = c; while ((h | 0) < (a + 4095 + (4096 >>> b) & 4095 | 0));
     }
     d = d + 1 | 0;
    } while ((d | 0) != ((f & 65535) + 12 & 15 | 0));
    e = g;
   } else e = g;
   if (j[g + 8 >> 1] = 12, kb(k[140] | 0, k[33002] | 0, 0) | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, a = j[65916] | 0, a << 16 >> 16) {
    b = j[65896] | 0, f = 0;
    do {
     if (c = f & 1, b << 16 >> 16) {
      d = 0;
      do a = Lc(g + 8 | 0) | 0, (d | 0) < 2 ? (h = e + (c << 2) + (d << 1) | 0, a = (m[h >> 1] | 0) + a & 65535, j[h >> 1] = a, j[g + 8204 + (d << 1) >> 1] = a, a = j[g + 8204 + ((d & 1) << 1) >> 1] | 0) : (h = g + 8204 + ((d & 1) << 1) | 0, a = (m[h >> 1] | 0) + a & 65535, j[h >> 1] = a), b = j[65896] | 0, h = (ka(b & 65535, f) | 0) + d | 0, j[(k[32946] | 0) + (h << 1) >> 1] = a, (a & 65535) >>> (k[32998] | 0) && (nc(), b = j[65896] | 0), d = d + 1 | 0; while ((d | 0) < (b & 65535 | 0));
      a = j[65916] | 0;
     } else b = 0;
     f = f + 1 | 0;
    } while ((f | 0) < (a & 65535 | 0));
   }
   r = g;
  }
  function Ie(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0;
   e = r, r = r + 16 | 0, d = qg(132032, 587704, 7) | 0, d = (d | 0) == 0 & (k[41502] | 0) >>> 0 < 3, b = pc() | 0;
   a: do if (b << 16 >> 16) for (b &= 65535; ;) {
    b = b + -1 | 0, De(a, e + 12 | 0, e, e + 4 | 0, e + 8 | 0);
    do switch (k[e + 12 >> 2] | 0) {
    case 37500:
     Fe(a, 0);
     break;

    case 40963:
     d && (f = (rc() | 0) & 65535, j[65916] = f);
     break;

    case 36868:
    case 36867:
     He(0);
     break;

    case 37378:
     c = +Qf(+tc(k[e >> 2] | 0) * .5), o[41346] = c;
     break;

    case 34855:
     c = +((pc() | 0) & 65535), o[41344] = c;
     break;

    case 41730:
     (rc() | 0) == 131074 && (k[41506] = 0, f = ka(ib(k[140] | 0) | 0, 16843009) | 0, k[41506] = f | k[41506], f = ka(ib(k[140] | 0) | 0, 67372036) | 0, k[41506] = f | k[41506], f = ka(ib(k[140] | 0) | 0, 269488144) | 0, k[41506] = f | k[41506], f = ka(ib(k[140] | 0) | 0, 1077952576) | 0, k[41506] = f | k[41506]);
     break;

    case 37386:
     c = +tc(k[e >> 2] | 0), o[41504] = c;
     break;

    case 37377:
     c = +tc(k[e >> 2] | 0), c > -128 && (c = +Qf(-c), o[41348] = c, o[165480 + (((k[41502] | 0) + -1 | 0) * 48 | 0) + 44 >> 2] = c);
     break;

    case 40962:
     d && (f = (rc() | 0) & 65535, j[65896] = f);
     break;

    case 33434:
     c = +tc(k[e >> 2] | 0), o[41348] = c, o[165480 + (((k[41502] | 0) + -1 | 0) * 48 | 0) + 44 >> 2] = c;
     break;

    case 33437:
     c = +tc(k[e >> 2] | 0), o[41346] = c;
    } while (0);
    if (kb(k[140] | 0, k[e + 8 >> 2] | 0, 0) | 0, !b) break a;
   } while (0);
   r = e;
  }
  function rg(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0;
   if (c = k[a + 4 >> 2] | 0, c >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = c + 1, c = l[c >> 0] | 0) : c = Nf(a) | 0, (c | 0) == 43 | (c | 0) == 45 ? (d = (c | 0) == 45 & 1, c = k[a + 4 >> 2] | 0, c >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = c + 1, c = l[c >> 0] | 0) : c = Nf(a) | 0, (b | 0) != 0 & (c + -48 | 0) >>> 0 > 9 && k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1)) : d = 0, (c + -48 | 0) >>> 0 > 9) return k[a + 100 >> 2] | 0 ? (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1, f = -2147483648, a = 0, O = f, a | 0) : (f = -2147483648, a = 0, O = f, a | 0);
   f = 0;
   do f = c + -48 + (f * 10 | 0) | 0, c = k[a + 4 >> 2] | 0, c >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = c + 1, c = l[c >> 0] | 0) : c = Nf(a) | 0, e = (c + -48 | 0) >>> 0 < 10; while (e & (f | 0) < 214748364);
   if (b = ((f | 0) < 0) << 31 >> 31, e) {
    e = f;
    do b = Tg(e | 0, b | 0, 10, 0) | 0, e = O, c = Eg(c | 0, ((c | 0) < 0) << 31 >> 31 | 0, -48, -1) | 0, e = Eg(c | 0, O | 0, b | 0, e | 0) | 0, b = O, c = k[a + 4 >> 2] | 0, c >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = c + 1, c = l[c >> 0] | 0) : c = Nf(a) | 0; while ((c + -48 | 0) >>> 0 < 10 & ((b | 0) < 21474836 | (b | 0) == 21474836 & e >>> 0 < 2061584302));
   } else e = f;
   if ((c + -48 | 0) >>> 0 < 10) do c = k[a + 4 >> 2] | 0, c >>> 0 < (k[a + 100 >> 2] | 0) >>> 0 ? (k[a + 4 >> 2] = c + 1, c = l[c >> 0] | 0) : c = Nf(a) | 0; while ((c + -48 | 0) >>> 0 < 10);
   return k[a + 100 >> 2] | 0 && (k[a + 4 >> 2] = (k[a + 4 >> 2] | 0) + -1), d = (d | 0) != 0, a = Bg(0, 0, e | 0, b | 0) | 0, f = d ? O : b, a = d ? a : e, O = f, a | 0;
  }
  function Re() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (h = r, r = r + 16 | 0, g = k[140] | 0, b = k[96] | 0, e = Ef(b, 46) | 0, a = Ef(b, 47) | 0, a || (a = Ef(b, 92) | 0), c = (a | 0) == 0 ? b + -1 | 0 : a, e && (Cg(e | 0) | 0) == 4 && (e - (c + 1) | 0) == 8) {
    d = ug((Cg(b | 0) | 0) + 1 | 0) | 0, mc(d, 588296), Og(d | 0, k[96] | 0) | 0, f = k[96] | 0, a = d + (c + 1 - f) | 0;
    a: do if (ng(e, 588320) | 0) b = d + (e - f) | 0, e = (If(i[e + 1 >> 0] | 0) | 0) != 0, e = e ? 588328 : 588320, i[b >> 0] = i[e >> 0] | 0, i[b + 1 >> 0] = i[e + 1 >> 0] | 0, i[b + 2 >> 0] = i[e + 2 >> 0] | 0, i[b + 3 >> 0] = i[e + 3 >> 0] | 0, i[b + 4 >> 0] = i[e + 4 >> 0] | 0, ((i[c + 1 >> 0] | 0) + -48 | 0) >>> 0 < 10 && (e = l[c + 5 >> 0] | l[c + 5 + 1 >> 0] << 8 | l[c + 5 + 2 >> 0] << 16 | l[c + 5 + 3 >> 0] << 24, i[a >> 0] = e, i[a + 1 >> 0] = e >> 8, i[a + 2 >> 0] = e >> 16, i[a + 3 >> 0] = e >> 24, e = d + (c + 1 - f + 4) | 0, c = l[c + 1 >> 0] | l[c + 1 + 1 >> 0] << 8 | l[c + 1 + 2 >> 0] << 16 | l[c + 1 + 3 >> 0] << 24, i[e >> 0] = c, i[e + 1 >> 0] = c >> 8, i[e + 2 >> 0] = c >> 16, i[e + 3 >> 0] = c >> 24); else if (a = i[d + (e - f + -1) >> 0] | 0, ((a << 24 >> 24) + -48 | 0) >>> 0 < 10) {
     for (b = d + (e - f + -1) | 0; ;) {
      if (a << 24 >> 24 != 57) break;
      if (i[b >> 0] = 48, b = b + -1 | 0, a = i[b >> 0] | 0, ((a << 24 >> 24) + -48 | 0) >>> 0 >= 10) break a;
     }
     i[b >> 0] = a + 1 << 24 >> 24;
    } while (0);
    og(d, f) | 0 && (f = Pb(d | 0, 323232) | 0, k[140] = f, f && (Oe(12) | 0, k[41342] = 0, k[32994] = 1, pb(k[140] | 0) | 0)), k[41306] | 0 || (f = k[w >> 2] | 0, k[h >> 2] = d, Jb(f | 0, 588336, h | 0) | 0), vg(d), k[140] = g;
   }
   r = h;
  }
  function $d() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, o = 0;
   if (h = r, r = r + 544 | 0, k[h >> 2] = 33554944, k[h + 4 >> 2] = 33554944, kb(k[140] | 0, k[33e3] | 0, 0) | 0, a = rc() | 0, rc() | 0, rc() | 0, f = rc() | 0, g = rc() | 0, (a | 0) == 2) {
    if (Ga(k[41266] | 0, 1, k[33050] | 0, k[140] | 0) | 0, d = k[33050] | 0) {
     c = k[41266] | 0, a = g, b = 0;
     do a = (((a * 1597 | 0) + 51749 | 0) >>> 0) % 244944 | 0, f = Tg(a | 0, 0, 301593171, 0) | 0, f = Ig(f | 0, O | 0, 24) | 0, g = c + b | 0, i[g >> 0] = ((((a << 8) - f | 0) >>> 1) + f | 0) >>> 17 ^ (l[g >> 0] | 0), b = b + 1 | 0; while ((b | 0) != (d | 0));
    }
   } else if ((a | 0) == 4) {
    if (vg(k[41266] | 0), e = (ka(f * 3 | 0, g) | 0) >>> 1, k[33050] = e, e = ug(e) | 0, k[41266] = e, mc(e, 322640), Zd(h + 20 | 0), rc() | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, g) {
     a = 0, e = 0;
     do {
      if (b = e & 1, f) {
       c = 0;
       do d = Lc(h + 20 | 0) | 0, c >>> 0 < 2 ? (n = h + (b << 2) + (c << 1) | 0, d = (m[n >> 1] | 0) + d & 65535, j[n >> 1] = d, j[h + 16 + (c << 1) >> 1] = d, d = c & 1) : (n = c & 1, j[h + 16 + (n << 1) >> 1] = (m[h + 16 + (n << 1) >> 1] | 0) + d, d = n), d && (o = j[h + 16 >> 1] | 0, n = k[41266] | 0, i[n + a >> 0] = (o & 65535) >>> 4, d = j[h + 16 + 2 >> 1] | 0, i[n + (a + 1) >> 0] = (d & 65535) >>> 8 | (o & 65535) << 4, i[n + (a + 2) >> 0] = d, a = a + 3 | 0), c = c + 1 | 0; while ((c | 0) != (f | 0));
      }
      e = e + 1 | 0;
     } while ((e | 0) != (g | 0));
    }
   } else o = k[w >> 2] | 0, k[h + 8 >> 2] = k[96], k[h + 8 + 4 >> 2] = a, Jb(o | 0, 322664, h + 8 | 0) | 0;
   r = h;
  }
  function Yd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0;
   if (h = r, r = r + 2064 | 0, uc(h + 16 | 0, 1024), k[32962] | 0 || Wd(1024, 0), j[65840] | 0) {
    a = -1, b = 0, g = 0;
    do {
     if (k[h >> 2] = 0, k[h + 4 >> 2] = 0, k[h + 8 >> 2] = 0, k[32962] | a || (jg(132098) | 0) < 14 && rc() | 0, j[65844] | 0) {
      d = 0, e = 0, c = 0, a = 0, f = 0;
      do {
       if (k[32962] | 0) b = rc() | 0, d = d + (j[h + 16 + ((b & 1023) << 1) >> 1] | 0) | 0, k[h + 8 >> 2] = d, e = e + (j[h + 16 + ((b >>> 10 & 1023) << 1) >> 1] | 0) | 0, k[h + 4 >> 2] = e, c = c + (j[h + 16 + ((b >>> 20 & 1023) << 1) >> 1] | 0) | 0, k[h >> 2] = c; else {
        d = 0;
        do {
         if (k[35120] | 0) {
          c = 140480;
          do a = a + 31 & 31, (a | 0) == 31 && (b = (ib(k[140] | 0) | 0) + (b << 8) << 8, b = (ib(k[140] | 0) | 0) + b << 8, b = (ib(k[140] | 0) | 0) + b << 8, b = (ib(k[140] | 0) | 0) + b | 0), c = k[c + ((b >>> a & 1) << 2) >> 2] | 0; while ((k[c >> 2] | 0) != 0);
         } else c = 140480;
         i = h + (d << 2) | 0, e = (k[i >> 2] | 0) + (j[h + 16 + (k[c + 8 >> 2] << 1) >> 1] | 0) | 0, k[i >> 2] = e, (e + -65536 | 0) >>> 0 < 4294836224 && nc(), d = d + 1 | 0;
        } while ((d | 0) != 3);
        c = k[h >> 2] | 0, e = k[h + 4 >> 2] | 0, d = k[h + 8 >> 2] | 0;
       }
       n = k[32928] | 0, i = m[65844] | 0, l = (ka(i, g) | 0) + f | 0, j[n + (l << 3) >> 1] = c, j[n + (l << 3) + 2 >> 1] = e, j[n + (l << 3) + 4 >> 1] = d, f = f + 1 | 0;
      } while ((f | 0) < (i | 0));
     } else a = 0;
     g = g + 1 | 0;
    } while ((g | 0) < (m[65840] | 0));
   }
   r = h;
  }
  function te(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0, u = 0, v = 0;
   if (u = r, r = r + 32 | 0, t = j[65840] | 0, t << 16 >> 16) for (s = j[65844] | 0, b = s, q = 0; ;) {
    if (o = q >>> 0 < a >>> 0, p = q + -1 | 0, b << 16 >> 16) {
     c = q + 1 | 0, b &= 65535, l = 0;
     do {
      for (n = o | (l | 0) != (a | 0) ? l : q >>> 0 < ((t & 65535) - a | 0) >>> 0 ? b - a | 0 : a, k[u >> 2] = 0, k[u + 4 >> 2] = 0, k[u + 8 >> 2] = 0, k[u + 12 >> 2] = 0, k[u + 16 >> 2] = 0, k[u + 20 >> 2] = 0, k[u + 24 >> 2] = 0, k[u + 28 >> 2] = 0, e = n + -1 | 0, i = k[32928] | 0, l = n + 1 | 0, h = p; ;) {
       for (d = h >>> 0 < (t & 65535) >>> 0, f = ka(b, h) | 0, g = e; ;) {
        if (d & g >>> 0 < b >>> 0 && (v = jc(h, g) | 0, k[u + (v << 2) >> 2] = (k[u + (v << 2) >> 2] | 0) + (m[i + (f + g << 3) + (v << 1) >> 1] | 0), k[u + (v + 4 << 2) >> 2] = (k[u + (v + 4 << 2) >> 2] | 0) + 1), (g | 0) == (l | 0)) break;
        g = g + 1 | 0;
       }
       if ((h | 0) == (c | 0)) break;
       h = h + 1 | 0;
      }
      if (b = jc(q, n) | 0, d = k[32932] | 0) {
       f = 0;
       do (f | 0) != (b | 0) && (e = k[u + (f + 4 << 2) >> 2] | 0, e && (v = i + ((ka(s & 65535, q) | 0) + n << 3) + (f << 1) | 0, j[v >> 1] = ((k[u + (f << 2) >> 2] | 0) >>> 0) / (e >>> 0) | 0)), f = f + 1 | 0; while ((f | 0) != (d | 0));
      }
      b = s & 65535;
     } while (l >>> 0 < b >>> 0);
     d = t & 65535, b = s;
    } else d = t & 65535, c = q + 1 | 0, b = 0;
    if (!(c >>> 0 < d >>> 0)) break;
    q = c;
   }
   r = u;
  }
  function Td(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0;
   if (o = r, r = r + 16 | 0, l = (m[65840] | 0) + -2 | 0, (l | 0) > 2) {
    i = j[65916] | 0, b = 2;
    do if (1 << (b - (i & 65535) & 7) & a) {
     if (d = b + -1 | 0, g = b + 1 | 0, h = m[65844] | 0, (h + -1 | 0) > 1) {
      e = j[65896] | 0, c = k[32946] | 0, f = 1;
      do p = ka(e & 65535, d) | 0, s = f + -1 | 0, k[o >> 2] = m[c + (p + s << 1) >> 1], q = f + 1 | 0, k[o + 4 >> 2] = m[c + (p + q << 1) >> 1], p = ka(e & 65535, g) | 0, k[o + 8 >> 2] = m[c + (p + s << 1) >> 1], k[o + 12 >> 2] = m[c + (p + q << 1) >> 1], q = (Sd(o) | 0) & 65535, p = c + ((ka(e & 65535, b) | 0) + f << 1) | 0, j[p >> 1] = q, f = f + 4 | 0; while ((f | 0) < (h + -1 | 0));
     }
     if (c = b + -2 | 0, d = b + 2 | 0, (h + -2 | 0) > 2) {
      e = 2;
      do 1 << (c - (i & 65535) & 7) & a ? n = 12 : 1 << (d - (i & 65535) & 7) & a ? n = 12 : (p = m[65896] | 0, s = ka(p, b) | 0, q = k[32946] | 0, k[o >> 2] = m[q + (e + -2 + s << 1) >> 1], k[o + 4 >> 2] = m[q + (e + 2 + s << 1) >> 1], f = q + ((ka(p, c) | 0) + e << 1) | 0, k[o + 8 >> 2] = m[f >> 1], p = q + ((ka(p, d) | 0) + e << 1) | 0, k[o + 12 >> 2] = m[p >> 1], p = (Sd(o) | 0) & 65535, j[q + (s + e << 1) >> 1] = p), (n | 0) == 12 && (n = 0, s = ka(m[65896] | 0, b) | 0, q = k[32946] | 0, j[q + (s + e << 1) >> 1] = ((m[q + (e + 2 + s << 1) >> 1] | 0) + (m[q + (e + -2 + s << 1) >> 1] | 0) | 0) >>> 1), e = e + 4 | 0; while ((e | 0) < (h + -2 | 0));
      b = g;
     } else b = g;
    } else b = b + 1 | 0; while ((b | 0) < (l | 0));
   }
   r = o;
  }
  function Ue() {
   var a = 0, b = 0, c = 0, d = 0;
   d = r, r = r + 208 | 0, kb(k[140] | 0, 0, 0) | 0, a = d + 28 | 0, c = a + 44 | 0;
   do k[a >> 2] = 0, a = a + 4 | 0; while ((a | 0) < (c | 0));
   do Cb(d + 72 | 0, 128, k[140] | 0) | 0, a = Bf(d + 72 | 0, 61) | 0, a ? (i[a >> 0] = 0, a = a + 1 | 0) : a = d + 72 + (Cg(d + 72 | 0) | 0) | 0, og(d + 72 | 0, 588480) | 0 || (k[d >> 2] = d + 28 + 12, k[d + 4 >> 2] = d + 28 + 16, k[d + 8 >> 2] = d + 28 + 20, xf(a, 299104, d) | 0), og(d + 72 | 0, 588488) | 0 || (k[d + 16 >> 2] = d + 28 + 8, k[d + 16 + 4 >> 2] = d + 28 + 4, k[d + 16 + 8 >> 2] = d + 28, xf(a, 588496, d + 16 | 0) | 0), og(d + 72 | 0, 588512) | 0 || (c = jg(a) | 0, k[41342] = c), og(d + 72 | 0, 588520) | 0 || (c = (jg(a) | 0) & 65535, j[65896] = c), og(d + 72 | 0, 588528) | 0 || (c = (jg(a) | 0) & 65535, j[65916] = c), og(d + 72 | 0, 588536) | 0 || (c = (jg(a) | 0) & 65535, j[66080] = c), og(d + 72 | 0, 588544) | 0 || (c = (jg(a) | 0) & 65535, j[66084] = c); while ((qg(d + 72 | 0, 588552, 4) | 0) != 0);
   c = (ka((m[66080] | 0) << 1, m[66084] | 0) | 0) + (k[41342] | 0) | 0, k[33002] = c, k[d + 28 + 20 >> 2] = (k[d + 28 + 20 >> 2] | 0) + -1900, k[d + 28 + 16 >> 2] = (k[d + 28 + 16 >> 2] | 0) + -1, (Gb(d + 28 | 0) | 0) > 0 && (c = Gb(d + 28 | 0) | 0, k[41306] = c), i[132032] = i[588560] | 0, i[132033] = i[588561] | 0, i[132034] = i[588562] | 0, i[132035] = i[588563] | 0, i[132036] = i[588564] | 0, i[132037] = i[588565] | 0, i[132038] = i[588566] | 0, a = 132096, b = 588568, c = a + 9 | 0;
   do i[a >> 0] = i[b >> 0] | 0, a = a + 1 | 0, b = b + 1 | 0; while ((a | 0) < (c | 0));
   k[41676] = 31, r = d;
  }
  function lf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0;
   if (a = j[82540] | 0, a << 16 >> 16) {
    if (q = m[65848] | 0, j[82540] = (a & 65535) + -1 + q >> q, q = (a & 65535) + -1 + q >> q & 65535, d = ~~(+((m[65840] | 0) - q | 0) / .7071067811865476) & 65535, e = ~~(+(q | 0) / .7071067811865476) & 65535, f = wg(d & 65535, e << 3) | 0, mc(f, 614576), g = k[32928] | 0, h = k[32932] | 0, d << 16 >> 16) {
     t = 0;
     do {
      if (i = ka(t, e) | 0, (~~(+(q | 0) / .7071067811865476) & 65535) << 16 >> 16) {
       a = j[82540] | 0, b = j[65840] | 0, r = 0;
       do {
        if (l = +(t - r | 0) * .7071067811865476 + +(a & 65535 | 0), n = +(r + t | 0) * .7071067811865476, ~~l >>> 0 >>> 0 <= ((b & 65535) + -2 | 0) >>> 0 && (o = m[65844] | 0, ~~n >>> 0 >>> 0 <= (o + -2 | 0) >>> 0 && (c = (ka(o, ~~l >>> 0) | 0) + (~~n >>> 0) | 0, p = r + i | 0, h))) {
         s = 0;
         do j[f + (p << 3) + (s << 1) >> 1] = ~~((1 - (l - +(~~l >>> 0 >>> 0))) * ((1 - (n - +(~~n >>> 0 >>> 0))) * +(m[g + (c << 3) + (s << 1) >> 1] | 0 | 0) + (n - +(~~n >>> 0 >>> 0)) * +(m[g + (c + 1 << 3) + (s << 1) >> 1] | 0 | 0)) + (l - +(~~l >>> 0 >>> 0)) * ((1 - (n - +(~~n >>> 0 >>> 0))) * +(m[g + (o + c << 3) + (s << 1) >> 1] | 0 | 0) + (n - +(~~n >>> 0 >>> 0)) * +(m[g + (c + 1 + o << 3) + (s << 1) >> 1] | 0 | 0))), s = s + 1 | 0; while ((s | 0) != (h | 0));
        }
        r = r + 1 | 0;
       } while ((r | 0) != (e | 0));
      }
      t = t + 1 | 0;
     } while ((t | 0) != (d & 65535 | 0));
    }
    vg(g), j[65844] = ~~(+(q | 0) / .7071067811865476), j[65840] = d, k[32928] = f, j[82540] = 0;
   }
  }
  function pd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, o = 0, q = 0, s = 0, t = 0;
   if (q = r, r = r + 16 | 0, k[q >> 2] = 0, k[q + 4 >> 2] = 0, k[q + 8 >> 2] = 0, k[q + 12 >> 2] = 0, g = (j[284] | 0) == 18761 ? 3 : 0, h = (((m[65896] | 0) * 5 | 0) + 1 | 0) >>> 2, n = ug(h << 1) | 0, mc(n, 300304), j[65916] | 0) {
    o = 0;
    do {
     if ((Ga(n + h | 0, 1, h | 0, k[140] | 0) | 0) >>> 0 < h >>> 0 && nc(), h) {
      a = 0;
      do i[n + a >> 0] = i[n + ((a ^ g) + h) >> 0] | 0, a = a + 1 | 0; while ((a | 0) != (h | 0));
     }
     if (d = j[65896] | 0, d << 16 >> 16) for (a = k[32946] | 0, e = 0, f = n; ;) {
      b = f + 4 | 0, c = 0;
      do s = a + (c + e + (ka(d & 65535, o) | 0) << 1) | 0, j[s >> 1] = (l[b >> 0] | 0) >>> (c << 1) & 3 | l[f + c >> 0] << 2, c = c + 1 | 0; while ((c | 0) != 4);
      if (e = e + 4 | 0, (e | 0) >= (d & 65535 | 0)) break;
      f = f + 5 | 0;
     }
     o = o + 1 | 0;
    } while ((o | 0) < (m[65916] | 0));
   }
   if (vg(n), k[32952] = 1023, !(og(132032, 300328) | 0) && (d = (m[65916] | 0) >>> 1 & 65535, a = j[65844] | 0, s = m[65896] | 0, b = ka(s, d) | 0, c = k[32946] | 0, d = ka(s, d + 1 | 0) | 0, (a & 65535) > 1)) {
    e = 0;
    do s = e, e = e + 1 | 0, o = (m[c + (b + s << 1) >> 1] | 0) - (m[c + (d + e << 1) >> 1] | 0) | 0, t = +(ka(o, o) | 0), p[q + ((s & 1) << 3) >> 3] = +p[q + ((s & 1) << 3) >> 3] + t, o = (m[c + (d + s << 1) >> 1] | 0) - (m[c + (b + e << 1) >> 1] | 0) | 0, t = +(ka(o, o) | 0), p[q + ((s & 1 ^ 1) << 3) >> 3] = +p[q + ((s & 1 ^ 1) << 3) >> 3] + t; while ((e | 0) < ((a & 65535) + -1 | 0));
    +p[q + 8 >> 3] > +p[q >> 3] && (k[80] = 1263225675);
   }
   r = q;
  }
  function me(a, b, c, d) {
   a = +a, b = +b, c |= 0, d |= 0;
   var e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0;
   if (n = r, r = r + 16 | 0, k[n >> 2] = 0, k[n + 4 >> 2] = 0, k[n + 8 >> 2] = 0, k[n + 12 >> 2] = 0, p[n + ((b >= 1 & 1) << 3) >> 3] = 1, b != 0) if ((a + -1) * (b + -1) <= 0) {
    e = 0;
    do f = (+p[n >> 3] + +p[n + 8 >> 3]) * .5, a != 0 ? (h = n + (((+$(+(f / b), + -a) + -1) / a - 1 / f > -1 & 1) << 3) | 0, p[h >> 3] = f) : (h = n + ((f / +ha(+(1 - 1 / f)) < b & 1) << 3) | 0, p[h >> 3] = f), e = e + 1 | 0; while ((e | 0) != 48);
    a != 0 ? (l = f, m = f / b, i = f * (1 / a + -1)) : (l = f, m = f / b, i = 0);
   } else l = 0, m = 0, i = 0; else l = 0, m = 0, i = 0;
   if (f = m * m * b * .5, f = a != 0 ? f - i * (1 - m) + (i + 1) * (1 - +$(+m, +(a + 1))) / (a + 1) : f + 1 - l - m - m * l * (+ia(+m) + -1), c) {
    g = i + 1, h = 0;
    do {
     if (e = 576 + (h << 1) | 0, j[e >> 1] = -1, f = +(h | 0) / +(d | 0), f < 1) {
      do {
       if ((c | 0) == 1) {
        if (f < l) {
         f /= b;
         break;
        }
        if (a != 0) {
         f = +$(+((i + f) / g), +(1 / a));
         break;
        }
        f = +ha(+((f + -1) / l));
        break;
       }
       if (f < m) {
        f *= b;
        break;
       }
       if (a != 0) {
        f = g * +$(+f, +a) - i;
        break;
       }
       f = l * +ia(+f) + 1;
       break;
      } while (0);
      j[e >> 1] = ~~(f * 65536);
     }
     h = h + 1 | 0;
    } while ((h | 0) != 65536);
   } else p[6] = a, p[7] = b, p[8] = 1 / f + -1;
   r = n;
  }
  function Nc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0, s = 0;
   if (p = r, r = r + 480 | 0, Jc(p, 0) | 0) {
    if (a = k[p + 12 >> 2] | 0, b = k[p + 16 >> 2] | 0, o = ka(b, a) | 0, (k[p + 8 >> 2] | 0) > 0) {
     l = ka(b, a) | 0, b = 0, n = 0, a = 0;
     do {
      c = Mc(n, p) | 0;
      do if (k[32962] & 1) {
       if (n & 1) {
        a = (m[65840] | 0) + -1 + ((n | 0) / -2 | 0) | 0;
        break;
       }
       a = (n | 0) / 2 | 0;
       break;
      } while (0);
      if (h = k[32946] | 0, i = ka(n, o) | 0, (o | 0) > 0) {
       g = 0, f = c;
       do e = j[576 + ((m[f >> 1] | 0) << 1) >> 1] | 0, f = f + 2 | 0, c = j[65928] | 0, c << 16 >> 16 && (s = g + i | 0, b = m[65929] | 0, a = ka(m[65916] | 0, b) | 0, q = ((s | 0) / (a | 0) | 0 | 0) >= (c & 65535 | 0) ? c & 65535 : (s | 0) / (a | 0) | 0, d = s - (ka(q, a) | 0) | 0, a = m[131856 + ((((s | 0) / (a | 0) | 0 | 0) >= (c & 65535 | 0) ? 2 : 1) << 1) >> 1] | 0, b = ((d | 0) % (a | 0) | 0) + (ka(q, b) | 0) | 0, a = (d | 0) / (a | 0) | 0), d = j[65896] | 0, d << 16 >> 16 == 3984 && (c = b + -2 | 0, (b | 0) < 2 ? (b = (d & 65535) + c | 0, a = a + -1 | 0) : b = c), a >>> 0 < (m[65916] | 0) >>> 0 && (s = h + ((ka(d & 65535, a) | 0) + b << 1) | 0, j[s >> 1] = e), b = b + 1 | 0, a = ((b | 0) < (d & 65535 | 0) ^ 1) + a | 0, b = (b | 0) < (d & 65535 | 0) ? b : 0, g = g + 1 | 0; while ((g | 0) != (l | 0));
      }
      n = n + 1 | 0;
     } while ((n | 0) < (k[p + 8 >> 2] | 0));
    }
    Kc(p);
   }
   r = p;
  }
  function be(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
   p = r, r = r + 16 | 0, l = k[33050] | 0, n = k[41266] | 0;
   a: do if (l) {
    for (c = 0; ;) {
     if (qg(n + c | 0, 322696, 3) | 0) {
      o = 16;
      break a;
     }
     if ((i[n + (c + 3) >> 0] | 0) == 77 && !(og(b, n + ((qc(n + (c + 12) | 0) | 0) + c) | 0) | 0)) break;
     if (c = (qc(n + (c + 8) | 0) | 0) + c | 0, c >>> 0 >= l >>> 0) {
      o = 16;
      break a;
     }
    }
    if (k[a + 8 >> 2] = 1, k[a + 4 >> 2] = 1, k[a >> 2] = 1, f = (qc(n + (c + 16) | 0) | 0) + c | 0, m = qc(n + f | 0) | 0, d = qc(n + (f + 4) | 0) | 0, d >>> 0 > 3) o = 16; else {
     if (j = qc(n + (f + 8) | 0) | 0, d) {
      f = n + f | 0;
      do d = d + -1 | 0, f = f + 12 | 0, q = qc(f) | 0, k[a + (d << 2) >> 2] = q; while ((d | 0) != 0);
      g = +((k[a + 4 >> 2] | 0) >>> 0), h = +((k[a >> 2] | 0) >>> 0), e = +((k[a + 8 >> 2] | 0) >>> 0);
     } else g = 1, h = 1, e = 1;
     if (f = j + c | 0, e = h * g * e, e > +(l >>> 2 >>> 0)) o = 16; else if (c = ug(~~e >>> 0 << 2) | 0, mc(c, 322704), ~~e >>> 0) {
      d = 0;
      do (m | 0) == 0 | (m | 0) == 6 ? (q = (qc(n + ((d << 1) + f) | 0) | 0) & 65535, k[c + (d << 2) >> 2] = q) : (q = qc(n + ((d << 2) + f) | 0) | 0, k[c + (d << 2) >> 2] = q), d = d + 1 | 0; while ((d | 0) != (~~e >>> 0 | 0));
     }
    }
   } else o = 16; while (0);
   return (o | 0) == 16 && (c = k[w >> 2] | 0, k[p >> 2] = k[96], k[p + 4 >> 2] = b, Jb(c | 0, 322728, p | 0) | 0, c = 0), r = p, c | 0;
  }
  function je() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0;
   if (x = k[80] | 0, y = k[32928] | 0, z = j[65840] | 0, z << 16 >> 16) for (w = j[65844] | 0, a = w, A = 3, B = 0; ;) {
    if (u = B << 1 & 14, v = B + -2 | 0, a << 16 >> 16) for (t = v >>> 0 > (B + 2 | 0) >>> 0, r = j[65848] | 0, s = j[65852] | 0, n = a & 65535, o = 0, p = 3; ;) {
     if (h = x >>> ((o & 1 | u) << 1) & 3, i = y + ((ka(B >>> (r & 65535), s & 65535) | 0) + (o >>> (r & 65535)) << 3) + (h << 1) | 0, !(j[i >> 1] | 0 || (l = o + -2 | 0, t))) {
      m = l >>> 0 > (o + 2 | 0) >>> 0, b = 0, q = v, a = 0;
      do {
       if (d = q >>> 0 < (z & 65535) >>> 0, e = q << 1 & 14, f = ka(q >>> (r & 65535), s & 65535) | 0, !m) {
        g = l;
        do d & g >>> 0 < n >>> 0 && (x >>> ((g & 1 | e) << 1) & 3 | 0) == (h | 0) && (c = j[y + (f + (g >>> (r & 65535)) << 3) + (h << 1) >> 1] | 0, c << 16 >> 16 && (b = b + 1 | 0, a = (c & 65535) + a | 0)), g = g + 1 | 0; while ((g | 0) != (p | 0));
       }
       q = q + 1 | 0;
      } while ((q | 0) != (A | 0));
      b && (j[i >> 1] = (a >>> 0) / (b >>> 0) | 0);
     }
     if (o = o + 1 | 0, n = w & 65535, o >>> 0 >= n >>> 0) {
      a = w;
      break;
     }
     p = p + 1 | 0;
    } else a = 0;
    if (B = B + 1 | 0, (B | 0) == (z & 65535 | 0)) break;
    A = A + 1 | 0;
   }
  }
  function Ze() {
   var a = 0, b = 0, c = 0, d = 0, e = 0;
   e = r, r = r + 208 | 0, j[284] = 18761, Ga(e + 200 | 0, 4, 1, k[140] | 0) | 0, b = rc() | 0, c = (vb(k[140] | 0) | 0) + b | 0;
   a: do if (mg(e + 200 | 0, 588680, 4) | 0) if (mg(e + 200 | 0, 588688, 4) | 0) {
    if (!(mg(e + 200 | 0, 588696, 4) | 0)) {
     if (((vb(k[140] | 0) | 0) + 7 | 0) >>> 0 >= c >>> 0) break;
     for (;;) if (b = (pc() | 0) & 65535, a = pc() | 0, a << 16 >> 16 == 20 & (b + 1 & 131070 | 0) == 20 ? He(0) : kb(k[140] | 0, a & 65535 | 0, 1) | 0, ((vb(k[140] | 0) | 0) + 7 | 0) >>> 0 >= c >>> 0) break a;
    }
    if (c = b >>> 0 < 64 & (mg(e + 200 | 0, 588704, 4) | 0) == 0, a = k[140] | 0, !c) {
     kb(a | 0, b | 0, 1) | 0;
     break;
    }
    Ga(e + 136 | 0, 64, 1, a | 0) | 0, i[e + 136 + b >> 0] = 0, a = e + 24 | 0, b = a + 44 | 0;
    do k[a >> 2] = 0, a = a + 4 | 0; while ((a | 0) < (b | 0));
    if (k[e >> 2] = e + 72, k[e + 4 >> 2] = e + 24 + 12, k[e + 8 >> 2] = e + 24 + 8, k[e + 12 >> 2] = e + 24 + 4, k[e + 16 >> 2] = e + 24, k[e + 20 >> 2] = e + 24 + 20, (xf(e + 136 | 0, 588712, e) | 0) == 6) {
     a = 0;
     do {
      if (!(ng(588736 + (a << 2) | 0, e + 72 | 0) | 0)) break;
      a = a + 1 | 0;
     } while (a >>> 0 < 12);
     k[e + 24 + 16 >> 2] = a, k[e + 24 + 20 >> 2] = (k[e + 24 + 20 >> 2] | 0) + -1900, (Gb(e + 24 | 0) | 0) > 0 && (c = Gb(e + 24 | 0) | 0, k[41306] = c);
    }
   } else d = 3; else d = 3; while (0);
   b: do if ((d | 0) == 3 && (rc() | 0, ((vb(k[140] | 0) | 0) + 7 | 0) >>> 0 < c >>> 0)) do {
    if (Na(k[140] | 0) | 0) break b;
    Ze();
   } while (((vb(k[140] | 0) | 0) + 7 | 0) >>> 0 < c >>> 0); while (0);
   r = e;
  }
  function hf(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0, o = 0, q = 0;
   o = r, r = r + 8272 | 0, k[o >> 2] = 0, k[o + 4 >> 2] = 0, k[o + 8 >> 2] = 0, k[o + 12 >> 2] = 0, l = 0, h = 0, n = 0;
   do {
    if (kb(k[140] | 0, ((n | 0) != 0 ? d : c) | 0, 0) | 0, g = j[65844] | 0, g << 16 >> 16) {
     m = 0, i = 0;
     do {
      if (i = i - a | 0, (i | 0) < 0) {
       g = l;
       do {
        if (g = Ng(g | 0, h | 0, b | 0) | 0, h = O, (b | 0) > 0) {
         l = 0;
         do g = (ib(k[140] | 0) | 0) << l | g, l = l + 8 | 0; while ((l | 0) < (b | 0));
        }
        i = i + b | 0;
       } while ((i | 0) < 0);
       l = g, g = j[65844] | 0;
      }
      q = Ng(l | 0, h | 0, 64 - a - i | 0) | 0, q = Ig(q | 0, O | 0, 64 - a | 0) | 0, j[o + 16 + (n * 4128 | 0) + (m << 1) >> 1] = q, m = m + 1 | 0;
     } while ((m | 0) < (g & 65535 | 0));
    } else g = 0;
    n = n + 1 | 0;
   } while ((n | 0) != 2);
   if (l = (g & 65535) + -1 | 0, (g & 65535) > 1) {
    g = j[o + 16 >> 1] | 0, h = j[o + 16 + 4128 >> 1] | 0, i = 0;
    do q = i, i = i + 1 | 0, d = h, h = j[o + 16 + 4128 + (i << 1) >> 1] | 0, m = (g & 65535) - (h & 65535) | 0, p[o + ((q & 1) << 3) >> 3] = +p[o + ((q & 1) << 3) >> 3] + +((m >> 31 ^ m) - (m >> 31) | 0), g = j[o + 16 + (i << 1) >> 1] | 0, d = (d & 65535) - (g & 65535) | 0, p[o + ((q & 1 ^ 1) << 3) >> 3] = +p[o + ((q & 1 ^ 1) << 3) >> 3] + +((d >> 31 ^ d) - (d >> 31) | 0); while ((i | 0) < (l | 0));
    e = +p[o + 8 >> 3], f = +p[o >> 3];
   } else e = 0, f = 0;
   return f = +ia(+(f / e)) * 100, r = o, +f;
  }
  function Vc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, p = 0, q = 0;
   if (i = r, r = r + 32 | 0, j[65916] | 0) {
    a = j[65896] | 0, b = 0, c = 0, h = 0;
    do {
     if (a << 16 >> 16) {
      g = 0;
      do {
       if (d = g & 1, !d) {
        a = 0, b = 0, c = 0;
        do e = ib(k[140] | 0) | 0, e = Ng(e | 0, ((e | 0) < 0) << 31 >> 31 | 0, c << 3 | 0) | 0, a = e | a, b = O | b, c = c + 1 | 0; while ((c | 0) != 6);
        k[i + 16 >> 2] = a & 4095, c = Ig(a | 0, b | 0, 12) | 0, k[i + 16 + 4 >> 2] = c & 4095, c = Ig(a | 0, b | 0, 24) | 0, c = Eg(c & 4095 | 0, 0, -2048, 0) | 0, k[i + 16 + 8 >> 2] = c, b = Ig(a | 0, b | 0, 36) | 0, b = Eg(b & 4095 | 0, 0, -2048, 0) | 0, k[i + 16 + 12 >> 2] = b;
       }
       for (n = +(k[i + 16 + (d << 2) >> 2] | 0), l = +(b | 0), k[i >> 2] = ~~(n + l * 1.370705), p = +(c | 0), k[i + 4 >> 2] = ~~(n - p * .337633 - l * .698001), k[i + 8 >> 2] = ~~(n + p * 1.732446), e = k[32928] | 0, d = j[65844] | 0, f = ~~(n + l * 1.370705), a = 0; ;) {
        if (q = (f | 0) < 4095 ? f : 4095, f = e + ((ka(d & 65535, h) | 0) + g << 3) + (a << 1) | 0, j[f >> 1] = ~~(+(m[576 + (((q | 0) < 0 ? 0 : q) << 1) >> 1] | 0) / +o[132016 + (a << 2) >> 2]), a = a + 1 | 0, (a | 0) == 3) break;
        f = k[i + (a << 2) >> 2] | 0;
       }
       g = g + 1 | 0, a = j[65896] | 0;
      } while ((g | 0) < (a & 65535 | 0));
     } else a = 0;
     h = h + 1 | 0;
    } while ((h | 0) < (m[65916] | 0));
   }
   r = i;
  }
  function Dd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, n = 0, o = 0, p = 0, q = 0, s = 0, t = 0;
   if (t = r, r = r + 16 | 0, o = Fc(317728) | 0, k[t >> 2] = o, p = Fc(317754) | 0, k[t + 4 >> 2] = p, a = ((m[65916] | 0) + 63 | 0) >>> 5, q = ug((a << 2) + (m[65896] << 5) | 0) | 0, mc(q, 317784), s = q + (m[65896] << 5) | 0, j[284] = 19789, a) {
    b = 0;
    do g = rc() | 0, k[s + (b << 2) >> 2] = g, b = b + 1 | 0; while ((b | 0) != (a | 0));
   }
   if (j[65916] | 0) {
    a = 0, n = 0;
    do {
     if (n & 31 || (kb(k[140] | 0, k[s + (n >> 5 << 2) >> 2] | 0, 0) | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, a = 0), b = j[65896] | 0, b << 16 >> 16) {
      c = b & 65535, h = 0;
      do g = h + n & 1, f = a + -2 | 0, d = a - c | 0, b = (g | 0) != 0 ? a - (c << 1) | 0 : d + 1 | 0, d = (h | 0) > (g | 0) ? (g | 0) != 0 ? f : d + -1 | 0 : -1, d = (d | 0) < 0 ? b : d, c = (h | 0) > 1 & (d | 0) < 0, e = c ? f : d, b = (e | 0) < 0 ? 0 : ((l[q + (c ? f : (b | 0) < 0 ? d : b) >> 0] | 0) + (l[q + e >> 0] | 0) | 0) >>> 1, b = (Lc(k[t + (g << 2) >> 2] | 0) | 0) + b | 0, c = q + a | 0, i[c >> 0] = b, b >>> 0 > 255 ? (nc(), b = i[c >> 0] | 0) : b &= 255, a = a + 1 | 0, c = m[65896] | 0, g = (ka(c, n) | 0) + h | 0, j[(k[32946] | 0) + (g << 1) >> 1] = j[576 + ((b & 255) << 1) >> 1] | 0, h = h + 1 | 0; while ((h | 0) < (c | 0));
     }
     n = n + 1 | 0;
    } while ((n | 0) < (m[65916] | 0));
   }
   vg(q), vg(o), vg(p), r = t;
  }
  function Md() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, l = 0, n = 0, o = 0, p = 0;
   if (o = r, r = r + 32 | 0, f = ug((m[65896] | 0) + 1 | 0) | 0, mc(f, 318368), j[65840] | 0) {
    g = j[65896] | 0, n = 0;
    do {
     if (Ga(f | 0, 1, g & 65535 | 0, k[140] | 0) | 0, g = j[65896] | 0, (g & 65535) > 30) for (e = g & 65535, h = 0, l = f; ;) {
      for (b = qc(l) | 0, d = 0; ;) {
       if ((d | 0) > 3 ? 1 : (128 << d | 0) > ((b & 2047) - (b >>> 11 & 2047) | 0)) break;
       d = d + 1 | 0;
      }
      a = 30, c = 0;
      do {
       do {
        if ((c | 0) != (b >>> 22 & 15 | 0)) {
         if ((c | 0) == (b >>> 26 & 15 | 0)) {
          j[o + ((b >>> 26 & 15) << 1) >> 1] = b >>> 11 & 2047;
          break;
         }
         p = a >> 3, p = ((((oc(i[l + p >> 0] | 0, i[l + (p + 1) >> 0] | 0) | 0) & 65535) >>> (a & 7) & 127) << d) + (b >>> 11 & 2047) | 0, j[o + (c << 1) >> 1] = (p & 63488) >>> 0 > 2047 ? 2047 : p & 65535, a = a + 7 | 0;
         break;
        }
        j[o + ((b >>> 22 & 15) << 1) >> 1] = b & 2047;
       } while (0);
       c = c + 1 | 0;
      } while ((c | 0) != 16);
      for (a = k[32946] | 0, b = h, c = 0; ;) {
       if (p = a + ((ka(g & 65535, n) | 0) + b << 1) | 0, j[p >> 1] = (m[576 + (m[o + (c << 1) >> 1] << 1 << 1) >> 1] | 0) >>> 2, c = c + 1 | 0, (c | 0) == 16) break;
       b = b + 2 | 0;
      }
      if (p = h + 32 | 0, h = p - ((p & 1 | 0) != 0 ? 1 : 31) | 0, (h | 0) >= (e + -30 | 0)) break;
      l = l + 16 | 0;
     }
     n = n + 1 | 0;
    } while ((n | 0) < (m[65840] | 0));
   }
   vg(f), r = o;
  }
  function xe(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (a) {
    if (e = k[32932] | 0) {
     d = 0, c = .5, g = .5, f = .5;
     do h = +(m[a + (d << 1) >> 1] | 0 | 0), c += +o[586032 + (d << 2) >> 2] * h, f += +o[586048 + (d << 2) >> 2] * h, g += +o[586064 + (d << 2) >> 2] * h, d = d + 1 | 0; while ((d | 0) != (e | 0));
     e = ~~c, a = ~~g, d = ~~f;
    } else e = 0, a = 0, d = 0;
    e = (e | 0) < 65535 ? e : 65535, f = +o[323888 + (((e | 0) < 0 ? 0 : e) << 2) >> 2], e = (d | 0) < 65535 ? d : 65535, g = +o[323888 + (((e | 0) < 0 ? 0 : e) << 2) >> 2], a = (a | 0) < 65535 ? a : 65535, h = +o[323888 + (((a | 0) < 0 ? 0 : a) << 2) >> 2], j[b >> 1] = ~~((g * 116 + -16) * 64), j[b + 2 >> 1] = ~~((f - g) * 32e3), j[b + 4 >> 1] = ~~((g - h) * 12800);
   } else {
    d = 0;
    do c = +(d | 0) / 65535, c = c > .008856 ? +$(+c, .3333333333333333) : c * 7.787 + .13793103448275862, o[323888 + (d << 2) >> 2] = c, d = d + 1 | 0; while ((d | 0) != 65536);
    e = k[32932] | 0, d = 0;
    do {
     if (e) {
      c = +p[232 + (d * 24 | 0) >> 3], f = +o[304 + (d << 2) >> 2], g = +p[232 + (d * 24 | 0) + 8 >> 3], h = +p[232 + (d * 24 | 0) + 16 >> 3], a = 0;
      do o[586032 + (d << 4) + (a << 2) >> 2] = h * +o[131768 + (a << 2) >> 2] / f + (g * +o[131752 + (a << 2) >> 2] / f + (c * +o[131736 + (a << 2) >> 2] / f + 0)), a = a + 1 | 0; while ((a | 0) != (e | 0));
     }
     d = d + 1 | 0;
    } while ((d | 0) != 3);
   }
  }
  function Xd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (g = r, r = r + 16 | 0, a = rc() | 0, f = k[33046] | 0, e = m[66084] | 0, k[g >> 2] = m[66080], k[g + 4 >> 2] = e, Jb(f | 0, 299992, g | 0) | 0, a) {
    if (a >>> 0 >= ((m[66080] | 0) * 3 | 0) >>> 0) {
     if (b = ug(a) | 0, mc(b, 322624), j[66084] | 0) {
      c = 0;
      do Ga(b | 0, 1, a | 0, k[140] | 0) | 0, Hb(b | 0, 3, m[66080] | 0, k[33046] | 0) | 0, c = c + 1 | 0; while (c >>> 0 < (m[66084] | 0) >>> 0);
     }
     vg(b);
    }
   } else if (Wd(256, 0), j[66084] | 0) {
    a = 1, b = 0, f = 0;
    do {
     if (j[g + 8 >> 1] = 0, j[g + 8 + 2 >> 1] = 0, j[g + 8 + 4 >> 1] = 0, a || rc() | 0, j[66080] | 0) {
      a = 0, e = 0;
      do {
       d = 0;
       do {
        if (k[35120] | 0) {
         c = 140480;
         do a = a + 31 & 31, (a | 0) == 31 && (b = (ib(k[140] | 0) | 0) + (b << 8) << 8, b = (ib(k[140] | 0) | 0) + b << 8, b = (ib(k[140] | 0) | 0) + b << 8, b = (ib(k[140] | 0) | 0) + b | 0), c = k[c + ((b >>> a & 1) << 2) >> 2] | 0; while ((k[c >> 2] | 0) != 0);
        } else c = 140480;
        h = g + 8 + (d << 1) | 0, c = (m[h >> 1] | 0) + (k[c + 8 >> 2] | 0) | 0, j[h >> 1] = c, Eb(c << 16 >> 16 | 0, k[33046] | 0) | 0, d = d + 1 | 0;
       } while ((d | 0) != 3);
       e = e + 1 | 0;
      } while (e >>> 0 < (m[66080] | 0) >>> 0);
     } else a = 0;
     f = f + 1 | 0;
    } while (f >>> 0 < (m[66084] | 0) >>> 0);
   }
   r = g;
  }
  function af() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;
   e = r, r = r + 16 | 0, j[284] = 18761, kb(k[140] | 0, 4, 0) | 0, b = (pc() | 0) << 16 >> 16 == 2 & 1, k[32994] = b, kb(k[140] | 0, 14, 1) | 0, b = rc() | 0, b = ka(k[32994] | 0, b) | 0, k[32994] = b, b = rc() | 0, c = rc() | 0, d = rc() | 0, a = rc() | 0, k[41306] = a, a = rc() | 0, a && (k[41306] = a), kb(k[140] | 0, b + 4 | 0, 0) | 0, a = (rc() | 0) & 65535, j[65896] = a, a = (rc() | 0) & 65535, j[65916] = a, pc() | 0, a = (pc() | 0) & 65535, (a | 0) == 16 ? k[41268] = 18 : (a | 0) == 8 && (k[41268] = 7), kb(k[140] | 0, c + 792 | 0, 0) | 0, i[132032] = i[588840] | 0, i[132033] = i[588841] | 0, i[132034] = i[588842] | 0, i[132035] = i[588843] | 0, i[132036] = i[588844] | 0, a = rc() | 0, k[e >> 2] = a, eg(132096, 587824, e), kb(k[140] | 0, 12, 1) | 0, a = (rc() | 0) & 16777215, (a | 0) == 4 ? k[80] = 1229539657 : (a | 0) == 3 ? k[80] = -1802201964 : k[32994] = 0, kb(k[140] | 0, 72, 1) | 0, a = (((rc() | 0) + 3600 | 0) >>> 0) % 360 | 0, (a | 0) == 90 ? k[41352] = 7 : (a | 0) == 270 ? k[41352] = 4 : (a | 0) == 180 ? k[41352] = 1 : a || (k[41352] = 2), a = rc() | 0, k[33004] = a, a = rc() | 0, k[33006] = a, a = ~(-1 << (rc() | 0)), k[32952] = a, kb(k[140] | 0, 668, 1) | 0, f = +((rc() | 0) >>> 0) / 1e9, o[41348] = f, kb(k[140] | 0, d | 0, 0) | 0, a = k[2] | 0, a >>> 0 < (k[32994] | 0) >>> 0 && kb(k[140] | 0, a << 3 | 0, 1) | 0, c = (rc() | 0) + 8 | 0, k[33002] = c, rc() | 0, r = e;
  }
  function ud() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   h = r, r = r + 768 | 0, f = 0;
   do {
    switch ((Ga(h | 0, 1, 768, k[140] | 0) | 0) >>> 0 < 768 && nc(), a = (f >>> 0) / 82 | 0, f | 0) {
    case 1478:
     b = 1, d = 985, g = 8;
     break;

    case 1476:
     b = a, d = 984, g = 8;
     break;

    case 1480:
     b = a, d = 985, g = 8;
     break;

    case 1479:
    case 1477:
     break;

    default:
     b = a, d = (f >>> 0 < 984 ? a | 1 : (a << 1) + -24 | 0) + (((f >>> 0) % 82 | 0) * 12 | 0) | 0, g = 8;
    }
    a: do if ((g | 0) == 8) {
     if (g = 0, b >>> 0 > 11 | (b & 1 | 0) == 0) for (b = k[32946] | 0, a = j[65896] | 0, c = d & 1; ;) if (e = b + ((ka(a & 65535, d) | 0) + c << 1) | 0, j[e >> 1] = (l[h + (c >>> 1) >> 0] | 0) << 1, c = c + 2 | 0, c >>> 0 >= 1534) break a;
     for (e = k[32946] | 0, a = 0; ;) {
      if ((a | 0) == 1533) break;
      (a | 0) == 1 ? a = 2 : (c = a + 1 | 0, b = a >>> 1, b = c & 2 ? (l[h + (b + 1) >> 0] | 0) + (l[h + (b + -1) >> 0] | 0) | 0 : (l[h + b >> 0] | 0) << 1, a = e + ((ka(m[65896] | 0, d) | 0) + a << 1) | 0, j[a >> 1] = b, a = c), d ^= 1;
     }
     c = ka(m[65896] | 0, d) | 0, j[e + (c + 1 << 1) >> 1] = (l[h + 1 >> 0] | 0) << 1, j[e + (c + 1533 << 1) >> 1] = (l[h + 765 >> 0] | 0) << 1;
    } while (0);
    f = f + 1 | 0;
   } while ((f | 0) != 1481);
   k[32952] = 510, r = h;
  }
  function kd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0;
   if (k[80] | 0 ? a = 0 : (a = wg(m[65896] | 0, 2) | 0, mc(a, 300256)), b = k[32990] | 0) {
    c = j[65916] | 0, i = 0, d = 0;
    do {
     if (c << 16 >> 16) {
      for (h = 0, b = d; ;) {
       if ((h >>> 0) % ((k[32992] | 0) >>> 0) | 0 ? d = b : (kb(k[140] | 0, (k[33002] | 0) + (b << 2) | 0, 0) | 0, d = k[140] | 0, kb(d | 0, rc() | 0, 0) | 0, d = b + 1 | 0), b = (k[80] | 0) == 0, b | (i | 0) == (k[2] | 0) && (b ? b = j[65896] | 0 : (a = j[65896] | 0, b = a, a = (k[32946] | 0) + ((ka(a & 65535, h) | 0) << 1) | 0), uc(a, b & 65535), !(k[80] | 0) && (c = h - (m[168] | 0) | 0, c >>> 0 < (m[65840] | 0) >>> 0 && (e = k[32928] | 0, f = j[65844] | 0, f << 16 >> 16)))) {
        b = j[164] | 0, g = 0;
        do l = e + ((ka(f & 65535, c) | 0) + g << 3) + (i << 1) | 0, j[l >> 1] = j[a + ((b & 65535) + g << 1) >> 1] | 0, g = g + 1 | 0; while ((g | 0) != (f & 65535 | 0));
       }
       if (h = h + 1 | 0, c = j[65916] | 0, h >>> 0 >= (c & 65535) >>> 0) break;
       b = d;
      }
      b = k[32990] | 0;
     } else c = 0;
     i = i + 1 | 0;
    } while (i >>> 0 < b >>> 0);
   }
   k[80] | 0 || (k[32952] = 65535, k[32930] = 1, vg(a));
  }
  function Od() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   for (g = r, r = r + 2064 | 0, k[g >> 2] = 0, k[g + 4 >> 2] = 0, j[g + 12 >> 1] = 10, c = 0, d = 0; ;) {
    if (a = j[318392 + (c << 1) >> 1] | 0, f = (1024 >>> ((a & 65535) >>> 8) | 0) > 0 ? 1024 >>> ((a & 65535) >>> 8) : 0, (1024 >>> ((a & 65535) >>> 8) | 0) > 0) {
     b = 0, e = d;
     do e = e + 1 | 0, j[g + 12 + (e << 1) >> 1] = a, b = b + 1 | 0; while ((b | 0) != (1024 >>> ((a & 65535) >>> 8) | 0));
    }
    if (c = c + 1 | 0, (c | 0) == 14) break;
    d = d + f | 0;
   }
   if (k[74604] = 0, k[74606] = 0, k[74608] = 0, a = j[65916] | 0, a << 16 >> 16) {
    b = j[65896] | 0, f = 0;
    do {
     if (c = f & 1, b << 16 >> 16) {
      d = 0;
      do a = Lc(g + 12 | 0) | 0, (d | 0) < 2 ? (e = g + (c << 2) + (d << 1) | 0, a = (m[e >> 1] | 0) + a & 65535, j[e >> 1] = a, j[g + 8 + (d << 1) >> 1] = a, a = j[g + 8 + ((d & 1) << 1) >> 1] | 0) : (e = g + 8 + ((d & 1) << 1) | 0, a = (m[e >> 1] | 0) + a & 65535, j[e >> 1] = a), b = j[65896] | 0, e = (ka(b & 65535, f) | 0) + d | 0, j[(k[32946] | 0) + (e << 1) >> 1] = a, (a & 65535) >>> (k[32998] | 0) && (nc(), b = j[65896] | 0), d = d + 1 | 0; while ((d | 0) < (b & 65535 | 0));
      a = j[65916] | 0;
     } else b = 0;
     f = f + 1 | 0;
    } while ((f | 0) < (a & 65535 | 0));
   }
   r = g;
  }
  function _d() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   for (g = r, r = r + 1056 | 0, kb(k[140] | 0, 8, 1) | 0, Zd(g + 32 | 0), k[g >> 2] = 48, b = -48 - (rc() | 0) & -16, k[g + 4 >> 2] = 0 - b, b = b - (rc() | 0) & -16, k[g + 8 >> 2] = 0 - b, b = 0 - (b - (rc() | 0) & -16) | 0, k[g + 12 >> 2] = b, b = 48, a = 0; ;) {
    if (kb(k[140] | 0, b + (k[33002] | 0) | 0, 0) | 0, k[74604] = 0, k[74606] = 0, k[74608] = 0, j[g + 16 + 6 >> 1] = 512, j[g + 16 + 4 >> 1] = 512, j[g + 16 + 2 >> 1] = 512, j[g + 16 >> 1] = 512, b = j[65840] | 0, b << 16 >> 16) {
     c = j[65844] | 0, f = 0;
     do {
      if (e = f & 1, c << 16 >> 16) {
       d = 0;
       do b = Lc(g + 32 | 0) | 0, d >>> 0 < 2 ? (c = g + 16 + (e << 2) + (d << 1) | 0, b = (m[c >> 1] | 0) + b & 65535, j[c >> 1] = b, j[g + 24 + (d << 1) >> 1] = b, b = j[g + 24 + ((d & 1) << 1) >> 1] | 0) : (c = g + 24 + ((d & 1) << 1) | 0, b = (m[c >> 1] | 0) + b & 65535, j[c >> 1] = b), c = j[65844] | 0, h = (ka(c & 65535, f) | 0) + d | 0, j[(k[32928] | 0) + (h << 3) + (a << 1) >> 1] = b, d = d + 1 | 0; while (d >>> 0 < (c & 65535) >>> 0);
       b = j[65840] | 0;
      } else c = 0;
      f = f + 1 | 0;
     } while (f >>> 0 < (b & 65535) >>> 0);
    }
    if (a = a + 1 | 0, (a | 0) == 3) break;
    b = k[g + (a << 2) >> 2] | 0;
   }
   r = g;
  }
  function Xe(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0;
   if (kb(k[140] | 0, a | 0, 0) | 0, a = rc() | 0, a >>> 0 <= 255) {
    if (a) do {
     if (a = a + -1 | 0, b = pc() | 0, d = (pc() | 0) & 65535, e = vb(k[140] | 0) | 0, b << 16 >> 16 == 256) c = pc() | 0, j[65916] = c, c = pc() | 0, j[65896] = c; else if (b << 16 >> 16 == 305) {
      k[80] = 9, b = 0;
      do c = (ib(k[140] | 0) | 0) & 3, i[166720 + (35 - b) >> 0] = c, b = b + 1 | 0; while ((b | 0) != 36);
     } else b << 16 >> 16 == 304 ? (c = (ib(k[140] | 0) | 0) >> 7, k[41272] = c, c = ((ib(k[140] | 0) | 0) >>> 3 & 1 ^ 1) & 65535, j[82540] = c) : b << 16 >> 16 == 289 ? (c = pc() | 0, j[65840] = c, c = pc() | 0, j[65844] = c << 16 >> 16 == 4284 ? 4287 : c) : b << 16 >> 16 == 12272 ? (f = +((pc() | 0) & 65535), o[33005] = f, f = +((pc() | 0) & 65535), o[33004] = f, f = +((pc() | 0) & 65535), o[33007] = f, f = +((pc() | 0) & 65535), o[33006] = f) : b << 16 >> 16 == -16384 && (c = j[284] | 0, j[284] = 18761, b = rc() | 0, b >>> 0 > 1e4 && (b = rc() | 0), j[65844] = b, b = (rc() | 0) & 65535, j[65840] = b, j[284] = c);
     kb(k[140] | 0, e + d | 0, 0) | 0;
    } while ((a | 0) != 0);
    e = k[41272] | 0, j[65840] = (m[65840] | 0) << e, j[65844] = (m[65844] | 0) >>> e;
   }
  }
  function sd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   if (g = r, r = r + 16 | 0, k[75086] = 0, a = j[65840] | 0, a << 16 >> 16) {
    b = j[65896] | 0, f = 0, c = 0;
    do {
     if (b << 16 >> 16) {
      for (e = 0, a = c; ;) {
       if (d = (e | 0) % 14 | 0, d ? c = ((d | 0) % 3 | 0 | 0) == 2 ? 4 >>> (3 - (rd(2) | 0) | 0) : a : (k[g + 4 >> 2] = 0, k[g >> 2] = 0, k[g + 8 + 4 >> 2] = 0, k[g + 8 >> 2] = 0, c = a), a = (k[g + ((d & 1) << 2) >> 2] | 0) == 0, b = rd(8) | 0, a ? (k[g + ((d & 1) << 2) >> 2] = b, (d | 0) > 11 | (b | 0) != 0 && (b = rd(4) | 0 | b << 4, k[g + 8 + ((d & 1) << 2) >> 2] = b)) : b && (a = (k[g + 8 + ((d & 1) << 2) >> 2] | 0) - (128 << c) | 0, (c | 0) == 4 | (a | 0) < 0 && (a &= ~(-1 << c)), k[g + 8 + ((d & 1) << 2) >> 2] = a + (b << c)), d = k[g + 8 + ((e & 1) << 2) >> 2] | 0, a = j[65896] | 0, b = (ka(a & 65535, f) | 0) + e | 0, j[(k[32946] | 0) + (b << 1) >> 1] = d, (d & 65535) >>> 0 > 4098 && (e | 0) < (m[65844] | 0 | 0) ? (nc(), b = j[65896] | 0) : b = a, e = e + 1 | 0, (e | 0) >= (b & 65535 | 0)) break;
       a = c;
      }
      a = j[65840] | 0;
     } else b = 0;
     f = f + 1 | 0;
    } while ((f | 0) < (a & 65535 | 0));
   }
   r = g;
  }
  function oe(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0;
   if (i = r, r = r + 192 | 0, h = k[32932] | 0) {
    f = 0;
    do {
     c = +p[b + (f * 24 | 0) >> 3], d = +p[b + (f * 24 | 0) + 8 >> 3], e = +p[b + (f * 24 | 0) + 16 >> 3], g = 0;
     do p[i + 96 + (f * 24 | 0) + (g << 3) >> 3] = c * +p[232 + (g << 3) >> 3] + 0 + d * +p[256 + (g << 3) >> 3] + e * +p[280 + (g << 3) >> 3], g = g + 1 | 0; while ((g | 0) != 3);
     f = f + 1 | 0;
    } while ((f | 0) != (h | 0));
    b = 0;
    do j = i + 96 + (b * 24 | 0) | 0, c = +p[j >> 3], f = i + 96 + (b * 24 | 0) + 8 | 0, e = +p[f >> 3], g = i + 96 + (b * 24 | 0) + 16 | 0, d = +p[g >> 3], p[j >> 3] = c / (c + 0 + e + d), p[f >> 3] = e / (c + 0 + e + d), p[g >> 3] = d / (c + 0 + e + d), o[131648 + (b << 2) >> 2] = 1 / (c + 0 + e + d), b = b + 1 | 0; while ((b | 0) != (h | 0));
    if (ne(i + 96 | 0, i, h), h) {
     b = 0;
     do o[a + (b << 2) >> 2] = +p[i + (b * 24 | 0) >> 3], b = b + 1 | 0; while ((b | 0) != (h | 0));
     b = 0;
     do o[a + 16 + (b << 2) >> 2] = +p[i + (b * 24 | 0) + 8 >> 3], b = b + 1 | 0; while ((b | 0) != (h | 0));
     b = 0;
     do o[a + 32 + (b << 2) >> 2] = +p[i + (b * 24 | 0) + 16 >> 3], b = b + 1 | 0; while ((b | 0) != (h | 0));
    }
   } else ne(i + 96 | 0, i, h);
   r = i;
  }
  function Je(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0;
   d = r, r = r + 16 | 0, b = pc() | 0;
   a: do if (b << 16 >> 16) for (b &= 65535; ;) {
    switch (b = b + -1 | 0, De(a, d + 12 | 0, d, d + 4 | 0, d + 8 | 0), c = k[d + 12 >> 2] | 0, c | 0) {
    case 6:
     c = rc() | 0, k[41526] = c, c = rc() | 0, k[41527] = c;
     break;

    case 7:
    case 4:
    case 2:
     e = rc() | 0, k[166032 + (((c >>> 0) / 3 | 0) * 6 << 2) >> 2] = e, e = rc() | 0, k[166032 + ((((c >>> 0) / 3 | 0) * 6 | 1) << 2) >> 2] = e, e = rc() | 0, k[166032 + ((((c >>> 0) / 3 | 0) * 6 | 0) + 2 << 2) >> 2] = e, e = rc() | 0, k[166032 + ((((c >>> 0) / 3 | 0) * 6 | 0) + 3 << 2) >> 2] = e, e = rc() | 0, k[166032 + ((((c >>> 0) / 3 | 0) * 6 | 0) + 4 << 2) >> 2] = e, e = rc() | 0, k[166032 + ((((c >>> 0) / 3 | 0) * 6 | 0) + 5 << 2) >> 2] = e;
     break;

    case 29:
    case 18:
     e = k[d + 4 >> 2] | 0, Cb(166032 + (((c >>> 0) / 3 | 0) + 14 << 2) | 0, (e >>> 0 < 12 ? e : 12) | 0, k[140] | 0) | 0;
     break;

    case 5:
    case 3:
    case 1:
     e = La(k[140] | 0) | 0, k[166032 + ((c >>> 1) + 29 << 2) >> 2] = e;
    }
    if (kb(k[140] | 0, k[d + 8 >> 2] | 0, 0) | 0, !b) break a;
   } while (0);
   r = d;
  }
  function Pe(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (g = j[284] | 0, kb(k[140] | 0, a | 0, 0) | 0, !(ib(k[140] | 0) | 0) && (ib(k[140] | 0) | 0) == 77 && (ib(k[140] | 0) | 0) == 82) {
    if (f = (ib(k[140] | 0) | 0) * 257 & 65535, j[284] = f, f = a + 8 + (rc() | 0) | 0, a = vb(k[140] | 0) | 0, (a | 0) < (f | 0)) {
     b = 0, d = 0;
     do c = (ib(k[140] | 0) | 0) << 8, c = (ib(k[140] | 0) | 0 | c) << 8, c = (ib(k[140] | 0) | 0 | c) << 8, c = ib(k[140] | 0) | 0 | c, e = rc() | 0, (c | 0) == 5718599 ? (rc() | 0, c = (og(132096, 588256) | 0) != 0, c = c ? 0 : 3, h = +((pc() | 0) & 65535), o[132016 + (c << 2) >> 2] = h, h = +((pc() | 0) & 65535), o[132016 + ((c ^ 1) << 2) >> 2] = h, h = +((pc() | 0) & 65535), o[132016 + ((c ^ 3) << 2) >> 2] = h, h = +((pc() | 0) & 65535), o[132016 + ((c ^ 2) << 2) >> 2] = h) : (c | 0) == 5263940 ? (kb(k[140] | 0, 8, 1) | 0, b = (pc() | 0) & 65535, d = (pc() | 0) & 65535) : (c | 0) == 5526615 && (Oe(vb(k[140] | 0) | 0) | 0, k[33002] = f), kb(k[140] | 0, a + 8 + e | 0, 0) | 0, a = vb(k[140] | 0) | 0; while ((a | 0) < (f | 0));
     a = d;
    } else b = 0, a = 0;
    j[65916] = b, j[65896] = a, j[284] = g;
   }
  }
  function Hd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, m = 0, n = 0, o = 0;
   if (o = r, r = r + 1536 | 0, a = j[65840] | 0, a << 16 >> 16) {
    b = j[65844] | 0, c = k[32928] | 0, n = 0;
    do {
     if (b << 16 >> 16) {
      for (a = b & 65535, l = 0, m = -1; ;) {
       if (g = a - l | 0, g = (g | 0) > 256 ? 256 : g, Ed(o, g * 3 | 0) | 0, i = m - a | 0, i = (i | 0) > -257 ? ~i : 256, i = (i | 0) > 0 ? i << 2 : 0, (g | 0) > 0) for (a = m - a | 0, a = (a | 0) > -257 ? ~a : 256, b = 0, d = 0, e = 0, f = o, g = 0, h = c; ;) {
        if (b = b + (j[f >> 1] | 0) | 0, j[h >> 1] = b, b & 61440 && nc(), d = d + (j[f + 2 >> 1] | 0) | 0, j[h + 2 >> 1] = d, d & 61440 && nc(), e = e + (j[f + 4 >> 1] | 0) | 0, j[h + 4 >> 1] = e, e & 61440 && nc(), g = g + 1 | 0, (g | 0) == (a | 0)) break;
        f = f + 6 | 0, h = h + 8 | 0;
       }
       if (c = c + (i << 1) | 0, l = l + 256 | 0, b = j[65844] | 0, a = b & 65535, (a | 0) <= (l | 0)) break;
       m = m + 256 | 0;
      }
      a = j[65840] | 0;
     } else b = 0;
     n = n + 1 | 0;
    } while ((n | 0) < (a & 65535 | 0));
   }
   r = o;
  }
  function md() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0;
   if (k[32946] | 0) p = k[2] | 0, p = p >>> 0 < 4 ? p : 4, kb(k[140] | 0, ((p | 0) == 0 ? 0 : (p << 2) + -4 | 0) + (k[33002] | 0) | 0, 0) | 0, p = k[140] | 0, kb(p | 0, rc() | 0, 0) | 0, ld(); else {
    c = wg(m[65896] | 0, 2) | 0, mc(c, 300280), p = 0;
    do {
     if (kb(k[140] | 0, (k[33002] | 0) + (p << 2) | 0, 0) | 0, d = k[140] | 0, kb(d | 0, rc() | 0, 0) | 0, d = p >>> 1 & 1, e = p & 1, j[65916] | 0) {
      o = 0;
      do {
       if (uc(c, m[65896] | 0), f = o - (m[168] | 0) - d | 0, f >>> 0 < (m[65840] | 0) >>> 0 && (g = 0 - (o & 1) & 3 ^ 1, h = k[32928] | 0, i = j[65896] | 0, i << 16 >> 16)) {
        a = j[164] | 0, b = j[65844] | 0, n = 0;
        do l = n - (a & 65535) - e | 0, l >>> 0 < (b & 65535) >>> 0 && (l = h + ((ka(b & 65535, f) | 0) + l << 3) + ((g ^ n & 1) << 1) | 0, j[l >> 1] = j[c + (n << 1) >> 1] | 0), n = n + 1 | 0; while ((n | 0) != (i & 65535 | 0));
       }
       o = o + 1 | 0;
      } while (o >>> 0 < (m[65916] | 0) >>> 0);
     }
     p = p + 1 | 0;
    } while ((p | 0) != 4);
    vg(c), k[35116] = 1;
   }
  }
  function Qf(a) {
   a = +a;
   var b = 0, c = 0, d = 0;
   c = r, r = r + 16 | 0, p[t >> 3] = a, b = k[t + 4 >> 2] | 0;
   do if ((b & 2147483647) >>> 0 > 1083174911) {
    if (((b | 0) > -1 | (b | 0) == -1 & (k[t >> 2] | 0) >>> 0 > 4294967295) & (b & 2147483647) >>> 0 > 1083179007) return a *= 8.98846567431158e307, r = c, +a;
    if ((b & 2147483647) >>> 0 > 2146435071) return a = -1 / a, r = c, +a;
    if ((b | 0) < 0) {
     if (a <= -1075) return o[c >> 2] = -1.401298464324817e-45 / a, a = 0, r = c, +a;
     if (a + -4503599627370496 + 4503599627370496 == a) break;
     o[c >> 2] = -1.401298464324817e-45 / a;
     break;
    }
   } else if ((b & 2147483647) >>> 0 < 1016070144) return a += 1, r = c, +a; while (0);
   return p[t >> 3] = a + 26388279066624, b = (k[t >> 2] | 0) + 128 | 0, d = +p[625480 + ((b << 1 & 510) << 3) >> 3], a = a - (a + 26388279066624 + -26388279066624) - +p[625480 + ((b << 1 & 510 | 1) << 3) >> 3], a = +Wf(d + d * a * (a * (a * (a * (a * .0013333559164630223 + .009618129842126066) + .0555041086648214) + .2402265069591) + .6931471805599453), (b & -256 | 0) / 256 | 0), r = c, +a;
  }
  function Kd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   if (g = r, r = r + 48 | 0, kb(k[140] | 0, 200896, 0) | 0, e = k[140] | 0, kb(e | 0, ((ib(e | 0) | 0) << 2) + -1 | 0, 1) | 0, j[284] = 19789, e = rc() | 0, kb(k[140] | 0, 164600, 0) | 0, Ga(g | 0, 1, 40, k[140] | 0) | 0, Jd(g, 10, 1, e), e = l[g + 22 >> 0] | (l[g + 23 >> 0] | (l[g + 24 >> 0] | (l[g + 25 >> 0] | e << 8) << 8) << 8) << 8, kb(k[140] | 0, k[33002] | 0, 0) | 0, j[65916] | 0) {
    a = j[65896] | 0, f = 0;
    do {
     if (d = k[32946] | 0, b = a & 65535, c = ka(b, f) | 0, b = Ga(d + (c << 1) | 0, 2, b | 0, k[140] | 0) | 0, a = j[65896] | 0, b >>> 0 < (a & 65535) >>> 0 && (nc(), a = j[65896] | 0), Jd(d + (c << 1) | 0, (a & 65535) >>> 1 & 65535, (f | 0) == 0 & 1, e), a << 16 >> 16) {
      b = 0;
      do i = d + (b + c << 1) | 0, h = Oa(j[i >> 1] | 0) | 0, j[i >> 1] = h, (h & 65535) > 16383 && (nc(), a = j[65896] | 0), b = b + 1 | 0; while (b >>> 0 < (a & 65535) >>> 0);
     } else a = 0;
     f = f + 1 | 0;
    } while (f >>> 0 < (m[65916] | 0) >>> 0);
   }
   k[32952] = 16368, r = g;
  }
  function Dc(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0;
   do if ((a | 0) > 25) c = 0; else {
    if ((a | 0) < 0) {
     k[74604] = 0, k[74606] = 0, k[74608] = 0, c = 0;
     break;
    }
    if (c = k[74606] | 0, (a | 0) == 0 | (c | 0) < 0) c = 0; else {
     a: do if ((k[74604] | 0) == 0 & (c | 0) < (a | 0)) for (;;) {
      if (e = ib(k[140] | 0) | 0, (e | 0) == -1) {
       f = 9;
       break a;
      }
      if ((e | 0) == 255 & (k[32954] | 0) != 0) {
       if (d = (ib(k[140] | 0) | 0) != 0, k[74604] = d & 1, c = k[74608] | 0, d) break a;
       d &= 1;
      } else k[74604] = 0, c = k[74608] | 0, d = 0;
      if (k[74608] = c << 8 | e & 255, e = (k[74606] | 0) + 8 | 0, k[74606] = e, !((d | 0) == 0 & (e | 0) < (a | 0))) {
       f = 9;
       break;
      }
     } else f = 9; while (0);
     (f | 0) == 9 && (c = k[74608] | 0), d = k[74606] | 0, c = c << 32 - d >>> (32 - a | 0), b ? (c = m[b + (c << 1) >> 1] | 0, k[74606] = d - (c >>> 8), d = d - (c >>> 8) | 0, c &= 255) : (k[74606] = d - a, d = d - a | 0), (d | 0) < 0 && nc();
    }
   } while (0);
   return c | 0;
  }
  function Fd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   if (h = r, r = r + 528 | 0, a = j[65840] | 0, a << 16 >> 16) {
    b = j[65844] | 0, g = 0;
    do {
     if (b << 16 >> 16) {
      for (a = b & 65535, e = 0, f = -1; ;) {
       if (k[h + 4 >> 2] = 0, k[h >> 2] = 0, c = a - e | 0, c = (c | 0) > 256 ? 256 : c, d = (Ed(h + 8 | 0, c) | 0) == 0, (c | 0) > 0) {
        b = f - a | 0, b = (b | 0) > -257 ? ~b : 256, c = 0;
        do a = j[h + 8 + (c << 1) >> 1] | 0, d && (i = h + ((c & 1) << 2) | 0, a = (k[i >> 2] | 0) + a | 0, k[i >> 2] = a), i = j[576 + (a << 1) >> 1] | 0, a = c + e + (ka(m[65896] | 0, g) | 0) | 0, j[(k[32946] | 0) + (a << 1) >> 1] = i, (i & 65535) > 4095 && nc(), c = c + 1 | 0; while ((c | 0) != (b | 0));
       }
       if (e = e + 256 | 0, b = j[65844] | 0, a = b & 65535, (a | 0) <= (e | 0)) break;
       f = f + 256 | 0;
      }
      a = j[65840] | 0;
     } else b = 0;
     g = g + 1 | 0;
    } while ((g | 0) < (a & 65535 | 0));
   }
   r = h;
  }
  function Bd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   if (c = wg(m[65896] | 0, 2) | 0, mc(c, 317680), j[65840] | 0) {
    e = 0;
    do {
     if ((Ga(c | 0, m[65896] | 0, 2, k[140] | 0) | 0) >>> 0 < 2 && nc(), (e & 31 | 0) == 31 & (k[32962] | 0) != 0 && kb(k[140] | 0, m[65896] << 5 | 0, 1) | 0, a = k[32928] | 0, b = j[65844] | 0, b << 16 >> 16) {
      d = 0;
      do h = d << 1, g = l[c + (h & -4 | 1) >> 0] | 0, i = (l[c + (h | 3) >> 0] | 0) + -128 | 0, h = (l[c + h >> 0] | 0) - (g + -126 + i >> 2) | 0, i = (i + h | 0) < 255 ? i + h | 0 : 255, f = (ka(b & 65535, e) | 0) + d | 0, j[a + (f << 3) >> 1] = j[576 + (((i | 0) < 0 ? 0 : i) << 1) >> 1] | 0, i = (h | 0) < 255 ? h : 255, j[a + (f << 3) + 2 >> 1] = j[576 + (((i | 0) < 0 ? 0 : i) << 1) >> 1] | 0, g = (h + (g + -128) | 0) < 255 ? h + (g + -128) | 0 : 255, j[a + (f << 3) + 4 >> 1] = j[576 + (((g | 0) < 0 ? 0 : g) << 1) >> 1] | 0, d = d + 1 | 0; while ((d | 0) != (b & 65535 | 0));
     }
     e = e + 1 | 0;
    } while ((e | 0) < (m[65840] | 0));
   }
   vg(c), k[32952] = m[543];
  }
  function pe(a, b, c, d, e) {
   a |= 0, b |= 0, c |= 0, d |= 0, e |= 0;
   var f = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
   if ((e | 0) > 0) {
    f = 0;
    do i = b + ((ka(f, c) | 0) << 2) | 0, g = b + ((ka(e - f | 0, c) | 0) << 2) | 0, h = b + ((ka(f + e | 0, c) | 0) << 2) | 0, o[a + (f << 2) >> 2] = +o[i >> 2] * 2 + +o[g >> 2] + +o[h >> 2], f = f + 1 | 0; while ((f | 0) != (e | 0));
   }
   if (f = (e | 0) > 0 ? e : 0, h = (f + e | 0) < (d | 0) ? d : f + e | 0, (f + e | 0) < (d | 0)) {
    g = f + e | 0;
    do k = b + ((ka(f, c) | 0) << 2) | 0, j = b + ((ka(f - e | 0, c) | 0) << 2) | 0, i = b + ((ka(g, c) | 0) << 2) | 0, o[a + (f << 2) >> 2] = +o[k >> 2] * 2 + +o[j >> 2] + +o[i >> 2], f = f + 1 | 0, g = f + e | 0; while ((g | 0) < (d | 0));
   }
   if ((h - e | 0) < (d | 0)) {
    f = h - e | 0;
    do i = b + ((ka(f, c) | 0) << 2) | 0, j = b + ((ka(f - e | 0, c) | 0) << 2) | 0, k = b + ((ka((d << 1) + -2 - e - f | 0, c) | 0) << 2) | 0, o[a + (f << 2) >> 2] = +o[i >> 2] * 2 + +o[j >> 2] + +o[k >> 2], f = f + 1 | 0; while ((f | 0) != (d | 0));
   }
  }
  function Jd(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0, f = 0, g = 0;
   if (c) {
    for (c = (ka(d, 48828125) | 0) + 1 | 0, k[79454] = c, d = (ka(c, 48828125) | 0) + 1 | 0, k[79455] = d, d = (ka(d, 48828125) | 0) + 1 | 0, k[79456] = d, k[79452] = 4, e = (d ^ c) >>> 31 | (ka(d, 97656250) | 0) + 2, k[79457] = e, f = 4; ;) {
     if (g = c, c = k[317816 + (f + -3 << 2) >> 2] | 0, d = (e ^ c) >>> 31 | (d ^ g) << 1, k[317816 + (f << 2) >> 2] = d, f = f + 1 | 0, (f | 0) == 127) break;
     g = e, e = d, d = g;
    }
    k[79452] = 127, d = 0;
    do g = 317816 + (d << 2) | 0, f = Sa(k[g >> 2] | 0) | 0, k[g >> 2] = f, d = d + 1 | 0; while ((d | 0) != 127);
    k[79452] = 127;
   }
   a: do if (b) for (d = b, c = k[79452] | 0; ;) {
    if (d = d + -1 | 0, e = c, c = c + 1 | 0, k[79452] = c, !e) break a;
    if (g = k[317816 + ((e + 65 & 127) << 2) >> 2] ^ k[317816 + ((c & 127) << 2) >> 2], k[317816 + ((e & 127) << 2) >> 2] = g, k[a >> 2] = k[a >> 2] ^ g, !d) break;
    a = a + 4 | 0;
   } while (0);
  }
  function Ld() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   for (g = r, r = r + 65552 | 0, j[g >> 1] = 15, c = 0, d = 0; ;) {
    if (a = j[318328 + (c << 1) >> 1] | 0, f = (32768 >>> ((a & 65535) >>> 8) | 0) > 0 ? 32768 >>> ((a & 65535) >>> 8) : 0, (32768 >>> ((a & 65535) >>> 8) | 0) > 0) {
     b = 0, e = d;
     do e = e + 1 | 0, j[g + (e << 1) >> 1] = a, b = b + 1 | 0; while ((b | 0) != (32768 >>> ((a & 65535) >>> 8) | 0));
    }
    if (c = c + 1 | 0, (c | 0) == 18) break;
    d = d + f | 0;
   }
   if (k[74604] = 0, k[74606] = 0, k[74608] = 0, a = j[65896] | 0, a << 16 >> 16) for (a &= 65535, b = j[65916] | 0, d = 0; ;) {
    for (a = a + -1 | 0, f = b & 65535, b = 0; ;) {
     if (b = (b | 0) == (f | 0) ? 1 : b, d = (Lc(g) | 0) + d | 0, d >>> 0 > 4095 && nc(), (b | 0) < (m[65840] | 0 | 0) && (f = (ka(m[65896] | 0, b) | 0) + a | 0, j[(k[32946] | 0) + (f << 1) >> 1] = d), c = j[65916] | 0, f = c & 65535, (b + 1 | 0) >= (f | 0)) break;
     b = b + 2 | 0;
    }
    if (!a) break;
    b = c;
   }
   r = g;
  }
  function Cd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, n = 0;
   if (c = wg(m[65896] | 0, 3) | 0, mc(c, 317704), j[65840] | 0) {
    f = 0;
    do {
     if (d = f & 1, d || (Ga(c | 0, m[65896] | 0, 3, k[140] | 0) | 0) >>> 0 < 3 && nc(), a = k[32928] | 0, b = j[65844] | 0, b << 16 >> 16) {
      e = 0;
      do n = (b & 65535) + (e & -2) | 0, h = l[c + n >> 0] | 0, n = (l[c + (n + 1) >> 0] | 0) + -128 | 0, i = (l[c + (((b & 65535) << 1 & 0 - d) + e) >> 0] | 0) - (h + -126 + n >> 2) | 0, n = (n + i | 0) < 255 ? n + i | 0 : 255, g = (ka(b & 65535, f) | 0) + e | 0, j[a + (g << 3) >> 1] = j[576 + (((n | 0) < 0 ? 0 : n) << 1) >> 1] | 0, n = (i | 0) < 255 ? i : 255, j[a + (g << 3) + 2 >> 1] = j[576 + (((n | 0) < 0 ? 0 : n) << 1) >> 1] | 0, h = (i + (h + -128) | 0) < 255 ? i + (h + -128) | 0 : 255, j[a + (g << 3) + 4 >> 1] = j[576 + (((h | 0) < 0 ? 0 : h) << 1) >> 1] | 0, e = e + 1 | 0; while ((e | 0) != (b & 65535 | 0));
     }
     f = f + 1 | 0;
    } while ((f | 0) < (m[65840] | 0));
   }
   vg(c), k[32952] = m[543];
  }
  function xc(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0;
   c = k[a + 4 >> 2] | 0;
   do if (+o[32916] != 0) {
    if ((c | 0) < -104) {
     k[a + 4 >> 2] = -104, c = -104, d = 1, f = 12;
     break;
    }
    (c | 0) > 12 ? (k[a + 4 >> 2] = 12, c = 12, d = 1, f = 12) : (d = 0, f = 12);
   } else if ((c + 264 | 0) >>> 0 > 725) c = 2; else {
    if ((c | 0) < -50) {
     k[a + 4 >> 2] = -50, c = -50, d = 1, f = 12;
     break;
    }
    if ((c | 0) > 307) k[a + 4 >> 2] = 307, c = 307, d = 1; else {
     if ((c | 0) < 197) {
      d = 0, f = 12;
      break;
     }
     d = 0;
    }
    e = (c * 48 >> 10) + -123 | 0, f = 14;
   } while (0);
   (f | 0) == 12 && (e = -38 - (c * 398 >> 10) | 0, f = 14);
   do if ((f | 0) == 14) {
    if (c = k[a >> 2] | 0, (e - b | 0) <= (c | 0) && !((d | 0) != 0 | (e + 20 | 0) < (c | 0))) {
     c = 0;
     break;
    }
    c = e - c | 0, (((c | 0) > -1 ? c : 0 - c | 0) | 0) < (b << 2 | 0) ? (c = (c | 0) < -20 ? -20 : c, k[a >> 2] = e - ((c | 0) > (b | 0) ? b : c), c = 1) : c = 2;
   } while (0);
   return c | 0;
  }
  function lg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   a: do if ((c | 0) != 0 & (a & 3 | 0) != 0) for (d = c; ;) {
    if ((i[a >> 0] | 0) == (b & 255) << 24 >> 24) break a;
    if (a = a + 1 | 0, c = d + -1 | 0, !((c | 0) != 0 & (a & 3 | 0) != 0)) {
     d = c, c = (c | 0) != 0, e = 5;
     break;
    }
    d = c;
   } else d = c, c = (c | 0) != 0, e = 5; while (0);
   b: do if ((e | 0) == 5) if (c) {
    if ((i[a >> 0] | 0) != (b & 255) << 24 >> 24) {
     c = ka(b & 255, 16843009) | 0;
     c: do if (d >>> 0 > 3) for (;;) {
      if (f = k[a >> 2] ^ c, (f & -2139062144 ^ -2139062144) & f + -16843009) break;
      if (a = a + 4 | 0, d = d + -4 | 0, d >>> 0 <= 3) {
       e = 11;
       break c;
      }
     } else e = 11; while (0);
     if ((e | 0) == 11 && !d) {
      d = 0;
      break;
     }
     for (;;) {
      if ((i[a >> 0] | 0) == (b & 255) << 24 >> 24) break b;
      if (a = a + 1 | 0, d = d + -1 | 0, !d) {
       d = 0;
       break;
      }
     }
    }
   } else d = 0; while (0);
   return ((d | 0) != 0 ? a : 0) | 0;
  }
  function Ac() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;
   if (e = r, r = r + 1120 | 0, j[65840] | 0) for (d = 0, c = 0; ;) {
    for ((Ga(e | 0, 1, 1120, k[140] | 0) | 0) >>> 0 < 1120 && nc(), a = e, b = (k[32946] | 0) + ((ka(m[65896] | 0, c) | 0) << 1) | 0; ;) {
     if (f = a + 1 | 0, j[b >> 1] = (l[f >> 0] | 0) >>> 6 | l[a >> 0] << 2, j[b + 2 >> 1] = (l[f >> 0] | 0) >>> 4 & 3 | l[a + 2 >> 0] << 2, j[b + 4 >> 1] = (l[f >> 0] | 0) >>> 2 & 3 | l[a + 3 >> 0] << 2, j[b + 6 >> 1] = l[f >> 0] & 3 | l[a + 4 >> 0] << 2, f = a + 9 | 0, j[b + 8 >> 1] = l[f >> 0] & 3 | l[a + 5 >> 0] << 2, j[b + 10 >> 1] = (l[f >> 0] | 0) >>> 2 & 3 | l[a + 6 >> 0] << 2, j[b + 12 >> 1] = (l[f >> 0] | 0) >>> 4 & 3 | l[a + 7 >> 0] << 2, j[b + 14 >> 1] = (l[f >> 0] | 0) >>> 6 | l[a + 8 >> 0] << 2, a = a + 10 | 0, a >>> 0 >= (e + 1120 | 0) >>> 0) break;
     b = b + 16 | 0;
    }
    if (a = c + 2 | 0, b = m[65840] | 0, d = d + 1 | 0, (d | 0) >= (b | 0)) break;
    c = (a | 0) > (b | 0) ? 1 : a;
   }
   r = e;
  }
  function cd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   if (g = r, r = r + 80 | 0, a = j[65896] | 0, b = j[65916] | 0, (Ga(g + 64 | 0, 1, 10, k[140] | 0) | 0) == 10) for (c = 0, f = 5, d = (ka((a & 65535) * 5 | 0, b & 65535) | 0) >>> 3, e = 0; ;) {
    for (a = 0, b = e; ;) {
     if (k[g + (a << 2) >> 2] = b, b = b + 1 | 0, h = l[g + 64 + a >> 0] | 0, i = a | 1, k[g + (i << 2) >> 2] = h << 8 | (l[g + 64 + i >> 0] | 0), c = h >>> 2 | c << 6, (b | 0) == (f | 0)) break;
     a = a + 2 | 0;
    }
    k[g + 40 >> 2] = d, k[g + 44 >> 2] = c >>> 20, k[g + 48 >> 2] = d + 1, k[g + 52 >> 2] = c >>> 10, k[g + 56 >> 2] = d + 2, k[g + 60 >> 2] = c, a = k[32946] | 0, b = 0;
    do j[a + (k[g + (b << 2) >> 2] << 1) >> 1] = k[g + ((b | 1) << 2) >> 2] & 1023, b = b + 2 | 0; while (b >>> 0 < 16);
    if ((Ga(g + 64 | 0, 1, 10, k[140] | 0) | 0) != 10) break;
    f = f + 5 | 0, d = d + 3 | 0, e = e + 5 | 0;
   }
   k[32952] = 1023, r = g;
  }
  function Wd(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   h = r, r = r + 16 | 0;
   a: for (;;) {
    if (d = (b | 0) != 0) f = k[41264] | 0; else {
     if (a) {
      c = 0;
      do f = rc() | 0, k[318496 + (c << 2) >> 2] = f, c = c + 1 | 0; while ((c | 0) != (a | 0));
     }
     Jg(140480, 0, 24576) | 0, k[41264] = 140480, f = 140480;
    }
    if (e = f + 12 | 0, k[41264] = e, e >>> 0 > 165056) {
     g = 8;
     break;
    }
    if (d) {
     if (a) {
      c = 0;
      do {
       if ((k[318496 + (c << 2) >> 2] | 0) == (b | 0)) {
        g = 12;
        break a;
       }
       c = c + 1 | 0;
      } while (c >>> 0 < a >>> 0);
     }
     if (b >>> 0 > 3623878655) break;
    }
    d = b + 134217728 & -134217728 | b << 1 & 134217726, k[f >> 2] = e, Wd(a, d), k[f + 4 >> 2] = k[41264], b = d | 1;
   }
   (g | 0) == 8 ? (g = k[w >> 2] | 0, k[h >> 2] = k[96], Jb(g | 0, 322592, h | 0) | 0, Qa(392, 2)) : (g | 0) == 12 && (k[f + 8 >> 2] = c), r = h;
  }
  function uf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   f = r, r = r + 16 | 0, k[f >> 2] = a, e = (c | 0) == 0 ? 625136 : c, d = k[e >> 2] | 0;
   a: do {
    if (b) {
     a || (k[f >> 2] = f, a = f), c = i[b >> 0] | 0;
     do {
      if (!d) {
       if (c << 24 >> 24 > -1) return k[a >> 2] = c & 255, e = c << 24 >> 24 != 0 & 1, r = f, e | 0;
       if (((c & 255) + -194 | 0) >>> 0 > 50) break a;
       c = k[624928 + ((c & 255) + -194 << 2) >> 2] | 0;
       break;
      }
      if ((((c & 255) >>> 3) + -16 | ((c & 255) >>> 3) + (d >> 26)) >>> 0 > 7) break a;
      if (!(((c & 255) + -128 | d << 6 | 0) < 0)) return k[e >> 2] = 0, k[a >> 2] = (c & 255) + -128 | d << 6, e = 1, r = f, e | 0;
      c = (c & 255) + -128 | d << 6;
     } while (0);
     return k[e >> 2] = c, e = -2, r = f, e | 0;
    }
    if (!d) return e = 0, r = f, e | 0;
   } while (0);
   return k[e >> 2] = 0, e = wb() | 0, k[e >> 2] = 84, e = -1, r = f, e | 0;
  }
  function qd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0;
   if (a = j[65916] | 0, a << 16 >> 16) {
    b = j[65896] | 0, n = 0;
    do {
     if (i = n + -2 | 0, l = (n | 0) < 2, (b & 65535) > 2) {
      h = 0;
      do {
       e = rc() | 0, f = k[32946] | 0, b = j[65896] | 0, g = 0;
       do a = g + h | 0, (a | 0) < 4 ? l ? (d = b & 65535, a = (b & 65535) + (a + -4) | 0, c = (m[65916] | 0) + i | 0) : (d = b & 65535, a = (b & 65535) + (a + -4) | 0, c = i) : (d = b & 65535, a = a + -4 | 0, c = n), c = f + ((ka(d, c) | 0) + a << 1) | 0, j[c >> 1] = j[576 + ((e >> (g * 10 | 0) + 2 & 1023) << 1) >> 1] | 0, g = g + 1 | 0; while ((g | 0) != 3);
       h = h + 3 | 0;
      } while ((h | 0) < (d + -2 | 0));
      a = j[65916] | 0;
     }
     n = n + 1 | 0;
    } while ((n | 0) < (a & 65535 | 0));
   }
   k[32952] = m[1311];
  }
  function bf() {
   var a = 0, b = 0, c = 0, d = 0;
   if (b = r, r = r + 16 | 0, j[284] = 19789, k[32994] = 0, kb(k[140] | 0, 52, 0) | 0, d = (rc() | 0) & 65535, j[65844] = d, d = (rc() | 0) & 65535, j[65840] = d, kb(k[140] | 0, 0, 2) | 0, d = k[140] | 0, c = (zb(d | 0) | 0) & 511, kb(d | 0, 0 - c | 0, 1) | 0, (rc() | 0) == (c | 0) && (rc() | 0) == 1380273986 ? (c = rc() | 0, kb(k[140] | 0, 12, 1) | 0, d = rc() | 0, k[32994] = d, hb(k[140] | 0, c + 8 + (k[2] << 2) | 0, 0) | 0, c = rc() | 0, k[33002] = c) : a = 3, (a | 0) == 3 && (a = k[w >> 2] | 0, k[b >> 2] = k[96], Jb(a | 0, 588848, b | 0) | 0, kb(k[140] | 0, 0, 0) | 0, a = rc() | 0, (a | 0) != -1)) do (rc() | 0) == 1380271190 && (c = k[32994] | 0, k[32994] = c + 1, (c | 0) == (k[2] | 0) && (c = (zb(k[140] | 0) | 0) + -8 | 0, k[33002] = c)), kb(k[140] | 0, a + -8 | 0, 1) | 0, a = rc() | 0; while ((a | 0) != -1);
   r = b;
  }
  function Sc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;
   if (f = r, r = r + 16 | 0, d = wg(m[65896] | 0, k[32990] << 1) | 0, mc(d, 299624), j[65916] | 0) {
    e = 0;
    do {
     b = k[32998] | 0;
     a: do if ((b | 0) == 16) uc(d, ka(m[65896] | 0, k[32990] | 0) | 0), a = j[65896] | 0; else if (k[74604] = 0, k[74606] = 0, k[74608] = 0, a = j[65896] | 0, ka(a & 65535, k[32990] | 0) | 0) for (a = 0; ;) {
      if (c = (Dc(b, 0) | 0) & 65535, j[d + (a << 1) >> 1] = c, c = a + 1 | 0, a = j[65896] | 0, c >>> 0 >= (ka(a & 65535, k[32990] | 0) | 0) >>> 0) break a;
      b = k[32998] | 0, a = c;
     } while (0);
     if (k[f >> 2] = d, a << 16 >> 16) {
      a &= 65535, b = 0;
      do Pc(e, b, f), b = b + 1 | 0; while ((b | 0) != (a | 0));
     }
     e = e + 1 | 0;
    } while ((e | 0) < (m[65916] | 0));
   }
   vg(d), r = f;
  }
  function of(a, b, c, d, e, f) {
   a |= 0, b |= 0, c |= 0, d |= 0, e |= 0, f |= 0;
   var g = 0, h = 0;
   h = j[b >> 1] | 0, j[b >> 1] = h + 1 << 16 >> 16, g = b + 2 + ((h & 65535) * 12 | 0) + 8 | 0, k[g >> 2] = f;
   do {
    if (!(d << 16 >> 16 == 1 & (e | 0) < 5)) {
     if (d << 16 >> 16 == 2) {
      if (e = (Df(a + f | 0, e + -1 | 0) | 0) + 1 | 0, (e | 0) >= 5) break;
      i[g >> 0] = i[a + f >> 0] | 0, i[g + 1 >> 0] = i[a + (f + 1) >> 0] | 0, i[g + 2 >> 0] = i[a + (f + 2) >> 0] | 0, i[g + 3 >> 0] = i[a + (f + 3) >> 0] | 0;
      break;
     }
     if (!(d << 16 >> 16 == 3 & (e | 0) < 3)) break;
     j[g >> 1] = f, j[g + 2 >> 1] = f >>> 16;
     break;
    }
    i[g >> 0] = f, i[g + 1 >> 0] = f >>> 8, i[g + 2 >> 0] = f >>> 16, i[g + 3 >> 0] = f >>> 24;
   } while (0);
   k[b + 2 + ((h & 65535) * 12 | 0) + 4 >> 2] = e, j[b + 2 + ((h & 65535) * 12 | 0) + 2 >> 1] = d, j[b + 2 + ((h & 65535) * 12 | 0) >> 1] = c;
  }
  function tc(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0;
   switch (d = r, r = r + 16 | 0, a | 0) {
   case 9:
    b = +(rc() | 0);
    break;

   case 10:
    b = +(rc() | 0), p[d >> 3] = b, b /= +(rc() | 0);
    break;

   case 3:
    b = +((pc() | 0) & 65535);
    break;

   case 11:
    c = rc() | 0, k[t >> 2] = c, b = +o[t >> 2];
    break;

   case 5:
    b = +((rc() | 0) >>> 0), p[d >> 3] = b, b /= +((rc() | 0) >>> 0);
    break;

   case 8:
    b = +((pc() | 0) << 16 >> 16);
    break;

   case 12:
    a = 0 - (((j[284] | 0) == 18761 ^ (Oa(4660) | 0) << 16 >> 16 == 4660) & 1 ^ 1) & 7, c = 0;
    do e = (ib(k[140] | 0) | 0) & 255, i[d + (c ^ a) >> 0] = e, c = c + 1 | 0; while ((c | 0) != 8);
    b = +p[d >> 3];
    break;

   case 4:
    b = +((rc() | 0) >>> 0);
    break;

   default:
    b = +(ib(k[140] | 0) | 0);
   }
   return r = d, +b;
  }
  function Ec(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, m = 0, n = 0, o = 0, p = 0;
   for (p = k[a >> 2] | 0, k[a >> 2] = p + 16, c = 16; ;) {
    if (!c) {
     c = 0;
     break;
    }
    if (b = c + -1 | 0, i[p + b >> 0] | 0) break;
    c = b;
   }
   if (m = 1 << c, n = wg(m + 1 | 0, 2) | 0, mc(n, 298440), j[n >> 1] = c, (c | 0) >= 1) for (b = 1, o = 1; ;) {
    if (f = p + (o + -1) | 0, g = c - o | 0, h = o << 8, i[f >> 0] | 0) {
     e = 0;
     do {
      if ((g | 0) != 31) {
       d = 0;
       do (b | 0) <= (m | 0) && (j[n + (b << 1) >> 1] = l[k[a >> 2] >> 0] | h, b = b + 1 | 0), d = d + 1 | 0; while ((d | 0) < (1 << g | 0));
      }
      e = e + 1 | 0, k[a >> 2] = (k[a >> 2] | 0) + 1;
     } while ((e | 0) < (l[f >> 0] | 0));
    }
    if ((c | 0) == (o | 0)) break;
    o = o + 1 | 0;
   }
   return n | 0;
  }
  function Bc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0, n = 0, o = 0, p = 0, q = 0;
   if (g = k[80] | 0, h = k[32928] | 0, i = k[32950] | 0, l = j[65840] | 0, l << 16 >> 16) {
    f = j[65844] | 0, a = f, n = 0;
    do {
     if (d = n << 1 & 14, e = n & 3, a << 16 >> 16) {
      a = j[65848] | 0, b = j[65852] | 0, c = 0;
      do p = c & 1, o = h + ((ka(n >> (a & 65535), b & 65535) | 0) + (c >> (a & 65535)) << 3) + ((g >>> ((p | d) << 1) & 3) << 1) | 0, q = (m[o >> 1] | 0) - i | 0, p = (ka((q | 0) < 0 ? 0 : q, j[298400 + (e << 2) + (p << 1) >> 1] | 0) | 0) >>> 9 & 65535, j[o >> 1] = p, c = c + 1 | 0; while ((c | 0) < (f & 65535 | 0));
      a = f;
     } else a = 0;
     n = n + 1 | 0;
    } while ((n | 0) != (l & 65535 | 0));
   }
   wc(), yc(), zc(), k[32952] = ((1023 - i | 0) * 1109 | 0) >>> 9, k[32950] = 0;
  }
  function ld() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;
   a = k[32952] | 0, f = 0;
   do f = f + 1 | 0; while (1 << f >>> 0 < a >>> 0);
   if (uc(k[32946] | 0, ka(m[65916] | 0, m[65896] | 0) | 0), j[65916] | 0) {
    b = j[65896] | 0, a = b, e = 0;
    do {
     if (a << 16 >> 16) for (d = a & 65535, c = 0; ;) {
      if (a = (ka(d, e) | 0) + c | 0, a = (k[32946] | 0) + (a << 1) | 0, d = (m[a >> 1] | 0) >>> (k[32962] | 0), j[a >> 1] = d, (d & 65535) >>> f && (e - (m[168] | 0) | 0) >>> 0 < (m[65840] | 0) >>> 0 && (c - (m[164] | 0) | 0) >>> 0 < (m[65844] | 0) >>> 0 ? (nc(), a = j[65896] | 0) : a = b, c = c + 1 | 0, d = a & 65535, (c | 0) >= (d | 0)) {
       b = a;
       break;
      }
      b = a;
     } else a = 0;
     e = e + 1 | 0;
    } while ((e | 0) < (m[65916] | 0));
   }
  }
  function He(a) {
   a |= 0;
   var b = 0, c = 0, d = 0;
   if (d = r, r = r + 96 | 0, i[d + 68 + 19 >> 0] = 0, a) {
    for (a = 18; ;) {
     if (c = (ib(k[140] | 0) | 0) & 255, i[d + 68 + a >> 0] = c, !a) break;
     a = a + -1 | 0;
    }
    a = d + 68 | 0;
   } else Ga(d + 68 | 0, 19, 1, k[140] | 0) | 0, a = d + 68 | 0;
   b = d + 24 | 0, c = b + 44 | 0;
   do k[b >> 2] = 0, b = b + 4 | 0; while ((b | 0) < (c | 0));
   k[d >> 2] = d + 24 + 20, k[d + 4 >> 2] = d + 24 + 16, k[d + 8 >> 2] = d + 24 + 12, k[d + 12 >> 2] = d + 24 + 8, k[d + 16 >> 2] = d + 24 + 4, k[d + 20 >> 2] = d + 24, (xf(a, 587680, d) | 0) == 6 && (k[d + 24 + 20 >> 2] = (k[d + 24 + 20 >> 2] | 0) + -1900, k[d + 24 + 16 >> 2] = (k[d + 24 + 16 >> 2] | 0) + -1, k[d + 24 + 32 >> 2] = -1, (Gb(d + 24 | 0) | 0) > 0 && (c = Gb(d + 24 | 0) | 0, k[41306] = c)), r = d;
  }
  function Pc(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0;
   if (h = k[32990] | 0, i = (h | 0) == 2 & (k[2] | 0) != 0, i && (k[c >> 2] = (k[c >> 2] | 0) + 2), e = k[32946] | 0) (m[65916] | 0) >>> 0 > a >>> 0 && (d = m[65896] | 0, d >>> 0 > b >>> 0 && (l = e + ((ka(d, a) | 0) + b << 1) | 0, j[l >> 1] = j[576 + ((m[k[c >> 2] >> 1] | 0) << 1) >> 1] | 0)); else if ((m[65840] | 0) >>> 0 > a >>> 0 && (d = m[65844] | 0, d >>> 0 > b >>> 0 && (e = k[32928] | 0, h))) {
    f = k[c >> 2] | 0, g = 0;
    do l = e + ((ka(d, a) | 0) + b << 3) + (g << 1) | 0, j[l >> 1] = j[576 + ((m[f + (g << 1) >> 1] | 0) << 1) >> 1] | 0, g = g + 1 | 0; while ((g | 0) != (h | 0));
   }
   l = k[c >> 2] | 0, k[c >> 2] = i ? l + 2 | 0 : l + (h << 1) | 0;
  }
  function ad() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;
   if (f = r, r = r + 16 | 0, a = (k[33048] | 0) >>> 5 & 7, k[32932] = a, e = ka(m[66084] | 0, m[66080] | 0) | 0, k[33044] = e, e = wg(a, e) | 0, mc(e, 300024), a = k[33046] | 0, d = m[66080] | 0, c = m[66084] | 0, k[f >> 2] = ((k[32932] | 0) >>> 1) + 5, k[f + 4 >> 2] = d, k[f + 8 >> 2] = c, Jb(a | 0, 300040, f | 0) | 0, Ga(e | 0, k[33044] | 0, k[32932] | 0, k[140] | 0) | 0, a = k[33044] | 0) {
    b = k[32932] | 0, d = 0;
    do {
     if (b) {
      c = 0;
      do b = e + ((ka((i[300056 + ((k[33048] | 0) >>> 8 << 2) + c >> 0] | 0) + -48 | 0, a) | 0) + d) | 0, gb(i[b >> 0] | 0, k[33046] | 0) | 0, c = c + 1 | 0, b = k[32932] | 0, a = k[33044] | 0; while (c >>> 0 < b >>> 0);
     } else b = 0;
     d = d + 1 | 0;
    } while (d >>> 0 < a >>> 0);
   }
   vg(e), r = f;
  }
  function fg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   f = r, r = r + 224 | 0, d = f + 80 | 0, e = d + 40 | 0;
   do k[d >> 2] = 0, d = d + 4 | 0; while ((d | 0) < (e | 0));
   return k[f + 120 >> 2] = k[c >> 2], (sg(0, b, f + 120 | 0, f, f + 80 | 0) | 0) < 0 ? (a = -1, r = f, a | 0) : (k[a + 48 >> 2] | 0 ? c = sg(a, b, f + 120 | 0, f, f + 80 | 0) | 0 : (d = k[a + 44 >> 2] | 0, k[a + 44 >> 2] = f + 136, k[a + 28 >> 2] = f + 136, k[a + 20 >> 2] = f + 136, k[a + 48 >> 2] = 80, k[a + 16 >> 2] = f + 136 + 80, c = sg(a, b, f + 120 | 0, f, f + 80 | 0) | 0, d && (Tb[k[a + 36 >> 2] & 7](a, 0, 0) | 0, c = (k[a + 20 >> 2] | 0) == 0 ? -1 : c, k[a + 44 >> 2] = d, k[a + 48 >> 2] = 0, k[a + 16 >> 2] = 0, k[a + 28 >> 2] = 0, k[a + 20 >> 2] = 0)), a = c, r = f, a | 0);
  }
  function Nf(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0;
   return b = k[a + 104 >> 2] | 0, b ? (k[a + 108 >> 2] | 0) < (b | 0) && (f = 3) : f = 3, (f | 0) == 3 && (e = bg(a) | 0, (e | 0) >= 0) ? (c = k[a + 104 >> 2] | 0, c ? (b = k[a + 8 >> 2] | 0, d = k[a + 4 >> 2] | 0, c = c - (k[a + 108 >> 2] | 0) + -1 | 0, (b - d | 0) > (c | 0) ? (k[a + 100 >> 2] = d + c, c = d) : (c = d, d = b, f = 9)) : (b = k[a + 8 >> 2] | 0, c = k[a + 4 >> 2] | 0, d = b, f = 9), (f | 0) == 9 && (k[a + 100 >> 2] = d), b && (k[a + 108 >> 2] = b + 1 - c + (k[a + 108 >> 2] | 0)), b = c + -1 | 0, (l[b >> 0] | 0 | 0) == (e | 0) ? (f = e, f | 0) : (i[b >> 0] = e, f = e, f | 0)) : (k[a + 100 >> 2] = 0, f = -1, f | 0);
  }
  function ae(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, j = 0;
   d = k[33050] | 0, e = k[41266] | 0;
   a: do if (d) {
    h = 0;
    b: for (;;) {
     if (qg(e + h | 0, 322696, 3) | 0) {
      c = 0;
      break a;
     }
     c: do if ((i[e + (h + 3) >> 0] | 0) == 80 && !(og(a, e + ((qc(e + (h + 12) | 0) | 0) + h) | 0) | 0)) for (g = (qc(e + (h + 16) | 0) | 0) + h | 0, j = qc(e + g | 0) | 0, c = (qc(e + (g + 4) | 0) | 0) + h | 0, g = e + g | 0; ;) {
      if (!j) break c;
      if (f = g + 8 | 0, !(og(b, e + ((qc(f) | 0) + c) | 0) | 0)) break b;
      g = f, j = j + -1 | 0;
     } while (0);
     if (h = (qc(e + (h + 8) | 0) | 0) + h | 0, h >>> 0 >= d >>> 0) {
      c = 0;
      break a;
     }
    }
    c = e + ((qc(g + 12 | 0) | 0) + c) | 0;
   } else c = 0; while (0);
   return c | 0;
  }
  function Cf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   if (!(b & 255)) return d = a + (Cg(a | 0) | 0) | 0, d | 0;
   a: do if (a & 3) {
    for (;;) {
     if (d = i[a >> 0] | 0, d << 24 >> 24 == 0 ? 1 : d << 24 >> 24 == (b & 255) << 24 >> 24) break;
     if (a = a + 1 | 0, !(a & 3)) break a;
    }
    return a | 0;
   } while (0);
   d = ka(b & 255, 16843009) | 0, c = k[a >> 2] | 0;
   b: do if (!((c & -2139062144 ^ -2139062144) & c + -16843009)) do {
    if (c ^= d, (c & -2139062144 ^ -2139062144) & c + -16843009) break b;
    a = a + 4 | 0, c = k[a >> 2] | 0;
   } while (((c & -2139062144 ^ -2139062144) & c + -16843009 | 0) == 0); while (0);
   for (;;) {
    if (d = i[a >> 0] | 0, d << 24 >> 24 == 0 ? 1 : d << 24 >> 24 == (b & 255) << 24 >> 24) break;
    a = a + 1 | 0;
   }
   return a | 0;
  }
  function Ve() {
   var a = 0, b = 0, c = 0;
   if (c = r, r = r + 16 | 0, j[284] = 18761, kb(k[140] | 0, 4, 0) | 0, a = rc() | 0, b = k[140] | 0, kb(b | 0, rc() | 0, 0) | 0, a) do a = a + -1 | 0, b = rc() | 0, rc() | 0, Ga(c | 0, 8, 1, k[140] | 0) | 0, og(c, 588584) | 0 || (k[33e3] = b), og(c, 588592) | 0 || (k[41342] = b), og(c, 588600) | 0 || (k[33002] = b); while ((a | 0) != 0);
   kb(k[140] | 0, (k[33e3] | 0) + 20 | 0, 0) | 0, Ga(132032, 64, 1, k[140] | 0) | 0, i[132095] = 0, a = Bf(132032, 32) | 0, a && (Og(132096, a + 1 | 0) | 0, i[a >> 0] = 0), b = pc() | 0, j[65896] = b, b = pc() | 0, j[65916] = b, k[41268] = 18, rc() | 0, b = pc() | 0, j[66080] = b, b = pc() | 0, j[66084] = b, k[41676] = 28, k[32952] = 16383, r = c;
  }
  function gg(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0, f = 0, g = 0, h = 0;
   h = r, r = r + 128 | 0, e = h, f = 629576, g = e + 112 | 0;
   do k[e >> 2] = k[f >> 2], e = e + 4 | 0, f = f + 4 | 0; while ((e | 0) < (g | 0));
   if ((b + -1 | 0) >>> 0 > 2147483646) {
    if (b) return c = wb() | 0, k[c >> 2] = 75, c = -1, r = h, c | 0;
    a = h + 112 | 0, b = 1;
   }
   return g = -2 - a | 0, g = b >>> 0 > g >>> 0 ? g : b, k[h + 48 >> 2] = g, k[h + 20 >> 2] = a, k[h + 44 >> 2] = a, b = a + g | 0, k[h + 16 >> 2] = b, k[h + 28 >> 2] = b, b = fg(h, c, d) | 0, g ? (c = k[h + 20 >> 2] | 0, i[c + (((c | 0) == (k[h + 16 >> 2] | 0)) << 31 >> 31) >> 0] = 0, c = b, r = h, c | 0) : (c = b, r = h, c | 0);
  }
  function ef(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   for (d = r, r = r + 240 | 0, k[d + 96 >> 2] = a, k[d + 96 + 4 >> 2] = b, eg(d + 104 | 0, 588984, d + 96 | 0), b = 0; ;) {
    if (a = k[588992 + (b << 5) >> 2] | 0, !(qg(d + 104 | 0, a, Cg(a | 0) | 0) | 0)) {
     c = 3;
     break;
    }
    if (a = b + 1 | 0, !(a >>> 0 < 478)) break;
    b = a;
   }
   if ((c | 0) == 3 && (a = j[588992 + (b << 5) + 4 >> 1] | 0, a << 16 >> 16 && (k[32950] = a & 65535), a = j[588992 + (b << 5) + 6 >> 1] | 0, a << 16 >> 16 && (k[32952] = a & 65535), (b | 0) != 49)) {
    k[32930] = 0, a = 0;
    do p[d + (a << 3) >> 3] = +(j[588992 + (b << 5) + 8 + (a << 1) >> 1] | 0) / 1e4, a = a + 1 | 0; while ((a | 0) != 12);
    oe(131736, d);
   }
   r = d;
  }
  function gf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   for (e = r, r = r + 32 | 0, k[e >> 2] = 0, k[e + 4 >> 2] = 0, k[e + 8 >> 2] = 0, k[e + 12 >> 2] = 0, Ga(e + 16 | 0, 2, 2, k[140] | 0) | 0, b = 65533, d = 2; ;) {
    Ga(e + 16 + (d << 1) | 0, 2, 1, k[140] | 0) | 0, a = d ^ 2, c = 0;
    do f = (c | 0) == 0 & 1, g = +(((l[e + 16 + (a << 1) + c >> 0] | 0) << 8 | (l[e + 16 + (a << 1) + f >> 0] | 0)) - ((l[e + 16 + (d << 1) + c >> 0] | 0) << 8 | (l[e + 16 + (d << 1) + f >> 0] | 0)) | 0), f = e + (c << 3) | 0, p[f >> 3] = +p[f >> 3] + g * g, c = c + 1 | 0; while ((c | 0) != 2);
    if (!b) break;
    b = b + -1 | 0, d = d + 1 & 3;
   }
   return r = e, (+p[e >> 3] < +p[e + 8 >> 3] ? 19789 : 18761) | 0;
  }
  function cg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   d = k[c + 16 >> 2] | 0;
   do if (!d) {
    if (ag(c) | 0) return;
    d = k[c + 16 >> 2] | 0;
    break;
   } while (0);
   if (f = k[c + 20 >> 2] | 0, (d - f | 0) >>> 0 < b >>> 0) return void (Tb[k[c + 36 >> 2] & 7](c, a, b) | 0);
   a: do {
    if ((i[c + 75 >> 0] | 0) > -1) {
     for (e = b; ;) {
      if (!e) {
       d = f;
       break a;
      }
      if (d = e + -1 | 0, (i[a + d >> 0] | 0) == 10) break;
      e = d;
     }
     if ((Tb[k[c + 36 >> 2] & 7](c, a, e) | 0) >>> 0 < e >>> 0) return;
     b = b - e | 0, a = a + e | 0, d = k[c + 20 >> 2] | 0;
     break;
    }
    d = f;
   } while (0);
   Fg(d | 0, a | 0, b | 0) | 0, k[c + 20 >> 2] = (k[c + 20 >> 2] | 0) + b;
  }
  function $e(a) {
   a |= 0;
   var b = 0, c = 0, d = 0;
   c = r, r = r + 16 | 0, kb(k[140] | 0, 2, 0) | 0, j[284] = 18761, b = ib(k[140] | 0) | 0, (b | 0) == 6 && kb(k[140] | 0, 5, 1) | 0;
   do if ((rc() | 0) == (a | 0)) {
    if ((b | 0) > 6 && (a = rc() | 0, k[33002] = a), d = pc() | 0, j[65840] = d, j[65916] = d, d = pc() | 0, j[65844] = d, j[65896] = d, i[132032] = i[588816] | 0, i[132033] = i[588817] | 0, i[132034] = i[588818] | 0, i[132035] = i[588819] | 0, i[132036] = i[588820] | 0, a = m[65840] | 0, k[c >> 2] = b, k[c + 4 >> 2] = d & 65535, k[c + 8 >> 2] = a, eg(132096, 588824, c), (b | 0) == 6) {
     k[41268] = 32;
     break;
    }
    (b | 0) == 9 && (k[41268] = 33);
   } while (0);
   r = c;
  }
  function _f(a, b) {
   return a |= 0, b |= 0, a ? b >>> 0 < 128 ? (i[a >> 0] = b, b = 1, b | 0) : b >>> 0 < 2048 ? (i[a >> 0] = b >>> 6 | 192, i[a + 1 >> 0] = b & 63 | 128, b = 2, b | 0) : b >>> 0 < 55296 | (b & -8192 | 0) == 57344 ? (i[a >> 0] = b >>> 12 | 224, i[a + 1 >> 0] = b >>> 6 & 63 | 128, i[a + 2 >> 0] = b & 63 | 128, b = 3, b | 0) : (b + -65536 | 0) >>> 0 < 1048576 ? (i[a >> 0] = b >>> 18 | 240, i[a + 1 >> 0] = b >>> 12 & 63 | 128, i[a + 2 >> 0] = b >>> 6 & 63 | 128, i[a + 3 >> 0] = b & 63 | 128, b = 4, b | 0) : (b = wb() | 0, k[b >> 2] = 84, b = -1, b | 0) : (b = 1, b | 0);
  }
  function pg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   if (!c) return f = 0, f | 0;
   d = i[a >> 0] | 0;
   a: do if (d << 24 >> 24) for (f = d, e = d & 255; ;) {
    if (c = c + -1 | 0, d = i[b >> 0] | 0, !((c | 0) != 0 & d << 24 >> 24 != 0)) {
     c = f;
     break a;
    }
    if (f << 24 >> 24 != d << 24 >> 24 && (e = Jf(e) | 0, (e | 0) != (Jf(d & 255) | 0))) {
     c = f;
     break a;
    }
    if (a = a + 1 | 0, b = b + 1 | 0, d = i[a >> 0] | 0, !(d << 24 >> 24)) {
     c = 0;
     break;
    }
    f = d, e = d & 255;
   } else c = 0; while (0);
   return f = Jf(c & 255) | 0, f = f - (Jf(l[b >> 0] | 0) | 0) | 0, f | 0;
  }
  function Ud() {
   var a = 0, b = 0, c = 0, d = 0;
   if (d = r, r = r + 2048 | 0, kb(k[140] | 0, 67, 0) | 0, b = rc() | 0, c = ib(k[140] | 0) | 0, kb(k[140] | 0, b | 0, 0) | 0, c & 255) {
    a = 0;
    do b = rc() | 0, k[d + (a << 2) >> 2] = (k[33002] & 0 - (a & 1)) + b, a = a + 1 | 0; while ((a | 0) != ((c & 255) << 1 | 0));
   }
   if (kb(k[140] | 0, 78, 0) | 0, a = ib(k[140] | 0) | 0, kb(k[140] | 0, 88, 0) | 0, b = ka(m[65896] | 0, m[65916] | 0) | 0, k[d + ((c & 255) << 3) >> 2] = b, b = rc() | 0, k[d + ((c & 255) << 3) + 4 >> 2] = (k[33002] | 0) + b, c & 255) {
    b = 0;
    do Qd(d + (b << 3) | 0, a), b = b + 1 | 0; while ((b | 0) != (c & 255 | 0));
   }
   a && Td(a), r = d;
  }
  function Ad() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (f = wg(m[65896] | 0, 1) | 0, mc(f, 317656), j[65916] | 0) {
    a = j[65896] | 0, g = 0;
    do {
     if (e = Ga(f | 0, 1, a & 65535 | 0, k[140] | 0) | 0, a = j[65896] | 0, e >>> 0 < (a & 65535) >>> 0 && (nc(), a = j[65896] | 0), b = k[32946] | 0, a << 16 >> 16) {
      c = a & 65535, d = a & 65535, e = 0;
      do h = b + ((ka(c, g) | 0) + e << 1) | 0, j[h >> 1] = j[576 + (l[f + e >> 0] << 1) >> 1] | 0, e = e + 1 | 0; while ((e | 0) != (d | 0));
     } else a = 0;
     g = g + 1 | 0;
    } while (g >>> 0 < (m[65916] | 0) >>> 0);
   }
   vg(f), k[32952] = m[543];
  }
  function Ye(a) {
   a |= 0;
   var b = 0, c = 0;
   kb(k[140] | 0, a | 0, 0) | 0;
   a: do if ((ib(k[140] | 0) | 0) == 255 && (ib(k[140] | 0) | 0) == 216 && (ib(k[140] | 0) | 0) == 255) do {
    if (a = ib(k[140] | 0) | 0, (a | 0) == 218) break a;
    j[284] = 19789, b = ((pc() | 0) & 65535) + -2 | 0, c = vb(k[140] | 0) | 0, (a | 0) == 192 | (a | 0) == 195 && (ib(k[140] | 0) | 0, a = pc() | 0, j[65916] = a, a = pc() | 0, j[65896] = a), a = pc() | 0, j[284] = a, a = rc() | 0, (rc() | 0) == 1212498256 && Te(a + c | 0, b - a | 0, 0), Oe(c + 6 | 0) | 0 && Qe(), kb(k[140] | 0, c + b | 0, 0) | 0;
   } while ((ib(k[140] | 0) | 0) == 255); while (0);
  }
  function zd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   if (g = r, r = r + 848 | 0, j[65840] | 0) {
    f = 0;
    do {
     if ((Ga(g | 0, 1, 848, k[140] | 0) | 0) >>> 0 < 848 && nc(), b = f & 3, c = ka(k[317624 + (b << 2) >> 2] | 0, f) | 0, b = c + (k[317640 + (b << 2) >> 2] | 0) | 0, c = k[32946] | 0, d = j[65844] | 0, d << 16 >> 16) {
      a = j[65896] | 0, e = 0;
      do h = c + ((ka(a & 65535, f) | 0) + e << 1) | 0, j[h >> 1] = l[g + ((b + e | 0) % 848 | 0) >> 0] | 0, e = e + 1 | 0; while ((e | 0) != (d & 65535 | 0));
     }
     f = f + 1 | 0;
    } while ((f | 0) < (m[65840] | 0));
   }
   k[32952] = 255, r = g;
  }
  function jg(a) {
   a |= 0;
   for (var b = 0, c = 0, d = 0, e = 0; ;) {
    if (b = i[a >> 0] | 0, d = a + 1 | 0, !(Hf(b << 24 >> 24) | 0)) break;
    a = d;
   }
   if ((b << 24 >> 24 | 0) == 45 ? (c = 1, e = 5) : (b << 24 >> 24 | 0) == 43 ? (c = 0, e = 5) : c = 0, (e | 0) == 5 && (a = d, b = i[d >> 0] | 0), b = (b << 24 >> 24) + -48 | 0, !(b >>> 0 < 10)) return d = 0, c = (c | 0) != 0, e = 0 - d | 0, e = c ? d : e, e | 0;
   d = a, a = 0;
   do d = d + 1 | 0, a = (a * 10 | 0) - b | 0, b = (i[d >> 0] | 0) + -48 | 0; while (b >>> 0 < 10);
   return c = (c | 0) != 0, e = 0 - a | 0, e = c ? a : e, e | 0;
  }
  function de(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d = +d;
   var e = 0, f = 0, g = 0, h = 0, i = 0, k = 0, l = 0;
   if ((c | 0) < (b | 0)) g = -3.4028234663852886e38, f = 3.4028234663852886e38, e = 0; else for (h = b, g = -3.4028234663852886e38, f = 3.4028234663852886e38, e = 0; ;) {
    if (k = h << 2, l = j[a + (k << 1) >> 1] | 0, i = +(l << 16 >> 16) + +((l << 16 >> 16) - (j[a + (k + -4 << 1) >> 1] | 0) | 0) * d, e += i, f = f > i ? i : f, g = g < i ? i : g, !((h | 0) < (c | 0))) break;
    h = h + 1 | 0;
   }
   return (c - b | 0) == 1 ? e *= .5 : e = (e - f - g) / +(c - b + -1 | 0), +e;
  }
  function gd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, l = 0;
   if (kb(k[140] | 0, k[33053] | 0, 0) | 0, e = pc() | 0, f = pc() | 0, a = k[33052] | 0, kb(k[140] | 0, k[33002] | 0, 0) | 0, uc(k[32946] | 0, ka(m[65916] | 0, m[65896] | 0) | 0), k[33052] | 0 && (d = k[32946] | 0, a = (a | 0) == 1 ? 21845 : 4948, b = ka(m[65916] | 0, m[65896] | 0) | 0)) {
    c = 0;
    do l = d + (c << 1) | 0, h = (j[l >> 1] ^ e) & 65535, g = d + ((c | 1) << 1) | 0, i = (j[g >> 1] ^ f) & 65535, j[l >> 1] = i & ~a | h & a, j[g >> 1] = i & a | h & ~a, c = c + 2 | 0; while ((c | 0) < (b | 0));
   }
  }
  function Yf(a) {
   a = +a;
   var b = 0, c = 0;
   c = r, r = r + 16 | 0, p[t >> 3] = a, b = k[t + 4 >> 2] | 0, k[t >> 2] = k[t >> 2], k[t + 4 >> 2] = b & 2147483647, a = +p[t >> 3];
   do {
    if ((b & 2147483647) >>> 0 > 1071748074) {
     if ((b & 2147483647) >>> 0 > 1077149696) {
      a = 1 - 0 / a;
      break;
     }
     a = 1 - 2 / (+Rf(a * 2) + 2);
     break;
    }
    if ((b & 2147483647) >>> 0 > 1070618798) {
     a = +Rf(a * 2), a /= a + 2;
     break;
    }
    if ((b & 2147483647) >>> 0 > 1048575) {
     a = +Rf(a * -2), a = -a / (a + 2);
     break;
    }
    o[c >> 2] = a;
    break;
   } while (0);
   return r = c, +((b | 0) < 0 ? -a : a);
  }
  function hd(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, f = 0;
   do if (a) {
    if ((a | 0) != -1) {
     if (d = k[75038] | 0, c = k[75040] | 0, e = k[75041] | 0, (d | 0) < (a | 0) ? (f = rc() | 0, k[75040] = f, k[75041] = c, d = (k[75038] | 0) + 32 | 0, k[75038] = d) : (f = c, c = e), c = Ng(f | 0, c | 0, 64 - d | 0) | 0, c = Ig(c | 0, O | 0, 64 - a | 0) | 0, b) {
      c = m[b + (c << 1) >> 1] | 0, k[75038] = d - (c >>> 8), c &= 255;
      break;
     }
     k[75038] = d - a;
     break;
    }
    k[75038] = 0, k[75040] = 0, k[75041] = 0, c = 0;
   } else c = 0; while (0);
   return c | 0;
  }
  function zc() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   c = +o[32914], b = +o[32913] / c, c = +o[32915] / c, a = !(b <= 2) | !(b > 1.28) | c < .8789 ? !(b <= 2) | !(b > 1.28) ? b > 1 & b <= 1.28 & c < .8789 & 1 : 3 : c <= 2 ? 4 : b > 1 & b <= 1.28 & c < .8789 & 1, g = +o[32916] != 0 ? 5 : a, k[32930] = 0, a = k[32932] | 0, f = 0;
   do {
    if (d = f << 2, a) {
     e = 0;
     do o[131736 + (f << 4) + (e << 2) >> 2] = +(j[298256 + (g * 24 | 0) + (e + d << 1) >> 1] | 0) * .0009765625, e = e + 1 | 0; while ((e | 0) != (a | 0));
    }
    f = f + 1 | 0;
   } while ((f | 0) != 3);
  }
  function Se() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   if (pc() | 0, (rc() | 0) == 524296 && rc() | 0 && (e = pc() | 0, e << 16 >> 16 == 10 | e << 16 >> 16 == 12)) {
    b = 0, c = 0, f = 0, a = 0;
    do {
     d = 0;
     do (a | 0) < (e & 65535 | 0) && (g = pc() | 0, b = (j[588376 + ((c & 1) << 1) >> 1] ^ g) & 65535 | b << 16, c = c + 1 | 0, a = a + 16 | 0), a = a - (e & 65535) | 0, j[165240 + (f << 4) + (d << 1) >> 1] = b >>> a & (-1 << (e & 65535) ^ 65535), d = d + 1 | 0; while ((d | 0) != 8);
     f = f + 1 | 0;
    } while ((f | 0) != 8);
   }
  }
  function qf() {
   var a = 0, b = 0, c = 0, d = 0, e = 0;
   if (c = r, r = r + 1392 | 0, a = ug(k[33044] | 0) | 0, mc(a, 614672), Ga(a | 0, 1, k[33044] | 0, k[140] | 0) | 0, Eb(255, k[33046] | 0) | 0, Eb(216, k[33046] | 0) | 0, og(a + 6 | 0, 604504) | 0) {
    b = c + 1376 | 0, d = 614688, e = b + 10 | 0;
    do i[b >> 0] = i[d >> 0] | 0, b = b + 1 | 0, d = d + 1 | 0; while ((b | 0) < (e | 0));
    e = tb(1384) | 0, j[c + 1376 + 2 >> 1] = e, Hb(c + 1376 | 0, 1, 10, k[33046] | 0) | 0, pf(c, 0), Hb(c | 0, 1, 1376, k[33046] | 0) | 0;
   }
   Hb(a + 2 | 0, 1, (k[33044] | 0) + -2 | 0, k[33046] | 0) | 0, vg(a), r = c;
  }
  function Wf(a, b) {
   a = +a, b |= 0;
   var c = 0;
   return (b | 0) > 1023 ? (b + -1023 | 0) > 1023 ? (b = (b + -2046 | 0) > 1023 ? 1023 : b + -2046 | 0, a = a * 8.98846567431158e307 * 8.98846567431158e307) : (b = b + -1023 | 0, a *= 8.98846567431158e307) : (b | 0) < -1022 && ((b + 1022 | 0) < -1022 ? (b = (b + 2044 | 0) < -1022 ? -1022 : b + 2044 | 0, a = a * 2.2250738585072014e-308 * 2.2250738585072014e-308) : (b = b + 1022 | 0, a *= 2.2250738585072014e-308)), c = Ng(b + 1023 | 0, 0, 52) | 0, b = O, k[t >> 2] = c, k[t + 4 >> 2] = b, +(a * +p[t >> 3]);
  }
  function ng(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0;
   c = i[a >> 0] | 0;
   a: do if (c << 24 >> 24) for (e = c, d = c & 255; ;) {
    if (c = i[b >> 0] | 0, !(c << 24 >> 24)) {
     c = e;
     break a;
    }
    if (e << 24 >> 24 != c << 24 >> 24 && (d = Jf(d) | 0, (d | 0) != (Jf(c & 255) | 0))) {
     c = e;
     break a;
    }
    if (a = a + 1 | 0, b = b + 1 | 0, c = i[a >> 0] | 0, !(c << 24 >> 24)) {
     c = 0;
     break;
    }
    e = c, d = c & 255;
   } else c = 0; while (0);
   return e = Jf(c & 255) | 0, e - (Jf(l[b >> 0] | 0) | 0) | 0;
  }
  function bd() {
   var a = 0, b = 0, c = 0, d = 0;
   if (c = r, r = r + 16 | 0, a = ka(m[66084] | 0, m[66080] | 0) | 0, k[33044] = a, a = wg(a, 2) | 0, mc(a, 300064), b = k[33046] | 0, d = m[66084] | 0, k[c >> 2] = m[66080], k[c + 4 >> 2] = d, Jb(b | 0, 299992, c | 0) | 0, uc(a, k[33044] | 0), k[33044] | 0) {
    b = 0;
    do d = a + (b << 1) | 0, gb((m[d >> 1] | 0) << 3 | 0, k[33046] | 0) | 0, gb((m[d >> 1] | 0) >>> 5 << 2 | 0, k[33046] | 0) | 0, gb((m[d >> 1] | 0) >>> 11 << 3 | 0, k[33046] | 0) | 0, b = b + 1 | 0; while (b >>> 0 < (k[33044] | 0) >>> 0);
   }
   vg(a), r = c;
  }
  function _e(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0;
   e = r, r = r + 16 | 0, j[284] = 19789;
   a: do if (((vb(k[140] | 0) | 0) + 7 | 0) < (a | 0)) do {
    if (b = vb(k[140] | 0) | 0, c = rc() | 0, c >>> 0 < 8) break a;
    Ga(e | 0, 4, 1, k[140] | 0) | 0, mg(e, 588784, 4) | 0 && mg(e, 588792, 4) | 0 ? mg(e, 588800, 4) | 0 || (d = 6) : d = 6, (d | 0) == 6 && (d = 0, _e(c + b | 0)), mg(e, 588808, 4) | 0 || Ye(vb(k[140] | 0) | 0), kb(k[140] | 0, c + b | 0, 0) | 0;
   } while (((vb(k[140] | 0) | 0) + 7 | 0) < (a | 0)); while (0);
   r = e;
  }
  function Id() {
   var a = 0, b = 0, c = 0, d = 0;
   if (a = k[33048] | 0, k[32932] = a >>> 5, b = j[65840] | 0, b << 16 >> 16) {
    a = j[65844] | 0, d = 0;
    do {
     if (a << 16 >> 16) {
      b = a & 65535, c = 0;
      do a = (ka(b, d) | 0) + c | 0, uc((k[32928] | 0) + (a << 3) | 0, k[32932] | 0), c = c + 1 | 0, a = j[65844] | 0, b = a & 65535; while ((c | 0) < (b | 0));
      b = j[65840] | 0;
     } else a = 0;
     d = d + 1 | 0;
    } while ((d | 0) < (b & 65535 | 0));
    a = k[33048] | 0;
   }
   k[32952] = (1 << (a & 31)) + -1;
  }
  function Ke(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
   e = 0;
   do {
    b = +o[587712 + (e * 12 | 0) >> 2], c = +o[587712 + (e * 12 | 0) + 4 >> 2], d = +o[587712 + (e * 12 | 0) + 8 >> 2], f = 0;
    do g = 165960 + (e << 4) + (f << 2) | 0, o[g >> 2] = 0, h = b * +o[a + (f << 2) >> 2] + 0, o[g >> 2] = h, h += c * +o[a + 12 + (f << 2) >> 2], o[g >> 2] = h, o[g >> 2] = h + d * +o[a + 24 + (f << 2) >> 2], f = f + 1 | 0; while ((f | 0) != 3);
    e = e + 1 | 0;
   } while ((e | 0) != 3);
  }
  function ff(a) {
   a |= 0;
   var b = 0, c = 0;
   if (k[32930] = 0, c = k[32932] | 0) {
    b = 0;
    do k[131736 + (b << 2) >> 2] = k[604288 + (a * 48 | 0) + (b << 2) >> 2], b = b + 1 | 0; while ((b | 0) != (c | 0));
    b = 0;
    do k[131752 + (b << 2) >> 2] = k[604288 + (a * 48 | 0) + (c + b << 2) >> 2], b = b + 1 | 0; while ((b | 0) != (c | 0));
    b = 0;
    do k[131768 + (b << 2) >> 2] = k[604288 + (a * 48 | 0) + ((c << 1) + b << 2) >> 2], b = b + 1 | 0; while ((b | 0) != (c | 0));
   }
  }
  function Fg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0;
   if ((c | 0) >= 4096) return ab(a | 0, b | 0, c | 0) | 0;
   if (d = a | 0, (a & 3) == (b & 3)) {
    for (;a & 3; ) {
     if (!c) return d | 0;
     i[a >> 0] = i[b >> 0] | 0, a = a + 1 | 0, b = b + 1 | 0, c = c - 1 | 0;
    }
    for (;(c | 0) >= 4; ) k[a >> 2] = k[b >> 2], a = a + 4 | 0, b = b + 4 | 0, c = c - 4 | 0;
   }
   for (;(c | 0) > 0; ) i[a >> 0] = i[b >> 0] | 0, a = a + 1 | 0, b = b + 1 | 0, c = c - 1 | 0;
   return d | 0;
  }
  function $c() {
   var a = 0, b = 0, c = 0, d = 0;
   if (d = r, r = r + 16 | 0, a = ka((m[66080] | 0) * 3 | 0, m[66084] | 0) | 0, k[33044] = a, a = wg(a, 2) | 0, mc(a, 300008), uc(a, k[33044] | 0), b = k[33044] | 0) {
    c = 0;
    do i[a + c >> 0] = (m[a + (c << 1) >> 1] | 0) >>> 8, c = c + 1 | 0; while ((c | 0) != (b | 0));
   }
   c = k[33046] | 0, b = m[66084] | 0, k[d >> 2] = m[66080], k[d + 4 >> 2] = b, Jb(c | 0, 299992, d | 0) | 0, Hb(a | 0, 1, k[33044] | 0, k[33046] | 0) | 0, vg(a), r = d;
  }
  function ee(a, b, c) {
   a = +a, b = +b, c = +c;
   var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
   if (c = c != 0 ? c : .8, d = (((~~(a * 12.566370614359172 / c) >>> 0 | 0) == -1) << 31 >> 31) + (~~(a * 12.566370614359172 / c) >>> 0) | 0, e = wg(d + 1 | 0, 2) | 0, mc(e, 322760), j[e >> 1] = d, d) {
    f = 0;
    do h = c * +(f >>> 0), i = (+aa(+(h / a * .25)) + 1) * .5, g = ~~(i * +Yf(h / b) * b + .5), f = f + 1 | 0, j[e + (f << 1) >> 1] = g; while ((f | 0) != (d | 0));
   }
   return e | 0;
  }
  function xg(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   return a ? b >>> 0 > 4294967231 ? (a = wb() | 0, k[a >> 2] = 12, a = 0, a | 0) : (c = yg(a + -8 | 0, b >>> 0 < 11 ? 16 : b + 11 & -8) | 0) ? (a = c + 8 | 0, a | 0) : (c = ug(b) | 0) ? (d = k[a + -4 >> 2] | 0, d = (d & -8) - ((d & 3 | 0) == 0 ? 8 : 4) | 0, Fg(c | 0, a | 0, (d >>> 0 < b >>> 0 ? d : b) | 0) | 0, vg(a), a = c, a | 0) : (a = 0, a | 0) : (a = ug(b) | 0, a | 0);
  }
  function Uf(a, b) {
   a = +a, b |= 0;
   var c = 0, d = 0, e = 0;
   return p[t >> 3] = a, c = k[t >> 2] | 0, d = k[t + 4 >> 2] | 0, e = Ig(c | 0, d | 0, 52) | 0, (e & 2047 | 0) == 2047 ? +a : e & 2047 ? (k[b >> 2] = (e & 2047) + -1022, k[t >> 2] = c, k[t + 4 >> 2] = d & -2146435073 | 1071644672, a = +p[t >> 3], +a) : (a != 0 ? (a = +Uf(a * 0x10000000000000000, b), c = (k[b >> 2] | 0) + -64 | 0) : c = 0, k[b >> 2] = c, +a);
  }
  function Ee(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0;
   if (f = r, r = r + 16 | 0, d = pc() | 0, d << 16 >> 16) {
    d &= 65535;
    do d = d + -1 | 0, De(a, f + 12 | 0, f, f + 4 | 0, f + 8 | 0), e = k[f + 12 >> 2] | 0, (e | 0) == (b | 0) && (g = (rc() | 0) + a | 0, k[41342] = g), (e | 0) == (c | 0) && (g = rc() | 0, k[33044] = g), kb(k[140] | 0, k[f + 8 >> 2] | 0, 0) | 0; while ((d | 0) != 0);
   }
   r = f;
  }
  function nd() {
   var a = 0, b = 0, c = 0, d = 0;
   if (a = j[65840] | 0, !((k[32928] | 0) == 0 | a << 16 >> 16 == 0)) {
    b = j[65844] | 0, d = 0;
    do {
     if (b << 16 >> 16) {
      a = b & 65535, c = 0;
      do b = (ka(a, d) | 0) + c | 0, uc((k[32928] | 0) + (b << 3) | 0, 3), c = c + 1 | 0, b = j[65844] | 0, a = b & 65535; while ((c | 0) < (a | 0));
      a = j[65840] | 0;
     } else b = 0;
     d = d + 1 | 0;
    } while ((d | 0) < (a & 65535 | 0));
   }
  }
  function qg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   if (!c) return d = 0, d | 0;
   d = i[a >> 0] | 0;
   a: do if (d << 24 >> 24) for (;;) {
    if (c = c + -1 | 0, e = i[b >> 0] | 0, !(d << 24 >> 24 == e << 24 >> 24 & ((c | 0) != 0 & e << 24 >> 24 != 0))) break a;
    if (a = a + 1 | 0, b = b + 1 | 0, d = i[a >> 0] | 0, !(d << 24 >> 24)) {
     d = 0;
     break;
    }
   } else d = 0; while (0);
   return e = (d & 255) - (l[b >> 0] | 0) | 0, e | 0;
  }
  function $f(a) {
   a |= 0;
   var b = 0;
   return b = i[a + 74 >> 0] | 0, i[a + 74 >> 0] = b + 255 | b, (k[a + 20 >> 2] | 0) >>> 0 > (k[a + 44 >> 2] | 0) >>> 0 && Tb[k[a + 36 >> 2] & 7](a, 0, 0) | 0, k[a + 16 >> 2] = 0, k[a + 28 >> 2] = 0, k[a + 20 >> 2] = 0, b = k[a >> 2] | 0, b & 20 ? b & 4 ? (k[a >> 2] = b | 32, a = -1, a | 0) : (a = -1, a | 0) : (b = k[a + 44 >> 2] | 0, k[a + 8 >> 2] = b, k[a + 4 >> 2] = b, a = 0, a | 0);
  }
  function rd(a) {
   a |= 0;
   var b = 0;
   return a ? (b = k[75086] | 0, b || (b = k[32962] | 0, Ga(300352 + b | 0, 1, 16384 - b | 0, k[140] | 0) | 0, Ga(300352, 1, k[32962] | 0, k[140] | 0) | 0, b = k[75086] | 0), b = b - a | 0, k[75086] = b & 131071, b = ((l[300352 + (((b & 131071) >>> 3 ^ 16368) + 1) >> 0] | 0) << 8 | (l[300352 + ((b & 131071) >>> 3 ^ 16368) >> 0] | 0)) >>> (b & 7) & ~(-1 << a)) : (k[75086] = 0, b = 0), b | 0;
  }
  function Jg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   if (d = a + c | 0, (c | 0) >= 20) {
    if (b &= 255, e = a & 3, f = b | b << 8 | b << 16 | b << 24, e) for (e = a + 4 - e | 0; (a | 0) < (e | 0); ) i[a >> 0] = b, a = a + 1 | 0;
    for (;(a | 0) < (d & -4 | 0); ) k[a >> 2] = f, a = a + 4 | 0;
   }
   for (;(a | 0) < (d | 0); ) i[a >> 0] = b, a = a + 1 | 0;
   return a - c | 0;
  }
  function Wc() {
   var a = 0, b = 0, c = 0;
   b = r, r = r + 1024 | 0, Jg(b | 0, 0, 1024) | 0, kb(k[140] | 0, -2e3, 2) | 0, a = 0;
   do c = b + ((ib(k[140] | 0) | 0) << 2) | 0, k[c >> 2] = (k[c >> 2] | 0) + 1, a = a + 1 | 0; while ((a | 0) != 2e3);
   for (a = 0; ;) {
    if ((a | 0) >= 4) {
     a = 1;
     break;
    }
    if ((k[b + ((l[299840 + a >> 0] | 0) << 2) >> 2] | 0) < 200) {
     a = 0;
     break;
    }
    a = a + 1 | 0;
   }
   return r = b, a | 0;
  }
  function nc() {
   var a = 0, b = 0, c = 0;
   b = r, r = r + 16 | 0;
   do if (!(k[138] | 0)) {
    if (a = k[w >> 2] | 0, k[b >> 2] = k[96], Jb(a | 0, 298152, b | 0) | 0, Na(k[140] | 0) | 0) {
     Hb(298160, 23, 1, a | 0) | 0;
     break;
    }
    c = zb(k[140] | 0) | 0, k[b + 8 >> 2] = c, k[b + 8 + 4 >> 2] = ((c | 0) < 0) << 31 >> 31, Jb(a | 0, 298184, b + 8 | 0) | 0;
    break;
   } while (0);
   k[138] = (k[138] | 0) + 1, r = b;
  }
  function Gg(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0;
   for (B = B + 1 | 0, k[a >> 2] = B; (e | 0) < (d | 0); ) {
    if (!(k[c + (e << 3) >> 2] | 0)) return k[c + (e << 3) >> 2] = B, k[c + ((e << 3) + 4) >> 2] = b, k[c + ((e << 3) + 8) >> 2] = 0, O = d, c | 0;
    e = e + 1 | 0;
   }
   return d = d * 2 | 0, c = xg(c | 0, 8 * (d + 1 | 0) | 0) | 0, c = Gg(a | 0, b | 0, c | 0, d | 0) | 0, O = d, c | 0;
  }
  function De(a, b, c, d, e) {
   a |= 0, b |= 0, c |= 0, d |= 0, e |= 0;
   var f = 0;
   f = (pc() | 0) & 65535, k[b >> 2] = f, b = (pc() | 0) & 65535, k[c >> 2] = b, b = rc() | 0, k[d >> 2] = b, b = (vb(k[140] | 0) | 0) + 4 | 0, k[e >> 2] = b, c = k[c >> 2] | 0, (ka((i[586576 + (c >>> 0 < 14 ? c : 0) >> 0] | 0) + -48 | 0, k[d >> 2] | 0) | 0) >>> 0 > 4 && (f = k[140] | 0, kb(f | 0, (rc() | 0) + a | 0, 0) | 0);
  }
  function Xc() {
   var a = 0, b = 0;
   for (b = r, r = r + 16 | 0, kb(k[140] | 0, 0, 0) | 0, a = 0; ;) {
    if ((a | 0) >= 1024) {
     a = 1;
     break;
    }
    if (Ga(b | 0, 1, 12, k[140] | 0) | 0, ((l[b + 1 >> 0] | 0) & 3 & (i[b + 4 >> 0] & i[b + 2 >> 0] & i[b + 7 >> 0] & i[b + 9 >> 0] & 255) >>> 4 & (l[b + 6 >> 0] | 0) & (l[b + 8 >> 0] | 0) & (l[b + 11 >> 0] | 0) | 0) != 3) {
     a = 0;
     break;
    }
    a = a + 1 | 0;
   }
   return r = b, a | 0;
  }
  function Hc() {
   var a = 0, b = 0, c = 0, d = 0;
   c = r, r = r + 16384 | 0, kb(k[140] | 0, 0, 0) | 0, Ga(c | 0, 1, 16384, k[140] | 0) | 0, b = 540, a = 1;
   a: for (;;) {
    if (b >>> 0 >= 16383) break;
    for (;;) {
     if (d = b, b = b + 1 | 0, (i[c + d >> 0] | 0) == -1) break;
     if (b >>> 0 >= 16383) break a;
    }
    if (i[c + b >> 0] | 0) {
     a = 1;
     break;
    }
    a = 0;
   }
   return r = c, a | 0;
  }
  function mg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   if (!c) return f = 0, f | 0;
   for (;;) {
    if (d = i[a >> 0] | 0, e = i[b >> 0] | 0, d << 24 >> 24 != e << 24 >> 24) break;
    if (c = c + -1 | 0, !c) {
     c = 0, f = 5;
     break;
    }
    a = a + 1 | 0, b = b + 1 | 0;
   }
   return (f | 0) == 5 ? c | 0 : (f = (d & 255) - (e & 255) | 0, f | 0);
  }
  function Yc() {
   var a = 0, b = 0, c = 0;
   c = r, r = r + 32 | 0, kb(k[140] | 0, 3072, 0) | 0, Ga(c | 0, 1, 24, k[140] | 0) | 0, a = (l[c + 8 >> 0] | 0) << 4 & 48 | (l[c + 20 >> 0] | 0) & 3, b = 0;
   do (a | 0) == (k[299848 + (b << 5) >> 2] | 0) && (Og(132032, 299848 + (b << 5) + 4 | 0) | 0, Og(132096, 299848 + (b << 5) + 16 | 0) | 0), b = b + 1 | 0; while ((b | 0) != 4);
   r = c;
  }
  function fe(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d = +d;
   var e = 0, f = 0, g = 0, h = 0;
   h = +o[b >> 2] / +o[c >> 2], g = +o[b + 4 >> 2] / +o[c + 4 >> 2], e = +o[b + 8 >> 2] / +o[c + 8 >> 2], f = h > 0 ? h : 0, f = f < g ? g : f, f = f < e ? e : f, b = ee(f, h, d) | 0, k[a >> 2] = b, b = ee(f, g, d) | 0, k[a + 4 >> 2] = b, b = ee(f, e, d) | 0, k[a + 8 >> 2] = b;
  }
  function wc() {
   var a = 0, b = 0, c = 0;
   for (c = 3; ;) {
    if ((c | 0) != 3) break;
    c = 2;
   }
   a = j[298216 + (c * 10 | 0) >> 1] | 0, b = 1;
   do o[131648 + (b + -1 << 2) >> 2] = 1 / (+(1311 - a | 0) / +(1399 - a | 0) * +(j[298246 + (b << 1) >> 1] | 0) + (1 - +(1311 - a | 0) / +(1399 - a | 0)) * +(j[298216 + (c * 10 | 0) + (b << 1) >> 1] | 0)), b = b + 1 | 0; while ((b | 0) != 5);
  }
  function _c() {
   var a = 0, b = 0, c = 0, d = 0;
   a = r, r = r + 16 | 0, b = ka((m[66080] | 0) * 3 | 0, m[66084] | 0) | 0, k[33044] = b, b = ug(b) | 0, mc(b, 299976), c = k[33046] | 0, d = m[66084] | 0, k[a >> 2] = m[66080], k[a + 4 >> 2] = d, Jb(c | 0, 299992, a | 0) | 0, Ga(b | 0, 1, k[33044] | 0, k[140] | 0) | 0, Hb(b | 0, 1, k[33044] | 0, k[33046] | 0) | 0, vg(b), r = a;
  }
  function ag(a) {
   a |= 0;
   var b = 0;
   return b = i[a + 74 >> 0] | 0, i[a + 74 >> 0] = b + 255 | b, b = k[a >> 2] | 0, b & 8 ? (k[a >> 2] = b | 32, a = -1, a | 0) : (k[a + 8 >> 2] = 0, k[a + 4 >> 2] = 0, b = k[a + 44 >> 2] | 0, k[a + 28 >> 2] = b, k[a + 20 >> 2] = b, k[a + 16 >> 2] = b + (k[a + 48 >> 2] | 0), a = 0, a | 0);
  }
  function Sd(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0;
   return d = k[a >> 2] | 0, e = k[a + 4 >> 2] | 0, b = (d | 0) > (e | 0) ? e : d, c = (d | 0) < (e | 0) ? e : d, f = k[a + 8 >> 2] | 0, b = (b | 0) > (f | 0) ? f : b, c = (c | 0) < (f | 0) ? f : c, a = k[a + 12 >> 2] | 0, a + (f + (e + d)) - (((c | 0) < (a | 0) ? a : c) + ((b | 0) > (a | 0) ? a : b)) >> 1 | 0;
  }
  function Zd(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0;
   j[a >> 1] = 8, e = 0;
   do {
    if (b = La(k[140] | 0) | 0, c = La(k[140] | 0) | 0, d = (b << 8 | e) & 65535, (256 >>> b | 0) > 0) {
     f = 0;
     do f = f + 1 | 0, j[a + (f + c << 1) >> 1] = d; while ((f | 0) != (256 >>> b | 0));
    }
    e = e + 1 | 0;
   } while ((e | 0) != 13);
   pc() | 0;
  }
  function og(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   if (d = i[a >> 0] | 0, c = i[b >> 0] | 0, d << 24 >> 24 == 0 ? 1 : d << 24 >> 24 != c << 24 >> 24) b = d; else {
    do a = a + 1 | 0, b = b + 1 | 0, d = i[a >> 0] | 0, c = i[b >> 0] | 0; while (!(d << 24 >> 24 == 0 ? 1 : d << 24 >> 24 != c << 24 >> 24));
    b = d;
   }
   return (b & 255) - (c & 255) | 0;
  }
  function Oe(a) {
   a |= 0;
   var b = 0;
   kb(k[140] | 0, a | 0, 0) | 0, b = pc() | 0, j[284] = b;
   a: do if (b << 16 >> 16 == 19789 | b << 16 >> 16 == 18761) for (pc() | 0; ;) {
    if (b = rc() | 0, !b) {
     b = 1;
     break a;
    }
    if (kb(k[140] | 0, b + a | 0, 0) | 0, Ge(a) | 0) {
     b = 1;
     break;
    }
   } else b = 0; while (0);
   return b | 0;
  }
  function jc(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   return c = k[80] | 0, c = (c | 0) == 1 ? i[((m[164] | 0) + b & 15) + (297864 + (((m[168] | 0) + a & 15) << 4)) >> 0] | 0 : (c | 0) == 9 ? i[((b + 6 | 0) % 6 | 0) + (344 + (((a + 6 | 0) % 6 | 0) * 6 | 0)) >> 0] | 0 : c >>> ((a << 1 & 14 | b & 1) << 1) & 3, c | 0;
  }
  function zf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0;
   e = r, r = r + 112 | 0, d = e, f = d + 112 | 0;
   do k[d >> 2] = 0, d = d + 4 | 0; while ((d | 0) < (f | 0));
   return k[e + 32 >> 2] = 6, k[e + 44 >> 2] = a, k[e + 76 >> 2] = -1, k[e + 84 >> 2] = a, f = yf(e, b, c) | 0, r = e, f | 0;
  }
  function cf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0;
   for (kb(k[140] | 0, a | 0, 0) | 0, c = 0; ;) {
    if (e = (pc() | 0) & 255, a = b + c | 0, i[a >> 0] = e, !(e << 24 >> 24)) break;
    if (c = c + 1 | 0, (c | 0) >= 63) {
     d = 2;
     break;
    }
   }
   (d | 0) == 2 && (a = b + c | 0), i[a >> 0] = 0;
  }
  function wf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   return e = k[a + 84 >> 2] | 0, d = lg(e, 0, c + 256 | 0) | 0, d = (d | 0) == 0 ? c + 256 | 0 : d - e | 0, c = d >>> 0 < c >>> 0 ? d : c, Fg(b | 0, e | 0, c | 0) | 0, k[a + 4 >> 2] = e + c, k[a + 8 >> 2] = e + d, k[a + 84 >> 2] = e + d, c | 0;
  }
  function Lg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0;
   if ((b | 0) < (a | 0) & (a | 0) < (b + c | 0)) {
    for (d = a, b = b + c | 0, a = a + c | 0; (c | 0) > 0; ) a = a - 1 | 0, b = b - 1 | 0, c = c - 1 | 0, i[a >> 0] = i[b >> 0] | 0;
    a = d;
   } else Fg(a, b, c) | 0;
   return a | 0;
  }
  function kg(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0;
   c = r, r = r + 112 | 0, b = c, d = b + 112 | 0;
   do k[b >> 2] = 0, b = b + 4 | 0; while ((b | 0) < (d | 0));
   return k[c + 4 >> 2] = a, k[c + 8 >> 2] = -1, k[c + 44 >> 2] = a, k[c + 76 >> 2] = -1, Mf(c, 0), e = +Lf(c, 1, 1), r = c, +e;
  }
  function Qg(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0;
   return c = ka(b & 65535, a & 65535) | 0, e = (c >>> 16) + (ka(b & 65535, a >>> 16) | 0) | 0, d = ka(b >>> 16, a & 65535) | 0, O = (e >>> 16) + (ka(b >>> 16, a >>> 16) | 0) + (((e & 65535) + d | 0) >>> 16) | 0, e + d << 16 | c & 65535 | 0 | 0;
  }
  function qc(a) {
   a |= 0;
   var b = 0, c = 0, d = 0;
   return b = l[a >> 0] | 0, c = i[a + 1 >> 0] | 0, d = i[a + 2 >> 0] | 0, a = i[a + 3 >> 0] | 0, a = (j[284] | 0) == 18761 ? (c & 255) << 8 | b | (d & 255) << 16 | (a & 255) << 24 : (c & 255) << 16 | b << 24 | (d & 255) << 8 | a & 255, a | 0;
  }
  function wg(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   return a ? (c = ka(b, a) | 0, (b | a) >>> 0 > 65535 && (c = ((c >>> 0) / (a >>> 0) | 0 | 0) == (b | 0) ? c : -1)) : c = 0, (b = ug(c) | 0) && k[b + -4 >> 2] & 3 ? (Jg(b | 0, 0, c | 0) | 0, b | 0) : b | 0;
  }
  function Lc(a) {
   a |= 0;
   var b = 0, c = 0;
   return b = Dc(m[a >> 1] | 0, a + 2 | 0) | 0, (b | 0) == 16 && ((k[32960] | 0) + -1 | 0) >>> 0 > 16842750 ? a = -32768 : c = 3, (c | 0) == 3 && (a = Dc(b, 0) | 0, a & 1 << b + -1 || (a = (-1 << b) + 1 + a | 0)), a | 0;
  }
  function Pg(a) {
   a |= 0;
   var b = 0;
   return b = i[v + (a & 255) >> 0] | 0, (b | 0) < 8 ? b | 0 : (b = i[v + (a >> 8 & 255) >> 0] | 0, (b | 0) < 8 ? b + 8 | 0 : (b = i[v + (a >> 16 & 255) >> 0] | 0, (b | 0) < 8 ? b + 16 | 0 : (i[v + (a >>> 24) >> 0] | 0) + 24 | 0));
  }
  function Af(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0;
   for (d = c; ;) {
    if (!d) {
     c = 0, d = 4;
     break;
    }
    if (d = d + -1 | 0, c = a + d | 0, (i[c >> 0] | 0) == (b & 255) << 24 >> 24) {
     d = 4;
     break;
    }
   }
   return (d | 0) == 4 ? c | 0 : 0;
  }
  function Mf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   return k[a + 104 >> 2] = b, c = k[a + 4 >> 2] | 0, d = k[a + 8 >> 2] | 0, k[a + 108 >> 2] = d - c, (b | 0) != 0 & (d - c | 0) > (b | 0) ? void (k[a + 100 >> 2] = c + b) : void (k[a + 100 >> 2] = d);
  }
  function Zc() {
   var a = 0, b = 0, c = 0;
   c = r, r = r + 432 | 0, kb(k[140] | 0, -424, 2) | 0, Ga(c | 0, 1, 424, k[140] | 0) | 0, a = 0, b = 0;
   do b = ((i[c + a >> 0] | 0) != 0 & 1) + b | 0, a = a + 1 | 0; while ((a | 0) != 424);
   return r = c, (b | 0) > 20 | 0;
  }
  function ge(a, b) {
   a |= 0, b |= 0;
   do {
    if ((((b | 0) > -1 ? b : 0 - b | 0) | 0) < (j[a >> 1] | 0)) {
     if ((b | 0) < 0) {
      a = 0 - (j[a + (1 - b << 1) >> 1] | 0) | 0;
      break;
     }
     a = j[a + (b + 1 << 1) >> 1] | 0;
     break;
    }
    a = 0;
   } while (0);
   return a | 0;
  }
  function lc(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   a: do if (i[a >> 0] | 0) for (c = Cg(b | 0) | 0; ;) {
    if (!(pg(a, b, c) | 0)) break a;
    if (a = a + 1 | 0, !(i[a >> 0] | 0)) {
     a = 0;
     break;
    }
   } else a = 0; while (0);
   return a | 0;
  }
  function bg(a) {
   a |= 0;
   var b = 0, c = 0;
   return c = r, r = r + 16 | 0, k[a + 8 >> 2] | 0 ? b = 3 : $f(a) | 0 ? a = -1 : b = 3, (b | 0) == 3 && (a = (Tb[k[a + 32 >> 2] & 7](a, c, 1) | 0) == 1 ? l[c >> 0] | 0 : -1), r = c, a | 0;
  }
  function nf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   return d = k[41352] | 0, c = (d & 4 | 0) == 0 ? a : b, b = (d & 4 | 0) == 0 ? b : a, d & 2 && (c = (m[82616] | 0) + ~c | 0), a = m[65852] | 0, (ka(a, c) | 0) + ((d & 1 | 0) == 0 ? b : a + ~b | 0) | 0;
  }
  function Rd() {
   var a = 0, b = 0;
   a = r, r = r + 16 | 0, kb(k[140] | 0, 16, 0) | 0, k[a >> 2] = 0, b = (pc() | 0) & 65535, k[a + 4 >> 2] = b, b = ka(m[65916] | 0, m[65896] | 0) | 0, k[a + 8 >> 2] = b, k[a + 12 >> 2] = 2147483647, Qd(a, 0), r = a;
  }
  function dd(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   return (m[65916] | 0) >>> 0 > a >>> 0 ? (c = m[65896] | 0, c >>> 0 > b >>> 0 ? (c = (ka(c, a) | 0) + b | 0, c = m[(k[32946] | 0) + (c << 1) >> 1] | 0) : c = 0) : c = 0, c | 0;
  }
  function tg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   return e = k[a + 20 >> 2] | 0, d = (k[a + 16 >> 2] | 0) - e | 0, d = d >>> 0 > c >>> 0 ? c : d, Fg(e | 0, b | 0, d | 0) | 0, k[a + 20 >> 2] = (k[a + 20 >> 2] | 0) + d, c | 0;
  }
  function Kg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   for (var d = 0, e = 0; (e | 0) < (c | 0) && (d = k[b + (e << 3) >> 2] | 0); ) {
    if ((d | 0) == (a | 0)) return k[b + ((e << 3) + 4) >> 2] | 0;
    e = e + 1 | 0;
   }
   return 0;
  }
  function ce(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0;
   return d = r, r = r + 16 | 0, c ? (c = be(d, c) | 0, c ? (Fg(a | 0, c | 0, b << 2 | 0) | 0, vg(c), c = 1) : c = 0) : c = 0, r = d, c | 0;
  }
  function Cc() {
   var a = 0;
   for (a = 0; ;) {
    if (a >>> 0 >= 100) {
     a = 0;
     break;
    }
    if (kb(k[140] | 0, (a * 3340 | 0) + 3284 | 0, 0) | 0, (La(k[140] | 0) | 0) > 15) {
     a = 1;
     break;
    }
    a = a + 1 | 0;
   }
   return a | 0;
  }
  function Of(a, b) {
   a = +a, b = +b;
   var c = 0, d = 0;
   return p[t >> 3] = a, d = k[t >> 2] | 0, c = k[t + 4 >> 2] | 0, p[t >> 3] = b, c = k[t + 4 >> 2] & -2147483648 | c & 2147483647, k[t >> 2] = d, k[t + 4 >> 2] = c, + +p[t >> 3];
  }
  function Kc(a) {
   a |= 0;
   var b = 0;
   b = k[a + 392 >> 2] | 0, b && vg(b), b = k[a + 396 >> 2] | 0, b && vg(b), b = k[a + 400 >> 2] | 0, b && vg(b), b = k[a + 404 >> 2] | 0, b && vg(b), vg(k[a + 472 >> 2] | 0);
  }
  function uc(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   (Ga(a | 0, 2, b | 0, k[140] | 0) | 0) >>> 0 < b >>> 0 && nc(), c = (j[284] | 0) == 18761, c ^ (Oa(4660) | 0) << 16 >> 16 == 4660 || yb(a | 0, a | 0, b << 1 | 0);
  }
  function Me(a) {
   if (a |= 0, a = a >>> 0 > 4096 ? 4096 : a, uc(576, a), (a | 0) < 4096) do j[576 + (a << 1) >> 1] = j[576 + (a + -1 << 1) >> 1] | 0, a = a + 1 | 0; while ((a | 0) < 4096);
   k[32952] = m[4383];
  }
  function mc(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   return c = r, r = r + 16 | 0, a ? void (r = c) : (a = k[w >> 2] | 0, k[c >> 2] = k[96], k[c + 4 >> 2] = b, Jb(a | 0, 298120, c | 0) | 0, Qa(392, 1), void 0);
  }
  function Dg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   for (var d = 0, e = 0; (d | 0) < (c | 0); ) i[a + d >> 0] = e ? 0 : i[b + d >> 0] | 0, e = e ? 1 : (i[b + d >> 0] | 0) == 0, d = d + 1 | 0;
   return a | 0;
  }
  function Gc(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   a = a >>> 0 > 2 ? 2 : a, c = Fc(298456 + (a * 29 | 0) | 0) | 0, k[b >> 2] = c, a = Fc(298544 + (a * 180 | 0) | 0) | 0, k[b + 4 >> 2] = a;
  }
  function kc(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   for (c = a; ;) {
    if (!(mg(c, b, 4) | 0)) break;
    if (c = c + 1 | 0, c >>> 0 > (a + 28 | 0) >>> 0) {
     c = 0;
     break;
    }
   }
   return c | 0;
  }
  function pc() {
   var a = 0, b = 0;
   return b = r, r = r + 16 | 0, j[b >> 1] = -1, Ga(b | 0, 1, 2, k[140] | 0) | 0, a = j[b >> 1] | 0, a = oc(a & 255, (a & 65535) >>> 8 & 255) | 0, r = b, a | 0;
  }
  function Vg(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0;
   return e = r, r = r + 8 | 0, Wg(a, b, c, d, e | 0) | 0, r = e, O = k[e + 4 >> 2] | 0, k[e >> 2] | 0 | 0;
  }
  function Hg(a, b, c) {
   return a |= 0, b |= 0, c |= 0, (c | 0) < 32 ? (O = b >> c, a >>> c | (b & (1 << c) - 1) << 32 - c) : (O = (b | 0) < 0 ? -1 : 0, b >> c - 32 | 0);
  }
  function Mg(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   d = a + (Cg(a) | 0) | 0;
   do i[d + c >> 0] = i[b + c >> 0], c = c + 1 | 0; while (i[b + (c - 1) >> 0] | 0);
   return a | 0;
  }
  function Tg(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0, f = 0;
   return e = Qg(a, c) | 0, f = O, O = (ka(b, c) | 0) + (ka(d, a) | 0) + f | f & 0, e | 0 | 0 | 0;
  }
  function Ng(a, b, c) {
   return a |= 0, b |= 0, c |= 0, (c | 0) < 32 ? (O = b << c | (a & (1 << c) - 1 << 32 - c) >>> 32 - c, a << c) : (O = a << c - 32, 0);
  }
  function Ig(a, b, c) {
   return a |= 0, b |= 0, c |= 0, (c | 0) < 32 ? (O = b >>> c, a >>> c | (b & (1 << c) - 1) << 32 - c) : (O = 0, b >>> c - 32 | 0);
  }
  function dg(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0;
   var e = 0;
   return e = r, r = r + 16 | 0, k[e >> 2] = d, a = gg(a, b, c, e) | 0, r = e, a | 0;
  }
  function Ag() {}
  function Bg(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, d = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0, O = d, a - c >>> 0 | 0 | 0;
  }
  function Og(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   do i[a + c >> 0] = i[b + c >> 0], c = c + 1 | 0; while (i[b + (c - 1) >> 0] | 0);
   return a | 0;
  }
  function oc(a, b) {
   return a |= 0, b |= 0, b = (j[284] | 0) == 18761 ? (b & 255) << 8 | a & 255 : b & 255 | (a & 255) << 8, b & 65535 | 0;
  }
  function Eg(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, O = b + d + (a + c >>> 0 >>> 0 < a >>> 0 | 0) >>> 0, a + c >>> 0 | 0 | 0;
  }
  function xf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0;
   return d = r, r = r + 16 | 0, k[d >> 2] = c, c = zf(a, b, d) | 0, r = d, c | 0;
  }
  function rc() {
   var a = 0, b = 0;
   return b = r, r = r + 16 | 0, k[b >> 2] = -1, Ga(b | 0, 1, 4, k[140] | 0) | 0, a = qc(b) | 0, r = b, a | 0;
  }
  function eg(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0;
   d = r, r = r + 16 | 0, k[d >> 2] = c, hg(a, b, d), r = d;
  }
  function ch(a, b, c, d, e) {
   return a |= 0, b |= 0, c |= 0, d |= 0, e |= 0, _b[a & 3](b | 0, c | 0, d | 0, e | 0) | 0;
  }
  function Bf(a, b) {
   return a |= 0, b |= 0, a = Cf(a, b) | 0, ((i[a >> 0] | 0) == (b & 255) << 24 >> 24 ? a : 0) | 0;
  }
  function Df(a, b) {
   a |= 0, b |= 0;
   var c = 0;
   return c = lg(a, 0, b) | 0, ((c | 0) == 0 ? b : c - a | 0) | 0;
  }
  function Fc(a) {
   a |= 0;
   var b = 0;
   return b = r, r = r + 16 | 0, k[b >> 2] = a, a = Ec(b) | 0, r = b, a | 0;
  }
  function vh(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, Ga(a | 0, b | 0, c | 0, d | 0) | 0;
  }
  function uh(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, Hb(a | 0, b | 0, c | 0, d | 0) | 0;
  }
  function Xg(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, Tb[a & 7](b | 0, c | 0, d | 0) | 0;
  }
  function ah(a, b, c, d) {
   a |= 0, b |= 0, c |= 0, d |= 0, Yb[a & 1](b | 0, c | 0, d | 0);
  }
  function sc(a) {
   return a |= 0, a = (a | 0) == 3 ? (pc() | 0) & 65535 : rc() | 0, a | 0;
  }
  function Cg(a) {
   a |= 0;
   var b = 0;
   for (b = a; i[b >> 0] | 0; ) b = b + 1 | 0;
   return b - a | 0;
  }
  function Ug(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, Wg(a, b, c, d, 0) | 0;
  }
  function hg(a, b, c) {
   a |= 0, b |= 0, c |= 0, gg(a, 2147483647, b, c) | 0;
  }
  function ac(a) {
   a |= 0;
   var b = 0;
   return b = r, r = r + a | 0, r = r + 15 & -16, b | 0;
  }
  function Zf(a, b) {
   return a |= 0, b |= 0, a = a ? _f(a, b) | 0 : 0, a | 0;
  }
  function dh(a, b, c) {
   return a |= 0, b |= 0, c |= 0, $b[a & 15](b | 0, c | 0) | 0;
  }
  function hh(a, b, c) {
   return a |= 0, b |= 0, c |= 0, hb(a | 0, b | 0, c | 0) | 0;
  }
  function gh(a, b, c) {
   return a |= 0, b |= 0, c |= 0, kb(a | 0, b | 0, c | 0) | 0;
  }
  function fh(a, b, c) {
   return a |= 0, b |= 0, c |= 0, Jb(a | 0, b | 0, c | 0) | 0;
  }
  function vf(a) {
   return a |= 0, a = a ? (k[a >> 2] | 0) == 0 : 1, a & 1 | 0;
  }
  function Jf(a) {
   a |= 0;
   var b = 0;
   return b = (If(a) | 0) == 0, (b ? a : a | 32) | 0;
  }
  function th(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, na(7), 0;
  }
  function Ef(a, b) {
   return a |= 0, b |= 0, Af(a, b, (Cg(a | 0) | 0) + 1 | 0) | 0;
  }
  function Hf(a) {
   return a |= 0, ((a | 0) == 32 | (a + -9 | 0) >>> 0 < 5) & 1 | 0;
  }
  function _g(a, b, c) {
   a |= 0, b |= 0, c |= 0, Wb[a & 1](b | 0, c | 0);
  }
  function Gf(a, b, c) {
   return a |= 0, b |= 0, c |= 0, wf(a, b, c) | 0;
  }
  function eh(a, b, c) {
   return a |= 0, b |= 0, c |= 0, na(0), 0;
  }
  function ec(a, b) {
   a |= 0, b |= 0, z || (z = a, A = b);
  }
  function zh(a, b) {
   return a |= 0, b |= 0, eb(a | 0, b | 0) | 0;
  }
  function yh(a, b) {
   return a |= 0, b |= 0, ob(a | 0, b | 0) | 0;
  }
  function xh(a, b) {
   return a |= 0, b |= 0, Pb(a | 0, b | 0) | 0;
  }
  function Bh(a, b) {
   return a |= 0, b |= 0, Mg(a | 0, b | 0) | 0;
  }
  function Ah(a, b) {
   return a |= 0, b |= 0, Og(a | 0, b | 0) | 0;
  }
  function $g(a, b) {
   return a |= 0, b |= 0, Xb[a & 7](b | 0) | 0;
  }
  function Yg(a, b) {
   return a |= 0, b |= 0, +Ub[a & 1](b | 0);
  }
  function rh(a, b, c) {
   a |= 0, b |= 0, c |= 0, na(5);
  }
  function If(a) {
   return a |= 0, (a + -65 | 0) >>> 0 < 26 | 0;
  }
  function wh(a, b) {
   return a |= 0, b |= 0, na(8), 0;
  }
  function Zg(a, b) {
   a |= 0, b |= 0, Vb[a & 7](b | 0);
  }
  function Xf(a, b) {
   return a = +a, b |= 0, + +Wf(a, b);
  }
  function Vf(a, b) {
   return a = +a, b |= 0, + +Uf(a, b);
  }
  function dc(a, b) {
   a |= 0, b |= 0, r = a, s = b;
  }
  function Tf(a, b) {
   return a = +a, b = +b, + +Sf(a, b);
  }
  function Pf(a, b) {
   return a = +a, b = +b, + +Of(a, b);
  }
  function tf(a) {
   return a |= 0, + +Wf(1, a);
  }
  function qh(a) {
   return a |= 0, Cg(a | 0) | 0;
  }
  function ph(a) {
   return a |= 0, Ha(a | 0) | 0;
  }
  function oh(a) {
   return a |= 0, pb(a | 0) | 0;
  }
  function nh(a) {
   return a |= 0, bb(a | 0) | 0;
  }
  function lh(a, b) {
   a |= 0, b |= 0, na(3);
  }
  function ih(a) {
   return a |= 0, na(1), 0;
  }
  function mh(a) {
   return a |= 0, na(4), 0;
  }
  function ig(a) {
   return a |= 0, + +kg(a);
  }
  function bh(a) {
   a |= 0, Zb[a & 127]();
  }
  function kh(a) {
   a |= 0, cb(a | 0);
  }
  function jh(a) {
   a |= 0, na(2);
  }
  function hc(a) {
   a |= 0, O = a;
  }
  function cc(a) {
   a |= 0, r = a;
  }
  function ic() {
   return O | 0;
  }
  function bc() {
   return r | 0;
  }
  function yd() {}
  function xd() {}
  function Vd() {}
  function sh() {
   na(6);
  }
  var a = global.Int8Array, b = global.Int16Array, c = global.Int32Array, d = global.Uint8Array, e = global.Uint16Array, f = global.Uint32Array, g = global.Float32Array, h = global.Float64Array, i = new a(buffer), j = new b(buffer), k = new c(buffer), l = new d(buffer), m = new e(buffer), n = new f(buffer), o = new g(buffer), p = new h(buffer), q = global.byteLength, r = env.STACKTOP | 0, s = env.STACK_MAX | 0, t = env.tempDoublePtr | 0, v = env.cttz_i8 | 0, w = env._stderr | 0, x = env._stdin | 0, y = env._stdout | 0, z = 0, A = 0, B = 0, D = global.NaN, E = global.Infinity, O = 0, Y = global.Math.floor, Z = global.Math.abs, _ = global.Math.sqrt, $ = global.Math.pow, aa = global.Math.cos, ha = global.Math.exp, ia = global.Math.log, ka = global.Math.imul, ma = global.Math.clz32, na = env.abort, pa = env.invoke_iiii, qa = env.invoke_di, ra = env.invoke_vi, sa = env.invoke_vii, ta = env.invoke_ii, ua = env.invoke_viii, va = env.invoke_v, wa = env.invoke_iiiii, xa = env.invoke_iii, Da = env._getcwd, Fa = env._ntohl, Ga = env._fread, Ha = env._ctime, La = env._getc, Na = env._feof, Oa = env._ntohs, Qa = env._longjmp, Sa = env._htonl, Ta = env._time, Ua = env._localtime, Ya = env._fscanf, _a = env._sbrk, ab = env._emscripten_memcpy_big, bb = env._fileno, cb = env._perror, db = env._sysconf, eb = env._utime, gb = env._putc, hb = env._fseeko, ib = env._getc_unlocked, kb = env._fseek, ob = env._printf, pb = env._fclose, tb = env._htons, vb = env._ftell, wb = env.___errno_location, yb = env._swab, zb = env._ftello, Cb = env._fgets, Eb = env._fputc, Fb = env._abort, Gb = env._mktime, Hb = env._fwrite, Jb = env._fprintf, Kb = env._strerror, Ob = env._tmpfile, Pb = env._fopen, Tb = [ eh, tg, lg, fh, gh, hh, Gf, eh ], Ub = [ ih, ig ], Vb = [ jh, kh, vg, ke, le, ye, jh, jh ], Wb = [ lh, mc ], Xb = [ mh, jg, nh, oh, ph, ug, qh, mh ], Yb = [ rh, eg ], Zb = [ sh, gd, id, Ic, Nc, Ac, Kd, Ad, Dd, od, pd, sd, md, Ld, Nd, Od, Pd, nd, ld, Md, td, Vc, Uc, Tc, Hd, Gd, Fd, ad, _c, $c, Id, bd, Rd, Ud, Yd, _d, qf, Xd, vd, wd, qd, Vd, ud, Sc, Rc, yd, Oc, jd, kd, Bd, Cd, zd, xd, cd, jf, rf, ie, je, he, re, se, ue, ve, we, ze, Ae, Be, Ce, lf, kf, mf, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh, sh ], _b = [ th, uh, vh, dg ], $b = [ wh, og, xh, yh, zh, wg, Ah, Ef, Bh, wh, wh, wh, wh, wh, wh, wh ];
  return {
   _testSetjmp: Kg,
   _i64Subtract: Bg,
   _strcat: Mg,
   _free: vg,
   _main: sf,
   _strncpy: Dg,
   _memmove: Lg,
   _bitshift64Ashr: Hg,
   _saveSetjmp: Gg,
   _memset: Jg,
   _malloc: ug,
   _i64Add: Eg,
   _memcpy: Fg,
   _strlen: Cg,
   _bitshift64Lshr: Ig,
   _strcpy: Og,
   _bitshift64Shl: Ng,
   runPostSets: Ag,
   _emscripten_replace_memory: _emscripten_replace_memory,
   stackAlloc: ac,
   stackSave: bc,
   stackRestore: cc,
   establishStackSpace: dc,
   setThrew: ec,
   setTempRet0: hc,
   getTempRet0: ic,
   dynCall_iiii: Xg,
   dynCall_di: Yg,
   dynCall_vi: Zg,
   dynCall_vii: _g,
   dynCall_ii: $g,
   dynCall_viii: ah,
   dynCall_v: bh,
   dynCall_iiiii: ch,
   dynCall_iii: dh
  };
 }(Module.asmGlobalArg, Module.asmLibraryArg, buffer), _testSetjmp = Module._testSetjmp = asm._testSetjmp, _i64Subtract = Module._i64Subtract = asm._i64Subtract, _strcat = Module._strcat = asm._strcat, _strncpy = (Module._free = asm._free, Module._main = asm._main, Module._strncpy = asm._strncpy), _memmove = Module._memmove = asm._memmove, _bitshift64Ashr = Module._bitshift64Ashr = asm._bitshift64Ashr, _saveSetjmp = Module._saveSetjmp = asm._saveSetjmp, _memset = Module._memset = asm._memset, _malloc = Module._malloc = asm._malloc, _i64Add = Module._i64Add = asm._i64Add, _memcpy = Module._memcpy = asm._memcpy, _strlen = Module._strlen = asm._strlen, _bitshift64Lshr = Module._bitshift64Lshr = asm._bitshift64Lshr, _emscripten_replace_memory = (Module.runPostSets = asm.runPostSets, Module._emscripten_replace_memory = asm._emscripten_replace_memory), _strcpy = Module._strcpy = asm._strcpy, _bitshift64Shl = Module._bitshift64Shl = asm._bitshift64Shl;
 Module.dynCall_iiii = asm.dynCall_iiii, Module.dynCall_di = asm.dynCall_di, Module.dynCall_vi = asm.dynCall_vi, Module.dynCall_vii = asm.dynCall_vii, Module.dynCall_ii = asm.dynCall_ii, Module.dynCall_viii = asm.dynCall_viii, Module.dynCall_v = asm.dynCall_v, Module.dynCall_iiiii = asm.dynCall_iiiii, Module.dynCall_iii = asm.dynCall_iii;
 Runtime.stackAlloc = asm.stackAlloc, Runtime.stackSave = asm.stackSave, Runtime.stackRestore = asm.stackRestore, Runtime.establishStackSpace = asm.establishStackSpace, Runtime.setTempRet0 = asm.setTempRet0, Runtime.getTempRet0 = asm.getTempRet0;
 ExitStatus.prototype = new Error(), ExitStatus.prototype.constructor = ExitStatus;
 var initialStackTop, preloadStartTime = null, calledMain = !1;
 dependenciesFulfilled = function runCaller() {
  Module.calledRun || run(), Module.calledRun || (dependenciesFulfilled = runCaller);
 }, Module.callMain = Module.callMain = function(args) {
  function pad() {
   for (var i = 0; 3 > i; i++) argv.push(0);
  }
  assert(0 == runDependencies, "cannot call main when async dependencies remain! (listen on __ATMAIN__)"), assert(0 == __ATPRERUN__.length, "cannot call main when preRun functions remain to be called"), args = args || [], ensureInitRuntime();
  var argc = args.length + 1, argv = [ allocate(intArrayFromString(Module.thisProgram), "i8", ALLOC_NORMAL) ];
  pad();
  for (var i = 0; argc - 1 > i; i += 1) argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL)), pad();
  argv.push(0), argv = allocate(argv, "i32", ALLOC_NORMAL), initialStackTop = STACKTOP;
  try {
   var ret = Module._main(argc, argv, 0);
   exit(ret, !0);
  } catch (e) {
   if (e instanceof ExitStatus) return;
   if ("SimulateInfiniteLoop" == e) return void (Module.noExitRuntime = !0);
   throw e && "object" == typeof e && e.stack && Module.printErr("exception thrown: " + [ e, e.stack ]), e;
  } finally {
   calledMain = !0;
  }
 }, Module.run = Module.run = run, Module.exit = Module.exit = exit;
 var abortDecorators = [];
 if (Module.abort = Module.abort = abort, Module.preInit) for ("function" == typeof Module.preInit && (Module.preInit = [ Module.preInit ]); Module.preInit.length > 0; ) Module.preInit.pop()();
 var shouldRunNow = !1;
 Module.noInitialRun && (shouldRunNow = !1), Module.noExitRuntime = !0, run(), exports.ver = 1.476, exports.run = run, exports.FS = FS, Object.freeze(exports);
}({}, function() {
 return this;
}());