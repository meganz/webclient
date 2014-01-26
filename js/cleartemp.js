function clearit(storagetype,t,callback)
{
	var tsec = 86400;	
	if (t) tsec = t;
	function errorHandler2(e) 
	{
	 if (d) console.error('error',e);
	}
	function toArray(list) 
	{
	  return Array.prototype.slice.call(list || [], 0);
	}	
	function readentry()
	{
		if (entries.length == 0)
		{
			if (callback) callback(0);
		}
		else if (i < entries.length)
		{
			var file = entries[i];
			if (file.isFile)
			{				
				file.getMetadata(function(metadata)
				{	
					// do not delete file while it's being copied from FS to DL folder
					// conservative assumption that a file is being written at 1024 bytes per ms					
					// add 100000 ms margin	
					
					var deltime = metadata.modificationTime.getTime()+tsec*1000+metadata.size/1024+100000;
					
					if (deltime < new Date().getTime() && deltime < lastactive)
					{						
						file.remove(function() 
						{ 
							totalsize += metadata.size;
							if (d) console.log('temp file removed');
							del++;
							if (del == entries.length && callback) callback(totalsize);							
						}, 
						function() 
						{ 
							if (d) console.log('temp file removal failed');
							del++;
							if (del == entries.length && callback) callback(totalsize);							
						});
					}
					else
					{
						if (d) console.log('tmp file too new to remove');
						del++;
						if (del == entries.length && callback) callback(totalsize);
					}
				});
			}	
			i++;
			readentry();			
		}
	}
	function onInitFs(fs) 
	{
	   fs.root.getDirectory('mega', {}, function(dirEntry)
	   {
		  var dirReader = dirEntry.createReader();	 
		  var readEntries = function() 
		  {
			 dirReader.readEntries (function(results) 
			 {
				if (!results.length) 
				{
					readentry();
				} 
				else 
				{
					entries = entries.concat(toArray(results));
					readEntries();
				}	
			}, 
			function(e) 
			{ 
				if (callback) callback(0); 
			});
		  };
		  readEntries();		  
	 },
	 function(e) 
	 { 
		if (callback) callback(0); 
	 });
	}
	var i = 0;
	var del = 0;
	var entries = [];
	var totalsize = 0;
	if (window.webkitRequestFileSystem) window.webkitRequestFileSystem(storagetype, 1024*1024, onInitFs, function(e) 
	{ 
		if (callback) callback(0);
	});	
}