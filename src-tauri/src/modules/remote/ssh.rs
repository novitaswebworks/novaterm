use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};

use serde::{Deserialize, Serialize};

use crate::modules::fs::file::{FileStat, ReadResult, StatKind};
use crate::modules::fs::tree::{DirEntry, EntryKind};
use super::shell_quote;

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct SshConfig {
    pub id: String,
    pub label: String,
    pub host: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub remote_path: Option<String>,
}

pub fn build_ssh_args(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
) -> Vec<String> {
    let mut args = vec![
        "-o".to_string(),
        "BatchMode=yes".to_string(),
        "-o".to_string(),
        "ConnectTimeout=7".to_string(),
        "-o".to_string(),
        "StrictHostKeyChecking=accept-new".to_string(),
    ];

    if let Some(p) = port {
        args.push("-p".to_string());
        args.push(p.to_string());
    }

    if let Some(k) = key_path.filter(|k| !k.trim().is_empty()) {
        args.push("-i".to_string());
        args.push(k.trim().to_string());
    }

    let destination = match user.filter(|u| !u.trim().is_empty()) {
        Some(u) => format!("{}@{}", u.trim(), host.trim()),
        None => host.trim().to_string(),
    };
    args.push(destination);

    args
}

#[tauri::command]
pub async fn ssh_test_connection(
    host: String,
    user: Option<String>,
    port: Option<u16>,
    key_path: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new("ssh");
        let args = build_ssh_args(&host, user.as_deref(), port, key_path.as_deref());
        cmd.args(args);
        cmd.arg("uname -srm || echo ok");

        #[cfg(windows)]
        crate::modules::proc::hide_console(&mut cmd);

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to execute ssh: {e}. Ensure ssh is installed and on PATH."))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let msg = if err.is_empty() {
                format!("SSH exited with status {}", output.status)
            } else {
                err
            };
            return Err(msg);
        }

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if stdout.is_empty() { "Connected successfully".to_string() } else { stdout })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ssh_list_system_configs() -> Result<Vec<SshConfig>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
        let config_path = home.join(".ssh").join("config");
        if !config_path.is_file() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let mut configs = Vec::new();
        let mut current: Option<SshConfig> = None;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            let mut parts = trimmed.split_whitespace();
            let key = parts.next().unwrap_or("");
            let val = parts.collect::<Vec<_>>().join(" ");

            if key.eq_ignore_ascii_case("Host") {
                if let Some(c) = current.take() {
                    if !c.host.is_empty() && c.host != "*" && !c.host.contains('*') {
                        configs.push(c);
                    }
                }
                let host_alias = val.clone();
                current = Some(SshConfig {
                    id: format!("ssh-sys-{}", host_alias),
                    label: host_alias.clone(),
                    host: host_alias,
                    user: None,
                    port: None,
                    key_path: None,
                    remote_path: None,
                });
            } else if let Some(ref mut c) = current {
                if key.eq_ignore_ascii_case("HostName") && !val.is_empty() {
                    c.host = val;
                } else if key.eq_ignore_ascii_case("User") && !val.is_empty() {
                    c.user = Some(val);
                } else if key.eq_ignore_ascii_case("Port") {
                    if let Ok(p) = val.parse::<u16>() {
                        c.port = Some(p);
                    }
                } else if key.eq_ignore_ascii_case("IdentityFile") && !val.is_empty() {
                    let expanded = if let Some(stripped) = val.strip_prefix("~/") {
                        home.join(stripped).to_string_lossy().into_owned()
                    } else {
                        val
                    };
                    c.key_path = Some(expanded);
                }
            }
        }

        if let Some(c) = current {
            if !c.host.is_empty() && c.host != "*" && !c.host.contains('*') {
                configs.push(c);
            }
        }

        Ok(configs)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn ssh_exec(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    command: &str,
) -> Result<String, String> {
    let mut cmd = Command::new("ssh");
    let mut args = build_ssh_args(host, user, port, key_path);
    args.push(command.to_string());
    cmd.args(args);

    #[cfg(windows)]
    crate::modules::proc::hide_console(&mut cmd);

    let out = cmd.output().map_err(|e| format!("ssh execution failed: {e}"))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(if err.is_empty() {
            format!("SSH command exited with status {}", out.status)
        } else {
            err
        });
    }

    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

#[derive(Deserialize)]
struct RemoteDirItem {
    name: String,
    kind: String,
    size: u64,
    mtime: u64,
}

pub fn ssh_read_dir(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
    show_hidden: bool,
) -> Result<Vec<DirEntry>, String> {
    let py_script = format!(
        r#"python3 -c '
import os, sys, json
path = os.path.expanduser(sys.argv[1])
show_hidden = sys.argv[2] == "1"
entries = []
try:
    with os.scandir(path) as it:
        for e in it:
            if not show_hidden and e.name.startswith("."):
                continue
            try:
                st = e.stat(follow_symlinks=False)
                is_dir = e.is_dir(follow_symlinks=False)
                is_sym = e.is_symlink()
                kind = "dir" if is_dir else ("symlink" if is_sym else "file")
                size = st.st_size if not is_dir else 0
                mtime = int(st.st_mtime * 1000)
                entries.append({{"name": e.name, "kind": kind, "size": size, "mtime": mtime}})
            except Exception:
                continue
    print(json.dumps(entries))
except Exception as ex:
    sys.stderr.write(str(ex))
    sys.exit(1)
' {} {}"#,
        shell_quote(remote_path),
        if show_hidden { "1" } else { "0" }
    );

    let output = ssh_exec(host, user, port, key_path, &py_script)?;
    let parsed: Vec<RemoteDirItem> = serde_json::from_str(output.trim()).map_err(|e| {
        format!("Failed to parse remote directory response: {e}. Output was: {output}")
    })?;

    let mut entries = Vec::with_capacity(parsed.len());
    for item in parsed {
        let kind = match item.kind.as_str() {
            "dir" => EntryKind::Dir,
            "symlink" => EntryKind::Symlink,
            _ => EntryKind::File,
        };
        entries.push(DirEntry {
            name: item.name,
            kind,
            size: item.size,
            mtime: item.mtime,
            gitignored: false,
        });
    }

    entries.sort_by(|a, b| {
        let a_is_dir = matches!(a.kind, EntryKind::Dir);
        let b_is_dir = matches!(b.kind, EntryKind::Dir);
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

pub fn ssh_read_file(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
) -> Result<ReadResult, String> {
    let script = format!(
        r#"python3 -c '
import sys, base64, os
path = os.path.expanduser(sys.argv[1])
try:
    size = os.path.getsize(path)
    if size > 10 * 1024 * 1024:
        print("TOOLARGE:" + str(size))
        sys.exit(0)
    with open(path, "rb") as f:
        data = f.read()
    h = data.hex()
    print("OK:" + str(size) + ":" + h)
except Exception as ex:
    sys.stderr.write(str(ex))
    sys.exit(1)
' {}"#,
        shell_quote(remote_path)
    );

    let output = ssh_exec(host, user, port, key_path, &script)?;
    let trimmed = output.trim();

    if let Some(rest) = trimmed.strip_prefix("TOOLARGE:") {
        let size = rest.parse::<u64>().unwrap_or(10 * 1024 * 1024 + 1);
        return Ok(ReadResult::TooLarge {
            size,
            limit: 10 * 1024 * 1024,
        });
    }

    if let Some(rest) = trimmed.strip_prefix("OK:") {
        let mut parts = rest.splitn(2, ':');
        let size_str = parts.next().unwrap_or("0");
        let hex_str = parts.next().unwrap_or("").trim();
        let size = size_str.parse::<u64>().unwrap_or(0);

        let mut bytes = Vec::with_capacity(hex_str.len() / 2);
        let chars = hex_str.as_bytes();
        let mut i = 0;
        while i + 1 < chars.len() {
            let byte_str = std::str::from_utf8(&chars[i..i + 2])
                .map_err(|e| format!("Invalid hex sequence: {e}"))?;
            let byte = u8::from_str_radix(byte_str, 16)
                .map_err(|e| format!("Invalid hex byte: {e}"))?;
            bytes.push(byte);
            i += 2;
        }

        if bytes[..bytes.len().min(8 * 1024)].contains(&0) {
            return Ok(ReadResult::Binary { size });
        }

        return match String::from_utf8(bytes) {
            Ok(content) => Ok(ReadResult::Text { content, size }),
            Err(_) => Ok(ReadResult::Binary { size }),
        };
    }

    Err(format!("Unexpected response when reading remote file: {trimmed}"))
}

pub fn ssh_write_file(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
    content: &str,
) -> Result<(), String> {
    let mut cmd = Command::new("ssh");
    let mut args = build_ssh_args(host, user, port, key_path);
    let remote_cmd = format!(
        "python3 -c 'import sys, os, tempfile; p = os.path.expanduser(sys.argv[1]); os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True); tmp = p + \".novaterm.tmp\"; f = open(tmp, \"w\", encoding=\"utf-8\"); f.write(sys.stdin.read()); f.flush(); os.fsync(f.fileno()); f.close(); os.replace(tmp, p)' {}",
        shell_quote(remote_path)
    );
    args.push(remote_cmd);
    cmd.args(args);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    #[cfg(windows)]
    crate::modules::proc::hide_console(&mut cmd);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn ssh for remote write: {e}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(content.as_bytes())
            .map_err(|e| format!("Failed to send data to ssh: {e}"))?;
    }

    let out = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for remote write: {e}"))?;

    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(if err.is_empty() {
            format!("Remote write exited with status {}", out.status)
        } else {
            err
        });
    }

    Ok(())
}

pub fn ssh_stat(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
) -> Result<FileStat, String> {
    let script = format!(
        r#"python3 -c '
import sys, os
p = os.path.expanduser(sys.argv[1])
try:
    st = os.stat(p)
    is_dir = os.path.isdir(p)
    is_sym = os.path.islink(p)
    kind = "dir" if is_dir else ("symlink" if is_sym else "file")
    print(f"{{st.st_size}}:{{int(st.st_mtime * 1000)}}:{{kind}}")
except Exception as ex:
    sys.stderr.write(str(ex))
    sys.exit(1)
' {}"#,
        shell_quote(remote_path)
    );

    let output = ssh_exec(host, user, port, key_path, &script)?;
    let trimmed = output.trim();
    let parts: Vec<&str> = trimmed.split(':').collect();
    if parts.len() < 3 {
        return Err(format!("Unexpected stat format from remote host: {trimmed}"));
    }

    let size = parts[0].parse::<u64>().unwrap_or(0);
    let mtime = parts[1].parse::<u64>().unwrap_or(0);
    let kind = match parts[2] {
        "dir" => StatKind::Dir,
        "symlink" => StatKind::Symlink,
        _ => StatKind::File,
    };

    Ok(FileStat { size, mtime, kind })
}

pub fn ssh_mutate_create_file(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
) -> Result<(), String> {
    let cmd = format!("touch {}", shell_quote(remote_path));
    ssh_exec(host, user, port, key_path, &cmd).map(|_| ())
}

pub fn ssh_mutate_create_dir(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
) -> Result<(), String> {
    let cmd = format!("mkdir -p {}", shell_quote(remote_path));
    ssh_exec(host, user, port, key_path, &cmd).map(|_| ())
}

pub fn ssh_mutate_rename(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    from: &str,
    to: &str,
) -> Result<(), String> {
    let cmd = format!("mv {} {}", shell_quote(from), shell_quote(to));
    ssh_exec(host, user, port, key_path, &cmd).map(|_| ())
}

pub fn ssh_mutate_delete(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
    remote_path: &str,
) -> Result<(), String> {
    let cmd = format!("rm -rf {}", shell_quote(remote_path));
    ssh_exec(host, user, port, key_path, &cmd).map(|_| ())
}

pub fn ssh_resolve_home(
    host: &str,
    user: Option<&str>,
    port: Option<u16>,
    key_path: Option<&str>,
) -> Result<String, String> {
    let out = ssh_exec(host, user, port, key_path, "pwd")?;
    let path = out.trim().to_string();
    if path.is_empty() {
        Ok("/".to_string())
    } else {
        Ok(path)
    }
}

#[tauri::command]
pub async fn ssh_get_remote_home(
    host: String,
    user: Option<String>,
    port: Option<u16>,
    key_path: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ssh_resolve_home(&host, user.as_deref(), port, key_path.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_ssh_args_with_defaults() {
        let args = build_ssh_args("192.168.1.1", None, None, None);
        assert!(args.contains(&"192.168.1.1".to_string()));
        assert!(args.contains(&"BatchMode=yes".to_string()));
        assert!(!args.contains(&"-p".to_string()));
        assert!(!args.contains(&"-i".to_string()));
    }

    #[test]
    fn builds_ssh_args_with_user_port_key() {
        let args = build_ssh_args("example.com", Some("root"), Some(2222), Some("/path/to/key"));
        assert!(args.contains(&"root@example.com".to_string()));
        assert!(args.contains(&"-p".to_string()));
        assert!(args.contains(&"2222".to_string()));
        assert!(args.contains(&"-i".to_string()));
        assert!(args.contains(&"/path/to/key".to_string()));
    }
}
