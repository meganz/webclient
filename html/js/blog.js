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

var bloglimit = 5;
var blogpage = 1;

var blogpostnum;

var blogmonth = false;
var blogsearch = false;

function loadBlog() {
    'use strict';
    blogid = false;
    blogmonth = false;
    blogsearch = false;
    if (page.length > 4) {
        if (page.substr(0, 10) === 'blogsearch') {
            // Redirect to /blog/search/query
            const loc = page.replace('blogsearch', '/blog/search');
            if (is_extension) {
                return loadSubPage(loc);
            }
            return location.replace(loc);
        }
        else if (page.substr(0, 5) === 'blog_') {
            if (page.length >= 10) {
                // Redirect to /blog/date/yyyy/mm
                const dateParts = page.substr(5, page.length - 2).split('_');
                const loc = `/blog/date/${dateParts[0]}/${dateParts[1]}`;
                if (is_extension) {
                    return loadSubPage(loc);
                }
                return location.replace(loc);
            }
            // Load /blog_id URL
            blogid = page.substr(5, page.length - 2);
            page = 'blogarticle';
            init_blogarticle();
        }
        else {
            const urlParts = page.split('/');
            if (urlParts.length === 2) {
                // Load a /blog/title URL
                blogid = true;
                init_blogarticle();
            }
            else if (urlParts.length >= 3) {
                if (urlParts[1] === 'date') {
                    // Load /blog/date/yyyy(?/mm) URL
                    const yearPart = decodeURIComponent(urlParts[2]);
                    const monthPart = urlParts.length > 3 ? decodeURIComponent(urlParts[3]) : '0';

                    if (/^\d+$/.test(yearPart + monthPart)) {
                        blogmonth = `${yearPart}_${parseInt(monthPart)}`;
                        blogpage = 1;
                    }
                    else {
                        page = 'blog';
                    }
                }
                else if (urlParts[1] === 'search') {
                    // Load /blog/search/query URL
                    blogsearch = decodeURIComponent(urlParts[2]);
                    if (!blogsearch) {
                        page = 'blog';
                    }
                }
                else {
                    page = 'blog';
                }
                parsepage(pages.blog);
                init_blog();
            }
            else {
                page = 'blog';
                parsepage(pages.blog);
                init_blog();
            }
        }
    }
    else {
        // Load the /blog page
        parsepage(pages.blog);
        init_blog();
        api_req({ a: 'log', e: 99740, m: window.u_handle || 'visitor' });
    }
}

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
    if (blogid) {
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

    CMS.scope = 'blog';

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
                var bHeader = urlFromTitle(blogposts[b].h);
                blogHeaders[bHeader] = b;
                blogposts[b].th = bHeader;
            }
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
    $('.rss-lnk', '.blog-new').attr('href', cmsStaticPath + 'blog/unsigned/blog.rss');
    for (var i in blogposts) {
        if (blogposts.hasOwnProperty(i)) {
            var mm = blog_month(blogposts[i].t);

            if (
                (blogmonth && ((mm === blogmonth)
                    || (
                        // If the month = 0 we are requesting the year so match that instead
                        parseInt(blogmonth.split('_')[1]) === 0
                        && parseInt(mm.split('_')[0]) === parseInt(blogmonth.split('_')[0])
                    ))
                )
                || ((!blogmonth) && (!blogsearch))
                || (blogsearch && (blog_searchmath(blogposts[i], blogsearch)))
            ) {
                var introtxt = blogposts[i].introtxt;
                introtxt += ' [...]';
                if (a >= blogstart && a < bloglimit * blogpage) {
                    var by = 'Admin';
                    if (blogposts[i].by) {
                        by = blogposts[i].by;
                    }
                    const href = `/blog/${escapeHTML(blogposts[i].th)}`;
                    blogcontent += '<div class="blog-new-item" data-blogid="blog/' + escapeHTML(blogposts[i].th) + '">';
                    blogcontent += `<h2><a href="${href}" class="clickurl">${escapeHTML(blogposts[i].h)}</a></h2>`;
                    blogcontent += '<div class="blog-new-small">' + acc_time2date(blogposts[i].t) + '</div>';
                    blogcontent += '<div class="blog-new-date-div"></div>';
                    blogcontent += '<div class="blog-new-small"><span>By:</span> ' + escapeHTML(by) + '</div>';
                    blogcontent += `<div class="clear"></div><a class="clickurl" href="${href}"><img alt=""
                                         data-img="loading_${escapeHTML(blogposts[i].attaches.simg)}"
                                         src="${CMS.img(blogposts[i].attaches.simg)}" /></a>`;
                    blogcontent += '<p><span class="blog-new-description">' + introtxt + '</span>';
                    blogcontent += `<a class="blog-new-read-more clickurl" href="${href}">${l[8512]}</a>`;
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
        clickURLs();
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
    loadSubPage(`blog/search/${encodeURIComponent($('#blog_searchinput', '.blog-new-right').val())}`);
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

    const blogarchive = [];
    const blogyears = [];
    for (mm in blogmonths) {
        if (blogmonths.hasOwnProperty(mm)) {
            mm = escapeHTML(mm);
            var y = mm.split('_')[0];
            if (blogyears[y]) {
                blogyears[y] += blogmonths[mm];
            }
            else {
                blogyears[y] = blogmonths[mm];
            }
        }
    }
    const archiveClasslist = 'blog-new-archive-lnk clickurl';
    for (let yy in blogyears) {
        if (blogyears.hasOwnProperty(yy)) {
            yy = escapeHTML(yy);
            blogarchive.unshift(
                `<div class="blog-archive-button slide-in-out ts-500 closed">
                    <div class="head-title">
                        <i class="sprite-fm-mono icon-arrow-right expand"></i>
                        <span>
                            <a class="blog-year ${archiveClasslist}" href="/blog/date/${yy}">
                                ${yy}<span class="blog-archive-number">${escapeHTML(blogyears[yy])}</span>
                            </a>
                        </span>
                    </div>
                    <div class="sub-menu slide-item blogyears-${yy}"></div>
                </div>`
            );
        }
    }
    const $archive = $('#blog_archive', '.blog-new-right');
    $archive.safeHTML(blogarchive.join(''));
    for (mm in blogmonths) {
        if (blogmonths.hasOwnProperty(mm)) {
            mm = escapeHTML(mm);
            const y = mm.split('_')[0];

            var date = new Date();
            date.setMonth(parseInt(mm.split('_')[1]) - 1);
            date.setYear(y);
            date.setDate(1);
            date = date.getTime() / 1000;
            const countspan = `<span class="blog-archive-number">${escapeHTML(blogmonths[mm])}</span>`;
            $(`.blogyears-${y}`, $archive).safeAppend(`
                <div class="sub-title blogmonths-${mm.split('_')[1]}">
                    <a href="/blog/date/${y}/${mm.split('_')[1]}"
                       class="${archiveClasslist}">${time2date(date, 3)}${countspan}</a>
                </div>
            `);
        }
    }
    bindArchiveEvents($archive);
    let $button = $('.blog-archive-button', $archive).eq(0);
    if (blogsearch) {
        $('i', $button).click();
        return;
    }
    if (blogmonth) {
        const month = parseInt(blogmonth.split('_')[1]);
        $button = $(`.blogyears-${blogmonth.split('_')[0]}`, $archive).closest('.blog-archive-button');
        $('i', $button).click();
        if (month) {
            $(`.blogmonths-${month}`, $archive).addClass('active');
        }
        else {
            $button.addClass('active');
        }
    }
    else {
        $button.addClass('active');
        $('i', $button).click();
    }

}

function bindArchiveEvents($archive) {
    'use strict';
    $('.blog-archive-button', $archive).rebind('click.blog', function(e) {
        e.stopPropagation();
        $('a.blog-year', this).click();
    });
    $('.blog-archive-button i', $archive).rebind('click.blog', function(e) {
        e.stopPropagation();
        $(this).closest('.blog-archive-button').toggleClass('closed');
    });
    $('.blog-archive-button .sub-title', $archive).rebind('click.blog', function() {
        $('a.blog-new-archive-lnk', this).trigger('click');
    });
    clickURLs();
}

function urlFromTitle(title) {
    'use strict';

    return title.substr(0, 50).trim().toLowerCase()
        .replace(/( )+/g, '-')
        .replace(/[^\dA-Za-z-]/g, '')
        .replace(/(-)+/g, '-');
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
        blogid = false;
    }

    // This function can be triggered by the normal boot or the legacy system (which does not have loadSubPage)
    if (newPage && typeof loadSubPage === 'function') {
        loadSubPage(newPage);
    }
    else {
        window.location.replace(`${getBaseUrl()}/` + newPage);
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
    blogid = getSitePath().substr(1).replace('blog_', '');
    CMS.scope = 'blog';
    CMS.get('blog', function(err, data) {
        'use strict';
        blogposts = data.object;
        var i = "post_" + blogid;
        var content = '';
        if (!blogposts[i]) {
            handleInvalidBlogID();
            return;
        }
        if (blogposts[i].attaches.bimg) {
            content += '<img alt="" data-img="loading_' + escapeHTML(blogposts[i].attaches.bimg)
                + '" src="' + CMS.img(blogposts[i].attaches.bimg)
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
                    '<a href="/blog/mega-exits-beta" id="blog_prev" class="blog-new-forward clickurl"' +
                    ' style="opacity: 0.4;"></a>' +
                    '<a href="/blog/new-zealand-storage-node-now-live" id="blog_next" class="blog-new-back clickurl ' +
                    'active" style="opacity: 1;"></a>' +
                    '<div class="clear"></div>' +
                    '<div class="blog-new-small" id="blogarticle_date">' + blogdate + '</div>' +
                    '<div class="blog-new-date-div"></div>' +
                    '<div class="blog-new-small" id="blogarticle_by">' +
                        '<span>by:</span> ' + escapeHTML(blogposts[i].by || "Admin") +
                    '</div>' +
                    '<div class="clear"></div>' +
                    '<div id="blogarticle_post">' + CMS.parse(content) + '</div>' +
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
        if (is_mobile) {
            // Record blog post visit.
            onIdle(function() {
                var xhr = getxhr();
                xhr.open("POST", apipath + 'cs?id=0' + mega.urlParams(), true);
                xhr.send(JSON.stringify([{
                    a: 'log', e: 99801,
                    m: blogid
                }]));
            });
        }
        else {
            clickURLs();
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
