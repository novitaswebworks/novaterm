# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-09-29

### Fixed
- Fixed Docker container discovery on macOS by properly resolving docker binary in GUI application environment.
- Fixed devcontainer PTY terminal session spawn using resolved docker executable path.
- Added loading indicator and refresh action to Docker Attach container picker dialog.

## [2.0.0] - 2026-09-29

### Added
- Model Context Protocol (MCP) client integration with stdio and SSE transport support.
- Remote Development support for SSH workspaces and Docker DevContainers.
- Port Forwarding manager with live traffic and status monitoring.
- Updated Settings view with live release notes and update check.

### Changed
- Universal binary distribution for Apple Silicon and Intel macOS architectures.
- Terminal performance enhancements and reduced memory consumption.

## [1.1.4] - 2026-07-07

### Added
- Replaced the application logo with a new, highly minimal sunset cursor ring design.
- Generated comprehensive set of new application icons for macOS, Windows, Linux, Android, and iOS using Tauri.
- Added a `CHANGELOG.md` file to track release history and improvements.

### Changed
- Bumped application version to `1.1.4` in `package.json`, `Cargo.toml`, and `tauri.conf.json`.
