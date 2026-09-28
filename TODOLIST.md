# NovaTerm — Project Improvement & Release Todo List

This file tracks the active implementation roadmap, next milestones, and planned engineering enhancements for NovaTerm.

---

## 🚀 Active Release Milestones

### [x] v1.4.0 — Security Hardening & Package Distribution
- [x] Publish clean release across macOS (`.dmg`), Windows (`.msi`, `setup.exe`), and Linux (`.deb`, `.rpm`, `.AppImage`).
- [x] Official Microsoft WinGet submission (`NovitasWebWorks.NovaTerm` v1.4.0 via PR #442458).
- [x] Official Chocolatey submission with CDN icon URL and exact verification checksums.
- [x] Remove legacy Snapcraft and Flathub store clutter in favor of clean native binary distribution.
- [x] Revoke exposed tokens and harden `.gitignore` against credentials, certificates, and reports.

### [x] v1.5.0 — Semantic Shell Integration & Command Block Intelligence
- [x] **Smart AI Error Assistant:** Inline "Fix with AI" pill in the command block toolbar when a command exits with code `!= 0`. Automatically grabs the command and error output, formats targeted diagnostic prompts, and opens the AI sidecar with one click.
- [x] **One-Click Quick Copy Toolbar:** Instant 1-click "Copy Output" button added directly to block headers, bypassing nested dropdown menus.
- [x] **OSC 133 Shell Hooks:** Full lifecycle tracking (prompt start `A`, command input `B`, pre-exec `C`, command exit code `D`) across Bash, Zsh, Fish, and PowerShell.
- [x] **Execution Telemetry:** Block-level execution duration display and failure state indicators.

### [ ] v1.6.0 — Split Panes & Workspace Layout Persistence
- [ ] **Interactive Split Panes:** Vertical (`Cmd+D`) and horizontal (`Cmd+Shift+D`) terminal splitting per workspace tab.
- [ ] **Layout Session Restore:** Persist active split configuration, working directories, and open editor tabs across application restarts via Tauri Store.
- [ ] **Pane Synchronization:** Optional synchronous input broadcasting across selected split panes (useful for cluster operations / multi-server SSH).

### [ ] v1.7.0 — Model Context Protocol (MCP) Host Architecture
- [ ] **MCP Client Core:** Enable NovaTerm to host and connect to Model Context Protocol (MCP) servers defined in `novaterm.workspace.json` or global settings.
- [ ] **Developer Tooling Ecosystem:** Out-of-the-box MCP connectors for PostgreSQL/Neon, Docker/Podman, GitHub API, and Snyk security scanning.
- [ ] **Agentic Tool Dynamic Discovery:** Let the AI assistant query databases, list container logs, and inspect PRs directly from the terminal without leaving the app.

### [ ] v1.8.0 — Remote Environments (SSH & Dev Containers)
- [ ] **Remote SSH Workspaces:** Seamless SSH session management with remote file tree browsing and remote terminal PTYs.
- [ ] **Dev Container Attachment:** Detect `.devcontainer/devcontainer.json` or `Dockerfile` and offer one-click container execution and file editing.
- [ ] **Port Forwarding Dashboard:** Surface active listening ports from local dev servers or SSH sessions with 1-click browser preview opening.

---

## 💡 Additional Innovative Suggestions for Developers & Engineers

### 1. "Time Machine" Output Replay & Diff
- **Concept:** Replay terminal build outputs step-by-step or view a visual diff between two command runs (e.g. comparing the logs of a failed `npm test` against the previous passing run to instantly isolate regressions).

### 2. Auto-Detect Compiler Errors & Jump-to-Definition
- **Concept:** Parse terminal error stack traces (Rust `src/main.rs:14:5`, TypeScript `src/index.ts(23,10)`, Python `File "app.py", line 42`) into clickable links that jump straight to the exact line in NovaTerm's built-in CodeMirror editor.

### 3. Integrated Secret & Environment Variable Masking
- **Concept:** Automatically redact sensitive tokens, API keys, passwords, and `.env` values from terminal scrollback buffers so they never leak in screen shares, recordings, or AI prompts.

### 4. Interactive Command Palette & Smart History (`Ctrl+R`)
- **Concept:** Replace the default shell history reverse-search with a rich, fuzzy search popup powered by `nucleo-matcher` that previews directory context, execution timestamps, and frequency ranking.

### 5. Multi-Tab Session Broadcasting & Quick Scratchpad
- **Concept:** A toggleable slide-over scratchpad note for running command snippets, temporary notes, or shell snippets right beside active terminal tabs.
