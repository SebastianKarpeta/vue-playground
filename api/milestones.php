<?php

require __DIR__ . '/TestRailClient.php';

$projectId = $_GET['project_id'] ?? null;
if (!$projectId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Brak project_id']);
    exit;
}

TestRailClient::proxy('get_milestones/' . (int) $projectId);