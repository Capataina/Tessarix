mod llm;
mod telemetry;

use llm::commands::{llm_chat_complete, llm_chat_json, llm_chat_stream};
use telemetry::commands::{
    telemetry_dir_path, telemetry_list_sessions, telemetry_session_path,
    telemetry_write_batch,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            llm_chat_complete,
            llm_chat_stream,
            llm_chat_json,
            telemetry_write_batch,
            telemetry_session_path,
            telemetry_dir_path,
            telemetry_list_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
