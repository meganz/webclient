var MegaChat = false;
if (localStorage.megachat) MegaChat=true;

// current active chatid
var chatid = false;

function hideChat()
{
	$('.fm-chat-block').addClass('hidden');
}

function chatui()
{	
	// hide other panels:
	hideEmptyMsg();
	$('.files-grid-view').addClass('hidden');
	$('.fm-blocks-view').addClass('hidden');
	$('.contacts-grid-view').addClass('hidden');
	$('.fm-contacts-blocks-view').addClass('hidden');
	
	// deselect conversation in left panel:
	$('.nw-conversations-item').removeClass('selected');
	
	sectionUIopen('conversations');
	
	// add onclick events for contact list:
	$('.nw-conversations-item').unbind('click');
	$('.nw-conversations-item').bind('click',function(e)
	{
		var id = $(this).attr('id');
		if (id) chatid = id.replace('contact2_','');
		openChat();
	});
	
	// general chat UI logic (needs further refining):
	
	$('.fm-chat-input-block .message-textarea').unbind('focus');
	$('.fm-chat-input-block .message-textarea').bind('focus',function()
	{
		if ($(this).val() == 'Write a message...') $(this).val('');
	});
	
	$('.fm-chat-input-block .message-textarea').unbind('blur');
	$('.fm-chat-input-block .message-textarea').bind('blur',function()
	{
		if ($(this).val() == '') $(this).val('Write a message...');
	});
	
	$('.fm-chat-input-block .message-textarea').unbind('keyup');
	$('.fm-chat-input-block .message-textarea').bind('keyup',function(e) 
	{
		if (e.keyCode == 13 && e.shiftKey == false)
		{
			console.log('send chat message', $(this).val());
			$(this).val('');
		}
		$(this).height('auto');
		var text = $(this).val();   
        var lines = text.split("\n");
        var count = lines.length;		   
		if ($(this).val().length != 0 && count>1) 
		{
			$(this).height($(this).prop("scrollHeight"));
			var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight();
			if (scrollBlockHeight != $('.fm-chat-message-scroll').outerHeight()) 
			{
				$('.fm-chat-message-scroll').height(scrollBlockHeight);
				initChatScrolling();
			}
		}
		else $(this).height('27px');
	});
	
	$('.fm-chat-attach-file').unbind('click');
	$('.fm-chat-attach-file').bind('click', function() {
		if ($(this).attr('class').indexOf('active') > -1) 
		{
			 $('.fm-chat-attach-popup').addClass('hidden');
			 $(this).removeClass('active');
		} 
		else 
		{
			 $('.fm-chat-attach-popup').removeClass('hidden');
			 $(this).addClass('active');
			 var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-attach-arrow').position().top;
			 $('.fm-chat-attach-popup').css('bottom', positionY - 17 + 'px');
		}
	});
	
	$('.nw-chat-button.red').unbind('click');
	$('.nw-chat-button.red').bind('click', function() {
		var chatDownloadPopup = $('.fm-chat-download-popup');
		if ($(this).attr('class').indexOf('active') == -1) 
		{
			 $('.nw-chat-button.red.active').removeClass('active');
			 var p = $(this);
			 var positionY = $(this).closest('.fm-chat-message-pad').outerHeight() - $(this).position().top;
			 var positionX = $(this).position().left;
	        // if (positionY - 174 > 0) {
			   $(chatDownloadPopup).css('bottom', positionY - 7  + 'px');
			// } else {
			//   $(chatDownloadPopup).css('bottom', positionY + 'px');
			//   $(chatDownloadPopup).addClass('top');
			// }
			 chatDownloadPopup.addClass('active');
			 chatDownloadPopup.css('margin-left', '-'+ chatDownloadPopup.outerWidth()/2 + 'px');
			 chatDownloadPopup.css('left', positionX + $(this).outerWidth()/2 + 10  + 'px');
		     $(this).addClass('active');
		} 
		else 
		{
			 $(this).removeClass('active');
			 chatDownloadPopup.removeClass('active');
			 chatDownloadPopup.css('left', '-' + 10000 + 'px');
		}
			 
	});
	
	$('.fm-chat-download-button').unbind('click');
	$('.fm-chat-download-button').bind('click', function() 
	{
		var chatDownloadPopup = $('.fm-chat-download-popup.active');
		chatDownloadPopup.removeClass('active');
		chatDownloadPopup.css('left', '-' + 10000 + 'px');
		$('.nw-chat-button.red.active').removeClass('active');
	});
	
    function closeChatPopups() 
	{
		var activePopup = $('.chat-popup.active');
		var activeButton = $('.chat-button.active');
		activeButton.removeClass('active');
		activePopup.removeClass('active');
		if (activePopup.attr('class')) 
		{
		  activeButton.removeClass('active');
		  activePopup.removeClass('active');
		  if (activePopup.attr('class').indexOf('fm-add-contact-popup') == -1) activePopup.css('left', '-' + 10000 + 'px'); 
		  else activePopup.css('right', '-' + 10000 + 'px'); 
		}
	}
	
	
	// currently not in use (for group chat):
	$('.fm-add-user').unbind('click');
	$('.fm-add-user').bind('click', function() 
	{
	    var positionX = $(this).position().left;
		var addUserPopup = $('.fm-add-contact-popup');
		if ($(this).attr('class').indexOf('active') == -1) 
		{
			 closeChatPopups();
			 addUserPopup.addClass('active');
			 $(this).addClass('active');
			 $('.fm-add-contact-arrow').css('right', $(this).outerWidth()/2  + 'px'); 
			 addUserPopup.css('right', 0 + 'px'); 
		} 
		else 
		{
			 addUserPopup.removeClass('active');
			 addUserPopup.css('right', '-' + '10000' + 'px'); 
			 $(this).removeClass('active');
			 
		}
	});
	
	$('.fm-send-files').unbind('click');
	$('.fm-send-files').bind('click', function() 
	{
	    var positionX = $(this).position().left;
		var sendFilesPopup = $('.fm-send-files-popup');
		if ($(this).attr('class').indexOf('active') == -1) 
		{
			 closeChatPopups();
			 sendFilesPopup.addClass('active');
			 $(this).addClass('active');
			 $('.fm-send-files-arrow').css('left', $(this).outerWidth()/2  + 'px'); 
			 sendFilesPopup.css('left',  $(this).position().left + 'px'); 
		} 
		else 
		{
			 sendFilesPopup.removeClass('active');
			 sendFilesPopup.css('left', '-' + '10000' + 'px'); 
			 $(this).removeClass('active');
			 
		}
	});
	
	$('.fm-start-call').unbind('click');
	$('.fm-start-call').bind('click', function() 
	{
	    var positionX = $(this).position().left;
		var sendFilesPopup = $('.fm-start-call-popup');
		if ($(this).attr('class').indexOf('active') == -1) 
		{
			 closeChatPopups();
			 sendFilesPopup.addClass('active');
			 $(this).addClass('active');
			 $('.fm-start-call-arrow').css('left', $(this).outerWidth()/2  + 'px'); 
			 sendFilesPopup.css('left',  $(this).position().left + 'px'); 
		} 
		else 
		{
			 sendFilesPopup.removeClass('active');
			 sendFilesPopup.css('left', '-' + '10000' + 'px'); 
			 $(this).removeClass('active');			
		}
	});
	
	$('.fm-chat-emotions-icon').unbind('click');
	$('.fm-chat-emotions-icon').bind('click', function() 
	{
		if ($(this).attr('class').indexOf('active') == -1) 
		{
			$(this).addClass('active');
			$('.fm-chat-emotion-popup').addClass('active');
		} 
		else 
		{
			$(this).removeClass('active');
			$('.fm-chat-emotion-popup').removeClass('active');
		}
	});
	
	$('.fm-chat-smile').unbind('click');
	$('.fm-chat-smile').bind('click', function() 
	{
			$('.fm-chat-emotions-icon').removeClass('active');
			$('.fm-chat-emotion-popup').removeClass('active');
	});
	
	$('.multiple-sharing .nw-chat-expand-arrow').unbind('click');
	$('.multiple-sharing .nw-chat-expand-arrow').bind('click', function() 
	{
		var sharingBlock = $(this).closest('.fm-chat-messages-block');
		if ($(sharingBlock).attr('class').indexOf('expanded') > -1) sharingBlock.removeClass('expanded');
		else sharingBlock.addClass('expanded');
		var chatDownloadPopup = $('.fm-chat-download-popup.active');
		chatDownloadPopup.removeClass('active');
		chatDownloadPopup.css('left', '-' + 10000 + 'px');
		$('.nw-chat-button.red.active').removeClass('active');	
	    initChatScrolling();
	});
	
	$('.fm-chat-popup-button.from-cloud').unbind('click');
	$('.fm-chat-popup-button.from-cloud').bind('click', function() 
	{
		$('.fm-dialog-overlay').removeClass('hidden');
		$('.fm-chat-attach-popup').removeClass('hidden');
	});
	
	$('.fm-chat-popup-button.add-contact').unbind('click');
	$('.fm-chat-popup-button.add-contact').bind('click', function() 
	{
		$('.fm-dialog-overlay').removeClass('hidden');
		$('.fm-add-user-popup').removeClass('hidden');
	});
	
	$('.nw-fm-close-button').unbind('click');
	$('.nw-fm-close-button').bind('click', function() 
	{
		$('.fm-dialog-overlay').addClass('hidden');
		$(this).closest('.fm-dialog-popup').addClass('hidden');
	});	
}


function openChat(id)
{
	chatui();
	if (id) chatid = id;
	$('.fm-chat-block').removeClass('hidden');
	initChatScrolling();	
	chatHeader();	
	$('#contact2_' + chatid).addClass('selected');
	window.location.hash = '#fm/chat/' + chatid;
}


function chatHeader()
{	
	if (!chatid) $('.fm-right-header.chat').addClass('hidden');
	
	$('.fm-right-header.chat').removeClass('hidden');
	
	$('.fm-right-header .nw-contact-avatar').removeClass('verified');	
	if (M.u[chatid].verified) $('.fm-right-header .nw-contact-avatar').addClass('verified');
	
	// set name:
	$('.fm-chat-user').text(M.u[chatid].m);
	$('.fm-chat-user-info').removeClass('online offline away busy');
	
	// online status:
	$('.fm-chat-user-info').addClass('offline');	
	$('.fm-chat-user-status').text('offline');

	// hide add user button (group chat will come later)
	$('.chat-button.fm-add-user').addClass('hidden');
}



function initChatScrolling() 
{
	$('.fm-chat-message-scroll').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
}	




	
	
	

