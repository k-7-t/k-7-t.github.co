const list = document.querySelector('#list');
const tabsEl = document.querySelector('#tabs');
const countEl = document.querySelector('#count');
const statusEl = document.querySelector('#syncStatus');
const fields = ['subject', 'title', 'question', 'answer'];
let entries = [];
let filter = 'All';

// ---- local cache (fallback / instant load) ----
try {
  entries = JSON.parse(localStorage.getItem('wrongAnswersCatalog') || '[]');
} catch (e) { entries = []; }

function saveLocal() {
  try { localStorage.setItem('wrongAnswersCatalog', JSON.stringify(entries)); }
  catch (e) { /* storage unavailable */ }
}

// ---- GitHub sync config ----
let gh = { token: '', owner: '', repo: '', path: 'mistakes.md', branch: 'main' };
try {
  gh = { ...gh, ...JSON.parse(localStorage.getItem('ghConfig') || '{}') };
} catch (e) { /* ignore */ }

function ghConfigured() { return gh.token && gh.owner && gh.repo && gh.path; }
function saveGhConfig() {
  try { localStorage.setItem('ghConfig', JSON.stringify(gh)); } catch (e) { /* ignore */ }
}
function setStatus(text, tone) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.dataset.tone = tone || '';
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

function entriesToMarkdown() {
  const header = '# Wrong Answers Catalog\n\n_Synced from the catalog app — edit blocks below, keep the `## `, `Subject:`, `**Correction:**` and `---` markers intact._\n\n';
  if (!entries.length) return header + '_No cards filed yet._\n';
  return header + entries.map(e => (
    `## ${e.title || 'Untitled question'}\n` +
    `Subject: ${e.subject || 'Uncategorized'}\n\n` +
    `${e.question || ''}\n\n` +
    `**Correction:** ${e.answer || ''}\n\n` +
    `---\n`
  )).join('\n');
}

function markdownToEntries(md) {
  const blocks = md.split(/\n---\n/).slice(0, -1);
  const parsed = [];
  for (const block of blocks) {
    const titleMatch = block.match(/##\s+(.+)/);
    const subjectMatch = block.match(/Subject:\s*(.+)/);
    const correctionMatch = block.match(/\*\*Correction:\*\*\s*([\s\S]*)/);
    if (!titleMatch) continue;
    let question = block
      .replace(/^[\s\S]*Subject:\s*.+\n/, '')
      .replace(/\*\*Correction:\*\*[\s\S]*/, '')
      .trim();
    parsed.push({
      title: titleMatch[1].trim(),
      subject: subjectMatch ? subjectMatch[1].trim() : '',
      question,
      answer: correctionMatch ? correctionMatch[1].trim() : ''
    });
  }
  return parsed;
}

async function githubGetFile() {
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${encodeURIComponent(gh.path)}?ref=${encodeURIComponent(gh.branch)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return { sha: null, content: null };
  if (!res.ok) throw new Error(`GitHub GET failed (${res.status})`);
  const data = await res.json();
  return { sha: data.sha, content: b64DecodeUtf8(data.content) };
}

async function githubPutFile(sha) {
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${encodeURIComponent(gh.path)}`;
  const body = {
    message: 'Update wrong answers catalog',
    content: b64EncodeUtf8(entriesToMarkdown()),
    branch: gh.branch
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${gh.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub PUT failed (${res.status})`);
  return res.json();
}

async function pullFromGithub() {
  if (!ghConfigured()) return;
  setStatus('Pulling…', 'busy');
  try {
    const { content } = await githubGetFile();
    if (content !== null) {
      entries = markdownToEntries(content);
      saveLocal();
    }
    setStatus('Synced', 'ok');
  } catch (e) {
    setStatus('Pull failed — check token/repo', 'err');
  }
  render();
}

async function pushToGithub() {
  if (!ghConfigured()) return;
  setStatus('Syncing…', 'busy');
  try {
    const { sha } = await githubGetFile();
    await githubPutFile(sha);
    setStatus('Synced', 'ok');
  } catch (e) {
    setStatus('Sync failed — check token/repo', 'err');
  }
}

// ---- rendering ----
function escapeHtml(v) {
  return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function tabColor(subject) {
  const palette = ['#c1443a', '#b8862c', '#3d8a63', '#3f6fb0', '#8a5cc9'];
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) % palette.length;
  return palette[h];
}

function renderTabs() {
  const subjects = ['All', ...new Set(entries.map(e => e.subject).filter(Boolean))];
  tabsEl.innerHTML = subjects.map(s =>
    `<button class="tab ${s === filter ? 'active' : ''}" data-s="${escapeHtml(s)}">${escapeHtml(s)}</button>`
  ).join('');
  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => { filter = btn.dataset.s; render(); };
  });
}

function render() {
  renderTabs();
  const shown = filter === 'All' ? entries : entries.filter(e => e.subject === filter);
  countEl.textContent = shown.length
    ? `${shown.length} card${shown.length === 1 ? '' : 's'} on file`
    : '';
  list.innerHTML = shown.length ? shown.map((entry) => {
    const idx = entries.indexOf(entry);
    const color = entry.subject ? tabColor(entry.subject) : 'var(--gold)';
    return `
      <article class="card glass" style="--tab-color:${color}">
        <button class="remove" aria-label="Remove card" onclick="removeEntry(${idx})">×</button>
        <h2>${escapeHtml(entry.title || 'Untitled question')}</h2>
        <div class="meta">${escapeHtml(entry.subject || 'Uncategorized')}</div>
        <p class="q">${escapeHtml(entry.question)}</p>
        <div class="answer"><strong>Correction — </strong>${escapeHtml(entry.answer || 'Add a lesson next time.')}</div>
      </article>`;
  }).join('') : '<p class="empty glass">No cards filed yet. Add your first mistake above.</p>';
}

function removeEntry(idx) {
  entries.splice(idx, 1);
  saveLocal();
  render();
  pushToGithub();
}

document.querySelector('#add').onclick = () => {
  const data = Object.fromEntries(fields.map(id => [id, document.querySelector('#' + id).value.trim()]));
  if (!data.question) { document.querySelector('#question').focus(); return; }
  entries.unshift(data);
  saveLocal();
  filter = 'All';
  render();
  fields.forEach(id => document.querySelector('#' + id).value = '');
  pushToGithub();
};
document.querySelector('#print').onclick = () => window.print();

// ---- settings panel ----
const settingsPanel = document.querySelector('#settingsPanel');
document.querySelector('#settingsToggle').onclick = () => {
  settingsPanel.hidden = !settingsPanel.hidden;
  if (!settingsPanel.hidden) {
    document.querySelector('#ghToken').value = gh.token;
    document.querySelector('#ghOwner').value = gh.owner;
    document.querySelector('#ghRepo').value = gh.repo;
    document.querySelector('#ghPath').value = gh.path;
    document.querySelector('#ghBranch').value = gh.branch;
  }
};
document.querySelector('#ghConnect').onclick = () => {
  gh = {
    token: document.querySelector('#ghToken').value.trim(),
    owner: document.querySelector('#ghOwner').value.trim(),
    repo: document.querySelector('#ghRepo').value.trim(),
    path: document.querySelector('#ghPath').value.trim() || 'mistakes.md',
    branch: document.querySelector('#ghBranch').value.trim() || 'main'
  };
  saveGhConfig();
  settingsPanel.hidden = true;
  pullFromGithub();
};

render();
if (ghConfigured()) pullFromGithub();
else setStatus('Not connected', '');