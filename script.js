const list = document.querySelector('#list');
const tabsEl = document.querySelector('#tabs');
const countEl = document.querySelector('#count');
const fields = ['subject', 'title', 'question', 'answer'];
let entries = [];
let filter = 'All';

try {
  entries = JSON.parse(localStorage.getItem('wrongAnswersCatalog') || '[]');
} catch (e) { entries = []; }

function save() {
  try { localStorage.setItem('wrongAnswersCatalog', JSON.stringify(entries)); }
  catch (e) { /* storage unavailable */ }
}

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

function removeEntry(idx) { entries.splice(idx, 1); save(); render(); }

document.querySelector('#add').onclick = () => {
  const data = Object.fromEntries(fields.map(id => [id, document.querySelector('#' + id).value.trim()]));
  if (!data.question) { document.querySelector('#question').focus(); return; }
  entries.unshift(data);
  save();
  filter = 'All';
  render();
  fields.forEach(id => document.querySelector('#' + id).value = '');
};
document.querySelector('#print').onclick = () => window.print();

render();