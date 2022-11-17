const pages = [
    "", // empty page to represent the root
    "start",
    "business",
    "mobile",
    "sync",
    "cmd",
    "extensions", "chrome", "firefox", "edge",
    "nas",
    "developers",
    "about",
    "pro",
    "corporate/media",
    "corporate/reviews",
    "contact",
    "storage",
    "megabackup",
    "collaboration",
    "securechat",
    "security",
    "credits",
    "terms",
    "privacy",
    "copyright",
    "takedown",
    "sourcecode",
    "sdk",
    "doc",
    "refer",
    "about/reliability",
    "about/privacy",
    "about/jobs",
    "achievements",
    "registerb",
    "register",
    "login",
    "cookie",
    "dispute",
    "sdkterms",
    "objectstorage"
];
/** lang [lang-code-in-webclient, ISO-639-1 lang code which search engines understand] */
const langs = [
    ["ar", "ar"],
    ["br", "pt"],
    ["br", "pt-BR"],
    ["cn", "zh"],
    ["cn", "zh-CN"],
    ["ct", "zh-HK"],
    ["ct", "zh-SG"],
    ["ct", "zh-TW"],
    ["de", "de"],
    ["", "en"],
    ["es", "es"],
    ["fr", "fr"],
    ["id", "id"],
    ["it", "it"],
    ["jp", "ja"],
    ["kr", "ko"],
    ["nl", "nl"],
    ["pl", "pl"],
    ["ro", "ro"],
    ["ru", "ru"],
    ["th", "th"],
    ["vi", "vi"],
];
const pageModDate = {
  // if we want to set a specific modification date to a page, then we add a property to this object.
  // example entry
  // 'pro' : '2021-01-18'
};
const genericModDate = '2021-01-06';

console.log('Starting sitemap generator V2 ........');

const domain = "https://mega.io";
const domain2 = "https://mega.nz";
const domainSitemapName = 'mega_sitemap.xml';
const domain2SitemapName = 'sitemap.xml';

let sitemap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
    "<urlset xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\" xsi:schemaLocation=\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd     http://www.w3.org/1999/xhtml http://www.w3.org/2002/08/xhtml/xhtml1-strict.xsd\">\r\n";

// start with no lang trailing, we want this at top.
for (let k = 0; k < pages.length; k++) {
    let pageURL = domain + (pages[k] ? '/' + pages[k] : '');
    let loc = `<url>\r\n <loc>${pageURL}</loc>\r\n`;
    //loc += '<lastmod>2021-02-20</lastmod>\r\n';
    loc += `<lastmod>${pageModDate[pages[k]] || genericModDate}</lastmod>\r\n`;
    for (let h = 0; h < langs.length; h++){
        loc += addLink(langs[h][1], pageURL + (langs[h][0] ? '/lang_' + langs[h][0] : ''));
    }
    loc += addLink('x-default', pageURL);
    loc += '</url>\r\n';
    sitemap += loc;
    console.log(`Page ${pageURL} added \u2713`);
}
console.log('Finished adding no-langs URLs.');
console.log('Starting langs URLs ..........');

// rest languages, skipping English
for (let a = 0; a < langs.length; a++){
    if (langs[a][0]) {
        for (let l = 0; l < pages.length; l++) {
            let pageURL = domain + (pages[l] ? '/' + pages[l] : '');
            let locURL = `${pageURL}/lang_${langs[a][0]}`;
            let loc = `<url>\r\n <loc>${locURL}</loc>\r\n`;
            // loc += '<lastmod>2021-02-20</lastmod>\r\n';
            loc += `<lastmod>${pageModDate[pages[l]] || genericModDate}</lastmod>\r\n`;
            for (let e = 0; e < langs.length; e++) {
                loc += addLink(langs[e][1], pageURL + (langs[e][0] ? '/lang_' + langs[e][0] : ''));
            }
            loc += addLink('x-default', pageURL);
            loc += '</url>\r\n';
            sitemap += loc;
            console.log(`Page ${locURL} added \u2713`);
        }
    }
}
sitemap += '</urlset>\r\n';
console.log('Finished adding langs URLs.');
const sitemap2 = sitemap.replace(/mega.io/g, 'mega.nz');

const fs = require('fs');
console.log(`Starting writing the sitemap file ${domainSitemapName} ........ `);
fs.writeFile(domainSitemapName, sitemap, err => {
    if (err) {
        return console.error(`Failed to write the sitemap ${domainSitemapName}, ... Exit!`);
    }
    console.log(`Sitemap file ${domainSitemapName} has been written successfully. \u2713`);
    console.log(`Starting writing the sitemap file ${domain2SitemapName} ........ `);
    fs.writeFile(domain2SitemapName, sitemap2, err => {
        if (err) {
            return console.error(`Failed to write the sitemap ${domain2SitemapName}, ... Exit!`);
        }
        console.log(`Sitemap file ${domain2SitemapName} has been written successfully. \u2713`);
    });
});
function addLink(lang, link) {
    return `<xhtml:link rel="alternate" hreflang="${lang}" href="${link}"/>\r\n`;
}

