/** @file automatically generated, do not edit it. */
/* eslint-disable max-len, indent, dot-notation, no-extra-parens */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

// UNUSED EXPORTS: CallRecorderCore

;// ./extern/mp4-muxer/build/mp4-muxer.bundle.js
// src/misc.ts
var bytes = new Uint8Array(8);
var view = new DataView(bytes.buffer);
var u8 = (value) => {
  return [(value % 256 + 256) % 256];
};
var u16 = (value) => {
  view.setUint16(0, value, false);
  return [bytes[0], bytes[1]];
};
var i16 = (value) => {
  view.setInt16(0, value, false);
  return [bytes[0], bytes[1]];
};
var u24 = (value) => {
  view.setUint32(0, value, false);
  return [bytes[1], bytes[2], bytes[3]];
};
var u32 = (value) => {
  view.setUint32(0, value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var i32 = (value) => {
  view.setInt32(0, value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var u64 = (value) => {
  view.setUint32(0, Math.floor(value / 2 ** 32), false);
  view.setUint32(4, value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7]];
};
var fixed_8_8 = (value) => {
  view.setInt16(0, 2 ** 8 * value, false);
  return [bytes[0], bytes[1]];
};
var fixed_16_16 = (value) => {
  view.setInt32(0, 2 ** 16 * value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var fixed_2_30 = (value) => {
  view.setInt32(0, 2 ** 30 * value, false);
  return [bytes[0], bytes[1], bytes[2], bytes[3]];
};
var ascii = (text, nullTerminated = false) => {
  let bytes2 = Array(text.length).fill(null).map((_, i) => text.charCodeAt(i));
  if (nullTerminated)
    bytes2.push(0);
  return bytes2;
};
var last = (arr) => {
  return arr && arr[arr.length - 1];
};
var lastPresentedSample = (samples) => {
  let result = void 0;
  for (let sample of samples) {
    if (!result || sample.presentationTimestamp > result.presentationTimestamp) {
      result = sample;
    }
  }
  return result;
};
var intoTimescale = (timeInSeconds, timescale, round = true) => {
  let value = timeInSeconds * timescale;
  return round ? Math.round(value) : value;
};
var rotationMatrix = (rotationInDegrees) => {
  let theta = rotationInDegrees * (Math.PI / 180);
  let cosTheta = Math.cos(theta);
  let sinTheta = Math.sin(theta);
  return [
    cosTheta,
    sinTheta,
    0,
    -sinTheta,
    cosTheta,
    0,
    0,
    0,
    1
  ];
};
var IDENTITY_MATRIX = rotationMatrix(0);
var matrixToBytes = (matrix) => {
  return [
    fixed_16_16(matrix[0]),
    fixed_16_16(matrix[1]),
    fixed_2_30(matrix[2]),
    fixed_16_16(matrix[3]),
    fixed_16_16(matrix[4]),
    fixed_2_30(matrix[5]),
    fixed_16_16(matrix[6]),
    fixed_16_16(matrix[7]),
    fixed_2_30(matrix[8])
  ];
};
var deepClone = (x) => {
  if (!x)
    return x;
  if (typeof x !== "object")
    return x;
  if (Array.isArray(x))
    return x.map(deepClone);
  return Object.fromEntries(Object.entries(x).map(([key, value]) => [key, deepClone(value)]));
};
var isU32 = (value) => {
  return value >= 0 && value < 2 ** 32;
};

// src/box.ts
var box = (type, contents, children) => ({
  type,
  contents: contents && new Uint8Array(contents.flat(10)),
  children
});
var fullBox = (type, version, flags, contents, children) => box(
  type,
  [u8(version), u24(flags), contents != null ? contents : []],
  children
);
var ftyp = (details) => {
  let minorVersion = 512;
  if (details.fragmented)
    return box("ftyp", [
      ascii("iso5"),
      // Major brand
      u32(minorVersion),
      // Minor version
      // Compatible brands
      ascii("iso5"),
      ascii("iso6"),
      ascii("mp41")
    ]);
  return box("ftyp", [
    ascii("isom"),
    // Major brand
    u32(minorVersion),
    // Minor version
    // Compatible brands
    ascii("isom"),
    details.holdsAvc ? ascii("avc1") : [],
    ascii("mp41")
  ]);
};
var mdat = (reserveLargeSize) => ({ type: "mdat", largeSize: reserveLargeSize });
var free = (size) => ({ type: "free", size });
var moov = (tracks, creationTime, fragmented = false) => box("moov", null, [
  mvhd(creationTime, tracks),
  ...tracks.map((x) => trak(x, creationTime)),
  fragmented ? mvex(tracks) : null
]);
var mvhd = (creationTime, tracks) => {
  let duration = intoTimescale(Math.max(
    0,
    ...tracks.filter((x) => x.samples.length > 0).map((x) => {
      const lastSample = lastPresentedSample(x.samples);
      return lastSample.presentationTimestamp + lastSample.duration;
    })
  ), GLOBAL_TIMESCALE);
  let nextTrackId = Math.max(...tracks.map((x) => x.id)) + 1;
  let needsU64 = !isU32(creationTime) || !isU32(duration);
  let u32OrU64 = needsU64 ? u64 : u32;
  return fullBox("mvhd", +needsU64, 0, [
    u32OrU64(creationTime),
    // Creation time
    u32OrU64(creationTime),
    // Modification time
    u32(GLOBAL_TIMESCALE),
    // Timescale
    u32OrU64(duration),
    // Duration
    fixed_16_16(1),
    // Preferred rate
    fixed_8_8(1),
    // Preferred volume
    Array(10).fill(0),
    // Reserved
    matrixToBytes(IDENTITY_MATRIX),
    // Matrix
    Array(24).fill(0),
    // Pre-defined
    u32(nextTrackId)
    // Next track ID
  ]);
};
var trak = (track, creationTime) => box("trak", null, [
  tkhd(track, creationTime),
  mdia(track, creationTime)
]);
var tkhd = (track, creationTime) => {
  let lastSample = lastPresentedSample(track.samples);
  let durationInGlobalTimescale = intoTimescale(
    lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
    GLOBAL_TIMESCALE
  );
  let needsU64 = !isU32(creationTime) || !isU32(durationInGlobalTimescale);
  let u32OrU64 = needsU64 ? u64 : u32;
  let matrix;
  if (track.info.type === "video") {
    matrix = typeof track.info.rotation === "number" ? rotationMatrix(track.info.rotation) : track.info.rotation;
  } else {
    matrix = IDENTITY_MATRIX;
  }
  return fullBox("tkhd", +needsU64, 3, [
    u32OrU64(creationTime),
    // Creation time
    u32OrU64(creationTime),
    // Modification time
    u32(track.id),
    // Track ID
    u32(0),
    // Reserved
    u32OrU64(durationInGlobalTimescale),
    // Duration
    Array(8).fill(0),
    // Reserved
    u16(0),
    // Layer
    u16(0),
    // Alternate group
    fixed_8_8(track.info.type === "audio" ? 1 : 0),
    // Volume
    u16(0),
    // Reserved
    matrixToBytes(matrix),
    // Matrix
    fixed_16_16(track.info.type === "video" ? track.info.width : 0),
    // Track width
    fixed_16_16(track.info.type === "video" ? track.info.height : 0)
    // Track height
  ]);
};
var mdia = (track, creationTime) => box("mdia", null, [
  mdhd(track, creationTime),
  hdlr(track.info.type === "video" ? "vide" : "soun"),
  minf(track)
]);
var mdhd = (track, creationTime) => {
  let lastSample = lastPresentedSample(track.samples);
  let localDuration = intoTimescale(
    lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
    track.timescale
  );
  let needsU64 = !isU32(creationTime) || !isU32(localDuration);
  let u32OrU64 = needsU64 ? u64 : u32;
  return fullBox("mdhd", +needsU64, 0, [
    u32OrU64(creationTime),
    // Creation time
    u32OrU64(creationTime),
    // Modification time
    u32(track.timescale),
    // Timescale
    u32OrU64(localDuration),
    // Duration
    u16(21956),
    // Language ("und", undetermined)
    u16(0)
    // Quality
  ]);
};
var hdlr = (componentSubtype) => fullBox("hdlr", 0, 0, [
  ascii("mhlr"),
  // Component type
  ascii(componentSubtype),
  // Component subtype
  u32(0),
  // Component manufacturer
  u32(0),
  // Component flags
  u32(0),
  // Component flags mask
  ascii("mp4-muxer-hdlr", true)
  // Component name
]);
var minf = (track) => box("minf", null, [
  track.info.type === "video" ? vmhd() : smhd(),
  dinf(),
  stbl(track)
]);
var vmhd = () => fullBox("vmhd", 0, 1, [
  u16(0),
  // Graphics mode
  u16(0),
  // Opcolor R
  u16(0),
  // Opcolor G
  u16(0)
  // Opcolor B
]);
var smhd = () => fullBox("smhd", 0, 0, [
  u16(0),
  // Balance
  u16(0)
  // Reserved
]);
var dinf = () => box("dinf", null, [
  dref()
]);
var dref = () => fullBox("dref", 0, 0, [
  u32(1)
  // Entry count
], [
  url()
]);
var url = () => fullBox("url ", 0, 1);
var stbl = (track) => {
  const needsCtts = track.compositionTimeOffsetTable.length > 1 || track.compositionTimeOffsetTable.some((x) => x.sampleCompositionTimeOffset !== 0);
  return box("stbl", null, [
    stsd(track),
    stts(track),
    stss(track),
    stsc(track),
    stsz(track),
    stco(track),
    needsCtts ? ctts(track) : null
  ]);
};
var stsd = (track) => fullBox("stsd", 0, 0, [
  u32(1)
  // Entry count
], [
  track.info.type === "video" ? videoSampleDescription(
    VIDEO_CODEC_TO_BOX_NAME[track.info.codec],
    track
  ) : soundSampleDescription(
    AUDIO_CODEC_TO_BOX_NAME[track.info.codec],
    track
  )
]);
var videoSampleDescription = (compressionType, track) => box(compressionType, [
  Array(6).fill(0),
  // Reserved
  u16(1),
  // Data reference index
  u16(0),
  // Pre-defined
  u16(0),
  // Reserved
  Array(12).fill(0),
  // Pre-defined
  u16(track.info.width),
  // Width
  u16(track.info.height),
  // Height
  u32(4718592),
  // Horizontal resolution
  u32(4718592),
  // Vertical resolution
  u32(0),
  // Reserved
  u16(1),
  // Frame count
  Array(32).fill(0),
  // Compressor name
  u16(24),
  // Depth
  i16(65535)
  // Pre-defined
], [
  VIDEO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track)
]);
var avcC = (track) => track.info.decoderConfig && box("avcC", [
  // For AVC, description is an AVCDecoderConfigurationRecord, so nothing else to do here
  ...new Uint8Array(track.info.decoderConfig.description)
]);
var hvcC = (track) => track.info.decoderConfig && box("hvcC", [
  // For HEVC, description is a HEVCDecoderConfigurationRecord, so nothing else to do here
  ...new Uint8Array(track.info.decoderConfig.description)
]);
var vpcC = (track) => {
  if (!track.info.decoderConfig) {
    return null;
  }
  let decoderConfig = track.info.decoderConfig;
  if (!decoderConfig.colorSpace) {
    throw new Error(`'colorSpace' is required in the decoder config for VP9.`);
  }
  let parts = decoderConfig.codec.split(".");
  let profile = Number(parts[1]);
  let level = Number(parts[2]);
  let bitDepth = Number(parts[3]);
  let chromaSubsampling = 0;
  let thirdByte = (bitDepth << 4) + (chromaSubsampling << 1) + Number(decoderConfig.colorSpace.fullRange);
  let colourPrimaries = 2;
  let transferCharacteristics = 2;
  let matrixCoefficients = 2;
  return fullBox("vpcC", 1, 0, [
    u8(profile),
    // Profile
    u8(level),
    // Level
    u8(thirdByte),
    // Bit depth, chroma subsampling, full range
    u8(colourPrimaries),
    // Colour primaries
    u8(transferCharacteristics),
    // Transfer characteristics
    u8(matrixCoefficients),
    // Matrix coefficients
    u16(0)
    // Codec initialization data size
  ]);
};
var av1C = () => {
  let marker = 1;
  let version = 1;
  let firstByte = (marker << 7) + version;
  return box("av1C", [
    firstByte,
    0,
    0,
    0
  ]);
};
var soundSampleDescription = (compressionType, track) => box(compressionType, [
  Array(6).fill(0),
  // Reserved
  u16(1),
  // Data reference index
  u16(0),
  // Version
  u16(0),
  // Revision level
  u32(0),
  // Vendor
  u16(track.info.numberOfChannels),
  // Number of channels
  u16(16),
  // Sample size (bits)
  u16(0),
  // Compression ID
  u16(0),
  // Packet size
  fixed_16_16(track.info.sampleRate)
  // Sample rate
], [
  AUDIO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track)
]);
var esds = (track) => {
  let description = new Uint8Array(track.info.decoderConfig.description);
  return fullBox("esds", 0, 0, [
    // https://stackoverflow.com/a/54803118
    u32(58753152),
    // TAG(3) = Object Descriptor ([2])
    u8(32 + description.byteLength),
    // length of this OD (which includes the next 2 tags)
    u16(1),
    // ES_ID = 1
    u8(0),
    // flags etc = 0
    u32(75530368),
    // TAG(4) = ES Descriptor ([2]) embedded in above OD
    u8(18 + description.byteLength),
    // length of this ESD
    u8(64),
    // MPEG-4 Audio
    u8(21),
    // stream type(6bits)=5 audio, flags(2bits)=1
    u24(0),
    // 24bit buffer size
    u32(130071),
    // max bitrate
    u32(130071),
    // avg bitrate
    u32(92307584),
    // TAG(5) = ASC ([2],[3]) embedded in above OD
    u8(description.byteLength),
    // length
    ...description,
    u32(109084800),
    // TAG(6)
    u8(1),
    // length
    u8(2)
    // data
  ]);
};
var dOps = (track) => {
  var _a;
  let preskip = 3840;
  let gain = 0;
  const description = (_a = track.info.decoderConfig) == null ? void 0 : _a.description;
  if (description) {
    if (description.byteLength < 18) {
      throw new TypeError("Invalid decoder description provided for Opus; must be at least 18 bytes long.");
    }
    const view2 = ArrayBuffer.isView(description) ? new DataView(description.buffer, description.byteOffset, description.byteLength) : new DataView(description);
    preskip = view2.getUint16(10, true);
    gain = view2.getInt16(14, true);
  }
  return box("dOps", [
    u8(0),
    // Version
    u8(track.info.numberOfChannels),
    // OutputChannelCount
    u16(preskip),
    u32(track.info.sampleRate),
    // InputSampleRate
    fixed_8_8(gain),
    // OutputGain
    u8(0)
    // ChannelMappingFamily
  ]);
};
var stts = (track) => {
  return fullBox("stts", 0, 0, [
    u32(track.timeToSampleTable.length),
    // Number of entries
    track.timeToSampleTable.map((x) => [
      // Time-to-sample table
      u32(x.sampleCount),
      // Sample count
      u32(x.sampleDelta)
      // Sample duration
    ])
  ]);
};
var stss = (track) => {
  if (track.samples.every((x) => x.type === "key"))
    return null;
  let keySamples = [...track.samples.entries()].filter(([, sample]) => sample.type === "key");
  return fullBox("stss", 0, 0, [
    u32(keySamples.length),
    // Number of entries
    keySamples.map(([index]) => u32(index + 1))
    // Sync sample table
  ]);
};
var stsc = (track) => {
  return fullBox("stsc", 0, 0, [
    u32(track.compactlyCodedChunkTable.length),
    // Number of entries
    track.compactlyCodedChunkTable.map((x) => [
      // Sample-to-chunk table
      u32(x.firstChunk),
      // First chunk
      u32(x.samplesPerChunk),
      // Samples per chunk
      u32(1)
      // Sample description index
    ])
  ]);
};
var stsz = (track) => fullBox("stsz", 0, 0, [
  u32(0),
  // Sample size (0 means non-constant size)
  u32(track.samples.length),
  // Number of entries
  track.samples.map((x) => u32(x.size))
  // Sample size table
]);
var stco = (track) => {
  if (track.finalizedChunks.length > 0 && last(track.finalizedChunks).offset >= 2 ** 32) {
    return fullBox("co64", 0, 0, [
      u32(track.finalizedChunks.length),
      // Number of entries
      track.finalizedChunks.map((x) => u64(x.offset))
      // Chunk offset table
    ]);
  }
  return fullBox("stco", 0, 0, [
    u32(track.finalizedChunks.length),
    // Number of entries
    track.finalizedChunks.map((x) => u32(x.offset))
    // Chunk offset table
  ]);
};
var ctts = (track) => {
  return fullBox("ctts", 0, 0, [
    u32(track.compositionTimeOffsetTable.length),
    // Number of entries
    track.compositionTimeOffsetTable.map((x) => [
      // Time-to-sample table
      u32(x.sampleCount),
      // Sample count
      u32(x.sampleCompositionTimeOffset)
      // Sample offset
    ])
  ]);
};
var mvex = (tracks) => {
  return box("mvex", null, tracks.map(trex));
};
var trex = (track) => {
  return fullBox("trex", 0, 0, [
    u32(track.id),
    // Track ID
    u32(1),
    // Default sample description index
    u32(0),
    // Default sample duration
    u32(0),
    // Default sample size
    u32(0)
    // Default sample flags
  ]);
};
var moof = (sequenceNumber, tracks) => {
  return box("moof", null, [
    mfhd(sequenceNumber),
    ...tracks.map(traf)
  ]);
};
var mfhd = (sequenceNumber) => {
  return fullBox("mfhd", 0, 0, [
    u32(sequenceNumber)
    // Sequence number
  ]);
};
var fragmentSampleFlags = (sample) => {
  let byte1 = 0;
  let byte2 = 0;
  let byte3 = 0;
  let byte4 = 0;
  let sampleIsDifferenceSample = sample.type === "delta";
  byte2 |= +sampleIsDifferenceSample;
  if (sampleIsDifferenceSample) {
    byte1 |= 1;
  } else {
    byte1 |= 2;
  }
  return byte1 << 24 | byte2 << 16 | byte3 << 8 | byte4;
};
var traf = (track) => {
  return box("traf", null, [
    tfhd(track),
    tfdt(track),
    trun(track)
  ]);
};
var tfhd = (track) => {
  var _a;
  let tfFlags = 0;
  tfFlags |= 8;
  tfFlags |= 16;
  tfFlags |= 32;
  tfFlags |= 131072;
  let referenceSample = (_a = track.currentChunk.samples[1]) != null ? _a : track.currentChunk.samples[0];
  let referenceSampleInfo = {
    duration: referenceSample.timescaleUnitsToNextSample,
    size: referenceSample.size,
    flags: fragmentSampleFlags(referenceSample)
  };
  return fullBox("tfhd", 0, tfFlags, [
    u32(track.id),
    // Track ID
    u32(referenceSampleInfo.duration),
    // Default sample duration
    u32(referenceSampleInfo.size),
    // Default sample size
    u32(referenceSampleInfo.flags)
    // Default sample flags
  ]);
};
var tfdt = (track) => {
  return fullBox("tfdt", 1, 0, [
    u64(intoTimescale(track.currentChunk.startTimestamp, track.timescale))
    // Base Media Decode Time
  ]);
};
var trun = (track) => {
  let allSampleDurations = track.currentChunk.samples.map((x) => x.timescaleUnitsToNextSample);
  let allSampleSizes = track.currentChunk.samples.map((x) => x.size);
  let allSampleFlags = track.currentChunk.samples.map(fragmentSampleFlags);
  let allSampleCompositionTimeOffsets = track.currentChunk.samples.map((x) => intoTimescale(x.presentationTimestamp - x.decodeTimestamp, track.timescale));
  let uniqueSampleDurations = new Set(allSampleDurations);
  let uniqueSampleSizes = new Set(allSampleSizes);
  let uniqueSampleFlags = new Set(allSampleFlags);
  let uniqueSampleCompositionTimeOffsets = new Set(allSampleCompositionTimeOffsets);
  let firstSampleFlagsPresent = uniqueSampleFlags.size === 2 && allSampleFlags[0] !== allSampleFlags[1];
  let sampleDurationPresent = uniqueSampleDurations.size > 1;
  let sampleSizePresent = uniqueSampleSizes.size > 1;
  let sampleFlagsPresent = !firstSampleFlagsPresent && uniqueSampleFlags.size > 1;
  let sampleCompositionTimeOffsetsPresent = uniqueSampleCompositionTimeOffsets.size > 1 || [...uniqueSampleCompositionTimeOffsets].some((x) => x !== 0);
  let flags = 0;
  flags |= 1;
  flags |= 4 * +firstSampleFlagsPresent;
  flags |= 256 * +sampleDurationPresent;
  flags |= 512 * +sampleSizePresent;
  flags |= 1024 * +sampleFlagsPresent;
  flags |= 2048 * +sampleCompositionTimeOffsetsPresent;
  return fullBox("trun", 1, flags, [
    u32(track.currentChunk.samples.length),
    // Sample count
    u32(track.currentChunk.offset - track.currentChunk.moofOffset || 0),
    // Data offset
    firstSampleFlagsPresent ? u32(allSampleFlags[0]) : [],
    track.currentChunk.samples.map((_, i) => [
      sampleDurationPresent ? u32(allSampleDurations[i]) : [],
      // Sample duration
      sampleSizePresent ? u32(allSampleSizes[i]) : [],
      // Sample size
      sampleFlagsPresent ? u32(allSampleFlags[i]) : [],
      // Sample flags
      // Sample composition time offsets
      sampleCompositionTimeOffsetsPresent ? i32(allSampleCompositionTimeOffsets[i]) : []
    ])
  ]);
};
var mfra = (tracks) => {
  return box("mfra", null, [
    ...tracks.map(tfra),
    mfro()
  ]);
};
var tfra = (track, trackIndex) => {
  let version = 1;
  return fullBox("tfra", version, 0, [
    u32(track.id),
    // Track ID
    u32(63),
    // This specifies that traf number, trun number and sample number are 32-bit ints
    u32(track.finalizedChunks.length),
    // Number of entries
    track.finalizedChunks.map((chunk) => [
      u64(intoTimescale(chunk.startTimestamp, track.timescale)),
      // Time
      u64(chunk.moofOffset),
      // moof offset
      u32(trackIndex + 1),
      // traf number
      u32(1),
      // trun number
      u32(1)
      // Sample number
    ])
  ]);
};
var mfro = () => {
  return fullBox("mfro", 0, 0, [
    // This value needs to be overwritten manually from the outside, where the actual size of the enclosing mfra box
    // is known
    u32(0)
    // Size
  ]);
};
var VIDEO_CODEC_TO_BOX_NAME = {
  "avc": "avc1",
  "hevc": "hvc1",
  "vp9": "vp09",
  "av1": "av01"
};
var VIDEO_CODEC_TO_CONFIGURATION_BOX = {
  "avc": avcC,
  "hevc": hvcC,
  "vp9": vpcC,
  "av1": av1C
};
var AUDIO_CODEC_TO_BOX_NAME = {
  "aac": "mp4a",
  "opus": "Opus"
};
var AUDIO_CODEC_TO_CONFIGURATION_BOX = {
  "aac": esds,
  "opus": dOps
};

// src/target.ts
var isTarget = Symbol("isTarget");
var Target = class {
};
isTarget;
var ArrayBufferTarget = class extends Target {
  constructor() {
    super(...arguments);
    this.buffer = null;
  }
};
var StreamTarget = class extends Target {
  constructor(options) {
    super();
    this.options = options;
    if (typeof options !== "object") {
      throw new TypeError("StreamTarget requires an options object to be passed to its constructor.");
    }
    if (options.onData) {
      if (typeof options.onData !== "function") {
        throw new TypeError("options.onData, when provided, must be a function.");
      }
      if (options.onData.length < 2) {
        throw new TypeError(
          "options.onData, when provided, must be a function that takes in at least two arguments (data and position). Ignoring the position argument, which specifies the byte offset at which the data is to be written, can lead to broken outputs."
        );
      }
    }
    if (options.chunked !== void 0 && typeof options.chunked !== "boolean") {
      throw new TypeError("options.chunked, when provided, must be a boolean.");
    }
    if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0)) {
      throw new TypeError("options.chunkSize, when provided, must be a positive integer.");
    }
  }
};
var FileSystemWritableFileStreamTarget = class extends Target {
  constructor(stream, options) {
    super();
    this.stream = stream;
    this.options = options;
    if (!(stream instanceof FileSystemWritableFileStream)) {
      throw new TypeError("FileSystemWritableFileStreamTarget requires a FileSystemWritableFileStream instance.");
    }
    if (options !== void 0 && typeof options !== "object") {
      throw new TypeError("FileSystemWritableFileStreamTarget's options, when provided, must be an object.");
    }
    if (options) {
      if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0)) {
        throw new TypeError("options.chunkSize, when provided, must be a positive integer");
      }
    }
  }
};

// src/writer.ts
var Writer = class {
  constructor() {
    this.pos = 0;
    this._helper = new Uint8Array(8);
    this._helperView = new DataView(this._helper.buffer);
    /**
     * Stores the position from the start of the file to where boxes elements have been written. This is used to
     * rewrite/edit elements that were already added before, and to measure sizes of things.
     */
    this.offsets = /* @__PURE__ */ new WeakMap();
  }
  /** Sets the current position for future writes to a new one. */
  seek(newPos) {
    this.pos = newPos;
  }
  writeU32(value) {
    this._helperView.setUint32(0, value, false);
    this.write(this._helper.subarray(0, 4));
  }
  writeU64(value) {
    this._helperView.setUint32(0, Math.floor(value / 2 ** 32), false);
    this._helperView.setUint32(4, value, false);
    this.write(this._helper.subarray(0, 8));
  }
  writeAscii(text) {
    for (let i = 0; i < text.length; i++) {
      this._helperView.setUint8(i % 8, text.charCodeAt(i));
      if (i % 8 === 7)
        this.write(this._helper);
    }
    if (text.length % 8 !== 0) {
      this.write(this._helper.subarray(0, text.length % 8));
    }
  }
  writeBox(box2) {
    var _a, _b;
    this.offsets.set(box2, this.pos);
    if (box2.contents && !box2.children) {
      this.writeBoxHeader(box2, (_a = box2.size) != null ? _a : box2.contents.byteLength + 8);
      this.write(box2.contents);
    } else {
      let startPos = this.pos;
      this.writeBoxHeader(box2, 0);
      if (box2.contents)
        this.write(box2.contents);
      if (box2.children) {
        for (let child of box2.children)
          if (child)
            this.writeBox(child);
      }
      let endPos = this.pos;
      let size = (_b = box2.size) != null ? _b : endPos - startPos;
      this.seek(startPos);
      this.writeBoxHeader(box2, size);
      this.seek(endPos);
    }
  }
  writeBoxHeader(box2, size) {
    this.writeU32(box2.largeSize ? 1 : size);
    this.writeAscii(box2.type);
    if (box2.largeSize)
      this.writeU64(size);
  }
  measureBoxHeader(box2) {
    return 8 + (box2.largeSize ? 8 : 0);
  }
  patchBox(box2) {
    let endPos = this.pos;
    this.seek(this.offsets.get(box2));
    this.writeBox(box2);
    this.seek(endPos);
  }
  measureBox(box2) {
    if (box2.contents && !box2.children) {
      let headerSize = this.measureBoxHeader(box2);
      return headerSize + box2.contents.byteLength;
    } else {
      let result = this.measureBoxHeader(box2);
      if (box2.contents)
        result += box2.contents.byteLength;
      if (box2.children) {
        for (let child of box2.children)
          if (child)
            result += this.measureBox(child);
      }
      return result;
    }
  }
};
var ArrayBufferTargetWriter = class extends Writer {
  constructor(target) {
    super();
    this._buffer = new ArrayBuffer(2 ** 16);
    this._bytes = new Uint8Array(this._buffer);
    this._maxPos = 0;
    this._target = target;
  }
  _ensureSize(size) {
    let newLength = this._buffer.byteLength;
    while (newLength < size)
      newLength *= 2;
    if (newLength === this._buffer.byteLength)
      return;
    let newBuffer = new ArrayBuffer(newLength);
    let newBytes = new Uint8Array(newBuffer);
    newBytes.set(this._bytes, 0);
    this._buffer = newBuffer;
    this._bytes = newBytes;
  }
  write(data) {
    this._ensureSize(this.pos + data.byteLength);
    this._bytes.set(data, this.pos);
    this.pos += data.byteLength;
    this._maxPos = Math.max(this._maxPos, this.pos);
  }
  finalize() {
    this._ensureSize(this.pos);
    this._target.buffer = this._buffer.slice(0, Math.max(this._maxPos, this.pos));
  }
};
var StreamTargetWriter = class extends Writer {
  constructor(target) {
    super();
    this._sections = [];
    this._target = target;
  }
  write(data) {
    this._sections.push({
      data: data.slice(),
      start: this.pos
    });
    this.pos += data.byteLength;
  }
  flush() {
    var _a, _b;
    if (this._sections.length === 0)
      return;
    let chunks = [];
    let sorted = [...this._sections].sort((a, b) => a.start - b.start);
    chunks.push({
      start: sorted[0].start,
      size: sorted[0].data.byteLength
    });
    for (let i = 1; i < sorted.length; i++) {
      let lastChunk = chunks[chunks.length - 1];
      let section = sorted[i];
      if (section.start <= lastChunk.start + lastChunk.size) {
        lastChunk.size = Math.max(lastChunk.size, section.start + section.data.byteLength - lastChunk.start);
      } else {
        chunks.push({
          start: section.start,
          size: section.data.byteLength
        });
      }
    }
    for (let chunk of chunks) {
      chunk.data = new Uint8Array(chunk.size);
      for (let section of this._sections) {
        if (chunk.start <= section.start && section.start < chunk.start + chunk.size) {
          chunk.data.set(section.data, section.start - chunk.start);
        }
      }
      (_b = (_a = this._target.options).onData) == null ? void 0 : _b.call(_a, chunk.data, chunk.start);
    }
    this._sections.length = 0;
  }
  finalize() {
  }
};
var DEFAULT_CHUNK_SIZE = 2 ** 24;
var MAX_CHUNKS_AT_ONCE = 2;
var ChunkedStreamTargetWriter = class extends Writer {
  constructor(target) {
    var _a, _b;
    super();
    /**
     * The data is divided up into fixed-size chunks, whose contents are first filled in RAM and then flushed out.
     * A chunk is flushed if all of its contents have been written.
     */
    this._chunks = [];
    this._target = target;
    this._chunkSize = (_b = (_a = target.options) == null ? void 0 : _a.chunkSize) != null ? _b : DEFAULT_CHUNK_SIZE;
    if (!Number.isInteger(this._chunkSize) || this._chunkSize < 2 ** 10) {
      throw new Error("Invalid StreamTarget options: chunkSize must be an integer not smaller than 1024.");
    }
  }
  write(data) {
    this._writeDataIntoChunks(data, this.pos);
    this._flushChunks();
    this.pos += data.byteLength;
  }
  _writeDataIntoChunks(data, position) {
    let chunkIndex = this._chunks.findIndex((x) => x.start <= position && position < x.start + this._chunkSize);
    if (chunkIndex === -1)
      chunkIndex = this._createChunk(position);
    let chunk = this._chunks[chunkIndex];
    let relativePosition = position - chunk.start;
    let toWrite = data.subarray(0, Math.min(this._chunkSize - relativePosition, data.byteLength));
    chunk.data.set(toWrite, relativePosition);
    let section = {
      start: relativePosition,
      end: relativePosition + toWrite.byteLength
    };
    this._insertSectionIntoChunk(chunk, section);
    if (chunk.written[0].start === 0 && chunk.written[0].end === this._chunkSize) {
      chunk.shouldFlush = true;
    }
    if (this._chunks.length > MAX_CHUNKS_AT_ONCE) {
      for (let i = 0; i < this._chunks.length - 1; i++) {
        this._chunks[i].shouldFlush = true;
      }
      this._flushChunks();
    }
    if (toWrite.byteLength < data.byteLength) {
      this._writeDataIntoChunks(data.subarray(toWrite.byteLength), position + toWrite.byteLength);
    }
  }
  _insertSectionIntoChunk(chunk, section) {
    let low = 0;
    let high = chunk.written.length - 1;
    let index = -1;
    while (low <= high) {
      let mid = Math.floor(low + (high - low + 1) / 2);
      if (chunk.written[mid].start <= section.start) {
        low = mid + 1;
        index = mid;
      } else {
        high = mid - 1;
      }
    }
    chunk.written.splice(index + 1, 0, section);
    if (index === -1 || chunk.written[index].end < section.start)
      index++;
    while (index < chunk.written.length - 1 && chunk.written[index].end >= chunk.written[index + 1].start) {
      chunk.written[index].end = Math.max(chunk.written[index].end, chunk.written[index + 1].end);
      chunk.written.splice(index + 1, 1);
    }
  }
  _createChunk(includesPosition) {
    let start = Math.floor(includesPosition / this._chunkSize) * this._chunkSize;
    let chunk = {
      start,
      data: new Uint8Array(this._chunkSize),
      written: [],
      shouldFlush: false
    };
    this._chunks.push(chunk);
    this._chunks.sort((a, b) => a.start - b.start);
    return this._chunks.indexOf(chunk);
  }
  _flushChunks(force = false) {
    var _a, _b;
    for (let i = 0; i < this._chunks.length; i++) {
      let chunk = this._chunks[i];
      if (!chunk.shouldFlush && !force)
        continue;
      for (let section of chunk.written) {
        (_b = (_a = this._target.options).onData) == null ? void 0 : _b.call(
          _a,
          chunk.data.subarray(section.start, section.end),
          chunk.start + section.start
        );
      }
      this._chunks.splice(i--, 1);
    }
  }
  finalize() {
    this._flushChunks(true);
  }
};
var FileSystemWritableFileStreamTargetWriter = class extends ChunkedStreamTargetWriter {
  constructor(target) {
    var _a;
    super(new StreamTarget({
      onData: (data, position) => target.stream.write({
        type: "write",
        data,
        position
      }),
      chunkSize: (_a = target.options) == null ? void 0 : _a.chunkSize
    }));
  }
};

// src/muxer.ts
var GLOBAL_TIMESCALE = 1e3;
var SUPPORTED_VIDEO_CODECS = ["avc", "hevc", "vp9", "av1"];
var SUPPORTED_AUDIO_CODECS = ["aac", "opus"];
var TIMESTAMP_OFFSET = 2082844800;
var FIRST_TIMESTAMP_BEHAVIORS = ["strict", "offset", "cross-track-offset"];
var Muxer = class {
  constructor(options) {
    this._videoTrack = null;
    this._audioTrack = null;
    this._creationTime = Math.floor(Date.now() / 1e3) + TIMESTAMP_OFFSET;
    this._finalizedChunks = [];
    // Fields for fragmented MP4:
    this._nextFragmentNumber = 1;
    this._videoSampleQueue = [];
    this._audioSampleQueue = [];
    this._finalized = false;
    var _a;
    this._validateOptions(options);
    options.video = deepClone(options.video);
    options.audio = deepClone(options.audio);
    options.fastStart = deepClone(options.fastStart);
    this.target = options.target;
    this._options = {
      firstTimestampBehavior: "strict",
      ...options
    };
    if (options.target instanceof ArrayBufferTarget) {
      this._writer = new ArrayBufferTargetWriter(options.target);
    } else if (options.target instanceof StreamTarget) {
      this._writer = ((_a = options.target.options) == null ? void 0 : _a.chunked) ? new ChunkedStreamTargetWriter(options.target) : new StreamTargetWriter(options.target);
    } else if (options.target instanceof FileSystemWritableFileStreamTarget) {
      this._writer = new FileSystemWritableFileStreamTargetWriter(options.target);
    } else {
      throw new Error(`Invalid target: ${options.target}`);
    }
    this._prepareTracks();
    this._writeHeader();
  }
  _validateOptions(options) {
    if (typeof options !== "object") {
      throw new TypeError("The muxer requires an options object to be passed to its constructor.");
    }
    if (!(options.target instanceof Target)) {
      throw new TypeError("The target must be provided and an instance of Target.");
    }
    if (options.video) {
      if (!SUPPORTED_VIDEO_CODECS.includes(options.video.codec)) {
        throw new TypeError(`Unsupported video codec: ${options.video.codec}`);
      }
      if (!Number.isInteger(options.video.width) || options.video.width <= 0) {
        throw new TypeError(`Invalid video width: ${options.video.width}. Must be a positive integer.`);
      }
      if (!Number.isInteger(options.video.height) || options.video.height <= 0) {
        throw new TypeError(`Invalid video height: ${options.video.height}. Must be a positive integer.`);
      }
      const videoRotation = options.video.rotation;
      if (typeof videoRotation === "number" && ![0, 90, 180, 270].includes(videoRotation)) {
        throw new TypeError(`Invalid video rotation: ${videoRotation}. Has to be 0, 90, 180 or 270.`);
      } else if (Array.isArray(videoRotation) && (videoRotation.length !== 9 || videoRotation.some((value) => typeof value !== "number"))) {
        throw new TypeError(`Invalid video transformation matrix: ${videoRotation.join()}`);
      }
      if (options.video.frameRate !== void 0 && (!Number.isInteger(options.video.frameRate) || options.video.frameRate <= 0)) {
        throw new TypeError(
          `Invalid video frame rate: ${options.video.frameRate}. Must be a positive integer.`
        );
      }
    }
    if (options.audio) {
      if (!SUPPORTED_AUDIO_CODECS.includes(options.audio.codec)) {
        throw new TypeError(`Unsupported audio codec: ${options.audio.codec}`);
      }
      if (!Number.isInteger(options.audio.numberOfChannels) || options.audio.numberOfChannels <= 0) {
        throw new TypeError(
          `Invalid number of audio channels: ${options.audio.numberOfChannels}. Must be a positive integer.`
        );
      }
      if (!Number.isInteger(options.audio.sampleRate) || options.audio.sampleRate <= 0) {
        throw new TypeError(
          `Invalid audio sample rate: ${options.audio.sampleRate}. Must be a positive integer.`
        );
      }
    }
    if (options.firstTimestampBehavior && !FIRST_TIMESTAMP_BEHAVIORS.includes(options.firstTimestampBehavior)) {
      throw new TypeError(`Invalid first timestamp behavior: ${options.firstTimestampBehavior}`);
    }
    if (typeof options.fastStart === "object") {
      if (options.video) {
        if (options.fastStart.expectedVideoChunks === void 0) {
          throw new TypeError(`'fastStart' is an object but is missing property 'expectedVideoChunks'.`);
        } else if (!Number.isInteger(options.fastStart.expectedVideoChunks) || options.fastStart.expectedVideoChunks < 0) {
          throw new TypeError(`'expectedVideoChunks' must be a non-negative integer.`);
        }
      }
      if (options.audio) {
        if (options.fastStart.expectedAudioChunks === void 0) {
          throw new TypeError(`'fastStart' is an object but is missing property 'expectedAudioChunks'.`);
        } else if (!Number.isInteger(options.fastStart.expectedAudioChunks) || options.fastStart.expectedAudioChunks < 0) {
          throw new TypeError(`'expectedAudioChunks' must be a non-negative integer.`);
        }
      }
    } else if (![false, "in-memory", "fragmented"].includes(options.fastStart)) {
      throw new TypeError(`'fastStart' option must be false, 'in-memory', 'fragmented' or an object.`);
    }
  }
  _writeHeader() {
    var _a;
    this._writer.writeBox(ftyp({
      holdsAvc: ((_a = this._options.video) == null ? void 0 : _a.codec) === "avc",
      fragmented: this._options.fastStart === "fragmented"
    }));
    this._ftypSize = this._writer.pos;
    if (this._options.fastStart === "in-memory") {
      this._mdat = mdat(false);
    } else if (this._options.fastStart === "fragmented") {
    } else {
      if (typeof this._options.fastStart === "object") {
        let moovSizeUpperBound = this._computeMoovSizeUpperBound();
        this._writer.seek(this._writer.pos + moovSizeUpperBound);
      }
      this._mdat = mdat(true);
      this._writer.writeBox(this._mdat);
    }
    this._maybeFlushStreamingTargetWriter();
  }
  _computeMoovSizeUpperBound() {
    if (typeof this._options.fastStart !== "object")
      return;
    let upperBound = 0;
    let sampleCounts = [
      this._options.fastStart.expectedVideoChunks,
      this._options.fastStart.expectedAudioChunks
    ];
    for (let n of sampleCounts) {
      if (!n)
        continue;
      upperBound += (4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += (4 + 4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += 8 * n;
    }
    upperBound += 4096;
    return upperBound;
  }
  _prepareTracks() {
    var _a, _b;
    if (this._options.video) {
      this._videoTrack = {
        id: 1,
        info: {
          type: "video",
          codec: this._options.video.codec,
          width: this._options.video.width,
          height: this._options.video.height,
          rotation: (_a = this._options.video.rotation) != null ? _a : 0,
          decoderConfig: null
        },
        // The fallback contains many common frame rates as factors
        timescale: (_b = this._options.video.frameRate) != null ? _b : 57600,
        samples: [],
        finalizedChunks: [],
        currentChunk: null,
        firstDecodeTimestamp: void 0,
        lastDecodeTimestamp: -1,
        timeToSampleTable: [],
        compositionTimeOffsetTable: [],
        lastTimescaleUnits: null,
        lastSample: null,
        compactlyCodedChunkTable: []
      };
    }
    if (this._options.audio) {
      this._audioTrack = {
        id: this._options.video ? 2 : 1,
        info: {
          type: "audio",
          codec: this._options.audio.codec,
          numberOfChannels: this._options.audio.numberOfChannels,
          sampleRate: this._options.audio.sampleRate,
          decoderConfig: null
        },
        timescale: this._options.audio.sampleRate,
        samples: [],
        finalizedChunks: [],
        currentChunk: null,
        firstDecodeTimestamp: void 0,
        lastDecodeTimestamp: -1,
        timeToSampleTable: [],
        compositionTimeOffsetTable: [],
        lastTimescaleUnits: null,
        lastSample: null,
        compactlyCodedChunkTable: []
      };
      if (this._options.audio.codec === "aac") {
        let guessedCodecPrivate = this._generateMpeg4AudioSpecificConfig(
          2,
          // Object type for AAC-LC, since it's the most common
          this._options.audio.sampleRate,
          this._options.audio.numberOfChannels
        );
        this._audioTrack.info.decoderConfig = {
          codec: this._options.audio.codec,
          description: guessedCodecPrivate,
          numberOfChannels: this._options.audio.numberOfChannels,
          sampleRate: this._options.audio.sampleRate
        };
      }
    }
  }
  // https://wiki.multimedia.cx/index.php/MPEG-4_Audio
  _generateMpeg4AudioSpecificConfig(objectType, sampleRate, numberOfChannels) {
    let frequencyIndices = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350];
    let frequencyIndex = frequencyIndices.indexOf(sampleRate);
    let channelConfig = numberOfChannels;
    let configBits = "";
    configBits += objectType.toString(2).padStart(5, "0");
    configBits += frequencyIndex.toString(2).padStart(4, "0");
    if (frequencyIndex === 15)
      configBits += sampleRate.toString(2).padStart(24, "0");
    configBits += channelConfig.toString(2).padStart(4, "0");
    let paddingLength = Math.ceil(configBits.length / 8) * 8;
    configBits = configBits.padEnd(paddingLength, "0");
    let configBytes = new Uint8Array(configBits.length / 8);
    for (let i = 0; i < configBits.length; i += 8) {
      configBytes[i / 8] = parseInt(configBits.slice(i, i + 8), 2);
    }
    return configBytes;
  }
  addVideoChunk(sample, meta, timestamp, compositionTimeOffset) {
    if (!(sample instanceof EncodedVideoChunk)) {
      throw new TypeError("addVideoChunk's first argument (sample) must be of type EncodedVideoChunk.");
    }
    if (meta && typeof meta !== "object") {
      throw new TypeError("addVideoChunk's second argument (meta), when provided, must be an object.");
    }
    if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
      throw new TypeError(
        "addVideoChunk's third argument (timestamp), when provided, must be a non-negative real number."
      );
    }
    if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
      throw new TypeError(
        "addVideoChunk's fourth argument (compositionTimeOffset), when provided, must be a real number."
      );
    }
    let data = new Uint8Array(sample.byteLength);
    sample.copyTo(data);
    this.addVideoChunkRaw(
      data,
      sample.type,
      timestamp != null ? timestamp : sample.timestamp,
      sample.duration,
      meta,
      compositionTimeOffset
    );
  }
  addVideoChunkRaw(data, type, timestamp, duration, meta, compositionTimeOffset) {
    if (!(data instanceof Uint8Array)) {
      throw new TypeError("addVideoChunkRaw's first argument (data) must be an instance of Uint8Array.");
    }
    if (type !== "key" && type !== "delta") {
      throw new TypeError("addVideoChunkRaw's second argument (type) must be either 'key' or 'delta'.");
    }
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      throw new TypeError("addVideoChunkRaw's third argument (timestamp) must be a non-negative real number.");
    }
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError("addVideoChunkRaw's fourth argument (duration) must be a non-negative real number.");
    }
    if (meta && typeof meta !== "object") {
      throw new TypeError("addVideoChunkRaw's fifth argument (meta), when provided, must be an object.");
    }
    if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
      throw new TypeError(
        "addVideoChunkRaw's sixth argument (compositionTimeOffset), when provided, must be a real number."
      );
    }
    this._ensureNotFinalized();
    if (!this._options.video)
      throw new Error("No video track declared.");
    if (typeof this._options.fastStart === "object" && this._videoTrack.samples.length === this._options.fastStart.expectedVideoChunks) {
      throw new Error(`Cannot add more video chunks than specified in 'fastStart' (${this._options.fastStart.expectedVideoChunks}).`);
    }
    let videoSample = this._createSampleForTrack(
      this._videoTrack,
      data,
      type,
      timestamp,
      duration,
      meta,
      compositionTimeOffset
    );
    if (this._options.fastStart === "fragmented" && this._audioTrack) {
      while (this._audioSampleQueue.length > 0 && this._audioSampleQueue[0].decodeTimestamp <= videoSample.decodeTimestamp) {
        let audioSample = this._audioSampleQueue.shift();
        this._addSampleToTrack(this._audioTrack, audioSample);
      }
      if (videoSample.decodeTimestamp <= this._audioTrack.lastDecodeTimestamp) {
        this._addSampleToTrack(this._videoTrack, videoSample);
      } else {
        this._videoSampleQueue.push(videoSample);
      }
    } else {
      this._addSampleToTrack(this._videoTrack, videoSample);
    }
  }
  addAudioChunk(sample, meta, timestamp) {
    let data = new Uint8Array(sample.byteLength);
    sample.copyTo(data);
    this.addAudioChunkRaw(data, sample.type, timestamp != null ? timestamp : sample.timestamp, sample.duration, meta);
  }
  addAudioChunkRaw(data, type, timestamp, duration, meta) {
    this._ensureNotFinalized();
    if (!this._options.audio)
      throw new Error("No audio track declared.");
    if (typeof this._options.fastStart === "object" && this._audioTrack.samples.length === this._options.fastStart.expectedAudioChunks) {
      throw new Error(`Cannot add more audio chunks than specified in 'fastStart' (${this._options.fastStart.expectedAudioChunks}).`);
    }
    let audioSample = this._createSampleForTrack(this._audioTrack, data, type, timestamp, duration, meta);
    if (this._options.fastStart === "fragmented" && this._videoTrack) {
      while (this._videoSampleQueue.length > 0 && this._videoSampleQueue[0].decodeTimestamp <= audioSample.decodeTimestamp) {
        let videoSample = this._videoSampleQueue.shift();
        this._addSampleToTrack(this._videoTrack, videoSample);
      }
      if (audioSample.decodeTimestamp <= this._videoTrack.lastDecodeTimestamp) {
        this._addSampleToTrack(this._audioTrack, audioSample);
      } else {
        this._audioSampleQueue.push(audioSample);
      }
    } else {
      this._addSampleToTrack(this._audioTrack, audioSample);
    }
  }
  _createSampleForTrack(track, data, type, timestamp, duration, meta, compositionTimeOffset) {
    let presentationTimestampInSeconds = timestamp / 1e6;
    let decodeTimestampInSeconds = (timestamp - (compositionTimeOffset != null ? compositionTimeOffset : 0)) / 1e6;
    let durationInSeconds = duration / 1e6;
    let adjusted = this._validateTimestamp(presentationTimestampInSeconds, decodeTimestampInSeconds, track);
    presentationTimestampInSeconds = adjusted.presentationTimestamp;
    decodeTimestampInSeconds = adjusted.decodeTimestamp;
    if (meta == null ? void 0 : meta.decoderConfig) {
      if (track.info.decoderConfig === null) {
        track.info.decoderConfig = meta.decoderConfig;
      } else {
        Object.assign(track.info.decoderConfig, meta.decoderConfig);
      }
    }
    let sample = {
      presentationTimestamp: presentationTimestampInSeconds,
      decodeTimestamp: decodeTimestampInSeconds,
      duration: durationInSeconds,
      data,
      size: data.byteLength,
      type,
      // Will be refined once the next sample comes in
      timescaleUnitsToNextSample: intoTimescale(durationInSeconds, track.timescale)
    };
    return sample;
  }
  _addSampleToTrack(track, sample) {
    var _a;
    if (this._options.fastStart !== "fragmented") {
      track.samples.push(sample);
    }
    const sampleCompositionTimeOffset = intoTimescale(sample.presentationTimestamp - sample.decodeTimestamp, track.timescale);
    if (track.lastTimescaleUnits !== null) {
      let timescaleUnits = intoTimescale(sample.decodeTimestamp, track.timescale, false);
      let delta = Math.round(timescaleUnits - track.lastTimescaleUnits);
      track.lastTimescaleUnits += delta;
      track.lastSample.timescaleUnitsToNextSample = delta;
      if (this._options.fastStart !== "fragmented") {
        let lastTableEntry = last(track.timeToSampleTable);
        if (lastTableEntry.sampleCount === 1) {
          lastTableEntry.sampleDelta = delta;
          lastTableEntry.sampleCount++;
        } else if (lastTableEntry.sampleDelta === delta) {
          lastTableEntry.sampleCount++;
        } else {
          lastTableEntry.sampleCount--;
          track.timeToSampleTable.push({
            sampleCount: 2,
            sampleDelta: delta
          });
        }
        const lastCompositionTimeOffsetTableEntry = last(track.compositionTimeOffsetTable);
        if (lastCompositionTimeOffsetTableEntry.sampleCompositionTimeOffset === sampleCompositionTimeOffset) {
          lastCompositionTimeOffsetTableEntry.sampleCount++;
        } else {
          track.compositionTimeOffsetTable.push({
            sampleCount: 1,
            sampleCompositionTimeOffset
          });
        }
      }
    } else {
      track.lastTimescaleUnits = 0;
      if (this._options.fastStart !== "fragmented") {
        track.timeToSampleTable.push({
          sampleCount: 1,
          sampleDelta: intoTimescale(sample.duration, track.timescale)
        });
        track.compositionTimeOffsetTable.push({
          sampleCount: 1,
          sampleCompositionTimeOffset
        });
      }
    }
    track.lastSample = sample;
    let beginNewChunk = false;
    if (!track.currentChunk) {
      beginNewChunk = true;
    } else {
      let currentChunkDuration = sample.presentationTimestamp - track.currentChunk.startTimestamp;
      if (this._options.fastStart === "fragmented") {
        let mostImportantTrack = (_a = this._videoTrack) != null ? _a : this._audioTrack;
        if (track === mostImportantTrack && sample.type === "key" && currentChunkDuration >= 1) {
          beginNewChunk = true;
          this._finalizeFragment();
        }
      } else {
        beginNewChunk = currentChunkDuration >= 0.5;
      }
    }
    if (beginNewChunk) {
      if (track.currentChunk) {
        this._finalizeCurrentChunk(track);
      }
      track.currentChunk = {
        startTimestamp: sample.presentationTimestamp,
        samples: []
      };
    }
    track.currentChunk.samples.push(sample);
  }
  _validateTimestamp(presentationTimestamp, decodeTimestamp, track) {
    var _a, _b, _c, _d;
    const strictTimestampBehavior = this._options.firstTimestampBehavior === "strict";
    const noLastDecodeTimestamp = track.lastDecodeTimestamp === -1;
    const timestampNonZero = decodeTimestamp !== 0;
    if (strictTimestampBehavior && noLastDecodeTimestamp && timestampNonZero) {
      throw new Error(
        `The first chunk for your media track must have a timestamp of 0 (received DTS=${decodeTimestamp}).Non-zero first timestamps are often caused by directly piping frames or audio data from a MediaStreamTrack into the encoder. Their timestamps are typically relative to the age of thedocument, which is probably what you want.

If you want to offset all timestamps of a track such that the first one is zero, set firstTimestampBehavior: 'offset' in the options.
`
      );
    } else if (this._options.firstTimestampBehavior === "offset" || this._options.firstTimestampBehavior === "cross-track-offset") {
      if (track.firstDecodeTimestamp === void 0) {
        track.firstDecodeTimestamp = decodeTimestamp;
      }
      let baseDecodeTimestamp;
      if (this._options.firstTimestampBehavior === "offset") {
        baseDecodeTimestamp = track.firstDecodeTimestamp;
      } else {
        baseDecodeTimestamp = Math.min(
          (_b = (_a = this._videoTrack) == null ? void 0 : _a.firstDecodeTimestamp) != null ? _b : Infinity,
          (_d = (_c = this._audioTrack) == null ? void 0 : _c.firstDecodeTimestamp) != null ? _d : Infinity
        );
      }
      decodeTimestamp -= baseDecodeTimestamp;
      presentationTimestamp -= baseDecodeTimestamp;
    }
    if (decodeTimestamp < track.lastDecodeTimestamp) {
      throw new Error(
        `Timestamps must be monotonically increasing (DTS went from ${track.lastDecodeTimestamp * 1e6} to ${decodeTimestamp * 1e6}).`
      );
    }
    track.lastDecodeTimestamp = decodeTimestamp;
    return { presentationTimestamp, decodeTimestamp };
  }
  _finalizeCurrentChunk(track) {
    if (this._options.fastStart === "fragmented") {
      throw new Error("Can't finalize individual chunks if 'fastStart' is set to 'fragmented'.");
    }
    if (!track.currentChunk)
      return;
    track.finalizedChunks.push(track.currentChunk);
    this._finalizedChunks.push(track.currentChunk);
    if (track.compactlyCodedChunkTable.length === 0 || last(track.compactlyCodedChunkTable).samplesPerChunk !== track.currentChunk.samples.length) {
      track.compactlyCodedChunkTable.push({
        firstChunk: track.finalizedChunks.length,
        // 1-indexed
        samplesPerChunk: track.currentChunk.samples.length
      });
    }
    if (this._options.fastStart === "in-memory") {
      track.currentChunk.offset = 0;
      return;
    }
    track.currentChunk.offset = this._writer.pos;
    for (let sample of track.currentChunk.samples) {
      this._writer.write(sample.data);
      sample.data = null;
    }
    this._maybeFlushStreamingTargetWriter();
  }
  _finalizeFragment(flushStreamingWriter = true) {
    if (this._options.fastStart !== "fragmented") {
      throw new Error("Can't finalize a fragment unless 'fastStart' is set to 'fragmented'.");
    }
    let tracks = [this._videoTrack, this._audioTrack].filter((track) => track && track.currentChunk);
    if (tracks.length === 0)
      return;
    let fragmentNumber = this._nextFragmentNumber++;
    if (fragmentNumber === 1) {
      let movieBox = moov(tracks, this._creationTime, true);
      this._writer.writeBox(movieBox);
    }
    let moofOffset = this._writer.pos;
    let moofBox = moof(fragmentNumber, tracks);
    this._writer.writeBox(moofBox);
    {
      let mdatBox = mdat(false);
      let totalTrackSampleSize = 0;
      for (let track of tracks) {
        for (let sample of track.currentChunk.samples) {
          totalTrackSampleSize += sample.size;
        }
      }
      let mdatSize = this._writer.measureBox(mdatBox) + totalTrackSampleSize;
      if (mdatSize >= 2 ** 32) {
        mdatBox.largeSize = true;
        mdatSize = this._writer.measureBox(mdatBox) + totalTrackSampleSize;
      }
      mdatBox.size = mdatSize;
      this._writer.writeBox(mdatBox);
    }
    for (let track of tracks) {
      track.currentChunk.offset = this._writer.pos;
      track.currentChunk.moofOffset = moofOffset;
      for (let sample of track.currentChunk.samples) {
        this._writer.write(sample.data);
        sample.data = null;
      }
    }
    let endPos = this._writer.pos;
    this._writer.seek(this._writer.offsets.get(moofBox));
    let newMoofBox = moof(fragmentNumber, tracks);
    this._writer.writeBox(newMoofBox);
    this._writer.seek(endPos);
    for (let track of tracks) {
      track.finalizedChunks.push(track.currentChunk);
      this._finalizedChunks.push(track.currentChunk);
      track.currentChunk = null;
    }
    if (flushStreamingWriter) {
      this._maybeFlushStreamingTargetWriter();
    }
  }
  _maybeFlushStreamingTargetWriter() {
    if (this._writer instanceof StreamTargetWriter) {
      this._writer.flush();
    }
  }
  _ensureNotFinalized() {
    if (this._finalized) {
      throw new Error("Cannot add new video or audio chunks after the file has been finalized.");
    }
  }
  /** Finalizes the file, making it ready for use. Must be called after all video and audio chunks have been added. */
  finalize() {
    if (this._finalized) {
      throw new Error("Cannot finalize a muxer more than once.");
    }
    if (this._options.fastStart === "fragmented") {
      for (let videoSample of this._videoSampleQueue)
        this._addSampleToTrack(this._videoTrack, videoSample);
      for (let audioSample of this._audioSampleQueue)
        this._addSampleToTrack(this._audioTrack, audioSample);
      this._finalizeFragment(false);
    } else {
      if (this._videoTrack)
        this._finalizeCurrentChunk(this._videoTrack);
      if (this._audioTrack)
        this._finalizeCurrentChunk(this._audioTrack);
    }
    let tracks = [this._videoTrack, this._audioTrack].filter(Boolean);
    if (this._options.fastStart === "in-memory") {
      let mdatSize;
      for (let i = 0; i < 2; i++) {
        let movieBox2 = moov(tracks, this._creationTime);
        let movieBoxSize = this._writer.measureBox(movieBox2);
        mdatSize = this._writer.measureBox(this._mdat);
        let currentChunkPos = this._writer.pos + movieBoxSize + mdatSize;
        for (let chunk of this._finalizedChunks) {
          chunk.offset = currentChunkPos;
          for (let { data } of chunk.samples) {
            currentChunkPos += data.byteLength;
            mdatSize += data.byteLength;
          }
        }
        if (currentChunkPos < 2 ** 32)
          break;
        if (mdatSize >= 2 ** 32)
          this._mdat.largeSize = true;
      }
      let movieBox = moov(tracks, this._creationTime);
      this._writer.writeBox(movieBox);
      this._mdat.size = mdatSize;
      this._writer.writeBox(this._mdat);
      for (let chunk of this._finalizedChunks) {
        for (let sample of chunk.samples) {
          this._writer.write(sample.data);
          sample.data = null;
        }
      }
    } else if (this._options.fastStart === "fragmented") {
      let startPos = this._writer.pos;
      let mfraBox = mfra(tracks);
      this._writer.writeBox(mfraBox);
      let mfraBoxSize = this._writer.pos - startPos;
      this._writer.seek(this._writer.pos - 4);
      this._writer.writeU32(mfraBoxSize);
    } else {
      let mdatPos = this._writer.offsets.get(this._mdat);
      let mdatSize = this._writer.pos - mdatPos;
      this._mdat.size = mdatSize;
      this._mdat.largeSize = mdatSize >= 2 ** 32;
      this._writer.patchBox(this._mdat);
      let movieBox = moov(tracks, this._creationTime);
      if (typeof this._options.fastStart === "object") {
        this._writer.seek(this._ftypSize);
        this._writer.writeBox(movieBox);
        let remainingBytes = mdatPos - this._writer.pos;
        this._writer.writeBox(free(remainingBytes));
      } else {
        this._writer.writeBox(movieBox);
      }
    }
    this._maybeFlushStreamingTargetWriter();
    this._writer.finalize();
    this._finalized = true;
  }
};


;// ./recWorker.ts

const kLogTag = "recWorker:";
globalThis.d = 1;
function nullHandler(e) {
    // LOGE("nullHandler:", e);
}
class CallRecorderCore {
    constructor() {
        this.videoIn = null;
        this.tsLastVideoKeyFrame = 0;
        this.videoSrcId = -1;
        this.onAudioRead = (params) => {
            if (params.done) {
                do {
                    if (self.d) {
                        console.log(kLogTag, "Audio stream stopped");
                    }
                } while (0);
                return;
            }
            const audioData = params.value;
            try {
                this.audioEncoder.encode(audioData);
            }
            catch (ex) {
                audioData.close();
                this.destroy(ex);
                return;
            }
            audioData.close();
            this.audioReader.read().then(this.onAudioRead, nullHandler);
        };
        this.onVideoRead = (params) => {
            if (params.done) {
                do {
                    if (self.d) {
                        console.log(kLogTag, "Video stream stopped");
                    }
                } while (0);
                return;
            }
            const frame = this.composeVideoFrame(params.value);
            let kfFlag;
            const now = performance.now();
            if (now - this.tsLastVideoKeyFrame > this.keyFrameInterval) {
                kfFlag = { keyFrame: true };
                this.tsLastVideoKeyFrame = now;
            }
            try {
                this.videoEncoder.encode(frame, kfFlag);
            }
            catch (ex) {
                frame.close();
                this.destroy(ex);
                return;
            }
            frame.close();
            this.videoReader.read().then(this.onVideoRead, nullHandler);
        };
        this.onStaticVideoTimer = () => {
            const now = performance.now();
            let kf;
            if (now - this.tsLastVideoKeyFrame > this.keyFrameInterval) {
                this.tsLastVideoKeyFrame = now;
                kf = { keyFrame: true };
            }
            this.videoEncoder.encode(this.staticVideoFrame, kf);
        };
    }
    async init(config, audioIn, audioSampleRate, audioChanCount) {
        this.config = config;
        this.videoHeight = config.videoHeight;
        this.videoWidth = config.videoWidth;
        this.keyFrameInterval = config.keyFrameInterval;
        assert(this.videoHeight && this.videoWidth);
        // ====
        this.initAudio(audioIn, audioSampleRate, audioChanCount);
        await this.initVideo();
        await this.initRecording(audioSampleRate, audioChanCount);
    }
    initAudio(audioIn, audioSampleRate, audioChanCount) {
        // encoder setup
        this.audioIn = audioIn;
        this.audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
                this.muxer.addAudioChunk(chunk, meta, performance.now() * 1000);
            },
            error: (e) => {
                console.error(kLogTag, "Audio encode error:", e);
                this.destroy(e);
            }
        });
        this.audioEncoder.configure({
            codec: 'opus',
            sampleRate: audioSampleRate,
            numberOfChannels: audioChanCount
        });
    }
    async initVideo() {
        // encoder setup
        this.videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                this.muxer.addVideoChunk(chunk, meta, performance.now() * 1000);
            },
            error: (e) => {
                console.error(kLogTag, "Video encode error:", e);
                this.destroy(e);
            }
        });
        const config = {
            codec: this.config.videoCodecConfig,
            width: this.videoWidth,
            height: this.videoHeight,
            bitrate: 2e6,
            scalabilityMode: "L1T1",
            latencyMode: "quality",
            hardwareAcceleration: "prefer-hardware"
        };
        if (!(await VideoEncoder.isConfigSupported(config)).supported) {
            delete config.hardwareAcceleration;
            do {
                if (self.d) {
                    console.warn(kLogTag, "Video encoding is NOT hardware accelerated");
                }
            } while (0);
        }
        else {
            do {
                if (self.d) {
                    console.log(kLogTag, "Video encoding is hardware accelerated");
                }
            } while (0);
        }
        this.videoEncoder.configure(config);
    }
    async initRecording(audioSampleRate, audioChanCount) {
        this.muxer = new Muxer({
            target: new StreamTarget({ onData: this.onMuxOutput, chunked: true, chunkSize: 2048 * 1024 }),
            video: {
                codec: this.config.videoCodecType,
                width: this.videoWidth,
                height: this.videoHeight,
                frameRate: this.config.videoFps
            },
            audio: {
                codec: 'opus',
                sampleRate: audioSampleRate,
                numberOfChannels: audioChanCount
            },
            // Metadata goes to end of file - least processing and memory, but if recording crashes, no playable file
            fastStart: false,
            // Because we're directly pumping a MediaStreamTrack's data into it, which doesn't start at timestamp = 0
            firstTimestampBehavior: 'offset'
        });
    }
    onMuxOutput(data, position) {
        const copy = Uint8Array.from(data);
        self.postMessage(["d", copy, position], [copy.buffer]);
    }
    startAudioPipe() {
        if (this.audioReader) {
            do {
                if (self.d) {
                    console.warn(kLogTag, "startAudioPipe: already started");
                }
            } while (0);
            return;
        }
        this.audioReader = this.audioIn.getReader();
        this.audioReader.read().then(this.onAudioRead, nullHandler);
    }
    startVideoPipe() {
        if (!this.videoIn) {
            do {
                if (self.d) {
                    console.warn(kLogTag, "startVideoPipe: no video source");
                }
            } while (0);
            return;
        }
        if (this.videoReader) {
            do {
                if (self.d) {
                    console.warn(kLogTag, "startVideoPipe: already started");
                }
            } while (0);
            return;
        }
        this.tsLastVideoKeyFrame = 0; // force keyframe
        this.resetFrameCompositor();
        this.videoReader = this.videoIn.getReader();
        this.videoReader.read().then(this.onVideoRead, nullHandler);
    }
    stopAudioPipe() {
        if (!this.audioReader) {
            return;
        }
        this.audioReader.releaseLock();
        delete this.audioReader;
    }
    stopVideoPipe() {
        if (!this.videoReader) {
            return;
        }
        // we should releaseLock(), but it causes local video tracks to stop reading frames, even if we re-obtain the
        // track or restart the call. This seems to be a Chrome bug. As a result, we can't pause() with preserving
        // the input stream, because cancel() invalidates it
        this.videoReader.cancel();
        delete this.videoReader;
    }
    setVideoIn(videoIn, sourceId, caption) {
        this.delStaticVideoInput();
        this.delStreamVideoInput();
        assert(!this.videoIn && !this.staticVideoFrame);
        this.setVideoCaption(sourceId, caption);
        this.videoSrcId = sourceId;
        if (videoIn instanceof ReadableStream) {
            this.videoIn = videoIn;
        }
        else {
            this.staticVideoFrame = videoIn;
        }
        if (!this.paused) {
            if (!this.audioReader) {
                this.startAudioPipe(); // initial startup
            }
            if (this.videoIn) {
                this.startVideoPipe();
            }
            else {
                this.startStaticVideo();
            }
        }
    }
    delStreamVideoInput() {
        if (this.videoIn) {
            this.stopVideoPipe();
            this.videoIn = null;
        }
    }
    flushEncoders() {
        return Promise.all([
            (this.videoEncoder.state === "configured") ? this.videoEncoder.flush() : null,
            (this.audioEncoder.state === "configured") ? this.audioEncoder.flush() : null
        ]);
    }
    finalize() {
        if (!this.muxer) {
            return;
        }
        return this.flushEncoders()
            .then(() => {
            return this.muxer.finalize();
        });
    }
    async startStaticVideo() {
        if (this.staticVideoTimer) {
            do {
                if (self.d) {
                    console.warn(kLogTag, "startStaticVideo: Already in static video mode");
                }
            } while (0);
            return;
        }
        do {
            if (self.d) {
                console.warn(kLogTag, "Starting static video");
            }
        } while (0);
        this.tsLastVideoKeyFrame = 0; // force keyframe
        this.staticVideoTimer = setInterval(this.onStaticVideoTimer, 60); // TS def of setInterval is NodeJS-type
        this.onStaticVideoTimer();
    }
    stopStaticVideoTimer() {
        if (!this.staticVideoTimer) {
            return;
        }
        clearInterval(this.staticVideoTimer);
        delete this.staticVideoTimer;
        do {
            if (self.d) {
                console.log(kLogTag, "Stopped static video timer");
            }
        } while (0);
    }
    delStaticVideoInput() {
        this.stopStaticVideoTimer();
        if (this.staticVideoFrame) {
            this.staticVideoFrame.close();
            delete this.staticVideoFrame;
        }
    }
    setVideoCaption(sourceId, caption) {
        /* while recording local video, we may update the video track many times without changing sourceId, i.e.when the
           user enables/disables screenshare. This change happens automatically and there is nobody to provide a new
           caption with each call, so we have the special case when the sourceId doesn't change and caption is
           undefined, the current value is preserved */
        if (caption === undefined && sourceId === this.videoSrcId) {
            return;
        }
        if (this.videoCaption) {
            this.videoCaption.bitmap.close();
        }
        this.videoCaption = caption;
    }
    updateVideoCaption(sourceId, caption) {
        if (sourceId !== this.videoSrcId) {
            do {
                if (self.d) {
                    console.warn(kLogTag, `updateVideoCaption: Current video source ${this.videoSrcId} is not the expected one ${sourceId}`);
                }
            } while (0);
            return;
        }
        if (this.videoCaption) {
            this.videoCaption.bitmap.close();
        }
        this.videoCaption = caption;
    }
    async destroy(err) {
        if (this.destroyed) {
            do {
                if (self.d) {
                    console.warn(kLogTag, "destroy: already destroyed or destroying");
                }
            } while (0);
            return;
        }
        if (err) {
            console.error(kLogTag, "Destroying due to error:", err.message || err);
        }
        else {
            do {
                if (self.d) {
                    console.warn(kLogTag, "Destroying...");
                }
            } while (0);
        }
        this.destroyed = true;
        this.delStaticVideoInput();
        this.delStreamVideoInput();
        this.stopAudioPipe();
        delete this.audioIn;
        await this.finalize();
        if (this.videoCaption) {
            this.videoCaption.bitmap.close();
            delete this.videoCaption;
        }
        self.postMessage(["c", err]); // close output
        do {
            if (self.d) {
                console.warn(kLogTag, "Destroyed");
            }
        } while (0);
    }
    isDestroyed() {
        return this.destroyed;
    }
    resetFrameCompositor() {
        if (this.resizeCtx) {
            this.resizeCtx.fillStyle = this.config.frameBorderColor;
            this.resizeCtx.fillRect(0, 0, this.videoWidth, this.videoHeight);
        }
    }
    composeVideoFrame(frame) {
        const sizeMatches = (frame.displayHeight === this.videoHeight && frame.displayWidth === this.videoWidth);
        const caption = this.videoCaption;
        if (sizeMatches && !caption) {
            return frame;
        }
        let ctx = this.resizeCtx;
        if (!ctx) {
            const canv = new OffscreenCanvas(this.videoWidth, this.videoHeight);
            ctx = this.resizeCtx = canv.getContext("2d");
        }
        if (sizeMatches) {
            ctx.drawImage(frame, 0, 0);
        }
        else { // scale
            if (this.lastScaledFrameW !== frame.displayWidth || this.lastScaledFrameH !== frame.displayHeight) {
                // frame size changed, recalc scaled draw & centering params
                this.lastScaledFrameW = frame.displayWidth;
                this.lastScaledFrameH = frame.displayHeight;
                ctx.fillStyle = this.config.frameBorderColor;
                ctx.fillRect(0, 0, this.videoWidth, this.videoHeight);
                const wScale = this.videoWidth / frame.displayWidth;
                const hScale = this.videoHeight / frame.displayHeight;
                const scale = Math.min(wScale, hScale);
                if (scale >= 1 && scale <= 1.1) { // can get away without scaling
                    this.frameDrawW = frame.displayWidth;
                    this.frameDrawH = frame.displayHeight;
                }
                else {
                    this.frameDrawW = (frame.displayWidth * scale) >> 0;
                    this.frameDrawH = (frame.displayHeight * scale) >> 0;
                }
                this.frameDrawX = (this.videoWidth - this.frameDrawW) >> 1;
                this.frameDrawY = (this.videoHeight - this.frameDrawH) >> 1;
            }
            else if (caption) { // clear the background of the caption, as it may span in the non-redrawn border area
                ctx.fillStyle = this.config.frameBorderColor;
                ctx.fillRect(caption.x, caption.y, caption.bitmap.width, caption.bitmap.height);
            }
            ctx.drawImage(frame, this.frameDrawX, this.frameDrawY, this.frameDrawW, this.frameDrawH);
        }
        const ts = frame.timestamp;
        const dur = frame.duration;
        frame.close();
        if (caption) {
            ctx.drawImage(caption.bitmap, caption.x, caption.y);
        }
        return new VideoFrame(ctx.canvas, { timestamp: ts, duration: dur });
    }
    pause(keepVideoSrc) {
        if (this.paused) {
            return;
        }
        this.stopAudioPipe();
        if (keepVideoSrc) {
            throw new Error("pause(keepVideoSrc): There is a Chrome bug in ReadableStream.releaseLock() that prevents " +
                "this mode from working properly");
            this.stopVideoPipe();
            this.stopStaticVideoTimer();
        }
        else {
            this.delStreamVideoInput();
            assert(!this.videoIn);
            this.delStaticVideoInput();
            this.videoSrcId = -1;
        }
        this.paused = true;
        return this.flushEncoders();
    }
    resume() {
        if (!this.paused) {
            return;
        }
        if (this.staticVideoFrame) {
            this.startStaticVideo();
        }
        else if (this.videoIn) {
            this.startVideoPipe();
        }
        else if (this.videoSrcId !== -1) {
            throw new Error("resume: Assert failed: No video input (stream or static), but videoSrcId is not -1");
        }
        this.startAudioPipe();
        delete this.paused;
    }
}
var gRecorder = new CallRecorderCore();
async function destroyRecorderAndTerminate(ex) {
    await gRecorder.destroy(ex);
    setTimeout(() => self.close(), 100);
}
self.onmessage = async function (msg) {
    const data = msg.data;
    const op = data[0];
    const cmdId = data[1];
    const params = data[2];
    try {
        if (gRecorder.isDestroyed()) {
            throw new Error("Recorder worker destroyed");
        }
        switch (op) {
            case "i":
                // init(config: CallRecConfig, audioIn: ReadableStream, audioSampleRate: number, audioChanCount: number)
                await gRecorder.init(params[0], params[1], params[2], params[3]);
                break;
            case "vi": // setVideoIn(videoIn?: ReadableStream<VideoFrame>, sourceId: number, caption?: ImageBitmap)
                gRecorder.setVideoIn(params[0], params[1], params[2]);
                break;
            case "p":
                gRecorder.pause(params[0]);
                break;
            case "r":
                gRecorder.resume();
                break;
            case "uc":
                gRecorder.updateVideoCaption(params[0], params[1]);
                break;
            case "ds":
                destroyRecorderAndTerminate();
                break;
            default: {
                const msg = `Unknown command "${op}"`;
                do {
                    if (self.d) {
                        console.warn(kLogTag, msg);
                    }
                } while (0);
                if (cmdId) { // send ACK
                    self.postMessage(["e", cmdId, msg]);
                }
                return;
            }
        }
        self.postMessage(["r", cmdId]);
    }
    catch (ex) {
        self.postMessage(["e", cmdId, ex.message]);
        if (op === "i") {
            destroyRecorderAndTerminate(ex);
        }
    }
};
function assert(cond) {
    if (!cond) {
        throw new Error("Assertion failed");
    }
}

/******/ })()
;