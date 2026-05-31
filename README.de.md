<div align="center">
  <img src="public/logo.svg" alt="Claude Code UI" width="64" height="64">
  <h1>Cloud CLI (auch bekannt als Claude Code UI)</h1>
  <p>Eine Desktop- und Mobile-Oberfläche für <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://docs.cursor.com/en/cli/overview">Cursor CLI</a>, <a href="https://developers.openai.com/codex">Codex</a> und <a href="https://geminicli.com/">Gemini-CLI</a>.<br>Lokal oder remote nutzbar – verwalte deine aktiven Projekte und Sitzungen von überall.</p>
</div>

<p align="center">
  <a href="https://discord.gg/buxwujPNRE">Discord</a> · <a href="https://github.com/HeliosAiden/claude-web-ui/issues">Fehler melden</a> · <a href="CONTRIBUTING.md">Mitwirken</a>
</p>

<p align="center">
  <a href="https://discord.gg/buxwujPNRE"><img src="https://img.shields.io/badge/Discord-Join_Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Community"></a>
  <br><br>
  <a href="https://trendshift.io/repositories/15586" target="_blank"><img src="https://trendshift.io/api/badge/repositories/15586" alt="siteboon%2Fclaudecodeui | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

<div align="right"><i><a href="./README.md">English</a> · <a href="./README.ru.md">Русский</a> · <b>Deutsch</b> · <a href="./README.ko.md">한국어</a> · <a href="./README.zh-CN.md">中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.tr.md">Türkçe</a></i></div>

---

## Screenshots

<div align="center">

<table>
<tr>
<td align="center">
<h3>Desktop-Ansicht</h3>
<img src="public/screenshots/desktop-main.png" alt="Desktop-Oberfläche" width="400">
<br>
<em>Hauptoberfläche mit Projektübersicht und Chat</em>
</td>
<td align="center">
<h3>Mobile-Erfahrung</h3>
<img src="public/screenshots/mobile-chat.png" alt="Mobile-Oberfläche" width="250">
<br>
<em>Responsives mobiles Design mit Touch-Navigation</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>CLI-Auswahl</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI-Auswahl" width="400">
<br>
<em>Wähle zwischen Claude Code, Gemini, Cursor CLI und Codex</em>
</td>
</tr>
</table>



</div>

## Funktionen

- **Responsives Design** – Funktioniert nahtlos auf Desktop, Tablet und Mobilgerät, sodass du Agents auch vom Smartphone aus nutzen kannst
- **Interaktives Chat-Interface** – Eingebaute Chat-Oberfläche für die reibungslose Kommunikation mit den Agents
- **Integriertes Shell-Terminal** – Direkter Zugriff auf die Agents CLI über die eingebaute Shell-Funktionalität
- **Datei-Explorer** – Interaktiver Dateibaum mit Syntaxhervorhebung und Live-Bearbeitung
- **Git-Explorer** – Änderungen anzeigen, stagen und committen. Branches wechseln ebenfalls möglich
- **Sitzungsverwaltung** – Gespräche fortsetzen, mehrere Sitzungen verwalten und Verlauf nachverfolgen
- **Plugin-System** – Erweitere die UI mit eigenen Plugins – neue Tabs, Backend-Dienste und Integrationen hinzufügen. [Eigenes Plugin erstellen →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)
- **Activity Bar Navigation** — VSCode-style vertical activity bar for switching between Explorer, Bookmarks, Search, Git, and Settings views
- **Session Tabs** — Tmux-like horizontal tab bar for open chat/shell sessions with provider logos, status dots, and close buttons
- **Chat Find (Ctrl+F)** — Search text across all messages in the current conversation with match navigation and highlighting
- **Modell-Kompatibilität** – Funktioniert mit Claude, GPT und Gemini (vollständige Liste unterstützter Modelle in [`shared/modelConstants.js`](shared/modelConstants.js))


## Schnellstart

### Cloud (Empfohlen)

Der schnellste Einstieg – keine lokale Einrichtung erforderlich. Erhalte eine vollständig verwaltete, containerisierte Entwicklungsumgebung, die über Web, Mobile App, API oder deine bevorzugte IDE erreichbar ist.


### Self-Hosted (Open Source)

#### npm

Cloud CLI UI sofort mit **npx** ausprobieren (erfordert **Node.js** v22+):

```bash
npx @heliosaiden/claude-web-ui
```

Oder **global** installieren für regelmäßige Nutzung:

```bash
npm install -g @heliosaiden/claude-web-ui
claude-web-ui
```

Öffne `http://localhost:3001` – alle vorhandenen Sitzungen werden automatisch erkannt.

#### Docker Sandboxes (Experimentell)

Agents in isolierten Sandboxes mit Hypervisor-Isolation ausführen. Standardmäßig wird Claude Code gestartet. Erfordert die [`sbx` CLI](https://docs.docker.com/ai/sandboxes/get-started/).

```
npx @heliosaiden/claude-web-ui@latest sandbox ~/my-project
```

Unterstützt Claude Code, Codex und Gemini CLI. Weitere Details in der [Sandbox-Dokumentation](docker/).

---



---

## Sicherheit & Tool-Konfiguration

**🔒 Wichtiger Hinweis**: Alle Claude Code Tools sind **standardmäßig deaktiviert**. Dies verhindert, dass potenziell schädliche Operationen automatisch ausgeführt werden.

### Tools aktivieren

Um den vollen Funktionsumfang von Claude Code zu nutzen, müssen Tools manuell aktiviert werden:

1. **Tool-Einstellungen öffnen** – Klicke auf das Zahnrad-Symbol in der Seitenleiste
2. **Selektiv aktivieren** – Nur die benötigten Tools einschalten
3. **Einstellungen übernehmen** – Deine Einstellungen werden lokal gespeichert

<div align="center">

![Tool-Einstellungen Modal](public/screenshots/tools-modal.png)
*Tool-Einstellungen – nur aktivieren, was benötigt wird*

</div>

**Empfohlene Vorgehensweise**: Mit grundlegenden Tools starten und bei Bedarf weitere hinzufügen. Die Einstellungen können jederzeit angepasst werden.

---

## Plugins

Die Anwendung verfügt über ein Plugin-System, mit dem benutzerdefinierte Tabs mit eigener Frontend-UI und optionalem Node.js-Backend hinzugefügt werden können. Plugins können direkt in **Einstellungen > Plugins** aus Git-Repos installiert oder selbst entwickelt werden.

### Verfügbare Plugins

| Plugin | Beschreibung |
|---|---|
| **[Project Stats](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** | Zeigt Dateianzahl, Codezeilen, Dateityp-Aufschlüsselung, größte Dateien und zuletzt geänderte Dateien des aktuellen Projekts |

### Eigenes Plugin erstellen

**[Plugin-Starter-Vorlage →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** – Forke dieses Repository, um ein eigenes Plugin zu erstellen. Es enthält ein funktionierendes Beispiel mit Frontend-Rendering, Live-Kontext-Updates und RPC-Kommunikation zu einem Backend-Server.

---
## FAQ

<details>
<summary>Wie unterscheidet sich das von Claude Code Remote Control?</summary>

Claude Code Remote Control ermöglicht es, Nachrichten an eine bereits im lokalen Terminal laufende Sitzung zu senden. Der Rechner muss eingeschaltet bleiben, das Terminal muss offen bleiben, und Sitzungen laufen nach etwa 10 Minuten ohne Netzwerkverbindung ab.

Diese UI erweitert Claude Code, anstatt neben ihm zu laufen – MCP-Server, Berechtigungen, Einstellungen und Sitzungen sind exakt dieselben, die Claude Code nativ verwendet. Nichts wird dupliziert oder separat verwaltet.

Das bedeutet in der Praxis:

- **Alle Sitzungen, nicht nur eine** – Die UI erkennt automatisch jede Sitzung aus dem `~/.claude`-Ordner. Remote Control stellt nur die einzelne aktive Sitzung bereit, um sie in der Claude Mobile App verfügbar zu machen.
- **Deine Einstellungen sind deine Einstellungen** – MCP-Server, Tool-Berechtigungen und Projektkonfiguration, die in der UI geändert werden, werden direkt in die Claude Code-Konfiguration geschrieben und treten sofort in Kraft – und umgekehrt.
- **Funktioniert mit mehr Agents** – Claude Code, Cursor CLI, Codex und Gemini CLI, nicht nur Claude Code.
- **Vollständige UI, nicht nur ein Chat-Fenster** – Datei-Explorer, Git-Integration, MCP-Verwaltung und ein Shell-Terminal sind alle eingebaut.
- **Läuft in der Cloud** – Laptop zuklappen, der Agent läuft weiter. Kein Terminal zu überwachen, kein Rechner, der laufen muss.

</details>

<details>
<summary>Muss ich ein KI-Abonnement separat bezahlen?</summary>

Ja. Die Cloud-Version stellt die Umgebung bereit, nicht die KI. Du bringst dein eigenes Claude-, Cursor-, Codex- oder Gemini-Abonnement mit. Die Cloud-Option beginnt bei $7/Monat für die gehostete Umgebung zusätzlich dazu.

</details>

<details>
<summary>Kann ich die UI auf meinem Smartphone nutzen?</summary>

Ja. Bei Self-Hosted: Server auf dem eigenen Rechner starten und `[deineIP]:port` in einem beliebigen Browser im Netzwerk öffnen. Bei der Cloud-Version: Von jedem Gerät aus öffnen – kein VPN, keine Portweiterleitung, keine Einrichtung. Eine native App ist ebenfalls in Entwicklung.

</details>

<details>
<summary>Wirken sich Änderungen in der UI auf mein lokales Claude Code-Setup aus?</summary>

Ja, bei Self-Hosted. Die UI liest aus und schreibt in dieselbe `~/.claude`-Konfiguration, die Claude Code nativ verwendet. MCP-Server, die über die UI hinzugefügt werden, erscheinen sofort in Claude Code und umgekehrt.

</details>

---

## Community & Support

- **[Discord](https://discord.gg/buxwujPNRE)** — Hilfe erhalten und mit anderen Nutzer:innen in Kontakt treten
- **[GitHub Issues](https://github.com/HeliosAiden/claude-web-ui/issues)** — Fehlerberichte und Feature-Anfragen
- **[Beitragsrichtlinien](CONTRIBUTING.md)** — So kannst du zum Projekt beitragen

## Lizenz

GNU General Public License v3.0 – siehe [LICENSE](LICENSE)-Datei für Details.

Dieses Projekt ist Open Source und kann unter der GPL v3-Lizenz kostenlos genutzt, modifiziert und verteilt werden.

## Danksagungen

### Erstellt mit
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropics offizielle CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursors offizielle CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[Gemini-CLI](https://geminicli.com/)** - Google Gemini CLI
- **[React](https://react.dev/)** - UI-Bibliothek
- **[Vite](https://vitejs.dev/)** - Schnelles Build-Tool und Dev-Server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS-Framework
- **[CodeMirror](https://codemirror.net/)** - Erweiterter Code-Editor
- **[CodeMirror](https://codemirror.net/)** - Fortgeschrittener Code-Editor


### Sponsoren
- [Siteboon - KI-gestützter Website-Builder](https://siteboon.ai)
---

<div align="center">
  <strong>Mit Sorgfalt für die Claude Code-, Cursor- und Codex-Community erstellt.</strong>
</div>
