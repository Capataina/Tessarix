//! Tauri command surface for telemetry. The frontend talks to the host via:
//!
//! - `telemetry_write_batch(session_id, events)` — append a batch of JSON events
//! - `telemetry_session_path(session_id)` — resolve the file path the events go to
//! - `telemetry_list_sessions()` — enumerate stored session files

use crate::telemetry::writer;
use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

#[derive(Serialize)]
pub struct SessionFile {
    pub name: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub async fn telemetry_write_batch(
    app: AppHandle,
    session_id: String,
    events: Vec<Value>,
) -> Result<usize, String> {
    let path = writer::session_path(&app, &session_id)?;
    writer::append_batch(&path, &events)?;
    Ok(events.len())
}

#[tauri::command]
pub async fn telemetry_session_path(
    app: AppHandle,
    session_id: String,
) -> Result<String, String> {
    let path = writer::session_path(&app, &session_id)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn telemetry_dir_path(app: AppHandle) -> Result<String, String> {
    let dir = writer::telemetry_dir(&app)?;
    Ok(dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn telemetry_list_sessions(app: AppHandle) -> Result<Vec<SessionFile>, String> {
    let sessions = writer::list_sessions(&app)?;
    Ok(sessions
        .into_iter()
        .map(|(name, size_bytes)| SessionFile { name, size_bytes })
        .collect())
}
