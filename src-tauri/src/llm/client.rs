//! OpenAI-compatible chat client. Built once, used by all three Tessarix LLM features.
//!
//! Hits `<base_url>/chat/completions`. Supports:
//! - `chat_complete` — single-shot non-streaming request
//! - `chat_stream` — server-sent-events streaming; invokes a callback per token
//! - `chat_json` — JSON-schema-constrained structured output (used by tiered hints)
//!
//! Defaults: base URL `http://localhost:11434/v1` (Ollama), model `llama3.2:3b`,
//! temperature 0.2, top_p 0.9. All overridable per request.

use crate::llm::types::*;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub const DEFAULT_BASE_URL: &str = "http://localhost:11434/v1";
pub const DEFAULT_MODEL: &str = "llama3.2:3b";

#[derive(Debug, Clone)]
pub struct ChatOptions {
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
}

impl Default for ChatOptions {
    fn default() -> Self {
        Self {
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 350,
        }
    }
}

pub struct LlmClient {
    http: Client,
    base_url: String,
    model: String,
}

impl Default for LlmClient {
    fn default() -> Self {
        Self::new()
    }
}

impl LlmClient {
    pub fn new() -> Self {
        Self {
            http: Client::builder()
                .timeout(Duration::from_secs(180))
                .build()
                .expect("reqwest client should always build with default settings"),
            base_url: DEFAULT_BASE_URL.to_string(),
            model: DEFAULT_MODEL.to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    #[allow(dead_code)]
    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }

    pub async fn chat_complete(
        &self,
        messages: Vec<ChatMessage>,
        opts: ChatOptions,
    ) -> Result<String, String> {
        let url = format!("{}/chat/completions", self.base_url);
        let body = ChatRequest {
            model: &self.model,
            messages: &messages,
            stream: false,
            temperature: opts.temperature,
            top_p: opts.top_p,
            max_tokens: opts.max_tokens,
            response_format: None,
        };
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("LLM request failed (is Ollama running?): {}", e))?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("LLM HTTP {}: {}", status, body));
        }
        let parsed: ChatResponse = resp
            .json()
            .await
            .map_err(|e| format!("LLM response parse failed: {}", e))?;
        parsed
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| "LLM returned empty choices array".to_string())
    }

    pub async fn chat_stream<F>(
        &self,
        messages: Vec<ChatMessage>,
        opts: ChatOptions,
        mut on_token: F,
    ) -> Result<(), String>
    where
        F: FnMut(String),
    {
        let url = format!("{}/chat/completions", self.base_url);
        let body = ChatRequest {
            model: &self.model,
            messages: &messages,
            stream: true,
            temperature: opts.temperature,
            top_p: opts.top_p,
            max_tokens: opts.max_tokens,
            response_format: None,
        };
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("LLM stream request failed (is Ollama running?): {}", e))?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("LLM HTTP {}: {}", status, body));
        }

        let mut stream = resp.bytes_stream();
        let mut buf = String::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("LLM stream chunk error: {}", e))?;
            // Bytes might not be valid UTF-8 at chunk boundaries; append lossy then
            // re-scan from the buffer to find complete SSE events.
            buf.push_str(&String::from_utf8_lossy(&chunk));

            // SSE events are terminated by "\n\n". Process every complete event in buf.
            while let Some(idx) = buf.find("\n\n") {
                let event = buf[..idx].to_string();
                buf.drain(..idx + 2);

                for line in event.lines() {
                    let payload = match line.strip_prefix("data: ").or_else(|| line.strip_prefix("data:")) {
                        Some(p) => p.trim(),
                        None => continue,
                    };
                    if payload == "[DONE]" {
                        return Ok(());
                    }
                    if payload.is_empty() {
                        continue;
                    }
                    match serde_json::from_str::<StreamChunk>(payload) {
                        Ok(parsed) => {
                            for choice in parsed.choices {
                                if let Some(content) = choice.delta.content {
                                    if !content.is_empty() {
                                        on_token(content);
                                    }
                                }
                            }
                        }
                        Err(_) => {
                            // Some SSE chunks (keep-alives, role-only deltas) are not
                            // parseable as StreamChunk — silently skip rather than abort.
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub async fn chat_json(
        &self,
        messages: Vec<ChatMessage>,
        schema: Value,
        opts: ChatOptions,
    ) -> Result<Value, String> {
        let url = format!("{}/chat/completions", self.base_url);
        let body = ChatRequest {
            model: &self.model,
            messages: &messages,
            stream: false,
            temperature: opts.temperature,
            top_p: opts.top_p,
            max_tokens: opts.max_tokens,
            response_format: Some(ResponseFormat::JsonSchema {
                json_schema: schema,
            }),
        };
        let resp = self
            .http
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("LLM JSON request failed: {}", e))?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("LLM HTTP {}: {}", status, body));
        }
        let parsed: ChatResponse = resp
            .json()
            .await
            .map_err(|e| format!("LLM response parse failed: {}", e))?;
        let content = parsed
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| "LLM returned empty choices array".to_string())?;
        serde_json::from_str(&content)
            .map_err(|e| format!("LLM JSON content parse failed: {}. Content was: {}", e, content))
    }
}
