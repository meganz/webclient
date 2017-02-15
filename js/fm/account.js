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
    var presenceInt = megaChat.plugins.presencedIntegration;
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
        $(presenceInt.userPresence).rebind('onDisconnected.settings', function(e) {
            _initPresenceRadio(UserPresence.PRESENCE.OFFLINE);
        });
    }

    _initPresenceRadio(presenceInt.getPresence(u_handle));

    accountUI.initCheckbox('autoaway', $sectionContainerChat, presenceInt.getAutoaway() !== false, function(newVal) {

        if (newVal !== true) {
            $('input#autoaway', $sectionContainerChat).attr('disabled', 1).addClass('disabled');
            presenceInt.setAutoawayOff();
        }
        else {
            $('input#autoaway', $sectionContainerChat).removeAttr('disabled').removeClass('disabled');
            presenceInt.setAutoaway($('input#autoaway', $sectionContainerChat).val());
        }
    });

    accountUI.initCheckbox('persist-presence', $sectionContainerChat, presenceInt.getPersist(), function(newVal) {

        if (newVal !== true) {
            presenceInt.setPersistOff();
        }
        else {
            $('input#autoaway', $sectionContainerChat).removeAttr('disabled').removeClass('disabled');
            presenceInt.setPersistOn();
        }
    });

    if (presenceInt.getAutoaway() === false) {
        $('input#autoaway', $sectionContainerChat).attr('disabled', 1).addClass('disabled');
    }

    var lastValidNumber = 15;
    $('input#autoaway', $sectionContainerChat)
        .rebind('change.dashboard', function() {
            var val = parseInt($(this).val());
            if (val > 0) {
                presenceInt.setAutoaway(val);
                lastValidNumber = val;
            }
        })
        .rebind('blur.dashboard', function() {
            $(this).val(lastValidNumber);
            Soon(function() {
                presenceInt.setAutoaway(lastValidNumber);
            });
        })
        .val(presenceInt.getAutoaway() ? presenceInt.getAutoaway() : lastValidNumber);
};
