// Cienka warstwa proxy do TestRail API, zastępująca api/TestRailClient.php
// z wersji webowej — tu nie ma osobnego serwera PHP, wszystko dzieje się
// wewnątrz samej aplikacji desktopowej.
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
pub struct Credentials {
    pub url: String,
    pub user: String,
    pub key: String,
}

fn credentials_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("testrail_credentials.json"))
}

#[tauri::command]
pub fn get_credentials(app: tauri::AppHandle) -> Option<Credentials> {
    let path = credentials_path(&app).ok()?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

#[tauri::command]
pub fn save_credentials(
    app: tauri::AppHandle,
    url: String,
    user: String,
    key: String,
) -> Result<(), String> {
    let path = credentials_path(&app)?;
    let creds = Credentials {
        url: url.trim_end_matches('/').to_string(),
        user,
        key,
    };
    let data = serde_json::to_string_pretty(&creds).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_credentials(app: tauri::AppHandle) -> Result<(), String> {
    let path = credentials_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

async fn fetch_testrail(creds: &Credentials, endpoint: &str) -> Result<serde_json::Value, String> {
    let url = format!("{}/index.php?/api/v2/{}", creds.url, endpoint);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(&creds.user, Some(&creds.key))
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("TestRail nie odpowiedział na czas: {e}"))?;

    let status = response.status();
    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Nieprawidłowa odpowiedź TestRaila: {e}"))?;

    if !status.is_success() {
        let message = body
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("nieznany błąd");
        return Err(format!("TestRail zwrócił błąd {status}: {message}"));
    }

    Ok(body)
}

// Sprawdza podane dane logowania NA ŻYWO, bez ich zapisywania — ekran
// pierwszego uruchomienia woła to PRZED save_credentials, żeby błędne
// dane nigdy nie trafiły na dysk jako rzekomo "skonfigurowane" (inaczej
// ekran logowania już by się drugi raz nie pojawił, mimo że nic nie działa).
#[tauri::command]
pub async fn test_credentials(url: String, user: String, key: String) -> Result<(), String> {
    let creds = Credentials {
        url: url.trim_end_matches('/').to_string(),
        user,
        key,
    };
    fetch_testrail(&creds, "get_projects").await?;
    Ok(())
}

#[tauri::command]
pub async fn testrail_request(
    app: tauri::AppHandle,
    endpoint: String,
) -> Result<serde_json::Value, String> {
    let creds = get_credentials(app)
        .ok_or_else(|| "Brak zapisanych danych logowania do TestRail".to_string())?;
    fetch_testrail(&creds, &endpoint).await
}
