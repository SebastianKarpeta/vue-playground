<?php
require __DIR__ . '/TestRailClient.php';

$caseId = $_GET['case_id'] ?? null;

if (!$caseId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Brak case_id']);
    exit;
}

TestRailClient::proxy('get_case/' . (int) $caseId);
