// Note: Referral Program is called as affiliate program at begining, so all systemic names are under word affiliate
// i.e. affiliate === referral

var affiliateRedemption = {
    currentStep: 1,
    requests: {
        first: {},
        second: {}
    },
    req1res: {},
    dynamicInputs: {}
};

affiliateRedemption.getMethodString = function(type) {

    'use strict';

    return ({1: l[23301], 2: l[6802]})[type];
};

affiliateRedemption.reset = function() {

    'use strict';

    this.currentStep = 1;
    this.requests = {
        first: {},
        second: {}
    };
    this.req1res = {};
    this.dynamicInputs = {};

    this.stopTimer();
};

affiliateRedemption.close = function(force) {

    'use strict';

    if (is_mobile) {
        mobile.affiliate.closeRedeemPage();
    }
    else {
        affiliateUI.redemptionDialog.hide(force);
    }
};

affiliateRedemption.getRedemptionStatus = function(code) {

    'use strict';

    switch (code) {
        case 1:
        case 2:
        case 3:
            return {c: 'orange', s: l[22833], class: 'processing', m: l[23371], bm: l[23370]};
        case 4:
            return {c: '', s: l[23277], class: 'complete', m: l[23372], bm: l[23373]};
        case 5:
        case 6:
            return {c: 'red', s: l[22819], class: 'failed', m: l[23369]};
    }
};

affiliateRedemption.processSteps = function() {

    'use strict';

    var self = this;
    var steps;

    if (is_mobile) {
        steps = [
            ['__processBlock1'],
            ['__processBlock2'],
            ['__processBlock3'],
            this.requests.first.m === 2 ? [] : [ '__processBlock4'], // If this is Bitcoin skip Block 4
            ['__processBlock5']
        ];

        this.$rdmUI = mobile.affiliate.$page;
    }
    else {
        steps = [
            ['__processBlock1', '__processBlock2'],
            ['__processBlock3'],
            this.requests.first.m === 2 ? [] : [ '__processBlock4'], // If this is Bitcoin skip Block 4
            ['__processBlock5']
        ];

        this.$rdmUI = affiliateUI.redemptionDialog.$dialog;
    }

    return Promise.all(steps[this.currentStep - 1].map(function(func) {
        return self[func]();
    })).catch(function(ex) {

        if (ex) {

            if (d) {
                console.error('Requesting redeem failed, step: ' + self.currentStep, ex);
            }

            var mainMessage = l[200];
            var subMessage = '';

            var __errorForTfw = function() {

                // List of error with default messgage
                var redeemErrors = {
                    '-1': '', // Generic error when we don't know what went wrong.
                    '-2': 'Transaction is declined', // Gateway declined to process the transaction.
                    '-3': 'Invalid request', // An invalid request was made.
                    '-4': 'Time limit exceeded', // The user/mega took to long to do something.
                    '-5': 'Too many requests', // too many requests are being made at once.
                };

                if (typeof ex === 'object') {
                    subMessage = ex.keys || ex.msg || redeemErrors[ex.MEGAstatus] || '';
                }

                if (typeof subMessage === 'object') {
                    subMessage = subMessage.join('<br>');
                }
            };

            if (self.requests.first.m === 1) {
                __errorForTfw();
            }
            else if (self.requests.first.m === 2 && typeof ex === 'object') {
                mainMessage += ' ' + (ex.MEGAstatus === -2 ? l[23535] : l[253]);
            }

            if (ex === ETEMPUNAVAIL) {
                mainMessage += ' ' + l[253];
            }

            // Oops something went wrong for api side errors
            msgDialog('warninga', '', mainMessage, subMessage, function() {

                loadingDialog.hide('redeemRequest');
                self.$rdmUI.removeClass('arrange-to-back');

                if (ex.close) {
                    self.close(true);
                }
            });
        }
        // This is internal validation error so no error message required
        else {
            if (d) {
                console.error('Input validation failed, step: ' + self.currentStep);
            }

            loadingDialog.hide('redeemRequest');
        }

        return false;
    });
};

affiliateRedemption.__processBlock1 = function() {

    'use strict';

    this.requests.first.m = $('.payment-type .radioOn input', this.$step).val() | 0;
};

affiliateRedemption.__processBlock2 = function() {

    'use strict';

    var method = this.requests.first.m;
    var activeMethodMin = M.affiliate.redeemGateways[method].min || 50;
    var value = $('#affiliate-redemption-amount', this.$step).val();

    if (!value){

        msgDialog('warninga', '', l[23318]);
        return Promise.reject();
    }
    else if (value < activeMethodMin){

        msgDialog('warninga', '', l[23319].replace('%1', formatCurrency(activeMethodMin)));
        return Promise.reject();
    }
    else if (value > M.affiliate.balance.available) {

        msgDialog('warninga', '', l[23320]);
        return Promise.reject();
    }

    this.requests.first.p = parseFloat($('#affiliate-redemption-amount', this.$step).val());
};

affiliateRedemption.__processBlock3 = function() {

    'use strict';

    var self = this;

    // If this is Bitcoin, record bitcoin address to second request
    if (this.requests.first.m === 2) {

        var bitcoinAddress = $('#affi-bitcoin-address', this.$step).val().trim();
        var megaInput = $('#affi-bitcoin-address', this.$step).data('MegaInputs');

        // No address entered
        if (!bitcoinAddress) {

            if (megaInput) {
                megaInput.showError(l[23321]);
            }
            else {
                msgDialog('warninga', '', l[23321]);
            }

            this.$rdmUI.removeClass('arrange-to-back');

            return Promise.reject();
        }
        // This is not valid bitcoin address format
        else if (validateBitcoinAddress(bitcoinAddress)) {

            if (megaInput) {
                megaInput.showError(l[23322]);
            }
            else {
                msgDialog('warninga', '', l[23322]);
            }

            this.$rdmUI.removeClass('arrange-to-back');

            return Promise.reject();
        }

        this.requests.second.extra = {an: $('#affi-bitcoin-address', this.$step).val()};
    }

    if (is_mobile) {

        this.requests.first.cc = $('#affi-country', this.$step).val();
        this.requests.first.c = $('#affi-currency', this.$step).val();
    }
    else {
        this.requests.first.cc = $('#affi-country .default-dropdown-item.active', this.$step).data('type');
        this.requests.first.c = $('#affi-currency .default-dropdown-item.active', this.$step).data('type');
    }

    return Promise.all([
        M.affiliate.redeemStep1(),
        this.requests.first.m === 2 ? false : M.affiliate.getRedeemAccountInfo()
    ]).then(function(res) {

        self.req1res = res;
    }, function(ex) {

        delete self.requests.first.cc;
        delete self.requests.first.c;
        return Promise.reject(ex);
    });
};

affiliateRedemption.__processBlock4 = function() {

    'use strict';

    if (!this.validateDynamicAccInputs()) {
        return Promise.reject();
    }

    this.recordSecondReqValues();

    if ($('.save-data-checkbox .checkdiv:visible', this.$step).hasClass('checkboxOn')) {
        this.updateAccInfo();
    }
};

affiliateRedemption.__processBlock5 = function() {

    'use strict';

    // Rquest ID set on this phase due to Bitcoin skip step 3.
    this.requests.second.rid = this.req1res[0].rid;

    return M.affiliate.redeemStep2();
};

affiliateRedemption.recordSecondReqValues = function() {

    'use strict';

    var self = this;

    // Pass validation, now start record it.
    this.requests.second.extra = {
        an: $('#affi-account-name', this.$rdmUI).val(),
        details: []
    };

    // Record account type
    if (this.req1res[0].data.length > 1) {

        var $accountType = $('#account-type', this.$rdmUI);
        var activeTypeValue = $accountType.hasClass('default-select') ?
            $('.default-dropdown-item.active', $accountType).data('type') : $accountType.val();

        this.requests.second.extra.type = this.req1res[0].data[activeTypeValue][0];
        this.requests.second.extra.title = this.req1res[0].data[activeTypeValue][1];
    }
    else {
        this.requests.second.extra.type = this.req1res[0].data[0][0];
        this.requests.second.extra.title = this.req1res[0].data[0][1];
    }

    // Lets use UI input to order it as UI shows.
    var $dynamicInputsWrapper = $('.affi-dynamic-acc-info', this.$rdmUI);
    var uiSelectString = is_mobile ? '.affi-dynamic-acc-select select, .affi-dynamic-acc-input input' :
        '.affi-dynamic-acc-select .default-select, .affi-dynamic-acc-input';
    var $dynamicInputListFromUI = $(uiSelectString, $dynamicInputsWrapper);

    // Dynamic input recording
    for (var i = 0; i < $dynamicInputListFromUI.length; i++) {

        var hashedID = $dynamicInputListFromUI[i].id;
        var item = this.dynamicInputs[hashedID];
        var $input = item[1];

        if (item[0] === 't') {

            self.requests.second.extra.details.push({
                k: item[2],
                lk: $input.attr('title'),
                v: $input.val()
            });
        }
        else if (item[0] === 's') {

            var $activeItem;
            var activeValue;

            if ($input.hasClass('default-select')) {

                $activeItem = $('.default-dropdown-item.active', $input);
                activeValue = $activeItem.data('type');
            }
            else {
                $activeItem = $('option:selected', $input);
                activeValue = $input.val();
            }

            self.requests.second.extra.details.push({
                k: item[2],
                lk: $input.attr('title'),
                v: activeValue,
                lv: $activeItem.text()
            });
        }
    }
};

affiliateRedemption.clearDynamicInputs = function() {

    'use strict';

    // Clear dynamic input deleted from dom
    for (var i in this.dynamicInputs) {

        if (this.dynamicInputs.hasOwnProperty(i)) {

            var $newElem = $("#" + i, this.$rdmUI);

            if ($newElem.length === 0) {
                delete this.dynamicInputs[i];
            }
        }
    }
};

affiliateRedemption.validateDynamicAccInputs = function() {

    'use strict';

    var fillupCheck = true;
    var formatCheck = true;

    // Account holder name and account type are not actual dynamic input but it is part of it, so validate here
    var $an = $('#affi-account-name', this.$rdmUI);
    var $at = $('#account-type', this.$rdmUI);

    var accountNameAndType = {0: ['t', $an]};

    if ($at.length) {
        accountNameAndType[1] = ['s', $at];
    }

    var dynamicInputs = Object.assign(accountNameAndType, this.dynamicInputs);

    var __validateInput = function(item) {

        var $input = item[1];

        if (item[0] === 't') {

            var megaInput = $input.data('MegaInputs');

            if ($input.val().trim() === '') {

                if (megaInput) {
                    megaInput.showError();
                }
                else {
                    $input.parent().addClass('error');
                }

                fillupCheck = false;
            }
            else if ($input.data('_vr') && $input.val().match(new RegExp($input.data('_vr'))) === null) {

                if (megaInput) {
                    megaInput.showError();
                }
                else {
                    $input.parent().addClass('error');
                }

                formatCheck = false;
            }
        }
        else if (item[0] === 's') {

            // If active item has value '', it is default value like "Please select". Warn user to enter value.
            if ($input.hasClass('default-select')) {

                var $activeItem = $('.active', $input);

                if (!$activeItem.length || $activeItem.data('type') === '') {

                    $input.parent().addClass('error');
                    fillupCheck = false;
                }
            }
            else if (!$input.val()) {

                $input.parent().addClass('error');
                fillupCheck = false;
            }
        }
    };

    // Lets validate dynamic inputs
    for (var i in dynamicInputs) {

        if (dynamicInputs.hasOwnProperty(i)) {
            __validateInput(dynamicInputs[i]);
        }
    }

    // Reason for not using MegaInputs show error for message is due to when there is verification,
    // MegaInputs's message block alreayd taken by the example.
    if (!fillupCheck) {
        msgDialog('warninga', '', l[23323]);
    }
    else if (!formatCheck) {
        msgDialog('warninga', '', l[23324]);
    }

    return fillupCheck && formatCheck;
};

affiliateRedemption.startTimer = function() {

    'use strict';

    // It already has timer we do not need to do something further
    if (this.timerInterval) {
        return;
    }

    var self = this;
    var $timer = $('.timing', this.$rdmUI);
    var $timerBlock = $('span', $timer);
    var time = 900; // 15 mins
    var timeArray = secondsToTime(time).split(':');
    var prevTime = Date.now() / 1000 | 0;

    $timer.removeClass('hidden');
    $timerBlock.text(l[23247].replace('[m]', timeArray[1]).replace('[s]', timeArray[2]));
    $timerBlock.parent().removeClass('orange');

    this.timerInterval = setInterval(function() {

        // To prevent Mobile safari out-focus interval stopping issue. use timer to find out how much is jumped.
        var now = Date.now() / 1000 | 0;
        var diff = now - prevTime;

        time -= diff;
        prevTime = now;
        timeArray = secondsToTime(time).split(':');

        if (time < 1) {

            $timerBlock.text(l[23248].replace('[s]', 0));

            self.stopTimer(false);

            msgDialog('warninga', '', l[23325], false, function() {
                self.close(true);
            });
        }
        else if (time < 60) {

            $timerBlock.text(l[23248].replace('[s]', timeArray[2]));
            $timerBlock.parent().addClass('orange');
        }
        else {
            $timerBlock.text(l[23247].replace('[m]', timeArray[1]).replace('[s]', timeArray[2]));
        }
    }, 1000);
};

affiliateRedemption.stopTimer = function(hide) {

    'use strict';

    if (hide === undefined || hide) {
        $('.timing', this.$rdmUI).addClass('hidden');
    }

    clearInterval(this.timerInterval);
    delete this.timerInterval;
};

affiliateRedemption.fillBasicHistoryInfo = function($wrapper, item) {

    'use strict';

    var itemStatus = this.getRedemptionStatus(item.s);

    var la = parseFloat(item.la);
    var lf = parseFloat(item.lf);
    var a = parseFloat(item.a);
    var f = parseFloat(item.f);

    $('.receipt', $wrapper).text(item.ridd);
    $('.date', $wrapper).text(time2date(item.ts, 1));
    $('.method', $wrapper).text(this.getMethodString(item.gw));
    $('.status', $wrapper).addClass(itemStatus.c).text(itemStatus.s);
    $('.country', $wrapper).text(M.getCountryName(item.cc));
    $('.currency', $wrapper).text(item.c);

    if (item.c === 'EUR') {
        $('.request-amount', $wrapper).text(formatCurrency(a));
        $('.fee-charged', $wrapper).text(formatCurrency(f));
        $('.recived-amount', $wrapper).text(formatCurrency(a - f));
    }
    else if (item.c === 'XBT') {
        $('.request-amount', $wrapper).safeHTML('<span class="euro">' + formatCurrency(a) + '</span>' +
            '<span class="local">BTC ' + parseFloat(la).toFixed(8) + '</span>');
        $('.fee-charged', $wrapper).safeHTML('<span class="euro">' + formatCurrency(f) + '</span>' +
            '<span class="local">BTC ' + parseFloat(lf).toFixed(8) + '</span>');
        $('.recived-amount', $wrapper).safeHTML('<span class="euro">' + formatCurrency(a - f) + '</span>' +
            '<span class="local">BTC ' + parseFloat(la - lf).toFixed(8) + '</span>');
    }
    else {
        $('.request-amount', $wrapper).safeHTML('<span class="euro">' + formatCurrency(a) +
            '</span><span class="local">' + formatCurrency(la, item.c, 'code') + '</span>');
        $('.fee-charged', $wrapper).safeHTML('<span class="euro">' + formatCurrency(f) +
            '</span><span class="local">' + formatCurrency(lf, item.c, 'code') + '</span>');
        $('.recived-amount', $wrapper).safeHTML('<span class="euro">' + formatCurrency(a - f) +
            '</span><span class="local">' + formatCurrency(la - lf, item.c, 'code') + '</span>');
    }

    $('.status-message', $wrapper).safeHTML(item.gw === 2 && itemStatus.bm || itemStatus.m);
};

affiliateRedemption.redemptionAccountDetails = function($wrapper, method, data) {

    'use strict';

    data = data || this.requests.second;

    $('.receipt', $wrapper).text(data.ridd);
    $('.method', $wrapper).text(this.getMethodString(method));

    // Dynamic account details
    var html = '<span class="strong full-size">' + l[23310] + '</span>';
    var itemTemplate = '<span class="grey">%1</span><span class="%3">%2</span>';

    var extra = data.extra || data;
    var safeArgs = [];

    // If this is Bitcoin redemption show only Bitcoin address here
    if (method === 2) {

        $('.currency', $wrapper).text('BTC');

        html += itemTemplate.replace('%1', l[23361]).replace('%2', extra.an)
            .replace('%3', 'bitcoin-address');
    }
    else {

        itemTemplate = itemTemplate.replace('%3', '');

        html += itemTemplate.replace('%1', l[23362]).replace('%2', extra.an);
        html += itemTemplate.replace('%1', l[23394]).replace('%2', extra.title);

        var details = extra.det || data.extra.details;

        for (var i = 0; i < details.length; i++) {
            html += itemTemplate.replace('%1', '@@').replace('%2', '@@');
            safeArgs.push(details[i].lk, (details[i].lv || details[i].v));
        }
    }

    safeArgs.unshift(html);

    var $details = $('.account-details', $wrapper);

    $details.safeHTML.apply($details, safeArgs);
};

affiliateRedemption.updateAccInfo = function() {

    'use strict';

    var self = this;

    this.recordSecondReqValues();

    // Flatten account info
    var accInfo = Object.assign(
        {ccc: this.requests.first.cc + this.requests.first.c},
        this.requests.second.extra
    );

    var details = this.requests.second.extra.details;

    for (var i = 0; i < details.length; i++) {
        accInfo[details[i].k] = details[i].v;
    }

    delete accInfo.details;
    delete accInfo.title;

    this.$rdmUI.addClass('arrange-to-back');

    M.affiliate.setRedeemAccountInfo(this.requests.first.m, accInfo).then(function() {

        self.$rdmUI.removeClass('arrange-to-back');
        showToast('settings', l[23363]);
    });
};
