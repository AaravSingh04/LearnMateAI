/**
 * StudyAI LMS — Dedicated Academic Calendar JavaScript
 */

const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:8005' : '';

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgStyles = {
    success: 'bg-emerald-600 text-white border border-emerald-400',
    error: 'bg-rose-600 text-white border border-rose-400',
    info: 'bg-[#151748] text-white border border-purple-500',
  };

  toast.className = `toast ${bgStyles[type] || bgStyles.info}`;
  toast.innerHTML = `
    <div class="flex-grow font-medium text-xs">${escapeHtml(message)}</div>
    <button class="text-white/80 hover:text-white font-bold ml-2 leading-none text-base" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.5rem)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Calendar State
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let calendarEvents = [];
let activeView = 'month'; // 'month' or 'week'

// DOM Elements
const calendarHeaderTitle = document.getElementById('calendar-header-title');
const calendarDaysMatrix = document.getElementById('calendar-days-matrix');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const todayBtn = document.getElementById('today-btn');
const viewMonthBtn = document.getElementById('view-month-btn');
const viewWeekBtn = document.getElementById('view-week-btn');
const monthViewContainer = document.getElementById('month-view-container');
const weekViewContainer = document.getElementById('week-view-container');
const weekViewDays = document.getElementById('week-view-days');
const upcomingEventsList = document.getElementById('upcoming-events-list');
const eventsCountBadge = document.getElementById('events-count-badge');

// Modal Elements
const addEventModal = document.getElementById('add-event-modal');
const topAddEventBtn = document.getElementById('top-add-event-btn');
const addEventQuickBtn = document.getElementById('add-event-quick-btn');
const closeEventModalBtn = document.getElementById('close-event-modal-btn');
const cancelEventModalBtn = document.getElementById('cancel-event-modal-btn');
const addEventForm = document.getElementById('add-event-form');
const eventTitle = document.getElementById('event-title');
const eventType = document.getElementById('event-type');
const eventDate = document.getElementById('event-date');
const eventNotes = document.getElementById('event-notes');
const addEventError = document.getElementById('add-event-error');

// Edit Modal Elements
const editEventModal = document.getElementById('edit-event-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditModalBtn = document.getElementById('cancel-edit-modal-btn');
const editEventForm = document.getElementById('edit-event-form');
const editEventId = document.getElementById('edit-event-id');
const editEventTitle = document.getElementById('edit-event-title');
const editEventType = document.getElementById('edit-event-type');
const editEventDate = document.getElementById('edit-event-date');
const editEventNotes = document.getElementById('edit-event-notes');
const editEventError = document.getElementById('edit-event-error');
const deleteModalEventBtn = document.getElementById('delete-modal-event-btn');

// AI Assistant Elements
const aiModal = document.getElementById('ai-assistant-modal');
const openAssistantNavBtn = document.getElementById('open-assistant-nav-btn');
const closeAssistantBtn = document.getElementById('close-assistant-btn');
const assistantMessages = document.getElementById('assistant-chat-messages');
const assistantInput = document.getElementById('assistant-text-input');
const assistantSendBtn = document.getElementById('assistant-send-btn');
const assistantMicBtn = document.getElementById('assistant-mic-btn');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Initialize
async function initCalendar() {
  await fetchCalendarEvents();
  renderCalendar();

  // URL date deep-link
  const urlParams = new URLSearchParams(window.location.search);
  const targetDate = urlParams.get('date');
  if (targetDate) {
    const parts = targetDate.split('-');
    if (parts.length === 3) {
      currentYear = parseInt(parts[0], 10);
      currentMonth = parseInt(parts[1], 10) - 1;
      renderCalendar();
      openAddEventModal(targetDate);
    }
  }
}

// Fetch Events from SQLite
async function fetchCalendarEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/events`);
    if (!res.ok) return;
    calendarEvents = await res.json();
    renderUpcomingEventsList();
  } catch (err) {
    console.error('Error fetching calendar events:', err);
  }
}

// Render Calendar
function renderCalendar() {
  calendarHeaderTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === currentYear && today.getMonth() === currentMonth);
  const todayBtnText = document.getElementById('today-btn-text');
  if (todayBtnText && todayBtn) {
    if (isCurrentMonth) {
      todayBtnText.textContent = 'Today';
      todayBtn.className = 'px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#27205F] text-[#A5B4FC] border border-purple-500/20 opacity-70 cursor-default flex items-center space-x-1.5 shadow-sm';
      todayBtn.title = 'Currently showing current month';
    } else {
      todayBtnText.textContent = '⤺ Today';
      todayBtn.className = 'px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-md ring-2 ring-purple-400/50 cursor-pointer flex items-center space-x-1.5 transition';
      todayBtn.title = 'Jump back to current month (Today)';
    }
  }

  if (activeView === 'month') {
    renderMonthView();
  } else {
    renderWeekView();
  }
}

// Render Month Grid
function renderMonthView() {
  monthViewContainer.classList.remove('hidden');
  weekViewContainer.classList.add('hidden');
  calendarDaysMatrix.innerHTML = '';

  const today = new Date();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

  // Days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const prevMonthDate = new Date(currentYear, currentMonth - 1, dayNum);
    const dateStr = formatDateToIso(prevMonthDate);
    const cell = createDayCell(dayNum, dateStr, true, false);
    calendarDaysMatrix.appendChild(cell);
  }

  // Days in current month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    const dateStr = formatDateToIso(dateObj);
    const isToday = (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    );

    const cell = createDayCell(day, dateStr, false, isToday);
    calendarDaysMatrix.appendChild(cell);
  }

  // Days in next month to fill grid
  const cellsRendered = firstDayIndex + totalDaysInMonth;
  const nextMonthDaysCount = (7 - (cellsRendered % 7)) % 7;
  for (let day = 1; day <= nextMonthDaysCount; day++) {
    const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
    const dateStr = formatDateToIso(nextMonthDate);
    const cell = createDayCell(day, dateStr, true, false);
    calendarDaysMatrix.appendChild(cell);
  }
}

function formatDateToIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createDayCell(dayNum, dateStr, isOtherMonth, isToday) {
  const cell = document.createElement('div');
  cell.className = `cal-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}`;
  cell.dataset.date = dateStr;

  // Header of day cell
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';
  header.innerHTML = `
    <span class="text-xs font-bold ${isToday ? 'text-purple-300 font-extrabold' : 'text-white'}">${dayNum}</span>
    ${isToday ? '<span class="text-3xs font-extrabold uppercase px-1 rounded bg-purple-600 text-white">Today</span>' : ''}
  `;
  cell.appendChild(header);

  // Events container
  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5';

  const dayEvents = calendarEvents.filter(e => e.event_date === dateStr);
  dayEvents.forEach(e => {
    const pill = document.createElement('div');
    pill.className = `event-pill event-pill-${e.event_type || 'study'} cursor-pointer hover:scale-[1.02] hover:brightness-125 transition flex items-center justify-between group`;
    pill.title = `Click to edit or delete: ${e.title}${e.notes ? ' - ' + e.notes : ''}`;
    pill.innerHTML = `
      <span class="truncate">${escapeHtml(e.title)}</span>
      <span class="text-3xs text-purple-200 opacity-60 group-hover:opacity-100 ml-1">✏️</span>
    `;
    pill.addEventListener('click', (evt) => {
      evt.stopPropagation();
      openEditEventModal(e.id);
    });
    eventsContainer.appendChild(pill);
  });

  cell.appendChild(eventsContainer);

  // Click on date cell opens Add Event modal for that date
  cell.addEventListener('click', () => {
    openAddEventModal(dateStr);
  });

  return cell;
}

// Render Week View
function renderWeekView() {
  monthViewContainer.classList.add('hidden');
  weekViewContainer.classList.remove('hidden');
  weekViewDays.innerHTML = '';

  const today = new Date();
  // Find current week's Sunday
  const now = new Date(currentYear, currentMonth, today.getDate());
  const dayOfWeek = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);

  for (let i = 0; i < 7; i++) {
    const current = new Date(sunday);
    current.setDate(sunday.getDate() + i);
    const dateStr = formatDateToIso(current);
    const isToday = (
      today.getFullYear() === current.getFullYear() &&
      today.getMonth() === current.getMonth() &&
      today.getDate() === current.getDate()
    );

    const dayCol = document.createElement('div');
    dayCol.className = `dark-card p-3 min-h-[360px] flex flex-col justify-between border ${isToday ? 'border-purple-500 ring-1 ring-purple-500' : 'border-purple-500/20'}`;
    
    const dayEvents = calendarEvents.filter(e => e.event_date === dateStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][current.getDay()];

    dayCol.innerHTML = `
      <div>
        <div class="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2">
          <div>
            <span class="text-3xs uppercase text-[#A5B4FC] font-bold block">${dayName}</span>
            <span class="text-base font-extrabold ${isToday ? 'text-purple-400' : 'text-white'}">${current.getDate()}</span>
          </div>
          <button onclick="openAddEventModal('${dateStr}')" class="text-xs text-purple-400 hover:text-white font-bold p-1">+</button>
        </div>
        <div class="space-y-1.5 overflow-y-auto max-h-[280px]">
          ${dayEvents.length === 0 ? '<p class="text-3xs text-gray-500 italic py-2">No events</p>' : ''}
          ${dayEvents.map(e => `
            <div onclick="openEditEventModal(${e.id})" class="p-2 rounded-lg bg-[#27205F]/80 border border-purple-500/30 text-3xs cursor-pointer hover:border-purple-400 hover:bg-purple-900/40 transition group">
              <div class="flex items-center justify-between">
                <span class="event-pill event-pill-${e.event_type} !mt-0 !mb-1">${e.event_type.toUpperCase()}</span>
                <span class="text-3xs text-purple-300 opacity-60 group-hover:opacity-100">Edit / Delete ⚙️</span>
              </div>
              <p class="font-bold text-white">${escapeHtml(e.title)}</p>
              ${e.notes ? `<p class="text-gray-400 mt-0.5 text-3xs">${escapeHtml(e.notes)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      <button onclick="openAddEventModal('${dateStr}')" class="w-full mt-2 py-1 text-3xs font-semibold rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white transition">
        + Add Event
      </button>
    `;

    weekViewDays.appendChild(dayCol);
  }
}

// Render Upcoming Events List
function renderUpcomingEventsList() {
  upcomingEventsList.innerHTML = '';
  eventsCountBadge.textContent = calendarEvents.length;

  if (calendarEvents.length === 0) {
    upcomingEventsList.innerHTML = `
      <div class="text-center py-8 text-xs text-[#818CF8] italic">
        No upcoming exams or deadlines. Click "+ Add Calendar Event" to schedule your studies.
      </div>
    `;
    return;
  }

  // Sort upcoming events by date
  const sorted = [...calendarEvents].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  const todayStr = formatDateToIso(new Date());

  sorted.forEach(ev => {
    const isPast = ev.event_date < todayStr;
    const daysDiff = Math.ceil((new Date(ev.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
    
    let countdownText = `${daysDiff} days left`;
    if (daysDiff === 0) countdownText = 'Due Today!';
    else if (daysDiff === 1) countdownText = 'Tomorrow';
    else if (daysDiff < 0) countdownText = 'Past Event';

    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border border-purple-500/20 bg-[#151748]/80 hover:border-purple-500/50 transition flex flex-col justify-between ${isPast ? 'opacity-60' : ''}`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 cursor-pointer" onclick="openEditEventModal(${ev.id})">
          <div class="flex items-center space-x-1.5 mb-1">
            <span class="event-pill event-pill-${ev.event_type} !mt-0">${(ev.event_type || 'event').toUpperCase()}</span>
            <span class="text-3xs font-bold text-purple-300">${countdownText}</span>
          </div>
          <h4 class="text-xs font-bold text-white leading-snug">${escapeHtml(ev.title)}</h4>
          <p class="text-3xs text-[#A5B4FC] mt-0.5">${formatDate(ev.event_date)}</p>
          ${ev.notes ? `<p class="text-3xs text-gray-400 mt-1 italic">${escapeHtml(ev.notes)}</p>` : ''}
        </div>
        <div class="flex items-center space-x-1 shrink-0">
          <button onclick="openEditEventModal(${ev.id})" class="text-gray-400 hover:text-purple-300 p-1.5 rounded hover:bg-purple-600/30 transition" title="Edit Event">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="deleteEvent(${ev.id})" class="text-gray-400 hover:text-rose-400 p-1.5 rounded hover:bg-rose-600/30 transition" title="Delete Event">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;

    upcomingEventsList.appendChild(card);
  });
}

// Delete Event
window.deleteEvent = async function(eventId) {
  if (!confirm('Remove this academic event from your calendar?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/calendar/events/${eventId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Could not delete event.');

    showToast('Event removed from calendar.', 'info');
    await fetchCalendarEvents();
    renderCalendar();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Open Edit Event Modal
window.openEditEventModal = function(eventId) {
  const ev = calendarEvents.find(e => e.id === Number(eventId));
  if (!ev) return;

  if (editEventError) editEventError.classList.add('hidden');
  if (editEventId) editEventId.value = ev.id;
  if (editEventTitle) editEventTitle.value = ev.title || '';
  if (editEventType) editEventType.value = ev.event_type || 'exam';
  if (editEventDate) editEventDate.value = ev.event_date || '';
  if (editEventNotes) editEventNotes.value = ev.notes || '';

  if (editEventModal) editEventModal.classList.remove('hidden');
};

function closeEditEventModal() {
  if (editEventModal) editEventModal.classList.add('hidden');
}

if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditEventModal);
if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', closeEditEventModal);

if (deleteModalEventBtn) {
  deleteModalEventBtn.addEventListener('click', async () => {
    const id = editEventId ? editEventId.value : null;
    if (!id) return;
    if (!confirm('Are you sure you want to permanently remove this event?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete event.');
      showToast('Event removed from calendar.', 'info');
      closeEditEventModal();
      await fetchCalendarEvents();
      renderCalendar();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

if (editEventForm) {
  editEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (editEventError) editEventError.classList.add('hidden');
    const id = editEventId ? editEventId.value : null;
    if (!id) return;

    const payload = {
      title: editEventTitle.value.trim(),
      event_type: editEventType.value,
      event_date: editEventDate.value,
      notes: editEventNotes.value.trim() || null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Could not update event.');
      }

      showToast('Event updated successfully!', 'success');
      closeEditEventModal();
      await fetchCalendarEvents();
      renderCalendar();
    } catch (err) {
      if (editEventError) {
        editEventError.textContent = err.message;
        editEventError.classList.remove('hidden');
      }
    }
  });
}

// Add Event Modal
window.openAddEventModal = function(selectedDateStr = null) {
  addEventError.classList.add('hidden');
  addEventForm.reset();
  if (selectedDateStr) {
    eventDate.value = selectedDateStr;
  } else {
    eventDate.value = formatDateToIso(new Date());
  }
  addEventModal.classList.remove('hidden');
};

function closeAddEventModal() {
  addEventModal.classList.add('hidden');
}

topAddEventBtn.addEventListener('click', () => openAddEventModal());
addEventQuickBtn.addEventListener('click', () => openAddEventModal());
closeEventModalBtn.addEventListener('click', closeAddEventModal);
cancelEventModalBtn.addEventListener('click', closeAddEventModal);

// Add Event Form Submission
addEventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  addEventError.classList.add('hidden');

  const payload = {
    title: eventTitle.value.trim(),
    event_type: eventType.value,
    event_date: eventDate.value,
    notes: eventNotes.value.trim() || null,
  };

  try {
    const res = await fetch(`${API_BASE}/api/calendar/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Could not schedule event.');
    }

    showToast('Event scheduled successfully!', 'success');
    closeAddEventModal();
    await fetchCalendarEvents();
    renderCalendar();
  } catch (err) {
    addEventError.textContent = err.message;
    addEventError.classList.remove('hidden');
  }
});

// Month & View Navigation Controls
prevMonthBtn.addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
});

todayBtn.addEventListener('click', () => {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
});

viewMonthBtn.addEventListener('click', () => {
  activeView = 'month';
  viewMonthBtn.className = 'px-3 py-1 rounded-md bg-purple-600 text-white transition';
  viewWeekBtn.className = 'px-3 py-1 rounded-md text-[#A5B4FC] hover:text-white transition';
  renderCalendar();
});

viewWeekBtn.addEventListener('click', () => {
  activeView = 'week';
  viewWeekBtn.className = 'px-3 py-1 rounded-md bg-purple-600 text-white transition';
  viewMonthBtn.className = 'px-3 py-1 rounded-md text-[#A5B4FC] hover:text-white transition';
  renderCalendar();
});

// AI Assistant Drawer (Text-Based Voice Input)
function openAssistant() {
  aiModal.classList.remove('hidden');
  assistantInput.focus();
}

if (openAssistantNavBtn) openAssistantNavBtn.addEventListener('click', openAssistant);
if (closeAssistantBtn) closeAssistantBtn.addEventListener('click', () => aiModal.classList.add('hidden'));

async function sendAssistantMessage() {
  const query = assistantInput.value.trim();
  if (!query) return;

  appendChatBubble(query, 'user');
  assistantInput.value = '';

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
    appendChatBubble(data.reply, 'ai');

  } catch (err) {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    appendChatBubble(`Error: ${err.message}`, 'ai');
  }
}

if (assistantSendBtn) assistantSendBtn.addEventListener('click', sendAssistantMessage);
if (assistantInput) {
  assistantInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAssistantMessage();
  });
}

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

// Microphone Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'hi-IN';

  recognition.onstart = () => assistantMicBtn.classList.add('recording-pulse');
  recognition.onresult = (e) => {
    assistantInput.value = e.results[0][0].transcript;
    sendAssistantMessage();
  };
  recognition.onerror = () => assistantMicBtn.classList.remove('recording-pulse');
  recognition.onend = () => assistantMicBtn.classList.remove('recording-pulse');

  assistantMicBtn.addEventListener('click', () => {
    try { recognition.start(); } catch (e) { recognition.stop(); }
  });
}

document.addEventListener('DOMContentLoaded', initCalendar);
