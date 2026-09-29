use std::collections::HashMap;
use std::process::{Child, Command};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::State;

use super::ssh::build_ssh_args;
use crate::modules::workspace::WorkspaceEnv;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct ListeningPort {
    pub port: u16,
    pub process: String,
    pub pid: Option<u32>,
    pub ip: String,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forwarded_to: Option<u16>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ActiveTunnel {
    pub id: u32,
    pub local_port: u16,
    pub remote_port: u16,
    pub host: String,
    pub user: Option<String>,
}

pub struct PortForwardState {
    tunnels: Mutex<HashMap<u32, (ActiveTunnel, Child)>>,
    next_id: AtomicU32,
}

impl Default for PortForwardState {
    fn default() -> Self {
        Self {
            tunnels: Mutex::new(HashMap::new()),
            next_id: AtomicU32::new(1),
        }
    }
}

impl PortForwardState {
    pub fn stop_all(&self) {
        if let Ok(mut map) = self.tunnels.lock() {
            for (_, (_, mut child)) in map.drain() {
                let _ = child.kill();
            }
        }
    }
}

fn parse_lsof_output(output: &str, source: &str) -> Vec<ListeningPort> {
    let mut ports = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let process = parts[0].to_string();
        let pid = parts[1].parse::<u32>().ok();
        let name_field = parts[8];

        let target = if let Some(idx) = name_field.rfind(':') {
            &name_field[idx + 1..]
        } else {
            continue;
        };

        if let Ok(port) = target.parse::<u16>() {
            let ip = if let Some(idx) = name_field.rfind(':') {
                let host_part = &name_field[..idx];
                if host_part == "*" || host_part.is_empty() {
                    "0.0.0.0".to_string()
                } else {
                    host_part.to_string()
                }
            } else {
                "127.0.0.1".to_string()
            };

            if seen.insert((port, source.to_string())) {
                ports.push(ListeningPort {
                    port,
                    process,
                    pid,
                    ip,
                    source: source.to_string(),
                    forwarded_to: None,
                });
            }
        }
    }

    ports
}

fn parse_ss_output(output: &str, source: &str) -> Vec<ListeningPort> {
    let mut ports = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        // In ss -tlnp: State, Recv-Q, Send-Q, Local Address:Port, Peer Address:Port, Process
        let addr_col = parts.get(3).unwrap_or(&"");
        let process_col = parts.get(5).or_else(|| parts.get(4)).unwrap_or(&"");

        let port_part = if let Some(idx) = addr_col.rfind(':') {
            &addr_col[idx + 1..]
        } else {
            continue;
        };

        if let Ok(port) = port_part.parse::<u16>() {
            let ip = if let Some(idx) = addr_col.rfind(':') {
                let h = &addr_col[..idx];
                if h == "*" || h.is_empty() {
                    "0.0.0.0".to_string()
                } else {
                    h.to_string()
                }
            } else {
                "127.0.0.1".to_string()
            };

            let proc_name = if process_col.contains("users:((\"") {
                let start = process_col.find("users:((\"").unwrap() + 9;
                let end = process_col[start..].find('"').map(|i| start + i).unwrap_or(process_col.len());
                process_col[start..end].to_string()
            } else {
                "process".to_string()
            };

            if seen.insert((port, source.to_string())) {
                ports.push(ListeningPort {
                    port,
                    process: proc_name,
                    pid: None,
                    ip,
                    source: source.to_string(),
                    forwarded_to: None,
                });
            }
        }
    }

    ports
}

#[cfg(windows)]
fn list_windows_ports(source: &str) -> Vec<ListeningPort> {
    let mut cmd = Command::new("netstat");
    cmd.args(["-ano", "-p", "tcp"]);
    crate::modules::proc::hide_console(&mut cmd);

    let Ok(out) = cmd.output() else {
        return Vec::new();
    };

    let stdout = String::from_utf8_lossy(&out.stdout);
    let mut ports = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in stdout.lines() {
        let line = line.trim();
        if !line.contains("LISTENING") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let local_addr = parts[1];
        let pid = parts[parts.len() - 1].parse::<u32>().ok();

        if let Some(idx) = local_addr.rfind(':') {
            let port_str = &local_addr[idx + 1..];
            if let Ok(port) = port_str.parse::<u16>() {
                let ip = local_addr[..idx].to_string();
                if seen.insert((port, source.to_string())) {
                    ports.push(ListeningPort {
                        port,
                        process: format!("PID:{}", pid.unwrap_or(0)),
                        pid,
                        ip,
                        source: source.to_string(),
                        forwarded_to: None,
                    });
                }
            }
        }
    }

    ports
}

#[tauri::command]
pub async fn ports_list(workspace: Option<WorkspaceEnv>) -> Result<Vec<ListeningPort>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let env = workspace.unwrap_or(WorkspaceEnv::Local);
        let mut all_ports = Vec::new();

        // 1. Scan local ports
        #[cfg(not(windows))]
        {
            let mut cmd = Command::new("lsof");
            cmd.args(["-nP", "-iTCP", "-sTCP:LISTEN"]);
            if let Ok(out) = cmd.output() {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout);
                    all_ports.extend(parse_lsof_output(&s, "local"));
                }
            }

            if all_ports.is_empty() {
                let mut ss_cmd = Command::new("ss");
                ss_cmd.args(["-tlnp"]);
                if let Ok(out) = ss_cmd.output() {
                    if out.status.success() {
                        let s = String::from_utf8_lossy(&out.stdout);
                        all_ports.extend(parse_ss_output(&s, "local"));
                    }
                }
            }
        }

        #[cfg(windows)]
        {
            all_ports.extend(list_windows_ports("local"));
        }

        // 2. Scan remote SSH ports if active
        if let WorkspaceEnv::Ssh { host, user, port, key_path, .. } = &env {
            let mut cmd = Command::new("ssh");
            let mut args = build_ssh_args(host, user.as_deref(), *port, key_path.as_deref());
            args.push("ss -tlnp 2>/dev/null || lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null".to_string());
            cmd.args(args);

            #[cfg(windows)]
            crate::modules::proc::hide_console(&mut cmd);

            if let Ok(out) = cmd.output() {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout);
                    let source_label = format!("ssh:{}", host);
                    let remote_ports = if s.contains("LISTEN") && s.contains("COMMAND") {
                        parse_lsof_output(&s, &source_label)
                    } else {
                        parse_ss_output(&s, &source_label)
                    };
                    all_ports.extend(remote_ports);
                }
            }
        }

        // 3. Scan DevContainer ports if active
        if let WorkspaceEnv::DevContainer { container_id, name, .. } = &env {
            let mut cmd = Command::new("docker");
            cmd.args([
                "exec",
                container_id,
                "sh",
                "-c",
                "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null",
            ]);

            #[cfg(windows)]
            crate::modules::proc::hide_console(&mut cmd);

            if let Ok(out) = cmd.output() {
                if out.status.success() {
                    let s = String::from_utf8_lossy(&out.stdout);
                    let source_label = format!("container:{}", name);
                    all_ports.extend(parse_ss_output(&s, &source_label));
                }
            }
        }

        all_ports.sort_by_key(|p| p.port);
        Ok(all_ports)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn port_forward_start(
    remote_port: u16,
    local_port: u16,
    host: String,
    user: Option<String>,
    port: Option<u16>,
    key_path: Option<String>,
    state: State<'_, PortForwardState>,
) -> Result<u32, String> {
    let forward_arg = format!("{}:127.0.0.1:{}", local_port, remote_port);
    let mut cmd = Command::new("ssh");
    let mut args = vec![
        "-N".to_string(),
        "-L".to_string(),
        forward_arg,
        "-o".to_string(),
        "ExitOnForwardFailure=yes".to_string(),
    ];
    args.extend(build_ssh_args(&host, user.as_deref(), port, key_path.as_deref()));
    cmd.args(args);

    #[cfg(windows)]
    crate::modules::proc::hide_console(&mut cmd);

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start port forwarding tunnel: {e}"))?;

    let id = state.next_id.fetch_add(1, Ordering::Relaxed);
    let tunnel = ActiveTunnel {
        id,
        local_port,
        remote_port,
        host,
        user,
    };

    let mut map = state
        .tunnels
        .lock()
        .map_err(|_| "Port forwarding state lock poisoned".to_string())?;
    map.insert(id, (tunnel, child));

    Ok(id)
}

#[tauri::command]
pub async fn port_forward_stop(
    id: u32,
    state: State<'_, PortForwardState>,
) -> Result<(), String> {
    let mut map = state
        .tunnels
        .lock()
        .map_err(|_| "Port forwarding state lock poisoned".to_string())?;

    if let Some((_, mut child)) = map.remove(&id) {
        let _ = child.kill();
        let _ = child.wait();
        Ok(())
    } else {
        Err(format!("No active port forward found with id {id}"))
    }
}

#[tauri::command]
pub async fn port_forward_list_active(
    state: State<'_, PortForwardState>,
) -> Result<Vec<ActiveTunnel>, String> {
    let map = state
        .tunnels
        .lock()
        .map_err(|_| "Port forwarding state lock poisoned".to_string())?;

    let list = map.values().map(|(t, _)| t.clone()).collect();
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_lsof_output_correctly() {
        let sample = "\
COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    12345 user   23u  IPv4 0xdeadbeef      0t0  TCP 127.0.0.1:5173 (LISTEN)
cargo   67890 user   12u  IPv6 0xdeadcafe      0t0  TCP *:3000 (LISTEN)
";
        let ports = parse_lsof_output(sample, "local");
        assert_eq!(ports.len(), 2);
        assert_eq!(ports[0].port, 5173);
        assert_eq!(ports[0].process, "node");
        assert_eq!(ports[0].ip, "127.0.0.1");

        assert_eq!(ports[1].port, 3000);
        assert_eq!(ports[1].process, "cargo");
        assert_eq!(ports[1].ip, "0.0.0.0");
    }

    #[test]
    fn parses_ss_output_correctly() {
        let sample = "\
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      128    0.0.0.0:8080        0.0.0.0:*        users:((\"python3\",pid=4321,fd=3))
";
        let ports = parse_ss_output(sample, "local");
        assert_eq!(ports.len(), 1);
        assert_eq!(ports[0].port, 8080);
        assert_eq!(ports[0].process, "python3");
        assert_eq!(ports[0].ip, "0.0.0.0");
    }
}
