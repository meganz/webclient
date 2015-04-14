var pro_package,
	pro_balance = 0,
	pro_paymentmethod,
	pro_m,
	account_type_num,
	pro_usebalance = false,
    membershipPlans = [],
    selectedProPackage = [];

// Payment gateways, hardcoded for now, will call API in future to get list
var gatewayOptions = [{   
    apiGatewayId: 4,
    displayName: 'Bitcoin',
    supportsRecurring: false,
    cssClass: 'bitcoin',
    providerName: 'Bitcoin'
},
{
    apiGatewayId: null,
    displayName: 'Prepaid balance',
    supportsRecurring: false,
    cssClass: 'prepaid-balance',
    providerName: 'Prepaid balance'
}];

function init_pro()
{
	if (localStorage.keycomplete) {
		$('body').addClass('key');
	    sessionStorage.proref = 'accountcompletion';
		localStorage.removeItem('keycomplete');
	}
    else {
        $('body').addClass('pro');
    }
    
	if (u_type == 3)
	{
        // Flag 'pro : 1' includes pro balance in the response
		api_req({ a : 'uq', pro : 1 }, { 
			callback : function (res) 
			{
				if (typeof res == 'object' && res.balance && res.balance[0]) {
                    pro_balance = res.balance[0][0];
                }
			}
		});	
	}
	if (document.location.hash.indexOf('#pro/') > -1)
	{
		localStorage.affid = document.location.hash.replace('#pro/','');
		localStorage.affts = new Date().getTime();	
	}
	
	if (document.location.hash.indexOf('#pro#') > -1) sessionStorage.proref = document.location.hash.replace('#pro#','');
	
	if (lang !== 'en') $('.reg-st3-save-txt').addClass(lang);
    if (lang == 'fr') $('.reg-st3-big-txt').each(function(e,o){$(o).html($(o).html().replace('GB','Go').replace('TB','To'));});
		
	if (!m)
	{
        // Get the membership plans. This call will return an array of arrays. Each array contains this data:
        // [api_id, account_level, storage, transfer, months, price, currency, description, ios_id, google_id]
        // More data can be retrieved with 'f : 1'
	    api_req({ a : 'utqa' }, {
            callback: function (result)
            {
                // Store globally
                membershipPlans = result;
                
                // Render the plan details
                populateMembershipPlans();
            }
        });
		
		if (lang !== 'en') $('.reg-st3-save-txt').addClass(lang);
	    if (lang == 'fr') $('.reg-st3-big-txt').each(function(e,o){$(o).html($(o).html().replace('GB','Go').replace('TB','To'));});
	     
	    $('.membership-step1 .reg-st3-membership-bl').unbind('click');
		$('.membership-step1 .reg-st3-membership-bl').bind('click',function(e)
		{		
			$('.reg-st3-membership-bl').removeClass('selected');
			$(this).addClass('selected');	
		});
		
		$('.membership-step1 .reg-st3-membership-bl').unbind('dblclick');
		$('.membership-step1 .reg-st3-membership-bl').bind('dblclick',function(e)
		{		
			$('.reg-st3-membership-bl').removeClass('selected');
			$(this).addClass('selected');
			
			account_type_num = $(this).attr('data-payment');
			$(this).clone().appendTo( '.membership-selected-block');
			$('.membership-step2 .pro span').html($(this).find('.reg-st3-bott-title.title').html())	;
			pro_next_step();
		});
		
		$('.membership-free-button').unbind('click');
		$('.membership-free-button').bind('click',function(e) {
			if (page == 'fm') document.location.hash = '#start';
		    else document.location.hash = '#fm';
		    return false;
		});
		
		$('.membership-button').unbind('click');
		$('.membership-button').bind('click',function(e)
		{
			var $membershipBlock = $(this).closest('.reg-st3-membership-bl');
				
			$('.reg-st3-membership-bl').removeClass('selected');
			$membershipBlock.addClass('selected');
			
			account_type_num = $membershipBlock.attr('data-payment');
			$membershipBlock.clone().appendTo( '.membership-selected-block');
			$('.membership-step2 .pro span').html($membershipBlock.find('.reg-st3-bott-title.title').html())	;
			pro_next_step();			
		});		
		
		$('.pro-bottom-button').unbind('click');
		$('.pro-bottom-button').bind('click',function(e)
		{
			document.location.hash = 'contact';
		});
	}
}

/**
 * Populate the monthly plans across the main #pro page
 */
function populateMembershipPlans() {
    
    for (var i = 0, length = membershipPlans.length; i < length; i++) {

        var accountLevel = membershipPlans[i][1];
        var months = membershipPlans[i][4];
        var price = membershipPlans[i][5].split('.');
        var dollars = price[0];
        var cents = price[1];

        if (months === 1) {
            $('.reg-st3-membership-bl.pro' + accountLevel + ' .price .num').html(
                dollars + '<span class="small">.' + cents + ' &euro;</span>'
            );
        }
    }
}

/**
 * Loads the payment gateway options into Payment options section
 */
function loadPaymentGatewayOptions() {
    
    var html = '';
    
    // Loop through gateway providers (change to use list from API soon)
    for (var i = 0, length = gatewayOptions.length; i < length; i++) {
        
        var gatewayOption = gatewayOptions[i];
        var optionChecked = '', classChecked = '';
        
        // Pre-select the first option in the list
        if (i === 0) {
            optionChecked = 'checked="checked" ';
            classChecked = ' checked';
        }
        
        // If their prepay balance is less than 0 don't show that option
        if ((gatewayOption.cssClass === 'prepaid-balance') && (parseFloat(pro_balance) <= 0)) {
            continue;
        }
        
        // Create a radio button with icon for each payment gateway
        html += '<div class="payment-method">'
             +      '<div class="membership-radio' + classChecked + '">'
             +          '<input type="radio" name="' + gatewayOption.cssClass + '" id="' + gatewayOption.cssClass + '" ' + optionChecked + 'disabled="disabled" />'
             +          '<div></div>'
             +      '</div>'
             +      '<div class="membership-radio-label ' + gatewayOption.cssClass + '">'
             +          gatewayOption.displayName
             +      '</div>'
             +  '</div>';
    }
    
    // Change radio button states when clicked
    initPaymentMethodRadioOptions(html);
}

/**
 * Change payment method radio button states when clicked
 * @param {String} html The radio button html
 */
function initPaymentMethodRadioOptions(html) {
    
    var paymentOptionsList = $('.payment-options-list');
    paymentOptionsList.html(html);
    paymentOptionsList.find('.payment-method').click(function() {
        
        // Remove checked state from all radio inputs
        paymentOptionsList.find('.membership-radio').removeClass('checked');
        paymentOptionsList.find('input').removeAttr('checked');
        
        var $this = $(this);
        var $bitcoinInstructions = $('.membership-center p');
        
        // Add checked state for this radio button
        $this.find('input').attr('checked', 'checked');
        $this.find('.membership-radio').addClass('checked');
        
        // Hide instructions below the purchase button if other option is selected
        if ($this.find('.membership-radio-label').hasClass('bitcoin')) {
            $bitcoinInstructions.removeClass('hidden');
        }
        else {
            $bitcoinInstructions.addClass('hidden');
        }
    });
}

// Step2
function pro_next_step() {
	
	if (!u_handle) {
        megaAnalytics.log("pro", "loginreq");
        showSignupPromptDialog();
        return;
    }
    else if(isEphemeral()) {
        showRegisterDialog();
        return;
    }
	
	megaAnalytics.log('pro', 'proc');
	
	var currentDate = new Date(),
        monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	    mon = monthName[currentDate.getMonth()],
		day = currentDate.getDate(),
		price = [];
    
    renderPlanDurationDropDown();
    
	$('.membership-step1').addClass('hidden');
	$('.membership-step2').removeClass('hidden');
	mainScroll();
	
	$('.membership-date .month').text(mon);
	$('.membership-date .day').text(day);
	
	$('.membership-dropdown-item').each(function() {
        $(this).find('strong').html(price[$(this).attr('data-months')]);
    });
	
	$('.membership-st2-select span').unbind('click');
	$('.membership-st2-select span').bind('click', function ()
    {
        if ($('.membership-st2-select').attr('class').indexOf('active') == -1) {
            $('.membership-st2-select').addClass('active');
        }
        else {
            $('.membership-st2-select').removeClass('active');
        }
    });
	
	$('.membership-dropdown-item').unbind('click');
    $('.membership-dropdown-item').bind('click', function ()
    {
        var price = $(this).find('strong').html();
        $('.membership-dropdown-item').removeClass('selected');
        $(this).addClass('selected');
        $('.membership-st2-select').removeClass('active');
        $('.membership-st2-select span').html($(this).html());
        
        if (price) {
            $('.membership-center.inactive').removeClass('inactive');
            $('.membership-bott-price strong').html(price.split('.')[0] + '<span>.' + price.split('.')[1] + ' &euro;</span>');
        }
    });
	
	$('.membership-bott-button').unbind('click');
	$('.membership-bott-button').bind('click',function(e)
	{
        if ($('.membership-center').attr('class').indexOf('inactive') == -1) {
			pro_continue(e);
            return false;
		}
	});
	
    loadPaymentGatewayOptions();
}

/**
 * Renders the pro plan prices into the Plan Duration dropdown
 */
function renderPlanDurationDropDown() {
    
    // Sort plan durations by lowest number of months first
    membershipPlans.sort(function (planA, planB) {
        
        var numOfMonthsPlanA = planA[4];
        var numOfMonthsPlanB = planB[4];
        
        if (numOfMonthsPlanA < numOfMonthsPlanB) {
            return -1;
        }
        if (numOfMonthsPlanA > numOfMonthsPlanB) {
            return 1;
        }
        
        return 0;
    });
    
    var html = '';
    
    // Loop through the available plan durations for the current membership plan
	for (var i = 0, length = membershipPlans.length; i < length; i++) {
        
        var currentPlan = membershipPlans[i];
        
        // If match on the membership plan, display that pricing option in the dropdown
        if (currentPlan[1] == account_type_num) {

            // Get the price and number of months duration
            var price = currentPlan[5];
            var numOfMonths = currentPlan[4];
            var monthsWording = '1 month';            

            // Change wording depending on number of months
            if (numOfMonths === 12) {
                monthsWording = '1 year';
            }
            else if (numOfMonths > 1) {
                monthsWording = numOfMonths + ' months';
            }

            // Build select option
            html += '<div class="membership-dropdown-item" data-plan-index="' + i + '">'
                 +       monthsWording + ' (<strong>' + price + '</strong> &euro;)'
                 +  '</div>';
        }
    }
    
    // Update drop down HTML
    $('.membership-st2-dropdown').html(html);    
}

function pro_continue(e)
{
    var selectedProPackageIndex = $('.membership-dropdown-item.selected').attr('data-plan-index');
    
    // Set the pro package (used in pro_pay function)
    selectedProPackage = membershipPlans[selectedProPackageIndex];
    
    // Get the months and price
    var selectedPlanMonths = selectedProPackage[4];
    var selectedPlanPrice = selectedProPackage[5];
    
	if (selectedPlanMonths < 12) {
        pro_package = 'pro' + account_type_num + '_month';
    }
	else {
        pro_package = 'pro' + account_type_num + '_year';
    }
	
	pro_paymentmethod = '';
    
    // Check if prepaid balance method is selected
    var prepaidmethodSelected = $('#prepaid-balance').attr('checked');
        prepaidmethodSelected = (prepaidmethodSelected === 'checked') ? true : false;
    
	if (u_type === false)
	{
		u_storage = init_storage(localStorage);
		loadingDialog.show();
        
		u_checklogin({ checkloginresult: function(u_ctx,r) 
		{ 
			pro_pay();
            
		}}, true);
	}    
    else if (prepaidmethodSelected && (parseFloat(pro_balance) < parseFloat(selectedPlanPrice))) {
        msgDialog('warninga', 'Insufficient balance', 'You have insufficient funds to make this purchase. Please top up with a voucher or choose another payment method.', false, false);
    }
	else if (prepaidmethodSelected && (parseFloat(pro_balance) >= parseFloat(selectedPlanPrice))) {
		
        // Ask for confirmation to use the prepaid funds
        msgDialog('confirmation', l[504], l[5844], false, function(event) {
			if (event) {
                pro_paymentmethod = 'pro_prepaid';
                pro_pay();
            }	
		});
	}
	else {
        pro_pay();
    }
}

function pro_pay()
{
	var aff = 0;	
	if (localStorage.affid && localStorage.affts > new Date().getTime()-86400000) aff = localStorage.affid;

    // Only show loading dialog if needing to redirect or setup bitcoin invoice
    if (!ul_uploading && !downloading && (pro_paymentmethod !== 'pro_prepaid')) {
        showLoadingDialog();
    }

    // Data for API request
    var apiId = selectedProPackage[0];
    var price = selectedProPackage[5];
    var currency = selectedProPackage[6];
    
    api_req({ a : 'uts', it: 0, si: apiId, p: price, c: currency, aff: aff, 'm': m },
	{
		callback : function (res)
		{ 
			if (typeof res == 'number' && res < 0)
			{
				loadingDialog.hide();
				alert(l[200]);
			}
			else
			{
				if (pro_paymentmethod == 'pro_voucher' || pro_paymentmethod == 'pro_prepaid') {
                    pro_m = 0;
                }
				else {
                    // Bitcoin provider
                    pro_m = 4;
                }
				
				var proref = '';
				if (sessionStorage.proref) {
                    proref = sessionStorage.proref;
                }

				api_req({ a : 'utc', s : [res], m : pro_m, r: proref },
				{ 
					callback : function (res)
					{
						if (pro_paymentmethod == 'pro_prepaid')
						{							
							loadingDialog.hide();
							if (typeof res == 'number' && res < 0)
							{
								if (res == EOVERQUOTA) {
                                    alert(l[514]);
                                }
								else {
                                    alert(l[200]);
                                }
							}
							else
							{
                                // Redirect to account page to show purchase
								if (M.account) {
                                    M.account.lastupdate = 0;
                                }
								document.location.hash = 'account';								
							}
						}
                        else {
                            // If Bitcoin provider then show the Bitcoin invoice dialog
                            if ((pro_m >= 4) && res && res.EUR) {
                                showBitcoinInvoice(res.EUR);
                            }
							else {
                                showBitcoinProviderFailureDialog();
							}
						}
					}
				});
			}
		}
	});	
}

// Web socket for chain.com connection to monitor bitcoin payment
var chainWebSocketConn = null;

/**
 * Step 3 in plan purchase with Bitcoin
 * @param {Object} apiResponse API result
 */
function showBitcoinInvoice(apiResponse) {

    /* Testing data to watch the invoice expire in 5 secs
    apiResponse = {
        "invoice_id": 'sIk',
        "address": '12ouE2tWLuR3q5ZyQzQL6DR25iBLVjhwXd',
        "amount": 1.35715354,
        "created": Math.round(Date.now() / 1000),
        "expiry": Math.round(Date.now() / 1000) + 5
    };//*/
    
    // Set details
    var bitcoinAddress = apiResponse.address;
    var bitcoinUrl = 'bitcoin:' + apiResponse.address + '?amount=' + apiResponse.amount;
    var invoiceDateTime = new Date(apiResponse.created);    
    var proPlanNum = selectedProPackage[1];
    var planName = getProPlan(proPlanNum);
    var planMonths = selectedProPackage[4] + ' month purchase';
    var priceEuros = selectedProPackage[5] + '<span>&euro;</span>';
    var priceBitcoins = apiResponse.amount;
    var expiryTime = new Date(apiResponse.expiry);

    // Cache original HTML of dialog to reset after close
    var dialogOverlay = $('.fm-dialog-overlay');        
    var dialog = $('.fm-dialog.pro-register-paypal-dialog');
    var dialogOriginalHtml = dialog.html();
    
    // Add styles for the dialog
    dialogOverlay.addClass('bitcoin-invoice-dialog');
    dialog.addClass('bitcoin-invoice-dialog');
    
    // Clone template and show Bitcoin invoice
    var bitcoinInvoiceHtml = $('.bitcoin-invoice').html();
	dialog.html(bitcoinInvoiceHtml);
    
    // Render QR code            
    generateBitcoinQrCode(dialog, bitcoinAddress, priceBitcoins);
    
    // Update details inside dialog
    dialog.find('.btn-open-wallet').attr('href', bitcoinUrl);    
    dialog.find('.bitcoin-address').html(bitcoinAddress);
    dialog.find('.invoice-date-time').html(invoiceDateTime);
    dialog.find('.plan-icon').addClass('pro' + proPlanNum);
    dialog.find('.plan-name').html(planName);
    dialog.find('.plan-duration').html(planMonths);
    dialog.find('.plan-price-euros').html(priceEuros);
    dialog.find('.plan-price-bitcoins').html(priceBitcoins);
    
    // Set countdown to price expiry
    var countdownIntervalId = setCoundownTimer(dialog, expiryTime);
    
    // Close dialog and reset to original dialog
    dialog.find('.btn-close-dialog').click(function() {
        dialogOverlay.removeClass('bitcoin-invoice-dialog').addClass('hidden');
        dialog.removeClass('bitcoin-invoice-dialog').addClass('hidden').html(dialogOriginalHtml);
        
        // Close Web Socket if open
        if (chainWebSocketConn !== null) {
            chainWebSocketConn.close();
        }
        
        // End countdown timer
        clearInterval(countdownIntervalId);
    });
    
    // Update the dialog if a transaction is seen in the blockchain
    checkTransactionInBlockchain(dialog, bitcoinAddress, planName, countdownIntervalId);
}

/**
 * Sets a countdown timer on the bitcoin invoice dialog to count down from 15~ minutes 
 * until the bitcoin price expires and they need to restart the process
 * @param {Object} dialog The bitcoin invoice dialog
 * @param {Date} expiryTime The date/time the invoice will expire
 * @returns {Number} Returns the interval id
 */
function setCoundownTimer(dialog, expiryTime)
{
    // Count down the time to price expiration
    var countdownIntervalId = setInterval(function() {
        
        // Show number of minutes and seconds counting down
        var currentTimestamp = Math.round(Date.now() / 1000);
        var difference = expiryTime - currentTimestamp;
        var minutes = Math.floor(difference / 60);
        var minutesPadded = (minutes < 10) ? '0' + minutes : minutes;
        var seconds = difference - (minutes * 60);
        var secondsPadded = (seconds < 10) ? '0' + seconds : seconds;
        
        // If there is still time remaining
        if (difference > 0) {
            
            // Show full opacity when 1 minute countdown mark hit
            if (difference <= 60) {
                dialog.find('.clock-icon').css('opacity', 1);
                dialog.find('.expiry-instruction').css('opacity', 1);
                dialog.find('.time-to-expire').css('opacity', 1);
            }
            
            // Show time remaining
            dialog.find('.time-to-expire').html(minutesPadded + ':' + secondsPadded);
        }
        else {
            // Grey out and hide details as the price has expired            
            dialog.find('.scan-code-instruction').css('opacity', '0.25');
            dialog.find('.btn-open-wallet').css('visibility', 'hidden');
            dialog.find('.bitcoin-address').css('visibility', 'hidden');
            dialog.find('.bitcoin-qr-code').css('opacity', '0.15');
            dialog.find('.qr-code-mega-icon').hide();
            dialog.find('.plan-icon').css('opacity', '0.25');
            dialog.find('.plan-name').css('opacity', '0.25');
            dialog.find('.plan-duration').css('opacity', '0.25');
            dialog.find('.plan-price-euros').css('opacity', '0.25');
            dialog.find('.plan-price-bitcoins').css('opacity', '0.25');
            dialog.find('.plan-price-bitcoins-btc').css('opacity', '0.25');
            dialog.find('.expiry-instruction').html('This purchase has expired.').css('opacity', '1');
            dialog.find('.time-to-expire').html('00:00').css('opacity', '1');
            dialog.find('.price-expired-instruction').show();
            
            // End countdown timer
            clearInterval(countdownIntervalId);
        }        
    }, 1000);
    
    return countdownIntervalId;
}

/**
 * Open WebSocket to chain.com API to monitor block chain for transactions on that receive address.
 * This will receive a faster confirmation than the action packet which waits for an IPN from the provider.
 * @param {Object} dialog The jQuery object for the dialog
 * @param {String} bitcoinAddress The bitcoin address
 * @param {String} planName The Pro plan name
 * @param {Number} countdownIntervalId The countdown timer id so it can be terminated
 */
function checkTransactionInBlockchain(dialog, bitcoinAddress, planName, countdownIntervalId) {
    
    // Open socket
    chainWebSocketConn = new WebSocket('wss://ws.chain.com/v2/notifications');    
    
    // Listen for events on this bitcoin address
    chainWebSocketConn.onopen = function (event) {
        var req = { type: 'address', address: bitcoinAddress, block_chain: 'bitcoin' };
        chainWebSocketConn.send(JSON.stringify(req));
    };
    
    // After receiving a response from the chain.com server
    chainWebSocketConn.onmessage = function (event) {
        
        // Get data from WebSocket response
        var notification = JSON.parse(event.data);
        var type = notification.payload.type;
        var address = notification.payload.address;
        
        // Check only 'address' packets as the system also sends heartbeat packets
        if ((type === 'address') && (address === bitcoinAddress)) {
        
            // Update price left to pay
            var currentPriceBitcoins = parseFloat(dialog.find('.plan-price-bitcoins').html());
            var currentPriceSatoshis = toSatoshi(currentPriceBitcoins);
            var satoshisReceived = notification.payload.received;
            var priceRemainingSatoshis = currentPriceSatoshis - satoshisReceived;
            var priceRemainingBitcoins = toBitcoin(priceRemainingSatoshis);

            // If correct amount was received
            if (satoshisReceived === currentPriceSatoshis) {

                // Show success
                dialog.find('.left-side').css('visibility', 'hidden');
                dialog.find('.payment-confirmation').show();
                dialog.find('.payment-confirmation .icon').addClass('success');
                dialog.find('.payment-confirmation .description').html(planName + ' plan has been paid!');
                dialog.find('.payment-confirmation .instruction').html('Please await account upgrade by MEGA...');
                dialog.find('.expiry-instruction').html('Paid!');

                // End countdown timer and close connection
                clearInterval(countdownIntervalId);
                chainWebSocketConn.close();
            }

            // If partial payment was made
            else if (satoshisReceived < currentPriceSatoshis) {

                // Update price to pay
                dialog.find('.plan-price-bitcoins').html(priceRemainingBitcoins);
                dialog.find('.btn-open-wallet').attr('href', 'bitcoin:' + bitcoinAddress + '?amount=' + priceRemainingBitcoins);
                
                // Re-render QR code with updated price          
                generateBitcoinQrCode(dialog, bitcoinAddress, priceRemainingBitcoins);
            }
        }
    };    
}

/**
 * Renders the bitcoin QR code with highest error correction so that MEGA logo can be overlayed
 * http://www.qrstuff.com/blog/2011/12/14/qr-code-error-correction
 * @param {Object} dialog jQuery object of the dialog
 * @param {String} bitcoinAddress The bitcoin address
 * @param {String|Number} priceInBitcoins The price in bitcoins
 */
function generateBitcoinQrCode(dialog, bitcoinAddress, priceInBitcoins) {

    var options = {
        width: 256,
        height: 256,
        correctLevel: QRErrorCorrectLevel.H,
        background: "#ffffff",
        foreground: "#000",
        text: 'bitcoin:' + bitcoinAddress + '?amount=' + priceInBitcoins
    };
    
    // Render the QR code
    dialog.find('.bitcoin-qr-code').html('').qrcode(options);
}

/**
 * Show a failure dialog if the provider can't be contacted
 */
function showBitcoinProviderFailureDialog() {
    
    // Add styles for the dialog
    var dialogOverlay = $('.fm-dialog-overlay');
    var dialog = $('.fm-dialog.pro-register-paypal-dialog');
    var dialogOriginalHtml = dialog.html();
    
    // Add styles for the dialog
    dialogOverlay.addClass('bitcoin-provider-failure-dialog');
    dialog.addClass('bitcoin-provider-failure-dialog');
    
    // Clone template and show failure
    var bitcoinProviderFailureHtml = $('.bitcoin-provider-failure').html();
	dialog.html(bitcoinProviderFailureHtml);
    
    // Close dialog and reset to original dialog
    dialog.find('.btn-close-dialog').click(function() {
        dialogOverlay.removeClass('bitcoin-provider-failure-dialog').addClass('hidden');
        dialog.removeClass('bitcoin-provider-failure-dialog').addClass('hidden').html(dialogOriginalHtml);
    });
}

function showLoginDialog() {
    megaAnalytics.log("pro", "loginDialog");
    $.dialog = 'pro-login-dialog';

    var $dialog = $('.pro-login-dialog');
    $dialog
        .removeClass('hidden')
        .addClass('active');

    $('.fm-dialog-overlay').removeClass("hidden");

    $dialog.css({
        'margin-left': -1 * ($dialog.outerWidth()/2),
        'margin-top': -1 * ($dialog.outerHeight()/2)
    });

    $('.top-login-input-block').removeClass('incorrect');


    // controls
    $('.fm-dialog-close', $dialog)
        .unbind('click.proDialog')
        .bind('click.proDialog', function() {
            closeDialog();
        });

    $('.input-email', $dialog)
        .data('placeholder', l[195])
        .val(l[195]);

    $('.input-password', $dialog)
        .data('placeholder', l[909])
        .val(l[909]);

    uiPlaceholders($dialog);
    uiCheckboxes($dialog);


    $('#login-password, #login-name', $dialog).unbind('keydown');
    $('#login-password, #login-name', $dialog).bind('keydown',function(e)
    {
        $('.top-login-pad', $dialog).removeClass('both-incorrect-inputs');
        $('.top-login-input-tooltip.both-incorrect', $dialog).removeClass('active');
        $('.top-login-input-block.password', $dialog).removeClass('incorrect');
        $('.top-login-input-block.e-mail', $dialog).removeClass('incorrect');
        if (e.keyCode == 13) doProLogin($dialog);
    });


    $('.top-login-forgot-pass', $dialog).unbind('click');
    $('.top-login-forgot-pass', $dialog).bind('click',function(e)
    {
        document.location.hash = 'recovery';
    });

    $('.top-dialog-login-button', $dialog).unbind('click');
    $('.top-dialog-login-button', $dialog).bind('click',function(e) {
        doProLogin($dialog);
    });
};

var doProLogin = function($dialog) {
    megaAnalytics.log("pro", "doLogin");

    loadingDialog.show();
    var ctx =
    {
        checkloginresult: function(ctx,r)
        {
            loadingDialog.hide();

            if (r == EBLOCKED)
            {
                alert(l[730]);
            }
            else if (r)
            {
                $('#login-password', $dialog).val('');
                $('#login-email', $dialog).val('');
                u_type = r;
                init_page();
                if(pro_package) {
                    var cls = pro_package
                        .replace("_month", "")
                        .replace("_year", "");

                    $('.reg-st3-membership-bl').removeClass('selected')
                    $('.reg-st3-membership-bl.' + cls).addClass('selected');
                }
                pro_continue();
            }
            else
            {
                $('#login-password', $dialog).val('');
                alert(l[201]);
            }
        }
    };


    var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#login-password', $dialog).val()));
    var uh = stringhash($('#login-name', $dialog).val().toLowerCase(),passwordaes);
    u_login(
        ctx,
        $('#login-name', $dialog).val(),
        $('#login-password', $dialog).val(),
        uh,
        $('#login-checkbox').is('.checkboxOn')
    );
};

function showRegisterDialog() {
    megaAnalytics.log("pro", "regDialog");
    $.dialog = 'pro-register-dialog';

    var $dialog = $('.pro-register-dialog');
    $dialog
        .removeClass('hidden')
        .addClass('active');

    $('.fm-dialog-overlay').removeClass("hidden");

    var reposition = function() {
        $dialog.css({
            'margin-left': -1 * ($dialog.outerWidth() / 2),
            'margin-top': -1 * ($dialog.outerHeight() / 2)
        });
    };

    reposition();

    $('*', $dialog).removeClass('incorrect'); // <- how bad idea is that "*" there?


    // controls
    $('.fm-dialog-close', $dialog)
        .unbind('click.proDialog')
        .bind('click.proDialog', function() {
            closeDialog();
        });

    $('#register-email', $dialog)
        .data('placeholder', l[95])
        .val(l[95]);

    $('#register-firstname', $dialog)
        .data('placeholder', l[1096])
        .val(l[1096]);

    $('#register-lastname', $dialog)
        .data('placeholder', l[1097])
        .val(l[1097]);

    $('#register-password', $dialog)
        .addClass('input-password')
        .data('placeholder', l[909])
        .val(l[909]);

    $('#register-password2', $dialog)
        .addClass('input-password')
        .data('placeholder', l[1114])
        .val(l[1114]);

    uiPlaceholders($dialog);
    uiCheckboxes($dialog);

    var registerpwcheck = function()
    {
        $('.login-register-input.password', $dialog).removeClass('weak-password strong-password');
        $('.new-registration', $dialog).removeClass('good1 good2 good3 good4 good5');
        if (typeof zxcvbn == 'undefined' || $('#register-password', $dialog).attr('type') == 'text' || $('#register-password', $dialog).val() == '') return false;
        var pw = zxcvbn($('#register-password', $dialog).val());
        if (pw.score > 3 && pw.entropy > 75)
        {
            $('.login-register-input.password', $dialog).addClass('strong-password');
            $('.new-registration', $dialog).addClass('good5');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1128]);
            $('.new-reg-status-description', $dialog).text(l[1123]);
        }
        else if (pw.score > 2 && pw.entropy > 50)
        {
            $('.login-register-input.password', $dialog).addClass('strong-password');
            $('.new-registration', $dialog).addClass('good4');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1127]);
            $('.new-reg-status-description', $dialog).text(l[1122]);
        }
        else if (pw.score > 1 && pw.entropy > 40)
        {
            $('.login-register-input.password', $dialog).addClass('strong-password');
            $('.new-registration', $dialog).addClass('good3');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1126]);
            $('.new-reg-status-description', $dialog).text(l[1121]);
        }
        else if (pw.score > 0 && pw.entropy > 15)
        {
            $('.new-registration', $dialog).addClass('good2');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong>' + l[1125]);
            $('.new-reg-status-description', $dialog).text(l[1120]);
        }
        else
        {
            $('.login-register-input.password', $dialog).addClass('weak-password');
            $('.new-registration', $dialog).addClass('good1');
            $('.new-reg-status-pad', $dialog).html('<strong>' + l[1105] + '</strong> ' + l[1124]);
            $('.new-reg-status-description', $dialog).text(l[1119]);
        }
        $('.password-status-warning', $dialog).html('<span class="password-warning-txt">' + l[34] + '</span> ' + l[1129] + '<div class="password-tooltip-arrow"></div>');
        $('.password-status-warning', $dialog).css('margin-left',($('.password-status-warning', $dialog).width()/2*-1)-13);
        reposition();
    };

    if (typeof zxcvbn == 'undefined' && !silent_loading)
    {
        $('.login-register-input.password', $dialog).addClass('loading');
        silent_loading=function()
        {
            $('.login-register-input.password', $dialog).removeClass('loading');
            registerpwcheck();
        };
        jsl.push(jsl2['zxcvbn_js']);
        jsl_start();
    }
    $('#register-password', $dialog).unbind('keyup.proRegister');
    $('#register-password', $dialog).bind('keyup.proRegister',function(e)
    {
        registerpwcheck();
    });
    $('.password-status-icon', $dialog).unbind('mouseover.proRegister');
    $('.password-status-icon', $dialog).bind('mouseover.proRegister',function(e)
    {
        if ($(this).parents('.strong-password').length == 0)
        {
            $('.password-status-warning', $dialog).removeClass('hidden');
        }

    });
    $('.password-status-icon', $dialog).unbind('mouseout.proRegister');
    $('.password-status-icon', $dialog).bind('mouseout.proRegister',function(e)
    {
        if ($(this).parents('.strong-password').length == 0)
        {
            $('.password-status-warning', $dialog).addClass('hidden');
        }
    });

    $('input', $dialog).unbind('keydown.proRegister');
    $('input', $dialog).bind('keydown.proRegister',function(e)  {
        if (e.keyCode == 13) {
            doProRegister($dialog);
        }
    });


    $('.register-st2-button', $dialog).unbind('click');
    $('.register-st2-button', $dialog).bind('click',function(e) {
        doProRegister($dialog);
        return false;
    });

    $('.new-registration-checkbox a', $dialog)
        .unbind('click.proRegisterDialog')
        .bind('click.proRegisterDialog',function(e) {
            $.termsAgree = function()
            {
                $('.register-check').removeClass('checkboxOff');
                $('.register-check').addClass('checkboxOn');
            };
            termsDialog();
            return false;
        });
};

var doProRegister = function($dialog) {
    megaAnalytics.log("pro", "doRegister");
    loadingDialog.show();

    if (u_type > 0)
    {
        msgDialog('warninga',l[135],l[5843]);
        loadingDialog.show();
        return false;
    }


    var registeraccount = function()
    {
        var ctx =
        {
            callback : function(res)
            {
                loadingDialog.hide();
                if (res == 0)
                {
                    var ops = {a:'up'};

                    ops.terms = 'Mq';
                    ops.firstname = base64urlencode(to8($('#register-firstname', $dialog).val()));
                    ops.lastname = base64urlencode(to8($('#register-lastname', $dialog).val()));
                    ops.name2 = base64urlencode(to8($('#register-firstname', $dialog) + ' ' + $('#register-lastname', $dialog).val()));
                    u_attr.terms=1;

                    api_req(ops);

                    proceedToPaypal();
                }
                else
                {
                    if (res == EACCESS) alert(l[218]);
                    else if (res == EEXIST)
                    {
                        if (m) alert(l[219]);
                        else
                        {
                            $('.login-register-input.email .top-loginp-tooltip-txt', $dialog).html(l[1297] + '<div class="white-txt">' + l[1298] + '</div>');
                            $('.login-register-input.email', $dialog).addClass('incorrect');
                            msgDialog('warninga','Error',l[219]);

                            loadingDialog.hide();
                        }
                    }
                }
            }
        };

        var rv={};

        rv.name = $('#register-firstname', $dialog).val() + ' ' + $('#register-lastname', $dialog).val();
        rv.email = $('#register-email', $dialog).val();
        rv.password = $('#register-password', $dialog).val();

        var sendsignuplink = function(name,email,password,ctx)
        {
            var pw_aes = new sjcl.cipher.aes(prepare_key_pw(password));
            var req = { a : 'uc', c : base64urlencode(a32_to_str(encrypt_key(pw_aes,u_k))+a32_to_str(encrypt_key(pw_aes,[rand(0x100000000),0,0,rand(0x100000000)]))), n : base64urlencode(to8(name)), m : base64urlencode(email) };

            api_req(req,ctx);
        };

        sendsignuplink(rv.name,rv.email,rv.password,ctx);
    };



    var err=false;

    if ($('#register-firstname', $dialog).val() == '' || $('#register-firstname', $dialog).val() == l[1096] || $('#register-lastname', $dialog).val() == '' || $('#register-lastname', $dialog).val() == l[1097])
    {
        $('.login-register-input.name', $dialog).addClass('incorrect');
        err=1;
    }
    if ($('#register-email', $dialog).val() == '' || $('#register-email', $dialog).val() == l[1096] || checkMail($('#register-email', $dialog).val()))
    {
        $('.login-register-input.email', $dialog).addClass('incorrect');
        err=1;
    }

    if ($('#register-email', $dialog).val() == '' || $('#register-email', $dialog).val() == l[1096] || checkMail($('#register-email', $dialog).val()))
    {
        $('.login-register-input.email', $dialog).addClass('incorrect');
        err=1;
    }

    var pw = zxcvbn($('#register-password', $dialog).val());
    if ($('#register-password', $dialog).attr('type') == 'text')
    {
        $('.login-register-input.password.first', $dialog).addClass('incorrect');
        $('.white-txt.password', $dialog).text(l[213]);
        err=1;
    }
    else if (pw.score == 0 || pw.entropy < 16)
    {
        $('.login-register-input.password.first', $dialog).addClass('incorrect');
        $('.white-txt.password', $dialog).text(l[1104]);
        err=1;
    }

    if ($('#register-password', $dialog).val() !== $('#register-password2', $dialog).val())
    {
        $('#register-password', $dialog)[0].type = 'password';
        $('#register-password2', $dialog)[0].type = 'password';
        $('#register-password', $dialog).val('');
        $('#register-password2', $dialog).val('');
        $('.login-register-input.password.confirm', $dialog).addClass('incorrect');
        err=1;
    }

    if (!err && typeof zxcvbn == 'undefined')
    {
        msgDialog('warninga',l[135],l[1115] + '<br>' + l[1116]);
        loadingDialog.hide();
        return false;
    }
    else if (!err)
    {
        if ($('.register-check', $dialog).attr('class').indexOf('checkboxOff') > -1)
        {
            msgDialog('warninga',l[1117],l[1118]);
            loadingDialog.hide();
        }
        else
        {
            if (localStorage.signupcode)
            {
                loadingDialog.show();
                u_storage = init_storage(localStorage);
                var ctx =
                {
                    checkloginresult: function(u_ctx,r)
                    {
                        if (typeof r[0] == 'number' && r[0] < 0) msgDialog('warningb',l[135],l[200]);
                        else
                        {
                            loadingDialog.hide();
                            u_type = r;
                            document.location.hash = 'fm'; //TODO: fixme
                        }
                    }
                }
                var passwordaes = new sjcl.cipher.aes(prepare_key_pw($('#register-password', $dialog).val()));
                var uh = stringhash($('#register-email', $dialog).val().toLowerCase(),passwordaes);
                u_checklogin(ctx,true,prepare_key_pw($('#register-password', $dialog).val()),localStorage.signupcode,$('#register-firstname', $dialog).val() + ' ' + $('#register-lastname', $dialog).val(),uh);
                delete localStorage.signupcode;
            }
            else if (u_type === false)
            {
                loadingDialog.show();
                u_storage = init_storage(localStorage);
                u_checklogin(
                    {
                        checkloginresult: function(u_ctx,r)
                        {
                            u_type = r;
                            registeraccount();
                        }
                    },true);
            }
            else if (u_type == 0) registeraccount();
        }
    }
    if(err) {
        loadingDialog.hide();
    }
};

var paypalTimeout = null;
function showLoadingDialog(url) {
    
    clearTimeout(paypalTimeout);

    $('.pro-register-dialog')
        .removeClass('active')
        .addClass('hidden');

    $('.fm-dialog-overlay').removeClass('hidden');

    var $dialog = $('.fm-dialog.pro-register-paypal-dialog');

    var reposition = function() {
        $dialog.css({
            'margin-left': -1 * ($dialog.outerWidth() / 2),
            'margin-top': -1 * ($dialog.outerHeight() / 2)
        });
    };
    reposition();


    var fadeOutInLoop = function($elm) {
        $elm
            .animate({
                'opacity': 0.2
            }, 600)
            .animate({'opacity': 1}, 1000, function() {
                fadeOutInLoop($elm);
            });
    };

    fadeOutInLoop($('.pro-register-paypal-dialog .reg-success-icon'));

    $dialog
        .addClass('active')
        .removeClass('hidden');

    if(url) {
        megaAnalytics.log("pro", "proceedingToPaypal");

        paypalTimeout = setTimeout(function () {
            document.location = url;
        }, 3000);
    }

}
function redirectToPaypalHide() {
    $('.fm-dialog.pro-register-paypal-dialog')
        .removeClass('active')
        .addClass('hidden');

    $('.fm-dialog-overlay').addClass('hidden');
}

var proceedToPaypal = function() {

    if(pro_package) {
        var cls = pro_package
            .replace("_month", "")
            .replace("_year", "");

        $('.reg-st3-membership-bl').removeClass('selected')
        $('.reg-st3-membership-bl.' + cls).addClass('selected');

        u_type=1;
    }

    pro_continue();
};


var signupPromptDialog = null;
var showSignupPromptDialog = function() {
    if(!signupPromptDialog) {
        signupPromptDialog = new mega.ui.Dialog({
            'className': 'loginrequired-dialog',
            'closable': true,
            'focusable': false,
            'expandable': false,
            'requiresOverlay': true,
            'title': l[5841],
            'buttons': []
        });
        signupPromptDialog.bind('onBeforeShow', function() {
            $('.fm-dialog-title',this.$dialog)
                .text(
                    this.options.title
                );

            // custom buttons, because of the styling
            $('.fm-notification-info',this.$dialog)
                .html('<p>' + l[5842] + '</p>');

            $('.fm-dialog-button.pro-login', this.$dialog)
                .unbind('click.loginrequired')
                .bind('click.loginrequired', function() {
                    signupPromptDialog.hide();
                    showLoginDialog();
                    return false;
                });

            $('.fm-dialog-button.pro-register', this.$dialog)
                .unbind('click.loginrequired')
                .bind('click.loginrequired', function() {
                    signupPromptDialog.hide();
                    showRegisterDialog();
                    return false;
                });
        });
    }

    signupPromptDialog.show();

    var $selectedPlan = $('.reg-st3-membership-bl.selected');
    var plan = 1;
    if($selectedPlan.is(".lite")) { plan = 1; }
	else if($selectedPlan.is(".pro1")) { plan = 2; }
    else if($selectedPlan.is(".pro2")) { plan = 3; }
    else if($selectedPlan.is(".pro3")) { plan = 4; }

    $('.loginrequired-dialog .fm-notification-icon')
        .removeClass('plan1')
        .removeClass('plan2')
        .removeClass('plan3')
		.removeClass('plan4')
        .addClass('plan' + plan);
}