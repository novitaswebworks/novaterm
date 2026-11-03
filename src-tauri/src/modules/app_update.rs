//! Detects that the installed app was replaced on disk (brew, winget, a deb or
//! rpm upgrade, an AppImage swap) and relaunches into the new build. The
//! running process keeps the old code in memory, so the frontend polls this and
//! decides when restarting is safe.

use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::SystemTime;

use tauri::{AppHandle, State};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileSignature {
    len: u64,
    modified: Option<SystemTime>,
    /// A replacement is a new file, so its creation time moves even when an
    /// installer keeps the same size and modification time (common on Windows).
    created: Option<SystemTime>,
    #[cfg(unix)]
    dev: u64,
    #[cfg(unix)]
    ino: u64,
}

pub fn signature(path: &Path) -> Option<FileSignature> {
    let meta = std::fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    #[cfg(unix)]
    let (dev, ino) = {
        use std::os::unix::fs::MetadataExt;
        (meta.dev(), meta.ino())
    };
    Some(FileSignature {
        len: meta.len(),
        modified: meta.modified().ok(),
        created: meta.created().ok(),
        #[cfg(unix)]
        dev,
        #[cfg(unix)]
        ino,
    })
}

/// Linux reports a replaced executable as "/path/app (deleted)".
fn strip_deleted_suffix(path: PathBuf) -> PathBuf {
    let s = path.to_string_lossy();
    match s.strip_suffix(" (deleted)") {
        Some(clean) => PathBuf::from(clean),
        None => path,
    }
}

/// The file whose replacement means "a new version was installed". An
/// AppImage runs from a temporary mount, so the AppImage file itself is the
/// thing that gets swapped.
fn watched_path() -> Option<PathBuf> {
    #[cfg(target_os = "linux")]
    if let Some(image) = std::env::var_os("APPIMAGE") {
        let image = PathBuf::from(image);
        if image.is_file() {
            return Some(image);
        }
    }
    std::env::current_exe().ok().map(strip_deleted_suffix)
}

/// A changed file counts only once it stops changing, so a half-written
/// installer copy never triggers a restart into a broken binary.
fn settled(
    baseline: &Option<FileSignature>,
    previous: &Option<FileSignature>,
    now: &Option<FileSignature>,
) -> bool {
    match (baseline, previous, now) {
        (Some(base), Some(prev), Some(now)) => now != base && now == prev,
        _ => false,
    }
}

fn app_bundle_of(path: &Path) -> Option<PathBuf> {
    path.ancestors()
        .find(|p| p.extension().is_some_and(|e| e == "app"))
        .map(Path::to_path_buf)
}

pub fn relaunch_command(path: &Path, args: &[String]) -> (OsString, Vec<OsString>) {
    #[cfg(target_os = "macos")]
    if let Some(bundle) = app_bundle_of(path) {
        let mut argv: Vec<OsString> = vec!["-n".into(), bundle.into_os_string()];
        if !args.is_empty() {
            argv.push("--args".into());
            argv.extend(args.iter().map(OsString::from));
        }
        return ("open".into(), argv);
    }
    (
        path.as_os_str().to_owned(),
        args.iter().map(OsString::from).collect(),
    )
}

pub struct AppUpdateWatch {
    path: Option<PathBuf>,
    baseline: Option<FileSignature>,
    last_seen: Mutex<Option<FileSignature>>,
}

impl AppUpdateWatch {
    pub fn capture() -> Self {
        let path = watched_path();
        let baseline = path.as_deref().and_then(signature);
        Self {
            path,
            last_seen: Mutex::new(baseline.clone()),
            baseline,
        }
    }
}

#[tauri::command]
pub fn app_updated_on_disk(state: State<'_, AppUpdateWatch>) -> bool {
    let now = state.path.as_deref().and_then(signature);
    let mut last = state.last_seen.lock().unwrap_or_else(|e| e.into_inner());
    let ready = settled(&state.baseline, &last, &now);
    *last = now;
    ready
}

#[tauri::command]
pub fn relaunch_app(app: AppHandle, state: State<'_, AppUpdateWatch>) -> Result<(), String> {
    let path = state
        .path
        .clone()
        .ok_or_else(|| "cannot resolve the application path".to_string())?;
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (program, argv) = relaunch_command(&path, &args);

    let mut cmd = Command::new(program);
    cmd.args(argv);
    #[cfg(unix)]
    unsafe {
        use std::os::unix::process::CommandExt;
        cmd.pre_exec(|| {
            libc::setsid();
            Ok(())
        });
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS
        cmd.creation_flags(0x0000_0200 | 0x0000_0008);
    }
    cmd.spawn()
        .map_err(|e| format!("relaunch failed for {}: {e}", path.display()))?;
    app.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn signature_changes_when_file_is_rewritten() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("app");
        std::fs::write(&p, b"v1").unwrap();
        let before = signature(&p).unwrap();
        std::fs::write(&p, b"version two").unwrap();
        assert_ne!(before, signature(&p).unwrap());
    }

    #[cfg(unix)]
    #[test]
    fn signature_changes_when_file_is_replaced_by_rename() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("app");
        std::fs::write(&p, b"same").unwrap();
        let before = signature(&p).unwrap();
        let staged = dir.path().join("app.new");
        let mut f = std::fs::File::create(&staged).unwrap();
        f.write_all(b"same").unwrap();
        drop(f);
        std::fs::rename(&staged, &p).unwrap();
        assert_ne!(before, signature(&p).unwrap());
    }

    #[test]
    fn missing_file_has_no_signature() {
        assert!(signature(Path::new("/definitely/not/here")).is_none());
    }

    #[test]
    fn settled_requires_change_and_stability() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("app");
        std::fs::write(&p, b"v1").unwrap();
        let base = signature(&p);
        std::fs::write(&p, b"version two").unwrap();
        let changed = signature(&p);

        assert!(!settled(&base, &base, &base), "unchanged is not an update");
        assert!(
            !settled(&base, &base, &changed),
            "first sight is not stable"
        );
        assert!(settled(&base, &changed, &changed), "stable change is ready");
        assert!(!settled(&base, &changed, &None), "mid-install gap waits");
    }

    #[test]
    fn deleted_suffix_is_stripped() {
        assert_eq!(
            strip_deleted_suffix(PathBuf::from("/usr/bin/novaterm (deleted)")),
            PathBuf::from("/usr/bin/novaterm")
        );
        assert_eq!(
            strip_deleted_suffix(PathBuf::from("/usr/bin/novaterm")),
            PathBuf::from("/usr/bin/novaterm")
        );
    }

    #[test]
    fn bundle_is_found_from_the_inner_executable() {
        assert_eq!(
            app_bundle_of(Path::new(
                "/Applications/NovaTerm.app/Contents/MacOS/novaterm"
            )),
            Some(PathBuf::from("/Applications/NovaTerm.app"))
        );
        assert_eq!(app_bundle_of(Path::new("/usr/bin/novaterm")), None);
    }

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn relaunch_runs_the_executable_with_original_args() {
        let (program, argv) = relaunch_command(Path::new("/usr/bin/novaterm"), &["/work".into()]);
        assert_eq!(program, OsString::from("/usr/bin/novaterm"));
        assert_eq!(argv, vec![OsString::from("/work")]);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn relaunch_opens_the_bundle_on_macos() {
        let (program, argv) = relaunch_command(
            Path::new("/Applications/NovaTerm.app/Contents/MacOS/novaterm"),
            &["/work".into()],
        );
        assert_eq!(program, OsString::from("open"));
        assert_eq!(
            argv,
            vec![
                OsString::from("-n"),
                OsString::from("/Applications/NovaTerm.app"),
                OsString::from("--args"),
                OsString::from("/work"),
            ]
        );
    }
}
