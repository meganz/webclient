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
            'expandable': false,
            'requiresOverlay': true,

            /**
             * css class names
             */
            'expandableButtonClass': '.fm-mega-dialog-size-icon',
            'buttonContainerClassName': 'fm-mega-dialog-bottom',
            'buttonPlaceholderClassName': 'fm-mega-dialog-pad',

            /**
             * optional:
             */
            'title': l[1356],
            'buttons': [
                {
                    'label': "Send",
                    'className': "fm-dialog-button-green feedback-button-send disabled",
                    'callback': function() {
                        self._report.message = self.$textarea.val();
                        if ($('input[name="contact_me"]', self.$dialog).attr('checked')) {
                            self._report.contact_me = 1;
                        } else {
                            self._report.contact_me = 0;
                        }


                        var $selectedRating = $('.rate.active', self.$dialog);
                        if ($selectedRating.length === 0) {
                            return false;
                        }

                        var rated = $('.rate.active', self.$dialog)[0].className;
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
                        this.hide();

                        msgDialog('info', 'Feedback', 'Thank you for your feedback!');
                    }
                },
                {
                    'label': "Cancel",
                    'className': "fm-dialog-button-red feedback-button-cancel",
                    'callback': function() {
                        this.hide();
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
            self.$checkboxes.hide();

            $('.rating a', self.$dialog)
                .removeClass("faded")
                .removeClass("active");

            self.$textarea = $('textarea', self.$dialog);
            self.$textarea
                .val('')
                .hide();

            $('.stats-button', self.$dialog)
                .hide();

            $('.stats .checkdiv').rebind('onFakeCheckboxChange.feedbackDialog', function(e, val) {
                var fnName = val ? "fadeIn" : "fadeOut";

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

                $('.stats-button', self.$dialog)[fnName]({
                    duration: 250,
                    progress: function (anim, progress, remainingMs) {
                        if (Math.ceil(progress * 100) % 5 === 0) {
                            self.reposition();
                        }
                    }
                });
            });

            $('input[name="send_stats"]', self.$dialog)
                .attr('checked', true)
                .trigger('change');

            $('input[name="contact_me"]', self.$dialog)
                .attr('checked', true)
                .trigger('change');
        });

        self.bind("onHide", function() {
            // reset some vars
            self._report = {};
            self._type = "undefined";
        });
    };

    FeedbackDialog.prototype._initGenericEvents = function() {
        var self = this;
        $('.rating a', self.$dialog).rebind('click.feedbackDialog', function() {
            $('.rating a', self.$dialog)
                .removeClass("active");

            $(this).toggleClass("active");

            $('.rating a:not(.active)', self.$dialog)
                .addClass("faded");

            if (!self.$checkboxes.is(":visible")) {
                self.$checkboxes.slideDown({
                    duration: 250,
                    progress: function(anim, progress, remainingMs) {
                        if (Math.ceil(progress * 100) % 2 === 0) {
                            self.reposition();
                        }
                    }
                });
            }
            if (!self.$textarea.is(":visible")) {
                self.$textarea.slideDown({
                    duration: 350,
                    progress: function(anim, progress, remainingMs) {
                        if (Math.ceil(progress * 100) % 2 === 0) {
                            self.reposition();
                        }
                    }
                });
            }
            $('.feedback-button-send', self.$dialog).removeClass('disabled');
        });

        $('.stats-button', self.$dialog).rebind('click.feedbackDialog', function() {
            var dialog = self.$dataReportDialog;
            if (!dialog) {
                dialog = self.$dataReportDialog = new mega.ui.Dialog({
                    className: 'collected-data-review-dialog',

                    /**
                     * features:
                     */
                    'focusable': false,
                    'closable': true,
                    'expandable': false,
                    'requiresOverlay': true,

                    /**
                     * optional:
                     */
                    'title': 'Collected Data Report',
                    'buttons': [
                        {
                            'label': "Close",
                            'className': "fm-dialog-button-red collected-data-review-button-cancel",
                            'callback': function () {
                                this.hide();
                            }
                        }
                    ]
                });
            }

            $('textarea', dialog.$dialog).val(
                JSON.stringify(self._report, null, 2)
            );
            dialog.show();
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