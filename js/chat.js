var MegaChat = false;
if (localStorage.megachat) MegaChat=true;


function chatui()
{
	hideEmptyMsg();
	$('.fm-files-view-icon').addClass('hidden');	
	$('.fm-blocks-view').addClass('hidden');
	$('.files-grid-view').addClass('hidden');
	$('.contacts-grid-view').addClass('hidden');
	$('.fm-contacts-blocks-view').addClass('hidden');
	$('.fm-chat-block').removeClass('hidden');
	
	initChatScrolling();
	
	$('.message-textarea').unbind('keyup');
	$('.message-textarea').bind('keyup',function() 
	{
		  $(this).height('auto');
		  var text = $(this).val();   
          var lines = text.split("\n");
          var count = lines.length;
		   
		  if ($(this).val().length != 0 && count>1) 
		  {
		         $(this).height($(this).prop("scrollHeight"));
				 var scrollBlockHeight = $('.fm-chat-block').outerHeight() - $('.fm-chat-line-block').outerHeight() - 80;
				 if (scrollBlockHeight != $('.fm-chat-message-scroll').outerHeight()) 
				 {
				     $('.fm-chat-message-scroll').height(scrollBlockHeight);
				     initChatScrolling();
				 }
				 
				 // If any popup is opened - moving with buttons
				 if ($('.fm-chat-emotions-icon').attr('class').indexOf('active') > -1) 
				 {
					 var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-emotion-arrow').position().top;
			         $('.fm-chat-emotion-popup').css('bottom', positionY - 17 + 'px');
				 }
				 if ($('.fm-chat-attach-file').attr('class').indexOf('active') > -1) 
				 {
					 var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-attach-arrow').position().top;
			         $('.fm-chat-attach-popup').css('bottom', positionY - 17 + 'px');
				 } 
		  }
		  else $(this).height('27px');
	});
	
	$('.fm-chat-emotions-icon').unbind('click');
	$('.fm-chat-emotions-icon').bind('click', function() 
	{
		if ($(this).attr('class').indexOf('active') > -1) 
		{
			 $('.fm-chat-emotion-popup').addClass('hidden');
			 $(this).removeClass('active');
		} 
		else 
		{
			 $('.fm-chat-emotion-popup').removeClass('hidden');
			 $(this).addClass('active');
			 var positionY = $('.fm-chat-line-block').outerHeight() - $('.fm-chat-emotion-arrow').position().top;
			 $('.fm-chat-emotion-popup').css('bottom', positionY - 17 + 'px');
		}
	});
	
	$('.fm-chat-attach-file').unbind('click');
	$('.fm-chat-attach-file').bind('click', function() 
	{
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
	
	$('.fm-chat-file-button.save-button').unbind('mouseover click');
	$('.fm-chat-file-button.save-button').bind('mouseover click', function() 
	{
		var chatDownloadPopup = $('.fm-chat-download-popup');
		var p = $(this);
		var positionY = $(this).closest('.jspPane').outerHeight() - $(this).position().top;
		var positionX = $(this).position().left;
	    if (positionY - 174 > 0) 
		{
			$(chatDownloadPopup).css('bottom', positionY - 174 + 'px');
			$(chatDownloadPopup).removeClass('top');
		} 
		else 
		{
			$(chatDownloadPopup).css('bottom', positionY + 'px');
			$(chatDownloadPopup).addClass('top');
		}
		$(chatDownloadPopup).css('left', positionX + $(this).outerWidth()/2 + 10 + 'px');
		$(this).addClass('active');
		(chatDownloadPopup).removeClass('hidden');
	});
	
	
	$('.fm-chat-message-scroll').unbind('click');
	$('.fm-chat-message-scroll').bind('click', function() 
	{
		$('.fm-chat-download-popup').addClass('hidden');
	});
	
	$('.fm-add-user').unbind('click');
	$('.fm-add-user').bind('click', function() 
	{
	    var positionX = $(this).position().left;
		var addUserPopup = $('.fm-add-contact-popup');
		if ($(this).attr('class').indexOf('active') > -1) 
		{
			 $(addUserPopup).addClass('hidden');
			 $(this).removeClass('active');
		} 
		else 
		{
			 $(addUserPopup).removeClass('hidden');
			 $(this).addClass('active');
			 $(addUserPopup).css('left', positionX -8 + 'px'); 
		}
	});
}







function initChatScrolling() 
{
	$('.fm-chat-message-scroll').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5});
}




	
	
	

