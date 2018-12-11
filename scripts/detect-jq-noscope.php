#!/usr/bin/env php
<?PHP
/**
 * After wasting 3-4h, at least 6-7 times to try to debug an issue, caused by a non-scoped jQuery selector that altered
 * something, which it shouldn't, e.g.:
 * > $('.dropdown-item').hide();
 *
 * Which, was meant to (for example) only alter .dropdown-item's in the context-menu, but it ended up altering all kind
 * of other dropdowns on the webclient.
 *
 * Obviously, this is a bug, but...a really hard to track one!
 *
 * So, I'd written this script (since I couldn't find a way to patch the diffscript.py) to check for such files, to at
 * least ease my process in the future, of finding what may be (wrongly) altering my DOM elements.
 *
 * Tip: this script would also do a blame for the matching line, so it takes some time. To speed it up, you can pass,
 * a matching string as argument, that would be matched before doing blame
 */
define("BASEDIR", realpath(dirname(__FILE__)."/../"));

$FAILED = 0;

global $argv;
$specific = false;
if (count($argv) > 1) {
	array_shift($argv);
	$specific = implode(" ", $argv);
}

function fail($msg) {
	global $FAILED;

	$FAILED++;
	echo $msg."\n";
}

function check_for_jq_noscope($dir) {
	$r = 0;

	global $specific;

	foreach(glob($dir."/*.js") + glob($dir."/*.jsx") as $f) {
		$file = file($f);


		foreach($file as $num=>$line) {
			foreach (
				[
					'/\$\(\'\.([a-z0-9\s\-\_\w\>\']+)\'\)/miu',
					'/\$\(\"\.([a-z0-9\s\-\_\w\>\"]+)\"\)/miu',
				] as $pattern
			) {

				if ( preg_match_all( $pattern, $line, $matches ) ) {
					if ( count( $matches[0] ) > 0 ) {
                        if ($specific && strpos($line, $specific) === false) {
                            continue;
                        }
//						var_dump( $matches );
						foreach ( $matches[0] as $str ) {
							$out = trim(shell_exec("git blame ".$f." -L ".($num+1).",".($num+1).""));
							if (strpos($out, "fatal:") === 0) {
							    $out = false;
							}
							fail("".$f.":".($num+1)." -=> ". ($out ? $out : trim($line)) . "");
						}
					}
				}
			}
		}
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
			if(strpos($dir, "/_tmp") !== false) {
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
			if(strpos($dir, "/vendor") !== false) {
				continue;
			}
			$cb($path);
		}
	}
}

recurse_dirs(BASEDIR, function($d) {
	check_for_jq_noscope($d);
});

echo "\n";

if($FAILED > 0) {
	echo "Failed with: ".$FAILED." errors.\n";
	exit -1;
}
else {
    echo "No matches! Everything is fine!\n";
    exit;
}
