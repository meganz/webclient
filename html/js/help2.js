/* jshint ignore:start */
/**
 *  Simple template engine
 *  https://github.com/snoguchi/simple-template.js
 */
function compileTemplate(s, context, arg) {
    var code = 'var out = "";';
    var token = s.split('%>');

    for (var key in context) {
        if (context.hasOwnProperty(key)) {
            code += 'var '  + key + ' = context.' + key + ";\n";
        }
    }

    for (var i = 0, len = token.length; i < len; i++) {
        var tmp = token[i].split('<%');
        if (tmp[0]) {
            var literal = tmp[0].replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r').replace(/\"/g, '\\"');
            code += 'out+="' + literal + '";' + "\n";
        }
        if (tmp[1]) {
            if (tmp[1].charAt(0) === '=') {
                code += 'out+=escapeHTML(' + tmp[1].slice(1) + ');' + "\n";
            } else if (tmp[1].charAt(0) === '!') {
                code += 'out+=CMS.html(' + tmp[1].slice(1) + ');' + "\n";
            } else {
                code += tmp[1] + "\n";
            }
        }
    }
    code += 'return (out);';
    return new Function('context', 'data', code).bind(null, context);
}
/* jshint ignore:end */

/**
 *  Delayed - Delays the execution of a function
 *
 *  Wraps a function to execute at most once
 *  in a 100 ms time period. Useful to wrap
 *  expensive jQuery events (for instance scrolling
 *  events).
 *
 *  All argument and *this* is passed to the callback
 *  after the 100ms (default)
 *
 *  @param {Function} fFunction     Function to wrap
 *  @param {Integer}  tTimeout      Timeout
 *  @returns {Function} wrapped function
 */
function delayed(fFunction, tTimeout) {
    var timeout;
    return function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(this);

        clearTimeout(timeout);
        timeout = setTimeout(fFunction.bind.apply(fFunction, args), tTimeout || 100);
    };
}

var Help = (function() {
    var ns = {};
    var clients = {};
    var ready = false;
    var doRender = false;
    var idx;
    var focus;
    var popularQuestions = [];
    var allTags = [];
    var articlesById = [];
    var titles = [];
    var isScrolling = false;
    var $window = $(window);
    var $currentQuestion = null;


    var tpl = {};
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

    tpl.goback_js = delayed(function(data) {

        $('.support-go-back').rebind('click', function(e) {
            e.preventDefault();
            document.location.hash = getPreviousUrl(data);
        });
        $('.support-go-back-heading').text(getPreviousUrl(data) === url('welcome') ? l[9096] : l[9102]);

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
    }, 1);

    function galleryHtml(html, gallery) {
        return html.replace(/\[gallery:(\d+)\]/g, function(m, id) {
            return tpl.gallery(gallery[id]);
        });
    }

    function toArray(hash) {
        var arr = [];
        for (var key in hash) {
            if (hash.hasOwnProperty(key)) {
                arr.push(hash[key]);
            }
        }
        
        return arr;
    }

    function getPreviousUrl(data) {

        return data.previous_url || getUrlParts().slice(0, 3).join('/');
    }

    function sortClients(client, clients) {

        var isMobile = client.tags.indexOf("mobile");
        return clients.sort(function(a, b) {
            if (isMobile) {
                return a.tags.indexOf("mobile") ? -1 : 1;
            }

            return a.tags.indexOf("mobile") ? 1 : -1;
        });
    }

    // loadHelpData {{{
    /**
     * Load Help2 data from the CMS. This function also
     * prepares all the data for searching (with elasticlunr full text
     * search), compiles all the templates and prepare the suggestions
     * for the search box.
     *
     * @param {Boolean} err      True if there was an invalid response from the server
     * @param {Array}   response Question/Answer from the CMS
     */
    function loadHelpData(err, response) {
        if (err) {
            return alert("Invalid response from the server");
        }
        idx = { all: [] };
        idx.search = elasticlunr(function() {
            this.setRef('id');
            this.addField('title', { boost: 10 });
            this.addField('tags', { boost: 100 });
            this.addField('body');
        });
        window.idx = idx;

        ready = true;
        clients = response.object;

        // process each client {{{
        clients.forEach(function(client, id) {
            if (client.popular) {
                clients.splice(id, 1);
                popularQuestions = client.data;
                return;
            }

            switch (client.url) {
            case 'megasync':
                switch (browserdetails().os) {
                case 'Apple':
                    client.big_icon = 'ios-megasync';
                    break;
                case 'Windows':
                    client.big_icon = 'windows-megasync';
                    break;
                default:
                    client.big_icon = 'linux-megasync';
                    break;
                }
                break;
            case 'webclient':
                switch (browserdetails().os) {
                case 'Apple':
                    client.icon = 'ios-desktop';
                    break;
                case 'Windows':
                    client.icon = 'windows-desktop';
                    break;
                default:
                    client.icon = 'linux-desktop';
                    break;
                }
                break;
            }

            client.sections.forEach(function(section) {
                section.questions.forEach(function(question) {
                    var data = {
                        id: idx.all.length,
                        url: url('client', client.url, section.url, question.url),
                        client: client.name,
                        client_url: client.url,
                        title: question.question,
                        body: strip_tags(question.answer).replace(/\[gallery:\d+\]/g, ''),
                        tags: question.tags,
                        ups: question.ups,
                    };
                    titles.push({
                        label: question.question,
                        value: question.question,
                        client: client.name,
                        url: data.url,
                    });
                    idx.all.push(data);
                    idx.search.addDoc(data);
                    question.full_url = data.url;
                    question.client = client;
                    question.section = section;
                    articlesById[question.url] = question;
                });
            });
        });
        // }}}

        for (var i = 0; i < popularQuestions.length; ++i) {
            popularQuestions[i] = articlesById[popularQuestions[i]];
        }

        // Compile all templates
        Object.keys(pages).filter(function(page) {
            return page.match(/^help_|gallery/);
        }).map(function(page) {
            tpl[page.replace(/^help_/, '')] = compileTemplate(pages[page], {
                // We share url (function), tpl (our templates)
                // and clients (all our data) to *all* of our
                // templates
                galleryHtml: galleryHtml,
                tags: tagsPerDocument,
                tagUri: tagUri,
                sortClients: sortClients,
                url: url,
                tpl: tpl,
                clients: clients,
                popularQuestions: popularQuestions,
            });
        });

        titles = array_unique(titles);

        if (doRender) {
            ns.render();
        }
    }
    // }}}

    /**
     * Subscribe to changes from the CMS.
     */
    CMS.watch('help2.en', function() {
        CMS.get("help2.en", loadHelpData);
    });

    /**
     * Get data from the CMS-server
     */
    CMS.get("help2.en", loadHelpData);

    var setHash = delayed(function(hash) {
        if (hash !== document.location.hash) {
            history.pushState({}, "page 2", document.location.pathname + hash);
        }
    }, 1000);


    function filterByTag(tag) {
        clients.forEach(function(section) {
        });
    }

    function url() {
        return '#help/' + Array.prototype.slice.call(arguments).join("/");
    }

    function selectMenuItem($element, $elements) {
        if (isScrolling) {
            return;
        }
        $elements = $elements || $('.updateSelected.current');
        $elements.removeClass('current');
        $element.addClass('current');
        var $current = $($element.data('update'))
            .parent().
                find('.active').removeClass('active').end()
            .end()
            .addClass('active');
        var hash = $current.data('state');
        if (hash) {
            setHash(hash);
        }
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

    function notFound() {
        document.location.href = "#help";
    }

    function getClient(clientName) {
        for (var i = 0; i < clients.length; ++i) {
            if (clients[i].url === clientName) {
                return clients[i];
            }
        }

        // not found
        return notFound();
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
        $('.content-by-tags,.content-by-tags-hide', $container).each(function() {
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
                if ($this.is('.content-by-tags-hide')) {
                    $this.addClass('gray-inactive');
                } else {
                    $this.hide();
                }
                $('*[data-to=\\#' + $this.attr('id')).addClass('gray-inactive');
            } else {
                $('*[data-to=\\#' + $this.attr('id')).removeClass('gray-inactive');
                if ($this.is('.content-by-tags-hide')) {
                    $this.removeClass('gray-inactive');
                } else {
                    $this.show();
                }
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
            document.location.href = url("search", $(this).find('input[type="text"]').val());
        });

        $container.find('form input[type=text]').each(function() {
            var $this = $(this);
            $this.autocomplete({
                source: function(request, response) {
                    var results = $.ui.autocomplete.filter(titles, request.term);
                    response(results.slice(0, 6));
                },
                appendTo: $this.parent().parent(),
                select: function(event, ui) {
                    document.location.href = ui.item.url;
                }
            });
            $this.data('ui-autocomplete')._renderItem = function(ul, item) {
                var $icon = $("<span>").addClass(item.client.toLowerCase() + " client")
                    .text(item.client + " :: ");
                return $("<li>")
                    .attr("data-value", item.value)
                    .append($icon)
                    .append(item.label)
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
        var $getStartBlock = $(".getstart-block", $container);
        var $useMegaBlock = $(".usemega-block", $container);
        var $articleArrow = $(".article-arrow", $container);
        var $arrowContainer = $(".browsearticle-button", $container);
        var $getStartImg = $(".getstart-img", $container);
        var $getStartCon = $(".getstart-content", $container);
        var $mobileDeviceBlock = $(".block-mobile-device", $container);
        var $mobileNavBlock = $(".mobile-block", $container);
        var timer;
    
        $mobileNavBlock.rebind('mouseenter', function() {
            timer = setTimeout(function()   {
            $mobileDeviceBlock.fadeIn(300);
        }, 400); })
        .rebind('mouseleave', function() {
            clearTimeout(timer);
            $mobileDeviceBlock.fadeOut(200);
        });

    }

    function searchBarInteraction() {

        var $container = $('#help2-main');
        var $inputSearch = $("input.search", $container);
        var $searchBar = $("form#support-search", $container);
        var $sideBar = $(".sidebar-menu-container", $container);
        var $directoryBody = $(".support-info-container ", $container);
        var $autoSuggestContainer = $(".ui-autocomplete", $container);
        var $mainTitleSection = $('.main-title-section', $container);
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

    //  Directory list functions go here.
    function directoryInteraction() {

        var $this = $(this);
        var $container = $('#help2-main');
        var $directoryArticle = $('.d-section-items li');
        var $bulletPoint = $('.d-bullet-point');

        // Bullet point animation when hovering
    }

    // Header functions including search and go back buttons

    function headerInteraction() {

        var $container = $('#help2-main');
        var $goBackContainer = $(".support-go-back", $container);
        var $goBackArrow = $(".support-go-back-icon", $container);
        var $goBackHead = $(".support-go-back-heading", $container);
        var $searchHead = $(".support-search-heading", $container);
        var $searchClone = $(".support-section-header-clone .support-search");
        var $searchCloneHeader = $(".support-section-header-clone .support-search-heading");
        var $searchCloseHead = $('.support-search-heading-close', $container);
        var $searchContainer = $(".support-search", $container);
        var $searchMagnifyGlass = $(".support-search-icon", $container);
        var $mainPadAnchor = $(".main-pad-container", $container);
        var $sideBar = $(".sidebar-menu-container", $container);
        var $mainTitleSection = $('.main-title-section', $container);
        var $searchHeader = $(".support-section-header", $container);
        var $cloneHeader = $(".support-section-header-clone", $container);
        var $sideBarSlider = $(".sidebar-menu-slider", $container);
        var $closeIcon = $(".close-icon", $container);
        var $searchOverlay = $(".search-section-header", $container);
        var $getStartTitle = $(".getstart-title-section", $container);
        var timer;

        // Arrow Animation for Go back block
        $goBackContainer.rebind('mouseenter', function() {
            timer = setTimeout(function()   {
            $goBackArrow.animate({marginRight: 8}, 300, "easeOutQuart");
        },  300);
        }).rebind('mouseleave', function() {
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

        $html.rebind('scroll', function() {

            if (($sideBar.hasClass('fixed')) && (($sideBar).is(":visible"))) {
                $searchHeader.fadeOut(10);
                $cloneHeader.fadeIn(300);
            } else {
                $searchHeader.fadeIn(300);
                $cloneHeader.fadeOut(10);
            }

        });


        if ($searchContainer.hasClass('close')) {
            $searchMagnifyGlass = $(".support-search-icon", $container);
            $searchContainer.rebind('mouseenter', function() {
                timer = setTimeout(function()   {
                $searchMagnifyGlass.animate({
                    marginLeft: "8",
                    marginRight:"8"
                }, 300, "easeOutQuart");
                
            }, 300);
            })
            .rebind('mouseleave', function() {
                clearTimeout(timer);
                $searchMagnifyGlass.animate({
                    marginLeft: "16",
                    marginRight:"0"
                }, 300, "easeOutQuart");
                
            });
        } else {
            $searchContainer.rebind('mouseenter', function() {
                timer = setTimeout(function()   {
                $searchMagnifyGlass.animate({
                    marginLeft: "8",
                    marginRight:"8"
                }, 300, "easeOutQuart");
            
            }, 300);
            })
            .rebind('mouseleave', function() {
                clearTimeout(timer);
                $searchMagnifyGlass.animate({
                    marginLeft: "16",
                    marginRight:"0"
                }, 300, "easeOutQuart");
                
            });
        }
    }


    var urls = {
        "search": function(args) {
            args[1] = args[1].replace(/%([0-9a-f]+)/g, function(all, number) {
                return String.fromCharCode(parseInt(number, 16));
            });
            args[1] = args[1].replace(/[\+\-]/g, " ");
            var articles = idx.search.search(args[1], {
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

            parsepage(tpl.search({
                is_search: true,
                hasResult : articles.length > 0,
                search: args[1],
                previous_url: url("welcome"),
                articles: articles || [],
            }));
        },
        "client": function(args) {
            var client;
            if (args[1] === 'mobile') {
                args[1] = 'android';
                document.location.href = url.apply(null, args);
                return;
            }

            client = getClient(args[1]);

            switch (args.length) {
            case 2:
                parsepage(tpl.section({
                    show_devices: true,
                    tpl: tpl,
                    client: client,
                    title: client.name,
                    subtitle: client.description,
                    previous_url: url("welcome"),
                }));

                break;

            case 3:
            case 4:
                var section;
                client.sections.forEach(function(s) {
                    if (s.url === args[2]) {
                        section = s;
                        return false;
                    }
                });

                if (!section) {
                    return notFound();
                }

                parsepage(tpl.listing({
                    base_url: url.apply(null, args.slice(0, 3)),
                    client: client,
                    title: section.name,
                    articlesById: articlesById,
                    subtitle: section.description,
                    section: section,
                    focus: focus,
                    scrollTo: args[3],
                }));

                $('.support-email-icon').rebind('click', function() {
                    var parts = document.location.href.split(/\//);
                    parts.pop();
                    parts.push($(this).parents('.support-article').attr('id'));
                    window.helpOrigin = parts.join('/');
                    var support = '#support';
                    if (!u_type) {
                        login_next = support;
                        support    = "#login";
                    }
                    document.location.href = support;
                });

                $('.support-link-icon').rebind('click', function() {
                    var parts = document.location.href.split(/\//);
                    parts.pop();
                    parts.push($(this).parents('.support-article').attr('id'));

                    var link   = parts.join('/');
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

                if (args[3]) {
                    $currentQuestion = $('#' + args[3]);
                    Later(function() {
                        scrollTo($currentQuestion);
                    });
                }

                break;
            }
        },
        "welcome": function welcome() {
            parsepage(tpl.welcome({}));
        }
    };

    function getUrlParts() {
        return document.location.hash.split(/\//).filter(function(x) {
            return x.length > 0;
        });
    }


    function doRouting() {
        var parts = getUrlParts();

        if (urls[parts[1]]) {
            return urls[parts[1]](parts.slice(1));
        }

        document.location.href = url("welcome");
    }
        
    // getVisibleElement {{{
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
    // }}}

    function handleScroll() {

        var $main = $('#help2-main');
        var $menu = $('.sidebar-menu-container:visible');
        var menuHeight = $menu.height();
        var top   = $('.help-background-block').height();
        var $elements = $('.updateSelected:visible', $main);
        var isBottomScrolling = false;

        $window.rebind('resize.help2', function() {
            if ($('#help2-main').length === 0) {
                return $window.unbind('resize.help2');
            }
            contentChanged();
        });

        $('.main-scroll-block').rebind('jsp-scroll-y.help2', function checkScrolling(e, scrollPositionY) {

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


    ns.render = function() {
        if (!ready) {
            loadingDialog.show();
            doRender = true;
            return;
        }
    
        // reset all tags
        allTags = [];
        $currentQuestion = null;

        doRouting();
        loadingDialog.hide();
        topmenuUI();
        sidebars();
        mainScroll();
        userfeedback();
        homepageinteraction();
        searchBarInteraction();
        headerInteraction();
        directoryInteraction();


        $('#help2-main .link').rebind('click', function(e) {
            var $this = $(this);
            e.preventDefault();

            if (!$this.is('.disabled')) {
                var url = $this.data('href');
                if (url === '#support' && !u_type) {
                    login_next = url;
                    url = "#login";
                }
                document.location.href = url;
            }
        });

        $('#help2-main').find('.scrollTo').rebind('click', function() {
            var $this = $(this);
            if (!$this.is('.gray-inactive')) {
                scrollTo($($(this).data('to')));
            }
            return false;
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
