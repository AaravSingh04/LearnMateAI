/**
 * StudyAI LMS - Manage Syllabus Controller
 * Clean, simplified syllabus and course topics manager.
 */

let currentSubjectId = null;
let currentSubjectTopics = [];

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  loadSubjects();
  initAIAssistant();
});

function initElements() {
  const subjectSelect = document.getElementById('syllabus-subject-select');
  subjectSelect?.addEventListener('change', (e) => {
    currentSubjectId = parseInt(e.target.value, 10);
    if (currentSubjectId) loadSubjectSyllabus(currentSubjectId);
  });

  const saveBtn = document.getElementById('save-syllabus-btn');
  saveBtn?.addEventListener('click', saveSyllabus);

  const autofillBtn = document.getElementById('autofill-syllabus-btn');
  autofillBtn?.addEventListener('click', autoFillSyllabus);

  const textInput = document.getElementById('syllabus-text-input');
  const charCount = document.getElementById('syllabus-char-count');
  const saveStatus = document.getElementById('syllabus-save-status');

  textInput?.addEventListener('input', () => {
    const val = textInput.value;
    if (charCount) charCount.textContent = `${val.length} characters`;
    if (saveStatus) {
      saveStatus.textContent = 'Unsaved changes';
      saveStatus.className = 'text-amber-400 font-medium';
    }
  });
}

async function loadSubjects() {
  try {
    const res = await fetch('/api/subjects');
    if (!res.ok) return;
    const subjects = await res.json();
    const select = document.getElementById('syllabus-subject-select');
    if (!select) return;

    if (!subjects || subjects.length === 0) {
      select.innerHTML = '<option value="">No subjects found</option>';
      return;
    }

    select.innerHTML = subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

    // Check URL parameter or default to first
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('subject_id');
    if (paramId && subjects.some(s => s.id == paramId)) {
      select.value = paramId;
      currentSubjectId = parseInt(paramId, 10);
    } else {
      currentSubjectId = subjects[0].id;
      select.value = currentSubjectId;
    }

    loadSubjectSyllabus(currentSubjectId);
  } catch (err) {
    console.error('Error loading subjects for syllabus:', err);
  }
}

async function loadSubjectSyllabus(subjectId) {
  const textInput = document.getElementById('syllabus-text-input');
  const charCount = document.getElementById('syllabus-char-count');
  const saveStatus = document.getElementById('syllabus-save-status');
  const topicsList = document.getElementById('simple-topics-list');
  const badgeEl = document.getElementById('topics-total-badge');

  if (topicsList) {
    topicsList.innerHTML = `
      <div class="p-6 text-center text-xs text-[#A5B4FC]/70">
        <div class="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading syllabus...
      </div>
    `;
  }

  try {
    const res = await fetch(`/api/subjects/${subjectId}/syllabus-content`);
    if (!res.ok) throw new Error('Failed to load syllabus');
    const data = await res.json();

    currentSubjectTopics = data.topics || [];

    if (textInput) {
      textInput.value = data.syllabus_text || '';
      if (charCount) charCount.textContent = `${textInput.value.length} characters`;
      if (saveStatus) {
        saveStatus.textContent = 'All changes saved';
        saveStatus.className = 'text-emerald-400 font-medium';
      }
    }

    renderSimpleTopics(currentSubjectTopics);
  } catch (err) {
    console.error('Error loading syllabus:', err);
    if (topicsList) {
      topicsList.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs text-center">
          Could not load syllabus outline.
        </div>
      `;
    }
  }
}

function renderSimpleTopics(topics) {
  const list = document.getElementById('simple-topics-list');
  const badge = document.getElementById('topics-total-badge');
  if (badge) badge.textContent = `${topics.length} Topics`;
  if (!list) return;

  if (!topics || topics.length === 0) {
    list.innerHTML = `
      <div class="text-center py-6 text-xs text-[#818CF8] italic">
        No lecture topics extracted for this subject yet. Upload materials on the Dashboard.
      </div>
    `;
    return;
  }

  list.innerHTML = topics.map((t, idx) => `
    <div class="p-3.5 rounded-xl bg-[#080B2F]/80 border border-purple-500/20 flex items-start space-x-3 hover:border-purple-500/40 transition">
      <span class="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">
        ${idx + 1}
      </span>
      <div class="space-y-1 flex-1 min-w-0">
        <h4 class="text-xs font-bold text-white">${escapeHtml(t.title || t.topic_name)}</h4>
        ${t.summary ? `<p class="text-3xs text-[#C4B5FD] leading-relaxed line-clamp-2">${escapeHtml(t.summary)}</p>` : ''}
      </div>
    </div>
  `).join('');
}

async function saveSyllabus() {
  if (!currentSubjectId) {
    showToast('Please select a subject first.', 'error');
    return;
  }

  const textInput = document.getElementById('syllabus-text-input');
  const syllabusText = textInput ? textInput.value : '';
  const saveBtn = document.getElementById('save-syllabus-btn');
  const saveStatus = document.getElementById('syllabus-save-status');

  if (saveBtn) saveBtn.disabled = true;

  try {
    const res = await fetch(`/api/subjects/${currentSubjectId}/syllabus-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syllabus_text: syllabusText })
    });

    if (!res.ok) throw new Error('Failed to save syllabus');

    showToast('Syllabus saved successfully!', 'success');
    if (saveStatus) {
      saveStatus.textContent = 'All changes saved';
      saveStatus.className = 'text-emerald-400 font-medium';
    }
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Failed to save syllabus.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function autoFillSyllabus() {
  const textInput = document.getElementById('syllabus-text-input');
  const charCount = document.getElementById('syllabus-char-count');
  const saveStatus = document.getElementById('syllabus-save-status');

  if (!currentSubjectTopics || currentSubjectTopics.length === 0) {
    showToast('No course topics available to auto-fill.', 'info');
    return;
  }

  const outline = currentSubjectTopics.map((t, idx) => {
    return `Unit ${idx + 1}: ${t.title || t.topic_name}\n${t.summary || ''}`.trim();
  }).join('\n\n');

  if (textInput) {
    textInput.value = outline;
    if (charCount) charCount.textContent = `${textInput.value.length} characters`;
    if (saveStatus) {
      saveStatus.textContent = 'Unsaved changes';
      saveStatus.className = 'text-amber-400 font-medium';
    }
    showToast('Syllabus outline filled from course materials.', 'success');
  }
}

// ==========================================
// AI Assistant (Voice Input -> Written Text ONLY)
// ==========================================
function initAIAssistant() {
  const modal = document.getElementById('ai-assistant-modal');
  const openNavBtn = document.getElementById('open-assistant-nav-btn');
  const closeBtn = document.getElementById('close-assistant-btn');
  const textInput = document.getElementById('assistant-text-input');
  const sendBtn = document.getElementById('assistant-send-btn');
  const micBtn = document.getElementById('assistant-mic-btn');

  openNavBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  sendBtn?.addEventListener('click', () => {
    const val = textInput?.value.trim();
    if (val) submitQuestion(val);
  });

  textInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = textInput.value.trim();
      if (val) submitQuestion(val);
    }
  });

  // Speech Recognition (Speech-to-Text Input Only - NO TTS)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && micBtn) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;

    micBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
        isListening = true;
        micBtn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
        showToast('Listening... Speak your syllabus question in English or Hinglish', 'info');
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && textInput) {
        textInput.value = transcript;
        submitQuestion(transcript);
      }
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    };

    recognition.onerror = () => {
      isListening = false;
      micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    };
  }
}

async function submitQuestion(question) {
  const input = document.getElementById('assistant-text-input');
  const container = document.getElementById('assistant-chat-messages');
  if (input) input.value = '';

  const userDiv = document.createElement('div');
  userDiv.className = 'flex items-start justify-end space-x-2.5';
  userDiv.innerHTML = `
    <div class="p-3 rounded-2xl rounded-tr-none bg-purple-600 text-white max-w-[85%]">
      ${escapeHtml(question)}
    </div>
  `;
  container?.appendChild(userDiv);
  container?.scrollTo(0, container.scrollHeight);

  const loadDiv = document.createElement('div');
  loadDiv.className = 'flex items-start space-x-2.5';
  loadDiv.id = 'ai-loading-bubble';
  loadDiv.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xs shrink-0 mt-0.5">AI</div>
    <div class="p-3 rounded-2xl rounded-tl-none bg-[#27205F]/80 border border-purple-500/20 text-[#C4B5FD] max-w-[85%] flex items-center space-x-2">
      <div class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></div>
      <span>Formulating written explanation...</span>
    </div>
  `;
  container?.appendChild(loadDiv);
  container?.scrollTo(0, container.scrollHeight);

  try {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question, mode: 'written' })
    });
    const data = await res.json();
    document.getElementById('ai-loading-bubble')?.remove();

    const aiDiv = document.createElement('div');
    aiDiv.className = 'flex items-start space-x-2.5';
    aiDiv.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xs shrink-0 mt-0.5">AI</div>
      <div class="p-3 rounded-2xl rounded-tl-none bg-[#27205F]/80 border border-purple-500/20 text-[#F5F3FF] max-w-[85%] whitespace-pre-line">
        ${escapeHtml(data.response || data.text || 'Explanation generated.')}
      </div>
    `;
    container?.appendChild(aiDiv);
    container?.scrollTo(0, container.scrollHeight);
  } catch (err) {
    document.getElementById('ai-loading-bubble')?.remove();
    showToast('Failed to connect to AI study companion.', 'error');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `p-3.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center space-x-2 border animate-fade-in ${
    type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-500/40' :
    type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40' :
    'bg-[#1C1F5C] text-[#F5F3FF] border-purple-500/40'
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
