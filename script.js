const list = document.querySelector('#list');
const tabsEl = document.querySelector('#tabs');
const countEl = document.querySelector('#count');
const statusEl = document.querySelector('#syncStatus');
const viewTabsEl = document.querySelector('#viewTabs');
const subjectInput = document.querySelector('#subject');
const defaultSubjectInput = document.querySelector('#defaultSubject');
const agentOutputEl = document.querySelector('#agentOutput');
const accountPanel = document.querySelector('#accountPanel');
const accountStatus = document.querySelector('#accountStatus');
const titleTypingEl = document.querySelector('#titleTyping');
const taglineTypingEl = document.querySelector('#taglineTyping');
const titleTypingTextEl = titleTypingEl.querySelector('.typing-text');
const taglineTypingTextEl = taglineTypingEl.querySelector('.typing-text');
const titleTypingCaretEl = titleTypingEl.querySelector('.typing-caret');
const taglineTypingCaretEl = taglineTypingEl.querySelector('.typing-caret');
const fields = ['subject', 'title', 'question', 'answer'];
const translations = {
  zh_cn: {
    pageTitle: '老弟の神秘错题本',
    collection: '合集',
    title: '错题本',
    tagline: '快把错题放进来',
    notConnected: '未连接',
    refreshIssues: '刷新错题',
    githubSettings: 'GitHub 设置',
    defaultSubject: '默认科目',
    save: '保存',
    saveAndSync: '保存并同步',
    newEntry: '新题',
    record: '记录',
    exportTxt: '导出 TXT',
    printSave: '打印/保存',
    studyAgent: '学习代理',
    studyAgentHint: '根据当前错题库生成复习优先级与行动建议。',
    generatePlan: '生成计划',
    mainView: '主界面',
    solvedView: '已解决',
    closedView: '已关闭',
    publicView: '公开',
    publicMistake: '公开给其他用户',
    senderId: '用户 ID',
    all: '全部',
    emptyState: '还没有错题，先记录第一道吧。',
    accountTitle: '账户',
    accountLogin: '登录',
    accountRegister: '注册',
    accountGuest: '游客进入',
    accountLogout: '退出登录',
    adminDelete: '永久删除',
    adminDeleteAll: '永久删除所有错题',
    accountLoginPrompt: '请登录、注册，或以游客身份使用本地错题。',
    githubHint: '每个人可以使用自己的 GitHub 仓库。配置只保存在当前浏览器中。',
    noPlan: '当前没有待复习错题。先记录一条题目，再让代理给出计划。',
    localSave: '学习计划已保存到本地',
    githubSave: '学习计划已保存到 GitHub',
    noToken: '未配置 GitHub Token，无法保存 studyplan.md'
  },
  en_us: {
    pageTitle: 'Mistake Book',
    collection: 'Collection',
    title: 'Mistake Book',
    tagline: 'Collect every mistake and learn from it.',
    notConnected: 'Not connected',
    refreshIssues: 'Refresh',
    githubSettings: 'GitHub settings',
    defaultSubject: 'Default subject',
    save: 'Save',
    saveAndSync: 'Save & sync',
    newEntry: 'New',
    record: 'Record',
    exportTxt: 'Export TXT',
    printSave: 'Print / Save',
    studyAgent: 'Study agent',
    studyAgentHint: 'Generate a review priority and action plan from the current mistake set.',
    generatePlan: 'Generate plan',
    mainView: 'Main',
    solvedView: 'Solved',
    closedView: 'Closed',
    publicView: 'Public',
    publicMistake: 'Share this mistake publicly',
    senderId: 'User ID',
    all: 'All',
    emptyState: 'No mistakes yet. Add your first one.',
    accountTitle: 'Account',
    accountLogin: 'Log in',
    accountRegister: 'Register',
    accountGuest: 'Continue as guest',
    accountLogout: 'Log out',
    adminDelete: 'Permanently delete',
    adminDeleteAll: 'Permanently delete all mistakes',
    accountLoginPrompt: 'Log in, register, or continue as a guest with local mistakes.',
    githubHint: 'Everyone can use their own GitHub repository. The config is saved in this browser only.',
    noPlan: 'There are no pending mistakes. Add one to generate a plan.',
    localSave: 'Study plan saved locally',
    githubSave: 'Study plan saved to GitHub',
    noToken: 'GitHub token is missing, so studyplan.md cannot be saved.'
  }
};
let currentLanguage = localStorage.getItem('preferredLanguage') || 'zh_cn';
if (!['zh_cn', 'en_us'].includes(currentLanguage)) currentLanguage = currentLanguage === 'en' ? 'en_us' : 'zh_cn';
let settingsConfig = null;
let titleTypingSequence = 0;

async function typeTitle() {
  const sequence = ++titleTypingSequence;
  const title = translations[currentLanguage].title;
  const tagline = translations[currentLanguage].tagline;
  const behavior = settingsConfig?.behavior || {};
  const startDelay = behavior.titleTypingStartDelayMs ?? 500;
  const titleDelay = behavior.titleTypingDelayMs ?? 140;
  const taglinePause = behavior.taglineTypingPauseMs ?? 500;
  const taglineDelay = behavior.taglineTypingDelayMs ?? 120;
  titleTypingTextEl.textContent = '';
  taglineTypingTextEl.textContent = '';
  titleTypingCaretEl.classList.add('active');
  taglineTypingCaretEl.classList.remove('active');
  await new Promise(resolve => window.setTimeout(resolve, startDelay));
  for (const character of Array.from(title)) {
    if (sequence !== titleTypingSequence) return;
    titleTypingTextEl.textContent += character;
    await new Promise(resolve => window.setTimeout(resolve, titleDelay));
  }
  await new Promise(resolve => window.setTimeout(resolve, taglinePause));
  titleTypingCaretEl.classList.remove('active');
  taglineTypingCaretEl.classList.add('active');
  for (const character of Array.from(tagline)) {
    if (sequence !== titleTypingSequence) return;
    taglineTypingTextEl.textContent += character;
    await new Promise(resolve => window.setTimeout(resolve, taglineDelay));
  }
}

function setLanguage(lang) {
  currentLanguage = lang === 'en_us' ? 'en_us' : 'zh_cn';
  localStorage.setItem('preferredLanguage', currentLanguage);
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    const value = translations[currentLanguage][key];
    if (value) element.textContent = value;
  });

  document.querySelectorAll('[data-placeholder-en],[data-placeholder-zh]').forEach(element => {
    const configuredPlaceholder = settingsConfig?.placeholders?.[currentLanguage]?.[element.id];
    const placeholder = configuredPlaceholder ?? (currentLanguage === 'en_us' ? element.dataset.placeholderEn : element.dataset.placeholderZh);
    if (placeholder) element.placeholder = placeholder;
  });

  document.querySelectorAll('#zh_cn, #en_us').forEach(button => {
    button.classList.toggle('active', button.id === currentLanguage);
  });

  render();
  document.title = translations[currentLanguage].pageTitle;
  typeTitle();
}

function getText(key) {
  return translations[currentLanguage][key] || translations.zh_cn[key] || key;
}

let currentTheme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark';

function setTheme(theme) {
  currentTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = currentTheme;
  localStorage.setItem('theme', currentTheme);
  loadThemeColors();
  const themeToggle = document.querySelector('#themeToggle');
  if (!themeToggle) return;
  const nextThemeLabel = currentTheme === 'dark' ? '切换为浅色主题' : '切换为深色主题';
  themeToggle.textContent = currentTheme === 'dark' ? '☀' : '☾';
  themeToggle.setAttribute('aria-label', nextThemeLabel);
  themeToggle.title = nextThemeLabel;
}

// 默认只填写你的仓库身份，Token 必须由每位用户自行配置。 / Only the repository identity is prefilled; each user must provide their own token.
const defaultGithubSettings = { owner: 'k-7-t', repo: 'k-7-t.github.io', token: '' };
let githubSettings = { ...defaultGithubSettings };
try {
  githubSettings = {
    ...githubSettings,
    ...JSON.parse(localStorage.getItem('githubSettings') || '{}')
  };
} catch (error) {
  // 配置损坏时回退到默认仓库身份。 / Fall back to the default repository identity when the saved configuration is invalid.
}

let entries = [];
let filter = '全部';
let view = '主界面';
let pullSequence = 0;
let defaultSubject = localStorage.getItem('defaultSubject') || 'coding';
let storageConfig = null;
let accountConfig = { enabled: true, usersDirectory: 'users' };
let currentAccount = null;
let currentAccountIsAdmin = false;
let isGuest = false;
let adminUsernames = null;

// 初始化本地缓存和默认科目。 / Initialize the local cache and default subject.
try {
  entries = JSON.parse(localStorage.getItem('wrongAnswersCatalog') || '[]');
} catch (error) {
  entries = [];
}
defaultSubjectInput.value = defaultSubject;
subjectInput.value = defaultSubject;

function saveLocal() {
  // 浏览器禁用 localStorage 时，页面仍然可以继续使用内存中的数据。 / Keep using in-memory data when localStorage is unavailable.
  try {
    const key = accountConfig.enabled && isGuest
      ? 'guestWrongAnswersCatalog'
      : accountConfig.enabled && currentAccount
      ? `wrongAnswersCatalog:${currentAccount.username}`
      : 'wrongAnswersCatalog';
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (error) {
    // 忽略本地存储不可用的情况。 / Ignore local-storage failures.
  }
}

function newEntryId() {
  // ID 用于把网页卡片和 GitHub Issue 一一对应。 / Use the ID to associate each page card with one GitHub Issue.
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeEntries() {
  // 给旧数据补充 ID，避免升级后无法更新原来的 Issue。 / Add IDs to legacy data so existing Issues remain updateable after upgrades.
  if (!Array.isArray(entries)) entries = [];
  entries = entries.map(entry => ({ ...entry, id: entry.id || newEntryId() }));
  saveLocal();
}

normalizeEntries();

function syncConfigured() {
  return Boolean(githubSettings.owner && githubSettings.repo && githubSettings.token);
}

function setStatus(text, tone) {
  // 顶部状态文字使用 tone 控制颜色：正常、忙碌或错误。 / Use tone to color the status text for normal, busy, or error states.
  statusEl.textContent = text;
  statusEl.dataset.tone = tone || '';
}

function githubUrl(path = 'issues') {
  // 所有请求都固定发往目标仓库。 / Send all requests to the configured repository.
  return `https://api.github.com/repos/${encodeURIComponent(githubSettings.owner)}/${encodeURIComponent(githubSettings.repo)}/${path}`;
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${githubSettings.token}`,
    Accept: 'application/vnd.github+json'
  };
}

function issueBody(entry) {
  // 保留隐藏 ID，GitHub Issue 才能和网页卡片稳定对应。 / Preserve the hidden ID so the GitHub Issue stays linked to its page card.
  return [
    `<!-- wrong-answer-id: ${entry.id} -->`,
    entry.username ? `<!-- wrong-answer-user: ${entry.username} -->` : '',
    entry.username ? `Username: ${entry.username}` : '',
    `Public: ${entry.isPublic === true}`,
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
  // 同时兼容旧版英文格式和现在的中文格式。 / Support both the legacy English format and the current Chinese format.
  const body = issue.body || '';
  const marker = body.match(/wrong-answer-id:\s*([^\s>]+)/)?.[1];
  const username = body.match(/^Username:\s*([a-zA-Z0-9_-]+)/mi)?.[1]
    || body.match(/wrong-answer-user:\s*([a-zA-Z0-9_-]+)/)?.[1]
    || '';
  const id = marker || `github-issue-${issue.number}`;
  const questionMatch = body.match(/^(?:Question:|问题：)\n([\s\S]*?)\n\n(?:Correction:|订正：)/m);
  const correctionMatch = body.match(/^(?:Correction:|订正：)\n([\s\S]*)$/m);
  const subjectMatch = body.match(/^(?:Subject:|主题：)\s*(.*)$/m);
  const learntMatch = body.match(/^Learnt:\s*(true|false)$/mi);
  const publicMatch = body.match(/^Public:\s*(true|false)$/mi);
  const question = questionMatch
    ? questionMatch[1]
    : body.replace(/<!--[^>]*-->/g, '').trim();

  return {
    id,
    username,
    isPublic: publicMatch?.[1].toLowerCase() === 'true',
    title: issue.title,
    subject: subjectMatch ? subjectMatch[1] : '',
    learnt: learntMatch ? learntMatch[1].toLowerCase() === 'true' : false,
    question,
    answer: correctionMatch ? correctionMatch[1] : '',
    managed: Boolean(marker),
    issueNumber: issue.number,
    issueNodeId: issue.node_id,
    issueUrl: issue.html_url,
    issueState: issue.state
  };
}

async function githubGetIssues() {
  const issues = [];
  let page = 1;
  while (true) {
    const response = await fetch(githubUrl(`issues?state=all&per_page=100&page=${page}`), {
      cache: 'no-store',
      headers: githubHeaders()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `读取 GitHub 失败（${response.status}）`);
    issues.push(...data);
    if (data.length < 100) break;
    page += 1;
  }
  return issues.filter(issue => !issue.pull_request);
}

function githubEncodedPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function githubReadFile(path) {
  const response = await fetch(githubUrl(`contents/${githubEncodedPath(path)}`), {
    cache: 'no-store',
    headers: githubHeaders()
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `读取 GitHub 文件失败（${response.status}）`);
  }
  const file = await response.json();
  return decodeURIComponent(escape(atob(file.content.replace(/\s/g, ''))));
}

async function githubWriteFile(path, content, message) {
  const filePath = githubEncodedPath(path);
  const existingResponse = await fetch(githubUrl(`contents/${filePath}`), {
    cache: 'no-store',
    headers: githubHeaders()
  });
  let sha;
  if (existingResponse.ok) sha = (await existingResponse.json()).sha;
  else if (existingResponse.status !== 404) {
    const data = await existingResponse.json().catch(() => ({}));
    throw new Error(data.message || `读取 GitHub 文件失败（${existingResponse.status}）`);
  }
  const response = await fetch(githubUrl(`contents/${filePath}`), {
    method: 'PUT',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: btoa(unescape(encodeURIComponent(content))), sha })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `保存 GitHub 文件失败（${response.status}）`);
  }
  return response.json();
}

function accountRecordPath(username) {
  return `${accountConfig.usersDirectory || 'users'}/${username}.json`;
}

function toBase64Url(bytes) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function hashAccountPassword(password, salt = crypto.getRandomValues(new Uint8Array(16)), iterations = 210000) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2-sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(result))}`;
}

async function verifyAccountPassword(password, savedHash) {
  const parts = String(savedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 1) return false;
  try {
    return await hashAccountPassword(password, fromBase64Url(parts[2]), iterations) === savedHash;
  } catch (error) {
    return false;
  }
}

async function loadAdminUsernames() {
  const data = JSON.parse(await githubReadFile(`${accountConfig.usersDirectory || 'users'}/admins.json`) || '{}');
  return new Set(Array.isArray(data.admins) ? data.admins.map(name => String(name).toLowerCase()) : []);
}

async function setAccountFromRecord(record) {
  currentAccount = { username: record.username };
  isGuest = false;
  try {
    adminUsernames = await loadAdminUsernames();
  } catch (error) {
    adminUsernames = new Set();
  }
  currentAccountIsAdmin = adminUsernames.has(record.username);
  localStorage.setItem('activeTestAccount', record.username);
  updateAccountGate();
  if (storageConfig) await pullConfiguredWrongAnswers();
  setAccountMessage(`已登录：${record.username}${currentAccountIsAdmin ? '（管理员）' : ''}`, 'ok');
}

async function registerTestAccount() {
  const username = document.querySelector('#accountUsername').value.trim().toLowerCase();
  const password = document.querySelector('#accountPassword').value;
  if (!/^[a-z0-9_-]{3,32}$/.test(username)) throw new Error('用户名需为 3–32 位字母、数字、下划线或连字符');
  if (username === 'admins') throw new Error('admins 是管理员名单文件名，不能用作用户名');
  if (password.length < 8) throw new Error('密码至少需要 8 位');
  if (!syncConfigured()) throw new Error('请先配置 GitHub owner、repo 和 Token');
  const path = accountRecordPath(username);
  if (await githubReadFile(path) !== null) throw new Error('这个用户名已在 GitHub 仓库注册');
  const record = { username, pwd: await hashAccountPassword(password), createdAt: new Date().toISOString() };
  await githubWriteFile(path, JSON.stringify(record, null, 2), `feat: register user ${username}`);
  document.querySelector('#accountPassword').value = '';
  await setAccountFromRecord(record);
}

async function loginTestAccount() {
  const username = document.querySelector('#accountUsername').value.trim().toLowerCase();
  const password = document.querySelector('#accountPassword').value;
  if (!/^[a-z0-9_-]{3,32}$/.test(username) || !password) throw new Error('请输入有效的用户名和密码');
  if (!syncConfigured()) throw new Error('请先配置 GitHub owner、repo 和 Token');
  const serialized = await githubReadFile(accountRecordPath(username));
  if (!serialized) throw new Error('GitHub 仓库中找不到该账户，请先注册');
  let record;
  try {
    record = JSON.parse(serialized);
  } catch (error) {
    throw new Error('GitHub 仓库中的账户文件格式无效');
  }
  if (record.username !== username || !(await verifyAccountPassword(password, record.pwd))) throw new Error('用户名或密码错误');
  document.querySelector('#accountPassword').value = '';
  await setAccountFromRecord(record);
}

async function restoreTestAccount() {
  const username = localStorage.getItem('activeTestAccount');
  if (!username || !syncConfigured()) return false;
  try {
    const serialized = await githubReadFile(accountRecordPath(username));
    if (!serialized) throw new Error('GitHub 仓库账户文件不存在');
    const record = JSON.parse(serialized);
    if (record.username !== username || !record.pwd) throw new Error('GitHub 仓库账户文件无效');
    await setAccountFromRecord(record);
    return true;
  } catch (error) {
    return false;
  }
}

function setAccountMessage(message, tone = '') {
  accountStatus.textContent = message;
  accountStatus.dataset.tone = tone;
}

function updateAccountGate() {
  if (!accountPanel) return;
  accountPanel.hidden = !accountConfig.enabled;
  document.querySelector('#accountForm').hidden = Boolean(currentAccount) || isGuest;
  document.querySelector('#accountSession').hidden = !currentAccount && !isGuest;
  document.querySelector('#adminActions').hidden = !currentAccountIsAdmin;
  document.querySelector('#publicMistake').hidden = accountConfig.enabled && currentAccountIsAdmin;
  document.querySelector('#publicMistake').disabled = accountConfig.enabled && (!currentAccount || isGuest || currentAccountIsAdmin);
  document.querySelector('#add').disabled = accountConfig.enabled && !currentAccount && !isGuest;
  if (currentAccount || isGuest) {
    document.querySelector('#accountIdentity').textContent = isGuest
      ? '游客模式（仅本地保存）'
      : currentAccountIsAdmin ? `${currentAccount.username}（管理员）` : currentAccount.username;
  }
}

function setAccountFromGuest() {
  currentAccount = null;
  currentAccountIsAdmin = false;
  isGuest = true;
  localStorage.removeItem('activeTestAccount');
  try {
    entries = JSON.parse(localStorage.getItem('guestWrongAnswersCatalog') || '[]');
  } catch (error) {
    entries = [];
  }
  updateAccountGate();
  render();
  setAccountMessage('游客模式：错题只保存在当前浏览器。', 'ok');
}

function logoutTestAccount() {
  currentAccount = null;
  currentAccountIsAdmin = false;
  isGuest = false;
  localStorage.removeItem('activeTestAccount');
  entries = [];
  updateAccountGate();
  render();
  setAccountMessage('已退出登录');
}

function canManageEntry(entry) {
  if (!accountConfig.enabled) return true;
  if (currentAccountIsAdmin) return true;
  return Boolean(currentAccount && entry.username === currentAccount.username);
}

async function githubPermanentlyDeleteIssue(issueNodeId) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation($id: ID!) { deleteIssue(input: {issueId: $id}) { clientMutationId } }',
      variables: { id: issueNodeId }
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.errors?.length) throw new Error(result.errors?.map(item => item.message).join('; ') || `删除 GitHub Issue 失败（${response.status}）`);
}

async function deleteIssuePermanently(index) {
  if (!currentAccountIsAdmin) return;
  const entry = entries[index];
  if (!entry?.issueNodeId) return;
  const title = entry.title || '未命名题目';
  if (!window.confirm(`永久删除错题「${title}」？此操作无法撤销。`)) return;
  if (!window.confirm('再次确认：从 GitHub 永久删除这个 Issue？')) return;
  try {
    await githubPermanentlyDeleteIssue(entry.issueNodeId);
    entries.splice(index, 1);
    render();
    setStatus('错题 Issue 已永久删除', 'ok');
  } catch (error) {
    setStatus(`永久删除失败：${error.message}`, 'err');
  }
}

async function deleteAllIssuesPermanently() {
  if (!currentAccountIsAdmin || !window.confirm('永久删除仓库内所有错题 Issue？此操作无法撤销。')) return;
  if (!window.confirm('再次确认：删除所有 Issue？')) return;
  try {
    const issues = await githubGetIssues();
    for (const issue of issues) await githubPermanentlyDeleteIssue(issue.node_id);
    entries = [];
    render();
    setStatus(`已永久删除 ${issues.length} 条错题`, 'ok');
  } catch (error) {
    setStatus(`删除全部错题失败：${error.message}`, 'err');
  }
}

function mistakesMarkdown() {
  return ['# 错题记录', '', '<!-- mistake-data-start -->', '```json', JSON.stringify(entries, null, 2), '```', '<!-- mistake-data-end -->'].join('\n');
}

function entriesFromMarkdown(markdown) {
  const match = markdown?.match(/<!-- mistake-data-start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- mistake-data-end -->/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function pullFromMarkdown() {
  if (!syncConfigured()) return false;
  const markdown = await githubReadFile(storageConfig.wrongAnswers.markdown.fileName);
  if (markdown === null) return false;
  entries = entriesFromMarkdown(markdown);
  normalizeEntries();
  setStatus(`已同步（${entries.length} 条错题）`, 'ok');
  render();
  return true;
}

async function pushToMarkdown() {
  if (!syncConfigured()) return;
  await githubWriteFile(
    storageConfig.wrongAnswers.markdown.fileName,
    mistakesMarkdown(),
    `chore: update mistakes ${new Date().toISOString()}`
  );
  setStatus('错题已保存到 Markdown', 'ok');
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
  const savedIssue = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(savedIssue.message || `写入 GitHub Issue 失败（${response.status}）`);
  return savedIssue;
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
  // 请求序号防止旧的并发请求覆盖最新的刷新结果。 / Use request sequencing so an older concurrent request cannot overwrite newer results.
  if (!syncConfigured()) return false;
  if (accountConfig.enabled && (!currentAccount || isGuest)) return false;
  const requestId = ++pullSequence;
  setStatus('正在读取 GitHub……', 'busy');

  try {
    const issues = await githubGetIssues();
    if (requestId !== pullSequence) return false;
    const parsedEntries = issues.map(entryFromIssue).filter(Boolean);
    entries = !accountConfig.enabled || currentAccountIsAdmin
      ? parsedEntries
      : parsedEntries.filter(entry => entry.username === currentAccount.username || entry.isPublic);
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
  // 写入或关闭后再次拉取，网页卡片显示 GitHub 的真实结果。 / Pull again after writing or closing so cards show GitHub's actual state.
  if (!syncConfigured()) return;
  setStatus('正在同步 GitHub……', 'busy');

  try {
    const issues = await githubGetIssues();
    const byId = new Map(issues.map(issue => [entryFromIssue(issue).id, issue]));
    for (const entry of entries) {
      if (!canManageEntry(entry) || entry.issueState === 'closed') continue;
      const savedIssue = await githubWriteIssue(byId.get(entry.id), entry);
      entry.issueNumber = savedIssue.number;
      entry.issueNodeId = savedIssue.node_id;
      entry.issueUrl = savedIssue.html_url;
      entry.issueState = savedIssue.state;
    }

    if (!await pullFromGithub()) return;
    setStatus('已同步', 'ok');
  } catch (error) {
    setStatus(`同步失败：${error.message}`, 'err');
  }
}

let settingsPromise = null;

async function loadSettings() {
  if (!settingsPromise) {
    settingsPromise = fetch('./settings.json', { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error('无法读取 settings.json');
      return response.json();
    });
  }
  return settingsPromise;
}

async function loadStorageConfig() {
  const json = await loadSettings();
  const storage = json.storage || {};
  const wrongAnswers = storage.wrongAnswers || {};
  const studyPlan = storage.studyPlan || {};
  return {
    ...storage,
    wrongAnswers: {
      ...wrongAnswers,
      defaultOption: ['local', 'markdown', 'issue'].includes(wrongAnswers.defaultOption) ? wrongAnswers.defaultOption : 'issue',
      markdown: { fileName: 'mistakes.md', ...(wrongAnswers.markdown || {}) }
    },
    studyPlan: {
      ...studyPlan,
      defaultOption: ['local', 'markdown'].includes(studyPlan.defaultOption) ? studyPlan.defaultOption : 'markdown'
    }
  };
}

async function loadThemeColors() {
  try {
    const json = await loadSettings();
    const selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const variables = json.theme?.[selectedTheme]?.cssVariables || {};
    for (const [name, value] of Object.entries(variables)) {
      if (/^--[a-z0-9-]+$/i.test(name) && typeof value === 'string') {
        document.documentElement.style.setProperty(name, value);
      }
    }
  } catch (error) {
    // 主题配置不可用时使用 style.css 中的默认颜色。 / Use the default colors from style.css when the theme configuration is unavailable.
  }
}

async function pullConfiguredWrongAnswers() {
  if (accountConfig.enabled) {
    if (isGuest) {
      const key = 'guestWrongAnswersCatalog';
      try { entries = JSON.parse(localStorage.getItem(key) || '[]'); } catch (error) { entries = []; }
      normalizeEntries();
      render();
      return true;
    }
    if (!currentAccount) {
      entries = [];
      render();
      setAccountMessage('请登录或注册，或以游客身份使用本地错题。');
      return false;
    }
    return pullFromGithub();
  }
  if (storageConfig.wrongAnswers.defaultOption === 'local') {
    try { entries = JSON.parse(localStorage.getItem('wrongAnswersCatalog') || '[]'); } catch (error) { entries = []; }
    normalizeEntries();
    render();
    return true;
  }
  if (storageConfig.wrongAnswers.defaultOption === 'markdown') return pullFromMarkdown();
  return pullFromGithub();
}

async function pushConfiguredWrongAnswers() {
  if (!storageConfig) return;
  const mode = storageConfig.wrongAnswers.defaultOption;
  if (accountConfig.enabled && isGuest) { saveLocal(); return; }
  if (accountConfig.enabled && !currentAccount) return;
  if (mode === 'local') { saveLocal(); return; }
  if (mode === 'markdown') return pushToMarkdown();
  return pushToGithub();
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
  // 只根据当前视图生成“全部”和该视图拥有的科目按钮。 / Generate All and subject buttons only from the current view.
  const rawSubjects = ['全部', ...new Set(currentEntries.map(entry => entry.subject).filter(Boolean))];
  tabsEl.innerHTML = rawSubjects.map(subject => {
    const label = currentLanguage === 'en_us' ? (subject === '全部' ? 'All' : subject) : subject;
    return `<button class="tab ${subject === filter ? 'active' : ''}" data-s="${escapeHtml(subject)}">${escapeHtml(label)}</button>`;
  }).join('');
  tabsEl.querySelectorAll('.tab').forEach(button => {
    button.onclick = () => {
      filter = button.dataset.s;
      render();
    };
  });
}

function renderViewTabs() {
  const rawViews = ['主界面', '已解决', '已关闭'];
  if (!currentAccountIsAdmin) rawViews.push('公开');
  const labels = {
    主界面: currentLanguage === 'en_us' ? 'Main' : '主界面',
    已解决: currentLanguage === 'en_us' ? 'Solved' : '已解决',
    已关闭: currentLanguage === 'en_us' ? 'Closed' : '已关闭',
    公开: getText('publicView')
  };
  if (currentAccountIsAdmin && view === '公开') view = '主界面';
  viewTabsEl.innerHTML = rawViews.map(item =>
    `<button class="tab ${item === view ? 'active' : ''}" data-view="${item}">${labels[item]}</button>`
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
  const visibleEntries = accountConfig.enabled && currentAccount && !currentAccountIsAdmin
    ? entries.filter(entry => entry.username === currentAccount.username || entry.isPublic)
    : entries;
  if (view === '公开') return visibleEntries.filter(entry => entry.isPublic);
  const statusEntries = currentAccountIsAdmin
    ? visibleEntries
    : visibleEntries.filter(entry => !entry.isPublic || canManageEntry(entry));
  if (view === '已解决') return statusEntries.filter(entry => entry.issueState !== 'closed' && entry.learnt);
  if (view === '已关闭') return statusEntries.filter(entry => entry.issueState === 'closed');
  return statusEntries.filter(entry => entry.issueState !== 'closed' && !entry.learnt);
}

function render() {
  // 每次本地操作或远程同步后重绘卡片列表。 / Re-render the card list after each local action or remote sync.
  renderViewTabs();
  const currentEntries = entriesForView();
  renderTabs(currentEntries);
  const shown = filter === '全部' ? currentEntries : currentEntries.filter(entry => entry.subject === filter);
  countEl.textContent = shown.length ? (currentLanguage === 'en_us' ? `Total ${shown.length} mistakes` : `共 ${shown.length} 条错题`) : '';
  list.innerHTML = shown.length ? shown.map(entry => {
    const index = entries.indexOf(entry);
    const color = entry.subject ? tabColor(entry.subject) : 'var(--gold)';
    return `
      <article class="card glass" style="--tab-color:${color}">
        ${canManageEntry(entry) ? `<button class="remove" aria-label="关闭错题" onclick="removeEntry(${index})">×</button>` : ''}
        <h2>${escapeHtml(entry.title || '未命名题目')}</h2>
        <div class="meta">${escapeHtml(entry.subject || '未分类')}${entry.isPublic ? ` · ${escapeHtml(getText('publicView'))}` : ''}${entry.username ? ` · ${escapeHtml(getText('senderId'))}: ${escapeHtml(entry.username)}` : ''}</div>
        <div class="issue-receipt ${entry.issueNumber ? 'exists' : 'pending'}">
          ${entry.issueNumber
            ? `<a href="${escapeHtml(entry.issueUrl)}" target="_blank" rel="noopener">GitHub #${escapeHtml(entry.issueNumber)}</a>`
            : (currentLanguage === 'en_us' ? 'Not synced yet' : '尚未同步')}
        </div>
        <p class="q">${escapeHtml(entry.question)}</p>
        <div class="answer"><strong>${currentLanguage === 'en_us' ? 'Correction: ' : '订正： '}</strong>${escapeHtml(entry.answer || (currentLanguage === 'en_us' ? 'Remember to fill this in next time.' : '下次记得补充错因。'))}</div>
        ${(canManageEntry(entry) || currentAccountIsAdmin) && entry.issueState !== 'closed'
          ? `<button class="learned ${entry.learnt ? 'active' : ''}" onclick="toggleLearnt(${index})">${entry.learnt ? (currentLanguage === 'en_us' ? 'Mark as not learned' : '标记为未学会') : (currentLanguage === 'en_us' ? 'I have learned it' : '我已学会')}</button>`
          : ''}
        ${currentAccountIsAdmin && entry.issueNodeId ? `<button class="danger small card-admin-delete" onclick="deleteIssuePermanently(${index})">${escapeHtml(getText('adminDelete'))}</button>` : ''}
      </article>`;
  }).join('') : `<p class="empty glass">${getText('emptyState')}</p>`;
}

async function removeEntry(index) {
  const entry = entries[index];
  if (!entry || !canManageEntry(entry)) return;
  const title = entry?.title || '未命名题目';
  if (!window.confirm(`是否删除错题「${title}」？\nGitHub Issue 将会被关闭。`)) return;
  try {
    if (entry.issueNumber && entry.issueState !== 'closed' && (accountConfig.enabled || storageConfig?.wrongAnswers.defaultOption === 'issue')) {
      await githubCloseIssue(entry);
    }
    entries.splice(index, 1);
    saveLocal();
    render();
    setStatus('错题已删除或关闭', 'ok');
  } catch (error) {
    setStatus(`删除错题失败：${error.message}`, 'err');
  }
}

function toggleLearnt(index) {
  if (!entries[index] || !canManageEntry(entries[index])) return;
  entries[index].learnt = !entries[index].learnt;
  saveLocal();
  render();
  pushConfiguredWrongAnswers();
}

function setPublicToggle(active) {
  const button = document.querySelector('#publicMistake');
  const enabled = Boolean(active && !currentAccountIsAdmin && (!accountConfig.enabled || currentAccount));
  button.setAttribute('aria-pressed', String(enabled));
  button.classList.toggle('active', enabled);
}

document.querySelector('#publicMistake').onclick = () => {
  const button = document.querySelector('#publicMistake');
  setPublicToggle(button.getAttribute('aria-pressed') !== 'true');
};

document.querySelector('#add').onclick = async () => {
  if (accountConfig.enabled && !currentAccount && !isGuest) {
    setAccountMessage('请先登录、注册，或以游客身份进入。', 'err');
    return;
  }
  const data = Object.fromEntries(fields.map(id => [id, document.querySelector('#' + id).value.trim()]));
  if (!data.question) {
    document.querySelector('#question').focus();
    return;
  }
  const isPublic = document.querySelector('#publicMistake').getAttribute('aria-pressed') === 'true'
    && !isGuest && !currentAccountIsAdmin;
  entries.unshift({
    ...data,
    id: newEntryId(),
    username: currentAccount?.username || '',
    isPublic,
    learnt: false,
    issueState: 'open'
  });
  saveLocal();
  filter = '全部';
  view = isPublic ? '公开' : '主界面';
  render();
  setPublicToggle(false);
  fields.forEach(id => {
    document.querySelector('#' + id).value = id === 'subject' ? defaultSubject : '';
  });
  await pushConfiguredWrongAnswers();
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

async function loadStudyPlanStorageConfig() {
  if (storageConfig?.studyPlan) return {
    storageMode: storageConfig.studyPlan.defaultOption,
    fileName: storageConfig.studyPlan.markdown?.fileName || 'studyplan.md'
  };
  return { storageMode: 'markdown', fileName: 'studyplan.md' };
}

function saveStudyPlanLocally(planText) {
  try {
    localStorage.setItem('studyPlanMarkdown', planText);
  } catch (error) {
    // 浏览器本地存储不可用时仅保留当前内存内容。 / Keep the current in-memory content when browser storage is unavailable.
  }

  const blob = new Blob([planText], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'studyplan.md';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveStudyPlanToGithub(planText) {
  if (!syncConfigured()) {
    setStatus(getText('noToken'), 'err');
    return false;
  }

  const path = (await loadStudyPlanStorageConfig()).fileName;
  const message = `chore: update study plan ${new Date().toISOString()}`;
  try {
    await githubWriteFile(path, planText, message);

    setStatus(getText('githubSave'), 'ok');
    return true;
  } catch (error) {
    setStatus(`保存失败：${error.message}`, 'err');
    return false;
  }
}

async function saveStudyPlan(planText) {
  const config = await loadStudyPlanStorageConfig();
  if (config.storageMode === 'local') {
    saveStudyPlanLocally(planText);
    setStatus(getText('localSave'), 'ok');
    return true;
  }
  return saveStudyPlanToGithub(planText);
}

async function generateStudyPlan() {
  const activeEntries = entries.filter(entry => entry.issueState !== 'closed');
  if (!activeEntries.length) {
    const planText = ['# 学习计划', '', getText('noPlan')].join('\n');
    agentOutputEl.value = planText;
    await saveStudyPlan(planText);
    return;
  }

  const summary = new Map();
  for (const entry of activeEntries) {
    const subject = entry.subject || '未分类';
    summary.set(subject, (summary.get(subject) || 0) + 1);
  }

  const rankedSubjects = [...summary.entries()].sort((a, b) => b[1] - a[1]);
  const topSubjects = rankedSubjects.slice(0, 3).map(([subject, count]) => `${subject}（${count} 条）`).join('、') || '暂无';
  const total = activeEntries.length;
  const unresolved = activeEntries.filter(entry => !entry.learnt).length;
  const learned = total - unresolved;
  const firstSubject = rankedSubjects[0]?.[0] || '未分类';

  const planLines = [
    '# 学习计划',
    '',
    `- 当前待复习共 ${total} 条，其中已学会 ${learned} 条，尚未掌握 ${unresolved} 条。`,
    `- 优先级最高的科目：${topSubjects}。`,
    `- 建议先从「${firstSubject}」开始，按 1：复述知识点 2：重做题目 3：总结误区 的顺序复盘。`,
    '- 如果今天只能处理 20 分钟，先做 3 道最容易忘的题，再补 1 道高频题。',
    '- 完成复盘后，把“正确答案/本次学到的内容”补全，确保下一次生成计划更精准。'
  ];

  const planText = planLines.join('\n');
  agentOutputEl.value = planText;
  await saveStudyPlan(planText);
}

document.querySelector('#export').onclick = exportTxt;
document.querySelector('#print').onclick = () => window.print();
document.querySelector('#generatePlan').onclick = generateStudyPlan;
document.getElementById('zh_cn').onclick = () => setLanguage('zh_cn');
document.getElementById('en_us').onclick = () => setLanguage('en_us');
document.getElementById('themeToggle').onclick = () => setTheme(currentTheme === 'dark' ? 'light' : 'dark');
document.querySelector('#saveSubject').onclick = () => {
  defaultSubject = defaultSubjectInput.value.trim() || 'coding';
  defaultSubjectInput.value = defaultSubject;
  subjectInput.value = defaultSubject;
  localStorage.setItem('defaultSubject', defaultSubject);
};
document.querySelector('#refreshIssues').onclick = () => pullFromGithub();
document.querySelector('#accountLogin').onclick = async () => {
  try {
    setAccountMessage('正在从 GitHub 读取账户……', 'busy');
    await loginTestAccount();
  } catch (error) {
    setAccountMessage(`登录失败：${error.message}`, 'err');
  }
};
document.querySelector('#accountRegister').onclick = async () => {
  try {
    setAccountMessage('正在创建 GitHub 账户文件……', 'busy');
    await registerTestAccount();
  } catch (error) {
    setAccountMessage(`注册失败：${error.message}`, 'err');
  }
};
document.querySelector('#accountGuest').onclick = setAccountFromGuest;
document.querySelector('#accountLogout').onclick = logoutTestAccount;
document.querySelector('#adminDeleteAll').onclick = deleteAllIssuesPermanently;
document.querySelector('#githubSettingsToggle').onclick = () => {
  const panel = document.querySelector('#githubSettingsPanel');
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    document.querySelector('#ghOwner').value = githubSettings.owner;
    document.querySelector('#ghRepo').value = githubSettings.repo;
    document.querySelector('#ghToken').value = githubSettings.token;
  }
};
document.querySelector('#saveGithubSettings').onclick = async () => {
  githubSettings = {
    owner: document.querySelector('#ghOwner').value.trim() || defaultGithubSettings.owner,
    repo: document.querySelector('#ghRepo').value.trim() || defaultGithubSettings.repo,
    token: document.querySelector('#ghToken').value.trim()
  };
  localStorage.setItem('githubSettings', JSON.stringify(githubSettings));
  document.querySelector('#githubSettingsPanel').hidden = true;
  if (!githubSettings.token) {
    setStatus('已保存连接设置，请填写 GitHub Token。', 'err');
    return;
  }
  setStatus('正在验证 GitHub 连接……', 'busy');
  try {
    await githubGetIssues();
    setStatus(`已连接到 ${githubSettings.owner}/${githubSettings.repo}`, 'ok');
    if (accountConfig.enabled) {
      if (!(await restoreTestAccount())) setAccountMessage(getText('accountLoginPrompt'));
    } else {
      await pullConfiguredWrongAnswers();
    }
  } catch (error) {
    setStatus(`GitHub 连接失败：${error.message}`, 'err');
  }
};

setLanguage(currentLanguage);
setTheme(currentTheme);
render();
(async () => {
  try {
    settingsConfig = await loadSettings();
    accountConfig = { enabled: true, usersDirectory: 'users', ...(settingsConfig.accountSystem || {}) };
    Object.assign(translations.zh_cn, settingsConfig.text?.zh_cn || {});
    Object.assign(translations.en_us, settingsConfig.text?.en_us || {});
    const defaults = settingsConfig.defaults || {};
    if (!localStorage.getItem('preferredLanguage') && ['zh_cn', 'en_us'].includes(defaults.language)) {
      currentLanguage = defaults.language;
    }
    if (!localStorage.getItem('theme') && ['light', 'dark'].includes(defaults.theme)) {
      currentTheme = defaults.theme;
      setTheme(currentTheme);
    }
    if (!localStorage.getItem('defaultSubject') && typeof defaults.subject === 'string') {
      defaultSubject = defaults.subject;
      defaultSubjectInput.value = defaultSubject;
      subjectInput.value = defaultSubject;
    }
    setLanguage(currentLanguage);
    await loadThemeColors();
    storageConfig = await loadStorageConfig();
    updateAccountGate();
    if (accountConfig.enabled) {
      if (!(await restoreTestAccount())) setAccountMessage(getText('accountLoginPrompt'));
    } else {
      await pullConfiguredWrongAnswers();
    }
  } catch (error) {
    setStatus(`读取保存配置失败：${error.message}`, 'err');
  }
})();
