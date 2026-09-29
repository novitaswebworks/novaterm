use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};
use super::shell_quote;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct DevContainerConfig {
    pub name: Option<String>,
    pub image: Option<String>,
    pub dockerfile: Option<String>,
    #[serde(default)]
    pub forward_ports: Vec<u16>,
    pub workspace_folder: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
pub struct DevContainerDetection {
    pub detected: bool,
    pub config_path: Option<String>,
    pub config: Option<DevContainerConfig>,
    pub docker_available: bool,
    pub docker_version: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct DockerContainer {
    pub id: String,
    pub names: String,
    pub image: String,
    pub status: String,
    pub ports: String,
}

fn strip_json_comments(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut in_string = false;
    let mut in_single_comment = false;
    let mut in_multi_comment = false;
    let chars: Vec<char> = input.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let c = chars[i];
        let next = if i + 1 < len { Some(chars[i + 1]) } else { None };

        if in_single_comment {
            if c == '\n' {
                in_single_comment = false;
                out.push(c);
            }
            i += 1;
            continue;
        }

        if in_multi_comment {
            if c == '*' && next == Some('/') {
                in_multi_comment = false;
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }

        if in_string {
            out.push(c);
            if c == '\\' {
                if let Some(n) = next {
                    out.push(n);
                    i += 2;
                    continue;
                }
            }
            if c == '"' {
                in_string = false;
            }
            i += 1;
            continue;
        }

        if c == '"' {
            in_string = true;
            out.push(c);
            i += 1;
            continue;
        }

        if c == '/' && next == Some('/') {
            in_single_comment = true;
            i += 2;
            continue;
        }

        if c == '/' && next == Some('*') {
            in_multi_comment = true;
            i += 2;
            continue;
        }

        out.push(c);
        i += 1;
    }

    out
}

#[derive(Deserialize)]
struct RawDevContainerJson {
    name: Option<String>,
    image: Option<String>,
    #[serde(alias = "dockerFile")]
    dockerfile: Option<String>,
    #[serde(alias = "build")]
    build_obj: Option<RawBuildObj>,
    #[serde(default, alias = "forwardPorts")]
    forward_ports: Vec<u16>,
    #[serde(alias = "workspaceFolder")]
    workspace_folder: Option<String>,
}

#[derive(Deserialize)]
struct RawBuildObj {
    #[serde(alias = "dockerfile")]
    dockerfile: Option<String>,
}

pub fn docker_bin_path() -> PathBuf {
    crate::modules::lsp::env::resolve_binary("docker")
        .or_else(|| {
            for fallback in [
                "/usr/local/bin/docker",
                "/opt/homebrew/bin/docker",
                "/usr/bin/docker",
            ] {
                let p = PathBuf::from(fallback);
                if p.is_file() {
                    return Some(p);
                }
            }
            if let Some(home) = dirs::home_dir() {
                let p = home.join(".docker").join("bin").join("docker");
                if p.is_file() {
                    return Some(p);
                }
            }
            None
        })
        .unwrap_or_else(|| PathBuf::from("docker"))
}

pub fn docker_command() -> Command {
    let mut cmd = Command::new(docker_bin_path());
    cmd.envs(crate::modules::lsp::env::server_env_overlay());
    #[cfg(windows)]
    crate::modules::proc::hide_console(&mut cmd);
    cmd
}

fn check_docker() -> (bool, Option<String>) {
    let mut cmd = docker_command();
    cmd.args(["version", "--format", "{{.Server.Version}}"]);

    match cmd.output() {
        Ok(out) if out.status.success() => {
            let ver = String::from_utf8_lossy(&out.stdout).trim().to_string();
            (true, if ver.is_empty() { None } else { Some(ver) })
        }
        _ => (false, None),
    }
}

#[tauri::command]
pub async fn devcontainer_detect(workspace_path: String) -> Result<DevContainerDetection, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (docker_available, docker_version) = check_docker();
        let root = Path::new(&workspace_path);
        if !root.is_dir() {
            return Ok(DevContainerDetection {
                detected: false,
                config_path: None,
                config: None,
                docker_available,
                docker_version,
            });
        }

        let candidates = [
            root.join(".devcontainer").join("devcontainer.json"),
            root.join(".devcontainer.json"),
            root.join(".devcontainer").join("Dockerfile"),
            root.join("Dockerfile"),
        ];

        for candidate in candidates {
            if !candidate.is_file() {
                continue;
            }

            let path_str = candidate.to_string_lossy().into_owned();
            let file_name = candidate.file_name().and_then(|s| s.to_str()).unwrap_or("");

            if file_name.ends_with(".json") {
                if let Ok(content) = fs::read_to_string(&candidate) {
                    let cleaned = strip_json_comments(&content);
                    if let Ok(raw) = serde_json::from_str::<RawDevContainerJson>(&cleaned) {
                        let dockerfile = raw.dockerfile.or_else(|| raw.build_obj.and_then(|b| b.dockerfile));
                        return Ok(DevContainerDetection {
                            detected: true,
                            config_path: Some(path_str),
                            config: Some(DevContainerConfig {
                                name: raw.name.or_else(|| Some("Dev Container".to_string())),
                                image: raw.image,
                                dockerfile,
                                forward_ports: raw.forward_ports,
                                workspace_folder: raw.workspace_folder,
                            }),
                            docker_available,
                            docker_version,
                        });
                    }
                }
            } else if file_name == "Dockerfile" {
                return Ok(DevContainerDetection {
                    detected: true,
                    config_path: Some(path_str.clone()),
                    config: Some(DevContainerConfig {
                        name: Some("Dockerfile Dev Container".to_string()),
                        image: None,
                        dockerfile: Some(path_str),
                        forward_ports: Vec::new(),
                        workspace_folder: None,
                    }),
                    docker_available,
                    docker_version,
                });
            }
        }

        Ok(DevContainerDetection {
            detected: false,
            config_path: None,
            config: None,
            docker_available,
            docker_version,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Deserialize)]
struct DockerPsLine {
    #[serde(alias = "ID")]
    id: Option<String>,
    #[serde(alias = "Names")]
    names: Option<String>,
    #[serde(alias = "Image")]
    image: Option<String>,
    #[serde(alias = "Status")]
    status: Option<String>,
    #[serde(alias = "Ports")]
    ports: Option<String>,
}

#[tauri::command]
pub async fn devcontainer_list_containers() -> Result<Vec<DockerContainer>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut cmd = docker_command();
        cmd.args(["ps", "--format", "{{json .}}"]);

        let out = cmd.output().map_err(|e| format!("Failed to run docker ps: {e}"))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
            return Err(err);
        }

        let stdout = String::from_utf8_lossy(&out.stdout);
        let mut containers = Vec::new();

        for line in stdout.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Ok(entry) = serde_json::from_str::<DockerPsLine>(trimmed) {
                containers.push(DockerContainer {
                    id: entry.id.unwrap_or_default(),
                    names: entry.names.unwrap_or_default(),
                    image: entry.image.unwrap_or_default(),
                    status: entry.status.unwrap_or_default(),
                    ports: entry.ports.unwrap_or_default(),
                });
            }
        }

        Ok(containers)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn devcontainer_start(
    workspace_path: String,
    image: Option<String>,
    dockerfile: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = Path::new(&workspace_path);
        let dir_name = root
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("workspace");
        let container_name = format!("novaterm-{}", dir_name.to_lowercase().replace(' ', "-"));

        // Check if container already exists
        let mut inspect_cmd = docker_command();
        inspect_cmd.args(["inspect", "--format", "{{.State.Status}}", &container_name]);

        if let Ok(out) = inspect_cmd.output() {
            if out.status.success() {
                let status = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if status == "running" {
                    return Ok(container_name);
                } else {
                    let mut start_cmd = docker_command();
                    start_cmd.args(["start", &container_name]);
                    let start_out = start_cmd.output().map_err(|e| e.to_string())?;
                    if start_out.status.success() {
                        return Ok(container_name);
                    }
                }
            }
        }

        // Determine image or build dockerfile
        let target_image = if let Some(img) = image.filter(|s| !s.trim().is_empty()) {
            img
        } else if let Some(df) = dockerfile.filter(|s| !s.trim().is_empty()) {
            let df_path = PathBuf::from(&df);
            let context_dir = df_path.parent().unwrap_or(root);
            let image_tag = format!("novaterm-img-{}:latest", dir_name.to_lowercase().replace(' ', "-"));

            let mut build_cmd = docker_command();
            build_cmd.args([
                "build",
                "-t",
                &image_tag,
                "-f",
                &df,
                &context_dir.to_string_lossy(),
            ]);

            let build_out = build_cmd
                .output()
                .map_err(|e| format!("Failed to build dev container: {e}"))?;

            if !build_out.status.success() {
                let err = String::from_utf8_lossy(&build_out.stderr).trim().to_string();
                return Err(format!("Docker build failed: {err}"));
            }

            image_tag
        } else {
            "mcr.microsoft.com/devcontainers/base:ubuntu".to_string()
        };

        // Run container in background mounted to /workspaces/<dir_name>
        let mount_arg = format!("{}:/workspaces/{}", workspace_path, dir_name);
        let mut run_cmd = docker_command();
        run_cmd.args([
            "run",
            "-d",
            "-it",
            "--name",
            &container_name,
            "-v",
            &mount_arg,
            "-w",
            &format!("/workspaces/{}", dir_name),
            &target_image,
            "/bin/sh",
        ]);

        let run_out = run_cmd
            .output()
            .map_err(|e| format!("Failed to run docker container: {e}"))?;

        if !run_out.status.success() {
            let err = String::from_utf8_lossy(&run_out.stderr).trim().to_string();
            return Err(format!("Docker run failed: {err}"));
        }

        Ok(container_name)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn validate_container_id(id: &str) -> Result<(), String> {
    let trimmed = id.trim();
    if trimmed.is_empty()
        || !trimmed.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
    {
        return Err(format!("Invalid container ID or name: '{id}'"));
    }
    Ok(())
}

pub fn docker_exec(container_id: &str, command: &str) -> Result<String, String> {
    validate_container_id(container_id)?;
    let mut cmd = docker_command();
    cmd.args(["exec", "-i", container_id, "sh", "-c", command]);

    let out = cmd.output().map_err(|e| format!("docker exec failed: {e}"))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(if err.is_empty() {
            format!("docker exec exited with status {}", out.status)
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

pub fn devcontainer_read_dir(
    container_id: &str,
    remote_path: &str,
    show_hidden: bool,
) -> Result<Vec<crate::modules::fs::tree::DirEntry>, String> {
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

    let output = match docker_exec(container_id, &py_script) {
        Ok(out) => out,
        Err(_) => {
            // Fallback to POSIX shell if python3 is missing in container
            let sh_script = format!(
                r#"ls -la {} 2>/dev/null | awk 'NR>3 {{print $9}}'"#,
                shell_quote(remote_path)
            );
            let raw_ls = docker_exec(container_id, &sh_script)?;
            let mut list = Vec::new();
            for name in raw_ls.lines() {
                let name = name.trim();
                if name.is_empty() || name == "." || name == ".." {
                    continue;
                }
                if !show_hidden && name.starts_with('.') {
                    continue;
                }
                list.push(crate::modules::fs::tree::DirEntry {
                    name: name.to_string(),
                    kind: crate::modules::fs::tree::EntryKind::File,
                    size: 0,
                    mtime: 0,
                    gitignored: false,
                });
            }
            return Ok(list);
        }
    };

    let parsed: Vec<RemoteDirItem> = serde_json::from_str(output.trim()).map_err(|e| {
        format!("Failed to parse container directory response: {e}. Output was: {output}")
    })?;

    let mut entries = Vec::with_capacity(parsed.len());
    for item in parsed {
        let kind = match item.kind.as_str() {
            "dir" => crate::modules::fs::tree::EntryKind::Dir,
            "symlink" => crate::modules::fs::tree::EntryKind::Symlink,
            _ => crate::modules::fs::tree::EntryKind::File,
        };
        entries.push(crate::modules::fs::tree::DirEntry {
            name: item.name,
            kind,
            size: item.size,
            mtime: item.mtime,
            gitignored: false,
        });
    }

    entries.sort_by(|a, b| {
        let a_is_dir = matches!(a.kind, crate::modules::fs::tree::EntryKind::Dir);
        let b_is_dir = matches!(b.kind, crate::modules::fs::tree::EntryKind::Dir);
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

pub fn devcontainer_read_file(
    container_id: &str,
    remote_path: &str,
) -> Result<crate::modules::fs::file::ReadResult, String> {
    let cmd = format!("cat {}", shell_quote(remote_path));
    let content = docker_exec(container_id, &cmd)?;
    let size = content.len() as u64;
    Ok(crate::modules::fs::file::ReadResult::Text { content, size })
}

pub fn devcontainer_write_file(
    container_id: &str,
    remote_path: &str,
    content: &str,
) -> Result<(), String> {
    validate_container_id(container_id)?;
    use std::io::Write;
    let mut cmd = docker_command();
    let shell_cmd = format!("cat > {}", shell_quote(remote_path));
    cmd.args(["exec", "-i", container_id, "sh", "-c", &shell_cmd]);
    cmd.stdin(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn docker write: {e}"))?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    }
    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err(format!("docker write failed with status {status}"));
    }
    Ok(())
}

pub fn devcontainer_create_file(container_id: &str, remote_path: &str) -> Result<(), String> {
    let cmd = format!("touch {}", shell_quote(remote_path));
    docker_exec(container_id, &cmd).map(|_| ())
}

pub fn devcontainer_create_dir(container_id: &str, remote_path: &str) -> Result<(), String> {
    let cmd = format!("mkdir -p {}", shell_quote(remote_path));
    docker_exec(container_id, &cmd).map(|_| ())
}

pub fn devcontainer_rename(container_id: &str, from: &str, to: &str) -> Result<(), String> {
    let cmd = format!("mv {} {}", shell_quote(from), shell_quote(to));
    docker_exec(container_id, &cmd).map(|_| ())
}

pub fn devcontainer_delete(container_id: &str, remote_path: &str) -> Result<(), String> {
    let cmd = format!("rm -rf {}", shell_quote(remote_path));
    docker_exec(container_id, &cmd).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_single_and_multi_line_comments() {
        let jsonc = r#"{
            // This is a comment
            "name": "Rust Dev",
            /* Multi-line
               comment */
            "image": "mcr.microsoft.com/devcontainers/rust:latest" // trailing comment
        }"#;

        let cleaned = strip_json_comments(jsonc);
        let parsed: serde_json::Value = serde_json::from_str(&cleaned).expect("valid json");
        assert_eq!(parsed["name"], "Rust Dev");
        assert_eq!(parsed["image"], "mcr.microsoft.com/devcontainers/rust:latest");
    }

    #[test]
    fn preserves_comment_markers_inside_strings() {
        let jsonc = r#"{"url": "https://example.com/test/*foo*/bar"}"#;
        let cleaned = strip_json_comments(jsonc);
        let parsed: serde_json::Value = serde_json::from_str(&cleaned).expect("valid json");
        assert_eq!(parsed["url"], "https://example.com/test/*foo*/bar");
    }
}
