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
            'discount', 'download', 'emailverify', 'key', 'megadrop', 'payment', 'recover',
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
            api_req({ a: 'log', e: 99735, m: 'page without title: ' + page });
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

        if (page === 'refer') {
            mTags.en_title = 'MEGA Referral Program - MEGA';
            mTags.en_desc = 'Refer your contacts to MEGA and earn 20 percent commission for each paid plan sign up.';
            mTags.mega_title = l[23963] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_refer || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/07834c8d2b3b05bc352966fe02fe597b.png';
        }
        else if (page === 'mobile' || page === 'android' || page === 'ios') {
            mTags.en_title = 'Cloud Storage at Your Fingertips - MEGA Mobile Apps - MEGA';
            mTags.en_desc = 'Download the MEGA app to securely upload, access and stream your files across your ' +
                'devices, or communicate with our end-to-end encrypted chat.';
            mTags.mega_title = l[23965] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_mobile || mTags.en_desc;
            if (page !== 'mobile') {
                addCanonical(getBaseUrl() + '/mobile');
            }
        }
        else if (page === 'nas') {
            mTags.en_title = 'Network Attached Storage (NAS) - MEGA';
            mTags.en_desc = 'Access your MEGA account directly on your QNAP and Synology Network Attached Storage' +
                ' (NAS) with our MEGA CMD tool.';
            mTags.mega_title = l[23966] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_nas || mTags.en_desc;
        }
        else if (page === 'desktop') {
            mTags.en_title = 'Desktop App - MEGA';
            mTags.en_desc = 'Our MEGA Desktop App allows you to easily automate synchronisation between your ' +
                'computer and your MEGA Cloud Storage. Available for macOS, Windows, and Linux.';
            mTags.mega_title = l[23967] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_sync || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/0723d3ca8f856c90f39480c66b4f2646.png';
        }
        else if (page === 'extensions' || page === 'chrome' || page === 'firefox' || page === 'edge') {
            mTags.en_title = 'Improve Performance and Security - Browser Extensions - MEGA';
            mTags.en_desc = 'Install the MEGA extension for your browser to reduce load times, improve performance' +
                ' and strengthen security.';
            mTags.mega_title = l[23968] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_extensions || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/b9a5ee1bd8935e2eb8659b1b7b87f0ae.png';
            if (page !== 'extensions') {
                addCanonical(getBaseUrl() + '/extensions');
            }
        }
        else if (page === 'bird') {
            mTags.en_title = 'MEGAbird - MEGA';
            mTags.en_desc = 'Send large files by email through MEGA';
            mTags.mega_title = l[23969] || mTags.en_title;
            mTags.mega_desc = l[20931] || mTags.en_desc;
        }
        else if (page === 'cmd') {
            mTags.en_title = 'Unleash MEGA\'s Full Potential with MEGA CMD - MEGA';
            mTags.en_desc = 'System administrators can automate MEGA account access by integrating scripts with ' +
                'the MEGA CMD tool.';
            mTags.mega_title = l[23970] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_cmd || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/75bc1e26149f8962b723a42205434feb.png';
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
        else if (page === 'terms') {
            mTags.en_title = 'Terms of Service - MEGA';
            mTags.en_desc = 'Please read our Terms of Service that cover how you may access our services, website ' +
                'domains, and client software.';
            mTags.mega_title = l[23978] || mTags.en_title;
            mTags.mega_desc = l[23979] || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/4548c0ab90a611b8b7c5a940811e23b5975b4ba8.png';
        }
        else if (page === 'dispute') {
            mTags.en_title = 'For Copyright Claims and Disputes - MEGA';
            mTags.en_desc = 'If you believe that access to a file you have uploaded has been wrongly disabled, ' +
                'please file a counter-notice.';
            mTags.mega_title = l[24967] || mTags.en_title;
            mTags.mega_desc = l[24968] || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/4548c0ab90a611b8b7c5a940811e23b5975b4ba8.png';
        }
        else if (page === 'privacy' || page === 'gdpr') {
            mTags.en_title = 'Privacy and Data Policy - GDPR - MEGA';
            mTags.en_desc = 'MEGA takes privacy very seriously. We are committed to ensuring continued compliance ' +
                'with data protection regulations including GDPR.';
            mTags.mega_title = l[23980] || mTags.en_title;
            mTags.mega_desc = l[23981] || mTags.en_desc;
            if (page !== 'privacy') {
                addCanonical(getBaseUrl() + '/privacy');
            }
        }
        else if (page === 'copyright') {
            mTags.en_title = 'Copyright - MEGA';
            mTags.en_desc = 'We respect copyright and require that users of our services comply with applicable' +
                ' intellectual property laws. Learn more or submit a notice here.';
            mTags.mega_title = l[23983] || mTags.en_title;
            mTags.mega_desc = l[23984] || mTags.en_desc;
        }
        else if (page === 'copyrightnotice') {
            mTags.en_title = 'Copyright Notice - MEGA';
            mTags.en_desc = 'Copyright. Notice of Alleged Infringement "Notice" submit';
            mTags.mega_title = l[23985] || mTags.en_title;
            mTags.mega_desc = l[23986] || mTags.en_desc;
        }
        else if (page === 'disputenotice') {
            mTags.en_title = 'Copyright Counter-Notification - MEGA';
            mTags.en_desc = 'Copyright Counter-Notification';
            mTags.mega_title = l[23987] || mTags.en_title;
            mTags.mega_desc = l[8789] || mTags.en_desc;
        }
        else if (page === 'takedown') {
            mTags.en_title = 'Takedown Guidance Policy - MEGA';
            mTags.en_desc = 'MEGA Takedown Policy. Guidance on requesting user information or "takedown" of' +
                ' user data.';
            mTags.mega_title = l[23988] || mTags.en_title;
            mTags.mega_desc = l[23989] || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/c449150b27444c9cc8eb3cad8ab02319744dd61d.png';
        }
        else if (page === 'cookie') {
            mTags.en_title = 'Cookie Policy - MEGA';
            mTags.en_desc = 'We value your privacy. Learn about the necessary data MEGA collects through cookies ' +
                'and similar technologies.';
            mTags.mega_title = l[24639] || mTags.en_title;
            mTags.mega_desc = l[24640] || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/e5cebb274552eb5e5408db5e834d5ff3ec8c66ef.png'
        }
        else if (page === 'contact') {
            mTags.en_title = 'Contact Us - MEGA';
            mTags.en_desc = 'Need help with your account or want to report an issue? Contact our support staff.';
            mTags.mega_title = l[23990] || mTags.en_title;
            mTags.mega_desc = l[23991] || mTags.en_desc;
        }
        else if (page === 'resellers') {
            mTags.en_title = 'Resellers - MEGA';
            mTags.en_desc = 'Conveniently purchase a MEGA Pro membership from one of our authorised resellers: ' +
                'CloudBasedBackup, 6Media, Pay.mobi or VoucherReseller';
            mTags.mega_title = l[23992] || mTags.en_title;
            mTags.mega_desc = l[23993] || mTags.en_desc;
            stopBots(metaRobots);
        }
        else if (page === 'securechat') {
            mTags.en_title = 'Private and Secure Communication - MEGA';
            mTags.en_desc = 'Exchange messages, share your files and have audio and/or video calls with MEGA\'s ' +
                'end-to-end encrypted chat.';
            mTags.mega_title = l[24608] || mTags.en_title;
            mTags.mega_desc = l[24611] || mTags.en_desc;
        }
        else if (page === 'storage') {
            mTags.en_title = 'Secure Cloud Storage and Fast Transfers - MEGA';
            mTags.en_desc = 'Work remotely and never run out of storage. With MEGA, you\'ll have access to one of ' +
                'the most generous and secure cloud storage services currently available.';
            mTags.mega_title = l[24606] || mTags.en_title;
            mTags.mega_desc = l[24609] || mTags.en_desc;
        }
        else if (page === 'collaboration') {
            mTags.en_title = 'Work From Anywhere and Stay Connected - MEGA';
            mTags.en_desc = 'Securely store files, stay in contact and collaborate in one easy place with MEGA.';
            mTags.mega_title = l[24607] || mTags.en_title;
            mTags.mega_desc = l[24610] || mTags.en_desc;
        }
        else if (page === 'security') {
            mTags.en_title = 'Security and Why It Matters - MEGA';
            mTags.en_desc = 'Your files and chats are end-to-end encrypted with keys controlled by you and ' +
                'nobody else.';
            mTags.mega_title = l[23994] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_security || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/c964ddb7dd27f1acd727747862787486.png';
        }
        else if (page === 'objectstorage') {
            mTags.en_title = 'S4 Object Storage Beta Registration - MEGA';
            mTags.en_desc = 'MEGA\'s S4 beta program starts soon, for a limited number of participants. ' +
                'Sign up to become a beta tester and get &#8364 1,000 worth of storage for free.';
            mTags.mega_title = l.ri_s4_metatag_title || mTags.en_title;
            mTags.mega_desc = l.ri_s4_metatag_desc || mTags.en_desc;
        }
        else if (page === 'security/bug-bounty') {
            mTags.en_title = 'We Welcome Security And Bug Reports - MEGA';
            mTags.en_desc = 'Earn Bounties For Finding Bugs And Other Issues At MEGA';
            mTags.mega_title = l.mtags_title_security_bugbounty || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_security_bugbounty || mTags.en_desc;
        }
        else if (page === 'dev' || page === 'developers') {
            mTags.en_title = 'Documentation for Developers - MEGA';
            mTags.en_desc = 'Check out the MEGA C++ client access engine with full documentation including ' +
                'integration guides, data structures and more.';
            mTags.mega_title = l[23996] || mTags.en_title;
            mTags.mega_desc = l[23997] || mTags.en_desc;
            if (page === 'dev') {
                addCanonical(getBaseUrl() + '/developers');
            }
        }
        else if (page === 'doc') {
            mTags.en_title = 'Software Developer Documentation - MEGA';
            mTags.en_desc = 'MEGA provides an API accessible with our software development kit (SDK), with a ' +
                'full library of developer documentation.';
            mTags.mega_title = l[23998] || mTags.en_title;
            mTags.mega_desc = l[23999] || mTags.en_desc;
        }
        else if (page === 'sdk') {
            mTags.en_title = 'SDK - MEGA';
            mTags.en_desc =
                'MEGA SDK for C++, providing essential abstraction to your application\'s secure cloud storage access.';
            mTags.mega_title = l[24000] || mTags.en_title;
            mTags.mega_desc = l[24001] || mTags.en_desc;
        }
        else if (page === 'sdkterms') {
            mTags.en_title = 'SDK Terms and Conditions - Developers - MEGA';
            mTags.en_desc = 'Check MEGA\'s Terms of Service and Privacy Policy for our API and SDK.';
            mTags.mega_title = l[24002] || mTags.en_title;
            mTags.mega_desc = l[24003] || mTags.en_desc;
        }
        else if (page === 'about/main' || page === 'about') {
            mTags.en_title = 'About Us - Encrypted Cloud Storage - MEGA';
            mTags.en_desc = 'MEGA launched in 2013 as the world\'s first zero-knowledge, easy to use cloud ' +
                'storage provider with user-controlled end-to-end encryption.';
            mTags.mega_title = l[24004] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_about || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/0fcca13fc3baaf74cd6bdc51850c19c3.png';
            if (page === 'about/main') {
                addCanonical(getBaseUrl() + '/about');
            }
            this.addStrucuturedData('Organization', {
                url: getBaseUrl(),
                logo: 'https://cms2.mega.nz/b41537c0eae056cfe5ab05902fca322b.png',
            });
        }
        else if (page === 'about/jobs') {
            mTags.en_title = 'Career Opportunities - MEGA';
            mTags.en_desc = 'Join the world\'s largest fully-featured cloud storage and privacy company. Check out' +
                ' our latest job listings and apply today.';
            mTags.mega_title = l[24005] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_about_jobs || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/659cd40a308f29a025c2d3b42944a0c9.png';
        }
        else if (page === 'about/privacy') {
            mTags.en_title = 'About MEGA and Our End-to-End Encrypted Cloud Storage - MEGA';
            mTags.en_desc = 'MEGA is the world\'s leading fully-featured end-to-end encrypted cloud storage provider.' +
                ' We strive to offer the highest levels of privacy possible.';
            mTags.mega_title = l[24006] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_about_priv || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/753f59a51ed56feda0644a1be74c1671.png';
        }
        else if (page === 'about/reliability') {
            mTags.en_title = 'How Reliable is MEGA\'s End-to-End Encrypted Storage? - MEGA';
            mTags.en_desc = 'MEGA\'s CloudRAID technology means files are split into equal-sized parts and stored' +
                ' in different countries for additional service robustness.';
            mTags.mega_title = l[24007] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_about_rel || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/f1d60e5822b4d755de9be2d0441b9a3b.png';
        }
        else if (page === 'sourcecode') {
            mTags.en_title = 'Transparency and Public Source Code - MEGA';
            mTags.en_desc = 'We publish the full source code for our client apps and welcome independent ' +
                'verification and integrity checks.';
            mTags.mega_title = l[24008] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_srccode || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/147ddec6fa35a6084030513d1ccd2eed.png';
        }
        else if (page === 'credits') {
            mTags.en_title = 'What Powers MEGA? - Credits - MEGA';
            mTags.en_desc = 'MEGA would like to thank the authors of the following open source components that ' +
                'have contributed to the functionality of our site.';
            mTags.mega_title = l[24009] || mTags.en_title;
            mTags.mega_desc = l[24010] || mTags.en_desc;
        }
        else if (page === 'business') {
            mTags.en_title = 'The Secure Cloud Storage Solution for Your Business - MEGA';
            mTags.en_desc = 'Massive storage, secure sharing across devices and 24/7 support make MEGA Business ' +
                'the obvious choice for your team.';
            mTags.mega_title = l[24011] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_business || mTags.en_desc;
            mTags.image = 'https://cms2.mega.nz/730b119f030d91dacb5dc349726e6c17.png';
        }
        else if (page === 'registerb') {
            mTags.en_title = 'Business Account - MEGA';
            mTags.en_desc = 'With our user-controlled end-to-end encryption, your data and communications have never ' +
                'been safer. MEGA is the secure solution for your business.';
            mTags.mega_title = l[24012] || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_registerb || mTags.en_desc;
        }
        else if (page === 'corporate' || page === 'corporate/media') {
            mTags.en_title = 'Media Assets - MEGA';
            mTags.en_desc = 'Are you a journalist or technology reviewer? Download our MEGA media resources or ' +
                'contact us for enquiries.';
            mTags.mega_title = l[24015] || mTags.en_title;
            mTags.mega_desc = l[24089] || mTags.en_desc;
            if (page === 'corporate') {
                addCanonical(getBaseUrl() + '/corporate/media');
            }
        }
        else if (page === 'corporate/reviews') {
            mTags.en_title = 'Reviews - MEGA';
            mTags.en_desc = 'MEGA is the largest secure, fully-featured cloud storage provider in the world. ' +
                'Check out some of our top reviews and product comparisons.';
            mTags.mega_title = l[24086] || mTags.en_title;
            mTags.mega_desc = l[24087] || mTags.en_desc;
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
        else if (page === 'help') {
            mTags.en_title = 'Help - MEGA';
            mTags.en_desc = 'MEGA\'s Help Centre';
            mTags.mega_title = l[24021] || mTags.en_title;
            mTags.mega_desc = l[24022] || mTags.en_desc;
        }
        else if (page.substr(0, 11) === 'help/search') {
            var term = ucFirst(page.substr(12)).replace(/\+/g, ' ');
            mTags.en_title = term + ' - Search Help - MEGA';
            mTags.en_desc = 'MEGA\'s Search - Help Centre - ' + term;
            mTags.mega_title = l[24033].replace('$1', term).replace('$2', l[102]);
            mTags.mega_desc = l[24034].replace('$1', l[102]).replace('$2', term);
            mTags.section = 'help';
        }
        else if (page.indexOf('help/') > -1 && page.length > 5) {
            var linkParts = page.split('/');
            if (linkParts.length <= 2 || linkParts.length > 4) {
                stopBots(metaRobots);
            }
            else if (linkParts.length === 3) {
                var sectionTitle = (linkParts[2].charAt(0).toUpperCase() + linkParts[2].slice(1)).replace(/-/g, ' ');
                mTags.en_title = sectionTitle + ' Help - MEGA';
                mTags.en_desc = 'MEGA\'s ' + sectionTitle + ' Help Centre';
                mTags.mega_title = (l[24027] ? l[24027].replace('$1', sectionTitle) : '') || mTags.en_title;
                mTags.mega_desc = (l[24028] ? l[24028].replace('$1', sectionTitle) : '') || mTags.en_desc;
            }
            else if (linkParts.length === 4) {
                var secTitle = (linkParts[2].charAt(0).toUpperCase() + linkParts[2].slice(1)).replace(/-/g, ' ');
                var articleTitle = linkParts[3].charAt(0).toUpperCase() + linkParts[3].slice(1);
                var hashPos = articleTitle.lastIndexOf('#');
                if (hashPos > 0) {
                    articleTitle = articleTitle.substring(0, hashPos);
                }
                articleTitle = articleTitle.replace(/-/g, ' ');
                mTags.en_title = articleTitle + ' - ' + secTitle + ' Help - MEGA';
                mTags.en_desc = 'MEGA\'s ' + secTitle + ' - Help Centre - ' + articleTitle;
                mTags.mega_title = (l[24033] ? l[24033].replace('$1', articleTitle).replace('$2', secTitle) : '') ||
                    mTags.en_title;
                mTags.mega_desc = (l[24034] ? l[24034].replace('$1', secTitle).replace('$2', articleTitle) : '') ||
                    mTags.en_desc;
            }
            else {
                stopBots(metaRobots);
            }

            mTags.section = 'help';
        }
        else if (page === 'start') {
            mTags.en_title = 'The Most Trusted, Best-Protected Cloud Storage - MEGA';
            mTags.en_desc = 'MEGA understands the importance of keeping data and conversations private. We provide ' +
                'a fantastic user experience that protects users\' right to privacy.';
            mTags.mega_title = l.mtags_title_start || mTags.en_title;
            mTags.mega_desc = l.mtags_desc_start || mTags.en_desc;
            if (getCleanSitePath().substr(0, 5) === 'start') {
                addCanonical(getBaseUrl());
            }
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
                api_req({ a: 'log', e: 99736, m: 'page without desc: ' + page });
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
