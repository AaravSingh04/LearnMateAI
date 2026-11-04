/**
 * StudyAI LMS - Academic Performance & Analytics JavaScript
 * Real-time SQLite-backed metrics, subject mastery, and focus statistics.
 */

const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:8005' : '';

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-purple-600 text-white';
  toast.className = `p-3 px-4 rounded-xl shadow-xl text-xs font-semibold flex items-center space-x-2 transition transform duration-200 ${bg}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// DOM Elements - KPIs
const kpiAvgScore = document.getElementById('kpi-avg-score');
const kpiPassingRate = document.getElementById('kpi-passing-rate');
const kpiQuizzesCount = document.getElementById('kpi-quizzes-count');
const kpiPacksCount = document.getElementById('kpi-packs-count');
const kpiMaterialsCount = document.getElementById('kpi-materials-count');
const kpiFocusHours = document.getElementById('kpi-focus-hours');
const kpiSessionsCount = document.getElementById('kpi-sessions-count');
const kpiSubjectsCount = document.getElementById('kpi-subjects-count');

// DOM Elements - Containers
const subjectsGrid = document.getElementById('subjects-analytics-grid');
const recentQuizzesContainer = document.getElementById('recent-quizzes-container');
const refreshBtn = document.getElementById('refresh-analytics-btn');

// Fetch and Render Analytics Data
async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/analytics`);
    if (!res.ok) throw new Error('Failed to load analytics.');
    const data = await res.json();
    renderKPIs(data);
    renderSubjects(data.subjects || []);
    renderRecentQuizzes(data.recent_quizzes || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderKPIs(data) {
  if (kpiAvgScore) kpiAvgScore.textContent = `${data.avg_quiz_score || 0}%`;
  if (kpiPassingRate) kpiPassingRate.textContent = `${data.passing_rate || 0}% passing`;
  if (kpiQuizzesCount) kpiQuizzesCount.textContent = `Across ${data.total_quiz_attempts || 0} completed quiz attempts`;
  if (kpiPacksCount) kpiPacksCount.textContent = data.total_study_packs || 0;
  if (kpiMaterialsCount) kpiMaterialsCount.textContent = `From ${data.total_materials || 0} uploaded lecture materials`;
  if (kpiFocusHours) kpiFocusHours.textContent = `${data.total_focus_minutes || 0}m`;
  if (kpiSessionsCount) kpiSessionsCount.textContent = `${data.total_timer_sessions || 0} logged focus intervals`;
  if (kpiSubjectsCount) kpiSubjectsCount.textContent = data.total_subjects || 0;
}

function renderSubjects(subjects) {
  if (!subjectsGrid) return;
  subjectsGrid.innerHTML = '';

  if (subjects.length === 0) {
    subjectsGrid.innerHTML = `
      <div class="col-span-2 p-8 rounded-xl bg-[#151748]/60 border border-dashed border-purple-500/20 text-center text-xs text-[#A5B4FC]">
        No course subjects registered yet. Create subjects on your dashboard to track learning analytics.
      </div>
    `;
    return;
  }

  const palettes = [
    { border: 'hover:border-purple-500', bar: 'from-purple-600 to-indigo-600', badge: 'bg-purple-600/30 text-purple-300' },
    { border: 'hover:border-indigo-500', bar: 'from-indigo-600 to-blue-600', badge: 'bg-indigo-600/30 text-indigo-300' },
    { border: 'hover:border-emerald-500', bar: 'from-emerald-600 to-teal-600', badge: 'bg-emerald-600/30 text-emerald-300' },
    { border: 'hover:border-amber-500', bar: 'from-amber-600 to-orange-600', badge: 'bg-amber-600/30 text-amber-300' }
  ];

  subjects.forEach((sub, idx) => {
    const pal = palettes[idx % palettes.length];
    const avgScore = sub.avg_score || 0;
    const card = document.createElement('div');
    card.className = `dark-card p-5 border border-purple-500/20 ${pal.border} transition flex flex-col justify-between space-y-4`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pal.badge}">
            Subject #${sub.id}
          </span>
          <span class="text-xs font-bold text-white">${avgScore}% Mastery</span>
        </div>
        <h3 class="text-base font-bold text-white tracking-tight">${escapeHtml(sub.name)}</h3>
        <p class="text-xs text-[#A5B4FC] mt-0.5 line-clamp-1">${escapeHtml(sub.description || 'Full lecture curriculum & study folio.')}</p>
      </div>

      <!-- Mastery Progress Bar -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-3xs text-[#818CF8] font-semibold">
          <span>Quiz Performance</span>
          <span class="text-white">${avgScore}%</span>
        </div>
        <div class="w-full h-2 rounded-full bg-[#27205F] overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r ${pal.bar} transition-all duration-500" style="width: ${Math.max(avgScore, 8)}%"></div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-2 pt-2 border-t border-purple-500/15 text-center text-xs">
        <div class="p-2 rounded-lg bg-[#080B2F]/60">
          <span class="text-sm font-extrabold text-white block">${sub.materials_count || 0}</span>
          <span class="text-3xs text-[#818CF8]">Decks</span>
        </div>
        <div class="p-2 rounded-lg bg-[#080B2F]/60">
          <span class="text-sm font-extrabold text-white block">${sub.topics_count || 0}</span>
          <span class="text-3xs text-[#818CF8]">Topics</span>
        </div>
        <div class="p-2 rounded-lg bg-[#080B2F]/60">
          <span class="text-sm font-extrabold text-white block">${sub.quiz_attempts_count || 0}</span>
          <span class="text-3xs text-[#818CF8]">Quizzes</span>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-between pt-1">
        <a href="subject.html?subject_id=${sub.id}" class="text-xs font-semibold text-purple-400 hover:text-white flex items-center gap-1 transition">
          <span>Open Workspace</span>
          <span>&rarr;</span>
        </a>
        <a href="quiz.html?subject_id=${sub.id}" class="btn-dark-outline px-3 py-1 text-3xs font-semibold">
          Take Practice Quiz
        </a>
      </div>
    `;

    subjectsGrid.appendChild(card);
  });
}

function renderRecentQuizzes(attempts) {
  if (!recentQuizzesContainer) return;
  recentQuizzesContainer.innerHTML = '';

  if (attempts.length === 0) {
    recentQuizzesContainer.innerHTML = `
      <div class="p-6 text-center text-xs text-[#818CF8]">
        No quiz attempts recorded yet. Take an interactive quiz from your subject pages or the Quiz hub!
      </div>
    `;
    return;
  }

  attempts.forEach((att) => {
    const isPassing = att.percentage >= 60;
    const badgeColor = isPassing 
      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
      : 'bg-rose-950/60 border border-rose-500/40 text-rose-300';

    const row = document.createElement('div');
    row.className = 'p-3 rounded-xl bg-[#151748]/70 hover:bg-[#27205F]/60 border border-purple-500/20 flex items-center justify-between text-xs transition';

    row.innerHTML = `
      <div class="flex items-center space-x-3 min-w-0 pr-2">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${isPassing ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
          ${att.percentage}%
        </div>
        <div class="truncate">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-white truncate">${escapeHtml(att.subject_name)}</span>
            <span class="text-3xs text-[#C4B5FD] truncate">• ${escapeHtml(att.material_title || 'Lecture Slides')}</span>
          </div>
          <span class="text-3xs text-[#818CF8]">${formatDate(att.attempted_at)}</span>
        </div>
      </div>

      <div class="flex items-center space-x-3 shrink-0">
        <span class="text-3xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}">
          ${att.score} / ${att.total_questions} Correct
        </span>
        <a href="quiz.html?subject_id=${att.subject_id}" class="text-3xs font-bold text-purple-400 hover:text-white px-2 py-1 rounded bg-[#27205F] transition">
          Retake →
        </a>
      </div>
    `;

    recentQuizzesContainer.appendChild(row);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    showToast('Refreshing live academic analytics...', 'info');
    loadAnalytics();
  });
}

// AI Assistant Voice-to-Text Integration
const aiModal = document.getElementById('ai-assistant-modal');
const openAssistantNavBtn = document.getElementById('open-assistant-nav-btn');
const closeAssistantBtn = document.getElementById('close-assistant-btn');
const assistantMicBtn = document.getElementById('assistant-mic-btn');
const assistantTextInput = document.getElementById('assistant-text-input');
const assistantSendBtn = document.getElementById('assistant-send-btn');
const assistantChatHistory = document.getElementById('assistant-chat-history');

if (openAssistantNavBtn && aiModal) {
  openAssistantNavBtn.addEventListener('click', () => aiModal.classList.remove('hidden'));
}
if (closeAssistantBtn && aiModal) {
  closeAssistantBtn.addEventListener('click', () => aiModal.classList.add('hidden'));
}

async function handleAssistantSend() {
  if (!assistantTextInput) return;
  const query = assistantTextInput.value.trim();
  if (!query) return;

  appendAssistantMsg(query, 'user');
  assistantTextInput.value = '';

  const thinkingId = appendAssistantMsg('Thinking...', 'ai', true);

  try {
    const res = await fetch(`${API_BASE}/api/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    const el = document.getElementById(thinkingId);
    if (el) el.remove();

    if (res.ok && data.reply) {
      appendAssistantMsg(data.reply, 'ai');
    } else {
      appendAssistantMsg('I am unable to answer right now. Please try again.', 'ai');
    }
  } catch (err) {
    const el = document.getElementById(thinkingId);
    if (el) el.remove();
    appendAssistantMsg('Network connection error.', 'ai');
  }
}

function appendAssistantMsg(text, sender, isThinking = false) {
  if (!assistantChatHistory) return null;
  const div = document.createElement('div');
  const id = 'msg-' + Date.now();
  div.id = id;
  if (sender === 'user') {
    div.className = 'p-3 rounded-xl bg-purple-600 text-white ml-auto max-w-[85%] leading-relaxed';
  } else {
    div.className = `p-3 rounded-xl bg-[#151748]/80 text-[#DDD6FE] border border-purple-500/20 max-w-[85%] leading-relaxed ${isThinking ? 'italic opacity-60' : ''}`;
  }
  div.textContent = text;
  assistantChatHistory.appendChild(div);
  assistantChatHistory.scrollTop = assistantChatHistory.scrollHeight;
  return id;
}

if (assistantSendBtn) assistantSendBtn.addEventListener('click', handleAssistantSend);
if (assistantTextInput) {
  assistantTextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAssistantSend();
  });
}

// Voice Recognition
let speechRec = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  speechRec = new SpeechRec();
  speechRec.continuous = false;
  speechRec.interimResults = false;
  speechRec.lang = 'en-IN';

  speechRec.onresult = (evt) => {
    const text = evt.results[0][0].transcript;
    if (assistantTextInput) {
      assistantTextInput.value = text;
      handleAssistantSend();
    }
  };

  speechRec.onend = () => {
    if (assistantMicBtn) assistantMicBtn.classList.remove('bg-rose-600', 'animate-pulse');
  };
}

if (assistantMicBtn) {
  assistantMicBtn.addEventListener('click', () => {
    if (!speechRec) {
      showToast('Speech recognition not supported in this browser.', 'error');
      return;
    }
    try {
      assistantMicBtn.classList.add('bg-rose-600', 'animate-pulse');
      speechRec.start();
    } catch (e) {
      speechRec.stop();
    }
  });
}

document.addEventListener('DOMContentLoaded', loadAnalytics);
