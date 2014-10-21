<?php

$pdo = new PDO('mysql:host=localhost;dbname=mega', 'root');

$stmt = $pdo->prepare("SELECT * FROM blobs WHERE hash = ?");
$stmt->execute([$_GET['id']]);
$rows = $stmt->fetchAll(PDO::FETCH_CLASS);

if (empty($rows)) {
	header("HTTP/1.0 404 Not Found");
	exit;
}

$content = $rows[0];

header("Content-Type: {$content->content_type}");
header("Content-Length: {$content->content_size}");
header("X-Mega-Authenticity: {$content->signature}");

echo $content->content;
exit;
