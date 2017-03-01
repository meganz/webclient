accountUI.disableElement = function(element) {
    $(element).addClass('disabled').attr('disabled', 1);
};
accountUI.enableElement = function(element) {
    $(element).removeClass('disabled').removeAttr('disabled');
};

accountUI.initCheckbox = function(className, $container, currentValue, onChangeCb) {
    var $wrapperDiv = $('.' + className, $container);
    var $input = $('input[type="checkbox"]', $wrapperDiv);

    $wrapperDiv.rebind('click.checkbox', function() {
        if ($input.hasClass('checkboxOn')) {
            var res = onChangeCb(false);
            if (res !== false) {
                accountUI.initCheckbox.uncheck($input, $wrapperDiv);
            }
        }
        else {
            var res = onChangeCb(true);
            if (res !== false) {
                accountUI.initCheckbox.check($input, $wrapperDiv);
            }
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

accountUI.advancedSection = function(autoaway, autoawaylock, autoawaytimeout, persist, persistlock) {
    var presenceInt = megaChat.plugins.presencedIntegration;

    // Only call this if the call of this function is the first one, made by fm.js -> accountUI
    if (autoaway === undefined) {
        $(presenceInt).rebind('settingsUIUpdated.settings', function(e, autoaway, autoawaylock, autoawaytimeout, persist, persistlock) {
            accountUI.advancedSection(autoaway, autoawaylock, autoawaytimeout, persist, persistlock);
        });

        presenceInt.userPresence.updateui();
        return;
    }

    // chat
    var $sectionContainerChat = $('.account.tab-content.chat');

    var _initPresenceRadio = function(presence) {
        accountUI.initRadio(
            'chatstatus',
            $sectionContainerChat,
            presence,
            function(newVal) {
                presenceInt.setPresence(parseInt(newVal));
            }
        );
    };

    if (typeof (megaChat) !== 'undefined' && typeof(presenceInt) !== 'undefined') {
        $(presenceInt).rebind('onPeerStatus.settings', function(e, handle, presence) {
            if (handle === u_handle) {
                _initPresenceRadio(presence);
            }
        });
        $(presenceInt).rebind('settingsUIUpdated.settings', function(e, autoaway, autoawaylock, autoawaytimeout, persist, persistlock) {
            accountUI.advancedSection(autoaway, autoawaylock, autoawaytimeout, persist, persistlock);
        });
        $(presenceInt.userPresence).rebind('onDisconnected.settings', function(e) {
            _initPresenceRadio(UserPresence.PRESENCE.OFFLINE);
        });
    }

    _initPresenceRadio(presenceInt.getPresence(u_handle));

    var persistChangeRequestedHandler = function(newVal) {
        presenceInt.userPresence.ui_setpersist(newVal);
    };

    var autoawayChangeRequestHandler = function(newVal) {
        presenceInt.userPresence.ui_setautoaway(newVal);
    };

    if (autoawaytimeout !== false) {
        // FIXME: prevent changes to persist-presence and autoaway
        // if persistlock/autoawaylock are set

        accountUI.initCheckbox(
            'persist-presence',
            $sectionContainerChat,
            persist,
            persistChangeRequestedHandler
        );

        accountUI.initCheckbox(
            'autoaway',
            $sectionContainerChat,
            autoaway,
            autoawayChangeRequestHandler
        );

        // always editable for user comfort -
        accountUI.enableElement($('input#autoaway', $sectionContainerChat));

        var lastValidNumber = Math.floor(autoawaytimeout/60);
        // when value is changed, set checkmark
        $('input#autoaway', $sectionContainerChat)
            .rebind('change.dashboard', function() {
                var val = parseInt($(this).val());
                if (val > 0) {
                    presenceInt.userPresence.ui_setautoaway(true, val*60);
                    lastValidNumber = val;
                }
            })
            .rebind('blur.dashboard', function() {
                // the goal of the following line is to reset the value of the field if the entered data is invalid
                // after the user removes focus from it (and set the internally set value)
                $(this).val(presenceInt.userPresence.autoawaytimeout / 60);
            })
            .val(lastValidNumber);
    }
};
