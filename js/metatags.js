mega.metatags = new function() {
    'use strict';

    /**
     * Private function to check if the page is excluded and not missing
     * @param {String} page     Page name
     * @returns {Boolean}       true/false is excluded.
     */
    var isPageExcluded = function(page) {
        // XXX: add new items sorted alphabetically.
        var excludedPages = [
            'keybackup', 'businessinvite', 'businesssignup', 'cancel', 'confirm', 'debug',
            'discount', 'download', 'emailverify', 'key', 'filerequest', 'payment', 'recover',
            'recoverybykey', 'recoverybypark', 'recoveryenterkey',
            'recoverykeychangepass', 'recoveryparkchangepass',
            'redeem', 'repay', 'reset', 'sms', 'special', 'start', 'test', 'thanks', 'twofactor',
            'unsub', 'verify', 'voucher', 'wiretransfer'
        ];

        if (!page) {
            return true;
        }

        for (var i = excludedPages.length; i--;) {
            var ep = excludedPages[i];

            if (page.substr(0, ep.length) === ep) {
                return ep.length === page.length ? -1 : ep.length;
            }
        }

        return false;
    };

    var stopBots = function(metaRobots, noReporting) {
        if (!noReporting && !isPageExcluded(page) && !is_fm() && !is_extension) {
            if (d) {
                console.error('A page without title. Please handle. Page: ' + page);
            }
            eventlog(99735, `page without title: ${String(page).split('#')[0]}`);
        }

        metaRobots = document.createElement('meta');
        metaRobots.name = 'robots';
        metaRobots.content = 'noindex';
        document.head.appendChild(metaRobots);
    };

    var setMeta = function(attr, val, content) {
        var meta = document.head.querySelector('meta[' + attr + '="' + val + '"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attr, val);
            document.head.appendChild(meta);
        }
        meta.content = content;
    };

    var insertOgTwitterMetas = function(title, desc, url, image) {
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', url);
        setMeta('property', 'og:image', image);
        // ----- Twitter
        var meta = document.head.querySelector('meta[property="twitter:card"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', 'twitter:card');
            meta.content = 'summary';
            document.head.appendChild(meta);
        }
        setMeta('property', 'twitter:title', title);
        setMeta('property', 'twitter:description', desc);
        setMeta('property', 'twitter:url', url);
        setMeta('property', 'twitter:image', image);
    };

    var addCanonical = function(link) {
        if (lang && lang !== 'en') {
            link += `/lang_${lang}`;
        }
        var canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('href', link);
        document.head.appendChild(canonical);
    };

    var ucFirst = function(s) {
        s = String(s || '');
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    /* eslint-disable complexity */
    this.addStrucuturedData = function(type, data) {

        if (!type || !data) {
            return;
        }

        var supportedTypes = ['Product', 'SoftwareApplication', 'FAQPage', 'NewsArticle', 'Organization'];
        if (supportedTypes.indexOf(type) === -1) {
            return;
        }

        if (
            !(type === 'Product' && data.offers && data.description && data.name) &&
            !(type === 'SoftwareApplication' && data.offers && data.operatingSystem && data.name) &&
            !(type === 'FAQPage' && data.mainEntity && Object.keys(data.mainEntity).length) &&
            !(type === 'NewsArticle' && data.headline && data.image && data.datePublished && data.dateModified) &&
            !(type === 'Organization' && data.url && data.logo)
        ) {
            return;
        }

        var prepareMetaStruct = function() {
            var structData = document.head.querySelector('script[type="application/ld+json"]');
            if (!structData) {
                structData = document.createElement('script');
                structData.setAttribute('type', 'application/ld+json');
                document.head.appendChild(structData);
            }
            return structData;
        };

        var metaStruct = prepareMetaStruct();
        if (!metaStruct) {
            return;
        }

        var structContent = Object.create(null);
        structContent['@context'] = 'https://schema.org/';
        structContent['@type'] = type;

        if (type === 'Product') {
            structContent['name'] = data.name;
            structContent['image'] = [data.image || 'https://cms2.mega.nz/b41537c0eae056cfe5ab05902fca322b.png'];
            structContent['description'] = data.description;
            structContent['brand'] = { '@type': 'Brand', 'name': 'MEGA' };
            structContent['offers'] = {
                '@type': 'Offer',
                'url': data.offers.url || '',
                'priceCurrency': 'EUR',
                'price': data.offers.price
            };

        }
        else if (type === 'SoftwareApplication') {
            structContent['name'] = data.name;
            structContent['operatingSystem'] = data.operatingSystem;
            if (data.applicationCategory) {
                structContent['applicationCategory'] = data.applicationCategory;
            }
            structContent['offers'] = {
                '@type': 'Offer',
                'priceCurrency': 'EUR',
                'price': data.offers.price
            };
        }
        else if (type === 'FAQPage') {
            var mainE = [];
            for (var entity in data.mainEntity) {
                if (data.mainEntity[entity]) {
                    var temp = {
                        '@type': 'Question',
                        'name': entity,
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': data.mainEntity[entity]
                        }
                    };
                    mainE.push(temp);
                }
            }
            if (mainE.length) {
                structContent['mainEntity'] = mainE;
            }
            else {
                document.head.removeChild(metaStruct);
                return;
            }
        }
        else if (type === 'NewsArticle') {
            structContent['headline'] = data.headline;
            structContent['image'] = [data.image];
            structContent['datePublished'] = data.datePublished;
            structContent['dateModified'] = data.dateModified;
        }
        else if (type === 'Organization') {
            structContent['url'] = data.url;
            structContent['logo'] = data.logo;
        }
        else {
            return;
        }
        metaStruct.textContent = JSON.stringify(structContent, null, 3);
    };

    this.disableBots = function() {
        var metaRobots = document.head.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            document.head.appendChild(metaRobots);
        }
        metaRobots.name = 'robots';
        metaRobots.content = 'noindex';
    };

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
        var metaCanonical = document.head.querySelector('link[rel="canonical"]');
        if (metaCanonical) {
            document.head.removeChild(metaCanonical);
        }
        var metaStruct = document.head.querySelector('script[type="application/ld+json"]');
        if (metaStruct) {
            document.head.removeChild(metaStruct);
        }

        if (page === 'bird') {
            mTags.en_title = 'MEGAbird - MEGA';
            mTags.en_desc = 'Send large files by email through MEGA';
            mTags.mega_title = l[23969] || mTags.en_title;
            mTags.mega_desc = l[20931] || mTags.en_desc;
        }
        else if (page === 'pro' || page.substr(0, 6) === 'propay') {
            mTags.en_title = 'Compare Plans and Pricing - MEGA';
            mTags.en_desc = 'Compare MEGA\'s pricing plans. Get 16% off if you purchase an annual plan. ' +
                'Start using MEGA\'s secure cloud storage and fast transfers today.';
            mTags.mega_title = l[23971] || mTags.en_title;
            mTags.mega_desc = l[23972] || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/559d084a50ad7283acb6f1c433136952.png';
        }
        else if (page === 'register') {
            mTags.en_title = 'Create Your Account - MEGA';
            mTags.en_desc = 'Get started with MEGA, the world\'s largest fully-featured free cloud storage and ' +
                'communications provider with secure, user-controlled end-to-end encryption.';
            mTags.mega_title = l[23973] || mTags.en_title;
            mTags.mega_desc = l[23974] || mTags.en_desc;
        }
        else if (page === 'login') {
            mTags.en_title = 'Login - MEGA';
            mTags.en_desc = 'Log in to your MEGA account. Access the world\'s most trusted, protected cloud storage.';
            mTags.mega_title = l[23975] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_login || mTags.en_desc;
        }
        else if (page === 'recovery') {
            mTags.en_title = 'Recovery - MEGA';
            mTags.en_desc = 'Forgot your MEGA password? Start your recovery process here.';
            mTags.mega_title = l[23976] || mTags.en_title;
            mTags.mega_desc = l[23977] || mTags.en_desc;
        }
        else if (page === 'disputenotice') {
            mTags.en_title = 'Copyright Counter-Notification - MEGA';
            mTags.en_desc = 'Copyright Counter-Notification';
            mTags.mega_title = l[23987] || mTags.en_title;
            mTags.mega_desc = l[8789] || mTags.en_desc;
        }
        else if (page === 'registerb') {
            mTags.en_title = 'Business Account - MEGA';
            mTags.en_desc = 'With our user-controlled end-to-end encryption, your data and communications have never ' +
                'been safer. MEGA is the secure solution for your business.';
            mTags.mega_title = l[24012] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_registerb || mTags.en_desc;
        }
        else if (page === 'cookie') {
            mTags.mega_title = 'Cookie Policy - MEGA';
            mTags.mega_desc = 'Our Cookie Policy explains what types of cookies we use ' +
                'and what we do with the information we collect.';
        }
        else if (typeof Object(window.dlmanager).isStreaming === 'object') {
            mTags.mega_title = dlmanager.isStreaming._megaNode.name + ' - MEGA';
            mTags.dynamic = true;
        }
        else if (page === 'recoveryparkchangepass') {
            mTags.mega_title = 'Park Change Password - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'recoverykeychangepass') {
            mTags.mega_title = 'Key Change Password - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'recoveryenterkey') {
            mTags.mega_title = 'Recovery Key - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'recoverybypark') {
            mTags.mega_title = 'Park Recovery - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'recoverybykey') {
            mTags.mega_title = 'Recover by Key - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'wiretransfer') {
            mTags.mega_title = 'Wire Transfer - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'twofactor') {
            mTags.mega_title = 'Two Factor - MEGA';
            stopBots(metaRobots);
        }
        else if (page.substr(0, 11) === 'emailverify') {
            mTags.mega_title = 'Email Verify - MEGA';
            mTags.mega_desc = 'Email verification';
            stopBots(metaRobots, true);
        }
        else if (page === 'businessinvite') {
            mTags.mega_title = 'Business Invite - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'businesssignup') {
            mTags.mega_title = 'Business Signup - MEGA';
            stopBots(metaRobots);
        }
        else if (page === 'achievements') {
            mTags.en_title = 'Achievements - MEGA';
            mTags.en_desc = 'Free additional cloud storage - 5 GB per achievement, valid for 365 days.';
            mTags.mega_title = l.achievement_meta_title || mTags.en_title;
            mTags.mega_desc = l.achievement_meta_desc || mTags.en_desc;
        }
        else if (page === 'support') {
            mTags.en_title = 'Support - MEGA';
            mTags.en_desc = 'Get support';
            mTags.mega_title = l.support_meta_tag || mTags.en_title;
            mTags.mega_desc = l[516] || mTags.en_desc;
        }
        else if (page.startsWith('special')) {
            mTags.mega_title = 'Special - MEGA';
            mTags.mega_desc = 'MEGA\'s Special Page';

            if (page.endsWith('/pro')) {
                mTags.mega_title = 'Special - PRO - MEGA';
            }
            else if (page.endsWith('/business')) {
                mTags.mega_title = 'Special - Business - MEGA';
            }

            stopBots(metaRobots);
        }
        else if (page && (mTags.excluded = isPageExcluded(page))) {
            mTags.mega_title = page.charAt(0).toUpperCase() + page.slice(1) + ' - MEGA';
            stopBots(metaRobots);
        }
        else {
            mTags.mega_title = 'MEGA';
            stopBots(metaRobots);
        }
        if (!mTags.mega_desc) {
            mTags.mega_desc = l[24023] || mega.whoami;
            if (!isPageExcluded(page) && !is_fm() && !is_extension) {
                if (d) {
                    console.error('A page without Description. Please handle. Page: ' + page);
                }
                eventlog(99736, `page without desc: ${String(page).split('#')[0]}`);
            }
        }

        mTags.image = mTags.image || 'https://cms2.mega.nz/b41537c0eae056cfe5ab05902fca322b.png';
        insertOgTwitterMetas(
            mTags.mega_title,
            mTags.mega_desc,
            getBaseUrl() + (page && page !== 'start' ? '/' + page : ''),
            mTags.image
        );

        mTags.page = page;
        this.lastSetMetaTags = mTags;

        return mTags;
    };
    /* eslint-enable complexity */

    this.checkPageMatchesURL = function() {
        if (page !== (getCleanSitePath() || 'start')) {
            var metaRobots = document.head.querySelector('meta[name="robots"]');
            if (!metaRobots) {
                stopBots(metaRobots);
            }
        }
    };
};
