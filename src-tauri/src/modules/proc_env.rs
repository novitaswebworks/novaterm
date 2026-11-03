//! GUI-launched apps get a bare PATH on macOS, and servers like
//! typescript-language-server need the user's PATH themselves to find
//! `node`. Capture the login shell env once, reuse for detect and spawn.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

#[cfg(unix)]
const CAPTURE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(10);

/// Login-shell variables that are safe to hand to third-party processes:
/// toolchain locations only, never credentials. Empty on Windows (the process
/// env is already the user env there) or if capture failed.
pub fn server_env_overlay() -> &'static HashMap<String, String> {
    static ENV: OnceLock<HashMap<String, String>> = OnceLock::new();
    ENV.get_or_init(|| filter_env(login_env_raw().clone()))
}

/// Overlay for the docker CLI itself, which legitimately needs its own
/// connection settings. Never given to MCP servers or other user code.
pub fn docker_env_overlay() -> &'static HashMap<String, String> {
    static ENV: OnceLock<HashMap<String, String>> = OnceLock::new();
    ENV.get_or_init(|| {
        let mut env = server_env_overlay().clone();
        for (k, v) in login_env_raw() {
            if DOCKER_CLIENT_VARS.contains(&k.as_str()) {
                env.insert(k.clone(), v.clone());
            }
        }
        env
    })
}

/// Complete environment for an untrusted child (an MCP server): the process
/// env reduced to the same allowlist, with the login-shell overlay on top.
/// Callers must `env_clear()` first, then apply this, then the server's own
/// configured variables.
pub fn sanitized_child_env() -> HashMap<String, String> {
    let mut env = filter_env(std::env::vars().collect());
    env.extend(server_env_overlay().clone());
    env
}

fn login_env_raw() -> &'static HashMap<String, String> {
    static RAW: OnceLock<HashMap<String, String>> = OnceLock::new();
    RAW.get_or_init(|| {
        #[cfg(unix)]
        {
            capture_login_env().unwrap_or_else(|| {
                log::warn!("proc_env: login shell env capture failed, using process env");
                HashMap::new()
            })
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

const DOCKER_CLIENT_VARS: &[&str] = &[
    "DOCKER_HOST",
    "DOCKER_CONTEXT",
    "DOCKER_CONFIG",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
];

const SAFE_EXACT: &[&str] = &[
    "PATH",
    "HOME",
    "SHELL",
    "USER",
    "LOGNAME",
    "LANG",
    "TERM",
    "TMPDIR",
    "TMP",
    "TEMP",
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
    // Windows basics a child needs to start at all.
    "PATHEXT",
    "SYSTEMROOT",
    "SYSTEMDRIVE",
    "WINDIR",
    "COMSPEC",
    "USERPROFILE",
    "USERNAME",
    "APPDATA",
    "LOCALAPPDATA",
    "PROGRAMDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "HOMEDRIVE",
    "HOMEPATH",
    "OS",
    "NUMBER_OF_PROCESSORS",
    "PROCESSOR_ARCHITECTURE",
];

const SAFE_PREFIXES: &[&str] = &[
    "LC_",
    "XDG_",
    "NVM_",
    "FNM_",
    "VOLTA_",
    "ASDF_",
    "MISE_",
    "HOMEBREW_",
];

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

fn is_safe_var(name: &str) -> bool {
    let upper = name.to_ascii_uppercase();
    if SECRET_MARKERS.iter().any(|m| upper.contains(m)) {
        return false;
    }
    SAFE_EXACT.contains(&upper.as_str()) || SAFE_PREFIXES.iter().any(|p| upper.starts_with(p))
}

fn filter_env(env: HashMap<String, String>) -> HashMap<String, String> {
    env.into_iter().filter(|(k, _)| is_safe_var(k)).collect()
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

    fn map(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn filter_keeps_toolchain_vars_and_drops_credentials() {
        let env = map(&[
            ("PATH", "/usr/bin"),
            ("NVM_DIR", "/home/u/.nvm"),
            ("LC_ALL", "C"),
            ("DOCKER_HOST", "unix:///sock"),
            ("DOCKER_CONFIG", "/home/u/.docker"),
            ("GITHUB_TOKEN", "ghp_x"),
            ("AWS_SECRET_ACCESS_KEY", "x"),
            ("OPENAI_API_KEY", "x"),
            ("DOCKER_AUTH_CONFIG", "{}"),
            ("HOMEBREW_GITHUB_API_TOKEN", "x"),
            ("DATABASE_URL", "postgres://u:p@h/db"),
        ]);
        let mut kept: Vec<String> = filter_env(env).into_keys().collect();
        kept.sort();
        assert_eq!(kept, ["LC_ALL", "NVM_DIR", "PATH"]);
    }

    #[test]
    fn filter_is_case_insensitive_for_windows_style_names() {
        let env = map(&[
            ("Path", "C:\\bin"),
            ("SystemRoot", "C:\\Windows"),
            ("Api_Key", "x"),
        ]);
        let mut kept: Vec<String> = filter_env(env).into_keys().collect();
        kept.sort();
        assert_eq!(kept, ["Path", "SystemRoot"]);
    }

    #[test]
    fn child_env_never_contains_process_credentials() {
        // SAFETY: test-only; unique variable names avoid cross-test races.
        unsafe {
            std::env::set_var("NOVATERM_TEST_SECRET_TOKEN", "leak");
            std::env::set_var("NOVATERM_TEST_PLAIN", "leak");
        }
        let env = sanitized_child_env();
        assert!(!env.contains_key("NOVATERM_TEST_SECRET_TOKEN"));
        assert!(!env.contains_key("NOVATERM_TEST_PLAIN"));
        assert!(env.contains_key("PATH"));
    }

    #[test]
    fn resolve_binary_rejects_empty_and_missing() {
        assert!(resolve_binary("").is_none());
        assert!(resolve_binary("   ").is_none());
        assert!(resolve_binary("novaterm-definitely-not-a-real-binary").is_none());
    }
}
