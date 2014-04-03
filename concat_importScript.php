<?php

function build($path) {
    $content = file_get_contents($path);
    preg_match_all('/importScripts\\(([^\\)]+)./', $content, $matches);

    $pwd = dirname($path);
    foreach ($matches[0] as $id => $match) {
        $file = trim(trim($matches[1][$id], "'\""));
        if (!is_file($file)) {
            if (is_file($pwd . "/" . $file)) {
                throw new \RuntimeException("Cannot find file $file");
            }            
            $file = $pwd . "/" . $file;
        }
        $replace[ $match ] = file_get_contents($file);
    }

    return str_replace(array_keys($replace), array_values($replace), $content);
}

echo build($argv[1]);
