// We only want to log that they visited the help page once
var helpAlreadyLogged = false;

function init_help() {
    /* jshint -W074 */
    var subpage = '';
    var search = '';
    if (page.length > 4) {
        subpage = page.substr(5, page.length - 1);
    }
    if (subpage.substr(0, 6) === 'search') {
        search = subpage.replace('search/', '');
        subpage = '';
    }
    $('.new-left-menu-link,.help-block').rebind('click', function(e) {
        var c = $(this).attr('class').replace(/.+ /, '');
        if (!c) {
            return false;
        }

        if (c === 'home') {
            document.location.hash = 'help';
        }
        else {
            document.location.hash = 'help/' + c;
        }
    });

    // Log that the help page has been viewed
    if (!helpAlreadyLogged) {
        helpAlreadyLogged = true;
        api_req({
            a: 'log',
            e: 99332,
            m: 'web help viewed'
        });
    }

    $('.new-left-menu-link.home').addClass('active');

    $('.new-right-content-block').addClass('hidden');
    if (search) {
        var markup = '<h1 class="help-home-header">Help Centre - <span class="red">search</span></h1>' +
            '<div class="blog-new-search"><input value="" class="help_search"/></div>' +
            '<div class="blog-new-div"><div></div></div>';

        var a = 0;
        for (var i in helpdata) {
            if (helpdata[i].q.toLowerCase().indexOf(search.toLowerCase()) > -1
                    || helpdata[i].a.toLowerCase().indexOf(search.toLowerCase()) > -1) {
                markup += '<h2>' + escapeHTML(helpdata[i].q) + '</h2>' + helpdata[i].a;
                a++;
            }
        }
        if (a === 0) {
            markup += '<h2>' + escapeHTML(l[978]) + '</h2>';
        }
        $('.new-right-content-block.help-info-pages').safeHTML(markup);
        $('.new-right-content-block.help-info-pages').removeClass('hidden');
        $('.help_search').val(search);
        mainScroll();
        scrollMenu();
    }
    else if (subpage) {
        $('.new-left-menu-link').removeClass('active');
        var id;
        var title;
        if (subpage === 'basics') {
            id = 0;
            title = 'Basics';
            $('.new-left-menu-link.basics').addClass('active');
        }
        else if (subpage === 'sharing') {
            id = 1;
            title = 'Sharing';
            $('.new-left-menu-link.sharing').addClass('active');
        }
        else if (subpage === 'security') {
            id = 2;
            title = 'Security & Privacy';
            $('.new-left-menu-link.security').addClass('active');
        }
        else if (subpage === 'account') {
            id = 3;
            title = 'Account';
            $('.new-left-menu-link.account').addClass('active');
        }
        else if (subpage === 'sync') {
            id = 4;
            title = 'Sync Client';
            $('.new-left-menu-link.sync').addClass('active');
        }
        else if (subpage === 'ios') {
            id = 5;
            title = 'iOS App';
            $('.new-left-menu-link.ios').addClass('active');
        }
        else if (subpage === 'android') {
            id = 6;
            title = 'Android App';
            $('.new-left-menu-link.android').addClass('active');
        }
        else if (subpage === 'mega-chat') {
            id = 7;
            title = 'MegaChat';
            $('.new-left-menu-link.mega-chat').addClass('active');
        }
        else if (subpage === 'windows-phone') {
            id = 8;
            title = 'Windows Phone App';
            $('.new-left-menu-link.windows-phone').addClass('active');
        }
        else if (subpage === 'blackberry') {
            id = 9;
            title = 'BlackBerry App';
            $('.new-left-menu-link.blackberry').addClass('active');
        }
        $('.new-right-content-block.help-info-pages').removeClass('hidden');
        $('.help-info-pages .sections').addClass('hidden');
        $('#section-' + subpage).removeClass('hidden');
        $('#section-' + subpage + " img").each(function() {
            this.onload = mainScroll;
        });
        mainScroll();
    }
    else {
        $('.new-right-content-block.home').removeClass('hidden');
    }
    $('.help_search').rebind('keyup', function(e) {
        if (e.keyCode === 13) {
            document.location.hash = 'help/search/' + $(this).val();
        }
    });
    $('.help_search').rebind('focus', function(e) {
        if ($(this).val() === l[102]) {
            $(this).val('');
        }
    });
    $('.help_search').rebind('blur', function(e) {
        if ($(this).val() === '') {
            $(this).val(l[102]);
        }
    });
    scrollMenu()
}


var aapp = 'https://play.google.com/store/apps/details?id=nz.mega.android&referrer=meganzhelp';
l[1212] = escapeHTML(l[1212])
    .replace('[A]', '<a href="#sdk" class="red">').replace('[/A]', '</a>');
l[1863] = escapeHTML(l[1863])
    .replace('[A]', '<a href="#mobile">')
    .replace('[/A]', '</a>')
    .replace('[B]', '<a href="https://itunes.apple.com/app/mega/id706857885" target="_blank" rel="noreferrer">')
    .replace('[/B]', '</a>')
    .replace('[C]', '<a href="' + aapp + '" target="_blank" rel="noreferrer">')
    .replace('[/C]', '</a>');
l[1862] = escapeHTML(l[1862])
    .replace('[A]', '<a href="' + aapp + '" target="_blank" rel="noreferrer">')
    .replace('[/A]', '</a>');
l[1860] = escapeHTML(l[1860])
    .replace('[A]', '<a href="https://itunes.apple.com/app/mega/id706857885" target="_blank" rel="noreferrer">')
    .replace('[/A]', '</a>');
l[1828] = escapeHTML(l[1828]).replace('[A]', '<a href="#sync">').replace('[/A]', '</a>');
l[1996] = escapeHTML(l[1996]).replace('[A]', '<a href="mailto:support@mega.nz">').replace('[/A]', '</a>');
l[1998] = escapeHTML(l[1998]).replace('[A]', '<a href="#backup">').replace('[/A]', '</a>');
l[1838] = escapeHTML(l[1838]).replace('"Debris"', '"Rubbish"');

var helpdata = [];
