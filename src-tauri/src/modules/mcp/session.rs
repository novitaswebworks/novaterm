use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use shared_child::SharedChild;
use tauri::ipc::Channel;

const STDERR_TAIL_LINES: usize = 12;
const STDERR_LINE_CAP: usize = 512;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpExit {
    pub code: Option<i32>,
    pub stderr_tail: String,
}

pub struct McpSession {
    #[cfg(windows)]
    _job: Option<crate::modules::proc::job::ProcessJob>,
    child: Arc<SharedChild>,
    stdin: Mutex<Option<ChildStdin>>,
    exited: Arc<AtomicBool>,
}

impl McpSession {
    pub fn pid(&self) -> u32 {
        self.child.id()
    }

    pub fn write_message(&self, payload: &str) -> Result<(), String> {
        let mut guard = self.stdin.lock().unwrap();
        let stdin = guard.as_mut().ok_or("mcp session stdin closed")?;
        let bytes = payload.as_bytes();
        stdin
            .write_all(bytes)
            .and_then(|_| {
                if !payload.ends_with('\n') {
                    stdin.write_all(b"\n")?;
                }
                stdin.flush()
            })
            .map_err(|e| format!("mcp write failed: {e}"))
    }

    pub fn kill(&self) {
        self.exited.store(true, Ordering::Release);
        *self.stdin.lock().unwrap() = None;
        #[cfg(unix)]
        unsafe {
            let pid = self.child.id() as libc::pid_t;
            libc::kill(-pid, libc::SIGTERM);
            libc::kill(-pid, libc::SIGKILL);
        }
        let _ = self.child.kill();
    }

    #[allow(clippy::too_many_arguments)]
    pub fn spawn<F, C>(
        server_id: &str,
        command: &str,
        args: &[String],
        extra_env: &HashMap<String, String>,
        cwd: Option<&str>,
        on_message: Channel<String>,
        on_exit: Channel<McpExit>,
        on_created: F,
        on_exit_cleanup: C,
    ) -> Result<Arc<Self>, String>
    where
        F: FnOnce(Arc<Self>),
        C: FnOnce() + Send + 'static,
    {
        let binary_path = crate::modules::lsp::env::resolve_binary(command)
            .unwrap_or_else(|| std::path::PathBuf::from(command));

        let mut cmd = Command::new(&binary_path);
        cmd.args(args)
            .envs(crate::modules::lsp::env::server_env_overlay())
            .envs(extra_env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }

        crate::modules::proc::hide_console(&mut cmd);

        #[cfg(unix)]
        unsafe {
            use std::os::unix::process::CommandExt;
            cmd.pre_exec(|| {
                libc::setpgid(0, 0);
                Ok(())
            });
        }

        let child = Arc::new(
            SharedChild::spawn(&mut cmd)
                .map_err(|e| format!("mcp spawn failed for {}: {e}", binary_path.display()))?,
        );

        let kill_on_fail = || {
            let _ = child.kill();
        };

        let stdin = child.take_stdin().ok_or_else(|| {
            kill_on_fail();
            "mcp: no stdin pipe".to_string()
        })?;
        let stdout = child.take_stdout().ok_or_else(|| {
            kill_on_fail();
            "mcp: no stdout pipe".to_string()
        })?;
        let mut stderr = child.take_stderr().ok_or_else(|| {
            kill_on_fail();
            "mcp: no stderr pipe".to_string()
        })?;

        #[cfg(windows)]
        let job = match crate::modules::proc::job::ProcessJob::create_for(child.id()) {
            Ok(j) => Some(j),
            Err(e) => {
                log::warn!("mcp job-object setup failed for pid={}: {e}", child.id());
                None
            }
        };

        let exited = Arc::new(AtomicBool::new(false));
        let session = Arc::new(McpSession {
            #[cfg(windows)]
            _job: job,
            child: child.clone(),
            stdin: Mutex::new(Some(stdin)),
            exited: exited.clone(),
        });

        // Register session immediately before worker/waiter threads start
        on_created(session.clone());

        let stderr_tail: Arc<Mutex<std::collections::VecDeque<String>>> =
            Arc::new(Mutex::new(std::collections::VecDeque::new()));
        let stderr_tail_w = stderr_tail.clone();
        let sid_err = server_id.to_string();

        thread::Builder::new()
            .name(format!("novaterm-mcp-stderr-{sid_err}"))
            .spawn(move || {
                let mut buf = [0u8; 4096];
                let mut line: Vec<u8> = Vec::new();
                let push_line = |line: &mut Vec<u8>| {
                    if line.is_empty() {
                        return;
                    }
                    let text = String::from_utf8_lossy(line).into_owned();
                    log::debug!("mcp id={sid_err} stderr: {text}");
                    let mut tail = stderr_tail_w.lock().unwrap();
                    if tail.len() >= STDERR_TAIL_LINES {
                        tail.pop_front();
                    }
                    tail.push_back(text);
                    line.clear();
                };
                while let Ok(n) = stderr.read(&mut buf) {
                    if n == 0 {
                        break;
                    }
                    for &b in &buf[..n] {
                        if b == b'\n' {
                            push_line(&mut line);
                        } else if line.len() < STDERR_LINE_CAP {
                            line.push(b);
                        }
                    }
                }
                push_line(&mut line);
            })
            .map_err(|e| e.to_string())?;

        let sid_out = server_id.to_string();
        let session_reader = session.clone();
        let reader_thread = thread::Builder::new()
            .name(format!("novaterm-mcp-reader-{sid_out}"))
            .spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    match line {
                        Ok(l) => {
                            let trimmed = l.trim();
                            if !trimmed.is_empty()
                                && on_message.send(trimmed.to_string()).is_err()
                            {
                                session_reader.kill();
                                return;
                            }
                        }
                        Err(e) => {
                            log::debug!("mcp id={sid_out} stdout closed: {e}");
                            break;
                        }
                    }
                }
            })
            .map_err(|e| e.to_string())?;

        let child_waiter = child;
        let exited_w = exited;
        let sid_wait = server_id.to_string();
        thread::Builder::new()
            .name(format!("novaterm-mcp-waiter-{sid_wait}"))
            .spawn(move || {
                let code = match child_waiter.wait() {
                    Ok(status) => status.code(),
                    Err(e) => {
                        log::warn!("mcp id={sid_wait} wait failed: {e}");
                        None
                    }
                };
                exited_w.store(true, Ordering::Release);
                let deadline = Instant::now() + Duration::from_millis(500);
                while Instant::now() < deadline && !reader_thread.is_finished() {
                    thread::sleep(Duration::from_millis(10));
                }
                let tail = stderr_tail.lock().unwrap().iter().cloned().collect::<Vec<_>>().join("\n");
                let _ = on_exit.send(McpExit {
                    code,
                    stderr_tail: tail,
                });
                on_exit_cleanup();
            })
            .map_err(|e| e.to_string())?;

        Ok(session)
    }
}
