/**
 * StudyAI LMS — 3-Level Notes Hub JavaScript
 * Level 1: All Subjects -> Level 2: Subject Curriculum Topics -> Level 3: Complete Notes Reading
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
  const d = new Date(dateStr);
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

// State
let allSubjects = [];
let currentSubject = null;
let currentTopics = [];
let currentMaterials = [];
let currentTopic = null;
let activeStudyPack = null;
let originalTopicNotesHtml = '';

// DOM Elements - Level Containers
const level1Section = document.getElementById('notes-level-1-subjects');
const level2Section = document.getElementById('notes-level-2-topics');
const level3Section = document.getElementById('notes-level-3-reading');

// Breadcrumbs
const breadcrumb1 = document.getElementById('breadcrumb-level-1');
const breadcrumb2 = document.getElementById('breadcrumb-level-2');
const breadcrumb3 = document.getElementById('breadcrumb-level-3');
const breadcrumbSep1 = document.getElementById('breadcrumb-sep-1');
const breadcrumbSep2 = document.getElementById('breadcrumb-sep-2');

// Level 1 Elements
const subjectsGrid = document.getElementById('subjects-list-grid');
const noSubjectsView = document.getElementById('no-subjects-view');

// Level 2 Elements
const backToSubjectsBtn = document.getElementById('back-to-subjects-btn');
const level2SubjectTitle = document.getElementById('level2-subject-title');
const level2SubjectDesc = document.getElementById('level2-subject-desc');
const level2SubjectBadge = document.getElementById('level2-subject-badge');
const level2WorkspaceLink = document.getElementById('level2-workspace-link');
const level2TopicsCount = document.getElementById('level2-topics-count');
const level2TopicsList = document.getElementById('level2-topics-list');
const level2MaterialsCount = document.getElementById('level2-materials-count');
const level2MaterialsList = document.getElementById('level2-materials-list');

// Level 3 Elements
const backToTopicsBtn = document.getElementById('back-to-topics-btn');
const level3TopicSessionPill = document.getElementById('level3-topic-session-pill');
const level3SubjectTag = document.getElementById('level3-subject-tag');
const level3TopicTitle = document.getElementById('level3-topic-title');
const level3TopicsMenu = document.getElementById('level3-topics-menu');
const readingContentTitle = document.getElementById('reading-content-title');
const readingContentSubtitle = document.getElementById('reading-content-subtitle');
const readingNotesContent = document.getElementById('reading-notes-content');
const fontDecBtn = document.getElementById('font-dec-btn');
const fontResetBtn = document.getElementById('font-reset-btn');
const fontIncBtn = document.getElementById('font-inc-btn');
const topicSearchInput = document.getElementById('topic-search-input');
const printTopicNotesBtn = document.getElementById('print-topic-notes-btn');
const copyTopicNotesBtn = document.getElementById('copy-topic-notes-btn');

// AI Assistant
const aiModal = document.getElementById('ai-assistant-modal');
const openAssistantNavBtn = document.getElementById('open-assistant-nav-btn');
const closeAssistantBtn = document.getElementById('close-assistant-btn');
const assistantMessages = document.getElementById('assistant-chat-messages');
const assistantInput = document.getElementById('assistant-text-input');
const assistantSendBtn = document.getElementById('assistant-send-btn');
const assistantMicBtn = document.getElementById('assistant-mic-btn');

// Markdown Formatter with Educational Callouts
function renderMarkdown(mdText) {
  if (!mdText) return '';
  let formatted = mdText;

  // Graph / Chart Callout
  formatted = formatted.replace(
    /(?:^|\n)(Graph Analysis|Chart Explanation|Diagram Breakdown|Figure|Graphical Representation):?([^\n]+(?:\n[^\n#]+)*)/gi,
    '\n<div class="callout-chart"><h4 class="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 mb-1.5"><svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> $1</h4><div class="text-xs text-blue-900 leading-relaxed">$2</div></div>\n'
  );

  // Numerical Steps Callout
  formatted = formatted.replace(
    /(?:^|\n)(Numerical Problem|Step-by-Step Solution|Calculation Steps|Practice Numerical):?([^\n]+(?:\n[^\n#]+)*)/gi,
    '\n<div class="callout-math"><h4 class="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-1.5"><svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg> $1</h4><div class="text-xs text-emerald-950 leading-relaxed font-mono">$2</div></div>\n'
  );

  // Exam Takeaway
  formatted = formatted.replace(
    /(?:^|\n)(Important Exam Topic|Professor Note|Key Rule to Remember|Exam Takeaway):?([^\n]+(?:\n[^\n#]+)*)/gi,
    '\n<div class="callout-purple"><h4 class="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 mb-1.5"><svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg> $1</h4><div class="text-xs text-purple-950 leading-relaxed font-medium">$2</div></div>\n'
  );

  if (typeof marked !== 'undefined' && marked.parse) {
    try {
      return marked.parse(formatted);
    } catch (e) {
      console.warn('Marked parse fallback:', e);
    }
  }

  return escapeHtml(formatted);
}

// 1. Initial Load
async function initNotesHub() {
  await fetchAllSubjects();

  // Check URL parameters or stored session for seamless note persistence
  const urlParams = new URLSearchParams(window.location.search);
  const paramSubjectId = urlParams.get('subject_id') || sessionStorage.getItem('last_active_subject') || localStorage.getItem('last_active_subject');
  const paramTopicIdx = urlParams.get('topic_idx');

  if (paramSubjectId) {
    const sub = allSubjects.find(s => s.id === parseInt(paramSubjectId, 10));
    if (sub) {
      await openSubjectLevel2(sub);
      const targetTopicIdx = (paramTopicIdx !== null && currentTopics[paramTopicIdx]) ? parseInt(paramTopicIdx, 10) : 0;
      if (currentTopics.length > 0 && currentTopics[targetTopicIdx]) {
        openTopicLevel3(currentTopics[targetTopicIdx], targetTopicIdx);
      }
      return;
    }
  }

  showLevel1();
}

// Fetch Level 1: All Subjects (Actual User Created / Uploaded Subjects Only)
async function fetchAllSubjects() {
  try {
    const res = await fetch(`${API_BASE}/api/subjects`);
    if (!res.ok) throw new Error('Could not load subjects.');
    allSubjects = await res.json();
    renderLevel1Subjects();
  } catch (err) {
    console.error('Error fetching subjects:', err);
  }
}

function renderLevel1Subjects() {
  subjectsGrid.innerHTML = '';
  if (allSubjects.length === 0) {
    noSubjectsView.classList.remove('hidden');
    return;
  }

  noSubjectsView.classList.add('hidden');

  // Resume Reading Banner if user has generated study packs
  try {
    const rawLatest = localStorage.getItem('latest_study_pack');
    if (rawLatest) {
      const parsed = JSON.parse(rawLatest);
      const subId = parsed.subject_id || 3;
      const subName = parsed.subject_name || 'Economics';
      const matName = parsed.material ? parsed.material.original_filename : 'Lecture Notes';
      
      const resumeCard = document.createElement('div');
      resumeCard.className = 'col-span-full dark-card p-5 border border-purple-500/40 bg-gradient-to-r from-[#241B66] via-[#1E1452] to-[#151748] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 shadow-lg';
      resumeCard.innerHTML = `
        <div class="flex items-center space-x-3.5 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-400/40 flex items-center justify-center font-bold text-sm shrink-0">
            📖
          </div>
          <div class="min-w-0">
            <span class="text-3xs font-bold uppercase tracking-wider text-purple-300 block">Resume Active Notes</span>
            <h4 class="text-sm font-bold text-white truncate">${escapeHtml(matName)}</h4>
            <p class="text-xs text-[#A5B4FC] truncate">${escapeHtml(subName)} • Top Ranker Structured Notes Ready</p>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <a href="subject.html?subject_id=${subId}#notes" class="btn-purple-glow px-4 py-2 text-xs font-semibold flex items-center space-x-1.5 shadow-sm">
            <span>Read in Academic Reader &rarr;</span>
          </a>
        </div>
      `;
      subjectsGrid.appendChild(resumeCard);
    }
  } catch (e) {}

  const colorPalettes = [
    { border: 'border-purple-500/30', bgGlow: 'from-purple-900/30 to-[#151748]', iconText: 'text-purple-400 bg-purple-500/20' },
    { border: 'border-sky-500/30', bgGlow: 'from-sky-900/30 to-[#151748]', iconText: 'text-sky-400 bg-sky-500/20' },
    { border: 'border-emerald-500/30', bgGlow: 'from-emerald-900/30 to-[#151748]', iconText: 'text-emerald-400 bg-emerald-500/20' },
  ];

  allSubjects.forEach((sub, idx) => {
    const palette = colorPalettes[idx % colorPalettes.length];
    const card = document.createElement('div');
    card.className = `dark-card p-5 border ${palette.border} bg-gradient-to-b ${palette.bgGlow} flex flex-col justify-between hover:scale-[1.02] transition cursor-pointer`;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl ${palette.iconText} flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          </div>
          <span class="text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300">
            ${sub.materials_count || 0} Deck(s)
          </span>
        </div>
        <h3 class="text-base font-bold text-white tracking-tight leading-snug">${escapeHtml(sub.name)}</h3>
        <p class="text-xs text-[#A5B4FC] mt-1 line-clamp-2 leading-relaxed">${escapeHtml(sub.description || 'Full lecture curriculum and slide compendium.')}</p>
      </div>

      <div class="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
        <span class="text-3xs font-semibold text-[#DDD6FE]">${sub.topics_count || 0} Identified Topics</span>
        <span class="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition flex items-center gap-1">
          <span>View Notes</span>
          <span>&rarr;</span>
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      openSubjectLevel2(sub);
    });

    subjectsGrid.appendChild(card);
  });
}

// 2. Open Level 2: Subject Curriculum Topics & Lecture Sessions
async function openSubjectLevel2(subject) {
  currentSubject = subject;

  // Update Breadcrumbs
  breadcrumb1.className = 'hover:text-white transition';
  breadcrumbSep1.classList.remove('hidden');
  breadcrumb2.classList.remove('hidden');
  breadcrumb2.textContent = subject.name;
  breadcrumb2.className = 'text-purple-300 font-bold';
  breadcrumbSep2.classList.add('hidden');
  breadcrumb3.classList.add('hidden');

  // Update Header Banner
  level2SubjectTitle.textContent = subject.name;
  level2SubjectDesc.textContent = subject.description || 'All lecture materials, decks, and curriculum topics identified for this course.';
  level2SubjectBadge.textContent = `${subject.materials_count || 0} Uploaded Files`;
  level2WorkspaceLink.href = `subject.html?subject_id=${subject.id}`;

  // Fetch Topics and Materials in Parallel
  try {
    const [topicsRes, matsRes] = await Promise.all([
      fetch(`${API_BASE}/api/subjects/${subject.id}/topics`),
      fetch(`${API_BASE}/api/subjects/${subject.id}/materials`),
    ]);

    currentTopics = topicsRes.ok ? await topicsRes.json() : [];
    currentMaterials = matsRes.ok ? await matsRes.json() : [];

    renderLevel2Content();
    showLevel2();
  } catch (err) {
    showToast('Failed to load subject topics.', 'error');
  }
}

function renderLevel2Content() {
  level2TopicsList.innerHTML = '';
  level2TopicsCount.textContent = currentTopics.length;

  if (currentTopics.length === 0) {
    level2TopicsList.innerHTML = `
      <div class="p-6 text-center rounded-xl bg-[#151748]/60 border border-dashed border-purple-500/30 text-xs text-[#A5B4FC]">
        No topics synthesized yet. Upload your PowerPoint or PDF lecture deck to extract structured notes.
        <div class="mt-3">
          <a href="subject.html?subject_id=${currentSubject.id}" class="btn-purple-glow px-3 py-1.5 text-xs font-semibold inline-block">
            Upload Lecture Slides
          </a>
        </div>
      </div>
    `;
  } else {
    currentTopics.forEach((top, idx) => {
      const topicCard = document.createElement('div');
      topicCard.className = 'dark-card p-4 border border-purple-500/20 bg-[#151748]/90 hover:border-purple-500 hover:bg-[#27205F]/60 transition cursor-pointer flex items-center justify-between gap-3';

      topicCard.innerHTML = `
        <div class="flex items-start space-x-3 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            ${idx + 1}
          </div>
          <div>
            <h4 class="text-sm font-bold text-white leading-snug">${escapeHtml(top.title)}</h4>
            <p class="text-xs text-[#DDD6FE] mt-0.5 line-clamp-1">${escapeHtml(top.summary || 'Click to examine complete notes and explanations.')}</p>
          </div>
        </div>
        <div class="shrink-0 flex items-center space-x-2 text-purple-400 font-semibold text-xs">
          <span>Read &rarr;</span>
        </div>
      `;

      topicCard.addEventListener('click', () => {
        openTopicLevel3(top, idx);
      });

      level2TopicsList.appendChild(topicCard);
    });
  }

  // Render Materials / Sessions
  level2MaterialsList.innerHTML = '';
  level2MaterialsCount.textContent = currentMaterials.length;

  if (currentMaterials.length === 0) {
    level2MaterialsList.innerHTML = `
      <div class="p-4 text-center rounded-xl bg-[#151748]/40 border border-dashed border-purple-500/20 text-3xs text-[#818CF8]">
        No uploaded presentations or documents.
      </div>
    `;
  } else {
    currentMaterials.forEach((mat) => {
      const matCard = document.createElement('div');
      matCard.className = 'p-3 rounded-xl border border-purple-500/20 bg-[#151748]/70 flex items-center justify-between text-xs';
      
      const ext = mat.file_type.toLowerCase();
      let badgeColor = 'bg-purple-600/30 text-purple-300';
      if (ext === '.pdf') badgeColor = 'bg-rose-600/30 text-rose-300';
      else if (ext === '.docx') badgeColor = 'bg-blue-600/30 text-blue-300';

      matCard.innerHTML = `
        <div class="flex items-center space-x-2 min-w-0">
          <span class="text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeColor}">
            ${mat.file_type.replace('.', '').toUpperCase()}
          </span>
          <span class="truncate font-semibold text-white">${escapeHtml(mat.original_filename)}</span>
        </div>
        <span class="text-3xs text-[#818CF8] shrink-0">${formatDate(mat.uploaded_at)}</span>
      `;
      level2MaterialsList.appendChild(matCard);
    });
  }
}

// 3. Open Level 3: Complete Topic Notes Reading
async function openTopicLevel3(topic, topicIndex = 0) {
  currentTopic = topic;

  // Update Breadcrumbs
  breadcrumbSep2.classList.remove('hidden');
  breadcrumb3.classList.remove('hidden');
  breadcrumb3.textContent = topic.title;
  breadcrumb2.className = 'hover:text-white transition';

  // Header Details
  level3TopicTitle.textContent = topic.title;
  level3SubjectTag.textContent = currentSubject ? currentSubject.name : '';
  level3TopicSessionPill.textContent = `Topic ${topicIndex + 1} of ${currentTopics.length}`;
  readingContentTitle.textContent = topic.title;
  readingContentSubtitle.textContent = `${currentSubject ? currentSubject.name : 'Course'} • Structured Topic Breakdown`;

  // Render Topic Switcher Sidebar
  renderLevel3TopicMenu(topic.id);

  // Load Notes Content
  // If notes_markdown is available on the topic, use it; otherwise fetch active study pack for material
  let notesMarkdown = topic.notes_markdown || '';
  if (!notesMarkdown && currentMaterials.length > 0) {
    try {
      const readyMat = currentMaterials.find(m => m.has_study_pack) || currentMaterials[0];
      const spRes = await fetch(`${API_BASE}/api/materials/${readyMat.id}/study-pack`);
      if (spRes.ok) {
        const sp = await spRes.json();
        notesMarkdown = sp.revision_notes;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  if (notesMarkdown) {
    originalTopicNotesHtml = renderMarkdown(notesMarkdown);
    readingNotesContent.innerHTML = originalTopicNotesHtml;
  } else {
    readingNotesContent.innerHTML = `
      <div class="text-center py-12 text-slate-400">
        <p class="text-sm font-semibold">No notes generated for this topic yet.</p>
        <p class="text-xs mt-1">Generate a study pack from your uploaded material to compile textbook notes.</p>
      </div>
    `;
  }

  showLevel3();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderLevel3TopicMenu(activeTopicId) {
  level3TopicsMenu.innerHTML = '';
  currentTopics.forEach((top, idx) => {
    const item = document.createElement('div');
    const isActive = top.id === activeTopicId;
    item.className = `p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center justify-between ${
      isActive 
        ? 'border-purple-500 bg-purple-600/30 text-white shadow-sm ring-1 ring-purple-500' 
        : 'border-purple-500/20 bg-[#151748]/70 text-[#DDD6FE] hover:bg-[#27205F]'
    }`;

    item.innerHTML = `
      <div class="flex items-center space-x-2 truncate">
        <span class="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 text-3xs font-bold flex items-center justify-center shrink-0">
          ${idx + 1}
        </span>
        <span class="truncate">${escapeHtml(top.title)}</span>
      </div>
      ${isActive ? '<span class="text-purple-400 text-xs">●</span>' : ''}
    `;

    item.addEventListener('click', () => {
      openTopicLevel3(top, idx);
    });

    level3TopicsMenu.appendChild(item);
  });
}

// View Visibility Helpers
function showLevel1() {
  level1Section.classList.remove('hidden');
  level2Section.classList.add('hidden');
  level3Section.classList.add('hidden');
  breadcrumb1.className = 'text-purple-300 font-bold';
  breadcrumbSep1.classList.add('hidden');
  breadcrumb2.classList.add('hidden');
  breadcrumbSep2.classList.add('hidden');
  breadcrumb3.classList.add('hidden');
}

function showLevel2() {
  level1Section.classList.add('hidden');
  level2Section.classList.remove('hidden');
  level3Section.classList.add('hidden');
}

function showLevel3() {
  level1Section.classList.add('hidden');
  level2Section.classList.add('hidden');
  level3Section.classList.remove('hidden');
}

// Breadcrumb Clicks
breadcrumb1.addEventListener('click', showLevel1);
breadcrumb2.addEventListener('click', () => {
  if (currentSubject) openSubjectLevel2(currentSubject);
});
backToSubjectsBtn.addEventListener('click', showLevel1);
backToTopicsBtn.addEventListener('click', () => {
  if (currentSubject) openSubjectLevel2(currentSubject);
});

// Reading Controls (Font Size, Search, Print, Copy)
if (fontDecBtn) {
  fontDecBtn.addEventListener('click', () => {
    readingNotesContent.classList.remove('font-size-md', 'font-size-lg');
    readingNotesContent.classList.add('font-size-sm');
  });
}

if (fontResetBtn) {
  fontResetBtn.addEventListener('click', () => {
    readingNotesContent.classList.remove('font-size-sm', 'font-size-lg');
    readingNotesContent.classList.add('font-size-md');
  });
}

if (fontIncBtn) {
  fontIncBtn.addEventListener('click', () => {
    readingNotesContent.classList.remove('font-size-sm', 'font-size-md');
    readingNotesContent.classList.add('font-size-lg');
  });
}

if (printTopicNotesBtn) {
  printTopicNotesBtn.addEventListener('click', () => {
    window.print();
  });
}

if (copyTopicNotesBtn) {
  copyTopicNotesBtn.addEventListener('click', () => {
    if (currentTopic && readingNotesContent.innerText) {
      navigator.clipboard.writeText(readingNotesContent.innerText).then(() => {
        showToast('Topic notes copied to clipboard.', 'success');
      }).catch(() => {
        showToast('Could not copy to clipboard.', 'error');
      });
    }
  });
}

// Live Search in Topic Notes
if (topicSearchInput) {
  topicSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (!query) {
      readingNotesContent.innerHTML = originalTopicNotesHtml;
      return;
    }

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalTopicNotesHtml;

    function highlightNode(node) {
      if (node.nodeType === 3) {
        if (regex.test(node.nodeValue)) {
          const span = document.createElement('span');
          span.innerHTML = node.nodeValue.replace(regex, '<mark class="search-highlight">$1</mark>');
          node.parentNode.replaceChild(span, node);
        }
      } else if (node.nodeType === 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
        Array.from(node.childNodes).forEach(highlightNode);
      }
    }

    highlightNode(tempDiv);
    readingNotesContent.innerHTML = tempDiv.innerHTML;

    const firstMark = readingNotesContent.querySelector('mark');
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

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

document.addEventListener('DOMContentLoaded', initNotesHub);


// Add Subject Modal Handlers in Notes Hub
const addSubModal = document.getElementById('add-subject-modal');
const openAddSubBtn = document.getElementById('open-add-subject-modal-btn');
const closeAddSubBtn = document.getElementById('close-add-subject-btn');
const cancelAddSubBtn = document.getElementById('cancel-add-subject-btn');
const addSubForm = document.getElementById('add-subject-form');
const newSubName = document.getElementById('new-subject-name');
const newSubDesc = document.getElementById('new-subject-desc');
const addSubErr = document.getElementById('add-subject-error');

if (openAddSubBtn) {
  openAddSubBtn.addEventListener('click', () => {
    if (addSubErr) addSubErr.classList.add('hidden');
    if (addSubForm) addSubForm.reset();
    if (addSubModal) addSubModal.classList.remove('hidden');
    if (newSubName) newSubName.focus();
  });
}
if (closeAddSubBtn) closeAddSubBtn.addEventListener('click', () => addSubModal && addSubModal.classList.add('hidden'));
if (cancelAddSubBtn) cancelAddSubBtn.addEventListener('click', () => addSubModal && addSubModal.classList.add('hidden'));

if (addSubForm) {
  addSubForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newSubName.value.trim();
    const description = newSubDesc ? newSubDesc.value.trim() : '';
    if (!name) return;

    try {
      const res = await fetch(`${API_BASE}/api/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create subject.');
      if (addSubModal) addSubModal.classList.add('hidden');
      showToast(`Subject "${data.name}" created! Opening workspace...`, 'success');
      localStorage.setItem('last_active_subject', data.id);
      setTimeout(() => {
        window.location.href = `subject.html?subject_id=${data.id}`;
      }, 350);
    } catch (err) {
      if (addSubErr) {
        addSubErr.textContent = err.message;
        addSubErr.classList.remove('hidden');
      }
    }
  });
}
