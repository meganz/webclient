var ext = {};
var extensions = {
    'threed': [['3ds', '3dm', 'max', 'obj'], '3D'],
    'aftereffects': [['aep', 'aet'], 'Adobe Aftereffects'],
    'audio': [['mp3', 'wav', '3ga', 'aif', 'aiff', 'flac', 'iff', 'm4a', 'wma'], 'Audio'],
    'cad': [['dxf', 'dwg'], 'CAD'],
    'compressed': [['zip', 'rar', 'tgz', 'gz', 'bz2', 'tbz', 'tar', '7z', 'sitx'], 'Compressed'],
    'database': [['sql', 'accdb', 'db', 'dbf', 'mdb', 'pdb'], 'Database'],
    'dreamweaver': [['dwt'], 'Database'],
    'excel': [['xls', 'xlsx', 'xlt', 'xltm'], 'Excel'],
    'executable': [['exe', 'com', 'bin', 'apk', 'app', 'msi', 'cmd', 'gadget'], 'Executable'],
    'fla-lang': [['as', 'ascs', 'asc'], 'ActionScript'],
    'flash': [['fla'], 'Flash'],
    'font': [['fnt', 'otf', 'ttf', 'fon'], 'Font'],
    'generic': [['*'], 'File'],
    'gis': [['gpx', 'kml', 'kmz'], 'GPS File'],
    'graphic': [['gif', 'tiff', 'tif', 'bmp', 'png', 'tga'], 'Image'],
    'html': [['html', 'htm', 'dhtml', 'xhtml'], 'HTML'],
    'illustrator': [['ai', 'ait'], 'Adobe Illustrator'],
    'image': [['jpg', 'jpeg'], 'Image'],
    'indesign': [['indd'], 'Adobe InDesign'],
    'java': [['jar', 'java', 'class'], 'Java'],
    'midi': [['mid', 'midi'], 'Midi'],
    'pdf': [['pdf'], 'PDF'],
    'photoshop': [['abr', 'psb', 'psd'], 'Adobe Photoshop'],
    'playlist': [['pls', 'm3u', 'asx'], 'Playlist'],
    'podcast': [['pcast'], 'Podcast'],
    'powerpoint': [['pps', 'ppt', 'pptx'], 'Powerpoint'],
    'premiere': [['prproj', 'ppj'], 'Adobe Premiere'],
    'raw': [['3fr', 'arw', 'bay', 'cr2', 'dcr', 'dng', 'fff', 'mef', 'mrw', 'nef', 'pef', 'rw2', 'srf', 'orf', 'rwl'], 'RAW'],
    'real-audio': [['rm', 'ra', 'ram'], 'Real Audio'],
    'sourcecode': [['sh', 'c', 'cc', 'cpp', 'cxx', 'h', 'hpp', 'dll', 'iso'], 'Source code'],
    'spreadsheet': [['ods', 'ots', 'gsheet', 'nb', 'xlr', 'numbers'], 'Spreadsheet'],
    'swf': [['swf'], 'SWF'],
    'torrent': [['torrent'], 'Torrent'],
    'text': [['txt', 'rtf', 'ans', 'ascii', 'log', 'odt', 'wpd'], 'Text', 'pages'],
    'vcard': [['vcf'], 'Vcard'],
    'vector': [['svgz', 'svg', 'cdr', 'eps'], 'Vector'],
    'video': [['mkv', 'webm', 'avi', 'mp4', 'm4v', 'mpg', 'mpeg', 'mov', '3g2', '3gp', 'asf', 'wmv'], 'Video'],
    'flash-video': [['flv'], 'Flash Video'],
    'video-subtitle': [['srt'], 'Subtitle'],
    'web-data': [['html', 'xml', 'shtml', 'dhtml', 'js', 'css'], 'Web Client Code'],
    'web-lang': [['php', 'php3', 'php4', 'php5', 'phtml', 'inc', 'asp', 'pl', 'cgi', 'py'], 'Web Server Code'],
    'word': [['doc', 'docx', 'dotx', 'wps'], 'MS Word']
};

var extdesc = {
    '3ds': '3D Scene',
    '3dm': '3D Model',
    '3fr': 'RAW Image',
    '3g2': 'Multimedia',
    '3gp': '3D Model',
    '7z': '7-Zip Compressed',
    'accdb': 'Database',
    'aep': 'After Effects',
    'aet': 'After Effects',
    'ai': 'Illustrator',
    'aif': 'Audio Interchange',
    'aiff': 'Audio Interchange',
    'ait': 'Illustrator',
    'ans': 'ANSI Text File',
    'apk': 'Android App',
    'app': 'Mac OSX App',
    'arw': 'RAW Image',
    'as': 'ActionScript',
    'asc': 'ActionScript Com',
    'ascii': 'ASCII Text',
    'asf': 'Streaming Video',
    'asp': 'Active Server',
    'aspx': 'Active Server',
    'asx': 'Advanced Stream',
    'avi': 'A/V Interleave',
    'bat': 'DOS Batch',
    'bay': 'Casio RAW Image',
    'bmp': 'Bitmap Image',
    'bz2': 'UNIX Compressed',
    'c': 'C/C++ Source Code',
    'cc': 'C++ Source Code',
    'cdr': 'CorelDRAW Image',
    'cgi': 'CGI Script',
    'class': 'Java Class',
    'com': 'DOS Command',
    'cpp': 'C++ Source Code',
    'cr2': 'Raw Image',
    'css': 'CSS Style Sheet',
    'cxx': 'C++ Source Code',
    'dcr': 'RAW Image',
    'db': 'Database',
    'dbf': 'Database',
    'dhtml': 'Dynamic HTML',
    'dll': 'Dynamic Link Library',
    'dng': 'Digital Negative',
    'doc': 'MS Word',
    'docx': 'MS Word',
    'dotx': 'MS Word Template',
    'dwg': 'Drawing DB File',
    'dwt': 'Dreamweaver',
    'dxf': 'DXF Image',
    'eps': 'EPS Image',
    'exe': 'Executable',
    'fff': 'RAW Image',
    'fla': 'Adobe Flash',
    'flac': 'Lossless Audio',
    'flv': 'Flash Video',
    'fnt': 'Windows Font',
    'fon': 'Font',
    'gadget': 'Windows Gadget',
    'gif': 'GIF Image',
    'gpx': 'GPS Exchange',
    'gsheet': 'Spreadsheet',
    'gz': 'Gnu Compressed',
    'h': 'Header',
    'hpp': 'Header',
    'hpp': 'Header',
    'htm': 'HTML Document',
    'html': 'HTML Document',
    'iff': 'Interchange',
    'inc': 'Include',
    'indd': 'Adobe InDesign',
    'iso': 'ISO Image',
    'jar': 'Java Archive',
    'java': 'Java Code',
    'jpeg': 'JPEG Image',
    'jpg': 'JPEG Image',
    'js': 'JavaScript',
    'kml': 'Keyhole Markup',
    'kml': 'Google Earth',
    'log': 'Log',
    'm3u': 'Media Playlist',
    'm4a': 'MPEG-4 Audio',
    'max': '3ds Max Scene',
    'mdb': 'MS Access',
    'mef': 'RAW Image',
    'mid': 'MIDI Audio',
    'midi': 'MIDI Audio',
    'mkv': 'MKV Video',
    'mov': 'QuickTime Movie',
    'mp3': 'MP3 Audio',
    'mpeg': 'MPEG Movie',
    'mpg': 'MPEG Movie',
    'mrw': 'Raw Image',
    'msi': 'MS Installer',
    'nb': 'Mathematica',
    'numbers': 'Numbers',
    'nef': 'RAW Image',
    'obj': 'Wavefront',
    'ods': 'Spreadsheet',
    'odt': 'Text Document',
    'otf': 'OpenType Font',
    'ots': 'Spreadsheet',
    'orf': 'RAW Image',
    'pages': 'Pages Doc',
    'pcast': 'Podcast',
    'pdb': 'Database',
    'pdf': 'PDF Document',
    'pef': 'RAW Image',
    'php': 'PHP Code',
    'php3': 'PHP Code',
    'php4': 'PHP Code',
    'php5': 'PHP Code',
    'phtml': 'PHTML Web',
    'pl': 'Perl Script',
    'pls': 'Audio Playlist',
    'png': 'PNG Image',
    'ppj': 'Adobe Premiere',
    'pps': 'MS PowerPoint',
    'ppt': 'MS PowerPoint',
    'pptx': 'MS PowerPoint',
    'prproj': 'Adobe Premiere',
    'ps': 'PostScript',
    'psb': 'Photoshop',
    'psd': 'Photoshop',
    'py': 'Python Script',
    'ra': 'Real Audio',
    'ram': 'Real Audio',
    'rar': 'RAR Compressed',
    'rm': 'Real Media',
    'rtf': 'Rich Text',
    'rw2': 'RAW',
    'rwl': 'RAW Image',
    'sh': 'Bash Shell',
    'shtml': 'Server HTML',
    'sitx': 'X Compressed',
    'sql': 'SQL Database',
    'srf': 'Sony RAW Image',
    'srt': 'Subtitle',
    'svg': 'Vector Image',
    'svgz': 'Vector Image',
    'swf': 'Flash Movie',
    'tar': 'Archive',
    'tbz': 'Compressed',
    'tga': 'Targa Graphic',
    'tgz': 'Compressed',
    'tif': 'TIF Image',
    'tiff': 'TIFF Image',
    'torrent': 'Torrent',
    'ttf': 'TrueType Font',
    'txt': 'Text Document',
    'vcf': 'vCard',
    'wav': 'Wave Audio',
    'webm': 'WebM Video',
    'wma': 'WM Audio',
    'wmv': 'WM Video',
    'wpd': 'WordPerfect',
    'wps': 'MS Works',
    'xhtml': 'XHTML Web',
    'xlr': 'MS Works',
    'xls': 'MS Excel',
    'xlsx': 'MS Excel',
    'xlt': 'MS Excel',
    'xltm': 'MS Excel',
    'xml': 'XML Document',
    'zip': 'ZIP Archive',
    'mp4': 'MP4 Video'
};

for (var i in extensions) {
    for (var a in extensions[i][0]) {
        var desc = extensions[i][1];
        if (extdesc[extensions[i][0][a]]) {
            desc = extdesc[extensions[i][0][a]];
        }
        ext[extensions[i][0][a]] = [i, desc];
    }
}

function filetype(n) {
    if (typeof n === 'object') {
        n = n.name;
    }
    var fext = fileext(String(n));
    if (ext[fext]) {
        return ext[fext][1];
    }
    else if (fext && fext.length > 1) {
        return fext.toUpperCase() + ' File';
    }
    else {
        return 'File';
    }
}

function fileIcon(nodeInfo) {
    var icon;

    if ((nodeInfo.t && nodeInfo.share) || (typeof nodeInfo.r === "number") || (nodeInfo.h && M.ps[nodeInfo.h])) {
        icon = 'folder-shared';
    }
    else if (nodeInfo.t) {
        icon = 'folder';
    }
    else if (ext[fileext(nodeInfo.name)]) {
        icon = ext[fileext(nodeInfo.name)][0];
    }
    else {
        icon = 'generic';
    }

    return icon;
}

function fileext(name) {
    if (!name) {
        name = 'unknown';
    }
    var ext = name.substr(name.lastIndexOf('.') + 1);
    if (ext == name) {
        ext = '';
    }
    return ext.toLowerCase();
}
