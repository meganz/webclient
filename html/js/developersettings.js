/**
 * Developer Settings Page Logic.
 */
(function(scope) {
    'use strict';

    scope.developerSettings = {
        $page: null,

        /** Init Developer Settings Page. */
        init: function() {
            this.$page = $('.bottom-page.developer-settings');
            this.initSettings();
            this.initApplyButton();
        },

        /** Show Developer Setting Page. */
        show: function() {
            parsepage(pages['developersettings']);
            topmenuUI();
            this.init();
        },

        /** Reload to apply changes. **/
        apply: function() {
            window.location.reload();
        },

        /** Init HTML defined setting controls **/
        initSettings: function() {
            var $localStorageSettings = this.$page.find('.developer-setting.localstorage');

            // Load in current settings.
            $localStorageSettings.each(function() {
                var $this = $(this);
                $this.val(localStorage.getItem($this.attr('name')) || null);
            });

            // Change event save setting to local storage.
            $localStorageSettings.rebind('change', function() {
                var $this = $(this);
                var itemKey = $this.attr('name');
                var val =  $this.val();
                if (val) {
                    localStorage.setItem(itemKey, val);
                } else {
                    localStorage.removeItem(itemKey);
                }
            });
        },

        /** Init the page reload button **/
        initApplyButton: function() {
            var self = this;
            this.$page.find('.apply').rebind('click', function() {
                self.apply();
            });
        }
    };

})(mega);
