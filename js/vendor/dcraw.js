/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL License
 *
 * dcraw.js -- Dave Coffin's raw photo decoder JavaScript port
 * Copyright 1997-2015 by Dave Coffin, dcoffin a cybercom o net
 * Copyright 2014-2018 by Mega Limited, dc a mega o nz
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
 * $Revision: 1.477 $
 * $Date: 2016/05/10 21:30:43 $
 *
 * ***** END LICENSE BLOCK ***** */

!function(exports) {
 function assert(condition, text) {
  condition || abort("Assertion failed: " + text);
 }
 function setValue(ptr, value, type, noSafe) {
  switch ("*" === (type = type || "i8").charAt(type.length - 1) && (type = "i32"), type) {
  case "i1":
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
 function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  "number" == typeof slab ? (zeroinit = !0, size = slab) : (zeroinit = !1, size = slab.length);
  var ret, singleType = "string" == typeof types ? types : null;
  if (ret = allocator == ALLOC_NONE ? ptr : [ "function" == typeof _malloc ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc ][void 0 === allocator ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length)), zeroinit) {
   var stop, ptr = ret;
   for (assert(0 == (3 & ret)), stop = ret + (-4 & size); ptr < stop; ptr += 4) HEAP32[ptr >> 2] = 0;
   for (stop = ret + size; ptr < stop; ) HEAP8[ptr++ >> 0] = 0;
   return ret;
  }
  if ("i8" === singleType) return slab.subarray || slab.slice ? HEAPU8.set(slab, ret) : HEAPU8.set(new Uint8Array(slab), ret), ret;
  for (var type, typeSize, previousType, i = 0; i < size; ) {
   var curr = slab[i];
   "function" == typeof curr && (curr = Runtime.getFunctionIndex(curr)), 0 !== (type = singleType || types[i]) ? ("i64" == type && (type = "i32"), setValue(ret + i, curr, type), previousType !== type && (typeSize = Runtime.getNativeTypeSize(type), previousType = type), i += typeSize) : i++;
  }
  return ret;
 }
 function Pointer_stringify(ptr, length) {
  if (0 === length || !ptr) return "";
  for (var t, hasUtf = 0, i = 0; t = HEAPU8[ptr + i >> 0], hasUtf |= t, (0 != t || length) && (i++, !length || i != length); ) ;
  length || (length = i);
  var ret = "";
  if (hasUtf < 128) {
   for (var curr; length > 0; ) curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, 1024))), ret = ret ? ret + curr : curr, ptr += 1024, length -= 1024;
   return ret;
  }
  return UTF8ArrayToString(HEAPU8, ptr);
 }
 function UTF8ArrayToString(u8Array, idx) {
  for (var endPtr = idx; u8Array[endPtr]; ) ++endPtr;
  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  for (var u0, u1, u2, u3, u4, str = ""; ;) {
   if (!(u0 = u8Array[idx++])) return str;
   if (128 & u0) if (u1 = 63 & u8Array[idx++], 192 != (224 & u0)) if (u2 = 63 & u8Array[idx++], 224 == (240 & u0) ? u0 = (15 & u0) << 12 | u1 << 6 | u2 : (u3 = 63 & u8Array[idx++], 240 == (248 & u0) ? u0 = (7 & u0) << 18 | u1 << 12 | u2 << 6 | u3 : (u4 = 63 & u8Array[idx++], u0 = 248 == (252 & u0) ? (3 & u0) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4 : (1 & u0) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | 63 & u8Array[idx++])), u0 < 65536) str += String.fromCharCode(u0); else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | 1023 & ch);
   } else str += String.fromCharCode((31 & u0) << 6 | u1); else str += String.fromCharCode(u0);
  }
 }
 function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) return 0;
  for (var startIdx = outIdx, endIdx = outIdx + maxBytesToWrite - 1, i = 0; i < str.length; ++i) {
   var u = str.charCodeAt(i);
   if (u >= 55296 && u <= 57343 && (u = 65536 + ((1023 & u) << 10) | 1023 & str.charCodeAt(++i)), u <= 127) {
    if (outIdx >= endIdx) break;
    outU8Array[outIdx++] = u;
   } else if (u <= 2047) {
    if (outIdx + 1 >= endIdx) break;
    outU8Array[outIdx++] = 192 | u >> 6, outU8Array[outIdx++] = 128 | 63 & u;
   } else if (u <= 65535) {
    if (outIdx + 2 >= endIdx) break;
    outU8Array[outIdx++] = 224 | u >> 12, outU8Array[outIdx++] = 128 | u >> 6 & 63, outU8Array[outIdx++] = 128 | 63 & u;
   } else if (u <= 2097151) {
    if (outIdx + 3 >= endIdx) break;
    outU8Array[outIdx++] = 240 | u >> 18, outU8Array[outIdx++] = 128 | u >> 12 & 63, outU8Array[outIdx++] = 128 | u >> 6 & 63, outU8Array[outIdx++] = 128 | 63 & u;
   } else if (u <= 67108863) {
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
  for (var len = 0, i = 0; i < str.length; ++i) {
   var u = str.charCodeAt(i);
   u >= 55296 && u <= 57343 && (u = 65536 + ((1023 & u) << 10) | 1023 & str.charCodeAt(++i)), u <= 127 ? ++len : len += u <= 2047 ? 2 : u <= 65535 ? 3 : u <= 2097151 ? 4 : u <= 67108863 ? 5 : 6;
  }
  return len;
 }
 function alignUp(x, multiple) {
  return x % multiple > 0 && (x += multiple - x % multiple), x;
 }
 function updateGlobalBuffer(buf) {
  Module.buffer = buffer = buf;
 }
 function updateGlobalBufferViews() {
  Module.HEAP8 = HEAP8 = new Int8Array(buffer), Module.HEAP16 = HEAP16 = new Int16Array(buffer), Module.HEAP32 = HEAP32 = new Int32Array(buffer), Module.HEAPU8 = HEAPU8 = new Uint8Array(buffer), Module.HEAPU16 = HEAPU16 = new Uint16Array(buffer), Module.HEAPU32 = HEAPU32 = new Uint32Array(buffer), Module.HEAPF32 = HEAPF32 = new Float32Array(buffer), Module.HEAPF64 = HEAPF64 = new Float64Array(buffer);
 }
 function enlargeMemory() {
  var PAGE_MULTIPLE = Module.usingWasm ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE, LIMIT = 2147483648 - PAGE_MULTIPLE;
  if (HEAP32[DYNAMICTOP_PTR >> 2] > LIMIT) return !1;
  var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
  for (TOTAL_MEMORY = Math.max(TOTAL_MEMORY, MIN_TOTAL_MEMORY); TOTAL_MEMORY < HEAP32[DYNAMICTOP_PTR >> 2]; ) TOTAL_MEMORY = TOTAL_MEMORY <= 536870912 ? alignUp(2 * TOTAL_MEMORY, PAGE_MULTIPLE) : Math.min(alignUp((3 * TOTAL_MEMORY + 2147483648) / 4, PAGE_MULTIPLE), LIMIT);
  var replacement = Module.reallocBuffer(TOTAL_MEMORY);
  return replacement && replacement.byteLength == TOTAL_MEMORY ? (updateGlobalBuffer(replacement), updateGlobalBufferViews(), !0) : (TOTAL_MEMORY = OLD_TOTAL_MEMORY, !1);
 }
 function callRuntimeCallbacks(callbacks) {
  for (;callbacks.length > 0; ) {
   var callback = callbacks.shift();
   if ("function" != typeof callback) {
    var func = callback.func;
    "number" == typeof func ? void 0 === callback.arg ? Module.dynCall_v(func) : Module.dynCall_vi(func, callback.arg) : func(void 0 === callback.arg ? null : callback.arg);
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
 function postRun() {
  if (Module.postRun) for ("function" == typeof Module.postRun && (Module.postRun = [ Module.postRun ]); Module.postRun.length; ) addOnPostRun(Module.postRun.shift());
  callRuntimeCallbacks(__ATPOSTRUN__);
 }
 function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
 }
 function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
 }
 function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1, u8array = new Array(len), numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  return dontAddNull && (u8array.length = numBytesWritten), u8array;
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
 function ___setErrNo(value) {
  return Module.___errno_location && (HEAP32[Module.___errno_location() >> 2] = value), value;
 }
 function _localtime_r(time, tmPtr) {
  _tzset();
  var date = new Date(1e3 * HEAP32[time >> 2]);
  HEAP32[tmPtr >> 2] = date.getSeconds(), HEAP32[tmPtr + 4 >> 2] = date.getMinutes(), HEAP32[tmPtr + 8 >> 2] = date.getHours(), HEAP32[tmPtr + 12 >> 2] = date.getDate(), HEAP32[tmPtr + 16 >> 2] = date.getMonth(), HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900, HEAP32[tmPtr + 24 >> 2] = date.getDay();
  var start = new Date(date.getFullYear(), 0, 1), yday = (date.getTime() - start.getTime()) / 864e5 | 0;
  HEAP32[tmPtr + 28 >> 2] = yday, HEAP32[tmPtr + 36 >> 2] = -60 * date.getTimezoneOffset();
  var summerOffset = new Date(2e3, 6, 1).getTimezoneOffset(), winterOffset = start.getTimezoneOffset(), dst = date.getTimezoneOffset() == Math.min(winterOffset, summerOffset) | 0;
  HEAP32[tmPtr + 32 >> 2] = dst;
  var zonePtr = HEAP32[_tzname + (dst ? Runtime.QUANTUM_SIZE : 0) >> 2];
  return HEAP32[tmPtr + 40 >> 2] = zonePtr, tmPtr;
 }
 function _llvm_exp2_f32(x) {
  return Math.pow(2, x);
 }
 function _emscripten_get_now() {
  abort();
 }
 function _emscripten_get_now_is_monotonic() {
  return "undefined" != typeof dateNow || self.performance && self.performance.now;
 }
 function _clock_gettime(clk_id, tp) {
  var now;
  if (0 === clk_id) now = Date.now(); else {
   if (1 !== clk_id || !_emscripten_get_now_is_monotonic()) return ___setErrNo(ENO.EINVAL), -1;
   now = _emscripten_get_now();
  }
  return HEAP32[tp >> 2] = now / 1e3 | 0, HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0, 0;
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
  }, months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
  return stringToUTF8([ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ][date.tm_wday] + " " + months[date.tm_mon] + (date.tm_mday < 10 ? "  " : " ") + date.tm_mday + (date.tm_hour < 10 ? " 0" : " ") + date.tm_hour + (date.tm_min < 10 ? ":0" : ":") + date.tm_min + (date.tm_sec < 10 ? ":0" : ":") + date.tm_sec + " " + (1900 + date.tm_year) + "\n", buf, 26), buf;
 }
 function _ctime_r(time, buf) {
  var stack = Runtime.stackSave(), rv = _asctime_r(_localtime_r(time, Runtime.stackAlloc(44)), buf);
  return Runtime.stackRestore(stack), rv;
 }
 function run(args) {
  preRun(), Module.calledRun || Module.calledRun || (Module.calledRun = !0, ABORT || (ensureInitRuntime(), preMain(), run = Module.callMain, postRun()));
 }
 function abort(e) {
  throw new Error(e);
 }
 var Module;
 Module || (Module = ("undefined" != typeof DCRawMod ? DCRawMod : null) || {});
 var moduleOverrides = {};
 for (var key in Module) Module.hasOwnProperty(key) && (moduleOverrides[key] = Module[key]);
 self.d && "undefined" != typeof console ? (Module.print || (Module.print = function(x) {
  console.log(x);
 }), Module.printErr || (Module.printErr = function(x) {
  console.warn(x);
 })) : Module.print || (Module.print = function(x) {}), Module.print || (Module.print = function() {}), Module.printErr || (Module.printErr = Module.print), Module.thisProgram || (Module.thisProgram = "./dcraw"), Module.quit || (Module.quit = function(status, toThrow) {
  throw toThrow;
 }), Module.preRun = [], Module.postRun = [];
 for (var key in moduleOverrides) moduleOverrides.hasOwnProperty(key) && (Module[key] = moduleOverrides[key]);
 moduleOverrides = void 0;
 var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64, STATICTOP, STACKTOP, STACK_MAX, DYNAMIC_BASE, DYNAMICTOP_PTR, Runtime = {
  setTempRet0: function(value) {
   return tempRet0 = value, value;
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
     return assert(bits % 8 == 0), bits / 8;
    }
    return 0;
   }
  },
  getNativeFieldSize: function(type) {
   return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function(ptr, type) {
   return "double" === type || "i64" === type ? 7 & ptr && (assert(4 == (7 & ptr)), ptr += 4) : assert(0 == (3 & ptr)), ptr;
  },
  getAlignSize: function(type, size, vararg) {
   return vararg || "i64" != type && "double" != type ? type ? Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE) : Math.min(size, 8) : 8;
  },
  dynCall: function(sig, ptr, args) {
   return args && args.length ? Module["dynCall_" + sig].apply(null, [ ptr ].concat(args)) : Module["dynCall_" + sig].call(null, ptr);
  },
  x: 0,
  y: 0,
  z: 0,
  o: 0,
  q: 0,
  w: 0,
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
   var ret = HEAP32[DYNAMICTOP_PTR >> 2], end = -16 & (ret + size + 15 | 0);
   return HEAP32[DYNAMICTOP_PTR >> 2] = end, end >= TOTAL_MEMORY && !enlargeMemory() ? (HEAP32[DYNAMICTOP_PTR >> 2] = ret, 0) : ret;
  },
  alignMemory: function(size, quantum) {
   return size = Math.ceil(size / (quantum || 16)) * (quantum || 16);
  },
  makeBigInt: function(low, high, unsigned) {
   return unsigned ? +(low >>> 0) + 4294967296 * +(high >>> 0) : +(low >>> 0) + 4294967296 * +(0 | high);
  },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
 }, ABORT = 0, ALLOC_NORMAL = 0, ALLOC_STATIC = 2, ALLOC_NONE = 4, UTF8Decoder = "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0, WASM_PAGE_SIZE = ("undefined" != typeof TextDecoder && new TextDecoder("utf-16le"), 65536), ASMJS_PAGE_SIZE = 16777216, MIN_TOTAL_MEMORY = 16777216;
 STATICTOP = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0, Module.reallocBuffer || (Module.reallocBuffer = function(size) {
  var ret;
  try {
   if (ArrayBuffer.transfer) ret = ArrayBuffer.transfer(buffer, size); else {
    var oldHEAP8 = HEAP8;
    ret = new ArrayBuffer(size), new Int8Array(ret).set(oldHEAP8);
   }
  } catch (e) {
   return !1;
  }
  return !!_emscripten_replace_memory(ret) && ret;
 });
 var byteLength;
 try {
  (byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get))(new ArrayBuffer(4));
 } catch (e) {
  byteLength = function(buffer) {
   return buffer.byteLength;
  };
 }
 var TOTAL_STACK = Module.TOTAL_STACK || 5242880, TOTAL_MEMORY = Module.TOTAL_MEMORY || 16777216;
 if (buffer = Module.buffer ? Module.buffer : new ArrayBuffer(TOTAL_MEMORY), updateGlobalBufferViews(), HEAP32[0] = 1668509029, HEAP16[1] = 25459, 115 !== HEAPU8[2] || 99 !== HEAPU8[3]) throw "Runtime error: expected the system to be little-endian!";
 var __ATPRERUN__ = [], __ATINIT__ = [], __ATMAIN__ = [], __ATEXIT__ = [], __ATPOSTRUN__ = [], runtimeInitialized = !1;
 Math.imul && -5 === Math.imul(4294967295, 5) || (Math.imul = function(a, b) {
  var al = 65535 & a, bl = 65535 & b;
  return al * bl + ((a >>> 16) * bl + al * (b >>> 16) << 16) | 0;
 }), Math.imul = Math.imul, Math.clz32 || (Math.clz32 = function(x) {
  x >>>= 0;
  for (var i = 0; i < 32; i++) if (x & 1 << 31 - i) return i;
  return 32;
 }), Math.clz32 = Math.clz32, Math.trunc || (Math.trunc = function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
 }), Math.trunc = Math.trunc;
 var Math_abs = Math.abs, Math_ceil = (Math, Math, Math, Math, Math, Math, Math, Math, Math, Math, Math.ceil), Math_floor = Math.floor, Math_pow = Math.pow, Math_min = (Math, Math, Math, Math.min);
 Math, Math, STATICTOP = Runtime.GLOBAL_BASE + 363088, __ATINIT__.push();
 var tempDoublePtr = STATICTOP, _tzname = STATICTOP += 16, _daylight = STATICTOP += 16, _timezone = STATICTOP += 16;
 STATICTOP += 16;
 var ENO = {
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
 }, EME = {
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
 }, PATH = {
  splitPath: function(filename) {
   return /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(filename).slice(1);
  },
  normalizeArray: function(parts, allowAboveRoot) {
   for (var up = 0, i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    "." === last ? parts.splice(i, 1) : ".." === last ? (parts.splice(i, 1), up++) : up && (parts.splice(i, 1), up--);
   }
   if (allowAboveRoot) for (;up; up--) parts.unshift("..");
   return parts;
  },
  normalize: function(path) {
   var isAbsolute = "/" === path.charAt(0), trailingSlash = "/" === path.substr(-1);
   return (path = PATH.normalizeArray(path.split("/").filter(function(p) {
    return !!p;
   }), !isAbsolute).join("/")) || isAbsolute || (path = "."), path && trailingSlash && (path += "/"), (isAbsolute ? "/" : "") + path;
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
    for (var start = 0; start < arr.length && "" === arr[start]; start++) ;
    for (var end = arr.length - 1; end >= 0 && "" === arr[end]; end--) ;
    return start > end ? [] : arr.slice(start, end - start + 1);
   }
   from = PATH.resolve(from).substr(1), to = PATH.resolve(to).substr(1);
   for (var fromParts = trim(from.split("/")), toParts = trim(to.split("/")), length = Math.min(fromParts.length, toParts.length), samePartsLength = length, i = 0; i < length; i++) if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
   for (var outputParts = [], i = samePartsLength; i < fromParts.length; i++) outputParts.push("..");
   return (outputParts = outputParts.concat(toParts.slice(samePartsLength))).join("/");
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
    if (!tty) throw new FS.Eno(ENO.ENODEV);
    stream.tty = tty, stream.seekable = !1;
   },
   close: function(stream) {
    stream.tty.ops.flush(stream.tty);
   },
   flush: function(stream) {
    stream.tty.ops.flush(stream.tty);
   },
   read: function(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.get_char) throw new FS.Eno(ENO.ENXIO);
    for (var bytesRead = 0, i = 0; i < length; i++) {
     var result;
     try {
      result = stream.tty.ops.get_char(stream.tty);
     } catch (e) {
      throw new FS.Eno(ENO.EIO);
     }
     if (void 0 === result && 0 === bytesRead) throw new FS.Eno(ENO.EAGAIN);
     if (null === result || void 0 === result) break;
     bytesRead++, buffer[offset + i] = result;
    }
    return bytesRead && (stream.node.timestamp = Date.now()), bytesRead;
   },
   write: function(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.put_char) throw new FS.Eno(ENO.ENXIO);
    for (var i = 0; i < length; i++) try {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    } catch (e) {
     throw new FS.Eno(ENO.EIO);
    }
    return length && (stream.node.timestamp = Date.now()), i;
   }
  },
  default_tty_ops: {
   get_char: function(tty) {
    if (!tty.input.length) {
     var result = null;
     if ("undefined" != typeof window && "function" == typeof window.prompt ? null !== (result = window.prompt("Input: ")) && (result += "\n") : "function" == typeof readline && null !== (result = readline()) && (result += "\n"), !result) return null;
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
   if (FS.isBlkdev(mode) || FS.isFIFO(mode)) throw new FS.Eno(ENO.EPERM);
   MEMFS.ops_table || (MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: 0,
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
      mmap: 0,
      msync: 0
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
    for (var arr = [], i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
    return arr;
   }
   return node.contents;
  },
  getFileDataAsTypedArray: function(node) {
   return node.contents ? node.contents.subarray ? node.contents.subarray(0, node.usedBytes) : new Uint8Array(node.contents) : new Uint8Array();
  },
  expandFileStorage: function(node, newCapacity) {
   if (!node.contents || node.contents.subarray) {
    var prevCapacity = node.contents ? node.contents.length : 0;
    if (prevCapacity >= newCapacity) return;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < 1048576 ? 2 : 1.125) | 0), 0 != prevCapacity && (newCapacity = Math.max(newCapacity, 256));
    var oldContents = node.contents;
    return node.contents = new Uint8Array(newCapacity), void (node.usedBytes > 0 && node.contents.set(oldContents.subarray(0, node.usedBytes), 0));
   }
   for (!node.contents && newCapacity > 0 && (node.contents = []); node.contents.length < newCapacity; ) node.contents.push(0);
  },
  resizeFileStorage: function(node, newSize) {
   if (node.usedBytes != newSize) {
    if (0 == newSize) return node.contents = null, void (node.usedBytes = 0);
    if (!node.contents || node.contents.subarray) {
     var oldContents = node.contents;
     return node.contents = new Uint8Array(new ArrayBuffer(newSize)), oldContents && node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))), void (node.usedBytes = newSize);
    }
    if (node.contents || (node.contents = []), node.contents.length > newSize) node.contents.length = newSize; else for (;node.contents.length < newSize; ) node.contents.push(0);
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
    throw FS.genericErrors[ENO.ENOENT];
   },
   mknod: function(parent, name, mode, dev) {
    return MEMFS.createNode(parent, name, mode, dev);
   },
   rename: 0,
   unlink: function(parent, name) {
    delete parent.contents[name];
   },
   rmdir: function(parent, name) {
    var node = FS.lookupNode(parent, name);
    for (var i in node.contents) throw new FS.Eno(ENO.ENOTEMPTY);
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
    if (!FS.isLink(node.mode)) throw new FS.Eno(ENO.EINVAL);
    return node.link;
   }
  },
  stream_ops: {
   read: function(stream, buffer, offset, length, position) {
    var contents = stream.node.contents;
    if (position >= stream.node.usedBytes) return 0;
    var size = Math.min(stream.node.usedBytes - position, length);
    if (assert(size >= 0), size > 8 && contents.subarray) buffer.set(contents.subarray(position, position + size), offset); else for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
    return size;
   },
   write: function(stream, buffer, offset, length, position, canOwn) {
    if (!length) return 0;
    var node = stream.node;
    if (node.timestamp = Date.now(), buffer.subarray && (!node.contents || node.contents.subarray)) {
     if (canOwn) return node.contents = buffer.subarray(offset, offset + length), node.usedBytes = length, length;
     if (0 === node.usedBytes && 0 === position) return node.contents = new Uint8Array(buffer.subarray(offset, offset + length)), node.usedBytes = length, length;
     if (position + length <= node.usedBytes) return node.contents.set(buffer.subarray(offset, offset + length), position), length;
    }
    if (MEMFS.expandFileStorage(node, position + length), node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else for (var i = 0; i < length; i++) node.contents[position + i] = buffer[offset + i];
    return node.usedBytes = Math.max(node.usedBytes, position + length), length;
   },
   llseek: function(stream, offset, whence) {
    var position = offset;
    if (1 === whence ? position += stream.position : 2 === whence && FS.isFile(stream.node.mode) && (position += stream.node.usedBytes), position < 0) throw new FS.Eno(ENO.EINVAL);
    return position;
   },
   allocate: function(stream, offset, length) {
    MEMFS.expandFileStorage(stream.node, offset + length), stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
   },
   mmap: 0,
   msync: 0
  }
 };
 STATICTOP += 16, STATICTOP += 16;
 var FS = {
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
  Eno: null,
  genericErrors: {},
  filesystems: null,
  syncFSRequests: 0,
  k: 0,
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
   if (opts.recurse_count > 8) throw new FS.Eno(ENO.ELOOP);
   for (var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
    return !!p;
   }), !1), current = FS.root, current_path = "/", i = 0; i < parts.length; i++) {
    var islast = i === parts.length - 1;
    if (islast && opts.parent) break;
    if (current = FS.lookupNode(current, parts[i]), current_path = PATH.join2(current_path, parts[i]), FS.isMountpoint(current) && (!islast || islast && opts.follow_mount) && (current = current.mounted.root), !islast || opts.follow) for (var count = 0; FS.isLink(current.mode); ) {
     var link = FS.readlink(current_path);
     if (current_path = PATH.resolve(PATH.dirname(current_path), link), current = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     }).node, count++ > 40) throw new FS.Eno(ENO.ELOOP);
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
   for (var hash = 0, i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
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
   if (err) throw new FS.Eno(err, parent);
   for (var hash = FS.hashName(parent.id, name), node = FS.nameTable[hash]; node; node = node.name_next) {
    var nodeName = node.name;
    if (node.parent.id === parent.id && nodeName === name) return node;
   }
   return FS.lookup(parent, name);
  },
  createNode: function(parent, name, mode, rdev) {
   FS.FSNode || (FS.FSNode = function(parent, name, mode, rdev) {
    parent || (parent = this), this.parent = parent, this.mount = parent.mount, this.mounted = null, this.id = FS.nextInode++, this.name = name, this.mode = mode, this.node_ops = {}, this.stream_ops = {}, this.rdev = rdev;
   }, FS.FSNode.prototype = {}, Object.defineProperties(FS.FSNode.prototype, {
    read: {
     get: function() {
      return 365 == (365 & this.mode);
     },
     set: function(val) {
      val ? this.mode |= 365 : this.mode &= -366;
     }
    },
    write: {
     get: function() {
      return 146 == (146 & this.mode);
     },
     set: function(val) {
      val ? this.mode |= 146 : this.mode &= -147;
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
   }));
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
   return 32768 == (61440 & mode);
  },
  isDir: function(mode) {
   return 16384 == (61440 & mode);
  },
  isLink: function(mode) {
   return 40960 == (61440 & mode);
  },
  isChrdev: function(mode) {
   return 8192 == (61440 & mode);
  },
  isBlkdev: function(mode) {
   return 24576 == (61440 & mode);
  },
  isFIFO: function(mode) {
   return 4096 == (61440 & mode);
  },
  isSocket: function(mode) {
   return 49152 == (49152 & mode);
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
   if (void 0 === flags) throw new Error("Unknown file open mode: " + str);
   return flags;
  },
  flagsToPermissionString: function(flag) {
   var perms = [ "r", "w", "rw" ][3 & flag];
   return 512 & flag && (perms += "w"), perms;
  },
  nodePermissions: function(node, perms) {
   return FS.ignorePermissions ? 0 : (-1 === perms.indexOf("r") || 292 & node.mode) && (-1 === perms.indexOf("w") || 146 & node.mode) && (-1 === perms.indexOf("x") || 73 & node.mode) ? 0 : ENO.EACCES;
  },
  mayLookup: function(dir) {
   return FS.nodePermissions(dir, "x") || (dir.node_ops.lookup ? 0 : ENO.EACCES);
  },
  mayCreate: function(dir, name) {
   try {
    return FS.lookupNode(dir, name), ENO.EEXIST;
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
    if (!FS.isDir(node.mode)) return ENO.ENOTDIR;
    if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return ENO.EBUSY;
   } else if (FS.isDir(node.mode)) return ENO.EISDIR;
   return 0;
  },
  mayOpen: function(node, flags) {
   return node ? FS.isLink(node.mode) ? ENO.ELOOP : FS.isDir(node.mode) && ("r" !== FS.flagsToPermissionString(flags) || 512 & flags) ? ENO.EISDIR : FS.nodePermissions(node, FS.flagsToPermissionString(flags)) : ENO.ENOENT;
  },
  MAX_OPEN_FDS: 4096,
  nextfd: function(fd_start, fd_end) {
   fd_start = fd_start || 0, fd_end = fd_end || FS.MAX_OPEN_FDS;
   for (var fd = fd_start; fd <= fd_end; fd++) if (!FS.streams[fd]) return fd;
   throw new FS.Eno(ENO.EMFILE);
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
      return 1 != (2097155 & this.flags);
     }
    },
    isWrite: {
     get: function() {
      return 0 != (2097155 & this.flags);
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
  chrdev_stream_ops: {
   open: function(stream) {
    var device = FS.getDevice(stream.node.rdev);
    stream.stream_ops = device.stream_ops, stream.stream_ops.open && stream.stream_ops.open(stream);
   },
   llseek: function() {
    throw new FS.Eno(ENO.ESPIPE);
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
  syncfs: 0,
  mount: function(type, opts, mountpoint) {
   var node, root = "/" === mountpoint, pseudo = !mountpoint;
   if (root && FS.root) throw new FS.Eno(ENO.EBUSY);
   if (!root && !pseudo) {
    var lookup = FS.lookupPath(mountpoint, {
     follow_mount: !1
    });
    if (mountpoint = lookup.path, node = lookup.node, FS.isMountpoint(node)) throw new FS.Eno(ENO.EBUSY);
    if (!FS.isDir(node.mode)) throw new FS.Eno(ENO.ENOTDIR);
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
   if (!FS.isMountpoint(lookup.node)) throw new FS.Eno(ENO.EINVAL);
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
   var parent = FS.lookupPath(path, {
    parent: !0
   }).node, name = PATH.basename(path);
   if (!name || "." === name || ".." === name) throw new FS.Eno(ENO.EINVAL);
   var err = FS.mayCreate(parent, name);
   if (err) throw new FS.Eno(err);
   if (!parent.node_ops.mknod) throw new FS.Eno(ENO.EPERM);
   return parent.node_ops.mknod(parent, name, mode, dev);
  },
  create: function(path, mode) {
   return mode = void 0 !== mode ? mode : 438, mode &= 4095, mode |= 32768, FS.mknod(path, mode, 0);
  },
  mkdir: function(path, mode) {
   return mode = void 0 !== mode ? mode : 511, mode &= 1023, mode |= 16384, FS.mknod(path, mode, 0);
  },
  mkdirTree: function(path, mode) {
   for (var dirs = path.split("/"), d = "", i = 0; i < dirs.length; ++i) if (dirs[i]) {
    d += "/" + dirs[i];
    try {
     FS.mkdir(d, mode);
    } catch (e) {
     if (e.errno != ENO.EEXIST) throw e;
    }
   }
  },
  mkdev: function(path, mode, dev) {
   return void 0 === dev && (dev = mode, mode = 438), mode |= 8192, FS.mknod(path, mode, dev);
  },
  symlink: function(oldpath, newpath) {
   if (!PATH.resolve(oldpath)) throw new FS.Eno(ENO.ENOENT);
   var parent = FS.lookupPath(newpath, {
    parent: !0
   }).node;
   if (!parent) throw new FS.Eno(ENO.ENOENT);
   var newname = PATH.basename(newpath), err = FS.mayCreate(parent, newname);
   if (err) throw new FS.Eno(err);
   if (!parent.node_ops.symlink) throw new FS.Eno(ENO.EPERM);
   return parent.node_ops.symlink(parent, newname, oldpath);
  },
  rename: 0,
  rmdir: function(path) {
   var parent = FS.lookupPath(path, {
    parent: !0
   }).node, name = PATH.basename(path), node = FS.lookupNode(parent, name), err = FS.mayDelete(parent, name, !0);
   if (err) throw new FS.Eno(err);
   if (!parent.node_ops.rmdir) throw new FS.Eno(ENO.EPERM);
   if (FS.isMountpoint(node)) throw new FS.Eno(ENO.EBUSY);
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
   var node = FS.lookupPath(path, {
    follow: !0
   }).node;
   if (!node.node_ops.readdir) throw new FS.Eno(ENO.ENOTDIR);
   return node.node_ops.readdir(node);
  },
  unlink: function(path) {
   var parent = FS.lookupPath(path, {
    parent: !0
   }).node, name = PATH.basename(path), node = FS.lookupNode(parent, name), err = FS.mayDelete(parent, name, !1);
   if (err) throw new FS.Eno(err);
   if (!parent.node_ops.unlink) throw new FS.Eno(ENO.EPERM);
   if (FS.isMountpoint(node)) throw new FS.Eno(ENO.EBUSY);
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
   var link = FS.lookupPath(path).node;
   if (!link) throw new FS.Eno(ENO.ENOENT);
   if (!link.node_ops.readlink) throw new FS.Eno(ENO.EINVAL);
   return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
  },
  stat: function(path, dontFollow) {
   var node = FS.lookupPath(path, {
    follow: !dontFollow
   }).node;
   if (!node) throw new FS.Eno(ENO.ENOENT);
   if (!node.node_ops.getattr) throw new FS.Eno(ENO.EPERM);
   return node.node_ops.getattr(node);
  },
  lstat: function(path) {
   return FS.stat(path, !0);
  },
  chmod: function(path, mode, dontFollow) {
   var node;
   if (!(node = "string" == typeof path ? FS.lookupPath(path, {
    follow: !dontFollow
   }).node : path).node_ops.setattr) throw new FS.Eno(ENO.EPERM);
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
   if (!stream) throw new FS.Eno(ENO.EBADF);
   FS.chmod(stream.node, mode);
  },
  chown: function(path, uid, gid, dontFollow) {
   var node;
   if (!(node = "string" == typeof path ? FS.lookupPath(path, {
    follow: !dontFollow
   }).node : path).node_ops.setattr) throw new FS.Eno(ENO.EPERM);
   node.node_ops.setattr(node, {
    timestamp: Date.now()
   });
  },
  lchown: function(path, uid, gid) {
   FS.chown(path, uid, gid, !0);
  },
  fchown: function(fd, uid, gid) {
   var stream = FS.getStream(fd);
   if (!stream) throw new FS.Eno(ENO.EBADF);
   FS.chown(stream.node, uid, gid);
  },
  truncate: function(path, len) {
   if (len < 0) throw new FS.Eno(ENO.EINVAL);
   var node;
   if (!(node = "string" == typeof path ? FS.lookupPath(path, {
    follow: !0
   }).node : path).node_ops.setattr) throw new FS.Eno(ENO.EPERM);
   if (FS.isDir(node.mode)) throw new FS.Eno(ENO.EISDIR);
   if (!FS.isFile(node.mode)) throw new FS.Eno(ENO.EINVAL);
   var err = FS.nodePermissions(node, "w");
   if (err) throw new FS.Eno(err);
   node.node_ops.setattr(node, {
    size: len,
    timestamp: Date.now()
   });
  },
  ftruncate: function(fd, len) {
   var stream = FS.getStream(fd);
   if (!stream) throw new FS.Eno(ENO.EBADF);
   if (0 == (2097155 & stream.flags)) throw new FS.Eno(ENO.EINVAL);
   FS.truncate(stream.node, len);
  },
  utime: function(path, atime, mtime) {
   var node = FS.lookupPath(path, {
    follow: !0
   }).node;
   node.node_ops.setattr(node, {
    timestamp: Math.max(atime, mtime)
   });
  },
  open: function(path, flags, mode, fd_start, fd_end) {
   if ("" === path) throw new FS.Eno(ENO.ENOENT);
   flags = "string" == typeof flags ? FS.modeStringToFlags(flags) : flags, mode = void 0 === mode ? 438 : mode, mode = 64 & flags ? 4095 & mode | 32768 : 0;
   var node;
   if ("object" == typeof path) node = path; else {
    path = PATH.normalize(path);
    try {
     node = FS.lookupPath(path, {
      follow: !(131072 & flags)
     }).node;
    } catch (e) {}
   }
   var created = !1;
   if (64 & flags) if (node) {
    if (128 & flags) throw new FS.Eno(ENO.EEXIST);
   } else node = FS.mknod(path, mode, 0), created = !0;
   if (!node) throw new FS.Eno(ENO.ENOENT);
   if (FS.isChrdev(node.mode) && (flags &= -513), 65536 & flags && !FS.isDir(node.mode)) throw new FS.Eno(ENO.ENOTDIR);
   if (!created) {
    var err = FS.mayOpen(node, flags);
    if (err) throw new FS.Eno(err);
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
     1 != (2097155 & flags) && (trackingFlags |= FS.tracking.openFlags.READ), 0 != (2097155 & flags) && (trackingFlags |= FS.tracking.openFlags.WRITE), FS.trackingDelegate.onOpenFile(path, trackingFlags);
    }
   } catch (e) {
    console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
   }
   return stream;
  },
  close: function(stream) {
   stream.getdents && (stream.getdents = null);
   try {
    stream.stream_ops.close && stream.stream_ops.close(stream);
   } catch (e) {
    throw e;
   } finally {
    FS.closeStream(stream.fd);
   }
  },
  llseek: function(stream, offset, whence) {
   if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.Eno(ENO.ESPIPE);
   return stream.position = stream.stream_ops.llseek(stream, offset, whence), stream.ungotten = [], stream.position;
  },
  read: function(stream, buffer, offset, length, position) {
   if (length < 0 || position < 0) throw new FS.Eno(ENO.EINVAL);
   if (1 == (2097155 & stream.flags)) throw new FS.Eno(ENO.EBADF);
   if (FS.isDir(stream.node.mode)) throw new FS.Eno(ENO.EISDIR);
   if (!stream.stream_ops.read) throw new FS.Eno(ENO.EINVAL);
   var seeking = !0;
   if (void 0 === position) position = stream.position, seeking = !1; else if (!stream.seekable) throw new FS.Eno(ENO.ESPIPE);
   var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
   return seeking || (stream.position += bytesRead), bytesRead;
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
   if (length < 0 || position < 0) throw new FS.Eno(ENO.EINVAL);
   if (0 == (2097155 & stream.flags)) throw new FS.Eno(ENO.EBADF);
   if (FS.isDir(stream.node.mode)) throw new FS.Eno(ENO.EISDIR);
   if (!stream.stream_ops.write) throw new FS.Eno(ENO.EINVAL);
   1024 & stream.flags && FS.llseek(stream, 0, 2);
   var seeking = !0;
   if (void 0 === position) position = stream.position, seeking = !1; else if (!stream.seekable) throw new FS.Eno(ENO.ESPIPE);
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
   if (offset < 0 || length <= 0) throw new FS.Eno(ENO.EINVAL);
   if (0 == (2097155 & stream.flags)) throw new FS.Eno(ENO.EBADF);
   if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) throw new FS.Eno(ENO.ENODEV);
   if (!stream.stream_ops.allocate) throw new FS.Eno(ENO.EOPNOTSUPP);
   stream.stream_ops.allocate(stream, offset, length);
  },
  mmap: 0,
  msync: 0,
  munmap: 0,
  ioctl: 0,
  readFile: function(path, opts) {
   if (opts = opts || {}, opts.flags = opts.flags || "r", opts.encoding = opts.encoding || "binary", "utf8" !== opts.encoding && "binary" !== opts.encoding) throw new Error('Invalid encoding type "' + opts.encoding + '"');
   var ret, stream = FS.open(path, opts.flags), length = FS.stat(path).size, buf = new Uint8Array(length);
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
   if (null === lookup.node) throw new FS.Eno(ENO.ENOENT);
   if (!FS.isDir(lookup.node.mode)) throw new FS.Eno(ENO.ENOTDIR);
   var err = FS.nodePermissions(lookup.node, "x");
   if (err) throw new FS.Eno(err);
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
  createSpecialDirectories: function() {
   FS.mkdir("/proc"), FS.mkdir("/proc/self"), FS.mkdir("/proc/self/fd"), FS.mount({
    mount: function() {
     var node = FS.createNode("/proc/self", "fd", 16895, 73);
     return node.node_ops = {
      lookup: function(parent, name) {
       var fd = +name, stream = FS.getStream(fd);
       if (!stream) throw new FS.Eno(ENO.EBADF);
       var ret = {
        parent: null,
        mount: {
         mountpoint: "fake"
        },
        node_ops: {
         readlink: function() {
          return stream.path;
         }
        }
       };
       return ret.parent = ret, ret;
      }
     }, node;
    }
   }, {}, "/proc/self/fd");
  },
  createStandardStreams: function() {
   Module.stdin ? FS.createDevice("/dev", "stdin", Module.stdin) : FS.symlink("/dev/tty", "/dev/stdin"), Module.stdout ? FS.createDevice("/dev", "stdout", null, Module.stdout) : FS.symlink("/dev/tty", "/dev/stdout"), Module.stderr ? FS.createDevice("/dev", "stderr", null, Module.stderr) : FS.symlink("/dev/tty1", "/dev/stderr");
   var stdin = FS.open("/dev/stdin", "r");
   assert(0 === stdin.fd, "invalid handle for stdin (" + stdin.fd + ")");
   var stdout = FS.open("/dev/stdout", "w");
   assert(1 === stdout.fd, "invalid handle for stdout (" + stdout.fd + ")");
   var stderr = FS.open("/dev/stderr", "w");
   assert(2 === stderr.fd, "invalid handle for stderr (" + stderr.fd + ")");
  },
  ensureEno: function() {
   FS.Eno || (FS.Eno = function(errno, node) {
    this.node = node, this.setErrno = function(errno) {
     this.errno = errno;
     for (var key in ENO) if (ENO[key] === errno) {
      this.code = key;
      break;
     }
    }, this.setErrno(errno), this.message = EME[errno];
   }, FS.Eno.prototype = new Error(), FS.Eno.prototype.constructor = FS.ErrnoError, [ ENO.ENOENT ].forEach(function(code) {
    FS.genericErrors[code] = new FS.Eno(code), FS.genericErrors[code].stack = "<generic error, no stack>";
   }));
  },
  staticInit: function() {
   FS.ensureEno(), FS.nameTable = new Array(4096), FS.mount(MEMFS, {}, "/"), FS.createDefaultDirectories(), FS.createDefaultDevices(), FS.createSpecialDirectories(), FS.filesystems = {
    MEMFS: MEMFS,
    IDBFS: void 0,
    NODEFS: void 0,
    WORKERFS: void 0
   };
  },
  init: function(input, output, error) {
   FS.init.initialized = !0, FS.ensureEno(), Module.stdin = input || Module.stdin, Module.stdout = output || Module.stdout, Module.stderr = error || Module.stderr, FS.createStandardStreams();
  },
  quit: function() {
   FS.init.initialized = !1;
   var fflush = Module._fflush;
   fflush && fflush(0);
   for (var i = 0; i < FS.streams.length; i++) {
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
  j: 0,
  k: 0,
  r: 0,
  t: 0,
  q: 0,
  createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
   var path = name ? PATH.join2("string" == typeof parent ? parent : FS.getPath(parent), name) : parent, mode = FS.getMode(canRead, canWrite), node = FS.create(path, mode);
   if (data) {
    if ("string" == typeof data) {
     for (var arr = new Array(data.length), i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
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
     for (var bytesRead = 0, i = 0; i < length; i++) {
      var result;
      try {
       result = input();
      } catch (e) {
       throw new FS.Eno(ENO.EIO);
      }
      if (void 0 === result && 0 === bytesRead) throw new FS.Eno(ENO.EAGAIN);
      if (null === result || void 0 === result) break;
      bytesRead++, buffer[offset + i] = result;
     }
     return bytesRead && (stream.node.timestamp = Date.now()), bytesRead;
    },
    write: function(stream, buffer, offset, length, pos) {
     for (var i = 0; i < length; i++) try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.Eno(ENO.EIO);
     }
     return length && (stream.node.timestamp = Date.now()), i;
    }
   }), FS.mkdev(path, mode, dev);
  },
  p: 0,
  forceLoadFile: 0,
  createLazyFile: 0,
  createPreloadedFile: 0,
  indexedDB: 0,
  DB_NAME: 0,
  DB_VERSION: 0,
  DB_STORE_NAME: 0,
  saveFilesToDB: 0,
  loadFilesFromDB: 0
 }, SYSCALLS = {
  DEFAULT_POLLMASK: 5,
  mappings: {},
  umask: 511,
  calculateAt: function(dirfd, path) {
   if ("/" !== path[0]) {
    var dir;
    if (-100 === dirfd) dir = FS.cwd(); else {
     var dirstream = FS.getStream(dirfd);
     if (!dirstream) throw new FS.Eno(ENO.EBADF);
     dir = dirstream.path;
    }
    path = PATH.join2(dir, path);
   }
   return path;
  },
  doStat: function(func, path, buf) {
   try {
    var stat = func(path);
   } catch (e) {
    if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) return -ENO.ENOTDIR;
    throw e;
   }
   return HEAP32[buf >> 2] = stat.dev, HEAP32[buf + 4 >> 2] = 0, HEAP32[buf + 8 >> 2] = stat.ino, HEAP32[buf + 12 >> 2] = stat.mode, HEAP32[buf + 16 >> 2] = stat.nlink, HEAP32[buf + 20 >> 2] = stat.uid, HEAP32[buf + 24 >> 2] = stat.gid, HEAP32[buf + 28 >> 2] = stat.rdev, HEAP32[buf + 32 >> 2] = 0, HEAP32[buf + 36 >> 2] = stat.size, HEAP32[buf + 40 >> 2] = 4096, HEAP32[buf + 44 >> 2] = stat.blocks, HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0, HEAP32[buf + 52 >> 2] = 0, HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0, HEAP32[buf + 60 >> 2] = 0, HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0, HEAP32[buf + 68 >> 2] = 0, HEAP32[buf + 72 >> 2] = stat.ino, 0;
  },
  doMsync: function(addr, stream, len, flags) {
   var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
   FS.msync(stream, buffer, 0, len, flags);
  },
  doMkdir: function(path, mode) {
   return "/" === (path = PATH.normalize(path))[path.length - 1] && (path = path.substr(0, path.length - 1)), FS.mkdir(path, mode, 0), 0;
  },
  doMknod: function(path, mode, dev) {
   switch (61440 & mode) {
   case 32768:
   case 8192:
   case 24576:
   case 4096:
   case 49152:
    break;

   default:
    return -ENO.EINVAL;
   }
   return FS.mknod(path, mode, dev), 0;
  },
  doReadlink: function(path, buf, bufsize) {
   if (bufsize <= 0) return -ENO.EINVAL;
   var ret = FS.readlink(path), len = Math.min(bufsize, lengthBytesUTF8(ret)), endChar = HEAP8[buf + len];
   return stringToUTF8(ret, buf, bufsize + 1), HEAP8[buf + len] = endChar, len;
  },
  doAccess: function(path, amode) {
   if (-8 & amode) return -ENO.EINVAL;
   var node;
   node = FS.lookupPath(path, {
    follow: !0
   }).node;
   var perms = "";
   return 4 & amode && (perms += "r"), 2 & amode && (perms += "w"), 1 & amode && (perms += "x"), perms && FS.nodePermissions(node, perms) ? -ENO.EACCES : 0;
  },
  doDup: function(path, flags, suggestFD) {
   var suggest = FS.getStream(suggestFD);
   return suggest && FS.close(suggest), FS.open(path, flags, 0, suggestFD, suggestFD).fd;
  },
  doReadv: function(stream, iov, iovcnt, offset) {
   for (var ret = 0, i = 0; i < iovcnt; i++) {
    var ptr = HEAP32[iov + 8 * i >> 2], len = HEAP32[iov + (8 * i + 4) >> 2], curr = FS.read(stream, HEAP8, ptr, len, offset);
    if (curr < 0) return -1;
    if (ret += curr, curr < len) break;
   }
   return ret;
  },
  doWritev: function(stream, iov, iovcnt, offset) {
   for (var ret = 0, i = 0; i < iovcnt; i++) {
    var ptr = HEAP32[iov + 8 * i >> 2], len = HEAP32[iov + (8 * i + 4) >> 2], curr = FS.write(stream, HEAP8, ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
   }
   return ret;
  },
  varargs: 0,
  get: function(varargs) {
   return SYSCALLS.varargs += 4, HEAP32[SYSCALLS.varargs - 4 >> 2];
  },
  getStr: function() {
   return Pointer_stringify(SYSCALLS.get());
  },
  getStreamFromFD: function() {
   var stream = FS.getStream(SYSCALLS.get());
   if (!stream) throw new FS.Eno(ENO.EBADF);
   return stream;
  },
  w: 0,
  s: 0,
  k: 0,
  t: 0
 }, ___tm_current = STATICTOP += 16;
 STATICTOP += 48, allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);
 var cttz_i8 = allocate([ 8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0 ], "i8", ALLOC_STATIC);
 STATICTOP += 48;
 var _llvm_pow_f64 = Math_pow;
 FS.staticInit(), __ATINIT__.unshift(function() {
  Module.noFSInit || FS.init.initialized || FS.init();
 }), __ATMAIN__.push(function() {
  FS.ignorePermissions = !1;
 }), __ATEXIT__.push(function() {
  FS.quit();
 }), __ATINIT__.unshift(function() {
  TTY.init();
 }), __ATEXIT__.push(function() {
  TTY.shutdown();
 }), _emscripten_get_now = "undefined" != typeof dateNow ? dateNow : "object" == typeof self && self.performance && "function" == typeof self.performance.now ? function() {
  return self.performance.now();
 } : "object" == typeof performance && "function" == typeof performance.now ? function() {
  return performance.now();
 } : Date.now, DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC), STACK_MAX = (STACKTOP = Runtime.alignMemory(STATICTOP)) + TOTAL_STACK, DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX), HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE, Module.asmGlobalArg = {
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
  enlargeMemory: enlargeMemory,
  getTotalMemory: function() {
   return TOTAL_MEMORY;
  },
  abortOnCannotGrowMemory: abort.bind(0, -2),
  invoke_ii: function(index, a1) {
   try {
    return Module.dynCall_ii(index, a1);
   } catch (e) {
    if ("number" != typeof e && "longjmp" !== e) throw e;
    Module.setThrew(1, 0);
   }
  },
  invoke_iiii: function(index, a1, a2, a3) {
   try {
    return Module.dynCall_iiii(index, a1, a2, a3);
   } catch (e) {
    if ("number" != typeof e && "longjmp" !== e) throw e;
    Module.setThrew(1, 0);
   }
  },
  invoke_v: function(index) {
   try {
    Module.dynCall_v(index);
   } catch (e) {
    if ("number" != typeof e && "longjmp" !== e) throw e;
    Module.setThrew(1, 0);
   }
  },
  ___syscall221: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var stream = SYSCALLS.getStreamFromFD();
    switch (SYSCALLS.get()) {
    case 0:
     return (arg = SYSCALLS.get()) < 0 ? -ENO.EINVAL : FS.open(stream.path, stream.flags, 0, arg).fd;

    case 1:
    case 2:
     return 0;

    case 3:
     return stream.flags;

    case 4:
     return arg = SYSCALLS.get(), stream.flags |= arg, 0;

    case 12:
    case 12:
     var arg = SYSCALLS.get();
     return HEAP16[arg + 0 >> 1] = 2, 0;

    case 13:
    case 14:
    case 13:
    case 14:
     return 0;

    case 16:
    case 8:
     return -ENO.EINVAL;

    case 9:
     return ___setErrNo(ENO.EINVAL), -1;

    default:
     return -ENO.EINVAL;
    }
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  _emscripten_get_now_is_monotonic: _emscripten_get_now_is_monotonic,
  _llvm_pow_f64: _llvm_pow_f64,
  _ctime: function(timer) {
   return _ctime_r(timer, ___tm_current);
  },
  _llvm_exp2_f64: function() {
   return _llvm_exp2_f32.apply(null, arguments);
  },
  _clock_gettime: _clock_gettime,
  _localtime_r: _localtime_r,
  _tzset: _tzset,
  ___setErrNo: ___setErrNo,
  _emscripten_memcpy_big: function(dest, src, num) {
   return HEAPU8.set(HEAPU8.subarray(src, src + num), dest), dest;
  },
  _mktime: function(tmPtr) {
   _tzset();
   var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0), dst = HEAP32[tmPtr + 32 >> 2], guessedOffset = date.getTimezoneOffset(), start = new Date(date.getFullYear(), 0, 1), summerOffset = new Date(2e3, 6, 1).getTimezoneOffset(), winterOffset = start.getTimezoneOffset(), dstOffset = Math.min(winterOffset, summerOffset);
   if (dst < 0) HEAP32[tmPtr + 32 >> 2] = Number(dstOffset == guessedOffset); else if (dst > 0 != (dstOffset == guessedOffset)) {
    var nonDstOffset = Math.max(winterOffset, summerOffset), trueOffset = dst > 0 ? dstOffset : nonDstOffset;
    date.setTime(date.getTime() + 6e4 * (trueOffset - guessedOffset));
   }
   HEAP32[tmPtr + 24 >> 2] = date.getDay();
   var yday = (date.getTime() - start.getTime()) / 864e5 | 0;
   return HEAP32[tmPtr + 28 >> 2] = yday, date.getTime() / 1e3 | 0;
  },
  _abort: function() {
   Module.abort();
  },
  _asctime_r: _asctime_r,
  ___syscall54: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
    switch (op) {
    case 21505:
    case 21506:
     return stream.tty ? 0 : -ENO.ENOTTY;

    case 21519:
     return stream.tty ? (argp = SYSCALLS.get(), HEAP32[argp >> 2] = 0, 0) : -ENO.ENOTTY;

    case 21520:
     return stream.tty ? -ENO.EINVAL : -ENO.ENOTTY;

    case 21531:
     var argp = SYSCALLS.get();
     return FS.ioctl(stream, op, argp);

    case 21523:
     return stream.tty ? 0 : -ENO.ENOTTY;

    default:
     abort("bad ioctl syscall " + op);
    }
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  ___unlock: function() {},
  _emscripten_get_now: _emscripten_get_now,
  ___syscall10: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var path = SYSCALLS.getStr();
    return FS.unlink(path), 0;
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  ___lock: function() {},
  _llvm_exp2_f32: _llvm_exp2_f32,
  ___syscall6: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var stream = SYSCALLS.getStreamFromFD();
    return FS.close(stream), 0;
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  ___syscall5: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var pathname = SYSCALLS.getStr(), flags = SYSCALLS.get(), mode = SYSCALLS.get();
    return FS.open(pathname, flags, mode).fd;
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  ___clock_gettime: function() {
   return _clock_gettime.apply(null, arguments);
  },
  _ctime_r: _ctime_r,
  ___syscall140: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var stream = SYSCALLS.getStreamFromFD(), offset_low = (SYSCALLS.get(), SYSCALLS.get()), result = SYSCALLS.get(), whence = SYSCALLS.get(), offset = offset_low;
    return FS.llseek(stream, offset, whence), HEAP32[result >> 2] = stream.position, stream.getdents && 0 === offset && 0 === whence && (stream.getdents = null), 0;
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  _localtime: function(time) {
   return _localtime_r(time, ___tm_current);
  },
  ___syscall145: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
    return SYSCALLS.doReadv(stream, iov, iovcnt);
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  ___syscall146: function(which, varargs) {
   SYSCALLS.varargs = varargs;
   try {
    var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
    return SYSCALLS.doWritev(stream, iov, iovcnt);
   } catch (e) {
    return void 0 !== FS && e instanceof FS.Eno || abort(e), -e.errno;
   }
  },
  DYNAMICTOP_PTR: DYNAMICTOP_PTR,
  tempDoublePtr: tempDoublePtr,
  ABORT: ABORT,
  STACKTOP: STACKTOP,
  STACK_MAX: STACK_MAX,
  cttz_i8: cttz_i8
 };
 var asm = function(global, env, buffer) {
  "almost asm";
  function sd() {
   var a = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
   x = u, u = u + 544 | 0, w = x + 24 | 0, v = x + 16 | 0, s = x + 8 | 0, m = x, o = x + 512 | 0, t = x + 32 | 0, f[10812] = -1, f[18321] = -1, f[18490] = -1, d[168361] = 0, f[18283] = 0, d[172468] = 0, d[168359] = 0, d[168360] = 0, d[102817] = 0, d[102816] = 0, d[168356] = 0, d[168355] = 0, f[10839] = 0, b[344976] = 0, b[43136] = 0, b[43072] = 0, b[361424] = 0, b[361488] = 0, b[362e3] = 0, f[10847] = 0, n[18455] = 0, n[18319] = 0, n[18320] = 0, n[18318] = 0, f[18334] = 0, cg(73340, 0, 480), e = 128 + (a = 73828) | 0;
   do {
    f[a >> 2] = 0, a = a + 4 | 0;
   } while ((0 | a) < (0 | e));
   cg(336732, 0, 8204), e = 128 + (a = 73136) | 0;
   do {
    f[a >> 2] = 0, a = a + 4 | 0;
   } while ((0 | a) < (0 | e));
   for (d[168365] = 0, d[168364] = 0, f[10965] = 0, f[18317] = 0, f[18492] = 0, f[18282] = 0, f[18491] = 34, f[10844] = 0, f[10958] = 0, f[10968] = 0, f[10959] = 0, f[10960] = 0, f[10846] = 0, f[10845] = 0, f[10843] = 0, f[10982] = 0, f[18493] = 0, f[10838] = 0, f[10848] = 0, f[18316] = 0, f[18494] = 0, f[10814] = 0, f[18489] = 0, f[10980] = 0, f[10823] = 1, f[10956] = 1, p[5401] = 1, f[10955] = 0, f[10957] = 0, c = 0; 4 != (0 | c); ) {
    for (n[43844 + (c << 2) >> 2] = +(1 == (0 | c) & 1), n[43264 + (c << 2) >> 2] = +(3 != (0 | c) & 1), a = 0; ;) {
     if (3 == (0 | a)) {
      a = 0;
      break;
     }
     n[73288 + (a << 4) + (c << 2) >> 2] = 0, a = a + 1 | 0;
    }
    for (;3 != (0 | a); ) n[43300 + (a << 4) + (c << 2) >> 2] = +((0 | a) == (0 | c) & 1), a = a + 1 | 0;
    c = c + 1 | 0;
   }
   for (f[10824] = 3, a = 0; 65536 != (0 | a); ) d[205638 + (a << 1) >> 1] = a, a = a + 1 | 0;
   c = 0 | Za(), d[102818] = c, c = 0 | $a(), tf(0 | f[10815], 0, 0), Of(o, 1, 32, 0 | f[10815]), tf(0 | f[10815], 0, 2), q = 0 | Pf(0 | f[10815]), a = 0 | Va(o, 29543);
   a: do {
    if (a) r = 14; else if (a = 0 | Va(o, 29538)) r = 14; else {
     switch (a = o + 6 | 0, 0 | d[102818]) {
     case 19789:
     case 18761:
      if (!(0 | Zd(a, 38581, 8))) {
       f[10960] = c, bd(c, q - c | 0, 0), f[18282] = 2;
       break a;
      }
      if (!(0 | Yc(0))) break a;
      _c();
      break a;
     }
     if (!(0 | Zd(o, 38590, 4) || 0 | Zd(a, 38595, 4))) {
      tf(0 | f[10815], 4, 0), l = 4 + (65535 & (0 | Za())) | 0, f[10960] = l, tf(0 | f[10815], l, 0), 255 != (0 | Qf(0 | f[10815])) && Yc(12), f[18317] = 0;
      break;
     }
     if (!(0 | Zd(o + 25 | 0, 38600, 7))) {
      b[43072] = 0 | b[38608], b[43073] = 0 | b[38609], b[43074] = 0 | b[38610], b[43075] = 0 | b[38611], b[43076] = 0 | b[38612], b[43077] = 0 | b[38613], b[43078] = 0 | b[38614], c = 38615, e = 10 + (a = 43136) | 0;
      do {
       b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
      } while ((0 | a) < (0 | e));
      for (tf(0 | f[10815], 33, 0), Rc(1), tf(0 | f[10815], 60, 0), a = 0; ;) {
       if (4 == (0 | a)) break a;
       y = +((0 | $a()) >>> 0), n[43844 + ((a >> 1 ^ a) << 2) >> 2] = y, a = a + 1 | 0;
      }
     }
     if (!(0 | Yd(o, 38625))) {
      c = 38629, e = 9 + (a = 43072) | 0;
      do {
       b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
      } while ((0 | a) < (0 | e));
      c = 38638, e = 16 + (a = 43136) | 0;
      do {
       b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
      } while ((0 | a) < (0 | e));
      break;
     }
     if (!(0 | Yd(o, 38654))) {
      b[43072] = 0 | b[38659], b[43073] = 0 | b[38660], b[43074] = 0 | b[38661], b[43075] = 0 | b[38662], b[43076] = 0 | b[38663], b[43077] = 0 | b[38664], c = 38665, e = 14 + (a = 43136) | 0;
      do {
       b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
      } while ((0 | a) < (0 | e));
      f[18282] = 38;
      break;
     }
     if (!(0 | Yd(o, 38679))) {
      b[43072] = 0 | b[38659], b[43073] = 0 | b[38660], b[43074] = 0 | b[38661], b[43075] = 0 | b[38662], b[43076] = 0 | b[38663], b[43077] = 0 | b[38664], c = 38684, e = 14 + (a = 43136) | 0;
      do {
       b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
      } while ((0 | a) < (0 | e));
      f[18282] = 39;
      break;
     }
     if (!(0 | Zd(o, 29572, 8))) {
      tf(0 | f[10815], 84, 0), l = 0 | $a(), f[18317] = l, l = 0 | $a(), f[10965] = l, tf(0 | f[10815], 92, 0), fd(0 | $a()), (0 | f[18317]) > 120 && (tf(0 | f[10815], 120, 0), l = (0 != (0 | (a = 0 | $a())) & 1) + (0 | f[10956]) | 0, f[10956] = l, 2 == (0 | l) & 0 != (0 | f[10804]) && fd(a)), f[18282] = 13, tf(0 | f[10815], 0 | f[10804] ? 128 : 100, 0), l = 0 | $a(), f[10960] = l, Yc(l), Yc(12 + (0 | f[18317]) | 0), _c();
      break;
     }
     if (!(0 | Zd(o, 30592, 4))) {
      tf(0 | f[10815], 0, 0), hd();
      break;
     }
     if (a = o + 4 | 0, !(0 | Zd(a, 38698, 9))) {
      tf(0 | f[10815], 0, 0), id(q), f[10956] = 0;
      break;
     }
     if (!(0 | Zd(o, 38708, 6))) {
      tf(0 | f[10815], 6, 0), Of(43072, 1, 8, 0 | f[10815]), Of(43136, 1, 8, 0 | f[10815]), Of(344976, 1, 16, 0 | f[10815]), l = 65535 & (0 | Za()), f[10960] = l, Za(), l = 0 | Za(), d[168359] = l, l = 0 | Za(), d[168360] = l, f[18282] = 8, f[10812] = 1633771873;
      break;
     }
     if (!(0 | Zd(o, 38715, 8))) {
      switch (b[43072] = 0 | b[38724], b[43073] = 0 | b[38725], b[43074] = 0 | b[38726], b[43075] = 0 | b[38727], b[43076] = 0 | b[38728], b[43077] = 0 | b[38729], d[102818] = 18761, tf(0 | f[10815], 300, 0), c = 0 | $a(), f[10960] = c, c = 0 | $a(), g = 0 | Za(), d[168356] = g, g = 0 | Za(), d[168355] = g, e = 0 | j[168356], g &= 65535, i = (c << 3 | 0) / (0 | X(e, g)) | 0, f[10958] = i, 0 | i) {
      case 8:
       a = 5, r = 51;
       break;

      case 10:
       a = 8, r = 51;
      }
      51 == (0 | r) && (f[18282] = a), l = (c >>> 0) / ((0 | X(e, i)) >>> 3 >>> 0) | 0, d[102816] = l - g, d[168360] = l, f[18287] = 1, f[10812] = 1633771873;
      break;
     }
     if (!(0 | Zd(o, 38730, 4))) {
      d[102818] = 18761, tf(0 | f[10815], 20, 0), l = 65535 & (0 | $a()), d[168356] = l, l = 65535 & (0 | $a()), d[168355] = l, b[43072] = 0 | b[38730], b[43073] = 0 | b[38731], b[43074] = 0 | b[38732], b[43075] = 0 | b[38733], b[43076] = 0 | b[38734], tf(0 | f[10815], 668, 0), Of(43136, 1, 64, 0 | f[10815]), f[10960] = 4096, f[18282] = 7, f[10846] = 88, f[10812] = 1633771873;
      break;
     }
     if (!(0 | Zd(o, 38735, 4))) {
      d[102818] = 18761, tf(0 | f[10815], 2048, 0), Of(43072, 1, 41, 0 | f[10815]), l = 0 | Za(), d[168360] = l, l = 0 | Za(), d[168359] = l, tf(0 | f[10815], 56, 1), Of(43136, 1, 30, 0 | f[10815]), f[10960] = 65536, f[18282] = 40, Ic(0, 12.25, 1, 1023);
      break;
     }
     if (!(0 | Zd(a, 38740, 4))) {
      f[10768] = 6579538, f[10784] = 6647375, ld(), f[18282] = 41, Ic(.4166666666666667, 12.92, 1, 4095), f[10812] = 1229539657;
      break;
     }
     if (!(0 | Zd(o, 38745, 9))) {
      cd();
      break;
     }
     if (!(0 | Zd(o, 38755, 4))) {
      dd();
      break;
     }
     if (!(0 | Zd(o, 38760, 4))) {
      Zc(0);
      break;
     }
     if (!(0 | Zd(o, 38765, 4))) {
      nd();
      break;
     }
     if (0 | Zd(o, 38770, 2)) break;
     kd();
    }
   } while (0);
   14 == (0 | r) && (ed(l = a - o | 0), 0 | l && 0 | Yc(0) && _c());
   do {
    if (0 | b[43072]) l = 0; else {
     for (e = 0; 101 != (0 | e); ) {
      if ((0 | q) == (0 | f[17656 + (48 * e | 0) >> 2])) {
       switch (Te(43072, 17656 + (48 * e | 0) + 16 | 0), Te(43136, 17656 + (48 * e | 0) + 26 | 0), l = 0 | b[17656 + (48 * e | 0) + 15 >> 0], f[18321] = (255 & l) >>> 2, f[18494] = 2 & l, 1 & l && $c(), k = 0 | j[17656 + (48 * e | 0) + 46 >> 1], f[10960] = k, a = 0 | d[17656 + (48 * e | 0) + 4 >> 1], d[168359] = a, l = 0 | d[17656 + (48 * e | 0) + 6 >> 1], d[168360] = l, i = 0 | b[17656 + (48 * e | 0) + 8 >> 0], d[102817] = 255 & i, c = 0 | b[17656 + (48 * e | 0) + 9 >> 0], d[102816] = 255 & c, a &= 65535, d[168356] = a - (255 & i) - (0 | h[17656 + (48 * e | 0) + 10 >> 0]), l &= 65535, d[168355] = l - (255 & c) - (0 | h[17656 + (48 * e | 0) + 11 >> 0]), c = 0 | X(0 | h[17656 + (48 * e | 0) + 13 >> 0], 16843009), f[10812] = c, f[10824] = 4 - (0 == (21845 & c & c >>> 1 | 0) & 1), c = 0 | h[17656 + (48 * e | 0) + 12 >> 0], f[10846] = c, a = (q - k << 3 | 0) / (0 | X(l, a)) | 0, f[10958] = a, 0 | a) {
       case 6:
        c = 51, a = 6, r = 78;
        break;

       case 8:
        c = 5, a = 8, r = 78;
        break;

       case 12:
       case 10:
        f[10846] = 128 | c, c = 7, r = 78;
        break;

       case 16:
        d[102818] = 0 - (1 & c) & 1028 | 18761, a = c >>> 1 & 7, f[10846] = a, a = 16 - (c >>> 4) - a | 0, f[10958] = a, c = 13, r = 78;
       }
       78 == (0 | r) && (r = 0, f[18282] = c), f[10839] = (1 << a) - (1 << h[17656 + (48 * e | 0) + 14 >> 0]);
      }
      e = e + 1 | 0;
     }
     if (0 | b[43072]) l = q; else if (jd(q), 0 | b[43072]) l = q; else {
      if (gd(0), 0 | _d(43136, 38773, 2) ? 0 | _d(43136, 38776, 5) || (r = 85) : r = 85, 85 == (0 | r) && !(0 | tf(0 | f[10815], -6404096, 2)) && 0 | Of(o, 1, 32, 0 | f[10815]) && !(0 | Yd(o, 38782))) {
       c = 29042, e = 11 + (a = 43072) | 0;
       do {
        b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
       } while ((0 | a) < (0 | e));
       l = 32736 + (0 | Pf(0 | f[10815])) | 0, f[10960] = l, d[168356] = 0 | d[168359], d[168359] = 2611, f[18282] = 8, f[10812] = 370546198, l = q;
       break;
      }
      f[10956] = 0, l = q;
     }
    }
   } while (0);
   for (a = 0; 21 != (0 | a); ) 0 | Wa(43072, c = 0 | f[22504 + (a << 2) >> 2]) && Te(43072, c), a = a + 1 | 0;
   0 | Yd(43072, 30277) ? 0 | Yd(43072, 38541) || (r = 97) : r = 97;
   do {
    if (97 == (0 | r)) {
     if (!(a = 0 | Wa(43136, 38788)) && !(a = 0 | xf(43136, 38804))) break;
     b[a >> 0] = 0;
    }
   } while (0);
   for (0 | Se(43136, 29593, 6) || (b[43072] = 0 | b[38555], b[43073] = 0 | b[38556], b[43074] = 0 | b[38557], b[43075] = 0 | b[38558], b[43076] = 0 | b[38559], b[43077] = 0 | b[38560], b[43078] = 0 | b[38561]), a = 43072 + (0 | Ne(43072)) | 0; a = a + -1 | 0, 32 == (0 | b[a >> 0]); ) b[a >> 0] = 0;
   for (a = 43136 + (0 | Ne(43136)) | 0; a = a + -1 | 0, 32 == (0 | b[a >> 0]); ) b[a >> 0] = 0;
   0 | Se(43136, 43072, a = 0 | Ne(43072)) || 32 == (0 | b[43136 + a >> 0]) && ng(43136, 43136 + (a + 1) | 0, 63 - a | 0), 0 | _d(43136, 38817, 8) || Te(43136, 43144), 0 | _d(43136, 38826, 15) || Te(43136, 43151), b[345039] = 0, b[43199] = 0, b[43135] = 0, b[361487] = 0, b[361999] = 0, e = 0 | f[10956];
   do {
    if (0 | e) {
     (a = 0 | d[168355]) << 16 >> 16 || (a = 0 | d[168360], d[168355] = a), (c = 0 | d[168356]) << 16 >> 16 || (c = 0 | d[168359], d[168356] = c);
     b: do {
      if (a << 16 >> 16 == 2624 & c << 16 >> 16 == 3936) d[168355] = 2616, d[168356] = 3896; else {
       if (a << 16 >> 16 == 3136 & c << 16 >> 16 == 4864) {
        d[168355] = 3124, d[168356] = 4688, f[10812] = 370546198;
        break;
       }
       if (c << 16 >> 16 == 4352) {
        if (0 | Yd(43136, 38842) && 0 | Yd(43136, 38846)) break;
        d[168356] = 4309, f[10812] = 370546198;
        break;
       }
       if ((65535 & c) <= 4959) {
        if (c << 16 >> 16 == 4736) {
         if (0 | Yd(43136, 38854)) break;
         d[168355] = 3122, d[168356] = 4684, f[10812] = 370546198, d[102816] = 2;
         break;
        }
        if (!(a << 16 >> 16 == 3014 & c << 16 >> 16 == 4096)) break;
        d[168356] = 4014;
        break;
       }
       if (!(0 | _d(43136, 38850, 3))) {
        d[102817] = 10, d[168356] = 4950, f[10812] = 370546198;
        break;
       }
       switch (c << 16 >> 16) {
       case 6080:
        if (0 | Yd(43136, 38858)) break b;
        d[102817] = 4, d[168356] = 6040;
        break b;

       case 7424:
        if (0 | Yd(43136, 38862)) break b;
        d[168355] = 5502, d[168356] = 7328, f[10812] = 1633771873, d[102816] = 29, d[102817] = 48;
        break b;

       default:
        break b;
       }
      }
     } while (0);
     do {
      if (0 | f[10845]) {
       switch (a = 0 | f[10848], 0 | f[10812]) {
       case -1:
        f[10812] = 0, r = 145;
        break;

       case 0:
        r = 145;
        break;

       default:
        z = 0 | X(a, e), f[10956] = z;
       }
       145 == (0 | r) && (f[10824] = a), a = 0 | f[10844];
       g: do {
        if ((0 | a) < 7) {
         switch (0 | a) {
         case 1:
         case 0:
          break;

         default:
          r = 149;
          break g;
         }
         a = 52;
        } else {
         if ((0 | a) < 34892) switch (0 | a) {
         case 7:
          a = 53;
          break g;

         default:
          r = 149;
          break g;
         }
         switch (0 | a) {
         case 34892:
          break;

         default:
          r = 149;
          break g;
         }
         a = 50;
        }
       } while (0);
       149 == (0 | r) && (a = 0), f[18282] = a;
      } else {
       if ((k = 0 == (0 | Yd(43072, 29587) | l | 0)) & 15 != (0 | f[10958])) {
        for (0 | f[18282] || (f[18282] = 3), e = 65535 & (c = 0 | d[168359]), i = 65535 & (g = 0 | d[168360]), a = 0; 43 != (0 | a); ) {
         do {
          if (c << 16 >> 16 == (0 | d[24614 + (22 * a | 0) >> 1])) {
           if (g << 16 >> 16 != (0 | d[24614 + (22 * a | 0) + 2 >> 1])) break;
           if (z = 0 | d[24614 + (22 * a | 0) + 4 >> 1], d[102817] = z, k = 0 | d[24614 + (22 * a | 0) + 6 >> 1], d[102816] = k, d[168356] = e - (65535 & z) - (0 | j[24614 + (22 * a | 0) + 8 >> 1]), d[168355] = i - (65535 & k) - (0 | j[24614 + (22 * a | 0) + 10 >> 1]), f[18285] = j[24614 + (22 * a | 0) + 12 >> 1], f[18287] = 0 - (0 | j[24614 + (22 * a | 0) + 14 >> 1]), f[18289] = j[24614 + (22 * a | 0) + 16 >> 1], f[18291] = 0 - (0 | j[24614 + (22 * a | 0) + 18 >> 1]), !((k = 0 | d[24614 + (22 * a | 0) + 20 >> 1]) << 16 >> 16)) break;
           z = 0 | X(65535 & k, 16843009), f[10812] = z;
          }
         } while (0);
         a = a + 1 | 0;
        }
        41025536 == (131072 | f[10847]) ? (d[102817] = 8, d[102816] = 16, c = 0) : c = 0;
       } else c = 0;
       for (;;) {
        if (e = 0 | f[10847], 43 == (0 | c)) {
         a = 0;
         break;
        }
        do {
         if ((0 | e) == (-2147483648 | j[25560 + (22 * c | 0) >> 1] | 0) && (a = 25560 + (22 * c | 0) + 2 | 0, od(29587, a), 75 == (0 | b[43140]))) {
          if (8 != (0 | Ne(43136))) break;
          Te(43136, a);
         }
        } while (0);
        c = c + 1 | 0;
       }
       for (;58 != (0 | a); ) (0 | e) == (0 | j[26506 + (22 * a | 0) >> 1]) && Te(43136, 26506 + (22 * a | 0) + 2 | 0), a = a + 1 | 0;
       0 | Yd(43072, 29548) || (0 | f[18282] || (f[18282] = 7), 69 == (0 | b[43136]) && (f[10846] = f[10846] | (0 == (0 | f[10960]) & 1) << 2 | 2)), 0 | Yd(43136, 38867) || +rd(16, 16, 3840, 5120) < 25 && (d[168355] = 480, f[10812] = 0, d[102816] = 0, b[43136] = 0 | b[38876], b[43137] = 0 | b[38877], b[43138] = 0 | b[38878], b[43139] = 0 | b[38879], b[43140] = 0 | b[38880]), (e = 0 == (0 | Yd(43072, 38576))) & (65535 & (k = 0 | d[168359])) > 3888 && (f[10838] = 128 << (0 | f[10958]) - 12);
       c: do {
        if (0 | f[18493]) (65535 & (a = 0 | d[168355])) << 1 >>> 0 < (65535 & (c = 0 | d[168356])) >>> 0 && (p[5401] = .5), (65535 & a) > (65535 & c) && (p[5401] = 2), f[10812] = 0, pd(0), r = 530; else {
         if (z = 0 == (0 | Yd(43072, 29587)), g = 0 | f[10958], z & 15 == (0 | g)) {
          switch ((a = 0 | d[168356]) << 16 >> 16) {
          case 3344:
           d[168356] = 3278, a = 3272, r = 192;
           break;

          case 3872:
           a = 3866, r = 192;
           break;

          default:
           e = a;
          }
          192 == (0 | r) && (d[168356] = a, e = a), (65535 & (a = 0 | d[168355])) > (65535 & e) ? (d[168356] = a, d[168355] = e, d[168359] = 0 | d[168360], d[168360] = k, c = a, a = e) : c = e, a << 16 >> 16 == 3888 & c << 16 >> 16 == 7200 && (d[168356] = 6480, d[168359] = 6480, d[168355] = 4320, d[168360] = 4320), f[10812] = 0, f[10824] = 3, f[10848] = 3, f[18282] = 42, r = 530;
          break;
         }
         if (!(0 | Yd(43136, 38881))) {
          d[168355] = 613, d[168356] = 854, d[168359] = 896, f[10824] = 4, f[10812] = -505093660, f[18282] = 1, r = 530;
          break;
         }
         do {
          if (0 | Yd(43136, 38895)) {
           if (!(0 | Yd(43136, 38908))) {
            r = 202;
            break;
           }
           if (!(0 | Yd(43136, 38926))) {
            d[168355] = 968, d[168356] = 1290, d[168359] = 1320, a = 458115870;
            break;
           }
           if (!(0 | Yd(43136, 38940))) {
            d[168355] = 1024, d[168356] = 1552, a = 508251675;
            break;
           }
           do {
            if (0 | Yd(43136, 38956)) {
             if (!(0 | Yd(43136, 38975))) break;
             if (!(0 | Yd(43136, 38988))) {
              if (!(0 | kb())) {
               r = 530;
               break c;
              }
              b[43146] = 0 | b[39003], b[43147] = 0 | b[39004], b[43148] = 0 | b[39005], b[43149] = 0 | b[39006], b[43150] = 0 | b[39007], b[43151] = 0 | b[39008], r = 530;
              break c;
             }
             if (!(0 | Yd(43136, 39009))) {
              f[18291] = -4, r = 530;
              break c;
             }
             if (!(0 | Yd(43136, 39028))) {
              f[10812] = 1633771873, f[10838] = j[103019], r = 530;
              break c;
             }
             if (!(0 | Yd(43136, 39039))) {
              n[10961] = .4857685009487666 * +n[10961], n[10963] = .807570977917981 * +n[10963], r = 530;
              break c;
             }
             if (!(0 | Yd(43136, 39042))) {
              d[168356] = 65532 + (0 | j[168356]), p[5401] = .5, r = 530;
              break c;
             }
             do {
              if (0 | Yd(43136, 39046)) {
               if (!(0 | Yd(43136, 39051))) break;
               if (!(0 | Yd(43136, 39055))) break;
               if (!(0 | Yd(43136, 39059))) break;
               do {
                if (0 | Yd(43136, 39065)) {
                 if (!(0 | Yd(43136, 39068))) break;
                 if (!(0 | Yd(43136, 39072))) break;
                 if (!(0 | Yd(43136, 39077))) {
                  d[168356] = 65508 + (0 | j[168356]), d[102817] = 6, r = 530;
                  break c;
                 }
                 do {
                  if (0 | Yd(43136, 39083)) {
                   if (!(0 | Yd(43136, 39089))) break;
                   do {
                    if (0 | Yd(43136, 39093)) {
                     if (!(0 | Yd(43136, 39099))) break;
                     if (!(0 | Yd(43136, 39105))) break;
                     do {
                      if (0 | Yd(43136, 39115)) {
                       if (!(0 | _d(43136, 39121, 2))) break;
                       if (!(0 | _d(43136, 39124, 4))) break;
                       do {
                        if (0 | Yd(43136, 39129)) {
                         if (!(0 | Yd(43136, 39132))) break;
                         do {
                          if (0 | _d(43136, 39135, 3)) {
                           if (!(0 | _d(43136, 39139, 3))) break;
                           if (!(0 | _d(43136, 39143, 3))) break;
                           if (!(0 | Yd(43136, 39147))) {
                            if (!(0 | f[10846])) {
                             r = 530;
                             break c;
                            }
                            r = 0 | j[168356], d[168356] = r + 3, d[168359] = r + 6, r = 530;
                            break c;
                           }
                           if (!(0 | Yd(43136, 39152))) {
                            d[102817] = 1, d[168356] = 65532 + (0 | j[168356]), f[10812] = -1802201964, r = 530;
                            break c;
                           }
                           if (!(0 | _d(43136, 39157, 3))) {
                            d[102817] = 6, d[168356] = 65522 + (0 | j[168356]), r = 530;
                            break c;
                           }
                           if (!(0 | _d(43136, 39161, 3))) {
                            r = 0 | d[168356], d[168356] = (65535 & r) - (r << 16 >> 16 == 3264 ? 32 : 8), r = 530;
                            break c;
                           }
                           if (!(0 | _d(43136, 39165, 4))) {
                            d[168356] = 65504 + (0 | j[168356]), r = 530;
                            break c;
                           }
                           if (!(k << 16 >> 16 == 4032 | 0 != (0 | _d(43136, 39170, 9)))) {
                            if (f[10846] = 24, f[10812] = -1802201964, !(55 == (0 | b[43145]) & +n[18318] >= 400)) {
                             r = 530;
                             break c;
                            }
                            f[10838] = 255, r = 530;
                            break c;
                           }
                           if (!(0 | _d(43136, 39180, 2))) {
                            d[168355] = 65534 + (0 | j[168355]), r = 530;
                            break c;
                           }
                           d: do {
                            if ((0 | l) < 4771840) {
                             if ((0 | l) < 2940928) {
                              switch (0 | l) {
                              case 1581060:
                               break;

                              default:
                               break d;
                              }
                              pd(3), n[10816] = 1.2085000276565552, n[10817] = 1.0943000316619873, n[10819] = 1.1102999448776245, r = 530;
                              break c;
                             }
                             if ((0 | l) >= 3178560) {
                              switch (0 | l) {
                              case 3178560:
                               break;

                              default:
                               break d;
                              }
                              n[10961] = 4 * +n[10961], n[10963] = 4 * +n[10963], r = 530;
                              break c;
                             }
                             switch (0 | l) {
                             case 2940928:
                              break;

                             default:
                              break d;
                             }
                             do {
                              if (!(0 | f[18316])) {
                               if (0 | Fb()) break;
                               b[43136] = 0 | b[39188], b[43137] = 0 | b[39189], b[43138] = 0 | b[39190], b[43139] = 0 | b[39191], b[43140] = 0 | b[39192], b[43141] = 0 | b[39193];
                              }
                             } while (0);
                             if (0 | Yd(43136, 39188)) {
                              r = 530;
                              break c;
                             }
                             d[168355] = 65534 + (0 | j[168355]), f[10846] = 6, f[10824] = 4, f[10812] = 1263225675, r = 530;
                             break c;
                            }
                            if ((0 | l) >= 5869568) {
                             if ((0 | l) >= 6291456) {
                              switch (0 | l) {
                              case 6291456:
                               break;

                              default:
                               break d;
                              }
                              if (tf(0 | f[10815], 3145728, 0), z = 0 | qd(), d[102818] = z, z << 16 >> 16 != 19789) {
                               r = 530;
                               break c;
                              }
                              d[102816] = 16, a = 65520 + (0 | j[168355]) & 65535, d[168355] = a, d[102817] = 28, d[168356] = 65508 + (0 | j[168356]), f[10839] = 62912, f[10768] = 4674377, b[43136] = 0, r = 532;
                              break c;
                             }
                             switch (0 | l) {
                             case 5869568:
                              break;

                             default:
                              break d;
                             }
                             do {
                              if (!(0 | f[18316])) {
                               if (!(0 | Hb())) break;
                               f[(a = 43072) >> 2] = 1869506893, f[a + 4 >> 2] = 6386796, c = 39205, e = 10 + (a = 43136) | 0;
                               do {
                                b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
                               } while ((0 | a) < (0 | e));
                              }
                             } while (0);
                             f[10846] = 77 == (0 | b[43072]) ? 30 : 6, r = 530;
                             break c;
                            }
                            if ((0 | l) < 4775936) {
                             switch (0 | l) {
                             case 4771840:
                              break;

                             default:
                              break d;
                             }
                             do {
                              if (!(0 | f[18316])) {
                               if (!(0 | Eb())) break;
                               b[43136] = 0 | b[39183], b[43137] = 0 | b[39184], b[43138] = 0 | b[39185], b[43139] = 0 | b[39186], b[43140] = 0 | b[39187];
                              }
                             } while (0);
                             if (!(0 | Yd(43136, 39183))) {
                              r = 530;
                              break c;
                             }
                             f[10812] = -1263225676, pd(3), n[10816] = 1.1959999799728394, n[10817] = 1.246000051498413, n[10818] = 1.0180000066757202, r = 530;
                             break c;
                            }
                            switch (0 | l) {
                            case 4775936:
                             break;

                            default:
                             break d;
                            }
                            0 | f[18316] || Gb();
                            do {
                             if (69 == (0 | b[43136])) {
                              if ((0 | Yf(43137)) >= 3700) break;
                              f[10812] = 1229539657;
                             }
                            } while (0);
                            if (0 | Yd(43136, 39194) || (f[18321] = 1, f[10812] = 370546198), 79 != (0 | b[43072])) {
                             r = 530;
                             break c;
                            }
                            if (a = ~~+rd(12, 32, 1188864, 3576832), c = ~~+rd(12, 32, 2383920, 2387016), (0 | ((0 | a) > -1 ? a : 0 - a | 0)) < (0 | ((0 | c) > -1 ? c : 0 - c | 0)) && (f[10846] = 24, a = c), (0 | a) >= 0) {
                             r = 530;
                             break c;
                            }
                            f[10812] = 1633771873, r = 530;
                            break c;
                           } while (0);
                           if (l = 65535 & k, !(0 | Yd(43072, 38501))) {
                            do {
                             if (0 | Yd(43143, 39215)) {
                              if (7 == (0 | f[18282])) break;
                              f[10839] = 2 == (0 | f[10956]) & 0 != (0 | f[10804]) ? 12032 : 15872;
                             } else b[43136] = 0 | b[39215], b[43137] = 0 | b[39216], b[43138] = 0 | b[39217], b[43139] = 0 | b[39218], b[43140] = 0 | b[39219], b[43141] = 0 | b[39220], d[168355] = 2144, d[168356] = 2880, f[18321] = 6;
                            } while (0);
                            switch (e = (0 | j[168360]) - (0 | j[168355]) >> 2 << 1, d[102816] = e, c = 0 | d[168356], a = l - (65535 & c) >> 2 << 1 & 65535, d[102817] = a, c << 16 >> 16) {
                            case 3664:
                            case 2848:
                             f[10812] = 370546198, c << 16 >> 16 == 3328 && (r = 306);
                             break;

                            case 6032:
                            case 4952:
                            case 4032:
                             d[102817] = 0, a = 0, r = 307;
                             break;

                            case 3328:
                             r = 306;
                             break;

                            default:
                             r = 307;
                            }
                            if (306 == (0 | r) ? (d[168356] = 3262, c = 3262, a = 34, r = 308) : 307 == (0 | r) && c << 16 >> 16 == 4936 && (c = 4936, a = 4, r = 308), 308 == (0 | r) && (d[102817] = a), 0 | Yd(43136, 39221) ? 0 | Yd(43136, 39229) || (r = 311) : r = 311, 311 == (0 | r) && (d[168356] = 2 + (65535 & c), d[102817] = 0, f[10812] = 370546198, a = 0), 0 | f[18283] && (z = 65535 & (0 | X(0 | f[10956], l)), d[168359] = z), 9 != (0 | f[10812])) {
                             r = 530;
                             break c;
                            }
                            for (e &= 65534, c = 65535 & a, a = 0; ;) {
                             if (36 == (0 | a)) {
                              r = 530;
                              break c;
                             }
                             b[344940 + a >> 0] = 0 | b[362005 + (6 * ((((0 | a) / 6 | 0) + e | 0) % 6 | 0) | 0) + ((a + c | 0) % 6 | 0) >> 0], a = a + 1 | 0;
                            }
                           }
                           if (0 | Yd(43136, 39237)) {
                            e: do {
                             if (0 | Yd(43136, 39245)) {
                              if (!(0 | Me(43072, 38517))) {
                               if (0 | f[18282] || (f[10839] = 4095, f[18282] = 13), !(0 | _d(43136, 39253, 8))) {
                                0 | Yd(43136, 30293) || (f[10812] = 1229539657), f[10958] = 12, f[18282] = 7, r = 530;
                                break c;
                               }
                               do {
                                if (0 | _d(43136, 39262, 5)) {
                                 if (!(0 | _d(43136, 39268, 5))) break;
                                 if (!(0 | _d(43136, 39274, 6))) break;
                                 if (0 | _d(43136, 39293, 8)) {
                                  r = 530;
                                  break c;
                                 }
                                 switch (0 | b[43144]) {
                                 case 53:
                                  r = 335;
                                  break e;

                                 case 52:
                                  d[168355] = 1716, d[168356] = 2304;
                                  break e;

                                 case 54:
                                  d[168355] = 2136, d[168356] = 2848;
                                  break e;

                                 default:
                                  break e;
                                 }
                                }
                               } while (0);
                               f[m >> 2] = 43142 + (77 == (0 | b[43136]) & 1), $d(43156, 39281, m), od(43072, 43156), f[18282] = 7, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39302))) {
                               f[18282] = 13, f[10814] = -1, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39309))) {
                               d[168355] = 65534 + (0 | j[168355]), r = 530;
                               break c;
                              }
                              if (a = 0 == (0 | Yd(43072, 38562)), k << 16 >> 16 == 4704 & a) {
                               d[102816] = 8, d[168355] = 65528 + (0 | j[168355]), d[102817] = 8, d[168356] = 65520 + (0 | j[168356]), f[10846] = 32, r = 530;
                               break c;
                              }
                              if (c = 0 | d[168360], a & c << 16 >> 16 == 3714) {
                               d[102816] = 18, d[168355] = 65518 + (0 | j[168355]), d[168356] = 5536, d[102817] = l + 6e4, k << 16 >> 16 != 5600 && (d[102816] = 0, d[102817] = 0), f[10812] = 1633771873, f[10824] = 3, r = 530;
                               break c;
                              }
                              if (k << 16 >> 16 == 5632 & a) {
                               if (d[102818] = 18761, d[168355] = 3694, d[102816] = 2, d[102817] = g + 32, d[168356] = 5542 - g, 12 != (0 | g)) {
                                r = 530;
                                break c;
                               }
                               f[10846] = 80, r = 530;
                               break c;
                              }
                              if (k << 16 >> 16 == 5664 & a) {
                               d[102816] = 17, d[168355] = 65519 + (0 | j[168355]), d[102817] = 96, d[168356] = 5544, f[10812] = 1229539657, r = 530;
                               break c;
                              }
                              if (k << 16 >> 16 == 6496 & a) {
                               f[10812] = 1633771873, f[10838] = 1 << g + -7, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39317))) {
                               if (d[102818] = 18761, a = 0 | j[168355], d[168355] = a + 65516, d[102816] = 2, c = 0 | j[168356], z = c + 65530 | 0, d[168356] = z, (65535 & z) >>> 0 <= 3682) {
                                r = 530;
                                break c;
                               }
                               d[168355] = a + 65506, d[168356] = c + 65484, d[102816] = 8, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39321))) {
                               if (d[102818] = 18761, a = 0 | j[168355], d[168355] = a + 65533, d[102816] = 2, c = 0 | j[168356], z = c + 65526 | 0, d[168356] = z, (65535 & z) >>> 0 <= 3718) {
                                r = 530;
                                break c;
                               }
                               d[168355] = a + 65505, d[168356] = c + 65470, d[102816] = 8, r = 530;
                               break c;
                              }
                              if (0 | xf(43136, 39328)) {
                               b[43136] = 0 | b[39328], b[43137] = 0 | b[39329], b[43138] = 0 | b[39330], b[43139] = 0 | b[39331], b[43140] = 0 | b[39332], b[43141] = 0 | b[39333], r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39334))) {
                               d[168355] = 3045, d[168356] = 4070, d[102816] = 3, d[102818] = 18761, f[10812] = 1229539657, f[18282] = 13, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39339))) {
                               f[10838] = 16, r = 530;
                               break c;
                              }
                              if (i = 65535 & c, !(0 | Yd(43136, 39350))) {
                               d[102816] = 2, d[168355] = i + 65534, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43136, 39354))) {
                               Ic(.45, 4.5, 1, 255), r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43072, 30260))) {
                               switch (3 == (0 | f[18282]) && (f[18282] = 43), k << 16 >> 16) {
                               case 7262:
                                d[168355] = 5444, d[168356] = 7248, d[102816] = 4, d[102817] = 7, f[10812] = 1633771873;
                                break;

                               case 8282:
                               case 7410:
                                d[168355] = 65452 + (0 | j[168355]), d[168356] = 65454 + (0 | j[168356]), d[102816] = 4, d[102817] = 41, f[10812] = 1633771873;
                                break;

                               case 9044:
                                d[168355] = 6716, d[168356] = 8964, d[102816] = 8, d[102817] = 40, f[10846] = 256, f[10838] = 256 + (0 | f[10838]), f[10839] = 33025;
                                break;

                               case 4090:
                                b[43136] = 0 | b[39362], b[43137] = 0 | b[39363], b[43138] = 0 | b[39364], b[43139] = 0 | b[39365], b[43140] = 0 | b[39366], d[102816] = 6, d[168355] = 65530 + (0 | j[168355]), d[102817] = 3, d[168356] = 65526 + (0 | j[168356]), f[10812] = 1633771873;
                               }
                               if ((a = 0 | f[10848]) >>> 0 <= 1) {
                                r = 530;
                                break c;
                               }
                               f[10956] = a + 1, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43072, 37796))) {
                               0 | f[18282] || (f[18282] = 13), f[10839] = 16383, r = 530;
                               break c;
                              }
                              if (!(0 | Yd(43072, 30216))) {
                               f[10839] = 16383, tf(0 | f[10815], 0 | f[10960], 0);
                               do {
                                if (0 | rb(t, 1)) {
                                 if (15 != (0 | f[t + 4 >> 2])) break;
                                 f[10839] = 8191;
                                }
                               } while (0);
                               if ((i = 0 | f[10848]) >>> 0 > 1 ? (f[10812] = 0, r = 393) : (0 | f[10955]) >>> 0 < (0 | j[168360]) >>> 0 && (r = 393), 393 == (0 | r) && (f[18282] = 44, d[168359] = f[10957]), e = 0 | d[168356], ((g = 0 | d[168355]) | e) << 16 >> 16 == 2048) {
                                if (1 == (0 | i)) {
                                 f[10812] = 1, b[362e3] = 0 | b[39367], b[362001] = 0 | b[39368], b[362002] = 0 | b[39369], b[362003] = 0 | b[39370], b[362004] = 0 | b[39371], c = 39372, e = 11 + (a = 43136) | 0;
                                 do {
                                  b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
                                 } while ((0 | a) < (0 | e));
                                 a = 2016, c = 2032, e = 18, g = 8;
                                } else b[43136] = 0 | b[29626], b[43137] = 0 | b[29627], b[43138] = 0 | b[29628], b[43139] = 0 | b[29629], b[43140] = 0 | b[29630], a = 2022, c = 2028, e = 16, g = 10;
                                d[102816] = g, d[102817] = e, d[168355] = c, d[168356] = a, r = 530;
                                break c;
                               }
                               if (a = 65535 & e, 5204 != ((c = 65535 & g) + a | 0)) switch (e << 16 >> 16) {
                               case 2116:
                                f[(r = 43136) >> 2] = 1701601622, f[r + 4 >> 2] = 3547247, d[102816] = 30, d[168355] = c + 65476, d[102817] = 55, d[168356] = a + 65426, f[10812] = 1229539657, r = 530;
                                break c;

                               case 3171:
                                f[(r = 43136) >> 2] = 1701601622, f[r + 4 >> 2] = 3547247, d[102816] = 24, d[168355] = c + 65488, d[102817] = 24, d[168356] = a + 65488, f[10812] = 370546198, r = 530;
                                break c;

                               default:
                                r = 530;
                                break c;
                               }
                               if ((a = 0 | b[43136]) << 24 >> 24 || (f[(a = 43136) >> 2] = 1953390915, f[a + 4 >> 2] = 6648417, a = 67), z = (65535 & e) > (65535 & g), d[(z ? 205632 : 205634) >> 1] = 6, d[(z ? 205634 : 205632) >> 1] = 32, d[(z ? 336710 : 336712) >> 1] = 2048, d[(z ? 336712 : 336710) >> 1] = 3072, f[10812] = z ? 1633771873 : 370546198, a << 24 >> 24 == 86 | 0 == +n[10961]) {
                                f[10812] = 0, r = 530;
                                break c;
                               }
                               f[10956] = i, r = 530;
                               break c;
                              }
                              do {
                               if (0 | Yd(43072, 38541)) {
                                if (!(0 | Yd(43072, 29562))) break;
                                if (!(0 | Yd(43136, 39388))) {
                                 d[168355] = 1718, d[168356] = 2304, f[10812] = 370546198, f[18282] = 7, f[10846] = 30, r = 530;
                                 break c;
                                }
                                if (!(0 | Yd(43072, 38547))) {
                                 c = (1 & (c = 0 | j[168355])) + c | 0, d[168355] = c, 0 | (a = 0 | f[18456]) && (f[10812] = a), a = 0 | d[168356];
                                 f: do {
                                  if (!(a << 16 >> 16 < 4100)) {
                                   if (a << 16 >> 16 < 9280) {
                                    switch (a << 16 >> 16) {
                                    case 4100:
                                     break;

                                    default:
                                     break f;
                                    }
                                    d[168356] = 4096, a = 4096;
                                    break;
                                   }
                                   switch (a << 16 >> 16) {
                                   case 9280:
                                    break;

                                   default:
                                    break f;
                                   }
                                   d[168356] = 9274, d[168355] = c + 65530, a = 9274;
                                   break;
                                  }
                                  switch (a << 16 >> 16) {
                                  case 4080:
                                   break;

                                  default:
                                   break f;
                                  }
                                  d[168356] = 4056, a = 4056;
                                 } while (0);
                                 (c = 13 == (0 | f[18282])) && (f[10846] = 4), f[10958] = 12, a &= 65535;
                                 do {
                                  if (0 | Yd(43136, 39395)) {
                                   if (!(0 | Yd(43136, 39401))) break;
                                   if (!(0 | Yd(43136, 39407))) {
                                    if (d[168356] = a + 65506, !c) {
                                     r = 530;
                                     break c;
                                    }
                                    f[10839] = 3961, r = 530;
                                    break c;
                                   }
                                   if (!(0 | Yd(43136, 39413))) {
                                    f[18317] = 10721280, f[10965] = q + -10721280, d[168365] = 480, d[168364] = 640, r = 530;
                                    break c;
                                   }
                                   if (0 | Yd(43136, 39421)) {
                                    r = 530;
                                    break c;
                                   }
                                   d[168356] = a + 65520, r = 530;
                                   break c;
                                  }
                                 } while (0);
                                 if (d[168356] = a + 65516, !c) {
                                  r = 530;
                                  break c;
                                 }
                                 f[10839] = 4035, cg(336732, 0, 8204), r = 530;
                                 break c;
                                }
                                if (!(0 | Yd(43136, 38615))) {
                                 d[168355] = 2047, d[168356] = 3072, f[10812] = 1633771873, f[10960] = 6656, f[18282] = 7, r = 530;
                                 break c;
                                }
                                if (!(0 | Yd(43136, 39426))) {
                                 d[168356] = 3288, d[102817] = 5, f[18291] = -17, f[10960] = 862144, f[18282] = 4, f[10812] = -1667457892, f[10824] = 4, b[362e3] = 0 | b[39435], b[362001] = 0 | b[39436], b[362002] = 0 | b[39437], b[362003] = 0 | b[39438], b[362004] = 0 | b[39439], r = 530;
                                 break c;
                                }
                                if (!(0 | Yd(43136, 39440))) {
                                 d[168356] = 3109, d[102817] = 59, f[18285] = 9, f[10960] = 787392, f[18282] = 4, r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 3984 & e) {
                                 d[168356] = 3925, d[102818] = 19789, r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 4288 & e) {
                                 d[168356] = 65504 + (0 | j[168356]), r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 4600 & e) {
                                 0 | Yd(43136, 39447) || (d[168355] = 65532 + (0 | j[168355])), f[10838] = 0, r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 4928 & e) {
                                 if ((0 | j[168355]) >= 3280) {
                                  r = 530;
                                  break c;
                                 }
                                 d[168356] = 65528 + (0 | j[168356]), r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 5504 & e) {
                                 if (d[168356] = (0 | j[168356]) - ((0 | j[168355]) > 3664 ? 8 : 32), 0 | _d(43136, 39457, 3)) {
                                  r = 530;
                                  break c;
                                 }
                                 f[10838] = 200 << g + -12, r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 6048 & e) {
                                 if (a = 0 | j[168356], d[168356] = a + 65512, !(0 | xf(43136, 39461) || 0 | xf(43136, 39465))) {
                                  r = 530;
                                  break c;
                                 }
                                 d[168356] = a + 65506, r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 7392 & e) {
                                 d[168356] = 65506 + (0 | j[168356]), r = 530;
                                 break c;
                                }
                                if (k << 16 >> 16 == 8e3 & e) {
                                 if (d[168356] = 65504 + (0 | j[168356]), 0 | _d(43136, 39457, 3)) {
                                  r = 530;
                                  break c;
                                 }
                                 f[10958] = 14, f[18282] = 13, f[10838] = 512, r = 530;
                                 break c;
                                }
                                if (!(0 | Yd(43136, 30195))) {
                                 a = 0 | d[168356], c = 0 | d[168355], a << 16 >> 16 == 3880 ? (d[168355] = c + -1 << 16 >> 16, z = k + 1 << 16 >> 16, d[168359] = z, d[168356] = z) : (d[168355] = 65532 + (65535 & c), d[168356] = 65532 + (65535 & a), d[102818] = 19789, f[10846] = 2), f[10812] = 1633771873, r = 530;
                                 break c;
                                }
                                if (!(0 | Yd(43136, 39469))) {
                                 d[102816] = 4, d[168355] = 65532 + (0 | j[168355]), d[102817] = 32, d[168356] = 65504 + (0 | j[168356]), Ic(0, 7, 1, 255), r = 530;
                                 break c;
                                }
                                do {
                                 if (0 | Yd(43136, 38876)) {
                                  if (!(0 | Yd(43136, 39474))) break;
                                  if (!(0 | Yd(43136, 39479))) break;
                                  if (!(0 | Se(43136, 39484, 9))) {
                                   f[10960] = (0 | f[10960]) < 86016 ? 86016 : 94208, f[18282] = 7, r = 530;
                                   break c;
                                  }
                                  if (0 | Me(43072, 30277)) {
                                   if (!(0 | Yd(43136, 38638))) {
                                    d[168355] = 512, d[168356] = 768, f[10960] = 3632, f[18282] = 39, f[10812] = 1633771873, pd(2), r = 530;
                                    break c;
                                   }
                                   if (0 | _d(43136, 39577, 9)) {
                                    if ((z = 0 != (0 | Yd(43072, 30463))) | 0 != (0 | f[18282])) {
                                     r = 530;
                                     break c;
                                    }
                                    switch (k << 16 >> 16) {
                                    case 1316:
                                     a = 6, c = 1, e = 1300, g = 1030, r = 528;
                                     break;

                                    case 2568:
                                     a = 8, c = 2, e = 2560, g = 1960, r = 528;
                                    }
                                    528 == (0 | r) && (d[168355] = g, d[168356] = e, d[102816] = c, d[102817] = a), f[10812] = 370546198, f[18282] = 49, r = 530;
                                    break c;
                                   }
                                   0 | b[o + 5 >> 0] && (d[21573] = 12338, d[21574] = 48), tf(0 | f[10815], 544, 0), a = 0 | Za(), d[168355] = a, a = 0 | Za(), d[168356] = a, $a(), a = (a = (0 | Za()) << 16 >> 16 == 30) ? 738 : 736, f[10960] = a, (65535 & (c = 0 | d[168355])) > (65535 & (e = 0 | d[168356])) && (d[168356] = c, d[168355] = e, tf(0 | f[10815], a + -6 | 0, 0), z = 3 != (3 & (0 | Za())), f[18321] = z ? 5 : 6), f[10812] = 1633771873, r = 530;
                                   break c;
                                  }
                                  -1 == (0 | f[10812]) && (f[10812] = 1633771873);
                                  do {
                                   if (0 | _d(43136, 39494, 6)) {
                                    if (!(0 | _d(43136, 39501, 6))) {
                                     r = 496;
                                     break;
                                    }
                                    if (!(0 | _d(43136, 39508, 4))) {
                                     r = 496;
                                     break;
                                    }
                                    if (0 | Yd(43136, 39521)) {
                                     if (0 | Yd(43136, 39529)) break;
                                     r = 502;
                                     break;
                                    }
                                    f[10838] = 214, r = 502;
                                    break;
                                   }
                                   r = 496;
                                  } while (0);
                                  if (496 == (0 | r) && (d[168356] = 65532 + (0 | j[168356]), d[102817] = 2, 32 == (0 | b[43142]) && (b[43142] = 0), 0 | Yd(43136, 39513) || (r = 502)), 502 == (0 | r) && (f[10824] = 1, f[10812] = 0), 0 | Yd(43140, 39537) || (b[362e3] = 0 | b[39541], b[362001] = 0 | b[39542], b[362002] = 0 | b[39543], b[362003] = 0 | b[39544], b[362004] = 0 | b[39545]), 0 | xf(43136, 39546) && (b[43136] = 0 | b[39546], b[43137] = 0 | b[39547], b[43138] = 0 | b[39548], b[43139] = 0 | b[39549], b[43140] = 0 | b[39550], f[10960] = 15424), !(0 | _d(43136, 29456, 3))) {
                                   d[168355] = 242, d[168360] = 244, r = (z = (0 | q) < 1e5) ? 249 : 501, d[168359] = z ? 256 : 512, d[168356] = r, p[5401] = (z ? 968 : 119306) / ((z ? 3 : 373) * +(65535 & r)), d[102817] = 1, d[102816] = 1, f[10824] = 4, f[10812] = -1920103027, pd(1), n[10817] = 1.1790000200271606, n[10818] = 1.2089999914169312, n[10819] = 1.0360000133514404, f[18282] = 5, r = 530;
                                   break c;
                                  }
                                  if (!(0 | Yd(43136, 39551))) {
                                   b[43136] = 0 | b[39554], b[43137] = 0 | b[39555], b[43138] = 0 | b[39556], b[43139] = 0 | b[39557], b[43140] = 0 | b[39558], d[168355] = 512, d[168356] = 768, f[10960] = 1152, f[18282] = 39, f[10958] = 12, r = 530;
                                   break c;
                                  }
                                  if (0 | xf(43136, 39559)) {
                                   b[43136] = 0 | b[39559], b[43137] = 0 | b[39560], b[43138] = 0 | b[39561], b[43139] = 0 | b[39562], b[43140] = 0 | b[39563], d[168355] = 512, d[168356] = 768, f[10960] = 19712, f[18282] = 39, r = 530;
                                   break c;
                                  }
                                  if (0 | xf(43136, 39564)) {
                                   b[43136] = 0 | b[39564], b[43137] = 0 | b[39565], b[43138] = 0 | b[39566], b[43139] = 0 | b[39567], b[43140] = 0 | b[39568], b[43141] = 0 | b[39569], d[168355] = 976, d[168356] = 848, p[5401] = 1.5345911949685533, f[18282] = 7 == (0 | f[10844]) ? 48 : 47, r = 530;
                                   break c;
                                  }
                                  if (0 | Yd(43136, 39570)) {
                                   r = 530;
                                   break c;
                                  }
                                  d[168365] = 128, d[168364] = 192, f[18317] = 6144, f[10967] = 360, f[18491] = 25, f[10838] = 17, r = 530;
                                  break c;
                                 }
                                } while (0);
                                d[102818] = 18761, a = 0 | f[10960], 0 != (0 | f[10812]) & 0 != (0 | a) ? (tf(0 | f[10815], (0 | a) < 4096 ? 168 : 5252, 0), db(205638, 256)) : Ic(0, 3.875, 1, 255), a = 0 | f[10812] ? 5 : (a = 0 != (0 | Yd(43136, 39474))) ? 46 : 45, f[18282] = a, f[10846] = (0 | f[10958]) >>> 0 > 16 & 1, f[10958] = 8, r = 530;
                                break c;
                               }
                              } while (0);
                              do {
                               if ((0 | (q - (0 | f[10960]) | 0) / (0 | (l << 3 >>> 0) / 7)) == (0 | i)) f[18282] = 9; else {
                                if (0 | f[18282]) break;
                                f[18282] = 13, f[10846] = 4;
                               }
                              } while (0);
                              for (f[18494] = 1, a = (65535 & (a = 12 + (0 | j[168355]) | 0)) >>> 0 > i >>> 0 ? c : 65535 & a, d[168355] = a, c = 0; 23 != (0 | c); ) {
                               do {
                                if ((0 | l) == (0 | d[24338 + (12 * c | 0) >> 1])) {
                                 if ((0 | i) != (0 | d[24338 + (12 * c | 0) + 2 >> 1])) break;
                                 d[102817] = 0 | d[24338 + (12 * c | 0) + 4 >> 1], d[102816] = 0 | d[24338 + (12 * c | 0) + 6 >> 1], d[168356] = (0 | j[168356]) + (0 | j[24338 + (12 * c | 0) + 8 >> 1]), a = (0 | j[24338 + (12 * c | 0) + 10 >> 1]) + (65535 & a) & 65535, d[168355] = a;
                                }
                               } while (0);
                               c = c + 1 | 0;
                              }
                              r = 0 | X(0 | h[39383 + (3 & (1 & d[102817] ^ 3 + (0 | f[10812]) ^ j[102816] << 1)) >> 0], 16843009), f[10812] = r, r = 530;
                              break c;
                             }
                             r = 335;
                            } while (0);
                            335 == (0 | r) && (d[168355] = 1956, d[168356] = 2607, d[168359] = 2624), f[10960] = 14 + (0 | f[10960]), f[10812] = 1633771873;
                           } else d[168355] = 1712, d[168356] = 2312, d[168359] = 2336;
                           f[18282] = 13, f[10839] = 991, d[102818] = 19789, r = 530;
                           break c;
                          }
                         } while (0);
                         d[168356] = (0 | d[168356]) - 1 << 16 >> 16, r = 530;
                         break c;
                        }
                       } while (0);
                       d[168356] = 65484 + (0 | j[168356]), d[102817] = 2, r = 530;
                       break c;
                      }
                     } while (0);
                     d[168356] = 65490 + (0 | j[168356]), r = 530;
                     break c;
                    }
                   } while (0);
                   d[168356] = 65492 + (0 | j[168356]), r = 530;
                   break c;
                  }
                 } while (0);
                 d[168356] = 65494 + (0 | j[168356]), r = 530;
                 break c;
                }
               } while (0);
               d[168356] = 65532 + (0 | j[168356]), d[102817] = 2, r = 530;
               break c;
              }
             } while (0);
             d[168355] = 65533 + (0 | j[168355]), d[168356] = 65532 + (0 | j[168356]), r = 530;
             break c;
            }
           } while (0);
           f[10824] = 4, f[10812] = -1263225676, r = 530;
           break c;
          }
          r = 202;
         } while (0);
         202 == (0 | r) && (d[168355] = 773, d[168356] = 960, d[168359] = 992, p[5401] = 1.0893617021276596, a = 508436046), f[10812] = a, f[10824] = 4, f[10958] = 10, f[18282] = 7, f[10846] = 40, r = 530;
        }
       } while (0);
       do {
        if (530 == (0 | r)) {
         if (0 | b[43136]) break;
         a = 0 | d[168355], r = 532;
        }
       } while (0);
       if (532 == (0 | r) && (f[s >> 2] = j[168356], f[s + 4 >> 2] = 65535 & a, $d(43136, 39587, s)), -1 == (0 | f[10812]) && (f[10812] = -1802201964), 0 == (0 | (a = 0 | f[18317])) | 0 != (0 | d[168365])) break;
       if (tf(0 | f[10815], a, 0), !(0 | rb(t, 1))) break;
       d[168364] = f[t + 12 >> 2], d[168365] = f[t + 8 >> 2];
      }
     } while (0);
     if (+n[18322] > .125 ? 0 != (0 != (f[10845] | f[10809] | 0) & f[39] | 0) : 0) {
      c = 73288, e = 48 + (a = 43300) | 0;
      do {
       f[a >> 2] = f[c >> 2], a = a + 4 | 0, c = c + 4 | 0;
      } while ((0 | a) < (0 | e));
      f[10823] = 0;
     } else 0 | f[10823] && (od(43072, 43136), 0 != (0 | f[10823]) & 39 == (0 | f[18282]) && od(38659, 39593));
     if (0 | d[172468] ? (c = 0 | f[18283], g = (0 | j[168356]) >>> (0 == (0 | c) & 1), d[172468] = g, f[10812] = 1 & g | 0 ? -1802201964 : 1229539657, c = 65535 & (g = ((0 | j[168355]) >>> c) + g | 0), d[168356] = c, g = g + 65535 & 65535, d[168355] = g, p[5401] = 1) : (a = 0 | d[168355], (0 | j[168360]) < (65535 & a) && (d[168360] = a), c = 0 | d[168356], (0 | j[168359]) < (65535 & c) ? (d[168359] = c, g = a) : g = a), (a = 0 | f[10958]) ? e = a : (f[10958] = 12, e = 12), 0 | f[10839] || (f[10839] = (1 << e) - 1), a = 0 | f[18282], (65535 & g) < 22 | 0 == (0 | a) ? r = 555 : (65535 & c) < 22 | e >>> 0 > 16 | (0 | f[10848]) >>> 0 > 6 | (0 | f[10824]) >>> 0 > 4 && (r = 555), 555 == (0 | r) && (f[10956] = 0), 41 == (0 | a) && (f[v >> 2] = f[10813], f[v + 4 >> 2] = 39638, uf(22792, 39603, v), f[10956] = 0, a = 0 | f[18282]), 48 == (0 | a) | 50 == (0 | a) && (f[w >> 2] = f[10813], f[w + 4 >> 2] = 39648, uf(22792, 39603, w), f[10956] = 0), 0 | b[362e3] || (z = 3 == (0 | f[10824]) ? 39656 : 39661, b[362e3] = 0 | b[z >> 0], b[362001] = 0 | b[z + 1 >> 0], b[362002] = 0 | b[z + 2 >> 0], b[362003] = 0 | b[z + 3 >> 0], b[362004] = 0 | b[z + 4 >> 0]), 0 | d[168360] || (d[168360] = 0 | d[168355]), 0 | d[168359] || (d[168359] = 0 | d[168356]), !((a = 0 | f[10812]) >>> 0 > 999 & 3 == (0 | f[10824]))) break;
     f[10812] = (a >>> 2 & 572662306 | a << 2 & -2004318072) & a << 1 | a;
    }
   } while (0);
   -1 == (0 | f[18321]) && (z = 0 | f[18490], f[18321] = -1 == (0 | z) ? 0 : z), u = x;
  }
  function Qc(a) {
   a |= 0;
   var c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0;
   ca = u, u = u + 1296 | 0, W = ca + 424 | 0, V = ca + 416 | 0, U = ca + 408 | 0, J = ca + 952 | 0, N = ca + 948 | 0, O = ca + 944 | 0, P = ca + 940 | 0, Q = ca + 1232 | 0, R = ca + 1216 | 0, T = ca + 960 | 0, ba = ca + 280 | 0, Z = ca + 184 | 0, _ = ca + 88 | 0, Y = ca + 56 | 0, aa = ca + 24 | 0, $ = ca, K = ca + 912 | 0, M = ca + 436 | 0, f[(S = ca + 936 | 0) >> 2] = 50462976, f[Y >> 2] = f[20], f[Y + 4 >> 2] = f[21], f[Y + 8 >> 2] = f[22], f[Y + 12 >> 2] = f[23], f[Y + 16 >> 2] = f[24], f[Y + 20 >> 2] = f[25], f[Y + 24 >> 2] = f[26], f[Y + 28 >> 2] = f[27], f[aa >> 2] = 0, f[aa + 4 >> 2] = 0, f[aa + 8 >> 2] = 0, f[aa + 12 >> 2] = 0, f[aa + 16 >> 2] = 0, f[aa + 20 >> 2] = 0, f[aa + 24 >> 2] = 0, f[aa + 28 >> 2] = 0, f[$ >> 2] = f[28], f[$ + 4 >> 2] = f[29], f[$ + 8 >> 2] = f[30], f[$ + 12 >> 2] = f[31], f[$ + 16 >> 2] = f[32], f[$ + 20 >> 2] = f[33], f[K >> 2] = f[216], f[K + 4 >> 2] = f[217], f[K + 8 >> 2] = f[218], f[K + 12 >> 2] = f[219], f[K + 16 >> 2] = f[220], f[K + 20 >> 2] = f[221], g = 0 | f[18334];
   a: do {
    if (g >>> 0 > 9) c = 1; else {
     for (f[18334] = g + 1, c = 0; 4 != (0 | c); ) {
      for (e = 0; 4 != (0 | e); ) p[ba + (c << 5) + (e << 3) >> 3] = +((0 | e) == (0 | c) & 1), e = e + 1 | 0;
      c = c + 1 | 0;
     }
     if ((65535 & (c = 0 | Za())) > 512) c = 1; else {
      for (A = M + 12 | 0, B = M + 8 | 0, C = M + 4 | 0, D = M + 16 | 0, E = M + 20 | 0, F = $ + 8 | 0, G = $ + 16 | 0, z = 0, H = 0, I = 0, e = 65535 & c, v = 16, x = 0, m = 0, o = g; y = e + -1 | 0, e; ) {
       Pc(a, J, N, O, P), c = 0 | f[J >> 2], r = 73340 + (48 * o | 0) | 0, s = 73340 + (48 * o | 0) + 4 | 0, e = 73340 + (48 * o | 0) + 40 | 0, g = 73340 + (48 * o | 0) + 36 | 0, t = 73340 + (48 * o | 0) + 20 | 0, k = 73340 + (48 * o | 0) + 28 | 0, i = 73340 + (48 * o | 0) + 12 | 0, q = 73340 + (48 * o | 0) + 8 | 0;
       b: do {
        if ((0 | c) < 34303) {
         c: do {
          if ((0 | c) < 274) switch (0 | c) {
          case 256:
          case 2:
           w = 33;
           break b;

          case 257:
          case 3:
           w = 34;
           break b;

          case 258:
           w = 35;
           break b;

          case 273:
           w = 46;
           break b;

          case 11:
           break c;

          case 5:
           e = 0 | Za(), d[168356] = e, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 6:
           e = 0 | Za(), d[168355] = e, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 7:
           e = 65535 & (0 | Za()), d[168356] = (0 | j[168356]) + e, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 9:
           if (!((c = 0 | Za()) << 16 >> 16)) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           f[10812] = 65535 & c, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 18:
          case 17:
           if (!(3 == (0 | f[N >> 2]) & 1 == (0 | f[O >> 2]))) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           l = .00390625 * +(65535 & (0 | Za())), n[43844 + ((c << 1) - 34 << 2) >> 2] = l, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 23:
           if (3 != (0 | f[N >> 2])) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           l = +(65535 & (0 | Za())), n[18318] = l, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 30:
          case 29:
          case 28:
           e = 0 | Za(), d[336732 + (c + -28 << 1) >> 1] = e, d[168369] = 0 | d[168367], e = z, g = H, i = I, k = x, c = v;
           break b;

          case 38:
          case 37:
          case 36:
           l = +(65535 & (0 | Za())), n[43844 + (c + -36 << 2) >> 2] = l, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 39:
           if ((0 | f[O >> 2]) >>> 0 < 50 | 0 != +n[10961]) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           for (tf(0 | f[10815], 12, 1), c = 0; ;) {
            if (3 == (0 | c)) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            l = +(65535 & (0 | Za())), n[43844 + (c << 2) >> 2] = l, c = c + 1 | 0;
           }

          case 46:
           if (7 != (0 | f[N >> 2])) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if (255 != (0 | Qf(0 | f[10815]))) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if (216 != (0 | Qf(0 | f[10815]))) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           e = (0 | Pf(0 | f[10815])) - 2 | 0, f[18317] = e, f[10965] = f[O >> 2], e = z, g = H, i = I, k = x, c = v;
           break b;

          case 259:
           e = 0 | ab(0 | f[N >> 2]), f[i >> 2] = e, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 262:
           e = 65535 & (0 | Za()), f[73340 + (48 * o | 0) + 16 >> 2] = e, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 270:
           Of(361488, 512, 1, 0 | f[10815]), e = z, g = H, i = I, k = x, c = v;
           break b;

          case 271:
           hf(43072, 64, 0 | f[10815]), e = z, g = H, i = I, k = x, c = v;
           break b;

          case 272:
           hf(43136, 64, 0 | f[10815]), e = z, g = H, i = I, k = x, c = v;
           break b;

          default:
           e = z, g = H, i = I, k = x, c = v;
           break b;
          } else {
           if ((0 | c) < 514) switch (0 | c) {
           case 513:
            w = 46;
            break b;

           case 279:
            w = 55;
            break b;

           case 291:
            w = 193;
            break b;

           case 305:
            break c;

           case 280:
            if (4 != (0 | f[N >> 2])) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            f[18282] = 9, f[10846] = 8200, w = 46;
            break b;

           case 274:
            e = 30123 + (7 & (0 | Za())) | 0, f[73340 + (48 * o | 0) + 24 >> 2] = (0 | b[e >> 0]) - 48, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 277:
            e = 7 & (0 | ab(0 | f[N >> 2])), f[k >> 2] = e, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 306:
            Rc(0), e = z, g = H, i = I, k = x, c = v;
            break b;

           case 315:
            Of(361424, 64, 1, 0 | f[10815]), e = z, g = H, i = I, k = x, c = v;
            break b;

           case 322:
            e = 0 | ab(0 | f[N >> 2]), f[g >> 2] = e, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 323:
            g = 0 | ab(0 | f[N >> 2]), f[e >> 2] = g, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 324:
            switch (c = (0 | f[O >> 2]) >>> 0 > 1 ? 0 | Pf(0 | f[10815]) : 0 | $a(), f[t >> 2] = c, 0 | f[O >> 2]) {
            case 1:
             f[e >> 2] = 0, f[g >> 2] = 0, e = z, g = H, i = I, k = x, c = v;
             break b;

            case 4:
             f[18282] = 10, f[10956] = 5, e = z, g = H, i = I, k = x, c = v;
             break b;

            default:
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }

           case 330:
            if (!(0 | Yd(43136, 30195)) && 3872 == (0 | f[r >> 2])) {
             f[18282] = 11, e = (0 | $a()) + a | 0, f[10960] = e, e = z, g = H, i = I, k = x, o = o + 1 | 0, c = v;
             break b;
            }
            for (;;) {
             if (t = 0 | f[O >> 2], f[O >> 2] = t + -1, !t) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             if (c = 0 | Pf(0 | f[10815]), t = 0 | f[10815], tf(t, (0 | $a()) + a | 0, 0), 0 | Qc(a)) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             tf(0 | f[10815], c + 4 | 0, 0);
            }

           case 400:
            f[(e = 43072) >> 2] = 1852989779, f[e + 4 >> 2] = 6710895, f[10839] = 4095, e = z, g = H, i = I, k = x, c = v;
            break b;

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if ((0 | c) >= 29459) switch (0 | c) {
           case 33424:
            w = 110;
            break b;

           case 29459:
            for (c = 0; 4 != (0 | c); ) l = +(65535 & (0 | Za())), n[43844 + (c << 2) >> 2] = l, c = c + 1 | 0;
            e = 43844 + ((g = (1024 == +n[10962] & 1024 == +n[10963] & 1) << 1) << 2) | 0, l = +n[(g = 43844 + ((1 | g) << 2) | 0) >> 2], l = (da = +n[e >> 2] + l) - l, n[g >> 2] = l, n[e >> 2] = da - l, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 33405:
            hf(344976, 64, 0 | f[10815]), e = z, g = H, i = I, k = x, c = v;
            break b;

           case 33421:
            if ((0 | Za()) << 16 >> 16 != 6) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            if ((0 | Za()) << 16 >> 16 != 6) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            f[10812] = 9, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 33422:
            if (9 != (0 | f[10812])) {
             w = 104;
             break b;
            }
            for (c = 0; ;) {
             if (36 == (0 | c)) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             t = 3 & (0 | Qf(0 | f[10815])), b[344940 + c >> 0] = t, c = c + 1 | 0;
            }

           case 33434:
            da = +cb(0 | f[N >> 2]), n[18320] = da, n[73340 + (48 * o | 0) + 44 >> 2] = da, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 33437:
            da = +cb(0 | f[N >> 2]), n[18319] = da, e = z, g = H, i = I, k = x, c = v;
            break b;

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if ((0 | c) >= 29185) switch (0 | c) {
           case 29185:
            e = z, g = 0 | $a(), i = I, k = x, c = v;
            break b;

           case 29217:
            e = 0 | $a(), g = H, i = I, k = x, c = v;
            break b;

           case 29264:
            Zc(0 | Pf(0 | f[10815])), d[168359] = 0, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 29443:
            for (c = 0; ;) {
             if (4 == (0 | c)) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             da = +(65535 & (0 | Za())), n[43844 + (((0 | c) < 2 ^ c) << 2) >> 2] = da, c = c + 1 | 0;
            }

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if ((0 | c) < 28688) switch (0 | c) {
           case 514:
            w = 55;
            break b;

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           switch (0 | c) {
           case 28688:
            c = 0;
            break;

           case 29184:
            e = z, g = H, i = 0 | $a(), k = x, c = v;
            break b;

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           for (;;) {
            if (4 == (0 | c)) {
             c = 0;
             break;
            }
            s = (65535 & (0 | Za())) >>> 2 & 4095, f[K + ((t = c + 1 | 0) << 2) >> 2] = s, c = t;
           }
           d: for (;;) {
            if (5 == (0 | c)) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            for (i = 0 | f[K + ((g = c + 1 | 0) << 2) >> 2], k = 1 << c, e = 0 | f[K + (c << 2) >> 2]; ;) {
             if ((c = e + 1 | 0) >>> 0 > i >>> 0) {
              c = g;
              continue d;
             }
             d[205638 + (c << 1) >> 1] = (0 | j[205638 + (e << 1) >> 1]) + k, e = c;
            }
           }
          }
         } while (0);
         if (hf(Q, 64, 0 | f[10815]), 0 | _d(Q, 30132, 5) && 0 | _d(Q, 30138, 5) && 0 | _d(Q, 30144, 5) && 0 | _d(Q, 30150, 6) && 0 | _d(Q, 30157, 10) && 0 | Yd(Q, 30168)) {
          e = z, g = H, i = I, k = x, c = v;
          break;
         }
         f[10956] = 0, e = z, g = H, i = I, k = x, c = v;
        } else {
         e: do {
          if ((0 | c) < 50717) {
           f: do {
            if ((0 | c) < 46279) {
             if ((0 | c) < 37122) {
              switch (0 | c) {
              case 34675:
               w = 130;
               break e;

              case 34306:
               for (c = 0; ;) {
                if (4 == (0 | c)) {
                 e = z, g = H, i = I, k = x, c = v;
                 break b;
                }
                da = 4096 / +(65535 & (0 | Za())), n[43844 + ((1 ^ c) << 2) >> 2] = da, c = c + 1 | 0;
               }

              case 34307:
               if (Of(Q, 1, 7, 0 | f[10815]), 0 | _d(Q, 30209, 6)) {
                e = z, g = H, i = I, k = x, c = v;
                break b;
               }
               for (f[10824] = 4, f[10823] = 0, e = 0; ;) {
                if (3 == (0 | e)) {
                 e = z, g = H, i = I, k = x, c = v;
                 break b;
                }
                for (c = 0; 4 != (0 | c); ) t = 0 | f[10815], f[U >> 2] = 43300 + (e << 4) + ((1 ^ c) << 2), kf(t, 29988, U), c = c + 1 | 0;
                g: do {
                 if (0 | f[10809]) {
                  for (l = 0, c = 0; ;) {
                   if (4 == (0 | c)) {
                    c = 0;
                    break;
                   }
                   l += +n[43300 + (e << 4) + (c << 2) >> 2], c = c + 1 | 0;
                  }
                  for (;;) {
                   if (4 == (0 | c)) break g;
                   n[(t = 43300 + (e << 4) + (c << 2) | 0) >> 2] = +n[t >> 2] / l, c = c + 1 | 0;
                  }
                 }
                } while (0);
                e = e + 1 | 0;
               }

              case 34310:
               Vc(0 | Pf(0 | f[10815]));
               break;

              case 34303:
               break;

              case 34665:
               tf(e = 0 | f[10815], (0 | $a()) + a | 0, 0), Sc(a), e = z, g = H, i = I, k = x, c = v;
               break b;

              case 34853:
               tf(e = 0 | f[10815], (0 | $a()) + a | 0, 0), Tc(a), e = z, g = H, i = I, k = x, c = v;
               break b;

              default:
               e = z, g = H, i = I, k = x, c = v;
               break b;
              }
              b[43072] = 0 | b[30216], b[43073] = 0 | b[30217], b[43074] = 0 | b[30218], b[43075] = 0 | b[30219], b[43076] = 0 | b[30220], e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             if ((0 | c) < 37400) switch (0 | c) {
             case 37122:
              e = 0 | $a(), f[10982] = e, e = z, g = H, i = I, k = x, c = v;
              break b;

             case 37386:
              da = +cb(0 | f[N >> 2]), n[18455] = da, e = z, g = H, i = I, k = x, c = v;
              break b;

             case 37393:
              ab(0 | f[N >> 2]), e = z, g = H, i = I, k = x, c = v;
              break b;

             default:
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             if ((0 | c) >= 46274) {
              switch (0 | c) {
              case 46274:
               break f;

              case 46275:
               break;

              default:
               e = z, g = H, i = I, k = x, c = v;
               break b;
              }
              b[43072] = 0 | b[30221], b[43073] = 0 | b[30222], b[43074] = 0 | b[30223], b[43075] = 0 | b[30224], b[43076] = 0 | b[30225], b[43077] = 0 | b[30226], b[43078] = 0 | b[30227], e = 0 | Pf(0 | f[10815]), f[10960] = e, e = z, g = H, i = I, k = 0 | f[O >> 2], c = v;
              break b;
             }
             if ((0 | c) >= 40976) {
              switch (0 | c) {
              case 40976:
               break;

              default:
               e = z, g = H, i = I, k = x, c = v;
               break b;
              }
              switch (t = 0 | $a(), f[10979] = t, 0 | f[i >> 2]) {
              case 32770:
               c = 15;
               break;

              case 32772:
               c = 14;
               break;

              case 32773:
               c = 16;
               break;

              default:
               e = z, g = H, i = I, k = x, c = v;
               break b;
              }
              f[18282] = c, e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             switch (0 | c) {
             case 37400:
              break;

             default:
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             for (f[10823] = 0, e = 0; ;) {
              if (3 == (0 | e)) {
               e = z, g = H, i = I, k = x, c = v;
               break b;
              }
              for (cb(0 | f[N >> 2]), c = 0; 3 != (0 | c); ) da = +cb(0 | f[N >> 2]), n[43300 + (e << 4) + (c << 2) >> 2] = da, c = c + 1 | 0;
              e = e + 1 | 0;
             }
            } else switch (0 | c) {
            case 50712:
             w = 193;
             break b;

            case 46279:
             if (!x) {
              e = z, g = H, i = I, k = 0, c = v;
              break b;
             }
             tf(0 | f[10815], 38, 1);
             break f;

            case 50455:
            case 50454:
             if (c = 0 | f[O >> 2], !(g = 0 | Ad(c))) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             for (Of(g, 1, c, 0 | f[10815]), c = g + -1 | 0; c && !(c >>> 0 >= (g + (0 | f[O >> 2]) | 0) >>> 0); ) 0 | _d(e = c + 1 | 0, 30242, 8) || (f[W >> 2] = 43844, f[W + 4 >> 2] = 43848, f[W + 8 >> 2] = 43852, lf(c + 9 | 0, 30251, W)), c = 0 | Oe(e, 10);
             Bd(g), e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50458:
             if (0 | b[43072]) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             e = 30260, g = 11 + (c = 43072) | 0;
             do {
              b[c >> 0] = 0 | b[e >> 0], c = c + 1 | 0, e = e + 1 | 0;
             } while ((0 | c) < (0 | g));
             e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50459:
             e = 0 | d[102818], i = 0 | Pf(0 | f[10815]), g = 0 | f[18334], k = 0 | Za(), d[102818] = k, k = 0 | f[10815], Za(), tf(k, (0 | $a()) + i | 0, 0), Qc(i), f[10839] = 65535, f[18334] = g, d[102818] = e, e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50706:
             for (c = 0; 4 != (0 | c); ) t = f[10845] << 8, t = (0 | Qf(0 | f[10815])) + t | 0, f[10845] = t, c = c + 1 | 0;
             0 | b[43072] || (f[10768] = 4673092), f[10956] = 1, e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50708:
             if (0 | b[43136]) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             if (hf(43072, 64, 0 | f[10815]), !(c = 0 | Oe(43072, 32))) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             Te(43136, c + 1 | 0), b[c >> 0] = 0, e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50710:
             if (9 == (0 | f[10812])) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             (c = 0 | f[O >> 2]) >>> 0 > 4 && (f[O >> 2] = 4, c = 4), f[10824] = c, Of(S, 1, c, 0 | f[10815]), c = v, g = 0 | f[10824], w = 184;
             break b;

            case 50711:
             if ((0 | Za()) << 16 >> 16 != 2) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             d[172468] = 1, e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50713:
             if (t = 0 | Za(), d[168370] = t, t = 0 | Za(), d[168371] = t, (0 | X(0 | j[168370], 65535 & t)) >>> 0 <= 4096) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             d[168371] = 1, d[168370] = 1, e = z, g = H, i = I, k = x, c = v;
             break b;

            case 50714:
             c = 0 | d[168370], e = 0 | d[168371];
             break e;

            case 50716:
            case 50715:
             for (l = 0, c = 0; e = 0 | f[O >> 2], !(c >>> 0 >= (65535 & e) >>> 0); ) l += +cb(0 | f[N >> 2]), c = c + 1 | 0;
             f[10838] = ~~(l / +(e >>> 0) + .5 + +((0 | f[10838]) >>> 0)) >>> 0, e = z, g = H, i = I, k = x, c = v;
             break b;

            default:
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
           } while (0);
           for (tf(0 | f[10815], 40, 1), t = 65535 & (0 | $a()), d[168359] = t, t = 65535 & (0 | $a()), d[168360] = t, t = 7 & (0 | $a()), d[102817] = t, t = (t = (0 | j[168359]) - t | 0) - (7 & (0 | $a())) & 65535, d[168356] = t, t = 7 & (0 | $a()), d[102816] = t, t = (t = (0 | j[168360]) - t | 0) - (7 & (0 | $a())) & 65535, d[168355] = t, 7262 == (0 | d[168359]) && (d[168355] = 5444, d[168356] = 7244, d[102817] = 7), tf(0 | f[10815], 52, 1), c = 0; 3 != (0 | c); ) da = +cb(11), n[43844 + (c << 2) >> 2] = da, c = c + 1 | 0;
           tf(0 | f[10815], 114, 1), e = 90 * ((65535 & (0 | Za())) >>> 7) | 0, f[18321] = e, (0 | X(6 * (65535 & (c = 0 | d[168356])) | 0, 65535 & (g = 0 | d[168355]))) == (0 | x) && (90 == (0 | (e >>> 0) % 180) ? (d[168355] = c, d[168356] = g, e = g) : (e = c, c = g), d[168359] = e, d[168360] = c, f[18321] = 0, f[10812] = 0, d[102816] = 0, d[102817] = 0, g = c, c = e), t = ((0 | X(65535 & g, 65535 & c)) >>> 0) / 1e6 | 0, f[V >> 2] = t, $d(43136, 30228, V), f[18282] = 12, 0 | f[10812] && (1 & d[102817] && (f[10812] = 1633771873), f[18282] = 13), f[10839] = 65535, e = z, g = H, i = I, k = x, c = v;
           break b;
          }
          if ((0 | c) >= 51009) {
           if ((0 | c) >= 61448) switch (0 | c) {
           case 61448:
            w = 55;
            break b;

           case 64777:
            w = 104;
            break b;

           case 65024:
            w = 110;
            break b;

           case 61454:
            for (c = 0; ;) {
             if (3 == (0 | c)) {
              e = z, g = H, i = I, k = x, c = v;
              break b;
             }
             da = +((0 | ab(0 | f[N >> 2])) >>> 0), n[43844 + (((4 - c | 0) % 3 | 0) << 2) >> 2] = da, c = c + 1 | 0;
            }

           case 61450:
            e = 65535 & ~~((da = +L(+ +((0 | f[O >> 2]) >>> 0))) < 64 ? da : 64), d[168371] = e, d[168370] = e, c = e;
            break e;

           case 64772:
            if ((0 | f[O >> 2]) >>> 0 < 13) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            tf(0 | f[10815], 16, 1), e = 0 | $a(), f[10960] = e, tf(0 | f[10815], 28, 1), e = 0 | $a(), f[10960] = (0 | f[10960]) + e, f[18282] = 7, e = z, g = H, i = I, k = x, c = v;
            break b;

           case 65026:
            if (2 != (0 | f[N >> 2])) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            hf(344976, 64, 0 | f[10815]), e = z, g = H, i = I, k = x, c = v;
            break b;

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if ((0 | c) >= 61442) {
            switch (0 | c) {
            case 61442:
             w = 34;
             break b;

            case 61443:
             w = 35;
             break b;

            case 61447:
             w = 46;
             break b;

            case 61446:
             break;

            default:
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            if (d[168360] = 0, (0 | f[q >> 2]) > 12) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            f[18282] = 7, e = 0 != (0 | $a()), f[10846] = e ? 24 : 80, e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           if ((0 | c) < 61440) {
            switch (0 | c) {
            case 51009:
             break;

            default:
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            e = 0 | Pf(0 | f[10815]), f[10959] = e, e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           switch (0 | c) {
           case 61441:
            w = 33;
            break b;

           case 61440:
            break;

           default:
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           tf(e = 0 | f[10815], (0 | $a()) + a | 0, 0), Qc(a), e = z, g = H, i = I, k = x, c = v;
           break b;
          }
          switch (0 | c) {
          case 50831:
           w = 130;
           break e;

          case 50717:
           e = 0 | ab(0 | f[N >> 2]), f[10839] = e, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 50718:
           da = +cb(0 | f[N >> 2]), p[5401] = da, da = +cb(0 | f[N >> 2]), p[5401] = +p[5401] / da, e = z, g = H, i = I, k = x, c = v;
           break b;

          case 50722:
          case 50721:
           for (c = 0; ;) {
            if (!(c >>> 0 < (0 | f[10824]) >>> 0)) {
             e = z, g = H, i = I, k = x, m = 1, c = v;
             break b;
            }
            for (e = 0; 3 != (0 | e); ) da = +cb(0 | f[N >> 2]), p[Z + (24 * c | 0) + (e << 3) >> 3] = da, e = e + 1 | 0;
            c = c + 1 | 0;
           }

          case 50724:
          case 50723:
           for (g = 0, c = 0 | f[10824]; ;) {
            if (!(g >>> 0 < c >>> 0)) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            for (e = 0; !(e >>> 0 >= c >>> 0); ) da = +cb(0 | f[N >> 2]), p[ba + (g << 5) + (e << 3) >> 3] = da, e = e + 1 | 0, c = 0 | f[10824];
            g = g + 1 | 0;
           }

          case 50727:
           for (c = 0; ;) {
            if (c >>> 0 >= (0 | f[10824]) >>> 0) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            da = +cb(0 | f[N >> 2]), p[Y + (c << 3) >> 3] = da, c = c + 1 | 0;
           }

          case 50728:
           for (c = 0; ;) {
            if (c >>> 0 >= (0 | f[10824]) >>> 0) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            da = +cb(0 | f[N >> 2]), p[aa + (c << 3) >> 3] = da, c = c + 1 | 0;
           }

          case 50729:
           for (l = +cb(0 | f[N >> 2]), p[$ >> 3] = l, da = +cb(0 | f[N >> 2]), p[F >> 3] = da, p[G >> 3] = 1 - l - da, c = 0; ;) {
            if (3 == (0 | c)) {
             e = z, g = H, i = I, k = x, c = v;
             break b;
            }
            p[(t = $ + (c << 3) | 0) >> 3] = +p[t >> 3] / +n[164 + (c << 2) >> 2], c = c + 1 | 0;
           }

          case 50740:
           if (0 | f[10845]) {
            e = z, g = H, i = I, k = x, c = v;
            break b;
           }
           Zc(e = (0 | $a()) + a | 0), tf(0 | f[10815], e, 0), Qc(a), e = z, g = H, i = I, k = x, c = v;
           break b;

          case 50752:
           db(336722, 3), e = z, g = H, i = I, k = x, c = v;
           break b;

          case 50829:
           e = 65535 & (0 | ab(0 | f[N >> 2])), d[102816] = e, e = 65535 & (0 | ab(0 | f[N >> 2])), d[102817] = e, e = 0 | ab(0 | f[N >> 2]), d[168355] = e - (0 | j[102816]), e = 0 | ab(0 | f[N >> 2]), d[168356] = e - (0 | j[102817]), e = z, g = H, i = I, k = x, c = v;
           break b;

          case 50830:
           for (c = 0; (0 | c) < 32 ? c >>> 0 < (0 | f[O >> 2]) >>> 0 : 0; ) t = 0 | ab(0 | f[N >> 2]), f[73136 + (c << 2) >> 2] = t, c = c + 1 | 0;
           f[10838] = 0, e = z, g = H, i = I, k = x, c = v;
           break b;

          default:
           e = z, g = H, i = I, k = x, c = v;
           break b;
          }
         } while (0);
         if (130 == (0 | w)) {
          w = 0, Pf(0 | f[10815]), f[18489] = f[O >> 2], e = z, g = H, i = I, k = x, c = v;
          break;
         }
         for (0 | X(65535 & c, 65535 & e) ? g = 0 : (d[168371] = 1, d[168370] = 1, g = 0, c = 1, e = 1); !((0 | g) >= (0 | X(65535 & c, 65535 & e))); ) c = 65535 & ~~+cb(0 | f[N >> 2]), d[336732 + (g + 6 << 1) >> 1] = c, g = g + 1 | 0, c = 0 | d[168370], e = 0 | d[168371];
         f[10838] = 0, e = z, g = H, i = I, k = x, c = v;
        }
       } while (0);
       h: do {
        if (33 == (0 | w)) w = 0, e = 0 | ab(0 | f[N >> 2]), f[r >> 2] = e, e = z, g = H, i = I, k = x, c = v; else if (34 == (0 | w)) w = 0, e = 0 | ab(0 | f[N >> 2]), f[s >> 2] = e, e = z, g = H, i = I, k = x, c = v; else if (35 == (0 | w)) w = 0, f[k >> 2] = 7 & f[O >> 2], c = 0 | ab(0 | f[N >> 2]), f[q >> 2] = c, (0 | f[10958]) >>> 0 < c >>> 0 ? (f[10958] = c, e = z, g = H, i = I, k = x, c = v) : (e = z, g = H, i = I, k = x, c = v); else if (46 == (0 | w)) w = 0, c = (0 | $a()) + a | 0, f[t >> 2] = c, (0 | c) > 0 & 0 == (0 | f[q >> 2]) ? (tf(0 | f[10815], c, 0), 0 | rb(M, 1) ? (f[i >> 2] = 6, c = 0 | f[A >> 2], f[r >> 2] = c, i = 0 | f[B >> 2], f[s >> 2] = i, f[q >> 2] = f[C >> 2], g = 0 | f[D >> 2], f[k >> 2] = g, e = 0 | X(g, c), f[E >> 2] | 1 & g || (f[r >> 2] = e, c = e), (0 | c) > (i << 2 | 0) & ~g | 0 && (f[r >> 2] = (0 | c) / 2 | 0, f[s >> 2] = i << 1), e = 0 | d[102818], Yc(12 + (0 | f[t >> 2]) | 0), d[102818] = e, e = z, g = H, i = I, k = x, c = v) : (e = z, g = H, i = I, k = x, c = v)) : (e = z, g = H, i = I, k = x, c = v); else if (55 == (0 | w)) w = 0, e = 0 | $a(), f[73340 + (48 * o | 0) + 32 >> 2] = e, e = z, g = H, i = I, k = x, c = v; else if (104 == (0 | w)) {
         for (Of(R, 1, c = (c = 0 | f[O >> 2]) >>> 0 < 16 ? c : 16, 0 | f[10815]), f[10824] = 0, e = 0, g = 0, i = 0; i >>> 0 < 4 & g >>> 0 < c >>> 0; ) w = (0 == ((v = 1 << h[R + g >> 0]) & e | 0) & 1) + i | 0, f[10824] = w, e |= v, g = g + 1 | 0, i = w;
         switch (0 | e) {
         case 56:
          b[S >> 0] = 0 | b[30205], b[S + 1 >> 0] = 0 | b[30206], b[S + 2 >> 0] = 0 | b[30207], g = i, w = 184;
          break h;

         case 58:
          f[S >> 2] = 17040133, g = i, w = 184;
          break h;

         default:
          g = i, w = 184;
          break h;
         }
        } else 110 == (0 | w) ? (w = 0, tf(e = 0 | f[10815], (0 | $a()) + a | 0, 0), Xc(a), e = z, g = H, i = I, k = x, c = v) : 193 == (0 | w) && (w = 0, Wc(0 | f[O >> 2]), e = z, g = H, i = I, k = x, c = v);
       } while (0);
       if (184 == (0 | w)) {
        for (w = 0, e = 0; (0 | e) != (0 | g); ) b[T + (0 | h[S + e >> 0]) >> 0] = e, e = e + 1 | 0;
        for (b[362e3 + g >> 0] = 0, e = 16, i = 0 | f[10812]; g = e + -1 | 0, e; ) v = h[T + (0 | h[R + ((g >>> 0) % (c >>> 0) | 0) >> 0]) >> 0] | i << 2, f[10812] = v, e = g, i = v;
        f[10812] = i - (0 == (0 | i) & 1), e = z, g = H, i = I, k = x;
       }
       tf(0 | f[10815], 0 | f[P >> 2], 0), z = e, H = g, I = i, e = y, v = c, x = k;
      }
      for (0 | H && 0 | (g = 0 | Ad(H)) && (tf(0 | f[10815], I, 0), Of(g, H, 1, 0 | f[10815]), oc(g, H >>> 2, 1, z), c = 0 | f[10815], e = 0 | Uf(), f[10815] = e, 0 | e && (We(g, H, 1, e), tf(0 | f[10815], 0, 0), Qc(0 - I | 0), ef(0 | f[10815])), f[10815] = c, Bd(g)), o = 0 | f[10824], e = 0; (0 | e) != (0 | o); ) {
       for (g = Y + (e << 3) | 0, c = 0; (0 | c) != (0 | o); ) p[(W = ba + (e << 5) + (c << 3) | 0) >> 3] = +p[g >> 3] * +p[W >> 3], c = c + 1 | 0;
       e = e + 1 | 0;
      }
      if (m = 0 != (0 | m)) {
       for (e = 0; (0 | e) != (0 | o); ) {
        for (c = 0; 3 != (0 | c); ) {
         for (p[(i = _ + (24 * e | 0) + (c << 3) | 0) >> 3] = 0, k = $ + (c << 3) | 0, g = 0, l = 0; (0 | g) != (0 | o); ) da = l + +p[ba + (e << 5) + (g << 3) >> 3] * +p[Z + (24 * g | 0) + (c << 3) >> 3] * +p[k >> 3], p[i >> 3] = da, g = g + 1 | 0, l = da;
         c = c + 1 | 0;
        }
        e = e + 1 | 0;
       }
       Kc(73288, _);
      }
      i: do {
       if (0 != +p[aa >> 3]) for (n[10964] = 0, c = 0; ;) {
        if ((0 | c) == (0 | o)) break i;
        n[43844 + (c << 2) >> 2] = 1 / +p[aa + (c << 3) >> 3], c = c + 1 | 0;
       }
      } while (0);
      if (m) c = 0; else for (c = 0; ;) {
       if ((0 | c) == (0 | o)) {
        c = 0;
        break a;
       }
       n[(aa = 43264 + (c << 2) | 0) >> 2] = +n[aa >> 2] / +p[ba + (c << 5) + (c << 3) >> 3], c = c + 1 | 0;
      }
     }
    }
   } while (0);
   return u = ca, 0 | c;
  }
  function Ad(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0;
   C = u, u = u + 16 | 0, i = C;
   do {
    if (a >>> 0 < 245) {
     if (n = a >>> 0 < 11 ? 16 : a + 11 & -8, a = n >>> 3, r = 0 | f[51264], 3 & (b = r >>> a) | 0) {
      h = 0 | f[(g = 8 + (e = 0 | f[(d = 8 + (c = 205096 + ((b = (1 & b ^ 1) + a | 0) << 1 << 2) | 0) | 0) >> 2]) | 0) >> 2];
      do {
       if ((0 | c) == (0 | h)) f[51264] = r & ~(1 << b); else {
        if (h >>> 0 < (0 | f[51268]) >>> 0 && sa(), a = h + 12 | 0, (0 | f[a >> 2]) == (0 | e)) {
         f[a >> 2] = c, f[d >> 2] = h;
         break;
        }
        sa();
       }
      } while (0);
      return B = b << 3, f[e + 4 >> 2] = 3 | B, B = e + B + 4 | 0, f[B >> 2] = 1 | f[B >> 2], B = g, u = C, 0 | B;
     }
     if (q = 0 | f[51266], n >>> 0 > q >>> 0) {
      if (0 | b) {
       b = ((b = b << a & ((i = 2 << a) | 0 - i)) & 0 - b) - 1 | 0, d = 0 | f[(i = 8 + (g = 0 | f[(c = 8 + (b = 205096 + ((a = ((d = (b >>>= i = b >>> 12 & 16) >>> 5 & 8) | i | (g = (b >>>= d) >>> 2 & 4) | (c = (b >>>= g) >>> 1 & 2) | (a = (b >>>= c) >>> 1 & 1)) + (b >>> a) | 0) << 1 << 2) | 0) | 0) >> 2]) | 0) >> 2];
       do {
        if ((0 | b) == (0 | d)) j = r & ~(1 << a), f[51264] = j; else {
         if (d >>> 0 < (0 | f[51268]) >>> 0 && sa(), e = d + 12 | 0, (0 | f[e >> 2]) == (0 | g)) {
          f[e >> 2] = b, f[c >> 2] = d, j = r;
          break;
         }
         sa();
        }
       } while (0);
       return h = (a << 3) - n | 0, f[g + 4 >> 2] = 3 | n, d = g + n | 0, f[d + 4 >> 2] = 1 | h, f[d + h >> 2] = h, 0 | q && (e = 0 | f[51269], c = 205096 + ((a = q >>> 3) << 1 << 2) | 0, j & (a = 1 << a) ? (b = 0 | f[(a = c + 8 | 0) >> 2]) >>> 0 < (0 | f[51268]) >>> 0 ? sa() : (k = b, l = a) : (f[51264] = j | a, k = c, l = c + 8 | 0), f[l >> 2] = e, f[k + 12 >> 2] = e, f[e + 8 >> 2] = k, f[e + 12 >> 2] = c), f[51266] = h, f[51269] = d, B = i, u = C, 0 | B;
      }
      if (k = 0 | f[51265]) {
       if (b = (k & 0 - k) - 1 | 0, A = b >>> 12 & 16, b >>>= A, z = b >>> 5 & 8, b >>>= z, B = b >>> 2 & 4, b >>>= B, c = b >>> 1 & 2, b >>>= c, a = b >>> 1 & 1, a = 0 | f[205360 + ((z | A | B | c | a) + (b >>> a) << 2) >> 2], b = (-8 & f[a + 4 >> 2]) - n | 0, c = 0 | f[a + 16 + ((0 == (0 | f[a + 16 >> 2]) & 1) << 2) >> 2]) {
        do {
         b = (B = (A = (-8 & f[c + 4 >> 2]) - n | 0) >>> 0 < b >>> 0) ? A : b, a = B ? c : a, c = 0 | f[c + 16 + ((0 == (0 | f[c + 16 >> 2]) & 1) << 2) >> 2];
        } while (0 != (0 | c));
        j = a, h = b;
       } else j = a, h = b;
       j >>> 0 < (e = 0 | f[51268]) >>> 0 && sa(), j >>> 0 >= (i = j + n | 0) >>> 0 && sa(), g = 0 | f[j + 24 >> 2], c = 0 | f[j + 12 >> 2];
       do {
        if ((0 | c) == (0 | j)) {
         if (b = j + 20 | 0, !((a = 0 | f[b >> 2]) || (b = j + 16 | 0, a = 0 | f[b >> 2]))) {
          m = 0;
          break;
         }
         for (;;) if (c = a + 20 | 0, 0 | (d = 0 | f[c >> 2])) a = d, b = c; else {
          if (c = a + 16 | 0, !(d = 0 | f[c >> 2])) break;
          a = d, b = c;
         }
         if (!(b >>> 0 < e >>> 0)) {
          f[b >> 2] = 0, m = a;
          break;
         }
         sa();
        } else {
         if ((d = 0 | f[j + 8 >> 2]) >>> 0 < e >>> 0 && sa(), a = d + 12 | 0, (0 | f[a >> 2]) != (0 | j) && sa(), b = c + 8 | 0, (0 | f[b >> 2]) == (0 | j)) {
          f[a >> 2] = c, f[b >> 2] = d, m = c;
          break;
         }
         sa();
        }
       } while (0);
       a: do {
        if (0 | g) {
         b = 205360 + ((a = 0 | f[j + 28 >> 2]) << 2) | 0, c = 0 == (0 | m);
         do {
          if ((0 | j) == (0 | f[b >> 2])) {
           if (f[b >> 2] = m, c) {
            f[51265] = k & ~(1 << a);
            break a;
           }
          } else {
           if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
            if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | j) & 1) << 2) >> 2] = m, c) break a;
            break;
           }
           sa();
          }
         } while (0);
         m >>> 0 < (b = 0 | f[51268]) >>> 0 && sa(), f[m + 24 >> 2] = g, a = 0 | f[j + 16 >> 2];
         do {
          if (0 | a) {
           if (!(a >>> 0 < b >>> 0)) {
            f[m + 16 >> 2] = a, f[a + 24 >> 2] = m;
            break;
           }
           sa();
          }
         } while (0);
         if (0 | (a = 0 | f[j + 20 >> 2])) {
          if (!(a >>> 0 < (0 | f[51268]) >>> 0)) {
           f[m + 20 >> 2] = a, f[a + 24 >> 2] = m;
           break;
          }
          sa();
         }
        }
       } while (0);
       return h >>> 0 < 16 ? (B = h + n | 0, f[j + 4 >> 2] = 3 | B, f[(B = j + B + 4 | 0) >> 2] = 1 | f[B >> 2]) : (f[j + 4 >> 2] = 3 | n, f[i + 4 >> 2] = 1 | h, f[i + h >> 2] = h, 0 | q && (d = 0 | f[51269], c = 205096 + ((a = q >>> 3) << 1 << 2) | 0, (a = 1 << a) & r ? (b = 0 | f[(a = c + 8 | 0) >> 2]) >>> 0 < (0 | f[51268]) >>> 0 ? sa() : (o = b, p = a) : (f[51264] = a | r, o = c, p = c + 8 | 0), f[p >> 2] = d, f[o + 12 >> 2] = d, f[d + 8 >> 2] = o, f[d + 12 >> 2] = c), f[51266] = h, f[51269] = i), B = j + 8 | 0, u = C, 0 | B;
      }
     }
    } else if (a >>> 0 > 4294967231) n = -1; else if (a = a + 11 | 0, n = -8 & a, k = 0 | f[51265]) {
     c = 0 - n | 0, h = (a >>>= 8) ? n >>> 0 > 16777215 ? 31 : n >>> (7 + (h = 14 - ((o = (520192 + (v = a << (p = (a + 1048320 | 0) >>> 16 & 8)) | 0) >>> 16 & 4) | p | (h = (245760 + (v <<= o) | 0) >>> 16 & 2)) + (v << h >>> 15) | 0) | 0) & 1 | h << 1 : 0, b = 0 | f[205360 + (h << 2) >> 2];
     b: do {
      if (b) for (a = 0, g = n << (31 == (0 | h) ? 0 : 25 - (h >>> 1) | 0), e = 0; ;) {
       if ((d = (-8 & f[b + 4 >> 2]) - n | 0) >>> 0 < c >>> 0) {
        if (!d) {
         a = b, c = 0, d = b, v = 85;
         break b;
        }
        a = b, c = d;
       }
       if (d = 0 | f[b + 20 >> 2], b = 0 | f[b + 16 + (g >>> 31 << 2) >> 2], e = 0 == (0 | d) | (0 | d) == (0 | b) ? e : d, d = 0 == (0 | b)) {
        b = e, v = 81;
        break;
       }
       g <<= 1 & (1 ^ d);
      } else b = 0, a = 0, v = 81;
     } while (0);
     if (81 == (0 | v)) {
      if (0 == (0 | b) & 0 == (0 | a)) {
       if (a = 2 << h, !(a = (a | 0 - a) & k)) break;
       p = (a & 0 - a) - 1 | 0, a = 0, b = 0 | f[205360 + (((j = (p >>>= l = p >>> 12 & 16) >>> 5 & 8) | l | (m = (p >>>= j) >>> 2 & 4) | (o = (p >>>= m) >>> 1 & 2) | (b = (p >>>= o) >>> 1 & 1)) + (p >>> b) << 2) >> 2];
      }
      b ? (d = b, v = 85) : (j = a, h = c);
     }
     if (85 == (0 | v)) for (;;) {
      if (v = 0, b = (-8 & f[d + 4 >> 2]) - n | 0, p = b >>> 0 < c >>> 0, b = p ? b : c, a = p ? d : a, !(d = 0 | f[d + 16 + ((0 == (0 | f[d + 16 >> 2]) & 1) << 2) >> 2])) {
       j = a, h = b;
       break;
      }
      c = b, v = 85;
     }
     if (j && h >>> 0 < ((0 | f[51266]) - n | 0) >>> 0) {
      j >>> 0 < (e = 0 | f[51268]) >>> 0 && sa(), j >>> 0 >= (i = j + n | 0) >>> 0 && sa(), g = 0 | f[j + 24 >> 2], c = 0 | f[j + 12 >> 2];
      do {
       if ((0 | c) == (0 | j)) {
        if (b = j + 20 | 0, !((a = 0 | f[b >> 2]) || (b = j + 16 | 0, a = 0 | f[b >> 2]))) {
         q = 0;
         break;
        }
        for (;;) if (c = a + 20 | 0, 0 | (d = 0 | f[c >> 2])) a = d, b = c; else {
         if (c = a + 16 | 0, !(d = 0 | f[c >> 2])) break;
         a = d, b = c;
        }
        if (!(b >>> 0 < e >>> 0)) {
         f[b >> 2] = 0, q = a;
         break;
        }
        sa();
       } else {
        if ((d = 0 | f[j + 8 >> 2]) >>> 0 < e >>> 0 && sa(), a = d + 12 | 0, (0 | f[a >> 2]) != (0 | j) && sa(), b = c + 8 | 0, (0 | f[b >> 2]) == (0 | j)) {
         f[a >> 2] = c, f[b >> 2] = d, q = c;
         break;
        }
        sa();
       }
      } while (0);
      c: do {
       if (g) {
        b = 205360 + ((a = 0 | f[j + 28 >> 2]) << 2) | 0, c = 0 == (0 | q);
        do {
         if ((0 | j) == (0 | f[b >> 2])) {
          if (f[b >> 2] = q, c) {
           r = k & ~(1 << a), f[51265] = r;
           break c;
          }
         } else {
          if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
           if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | j) & 1) << 2) >> 2] = q, c) {
            r = k;
            break c;
           }
           break;
          }
          sa();
         }
        } while (0);
        q >>> 0 < (b = 0 | f[51268]) >>> 0 && sa(), f[q + 24 >> 2] = g, a = 0 | f[j + 16 >> 2];
        do {
         if (0 | a) {
          if (!(a >>> 0 < b >>> 0)) {
           f[q + 16 >> 2] = a, f[a + 24 >> 2] = q;
           break;
          }
          sa();
         }
        } while (0);
        if (a = 0 | f[j + 20 >> 2]) {
         if (!(a >>> 0 < (0 | f[51268]) >>> 0)) {
          f[q + 20 >> 2] = a, f[a + 24 >> 2] = q, r = k;
          break;
         }
         sa();
        } else r = k;
       } else r = k;
      } while (0);
      do {
       if (h >>> 0 < 16) B = h + n | 0, f[j + 4 >> 2] = 3 | B, f[(B = j + B + 4 | 0) >> 2] = 1 | f[B >> 2]; else {
        if (f[j + 4 >> 2] = 3 | n, f[i + 4 >> 2] = 1 | h, f[i + h >> 2] = h, a = h >>> 3, h >>> 0 < 256) {
         c = 205096 + (a << 1 << 2) | 0, (b = 0 | f[51264]) & (a = 1 << a) ? (b = 0 | f[(a = c + 8 | 0) >> 2]) >>> 0 < (0 | f[51268]) >>> 0 ? sa() : (s = b, t = a) : (f[51264] = b | a, s = c, t = c + 8 | 0), f[t >> 2] = i, f[s + 12 >> 2] = i, f[i + 8 >> 2] = s, f[i + 12 >> 2] = c;
         break;
        }
        if (a = h >>> 8, a = a ? h >>> 0 > 16777215 ? 31 : h >>> (7 + (a = 14 - ((z = (520192 + (B = a << (A = (a + 1048320 | 0) >>> 16 & 8)) | 0) >>> 16 & 4) | A | (a = (245760 + (B <<= z) | 0) >>> 16 & 2)) + (B << a >>> 15) | 0) | 0) & 1 | a << 1 : 0, c = 205360 + (a << 2) | 0, f[i + 28 >> 2] = a, b = i + 16 | 0, f[b + 4 >> 2] = 0, f[b >> 2] = 0, !((b = 1 << a) & r)) {
         f[51265] = b | r, f[c >> 2] = i, f[i + 24 >> 2] = c, f[i + 12 >> 2] = i, f[i + 8 >> 2] = i;
         break;
        }
        for (b = h << (31 == (0 | a) ? 0 : 25 - (a >>> 1) | 0), d = 0 | f[c >> 2]; ;) {
         if ((-8 & f[d + 4 >> 2] | 0) == (0 | h)) {
          v = 139;
          break;
         }
         if (c = d + 16 + (b >>> 31 << 2) | 0, !(a = 0 | f[c >> 2])) {
          v = 136;
          break;
         }
         b <<= 1, d = a;
        }
        if (136 == (0 | v)) {
         if (!(c >>> 0 < (0 | f[51268]) >>> 0)) {
          f[c >> 2] = i, f[i + 24 >> 2] = d, f[i + 12 >> 2] = i, f[i + 8 >> 2] = i;
          break;
         }
         sa();
        } else if (139 == (0 | v)) {
         if (a = d + 8 | 0, b = 0 | f[a >> 2], B = 0 | f[51268], b >>> 0 >= B >>> 0 & d >>> 0 >= B >>> 0) {
          f[b + 12 >> 2] = i, f[a >> 2] = i, f[i + 8 >> 2] = b, f[i + 12 >> 2] = d, f[i + 24 >> 2] = 0;
          break;
         }
         sa();
        }
       }
      } while (0);
      return B = j + 8 | 0, u = C, 0 | B;
     }
    }
   } while (0);
   if ((c = 0 | f[51266]) >>> 0 >= n >>> 0) return a = c - n | 0, b = 0 | f[51269], a >>> 0 > 15 ? (B = b + n | 0, f[51269] = B, f[51266] = a, f[B + 4 >> 2] = 1 | a, f[B + a >> 2] = a, f[b + 4 >> 2] = 3 | n) : (f[51266] = 0, f[51269] = 0, f[b + 4 >> 2] = 3 | c, f[(B = b + c + 4 | 0) >> 2] = 1 | f[B >> 2]), B = b + 8 | 0, u = C, 0 | B;
   if ((h = 0 | f[51267]) >>> 0 > n >>> 0) return z = h - n | 0, f[51267] = z, B = 0 | f[51270], A = B + n | 0, f[51270] = A, f[A + 4 >> 2] = 1 | z, f[B + 4 >> 2] = 3 | n, B = B + 8 | 0, u = C, 0 | B;
   if (0 | f[51382] ? a = 0 | f[51384] : (f[51384] = 4096, f[51383] = 4096, f[51385] = -1, f[51386] = -1, f[51387] = 0, f[51375] = 0, a = -16 & i ^ 1431655768, f[i >> 2] = a, f[51382] = a, a = 4096), i = n + 48 | 0, j = n + 47 | 0, g = a + j | 0, d = 0 - a | 0, (k = g & d) >>> 0 <= n >>> 0) return B = 0, u = C, 0 | B;
   if (0 | (a = 0 | f[51374]) && (s = 0 | f[51372], (t = s + k | 0) >>> 0 <= s >>> 0 | t >>> 0 > a >>> 0)) return B = 0, u = C, 0 | B;
   d: do {
    if (4 & f[51375]) a = 0, v = 178; else {
     b = 0 | f[51270];
     e: do {
      if (b) {
       for (c = 205504; !((a = 0 | f[c >> 2]) >>> 0 <= b >>> 0 && (e = c + 4 | 0, (a + (0 | f[e >> 2]) | 0) >>> 0 > b >>> 0)); ) {
        if (!(a = 0 | f[c + 8 >> 2])) {
         v = 163;
         break e;
        }
        c = a;
       }
       if ((a = g - h & d) >>> 0 < 2147483647) if ((0 | (b = 0 | mg(0 | a))) == ((0 | f[c >> 2]) + (0 | f[e >> 2]) | 0)) {
        if (-1 != (0 | b)) {
         h = a, g = b, v = 180;
         break d;
        }
       } else d = b, v = 171; else a = 0;
      } else v = 163;
     } while (0);
     do {
      if (163 == (0 | v)) if (-1 == (0 | (e = 0 | mg(0)))) a = 0; else if (a = e, b = 0 | f[51383], c = b + -1 | 0, a = (0 == (c & a | 0) ? 0 : (c + a & 0 - b) - a | 0) + k | 0, b = 0 | f[51372], c = a + b | 0, a >>> 0 > n >>> 0 & a >>> 0 < 2147483647) {
       if (0 | (d = 0 | f[51374]) && c >>> 0 <= b >>> 0 | c >>> 0 > d >>> 0) {
        a = 0;
        break;
       }
       if ((0 | (b = 0 | mg(0 | a))) == (0 | e)) {
        h = a, g = e, v = 180;
        break d;
       }
       d = b, v = 171;
      } else a = 0;
     } while (0);
     do {
      if (171 == (0 | v)) {
       if (c = 0 - a | 0, !(i >>> 0 > a >>> 0 & a >>> 0 < 2147483647 & -1 != (0 | d))) {
        if (-1 == (0 | d)) {
         a = 0;
         break;
        }
        h = a, g = d, v = 180;
        break d;
       }
       if (b = 0 | f[51384], (b = j - a + b & 0 - b) >>> 0 >= 2147483647) {
        h = a, g = d, v = 180;
        break d;
       }
       if (-1 == (0 | mg(0 | b))) {
        mg(0 | c), a = 0;
        break;
       }
       h = b + a | 0, g = d, v = 180;
       break d;
      }
     } while (0);
     f[51375] = 4 | f[51375], v = 178;
    }
   } while (0);
   if (178 == (0 | v) && k >>> 0 < 2147483647 && (-1 == (0 | (d = 0 | mg(0 | k))) | 1 ^ (c = (b = (t = 0 | mg(0)) - d | 0) >>> 0 > (n + 40 | 0) >>> 0) | d >>> 0 < t >>> 0 & -1 != (0 | d) & -1 != (0 | t) ^ 1 || (h = c ? b : a, g = d, v = 180)), 180 == (0 | v)) {
    a = (0 | f[51372]) + h | 0, f[51372] = a, a >>> 0 > (0 | f[51373]) >>> 0 && (f[51373] = a), k = 0 | f[51270];
    do {
     if (k) {
      a = 205504;
      do {
       if (b = 0 | f[a >> 2], c = a + 4 | 0, d = 0 | f[c >> 2], (0 | g) == (b + d | 0)) {
        v = 190;
        break;
       }
       a = 0 | f[a + 8 >> 2];
      } while (0 != (0 | a));
      if (190 == (0 | v) && !(8 & f[a + 12 >> 2]) && k >>> 0 < g >>> 0 & k >>> 0 >= b >>> 0) {
       f[c >> 2] = d + h, A = k + (B = 0 == (7 & (B = k + 8 | 0) | 0) ? 0 : 0 - B & 7) | 0, B = h - B + (0 | f[51267]) | 0, f[51270] = A, f[51267] = B, f[A + 4 >> 2] = 1 | B, f[A + B + 4 >> 2] = 40, f[51271] = f[51386];
       break;
      }
      g >>> 0 < (a = 0 | f[51268]) >>> 0 ? (f[51268] = g, i = g) : i = a, b = g + h | 0, a = 205504;
      do {
       if ((0 | f[a >> 2]) == (0 | b)) {
        v = 198;
        break;
       }
       a = 0 | f[a + 8 >> 2];
      } while (0 != (0 | a));
      if (198 == (0 | v) && !(8 & f[a + 12 >> 2])) {
       f[a >> 2] = g, f[(m = a + 4 | 0) >> 2] = (0 | f[m >> 2]) + h, l = (m = g + (0 == (7 & (m = g + 8 | 0) | 0) ? 0 : 0 - m & 7) | 0) + n | 0, j = (a = b + (0 == (7 & (a = b + 8 | 0) | 0) ? 0 : 0 - a & 7) | 0) - m - n | 0, f[m + 4 >> 2] = 3 | n;
       do {
        if ((0 | a) == (0 | k)) B = (0 | f[51267]) + j | 0, f[51267] = B, f[51270] = l, f[l + 4 >> 2] = 1 | B; else {
         if ((0 | a) == (0 | f[51269])) {
          B = (0 | f[51266]) + j | 0, f[51266] = B, f[51269] = l, f[l + 4 >> 2] = 1 | B, f[l + B >> 2] = B;
          break;
         }
         if (1 == (3 & (b = 0 | f[a + 4 >> 2]) | 0)) {
          h = -8 & b, e = b >>> 3;
          f: do {
           if (b >>> 0 < 256) {
            c = 0 | f[a + 8 >> 2], d = 0 | f[a + 12 >> 2], b = 205096 + (e << 1 << 2) | 0;
            do {
             if ((0 | c) != (0 | b)) {
              if (c >>> 0 < i >>> 0 && sa(), (0 | f[c + 12 >> 2]) == (0 | a)) break;
              sa();
             }
            } while (0);
            if ((0 | d) == (0 | c)) {
             f[51264] = f[51264] & ~(1 << e);
             break;
            }
            do {
             if ((0 | d) == (0 | b)) w = d + 8 | 0; else {
              if (d >>> 0 < i >>> 0 && sa(), b = d + 8 | 0, (0 | f[b >> 2]) == (0 | a)) {
               w = b;
               break;
              }
              sa();
             }
            } while (0);
            f[c + 12 >> 2] = d, f[w >> 2] = c;
           } else {
            g = 0 | f[a + 24 >> 2], d = 0 | f[a + 12 >> 2];
            do {
             if ((0 | d) == (0 | a)) {
              if (d = a + 16 | 0, c = d + 4 | 0, !(b = 0 | f[c >> 2])) {
               if (!(b = 0 | f[d >> 2])) {
                z = 0;
                break;
               }
               c = d;
              }
              for (;;) if (d = b + 20 | 0, 0 | (e = 0 | f[d >> 2])) b = e, c = d; else {
               if (d = b + 16 | 0, !(e = 0 | f[d >> 2])) break;
               b = e, c = d;
              }
              if (!(c >>> 0 < i >>> 0)) {
               f[c >> 2] = 0, z = b;
               break;
              }
              sa();
             } else {
              if ((e = 0 | f[a + 8 >> 2]) >>> 0 < i >>> 0 && sa(), b = e + 12 | 0, (0 | f[b >> 2]) != (0 | a) && sa(), c = d + 8 | 0, (0 | f[c >> 2]) == (0 | a)) {
               f[b >> 2] = d, f[c >> 2] = e, z = d;
               break;
              }
              sa();
             }
            } while (0);
            if (!g) break;
            c = 205360 + ((b = 0 | f[a + 28 >> 2]) << 2) | 0, d = 0 == (0 | z);
            do {
             if ((0 | a) == (0 | f[c >> 2])) {
              if (f[c >> 2] = z, !d) break;
              f[51265] = f[51265] & ~(1 << b);
              break f;
             }
             if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
              if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | a) & 1) << 2) >> 2] = z, d) break f;
              break;
             }
             sa();
            } while (0);
            z >>> 0 < (d = 0 | f[51268]) >>> 0 && sa(), f[z + 24 >> 2] = g, c = 0 | f[(b = a + 16 | 0) >> 2];
            do {
             if (0 | c) {
              if (!(c >>> 0 < d >>> 0)) {
               f[z + 16 >> 2] = c, f[c + 24 >> 2] = z;
               break;
              }
              sa();
             }
            } while (0);
            if (!(b = 0 | f[b + 4 >> 2])) break;
            if (!(b >>> 0 < (0 | f[51268]) >>> 0)) {
             f[z + 20 >> 2] = b, f[b + 24 >> 2] = z;
             break;
            }
            sa();
           }
          } while (0);
          a = a + h | 0, e = h + j | 0;
         } else e = j;
         if (a = a + 4 | 0, f[a >> 2] = -2 & f[a >> 2], f[l + 4 >> 2] = 1 | e, f[l + e >> 2] = e, a = e >>> 3, e >>> 0 < 256) {
          c = 205096 + (a << 1 << 2) | 0, b = 0 | f[51264], a = 1 << a;
          do {
           if (b & a) {
            if (a = c + 8 | 0, (b = 0 | f[a >> 2]) >>> 0 >= (0 | f[51268]) >>> 0) {
             A = b, B = a;
             break;
            }
            sa();
           } else f[51264] = b | a, A = c, B = c + 8 | 0;
          } while (0);
          f[B >> 2] = l, f[A + 12 >> 2] = l, f[l + 8 >> 2] = A, f[l + 12 >> 2] = c;
          break;
         }
         a = e >>> 8;
         do {
          if (a) {
           if (e >>> 0 > 16777215) {
            a = 31;
            break;
           }
           a = e >>> (7 + (a = 14 - ((z = (520192 + (B = a << (A = (a + 1048320 | 0) >>> 16 & 8)) | 0) >>> 16 & 4) | A | (a = (245760 + (B <<= z) | 0) >>> 16 & 2)) + (B << a >>> 15) | 0) | 0) & 1 | a << 1;
          } else a = 0;
         } while (0);
         if (d = 205360 + (a << 2) | 0, f[l + 28 >> 2] = a, b = l + 16 | 0, f[b + 4 >> 2] = 0, f[b >> 2] = 0, b = 0 | f[51265], c = 1 << a, !(b & c)) {
          f[51265] = b | c, f[d >> 2] = l, f[l + 24 >> 2] = d, f[l + 12 >> 2] = l, f[l + 8 >> 2] = l;
          break;
         }
         for (b = e << (31 == (0 | a) ? 0 : 25 - (a >>> 1) | 0), d = 0 | f[d >> 2]; ;) {
          if ((-8 & f[d + 4 >> 2] | 0) == (0 | e)) {
           v = 265;
           break;
          }
          if (c = d + 16 + (b >>> 31 << 2) | 0, !(a = 0 | f[c >> 2])) {
           v = 262;
           break;
          }
          b <<= 1, d = a;
         }
         if (262 == (0 | v)) {
          if (!(c >>> 0 < (0 | f[51268]) >>> 0)) {
           f[c >> 2] = l, f[l + 24 >> 2] = d, f[l + 12 >> 2] = l, f[l + 8 >> 2] = l;
           break;
          }
          sa();
         } else if (265 == (0 | v)) {
          if (a = d + 8 | 0, b = 0 | f[a >> 2], B = 0 | f[51268], b >>> 0 >= B >>> 0 & d >>> 0 >= B >>> 0) {
           f[b + 12 >> 2] = l, f[a >> 2] = l, f[l + 8 >> 2] = b, f[l + 12 >> 2] = d, f[l + 24 >> 2] = 0;
           break;
          }
          sa();
         }
        }
       } while (0);
       return B = m + 8 | 0, u = C, 0 | B;
      }
      for (b = 205504; !((a = 0 | f[b >> 2]) >>> 0 <= k >>> 0 && (c = a + (0 | f[b + 4 >> 2]) | 0) >>> 0 > k >>> 0); ) b = 0 | f[b + 8 >> 2];
      a = (b = (b = (e = c + -47 | 0) + (0 == (7 & (b = e + 8 | 0) | 0) ? 0 : 0 - b & 7) | 0) >>> 0 < (e = k + 16 | 0) >>> 0 ? k : b) + 8 | 0, B = g + (d = 0 == (7 & (d = g + 8 | 0) | 0) ? 0 : 0 - d & 7) | 0, d = h + -40 - d | 0, f[51270] = B, f[51267] = d, f[B + 4 >> 2] = 1 | d, f[B + d + 4 >> 2] = 40, f[51271] = f[51386], f[(d = b + 4 | 0) >> 2] = 27, f[a >> 2] = f[51376], f[a + 4 >> 2] = f[51377], f[a + 8 >> 2] = f[51378], f[a + 12 >> 2] = f[51379], f[51376] = g, f[51377] = h, f[51379] = 0, f[51378] = a, a = b + 24 | 0;
      do {
       B = a, f[(a = a + 4 | 0) >> 2] = 7;
      } while ((B + 8 | 0) >>> 0 < c >>> 0);
      if ((0 | b) != (0 | k)) {
       if (g = b - k | 0, f[d >> 2] = -2 & f[d >> 2], f[k + 4 >> 2] = 1 | g, f[b >> 2] = g, a = g >>> 3, g >>> 0 < 256) {
        c = 205096 + (a << 1 << 2) | 0, (b = 0 | f[51264]) & (a = 1 << a) ? (b = 0 | f[(a = c + 8 | 0) >> 2]) >>> 0 < (0 | f[51268]) >>> 0 ? sa() : (x = b, y = a) : (f[51264] = b | a, x = c, y = c + 8 | 0), f[y >> 2] = k, f[x + 12 >> 2] = k, f[k + 8 >> 2] = x, f[k + 12 >> 2] = c;
        break;
       }
       if (a = g >>> 8, c = a ? g >>> 0 > 16777215 ? 31 : g >>> (7 + (c = 14 - ((z = (520192 + (B = a << (A = (a + 1048320 | 0) >>> 16 & 8)) | 0) >>> 16 & 4) | A | (c = (245760 + (B <<= z) | 0) >>> 16 & 2)) + (B << c >>> 15) | 0) | 0) & 1 | c << 1 : 0, d = 205360 + (c << 2) | 0, f[k + 28 >> 2] = c, f[k + 20 >> 2] = 0, f[e >> 2] = 0, a = 0 | f[51265], b = 1 << c, !(a & b)) {
        f[51265] = a | b, f[d >> 2] = k, f[k + 24 >> 2] = d, f[k + 12 >> 2] = k, f[k + 8 >> 2] = k;
        break;
       }
       for (b = g << (31 == (0 | c) ? 0 : 25 - (c >>> 1) | 0), d = 0 | f[d >> 2]; ;) {
        if ((-8 & f[d + 4 >> 2] | 0) == (0 | g)) {
         v = 292;
         break;
        }
        if (c = d + 16 + (b >>> 31 << 2) | 0, !(a = 0 | f[c >> 2])) {
         v = 289;
         break;
        }
        b <<= 1, d = a;
       }
       if (289 == (0 | v)) {
        if (!(c >>> 0 < (0 | f[51268]) >>> 0)) {
         f[c >> 2] = k, f[k + 24 >> 2] = d, f[k + 12 >> 2] = k, f[k + 8 >> 2] = k;
         break;
        }
        sa();
       } else if (292 == (0 | v)) {
        if (a = d + 8 | 0, b = 0 | f[a >> 2], B = 0 | f[51268], b >>> 0 >= B >>> 0 & d >>> 0 >= B >>> 0) {
         f[b + 12 >> 2] = k, f[a >> 2] = k, f[k + 8 >> 2] = b, f[k + 12 >> 2] = d, f[k + 24 >> 2] = 0;
         break;
        }
        sa();
       }
      }
     } else {
      0 == (0 | (B = 0 | f[51268])) | g >>> 0 < B >>> 0 && (f[51268] = g), f[51376] = g, f[51377] = h, f[51379] = 0, f[51273] = f[51382], f[51272] = -1, a = 0;
      do {
       f[12 + (B = 205096 + (a << 1 << 2) | 0) >> 2] = B, f[B + 8 >> 2] = B, a = a + 1 | 0;
      } while (32 != (0 | a));
      A = g + (B = 0 == (7 & (B = g + 8 | 0) | 0) ? 0 : 0 - B & 7) | 0, B = h + -40 - B | 0, f[51270] = A, f[51267] = B, f[A + 4 >> 2] = 1 | B, f[A + B + 4 >> 2] = 40, f[51271] = f[51386];
     }
    } while (0);
    if ((a = 0 | f[51267]) >>> 0 > n >>> 0) return z = a - n | 0, f[51267] = z, B = 0 | f[51270], A = B + n | 0, f[51270] = A, f[A + 4 >> 2] = 1 | z, f[B + 4 >> 2] = 3 | n, B = B + 8 | 0, u = C, 0 | B;
   }
   return f[5745] = 12, B = 0, u = C, 0 | B;
  }
  function of(a, c, d) {
   a |= 0, d |= 0;
   var e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0;
   O = u, u = u + 288 | 0, J = O + 8 | 0, K = O + 17 | 0, L = O, M = O + 16 | 0, e = 0 | b[(c |= 0) >> 0];
   a: do {
    if (e << 24 >> 24) {
     z = a + 4 | 0, A = a + 100 | 0, B = a + 108 | 0, C = a + 8 | 0, D = K + 10 | 0, E = K + 33 | 0, y = J + 4 | 0, F = K + 46 | 0, G = K + 94 | 0, H = K + 1 | 0, j = c, t = 0, c = 0, i = 0, g = 0;
     b: for (;;) {
      c: do {
       if (0 | Ud(255 & e)) {
        for (;e = j + 1 | 0, 0 | Ud(0 | h[e >> 0]); ) j = e;
        Rd(a, 0);
        do {
         (e = 0 | f[z >> 2]) >>> 0 < (0 | f[A >> 2]) >>> 0 ? (f[z >> 2] = e + 1, e = 0 | h[e >> 0]) : e = 0 | Td(a);
        } while (0 != (0 | Ud(e)));
        0 | f[A >> 2] ? (e = (0 | f[z >> 2]) - 1 | 0, f[z >> 2] = e) : e = 0 | f[z >> 2], k = e + t + (0 | f[B >> 2]) - (0 | f[C >> 2]) | 0;
       } else {
        e = e << 24 >> 24 == 37;
        d: do {
         if (e) {
          k = 0 | b[(m = j + 1 | 0) >> 0];
          e: do {
           switch (k << 24 >> 24) {
           case 37:
            break d;

           case 42:
            x = 0, j = j + 2 | 0;
            break;

           default:
            if ((e = (255 & k) - 48 | 0) >>> 0 < 10 && 36 == (0 | b[j + 2 >> 0])) {
             x = 0 | pf(d, e), j = j + 3 | 0;
             break e;
            }
            x = 0 | f[(j = 3 + (0 | f[d >> 2]) & -4) >> 2], f[d >> 2] = j + 4, j = m;
           }
          } while (0);
          if (e = 0 | b[j >> 0], ((k = 255 & e) - 48 | 0) >>> 0 < 10) {
           m = 0;
           do {
            m = k + -48 + (10 * m | 0) | 0, k = 255 & (e = 0 | b[(j = j + 1 | 0) >> 0]);
           } while ((k + -48 | 0) >>> 0 < 10);
          } else m = 0;
          switch (e = e << 24 >> 24 == 109, w = 0 != (0 | x), i = e ? 0 : i, g = e ? 0 : g, j = e ? j + 1 | 0 : j, e &= w, k = j + 1 | 0, 0 | b[j >> 0]) {
          case 104:
           o = (v = 104 == (0 | b[k >> 0])) ? -2 : -1, j = v ? j + 2 | 0 : k;
           break;

          case 108:
           o = (v = 108 == (0 | b[k >> 0])) ? 3 : 1, j = v ? j + 2 | 0 : k;
           break;

          case 106:
           o = 3, j = k;
           break;

          case 116:
          case 122:
           o = 1, j = k;
           break;

          case 76:
           o = 2, j = k;
           break;

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
           o = 0;
           break;

          default:
           N = 133;
           break b;
          }
          switch (r = 0 | h[j >> 0], s = 3 == (47 & r | 0), r = s ? 32 | r : r, s = s ? 1 : o, (q = 255 & r) << 24 >> 24) {
          case 99:
           m = (0 | m) > 1 ? m : 1;
           break;

          case 91:
           break;

          case 110:
           qf(x, s, t, ((0 | t) < 0) << 31 >> 31), k = t;
           break c;

          default:
           Rd(a, 0);
           do {
            (k = 0 | f[z >> 2]) >>> 0 < (0 | f[A >> 2]) >>> 0 ? (f[z >> 2] = k + 1, k = 0 | h[k >> 0]) : k = 0 | Td(a);
           } while (0 != (0 | Ud(k)));
           0 | f[A >> 2] ? (k = (0 | f[z >> 2]) - 1 | 0, f[z >> 2] = k) : k = 0 | f[z >> 2], t = k + t + (0 | f[B >> 2]) - (0 | f[C >> 2]) | 0;
          }
          if (Rd(a, m), k = 0 | f[z >> 2], o = 0 | f[A >> 2], k >>> 0 < o >>> 0) f[z >> 2] = k + 1; else {
           if ((0 | Td(a)) < 0) {
            N = 133;
            break b;
           }
           o = 0 | f[A >> 2];
          }
          0 | o && (f[z >> 2] = (0 | f[z >> 2]) - 1);
          f: do {
           switch (q << 24 >> 24) {
           case 91:
           case 99:
           case 115:
            v = 99 == (0 | r);
            g: do {
             if (115 == (16 | r)) cg(0 | H, -1, 256), b[K >> 0] = 0, 115 == (0 | r) && (b[E >> 0] = 0, b[D >> 0] = 0, b[D + 1 >> 0] = 0, b[D + 2 >> 0] = 0, b[D + 3 >> 0] = 0, b[D + 4 >> 0] = 0); else {
              switch (q = j + 1 | 0, r = 94 == (0 | b[q >> 0]), j = r ? j + 2 | 0 : q, cg(0 | H, 1 & r | 0, 256), b[K >> 0] = 0, r = 1 & (1 ^ r), 0 | b[j >> 0]) {
              case 45:
               k = F, N = 61;
               break;

              case 93:
               k = G, N = 61;
              }
              for (61 == (0 | N) && (N = 0, b[k >> 0] = r, j = j + 1 | 0); ;) {
               k = 0 | b[j >> 0];
               h: do {
                switch (k << 24 >> 24) {
                case 0:
                 N = 133;
                 break b;

                case 93:
                 break g;

                case 45:
                 switch (q = j + 1 | 0, (k = 0 | b[q >> 0]) << 24 >> 24) {
                 case 93:
                 case 0:
                  k = 45;
                  break h;
                 }
                 if ((255 & (j = 0 | b[j + -1 >> 0])) < (255 & k)) {
                  j &= 255;
                  do {
                   b[K + (j = j + 1 | 0) >> 0] = r, k = 0 | b[q >> 0];
                  } while ((0 | j) < (255 & k | 0));
                  j = q;
                 } else j = q;
                }
               } while (0);
               b[K + (1 + (255 & k)) >> 0] = r, j = j + 1 | 0;
              }
             }
            } while (0);
            k = v ? m + 1 | 0 : 31, r = 1 == (0 | s);
            i: do {
             if (r) {
              if (e) {
               if (!(g = 0 | Ad(k << 2))) {
                i = 0, g = 0, e = 1, N = 133;
                break b;
               }
              } else g = x;
              f[J >> 2] = 0, f[y >> 2] = 0, q = k, i = 0;
              j: for (;;) {
               o = 0 == (0 | g);
               do {
                k: for (;;) {
                 if ((k = 0 | f[z >> 2]) >>> 0 < (0 | f[A >> 2]) >>> 0 ? (f[z >> 2] = k + 1, k = 0 | h[k >> 0]) : k = 0 | Td(a), !(0 | b[K + (k + 1) >> 0])) break j;
                 switch (b[M >> 0] = k, 0 | Qe(L, M, J)) {
                 case -1:
                  i = 0, N = 133;
                  break b;

                 case -2:
                  break;

                 default:
                  break k;
                 }
                }
                o || (f[g + (i << 2) >> 2] = f[L >> 2], i = i + 1 | 0);
               } while (!(e & (0 | i) == (0 | q)));
               if (i = q << 1 | 1, !(k = 0 | Dd(g, i << 2))) {
                i = 0, e = 1, N = 133;
                break b;
               }
               s = q, q = i, g = k, i = s;
              }
              if (!(0 | rf(J))) {
               i = 0, N = 133;
               break b;
              }
              k = i, i = 0, q = g;
             } else {
              if (e) {
               if (!(i = 0 | Ad(k))) {
                i = 0, g = 0, e = 1, N = 133;
                break b;
               }
               for (o = k, g = 0; ;) {
                do {
                 if ((k = 0 | f[z >> 2]) >>> 0 < (0 | f[A >> 2]) >>> 0 ? (f[z >> 2] = k + 1, k = 0 | h[k >> 0]) : k = 0 | Td(a), !(0 | b[K + (k + 1) >> 0])) {
                  k = g, q = 0, g = 0;
                  break i;
                 }
                 b[i + g >> 0] = k, g = g + 1 | 0;
                } while ((0 | g) != (0 | o));
                if (g = o << 1 | 1, !(k = 0 | Dd(i, g))) {
                 g = 0, e = 1, N = 133;
                 break b;
                }
                s = o, o = g, i = k, g = s;
               }
              }
              if (x) for (k = 0, i = o; ;) {
               if ((g = 0 | f[z >> 2]) >>> 0 < i >>> 0 ? (f[z >> 2] = g + 1, g = 0 | h[g >> 0]) : g = 0 | Td(a), !(0 | b[K + (g + 1) >> 0])) {
                i = x, q = 0, g = 0;
                break i;
               }
               b[x + k >> 0] = g, k = k + 1 | 0, i = 0 | f[A >> 2];
              } else for (i = o; ;) {
               if ((g = 0 | f[z >> 2]) >>> 0 < i >>> 0 ? (f[z >> 2] = g + 1, g = 0 | h[g >> 0]) : g = 0 | Td(a), !(0 | b[K + (g + 1) >> 0])) {
                k = 0, i = 0, q = 0, g = 0;
                break i;
               }
               i = 0 | f[A >> 2];
              }
             }
            } while (0);
            if (0 | f[A >> 2] ? (o = (0 | f[z >> 2]) - 1 | 0, f[z >> 2] = o) : o = 0 | f[z >> 2], !(o = o - (0 | f[C >> 2]) + (0 | f[B >> 2]) | 0)) {
             N = 135;
             break b;
            }
            if (!((0 | o) == (0 | m) | 1 ^ v)) {
             N = 135;
             break b;
            }
            do {
             if (e) {
              if (r) {
               f[x >> 2] = q;
               break;
              }
              f[x >> 2] = i;
              break;
             }
            } while (0);
            v || (0 | q && (f[q + (k << 2) >> 2] = 0), i ? b[i + k >> 0] = 0 : i = 0);
            break;

           case 120:
           case 88:
           case 112:
            k = 16, N = 121;
            break;

           case 111:
            k = 8, N = 121;
            break;

           case 117:
           case 100:
            k = 10, N = 121;
            break;

           case 105:
            k = 0, N = 121;
            break;

           case 71:
           case 103:
           case 70:
           case 102:
           case 69:
           case 101:
           case 65:
           case 97:
            if (l = +Ce(a, s, 0), (0 | f[B >> 2]) == ((0 | f[C >> 2]) - (0 | f[z >> 2]) | 0)) {
             N = 135;
             break b;
            }
            if (x) switch (0 | s) {
            case 0:
             n[x >> 2] = l;
             break f;

            case 1:
            case 2:
             p[x >> 3] = l;
             break f;

            default:
             break f;
            }
           }
          } while (0);
          do {
           if (121 == (0 | N)) {
            if (N = 0, k = 0 | Sd(a, k), (0 | f[B >> 2]) == ((0 | f[C >> 2]) - (0 | f[z >> 2]) | 0)) {
             N = 135;
             break b;
            }
            if (w & 112 == (0 | r)) {
             f[x >> 2] = k;
             break;
            }
            qf(x, s, k, I);
            break;
           }
          } while (0);
          c = (1 & w) + c | 0, k = (0 | f[B >> 2]) + t + (0 | f[z >> 2]) - (0 | f[C >> 2]) | 0;
          break c;
         }
        } while (0);
        if (j = j + (1 & e) | 0, Rd(a, 0), (e = 0 | f[z >> 2]) >>> 0 < (0 | f[A >> 2]) >>> 0 ? (f[z >> 2] = e + 1, e = 0 | h[e >> 0]) : e = 0 | Td(a), (0 | e) != (0 | h[j >> 0])) {
         N = 20;
         break b;
        }
        k = t + 1 | 0;
       }
      } while (0);
      if (j = j + 1 | 0, !((e = 0 | b[j >> 0]) << 24 >> 24)) break a;
      t = k;
     }
     if (20 == (0 | N)) {
      if (0 | f[A >> 2] && (f[z >> 2] = (0 | f[z >> 2]) - 1), 0 != (0 | c) | (0 | e) > -1) break;
      e = 0, N = 134;
     } else 133 == (0 | N) ? (e &= 1, c || (N = 134)) : 135 == (0 | N) && (e &= 1);
     134 == (0 | N) && (c = -1), e && (Bd(i), Bd(g));
    } else c = 0;
   } while (0);
   return u = O, 0 | c;
  }
  function de(a, c, e, g, h) {
   a |= 0, c |= 0, e |= 0, g |= 0, h |= 0;
   var i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0;
   G = u, u = u + 64 | 0, D = G, A = G + 24 | 0, E = G + 8 | 0, F = G + 20 | 0, f[(C = G + 16 | 0) >> 2] = c, x = 0 != (0 | a), z = y = A + 40 | 0, A = A + 39 | 0, B = E + 4 | 0, j = 0, i = 0, n = 0;
   a: for (;;) {
    do {
     if ((0 | i) > -1) {
      if ((0 | j) > (2147483647 - i | 0)) {
       f[5745] = 75, i = -1;
       break;
      }
      i = j + i | 0;
      break;
     }
    } while (0);
    if (!((j = 0 | b[c >> 0]) << 24 >> 24)) {
     w = 87;
     break;
    }
    k = c;
    b: for (;;) {
     switch (j << 24 >> 24) {
     case 37:
      j = k, w = 9;
      break b;

     case 0:
      j = k;
      break b;
     }
     v = k + 1 | 0, f[C >> 2] = v, j = 0 | b[v >> 0], k = v;
    }
    c: do {
     if (9 == (0 | w)) for (;;) {
      if (w = 0, 37 != (0 | b[k + 1 >> 0])) break c;
      if (j = j + 1 | 0, k = k + 2 | 0, f[C >> 2] = k, 37 != (0 | b[k >> 0])) break;
      w = 9;
     }
    } while (0);
    if (j = j - c | 0, x && ee(a, c, j), 0 | j) c = k; else {
     (j = (0 | b[(l = k + 1 | 0) >> 0]) - 48 | 0) >>> 0 < 10 ? (t = (v = 36 == (0 | b[k + 2 >> 0])) ? j : -1, n = v ? 1 : n, l = v ? k + 3 | 0 : l) : t = -1, f[C >> 2] = l, k = ((j = 0 | b[l >> 0]) << 24 >> 24) - 32 | 0;
     d: do {
      if (k >>> 0 < 32) for (m = 0, o = j; ;) {
       if (!(75913 & (j = 1 << k))) {
        j = o;
        break d;
       }
       if (m |= j, l = l + 1 | 0, f[C >> 2] = l, j = 0 | b[l >> 0], (k = (j << 24 >> 24) - 32 | 0) >>> 0 >= 32) break;
       o = j;
      } else m = 0;
     } while (0);
     if (j << 24 >> 24 == 42) {
      if (k = l + 1 | 0, (j = (0 | b[k >> 0]) - 48 | 0) >>> 0 < 10 && 36 == (0 | b[l + 2 >> 0]) ? (f[h + (j << 2) >> 2] = 10, j = 0 | f[g + ((0 | b[k >> 0]) - 48 << 3) >> 2], n = 1, l = l + 3 | 0) : w = 23, 23 == (0 | w)) {
       if (w = 0, 0 | n) {
        i = -1;
        break;
       }
       x ? (j = 0 | f[(n = 3 + (0 | f[e >> 2]) & -4) >> 2], f[e >> 2] = n + 4, n = 0, l = k) : (j = 0, n = 0, l = k);
      }
      f[C >> 2] = l, j = (v = (0 | j) < 0) ? 0 - j | 0 : j, m = v ? 8192 | m : m;
     } else {
      if ((0 | (j = 0 | fe(C))) < 0) {
       i = -1;
       break;
      }
      l = 0 | f[C >> 2];
     }
     do {
      if (46 == (0 | b[l >> 0])) {
       if (k = l + 1 | 0, 42 != (0 | b[k >> 0])) {
        f[C >> 2] = k, k = 0 | fe(C), l = 0 | f[C >> 2];
        break;
       }
       if (o = l + 2 | 0, (k = (0 | b[o >> 0]) - 48 | 0) >>> 0 < 10 && 36 == (0 | b[l + 3 >> 0])) {
        f[h + (k << 2) >> 2] = 10, k = 0 | f[g + ((0 | b[o >> 0]) - 48 << 3) >> 2], l = l + 4 | 0, f[C >> 2] = l;
        break;
       }
       if (0 | n) {
        i = -1;
        break a;
       }
       x ? (k = 0 | f[(v = 3 + (0 | f[e >> 2]) & -4) >> 2], f[e >> 2] = v + 4) : k = 0, f[C >> 2] = o, l = o;
      } else k = -1;
     } while (0);
     for (s = 0; ;) {
      if (((0 | b[l >> 0]) - 65 | 0) >>> 0 > 57) {
       i = -1;
       break a;
      }
      if (v = l + 1 | 0, f[C >> 2] = v, o = 0 | b[(0 | b[l >> 0]) - 65 + (40609 + (58 * s | 0)) >> 0], !(((q = 255 & o) - 1 | 0) >>> 0 < 8)) break;
      s = q, l = v;
     }
     if (!(o << 24 >> 24)) {
      i = -1;
      break;
     }
     r = (0 | t) > -1;
     do {
      if (o << 24 >> 24 == 19) {
       if (r) {
        i = -1;
        break a;
       }
       w = 49;
      } else {
       if (r) {
        f[h + (t << 2) >> 2] = q, t = 0 | f[4 + (r = g + (t << 3) | 0) >> 2], f[(w = D) >> 2] = f[r >> 2], f[w + 4 >> 2] = t, w = 49;
        break;
       }
       if (!x) {
        i = 0;
        break a;
       }
       ge(D, q, e);
      }
     } while (0);
     if (49 != (0 | w) || (w = 0, x)) {
      l = 0 != (0 | s) & 3 == (15 & (l = 0 | b[l >> 0]) | 0) ? -33 & l : l, r = -65537 & m, t = 0 == (8192 & m | 0) ? m : r;
      e: do {
       switch (0 | l) {
       case 110:
        switch ((255 & s) << 24 >> 24) {
        case 0:
        case 1:
         f[f[D >> 2] >> 2] = i, j = 0, c = v;
         continue a;

        case 2:
         f[(j = 0 | f[D >> 2]) >> 2] = i, f[j + 4 >> 2] = ((0 | i) < 0) << 31 >> 31, j = 0, c = v;
         continue a;

        case 3:
         d[f[D >> 2] >> 1] = i, j = 0, c = v;
         continue a;

        case 4:
         b[f[D >> 2] >> 0] = i, j = 0, c = v;
         continue a;

        case 6:
         f[f[D >> 2] >> 2] = i, j = 0, c = v;
         continue a;

        case 7:
         f[(j = 0 | f[D >> 2]) >> 2] = i, f[j + 4 >> 2] = ((0 | i) < 0) << 31 >> 31, j = 0, c = v;
         continue a;

        default:
         j = 0, c = v;
         continue a;
        }

       case 112:
        l = 120, k = k >>> 0 > 8 ? k : 8, c = 8 | t, w = 61;
        break;

       case 88:
       case 120:
        c = t, w = 61;
        break;

       case 111:
        m = 0, o = 41073, k = 0 == (8 & t | 0) | (0 | k) > (0 | (r = z - (q = 0 | ie(c = 0 | f[(l = D) >> 2], l = 0 | f[l + 4 >> 2], y)) | 0)) ? k : r + 1 | 0, r = t, w = 67;
        break;

       case 105:
       case 100:
        if (l = D, c = 0 | f[l >> 2], (0 | (l = 0 | f[l + 4 >> 2])) < 0) {
         c = 0 | ag(0, 0, 0 | c, 0 | l), l = I, f[(m = D) >> 2] = c, f[m + 4 >> 2] = l, m = 1, o = 41073, w = 66;
         break e;
        }
        m = 0 != (2049 & t | 0) & 1, o = 0 == (2048 & t | 0) ? 0 == (1 & t | 0) ? 41073 : 41075 : 41074, w = 66;
        break e;

       case 117:
        m = 0, o = 41073, c = 0 | f[(l = D) >> 2], l = 0 | f[l + 4 >> 2], w = 66;
        break;

       case 99:
        b[A >> 0] = f[D >> 2], c = A, m = 0, o = 41073, q = y, l = 1, k = r;
        break;

       case 109:
        l = 0 | ke(0 | f[5745]), w = 71;
        break;

       case 115:
        l = 0 | (l = 0 | f[D >> 2]) ? l : 43039, w = 71;
        break;

       case 67:
        f[E >> 2] = f[D >> 2], f[B >> 2] = 0, f[D >> 2] = E, q = -1, l = E, w = 75;
        break;

       case 83:
        c = 0 | f[D >> 2], k ? (q = k, l = c, w = 75) : (me(a, 32, j, 0, t), c = 0, w = 84);
        break;

       case 65:
       case 71:
       case 70:
       case 69:
       case 97:
       case 103:
       case 102:
       case 101:
        j = 0 | oe(a, +p[D >> 3], j, k, t, l), c = v;
        continue a;

       default:
        m = 0, o = 41073, q = y, l = k, k = t;
       }
      } while (0);
      f: do {
       if (61 == (0 | w)) q = 0 | he(s = 0 | f[(t = D) >> 2], t = 0 | f[t + 4 >> 2], y, 32 & l), m = (o = 0 == (8 & c | 0) | 0 == (0 | s) & 0 == (0 | t)) ? 0 : 2, o = o ? 41073 : 41073 + (l >> 4) | 0, r = c, c = s, l = t, w = 67; else if (66 == (0 | w)) q = 0 | je(c, l, y), r = t, w = 67; else if (71 == (0 | w)) w = 0, c = l, m = 0, o = 41073, q = (s = 0 == (0 | (t = 0 | le(l, 0, k)))) ? l + k | 0 : t, l = s ? k : t - l | 0, k = r; else if (75 == (0 | w)) {
        for (w = 0, o = l, c = 0, k = 0; (m = 0 | f[o >> 2]) && !((0 | (k = 0 | ne(F, m))) < 0 | k >>> 0 > (q - c | 0) >>> 0) && (c = k + c | 0, q >>> 0 > c >>> 0); ) o = o + 4 | 0;
        if ((0 | k) < 0) {
         i = -1;
         break a;
        }
        if (me(a, 32, j, c, t), c) for (m = 0; ;) {
         if (!(k = 0 | f[l >> 2])) {
          w = 84;
          break f;
         }
         if (k = 0 | ne(F, k), (0 | (m = k + m | 0)) > (0 | c)) {
          w = 84;
          break f;
         }
         if (ee(a, F, k), m >>> 0 >= c >>> 0) {
          w = 84;
          break;
         }
         l = l + 4 | 0;
        } else c = 0, w = 84;
       }
      } while (0);
      if (67 == (0 | w)) w = 0, t = (l = 0 != (0 | c) | 0 != (0 | l)) | 0 != (0 | k), l = z - q + (1 & (1 ^ l)) | 0, c = t ? q : y, q = y, l = t ? (0 | k) > (0 | l) ? k : l : k, k = (0 | k) > -1 ? -65537 & r : r; else if (84 == (0 | w)) {
       w = 0, me(a, 32, j, c, 8192 ^ t), j = (0 | j) > (0 | c) ? j : c, c = v;
       continue;
      }
      me(a, 32, j = (0 | j) < (0 | (t = (r = (0 | l) < (0 | (s = q - c | 0)) ? s : l) + m | 0)) ? t : j, t, k), ee(a, o, m), me(a, 48, j, t, 65536 ^ k), me(a, 48, r, s, 0), ee(a, c, s), me(a, 32, j, t, 8192 ^ k), c = v;
     } else j = 0, c = v;
    }
   }
   g: do {
    if (87 == (0 | w) && !a) if (n) {
     for (i = 1; ;) {
      if (!(c = 0 | f[h + (i << 2) >> 2])) {
       j = 0;
       break;
      }
      if (ge(g + (i << 3) | 0, c, e), (0 | (i = i + 1 | 0)) >= 10) {
       i = 1;
       break g;
      }
     }
     for (;;) {
      if (c = i + 1 | 0, 0 | j) {
       i = -1;
       break g;
      }
      if ((0 | c) >= 10) {
       i = 1;
       break g;
      }
      i = c, j = 0 | f[h + (c << 2) >> 2];
     }
    } else i = 0;
   } while (0);
   return u = G, 0 | i;
  }
  function Ee(a, b, c, d, e, g) {
   b |= 0, e |= 0, g |= 0;
   var i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0;
   G = u, u = u + 512 | 0, D = G, F = 0 - (E = (d |= 0) + (c |= 0) | 0) | 0, B = 4 + (a |= 0) | 0, C = a + 100 | 0, j = 0;
   a: for (;;) {
    switch (0 | b) {
    case 46:
     A = 6;
     break a;

    case 48:
     break;

    default:
     v = 0, o = j, p = 0, n = 0;
     break a;
    }
    (b = 0 | f[B >> 2]) >>> 0 < (0 | f[C >> 2]) >>> 0 ? (f[B >> 2] = b + 1, b = 0 | h[b >> 0], j = 1) : (b = 0 | Td(a), j = 1);
   }
   if (6 == (0 | A)) if ((b = 0 | f[B >> 2]) >>> 0 < (0 | f[C >> 2]) >>> 0 ? (f[B >> 2] = b + 1, b = 0 | h[b >> 0]) : b = 0 | Td(a), 48 == (0 | b)) for (j = 0, b = 0; ;) {
    if (j = 0 | bg(0 | j, 0 | b, -1, -1), n = I, (b = 0 | f[B >> 2]) >>> 0 < (0 | f[C >> 2]) >>> 0 ? (f[B >> 2] = b + 1, b = 0 | h[b >> 0]) : b = 0 | Td(a), 48 != (0 | b)) {
     v = 1, o = 1, p = j;
     break;
    }
    b = n;
   } else v = 1, o = j, p = 0, n = 0;
   f[D >> 2] = 0, m = b + -48 | 0, k = 46 == (0 | b);
   b: do {
    if (k | m >>> 0 < 10) {
     z = D + 496 | 0, w = 0, j = 0, s = 0, x = v, A = o, v = k, y = m, o = 0, k = 0;
     c: for (;;) {
      do {
       if (v) {
        if (x) break c;
        x = 1, m = A, p = o, n = k;
       } else {
        if (o = 0 | bg(0 | o, 0 | k, 1, 0), k = I, v = 48 != (0 | b), (0 | j) >= 125) {
         if (!v) {
          m = A;
          break;
         }
         f[z >> 2] = 1 | f[z >> 2], m = A;
         break;
        }
        m = D + (j << 2) | 0, b = w ? b + -48 + (10 * (0 | f[m >> 2]) | 0) | 0 : y, f[m >> 2] = b, w = (m = 9 == (0 | (w = w + 1 | 0))) ? 0 : w, j = (1 & m) + j | 0, s = v ? o : s, m = 1;
       }
      } while (0);
      if ((b = 0 | f[B >> 2]) >>> 0 < (0 | f[C >> 2]) >>> 0 ? (f[B >> 2] = b + 1, b = 0 | h[b >> 0]) : b = 0 | Td(a), y = b + -48 | 0, !((v = 46 == (0 | b)) | y >>> 0 < 10)) {
       v = x, A = 29;
       break b;
      }
      A = m;
     }
     b = w, m = 0 != (0 | A), A = 37;
    } else w = 0, j = 0, s = 0, m = o, o = 0, k = 0, A = 29;
   } while (0);
   do {
    if (29 == (0 | A)) {
     if (z = 0 == (0 | v), p = z ? o : p, n = z ? k : n, !((m = 0 != (0 | m)) & 101 == (32 | b))) {
      if ((0 | b) > -1) {
       b = w, A = 37;
       break;
      }
      b = w, A = 39;
      break;
     }
     if (m = 0 | Fe(a, g), b = I, 0 == (0 | m) & -2147483648 == (0 | b)) {
      if (!g) {
       Rd(a, 0), i = 0;
       break;
      }
      0 | f[C >> 2] ? (f[B >> 2] = (0 | f[B >> 2]) - 1, m = 0, b = 0) : (m = 0, b = 0);
     }
     y = 0 | bg(0 | m, 0 | b, 0 | p, 0 | n), b = w, n = I, A = 41;
    }
   } while (0);
   37 == (0 | A) && (0 | f[C >> 2] ? (f[B >> 2] = (0 | f[B >> 2]) - 1, m ? (y = p, A = 41) : A = 40) : A = 39), 39 == (0 | A) && (m ? (y = p, A = 41) : A = 40);
   do {
    if (40 == (0 | A)) f[5745] = 22, Rd(a, 0), i = 0; else if (41 == (0 | A)) {
     if (!(m = 0 | f[D >> 2])) {
      i = 0 * +(0 | e);
      break;
     }
     if ((0 | y) == (0 | o) & (0 | n) == (0 | k) & ((0 | k) < 0 | 0 == (0 | k) & o >>> 0 < 10) && (0 | c) > 30 | 0 == (m >>> c | 0)) {
      i = +(0 | e) * +(m >>> 0);
      break;
     }
     if (a = (0 | d) / -2 | 0, C = ((0 | a) < 0) << 31 >> 31, (0 | n) > (0 | C) | (0 | n) == (0 | C) & y >>> 0 > a >>> 0) {
      f[5745] = 34, i = 1.7976931348623157e308 * +(0 | e) * 1.7976931348623157e308;
      break;
     }
     if (a = d + -106 | 0, C = ((0 | a) < 0) << 31 >> 31, (0 | n) < (0 | C) | (0 | n) == (0 | C) & y >>> 0 < a >>> 0) {
      f[5745] = 34, i = 2.2250738585072014e-308 * +(0 | e) * 2.2250738585072014e-308;
      break;
     }
     if (b) {
      if ((0 | b) < 9) {
       k = 0 | f[(m = D + (j << 2) | 0) >> 2];
       do {
        k = 10 * k | 0, b = b + 1 | 0;
       } while (9 != (0 | b));
       f[m >> 2] = k;
      }
      j = j + 1 | 0;
     }
     if ((0 | s) < 9 && (0 | s) <= (0 | y) & (0 | y) < 18) {
      if (b = 0 | f[D >> 2], 9 == (0 | y)) {
       i = +(0 | e) * +(b >>> 0);
       break;
      }
      if ((0 | y) < 9) {
       i = +(0 | e) * +(b >>> 0) / +(0 | f[23412 + (8 - y << 2) >> 2]);
       break;
      }
      if ((0 | (a = c + 27 + (0 | X(y, -3)) | 0)) > 30 | 0 == (b >>> a | 0)) {
       i = +(0 | e) * +(b >>> 0) * +(0 | f[23412 + (y + -10 << 2) >> 2]);
       break;
      }
     }
     if (b = (0 | y) % 9 | 0) {
      if (s = (0 | y) > -1 ? b : b + 9 | 0, o = 0 | f[23412 + (8 - s << 2) >> 2], j) {
       p = 1e9 / (0 | o) | 0, m = 0, n = 0, k = y, b = 0;
       do {
        a = (((C = 0 | f[(B = D + (b << 2) | 0) >> 2]) >>> 0) / (o >>> 0) | 0) + m | 0, f[B >> 2] = a, m = 0 | X((C >>> 0) % (o >>> 0) | 0, p), k = (a = (0 | b) == (0 | n) & 0 == (0 | a)) ? k + -9 | 0 : k, n = a ? n + 1 & 127 : n, b = b + 1 | 0;
       } while ((0 | b) != (0 | j));
       m ? (f[D + (j << 2) >> 2] = m, m = n, j = j + 1 | 0) : m = n;
      } else m = 0, j = 0, k = y;
      b = 0, y = 9 - s + k | 0;
     } else b = 0, m = 0;
     d: for (;;) {
      for (s = (0 | y) < 18, v = 18 == (0 | y), w = D + (m << 2) | 0; ;) {
       if (!s) {
        if (!v) {
         k = y;
         break d;
        }
        if ((0 | f[w >> 2]) >>> 0 >= 9007199) {
         k = 18;
         break d;
        }
       }
       for (k = 0, x = j, j = j + 127 | 0; n = 127 & j, o = D + (n << 2) | 0, j = 0 | dg(0 | f[o >> 2], 0, 29), j = 0 | bg(0 | j, 0 | I, 0 | k, 0), (k = I) >>> 0 > 0 | 0 == (0 | k) & j >>> 0 > 1e9 ? (p = 0 | jg(0 | j, 0 | k, 1e9, 0), j = 0 | og(0 | j, 0 | k, 1e9, 0)) : p = 0, f[o >> 2] = j, a = (0 | n) == (0 | m), x = 0 == (0 | j) & (1 ^ ((0 | n) != (x + 127 & 127 | 0) | a)) ? n : x, !a; ) k = p, j = n + -1 | 0;
       if (b = b + -29 | 0, 0 | p) break;
       j = x;
      }
      j = x + 127 & 127, k = D + ((x + 126 & 127) << 2) | 0, (0 | (m = m + 127 & 127)) == (0 | x) ? f[k >> 2] = f[k >> 2] | f[D + (j << 2) >> 2] : j = x, f[D + (m << 2) >> 2] = p, y = y + 9 | 0;
     }
     e: for (;;) {
      for (x = j + 1 & 127, y = D + ((j + 127 & 127) << 2) | 0, v = k; ;) {
       for (o = 18 == (0 | v), w = (0 | v) > 27 ? 9 : 1, z = m; ;) {
        for (k = 0; ;) {
         if ((0 | (m = k + z & 127)) == (0 | j)) {
          k = 2, A = 88;
          break;
         }
         if (m = 0 | f[D + (m << 2) >> 2], n = 0 | f[23444 + (k << 2) >> 2], m >>> 0 < n >>> 0) {
          k = 2, A = 88;
          break;
         }
         if (m >>> 0 > n >>> 0) break;
         if ((0 | (k = k + 1 | 0)) >= 2) {
          A = 88;
          break;
         }
        }
        if (88 == (0 | A) && (A = 0, o & 2 == (0 | k))) {
         i = 0, n = 0;
         break e;
        }
        if (b = b + w | 0, (0 | z) != (0 | j)) break;
        z = j;
       }
       p = (1 << w) - 1 | 0, s = 1e9 >>> w, o = 0, m = z, k = v, n = z;
       do {
        a = ((C = 0 | f[(B = D + (n << 2) | 0) >> 2]) >>> w) + o | 0, f[B >> 2] = a, o = 0 | X(C & p, s), k = (a = (0 | n) == (0 | m) & 0 == (0 | a)) ? k + -9 | 0 : k, m = a ? m + 1 & 127 : m, n = n + 1 & 127;
       } while ((0 | n) != (0 | j));
       if (o) {
        if ((0 | x) != (0 | m)) break;
        f[y >> 2] = 1 | f[y >> 2], v = k;
       } else v = k;
      }
      f[D + (j << 2) >> 2] = o, j = x;
     }
     do {
      k = j + 1 & 127, (0 | (m = n + z & 127)) == (0 | j) && (f[D + (k + -1 << 2) >> 2] = 0, j = k), i = 1e9 * i + +((0 | f[D + (m << 2) >> 2]) >>> 0), n = n + 1 | 0;
     } while (2 != (0 | n));
     if (t = +(0 | e), l = t * i, m = b + 53 | 0, o = m - d | 0, p = (0 | o) < (0 | c), (0 | (n = p ? (0 | o) > 0 ? o : 0 : c)) < 53 ? (r = H = +He(+Ge(1, 105 - n | 0), l), i = q = +Ie(l, +Ge(1, 53 - n | 0)), q = H + (l - q)) : (r = 0, i = 0, q = l), (0 | (k = z + 2 & 127)) == (0 | j)) l = i; else {
      k = 0 | f[D + (k << 2) >> 2];
      do {
       if (!(k >>> 0 < 5e8)) {
        if (5e8 != (0 | k)) {
         i = .75 * t + i;
         break;
        }
        if ((z + 3 & 127 | 0) == (0 | j)) {
         i = .5 * t + i;
         break;
        }
        i = .75 * t + i;
        break;
       }
       if (!k && (z + 3 & 127 | 0) == (0 | j)) break;
       i = .25 * t + i;
      } while (0);
      l = (53 - n | 0) > 1 ? 0 != +Ie(i, 1) ? i : i + 1 : i;
     }
     i = q + l - r;
     do {
      if ((2147483647 & m | 0) > (-2 - E | 0)) {
       if (j = !(+K(+i) >= 9007199254740992), b = (1 & (1 ^ j)) + b | 0, i = j ? i : .5 * i, (b + 50 | 0) <= (0 | F) && !(0 != l & p & ((0 | n) != (0 | o) | j))) break;
       f[5745] = 34;
      }
     } while (0);
     i = +Je(i, b);
    }
   } while (0);
   return u = G, +i;
  }
  function oe(a, c, d, e, g, i) {
   a |= 0, c = +c, d |= 0, e |= 0, g |= 0, i |= 0;
   var j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;
   F = u, u = u + 560 | 0, l = F + 8 | 0, D = E = F + 524 | 0, m = F + 512 | 0, f[(t = F) >> 2] = 0, C = m + 12 | 0, pe(c), (0 | I) < 0 ? (c = -c, A = 1, z = 41083) : (A = 0 != (2049 & g | 0) & 1, z = 0 == (2048 & g | 0) ? 0 == (1 & g | 0) ? 41084 : 41089 : 41086), pe(c), B = 2146435072 & I;
   do {
    if (B >>> 0 < 2146435072 | 2146435072 == (0 | B) & !1) {
     if (c = 2 * +qe(c, t), (j = 0 != c) && (f[t >> 2] = (0 | f[t >> 2]) - 1), 97 == (0 | (w = 32 | i))) {
      q = 0 == (0 | (r = 32 & i)) ? z : z + 9 | 0, p = 2 | A, j = 12 - e | 0;
      do {
       if (!(e >>> 0 > 11 | 0 == (0 | j))) {
        n = 8;
        do {
         j = j + -1 | 0, n *= 16;
        } while (0 != (0 | j));
        if (45 == (0 | b[q >> 0])) {
         c = -(n + (-c - n));
         break;
        }
        c = c + n - n;
        break;
       }
      } while (0);
      (0 | (j = 0 | je(j = (0 | (k = 0 | f[t >> 2])) < 0 ? 0 - k | 0 : k, ((0 | j) < 0) << 31 >> 31, C))) == (0 | C) && (b[(j = m + 11 | 0) >> 0] = 48), b[j + -1 >> 0] = 43 + (k >> 31 & 2), b[(o = j + -2 | 0) >> 0] = i + 15, m = (0 | e) < 1, l = 0 == (8 & g | 0), j = E;
      do {
       B = ~~c, k = j + 1 | 0, b[j >> 0] = h[41114 + B >> 0] | r, c = 16 * (c - +(0 | B)), 1 == (k - D | 0) ? l & m & 0 == c ? j = k : (b[k >> 0] = 46, j = j + 2 | 0) : j = k;
      } while (0 != c);
      B = j - D | 0, me(a, 32, d, j = (D = C - o | 0) + p + (C = 0 != (0 | e) & (B + -2 | 0) < (0 | e) ? e + 2 | 0 : B) | 0, g), ee(a, q, p), me(a, 48, d, j, 65536 ^ g), ee(a, E, B), me(a, 48, C - B | 0, 0, 0), ee(a, o, D), me(a, 32, d, j, 8192 ^ g);
      break;
     }
     k = (0 | e) < 0 ? 6 : e, j ? (j = (0 | f[t >> 2]) - 28 | 0, f[t >> 2] = j, c *= 268435456) : j = 0 | f[t >> 2], l = B = (0 | j) < 0 ? l : l + 288 | 0;
     do {
      y = ~~c >>> 0, f[l >> 2] = y, l = l + 4 | 0, c = 1e9 * (c - +(y >>> 0));
     } while (0 != c);
     if ((0 | j) > 0) for (m = B, p = l; ;) {
      if (o = (0 | j) < 29 ? j : 29, (j = p + -4 | 0) >>> 0 >= m >>> 0) {
       l = 0;
       do {
        v = 0 | og(0 | (x = 0 | bg(0 | (x = 0 | dg(0 | f[j >> 2], 0, 0 | o)), 0 | I, 0 | l, 0)), 0 | (y = I), 1e9, 0), f[j >> 2] = v, l = 0 | jg(0 | x, 0 | y, 1e9, 0), j = j + -4 | 0;
       } while (j >>> 0 >= m >>> 0);
       l && (f[(m = m + -4 | 0) >> 2] = l);
      }
      for (l = p; !(l >>> 0 <= m >>> 0 || (j = l + -4 | 0, 0 | f[j >> 2])); ) l = j;
      if (j = (0 | f[t >> 2]) - o | 0, f[t >> 2] = j, !((0 | j) > 0)) break;
      p = l;
     } else m = B;
     if ((0 | j) < 0) {
      e = 1 + ((k + 25 | 0) / 9 | 0) | 0, s = 102 == (0 | w);
      do {
       if (r = 0 - j | 0, r = (0 | r) < 9 ? r : 9, m >>> 0 < l >>> 0) {
        o = (1 << r) - 1 | 0, p = 1e9 >>> r, q = 0, j = m;
        do {
         y = 0 | f[j >> 2], f[j >> 2] = (y >>> r) + q, q = 0 | X(y & o, p), j = j + 4 | 0;
        } while (j >>> 0 < l >>> 0);
        j = 0 == (0 | f[m >> 2]) ? m + 4 | 0 : m, q ? (f[l >> 2] = q, m = j, j = l + 4 | 0) : (m = j, j = l);
       } else m = 0 == (0 | f[m >> 2]) ? m + 4 | 0 : m, j = l;
       l = (j - (l = s ? B : m) >> 2 | 0) > (0 | e) ? l + (e << 2) | 0 : j, j = (0 | f[t >> 2]) + r | 0, f[t >> 2] = j;
      } while ((0 | j) < 0);
      j = m, e = l;
     } else j = m, e = l;
     if (y = B, j >>> 0 < e >>> 0) {
      if (l = 9 * (y - j >> 2) | 0, (o = 0 | f[j >> 2]) >>> 0 >= 10) {
       m = 10;
       do {
        m = 10 * m | 0, l = l + 1 | 0;
       } while (o >>> 0 >= m >>> 0);
      }
     } else l = 0;
     if (s = 103 == (0 | w), v = 0 != (0 | k), (0 | (m = k - (102 != (0 | w) ? l : 0) + ((v & s) << 31 >> 31) | 0)) < ((9 * (e - y >> 2) | 0) - 9 | 0)) {
      if (m = m + 9216 | 0, r = B + 4 + (((0 | m) / 9 | 0) - 1024 << 2) | 0, (0 | (m = 1 + ((0 | m) % 9 | 0) | 0)) < 9) {
       o = 10;
       do {
        o = 10 * o | 0, m = m + 1 | 0;
       } while (9 != (0 | m));
      } else o = 10;
      if (p = 0 | f[r >> 2], q = (p >>> 0) % (o >>> 0) | 0, (m = (r + 4 | 0) == (0 | e)) & 0 == (0 | q)) m = r; else if (n = 0 == (1 & ((p >>> 0) / (o >>> 0) | 0) | 0) ? 9007199254740992 : 9007199254740994, x = (0 | o) / 2 | 0, c = q >>> 0 < x >>> 0 ? .5 : m & (0 | q) == (0 | x) ? 1 : 1.5, A && (c = (x = 45 == (0 | b[z >> 0])) ? -c : c, n = x ? -n : n), m = p - q | 0, f[r >> 2] = m, n + c != n) {
       if (x = m + o | 0, f[r >> 2] = x, x >>> 0 > 999999999) for (l = r; m = l + -4 | 0, f[l >> 2] = 0, m >>> 0 < j >>> 0 && (f[(j = j + -4 | 0) >> 2] = 0), x = 1 + (0 | f[m >> 2]) | 0, f[m >> 2] = x, x >>> 0 > 999999999; ) l = m; else m = r;
       if (l = 9 * (y - j >> 2) | 0, (p = 0 | f[j >> 2]) >>> 0 >= 10) {
        o = 10;
        do {
         o = 10 * o | 0, l = l + 1 | 0;
        } while (p >>> 0 >= o >>> 0);
       }
      } else m = r;
      m = e >>> 0 > (m = m + 4 | 0) >>> 0 ? m : e, x = j;
     } else m = e, x = j;
     for (w = m; ;) {
      if (w >>> 0 <= x >>> 0) {
       t = 0;
       break;
      }
      if (j = w + -4 | 0, 0 | f[j >> 2]) {
       t = 1;
       break;
      }
      w = j;
     }
     e = 0 - l | 0, j = 8 & g;
     do {
      if (s) {
       if (v = (1 & (1 ^ v)) + k | 0, k = (0 | v) > (0 | l) & (0 | l) > -5, p = (k ? -1 : -2) + i | 0, k = v + -1 + (k ? e : 0) | 0, !j) {
        if (t) if (o = 0 | f[w + -4 >> 2]) if ((o >>> 0) % 10 | 0) m = 0; else {
         m = 0, j = 10;
         do {
          j = 10 * j | 0, m = m + 1 | 0;
         } while (!(0 | (o >>> 0) % (j >>> 0)));
        } else m = 9; else m = 9;
        if (j = (9 * (w - y >> 2) | 0) - 9 | 0, 102 == (32 | p)) {
         k = (0 | k) < (0 | (r = (0 | (r = j - m | 0)) > 0 ? r : 0)) ? k : r, r = 0;
         break;
        }
        k = (0 | k) < (0 | (r = (0 | (r = j + l - m | 0)) > 0 ? r : 0)) ? k : r, r = 0;
        break;
       }
       r = j;
      } else p = i, r = j;
     } while (0);
     if (s = k | r, o = 0 != (0 | s) & 1, q = 102 == (32 | p)) v = 0, j = (0 | l) > 0 ? l : 0; else {
      if (j = (0 | l) < 0 ? e : l, j = 0 | je(j, ((0 | j) < 0) << 31 >> 31, C), ((m = C) - j | 0) < 2) do {
       b[(j = j + -1 | 0) >> 0] = 48;
      } while ((m - j | 0) < 2);
      b[j + -1 >> 0] = 43 + (l >> 31 & 2), b[(j = j + -2 | 0) >> 0] = p, v = j, j = m - j | 0;
     }
     if (j = A + 1 + k + o + j | 0, me(a, 32, d, j, g), ee(a, z, A), me(a, 48, d, j, 65536 ^ g), q) {
      p = r = E + 9 | 0, q = E + 8 | 0, m = o = x >>> 0 > B >>> 0 ? B : x;
      do {
       if (l = 0 | je(0 | f[m >> 2], 0, r), (0 | m) == (0 | o)) (0 | l) == (0 | r) && (b[q >> 0] = 48, l = q); else if (l >>> 0 > E >>> 0) {
        cg(0 | E, 48, l - D | 0);
        do {
         l = l + -1 | 0;
        } while (l >>> 0 > E >>> 0);
       }
       ee(a, l, p - l | 0), m = m + 4 | 0;
      } while (m >>> 0 <= B >>> 0);
      if (0 | s && ee(a, 43069, 1), (0 | k) > 0 & m >>> 0 < w >>> 0) for (;;) {
       if ((l = 0 | je(0 | f[m >> 2], 0, r)) >>> 0 > E >>> 0) {
        cg(0 | E, 48, l - D | 0);
        do {
         l = l + -1 | 0;
        } while (l >>> 0 > E >>> 0);
       }
       if (ee(a, l, (0 | k) < 9 ? k : 9), m = m + 4 | 0, l = k + -9 | 0, !((0 | k) > 9 & m >>> 0 < w >>> 0)) {
        k = l;
        break;
       }
       k = l;
      }
      me(a, 48, k + 9 | 0, 9, 0);
     } else {
      if (s = t ? w : x + 4 | 0, (0 | k) > -1) {
       r = 0 == (0 | r), e = t = E + 9 | 0, p = 0 - D | 0, q = E + 8 | 0, o = x;
       do {
        (0 | (l = 0 | je(0 | f[o >> 2], 0, t))) == (0 | t) && (b[q >> 0] = 48, l = q);
        do {
         if ((0 | o) == (0 | x)) {
          if (m = l + 1 | 0, ee(a, l, 1), r & (0 | k) < 1) {
           l = m;
           break;
          }
          ee(a, 43069, 1), l = m;
         } else {
          if (l >>> 0 <= E >>> 0) break;
          cg(0 | E, 48, l + p | 0);
          do {
           l = l + -1 | 0;
          } while (l >>> 0 > E >>> 0);
         }
        } while (0);
        ee(a, l, (0 | k) > (0 | (D = e - l | 0)) ? D : k), k = k - D | 0, o = o + 4 | 0;
       } while (o >>> 0 < s >>> 0 & (0 | k) > -1);
      }
      me(a, 48, k + 18 | 0, 18, 0), ee(a, v, C - v | 0);
     }
     me(a, 32, d, j, 8192 ^ g);
    } else E = 0 != (32 & i | 0), me(a, 32, d, j = A + 3 | 0, -65537 & g), ee(a, z, A), ee(a, c != c | !1 ? E ? 43031 : 41110 : E ? 41102 : 41106, 3), me(a, 32, d, j, 8192 ^ g);
   } while (0);
   return u = F, 0 | ((0 | j) < (0 | d) ? d : j);
  }
  function Bd(a) {
   var b = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
   if (a |= 0) {
    (c = a + -8 | 0) >>> 0 < (h = 0 | f[51268]) >>> 0 && sa(), 1 == (0 | (b = 3 & (a = 0 | f[a + -4 >> 2]))) && sa(), o = c + (d = -8 & a) | 0;
    a: do {
     if (1 & a) r = c, e = d, m = c; else {
      if (a = 0 | f[c >> 2], !b) return;
      if (k = c + (0 - a) | 0, j = a + d | 0, k >>> 0 < h >>> 0 && sa(), (0 | k) == (0 | f[51269])) {
       if (a = o + 4 | 0, 3 != (3 & (b = 0 | f[a >> 2]) | 0)) {
        r = k, e = j, m = k;
        break;
       }
       return f[51266] = j, f[a >> 2] = -2 & b, f[k + 4 >> 2] = 1 | j, void (f[k + j >> 2] = j);
      }
      if (d = a >>> 3, a >>> 0 < 256) {
       if (b = 0 | f[k + 8 >> 2], c = 0 | f[k + 12 >> 2], a = 205096 + (d << 1 << 2) | 0, (0 | b) != (0 | a) && (b >>> 0 < h >>> 0 && sa(), (0 | f[b + 12 >> 2]) != (0 | k) && sa()), (0 | c) == (0 | b)) {
        f[51264] = f[51264] & ~(1 << d), r = k, e = j, m = k;
        break;
       }
       (0 | c) == (0 | a) ? g = c + 8 | 0 : (c >>> 0 < h >>> 0 && sa(), (0 | f[(a = c + 8 | 0) >> 2]) == (0 | k) ? g = a : sa()), f[b + 12 >> 2] = c, f[g >> 2] = b, r = k, e = j, m = k;
       break;
      }
      g = 0 | f[k + 24 >> 2], c = 0 | f[k + 12 >> 2];
      do {
       if ((0 | c) == (0 | k)) {
        if (c = k + 16 | 0, b = c + 4 | 0, !(a = 0 | f[b >> 2])) {
         if (!(a = 0 | f[c >> 2])) {
          i = 0;
          break;
         }
         b = c;
        }
        for (;;) if (c = a + 20 | 0, 0 | (d = 0 | f[c >> 2])) a = d, b = c; else {
         if (c = a + 16 | 0, !(d = 0 | f[c >> 2])) break;
         a = d, b = c;
        }
        if (!(b >>> 0 < h >>> 0)) {
         f[b >> 2] = 0, i = a;
         break;
        }
        sa();
       } else {
        if ((d = 0 | f[k + 8 >> 2]) >>> 0 < h >>> 0 && sa(), a = d + 12 | 0, (0 | f[a >> 2]) != (0 | k) && sa(), b = c + 8 | 0, (0 | f[b >> 2]) == (0 | k)) {
         f[a >> 2] = c, f[b >> 2] = d, i = c;
         break;
        }
        sa();
       }
      } while (0);
      if (g) {
       b = 205360 + ((a = 0 | f[k + 28 >> 2]) << 2) | 0, c = 0 == (0 | i);
       do {
        if ((0 | k) == (0 | f[b >> 2])) {
         if (f[b >> 2] = i, c) {
          f[51265] = f[51265] & ~(1 << a), r = k, e = j, m = k;
          break a;
         }
        } else {
         if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
          if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | k) & 1) << 2) >> 2] = i, c) {
           r = k, e = j, m = k;
           break a;
          }
          break;
         }
         sa();
        }
       } while (0);
       i >>> 0 < (c = 0 | f[51268]) >>> 0 && sa(), f[i + 24 >> 2] = g, b = 0 | f[(a = k + 16 | 0) >> 2];
       do {
        if (0 | b) {
         if (!(b >>> 0 < c >>> 0)) {
          f[i + 16 >> 2] = b, f[b + 24 >> 2] = i;
          break;
         }
         sa();
        }
       } while (0);
       if (a = 0 | f[a + 4 >> 2]) {
        if (!(a >>> 0 < (0 | f[51268]) >>> 0)) {
         f[i + 20 >> 2] = a, f[a + 24 >> 2] = i, r = k, e = j, m = k;
         break;
        }
        sa();
       } else r = k, e = j, m = k;
      } else r = k, e = j, m = k;
     }
    } while (0);
    if (m >>> 0 >= o >>> 0 && sa(), a = o + 4 | 0, 1 & (b = 0 | f[a >> 2]) || sa(), 2 & b) f[a >> 2] = -2 & b, f[r + 4 >> 2] = 1 | e, f[m + e >> 2] = e; else {
     if (a = 0 | f[51269], (0 | o) == (0 | f[51270])) {
      if (q = (0 | f[51267]) + e | 0, f[51267] = q, f[51270] = r, f[r + 4 >> 2] = 1 | q, (0 | r) != (0 | a)) return;
      return f[51269] = 0, void (f[51266] = 0);
     }
     if ((0 | o) == (0 | a)) return q = (0 | f[51266]) + e | 0, f[51266] = q, f[51269] = m, f[r + 4 >> 2] = 1 | q, void (f[m + q >> 2] = q);
     e = (-8 & b) + e | 0, d = b >>> 3;
     b: do {
      if (b >>> 0 < 256) {
       if (b = 0 | f[o + 8 >> 2], c = 0 | f[o + 12 >> 2], a = 205096 + (d << 1 << 2) | 0, (0 | b) != (0 | a) && (b >>> 0 < (0 | f[51268]) >>> 0 && sa(), (0 | f[b + 12 >> 2]) != (0 | o) && sa()), (0 | c) == (0 | b)) {
        f[51264] = f[51264] & ~(1 << d);
        break;
       }
       (0 | c) == (0 | a) ? l = c + 8 | 0 : (c >>> 0 < (0 | f[51268]) >>> 0 && sa(), (0 | f[(a = c + 8 | 0) >> 2]) == (0 | o) ? l = a : sa()), f[b + 12 >> 2] = c, f[l >> 2] = b;
      } else {
       g = 0 | f[o + 24 >> 2], a = 0 | f[o + 12 >> 2];
       do {
        if ((0 | a) == (0 | o)) {
         if (c = o + 16 | 0, b = c + 4 | 0, !(a = 0 | f[b >> 2])) {
          if (!(a = 0 | f[c >> 2])) {
           n = 0;
           break;
          }
          b = c;
         }
         for (;;) if (c = a + 20 | 0, 0 | (d = 0 | f[c >> 2])) a = d, b = c; else {
          if (c = a + 16 | 0, !(d = 0 | f[c >> 2])) break;
          a = d, b = c;
         }
         if (!(b >>> 0 < (0 | f[51268]) >>> 0)) {
          f[b >> 2] = 0, n = a;
          break;
         }
         sa();
        } else {
         if ((b = 0 | f[o + 8 >> 2]) >>> 0 < (0 | f[51268]) >>> 0 && sa(), c = b + 12 | 0, (0 | f[c >> 2]) != (0 | o) && sa(), d = a + 8 | 0, (0 | f[d >> 2]) == (0 | o)) {
          f[c >> 2] = a, f[d >> 2] = b, n = a;
          break;
         }
         sa();
        }
       } while (0);
       if (0 | g) {
        b = 205360 + ((a = 0 | f[o + 28 >> 2]) << 2) | 0, c = 0 == (0 | n);
        do {
         if ((0 | o) == (0 | f[b >> 2])) {
          if (f[b >> 2] = n, c) {
           f[51265] = f[51265] & ~(1 << a);
           break b;
          }
         } else {
          if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
           if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | o) & 1) << 2) >> 2] = n, c) break b;
           break;
          }
          sa();
         }
        } while (0);
        n >>> 0 < (c = 0 | f[51268]) >>> 0 && sa(), f[n + 24 >> 2] = g, b = 0 | f[(a = o + 16 | 0) >> 2];
        do {
         if (0 | b) {
          if (!(b >>> 0 < c >>> 0)) {
           f[n + 16 >> 2] = b, f[b + 24 >> 2] = n;
           break;
          }
          sa();
         }
        } while (0);
        if (0 | (a = 0 | f[a + 4 >> 2])) {
         if (!(a >>> 0 < (0 | f[51268]) >>> 0)) {
          f[n + 20 >> 2] = a, f[a + 24 >> 2] = n;
          break;
         }
         sa();
        }
       }
      }
     } while (0);
     if (f[r + 4 >> 2] = 1 | e, f[m + e >> 2] = e, (0 | r) == (0 | f[51269])) return void (f[51266] = e);
    }
    if (a = e >>> 3, e >>> 0 < 256) return c = 205096 + (a << 1 << 2) | 0, b = 0 | f[51264], a = 1 << a, b & a ? (b = 0 | f[(a = c + 8 | 0) >> 2]) >>> 0 < (0 | f[51268]) >>> 0 ? sa() : (p = b, q = a) : (f[51264] = b | a, p = c, q = c + 8 | 0), f[q >> 2] = r, f[p + 12 >> 2] = r, f[r + 8 >> 2] = p, void (f[r + 12 >> 2] = c);
    d = 205360 + ((a = (a = e >>> 8) ? e >>> 0 > 16777215 ? 31 : e >>> (7 + (a = 14 - ((o = (520192 + (q = a << (p = (a + 1048320 | 0) >>> 16 & 8)) | 0) >>> 16 & 4) | p | (a = (245760 + (q <<= o) | 0) >>> 16 & 2)) + (q << a >>> 15) | 0) | 0) & 1 | a << 1 : 0) << 2) | 0, f[r + 28 >> 2] = a, f[r + 20 >> 2] = 0, f[r + 16 >> 2] = 0, b = 0 | f[51265], c = 1 << a;
    do {
     if (b & c) {
      for (b = e << (31 == (0 | a) ? 0 : 25 - (a >>> 1) | 0), d = 0 | f[d >> 2]; ;) {
       if ((-8 & f[d + 4 >> 2] | 0) == (0 | e)) {
        a = 124;
        break;
       }
       if (c = d + 16 + (b >>> 31 << 2) | 0, !(a = 0 | f[c >> 2])) {
        a = 121;
        break;
       }
       b <<= 1, d = a;
      }
      if (121 == (0 | a)) {
       if (!(c >>> 0 < (0 | f[51268]) >>> 0)) {
        f[c >> 2] = r, f[r + 24 >> 2] = d, f[r + 12 >> 2] = r, f[r + 8 >> 2] = r;
        break;
       }
       sa();
      } else if (124 == (0 | a)) {
       if (a = d + 8 | 0, b = 0 | f[a >> 2], q = 0 | f[51268], b >>> 0 >= q >>> 0 & d >>> 0 >= q >>> 0) {
        f[b + 12 >> 2] = r, f[a >> 2] = r, f[r + 8 >> 2] = b, f[r + 12 >> 2] = d, f[r + 24 >> 2] = 0;
        break;
       }
       sa();
      }
     } else f[51265] = b | c, f[d >> 2] = r, f[r + 24 >> 2] = d, f[r + 12 >> 2] = r, f[r + 8 >> 2] = r;
    } while (0);
    if (r = (0 | f[51272]) - 1 | 0, f[51272] = r, !r) {
     for (a = 205512; a = 0 | f[a >> 2]; ) a = a + 8 | 0;
     f[51272] = -1;
    }
   }
  }
  function _c() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, t = 0, v = 0, w = 0;
   for (w = u, u = u + 480 | 0, a = w, f[10967] = 16, 0 | (c = 0 | f[18317]) && (tf(0 | f[10815], c, 0), 0 | rb(a, 1) && (f[10967] = f[a + 4 >> 2], d[168364] = f[a + 12 >> 2], d[168365] = f[a + 8 >> 2])), a = r = 0 | f[18334]; g = a + -1 | 0, a; ) 0 != (e = +n[(c = 73340 + (48 * g | 0) + 44 | 0) >> 2]) ? (n[18320] = e, n[s >> 2] = e, a = 0 | f[s >> 2]) : a = 0 | f[18320], f[c >> 2] = a, a = g;
   for (q = 0 | f[10804], a = 0, o = 0, t = -1, p = 0; (0 | p) != (0 | r); ) {
    o = (0 | (o = (0 | o) < (0 | (m = 0 | f[73340 + (48 * p | 0) + 28 >> 2])) ? m : o)) < 3 ? o : 3, c = 0 | X(0 | j[168360], 0 | j[168359]), i = 0 | f[73340 + (48 * p | 0) >> 2], g = 0 | X(k = 0 | f[73340 + (48 * p | 0) + 4 >> 2], i), l = 73340 + (48 * p | 0) + 8 | 0, (h = 0 | f[10958]) && (c = 0 | X(h, c), g = 0 | X(0 | f[l >> 2], g)), h = 0 | f[73340 + (48 * p | 0) + 12 >> 2];
    do {
     if (3 == (0 | m) & 6 == (0 | h)) c = t; else if ((k | i | 0) < 65536 & 0 != (0 | g)) {
      if ((0 | g) > (0 | c)) a = 1; else {
       if ((0 | g) != (0 | c)) {
        c = t;
        break;
       }
       if (g = a + 1 | 0, (0 | q) != (0 | a)) {
        c = t, a = g;
        break;
       }
       a = g;
      }
      d[168359] = i, d[168360] = k, f[10958] = f[l >> 2], f[10844] = h, f[10960] = f[73340 + (48 * p | 0) + 20 >> 2], f[18490] = f[73340 + (48 * p | 0) + 24 >> 2], f[10848] = m, f[10957] = f[73340 + (48 * p | 0) + 36 >> 2], f[10955] = f[73340 + (48 * p | 0) + 40 >> 2], f[18320] = f[73340 + (48 * p | 0) + 44 >> 2], c = p;
     } else c = t;
    } while (0);
    t = c, p = p + 1 | 0;
   }
   for (0 != (0 | a) & 1 == (0 | f[10956]) && (f[10956] = a), 0 | f[10957] || (f[10957] = 2147483647), 0 | f[10955] ? a = r : (f[10955] = 2147483647, a = r); c = a + -1 | 0, a; ) (a = 0 | f[73340 + (48 * c | 0) + 24 >> 2]) ? (f[18490] = a, a = c) : a = c;
   i = 73340 + (48 * t | 0) + 32 | 0;
   a: do {
    if (!((0 | t) < 0 | 0 != (0 | f[18282]))) {
     a = 0 | f[10844], h = 73340 + (48 * t | 0) + 16 | 0;
     b: do {
      if ((0 | a) < 32769) {
       c: do {
        if ((0 | a) < 7) {
         switch (0 | a) {
         case 6:
          break c;

         case 1:
         case 0:
          break;

         default:
          v = 70;
          break b;
         }
         if (r = 0 == (0 | _d(43072, 29554, 7)), a = 0 | f[i >> 2], c = 0 | X(0 | j[168359], 0 | j[168360]), r && (a << 1 | 0) == (3 * c | 0) && (f[10846] = 24), (5 * a | 0) != (c << 3 | 0)) {
          v = 44;
          break b;
         }
         f[10846] = 81, f[10958] = 12;
         break b;
        }
        if ((0 | a) < 262) switch (0 | a) {
        case 99:
        case 7:
         break c;

        default:
         v = 70;
         break b;
        }
        if ((0 | a) < 32767) {
         switch (0 | a) {
         case 262:
          break;

         default:
          v = 70;
          break b;
         }
         f[18282] = 6;
         break a;
        }
        switch (0 | a) {
        case 32767:
         break;

        default:
         v = 70;
         break b;
        }
        if (a = 0 | f[i >> 2], c = 0 | j[168360], g = 0 | X(c, 0 | j[168359]), (0 | a) == (0 | g)) {
         f[10958] = 12, f[18282] = 17;
         break a;
        }
        if ((a << 3 | 0) == (0 | X(0 | f[10958], g))) {
         f[10846] = 79, a = 80, v = 38;
         break b;
        }
        d[168360] = c + 8, f[18282] = 11;
        break a;
       } while (0);
       f[18282] = 3;
       break a;
      }
      if ((0 | a) < 34713) {
       switch (0 | a) {
       case 32867:
        break a;

       case 32773:
       case 32770:
        v = 44;
        break b;

       case 32769:
        break;

       default:
        v = 70;
        break b;
       }
       a = 1 + (0 | f[10846]) | 0, v = 38;
       break;
      }
      if ((0 | a) >= 65e3) {
       switch (0 | a) {
       case 65535:
        f[18282] = 21;
        break a;

       case 65e3:
        break;

       default:
        v = 70;
        break b;
       }
       if ((0 | (a = 0 | f[h >> 2])) < 6) {
        switch (0 | a) {
        case 2:
         break;

        default:
         break a;
        }
        f[18282] = 22, f[10812] = 0;
        break a;
       }
       if ((0 | a) < 32803) {
        switch (0 | a) {
        case 6:
         break;

        default:
         break a;
        }
        f[18282] = 23, f[10812] = 0;
        break a;
       }
       switch (0 | a) {
       case 32803:
        break;

       default:
        break a;
       }
       f[18282] = 24;
       break a;
      }
      switch (0 | a) {
      case 34892:
       break a;

      case 34713:
       break;

      default:
       v = 70;
       break b;
      }
      if (a = 0 | j[168359], c = 0 | j[168360], r = 0 | X(c << 4, ((a + 9 | 0) >>> 0) / 10 | 0), g = 0 | f[i >> 2], (0 | r) == (0 | g)) {
       f[18282] = 7, f[10846] = 1;
       break a;
      }
      if (a = 0 | X(c, a), (0 | (c = 3 * a | 0)) == (g << 1 | 0)) {
       if (f[18282] = 7, 78 != (0 | b[43136])) break a;
       f[10846] = 80;
       break a;
      }
      if ((0 | c) == (0 | g)) {
       f[18282] = 19, Ic(.4166666666666667, 12.92, 1, 4095), cg(336732, 0, 8204), f[10812] = 0;
       break a;
      }
      if ((a << 1 | 0) == (0 | g)) {
       f[18282] = 13, f[10846] = 4, d[102818] = 19789;
       break a;
      }
      f[18282] = 20;
      break a;
     } while (0);
     if (38 == (0 | v)) f[10846] = a, v = 44; else if (70 == (0 | v)) {
      f[10956] = 0;
      break;
     }
     d: do {
      if (44 == (0 | v)) {
       switch (0 | f[10958]) {
       case 12:
        break d;

       case 8:
        f[18282] = 5;
        break a;

       case 14:
        f[10846] = 0;
        break;

       case 16:
        break;

       default:
        break a;
       }
       if (f[18282] = 13, 0 | _d(43072, 29554, 7)) break a;
       if ((7 * (0 | f[i >> 2]) | 0) <= (0 | X(0 | j[168360], 0 | j[168359]))) break a;
       f[18282] = 18;
       break a;
      }
     } while (0);
     2 == (0 | f[h >> 2]) && (f[10846] = 6), f[18282] = 7;
    }
   } while (0);
   do {
    if (!(0 | f[10845])) {
     if (a = 0 | f[10958], 3 == (0 | f[10848]) && 14 != (0 | a) & 0 != (0 | f[i >> 2]) ? 32768 == (-16 & f[10844] | 0) && (v = 75) : v = 75, 75 == (0 | v)) {
      if (8 != (0 | a)) break;
      if (!(0 | _d(43072, 30271, 5))) break;
      if (0 | Wa(43072, 30277)) break;
      if (0 | xf(344976, 30283)) break;
     }
     f[10956] = 0;
    }
   } while (0);
   for (k = 0 | f[18334], h = -1, i = 0; (0 | i) != (0 | k); ) (0 | i) == (0 | t) ? a = h : (0 | f[73340 + (48 * i | 0) + 28 >> 2]) == (0 | o) ? (a = 0 | f[73340 + (48 * i | 0) >> 2], (q = (0 | (q = 0 | X(c = 0 | f[73340 + (48 * i | 0) + 4 >> 2], a))) / (1 + (0 | X(g = 0 | f[73340 + (48 * i | 0) + 8 >> 2], g)) | 0) | 0) >>> 0 > (((r = 0 | X(0 | j[168365], 0 | j[168364])) >>> 0) / ((1 + (0 | X(v = 0 | f[10967], v)) | 0) >>> 0) | 0) >>> 0 ? 34892 == (0 | f[73340 + (48 * i | 0) + 12 >> 2]) ? a = h : (d[168364] = a, d[168365] = c, f[18317] = f[73340 + (48 * i | 0) + 20 >> 2], f[10965] = f[73340 + (48 * i | 0) + 32 >> 2], f[10967] = g, a = i) : a = h) : a = h, h = a, i = i + 1 | 0;
   e: do {
    if ((0 | h) > -1) {
     if (f[10967] = f[10967] | f[73340 + (48 * h | 0) + 28 >> 2] << 5, (0 | (a = 0 | f[73340 + (48 * h | 0) + 12 >> 2])) < 1) {
      switch (0 | a) {
      case 0:
       break;

      default:
       break e;
      }
      f[18491] = 25;
      break;
     }
     if ((0 | a) >= 65e3) {
      switch (0 | a) {
      case 65e3:
       break;

      default:
       break e;
      }
      f[18492] = 6 == (0 | f[73340 + (48 * h | 0) + 16 >> 2]) ? 23 : 22;
      break;
     }
     switch (0 | a) {
     case 1:
      break;

     default:
      break e;
     }
     if ((0 | f[73340 + (48 * h | 0) + 8 >> 2]) < 9) {
      f[18491] = 26;
      break;
     }
     if (0 | Yd(43072, 30221)) {
      f[18492] = 28;
      break;
     }
     f[18491] = 27;
     break;
    }
   } while (0);
   u = w;
  }
  function Fd(a, b) {
   var c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
   o = (a |= 0) + (b |= 0) | 0, c = 0 | f[a + 4 >> 2];
   a: do {
    if (1 & c) r = a, e = b; else {
     if (g = 0 | f[a >> 2], !(3 & c)) return;
     if (l = a + (0 - g) | 0, k = g + b | 0, i = 0 | f[51268], l >>> 0 < i >>> 0 && sa(), (0 | l) == (0 | f[51269])) {
      if (c = o + 4 | 0, 3 != (3 & (a = 0 | f[c >> 2]) | 0)) {
       r = l, e = k;
       break;
      }
      return f[51266] = k, f[c >> 2] = -2 & a, f[l + 4 >> 2] = 1 | k, void (f[l + k >> 2] = k);
     }
     if (d = g >>> 3, g >>> 0 < 256) {
      if (c = 0 | f[l + 8 >> 2], b = 0 | f[l + 12 >> 2], a = 205096 + (d << 1 << 2) | 0, (0 | c) != (0 | a) && (c >>> 0 < i >>> 0 && sa(), (0 | f[c + 12 >> 2]) != (0 | l) && sa()), (0 | b) == (0 | c)) {
       f[51264] = f[51264] & ~(1 << d), r = l, e = k;
       break;
      }
      (0 | b) == (0 | a) ? h = b + 8 | 0 : (b >>> 0 < i >>> 0 && sa(), (0 | f[(a = b + 8 | 0) >> 2]) == (0 | l) ? h = a : sa()), f[c + 12 >> 2] = b, f[h >> 2] = c, r = l, e = k;
      break;
     }
     g = 0 | f[l + 24 >> 2], b = 0 | f[l + 12 >> 2];
     do {
      if ((0 | b) == (0 | l)) {
       if (b = l + 16 | 0, c = b + 4 | 0, !(a = 0 | f[c >> 2])) {
        if (!(a = 0 | f[b >> 2])) {
         j = 0;
         break;
        }
        c = b;
       }
       for (;;) if (b = a + 20 | 0, 0 | (d = 0 | f[b >> 2])) a = d, c = b; else {
        if (b = a + 16 | 0, !(d = 0 | f[b >> 2])) break;
        a = d, c = b;
       }
       if (!(c >>> 0 < i >>> 0)) {
        f[c >> 2] = 0, j = a;
        break;
       }
       sa();
      } else {
       if ((d = 0 | f[l + 8 >> 2]) >>> 0 < i >>> 0 && sa(), a = d + 12 | 0, (0 | f[a >> 2]) != (0 | l) && sa(), c = b + 8 | 0, (0 | f[c >> 2]) == (0 | l)) {
        f[a >> 2] = b, f[c >> 2] = d, j = b;
        break;
       }
       sa();
      }
     } while (0);
     if (g) {
      c = 205360 + ((a = 0 | f[l + 28 >> 2]) << 2) | 0, b = 0 == (0 | j);
      do {
       if ((0 | l) == (0 | f[c >> 2])) {
        if (f[c >> 2] = j, b) {
         f[51265] = f[51265] & ~(1 << a), r = l, e = k;
         break a;
        }
       } else {
        if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
         if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | l) & 1) << 2) >> 2] = j, b) {
          r = l, e = k;
          break a;
         }
         break;
        }
        sa();
       }
      } while (0);
      j >>> 0 < (b = 0 | f[51268]) >>> 0 && sa(), f[j + 24 >> 2] = g, c = 0 | f[(a = l + 16 | 0) >> 2];
      do {
       if (0 | c) {
        if (!(c >>> 0 < b >>> 0)) {
         f[j + 16 >> 2] = c, f[c + 24 >> 2] = j;
         break;
        }
        sa();
       }
      } while (0);
      if (a = 0 | f[a + 4 >> 2]) {
       if (!(a >>> 0 < (0 | f[51268]) >>> 0)) {
        f[j + 20 >> 2] = a, f[a + 24 >> 2] = j, r = l, e = k;
        break;
       }
       sa();
      } else r = l, e = k;
     } else r = l, e = k;
    }
   } while (0);
   if (h = 0 | f[51268], o >>> 0 < h >>> 0 && sa(), a = o + 4 | 0, 2 & (c = 0 | f[a >> 2])) f[a >> 2] = -2 & c, f[r + 4 >> 2] = 1 | e, f[r + e >> 2] = e; else {
    if (a = 0 | f[51269], (0 | o) == (0 | f[51270])) {
     if (q = (0 | f[51267]) + e | 0, f[51267] = q, f[51270] = r, f[r + 4 >> 2] = 1 | q, (0 | r) != (0 | a)) return;
     return f[51269] = 0, void (f[51266] = 0);
    }
    if ((0 | o) == (0 | a)) return q = (0 | f[51266]) + e | 0, f[51266] = q, f[51269] = r, f[r + 4 >> 2] = 1 | q, void (f[r + q >> 2] = q);
    e = (-8 & c) + e | 0, d = c >>> 3;
    b: do {
     if (c >>> 0 < 256) {
      if (c = 0 | f[o + 8 >> 2], b = 0 | f[o + 12 >> 2], a = 205096 + (d << 1 << 2) | 0, (0 | c) != (0 | a) && (c >>> 0 < h >>> 0 && sa(), (0 | f[c + 12 >> 2]) != (0 | o) && sa()), (0 | b) == (0 | c)) {
       f[51264] = f[51264] & ~(1 << d);
       break;
      }
      (0 | b) == (0 | a) ? m = b + 8 | 0 : (b >>> 0 < h >>> 0 && sa(), (0 | f[(a = b + 8 | 0) >> 2]) == (0 | o) ? m = a : sa()), f[c + 12 >> 2] = b, f[m >> 2] = c;
     } else {
      g = 0 | f[o + 24 >> 2], b = 0 | f[o + 12 >> 2];
      do {
       if ((0 | b) == (0 | o)) {
        if (b = o + 16 | 0, c = b + 4 | 0, !(a = 0 | f[c >> 2])) {
         if (!(a = 0 | f[b >> 2])) {
          n = 0;
          break;
         }
         c = b;
        }
        for (;;) if (b = a + 20 | 0, 0 | (d = 0 | f[b >> 2])) a = d, c = b; else {
         if (b = a + 16 | 0, !(d = 0 | f[b >> 2])) break;
         a = d, c = b;
        }
        if (!(c >>> 0 < h >>> 0)) {
         f[c >> 2] = 0, n = a;
         break;
        }
        sa();
       } else {
        if ((d = 0 | f[o + 8 >> 2]) >>> 0 < h >>> 0 && sa(), a = d + 12 | 0, (0 | f[a >> 2]) != (0 | o) && sa(), c = b + 8 | 0, (0 | f[c >> 2]) == (0 | o)) {
         f[a >> 2] = b, f[c >> 2] = d, n = b;
         break;
        }
        sa();
       }
      } while (0);
      if (0 | g) {
       c = 205360 + ((a = 0 | f[o + 28 >> 2]) << 2) | 0, b = 0 == (0 | n);
       do {
        if ((0 | o) == (0 | f[c >> 2])) {
         if (f[c >> 2] = n, b) {
          f[51265] = f[51265] & ~(1 << a);
          break b;
         }
        } else {
         if (!(g >>> 0 < (0 | f[51268]) >>> 0)) {
          if (f[g + 16 + (((0 | f[g + 16 >> 2]) != (0 | o) & 1) << 2) >> 2] = n, b) break b;
          break;
         }
         sa();
        }
       } while (0);
       n >>> 0 < (b = 0 | f[51268]) >>> 0 && sa(), f[n + 24 >> 2] = g, c = 0 | f[(a = o + 16 | 0) >> 2];
       do {
        if (0 | c) {
         if (!(c >>> 0 < b >>> 0)) {
          f[n + 16 >> 2] = c, f[c + 24 >> 2] = n;
          break;
         }
         sa();
        }
       } while (0);
       if (0 | (a = 0 | f[a + 4 >> 2])) {
        if (!(a >>> 0 < (0 | f[51268]) >>> 0)) {
         f[n + 20 >> 2] = a, f[a + 24 >> 2] = n;
         break;
        }
        sa();
       }
      }
     }
    } while (0);
    if (f[r + 4 >> 2] = 1 | e, f[r + e >> 2] = e, (0 | r) == (0 | f[51269])) return void (f[51266] = e);
   }
   if (a = e >>> 3, e >>> 0 < 256) return b = 205096 + (a << 1 << 2) | 0, c = 0 | f[51264], a = 1 << a, c & a ? (c = 0 | f[(a = b + 8 | 0) >> 2]) >>> 0 < (0 | f[51268]) >>> 0 ? sa() : (p = c, q = a) : (f[51264] = c | a, p = b, q = b + 8 | 0), f[q >> 2] = r, f[p + 12 >> 2] = r, f[r + 8 >> 2] = p, void (f[r + 12 >> 2] = b);
   if (a = e >>> 8, a = a ? e >>> 0 > 16777215 ? 31 : e >>> (7 + (a = 14 - ((o = (520192 + (q = a << (p = (a + 1048320 | 0) >>> 16 & 8)) | 0) >>> 16 & 4) | p | (a = (245760 + (q <<= o) | 0) >>> 16 & 2)) + (q << a >>> 15) | 0) | 0) & 1 | a << 1 : 0, d = 205360 + (a << 2) | 0, f[r + 28 >> 2] = a, f[r + 20 >> 2] = 0, f[r + 16 >> 2] = 0, c = 0 | f[51265], b = 1 << a, !(c & b)) return f[51265] = c | b, f[d >> 2] = r, f[r + 24 >> 2] = d, f[r + 12 >> 2] = r, void (f[r + 8 >> 2] = r);
   for (c = e << (31 == (0 | a) ? 0 : 25 - (a >>> 1) | 0), d = 0 | f[d >> 2]; ;) {
    if ((-8 & f[d + 4 >> 2] | 0) == (0 | e)) {
     a = 121;
     break;
    }
    if (b = d + 16 + (c >>> 31 << 2) | 0, !(a = 0 | f[b >> 2])) {
     a = 118;
     break;
    }
    c <<= 1, d = a;
   }
   return 118 == (0 | a) ? (b >>> 0 < (0 | f[51268]) >>> 0 && sa(), f[b >> 2] = r, f[r + 24 >> 2] = d, f[r + 12 >> 2] = r, void (f[r + 8 >> 2] = r)) : 121 == (0 | a) ? (a = d + 8 | 0, c = 0 | f[a >> 2], q = 0 | f[51268], c >>> 0 >= q >>> 0 & d >>> 0 >= q >>> 0 || sa(), f[c + 12 >> 2] = r, f[a >> 2] = r, f[r + 8 >> 2] = c, f[r + 12 >> 2] = d, void (f[r + 24 >> 2] = 0)) : void 0;
  }
  function bd(a, c, e) {
   a |= 0, c |= 0, e |= 0;
   var g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   v = u, u = u + 16 | 0, f[(t = v) >> 2] = 1173554192, tf(0 | f[10815], a + -4 + c | 0, 0), c = (0 | $a()) + a | 0, tf(0 | f[10815], c, 0), c = 65535 & (0 | Za());
   a: do {
    if ((c | e | 0) <= 127) for (r = e + 1 | 0, s = t + 2 | 0, i = -1, j = 1040; ;) {
     if (q = c + -1 | 0, !c) break a;
     l = 0 | Za(), m = 0 | $a(), o = 4 + (0 | Pf(0 | f[10815])) | 0, tf(h = 0 | f[10815], (0 | $a()) + a | 0, 0), 56 == (8 | 8 + ((65535 & l) >>> 8)) && bd(0 | Pf(0 | f[10815]), m, r);
     b: do {
      switch (l << 16 >> 16) {
      case 2064:
       Of(361424, 64, 1, 0 | f[10815]), c = i, e = j;
       break;

      case 2058:
       Of(43072, 64, 1, 0 | f[10815]), tf(0 | f[10815], (0 | Ne(43072)) - 63 | 0, 1), Of(43136, 64, 1, 0 | f[10815]), c = i, e = j;
       break;

      case 6160:
       c = 65535 & (0 | $a()), d[168356] = c, c = 65535 & (0 | $a()), d[168355] = c, g = +bb(0 | $a()), p[5401] = g, c = 0 | $a(), f[18321] = c, c = i, e = j;
       break;

      case 6197:
       c = 0 | $a(), f[10844] = c, c = i, e = j;
       break;

      case 8199:
       c = 0 | Pf(0 | f[10815]), f[18317] = c, f[10965] = m, c = i, e = j;
       break;

      case 6168:
       $a(), g = +la(+ - +bb(0 | $a())), n[18320] = g, g = +la(.5 * +bb(0 | $a())), n[18319] = g, c = i, e = j;
       break;

      case 4138:
       $a(), g = 50 * +la(+(.03125 * +(65535 & (0 | Za())) - 4)), n[18318] = g, Za(), g = +la(.015625 * +((0 | Za()) << 16 >> 16)), n[18319] = g, g = +la(.03125 * +(0 - ((0 | Za()) << 16 >> 16) | 0)), n[18320] = g, Za(), c = (65535 & (c = 0 | Za())) > 17 ? 0 : 65535 & c, tf(0 | f[10815], 32, 1), +n[18320] > 1e6 ? (g = +(65535 & (0 | Za())) / 10, n[18320] = g, e = j) : e = j;
       break;

      case 4140:
       if (k = (65535 & (0 | Za())) > 512, c = 0 | f[10815], k) for (tf(c, 118, 1), c = 0; ;) {
        if (4 == (0 | c)) {
         c = i, e = j, k = 42;
         break b;
        }
        g = +(65535 & (0 | Za())), n[43844 + ((2 ^ c) << 2) >> 2] = g, c = c + 1 | 0;
       } else for (tf(c, 98, 1), c = 0; ;) {
        if (4 == (0 | c)) {
         c = i, e = j, k = 42;
         break b;
        }
        g = +(65535 & (0 | Za())), n[43844 + ((1 ^ c ^ c >> 1) << 2) >> 2] = g, c = c + 1 | 0;
       }

      case 50:
       if (h = 0 != (0 | i), 768 == (0 | m)) {
        for (tf(0 | f[10815], 72, 1), c = 0; 4 != (0 | c); ) g = 1024 / +(65535 & (0 | Za())), n[43844 + ((c >> 1 ^ c) << 2) >> 2] = g, c = c + 1 | 0;
        if (h) {
         c = i, e = j, k = 42;
         break b;
        }
        n[10961] = -1, c = 0, e = j, k = 42;
        break b;
       }
       if (0 != +n[10961]) c = i, e = j; else {
        for ((0 | Za()) << 16 >> 16 == j << 16 >> 16 ? (c = 0 != (0 | xf(43136, 30348)), c = (0 | b[(c ? 30353 : 30372) + i >> 0]) - 46 | 0, e = j) : (c = (0 | b[30391 + i >> 0]) - 48 | 0, d[s >> 1] = 0, d[t >> 1] = 0, e = 0), tf(0 | f[10815], 78 + (c << 3) | 0, 1), c = 0; 4 != (0 | c); ) k = 0 | Za(), n[43844 + ((1 ^ c ^ c >> 1) << 2) >> 2] = +(65535 & (d[t + ((1 & c) << 1) >> 1] ^ k)), c = c + 1 | 0;
        h ? (c = i, k = 42) : (n[10961] = -1, c = 0, k = 42);
       }
       break;

      case 4265:
       for (c = (0 | m) > 66 ? (0 | b[30410 + i >> 0]) - 48 | 0 : i, tf(0 | f[10815], c << 3 | 2, 1), e = 0; ;) {
        if (4 == (0 | e)) {
         e = j, k = 42;
         break b;
        }
        g = +(65535 & (0 | Za())), n[43844 + ((e >> 1 ^ e) << 2) >> 2] = g, e = e + 1 | 0;
       }

      default:
       c = i, e = j, k = 42;
      }
     } while (0);
     c: do {
      if (42 == (0 | k)) {
       if (k = 0, g = +bb(m), l << 16 >> 16 >= 22542) switch (l << 16 >> 16) {
       case 22547:
        n[10820] = g;
        break c;

       case 22548:
        n[10821] = g;
        break c;

       case 22580:
        f[10847] = m;
        break c;

       case 22542:
        f[18316] = m;
        break c;

       default:
        break c;
       }
       if (l << 16 >> 16 < 6158) {
        switch (l << 16 >> 16) {
        case 4144:
         break;

        case 4145:
         Za(), m = 0 | Za(), d[168359] = m, m = 0 | Za(), d[168360] = m;
         break c;

        default:
         break c;
        }
        if (!(98368 >>> c & 1)) break;
        ad();
        break;
       }
       if (l << 16 >> 16 < 20521) {
        switch (l << 16 >> 16) {
        case 6158:
         break;

        default:
         break c;
        }
        m = 0 | $a(), f[18316] = m;
        break;
       }
       switch (l << 16 >> 16) {
       case 20521:
        break;

       default:
        break c;
       }
       g = +(m >> 16 | 0), n[18455] = g, 2 == (65535 & m | 0) && (n[18455] = .03125 * g);
      }
     } while (0);
     tf(0 | f[10815], o, 0), i = c, c = q, j = e;
    }
   } while (0);
   u = v;
  }
  function Sd(a, c) {
   a |= 0, c |= 0;
   var d = 0, e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   a: do {
    if (c >>> 0 > 36) f[5745] = 22, d = 0, c = 0; else {
     o = a + 4 | 0, p = a + 100 | 0;
     do {
      (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a);
     } while (0 != (0 | Ud(d)));
     b: do {
      switch (0 | d) {
      case 43:
      case 45:
       if (d = (45 == (0 | d)) << 31 >> 31, (e = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0) {
        f[o >> 2] = e + 1, n = d, d = 0 | h[e >> 0];
        break b;
       }
       n = d, d = 0 | Td(a);
       break b;

      default:
       n = 0;
      }
     } while (0);
     e = 0 == (0 | c);
     do {
      if (16 == (16 | c) & 48 == (0 | d)) {
       if ((d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), 120 != (32 | d)) {
        if (e) {
         c = 8, l = 43;
         break;
        }
        l = 29;
        break;
       }
       if ((d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), (0 | h[40344 + d >> 0]) > 15) {
        0 | f[p >> 2] && (f[o >> 2] = (0 | f[o >> 2]) - 1), Rd(a, 0), d = 0, c = 0;
        break a;
       }
       c = 16, l = 43;
      } else {
       if (c = e ? 10 : c, !((0 | h[40344 + d >> 0]) >>> 0 < c >>> 0)) {
        0 | f[p >> 2] && (f[o >> 2] = (0 | f[o >> 2]) - 1), Rd(a, 0), f[5745] = 22, d = 0, c = 0;
        break a;
       }
       l = 29;
      }
     } while (0);
     c: do {
      if (29 == (0 | l)) if (10 == (0 | c)) {
       if ((c = d + -48 | 0) >>> 0 < 10) {
        e = 0;
        do {
         e = (10 * e | 0) + c | 0, (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), c = d + -48 | 0;
        } while (e >>> 0 < 429496729 & c >>> 0 < 10);
        c = e, e = 0;
       } else c = 0, e = 0;
       if ((g = d + -48 | 0) >>> 0 < 10) {
        k = c;
        do {
         if (c = 0 | lg(0 | k, 0 | e, 10, 0), i = I, j = ((0 | g) < 0) << 31 >> 31, m = ~j, i >>> 0 > m >>> 0 | (0 | i) == (0 | m) & c >>> 0 > ~g >>> 0) {
          c = 10, i = k, l = 69;
          break c;
         }
         k = 0 | bg(0 | c, 0 | i, 0 | g, 0 | j), e = I, (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), g = d + -48 | 0;
        } while ((e >>> 0 < 429496729 | 429496729 == (0 | e) & k >>> 0 < 2576980378) & g >>> 0 < 10);
        g >>> 0 > 9 ? (g = n, c = k, d = e) : (c = 10, i = k, l = 69);
       } else g = n, d = e;
      } else l = 43;
     } while (0);
     d: do {
      if (43 == (0 | l)) {
       if (i = 0 | b[40344 + d >> 0], e = 255 & i, g = e >>> 0 < c >>> 0, !(c + -1 & c)) {
        if (l = 0 | b[40600 + ((23 * c | 0) >>> 5 & 7) >> 0], g) {
         i = 0;
         do {
          i = i << l | e, (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), e = 255 & (g = 0 | b[40344 + d >> 0]);
         } while (i >>> 0 < 134217728 & e >>> 0 < c >>> 0);
         e = 0;
        } else g = i, e = 0, i = 0;
        if (j = 0 | fg(-1, -1, 0 | l), k = I, (255 & g) >>> 0 >= c >>> 0 | e >>> 0 > k >>> 0 | (0 | e) == (0 | k) & i >>> 0 > j >>> 0) {
         l = 69;
         break;
        }
        for (;;) if (i = 0 | dg(0 | i, 0 | e, 0 | l), e = I, i |= 255 & g, (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), g = 0 | b[40344 + d >> 0], e >>> 0 > k >>> 0 | (0 | e) == (0 | k) & i >>> 0 > j >>> 0 | (255 & g) >>> 0 >= c >>> 0) {
         l = 69;
         break d;
        }
       }
       if (g) {
        i = 0;
        do {
         i = (0 | X(i, c)) + e | 0, (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), e = 255 & (g = 0 | b[40344 + d >> 0]);
        } while (i >>> 0 < 119304647 & e >>> 0 < c >>> 0);
        e = 0;
       } else g = i, i = 0, e = 0;
       if ((255 & g) >>> 0 < c >>> 0) for (l = 0 | jg(-1, -1, 0 | c, 0), m = I; ;) {
        if (e >>> 0 > m >>> 0 | (0 | e) == (0 | m) & i >>> 0 > l >>> 0) {
         l = 69;
         break d;
        }
        if (j = 0 | lg(0 | i, 0 | e, 0 | c, 0), k = I, g &= 255, k >>> 0 > 4294967295 | -1 == (0 | k) & j >>> 0 > ~g >>> 0) {
         l = 69;
         break d;
        }
        if (i = 0 | bg(0 | j, 0 | k, 0 | g, 0), e = I, (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a), (255 & (g = 0 | b[40344 + d >> 0])) >>> 0 >= c >>> 0) {
         l = 69;
         break;
        }
       } else l = 69;
      }
     } while (0);
     if (69 == (0 | l)) if ((0 | h[40344 + d >> 0]) >>> 0 < c >>> 0) {
      do {
       (d = 0 | f[o >> 2]) >>> 0 < (0 | f[p >> 2]) >>> 0 ? (f[o >> 2] = d + 1, d = 0 | h[d >> 0]) : d = 0 | Td(a);
      } while ((0 | h[40344 + d >> 0]) >>> 0 < c >>> 0);
      f[5745] = 34, g = 0, c = -1, d = -1;
     } else g = n, c = i, d = e;
     0 | f[p >> 2] && (f[o >> 2] = (0 | f[o >> 2]) - 1), c = 0 | ag(c ^ g | 0, d ^ (p = ((0 | g) < 0) << 31 >> 31) | 0, 0 | g, 0 | p), d = I;
    }
   } while (0);
   return I = d, 0 | c;
  }
  function De(a, b, c, d, e) {
   b |= 0, c |= 0, d |= 0, e |= 0;
   var g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0;
   (i = 0 | f[(w = 4 + (a |= 0) | 0) >> 2]) >>> 0 < (0 | f[(v = a + 100 | 0) >> 2]) >>> 0 ? (f[w >> 2] = i + 1, i = 0 | h[i >> 0], j = 0) : (i = 0 | Td(a), j = 0);
   a: for (;;) {
    switch (0 | i) {
    case 46:
     n = 8;
     break a;

    case 48:
     break;

    default:
     s = 0, t = 0, p = 1, g = 0, u = 0, r = j, q = 0, m = 0, k = 0, j = 0;
     break a;
    }
    (i = 0 | f[w >> 2]) >>> 0 < (0 | f[v >> 2]) >>> 0 ? (f[w >> 2] = i + 1, i = 0 | h[i >> 0], j = 1) : (i = 0 | Td(a), j = 1);
   }
   if (8 == (0 | n)) if ((i = 0 | f[w >> 2]) >>> 0 < (0 | f[v >> 2]) >>> 0 ? (f[w >> 2] = i + 1, i = 0 | h[i >> 0]) : i = 0 | Td(a), 48 == (0 | i)) {
    k = 0, j = 0;
    do {
     (i = 0 | f[w >> 2]) >>> 0 < (0 | f[v >> 2]) >>> 0 ? (f[w >> 2] = i + 1, i = 0 | h[i >> 0]) : i = 0 | Td(a), k = 0 | bg(0 | k, 0 | j, -1, -1), j = I;
    } while (48 == (0 | i));
    s = 1, t = 0, p = 1, g = 0, u = 0, r = 1, q = 0, m = 0;
   } else s = 1, t = 0, p = 1, g = 0, u = 0, r = j, q = 0, m = 0, k = 0, j = 0;
   for (;n = i + -48 | 0, o = 46 == (0 | i), !(n >>> 0 >= 10) || o | ((32 | i) - 97 | 0) >>> 0 < 6; ) {
    if (o) {
     if (s) {
      i = 46;
      break;
     }
     s = 1, n = t, l = p, i = u, k = m, j = q;
    } else {
     i = (0 | i) > 57 ? (32 | i) - 87 | 0 : n;
     do {
      if (!((0 | q) < 0 | 0 == (0 | q) & m >>> 0 < 8)) {
       if ((0 | q) < 0 | 0 == (0 | q) & m >>> 0 < 14) {
        n = t, l = p *= .0625, g += p * +(0 | i), i = u;
        break;
       }
       n = (i = 0 != (0 | t) | 0 == (0 | i)) ? t : 1, l = p, g = i ? g : g + .5 * p, i = u;
       break;
      }
      n = t, l = p, i = i + (u << 4) | 0;
     } while (0);
     m = 0 | bg(0 | m, 0 | q, 1, 0), r = 1, q = I;
    }
    (o = 0 | f[w >> 2]) >>> 0 < (0 | f[v >> 2]) >>> 0 ? (f[w >> 2] = o + 1, t = n, p = l, u = i, i = 0 | h[o >> 0]) : (t = n, p = l, u = i, i = 0 | Td(a));
   }
   do {
    if (r) {
     if (n = 0 == (0 | s), o = n ? m : k, n = n ? q : j, (0 | q) < 0 | 0 == (0 | q) & m >>> 0 < 8) {
      j = u, k = q;
      do {
       j <<= 4, m = 0 | bg(0 | m, 0 | k, 1, 0), k = I;
      } while ((0 | k) < 0 | 0 == (0 | k) & m >>> 0 < 8);
      m = j;
     } else m = u;
     if (112 == (32 | i)) {
      if (j = 0 | Fe(a, e), i = I, 0 == (0 | j) & -2147483648 == (0 | i)) {
       if (!e) {
        Rd(a, 0), g = 0;
        break;
       }
       0 | f[v >> 2] ? (f[w >> 2] = (0 | f[w >> 2]) - 1, j = 0, i = 0) : (j = 0, i = 0);
      }
     } else 0 | f[v >> 2] ? (f[w >> 2] = (0 | f[w >> 2]) - 1, j = 0, i = 0) : (j = 0, i = 0);
     if (k = 0 | dg(0 | o, 0 | n, 2), k = 0 | bg(0 | k, 0 | I, -32, -1), k = 0 | bg(0 | k, 0 | I, 0 | j, 0 | i), i = I, !m) {
      g = 0 * +(0 | d);
      break;
     }
     if (w = 0 - c | 0, e = ((0 | w) < 0) << 31 >> 31, (0 | i) > (0 | e) | (0 | i) == (0 | e) & k >>> 0 > w >>> 0) {
      f[5745] = 34, g = 1.7976931348623157e308 * +(0 | d) * 1.7976931348623157e308;
      break;
     }
     if (w = c + -106 | 0, e = ((0 | w) < 0) << 31 >> 31, (0 | i) < (0 | e) | (0 | i) == (0 | e) & k >>> 0 < w >>> 0) {
      f[5745] = 34, g = 2.2250738585072014e-308 * +(0 | d) * 2.2250738585072014e-308;
      break;
     }
     if ((0 | m) > -1) {
      j = m;
      do {
       j = j << 1 | 1 & (1 ^ (w = !(g >= .5))), g += w ? g : g + -1, k = 0 | bg(0 | k, 0 | i, -1, -1), i = I;
      } while ((0 | j) > -1);
      p = g;
     } else p = g, j = m;
     w = ((0 | b) < 0) << 31 >> 31, i = 0 | bg(0 | k, 0 | i, 0 | (c = 0 | ag(32, 0, 0 | c, ((0 | c) < 0) << 31 >> 31 | 0)), 0 | I), l = +(0 | d), (0 | w) > (0 | (c = I)) | (0 | w) == (0 | c) & b >>> 0 > i >>> 0 ? (0 | i) > 0 ? (b = i, n = 58) : (i = 0, b = 84, n = 59) : n = 58, 58 == (0 | n) && ((0 | b) < 53 ? (i = b, b = 84 - b | 0, n = 59) : g = 0), 59 == (0 | n) && (g = +He(+Ge(1, b), l), b = i), 0 == (g = l * ((d = 0 == (1 & j | 0) & 0 != p & (0 | b) < 32) ? 0 : p) + (g + l * +(((1 & d) + j | 0) >>> 0)) - g) && (f[5745] = 34), g = +Je(g, k);
    } else (b = 0 != (0 | f[v >> 2])) && (f[w >> 2] = (0 | f[w >> 2]) - 1), e ? b && (b = 0 | f[w >> 2], f[w >> 2] = b + -1, 0 | s && (f[w >> 2] = b + -2)) : Rd(a, 0), g = 0 * +(0 | d);
   } while (0);
   return +g;
  }
  function Oc() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0;
   for (O = u, u = u + 16 | 0, M = O, c = 0 | f[10807], N = 0 | f[10824], a = 0; (0 | a) != (0 | N); ) f[M + (a << 2) >> 2] = ~~(32e3 * +n[43264 + (a << 2) >> 2]), a = a + 1 | 0;
   for (c = 4 - c | 0, L = 0, a = 1; !(a >>> 0 >= N >>> 0); ) L = +n[43264 + (L << 2) >> 2] < +n[43264 + (a << 2) >> 2] ? a : L, a = a + 1 | 0;
   for (E = +Ve(c), G = 4 >>> (65535 & (a = 0 | d[168357])), H = 0 | Cd(F = ((0 | j[168355]) >>> 0) / (G >>> 0) | 0, (G = ((0 | j[168356]) >>> 0) / (G >>> 0) | 0) << 2), J = (I = 0 | X(G, F)) << 2, K = ~~(32 / E), D = 0 | d[168357], C = 0; (0 | C) != (0 | N); ) {
    a: do {
     if ((0 | C) != (0 | L)) {
      cg(0 | H, 0, 0 | J), A = M + (C << 2) | 0, t = 4 >>> (65535 & a), B = 0 | f[10822], v = 0 | j[168356], w = 0 | X(t, t), c = 0;
      b: for (;;) {
       if (c >>> 0 >= F >>> 0) {
        q = K;
        break;
       }
       for (x = c + 1 | 0, y = 0 | X(c, t), z = 0 | X(x, t), o = 0 | X(c, G), m = 0; ;) {
        if (m >>> 0 >= G >>> 0) {
         c = x;
         continue b;
        }
        for (p = m + 1 | 0, q = 0 | X(m, t), r = 0 | X(p, t), g = 0, i = 0, l = y, c = 0; !(l >>> 0 >= z >>> 0); ) {
         for (s = 0 | X(l, v), k = q; !(k >>> 0 >= r >>> 0); ) 1 == (0 | (65535 & (h = 0 | d[B + ((e = k + s | 0) << 3) + (C << 1) >> 1]) | 0) / (0 | f[A >> 2])) && (g = (e = (65535 & (P = 0 | d[B + (e << 3) + (L << 1) >> 1])) > 24e3) ? g + +(65535 & h) : g, i = e ? i + +(65535 & P) : i, c = (1 & e) + c | 0), k = k + 1 | 0;
         l = l + 1 | 0;
        }
        (0 | c) == (0 | w) ? (n[H + (m + o << 2) >> 2] = g / i, m = p) : m = p;
       }
      }
      for (;;) {
       if (!q) {
        c = 0;
        break;
       }
       for (m = 0, q = q + -1 | 0; ;) {
        if (m >>> 0 >= F >>> 0) {
         h = 0, c = 0;
         break;
        }
        for (o = 0 | X(m, G), l = 0; !(l >>> 0 >= G >>> 0); ) {
         if (p = H + (l + o << 2) | 0, 0 == +n[p >> 2]) {
          for (k = 0, g = 0, c = 0; 8 != (0 | k); ) (e = (0 | b[29501 + (k << 1) >> 0]) + m | 0) >>> 0 < F >>> 0 & (h = (0 | b[29501 + (k << 1) + 1 >> 0]) + l | 0) >>> 0 < G >>> 0 && (e = H + ((0 | X(e, G)) + h << 2) | 0, i = +n[e >> 2], e = 1 + (1 & k) | 0, i > 0 && (g += +(e >>> 0) * i, c = e + c | 0)), k = k + 1 | 0;
          (0 | c) > 3 && (n[p >> 2] = -(E + g) / (E + +(0 | c)));
         }
         l = l + 1 | 0;
        }
        m = m + 1 | 0;
       }
       for (;!(h >>> 0 >= I >>> 0); ) (g = +n[(e = H + (h << 2) | 0) >> 2]) < 0 && (n[e >> 2] = -g, c = 1), h = h + 1 | 0;
       if (!c) {
        c = 0;
        break;
       }
      }
      for (;;) {
       if (c >>> 0 >= I >>> 0) {
        s = 0;
        break;
       }
       0 == +n[(e = H + (c << 2) | 0) >> 2] && (n[e >> 2] = 1), c = c + 1 | 0;
      }
      c: for (;;) {
       if (s >>> 0 >= F >>> 0) break a;
       q = s + 1 | 0, r = 0 | X(s, G), p = 0;
       d: for (;;) {
        if (p >>> 0 >= G >>> 0) {
         s = q;
         continue c;
        }
        for (m = p + 1 | 0, o = H + (p + r << 2) | 0, l = 0 | X(4 >>> (65535 & a), s); ;) {
         if (c = 4 >>> (65535 & a), l >>> 0 >= (0 | X(c, q)) >>> 0) {
          p = m;
          continue d;
         }
         for (k = 0 | X(c, p); !(k >>> 0 >= (0 | X(4 >>> (65535 & a), m)) >>> 0); ) c = (0 | X(0 | j[168356], l)) + k | 0, (0 | (0 | (h = 0 | j[(e = B + (c << 3) + (C << 1) | 0) >> 1])) / (0 | f[A >> 2])) > 1 && (0 | h) < (0 | (c = ~~(+(0 | j[B + (c << 3) + (L << 1) >> 1]) * +n[o >> 2]))) && (d[e >> 1] = (0 | c) > 0 ? 65535 & ((0 | c) < 65535 ? c : 65535) : 0, a = D), k = k + 1 | 0;
         l = l + 1 | 0;
        }
       }
      }
     }
    } while (0);
    C = C + 1 | 0;
   }
   Bd(H), u = O;
  }
  function Gc() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0;
   D = u, u = u + 32 | 0, C = D, A = 0 | f[18282], p = 0 | d[172468];
   a: do {
    if (p << 16 >> 16) {
     x = 1 & (1 ^ (w = 0 != (0 | f[18283]))), y = 0 | f[10837], z = 0 | f[10822], i = 0 | f[10812], k = 1 & w, l = 0 | j[168360], m = 0 | j[168359], n = 0 | j[168357], o = 0 | j[168358], h = 0;
     b: for (;;) {
      if ((0 | h) >= (l - ((0 | j[102816]) << 1) | 0)) break a;
      for (q = h + 1 | 0, g = h >> k, a = 0; ;) {
       for (r = (s = 65535 & p) << x, s = s + -1 | 0, t = 0 | j[168355], v = 0 | j[168356]; ;) {
        if ((0 | a) >= (0 | r)) {
         h = q;
         continue b;
        }
        if (b = a + 1 | 0, c = s + (g - (a >> x)) | 0, e = ((w ? q : b) >> 1) + (w ? a : h) | 0, c >>> 0 < t >>> 0 & e >>> 0 < v >>> 0) break;
        a = b;
       }
       t = 0 | X((0 | j[102816]) + h | 0, m), v = z + ((0 | X(c >>> n, o)) + (e >>> n) << 3) + ((i >>> ((c << 1 & 14 | 1 & e) << 1) & 3) << 1) | 0, d[v >> 1] = 0 | d[y + ((0 | j[102817]) + a + t << 1) >> 1], a = b;
      }
     }
    } else for (a = 0; ;) {
     if (!((0 | a) < (0 | j[168355]))) break a;
     for (b = 0; !((0 | b) >= (0 | j[168356])); ) y = 0 | X((0 | j[102816]) + a | 0, 0 | j[168359]), y = 0 | d[(0 | f[10837]) + ((0 | j[102817]) + b + y << 1) >> 1], z = (x = 0 | f[10822]) + ((z = (0 | X(a >> (z = 0 | j[168357]), 0 | j[168358])) + (b >> z) | 0) << 3) + ((0 | Ua(a, b)) << 1) | 0, d[z >> 1] = y, b = b + 1 | 0;
     a = a + 1 | 0;
    }
   } while (0);
   a = 0 | f[18287], v = 1 == (0 | A);
   c: do {
    if ((0 | a) <= 0) {
     do {
      if (2 == (0 | A) | 3 == (0 | A)) B = 2 + (0 | f[18289]) | 0, f[18289] = B, f[18285] = B, a = a + -2 | 0, f[18287] = a, B = 22; else if (v | 4 == (0 | A)) B = 22; else {
       if (5 == (0 | A)) {
        if (0 | _d(43136, 29456, 3)) {
         B = 22;
         break;
        }
        break c;
       }
       if (6 == (0 | A)) B = 22; else if (7 == (0 | A)) {
        if (!(32 & f[10846])) break c;
        B = 22;
       }
      }
     } while (0);
     22 == (0 | B) && (B = 0 | j[102816], f[18288] = B, f[18284] = B, B = (0 | j[168355]) + B | 0, f[18290] = B, f[18286] = B, B = 0 | j[102817], f[18287] = B + a, f[18289] = (0 | j[168356]) + B + (0 | f[18289]), f[18291] = (0 | f[18291]) + (0 | j[168359])), 8 == (0 | A) && (f[18286] = j[102816], f[18287] = j[168356]);
    }
   } while (0);
   for (f[C >> 2] = 0, f[C + 4 >> 2] = 0, f[C + 8 >> 2] = 0, f[C + 12 >> 2] = 0, f[C + 16 >> 2] = 0, f[C + 20 >> 2] = 0, f[C + 24 >> 2] = 0, f[C + 28 >> 2] = 0, l = 0 | j[168360], m = 65535 & (t = 0 | d[168359]), n = 0 | f[10812], o = 0 | j[102816], p = 0 | j[102817], q = 0 | f[10837], g = 0, i = 0; 8 != (0 | i); ) {
    for (b = 0 | f[73136 + (i << 4) >> 2], k = (0 | (k = 0 | f[73136 + (i << 4) + 8 >> 2])) < (0 | l) ? k : l, r = 73136 + (i << 4) + 4 | 0, s = 73136 + (i << 4) + 12 | 0, b = (0 | b) > 0 ? b : 0; !((0 | b) >= (0 | k)); ) {
     for (a = 0 | f[r >> 2], c = (0 | (c = 0 | f[s >> 2])) < (0 | m) ? c : m, e = b - o << 1 & 14, h = 0 | X(b, m), a = (0 | a) > 0 ? a : 0; !((0 | a) >= (0 | c)); ) A = n >>> ((a - p & 1 | e) << 1) & 3, B = 0 | d[q + (a + h << 1) >> 1], f[(z = C + (A << 2) | 0) >> 2] = (0 | f[z >> 2]) + (65535 & B), f[(A = C + ((4 | A) << 2) | 0) >> 2] = 1 + (0 | f[A >> 2]), g = (B << 16 >> 16 == 0 & 1) + g | 0, a = a + 1 | 0;
     b = b + 1 | 0;
    }
    i = i + 1 | 0;
   }
   if (a = 0 | f[C + 16 >> 2], b = 0 | f[C + 28 >> 2], c = 0 | f[C + 20 >> 2], e = 0 | f[C + 24 >> 2], v & (0 | j[168356]) < (65535 & t)) f[10838] = ((((0 | f[C + 4 >> 2]) + (0 | f[C >> 2]) + (0 | f[C + 8 >> 2]) + (0 | f[C + 12 >> 2]) | 0) >>> 0) / ((b + a + c + e | 0) >>> 0) | 0) - 4, jb(); else if (!(0 == (0 | b) | g >>> 0 >= a >>> 0 | 0 == (0 | c) | 0 == (0 | e))) {
    for (a = 0; 4 != (0 | a); ) d[336732 + (a << 1) >> 1] = ((0 | f[C + (a << 2) >> 2]) >>> 0) / ((0 | f[C + (a + 4 << 2) >> 2]) >>> 0) | 0, a = a + 1 | 0;
    d[168372] = 0, d[168371] = 0, d[168370] = 0;
   }
   u = D;
  }
  function Bf(a, c) {
   a |= 0, c |= 0;
   var d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   v = u, u = u + 1056 | 0, t = v, f[(s = v + 1024 | 0) >> 2] = 0, f[s + 4 >> 2] = 0, f[s + 8 >> 2] = 0, f[s + 12 >> 2] = 0, f[s + 16 >> 2] = 0, f[s + 20 >> 2] = 0, f[s + 24 >> 2] = 0, f[s + 28 >> 2] = 0, d = 0 | b[c >> 0];
   a: do {
    if (d << 24 >> 24) {
     for (r = 0, e = d, d &= 255; ;) {
      if (!(0 | b[a + r >> 0])) {
       d = 0;
       break a;
      }
      if (q = s + (((255 & e) >>> 5 & 255) << 2) | 0, f[q >> 2] = f[q >> 2] | 1 << (31 & e), r = r + 1 | 0, f[t + (d << 2) >> 2] = r, !((d = 0 | b[c + r >> 0]) << 24 >> 24)) break;
      e = d, d &= 255;
     }
     if (r >>> 0 > 1) {
      e = 0, k = -1, g = 1;
      b: for (;;) {
       for (h = 1, d = e; ;) {
        e = g;
        c: for (;;) {
         for (j = 1; ;) {
          if (g = 0 | b[c + (j + k) >> 0], i = 0 | b[c + e >> 0], g << 24 >> 24 != i << 24 >> 24) break c;
          if ((0 | j) == (0 | h)) break;
          if (j = j + 1 | 0, (e = j + d | 0) >>> 0 >= r >>> 0) {
           l = h, d = k;
           break b;
          }
         }
         if (d = d + h | 0, (e = d + 1 | 0) >>> 0 >= r >>> 0) {
          l = h, d = k;
          break b;
         }
        }
        if (h = e - k | 0, (255 & g) <= (255 & i)) break;
        if ((g = e + 1 | 0) >>> 0 >= r >>> 0) {
         l = h, d = k;
         break b;
        }
        d = e;
       }
       if ((g = d + 2 | 0) >>> 0 >= r >>> 0) {
        l = 1;
        break;
       }
       e = d + 1 | 0, k = d;
      }
      for (h = 0, m = -1, i = 1; ;) {
       for (e = 1, g = h; ;) {
        h = i;
        d: for (;;) {
         for (k = 1; ;) {
          if (i = 0 | b[c + (k + m) >> 0], j = 0 | b[c + h >> 0], i << 24 >> 24 != j << 24 >> 24) break d;
          if ((0 | k) == (0 | e)) break;
          if (k = k + 1 | 0, (h = k + g | 0) >>> 0 >= r >>> 0) {
           h = l, g = m, i = 27;
           break a;
          }
         }
         if (g = g + e | 0, (h = g + 1 | 0) >>> 0 >= r >>> 0) {
          h = l, g = m, i = 27;
          break a;
         }
        }
        if (e = h - m | 0, (255 & i) >= (255 & j)) break;
        if ((i = h + 1 | 0) >>> 0 >= r >>> 0) {
         h = l, g = m, i = 27;
         break a;
        }
        g = h;
       }
       if ((i = g + 2 | 0) >>> 0 >= r >>> 0) {
        h = l, e = 1, i = 27;
        break;
       }
       h = g + 1 | 0, m = g;
      }
     } else h = 1, d = -1, e = 1, g = -1, i = 27;
    } else h = 1, d = -1, r = 0, e = 1, g = -1, i = 27;
   } while (0);
   e: do {
    if (27 == (0 | i)) for (0 | Zd(c, c + (e = (p = (g + 1 | 0) >>> 0 > (d + 1 | 0) >>> 0) ? e : h) | 0, q = (p = p ? g : d) + 1 | 0) ? (o = 0, e = (p >>> 0 > (e = r - p - 1 | 0) >>> 0 ? p : e) + 1 | 0) : o = r - e | 0, k = 63 | r, l = r + -1 | 0, m = 0 != (0 | o), n = r - e | 0, d = a, j = 0, g = a; ;) {
     h = d;
     do {
      if ((g - h | 0) >>> 0 < r >>> 0) {
       if (i = 0 | le(g, 0, k)) {
        if ((i - h | 0) >>> 0 < r >>> 0) {
         d = 0;
         break e;
        }
        break;
       }
       i = g + k | 0;
       break;
      }
      i = g;
     } while (0);
     g = 0 | b[d + l >> 0];
     f: do {
      if (1 << (31 & g) & f[s + (((255 & g) >>> 5 & 255) << 2) >> 2]) {
       if (0 | (g = r - (0 | f[t + ((255 & g) << 2) >> 2]) | 0)) {
        h = 0, g = m & 0 != (0 | j) & g >>> 0 < e >>> 0 ? n : g;
        break;
       }
       h = 0 | b[c + (g = q >>> 0 > j >>> 0 ? q : j) >> 0];
       g: do {
        if (h << 24 >> 24) {
         for (;h << 24 >> 24 == (0 | b[d + g >> 0]); ) if (g = g + 1 | 0, !((h = 0 | b[c + g >> 0]) << 24 >> 24)) {
          g = q;
          break g;
         }
         h = 0, g = g - p | 0;
         break f;
        }
        g = q;
       } while (0);
       for (;;) {
        if (g >>> 0 <= j >>> 0) break e;
        if (g = g + -1 | 0, (0 | b[c + g >> 0]) != (0 | b[d + g >> 0])) {
         h = o, g = e;
         break;
        }
       }
      } else h = 0, g = r;
     } while (0);
     d = d + g | 0, j = h, g = i;
    }
   } while (0);
   return u = v, 0 | d;
  }
  function Ed(a, b) {
   b |= 0;
   var c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   if (o = 4 + (a |= 0) | 0, n = 0 | f[o >> 2], c = -8 & n, k = a + c | 0, i = 0 | f[51268], 1 != (0 | (d = 3 & n)) & a >>> 0 >= i >>> 0 & a >>> 0 < k >>> 0 || sa(), 1 & (e = 0 | f[k + 4 >> 2]) || sa(), !d) return b >>> 0 < 256 ? 0 | (a = 0) : c >>> 0 >= (b + 4 | 0) >>> 0 && (c - b | 0) >>> 0 <= f[51384] << 1 >>> 0 ? 0 | a : 0 | (a = 0);
   if (c >>> 0 >= b >>> 0) return (c = c - b | 0) >>> 0 <= 15 ? 0 | a : (m = a + b | 0, f[o >> 2] = 1 & n | b | 2, f[m + 4 >> 2] = 3 | c, o = m + c + 4 | 0, f[o >> 2] = 1 | f[o >> 2], Fd(m, c), 0 | a);
   if ((0 | k) == (0 | f[51270])) return m = (0 | f[51267]) + c | 0, c = m - b | 0, d = a + b | 0, m >>> 0 <= b >>> 0 ? 0 | (a = 0) : (f[o >> 2] = 1 & n | b | 2, f[d + 4 >> 2] = 1 | c, f[51270] = d, f[51267] = c, 0 | a);
   if ((0 | k) == (0 | f[51269])) return (e = (0 | f[51266]) + c | 0) >>> 0 < b >>> 0 ? 0 | (a = 0) : (c = e - b | 0, d = 1 & n, c >>> 0 > 15 ? (m = (n = a + b | 0) + c | 0, f[o >> 2] = d | b | 2, f[n + 4 >> 2] = 1 | c, f[m >> 2] = c, f[(d = m + 4 | 0) >> 2] = -2 & f[d >> 2], d = n) : (f[o >> 2] = d | e | 2, f[(d = a + e + 4 | 0) >> 2] = 1 | f[d >> 2], d = 0, c = 0), f[51266] = c, f[51269] = d, 0 | a);
   if (2 & e | 0) return 0 | (a = 0);
   if ((l = (-8 & e) + c | 0) >>> 0 < b >>> 0) return 0 | (a = 0);
   m = l - b | 0, g = e >>> 3;
   a: do {
    if (e >>> 0 < 256) {
     if (d = 0 | f[k + 8 >> 2], e = 0 | f[k + 12 >> 2], c = 205096 + (g << 1 << 2) | 0, (0 | d) != (0 | c) && (d >>> 0 < i >>> 0 && sa(), (0 | f[d + 12 >> 2]) != (0 | k) && sa()), (0 | e) == (0 | d)) {
      f[51264] = f[51264] & ~(1 << g);
      break;
     }
     (0 | e) == (0 | c) ? h = e + 8 | 0 : (e >>> 0 < i >>> 0 && sa(), (0 | f[(c = e + 8 | 0) >> 2]) == (0 | k) ? h = c : sa()), f[d + 12 >> 2] = e, f[h >> 2] = d;
    } else {
     h = 0 | f[k + 24 >> 2], e = 0 | f[k + 12 >> 2];
     do {
      if ((0 | e) == (0 | k)) {
       if (e = k + 16 | 0, d = e + 4 | 0, !(c = 0 | f[d >> 2])) {
        if (!(c = 0 | f[e >> 2])) {
         j = 0;
         break;
        }
        d = e;
       }
       for (;;) if (e = c + 20 | 0, 0 | (g = 0 | f[e >> 2])) c = g, d = e; else {
        if (e = c + 16 | 0, !(g = 0 | f[e >> 2])) break;
        c = g, d = e;
       }
       if (!(d >>> 0 < i >>> 0)) {
        f[d >> 2] = 0, j = c;
        break;
       }
       sa();
      } else {
       if ((g = 0 | f[k + 8 >> 2]) >>> 0 < i >>> 0 && sa(), c = g + 12 | 0, (0 | f[c >> 2]) != (0 | k) && sa(), d = e + 8 | 0, (0 | f[d >> 2]) == (0 | k)) {
        f[c >> 2] = e, f[d >> 2] = g, j = e;
        break;
       }
       sa();
      }
     } while (0);
     if (0 | h) {
      d = 205360 + ((c = 0 | f[k + 28 >> 2]) << 2) | 0, e = 0 == (0 | j);
      do {
       if ((0 | k) == (0 | f[d >> 2])) {
        if (f[d >> 2] = j, e) {
         f[51265] = f[51265] & ~(1 << c);
         break a;
        }
       } else {
        if (!(h >>> 0 < (0 | f[51268]) >>> 0)) {
         if (f[h + 16 + (((0 | f[h + 16 >> 2]) != (0 | k) & 1) << 2) >> 2] = j, e) break a;
         break;
        }
        sa();
       }
      } while (0);
      j >>> 0 < (e = 0 | f[51268]) >>> 0 && sa(), f[j + 24 >> 2] = h, d = 0 | f[(c = k + 16 | 0) >> 2];
      do {
       if (0 | d) {
        if (!(d >>> 0 < e >>> 0)) {
         f[j + 16 >> 2] = d, f[d + 24 >> 2] = j;
         break;
        }
        sa();
       }
      } while (0);
      if (0 | (c = 0 | f[c + 4 >> 2])) {
       if (!(c >>> 0 < (0 | f[51268]) >>> 0)) {
        f[j + 20 >> 2] = c, f[c + 24 >> 2] = j;
        break;
       }
       sa();
      }
     }
    }
   } while (0);
   return c = 1 & n, m >>> 0 < 16 ? (f[o >> 2] = c | l | 2, o = a + l + 4 | 0, f[o >> 2] = 1 | f[o >> 2], 0 | a) : (n = a + b | 0, f[o >> 2] = c | b | 2, f[n + 4 >> 2] = 3 | m, o = n + m + 4 | 0, f[o >> 2] = 1 | f[o >> 2], Fd(n, m), 0 | a);
  }
  function Ce(a, c, d) {
   a |= 0, d |= 0;
   var e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   switch (0 | (c |= 0)) {
   case 0:
    l = -149, m = 24, j = 4;
    break;

   case 1:
   case 2:
    l = -1074, m = 53, j = 4;
    break;

   default:
    e = 0;
   }
   a: do {
    if (4 == (0 | j)) {
     o = a + 4 | 0, n = a + 100 | 0;
     do {
      (c = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0 ? (f[o >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a);
     } while (0 != (0 | Ud(c)));
     b: do {
      switch (0 | c) {
      case 43:
      case 45:
       if (i = 1 - ((45 == (0 | c) & 1) << 1) | 0, (c = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0) {
        f[o >> 2] = c + 1, g = 0 | h[c >> 0];
        break b;
       }
       g = 0 | Td(a);
       break b;

      default:
       g = c, i = 1;
      }
     } while (0);
     c = 0;
     do {
      if ((32 | g) != (0 | b[43022 + c >> 0])) break;
      do {
       if (c >>> 0 < 7) {
        if ((g = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0) {
         f[o >> 2] = g + 1, g = 0 | h[g >> 0];
         break;
        }
        g = 0 | Td(a);
        break;
       }
      } while (0);
      c = c + 1 | 0;
     } while (c >>> 0 < 8);
     c: do {
      switch (0 | c) {
      case 8:
       break;

      case 3:
       j = 23;
       break;

      default:
       if ((k = 0 != (0 | d)) & c >>> 0 > 3) {
        if (8 == (0 | c)) break c;
        j = 23;
        break c;
       }
       d: do {
        if (!c) {
         c = 0;
         do {
          if ((32 | g) != (0 | b[43031 + c >> 0])) break d;
          do {
           if (c >>> 0 < 2) {
            if ((g = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0) {
             f[o >> 2] = g + 1, g = 0 | h[g >> 0];
             break;
            }
            g = 0 | Td(a);
            break;
           }
          } while (0);
          c = c + 1 | 0;
         } while (c >>> 0 < 3);
        }
       } while (0);
       switch (0 | c) {
       case 3:
        if ((c = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0 ? (f[o >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a), 40 != (0 | c)) {
         if (!(0 | f[n >> 2])) {
          e = B;
          break a;
         }
         f[o >> 2] = (0 | f[o >> 2]) - 1, e = B;
         break a;
        }
        for (c = 1; (g = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0 ? (f[o >> 2] = g + 1, g = 0 | h[g >> 0]) : g = 0 | Td(a), (g + -48 | 0) >>> 0 < 10 | (g + -65 | 0) >>> 0 < 26 || 95 == (0 | g) | (g + -97 | 0) >>> 0 < 26; ) c = c + 1 | 0;
        if (41 == (0 | g)) {
         e = B;
         break a;
        }
        if ((g = 0 == (0 | f[n >> 2])) || (f[o >> 2] = (0 | f[o >> 2]) - 1), !k) {
         f[5745] = 22, Rd(a, 0), e = 0;
         break a;
        }
        if (!c) {
         e = B;
         break a;
        }
        for (;;) if (c = c + -1 | 0, g || (f[o >> 2] = (0 | f[o >> 2]) - 1), !c) {
         e = B;
         break a;
        }

       case 0:
        if (48 == (0 | g)) {
         if ((c = 0 | f[o >> 2]) >>> 0 < (0 | f[n >> 2]) >>> 0 ? (f[o >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a), 120 == (32 | c)) {
          e = +De(a, m, l, i, d);
          break a;
         }
         0 | f[n >> 2] ? (f[o >> 2] = (0 | f[o >> 2]) - 1, c = 48) : c = 48;
        } else c = g;
        e = +Ee(a, c, m, l, i, d);
        break a;

       default:
        0 | f[n >> 2] && (f[o >> 2] = (0 | f[o >> 2]) - 1), f[5745] = 22, Rd(a, 0), e = 0;
        break a;
       }
      }
     } while (0);
     if (23 == (0 | j) && ((g = 0 == (0 | f[n >> 2])) || (f[o >> 2] = (0 | f[o >> 2]) - 1), 0 != (0 | d) & c >>> 0 > 3)) do {
      g || (f[o >> 2] = (0 | f[o >> 2]) - 1), c = c + -1 | 0;
     } while (c >>> 0 > 3);
     e = +(0 | i) * C;
    }
   } while (0);
   return +e;
  }
  function rb(a, c) {
   c |= 0;
   var e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0;
   A = u, u = u + 65552 | 0, p = A + 8 | 0, q = A, cg(0 | (a |= 0), 0, 476), f[(r = a + 28 | 0) >> 2] = 2147483647, Qf(0 | f[10815]);
   a: do {
    if (216 == (0 | Qf(0 | f[10815]))) {
     s = p + 1 | 0, m = p + 2 | 0, n = p + 3 | 0, x = a + 12 | 0, v = a + 16 | 0, y = 0 != (0 | c), z = a + 20 | 0, w = a + 8 | 0, o = a + 4 | 0, g = p + 7 | 0, i = p + 4 | 0, j = p + 5 | 0, k = a + 24 | 0;
     do {
      if (!(0 | Of(p, 2, 2, 0 | f[10815]))) {
       c = 0;
       break a;
      }
      if (c = 0 | h[s >> 0], (l = (0 | h[p >> 0]) << 8 | c) >>> 0 < 65281) {
       c = 0;
       break a;
      }
      Of(p, 1, e = 65534 + ((0 | h[m >> 0]) << 8 | 0 | h[n >> 0]) & 65535, 0 | f[10815]);
      b: do {
       switch ((65535 & l) << 16 >> 16) {
       case -61:
        t = 3 + (0 | X((t = 0 | h[g >> 0]) >>> 4, 15 & t)) & 3, f[z >> 2] = t, t = 7;
        break;

       case -64:
       case -63:
        t = 7;
        break;

       case -60:
        if (!y) for (f[q >> 2] = p, e = p + e | 0, c = p; ;) {
         if (c >>> 0 >= e >>> 0) break b;
         if (f[q >> 2] = c + 1, 236 & (c = 0 | h[c >> 0]) | 0) break b;
         B = 0 | mb(q), f[a + 312 + (c << 2) >> 2] = B, f[a + 392 + (c << 2) >> 2] = B, c = 0 | f[q >> 2];
        }
        break;

       case -38:
        B = (0 | h[p >> 0]) << 1, f[k >> 2] = h[p + (1 | B) >> 0], f[o >> 2] = (0 | f[o >> 2]) - (15 & b[p + (B + 3) >> 0]);
        break;

       case -37:
        for (c = 0; ;) {
         if (64 == (0 | c)) break b;
         B = c << 1, d[a + 56 + (c << 1) >> 1] = (0 | h[p + (1 | B) >> 0]) << 8 | 0 | h[p + (B + 2) >> 0], c = c + 1 | 0;
        }

       case -35:
        f[r >> 2] = (0 | h[p >> 0]) << 8 | 0 | h[s >> 0];
       }
      } while (0);
      7 == (0 | t) && (t = 0, f[a >> 2] = c, f[o >> 2] = h[p >> 0], f[w >> 2] = (0 | h[s >> 0]) << 8 | 0 | h[m >> 0], f[x >> 2] = (0 | h[n >> 0]) << 8 | 0 | h[i >> 0], f[v >> 2] = (0 | h[j >> 0]) + (0 | f[z >> 2]), 9 != (0 | e) | 0 != (0 | f[10845]) || If(0 | f[10815]));
     } while (65498 != (0 | l));
     if (k = a + 312 | 0, (0 | (c = 0 | f[o >> 2])) > 16) c = 0; else if (j = 0 | f[v >> 2], 0 == (0 | c) | (0 | j) > 6) c = 0; else if (0 | f[w >> 2]) if (i = 0 | f[x >> 2], c = 0 == (0 | i), e = 0 == (0 | j), y | e | c) c = 1 & (1 ^ (e | c)); else if (0 | f[k >> 2]) {
      for (g = 0; 19 != (0 | g); ) 0 | f[(e = a + 312 + ((c = g + 1 | 0) << 2) | 0) >> 2] ? g = c : (f[e >> 2] = f[a + 312 + (g << 2) >> 2], g = c);
      g = 0 | f[z >> 2];
      c: do {
       if (0 | g) {
        for (c = a + 316 | 0, e = 0; 4 != (0 | e); ) f[a + 312 + (e + 2 << 2) >> 2] = f[c >> 2], e = e + 1 | 0;
        for (c = 0; ;) {
         if ((0 | (e = 65535 & c)) >= (0 | g)) break c;
         f[a + 312 + (e + 1 << 2) >> 2] = f[k >> 2], c = c + 1 << 16 >> 16;
        }
       }
      } while (0);
      c = 0 | Cd(0 | X(i, j), 4), f[a + 472 >> 2] = c, f[10843] = 1, c = 1;
     } else c = 0; else c = 0;
    } else c = 0;
   } while (0);
   return u = A, 0 | c;
  }
  function vc(a, c) {
   a |= 0, c |= 0;
   var e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0;
   C = u, u = u + 64 | 0, z = C, A = C + 12 | 0, g = 29389, i = 39 + (e = y = C + 14 | 0) | 0;
   do {
    b[e >> 0] = 0 | b[g >> 0], e = e + 1 | 0, g = g + 1 | 0;
   } while ((0 | e) < (0 | i));
   for (d[A >> 1] = 0, tf(0 | f[10815], 1 + (0 | f[a + 4 >> 2]) | 0, 0), lb(-1, 0), (e = 0 | f[(x = a + 8 | 0) >> 2]) >>> 0 > (g = 0 | X(0 | j[168360], 0 | j[168359])) >>> 0 && (f[x >> 2] = g, e = g), t = z + 8 | 0, v = z + 4 | 0, w = a + 12 | 0, i = 0, k = 0, l = 255, s = 0 | f[a >> 2], g = 8, a = 0; s >>> 0 < e >>> 0; ) {
    for (r = 0, m = i; 3 != (0 | r); ) {
     for (e = 0 | lb(g, 0) | (65535 & k) << g, k = a + 1 + g | 0, a = (q = (0 | a) < 0) ? (0 | k) < 1 ? g + a | 0 : 0 : a, i = 65535 & e, k = q ? k : g; g = k + -1 | 0, !((0 | k) <= 0); ) {
      if (255 == (i >>> g & 255 | 0)) {
       B = 9;
       break;
      }
      k = g;
     }
     for (9 == (0 | B) && (B = 0, (0 | k) > 1 && (e = (((e = 1 << k + -2) & i) << 1) + i & -1 << g | (e + 65535 & i) << 1), e = (0 | lb(1, 0)) + e | 0, a = k + -9 | 0), g = ((4 + ((65535 & e) - (m &= 65535) << 2) & 262140) - 1 | 0) / (0 | (k = l >> 4)) | 0, q = 0; (0 | (i = 0 | h[q + 5 + (y + (13 * r | 0)) >> 0])) > (0 | g); ) q = q + 1 | 0;
     for (p = 65535 & e, g = (0 | X(i, k)) >> 2, e = (e = q ? (0 | X(0 | h[q + 4 + (y + (13 * r | 0)) >> 0], k)) >> 2 : l) - g | 0, o = 0; (0 | (l = e << o)) < 128; ) o = o + 1 | 0;
     m = g + m << o & 65535, e = 255 & (k = 0 | b[(n = y + (13 * r | 0) + 1 | 0) >> 0]), D = 1 + (0 | b[(g = y + (13 * r | 0) + 2 | 0) >> 0]) << 24 >> 24, b[g >> 0] = D, (255 & D) > (0 | h[(i = y + (13 * r | 0) + 3 | 0) >> 0]) ? (D = (0 | h[y + (13 * r | 0) >> 0]) & e + 1, b[i >> 0] = ((0 | h[D + 4 + (y + (13 * r | 0)) >> 0]) - (0 | h[D + 5 + (y + (13 * r | 0)) >> 0]) | 0) >>> 2, b[g >> 0] = 1, i = D) : i = e;
     a: do {
      if (((0 | h[e + 4 + (y + (13 * r | 0)) >> 0]) - (0 | h[e + 5 + (y + (13 * r | 0)) >> 0]) | 0) > 1) {
       if ((0 | q) < (0 | e)) for (g = q, e = k; ;) {
        if ((0 | g) >= (255 & e | 0)) break a;
        b[(e = g + 5 + (y + (13 * r | 0)) | 0) >> 0] = (0 | b[e >> 0]) - 1 << 24 >> 24, g = g + 1 | 0, e = 0 | b[n >> 0];
       }
       if ((0 | i) <= (0 | q)) for (;;) {
        if ((0 | e) >= (0 | q)) break a;
        b[(D = e + 5 + (y + (13 * r | 0)) | 0) >> 0] = 1 + (0 | b[D >> 0]) << 24 >> 24, e = e + 1 | 0;
       }
      }
     } while (0);
     b[n >> 0] = i, f[z + (r << 2) >> 2] = q, r = r + 1 | 0, k = p, g = o;
    }
    o = 0 | f[z >> 2], r = 255 & (p = f[v >> 2] << 2 | f[t >> 2] << 5 | 3 & o), q = A + (D = 1 & s) | 0, r = ((n = 12 + (0 | Pf(0 | f[10815])) | 0) >>> 0 < (0 | f[w >> 2]) >>> 0 ? 0 == (4 & o | 0) ? p : 0 == (0 | r) ? 128 : 0 - r | 0 : 0) + (0 | h[q >> 0]) | 0, b[q >> 0] = r, d[(0 | f[10837]) + (s << 1) >> 1] = 255 & r, i = m, s = (e = D ? s : 0 == (1 << (((0 | s) / (0 | j[168359]) | 0) - (0 | j[168360]) & 7) & c | 0) ? s : s + 2 | 0) + 1 | 0, e = 0 | f[x >> 2];
   }
   f[10839] = 255, u = C;
  }
  function nd() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   s = u, u = u + 2176 | 0, m = s, o = s + 2112 | 0, q = s + 2048 | 0, d[102818] = 18761, tf(0 | f[10815], 36, 0), p = 0 | $a(), f[18321] = p, tf(0 | f[10815], -4, 2), tf(p = 0 | f[10815], 0 | $a(), 0);
   a: do {
    if (1682130259 == (0 | $a())) for ($a(), a = 0 | $a(), b = 0; ;) {
     if (p = a + -1 | 0, !a) break a;
     if (k = 0 | $a(), a = 0 | $a(), c = 0 | $a(), l = 0 | Pf(0 | f[10815]), tf(0 | f[10815], k, 0), (0 | $a()) != (541279571 | c << 24)) break a;
     g = a + -28 | 0;
     b: do {
      if ((0 | c) < 1195461961) {
       if ((0 | c) < 1179468099) switch (0 | c) {
       case 843140425:
        r = 6;
        break b;

       default:
        break b;
       }
       switch (0 | c) {
       case 1179468099:
        break;

       default:
        break b;
       }
       f[10959] = k + 8, f[10968] = g;
      } else {
       if ((0 | c) < 1347375696) switch (0 | c) {
       case 1195461961:
        r = 6;
        break b;

       default:
        break b;
       }
       switch (0 | c) {
       case 1347375696:
        break;

       default:
        break b;
       }
       for ($a(), c = 0 | $a(), tf(0 | f[10815], 12, 1), e = (g = c >>> 0 < 256 ? c : 256) << 1, c = k + 24 + (c << 3) | 0, a = 0; ;) {
        if ((0 | a) >= (0 | e)) {
         a = 0;
         break;
        }
        k = c + ((0 | $a()) << 1) | 0, f[m + (a << 2) >> 2] = k, a = a + 1 | 0;
       }
       for (;;) {
        if ((0 | a) >= (0 | g)) break b;
        md(0 | f[m + (a << 3) >> 2], o), md(0 | f[m + (a << 3) + 4 >> 2], q), 0 | Yd(o, 30717) || (t = +(0 | Yf(q)), n[18318] = t), 0 | Yd(o, 30721) || Te(43072, q), 0 | Yd(o, 30730) || Te(43136, q), 0 | Yd(o, 30739) || Te(344976, q), 0 | Yd(o, 30747) || (k = 0 | Yf(q), f[18316] = k), 0 | Yd(o, 30752) || (t = +(0 | Yf(q)) / 1e6, n[18320] = t), 0 | Yd(o, 30760) || (t = +Vf(q), n[18319] = t), 0 | Yd(o, 30769) || (t = +Vf(q), n[18455] = t), a = a + 1 | 0;
       }
      }
     } while (0);
     do {
      if (6 == (0 | r)) {
       if (r = 0, tf(0 | f[10815], 8, 1), a = 0 | $a(), v = 0 | $a(), c = 0 | $a(), h = 65535 & c, e = k + 28 | 0, i = 65535 & v, (0 | v) > (0 | j[168359]) && (0 | c) > (0 | j[168360])) {
        switch (0 | a) {
        case 5:
         f[10846] = 1, r = 10;
         break;

        case 6:
         r = 10;
         break;

        case 30:
         a = 36;
         break;

        default:
         a = 0;
        }
        10 == (0 | r) && (r = 0, a = 37), f[18282] = a, d[168359] = i, d[168360] = h, f[10960] = e, f[18493] = 1;
       }
       if (tf(0 | f[10815], e, 0), b = b + 1 | 0, 255 == (0 | Qf(0 | f[10815]))) {
        if (v = 216 == (0 | Qf(0 | f[10815])), a = 0 | f[10965], v & a >>> 0 < g >>> 0) {
         f[18317] = e, f[10965] = g, f[18491] = 34;
         break;
        }
       } else a = 0 | f[10965];
       2 != (0 | b) | 0 != (0 | a) || (f[18317] = k + 24, d[168364] = i, d[168365] = h, f[18491] = 35, b = 2);
      }
     } while (0);
     tf(0 | f[10815], l, 0), a = p;
    }
   } while (0);
   u = s;
  }
  function ed(a) {
   a |= 0;
   var c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, o = 0;
   l = u, u = u + 48 | 0, k = l, g = 36 + (e = 43876) | 0;
   do {
    f[e >> 2] = 0, e = e + 4 | 0;
   } while ((0 | e) < (0 | g));
   tf(0 | f[10815], a, 0), j = 65535 & (0 | $a()), d[102818] = j;
   a: do {
    if (1382119168 == (-256 & (0 | $a()) | 0)) {
     for (tf(c = 0 | f[10815], (0 | $a()) + a | 0, 0), c = 0 | $a(), $a(); j = c + -1 | 0, c; ) {
      m = 0 | $a(), $a(), c = 0 | $a(), e = 0 | $a(), i = 0 | Pf(0 | f[10815]), g = e + a | 0, tf(0 | f[10815], g, 0), h = 65535 & e;
      b: do {
       switch (0 | m) {
       case 256:
        f[18321] = (0 | b[30495 + (3 & e) >> 0]) - 48;
        break;

       case 262:
        for (c = 0; 9 != (0 | c); ) o = +cb(11), n[k + (c << 2) >> 2] = o, c = c + 1 | 0;
        Uc(k);
        break;

       case 263:
        for (c = 0; ;) {
         if (3 == (0 | c)) break b;
         o = +cb(11), n[43844 + (c << 2) >> 2] = o, c = c + 1 | 0;
        }

       case 264:
        d[168359] = h;
        break;

       case 265:
        d[168360] = h;
        break;

       case 266:
        d[102817] = h;
        break;

       case 267:
        d[102816] = h;
        break;

       case 268:
        d[168356] = h;
        break;

       case 269:
        d[168355] = h;
        break;

       case 270:
        f[10969] = e;
        break;

       case 271:
        f[10960] = g;
        break;

       case 272:
        f[10959] = g, f[10968] = c;
        break;

       case 274:
        f[10970] = i + -4;
        break;

       case 528:
        o = +bb(e), n[10977] = o;
        break;

       case 538:
        f[10971] = e;
        break;

       case 540:
        f[10979] = g;
        break;

       case 541:
        f[10972] = e;
        break;

       case 546:
        f[10973] = e;
        break;

       case 547:
        f[10974] = g;
        break;

       case 548:
        f[10975] = e;
        break;

       case 549:
        f[10976] = g;
        break;

       case 769:
        b[43199] = 0, Of(43136, 1, 63, 0 | f[10815]), 0 | (c = 0 | xf(43136, 30500)) && (b[c >> 0] = 0);
       }
      } while (0);
      tf(0 | f[10815], i, 0), c = j;
     }
     f[18282] = (0 | f[10969]) < 3 ? 31 : 30, f[10839] = 65535, c = 30508, g = 10 + (e = 43072) | 0;
     do {
      b[e >> 0] = 0 | b[c >> 0], e = e + 1 | 0, c = c + 1 | 0;
     } while ((0 | e) < (0 | g));
     if (!(0 | b[43136])) switch (0 | d[168360]) {
     case 2060:
      c = 30518, g = 11 + (e = 43136) | 0;
      do {
       b[e >> 0] = 0 | b[c >> 0], e = e + 1 | 0, c = c + 1 | 0;
      } while ((0 | e) < (0 | g));
      break a;

     case 2682:
      b[43136] = 0 | b[30529], b[43137] = 0 | b[30530], b[43138] = 0 | b[30531], b[43139] = 0 | b[30532], b[43140] = 0 | b[30533];
      break a;

     case 4128:
      b[43136] = 0 | b[30534], b[43137] = 0 | b[30535], b[43138] = 0 | b[30536], b[43139] = 0 | b[30537], b[43140] = 0 | b[30538];
      break a;

     case 5488:
      b[43136] = 0 | b[30539], b[43137] = 0 | b[30540], b[43138] = 0 | b[30541], b[43139] = 0 | b[30542], b[43140] = 0 | b[30543];
      break a;

     default:
      break a;
     }
    }
   } while (0);
   u = l;
  }
  function ig(a, b, c, d, e) {
   e |= 0;
   var g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   if (l = a |= 0, j = b |= 0, k = j, h = c |= 0, n = d |= 0, i = n, !k) return g = 0 != (0 | e), i ? g ? (f[e >> 2] = 0 | a, f[e + 4 >> 2] = 0 & b, n = 0, e = 0, 0 | (I = n, e)) : (n = 0, e = 0, 0 | (I = n, e)) : (g && (f[e >> 2] = (l >>> 0) % (h >>> 0), f[e + 4 >> 2] = 0), n = 0, e = (l >>> 0) / (h >>> 0) >>> 0, 0 | (I = n, e));
   g = 0 == (0 | i);
   do {
    if (h) {
     if (!g) {
      if ((g = (0 | _(0 | i)) - (0 | _(0 | k)) | 0) >>> 0 <= 31) {
       h = m = g + 1 | 0, a = l >>> (m >>> 0) & (b = g - 31 >> 31) | k << (i = 31 - g | 0), b &= k >>> (m >>> 0), g = 0, i = l << i;
       break;
      }
      return e ? (f[e >> 2] = 0 | a, f[e + 4 >> 2] = j | 0 & b, n = 0, e = 0, 0 | (I = n, e)) : (n = 0, e = 0, 0 | (I = n, e));
     }
     if ((g = h - 1 | 0) & h | 0) {
      h = i = 33 + (0 | _(0 | h)) - (0 | _(0 | k)) | 0, a = (m = 32 - i | 0) - 1 >> 31 & k >>> ((o = i - 32 | 0) >>> 0) | (k << m | l >>> (i >>> 0)) & (b = o >> 31), b &= k >>> (i >>> 0), g = l << (p = 64 - i | 0) & (j = m >> 31), i = (k << p | l >>> (o >>> 0)) & j | l << m & i - 33 >> 31;
      break;
     }
     return 0 | e && (f[e >> 2] = g & l, f[e + 4 >> 2] = 0), 1 == (0 | h) ? (o = j | 0 & b, p = 0 | a, 0 | (I = o, p)) : (p = 0 | hg(0 | h), o = k >>> (p >>> 0) | 0, p = k << 32 - p | l >>> (p >>> 0) | 0, 0 | (I = o, p));
    }
    if (g) return 0 | e && (f[e >> 2] = (k >>> 0) % (h >>> 0), f[e + 4 >> 2] = 0), n = 0, e = (k >>> 0) / (h >>> 0) >>> 0, 0 | (I = n, e);
    if (!l) return 0 | e && (f[e >> 2] = 0, f[e + 4 >> 2] = (k >>> 0) % (i >>> 0)), n = 0, e = (k >>> 0) / (i >>> 0) >>> 0, 0 | (I = n, e);
    if (!((g = i - 1 | 0) & i)) return 0 | e && (f[e >> 2] = 0 | a, f[e + 4 >> 2] = g & k | 0 & b), n = 0, e = k >>> ((0 | hg(0 | i)) >>> 0), 0 | (I = n, e);
    if ((g = (0 | _(0 | i)) - (0 | _(0 | k)) | 0) >>> 0 <= 30) {
     h = b = g + 1 | 0, a = k << (i = 31 - g | 0) | l >>> (b >>> 0), b = k >>> (b >>> 0), g = 0, i = l << i;
     break;
    }
    return e ? (f[e >> 2] = 0 | a, f[e + 4 >> 2] = j | 0 & b, n = 0, e = 0, 0 | (I = n, e)) : (n = 0, e = 0, 0 | (I = n, e));
   } while (0);
   if (h) {
    k = 0 | bg(0 | (m = 0 | c), 0 | (l = n | 0 & d), -1, -1), c = I, j = i, i = 0;
    do {
     d = j, j = g >>> 31 | j << 1, g = i | g << 1, ag(0 | k, 0 | c, 0 | (d = a << 1 | d >>> 31 | 0), 0 | (n = a >>> 31 | b << 1 | 0)), i = 1 & (o = (p = I) >> 31 | ((0 | p) < 0 ? -1 : 0) << 1), a = 0 | ag(0 | d, 0 | n, o & m | 0, (((0 | p) < 0 ? -1 : 0) >> 31 | ((0 | p) < 0 ? -1 : 0) << 1) & l | 0), b = I, h = h - 1 | 0;
    } while (0 != (0 | h));
    k = j, j = 0;
   } else k = i, j = 0, i = 0;
   return h = 0, 0 | e && (f[e >> 2] = a, f[e + 4 >> 2] = b), o = (0 | g) >>> 31 | (k | h) << 1 | 0 & (h << 1 | g >>> 31) | j, p = -2 & (g << 1 | 0) | i, 0 | (I = o, p);
  }
  function gb() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0;
   s = u, u = u + 128 | 0, l = s + 96 | 0, r = s + 32 | 0, m = s + 16 | 0, o = s + 8 | 0, f[(a = q = s) >> 2] = 0, f[a + 4 >> 2] = 0, b = (a = r) + 64 | 0;
   do {
    f[a >> 2] = 0, a = a + 4 | 0;
   } while ((0 | a) < (0 | b));
   for (i = 280 + (0 | X(k = ~~(+n[10821] + .5), -20)) | 0, i = 0 != +n[10820] ? 80 : (0 | k) < 10 ? 150 : (0 | k) > 12 ? 20 : i, k = o + 4 | 0, h = 14; (0 | h) < ((0 | j[168355]) - 14 | 0); ) {
    for (g = 10; !((0 | g) >= (0 | j[168356])); ) {
     for (b = 0 | f[10822], c = 0 | j[168357], d = 0 | j[168358], e = 0 | f[10812], a = 0; ;) {
      if (8 == (0 | a)) {
       a = 0;
       break;
      }
      t = e >>> (((w = (a >> 1) + h | 0) << 1 & 14 | (v = 1 & a)) << 1) & 3, v = b + ((0 | X(w >> c, d)) + ((v | g) >> c) << 3) + (t << 1) | 0, f[l + ((t | 4 & a) << 2) >> 2] = j[v >> 1], a = a + 1 | 0;
     }
     for (;;) {
      if ((0 | a) >= 8) {
       a = 0, p = 9;
       break;
      }
      if (((0 | f[l + (a << 2) >> 2]) - 150 | 0) >>> 0 > 1350) break;
      a = a + 1 | 0;
     }
     a: do {
      if (9 == (0 | p)) {
       for (;;) {
        if (p = 0, (0 | a) >= 4) {
         b = 0;
         break;
        }
        if ((0 | ((0 | (w = (0 | f[l + (a << 2) >> 2]) - (0 | f[l + (a + 4 << 2) >> 2]) | 0)) > -1 ? w : 0 - w | 0)) > 50) break a;
        a = a + 1 | 0, p = 9;
       }
       for (;2 != (0 | b); ) {
        for (c = b << 2, a = 0; !((0 | a) >= 4); ) w = 0 | f[l + ((v = a + c | 0) << 2) >> 2], f[m + (b << 3) + (a >> 1 << 2) >> 2] = ((0 | f[l + ((1 | v) << 2) >> 2]) - w << 10 | 0) / (0 | w) | 0, a = a + 2 | 0;
        w = 0 | fb(m + (b << 3) | 0, i), f[o + (b << 2) >> 2] = w, b = b + 1 | 0;
       }
       if ((0 | (d = f[k >> 2] | f[o >> 2])) <= 1) {
        for (b = 0; ;) {
         if (2 == (0 | b)) {
          a = 0;
          break;
         }
         b: do {
          if (0 | f[o + (b << 2) >> 2]) for (c = b << 2, a = 0; ;) {
           if (2 == (0 | a)) break b;
           w = (a << 1) + c | 0, v = (0 | X(1024 + (0 | f[m + (b << 3) + (a << 2) >> 2]) | 0, 0 | f[l + (w << 2) >> 2])) >> 10, f[l + ((1 | w) << 2) >> 2] = v, a = a + 1 | 0;
          }
         } while (0);
         b = b + 1 | 0;
        }
        for (;8 != (0 | a); ) f[(w = r + (d << 5) + (a << 2) | 0) >> 2] = (0 | f[w >> 2]) + (0 | f[l + (a << 2) >> 2]), a = a + 1 | 0;
        f[(w = q + (d << 2) | 0) >> 2] = 1 + (0 | f[w >> 2]);
       }
      }
     } while (0);
     g = g + 2 | 0;
    }
    h = h + 4 | 0;
   }
   b = 0 | f[q >> 2], a = 0 | f[q + 4 >> 2];
   c: do {
    if (a | b | 0) for (b = (200 * b | 0) < (0 | a) & 1, a = 0; ;) {
     if (4 == (0 | a)) break c;
     n[43264 + (a << 2) >> 2] = 1 / +((0 | f[r + (b << 5) + (a + 4 << 2) >> 2]) + (0 | f[r + (b << 5) + (a << 2) >> 2]) | 0), a = a + 1 | 0;
    }
   } while (0);
   u = s;
  }
  function Xc(a) {
   a |= 0;
   var b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   v = u, u = u + 32 | 0, o = v + 24 | 0, p = v + 20 | 0, q = v + 16 | 0, r = v + 12 | 0, f[(s = v) >> 2] = f[206], f[s + 4 >> 2] = f[207], f[s + 8 >> 2] = f[208], b = 0 | Za();
   a: do {
    if ((65535 & b) <= 1024) for (h = 6500, c = -2, b &= 65535; ;) {
     if (m = b + -1 | 0, !b) break a;
     if (Pc(a, o, p, q, r), l = 0 | f[o >> 2], k = 0 | f[q >> 2], 1020 == (0 | l)) b = 0 | ab(0 | f[p >> 2]); else {
      b: do {
       if (1021 == (0 | l) & 72 == (0 | k)) for (tf(0 | f[10815], 40, 1), b = 0; ;) {
        if (3 == (0 | b)) {
         b = -2;
         break b;
        }
        j = 2048 / +(65535 & (0 | Za())), n[43844 + (b << 2) >> 2] = j, b = b + 1 | 0;
       } else b = c;
      } while (0);
      2118 == (0 | l) && (h = 0 | ab(0 | f[p >> 2]));
     }
     i = (0 | b) > -1;
     c: do {
      if (i & (0 | l) == (b + 2120 | 0)) for (e = 0 | f[p >> 2], c = 0; ;) {
       if (3 == (0 | c)) break c;
       j = 2048 / +cb(e), n[43844 + (c << 2) >> 2] = j, c = c + 1 | 0;
      }
     } while (0);
     d: do {
      if ((0 | l) == (b + 2130 | 0)) for (e = 0 | f[p >> 2], c = 0; ;) {
       if (3 == (0 | c)) break d;
       j = +cb(e), n[s + (c << 2) >> 2] = j, c = c + 1 | 0;
      }
     } while (0);
     e: do {
      if (i & (0 | l) == (b + 2140 | 0)) for (i = 0 | f[p >> 2], j = +(0 | h) / 100, e = 0; ;) {
       if (3 == (0 | e)) break e;
       for (g = 0, c = 0; 4 != (0 | c); ) g += +cb(i) * +M(+j, + +(0 | c)), c = c + 1 | 0;
       n[43844 + (e << 2) >> 2] = 2048 / (g * +n[s + (e << 2) >> 2]), e = e + 1 | 0;
      }
     } while (0);
     f: do {
      if (!((0 | l) < 6020)) {
       if ((0 | l) < 64013) {
        switch (0 | l) {
        case 6020:
         break;

        default:
         e = b;
         break f;
        }
        j = +((0 | ab(0 | f[p >> 2])) >>> 0), n[18318] = j, e = b;
        break;
       }
       switch (0 | l) {
       case 64013:
        break;

       default:
        e = b;
        break f;
       }
       e = 0 | Qf(0 | f[10815]);
       break;
      }
      switch (0 | l) {
      case 2317:
       break;

      default:
       e = b;
       break f;
      }
      Wc(k), e = b;
     } while (0);
     g: do {
      if (e >>> 0 < 7 && (0 | l) == (0 | f[836 + (e << 2) >> 2])) for (b = 0; ;) {
       if (3 == (0 | b)) break g;
       j = +((0 | $a()) >>> 0), n[43844 + (b << 2) >> 2] = j, b = b + 1 | 0;
      }
     } while (0);
     switch (0 | l) {
     case 64019:
      b = 0 | ab(0 | f[p >> 2]), c = 336712, t = 37;
      break;

     case 64020:
      b = 1 + (0 | ab(0 | f[p >> 2])) & 65534, c = 336710, t = 37;
     }
     37 == (0 | t) && (t = 0, d[c >> 1] = b), tf(0 | f[10815], 0 | f[r >> 2], 0), c = e, b = m;
    }
   } while (0);
   u = v;
  }
  function Nc() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0;
   w = u, u = u + 80 | 0, q = w + 40 | 0, r = w + 8 | 0, s = w, v = (t = 0 | f[10824]) - 3 | 0;
   a: do {
    if (v >>> 0 <= 1) {
     for (p = 2147483647, a = 0; (0 | a) != (0 | t); ) p = (0 | p) > (0 | (m = ~~(65535 * +n[43264 + (a << 2) >> 2]))) ? m : p, a = a + 1 | 0;
     for (k = 0 | f[10822], l = +(0 | p), m = s + 4 | 0, o = +(t >>> 0), i = 0; ;) {
      if (!((0 | i) < (0 | j[168355]))) break a;
      for (h = 0; a = 0 | j[168356], !((0 | h) >= (0 | a)); ) {
       for (c = (0 | X(a, i)) + h | 0, a = 0; !(a >>> 0 >= t >>> 0 || (0 | j[k + (c << 3) + (a << 1) >> 1]) > (0 | p)); ) a = a + 1 | 0;
       b: do {
        if ((0 | a) != (0 | t)) {
         for (a = 0; ;) {
          if ((0 | a) == (0 | t)) {
           g = 0;
           break;
          }
          b = +(0 | j[k + (c << 3) + (a << 1) >> 1]), n[q + (a << 2) >> 2] = b, n[q + 16 + (a << 2) >> 2] = b < l ? b : l, a = a + 1 | 0;
         }
         for (;2 != (0 | g); ) {
          for (c = 0; (0 | c) != (0 | t); ) {
           for (n[(e = r + (g << 4) + (c << 2) | 0) >> 2] = 0, a = 0, b = 0; (0 | a) != (0 | t); ) x = b + +n[376 + (v << 6) + (c << 4) + (a << 2) >> 2] * +n[q + (g << 4) + (a << 2) >> 2], n[e >> 2] = x, a = a + 1 | 0, b = x;
           c = c + 1 | 0;
          }
          for (n[(c = s + (g << 2) | 0) >> 2] = 0, a = 1, b = 0; !(a >>> 0 >= t >>> 0); ) x = b + (x = +n[r + (g << 4) + (a << 2) >> 2]) * x, n[c >> 2] = x, a = a + 1 | 0, b = x;
          g = g + 1 | 0;
         }
         for (b = +L(+ +n[m >> 2] / +n[s >> 2]), a = 1; ;) {
          if (a >>> 0 >= t >>> 0) {
           c = 0;
           break;
          }
          n[(g = r + (a << 2) | 0) >> 2] = b * +n[g >> 2], a = a + 1 | 0;
         }
         for (;;) {
          if ((0 | c) == (0 | t)) {
           a = 0;
           break;
          }
          for (n[(e = q + (c << 2) | 0) >> 2] = 0, a = 0, b = 0; (0 | a) != (0 | t); ) x = b + +n[504 + (v << 6) + (c << 4) + (a << 2) >> 2] * +n[r + (a << 2) >> 2], n[e >> 2] = x, a = a + 1 | 0, b = x;
          c = c + 1 | 0;
         }
         for (;;) {
          if ((0 | a) == (0 | t)) break b;
          g = k + ((0 | X(0 | j[168356], i)) + h << 3) + (a << 1) | 0, d[g >> 1] = ~~(+n[q + (a << 2) >> 2] / o), a = a + 1 | 0;
         }
        }
       } while (0);
       h = h + 1 | 0;
      }
      i = i + 1 | 0;
     }
    }
   } while (0);
   u = w;
  }
  function Ke(a, b) {
   a = +a, b = +b;
   var c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   p[s >> 3] = a, h = 0 | f[s >> 2], j = 0 | f[s + 4 >> 2], p[s >> 3] = b, l = 0 | f[s >> 2], m = 0 | f[s + 4 >> 2], d = 0 | fg(0 | h, 0 | j, 52), d &= 2047, k = 0 | fg(0 | l, 0 | m, 52), k &= 2047, n = -2147483648 & j, g = 0 | dg(0 | l, 0 | m, 1), i = I;
   a: do {
    if (0 == (0 | g) & 0 == (0 | i)) o = 3; else if (e = 0 | Le(b), c = 2147483647 & I, 2047 == (0 | d) | c >>> 0 > 2146435072 | 2146435072 == (0 | c) & e >>> 0 > 0) o = 3; else {
     if (c = 0 | dg(0 | h, 0 | j, 1), !((e = I) >>> 0 > i >>> 0 | (0 | e) == (0 | i) & c >>> 0 > g >>> 0)) return +((0 | c) == (0 | g) & (0 | e) == (0 | i) ? 0 * a : a);
     if (d) g = 1048575 & j | 1048576; else {
      if (c = 0 | dg(0 | h, 0 | j, 12), (0 | (e = I)) > -1 | -1 == (0 | e) & c >>> 0 > 4294967295) {
       d = 0;
       do {
        d = d + -1 | 0, c = 0 | dg(0 | c, 0 | e, 1), e = I;
       } while ((0 | e) > -1 | -1 == (0 | e) & c >>> 0 > 4294967295);
      } else d = 0;
      h = 0 | dg(0 | h, 0 | j, 1 - d | 0), g = I;
     }
     if (k) j = 1048575 & m | 1048576; else {
      if (e = 0 | dg(0 | l, 0 | m, 12), (0 | (i = I)) > -1 | -1 == (0 | i) & e >>> 0 > 4294967295) {
       c = 0;
       do {
        c = c + -1 | 0, e = 0 | dg(0 | e, 0 | i, 1), i = I;
       } while ((0 | i) > -1 | -1 == (0 | i) & e >>> 0 > 4294967295);
      } else c = 0;
      l = 0 | dg(0 | l, 0 | m, 1 - c | 0), k = c, j = I;
     }
     e = 0 | ag(0 | h, 0 | g, 0 | l, 0 | j), i = (0 | (c = I)) > -1 | -1 == (0 | c) & e >>> 0 > 4294967295;
     b: do {
      if ((0 | d) > (0 | k)) {
       for (;;) {
        if (i) {
         if (0 == (0 | e) & 0 == (0 | c)) break;
        } else e = h, c = g;
        if (h = 0 | dg(0 | e, 0 | c, 1), g = I, d = d + -1 | 0, e = 0 | ag(0 | h, 0 | g, 0 | l, 0 | j), c = I, i = (0 | c) > -1 | -1 == (0 | c) & e >>> 0 > 4294967295, (0 | d) <= (0 | k)) break b;
       }
       b = 0 * a;
       break a;
      }
     } while (0);
     if (i) {
      if (0 == (0 | e) & 0 == (0 | c)) {
       b = 0 * a;
       break;
      }
     } else c = g, e = h;
     if (c >>> 0 < 1048576 | 1048576 == (0 | c) & e >>> 0 < 0) do {
      e = 0 | dg(0 | e, 0 | c, 1), c = I, d = d + -1 | 0;
     } while (c >>> 0 < 1048576 | 1048576 == (0 | c) & e >>> 0 < 0);
     (0 | d) > 0 ? (m = 0 | bg(0 | e, 0 | c, 0, -1048576), c = I, d = 0 | dg(0 | d, 0, 52), c |= I, d |= m) : (d = 0 | fg(0 | e, 0 | c, 1 - d | 0), c = I), f[s >> 2] = d, f[s + 4 >> 2] = c | n, b = +p[s >> 3];
    }
   } while (0);
   return 3 == (0 | o) && (b *= a, b /= b), +b;
  }
  function ub(a, b) {
   a |= 0;
   var c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0;
   if (x = u, u = u + 16 | 0, t = x, v = 12 + (b |= 0) | 0, q = 0 | X(0 | f[v >> 2], a), r = b + 4 | 0, s = 0 != (0 | a), !((0 | q) % (0 | f[b + 28 >> 2]) | 0)) {
    for (c = 0; 6 != (0 | c); ) f[b + 32 + (c << 2) >> 2] = 1 << (0 | f[r >> 2]) - 1, c = c + 1 | 0;
    if (s) {
     tf(0 | f[10815], -2, 1), c = 0;
     do {
      c = (c << 8 & 16776960) + (q = 0 | Qf(0 | f[10815])) | 0;
     } while (!(-1 == (0 | q) | 65488 == (65520 & c | 0)));
    }
    lb(-1, 0);
   }
   for (q = b + 16 | 0, e = b + 472 | 0, c = 0; 3 != (0 | c); ) p = (0 | f[e >> 2]) + (((0 | X(0 | f[q >> 2], 0 | f[v >> 2])) & 0 - (c + a & 1)) << 1) | 0, f[t + (c << 2) >> 2] = p, c = c + 1 | 0;
   for (l = b + 20 | 0, m = t + 4 | 0, n = b + 24 | 0, c = 0, k = 0, e = 0 | f[t >> 2], a = 0 | f[m >> 2]; !((0 | k) >= (0 | f[v >> 2])); ) {
    for (p = s & (o = 0 != (0 | k)), h = 0, i = e; !((0 | h) >= (0 | f[q >> 2])); ) {
     g = 0 | tb(0 | f[b + 312 + (h << 2) >> 2]), e = 0 | f[l >> 2];
     do {
      if (0 == (h | k | 0) | 0 == (0 | e) | (0 | h) > (0 | e)) {
       if (o) {
        e = 0 | j[i + (0 - (0 | f[q >> 2]) << 1) >> 1], w = 19;
        break;
       }
       e = 0 | f[(y = b + 32 + (h << 2) | 0) >> 2], f[y >> 2] = e + g;
       break;
      }
      e = c, w = 19;
     } while (0);
     a: do {
      if (19 == (0 | w) && (w = 0, p)) switch (0 | f[n >> 2]) {
      case 1:
       break a;

      case 2:
       e = 0 | j[a >> 1];
       break a;

      case 3:
       e = 0 | j[a + (0 - (0 | f[q >> 2]) << 1) >> 1];
       break a;

      case 4:
       e = (0 | j[a >> 1]) + e - (0 | j[a + (0 - (0 | f[q >> 2]) << 1) >> 1]) | 0;
       break a;

      case 5:
       e = ((0 | j[a >> 1]) - (0 | j[a + (0 - (0 | f[q >> 2]) << 1) >> 1]) >> 1) + e | 0;
       break a;

      case 6:
       e = (e - (0 | j[a + (0 - (0 | f[q >> 2]) << 1) >> 1]) >> 1) + (0 | j[a >> 1]) | 0;
       break a;

      case 7:
       e = (0 | j[a >> 1]) + e >> 1;
       break a;

      default:
       e = 0;
       break a;
      }
     } while (0);
     y = e + g | 0, d[i >> 1] = y, (65535 & y) >>> (0 | f[r >> 2]) | 0 && Xa(), (0 | h) <= (0 | f[l >> 2]) && (c = 0 | j[i >> 1]), h = h + 1 | 0, i = i + 2 | 0, a = a + 2 | 0;
    }
    k = k + 1 | 0, e = i;
   }
   return f[m >> 2] = a, f[t >> 2] = e, u = x, 0 | f[t + 8 >> 2];
  }
  function Vc(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0;
   for (w = u, u = u + 160 | 0, s = w + 48 | 0, r = w + 40 | 0, q = w + 32 | 0, v = w + 24 | 0, t = w + 16 | 0, p = w + 8 | 0, o = w, i = w + 120 | 0, j = w + 112 | 0, k = w + 96 | 0, m = w + 52 | 0, f[(l = w + 88 | 0) >> 2] = 0, tf(0 | f[10815], a, 0), d = 0; 1347114067 == (0 | $a()); ) {
    if ($a(), Of(i, 1, 40, 0 | f[10815]), e = 0 | $a(), g = 0 | Pf(0 | f[10815]), 0 | Yd(i, 29881) || (f[18317] = g, f[10965] = e), 0 | Yd(i, 29899) || (f[18489] = e), 0 | Yd(i, 29918) || (a = 0 | f[10815], f[o >> 2] = j, kf(a, 29937, o), (a = 0 | f[j >> 2]) >>> 0 < 39 && Te(43136, 0 | f[668 + (a << 2) >> 2])), !(0 | Yd(i, 29940))) {
     for (a = 0; f[j >> 2] = a, !((0 | a) >= 9); ) c = +bb(0 | $a()), n[m + ((a = 0 | f[j >> 2]) << 2) >> 2] = c, a = a + 1 | 0;
     Uc(m);
    }
    if (!(0 | Yd(i, 29966))) {
     for (a = 0; f[j >> 2] = a, !((0 | a) >= 9); ) b = 0 | f[10815], f[p >> 2] = m + (a << 2), kf(b, 29988, p), a = 1 + (0 | f[j >> 2]) | 0;
     Uc(m);
    }
    0 | Yd(i, 29991) || (b = 0 | f[10815], f[t >> 2] = l, kf(b, 29937, t)), 0 | Yd(i, 30017) || (b = 0 | f[10815], f[v >> 2] = 73284, kf(b, 29937, v));
    a: do {
     if (0 | Yd(i, 30044)) a = d; else for (b = 0, a = d; ;) {
      if (4 == (0 | b)) break a;
      d = 0 | f[10815], f[q >> 2] = j, kf(d, 29937, q), d = 1 == (0 | f[j >> 2]) ? b >> 1 ^ b : a, b = b + 1 | 0, a = d;
     }
    } while (0);
    0 | Yd(i, 30068) || (d = 0 | f[10815], f[r >> 2] = j, kf(d, 29937, r), f[18321] = (0 | f[j >> 2]) - (0 | f[18321])), d = 0 != (0 | Yd(i, 30091));
    b: do {
     if (!(d | 0 != +n[10961])) {
      for (b = 0; 4 != (0 | b); ) d = 0 | f[10815], f[s >> 2] = k + (b << 2), kf(d, 29937, s), b = b + 1 | 0;
      for (c = +(0 | f[k >> 2]), b = 0; ;) {
       if (3 == (0 | b)) break b;
       d = b + 1 | 0, n[43844 + (b << 2) >> 2] = c / +(0 | f[k + (d << 2) >> 2]), b = d;
      }
     }
    } while (0);
    0 | Yd(i, 30108) || (d = 0 | $a(), f[10846] = d), Vc(g), tf(0 | f[10815], g + e | 0, 0), d = a;
   }
   0 | (a = 0 | f[l >> 2]) && (v = 0 | X(0 | h[30118 + ((((0 | f[18321]) >>> 0) / 90 | 0) + d & 3) >> 0], 1 == (0 | a) ? 16843009 : 0), f[10812] = v), u = w;
  }
  function wd(a) {
   var c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0;
   for (i = u, u = u + 32 | 0, h = i, cg(8 + (a |= 0) | 0, 0, 1368), c = (0 | Ef(1296910665)) >>> 16 & 65535, d[a >> 1] = c, d[a + 2 >> 1] = 42, f[a + 4 >> 2] = 10, f[a + 484 >> 2] = 300, f[a + 476 >> 2] = 300, f[a + 488 >> 2] = 1, f[a + 480 >> 2] = 1, c = 0; 6 != (0 | c); ) f[a + 476 + (c + 4 << 2) >> 2] = 1e6, c = c + 1 | 0;
   f[(c = a + 492 | 0) >> 2] = ~~(+n[18320] * +(0 | f[c >> 2])), f[(c = a + 500 | 0) >> 2] = ~~(+n[18319] * +(0 | f[c >> 2])), f[(c = a + 508 | 0) >> 2] = ~~(+n[18455] * +(0 | f[c >> 2])), Gf(a + 620 | 0, 361488, 512), Gf(a + 1132 | 0, 43072, 64), Gf(a + 1196 | 0, 43136, 64), e = 39666, g = 12 + (c = a + 1260 | 0) | 0;
   do {
    b[c >> 0] = 0 | b[e >> 0], c = c + 1 | 0, e = e + 1 | 0;
   } while ((0 | c) < (0 | g));
   if (l = 0 | Fa(73264), k = 1 + (0 | f[l + 16 >> 2]) | 0, j = 0 | f[l + 12 >> 2], e = 0 | f[l + 8 >> 2], g = 0 | f[l + 4 >> 2], c = 0 | f[l >> 2], f[h >> 2] = 1900 + (0 | f[l + 20 >> 2]), f[h + 4 >> 2] = k, f[h + 8 >> 2] = j, f[h + 12 >> 2] = e, f[h + 16 >> 2] = g, f[h + 20 >> 2] = c, $d(a + 1292 | 0, 39678, h), Gf(a + 1312 | 0, 361424, 64), c = a + 10 | 0, vd(a, c, 270, 2, 512, 620), vd(a, c, 271, 2, 64, 1132), vd(a, c, 272, 2, 64, 1196), vd(a, c, 274, 3, 1, (0 | b[39708 + (0 | f[18321]) >> 0]) - 48 | 0), vd(a, c, 282, 5, 1, 476), vd(a, c, 283, 5, 1, 484), vd(a, c, 284, 3, 1, 1), vd(a, c, 296, 3, 1, 2), vd(a, c, 305, 2, 32, 1260), vd(a, c, 306, 2, 20, 1292), vd(a, c, 315, 2, 64, 1312), h = a + 294 | 0, vd(a, c, -30871, 4, 1, 294), vd(a, h, -32102, 5, 1, 492), vd(a, h, -32099, 5, 1, 500), vd(a, h, -30681, 3, 1, ~~+n[18318]), vd(a, h, -28150, 5, 1, 508), 0 | f[18458]) {
    e = a + 346 | 0, vd(a, c, -30683, 4, 1, 346), vd(a, e, 0, 1, 4, 514), vd(a, e, 1, 2, 2, 0 | f[18486]), vd(a, e, 2, 5, 3, 516), vd(a, e, 3, 2, 2, 0 | f[18487]), vd(a, e, 4, 5, 3, 540), vd(a, e, 5, 1, 1, 0 | f[18488]), vd(a, e, 6, 5, 1, 588), vd(a, e, 7, 5, 3, 564), vd(a, e, 18, 2, 12, 596), vd(a, e, 29, 2, 12, 608), e = 73828, g = 104 + (c = a + 516 | 0) | 0;
    do {
     f[c >> 2] = f[e >> 2], c = c + 4 | 0, e = e + 4 | 0;
    } while ((0 | c) < (0 | g));
   }
   u = i;
  }
  function yb(a) {
   a |= 0;
   var b = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, o = 0;
   l = u, u = u + 768 | 0, k = l;
   a: do {
    if (0 == +n[10849]) for (b = 0; ;) {
     if (106 == (0 | b)) break a;
     m = .5 * +N(3.141592653589793 * +(31 & b | 0) * .0625), n[43396 + (b << 2) >> 2] = m, b = b + 1 | 0;
    }
   } while (0);
   for (cg(k + 4 | 0, 0, 764), e = 0 | tb(0 | f[a + 312 >> 2]), e = (e = 0 | X(0 | j[a + 56 >> 1], e)) + (0 | f[(b = a + 32 | 0) >> 2]) | 0, f[b >> 2] = e, n[k >> 2] = +(0 | e), e = a + 376 | 0, b = 1; ;) {
    if ((0 | b) >= 64) {
     b = 0;
     break;
    }
    if (c = 0 | f[e >> 2], c = 0 | lb(0 | j[c >> 1], c + 2 | 0), i = c >> 4, b = i + b | 0, 0 == (0 | (c &= 15)) & (0 | i) < 15) {
     b = 0;
     break;
    }
    i = 0 | lb(c, 0), m = +(0 | X(i - (0 == (i & 1 << c + -1 | 0) ? (1 << c) - 1 | 0 : 0) | 0, 0 | j[a + 56 + (b << 1) >> 1])), n[k + ((0 | h[28729 + b >> 0]) << 2) >> 2] = m, b = b + 1 | 0;
   }
   for (;;) {
    if (8 == (0 | b)) {
     b = 0;
     break;
    }
    n[(i = k + (b << 2) | 0) >> 2] = .7071067811865476 * +n[i >> 2], b = b + 1 | 0;
   }
   for (;;) {
    if (8 == (0 | b)) {
     c = 0;
     break;
    }
    n[(i = k + (b << 5) | 0) >> 2] = .7071067811865476 * +n[i >> 2], b = b + 1 | 0;
   }
   for (;;) {
    if (8 == (0 | c)) {
     c = 0;
     break;
    }
    for (b = 0; 8 != (0 | b); ) {
     for (g = b << 1 | 1, i = k + 256 + (c << 5) + (b << 2) | 0, e = 0; 8 != (0 | e); ) o = 43396 + ((0 | X(e, g)) << 2) | 0, n[i >> 2] = +n[i >> 2] + +n[k + (c << 5) + (e << 2) >> 2] * +n[o >> 2], e = e + 1 | 0;
     b = b + 1 | 0;
    }
    c = c + 1 | 0;
   }
   for (;;) {
    if (8 == (0 | c)) {
     b = 0;
     break;
    }
    for (g = c << 1 | 1, b = 0; 8 != (0 | b); ) {
     for (i = k + 512 + (c << 5) + (b << 2) | 0, e = 0; 8 != (0 | e); ) o = 43396 + ((0 | X(e, g)) << 2) | 0, n[i >> 2] = +n[i >> 2] + +n[k + 256 + (e << 5) + (b << 2) >> 2] * +n[o >> 2], e = e + 1 | 0;
     b = b + 1 | 0;
    }
    c = c + 1 | 0;
   }
   for (;64 != (0 | b); ) o = ~~(+n[k + 512 + (b << 2) >> 2] + .5), d[a + 184 + (b << 1) >> 1] = (0 | o) > 0 ? 65535 & ((0 | o) < 65535 ? o : 65535) : 0, b = b + 1 | 0;
   u = l;
  }
  function jc(a, c) {
   a |= 0, c |= 0;
   var e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (p = u, u = u + 784 | 0, m = p + 16 | 0, n = p, h = 0 | Pf(0 | f[10815]), o = -4 & (g = c + 3 | 0), c = 0; ;) {
    if ((0 | c) >= (0 | o)) {
     e = 11;
     break;
    }
    if (e = 0 | Qf(0 | f[10815]), l = 15 & e, b[m + c >> 0] = l, l >>> 0 > 12) {
     e = 5;
     break;
    }
    if (l = e >>> 4 & 15, b[m + (1 | c) >> 0] = l, l >>> 0 > 12) {
     e = 5;
     break;
    }
    c = c + 2 | 0;
   }
   a: do {
    if (5 == (0 | e)) for (tf(0 | f[10815], h, 0), g = n + 4 | 0, h = n + 8 | 0, i = n + 2 | 0, k = n + 6 | 0, l = n + 10 | 0, e = 0; ;) {
     if ((0 | e) >= (0 | o)) {
      c = 1;
      break a;
     }
     for (db(n, 6), d[a + (e << 1) >> 1] = (0 | j[g >> 1]) >>> 12 << 4 | (0 | j[n >> 1]) >>> 12 << 8 | (0 | j[h >> 1]) >>> 12, d[a + ((1 | e) << 1) >> 1] = (0 | j[k >> 1]) >>> 12 << 4 | (0 | j[i >> 1]) >>> 12 << 8 | (0 | j[l >> 1]) >>> 12, m = 2 | e, c = 0; 6 != (0 | c); ) d[a + (c + m << 1) >> 1] = 4095 & d[n + (c << 1) >> 1], c = c + 1 | 0;
     e = e + 8 | 0;
    } else if (11 == (0 | e)) for (4 & g ? (e = (0 | Qf(0 | f[10815])) << 8, e = 0 | bg(0 | (h = 0 | Qf(0 | f[10815])), ((0 | h) < 0) << 31 >> 31 | 0, 0 | e, ((0 | e) < 0) << 31 >> 31 | 0), h = 16, i = 0, c = I) : (h = 0, i = 0, e = 0, c = 0); ;) {
     if ((0 | i) >= (0 | o)) {
      c = 0;
      break a;
     }
     if (k = 0 | b[m + i >> 0], l = 255 & k, (0 | h) < (0 | l)) {
      for (g = 0; !((0 | g) >= 32); ) n = 0 | dg(0 | (n = 0 | Qf(0 | f[10815])), ((0 | n) < 0) << 31 >> 31 | 0, (8 ^ g) + h | 0), g = g + 8 | 0, e = n = 0 | bg(0 | n, 0 | I, 0 | e, 0 | c), c = I;
      h = h + 32 | 0;
     }
     n = e & 65535 >>> (16 - l | 0), e = 0 | eg(0 | e, 0 | c, 255 & k | 0), d[a + (i << 1) >> 1] = n - (0 == (n & 1 << l + -1 | 0) ? 65535 + (1 << l) | 0 : 0), h = h - l | 0, i = i + 1 | 0, c = I;
    }
   } while (0);
   return u = p, 0 | c;
  }
  function fd(a) {
   a |= 0;
   var c = 0, e = 0, g = 0, h = 0, i = 0;
   if (tf(0 | f[10815], a, 0), (a = 0 | $a()) >>> 0 <= 255) {
    for (;h = a + -1 | 0, a; ) {
     a = 0 | Za(), g = 65535 & (0 | Za()), e = 0 | Pf(0 | f[10815]);
     a: do {
      if (a << 16 >> 16 < 304) {
       if (a << 16 >> 16 >= 256) switch (a << 16 >> 16) {
       case 256:
        c = 0 | Za(), d[168360] = c, c = 0 | Za(), d[168359] = c;
        break a;

       case 289:
        c = 0 | Za(), d[168355] = c, c = 0 | Za(), d[168356] = c << 16 >> 16 == 4284 ? 4287 : c;
        break a;

       default:
        break a;
       }
       switch (a << 16 >> 16) {
       case -16384:
        break;

       default:
        break a;
       }
       a = 0 | d[102818], d[102818] = 18761;
       do {
        c = 0 | $a();
       } while (c >>> 0 > (0 | j[168359]) >>> 0);
       d[168356] = c, c = 65535 & (0 | $a()), d[168355] = c, d[102818] = a;
      } else {
       if (a << 16 >> 16 < 305) {
        switch (a << 16 >> 16) {
        case 304:
         break;

        default:
         break a;
        }
        c = (0 | Qf(0 | f[10815])) >> 7, f[18283] = c, c = 65535 & ((0 | Qf(0 | f[10815])) >>> 3 & 1 ^ 1), d[172468] = c;
        break;
       }
       if (a << 16 >> 16 >= 12272) {
        switch (a << 16 >> 16) {
        case 12272:
         a = 0;
         break;

        default:
         break a;
        }
        for (;;) {
         if (4 == (0 | a)) break a;
         i = +(65535 & (0 | Za())), n[43844 + ((1 ^ a) << 2) >> 2] = i, a = a + 1 | 0;
        }
       }
       switch (a << 16 >> 16) {
       case 305:
        break;

       default:
        break a;
       }
       for (f[10812] = 9, a = 0; ;) {
        if (36 == (0 | a)) break a;
        c = 3 & (0 | Qf(0 | f[10815])), b[35 - a + 362005 >> 0] = c, a = a + 1 | 0;
       }
      }
     } while (0);
     tf(0 | f[10815], e + g | 0, 0), a = h;
    }
    h = 0 | f[18283], d[168355] = (0 | j[168355]) << h, d[168356] = (0 | j[168356]) >>> h;
   }
  }
  function ge(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, g = 0;
   a: do {
    if (b >>> 0 <= 20) switch (0 | b) {
    case 9:
     b = 0 | f[(d = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = d + 4, f[a >> 2] = b;
     break a;

    case 10:
     b = 0 | f[(d = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = d + 4, f[(d = a) >> 2] = b, f[d + 4 >> 2] = ((0 | b) < 0) << 31 >> 31;
     break a;

    case 11:
     b = 0 | f[(d = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = d + 4, f[(d = a) >> 2] = b, f[d + 4 >> 2] = 0;
     break a;

    case 12:
     e = 0 | f[(b = d = 7 + (0 | f[c >> 2]) & -8) >> 2], b = 0 | f[b + 4 >> 2], f[c >> 2] = d + 8, f[(d = a) >> 2] = e, f[d + 4 >> 2] = b;
     break a;

    case 13:
     d = 0 | f[(e = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = e + 4, d = (65535 & d) << 16 >> 16, f[(e = a) >> 2] = d, f[e + 4 >> 2] = ((0 | d) < 0) << 31 >> 31;
     break a;

    case 14:
     d = 0 | f[(e = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = e + 4, f[(e = a) >> 2] = 65535 & d, f[e + 4 >> 2] = 0;
     break a;

    case 15:
     d = 0 | f[(e = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = e + 4, d = (255 & d) << 24 >> 24, f[(e = a) >> 2] = d, f[e + 4 >> 2] = ((0 | d) < 0) << 31 >> 31;
     break a;

    case 16:
     d = 0 | f[(e = 3 + (0 | f[c >> 2]) & -4) >> 2], f[c >> 2] = e + 4, f[(e = a) >> 2] = 255 & d, f[e + 4 >> 2] = 0;
     break a;

    case 17:
    case 18:
     g = +p[(e = 7 + (0 | f[c >> 2]) & -8) >> 3], f[c >> 2] = e + 8, p[a >> 3] = g;
     break a;

    default:
     break a;
    }
   } while (0);
  }
  function Fe(a, b) {
   b |= 0;
   var c = 0, d = 0, e = 0, g = 0, i = 0, j = 0, k = 0;
   switch (k = 4 + (a |= 0) | 0, c = 0 | f[k >> 2], j = a + 100 | 0, c >>> 0 < (0 | f[j >> 2]) >>> 0 ? (f[k >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a), 0 | c) {
   case 43:
   case 45:
    d = 45 == (0 | c) & 1, (c = 0 | f[k >> 2]) >>> 0 < (0 | f[j >> 2]) >>> 0 ? (f[k >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a), 0 != (0 | b) & (c + -48 | 0) >>> 0 > 9 && 0 | f[j >> 2] && (f[k >> 2] = (0 | f[k >> 2]) - 1);
    break;

   default:
    d = 0;
   }
   if ((c + -48 | 0) >>> 0 > 9) 0 | f[j >> 2] ? (f[k >> 2] = (0 | f[k >> 2]) - 1, d = -2147483648, c = 0) : (d = -2147483648, c = 0); else {
    i = 0;
    do {
     i = c + -48 + (10 * i | 0) | 0, (c = 0 | f[k >> 2]) >>> 0 < (0 | f[j >> 2]) >>> 0 ? (f[k >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a), e = (c + -48 | 0) >>> 0 < 10;
    } while ((0 | i) < 214748364 & e);
    if (b = ((0 | i) < 0) << 31 >> 31, e) {
     e = i;
     do {
      e = 0 | bg(0 | (e = 0 | bg(0 | (e = 0 | lg(0 | e, 0 | b, 10, 0)), 0 | I, -48, -1)), 0 | I, 0 | c, ((0 | c) < 0) << 31 >> 31 | 0), b = I, (c = 0 | f[k >> 2]) >>> 0 < (0 | f[j >> 2]) >>> 0 ? (f[k >> 2] = c + 1, c = 0 | h[c >> 0]) : c = 0 | Td(a);
     } while (((0 | b) < 21474836 | 21474836 == (0 | b) & e >>> 0 < 2061584302) & (c + -48 | 0) >>> 0 < 10);
     g = c, i = e;
    } else g = c;
    if (c = 0 | f[j >> 2], (g + -48 | 0) >>> 0 < 10) do {
     (e = 0 | f[k >> 2]) >>> 0 < c >>> 0 ? (f[k >> 2] = e + 1, e = 0 | h[e >> 0]) : (e = 0 | Td(a), c = 0 | f[j >> 2]);
    } while ((e + -48 | 0) >>> 0 < 10);
    0 | c && (f[k >> 2] = (0 | f[k >> 2]) - 1), k = 0 != (0 | d), c = 0 | ag(0, 0, 0 | i, 0 | b), d = k ? I : b, c = k ? c : i;
   }
   return I = d, 0 | c;
  }
  function kd() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
   switch (j = u, u = u + 16 | 0, g = j, d[102818] = 18761, tf(0 | f[10815], 4, 0), c = (0 | Za()) << 16 >> 16 == 2 & 1, f[10956] = c, tf(0 | f[10815], 14, 1), c = 0 | $a(), c = 0 | X(0 | f[10956], c), f[10956] = c, c = 0 | $a(), e = 0 | $a(), h = 0 | $a(), a = 0 | $a(), f[18316] = a, 0 | (a = 0 | $a()) && (f[18316] = a), tf(0 | f[10815], c + 4 | 0, 0), c = 65535 & (0 | $a()), d[168359] = c, c = 65535 & (0 | $a()), d[168360] = c, Za(), (0 | Za()) << 16 >> 16) {
   case 8:
    a = 5, i = 5;
    break;

   case 16:
    a = 13, i = 5;
   }
   switch (5 == (0 | i) && (f[18282] = a), tf(0 | f[10815], e + 792 | 0, 0), b[43072] = 0 | b[30669], b[43073] = 0 | b[30670], b[43074] = 0 | b[30671], b[43075] = 0 | b[30672], b[43076] = 0 | b[30673], e = 0 | $a(), f[g >> 2] = e, $d(43136, 29937, g), tf(0 | f[10815], 12, 1), 16777215 & (0 | $a()) | 0) {
   case 3:
    f[10812] = -1802201964;
    break;

   case 4:
    f[10812] = 1229539657;
    break;

   default:
    f[10956] = 0;
   }
   switch (tf(0 | f[10815], 72, 1), 511 & (((3600 + (0 | $a()) | 0) >>> 0) % 360 | 0)) {
   case 270:
    a = 4, i = 14;
    break;

   case 180:
    a = 1, i = 14;
    break;

   case 90:
    a = 7, i = 14;
    break;

   case 0:
    a = 2, i = 14;
   }
   14 == (0 | i) && (f[18321] = a), k = +cb(11), n[10961] = k, k = +cb(11), n[10963] = k, a = ~(-1 << (0 | $a())), f[10839] = a, tf(0 | f[10815], 668, 1), k = +((0 | $a()) >>> 0) / 1e9, n[18320] = k, tf(0 | f[10815], h, 0), (a = 0 | f[10804]) >>> 0 < (0 | f[10956]) >>> 0 && tf(0 | f[10815], a << 3, 1), i = 8 + (0 | $a()) | 0, f[10960] = i, $a(), u = j;
  }
  function Mc() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
   for (r = u, u = u + 48 | 0, m = r, n = 0 | f[10810], p = o = 0 | f[10822], q = m + 16 | 0, l = 1; !((0 | l) > (0 | n)); ) {
    for (k = 0; !((0 | k) >= 3); ) {
     for (g = 65535 & (a = 0 | d[168356]), e = o + ((0 | X(65535 & (b = 0 | d[168355]), g)) << 3) | 0, c = o; !(c >>> 0 >= e >>> 0); ) d[c + 6 >> 1] = 0 | d[c + (k << 1) >> 1], c = c + 8 | 0;
     for (i = o + (g << 3) | 0; g = 65535 & a, !(i >>> 0 >= (o + ((0 | X((65535 & b) - 1 | 0, g)) << 3) | 0) >>> 0); ) {
      if ((0 | (1 + (i - p >> 3) | 0) % (0 | g)) >= 2) {
       for (a = 0, c = 0 - g | 0; ;) {
        if ((0 | c) > (0 | g)) {
         a = 0;
         break;
        }
        for (e = c + 1 | 0, b = c + -1 | 0; !((0 | b) > (0 | e)); ) f[m + (a << 2) >> 2] = (0 | j[i + (b << 3) + 6 >> 1]) - (0 | j[i + (b << 3) + 2 >> 1]), b = b + 1 | 0, a = a + 1 | 0;
        c = c + g | 0;
       }
       for (;!(a >>> 0 >= 38); ) (0 | (c = 0 | f[(b = m + ((0 | h[29463 + a >> 0]) << 2) | 0) >> 2])) > (0 | (g = 0 | f[(e = m + ((0 | h[29463 + (1 | a) >> 0]) << 2) | 0) >> 2])) && (g = g + c | 0, f[b >> 2] = g, g = g - (0 | f[e >> 2]) | 0, f[e >> 2] = g, f[b >> 2] = (0 | f[b >> 2]) - g), a = a + 2 | 0;
       a = (0 | j[i + 2 >> 1]) + (0 | f[q >> 2]) | 0, d[i + (k << 1) >> 1] = (0 | a) > 0 ? 65535 & ((0 | a) < 65535 ? a : 65535) : 0, a = 0 | d[168356], b = 0 | d[168355];
      }
      i = i + 8 | 0;
     }
     k = k + 2 | 0;
    }
    l = l + 1 | 0;
   }
   u = r;
  }
  function $c() {
   var a = 0, c = 0, d = 0, e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0;
   if (n = u, u = u + 16 | 0, m = n, l = 0 | f[10815], d = 0 | f[10813], j = 0 | Cf(d, 46), (a = 0 | Cf(d, 47)) || (a = 0 | Cf(d, 92)), e = 0 == (0 | a) ? d + -1 | 0 : a, i = e + 1 | 0, 0 | j && 4 == (0 | Ne(j)) && (c = j, a = i, 8 == (c - a | 0))) {
    Te(k = 0 | Ad(1 + (0 | Ne(d)) | 0), d), d = k + (a - (g = 0 | f[10813])) | 0, a = k + (c - g) | 0;
    a: do {
     if (0 | Me(j, 30305)) j = (j = 0 != (0 | Qd(0 | b[j + 1 >> 0]))) ? 30310 : 30305, b[a >> 0] = 0 | b[j >> 0], b[a + 1 >> 0] = 0 | b[j + 1 >> 0], b[a + 2 >> 0] = 0 | b[j + 2 >> 0], b[a + 3 >> 0] = 0 | b[j + 3 >> 0], b[a + 4 >> 0] = 0 | b[j + 4 >> 0], ((0 | b[i >> 0]) - 48 | 0) >>> 0 < 10 && (j = h[(j = e + 5 | 0) >> 0] | h[j + 1 >> 0] << 8 | h[j + 2 >> 0] << 16 | h[j + 3 >> 0] << 24, b[d >> 0] = j, b[d + 1 >> 0] = j >> 8, b[d + 2 >> 0] = j >> 16, b[d + 3 >> 0] = j >> 24, j = d + 4 | 0, i = h[i >> 0] | h[i + 1 >> 0] << 8 | h[i + 2 >> 0] << 16 | h[i + 3 >> 0] << 24, b[j >> 0] = i, b[j + 1 >> 0] = i >> 8, b[j + 2 >> 0] = i >> 16, b[j + 3 >> 0] = i >> 24); else {
      for (;;) {
       if (a = a + -1 | 0, (((c = 0 | b[a >> 0]) << 24 >> 24) - 48 | 0) >>> 0 >= 10) break a;
       if (c << 24 >> 24 != 57) break;
       b[a >> 0] = 48;
      }
      b[a >> 0] = c + 1 << 24 >> 24;
     }
    } while (0);
    0 | Yd(k, g) && (j = 0 | _e(k, 29460), f[10815] = j, 0 | j && (Yc(12), f[18317] = 0, f[10956] = 1, ef(0 | f[10815]))), 0 | f[18316] || (f[m >> 2] = k, uf(22792, 30315, m)), Bd(k), f[10815] = l;
   }
   u = n;
  }
  function Jc(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
   for (j = u, u = u + 144 | 0, i = j, h = 0; ;) {
    if (3 == (0 | h)) {
     g = 0;
     break;
    }
    for (f = h + 3 | 0, d = 0; ;) {
     if (6 == (0 | d)) {
      f = 0;
      break;
     }
     p[i + (48 * h | 0) + (d << 3) >> 3] = +((0 | d) == (0 | f) & 1), d = d + 1 | 0;
    }
    for (;3 != (0 | f); ) {
     for (g = i + (48 * h | 0) + (f << 3) | 0, d = 0; !((0 | d) >= (0 | c)); ) p[g >> 3] = +p[g >> 3] + +p[a + (24 * d | 0) + (h << 3) >> 3] * +p[a + (24 * d | 0) + (f << 3) >> 3], d = d + 1 | 0;
     f = f + 1 | 0;
    }
    h = h + 1 | 0;
   }
   for (;;) {
    if (3 == (0 | g)) {
     f = 0;
     break;
    }
    for (e = +p[i + (48 * g | 0) + (g << 3) >> 3], d = 0; ;) {
     if (6 == (0 | d)) {
      d = 0;
      break;
     }
     p[(h = i + (48 * g | 0) + (d << 3) | 0) >> 3] = +p[h >> 3] / e, d = d + 1 | 0;
    }
    for (;3 != (0 | d); ) {
     a: do {
      if ((0 | d) != (0 | g)) for (e = +p[i + (48 * d | 0) + (g << 3) >> 3], f = 0; ;) {
       if (6 == (0 | f)) break a;
       p[(h = i + (48 * d | 0) + (f << 3) | 0) >> 3] = +p[h >> 3] - e * +p[i + (48 * g | 0) + (f << 3) >> 3], f = f + 1 | 0;
      }
     } while (0);
     d = d + 1 | 0;
    }
    g = g + 1 | 0;
   }
   for (;(0 | f) < (0 | c); ) {
    for (g = 0; 3 != (0 | g); ) {
     for (p[(h = b + (24 * f | 0) + (g << 3) | 0) >> 3] = 0, d = 0, e = 0; 3 != (0 | d); ) k = e + +p[i + (48 * g | 0) + (d + 3 << 3) >> 3] * +p[a + (24 * f | 0) + (d << 3) >> 3], p[h >> 3] = k, d = d + 1 | 0, e = k;
     g = g + 1 | 0;
    }
    f = f + 1 | 0;
   }
   u = j;
  }
  function cd() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   o = u, u = u + 208 | 0, n = o + 16 | 0, m = o, k = o + 72 | 0, l = o + 28 | 0, tf(0 | f[10815], 0, 0), e = (c = l) + 44 | 0;
   do {
    f[c >> 2] = 0, c = c + 4 | 0;
   } while ((0 | c) < (0 | e));
   c = l + 16 | 0, e = l + 20 | 0, g = l + 12 | 0, h = l + 8 | 0, i = l + 4 | 0;
   do {
    hf(k, 128, 0 | f[10815]), (a = 0 | Oe(k, 61)) ? (b[a >> 0] = 0, a = a + 1 | 0) : a = k + (0 | Ne(k)) | 0, 0 | Yd(k, 30421) || (f[m >> 2] = g, f[m + 4 >> 2] = c, f[m + 8 >> 2] = e, lf(a, 28720, m)), 0 | Yd(k, 30425) || (f[n >> 2] = h, f[n + 4 >> 2] = i, f[n + 8 >> 2] = l, lf(a, 30429, n)), 0 | Yd(k, 30438) || (p = 0 | Yf(a), f[18317] = p), 0 | Yd(k, 30442) || (p = 65535 & (0 | Yf(a)), d[168359] = p), 0 | Yd(k, 30446) || (p = 65535 & (0 | Yf(a)), d[168360] = p), 0 | Yd(k, 30450) || (p = 65535 & (0 | Yf(a)), d[168364] = p), 0 | Yd(k, 30454) || (p = 65535 & (0 | Yf(a)), d[168365] = p);
   } while (0 != (0 | _d(k, 30458, 4)));
   p = (0 | X((0 | j[168364]) << 1, 0 | j[168365])) + (0 | f[18317]) | 0, f[10960] = p, f[e >> 2] = (0 | f[e >> 2]) - 1900, f[c >> 2] = (0 | f[c >> 2]) - 1, (0 | ra(0 | l)) > 0 && (p = 0 | ra(0 | l), f[18316] = p), b[43072] = 0 | b[30463], b[43073] = 0 | b[30464], b[43074] = 0 | b[30465], b[43075] = 0 | b[30466], b[43076] = 0 | b[30467], b[43077] = 0 | b[30468], b[43078] = 0 | b[30469], a = 30470, e = 9 + (c = 43136) | 0;
   do {
    b[c >> 0] = 0 | b[a >> 0], c = c + 1 | 0, a = a + 1 | 0;
   } while ((0 | c) < (0 | e));
   f[18491] = 29, u = o;
  }
  function Ic(a, b, c, e) {
   a = +a, b = +b, c |= 0, e |= 0;
   var g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, q = 0, r = 0, s = 0, t = 0;
   if (t = u, u = u + 16 | 0, n = t, f[n >> 2] = 0, f[n + 4 >> 2] = 0, f[n + 8 >> 2] = 0, f[n + 12 >> 2] = 0, p[n + ((b >= 1 & 1) << 3) >> 3] = 1, s = 0 != a, r = 1 / a, 0 != b) if ((a + -1) * (b + -1) <= 0) {
    for (m = n + 8 | 0, j = -a, k = 0, g = 0; 48 != (0 | k); ) h = 1 / (g = .5 * (+p[n >> 3] + +p[m >> 3])), i = s ? (+M(+g / b, +j) - 1) / a - h > -1 : g / +U(+(1 - h)) < b, p[n + ((1 & i) << 3) >> 3] = g, k = k + 1 | 0;
    h = g / b, j = (r + -1) * g, s ? (l = j, j += 1, i = 12) : i = 13;
   } else i = 11; else i = 11;
   11 == (0 | i) && (s ? (g = 0, h = 0, l = 0, j = 1, i = 12) : (g = 0, h = 0, i = 13)), 12 == (0 | i) ? q = j : 13 == (0 | i) && (l = 0, q = 1);
   a: do {
    if (c) for (o = +(0 | e), k = 1 == (0 | c), i = 0; ;) {
     if (65536 == (0 | i)) break a;
     if (m = 205638 + (i << 1) | 0, d[m >> 1] = -1, (j = +(0 | i) / o) < 1) {
      do {
       if (k) {
        if (j < g) {
         j /= b;
         break;
        }
        if (s) {
         j = +M(+(l + j) / q, +r);
         break;
        }
        j = +U(+(j + -1) / g);
        break;
       }
       if (j < h) {
        j *= b;
        break;
       }
       if (s) {
        j = q * +M(+j, +a) - l;
        break;
       }
       j = g * +V(+j) + 1;
       break;
      } while (0);
      d[m >> 1] = ~~(65536 * j);
     }
     i = i + 1 | 0;
    } else p[17] = a, p[18] = b;
   } while (0);
   u = t;
  }
  function Sc(a) {
   a |= 0;
   var b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0;
   for (l = u, u = u + 16 | 0, e = l + 12 | 0, h = l + 8 | 0, i = l + 4 | 0, j = l, k = 0 == (0 | (k = 0 | _d(43072, 29618, 7))) & (0 | f[18334]) >>> 0 < 3, b = 65535 & (0 | Za()); g = b + -1 | 0, b; ) {
    Pc(a, e, h, i, j);
    a: do {
     switch (0 | f[e >> 2]) {
     case 33434:
      c = +cb(0 | f[h >> 2]), n[18320] = c, n[73340 + (48 * ((0 | f[18334]) - 1 | 0) | 0) + 44 >> 2] = c;
      break;

     case 33437:
      c = +cb(0 | f[h >> 2]), n[18319] = c;
      break;

     case 34855:
      c = +(65535 & (0 | Za())), n[18318] = c;
      break;

     case 36868:
     case 36867:
      Rc(0);
      break;

     case 37377:
      (c = +cb(0 | f[h >> 2])) > -128 && (c = +la(+ -c), n[18320] = c, n[73340 + (48 * ((0 | f[18334]) - 1 | 0) | 0) + 44 >> 2] = c);
      break;

     case 37378:
      c = +la(.5 * +cb(0 | f[h >> 2])), n[18319] = c;
      break;

     case 37386:
      c = +cb(0 | f[h >> 2]), n[18455] = c;
      break;

     case 41730:
      if (131074 == (0 | $a())) for (f[18456] = 0, b = 0; ;) {
       if (b >>> 0 >= 8) break a;
       m = (0 | X(0 | Qf(0 | f[10815]), 16843009)) << b, f[18456] = m | f[18456], b = b + 2 | 0;
      }
      break;

     case 40962:
      k && (m = 65535 & (0 | $a()), d[168359] = m);
      break;

     case 40963:
      k && (m = 65535 & (0 | $a()), d[168360] = m);
     }
    } while (0);
    tf(0 | f[10815], 0 | f[j >> 2], 0), b = g;
   }
   u = l;
  }
  function hd() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0;
   l = u, u = u + 208 | 0, h = l, a = l + 200 | 0, g = l + 136 | 0, i = l + 72 | 0, j = l + 24 | 0, d[102818] = 18761, Of(a, 4, 1, 0 | f[10815]), c = 0 | $a(), e = (0 | Pf(0 | f[10815])) + c | 0;
   a: do {
    if (0 | Zd(a, 30592, 4)) if (0 | Zd(a, 30597, 4)) {
     if (!(0 | Zd(a, 30602, 4))) for (;;) {
      if ((7 + (0 | Pf(0 | f[10815])) | 0) >>> 0 >= e >>> 0) break a;
      j = 65535 & (0 | Za()), (a = 0 | Za()) << 16 >> 16 == 20 & 20 == (j + 1 & 131070 | 0) ? Rc(0) : tf(0 | f[10815], 65535 & a, 1);
     }
     if (e = c >>> 0 < 64 & 0 == (0 | Zd(a, 30607, 4)), a = 0 | f[10815], !e) {
      tf(a, c, 1);
      break;
     }
     Of(g, 64, 1, a), b[g + c >> 0] = 0, c = (a = j) + 44 | 0;
     do {
      f[a >> 2] = 0, a = a + 4 | 0;
     } while ((0 | a) < (0 | c));
     if (c = j + 20 | 0, f[h >> 2] = i, f[h + 4 >> 2] = j + 12, f[h + 8 >> 2] = j + 8, f[h + 12 >> 2] = j + 4, f[h + 16 >> 2] = j, f[h + 20 >> 2] = c, 6 == (0 | lf(g, 30612, h))) {
      for (a = 0; !(a >>> 0 >= 12) && 0 | Me(30544 + (a << 2) | 0, i); ) a = a + 1 | 0;
      f[j + 16 >> 2] = a, f[c >> 2] = (0 | f[c >> 2]) - 1900, (0 | ra(0 | j)) > 0 && (j = 0 | ra(0 | j), f[18316] = j);
     }
    } else k = 3; else k = 3;
   } while (0);
   b: do {
    if (3 == (0 | k)) for ($a(); ;) {
     if ((7 + (0 | Pf(0 | f[10815])) | 0) >>> 0 >= e >>> 0) break b;
     if (0 | jf(0 | f[10815])) break b;
     hd();
    }
   } while (0);
   u = l;
  }
  function Zc(a) {
   a |= 0;
   var b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
   if (j = 0 | d[102818], tf(0 | f[10815], a, 0), !(0 | Qf(0 | f[10815])) && 77 == (0 | Qf(0 | f[10815])) && 82 == (0 | Qf(0 | f[10815]))) {
    for (h = 257 * (0 | Qf(0 | f[10815])) & 65535, d[102818] = h, h = a + 8 + (0 | $a()) | 0, e = 0, b = 0; (0 | (i = 0 | Pf(0 | f[10815]))) < (0 | h); ) {
     for (c = 0, a = 0; 4 != (0 | a); ) c = 0 | Qf(0 | f[10815]) | c << 8, a = a + 1 | 0;
     g = 0 | $a();
     a: do {
      if ((0 | c) < 5526615) {
       switch (0 | c) {
       case 5263940:
        break;

       default:
        a = e;
        break a;
       }
       tf(0 | f[10815], 8, 1), b = 65535 & (0 | Za()), a = 65535 & (0 | Za());
      } else {
       if ((0 | c) < 5718599) {
        switch (0 | c) {
        case 5526615:
         break;

        default:
         a = e;
         break a;
        }
        Yc(0 | Pf(0 | f[10815])), f[10960] = h, a = e;
        break;
       }
       switch (0 | c) {
       case 5718599:
        break;

       default:
        a = e;
        break a;
       }
       for ($a(), c = (c = 0 != (0 | Yd(43136, 30293))) ? 0 : 3, a = 0; ;) {
        if (4 == (0 | a)) {
         a = e;
         break a;
        }
        k = +(65535 & (0 | Za())), n[43844 + ((a ^ c ^ a >> 1) << 2) >> 2] = k, a = a + 1 | 0;
       }
      }
     } while (0);
     tf(0 | f[10815], i + 8 + g | 0, 0), e = a;
    }
    d[168360] = b, d[168359] = e, d[102818] = j;
   }
  }
  function yc(a) {
   a |= 0;
   var b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0;
   w = u, u = u + 16 | 0, p = (n = w) + 4 | 0, r = n + 8 | 0, s = n + 12 | 0, t = 0 | j[168360], v = 0 | j[168359], c = 2;
   a: for (;!((0 | c) >= ((0 | j[168355]) - 2 | 0)); ) if (o = c + 1 | 0, 1 << (c - t & 7) & a) {
    for (e = 0 | X(v, c + -1 | 0), g = 0 | X(v, o), q = 0 | X(v, c), b = 1; h = 0 | d[168356], !((0 | b) >= ((65535 & h) - 1 | 0)); ) m = 0 | f[10837], k = b + -1 | 0, f[n >> 2] = j[m + (e + k << 1) >> 1], l = b + 1 | 0, f[p >> 2] = j[m + (e + l << 1) >> 1], f[r >> 2] = j[m + (g + k << 1) >> 1], f[s >> 2] = j[m + (g + l << 1) >> 1], l = 65535 & (0 | xc(n)), d[m + (q + b << 1) >> 1] = l, b = b + 4 | 0;
    for (i = 1 << ((l = c + -2 | 0) - t & 7), k = 1 << ((m = c + 2 | 0) - t & 7), l = 0 | X(v, l), m = 0 | X(v, m), g = 2, b = h; ;) {
     if ((0 | g) >= ((65535 & b) - 2 | 0)) {
      c = o;
      continue a;
     }
     b = 0 | j[(e = 0 | f[10837]) + (g + 2 + q << 1) >> 1], c = 0 | j[e + (g + -2 + q << 1) >> 1], (i | k) & a ? b = (c + b | 0) >>> 1 : (f[n >> 2] = c, f[p >> 2] = b, f[r >> 2] = j[e + (l + g << 1) >> 1], f[s >> 2] = j[e + (m + g << 1) >> 1], b = 0 | xc(n)), d[e + (q + g << 1) >> 1] = b, g = g + 4 | 0, b = 0 | d[168356];
    }
   } else c = o;
   u = w;
  }
  function rd(a, b, c, e) {
   a |= 0, b |= 0, c |= 0, e |= 0;
   var g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, q = 0, r = 0, s = 0, t = 0;
   for (r = u, u = u + 8272 | 0, o = r + 16 | 0, f[(q = r) >> 2] = 0, f[q + 4 >> 2] = 0, f[q + 8 >> 2] = 0, f[q + 12 >> 2] = 0, n = 64 - a | 0, l = 0, h = 0, g = 0; 2 != (0 | l); ) {
    for (tf(0 | f[10815], 0 | l ? e : c, 0), m = 0, i = 0; !((0 | m) >= (0 | j[168356])); ) {
     for (k = i - a | 0; !((0 | k) >= 0); ) {
      for (h = 0 | dg(0 | h, 0 | g, 0 | b), g = 0, i = I; !((0 | g) >= (0 | b)); ) s = (0 | Qf(0 | f[10815])) << g | h, g = g + 8 | 0, h = s;
      k = k + b | 0, g = i;
     }
     i = 0 | fg(0 | (i = 0 | dg(0 | h, 0 | g, n - k | 0)), 0 | I, 0 | n), d[o + (4128 * l | 0) + (m << 1) >> 1] = i, m = m + 1 | 0, i = k;
    }
    l = l + 1 | 0;
   }
   for (h = (0 | j[168356]) - 1 | 0, g = 0; !((0 | g) >= (0 | h)); ) s = g + 1 | 0, e = (b = (0 | j[o + (g << 1) >> 1]) - (0 | j[o + 4128 + (s << 1) >> 1]) | 0) >> 31, p[(c = q + ((n = 1 & g) << 3) | 0) >> 3] = +p[c >> 3] + +((e ^ b) - e | 0), e = (c = (0 | j[o + 4128 + (g << 1) >> 1]) - (0 | j[o + (s << 1) >> 1]) | 0) >> 31, p[(n = q + ((1 ^ n) << 3) | 0) >> 3] = +p[n >> 3] + +((e ^ c) - e | 0), g = s;
   return t = 100 * +V(+ +p[q >> 3] / +p[q + 8 >> 3]), u = r, +t;
  }
  function Lc() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0;
   a: do {
    if (0 | d[168357]) if (b = 0 | d[172469], d[168355] = b, h = 0 | d[168358], d[168356] = h, 9 == (0 | (a = 0 | f[10812]))) {
     k = 0 | f[10822], g = 65535 & h, a = 0, e = 0;
     b: for (;;) {
      if ((0 | e) >= 3) {
       i = e, e = a, a = h;
       break;
      }
      for (c = 0 | X(e, g), a = 1; !((0 | a) >= 4); ) {
       if (i = a + c | 0, !((d[k + (i << 3) + 4 >> 1] | d[k + (i << 3) >> 1]) << 16 >> 16)) {
        i = e, e = a, a = h;
        break b;
       }
       a = a + 1 | 0;
      }
      e = e + 1 | 0;
     }
     for (;;) {
      if ((0 | i) >= (65535 & b | 0)) break a;
      for (g = 1 + ((e + -1 | 0) % 3 | 0) | 0, c = a; a = 65535 & c, !((0 | g) >= (a + -1 | 0)); ) {
       for (c = (b = k + ((0 | X(a, i)) << 3) + (g << 3) | 0) - 8 | 0, e = b + 8 | 0, a = 0; !((0 | a) >= 3); ) d[b + (a << 1) >> 1] = ((0 | j[e + (a << 1) >> 1]) + (0 | j[c + (a << 1) >> 1]) | 0) >>> 1, a = a + 2 | 0;
       g = g + 3 | 0, c = 0 | d[168356];
      }
      i = i + 3 | 0, e = g, b = 0 | d[168355], a = c;
     }
    } else l = 19; else a = 0 | f[10812], l = 19;
   } while (0);
   19 == (0 | l) && a >>> 0 > 1e3 & 3 == (0 | f[10824]) && (f[10980] = 1 ^ f[10806], f[10824] = 4), f[10812] = 0;
  }
  function gg(a, c, d) {
   a |= 0, c |= 0;
   var e = 0, g = 0, h = 0;
   if ((0 | (d |= 0)) >= 8192) return 0 | qa(0 | a, 0 | c, 0 | d);
   if (h = 0 | a, g = a + d | 0, (3 & a) == (3 & c)) {
    for (;3 & a; ) {
     if (!d) return 0 | h;
     b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0, d = d - 1 | 0;
    }
    for (e = (d = -4 & g | 0) - 64 | 0; (0 | a) <= (0 | e); ) f[a >> 2] = f[c >> 2], f[a + 4 >> 2] = f[c + 4 >> 2], f[a + 8 >> 2] = f[c + 8 >> 2], f[a + 12 >> 2] = f[c + 12 >> 2], f[a + 16 >> 2] = f[c + 16 >> 2], f[a + 20 >> 2] = f[c + 20 >> 2], f[a + 24 >> 2] = f[c + 24 >> 2], f[a + 28 >> 2] = f[c + 28 >> 2], f[a + 32 >> 2] = f[c + 32 >> 2], f[a + 36 >> 2] = f[c + 36 >> 2], f[a + 40 >> 2] = f[c + 40 >> 2], f[a + 44 >> 2] = f[c + 44 >> 2], f[a + 48 >> 2] = f[c + 48 >> 2], f[a + 52 >> 2] = f[c + 52 >> 2], f[a + 56 >> 2] = f[c + 56 >> 2], f[a + 60 >> 2] = f[c + 60 >> 2], a = a + 64 | 0, c = c + 64 | 0;
    for (;(0 | a) < (0 | d); ) f[a >> 2] = f[c >> 2], a = a + 4 | 0, c = c + 4 | 0;
   } else for (d = g - 4 | 0; (0 | a) < (0 | d); ) b[a >> 0] = 0 | b[c >> 0], b[a + 1 >> 0] = 0 | b[c + 1 >> 0], b[a + 2 >> 0] = 0 | b[c + 2 >> 0], b[a + 3 >> 0] = 0 | b[c + 3 >> 0], a = a + 4 | 0, c = c + 4 | 0;
   for (;(0 | a) < (0 | g); ) b[a >> 0] = 0 | b[c >> 0], a = a + 1 | 0, c = c + 1 | 0;
   return 0 | h;
  }
  function af(a, c) {
   a |= 0;
   var d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0;
   if (n = u, u = u + 64 | 0, m = n + 40 | 0, k = n + 24 | 0, j = n + 16 | 0, g = n, l = n + 56 | 0, e = 0 | b[(c |= 0) >> 0], 0 | le(43035, e << 24 >> 24, 4)) if (d = 0 | Ad(1156)) {
    i = (h = d) + 124 | 0;
    do {
     f[h >> 2] = 0, h = h + 4 | 0;
    } while ((0 | h) < (0 | i));
    0 | Oe(c, 43) || (f[d >> 2] = e << 24 >> 24 == 114 ? 8 : 4), 0 | Oe(c, 101) && (f[g >> 2] = a, f[g + 4 >> 2] = 2, f[g + 8 >> 2] = 1, ha(221, 0 | g), e = 0 | b[c >> 0]), e << 24 >> 24 == 97 ? (f[j >> 2] = a, f[j + 4 >> 2] = 3, 1024 & (e = 0 | ha(221, 0 | j)) || (f[k >> 2] = a, f[k + 4 >> 2] = 4, f[k + 8 >> 2] = 1024 | e, ha(221, 0 | k)), c = 128 | f[d >> 2], f[d >> 2] = c) : c = 0 | f[d >> 2], f[d + 60 >> 2] = a, f[d + 44 >> 2] = d + 132, f[d + 48 >> 2] = 1024, b[(e = d + 75 | 0) >> 0] = -1, 8 & c || (f[m >> 2] = a, f[m + 4 >> 2] = 21523, f[m + 8 >> 2] = l, 0 | ua(54, 0 | m) || (b[e >> 0] = 10)), f[d + 32 >> 2] = 5, f[d + 36 >> 2] = 1, f[d + 40 >> 2] = 2, f[d + 12 >> 2] = 1, 0 | f[51389] || (f[d + 76 >> 2] = -1), bf(d);
   } else d = 0; else f[5745] = 22, d = 0;
   return u = n, 0 | d;
  }
  function Id(a, b, c) {
   b |= 0, c |= 0;
   var d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   m = u, u = u + 48 | 0, k = m + 16 | 0, g = m, e = m + 32 | 0, d = 0 | f[(i = 28 + (a |= 0) | 0) >> 2], f[e >> 2] = d, d = (0 | f[(j = a + 20 | 0) >> 2]) - d | 0, f[e + 4 >> 2] = d, f[e + 8 >> 2] = b, f[e + 12 >> 2] = c, d = d + c | 0, h = a + 60 | 0, f[g >> 2] = f[h >> 2], f[g + 4 >> 2] = e, f[g + 8 >> 2] = 2, g = 0 | Kd(0 | Ha(146, 0 | g));
   a: do {
    if ((0 | d) == (0 | g)) l = 3; else {
     for (b = 2; !((0 | g) < 0); ) if (d = d - g | 0, o = 0 | f[e + 4 >> 2], n = g >>> 0 > o >>> 0, e = n ? e + 8 | 0 : e, b = (n << 31 >> 31) + b | 0, o = g - (n ? o : 0) | 0, f[e >> 2] = (0 | f[e >> 2]) + o, n = e + 4 | 0, f[n >> 2] = (0 | f[n >> 2]) - o, f[k >> 2] = f[h >> 2], f[k + 4 >> 2] = e, f[k + 8 >> 2] = b, g = 0 | Kd(0 | Ha(146, 0 | k)), (0 | d) == (0 | g)) {
      l = 3;
      break a;
     }
     f[a + 16 >> 2] = 0, f[i >> 2] = 0, f[j >> 2] = 0, f[a >> 2] = 32 | f[a >> 2], c = 2 == (0 | b) ? 0 : c - (0 | f[e + 4 >> 2]) | 0;
    }
   } while (0);
   return 3 == (0 | l) && (o = 0 | f[a + 44 >> 2], f[a + 16 >> 2] = o + (0 | f[a + 48 >> 2]), f[i >> 2] = o, f[j >> 2] = o), u = m, 0 | c;
  }
  function Kc(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0;
   for (l = u, u = u + 192 | 0, i = l + 96 | 0, j = l, k = 0 | f[10824], g = 0; ;) {
    if ((0 | g) == (0 | k)) {
     d = 0;
     break;
    }
    for (d = 0; 3 != (0 | d); ) {
     for (p[(h = i + (24 * g | 0) + (d << 3) | 0) >> 3] = 0, c = 0, e = 0; 3 != (0 | c); ) m = e + +p[b + (24 * g | 0) + (c << 3) >> 3] * +p[8 + (24 * c | 0) + (d << 3) >> 3], p[h >> 3] = m, c = c + 1 | 0, e = m;
     d = d + 1 | 0;
    }
    g = g + 1 | 0;
   }
   for (;(0 | d) != (0 | k); ) {
    for (e = 0, c = 0; ;) {
     if (3 == (0 | c)) {
      c = 0;
      break;
     }
     e += +p[i + (24 * d | 0) + (c << 3) >> 3], c = c + 1 | 0;
    }
    for (;3 != (0 | c); ) p[(h = i + (24 * d | 0) + (c << 3) | 0) >> 3] = +p[h >> 3] / e, c = c + 1 | 0;
    n[43264 + (d << 2) >> 2] = 1 / e, d = d + 1 | 0;
   }
   for (Jc(i, j, k), c = 0; 3 != (0 | c); ) {
    for (d = 0; (0 | d) != (0 | k); ) n[a + (c << 4) + (d << 2) >> 2] = +p[j + (24 * d | 0) + (c << 3) >> 3], d = d + 1 | 0;
    c = c + 1 | 0;
   }
   u = l;
  }
  function Hc() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0;
   for (i = 0 | f[10822], k = 0 | f[10812], u = 0 | j[168357], z = 0 | j[168358], h = 0; !(h >>> 0 >= (0 | j[168355]) >>> 0); ) {
    for (l = h << 1 & 14, m = h + -2 | 0, n = h + 2 | 0, o = 0 | X(h >>> u, z), g = 0; p = 0 | j[168356], !(g >>> 0 >= p >>> 0); ) {
     if (q = k >>> ((1 & g | l) << 1) & 3, r = i + (o + (g >>> u) << 3) + (q << 1) | 0, !(0 | d[r >> 1])) {
      for (s = g + -2 | 0, t = g + 2 | 0, v = 0 | j[168355], e = m, a = 0, b = 0; !(e >>> 0 > n >>> 0); ) {
       for (w = e >>> 0 < v >>> 0, x = e << 1 & 14, y = 0 | X(e >>> u, z), c = s; !(c >>> 0 > t >>> 0); ) w & c >>> 0 < p >>> 0 && (k >>> ((1 & c | x) << 1) & 3 | 0) == (0 | q) && (a = ((A = 0 | d[i + ((c >>> u) + y << 3) + (q << 1) >> 1]) << 16 >> 16 != 0 & 1) + a | 0, b = (65535 & A) + b | 0), c = c + 1 | 0;
       e = e + 1 | 0;
      }
      0 | a && (d[r >> 1] = (b >>> 0) / (a >>> 0) | 0);
     }
     g = g + 1 | 0;
    }
    h = h + 1 | 0;
   }
  }
  function we(a, c, d) {
   c |= 0, d |= 0;
   var e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   o = 1794895138 + (0 | f[(a |= 0) >> 2]) | 0, h = 0 | xe(0 | f[a + 8 >> 2], o), e = 0 | xe(0 | f[a + 12 >> 2], o), g = 0 | xe(0 | f[a + 16 >> 2], o);
   a: do {
    if (h >>> 0 < c >>> 2 >>> 0) if (n = c - (h << 2) | 0, e >>> 0 < n >>> 0 & g >>> 0 < n >>> 0) if (3 & (g | e)) e = 0; else {
     for (n = e >>> 2, m = g >>> 2, l = 0; ;) {
      if (j = h >>> 1, k = l + j | 0, i = k << 1, g = i + n | 0, e = 0 | xe(0 | f[a + (g << 2) >> 2], o), !((g = 0 | xe(0 | f[a + (g + 1 << 2) >> 2], o)) >>> 0 < c >>> 0 & e >>> 0 < (c - g | 0) >>> 0)) {
       e = 0;
       break a;
      }
      if (0 | b[a + (g + e) >> 0]) {
       e = 0;
       break a;
      }
      if (!(e = 0 | Yd(d, a + g | 0))) break;
      if (e = (0 | e) < 0, 1 == (0 | h)) {
       e = 0;
       break a;
      }
      l = e ? l : k, h = e ? j : h - j | 0;
     }
     g = 0 | xe(0 | f[a + ((e = i + m | 0) << 2) >> 2], o), e = (e = 0 | xe(0 | f[a + (e + 1 << 2) >> 2], o)) >>> 0 < c >>> 0 & g >>> 0 < (c - e | 0) >>> 0 && 0 == (0 | b[a + (e + g) >> 0]) ? a + e | 0 : 0;
    } else e = 0; else e = 0;
   } while (0);
   return 0 | e;
  }
  function lb(a, b) {
   a |= 0, b |= 0;
   var c = 0, e = 0, g = 0, h = 0, i = 0, j = 0;
   do {
    if ((0 | a) > 25) c = 0; else {
     if ((0 | a) < 0) {
      f[10842] = 0, f[10841] = 0, f[10840] = 0, c = 0;
      break;
     }
     if (c = 0 | f[10841], 0 == (0 | a) | (0 | c) < 0) c = 0; else {
      for (e = 0 | f[10842]; ;) {
       if (!((0 | c) < (0 | a) & 0 == (0 | e))) {
        i = 11;
        break;
       }
       if (-1 == (0 | (h = 0 | Qf(0 | f[10815])))) {
        i = 8;
        break;
       }
       if (255 == (0 | h) & 0 != (0 | f[10843])) {
        if (j = 0 != (0 | Qf(0 | f[10815])), e = 1 & j, f[10842] = e, c = 0 | f[10840], g = 0 | f[10841], j) {
         e = g;
         break;
        }
       } else f[10842] = 0, c = 0 | f[10840], g = 0 | f[10841], e = 0;
       f[10840] = c << 8 | 255 & h, c = g + 8 | 0, f[10841] = c;
      }
      8 == (0 | i) && (c = 0 | f[10841], i = 11), 11 == (0 | i) && (e = c, c = 0 | f[10840]), c = c << 32 - e >>> (32 - a | 0), b ? (e = e - ((65535 & (c = 0 | d[b + (c << 1) >> 1])) >>> 8) | 0, f[10841] = e, c &= 255) : (e = e - a | 0, f[10841] = e), (0 | e) < 0 && Xa();
     }
    }
   } while (0);
   return 0 | c;
  }
  function hf(a, c, d) {
   a |= 0, d |= 0;
   var e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0;
   e = 0 != (0 | (g = (c |= 0) - 1 | 0));
   a: do {
    if ((0 | c) < 2) k = 0 | b[(d = d + 74 | 0) >> 0], b[d >> 0] = k + 255 | k, e || (b[a >> 0] = 0); else {
     b: do {
      if (e) {
       for (j = d + 4 | 0, k = d + 8 | 0, c = a; ;) {
        if (e = 0 | f[j >> 2], m = e, n = (0 | f[k >> 2]) - m | 0, l = 0 | le(e, 10, n), i = 0 == (0 | l), l = i ? n : 1 - m + l | 0, l = l >>> 0 < g >>> 0 ? l : g, gg(0 | c, 0 | e, 0 | l), e = (0 | f[j >> 2]) + l | 0, f[j >> 2] = e, c = c + l | 0, g = g - l | 0, !(i & 0 != (0 | g))) break b;
        if (e >>> 0 < (0 | f[k >> 2]) >>> 0) f[j >> 2] = e + 1, e = 0 | h[e >> 0]; else if ((0 | (e = 0 | Vd(d))) < 0) break;
        if (g = g + -1 | 0, i = c + 1 | 0, b[c >> 0] = e, !(0 != (0 | g) & 10 != (255 & e | 0))) {
         c = i;
         break b;
        }
        c = i;
       }
       if ((0 | c) == (0 | a)) break a;
       if (!(16 & f[d >> 2])) break a;
      } else c = a;
     } while (0);
     0 | a && (b[c >> 0] = 0);
    }
   } while (0);
  }
  function oc(a, b, c, d) {
   a |= 0, b |= 0, d |= 0;
   var e = 0, g = 0, h = 0, i = 0, j = 0;
   if (c |= 0) {
    for (c = 0; 4 != (0 | c); ) g = 1 + (0 | X(d, 48828125)) | 0, f[43932 + (c << 2) >> 2] = g, d = g, c = c + 1 | 0;
    for (f[11111] = 4, c = 0 | f[10983], g = ((e = 0 | f[10985]) ^ c) >>> 31 | f[10986] << 1, f[10986] = g, d = 4; 127 != (0 | d); ) i = ((j = 0 | f[43932 + (d + -3 << 2) >> 2]) ^ g) >>> 31 | (c ^ e) << 1, f[43932 + (d << 2) >> 2] = i, h = g, d = d + 1 | 0, c = j, g = i, e = h;
    for (f[11111] = 127, d = 0; 127 != (0 | d); ) i = 0 | Ef(0 | f[(j = 43932 + (d << 2) | 0) >> 2]), f[j >> 2] = i, d = d + 1 | 0;
    f[11111] = 127, d = b;
   } else d = b;
   for (;d && (c = 0 | f[11111], e = c + 1 | 0, f[11111] = e, c); ) j = f[43932 + ((c + 65 & 127) << 2) >> 2] ^ f[43932 + ((127 & e) << 2) >> 2], f[43932 + ((127 & c) << 2) >> 2] = j, f[a >> 2] = f[a >> 2] ^ j, a = a + 4 | 0, d = d + -1 | 0;
  }
  function ce(a, c, d) {
   a |= 0, c |= 0, d |= 0;
   var e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
   q = u, u = u + 224 | 0, m = q + 120 | 0, o = q, p = q + 136 | 0, g = 40 + (e = n = q + 80 | 0) | 0;
   do {
    f[e >> 2] = 0, e = e + 4 | 0;
   } while ((0 | e) < (0 | g));
   return f[m >> 2] = f[d >> 2], (0 | de(0, c, m, o, n)) < 0 ? d = -1 : (l = 32 & (d = 0 | f[a >> 2]), (0 | b[a + 74 >> 0]) < 1 && (f[a >> 2] = -33 & d), 0 | f[(e = a + 48 | 0) >> 2] ? d = 0 | de(a, c, m, o, n) : (h = 0 | f[(g = a + 44 | 0) >> 2], f[g >> 2] = p, f[(i = a + 28 | 0) >> 2] = p, f[(j = a + 20 | 0) >> 2] = p, f[e >> 2] = 80, f[(k = a + 16 | 0) >> 2] = p + 80, d = 0 | de(a, c, m, o, n), h && (La[7 & f[a + 36 >> 2]](a, 0, 0), d = 0 == (0 | f[j >> 2]) ? -1 : d, f[g >> 2] = h, f[e >> 2] = 0, f[k >> 2] = 0, f[i >> 2] = 0, f[j >> 2] = 0)), p = 0 | f[a >> 2], f[a >> 2] = p | l, d = 0 == (32 & p | 0) ? d : -1), u = q, 0 | d;
  }
  function Tc(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
   for (j = u, u = u + 16 | 0, d = j + 12 | 0, e = j + 8 | 0, g = j + 4 | 0, h = j, b = 65535 & (0 | Za()); i = b + -1 | 0, b; ) {
    Pc(a, d, e, g, h), b = ((c = 0 | f[d >> 2]) >>> 0) / 3 | 0;
    a: do {
     switch (0 | c) {
     case 5:
     case 3:
     case 1:
      b = 0 | If(0 | f[10815]), f[73828 + (29 + (c >>> 1) << 2) >> 2] = b;
      break;

     case 7:
     case 4:
     case 2:
      for (c = 6 * b | 0, b = 0; ;) {
       if (6 == (0 | b)) break a;
       k = 0 | $a(), f[73828 + (b + c << 2) >> 2] = k, b = b + 1 | 0;
      }

     case 6:
      for (b = 0; ;) {
       if (2 == (0 | b)) break a;
       k = 0 | $a(), f[73828 + (b + 18 << 2) >> 2] = k, b = b + 1 | 0;
      }

     case 29:
     case 18:
      hf(73884 + (b << 2) | 0, (k = 0 | f[g >> 2]) >>> 0 < 12 ? k : 12, 0 | f[10815]);
     }
    } while (0);
    tf(0 | f[10815], 0 | f[h >> 2], 0), b = i;
   }
   u = j;
  }
  function Hf(a, c, d) {
   a |= 0, d |= 0;
   var e = 0, g = 0, h = 0;
   g = c |= 0;
   a: do {
    if (3 & (g ^ a)) h = 11; else {
     if ((e = 0 != (0 | d)) & 0 != (3 & g | 0)) do {
      if (g = 0 | b[c >> 0], b[a >> 0] = g, !(g << 24 >> 24)) break a;
      c = c + 1 | 0, a = a + 1 | 0, e = 0 != (0 | (d = d + -1 | 0));
     } while (e & 0 != (3 & c | 0));
     if (e) {
      if (0 | b[c >> 0]) {
       b: do {
        if (d >>> 0 > 3) for (e = c; ;) {
         if ((-2139062144 & (c = 0 | f[e >> 2]) ^ -2139062144) & c + -16843009 | 0) {
          c = e;
          break b;
         }
         if (f[a >> 2] = c, d = d + -4 | 0, c = e + 4 | 0, a = a + 4 | 0, !(d >>> 0 > 3)) break;
         e = c;
        }
       } while (0);
       h = 11;
      }
     } else d = 0;
    }
   } while (0);
   c: do {
    if (11 == (0 | h)) if (d) for (;;) {
     if (h = 0 | b[c >> 0], b[a >> 0] = h, !(h << 24 >> 24)) break c;
     if (d = d + -1 | 0, a = a + 1 | 0, !d) {
      d = 0;
      break;
     }
     c = c + 1 | 0;
    } else d = 0;
   } while (0);
   cg(0 | a, 0, 0 | d);
  }
  function le(a, c, d) {
   a |= 0;
   var e = 0, g = 0, h = 0, i = 0;
   h = 255 & (c |= 0), e = 0 != (0 | (d |= 0));
   a: do {
    if (e & 0 != (3 & a | 0)) for (g = 255 & c; ;) {
     if ((0 | b[a >> 0]) == g << 24 >> 24) break a;
     if (a = a + 1 | 0, d = d + -1 | 0, !((e = 0 != (0 | d)) & 0 != (3 & a | 0))) {
      i = 5;
      break;
     }
    } else i = 5;
   } while (0);
   b: do {
    if (5 == (0 | i)) if (e) {
     if (g = 255 & c, (0 | b[a >> 0]) != g << 24 >> 24) {
      e = 0 | X(h, 16843009);
      c: do {
       if (d >>> 0 > 3) {
        for (;!((-2139062144 & (h = f[a >> 2] ^ e) ^ -2139062144) & h + -16843009 | 0); ) if (a = a + 4 | 0, (d = d + -4 | 0) >>> 0 <= 3) {
         i = 11;
         break c;
        }
       } else i = 11;
      } while (0);
      if (11 == (0 | i) && !d) {
       d = 0;
       break;
      }
      for (;;) {
       if ((0 | b[a >> 0]) == g << 24 >> 24) break b;
       if (a = a + 1 | 0, !(d = d + -1 | 0)) {
        d = 0;
        break;
       }
      }
     }
    } else d = 0;
   } while (0);
   return 0 | (0 | d ? a : 0);
  }
  function fb(a, b) {
   b |= 0;
   var c = 0, d = 0, e = 0, g = 0;
   c = 0 | f[(d = 4 + (a |= 0) | 0) >> 2];
   do {
    if (0 != +n[10820]) {
     if ((0 | c) < -104) c = -104; else {
      if (!((0 | c) > 12)) {
       d = 0, g = 10;
       break;
      }
      c = 12;
     }
     f[d >> 2] = c, d = 1, g = 10;
    } else (c + 264 | 0) >>> 0 > 725 ? c = 2 : ((0 | c) < -50 ? (c = -50, g = 8) : (0 | c) > 307 ? (c = 307, g = 8) : d = 0, 8 == (0 | g) && (f[d >> 2] = c, d = 1), (0 | c) < 197 ? g = 10 : (e = (48 * c >> 10) - 123 | 0, g = 12));
   } while (0);
   10 == (0 | g) && (e = -38 - (398 * c >> 10) | 0, g = 12);
   do {
    if (12 == (0 | g)) {
     if (c = 0 | f[a >> 2], (e - b | 0) <= (0 | c) && !(0 != (0 | d) | (e + 20 | 0) < (0 | c))) {
      c = 0;
      break;
     }
     c = (0 | (g = e - c | 0)) > -20 ? g : -20, (0 | ((0 | g) > -1 ? g : 0 - g | 0)) < (b << 2 | 0) ? (f[a >> 2] = e - ((0 | c) > (0 | b) ? b : c), c = 1) : c = 2;
    }
   } while (0);
   return 0 | c;
  }
  function ld() {
   var a = 0, b = 0, c = 0, e = 0, g = 0;
   c = u, u = u + 16 | 0, a = c, d[102818] = 19789, f[10956] = 0, tf(0 | f[10815], 52, 0), g = 65535 & (0 | $a()), d[168356] = g, g = 65535 & (0 | $a()), d[168355] = g, tf(0 | f[10815], 0, 2), tf(g = 0 | f[10815], 0 - (e = 511 & (0 | Lf(g))) | 0, 1), (0 | $a()) == (0 | e) && 1380273986 == (0 | $a()) ? (g = 0 | $a(), tf(0 | f[10815], 12, 1), e = 0 | $a(), f[10956] = e, vf(0 | f[10815], g + 8 + (f[10804] << 2) | 0, 0), g = 0 | $a(), f[10960] = g) : b = 3;
   a: do {
    if (3 == (0 | b)) for (f[a >> 2] = f[10813], uf(22792, 30674, a), tf(0 | f[10815], 0, 0); ;) {
     if (-1 == (0 | (a = 0 | $a()))) break a;
     1380271190 == (0 | $a()) && (g = 0 | f[10956], f[10956] = g + 1, (0 | g) == (0 | f[10804]) && (g = (0 | Lf(0 | f[10815])) - 8 | 0, f[10960] = g)), tf(0 | f[10815], a + -8 | 0, 1);
    }
   } while (0);
   u = c;
  }
  function Bc(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0;
   j = u, u = u + 16 | 0, h = j;
   a: for (;;) {
    if (d = 0 != (0 | b)) e = 0 | f[18280]; else {
     for (c = 0; (0 | c) != (0 | a); ) g = 0 | $a(), f[44448 + (c << 2) >> 2] = g, c = c + 1 | 0;
     cg(48544, 0, 24576), f[18280] = 48544, e = 48544;
    }
    if (c = e + 12 | 0, f[18280] = c, g = c, c >>> 0 > 73120) {
     i = 8;
     break;
    }
    if (d) {
     for (c = 0; !(c >>> 0 >= a >>> 0); ) {
      if ((0 | f[44448 + (c << 2) >> 2]) == (0 | b)) {
       i = 12;
       break a;
      }
      c = c + 1 | 0;
     }
     if (b >>> 0 > 3623878655) break;
    }
    d = b + 134217728 & -134217728 | b << 1 & 134217726, f[e >> 2] = g, Bc(a, d), f[e + 4 >> 2] = f[18280], b = 1 | d;
   }
   8 == (0 | i) ? (f[h >> 2] = f[10813], uf(22792, 29428, h), sa()) : 12 == (0 | i) && (f[e + 8 >> 2] = c), u = j;
  }
  function Qe(a, c, d) {
   a |= 0, c |= 0;
   var e = 0, g = 0, h = 0, i = 0, j = 0;
   j = u, u = u + 16 | 0, e = j, g = 0 | f[(h = 0 == (0 | (d |= 0)) ? 205616 : d) >> 2];
   do {
    if (c) {
     if (a = 0 == (0 | a) ? e : a, d = 0 | b[c >> 0], g) {
      if (d &= 255, ((c = d >>> 3) - 16 | c + (g >> 26)) >>> 0 > 7) {
       i = 14;
       break;
      }
      if ((0 | (d = g << 6 | d + -128)) >= 0) {
       f[h >> 2] = 0, f[a >> 2] = d, d = 1;
       break;
      }
     } else {
      if (d << 24 >> 24 > -1) {
       f[a >> 2] = 255 & d, d = d << 24 >> 24 != 0 & 1;
       break;
      }
      if (!(0 | f[f[5776] >> 2])) {
       f[a >> 2] = d << 24 >> 24 & 57343, d = 1;
       break;
      }
      if ((d = (255 & d) - 194 | 0) >>> 0 > 50) {
       i = 14;
       break;
      }
      d = 0 | f[22588 + (d << 2) >> 2];
     }
     f[h >> 2] = d, d = -2;
    } else g ? i = 14 : d = 0;
   } while (0);
   return 14 == (0 | i) && (f[h >> 2] = 0, f[5745] = 84, d = -1), u = j, 0 | d;
  }
  function vd(a, c, e, g, h, i) {
   a |= 0, e |= 0, g |= 0, h |= 0, i |= 0;
   var j = 0, k = 0, l = 0;
   l = 2 + (c |= 0) | 0, k = 0 | d[c >> 1], d[c >> 1] = k + 1 << 16 >> 16, f[(j = l + (12 * (k &= 65535) | 0) + 8 | 0) >> 2] = i;
   a: do {
    if (g << 16 >> 16 == 1 & (0 | h) < 5) for (c = 0; ;) {
     if (4 == (0 | c)) break a;
     b[j + c >> 0] = i >> (c << 3), c = c + 1 | 0;
    } else {
     if (g << 16 >> 16 == 2) {
      if (!((0 | (h = 1 + (0 | Be(a + i | 0, h + -1 | 0)) | 0)) < 5)) break;
      for (c = 0; ;) {
       if (4 == (0 | c)) break a;
       b[j + c >> 0] = 0 | b[a + (c + i) >> 0], c = c + 1 | 0;
      }
     }
     if (g << 16 >> 16 == 3 & (0 | h) < 3) for (c = 0; ;) {
      if (2 == (0 | c)) break a;
      d[j + (c << 1) >> 1] = i >> (c << 4), c = c + 1 | 0;
     }
    }
   } while (0);
   f[l + (12 * k | 0) + 4 >> 2] = h, d[l + (12 * k | 0) + 2 >> 1] = g, d[l + (12 * k | 0) >> 1] = e;
  }
  function cb(a) {
   var c = 0, e = 0, g = 0, h = 0, i = 0;
   switch (h = u, u = u + 16 | 0, g = h, 0 | (a |= 0)) {
   case 3:
    c = +(65535 & (0 | Za()));
    break;

   case 4:
    c = +((0 | $a()) >>> 0);
    break;

   case 5:
    c = +((0 | $a()) >>> 0), p[g >> 3] = c, c /= +((0 | $a()) >>> 0);
    break;

   case 8:
    c = +((0 | Za()) << 16 >> 16);
    break;

   case 9:
    c = +(0 | $a());
    break;

   case 10:
    c = +(0 | $a()), p[g >> 3] = c, c /= +(0 | $a());
    break;

   case 11:
    c = +bb(0 | $a());
    break;

   case 12:
    for (e = (e = 18761 == (0 | d[102818]) ^ (0 | Jf(4660)) << 16 >> 16 == 4660) ? 0 : 7, a = 0; 8 != (0 | a); ) i = 255 & (0 | Qf(0 | f[10815])), b[g + (a ^ e) >> 0] = i, a = a + 1 | 0;
    c = +p[g >> 3];
    break;

   default:
    c = +(0 | Qf(0 | f[10815]));
   }
   return u = h, +c;
  }
  function ye(a, c, d) {
   a |= 0, c |= 0;
   var e = 0, g = 0, h = 0, i = 0, j = 0;
   (g = 0 | f[(e = 16 + (d |= 0) | 0) >> 2]) ? h = 5 : 0 | ze(d) ? e = 0 : (g = 0 | f[e >> 2], h = 5);
   a: do {
    if (5 == (0 | h)) {
     if (j = d + 20 | 0, i = 0 | f[j >> 2], e = i, (g - i | 0) >>> 0 < c >>> 0) {
      e = 0 | La[7 & f[d + 36 >> 2]](d, a, c);
      break;
     }
     b: do {
      if ((0 | b[d + 75 >> 0]) > -1) {
       for (i = c; ;) {
        if (!i) {
         h = 0, g = a;
         break b;
        }
        if (g = i + -1 | 0, 10 == (0 | b[a + g >> 0])) break;
        i = g;
       }
       if ((e = 0 | La[7 & f[d + 36 >> 2]](d, a, i)) >>> 0 < i >>> 0) break a;
       h = i, g = a + i | 0, c = c - i | 0, e = 0 | f[j >> 2];
      } else h = 0, g = a;
     } while (0);
     gg(0 | e, 0 | g, 0 | c), f[j >> 2] = (0 | f[j >> 2]) + c, e = h + c | 0;
    }
   } while (0);
   return 0 | e;
  }
  function xb(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var e = 0, g = 0, h = 0, i = 0, k = 0;
   (i = 2 == (0 | (h = 0 | f[10848])) & 0 != (0 | f[10804])) && (f[c >> 2] = 2 + (0 | f[c >> 2])), g = 0 | f[10837];
   a: do {
    if (g) (0 | j[168360]) >>> 0 > a >>> 0 && (e = 0 | j[168359]) >>> 0 > b >>> 0 && (k = g + ((0 | X(e, a)) + b << 1) | 0, d[k >> 1] = 0 | d[205638 + ((0 | j[f[c >> 2] >> 1]) << 1) >> 1]); else if ((0 | j[168355]) >>> 0 > a >>> 0 && (0 | j[168356]) >>> 0 > b >>> 0) for (g = 0 | f[10822], e = 0; ;) {
     if ((0 | e) == (0 | h)) break a;
     k = g + ((0 | X(0 | j[168356], a)) + b << 3) + (e << 1) | 0, d[k >> 1] = 0 | d[205638 + ((0 | j[(0 | f[c >> 2]) + (e << 1) >> 1]) << 1) >> 1], e = e + 1 | 0;
    }
   } while (0);
   k = (0 | f[c >> 2]) + (h << 1) | 0, f[c >> 2] = i ? k + -2 | 0 : k;
  }
  function se(a, c) {
   a |= 0, c |= 0;
   do {
    if (a) {
     if (c >>> 0 < 128) {
      b[a >> 0] = c, a = 1;
      break;
     }
     if (!(0 | f[f[5776] >> 2])) {
      if (57216 == (-128 & c | 0)) {
       b[a >> 0] = c, a = 1;
       break;
      }
      f[5745] = 84, a = -1;
      break;
     }
     if (c >>> 0 < 2048) {
      b[a >> 0] = c >>> 6 | 192, b[a + 1 >> 0] = 63 & c | 128, a = 2;
      break;
     }
     if (c >>> 0 < 55296 | 57344 == (-8192 & c | 0)) {
      b[a >> 0] = c >>> 12 | 224, b[a + 1 >> 0] = c >>> 6 & 63 | 128, b[a + 2 >> 0] = 63 & c | 128, a = 3;
      break;
     }
     if ((c + -65536 | 0) >>> 0 < 1048576) {
      b[a >> 0] = c >>> 18 | 240, b[a + 1 >> 0] = c >>> 12 & 63 | 128, b[a + 2 >> 0] = c >>> 6 & 63 | 128, b[a + 3 >> 0] = 63 & c | 128, a = 4;
      break;
     }
     f[5745] = 84, a = -1;
     break;
    }
    a = 1;
   } while (0);
   return 0 | a;
  }
  function dd() {
   var a = 0, c = 0, e = 0, g = 0;
   for (g = u, u = u + 16 | 0, c = g, d[102818] = 18761, tf(0 | f[10815], 4, 0), a = 0 | $a(), tf(e = 0 | f[10815], 0 | $a(), 0); e = a + -1 | 0, a; ) a = 0 | $a(), $a(), Of(c, 8, 1, 0 | f[10815]), 0 | Yd(c, 30479) || (f[10959] = a), 0 | Yd(c, 30484) || (f[18317] = a), 0 | Yd(c, 30490) ? a = e : (f[10960] = a, a = e);
   tf(0 | f[10815], 20 + (0 | f[10959]) | 0, 0), Of(43072, 64, 1, 0 | f[10815]), b[43135] = 0, 0 | (a = 0 | Oe(43072, 32)) && (Te(43136, a + 1 | 0), b[a >> 0] = 0), e = 0 | Za(), d[168359] = e, e = 0 | Za(), d[168360] = e, f[18282] = 13, $a(), e = 0 | Za(), d[168364] = e, e = 0 | Za(), d[168365] = e, f[18491] = 26, f[10839] = 16383, u = g;
  }
  function cg(a, c, d) {
   c |= 0;
   var e = 0, g = 0, h = 0, i = 0;
   if (h = (a |= 0) + (d |= 0) | 0, c &= 255, (0 | d) >= 67) {
    for (;3 & a; ) b[a >> 0] = c, a = a + 1 | 0;
    for (g = (e = -4 & h | 0) - 64 | 0, i = c | c << 8 | c << 16 | c << 24; (0 | a) <= (0 | g); ) f[a >> 2] = i, f[a + 4 >> 2] = i, f[a + 8 >> 2] = i, f[a + 12 >> 2] = i, f[a + 16 >> 2] = i, f[a + 20 >> 2] = i, f[a + 24 >> 2] = i, f[a + 28 >> 2] = i, f[a + 32 >> 2] = i, f[a + 36 >> 2] = i, f[a + 40 >> 2] = i, f[a + 44 >> 2] = i, f[a + 48 >> 2] = i, f[a + 52 >> 2] = i, f[a + 56 >> 2] = i, f[a + 60 >> 2] = i, a = a + 64 | 0;
    for (;(0 | a) < (0 | e); ) f[a >> 2] = i, a = a + 4 | 0;
   }
   for (;(0 | a) < (0 | h); ) b[a >> 0] = c, a = a + 1 | 0;
   return h - d | 0;
  }
  function Rc(a) {
   a |= 0;
   var c = 0, d = 0, e = 0, g = 0, h = 0;
   h = u, u = u + 96 | 0, g = h, d = h + 24 | 0, b[19 + (e = h + 68 | 0) >> 0] = 0;
   a: do {
    if (a) for (a = 19; ;) {
     if (c = a + -1 | 0, !a) break a;
     a = 255 & (0 | Qf(0 | f[10815])), b[e + c >> 0] = a, a = c;
    } else Of(e, 19, 1, 0 | f[10815]);
   } while (0);
   c = (a = d) + 44 | 0;
   do {
    f[a >> 2] = 0, a = a + 4 | 0;
   } while ((0 | a) < (0 | c));
   a = d + 20 | 0, c = d + 16 | 0, f[g >> 2] = a, f[g + 4 >> 2] = c, f[g + 8 >> 2] = d + 12, f[g + 12 >> 2] = d + 8, f[g + 16 >> 2] = d + 4, f[g + 20 >> 2] = d, 6 == (0 | lf(e, 29600, g)) && (f[a >> 2] = (0 | f[a >> 2]) - 1900, f[c >> 2] = (0 | f[c >> 2]) - 1, f[d + 32 >> 2] = -1, (0 | ra(0 | d)) > 0 && (g = 0 | ra(0 | d), f[18316] = g)), u = h;
  }
  function mb(a) {
   var c = 0, e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
   for (e = 16 + (q = 0 | f[(a |= 0) >> 2]) | 0, f[a >> 2] = e, q = q + -1 | 0, c = 16; ;) {
    if (!c) {
     c = 0;
     break;
    }
    if (0 | b[q + c >> 0]) break;
    c = c + -1 | 0;
   }
   for (o = 0 | Cd(1 + (p = 1 << c) | 0, 2), d[o >> 1] = c, n = 1, g = 1; !((0 | c) < (0 | n)); ) {
    for (k = q + n | 0, l = 1 << c - n, m = n << 8, j = 0; (0 | j) < (0 | h[k >> 0]); ) {
     for (i = 0; !((0 | i) >= (0 | l)); ) (0 | g) <= (0 | p) && (d[o + (g << 1) >> 1] = h[e >> 0] | m, g = g + 1 | 0), i = i + 1 | 0;
     i = e + 1 | 0, f[a >> 2] = i, j = j + 1 | 0, e = i;
    }
    n = n + 1 | 0;
   }
   return 0 | o;
  }
  function be(a, c, d, e) {
   a |= 0, c |= 0, d |= 0, e |= 0;
   var g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0;
   m = u, u = u + 128 | 0, g = m + 124 | 0, i = 23288, j = (h = l = m) + 124 | 0;
   do {
    f[h >> 2] = f[i >> 2], h = h + 4 | 0, i = i + 4 | 0;
   } while ((0 | h) < (0 | j));
   return (c + -1 | 0) >>> 0 > 2147483646 ? c ? (f[5745] = 75, c = -1) : (a = g, c = 1, k = 4) : k = 4, 4 == (0 | k) && (k = c >>> 0 > (k = -2 - a | 0) >>> 0 ? k : c, f[l + 48 >> 2] = k, f[(g = l + 20 | 0) >> 2] = a, f[l + 44 >> 2] = a, c = a + k | 0, f[(a = l + 16 | 0) >> 2] = c, f[l + 28 >> 2] = c, c = 0 | ce(l, d, e), k && (b[(l = 0 | f[g >> 2]) + (((0 | l) == (0 | f[a >> 2])) << 31 >> 31) >> 0] = 0)), u = m, 0 | c;
  }
  function Ob(a, b) {
   a |= 0, b |= 0;
   var c = 0, e = 0, g = 0, h = 0;
   a: do {
    switch (0 | a) {
    case -1:
     f[10978] = 0, f[(c = 43200) >> 2] = 0, f[c + 4 >> 2] = 0, c = 0;
     break;

    case 0:
     c = 0;
     break;

    default:
     if (e = 0 | f[10978], g = 43200, c = 0 | f[g >> 2], g = 0 | f[g + 4 >> 2], (0 | e) < (0 | a) ? (h = 0 | $a(), f[(e = 43200) >> 2] = h, f[e + 4 >> 2] = c, e = 32 + (0 | f[10978]) | 0, f[10978] = e) : (h = c, c = g), c = 0 | fg(0 | dg(0 | h, 0 | c, 64 - e | 0), 0 | I, 64 - a | 0), b) {
      c = 0 | d[b + (c << 1) >> 1], f[10978] = e - ((65535 & c) >>> 8), c &= 255;
      break a;
     }
     f[10978] = e - a;
     break a;
    }
   } while (0);
   return 0 | c;
  }
  function od(a, b) {
   a |= 0, b |= 0;
   var c = 0, e = 0, g = 0, h = 0, i = 0;
   for (h = u, u = u + 240 | 0, g = h, c = h + 104 | 0, f[(i = h + 96 | 0) >> 2] = a, f[i + 4 >> 2] = b, $d(c, 38473, i), b = 0; !(b >>> 0 >= 518); ) {
    if (i = 0 | f[888 + (b << 5) >> 2], !(0 | _d(c, i, 0 | Ne(i)))) {
     e = 4;
     break;
    }
    b = b + 1 | 0;
   }
   if (4 == (0 | e) && ((a = 0 | d[888 + (b << 5) + 4 >> 1]) << 16 >> 16 && (f[10838] = 65535 & a), (a = 0 | d[888 + (b << 5) + 6 >> 1]) << 16 >> 16 && (f[10839] = 65535 & a), 53 != (0 | b))) {
    for (f[10823] = 0, a = 0; 12 != (0 | a); ) p[g + (a << 3) >> 3] = +(0 | d[888 + (b << 5) + 8 + (a << 1) >> 1]) / 1e4, a = a + 1 | 0;
    Kc(43300, g);
   }
   u = h;
  }
  function Td(a) {
   var c = 0, d = 0, e = 0, g = 0, i = 0, j = 0, k = 0;
   return d = 104 + (a |= 0) | 0, c = 0 | f[d >> 2], 3 == (0 | (j = c ? (0 | f[a + 108 >> 2]) < (0 | c) ? 3 : 4 : 3)) && ((0 | (c = 0 | Vd(a))) < 0 ? j = 4 : (e = 0 | f[d >> 2], d = a + 8 | 0, i = 0 | f[a + 4 >> 2], e ? (g = k = 0 | f[d >> 2], e = (k - i | 0) < (0 | (e = e - (0 | f[(d = a + 108 | 0) >> 2]) | 0)) ? g : i + (e + -1) | 0) : (g = 0 | f[d >> 2], d = a + 108 | 0, e = g), f[a + 100 >> 2] = e, 0 | g && (f[d >> 2] = 1 - i + g + (0 | f[d >> 2])), (0 | h[(d = i + -1 | 0) >> 0]) != (0 | c) && (b[d >> 0] = c))), 4 == (0 | j) && (f[a + 100 >> 2] = 0, c = -1), 0 | c;
  }
  function qd() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, g = 0, i = 0, j = 0, k = 0;
   for (i = u, u = u + 32 | 0, d = i + 16 | 0, f[(e = i) >> 2] = 0, f[e + 4 >> 2] = 0, f[e + 8 >> 2] = 0, f[e + 12 >> 2] = 0, Of(d, 2, 2, 0 | f[10815]), a = 65534, c = 2; g = a + -1 | 0, a; ) {
    for (Of(d + (c << 1) | 0, 2, 1, 0 | f[10815]), b = 2 ^ c, a = 0; 2 != (0 | a); ) j = 0 == (0 | a) & 1, k = +(((0 | h[d + (b << 1) + a >> 0]) << 8 | 0 | h[d + (b << 1) + j >> 0]) - ((0 | h[d + (c << 1) + a >> 0]) << 8 | 0 | h[d + (c << 1) + j >> 0]) | 0), p[(j = e + (a << 3) | 0) >> 3] = +p[j >> 3] + k * k, a = a + 1 | 0;
    a = g, c = c + 1 & 3;
   }
   return u = i, 0 | (+p[e >> 3] < +p[e + 8 >> 3] ? 19789 : 18761);
  }
  function jd(a) {
   a |= 0;
   var c = 0, e = 0, g = 0, h = 0, i = 0;
   h = u, u = u + 16 | 0, g = h, tf(0 | f[10815], 2, 0), d[102818] = 18761, (e = 6 == (0 | (c = 0 | Qf(0 | f[10815])))) && tf(0 | f[10815], 5, 1);
   do {
    if ((0 | $a()) == (0 | a)) {
     if ((0 | c) > 6 && (a = 0 | $a(), f[10960] = a), i = 0 | Za(), d[168355] = i, d[168360] = i, i = 0 | Za(), d[168356] = i, d[168359] = i, b[43072] = 0 | b[30654], b[43073] = 0 | b[30655], b[43074] = 0 | b[30656], b[43075] = 0 | b[30657], b[43076] = 0 | b[30658], a = 0 | j[168355], f[g >> 2] = c, f[g + 4 >> 2] = 65535 & i, f[g + 8 >> 2] = a, $d(43136, 30659, g), e) {
      f[18282] = 32;
      break;
     }
     9 == (0 | c) && (f[18282] = 33);
    }
   } while (0);
   u = h;
  }
  function Pe(a, c) {
   a |= 0;
   var d = 0, e = 0;
   d = 255 & (c |= 0);
   a: do {
    if (d) {
     if (e = 255 & c, 3 & a) do {
      if ((c = 0 | b[a >> 0]) << 24 >> 24 == 0 ? 1 : c << 24 >> 24 == e << 24 >> 24) break a;
      a = a + 1 | 0;
     } while (0 != (3 & a | 0));
     d = 0 | X(d, 16843009), c = 0 | f[a >> 2];
     b: do {
      if (!((-2139062144 & c ^ -2139062144) & c + -16843009)) do {
       if ((-2139062144 & (c ^= d) ^ -2139062144) & c + -16843009 | 0) break b;
       c = 0 | f[(a = a + 4 | 0) >> 2];
      } while (!((-2139062144 & c ^ -2139062144) & c + -16843009 | 0));
     } while (0);
     for (;(d = 0 | b[a >> 0]) << 24 >> 24 != 0 && d << 24 >> 24 != e << 24 >> 24; ) a = a + 1 | 0;
    } else a = a + (0 | Ne(a)) | 0;
   } while (0);
   return 0 | a;
  }
  function Ue(a, c) {
   a |= 0;
   var d = 0, e = 0;
   d = c |= 0;
   a: do {
    if (3 & (d ^ a)) e = 8; else {
     if (3 & d) do {
      if (d = 0 | b[c >> 0], b[a >> 0] = d, !(d << 24 >> 24)) break a;
      c = c + 1 | 0, a = a + 1 | 0;
     } while (0 != (3 & c | 0));
     if (!((-2139062144 & (d = 0 | f[c >> 2]) ^ -2139062144) & d + -16843009)) for (;;) {
      if (c = c + 4 | 0, e = a + 4 | 0, f[a >> 2] = d, (-2139062144 & (d = 0 | f[c >> 2]) ^ -2139062144) & d + -16843009 | 0) {
       a = e;
       break;
      }
      a = e;
     }
     e = 8;
    }
   } while (0);
   if (8 == (0 | e) && (e = 0 | b[c >> 0], b[a >> 0] = e, e << 24 >> 24)) do {
    a = a + 1 | 0, e = 0 | b[(c = c + 1 | 0) >> 0], b[a >> 0] = e;
   } while (e << 24 >> 24 != 0);
  }
  function gd(a) {
   a |= 0;
   var b = 0, c = 0;
   tf(0 | f[10815], a, 0);
   a: do {
    if (255 == (0 | Qf(0 | f[10815])) && 216 == (0 | Qf(0 | f[10815]))) for (;;) {
     if (255 != (0 | Qf(0 | f[10815]))) break a;
     if (218 == (0 | (a = 0 | Qf(0 | f[10815])))) break a;
     switch (d[102818] = 19789, b = (65535 & (0 | Za())) - 2 | 0, c = 0 | Pf(0 | f[10815]), 0 | a) {
     case 192:
     case 195:
     case 201:
      Qf(0 | f[10815]), a = 0 | Za(), d[168360] = a, a = 0 | Za(), d[168359] = a;
     }
     a = 0 | Za(), d[102818] = a, a = 0 | $a(), 1212498256 == (0 | $a()) && bd(a + c | 0, b - a | 0, 0), 0 | Yc(c + 6 | 0) && _c(), tf(0 | f[10815], c + b | 0, 0);
    }
   } while (0);
  }
  function Of(a, c, d, e) {
   a |= 0, e |= 0;
   var g = 0, h = 0, i = 0, j = 0, k = 0;
   j = 0 | X(d |= 0, c |= 0), i = 0 == (0 | c) ? 0 : d, g = 0 | b[(d = e + 74 | 0) >> 0], b[d >> 0] = g + 255 | g, g = 0 | f[(d = e + 4 | 0) >> 2], h = (k = (0 | f[e + 8 >> 2]) - g | 0) >>> 0 < j >>> 0 ? k : j, (0 | k) > 0 ? (gg(0 | a, 0 | g, 0 | h), f[d >> 2] = g + h, g = j - h | 0, d = a + h | 0) : (g = j, d = a);
   a: do {
    if (0 | g) {
     for (a = e + 32 | 0; !(0 | Wd(e) || (1 + (h = 0 | La[7 & f[a >> 2]](e, d, g)) | 0) >>> 0 < 2); ) {
      if (!(g = g - h | 0)) break a;
      d = d + h | 0;
     }
     return 0 | ((j - g | 0) >>> 0) / (c >>> 0);
    }
   } while (0);
   return 0 | i;
  }
  function jb() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (c = 0 | f[10822], e = 0 | f[10812], k = 0 | f[10838], l = 0 | j[168357], m = 0 | j[168358], a = 0; !((0 | a) >= (0 | j[168355])); ) {
    for (g = a << 1 & 14, h = 3 & a, i = 0 | X(a >> l, m), b = 0; !((0 | b) >= (0 | j[168356])); ) o = (0 | X((0 | (p = (0 | j[(n = c + (i + (b >> l) << 3) + ((e >>> (((o = 1 & b) | g) << 1) & 3) << 1) | 0) >> 1]) - k | 0)) > 0 ? p : 0, 0 | d[23636 + (h << 2) + (o << 1) >> 1])) >>> 9 & 65535, d[n >> 1] = o, b = b + 1 | 0;
    a = a + 1 | 0;
   }
   eb(), gb(), hb(), f[10839] = (1109 * (1023 - k | 0) | 0) >>> 9, f[10838] = 0;
  }
  function Uf() {
   var a = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
   k = u, u = u + 48 | 0, i = k + 24 | 0, h = k + 16 | 0, g = k, d = 43046, e = 20 + (a = c = k + 28 | 0) | 0;
   do {
    b[a >> 0] = 0 | b[d >> 0], a = a + 1 | 0, d = d + 1 | 0;
   } while ((0 | a) < (0 | e));
   for (d = c + 13 | 0, a = 0; ;) {
    if (Tf(d), f[g >> 2] = c, f[g + 4 >> 2] = 32962, f[g + 8 >> 2] = 384, e = 0 | Kd(0 | Ba(5, 0 | g)), a = a + 1 | 0, (0 | e) > -1) {
     j = 4;
     break;
    }
    if ((0 | a) >= 100) {
     a = 0;
     break;
    }
   }
   return 4 == (0 | j) && (f[h >> 2] = c, xa(10, 0 | h), (a = 0 | af(e, 43066)) || (f[i >> 2] = e, Aa(6, 0 | i), a = 0)), u = k, 0 | a;
  }
  function td() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0;
   for (Ic(+p[17], +p[18], 0, 0), g = 0 | f[10824], f[10823] = 1 | f[10823], cg(73980, 0, 131072), a = 0 | f[10822], e = 0; (0 | e) < (0 | j[168355]); ) {
    for (c = 0; !((0 | c) >= (0 | j[168356])); ) {
     for (b = a + ((0 | Ua(e, c)) << 1) | 0, d[a >> 1] = 0 | d[b >> 1], b = 0; (0 | b) != (0 | g); ) f[(h = 73980 + (b << 15) + ((0 | j[a + (b << 1) >> 1]) >>> 3 << 2) | 0) >> 2] = 1 + (0 | f[h >> 2]), b = b + 1 | 0;
     c = c + 1 | 0, a = a + 8 | 0;
    }
    e = e + 1 | 0;
   }
   4 == (0 | g) & 0 != (0 | f[40]) && (f[10824] = 3), 0 | f[10812] && (f[10824] = 1);
  }
  function xf(a, c) {
   a |= 0;
   var d = 0, e = 0, f = 0;
   f = 0 | b[(c |= 0) >> 0];
   do {
    if (f << 24 >> 24) if (a = 0 | Oe(a, f << 24 >> 24)) {
     if ((e = 0 | b[c + 1 >> 0]) << 24 >> 24) if (0 | b[a + 1 >> 0]) {
      if (!((d = 0 | b[c + 2 >> 0]) << 24 >> 24)) {
       a = 0 | yf(a, f, e);
       break;
      }
      if (0 | b[a + 2 >> 0]) {
       if (!(0 | b[c + 3 >> 0])) {
        a = 0 | zf(a, f, e, d);
        break;
       }
       if (0 | b[a + 3 >> 0]) {
        if (0 | b[c + 4 >> 0]) {
         a = 0 | Bf(a, c);
         break;
        }
        a = 0 | Af(a, c);
        break;
       }
       a = 0;
      } else a = 0;
     } else a = 0;
    } else a = 0;
   } while (0);
   return 0 | a;
  }
  function Sb() {
   var a = 0, b = 0, c = 0, e = 0, g = 0;
   a = 0 | f[10839], e = 0;
   do {
    e = e + 1 | 0;
   } while (1 << e >>> 0 < a >>> 0);
   for (db(0 | f[10837], 0 | X(0 | j[168360], 0 | j[168359])), b = 0; (0 | b) < (0 | j[168360]); ) {
    for (a = 0; c = 0 | j[168359], !((0 | a) >= (0 | c)); ) g = (0 | f[10837]) + ((0 | X(c, b)) + a << 1) | 0, c = (0 | j[g >> 1]) >>> (0 | f[10846]), d[g >> 1] = c, (65535 & c) >>> e | 0 && (b - (0 | j[102816]) | 0) >>> 0 < (0 | j[168355]) >>> 0 && (a - (0 | j[102817]) | 0) >>> 0 < (0 | j[168356]) >>> 0 && Xa(), a = a + 1 | 0;
    b = b + 1 | 0;
   }
  }
  function Yf(a) {
   a |= 0;
   for (var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0; e = 0 | b[a >> 0], c = e << 24 >> 24, f = a + 1 | 0, 0 | Ud(c); ) a = f;
   switch (0 | c) {
   case 45:
    a = 1, g = 5;
    break;

   case 43:
    a = 0, g = 5;
    break;

   default:
    h = 0, d = a, a = e;
   }
   if (5 == (0 | g) && (h = a, d = f, a = 0 | b[f >> 0]), (c = (a << 24 >> 24) - 48 | 0) >>> 0 < 10) {
    a = 0;
    do {
     a = (10 * a | 0) - c | 0, c = (0 | b[(d = d + 1 | 0) >> 0]) - 48 | 0;
    } while (c >>> 0 < 10);
   } else a = 0;
   return 0 | (0 | h ? a : 0 - a | 0);
  }
  function hb() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0;
   for (b = +n[10818], j = +n[10817] / b, a = (h = (b = +n[10819] / b) < .8789) & j > 1 & (i = j) <= 1.28 & 1, (c = !(j <= 2) | !(i > 1.28)) | h ? a = c ? a : 3 : b <= 2 && (a = 4), e = 0 != +n[10820] ? 5 : a, f[10823] = 0, g = 0 | f[10824], a = 0; 3 != (0 | a); ) {
    for (h = a << 2, c = 0; (0 | c) != (0 | g); ) n[43300 + (a << 4) + (c << 2) >> 2] = .0009765625 * +(0 | d[23492 + (24 * e | 0) + (c + h << 1) >> 1]), c = c + 1 | 0;
    a = a + 1 | 0;
   }
  }
  function _e(a, c) {
   a |= 0;
   var d = 0, e = 0, g = 0, h = 0, i = 0;
   return i = u, u = u + 48 | 0, h = i + 32 | 0, g = i + 16 | 0, d = i, 0 | le(43035, 0 | b[(c |= 0) >> 0], 4) ? (e = 0 | $e(c), f[d >> 2] = a, f[d + 4 >> 2] = 32768 | e, f[d + 8 >> 2] = 438, (0 | (d = 0 | Kd(0 | Ba(5, 0 | d)))) < 0 ? a = 0 : (524288 & e | 0 && (f[g >> 2] = d, f[g + 4 >> 2] = 2, f[g + 8 >> 2] = 1, ha(221, 0 | g)), (a = 0 | af(d, c)) || (f[h >> 2] = d, Aa(6, 0 | h), a = 0))) : (f[5745] = 22, a = 0), u = i, 0 | a;
  }
  function Ze(a, c) {
   a |= 0;
   var d = 0, e = 0, g = 0, i = 0, j = 0, k = 0, l = 0;
   l = u, u = u + 16 | 0, k = 255 & (c |= 0), b[(j = l) >> 0] = k, (e = 0 | f[(d = a + 16 | 0) >> 2]) ? g = 4 : 0 | ze(a) ? d = -1 : (e = 0 | f[d >> 2], g = 4);
   do {
    if (4 == (0 | g)) {
     if (i = a + 20 | 0, (g = 0 | f[i >> 2]) >>> 0 < e >>> 0 && (0 | (d = 255 & c)) != (0 | b[a + 75 >> 0])) {
      f[i >> 2] = g + 1, b[g >> 0] = k;
      break;
     }
     d = 1 == (0 | La[7 & f[a + 36 >> 2]](a, j, 1)) ? 0 | h[j >> 0] : -1;
    }
   } while (0);
   return u = l, 0 | d;
  }
  function Fb() {
   var a = 0, c = 0, d = 0, e = 0, g = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0;
   for (n = u, u = u + 16 | 0, c = n, tf(0 | f[10815], 0, 0), d = c + 2 | 0, e = c + 4 | 0, g = c + 7 | 0, i = c + 9 | 0, j = c + 1 | 0, k = c + 6 | 0, l = c + 8 | 0, m = c + 11 | 0, a = 0; ;) {
    if ((0 | a) >= 1024) {
     a = 1;
     break;
    }
    if (Of(c, 1, 12, 0 | f[10815]), 3 != (3 & b[j >> 0] & (b[e >> 0] & b[d >> 0] & b[g >> 0] & b[i >> 0] & 255) >>> 4 & (0 | h[k >> 0]) & (0 | h[l >> 0]) & (0 | h[m >> 0]) | 0)) {
     a = 0;
     break;
    }
    a = a + 1 | 0;
   }
   return u = n, 0 | a;
  }
  function Ge(a, b) {
   a = +a;
   var c = 0, d = 0;
   return (0 | (b |= 0)) > 1023 ? (a *= 8.98846567431158e307, c = b + -1023 | 0, b = b + -2046 | 0, a = (d = (0 | c) > 1023) ? 8.98846567431158e307 * a : a, b = d ? (0 | b) < 1023 ? b : 1023 : c) : (0 | b) < -1022 && (a *= 2.2250738585072014e-308, d = b + 1022 | 0, b = b + 2044 | 0, a = (c = (0 | d) < -1022) ? 2.2250738585072014e-308 * a : a, b = c ? (0 | b) > -1022 ? b : -1022 : d), c = 0 | dg(b + 1023 | 0, 0, 52), d = I, f[s >> 2] = c, f[s + 4 >> 2] = d, +a * +p[s >> 3];
  }
  function Se(a, c, d) {
   a |= 0, c |= 0;
   var e = 0, f = 0, g = 0;
   if (d |= 0) {
    e = 255 & (f = 0 | b[a >> 0]);
    a: do {
     if (f << 24 >> 24) {
      g = f;
      do {
       if (d = d + -1 | 0, f = 0 | b[c >> 0], !(0 != (0 | d) & f << 24 >> 24 != 0)) break a;
       if (g << 24 >> 24 != f << 24 >> 24 && (0 | (g = 0 | Pd(e))) != (0 | Pd(255 & f))) break a;
       c = c + 1 | 0, e = 255 & (g = 0 | b[(a = a + 1 | 0) >> 0]);
      } while (g << 24 >> 24 != 0);
     }
    } while (0);
    e = (e = 0 | Pd(e)) - (0 | Pd(0 | h[c >> 0])) | 0;
   } else e = 0;
   return 0 | e;
  }
  function wf(a, b, c) {
   a |= 0, b |= 0;
   var d = 0, e = 0, g = 0;
   return 1 == (0 | (c |= 0)) && (b = b - (0 | f[a + 8 >> 2]) + (0 | f[a + 4 >> 2]) | 0), d = a + 20 | 0, e = a + 28 | 0, (0 | f[d >> 2]) >>> 0 > (0 | f[e >> 2]) >>> 0 ? (La[7 & f[a + 36 >> 2]](a, 0, 0), 0 | f[d >> 2] ? g = 5 : b = -1) : g = 5, 5 == (0 | g) && (f[a + 16 >> 2] = 0, f[e >> 2] = 0, f[d >> 2] = 0, (0 | La[7 & f[a + 40 >> 2]](a, b, c)) < 0 ? b = -1 : (f[a + 8 >> 2] = 0, f[a + 4 >> 2] = 0, f[a >> 2] = -17 & f[a >> 2], b = 0)), 0 | b;
  }
  function id(a) {
   a |= 0;
   var b = 0, c = 0, e = 0, g = 0, h = 0;
   for (h = u, u = u + 16 | 0, e = h, d[102818] = 19789; !((7 + (0 | Pf(0 | f[10815])) | 0) >= (0 | a) || (b = 0 | Pf(0 | f[10815]), (c = 0 | $a()) >>> 0 < 8)); ) Of(e, 4, 1, 0 | f[10815]), b = c + b | 0, 0 | Zd(e, 30634, 4) && 0 | Zd(e, 30639, 4) ? 0 | Zd(e, 30644, 4) || (g = 7) : g = 7, 7 == (0 | g) && (g = 0, id(b)), 0 | Zd(e, 30649, 4) || gd(0 | Pf(0 | f[10815])), tf(0 | f[10815], b, 0);
   u = h;
  }
  function Xe(a, c) {
   var d = 0, e = 0, g = 0;
   g = 255 & (a |= 0), d = (255 & a | 0) == (0 | b[75 + (c |= 0) >> 0]);
   do {
    if ((0 | f[c + 76 >> 2]) < 0) {
     if (!d && (d = c + 20 | 0, (e = 0 | f[d >> 2]) >>> 0 < (0 | f[c + 16 >> 2]) >>> 0)) {
      f[d >> 2] = e + 1, b[e >> 0] = g;
      break;
     }
     Ze(c, a);
    } else {
     if (!d && (d = c + 20 | 0, (e = 0 | f[d >> 2]) >>> 0 < (0 | f[c + 16 >> 2]) >>> 0)) {
      f[d >> 2] = e + 1, b[e >> 0] = g;
      break;
     }
     Ze(c, a);
    }
   } while (0);
  }
  function Nf(a, c) {
   var d = 0, e = 0, g = 0;
   g = 255 & (a |= 0), d = (255 & a | 0) == (0 | b[75 + (c |= 0) >> 0]);
   do {
    if ((0 | f[c + 76 >> 2]) < 0) {
     if (!d && (d = c + 20 | 0, (e = 0 | f[d >> 2]) >>> 0 < (0 | f[c + 16 >> 2]) >>> 0)) {
      f[d >> 2] = e + 1, b[e >> 0] = g;
      break;
     }
     Ze(c, a);
    } else {
     if (!d && (d = c + 20 | 0, (e = 0 | f[d >> 2]) >>> 0 < (0 | f[c + 16 >> 2]) >>> 0)) {
      f[d >> 2] = e + 1, b[e >> 0] = g;
      break;
     }
     Ze(c, a);
    }
   } while (0);
  }
  function gf(a) {
   var b = 0, c = 0, d = 0, e = 0, g = 0, h = 0;
   return g = 20 + (a |= 0) | 0, h = a + 28 | 0, (0 | f[g >> 2]) >>> 0 > (0 | f[h >> 2]) >>> 0 ? (La[7 & f[a + 36 >> 2]](a, 0, 0), 0 | f[g >> 2] ? c = 3 : b = -1) : c = 3, 3 == (0 | c) && ((c = 0 | f[(b = a + 4 | 0) >> 2]) >>> 0 < (e = 0 | f[(d = a + 8 | 0) >> 2]) >>> 0 && La[7 & f[a + 40 >> 2]](a, c - e | 0, 1), f[a + 16 >> 2] = 0, f[h >> 2] = 0, f[g >> 2] = 0, f[d >> 2] = 0, f[b >> 2] = 0, b = 0), 0 | b;
  }
  function Af(a, c) {
   a |= 0;
   var d = 0, e = 0, f = 0;
   if (e = (0 | h[1 + (c |= 0) >> 0]) << 16 | (0 | h[c >> 0]) << 24 | (0 | h[c + 2 >> 0]) << 8 | 0 | h[c + 3 >> 0], c = a + 3 | 0, f = 0 | b[c >> 0], d = (0 | h[a + 1 >> 0]) << 16 | (0 | h[a >> 0]) << 24 | (0 | h[a + 2 >> 0]) << 8 | 255 & f, a = f << 24 >> 24 != 0, !((0 | d) == (0 | e) | 1 ^ a)) do {
    d = 255 & (a = 0 | b[(c = c + 1 | 0) >> 0]) | d << 8, a = a << 24 >> 24 != 0;
   } while (!((0 | d) == (0 | e) | 1 ^ a));
   return 0 | (a ? c + -3 | 0 : 0);
  }
  function je(a, c, d) {
   d |= 0;
   var e = 0;
   if ((c |= 0) >>> 0 > 0 | 0 == (0 | c) & (a |= 0) >>> 0 > 4294967295) {
    for (;e = 0 | og(0 | a, 0 | c, 10, 0), d = d + -1 | 0, b[d >> 0] = 255 & e | 48, e = a, a = 0 | jg(0 | a, 0 | c, 10, 0), c >>> 0 > 9 | 9 == (0 | c) & e >>> 0 > 4294967295; ) c = I;
    c = a;
   } else c = a;
   if (c) for (;d = d + -1 | 0, b[d >> 0] = 48 | (c >>> 0) % 10, !(c >>> 0 < 10); ) c = (c >>> 0) / 10 | 0;
   return 0 | d;
  }
  function ad() {
   var a = 0, b = 0, c = 0, d = 0;
   Za();
   a: do {
    if (524296 == (0 | $a()) && 0 | $a()) {
     switch (c = 0 | Za(), d = 65535 & c, c << 16 >> 16) {
     case 10:
     case 12:
      a = 0, c = 0;
      break;

     default:
      break a;
     }
     for (;;) {
      if (8 == (0 | c)) break a;
      for (b = 0; 8 != (0 | b); ) (0 | a) < (0 | d) && (Za(), a = a + 16 | 0), b = b + 1 | 0, a = a - d | 0;
      c = c + 1 | 0;
     }
    }
   } while (0);
  }
  function _d(a, c, d) {
   a |= 0, c |= 0;
   var e = 0, f = 0, g = 0, h = 0;
   if (d |= 0) {
    e = 255 & (h = 0 | b[a >> 0]), f = 255 & (g = 0 | b[c >> 0]);
    a: do {
     if (h << 24 >> 24) do {
      if (d = d + -1 | 0, !(h << 24 >> 24 == g << 24 >> 24 & g << 24 >> 24 != 0 & 0 != (0 | d))) break a;
      c = c + 1 | 0, e = 255 & (h = 0 | b[(a = a + 1 | 0) >> 0]), f = 255 & (g = 0 | b[c >> 0]);
     } while (h << 24 >> 24 != 0);
    } while (0);
    e = e - f | 0;
   } else e = 0;
   return 0 | e;
  }
  function Ne(a) {
   var c = 0, d = 0, e = 0;
   e = a |= 0;
   a: do {
    if (3 & e) for (c = e; ;) {
     if (!(0 | b[a >> 0])) {
      a = c;
      break a;
     }
     if (a = a + 1 | 0, !(3 & (c = a))) {
      d = 4;
      break;
     }
    } else d = 4;
   } while (0);
   if (4 == (0 | d)) {
    for (;!((-2139062144 & (c = 0 | f[a >> 2]) ^ -2139062144) & c + -16843009); ) a = a + 4 | 0;
    if ((255 & c) << 24 >> 24) do {
     a = a + 1 | 0;
    } while (0 != (0 | b[a >> 0]));
   }
   return a - e | 0;
  }
  function te(a, c) {
   a |= 0, c |= 0;
   var d = 0, e = 0;
   for (e = 0; ;) {
    if ((0 | h[41130 + e >> 0]) == (0 | a)) {
     a = 2;
     break;
    }
    if (87 == (0 | (d = e + 1 | 0))) {
     d = 41218, e = 87, a = 5;
     break;
    }
    e = d;
   }
   if (2 == (0 | a) && (e ? (d = 41218, a = 5) : d = 41218), 5 == (0 | a)) for (;;) {
    do {
     a = d, d = d + 1 | 0;
    } while (0 != (0 | b[a >> 0]));
    if (!(e = e + -1 | 0)) break;
    a = 5;
   }
   return 0 | ue(d, 0 | f[c + 20 >> 2]);
  }
  function re(a, b) {
   a = +a, b |= 0;
   var c = 0, d = 0, e = 0;
   switch (p[s >> 3] = a, c = 0 | f[s >> 2], d = 0 | f[s + 4 >> 2], 2047 & (e = 0 | fg(0 | c, 0 | d, 52))) {
   case 0:
    0 != a ? (a = +re(0x10000000000000000 * a, b), c = (0 | f[b >> 2]) - 64 | 0) : c = 0, f[b >> 2] = c;
    break;

   case 2047:
    break;

   default:
    f[b >> 2] = (2047 & e) - 1022, f[s >> 2] = c, f[s + 4 >> 2] = -2146435073 & d | 1071644672, a = +p[s >> 3];
   }
   return +a;
  }
  function Dd(a, b) {
   b |= 0;
   var c = 0, d = 0;
   return (a |= 0) ? b >>> 0 > 4294967231 ? (f[5745] = 12, 0 | (b = 0)) : 0 | (c = 0 | Ed(a + -8 | 0, b >>> 0 < 11 ? 16 : b + 11 & -8)) ? 0 | (b = c + 8 | 0) : (c = 0 | Ad(b)) ? (d = 0 | f[a + -4 >> 2], d = (-8 & d) - (0 == (3 & d | 0) ? 8 : 4) | 0, gg(0 | c, 0 | a, 0 | (d >>> 0 < b >>> 0 ? d : b)), Bd(a), 0 | (b = c)) : 0 | (b = 0) : 0 | (b = 0 | Ad(b));
  }
  function Uc(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, f = 0, g = 0;
   for (d = 0; 3 != (0 | d); ) {
    for (c = 0; 3 != (0 | c); ) {
     for (n[(e = 73288 + (d << 4) + (c << 2) | 0) >> 2] = 0, b = 0, f = 0; 3 != (0 | b); ) g = f + +n[632 + (12 * d | 0) + (b << 2) >> 2] * +n[a + (12 * b | 0) + (c << 2) >> 2], n[e >> 2] = g, b = b + 1 | 0, f = g;
     c = c + 1 | 0;
    }
    d = d + 1 | 0;
   }
  }
  function Eb() {
   var a = 0, b = 0, c = 0, d = 0;
   for (c = u, u = u + 1024 | 0, cg(0 | (b = c), 0, 1024), tf(0 | f[10815], -2e3, 2), a = 0; ;) {
    if (2e3 == (0 | a)) {
     a = 0;
     break;
    }
    d = b + ((0 | Qf(0 | f[10815])) << 2) | 0, f[d >> 2] = 1 + (0 | f[d >> 2]), a = a + 1 | 0;
   }
   for (;;) {
    if ((0 | a) >= 4) {
     a = 1;
     break;
    }
    if ((0 | f[b + ((0 | h[29001 + a >> 0]) << 2) >> 2]) < 200) {
     a = 0;
     break;
    }
    a = a + 1 | 0;
   }
   return u = c, 0 | a;
  }
  function Wd(a) {
   var c = 0, d = 0;
   return c = 74 + (a |= 0) | 0, d = 0 | b[c >> 0], b[c >> 0] = d + 255 | d, c = a + 20 | 0, d = a + 28 | 0, (0 | f[c >> 2]) >>> 0 > (0 | f[d >> 2]) >>> 0 && La[7 & f[a + 36 >> 2]](a, 0, 0), f[a + 16 >> 2] = 0, f[d >> 2] = 0, f[c >> 2] = 0, 4 & (c = 0 | f[a >> 2]) ? (f[a >> 2] = 32 | c, c = -1) : (d = (0 | f[a + 44 >> 2]) + (0 | f[a + 48 >> 2]) | 0, f[a + 8 >> 2] = d, f[a + 4 >> 2] = d, c = c << 27 >> 31), 0 | c;
  }
  function Me(a, c) {
   c |= 0;
   var d = 0, e = 0, f = 0;
   d = 255 & (e = 0 | b[(a |= 0) >> 0]);
   a: do {
    if (e << 24 >> 24) {
     f = e;
     do {
      if (!((e = 0 | b[c >> 0]) << 24 >> 24)) break a;
      if (f << 24 >> 24 != e << 24 >> 24 && (0 | (f = 0 | Pd(d))) != (0 | Pd(255 & e))) break a;
      c = c + 1 | 0, d = 255 & (f = 0 | b[(a = a + 1 | 0) >> 0]);
     } while (f << 24 >> 24 != 0);
    }
   } while (0);
   return (f = 0 | Pd(d)) - (0 | Pd(0 | h[c >> 0])) | 0;
  }
  function zf(a, c, d, e) {
   var f = 0;
   if (f = (255 & (d |= 0)) << 16 | (255 & (c |= 0)) << 24 | (255 & (e |= 0)) << 8, e = 2 + (a |= 0) | 0, d = 0 | b[e >> 0], c = (0 | h[a + 1 >> 0]) << 16 | (0 | h[a >> 0]) << 24 | (255 & d) << 8, d = d << 24 >> 24 != 0, !((0 | c) == (0 | f) | 1 ^ d)) do {
    c = (255 & (d = 0 | b[(e = e + 1 | 0) >> 0]) | c) << 8, d = d << 24 >> 24 != 0;
   } while (!((0 | c) == (0 | f) | 1 ^ d));
   return 0 | (d ? e + -2 | 0 : 0);
  }
  function Yb(a) {
   var b = 0, c = 0;
   return (a |= 0) ? ((b = 0 | f[10981]) || (Of(345040 + (b = 0 | f[10846]) | 0, 1, 16384 - b | 0, 0 | f[10815]), Of(345040, 1, 0 | f[10846], 0 | f[10815]), b = 0 | f[10981]), c = 131071 & (b = b - a | 0), f[10981] = c, b = ((0 | h[1 + (c = c >>> 3 ^ 16368) + 345040 >> 0]) << 8 | 0 | h[345040 + c >> 0]) >>> (7 & b) & ~(-1 << a)) : (f[10981] = 0, b = 0), 0 | b;
  }
  function Xa() {
   var a = 0, b = 0, c = 0, d = 0;
   c = u, u = u + 16 | 0, b = c + 8 | 0, a = c;
   do {
    if (!(0 | f[10814])) {
     if (f[a >> 2] = f[10813], uf(22792, 28038, a), a = 0 | f[10815], 0 | jf(a)) {
      We(28043, 23, 1, 22792);
      break;
     }
     d = 0 | Lf(a), f[(a = b) >> 2] = d, f[a + 4 >> 2] = ((0 | d) < 0) << 31 >> 31, uf(22792, 28067, b);
     break;
    }
   } while (0);
   f[10814] = 1 + (0 | f[10814]), u = c;
  }
  function Pc(a, c, d, e, g) {
   a |= 0, c |= 0, d |= 0, e |= 0, g |= 0;
   var h = 0;
   h = 65535 & (0 | Za()), f[c >> 2] = h, c = 65535 & (0 | Za()), f[d >> 2] = c, c = 0 | $a(), f[e >> 2] = c, c = 4 + (0 | Pf(0 | f[10815])) | 0, f[g >> 2] = c, (0 | X((0 | b[29517 + ((g = 0 | f[d >> 2]) >>> 0 < 14 ? g : 0) >> 0]) - 48 | 0, 0 | f[e >> 2])) >>> 0 > 4 && tf(h = 0 | f[10815], (0 | $a()) + a | 0, 0);
  }
  function ef(a) {
   var b = 0, c = 0, d = 0;
   return Ye(a |= 0), (d = 0 != (1 & f[a >> 2] | 0)) || (cf(), b = a + 56 | 0, 0 | (c = 0 | f[a + 52 >> 2]) && (f[c + 56 >> 2] = f[b >> 2]), 0 | (b = 0 | f[b >> 2]) && (f[b + 52 >> 2] = c), (0 | f[51407]) == (0 | a) && (f[51407] = b), df()), ff(a), Ka[1 & f[a + 12 >> 2]](a), 0 | (b = 0 | f[a + 92 >> 2]) && Bd(b), d ? void 0 : void Bd(a);
  }
  function me(a, b, c, d, e) {
   a |= 0, b |= 0;
   var f = 0, g = 0;
   if (g = u, u = u + 256 | 0, f = g, (0 | (c |= 0)) > (0 | (d |= 0)) & 0 == (73728 & (e |= 0) | 0)) {
    if (c = c - d | 0, cg(0 | f, 0 | b, 0 | (c >>> 0 < 256 ? c : 256)), c >>> 0 > 255) {
     d = c;
     do {
      ee(a, f, 256), d = d + -256 | 0;
     } while (d >>> 0 > 255);
     c &= 255;
    }
    ee(a, f, c);
   }
   u = g;
  }
  function qf(a, c, e, g) {
   a |= 0, c |= 0, e |= 0, g |= 0;
   a: do {
    if (0 | a) switch (0 | c) {
    case -2:
     b[a >> 0] = e;
     break a;

    case -1:
     d[a >> 1] = e;
     break a;

    case 0:
    case 1:
     f[a >> 2] = e;
     break a;

    case 3:
     f[(c = a) >> 2] = e, f[c + 4 >> 2] = g;
     break a;

    default:
     break a;
    }
   } while (0);
  }
  function Gb() {
   var a = 0, c = 0, d = 0;
   for (d = u, u = u + 32 | 0, c = d, tf(0 | f[10815], 3072, 0), Of(c, 1, 24, 0 | f[10815]), c = 255 & (b[c + 8 >> 0] << 4 & 48 | 3 & b[c + 20 >> 0]), a = 0; 4 != (0 | a); ) (0 | c) == (0 | f[176 + (a << 5) >> 2]) && (Te(43072, 176 + (a << 5) + 4 | 0), Te(43136, 176 + (a << 5) + 16 | 0)), a = a + 1 | 0;
   u = d;
  }
  function Yc(a) {
   a |= 0;
   var b = 0;
   tf(0 | f[10815], a, 0), b = 0 | Za(), d[102818] = b;
   a: do {
    switch (b << 16 >> 16) {
    case 19789:
    case 18761:
     for (Za(); ;) {
      if (!(b = 0 | $a())) {
       a = 1;
       break a;
      }
      if (tf(0 | f[10815], b + a | 0, 0), 0 | Qc(a)) {
       a = 1;
       break;
      }
     }
     break;

    default:
     a = 0;
    }
   } while (0);
   return 0 | a;
  }
  function eb() {
   var a = 0, b = 0, c = 0, e = 0;
   for (b = 3; 3 == (0 | b); ) b = 2;
   for (e = 1 - (c = +(1311 - (a = 0 | d[23452 + (10 * b | 0) >> 1]) | 0) / +(1399 - a | 0)), a = 1; 5 != (0 | a); ) n[43264 + (a + -1 << 2) >> 2] = 1 / (c * +(0 | d[23482 + (a << 1) >> 1]) + e * +(0 | d[23452 + (10 * b | 0) + (a << 1) >> 1])), a = a + 1 | 0;
  }
  function Ec(a) {
   var b = 0, c = 0, e = 0, g = 0, h = 0, i = 0;
   for (d[(a |= 0) >> 1] = 8, b = 0; 13 != (0 | b); ) {
    for (h = 0 | If(0 | f[10815]), e = 0 | If(0 | f[10815]), g = 256 >>> h, h = 65535 & (h << 8 | b), c = 0; !((0 | c) >= (0 | g)); ) d[a + ((i = c + 1 | 0) + e << 1) >> 1] = h, c = i;
    b = b + 1 | 0;
   }
   Za();
  }
  function Ua(a, c) {
   a |= 0, c |= 0;
   var d = 0;
   switch (0 | (d = 0 | f[10812])) {
   case 1:
    a = 0 | b[27782 + (((0 | j[102816]) + a & 15) << 4) + ((0 | j[102817]) + c & 15) >> 0];
    break;

   case 9:
    a = 0 | b[344940 + (6 * ((a + 6 | 0) % 6 | 0) | 0) + ((c + 6 | 0) % 6 | 0) >> 0];
    break;

   default:
    a = d >>> ((a << 1 & 14 | 1 & c) << 1) & 3;
   }
   return 0 | a;
  }
  function If(a) {
   var b = 0, c = 0, d = 0;
   d = (c = 0 | f[(b = 4 + (a |= 0) | 0) >> 2]) >>> 0 < (0 | f[a + 8 >> 2]) >>> 0;
   do {
    if ((0 | f[a + 76 >> 2]) < 0) {
     if (d) {
      f[b >> 2] = c + 1, a = 0 | h[c >> 0];
      break;
     }
     a = 0 | Vd(a);
     break;
    }
    if (d) {
     f[b >> 2] = c + 1, a = 0 | h[c >> 0];
     break;
    }
    a = 0 | Vd(a);
    break;
   } while (0);
   return 0 | a;
  }
  function pb() {
   var a = 0, c = 0, d = 0, e = 0, g = 0;
   e = u, u = u + 16384 | 0, d = e, tf(0 | f[10815], 0, 0), Of(d, 1, 16384, 0 | f[10815]), c = 540, a = 1;
   a: for (;;) {
    do {
     if (c >>> 0 >= 16383) break a;
     g = c, c = c + 1 | 0;
    } while (-1 != (0 | b[d + g >> 0]));
    if (0 | b[d + c >> 0]) {
     a = 1;
     break;
    }
    a = 0;
   }
   return u = e, 0 | a;
  }
  function Zd(a, c, d) {
   a |= 0, c |= 0, d |= 0;
   var e = 0, f = 0;
   a: do {
    if (d) {
     for (;e = 0 | b[a >> 0], f = 0 | b[c >> 0], e << 24 >> 24 == f << 24 >> 24; ) {
      if (!(d = d + -1 | 0)) {
       a = 0;
       break a;
      }
      a = a + 1 | 0, c = c + 1 | 0;
     }
     a = (255 & e) - (255 & f) | 0;
    } else a = 0;
   } while (0);
   return 0 | a;
  }
  function Yd(a, c) {
   c |= 0;
   var d = 0, e = 0;
   if (d = 0 | b[(a |= 0) >> 0], e = 0 | b[c >> 0], d << 24 >> 24 == 0 ? 1 : d << 24 >> 24 != e << 24 >> 24) a = e; else {
    do {
     c = c + 1 | 0, d = 0 | b[(a = a + 1 | 0) >> 0], e = 0 | b[c >> 0];
    } while (!(d << 24 >> 24 == 0 ? 1 : d << 24 >> 24 != e << 24 >> 24));
    a = e;
   }
   return (255 & d) - (255 & a) | 0;
  }
  function $e(a) {
   var c = 0, d = 0, e = 0;
   return d = 0 == (0 | Oe(a |= 0, 43)), c = 0 | b[a >> 0], d = d ? c << 24 >> 24 != 114 & 1 : 2, e = 0 == (0 | Oe(a, 120)), d = e ? d : 128 | d, a = 0 == (0 | Oe(a, 101)), a = a ? d : 524288 | d, a = c << 24 >> 24 == 114 ? a : 64 | a, a = c << 24 >> 24 == 119 ? 512 | a : a, 0 | (c << 24 >> 24 == 97 ? 1024 | a : a);
  }
  function ze(a) {
   var c = 0, d = 0;
   return c = 74 + (a |= 0) | 0, d = 0 | b[c >> 0], b[c >> 0] = d + 255 | d, 8 & (c = 0 | f[a >> 2]) ? (f[a >> 2] = 32 | c, a = -1) : (f[a + 8 >> 2] = 0, f[a + 4 >> 2] = 0, d = 0 | f[a + 44 >> 2], f[a + 28 >> 2] = d, f[a + 20 >> 2] = d, f[a + 16 >> 2] = d + (0 | f[a + 48 >> 2]), a = 0), 0 | a;
  }
  function sf(a, b, c) {
   b |= 0, c |= 0;
   var d = 0, e = 0, g = 0, h = 0;
   return d = 84 + (a |= 0) | 0, g = 0 | f[d >> 2], h = c + 256 | 0, e = 0 | le(g, 0, h), e = 0 == (0 | e) ? h : e - g | 0, c = e >>> 0 < c >>> 0 ? e : c, gg(0 | b, 0 | g, 0 | c), f[a + 4 >> 2] = g + c, b = g + e | 0, f[a + 8 >> 2] = b, f[d >> 2] = b, 0 | c;
  }
  function pd(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0;
   for (f[10823] = 0, d = 0 | f[10824], c = 0; 3 != (0 | c); ) {
    for (e = 0 | X(c, d), b = 0; (0 | b) != (0 | d); ) f[43300 + (c << 4) + (b << 2) >> 2] = f[17464 + (48 * a | 0) + (b + e << 2) >> 2], b = b + 1 | 0;
    c = c + 1 | 0;
   }
  }
  function mf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, g = 0, h = 0;
   g = u, u = u + 128 | 0, h = (e = d = g) + 124 | 0;
   do {
    f[e >> 2] = 0, e = e + 4 | 0;
   } while ((0 | e) < (0 | h));
   return f[d + 32 >> 2] = 6, f[d + 44 >> 2] = a, f[d + 76 >> 2] = -1, f[d + 84 >> 2] = a, h = 0 | of(d, b, c), u = g, 0 | h;
  }
  function Xf(a) {
   a |= 0;
   var b = 0, c = 0, d = 0, e = 0, g = 0;
   d = u, u = u + 128 | 0, e = (c = b = d) + 124 | 0;
   do {
    f[c >> 2] = 0, c = c + 4 | 0;
   } while ((0 | c) < (0 | e));
   return f[b + 4 >> 2] = a, f[b + 8 >> 2] = -1, f[b + 44 >> 2] = a, f[b + 76 >> 2] = -1, Rd(b, 0), g = +Ce(b, 1, 1), u = d, +g;
  }
  function yf(a, c, d) {
   var e = 0, f = 0;
   for (f = (255 & (c |= 0)) << 8 | 255 & (d |= 0), e = 0 | h[(a |= 0) >> 0]; ;) {
    if (d = a + 1 | 0, !((c = 0 | b[d >> 0]) << 24 >> 24)) {
     a = 0;
     break;
    }
    if ((0 | (e = 255 & c | e << 8 & 65280)) == (0 | f)) break;
    a = d;
   }
   return 0 | a;
  }
  function ng(a, c, d) {
   var e = 0;
   if ((0 | (c |= 0)) < (0 | (a |= 0)) & (0 | a) < (c + (d |= 0) | 0)) {
    for (e = a, c = c + d | 0, a = a + d | 0; (0 | d) > 0; ) c = c - 1 | 0, d = d - 1 | 0, b[(a = a - 1 | 0) >> 0] = 0 | b[c >> 0];
    a = e;
   } else gg(a, c, d);
   return 0 | a;
  }
  function kg(a, b) {
   var c = 0, d = 0, e = 0, f = 0;
   return f = 65535 & (a |= 0), e = 65535 & (b |= 0), c = 0 | X(e, f), d = a >>> 16, a = (c >>> 16) + (0 | X(e, d)) | 0, e = b >>> 16, b = 0 | X(e, f), 0 | (I = (a >>> 16) + (0 | X(e, d)) + (((65535 & a) + b | 0) >>> 16) | 0, a + b << 16 | 65535 & c | 0);
  }
  function _a(a) {
   var b = 0, c = 0, e = 0, f = 0;
   return e = 0 | h[(a |= 0) >> 0], c = 0 | h[a + 2 >> 0], b = 0 | h[a + 3 >> 0], a = 0 | h[a + 1 >> 0], 18761 == (0 | d[102818]) ? (f = c << 16, c = e, a <<= 8, b <<= 24) : (f = c << 8, c = e << 24, a <<= 16), f | c | b | a | 0;
  }
  function Mf(a) {
   var b = 0;
   return b = 128 & f[(a |= 0) >> 2] && (0 | f[a + 20 >> 2]) >>> 0 > (0 | f[a + 28 >> 2]) >>> 0 ? 2 : 1, (0 | (b = 0 | La[7 & f[a + 40 >> 2]](a, 0, b))) >= 0 && (b = b - (0 | f[a + 8 >> 2]) + (0 | f[a + 4 >> 2]) + (0 | f[a + 20 >> 2]) - (0 | f[a + 28 >> 2]) | 0), 0 | b;
  }
  function ff(a) {
   var b = 0;
   if (0 | (a |= 0)) return 0 | gf(a);
   if (a = 0 | f[5821] ? 0 | ff(0 | f[5821]) : 0, cf(), b = 0 | f[51407]) do {
    (0 | f[b + 20 >> 2]) >>> 0 > (0 | f[b + 28 >> 2]) >>> 0 && (a = 0 | gf(b) | a), b = 0 | f[b + 56 >> 2];
   } while (0 != (0 | b));
   return df(), 0 | a;
  }
  function mg(a) {
   var b = 0, c = 0;
   return c = 15 + (a |= 0) & -16 | 0, b = 0 | f[r >> 2], a = b + c | 0, (0 | c) > 0 & (0 | a) < (0 | b) | (0 | a) < 0 ? (da(), pa(12), -1) : (f[r >> 2] = a, (0 | a) > (0 | ca()) && !(0 | ba()) ? (f[r >> 2] = b, pa(12), -1) : 0 | b);
  }
  function xc(a) {
   var b = 0, c = 0, d = 0, e = 0, g = 0;
   for (b = 1, c = e = 0 | f[(a |= 0) >> 2], d = e; 4 != (0 | b); ) g = 0 | f[a + (b << 2) >> 2], b = b + 1 | 0, c = g + c | 0, d = (0 | d) < (0 | g) ? g : d, e = (0 | e) > (0 | g) ? g : e;
   return c - (d + e) >> 1 | 0;
  }
  function Tf(a) {
   a |= 0;
   var c = 0, d = 0, e = 0;
   for (e = u, u = u + 16 | 0, Ca(0, 0 | (d = e)), c = 0, d = 65537 * (0 | f[d + 4 >> 2]) ^ (d >>> 4) + a; b[a + c >> 0] = 65 + (15 & d) | d << 1 & 32, 6 != (0 | (c = c + 1 | 0)); ) d >>>= 5;
   return u = e, 0 | a;
  }
  function Cd(a, b) {
   b |= 0;
   var c = 0;
   return (a |= 0) ? (c = 0 | X(b, a), (b | a) >>> 0 > 65535 && (c = (0 | (c >>> 0) / (a >>> 0)) == (0 | b) ? c : -1)) : c = 0, (a = 0 | Ad(c)) && 3 & f[a + -4 >> 2] ? (cg(0 | a, 0, 0 | c), 0 | a) : 0 | a;
  }
  function Hb() {
   var a = 0, c = 0, d = 0, e = 0;
   for (e = u, u = u + 432 | 0, d = e, tf(0 | f[10815], -424, 2), Of(d, 1, 424, 0 | f[10815]), a = 0, c = 0; 424 != (0 | c); ) a = (0 != (0 | b[d + c >> 0]) & 1) + a | 0, c = c + 1 | 0;
   return u = e, (0 | a) > 20 | 0;
  }
  function hg(a) {
   var c = 0;
   return (0 | (c = 0 | b[w + (255 & (a |= 0)) >> 0])) < 8 ? 0 | c : (0 | (c = 0 | b[w + (a >> 8 & 255) >> 0])) < 8 ? c + 8 | 0 : (0 | (c = 0 | b[w + (a >> 16 & 255) >> 0])) < 8 ? c + 16 | 0 : 24 + (0 | b[w + (a >>> 24) >> 0]) | 0;
  }
  function pf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0;
   for (d = u, u = u + 16 | 0, f[(c = d) >> 2] = f[a >> 2]; e = 3 + (0 | f[c >> 2]) & -4, a = 0 | f[e >> 2], f[c >> 2] = e + 4, b >>> 0 > 1; ) b = b + -1 | 0;
   return u = d, 0 | a;
  }
  function fe(a) {
   var c = 0, d = 0, e = 0;
   if (d = 0 | f[(a |= 0) >> 2], (e = (0 | b[d >> 0]) - 48 | 0) >>> 0 < 10) {
    c = 0;
    do {
     c = (10 * c | 0) + e | 0, d = d + 1 | 0, f[a >> 2] = d, e = (0 | b[d >> 0]) - 48 | 0;
    } while (e >>> 0 < 10);
   } else c = 0;
   return 0 | c;
  }
  function md(a, c) {
   a |= 0, c |= 0;
   var d = 0, e = 0;
   for (tf(0 | f[10815], a, 0), a = 0; d = c + a | 0, !((0 | a) >= 63) && (e = 255 & (0 | Za()), b[d >> 0] = e, e << 24 >> 24); ) a = a + 1 | 0;
   return b[d >> 0] = 0, 0 | c;
  }
  function he(a, c, d, e) {
   if (a |= 0, c |= 0, d |= 0, e |= 0, !(0 == (0 | a) & 0 == (0 | c))) do {
    b[(d = d + -1 | 0) >> 0] = 0 | h[41114 + (15 & a) >> 0] | e, a = 0 | fg(0 | a, 0 | c, 4), c = I;
   } while (!(0 == (0 | a) & 0 == (0 | c)));
   return 0 | d;
  }
  function ud(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0, e = 0;
   return d = 0 | f[18321], e = 0 == (4 & d | 0), c = e ? a : b, a = e ? b : a, 2 & d && (c = (0 | j[172469]) + ~c | 0), e = 0 | j[168358], (0 == (1 & d | 0) ? a : e + ~a | 0) + (0 | X(e, c)) | 0;
  }
  function _f(a, c, d) {
   if (a |= 0, c |= 0, (0 | (d |= 0)) > 1) for (;b[c >> 0] = 0 | b[a + 1 >> 0], b[c + 1 >> 0] = 0 | b[a >> 0], !((0 | (d = d + -2 | 0)) <= 1); ) a = a + 2 | 0, c = c + 2 | 0;
  }
  function Rd(a, b) {
   b |= 0;
   var c = 0, d = 0, e = 0;
   f[104 + (a |= 0) >> 2] = b, e = (c = 0 | f[a + 8 >> 2]) - (d = 0 | f[a + 4 >> 2]) | 0, f[a + 108 >> 2] = e, f[a + 100 >> 2] = 0 != (0 | b) & (0 | e) > (0 | b) ? d + b | 0 : c;
  }
  function tb(a) {
   var b = 0;
   return 16 == (0 | (a = 0 | lb(0 | j[(a |= 0) >> 1], a + 2 | 0))) && ((0 | f[10845]) - 1 | 0) >>> 0 > 16842750 ? -32768 : (b = 0 | lb(a, 0)) - (0 == (b & 1 << a + -1 | 0) ? (1 << a) - 1 | 0 : 0) | 0;
  }
  function kb() {
   var a = 0;
   for (a = 0; ;) {
    if (a >>> 0 >= 100) {
     a = 0;
     break;
    }
    if (tf(0 | f[10815], 3284 + (3340 * a | 0) | 0, 0), (0 | If(0 | f[10815])) > 15) {
     a = 1;
     break;
    }
    a = a + 1 | 0;
   }
   return 0 | a;
  }
  function ie(a, c, d) {
   if (a |= 0, c |= 0, d |= 0, !(0 == (0 | a) & 0 == (0 | c))) do {
    b[(d = d + -1 | 0) >> 0] = 7 & a | 48, a = 0 | fg(0 | a, 0 | c, 3), c = I;
   } while (!(0 == (0 | a) & 0 == (0 | c)));
   return 0 | d;
  }
  function Xd(a, b) {
   a = +a, b = +b;
   var c = 0, d = 0;
   return p[s >> 3] = a, d = 0 | f[s >> 2], c = 0 | f[s + 4 >> 2], p[s >> 3] = b, c = -2147483648 & f[s + 4 >> 2] | 2147483647 & c, f[s >> 2] = d, f[s + 4 >> 2] = c, + +p[s >> 3];
  }
  function Ye(a) {
   var b = 0;
   0 | f[68 + (a |= 0) >> 2] && (b = 0 | f[a + 116 >> 2], a = a + 112 | 0, 0 | b && (f[b + 112 >> 2] = f[a >> 2]), f[(0 == (0 | (a = 0 | f[a >> 2])) ? 23148 : a + 116 | 0) >> 2] = b);
  }
  function Wc(a) {
   for (db(205638, a = (a |= 0) >>> 0 < 4096 ? a : 4096); !((0 | a) >= 4096); ) d[205638 + (a << 1) >> 1] = 0 | d[205638 + (a + -1 << 1) >> 1], a = a + 1 | 0;
   f[10839] = j[106914];
  }
  function db(a, b) {
   (0 | Of(a |= 0, 2, b |= 0, 0 | f[10815])) >>> 0 < b >>> 0 && Xa(), 18761 == (0 | d[102818]) ^ (0 | Jf(4660)) << 16 >> 16 == 4660 || _f(a, a, b << 1);
  }
  function Df(a, c, d) {
   a |= 0, d |= 0;
   var e = 0;
   e = 255 & (c |= 0);
   do {
    if (!d) {
     c = 0;
     break;
    }
    c = a + (d = d + -1 | 0) | 0;
   } while ((0 | b[c >> 0]) != e << 24 >> 24);
   return 0 | c;
  }
  function Rf(a) {
   a |= 0;
   var c = 0;
   c = 0 | ke(0 | f[5745]), 0 | a && 0 | b[a >> 0] && (We(a, 0 | Ne(a), 1, 22792), Nf(58, 22792), Nf(32, 22792)), We(c, 0 | Ne(c), 1, 22792), Nf(10, 22792);
  }
  function Vd(a) {
   var b = 0, c = 0;
   return c = u, u = u + 16 | 0, b = c, a = 0 | Wd(a |= 0) ? -1 : 1 == (0 | La[7 & f[a + 32 >> 2]](a, b, 1)) ? 0 | h[b >> 0] : -1, u = c, 0 | a;
  }
  function Va(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   for (d = 0; ;) {
    if (c = a + d | 0, (0 | d) > 28) {
     c = 0;
     break;
    }
    if (!(0 | Zd(c, b, 4))) break;
    d = d + 1 | 0;
   }
   return 0 | c;
  }
  function og(a, b, c, d) {
   var e = 0, g = 0;
   return g = u, u = u + 16 | 0, e = 0 | g, ig(a |= 0, b |= 0, c |= 0, d |= 0, e), u = g, 0 | (I = 0 | f[e + 4 >> 2], 0 | f[e >> 2]);
  }
  function sb(a) {
   a |= 0;
   var b = 0, c = 0;
   for (b = 0; 4 != (0 | b); ) 0 | (c = 0 | f[a + 392 + (b << 2) >> 2]) && Bd(c), b = b + 1 | 0;
   Bd(0 | f[a + 472 >> 2]);
  }
  function lg(a, b, c, d) {
   b |= 0, d |= 0;
   var e = 0, f = 0;
   return e = a |= 0, f = c |= 0, c = 0 | kg(e, f), a = I, 0 | (I = (0 | X(b, f)) + (0 | X(d, e)) + a | 0 & a, 0 | c);
  }
  function Qf(a) {
   var b = 0, c = 0;
   return b = 4 + (a |= 0) | 0, (c = 0 | f[b >> 2]) >>> 0 < (0 | f[a + 8 >> 2]) >>> 0 ? (f[b >> 2] = c + 1, a = 0 | h[c >> 0]) : a = 0 | Vd(a), 0 | a;
  }
  function ob(a, b) {
   b |= 0;
   var c = 0;
   c = 0 | nb(28093 + (29 * (a = (a |= 0) >>> 0 < 2 ? a : 2) | 0) | 0), f[b >> 2] = c, a = 0 | nb(28180 + (180 * a | 0) | 0), f[b + 4 >> 2] = a;
  }
  function eg(a, b, c) {
   return a |= 0, b |= 0, (0 | (c |= 0)) < 32 ? (I = b >> c, a >>> c | (b & (1 << c) - 1) << 32 - c) : (I = (0 | b) < 0 ? -1 : 0, b >> c - 32 | 0);
  }
  function Za() {
   var a = 0, c = 0;
   return c = u, u = u + 16 | 0, a = c, d[a >> 1] = -1, Of(a, 1, 2, 0 | f[10815]), a = 0 | Ya(0 | b[a >> 0], 0 | b[a + 1 >> 0]), u = c, 0 | a;
  }
  function dg(a, b, c) {
   return a |= 0, b |= 0, (0 | (c |= 0)) < 32 ? (I = b << c | (a & (1 << c) - 1 << 32 - c) >>> 32 - c, a << c) : (I = a << c - 32, 0);
  }
  function Wa(a, c) {
   for (a |= 0, c |= 0; ;) {
    if (!(0 | b[a >> 0])) {
     a = 0;
     break;
    }
    if (!(0 | Se(a, c, 0 | Ne(c)))) break;
    a = a + 1 | 0;
   }
   return 0 | a;
  }
  function fg(a, b, c) {
   return a |= 0, b |= 0, (0 | (c |= 0)) < 32 ? (I = b >>> c, a >>> c | (b & (1 << c) - 1) << 32 - c) : (I = 0, b >>> c - 32 | 0);
  }
  function Re(a, b, c, d) {
   return b |= 0, c |= 0, d |= 0, c = u, u = u + 16 | 0, b = c, f[b >> 2] = d, d = 0 | be(0, 0, 29937, b), u = c, 0 | d;
  }
  function ag(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, d = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0, 0 | (I = d, a - c >>> 0 | 0);
  }
  function lf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   return d = u, u = u + 16 | 0, e = d, f[e >> 2] = c, c = 0 | mf(a, b, e), u = d, 0 | c;
  }
  function uf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   d = u, u = u + 16 | 0, f[(e = d) >> 2] = c, ce(a, b, e), u = d;
  }
  function kf(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   d = u, u = u + 16 | 0, f[(e = d) >> 2] = c, of(a, b, e), u = d;
  }
  function Ya(a, b) {
   var c = 0;
   return c = 255 & (a |= 0), a = 255 & (b |= 0), 65535 & (18761 == (0 | d[102818]) ? a << 8 | c : c << 8 | a) | 0;
  }
  function $d(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0;
   d = u, u = u + 16 | 0, f[(e = d) >> 2] = c, ae(a, b, e), u = d;
  }
  function bf(a) {
   a |= 0;
   var b = 0;
   return cf(), b = 0 | f[51407], f[a + 56 >> 2] = b, 0 | b && (f[b + 52 >> 2] = a), f[51407] = a, df(), 0 | a;
  }
  function bg(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, c = a + c >>> 0, 0 | (I = b + d + (c >>> 0 < a >>> 0 | 0) >>> 0, 0 | c);
  }
  function $a() {
   var a = 0, b = 0;
   return b = u, u = u + 16 | 0, a = b, f[a >> 2] = -1, Of(a, 1, 4, 0 | f[10815]), a = 0 | _a(a), u = b, 0 | a;
  }
  function Sf(a, b) {
   a |= 0, b |= 0;
   var c = 0, d = 0;
   c = u, u = u + 16 | 0, f[(d = c) >> 2] = b, ce(23160, a, d), u = c;
  }
  function ve(a, b) {
   return a |= 0, b |= 0, 0 | (0 | (b = b ? 0 | we(0 | f[b >> 2], 0 | f[b + 4 >> 2], a) : 0) ? b : a);
  }
  function nb(a) {
   a |= 0;
   var b = 0, c = 0;
   return b = u, u = u + 16 | 0, c = b, f[c >> 2] = a, a = 0 | mb(c), u = b, 0 | a;
  }
  function Oe(a, c) {
   return a |= 0, c |= 0, a = 0 | Pe(a, c), 0 | ((0 | b[a >> 0]) == (255 & c) << 24 >> 24 ? a : 0);
  }
  function Be(a, b) {
   var c = 0;
   return 0 | (0 == (0 | (c = 0 | le(a |= 0, 0, b |= 0))) ? b : c - a | 0);
  }
  function We(a, b, c, d) {
   d |= 0, ye(a |= 0, c = 0 | X(c |= 0, b |= 0), d);
  }
  function pg(a) {
   return (255 & (a |= 0)) << 24 | (a >> 8 & 255) << 16 | (a >> 16 & 255) << 8 | a >>> 24 | 0;
  }
  function pe(a) {
   a = +a;
   var b = 0;
   return p[s >> 3] = a, b = 0 | f[s >> 2], I = 0 | f[s + 4 >> 2], 0 | b;
  }
  function Le(a) {
   a = +a;
   var b = 0;
   return p[s >> 3] = a, b = 0 | f[s >> 2], I = 0 | f[s + 4 >> 2], 0 | b;
  }
  function xe(a, b) {
   b |= 0;
   var c = 0;
   return c = 0 | pg(0 | (a |= 0)), 0 | (0 == (0 | b) ? a : c);
  }
  function ee(a, b, c) {
   b |= 0, c |= 0, 32 & f[(a |= 0) >> 2] || ye(b, c, a);
  }
  function ab(a) {
   return a |= 0, 0 | (a = 3 == (0 | a) ? 65535 & (0 | Za()) : 0 | $a());
  }
  function jg(a, b, c, d) {
   return a |= 0, b |= 0, c |= 0, d |= 0, 0 | ig(a, b, c, d, 0);
  }
  function Kd(a) {
   return (a |= 0) >>> 0 > 4294963200 && (f[5745] = 0 - a, a = -1), 0 | a;
  }
  function ne(a, b) {
   return a |= 0, b |= 0, 0 | (a = a ? 0 | se(a, b) : 0);
  }
  function ae(a, b, c) {
   be(a |= 0, 2147483647, b |= 0, c |= 0);
  }
  function rf(a) {
   return a |= 0, 1 & (a = a ? 0 == (0 | f[a >> 2]) : 1) | 0;
  }
  function Pd(a) {
   return 0 | (0 == (0 | Qd(a |= 0)) ? a : 32 | a);
  }
  function Zf(a, b) {
   return a |= 0, b |= 0, Te(a + (0 | Ne(a)) | 0, b), 0 | a;
  }
  function Gf(a, b, c) {
   return a |= 0, b |= 0, c |= 0, Hf(a, b, c), 0 | a;
  }
  function Ud(a) {
   return 1 & (32 == (0 | (a |= 0)) | (a + -9 | 0) >>> 0 < 5) | 0;
  }
  function Cf(a, b) {
   return a |= 0, b |= 0, 0 | Df(a, b, 1 + (0 | Ne(a)) | 0);
  }
  function vf(a, b, c) {
   return a |= 0, b |= 0, c |= 0, 0 | wf(a, b, c);
  }
  function tf(a, b, c) {
   return a |= 0, b |= 0, c |= 0, 0 | vf(a, b, c);
  }
  function vg(a, b, c) {
   return $(1), 0;
  }
  function qg(a) {
   return (255 & (a |= 0)) << 8 | a >> 8 & 255 | 0;
  }
  function Te(a, b) {
   return a |= 0, b |= 0, Ue(a, b), 0 | a;
  }
  function jf(a) {
   return a |= 0, (0 | f[a >> 2]) >>> 4 & 1 | 0;
  }
  function bb(a) {
   return a |= 0, f[s >> 2] = a, + +n[s >> 2];
  }
  function Qd(a) {
   return ((a |= 0) - 65 | 0) >>> 0 < 26 | 0;
  }
  function ue(a, b) {
   return a |= 0, b |= 0, 0 | ve(a, b);
  }
  function qe(a, b) {
   return a = +a, b |= 0, + +re(a, b);
  }
  function Je(a, b) {
   return a = +a, b |= 0, + +Ge(a, b);
  }
  function ke(a) {
   return a |= 0, 0 | te(a, 0 | f[5776]);
  }
  function Ie(a, b) {
   return a = +a, b = +b, + +Ke(a, b);
  }
  function He(a, b) {
   return a = +a, b = +b, + +Xd(a, b);
  }
  function Ve(a) {
   return a |= 0, + +Ge(1, a);
  }
  function Kf(a) {
   return a |= 0, 0 | qg(0 | a);
  }
  function Ff(a) {
   return a |= 0, 0 | pg(0 | a);
  }
  function Wf(a) {
   return a |= 0, + +Xf(a);
  }
  function Vf(a) {
   return a |= 0, + +Wf(a);
  }
  function Pf(a) {
   return a |= 0, 0 | Lf(a);
  }
  function Lf(a) {
   return a |= 0, 0 | Mf(a);
  }
  function Jf(a) {
   return a |= 0, 0 | Kf(a);
  }
  function Ef(a) {
   return a |= 0, 0 | Ff(a);
  }
  function Md(a) {
   return 0 | (a |= 0);
  }
  function df() {
   va(205620);
  }
  function cf() {
   ya(205620);
  }
  function wg() {
   $(2);
  }
  var a = global.Int8Array, b = new a(buffer), c = global.Int16Array, d = new c(buffer), e = global.Int32Array, f = new e(buffer), g = global.Uint8Array, h = new g(buffer), i = global.Uint16Array, j = new i(buffer), k = global.Uint32Array, l = new k(buffer), m = global.Float32Array, n = new m(buffer), o = global.Float64Array, p = new o(buffer), q = global.byteLength, r = 0 | env.DYNAMICTOP_PTR, s = 0 | env.tempDoublePtr, u = 0 | env.STACKTOP, v = 0 | env.STACK_MAX, w = 0 | env.cttz_i8, x = 0, y = 0, B = global.NaN, C = global.Infinity, I = 0, K = global.Math.abs, L = global.Math.sqrt, M = global.Math.pow, N = global.Math.cos, U = global.Math.exp, V = global.Math.log, X = global.Math.imul, _ = global.Math.clz32, $ = env.abort, ba = env.enlargeMemory, ca = env.getTotalMemory, da = env.abortOnCannotGrowMemory, ha = env.___syscall221, ka = env._ctime, la = env._llvm_exp2_f64, pa = env.___setErrNo, qa = env._emscripten_memcpy_big, ra = env._mktime, sa = env._abort, ua = env.___syscall54, va = env.___unlock, xa = env.___syscall10, ya = env.___lock, Aa = env.___syscall6, Ba = env.___syscall5, Ca = env.___clock_gettime, Ea = env.___syscall140, Fa = env._localtime, Ga = env.___syscall145, Ha = env.___syscall146, Ka = [ function(a) {
   return $(0), 0;
  }, function(a) {
   var b = 0, c = 0;
   return b = u, u = u + 16 | 0, c = b, a = 0 | Md(0 | f[60 + (a |= 0) >> 2]), f[c >> 2] = a, a = 0 | Kd(0 | Aa(6, 0 | c)), u = b, 0 | a;
  } ], La = [ vg, Id, function(a, b, c) {
   a |= 0, b |= 0, c |= 0;
   var d = 0, e = 0, g = 0;
   return e = u, u = u + 32 | 0, g = e, d = e + 20 | 0, f[g >> 2] = f[a + 60 >> 2], f[g + 4 >> 2] = 0, f[g + 8 >> 2] = b, f[g + 12 >> 2] = d, f[g + 16 >> 2] = c, (0 | Kd(0 | Ea(140, 0 | g))) < 0 ? (f[d >> 2] = -1, a = -1) : a = 0 | f[d >> 2], u = e, 0 | a;
  }, function(a, c, d) {
   c |= 0, d |= 0;
   var e = 0, g = 0;
   return g = u, u = u + 32 | 0, e = g, f[36 + (a |= 0) >> 2] = 1, 64 & f[a >> 2] || (f[e >> 2] = f[a + 60 >> 2], f[e + 4 >> 2] = 21523, f[e + 8 >> 2] = g + 16, 0 | ua(54, 0 | e) && (b[a + 75 >> 0] = -1)), e = 0 | Id(a, c, d), u = g, 0 | e;
  }, function(a, b, c) {
   b |= 0, c |= 0;
   var d = 0, e = 0;
   return d = 20 + (a |= 0) | 0, e = 0 | f[d >> 2], a = (0 | f[a + 16 >> 2]) - e | 0, a = a >>> 0 > c >>> 0 ? c : a, gg(0 | e, 0 | b, 0 | a), f[d >> 2] = (0 | f[d >> 2]) + a, 0 | c;
  }, function(a, c, d) {
   a |= 0, c |= 0, d |= 0;
   var e = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0;
   return k = u, u = u + 32 | 0, e = k, i = k + 16 | 0, f[i >> 2] = c, g = i + 4 | 0, j = a + 48 | 0, l = 0 | f[j >> 2], f[g >> 2] = d - (0 != (0 | l) & 1), h = a + 44 | 0, f[i + 8 >> 2] = f[h >> 2], f[i + 12 >> 2] = l, f[e >> 2] = f[a + 60 >> 2], f[e + 4 >> 2] = i, f[e + 8 >> 2] = 2, (0 | (e = 0 | Kd(0 | Ga(145, 0 | e)))) < 1 ? f[a >> 2] = f[a >> 2] | 48 & e ^ 16 : e >>> 0 > (i = 0 | f[g >> 2]) >>> 0 && (g = 0 | f[h >> 2], f[(h = a + 4 | 0) >> 2] = g, f[a + 8 >> 2] = g + (e - i), 0 | f[j >> 2] ? (f[h >> 2] = g + 1, b[c + (d + -1) >> 0] = 0 | b[g >> 0], e = d) : e = d), u = k, 0 | e;
  }, function(a, b, c) {
   return a |= 0, b |= 0, c |= 0, 0 | sf(a, b, c);
  }, vg ], Ma = [ wg, function() {
   var a = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0;
   for (l = u, u = u + 1120 | 0, k = (i = l) + 1120 | 0, e = 0, g = 0, a = 0 | d[168355]; !((0 | g) >= (65535 & a | 0)); ) {
    for ((0 | Of(i, 1, 1120, 0 | f[10815])) >>> 0 < 1120 && Xa(), a = (0 | f[10837]) + ((0 | X(0 | j[168359], e)) << 1) | 0, c = i; !(c >>> 0 >= k >>> 0); ) m = c + 1 | 0, d[a >> 1] = (0 | h[m >> 0]) >>> 6 | (0 | h[c >> 0]) << 2, d[a + 2 >> 1] = (0 | h[m >> 0]) >>> 4 & 3 | (0 | h[c + 2 >> 0]) << 2, d[a + 4 >> 1] = (0 | h[m >> 0]) >>> 2 & 3 | (0 | h[c + 3 >> 0]) << 2, d[a + 6 >> 1] = 3 & b[m >> 0] | (0 | h[c + 4 >> 0]) << 2, m = c + 9 | 0, d[a + 8 >> 1] = 3 & b[m >> 0] | (0 | h[c + 5 >> 0]) << 2, d[a + 10 >> 1] = (0 | h[m >> 0]) >>> 2 & 3 | (0 | h[c + 6 >> 0]) << 2, d[a + 12 >> 1] = (0 | h[m >> 0]) >>> 4 & 3 | (0 | h[c + 7 >> 0]) << 2, d[a + 14 >> 1] = (0 | h[m >> 0]) >>> 6 | (0 | h[c + 8 >> 0]) << 2, a = a + 16 | 0, c = c + 10 | 0;
    e = (0 | (m = e + 2 | 0)) > (65535 & (a = 0 | d[168355]) | 0) ? 1 : m, g = g + 1 | 0;
   }
   u = l;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   for (t = u, u = u + 272 | 0, s = t + 264 | 0, p = t + 8 | 0, q = t, ob(0 | f[10844], s), (r = 0 != (0 | (a = 0 | pb()))) || (f[10839] = 1023), o = 0 | X(0 | j[168360], a), tf(0 | f[10815], 540 + ((0 | X(o, 0 | j[168359])) / 4 | 0) | 0, 0), f[10843] = 1, lb(-1, 0), o = q + 4 | 0, b = 0, n = 0, c = 0; ;) {
    if ((0 | (a = 0 | j[168360])) <= (0 | n)) {
     a = 0;
     break;
    }
    for (h = 0 | j[168359], k = (0 | f[10837]) + ((0 | X(h, n)) << 1) | 0, i = (0 | X(h, (0 | (i = a - n | 0)) < 8 ? i : 8)) >> 6, h = 0; !((0 | h) >= (0 | i)); ) {
     for (cg(0 | p, 0, 256), a = 0; !((0 | a) >= 64 || (e = 0 | f[s + (((0 | a) > 0 & 1) << 2) >> 2], e = 0 | lb(0 | j[e >> 1], e + 2 | 0), 0 != (0 | a) & 0 == (0 | e))); ) 255 != (0 | e) && (a = (e >> 4) + a | 0, (e &= 15) && (g = 0 | lb(e, 0), (0 | a) < 64 && (f[p + (a << 2) >> 2] = g - (0 == (g & 1 << e + -1 | 0) ? (1 << e) - 1 | 0 : 0)))), a = a + 1 | 0;
     for (c = (0 | f[p >> 2]) + c | 0, f[p >> 2] = c, g = h << 6, a = b, e = 0; 64 != (0 | e); ) (0 | a) % (0 | j[168359]) | 0 || (f[o >> 2] = 512, f[q >> 2] = 512), m = (0 | f[(l = q + ((1 & e) << 2) | 0) >> 2]) + (0 | f[p + (e << 2) >> 2]) | 0, f[l >> 2] = m, d[k + (e + g << 1) >> 1] = m, 64512 & m | 0 && Xa(), a = a + 1 | 0, e = e + 1 | 0;
     h = h + 1 | 0, b = b + 64 | 0;
    }
    if (r) {
     for (m = 0 | Pf(0 | f[10815]), tf(0 | f[10815], 26 + ((0 | X(0 | j[168359], n)) / 4 | 0) | 0, 0), l = 0, a = 0 | d[168359]; e = 0 | f[10815], !((0 | l) >= ((65535 & a) << 1 | 0)); ) {
      for (h = 0 | Qf(e), i = (a = 0 | d[168359]) << 16 >> 16 == 2672, e = 0, g = k; !((0 | e) >= 8); ) v = (0 | j[g >> 1]) << 2 | h >> e & 3, d[g >> 1] = i & v >>> 0 < 512 ? v + 2 | 0 : v, e = e + 2 | 0, g = g + 2 | 0;
      k = k + 8 | 0, l = l + 1 | 0;
     }
     tf(e, m, 0);
    }
    n = n + 8 | 0;
   }
   for (;2 != (0 | a); ) Bd(0 | f[s + (a << 2) >> 2]), a = a + 1 | 0;
   u = t;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   if (r = u, u = u + 480 | 0, o = r, 0 | rb(o, 0)) {
    for (p = 0 | X(0 | f[o + 16 >> 2], 0 | f[o + 12 >> 2]), q = o + 8 | 0, e = 0, a = 0, n = 0; !((0 | n) >= (0 | f[q >> 2])); ) {
     for (b = 0 | ub(n, o), 1 & f[10846] && (a = (0 | n) / 2 | 0, 1 & n && (a = (0 | j[168355]) + ~a | 0)), h = 0 | f[10837], i = 0 | X(n, p), k = 0 | j[168360], l = 65535 & (m = 0 | d[168359]), m = m << 16 >> 16 == 3984, g = 0; !((0 | g) >= (0 | p)); ) (c = 0 | d[168361]) << 16 >> 16 && (v = g + i | 0, t = 0 | X(e = 0 | j[168362], k), e = ((0 | (c = v - (0 | X(s = (a = (0 | (s = (0 | v) / (0 | t) | 0)) >= (0 | (c &= 65535))) ? c : s, t)) | 0)) % (0 | (a = 0 | j[336722 + ((a ? 2 : 1) << 1) >> 1])) | 0) + (0 | X(s, e)) | 0, a = (0 | c) / (0 | a) | 0), c = (((v = (0 | e) < 2) & m) << 31 >> 31) + a | 0, a = m ? e + -2 + (v ? l : 0) | 0 : e, c >>> 0 < k >>> 0 && (v = h + ((0 | X(c, l)) + a << 1) | 0, d[v >> 1] = 0 | d[205638 + ((0 | j[b >> 1]) << 1) >> 1]), b = b + 2 | 0, g = g + 1 | 0, e = (a = (0 | (e = a + 1 | 0)) < (0 | l)) ? e : 0, a = (1 & (1 ^ a)) + c | 0;
     n = n + 1 | 0;
    }
    sb(o);
   }
   u = r;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0;
   for (g = u, u = u + 48 | 0, b = g, tf(0 | f[10815], 200896, 0), tf(e = 0 | f[10815], ((0 | Qf(e)) << 2) - 1 | 0, 1), d[102818] = 19789, e = 0 | $a(), tf(0 | f[10815], 164600, 0), Of(b, 1, 40, 0 | f[10815]), oc(b, 10, 1, e), a = 26; c = a + -1 | 0, !(a >>> 0 <= 22); ) e = 0 | h[b + c >> 0] | e << 8, a = c;
   for (tf(0 | f[10815], 0 | f[10960], 0), b = 0; !(b >>> 0 >= (0 | j[168360]) >>> 0); ) {
    for (i = 0 | j[168359], (i = 0 | Of(c = (0 | f[10837]) + ((0 | X(i, b)) << 1) | 0, 2, i, 0 | f[10815])) >>> 0 < (65535 & (a = 0 | d[168359])) >>> 0 && (Xa(), a = 0 | d[168359]), oc(c, (65535 & a) >>> 1 & 65535, 0 == (0 | b) & 1, e), a = 0; !(a >>> 0 >= (0 | j[168359]) >>> 0); ) i = 0 | Jf(0 | d[(k = c + (a << 1) | 0) >> 1]), d[k >> 1] = i, (65535 & i) >= 16384 && Xa(), a = a + 1 | 0;
    b = b + 1 | 0;
   }
   f[10839] = 16368, u = g;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0;
   for (k = 0 | Cd(65535 & (a = 0 | d[168359]), 1), i = 0; !(i >>> 0 >= (0 | j[168360]) >>> 0); ) {
    for ((g = 0 | Of(k, 1, 65535 & a, 0 | f[10815])) >>> 0 < (65535 & (a = 0 | d[168359])) >>> 0 && (Xa(), a = 0 | d[168359]), c = 0 | f[10837], g = 0 | X(e = 65535 & a, i), b = 0; (0 | b) != (0 | e); ) d[c + (g + b << 1) >> 1] = 0 | d[205638 + ((0 | h[k + b >> 0]) << 1) >> 1], b = b + 1 | 0;
    i = i + 1 | 0;
   }
   Bd(k), f[10839] = j[103074];
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
   for (r = u, u = u + 16 | 0, q = r, a = 0; 2 != (0 | a); ) p = 0 | nb(29313 + (26 * a | 0) | 0), f[q + (a << 2) >> 2] = p, a = a + 1 | 0;
   for (p = (o = 0 | Ad(((c = (63 + (0 | j[168360]) | 0) >>> 5) << 2) + (p = (0 | j[168359]) << 5) | 0)) + p | 0, d[102818] = 19789, a = 0; ;) {
    if ((0 | a) == (0 | c)) {
     a = 0, n = 0;
     break;
    }
    n = 0 | $a(), f[p + (a << 2) >> 2] = n, a = a + 1 | 0;
   }
   for (;!((0 | n) >= (0 | j[168360])); ) {
    for (31 & n || (tf(0 | f[10815], 0 | f[p + (n >> 5 << 2) >> 2], 0), lb(-1, 0), a = 0), m = 0, c = 0 | d[168359]; c &= 65535, !((0 | m) >= (0 | c)); ) k = a + -2 | 0, i = a - c | 0, g = (e = 0 != (0 | (l = m + n & 1))) ? a - (c << 1) | 0 : i + 1 | 0, c = (0 | (e = (i = (0 | m) > 1 & (0 | (c = (0 | (c = (0 | m) > (0 | l) ? e ? k : i + -1 | 0 : -1)) < 0 ? g : c)) < 0) ? k : c)) < 0 ? 0 : ((0 | h[o + (i ? k : (0 | g) < 0 ? c : g) >> 0]) + (0 | h[o + e >> 0]) | 0) >>> 1, c = (0 | tb(0 | f[q + (l << 2) >> 2])) + c | 0, b[o + a >> 0] = c, c >>> 0 > 255 && Xa(), l = 0 | d[168359], k = (0 | f[10837]) + ((0 | X(65535 & l, n)) + m << 1) | 0, d[k >> 1] = 0 | d[205638 + ((255 & c) << 1) >> 1], m = m + 1 | 0, a = a + 1 | 0, c = l;
    n = n + 1 | 0;
   }
   for (Bd(o), a = 0; 2 != (0 | a); ) Bd(0 | f[q + (a << 2) >> 2]), a = a + 1 | 0;
   u = r;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (n = ((n = (m = 0 | X(0 | j[168359], 0 | f[10958])) >>> 3) & (c = 0 | f[10846]) >>> 7) + n | 0, k = 8 + (24 & c) | 0, l = (1 + (65535 & (a = 0 | d[168360])) | 0) >>> 1, m = m - (n << 3) | 0, n = -2048 & (0 | X(0 == (1 & c | 0) ? n : (n << 4 >>> 0) / 15 | 0, 0 - l | 0)), c = 0, i = 0, e = 0, g = 0; !((0 | i) >= (65535 & a | 0)); ) {
    a = 0 | f[10846];
    do {
     if (2 & a) {
      if (b = (((0 | i) % (0 | l) | 0) << 1) + ((0 | i) / (0 | l) | 0) | 0, !(0 == (4 & a | 0) | 1 != (0 | b))) {
       if (a = 0 | f[10815], 0 | f[10844]) {
        tf(a, (0 | f[10960]) - n | 0, 0), b = 1, a = 0;
        break;
       }
       tf(a, 0, 2), tf(b = 0 | f[10815], (0 | Pf(b)) >> 3 << 2, 0), b = 1, a = 0;
       break;
      }
      a = c;
     } else b = i, a = c;
    } while (0);
    for (h = 0; !((0 | h) >= (0 | j[168359])); ) {
     for (a = a - (0 | f[10958]) | 0; !((0 | a) >= 0); ) {
      for (e = 0 | dg(0 | e, 0 | g, 0 | k), c = 0, g = I; !((0 | c) >= (0 | k)); ) o = (0 | Qf(0 | f[10815])) << c | e, c = c + 8 | 0, e = o;
      a = a + k | 0;
     }
     p = 0 | fg(0 | (c = 0 | dg(0 | e, 0 | g, (p = 64 - (0 | f[10958]) | 0) - a | 0)), 0 | I, 0 | p), c = 0 | X(0 | j[168359], b), o = 0 | f[10846], d[(0 | f[10837]) + ((o >>> 6 & 1 ^ h) + c << 1) >> 1] = p, 9 == (0 | (0 | h) % 10) & 0 != (1 & o | 0) && 0 | Qf(0 | f[10815]) && (0 | b) < ((0 | j[102816]) + (0 | j[168355]) | 0) && (0 | h) < ((0 | j[102817]) + (0 | j[168356]) | 0) && Xa(), h = h + 1 | 0;
    }
    c = m + a | 0, i = i + 1 | 0, a = 0 | d[168360];
   }
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   for (t = u, u = u + 16 | 0, f[(s = t) >> 2] = 0, f[s + 4 >> 2] = 0, f[s + 8 >> 2] = 0, f[s + 12 >> 2] = 0, q = 18761 == (0 | d[102818]) ? 3 : 0, o = (n = 0 | Ad((r = (1 + (5 * (0 | j[168359]) | 0) | 0) >>> 2) << 1)) + r | 0, m = 0; !((0 | m) >= (0 | j[168360])); ) {
    for ((0 | Of(o, 1, r, 0 | f[10815])) >>> 0 < r >>> 0 ? (Xa(), a = 0) : a = 0; (0 | a) != (0 | r); ) b[n + a >> 0] = 0 | b[n + ((a ^ q) + r) >> 0], a = a + 1 | 0;
    for (g = 0 | f[10837], k = 0 | X(i = 0 | j[168359], m), a = 0, c = n; !((0 | a) >= (0 | i)); ) {
     for (l = c + 4 | 0, e = 0; 4 != (0 | e); ) d[g + (e + a + k << 1) >> 1] = (0 | h[l >> 0]) >>> (e << 1) & 3 | h[c + e >> 0] << 2, e = e + 1 | 0;
     a = a + 4 | 0, c = c + 5 | 0;
    }
    m = m + 1 | 0;
   }
   if (Bd(n), f[10839] = 1023, !(0 | Yd(43072, 29042))) {
    for (i = (0 | j[168360]) >>> 1 & 65535, c = (0 | j[168356]) - 1 | 0, e = 0 | f[10837], g = 0 | X(a = 0 | j[168359], i), i = 0 | X(a, i + 1 | 0), a = 0; !((0 | a) >= (0 | c)); ) r = a + 1 | 0, v = +(0 | X(q = (0 | j[e + (a + g << 1) >> 1]) - (0 | j[e + (r + i << 1) >> 1]) | 0, q)), p[(o = s + ((q = 1 & a) << 3) | 0) >> 3] = +p[o >> 3] + v, v = +(0 | X(o = (0 | j[e + (a + i << 1) >> 1]) - (0 | j[e + (r + g << 1) >> 1]) | 0, o)), p[(q = s + ((1 ^ q) << 3) | 0) >> 3] = +p[q >> 3] + v, a = r;
    +p[s + 8 >> 3] > +p[s >> 3] && (f[10812] = 1263225675);
   }
   u = t;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
   for (p = u, u = u + 16 | 0, l = p + 8 | 0, m = p, Yb(0), n = m + 4 | 0, o = l + 4 | 0, a = 0, i = 0; (0 | i) < (0 | j[168355]); ) {
    for (k = 0; !((0 | k) >= (0 | j[168359])); ) (h = (0 | k) % 14 | 0) ? 2 == (0 | (0 | h) % 3) && (a = 4 >>> (3 - (0 | Yb(2)) | 0)) : (f[n >> 2] = 0, f[m >> 2] = 0, f[o >> 2] = 0, f[l >> 2] = 0), q = 0 == (0 | f[(b = m + ((g = 1 & h) << 2) | 0) >> 2]), e = 0 != (0 | (c = 0 | Yb(8))), g = l + (g << 2) | 0, q ? (f[b >> 2] = c, (0 | h) > 11 | e && (q = 0 | Yb(4) | c << 4, f[g >> 2] = q)) : e && (q = (0 | f[g >> 2]) - (128 << a) | 0, f[g >> 2] = ((4 == (0 | a) | (0 | q) < 0 ? ~(-1 << a) : -1) & q) + (c << a)), q = 0 | f[l + ((1 & k) << 2) >> 2], h = (0 | f[10837]) + ((0 | X(0 | j[168359], i)) + k << 1) | 0, d[h >> 1] = q, (65535 & q) >>> 0 > 4098 && (0 | k) < (0 | j[168356]) && Xa(), k = k + 1 | 0;
    i = i + 1 | 0;
   }
   u = p;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   if (0 | f[10837]) o = (o = 0 | f[10804]) >>> 0 < 4 ? o : 4, tf(0 | f[10815], (0 == (0 | o) ? 0 : (o << 2) - 4 | 0) + (0 | f[10960]) | 0, 0), tf(o = 0 | f[10815], 0 | $a(), 0), Sb(); else {
    for (e = 0 | Cd(0 | j[168359], 2), a = 0; 4 != (0 | a); ) {
     for (tf(0 | f[10815], (0 | f[10960]) + (a << 2) | 0, 0), tf(g = 0 | f[10815], 0 | $a(), 0), g = a >>> 1 & 1, h = 1 & a, b = 0; !(b >>> 0 >= (0 | j[168360]) >>> 0); ) {
      db(e, 0 | j[168359]), i = b - (0 | j[102816]) - g | 0;
      a: do {
       if (i >>> 0 < (0 | j[168355]) >>> 0) for (k = 0 | f[10822], l = 0 - (1 & b) & 3 ^ 1, m = 0 | j[168359], c = 0; ;) {
        if ((0 | c) == (0 | m)) break a;
        (n = c - (0 | j[102817]) - h | 0) >>> 0 < (o = 0 | j[168356]) >>> 0 && (o = k + ((0 | X(o, i)) + n << 3) + ((l ^ 1 & c) << 1) | 0, d[o >> 1] = 0 | d[e + (c << 1) >> 1]), c = c + 1 | 0;
       }
      } while (0);
      b = b + 1 | 0;
     }
     a = a + 1 | 0;
    }
    Bd(e), f[10980] = 1;
   }
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0;
   for (i = u, u = u + 65552 | 0, d[(h = i) >> 1] = 15, a = 0, c = 0; 18 != (0 | c); ) {
    for (g = 32768 >>> ((65535 & (e = 0 | d[24274 + (c << 1) >> 1])) >>> 8), b = 0; !((0 | b) >= (0 | g)); ) d[h + ((k = a + 1 | 0) << 1) >> 1] = e, b = b + 1 | 0, a = k;
    c = c + 1 | 0;
   }
   lb(-1, 0), b = 0, a = 0 | j[168359];
   a: for (;e = a + -1 | 0, a; ) for (c = 0; ;) {
    if (a = 0 | j[168360], (0 | c) > (0 | a)) {
     a = e;
     continue a;
    }
    a = (0 | c) == (0 | a) ? 1 : c, (b = (0 | tb(h)) + b | 0) >>> 0 > 4095 && Xa(), (0 | a) < (0 | j[168355]) && (k = (0 | f[10837]) + ((0 | X(0 | j[168359], a)) + e << 1) | 0, d[k >> 1] = b), c = a + 2 | 0;
   }
   u = i;
  }, function() {
   var a = 0, b = 0, c = 0;
   a: do {
    if (0 | f[10822]) for (b = 0; ;) {
     if (!((0 | b) < (0 | j[168355]))) break a;
     for (a = 0; c = 0 | j[168356], !((0 | a) >= (0 | c)); ) db((0 | f[10822]) + ((0 | X(c, b)) + a << 3) | 0, 3), a = a + 1 | 0;
     b = b + 1 | 0;
    }
   } while (0);
  }, Sb, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0;
   for (l = u, u = u + 2064 | 0, h = l + 12 | 0, k = l + 8 | 0, f[(b = i = l) >> 2] = 0, f[b + 4 >> 2] = 0, d[h >> 1] = 10, b = 0, a = 0; 14 != (0 | b); ) {
    for (e = 1024 >>> ((65535 & (g = 0 | d[24310 + (b << 1) >> 1])) >>> 8), c = 0; !((0 | c) >= (0 | e)); ) d[h + ((m = a + 1 | 0) << 1) >> 1] = g, c = c + 1 | 0, a = m;
    b = b + 1 | 0;
   }
   for (lb(-1, 0), e = 0; !((0 | e) >= (0 | j[168360])); ) {
    for (g = 1 & e, c = 0; !((0 | c) >= (0 | j[168359])); ) a = 0 | tb(h), b = k + ((1 & c) << 1) | 0, (0 | c) < 2 ? (a = (0 | j[(m = i + (g << 2) + (c << 1) | 0) >> 1]) + a & 65535, d[m >> 1] = a, d[k + (c << 1) >> 1] = a, a = 0 | d[b >> 1]) : (a = (0 | j[b >> 1]) + a & 65535, d[b >> 1] = a), m = (0 | f[10837]) + ((0 | X(0 | j[168359], e)) + c << 1) | 0, d[m >> 1] = a, (65535 & a) >>> (0 | f[10958]) | 0 && Xa(), c = c + 1 | 0;
    e = e + 1 | 0;
   }
   u = l;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0;
   for (s = u, u = u + 32 | 0, p = s + 16 | 0, q = s, d[102818] = 18761, o = 0; k = 0 | j[168360], !((0 | o) >= (0 | k)); ) {
    for (tf(0 | f[10815], (0 | f[10979]) + (o << 2) | 0, 0), a = 0 | f[10815], b = 0 | f[10960], tf(a, (0 | $a()) + b | 0, 0), Ob(-1, 0), b = (0 | o) < 2 ? 7 : 4, a = 0; ;) {
     if (4 == (0 | a)) {
      n = 0;
      break;
     }
     f[q + (a << 2) >> 2] = b, a = a + 1 | 0;
    }
    for (;!((0 | n) >= (0 | j[168359])); ) {
     for (e = 0 | Ob(1, 0), a = 0; ;) {
      if (4 == (0 | a)) {
       a = 0;
       break;
      }
      m = 0 | Ob(2, 0), f[p + (a << 2) >> 2] = m, a = a + 1 | 0;
     }
     for (;4 != (0 | a); ) {
      switch (c = q + (a << 2) | 0, 0 | f[p + (a << 2) >> 2]) {
      case 3:
       b = 0 | Ob(4, 0), r = 17;
       break;

      case 2:
       b = (0 | f[c >> 2]) - 1 | 0, r = 17;
       break;

      case 1:
       b = 1 + (0 | f[c >> 2]) | 0, r = 17;
      }
      17 == (0 | r) && (r = 0, f[c >> 2] = b), a = a + 1 | 0;
     }
     for (g = 0 == (0 | e), h = 0 == (0 | n), e = 0; !((0 | e) >= 16); ) i = 32 - (k = 0 | f[q + ((e << 1 & 2 | e >> 3) << 2) >> 2]) | 0, i = (0 | Ob(k, 0)) << i >> i, k = e + n | 0, l = 0 | f[10837], m = 0 | X(a = 0 | j[168359], o), c = -2 | e, g ? h ? a = 128 : (b = m, a = c + n | 0, r = 24) : (b = 0 | X(a, (1 ^ c) + o | 0), a = k, r = 24), 24 == (0 | r) && (r = 0, a = 0 | j[l + (b + a << 1) >> 1]), d[l + (m + k << 1) >> 1] = a + i, e = 14 == (0 | e) ? 1 : e + 2 | 0;
     n = n + 16 | 0;
    }
    o = o + 1 | 0;
   }
   for (c = 0 | f[10837], i = (e = 0 | j[168359]) - 1 | 0, a = 0; !((0 | a) >= (k + -1 | 0)); ) {
    for (g = 0 | X(e, a), h = 0 | X(e, 1 | a), b = 0; !((0 | b) >= (0 | i)); ) r = c + (g + (1 | b) << 1) | 0, q = (0 | j[(p = c + (h + b << 1) | 0) >> 1]) + (0 | j[r >> 1]) | 0, d[r >> 1] = q, q = q - (0 | j[p >> 1]) | 0, d[p >> 1] = q, d[r >> 1] = (0 | j[r >> 1]) - q, b = b + 2 | 0;
    a = a + 2 | 0;
   }
   u = s;
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;
   for (D = u, u = u + 32 | 0, t = D + 16 | 0, v = D + 8 | 0, y = D, d[102818] = 18761, tf(0 | f[10815], 9, 1), x = 0 | Qf(0 | f[10815]), Za(), A = 65535 & (0 | Za()), B = 4 & x, w = 0 == (2 & x | 0), x = 0 == (1 & x | 0), s = 0; !((0 | s) >= (0 | j[168360])); ) {
    for (tf(z = 0 | f[10815], (c = 0 | f[10960]) - (0 | Pf(z)) & 15, 1), Ob(-1, 0), c = (z = (0 | s) < 2) ? 7 : 4, a = 0; 6 != (0 | a); ) d[t + (a << 1) >> 1] = c, a = a + 1 | 0;
    for (p = (e = 0 | f[10837]) + (1 - (r = (q = 1 & s) << 1) + (0 | X(c = 65535 & (a = 0 | d[168359]), s + -1 | 0)) << 1) | 0, f[y + (q << 2) >> 2] = p, c = e + ((0 | X(c, s + -2 | 0)) << 1) | 0, f[y + ((1 ^ q) << 2) >> 2] = c, c = 0, e = 7, p = 0; !((15 | p) >= (65535 & a | 0)); ) {
     do {
      if (!(48 & p | B)) {
       if ((0 | (a = 0 | Ob(2, 0))) < 3) {
        c = c + -50 + (0 | b[29365 + a >> 0]) | 0;
        break;
       }
       c = 0 | Ob(12, 0);
       break;
      }
     } while (0);
     a = 0 | Ob(1, 0), w ? a || (e = 0 | Ob(3, 0)) : e = 7 - (a << 2) | 0, x ? 0 | Ob(1, 0) || (a = 0, C = 18) : (a = 0, C = 18);
     a: do {
      if (18 == (0 | C)) {
       for (;;) {
        if (C = 0, 4 == (0 | a)) {
         g = 0;
         break;
        }
        C = 65535 & (0 | Ob(2, 0)), d[v + (a << 1) >> 1] = C, a = a + 1 | 0, C = 18;
       }
       for (;;) {
        if (4 == (0 | g)) break a;
        k = t + ((h = ((1 & g | r) >>> 0) % 3 | 0) << 2) | 0, n = 65535 & (a = (65535 & (a = 0 | d[(i = v + (g << 1) | 0) >> 1])) < 3 ? (0 | j[k >> 1]) - 49 + (0 | b[29369 + (65535 & a) >> 0]) | 0 : 0 | Ob(4, 0)), d[i >> 1] = n, o = t + (h << 2) + 2 | 0, d[k >> 1] = 0 | d[o >> 1], d[o >> 1] = n, g = g + 1 | 0;
       }
      }
     } while (0);
     for (o = z | 7 == (0 | e), i = 0 == (0 | p), k = p + -2 | 0, l = c << 1 | 1, m = 29373 + e | 0, n = 29381 + e | 0, g = 0; 16 != (0 | g); ) a = 1 & (h = (g >> 3 ^ q ^ g << 1 & 14) + p | 0), o ? i ? a = A : (a = (0 | f[10837]) + ((0 | X(0 | j[168359], s)) + (a | k) << 1) | 0, a = 0 | j[a >> 1]) : (E = 0 | f[y + (a << 2) >> 2], a = h + -52 | 0, a = (1 + (0 | j[E + ((0 | b[m >> 0]) + a << 1) >> 1]) + (0 | j[E + ((0 | b[n >> 0]) + a << 1) >> 1]) | 0) >>> 1), F = 0 | Ob(E = 0 | j[v + (g >> 2 << 1) >> 1], 0), a = a + c + (0 | X(F - (0 == (F >> E + -1 | 0) ? 0 : 1 << E) | 0, l)) & 65535, E = (0 | f[10837]) + ((0 | X(0 | j[168359], s)) + h << 1) | 0, d[E >> 1] = a, g = g + 1 | 0;
     p = p + 16 | 0, a = 0 | d[168359];
    }
    s = s + 1 | 0;
   }
   u = D;
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0;
   for (w = u, u = u + 32 | 0, t = w, v = 0 | Ad(1 + (65535 & (a = 0 | d[168359])) | 0), s = 0; !((0 | s) >= (0 | j[168355])); ) {
    for (Of(v, 1, 65535 & a, 0 | f[10815]), q = (r = 65535 & (a = 0 | d[168359])) - 30 | 0, r = 0 | X(r, s), o = v, p = 0; !((0 | p) >= (0 | q)); ) {
     for (c = (g = 2047 & (e = 0 | _a(o))) - (n = e >>> 11 & 2047) | 0, m = 0; !((0 | m) > 3 | (128 << m | 0) > (0 | c)); ) m = m + 1 | 0;
     for (l = e >>> 22 & 15, k = e >>> 26 & 15, h = 65535 & g, i = 65535 & n, g = 0, c = 30; 16 != (0 | g); ) {
      e = t + (g << 1) | 0;
      do {
       if ((0 | g) != (0 | l)) {
        if ((0 | g) == (0 | k)) {
         d[e >> 1] = i;
         break;
        }
        x = (((65535 & (0 | Ya(0 | b[(x = o + (c >> 3) | 0) >> 0], 0 | b[x + 1 >> 0]))) >>> (7 & c) & 127) << m) + n | 0, d[e >> 1] = (63488 & x) >>> 0 > 2047 ? 2047 : 65535 & x, c = c + 7 | 0;
        break;
       }
       d[e >> 1] = h;
      } while (0);
      g = g + 1 | 0;
     }
     for (g = 0 | f[10837], c = 0, e = p; 16 != (0 | c); ) d[g + (r + e << 1) >> 1] = (0 | j[205638 + ((0 | j[t + (c << 1) >> 1]) << 1 << 1) >> 1]) >>> 2, c = c + 1 | 0, e = e + 2 | 0;
     o = o + 16 | 0, p = (x = p + 32 | 0) - (1 & x | 0 ? 1 : 31) | 0;
    }
    s = s + 1 | 0;
   }
   Bd(v), u = w;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0;
   w = u, u = u + 8224 | 0, v = w, d[(t = w + 24 | 0) >> 1] = 3084, b = 0, a = 12;
   a: for (;g = a + -1 | 0, a; ) for (h = 2048 >>> g, e = 65535 & (a << 8 | g), c = 0, a = b; ;) {
    if ((0 | c) >= (0 | h)) {
     b = a, a = g;
     continue a;
    }
    d[t + ((s = a + 1 | 0) << 1) >> 1] = e, c = c + 1 | 0, a = s;
   }
   for (tf(0 | f[10815], 7, 1), lb(-1, 0), p = 0; !((0 | p) >= (0 | j[168355])); ) {
    for (f[v >> 2] = 0, f[v + 4 >> 2] = 0, f[v + 8 >> 2] = 0, f[v + 12 >> 2] = 0, f[v + 16 >> 2] = 0, f[v + 20 >> 2] = 0, r = (0 | p) < 2, s = p + -2 | 0, q = 0; !((0 | q) >= (0 | j[168359])); ) {
     for (g = v + (12 * (e = 1 & q) | 0) | 0, a = ((0 | (i = 0 | f[(h = v + (12 * e | 0) + 8 | 0) >> 2])) < 3 & 1) << 1, b = 65535 & f[g >> 2], c = a + 2 | 0; b >>> (c + a | 0); ) c = c + 1 | 0;
     if (b = 0 | lb(3, 0), o = 3 & b, 12 == (0 | (a = 0 | lb(12, t))) && (a = (0 | lb(16 - c | 0, 0)) >>> 1), m = a << c | 0 | lb(c, 0), f[g >> 2] = m, l = v + (12 * e | 0) + 4 | 0, k = 0 | f[l >> 2], n = (m ^ b << 29 >> 31) + k | 0, f[l >> 2] = (3 * n | 0) + k >> 5, f[h >> 2] = (0 | m) > 16 ? 0 : i + 1 | 0, (0 | q) < (0 | j[168356])) {
      b = (0 | q) < 2, l = 0 | f[10837], m = 0 | X(a = 0 | j[168359], p);
      do {
       if (r & b) a = 0; else {
        if (g = q + -2 | 0, c = l + (m + g << 1) | 0, r) {
         a = 0 | j[c >> 1];
         break;
        }
        if (e = 0 | X(a, s), k = 0 | d[l + (e + q << 1) >> 1], a = 65535 & k, !b) {
         if (h = 0 | d[c >> 1], i = 65535 & h, b = 0 | d[l + (e + g << 1) >> 1], c = 65535 & b, x = a - c | 0, y = i - c | 0, e = y >> 31, g = x >> 31, e = (e ^ y) - e | 0, g = (g ^ x) - g | 0, !((65535 & h) < (65535 & b) & (65535 & k) > (65535 & b) || (65535 & k) < (65535 & b) & (65535 & h) > (65535 & b))) {
          a = (0 | e) > (0 | g) ? i : a;
          break;
         }
         if (a = i + a | 0, (0 | e) > 32 | (0 | g) > 32) {
          a = a - c | 0;
          break;
         }
         a >>>= 1;
         break;
        }
       }
      } while (0);
      y = a + (n << 2 | o) | 0, d[l + (m + q << 1) >> 1] = y, 61440 & y | 0 && Xa();
     }
     q = q + 1 | 0;
    }
    p = p + 1 | 0;
   }
   u = w;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0;
   for (q = u, u = u + 32 | 0, l = 12 + (i = q + 16 | 0) | 0, m = i + 8 | 0, o = (k = q) + 4 | 0, p = k + 8 | 0, g = 0, a = 0, b = 0; (0 | g) < (0 | j[168360]); ) {
    for (h = 0; !((0 | h) >= (0 | j[168359])); ) {
     if (!(e = 1 & h)) {
      for (a = 0, b = 0, c = 0; ;) {
       if (6 == (0 | a)) {
        a = 0;
        break;
       }
       r = 0 | dg(0 | (r = 0 | Qf(0 | f[10815])), ((0 | r) < 0) << 31 >> 31 | 0, a << 3 | 0), a = a + 1 | 0, b |= r, c |= I;
      }
      for (;4 != (0 | a); ) r = 0 | ag(4095 & (r = 0 | fg(0 | b, 0 | c, 12 * a | 0)) | 0, 0, a >>> 1 << 11 | 0, 0), f[i + (a << 2) >> 2] = r, a = a + 1 | 0;
      b = 0 | f[l >> 2], a = 0 | f[m >> 2];
     }
     for (s = +(0 | f[i + (e << 2) >> 2]), v = +(0 | b), f[k >> 2] = ~~(s + 1.370705 * v), t = +(0 | a), f[o >> 2] = ~~(s - .337633 * t - .698001 * v), f[p >> 2] = ~~(1.732446 * t + s), e = 0 | f[10822], c = 0; 3 != (0 | c); ) w = 0 | f[k + (c << 2) >> 2], r = e + ((0 | X(0 | j[168356], g)) + h << 3) + (c << 1) | 0, d[r >> 1] = ~~(+(0 | j[205638 + (((0 | w) > 0 ? (0 | w) < 4095 ? w : 4095 : 0) << 1) >> 1]) / +n[43844 + (c << 2) >> 2]), c = c + 1 | 0;
     h = h + 1 | 0;
    }
    g = g + 1 | 0;
   }
   u = q;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0;
   r = u, u = u + 16 | 0, p = r + 8 | 0, q = r, tf(0 | f[10815], 0 | f[10959], 0), 73 == (0 | (a = 65535 & (e = 0 | Qf(0 | f[10815])))) | 88 == (0 | (c = 65535 & (0 | Qf(0 | f[10815])))) && tf(0 | f[10815], 2110, 1), k = 70 == (0 | a) ? 2 : 0, k = 14 == (0 | f[10958]) ? k + 3 | 0 : k, db(p, 4), a = 1 << f[10958] & 32767, h = 65535 & (b = 0 | Za()), g = (65535 & b) > 1 ? (0 | a) / (h + -1 | 0) | 0 : 0, b = (65535 & b) < 16386;
   a: do {
    switch ((65535 & e) << 16 >> 16) {
    case 68:
     if (!(32 == (0 | c) & (0 | g) > 0)) {
      if (b) {
       i = 14;
       break a;
      }
      o = 0;
      break a;
     }
     for (b = 0; ;) {
      if ((0 | b) == (0 | h)) {
       b = 0;
       break;
      }
      n = 0 | Za(), o = 205638 + ((0 | X(b, g)) << 1) | 0, d[o >> 1] = n, b = b + 1 | 0;
     }
     for (;(0 | b) != (0 | a); ) o = 0 | X(0 | j[205638 + ((m = b - (n = (0 | b) % (0 | g) | 0) | 0) << 1) >> 1], g - n | 0), o = 65535 & (((0 | X(0 | j[205638 + (m + g << 1) >> 1], n)) + o | 0) / (0 | g) | 0), d[205638 + (b << 1) >> 1] = o, b = b + 1 | 0;
     tf(0 | f[10815], 562 + (0 | f[10959]) | 0, 0), o = 65535 & (0 | Za());
     break;

    case 70:
     o = 0;
     break;

    default:
     b ? i = 14 : o = 0;
    }
   } while (0);
   for (14 == (0 | i) && (db(205638, h), o = 0, a = h); b = a + -1 | 0, (0 | d[205638 + (a + -2 << 1) >> 1]) == (0 | d[205638 + (b << 1) >> 1]); ) a = b;
   for (b = 0 | nb(28809 + (k << 5) | 0), tf(0 | f[10815], 0 | f[10960], 0), lb(-1, 0), n = 0 != (0 | o), m = 28809 + (k + 1 << 5) | 0, l = 0, c = 0; !((0 | l) >= (0 | j[168355])); ) {
    for (n & (0 | l) == (0 | o) && (Bd(b), b = 0 | nb(m), c = 16, a = a + 32 | 0), i = b + 2 | 0, k = 1 & l, h = 0, e = 0 | d[168359]; !((0 | h) >= (65535 & e | 0)); ) e = (0 == ((e = ((0 | lb((g = 15 & (s = 0 | lb(0 | j[b >> 1], i))) - (s >>= 4) | 0, 0)) << 1 | 1) << s >>> 1) & 1 << g + -1 | 0) ? (0 == (0 | s) & 1) - (1 << g) | 0 : 0) + e | 0, g = q + ((1 & h) << 1) | 0, (0 | h) < 2 ? (e = (0 | j[(s = p + (k << 2) + (h << 1) | 0) >> 1]) + e & 65535, d[s >> 1] = e, d[q + (h << 1) >> 1] = e, e = 0 | d[g >> 1]) : (e = (0 | j[g >> 1]) + e & 65535, d[g >> 1] = e), ((65535 & e) + c & 65535 | 0) >= (0 | a) && Xa(), g = (e << 16 >> 16 < 16383 ? e : 16383) << 16 >> 16, e = 0 | d[168359], s = (0 | f[10837]) + ((0 | X(65535 & e, l)) + h << 1) | 0, d[s >> 1] = 0 | d[205638 + (((0 | g) > 0 ? g : 0) << 1) >> 1], h = h + 1 | 0;
    l = l + 1 | 0;
   }
   Bd(b), u = r;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   for (n = u, u = u + 8272 | 0, h = n + 8208 | 0, k = n + 12 | 0, m = n + 8 | 0, f[(i = l = n) >> 2] = 0, f[i + 4 >> 2] = 0, tf(0 | f[10815], 0 | f[10959], 0), i = 12 + (65535 & (0 | Za())) & 15, tf(0 | f[10815], 12, 1), a = 0; ;) {
    if ((0 | a) == (0 | i)) {
     a = 0;
     break;
    }
    g = 0 | Za(), d[h + (a << 1) >> 1] = g, a = a + 1 | 0;
   }
   for (;;) {
    if (g = 0 | f[10815], (0 | a) == (0 | i)) {
     b = 0;
     break;
    }
    g = 65535 & (0 | Qf(g)), d[h + 30 + (a << 1) >> 1] = g, a = a + 1 | 0;
   }
   for (;(0 | b) != (0 | i); ) {
    for (c = 4095 + (a = 0 | j[h + (b << 1) >> 1]) + (4096 >>> (e = 0 | j[h + 30 + (b << 1) >> 1])) & 4095, e = 65535 & (e << 8 | b); !((0 | a) > (0 | c)); ) d[k + ((o = a + 1 | 0) << 1) >> 1] = e, a = o;
    b = b + 1 | 0;
   }
   for (d[k >> 1] = 12, tf(g, 0 | f[10960], 0), lb(-1, 0), c = 0; !((0 | c) >= (0 | j[168360])); ) {
    for (g = 1 & c, e = 0; !((0 | e) >= (0 | j[168359])); ) a = 0 | tb(k), b = m + ((1 & e) << 1) | 0, (0 | e) < 2 ? (a = (0 | j[(o = l + (g << 2) + (e << 1) | 0) >> 1]) + a & 65535, d[o >> 1] = a, d[m + (e << 1) >> 1] = a, a = 0 | d[b >> 1]) : (a = (0 | j[b >> 1]) + a & 65535, d[b >> 1] = a), o = (0 | f[10837]) + ((0 | X(0 | j[168359], c)) + e << 1) | 0, d[o >> 1] = a, (65535 & a) >>> (0 | f[10958]) | 0 && Xa(), e = e + 1 | 0;
    c = c + 1 | 0;
   }
   u = n;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (n = u, u = u + 1552 | 0, l = n + 16 | 0, m = n, a = 0 | f[10822], k = 0; (0 | k) < (0 | j[168355]); ) {
    for (i = 0; !((0 | (b = 0 | j[168356])) <= (0 | i)); ) {
     for (jc(l, 3 * (e = (0 | (e = b - i | 0)) < 256 ? e : 256) | 0), f[m >> 2] = 0, f[m + 4 >> 2] = 0, f[m + 8 >> 2] = 0, g = 0, h = l; (0 | g) < (0 | e); ) {
      for (b = 0, c = h; 3 != (0 | b); ) o = (0 | f[(p = m + (b << 2) | 0) >> 2]) + (0 | d[c >> 1]) | 0, f[p >> 2] = o, d[a + (b << 1) >> 1] = o, 61440 & o | 0 && Xa(), b = b + 1 | 0, c = c + 2 | 0;
      g = g + 1 | 0, h = h + 6 | 0, a = a + 8 | 0;
     }
     i = i + 256 | 0;
    }
    k = k + 1 | 0;
   }
   u = n;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0;
   C = u, u = u + 800 | 0, v = C + 32 | 0, w = C + 16 | 0, x = C;
   a: do {
    if (0 | f[10822]) for (y = w + 12 | 0, z = w + 4 | 0, A = x + 4 | 0, B = x + 8 | 0, s = 0; ;) {
     if (!((0 | s) < (0 | j[168355]))) break a;
     for (t = 0; !((0 | (a = 0 | j[168356])) <= (0 | t)); ) {
      for (jc(v, 3 * (p = (0 | (p = a - t | 0)) < 128 ? p : 128) | 0), f[y >> 2] = 0, f[z >> 2] = 0, q = v, b = 0, a = 0, r = 0; !((0 | r) >= (0 | p)); ) {
       for (m = 2 + (a = (0 | d[q + 8 >> 1]) + a | 0) + (b = (0 | d[q + 10 >> 1]) + b | 0) >> 2, f[A >> 2] = 0 - m, f[B >> 2] = a - m, f[x >> 2] = b - m, m = r + t | 0, k = 0, l = q; 2 != (0 | k); ) {
        for (n = k + s | 0, i = 0, c = l; 2 != (0 | i); ) {
         for (o = c + 2 | 0, e = (0 | d[c >> 1]) + (0 | f[w + (k << 3) + ((1 ^ i) << 2) >> 2]) | 0, f[w + (k << 3) + (i << 2) >> 2] = e, e >>> 0 > 1023 && Xa(), g = 0 | f[10822], h = m + i + (0 | X(0 | j[168356], n)) | 0, c = 0; 3 != (0 | c); ) D = (0 | f[x + (c << 2) >> 2]) + e | 0, d[g + (h << 3) + (c << 1) >> 1] = 0 | d[205638 + (((0 | D) > 0 ? (0 | D) < 4095 ? D : 4095 : 0) << 1) >> 1], c = c + 1 | 0;
         i = i + 1 | 0, c = o;
        }
        k = k + 1 | 0, l = l + 4 | 0;
       }
       q = q + 12 | 0, r = r + 2 | 0;
      }
      t = t + 128 | 0;
     }
     s = s + 2 | 0;
    }
   } while (0);
   u = C;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0;
   for (n = u, u = u + 528 | 0, k = n + 8 | 0, m = (l = n) + 4 | 0, h = 0; (0 | h) < (0 | j[168355]); ) {
    for (i = 0; !((0 | (a = 0 | j[168356])) <= (0 | i)); ) {
     for (f[m >> 2] = 0, f[l >> 2] = 0, g = 0 == (0 | jc(k, c = (0 | (c = a - i | 0)) < 256 ? c : 256)), e = 0; !((0 | e) >= (0 | c)); ) a = 0 | d[k + (e << 1) >> 1], b = l + ((1 & e) << 2) | 0, g && (a = (0 | f[b >> 2]) + a | 0, f[b >> 2] = a), b = 0 | d[205638 + (a << 1) >> 1], a = (0 | f[10837]) + (e + i + (0 | X(0 | j[168359], h)) << 1) | 0, d[a >> 1] = b, (65535 & b) >= 4096 && Xa(), e = e + 1 | 0;
     i = i + 256 | 0;
    }
    h = h + 1 | 0;
   }
   u = n;
  }, function() {
   var a = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0;
   for (e = u, u = u + 16 | 0, a = e, i = (0 | f[10967]) >>> 5 & 7, f[10824] = i, h = 0 | j[168364], d = 0 | X(g = 0 | j[168365], h), f[10965] = d, d = 0 | Cd(i, d), c = 0 | f[10966], f[a >> 2] = 5 + (i >>> 1), f[a + 4 >> 2] = h, f[a + 8 >> 2] = g, uf(c, 29027, a), Of(d, 0 | f[10965], 0 | f[10824], 0 | f[10815]), a = 0; a >>> 0 < (0 | f[10965]) >>> 0; ) {
    for (c = 0; !(c >>> 0 >= (0 | f[10824]) >>> 0); ) i = d + ((0 | X((0 | b[29019 + ((0 | f[10967]) >>> 8 << 2) + c >> 0]) - 48 | 0, 0 | f[10965])) + a) | 0, Xe(0 | b[i >> 0], 0 | f[10966]), c = c + 1 | 0;
    a = a + 1 | 0;
   }
   Bd(d), u = e;
  }, function() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, g = 0;
   a = u, u = u + 16 | 0, c = a, b = 0 | X(3 * (g = 0 | j[168364]) | 0, e = 0 | j[168365]), f[10965] = b, b = 0 | Ad(b), d = 0 | f[10966], f[c >> 2] = g, f[c + 4 >> 2] = e, uf(d, 29005, c), Of(b, 1, 0 | f[10965], 0 | f[10815]), We(b, 1, 0 | f[10965], 0 | f[10966]), Bd(b), u = a;
  }, function() {
   var a = 0, c = 0, d = 0, e = 0, g = 0;
   for (g = u, u = u + 16 | 0, e = g, d = 0 | X(3 * (0 | j[168364]) | 0, 0 | j[168365]), f[10965] = d, db(c = 0 | Cd(d, 2), d), d = 0 | f[10965], a = 0; (0 | a) != (0 | d); ) b[c + a >> 0] = (0 | j[c + (a << 1) >> 1]) >>> 8, a = a + 1 | 0;
   d = 0 | f[10966], a = 0 | j[168365], f[e >> 2] = j[168364], f[e + 4 >> 2] = a, uf(d, 29005, e), We(c, 1, 0 | f[10965], 0 | f[10966]), Bd(c), u = g;
  }, function() {
   var a = 0, b = 0, c = 0;
   for (f[10824] = (0 | f[10967]) >>> 5, b = 0; (0 | b) < (0 | j[168355]); ) {
    for (a = 0; c = 0 | j[168356], !((0 | a) >= (0 | c)); ) db(c = (0 | f[10822]) + ((0 | X(c, b)) + a << 3) | 0, 0 | f[10824]), a = a + 1 | 0;
    b = b + 1 | 0;
   }
   f[10839] = (1 << (31 & f[10967])) - 1;
  }, function() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, g = 0;
   for (c = u, u = u + 16 | 0, a = c, g = 0 | j[168364], b = 0 | X(e = 0 | j[168365], g), f[10965] = b, b = 0 | Cd(b, 2), d = 0 | f[10966], f[a >> 2] = g, f[a + 4 >> 2] = e, uf(d, 29005, a), db(b, 0 | f[10965]), a = 0; !(a >>> 0 >= (0 | f[10965]) >>> 0); ) Xe((0 | j[(g = b + (a << 1) | 0) >> 1]) << 3, 0 | f[10966]), Xe((0 | j[g >> 1]) >>> 5 << 2, 0 | f[10966]), Xe((0 | j[g >> 1]) >>> 11 << 3, 0 | f[10966]), a = a + 1 | 0;
   Bd(b), u = c;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0;
   for (x = u, u = u + 16 | 0, s = x + 8 | 0, t = x, v = 0 | j[168359], v = (w = 0 | Cd((j[168360] << 2) + (3 * v | 0) | 0, 2)) + (v << 1) | 0, tf(0 | f[10815], 0 | f[10979], 0), a = 0; b = 0 | j[168360], !((0 | a) >= (0 | b)); ) r = 0 | $a(), f[v + (a << 2) >> 2] = r, a = a + 1 | 0;
   for (q = v + (b << 2) | 0, tf(0 | f[10815], 0 | f[10974], 0), 0 | f[10974] && db(q, j[168360] << 1), r = q + (j[168360] << 2) | 0, tf(0 | f[10815], 0 | f[10976], 0), 0 | f[10976] ? (db(r, j[168359] << 1), a = 0) : a = 0; 256 != (0 | a); ) p = 65535 & ~~(+(0 | X(a, a)) / 3.969 + .5), d[205638 + (a << 1) >> 1] = p, a = a + 1 | 0;
   for (o = t + 4 | 0, p = s + 4 | 0, n = 0; !((0 | n) >= (0 | j[168360])); ) {
    for (tf(0 | f[10815], (0 | f[v + (n << 2) >> 2]) + (0 | f[10960]) | 0, 0), Ob(-1, 0), f[o >> 2] = 0, f[t >> 2] = 0, e = 0; m = 0 | d[168359], a = 65535 & m, !((0 | e) >= (0 | a)); ) {
     a: do {
      if ((0 | e) < (65528 & a | 0)) {
       if (!(7 & e)) for (b = 0; ;) {
        if (2 == (0 | b)) break a;
        for (a = 0; ;) {
         if ((0 | a) >= 5) {
          c = 23;
          break;
         }
         if (0 | Ob(1, 0)) {
          c = 22;
          break;
         }
         a = a + 1 | 0;
        }
        22 == (0 | c) && (c = 0, 0 | a && (c = 23)), 23 == (0 | c) && (m = 304 + ((a << 1) - 2 + (0 | Ob(1, 0)) << 2) | 0, f[s + (b << 2) >> 2] = f[m >> 2]), b = b + 1 | 0;
       }
      } else f[p >> 2] = 14, f[s >> 2] = 14;
     } while (0);
     a = 0 | f[s + ((b = 1 & e) << 2) >> 2], c = w + (e << 1) | 0, b = t + (b << 2) | 0, a = 14 == (0 | a) ? 0 | Ob(16, 0) : 1 + (-1 << a + -1) + (m = 0 | Ob(a, 0)) + (0 | f[b >> 2]) | 0, f[b >> 2] = a, d[c >> 1] = a, a >>> 0 > 65535 && Xa(), 5 == (0 | f[10969]) && (65535 & (a = 0 | d[c >> 1])) < 256 && (d[c >> 1] = 0 | d[205638 + ((65535 & a) << 1) >> 1]), e = e + 1 | 0;
    }
    for (e = (8 != (0 | f[10969]) & 1) << 1, g = 0 | f[10972], h = q + (n << 2) | 0, i = 0 | f[10973], k = (0 | n) >= (0 | f[10975]) & 1, l = 0 | f[10837], a = 0; b = 65535 & m, !((0 | a) >= (0 | b)); ) (0 | (c = (j[w + (a << 1) >> 1] << e) - g + (0 | d[h + (((0 | a) >= (0 | i) & 1) << 1) >> 1]) + (0 | d[r + (a << 2) + (k << 1) >> 1]) | 0)) > 0 && (b = l + ((0 | X(b, n)) + a << 1) | 0, d[b >> 1] = c), a = a + 1 | 0;
    n = n + 1 | 0;
   }
   Bd(w), f[10839] = 65532 - (0 | f[10972]), u = x;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0;
   tf(0 | f[10815], 0 | f[10970], 0), h = 0 | Za(), i = 0 | Za(), a = 0 | f[10969], tf(0 | f[10815], 0 | f[10960], 0), db(0 | f[10837], 0 | X(0 | j[168360], 0 | j[168359]));
   a: do {
    if (0 | f[10969]) for (g = 0 | f[10837], c = ~(b = 1 == (0 | a) ? 21845 : 4948), e = 0 | X(0 | j[168360], 0 | j[168359]), a = 0; ;) {
     if ((0 | a) >= (0 | e)) break a;
     l = 65535 & (d[(n = g + (a << 1) | 0) >> 1] ^ h), m = 65535 & (d[(k = g + ((1 | a) << 1) | 0) >> 1] ^ i), d[n >> 1] = m & c | l & b, d[k >> 1] = m & b | l & c, a = a + 2 | 0;
    }
   } while (0);
  }, function() {
   var a = 0, b = 0, c = 0;
   a = u, u = u + 16 | 0, b = a, tf(0 | f[10815], 16, 0), f[b >> 2] = 0, c = 65535 & (0 | Za()), f[b + 4 >> 2] = c, c = 0 | X(0 | j[168360], 0 | j[168359]), f[b + 8 >> 2] = c, f[b + 12 >> 2] = 2147483647, vc(b, 0), u = a;
  }, function() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, g = 0;
   for (e = u, u = u + 2048 | 0, c = e, tf(0 | f[10815], 67, 0), b = 0 | $a(), d = 255 & (0 | Qf(0 | f[10815])), tf(0 | f[10815], b, 0), b = d << 1, a = 0; (0 | a) != (0 | b); ) g = 0 | $a(), f[c + (a << 2) >> 2] = (f[10960] & 0 - (1 & a)) + g, a = a + 1 | 0;
   for (tf(0 | f[10815], 78, 0), b = 0 | Qf(0 | f[10815]), tf(0 | f[10815], 88, 0), a = 0 | X(0 | j[168359], 0 | j[168360]), f[c + (d << 3) >> 2] = a, a = 0 | $a(), f[c + (d << 3) + 4 >> 2] = (0 | f[10960]) + a, a = 0; (0 | a) != (0 | d); ) vc(c + (a << 3) | 0, b), a = a + 1 | 0;
   0 | b && yc(b), u = e;
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, j = 0;
   if (h = u, u = u + 1392 | 0, a = h + 1376 | 0, c = h, j = 0 | f[10965], e = 0 | Ad(j), Of(e, 1, j, 0 | f[10815]), Nf(255, 0 | f[10966]), Nf(216, 0 | f[10966]), 0 | Yd(e + 6 | 0, 38595)) {
    i = 39717, j = (g = a) + 10 | 0;
    do {
     b[g >> 0] = 0 | b[i >> 0], g = g + 1 | 0, i = i + 1 | 0;
    } while ((0 | g) < (0 | j));
    d[a + 2 >> 1] = 26629, We(a, 1, 10, 0 | f[10966]), wd(c), We(c, 1, 1376, 0 | f[10966]);
   }
   We(e + 2 | 0, 1, (0 | f[10965]) - 2 | 0, 0 | f[10966]), Bd(e), u = h;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0;
   l = u, u = u + 16 | 0, i = l, k = l + 8 | 0, c = 0 | $a(), h = 0 | f[10966], g = 0 | j[168365], f[i >> 2] = j[168364], f[i + 4 >> 2] = g, uf(h, 29005, i);
   a: do {
    if (c) {
     if (c >>> 0 >= (3 * (0 | j[168364]) | 0) >>> 0) {
      for (b = 0 | Ad(c), a = 0; !(a >>> 0 >= (0 | j[168365]) >>> 0); ) Of(b, 1, c, 0 | f[10815]), We(b, 3, 0 | j[168364], 0 | f[10966]), a = a + 1 | 0;
      Bd(b);
     }
    } else for (Bc(256, 0), a = 1, b = 0, i = 0; ;) {
     if (i >>> 0 >= (0 | j[168365]) >>> 0) break a;
     for (d[k >> 1] = 0, d[k + 2 >> 1] = 0, d[k + 4 >> 1] = 0, a ? (h = 0, a = 0) : ($a(), h = 0, a = 0); h >>> 0 < (0 | j[168364]) >>> 0; ) {
      for (g = 0; 3 != (0 | g); ) {
       for (e = 48544; 0 | f[e >> 2]; ) {
        a = a + 31 & 31;
        b: do {
         if (31 == (0 | a)) for (c = 0; ;) {
          if (4 == (0 | c)) break b;
          c = c + 1 | 0, b = (0 | Qf(0 | f[10815])) + (b << 8) | 0;
         }
        } while (0);
        e = 0 | f[e + ((b >>> a & 1) << 2) >> 2];
       }
       e = (0 | j[(c = k + (g << 1) | 0) >> 1]) + (0 | f[e + 8 >> 2]) | 0, d[c >> 1] = e, Nf(e << 16 >> 16, 0 | f[10966]), g = g + 1 | 0;
      }
      h = h + 1 | 0;
     }
     i = i + 1 | 0;
    }
   } while (0);
   u = l;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
   for (q = u, u = u + 1056 | 0, m = q, n = q + 32 | 0, o = q + 24 | 0, p = q + 16 | 0, tf(0 | f[10815], 8, 1), Ec(n), a = 0, b = 48; f[m + (a << 2) >> 2] = b, 3 != (0 | a); ) a = a + 1 | 0, b = 0 - (0 - (b + (0 | $a())) & -16) | 0;
   for (i = o + 6 | 0, k = o + 4 | 0, l = o + 2 | 0, g = 0; 3 != (0 | g); ) {
    for (tf(0 | f[10815], (0 | f[m + (g << 2) >> 2]) + (0 | f[10960]) | 0, 0), lb(-1, 0), d[i >> 1] = 512, d[k >> 1] = 512, d[l >> 1] = 512, d[o >> 1] = 512, e = 0; !(e >>> 0 >= (0 | j[168355]) >>> 0); ) {
     for (h = 1 & e, c = 0; !(c >>> 0 >= (0 | j[168356]) >>> 0); ) a = 0 | tb(n), b = p + ((1 & c) << 1) | 0, c >>> 0 < 2 ? (a = (0 | j[(r = o + (h << 2) + (c << 1) | 0) >> 1]) + a & 65535, d[r >> 1] = a, d[p + (c << 1) >> 1] = a, a = 0 | d[b >> 1]) : (a = (0 | j[b >> 1]) + a & 65535, d[b >> 1] = a), r = (0 | f[10822]) + ((0 | X(0 | j[168356], e)) + c << 3) + (g << 1) | 0, d[r >> 1] = a, c = c + 1 | 0;
     e = e + 1 | 0;
    }
    g = g + 1 | 0;
   }
   u = q;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0;
   for (m = u, u = u + 2064 | 0, l = m, db(k = m + 16 | 0, 1024), 0 | f[10846] ? (a = -1, i = 0, b = 0) : (Bc(1024, 0), a = -1, i = 0, b = 0); !((0 | i) >= (0 | j[168355])); ) {
    for (f[l >> 2] = 0, f[l + 4 >> 2] = 0, f[l + 8 >> 2] = 0, f[10846] | a ? (h = 0, a = 0) : (0 | Yf(43138)) < 14 ? ($a(), h = 0, a = 0) : (h = 0, a = 0); !((0 | h) >= (0 | j[168356])); ) {
     a: do {
      if (0 | f[10846]) for (c = 0 | $a(), b = 0; ;) {
       if (3 == (0 | b)) {
        b = c;
        break a;
       }
       f[(g = l + (2 - b << 2) | 0) >> 2] = (0 | f[g >> 2]) + (0 | d[k + ((c >>> (10 * b | 0) & 1023) << 1) >> 1]), b = b + 1 | 0;
      } else for (g = 0; ;) {
       if (3 == (0 | g)) break a;
       for (e = 48544; 0 | f[e >> 2]; ) {
        a = a + 31 & 31;
        b: do {
         if (31 == (0 | a)) for (c = 0; ;) {
          if (4 == (0 | c)) break b;
          c = c + 1 | 0, b = (0 | Qf(0 | f[10815])) + (b << 8) | 0;
         }
        } while (0);
        e = 0 | f[e + ((b >>> a & 1) << 2) >> 2];
       }
       e = (0 | f[(c = l + (g << 2) | 0) >> 2]) + (0 | d[k + (f[e + 8 >> 2] << 1) >> 1]) | 0, f[c >> 2] = e, (e + -65536 | 0) >>> 0 < 4294836224 && Xa(), g = g + 1 | 0;
      }
     } while (0);
     for (e = 0 | f[10822], c = 0; 3 != (0 | c); ) g = e + ((0 | X(0 | j[168356], i)) + h << 3) + (c << 1) | 0, d[g >> 1] = f[l + (c << 2) >> 2], c = c + 1 | 0;
     h = h + 1 | 0;
    }
    i = i + 1 | 0;
   }
   u = m;
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0;
   for (r = u, u = u + 311696 | 0, q = r, lb(-1, 0), cg(0 | q, -128, 311696), c = 0, p = 2; ;) {
    if (a = 0 | d[168355], (0 | p) >= (2 + (65535 & a) | 0)) {
     p = 0;
     break;
    }
    for (o = p + -1 | 0, l = (1 ^ (k = 1 & p)) + (q + (644 * (n = p + 1 | 0) | 0)) | 0, m = 2 == (0 | p), k |= 2; i = q + (644 * p | 0) + k | 0, !((0 | k) >= (2 + (0 | j[168356]) | 0)); ) e = k + -2 + (q + (644 * p | 0)) | 0, g = ((h[(a = k + 1 + (q + (644 * o | 0)) | 0) >> 0] << 1) + (0 | h[k + -1 + (q + (644 * o | 0)) >> 0]) + (0 | h[e >> 0]) | 0) >>> 2, c = 23652 + ((0 | lb(4, 0)) << 1) | 0, g = 255 & (c = (0 | (c = g + (0 | d[c >> 1]) | 0)) > 0 ? (0 | c) < 255 ? c : 255 : 0), b[i >> 0] = g, (0 | k) < 4 && (b[l >> 0] = g, b[e >> 0] = g), m && (b[k + 3 + (q + (644 * o | 0)) >> 0] = g, b[a >> 0] = g), k = k + 2 | 0;
    b[i >> 0] = c, p = n;
   }
   for (;2 != (0 | p); ) {
    for (o = p + 2 | 0; !((0 | o) >= (2 + (65535 & a) | 0)); ) {
     for (i = o + 2 | 0, k = (0 | o) < 4, l = o + -2 | 0, a = 1 & o ^ 3; !((0 | a) >= (2 + (0 | j[168356]) | 0)); ) m = (0 | a) < 4, e = 0 | h[q + (644 * o | 0) + (n = a + -2 | 0) >> 0], g = 0 | h[q + (644 * l | 0) + a >> 0], c = 23684 + ((c = k | m ? 2 : (0 | (c = ((v = g - e | 0) >> 31 ^ v) + (v >>> 31) + ((t = g - (s = 0 | h[q + (644 * l | 0) + n >> 0]) | 0) >>> 31) + (t >> 31 ^ t) + (((c = (s = e - s | 0) >> 31) ^ s) - c) | 0)) < 4 ? 0 : (0 | c) < 8 ? 1 : (0 | c) < 16 ? 2 : (0 | c) < 32 ? 3 : (0 | c) < 48 ? 4 : 5) << 3) + ((0 | lb(2, 0)) << 1) | 0, c = (0 | (c = (0 | d[c >> 1]) + ((e + g | 0) >>> 1) | 0)) > 0 ? 255 & ((0 | c) < 255 ? c : 255) : 0, b[q + (644 * o | 0) + a >> 0] = c, a = a + 2 | 0, k && (b[q + (644 * l | 0) + a >> 0] = c), m && (b[q + (644 * i | 0) + n >> 0] = c);
     o = i, a = 0 | d[168355];
    }
    p = p + 1 | 0;
   }
   for (g = 2 + (65535 & a) | 0, i = 2 + (65535 & (k = 0 | d[168356])) | 0, e = 2; (0 | e) != (0 | g); ) {
    for (c = 1 & e ^ 3; !((0 | c) >= (0 | i)); ) t = ((s = (h[(v = q + (644 * e | 0) + c | 0) >> 0] << 2) + (0 | h[c + -1 + (q + (644 * e | 0)) >> 0]) + (0 | h[c + 1 + (q + (644 * e | 0)) >> 0]) | 0) >>> 1) - 256 | 0, b[v >> 0] = s >>> 0 > 513 ? 255 & ((0 | t) < 255 ? t : 255) : 0, c = c + 2 | 0;
    e = e + 1 | 0;
   }
   for (l = 0 | f[10837], m = 0 | j[168359], i = 0, g = k; !((0 | i) >= (65535 & a | 0)); ) {
    for (c = i + 2 | 0, e = 0 | X(m, i), a = 0; !((0 | a) >= (65535 & g | 0)); ) d[l + (e + a << 1) >> 1] = 0 | d[23732 + (h[a + 2 + (q + (644 * c | 0)) >> 0] << 1) >> 1], a = a + 1 | 0, g = 0 | d[168356];
    i = i + 1 | 0, a = 0 | d[168355];
   }
   f[10839] = 1023, u = r;
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0;
   for (M = u, u = u + 16688 | 0, I = M + 6960 | 0, K = M + 6948 | 0, L = M, d[(J = M + 6954 | 0) >> 1] = 0 | d[12122], d[J + 2 >> 1] = 0 | d[12123], d[J + 4 >> 1] = 0 | d[12124], c = 2; ;) {
    if ((0 | c) >= 12) {
     a = 0, e = 0;
     break;
    }
    for (l = 0 | j[24250 + (c + -2 << 1) >> 1], g = +((e = 0 | j[24250 + (c << 1) >> 1]) - l | 0), i = 24250 + ((1 | c) << 1) | 0, k = 24250 + (c + -1 << 1) | 0, a = l; !((0 | a) > (0 | e)); ) H = 0 | d[k >> 1], d[205638 + (a << 1) >> 1] = ~~(+(65535 & H) + +(a - l | 0) / g * +((0 | j[i >> 1]) - (65535 & H) | 0) + .5), a = a + 1 | 0;
    c = c + 2 | 0;
   }
   for (;!(e >>> 0 >= 260); ) {
    for (i = 256 >>> (k = 0 | b[29053 + e >> 0]), k <<= 8, l = 29053 + (1 | e) | 0, c = 0; !((0 | c) >= (0 | i)); ) d[I + (a << 1) >> 1] = h[l >> 0] | k, a = a + 1 | 0, c = c + 1 | 0;
    e = e + 2 | 0;
   }
   for (e = 1 << (c = 243 == (0 | f[10982]) ? 2 : 3) - 1 | 8 - c << 8, a = 0; 256 != (0 | a); ) d[I + 9216 + (a << 1) >> 1] = e | a >> c << c, a = a + 1 | 0;
   for (lb(-1, 0), a = 0; 3474 != (0 | a); ) d[L + (a << 1) >> 1] = 2048, a = a + 1 | 0;
   F = I + 9216 | 0, G = I + 4608 | 0, H = I + 5120 | 0, E = 0;
   a: for (;a = 0 | d[168355], (0 | E) < (65535 & a | 0); ) {
    for (a = 0; 3 != (0 | a); ) D = 65535 & (0 | lb(6, 0)), d[K + (a << 1) >> 1] = D, a = a + 1 | 0;
    for (C = E + -1 | 0, B = 0; 3 != (0 | B); ) {
     for (i = J + (B << 1) | 0, D = (k = 0 | d[K + (B << 1) >> 1]) << 16 >> 16, c = ~(-1 << (l = (0 | (e = 0 | X(2047 + (16777216 / (0 | d[i >> 1]) | 0) >> 12, D))) > 65564 ? 10 : 12) - 1), e <<= 12 - l, a = 0; 1158 != (0 | a); ) z = (0 | X(0 | d[(A = L + (2316 * B | 0) + (a << 1) | 0) >> 1], e)) + c >> l & 65535, d[A >> 1] = z, a = a + 1 | 0;
     for (d[i >> 1] = k, t = D << 7 & 65535, v = C + B | 0, w = 2 - B | 0, x = L + (2316 * B | 0) + ((z = 1 & (1 ^ (s = 0 != (0 | B)))) << 1) | 0, y = L + (2316 * B | 0) + 1544 | 0, z = 772 - (z << 1) | 0, A = s ? 1 : 2, r = 0; (0 | r) != (0 | A); ) {
      d[L + (2316 * B | 0) + 1544 + ((c = (0 | j[168356]) >>> 1 & 65535) << 1) >> 1] = t, d[L + (2316 * B | 0) + 772 + (c << 1) >> 1] = t, a = 1;
      b: for (;!((0 | c) <= 0); ) {
       if (a = (0 | lb(8, I + (a << 9) | 0)) << 24 >> 24) {
        if (q = c + -2 | 0, p = c + -1 | 0, 8 == (0 | a)) for (c = 1; ;) {
         if (3 == (0 | c)) {
          c = q;
          continue b;
         }
         for (e = p; !((0 | e) < (0 | q)); ) o = 65535 & (0 | X(255 & (0 | lb(8, F)), D)), d[L + (2316 * B | 0) + (772 * c | 0) + (e << 1) >> 1] = o, e = e + -1 | 0;
         c = c + 1 | 0;
        }
        for (l = I + (a + 10 << 9) | 0, e = 1; ;) {
         if (3 == (0 | e)) {
          c = q;
          continue b;
         }
         for (m = e + -1 | 0, i = p; !((0 | i) < (0 | q)); ) n = (0 | lb(8, l)) << 24 >> 20, o = i + 1 | 0, c = 0 | d[L + (2316 * B | 0) + (772 * m | 0) + (i << 1) >> 1], s ? k = 2 : (k = 4, c = (0 | d[L + (772 * m | 0) + (o << 1) >> 1]) + (c << 1) | 0), d[L + (2316 * B | 0) + (772 * e | 0) + (i << 1) >> 1] = (((0 | d[L + (2316 * B | 0) + (772 * e | 0) + (o << 1) >> 1]) + c | 0) / (0 | k) | 0) + n, i = i + -1 | 0;
         e = e + 1 | 0;
        }
       }
       for (;;) {
        for (q = (0 | c) > 2 ? 1 + ((0 | lb(8, G)) << 24 >> 24) | 0 : 1, p = 0; !((0 | p) >= 8) && (0 | c) > 0 & (0 | p) < (0 | q); ) {
         for (o = c + -2 | 0, n = c + -1 | 0, i = 1; 3 != (0 | i); ) {
          for (l = i + -1 | 0, k = n; !((0 | k) < (0 | o)); ) m = k + 1 | 0, c = 0 | d[L + (2316 * B | 0) + (772 * l | 0) + (k << 1) >> 1], s ? e = 2 : (c = (0 | d[L + (772 * l | 0) + (m << 1) >> 1]) + (c << 1) | 0, e = 4), d[L + (2316 * B | 0) + (772 * i | 0) + (k << 1) >> 1] = ((0 | d[L + (2316 * B | 0) + (772 * i | 0) + (m << 1) >> 1]) + c | 0) / (0 | e) | 0, k = k + -1 | 0;
          i = i + 1 | 0;
         }
         c: do {
          if (1 & p | 0) for (i = (0 | lb(8, H)) << 24 >> 20, c = 1; ;) {
           if (3 == (0 | c)) break c;
           for (e = n; !((0 | e) < (0 | o)); ) d[(m = L + (2316 * B | 0) + (772 * c | 0) + (e << 1) | 0) >> 1] = (0 | j[m >> 1]) + i, e = e + -1 | 0;
           c = c + 1 | 0;
          }
         } while (0);
         p = p + 1 | 0, c = o;
        }
        if (9 != (0 | q)) continue b;
       }
      }
      i = 0 | f[10837], k = (r << 1) + E | 0, l = 0 | j[168359], a = 0;
      d: for (;2 != (0 | a); ) for (m = a + 1 | 0, e = s ? w : a, c = 0 | X(l, s ? v + (a << 1) | 0 : k + a | 0), a = 0; ;) {
       if ((0 | a) >= ((0 | j[168356]) >>> 1 & 65535 | 0)) {
        a = m;
        continue d;
       }
       q = (d[L + (2316 * B | 0) + (772 * m | 0) + (a << 1) >> 1] << 4 | 0) / (0 | D) | 0, d[i + ((a << 1) + e + c << 1) >> 1] = (0 | q) > 0 ? q : 0, a = a + 1 | 0;
      }
      gg(0 | x, 0 | y, 0 | z), r = r + 1 | 0;
     }
     B = B + 1 | 0;
    }
    for (l = E + 4 | 0, m = 0 | f[10837], n = 0 | j[168359], a = E; ;) {
     if ((0 | a) >= (0 | l)) {
      E = l;
      continue a;
     }
     for (e = 0 | X(n, a), c = 0; i = 0 | j[168356], !((0 | c) >= (0 | i)); ) k = c + 1 | 0, c + a & 1 ? (D = c + -1 | 0, D = (j[(E = m + (e + c << 1) | 0) >> 1] << 1) - 4096 + (((0 | j[m + (e + ((0 | k) < (0 | i) ? k : D) << 1) >> 1]) + (0 | j[m + (e + (0 | c ? D : k) << 1) >> 1]) | 0) >>> 1) | 0, d[E >> 1] = (0 | D) > 0 ? D : 0, c = k) : c = k;
     a = a + 1 | 0;
    }
   }
   for (e = 0 | f[10837], c = 0; !((0 | c) >= (0 | X(0 | j[168356], 65535 & a))); ) d[(a = e + (c << 1) | 0) >> 1] = 0 | d[205638 + (j[a >> 1] << 1) >> 1], c = c + 1 | 0, a = 0 | d[168355];
   f[10839] = 16383, u = M;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (k = 0, a = 0 | d[168360]; !((0 | k) >= (65535 & a | 0)); ) {
    for (m = k + -2 | 0, n = (0 | k) < 2, l = 0, b = 0 | d[168359]; !((0 | l) >= ((65535 & b) - 2 | 0)); ) {
     for (i = 0 | $a(), e = 0 | f[10837], g = 65535 & (b = 0 | d[168359]), h = 65535 & (a = 0 | d[168360]), c = 0; 3 != (0 | c); ) o = e + ((0 | X((o = (0 | (p = c + l | 0)) < 4) ? m + (n ? h : 0) | 0 : k, g)) + (p + -4 + (o ? g : 0)) << 1) | 0, d[o >> 1] = 0 | d[205638 + ((i >> 2 + (10 * c | 0) & 1023) << 1) >> 1], c = c + 1 | 0;
     l = l + 3 | 0;
    }
    k = k + 1 | 0;
   }
   f[10839] = j[103842];
  }, function() {}, function() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
   if (y = u, u = u + 512 | 0, t = y, w = y + 24 | 0, v = y + 12 | 0, f[v >> 2] = 0, f[v + 4 >> 2] = 0, f[v + 8 >> 2] = 0, 0 | rb(w, 0) && (s = w + 16 | 0, (0 | (a = 0 | f[s >> 2])) >= 4)) {
    for (r = f[(e = w + 12 | 0) >> 2] >> 1, f[e >> 2] = r, r = 0 | X(r, a), e = 0, g = 0, h = 0, p = 0, q = 0; ;) {
     if (c = 0 | d[168361], (0 | q) > (65535 & c | 0)) {
      c = 344976;
      break;
     }
     for (o = c << 16 >> 16 != 0 & (0 | (n = ((j[168362] << 1 | 0) / (0 | a) | 0) + p | 0)) < (0 | (o = 0 | j[168359])) ? n : 65534 & o, n = 0; !((0 | n) >= (0 | j[168355])); ) {
      for (m = (0 | f[10822]) + ((0 | X(0 | j[168356], n)) << 3) | 0, l = p; !((0 | l) >= (0 | o)); ) {
       if ((k = (0 | g) % (0 | r) | 0) || (e = 0 | ub(h, w), h = h + 1 | 0, a = 0 | f[s >> 2]), g = a + k | 0, (0 | l) < (0 | j[168356])) {
        for (i = a + -2 | 0, c = 0; !((0 | c) >= (0 | i)); ) z = m + ((1 & c) + l + (0 | X(0 | j[168356], c >> 1)) << 3) | 0, d[z >> 1] = 0 | d[e + (c + k << 1) >> 1], c = c + 1 | 0;
        d[2 + (z = m + (l << 3) | 0) >> 1] = 49152 + (0 | j[e + (g + -2 << 1) >> 1]), d[z + 4 >> 1] = 49152 + (0 | j[e + (g + -1 << 1) >> 1]);
       }
       l = l + 2 | 0;
      }
      n = n + -1 + (a >> 1) | 0;
     }
     p = o, q = q + 1 | 0;
    }
    for (;(a = 0 | b[c >> 0]) << 24 >> 24 && !(((a << 24 >> 24) - 48 | 0) >>> 0 <= 9); ) c = c + 1 | 0;
    for (e = v + 4 | 0, g = v + 8 | 0, f[t >> 2] = v, f[t + 4 >> 2] = e, f[t + 8 >> 2] = g, lf(c, 28720, t), o = 0 | f[10847], a = 0 | f[w + 20 >> 2], o >>> 0 > 2147484288 ? x = 24 : (-2147483112 == (0 | o) ? ((1e3 * ((1e3 * (0 | f[v >> 2]) | 0) + (0 | f[e >> 2]) | 0) | 0) + (0 | f[g >> 2]) | 0) > 1000006 : 0) ? x = 24 : n = 4 + (a << 2) | 0, 24 == (0 | x) && (n = a << 1), k = a >> 1, m = l = 0 | f[10822], i = 0; !((0 | i) >= (0 | j[168355])); ) {
     a: do {
      if (i & k) for (g = 0; ;) {
       if (!((0 | g) < (0 | j[168356]))) {
        h = 1;
        break a;
       }
       for (e = 1; 3 != (0 | e); ) a = 0 | d[m + (g - (c = 0 | j[168356]) << 3) + (e << 1) >> 1], (0 | i) != ((0 | j[168355]) - 1 | 0) && (a = (1 + (a << 16 >> 16) + (0 | d[m + (c + g << 3) + (e << 1) >> 1]) | 0) >>> 1 & 65535), d[m + (g << 3) + (e << 1) >> 1] = a, e = e + 1 | 0;
       g = g + 2 | 0;
      } else h = 1;
     } while (0);
     for (;a = 0 | j[168356], !((0 | h) >= (0 | a)); ) {
      for (e = h + -1 | 0, g = h + 1 | 0, c = 1; 3 != (0 | c); ) a = 0 | d[m + (e << 3) + (c << 1) >> 1], (0 | h) != ((0 | j[168356]) - 1 | 0) && (a = (1 + (a << 16 >> 16) + (0 | d[m + (g << 3) + (c << 1) >> 1]) | 0) >>> 1 & 65535), d[m + (h << 3) + (c << 1) >> 1] = a, c = c + 1 | 0;
      h = h + 2 | 0;
     }
     m = m + (a << 3) | 0, i = i + 1 | 0;
    }
    for (h = o >>> 0 < 2147484184, g = l; !(g >>> 0 >= m >>> 0); ) {
     switch (a = g + 2 | 0, c = g + 4 | 0, e = 0 | d[g >> 1], 0 | o) {
     case -2147483112:
     case -2147483056:
     case -2147483039:
     case -2147483007:
     case -2147483001:
      x = 0 | d[c >> 1], d[a >> 1] = (d[a >> 1] << 2) + n, a = (x << 2) + n | 0, x = 48;
      break;

     default:
      h ? (c = g, a = 65024 + (65535 & e) | 0, x = 48) : a = 0;
     }
     for (48 == (0 | x) && (x = 0, d[c >> 1] = a, a = 0); 3 != (0 | a); ) d[g + (a << 1) >> 1] = 0, a = a + 1 | 0;
     g = g + 8 | 0;
    }
    sb(w), f[10839] = 16383;
   }
   u = y;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0;
   if (N = u, u = u + 560 | 0, I = N + 76 | 0, J = N + 56 | 0, K = N + 48 | 0, L = N, 0 | rb(I, 0)) {
    for (d[102818] = 18761, Ob(-1, 0), a = 0 | Cd(b = 0 | j[168359], 12), f[(M = J + 16 | 0) >> 2] = a, a = 0; 3 != (0 | a); ) H = (0 | f[M >> 2]) + ((0 | X(a, b)) << 2) | 0, f[J + (a << 2) >> 2] = H, a = a + 1 | 0;
    for (C = (D = 0 | f[10848]) >>> 0 > 1 & 1, d[168372] = (0 | j[168372]) >>> C, D = 0 == (0 | (D = (E = 0 | f[10804]) >>> 0 < D >>> 0 ? E : D)) ? 0 : D + -1 | 0, F = 2 + (E = 0 | f[I + 312 >> 2]) | 0, G = J + 8 | 0, H = 11 != (0 | f[I + 24 >> 2]), B = 0; (0 | B) < (0 | j[168360]); ) {
     for (a = 0; 4 != (0 | a); ) f[J + ((a + 3 & 3) << 2) >> 2] = f[J + (a << 2) >> 2], a = a + 1 | 0;
     x = 0 | f[G >> 2], y = (0 | B) > 1, z = 0 | f[J >> 2], A = 0 - (1 & B) & 3, w = 0, a = 0 | d[168359];
     a: for (;(0 | w) < (65535 & a | 0); ) {
      for (b = 0; b >>> 0 < f[10848] << 1 >>> 0; ) {
       for (a = 0; ;) {
        if (2 == (0 | a)) {
         a = 0;
         break;
        }
        v = 0 | Ob(0 | j[E >> 1], F), f[K + (a << 2) >> 2] = v, a = a + 1 | 0;
       }
       for (;2 != (0 | a); ) v = (t = 0 | Ob(v = 0 | f[K + (a << 2) >> 2], 0)) - (0 == (1 << v + -1 & t | 0) ? (1 << v) - 1 | 0 : 0) | 0, f[L + (a + b << 2) >> 2] = 65535 == (0 | v) ? -32768 : v, a = a + 1 | 0;
       b = b + 2 | 0;
      }
      for (r = w + 2 | 0, v = H | y & (s = 0 != (0 | w)) ^ 1, t = 0 | X(65535 & (a = 0 | d[168359]), B), q = w; ;) {
       if ((0 | q) >= (0 | r)) {
        w = r;
        continue a;
       }
       for (b = 32768 + (0 | f[10846]) | 0, c = q + -2 | 0, s && (b = 0 | f[x + (c << 2) >> 2], v || (b = ((0 | f[z + (q << 2) >> 2]) / 2 | 0) + b + ((0 | f[z + (c << 2) >> 2]) / -2 | 0) | 0)), n = q + w & 1 ^ A, p = (o = 0 | f[10848]) & 0 - (1 & q), i = 0 != (0 | (m = 0 | f[10837])), l = 0 == (0 | (k = 0 | f[10822])), m = m + (t + q << 1) | 0, h = 0; (0 | h) != (0 | o); ) e = 65535 & (c = (b = (0 | f[L + (h + p << 2) >> 2]) + b | 0) >> C), i & (0 | h) == (0 | D) && (d[m >> 1] = c), l || (P = B - (0 | j[102816]) + (1 & h) | 0, O = w - (0 | j[102817]) - (h >>> 1 & 1) | 0, g = k + ((0 | X(P, c = 0 | j[168356])) + O << 3) + (n << 1) | 0, P >>> 0 < (0 | j[168355]) >>> 0 & O >>> 0 < c >>> 0 && (c = (0 | h) < 4 ? e : ((0 | j[g >> 1]) + e | 0) >>> 1, d[g >> 1] = c)), h = h + 1 | 0;
       f[x + (q << 2) >> 2] = b, q = q + 1 | 0;
      }
     }
     B = B + 1 | 0;
    }
    Bd(0 | f[M >> 2]), sb(I), 0 | f[10822] && (f[10980] = 1);
   }
   u = N;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0;
   for ((a = 0 | f[10812]) ? (k = 0, b = 0, c = 0) : (k = 0, b = 0, c = 0 | Cd(0 | j[168359], 2), a = 0); k >>> 0 < (0 | f[10848]) >>> 0; ) {
    for (i = 0; !(i >>> 0 >= (0 | j[168360]) >>> 0); ) {
     (i >>> 0) % ((0 | f[10955]) >>> 0) | 0 ? h = b : (tf(0 | f[10815], (0 | f[10960]) + (b << 2) | 0, 0), tf(h = 0 | f[10815], 0 | $a(), 0), h = b + 1 | 0, a = 0 | f[10812]), b = 0 != (0 | a);
     a: do {
      if ((0 | k) == (0 | f[10804]) | 1 ^ b && (a = 0 | j[168359], g = 0 | X(a, i), c = b ? (0 | f[10837]) + (g << 1) | 0 : c, db(c, a), !(a = 0 | f[10812]))) if ((b = i - (0 | j[102816]) | 0) >>> 0 < (0 | j[168355]) >>> 0) for (e = 0 | f[10822], a = 0; ;) {
       if (g = 0 | j[168356], a >>> 0 >= g >>> 0) {
        a = 0;
        break a;
       }
       g = e + ((0 | X(g, b)) + a << 3) + (k << 1) | 0, d[g >> 1] = 0 | d[c + ((0 | j[102817]) + a << 1) >> 1], a = a + 1 | 0;
      } else a = 0;
     } while (0);
     i = i + 1 | 0, b = h;
    }
    k = k + 1 | 0;
   }
   a || (f[10839] = 65535, f[10823] = 1, Bd(c));
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   for (m = u, u = u + 16 | 0, e = m, i = 0 | Cd(0 | j[168359], 2), k = e + 4 | 0, l = e + 8 | 0, b = 0; !((0 | b) >= (0 | j[168355])); ) {
    for ((0 | Of(i, 0 | j[168359], 2, 0 | f[10815])) >>> 0 < 2 && Xa(), 31 == (31 & b | 0) & 0 != (0 | f[10846]) && tf(0 | f[10815], (0 | j[168359]) << 5, 1), g = 0 | f[10822], c = 0; !((0 | c) >= (0 | j[168356])); ) {
     for (o = 0 | h[i + (-4 & (n = c << 1) | 1) >> 0], a = (0 | h[i + (3 | n) >> 0]) - 128 | 0, n = (0 | h[i + n >> 0]) - (o + -126 + a >> 2) | 0, f[k >> 2] = n, f[l >> 2] = o + -128 + n, f[e >> 2] = n + a, a = 0; 3 != (0 | a); ) n = 0 | f[e + (a << 2) >> 2], o = g + ((0 | X(0 | j[168356], b)) + c << 3) + (a << 1) | 0, d[o >> 1] = 0 | d[205638 + (((0 | n) > 0 ? (0 | n) < 255 ? n : 255 : 0) << 1) >> 1], a = a + 1 | 0;
     c = c + 1 | 0;
    }
    b = b + 1 | 0;
   }
   Bd(i), f[10839] = j[103074], u = m;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (n = u, u = u + 16 | 0, i = n, k = 0 | Cd(0 | j[168359], 3), l = i + 4 | 0, m = i + 8 | 0, g = 0; !((0 | g) >= (0 | j[168355])); ) {
    for ((a = 1 & g) || (0 | Of(k, 0 | j[168359], 3, 0 | f[10815])) >>> 0 < 3 && Xa(), c = 0 - a | 0, e = 0 | f[10822], b = 0; a = 0 | j[168356], !((0 | b) >= (0 | a)); ) {
     for (p = 0 | h[k + (o = a + (-2 & b) | 0) >> 0], o = (0 | h[k + (o + 1) >> 0]) - 128 | 0, a = (0 | h[k + ((a << 1 & c) + b) >> 0]) - (p + -126 + o >> 2) | 0, f[l >> 2] = a, f[m >> 2] = p + -128 + a, f[i >> 2] = a + o, a = 0; 3 != (0 | a); ) o = 0 | f[i + (a << 2) >> 2], p = e + ((0 | X(0 | j[168356], g)) + b << 3) + (a << 1) | 0, d[p >> 1] = 0 | d[205638 + (((0 | o) > 0 ? (0 | o) < 255 ? o : 255 : 0) << 1) >> 1], a = a + 1 | 0;
     b = b + 1 | 0;
    }
    g = g + 1 | 0;
   }
   Bd(k), f[10839] = j[103074], u = n;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0;
   for (k = u, u = u + 848 | 0, c = k, b = 0; !((0 | b) >= (0 | j[168355])); ) {
    for ((0 | Of(c, 1, 848, 0 | f[10815])) >>> 0 < 848 && Xa(), e = (g = 0 | X(0 | f[344 + ((e = 3 & b) << 2) >> 2], b)) + (0 | f[360 + (e << 2) >> 2]) | 0, g = 0 | f[10837], i = 0 | X(0 | j[168359], b), a = 0; !((0 | a) >= (0 | j[168356])); ) d[g + (i + a << 1) >> 1] = 0 | h[c + ((e + a | 0) % 848 | 0) >> 0], a = a + 1 | 0;
    b = b + 1 | 0;
   }
   f[10839] = 255, u = k;
  }, function() {}, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0;
   for (m = u, u = u + 80 | 0, i = m + 64 | 0, k = m, a = 0, e = (0 | X(5 * (0 | j[168359]) | 0, 0 | j[168360])) >>> 3, g = 0, l = 5; 10 == (0 | Of(i, 1, 10, 0 | f[10815])); ) {
    for (c = 0, b = g; ;) {
     if ((0 | b) == (0 | l)) {
      b = 10, c = e;
      break;
     }
     f[k + (c << 2) >> 2] = b, n = 0 | h[i + c >> 0], f[k + ((o = 1 | c) << 2) >> 2] = n << 8 | 0 | h[i + o >> 0], c = c + 2 | 0, a = n >>> 2 | a << 6, b = b + 1 | 0;
    }
    for (;!(b >>> 0 >= 16); ) f[k + (b << 2) >> 2] = c, f[k + ((1 | b) << 2) >> 2] = a >>> (5 * (14 - b | 0) | 0), b = b + 2 | 0, c = c + 1 | 0;
    for (c = 0 | f[10837], b = 0; !(b >>> 0 >= 16); ) d[c + (f[k + (b << 2) >> 2] << 1) >> 1] = 1023 & f[k + ((1 | b) << 2) >> 2], b = b + 2 | 0;
    e = e + 3 | 0, g = g + 5 | 0, l = l + 5 | 0;
   }
   f[10839] = 1023, u = m;
  }, function() {}, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
   for (p = u, u = u + 768 | 0, m = (l = p) + 1 | 0, n = l + 765 | 0, k = 0; 1481 != (0 | k); ) {
    switch ((0 | Of(l, 1, 768, 0 | f[10815])) >>> 0 < 768 && Xa(), a = (k >>> 0) / 82 | 0, 0 | k) {
    case 1479:
    case 1477:
     break;

    case 1476:
     c = 984, o = 9;
     break;

    case 1480:
     c = 985, o = 9;
     break;

    case 1478:
     c = 985, a = 1, o = 9;
     break;

    default:
     c = (k >>> 0 < 984 ? 1 | a : (a << 1) - 24 | 0) + (12 * ((k >>> 0) % 82 | 0) | 0) | 0, o = 9;
    }
    a: do {
     if (9 == (0 | o)) {
      if (o = 0, i = 0 | f[10837], a >>> 0 > 11 | 0 == (1 & a | 0)) for (b = 0 | X(0 | j[168359], c), a = 1 & c; ;) {
       if (a >>> 0 >= 1534) break a;
       d[i + (b + a << 1) >> 1] = (0 | h[l + (a >>> 1) >> 0]) << 1, a = a + 2 | 0;
      }
      for (g = 0 | j[168359], e = 0; 1533 != (0 | e); ) b = e + 1 | 0, 1 != (0 | e) && (a = e >>> 1, a = 2 & b ? (0 | h[l + (a + 1) >> 0]) + (0 | h[l + (a + -1) >> 0]) | 0 : (0 | h[l + a >> 0]) << 1, e = i + ((0 | X(g, c)) + e << 1) | 0, d[e >> 1] = a), e = b, c ^= 1;
      g = 0 | X(g, c), d[i + (g + 1 << 1) >> 1] = (0 | h[m >> 0]) << 1, d[i + (g + 1533 << 1) >> 1] = (0 | h[n >> 0]) << 1;
     }
    } while (0);
    k = k + 1 | 0;
   }
   f[10839] = 510, u = p;
  }, function() {
   var a = 0, b = 0, c = 0, e = 0, g = 0, h = 0;
   for (h = u, u = u + 16 | 0, e = h, g = 0 | Cd(65535 & (a = 0 | d[168359]), f[10848] << 1), c = 0; !((0 | c) >= (0 | j[168360])); ) {
    a: do {
     if (16 == (0 | f[10958])) db(g, 0 | X(0 | f[10848], 65535 & a)); else for (lb(-1, 0), a = 0; ;) {
      if (a >>> 0 >= (0 | X(0 | j[168359], 0 | f[10848])) >>> 0) break a;
      b = 65535 & (0 | lb(0 | f[10958], 0)), d[g + (a << 1) >> 1] = b, a = a + 1 | 0;
     }
    } while (0);
    for (f[e >> 2] = g, b = 0; a = 0 | d[168359], !((0 | b) >= (65535 & a | 0)); ) xb(c, b, e), b = b + 1 | 0;
    c = c + 1 | 0;
   }
   Bd(g), u = h;
  }, function() {
   var a = 0, b = 0, c = 0, d = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0;
   for (w = u, u = u + 480 | 0, n = w, p = 12 + (m = w + 4 | 0) | 0, q = m + 16 | 0, r = m + 8 | 0, s = m + 32 | 0, t = m + 184 | 0, k = 0, l = 0; !(l >>> 0 >= (0 | j[168360]) >>> 0) && (o = 0 | Pf(0 | f[10815]), (0 | f[10955]) >>> 0 < 2147483647 && tf(i = 0 | f[10815], 0 | $a(), 0), 0 | rb(m, 0)); ) {
    e = ((h = 0 | X(0 == (0 | f[10812]) ? 1 : 0 | f[q >> 2], 0 | f[p >> 2])) >>> 0) / (((i = 0 | f[10956]) >>> 0 < (e = 0 | f[10848]) >>> 0 ? i : e) >>> 0) | 0;
    a: do {
     switch (0 | f[m >> 2]) {
     case 193:
      for (f[s >> 2] = 16384, lb(-1, 0), d = 0; ;) {
       if ((7 | d) >>> 0 >= (0 | f[r >> 2]) >>> 0) break a;
       for (e = (d << 1) + l | 0, c = 0; !((7 | c) >>> 0 >= (0 | f[p >> 2]) >>> 0); ) {
        for (yb(m), f[n >> 2] = t, g = ((c >>> 0) % ((h = 0 | f[10957]) >>> 0) | 0) + k | 0, h = e + ((c >>> 0) / (h >>> 0) | 0) | 0, b = 0; !(b >>> 0 >= 16); ) {
         for (i = h + b | 0, a = 0; 8 != (0 | a); ) xb(i, g + a | 0, n), a = a + 1 | 0;
         b = b + 2 | 0;
        }
        c = c + 8 | 0;
       }
       d = d + 8 | 0;
      }

     case 195:
      for (a = 0, b = 0, d = 0; ;) {
       if (d >>> 0 >= (0 | f[r >> 2]) >>> 0) break a;
       for (c = 0 | ub(d, m), f[n >> 2] = c, c = 0; !(c >>> 0 >= e >>> 0); ) xb(b + l | 0, a + k | 0, n), (a = a + 1 | 0) >>> 0 < (0 | f[10957]) >>> 0 ? a >>> 0 >= (0 | j[168359]) >>> 0 && (v = 24) : v = 24, 24 == (0 | v) && (v = 0, a = 0, b = b + 1 | 0), c = c + 1 | 0;
       d = d + 1 | 0;
      }
     }
    } while (0);
    tf(0 | f[10815], o + 4 | 0, 0), o = ((h = (i = (0 | f[10957]) + k | 0) >>> 0 < (0 | j[168359]) >>> 0) ? 0 : 0 | f[10955]) + l | 0, sb(m), k = h ? i : 0, l = o;
   }
   u = w;
  }, function() {
   var a = 0, c = 0, e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, q = 0, r = 0, s = 0;
   s = u, u = u + 48 | 0, l = s + 24 | 0, k = s, g = ~~(.01 * +(0 | X(0 | j[168355], 0 | j[168356]))), g = 0 == (0 | d[172468]) ? g : (0 | g) / 2 | 0;
   a: do {
    if (-3 & f[10807] | f[10811]) a = 8192; else for (i = 0 | f[10824], a = 0, h = 0; ;) {
     if ((0 | h) == (0 | i)) break a;
     c = 0, e = 8192;
     do {
      if ((0 | (e = e + -1 | 0)) <= 32) break;
      c = (0 | f[73980 + (h << 15) + (e << 2) >> 2]) + c | 0;
     } while ((0 | c) <= (0 | g));
     a = (0 | a) < (0 | e) ? e : a, h = h + 1 | 0;
    }
   } while (0);
   for (Ic(+p[17], +p[18], 2, ~~(+(a << 3 | 0) / +n[38])), a = 0 | d[168355], d[172469] = a, c = 0 | d[168356], d[168358] = c, 4 & f[18321] ? (d[168356] = a, d[168355] = c, e = a, a = c) : e = c, r = 0 | Cd(c = 65535 & e, 536870911 & (e = 0 | f[10824])), g = 0 | f[10966], a &= 65535, e >>> 0 > 3 ? (f[k >> 2] = c, f[k + 4 >> 2] = a, f[k + 8 >> 2] = e, f[k + 12 >> 2] = 255, f[k + 16 >> 2] = 362e3, uf(g, 39728, k)) : (f[l >> 2] = 5 + (e >>> 1), f[l + 4 >> 2] = c, f[l + 8 >> 2] = a, f[l + 12 >> 2] = 255, uf(g, 39789, l)), c = 0 | ud(0, 0), i = (0 | ud(0, 1)) - c | 0, k = (k = 0 | ud(1, 0)) - (0 | ud(0, 0 | j[168356])) | 0, a = 0; !((0 | a) >= (0 | j[168355])); ) {
    for (l = 0 | f[10824], m = 0 | f[10822], o = 0 | j[168356], e = 0, h = c; (0 | e) != (0 | o); ) {
     for (q = 0 | X(e, l), g = 0; (0 | g) != (0 | l); ) b[r + (g + q) >> 0] = (0 | j[205638 + (j[m + (h << 3) + (g << 1) >> 1] << 1) >> 1]) >>> 8, g = g + 1 | 0;
     e = e + 1 | 0, h = i + h | 0;
    }
    q = c + (0 | X(i, o)) | 0, We(r, 536870911 & l, 0 | j[168356], 0 | f[10966]), a = a + 1 | 0, c = k + q | 0;
   }
   Bd(r), u = s;
  }, wg, wg, wg, wg, wg, wg, wg, wg, wg ];
  return {
   _llvm_bswap_i32: pg,
   _main: function(a, c) {
    var e = 0, g = 0, h = 0, i = 0, k = 0, l = 0, m = 0, o = 0, q = 0, r = 0, s = 0, t = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0;
    aa = u, u = u + 208 | 0, $ = aa + 200 | 0, _ = aa + 192 | 0, Y = aa + 184 | 0, W = aa + 168 | 0, V = aa + 160 | 0, U = aa + 152 | 0, T = aa + 144 | 0, S = aa + 136 | 0, R = aa + 128 | 0, Q = aa + 120 | 0, O = aa + 112 | 0, N = aa + 104 | 0, M = aa + 96 | 0, L = aa + 88 | 0, K = aa + 80 | 0, J = aa + 72 | 0, I = aa + 64 | 0, H = aa + 56 | 0, G = aa + 48 | 0, F = aa + 40 | 0, E = aa + 32 | 0, Z = aa + 24 | 0, P = aa + 16 | 0, v = aa + 8 | 0, r = aa, f[(c |= 0) + ((a |= 0) << 2) >> 2] = 363081, s = 1, A = 0, w = 0, t = 0, B = -1, C = -1, D = -1;
    a: for (;;) {
     if (e = 0 | f[c + (s << 2) >> 2], 43 != (2 | ((o = 0 | b[e >> 0]) << 24 >> 24) - 2)) {
      z = 37;
      break;
     }
     q = s + 1 | 0, h = 0 | le(39803, e = 0 | b[e + 1 >> 0], 13);
     b: do {
      if (0 | h) for (i = (0 | b[h - 39803 + 39816 >> 0]) - 48 | 0, h = 0; ;) {
       if ((0 | h) >= (0 | i)) break b;
       if (!(((0 | b[f[c + (h + q << 2) >> 2] >> 0]) - 48 | 0) >>> 0 < 10)) {
        z = 7;
        break a;
       }
       h = h + 1 | 0;
      }
     } while (0);
     switch (h = c + (q << 2) | 0, k = s + 2 | 0, m = s + 5 | 0, l = c + (k << 2) | 0, i = s + 3 | 0, 0 | e) {
     case 101:
      s = q, w = 1, D = m = D, C = o = C, B = x = B, t = y = t, A = z = A;
      continue a;

     case 52:
      z = 35;
      break a;

     case 110:
      Vf(0 | f[h >> 2]), s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 98:
      g = +Vf(0 | f[h >> 2]), n[38] = g, s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 114:
      for (h = 0, e = q; ;) {
       if (4 == (0 | h)) {
        s = m, D = l = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
        continue a;
       }
       Vf(0 | f[c + (e << 2) >> 2]), h = h + 1 | 0, e = e + 1 | 0;
      }

     case 67:
      Vf(0 | f[h >> 2]), Vf(0 | f[l >> 2]), s = i, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 103:
      if (g = +Vf(0 | f[h >> 2]), p[17] = g, ba = +Vf(0 | f[l >> 2]), p[18] = ba, 0 == g) {
       s = i, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
       continue a;
      }
      p[17] = 1 / g, s = i, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 107:
      o = C, q = B, x = t, y = w, z = A, s = k, D = 0 | Yf(0 | f[h >> 2]), C = o, B = q, t = x, w = y, A = z;
      continue a;

     case 83:
      o = D, q = B, x = t, y = w, z = A, s = k, C = 0 | Yf(0 | f[h >> 2]), D = o, B = q, t = x, w = y, A = z;
      continue a;

     case 116:
      o = D, q = C, x = t, y = w, z = A, s = k, B = 0 | Yf(0 | f[h >> 2]), D = o, C = q, t = x, w = y, A = z;
      continue a;

     case 113:
      s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 109:
      m = 0 | Yf(0 | f[h >> 2]), f[10810] = m, s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 72:
      m = 0 | Yf(0 | f[h >> 2]), f[10807] = m, s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 115:
      o = 0 | Yf(m = 0 | f[h >> 2]), f[10804] = (0 | o) > -1 ? o : 0 - o | 0, m = 0 == (0 | Yd(m, 39860)) & 1, f[10805] = m, s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 111:
      if (e = 0 | f[h >> 2], ((0 | b[e >> 0]) - 48 | 0) >>> 0 >= 10) {
       s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
       continue a;
      }
      if (0 | b[e + 1 >> 0]) {
       s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
       continue a;
      }
      m = 0 | Yf(e), f[40] = m, s = k, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 79:
      o = D, q = C, x = B, y = t, z = w, s = k, A = 0 | f[h >> 2], D = o, C = q, B = x, t = y, w = z;
      continue a;

     case 105:
      s = q, t = 1, D = m = D, C = o = C, B = x = B, w = y = w, A = z = A;
      continue a;

     case 118:
      f[10808] = 1, s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 102:
      f[10806] = 1, s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 65:
      e = m;
      break;

     case 97:
      e = q;
      break;

     case 119:
      f[10809] = 1, s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 77:
      f[39] = o << 24 >> 24 == 43 ? 3 : 0, s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
      continue a;

     case 87:
      f[10811] = 1, s = q, D = l = D, C = m = C, B = o = B, t = x = t, w = y = w, A = z = A;
      continue a;

     default:
      z = 36;
      break a;
     }
     s = e, D = m = D, C = o = C, B = q = B, t = x = t, w = y = w, A = z = A;
    }
    c: do {
     if (7 == (0 | z)) f[r >> 2] = e, uf(22792, 39829, r), e = 1; else if (35 == (0 | z)) f[10811] = 1, p[18] = 1, p[17] = 1, e = 52, z = 36; else if (37 == (0 | z)) {
      if ((0 | s) == (0 | a)) {
       We(39887, 21, 1, 22792), e = 1;
       break;
      }
      for (y = (0 | B) > -1, x = 0 != (0 | t), q = 0 != (0 | w), r = 0 != (0 | A), t = (0 | D) > -1, v = (0 | C) > 0, e = 0; ;) {
       if ((0 | s) >= (0 | a)) break c;
       f[10837] = 0, f[10822] = 0, f[18281] = 0, f[10966] = 23160, w = 0 | f[c + (s << 2) >> 2], f[10813] = w, w = 0 | _e(w, 29460), f[10815] = w;
       do {
        if (w) {
         switch (sd(), h = 0 | f[10956], l = 0 == (0 | h), e = 1 & l, y ? (f[18321] = B, i = B) : i = 0 | f[18321], 511 & (((i + 3600 | 0) >>> 0) % 360 | 0)) {
         case 270:
          i = 5, z = 49;
          break;

         case 180:
          i = 3, z = 49;
          break;

         case 90:
          i = 6, z = 49;
         }
         49 == (0 | z) && (z = 0, f[18321] = i), f[51263] = 54;
         do {
          if (q) {
           if (k = 0 | f[18317], w = 0 == (0 | k), e = 1 & w, w) {
            f[P >> 2] = f[10813], uf(22792, 39909, P), z = 78;
            break;
           }
           if (i = 0 | f[18492]) {
            f[18282] = i, f[10960] = k, d[168355] = 0 | d[168365], d[168356] = 0 | d[168364], f[10812] = 0, f[10824] = 3, z = 57;
            break;
           }
           tf(0 | f[10815], k, 0), h = 0 | f[18491], f[51263] = h;
           break;
          }
          i = 0 | f[18282], z = 57;
         } while (0);
         do {
          if (57 == (0 | z)) {
           if (z = 0, 23 == (0 | i) && (w = 0 | j[168355], d[168355] = (1 & w) + w, w = 0 | j[168356], d[168356] = (1 & w) + w), 0 == (0 | b[43072]) | x & 0 != (0 | f[10808]) ^ 1) l && (f[V >> 2] = f[10813], uf(22792, 40219, V), z = 75); else {
            f[Z >> 2] = f[10813], Sf(39931, Z), z = 0 | ka(73264), f[E >> 2] = z, Sf(39946, E), f[F >> 2] = 43072, f[F + 4 >> 2] = 43136, Sf(39960, F), 0 | b[361424] && (f[G >> 2] = 361424, Sf(39975, G));
            d: do {
             if (0 | f[10845]) for (Sf(39986, H), h = 24; ;) {
              if ((0 | h) <= -1) break d;
              f[I >> 2] = (0 | f[10845]) >>> h & 255, f[I + 4 >> 2] = 0 | h ? 46 : 10, Sf(4e4, I), h = h + -8 | 0;
             }
            } while (0);
            f[J >> 2] = ~~+n[18318], Sf(40005, J), Sf(40020, K), (g = +n[18320]) > 0 & g < 1 && (Sf(40030, L), g = 1 / +n[18320], n[18320] = g), p[M >> 3] = g, Sf(40033, M), p[N >> 3] = +n[18319], Sf(40044, N), p[O >> 3] = +n[18455], Sf(40063, O), f[Q >> 2] = 0 | f[18489] ? 40113 : 40117, Sf(40087, Q), f[R >> 2] = f[10956], Sf(40120, R), 1 != (g = +p[5401]) && (p[S >> 3] = g, Sf(40146, S)), 0 | f[18317] && (z = 0 | j[168365], f[T >> 2] = j[168364], f[T + 4 >> 2] = z, Sf(40173, T)), z = 0 | j[168360], f[U >> 2] = j[168359], f[U + 4 >> 2] = z, Sf(40196, U), z = 75;
           }
           if (75 == (0 | z) && (z = 0, !(h = 0 | f[10956]))) {
            z = 78;
            break;
           }
           if (i = 0 | f[10812], o = 0 != (0 | i), d[168357] = 1 & o, o &= 1, l = ((0 | j[168355]) + o | 0) >>> o, d[172469] = l, o = ((0 | j[168356]) + o | 0) >>> o & 65535, d[168358] = o, x) {
            f[W >> 2] = f[10813], f[W + 4 >> 2] = 43072, f[W + 8 >> 2] = 43136, Sf(40242, W), z = 78;
            break;
           }
           for (0 | (k = 0 | f[10968]) && (w = 0 | Ad(k), f[18281] = w), 0 != (0 | i) | 1 == (0 | f[10824]) ? (m = 43348, k = 7 + (0 | j[168360]) | 0, l = 1, i = 0 | d[168359]) : (m = 43288, k = 65535 & l, l = 3, i = o), i = 0 | Cd(k, (65535 & i) << l), f[m >> 2] = i, (i = 0 | f[10804]) >>> 0 >= h >>> 0 && (f[Y >> 2] = f[10813], f[Y + 4 >> 2] = i, uf(22792, 40264, Y)), vf(0 | f[10815], 0 | f[10960], 0), Ma[63 & f[18282]](), w = 0 | d[168356], h = ((i = 0 | j[168357]) + (0 | j[168355]) | 0) >>> i, d[172469] = h, i = (i + (65535 & w) | 0) >>> i, d[168358] = i, 0 | f[10837] && (w = 0 | Cd(65535 & h, i << 3 & 524280), f[10822] = w, Gc(), Bd(0 | f[10837])), 0 | f[18494] && Hc(), i = 0 | j[168369], h = 0; ;) {
            if (3 == (0 | h)) {
             h = 0;
             break;
            }
            i = (0 | i) > (0 | (w = 0 | j[336732 + (h << 1) >> 1])) ? w : i, h = h + 1 | 0;
           }
           for (;4 != (0 | h); ) d[(w = 336732 + (h << 1) | 0) >> 1] = (0 | j[w >> 1]) - i, h = h + 1 | 0;
           for (o = (0 | f[10838]) + i | 0, f[10838] = o, l = 0 | d[168370], k = 0 | X(65535 & (h = 0 | d[168371]), 65535 & l), m = 0 | j[168372], i = 0; ;) {
            if ((0 | i) >= (0 | k)) {
             k = 0, i = l;
             break;
            }
            m = (0 | m) > (0 | (w = 0 | j[336732 + (i + 6 << 1) >> 1])) ? w : m, i = i + 1 | 0;
           }
           for (;!((0 | k) >= (0 | X(65535 & i, 65535 & h))); ) d[(i = 336732 + (k + 6 << 1) | 0) >> 1] = (0 | j[i >> 1]) - m, k = k + 1 | 0, i = 0 | d[168370], h = 0 | d[168371];
           for (h = t ? D : m + o | 0, f[10838] = h, i = 0; 4 != (0 | i); ) d[(w = 336732 + (i << 1) | 0) >> 1] = (0 | j[w >> 1]) + h, i = i + 1 | 0;
           v && (f[10839] = C), m = 0 == (0 | (i = 0 | f[18493]));
           e: do {
            if (!m) for (k = 0 | f[10822], h = 0; ;) {
             if ((0 | h) >= (0 | X(j[168355] << 2, 0 | j[168356]))) break e;
             (0 | d[(l = k + (h << 1) | 0) >> 1]) < 0 && (d[l >> 1] = 0), h = h + 1 | 0;
            }
           } while (0);
           Lc();
           f: do {
            if (0 | f[10980]) for (f[10824] = 3, k = 0 | f[10822], h = 0; ;) {
             if ((0 | h) >= (0 | X(0 | j[168356], 0 | j[168355]))) {
              h = 3;
              break f;
             }
             d[(w = k + (h << 3) + 2 | 0) >> 1] = ((0 | j[k + (h << 3) + 6 >> 1]) + (0 | j[w >> 1]) | 0) >>> 1, h = h + 1 | 0;
            } else h = 0 | f[10824];
           } while (0);
           m & 3 == (0 | h) && Mc(), m & 2 == (0 | (h = 0 | f[10807])) && (Nc(), i = 0 | f[18493], h = 0 | f[10807]), (0 | h) > 2 & 0 == (0 | i) && Oc(), td(), h = 0 | f[51263];
          }
         } while (0);
         if (78 == (0 | z)) {
          z = 0, ef(0 | f[10815]), h = s;
          break;
         }
         if (i = 34 == (0 | h) ? 30305 : 40307 + (5 * (0 | f[10824]) | 0) - 5 | 0, h = 0 | f[10813], k = 0 | Ad(64 + (0 | Ne(r ? A : h)) | 0), r ? Te(k, A) : (Te(k, h), 0 | (h = 0 | Cf(k, 46)) && (b[h >> 0] = 0), 0 | f[10805] && (w = k + (0 | Ne(k)) | 0, f[_ >> 2] = (0 | f[10956]) - 1, m = 0 | Re(0, 0, 0, _), o = 0 | f[10804], f[$ >> 2] = m, f[$ + 4 >> 2] = o, $d(w, 40327, $)), q && (w = k + (0 | Ne(k)) | 0, b[w >> 0] = 0 | b[40333], b[w + 1 >> 0] = 0 | b[40334], b[w + 2 >> 0] = 0 | b[40335], b[w + 3 >> 0] = 0 | b[40336], b[w + 4 >> 0] = 0 | b[40337], b[w + 5 >> 0] = 0 | b[40338], b[w + 6 >> 0] = 0 | b[40339]), Zf(k, i)), w = 0 | _e(k, 40340), f[10966] = w, w ? (Ma[63 & f[51263]](), ef(0 | f[10815]), 23160 != (0 | (h = 0 | f[10966])) && ef(h)) : (Rf(k), e = 1), Bd(0 | f[18281]), Bd(k), 0 | (h = 0 | f[10822]) && Bd(h), 0 | f[10805]) {
          if (w = 1 + (0 | f[10804]) | 0, f[10804] = w, w >>> 0 < (0 | f[10956]) >>> 0) {
           h = s + -1 | 0;
           break;
          }
          f[10804] = 0, h = s;
          break;
         }
         h = s;
        } else Rf(0 | f[10813]), h = s, e = 1;
       } while (0);
       s = h + 1 | 0;
      }
     }
    } while (0);
    return 36 == (0 | z) && (f[v >> 2] = e, uf(22792, 39864, v), e = 1), u = aa, 0 | e;
   },
   stackSave: function() {
    return 0 | u;
   },
   _i64Subtract: ag,
   ___udivdi3: jg,
   setThrew: function(a, b) {
    a |= 0, b |= 0, x || (x = a, y = b);
   },
   _bitshift64Lshr: fg,
   _bitshift64Shl: dg,
   _bitshift64Ashr: eg,
   _memset: cg,
   _sbrk: mg,
   _memcpy: gg,
   stackAlloc: function(a) {
    var b = 0;
    return b = u, u = u + (a |= 0) | 0, u = u + 15 & -16, 0 | b;
   },
   ___muldi3: lg,
   ___uremdi3: og,
   getTempRet0: function() {
    return 0 | I;
   },
   setTempRet0: function(a) {
    I = a |= 0;
   },
   _i64Add: bg,
   dynCall_iiii: function(a, b, c, d) {
    return a |= 0, b |= 0, c |= 0, d |= 0, 0 | La[7 & a](0 | b, 0 | c, 0 | d);
   },
   _llvm_bswap_i16: qg,
   _emscripten_get_global_libc: function() {
    return 205552;
   },
   dynCall_ii: function(a, b) {
    return a |= 0, b |= 0, 0 | Ka[1 & a](0 | b);
   },
   ___errno_location: function() {
    return 22980;
   },
   _free: Bd,
   runPostSets: function() {},
   establishStackSpace: function(a, b) {
    u = a |= 0, v = b |= 0;
   },
   _memmove: ng,
   stackRestore: function(a) {
    u = a |= 0;
   },
   _malloc: Ad,
   _emscripten_replace_memory: function(newBuffer) {
    return !(16777215 & q(newBuffer) || q(newBuffer) <= 16777215 || q(newBuffer) > 2147483648 || (b = new a(newBuffer), d = new c(newBuffer), f = new e(newBuffer), h = new g(newBuffer), j = new i(newBuffer), l = new k(newBuffer), n = new m(newBuffer), p = new o(newBuffer), buffer = newBuffer, 0));
   },
   dynCall_v: function(a) {
    Ma[63 & (a |= 0)]();
   }
  };
 }(Module.asmGlobalArg, Module.asmLibraryArg, buffer), _malloc = (Module._llvm_bswap_i32 = asm._llvm_bswap_i32, Module._main = asm._main, Module.stackSave = asm.stackSave, Module.getTempRet0 = asm.getTempRet0, Module.___udivdi3 = asm.___udivdi3, Module.setThrew = asm.setThrew, Module._bitshift64Lshr = asm._bitshift64Lshr, Module._bitshift64Shl = asm._bitshift64Shl, Module._bitshift64Ashr = asm._bitshift64Ashr, Module._memset = asm._memset, Module._sbrk = asm._sbrk, Module._memcpy = asm._memcpy, Module.stackAlloc = asm.stackAlloc, Module.___muldi3 = asm.___muldi3, Module.___uremdi3 = asm.___uremdi3, Module._i64Subtract = asm._i64Subtract, Module.setTempRet0 = asm.setTempRet0, Module._i64Add = asm._i64Add, Module._llvm_bswap_i16 = asm._llvm_bswap_i16, Module._emscripten_get_global_libc = asm._emscripten_get_global_libc, Module.___errno_location = asm.___errno_location, Module._free = asm._free, Module.runPostSets = asm.runPostSets, Module.establishStackSpace = asm.establishStackSpace, Module._memmove = asm._memmove, Module.stackRestore = asm.stackRestore, Module._malloc = asm._malloc), _emscripten_replace_memory = Module._emscripten_replace_memory = asm._emscripten_replace_memory;
 Module.dynCall_ii = asm.dynCall_ii, Module.dynCall_iiii = asm.dynCall_iiii, Module.dynCall_v = asm.dynCall_v, Runtime.stackAlloc = Module.stackAlloc, Runtime.stackSave = Module.stackSave, Runtime.stackRestore = Module.stackRestore, Runtime.establishStackSpace = Module.establishStackSpace, Runtime.setTempRet0 = Module.setTempRet0, Runtime.getTempRet0 = Module.getTempRet0, function(s) {
  for (var i = s.length; i--; ) HEAPU8[Runtime.GLOBAL_BASE + i] = s.charCodeAt(i);
 }('\r\xc6\x88D\xa1e\xda?\x18\tm9\x97\xe2\xd6?X\x1d9\xd2\x19\x18\xc7?\xf6_\xe7\xa6\xcd8\xcb?\x18\tm9\x97\xe2\xe6?U\xf7\xc8\xe6\xaay\xb2?K\xaf\xcd\xc6J\xcc\x93?8\x81\xe9\xb4n\x83\xbe?\x91\xd6\x18tBh\xee?\0\0\0\0\0\0\xf0?\0\0\0\0\0\0\xf0?\0\0\0\0\0\0\xf0?\0\0\0\0\0\0\xf0?\0\0\0\0\0\0\xf0?\0\0\0\0\0\0\xf0?\0\0\0\0\0\0\xf0?\xcd\xcc\xcc\xcc\xcc\xcc\xdc?\0\0\0\0\0\0\x12@\0\0\x80?\x01\0\0\0\x01\0\0\0\x16Qs?\0\0\x80?K\\\x8b?\0\0\0\0Pentax\0\0\0\0\0\0Optio 33WR\0\0\0\0\0\0\x03\0\0\0Nikon\0\0\0\0\0\0\0E3200\0\0\0\0\0\0\0\0\0\0\x002\0\0\0Nikon\0\0\0\0\0\0\0E3700\0\0\0\0\0\0\0\0\0\0\x003\0\0\0Olympus\0\0\0\0\0C740UZ\0\0\0\0\0\0\0\0\0\0\b\0\0\0\x07\0\0\0\x06\0\0\0\t\0\0\0\v\0\0\0\n\0\0\0\x05\0\0\0\f\0\0\0\x0e\0\0\0\r\0\0\0\xa2\0\0\0\xc0\0\0\0\xbb\0\0\0\\\0\0\0\0\0\0\0|\x02\0\0\xa8\x01\0\0\xd4\0\0\0\0\0\x80?\0\0\x80?\0\0\x80?\0\0\0\0\xd7\xb3\xdd?\xd7\xb3\xdd\xbf\0\0\0\0\0\0\0\0\0\0\x80\xbf\0\0\x80\xbf\0\0\0@\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80?\0\0\x80?\0\0\x80?\0\0\x80?\0\0\x80?\0\0\x80\xbf\0\0\x80?\0\0\x80\xbf\0\0\x80?\0\0\x80?\0\0\x80\xbf\0\0\x80\xbf\0\0\x80?\0\0\x80\xbf\0\0\x80\xbf\0\0\x80?\0\0\x80?\xd7\xb3]?\0\0\0\xbf\0\0\0\0\0\0\x80?\xd7\xb3]\xbf\0\0\0\xbf\0\0\0\0\0\0\x80?\0\0\0\0\0\0\x80?\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80?\0\0\x80?\0\0\x80?\0\0\x80?\0\0\x80?\0\0\x80\xbf\0\0\x80?\0\0\x80\xbf\0\0\x80?\0\0\x80?\0\0\x80\xbf\0\0\x80\xbf\0\0\x80?\0\0\x80\xbf\0\0\x80\xbf\0\0\x80?80\x02@28:\xbfo\x10\x9d\xbenMj\xbeL\xa9\x9d?\x06\x7f?\xbb7T\f\xbc\x99\xf3\x1c\xbe$\xb7\x94?I\x8a\x05\0\xbas\0\0\xbfs\0\0\xc6s\0\0\xces\0\0\xd4s\0\0\xdcs\0\0\xe5s\0\0\xees\0\0\xf8s\0\0I\x8a\x05\0\x01t\0\0\nt\0\0\x13t\0\0\x1ct\0\0%t\0\0/t\0\x009t\0\0Ct\0\0It\0\0Ot\0\0Ut\0\0^t\0\0I\x8a\x05\0it\0\0I\x8a\x05\0I\x8a\x05\0tt\0\0\x80t\0\0I\x8a\x05\0I\x8a\x05\0I\x8a\x05\0I\x8a\x05\0\x8bt\0\0\x98t\0\0I\x8a\x05\0\xa3t\0\0I\x8a\x05\0\xaft\0\0\0\0\x80?\0\0\x80?\0\0\x80?%\xfa\0\0(\xfa\0\0\'\xfa\0\0)\xfa\0\0\xff\xff\xff\xff\xff\xff\xff\xff*\xfa\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xff\x0f\0\x009x\0\0\0\0\0\0\xae,N\xf1\xa5\xfb\x97\xf6\xba&\xc1\t5\xfb\xf7\b\xb4\x14\0\0\0\0\0\0Kx\0\0\0\0\0\0\x90S\xeb\xe9\xe7\xf2f\tJ\x1fa\xfe\xfe\x1b\x93\x05\x1e\b\0\0\0\0\0\0[x\0\0\0\0\0\0\xde_\x94\xd5\xb7\xf2.\xfaj,\xd7\xfe*\v\xa3\xfd\x99\f\0\0\0\0\0\0kx\0\0\0\0\0\0\x02P\xfc\xe3\xcb\xf3\xf7\xfb\xaa(\xe3\xfe\xee\t\xe2\0@\f\0\0\0\0\0\0{x\0\0\0\0\0\0M&\x7f\xf5\xe0\xfaU\xe9\b3\xfc\vz\xf6\x03\fG"\0\0\0\0\0\0\x89x\0\0\0\0\xa0\x0f,\x18\xc3\xfa\x86\xfc\0\xe4\x998y\v\xb0\xf5\x9c\f#!\0\0\0\0\0\0\x97x\0\0\0\0\x96<j\x189\xfd\xd8\xfc\xdf\xeb\xfa1L\n\x1f\xfb\x96\b\xea\x15\0\0\0\0\0\0\xa5x\0\0\0\0\x80<B\x1a\x85\xfd=\xfcA\xef\xac0\xec\x07t\xfcr\b$\x16\0\0\0\0\0\0\xbbx\0\0\0\0\xf0<l\x12[\x02\xc2\xfc\x8a\xe1r<\xb0\t(\xfa\x91\x07\xfb\x19\0\0\0\0\0\0\xd0x\0\0\0\0l\x0e\xcb\x18!\xfe4\xfc\x97\xdfR>\xb0\tP\xf8S\b\xe1\x1d\0\0\0\0\0\0\xddx\0\0\0\0\x82<z\x1b\xdc\xfc\n\xfc\xbc\xee\x141\n\b\xad\xfc\xca\x07~\x16\0\0\0\0\0\0\xeax\0\0\0\0\x105d\x1c\xc6\xfb7\xfc\xa6\xef?.g\n\xc7\xfc\xed\x07\xcf\x16\0\0\0\0\0\0\xffx\0\0\0\0\x105\xbc\x1a\x1c\xfc\xa8\xfc\xdc\xf0\xf1-\\\t\xaf\xfd\xec\x066\x18\0\0\0\0\0\0\fy\0\0\0\0\xa0\x0f\x05 0\xf8\xa2\xfb\xc6\xe5\xff7 \n\x18\xf6j\fJ \0\0\0\0\0\0\x1ay\0\0\0\0\0\0K77\xec\x9a\xfaj\xe6)9\xf7\x07\xa9\xf9 \x07\xa1\x19\0\0\0\0\0\0)y\0\0\0\0\xff\x0f\xc7\x19\xe7\xfd\x85\xfcy\xe0\xa7=x\tA\xf8\xba\b&\x1d\0\0\0\0\0\x007y\0\0\0\0\0\0q\x18\xd1\xfe\x18\xfc8\xe1\x05=\\\tN\xf9p\x07\x86\x1b\0\0\0\0\0\0Ey\0\0\0\0`?\xb7\x17\x15\xfd\xa8\xfc\x1b\xe2\x05<\x89\t\x17\xf8\xf9\t\x93\x1c\0\0\0\0\0\0Sy\0\0\0\0\x93=8\x13h\x02\xaf\xfd\xa3\xe6\x8c6\xe0\n\x12\xf9j\f]\x1b\0\0\0\0\0\0ay\0\0\0\0\xf7/?\x1a\x1e\xfcc\xfc\xc8\xee\x8a0\xa3\b\x89\xfcQ\b\xa3\x17\0\0\0\0\0\0oy\0\0\0\0\xc7;z\x1b\xdc\xfc\n\xfc\xbc\xee\x141\n\b\xad\xfc\xca\x07~\x16\0\0\0\0\0\0}y\0\0\0\0\0\0!\x1da\xfdW\xfc\x0f\xed\xcf0S\nC\xfb2\tt\x15\0\0\0\0\0\0\x8by\0\0\0\0\x0f5\xca\x19\xb7\xfcU\xfc\x88\xee\xaa0\xc7\b1\xfc\xf7\x07\x04\x18\0\0\0\0\0\0\x9ay\0\0\0\0\xa0\x0f\x05 0\xf8\xa2\xfb\xc6\xe5\xff7 \n\x18\xf6j\fJ \0\0\0\0\0\0\xa9y\0\0\0\0\xff\x0f\x82\x17\x97\xfd;\xfc;\xde\t>\x9f\v\x06\xfa\xb7\x06\xda\x1d\0\0\0\0\0\0\xb8y\0\0\0\0\x8e\x0e\x8e\x1b#\xfa"\xfc$\xe0\xb8<\xfc\n\x02\xfb\x86\x05t\x1e\0\0\0\0\0\0\xc7y\0\0\0\0\r9\x98\x16\xfa\xfe\xcb\xfc\x8d\xe2\xd8:p\nB\xf8y\n\x03\x1d\0\0\0\0\0\0\xd6y\0\0\0\0y4\x9b\x12\xc8\x02z\xfd[\xe5?8P\n\x7f\xf8\xcc\f\xa1\x19\0\0\0\0\0\0\xe5y\0\0\0\0\xd7=\x1d\x1bt\xfb\xa7\xfc\x0f\xf1M-\xe6\t`\xfe\x04\x06\x97\x17\0\0\0\0\0\0\xf4y\0\0\0\0\x105=\x19u\xfc\x8e\xfc4\xef\x98/J\t\xcd\xfc\x98\x07+\x17\0\0\0\0\0\0\x03z\0\0\0\0M5\xca\x19\xb7\xfcU\xfc\x88\xee\xaa0\xc7\b1\xfc\xf7\x07\x04\x18\0\0\0\0\0\0\x12z\0\0\0\0\0<\xca\x19\xb7\xfcU\xfc\x88\xee\xaa0\xc7\b1\xfc\xf7\x07\x04\x18\0\0\0\0\0\0!z\0\0\0\0\x8e6\xda\x18\xc9\xfc\xb1\xfc\xb6\xeeM/8\n\x19\xfdA\x07\x03\x16\0\0\0\0\0\x000z\0\0\0\0\x0f5\xda\x18\xc9\xfc\xb1\xfc\xb6\xeeM/8\n\x19\xfdA\x07\x03\x16\0\0\0\0\0\0?z\0\0\0\0C\x0es\x1a\x8d\xfb/\xfcv\xe1\x13;p\v$\xfb\x9d\x05m\x1d\0\0\0\0\0\0Oz\0\0\0\0\x105,\x19x\xfc\x83\xfc-\xee\x140\xe7\ty\xfc\xe0\x07H\x1a\0\0\0\0\0\0_z\0\0\0\0\xc27=\x19u\xfc\x8e\xfc4\xef\x98/J\t\xcd\xfc\x98\x07+\x17\0\0\0\0\0\0oz\0\0\0\0\x105\x1b\x1b\b\xfc\x9e\xfc\xb4\xee\xb90\x81\bi\xfb\x82\b\x12\x18\0\0\0\0\0\0\x7fz\0\0\0\0\0\0\xda\x18\xc9\xfc\xb1\xfc\xb6\xeeM/8\n\x19\xfdA\x07\x03\x16\0\0\0\0\0\0\x8cz\0\0\0\0\0\0\0\x19 \xfe\x88\xfcR\xebh4\xff\x07\xf0\xfa\x9b\b\xf9\x17\0\0\0\0\0\0\x9az\0\0\0\0\0\0\xca\x19\xb7\xfcU\xfc\x88\xee\xaa0\xc7\b1\xfc\xf7\x07\x04\x18\0\0\0\0\0\0\xa6z\0\0\0\0\xb0;\xe3\x16-\xff^\xfc\xc1\xdf\x91>1\t<\xf9_\x07\x18\x1d\0\0\0\0\0\0\xbdz\0\0\0\0\x80\x0eu\x19\xa6\xfd\x9d\xfc\f\xe06>J\t\xae\xf9\xeb\x06\xd1\x1d\0\0\0\0\0\0\xd3z\0\0\0\0\xb0;~\x17$\xff\xe5\xfc\xf3\xef\xee.9\t\xcf\xfd \x07\x9b\x16\0\0\0\0\0\0\xe8z\0\0\0\0\xb0;\x93\x18\xe4\xfd0\xfcb\xdf\x11?\x07\tN\xf9B\x07\x9e\x1c\0\0\0\0\0\0\xfez\0\0\0\0\x80\x0e`\x18.\xfe\xca\xfc\f\xe0\xd1=\xc4\t\xf7\xf8\x92\x07j\x1f\0\0\0\0\0\0\x15{\0\0\0\0\x80\x0ex\x18\xba\xfd,\xfd\x88\xdfL>\xc8\t0\xf9\x7f\x07\xd8!\0\0\0\0\0\0*{\0\0\0\0 \x0e\x16\x11/\x0e1\xf9\xa0\xe2l;\xa8\t\xb4\xf40\x0e\xe1\x1f\0\0\0\0\0\x008{\0\0\0\0N<\xbf\x1a\x9a\xfd\n\xfc\xc3\xed\xc11[\bS\xfb\xb8\t\xbe\x1a\0\0\0\0\0\0G{\0\0\0\0\0\0\xac\x1d.\xfc9\xfc8\xed\x1b1\xc7\t\x8a\xfa\x07\nx\x16\0\0\0\0\0\0^{\0\0\0\0N<\xbf\x1a\x9a\xfd\n\xfc\xc3\xed\xc11[\bS\xfb\xb8\t\xbe\x1a\0\0\0\0\0\0m{\0\0\0\0 \x0e\x96\x1aM\xff\x04\xfc_\xe0\x1f@\x97\x06=\xf3\x8c\x10\n\x1e\0\0\0\0\0\0z{\0\0U\x03\0\0\xbbE\x94\xd6\x9a\x03\xff\xe2\x16A\xfb\x02\xb4\xf14\x0e\x06W\0\0\0\0\0\0\x89{\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x9e{\0\0\0\0\0\0L\xebv&\xf0\x06l\r\xac\x02c\x0f\\\xea\x97&8\x18\x84\xfa\xa7+\xd9\0\xb2{\0\0\0\0\0\0?\xed\x03%\xa0\x07n\vK\x06\xfe\x0fu\xeb\xb4\';\x17\xee\xf9\x83*#\x02\xc5{\0\0\0\0\0\0U+\xbe\xf0\xfc\xfbI\xec\xcc0?\v\x15\xfc\xd6\x06\xb9\x15\0\0\0\0\0\0\xd9{\0\0\0\0\0\0\x91//\xed\xd3\xfb\xb4\xf9\x88&\x01\b\x9e\xffR\x03w\x11\0\0\0\0\0\0\xed{\0\0\0\0\0\0\xbc3\x83\xea \xfb\x1c\xfa\x82&\x8f\x07\xf2\xfe;\x04\x0e\x11\0\0\0\0\0\0\x01|\0\0\0\0\0\x002\x1d\x03\xf7\xc9\xfd(\xf0\xc0,\x9f\v"\xff\xcc\x02U\x10\0\0\0\0\0\0\x15|\0\0\0\0\0\0T\x1f\x81\xf5V\xfd\x88\xf1g.\x04\b;\xfc\x81\x07\xb4\x15\0\0\0\0\0\0)|\0\0\0\0\0\0\xd2\x1c\x19\xfb\xed\xfb\b\xf0\xdb/\0\b\x94\xfc\x9a\x07\xad\x16\0\0\0\0\0\0>|\0\0\0\0\0\0V\xed\xfb$|\b\x87\x12\x8b\xfb\xf8\x10\xe6\xeb\xb4&\xbd\x17\xe2\xf9++-\x02Q|\0\0\0\0\0\0\x7f#{\xf5\xe7\xfb\xc5\xe5.8\xe9\t\r\xf7\x03\vn\x1e\0\0\0\0\0\0d|\0\0\0\0\0\0\xe5%\xef\xf0g\xfc\xb3\xf3\x11-\x19\x07\xee\xfc\x19\x07\x1b\x14\0\0\0\0\0\0y|\0\0\0\0\0\0\xfc##\xf5\xcf\xfbS\xe6m7-\n\x04\xf7\x1c\v\xf0\x1d\0\0\0\0\0\0\x8c|\0\0\0\0\0\0\x82%\x11\xf1W\xfcX\xf4\xe7,\x8b\x06i\xfe\x87\x05\xb9\x13\0\0\0\0\0\0\xa1|\0\0\0\0\0\0\x1d&\xc8\xf4[\xfc\xac\xe8%6\xfd\b\xaa\xf9\x18\t,\x1c\0\0\0\0\0\0\xb4|\0\0\0\0\0\0\x95&A\xf1\x99\xfcC\xe2\xd79\0\fX\xfa\x19\x05=\x1d\0\0\0\0\0\0\xc7|\0\0\0\0\0\0\x82%\x11\xf1W\xfcX\xf4\xe7,\x8b\x06i\xfe\x87\x05\xb9\x13\0\0\0\0\0\0\xdc|\0\0\0\0\0\0\x82%\x11\xf1W\xfcX\xf4\xe7,\x8b\x06i\xfe\x87\x05\xb9\x13\0\0\0\0\0\0\xf1|\0\0\0\0\0\0\xc8\x1c\xa3\xf7\xaa\xfd\v\xea\xc63A\nv\xfa\xa0\x06o\x16\0\0\0\0\0\0\x04}\0\0\0\0\0\0N\'>\xf2\x19\xfc%\xe2\r;\xaa\n\x03\xfd1\x03\x9b\x1c\0\0\0\0\0\0\x19}\0\0"\0\0\0\xc5\xefZ&\xf9\x05c\x0f\xe7\xff\xaa\x11o\xea\x8e&\xd2\x19B\xf7y*>\x05/}\0\0\0\0\0\0\x9d\xec\xa8&\xbb\b"\x12%\xfc\xc6\x10\xd6\xeb\x1b\'\xe3\x16\x16\xf9\xde+A\x02E}\0\0\0\0\0\0F)\xbc\xf1\x97\xfbh\xe6F9\xd6\x07k\xf7\x15\n\xf6\x1d\0\0\0\0\0\0Y}\0\0\0\0\0\0>!I\xf6T\xfc+\xe5\x977T\v\xf2\xf6\r\v5#\0\0\0\0\0\0m}\0\0\0\0\0\0\xe3\x1f\xe3\xf6E\xfc\xe6\xe5^7\xbf\n\xe3\xf7%\ni\x1f\0\0\0\0\0\0\x81}\0\0\0\0\0\0\xb2"\xf5\xf5\xa1\xfc4\xe7\x9a7\xf0\b\x14\xfa|\b\xa9\x19\0\0\0\0\0\0\x95}\0\0\0\0\0\0["N\xf6\xe3\xfc\x84\xe1+<\r\nr\xfa\xcc\x07\xaa\x1b\0\0\0\0\0\0\xa9}\0\0\0\0\0\0\xf8&\x1e\xf1\xc0\xfc5\xe4\x7f8Z\v{\xfc\xdd\x03\xd1\x1e\0\0\0\0\0\0\xbd}\0\0\0\0\0\0V0h\xec\xe7\xfbs\xf9\xae&\x1e\b\xad\xffT\x03K\x12\0\0\0\0\0\0\xd1}\0\0\0\0\0\0\x804\xf8\xe8\x01\xfb,\xfb~%\x8b\x07L\xff\xe9\x03+\x12\0\0\0\0\0\0\xe5}\0\0\0\0\0\0 \x1f\xfb\xf5\x84\xfd\xc7\xf4\xc9)\xd1\t\xb4\0\x9b\x02s\x10\0\0\0\0\0\0\xfa}\0\0\0\0\0\0g\x1f\xad\xf5r\xfd9\xf1\xde+r\v2\xff\xb2\x02b\x10\0\0\0\0\0\0\x0f~\0\0\0\0\0\x001\x1bk\xf9I\xfd\xef\xed\x912,\x07\xa6\xfbh\b\x8e\x15\0\0\0\0\0\0$~\0\0\0\0\0\0\xb2\x19\xfd\xfe\n\xfe\xaa\xe8\xe62\xed\f\xcc\xfe"\x04j\x13\0\0\0\0\0\0;~\0\0\0\0\0\0\x900o\xed!\xfb\xc2\xf7\xc3)]\x06d\xfeW\x06>\x13\0\0\0\0\0\0S~\0\0\0\0\0\0i3\xb5\xea\xc0\xfa;\xf8\x9e)\xfb\x05\xd1\xff\xf7\x04[\x13\0\0\0\0\0\0k~\0\0\0\0\0\0J*\xba\xf1\x01\xfcq\xf3.,r\x07\0\0\xe7\x03`\x13\0\0\0\0\0\0\x81~\0\0\0\0\0\0\xe10\xc9\xee&\xfb\x88\xf5$(e\t\x92\xfc\xa7\b~\x12\0\0\0\0\0\0\x96~\0\0\0\0\0\0\xe7<\xfe\xe6\xc8\xf9\v\xeb\x8e3x\b\xec\xfa \x07\xd3\x13\0\0\0\0\0\0\xab~\0\0\0\0\0\0\xa1;\xcf\xe7\xea\xf9\xe3\xefT/\xda\x07\x88\xfcg\x06d\x14\0\0\0\0\0\0\xc0~\0\0\0\0\0\0y7D\xeb#\xf99\xe8\x888Q\x06q\xf7!\f\xe4\x14\0\0\0\0\0\0\xd5~\0\0\0\0\0\0D3/\xeb\x92\xfa\xee\xf1\x8a-\x98\x07\xb4\xf9/\v\x15\x13\0\0\0\0\0\0\xea~\0\0\0\0\0\0\xd3$$\xf4A\xfc\xeb\xf5\xaf)w\x07\xf1\xfb\xbe\x07N\x11\0\0\0\0\0\0\xff~\0\0\0\0\0\0\xed8\x96\xea\xf6\xf9\x0e\xfbG&\xbc\x05\xf0\xfbx\x07\xe2\x0e\0\0\0\0\0\0\x14\x7f\0\0\0\0\0\0\xee6\xb1\xebZ\xfa\x98\xed\xb60\xc3\b\xfa\xfa\xec\x07\xe4\x12\0\0\0\0\0\0*\x7f\0\0\0\0\0\x00678\xea\t\xfa9\xf8\xdf)\xf9\x04z\xfb\x89\x07\xfd\r\0\0\0\0\0\0C\x7f\0\0\0\0\0\0J6,\xecY\xfa\x83\xfa}\'\x11\x05\f\xffD\x07g\x0e\0\0\0\0\0\0Y\x7f\0\0\0\0\0\0\x89-;\xf1\x90\xfb(\xf2\xfe+\xeb\b`\xff\xc3\x04\\\x12\0\0\0\0\0\0h\x7f\0\0\0\0\0\0r-\xac\xf0\x98\xfb\x98\xec\x9a2\xdf\x07\xcc\xf9X\n&\x1c\0\0\0\0\0\0u\x7f\0\0\0\0\0\0C*\xdf\xf0\xb5\xfb\xd9\xec\xa25\x97\x04%\xf9\xa7\x0e\x18\x12\0\0\0\0\0\0\x83\x7f\0\0\x80\0\xff\x0f>&\xf6\xf2\xa5\xfd\xef\xf6\xee\'3\b\xa8\xfe\xf9\x04\xbf\x12\0\0\0\0\0\0\x90\x7f\0\0\0\0\0\0>\r\xe0\x01\f\xfe\xe0\xfc\x1a\x0eT\x01\xda\xfd \t\xa8\x04\0\0\0\0\0\0\x99\x7f\0\0\0\0\0\0>\r\xe0\x01\f\xfe\xe0\xfc\x1a\x0eT\x01\xda\xfd \t\xa8\x04\0\0\0\0\0\0\xcdw\0\0\0\0\0\0\xd7N9\xefY\xfe\x9c\xf0\xe2;\x91\x0f\xe8\xfe\x06\x13H&\0\0\0\0\0\0\xa2\x7f\0\0\0\0\x1e\x0fa\x1e\x05\x05\xe3\xfb\xc0\xdb\x9f@d\v\xa3\xf1/\x16\x94\x1b\0\0\0\0\0\0\xb3\x7f\0\0\0\0\0\0\xc4\x19\xe1\xf7\xce\xfdR\xed\xd82\x8d\x076\xfc-\x06=\x14\0\0\0\0\0\0\xbb\x7f\0\0\0\0\0\0\xab\x1a\xaa\xf8$\xfd\x13\xdf\x8c>\x04\n@\xfdP\x02\xe9\x1b\0\0\0\0\0\0\xc6\x7f\0\0\0\0\0\0$+\xd0\xf0\xa0\xfb\xb0\xe3@;\xa0\b\x05\xfa\xe5\b\x85\x1f\0\0\0\0\0\0\xd4\x7f\0\0\0\0\0\0\xdf#"\xf6\xca\xfb\xdb\xe2\xdf:\x0e\n\x1a\xf8\x88\t\xbf!\0\0\0\0\0\0\xe2\x7f\0\0\0\0\0\0z5\x12\xeb>\xfa\xd7\xf2P-\xce\x07|\xff\x12\x06+\x11\0\0\0\0\0\0\xee\x7f\0\0\0\0\0\0z5\x12\xeb>\xfa\xd7\xf2P-\xce\x07|\xff\x12\x06+\x11\0\0\0\0\0\0\xfa\x7f\0\0\0\0\xe9\x0fz5\x12\xeb>\xfa\xd7\xf2P-\xce\x07|\xff\x12\x06+\x11\0\0\0\0\0\0\x07\x80\0\0\0\0\0\0\x14\'m\xf3O\xfb\x84\xe4\xc7:;\b\xb9\xf8\x05\n8\x1e\0\0\0\0\0\0\x13\x80\0\0\0\0\0\0z5\x12\xeb>\xfa\xd7\xf2P-\xce\x07|\xff\x12\x06+\x11\0\0\0\0\0\0\x1f\x80\0\0\x02\x02\0\0\x01-\xfd\xee\xd7\xfb\x84\xe6\xc75\xf2\vF\xfa\xc0\x07\x9d\x17\0\0\0\0\0\0/\x80\0\0\0\0\0\0\t0\xee\xecN\xfb\xc6\xf7\xc3)W\x06\xa8\xff \x05\xb6\x12\0\0\0\0\0\0;\x80\0\0\0\0\0\0\x14\'m\xf3O\xfb\x84\xe4\xc7:;\b\xb9\xf8\x05\n8\x1e\0\0\0\0\0\0K\x80\0\0\0\x02\xff?\x89,n\xee\xe0\xfa \xec\xcf15\n\xba\xfc \x065\x17\0\0\0\0\0\0X\x80\0\0\x80\0\0\0\xcc0\xae\xed\x86\xfa\x87\xe4?<o\x06\x1d\xfa?\b\x11\x1e\0\0\0\0\0\0g\x80\0\0\0\0\0\0\x1f.\xfc\xed\xf2\xfa!\xddHB\xc4\x07\xb8\xf7\xb5\nF\x1f\0\0\0\0\0\0v\x80\0\0\0\0\0\0\f0\n\xec\xe8\xfac\xdc\xf7B\xce\x07e\xf8\x90\t\xa4\x1f\0\0\0\0\0\0\x85\x80\0\0\0\0\0\x002"T\xf5\x05\xfc\xdc\xe3\xdd:\xe4\bZ\xf9\x1e\tF\x1b\0\0\0\0\0\0\x94\x80\0\0\0\0\0\0\xa4.\xb1\xee\x19\xfb\x92\xe5\\8\xee\t\x1f\xfc\x8d\x04\xfd\x1c\0\0\0\0\0\0\xa3\x80\0\0\0\0\0\0\xa4.\xb1\xee\x19\xfb\x92\xe5\\8\xee\t\x1f\xfc\x8d\x04\xfd\x1c\0\0\0\0\0\0\xb2\x80\0\0\0\0\0\0\xa4%\f\xf5$\xfc\xee\xe2\xc0:\x1d\n\xf5\xf8\x07\t\xad!\0\0\0\0\0\0\xc1\x80\0\0\0\0\0\0\xa4%\f\xf5$\xfc\xee\xe2\xc0:\x1d\n\xf5\xf8\x07\t\xad!\0\0\0\0\0\0\xd0\x80\0\0\0\0\0\0T1\xe9\xec\x87\xfa3\xe5\x94:\xaa\x07j\xf7\xde\n\xb3\x1b\0\0\0\0\0\0\xdc\x80\0\0\0\0\0\0\xce\'N\xf2\xe0\xfa\x0f\xe4\xcb:\xbe\b-\xf8_\tQ\x1d\0\0\0\0\0\0\xeb\x80\0\0\0\0\0\0\xfb(\xa1\xf2\x87\xfb\'\xe3\xb3:\xea\t\xef\xf8\xe3\b\xf4!\0\0\0\0\0\0\xfa\x80\0\0\0\0\0\0\xfb(\xa1\xf2\x87\xfb\'\xe3\xb3:\xea\t\xef\xf8\xe3\b\xf4!\0\0\0\0\0\0\t\x81\0\0\0\0\0\x0070]\xee\xfb\xfa\x03\xe43:\x83\t\x99\xf8\xc0\t`"\0\0\0\0\0\0\x18\x81\0\0\0\0\0\x0070]\xee\xfb\xfa\x03\xe43:\x83\t\x99\xf8\xc0\t`"\0\0\0\0\0\0\'\x81\0\0\0\0\0\0\xb9-Z\xef\xad\xfb\x16\xf7\'*\xad\x06\xd5\xfd\xb1\x06Q\x13\0\0\0\0\0\x007\x81\0\0\0\0\0\0\xd5S\xc9\xd5_\xfa\xe4\xf6g)\xcf\x07!\x01k\x03\x17\x1e\0\0\0\0\0\0E\x81\0\0\0\0\0\0\f0\n\xec\xe8\xfac\xdc\xf7B\xce\x07e\xf8\x90\t\xa4\x1f\0\0\0\0\0\0U\x81\0\0\0\0h\x0f\x980\x8e\xf0a\xfb\x9d\xfb\xca%\xac\x06\xad\xffN\x06\xf6\x0f\0\0\0\0\0\0h\x81\0\0\0\0\0\0z5\x12\xeb>\xfa\xd7\xf2P-\xce\x07|\xff\x12\x06+\x11\0\0\0\0\0\0u\x81\0\0\0\0\0\0z5\x12\xeb>\xfa\xd7\xf2P-\xce\x07|\xff\x12\x06+\x11\0\0\0\0\0\0\x82\x81\0\0\0\0\0\x005/\x89\xedG\xfcG\xf3\xe1,\xd2\x07\x01\xfe\xfe\x07\xf0\x11\0\0\0\0\0\0\x93\x81\0\0\0\0\0\x005/\x89\xedG\xfcG\xf3\xe1,\xd2\x07\x01\xfe\xfe\x07\xf0\x11\0\0\0\0\0\0\xa4\x81\0\0\0\0\0\0`)Z\xef\x10\xfcF\xf2[,\xa1\t\x9a\xfc\xe9\x07\xf2\x18\0\0\0\0\0\0\xb3\x81\0\0\0\0\0\0`)Z\xef\x10\xfcF\xf2[,\xa1\t\x9a\xfc\xe9\x07\xf2\x18\0\0\0\0\0\0\xc2\x81\0\0\0\0\0\0\x81/\x97\xee\xd3\xfbV\xecJ2`\t\xe5\xfc\xbc\x06\xf8\x1a\0\0\0\0\0\0\xd0\x81\0\0\0\0\0\0\xc54\xc9\xe7\x1a\xfb\xb2\xee\xbd1I\x07\xb5\xfe\xa1\x05\x9e\x13\0\0\0\0\0\0\xdd\x81\0\0\0\0\0\0\xf8-\x95\xec\x93\xfb\xd8\xec\x7f2\x87\b \xfe\xbb\x06\xfd\x11\0\0\0\0\0\0\xea\x81\0\0\0\0\0\0(0x\xeb\x88\xfb\x8b\xee\x7f2\x8b\x06\xa9\xff\v\x05\xff\x10\0\0\0\0\0\0\xf7\x81\0\0\0\0\0\0\xd2(\x17\xef\x92\xfco\xf3a+u\t\x10\xfd\xde\x06w\x19\0\0\0\0\0\0\x04\x82\0\0\0\0\0\0\xad(d\xf0\x1f\xfcw\xf1x-9\t#\xfd\x04\x06{\x17\0\0\0\0\0\0\x14\x82\0\0\0\0\0\0\xaa,\xac\xecF\xfb^\xf1\n/o\x07f\xfd\xc7\x05s\x14\0\0\0\0\0\0$\x82\0\0\0\0\0\0N+5\xee\xb9\xfcH\xf2.,\xd5\t\xd1\xfc=\x054\x17\0\0\0\0\0\x002\x82\0\0\0\0\0\0\v*0\xeek\xfc\xee\xf2/,\x12\t%\xfeo\x04\xd3\x16\0\0\0\0\0\0@\x82\0\0\0\0\0\0\xad(d\xf0\x1f\xfcw\xf1x-9\t#\xfd\x04\x06{\x17\0\0\0\0\0\0N\x82\0\0\0\0\0\0*-\x02\xec?\xfc2\xf4\xff*\x07\t\xf3\xfd!\x06\xd1\x17\0\0\0\0\0\0]\x82\0\0\0\0\0\0\n!m\xf6\xa9\xfc\v\xee\x9f0g\t=\xfa\xb2\t~\x19\0\0\0\0\0\0k\x82\0\0\0\0\0\0\xad(d\xf0\x1f\xfcw\xf1x-9\t#\xfd\x04\x06{\x17\0\0\0\0\0\0y\x82\0\0\0\0\0\0\xc54\xc9\xe7\x1a\xfb\xb2\xee\xbd1I\x07\xb5\xfe\xa1\x05\x9e\x13\0\0\0\0\0\0\x87\x82\0\0\0\0\0\0\n!m\xf6\xa9\xfc\v\xee\x9f0g\t=\xfa\xb2\t~\x19\0\0\0\0\0\0\x95\x82\0\0\0\0\0\0\xc54\xc9\xe7\x1a\xfb\xb2\xee\xbd1I\x07\xb5\xfe\xa1\x05\x9e\x13\0\0\0\0\0\0\xa2\x82\0\0\0\0\0\0$$p\xf5\xd8\xfb\xfb\xe8\xb97\xb5\x06\xb3\xfb%\t\xfd\x10\0\0\0\0\0\0\xae\x82\0\0\0\0\0\0q\x1by\xfa@\xfd\xbc\xeb\xc55\x90\x05 \xfb\xb6\n\x96\x17\0\0\0\0\0\0\xbd\x82\0\0\0\0\0\0C6Y\xe8\xdd\xfc/\xfe\xbf&\x82\x02I\bR\0\v\x05\0\0\0\0\0\0\xca\x82\0\0\b\0\0\0sD%\xed2\xf6\xf4\x02b!w\xff\xe1\x17q\x06\xca\b\0\0\0\0\0\0\xd8\x82\0\0\b\0\0\0\x8cPl\xe2\x0f\xf5\x99\xffY\'t\xfe\xdf\r\x17\xff\xac\b\0\0\0\0\0\0\xe6\x82\0\0\0\0\0\0t*\xc4\xf8|\xfd\xff\xf9K+\xe4\x01\'\tt\x02\xa8\b\0\0\0\0\0\0\xf3\x82\0\0\0\0\0\0`)b\xf79\xfch\xf8\xa5-\xe6\0\x9e\b\x9e\x02\xf9\x04\0\0\0\0\0\0\0\x83\0\0\0\0\0\0`)b\xf79\xfch\xf8\xa5-\xe6\0\x9e\b\x9e\x02\xf9\x04\0\0\0\0\0\0\x0e\x83\0\0\0\0\0\0\xaa&t\xf5T\xfcR\xf6\xbb/\xce\0\xc1\x07z\x02\x07\x04\0\0\0\0\0\0\x1d\x83\0\0\xb2\0\0\0\xde_\x94\xd5\xb7\xf2.\xfaj,\xd7\xfe*\v\xa3\xfd\x99\f\0\0\0\0\0\0+\x83\0\0\xb1\0\0\0\x02P\xfc\xe3\xcb\xf3\xf7\xfb\xaa(\xe3\xfe\xee\t\xe2\0@\f\0\0\0\0\0\x009\x83\0\0\xb1\0\0\0A\\A\xd8\xb3\xf3\xfa\xf7\xe5-\xf0\xfe\x1a\n\x17\xfe}\r\0\0\0\0\0\0G\x83\0\0\xb0\0\0\0\'3\xa9\xe7\x9a\0\xbd/\xeb\xff\xa7\xf7\x7f\x03\xfa\x11\xd2\b\0\0\0\0\0\0U\x83\0\0\xad\0\0\0DG1\xe7M\xf5\xe9\xfc\xb9+\xf7\xfd\x7f\x0e\x7f\xff\xf2\n\0\0\0\0\0\0c\x83\0\0\0\0\0\0\xff-\x04\xe9\xb6\x03T%6\x07\xfa\xfa\x05\xfcM\x18\xa8\n\0\0\0\0\0\0q\x83\0\0\0\0\0\0\xef@[\xe7}\xfa\b\xefc6C\x01\xed\b\x12\x01n\v\0\0\0\0\0\0\x7f\x83\0\0\0\0\0\0v\x15Y\t\x18\xff\xe5\xe6\x1a6\x1e\v\xac\xf8\x9d\x0fE\x15\0\0\0\0\0\0\x91\x83\0\0\0\0\0\0v\x15Y\t\x18\xff\xe5\xe6\x1a6\x1e\v\xac\xf8\x9d\x0fE\x15\0\0\0\0\0\0\xa4\x83\0\0\0\0\0\0o\x1e8\f\xf8\xfct\xdeJ@\xf7\x07i\xf6\xa6\x0f6\x18\0\0\0\0\0\0\xb5\x83\0\0\0\0\0\0\x1e@T\xe8B\xfa\x1d\xf2\xed2\xd9\x01\xf1\tz\0T\x13\0\0\0\0\0\0\xc6\x83\0\0\0\0\0\0\xbbR\x84\xdf\x9a\xf4m\xfc\v+[\xff\x95\rL\xffr\x10\0\0\0\0\0\0\xd4\x83\0\0\0\0\0\0\xba%\x0e\xf3\xc9\xfc\xd5\xeb\x971\xd0\n\xc2\xfa3\x07\x9c\x17\0\0\0\0\0\0\xdf\x83\0\0\0\0|\x0f\x0f)\x04\xf1\xb2\xfb\xde\xe4\xfb8\xfe\t7\xfa\0\x07f\x18\0\0\0\0\0\0\xea\x83\0\0\0\0\xff\x0f\x052\xca\xed\xa0\xfa\xc8\xe2\xa3;8\t\xa6\xf9\x92\b\xe0\x1e\0\0\0\0\0\0\xf5\x83\0\0\0\0\0\x001,\x19\xf2\xb3\xfb\xcb\xf0s.\xd1\bB\xfb^\t,\x13\0\0\0\0\0\0\n\x84\0\0\0\0\0\0\xb91\x93\xed\\\xfb\xa9\xfa\xe3#\x16\n\x12\x01\\\x03;\x11\0\0\0\0\0\0\x1f\x84\0\0\0\0\xed\x0f\xe5-0\xf0\xe3\xfa\xb5\xf8L)\xd1\x05v\xff\xa9\x05\xaa\x11\0\0\0\0\0\x004\x84\0\0\0\0\xf1\x0e\x01,B\xef \xfc\xaa\xed70W\n\xbe\xfb\xf3\x05G\x15\0\0\0\0\0\0J\x84\0\0\0\0\0\0p\x0f\x8d\b\xc1\x01\xd3\xe5\xf98\xe3\bH\xee\xb5\x1c\x88\x19\0\0\0\0\0\0U\x84\0\0\0\0\0\0p\x0f\x8d\b\xc1\x01\xd3\xe5\xf98\xe3\bH\xee\xb5\x1c\x88\x19\0\0\0\0\0\0b\x84\0\0\0\0\0\0, \xd2\x06\xde\xfa\xc5\xdfQ>|\t\xa7\xf1\x9a\x16\x8b\x16\0\0\0\0\0\0q\x84\0\0\0\0\0\0\xea\x1e\x86\x05Z\xfb\xb7\xdd\xc6@\xe8\b\x05\xf5\xfd\x11\xba\x15\0\0\0\0\0\0\x7f\x84\0\0\0\0\0\0\xea\x1e\x86\x05Z\xfb\xb7\xdd\xc6@\xe8\b\x05\xf5\xfd\x11\xba\x15\0\0\0\0\0\0\bv\0\0\0\0\0\0, \xd2\x06\xde\xfa\xc5\xdfQ>|\t\xa7\xf1\x9a\x16\x8b\x16\0\0\0\0\0\0\x8d\x84\0\0\0\0\0\0\xdd\x1d\x13\n\xad\xfa\x0f\xdeMA\xdf\x07\x80\xf15\x17I\x17\0\0\0\0\0\0\x97\x84\0\0n\0\0\x007AO\xf1\x99\xf7\x9b\0\xd2%\xa3\0i\r\xb7\x03(\x13\0\0\0\0\0\0\xa3\x84\0\0\0\0}\x0f\x17#\x82\xf4=\xfcd\xe6\x8c8\xbd\b\x86\xf6G\vN\x1f\0\0\0\0\0\0\xb4\x84\0\0\0\0}\x0fh,\xca\xf0&\xfb\x87\xe6\x168#\tU\xf6\xf0\vu\x1c\0\0\0\0\0\0\xc7\x84\0\0\0\0}\x0f\xb8#\'\xf5\x1a\xfc\xec\xe5\xdc8\xe9\bZ\xf6\xcb\v@\x1e\0\0\0\0\0\0\xd8\x84\0\0\0\0\x8b\x0f:$\r\xf6q\xfb\xe4\xdf\xc3?\x97\x07\x1f\xf7\xa0\n\x94 \0\0\0\0\0\0\xea\x84\0\0\0\0\0\0p!I\xf6&\xfcP\xe0\xaf<\xd3\nG\xfb,\x05?\x1e\0\0\0\0\0\0\xfe\x84\0\0\0\0\x8f\x0f\x89#Z\xf5\xe3\xfbw\xe0\x92<\xca\n:\xfc\xd5\x03S\x1e\0\0\0\0\0\0\x10\x85\0\0\0\0\0\0\x10,\x14\xf2\xa6\xfa\xd1\xedV0\xea\bq\xfax\b\x14\x15\0\0\0\0\0\0"\x85\0\0\0\0\xfb\x0f,(-\xf3\xc2\xfb\xeb\xe0\x92=\f\t\xc3\xfcr\x03\xf4\x19\0\0\0\0\0\x002\x85\0\0\0\0\xfb\x0f\xff\'\xe0\xf3\xb5\xfb\x9b\xe0o=\x93\ta\xfc\x9d\x03\xd7\x1a\0\0\0\0\0\0B\x85\0\0\0\0\0\0\xc2"#\xfc\xf7\xfb$\xf3c-\x8a\x06k\xfdj\f`\x14\0\0\0\0\0\0P\x85\0\0\0\0\0\0\x0e\x17[\xfc\xf2\xfc\xe9\xdcOA2\t\x86\xfa\xaf\x05@\x19\0\0\0\0\0\0[\x85\0\0\0\0\0\0\x99\x1d\x8a\xf7b\xfc\xe2\xe2\xe8<\x8e\x07\xb7\xf6\xf8\n\x9e!\0\0\0\0\0\0e\x85\0\0\0\0\0\0\x16\x1e;\xf71\xfcf\xdcZCS\x07\x89\xf5\xef\vI!\0\0\0\0\0\0o\x85\0\0\0\0\0\0\x84A\x8a\xed\xa3\xf7E\xe2a=\xb4\x07\xe2\xf4\xa6\r1%\0\0\0\0\0\0x\x85\0\0\0\0\xbc\x0f\xaf 8\xf7\x05\xfd\xca\xdd?@v\t\t\xfa\x0e\x06u\x1f\0\0\0\0\0\0\x83\x85\0\0\0\0\0\0N\x16{\xfc\x99\xfdn\xde\xe9@\xe8\x07a\xf4\x18\x10\xae\x1a\0\0\0\0\0\0\x8d\x85\0\0\0\0\0\0\xf7\'/\xf5\x19\xfb\x93\xdf\x1c>\xf8\t\xe3\xfc\xa8\x02\xec\x1b\0\0\0\0\0\0\x97\x85\0\0\0\0\0\0 "f\xf6Y\xfc\x8d\xdc\xfeA\xcb\b\xb6\xfa\xda\x04G \0\0\0\0\0\0\xa3\x85\0\0\0\0\0\0\xe7\x1e\x89\xf7\xd3\xfc1\xeb^3h\t\xf8\xfa\xb3\t \x1f\0\0\0\0\0\0\xaf\x85\0\0\0\0\xb9\x0fe\x1b\x80\xfa\x85\xfdl\xebf2P\nB\xfa\xf1\n\xd3\x1c\0\0\0\0\0\0\xbb\x85\0\0\0\0\0\0L\x1b\x98\xfa6\xfd\x01\xeab4\x8f\t3\xfa\x9c\b\x96\x1c\0\0\0\0\0\0\xc7\x85\0\0\0\0\0\0F#8\xf85\xfd\xef\xde\xae?\xcf\b\x7f\xf5\x91\f\x85\x1f\0\0\0\0\0\0\xd2\x85\0\0\0\0\0\0\x03\x1c>\xf8x\xfdk\xe0\xc3<\x9e\n\x86\xf7\xd0\t!\x1d\0\0\0\0\0\0\xdc\x85\0\0\0\0\0\0|"\x9a\xf6J\xfd\xf6\xec;1\xed\tl\xfd\xe5\x05\xa3\x1d\0\0\0\0\0\0\xe6\x85\0\0\0\0\0\0\xcb\x1f\x85\xf7i\xfd\xd5\xdd\x9d@\xf7\b{\xf8\xd8\x07\x9d\x1f\0\0\0\0\0\0\xef\x85\0\0\0\0\0\0s"\x11\xf6q\xfc\xbf\xdc Bg\b\xcf\xfa\xbd\x04\x01!\0\0\0\0\0\0\xfa\x85\0\0\0\0\0\0P\x1b|\xf9\xda\xfc6\xe0\x84=\xef\t\x96\xfcR\x03\xd9\x1e\0\0\0\0\0\0\x04\x86\0\0\0\0\0\0\x96!\xe0\xf4\xa7\xfc\x0e\xea&5\x93\b\x16\xfc\xed\x06\xe1\x1b\0\0\0\0\0\0\x0e\x86\0\0\0\0\0\0\x96!\xe0\xf4\xa7\xfc\x0e\xea&5\x93\b\x16\xfc\xed\x06\xe1\x1b\0\0\0\0\0\0\x17\x86\0\0\0\0\0\0\x96!\xe0\xf4\xa7\xfc\x0e\xea&5\x93\b\x16\xfc\xed\x06\xe1\x1b\0\0\0\0\0\0 \x86\0\0\0\0\0\x0f\x8d\x1c\x85\xfa\xf9\xfd\xe6\xde\x88>>\n\x7f\xf6\n\v\x80\x1f\0\0\0\0\0\0,\x86\0\0\0\0\xe6=\x06 A\xf7,\xfd\xf9\xece0\xee\n\xed\xfb\x02\b\r\x1c\0\0\0\0\0\x008\x86\0\0\0\0\0\0\x82 \xd8\xf3\xe9\xfb!\xe7\x068\x83\b$\xfcf\x06\xfa\x18\0\0\0\0\0\0D\x86\0\0\0\0\0\0L\x1b\x98\xfa6\xfd\x01\xeab4\x8f\t3\xfa\x9c\b\x96\x1c\0\0\0\0\0\0P\x86\0\0\0\0\0\0u"\x86\xf4\xef\xfc\xae\xefn/\xef\b\xc8\xfcs\x06\xcc\x1a\0\0\0\0\0\0\\\x86\0\0\0\0\0\0m"v\xf3\xf4\xfb\xa1\xedD2\xe5\x07\xe2\xfb\x94\x07\xf1\x17\0\0\0\0\0\0g\x86\0\0\0\0\0\x004\x1e\x8a\xf6\xeb\xfc\xd2\xdf\f>\xc2\t\xa5\xfc\x0f\x03\xa2\x1c\0\0\0\0\0\0q\x86\0\0\0\0\0\0\xf0#>\xf2 \xfc\x85\xe9\xeb5E\b\x0f\xfd\xce\x05\xc2\x18\0\0\0\0\0\0z\x86\0\0\0\0\x07>\xf2\x1f;\xf7\x9f\xfd\x07\xedj0\xd8\nI\xfb&\b\x82\x1c\0\0\0\0\0\0\x85\x86\0\0\0\0\0\0\xf2\x1f;\xf7\x9f\xfd\x07\xedj0\xd8\nI\xfb&\b\x82\x1c\0\0\0\0\0\0\x90\x86\0\0\0\0\0\0 "f\xf6Y\xfc\x8d\xdc\xfeA\xcb\b\xb6\xfa\xda\x04G \0\0\0\0\0\0\x9a\x86\0\0\0\0\0\0\x06 A\xf7,\xfd\xf9\xece0\xee\n\xed\xfb\x02\b\r\x1c\0\0\0\0\0\0\xa6\x86\0\0\0\0\0\0\x82 \xd8\xf3\xe9\xfb!\xe7\x068\x83\b$\xfcf\x06\xfa\x18\0\0\0\0\0\0\xb2\x86\0\0\0\0\0\0\x82 \xd8\xf3\xe9\xfb!\xe7\x068\x83\b$\xfcf\x06\xfa\x18\0\0\0\0\0\0\xbe\x86\0\0\0\0\0\0<#\xb6\xf45\xfdI\xee\x940,\tZ\xfc\x7f\x07\xae\x1b\0\0\0\0\0\0\xc9\x86\0\0\0\0\0\0\xcb\x1f\x85\xf7i\xfd\xd5\xdd\x9d@\xf7\b{\xf8\xd8\x07\x9d\x1f\0\0\0\0\0\0\xd4\x86\0\0\0\0\0\x004\x1e\x8a\xf6\xeb\xfc\xd2\xdf\f>\xc2\t\xa5\xfc\x0f\x03\xa2\x1c\0\0\0\0\0\0\xde\x86\0\0\0\0\0\0\x99$\x85\xf3\xe9\xfcx\xee\x8e0\xfd\b\x83\xfc\x04\x07\xd8\x1a\0\0\0\0\0\0\xe9\x86\0\0\0\0\0\0\xba\x1e\xc4\xf7\xd5\xfd\xfb\xec\xc30y\nh\xfb\x15\bM\x1d\0\0\0\0\0\0\xf4\x86\0\0\0\0\0\0\xb5!\x96\xf6\x8d\xfc\xa1\xdc,B{\b.\xfaS\x05H!\0\0\0\0\0\0\xfe\x86\0\0\0\0\0\x0f\x8d\x1c\x85\xfa\xf9\xfd\xe6\xde\x88>>\n~\xf6\n\v\x80\x1f\0\0\0\0\0\0\b\x87\0\0\0\0\xdd\x03^\xf1s)\x81\x06\x95%:\xf9B\b\xab\xf6\xaa\x1b\xf8\vN\r\xe4\x17\f\xff\x13\x87\0\0\0\0\xdd\x03^\xf1s)\x81\x06\x95%:\xf9B\b\xab\xf6\xaa\x1b\xf8\vN\r\xe4\x17\f\xff\x1e\x87\0\0\0\0\xdd\x03^\xf1s)\x81\x06\x95%:\xf9B\b\xab\xf6\xaa\x1b\xf8\vN\r\xe4\x17\f\xff)\x87\0\0\0\0\0\0U\xea\xf2-\x8d\b\xb6\x16\xd2\xfd\x0e\r\xc4\xecp&=\x17\xb0\x02{#`\x004\x87\0\0\0\0\0\0V3\xc8\xef\xc4\xf9\xd1\xedV0\xea\b\x17\xf9\x88\n7\x1a\0\0\0\0\0\0@\x87\0\0\0\0\0\0U\xea\xf2-\x8d\b\xb6\x16\xd2\xfd\x0e\r\xc4\xecp&=\x17\xb0\x02{#`\0L\x87\0\0\0\0\0\0v&\xdb\xf7\x05\xfc2\xf3e+z\b\xfa\xfcV\bq\x16\0\0\0\0\0\0X\x87\0\0\0\0\0\0\x10,\x14\xf2\xa6\xfa\xd1\xedV0\xea\bq\xfax\b\x14\x15\0\0\0\0\0\0d\x87\0\0\0\0\0\0U\xea\xf2-\x8d\b\xb6\x16\xd2\xfd\x0e\r\xc4\xecp&=\x17\xb0\x02{#`\0p\x87\0\0\0\0\0\0U\xea\xf2-\x8d\b\xb6\x16\xd2\xfd\x0e\r\xc4\xecp&=\x17\xb0\x02{#`\0|\x87\0\0\0\0\0\0\x85$U\xf4\x17\xfc\x11\xe1\x96=\xda\b\xce\xf7x\n\xb7\x1a\0\0\0\0\0\0\x88\x87\0\0\0\0\0\0\b\xeb\xd6,@\t\xa1\x15\x8f\xffL\f\x97\xec%\'\x96\x16\n\x03D#\xd3\0\x94\x87\0\0\0\0\0\0\xa2\x1e\xf0\xf6 \xfc&\xe0f=\'\n\xb6\xfb>\x05\x88\x1d\0\0\0\0\0\0\xa0\x87\0\0\0\0\0\0)!\xe9\xf5\xf4\xfb\x8d\xe0\xdf<S\n\xe5\xfa\x7f\x05\xba\x1c\0\0\0\0\0\0\xac\x87\0\0\0\0\0\0#\x1f\xf6\xf6o\xfc\xfd\xde\x92=N\v^\xfa\xf0\x05\xba\x1d\0\0\0\0\0\0\xb8\x87\0\0\0\0\0\0\x06 A\xf7,\xfd\xf9\xece0\xee\n\xed\xfb\x02\b\r\x1c\0\0\0\0\0\0\xc8\x87\0\0\xc8\0\0\0Q(\xb0\xf0]\xfcB\xf5\x8a+ \x07F\xfe\t\x06\xa3\x15\0\0\0\0\0\0\xdb\x87\0\0\xc8\0\0\0Q(\xb0\xf0]\xfcB\xf5\x8a+ \x07F\xfe\t\x06\xa3\x15\0\0\0\0\0\0\xee\x87\0\0\0\0\0\0\xe2%\xd9\xf2n\xfc\x9e\xed(1@\t\xbb\xfc\xc8\x03\xa9\x16\0\0\0\0\0\0\x02\x88\0\0\0\0\0\0\xa8,\xa1\xf1\xa9\xfb\x9f\xf3\xe7+\x9a\b\xe9\xfcd\x05g\x11\0\0\0\0\0\0\x16\x88\0\0\0\0\0\0-+S\xef\0\xfcH\xf8\xc6\'(\b\xf2\xfd\xef\x04u\x11\0\0\0\0\0\0*\x88\0\0\xc8\0\0\0Q(\xb0\xf0]\xfcB\xf5\x8a+ \x07F\xfe\t\x06\xa3\x15\0\0\0\0\0\0>\x88\0\0\xc8\0\0\0Q(\xb0\xf0]\xfcB\xf5\x8a+ \x07F\xfe\t\x06\xa3\x15\0\0\0\0\0\0R\x88\0\0\0\0\0\0F\x17\xe9\xf9\xc5\xfdK\xf0\xbd,{\v\x86\xfd\f\x06\xdf\x13\0\0\0\0\0\0]\x88\0\0\0\0\0\0F\x17\xe9\xf9\xc5\xfdK\xf0\xbd,{\v\x86\xfd\f\x06\xdf\x13\0\0\0\0\0\0h\x88\0\0\0\0\0\0`\x1d*\xf6{\xfd\xfc\xf0F/\x99\x07o\xfc\xc9\b\xb3\x1a\0\0\0\0\0\0s\x88\0\0\xc8\0\0\0\xd4\x19\xc2\xfa\x96\xfd\xf6\xf2/+?\nR\xff\0\x07\xd3\x13\0\0\0\0\0\0~\x88\0\0\0\0\0\0\xbc\x19\xe7\xfaK\xfd3\xf3\xeb*J\n\x9d\xfe\xe0\x07\xf2\x13\0\0\0\0\0\0\x89\x88\0\0\0\0\0\0\xbc\x19\xe7\xfaK\xfd3\xf3\xeb*J\n\x9d\xfe\xe0\x07\xf2\x13\0\0\0\0\0\0\x94\x88\0\0\0\0\0\0\xbc\x19\xe7\xfaK\xfd3\xf3\xeb*J\n\x9d\xfe\xe0\x07\xf2\x13\0\0\0\0\0\0\xa0\x88\0\0\0\0\0\0"#\x95\xf5\x9f\xfc\x0e\xee$0\xf8\tE\xfd\xfa\x06t\x18\0\0\0\0\0\0\xa9\x88\0\0\0\0\0\0 #\xeb\xf3\x81\xfd\xfd\xf5\xe1)J\bK\xfe\xf6\x04a\x15\0\0\0\0\0\0\xb9\x88\0\0\0\0\0\0\f)\xcc\xf3\x07\xfbA\xe8\xd67m\x07\x8b\xf9\x02\t]\x18\0\0\0\0\0\0\xc7\x88\0\0\0\0\0\0\xcd(\xde\xf2\xe5\xfa\x12\xe2J=\n\b\x91\xfb\x98\x04\xb2\x1d\0\0\0\0\0\0\xd5\x88\0\0\0\0\0\0\f(5\xf2\xb9\xfb6\xe4\x02:\x84\tU\xfa\xbb\x06\xdd\x18\0\0\0\0\0\0\xe3\x88\0\0\0\0\0\0)*1\xf1\x86\xfb\xb6\xe2I;\xb8\t\x92\xfa)\x06\x99\x1c\0\0\0\0\0\0\xef\x88\0\0\0\0\0\0\x9e!3\xf6\n\xfc\xd2\xdfb=\x8f\nR\xfc\xd3\x03P\x1e\0\0\0\0\0\0\xfb\x88\0\0\0\0\xfc\x0f\xc91l\xeex\xfaR\xe8\xce8,\x06r\xf8\xd0\b\xcb\x19\0\0\0\0\0\0\b\x89\0\0\0\0\0\0F.a\xedO\xfc\x8d\xe4\x06>A\x04u\xf5\x1a\x10w \0\0\0\0\0\0\x14\x89\0\0\0\0\xfc\x0fu3\x84\xed%\xfaQ\xe9\xd46g\x07\x03\xf8\x94\t\xe6\x1b\0\0\0\0\0\0!\x89\0\0\0\0\0\0\x94\x1e\x1f\xf9\xa4\xfed\xe9\xf76&\x07\xdb\xf4\xa6\x11\x9d\x19\0\0\0\0\0\0/\x89\0\0\0\0\0\0\x01#W\xf6\xc4\xfb\xd5\xe0v>\x13\b\xf1\xf6\xdb\v9 \0\0\0\0\0\0=\x89\0\0\0\0\xbc\x0f\xd0\x1f\xbb\xf8\xa9\xfb\xad\xe1\x16>\x89\x07\xb7\xf8\xee\t\xb7\x1d\0\0\0\0\0\0J\x89\0\0\0\0\x99\x0f\x0f%\xc5\xf4\xa5\xfb\x93\xe2\xf6<\xda\x07\xae\xf94\b\xdd\x1c\0\0\0\0\0\0V\x89\0\0\0\0\0\0\x19\x185\xfa\xeb\xff=\xe4\xa99\xe8\t\xa8\xf4\xfc\rx!\0\0\0\0\0\0d\x89\0\0\0\0j\x0f\x98"\xea\xf5\xfe\xfb\xaf\xe1\x96="\b\'\xf8\x0f\n-\x1d\0\0\0\0\0\0r\x89\0\0\0\0\xd7\x0f*"\x87\xf6\xb9\xfbV\xe2\xfc<\x19\b\f\xf9\x05\t\xf8\x1c\0\0\0\0\0\0\x80\x89\0\0\0\0\xd2\x0f)"\x87\xf6\xb9\xfbV\xe2\xfd<\x19\b\f\xf9\x05\t\xf8\x1c\0\0\0\0\0\0\x8e\x89\0\0\0\0\0\0\xc8\x1fP\xf8\xd5\xfe\x97\xea\xae5O\x07\x04\xf6m\x10\xe6\x19\0\0\0\0\0\0\x9c\x89\0\0\0\0j\x0fQ"\x1f\xf6\xf7\xfb)\xe2\b=@\b\t\xf9\xfc\b\x89\x1e\0\0\0\0\0\0\xaa\x89\0\0\0\0\xd2\x0f\x98 \xee\xf6\x04\xfcT\xe2\x13=\0\b,\xf9\xdd\bw\x1c\0\0\0\0\0\0\xb8\x89\0\0\0\0\xec\x0e\xc0+9\xf1\xd3\xfa \xee11\x9e\bI\xfd\xce\x06P\x1d\0\0\0\0\0\0\xc4\x89\0\0\0\0\xaf\x0f\x05!j\xf7\xbc\xfbG\xe2A=\xd8\x07C\xf9!\t\x90\x1e\0\0\0\0\0\0\xd2\x89\0\0\0\0\xaf\x0f\x05!j\xf7\xbc\xfbG\xe2A=\xd8\x07C\xf9!\t\x90\x1e\0\0\0\0\0\0\xe0\x89\0\0\0\0\xfd\x0f\x97 \xfe\xf7\x03\xfc\xdd\xe1Y=7\b\xd9\xf8L\t+ \0\0\0\0\0\0\xed\x89\0\0\0\0\xfd\x0f\x97 \xfe\xf7\x03\xfc\xdd\xe1Y=7\b\xd9\xf8L\t+ \0\0\0\0\0\0\xfa\x89\0\0\0\0\0\0\x97\x1d\x91\xf7\xc5\xfdv\xf1M,\xa5\nf\xfa\x03\v\x7f\x18\0\0\0\0\0\0\x07\x8a\0\0\0\0\0\0\xbc \xba\xf5\x81\xfd\xb9\xf4\xe5)\xc0\t\x8d\xfd\x93\x05>\x15\0\0\0\0\0\0\x14\x8a\0\0\0\0\0\0\x91,\xe0\xf0\x8f\xfa$\xee\xd51\xd3\x07;\xfd\x12\x07\xf7\x1c\0\0\0\0\0\0#\x8a\0\0\0\0\0\0\x90,?\xefA\xfbB\xefa0F\b}\xfe\xbb\x05k\x1e\0\0\0\0\0\x001\x8a\0\0\0\0\xf3\f\xb6:P\xea\xf2\xf8m\xf0c0\xe7\x06\xb0\xfd\x86\x06o\x1b\0\0\0\0\0\0?\x8a\0\0\0\0\0\0\x97\x1d\x91\xf7\xc5\xfdv\xf1M,\xa5\nf\xfa\x03\v\x7f\x18\0\0\0\0\0\0M\x8a\0\0\0\0\xcb\x0f\xbc \xba\xf5\x81\xfd\xb9\xf4\xe5)\xc0\t\x8d\xfd\x93\x05>\x15\0\0\0\0\0\0[\x8a\0\0\0\0\0\0\xbc \xba\xf5\x81\xfd\xb9\xf4\xe5)\xc0\t\x8d\xfd\x93\x05>\x15\0\0\0\0\0\0i\x8a\0\0\0\0\0\0\xed#\x8a\xf3m\xfd\xd2\xf5N*\xf7\x076\xfe\xe2\x04R\x15\0\0\0\0\0\0w\x8a\0\0\0\0\0\0\x97\x1d\x91\xf7\xc5\xfdv\xf1M,\xa5\nf\xfa\x03\v\x7f\x18\0\0\0\0\0\0\x85\x8a\0\0\0\0\0\0\xbc \xba\xf5\x81\xfd\xb9\xf4\xe5)\xc0\t\x8d\xfd\x93\x05>\x15\0\0\0\0\0\0\x93\x8a\0\0\0\0\0\0\xbc \xba\xf5\x81\xfd\xb9\xf4\xe5)\xc0\t\x8d\xfd\x93\x05>\x15\0\0\0\0\0\0\xa1\x8a\0\0\0\0\0\0\x07\x1e@\xf8\xa2\xfd\x19\xef\x98.\xa1\n\x9b\xfa#\t4\x19\0\0\0\0\0\0\xae\x8a\0\0\0\0\0\0\xce$F\xf39\xfd\xa1\xf5\x92*\xdf\x07\0\xfeJ\x05\x88\x15\0\0\0\0\0\0\xc1\x8a\0\0\0\0\xe1\x0f\xbc \xba\xf5\x81\xfd\xb9\xf4\xe5)\xc0\t\x8d\xfd\x93\x05>\x15\0\0\0\0\0\0\xce\x8a\0\0\0\0\0\0\x04%\x92\xf3\x03\xfd\xcb\xf5\xce*e\x07?\xfe#\x05\x94\x14\0\0\0\0\0\0\xdc\x8a\0\0\0\0\0\0\xac\'\x9f\xf2\xcb\xfb\xcd\xf5\xa9+X\x06\x7f\xfe8\x06\xd8\x13\0\0\0\0\0\0\xe9\x8a\0\0\0\0\0\0./\x1c\xed\xd3\xfb\xf1\xe5\xe27\x12\n\xee\xfc\xab\x03\xfa\x1c\0\0\0\0\0\0\xf7\x8a\0\0\0\0\0\0\xf6-\xa3\xee\xd5\xfb\v\xe5U8\x93\n\xfb\xfb\xc1\x04\x94\x1d\0\0\0\0\0\0\x03\x8b\0\0\0\0\xff\x0f\x15%\xa9\xf2f\xfd\xa5\xeb.0\xbc\f\xf4\xf9\xd6\bR\x19\0\0\0\0\0\0\x13\x8b\0\0\0\0\xfe\x0fa)\xe9\xf1\x0e\xfc\x07\xe9G3\f\fP\xfb\r\x07A\x1a\0\0\0\0\0\0#\x8b\0\0\0\0\xfe\x0fM-Z\xf0\xe7\xfb\xc8\xea\xff1\x8d\v\xfb\xfb\xd6\x06t\x19\0\0\0\0\0\x003\x8b\0\0\0\0\xf9\x0f\xa3*\xa3\xf1*\xfc-\xea\xba2_\vp\xfb\xb0\x07O\x18\0\0\0\0\0\0C\x8b\0\0\0\0\0\0\x02-4\xf0\x86\xfb\x80\xed\x8c/X\v$\xfc%\x07\x97\x17\0\0\0\0\0\0S\x8b\0\0\0\0\0\0\xa8 \x8c\xf6\x90\xfc\xa8\xf0A0\xcb\x06\x9b\xfap\t5\x14\0\0\0\0\0\0c\x8b\0\0\0\0\0\0\xa2,\xc1\xef\x9a\xfb\xee\xf7\xb6)9\x06\x88\xff/\x05\x86\x13\0\0\0\0\0\0p\x8b\0\0\0\0\0\x001&e\xf2c\xfc\xba\xf4!,\b\x07\xa6\xfd\x7f\x06\x0e\x14\0\0\0\0\0\0~\x8b\0\0\0\0\0\0\x95*\x01\xf0\xce\xfb\x8b\xfb\xf8#\xf5\b\xc2\xff\x89\x05&\x14\0\0\0\0\0\0\x8b\x8b\0\0\0\0\0\x001&e\xf2c\xfc\xba\xf4!,\b\x07\xa6\xfd\x7f\x06\x0e\x14\0\0\0\0\0\0rq\0\0\0\0\0\0\xee1%\xf0\x85\xfe"\xfej#\x85\x05<\x05\xe9\x058\x14\0\0\0\0\0\0\x98\x8b\0\0\0\0\0\0\b)z\xf6[\xfbe\xdeO?\xe3\t\x02\xfc_\x03\xd2/\0\0\0\0\0\0\xa8\x8b\0\0\0\0\0\0M*\xea\xf4\xa5\xfbm\xdf\xc9=\x88\n\xbb\xfc\xa8\x02\xa3.\0\0\0\0\0\0\xb7\x8b\0\0\0\0\0\0\b)z\xf6[\xfbe\xdeO?\xe3\t\x02\xfc_\x03\xd2/\0\0\0\0\0\0\xc7\x8b\0\0\0\0\0\0\x83(\xe3\xf6J\xfb\x10\xdeg?*\n2\xfb\\\x04\x12,\0\0\0\0\0\0\xd6\x8b\0\0\0\0\0\0\xb3%\xf5\xf7[\xfbO\xdd\x80@\xb7\tL\xfaA\x05\xbf)\0\0\0\0\0\0\xe4\x8b\0\0\0\0\0\0^%\xd1\xf4\xdd\xfc\xfe\xe3D;@\b\xce\xfc#\x03\xe9%\0\0\0\0\0\0\xf0\x8b\0\0\0\0\0\0W+\xab\xf3\xd4\xfaG\xdf\xda=\xa0\n\xac\xfb\xb3\x03\xa8-\0\0\0\0\0\0\xfa\x8b\0\0\0\0\0\0\xd3$f\xf5\x9c\xfc\xbb\xe2\xdc>]\x05i\xf7\xc0\f\f\x1c\0\0\0\0\0\0\x06\x8c\0\0\0\0\0\0\xe2#\x8a\xf5u\xfc\v\xde\x85@\xd4\b\x97\xfbF\x04L!\0\0\0\0\0\0\x13\x8c\0\0\0\0\0\x001+\xec\xf1}\xfb\xe0\xeb\xf62\x19\t\xe6\xfew\x01\xa8\x1f\0\0\0\0\0\0 \x8c\0\0\0\0\0\x001+\xec\xf1}\xfb\xe0\xeb\xf62\x19\t\xe6\xfew\x01\xa8\x1f\0\0\0\0\0\0+\x8c\0\0\0\0\0\0\x8b"\xeb\xf4\x8f\xfd_\xecd1l\ne\xfe\xd2\x04\xf2\x1c\0\0\0\0\0\x006\x8c\0\0\0\0\0\0\xa7&\xfb\xf3\xae\xfcH\xeb\xeb2\xd9\t\x8d\xfc\xe8\x06\x18\x1b\0\0\0\0\0\0A\x8c\0\0\0\0\0\0v!F\xf5O\xfb\xe4\xf1\xac/\x0e\x06\x83\xfc\x90\x06x\x18\0\0\0\0\0\0L\x8c\0\0\0\0\0\0\x06"\xb8\xf5q\xfbe\xf0\r0Y\x07+\xfc\xb7\x06\x87\x19\0\0\0\0\0\0X\x8c\0\0\0\0\0\0\xb2!\xd1\xf5}\xfbe\xf0\r0Y\x07\xf1\xfb\x1e\x07\r\x1b\0\0\0\0\0\0f\x8c\0\0\0\0\0\0\xf7\x1c\xfc\xf7/\xfd\xbe\xeb\xf41z\nZ\xfam\bu\x1a\0\0\0\0\0\0q\x8c\0\0\0\0\0\0\xea\x1f[\xf5\x81\xfd\xa8\xee\xf1.\xb8\n\xfd\xfc\xb9\x05\xc7\x19\0\0\0\0\0\0\x7f\x8c\0\0\0\0\0\0\t"\xef\xf4\x19\xfd\n\xef|.\xd4\n.\xfd\x07\x06g\x18\0\0\0\0\0\0\x8a\x8c\0\0\0\0\0\0\xb6#}\xf4Z\xfd8\xdeGB\x7f\x06P\xf7R\v\xa7!\0\0\0\0\0\0\x95\x8c\0\0\0\0\0\0@!u\xf3\xed\xfc\xb9\xef\xbe.\xb7\t\x82\xfd\b\x05\xa6\x17\0\0\0\0\0\0\xa1\x8c\0\0\0\0\0\0\xd6!0\xf3\xe2\xfc\xa8\xf0\xfb-\x8c\t\xb6\xfd\xd0\x04\xa6\x17\0\0\0\0\0\0\xad\x8c\0\0\0\0\0\0\xc32\'\xea\xad\xfb\xa9\xf8\x9b\'\xeb\x07\xc0\xff\xd1\x047\x13\0\0\0\0\0\0\xb9\x8c\0\0\0\0\0>\x96)\xf7\xf1z\xfb\xff\xf2\xb3-\'\x07e\xfd:\v\x8f\x18\0\0\0\0\0\0\xc5\x8c\0\0\x0f\0\0\0B"\x86\xf3\xcc\xfc\xc9\xf4\x11,\v\x07\xff\xfd\x10\x06R\x11\0\0\0\0\0\0\xd7\x8c\0\0\0\0\x7f\x0f\x1a#=\xf5\xde\xfc;\xe7\x075\x05\f<\xfa`\b\xeb\x18\0\0\0\0\0\0\xe9\x8c\0\0\0\0\0\0\xcc&\f\xf4Y\xfcO\xe9\x134\xc1\n\r\xfbk\b\xc7\x15\0\0\0\0\0\0\xfc\x8c\0\0\x0f\0\x96\x0f}\'`\xf2\x1f\xfc\xdc\xea\f2d\v\xe7\xfa\\\b\xa7\x15\0\0\0\0\0\0\x0f\x8d\0\0\x0f\0\0\0\xba \x12\xf5\xff\xfc\x04\xf4\x92,U\x07\xe6\xfd\0\x07\x0f\x12\0\0\0\0\0\0#\x8d\0\0\x0f\0\0\0\xba \x12\xf5\xff\xfc\x04\xf4\x92,U\x07\xe6\xfd\0\x07\x0f\x12\0\0\0\0\0\x007\x8d\0\0\0\0\x94\x0f\xe0*C\xf0\x8b\xfb\x12\xe1\x83<(\nz\xf9\x17\b6 \0\0\0\0\0\0J\x8d\0\0\x0f\0\0\0\xd2&$\xf5\x86\xfc\x04\xeei0\xb0\t\xa3\xfb\0\t\f\x12\0\0\0\0\0\0\\\x8d\0\0\x0f\0\0\0G5a\xea\xa5\xfa^\xf9\xa1%~\t<\x01\x80\x04\f\x10\0\0\0\0\0\0n\x8d\0\0\0\0\0\0\xe2\x1ek\xf5\xae\xfd\xa9\xe7\'4\x94\f~\xf8G\n\x89\x19\0\0\0\0\0\0\x81\x8d\0\0\x0f\0\0\0\f-\x1c\xef\xd6\xfb\xb9\xf6_*\xd5\x06\xcc\xfd\xa3\x06\xff\x10\0\0\0\0\0\0\x93\x8d\0\0\0\0\0\0\xe2\x1ek\xf5\xae\xfd\xa9\xe7\'4\x94\f~\xf8G\n\x89\x19\0\0\0\0\0\0\xa0\x8d\0\0\x0f\0\x96\x0fY\x1fj\xf8\xe6\xfb\x10\xe1 >4\bh\xf6\xbd\v\x7f\x1b\0\0\0\0\0\0\xb2\x8d\0\0\0\0\x7f\x0fv\x1f\xa3\xf8\xff\xfbc\xdf\xef?\xf8\x07\v\xf5\xd6\r\xcd\x1d\0\0\0\0\0\0\xc3\x8d\0\0\0\0\x7f\x0fv\x1f\xa3\xf8\xff\xfbc\xdf\xef?\xf8\x07\v\xf5\xd6\r\xcd\x1d\0\0\0\0\0\0\xd3\x8d\0\0\0\0\0\0L,\x1b\xf0\x05\xfb}\xe2\xa2;\x90\tp\xf4b\r\x05\x1e\0\0\0\0\0\0\xe5\x8d\0\0\0\0\0\0L,\x1b\xf0\x05\xfb}\xe2\xa2;\x90\tp\xf4b\r\x05\x1e\0\0\0\0\0\0\xf5\x8d\0\0\x0f\0\0\0\x8c".\xf2\0\xfd\x83\xf1\xf2-\x98\bF\xfd\0\x07d\x14\0\0\0\0\0\0\t\x8e\0\0\x0f\0\0\0\x8c".\xf2\0\xfd\x83\xf1\xf2-\x98\bF\xfd\0\x07d\x14\0\0\0\0\0\0\x1f\x8e\0\0\x0f\0\0\0\xa3$=\xf3\xd0\xfce\xf3(-Y\x07b\xfc\x88\x07\xdc\x14\0\0\0\0\0\x001\x8e\0\0\x0f\0\0\0\xa3$=\xf3\xd0\xfce\xf3(-Y\x07b\xfc\x88\x07\xdc\x14\0\0\0\0\0\0C\x8e\0\0\0\0\x7f\x0f\xd0)\xa5\xef2\xfb\x86\xdfP>\xc5\th\xfc\xb1\x03\xdf"\0\0\0\0\0\0U\x8e\0\0\0\0\x7f\x0f\xd0)\xa5\xef2\xfb\x86\xdfP>\xc5\th\xfc\xb1\x03\xdf"\0\0\0\0\0\0b\x8e\0\0\0\0\0\0p\x1f\x06\xf5\x91\xfd\xce\xe6\xcf4\xc8\f\\\xf9b\b\x89\x1b\0\0\0\0\0\0t\x8e\0\0\0\0\0\0p\x1f\x06\xf5\x91\xfd\xce\xe6\xcf4\xc8\f\\\xf9b\b\x89\x1b\0\0\0\0\0\0\x81\x8e\0\0\x0f\0\0\0\xc0\x1f\x94\xf5q\xfd\n\xe8\xfb3Y\f\n\xf9\b\n\xc3\x17\0\0\0\0\0\0\x93\x8e\0\0\x0f\0\0\0\xc0\x1f\x94\xf5q\xfd\n\xe8\xfb3Y\f\n\xf9\b\n\xc3\x17\0\0\0\0\0\0\xa1\x8e\0\0\x0f\0\0\0\x9d*9\xefL\xfc\xcb\xfaZ$_\t\x16\0\xca\x06\xe6\x11\0\0\0\0\0\0\xb3\x8e\0\0\x0f\0\0\0\x9d*9\xefL\xfc\xcb\xfaZ$_\t\x16\0\xca\x06\xe6\x11\0\0\0\0\0\0\xc1\x8e\0\0\x0f\0\0\0\xa4\'a\xf1!\xfc\xeb\xf4f,{\x06C\xfde\x07#\x13\0\0\0\0\0\0\xd3\x8e\0\0\x0f\0\0\0\xa4\'a\xf1!\xfc\xeb\xf4f,{\x06C\xfde\x07#\x13\0\0\0\0\0\0\xe1\x8e\0\0\x0f\0\0\0\x96\x1ex\xf5\x05\xfd\x03\xf3\x93-J\x07\x7f\xfd\xb0\x06\xd8\x12\0\0\0\0\0\0\xf6\x8e\0\0\x0f\0\0\0\x96\x1ex\xf5\x05\xfd\x03\xf3\x93-J\x07\x7f\xfd\xb0\x06\xd8\x12\0\0\0\0\0\0\f\x8f\0\0\x0f\0\xff\x0fE?\xfe\xe7\x1f\xf9\xa7\xf6\r*M\x07n\x01\xbe\b\x80\x14\0\0\0\0\0\0 \x8f\0\0\x0f\0\xff\x0fE?\xfe\xe7\x1f\xf9\xa7\xf6\r*M\x07n\x01\xbe\b\x80\x14\0\0\0\0\0\0.\x8f\0\0\x0f\0\xff\x0f\x80.C\xee[\xfb\xcd\xf6\x93*~\x06\xd8\xfe2\x06\xc1\x10\0\0\0\0\0\0B\x8f\0\0\x0f\0\xff\x0f\x80.C\xee[\xfb\xcd\xf6\x93*~\x06\xd8\xfe2\x06\xc1\x10\0\0\0\0\0\0P\x8f\0\0\x0f\0\xff\x0f\xb0\x1f\xfd\xf5\x1c\xfdn\xf1\b.\x95\bS\xfc\x1b\bE\x13\0\0\0\0\0\0d\x8f\0\0\x0f\0\xff\x0f\xb0\x1f\xfd\xf5\x1c\xfdn\xf1\b.\x95\bS\xfc\x1b\bE\x13\0\0\0\0\0\0r\x8f\0\0\x0f\0\xff\x0fz#\xa5\xf4c\xfc\x19\xe8A4\xf2\v\xfb\xf8Q\n\xe9\x15\0\0\0\0\0\0\x86\x8f\0\0\0\0\0\0\x81\'\xb8\xf2\xa6\xfbc\xed\x8b1\r\t\x87\xfe\x9d\x056\x1a\0\0\0\0\0\0\x98\x8f\0\0\x0f\0\x94\x0f\x07 \xef\xf7\xe0\xfbD\xe0\x1c?\xf1\x07f\xf6\xce\v4\x1c\0\0\0\0\0\0\xa9\x8f\0\0\x0f\0<\x0f\x81\'\xb8\xf2\xa6\xfbc\xed\x8b1\r\t\x87\xfe\x9d\x056\x1a\0\0\0\0\0\0\xba\x8f\0\0\x0f\0\xff\x0fk\x1a\x81\xf8\xa1\xfc\xe4\xf0\xfb,|\n@\xfbS\t\xf7\x16\0\0\0\0\0\0\xcb\x8f\0\0\x0f\0\xff\x0fv\x1e\xfe\xf5\x1c\xfd\xd9\xf0@-5\n\xe1\xfb\xc8\b:\x15\0\0\0\0\0\0\xdc\x8f\0\0\x0f\0\xff\x0ff \xb5\xf4u\xfd\xe3\xf0F-#\na\xfb\xdb\b\xe8\x14\0\0\0\0\0\0\xed\x8f\0\0\x0f\0\xff\x0f\xba\x1d$\xf5\xc0\xfd\xfa\xed\xa3/\xad\n\xa1\xfaY\tZ\x19\0\0\0\0\0\0\xfe\x8f\0\0\x0f\0\x92\x0f\xd0\x1e\x92\xf8\r\xfcV\xe0\xd5>3\b\xcf\xf62\v\xa2\x1c\0\0\0\0\0\0\x10\x90\0\0\x0f\0\xff\x0f\xd0\x1e\x92\xf8\r\xfcV\xe0\xd5>3\b\xcf\xf62\v\xa2\x1c\0\0\0\0\0\0"\x90\0\0\x0f\0\xff\x0f[#\\\xf6L\xfb\xa4\xeb\xdc3I\bS\xfb\xce\t\xea\x1a\0\0\0\0\0\x004\x90\0\0\x0f\0\xff\x0f$ \x7f\xf4l\xfd\x9e\xf0\x10.~\t\xba\xfb\xe6\b\xa1\x16\0\0\0\0\0\0F\x90\0\0\x0f\0\0\0\xc2\x1f\x0f\xf5N\xfc@\xf2\x19,\xf8\t\xde\xfa\xcf\t\x9f\x16\0\0\0\0\0\0X\x90\0\0\x0f\0\0\0\xba\x1d$\xf5\xc0\xfd\xfa\xed\xa3/\xad\n\xa1\xfaY\tZ\x19\0\0\0\0\0\0j\x90\0\0\x0f\0\0\0\xba\x1d$\xf5\xc0\xfd\xfa\xed\xa3/\xad\n\xa1\xfaY\tZ\x19\0\0\0\0\0\0|\x90\0\0\x0f\0\x92\x0f\x9b\x18F\xfa\xec\xfdy\xe6\x1c6\x99\v\xe5\xf6(\f`\x17\0\0\0\0\0\0\x8e\x90\0\0\x0f\0\x95\x0fd\x1e\x96\xf6\xda\xfc\xb7\xf0\xcc-\xb4\t\x06\xfcV\t\xb2\x14\0\0\0\0\0\0\xa0\x90\0\0\x0f\0\0\0\x9f\x19(\xf9\x15\xfe\xa8\xf1\x8f,\x1a\n>\xfcS\x07\n\x14\0\0\0\0\0\0\xb2\x90\0\0\x0f\0\0\0\xd2\x1b\xc4\xf7\0\xfe\xad\xf3\xc1+\xb7\b\xe3\xfd\x8f\x05\xb5\x13\0\0\0\0\0\0\xc4\x90\0\0\x0f\0\0\0r\x1a\x99\xf8\x18\xfd\x90\xebY3\xff\b\x80\xf9\x83\nG\x16\0\0\0\0\0\0\xd6\x90\0\0\x0f\0\0\0. T\xf3Y\xfd\xaf\xf0&.P\t\xbc\xfc\xe6\x07\xdc\x16\0\0\0\0\0\0\xe8\x90\0\0\x0f\0\0\0k\x1a\x81\xf8\xa1\xfc\xe4\xf0\xfb,|\n@\xfbS\t\xf7\x16\0\0\0\0\0\0\xfa\x90\0\0\x0f\0\0\0\xba\x1d$\xf5\xc0\xfd\xfa\xed\xa3/\xad\n\xa1\xfaY\tZ\x19\0\0\0\0\0\0\f\x91\0\0\x0f\0\0\0\x8c\x1d)\xf7\xa2\xfd\xb4\xf3\xe7+\x81\b\xe4\xfd\x9b\x05\xf5\x12\0\0\0\0\0\0\x1e\x91\0\0\x0f\0\0\0n\x1eP\xf5\r\xfd\x84\xf2^.\xe9\x06\x8c\xfdo\x06"\x13\0\0\0\0\0\x000\x91\0\0\x0f\0\0\0n\x1eP\xf5\r\xfd\x84\xf2^.\xe9\x06\x8c\xfdo\x06"\x13\0\0\0\0\0\0B\x91\0\0\x0f\0\0\0\x9f!\xfa\xf4\xd8\xfcU\xf1\x9a.\x01\b\xcc\xfc\f\bh\x14\0\0\0\0\0\0T\x91\0\0\x0f\0\0\0\x9f!\xfa\xf4\xd8\xfcU\xf1\x9a.\x01\b\xcc\xfc\f\bh\x14\0\0\0\0\0\0f\x91\0\0\x0f\0\0\0b"\xc1\xf3\xeb\xfc\xb1\xf3\xcc,p\x07\xda\xfd\xd1\x06\xca\x12\0\0\0\0\0\0x\x91\0\0\x0f\0\0\0b"\xc1\xf3\xeb\xfc\xb1\xf3\xcc,p\x07\xda\xfd\xd1\x06\xca\x12\0\0\0\0\0\0\x8a\x91\0\0\x0f\0\0\0f!\xa4\xf4\xb6\xfc\x85\xf3\t-Y\x07\xae\xfeC\x06\x17\x12\0\0\0\0\0\0\x9c\x91\0\0\x0f\0\0\0f!\xa4\xf4\xb6\xfc\x85\xf3\t-Y\x07\xae\xfeC\x06\x17\x12\0\0\0\0\0\0\xae\x91\0\0\0\0\0\0\xaf\x17F\xf7\x19\xff\xa6\xeb\xdb5\xdc\x05\xed\xfb2\vU\x1b\0\0\0\0\0\0\xc0\x91\0\0\0\0\0\0 \x1e\xf5\xf7s\xfd\xd6\xf0\xe6,\xa6\n:\xfd4\x05F\x17\0\0\0\0\0\0\xc8\x91\0\0\0\0\0\0Y.U\xee_\xfa\xd1\xeaz8\xa7\x03\xcd\xf9\x7f\n\xde\x12\0\0\0\0\0\0\xda\x91\0\0\0\0\0\0\xfd\x192\xfa\x9d\xfd\x83\xef\xf73\xa1\x03\x8f\xfcp\t:\x1c\0\0\0\0\0\0\xec\x91\0\0\0\0\0\0Y.U\xee_\xfa\xd1\xeaz8\xa7\x03\xcd\xf9\x7f\n\xde\x12\0\0\0\0\0\0\xff\x91\0\0\0\0\0\0!\x05?\x07\x93\xff\xc5\xe5$>(\x03\xb9\xfe0\x07\x84\x17\0\0\0\0\0\0\x0e\x92\0\0\0\0\0\0Y\v\xdc\x02\x13\xff:\xe0\xf2@\xc4\x05"\xf4\x9d\x10]\x1d\0\0\0\0\0\0\x1d\x92\0\0\0\0\0\0Y\v\xdc\x02\x13\xff:\xe0\xf2@\xc4\x05"\xf4\x9d\x10]\x1d\0\0\0\0\0\0+\x92\0\0\0\0\0\0\xa4\x11\v\xff\xdb\xff\x94\xe4\x80:}\bz\xf3?\x12\xaf\x1b\0\0\0\0\0\0:\x92\0\0\0\0\0\0\xbd\x13\xe8\xff\x8b\xff\xcc\xe9\xfc6\xa6\x06\xc5\xf5\x8c\x11\xd9\x16\0\0\0\0\0\0I\x92\0\0\0\0\0\0c\x1f\xb3\x01>\xfc\x8f\xe806\x10\ty\xfb\xf9\v:\x15\0\0\0\0\0\0W\x92\0\0\0\0\0\0c\x1f\xb3\x01>\xfc\x8f\xe806\x10\ty\xfb\xf9\v:\x15\0\0\0\0\0\0e\x92\0\0\0\0\0\0\v9\xe6\xef\xf0\xfd\xee\xf8B&\xe1\x07\xd7\xfe\xcb\n0\x17\0\0\0\0\0\0t\x92\0\0\xc0\x02\xff\xff\x16R-\xe1\xcb\xf5\x10\xf4\xa9/X\x03e\xf7\x05\x14j\x1f\0\0\0\0\0\0|\x92\0\0\0\0\0\0\x16\x12\xbe\xfcY\xfe\x8f\xec\x052q\t\x82\xfd\xbb\x05\xe3\x17\0\0\0\0\0\0\x88\x92\0\0\0\0\0\0|\x0e\xe1\xfd`\xff\xfb\xea\xde/\xe4\rA\xfa\x89\x07* \0\0\0\0\0\0\x91\x92\0\0\0\0\0>\xc2">\xf6\x1e\xfc\xb8\xf3@,\x12\b\b\xfde\x05\xe0\x11\0\0\0\0\0\0\x9d\x92\0\0\0\0\xff\x07\x98)\xc7\xf0\xe1\xfb\x1a\xf8M)\x84\x06\x14\xfeK\x06\x86\x12\0\0\0\0\0\0\xaa\x92\0\0\0\0\0\0\x85\x1d&\xf6\x1d\xfd\xb9\xed\x952f\x07\xb8\xfc\xf1\x06\xbf\x14\0\0\0\0\0\0\xbb\x92\0\0\0\0\0\0f\x14T\xfb\xda\xfdt\xe699\xd9\x07~\xf9\x03\v\x19\x16\0\0\0\0\0\0\xcb\x92\0\0\0\0\0\0|\x1f\x8b\xf4\x07\xfdh\xeeZ2\xe2\x06\x8a\xfd\xd1\x05k\x14\0\0\0\0\0\0\xda\x92\0\0\0\0\0\0|\x1f\x8b\xf4\x07\xfdh\xeeZ2\xe2\x06\x8a\xfd\xd1\x05k\x14\0\0\0\0\0\0\xe9\x92\0\0\0\0\0\0\x85\x1d&\xf6\x1d\xfd\xb9\xed\x952f\x07\xb8\xfc\xf1\x06\xbf\x14\0\0\0\0\0\0\xf6\x92\0\0\0\0\0\0\x85\x1d&\xf6\x1d\xfd\xb9\xed\x952f\x07\xb8\xfc\xf1\x06\xbf\x14\0\0\0\0\0\0\x05\x93\0\0\0\0\xff\x0f\x15\x1b$\xf7\x0f\xfd\xc7\xecK4o\x06\xdd\xfci\x06\xd0\x17\0\0\0\0\0\0\x11\x93\0\0\0\0\0\0\x15\x1b$\xf7\x0f\xfd\xc7\xecK4o\x06\xdd\xfci\x06\xd0\x17\0\0\0\0\0\0 \x93\0\0\0\0\0\0\x15\x1b$\xf7\x0f\xfd\xc7\xecK4o\x06\xdd\xfci\x06\xd0\x17\0\0\0\0\0\0/\x93\0\0\0\0\0\0\\(^\xf3p\xfb!\xe8/9\xf0\x05\xb8\xfaW\n\x8b \0\0\0\0\0\0<\x93\0\0\0\0\0\0\\(^\xf3p\xfb!\xe8/9\xf0\x05\xb8\xfaW\n\x8b \0\0\0\0\0\0I\x93\0\0\0\0\0\0\xbe)6\xf0\xe4\xfb\xf5\xf1\xb63\x14\x010\xfe\xeb\x04+\x17\0\0\0\0\0\0W\x93\0\0\0\0\0\0\\(^\xf3p\xfb!\xe8/9\xf0\x05\xb8\xfaW\n\x8b \0\0\0\0\0\0c\x93\0\0\0\0\0\0\xbe)6\xf0\xe4\xfb\xf5\xf1\xb63\x14\x010\xfe\xeb\x04+\x17\0\0\0\0\0\0o\x93\0\0\0\0\xff\x0f=/\x1b\xf2}\xfb\x18\xfc>%\xc5\x06\xea\xff\xfb\x06\xe0\x11\0\0\0\0\0\0~\x93\0\0\0\0\0\0\b)z\xf6[\xfbe\xdeO?\xe3\t\x02\xfc_\x03\xd2/\0\0\0\0\0\0\x8b\x93\0\0\0\0\0\0\xd3$f\xf5\x9c\xfc\xbb\xe2\xdc>]\x05i\xf7\xc0\f\f\x1c\0\0\0\0\0\0\x98\x93\0\0\0\0\0\0m.\x80\xf0?\xfa\x8a\xef\v0|\x07\xbd\xfcw\x06\xad\x15\0\0\0\0\0\0\xa4\x93\0\0\0\0\0\0:@t\xf4\x8a\xf6\xc3\xf4`/\xee\x02\x90\xfb\xb2\x17\xcf\x11\0\0\0\0\0\0\xaa\x93\0\0\0\0\0\0\xf4\x1e\x8a\xf8\xf7\xfc\xde\xdfc<\xb6\v\x13\xfa\x97\b\xa2\x1a\xb6\xe3\x89,\x99\r\xb8\x93\0\0\0\0\0\0@!\xaf\xf5J\xfd\x96\xe06=\xde\t\xe3\xf8E\b\xf6\x1c\0\0\0\0\0\0\xc4\x93\0\0\0\0\0\0W\x1d\xf5\xf5L\xfd*\xe1\xf0:\xf4\vL\xfcW\x04\xc0\x1f\0\0\0\0\0\0\xd0\x93\0\0\0\0\0\0\xc4\x19\xe1\xf7\xce\xfdR\xed\xd82\x8d\x076\xfc-\x06=\x14\0\0\0\0\0\0\xe0\x93\0\0\0\0\0\0\xcb!>\xf5\xdf\xfbx\xf2\xaf/]\x05\xc8\xfdv\x05R\x11\0\0\0\0\0\0\xef\x93\0\0\0\0\0\0\x17\x1a\xdf\xf8\x17\xfdI\xec\xc83\xa1\x07\xd4\xf9v\t?\x14\0\0\0\0\0\0\xfd\x93\0\0\0\0\0\0\xe5\x19\x94\xf8\x1d\xfe\xf6\xed=0\xf6\t\x92\xfde\x05r\x19\0\0\0\0\0\0\r\x94\0\0\0\0\0\0\xc8\x18\xb4\xf92\xfe\x01\xed\xbd0y\n\x9f\xfc\xfa\x06\xf3\x1a\0\0\0\0\0\0\x1a\x94\0\0\0\0\xeb\x0f\xdd$\x05\xf5\xfa\xfc+\xdfW?\xf2\b:\xfdT\x02\r\x1c\0\0\0\0\0\0)\x94\0\0\0\0\0\0\x96\x174\xfa\xbd\xfdG\xdcjA\xd0\t\x95\xfc\xea\x022\x1c\0\0\0\0\0\x008\x94\0\0\0\0\0\0w&\xed\xf3`\xfc\xdb\xde\xd9?\xb1\b5\xfdS\x02\xbf\x1b\0\0\0\0\0\0E\x94\0\0\0\0\0\0w&\xed\xf3`\xfc\xdb\xde\xd9?\xb1\b5\xfdS\x02\xbf\x1b\0\0\0\0\0\0T\x94\0\0\0\0\0\0w&\xed\xf3_\xfc\xdb\xde\xda?\xb1\b6\xfdS\x02\xbf\x1b\0\0\0\0\0\0c\x94\0\0\0\0\xfc\x0f\x96\x174\xfa\xbe\xfdF\xdcjA\xd1\t\x95\xfc\xea\x021\x1c\0\0\0\0\0\0r\x94\0\0\0\0\0\0\x96\x174\xfa\xbd\xfdG\xdcjA\xd0\t\x95\xfc\xea\x022\x1c\0\0\0\0\0\0\x81\x94\0\0\0\0\0\0\x96\x174\xfa\xbd\xfdG\xdcjA\xd0\t\x95\xfc\xea\x022\x1c\0\0\0\0\0\0\x90\x94\0\0\0\0\xeb\x0fV\x13\xbc\xfd\x99\xff\x94\xeb\xfe0\xd5\v;\xfd\x9b\x05\xcb\x1c\0\0\0\0\0\0\x9f\x94\0\0\0\0\xeb\x0f,\x17,\xfae\xfe3\xed\xfd/(\v\x1b\xfd\xf4\x05S\x1a\0\0\0\0\0\0\xae\x94\0\0\0\0\xeb\x0f\x9e\x17\x99\xfb\xea\xfe:\xea\x143\xe2\nM\xfd\x8b\x05\xc9\x1d\0\0\0\0\0\0\xbd\x94\0\0\0\0\xeb\x0fV\x13\xbc\xfd\x99\xff\x94\xeb\xfe0\xd5\v;\xfd\x9b\x05\xcb\x1c\0\0\0\0\0\0\xca\x94\0\0\0\0\0\0\x8f\x16\xdb\xfc\x99\xfe\x82\xde\xa7?W\ti\xf8%\tQ\x1c\0\0\0\0\0\0\xd9\x94\0\0\0\0\0\0%\x15v\xfb\x93\xfe\xdf\xe9*32\v\xa0\xfd\x9b\x04\xf8 \0\0\0\0\0\0\xe8\x94\0\0\0\0\0\0Y\x14\xd0\xfbs\xfes\xdd\xf8>g\v\xae\xf9\v\x07\xce!\0\0\0\0\0\0\xf7\x94\0\0\0\0\0\0#\x19\x91\xf8\xe8\xfd\x8e\xed\xa10\xf6\ti\xfdS\x05u\x19\0\0\0\0\0\0\x04\x95\0\0\0\0\0\0g\x17<\xf9E\xfe\xfc\xef\xd5.M\t@\xfd\xbb\x05h\x17\0\0\0\0\0\0\x13\x95\0\0\0\0\0\0U\x17a\xf9]\xfe\x0e\xf1\x15.\xf5\b\x81\xfdv\x05\x9d\x16\0\0\0\0\0\0"\x95\0\0\0\0\0\0\x97\x148\xfd\xa5\xfe\xf7\xe7U5\xcb\n\xbf\xf9>\tJ\x1c\0\0\0\0\0\x000\x95\0\0\0\0\0\0\xce\x16j\xfa\n\xffW\xf2\xd5,\xf9\b\x14\xfd]\x07\x92\x16\0\0\0\0\0\0=\x95\0\0\0\0\0\0\xe5\x19\x94\xf8\x1d\xfe\xf6\xed=0\xf6\t\x92\xfde\x05r\x19\0\0\0\0\0\0L\x95\0\0\0\0\0\x001\x13\xe3\xfd6\xff\x0e\xe8\xc94Z\v\xe4\xf9g\b\x0f\x1c\0\0\0\0\0\0Y\x95\0\0\0\0\0\0\x97\x148\xfd\xa5\xfe\xf7\xe7U5\xcb\n\xbf\xf9>\tJ\x1c\0\0\0\0\0\0e\x95\0\0\0\0\0\0g\x17P\xfa9\xfed\xedg/\xa4\v=\xfd\x91\x05-\x1a\0\0\0\0\0\0o\x95\0\0\0\0\0\0g\x17P\xfa9\xfed\xedg/\xa4\v=\xfd\x91\x05-\x1a\0\0\0\0\0\0{\x95\0\0\0\0\0\0\xf1\x17\xf7\xf9^\xfe\xbe\xec\xca0\xb7\n/\xfc\x9d\x06\xd7\x19\0\0\0\0\0\0\x87\x95\0\0\0\0\0\0\xf1\x17\xf7\xf9^\xfe\xbe\xec\xca0\xb7\n/\xfc\x9d\x06\xd7\x19\0\0\0\0\0\0\x93\x95\0\0\0\0\0\0\xf1\x17\xf7\xf9^\xfe\xbe\xec\xca0\xb7\n/\xfc\x9d\x06\xd7\x19\0\0\0\0\0\0\x9f\x95\0\0\x8a\0\0\0\xfb\x1a\x18\xfb{\xfd\xb4\xecM1\x10\tR\xf9\x15\nV\x18\0\0\0\0\0\0\xaa\x95\0\0t\0\0\0\x97\x1a\xba\xfa\xaa\xfe\x88\xef\x81-\x07\n\xbf\xfb\xd1\x07\x14\x19\0\0\0\0\0\0\x9f\x95\0\0\0\0\0\0\x95\x19\xf2\xf9L\xfe\xf0\xec\x930\xc1\n\xaa\xfcL\x07@\x1b\0\0\0\0\0\0\xaa\x95\0\0\0\0\0\0\x95\x19\xf2\xf9L\xfe\xf0\xec\x930\xc1\n\xaa\xfcL\x07@\x1b\0\0\0\0\0\0\xb5\x95\0\0\0\0\0\0\xf1\x17\xf7\xf9^\xfe\xbe\xec\xca0\xb7\n/\xfc\x9d\x06\xd7\x19\0\0\0\0\0\0\xc0\x95\0\0\0\0\0\0s\x15X\xfb\x95\xfe\xa9\xec60\x84\vq\xfc\xba\x06\x18\x1c\0\0\0\0\0\0\xcb\x95\0\0\0\0\0\0g\x17P\xfa9\xfed\xedg/\xa4\v=\xfd\x91\x05-\x1a\0\0\0\0\0\0\xd4\x95\0\0\0\0\0\0\xb5\x17;\xfb\x92\xfe\x9b\xeb\xeb1\xae\n\0\xfc\x12\b\xb2\x1a\0\0\0\0\0\0\xe1\x95\0\0\0\0\0\0b\x17\xae\xf9a\xfe3\xee,.0\fW\xfd|\x05;\x1b\0\0\0\0\0\0\xee\x95\0\0\0\0\0\0g\x17P\xfa9\xfed\xedg/\xa4\v=\xfd\x91\x05-\x1a\0\0\0\0\0\0\xfb\x95\0\0\0\0\0\0,\x17,\xfae\xfe3\xed\xfd/(\v\x1b\xfd\xf4\x05S\x1a\0\0\0\0\0\0\b\x96\0\0\0\0\0\0g\x17P\xfa9\xfed\xedg/\xa4\v=\xfd\x91\x05-\x1a\0\0\0\0\0\0\x15\x96\0\0\0\0\0\0g\x17P\xfa9\xfed\xedg/\xa4\v=\xfd\x91\x05-\x1a\0\0\0\0\0\0"\x96\0\0\0\0\0\0s\x15X\xfb\x95\xfe\xa9\xec60\x84\vq\xfc\xba\x06\x18\x1c\0\0\0\0\0\0/\x96\0\0\0\0\0\0s\x15X\xfb\x95\xfe\xa9\xec60\x84\vq\xfc\xba\x06\x18\x1c\0\0\0\0\0\0<\x96\0\0\0\0\0\0\xc8\x18\xb4\xf92\xfe\x01\xed\xbd0y\n\x9f\xfc\xfa\x06\xf3\x1a\0\0\0\0\0\0\x0f\x9c\xb3?Ttd\xbe\xa9\x13\xd0\xbd\x99\xbb\x06\xbf\x12\xa5\xbd?\x96C\x8b<4\x807\xbc\xe2\xe9\x95<\xf5Ji?\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x10@\0\0@?\0\0\xe0\xbf\0\0\x80\xbe\0\0\x80\xbe\0\0@?\0\0@?\0\0\x80\xbe\0\0\x80\xbe\0\0\xe0\xbf\0\0@?\0\0\x10@\xd3M\xf2?\x19\x04\xd6\xbeF\xb6\xf3\xbe\xa4p\xfd\xbe\xaa\xf1\xe2?\x04V\x8e\xbe\x0e-\x82\xbf\x14\xae\'\xbf\f\x02+@\0\0\0\0\0\0\0\0\0\0\0\0\x06\xd8\xf7\xbf\xebt\xe6?\xfdg\xb9\xbf\x90e%@\0\xe3\xb3?sc\x06\xbf\x9b\x03\x94\xbe\x81>\xd1>K<\x9a\xbf\xf0\x88\x8a?[?<@S\xcb\xe8\xbf\0\0\f\0\0\x04\0\x03\0\0\0\0\0\x94\0\0AVT\0\0\0\0\0\0\0F-080C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x17\x16\0p\x05\x10\x04\0\0\0\0\0\x94\0\0AVT\0\0\0\0\0\0\0F-145C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0L\x1d\0@\x06\xb0\x04\0\0\0\0\0\x94\0\0AVT\0\0\0\0\0\0\0F-201C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0(RM\0\x1c\n\xa6\x07\0\0\0\0\0\x94\0\0AVT\0\0\0\0\0\0\0F-510C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x004RM\0\x1c\n\xa6\x07\0\0\0\0\0\x94\0\0AVT\0\0\0\0\0\0\0F-510C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\f\0P\xa4\x9a\0\x1c\n\xa6\x07\0\0\0\0\t\x94\0\0AVT\0\0\0\0\0\0\0F-510C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\\\xa4\x9a\0\x1c\n\xa6\x07\0\0\0\0\t\x94\0\0AVT\0\0\0\0\0\0\0F-510C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\f\0\xd0\x89\xf6\0\xc8\f\xa5\t\0\0\0\0\t\x94\0\0AVT\0\0\0\0\0\0\0F-810C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xd8\xf3\0\xc0\f\x90\t\0\0\0\0\ba\0\x01AgfaPhoto\0DC-833m\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xf0\xf7\x92\0\xe4\tn\x07\0\0\0\0`a\0\0Alcatel\0\0\x005035D\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xf6\xc5+\0h\x05\f\x04\0\0\0\0@I\0\bBaumer\0\0\0\0TXG14\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x006\x04P\xd7P\0`\t\xe6\x06\f\f,\x02(\x94\0\x02Canon\0\0\0\0\0PowerShot SD300\0\0\0\0\0\0\0`\xffc\0h\n\xb0\x07\x04\x04,\x04(\x94\0\x02Canon\0\0\0\0\0PowerShot A460\0\0\0\0\0\0\0\0@Ld\0p\n\xb0\x07\f\b,\0(\x94\0\x02Canon\0\0\0\0\0PowerShot A610\0\0\0\0\0\0\0\0`\x85e\0p\n\xc8\x07\n\x06*\x02(\x94\0\x02Canon\0\0\0\0\0PowerShot A530\0\0\0\0\0\0\0\0\xf0\xa8u\0H\vX\b,\b\x04\0(\x94\0\x02Canon\0\0\0\0\0PowerShot S3 IS\0\0\0\0\0\0\0\x10\xae\x8c\0P\f$\t$\f\x04\0(\x94\0\x02Canon\0\0\0\0\0PowerShot A620\0\0\0\0\0\0\0\0h\n\x8d\0P\f*\t\f\x07,\r(I\0\x02Canon\0\0\0\0\0PowerShot A470\0\0\0\0\0\0\0\0\xe0\xcc\x9d\0\b\r\xb0\t\x06\x05 \x03(\x94\0\x02Canon\0\0\0\0\0PowerShot A720 IS\0\0\0\0\0\x10o\x9e\0\x10\r\xb4\t\f\x06,\x06(\x94\0\x02Canon\0\0\0\0\0PowerShot A630\0\0\0\0\0\0\0\0X\x87\xc5\0\x98\x0e\xd4\n\f\x064\x06(\x94\0\x02Canon\0\0\0\0\0PowerShot A640\0\0\0\0\0\0\0\0\x10\x97\xee\0\b\x10\xe8\v0\f\x18\f(\x94\0\x02Canon\0\0\0\0\0PowerShot A650\0\0\0\0\0\0\0\0\xf0\x04\xec\0\x88\x0e\xd4\n\x06\f\x1e\0(\x94\0\x02Canon\0\0\0\0\0PowerShot SX110 IS\0\0\0\0\xf0\t\xed\0\x90\x0e\xda\n\f\t,\t(\x94\0\x02Canon\0\0\0\0\0PowerShot SX120 IS\0\0\0\0@\xa2\x1c\x01\xf0\x0f\xe8\v\x18\f\x18\f(\x94\0\x02Canon\0\0\0\0\0PowerShot SX20 IS\0\0\0\0\0\xf0\xea#\x01H\x10\xf4\v\\\x10\x04\x01(\x94\0\x02Canon\0\0\0\0\0PowerShot SX220 HS\0\0\0\0\xe0\xb7N\x01p\x11\xcc\f\x19\nI\f(\x16\0\x02Canon\0\0\0\0\0PowerShot SX30 IS\0\0\0\0\0\0Cy\x01`\x12\xb0\r\b\x108\b(\x94\0\x02Canon\0\0\0\0\0PowerShot A3300 IS\0\0\0\0\0\xdc\xd6\x01\x80\x14P\x0f\b\x108\x10(\x94\0\x02Canon\0\0\0\0\0IXUS 160\0\0\0\0\0\0\0\0\0\0\0\0\0\0 (\x1e\0`\x06\xbb\x04\0\x02\0\x01\0\x94\0\x01Casio\0\0\0\0\0QV-2000UX\0\0\0\0\0\0\0\0\0\0\0\0\0`\x191\0 \b\v\x06\0\0\n\x01\0\x94\0\x01Casio\0\0\0\0\0QV-3*00EX\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\xe2^\0\x19\n\x84\x07\0\0\t\0\0\x94\0\x01Casio\0\0\0\0\0QV-5700\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0Fw\x003\v\x85\b\0\0"$\0\x16\0\x01Casio\0\0\0\0\0EX-Z60\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xd4,\0U\x06\xb8\x04\0\0\x01\0\0\x94\x07\rCasio\0\0\0\0\0EX-S20\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\x82K\0*\b*\x06\0\0 "\0\x94\x07\x01Casio\0\0\0\0\0EX-S100\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0b\\\0*\t\xb8\x06\x02\0 \0\0\x94\x07\x01Casio\0\0\0\0\0QV-R41\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`Rq\0\b\n\x88\x07\0\0\0\0\0\x94\0\x01Casio\0\0\0\0\0EX-P505\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0@\xe9r\0*\n\x89\x07\0\0\x16\0\0\x94\x07\x01Casio\0\0\0\0\0QV-R51\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x17s\0*\n\x8c\x07\0\0 \0\0\x94\x07\x01Casio\0\0\0\0\0EX-Z50\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0@cs\0*\n\x91\x07\0\0\x19\0\0\x16\x07\x01Casio\0\0\0\0\0EX-Z500\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80Nv\0*\n\xc2\x07\0\0 \x1a\0\x94\x07\x01Casio\0\0\0\0\0EX-Z55\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x1d\x8e\0*\v|\b\0\0\x0e\x1e\0\x94\x07\x01Casio\0\0\0\0\0EX-P600\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xc0Q\xa5\0*\f\x0f\t\0\0\x1b\0\0\x94\0\x01Casio\0\0\0\0\0EX-Z750\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0@v\xa5\0*\f\x11\t\0\0\x19\0\0\x94\0\x01Casio\0\0\0\0\0EX-Z75\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\x87\xa7\0*\f.\t\0\0  \0\x94\x07\x01Casio\0\0\0\0\0EX-P700\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\xd6\xbb\0\xd5\f\xc2\t\0\0\x06\x1e\0\x94\0\x01Casio\0\0\0\0\0EX-Z850\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x95\xbe\0\0\r\xc6\t\0\0/#\0\x94\0\x01Casio\0\0\0\0\0EX-Z8\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\xec\0\xaa\x0e\xc0\n\0\0R\0\0\x94\0\x01Casio\0\0\0\0\0EX-Z1050\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\x1d\x01\0\x10\xe4\v\0\0\x18\0P\x94\x07\x01Casio\0\0\0\0\0EX-ZR100\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xa0?u\0\xd4\b\xa4\x06\0\0\0\0\r\x94\0\x01Casio\0\0\0\0\0QV-4000\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x04\f\0\0\x04\x01\x03\0\x01\0\0\0I\0\0Creative\0\0PC-CAM 600\0\0\0\0\0\0\0\0\0\0\0\0\0\xe6\xb7\x01 \x11\xd8\f\0\0\0\0$a\0\0DJI\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x000\xe7\0\0\x12\xd8\f\0\0\0\0\0\x94\0\0Matrix\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x98:\0@\x06\xb0\x04\0\0\0\0AI\0\0Foculus\0\0\x00531C\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xb0\x04\0\x80\x02\xe0\x01\0\0\0\0\0\x94\0\0Generic\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xf4\0\0\0\x01\xf4\0\x01\x01\x06\x01\0\x8d\0\0Kodak\0\0\0\0\0DC20\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe8\x01\0\0\x02\xf4\0\x01\x01\n\x01\0\x8d\0\0Kodak\0\0\0\0\0DC20\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x008\x19\0\0\x064\x04\x004\0\0\0a\0\0Kodak\0\0\0\0\0DCS200\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0Fw?\0"\t\xf3\x06\x01!\x01\x02\0\x94\0\0Kodak\0\0\0\0\0C330\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x9e\x83?\0"\t\xf3\x06\x01!\x01\x02\0\x94\0\0Kodak\0\0\0\0\0C330\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0X\f\0J"\0\xd0\x04\x90\x03\0\0\x10\0\0\0\0\0Kodak\0\0\0\0\0C330\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0o3\0\xd0\x04\x90\x03\0\0\x10\0\0\0\0\0Kodak\0\0\0\0\0C330\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\v^\x000\vh\b\0\0\0\0\0\x94\0\0Kodak\0\0\0\0\0C603\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xd8\x17^\x000\vh\b\0\0\0\0\0\x94\0\0Kodak\0\0\0\0\0C603\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0X\f\0\b\x07\0\x80\x02\xe0\x01\0\0\0\0\0\0\0\0Kodak\0\0\0\0\0C603\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0 \x1b\x8b\0 \vV\b\0\0\0\0\0\0\0\0Kodak\0\0\0\0\0C603\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x000\xc9\xba\0\xc8\x0f\xd6\v\x02\0\0\r\0I\0\0Kodak\0\0\0\0\x0012MP\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0tD\xbb\0\xc8\x0f\xd6\v\x02\0\0\r\0I\0\0Kodak\0\0\0\0\x0012MP\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0D{\x80\xa8\x12\x01\xa0\x0f\xb8\v\0\0\0\0\0\0\0\0Kodak\0\0\0\0\x0012MP\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\t\0\x80\x02\xe0\x01\0\x03\0\0@\x94\0\0Kodak\0\0\0\0\0KAI-0340\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\xea\0\x80\f`\t\0\0\0\0`\x16\0\0Lenovo\0\0\0\0A820\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80G;\0H\x06\xb7\x04\0\0\0\0`\x16\0\0Micron\0\0\0\x002010\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x8c\f\0`\x11\0\xfe\x05\xda\x03\0\0\0\0\0a\0\0Minolta\0\0\0RD175\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x01\x02\x04 \x18\0\x19\x05\xc9\x03\0\0\x12\x06\x06\x1e\x04\x01Nikon\0\0\0\0\0E900\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xa0%\0f\x06\xb4\x04\0\0\x16\x01\x06K\x05\x01Nikon\0\0\0\0\0E950\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe0,\0P\x06\xbd\x04\0\0\0\x07\x1e\x94\0\x01Nikon\0\0\0\0\0E2100\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xd0H\0\x10\b\x05\x06\0\0\0\x01\x06\xe1\0\x01Nikon\0\0\0\0\0E990\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe0H\0\x10\b\x06\x06\0\0\0\0\x1e\x94\0\x01Nikon\0\0\0\0\0E3700\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80Y\0\xf0\b\xad\x06\0\0\0\x01\x06\xb4\0\x01Nikon\0\0\0\0\0E4500\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x90Y\0\xf0\b\xae\x06\0\0\0\0\x06\x16\0\x01Nikon\0\0\0\0\0E4300\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80q\0\x10\n\x85\x07\0\0\0\x01\x06\xb4\0\x01Nikon\0\0\0\0\0E5000\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0P\x89\0\x10\vF\b\0\0\0\0\x1e\x94\x07\x01Nikon\0\0\0\0\0COOLPIX S6\0\0\0\0\0\0\0\0\0\0\0\0\0\xa0Z\0\0\t\xb6\x06\0\0\0\0\x1e\x16\0\0Olympus\0\0\0C770UZ\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0@\x800\0\x10\b\x04\x06\0\0\0\0\0\x94\0\x01Pentax\0\0\0\0Optio S\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe2I\0*\b\b\x06\0\0\x16\0\0\x94\x07\x01Pentax\0\0\0\0Optio S\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xc0K]\0*\t\xc9\x06\0\0\x16\0\0\x94\x07\x01Pentax\0\0\0\0Optio S4\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0P\xa3\0\0\f\x12\t\0\0\0\x15\x1e\x94\0\x01Pentax\0\0\0\0Optio 750Z\0\0\0\0\0\0\0\0\0\0\0\0\0H?\0\x80\x078\x04\0\0\0\0\0I\0\0Photron\0\0\0BC2-HD\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0rY?\0\x80\x078\x04\0\0\0\0\0I\0\0Photron\0\0\0BC2-HD\0\0\0\0\0\0\0\0\0\0\0\0\0\0\b\0\0&\xca\0\xa0\b\xb8\v\0\0\0\0\ra\0\0Pixelink\0\0A782\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0`\0\0\b\0\x06\0\0\0\0`a\0\0RoverShot\x003320AF\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x90\xc1\x04\0\x84\x02\xe4\x01\0\0\0\0\0\x16\0\bST Micro\0\0STV680 VGA\0\0\0\0\0\0\0\0\0\0\0\0\0\xa3\xf5\0\xd8\f\x90\t\0\0\x18\0\t\x94\0\x01Samsung\0\0\0S85\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0n\xf7\0\xf0\f\x90\t\0\x000\0\t\x94\0\x01Samsung\0\0\0S85\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x9c8\x01@\x0e\xf8\n\0\0\0\0\r\x94\x05\x01Samsung\0\0\0WB550\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x006n\x01\xa0\x0f\xb8\v\0\0\0\0\r\x94\x05\x01Samsung\0\0\0WB550\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0D\0\xc0\0\0\f\0\b\0\0\0\0!a\0\0Sinar\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0D\0D\x02\xfc\x01\xf0\x0f\xf0\x0f\0\0\0\0!a\0\0Sinar\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0D\0DX\xa5\x02\xf0\x0f@\x15\0\0\0\0!a\0\0Sinar\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0D\0\0\x80\x15\0`\x05\0\x04\0\0\x01\0\0I\0\0Sony\0\0\0\0\0\0XCD-SX910CR\0\0\0\0\0\0\0\0\0\0\0\0\0+\0`\x05\0\x04\0\0\x01\0aI\0\0Sony\0\0\0\0\0\0XCD-SX910CR\0\0\0\0\0\0\0\0\0\0\0O\x96\0\0\x93s\0\0Y\x96\0\0_\x96\0\0e\x96\0\0n\x96\0\0u\x96\0\0}\x96\0\0Ev\0\0\x86\x96\0\0\x8d\x96\0\0ls\0\0\\s\0\0\x93\x96\0\0\x8ds\0\0\x9b\x96\0\0,w\0\0\xa2\x96\0\0\xaa\x96\0\0\xa4\x93\0\0\xb0\x96\0\0\x02\0\0\xc0\x03\0\0\xc0\x04\0\0\xc0\x05\0\0\xc0\x06\0\0\xc0\x07\0\0\xc0\b\0\0\xc0\t\0\0\xc0\n\0\0\xc0\v\0\0\xc0\f\0\0\xc0\r\0\0\xc0\x0e\0\0\xc0\x0f\0\0\xc0\x10\0\0\xc0\x11\0\0\xc0\x12\0\0\xc0\x13\0\0\xc0\x14\0\0\xc0\x15\0\0\xc0\x16\0\0\xc0\x17\0\0\xc0\x18\0\0\xc0\x19\0\0\xc0\x1a\0\0\xc0\x1b\0\0\xc0\x1c\0\0\xc0\x1d\0\0\xc0\x1e\0\0\xc0\x1f\0\0\xc0\0\0\0\xb3\x01\0\0\xc3\x02\0\0\xc3\x03\0\0\xc3\x04\0\0\xc3\x05\0\0\xc3\x06\0\0\xc3\x07\0\0\xc3\b\0\0\xc3\t\0\0\xc3\n\0\0\xc3\v\0\0\xc3\f\0\0\xc3\r\0\0\xd3\x0e\0\0\xc3\x0f\0\0\xc3\0\0\f\xbb\x01\0\f\xc3\x02\0\f\xc3\x03\0\f\xc3\x04\0\f\xd3\x05\0\0\0\0\0\0\0\0\0\0\0\x01\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x01\0\0\0\x02\0\0\0A\x86\x05\0\0\0\0\0\0\0\0\0\0\0\0\0\x02\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xff\xff\xff\xff\xff\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x18#\x03\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x05\0\0\0\0\0\0\0\0\0\0\0\x01\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x03\0\0\0\x02\0\0\0I\x86\x05\0\0\x04\0\0\0\0\0\0\0\0\0\0\x01\0\0\0\0\0\0\0\0\0\0\0\0\0\0\n\xff\xff\xff\xff\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0xZ\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x04\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xff\xff\xff\xff\xff\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\n\0\0\0d\0\0\0\xe8\x03\0\0\x10\'\0\0\xa0\x86\x01\0@B\x0f\0\x80\x96\x98\0\0\xe1\xf5\x05_p\x89\0\xff\t/\x0f\x9b\x02f\x01\x8d\x015\x02\xc4\x01\xdb\x02\x86\x01o\x01\xf3\x01\x05\x02_\x04\x8c\x01\\\x01\xc0\x01\x19\x02w\x05\xe5\x01\xaf\x01\xfc\x01\xb0\x02B\xff\xbe\x02\xaa\xf8V\tE\x07\xbb\xfa\x89\x03w\xfeP\xfe\xb0\x039\n\xc7\xf7M\xfb\xb3\x06\x90\xfbp\x06l\x05\x94\xfc\v\x01\xf5\0\x97\xf9i\bQ\x0f\xaf\xf2\x99\xfdg\x04\xe5\xf9\x1b\b\x9d\x05c\xfc\xfd\x01\x03\0\f\xfd\xf4\x04\xd7\t)\xf8B\xff\xbe\x02\xa2\xf8^\ti\b\x97\xf9\xfb\x02\x05\xff<\xfe\xc4\x03\xe0\v \xf6B\xff\xbe\x02\xaa\xf8V\tE\x07\xbb\xfa\x89\x03w\xfeP\xfe\xb0\x039\n\xc7\xf7\xd9\xfc\'\x05\x07\xf9\xf9\bl\x05\x94\xfc\x01\x03\xff\xfe\x1a\xff\xe6\x02\x13\b\xed\xf9u\x04y\x04h\x04U\x04\x9a\x04}\x04h\x04U\x04\xa7\xff\xc4\xff\xd4\xff\xe0\xff\xea\xff\xf1\xff\xf8\xff\xfe\xff\x02\0\b\0\x0f\0\x16\0 \0,\0<\0Y\0\xfd\xff\xff\xff\x01\0\x03\0\xfb\xff\xff\xff\x01\0\x05\0\xf8\xff\xfe\xff\x02\0\b\0\xf3\xff\xfd\xff\x03\0\r\0\xed\xff\xfc\xff\x04\0\x13\0\xe4\xff\xfa\xff\x06\0\x1c\0\0\0\x01\0\x02\0\x03\0\x04\0\x05\0\x06\0\x07\0\b\0\t\0\v\0\f\0\r\0\x0e\0\x0f\0\x10\0\x11\0\x12\0\x13\0\x14\0\x15\0\x16\0\x17\0\x18\0\x19\0\x1a\0\x1b\0\x1c\0\x1d\0\x1e\0 \0!\0"\0#\0$\0%\0&\0\'\0(\0)\0*\0+\0,\0-\0.\0/\x000\x001\x002\x003\x005\x006\x007\x008\x009\0:\0;\0<\0=\0>\0?\0@\0A\0B\0C\0D\0E\0F\0G\0H\0J\0K\0L\0M\0N\0O\0P\0Q\0R\0S\0T\0V\0X\0Z\0\\\0^\0a\0c\0e\0g\0i\0k\0n\0p\0r\0t\0v\0x\0{\0}\0\x7f\0\x81\0\x83\0\x86\0\x88\0\x8a\0\x8c\0\x8e\0\x90\0\x93\0\x95\0\x97\0\x99\0\x9b\0\x9e\0\xa0\0\xa2\0\xa4\0\xa6\0\xa8\0\xab\0\xad\0\xaf\0\xb1\0\xb3\0\xb5\0\xb8\0\xba\0\xbc\0\xbe\0\xc0\0\xc3\0\xc5\0\xc7\0\xc9\0\xcb\0\xcd\0\xd0\0\xd2\0\xd4\0\xd6\0\xd8\0\xda\0\xdd\0\xdf\0\xe2\0\xe6\0\xeb\0\xef\0\xf4\0\xf8\0\xfc\0\x01\x01\x05\x01\t\x01\x0e\x01\x12\x01\x16\x01\x1b\x01\x1f\x01#\x01(\x01,\x011\x015\x019\x01>\x01B\x01F\x01K\x01O\x01S\x01X\x01\\\x01`\x01e\x01i\x01m\x01r\x01v\x01{\x01\x7f\x01\x83\x01\x88\x01\x8c\x01\x90\x01\x95\x01\x99\x01\x9d\x01\xa2\x01\xa6\x01\xaa\x01\xaf\x01\xb3\x01\xb8\x01\xbc\x01\xc0\x01\xc5\x01\xc9\x01\xcd\x01\xd2\x01\xd6\x01\xda\x01\xdf\x01\xe3\x01\xe7\x01\xec\x01\xf0\x01\xf4\x01\xfc\x01\x07\x02\x13\x02\x1e\x02)\x024\x02?\x02K\x02V\x02a\x02l\x02w\x02\x83\x02\x8e\x02\x99\x02\xa4\x02\xaf\x02\xba\x02\xc6\x02\xd1\x02\xdc\x02\xe7\x02\xf2\x02\xfe\x02\t\x03\x14\x03\x1f\x03*\x036\x03A\x03L\x03W\x03b\x03n\x03y\x03\x84\x03\x8f\x03\x9a\x03\xa5\x03\xb1\x03\xbc\x03\xc7\x03\xd2\x03\xdd\x03\xe9\x03\xf4\x03\xff\x03\x10\0\x10\0\x10\0\0\0\0\0\0\x05@\x05\x10\t \x0e\0\r@\x1f\xff\x0f\xff?\xff\xff\xff?\x11\x0f\x10\x0f\x0f\x0e\x0e\r\r\f\f\v\v\n\n\t\t\b\b\x07\x07\x06\x06\x05\x05\x04\x04\x03\x03\x03\0\x03\x02\x02\x01\x02\x04\x03\x07\x03\x06\x02\x05\x02\x03\x04\0\x06\t\x07\n\b\v\t\f\n\r\n\x01\x05\b\x04\x02\x04:\f\xcf\x06\x04\0\0\0\xfa\xff\0\0:\f\x07\b\x04\0\0\0\xfa\xff\0\0:\f\x0f\t\x04\0\0\0\xfa\xff\0\0b\f7\b\x12\0\0\0\xd6\xff\x14\0b\f?\t\x12\0\r\0\xd6\xff\xeb\xffi\f?\t\0\0\0\0\xff\xff\0\0\xe8\f\x9a\t\0\0\0\0\xff\xff\0\0\x02\r\x9f\t\t\0\0\0\xfb\xff\0\0\x02\r\xaf\t\t\0\0\0\xef\xff\x04\0*\rk\x07\x0f\0\0\0\xd4\xff\x14\0*\r\xbb\b\x0f\0\0\0\xd4\xff\x14\0*\r\xcf\t\x0f\0\n\0\xd4\xff\xeb\xffj\x0e\xbf\n\x03\0\0\0\xf8\xff\xfd\xff~\x0e\xbf\n\0\0\0\0\xfd\xff\0\0\x8c\x0e\x92\t\0\0\0\0\0\0\xfe\xff\xba\x0e\xb7\t\x11\0\0\0\xd4\xff\x13\0\xba\x0e\xef\n\x11\0\x0f\0\xd4\xff\xed\xff(\x0fz\b\x06\0\0\0\xfa\xff\0\0\xdc\x0f\xca\v\0\0\0\0\0\0\xfe\xff\xc2\x10W\t\x03\0\0\0\xf8\xff\xff\xff\xea\x10\x87\t\x11\0\x0f\0\xd4\xff\xed\xff\x9c\x11\x92\v\0\0\0\0\xfd\xff\xfc\xff\x9c\x11\x02\r\0\0\0\0\xfd\xff\xfa\xff\x98\x07\x88\x05\0\0\0\x000\0\0\0\0\0\0\0\0\0\0\0\0\0`\b\x18\x06\x04\0\b\x004\0\x02\0\0\0\0\0\0\0\x19\0\0\0\xb0\b\xb0\x050\0\x06\0\0\0\x02\0\0\0\0\0\0\0\0\0\0\0H\t\xc0\x06\f\0\x06\x004\0\x02\0\0\0\0\0\0\0\0\0\0\0p\n\xb0\x07\f\0\x06\0,\0\x02\0\0\0\0\0\0\0\0\0\0\0P\f\x14\b@\0\f\0\0\0\0\0\x10\0\0\0\0\0\0\0\0\0X\f(\t,\0\f\0\x04\0\x04\0\0\0\0\0\0\0\0\0\0\0\x10\r\xb4\t\x04\0\x06\x004\0\x06\0\0\0\0\0\0\0\0\0\0\0\xbc\r\x18\t*\0\x0e\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\f\x0e8\tJ\0\f\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xa0\x0e\xe0\n4\0\f\0\b\0\f\0\0\0\0\0\0\0\0\0\0\0h\x0f>\n\x1e\0\x12\0\x06\0\x02\0\0\0\0\0\0\0\0\0\0\0l\x0f>\n*\0\x12\0\0\0\x02\0\0\0\0\0\0\0\0\0\0\0\x90\x0f>\nL\0\x14\0\0\0\x02\0\x0e\0\0\0\0\0\0\0\0\0\b\x10\xe8\v0\0\f\0\x18\0\f\0\0\0\0\0\0\0\0\0\0\0\x14\x10\x82\b\x04\0\x02\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x008\x10\xd4\n\xc0\0\f\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0@\x104\fh\0\v\0\b\0A\0\0\0\0\0\0\0\0\0\0\0P\x10\xf6\v`\0\x11\0\b\0\0\0\0\0\x10\0\0\0\x07\0I\0`\x10\xf6\v`\0\x11\0\x18\0\0\0\0\0\x10\0\0\0\0\0I\0\xd8\x10<\v\x16\0\x12\0\0\0\x02\0\0\0\0\0\0\0\0\0\0\0\0\x11:\v>\0\x12\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0|\x11\x8a\vZ\0"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x80\x11\x14\r\f\0\n\0$\0\f\0\0\0\0\0\0\0\x12\0I\0\x80\x11&\rP\x002\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x90\x11&\rP\x002\0\f\0\0\0\0\0\0\0\0\0\0\0\0\0\xa0\x12\xbc\r`\0\x10\0\0\0\0\0\0\0\x10\0\0\0\0\0\0\0\xe0\x12\x84\f>\0\x1a\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe0\x12\x9c\f>\x003\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xf4\x13\x15\rb\0\r\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x14\xf6\f\x8e\0-\0>\0\0\0\0\0\0\0\0\0\0\0\0\0\xa0\x14\xc8\rH\x004\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe0\x14\xbc\r\x8e\x003\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xe0\x14\0\x0e~\0d\0\0\0\x02\0\0\0\0\0\0\0\0\0\0\0\xf0\x14\xbc\r\x9e\x003\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xc0\x15|\x0eH\0&\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x16~\x0e`\0\x11\0\0\0\0\0\0\0\x10\0\0\0\0\0I\0P\x16\xbe\x0e>\0\x14\0\n\0\x02\0\0\0\0\0\0\0\0\0\0\0\xa0\x16\xdc\x0e\x9e\x003\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0 \x17n\x0fz\0P\0\x02\0\0\0\0\0\0\0\0\0\0\0\0\0\xd0\x17\xd8\x0fH\0"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x90\x18\xd8\x0f\b\x01"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\xc0" \x17\xa0\0@\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0h\x01EOS 10D\0\0\0\0\0\0\0\0\0\0\0\0\0\x01\0EOS-1D\0\0\0\0\0\0\0\0\0\0\0\0\0\0u\x01EOS 20D\0\0\0\0\0\0\0\0\0\0\0\0\0t\x01EOS-1D Mark II\0\0\0\0\0\x004\x02EOS 30D\0\0\0\0\0\0\0\0\0\0\0\0\x002\x02EOS-1D Mark II N\0\0\0\0\x90\x01EOS 40D\0\0\0\0\0\0\0\0\0\0\0\0\0i\x01EOS-1D Mark III\0\0\0\0\0a\x02EOS 50D\0\0\0\0\0\0\0\0\0\0\0\0\0\x81\x02EOS-1D Mark IV\0\0\0\0\0\0\x87\x02EOS 60D\0\0\0\0\0\0\0\0\0\0\0\0\0g\x01EOS-1DS\0\0\0\0\0\0\0\0\0\0\0\0\0%\x03EOS 70D\0\0\0\0\0\0\0\0\0\0\0\0\0P\x03EOS 80D\0\0\0\0\0\0\0\0\0\0\0\0\0(\x03EOS-1D X Mark II\0\0\0\0p\x01EOS 300D\0\0\0\0\0\0\0\0\0\0\0\0\x88\x01EOS-1Ds Mark II\0\0\0\0\0v\x01EOS 450D\0\0\0\0\0\0\0\0\0\0\0\0\x15\x02EOS-1Ds Mark III\0\0\0\0\x89\x01EOS 350D\0\0\0\0\0\0\0\0\0\0\0\0$\x03EOS-1D C\0\0\0\0\0\0\0\0\0\0\0\x006\x02EOS 400D\0\0\0\0\0\0\0\0\0\0\0\0i\x02EOS-1D X\0\0\0\0\0\0\0\0\0\0\0\0R\x02EOS 500D\0\0\0\0\0\0\0\0\0\0\0\0\x13\x02EOS 5D\0\0\0\0\0\0\0\0\0\0\0\0\0\0p\x02EOS 550D\0\0\0\0\0\0\0\0\0\0\0\0\x18\x02EOS 5D Mark II\0\0\0\0\0\0\x86\x02EOS 600D\0\0\0\0\0\0\0\0\0\0\0\0\x85\x02EOS 5D Mark III\0\0\0\0\0\x01\x03EOS 650D\0\0\0\0\0\0\0\0\0\0\0\0\x02\x03EOS 6D\0\0\0\0\0\0\0\0\0\0\0\0\0\0&\x03EOS 700D\0\0\0\0\0\0\0\0\0\0\0\0P\x02EOS 7D\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x93\x03EOS 750D\0\0\0\0\0\0\0\0\0\0\0\0\x89\x02EOS 7D Mark II\0\0\0\0\0\0G\x03EOS 760D\0\0\0\0\0\0\0\0\0\0\0\0T\x02EOS 1000D\0\0\0\0\0\0\0\0\0\0\0\x88\x02EOS 1100D\0\0\0\0\0\0\0\0\0\0\0\'\x03EOS 1200D\0\0\0\0\0\0\0\0\0\0\0\x82\x03Canon EOS 5DS\0\0\0\0\0\0\0\x04\x04EOS 1300D\0\0\0\0\0\0\0\0\0\0\0\x01\x04Canon EOS 5DS R\0\0\0\0\0F\x03EOS 100D\0\0\0\0\0\0\0\0\0\0\0\0\x02\0DSC-R1\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x01DSLR-A100\0\0\0\0\0\0\0\0\0\0\0\x01\x01DSLR-A900\0\0\0\0\0\0\0\0\0\0\0\x02\x01DSLR-A700\0\0\0\0\0\0\0\0\0\0\0\x03\x01DSLR-A200\0\0\0\0\0\0\0\0\0\0\0\x04\x01DSLR-A350\0\0\0\0\0\0\0\0\0\0\0\x05\x01DSLR-A300\0\0\0\0\0\0\0\0\0\0\0\b\x01DSLR-A330\0\0\0\0\0\0\0\0\0\0\0\t\x01DSLR-A230\0\0\0\0\0\0\0\0\0\0\0\n\x01DSLR-A290\0\0\0\0\0\0\0\0\0\0\0\r\x01DSLR-A850\0\0\0\0\0\0\0\0\0\0\0\x11\x01DSLR-A550\0\0\0\0\0\0\0\0\0\0\0\x12\x01DSLR-A500\0\0\0\0\0\0\0\0\0\0\0\x13\x01DSLR-A450\0\0\0\0\0\0\0\0\0\0\0\x16\x01NEX-5\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x17\x01NEX-3\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x18\x01SLT-A33\0\0\0\0\0\0\0\0\0\0\0\0\0\x19\x01SLT-A55V\0\0\0\0\0\0\0\0\0\0\0\0\x1a\x01DSLR-A560\0\0\0\0\0\0\0\0\0\0\0\x1b\x01DSLR-A580\0\0\0\0\0\0\0\0\0\0\0\x1c\x01NEX-C3\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x1d\x01SLT-A35\0\0\0\0\0\0\0\0\0\0\0\0\0\x1e\x01SLT-A65V\0\0\0\0\0\0\0\0\0\0\0\0\x1f\x01SLT-A77V\0\0\0\0\0\0\0\0\0\0\0\0 \x01NEX-5N\0\0\0\0\0\0\0\0\0\0\0\0\0\0!\x01NEX-7\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0#\x01SLT-A37\0\0\0\0\0\0\0\0\0\0\0\0\0$\x01SLT-A57\0\0\0\0\0\0\0\0\0\0\0\0\0%\x01NEX-F3\0\0\0\0\0\0\0\0\0\0\0\0\0\0&\x01SLT-A99V\0\0\0\0\0\0\0\0\0\0\0\0\'\x01NEX-6\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0(\x01NEX-5R\0\0\0\0\0\0\0\0\0\0\0\0\0\0)\x01DSC-RX100\0\0\0\0\0\0\0\0\0\0\0*\x01DSC-RX1\0\0\0\0\0\0\0\0\0\0\0\0\0.\x01ILCE-3000\0\0\0\0\0\0\0\0\0\0\0/\x01SLT-A58\0\0\0\0\0\0\0\0\0\0\0\0\x001\x01NEX-3N\0\0\0\0\0\0\0\0\0\0\0\0\0\x002\x01ILCE-7\0\0\0\0\0\0\0\0\0\0\0\0\0\x003\x01NEX-5T\0\0\0\0\0\0\0\0\0\0\0\0\0\x004\x01DSC-RX100M2\0\0\0\0\0\0\0\0\x005\x01DSC-RX10\0\0\0\0\0\0\0\0\0\0\0\x006\x01DSC-RX1R\0\0\0\0\0\0\0\0\0\0\0\x007\x01ILCE-7R\0\0\0\0\0\0\0\0\0\0\0\0\x008\x01ILCE-6000\0\0\0\0\0\0\0\0\0\0\x009\x01ILCE-5000\0\0\0\0\0\0\0\0\0\0\0=\x01DSC-RX100M3\0\0\0\0\0\0\0\0\0>\x01ILCE-7S\0\0\0\0\0\0\0\0\0\0\0\0\0?\x01ILCA-77M2\0\0\0\0\0\0\0\0\0\0\0S\x01ILCE-5100\0\0\0\0\0\0\0\0\0\0\0T\x01ILCE-7M2\0\0\0\0\0\0\0\0\0\0\0\0U\x01DSC-RX100M4\0\0\0\0\0\0\0\0\0V\x01DSC-RX10M2\0\0\0\0\0\0\0\0\0\0X\x01DSC-RX1RM2\0\0\0\0\0\0\0\0\0\0Z\x01ILCE-QX1\0\0\0\0\0\0\0\0\0\0\0\0[\x01ILCE-7RM2\0\0\0\0\0\0\0\0\0\0\0^\x01ILCE-7SM2\0\0\0\0\0\0\0\0\0\0\0a\x01ILCA-68\0\0\0\0\0\0\0\0\0\0\0\0\0e\x01ILCE-6300\0\0\0\0\0\0\0\0\0\0\0\x02\x01\x01\x03\x02\x03\x02\0\x03\x02\x03\0\x01\x02\x01\0\0\x03\0\x02\0\x01\x03\x01\0\x01\x01\x02\0\x03\x03\x02\x02\x03\x03\x02\x03\x01\x01\x03\x03\x01\x02\x01\x02\0\0\x03\0\x01\0\x01\0\x02\0\x02\x02\0\x03\0\x01\x03\x02\x01\x03\x01\x01\x02\0\x01\0\x02\x01\x03\x01\x03\0\x01\x03\0\x02\0\0\x03\x03\x02\x03\x01\x02\0\x02\0\x03\x02\x02\x01\x02\x03\x03\x01\x02\x01\x02\x01\x02\x01\x01\x02\x03\0\0\x01\x01\0\0\x02\x03\0\0\x03\0\x03\0\x03\x02\x01\x02\x03\x02\x03\x03\x01\x01\x02\x01\0\x03\x02\x03\0\x02\x03\x01\x03\x01\0\x02\0\x03\0\x03\x02\0\x01\x01\x02\0\x01\0\x02\0\x01\x01\x03\x03\x02\x02\x01\x01\x03\x03\0\x02\x01\x03\x02\x02\x03\x02\0\0\x01\x03\0\x02\0\x01\x02\x03\0\x01\0\x01\x03\x01\x02\x03\x02\x03\x02\0\x02\0\x01\x01\0\x03\0\0\x02\0\x03\x01\0\0\x01\x01\x03\x03\x02\x03\x02\x02\x01\x02\x01\x03\x02\x03\x01\x02\x01\0\x03\0\x02\0\x02\0\x02\0\x03\x01\0\0\x02\0\x03\x02\x01\x03\x01\x01\x03\x01\x03%s: \0Unexpected end of file\n\0Corrupt data near 0x%llx\n\0\0\x01\x04\x02\x03\x01\x02\0\0\0\0\0\0\0\0\0\x04\x03\x05\x06\x02\x07\x01\b\t\0\n\v\xff\0\x02\x02\x03\x01\x01\x01\x01\x02\0\0\0\0\0\0\0\x03\x02\x04\x01\x05\0\x06\x07\t\b\n\v\xff\0\0\x06\x03\x01\x01\x02\0\0\0\0\0\0\0\0\0\x06\x05\x07\x04\b\x03\t\x02\0\n\x01\v\xff\0\x02\x02\x02\x01\x04\x02\x01\x02\x05\x01\x01\0\0\0\x8b\x03\x04\x02\x05\x01\x06\x07\b\x12\x13\x11\x14\t\x15"\0!\x16\n\xf0#\x17$12\x18\x193%A4B5Q678)y&\x1a9VW(\'RUXCvYwTa\xf9qxu\x96\x97I\xb7S\xd7t\xb6\x98GH\x95i\x99\x91\xfa\xb8h\xb5\xb9\xd6\xf7\xd8gFE\x94\x89\xf8\x81\xd5\xf6\xb4\x88\xb1*Dr\xd9\x87f\xd4\xf5:\xa7s\xa9\xa8\x86b\xc7e\xc8\xc9\xa1\xf4\xd1\xe9Z\x92\x85\xa6\xe7\x93\xe8\xc1\xc6zd\xe1Jj\xe6\xb3\xf1\xd3\xa5\x8a\xb2\x9a\xba\x84\xa4c\xe5\xc5\xf3\xd2\xc4\x82\xaa\xda\xe4\xf2\xca\x83\xa3\xa2\xc3\xea\xc2\xe2\xe3\xff\xff\0\x02\x02\x01\x04\x01\x04\x01\x03\x03\x01\0\0\0\0\x8c\x02\x03\x01\x04\x05\x12\x11\x06\x13\x07\b\x14"\t!\0#\x1512\n\x16\xf0$3AB\x19\x17%\x18Q4CR)5a9qb6S&8\x1a7\x81\'\x91yUE(rY\xa1\xb1DiTX\xd1\xfaW\xe1\xf1\xb9IGcj\xf9VF\xa8*Jx\x99:ut\x86e\xc1v\xb6\x96\xd6\x89\x85\xc9\xf5\x95\xb4\xc7\xf7\x8a\x97\xb8s\xb7\xd8\xd9\x87\xa7zH\x82\x84\xea\xf4\xa6\xc5Z\x94\xa4\xc6\x92\xc3h\xb5\xc8\xe4\xe5\xe6\xe9\xa2\xa3\xe3\xc2fg\x93\xaa\xd4\xd5\xe7\xf8\x88\x9a\xd7w\xc4d\xe2\x98\xa5\xca\xda\xe8\xf3\xf6\xa9\xb2\xb3\xf2\xd2\x83\xba\xd3\xff\xff\0\0\x06\x02\x01\x03\x03\x02\x05\x01\x02\x02\b\n\0u\x04\x05\x03\x06\x02\x07\x01\b\t\x12\x13\x14\x11\x15\n\x16\x17\xf0\0"!\x18#\x19$21%3874569yWXY(Vx\'A)w&Bv\x99\x1aU\x98\x97\xf9HT\x96\x89G\xb7I\xfauh\xb6gi\xb9\xb8\xd8R\xd7\x88\xb5tQF\xd9\xf8:\xd6\x87Ez\x95\xd5\xf6\x86\xb4\xa9\x94S*\xa8C\xf5\xf7\xd4f\xa7ZD\x8a\xc9\xe8\xc8\xe7\x9ajsJa\xc7\xf4\xc6e\xe9r\xe6q\x91\x93\xa6\xda\x92\x85b\xf3\xc5\xb2\xa4\x84\xbad\xa5\xb3\xd2\x81\xe5\xd3\xaa\xc4\xca\xf2\xb1\xe4\xd1\x83c\xea\xc3\xe2\x82\xf1\xa3\xc2\xa1\xc1\xe3\xa2\xe1\xff\xff%d.%d.%d\0\0\x01\b\x10\t\x02\x03\n\x11\x18 \x19\x12\v\x04\x05\f\x13\x1a!(0)"\x1b\x14\r\x06\x07\x0e\x15\x1c#*1892+$\x1d\x16\x0f\x17\x1e%,3:;4-&\x1f\'.5<=6/7>?????????????????\0\x01\x05\x01\x01\x01\x01\x01\x01\x02\0\0\0\0\0\0\x05\x04\x03\x06\x02\x07\x01\0\b\t\v\n\f\0\0\0\0\x01\x05\x01\x01\x01\x01\x01\x01\x02\0\0\0\0\0\x009Z8\'\x16\x05\x04\x03\x02\x01\0\v\f\f\0\0\0\x01\x04\x02\x03\x01\x02\0\0\0\0\0\0\0\0\0\x05\x04\x06\x03\x07\x02\b\x01\t\0\n\v\f\0\0\0\0\x01\x04\x03\x01\x01\x01\x01\x01\x02\0\0\0\0\0\0\x05\x06\x04\x07\b\x03\t\x02\x01\0\n\v\f\r\x0e\0\0\x01\x05\x01\x01\x01\x01\x01\x01\x01\x02\0\0\0\0\0\b\\K:)\x07\x06\x05\x04\x03\x02\x01\0\r\x0e\0\0\x01\x04\x02\x02\x03\x01\x02\0\0\0\0\0\0\0\0\x07\x06\b\x05\t\x04\n\x03\v\f\x02\0\x01\r\x0e\0\0U\xaa\xffP6\n%d %d\n255\n\x00012\x00102\0P%d\n%d %d\n255\n\0OmniVision\0\x01\x01\x02\x03\x03\x04\x04\x02\x05\x07\x06\x05\x07\x06\x07\b\x01\0\x02\x01\x03\x03\x04\x04\x05\x02\x06\x07\x07\x06\b\x05\b\b\x02\x01\x02\x03\x03\0\x03\x02\x03\x04\x04\x06\x05\x05\x06\x07\x06\b\x02\0\x02\x01\x02\x03\x03\x02\x04\x04\x05\x06\x06\x07\x07\x05\x07\b\x02\x01\x02\x04\x03\0\x03\x02\x03\x03\x04\x07\x05\x05\x06\x06\x06\b\x02\x03\x03\x01\x03\x02\x03\x04\x03\x05\x03\x06\x04\x07\x05\0\x05\b\x02\x03\x02\x06\x03\0\x03\x01\x04\x04\x04\x05\x04\x07\x05\x02\x05\b\x02\x04\x02\x07\x03\x03\x03\x06\x04\x01\x04\x02\x04\x05\x05\0\x05\b\x02\x06\x03\x01\x03\x03\x03\x05\x03\x07\x03\b\x04\0\x05\x02\x05\x04\x02\0\x02\x01\x03\x02\x03\x03\x04\x04\x04\x05\x05\x06\x05\x07\x04\b\x01\0\x02\x02\x02\xfe\x01\xfd\x01\x03\x02\xef\x02\xfb\x02\x05\x02\x11\x02\xf9\x02\x02\x02\t\x02\x12\x02\xee\x02\xf7\x02\xfe\x02\x07\x02\xe4\x02\x1c\x03\xcf\x03\xf7\x03\t\x041\x05\xb1\x05O\x02\xff\x02\r\x02\x1a\x03\'\x04\xf0\x057\x06\xdb\x06L\x02\xe6\x02\xf3\x02\x01\x03\xd9\x04\x10\x05\xc9\x06\xb4\x06%\0\x01\x05\x01\x01\x02\0\0\0\0\0\0\0\0\0\0\0\x01\x02\x03\x04\x05\x06\x07\b\t\0\x03\x01\x01\x01\x01\x01\x02\0\0\0\0\0\0\0\0\0\x01\x02\x03\x04\x05\x06\x07\b\t204\x00120\x000224468\x000244668\0\x07\x07\0\0?7/\'\x1f\x17\x0f\x07\0\x07\x07\0\0?7/\'\x1f\x17\x0f\x07\0\x03\x03\0\0?/\x1f\x0f\0\0\0\0\0%s: decoder table overflow\n\0DC2\0rb\0\x01\x02\x04\x05\x07\b\0\x01\x03\x04\x06\x07\x01\x02\x04\x05\x07\b\0\x03\x05\b\x04\x07\x03\x06\x01\x04\x02\x05\x04\x07\x04\x02\x06\x04\x04\x02\xff\xff\xff\0\xff\x01\0\x01\x01\x01\x01\0\x01\xff\0\xff11124811248484\0Nokia\0IIII\0MMMM\0Nikon\0OLYMPUS\0Panasonic\0FUJIFILM\0Ricoh\0Canon\0PENTAX\0%d:%d:%d %d:%d:%d\0EASTMAN\0DCB2\0Volare\0Cantare\0CMost\0Valeo 6\0Valeo 11\0Valeo 22\0Valeo 11p\0Valeo 17\0Aptus 17\0Aptus 22\0Aptus 75\0Aptus 65\0Aptus 54S\0Aptus 65S\0Aptus 75S\0AFi 5\0AFi 6\0AFi 7\0AFi-II 7\0Aptus-II 7\0Aptus-II 6\0Aptus-II 10\0Aptus-II 5\0Aptus-II 10R\0Aptus-II 8\0Aptus-II 12\0AFi-II 12\0JPEG_preview_data\0icc_camera_profile\0ShootObj_back_type\0%d\0icc_camera_to_tone_matrix\0CaptProf_color_matrix\0%f\0CaptProf_number_of_planes\0CaptProf_raw_data_rotation\0CaptProf_mosaic_pattern\0ImgProf_rotation_angle\0NeutObj_neutrals\0Rows_data\0\x94a\x16I\x0050132467\0Adobe\0dcraw\0UFRaw\0Bibble\0Nikon Scan\0Digital Photo Professional\0DSLR-A100\0\x03\x04\x05\0MATRIX\0Leaf\0Imacon\0Ixpress %d-Mp\0Neutral \0%f %f %f\0Hasselblad\0Phase\0Kodak\0DEBUG RAW\0DiMAGE A200\0.jpg\0.JPG\0Failed to read metadata from %s\n\0Pro1\x00012346000000000000\x0001345:000000006008\x00023457000000006000\x000134567028\0DAT\0TIM\0%d:%d:%d\0HDR\0X  \0Y  \0TX \0TY \0EOHD\0Rollei\0d530flex\0META\0THUMB\0RAW0\x000653\0 camera\0Phase One\0LightPhase\0H 10\0H 20\0H 25\0Jan\0Feb\0Mar\0Apr\0May\0Jun\0Jul\0Aug\0Sep\0Oct\0Nov\0Dec\0RIFF\0LIST\0nctg\0IDIT\0%*s %s %d %d:%d:%d %d\0moov\0udta\0CNTH\0CNDA\0SMaL\0v%d %dx%d\0CINE\0%s: Tail is missing, parsing from head...\n\0ISO\0CAMMANUF\0CAMMODEL\0WB_DESC\0TIME\0EXPTIME\0APERTURE\0FLENGTH\0AgfaPhoto DC-833m\0Apple QuickTake\0Canon EOS D2000\0Canon EOS D6000\0Canon EOS D30\0Canon EOS D60\0Canon EOS 5DS\0Canon EOS 5D Mark III\0Canon EOS 5D Mark II\0Canon EOS 5D\0Canon EOS 6D\0Canon EOS 7D Mark II\0Canon EOS 7D\0Canon EOS 10D\0Canon EOS 20Da\0Canon EOS 20D\0Canon EOS 30D\0Canon EOS 40D\0Canon EOS 50D\0Canon EOS 60D\0Canon EOS 70D\0Canon EOS 80D\0Canon EOS 100D\0Canon EOS 300D\0Canon EOS 350D\0Canon EOS 400D\0Canon EOS 450D\0Canon EOS 500D\0Canon EOS 550D\0Canon EOS 600D\0Canon EOS 650D\0Canon EOS 700D\0Canon EOS 750D\0Canon EOS 760D\0Canon EOS 1000D\0Canon EOS 1100D\0Canon EOS 1200D\0Canon EOS 1300D\0Canon EOS M3\0Canon EOS M10\0Canon EOS M\0Canon EOS-1Ds Mark III\0Canon EOS-1Ds Mark II\0Canon EOS-1D Mark IV\0Canon EOS-1D Mark III\0Canon EOS-1D Mark II N\0Canon EOS-1D Mark II\0Canon EOS-1DS\0Canon EOS-1D C\0Canon EOS-1D X Mark II\0Canon EOS-1D X\0Canon EOS-1D\0Canon EOS C500\0Canon PowerShot A530\0Canon PowerShot A50\0Canon PowerShot A5\0Canon PowerShot G10\0Canon PowerShot G11\0Canon PowerShot G12\0Canon PowerShot G15\0Canon PowerShot G16\0Canon PowerShot G1 X\0Canon PowerShot G1\0Canon PowerShot G2\0Canon PowerShot G3 X\0Canon PowerShot G3\0Canon PowerShot G5 X\0Canon PowerShot G5\0Canon PowerShot G6\0Canon PowerShot G7 X\0Canon PowerShot G9 X\0Canon PowerShot G9\0Canon PowerShot Pro1\0Canon PowerShot Pro70\0Canon PowerShot Pro90\0Canon PowerShot S30\0Canon PowerShot S40\0Canon PowerShot S45\0Canon PowerShot S50\0Canon PowerShot S60\0Canon PowerShot S70\0Canon PowerShot S90\0Canon PowerShot S95\0Canon PowerShot S100\0Canon PowerShot S110\0Canon PowerShot S120\0Canon PowerShot SX1 IS\0Canon PowerShot SX50 HS\0Canon PowerShot SX60 HS\0Canon PowerShot A3300\0Canon PowerShot A470\0Canon PowerShot A610\0Canon PowerShot A620\0Canon PowerShot A630\0Canon PowerShot A640\0Canon PowerShot A650\0Canon PowerShot A720\0Canon PowerShot S3 IS\0Canon PowerShot SX110 IS\0Canon PowerShot SX220\0Canon IXUS 160\0Casio EX-S20\0Casio EX-Z750\0Casio EX-Z10\0CINE 650\0CINE 660\0Contax N Digital\0DXO ONE\0Epson R-D1\0Fujifilm E550\0Fujifilm E900\0Fujifilm F5\0Fujifilm F6\0Fujifilm F77\0Fujifilm F7\0Fujifilm F8\0Fujifilm S100FS\0Fujifilm S1\0Fujifilm S20Pro\0Fujifilm S20\0Fujifilm S2Pro\0Fujifilm S3Pro\0Fujifilm S5Pro\0Fujifilm S5000\0Fujifilm S5100\0Fujifilm S5500\0Fujifilm S5200\0Fujifilm S5600\0Fujifilm S6\0Fujifilm S7000\0Fujifilm S9000\0Fujifilm S9500\0Fujifilm S9100\0Fujifilm S9600\0Fujifilm SL1000\0Fujifilm IS-1\0Fujifilm IS Pro\0Fujifilm HS10 HS11\0Fujifilm HS2\0Fujifilm HS3\0Fujifilm HS50EXR\0Fujifilm F900EXR\0Fujifilm X100S\0Fujifilm X100T\0Fujifilm X100\0Fujifilm X10\0Fujifilm X20\0Fujifilm X30\0Fujifilm X70\0Fujifilm X-Pro1\0Fujifilm X-Pro2\0Fujifilm X-A1\0Fujifilm X-A2\0Fujifilm X-E1\0Fujifilm X-E2S\0Fujifilm X-E2\0Fujifilm X-M1\0Fujifilm X-S1\0Fujifilm X-T1\0Fujifilm XF1\0Fujifilm XQ\0Imacon Ixpress\0Kodak NC2000\0Kodak DCS315C\0Kodak DCS330C\0Kodak DCS420\0Kodak DCS460\0Kodak EOSDCS1\0Kodak EOSDCS3B\0Kodak DCS520C\0Kodak DCS560C\0Kodak DCS620C\0Kodak DCS620X\0Kodak DCS660C\0Kodak DCS720X\0Kodak DCS760C\0Kodak DCS Pro SLR\0Kodak DCS Pro 14nx\0Kodak DCS Pro 14\0Kodak ProBack645\0Kodak ProBack\0Kodak P712\0Kodak P850\0Kodak P880\0Kodak EasyShare Z980\0Kodak EasyShare Z981\0Kodak EasyShare Z990\0Kodak EASYSHARE Z1015\0Leaf CMost\0Leaf Valeo 6\0Leaf Aptus 54S\0Leaf Aptus 65\0Leaf Aptus 75\0Mamiya ZD\0Micron 2010\0Minolta DiMAGE 5\0Minolta DiMAGE 7Hi\0Minolta DiMAGE 7\0Minolta DiMAGE A1\0Minolta DiMAGE A200\0Minolta DiMAGE A2\0Minolta DiMAGE Z2\0Minolta DYNAX 5\0Minolta DYNAX 7\0Motorola PIXL\0Nikon D100\0Nikon D1H\0Nikon D1X\0Nikon D1\0Nikon D200\0Nikon D2H\0Nikon D2X\0Nikon D3000\0Nikon D3100\0Nikon D3200\0Nikon D3300\0Nikon D300\0Nikon D3X\0Nikon D3S\0Nikon D3\0Nikon D40X\0Nikon D40\0Nikon D4S\0Nikon D4\0Nikon Df\0Nikon D5000\0Nikon D5100\0Nikon D5200\0Nikon D5300\0Nikon D5500\0Nikon D500\0Nikon D50\0Nikon D5\0Nikon D600\0Nikon D610\0Nikon D60\0Nikon D7000\0Nikon D7100\0Nikon D7200\0Nikon D750\0Nikon D700\0Nikon D70\0Nikon D810\0Nikon D800\0Nikon D80\0Nikon D90\0Nikon E700\0Nikon E800\0Nikon E950\0Nikon E995\0Nikon E2100\0Nikon E2500\0Nikon E3200\0Nikon E4300\0Nikon E4500\0Nikon E5000\0Nikon E5400\0Nikon E5700\0Nikon E8400\0Nikon E8700\0Nikon E8800\0Nikon COOLPIX A\0Nikon COOLPIX P330\0Nikon COOLPIX P340\0Nikon COOLPIX P6000\0Nikon COOLPIX P7000\0Nikon COOLPIX P7100\0Nikon COOLPIX P7700\0Nikon COOLPIX P7800\0Nikon 1 V3\0Nikon 1 J4\0Nikon 1 J5\0Nikon 1 S2\0Nikon 1 V2\0Nikon 1 J3\0Nikon 1 AW1\0Nikon 1 \0Olympus AIR A01\0Olympus C5050\0Olympus C5060\0Olympus C7070\0Olympus C70\0Olympus C80\0Olympus E-10\0Olympus E-1\0Olympus E-20\0Olympus E-300\0Olympus E-330\0Olympus E-30\0Olympus E-3\0Olympus E-400\0Olympus E-410\0Olympus E-420\0Olympus E-450\0Olympus E-500\0Olympus E-510\0Olympus E-520\0Olympus E-5\0Olympus E-600\0Olympus E-620\0Olympus E-P1\0Olympus E-P2\0Olympus E-P3\0Olympus E-P5\0Olympus E-PL1s\0Olympus E-PL1\0Olympus E-PL2\0Olympus E-PL3\0Olympus E-PL5\0Olympus E-PL6\0Olympus E-PL7\0Olympus E-PM1\0Olympus E-PM2\0Olympus E-M10\0Olympus E-M1\0Olympus E-M5MarkII\0Olympus E-M5\0Olympus PEN-F\0Olympus SH-2\0Olympus SP350\0Olympus SP3\0Olympus SP500UZ\0Olympus SP510UZ\0Olympus SP550UZ\0Olympus SP560UZ\0Olympus SP570UZ\0Olympus STYLUS1\0Olympus TG-4\0Olympus XZ-10\0Olympus XZ-1\0Olympus XZ-2\0Pentax *ist DL2\0Pentax *ist DL\0Pentax *ist DS2\0Pentax *ist DS\0Pentax *ist D\0Pentax K10D\0Pentax K1\0Pentax K20D\0Pentax K200D\0Pentax K2000\0Pentax K-m\0Pentax K-x\0Pentax K-r\0Pentax K-1\0Pentax K-30\0Pentax K-3 II\0Pentax K-3\0Pentax K-5 II\0Pentax K-5\0Pentax K-7\0Pentax K-S1\0Pentax K-S2\0Pentax Q-S1\0Pentax 645D\0Panasonic DMC-CM1\0Panasonic DMC-FZ8\0Panasonic DMC-FZ18\0Panasonic DMC-FZ28\0Panasonic DMC-FZ330\0Panasonic DMC-FZ300\0Panasonic DMC-FZ30\0Panasonic DMC-FZ3\0Panasonic DMC-FZ4\0Panasonic DMC-FZ50\0Panasonic DMC-FZ7\0Leica V-LUX1\0Panasonic DMC-L10\0Panasonic DMC-L1\0Leica DIGILUX 3\0Panasonic DMC-LC1\0Leica DIGILUX 2\0Panasonic DMC-LX100\0Leica D-LUX (Typ 109)\0Panasonic DMC-LF1\0Leica C (Typ 112)\0Panasonic DMC-LX1\0Leica D-LUX2\0Panasonic DMC-LX2\0Leica D-LUX3\0Panasonic DMC-LX3\0Leica D-LUX 4\0Panasonic DMC-LX5\0Leica D-LUX 5\0Panasonic DMC-LX7\0Leica D-LUX 6\0Panasonic DMC-FZ1000\0Leica V-LUX (Typ 114)\0Panasonic DMC-FZ100\0Leica V-LUX 2\0Panasonic DMC-FZ150\0Leica V-LUX 3\0Panasonic DMC-FZ200\0Leica V-LUX 4\0Panasonic DMC-FX150\0Panasonic DMC-G10\0Panasonic DMC-G1\0Panasonic DMC-G2\0Panasonic DMC-G3\0Panasonic DMC-G5\0Panasonic DMC-G6\0Panasonic DMC-G7\0Panasonic DMC-GF1\0Panasonic DMC-GF2\0Panasonic DMC-GF3\0Panasonic DMC-GF5\0Panasonic DMC-GF6\0Panasonic DMC-GF7\0Panasonic DMC-GF8\0Panasonic DMC-GH1\0Panasonic DMC-GH2\0Panasonic DMC-GH3\0Panasonic DMC-GH4\0Panasonic DMC-GM1\0Panasonic DMC-GM5\0Panasonic DMC-GX1\0Panasonic DMC-GX7\0Panasonic DMC-GX8\0Panasonic DMC-TZ1\0Panasonic DMC-ZS1\0Panasonic DMC-TZ6\0Panasonic DMC-ZS4\0Panasonic DMC-TZ7\0Panasonic DMC-ZS5\0Panasonic DMC-TZ8\0Panasonic DMC-ZS6\0Leica S (Typ 007)\0Leica X\0Leica Q (Typ 116)\0Leica M (Typ 262)\0Leica SL (Typ 601)\0Phase One H 20\0Phase One H 25\0Phase One P 2\0Phase One P 30\0Phase One P 45\0Phase One P40\0Phase One P65\0Photron BC2-HD\0Red One\0Ricoh GR II\0Ricoh GR\0Samsung EX1\0Samsung EX2F\0Samsung EK-GN120\0Samsung NX mini\0Samsung NX3300\0Samsung NX3000\0Samsung NX30\0Samsung NX2000\0Samsung NX2\0Samsung NX1000\0Samsung NX1100\0Samsung NX11\0Samsung NX10\0Samsung NX500\0Samsung NX5\0Samsung NX1\0Samsung WB2000\0Samsung GX-1\0Samsung GX20\0Samsung S85\0Sinar\0Sony DSC-F828\0Sony DSC-R1\0Sony DSC-V3\0Sony DSC-RX100M\0Sony DSC-RX100\0Sony DSC-RX10\0Sony DSC-RX1RM2\0Sony DSC-RX1\0Sony DSLR-A100\0Sony DSLR-A290\0Sony DSLR-A2\0Sony DSLR-A300\0Sony DSLR-A330\0Sony DSLR-A350\0Sony DSLR-A380\0Sony DSLR-A390\0Sony DSLR-A450\0Sony DSLR-A580\0Sony DSLR-A500\0Sony DSLR-A5\0Sony DSLR-A700\0Sony DSLR-A850\0Sony DSLR-A900\0Sony ILCA-68\0Sony ILCA-77M2\0Sony ILCE-6300\0Sony ILCE-7M2\0Sony ILCE-7S\0Sony ILCE-7RM2\0Sony ILCE-7R\0Sony ILCE-7\0Sony ILCE\0Sony NEX-5N\0Sony NEX-5R\0Sony NEX-5T\0Sony NEX-3N\0Sony NEX-3\0Sony NEX-5\0Sony NEX-6\0Sony NEX-7\0Sony NEX\0Sony SLT-A33\0Sony SLT-A35\0Sony SLT-A37\0Sony SLT-A55\0Sony SLT-A57\0Sony SLT-A58\0Sony SLT-A65\0Sony SLT-A77\0Sony SLT-A99\0%s %s\0AgfaPhoto\0Casio\0Epson\0Fujifilm\0Mamiya\0Minolta\0Motorola\0Konica\0Leica\0Olympus\0Pentax\0Samsung\0Sigma\0Sony\0HEAPCCDR\0\xff\xd8\xff\xe1\0Exif\0ARECOYK\0Contax\0N Digital\0PXN\0Logitech\0Fotoman Pixtura\0qktk\0Apple\0QuickTake 100\0qktn\0QuickTake 150\0ftypqt   \0\0\x01\0\x01\0@\0NOKIARAW\0NOKIA\0ARRI\0XPDS\0RED1\0DSC-Image\0PWAD\0\0MRM\0FOVb\0CI\0ov\0RP_OV\0BRCMn\0 DIGITAL CAMERA\0FILE VERSION\0FinePix \0Digital Camera \0K-r\0K-x\0K-5\0K-7\0K-3\x00645D\0KAI-0340\0C603\0PowerShot 600\0PowerShot A5\0PowerShot A5 Zoom\0PowerShot A50\0PowerShot Pro70\0PowerShot Pro90 IS\0PowerShot G1\0PowerShot A610\0S2 IS\0PowerShot SX220 HS\0EOS D2000C\0D1\0D1X\0D40X\0D60\0D80\0D3000\0D3\0D3S\0D700\0D3100\0D5000\0D90\0D5100\0D7000\0COOLPIX A\0D3200\0D6\0D800\0D4\0Df\0D40\0D50\0D70\0D100\0D200\0D2H\0D2X\0D300\0COOLPIX P\x001 \0E995\0E2500\0Optio 33WR\0DiMAGE Z2\0S2Pro\0HS50EXR\0F900EXR\0KD-400Z\0KD-510Z\0DiMAGE A\0ALPHA\0DYNAX\0MAXXUM\0DYNAX %-10s\0DiMAGE G\0*ist D\0*ist DS\0EX1\0WB2000\0WB550\0EX2F\0STV680 VGA\0N95\x00640x480\0V96C\0RBTG\0CatchLight\0\x94aI\x16\0C770UZ\0E-300\0E-500\0E-330\0SP550UZ\0TG-4\0DSC-F828\0RGBE\0DSC-V3\0DSLR-A350\0DSC\0RX1\0A99\0PIXL\0C330\x0012MP\0EasyShare\0NC2000\0EOSDCS\0DCS4\0DCS460A\0DCS660M\0DCS760M\x0020X\0MYCY\0DC25\x0040\0DC40\0DC50\0DC120\0DCS200\0QuickTake\0%dx%d\0Quicktake\0%s: You must link dcraw with %s!!\n\0libjasper\0libjpeg\0RGBG\0GMCY\0dcraw v9.27\0%04d:%02d:%02d %02d:%02d:%02d\x0012435867\0\xff\xe1  Exif\0\0\0P7\nWIDTH %d\nHEIGHT %d\nDEPTH %d\nMAXVAL %d\nTUPLTYPE %s\nENDHDR\n\0P%d\n%d %d\n%d\n\0nbrkStqmHACg\x00114111111422\0Non-numeric argument to "-%c"\n\0all\0Unknown option "-%c".\n\0No files to process.\n\0%s has no thumbnail.\n\0\nFilename: %s\n\0Timestamp: %s\0Camera: %s %s\n\0Owner: %s\n\0DNG Version: \0%d%c\0ISO speed: %d\n\0Shutter: \x001/\0%0.1f sec\n\0Aperture: f/%0.1f\n\0Focal length: %0.1f mm\n\0Embedded ICC profile: %s\n\0yes\0no\0Number of raw images: %d\n\0Pixel Aspect Ratio: %0.6f\n\0Thumb size:  %4d x %d\n\0Full size:   %4d x %d\n\0Cannot decode file %s\n\0%s is a %s %s image.\n\0%s: "-s %d" requests a nonexistent image!\n\0.pgm\0.ppm\0.ppm\0.pam\0_%0*d\0.thumb\0wb\0\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\0\x01\x02\x03\x04\x05\x06\x07\b\t\xff\xff\xff\xff\xff\xff\xff\n\v\f\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !"#\xff\xff\xff\xff\xff\xff\n\v\f\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !"#\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\0\x01\x02\x04\x07\x03\x06\x05\0\x11\0\n\0\x11\x11\x11\0\0\0\0\x05\0\0\0\0\0\0\t\0\0\0\0\v\0\0\0\0\0\0\0\0\x11\0\x0f\n\x11\x11\x11\x03\n\x07\0\x01\x13\t\v\v\0\0\t\x06\v\0\0\v\0\x06\x11\0\0\0\x11\x11\x11\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\v\0\0\0\0\0\0\0\0\x11\0\n\n\x11\x11\x11\0\n\0\0\x02\0\t\v\0\0\0\t\0\v\0\0\v\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\f\0\0\0\0\0\0\0\0\0\0\0\f\0\0\0\0\f\0\0\0\0\t\f\0\0\0\0\0\f\0\0\f\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x0e\0\0\0\0\0\0\0\0\0\0\0\r\0\0\0\x04\r\0\0\0\0\t\x0e\0\0\0\0\0\x0e\0\0\x0e\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x10\0\0\0\0\0\0\0\0\0\0\0\x0f\0\0\0\0\x0f\0\0\0\0\t\x10\0\0\0\0\0\x10\0\0\x10\0\0\x12\0\0\0\x12\x12\x12\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\x12\0\0\0\x12\x12\x12\0\0\0\0\0\0\t\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\v\0\0\0\0\0\0\0\0\0\0\0\n\0\0\0\0\n\0\0\0\0\t\v\0\0\0\0\0\v\0\0\v\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\f\0\0\0\0\0\0\0\0\0\0\0\f\0\0\0\0\f\0\0\0\0\t\f\0\0\0\0\0\f\0\0\f\0\0-+   0X0x\0-0X+0X 0X-0x+0x 0x\0inf\0INF\0NAN\x000123456789ABCDEFT!"\x19\r\x01\x02\x03\x11K\x1c\f\x10\x04\v\x1d\x12\x1e\'hnopqb \x05\x06\x0f\x13\x14\x15\x1a\b\x16\x07($\x17\x18\t\n\x0e\x1b\x1f%#\x83\x82}&*+<=>?CGJMXYZ[\\]^_`acdefgijklrstyz{|\0Illegal byte sequence\0Domain error\0Result not representable\0Not a tty\0Permission denied\0Operation not permitted\0No such file or directory\0No such process\0File exists\0Value too large for data type\0No space left on device\0Out of memory\0Resource busy\0Interrupted system call\0Resource temporarily unavailable\0Invalid seek\0Cross-device link\0Read-only file system\0Directory not empty\0Connection reset by peer\0Operation timed out\0Connection refused\0Host is down\0Host is unreachable\0Address in use\0Broken pipe\0I/O error\0No such device or address\0Block device required\0No such device\0Not a directory\0Is a directory\0Text file busy\0Exec format error\0Invalid argument\0Argument list too long\0Symbolic link loop\0Filename too long\0Too many open files in system\0No file descriptors available\0Bad file descriptor\0No child process\0Bad address\0File too large\0Too many links\0No locks available\0Resource deadlock would occur\0State not recoverable\0Previous owner died\0Operation canceled\0Function not implemented\0No message of desired type\0Identifier removed\0Device not a stream\0No data available\0Device timeout\0Out of streams resources\0Link has been severed\0Protocol error\0Bad message\0File descriptor in bad state\0Not a socket\0Destination address required\0Message too large\0Protocol wrong type for socket\0Protocol not available\0Protocol not supported\0Socket type not supported\0Not supported\0Protocol family not supported\0Address family not supported by protocol\0Address not available\0Network is down\0Network unreachable\0Connection reset by network\0Connection aborted\0No buffer space available\0Socket is connected\0Socket not connected\0Cannot send after socket shutdown\0Operation already in progress\0Operation in progress\0Stale file handle\0Remote I/O error\0Quota exceeded\0No medium found\0Wrong medium type\0No error information\0\0infinity\0nan\0rwa\0(null)\0/tmp/tmpfile_XXXXXX\0w+\0.'), 
 Module.callMain = function(args) {
  function pad() {
   for (var i = 0; i < 3; i++) argv.push(0);
  }
  args = args || [], ensureInitRuntime();
  var argc = args.length + 1, argv = [ allocate(intArrayFromString(Module.thisProgram), "i8", ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc - 1; i += 1) argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL)), pad();
  argv.push(0), argv = allocate(argv, "i32", ALLOC_NORMAL);
  try {
   Module._main(argc, argv, 0);
  } catch (e) {
   var toLog = e;
   e && "object" == typeof e && e.stack && (toLog = [ e, e.stack ]), Module.printErr("exception thrown: " + toLog), Module.quit(1, e);
  }
 }, run(), exports.ver = 1.477, exports.run = run, exports.FS = FS, Object.freeze(exports);
}("undefined" == typeof dcraw ? dcraw = {} : dcraw);