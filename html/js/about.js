const eventsMinDistance = 80;
const slideIndex = 1;
let resizeTimer;
let carouselInterval;
const persistTime = 3600000; // 1hr

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
        aboutus.setOverLayText($page);
        aboutus.setLangContentInDOM($page);
        aboutus.initCollapsible($page);

        // Event to handle resizing
        $(window).resize(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(aboutus.resizeTimelineHandler.bind(null, $page), 100);
        });

        aboutus.fetchTeamTailorJobsWithCache(persistTime, $page).then(() => {
            aboutus.initHoverEffects($page);
        });
    },

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

            // Setup locale formmat date for carousel
            $('.carousel-date', timelineComponents.eventsContent).text(function() {
                return time2date(this.dataset.unix, 3);
            });

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
                const step = $(this).hasClass('older-event selected') ? "prev" : "next";
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

            // prevent default event listener issue, change position of divs in DOM
            if (is_mobile) {
                timelineComponents.eventsContent.css('touch-action', 'pan-y');
                $(window).rebind('orientationchange.aboutcarousel',() => {

                    if (page !== 'about') {
                        return $(window).off('orientationchange.aboutcarousel');
                    }
                    if (window.innerHeight > window.innerWidth) {
                        // portrait
                        $(".carousel-photo.container", '.events-content').get().forEach((container) => {
                            const $photoContainer = $(container);
                            const $textContainer = $(".carousel-text-container", $photoContainer);
                            $textContainer.detach().insertAfter($('.gradient-wrapper', $photoContainer));
                        });
                    }
                    else if (window.innerWidth > window.innerHeight) {
                        // landscape
                        $(".carousel-photo.container", '.events-content').get().forEach((container) => {
                            const $photoContainer = $(container);
                            const $textContainer = $(".carousel-text-container", $photoContainer);
                            const $gradientWrapper = $(".gradient-wrapper", $photoContainer);
                            const isAfter = $textContainer.prevAll().filter($gradientWrapper).length !== 0;
                            if (isAfter) {
                                $textContainer.detach().insertBefore($('.gradient-wrapper', $photoContainer));
                            }
                        });
                    }
                });
                $(window).trigger('orientationchange.aboutcarousel');

                const officeImageContainer = ".about.office-locations-container";
                const $infoBlock = $(".about.location-info-block", officeImageContainer);
                $infoBlock.detach().insertBefore($('.office-img-container', officeImageContainer));
                $(".about-text-wrapper", officeImageContainer).css('margin-bottom','56px');
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
        // currEvent is the event we are currently on.
        const currentYear = currEvent.attr('data-date').split('/')[2];
        const nextYear = event.attr('data-date').split('/')[2];

        // $visibleContent is content we currently on
        // $selectedContent is next content.
        $visibleContent.prev().removeClass('left');
        $visibleContent.next().removeClass('right');

        $selectedContent.prev().addClass('left');
        $selectedContent.next().addClass('right');

        if (nextYear === '2013') {
            $('p', event).text(time2date(event.data('unix'), 6));
        }

        // TODO super hacky css tricks for the timeline dates -> will fix & generalise
        if (currentYear === '2013') {
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
        else if (!event.hasClass('small-dot') && step === 'prev' && nextYear === '2013') {
            $('p', event).css('right', 45);
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
            const $scope = $(this);
            $('.job-title', $scope).addClass('hover');
            $('.job-list-arrow', $scope).addClass('hover');
        }, function() {
            const $scope = $(this);
            $('.job-title', $scope).removeClass('hover');
            $('.job-list-arrow', $scope).removeClass('hover');
        });
        $('.expand-leaders', $page).hover(function(){
            const $scope = $(this);
            $('.expand-text', $scope).addClass('hover');
            $('.leaders-see-more-arrow', $scope).addClass('hover');
        }, function() {
            const $scope = $(this);
            $('.expand-text', $scope).removeClass('hover');
            $('.leaders-see-more-arrow', $scope).removeClass('hover');
        });
    },

    initCollapsible: function($page) {
        "use strict";
        const $dropDown = $('.expand-leaders', $page);

        $dropDown.rebind('click.about', () => {
            const $block = $('.leaders-collapsible', $page);
            const collapsibleSection = '.about.leadership-col4';
            const $collapseBlock = $('.expand-leaders.collapse', collapsibleSection);
            const $expandBlock = $('.expand-leaders.expand', collapsibleSection);
            const content = $block[0];

            if ($block.hasClass('open')) {
                $block.removeClass('open');
                $collapseBlock.addClass('hidden');
                $expandBlock.removeClass('hidden');
                $('.leadership-team-container', $page)[0].scrollIntoView();
                content.style.maxHeight = null;
            }
            else {
                $block.addClass('open');
                $collapseBlock.removeClass('hidden');
                $expandBlock.addClass('hidden');
                // overflow hidden anyway
                content.style.maxHeight = `${9999}px`;
            }
        });
    },
    // Actual Resizing Event
    resizeTimelineHandler: function($page) {
        "use strict";
        const $timelines = $('.cd-horizontal-timeline', $page);
        if ($timelines.length > 0) {
            aboutus.initTimeline($timelines);
        }
        const $block = $('.leaders-collapsible', $page);
        if ($block.length > 0) {
            const content = $block[0];
            // overflow hidden anyway
            content.style.maxHeight = `${9999}px`;
        }
    },

    setLangContentInDOM: function($page) {
        "use strict";
        const $content = $('.about.promise-title',$page);
        $content.attr('pop-lang',l.about_our_promise_title);
    },

    populateJobs: function(jobData, $page) {
        "use strict";
        const $jobContainer = $('.right-side-jobs-container', $page);
        const $noJobsTemplate = $('.no-jobs.template', $jobContainer);
        const $departmentTitleTemplate = $('.department-title', $jobContainer);
        const $singleJobContainerTemplate = $('.single-job-container.template', $jobContainer);
        const $bottomPaddingTemplate = $('.bottom-padding.template', $jobContainer);
        const $exploreJobsTemplate = $('.explore-jobs.template', $jobContainer);

        $noJobsTemplate.remove();
        $departmentTitleTemplate.remove();
        $singleJobContainerTemplate.remove();
        $bottomPaddingTemplate.remove();
        $exploreJobsTemplate.remove();
        if (Object.keys(jobData).length > 0) {
            for (const department in jobData) {

                const $titleBlock = $departmentTitleTemplate.clone()
                    .text(department).removeClass('template').removeClass('hidden');
                const title = $titleBlock.prop('outerHTML');
                $jobContainer.safeAppend(title);

                for (let i = 0; i < jobData[department].length; i++) {
                    const jobTitle = escapeHTML(jobData[department][i].title);
                    const jobDataDesc = escapeHTML(jobData[department][i].jobDesc);
                    const jobDataLink = escapeHTML(jobData[department][i].jobLink);

                    const $singleJobContainerBlock = $singleJobContainerTemplate.clone()
                        .removeClass('template').removeClass('hidden');
                    $singleJobContainerBlock.attr('href', jobDataLink);
                    $('.job-title span', $singleJobContainerBlock).text(jobTitle);
                    $('.job-desc', $singleJobContainerBlock).text(jobDataDesc);
                    const singleJobContainer = $singleJobContainerBlock.prop('outerHTML');
                    $jobContainer.safeAppend(singleJobContainer);

                }
                const $bottomPaddingBlock = $bottomPaddingTemplate.clone()
                    .removeClass('template').removeClass('hidden');
                const bottomPadding = $bottomPaddingBlock.prop('outerHTML');
                $jobContainer.safeAppend(bottomPadding);
            }
            const $exploreJobsBlock = $exploreJobsTemplate.clone().removeClass('template').removeClass('hidden');
            const exploreJobs = $exploreJobsBlock.prop('outerHTML');
            $jobContainer.safeAppend(exploreJobs);
        }
        else {
            const $noJobsBlock = $noJobsTemplate.clone().removeClass('template').removeClass('hidden');
            $noJobsBlock.text(l.about_no_vacancies_available);
            const noJobs = $noJobsBlock.prop('outerHTML');
            $jobContainer.safeAppend(noJobs);
        }
    },

    fetchTeamTailorJobsWithCache: async function(persistTime, $page) {
        "use strict";
        const jobData = sessionStorage.getItem('teamtailorfetch');
        const now = Date.now();
        if (jobData === null || JSON.parse(jobData).cacheTimer < now) {
            const cachedJobs = {
                jobs: [],
                cacheTimer: "",
            };
            M.req({a: 'ttfj'}).then((jobs) => {
                // If there is are jobs
                if (jobs.length > 0) {
                    const transformedData = Object.create(null);
                    for (let i = 0; i < jobs.length; i++) {
                        const department = jobs[i][2];
                        const job = Object.create(null);

                        job.title = jobs[i][1];
                        job.jobDesc = jobs[i][3];
                        job.jobLink = jobs[i][4];

                        if (transformedData[department]) {
                            transformedData[department].push(job);
                        }
                        else {
                            transformedData[department] = [job];
                        }
                    }
                    cachedJobs.jobs.push(transformedData);
                    const now = Date.now();
                    cachedJobs.cacheTimer = now + persistTime;
                    sessionStorage.setItem('teamtailorfetch', JSON.stringify(cachedJobs));
                    aboutus.populateJobs(transformedData, $page);
                }
                else {
                    // no jobs
                    cachedJobs.jobs.push([]);
                    const cacheTime = Date.now() + persistTime;
                    cachedJobs.cacheTimer = cacheTime + persistTime;
                    sessionStorage.setItem('teamtailorfetch', JSON.stringify(cachedJobs));
                    aboutus.populateJobs(cachedJobs.jobs[0], $page);
                }
            }).catch((ex) => {
                // api error just log, and populate with empty array
                console.warn(ex);
                cachedJobs.jobs.push([]);
                aboutus.populateJobs(cachedJobs.jobs[0], $page);
            });
        }
        else {
            aboutus.populateJobs(JSON.parse(jobData).jobs[0], $page);
        }
    },
};
