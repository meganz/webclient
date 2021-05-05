<?php

$config = json_decode(file_get_contents(__DIR__ . "/transifex.json"), true);
$BASE_URL = $config['BASE_URL'];
$RESOURCE_ID = "o:" . $config['ORGANISATION'] . ":p:" . $config['PROJECT'] . ":r:" . $config['RESOURCE'];
$token = getenv('TRANSIFEX_TOKEN') ?: $config['TOKEN'];
$HEADER = [
    "Authorization: Bearer {$token}",
    "Content-Type: application/vnd.api+json"
];

const REMAPPED_CODE = [
    "br" => "pt",
    "jp" => "ja",
    "cn" => "zh_CN",
    "ct" => "zh_TW",
    "kr" => "ko"
];

function sanitiseString($string, $convertQuotes = false) {
    // We do not want to convert the quotes that are in between tags
    preg_match_all("#<[^sd][^>]*>#", $string, $tags);
    $tags = $tags[0];
    if (count($tags) > 0) {
        foreach ($tags as $index => $tag) {
            $string = str_replace($tag, "@@@tag{$index}@@@", $string);
        }
    }

    $quotes = [
        '#"(.+)"#',               // A. Enclosing double quotes
        "#(\W)'(.+)'#",           // B. Enclosing single quotes
        "#(\w)'#"                 // C. Remaining single quote
    ];

    $quotesTo = [
        "\u201c$1\u201d",      // A
        "$1\u2018$2\u2019",    // B
        "$1\u2019",            // C
    ];

    $replace = ["#\.\.\.#"];
    $replaceTo = ["\u2026"];

    if ($convertQuotes) {
        $replace = array_merge($replace, $quotes);
        $replaceTo = array_merge($replaceTo, $quotesTo);
    }

    $string = preg_replace($replace, $replaceTo, $string);
    if (count($tags) > 0) {
        foreach ($tags as $index => $tag) {
            $string = str_replace("@@@tag{$index}@@@", $tag, $string);
        }
    }

    // Less than / start angle bracket & greater than / end angle bracket
    $replace = ["#&lt;#", "#&gt;#"];
    $replaceTo = ["<",">"];

    return preg_replace($replace, $replaceTo, $string);
}

function sendLanguageFile($url, $payload) {
    // Send a download request
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $GLOBALS['HEADER']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = json_decode(curl_exec($ch), true);
    curl_close ($ch);
    if (isset($response['errors'])) {
        foreach ($response['errors'] as $error) {
            echo "Error " . $error['status'] . ": " . $error['detail'] . ".";
        }
        return false;
    }

    // Get the file
    $resourceLink = $response['data']['links']['self'];
    $ch = curl_init($resourceLink);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $GLOBALS['HEADER']);
    curl_setopt($ch,CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    while (true) {
        $response = json_decode(curl_exec($ch), true);
        if (isset($response['data'], $response['data']['attributes'], $response['data']['attributes']['status']) &&
            !in_array($response['data']['attributes']['status'], ["processing", "pending"])
        ) {
            break;
        } elseif (isset($response['errors'])) {
            foreach ($response['errors'] as $error) {
                echo "Error " . $error['status'] . ": " . $error['detail'] . ".";
            }
        }
    }
    curl_close ($ch);
    return true;
}

echo "Import Started\n";
// Get files from archive
$strings = [];
$archive = new PharData($argv[1]);
foreach($archive as $file) {
    $languageCode = $file->getBasename('.json');
    if (in_array($languageCode, ['warning', 'error', 'en'])) {
        continue;
    }
    $strings[$languageCode] = json_decode(file_get_contents($file->getPathName()), true);
}

$resource = [];
foreach ($strings['strings'] as $key => $value) {
    $resource[$key] = [
        "string" => sanitiseString($value["text"], true),
        "developer_comment" => html_entity_decode($value["context"])
    ];
}
unset($strings['strings']);

// Send English Resource file
$url = $GLOBALS['BASE_URL'] . "/resource_strings_async_uploads";
$payload = [
    "data" => [
        "attributes" => [
            "content" => json_encode($resource, JSON_UNESCAPED_UNICODE),
            "content_encoding" => "text",
        ],
        "relationships" => [
            "resource" => [
                "data" => [
                    "id" => $GLOBALS['RESOURCE_ID'],
                    "type" => "resources",
                ],
            ],
        ],
        "type" => "resource_strings_async_uploads",
    ],
];
echo "Resource File (en) => ";
$success = sendLanguageFile($url, $payload);
if ($success) {
    echo "Completed";
}
echo "\n";

foreach ($strings as $code => $translation) {
    $url = $GLOBALS['BASE_URL'] . "/resource_translations_async_uploads";
    $languageCode = isset(REMAPPED_CODE[$code]) ? REMAPPED_CODE[$code] : $code;
    $resource = [];
    foreach ($translation as $key => $value) {
        $resource[$key] = ["string" => sanitiseString($value)];
    }
    $payload = [
        "data" => [
            "attributes" => [
                "content" => json_encode($resource, JSON_UNESCAPED_UNICODE),
                "content_encoding" => "text",
                "file_type" => "default"
            ],
            "relationships" => [
                "language" => [
                    "data" => [
                        "id" => "l:" . $languageCode,
                        "type" => "languages",
                    ]
                ],
                "resource" => [
                    "data" => [
                        "id" => $GLOBALS['RESOURCE_ID'],
                        "type" => "resources",
                    ],
                ],
            ],
            "type" => "resource_translations_async_uploads",
        ],
    ];
    echo $code . " => ";
    $success = sendLanguageFile($url, $payload);
    if ($success) {
        echo "Completed";
    }
    echo "\n";
}
echo "Import Completed\n";
