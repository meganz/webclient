// Note: Referral Program is called as affiliate program at begining, so all systemic names are under word affiliate
// i.e. affiliate === referral

function affiliateUI() {

    'use strict';

    // Prevent ephemeral session to access
    if (u_type === 0) {
        msgDialog('confirmation', l[998], l[17146]
            + ' ' + l[999], l[1000], function(e) {
            if (e) {
                loadSubPage('register');
                return false;
            }
            loadSubPage('fm');
        });

        return false;
    }

    $('.fm-right-files-block, .section.conversations, .fm-right-block.dashboard').addClass('hidden');
    $('.nw-fm-left-icon').removeClass('active');
    $('.nw-fm-left-icon.affiliate').addClass('active').removeClass('animate');

    M.onSectionUIOpen('affiliate');
    loadingDialog.show('affiliateRefresh');

    M.affiliate.getAffiliateData().catch(function() {
        if (d) {
            console.error('Pulling affiliate data failed due to one of it\'s operation failed.');
        }
        msgDialog('warninga', l[7235], l[200] + ' ' + l[253], '', function() {
            loadingDialog.hide('affiliateRefresh');
        });
    }).then(function() {
        onIdle(clickURLs);
        M.affiliate.lastupdate = Date.now();
        loadingDialog.hide('affiliateRefresh');
        affiliateUI.startRender();
    });

    affiliateUI.$body = $('.fm-affiliate.body');
}

/*
 * Dialogs start
 */

/**
 * Affiliate guide dialog
 */
affiliateUI.guideDialog = {

    // Init event on affiliate dashboard to open dialog.
    init: function() {

        'use strict';

        var self = this;

        $('.fm-affiliate.guide-dialog', affiliateUI.$body).rebind('click.guide-dialog', function() {
            affiliateUI.guideDialog.show();

            if (this.classList.contains('to-rules')) {
                onIdle(function() {
                    self.$firstStepBlock.removeClass('active');
                    self.$secondStepBlock.addClass('active');
                    self.showAffiliateSlide(3);
                });
            }
        });
    },

    // Show dialog
    show: function() {

        'use strict';

        var self = this;

        this.$dialog = $('.fm-dialog.affiliate-guide');
        this.$firstStepBlock = $('.affiliate-guide.step1', this.$dialog);
        this.$secondStepBlock = $('.affiliate-guide.step2', this.$dialog);
        this.slidesLength = $('.content', this.$secondStepBlock).length;

        this.bindDialogEvents();

        // Reset dialog contents
        this.$firstStepBlock.addClass('active');
        this.$secondStepBlock.removeClass('active');
        this.showAffiliateSlide();

        M.safeShowDialog('affiliate-guide-dialog', self.$dialog);
    },

    // Dialog event binding
    bindDialogEvents: function() {

        'use strict';

        var self = this;

        // Step1. Welcome dialog, How it works button click - > show step 2.
        $('.default-green-button.how-it-works', this.$dialog).rebind('click.guide-dialog-hiw-btn', function() {
            self.$firstStepBlock.removeClass('active');
            self.$secondStepBlock.addClass('active');

            // We should reposition Step2 dialog
            self.$dialog.css('margin-top', '-' + self.$dialog.outerHeight() / 2 + 'px');
        });

        // Step 2. Back/Next buttons
        $('.affiliate-guide.bottom-button', this.$dialog).rebind('click.btns', function() {
            var currentSlide = $('.nav-button.active', self.$dialog).data('slide');

            if ($(this).hasClass('next') && currentSlide + 1 <= self.slidesLength) {
                self.showAffiliateSlide(currentSlide + 1);
            }
            else if ($(this).hasClass('back') && currentSlide - 1 >=  0) {
                self.showAffiliateSlide(currentSlide - 1);
            }
        });

        $('.default-green-button.dashboard', this.$secondStepBlock).rebind('click.to-aff-page', function() {
            loadSubPage('fm/refer');
        });

        // Step 2.Top nav buttons
        $('.affiliate-guide.nav-button', this.$dialog).rebind('click.top-nav', function() {
            self.showAffiliateSlide($(this).attr('data-slide'));
        });

        // Closing dialog related
        $('.fm-dialog-close', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
            affiliateUI.animateIcon();
            $('.fm-dialog-overlay').off('click.affGuideDialog');
        });

        $('.fm-dialog-overlay').rebind('click.affGuideDialog', function() {
            affiliateUI.animateIcon();
            $('.fm-dialog-overlay').off('click.affGuideDialog');
        });
    },

    // Step 2. Show Slides.
    showAffiliateSlide: function(num) {

        'use strict';

        num = num | 0 || 1;

        $('.content.active', this.$secondStepBlock).removeClass('active');
        $('.content.slide' + num, this.$secondStepBlock).addClass('active');

        // Show/hide Back button
        if (num === 1) {
            $('.bottom-button.back', this.$secondStepBlock).addClass('hidden');
        }
        else {
            $('.bottom-button.back', this.$secondStepBlock).removeClass('hidden');
        }

        // Slide 3 requires scrollpane
        if (num === 3) {
            $('.affiliate-guide.content.slide3', this.$secondStepBlock)
                .jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true});
        }

        // Show/hide Affiliate Dashboard button/Next button
        if (num === this.slidesLength) {
            $('.bottom-button.next', this.$secondStepBlock).addClass('hidden');

            if (page === 'fm/refer') {
                $('.default-green-button.dashboard', this.$secondStepBlock).addClass('hidden');
            }
            else {
                $('.default-green-button.dashboard', this.$secondStepBlock).removeClass('hidden');
            }
        }
        else {
            $('.default-green-button', this.$secondStepBlock).addClass('hidden');
            $('.bottom-button.next', this.$secondStepBlock).removeClass('hidden');
        }

        // Change top buttons state
        $('.nav-button.active', this.$secondStepBlock).removeClass('active');
        $('.nav-button.slide' + num, this.$secondStepBlock).addClass('active');
    }
};

/**
 * Affiliate referral url generation dialog
 */
affiliateUI.referralUrlDialog = {

    // Show dialog
    show: function() {

        'use strict';

        var self = this;
        this.$dialog = $('.fm-dialog.generate-url');

        this.bindDialogEvents();
        $('.page-names span[data-page="startpage"]', this.$dialog).click();

        var showWelcome = !M.affiliate.id;

        this.updateURL().then(function() {

            M.safeShowDialog('referral-url-dialog', self.$dialog);

            if (showWelcome) {
                affiliateUI.registeredDialog.show(1);
            }
        });
    },

    // Bind dialog dom event
    bindDialogEvents: function() {

        'use strict';

        var self = this;
        var $urlBlock = $('.url', this.$dialog);

        $urlBlock.rebind('click.select', function() {
            var sel, range;
            var el = $(this)[0];
            if (window.getSelection && document.createRange) {
                sel = window.getSelection();
                if (sel.toString() === ''){
                    window.setTimeout(function(){
                        range = document.createRange();
                        range.selectNodeContents(el);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    },1);
                }
            }
        });

        var $copyBtn = $('.copy-button', this.$dialog);

        if (is_extension || M.execCommandUsable()) {
            $copyBtn.removeClass('hidden');
            $copyBtn.rebind('click.copy-to-clipboard', function() {
                var links = $.trim($urlBlock.text());
                var toastTxt = l[7654];
                copyToClipboard(links, toastTxt);
            });
        }
        else {
            $copyBtn.addClass('hidden');
        }

        var $pageBtns = $('.page-names span', this.$dialog);

        $pageBtns.rebind('click.select-target-page', function() {

            var $this = $(this);

            $pageBtns.removeClass('active');
            $this.addClass('active');

            if ($this.data('page') === 'more') {
                self.updateURL(1);
                $('.custom-block', self.$dialog).removeClass('hidden');
            }
            else {
                self.updateURL();
                $('.custom-block', self.$dialog).addClass('hidden');
            }

            // Center dialogs
            if (!is_mobile) {
                self.$dialog.css({
                    'margin-left': -1 * (self.$dialog.outerWidth() / 2),
                    'margin-top': -1 * (self.$dialog.outerHeight() / 2)
                });
            }
        });

        $('.url-input', this.$dialog).rebind('keyup.enter-custom-url', function(e) {
            if (e.keyCode === 13) {
                self.checkAndSetCustomURL();
            }
        });

        $('.custom-button', this.$dialog).rebind('click.enter-custom-url', function() {
            self.checkAndSetCustomURL();
        });

        $('.fm-dialog-close', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
        });
    },

    /**
     * Check manually entered url by user is valid to generate custom url.
     * If url is not valid (non mega url, etc) show error.
     * @returns {Boolean|undefined} False if value is empty, or undefined as it act as void function
     */
    checkAndSetCustomURL: function() {

        'use strict';

        var val = $('.url-input', this.$dialog).val();
        var baseUrl = getBaseUrl();
        var baseUrlRegExp = new RegExp(baseUrl, 'ig');

        if (!val) {
            return false;
        }
        else if (val.search(baseUrlRegExp) === 0) {
            this.customTargetPage = val.replace(baseUrlRegExp, '');
            this.updateURL();
        }
        else if (('https://' + val).search(baseUrlRegExp) === 0) {
            this.customTargetPage = val.replace(baseUrl.replace('https://', ''), '');
            this.updateURL();
        }
        else {
            $('.custom-block', this.$dialog).addClass('error');
        }
    },

    /**
     * Update dom input element with url generated from checkAndSetCustomURL function
     * @param {Boolean} clear Clear the input field
     * @returns {Promise} Promise that resolve once process is done.
     */
    updateURL: function(clear) {

        'use strict';

        var targetPage = $('.page-names .active', this.$dialog).data('page');
        var $urlBlock = $('.url', this.$dialog);

        $('.custom-block', this.$dialog).removeClass('error');

        if (clear) {
            $urlBlock.empty();
            return Promise.resolve();
        }

        if (targetPage === 'more' && this.customTargetPage !== undefined) {
            targetPage = this.customTargetPage;

            if (targetPage.charAt(0) === '/') {
                targetPage = targetPage.slice(1);
            }
            if (targetPage.charAt(targetPage.length - 1) === '/') {
                targetPage = targetPage.slice(0, -1);
            }
        }

        return M.affiliate.getURL(targetPage).then(function(url) {
            var urlWithoutAfftag = getBaseUrl() + (targetPage === '' ? '' : '/#' + targetPage);
            $urlBlock.safeHTML(url.replace(urlWithoutAfftag, '<span>' + urlWithoutAfftag + '</span>'));
        });
    },
};

/**
 * Affiliate welcome(registered) dialog
 */
affiliateUI.registeredDialog = {

    // Show dialog
    show: function(skipReq) {

        'use strict';

        if (u_type > 2 && mega.flags.refpr && !pfid) {

            var self = this;
            this.$dialog = $('.fm-dialog.joined-to-affiliate');

            var _showRegisteredDialog = function() {
                self.bindDialogEvents();
                M.safeShowDialog('joined-to-affiliate', self.$dialog);
            };

            if (M.currentdirid === 'refer') {
                $('.default-green-button span', this.$dialog).text(l[81]);
                $('.cancel-button', this.$dialog).addClass('hidden');
            }

            // After referal url dialog.
            if (skipReq) {
                _showRegisteredDialog();
            }
            // User never see this dialog before.
            else if (!M.affiliate.id) {
                M.affiliate.getID().then(function() {
                    _showRegisteredDialog();
                });
            }
        }
    },

    // Bind dialog dom event
    bindDialogEvents: function() {

        'use strict';

        $('.default-green-button', this.$dialog).rebind('click.to-aff-page', function() {
            closeDialog();
            affiliateUI.guideDialog.show();
        });

        $('.fm-dialog-close, .cancel-button', this.$dialog).rebind('click.close-dialog', function() {
            closeDialog();
        });
    }
};

/*
 * Dialogs End
 */

/*
 * Dashboard Start
 */

/*
 * Start affiliate dashboard rendering. Required Chart.js
 */
affiliateUI.startRender = function() {

    'use strict';

    loadingDialog.show('affiliateUI');

    affiliateUI.referUsers.init();
    affiliateUI.commissionIndex.init();
    affiliateUI.geographicDistribution.init();
    affiliateUI.guideDialog.init();

    M.require('charts_js', 'charthelper_js').done(function() {
        affiliateUI.registrationIndex.init();
        affiliateUI.purchaseIndex.init();
        loadingDialog.hide('affiliateUI');
    });

    // Make sure init scrolling for the dashboard
    initAffiliateScroll();
};

/*
 * Refer users section
 */
affiliateUI.referUsers = {

    init: function() {

        'use strict';

        this.bindEvents();
    },

    bindEvents: function() {

        'use strict';

        $('.refer-block', affiliateUI.$body).rebind('click.affRefClick', function() {
            affiliateUI.referUsers.handleClick($(this).data('reftype'));
        });

        $('.refer-users', affiliateUI.$body).rebind('click.affRefClick', function() {
            affiliateUI.$body.data('jsp').scrollTo(0, 0, 1);
        });
    },

    /*
     * Click event handling for refer user feature.
     * also used for product page.
     * @param {String} reftype Button clicked by user.
     */
    handleClick: function(reftype) {

        'use strict';

        switch (reftype) {
            case 'url':
                // show URL dialog
                affiliateUI.referralUrlDialog.show();
                break;
            case 'link':
                M.safeShowDialog('create-new-link', function() {
                    M.initFileAndFolderSelectDialog('create-new-link');
                });
                break;
            case 'chatlink':
                M.safeShowDialog('create-new-chat-link', function() {
                    M.initNewChatlinkDialog();
                });
                break;
            case 'invite':
                $.hideContextMenu();
                if (u_attr && u_attr.b && u_attr.b.s === -1) {
                    M.showExpiredBusiness();
                    return;
                }
                contactAddDialog(false, true);
                setContactLink();
                break;
        }
    }
};

/*
 * Commission index section
 */
affiliateUI.commissionIndex = {

    init: function() {

        'use strict';

        var balance = M.affiliate.balance;
        this.$block = $('.mega-data-box.commission', affiliateUI.$body);

        var currencyHtml = '';
        var localTotal;
        var localPending;
        var localAvailable;

        if (balance.localCurrency === 'EUR') {
            $('.non-euro-only', this.$block).addClass('hidden');
            $('.euro-price', this.$block).addClass('hidden');

            localTotal = formatCurrency(balance.localTotal);
            localPending = formatCurrency(balance.localPending);
            localAvailable = formatCurrency(balance.localAvailable);
        }
        else {

            localTotal = formatCurrency(balance.localTotal, balance.localCurrency, 'code')
                .replace(balance.localCurrency, '').trim();
            localPending = formatCurrency(balance.localPending, balance.localCurrency, 'code')
                .replace(balance.localCurrency, '').trim();
            localAvailable = formatCurrency(balance.localAvailable, balance.localCurrency, 'code')
                .replace(balance.localCurrency, '').trim();

            currencyHtml = ' <span class="currency">' + balance.localCurrency + '</span>';

            $('.commission-block.total .euro-price', this.$block)
                .text(formatCurrency(balance.pending + balance.available));
            $('.commission-block.pending .euro-price', this.$block).text(formatCurrency(balance.pending));
            $('.commission-block.available .euro-price', this.$block).text(formatCurrency(balance.available));
        }

        $('.commission-block.total .price', this.$block).safeHTML(localTotal + currencyHtml);
        $('.commission-block.pending .price', this.$block).safeHTML(localPending + currencyHtml);

        currencyHtml += balance.localCurrency === 'EUR' ? '' : '<sup>3</sup>';

        $('.commission-block.available .price', this.$block).safeHTML(localAvailable + currencyHtml);

        if (u_attr.b) {
            $('.no-buisness', this.$block).addClass('hidden');
        }
    }
};

/*
 * Registration index section
 */
affiliateUI.registrationIndex = {

    init: function() {

        'use strict';

        this.$registerChartBlock = $('.mega-data-box.registration', affiliateUI.$body);
        this.type = $('.fm-affiliate.chart-period.active', this.$registerChartBlock).data('type');

        this.bindEvents();
        this.calculateTotal();
        this.setChartTimeBlock();
        this.drawChart();
    },

    bindEvents: function() {

        'use strict';

        var self = this;
        var $buttons = $('.fm-affiliate.chart-period', this.$registerChartBlock);
        var $datesWrapper = $('.fm-affiliate.chart-dates', this.$registerChartBlock);

        $buttons.rebind('click.chooseChartPeriod', function() {

            $buttons.removeClass('active');
            this.classList.add('active');

            self.type = this.dataset.type;
            self.setChartTimeBlock();
            self.drawChart();
        });

        $datesWrapper.rebind('click.selectDateRange', function(e) {

            if (e.target.classList.contains('prev-arrow')) {
                self.setChartTimeBlock(self.start - 1);
            }
            else if (e.target.classList.contains('next-arrow')) {
                self.setChartTimeBlock(self.end + 1);
            }
            else {
                return false;
            }

            self.drawChart();
        });
    },

    /**
     * Calculate Total registerations and incremented value over last month
     * @returns {Void} void function
     */
    calculateTotal: function() {

        'use strict';

        this.total = M.affiliate.signupList.length;

        $('.affiliate-total-reg', this.$registerChartBlock).text(this.total);

        var thisMonth = calculateCalendar('m');

        var thisMonthCount = 0;

        M.affiliate.signupList.forEach(function(item) {
            if (thisMonth.start <= item.ts && item.ts <= thisMonth.end) {
                thisMonthCount++;
            }
        });

        $('.charts-head-cell .compare span', this.$registerChartBlock).text('+' + thisMonthCount);
    },

    /**
     * Set period block(start and end times) to render chart, depends on time given, type of period.
     * @param {Number} unixTime unixtime stamp given.
     * @returns {Void} void function
     */
    setChartTimeBlock: function(unixTime) {

        'use strict';

        var $datesBlock = $('.fm-affiliate.chart-dates .dates', affiliateUI.$body);
        var calendar = calculateCalendar(this.type || 'w', unixTime);

        this.start = calendar.start;
        this.end = calendar.end;

        if (this.type === 'w') {
            var startDate = acc_time2date(this.start, true);
            var endDate = acc_time2date(this.end, true);

            $datesBlock.text(l[22899].replace('%d1' ,startDate).replace('%d2' ,endDate));
        }
        else if (this.type === 'm') {
            $datesBlock.text(time2date(this.start, 3));
        }
        else if (this.type === 'y') {
            $datesBlock.text(new Date(this.start * 1000).getFullYear());
        }
    },

    /**
     * Set labels for the chart depends on type of period.
     * @returns {Array} lbl An array of labels
     */
    getLabels: function() {

        'use strict';

        var lbl = [];

        if (this.type === 'w') {
            for (var i = 0; i <= 6; i++) {
                lbl.push(time2date(this.start + i * 86400, 10).toUpperCase());
            }
        }
        else if (this.type === 'm') {
            var endDateOfMonth = new Date(this.end * 1000).getDate();

            for (var k = 1; k <= endDateOfMonth; k++) {
                lbl.push(k);
            }
        }
        else if (this.type === 'y') {

            var startDate = new Date(this.start * 1000);
            lbl.push(time2date(startDate.getTime() / 1000, 12).toUpperCase());

            for (var j = 0; j <= 10; j++) {
                startDate.setMonth(startDate.getMonth() + 1);
                lbl.push(time2date(startDate.getTime() / 1000, 12).toUpperCase());
            }
        }

        return lbl;
    },

    /**
     * Lets draw chart with settled options and data.
     * @returns {Void} void function
     */
    drawChart: function() {

        'use strict';

        var self = this;
        var labels = this.getLabels();
        var data = [];

        if (this.chart) {
            this.chart.destroy();
        }

        M.affiliate.signupList.forEach(function(item) {
            if (self.start <= item.ts && item.ts <= self.end) {
                var val;
                switch (self.type) {
                    case 'w':
                        val = time2date(item.ts, 10).toUpperCase();
                        break;
                    case 'm':
                        val = new Date(item.ts * 1000).getDate();
                        break;
                    case 'y':
                        val = time2date(item.ts, 12).toUpperCase();
                        break;
                }

                var index = labels.indexOf(val);

                data[index] = data[index] + 1 || 1;
            }
        });

        var ctx = document.getElementById('register-chart');
        var ticksLimit = 6;
        ctx.height = 186;

        //  TODO: set ticksLimit=4 for all months after library update
        if (this.type === 'm') {
            var daysInMonth = new Date(this.end * 1000).getDate();

            ticksLimit = daysInMonth === 28 ? 5 : 4;
        }

        this.chart = new Chart(ctx, {
            type: 'roundedBar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: 'rgba(101,187,226,0.5)',
                    hoverBackgroundColor: 'rgb(64, 142, 201)',
                    borderWidth: 0
                }]
            },
            options: {
                barRoundness: 1,
                maintainAspectRatio: false,
                legend: {
                    display: false
                },
                responsive: true,
                scales: {
                    xAxes: [{
                        display: true,
                        maxBarThickness: 8,
                        gridLines : {
                            display : false
                        },
                        ticks: {
                            fontColor: '#B7B7B7',
                            fontSize: 12,
                            autoSkip: true,
                            maxTicksLimit: ticksLimit,
                            maxRotation: 0
                        }
                    }],
                    yAxes: [{
                        display: true,
                        ticks: {
                            fontColor: '#999999',
                            fontSize: 12,
                            beginAtZero: true,
                            precision: 0,
                            suggestedMax: 4
                        },
                        gridLines: {
                            color: "#F0F0F0",
                            zeroLineColor: '#F0F0F0',
                            drawBorder: false,
                        }
                    }]
                },
                tooltips: {
                    displayColors: false,
                    callbacks: {
                        title: function(tooltipItem) {
                            if (self.type === 'm') {
                                var ttDate = new Date(self.start * 1000);
                                ttDate.setDate(tooltipItem[0].xLabel | 0);
                                return acc_time2date(ttDate.getTime() / 1000, true);
                            }
                            return tooltipItem[0].xLabel;
                        }
                    }
                }
            }
        });
    }
};

/**
 * Purchase index
 */
affiliateUI.purchaseIndex = {

    init: function() {

        'use strict';

        this.$purchaseChartBlock = $('.mega-data-box.purchase', affiliateUI.$body);

        this.count();
        this.drawChart();
    },

    /**
     * Count type of purchase made
     * @returns {Void} void function
     */
    count: function() {

        'use strict';

        var self = this;
        var creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);
        var thisMonth = calculateCalendar('m');
        var proPlanIDMap = {};

        this.totalCount = creditList.length;
        this.monthCount = 0;
        this.countedData = {};

        pro.membershipPlans.forEach(function(item) {
            proPlanIDMap[item[0]] = item[1];
        });

        creditList.forEach(function(item) {
            if (thisMonth.start <= item.gts && item.gts <= thisMonth.end) {
                self.monthCount++;
            }

            if (item.b) {
                self.countedData.b = ++self.countedData.b || 1;
            }
            else {
                var index = proPlanIDMap[item.si];
                self.countedData[index] = ++self.countedData[index] || 1;
            }
        });

        $('.affiliate-total-pur', this.$purchaseChartBlock).text(this.totalCount);
        $('.charts-head-cell .compare span', this.$purchaseChartBlock).text('+' + this.monthCount);

        $('.list-item.prol .label', this.$purchaseChartBlock)
            .text(formatPercentage(this.countedData[4] / this.totalCount || 0));
        $('.list-item.prol .num', this.$purchaseChartBlock).text(this.countedData[4] || 0);
        $('.list-item.pro1 .label', this.$purchaseChartBlock)
            .text(formatPercentage(this.countedData[1] / this.totalCount || 0));
        $('.list-item.pro1 .num', this.$purchaseChartBlock).text(this.countedData[1] || 0);
        $('.list-item.pro2 .label', this.$purchaseChartBlock)
            .text(formatPercentage(this.countedData[2] / this.totalCount || 0));
        $('.list-item.pro2 .num', this.$purchaseChartBlock).text(this.countedData[2] || 0);
        $('.list-item.pro3 .label', this.$purchaseChartBlock)
            .text(formatPercentage(this.countedData[3] / this.totalCount || 0));
        $('.list-item.pro3 .num', this.$purchaseChartBlock).text(this.countedData[3] || 0);
        $('.list-item.business .label', this.$purchaseChartBlock)
            .text(formatPercentage(this.countedData.b / this.totalCount || 0));
        $('.list-item.business .num', this.$purchaseChartBlock).text(this.countedData.b || 0);
    },

    /**
     * Let draw chart with given data.
     * @returns {Void} void function
     */
    drawChart: function() {

        'use strict';

        if (this.chart) {
            this.chart.destroy();
        }

        var ctx = document.getElementById('purchase-chart');

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [
                        this.countedData[4],
                        this.countedData[1],
                        this.countedData[2],
                        this.countedData[3],
                        this.countedData.b,
                        $.isEmptyObject(this.countedData) ? 1  : 0
                    ],
                    backgroundColor: [
                        '#FFC240',
                        '#FF6F00',
                        '#FF0003',
                        '#CC0049',
                        '#408EC9',
                        '#F6F6F6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                events: [],
                legend: {
                    display: false
                },
                cutoutPercentage: 74
            }
        });
    },
};

/**
 * Geographic distribution
 */
affiliateUI.geographicDistribution = {

    init: function() {

        'use strict';

        this.$geoDistBlock = $('.distribution', affiliateUI.$body);
        this.bindEvents();
        this.count();
        this.drawTable();
    },

    bindEvents: function() {

        'use strict';

        var self = this;

        $('.distribution-head .tab-button', this.$geoDistBlock).rebind('click.geoDist', function() {

            var $this = $(this);

            $('.tab-button', self.$geoDistBlock).removeClass('active');
            $('.chart-body', self.$geoDistBlock).addClass('hidden');

            $this.addClass('active');
            $('.chart-body.' + $(this).data('table'), self.$geoDistBlock).removeClass('hidden');
        });
    },

    /**
     * Count how many registration/puchases are made on each country
     * @returns {Void} void function
     */
    count: function() {

        'use strict';

        var self = this;
        this.signupGeo = {};

        M.affiliate.signupList.forEach(function(item) {
            self.signupGeo[item.cc] = ++self.signupGeo[item.cc] || 1;
        });

        this.creditGeo = {};

        var creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);

        creditList.forEach(function(item) {
            self.creditGeo[item.cc] = ++self.creditGeo[item.cc] || 1;
        });
    },

    /**
     * Let's draw table with give data
     * @returns {Void} void function
     */
    drawTable: function() {

        'use strict';

        var self = this;

        var template =
            '<div class="fm-affiliate list-item">' +
                '<img src="$countryImg" alt=""> $countryName <span class="num">$count</span>' +
            '</div>';

        var _sortFunc = function(a, b) {
            return self.signupGeo[b] - self.signupGeo[a];
        };
        var orderedSignupGeoKeys = Object.keys(this.signupGeo).sort(_sortFunc);
        var orderedCreditGeoKeys = Object.keys(this.creditGeo).sort(_sortFunc);
        var html = '';
        var countList = this.signupGeo;

        var _htmlFunc = function(item) {
            var country = countrydetails(item);
            html += template.replace('$countryImg', staticpath + 'images/flags/' + country.icon)
                .replace('$countryName', country.name || 'Unknown').replace('$count', countList[item]);
        };

        orderedSignupGeoKeys.forEach(_htmlFunc);

        if (html) {
            $('.geo-dist-reg .list', this.$geoDistBlock).safeHTML(html);
        }
        else {
            $('.geo-dist-reg .list', this.$geoDistBlock).empty();
        }

        html = '';
        countList = this.creditGeo;

        orderedCreditGeoKeys.forEach(_htmlFunc);

        if (html) {
            $('.geo-dist-pur .list', this.$geoDistBlock).safeHTML(html);
        }
        else {
            $('.geo-dist-pur .list', this.$geoDistBlock).empty();
        }
    }
};

/*
 * Dashboard End
 */

/*
 * Extras
 */

/**
 * Animate Icon to let user awares of affiliate dashboard icon.
 * @returns {Void} void function
 */
affiliateUI.animateIcon = function() {

    'use strict';

    if (!M.affiliate.icon) {

        var $icon = $('.nw-fm-left-icon.affiliate');

        M.affiliate.setUA('icon', 1).then(function() {
            $icon.addClass('animate');
        });
    }
};

mBroadcaster.addListener('fm:initialized', function() {

    'use strict';

    // If user is not fully registered or this is public link without login do not load affiliate data yet
    if (!folderlink && u_type > 2 && u_attr.flags.refpr) {

        // If user is newly registered user,
        if ($.noAffGuide) {

            // Just mark him as he already saw the guide dialog and icon animation so it never happens to the user
            delete $.noAffGuide;
            M.affiliate.setUA('icon', 1);
        }
        else if (!M.affiliate.icon) {
            // else if user is existing user who did not see dialog show it.
            affiliateUI.guideDialog.show();
        }

        // we reached our goal, stop listening for fminitialized
        return 0xDEAD;
    }
});
