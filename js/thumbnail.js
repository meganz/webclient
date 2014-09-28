

function createnodethumbnail(node,aes,id,imagedata,onPreviewRetry)
{	
	storedattr[id] = {};
	storedattr[id] = { target : node };
	createthumbnail(false,aes,id,imagedata,node,onPreviewRetry);
}



function createthumbnail(file,aes,id,imagedata,node,onPreviewRetry)
{
	if (myURL)
	{
		var img = new Image();
		img.id = id;
		img.aes = aes;
		img.onload = function ()
		{
			var t = new Date().getTime();
			var n = M.d[node];
			var fa = '' + (n && n.fa);
					
			// thumbnail:
			if (fa.indexOf(':0*') < 0)
			{
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
				
				api_storefileattr(this.id,0,this.aes.c[0].slice(0,4),ab.buffer); // FIXME hack into cipher and extract key			
			}		
			
			// preview image:			
			if (fa.indexOf(':1*') < 0 || onPreviewRetry)
			{			
				var canvas2 = document.createElement('canvas');
				var preview_x=this.width,preview_y=this.height;
				if (preview_x > 1000)
				{					
					preview_y=Math.round(preview_y*1000/preview_x);
					preview_x=1000;
				}
				else if (preview_y > 1000)
				{					
					preview_x=Math.round(preview_x*1000/preview_y);
					preview_y=1000;
				}				
				var ctx2 = canvas2.getContext("2d");
				canvas2.width  = preview_x;
				canvas2.height = preview_y;			
				ctx2.drawImage(this, 0, 0, preview_x, preview_y);
				
				var dataURI2 = canvas2.toDataURL('image/jpeg',0.85);						
				
				var ab2 = dataURLToAB(dataURI2);
				
				// only store preview when the user is the file owner, and when it's not a retry (because then there is already a preview image, it's just unavailable:
				
				if (!onPreviewRetry && (!n || n.u == u_handle) && fa.indexOf(':1*') < 0)
				{
					if (d) console.log('Storing preview...', n);
					api_storefileattr(this.id,1,this.aes.c[0].slice(0,4),ab2.buffer); // FIXME hack into cipher and extract key				
				}
				
				if (node) previewimg(node,ab2);
				
				if (d) console.log('total time:', new Date().getTime()-t);
			}
		};
		try
		{
			if (typeof FileReader !== 'undefined')
			{
				var ThumbFR = new FileReader();
				ThumbFR.onload = function(e)
				{
					if (ThumbFR.ab) var thumbstr = ab_to_str(ThumbFR.result);
					else var thumbstr = e.target.result;
					img.exif = EXIF.getImageData(new BinaryFile(thumbstr));
					if (file) var mpImg = new MegaPixImage(file);
					else var mpImg = new MegaPixImage(thumbnailBlob);
					var orientation = 1;
					if (img.exif.Orientation) orientation = img.exif.Orientation;
					mpImg.render(img, { maxWidth: 1000, maxHeight: 1000, quality: 0.8, orientation: orientation });
				}
				if (file)
				{
					if(is_chrome_firefox && "blob" in file)
					{
						if (file.size > 2e6) try
						{
							return OS.File.read(file.mozFile.path).then(function(u8)
							{
								file = new Blob([u8],{type:file.type});
								ThumbFR.onload({target:{result:mozAB2S(u8)}});
							}).then(null,function(e)
							{
								console.error(e);
								if (!(file instanceof Blob)) file=file.blob();
								ThumbFR.readAsBinaryString(file);
							});
						} catch(e) {}

						file = file.blob();
					}

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


var ba_images=[],ba_time=0,ba_id=0,ba_result=[];

function benchmarki()
{
	var a=0;	
	ba_images=[];	
	for (var i in M.d)
	{
		if (M.d[i].name && is_image(M.d[i].name) && M.d[i].fa)
		{	
			ba_images.push(M.d[i]);
		}
		else a++;
	}
	console.log('found ' + ba_images.length + ' images with file attr ('+a+' don\'t have file attributes)');
	
	ba_images = shuffle(ba_images);
	
	ba_result['success']=0;
	ba_result['error']=0;
	
	benchmarkireq();
}

function shuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex
    ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function benchmarkireq()
{
	ba_time = new Date().getTime();

	function eot(id, err)
	{
		for (var i in ba_images)
		{
			if (ba_images[i].h == id)
			{		
				ba_result['error']++;				
				console.log('error',new Date().getTime()-ba_time,err);
				console.log(ba_images[i].fa);
				ba_id++;
				benchmarkireq();
			}		
		}
	}
	eot.timeout = 5100;

	var n = ba_images[ba_id];	
	if (n)
	{
		var treq = {};
		treq[n.h] = {fa:n.fa,k:n.key};
		api_getfileattr(treq,1,function(ctx,id,uint8arr)
		{
			for (var i in ba_images)
			{
				if (ba_images[i].h == id)
				{
					ba_result['success']++;					
					console.log('success',uint8arr.length,new Date().getTime()-ba_time);
					ba_id++;
					benchmarkireq();
					
					previewsrc(myURL.createObjectURL(new Blob([uint8arr],{ type: 'image/jpeg' })));
				}		
			}
		},eot);
	}
	else 
	{
		console.log('ready');
	}

}

