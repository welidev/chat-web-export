// chat-web-export: export your own chats from WhatsApp Web. https://github.com/welidev/chat-web-export
// Built on wa-js (https://github.com/wppconnect-team/wa-js, Apache-2.0, WPPConnect Team).
// Paste into the developer console on WhatsApp Web while signed in to your own account. It asks you to
// choose the wppconnect-wa.js file you downloaded, asks you to confirm the account is yours, then saves
// chat-web-export-<date>.txt (readable) and .json (everything) to your computer.
// Nothing leaves your browser: no server, no analytics, no uploads.
//
// FOR EDUCATIONAL AND PERSONAL-ARCHIVAL USE ONLY. Independent, non-commercial project, not affiliated with,
// endorsed by, or supported by WhatsApp LLC or Meta Platforms, Inc. WhatsApp is a trademark of WhatsApp LLC.
// Uses no official API and may break at any time. Scripting WhatsApp Web may be against WhatsApp's Terms of
// Service: use it only on your own account, at your own risk. No warranty, no liability. See DISCLAIMER.md.
var DAYS = 0; // how many days back to export; 0 = everything. Chats with nothing newer are skipped.
var DEEP = true; // also ask the phone for older history WhatsApp Web hasn't synced (slower)
(async () => {
  const log = (...a) => console.log('%c[chat-web-export]', 'font-weight:bold', ...a);

  if (!window.WPP) {
    window.WPPConfig = { disableGoogleAnalytics: true, deviceName: false };
    log('pick the wppconnect-wa.js you downloaded (latest: https://github.com/wppconnect-team/wa-js/releases/latest)');
    const file = await new Promise((resolve) => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.js' });
      input.onchange = () => resolve(input.files[0]);
      input.oncancel = () => resolve(null);
      input.click();
    });
    if (!file) return log('no file chosen; run this again');
    const text = await file.text();
    if (!/wppconnect-team\/wa-js/.test(text.slice(0, 500))) return log(`${file.name} does not look like wppconnect-wa.js; download it from https://github.com/wppconnect-team/wa-js/releases/latest`);
    const src = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    await new Promise((resolve, reject) =>
      document.head.appendChild(Object.assign(document.createElement('script'), { src, onload: resolve, onerror: reject }))
    );
  }
  if (!WPP.isFullReady) await new Promise((r) => WPP.loader.onFullReady(r));
  if (!WPP.conn.isAuthenticated()) return log('not logged in: scan the QR code first, then run this again');
  log('wa-js', WPP.version, 'ready');
  const ownAccount = window.confirm(
    'chat-web-export\n\n' +
      'This reads the chats of the account signed in on this page and saves them as two files on this computer. Nothing is uploaded.\n\n' +
      'Only continue if this is your own account. For educational and personal-archival use only; not affiliated with WhatsApp or Meta; no warranty.\n\n' +
      'Is this your own account?'
  );
  if (!ownAccount) return log('cancelled: nothing was exported');
  const cutoff = DAYS > 0 ? Date.now() / 1000 - DAYS * 86400 : 0;

  const { ContactStore } = WPP.whatsapp;
  const nameOf = (wid) => {
    if (!wid) return '?';
    const c = ContactStore.get(wid);
    return c?.name || c?.pushname || c?.verifiedName || c?.formattedName || String(wid._serialized || wid).split('@')[0];
  };
  const ts = (t) => new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const SKIP = new Set(['e2e_notification', 'notification_template', 'protocol', 'ciphertext', 'gp2', 'notification', 'call_log']);
  const textOf = (m) => {
    if (m.type === 'chat') return m.body || '';
    if (m.type === 'revoked') return '<message deleted>';
    if (m.type === 'location') return `<location ${m.lat},${m.lng}>`;
    if (m.type === 'vcard' || m.type === 'multi_vcard') return '<contact card>';
    if (m.type === 'poll_creation') return `<poll: ${m.pollName}> ${(m.pollOptions || []).map((o) => o.name).join(' / ')}`;
    const label = { image: 'image', video: 'video', ptt: 'voice note', audio: 'audio', document: 'document', sticker: 'sticker', gif: 'gif' }[m.type] || m.type;
    return `<${label} omitted${m.filename ? ': ' + m.filename : ''}>${m.caption ? ' ' + m.caption : ''}`;
  };

  // WhatsApp Web only stores recent history. This is what its "get older messages from your phone" button does:
  // ask the phone for the next batch of a chat, repeated until the phone reports nothing older.
  const mod = (id) => WPP.loader.loadModule(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const deepOk = (() => {
    try {
      return mod('WAWebSyncGatingUtils').isHistorySyncOnDemandEnabled();
    } catch {
      return false;
    }
  })();
  if (DEEP && !deepOk) log('your phone does not offer on-demand history here; exporting what WhatsApp Web has stored');
  const loadOlderFromPhone = async (chat) => {
    const { sendPeerDataOperationRequest } = mod('WAWebSendNonMessageDataRequest');
    const { getOldestMsgInChatFromDB } = mod('WAWebNonMessageDataRequestHistorySyncOnDemandUtils');
    const ON_DEMAND = mod('WAWebProtobufsE2E.pb').Message$PeerDataOperationRequestType.HISTORY_SYNC_ON_DEMAND;
    const T = mod('WAWebChatConstants').ConversationEndOfHistoryTransferModelPropType;
    const more = [T.COMPLETE_BUT_MORE_MESSAGES_REMAIN_ON_PRIMARY, T.COMPLETE_ON_DEMAND_SYNC_WITH_MORE_MSG_ON_PRIMARY_BUT_NO_ACCESS];
    for (let batch = 1; batch <= 1000 && more.includes(chat.endOfHistoryTransferType); batch++) {
      const before = (await getOldestMsgInChatFromDB(chat.id))?.t;
      if (before != null && before <= cutoff) break; // already back far enough
      await sendPeerDataOperationRequest(ON_DEMAND, { chatId: chat.id }).catch(() => {});
      let oldest = before;
      for (let s = 0; s < 45 && oldest === before; s++) {
        await sleep(1000);
        oldest = (await getOldestMsgInChatFromDB(chat.id))?.t;
      }
      if (oldest === before) break; // phone sent nothing older (offline, or start of chat)
      log(`  older batch ${batch}: back to ${ts(oldest)}`);
    }
  };

  const all = (await WPP.chat.list()).filter((c) => c.id._serialized !== 'status@broadcast');
  const chats = all.filter((c) => (c.t || 0) >= cutoff);
  log(DAYS > 0 ? `${chats.length} of ${all.length} chats active in the last ${DAYS} days` : `${chats.length} chats`);
  const out = [];
  for (const [i, chat] of chats.entries()) {
    const title = chat.formattedTitle || chat.name || nameOf(chat.id);
    if (DEEP && deepOk) await loadOlderFromPhone(chat).catch((e) => log('could not get older messages for', title, e));
    let msgs = [];
    try {
      msgs = await WPP.chat.getMessages(chat.id, { count: -1 });
    } catch (e) {
      log('could not read', title, e);
    }
    msgs = msgs.filter((m) => m && !SKIP.has(m.type) && m.t >= cutoff).sort((a, b) => a.t - b.t);
    if (DAYS > 0 && !msgs.length) continue;
    out.push({
      id: chat.id._serialized,
      title,
      isGroup: chat.isGroup,
      archived: !!chat.archive,
      messages: msgs.map((m) => ({
        id: m.id._serialized,
        time: ts(m.t),
        fromMe: m.id.fromMe,
        sender: m.id.fromMe ? 'me' : nameOf(m.author || m.from),
        type: m.type,
        text: textOf(m),
        quoted: m.quotedStanzaID || undefined,
        forwarded: m.isForwarded || undefined,
      })),
    });
    log(`${i + 1}/${chats.length}  ${title}: ${msgs.length} messages`);
  }

  const date = new Date().toISOString().slice(0, 10) + (DAYS > 0 ? `-last-${DAYS}-days` : '');
  const save = (name, body, type) => {
    const a = Object.assign(document.createElement('a'), { download: name, href: URL.createObjectURL(new Blob([body], { type })) });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  };
  const txt = out
    .map((c) => `===== ${c.title}${c.isGroup ? ' (group)' : ''} — ${c.messages.length} messages =====\n` +
      c.messages.map((m) => `[${m.time}] ${m.sender}: ${m.text}`).join('\n'))
    .join('\n\n');
  save(`chat-web-export-${date}.json`, JSON.stringify(out, null, 2), 'application/json');
  save(`chat-web-export-${date}.txt`, txt, 'text/plain');
  log(`done: ${out.length} chats, ${out.reduce((n, c) => n + c.messages.length, 0)} messages`);
})();
