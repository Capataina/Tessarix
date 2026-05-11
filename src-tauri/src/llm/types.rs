//! Request / response types for the OpenAI-compatible chat completions API.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest<'a> {
    pub model: &'a str,
    pub messages: &'a [ChatMessage],
    pub stream: bool,
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<ResponseFormat>,
}

/// OpenAI-style structured-output specification.
/// Ollama supports both `json_object` (free-form valid JSON) and `json_schema`
/// (validated against a provided schema).
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ResponseFormat {
    /// Free-form JSON output (Ollama / OpenAI `json_object` mode). Reserved for
    /// future features that need any-shape structured output without a schema.
    #[allow(dead_code)]
    JsonObject,
    /// Schema-constrained output. Used by the tiered-hints feature.
    JsonSchema { json_schema: Value },
}

#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
pub struct Choice {
    pub message: ChatMessage,
    #[allow(dead_code)]
    pub finish_reason: Option<String>,
}

/// Single SSE chunk parsed from a streamed response.
#[derive(Debug, Deserialize)]
pub struct StreamChunk {
    pub choices: Vec<DeltaChoice>,
}

#[derive(Debug, Deserialize)]
pub struct DeltaChoice {
    pub delta: Delta,
    #[allow(dead_code)]
    pub finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Delta {
    #[serde(default)]
    pub content: Option<String>,
}
