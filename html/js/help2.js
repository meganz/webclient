
var Help = (function() {
    var ns = {};
    var clients = {};
    var Data = {};
    var ready = false;
    var doRender = false;
    var idx;
    var focus;
    var allTags = [];
    var titles = [];
    var isScrolling = false;
    var $window = $(window);
    var $currentQuestion = null;


    function tagUri(tag) {
        return tag.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    function contentChanged() {
        $('.main-scroll-block').data('jsp').reinitialise();
    }

    function tagsPerDocument(documents, isClient) {
        var tags = {};
        var tagsArr = [];
        if (isClient) {
            documents = documents.sections.map(function(section) {
                return section.questions.map(function(question) {
                    return question;
                });
            });
            documents = Array.prototype.concat.apply([], documents);
        }
        documents.forEach(function(doc) {
            (doc.tags || []).forEach(function(tag) {
                var url = tagUri(tag);
                if (!tags[url]) {
                    tags[url] = [tag, 0];
                }
                ++tags[url][1];
            });
        });

        for (var tag in tags) {
            if (tags.hasOwnProperty(tag)) {
                tagsArr.push({tag: tag, count: tags[tag][1], text: tags[tag][0]});
            }
        }

        return tagsArr.sort(function(a, b) {
            return b.count - a.count;
        });
    }

    function searchAnimations() {
        var buttons = $('.support-search,.support-go-back');
        buttons.rebind('mouseover', function() {
            $(this).addClass('hover');
        }).rebind('mouseout', function() {
            $(this).removeClass('hover');
        });

        $('.support-search').rebind('click', function(e) {

            e.preventDefault();
            var $this = $(this);
            var $container = $('#help2-main');
            var parent = $('.main-title-section');
            var $popularQuestions = $(".popular-question-block");
            var $searchForm = $(".support-search-container");
            var $getStartTitle = $(".getstart-title-section", $container);

            if ($this.is('.close')) {
                $('.support-search-heading').removeClass('hidden');
                $('.support-search-heading-close').addClass('hidden');
                $('.search-section').fadeOut(300);
                $this.removeClass('close');
                parent.removeClass('hidden');
                $popularQuestions.fadeOut(200);
                $searchForm.fadeOut(200);
                $getStartTitle.removeClass('hidden');
            } else {
                $('.support-search-heading').addClass('hidden');
                $('.support-search-heading-close').removeClass('hidden');
                $('.search-section').show();
                $this.addClass('close');
                parent.delay(240).addClass('hidden');
                $popularQuestions.fadeIn(500);
                $searchForm.fadeIn(400);
                $getStartTitle.addClass('hidden');

            }
        });
    }

    function url() {
        return 'help/' + toArray.apply(null, arguments).join("/");
    }

    function selectMenuItem($element, $elements) {
        if (isScrolling) {
            return;
        }
        $elements = $elements || $('.updateSelected.current');
        $elements.removeClass('current');
        $element.addClass('current');
        var $link = $($element.data('update'))
            .parent().
                find('.active').removeClass('active').end()
            .end()
            .addClass('active');

        delay('help2:selectMenuItem', function() {
            var state = $link.data('state');
            if (!state && $link.data('to')) {
                var parts = getUrlParts();
                // the url normally includes, 'help', 'client', 'webclient', and 'section'/'question'
                // set the first one as selected by default if it only has 'help', 'client', 'webclient'.
                if (parts.length > 3) {
                    parts.pop();
                }
                parts.push(String($link.data('to')).replace(/^[/#]+/, ''));
                state = parts.join('/');
            }
            var newpage = getCleanSitePath(state);
            if (newpage !== page && page.substr(0, 4) === 'help') {
                page = newpage;

                try {
                    history.pushState({subpage: newpage}, "", "/" + newpage);
                }
                catch (ex) {
                    skipHashChange = true;
                    location.hash = '#' + newpage;
                }
            }
        }, 1350);
    }


    function scrollTo(selector) {
        if (selector.length !== 1 || isScrolling) {
            return;
        }

        $('.main-scroll-block').one('jsp-user-scroll-y', function() {
            isScrolling = isScrolling === true ? false : isScrolling;
            selectMenuItem(selector);
        });
        $('.main-scroll-block').data('jsp').scrollByY(
            selector.offset().top,
            true
        );
        isScrolling = true;
    }

    function filterContentByTag(tag) {
        var $tag = $('.tag-' + tag);
        var $container = $('#help2-main');
        var validTags = [];

        if ($tag.is('.active')) {
            $tag.removeClass('active');
            allTags.splice(allTags.indexOf(tag), 1);
        } else {
            $tag.addClass('active');
            allTags.push(tag);
        }
        $('.content-by-tags', $container).each(function() {
            var $this = $(this);
            var tags  = $this.data('tags');

            var is = allTags.length === 0 || tags.length > 0;
            allTags.forEach(function(n) {
                if (tags.indexOf(n) === -1) {
                    is = false;
                    return false;
                }
            });

            if (!is) {
                $this.hide();
            } else {
                $this.show();
                validTags = validTags.concat(tags);
            }
        });

        $('.sidebar-tags-container .real-time-filter', $container).each(function() {
            var $this = $(this);
            if (validTags.indexOf($this.data('tag')) === -1) {
                $this.addClass('gray-inactive');
            } else {
                $this.removeClass('gray-inactive');
            }
        });

        contentChanged();
    }

    function patchLinks() {
        $('.d-section-items a, .popular-question-items a').each(function(i,el) {
            var url = $(el).attr('href') || $(el).data('fxhref');

            if (url) {
                $(el).attr('href', String(url).replace('#', '/'));
            }
        });
        $('.d-section-items a, .popular-question-items a').rebind('click',function(e) {
            var url = $(this).attr('href') || $(this).data('fxhref');
            if (url) {
                loadSubPage(url);
                return false;
            }
        });
    }

    function sidebars() {

        var $container = $('#help2-main');
        var $deviceTop = $(".device-selector-top", $container);
        var $deviceIcon = $(".device-menu-icon", $container);
        var $deviceMenu = $(".device-selector", $container);
        var $articleSlider = $(".sidebar-menu-slider", $container);
        var $articleList = $(".sidebar-menu-link:hover", $container);
        var $deviceHover = $('.device-container-hover', $container);
        var $tagContainer = $(".sidebar-tags-container", $container);
        var $deviceSelect = $('.device-select', $container);

        $container.find('form').rebind('submit', function(e) {
            e.preventDefault();

            // Log search submitted
            api_req({ a: 'log', e: 99619, m: 'Help2 regular search feature used' });

            loadSubPage(url("search", $(this).find('input[type="text"]').val()));
        });

        $container.find('form input[type=text]').each(function() {
            var $this = $(this);
            $this.autocomplete({
                source: function(request, response) {
                    var results = $.ui.autocomplete.filter(titles, request.term);
                    response(results.slice(0, 7));
                },
                appendTo: $this.parent().parent(),
                select: function(event, ui) {

                    // Log autocomplete item in search clicked
                    api_req({ a: 'log', e: 99620, m: 'Help2 autocomplete search feature used' });

                    $('.close-icon').trigger('click');

                    loadSubPage(ui.item.url);
                }
            });
            $this.data('ui-autocomplete')._renderItem = function(ul, item) {

                var $icon = $('<span>').addClass(item.client.toLowerCase() + ' client');
                var $label = $('<span>').addClass('label-text').text(item.label);

                return $('<li>')
                    .attr("data-value", item.value)
                    .append($icon)
                    .append($label)
                    .appendTo(ul);
            };
        });

        $('.support-tag', $container).rebind('click', function() {
            filterContentByTag($(this).data('tag'));
        });

        $('.real-time-filter', $container).rebind('click', function() {
            var $this = $(this);
            if (!$this.is('.gray-inactive')) {
                filterContentByTag($this.data('tag'));
            }
        });

        $deviceMenu.rebind('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if ($deviceMenu.is(":visible")){
                $deviceMenu.fadeOut(1000, "easeOutQuart");
                $deviceHover.fadeIn(500, "easeOutQuart");
                $deviceIcon.rotate(180, 0, 300, 'easeOutQuint').css('backgroundPosition', '-133px -307px');
                $articleSlider.css({"opacity":".1", "cursor":"default"});
                $tagContainer.css({"opacity":".1", "cursor":"default"});
                $articleList.unbind('mouseenter mouseleave');
            } else {
                $deviceIcon.rotate(0, 180, 300, 'easeOutQuint').css('backgroundPosition', '-133px -339px');
                $deviceTop.fadeOut(500, "easeOutQuart");
                $articleSlider.css({"opacity":"1", "cursor":"pointer"});
                $tagContainer.css({"opacity":"1", "cursor":"default"});
                $articleList.bind('mouseenter mouseleave');
            }
        });

        $(document).rebind('click.deviceHover', function() {
            if ($deviceHover.is(":visible")){
                $deviceHover.fadeOut(500, "easeOutQuart");
                $deviceMenu.fadeIn(500, "easeOutQuart");
                $articleSlider.css({"opacity":"1", "cursor":"pointer"});
                $tagContainer.css({"opacity":"1", "cursor":"default"});
                $deviceIcon.rotate(0, 180, 400, 'easeOutQuint');
            }
        });
    }


    // User Feedback Information section
    function userfeedback() {

        var $container = $('#help2-main');
        var $headFeedBack = $('.feedback-heading', $container);
        var $feedbackContainer = $('.article-feedback-container', $container);
        var $noIconThumb = $('.no-icon', $container);
        var $radioButtons = $('.adv-search-selected', $container);

        function sent($parent) {
            $('.feedback-buttons,.feedback-suggestions-list', $parent).delay(500).fadeOut(500);
            $parent.find($headFeedBack).delay(1000).fadeIn(500).children('p')
                .text('Thank you for your feedback.', contentChanged);
        }

        $('.feedback-no').rebind('click', function() {
            var $this = $(this);
            $noIconThumb.animate({marginTop: 12}, 200, 'easeOutQuint').animate({marginTop: 7}, 200, 'easeOutQuint');

            $this.parent().delay(200).fadeOut(400, function () {
                $this.prev().fadeOut(100);
            });

            $this.parent().parent().children($headFeedBack).delay(200).fadeOut(300);

            $this.parent().siblings('.feedback-suggestions-list').delay(500).fadeIn(500, contentChanged);

            $('.feedback-send').rebind('click', function() {
                var data = {hash: $this.data('hash')};
                $(this).parents('.feedback-suggestions-list').find('input,textarea')
                    .serializeArray().map(function(val) {
                        data[val.name] = val.value;
                    });

                $.post("https://cms2.mega.nz/feedback", data);
                sent($this.parents('.article-feedback-container'));

            });
        });

        $('.feedback-yes').rebind('click', function() {
            var $this = $(this);
            $this.find('.icon').animate({marginTop: 1}, 200, 'easeOutQuint')
                         .animate({marginTop: 6}, 200, 'easeOutQuint');

            $.post("https://cms2.mega.nz/feedback", {hash: $this.data('hash')});
            sent($this.parents('.article-feedback-container'));
        });

        // When a radio button is clicked
        $radioButtons.rebind('click', function() {
            // Remove existing checked styles from the other radio buttons
            $radioButtons.removeClass('checked');

            // Check just the selected radio button
            $(this).addClass('checked');
            $(this).find('input').prop('checked', true);
        });
    }


    // Home Page Panel Interaction
    function homepageinteraction() {

        var $container = $('#help2-main');
        var $mobileDeviceBlock = $(".block-mobile-device", $container);
        var $mobileNavBlock = $(".mobile-block", $container);
        var timer;

        $mobileNavBlock
            .rebind('mouseenter', function() {
                timer = setTimeout(function() {
                    $mobileDeviceBlock.fadeIn(300);
                }, 400);
            })
            .rebind('mouseleave', function() {
                clearTimeout(timer);
                $mobileDeviceBlock.fadeOut(200);
            });
    }

    function searchBarInteraction() {

        var $container = $('#help2-main');
        var $inputSearch = $("input.search", $container);
        var $sideBar = $(".sidebar-menu-container", $container);
        var $autoSuggestContainer = $(".ui-autocomplete", $container);
        var $popularQuestions = $(".search-section .popular-question-block");

        $inputSearch.on('focus', function () {
            $sideBar.animate({opacity:'0.6'}, 300, "easeOutQuart");
            $popularQuestions.animate({opacity:'0.3'}, 400, "easeOutQuart");
            $autoSuggestContainer.animate({marginTop: 72 }, 100, "easeOutQuart");
        });

        $inputSearch.on('blur', function () {
            $sideBar.animate({opacity:'1'}, 200, "easeOutQuart");
            $popularQuestions.animate({opacity:'1'}, 200, "easeOutQuart");
        });
    }

    // Header functions including search and go back buttons

    function headerInteraction() {

        var $container = $('#help2-main');
        var $goBackContainer = $(".support-go-back", $container);
        var $goBackArrow = $(".support-go-back-icon", $container);
        var $searchContainer = $(".support-search", $container);
        var $searchMagnifyGlass = $(".support-search-icon", $container);
        var $sideBar = $(".sidebar-menu-container", $container);
        var $mainTitleSection = $('.main-title-section', $container);
        var $searchHeader = $(".support-section-header", $container);
        var $cloneHeader = $(".support-section-header-clone", $container);
        var $closeIcon = $(".close-icon", $container);
        var $getStartTitle = $(".getstart-title-section", $container);
        var timer;

        // Arrow Animation for Go back block
        $goBackContainer
            .rebind('mouseenter', function() {
                timer = setTimeout(function() {
                    $goBackArrow.animate({marginRight: 8}, 300, "easeOutQuart");
                }, 300);
            })
            .rebind('mouseleave', function() {
                clearTimeout(timer);
                $goBackArrow.animate({marginRight: 16}, 300, "easeOutQuart");
            });

        $closeIcon.rebind('click', function() {
            if (($mainTitleSection.hasClass('hidden')) || ($getStartTitle.hasClass('hidden'))) {
                $('.search-section').fadeOut(300);
                $(".support-search").addClass('close');
                $mainTitleSection.removeClass('hidden');
                $('.support-search-heading').removeClass('hidden');
                $('.support-search-heading-close').addClass('hidden');
                $getStartTitle.removeClass('hidden');
            }
        });

        if ($mainTitleSection.hasClass('hidden')) {
            $cloneHeader.hide();
            $searchHeader.fadeIn(300);
        } else {
            $cloneHeader.fadeIn(300);
            $searchHeader.hide();
        }

        var $html = $('html,body');

        $html.rebind('scroll.help2', function() {
            // TODO: write a cleanup function to be invoked when moving out of the #help section
            if (String(getSitePath()).substr(0, 5) !== '/help') {
                return $html.unbind('scroll.help2');
            }

            if (($sideBar.hasClass('fixed')) && (($sideBar).is(":visible"))) {
                $searchHeader.fadeOut(10);
                $cloneHeader.fadeIn(300);
            } else {
                $searchHeader.fadeIn(300);
                $cloneHeader.fadeOut(10);
            }
        }).trigger('scroll');

        $searchContainer
            .rebind('mouseenter', function() {
                timer = setTimeout(function() {
                    $searchMagnifyGlass.animate({
                        marginLeft: "8",
                        marginRight: "8"
                    }, 300, "easeOutQuart");
                }, 300);
            })
            .rebind('mouseleave', function() {
                clearTimeout(timer);
                $searchMagnifyGlass.animate({
                    marginLeft: "16",
                    marginRight: "0"
                }, 300, "easeOutQuart");
            });
    }


    var urls = {
        "search": function(args) {
            var searchTerm = String(args[1]);

            if (searchTerm.indexOf('%25') >= 0) {
                do {
                    searchTerm = searchTerm.replace(/%25/g, '%');
                } while (searchTerm.indexOf('%25') >= 0);
            }
            try {
                searchTerm = decodeURIComponent(searchTerm);
            }
            catch (e) {}

            searchTerm = searchTerm.replace(/[+-]/g, " ");

            var articles = idx.search.search(searchTerm, {
                fields: {
                    title: {boost: 2, bool: "AND"},
                    body: {boost: 1},
                    tags: {boots: 3},
                },
                bool: "AND",
                expand: true
            }).map(function(result) {
                return idx.all[result.ref];
            });

            parsepage(Data.help_search_tpl.html);

            $('#help2-main .search').val(searchTerm);

            if (articles.length === 0) {
                $('.search-404-block').show();
                $('.main-search-pad,.sidebar-menu-container').hide();
            } else {
                $('.search-404-block').hide();
                $('.main-search-pad,.sidebar-menu-container').show();
            }

            articles.reverse().map(function(article) {
                var $article = $('<div>').addClass("search-result link content-by-tags")
                    .data('href', "help/client/" + article.id)
                    .data('tags', article.tags.map(function(w) { return tagUri(w); }));

                $('<div>').addClass('search-result-title')
                    .text(article.title)
                    .appendTo($article);

                $('<div>').addClass('search-result-content')
                    .text(article.body)
                    .appendTo($article);

                var $footer = $('<div>').addClass('search-result-footer')
                    .appendTo($article);

                $('<div>').addClass('search-result-filter')
                    .append($('<div>').addClass('result-filter-icon'))
                    .append($('<div>').addClass('result-filter-result').text(article.ups))
                    .appendTo($footer);

                article.tags.map(function(tag) {
                    $('<div>').addClass('support-tag tag-' + tagUri(tag))
                        .data('tag', tagUri(tag))
                        .text(tag)
                        .appendTo($footer);
                });

                $article.prependTo('.main-search-pad');
            });

            tagsPerDocument(articles).map(function(tag) {
                $('<div>').addClass('tag-' + tag.tag)
                    .addClass('support-tag real-time-filter')
                    .data('tag', tag.tag)
                    .text(tag.text + " " + tag.count)
                    .appendTo('.sidebar-tags-container');
            });

        },
        "client": function(args) {
            if (args[1] === 'mobile') {
                args[1] = 'android';
                loadSubPage(url.apply(null, args));
                return;
            }

            args.shift();
            var question = "";
            if (args.length === 3 || args.length === 2) {
                question = args.pop();
            } else if (args.length !== 1) {
                loadSubPage('help');
                return;
            }



            var data = Data["help_" + args.join("_")];
            if (!data) {
                loadSubPage('help');
                return;
            }

            parsepage(data.html);

            $('.support-email-icon').rebind('click', function() {
                var parts = getUrlParts($(this).parents('.support-article').attr('id'));
                window.helpOrigin = parts.join('/');
                var newpage = 'support';
                if (!u_type) {
                    login_next = newpage;
                    newpage = "login";
                }
                loadSubPage(newpage);
            });

            $('.support-link-icon').rebind('click', function() {
                var parts = getUrlParts($(this).parents('.support-article').attr('id'));

                var link = 'https://mega.nz/' + parts.join('/');
                var $input = $('.share-help').removeClass('hidden')
                    .find('input').val(link)
                    .focus().select();
                $('.fm-dialog-close').rebind('click', function() {
                    $('.share-help').addClass('hidden');
                    fm_hideoverlay();
                });
                $('.copy-to-clipboard').rebind('click', function() {
                    var success = true;
                    if (is_chrome_firefox) {
                        mozSetClipboard(link);
                    } else {
                        $('#chromeclipboard1').html(link);
                        selectText('chromeclipboard1');
                        success = document.execCommand('copy');
                    }

                    if (success) {
                        showToast('clipboard', l[7654]);
                    }
                });
                fm_showoverlay();
            });

            if (question) {
                $currentQuestion = $('#' + question);
                setTimeout(function() {
                    scrollTo($currentQuestion);
                }, 400);
            }
        },
        "welcome": function welcome(args) {
            parsepage(Data.help_index.html);
        }
    };

    function getUrlParts(section) {
        var parts = getSitePath().split('/').map(String.trim).filter(String);

        if (section) {
            parts.pop();
            parts.push(section);
        }

        return parts;
    }


    function doRouting() {
        var parts = getUrlParts();

        if (urls[parts[1]]) {
            return urls[parts[1]](parts.slice(1));
        }

        if (parts.length === 1) {
            return urls.welcome();
        }

        // init page here instead with page set as 'help' ?!
        // document.location.href = "#help";
        //loadSubPage('help');
    }

    // getVisibleElement
    function getVisibleElement(positionY, args) {

        args = args.map(function($element) {
            if ($element.length === 0) {
                return null;
            }
            var top = $element.offset().top;
            var height = $element.height() - 250;
            return top >= -1 * height && top < positionY
               ? [$element, top - 1 * height, top, positionY]
               : null;
        }).filter(function(m) {
            return m;
        });

        if (args.length === 0) {
            return false;
        }

        return args[0][0];
    }

    function handleScroll() {

        var $main = $('#help2-main');
        var $menu = $('.sidebar-menu-container:visible');
        var menuHeight = $menu.height();
        var top   = $('.help-background-block').height();
        var $elements = $('.updateSelected:visible', $main);
        var isBottomScrolling;

        $window.rebind('resize.help2', function() {
            if ($('#help2-main').length === 0) {
                return $window.unbind('resize.help2');
            }
            contentChanged();
        });

        $('.main-scroll-block').rebind('jsp-scroll-y.help2', function(e, scrollPositionY, atTop, atBottom) {

            if ($('#help2-main').length === 0) {
                return $('.main-scroll-block').unbind('jsp-scroll-y.help2');
            }

            var $current = $($('.updateSelected.current')[0]);
            var jspHeight = $main.height();

            if ($current.length === 0) {
                selectMenuItem($elements.eq(0), $current);
            } else {
                var $new = getVisibleElement(scrollPositionY, [$current.prev(), $current, $current.next()]);
                if ($new && $new !== $current) {
                    selectMenuItem($new, $current);
                }
            }

            if (jspHeight - scrollPositionY < menuHeight) {
                if (!isBottomScrolling) {
                    isBottomScrolling = true;
                    $menu.css('margin-top', scrollPositionY - 290).removeClass('fixed');
                }
                return;
            }

            isBottomScrolling = false;
            if (scrollPositionY >= top) {
                $menu.removeAttr('style').addClass('fixed');
            } else {
                $menu.removeClass('fixed');
            }
        });
    }


    ns.loadfromCMS = function(callback)
    {
        CMS.index("help_" + lang, function(err, blobs)
        {
            if (err) {
                return alert("Invalid response from the server");
            }

            for (var name in blobs) {
                if (blobs.hasOwnProperty(name)) {
                    blobs[name.replace(/\.[a-z]{2}$/, '')] = blobs[name];
                }
            }

            Data = blobs;
            titles = blobs.help_search.object.map(function(entry) {
                entry.label = entry.title;
                entry.value = entry.title;
                entry.url   = "help/client/" + entry.id;
                return entry;
            });


            idx = {
                search: elasticlunr(function() {
                    this.setRef('pos');
                    this.addField('title', { boost: 10 });
                    this.addField('tags', { boost: 100 });
                    this.addField('body');
                }),
                all: Data.help_search.object
            };

            Data.help_search.object.map(function(obj, id) {
                obj.pos = id;
                obj.tags = obj.tags.split(/, /);
                idx.search.addDoc(obj);
            });

            ready = true;
            if (doRender) {
                ns.render();
                loadingDialog.hide();
            }

            if (callback) {
                callback();
            }
        });
    };

    mBroadcaster.once('startMega', ns.loadfromCMS.bind(ns, null));

    var helpAlreadyLogged;
    ns.render = function() {
        // reset all tags

        if (!ready) {
            doRender = true;
            loadingDialog.show();
            return;
        }

        allTags = [];
        $currentQuestion = null;

        doRouting();
        topmenuUI();
        sidebars();
        mainScroll();
        userfeedback();
        homepageinteraction();
        searchBarInteraction();
        headerInteraction();
        searchAnimations();
        patchLinks();

        // Log that the help page has been viewed
        if (!helpAlreadyLogged) {
            helpAlreadyLogged = true;
            api_req({
                a: 'log',
                e: 99332,
                m: 'web help viewed'
            });
        }

        $('#help2-main .link').rebind('click', function(e) {
            var $this = $(this);
            e.preventDefault();

            if (!$this.is('.disabled') && $this.data('href')) {
                var url = getCleanSitePath($this.data('href').replace('https://mega.nz', ''));
                if (url === 'support' && !u_type) {
                    login_next = url;
                    url = "login";
                }
                // Log that they clicked on the panel
                api_req({ a: 'log', e: 99621, m: 'Help2 client selection panel used' });
                loadSubPage(url);
            }
        });

        $('#help2-main').find('.scrollTo').rebind('click', function() {
            var $this = $(this);
            if (!$this.is('.gray-inactive')) {
                scrollTo($($(this).data('to')));
            }
            return false;
        });

        // FAQ items logging
        $('#help2-main .popular-question-items a').rebind('click.help2', function() {
            api_req({ a: 'log', e: 99622, m: 'Help2 FAQ item selected' });
        });

        // Image Gallery Interaction
        $('.instructions .image-instruction-control, .gallery-dot-navigation li, .bullet-number', '#help2-main')
            .rebind('click', function() {

                var $this = $(this);
                var $cnt = $this.parents('.container');
                var id   = $this.data('photo');

                $cnt.find('.active-nav-dot').addClass('nav-dots')
                    .removeClass('active-nav-dot');

                // Adding and removing active state to instructions and bullet point on click
                $cnt.find('.img-swap.img-active').removeClass('img-active');
                $cnt.find('.bullet-number.selected-bullet').removeClass('selected-bullet');
                $cnt.find('.image-instruction-control.active-instructions').removeClass('active-instructions');

                $cnt.find('.instruction-' + id).addClass('active-instructions');
                $cnt.find('.bullet-' + id).addClass('selected-bullet');
                $cnt.find('.dot-' + id).addClass('active-nav-dot').removeClass('nav-dots');

                $cnt.find('.photo-id-' + id).addClass('img-active');
            });

        // Adding and removing active state to instructions and bullet point on Hover
        var $instructions = $('#help2-main .instructions .image-instruction-control');
        $instructions.rebind('mouseenter', function() {
            var $this = $(this);
            var $cnt = $this.parents('.container');

            $this.prev().addClass('selected-bullet');
        });

        $instructions.rebind('mouseleave', function() {
            var $this = $(this);
            var $cnt = $this.parents('.container');

            if ($this.hasClass('active-instructions')) {
                $this.prev().addClass('selected-bullet');
            } else {
                $this.prev().removeClass('selected-bullet');
            }
        });

        // Adding and removing active state to instructions and bullet point on Hover for bulletpoints
        var $bullet = $('#help2-main .instructions .bullet-number');
        $bullet.rebind('mouseenter', function() {
            var $this = $(this);
            var $cnt = $this.parents('.container');

            $this.addClass('selected-bullet');
        }).rebind('mouseleave', function() {
            var $this = $(this);
            var $cnt = $this.parents('.container');


            if ($this.next().hasClass('active-instructions')) {
                $this.addClass('selected-bullet');
            } else {
                $this.removeClass('selected-bullet');
            }
        });

        handleScroll();
    };

    return ns;
})();
