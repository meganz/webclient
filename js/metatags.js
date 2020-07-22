mega.metatags = new function() {
    'use strict';

    /**
     * Private function to check if the page is excluded and not missing
     * @param {String} page     Page name
     * @returns {Boolean}       true/false is excluded.
     */
    var isPageExcluded = function(page) {
        var excludedPages = ['start', 'voucher', 'redeem', 'test', 'debug', 'reset', 'unsub', 'done',
                             'repay', 'payment', 'recoveryparkchangepass', 'recoverykeychangepass', 'recoveryenterkey',
                             'recoverybypark', 'recoverybykey', 'wiretransfer', 'cancel', 'backup', 'key', 'megadrop',
                             'sms', 'twofactor', 'emailverify', 'confirm', 'businessinvite', 'businesssignup', 'verify'
        ];

        if (!page || excludedPages.indexOf(page) !== -1) {
            return true;
        }
        return false;
    };

    /* eslint-disable complexity */
    /**
     * Get Page meta tags.
     * @param {String} page     Page name
     * @returns {Object}        Object contains needed tags
     */
    this.getPageMetaTags = function(page) {
        var mTags = Object.create(null);
        var metaRobots = document.head.querySelector('meta[name="robots"]');
        if (metaRobots) {
            document.head.removeChild(metaRobots);
        }

        if (page === 'refer') {
            mTags.mega_title = 'MEGA Referral Program - MEGA';
            mTags.mega_desc = 'Earn 20% of the revenue from each purchase made by a user you have referred to MEGA';
        }
        else if (page === 'uwp' || page === 'wp') {
            mTags.mega_title = 'MEGA App for Windows 10 - MEGA';
            mTags.mega_desc = 'Your files, wherever you are, whenever you need them - '
                + 'across all your Windows 10 devices';
        }
        else if (page === 'mobileapp' || page === 'mobile' || page === 'android' || page === 'ios') {
            mTags.mega_title = 'MEGA Mobile Apps - MEGA';
            mTags.mega_desc = 'Securely manage your files and collaborate with everyone from anywhere.';
        }
        else if (page === 'nas') {
            mTags.mega_title = 'MEGA on NAS - MEGA';
            mTags.mega_desc = 'A command line tool to interact with MEGA from your Network Attached Storage device.';
        }
        else if (page === 'sync') {
            mTags.mega_title = 'MEGA Desktop App - MEGA';
            mTags.mega_desc = 'Easy automated synchronisation between your computer and your MEGA cloud';
        }
        else if (page === 'extensions') {
            mTags.mega_title = 'Browser Extensions - MEGA';
            mTags.mega_desc = 'Reduce loading times, improve download performance, strengthen security';
        }
        else if (page === 'bird') {
            mTags.mega_title = 'MEGAbird - MEGA';
            mTags.mega_desc = 'Send large files by email through MEGA';
        }
        else if (page === 'cmd') {
            mTags.mega_title = 'MEGAcmd - MEGA';
            mTags.mega_desc = 'A command line tool to work with your MEGA account and files.';
        }
        else if (page === 'downloadapp') {
            mTags.mega_title = 'Download the MEGA App - MEGA';
            mTags.mega_desc = 'You\'re nearly there, download our desktop app to get started!';
        }
        else if (page === 'pro') {
            mTags.mega_title = 'Plans & pricing - MEGA';
            mTags.mega_desc = 'Upgrade to a MEGA PRO account for additional storage and transfer quota. '
                + 'MEGA provides one the cheapest cloud storage deals on the Internet.';
        }
        else if (page === 'register') {
            mTags.mega_title = 'Register - MEGA';
            mTags.mega_desc = 'Create your free MEGA account and get up to free 50 GB.';
        }
        else if (page === 'login') {
            mTags.mega_title = 'Login - MEGA';
            mTags.mega_desc = 'Login to your MEGA account.';
        }
        else if (page === 'recovery') {
            mTags.mega_title = 'Recovery - MEGA';
            mTags.mega_desc = 'Forgot your MEGA password? Start your recovery process here.';
        }
        else if (page === 'terms') {
            mTags.mega_title = 'Terms of Service - MEGA';
            mTags.mega_desc = 'MEGA LIMITED TERMS OF SERVICE ("TERMS")';
        }
        else if (page === 'privacy') {
            mTags.mega_title = 'Privacy Policy - MEGA';
            mTags.mega_desc = 'Mega Limited Privacy and Data Policy';
        }
        else if (page === 'gdpr') {
            mTags.mega_title = 'GDPR - MEGA';
            mTags.mega_desc = 'General Data Protection Regulation Disclosure';
        }
        else if (page === 'copyright') {
            mTags.mega_title = 'Copyright - MEGA';
            mTags.mega_desc = 'Copyright. Notice of Alleged Infringement "Notice"';
        }
        else if (page === 'copyrightnotice') {
            mTags.mega_title = 'Copyright Notice - MEGA';
            mTags.mega_desc = 'Copyright. Notice of Alleged Infringement "Notice"';
        }
        else if (page === 'disputenotice') {
            mTags.mega_title = 'Copyright Counter-Notification - MEGA';
            mTags.mega_desc = 'Copyright Counter-Notification';
        }
        else if (page === 'takedown') {
            mTags.mega_title = 'Takedown Guidance - MEGA';
            mTags.mega_desc = 'Guidance on Requesting User Information or "Takedown" of User Data';
        }
        else if (page === 'contact') {
            mTags.mega_title = 'Contact Us - MEGA';
            mTags.mega_desc = 'Contact MEGA';
        }
        else if (page === 'resellers') {
            mTags.mega_title = 'Resellers - MEGA';
            mTags.mega_desc = 'You can conveniently purchase your MEGA PRO membership from one of our '
                + 'authorized resellers';
        }
        else if (page === 'security') {
            mTags.mega_title = 'Security - MEGA';
            mTags.mega_desc = 'Security and why it matters.';
        }
        else if (page === 'privacycompany') {
            mTags.mega_title = 'Privacy Company - MEGA';
            mTags.mega_desc = 'MEGA is Cloud Storage with Powerful Always-On Privacy.';
        }
        else if (page === 'dev' || page === 'developers') {
            mTags.mega_title = 'MEGA Software Development Kit - MEGA';
            mTags.mega_desc = 'Developers - MEGA Software Development Kit';
        }
        else if (page === 'doc') {
            mTags.mega_title = 'Documentation - MEGA';
            mTags.mega_desc = 'Developers - Documentation';
        }
        else if (page === 'sdkterms') {
            mTags.mega_title = 'SDK Terms of Service - MEGA';
            mTags.mega_desc = 'In addition to MEGA\'s Terms of Service and Privacy Policy, which are '
                + 'incorporated by reference into these terms, these terms apply to applications to '
                + 'use, and all subsequent use of, MEGA\'s API and SDK.';
        }
        else if (page === 'about/main') {
            mTags.mega_title = 'About - MEGA';
            mTags.mega_desc = 'MEGA - The Privacy Company';
        }
        else if (page === 'about/jobs') {
            mTags.mega_title = 'Jobs - MEGA';
            mTags.mega_desc = 'MEGA career opportunities start right here!';
        }
        else if (page === 'about/privacy') {
            mTags.mega_title = 'Privacy - MEGA';
            mTags.mega_desc = 'MEGA is the Privacy Company';
        }
        else if (page === 'about/reliability') {
            mTags.mega_title = 'Reliability - MEGA';
            mTags.mega_desc = 'MEGA\'s mission is not limited to just keeping your valuable data private: '
                + 'safeguarding it is equally important to us.';
        }
        else if (page === 'sourcecode') {
            mTags.mega_title = 'Source Code - MEGA';
            mTags.mega_desc = 'Source Code Transparency';
        }
        else if (page === 'credits') {
            mTags.mega_title = 'Credits - MEGA';
            mTags.mega_desc = 'MEGA would like to thank the authors of the following open source components '
                + 'that contributed essential functionality to our site';
        }
        else if (page === 'business') {
            mTags.mega_title = 'Business - MEGA';
            mTags.mega_desc = 'The secure solution for your business';
        }
        else if (page === 'registerb') {
            mTags.mega_title = 'Business Account - MEGA';
            mTags.mega_desc = 'Create Business Account';
        }
        else if (typeof Object(window.dlmanager).isStreaming === 'object') {
            mTags.mega_title = dlmanager.isStreaming._megaNode.name + ' - MEGA';
        }
        else if (page === 'recoveryparkchangepass') {
            mTags.mega_title = 'Park Change Password - MEGA';
        }
        else if (page === 'recoverykeychangepass') {
            mTags.mega_title = 'Key Change Password - MEGA';
        }
        else if (page === 'recoveryenterkey') {
            mTags.mega_title = 'Recovery Key - MEGA';
        }
        else if (page === 'recoverybypark') {
            mTags.mega_title = 'Park Recovery - MEGA';
        }
        else if (page === 'recoverybykey') {
            mTags.mega_title = 'Recover by Key - MEGA';
        }
        else if (page === 'wiretransfer') {
            mTags.mega_title = 'Wire Transfer - MEGA';
        }
        else if (page === 'twofactor') {
            mTags.mega_title = 'Two Factor - MEGA';
        }
        else if (page === 'emailverify') {
            mTags.mega_title = 'Email Verify - MEGA';
        }
        else if (page === 'businessinvite') {
            mTags.mega_title = 'Business Invite - MEGA';
        }
        else if (page === 'businesssignup') {
            mTags.mega_title = 'Business Signup - MEGA';
        }
        else if (page && page !== 'start' && isPageExcluded(page)) {
            mTags.mega_title = page.charAt(0).toUpperCase() + page.slice(1) + ' - MEGA';
        }
        else {
            mTags.mega_title = 'MEGA';
            if (!isPageExcluded(page) && !is_fm() && !is_extension) {
                if (d) {
                    console.error('A page without title. Please handle. Page: ' + page);
                }
                api_req({ a: 'log', e: 99735, m: 'page without title: ' + page });
            }
            else {
                metaRobots = document.createElement('meta');
                metaRobots.name = 'robots';
                metaRobots.content = 'noindex';
                document.head.appendChild(metaRobots);
            }
        }
        if (!mTags.mega_desc) {
            mTags.mega_desc = mega.whoami;
            if (!isPageExcluded(page) && !is_fm() && !is_extension) {
                if (d) {
                    console.error('A page without Description. Please handle. Page: ' + page);
                }
                api_req({ a: 'log', e: 99736, m: 'page without desc: ' + page });
            }
        }

        return mTags;
    };
    /* eslint-enable complexity */
};
