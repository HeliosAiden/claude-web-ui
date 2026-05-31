<div align="center">
  <img src="public/logo.svg" alt="Claude Web UI" width="64" height="64">
  <h1>Cloud CLI (일명 Claude Code UI)</h1>
  <p><a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://docs.cursor.com/en/cli/overview">Cursor CLI</a>, <a href="https://developers.openai.com/codex">Codex</a>, <a href="https://geminicli.com/">Gemini-CLI</a> 용 데스크톱 및 모바일 UI입니다.<br>로컬 또는 원격에서 실행하여 어디서나 활성 프로젝트와 세션을 확인하세요.</p>
</div>

<p align="center">
  <a href="https://discord.gg/buxwujPNRE">Discord</a> · <a href="https://github.com/HeliosAiden/claude-web-ui/issues">버그 신고</a> · <a href="CONTRIBUTING.md">기여 안내</a>
</p>

<p align="center">
  <a href="https://discord.gg/buxwujPNRE"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord 커뮤니티"></a>
  <br><br>
  <a href="https://trendshift.io/repositories/15586" target="_blank"><img src="https://trendshift.io/api/badge/repositories/15586" alt="siteboon%2Fclaudecodeui | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

<div align="right"><i><a href="./README.md">English</a> · <a href="./README.ru.md">Русский</a> · <a href="./README.de.md">Deutsch</a> · <b>한국어</b> · <a href="./README.zh-CN.md">中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.tr.md">Türkçe</a></i></div>

---

## 스크린샷

<div align="center">

<table>
<tr>
<td align="center">
<h3>데스크톱 보기</h3>
<img src="public/screenshots/desktop-main.png" alt="데스크톱 인터페이스" width="400">
<br>
<em>프로젝트 개요와 채팅을 보여주는 메인 인터페이스</em>
</td>
<td align="center">
<h3>모바일 경험</h3>
<img src="public/screenshots/mobile-chat.png" alt="모바일 인터페이스" width="250">
<br>
<em>터치 내비게이션이 포함된 반응형 모바일 디자인</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>CLI 선택</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI 선택" width="400">
<br>
<em>Claude Code, Gemini, Cursor CLI 및 Codex 중 선택</em>
</td>
</tr>
</table>

</div>

## 기능

- **반응형 디자인** - 데스크톱, 태블릿, 모바일을 아우르는 매끄러운 경험으로 어디서든 Agents를 사용할 수 있습니다
- **대화형 채팅 인터페이스** - 내장된 채팅 UI를 통해 에이전트와 자연스럽게 소통
- **통합 셸 터미널** - 셸 기능을 통해 Agents CLI에 직접 접근
- **파일 탐색기** - 구문 강조 및 실시간 편집을 갖춘 인터랙티브 파일 트리
- **Git 탐색기** - 변경 사항 보기, 스테이징 및 커밋. 브랜치 전환 기능 포함
- **세션 관리** - 대화를 재개하고, 여러 세션을 관리하며 기록을 추적
- **플러그인 시스템** - 커스텀 탭, 백엔드 서비스, 통합을 추가하여 확장. [직접 빌드 →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)
- **Activity Bar Navigation** — VSCode-style vertical activity bar for switching between Explorer, Bookmarks, Search, Git, and Settings views
- **Session Tabs** — Tmux-like horizontal tab bar for open chat/shell sessions with provider logos, status dots, and close buttons
- **Chat Find (Ctrl+F)** — Search text across all messages in the current conversation with match navigation and highlighting
- **모델 호환성** - Claude, GPT, Gemini 모델 계열에서 작동 (`shared/modelConstants.js`에서 전체 지원 모델 확인)

## 빠른 시작

### 셀프 호스트 (오픈 소스)

#### npm

**npx**로 즉시 UI를 실행하세요 (Node.js v22+ 필요):

```bash
npx @heliosaiden/claude-web-ui
```

**정기적으로 사용한다면 전역 설치:**

```bash
npm install -g @heliosaiden/claude-web-ui
claude-web-ui
```

`http://localhost:3001`을 열면 기존 세션이 자동으로 발견됩니다.

자세한 구성 옵션, PM2, 원격 서버 설정 등은 문서를 참고하세요.

#### Docker Sandboxes (실험적)

하이퍼바이저 수준 격리로 에이전트를 샌드박스에서 실행합니다. 기본 에이전트는 Claude Code입니다. [`sbx` CLI](https://docs.docker.com/ai/sandboxes/get-started/)가 필요합니다.

```
npx @heliosaiden/claude-web-ui@latest sandbox ~/my-project
```

Claude Code, Codex, Gemini CLI를 지원합니다. 자세한 내용은 [샌드박스 문서](docker/)를 참고하세요.

---

## 보안 및 도구 구성

**🔒 중요 공지**: 모든 Claude Code 도구는 **기본적으로 비활성화**되어 있습니다. 이는 잠재적인 유해 작업이 자동 실행되는 것을 방지하기 위한 조치입니다.

### 도구 활성화

1. **도구 설정 열기** - 사이드바의 톱니바퀴 아이콘 클릭
2. **선택적으로 활성화** - 필요한 도구만 켜기
3. **설정 적용** - 선호도는 로컬에 저장됨

<div align="center">

![도구 설정 모달](public/screenshots/tools-modal.png)
*도구 설정 인터페이스 - 필요한 것만 켜세요*

</div>

**권장 방법**: 기본 도구를 먼저 켜고 필요할 때 추가하세요. 언제든지 조정 가능합니다.

---

## 플러그인

플러그인 시스템을 통해 커스텀 탭과 선택적 Node.js 백엔드를 추가할 수 있습니다. Settings > Plugins에서 Git 저장소에서 플러그인을 설치하거나 직접 빌드할 수 있습니다.

### 이용 가능한 플러그인

| 플러그인 | 설명 |
|---|---|
| **[Project Stats](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** | 현재 프로젝트의 파일 수, 코드 줄 수, 파일 유형 분포, 가장 큰 파일, 최근 수정 파일을 표시 |

### 직접 만들기

**[Plugin Starter Template →](https://github.com/cloudcli-ai/cloudcli-plugin-starter)** — 이 저장소를 포크하여 플러그인 구축. 프런트엔드 렌더링, 실시간 컨텍스트 업데이트, RPC 통신 예제 포함.

플러그인 문서 — 플러그인 API, 매니페스트 포맷, 보안 모델 등을 설명.

---

## FAQ

<details>
<summary>Claude Code Remote Control과 어떻게 다른가요?</summary>

Claude Code Remote Control은 이미 로컬 터미널에서 실행 중인 세션으로 메시지를 전송합니다. 이 경우 기계가 켜져 있어야 하고 터미널을 열어 둬야 하며, 네트워크 연결 없이 약 10분 후 타임아웃됩니다.

UI(셀프 호스트 및 클라우드)는 Claude Code를 확장하며 별도로 존재하지 않습니다 — MCP 서버, 권한, 설정, 세션은 Claude Code에서 그대로 사용됩니다.

- **모든 세션을 다룬다** — UI는 `~/.claude` 폴더에서 모든 세션을 자동 발견합니다. Remote Control은 단일 활성 세션만 노출합니다.
- **설정은 그대로** — UI에서 변경한 MCP, 도구 권한, 프로젝트 설정은 Claude Code에 즉시 반영됩니다.
- **지원 에이전트가 더 많음** — Claude Code, Cursor CLI, Codex, Gemini CLI 지원.
- **전체 UI 제공** — 단일 채팅 창이 아닌 파일 탐색기, Git 통합, MCP 관리 및 셸 터미널 포함.
- **클라우드에서 실행** — 노트북을 닫아도 에이전트가 실행됩니다. 터미널을 계속 확인할 필요 없음.

</details>

<details>
<summary>AI 구독을 별도로 결제해야 하나요?</summary>

네. 이 UI는 환경만 제공합니다. Claude, Cursor, Codex, Gemini 구독 비용은 별도로 부과됩니다.

</details>

<details>
<summary>UI를 휴대폰에서 사용할 수 있나요?</summary>

네. 셀프 호스트인 경우 기계에서 서버를 실행하고 네트워크의 아무 브라우저에서 `[yourip]:port`를 열면 됩니다.

</details>

<details>
<summary>UI에서 변경하면 로컬 Claude Code 설정에 영향을 주나요?</summary>

네, 셀프 호스트에서는 그렇습니다. UI는 Claude Code가 사용하는 동일한 `~/.claude` 설정을 읽고 씁니다. UI에서 추가한 MCP 서버가 Claude Code에 즉시 나타납니다.

</details>

---

## 커뮤니티 및 지원

- **문서** — 설치, 구성, 기능, 문제 해결 안내
- **[Discord](https://discord.gg/buxwujPNRE)** — 도움 및 커뮤니티 참여
- **[GitHub Issues](https://github.com/HeliosAiden/claude-web-ui/issues)** — 버그 보고 및 기능 요청
- **[기여 안내](CONTRIBUTING.md)** — 프로젝트 참여 방법

## 라이선스

GNU General Public License v3.0 - 자세한 내용은 [LICENSE](LICENSE) 파일 참조.

이 프로젝트는 GPL v3 라이선스 하에 오픈 소스로 공개되어 있으며 자유롭게 사용, 수정, 배포할 수 있습니다.

## 감사의 말

### 사용 기술
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic 공식 CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursor 공식 CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[Gemini-CLI](https://geminicli.com/)** - Google Gemini CLI
- **[React](https://react.dev/)** - 사용자 인터페이스 라이브러리
- **[Vite](https://vitejs.dev/)** - 빠른 빌드 도구 및 개발 서버
- **[Tailwind CSS](https://tailwindcss.com/)** - 유틸리티 우선 CSS 프레임워크
- **[CodeMirror](https://codemirror.net/)** - 고급 코드 에디터
- **[CodeMirror](https://codemirror.net/)** - 고급 코드 편집기

### 스폰서
- [Siteboon - AI powered website builder](https://siteboon.ai)
---

<div align="center">
  <strong>Claude Code, Cursor, Codex 커뮤니티를 위해 정성껏 제작되었습니다.</strong>
</div>
