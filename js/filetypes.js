var ext = {};
var extensions = 
{
	'3D.png': [['3ds','3dm','max','obj'],'3D'],
	'aftereffects.png': [['aep','aet'],'Adobe Aftereffects'],
	'audio.png': [['mp3','wav','3ga','aif','aiff','flac','iff','m4a','wma'],'Audio'],
	'cad.png': [['dxf','dwg'],'CAD'],
	'compressed.png': [['zip','rar','tgz','gz','bz2','tbz','tar','7z','sitx'],'Compressed'],
	'database.png': [['sql','accdb','db','dbf','mdb','pdb'],'Database'],
	'dreamweaver.png': [['dwt'],'Database'],
	'excel.png': [['xls','xlsx','xlt','xltm'],'Excel'],
	'executable.png': [['exe','com','bin','apk','app','msi','cmd','gadget'],'Executable'],
	'fla_lang.png': [['as','ascs','asc'],'ActionScript'],
	'flash.png': [['fla'],'Flash'],
	'font.png': [['fnt','otf','ttf','fon'],'Font'],
	'generic.png': [['*'],'File'],
	'GIS.png': [['gpx','kml','kmz'],'GPS File'],
	'graphic.png': [['gif','tiff','tif','bmp','png','tga'],'Image'],
	'html.png': [['html','htm','dhtml','xhtml'],'HTML'],
	'Illustrator.png': [['ai','ait'],'Adobe Illustrator'],
	'image.png': [['jpg','jpeg'],'Image'],
	'indesign.png': [['indd'],'Adobe InDesign'],
	'java.png': [['jar','java','class'],'Java'],
	'midi.png': [['mid','midi'],'Midi'],
	'pdf.png': [['pdf'],'PDF'],
	'photoshop.png': [['abr','psb','psd'],'Adobe Photoshop'],
	'playlist.png': [['pls','m3u','asx'],'Playlist'],
	'podcast.png': [['pcast'],'Podcast'],
	'powerpoint.png': [['pps','ppt','pptx'],'Powerpoint'],
	'Premiere.png': [['prproj','ppj'],'Adobe Premiere'],
	'raw.png': [['3fr','arw','bay','cr2','dcr','dng','fff','mef','mrw','nef','pef','rw2','srf','orf','rwl'],'RAW'],
	'real_audio.png': [['rm','ra','ram'],'Real Audio'],
	'sourcecode.png': [['sh','c','cc','cpp','cxx','h','hpp','dll'],'Source code'],
	'spreadsheet.png': [['ods','ots','gsheet','nb','xlr','numbers'],'Spreadsheet'],
	'swf.png': [['swf'],'SWF'],
	'torrent.png': [['torrent'],'Torrent'],
	'text.png': [['txt','rtf','ans','ascii','log','odt','wpd'],'Text','pages'],
	'vcard.png': [['vcf'],'Vcard'],
	'vector.png': [['svgz','svg','cdr','eps'],'Vector'],
	'video.png': [['mkv','webm','avi','mp4','m4v','mpg','mpeg','mov','3g2','3gp','asf','wmv'],'Video'],
	'flash_video.png': [['flv'],'Flash Video'],
	'video_subtitle.png': [['srt'],'Subtitle'],
	'web_data.png': [['html','xml','shtml','dhtml','js','css'],'Web Client Code'],
	'web_lang.png': [['php','php3','php4','php5','phtml','inc','asp','pl','cgi','py'],'Web Server Code'],
	'word.png': [['doc','docx','dotx','wps'],'MS Word']
};

var extdesc = 
{
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
}

for (var i in extensions)
{
	for (var a in extensions[i][0])
	{
		var desc = extensions[i][1];
		if (extdesc[extensions[i][0][a]]) desc = extdesc[extensions[i][0][a]];
		ext[extensions[i][0][a]] = [i,desc];
	}
}

function filetype(n)
{
	if (ext[fileext(n)]) return ext[fileext(n)][1];
	else return 'File';
}
 
function fileicon(n,s)
{	
	var ico,size;	
	var name = n.name;	
	if (s == 's') size = 'small';
	else if (s == 'm') size = 'medium';
	else if (s == 'l') size = 'large';
	else if (s == 'd') size = 'drag';
	else size = 'medium';	
	if (n.t && n.shares) ico = 'folder_shared.png';
	else if (n.t) ico = 'folder.png';
	else if (ext[fileext(n.name)]) ico = ext[fileext(n.name)][0];
	else ico = 'generic.png';
	var iconurl = staticpath + 'images/mega/icons/regular/' + size + '_' + ico;				
	if (window.devicePixelRatio > 1) iconurl = iconurl.replace('/regular/','/retina/').replace('.png','@2x.png');
	return iconurl;
}



function fileext(name)
{	
	if (!name) name = 'unknown';	
	var ext = name.substr(name.lastIndexOf('.') + 1);	
	if (ext == name) ext = '';	
	return ext.toLowerCase();	
	return name;
}