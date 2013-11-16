function clearit(storagetype,t)
{
	var tsec = 86400;
	
	if (t) tsec = t;

	function errorHandler2(e) 
	{
	  //console.log('Error',e);
	  //console.log(e);
	}
	function toArray(list) 
	{
	  return Array.prototype.slice.call(list || [], 0);
	}	
	function readentry()
	{	
	
		if (i < entries.length)
		{
			var file = entries[i];
			if (file.isFile)
			{			
				
				file.getMetadata(function(metadata)
				{		
					if ((metadata.modificationTime.getTime()+tsec*1000) < (new Date().getTime()))
					{				
						file.remove(function() { if (d) console.log('temp file removed') }, function() { if (d) console.log('temp file removal failed') });
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
			}, errorHandler2);
		  };
		  readEntries(); // Start reading dirs.
		  
	 }, errorHandler2);
	}
	var i = 0;
	var entries = [];	
	if (window.webkitRequestFileSystem) window.webkitRequestFileSystem(storagetype, 1024*1024, onInitFs, errorHandler2);	
}