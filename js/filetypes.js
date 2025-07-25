var ext = {};
var extensions = {
    'threed': [['3ds', '3dm', 'max', 'obj'], '3D'],
    'aftereffects': [['aep', 'aet'], 'Adobe Aftereffects'],
    'audio': [['mp3', 'wav', '3ga', 'aif', 'aiff', 'flac', 'iff', 'm4a', 'wma'], 'Audio'],
    'cad': [['dxf', 'dwg'], 'CAD'],
    'compressed': [['zip', 'rar', 'tgz', 'gz', 'bz2', 'tbz', 'tar', '7z', 'sitx'], 'Compressed'],
    'dmg': [['dmg'], 'Disk Image'],
    'excel': [['xls', 'xlsx', 'xlt', 'xltm'], 'Excel'],
    'executable': [['exe', 'com', 'bin', 'apk', 'app', 'msi', 'cmd', 'gadget'], 'Executable'],
    'font': [['fnt', 'otf', 'ttf', 'fon'], 'Font'],
    'generic': [['*'], 'File'],
    'illustrator': [['ai', 'ait'], 'Adobe Illustrator'],
    'image': [['gif', 'tiff', 'tif', 'bmp', 'png', 'tga', 'jpg', 'jpeg', 'jxl', 'heic', 'webp', 'avif'], 'Image'],
    'indesign': [['indd'], 'Adobe InDesign'],
    'keynote': [['key'], 'Apple Keynote'],
    'mega': [['megaignore'], 'Mega Ignore'],
    'numbers': [['numbers'], 'Apple Numbers'],
    'open-office': [['sxw', 'stw', 'sxc', 'stc', 'sxi', 'sti', 'sxd', 'std', 'sxm'], 'OpenOffice'],
    'pages': [['pages'], 'Apple Pages'],
    'pdf': [['pdf'], 'PDF'],
    'photoshop': [['abr', 'psb', 'psd'], 'Adobe Photoshop'],
    'powerpoint': [['pps', 'ppt', 'pptx'], 'Powerpoint'],
    'premiere': [['prproj', 'ppj'], 'Adobe Premiere'],
    'experiencedesign': [['xd'], 'Adobe XD'],
    'spreadsheet': [['ods', 'ots', 'gsheet', 'nb', 'xlr'], 'Spreadsheet'],
    'torrent': [['torrent'], 'Torrent'],
    'text': [['txt', 'ans', 'ascii', 'log', 'wpd', 'json', 'md', 'org'], 'Text', 'pages'],
    'vector': [['svgz', 'svg', 'cdr', 'eps'], 'Vector'],
    'video': [['mkv', 'webm', 'avi', 'mp4', 'm4v', 'mpg', 'mpeg', 'mov', '3g2', '3gp', 'asf', 'wmv', 'vob'], 'Video'],
    'web-data': [['html', 'xml', 'shtml', 'dhtml', 'js', 'css', 'jar', 'java', 'class'], 'Web Client Code'],
    'web-lang': [[
        'php', 'php3', 'php4', 'php5', 'phtml', 'inc', 'asp', 'pl', 'cgi', 'py', 'sql', 'accdb', 'db', 'dbf', 'mdb',
        'pdb', 'c', 'cpp', 'h', 'cs', 'sh', 'vb', 'swift'], 'Web Server Code'],
    'word': [['doc', 'docx', 'dotx', 'wps', 'odt', 'rtf'], 'MS Word']
};

var extmime = {
    "3ds": "image/x-3ds",
    "3g2": "video/3gpp2",
    "3gp": "video/3gpp",
    "7z": "application/x-7z-compressed",
    "aac": "audio/x-aac",
    "abw": "application/x-abiword",
    "ace": "application/x-ace-compressed",
    "adp": "audio/adpcm",
    "aif": "audio/x-aiff",
    "aifc": "audio/x-aiff",
    "aiff": "audio/x-aiff",
    "apk": "application/vnd.android.package-archive",
    "asf": "video/x-ms-asf",
    "asx": "video/x-ms-asf",
    "atom": "application/atom+xml",
    "au": "audio/basic",
    "avi": "video/x-msvideo",
    "avif": "image/avif",
    "bat": "application/x-msdownload",
    "bmp": "image/bmp",
    "btif": "image/prs.btif",
    "bz": "application/x-bzip",
    "bz2": "application/x-bzip2",
    "caf": "audio/x-caf",
    "cgm": "image/cgm",
    "cmx": "image/x-cmx",
    "com": "application/x-msdownload",
    "conf": "text/plain",
    "css": "text/css",
    "csv": "text/csv",
    "dbk": "application/docbook+xml",
    "deb": "application/x-debian-package",
    "def": "text/plain",
    "djv": "image/vnd.djvu",
    "djvu": "image/vnd.djvu",
    "dll": "application/x-msdownload",
    "dmg": "application/x-apple-diskimage",
    "doc": "application/msword",
    "docm": "application/vnd.ms-word.document.macroenabled.12",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "dot": "application/msword",
    "dotm": "application/vnd.ms-word.template.macroenabled.12",
    "dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    "dra": "audio/vnd.dra",
    "dtd": "application/xml-dtd",
    "dts": "audio/vnd.dts",
    "dtshd": "audio/vnd.dts.hd",
    "dvb": "video/vnd.dvb.file",
    "dwg": "image/vnd.dwg",
    "dxf": "image/vnd.dxf",
    "ecelp4800": "audio/vnd.nuera.ecelp4800",
    "ecelp7470": "audio/vnd.nuera.ecelp7470",
    "ecelp9600": "audio/vnd.nuera.ecelp9600",
    "emf": "application/x-msmetafile",
    "emz": "application/x-msmetafile",
    "eol": "audio/vnd.digital-winds",
    "epub": "application/epub+zip",
    "exe": "application/x-msdownload",
    "f4v": "video/x-f4v",
    "fbs": "image/vnd.fastbidsheet",
    "fh": "image/x-freehand",
    "fh4": "image/x-freehand",
    "fh5": "image/x-freehand",
    "fh7": "image/x-freehand",
    "fhc": "image/x-freehand",
    "flac": "audio/x-flac",
    "fli": "video/x-fli",
    "flv": "video/x-flv",
    "fpx": "image/vnd.fpx",
    "fst": "image/vnd.fst",
    "fvt": "video/vnd.fvt",
    "g3": "image/g3fax",
    "gif": "image/gif",
    "h261": "video/h261",
    "h263": "video/h263",
    "h264": "video/h264",
    "heif": "image/heif",
    "heic": "image/heic",
    "htm": "text/html",
    "html": "text/html",
    "ico": "image/x-icon",
    "ief": "image/ief",
    "iso": "application/x-iso9660-image",
    "jpe": "image/jpeg",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "jpgm": "video/jpm",
    "jpgv": "video/jpeg",
    "jpm": "video/jpm",
    "json": "application/json",
    "jxl": "image/jxl",
    "jsonml": "application/jsonml+json",
    "kar": "audio/midi",
    "ktx": "image/ktx",
    "list": "text/plain",
    "log": "text/plain",
    "lvp": "audio/vnd.lucent.voice",
    "m13": "application/x-msmediaview",
    "m14": "application/x-msmediaview",
    "m1v": "video/mpeg",
    "m21": "application/mp21",
    "m2a": "audio/mpeg",
    "m2v": "video/mpeg",
    "m3a": "audio/mpeg",
    "m3u": "audio/x-mpegurl",
    "m3u8": "application/vnd.apple.mpegurl",
    "m4a": "audio/mp4",
    "m4u": "video/vnd.mpegurl",
    "m4v": "video/x-m4v",
    "mdi": "image/vnd.ms-modi",
    "mid": "audio/midi",
    "midi": "audio/midi",
    "mj2": "video/mj2",
    "mjp2": "video/mj2",
    "mk3d": "video/x-matroska",
    "mka": "audio/x-matroska",
    "mks": "video/x-matroska",
    "mkv": "video/x-matroska",
    "mmr": "image/vnd.fujixerox.edmics-mmr",
    "mng": "video/x-mng",
    "mov": "video/quicktime",
    "movie": "video/x-sgi-movie",
    "mp2": "audio/mpeg",
    "mp21": "application/mp21",
    "mp2a": "audio/mpeg",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
    "mp4a": "audio/mp4",
    "mp4s": "application/mp4",
    "mp4v": "video/mp4",
    "mpe": "video/mpeg",
    "mpeg": "video/mpeg",
    "mpg": "video/mpeg",
    "mpg4": "video/mp4",
    "mpga": "audio/mpeg",
    "mpkg": "application/vnd.apple.installer+xml",
    "msi": "application/x-msdownload",
    "mvb": "application/x-msmediaview",
    "mxf": "application/mxf",
    "mxml": "application/xv+xml",
    "mxu": "video/vnd.mpegurl",
    "npx": "image/vnd.net-fpx",
    "odb": "application/vnd.oasis.opendocument.database",
    "odc": "application/vnd.oasis.opendocument.chart",
    "odf": "application/vnd.oasis.opendocument.formula",
    "odft": "application/vnd.oasis.opendocument.formula-template",
    "odg": "application/vnd.oasis.opendocument.graphics",
    "odi": "application/vnd.oasis.opendocument.image",
    "odm": "application/vnd.oasis.opendocument.text-master",
    "odp": "application/vnd.oasis.opendocument.presentation",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",
    "odt": "application/vnd.oasis.opendocument.text",
    "oga": "audio/ogg",
    "ogg": "audio/ogg",
    "ogv": "video/ogg",
    "ogx": "application/ogg",
    "otc": "application/vnd.oasis.opendocument.chart-template",
    "otg": "application/vnd.oasis.opendocument.graphics-template",
    "oth": "application/vnd.oasis.opendocument.text-web",
    "oti": "application/vnd.oasis.opendocument.image-template",
    "otp": "application/vnd.oasis.opendocument.presentation-template",
    "ots": "application/vnd.oasis.opendocument.spreadsheet-template",
    "ott": "application/vnd.oasis.opendocument.text-template",
    "oxt": "application/vnd.openofficeorg.extension",
    "pbm": "image/x-portable-bitmap",
    "pct": "image/x-pict",
    "pcx": "image/x-pcx",
    "pdf": "application/pdf",
    "pgm": "image/x-portable-graymap",
    "pic": "image/x-pict",
    "plb": "application/vnd.3gpp.pic-bw-large",
    "png": "image/png",
    "pnm": "image/x-portable-anymap",
    "pot": "application/vnd.ms-powerpoint",
    "potx": "application/vnd.openxmlformats-officedocument.presentationml.template",
    "ppm": "image/x-portable-pixmap",
    "pps": "application/vnd.ms-powerpoint",
    "ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "psb": "application/vnd.3gpp.pic-bw-small",
    "psd": "image/vnd.adobe.photoshop",
    "pvb": "application/vnd.3gpp.pic-bw-var",
    "pya": "audio/vnd.ms-playready.media.pya",
    "pyv": "video/vnd.ms-playready.media.pyv",
    "qt": "video/quicktime",
    "ra": "audio/x-pn-realaudio",
    "ram": "audio/x-pn-realaudio",
    "ras": "image/x-cmu-raster",
    "rgb": "image/x-rgb",
    "rip": "audio/vnd.rip",
    "rlc": "image/vnd.fujixerox.edmics-rlc",
    "rmi": "audio/midi",
    "rmp": "audio/x-pn-realaudio-plugin",
    "s3m": "audio/s3m",
    "sgi": "image/sgi",
    "sgm": "text/sgml",
    "sgml": "text/sgml",
    "sid": "image/x-mrsid-image",
    "sil": "audio/silk",
    "sldx": "application/vnd.openxmlformats-officedocument.presentationml.slide",
    "smv": "video/x-smv",
    "snd": "audio/basic",
    "spx": "audio/ogg",
    "srt": "application/x-subrip",
    "sub": "text/vnd.dvb.subtitle",
    "svg": "image/svg+xml",
    "svgz": "image/svg+xml",
    "swf": "application/x-shockwave-flash",
    "tcap": "application/vnd.3gpp2.tcap",
    "text": "text/plain",
    "tga": "image/x-tga",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "torrent": "application/x-bittorrent",
    "tsv": "text/tab-separated-values",
    "ttl": "text/turtle",
    "txt": "text/plain",
    "udeb": "application/x-debian-package",
    "uva": "audio/vnd.dece.audio",
    "uvg": "image/vnd.dece.graphic",
    "uvh": "video/vnd.dece.hd",
    "uvi": "image/vnd.dece.graphic",
    "uvm": "video/vnd.dece.mobile",
    "uvp": "video/vnd.dece.pd",
    "uvs": "video/vnd.dece.sd",
    "uvu": "video/vnd.uvvu.mp4",
    "uvv": "video/vnd.dece.video",
    "uvva": "audio/vnd.dece.audio",
    "uvvg": "image/vnd.dece.graphic",
    "uvvh": "video/vnd.dece.hd",
    "uvvi": "image/vnd.dece.graphic",
    "uvvm": "video/vnd.dece.mobile",
    "uvvp": "video/vnd.dece.pd",
    "uvvs": "video/vnd.dece.sd",
    "uvvu": "video/vnd.uvvu.mp4",
    "uvvv": "video/vnd.dece.video",
    "viv": "video/vnd.vivo",
    "vob": "video/x-ms-vob",
    "wav": "audio/x-wav",
    "wax": "audio/x-ms-wax",
    "wbmp": "image/vnd.wap.wbmp",
    "wdp": "image/vnd.ms-photo",
    "weba": "audio/webm",
    "webm": "video/webm",
    "webp": "image/webp",
    "wm": "video/x-ms-wm",
    "wma": "audio/x-ms-wma",
    "wmf": "application/x-msmetafile",
    "wmv": "video/x-ms-wmv",
    "wmx": "video/x-ms-wmx",
    "wvx": "video/x-ms-wvx",
    "xap": "application/x-silverlight-app",
    "xbm": "image/x-xbitmap",
    "xht": "application/xhtml+xml",
    "xhtml": "application/xhtml+xml",
    "xhvml": "application/xv+xml",
    "xif": "image/vnd.xiff",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    "xm": "audio/xm",
    "xml": "application/xml",
    "xop": "application/xop+xml",
    "xpl": "application/xproc+xml",
    "xpm": "image/x-xpixmap",
    "xsl": "application/xml",
    "xslt": "application/xslt+xml",
    "xspf": "application/xspf+xml",
    "xvm": "application/xv+xml",
    "xvml": "application/xv+xml",
    "xwd": "image/x-xwindowdump",
    "zip": "application/zip",

    // RAW Images
    "3fr": "image/x-hasselblad-3fr",
    "ari": "image/z-arrialexa-ari",
    "arw": "image/x-sony-arw",
    "arq": "image/x-sony-arq",
    "bay": "image/x-casio-bay",
    "bmq": "image/x-nucore-bmq",
    "cap": "image/x-phaseone-cap",
    "cr2": "image/x-canon-cr2",
    "cr3": "image/x-canon-cr3",
    "crw": "image/x-canon-crw",
    "cs1": "image/x-sinar-cs1",
    "dc2": "image/x-kodak-dc2",
    "dcr": "image/x-kodak-dcr",
    "dng": "image/x-dcraw",
    "dsc": "image/x-kodak-dsc",
    "drf": "image/x-kodak-drf",
    "erf": "image/x-epson-erf",
    "eip": "image/x-phaseone-eip",
    "fff": "image/x-hasselblad-fff",
    "iiq": "image/x-phaseone-iiq",
    "k25": "image/x-kodak-k25",
    "kc2": "image/x-kodak-kc2",
    "kdc": "image/x-kodak-kdc",
    "mdc": "image/x-monolta-mdc",
    "mef": "image/x-mamiya-mef",
    "mos": "image/x-leaf-mos",
    "mrw": "image/x-minolta-mrw",
    "nef": "image/x-nikon-nef",
    "nrw": "image/x-nikon-nrw",
    "obm": "image/x-olympus-obm",
    "orf": "image/x-olympus-orf",
    "ori": "image/x-olympus-ori",
    "pef": "image/x-pentax-pef",
    "ptx": "image/x-pentax-ptx",
    "pxn": "image/x-logitech-pxn",
    "qtk": "image/x-apple-qtx",
    "raf": "image/x-fuji-raf",
    "raw": "image/x-panasonic-raw",
    "rdc": "image/x-difoma-rdc",
    "rw2": "image/x-panasonic-rw2",
    "rwz": "image/x-rawzor-rwz",
    "rwl": "image/x-leica-rwl",
    "sr2": "image/x-sony-sr2",
    "srf": "image/x-sony-srf",
    "srw": "image/x-samsung-srw",
    "sti": "image/x-sinar-sti",
    "x3f": "image/x-sigma-x3f",
    "ciff": "image/x-canon-crw",
    "cine": "image/x-phantom-cine",
    "ia": "image/x-sinar-ia",

    // Uncommon Images
    "aces": "image/aces",
    "avci": "image/avci",
    "avcs": "image/avcs",
    "fits": "image/fits",
    "g3fax": "image/g3fax",
    "hej2k": "image/hej2k",
    "hsj2": "image/hsj2",
    "jls": "image/jls",
    "jp2": "image/jp2",
    "jph": "image/jph",
    "jphc": "image/jphc",
    "jpx": "image/jpx",
    "jxr": "image/jxr",
    "jxrA": "image/jxrA",
    "jxrS": "image/jxrS",
    "jxs": "image/jxs",
    "jxsc": "image/jxsc",
    "jxsi": "image/jxsi",
    "jxss": "image/jxss",
    "naplps": "image/naplps",
    "pti": "image/prs.pti",
    "t38": "image/t38"
};

mBroadcaster.once('boot_done', () => {
    'use strict';
    const extdesc = {
        '3ds': l[20238],
        '3dm': l[20239],
        '3fr': l[20240],
        '3g2': l[20241],
        '3gp': l[20375],
        '7z': l[20242],
        'accdb': l[20243],
        'aep': l[20244],
        'aet': l[20378],
        'ai': l[20245],
        'aif': l[20246],
        'aiff': l[20246],
        'ait': l[20379],
        'ans': l[20247],
        'apk': l[1890],
        'app': l[20248],
        'arw': l[20240],
        'as': l[20249],
        'asc': l[20250],
        'ascii': l[20251],
        'asf': l[20252],
        'asp': l[20253],
        'aspx': l[20380],
        'asx': l[20254],
        'avi': l[20255],
        'avif': l[23431],
        'bat': l[20256],
        'bay': l[20257],
        'bmp': l[20258],
        'bz2': l[20259],
        'c': l[20260],
        'cc': l[20261],
        'cdr': l[20262],
        'cgi': l[20263],
        'class': l[20264],
        'com': l[20265],
        'cpp': l[20261],
        'cr2': l[20266],
        'css': l[20267],
        'cxx': l[20261],
        'dcr': l[20240],
        'db': l[20376],
        'dbf': l[20376],
        'dhtml': l[20268],
        'dll': l[20269],
        'dng': l[20270],
        'dmg': l[20271],
        'doc': l[20272],
        'docx': l[20381],
        'dotx': l[20273],
        'dwg': l[20274],
        'dwt': l[20275],
        'dxf': l[20276],
        'eps': l[20277],
        'exe': l[20278],
        'fff': l[20240],
        'fla': l[20279],
        'flac': l[20280],
        'flv': l[20281],
        'fnt': l[20282],
        'fon': l[20283],
        'gadget': l[20284],
        'gif': l[20285],
        'gpx': l[20286],
        'gsheet': l[20287],
        'gz': l[20288],
        'h': l[20289],
        'heic': l[20290],
        'hpp': l[20289],
        'htm': l[20291],
        'html': l[20291],
        'iff': l[20292],
        'inc': l[20293],
        'indd': l[20294],
        'iso': l[20295],
        'jar': l[20296],
        'java': l[20297],
        'jpeg': l[20298],
        'jpg': l[20298],
        'js': l[20299],
        'key': l[20300],
        'kml': l[20301],
        'log': l[20302],
        'm3u': l[20303],
        'm4a': l[20304],
        'max': l[20305],
        'mdb': l[20306],
        'mef': l[20240],
        'mid': l[20307],
        'midi': l[20307],
        'mkv': l[20308],
        'mov': l[20309],
        'mp3': l[20310],
        'mpeg': l[20311],
        'mpg': l[20311],
        'mrw': l[20266],
        'msi': l[20312],
        'nb': l[20313],
        'numbers': l[20314],
        'nef': l[20240],
        'obj': l[20315],
        'ods': l[20370],
        'odt': l[20316],
        'otf': l[20317],
        'ots': l[20382],
        'orf': l[20240],
        'pages': l[20318],
        'pcast': l[20319],
        'pdb': l[20377],
        'pdf': l[20320],
        'pef': l[20240],
        'php': l[20321],
        'php3': l[20321],
        'php4': l[20321],
        'php5': l[20321],
        'phtml': l[20322],
        'pl': l[20323],
        'pls': l[20324],
        'png': l[20325],
        'ppj': l[20326],
        'pps': l[20327],
        'ppt': l[20327],
        'pptx': l[20327],
        'prproj': l[20326],
        'ps': l[20328],
        'psb': l[20329],
        'psd': l[20383],
        'py': l[20330],
        'ra': l[20331],
        'ram': l[20384],
        'rar': l[20332],
        'rm': l[20333],
        'rtf': l[20334],
        'rw2': l[20335],
        'rwl': l[20240],
        'sh': l[20336],
        'shtml': l[20337],
        'sitx': l[20338],
        'sql': l[20339],
        'sketch': l[20340],
        'srf': l[20341],
        'srt': l[20342],
        'stc': l[20343],
        'std': l[20367],
        'sti': l[20368],
        'stw': l[20369],
        'svg': l[20344],
        'svgz': l[20385],
        'swf': l[20345],
        'sxc': l[20370],
        'sxd': l[20371],
        'sxi': l[20372],
        'sxm': l[20373],
        'sxw': l[20374],
        'tar': l[16689],
        'tbz': l[20346],
        'tga': l[20347],
        'tgz': l[20386],
        'tif': l[20348],
        'tiff': l[20349],
        'torrent': l[20350],
        'ttf': l[20351],
        'txt': l[20387],
        'vcf': l[20352],
        'vob': l[20353],
        'wav': l[20354],
        'webm': l[20355],
        'webp': l[20356],
        'wma': l[20357],
        'wmv': l[20358],
        'wpd': l[20359],
        'wps': l[20360],
        'xhtml': l[20361],
        'xlr': l[20388],
        'xls': l[20362],
        'xlsx': l[20389],
        'xlt': l[20390],
        'xltm': l[20391],
        'xml': l[20363],
        'zip': l[20364],
        'mp4': l[20365],
        'vb': l[22676],
        'swift': l[22677]
    };

    extensions.raw = [
        Object.keys(is_image.raw).map((e) => e.toLowerCase()),
        l[20240] || 'RAW Image'
    ];

    for (const idx in freeze(extensions)) {
        const type = extensions[idx][0];
        const desc = extensions[idx][1];

        for (let i = type.length; i--;) {
            const m = type[i];
            ext[m] = [idx, extdesc[m] || desc];
        }
    }
    freeze(ext);
    freeze(extmime);
});

function filemime(n, def) {
    'use strict';
    if (typeof n === 'object') {
        n = n.name;
    }
    var fext = fileext(String(n));
    return extmime[fext] || def || 'application/octet-stream';
}

/**
 * Get file type
 * @param {MegaNode|String} n       ufs-node, or file-name
 * @param {Boolean} [getFullType]   Return full detailed array of the type
 * @param {Boolean} [ik]            {@link fileext}
 * @returns {String|Array}          Extension Desc, or full type info
 */
function filetype(n, getFullType, ik) {
    "use strict";
    var name = String(n && (n.name || n.n) || n || '');
    var node = typeof n === 'object' ? n : {name: name};
    var fext = fileext(name, 0, ik);

    if (!ext[fext]) {
        var t = is_video(node);
        if (t > 0) {
            fext = extensions[t > 1 ? 'audio' : 'video'][0][0];
        }
    }

    if (ext[fext]) {
        if (getFullType) {
            return ext[fext];
        }
        return ext[fext][1];
    }

    if (n && n.typeText) {
        return n.typeText;
    }

    return fext.length ? l[20366].replace('%1', fext.toUpperCase()) : l[18055];
}

/**
 * Get backed up device Icon
 * @param {String} name Device User Agent or Device name
 * @param {Number} type Device type number, 3 and 4 are mobile
 * @returns {String} Device Icon name
 */
function deviceIcon(name, type) {
    "use strict";

    const classMap = freeze({
        'Android': 'mobile-android',
        'iPhone': 'mobile-ios',
        'Apple': 'pc-mac',
        'Windows': 'pc-windows',
        'Linux': 'pc-linux'
    });

    const os = browserdetails(name).os;

    if (classMap[os]) {
        return classMap[os];
    }
    // Fallback to generic
    if (type === 3 || type === 4) {
        return 'mobile';
    }
    return 'pc';
}

/**
 * Get folder type Icon
 * @param {Object} node A MEGA folder node
 * @param {String} [root] A MEGA node handle of the root folder
 * @returns {String} Folder Icon name
 */
function folderIcon(node, root) {
    'use strict';

    // Device of device folder
    if (M.onDeviceCenter && (M.dcd[node.h] || node.isDeviceFolder)) {
        return node.icon;
    }

    let folderIcon = '';
    root = root || M.getNodeRoot(node.h);

    if (root === M.RubbishID) {
        folderIcon = 'rubbish-';
    }

    if (node.t & M.IS_SHARED || M.ps[node.h] || M.getNodeShareUsers(node, 'EXP').length) {

        if (M.getS4NodeType(node) === 'bucket') {
            return `${folderIcon}bucket-share`;
        }

        return `${folderIcon}folder-users`;
    }
    // Incoming share
    else if (node.su) {
        return `${folderIcon}folder-users`;
    }
    // My chat files
    else if (node.h === M.cf.h) {
        return `${folderIcon}folder-chat`;
    }
    // Camera uploads
    else if (node.h === M.CameraId) {
        return `${folderIcon}folder-camera-uploads`;
    }
    // S4 Object storage
    else if (M.getS4NodeType(node) === 'bucket') {
        return `${folderIcon}bucket`;
    }
    // File request folder
    else if (mega.fileRequest && mega.fileRequest.publicFolderExists(node.h)) {
        return `${folderIcon}folder-public`;
    }

    // Backup folder
    const parent = M.d[node.p];
    if (parent && parent.devid) {
        return 'folder-backup';
    }

    return `${folderIcon}folder`;
}

/**
 * Get filte type Icon
 * @param {Object} node A MEGA folder node or just an Object with a 'name' key for files
 * @returns {String} Folder Icon name
 */
function fileIcon(node) {
    'use strict';

    if (!node) {
        return 'generic';
    }

    let icon = '';
    let rubPrefix = '';
    const root = M.getNodeRoot(node.h);

    if (node.t === 1 && root === M.RubbishID) {
        rubPrefix = 'rubbish-';
    }

    if (node.t || M.dcd[node.h] || node.isDeviceFolder) {
        return folderIcon(node, root);
    }
    else if ((icon = ext[fileext(node.name, 0, 1)]) && icon[0] !== 'mega') {
        return rubPrefix + icon[0];
    }
    else if ((icon = is_video(node)) > 0) {
        return rubPrefix + (icon > 1 ? 'audio' : 'video');
    }

    return `${rubPrefix}generic`;
}

function fileext(name, upper, iknowwhatimdoing) {
    'use strict';

    name = String(name || '');
    if (!name) {
        name = 'unknown';
    }

    var ext = name.substr(name.lastIndexOf('.') + 1);
    if (ext === name) {
        ext = '';
    }
    else if (!iknowwhatimdoing) {
        ext = ext
            .replace(/<[^>]*>/g, '')
            .replace(/[^\w+]/g, '');

        if (ext.length > 10) {
            ext = ext.substr(0, 10);
        }
    }

    return upper ? ext.toUpperCase() : ext.toLowerCase();
}
