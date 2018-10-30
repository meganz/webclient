<?php

define('DIR', substr(__DIR__, 0, strlen(__DIR__) - strlen(basename(__DIR__))));

$excludedFolders=array(DIR . 'js' . DIRECTORY_SEPARATOR . 'vendor');

function dirToArray($dir) {
    $result = array();

    $cdir = scandir($dir);
    foreach ($cdir as $key => $value) {
        if (!in_array($value,array(".",".."))) {
            $f = $dir . DIRECTORY_SEPARATOR . $value;
            if (is_dir($f)) {
                if (in_array($f, $GLOBALS['excludedFolders'])) {
                    continue;
                }
                $result = array_merge($result, dirToArray($f));
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

foreach (fetchFiles("js", "*.js", "*.html", "html") as $file) {
    $content = file_get_contents($file);
    preg_match_all("@\Wl\[(\d+)\]|\[\\$(\d+)(\.dqq)?\]@", $content, $numbers);

    if (!empty($numbers[0])) {
        $ids = array_merge($ids, array_filter(array_merge($numbers[1], $numbers[2])));
    }
}

$ids = array_merge($ids, $speical_ids);
$ids = array_unique($ids);
asort($ids);
echo base64_encode(implode(",", $ids));
