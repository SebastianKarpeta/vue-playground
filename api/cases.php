<?php
require __DIR__ . '/TestRailClient.php';

$projectId = $_GET['project_id'] ?? null;
$suiteId = $_GET['suite_id'] ?? null;
$offset = $_GET['offset'] ?? 0;

if (!$projectId || !$suiteId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Brak project_id lub suite_id']);
    exit;
}

TestRailClient::proxy('get_cases/' . (int) $projectId . '&suite_id=' . (int) $suiteId . '&limit=250&offset=' . (int) $offset);
