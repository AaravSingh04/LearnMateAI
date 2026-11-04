/**
 * StudyAI LMS — Main Dashboard JavaScript
 * Supports AI Premium Dark Theme, Voice & Chat Assistant (Hindi + English + Hinglish),
 * Interactive Study Calendar, Sticky Notes, and Pomodoro Study Timer.
 */

const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:8005' : '';

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-[#151748] border-emerald-500/50 text-emerald-200',
    error: 'bg-[#151748] border-rose-500/50 text-rose-200',
    info: 'bg-[#151748] border-purple-500/50 text-purple-200',
  };

  toast.className = `toast border ${bgColors[type] || bgColors.info} backdrop-blur-md`;
  toast.innerHTML = `
    <div class="flex-grow font-medium">${escapeHtml(message)}</div>
    <button class="text-gray-400 hover:text-white font-bold text-base leading-none ml-2" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.5rem)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global App State
let subjectsList = [];
let stickyNotesList = [];
let calendarEventsList = [];
let currentCalDate = new Date();

// =============================================================================
// 1. Fetch & Render Subjects (Matching Reference Cards)
// =============================================================================


// =============================================================================
// Active PPT Revision Notes Card (Instant Zero-Latency Prehydration)
// =============================================================================
function renderActiveNotesPreview(notesMd) {
  const previewEl = document.getElementById('active-notes-preview-content');
  if (!previewEl || !notesMd) return;

  if (typeof marked !== 'undefined' && marked.parse) {
    try {
      previewEl.innerHTML = marked.parse(notesMd.slice(0, 800) + '...') + '<div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#151748] to-transparent pointer-events-none"></div>';
      return;
    } catch (e) {}
  }
  previewEl.innerHTML = `<p class="whitespace-pre-line">${escapeHtml(notesMd.slice(0, 500))}...</p><div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#151748] to-transparent pointer-events-none"></div>`;
}

async function loadActiveStudyNotesCard() {
  const section = document.getElementById('active-study-notes-section');
  const deckTitleEl = document.getElementById('active-notes-deck-title');
  const subjectSubtitleEl = document.getElementById('active-notes-subject-subtitle');
  const readBtn = document.getElementById('active-notes-read-btn');
  const quizBtn = document.getElementById('active-notes-quiz-btn');
  const viewAllLink = document.getElementById('dashboard-view-all-notes-link');
  if (!section) return;

  // 1. Instant local storage prehydration
  try {
    const rawLatest = localStorage.getItem('latest_study_pack');
    if (rawLatest) {
      const parsed = JSON.parse(rawLatest);
      const subId = parsed.subject_id || 3;
      const subName = parsed.subject_name || 'Economics';
      const mat = parsed.material || { original_filename: 'session 1- Introduction.pptx' };
      const pack = parsed.pack || {};

      if (deckTitleEl) deckTitleEl.textContent = mat.original_filename || 'Lecture Material';
      if (subjectSubtitleEl) subjectSubtitleEl.textContent = `${subName} • Ready Revision Notes`;
      if (readBtn) readBtn.href = `subject.html?subject_id=${subId}#notes`;
      if (quizBtn) quizBtn.href = `subject.html?subject_id=${subId}#quiz`;
      if (viewAllLink) viewAllLink.href = `subject.html?subject_id=${subId}#notes`;

      if (pack.revision_notes) {
        renderActiveNotesPreview(pack.revision_notes);
      }
    }
  } catch (e) {}

  // 2. Fetch live data for the active subject and its compiled material
  try {
    const activeSubId = localStorage.getItem('last_active_subject') || (subjectsList.length > 0 ? subjectsList[0].id : 3);
    const matsRes = await fetch(`${API_BASE}/api/subjects/${activeSubId}/materials`);
    if (!matsRes.ok) return;

    const mats = await matsRes.json();
    const readyMat = mats.find(m => m.has_study_pack) || mats[0];
    if (!readyMat) return;

    const subMatch = subjectsList.find(s => s.id === parseInt(activeSubId, 10)) || { name: 'Economics', id: activeSubId };

    if (deckTitleEl) deckTitleEl.textContent = readyMat.original_filename;
    if (subjectSubtitleEl) subjectSubtitleEl.textContent = `${subMatch.name} • ${readyMat.has_study_pack ? 'Generated Masterclass Revision Notes' : 'Uploaded Slide Deck'}`;
    if (readBtn) readBtn.href = `subject.html?subject_id=${subMatch.id}#notes`;
    if (quizBtn) quizBtn.href = `subject.html?subject_id=${subMatch.id}#quiz`;
    if (viewAllLink) viewAllLink.href = `subject.html?subject_id=${subMatch.id}#notes`;

    if (readyMat.has_study_pack) {
      const spRes = await fetch(`${API_BASE}/api/materials/${readyMat.id}/study-pack`);
      if (spRes.ok) {
        const packData = await spRes.json();
        localStorage.setItem(`study_pack_${readyMat.id}`, JSON.stringify(packData));
        localStorage.setItem('latest_study_pack', JSON.stringify({
          subject_id: subMatch.id,
          subject_name: subMatch.name,
          material: readyMat,
          pack: packData
        }));
        if (packData.revision_notes) {
          renderActiveNotesPreview(packData.revision_notes);
        }
      }
    }
  } catch (err) {
    console.warn('Error syncing active notes card:', err);
  }
}

async function fetchSubjects() {
  const grid = document.getElementById('subjects-grid');
  const emptyState = document.getElementById('subjects-empty-state');

  try {
    const res = await fetch(`${API_BASE}/api/subjects`);
    if (!res.ok) throw new Error('Could not load subjects.');
    subjectsList = await res.json();

    if (!subjectsList || subjectsList.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = '';

    const colors = [
      { border: 'border-purple-500/30', bgBar: 'from-purple-500 to-indigo-500', iconBg: 'bg-purple-600/20 text-purple-400' },
      { border: 'border-cyan-500/30', bgBar: 'from-cyan-500 to-blue-500', iconBg: 'bg-cyan-600/20 text-cyan-400' },
      { border: 'border-emerald-500/30', bgBar: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-600/20 text-emerald-400' },
      { border: 'border-amber-500/30', bgBar: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-600/20 text-amber-400' },
    ];

    subjectsList.forEach((sub, index) => {
      const colorScheme = colors[index % colors.length];
      const card = document.createElement('div');
      card.className = `dark-card p-4 sm:p-5 flex flex-col justify-between cursor-pointer border ${colorScheme.border} hover:scale-[1.02] transition`;
      
      const topicsCount = sub.topics_count || (sub.materials_count > 0 ? sub.materials_count * 3 : 1);
      const notesCount = sub.materials_count || 1;
      const progress = sub.progress_percent || (sub.materials_count > 0 ? 75 : 0);

      card.innerHTML = `
        <div>
          <div class="w-9 h-9 rounded-xl ${colorScheme.iconBg} flex items-center justify-center mb-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <h4 class="text-sm font-bold text-white tracking-tight leading-snug">${escapeHtml(sub.name)}</h4>
          <p class="text-3xs text-[#A5B4FC] mt-0.5">${topicsCount} Topics • ${notesCount} Notes</p>
        </div>

        <div class="mt-4 pt-2">
          <div class="flex items-center justify-between text-3xs font-semibold mb-1">
            <span class="text-[#818CF8]">Progress</span>
            <span class="text-white">${progress}%</span>
          </div>
          <div class="w-full h-1.5 rounded-full bg-[#27205F] overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r ${colorScheme.bgBar}" style="width: ${progress}%"></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `subject.html?subject_id=${sub.id}`;
      });

      grid.appendChild(card);
    });

    // Dynamically update Continue Learning card with student's actual topic
    updateContinueLearningCard(subjectsList[0]);

  } catch (err) {
    console.error('Error loading subjects:', err);
  }
}

async function updateContinueLearningCard(firstSubject) {
  const topicTitleEl = document.getElementById('continue-topic-title');
  const subjectSubtitleEl = document.getElementById('continue-subject-subtitle');
  if (!topicTitleEl || !firstSubject) return;

  const targetSubId = localStorage.getItem('last_active_subject') || firstSubject.id;
  const activeSub = subjectsList.find(s => s.id === parseInt(targetSubId, 10)) || firstSubject;

  try {
    const matsRes = await fetch(`${API_BASE}/api/subjects/${activeSub.id}/materials`);
    if (matsRes.ok) {
      const mats = await matsRes.json();
      const readyMat = mats.find(m => m.has_study_pack);
      if (readyMat) {
        topicTitleEl.textContent = `Continue ${readyMat.original_filename}`;
        if (subjectSubtitleEl) subjectSubtitleEl.textContent = `${activeSub.name} • Revision Notes & Practice Ready`;
        return;
      }
    }

    const res = await fetch(`${API_BASE}/api/subjects/${activeSub.id}/topics`);
    if (res.ok) {
      const topics = await res.json();
      if (topics && topics.length > 0) {
        topicTitleEl.textContent = topics[0].title;
        if (subjectSubtitleEl) subjectSubtitleEl.textContent = `${activeSub.name} • Last studied: Today`;
        return;
      }
    }
  } catch (err) {
    console.error('Error updating continue learning topic:', err);
  }

  topicTitleEl.textContent = `Explore ${activeSub.name}`;
  if (subjectSubtitleEl) subjectSubtitleEl.textContent = `${activeSub.name} • In progress`;
}

// =============================================================================
// 2. Sticky Notes Feature (Matching Reference Cards)
// =============================================================================

async function fetchStickyNotes() {
  const container = document.getElementById('sticky-notes-container');
  try {
    const res = await fetch(`${API_BASE}/api/sticky-notes`);
    if (!res.ok) return;
    stickyNotesList = await res.json();

    container.innerHTML = '';
    if (stickyNotesList.length === 0) {
      container.innerHTML = '<p class="text-3xs text-[#818CF8] italic py-2">No active sticky notes.</p>';
      return;
    }

    stickyNotesList.forEach((note) => {
      const card = document.createElement('div');
      const colorClass = `sticky-${note.color || 'purple'}`;
      card.className = `sticky-card ${colorClass} ${note.is_completed ? 'completed' : ''}`;

      card.innerHTML = `
        <div class="flex items-center space-x-2.5 flex-1 min-w-0">
          <span class="custom-chk ${note.is_completed ? 'checked' : ''} shrink-0">
            ${note.is_completed ? '✓' : ''}
          </span>
          <span class="sticky-text truncate">${escapeHtml(note.content)}</span>
        </div>
        <button class="delete-note-btn text-xs opacity-60 hover:opacity-100 hover:text-red-700 px-1 shrink-0" title="Delete Note">&times;</button>
      `;

      // Toggle Completion
      const chk = card.querySelector('.custom-chk');
      chk.addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleStickyNote(note.id, !note.is_completed);
      });

      // Delete Note
      const delBtn = card.querySelector('.delete-note-btn');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteStickyNote(note.id);
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading sticky notes:', err);
  }
}

async function toggleStickyNote(id, isCompleted) {
  try {
    const res = await fetch(`${API_BASE}/api/sticky-notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: isCompleted }),
    });
    if (res.ok) await fetchStickyNotes();
  } catch (err) {
    console.error(err);
  }
}

async function deleteStickyNote(id) {
  try {
    const res = await fetch(`${API_BASE}/api/sticky-notes/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchStickyNotes();
  } catch (err) {
    console.error(err);
  }
}

// Add Sticky Note Modal
let selectedStickyColor = 'purple';
const addStickyBtn = document.getElementById('add-sticky-note-btn');
const stickyModal = document.getElementById('add-sticky-modal');
const stickyInput = document.getElementById('sticky-note-text');
const cancelStickyBtn = document.getElementById('cancel-sticky-btn');
const saveStickyBtn = document.getElementById('save-sticky-btn');

if (addStickyBtn) {
  addStickyBtn.addEventListener('click', () => {
    stickyInput.value = '';
    stickyModal.classList.remove('hidden');
    stickyInput.focus();
  });
}

if (cancelStickyBtn) cancelStickyBtn.addEventListener('click', () => stickyModal.classList.add('hidden'));

document.querySelectorAll('.sticky-color-pick').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sticky-color-pick').forEach((b) => b.classList.remove('ring-white'));
    btn.classList.add('ring-white');
    selectedStickyColor = btn.dataset.color;
  });
});

if (saveStickyBtn) {
  saveStickyBtn.addEventListener('click', async () => {
    const content = stickyInput.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`${API_BASE}/api/sticky-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, color: selectedStickyColor }),
      });
      if (res.ok) {
        stickyModal.classList.add('hidden');
        await fetchStickyNotes();
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// =============================================================================
// 3. Interactive Study Calendar Widget (Matching Reference Image)
// =============================================================================

async function fetchCalendarEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/events`);
    if (!res.ok) return;
    calendarEventsList = await res.json();
    renderCalendar();
  } catch (err) {
    console.error('Error fetching calendar events:', err);
  }
}

function renderCalendar() {
  const monthTitle = document.getElementById('cal-month-title');
  const daysGrid = document.getElementById('cal-days-grid');
  const nextAlert = document.getElementById('cal-next-event-text');

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthTitle.textContent = `${monthNames[month]} ${year}`;

  daysGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Blank padding cells
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-cell empty opacity-0';
    daysGrid.appendChild(emptyCell);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.textContent = d;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const matchingEvent = calendarEventsList.find((e) => e.event_date === dateStr);

    if (matchingEvent) {
      if (matchingEvent.event_type === 'exam') {
        cell.classList.add('has-exam');
      } else {
        cell.classList.add('has-assignment');
      }
      cell.title = `${matchingEvent.title} (${matchingEvent.event_type.toUpperCase()})`;
    } else if (isCurrentMonth && today.getDate() === d) {
      cell.classList.add('today');
      cell.title = 'Today';
    }

    cell.addEventListener('click', () => {
      if (matchingEvent) {
        showToast(`${matchingEvent.title} (${matchingEvent.event_date}) - ${matchingEvent.notes || 'Prepare'}`);
      } else {
        openAddEventModal(dateStr);
      }
    });

    daysGrid.appendChild(cell);
  }

  // Update alert banner below calendar
  const upcoming = calendarEventsList.find((e) => !e.is_completed);
  if (upcoming) {
    nextAlert.textContent = `Upcoming: ${upcoming.title} (${upcoming.event_date})`;
  } else {
    nextAlert.textContent = 'No upcoming deadlines.';
  }
}

document.getElementById('cal-prev-btn').addEventListener('click', () => {
  currentCalDate.setMonth(currentCalDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('cal-next-btn').addEventListener('click', () => {
  currentCalDate.setMonth(currentCalDate.getMonth() + 1);
  renderCalendar();
});

// Add Event Modal
const addEventModal = document.getElementById('add-event-modal');
const addEventForm = document.getElementById('add-event-form');
const eventTitleInput = document.getElementById('event-title');
const eventTypeInput = document.getElementById('event-type');
const eventDateInput = document.getElementById('event-date');
const eventNotesInput = document.getElementById('event-notes');
const closeAddEventBtn = document.getElementById('close-add-event-btn');
const cancelAddEventBtn = document.getElementById('cancel-add-event-btn');

function openAddEventModal(presetDate = '') {
  addEventModal.classList.remove('hidden');
  if (presetDate) eventDateInput.value = presetDate;
  eventTitleInput.focus();
}

document.getElementById('cal-add-event-btn').addEventListener('click', () => openAddEventModal());
if (closeAddEventBtn) closeAddEventBtn.addEventListener('click', () => addEventModal.classList.add('hidden'));
if (cancelAddEventBtn) cancelAddEventBtn.addEventListener('click', () => addEventModal.classList.add('hidden'));

addEventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = eventTitleInput.value.trim();
  const event_type = eventTypeInput.value;
  const event_date = eventDateInput.value;
  const notes = eventNotesInput.value.trim();

  if (!title || !event_date) return;

  try {
    const res = await fetch(`${API_BASE}/api/calendar/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, event_type, event_date, notes }),
    });

    if (res.ok) {
      addEventModal.classList.add('hidden');
      addEventForm.reset();
      showToast('Event saved to calendar!', 'success');
      await fetchCalendarEvents();
    }
  } catch (err) {
    console.error(err);
  }
});

// =============================================================================
// 4. Pomodoro Study Timer Widget (Matching Reference Circular Ring)
// =============================================================================

let timerDuration = 25 * 60; // 25 minutes default
let timerRemaining = timerDuration;
let timerInterval = null;
let isTimerRunning = false;

const timerDisplay = document.getElementById('timer-display');
const timerProgressRing = document.getElementById('timer-progress-ring');
const timerToggleBtn = document.getElementById('timer-toggle-btn');
const timerPlayIcon = document.getElementById('timer-play-icon');
const timerPauseIcon = document.getElementById('timer-pause-icon');
const timerResetBtn = document.getElementById('timer-reset-btn');
const circumference = 2 * Math.PI * 42; // r=42 -> 263.89

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;
  timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const offset = circumference - (timerRemaining / timerDuration) * circumference;
  timerProgressRing.style.strokeDashoffset = offset;
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  timerPlayIcon.classList.add('hidden');
  timerPauseIcon.classList.remove('hidden');

  timerInterval = setInterval(() => {
    if (timerRemaining > 0) {
      timerRemaining--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      isTimerRunning = false;
      timerPlayIcon.classList.remove('hidden');
      timerPauseIcon.classList.add('hidden');
      showToast('🎉 Focus session completed! Great job.', 'success');
      logCompletedSession();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isTimerRunning) return;
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerPlayIcon.classList.remove('hidden');
  timerPauseIcon.classList.add('hidden');
}

function resetTimer() {
  pauseTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();
}

timerToggleBtn.addEventListener('click', () => {
  if (isTimerRunning) pauseTimer();
  else startTimer();
});

timerResetBtn.addEventListener('click', resetTimer);

async function logCompletedSession() {
  try {
    await fetch(`${API_BASE}/api/study-timer/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: subjectsList.length > 0 ? subjectsList[0].id : null,
        duration_seconds: timerDuration,
        session_type: 'pomodoro',
      }),
    });
  } catch (err) {
    console.error('Failed to log study session:', err);
  }
}

// =============================================================================
// 5. AI Voice & Chat Assistant (Hindi + English + Hinglish)
// =============================================================================

const aiModal = document.getElementById('ai-assistant-modal');
const closeAssistantBtn = document.getElementById('close-assistant-btn');
const assistantMessages = document.getElementById('assistant-chat-messages');
const assistantInput = document.getElementById('assistant-text-input');
const assistantSendBtn = document.getElementById('assistant-send-btn');
const assistantMicBtn = document.getElementById('assistant-mic-btn');

function openAssistant(prefillPrompt = '') {
  aiModal.classList.remove('hidden');
  if (prefillPrompt) {
    assistantInput.value = prefillPrompt;
    sendAssistantMessage();
  } else {
    assistantInput.focus();
  }
}

document.getElementById('banner-ask-ai-btn').addEventListener('click', () => openAssistant());
document.getElementById('quick-action-ask-ai').addEventListener('click', () => openAssistant());
document.getElementById('open-assistant-nav-btn').addEventListener('click', () => openAssistant());
if (closeAssistantBtn) closeAssistantBtn.addEventListener('click', () => aiModal.classList.add('hidden'));

document.querySelectorAll('.quick-prompt-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    assistantInput.value = btn.innerText.replace(/"/g, '');
    sendAssistantMessage();
  });
});

async function sendAssistantMessage() {
  const query = assistantInput.value.trim();
  if (!query) return;

  // Append user bubble
  appendChatBubble(query, 'user');
  assistantInput.value = '';

  // Append typing indicator
  const loadingId = 'loading-' + Date.now();
  appendChatBubble('Thinking...', 'ai', loadingId);

  try {
    const res = await fetch(`${API_BASE}/api/ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();

    if (!res.ok) throw new Error(data.detail || 'Assistant error');

    appendChatBubble(data.reply, 'ai', null);

  } catch (err) {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    appendChatBubble(`Error: ${err.message}`, 'ai');
  }
}

assistantSendBtn.addEventListener('click', sendAssistantMessage);
assistantInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendAssistantMessage();
});

function appendChatBubble(text, sender, id = null) {
  const bubble = document.createElement('div');
  if (id) bubble.id = id;

  if (sender === 'user') {
    bubble.className = 'flex items-start justify-end space-x-2';
    bubble.innerHTML = `
      <div class="p-3 rounded-2xl rounded-tr-none bg-purple-600 text-white max-w-[85%] font-medium">
        ${escapeHtml(text)}
      </div>
      <div class="w-6 h-6 rounded-full bg-purple-400 text-white text-3xs font-bold flex items-center justify-center shrink-0 mt-0.5">AS</div>
    `;
  } else {
    bubble.className = 'flex items-start space-x-2.5';
    bubble.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-3xs font-bold flex items-center justify-center shrink-0 mt-0.5">AI</div>
      <div class="p-3.5 rounded-2xl rounded-tl-none bg-[#27205F] border border-purple-500/20 text-[#F5F3FF] max-w-[85%] whitespace-pre-line leading-relaxed">
        ${escapeHtml(text)}
      </div>
    `;
  }

  assistantMessages.appendChild(bubble);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
}

// Speech-to-Text Microphone (Speech input ONLY -> Processed to Written Text Output)
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN'; // Indian English / Hindi / Hinglish

  recognition.onstart = () => {
    assistantMicBtn.classList.add('recording-pulse');
    showToast('Listening... Speak your question in English or Hinglish', 'info');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    assistantInput.value = transcript;
    sendAssistantMessage();
  };

  recognition.onerror = (e) => {
    console.warn('Speech Recognition error:', e);
    assistantMicBtn.classList.remove('recording-pulse');
  };

  recognition.onend = () => {
    assistantMicBtn.classList.remove('recording-pulse');
  };
}

assistantMicBtn.addEventListener('click', () => {
  if (!recognition) {
    showToast('Speech Recognition not supported in this browser.', 'error');
    return;
  }
  try {
    recognition.start();
  } catch (e) {
    recognition.stop();
  }
});

// =============================================================================
// 6. Universal Search Modal (Ctrl + K)
// =============================================================================

const searchModal = document.getElementById('search-modal');
const searchTriggerBtn = document.getElementById('search-trigger-btn');
const globalSearchInput = document.getElementById('global-search-input');
const closeSearchBtn = document.getElementById('close-search-btn');
const searchResultsList = document.getElementById('search-results-list');

function openSearch() {
  searchModal.classList.remove('hidden');
  globalSearchInput.value = '';
  globalSearchInput.focus();
  renderSearchResults('');
}

if (searchTriggerBtn) searchTriggerBtn.addEventListener('click', openSearch);
if (closeSearchBtn) closeSearchBtn.addEventListener('click', () => searchModal.classList.add('hidden'));

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    searchModal.classList.add('hidden');
    aiModal.classList.add('hidden');
  }
});

globalSearchInput.addEventListener('input', (e) => {
  renderSearchResults(e.target.value.trim().toLowerCase());
});

function renderSearchResults(query) {
  searchResultsList.innerHTML = '';
  if (!query) {
    searchResultsList.innerHTML = '<p class="text-center text-3xs text-[#818CF8] py-4">Type keywords to search across your subjects and notes.</p>';
    return;
  }

  const matches = subjectsList.filter((s) => s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query)));
  if (matches.length === 0) {
    searchResultsList.innerHTML = '<p class="text-center text-3xs text-[#818CF8] py-4">No matching subjects or notes found.</p>';
    return;
  }

  matches.forEach((sub) => {
    const item = document.createElement('div');
    item.className = 'p-2.5 rounded-lg bg-[#27205F]/60 hover:bg-purple-600/30 border border-purple-500/20 cursor-pointer flex items-center justify-between text-xs transition';
    item.innerHTML = `
      <span class="font-bold text-white">${escapeHtml(sub.name)}</span>
      <span class="text-3xs text-purple-300">Open Workspace →</span>
    `;
    item.addEventListener('click', () => {
      window.location.href = `subject.html?subject_id=${sub.id}`;
    });
    searchResultsList.appendChild(item);
  });
}

// Quick action button bindings
document.getElementById('quick-action-upload').addEventListener('click', () => {
  if (subjectsList.length > 0) {
    window.location.href = `subject.html?subject_id=${subjectsList[0].id}`;
  } else {
    document.getElementById('add-subject-modal').classList.remove('hidden');
  }
});

document.getElementById('quick-action-quiz').addEventListener('click', () => {
  window.location.href = 'quiz.html';
});

document.getElementById('quick-action-timer').addEventListener('click', () => {
  window.location.href = 'timer.html';
});

document.getElementById('quick-action-calendar').addEventListener('click', () => {
  window.location.href = 'calendar.html';
});
document.getElementById('continue-learning-card').addEventListener('click', () => {
  const targetSubId = localStorage.getItem('last_active_subject') || (subjectsList.length > 0 ? subjectsList[0].id : 3);
  window.location.href = `subject.html?subject_id=${targetSubId}#notes`;
});

// Add Subject Modal
const addSubModal = document.getElementById('add-subject-modal');
const openAddSubBtn = document.getElementById('open-add-subject-modal-btn');
const closeAddSubBtn = document.getElementById('close-add-subject-btn');
const cancelAddSubBtn = document.getElementById('cancel-add-subject-btn');
const addSubForm = document.getElementById('add-subject-form');
const newSubName = document.getElementById('new-subject-name');
const newSubDesc = document.getElementById('new-subject-desc');
const addSubErr = document.getElementById('add-subject-error');

if (openAddSubBtn) openAddSubBtn.addEventListener('click', () => {
  addSubErr.classList.add('hidden');
  addSubForm.reset();
  addSubModal.classList.remove('hidden');
  newSubName.focus();
});

if (closeAddSubBtn) closeAddSubBtn.addEventListener('click', () => addSubModal.classList.add('hidden'));
if (cancelAddSubBtn) cancelAddSubBtn.addEventListener('click', () => addSubModal.classList.add('hidden'));

addSubForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = newSubName.value.trim();
  const description = newSubDesc.value.trim();
  if (!name) return;

  try {
    const res = await fetch(`${API_BASE}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || null }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create subject.');

    addSubModal.classList.add('hidden');
    showToast(`Subject "${data.name}" created!`, 'success');
    await fetchSubjects();
  } catch (err) {
    addSubErr.textContent = err.message;
    addSubErr.classList.remove('hidden');
  }
});

// Notifications Bell Click
document.getElementById('notifications-btn').addEventListener('click', () => {
  const upcoming = calendarEventsList.filter((e) => !e.is_completed);
  if (upcoming.length > 0) {
    showToast(`🔔 Reminder: ${upcoming[0].title} is scheduled for ${upcoming[0].event_date}!`, 'info');
  } else {
    showToast('No pending notifications. You are all caught up!', 'info');
  }
});

// Initial Page Load
window.addEventListener('DOMContentLoaded', async () => {
  updateTimerDisplay();
  await Promise.all([
    fetchSubjects(),
    fetchStickyNotes(),
    fetchCalendarEvents(),
  ]);
});
