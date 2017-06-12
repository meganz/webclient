<?php

define('DIR', substr(__DIR__, 0, strlen(__DIR__) - strlen(basename(__DIR__))));

function dirToArray($dir) {
    $result = array();

    $cdir = scandir($dir);
    foreach ($cdir as $key => $value) {
        if (!in_array($value,array(".",".."))) {
            if (is_dir($dir . DIRECTORY_SEPARATOR . $value)) {
                $result = array_merge($result, dirToArray($dir . DIRECTORY_SEPARATOR . $value));
            } else {
                $result[] = $dir . '/' . $value;
            }
        }
    }

    return $result;
}

function fetchFiles() {
    $fileList = [];
    foreach (func_get_args() as $file) {
        $file = DIR . $file;

        if (is_dir($file)) {
            $fileList[] = dirToArray($file);
        } else {
            $fileList[] = glob($file);
        }
    }

    return call_user_func_array('array_merge', $fileList);
}

$ids = array();
$speical_ids = array('5875', '5876', '1626', '1086', '1088', '1929', '955', '1930');

foreach (fetchFiles("js/", "*.js", "*.html", "html/") as $file) {
    $content = file_get_contents($file);
    preg_match_all("@\Wl\[(\d+)\]|\[\\$(\d+)\]@", $content, $numbers);

    if (!empty($numbers[0])) {
        $ids = array_merge($ids, array_filter(array_merge($numbers[1], $numbers[2])));
    }
}

$ids = array_merge($ids, $speical_ids);
$ids = array_unique($ids);
asort($ids);
echo base64_encode(implode(",", $ids));
