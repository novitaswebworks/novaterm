<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="NovaTerm" />
  <h1>NovaTerm</h1>
  <p><strong>A Next-Generation, AI-Native Terminal Workspace</strong></p>
  
  <p>
    <img src="https://img.shields.io/github/v/release/novitaswebworks/novaterm?label=version&color=blue" alt="version" />
    <img src="https://img.shields.io/github/license/novitaswebworks/novaterm?color=blue" alt="license" />
  </p>

  <p>
    Built by <strong>Novitas WebWorks</strong>
  </p>
</div>

---

## ⚡ Overview

NovaTerm is a high-performance, lightweight, and extensible AI-native terminal emulator designed for modern workflows. Built on top of **Tauri v2 (Rust)** and **React 19**, it brings together a fully functional native PTY backend with a blazingly fast WebGL renderer. 

Instead of juggling multiple tools, NovaTerm unifies your workspace:
- 💻 **Native Terminal:** High-performance rendering via `xterm.js` and Rust's `portable-pty`.
- 🤖 **Agentic AI:** A built-in AI side-panel that can read your project context, write files, and safely execute bash commands with your approval.
- 📝 **Code Editor:** Built-in editor powered by CodeMirror, complete with syntax highlighting and multi-file editing.
- 📁 **File Explorer:** Visual file management, Git graphs, and source control integration right next to your command line.

Weighing in at under 10MB on disk, it is lightweight, lightning-fast (300ms cold start), and deeply customizable.

## ✨ Features

- **Blazing Fast:** Written in Rust and optimized for speed.
- **Cross-Platform:** Available on Windows, macOS, and Linux.
- **Agentic Workflows:** Let the AI plan tasks, read your workspace, and draft code using `NOVATERM.md` context.
- **Zero Telemetry:** Your data, your keys, your machine. Completely local and private by default.
- **BYOK & Local LLMs:** Plug in your own API keys for cloud providers, or connect seamlessly to local models using Ollama, LM Studio, and MLX.

## 📊 Repository Insights

[![Total Views](https://img.shields.io/badge/Total_Views-230-blue?style=for-the-badge&logo=github)](https://github.com/ambaskaryash/NovaTerm)
[![Total Clones](https://img.shields.io/badge/Total_Clones-212-success?style=for-the-badge&logo=github)](https://github.com/ambaskaryash/NovaTerm)
[![Unique Visitors](https://img.shields.io/badge/Unique_Visitors-9-orange?style=for-the-badge)](https://github.com/ambaskaryash/NovaTerm)

*A brief overview of community engagement and repository activity during the launch phase.*

### 📈 Activity Highlights

During our major release week (August 24 - 27, 2026), NovaTerm experienced a significant surge in community interest following releases across platforms like Snapcraft.

| Metric | Count | Context |
|:---|:---:|:---|
| **Total Views** | 230 | High visibility during community announcements. |
| **Total Clones** | 212 | Strong conversion rate from view to clone. |
| **Unique Visitors** | 9 | Core audience exploring the repository. |
| **Unique Cloners** | 64 | Includes automated CI/CD and bot traffic for testing (Chocolatey, Winget, etc.). |

#### Traffic Timeline

```mermaid
xychart-beta
    title "Recent Views & Clones (Aug 24 - Aug 27)"
    x-axis ["Aug 24", "Aug 25", "Aug 26", "Aug 27"]
    y-axis "Count" 0 --> 130
    bar [1, 100, 82, 25]
    line [1, 129, 78, 20]
```
*(**Bars:** Clones / Downloads | **Line:** Page Views)*

> [!NOTE]
> **Community Growth:** The spike on August 25th directly correlates with community outreach and new releases. The high number of clones indicates strong interest in trying the software locally, while automated systems actively build and test our latest versions!

## 🚀 Installation

NovaTerm supports automatic cross-compilation via GitHub actions. Download the latest installer for your OS from the [Releases](https://github.com/novitaswebworks/novaterm/releases) page.

- **macOS:** Use Homebrew `brew tap novitaswebworks/tap && brew install novaterm` or download the universal `.dmg`
- **Windows:** Download the `.msi` or `.exe` installer
- **Linux:** Use the `.deb`, `.rpm`, or `.AppImage` (Note: Currently built for `x86_64` / `amd64` architecture)

*Note: On Windows, you may encounter a "Windows protected your PC" prompt because the binary is not currently code-signed. Click **More info** -> **Run anyway**.*

## 🛠️ Development

Want to build NovaTerm from source?

### Prerequisites
- [Node.js](https://nodejs.org) (v22+)
- [pnpm](https://pnpm.io) (v11+)
- [Rust](https://rustup.rs) (Stable)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/novitaswebworks/novaterm.git
   cd novaterm
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm tauri dev
   ```

4. Build for production:
   ```bash
   pnpm tauri build
   ```

## 🤝 Contributing

Contributions are always welcome! Whether it's reporting bugs, discussing features, or submitting pull requests, we value the community's input. Please check the `CONTRIBUTING.md` file for guidelines.

## 📄 License

NovaTerm is licensed under the Apache-2.0 License. Copyright 2026 Novitas WebWorks. See the [LICENSE](LICENSE) file for full details.
