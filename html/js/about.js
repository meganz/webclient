const eventsMinDistance = 80;
const slideIndex = 1;
let resizeTimer;
let carouselInterval;

/**
 * Bottom pages functionality
 */
var aboutus = {

    init: function() {
        "use strict";
        // Cache selectors
        const $page = $('.bottom-page.scroll-block.about', 'body');

        $('.about.jobs-btn', $page).click(() => {
            $('.white-space-top', $page)[0].scrollIntoView();
        });
        // this.fetchCMS();
        aboutus.openSubSection($page);
        const $timelines = $('.cd-horizontal-timeline', $page);
        if ($timelines.length > 0) {
            aboutus.initTimeline($timelines);
        }
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }
        aboutus.setOverLayText($page);
        aboutus.initCarouselAnimation($page);
        aboutus.initHoverEffects($page);
        aboutus.setLangContentInDOM($page);

        // Event to handle resizing
        $(window).resize(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(aboutus.resizeTimelineHandler.bind(null, $page), 100);
        });
    },

    // fetchCMS: function() {
    //     "use strict";
    //     CMS.scope = 'team';
    //     if (this.members) {
    //         this.insMembersInHTML(this.members);
    //     } else {
    //         var self = this;
    //         CMS.get('team_en', function (err, data) {
    //             if (err) {
    //                 console.error('Failed to fetch team data');
    //                 return false;
    //             }
    //             self.members = data.object;
    //             self.insMembersInHTML(data.object);
    //         });
    //     }
    // },
    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @param {String} subsection Subsection name to show
     * @returns {void}
     */
    showSubsectionContent: function($page, subsection) {
        "use strict";


        $('.about.main-menu.item.active', $page).removeClass('active');
        $('.about.main-menu.item.about-' + subsection, $page).addClass('active');
        $('.bottom-page.full-block.active', $page).removeClass('active');
        $('.bottom-page.full-block.about-' + subsection, $page).addClass('active');
        bottompage.initAnimations($page);
    },

    /**
     * Show blocks related to subpage name
     * @param {Object} $page The jQuery selector for the current page
     * @returns {void}
     */
    openSubSection: function($page) {
        "use strict";

        var subsection;

        if (page.substr(6, 10) === 'jobs') {
            subsection = 'jobs';
        }
        else if (page.substr(6, 17) === 'reliability') {
            subsection = 'reliability';
        }
        else if (page.substr(6, 13) === 'privacy') {
            subsection = 'privacy';
        }
        else {
            subsection = 'main';
            CMS.dynamicStatsCount($page);
        }

        aboutus.showSubsectionContent($page, subsection);

        // Init main menu click
        $('.about.main-menu.item', $page).rebind('click.about', function() {
            const page = $(this).data('page');
            loadSubPage(`about${page === 'main' ? '' : `/${page}`}`);
        });
    },

    // insMembersInHTML: function(members) {
    //     'use strict';
    //     members.sort(function() {
    //         return 0.5 - Math.random();
    //     });
    //     var aboutContent = '';
    //     for (var i = members.length; i--;) {
    //         aboutContent +=
    //             '<div class="bottom-page inline-block col-6 fadein">' +
    //             '<img class="shadow" src="' + CMS.img(members[i].photo)
    //             + '" alt="' + escapeHTML(members[i].name) + '">' +
    //             '<span class="bold">' + escapeHTML(members[i].name) + '</span>' +
    //             '<span>' + escapeHTML(members[i].role) + '</span>' +
    //             '</div>';
    //     }
    //     $('.members', '.bottom-page').safeHTML(aboutContent);
    // },

    // timeline handlers
    // adapted from https://codyhouse.co/gem/horizontal-timeline

    initTimeline: function(timelines) {
        'use strict';
        timelines.each(function() {
            const $timeline = $(this);
            const timelineComponents = {
                $timelineWrapper: [],
                eventsWrapper: [],
                $timelineEvents: [],
                $timelineNavigation: [],
                eventsContent: [],
            };
            // cache timeline components
            timelineComponents.$timelineWrapper = $('.events-wrapper', $timeline);
            timelineComponents.eventsWrapper = timelineComponents.$timelineWrapper.children('.events');
            timelineComponents.$timelineEvents = $('a', timelineComponents.eventsWrapper);
            timelineComponents.$timelineNavigation = $('.cd-timeline-navigation', $timeline);
            timelineComponents.eventsContent = $timeline.children('.events-content');

            const widthsArray = aboutus.setTimelineWidth(timelineComponents);
            const timelineTotWidth = widthsArray[0];
            // assign a left position to the single events along the timeline
            aboutus.setDatePosition(timelineComponents, eventsMinDistance, widthsArray);

            // the timeline has been initialize - show it
            $timeline.addClass('loaded');

            // set transform value to last date
            const $selectedDate = $('.selected', timelineComponents.eventsWrapper);
            const $prevDate = $selectedDate.parent('li').prev('li').children('a');
            const prevDateValue = parseInt($prevDate.css('left'),10);
            const eventsWrapper = timelineComponents.eventsWrapper.get(0);
            aboutus.setTransformValue(eventsWrapper, 'translateX', `${-prevDateValue + 25}px`);

            // detect click on the a single event - show new event content
            timelineComponents.eventsWrapper.rebind('click', 'a', function(event) {
                event.preventDefault();
                const currSelected = timelineComponents.$timelineEvents.filter('.selected');
                timelineComponents.$timelineEvents.removeClass('selected');
                $(this).addClass('selected');
                aboutus.updateOlderEvents($(this));
                // hacky way to update timeline for now
                const step = $(this).attr('class') === 'older-event selected' ? "prev" : "next";
                const $selectedDate = $('.selected', timelineComponents.eventsWrapper);
                const $newEvent = $selectedDate.parent('li').children('a');
                aboutus.updateOlderEvents($newEvent);
                aboutus.updateTimelinePosition(step, $newEvent, timelineComponents);
                aboutus.updateVisibleContent($(this),
                                             timelineComponents.eventsContent,
                                             step,
                                             timelineComponents.$timelineWrapper,
                                             currSelected);
            });

            const $next = $('.carousel-button-next', '.bottom-page');
            const $prev = $('.carousel-button-prev', '.bottom-page');

            // arrow function click handler
            $next.rebind('click.about', () => {
                aboutus.showNewContent(timelineComponents, timelineTotWidth, 'next');
            });
            $prev.rebind('click.about', () =>  {
                aboutus.showNewContent(timelineComponents, timelineTotWidth, 'prev');
            });

            // prevent default event listener issue
            if (is_mobile) {
                timelineComponents.eventsContent.css('touch-action','pan-y');
            }
            // swipe (phone) function handler
            timelineComponents.eventsContent.rebind('swipeleft.about', () =>  {
                if (is_mobile) {
                    aboutus.showNewContent(timelineComponents, timelineTotWidth, 'next');
                }
            });
            timelineComponents.eventsContent.rebind('swiperight.about', () =>  {
                if (is_mobile) {
                    aboutus.showNewContent(timelineComponents, timelineTotWidth, 'prev');
                }
            });

            // left right arrow key function handler
            $(document).rebind('keydown.about', (event) => {
                if (page !== 'about') {
                    return $(document).off('keydown.about');
                }
                if (event.which === 37) {
                    aboutus.showNewContent(timelineComponents, timelineTotWidth, 'prev');
                }
                else if (event.which === 39) {
                    aboutus.showNewContent(timelineComponents, timelineTotWidth, 'next');
                }
            });
        });
    },

    updateSlide: function(timelineComponents, timelineTotWidth, direction) {
        "use strict";
        // retrieve translateX value of timelineComponents['eventsWrapper']
        const translateValue = aboutus.getTranslateValue(timelineComponents.eventsWrapper);
        const wrapperWidth = Number(timelineComponents.$timelineWrapper.css('width').replace('px', ''));

        if (direction === 'next') {
            aboutus.translateTimeline(timelineComponents,
                                      translateValue - wrapperWidth + eventsMinDistance,
                                      wrapperWidth - timelineTotWidth);
        }
        else {
            aboutus.translateTimeline(timelineComponents, translateValue + wrapperWidth - eventsMinDistance);
        }
    },

    showNewContent: function(timelineComponents, timelineTotWidth, string) {
        "use strict";
        // go from one event to the next/previous one
        const $visibleContent = $('.selected', timelineComponents.eventsContent);
        const newContent = string === 'next' ? $visibleContent.next() : $visibleContent.prev();

        if (newContent.length > 0) { // if there's a next/prev event - show it
            const $selectedDate = $('.selected', timelineComponents.eventsWrapper);
            const $newEvent = string === 'next' ? $selectedDate.parent('li').next('li').children('a')
                : $selectedDate.parent('li').prev('li').children('a');

            aboutus.updateVisibleContent($newEvent,
                                         timelineComponents.eventsContent,
                                         string,
                                         timelineComponents.$timelineWrapper,
                                         false);
            $newEvent.addClass('selected');
            $selectedDate.removeClass('selected');
            aboutus.updateOlderEvents($newEvent);
            aboutus.updateTimelinePosition(string, $newEvent, timelineComponents);
        }
    },

    updateTimelinePosition: function(string, event, timelineComponents) {
        "use strict";
        // translate timeline to the left/right according to the position of the selected event
        const eventStyle = window.getComputedStyle(event.get(0), null);
        const eventLeft = Number(eventStyle.getPropertyValue("left").replace('px', ''));
        const timelineWidth = Number(timelineComponents.$timelineWrapper.css('width').replace('px', ''));
        const timelineTotWidth = Number(timelineComponents.eventsWrapper.css('width').replace('px', ''));

        if (string === 'next' || string === 'prev') {
            aboutus.translateTimeline(timelineComponents,
                                      -eventLeft + timelineWidth / 2,
                                      timelineWidth - timelineTotWidth);
        }
    },

    translateTimeline: function(timelineComponents, value, totWidth) {
        "use strict";
        const eventsWrapper = timelineComponents.eventsWrapper.get(0);
        value = value > 0 ? 0 : value; // only negative translate value
        value = typeof totWidth !== 'undefined' && value < totWidth ? totWidth : value;
        aboutus.setTransformValue(eventsWrapper, 'translateX', `${value}px`);
    },

    // probably change this to be more responsive
    setDatePosition: function(timelineComponents, min, widthsArray) {
        "use strict";
        // let totalWidth = widthsArray[0];
        const visibleWidth = widthsArray[1];
        // let usableWidth = widthsArray[2];
        let rollingWidth = 0;
        let placeholderDist = 120;
        for (let i = 0; i < timelineComponents.$timelineEvents.length; i++) {

            if (i === 0) {
                rollingWidth = rollingWidth + visibleWidth / 2 - placeholderDist;
                placeholderDist -= 32;
            }
            if (i === 1) {
                rollingWidth += 40;
                // placeholderDist = placeholderDist - 32;
            }
            if (i === 2) {
                rollingWidth += 40;
                // placeholderDist = placeholderDist - 32;
            }
            if (i === 3) {
                rollingWidth += 40;
            }
            else if (i > 3) {
                if (i === 4) {
                    rollingWidth = rollingWidth +
                                   parseInt($(timelineComponents.$timelineEvents[i - 1]).css('left'), 10) - 25;
                }
                else if (i !== 0) {
                    rollingWidth = rollingWidth
                                   + parseInt($(timelineComponents.$timelineEvents[i - 1]).css('left'), 10)
                                   - parseInt($(timelineComponents.$timelineEvents[i - 2]).css('left'), 10);
                }
            }
            timelineComponents.$timelineEvents.eq(i).css('left', `${rollingWidth}px`);
        }
    },

    // probably change this to be more responsive
    setTimelineWidth: function(timelineComponents) {
        "use strict";
        const visibleWidth = timelineComponents.$timelineWrapper.width();
        const usableWidth = visibleWidth - 50;
        const totalWidth = visibleWidth * timelineComponents.$timelineEvents.length; // 12 dates fix this later
        timelineComponents.eventsWrapper.css('width', `${totalWidth}px`);
        return [totalWidth, visibleWidth, usableWidth];
    },

    updateVisibleContent: function(event, eventsContent, step, timeline, currSelected) {
        "use strict";
        let classEntering;
        let classLeaving;
        const eventDate = event.data('date');
        const $visibleContent = $('.selected', eventsContent);
        const $selectedContent = $(`[data-date="${eventDate}"]`, eventsContent);

        if ($selectedContent.index() > $visibleContent.index()) {
            classEntering = 'selected enter-right';
            classLeaving = 'leave-left';
        }
        else {
            classEntering = 'selected enter-left';
            classLeaving = 'leave-right';
        }

        $selectedContent.attr('class', classEntering);
        $visibleContent.attr('class', classLeaving)
            .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', () => {
                $visibleContent.removeClass('leave-right leave-left');
                $selectedContent.removeClass('enter-left enter-right');
            });

        let currEvent = step === 'prev' ? event.parent('li').next().children('a')
            : event.parent('li').prev().children('a');

        // timeline click
        if (currSelected) {
            currEvent = currSelected;
        }

        // event is the event we are going to

        // TODO super hacky css tricks for the timeline dates -> will fix & generalise
        if (currEvent.attr('data-date').split('/')[2] !== '2013') {
            if (!event.hasClass('small-dot') && step === 'prev' && event.attr('data-date').split('/')[2] === '2013') {
                $('p', event).text("Dec, 2013");
                $('p', event).css('right', 45);
            }
        }
        else if (currEvent.attr('data-date').split('/')[2] === '2013') {
            $('p', event).css('right', 45);
            if (step === 'prev') {
                currEvent.addClass('small-dot');
                event.removeClass('small-dot');
            }
            if (step === 'next') {
                currEvent.addClass('small-dot');
                event.removeClass('small-dot');
                if (event.attr('data-date').split('/')[2] !== '2013') {
                    const $connector = $('.connector', timeline);
                    $('p', $connector).text("2013");
                    $connector.removeClass('small-dot');
                    $('p', $connector).css('right', 23);
                    $('p', event).css('right', 23);
                }
            }
        }
    },

    updateOlderEvents: function(event) {
        "use strict";
        event.parent('li')
            .prevAll('li')
            .children('a')
            .addClass('older-event')
            .end().end().nextAll('li').children('a').removeClass('older-event');
    },

    getTranslateValue: function(timeline) {
        "use strict";
        let translateValue = 0;
        const timelineStyle = window.getComputedStyle(timeline.get(0), null);
        let timelineTranslate = timelineStyle.getPropertyValue("-webkit-transform") ||
                timelineStyle.getPropertyValue("-moz-transform") ||
                timelineStyle.getPropertyValue("-ms-transform") ||
                timelineStyle.getPropertyValue("-o-transform") ||
                timelineStyle.getPropertyValue("transform");

        if (timelineTranslate.includes('(')) {
            timelineTranslate = timelineTranslate.split('(')[1];
            timelineTranslate = timelineTranslate.split(')')[0];
            timelineTranslate = timelineTranslate.split(',');
            translateValue = timelineTranslate[4];
        }

        return Number(translateValue);
    },

    setTransformValue: function(element, property, value) {
        "use strict";
        element.style["-webkit-transform"] = `${property}(${value})`;
        element.style["-moz-transform"] = `${property}(${value})`;
        element.style["-ms-transform"] = `${property}(${value})`;
        element.style["-o-transform"] = `${property}(${value})`;
        element.style.transform = `${property}(${value})`;
    },

    initCarouselAnimation: function($page) {
        "use strict";

        const $slider = $('#about-slider', $page);

        $('> div:gt(0)', $slider).addClass('hidden');

        carouselInterval = setInterval(() =>  {
            // bug with firefox decode() the image prior to changing its display,
            // as firefox doesnt decode images that arent within viewport
            // causing flickering.
            if (page !== 'about') {
                return clearInterval(carouselInterval);
            }
            const imgDecode = $('.about.office1', $page).get(slideIndex);
            imgDecode.decode().then(() => {

                const $slide = $('> div:first', $slider).addClass('hidden');

                $slide.next().removeClass('hidden');
                $slide.appendTo('#about-slider');
            });
        },  3000);
    },
    setOverLayText: function($page) {
        "use strict";
        if (is_mobile) {
            const $e = $(".top.img",'.office-img-container');
            $e.remove();
            const $a = $(".overlay-text1", $page);
            const $b = $(".overlay-text2", $page);
            $a.detach().appendTo('.about-text-wrapper');
            $b.detach().appendTo('.about-text-wrapper');
        }
    },
    initHoverEffects: function($page) {
        "use strict";
        $('.single-job-container',$page).hover(function(){
            $('.job-title', $(this)).addClass('hover');
            $('.job-list-arrow', $(this)).addClass('hover');
        }, function() {
            $('.job-title', $(this)).removeClass('hover');
            $('.job-list-arrow', $(this)).removeClass('hover');
        });
    },
    // Actual Resizing Event
    resizeTimelineHandler: function($page) {
        "use strict";
        const $timelines = $('.cd-horizontal-timeline', $page);
        if ($timelines.length > 0) {
            aboutus.initTimeline($timelines);
        }
    },

    setLangContentInDOM: function($page) {
        "use strict";
        const $content = $('.about.promise-title',$page);
        $content.attr('pop-lang',l.about_our_promise_title);
    }
};
