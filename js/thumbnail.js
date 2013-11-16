



function createnodethumbnail(node,aes,id,imagedata)
{
	storedattr[id] = { target : node };	
	createthumbnail(false,aes,id,imagedata,node);
}

var ab;

function createthumbnail(file,aes,id,imagedata,node)
{
	if (myURL)
	{
		var img = new Image();    
		img.id = id;
		img.aes = aes;
		img.onload = function () 
		{	
			var t = new Date().getTime();
			var canvas = document.createElement('canvas');
			var sx=0;
			var sy=0;
			var x = this.width;
			var y = this.height;
			if (d) console.log(x + ' by ' + y);			
			if (this.width > this.height)
			{
				if (d) console.log('landscape');
				sx = Math.floor((this.width - this.height)/2);
				x = y;
			}
			else if(this.height > this.width)
			{
				if (d) console.log('portrait');
				sy = Math.floor((this.height - this.width)*0.66/2);
				y = x;
			}				
			else
			{
				if (d) console.log('square');
			}
			var ctx = canvas.getContext("2d");
			canvas.width  = 120;
			canvas.height = 120;	
			ctx.drawImage(this, sx, sy, x, y, 0, 0, 120, 120);		
			if (d) console.log('resizing time:', new Date().getTime()-t);
			myURL.revokeObjectURL(this.src);
			var dataURI = canvas.toDataURL('image/jpeg',0.85);
			var ab = dataURLToAB(dataURI);
			api_storefileattr(this.id,0,this.aes,ab.buffer);
			if (d) console.log('total time:', new Date().getTime()-t);			
		};			
		try
		{
			if (typeof FileReader !== 'undefined')
			{			
				ThumbFR = new FileReader();
				ThumbFR.onload = function(e) 
				{			
					if (ThumbFR.ab) var thumbstr = ab_to_str(ThumbFR.result);					
					else var thumbstr = e.target.result;					
					img.exif = EXIF.getImageData(new BinaryFile(thumbstr));
					if (file) var mpImg = new MegaPixImage(file);
					else var mpImg = new MegaPixImage(thumbnailBlob);
					var orientation = 1;
					if (img.exif.Orientation) orientation = img.exif.Orientation;						
					mpImg.render(img, { maxWidth: 500, maxHeight: 500, quality: 0.8, orientation: orientation });
				}
				if (file)
				{
					if (ThumbFR.readAsBinaryString) ThumbFR.readAsBinaryString(file);
					else 
					{
						ThumbFR.ab=1;
						ThumbFR.readAsArrayBuffer(file);
					}					
				}
				else
				{
					var thumbnailBlob = new Blob([new Uint8Array(imagedata)],{ type: 'image/jpeg' });					
					if (ThumbFR.readAsBinaryString) ThumbFR.readAsBinaryString(thumbnailBlob);									
					else
					{
						ThumbFR.ab=1;
						ThumbFR.readAsArrayBuffer(thumbnailBlob);
					}
				}
			}
		}
		catch(e) { console.log('thumbnail error', e) }
	}  	
}




function dataURLToAB(dataURL) 
{
    if (dataURL.indexOf(';base64,') == -1) 
	{
      var parts = dataURL.split(',');
      var contentType = parts[0].split(':')[1];
      var raw = parts[1];
    }
	else
	{
		var parts = dataURL.split(';base64,');
		var contentType = parts[0].split(':')[1];
		var raw = window.atob(parts[1]);
	}
    var rawLength = raw.length;
    var uInt8Array = new Uint8Array(((rawLength+15)&-16));
    for (var i = 0; i < rawLength; ++i)  uInt8Array[i] = raw.charCodeAt(i); 

	return uInt8Array;
}
