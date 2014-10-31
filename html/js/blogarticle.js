function init_blogarticle()
{
	if (blogposts === null) {
		init_blog();
		return Later(init_blogarticle);
	}

	var post = blogposts['post_'  + blogid]
	for (var e in post.attaches) {
		post.c = CMS.imgLoader(post.c, post.attaches[e])
	}
			
	return render_blogarticle()
}

function render_blogarticle()
{
	var content = false;	
	var by = 'Admin';
	var i  = 'post_' + blogid;

	if (blogposts['post_' + (parseInt(blogid)-1)])
	{
		$('#blog_prev').attr('href','#blog_' + blogposts['post_' + (parseInt(blogid)-1)].id);
		$('#blog_prev').fadeTo(0,1);
		$('#blog_prev').addClass('active');
	}
	else
	{
		$('#blog_prev').attr('href','#blog_' + blogid);
		$('#blog_prev').fadeTo(0,0.4);	
		$('#blog_prev').removeClass('active');		
	}			
	if (blogposts['post_' + (parseInt(blogid)+1)])
	{
		$('#blog_next').attr('href','#blog_' + blogposts['post_'+(parseInt(blogid)+1)].id);
		$('#blog_next').fadeTo(0,1);
		$('#blog_next').addClass('active');
	}
	else
	{
		$('#blog_next').attr('href','#blog_' + blogid);
		$('#blog_next').fadeTo(0,0.4);	
		$('#blog_next').removeClass('active');		
	}
	content = '';
	if (blogposts[i].attaches.bimg) content += '<img alt="" data-img="loading_'+blogposts[i].attaches.bimg+'" src="' + CMS.img(blogposts[i].attaches.bimg) + '" class="blog-new-full-img" />';
	content += blogposts[i].c;				
	content = content.replace('[READMORE]','').replace(/{staticpath}/g,staticpath);
	var by = 'Admin';
	if (blogposts[i].by) by = blogposts[i].by;
	var btitle = blogposts[i].h;
	var bdate = acc_time2date(blogposts[i].t);

	if (!content) document.location.hash = 'blog';	
	$('body').addClass('blog-new');
	$('#blogarticle_post').html(content);
	$('#blogarticle_title').html(btitle);
	$('#blogarticle_date').html(bdate);	
	
	$('#blogarticle_by').html('<span>by:</span> ' + by);	
	
	$('#blogarticle_post img').bind('load',function(e)
	{
		$('.main-scroll-block').jScrollPane({showArrows:true,arrowSize:5,animateScroll:true,mouseWheelSpeed:50});	
	});
	
	if (!m) blog_archive();
	$('.main-scroll-block').jScrollPane({showArrows:true,arrowSize:5,animateScroll:true,mouseWheelSpeed:50});
}
