function init_blogarticle() {
    if (blogposts === null) {
        return init_blog();
    }

    if (!is_mobile) {
        blog_bind_search();
    }

    var post = blogposts['post_' + blogid];
    if (!post) {
        handleInvalidBlogID();
    }
    for (var e in post.attaches) {
        if (post.attaches.hasOwnProperty(e)) {
            post.c = CMS.imgLoader(post.c, post.attaches[e]);
        }
    }

    return render_blogarticle();
}

function render_blogarticle() {
    var content = false;
    var by = 'Admin';
    var i = 'post_' + blogid;

    if (!is_mobile) {
        var $blogPrev = $('#blog_prev');
        var $blogNext = $('#blog_next');
        if (blogposts['post_' + (parseInt(blogid) - 1)]) {
            $blogPrev.attr('href', '/blog_' + blogposts['post_' + (parseInt(blogid) - 1)].id);
            $blogPrev.fadeTo(0, 1);
            $blogPrev.addClass('active');
        }
        else {
            $blogPrev.attr('href', '/blog_' + blogid);
            $blogPrev.fadeTo(0, 0.4);
            $blogPrev.removeClass('active');
        }
        if (blogposts['post_' + (parseInt(blogid) + 1)]) {
            $blogNext.attr('href', '/blog_' + blogposts['post_' + (parseInt(blogid) + 1)].id);
            $blogNext.fadeTo(0, 1);
            $blogNext.addClass('active');
        }
        else {
            $blogNext.attr('href', '/blog_' + blogid);
            $blogNext.fadeTo(0, 0.4);
            $blogNext.removeClass('active');
        }
    }

    clickURLs();
    content = '';
    if (blogposts[i].attaches.bimg) {
        content += '<img alt=""  integrity="ni:///sha-256;'
            + escapeHTML(blogposts[i].attaches.bimg) + '" src="'
            + escapeHTML(CMS.img2(blogposts[i].attaches.bimg))
            + '" class="blog-new-full-img" />';
    }
    content += blogposts[i].c;
    content = content.replace('[READMORE]', '').replace(/(%7Bstaticpath%7D|{staticpath})/g, staticpath);
    if (blogposts[i].by) {
        by = blogposts[i].by;
    }
    var btitle = blogposts[i].h;
    var bdate = acc_time2date(blogposts[i].t);

    content = content.replace(/(?:{|%7B)cmspath(?:%7D|})/g, CMS.getUrl());

    if (!content) {
        loadSubPage('blog');
    }
    $('body').addClass('blog-new');
    $('#blogarticle_post').safeHTML(content);
    $('#blogarticle_title').safeHTML(btitle);
    $('#blogarticle_date').safeHTML(bdate);

    $('#blogarticle_by').safeHTML('<span>by:</span> ' + escapeHTML(by));

    if (!m && !is_mobile) {
        blog_archive();
    }

    api_req({ a: 'log', e: 99801, m: blogid});
}
