function init_backup()
{
	$('#backup_keyinput').val(a32_to_base64(u_k));
	$('#backup_keyinput').unbind('click');
	$('#backup_keyinput').bind('click',function()
	{
		$(this).select();		
	});
	
	$('.backup-download-button').unbind('click');
	$('.backup-download-button').bind('click',function()
	{
		var blob = new Blob([a32_to_base64(u_k)], {type: "text/plain;charset=utf-8"});
		saveAs(blob, 'MEGA-KEY-BACKUP.txt');		
	});
}