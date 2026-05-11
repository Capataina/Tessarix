//! LLM client + Tauri command surface for Tessarix's three LLM-driven features:
//! wrong-answer thread, right-pane chatbot, tiered hints.
//!
//! Architecture: OpenAI-compatible HTTP client over reqwest, pointed at Ollama
//! by default (`http://localhost:11434/v1`). The same client transparently works
//! against a bundled `llama-server` sidecar in Phase 2 — only the base URL changes.

pub mod client;
pub mod commands;
pub mod types;
