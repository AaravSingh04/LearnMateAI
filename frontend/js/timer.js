/**
 * StudyAI LMS - Pomodoro & Focus Timer
 * Dedicated Timer Controller & Productivity Tracker
 */

let timerInterval = null;
let totalDurationSeconds = 25 * 60;
let remainingSeconds = 25 * 60;
let isRunning = false;
let currentMode = 'pomodoro'; // 'pomodoro' | 'short-break' | 'long-break'
let selectedSubjectId = null;

const CIRCLE_CIRCUMFERENCE = 534; // 2 * pi * 85 ~= 534.07

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  loadSubjects();
  loadTimerStats();
  loadRecentSessions();
  initAIAssistant();
});

function initElements() {
  // Mode switcher buttons
  const btnPomodoro = document.getElementById('mode-pomodoro');
  const btnShort = document.getElementById('mode-short-break');
  const btnLong = document.getElementById('mode-long-break');

  btnPomodoro?.addEventListener('click', () => setMode('pomodoro', 25));
  btnShort?.addEventListener('click', () => setMode('short-break', 5));
  btnLong?.addEventListener('click', () => setMode('long-break', 15));

  // Toggle button (Start / Pause)
  const toggleBtn = document.getElementById('timer-toggle-btn');
  toggleBtn?.addEventListener('click', toggleTimer);

  // Reset button
  const resetBtn = document.getElementById('timer-reset-btn');
  resetBtn?.addEventListener('click', resetTimer);

  // Subject selector
  const subjectSelect = document.getElementById('timer-subject-select');
  subjectSelect?.addEventListener('change', (e) => {
    selectedSubjectId = e.target.value ? parseInt(e.target.value, 10) : null;
  });

  // Custom interval pills
  document.querySelectorAll('.custom-min-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.minutes || '25', 10);
      const customInput = document.getElementById('custom-minutes-input');
      if (customInput) customInput.value = mins;
      setCustomDuration(mins);
    });
  });

  // Numeric Custom Minutes Input & Action
  const customInput = document.getElementById('custom-minutes-input');
  const applyCustomBtn = document.getElementById('apply-custom-time-btn');
  const randomTimeBtn = document.getElementById('random-time-btn');
  const minus5Btn = document.getElementById('adjust-minus-5');
  const plus5Btn = document.getElementById('adjust-plus-5');

  function handleApplyCustom() {
    if (!customInput) return;
    const val = parseInt(customInput.value, 10);
    if (isNaN(val) || val < 1 || val > 300) {
      showToast('Please enter a duration between 1 and 300 minutes.', 'error');
      return;
    }
    setCustomDuration(val);
  }

  if (applyCustomBtn) applyCustomBtn.addEventListener('click', handleApplyCustom);
  if (customInput) {
    customInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleApplyCustom();
    });
  }

  // Random Focus Time Picker (picks any random interval between 15 and 60 minutes)
  if (randomTimeBtn) {
    randomTimeBtn.addEventListener('click', () => {
      const randomMinutes = Math.floor(Math.random() * (60 - 15 + 1)) + 15;
      if (customInput) customInput.value = randomMinutes;
      setCustomDuration(randomMinutes);
      showToast(`🎲 Random focus interval set: ${randomMinutes} minutes!`, 'success');
    });
  }

  // Steppers (-5m / +5m)
  if (minus5Btn) {
    minus5Btn.addEventListener('click', () => {
      const currentMins = Math.max(1, Math.round(remainingSeconds / 60) - 5);
      if (customInput) customInput.value = currentMins;
      setCustomDuration(currentMins);
    });
  }
  if (plus5Btn) {
    plus5Btn.addEventListener('click', () => {
      const currentMins = Math.min(300, Math.round(remainingSeconds / 60) + 5);
      if (customInput) customInput.value = currentMins;
      setCustomDuration(currentMins);
    });
  }

  updateDisplay();
}

function setMode(mode, minutes) {
  if (isRunning) pauseTimer();
  currentMode = mode;
  totalDurationSeconds = minutes * 60;
  remainingSeconds = totalDurationSeconds;

  const btnPomo = document.getElementById('mode-pomodoro');
  const btnShort = document.getElementById('mode-short-break');
  const btnLong = document.getElementById('mode-long-break');
  const label = document.getElementById('timer-label');

  [btnPomo, btnShort, btnLong].forEach(b => {
    if (b) {
      b.classList.remove('bg-purple-600', 'text-white');
      b.classList.add('text-[#A5B4FC]');
    }
  });

  if (mode === 'pomodoro') {
    btnPomo?.classList.add('bg-purple-600', 'text-white');
    btnPomo?.classList.remove('text-[#A5B4FC]');
    if (label) label.textContent = 'Focus Time';
  } else if (mode === 'short-break') {
    btnShort?.classList.add('bg-purple-600', 'text-white');
    btnShort?.classList.remove('text-[#A5B4FC]');
    if (label) label.textContent = 'Short Break';
  } else if (mode === 'long-break') {
    btnLong?.classList.add('bg-purple-600', 'text-white');
    btnLong?.classList.remove('text-[#A5B4FC]');
    if (label) label.textContent = 'Long Break';
  }

  updateDisplay();
}

function setCustomDuration(minutes) {
  if (isRunning) pauseTimer();
  currentMode = 'custom';
  totalDurationSeconds = minutes * 60;
  remainingSeconds = totalDurationSeconds;

  const label = document.getElementById('timer-label');
  if (label) label.textContent = `${minutes}m Custom Focus`;

  updateDisplay();
  showToast(`Timer set to ${minutes} minutes.`, 'info');
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (remainingSeconds <= 0) {
    remainingSeconds = totalDurationSeconds;
  }
  isRunning = true;
  updateControlsUI();

  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateDisplay();
    } else {
      completeTimer();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateControlsUI();
}

function resetTimer() {
  pauseTimer();
  remainingSeconds = totalDurationSeconds;
  updateDisplay();
}

function updateControlsUI() {
  const toggleBtn = document.getElementById('timer-toggle-btn');
  const toggleText = document.getElementById('timer-toggle-text');
  const playIcon = document.getElementById('timer-play-icon');
  const pauseIcon = document.getElementById('timer-pause-icon');

  if (isRunning) {
    if (toggleText) toggleText.textContent = 'Pause';
    playIcon?.classList.add('hidden');
    pauseIcon?.classList.remove('hidden');
    toggleBtn?.classList.remove('shadow-purple-600/40');
    toggleBtn?.classList.add('shadow-amber-500/40', 'bg-amber-600');
  } else {
    if (toggleText) toggleText.textContent = remainingSeconds < totalDurationSeconds ? 'Resume' : 'Start Focus';
    playIcon?.classList.remove('hidden');
    pauseIcon?.classList.add('hidden');
    toggleBtn?.classList.add('shadow-purple-600/40');
    toggleBtn?.classList.remove('shadow-amber-500/40', 'bg-amber-600');
  }
}

function updateDisplay() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const displayEl = document.getElementById('timer-display');
  if (displayEl) displayEl.textContent = timeStr;

  // Ring offset calculation
  const ring = document.getElementById('timer-progress-ring');
  if (ring && totalDurationSeconds > 0) {
    const fraction = remainingSeconds / totalDurationSeconds;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - fraction);
    ring.style.strokeDashoffset = offset;
  }

  // Update browser document title
  document.title = `${timeStr} - StudyAI Focus`;
}

async function completeTimer() {
  pauseTimer();
  remainingSeconds = 0;
  updateDisplay();

  // Play a soft notification tone via Web Audio API if supported
  playBeep();

  showToast('Great job! Focus session completed! 🎉', 'success');

  // Log session to backend
  const durationCompleted = totalDurationSeconds;
  await logSession(durationCompleted, currentMode);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (err) {
    // Audio context not available or user interaction required
  }
}

async function logSession(seconds, sessionType) {
  try {
    const payload = {
      subject_id: selectedSubjectId,
      duration_seconds: seconds,
      session_type: sessionType || 'pomodoro',
      notes: selectedSubjectId ? `Subject Focus Session` : 'General Focus Session'
    };

    const res = await fetch('/api/study-timer/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      loadTimerStats();
      loadRecentSessions();
    }
  } catch (err) {
    console.error('Failed to log study session:', err);
  }
}

async function loadSubjects() {
  try {
    const res = await fetch('/api/subjects');
    if (!res.ok) return;
    const subjects = await res.json();
    const select = document.getElementById('timer-subject-select');
    if (!select) return;

    select.innerHTML = '<option value="">General Study Session</option>';
    subjects.forEach((subj) => {
      const opt = document.createElement('option');
      opt.value = subj.id;
      opt.textContent = subj.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading subjects for timer:', err);
  }
}

async function loadTimerStats() {
  try {
    const res = await fetch('/api/study-timer/stats');
    if (!res.ok) return;
    const stats = await res.json();

    const todayHours = (stats.today_seconds / 3600).toFixed(1);
    const weekHours = (stats.week_seconds / 3600).toFixed(1);

    const todayEl = document.getElementById('stats-today-hours');
    const weekEl = document.getElementById('stats-week-hours');
    const totalEl = document.getElementById('stats-total-sessions');

    if (todayEl) todayEl.textContent = `${todayHours}h`;
    if (weekEl) weekEl.textContent = `${weekHours}h`;
    if (totalEl) totalEl.textContent = stats.total_sessions || '0';
  } catch (err) {
    console.error('Error fetching timer stats:', err);
  }
}

async function loadRecentSessions() {
  const container = document.getElementById('sessions-history-list');
  if (!container) return;

  try {
    const res = await fetch('/api/study-timer/sessions?limit=8');
    if (!res.ok) return;
    const sessions = await res.json();

    if (!sessions || sessions.length === 0) {
      container.innerHTML = `
        <div class="p-4 rounded-xl bg-[#080B2F]/60 text-center text-xs text-[#A5B4FC]/70 border border-purple-500/10">
          No focus sessions logged yet. Complete a 25-minute Pomodoro session to see your progress here!
        </div>
      `;
      return;
    }

    container.innerHTML = sessions.map((sess) => {
      const mins = Math.round(sess.duration_seconds / 60);
      const dateFormatted = sess.completed_at ? sess.completed_at.replace('T', ' ').slice(0, 16) : 'Just now';
      const label = sess.notes || (sess.subject_id ? `Subject #${sess.subject_id}` : 'General Study');
      const badgeColor = sess.session_type === 'pomodoro' ? 'bg-purple-600/30 text-purple-300 border-purple-500/30' : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/30';

      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-[#080B2F]/60 border border-purple-500/15">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-lg bg-[#27205F] flex items-center justify-center text-purple-300 font-bold text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-white">${escapeHtml(label)}</div>
              <div class="text-3xs text-[#A5B4FC]/70">${dateFormatted}</div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-0.5 rounded text-3xs font-semibold border ${badgeColor}">${sess.session_type}</span>
            <span class="text-xs font-black text-purple-300">${mins}m</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching recent sessions:', err);
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
        showToast('Listening... Speak your study question in English or Hinglish', 'info');
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

  // Append user message
  const userDiv = document.createElement('div');
  userDiv.className = 'flex items-start justify-end space-x-2.5';
  userDiv.innerHTML = `
    <div class="p-3 rounded-2xl rounded-tr-none bg-purple-600 text-white max-w-[85%]">
      ${escapeHtml(question)}
    </div>
  `;
  container?.appendChild(userDiv);
  container?.scrollTo(0, container.scrollHeight);

  // Loading indicator
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
