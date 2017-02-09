/**
 * TODO: Move accountUI and dashboardUI from fm.js to here, when we are ready this this.
 */

accountUI.initCheckbox = function(className, $container, currentValue, onChangeCb) {
    var $wrapperDiv = $('.' + className, $container);
    var $input = $('input[type="checkbox"]', $wrapperDiv);

    $wrapperDiv.rebind('click.checkbox', function() {
        if ($input.hasClass('checkboxOn')) {
            accountUI.initCheckbox.uncheck($input, $wrapperDiv);
            onChangeCb(false);
        }
        else {
            accountUI.initCheckbox.check($input, $wrapperDiv);
            onChangeCb(true);
        }
    });
    if (currentValue === true || currentValue === 1) {
        accountUI.initCheckbox.check($input, $wrapperDiv);
    }
    else {
        accountUI.initCheckbox.uncheck($input, $wrapperDiv);
    }

};

accountUI.initCheckbox.check = function($input, $wrapperDiv) {
    $input.removeClass('checkboxOff').addClass('checkboxOn').attr('checked', true);
    $wrapperDiv.removeClass('checkboxOff').addClass('checkboxOn');
};
accountUI.initCheckbox.uncheck = function($input, $wrapperDiv) {
    $input.removeClass('checkboxOn').addClass('checkboxOff').attr('checked', false);
    $wrapperDiv.removeClass('checkboxOn').addClass('checkboxOff');
};

accountUI.initRadio = function(className, $container, currentValue, onChangeCb) {
    $('.' + className, $container).removeClass('radioOn').addClass('radioOff');
    // var i = 8;
    // if (fmconfig.uisorting)
    //     i = 9;

    $('input.' + className + '[value="' + currentValue + '"]', $container)
        .removeClass('radioOff').addClass('radioOn');

    $('.' + className + ' input', $container).rebind('click.radio', function(e) {
        var newVal = $(this).val();

        accountUI.initRadio.setValue(className, newVal, $container);
        onChangeCb(newVal);
    });

    accountUI.initRadio.setValue(className, currentValue, $container);
};
accountUI.initRadio.setValue = function(className, newVal, $container) {
    $('.' + className + '.radioOn', $container)
        .addClass('radioOff').removeClass('radioOn');

    var $input = $('input.' + className + '[value="' + newVal + '"]', $container)
        .removeClass('radioOff').addClass('radioOn')
        .attr('checked', 1);
    $input.parent().addClass('radioOn').removeClass('radioOff');
};

accountUI.advancedSection = function() {
    // chat
    var $sectionContainerChat = $('.account.tab-content.chat');

    var _initPresenceRadio = function(presence) {
        accountUI.initRadio(
            'chatstatus',
            $sectionContainerChat,
            presence,
            function(newVal) {
                megaChat.plugins.presencedIntegration.setPresence(parseInt(newVal));
            }
        );
    };


    if (typeof (megaChat) !== 'undefined' && typeof(megaChat.plugins.presencedIntegration) !== 'undefined') {
        $(megaChat.plugins.presencedIntegration).rebind('onPeerStatus.settings', function(e, handle, presence) {
            if (handle === u_handle) {
                _initPresenceRadio(presence);
            }
        });
        $(megaChat.plugins.presencedIntegration.userPresence).rebind('onDisconnected.settings', function(e) {
            _initPresenceRadio(UserPresence.PRESENCE.OFFLINE);
        });
    }

    _initPresenceRadio(megaChat.plugins.presencedIntegration.getPresence(u_handle));

    accountUI.initCheckbox('autoaway', $sectionContainerChat, mega.config.get("chat_autoaway"), function(newVal) {
        mega.config.setn("chat_autoaway", (newVal === true ? 1 : 0));

        if (newVal !== true) {
            $('input#autoaway').attr('disabled', 1).addClass('disabled');
            megaChat.plugins.presencedIntegration._autoawayOff();
        }
        else {
            $('input#autoaway').removeAttr('disabled').removeClass('disabled');
            megaChat.plugins.presencedIntegration._autoaway();
        }
    });

    if (mega.config.get("chat_autoaway") === 0) {
        $('input#autoaway').attr('disabled', 1).addClass('disabled');
    }

    var lastValidNumber = 15;
    $('input#autoaway')
        .rebind('change.dashboard', function() {
            var val = parseInt($(this).val());
            if (val > 0) {
                mega.config.setn("chat_autoaway_min", val);
                lastValidNumber = val;
            }
        })
        .rebind('blur.dashboard', function() {
            $(this).val(lastValidNumber);
            Soon(function() {
                megaChat.plugins.presencedIntegration._autoaway(lastValidNumber);
            });
        })
        .val(mega.config.get("chat_autoaway_min") ? mega.config.get("chat_autoaway_min") : 15);
};
