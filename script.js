const list = document.querySelector('#list');
const tabsEl = document.querySelector('#tabs');
const countEl = document.querySelector('#count');
const statusEl = document.querySelector('#syncStatus');
const viewTabsEl = document.querySelector('#viewTabs');
const subjectInput = document.querySelector('#subject');
const defaultSubjectInput = document.querySelector('#defaultSubject');
const fields = ['subject', 'title', 'question', 'answer'];

// 默认只填写你的仓库身份，Token 必须由每位用户自行配置。
const defaultGithubSettings = { owner: 'k-7-t', repo: 'k-7-t.github.io', token: '' };
let githubSettings = { ...defaultGithubSettings };
try {
  githubSettings = {
    ...githubSettings,
    ...JSON.parse(localStorage.getItem('githubSettings') || '{}')
  };
} catch (error) {
  // 配置损坏时回退到默认仓库身份。
}

let entries = [];
let filter = '全部';
let view = '主界面';
let pullSequence = 0;
let defaultSubject = localStorage.getItem('defaultSubject') || 'coding';

// 初始化本地缓存和默认科目。
try {
  entries = JSON.parse(localStorage.getItem('wrongAnswersCatalog') || '[]');
} catch (error) {
  entries = [];
}
defaultSubjectInput.value = defaultSubject;
subjectInput.value = defaultSubject;

function saveLocal() {
  // 浏览器禁用 localStorage 时，页面仍然可以继续使用内存中的数据。
  try {
    localStorage.setItem('wrongAnswersCatalog', JSON.stringify(entries));
  } catch (error) {
    // 忽略本地存储不可用的情况。
  }
}

function newEntryId() {
  // ID 用于把网页卡片和 GitHub Issue 一一对应。
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeEntries() {
  // 给旧数据补充 ID，避免升级后无法更新原来的 Issue。
  if (!Array.isArray(entries)) entries = [];
  entries = entries.map(entry => ({ ...entry, id: entry.id || newEntryId() }));
  saveLocal();
}

normalizeEntries();

function syncConfigured() {
  return Boolean(githubSettings.owner && githubSettings.repo && githubSettings.token);
}

function setStatus(text, tone) {
  // 顶部状态文字使用 tone 控制颜色：正常、忙碌或错误。
  statusEl.textContent = text;
  statusEl.dataset.tone = tone || '';
}

function githubUrl(path = 'issues') {
  // 所有请求都固定发往目标仓库。
  return `https://api.github.com/repos/${encodeURIComponent(githubSettings.owner)}/${encodeURIComponent(githubSettings.repo)}/${path}`;
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${githubSettings.token}`,
    Accept: 'application/vnd.github+json'
  };
}

function issueBody(entry) {
  // 保留隐藏 ID，GitHub Issue 才能和网页卡片稳定对应。
  return [
    `<!-- wrong-answer-id: ${entry.id} -->`,
    `主题：${entry.subject || ''}`,
    `Learnt: ${entry.learnt === true}`,
    '',
    '问题：',
    entry.question || '',
    '',
    '订正：',
    entry.answer || ''
  ].join('\n');
}

function entryFromIssue(issue) {
  // 同时兼容旧版英文格式和现在的中文格式。
  const body = issue.body || '';
  const marker = body.match(/wrong-answer-id:\s*([^\s>]+)/)?.[1];
  const id = marker || `github-issue-${issue.number}`;
  const questionMatch = body.match(/^(?:Question:|问题：)\n([\s\S]*?)\n\n(?:Correction:|订正：)/m);
  const correctionMatch = body.match(/^(?:Correction:|订正：)\n([\s\S]*)$/m);
  const subjectMatch = body.match(/^(?:Subject:|主题：)\s*(.*)$/m);
  const learntMatch = body.match(/^Learnt:\s*(true|false)$/mi);
  const question = questionMatch
    ? questionMatch[1]
    : body.replace(/<!--[^>]*-->/g, '').trim();

  return {
    id,
    title: issue.title,
    subject: subjectMatch ? subjectMatch[1] : '',
    learnt: learntMatch ? learntMatch[1].toLowerCase() === 'true' : false,
    question,
    answer: correctionMatch ? correctionMatch[1] : '',
    managed: Boolean(marker),
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    issueState: issue.state
  };
}

async function githubGetIssues() {
  // state=all 读取开放和已关闭的 Issue；no-store 防止刷新读取旧缓存。
  const response = await fetch(githubUrl('issues?state=all&per_page=100'), {
    cache: 'no-store',
    headers: githubHeaders()
  });
  if (!response.ok) throw new Error(`读取 GitHub 失败（${response.status}）`);
  const issues = await response.json();
  return issues.filter(issue => !issue.pull_request);
}

async function githubWriteIssue(issue, entry) {
  const url = issue ? githubUrl(`issues/${issue.number}`) : githubUrl('issues');
  const response = await fetch(url, {
    method: issue ? 'PATCH' : 'POST',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: entry.title || '未命名题目',
      body: issueBody(entry),
      state: 'open'
    })
  });
  if (!response.ok) throw new Error(`写入 GitHub Issue 失败（${response.status}）`);
}

async function githubCloseIssue(issue) {
  const response = await fetch(githubUrl(`issues/${issue.number}`), {
    method: 'PATCH',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' })
  });
  if (response.status === 410) return 'gone';
  if (!response.ok) throw new Error(`关闭 GitHub Issue 失败（${response.status}）`);
  return 'closed';
}

async function pullFromGithub() {
  // 请求序号防止旧的并发请求覆盖最新的刷新结果。
  if (!syncConfigured()) return false;
  const requestId = ++pullSequence;
  setStatus('正在读取 GitHub……', 'busy');

  try {
    const issues = await githubGetIssues();
    if (requestId !== pullSequence) return false;
    entries = issues.map(entryFromIssue).filter(Boolean);
    normalizeEntries();
    setStatus(`已同步（${entries.length} 条错题）`, 'ok');
    render();
    return true;
  } catch (error) {
    if (requestId === pullSequence) {
      setStatus(`读取失败：${error.message}`, 'err');
      render();
    }
    return false;
  }
}

async function pushToGithub() {
  // 写入或关闭后再次拉取，网页卡片显示 GitHub 的真实结果。
  if (!syncConfigured()) return;
  setStatus('正在同步 GitHub……', 'busy');

  try {
    const issues = await githubGetIssues();
    const byId = new Map(issues.map(issue => [entryFromIssue(issue).id, issue]));
    const wanted = new Set(entries.map(entry => entry.id));
    let closedCount = 0;
    let goneCount = 0;

    for (const entry of entries) {
      if (entry.issueState === 'closed') continue;
      await githubWriteIssue(byId.get(entry.id), entry);
    }

    // 当前网页管理仓库中的全部 Issue；从网页移除的卡片会被关闭。
    for (const issue of issues) {
      const parsed = entryFromIssue(issue);
      if (!wanted.has(parsed.id)) {
        const result = await githubCloseIssue(issue);
        if (result === 'closed') closedCount++;
        if (result === 'gone') goneCount++;
      }
    }

    if (!await pullFromGithub()) return;
    const cleanup = [
      closedCount ? `${closedCount} 条已关闭` : '',
      goneCount ? `${goneCount} 条已不存在` : ''
    ].filter(Boolean).join('，');
    setStatus(cleanup ? `已同步；${cleanup}` : '已同步', cleanup ? 'busy' : 'ok');
  } catch (error) {
    setStatus(`同步失败：${error.message}`, 'err');
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function tabColor(subject) {
  const palette = ['#c1443a', '#b8862c', '#3d8a63', '#3f6fb0', '#8a5cc9'];
  let hash = 0;
  for (const character of subject) hash = (hash * 31 + character.charCodeAt(0)) % palette.length;
  return palette[hash];
}

function renderTabs(currentEntries) {
  // 只根据当前视图生成“全部”和该视图拥有的科目按钮。
  const subjects = ['全部', ...new Set(currentEntries.map(entry => entry.subject).filter(Boolean))];
  tabsEl.innerHTML = subjects.map(subject =>
    `<button class="tab ${subject === filter ? 'active' : ''}" data-s="${escapeHtml(subject)}">${escapeHtml(subject)}</button>`
  ).join('');
  tabsEl.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => {
      filter = button.dataset.s;
      render();
    };
  });
}

function renderViewTabs() {
  const views = ['主界面', '已解决', '已关闭'];
  viewTabsEl.innerHTML = views.map(item =>
    `<button class="tab ${item === view ? 'active' : ''}" data-view="${item}">${item}</button>`
  ).join('');
  viewTabsEl.querySelectorAll('[data-view]').forEach(button => {
    button.onclick = () => {
      view = button.dataset.view;
      filter = '全部';
      render();
    };
  });
}

function entriesForView() {
  if (view === '已解决') return entries.filter(entry => entry.issueState !== 'closed' && entry.learnt);
  if (view === '已关闭') return entries.filter(entry => entry.issueState === 'closed');
  return entries.filter(entry => entry.issueState !== 'closed' && !entry.learnt);
}

function render() {
  // 每次本地操作或远程同步后重绘卡片列表。
  renderViewTabs();
  const currentEntries = entriesForView();
  renderTabs(currentEntries);
  const shown = filter === '全部' ? currentEntries : currentEntries.filter(entry => entry.subject === filter);
  countEl.textContent = shown.length ? `共 ${shown.length} 条错题` : '';
  list.innerHTML = shown.length ? shown.map(entry => {
    const index = entries.indexOf(entry);
    const color = entry.subject ? tabColor(entry.subject) : 'var(--gold)';
    return `
      <article class="card glass" style="--tab-color:${color}">
        <button class="remove" aria-label="删除错题" onclick="removeEntry(${index})">×</button>
        <h2>${escapeHtml(entry.title || '未命名题目')}</h2>
        <div class="meta">${escapeHtml(entry.subject || '未分类')}</div>
        <div class="issue-receipt ${entry.issueNumber ? 'exists' : 'pending'}">
          ${entry.issueNumber
            ? `<a href="${escapeHtml(entry.issueUrl)}" target="_blank" rel="noopener">GitHub #${escapeHtml(entry.issueNumber)}</a>`
            : '尚未同步'}
        </div>
        <p class="q">${escapeHtml(entry.question)}</p>
        <div class="answer"><strong>订正： </strong>${escapeHtml(entry.answer || '下次记得补充错因。')}</div>
        ${entry.issueState !== 'closed'
          ? `<button class="learned ${entry.learnt ? 'active' : ''}" onclick="toggleLearnt(${index})">${entry.learnt ? '标记为未学会' : '我已学会'}</button>`
          : ''}
      </article>`;
  }).join('') : '<p class="empty glass">还没有错题，先记录第一道吧。</p>';
}

function removeEntry(index) {
  const entry = entries[index];
  const title = entry?.title || '未命名题目';
  if (!window.confirm(`是否删除错题「${title}」？\nGitHub Issue 将会被关闭。`)) return;
  entries.splice(index, 1);
  saveLocal();
  render();
  pushToGithub();
}

function toggleLearnt(index) {
  entries[index].learnt = !entries[index].learnt;
  saveLocal();
  render();
  pushToGithub();
}

document.querySelector('#add').onclick = () => {
  const data = Object.fromEntries(fields.map(id => [id, document.querySelector('#' + id).value.trim()]));
  if (!data.question) {
    document.querySelector('#question').focus();
    return;
  }
  entries.unshift({ ...data, id: newEntryId(), learnt: false, issueState: 'open' });
  saveLocal();
  filter = '全部';
  render();
  fields.forEach(id => {
    document.querySelector('#' + id).value = id === 'subject' ? defaultSubject : '';
  });
  pushToGithub();
};

function exportTxt() {
  if (!entries.length) return;
  const text = entries.map((entry, index) => [
    `${index + 1}. ${entry.title || '未命名题目'}`,
    `主题：${entry.subject || '未分类'}`,
    `问题：\n${entry.question}`,
    `订正：\n${entry.answer || '下次记得补充错因。'}`
  ].join('\n')).join('\n\n------------------------------\n\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  link.download = `错题-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelector('#export').onclick = exportTxt;
document.querySelector('#print').onclick = () => window.print();
document.querySelector('#saveSubject').onclick = () => {
  defaultSubject = defaultSubjectInput.value.trim() || 'coding';
  defaultSubjectInput.value = defaultSubject;
  subjectInput.value = defaultSubject;
  localStorage.setItem('defaultSubject', defaultSubject);
};
document.querySelector('#refreshIssues').onclick = () => pullFromGithub();
document.querySelector('#githubSettingsToggle').onclick = () => {
  const panel = document.querySelector('#githubSettingsPanel');
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    document.querySelector('#ghOwner').value = githubSettings.owner;
    document.querySelector('#ghRepo').value = githubSettings.repo;
    document.querySelector('#ghToken').value = githubSettings.token;
  }
};
document.querySelector('#saveGithubSettings').onclick = () => {
  githubSettings = {
    owner: document.querySelector('#ghOwner').value.trim() || defaultGithubSettings.owner,
    repo: document.querySelector('#ghRepo').value.trim() || defaultGithubSettings.repo,
    token: document.querySelector('#ghToken').value.trim()
  };
  localStorage.setItem('githubSettings', JSON.stringify(githubSettings));
  document.querySelector('#githubSettingsPanel').hidden = true;
  pullFromGithub();
};

render();
if (syncConfigured()) pullFromGithub();
else setStatus('未连接', '');
