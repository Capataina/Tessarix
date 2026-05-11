//! Tauri command surface that the frontend invokes. Three commands:
//! - `llm_chat_complete` — single-shot, returns the full response string
//! - `llm_chat_stream` — streams tokens to the frontend via a Tauri `Channel`
//! - `llm_chat_json` — structured output via JSON schema; returns `serde_json::Value`

use crate::llm::client::{ChatOptions, LlmClient};
use crate::llm::types::ChatMessage;
use serde::Serialize;
use serde_json::Value;
use tauri::ipc::Channel;

/// One event in a streaming response. The frontend's `Channel<StreamEvent>` receives
/// these in order: zero or more `Token`s, then exactly one terminating `Done` or `Error`.
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "snake_case")]
pub enum StreamEvent {
    Token { content: String },
    Done,
    Error { message: String },
}

fn options_from(temp: Option<f32>, top_p: Option<f32>, max_tokens: Option<u32>) -> ChatOptions {
    let d = ChatOptions::default();
    ChatOptions {
        temperature: temp.unwrap_or(d.temperature),
        top_p: top_p.unwrap_or(d.top_p),
        max_tokens: max_tokens.unwrap_or(d.max_tokens),
    }
}

#[tauri::command]
pub async fn llm_chat_complete(
    messages: Vec<ChatMessage>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<String, String> {
    let client = LlmClient::new();
    let opts = options_from(temperature, top_p, max_tokens);
    client.chat_complete(messages, opts).await
}

#[tauri::command]
pub async fn llm_chat_stream(
    messages: Vec<ChatMessage>,
    on_event: Channel<StreamEvent>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let client = LlmClient::new();
    let opts = options_from(temperature, top_p, max_tokens);

    let on_event_for_tokens = on_event.clone();
    let result = client
        .chat_stream(messages, opts, move |token| {
            // Best-effort send; if the frontend dropped the channel, just stop emitting.
            let _ = on_event_for_tokens.send(StreamEvent::Token { content: token });
        })
        .await;

    match result {
        Ok(()) => {
            let _ = on_event.send(StreamEvent::Done);
            Ok(())
        }
        Err(e) => {
            let _ = on_event.send(StreamEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn llm_chat_json(
    messages: Vec<ChatMessage>,
    schema: Value,
    temperature: Option<f32>,
    top_p: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<Value, String> {
    let client = LlmClient::new();
    let opts = options_from(temperature, top_p, max_tokens.or(Some(800)));
    client.chat_json(messages, schema, opts).await
}
