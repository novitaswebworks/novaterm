pub mod session;

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tauri::ipc::Channel;
use session::{McpExit, McpSession};

pub struct McpState {
    sessions: Arc<RwLock<HashMap<String, Arc<McpSession>>>>,
}

impl Default for McpState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl McpState {
    pub fn kill_all(&self) {
        let drained: Vec<Arc<McpSession>> =
            self.sessions.write().unwrap().drain().map(|(_, s)| s).collect();
        for session in drained {
            session.kill();
        }
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn mcp_spawn(
    server_id: String,
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
    cwd: Option<String>,
    on_message: Channel<String>,
    on_exit: Channel<McpExit>,
    state: tauri::State<'_, McpState>,
) -> Result<u32, String> {
    if let Some(existing) = state.sessions.write().unwrap().remove(&server_id) {
        existing.kill();
    }

    let sessions_for_insert = state.sessions.clone();
    let sessions_for_cleanup = state.sessions.clone();
    let sid_insert = server_id.clone();
    let sid_cleanup = server_id.clone();

    let session = session::McpSession::spawn(
        &server_id,
        &command,
        &args,
        &env,
        cwd.as_deref(),
        on_message,
        on_exit,
        move |s| {
            sessions_for_insert.write().unwrap().insert(sid_insert, s);
        },
        move || {
            sessions_for_cleanup.write().unwrap().remove(&sid_cleanup);
        },
    )?;

    Ok(session.pid())
}

#[tauri::command]
pub fn mcp_send(
    server_id: String,
    payload: String,
    state: tauri::State<'_, McpState>,
) -> Result<(), String> {
    let session = state
        .sessions
        .read()
        .unwrap()
        .get(&server_id)
        .cloned()
        .ok_or_else(|| format!("mcp server session not found: {server_id}"))?;
    session.write_message(&payload)
}

#[tauri::command]
pub fn mcp_kill(
    server_id: String,
    state: tauri::State<'_, McpState>,
) -> Result<(), String> {
    if let Some(session) = state.sessions.write().unwrap().remove(&server_id) {
        session.kill();
        Ok(())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn mcp_kill_all(state: tauri::State<'_, McpState>) -> Result<(), String> {
    state.kill_all();
    Ok(())
}
