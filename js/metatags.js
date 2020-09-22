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
                             'sms', 'twofactor', 'emailverify', 'confirm', 'businessinvite', 'businesssignup', 'verify',
                             'downloadapp', 'download'
        ];

        if (!page || excludedPages.indexOf(page) !== -1) {
            return true;
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
        image = image || 'https://cms2.mega.nz/b41537c0eae056cfe5ab05902fca322b.png';
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
        var canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        canonical.setAttribute('href', link);
        document.head.appendChild(canonical);
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
        var image;

        if (page === 'refer') {
            mTags.mega_title = l[23963] || 'MEGA Referral Program - MEGA';
            mTags.mega_desc = l[22712] ||
                'Earn 20% of the revenue from each purchase made by a user you have referred to MEGA';
            image = 'https://cms2.mega.nz/07834c8d2b3b05bc352966fe02fe597b.png';
        }
        else if (page === 'uwp' || page === 'wp') {
            mTags.mega_title = l[23964] || 'MEGA App for Windows 10 - MEGA';
            mTags.mega_desc = l[19663] || 'Your files, wherever you are, whenever you need them - '
                + 'across all your Windows 10 devices';
            image = 'https://cms2.mega.nz/3f16d936a620162a88f5442b3742f5e0.png';
            if (page === 'uwp') {
                addCanonical(getBaseUrl() + '/wp');
            }
        }
        else if (page === 'mobileapp' || page === 'mobile' || page === 'android' || page === 'ios') {
            mTags.mega_title = l[23965] || 'MEGA Mobile Apps - MEGA';
            mTags.mega_desc = l[19683] || 'Securely manage your files and collaborate with everyone from anywhere.';
            if (page !== 'mobile') {
                addCanonical(getBaseUrl() + '/mobile');
            }
        }
        else if (page === 'nas') {
            mTags.mega_title = l[23966] || 'MEGA on NAS - MEGA';
            mTags.mega_desc = l[23331] ||
                'A command line tool to interact with MEGA from your Network Attached Storage device.';
        }
        else if (page === 'sync') {
            mTags.mega_title = l[23967] || 'MEGA Desktop App - MEGA';
            mTags.mega_desc = l[16580] || 'Easy automated synchronisation between your computer and your MEGA cloud';
            image = 'https://cms2.mega.nz/0723d3ca8f856c90f39480c66b4f2646.png';
        }
        else if (page === 'extensions') {
            mTags.mega_title = l[23968] || 'Browser Extensions - MEGA';
            mTags.mega_desc = l[20921] || 'Reduce loading times, improve download performance, strengthen security';
            image = 'https://cms2.mega.nz/b9a5ee1bd8935e2eb8659b1b7b87f0ae.png';
        }
        else if (page === 'bird') {
            mTags.mega_title = l[23969] || 'MEGAbird - MEGA';
            mTags.mega_desc = l[20931] || 'Send large files by email through MEGA';
        }
        else if (page === 'cmd') {
            mTags.mega_title = l[23970] || 'MEGAcmd - MEGA';
            mTags.mega_desc = l[18775] || 'A command line tool to work with your MEGA account and files.';
            image = 'https://cms2.mega.nz/75bc1e26149f8962b723a42205434feb.png';
        }
        else if (page === 'pro') {
            mTags.mega_title = l[23971] || 'Plans & pricing - MEGA';
            mTags.mega_desc = l[23972] || 'Upgrade to a MEGA PRO account for additional storage and transfer quota. '
                + 'MEGA provides one of the cheapest cloud storage deals on the Internet.';
            image = 'https://cms2.mega.nz/559d084a50ad7283acb6f1c433136952.png';
        }
        else if (page === 'register') {
            mTags.mega_title = l[23973] || 'Register - MEGA';
            mTags.mega_desc = l[23974] || 'Create your MEGA account and get up to 50 GB free!';
        }
        else if (page === 'login') {
            mTags.mega_title = l[23975] || 'Login - MEGA';
            mTags.mega_desc = [1768] || 'Login to your MEGA account';
        }
        else if (page === 'recovery') {
            mTags.mega_title = l[23976] || 'Recovery - MEGA';
            mTags.mega_desc = l[23977] || 'Forgot your MEGA password? Start your recovery process here.';
        }
        else if (page === 'terms') {
            mTags.mega_title = l[23978] || 'Terms of Service - MEGA';
            mTags.mega_desc = l[23979] || 'MEGA LIMITED TERMS OF SERVICE ("TERMS")';
        }
        else if (page === 'privacy') {
            mTags.mega_title = l[23980] || 'Privacy Policy - MEGA';
            mTags.mega_desc = l[23981] || 'Mega Limited Privacy and Data Policy';
        }
        else if (page === 'gdpr') {
            mTags.mega_title = l[23982] || 'GDPR - MEGA';
            mTags.mega_desc = l[18421] || 'General Data Protection Regulation Disclosure';
        }
        else if (page === 'copyright') {
            mTags.mega_title = l[23983] || 'Copyright - MEGA';
            mTags.mega_desc = l[23984] || 'Copyright. Notice of Alleged Infringement "Notice"';
        }
        else if (page === 'copyrightnotice') {
            mTags.mega_title = l[23985] || 'Copyright Notice - MEGA';
            mTags.mega_desc = l[23986] || 'Copyright. Notice of Alleged Infringement "Notice" submit';
        }
        else if (page === 'disputenotice') {
            mTags.mega_title = l[23987] || 'Copyright Counter-Notification - MEGA';
            mTags.mega_desc = l[8789] || 'Copyright Counter-Notification';
        }
        else if (page === 'takedown') {
            mTags.mega_title = l[23988] || 'Takedown Guidance - MEGA';
            mTags.mega_desc = l[23989] || 'Guidance on Requesting User Information or "Takedown" of User Data';
        }
        else if (page === 'contact') {
            mTags.mega_title = l[23990] || 'Contact Us - MEGA';
            mTags.mega_desc = l[23991] || 'Contact MEGA';
        }
        else if (page === 'resellers') {
            mTags.mega_title = l[23992] || 'Resellers - MEGA';
            mTags.mega_desc = l[23993] || 'You can conveniently purchase your MEGA PRO membership from one of our '
                + 'authorized resellers.';
        }
        else if (page === 'security') {
            mTags.mega_title = l[23994] || 'Security - MEGA';
            mTags.mega_desc = l[20004] || 'Security and why it matters';
            image = 'https://cms2.mega.nz/c964ddb7dd27f1acd727747862787486.png';
        }
        else if (page === 'privacycompany') {
            mTags.mega_title = l[23995] || 'Privacy Company - MEGA';
            mTags.mega_desc = l[676] || 'MEGA is Cloud Storage with Powerful Always-On Privacy.';
        }
        else if (page === 'dev' || page === 'developers') {
            mTags.mega_title = l[23996] || 'MEGA Software Development Kit - MEGA';
            mTags.mega_desc = l[23997] || 'Developers - MEGA Software Development Kit';
            if (page === 'developers') {
                addCanonical(getBaseUrl() + '/dev');
            }
        }
        else if (page === 'doc') {
            mTags.mega_title = l[23998] || 'Documentation - MEGA';
            mTags.mega_desc = l[23999] || 'Developers - Documentation';
        }
        else if (page === 'sdk') {
            mTags.mega_title = l[24000] || 'SDK - MEGA';
            mTags.mega_desc = l[24001] || 'MEGA SDK for C++, providing essential abstraction to your application\'s '
                + 'secure cloud storage access.';
        }
        else if (page === 'sdkterms') {
            mTags.mega_title = l[24002] || 'SDK Terms of Service - MEGA';
            mTags.mega_desc = l[24003] || 'In addition to MEGA\'s Terms of Service and Privacy Policy, which are '
                + 'incorporated by reference into these terms, these terms apply to applications to '
                + 'use, and all subsequent use of, MEGA\'s API and SDK.';
        }
        else if (page === 'about/main' || page === 'about') {
            mTags.mega_title = l[24004] || 'About - MEGA';
            mTags.mega_desc = l[23065] || 'MEGA - The Privacy Company';
            image = 'https://cms2.mega.nz/0fcca13fc3baaf74cd6bdc51850c19c3.png';
            if (page === 'about') {
                addCanonical(getBaseUrl() + '/about/main');
            }
            this.addStrucuturedData('Organization', {
                url: getBaseUrl(),
                logo: 'https://cms2.mega.nz/b41537c0eae056cfe5ab05902fca322b.png',
            });
        }
        else if (page === 'about/jobs') {
            mTags.mega_title = l[24005] || 'Jobs - MEGA';
            mTags.mega_desc = l[23082] || 'MEGA career opportunities start right here!';
            image = 'https://cms2.mega.nz/659cd40a308f29a025c2d3b42944a0c9.png';
        }
        else if (page === 'about/privacy') {
            mTags.mega_title = l[24006] || 'Privacy - MEGA';
            mTags.mega_desc = l[23115] || 'MEGA is the Privacy Company';
            image = 'https://cms2.mega.nz/753f59a51ed56feda0644a1be74c1671.png';
        }
        else if (page === 'about/reliability') {
            mTags.mega_title = l[24007] || 'Reliability - MEGA';
            mTags.mega_desc = l[23122] || 'MEGA\'s mission is not limited to just keeping your valuable data private:'
                + ' safeguarding it is equally important to us.';
            image = 'https://cms2.mega.nz/f1d60e5822b4d755de9be2d0441b9a3b.png';
        }
        else if (page === 'sourcecode') {
            mTags.mega_title = l[24008] || 'Source Code - MEGA';
            mTags.mega_desc = l[8438] || 'Source Code Transparency';
            image = 'https://cms2.mega.nz/147ddec6fa35a6084030513d1ccd2eed.png';
        }
        else if (page === 'credits') {
            mTags.mega_title = l[24009] || 'Credits - MEGA';
            mTags.mega_desc = l[24010] || 'MEGA would like to thank the authors of the following open source '
                + 'components that contributed essential functionality to our site.';
        }
        else if (page === 'business') {
            mTags.mega_title = l[24011] || 'Business - MEGA';
            mTags.mega_desc = l[19531] || 'The secure solution for your business';
            image = 'https://cms2.mega.nz/730b119f030d91dacb5dc349726e6c17.png';
        }
        else if (page === 'registerb') {
            mTags.mega_title = l[24012] || 'Business Account - MEGA';
            mTags.mega_desc = l[19517] || 'Create Business Account';
        }
        else if (page === 'corporate') {
            mTags.mega_title = l[24013] || 'Investors - MEGA';
            mTags.mega_desc = l[24014] || 'MEGA investor relations';
            addCanonical(getBaseUrl() + '/corporate/investors');
        }
        else if (page === 'corporate/investors') {
            mTags.mega_title = l[24013] || 'Investors - MEGA';
            mTags.mega_desc = l[24014] || 'MEGA investor relations';
        }
        else if (page === 'corporate/media') {
            mTags.mega_title = l[24015] || 'Media - MEGA';
            mTags.mega_desc = l[24016] || 'MEGA corporate media';
        }
        else if (page === 'corporate/shareholder-reports') {
            mTags.mega_title = l[24017] || 'Shareholder Reports - MEGA';
            mTags.mega_desc = l[24018] || 'MEGA shareholder reports';
        }
        else if (typeof Object(window.dlmanager).isStreaming === 'object') {
            mTags.mega_title = dlmanager.isStreaming._megaNode.name + ' - MEGA';
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
        else if (page === 'blog') {
            mTags.mega_title = l[24019] || 'Blog - MEGA';
            mTags.mega_desc = l[24020] || 'MEGA\'s Blog';
            if (blogmonth || blogsearch) {
                stopBots(metaRobots, true);
            }
        }
        else if (page.substr(0, 10) === 'blogsearch') {
            mTags.mega_title = 'Blog search - MEGA';
            mTags.mega_desc = 'MEGA\'s Blog';
            stopBots(metaRobots, true);
        }
        else if (page === 'blogarticle') {
            mTags.mega_title = 'Blog article - MEGA';
            mTags.mega_desc = 'Blog article from MEGA';
            stopBots(metaRobots, true);
        }
        else if (page.substr(0, 5) === 'blog/') {
            var notSet = true;
            if (blogHeaders && blogposts) {
                var bHeader = page.substr(page.lastIndexOf('/') + 1);
                if (blogHeaders[bHeader]) {
                    var post = blogposts[blogHeaders[bHeader]];
                    mTags.mega_title = post.h + ' - MEGA';
                    mTags.mega_desc = post.introtxt;
                    notSet = false;
                }
            }
            if (notSet) {
                mTags.mega_title = 'Blog article - MEGA';
                mTags.mega_desc = 'Blog article from MEGA';
                stopBots(metaRobots, true);
            }
        }
        else if (page === 'help') {
            mTags.mega_title = l[24021] || 'Help - MEGA';
            mTags.mega_desc = l[24022] || 'MEGA\'s Help Centre';
        }
        else if (page.indexOf('help/') > -1 && page.length > 5) {
            var linkParts = page.split('/');
            if (linkParts.length <= 2 || linkParts.length > 4) {
                stopBots(metaRobots);
            }
            else if (linkParts.length === 3) {
                var sectionTitle = (linkParts[2].charAt(0).toUpperCase() + linkParts[2].slice(1)).replace(/-/g, ' ');
                mTags.mega_title = (l[24027] ? l[24027].replace('$1', sectionTitle) : '') ||
                    sectionTitle + ' Help - MEGA';
                mTags.mega_desc = (l[24028] ? l[24028].replace('$1', sectionTitle) : '') ||
                    'MEGA\'s ' + sectionTitle + ' Help Centre';
            }
            else if (linkParts.length === 4) {
                var secTitle = (linkParts[2].charAt(0).toUpperCase() + linkParts[2].slice(1)).replace(/-/g, ' ');
                var articleTitle = linkParts[3].charAt(0).toUpperCase() + linkParts[3].slice(1);
                var hashPos = articleTitle.lastIndexOf('#');
                if (hashPos > 0) {
                    articleTitle = articleTitle.substring(0, hashPos);
                }
                articleTitle = articleTitle.replace(/-/g, ' ');
                mTags.mega_title = (l[24033] ? l[24033].replace('$1', articleTitle).replace('$2', secTitle) : '') ||
                    articleTitle + ' - ' + secTitle + ' Help - MEGA';
                mTags.mega_desc = (l[24034] ? l[24034].replace('$1', secTitle).replace('$2', articleTitle) : '') ||
                    'MEGA\'s ' + secTitle + ' - Help Centre - ' + articleTitle;
            }
            else {
                stopBots(metaRobots);
            }
        }
        else if (page === 'start') {
            mTags.mega_title = 'MEGA';
            if (getCleanSitePath() === 'start') {
                addCanonical(getBaseUrl());
            }
        }
        else if (page && isPageExcluded(page)) {
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

        insertOgTwitterMetas(mTags.mega_title, mTags.mega_desc,
            getBaseUrl() + (page && page !== 'start' ? '/' + page : ''), image);

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
