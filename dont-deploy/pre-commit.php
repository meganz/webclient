#!/usr/bin/env php
<?PHP
define("BASEDIR", realpath(dirname(__FILE__)."/../"));

$FAILED = 0;

function fail($msg) {
    global $FAILED;

    $FAILED++;
    echo $msg."\n";
}

function check_for_utf8_files($dir) {
    $r = 0;
    $out = shell_exec("pcregrep -I --recursion-limit=1 --color='always' --buffer-size=1024000 -M -n \"[\x80-\xFF]\" ".escapeshellarg($dir)."/*");

    //$out = system("file -i ".escapeshellarg($dir)."/*|grep utf");
    if(strlen($out) > 0) {
        fail("Found utf-8 characters in:".str_replace("\n/", "\n\t-> /", "\n".$out));
    }
}



function recurse_dirs($root, $cb) {

    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST,
        RecursiveIteratorIterator::CATCH_GET_CHILD // Ignore "Permission denied"
    );



    foreach ($iter as $path => $dir) {
        if ($dir->isDir()) {
            if(strpos($dir, "/.") !== false) {
                continue;
            }
            if(strpos($dir, "/__") !== false) {
                continue;
            }
            if(strpos($dir, "/test") !== false) {
                continue;
            }
            if(strpos($dir, "/docs") !== false) {
                continue;
            }
            if(strpos($dir, "/dont-deploy") !== false) {
                continue;
            }
            if(strpos($dir, "/node_modules") !== false) {
                continue;
            }
            $cb($path);
        }
    }
}

recurse_dirs(BASEDIR, function($d) {
    check_for_utf8_files($d);
});



if($FAILED > 0) {
    echo "Failed with: ".$FAILED." errors.\n";
    exit -1;
}