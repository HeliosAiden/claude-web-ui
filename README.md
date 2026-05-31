# Claude Web UI

A desktop and mobile UI for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Cursor CLI](https://docs.cursor.com/en/cli/overview), [Codex](https://developers.openai.com/codex), [Gemini-CLI](https://geminicli.com/), and [Free Claude Code](https://github.com/Alishahryar1/free-claude-code). Use it locally or remotely to view your active projects and sessions from everywhere.

*A fork of [Claude Code UI](https://github.com/siteboon/claudecodeui) with built-in support for Free Claude Code (FCC) integration.*

[Bug Reports](https://github.com/HeliosAiden/claude-web-ui/issues) · [Contributing](CONTRIBUTING.md)

*English · [Русский](./README.ru.md) · [Deutsch](./README.de.md) · [한국어](./README.ko.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [Türkçe](./README.tr.md)*

## Features

- **Responsive Design** - Works seamlessly across desktop, tablet, and mobile so you can also use Agents from mobile 
- **Interactive Chat Interface** - Built-in chat interface for seamless communication with the Agents
- **Integrated Shell Terminal** - Direct access to the Agents CLI through built-in shell functionality
- **File Explorer** - Interactive file tree with syntax highlighting and live editing
- **Git Explorer** - View, stage and commit your changes. You can also switch branches 
- **Session Management** - Resume conversations, manage multiple sessions, and track history
- **Plugin System** - Extend Claude Web UI with custom plugins — add new tabs, backend services, and integrations. [Build your own →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)
- **Activity Bar Navigation** — VSCode-style vertical activity bar for switching between Explorer, Bookmarks, Search, Git, and Settings views
- **Session Tabs** — Tmux-like horizontal tab bar for open chat/shell sessions with provider logos, status dots, and close buttons
- **Chat Find (Ctrl+F)** — Search text across all messages in the current conversation with match navigation and highlighting
- **Free Claude Code (FCC) Integration** - Built-in support for Free Claude Code. Auto-discovers FCC configuration, falls back to the `fcc-claude` CLI, and uses FCC auth tokens — no manual setup needed
- **Prompt Templates** - Create, edit, and insert reusable prompt templates from Settings. Save any message as a template with one click. Searchable template picker in the chat composer
- **Thinking Modes** - Toggle between normal, think-hard, and think-harder modes (Claude provider) directly from the chat composer toolbar
- **Settings Dashboard** - Manage credentials, prompt templates, plugins, themes, language, and provider configurations from a central Settings page
- **Model Compatibility** - Works with Claude, GPT, and Gemini model families (see [`shared/modelConstants.js`](shared/modelConstants.js) for the full list of supported models)


## Free Claude Code (FCC) Integration

This fork includes built-in support for [Free Claude Code](https://github.com/Alishahryar1/free-claude-code), allowing you to use Claude Code without an Anthropic subscription. FCC acts as a local proxy between the Claude SDK and alternative API providers.

### How It Works

When you launch Claude Web UI, it detects your FCC setup from multiple sources, checked in priority order:

1. **Shell environment** — `export ANTHROPIC_BASE_URL=http://127.0.0.1:8082`
2. **CLI flags** — `--anthropic-base-url http://127.0.0.1:8082 --anthropic-auth-token mytoken`
3. **Project `.env`** — place a `.env` file in your working directory
4. **Global config** — `~/.config/claude-web-ui/.env` (set once, applies everywhere)
5. **FCC auto-discovery** — `~/.config/free-claude-code/.env` loaded automatically, with conflicting variables (PORT, HOST, etc.) safely skipped

Once configured, the integration works through several layers:

- **API routing** — when `ANTHROPIC_BASE_URL` points to a local FCC proxy, API calls are routed through FCC instead of directly to `api.anthropic.com`
- **CLI path fallback** — if the standard `claude` CLI is not found, the server falls back to the `fcc-claude` command automatically
- **Auth token detection** — FCC auth tokens are recognized and show as "Free Claude Code" in the authentication status
- **Clean separation** — FCC config is read-only; this fork never modifies your FCC environment

### Setup

1. Install and configure [Free Claude Code](https://github.com/Alishahryar1/free-claude-code) on your machine
2. Configure Claude Web UI to use your FCC proxy — choose one of these methods:

   **CLI flags** (one-off):
   ```
   npx @heliosaiden/claude-web-ui --anthropic-base-url http://127.0.0.1:8082
   ```

   **Project `.env` file** (per-project):
   ```
   echo "ANTHROPIC_BASE_URL=http://127.0.0.1:8082" > .env
   npx @heliosaiden/claude-web-ui
   ```

   **Global config** (set once, works everywhere):
   ```
   mkdir -p ~/.config/claude-web-ui
   echo "ANTHROPIC_BASE_URL=http://127.0.0.1:8082" >> ~/.config/claude-web-ui/.env
   ```

   **FCC auto-discovery** (zero config):
   If your FCC `.env` is at `~/.config/free-claude-code/.env`, Claude Web UI discovers it automatically.

3. Start the server — your FCC setup is detected and used for API routing
4. Check the authentication status in the UI to confirm "Free Claude Code" is detected

Run `claude-web-ui status` to see your current configuration, or `claude-web-ui help` for all CLI options.


## Quick Start

### Self-Hosted (Open source)

#### npm

Try Claude Web UI instantly with **npx** (requires **Node.js** v22+):

```
npx @heliosaiden/claude-web-ui
```

To use with a local [Free Claude Code](https://github.com/Alishahryar1/free-claude-code) proxy:

```
npx @heliosaiden/claude-web-ui --anthropic-base-url http://127.0.0.1:8082
```

Or install **globally** for regular use:

```
npm install -g @heliosaiden/claude-web-ui
claude-web-ui
```

Open `http://localhost:3001` — all your existing sessions are discovered automatically.

#### Clone (for FCC support)

To run this fork with Free Claude Code support:

```bash
git clone https://github.com/HeliosAiden/claude-web-ui.git
cd claude-web-ui
npm install
npm run dev
```

Open `http://localhost:3001`. Your FCC configuration will be auto-discovered from `~/.config/free-claude-code/.env`.

> **Note for Linux (glibc) users**: The SDK's bundled binary is the musl variant which won't run on glibc-based distros (Ubuntu, Debian). If you're using FCC, set `CLAUDE_CLI_PATH=fcc-claude` in `.env` — it's a Python script with no libc issues and works with the FCC proxy out of the box.

#### Docker Sandboxes (Experimental)

Run agents in isolated sandboxes with hypervisor-level isolation. Starts Claude Code by default. Requires the [`sbx` CLI](https://docs.docker.com/ai/sandboxes/get-started/).

```
npx @heliosaiden/claude-web-ui@latest sandbox ~/my-project
```

Supports Claude Code, Codex, and Gemini CLI. See the [sandbox docs](docker/) for setup and advanced options.


---


## Security & Tools Configuration

**🔒 Important Notice**: All Claude Code tools are **disabled by default**. This prevents potentially harmful operations from running automatically.

### Enabling Tools

To use Claude Code's full functionality, you'll need to manually enable tools:

1. **Open Tools Settings** - Click the gear icon in the sidebar
2. **Enable Selectively** - Turn on only the tools you need
3. **Apply Settings** - Your preferences are saved locally

![Tools Settings Modal](public/screenshots/tools-modal.png)
*Tools Settings interface - enable only what you need*

**Recommended approach**: Start with basic tools enabled and add more as needed. You can always adjust these settings later.

### Agent API Restrictions

The external `/api/agent` REST endpoint is restricted to **read-only tools only** (Read, WebFetch, Grep, Glob, etc.). Tools that modify files or execute shell commands (Bash, Write, Edit, DeleteFile) are denied, since no interactive user is present to approve them. This applies to all supported providers (Claude, Cursor, Codex, Gemini).

### Platform Mode Security

When running in platform mode (`VITE_IS_PLATFORM=true`), you **must** set `PLATFORM_SHARED_SECRET` to a strong, unique secret. The server will refuse to start without it. Your reverse proxy must include this value in the `x-platform-shared-secret` header on every request.

---

## Plugins

Claude Web UI has a plugin system that lets you add custom tabs with their own frontend UI and optional Node.js backend. Install plugins from git repos directly in **Settings > Plugins**, or build your own.

### Available Plugins

| Plugin | Description |
|---|---|
| **[Project Stats](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** | Shows file counts, lines of code, file-type breakdown, largest files, and recently modified files for your current project |
| **[Web Terminal](https://github.com/cloudcli-ai/cloudcli-plugin-terminal)** | Full xterm.js terminal with multi-tab support|
| **[Scheduler](https://github.com/grostim/cloudcli-cron)** | Create workspace-scoped scheduled prompts and execute them through a local CLI such as Codex, Claude Code, or Gemini CLI|
### Build Your Own

**[Plugin Starter Template →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** — fork this repo to create your own plugin. It includes a working example with frontend rendering, live context updates, and RPC communication to a backend server.

---
## FAQ

<details>
<summary>How is this different from Claude Code Remote Control?</summary>

Claude Code Remote Control lets you send messages to a session already running in your local terminal. Your machine has to stay on, your terminal has to stay open, and sessions time out after roughly 10 minutes without a network connection.

Claude Web UI extends Claude Code rather than sit alongside it — your MCP servers, permissions, settings, and sessions are the exact same ones Claude Code uses natively. Nothing is duplicated or managed separately.

Here's what that means in practice:

- **All your sessions, not just one** — Claude Web UI auto-discovers every session from your `~/.claude` folder. Remote Control only exposes the single active session to make it available in the Claude mobile app.
- **Your settings are your settings** — MCP servers, tool permissions, and project config you change in Claude Web UI are written directly to your Claude Code config and take effect immediately, and vice versa.
- **Works with more agents** — Claude Code, Cursor CLI, Codex, Gemini CLI, and Free Claude Code, not just Claude Code.
- **Full UI, not just a chat window** — file explorer, Git integration, MCP management, and a shell terminal are all built in.

</details>

<details>
<summary>Do I need to pay for an AI subscription separately?</summary>

Claude Web UI provides the environment, not the AI. You can bring your own Claude, Cursor, Codex, or Gemini subscription.

Alternatively, this fork includes built-in support for [Free Claude Code](https://github.com/Alishahryar1/free-claude-code), which lets you use Claude Code without an Anthropic subscription by routing through alternative API providers. See the [Free Claude Code (FCC) Integration](#free-claude-code-fcc-integration) section above.

</details>

<details>
<summary>What is Free Claude Code (FCC) and how does this fork support it?</summary>

[Free Claude Code](https://github.com/Alishahryar1/free-claude-code) is an open-source project that lets you run Claude Code without an Anthropic subscription by routing API calls through alternative providers. This fork includes built-in integration:

- **Auto-discovery** — FCC environment variables are loaded automatically from `~/.config/free-claude-code/.env`
- **CLI fallback** — Falls back to the `fcc-claude` binary if `claude` is not found
- **Auth recognition** — FCC auth tokens are detected and displayed as "Free Claude Code" in the UI
- **Zero config** — No manual `.env` changes or extra setup required

See the [Free Claude Code Integration](#free-claude-code-fcc-integration) section for details.

</details>

<details>
<summary>Can I use Claude Web UI on my phone?</summary>

Yes. For self-hosted, run the server on your machine and open `[yourip]:port` in any browser on your network. A native app is also in the works.

</details>

<details>
<summary>Will changes I make in the UI affect my local Claude Code setup?</summary>

Yes, for self-hosted. Claude Web UI reads from and writes to the same `~/.claude` config that Claude Code uses natively. MCP servers you add via the UI show up in Claude Code immediately and vice versa.

</details>

---

## Community & Support

- **[Discord](https://discord.gg/buxwujPNRE)** — get help and connect with other users
- **[GitHub Issues](https://github.com/HeliosAiden/claude-web-ui/issues)** — bug reports and feature requests
- **[Upstream Project](https://github.com/siteboon/claudecodeui)** — original project this fork is based on
- **[Contributing Guide](CONTRIBUTING.md)** — how to contribute to the project

## License

GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later) — see [LICENSE](LICENSE) for the full text, including additional terms under Section 7.

This project is open source and free to use, modify, and distribute under the AGPL-3.0-or-later license. If you modify this software and run it as a network service, you must make your modified source code available to users of that service.

## Acknowledgments

### Built With
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic's official CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursor's official CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[Gemini-CLI](https://geminicli.com/)** - Google Gemini CLI
- **[Free Claude Code](https://github.com/Alishahryar1/free-claude-code)** - Open-source Claude Code without Anthropic subscription
- **[React](https://react.dev/)** - User interface library
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[CodeMirror](https://codemirror.net/)** - Advanced code editor


**Made with care for the Claude Code, Cursor, Codex, and Free Claude Code community.**
