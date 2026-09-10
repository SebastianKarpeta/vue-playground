<?php
require __DIR__ . '/TestRailClient.php';

$runId = $_GET['run_id'] ?? null;
$offset = $_GET['offset'] ?? 0;
$limit = $_GET['limit'] ?? 20;
$statusId = $_GET['status_id'] ?? null;

if (!$runId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Brak run_id']);
    exit;
}

$endpoint = 'get_tests/' . (int) $runId . '&limit=' . (int) $limit . '&offset=' . (int) $offset;
if ($statusId) {
    $endpoint .= '&status_id=' . (int) $statusId;
}

TestRailClient::proxy($endpoint);
