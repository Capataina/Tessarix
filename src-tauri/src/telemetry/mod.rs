//! Append-only JSONL telemetry. Each Tessarix session writes one file under the
//! OS-conventional app-data directory:
//!
//!   macOS:   ~/Library/Application Support/com.capataina.tessarix/telemetry/<session>.jsonl
//!   Linux:   ~/.local/share/com.capataina.tessarix/telemetry/<session>.jsonl
//!   Windows: %APPDATA%\com.capataina.tessarix\telemetry\<session>.jsonl
//!
//! The frontend buffers events and flushes them in batches via the IPC commands
//! in `commands.rs`. The writer here is deliberately dumb — it accepts a batch
//! of pre-formatted JSON values and appends them as lines. The frontend owns
//! the schema; the host just persists.

pub mod commands;
pub mod writer;
