(function($, scope) {
    /**
     * Simple/reusable feedback dialog
     *
     * @constructor
     * @class mega.ui.FeedbackDialog
     * @param [opts] {Object}
     * @constructor
     */
    var FeedbackDialog = function(opts) {
        var self = this;

        var defaultOptions = {
            /**
             * Required: .dialog Class name (excl. the starting ".")
             */
            'className': 'feedback-dialog',

            /**
             * features:
             */
            'focusable': true,
            'closable': true,
            'closableByEsc': true,
            'expandable': true,
            'requiresOverlay': false,
            'defaultButtonStyle': false,

            /**
             * css class names
             */
            'expandableButtonClass': '.fm-mega-dialog-size-icon',
            'buttonContainerClassName': 'feedback-dialog-bottom',
            'buttonPlaceholderClassName': 'fm-mega-dialog-pad',

            /**
             * optional:
             */
            'title': l[1356],
            'buttons': [
                {
                    'label': l[1686],
                    'className': "feedback-button-cancel disabled",
                    'callback': function() {
                        this.hide();
                    }
                },
                {
                    'label': 'SUBMIT YOUR FEEDBACK',
                    'className': "feedback-button-send disabled",
                    'callback': function() {
                        self._report.message = self.$textarea.val();
                        if ($('input[name="contact_me"]', self.$dialog).attr('checked')) {
                            self._report.contact_me = 1;
                        } else {
                            self._report.contact_me = 0;
                        }


                        var $selectedRating = $('.rating a.active', self.$dialog);
                        if ($selectedRating.length === 0) {
                            return false;
                        }

                        var rated = $('.rating a.active', self.$dialog)[0].className;
                        rated = rated.replace("rate", "").replace("active", "").replace(/\s+/g, "");
                        self._report.rated = rated;
                        var dump = JSON.stringify(self._report);

                        var reportId = MurmurHash3(JSON.stringify(dump), 0x4ef5391a);
                        api_req({
                            a: 'clog',
                            t: "feedbackDialog." + self._type,
                            id: reportId,
                            d: dump
                        });

                        if (self._report.chatRoomState) {
                            Object.keys(self._report.chatRoomState).forEach(function(k) {
                                var v = self._report.chatRoomState[k];
                                if (v.callSessions && v.callSessions.length > 0) {
                                    v.callSessions.forEach(function(callSession) {
                                        if (callSession.callStats) {
                                            callSession.callStats.forEach(function (cs) {
                                                api_req({
                                                    a: 'clog',
                                                    t: "callStats",
                                                    id: cs.cid + "_" + cs.isCaller,
                                                    d: reportId
                                                });
                                            });
                                        }
                                    });
                                }
                            });
                        }
                        
                        $('.feedback-dialog-body').addClass('hidden');
                        $('.feedback-result-pad').removeClass('hidden');    

                        $('.feedback-result-button', self.$dialog).rebind('click.feedbackDialog', function() {
                            self.hide();
                        });

                    }
                }
            ]
        };

        self._report = {};
        self._type = "undefined";

        mega.ui.Dialog.prototype.constructor.apply(self, [
            $.extend({}, defaultOptions, opts)
        ]);

        uiCheckboxes(self.$dialog);

        self.$checkboxes = $('.reply, .stats', self.$dialog);

        self.bind("onBeforeShow", function() {

            $('.rating a', self.$dialog)
                .removeClass("active colored");

            self.$textarea = $('textarea', self.$dialog);
            self.$textarea
                .val('');
            
            $('.collected-data', self.$dialog)
                .html('');

            $('.feedback-button-send, .feedback-button-cancel', self.$dialog)
                .addClass('disabled');

            $('.feedback-dialog-body').removeClass('hidden');
            $('.feedback-result-pad').addClass('hidden');

            $('.collected-data', self.$dialog)
                .html('');

            $('.stats .checkdiv').rebind('onFakeCheckboxChange.feedbackDialog', function(e, val) {
                if (val === true) {
                    loadingDialog.show();
                    generateAnonymousReport()
                        .done(function (report) {
                            self._report = report;
                        })
                        .always(function () {
                            loadingDialog.hide();
                        });
                } else {
                    self._report = {};
                }
            });

            $('input[name="send_stats"]', self.$dialog)
                .attr('checked', true)
                .trigger('change');

            $('input[name="contact_me"]', self.$dialog)
                .attr('checked', false)
                .trigger('change');
                
        });

        self.bind("onHide", function() {
            // reset some vars
            self._report = {};
            self._type = "undefined";
        });
    };

    FeedbackDialog.prototype._initGenericEvents = function() {
        var self = this,
            collectedData,
            renderTimer;

        $('.rating a', self.$dialog).rebind('click.feedbackDialog', function() {
            $('.rating a', self.$dialog)
                .removeClass('active colored');

            $(this).addClass('active').prevAll().addClass('colored');

            $('.feedback-button-send, .feedback-button-cancel', self.$dialog).removeClass('disabled');
        });

        $('.feedback-dialog-textarea textarea').on('keyup', function() {
            var $txt = $('.feedback-dialog-textarea textarea'),
                $hiddenDiv = $('.feedback-dialog-hidden'),
                $pane = $('.feedback-dialog-textarea'),
                txtHeight = $txt.outerHeight(),
                content = $txt.val(),
                api;

            content = content.replace(/\n/g, '<br />');
            $hiddenDiv.html(content + '<br/>');

            if ($hiddenDiv.height() > 78) {
                $txt.height($hiddenDiv.outerHeight());
                $pane.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
                api = $pane.data('jsp');
                $txt.blur();
                $txt.focus();
                api.scrollByY(0);
            }
            else {
                $txt.removeAttr('style');
                api = $pane.data('jsp');
                if (api) {
                    api.destroy();
                    $txt.blur();
                    $txt.focus();
                }
            }
        });

        $('.stats-button', self.$dialog).rebind('click.feedbackDialog', function() {
            var dialog = self.$dataReportDialog;
            if (!dialog) {
                dialog = self.$dataReportDialog = new mega.ui.Dialog({
                    className: 'collected-data-review-dialog',

                    /**
                     * features:
                     */
                    'focusable': true,
                    'closable': true,
                    'closableByEsc': true,
                    'expandable': true,
                    'requiresOverlay': false,

                    /**
                     * optional:
                     */
                    'title': 'Collected Data Report',
                    'buttons': [
                        {
                            'label': l[148],
                            'className': "fm-dialog-button-red collected-data-review-button-cancel",
                            'callback': function () {
                                this.hide();
                            }
                        }
                    ]
                });
            }

            dialog.show();
            
            collectedData = '<li>' + JSON.stringify(self._report, null, 2).replace(/\n/g, '</li> <li>');
            $('.collected-data', dialog.$dialog).html(collectedData);
            
            // Content render fix for correct scrolling
            var renderTimer = setInterval(function(){
                    $('.collected-data-textarea').jScrollPane({enableKeyboardNavigation:false,showArrows:true, arrowSize:5,animateScroll: true});
                    clearInterval(renderTimer);
            }, 200);

        });

        mega.ui.Dialog.prototype._initGenericEvents.apply(self);
    };


    FeedbackDialog.prototype = $.extend({}, mega.ui.Dialog.prototype, FeedbackDialog.prototype);


    FeedbackDialog.singleton = function($toggleButton, rating, typeOfFeedback) {
        if (!FeedbackDialog._instance) {
            FeedbackDialog._instance = new FeedbackDialog();
        }

        if (typeOfFeedback) {
            FeedbackDialog._instance._type = typeOfFeedback;
        }
        FeedbackDialog._instance.show($toggleButton);

        return FeedbackDialog._instance;
    };


    // export
    scope.mega = scope.mega || {};
    scope.mega.ui = scope.mega.ui || {};
    scope.mega.ui.FeedbackDialog = FeedbackDialog;
})(jQuery, window);