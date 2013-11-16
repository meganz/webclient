function FileDragHover(e) 
{
	console.log('hover',$.dragging);
	if (folderlink) return false;	
	$.dragging=new Date().getTime();	
	e.stopPropagation();
	e.preventDefault();	
	if (document.getElementById('start_uploadbutton')) document.getElementById('start_uploadbutton').style.display = 'none';
	if (!$.ddhelper) 
	{					
		var filecnt=0;			
		if (e && e.target && e.target.files)
		{
			var files = e.target.files || e.dataTransfer.files;	
			for (var i in files) filecnt++;
		}		
		else if (e && e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].webkitGetAsEntry)
		{	
			var items = e.dataTransfer.items;			
			for (var i in items) if (items[i].kind) filecnt++;				
		}
		else if (e && e.dataTransfer && e.dataTransfer.files)
		{
			var files = e.dataTransfer.files;
			for (var i in files) filecnt++;
		}
		else if (e && e.dataTransfer && e.dataTransfer.mozItemCount) filecnt = e.dataTransfer.mozItemCount;
		else filecnt=1;			
		if (filecnt > 0) $.ddhelper = getDDhelper();
		if (filecnt > 1)
		{
			$('.dragger-files-number').text(filecnt);
			$('.dragger-files-number').show();			
		}
	}	
	if ($.ddhelper)
	{			
		$('#draghelper .dragger-icon').remove();			
		$('<div class="dragger-icon" style="background-image:url('+ fileicon({name:''},'d') +');"></div>').insertAfter('#draghelper .dragger-status');
		$('.dragger-icon.fade').fadeTo(500, 0.1);
		$($.ddhelper).css({left: (e.pageX+35 + "px"),top: (e.pageY-5 + "px")});
		$('.dragger-block').removeClass('move copy warning drag');
		$('.dragger-block').addClass('copy');
	}	
	if (page == 'start')
	{
		$('.st-main-cursor,.st-main-info').fadeOut(30);
		start_over();
	}
}

function FileDragLeave(e)
{
	console.log(e);
	if (folderlink) return false;
	e.stopPropagation();
	e.preventDefault();
	setTimeout(function()
	{
		if (e && (e.pageX < 6 || e.pageY < 6) && $.dragging && $.dragging+50 < new Date().getTime())
		{
			$($.ddhelper).remove();
			$.ddhelper=undefined;
		}
	},100);
	setTimeout(function()
	{
		if (page == 'start' && e && (e.pageX < 6 || e.pageY < 6) && $.dragging && $.dragging+500 < new Date().getTime())
		{
			$.dragging=false;			
			start_out();		
			$('.st-main-cursor,.st-main-info').fadeIn(30);
		}
	},500);
}

var dir_inflight = 0;
var file_inflight=0;
var filedrag_u = [];

function traverseFileTree(item, path) 
{
  path = path || "";
  if (item.isFile) 
  {
	dir_inflight++;	
    item.file(function(file) 
	{
	  console.log(file);
	  file.path = path;	  
	  filedrag_u.push(file);
	  dir_inflight--;
	  if (dir_inflight == 0 && $.dostart)
	  {
		addupload(filedrag_u);
		if (page == 'start') start_upload();
	  }
    });
  } 
  else if (item.isDirectory) 
  {
	dir_inflight++;
    var dirReader = item.createReader();
    dirReader.readEntries(function(entries) 
	{	  
      for (var i=0; i < entries.length; i++)
	  {
        traverseFileTree(entries[i], path + item.name + "/");
      }
	  dir_inflight--;
	  if (dir_inflight == 0) addupload(filedrag_u);		
	  
    });
  }  
  if (dir_inflight == 0) console.log('end'); 
}



function start_upload()
{
	if (u_wasloggedin())
	{
		msgDialog('confirmation','Starting new account','Do you want to upload your files to a new session?','"No" will allow you to log in and start your upload.',function(e)
		{
			if(e) start_anoupload();		
			else loginDialog();
		});
	}
	else start_anoupload();
}


function start_anoupload()
{
	loadingDialog.show();
	u_checklogin(
	{
		checkloginresult: function(u_ctx,r)
		{			
			u_type = r;
			u_checked=true;
			loadingDialog.hide();
			document.location.hash = 'fm';	
		}
	},true);
}


// file selection
function FileSelectHandler(e) 
{		
	

	if (folderlink) return false;

	if (e.stopPropagation) e.stopPropagation();
	if (e.preventDefault) e.preventDefault();
	
	$($.ddhelper).remove();
	$.ddhelper=undefined;
	
	if (page == 'start')	
	{
		if ($('#fmholder').html() == '') $('#fmholder').html('<div id="topmenu"></div>' + translate(pages['fm'].replace(/{staticpath}/g,staticpath)));
		start_out();		
		setTimeout(function()
		{
			$('.st-main-cursor,.st-main-info').show();
		},500);
	}
	
	
	
	var files = e.target.files || e.dataTransfer.files;	
	if (files.length == 0) return false;	
	if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].webkitGetAsEntry)
	{
		var items = e.dataTransfer.items;
		for (var i=0; i<items.length; i++) 
		{
			if (items[i].webkitGetAsEntry)
			{
				var item = items[i].webkitGetAsEntry();
				if (item)
				{	
					filedrag_u=[];					
					if (i == items.length-1) $.dostart=true;					
					traverseFileTree(item);				
				}
			}
		}	
	}
	else
	{
		var u=[];
		for (var i = 0, f; f = files[i]; i++) 
		{	
			if (f.webkitRelativePath) f.path = f.webkitRelativePath;
			if (f.name != '.') u.push(f);
		}
		addupload(u);
		if (page == 'start') start_upload();		
		$('.fm-file-upload input').remove();		
		$('.fm-file-upload').append('<input type="file" id="fileselect1" multiple="">');
		$('.fm-folder-upload input').remove();		
		$('.fm-folder-upload').append('<input type="file" id="fileselect2" webkitdirectory="" multiple="">');	
		$('.context-menu-item.fileupload-item label input').remove();
		$('.context-menu-item.fileupload-item label').append('<input type="file" id="fileselect3" class="hidden" name="fileselect3" multiple="">');
		
		$('.context-menu-item.folderupload-item label input').remove();
		$('.context-menu-item.folderupload-item label').append('<input type="file" id="fileselect4" name="fileselect4" webkitdirectory="" multiple="" class="hidden">');
		InitFileDrag();
	}
	return true;
}




// initialize
function InitFileDrag() 
{
	if (document.getElementById("fileselect1")) document.getElementById("fileselect1").addEventListener("change", FileSelectHandler, false);	
	if (document.getElementById('fileselect2')) document.getElementById("fileselect2").addEventListener("change", FileSelectHandler, false);
	if (document.getElementById("fileselect3")) document.getElementById("fileselect3").addEventListener("change", FileSelectHandler, false);	
	if (document.getElementById('fileselect4')) document.getElementById("fileselect4").addEventListener("change", FileSelectHandler, false);
	if (document.getElementById('start-upload')) document.getElementById("start-upload").addEventListener("change", FileSelectHandler, false);
	document.getElementById("fmholder").addEventListener("dragover", FileDragHover, false);
	document.getElementById("fmholder").addEventListener("dragleave", FileDragLeave, false);
	document.getElementById("fmholder").addEventListener("drop", FileSelectHandler, false);
	
	
	
	document.getElementById("startholder").addEventListener("dragover", FileDragHover, false);
	document.getElementById("startholder").addEventListener("dragleave", FileDragLeave, false);	
	document.getElementById("startholder").addEventListener("drop", FileSelectHandler, false);
}

	
