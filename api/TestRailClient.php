<?php

class TestRailClient
{
    public static function proxy(string $endpoint): void
    {
        header('Content-Type: application/json');

        $config = require __DIR__ . '/config.php';

        $ch = curl_init($config['testrail_url'] . '/index.php?/api/v2/' . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $config['testrail_user'] . ':' . $config['testrail_key']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        http_response_code($httpCode);
        echo $response;
    }
}
