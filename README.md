# chat-web-export

**Export your own chats from WhatsApp Web, in your browser, with nothing uploaded anywhere.**

Every chat becomes a readable `.txt` and a complete `.json`, saved to your computer.
No extension, no install, no account, no server.

**Website:** https://welidev.github.io/chat-web-export/

> [!IMPORTANT]
> **For educational and personal-archival purposes only.** chat-web-export is an independent,
> non-commercial project. It is not affiliated with, endorsed by, or supported by WhatsApp LLC or
> Meta Platforms, Inc. It uses no official API and may stop working at any time. Scripting
> WhatsApp Web may be against WhatsApp's Terms of Service. Use it only on your own account, at
> your own risk. Read the full [DISCLAIMER](DISCLAIMER.md) before using it.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Options](#options)
- [Output](#output)
- [How it works](#how-it-works)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Concerns and takedown requests](#concerns-and-takedown-requests)
- [License, trademarks and disclaimer](#license-trademarks-and-disclaimer)

## Features

- Exports every one-to-one and group chat of the signed-in account.
- Two files: a plain-text transcript to read, and JSON with ids, timestamps, senders and types.
- Optional date range: only the last N days.
- Optional deep mode: asks your phone for older history that WhatsApp Web has not loaded yet.
- Runs entirely in your browser tab. Nothing is sent to any server.
- Always uses the latest release of the [wa-js](https://github.com/wppconnect-team/wa-js) library,
  so compatibility fixes reach you without waiting for an update here.

## Requirements

- A desktop browser with developer tools. It is developed against Chrome; other Chromium-based
  browsers such as Edge and Brave work the same way.
- **Your own** WhatsApp account, signed in to [WhatsApp Web](https://web.whatsapp.com).
- Your phone online, if you use deep mode.

## Quick start

1. **Download the library.** Get the latest `wppconnect-wa.js` from wa-js, an independent
   open-source project by the WPPConnect team:
   https://github.com/wppconnect-team/wa-js/releases/latest/download/wppconnect-wa.js
2. **Open WhatsApp Web** and sign in with your own account.
3. **Open the developer console.** <kbd>⌥</kbd> <kbd>⌘</kbd> <kbd>J</kbd> on Mac,
   <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>J</kbd> on Windows and Linux. The first time, Chrome asks
   you to type `allow pasting`.
4. **Paste the script** from the [website](https://welidev.github.io/chat-web-export/) and press
   Enter.
5. **Choose the file** `wppconnect-wa.js` when the file picker opens.
6. **Confirm** that the account is yours.
7. **Wait** until the console says `done:`. Two files are saved:
   `chat-web-export-<date>.txt` and `chat-web-export-<date>.json`.

Keep the tab open while it runs. Large accounts in deep mode can take a while.

## Options

The script starts with two settings. The website lets you set them before you copy.

| Setting | Default | Meaning |
| --- | --- | --- |
| `DAYS` | `0` | Only export the last N days. `0` exports everything. |
| `DEEP` | `true` | Ask your phone for older history, chat by chat, the same way WhatsApp Web's own "get older messages" button does. |

## Output

`chat-web-export-<date>.txt`:

```
===== Maria — 3 messages =====
[2026-10-14 18:02:11] Maria: are you coming tonight?
[2026-10-14 18:05:40] me: yes, 8ish
[2026-10-14 18:05:52] Maria: <image omitted> the place
```

`chat-web-export-<date>.json`:

```json
[
  {
    "id": "34600000000@c.us",
    "title": "Maria",
    "isGroup": false,
    "archived": false,
    "messages": [
      {
        "id": "false_34600000000@c.us_3EB0C4A1",
        "time": "2026-10-14 18:02:11",
        "fromMe": false,
        "sender": "Maria",
        "type": "chat",
        "text": "are you coming tonight?"
      }
    ]
  }
]
```

Times are UTC. Exported: text, deleted-message markers, locations, contact cards and polls.
Media is not downloaded; it appears as a placeholder such as `<image omitted>` or
`<voice note omitted>`, with the caption or file name when there is one. System notifications and
status updates are skipped. The JSON also carries `quoted` (the id of a replied-to message) and
`forwarded` when they apply.

## How it works

The script runs in the WhatsApp Web tab you are already signed in to and reads the chats that
account can already see. It does not bypass sign-in, end-to-end encryption, or any access control,
and it cannot reach any account other than the one signed in on that page.

The wa-js library is loaded from a file on your computer that you choose, so the script fetches
nothing from other servers and you can inspect exactly what runs. Before reading anything, the
script asks you to confirm that the account is yours.

## Privacy

- The script sends nothing anywhere. It saves two files to your computer and stops.
- It turns off the anonymous usage ping that wa-js sends by default.
- The website is a static page on GitHub Pages: no cookies, no analytics, and no requests to
  other servers. GitHub receives your IP address when it serves the page, as described in the
  [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).
- An export contains other people's messages. Treat it as their personal data: keep it private,
  and follow the law that applies to you before sharing any of it.

## Troubleshooting

- **"not logged in"**: you are on the QR code screen. Sign in, wait for your chats to load, run it
  again.
- **Nothing happens after pasting**: make sure you typed `allow pasting` first and pressed Enter
  after pasting.
- **"does not look like wppconnect-wa.js"**: you picked a different file. Download it again with
  the link above.
- **Errors after a WhatsApp Web update**: download the newest wa-js release; fixes usually land
  within days. If it still fails, [open an issue](https://github.com/welidev/chat-web-export/issues)
  with the console output, after removing names, numbers and messages from it.
- **Older messages are missing**: turn on deep mode, keep your phone online, and give it time.
  Your phone may not offer history beyond what it has stored.

## Development

```
npm install
npm run build        # writes docs/export.min.js from export.js
npm run dev          # build, then serve docs/ on http://localhost:4173
```

| File | Purpose |
| --- | --- |
| `export.js` | Readable source of the script. |
| `build.mjs` | Minifies it with esbuild into `docs/export.min.js`, keeping the two settings readable on the first line. |
| `docs/index.html` | The website: steps, settings, copy button, FAQ. No dependencies. |
| `docs/export.min.js` | The built script the website serves. Committed, so the live page runs exactly what is in this repository. |

GitHub Pages serves the `docs/` folder of `main` as is. After changing `export.js`, run
`npm run build` and commit `docs/export.min.js` together with it.

Pull requests are welcome if they keep the project's scope: your own account, read-only, local
files only, nothing sent anywhere. Features for reading other people's accounts, running
unattended, or sending messages will not be accepted.

## Concerns and takedown requests

If you represent a rights holder or have any concern about this project, please
[open an issue](https://github.com/welidev/chat-web-export/issues) or contact the maintainer
through their GitHub profile. Concerns are answered promptly and in good faith.

## License, trademarks and disclaimer

MIT, see [LICENSE](LICENSE). wa-js is Apache-2.0, © WPPConnect Team, and is not part of this
repository.

WhatsApp is a trademark of WhatsApp LLC. It is used here only to describe what the tool works
with. This project is not affiliated with, endorsed by, or supported by WhatsApp LLC or Meta
Platforms, Inc. Provided "as is", without warranty; see the [DISCLAIMER](DISCLAIMER.md).
