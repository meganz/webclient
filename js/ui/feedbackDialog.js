(function($, scope) {
    /**
     * Simple/reusable feedback dialog
     *
     * @param opts {Object}
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
            'title': 'Feedback',
            'buttons': [
                {
                    'label': "Send",
                    'className': "fm-dialog-button-green feedback-button-send disabled",
                    'callback': function() {
                        self._report.message = self.$textarea.val();
                        if($('input[name="my_email"]', self.$dialog).attr('checked')) {
                            self._report.replyEmail = $('input[name="email"]', self.$dialog).val();
                        }

                        var rated = $('.rate.active', self.$dialog)[0].className;
                        rated = rated.replace("rate", "").replace("active", "").replace(/\s+/g, "");
                        self._report.rated = rated;

                        megaAnalytics.log(
                            "feedback",
                            self._type,
                            self._report
                        );

                        this.hide();

                        msgDialog('info', 'Feedback', 'Thank you for your feedback!')
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

            $('input[name="email"]', self.$dialog)
                .hide();

            $('.stats-button', self.$dialog)
                .hide();

            $('.reply .checkdiv').rebind('onFakeCheckboxChange.feedbackDialog', function(e, val) {
                var fnName = val ? "slideDown" : "slideUp";

                $('input[name="email"]', self.$dialog)[fnName]({
                    duration: 250,
                    progress: function(anim, progress, remainingMs) {
                        if(Math.ceil(progress * 100) % 2 === 0) {
                            self.reposition();
                        }
                    },
                    complete: function() {
                        $(this)
                            .select()
                            .focus();
                    }
                });
            });

            $('.stats .checkdiv').rebind('onFakeCheckboxChange.feedbackDialog', function(e, val) {
                var fnName = val ? "fadeIn" : "fadeOut";

                if(val === true) {
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




            $('input[name="email"]', self.$dialog)
                .val(M.u[u_handle].m)
                .trigger('change');

            $('input[name="send_stats"]', self.$dialog)
                .attr('checked', true)
                .trigger('change');

            $('input[name="my_email"]', self.$dialog)
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
        var self = this;
        $('.rating a', self.$dialog).rebind('click.feedbackDialog', function() {
            $('.rating a', self.$dialog)
                .removeClass("active");

            $(this).toggleClass("active");

            $('.rating a:not(.active)', self.$dialog)
                .addClass("faded");

            if(!self.$checkboxes.is(":visible")) {
                self.$checkboxes.slideDown({
                    duration: 250,
                    progress: function(anim, progress, remainingMs) {
                        if(Math.ceil(progress * 100) % 2 === 0) {
                            self.reposition();
                        }
                    }
                });
            }
            if(!self.$textarea.is(":visible")) {
                self.$textarea.slideDown({
                    duration: 350,
                    progress: function(anim, progress, remainingMs) {
                        if(Math.ceil(progress * 100) % 2 === 0) {
                            self.reposition();
                        }
                    }
                });
            }
            $('.feedback-button-send',self.$dialog).removeClass('disabled');
        });

        $('.stats-button', self.$dialog).rebind('click.feedbackDialog', function() {
            var dialog = self.$dataReportDialog;
            if(!dialog) {
                var dialog = self.$dataReportDialog = new mega.ui.Dialog({
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
        if(!FeedbackDialog._instance) {
            FeedbackDialog._instance = new FeedbackDialog();
        }

        if(typeOfFeedback) {
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