<?php

$eng = json_decode(file_get_contents(__DIR__ . "/../lang/en.json"), true);

foreach (glob(__DIR__ . "/../html/*.html") as $file) {
    $html = file_get_contents($file);
    preg_match_all("/\[\\$([0-9]+)\]/smU", $html, $matches);
    foreach ($matches[1] as $id) {
        if (empty($eng[$id])) {
            echo "Error: cannot find string id $id in $file\n";
        }
    }
}
