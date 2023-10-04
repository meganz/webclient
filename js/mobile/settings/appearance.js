mobile.appearance = {

    init: function() {
        "use strict";

        M.safeShowDialog('mobile-settings-appearance', () => {

            mega.ui.sheet.clear();
            mega.ui.sheet.showClose = true;
            mega.ui.sheet.addTitle(l.mobile_settings_appearance_title);
            mega.ui.sheet.type = 'modalLeft';

            const curVal = (u_attr && u_attr['^!webtheme'] || fmconfig.webtheme) | 0;

            const themes = [
                {
                    'parentNode': mega.ui.sheet.contentNode,
                    'label': l.appearance_sheet_sys_default,
                    'value': 0,
                    'checked': curVal === 0
                },
                {
                    'parentNode': mega.ui.sheet.contentNode,
                    'label': l.appearance_sheet_light,
                    'value': 1,
                    'checked': curVal === 1
                },
                {
                    'parentNode': mega.ui.sheet.contentNode,
                    'label': l.appearance_sheet_dark,
                    'value': 2,
                    'checked': curVal === 2
                }
            ];
            this.themeGroup = new MegaMobileRadioGroup({
                name: 'theme',
                radios: themes,
                align: 'right',
                onChange: e => {
                    mobile.appearance.changeTheme(e.currentTarget.value);
                    return false;
                }
            });

            mega.ui.sheet.show();
        });
    },

    changeTheme: function(value) {
        "use strict";

        if (u_attr) {
            mega.attr.set('webtheme', value, -2, 1);
        }
        else {
            fmconfig.webtheme = value;
        }

        mega.ui.setTheme(value | 0);
    }
};
