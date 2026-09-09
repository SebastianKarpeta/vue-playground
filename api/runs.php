<?php
require __DIR__ . '/TestRailClient.php';

$projectId = $_GET['project_id'] ?? null;
$milestoneId = $_GET['milestone_id'] ?? null;

if (!$projectId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Brak project_id']);
    exit;
}

$endpoint = 'get_runs/' . (int) $projectId;
if ($milestoneId) {
    $endpoint .= '&milestone_id=' . (int) $milestoneId;
}

TestRailClient::proxy($endpoint);