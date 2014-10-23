
var megalogo='';
if (!m) megalogo = '<img alt="Mega" src="' + staticpath + 'images/mega/blogs/jobs-mega-logo.png"  class="blog-jobs-mega" />';


var blogposts = null;




var bloglimit = 5;
var blogpage = 1;

var blogpostnum;

var blogmonth = false;
var blogsearch = false;

function init_blog()
{
	CMS.get('blog', function(err, data) {
		if (err) return alert("Error fetching the blog data");

		blogposts = data.object;
		
		$('#blog_searchinput').bind('focus', function(e) 
		{
			if (e.target.value == l[102]) e.target.value='';
		});	
		$('#blog_searchinput').bind('blur', function(e) 
		{
			if (e.target.value == '') e.target.value=l[102];	
		});
		$('#blog_searchinput').bind('keydown', function(e) 
		{
			if (e.keyCode == 13) blog_search();
		});	
		if (blogid) init_blogarticle();
		else blog_load();
	});
}

function blog_load()
{
	$('body').addClass('blog-new');	
	var blogcontent = '';
	var a=0;
	var blogstart = blogpage*bloglimit-bloglimit;
	for (var i in blogposts)
	{		
		var mm = blog_month(blogposts[i].t);
		
		if ((blogmonth && (mm == blogmonth)) || ((!blogmonth) && (!blogsearch))
		|| (blogsearch && (blog_searchmath(blogposts[i],blogsearch))))
		{		
			var introtxt = blogposts[i].introtxt;		
			introtxt += ' [...]';		
			if (a >= blogstart && a < bloglimit*blogpage)
			{
				var by = 'Admin';				
				if (blogposts[i].by) by = blogposts[i].by;		
				blogcontent +='<div class="blog-new-item">';
				blogcontent +='<h2>' + blogposts[i].h + '</h2>';
				blogcontent +='<div class="blog-new-small">' + acc_time2date(blogposts[i].t) + '</div>';
				blogcontent +='<div class="blog-new-date-div"></div>';
				blogcontent +='<div class="blog-new-small"><span>By:</span> ' + by + '</div>';
				blogcontent +='<div class="clear"></div><img alt="" src="' + staticpath + blogposts[i].simg + '" />';
				blogcontent +='<p><span class="blog-new-description">' + introtxt + '</span>';
				blogcontent +='<a href="#blog_' + blogposts[i].id + '" class="blog-new-read-more">Read more</a>';
				blogcontent +='<span class="clear"></span></p> </div>';				
			}
			a++;
		}
	}
	blogpostnum=a;
	if (m) $('.privacy-page').html(blogcontent);		
	else
	{
		blog_archive();		
		blogcontent += blog_pager();		
		$('.blog-new-left').html(blogcontent);
		$('.blog-pagination-button').unbind('click');
		$('.blog-pagination-button').bind('click',function()
		{
			var c = $(this).attr('class');
			if (c && c.indexOf('next') > -1) blogpage+=1;
			else if (c && c.indexOf('previous') > -1) blogpage-=1;
			else if (c && c.indexOf('to-the-end') > -1) blogpage = Math.ceil(blogpostnum/bloglimit);			
			else if (c && c.indexOf('to-the-beggining') > -1) blogpage=1;
			else if (c) blogpage = parseInt(c.replace('blog-pagination-button ',''));
			if (blogpage < 1) blogpage=1;
			if (blogpage > Math.ceil(blogpostnum/bloglimit)) blogpage = Math.ceil(blogpostnum/bloglimit);
			blog_load();
		});
		if (blogpage == Math.ceil(blogpostnum/bloglimit)) $('.blog-pagination-button.next,.blog-pagination-button.to-the-end').addClass('unavailable');
		if (blogpage == 1) $('.blog-pagination-button.previous,.blog-pagination-button.to-the-beggining').addClass('unavailable');		
		$('.blog-pagination-button.' + blogpage).addClass('active');		
		if (blogsearch) 
		{
			$('#blog_searchinput').val(blogsearch);
			var restxt = '';
			if (a == 0) restxt = ' (no results)';
			else if (a == 1) restxt = ' (1 result)';
			else restxt = ' (' + a + ' results)';			
			$('.privacy-top-pad h1').text('Blog search for: "' + blogsearch + '"' + restxt);
		}
		else $('.privacy-top-pad h1').text('Blog');
	}
	$('.main-scroll-block').jScrollPane({showArrows:true,arrowSize:5,animateScroll:true,mouseWheelSpeed:50});
}

function blog_pager()
{
	var pages = Math.ceil(blogpostnum/bloglimit);
	if (pages == 1) return '';
	var blogpages = '';
	var i =0;
	
	while (i < pages)
	{
		blogpages += '<div class="blog-pagination-button ' + (i+1) + '">' + (i+1) + '</div>';
		i++;	
	}	
	var blogpager = '<div class="blog-pagination"><div class="blog-pagination-pad"><div class="blog-pagination-button to-the-beggining"></div><div class="blog-pagination-button previous"></div>' + blogpages + '<div class="blog-pagination-button next"></div><div class="blog-pagination-button to-the-end"></div></div></div>';	
	return blogpager;
}


function blog_searchmath(post,keyword)
{
	if (htmlentities(post.c).toLowerCase().indexOf(keyword.toLowerCase()) > -1) return true;
	if (htmlentities(post.h).toLowerCase().indexOf(keyword.toLowerCase()) > -1) return true;
	return false;
}



function blog_search()
{
	document.location.hash = '#blogsearch/' + encodeURIComponent($('#blog_searchinput').val());
}

function blog_month(t)
{
	var d = new Date(t*1000);
	return d.getFullYear()+'_'+ (parseInt(d.getMonth())+1);	
}


function blog_archive()
{
	var blogmonths = [];
	for (var i in blogposts)
	{
		var mm = blog_month(blogposts[i].t);
		if (blogmonths[mm]) blogmonths[mm]++;
		else blogmonths[mm]=1;	
	}	
	var blogarchive='';	
	for (var mm in blogmonths)
	{
		var y='';
		y = ' ' + mm.split('_')[0] + ' ';
		blogarchive += '<a href="#blog_' + mm + '" class="blog-new-archive-lnk">' + date_months[parseInt(mm.split('_')[1])-1] + y + ' <span class="blog-archive-number">' + blogmonths[mm] + '</span></a>';
	}
	$('#blog_archive').html(blogarchive);
}


function blog_more()
{
	bloglimit=bloglimit+5;
	blog_load();	
}



if (typeof mobileblog !== 'undefined')
{
	var blogid = document.location.hash.substr(1).replace('blog_','');
	for (var i in blogposts)
	{
		if (blogid == blogposts[i].id)
		{
			var content = '';
			if (blogposts[i].bimg) content += '<img alt="" src="' + staticpath + blogposts[i].bimg + '" class="blog-new-full-img" />';
			content += blogposts[i].c;				
			content = content.replace('[READMORE]','').replace(/{staticpath}/g,staticpath);
			var date = new Date(blogposts[i].t*1000);			
			var blogdate =  date.getDate() + '-' + (parseInt(date.getMonth())+1) + '-' + date.getFullYear();
			var html = '<div class="main-scroll-block"><div class="main-content-block blog-new"><div class="blog-new-full empty-bottom"><h2 id="blogarticle_title">' + blogposts[i].h + '</h2><a href="#blog_22" id="blog_prev" class="blog-new-forward" style="opacity: 0.4;"></a> <a href="#blog_21" id="blog_next" class="blog-new-back active" style="opacity: 1;"></a><div class="clear"></div><div class="blog-new-small" id="blogarticle_date">' + blogdate + '</div><div class="blog-new-date-div"></div><div class="blog-new-small" id="blogarticle_by"><span>by:</span> ' + blogposts[i].by + '</div><div class="clear"></div><div id="blogarticle_post">' + content + '</div><div class="clear"></div></div><div class="bottom-menu full-version"><div class="copyright-txt">Mega Limited ' + new Date().getFullYear() + '</div><div class="clear"></div></div></div></div>';
			document.body.innerHTML = html;			
			if (android) document.body.className = 'android blog';
			else if (ios) document.body.className = 'ios blog';
			else document.body.className = 'another-os blog';
		}	
	}
	
}


