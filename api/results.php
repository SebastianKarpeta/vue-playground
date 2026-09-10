<?php
require __DIR__ . '/TestRailClient.php';

$testId = $_GET['test_id'] ?? null;

if (!$testId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'Brak test_id']);
    exit;
}

TestRailClient::proxy('get_results/' . (int) $testId . '&limit=250');
