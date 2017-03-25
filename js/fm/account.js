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
        if ($wrapperDiv.is('.disabled')) {
            return;
        }

        var res;

        if ($input.hasClass('checkboxOn')) {
            res = onChangeCb(false);
            if (res !== false) {
                accountUI.initCheckbox.uncheck($input, $wrapperDiv);
            }
        }
        else {
            res = onChangeCb(true);
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

accountUI.initCheckbox.enable = function(className, $container) {
    var $wrapperDiv = $('.' + className, $container);
    $wrapperDiv.removeClass('disabled');
};
accountUI.initCheckbox.disable = function(className, $container) {
    var $wrapperDiv = $('.' + className, $container);
    $wrapperDiv.addClass('disabled');
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
    var $input = $('input.' + className + '[value="' + newVal + '"]', $container);
    if ($input.is('.disabled')) {
        return;
    }

    $('.' + className + '.radioOn', $container)
        .addClass('radioOff').removeClass('radioOn');


    $input
        .removeClass('radioOff').addClass('radioOn')
        .attr('checked', 1);

    $input.parent().addClass('radioOn').removeClass('radioOff');
};


accountUI.initRadio.disable = function($input) {
    $('input.[value="' + newVal + '"]', $container)
        .addClass('disabled')
        .attr('disabled', 1);
};

accountUI.initRadio.enable = function(value, $container) {
    $('input.[value="' + newVal + '"]', $container)
        .removeClass('disabled')
        .removeAttr('disabled');
};


accountUI.advancedSection = function(autoaway, autoawaylock, autoawaytimeout, persist, persistlock) {
    // TODO: FIXME, make accountUI elements not dependant!
    if (!megaChatIsReady) {
        // accountUI.advanced section was called too early, e.g. before chat's initialisation...delay the init.
        var args = toArray.apply(null, arguments);
        setTimeout(function() {
            accountUI.advancedSection.apply(accountUI, args);
        }, 700);
        return;
    }

    var presenceInt = megaChat.plugins.presencedIntegration;

    if (!presenceInt || !presenceInt.userPresence) {
        setTimeout(function() {
            throw new Error('presenceInt is not ready...');
        });
        return;
        // ^ FIXME too..!
    }

    // Only call this if the call of this function is the first one, made by fm.js -> accountUI
    if (autoaway === undefined) {
        $(presenceInt).rebind('settingsUIUpdated.settings', function(
            e,
            autoaway,
            autoawaylock,
            autoawaytimeout,
            persist,
            persistlock
        ) {
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
        $(presenceInt).rebind('settingsUIUpdated.settings', function(
            e,
            autoaway,
            autoawaylock,
            autoawaytimeout,
            persist,
            persistlock
        ) {
            accountUI.advancedSection(autoaway, autoawaylock, autoawaytimeout, persist, persistlock);
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

        accountUI.initCheckbox(
            'persist-presence',
            $sectionContainerChat,
            persist,
            persistChangeRequestedHandler
        );


        // prevent changes to persist-presence if persistlock is set
        accountUI.initCheckbox[persistlock ? "disable" : "enable"](
            'persist-presence',
            $sectionContainerChat
        );

        if (persistlock === true) {
            $('.persist-presence-wrapper', $sectionContainerChat).addClass('hidden');
        }
        else {
            $('.persist-presence-wrapper', $sectionContainerChat).removeClass('hidden');
        }

        accountUI.initCheckbox(
            'autoaway',
            $sectionContainerChat,
            autoaway,
            autoawayChangeRequestHandler
        );

        // prevent changes to autoaway if autoawaylock is set
        accountUI.initCheckbox[autoawaylock ? "disable" : "enable"](
            'autoaway',
            $sectionContainerChat
        );

        if (autoawaylock === true) {
            $('.autoaway-wrapper', $sectionContainerChat).addClass('hidden');
        }
        else {
            $('.autoaway-wrapper', $sectionContainerChat).removeClass('hidden');
        }

        // always editable for user comfort -
        accountUI.enableElement($('input#autoaway', $sectionContainerChat));

        var lastValidNumber = Math.floor(autoawaytimeout/60);
        // when value is changed, set checkmark
        $('input#autoaway', $sectionContainerChat)
            .rebind('change.dashboard', function() {
                var val = parseInt($(this).val());
                if (val > 3505) {
                    val = 3505;
                }
                else if (val < 0) {
                    val = 5;
                }

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
