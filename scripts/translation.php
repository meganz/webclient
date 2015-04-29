<?php

$eng = json_decode(file_get_contents(__DIR__ . "/../lang/en.json"), true);
$eng = array_merge($eng, array_map('strtolower', $eng));
$eng = array_flip($eng);
$new = array();

foreach (glob(__DIR__ . "/../html/*.html") as $file) {
    $html = file_get_contents($file);
    $html = preg_replace_callback("/{{([^}]+)}}/smU", function($match) use ($eng, &$new) {
        $text = preg_replace("/\W+/",  " ", $match[1]);
        $text = trim($text);
        $ltext = strtolower($text);
        if (!empty($eng[$text])) {
            return '[$' . $eng[$text]  . ']';
        }
        if (!empty($eng[$ltext])) {
            return '[$' . $eng[$ltext]  . ']';
        }

        $new[] = $text;

        return $match[0];
    }, $html);
    //file_put_contents(__DIR__  . '/' . basename($file), $html);
    file_put_contents($file, $html);
}

file_put_contents(__DIR__ . '/new.json', json_encode(array_values(array_unique($new)), JSON_PRETTY_PRINT));
