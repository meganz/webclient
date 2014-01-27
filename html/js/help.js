function init_help()
{
	var subpage='',search ='';	
	if (page.length > 4) subpage = page.substr(5,page.length-1);	
	if (subpage.substr(0,6) == 'search')
	{
		search = subpage.replace('search/','');
		subpage='';
	}	
	$('.new-left-menu-link,.help-block').unbind('click');
	$('.new-left-menu-link,.help-block').bind('click',function(e)
	{
		var c = $(this).attr('class');
		if (!c) return false;
		if (c.indexOf('basics') > -1) document.location.hash = 'help/basics';
		else if (c.indexOf('sharing') > -1) document.location.hash = 'help/sharing';
		else if (c.indexOf('security') > -1) document.location.hash = 'help/security';
		else if (c.indexOf('account') > -1) document.location.hash = 'help/account';
		else if (c.indexOf('sync') > -1) document.location.hash = 'help/sync';
		else if (c.indexOf('ios') > -1) document.location.hash = 'help/ios';
		else if (c.indexOf('android') > -1) document.location.hash = 'help/android';
		else document.location.hash = 'help';
	});	
	$('.new-left-menu-link').removeClass('active');	
	if (subpage) $('.new-left-menu-link.'+subpage).addClass('active');
	else $('.new-left-menu-link.home').addClass('active');	
	$('.new-right-content-block').addClass('hidden');	
	if (search)
	{
		var html = '<h1 class="help-home-header">Help Centre - <span class="red">search</span></h1><div class="blog-new-search"><input value="" class="help_search"/></div><div class="blog-new-div"><div></div></div>';		
		var a=0;
		for (var i in helpdata)
		{
			if (helpdata[i].q.toLowerCase().indexOf(search.toLowerCase()) > -1 || helpdata[i].a.toLowerCase().indexOf(search.toLowerCase()) > -1)
			{
				html +='<h2>' + helpdata[i].q + '</h2>' + helpdata[i].a + '';
				a++;
			}
		}
		if (a == 0) html += '<h2>' + l[978] + '</h2>';		
		$('.new-right-content-block.help-info-pages').html(html);
		$('.new-right-content-block.help-info-pages').removeClass('hidden');
		$('.help_search').val(search);
		mainScroll();
		scrollMenu();
	}	
	else if (subpage)
	{
		var id,title;		
		if (subpage == 'basics')
		{
			id=0;
			title = 'Basics';
		}
		else if (subpage == 'sharing')
		{
			id=1;
			title = 'Sharing';
		}
		else if (subpage == 'security')
		{
			id=2;
			title = 'Security & Privacy';
		}
		else if (subpage == 'account')
		{
			id=3;
			title = 'Account';
		}
		else if (subpage == 'sync')
		{
			id=4;
			title = 'Sync Client';
		}
		else if (subpage == 'ios')
		{
			id=5;
			title = 'iOS App';
		}
		else if (subpage == 'android')
		{
			id=6;
			title = 'Android App';
		}
		var html = '<h1 class="help-home-header">Help Centre - <span class="red">' + title + '</span></h1>';
		for (var i in helpdata) if (helpdata[i].c == id) html +='<h2>' + helpdata[i].q + '</h2>' + helpdata[i].a + '';
		$('.new-right-content-block.help-info-pages').html(html);
		$('.new-right-content-block.help-info-pages').removeClass('hidden');
		mainScroll();
	}
	else $('.new-right-content-block.home').removeClass('hidden');		
	$('.help_search').unbind('keyup');
	$('.help_search').bind('keyup',function(e)
	{
		if (e.keyCode == 13) document.location.hash = 'help/search/' + $(this).val();
	});	
	$('.help_search').unbind('focus');
	$('.help_search').bind('focus',function(e)
	{
		if ($(this).val() == l[102]) $(this).val('');
	});
	$('.help_search').unbind('blur');
	$('.help_search').bind('blur',function(e)
	{
		if ($(this).val() == '') $(this).val(l[102]);
	});
	scrollMenu()
}



var helpdata = 
[
{
	//q: 'What does "MEGA" stand for?',	
	q: l[259],
	a: '<p>' + l[260] + '</p>',
	c: [0]
},
{
	//q: 'What is MEGA all about?',
	q: l[261],
	a: '<p>' + l[262] + '</p>',
	c: [0],
	i: 1
},
{
	//q: 'Is MEGA legal?',
	q: l[692],
	a: '<p>' + l[264].replace('[B]','<i>').replace('[/B]','</i>').replace('[A]','<a href="#terms">').replace('[/A]','</A>') + '</p> ',
	c: [0],
	i:1,
},
{
	// q: 'Why base a cloud storage company in New Zealand, of all places?',
	q: l[267],
	a: '<p>' + l[268].replace('cloud','<b>cloud</b>') + '</p> ',
	c: [0],
	i:1
},
{
	// q: 'Can I access MEGA on my mobile device?',
	q: l[269],
	a: '<p>We are providing dedicated <a href="#mobile">apps</a> for your mobile device, including for <a href="https://itunes.apple.com/app/mega/id706857885" target="_blank">iOS</a> & <a href="https://play.google.com/store/apps/details?id=com.flyingottersoftware.mega" target="_blank">Android</a>.</p>',
	c: [0],
	i: 1
},
{
	// q: 'Can I resume interrupted up- or downloads?',
	q: l[271],
	a: '<p>' + l[272] + '</p>',
	c: [0]
},
{
	// q: 'Can I upload the same file multiple times?',
	q: l[273],
	a: '<p>' + l[274] + '</p>',
	c: [0]
},
{
	q: l[275],
	a: '<p>' + l[276] + '</p>',
	c: [0]
},
{
	// q: 'Are there any file size limits on MEGA?',
	q: l[277],
	a: '<p>' + l[278] + '</p>',
	c: [0]
},
{
	// q: 'Can I upload and download at the same time?',
	q: l[279],
	a: '<p>' + l[280] + '</p>',
	c: [0]
},
{
	// q: 'How do I upload files to MEGA?',
	q: l[283],
	a: '<p>' + l[284] + '<br>' + l[285] + '<br>' + l[286] + '<br>' + l[287] + '</p>',
	c: [0]
},
{
	// q: 'How do I install MEGA?',
	q: l[288],
	a: '<p>' + l[289] + '</p>',
	c: [0]
},
{
	// q: 'Do you offer an API?',
	q: l[359],
	a: '<p>' + l[361].replace('[A]','<a href="#dev">').replace('[/A]','</A>') + '</p>',
	c: [0]
},
{
	// q: 'How does folder sharing work?',
	q: l[366],
	a: '<p>' + l[367] + '</p>',
	c: [1]
},
{
	// q: 'How does folder sharing work?',
	q: l[290],
	a: '<p>' + l[291] + '</p><p>' + l[292] + '</p><p>' + l[293] + '</p>',
	c: [1]
},
{
	// q: 'How do I delete people from my shared folder?',
	q: l[294],
	a: '<p>' + l[295] + '</p>',
	c: [1]
},
{
	// q: 'How do I recognize my shared folders?',
	q: l[296],
	a: '<p>' + l[297] + '</p>',
	c: [1]
},
{
	// q: 'Can I share a shared folder?',
	q: l[298],
	a: '<p>' + l[299] + '</p>',
	c: [1]
},
{
	// q: 'How do I link to a file on MEGA?',
	q: l[302],
	a: '<p>' + l[303] + '</p> <p>' + l[304] + '</p>',
	c: [1]
},
{
	// q: 'How does the encryption work?',
	q: l[305],
	a: '<p>' + l[306] + '</p>',
	c: [2],
	i:1
},
{
	// q: 'Is all of my personal information subject to encryption?',
	q: l[307],
	a: '<p>' + l[308] + '</p>',
	c: [2]
},
{
	// q: 'Is my stored data absolutely secure?',
	q: l[309],
	a: '<p>' + l[310] + '</p><p>' + l[311] + '<br>' + l[312] + '<br>' + l[313] + '<br>' + l[314] + '<br>' + l[315] + '</p><p>' + l[316] + '<br>' + l[317] + '<br>' + l[318] + '<br>' + l[319] + '<br></p>',
	c: [2]
},
{
	// q: 'What if I don't trust you? Is it still safe for me to use MEGA?',
	q: l[320],
	a: '<p>' + l[321] + '</p>',
	c: [2]
},
{
	// q: 'Is data that I put in shared folders as secure my other data?',
	q: l[324],
	a: '<p>' + l[325] + '</p>',
	c: [2]
},
{
	// q: 'Let's assume that a MEGA storage node is physically compromised. What are the risks?',
	q: l[326],
	a: '<p>' + l[327] + '</p>',
	c: [2]
},
{
	// q: 'Is it a good idea to store all of my data in a single place?',
	q: l[328],
	a: '<p>' + l[329] + '</p>',
	c: [2]
},
{
	// q: 'Why should I entrust my data to, of all people, you?',
	q: l[330],
	a: '<p>' + l[331] + '</p>',
	c: [2]
},
{
	// q: 'I noticed that you are using HTTPS for transferring already encrypted file data. Isn't that redundant?',
	q: l[332],
	a: '<p>' + l[333] + '</p>',
	c: [2]
},
{
	// q: 'What encryption algorithms does MEGA use internally?',
	q: l[334],
	a: '<p>' + l[335] + '</p><p>' + l[336] + '</P><p>' + l[337] + '</P>',
	c: [2]
},
{
	// q: 'Does MEGA keep backups of my files?',
	q: l[338],
	a: '<p>' + l[339] + '</p>',
	c: [3],
	i: 1
},
{
	// q: 'I have forgotten my password. Can I reset it?',
	q: l[340],
	a: '<p>' + l[341] + '</p>',
	c: [3],
	i: 1
},
{
	// q: 'What do I get with my free account?',
	q: l[348],
	a: '<p>' + l[349].replace('[X]','50 GB').replace('[A1]','<a href="#pro">').replace('[/A1]','</a>').replace('[A2]','<a href="#fm/account">').replace('[/A2]','</a>') + '</p>',
	c: [3],
	i: 1,
},
{
	// q: 'When do I need to upgrade to a Pro account?',
	q: l[344],
	a: '<p>' + l[345] + '</p>',
	c: [3]
},
{
	// q: 'Why is there an option to limit my uploading speed, and why is it enabled by default?',
	q: l[346],
	a: '<p>' + l[347] + '</p>',
	c: [3]
},

// Sync
{
	q: 'What is MEGAsync?',
	a: '<p>MEGAsync is an installable application that synchronizes folders between your computer and your MEGA cloud drive. All files and subfolders will be replicated both ways. Changes that you make on one side will appear on the other side in near real time (within the limits of link/system latency and file transfer times).</p>',
	c: [4]
},
{
	q: 'How do I install MEGAsync?',
	a: '<p>Go to the <a href="#sync">download page</a> and follow the instructions. During the installation, you will be asked to enter or create your MEGA account and to set up the folders to replicate (either your full MEGA cloud drive to a single local folder or specific subfolders in your cloud drive to corresponding local folders). After the installation completes, MEGAsync will start automatically. Under Windows, you will see a clickable MEGA logo in the system tray while the sync tool is running that gives you access to a status popup and the settings page.</p>',
	c: [4]
},
{
	q: 'Can I use MEGAsync on multiple computers?',
	a: '<p>Yes. By synchronizing multiple devices with the same cloud folder, you can achieve cross-computer syncing.</p>',
	c: [4]
},
{
	q: 'How can I monitor the sync status of my local files and folders?',
	a: '<p>Icons of files and folders that are in sync with the cloud will be tagged with a green circle. Transfers in progress are indicated by a blue circle; pending transfers show in red.</p>',
	c: [4]
},
{
	q: 'MEGAsync stores my login credentials to perform autologin. Isn\'t that a security concern?',
	a: '<p>Not if you keep your local drive encrypted (please do &mdash; why would you want to sync from an encrypted cloud drive to an unencrypted local drive?).</p>',
	c: [4]
},
{
	q: 'I deleted a file from a local synced folder while MEGAsync was not running. Then I started it, and the file reappeared. Why?',
	a: '<p>The current incarnation of MEGAsync does not remember your local filesystem state across restarts. It has no way of knowing that a local file has gone missing since the last time it was run. Therefore, always keep MEGAsync running if you want your local deletions to be replicated properly.</p>',
	c: [4]
},
{
	q: 'An important file was overwritten or deleted by the sync client. What can I do to get it back?',
	a: '<p>On the cloud side, deleted files will be moved to a special "SyncDebris" subfolder structure in your Rubbish Bin and can be retrieved from there (use MEGA\'s built-in search if needed). On the local computer, each sync\'s root folder will have a hidden "Debris" folder in which deleted items are placed. </p>',
	c: [4]
},
{
	q: 'Does MEGAsync perform explicit file versioning?',
	a: '<p>No. However, you can access overwritten files in the respective debris folders until they are purged.</p>',
	c: [4]
},
{
	q: 'Does MEGAsync support modifying existing files?',
	a: '<p>No. If a synced file changes, it is always replaced as a whole. Therefore, it is not recommended to sync e.g. large log files or database tables. Encrypted delta writes are planned for a future release.</p>',
	c: [4]
},
{
	q: 'With large sync folders configured, MEGAsync takes a long time to start. Why?',
	a: '<p>Each time MEGAsync is launched, a full integrity check of the local file trees is performed. Future versions will offer an option to skip this check.</p>',
	c: [4]
},
{
	q: 'Are there any restrictions with regards to filenames?',
	a: '<p>MacOS/UNIX filenames are case sensitive, Windows filenames are not. A folder containing both "ABC.TXT" and "abc.txt" can be synced to a UNIX machine without problems, but when synced to a Windows machine, only one of the two files will survive.</p><p>MEGA imposes no restrictions on filenames &mdash; they can contain characters that are incompatible with the operating system, such as : or *. These will be rewritten as %xx on the local side and converted back to the original character when synced back. The Windows Explorer also has trouble with a number of seemingly innocuous file and folder names &mdash; "con.doc", for example, would not be accessible (to understand why, you have to be a geek or a veteran, or both). If you encounter such a situation, simply rename the file on the cloud side. Foreign characters in filenames are fully supported.</p><p>MEGAsync supports fairly deep folder structures (MEGA itself is limited to a maximum of 63 levels) and very long pathnames (up to 32,000 characters under Windows). Unfortunately, most Windows software (including the Explorer) is unable to access files whose path is longer than 260 characters.</p> ',
	c: [4]
},
{
	q: 'How can I make sure that I always have the latest version of MEGAsync?',
	a: '<p>MEGAsync checks for a new version every two hours and updates itself once one is available (you can turn this off in the settings &mdash; the next check is then performed when you turn it back on). For security reasons, only the account that initially installed MEGAsync is allowed to update it.</p>',
	c: [4]
},

{
	q: 'Will MEGAsync use peer-to-peer transfers to achieve faster syncing between computers in the same local area network?',
	a: '<p>No. The current incarnation of MEGAsync always syncs via MEGA\'s cloud infrastructure.</p>',
	c: [4]
},

{
	q: 'What happens if conflicting concurrent actions are performed on clients synced to the same cloud location?',
	a: '<p>The current incarnation of MEGAsync does not resolve such clashes in a deterministic manner. Avoid them if possible.</p>',
	c: [4]
},

{
	q: 'Does MEGAsync support advanced filesystem features such as links, attributes, ACLs, streams/forks or sparse files?',
	a: '<p>No. Do not expect these to be replicated to the cloud.</p>',
	c: [4]
},

{
	q: 'Does MEGAsync support syncing the same local folder to different remote locations or the same remote folder to different local locations?',
	a: '<p>No, unless you want to run multiple MEGAsync processes in parallel, which is not recommended. As a general rule, each filesystem item must only be visible to MEGAsync once, so avoid syncing subfolders of synced folders or placing multiple links to the same filesystem item in a local synced folder.</p>',
	c: [4]
},

// iOS
{
	q: 'Where can I find your iOS app?',
	a: '<p>You can download and install our iOS app on the <a href="https://itunes.apple.com/app/mega/id706857885" target="_blank">App Store</a>.</p>',
	c: [5]
},


// Android
{
	q: 'Where can I find your Android app?',
	a: '<p>You can download and install our Android app on <a href="https://play.google.com/store/apps/details?id=com.flyingottersoftware.mega" target="_blank">Google Play</a>.</p>',
	c: [6]
}

]
