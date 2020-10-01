var megalogo = '';

if (typeof escapeHTML !== 'function') {
    escapeHTML = function(str) {
        return String(str).replace(/[&"'<>]/g, function(match) {
            return escapeHTML.replacements[match];
        });
    };
    escapeHTML.replacements = { "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" };
}

if (!m) {
    megalogo = '<img alt="Mega" src="' + escapeHTML(staticpath)
        + 'images/mega/blogs/jobs-mega-logo.png"  class="blog-jobs-mega" />';
}


var blogposts = null;
var blogHeaders = Object.create(null);

function unsigned_blogposts(ready) {
    var xhr = getxhr();
    xhr.open("GET", (localStorage.cms || "https://cms2.mega.nz/") + "unsigned/blog");
    xhr.onreadystatechange = function() {
        if (this.readyState === 4) {
            blogposts = JSON.parse(xhr.responseText);
            ready();
        }
    };
    xhr.send(null);
}


var bloglimit = 5;
var blogpage = 1;

var blogpostnum;

var blogmonth = false;
var blogsearch = false;

function blog_bind_search() {
    'use strict';

    $('#blog_searchinput').rebind('focus.blog', function(e) {
        if (e.target.value === l[102]) {
            e.target.value = '';
        }
    })
    .rebind('blur.blog', function(e) {
        if (e.target.value === '') {
            e.target.value = l[102];
        }
    })
    .rebind('keydown.blog', function(e) {
        if (e.keyCode === 13) {
            blog_search();
        }
    });
}

function init_blog_callback() {
    blog_bind_search();
    if (page === 'blogarticle' || page.substr(0, 5) === 'blog/') {
        init_blogarticle();
    }
    else if (is_mobile) {
        handleInvalidBlogID();
    }
    else {
        blog_load();
    }
}

function init_blog() {

    // Remove early.
    if (is_mobile) {
        $('.blog-new-right').addClass('hidden');
    }

    if (blogposts) {
        return init_blog_callback();
    }

    loadingDialog.show();
    CMS.watch('blog', function(nodeId) {
        blogposts = null;
        if (d) {
            console.error("CMS Blog", "update");
        }
        init_blog();
    });

    CMS.get('blog', function(err, data) {
        if (err) {
            return alert("Error fetching the blog data");
        }

        blogposts = data.object;
        for (var b in blogposts) {
            if (blogposts.hasOwnProperty(b)) {
                var bHeader = blogposts[b].h.substr(0, 50).trim().toLowerCase()
                    .replace(/( )+/g, '-')
                    .replace(/[^\dA-Za-z-]/g, '')
                    .replace(/(-)+/g, '-');
                blogHeaders[bHeader] = b;
                blogposts[b].th = bHeader;
            }
        }
        if (page.substr(0, 5) === 'blog/') {
            // we arrived here to load all blogs, with a specific requested blog
            pagemetadata();
        }
        loadingDialog.hide();
        init_blog_callback();
    });
}

function blog_load() {
    $('body').addClass('blog-new');
    var blogcontent = '';
    var a = 0;
    var blogstart = blogpage * bloglimit - bloglimit;
    for (var i in blogposts) {
        if (blogposts.hasOwnProperty(i)) {
            var mm = blog_month(blogposts[i].t);

            if ((blogmonth && (mm === blogmonth)) || ((!blogmonth) && (!blogsearch))
                    || (blogsearch && (blog_searchmath(blogposts[i], blogsearch)))) {
                var introtxt = blogposts[i].introtxt;
                introtxt += ' [...]';
                if (a >= blogstart && a < bloglimit * blogpage) {
                    var by = 'Admin';
                    if (blogposts[i].by) {
                        by = blogposts[i].by;
                    }
                    blogcontent += '<div class="blog-new-item" data-blogid="blog/' + escapeHTML(blogposts[i].th) + '">';
                    blogcontent += '<h2>' + escapeHTML(blogposts[i].h) + '</h2>';
                    blogcontent += '<div class="blog-new-small">' + acc_time2date(blogposts[i].t) + '</div>';
                    blogcontent += '<div class="blog-new-date-div"></div>';
                    blogcontent += '<div class="blog-new-small"><span>By:</span> ' + escapeHTML(by) + '</div>';
                    blogcontent += '<div class="clear"></div><img alt="" data-img="loading_'
                        + escapeHTML(blogposts[i].attaches.simg) + '" src="'
                        + escapeHTML(CMS.img2(blogposts[i].attaches.simg)) + '" />';
                    blogcontent += '<p><span class="blog-new-description">' + introtxt + '</span>';
                    blogcontent += '<a class="blog-new-read-more">' + l[8512] + '</a>';
                    blogcontent += '<span class="clear"></span></p> </div>';
                }
                a++;
            }
        }
    }
    if (a === 0) {
        page = 'blogarticle';
        loadSubPage('blog');
        return;
    }
    blogpostnum = a;
    if (m) {
        $('.privacy-page').safeHTML(blogcontent);
    }
    else {
        blog_archive();
        blogcontent += blog_pager();
        $('.blog-new-left').safeHTML(blogcontent);
        $('.blog-new-read-more, .blog-new-item img, .blog-new-item h2').rebind('click', function() {
            loadSubPage($(this).parents('.blog-new-item').data('blogid'));
        });
        $('.blog-pagination-button').rebind('click', function() {
            var c = $(this).attr('class');
            if (c && c.indexOf('next') > -1) {
                blogpage += 1;
            }
            else if (c && c.indexOf('previous') > -1) {
                blogpage -= 1;
            }
            else if (c && c.indexOf('to-the-end') > -1) {
                blogpage = Math.ceil(blogpostnum / bloglimit);
            }
            else if (c && c.indexOf('to-the-beggining') > -1) {
                blogpage = 1;
            }
            else if (c) {
                blogpage = parseInt(c.replace('blog-pagination-button ', ''));
            }
            if (blogpage < 1) {
                blogpage = 1;
            }
            if (blogpage > Math.ceil(blogpostnum / bloglimit)) {
                blogpage = Math.ceil(blogpostnum / bloglimit);
            }
            blog_load();
        });
        if (blogpage === Math.ceil(blogpostnum / bloglimit)) {
            $('.blog-pagination-button.next,.blog-pagination-button.to-the-end').addClass('unavailable');
        }
        if (blogpage === 1) {
            $('.blog-pagination-button.previous,.blog-pagination-button.to-the-beggining').addClass('unavailable');
        }
        $('.blog-pagination-button.' + blogpage).addClass('active');
        if (blogsearch) {
            $('#blog_searchinput').val(blogsearch);
            var restxt = '';
            if (a === 0) {
                restxt = ' (no results)';
            }
            else if (a === 1) {
                restxt = ' (1 result)';
            }
            else {
                restxt = ' (' + a + ' results)';
            }
            $('.privacy-top-pad h1').text('Blog search for: "' + blogsearch + '"' + restxt);
        }
        else {
            $('.privacy-top-pad h1').text('Blog');
        }
    }
}

function blog_pager() {
    var pages = Math.ceil(blogpostnum / bloglimit);
    if (pages === 1) {
        return '';
    }
    var blogpages = '';
    var i = 0;

    while (i < pages) {
        blogpages += '<div class="blog-pagination-button ' + (i + 1) + '">' + (i + 1) + '</div>';
        i++;
    }
    var blogpager = '<div class="blog-pagination">' +
        '<div class="blog-pagination-pad">' +
            '<div class="blog-pagination-button to-the-beggining"></div>' +
            '<div class="blog-pagination-button previous"></div>'
            + blogpages +
            '<div class="blog-pagination-button next"></div>' +
            '<div class="blog-pagination-button to-the-end"></div>' +
        '</div>' +
    '</div>';
    return blogpager;
}


function blog_searchmath(post, keyword) {
    if (htmlentities(post.c).toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
        return true;
    }
    if (htmlentities(post.h).toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
        return true;
    }
    return false;
}



function blog_search() {
    loadSubPage('blogsearch/' + encodeURIComponent($('#blog_searchinput').val()));
}

function blog_month(t) {
    var d = new Date(t * 1000);
    return d.getFullYear() + '_' + (parseInt(d.getMonth()) + 1);
}


function blog_archive() {
    var mm;
    var blogmonths = [];
    for (var i in blogposts) {
        if (blogposts.hasOwnProperty(i)) {
            mm = blog_month(blogposts[i].t);
            if (blogmonths[mm]) {
                blogmonths[mm]++;
            }
            else {
                blogmonths[mm] = 1;
            }
        }
    }

    var blogarchive = '';
    for (mm in blogmonths) {
        if (blogmonths.hasOwnProperty(mm)) {
            mm = escapeHTML(mm);
            var y = mm.split('_')[0];

            var date = new Date();
            date.setMonth(parseInt(mm.split('_')[1]) - 1);
            date.setYear(y);
            date.setDate(1);
            date = date.getTime() / 1000;

            blogarchive += '<a href="/blog_' + mm + '" class="blog-new-archive-lnk clickurl">'
                + time2date(date, 3) + '<span class="blog-archive-number">'
                + escapeHTML(blogmonths[mm]) + '</span></a>';
        }
    }
    $('#blog_archive').safeHTML(blogarchive);
    clickURLs();
}


function blog_more() {
    bloglimit = bloglimit + 5;
    blog_load();
}

/**
 * This will attempt to load some valid page if the provided blog ID is invalid.
 * @return {void}
 */
function handleInvalidBlogID() {
    'use strict';
    var newPage = '';

    if (is_mobile) {
        var ids = Object.keys(blogposts).map(function(id) {
            return parseInt(id.replace('post_', ''));
        }).filter(function(a) {
            return a;
        }).sort(function(a, b) {
            return b - a;
        });

        if (ids.length > 0) {
            newPage = 'blog/' + blogposts['post_' + ids[0]].th;
        }
    }
    else {
        newPage = 'blog';
    }

    // This function can be triggered by the normal boot or the legacy system (which does not have loadSubPage)
    if (newPage && typeof loadSubPage === 'function') {
        loadSubPage(newPage);
    }
    else {
        window.location.replace('https://mega.nz/' + newPage);
    }
}


var eventHandlers = [
    "onabort",
    "onautocomplete",
    "onautocompleteerror",
    "oncancel",
    "oncanplay",
    "oncanplaythrough",
    "onchange",
    "onclick",
    "onclose",
    "oncontextmenu",
    "oncuechange",
    "ondblclick",
    "ondrag",
    "ondragend",
    "ondragenter",
    "ondragexit",
    "ondragleave",
    "ondragover",
    "ondragstart",
    "ondrop",
    "ondurationchange",
    "onemptied",
    "onended",
    "oninput",
    "oninvalid",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "onloadeddata",
    "onloadedmetadata",
    "onloadstart",
    "onmousedown",
    "onmouseenter",
    "onmouseleave",
    "onmousemove",
    "onmouseout",
    "onmouseover",
    "onmouseup",
    "onwheel",
    "onpause",
    "onplay",
    "onplaying",
    "onprogress",
    "onratechange",
    "onreset",
    "onseeked",
    "onseeking",
    "onselect",
    "onshow",
    "onsort",
    "onstalled",
    "onsubmit",
    "onsuspend",
    "ontimeupdate",
    "ontoggle",
    "onvolumechange",
    "onwaiting"
];

if (typeof mobileblog !== 'undefined') {
    var blogid = getSitePath().substr(1).replace('blog_', '');
    unsigned_blogposts(function() {

        var i = "post_" + blogid;
        var content = '';
        if (!blogposts[i]) {
            handleInvalidBlogID();
            return;
        }
        if (blogposts[i].attaches.bimg) {
            content += '<img alt="" data-img="loading_' + escapeHTML(blogposts[i].attaches.bimg)
                + '" src="https://cms2.mega.nz/unsigned/' + escapeHTML(blogposts[i].attaches.bimg)
                + '" class="blog-new-full-img" />';
        }
        content += blogposts[i].c;
        content = content.replace('[READMORE]', '').replace(/{staticpath}/g, staticpath);
        var date = new Date(blogposts[i].t * 1000);
        var blogdate = date.getDate() + '-' + (parseInt(date.getMonth()) + 1) + '-' + date.getFullYear();
        var markup = '<div class="bottom-page scroll-block">' +
            '<div class="main-content-block blog-new">' +
                '<div class="blog-new-full empty-bottom">' +
                    '<h2 id="blogarticle_title">' + escapeHTML(blogposts[i].h) + '</h2>' +
                    '<a href="/blog_22" id="blog_prev" class="blog-new-forward clickurl" style="opacity: 0.4;"></a>' +
                    '<a href="/blog_21" id="blog_next" class="blog-new-back clickurl active" style="opacity: 1;"></a>'+
                    '<div class="clear"></div>' +
                    '<div class="blog-new-small" id="blogarticle_date">' + blogdate + '</div>' +
                    '<div class="blog-new-date-div"></div>' +
                    '<div class="blog-new-small" id="blogarticle_by">' +
                        '<span>by:</span> ' + escapeHTML(blogposts[i].by || "Admin") +
                    '</div>' +
                    '<div class="clear"></div>' +
                    '<div id="blogarticle_post">' + content.replace(/(?:{|%7B)cmspath(?:%7D|})/g, 'https://cms2.mega.nz/') + '</div>' +
                    '<div class="clear"></div>' +
                '</div>' +
                '<div class="bottom-menu full-version">' +
                    '<div class="copyright-txt">Mega Limited ' + new Date().getFullYear() + '</div>' +
                    '<div class="clear"></div>' +
                '</div>' +
            '</div>' +
        '</div>';
        // XXX: This is ran on mobile devices with no access to $.safeHTML(), thus quick&dirty workaround
        document.body.innerHTML = markup.replace(/<\/?(?:html\:)?script[^>]*?>/gi, '')
            .replace(RegExp(' (' + eventHandlers.join("|") + ')', 'g'), ' data-dummy');

        // Prevent blog breaking on mobile due to missing jQuery
        if (!is_mobile) {
            clickURLs();
        } else {
            // Record blog post visit.
            onIdle(function() {
                var xhr = getxhr();
                xhr.open("POST", apipath + 'cs?id=0' + mega.urlParams(), true);
                xhr.send(JSON.stringify([{a: 'log', e: 99801, m: blogid}]));
            });
        }

        if (window.android) {
            document.body.className = 'android blog';
        }
        else if (window.is_ios) {
            document.body.className = 'ios blog';
        }
        else {
            document.body.className = 'another-os blog';
        }
    });
}
