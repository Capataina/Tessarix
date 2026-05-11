use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use serde_json::Value;
use tauri::{AppHandle, Manager};

/// Resolve the telemetry directory and ensure it exists.
/// Returns the path on success or a human-readable error string.
pub fn telemetry_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("could not resolve app_data_dir: {}", e))?;
    let dir = base.join("telemetry");
    create_dir_all(&dir).map_err(|e| format!("could not create telemetry dir: {}", e))?;
    Ok(dir)
}

/// Path to the JSONL file for a specific session id. The session id is
/// chosen by the frontend (a UUID generated at app start).
pub fn session_path(app: &AppHandle, session_id: &str) -> Result<PathBuf, String> {
    let dir = telemetry_dir(app)?;
    // Sanitise — strip anything that's not alphanumeric, dash, or underscore.
    let clean: String = session_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if clean.is_empty() {
        return Err("session id is empty after sanitisation".to_string());
    }
    Ok(dir.join(format!("{}.jsonl", clean)))
}

/// Append a batch of JSON events to the session's JSONL file. Each event becomes
/// one line. The writer opens-appends-closes per batch — the frontend batches
/// for efficiency, so we don't keep a long-lived file handle.
pub fn append_batch(path: &Path, events: &[Value]) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| format!("open {}: {}", path.display(), e))?;
    for event in events {
        let line = serde_json::to_string(event)
            .map_err(|e| format!("serialise event: {}", e))?;
        file.write_all(line.as_bytes())
            .map_err(|e| format!("write event: {}", e))?;
        file.write_all(b"\n").map_err(|e| format!("write newline: {}", e))?;
    }
    file.flush().map_err(|e| format!("flush: {}", e))?;
    Ok(())
}

/// Enumerate session files in the telemetry directory. Returns (filename, byte_size).
pub fn list_sessions(app: &AppHandle) -> Result<Vec<(String, u64)>, String> {
    let dir = telemetry_dir(app)?;
    let mut out = Vec::new();
    let entries = std::fs::read_dir(&dir)
        .map_err(|e| format!("read_dir {}: {}", dir.display(), e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("jsonl") {
            let name = path
                .file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
                .unwrap_or_default();
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            if !name.is_empty() {
                out.push((name, size));
            }
        }
    }
    Ok(out)
}
