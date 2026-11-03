//! GUI-launched apps get a bare PATH on macOS, and servers like
//! typescript-language-server need the user's PATH themselves to find
//! `node`. Capture the login shell env once, reuse for detect and spawn.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

#[cfg(unix)]
const CAPTURE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// Only toolchain-location variables from the login shell, never credentials:
/// the overlay is handed to MCP servers and other third-party processes.
/// Empty on Windows (full user env is inherited there) or if capture failed.
pub fn server_env_overlay() -> &'static HashMap<String, String> {
    static ENV: OnceLock<HashMap<String, String>> = OnceLock::new();
    ENV.get_or_init(|| {
        #[cfg(unix)]
        {
            match capture_login_env() {
                Some(env) => filter_overlay(env),
                None => {
                    log::warn!("proc_env: login shell env capture failed, using process env");
                    HashMap::new()
                }
            }
        }
        #[cfg(windows)]
        {
            HashMap::new()
        }
    })
}

pub fn resolve_binary(command: &str) -> Option<PathBuf> {
    let command = command.trim();
    if command.is_empty() {
        return None;
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("/"));
    let path = server_env_overlay()
        .get("PATH")
        .cloned()
        .or_else(|| std::env::var("PATH").ok());
    which::which_in(command, path, cwd).ok()
}

#[cfg(unix)]
const OVERLAY_EXACT: &[&str] = &[
    "PATH",
    "SHELL",
    "USER",
    "LOGNAME",
    "LANG",
    "TMPDIR",
    "CARGO_HOME",
    "RUSTUP_HOME",
    "GOPATH",
    "GOROOT",
    "GOBIN",
    "JAVA_HOME",
    "ANDROID_HOME",
    "ANDROID_SDK_ROOT",
    "GEM_HOME",
    "GEM_PATH",
    "BUN_INSTALL",
    "PNPM_HOME",
    "DENO_INSTALL",
    "PYENV_ROOT",
    "RBENV_ROOT",
    "SDKMAN_DIR",
];

#[cfg(unix)]
const OVERLAY_PREFIXES: &[&str] = &[
    "LC_",
    "XDG_",
    "NVM_",
    "FNM_",
    "VOLTA_",
    "ASDF_",
    "MISE_",
    "DOCKER_",
    "HOMEBREW_",
];

#[cfg(unix)]
const SECRET_MARKERS: &[&str] = &[
    "TOKEN",
    "SECRET",
    "PASSWORD",
    "PASSWD",
    "KEY",
    "CREDENTIAL",
    "AUTH",
    "COOKIE",
    "SESSION",
];

#[cfg(unix)]
fn is_safe_overlay_var(name: &str) -> bool {
    let upper = name.to_ascii_uppercase();
    if SECRET_MARKERS.iter().any(|m| upper.contains(m)) {
        return false;
    }
    OVERLAY_EXACT.contains(&name) || OVERLAY_PREFIXES.iter().any(|p| name.starts_with(p))
}

#[cfg(unix)]
fn filter_overlay(env: HashMap<String, String>) -> HashMap<String, String> {
    env.into_iter()
        .filter(|(k, _)| is_safe_overlay_var(k))
        .collect()
}

#[cfg(unix)]
fn capture_login_env() -> Option<HashMap<String, String>> {
    use shared_child::SharedChild;
    use std::io::Read;
    use std::process::{Command, Stdio};
    use std::sync::mpsc;
    use std::sync::Arc;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into());
    let mut cmd = Command::new(&shell);
    cmd.args(["-l", "-c", "/usr/bin/env -0"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

    let child = Arc::new(SharedChild::spawn(&mut cmd).ok()?);
    let mut stdout = child.take_stdout()?;
    let (tx, rx) = mpsc::channel();
    std::thread::Builder::new()
        .name("novaterm-proc-env-capture".into())
        .spawn(move || {
            let mut buf = Vec::with_capacity(8 * 1024);
            let _ = stdout.read_to_end(&mut buf);
            let _ = tx.send(buf);
        })
        .ok()?;

    let bytes = match rx.recv_timeout(CAPTURE_TIMEOUT) {
        Ok(b) => {
            let _ = child.wait();
            b
        }
        Err(_) => {
            log::warn!("proc_env: login shell env capture timed out after {CAPTURE_TIMEOUT:?}");
            let _ = child.kill();
            let _ = child.wait();
            return None;
        }
    };

    let env: HashMap<String, String> = bytes
        .split(|&b| b == 0)
        .filter(|chunk| !chunk.is_empty())
        .filter_map(|chunk| {
            let s = std::str::from_utf8(chunk).ok()?;
            let (k, v) = s.split_once('=')?;
            if k.is_empty() {
                return None;
            }
            Some((k.to_string(), v.to_string()))
        })
        .collect();
    if env.is_empty() {
        return None;
    }
    Some(env)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    #[test]
    fn resolve_binary_finds_sh() {
        let p = resolve_binary("sh").expect("sh must resolve");
        assert!(p.is_absolute());
    }

    #[test]
    fn overlay_keeps_toolchain_vars_and_drops_credentials() {
        let env: HashMap<String, String> = [
            ("PATH", "/usr/bin"),
            ("NVM_DIR", "/home/u/.nvm"),
            ("LC_ALL", "C"),
            ("DOCKER_HOST", "unix:///sock"),
            ("GITHUB_TOKEN", "ghp_x"),
            ("AWS_SECRET_ACCESS_KEY", "x"),
            ("OPENAI_API_KEY", "x"),
            ("DOCKER_AUTH_CONFIG", "{}"),
            ("HOMEBREW_GITHUB_API_TOKEN", "x"),
            ("DATABASE_URL", "postgres://u:p@h/db"),
        ]
        .into_iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();
        let mut kept: Vec<String> = filter_overlay(env).into_keys().collect();
        kept.sort();
        assert_eq!(kept, ["DOCKER_HOST", "LC_ALL", "NVM_DIR", "PATH"]);
    }

    #[test]
    fn resolve_binary_rejects_empty_and_missing() {
        assert!(resolve_binary("").is_none());
        assert!(resolve_binary("   ").is_none());
        assert!(resolve_binary("novaterm-definitely-not-a-real-binary").is_none());
    }
}
