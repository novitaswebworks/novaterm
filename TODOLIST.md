# NovaTerm - Project Improvement and Release Todo List

This file tracks the active implementation roadmap, next milestones, and planned engineering enhancements for NovaTerm.

---

## Active Release Milestones

### [x] v1.4.0 - Security Hardening and Package Distribution
- [x] Publish clean release across macOS (.dmg), Windows (.msi, setup.exe), and Linux (.deb, .rpm, .AppImage).
- [x] Official Microsoft WinGet submission (NovitasWebWorks.NovaTerm v1.4.0 via PR #442458).
- [x] Official Chocolatey submission with CDN icon URL and exact verification checksums.
- [x] Remove legacy Snapcraft and Flathub store clutter in favor of clean native binary distribution.
- [x] Revoke exposed tokens and harden .gitignore against credentials, certificates, and reports.

### [x] v1.5.0 - Semantic Shell Integration, Default Blocks, and Automated AI Error Diagnosis
- [x] **Universal Block Terminal Default**: Default all new tabs, initial workspace boots, and space restores to modern command block mode (`blocks: true`).
- [x] **Automated Fix with AI Dispatch**: Clicking the inline "Fix with AI" button on any non-zero exit code automatically extracts the command and terminal error output, opens the AI Assistant window, and immediately dispatches the diagnostic message so the AI starts solving the error in real time.
- [x] **One-Click Quick Copy Toolbar**: Instant 1-click "Output" copy button added directly to block headers, bypassing nested dropdown menus.
- [x] **OSC 133 Shell Hooks**: Full lifecycle tracking (prompt start A, command input B, pre-exec C, command exit code D) across Bash, Zsh, Fish, and PowerShell.
- [x] **Execution Telemetry**: Block-level execution duration display and failure state indicators.

### [ ] v1.6.0 - Split Panes and Workspace Layout Persistence
- [ ] **Interactive Split Panes**: Vertical (Cmd+D) and horizontal (Cmd+Shift+D) terminal splitting per workspace tab.
- [ ] **Layout Session Restore**: Persist active split configuration, working directories, and open editor tabs across application restarts via Tauri Store.
- [ ] **Pane Synchronization**: Optional synchronous input broadcasting across selected split panes (useful for cluster operations / multi-server SSH).

### [x] v1.7.0 - Model Context Protocol (MCP) Host Architecture
- [x] **MCP Client Core**: Enable NovaTerm to host and connect to Model Context Protocol (MCP) servers defined in novaterm.workspace.json or global settings.
- [x] **Developer Tooling Ecosystem**: Out-of-the-box MCP connectors for PostgreSQL/Neon, Docker/Podman, GitHub API, and Snyk security scanning.
- [x] **Agentic Tool Dynamic Discovery**: Let the AI assistant query databases, list container logs, and inspect PRs directly from the terminal without leaving the app.

### [x] v1.8.0 - Remote Environments (SSH and Dev Containers)
- [x] **Remote SSH Workspaces**: Seamless SSH session management with remote file tree browsing and remote terminal PTYs.
- [x] **Dev Container Attachment**: Detect .devcontainer/devcontainer.json or Dockerfile and offer one-click container execution and file editing.
- [x] **Port Forwarding Dashboard**: Surface active listening ports from local dev servers or SSH sessions with 1-click browser preview opening.

### [x] v2.0.0 - Universal Remote Development and MCP Intelligence Architecture
- [x] **Major Version Release**: Consolidated release of Model Context Protocol (v1.7.0) and full Remote Development Subsystems (v1.8.0).
- [x] **Remote SSH & Container Resilience**: Hardened remote path resolution, non-zero exit handlers, and tilde directory expansion across Linux servers and cloud hosts.
- [x] **Unified Workspace Environment Bar**: Universal workspace selector supporting Local, WSL, SSH hosts (with built-in connection verification modal), and DevContainers.

---

## Additional Innovative Suggestions for Developers and Engineers

### 1. "Time Machine" Output Replay and Diff
- **Concept**: Replay terminal build outputs step-by-step or view a visual diff between two command runs (e.g. comparing the logs of a failed npm test against the previous passing run to instantly isolate regressions).

### 2. Auto-Detect Compiler Errors and Jump-to-Definition
- **Concept**: Parse terminal error stack traces (Rust `src/main.rs:14:5`, TypeScript `src/index.ts(23,10)`, Python `File "app.py", line 42`) into clickable links that jump straight to the exact line in NovaTerm's built-in CodeMirror editor.

### 3. Integrated Secret and Environment Variable Masking
- **Concept**: Automatically redact sensitive tokens, API keys, passwords, and .env values from terminal scrollback buffers so they never leak in screen shares, recordings, or AI prompts.

### 4. Interactive Command Palette and Smart History (Ctrl+R)
- **Concept**: Replace the default shell history reverse-search with a rich, fuzzy search popup powered by nucleo-matcher that previews directory context, execution timestamps, and frequency ranking.

### 5. Multi-Tab Session Broadcasting and Quick Scratchpad
- **Concept**: A toggleable slide-over scratchpad note for running command snippets, temporary notes, or shell snippets right beside active terminal tabs.
