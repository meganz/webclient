<?php

$settingsPath = __DIR__ . '/../sitemap-pages.json';
$outputPath = __DIR__ . '/../sitemap.xml';
$langDir = __DIR__ . '/../lang';

if (!file_exists($settingsPath)) {
    echo "sitemap-pages.json does not exist." . PHP_EOL;
    exit(1);
}

// Load in the sitemap specification.
try {
    $userConfig = json_decode(file_get_contents($settingsPath), true);
    if (json_last_error()) {
        throw new Exception(json_last_error_msg());
    }

    $settings = array_merge([
        "root" => "https://mega.nz/",
        "languages" => [],
        "pages" => []
    ], $userConfig);

    $root = $settings['root'];
    $languages = $settings['languages'];
    $pages = $settings['pages'];
} catch (Exception $e) {
    echo "Failed to open sitemap-pages.json.(" . $e->getMessage() . ")" . PHP_EOL;
    exit(1);
}

// Prepare array of languages which are supported.
foreach (glob($langDir . '/*.json') as $langFile) {
    $lang = str_replace('_prod', '', basename($langFile, '.json'));
    if (strlen($lang) === 2 && !in_array($lang, $languages)) {
        $languages[] = $lang;
    }
}
sort($languages);
echo "Languages: " . implode(', ', $languages) . PHP_EOL;

// Prepare sitemap.
$map = simplexml_load_string(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
    http://www.w3.org/1999/xhtml http://www.w3.org/2002/08/xhtml/xhtml1-strict.xsd"
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"/>'
);

// Encode a value for XML
$encode = function($value) {
    static $mappings = [
        '&'  => '&amp;',
        '\'' => '&apos;',
        '"'  => '&quot;',
        '>'  => '&gt;',
        '<'  => '&lt;'
    ];

    foreach ($mappings as $char => $replacement) {
        $value = str_replace($char, $replacement, $value);
    }
    return $value;
};

// Add URL to sitemap helper.
$addURL = function($uris = []) use ($languages, $root, $pages, $map, $encode) {
    if (count($uris) > 0) {
        $urlNode = $map->addChild('url');
        foreach ($uris as $index => $uri) {
            $url = $root . $uri;
            echo "Adding URL: " . $url . PHP_EOL;
            if ($index === 0) {
                $urlNode->addChild('loc', $encode($url));
            }
            foreach ($languages as $lang) {
                $langNode = $urlNode->addChild('xhtml:xhtml:link');
                $langNode->addAttribute('rel', 'alternative');
                $langNode->addAttribute('hreflang', $encode($lang));
                $langNode->addAttribute('href', $encode($url . '?' . $lang));
            }
        }
    }
};

// Add the root URL.
$addURL(['']);

// Add pages.
foreach ($pages as $links) {
    $addURL($links);
}

// Export sitemap to file.
$domDocument = dom_import_simplexml($map)->ownerDocument;
$domDocument->formatOutput = true;
$domDocument->save($outputPath);
echo "Done" . PHP_EOL;
