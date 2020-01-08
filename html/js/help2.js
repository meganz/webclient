
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
    var $window = $(window);
    var $currentQuestion = null;

    function tagUri(tag) {
        return tag.toLowerCase().replace(/[^a-z0-9]/g, '_');
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
        var topPos = 0;
        var $container = $('#help2-main');

        $('.close-icon', $container).rebind('click', function() {

            $container.removeClass('search-overlay');
            $('.fmholder').scrollTop(topPos);
        });

        $('.support-search', $container).rebind('click', function(e) {
            e.preventDefault();

            if ($container.hasClass('search-overlay')) {
                $container.removeClass('search-overlay');
                $('.fmholder').scrollTop(topPos);
            }
            else {
                topPos = $('.fmholder').scrollTop();
                $container.addClass('search-overlay');
                $('.fmholder').scrollTop(0);
            }
        });
    }

    function url() {
        return 'help/' + toArray.apply(null, arguments).join('/').trim().replace(/\s/g, '+');
    }

    function selectMenuItem($element, $elements) {
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

                if (hashLogic) {
                    skipHashChange = true;
                    location.hash = '#' + newpage;
                }
                else {
                    history.pushState({subpage: newpage}, '', '/' + newpage);
                }
            }
        }, 100);
    }


    function helpScrollTo(selector) {
        var $target = $(selector);
        var $dataTarget = $('*[data-update="' + selector + '"]');
        if ($target.length) {
            selectMenuItem($target);
            $('.bottom-pages .fmholder').stop().animate({
                scrollTop: $target.position().top - 20
            }, 1000);
        }
        else if ($dataTarget.length) {
            selectMenuItem($dataTarget);
            $('.bottom-pages .fmholder').stop().animate({
                scrollTop: $('*[data-update="' + selector + '"]').position().top - 20
            }, 1000);
        }
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
    }

    function patchLinks() {
        $('.d-section-items a, .popular-question-items a, .related-articles-list a').each(function(i,el) {
            var url = $(el).attr('href') || $(el).data('fxhref');

            // If not using hash routing (e.g. not an extension), change the link to use / at the start rather than #
            if (url && !hashLogic) {
                $(el).attr('href', String(url).replace('#', '/'));
            }
        });
        $('.d-section-items a, .popular-question-items a, .related-articles-list a').rebind('click', function() {
            var url = $(this).attr('href') || $(this).data('fxhref');
            if (url) {
                loadSubPage(url);
                initScrollDownToQuestionId(url);

                return false;
            }
        });
    }

    function sidebars() {

        var $container = $('#help2-main');
        var $deviceTop = $('.device-selector-top', $container);
        var $deviceIcon = $('.device-menu-icon', $container);
        var $deviceMenu = $('.device-selector', $container);
        var $articleSlider = $('.sidebar-menu-slider', $container);
        var $articleList = $('.sidebar-menu-link:hover', $container);
        var $deviceHover = $('.device-container-hover', $container);
        var $tagContainer = $('.sidebar-tags-container', $container);
        var $deviceSelect = $('.device-select', $container);

        $container.find('form').rebind('submit', function(e) {
            e.preventDefault();

            // Log search submitted
            api_req({ a: 'log', e: 99619, m: 'Help2 regular search feature used' });

            loadSubPage(url('search', $(this).find('input[type="text"]').val()));
        });

        $container.find('form input[type=text]').each(function() {
            var $this = $(this);
            $this.autocomplete({
                source: function(request, response) {
                    var results = $.ui.autocomplete.filter(titles, request.term.trim());
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
                    .attr('data-value', item.value)
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
            if ($deviceMenu.is(':visible')){
                $deviceMenu.fadeOut(1000, 'easeOutQuart');
                $deviceHover.fadeIn(500, 'easeOutQuart');
                $deviceIcon.rotate(180, 0, 300, 'easeOutQuint').css('backgroundPosition', '-133px -307px');
                $articleSlider.css({'opacity':'.1', 'cursor':'default'});
                $tagContainer.css({'opacity':'.1', 'cursor':'default'});
            } else {
                $deviceIcon.rotate(0, 180, 300, 'easeOutQuint').css('backgroundPosition', '-133px -339px');
                $deviceTop.fadeOut(500, 'easeOutQuart');
                $articleSlider.css({'opacity':'1', 'cursor':'pointer'});
                $tagContainer.css({'opacity':'1', 'cursor':'default'});
            }
            $articleList.off('mouseenter mouseleave');
        });

        $(document).rebind('click.deviceHover', function() {
            if ($deviceHover.is(':visible')){
                $deviceHover.fadeOut(500, 'easeOutQuart');
                $deviceMenu.fadeIn(500, 'easeOutQuart');
                $articleSlider.css({'opacity':'1', 'cursor':'pointer'});
                $tagContainer.css({'opacity':'1', 'cursor':'default'});
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
            $parent.find($headFeedBack).delay(1000).fadeIn(500).children('p').text(l[7004]);
        }

        $('.feedback-no').rebind('click', function() {
            var $this = $(this);
            $noIconThumb.animate({marginTop: 12}, 200, 'easeOutQuint').animate({marginTop: 7}, 200, 'easeOutQuint');

            $this.parent().delay(200).fadeOut(400, function () {
                $this.prev().fadeOut(100);
            });

            $this.parent().parent().children($headFeedBack).delay(200).fadeOut(300);

            $this.parent().siblings('.feedback-suggestions-list').delay(500).fadeIn(500);

            $('.feedback-send').rebind('click', function() {
                var data = {hash: $this.data('hash')};
                $(this).parents('.feedback-suggestions-list').find('input,textarea')
                    .serializeArray().map(function(val) {
                        data[val.name] = val.value;
                    });

                M.xhr('https://cms2.mega.nz/feedback', JSON.stringify(data));
                sent($this.parents('.article-feedback-container'));
            });
        });

        $('.feedback-yes').rebind('click', function() {
            var $this = $(this);
            $this.find('.icon').animate({marginTop: 1}, 200, 'easeOutQuint')
                         .animate({marginTop: 6}, 200, 'easeOutQuint');

            M.xhr('https://cms2.mega.nz/feedback', JSON.stringify({hash: $this.data('hash')}));
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
        var $mobileDeviceBlock = $('.block-mobile-device', $container);
        var $mobileNavBlock = $('.mobile-block', $container);
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
        var $inputSearch = $('input.search', $container);
        var $sideBar = $('.sidebar-menu-container', $container);
        var $autoSuggestContainer = $('.ui-autocomplete', $container);
        var $popularQuestions = $('.search-section .popular-question-block');

        $inputSearch.on('focus', function () {
            $sideBar.animate({opacity:'0.6'}, 300, 'easeOutQuart');
            $popularQuestions.animate({opacity:'0.3'}, 400, 'easeOutQuart');
            $autoSuggestContainer.animate({marginTop: 72 }, 100, 'easeOutQuart');
        });

        $inputSearch.on('blur', function () {
            $sideBar.animate({opacity:'1'}, 200, 'easeOutQuart');
            $popularQuestions.animate({opacity:'1'}, 200, 'easeOutQuart');
        });
    }

    // Header functions including search and go back buttons

    function headerInteraction() {

        var $container = $('#help2-main');
        var $sideBar = $('.sidebar-menu-container', $container);
        var $mainTitleSection = $('.main-title-section', $container);
        var $searchHeader = $('.support-section-header', $container);
        var $cloneHeader = $('.support-section-header-clone', $container);
        var $elements = $('.updateSelected:visible', $container);
        var timer;

        $searchHeader.fadeIn();
        $cloneHeader.fadeOut();

        $('.bottom-pages .fmholder').rebind('scroll.helpmenu', function() {
            var topPos = $(this).scrollTop();
            var $current = $($('.updateSelected.current')[0]);

            if ($current.length === 0) {
                selectMenuItem($elements.eq(0), $current);
            }
            else {
                var $new = getVisibleElement(topPos, [$current.prev(), $current, $current.next()]);
                if ($new && $new !== $current) {
                    selectMenuItem($new, $current);
                }
            }

            if (topPos > 195) {
                if (topPos + $sideBar.outerHeight() + 115 <= $('.main-mid-pad').outerHeight()) {
                    $sideBar.css('top', topPos + 30 + 'px').addClass('fixed');
                }
                else {
                    $sideBar.removeClass('fixed');
                }
            }
            else {
                $sideBar.removeAttr('style').removeClass('fixed');
            }

        });
    }


    var urls = {
        'search': function(args) {
            var searchTerm = String(args[1]).replace(/\+/g, ' ');

            if (searchTerm.indexOf('%25') >= 0) {
                do {
                    searchTerm = searchTerm.replace(/%25/g, '%');
                } while (searchTerm.indexOf('%25') >= 0);
            }
            try {
                searchTerm = decodeURIComponent(searchTerm);
            }
            catch (e) {}

            var sText = searchTerm.replace(/[+-]/g, ' ');
            var search = sText.replace(/%([0-9a-f]+)/g, function(all, number) {
                return String.fromCharCode(parseInt(number, 16));
            });
            var words = search.split(((lang == 'ct') || (lang == 'jp')) ? '' : /\s+/)
                        .filter(function(word) { return word.length; })// filter out empty strings.
                        .map(function(pattern) { return new RegExp(pattern, 'i'); });

            var articles = idx.all.filter(function(doc) {
                return words.filter(function(target) {
                    return !!doc.indexedTitle.match(target) || !!doc.body.match(target);
                }).length === words.length;
            });

            parsepage(Data.help_search_tpl.html);

            $('#help2-main .search').val(sText);

            if (articles.length === 0) {
                $('.search-404-block').show();
                $('.main-search-pad,.sidebar-menu-container').hide();
            } else {
                $('.search-404-block').hide();
                $('.main-search-pad,.sidebar-menu-container').show();
            }

            articles.reverse().map(function(article) {
                var $article = $('<div>').addClass('search-result link content-by-tags')
                    .data('href', 'help/client/' + article.id)
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
                    .text(tag.text + ' ' + tag.count)
                    .appendTo('.sidebar-tags-container');
            });

        },
        'client': function(args) {
            if (args[1] === 'mobile') {
                args[1] = 'android';
                loadSubPage(url.apply(null, args));
                return;
            }

            args.shift();
            var question = '';
            if (args.length === 3 || args.length === 2) {
                question = args.pop();
                if (args.length === 2) {// if this a question.
                    if (question.lastIndexOf('-') !== -1) {
                        question = question.substring(question.lastIndexOf('-') + 1);
                    }
                    else {
                        // Reload the short url of the help article when title is missing in original url
                        loadSubPage('help/s/' + question);
                        return;
                    }
                }
            } else if (args.length !== 1) {
                loadSubPage('help');
                return;
            }



            var data = Data['help_' + args.join('_')];
            if (!data) {
                loadSubPage('help');
                return;
            }

            parsepage(data.html);

            $('.support-email-icon').rebind('click', function() {
                var parts = getUrlParts($(this).parents('.support-article').attr('id'));
                window.helpOrigin = 'https://mega.nz/' + parts.join('/');
                var newpage = 'support';
                if (!u_type) {
                    login_next = newpage;
                    newpage = 'login';
                }
                loadSubPage(newpage);
            });

            $('.support-link-icon').rebind('click', function() {
                var parts = getShortUrl($(this).parents('.support-article').attr('id'));

                var link = 'https://mega.nz/' + parts.join('/');
                var $input = $('.share-help').removeClass('hidden')
                    .find('input').val(link)
                    .trigger("focus")
                    .trigger('select');
                $('.fm-dialog-close').rebind('click', function() {
                    $('.share-help').addClass('hidden');
                    fm_hideoverlay();
                });
                $('.copy-to-clipboard').rebind('click', function() {
                    copyToClipboard(link, l[7654]);
                    return false;
                });
                fm_showoverlay();
            });

            if (question) {
                $currentQuestion = '#' + question;
                setTimeout(function() {
                    helpScrollTo($currentQuestion);
                }, 400);
            }
        },
        'welcome': function welcome() {
            parsepage(Data.help_index.html);
        },
        // Routing for short url help
        's': function shorturl(args) {
            if (args[1].length !== 24) {
                loadSubPage('help');
                return;
            }

            var article = idx.all.filter(function(doc) {
                return doc.id.indexOf(args[1]) !== -1;
            });

            var redirect = article[0] ? article[0].url : 'help';
            loadSubPage(redirect);
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

    /**
     * Create short version of url for current article's share.
     * @param {String} section section id of current article.
     * @return {Array} newParts Array that contains all parts of shorturl
     */
    function getShortUrl(section) {
        var parts = getSitePath().split('/').map(String.trim).filter(String);
        var newParts = [];
        if (section) {
            newParts.push(parts[0]);
            newParts.push('s');
            newParts.push(section);
        }

        return newParts;
    }

    function doRouting() {
        var parts = getUrlParts();

        if (parts.length === 1) {
            return urls.welcome();
        }

        if (urls[parts[1]]) {
            return urls[parts[1]](parts.slice(1));
        }
        else {
            return urls.welcome();
        }

        // init page here instead with page set as 'help' ?!
        // document.location.href = '#help';
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

    /**
     * Initialises scrolling the view down to the specific question
     * @param {String} url The URL the user clicked on, or from the address bar
     */
    function initScrollDownToQuestionId(url) {

        // Only used for mobile, the desktop site has another method to scroll to the question
        if (!is_mobile) {
            return false;
        }

        // Find all the images in the page which are visible
        var visibleImages = $('.img-active');

        // If there are no images, scroll to the question based on the URL immediately
        if (visibleImages.length === 0) {
            scrollDownToQuestionId(url);
        }
        else {
            // Once all the images have loaded, scroll to the question
            $('.img-active').off('load.helpImagesLoad').on('load.helpImagesLoad', function() {

                // Scroll to the question
                scrollDownToQuestionId(url);
            });
        }
    }

    /**
     * Scrolls the view down to the specific question
     * @param {String} url The URL the user clicked on, or from the address bar
     */
    function scrollDownToQuestionId(url) {

        // On page refresh, get the element id of the question from the end of the URL
        // The id on the end is usually in a URL like /where-can-i-find-my-recovery-key-577360fe886688e7028b45e7
        var idStartIndex = String(url).lastIndexOf('-');

        // Check it found the '-' character or exit
        if (idStartIndex === -1) {
            return false;
        }

        // Get the question id
        var questionElementId = url.substr(idStartIndex + 1);

        // Check that the id is 24 characters long or exit
        // Without this check it will break on URL /help/client/ios/getting-started
        if (questionElementId.length !== 24) {
            return false;
        }

        // Scroll to the start of the question
        $('html, body').animate({
            scrollTop: $('#' + questionElementId).offset().top
        }, 200);
    }

    ns.loadfromCMS = function(callback)
    {
        CMS.index('help_' + lang, function(err, blobs)
        {
            if (err) {
                return alert('Invalid response from the server');
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
                entry.url   = 'help/client/' + entry.id;
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
                obj.indexedTitle = obj.title.split('').join(' ');
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
                e: 99704,
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
                    url = 'login';
                }
                // Log that they clicked on the panel
                api_req({ a: 'log', e: 99621, m: 'Help2 client selection panel used' });
                loadSubPage(url);
            }
        });

        $('#help2-main .scrollTo').rebind('click', function() {
            var $this = $(this);
            var $target = $($(this).data('to'));

            if (!$this.is('.gray-inactive')) {
                selectMenuItem($target);
                $('.sidebar-menu-link.active').removeClass('active');
                $this.addClass('active');
                $('.bottom-pages .fmholder').stop().animate({
                    scrollTop: $target.position().top - 20
                }, 1000);
            }

            // Fix for sidebar articles was not working on mobile wide screen
            if (is_mobile) {
                var url = $this.attr('data-state');
                scrollDownToQuestionId(url);
            }
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

        // Update header text
        $('.mobile.main-top-header-text').text(l[384]);

        // On page load, scroll to the question id based on the URL
        initScrollDownToQuestionId(page);
    };

    return ns;
})();
