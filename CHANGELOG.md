# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-03

### Removed
- Language server (LSP) support, including the editor status pill, the Settings group and format on save. NovaTerm is now terminal-first.
- The git history graph tab and its entry points. Use the Source Control panel for working-tree changes.

### Changed
- MCP servers now start with an empty environment plus a small allowlist of toolchain variables (such as `PATH`). A server that relied on a variable from your shell profile or the app environment must have it set in its own configuration.

### Fixed
- Adding or editing an MCP server now validates its environment and arguments: numeric environment values are accepted, malformed JSON, arrays and unclosed quotes are rejected, duplicate identifiers are refused, and arguments containing spaces are preserved.
- Shell autocomplete now works with named OpenAI-compatible endpoints, and deleting the endpoint selected for autocomplete resets the selection.

### Security
- Credentials held by the app process or the login shell are no longer passed to MCP servers.

## [2.1.0] - 2026-11-03

### Added
- Claude Fable 5.1, Claude Opus 5.5, Claude Sonnet 5.5 and Claude Haiku 5.5 are now available in the AI model picker.

### Changed
- Updated AI SDK to v7 and all AI provider packages to their latest major versions.
- Updated Tauri plugins and the Rust dependency tree to their latest compatible releases.
- Updated build and test tooling, including TypeScript 7, Vitest 5 and Babel 8.

### Security
- Resolved all fixable npm dependency advisories, including critical issues in `dompurify` and `proxy-addr`, and high-severity issues in `vite`, `undici` and `zod`.

## [2.0.2] - 2026-09-29

### Fixed
- Fixed Debian package compatibility on Kali Linux, Ubuntu 24.04+, and Debian 13 by adding 64-bit time_t (t64) package alternatives to deb dependencies.

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
