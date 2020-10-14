// Note: Referral Program is called as affiliate program at begining, so all systemic names are under word affiliate
// i.e. affiliate === referral

/**
 * Functionality for the affiliate program page
 */
var affiliateprogram = {

    /**
     * Initialise Affiliate program product page
     */
    init: function() {

        "use strict";

        if (!mega.flags.refpr) {
            loadSubPage('start');
            return false;
        }

        this.number = 10;
        this.plan = 1;
        this.time = 'week';

        this.$contentBlock = $('.bottom-page.affiliate-page');

        this.initFaqEvents();
        this.initCalcDropdowns();
        this.fillNumberDropdown(100);
        this.calculateEarn();
        this.bindFourWaysToRefer();
        this.bindDashboardLink();
        this.dynamicCount();
    },

    /**
     * Initialise FAQ section events
     */
    initFaqEvents: function() {

        "use strict";

        $('.affiliate.faq-block', this.$contentBlock).rebind('click', function(e) {

            var $this = $(this);
            var $btn = $('.expand-faq', $this);
            var $header = $('.faq-header', $this);
            var $faqBlocks = $('.affiliate.faq-block', this.$contentBlock);

            if (($(e.target).parent().is($btn) ||  $(e.target).is($header)) && $btn.hasClass('active')) {
                $btn.removeClass('active');
                $this.removeClass('expanded');
            }
            else {
                $faqBlocks.removeClass('expanded');
                $('.expand-faq', $faqBlocks).removeClass('active');
                $btn.addClass('active');
                $this.addClass('expanded');
            }
        });
    },

    /**
     * Initialise Calculator dropdowns
     */
    initCalcDropdowns: function() {

        "use strict";

        var self = this;

        var _getLocaleTime = function() {

            switch (self.time) {
                case 'day':
                    return l[930];
                case 'week':
                    return l[16292];
                case 'month':
                    return l[913];
                case 'year':
                    return l[932];
            }
        };

        // Open dropdowns
        $('.dropdown-lnk', this.$contentBlock).rebind('click', function() {

            var $this = $(this);
            var type = $this.data('type');
            var $dropdown = $('.dropdown.' + type, this.$contentBlock);

            if ($this.hasClass('active') || !$dropdown.length) {
                return false;
            }

            $('.dropdown:visible', this.$contentBlock).addClass('hidden');
            $('.dropdown-lnk.active', this.$contentBlock).removeClass('active');
            $this.addClass('active');
            $dropdown.removeClass('hidden fullscreen').removeAttr('style');

            // Set dropdown position
            affiliateprogram.setDropdownPosition($this, $dropdown);

            var event = is_mobile ? 'orientationchange.dropdownreposition' : 'resize.dropdownreposition';

            $(window).rebind(event, function() {
                affiliateprogram.setDropdownPosition($this, $dropdown);
            });

            // reset Contents scroll position to active item
            var $active = $('.active', $dropdown);
            var position = $active[0].offsetTop - $active[0].offsetHeight;

            $('.dropdown-content', $dropdown).scrollTop(position);

            $('.dropdown-content', $dropdown).rebind('scroll', function() {

                var $this = $(this);
                var scrollTop = $this.scrollTop();
                var $upArrow = $this.prev();
                var $downArrow = $this.next();

                if (scrollTop === 0) {
                    $upArrow.addClass('rotated');
                }
                else if (scrollTop >= $('.dropdown-wrap', $this).outerHeight() - $this.outerHeight()) {
                    $downArrow.addClass('rotated');
                }
                else {
                    $upArrow.removeClass('rotated');
                    $downArrow.removeClass('rotated');
                }
            });

            $('.dropdown-item', $dropdown).rebind('click.updatevalues', function() {

                var $item = $(this);
                var type = $this.data('type');
                var newvalue = $item.data('value');
                var $wrapper = $this.parent();

                self.$contentBlock.trigger('click.closedropdown');

                if (newvalue === self[type]) {
                    return false;
                }

                self[type] = newvalue;

                if (self.number === 1) {
                    $wrapper.safeHTML(l[23048]);
                }
                else {
                    $wrapper.safeHTML(l[22762]);
                    $('[data-type="number"]', $wrapper).text(self.number);
                }

                $('[data-type="plan"]', $wrapper).text(pro.getProPlanName(self.plan));
                $('[data-type="time"]', $wrapper).text(_getLocaleTime());

                $('.dropdown-item', $dropdown).removeClass('active');

                $item.addClass('active');

                self.calculateEarn();
                self.initCalcDropdowns();
            });
        });

        // Close dropdowns
        this.$contentBlock.rebind('click.closedropdown', function(e) {
            var $target = $(e.target);

            if (!$target.is('.top-login-button') && !$target.is('.dropdown-lnk') &&
                !$target.is('.notification') && !$target.is('.activity-status') &&
                !$target.closest('.dropdown').length) {

                $('.dropdown:visible', self.$contentBlock).addClass('hidden');
                $('.dropdown-lnk.active', self.$contentBlock).removeClass('active');
                $(window).off('orientationchange.dropdownreposition');
            }
        });
    },

    fillNumberDropdown: function(limit) {

        "use strict";

        var html = '';

        for (var i = 1; i <= limit; i++) {

            var template = '<div class="dropdown-item $active" data-value="$val">$val</div>';

            template = template.replace(/\$val/g, i).replace('$active', i === 10 ? 'active' : '');

            html += template;
        }

        $('.dropdown.number .dropdown-wrap', this.$contentBlock).safeHTML(html);
    },

    /**
     * Set dropdowns position
     */
    setDropdownPosition: function($link, $dropdown) {

        "use strict";

        if (!$link.length || !$dropdown.length || $dropdown.hasClass('hidden')) {
            return false;
        }

        if ($(window).outerHeight() < $dropdown.outerHeight() + 10) {
            $dropdown.addClass('fullscreen');
        }
        else {
            $dropdown.removeClass('fullscreen');
        }

        $('.dropdown-control', $dropdown).outerWidth(
            $('.dropdown-wrap', $dropdown).outerWidth()
        );

        $dropdown.position({
            of: $link,
            my: "center top",
            at: "center bottom",
            collision: "fit"
        });
    },

    /**
     * Earn calculator animation
     */
    animateEarn: function($obj, value) {

        "use strict";

        var start = $obj.data('value') ? $obj.data('value') : 0;

        $obj.data('value', Math.ceil(value));

        $({countNum: start}).animate({countNum: value}, {
            duration: 800,
            easing: 'linear',
            step: function() {
                $obj.text(formatCurrency(this.countNum));
            },
            complete: function() {
                $obj.text(formatCurrency(this.countNum));
            }
        });
    },

    /**
     * Earning Calculation
     */
    calculateEarn: function() {

        "use strict";

        // Membership data is not exist let retry it once client get it.
        if (pro.membershipPlans.length === 0) {
            pro.loadMembershipPlans(this.calculateEarn.bind(this));
            return;
        }

        var numOfUsers = this.number | 0;
        var multiplyToMakeYear = {
            'day': 365,
            'week': 52,
            'month': 12,
            'year': 1
        };
        var gainPerPlan = {};

        pro.membershipPlans.forEach(function(item) {
            if (item[4] === 12) {
                gainPerPlan[item[1]] = parseFloat(item[5]) * 0.2; // current affiliate percentage is 20%.
            }
        });

        var earnPerYear = numOfUsers * gainPerPlan[this.plan] * multiplyToMakeYear[this.time];

        affiliateprogram.animateEarn($('.affitiate.calc-price', this.$contentBlock), earnPerYear);
        affiliateprogram.animateEarn($('.calc-price-week', this.$contentBlock), earnPerYear / 52);
    },

    bindFourWaysToRefer: function() {

        'use strict';

        // For mobile hide all other buttons but referral url button
        if (is_mobile) {
            $('.refer-blocks .green-button:not(:first)', this.$contentBlock).addClass('hidden');
        }

        $('.refer-blocks .green-button', this.$contentBlock).rebind('click', function() {

            var $this = $(this);

            if (is_mobile) {

                var affguide = '/fm/refer/guide';

                var openGenerateRefLink = function() {

                    loadSubPage(affguide);

                    var $affguidepage = $('.affiliate-guide-page');

                    $('.expandable:first', $affguidepage).trigger('tap');
                    $('.generate', $affguidepage).trigger('tap');
                }

                if (u_storage.sid) {
                    openGenerateRefLink();
                }
                else {
                    login_next = openGenerateRefLink;
                    loadSubPage('login');
                }
            }
            else {
                mega.ui.showLoginRequiredDialog({minUserType: 3, skipInitialDialog: 1}).then(function() {

                    loadSubPage('/fm/refer');

                    M.onFileManagerReady(function() {
                        affiliateUI.referUsers.handleClick($this.data('reftype'));
                    });
                });
            }
        });
    },

    bindDashboardLink: function() {

        'use strict';

        $('a.to-aff-dash').rebind('click.todashboard', function(e) {

            e.preventDefault();

            if (is_mobile) {
                var affDash = '/fm/refer';

                if (u_storage.sid) {
                    loadSubPage(affDash);
                }
                else {
                    login_next = affDash;
                    loadSubPage('login');
                }
            }
            else {
                mega.ui.showLoginRequiredDialog({minUserType: 3, skipInitialDialog: 1}).then(function() {

                    loadSubPage('/fm/refer');
                });
            }
        });
    },

    /**
     * Dynamic count update for affiliate product page, this is rely on translation of string 22759 on babel.
     * If there is any error, it will be stay as default 150 million count.
     * @returns {void}
     */
    dynamicCount: function() {

        'use strict';

        var self = this;

        M.req("dailystats").then(function(res) {

            var text = l[22759];
            var text2 = l[22784];
            var userCount = res.confirmedusers.total / 1000000 | 0;
            var eastAsianCount = (userCount / 10 | 0) / 10; // this need to round down.

            // Special way of counting number in Korean and Janpanese
            if (locale === 'ko' || locale === 'jp') {
                userCount = eastAsianCount.toString().split('.');
                text = text.replace('1', userCount[0]).replace('5', userCount[1]);
                text2 = text2.replace('1', userCount[0]).replace('7', userCount[1]);
            }
            else if (locale === 'zh-Hans' || locale === 'zh-Hant') {
                text = text.replace('1.5', eastAsianCount);
                text2 = text2.replace('1.7', eastAsianCount);
            }
            else {
                text = text.replace('150', userCount);
                text2 = text2.replace('170', userCount);
            }

            $('.affiliate-page.top-info', self.$contentBlock).text(text);
            $('.dynamic-count-txt', self.$contentBlock).safeHTML(text2);
        }).catch(function(ex) {

            // We do not need to do anything here, over 150 million is still valid.
            if (d) {
                console.error('Dynamic count update failed.', ex);
            }
        });
    }
};
