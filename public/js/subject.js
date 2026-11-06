/**
 * StudyAI LMS — Subject Academic Reader & Workspace JavaScript
 * Clean Academic Reading Light Theme with Purple Accents (#8B5CF6).
 */

// Determine appropriate API Base URL
const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:8005' : '';

// Utility Helpers
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
    success: 'bg-emerald-600 text-white shadow-lg border border-emerald-500',
    error: 'bg-rose-600 text-white shadow-lg border border-rose-500',
    info: 'bg-slate-900 text-white shadow-lg border border-purple-500',
  };

  toast.className = `toast ${bgStyles[type] || bgStyles.info}`;
  toast.innerHTML = `
    <div class="flex-grow font-medium">${escapeHtml(message)}</div>
    <button class="text-white/80 hover:text-white font-bold ml-2 leading-none text-base" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(0.5rem)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Extract subject_id from URL query string
const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('subject_id') || urlParams.get('id') || sessionStorage.getItem('last_active_subject') || localStorage.getItem('last_active_subject') || '3';
if (subjectId) {
  sessionStorage.setItem('last_active_subject', subjectId);
  localStorage.setItem('last_active_subject', subjectId);
}

// Global Workspace State
let currentSubject = null;
let materialsList = [];
let topicsList = [];
let activeMaterial = null;
let currentStudyPack = null;
let selectedFile = null;
let materialToDeleteId = null;
let originalNotesHtml = '';
let currentQuizResults = [];

// DOM Elements - Subject Header
const subjectTitle = document.getElementById('subject-title');
const subjectDesc = document.getElementById('subject-desc');
const subjectLoadingBadge = document.getElementById('subject-loading-badge');
const refreshMaterialsBtn = document.getElementById('refresh-materials-btn');
const auditSyllabusBannerBtn = document.getElementById('audit-syllabus-banner-btn');

// DOM Elements - Reading Controls
const notesSearchInput = document.getElementById('notes-search-input');
const clearNotesSearch = document.getElementById('clear-notes-search');
const fontDecBtn = document.getElementById('font-dec-btn');
const fontResetBtn = document.getElementById('font-reset-btn');
const fontIncBtn = document.getElementById('font-inc-btn');
const printPdfBtn = document.getElementById('print-pdf-btn');
const copyNotesBtn = document.getElementById('copy-notes-btn');

// DOM Elements - Syllabus Coverage
const syllabusCoveragePct = document.getElementById('syllabus-coverage-pct');
const syllabusProgressBar = document.getElementById('syllabus-progress-bar');
const syllabusStatusText = document.getElementById('syllabus-status-text');
const openSyllabusModalLink = document.getElementById('open-syllabus-modal-link');
const syllabusModal = document.getElementById('syllabus-modal');
const closeSyllabusModal = document.getElementById('close-syllabus-modal');
const cancelSyllabusBtn = document.getElementById('cancel-syllabus-btn');
const syllabusForm = document.getElementById('syllabus-form');
const syllabusTextarea = document.getElementById('syllabus-textarea');
const runSyllabusAuditBtn = document.getElementById('run-syllabus-audit-btn');
const syllabusSpinner = document.getElementById('syllabus-spinner');
const syllabusBtnText = document.getElementById('syllabus-btn-text');
const syllabusAuditError = document.getElementById('syllabus-audit-error');
const syllabusAuditResults = document.getElementById('syllabus-audit-results');
const startSyllabusAuditBtn = document.getElementById('start-syllabus-audit-btn');
const reAuditBtn = document.getElementById('re-audit-btn');

// DOM Elements - Topics
const topicsListContainer = document.getElementById('topics-list');
const topicsCountBadge = document.getElementById('topics-count-badge');

// DOM Elements - Upload
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileSelectedName = document.getElementById('file-selected-name');
const uploadForm = document.getElementById('upload-form');
const uploadSubmitBtn = document.getElementById('upload-submit-btn');
const uploadSpinner = document.getElementById('upload-spinner');
const uploadBtnText = document.getElementById('upload-btn-text');
const uploadError = document.getElementById('upload-error');

// DOM Elements - Materials List
const materialsListContainer = document.getElementById('materials-list');
const materialsLoading = document.getElementById('materials-loading');
const materialsEmpty = document.getElementById('materials-empty');
const materialsCountBadge = document.getElementById('materials-count-badge');

// DOM Elements - Study Pack Workspace
const noMaterialSelectedView = document.getElementById('no-material-selected-view');
const studyPackView = document.getElementById('study-pack-view');
const activeFileName = document.getElementById('active-material-name');
const activeFileTypeBadge = document.getElementById('active-file-type-badge');
const activeMaterialUploadedAt = document.getElementById('active-material-uploaded-at');
const generatePackBtn = document.getElementById('generate-pack-btn');
const generatePackSpinner = document.getElementById('generate-pack-spinner');
const generatePackText = document.getElementById('generate-pack-text');

const aiUnconfiguredBanner = document.getElementById('ai-unconfigured-banner');
const aiUnconfiguredMessage = document.getElementById('ai-unconfigured-message');
const generationErrorBanner = document.getElementById('generation-error-banner');
const packLoadingView = document.getElementById('pack-loading-view');
const packEmptyView = document.getElementById('pack-empty-view');
const packContentView = document.getElementById('pack-content-view');

// Tab Panes & Quiz Elements
const selfNotesTextarea = document.getElementById('self-notes-textarea');
const selfNotesStatus = document.getElementById('self-notes-status');
const saveSelfNotesBtn = document.getElementById('save-self-notes-btn');
const selfNotesWordCount = document.getElementById('self-notes-word-count');
let selfNotesDebounce = null;
const conceptsGrid = document.getElementById('concepts-grid');
const notesContent = document.getElementById('notes-content');
const quizForm = document.getElementById('quiz-form');
const quizQuestionsContainer = document.getElementById('quiz-questions-container');
const quizScoreBadge = document.getElementById('quiz-score-badge');
const quizError = document.getElementById('quiz-error');
const submitQuizBtn = document.getElementById('submit-quiz-btn');
const quizSubmitSpinner = document.getElementById('quiz-submit-spinner');
const quizSubmitText = document.getElementById('quiz-submit-text');
const historyContainer = document.getElementById('history-container');

// Quiz Review & Analytics Elements
const quizSummaryCard = document.getElementById('quiz-summary-card');
const quizScoreCircle = document.getElementById('quiz-score-circle');
const quizPerformanceTitle = document.getElementById('quiz-performance-title');
const quizPerformanceSubtitle = document.getElementById('quiz-performance-subtitle');
const quizGradePill = document.getElementById('quiz-grade-pill');
const retakeQuizBtn = document.getElementById('retake-quiz-btn');
const filterAllBtn = document.getElementById('filter-all-btn');
const filterWrongBtn = document.getElementById('filter-wrong-btn');
const filterCorrectBtn = document.getElementById('filter-correct-btn');
const countAllQ = document.getElementById('count-all-q');
const countWrongQ = document.getElementById('count-wrong-q');
const countCorrectQ = document.getElementById('count-correct-q');

// Delete Material Modal Elements
const deleteMaterialModal = document.getElementById('delete-material-modal');
const deleteMaterialName = document.getElementById('delete-material-name');
const cancelDeleteMatBtn = document.getElementById('cancel-delete-material-btn');
const confirmDeleteMatBtn = document.getElementById('confirm-delete-material-btn');

// Attempt Review Modal Elements
const attemptReviewModal = document.getElementById('attempt-review-modal');
const closeAttemptModalBtn = document.getElementById('close-attempt-modal-btn');
const modalDoneBtn = document.getElementById('modal-done-btn');
const modalScoreBadge = document.getElementById('modal-score-badge');
const modalReviewTitle = document.getElementById('modal-review-title');
const modalReviewSubtitle = document.getElementById('modal-review-subtitle');
const modalGradePill = document.getElementById('modal-grade-pill');
const modalFilterAll = document.getElementById('modal-filter-all');
const modalFilterWrong = document.getElementById('modal-filter-wrong');
const modalFilterCorrect = document.getElementById('modal-filter-correct');
const modalCountAll = document.getElementById('modal-count-all');
const modalCountWrong = document.getElementById('modal-count-wrong');
const modalCountCorrect = document.getElementById('modal-count-correct');
const modalQuestionsList = document.getElementById('modal-questions-list');

let currentModalFilter = 'all';
let currentModalAttemptResults = [];
const confirmDeleteMatSpinner = document.getElementById('confirm-delete-mat-spinner');
const deleteMaterialError = document.getElementById('delete-material-error');

// 0. Synchronous Instant Pre-Hydration (Zero flicker on Back/Close/Dashboard navigation)
function prehydrateWorkspace() {
  try {
    const cachedSubjectStr = localStorage.getItem('subject_data_' + subjectId);
    if (cachedSubjectStr) {
      currentSubject = JSON.parse(cachedSubjectStr);
      if (subjectTitle && currentSubject.name) subjectTitle.textContent = currentSubject.name;
      if (subjectDesc && currentSubject.description) subjectDesc.textContent = currentSubject.description;
    }

    const cachedMaterialsStr = localStorage.getItem('materials_list_' + subjectId);
    if (cachedMaterialsStr) {
      materialsList = JSON.parse(cachedMaterialsStr);
      renderMaterials();
    }

    const cachedMatId = localStorage.getItem('active_material_' + subjectId);
    let matToHydrate = null;
    if (cachedMatId && materialsList.length > 0) {
      matToHydrate = materialsList.find(m => m.id === parseInt(cachedMatId, 10));
    }
    if (!matToHydrate && materialsList.length > 0) {
      matToHydrate = materialsList.find(m => m.has_study_pack) || materialsList[0];
    }

    const effectiveMatId = matToHydrate ? matToHydrate.id : (cachedMatId ? parseInt(cachedMatId, 10) : 4);
    const cachedPackStr = localStorage.getItem('study_pack_' + effectiveMatId) || localStorage.getItem('latest_study_pack_for_subject_' + subjectId);

    if (cachedPackStr) {
      const pack = JSON.parse(cachedPackStr);
      currentStudyPack = pack;
      if (noMaterialSelectedView) noMaterialSelectedView.classList.add('hidden');
      if (studyPackView) studyPackView.classList.remove('hidden');
      if (packEmptyView) packEmptyView.classList.add('hidden');
      if (packContentView) packContentView.classList.remove('hidden');

      if (matToHydrate) {
        activeMaterial = matToHydrate;
        if (activeFileName) activeFileName.textContent = matToHydrate.original_filename;
        if (activeFileTypeBadge) activeFileTypeBadge.textContent = matToHydrate.file_type.replace('.', '').toUpperCase();
        if (activeMaterialUploadedAt) activeMaterialUploadedAt.textContent = `Uploaded on: ${formatDate(matToHydrate.uploaded_at)}`;
      }
      renderStudyPack(pack);
      if (generatePackText) generatePackText.textContent = '🔄 Regenerate Study Pack';
    }
  } catch (e) {
    console.warn('Pre-hydration notice:', e);
  }
}

// 1. Initial Load & Subject Fetch
async function initWorkspace() {
  if (!subjectId) {
    subjectTitle.textContent = 'Subject Not Found';
    subjectDesc.textContent = 'No subject ID was specified in the URL.';
    showToast('Missing subject identifier. Returning to dashboard.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/subjects/${subjectId}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('This subject does not exist or has been deleted.');
      }
      throw new Error('Failed to load subject details.');
    }

    currentSubject = await res.json();
    localStorage.setItem('subject_data_' + subjectId, JSON.stringify(currentSubject));
    document.title = `${currentSubject.name} — StudyAI LMS`;
    subjectTitle.textContent = currentSubject.name;
    subjectDesc.textContent = currentSubject.description || 'Comprehensive curriculum with AI slide synthesis, diagrams, and numerical solutions.';
    subjectLoadingBadge.textContent = 'Workspace Active';
    subjectLoadingBadge.className = 'text-xs text-emerald-600 font-semibold';

    // Fetch topics and materials in parallel
    await Promise.all([
      fetchTopics(),
      fetchMaterials(),
    ]);

    // Handle deep-link tab hash (e.g. #quiz)
    if (window.location.hash) {
      const tabName = window.location.hash.replace('#', '');
      if (['notes', 'concepts', 'self-notes', 'quiz', 'history', 'syllabus'].includes(tabName)) {
        switchTab(tabName);
      }
    }

  } catch (err) {
    subjectTitle.textContent = 'Error Loading Subject';
    subjectDesc.textContent = err.message;
    subjectLoadingBadge.textContent = 'Offline';
    subjectLoadingBadge.className = 'text-xs text-rose-600 font-semibold';
    showToast(err.message, 'error');
  }
}

// 2. Fetch & Render Topics (Curriculum)
async function fetchTopics() {
  try {
    const res = await fetch(`${API_BASE}/api/subjects/${subjectId}/topics`);
    if (!res.ok) return;
    topicsList = await res.json();
    renderTopics();
  } catch (err) {
    console.warn('Could not fetch topics:', err);
  }
}

function renderTopics() {
  topicsListContainer.innerHTML = '';
  topicsCountBadge.textContent = topicsList.length;

  if (topicsList.length === 0) {
    topicsListContainer.innerHTML = `
      <div class="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        No topics synthesized yet. Upload documents or audit syllabus to populate curriculum.
      </div>
    `;
    return;
  }

  topicsList.forEach((topic, idx) => {
    const item = document.createElement('div');
    item.className = 'topic-item';
    item.innerHTML = `
      <div class="flex items-center space-x-2 min-w-0">
        <span class="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[0.65rem] font-bold flex items-center justify-center shrink-0">
          ${idx + 1}
        </span>
        <span class="truncate text-slate-800 font-medium">${escapeHtml(topic.title)}</span>
      </div>
      <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    `;

    item.addEventListener('click', () => {
      // Highlight topic item
      document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      // Switch to Revision Notes tab
      switchTab('notes');

      // Scroll to topic in notes if found
      if (notesContent) {
        notesSearchInput.value = topic.title;
        performNotesSearch(topic.title);
      }
    });

    topicsListContainer.appendChild(item);
  });
}

// 3. Fetch & Render Materials
async function fetchMaterials() {
  materialsLoading.classList.remove('hidden');
  materialsEmpty.classList.add('hidden');
  materialsListContainer.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/api/subjects/${subjectId}/materials`);
    if (!res.ok) throw new Error('Could not fetch materials list.');

    materialsList = await res.json();
    localStorage.setItem('materials_list_' + subjectId, JSON.stringify(materialsList));
    materialsCountBadge.textContent = materialsList.length;

    renderMaterials();

    // Auto-select material:
    // If activeMaterial was pre-hydrated, verify it exists in updated materialsList
    if (activeMaterial) {
      const match = materialsList.find(m => m.id === activeMaterial.id);
      if (match) {
        activeMaterial = match;
      }
    }

    if (materialsList.length > 0) {
      const savedMatId = localStorage.getItem('active_material_' + subjectId);
      const savedMat = savedMatId ? materialsList.find(m => m.id === parseInt(savedMatId, 10)) : null;
      const readyMat = materialsList.find((m) => m.has_study_pack);

      // Prioritize savedMat only if it actually has a study pack; otherwise prioritize the ready material!
      const targetMat = (savedMat && savedMat.has_study_pack) ? savedMat : (readyMat || savedMat || materialsList[0]);
      if (targetMat && (!activeMaterial || activeMaterial.id !== targetMat.id || !currentStudyPack)) {
        selectMaterial(targetMat.id);
      }
    } else if (materialsList.length === 0) {
      noMaterialSelectedView.classList.remove('hidden');
      studyPackView.classList.add('hidden');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    materialsLoading.classList.add('hidden');
  }
}

function renderMaterials() {
  if (materialsList.length === 0) {
    materialsEmpty.classList.remove('hidden');
    materialsListContainer.innerHTML = '';
    return;
  }

  materialsEmpty.classList.add('hidden');
  materialsListContainer.innerHTML = '';

  materialsList.forEach((mat) => {
    const isActive = activeMaterial && activeMaterial.id === mat.id;
    const card = document.createElement('div');
    card.className = `mat-item-card ${isActive ? 'active' : ''}`;

    const ext = mat.file_type.toLowerCase();
    let badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
    if (ext === '.pdf') badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
    else if (ext === '.docx') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
    else if (ext === '.txt') badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';

    const packStatusBadge = mat.has_study_pack
      ? `<span class="inline-flex items-center text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Ready</span>`
      : `<span class="inline-flex items-center text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Uncompiled</span>`;

    card.innerHTML = `
      <div class="flex-grow min-w-0 pr-2" onclick="selectMaterial(${mat.id})">
        <div class="flex items-center space-x-2 mb-1">
          <span class="text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeColor}">
            ${mat.file_type.replace('.', '').toUpperCase()}
          </span>
          <p class="text-xs font-semibold text-slate-900 truncate" title="${escapeHtml(mat.original_filename)}">
            ${escapeHtml(mat.original_filename)}
          </p>
        </div>
        <div class="flex items-center justify-between text-3xs text-slate-400">
          <span>${formatDate(mat.uploaded_at)}</span>
          ${packStatusBadge}
        </div>
      </div>
      <button 
        type="button" 
        title="Delete file"
        onclick="event.stopPropagation(); openDeleteMaterialModal(${mat.id});" 
        class="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition shrink-0"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    `;

    materialsListContainer.appendChild(card);
  });
}

// 4. File Upload Handling
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('click', (e) => e.stopPropagation());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-purple-500', 'bg-purple-50/50');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('border-purple-500', 'bg-purple-50/50');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-purple-500', 'bg-purple-50/50');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileSelected(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files.length > 0) {
    handleFileSelected(fileInput.files[0]);
  }
});

function handleFileSelected(file) {
  selectedFile = file;
  fileSelectedName.innerHTML = `<span class="text-slate-900 font-bold block break-words">${escapeHtml(file.name)}</span><span class="text-[0.7rem] text-purple-600 font-semibold mt-1 inline-block">✓ Ready to process (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>`;
  dropZone.classList.add('border-purple-500', 'bg-purple-50/40');
  uploadSubmitBtn.disabled = false;
  uploadError.classList.add('hidden');
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedFile) return;

  uploadError.classList.add('hidden');
  uploadSubmitBtn.disabled = true;
  uploadSpinner.classList.remove('hidden');
  uploadBtnText.textContent = 'Processing & Extracting...';

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const res = await fetch(`${API_BASE}/api/subjects/${subjectId}/materials`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'File upload failed.');
    }

    showToast(`Successfully processed ${data.original_filename}`, 'success');
    
    // Reset file selection
    selectedFile = null;
    fileInput.value = '';
    fileSelectedName.textContent = 'Select or drop presentation / document';
    dropZone.classList.remove('border-purple-500', 'bg-purple-50/40');
    uploadSubmitBtn.disabled = true;

    // Refresh materials list and select the newly uploaded file
    await fetchMaterials();
    await fetchTopics();
    selectMaterial(data.id);
  } catch (err) {
    uploadError.textContent = err.message;
    uploadError.classList.remove('hidden');
  } finally {
    uploadSpinner.classList.add('hidden');
    uploadBtnText.textContent = 'Upload & Process Material';
    if (selectedFile) uploadSubmitBtn.disabled = false;
  }
});

// 5. Material Selection & Study Pack Inspection
window.selectMaterial = async function(matId) {
  const mat = materialsList.find((m) => m.id === matId);
  if (!mat) return;

  activeMaterial = mat;
  localStorage.setItem('active_material_' + subjectId, matId);
  renderMaterials(); // Refresh active highlight

  noMaterialSelectedView.classList.add('hidden');
  studyPackView.classList.remove('hidden');

  // Set active material toolbar
  activeFileName.textContent = mat.original_filename;
  activeFileTypeBadge.textContent = mat.file_type.replace('.', '').toUpperCase();
  activeMaterialUploadedAt.textContent = `Uploaded on: ${formatDate(mat.uploaded_at)}`;

  // Reset notices
  aiUnconfiguredBanner.classList.add('hidden');
  generationErrorBanner.classList.add('hidden');

  if (selfNotesTextarea) {
    const draft = localStorage.getItem(`draft_self_notes_${mat.id}`);
    selfNotesTextarea.value = (draft !== null && draft !== '') ? draft : (mat.self_notes || '');
    updateSelfNotesWordCount();
  }

  // Load study pack for this material (with instant local cache restore)
  await fetchStudyPack(mat.id);
};

async function fetchStudyPack(matId) {
  const cacheKey = `study_pack_${matId}`;
  const cachedJson = localStorage.getItem(cacheKey);

  // If cached locally, render immediately so user never sees notes disappear on Back or Dashboard navigation
  if (cachedJson) {
    try {
      const cachedPack = JSON.parse(cachedJson);
      currentStudyPack = cachedPack;
      renderStudyPack(cachedPack);
      generatePackText.textContent = '🔄 Regenerate Study Pack';
    } catch (e) {
      console.warn('Cache error:', e);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/materials/${matId}/study-pack`);
    if (res.status === 404) {
      if (!currentStudyPack) {
        localStorage.removeItem(cacheKey);
        packContentView.classList.add('hidden');
        packEmptyView.classList.remove('hidden');
        generatePackText.textContent = 'Generate Study Pack';
      }
      return;
    }

    if (!res.ok) {
      throw new Error('Could not retrieve study pack.');
    }

    currentStudyPack = await res.json();
    localStorage.setItem(cacheKey, JSON.stringify(currentStudyPack));
    localStorage.setItem('latest_study_pack_for_subject_' + subjectId, JSON.stringify(currentStudyPack));
    if (activeMaterial) {
      localStorage.setItem('latest_study_pack', JSON.stringify({
        subject_id: subjectId,
        subject_name: currentSubject ? currentSubject.name : 'Course',
        material: activeMaterial,
        pack: currentStudyPack
      }));
    }
    renderStudyPack(currentStudyPack);
    generatePackText.textContent = '🔄 Regenerate Study Pack';
  } catch (err) {
    if (!currentStudyPack) {
      generationErrorBanner.textContent = err.message;
      generationErrorBanner.classList.remove('hidden');
    }
  }
}

// Educational Markdown Formatter with Graphs and Numerical Callout enhancements
function renderMarkdown(mdText) {
  if (!mdText) return '';
  
  let formatted = mdText;

  // Enhance Graph / Chart callouts
  formatted = formatted.replace(
    /(?:^|\n)(Graph Analysis|Chart Explanation|Diagram Breakdown|Figure|Graphical Representation):?([^\n]+(?:\n[^\n#]+)*)/gi,
    '\n<div class="callout-chart"><h4 class="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 mb-1.5"><svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg> $1</h4><div class="text-xs text-blue-900 leading-relaxed">$2</div></div>\n'
  );

  // Enhance Step-by-Step Numerical Callouts
  formatted = formatted.replace(
    /(?:^|\n)(Numerical Problem|Step-by-Step Solution|Calculation Steps|Practice Numerical):?([^\n]+(?:\n[^\n#]+)*)/gi,
    '\n<div class="callout-math"><h4 class="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-1.5"><svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg> $1</h4><div class="text-xs text-emerald-950 leading-relaxed font-mono">$2</div></div>\n'
  );

  // Enhance Exam Takeaway Callouts
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

function renderStudyPack(pack) {
  if (noMaterialSelectedView) noMaterialSelectedView.classList.add('hidden');
  if (studyPackView) studyPackView.classList.remove('hidden');
  if (packEmptyView) packEmptyView.classList.add('hidden');
  if (packContentView) packContentView.classList.remove('hidden');

  // 1. Revision Notes Tab
  originalNotesHtml = renderMarkdown(pack.revision_notes);
  if (notesContent) notesContent.innerHTML = originalNotesHtml;

  // By default, activate Revision Notes tab unless a deep link is specified
  if (!window.location.hash || window.location.hash === '#notes') {
    switchTab('notes');
  }

  // 2. Key Concepts Tab
  conceptsGrid.innerHTML = '';
  pack.key_concepts.forEach((concept, idx) => {
    const card = document.createElement('div');
    card.className = 'p-5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between hover:border-purple-300 hover:shadow-xs transition';
    
    const exampleHtml = concept.example ? `
      <div class="mt-3.5 pt-3 border-t border-slate-200">
        <div class="flex items-center space-x-1.5 mb-1">
          <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span class="text-[0.625rem] font-bold text-purple-700 tracking-wider uppercase">Application / Lecture Example</span>
        </div>
        <p class="text-xs text-slate-700 bg-white p-3 rounded-lg border border-purple-100 leading-relaxed italic">
          ${escapeHtml(concept.example)}
        </p>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-[0.625rem] font-bold text-purple-600 tracking-wider uppercase">Concept ${idx + 1}</span>
        </div>
        <h5 class="text-base font-bold text-slate-900 mb-2 leading-snug">${escapeHtml(concept.title)}</h5>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(concept.explanation)}</p>
        ${exampleHtml}
      </div>
    `;
    conceptsGrid.appendChild(card);
  });

  // 3. Student Self Notes Tab
  if (selfNotesTextarea) {
    selfNotesTextarea.value = pack.self_notes || activeMaterial?.self_notes || '';
    updateSelfNotesWordCount();
  }

  // 4. Interactive Practice Quiz Tab
  renderQuiz(pack.questions);

  // 5. Quiz History Tab
  fetchQuizHistory(pack.material_id);
}

// Self Notes Helper Functions
function updateSelfNotesWordCount() {
  if (!selfNotesTextarea || !selfNotesWordCount) return;
  const val = selfNotesTextarea.value.trim();
  const words = val ? val.split(/\s+/).length : 0;
  const chars = val.length;
  selfNotesWordCount.textContent = `${words} words • ${chars} characters`;
}

async function saveSelfNotes() {
  if (!activeMaterial || !selfNotesTextarea) return;
  const text = selfNotesTextarea.value;
  if (selfNotesStatus) selfNotesStatus.textContent = 'Saving...';
  try {
    const res = await fetch(`/api/materials/${activeMaterial.id}/self-notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ self_notes: text })
    });
    if (res.ok) {
      activeMaterial.self_notes = text;
      if (selfNotesStatus) {
        selfNotesStatus.textContent = 'Saved! ✓';
        setTimeout(() => { if (selfNotesStatus) selfNotesStatus.textContent = 'All changes saved'; }, 2000);
      }
    }
  } catch (e) {
    if (selfNotesStatus) selfNotesStatus.textContent = 'Failed to save';
  }
}

if (selfNotesTextarea) {
  selfNotesTextarea.addEventListener('input', () => {
    updateSelfNotesWordCount();
    if (activeMaterial) {
      localStorage.setItem(`draft_self_notes_${activeMaterial.id}`, selfNotesTextarea.value);
    }
    if (selfNotesStatus) selfNotesStatus.textContent = 'Unsaved changes...';
    clearTimeout(selfNotesDebounce);
    selfNotesDebounce = setTimeout(saveSelfNotes, 1500);
  });
  selfNotesTextarea.addEventListener('blur', saveSelfNotes);
}

window.addEventListener('beforeunload', () => {
  if (activeMaterial && selfNotesTextarea) {
    saveSelfNotes();
  }
});

if (saveSelfNotesBtn) {
  saveSelfNotesBtn.addEventListener('click', saveSelfNotes);
}

// 6. Generate AI Study Pack Action
generatePackBtn.addEventListener('click', async () => {
  if (!activeMaterial) return;

  if (currentStudyPack) {
    const confirmed = confirm(
      "A complete AI Study Pack is already saved for this document.\n\nAre you sure you want to regenerate it? (This will overwrite the current revision notes and generate a new set of practice questions.)"
    );
    if (!confirmed) return;
  }

  generatePackBtn.disabled = true;
  generatePackSpinner.classList.remove('hidden');
  packLoadingView.classList.remove('hidden');
  packEmptyView.classList.add('hidden');
  packContentView.classList.add('hidden');
  generationErrorBanner.classList.add('hidden');

  const stepText = document.getElementById('pack-loading-step-text');
  let stepIdx = 0;
  const steps = [
    'Reading and analyzing lecture slides...',
    'Extracting key concepts, formulas & definitions...',
    'Building structured revision notes & exam tips...',
    'Generating interactive practice quiz questions...'
  ];
  const stepTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    if (stepText) stepText.textContent = steps[stepIdx];
  }, 2200);

  try {
    const res = await fetch(`${API_BASE}/api/materials/${activeMaterial.id}/generate-study-pack`, {
      method: 'POST',
    });

    clearInterval(stepTimer);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 503 || (data.detail && data.detail.includes('AI is not configured'))) {
        aiUnconfiguredMessage.textContent = data.detail;
        aiUnconfiguredBanner.classList.remove('hidden');
        packEmptyView.classList.remove('hidden');
        throw new Error(data.detail);
      }
      throw new Error(data.detail || 'Study pack generation failed.');
    }

    showToast('AI Study Pack generated successfully.', 'success');
    currentStudyPack = data;
    localStorage.setItem(`study_pack_${activeMaterial.id}`, JSON.stringify(data));
    localStorage.setItem('latest_study_pack_for_subject_' + subjectId, JSON.stringify(data));
    localStorage.setItem('active_material_' + subjectId, activeMaterial.id);
    localStorage.setItem('last_active_subject', subjectId);
    localStorage.setItem('latest_study_pack', JSON.stringify({
      subject_id: subjectId,
      subject_name: currentSubject ? currentSubject.name : 'Course',
      material: activeMaterial,
      pack: data
    }));
    renderStudyPack(data);
    switchTab('notes');

    // Refresh materials list and topics
    await fetchMaterials();
    await fetchTopics();
  } catch (err) {
    if (!aiUnconfiguredBanner.classList.contains('hidden')) {
      // Banner active
    } else {
      generationErrorBanner.textContent = err.message;
      generationErrorBanner.classList.remove('hidden');
      packEmptyView.classList.remove('hidden');
    }
  } finally {
    generatePackBtn.disabled = false;
    generatePackSpinner.classList.add('hidden');
    packLoadingView.classList.add('hidden');
  }
});

// 7. Interactive Quiz Rendering & Submission with 3-Part Explanations
function renderQuiz(questions) {
  quizQuestionsContainer.innerHTML = '';
  quizScoreBadge.classList.add('hidden');
  if (quizSummaryCard) quizSummaryCard.classList.add('hidden');
  submitQuizBtn.classList.remove('hidden');
  submitQuizBtn.disabled = false;
  quizError.classList.add('hidden');

  if (!questions || questions.length === 0) {
    quizQuestionsContainer.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400">
        No quiz questions generated for this document. Click "Regenerate Study Pack" to compile questions.
      </div>
    `;
    submitQuizBtn.classList.add('hidden');
    return;
  }

  questions.forEach((q, index) => {
    const block = document.createElement('div');
    block.className = 'p-5 rounded-xl border border-slate-200 bg-white space-y-3.5 transition';
    block.id = `question-block-${q.id}`;
    block.dataset.questionId = q.id;

    const optionsHtml = q.options.map((optText, optIdx) => {
      const optionLetters = ['A', 'B', 'C', 'D'];
      const letter = optionLetters[optIdx] || String(optIdx + 1);
      return `
        <label 
          class="quiz-option-label"
          id="label_q_${q.id}_opt_${optIdx}"
        >
          <input 
            type="radio" 
            name="question_${q.id}" 
            value="${optIdx}" 
            class="w-4 h-4 text-purple-600 focus:ring-purple-500 shrink-0" 
            required
          >
          <span class="w-6 h-6 rounded-md bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
            ${letter}
          </span>
          <span class="text-xs text-slate-800 leading-relaxed font-normal">${escapeHtml(optText)}</span>
          <span class="option-tag hidden"></span>
        </label>
      `;
    }).join('');

    block.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center space-x-2">
          <span class="text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 uppercase">
            Question ${index + 1}
          </span>
        </div>
        <div id="q_status_${q.id}"></div>
      </div>
      <p class="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">${escapeHtml(q.question_text)}</p>
      <div class="space-y-2 pt-1">
        ${optionsHtml}
      </div>
      <div id="explanation_${q.id}" class="hidden"></div>
    `;

    quizQuestionsContainer.appendChild(block);
  });
}

// Submit Quiz for Server-Side Evaluation
quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeMaterial || !currentStudyPack) return;

  quizError.classList.add('hidden');
  const answers = [];

  for (const q of currentStudyPack.questions) {
    const selectedInput = document.querySelector(`input[name="question_${q.id}"]:checked`);
    if (!selectedInput) {
      quizError.textContent = 'Please respond to all questions before submitting.';
      quizError.classList.remove('hidden');
      return;
    }
    answers.push({
      question_id: q.id,
      selected_option_index: parseInt(selectedInput.value, 10),
    });
  }

  // Submit to server for grading
  submitQuizBtn.disabled = true;
  quizSubmitSpinner.classList.remove('hidden');
  quizSubmitText.textContent = 'Grading on Server...';

  try {
    const res = await fetch(`${API_BASE}/api/materials/${activeMaterial.id}/quiz-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    const attempt = await res.json();
    if (!res.ok) {
      throw new Error(attempt.detail || 'Quiz evaluation failed.');
    }

    currentQuizResults = attempt.results;
    showToast(`Quiz completed: ${attempt.score} / ${attempt.total_questions} (${attempt.percentage}%)`, 'success');
    
    quizScoreBadge.textContent = `Score: ${attempt.score} / ${attempt.total_questions} (${attempt.percentage}%)`;
    quizScoreBadge.classList.remove('hidden');

    // Display Comprehensive Quiz Summary Card
    if (quizSummaryCard) {
      quizSummaryCard.classList.remove('hidden');
      const percentageRounded = Math.round(attempt.percentage);
      if (quizScoreCircle) {
        quizScoreCircle.textContent = `${percentageRounded}%`;
        quizScoreCircle.className = `w-14 h-14 rounded-full flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
          percentageRounded >= 80 ? 'bg-emerald-600 text-white' : percentageRounded >= 60 ? 'bg-purple-600 text-white' : 'bg-rose-600 text-white'
        }`;
      }

      if (quizGradePill) {
        if (percentageRounded >= 80) {
          quizGradePill.textContent = 'Mastery Achieved';
          quizGradePill.className = 'text-2xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase';
        } else if (percentageRounded >= 60) {
          quizGradePill.textContent = 'Proficient';
          quizGradePill.className = 'text-2xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 uppercase';
        } else {
          quizGradePill.textContent = 'Revision Recommended';
          quizGradePill.className = 'text-2xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 uppercase';
        }
      }

      if (quizPerformanceTitle) {
        quizPerformanceTitle.textContent = percentageRounded >= 80 
          ? `Outstanding! ${attempt.score} of ${attempt.total_questions} Correct` 
          : percentageRounded >= 60 
          ? `Good Effort! ${attempt.score} of ${attempt.total_questions} Correct` 
          : `Practice Needed: ${attempt.score} of ${attempt.total_questions} Correct`;
      }

      const wrongCount = attempt.results.filter(r => !r.is_correct).length;
      const correctCount = attempt.results.filter(r => r.is_correct).length;
      if (countAllQ) countAllQ.textContent = attempt.total_questions;
      if (countWrongQ) countWrongQ.textContent = wrongCount;
      if (countCorrectQ) countCorrectQ.textContent = correctCount;

      setQuizFilter('all');
    }

    // Highlight answers and show rich 3-part explanations
    attempt.results.forEach((resItem) => {
      const qBlock = document.getElementById(`question-block-${resItem.question_id}`);
      const explDiv = document.getElementById(`explanation_${resItem.question_id}`);
      const qStatusDiv = document.getElementById(`q_status_${resItem.question_id}`);

      if (qBlock) {
        qBlock.dataset.isCorrect = resItem.is_correct ? 'true' : 'false';
      }

      if (qStatusDiv) {
        qStatusDiv.innerHTML = resItem.is_correct
          ? '<span class="badge-choice-correct">✓ Correct</span>'
          : '<span class="badge-choice-incorrect">✗ Incorrect</span>';
      }

      // Disable inputs
      if (qBlock) {
        const radios = qBlock.querySelectorAll('input[type="radio"]');
        radios.forEach((r) => r.disabled = true);
      }

      // Highlight selected vs correct
      const selectedLabel = document.getElementById(`label_q_${resItem.question_id}_opt_${resItem.selected_option_index}`);
      const correctLabel = document.getElementById(`label_q_${resItem.question_id}_opt_${resItem.correct_option_index}`);

      const optionLetters = ['A', 'B', 'C', 'D'];
      const userLetter = optionLetters[resItem.selected_option_index] || '?';
      const userText = resItem.options[resItem.selected_option_index] || '';
      const correctLetter = optionLetters[resItem.correct_option_index] || '?';
      const correctText = resItem.options[resItem.correct_option_index] || '';

      if (resItem.is_correct) {
        if (selectedLabel) {
          selectedLabel.classList.add('result-correct');
          const tag = selectedLabel.querySelector('.option-tag');
          if (tag) {
            tag.textContent = '✓ Your Answer (Correct)';
            tag.className = 'option-tag badge-choice-correct ml-auto shrink-0';
          }
        }
      } else {
        if (selectedLabel) {
          selectedLabel.classList.add('result-incorrect');
          const tag = selectedLabel.querySelector('.option-tag');
          if (tag) {
            tag.textContent = '✗ Your Choice';
            tag.className = 'option-tag badge-choice-incorrect ml-auto shrink-0';
          }
        }
        if (correctLabel) {
          correctLabel.classList.add('result-correct');
          const tag = correctLabel.querySelector('.option-tag');
          if (tag) {
            tag.textContent = '✓ Correct Answer';
            tag.className = 'option-tag badge-choice-correct ml-auto shrink-0';
          }
        }
      }

      // Display Deep 3-Part Pedagogical Explanation
      if (explDiv) {
        let bannerHtml = '';
        if (resItem.is_correct) {
          bannerHtml = `
            <div class="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-2">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
              <span>Accurate! Option ${userLetter} is the correct answer.</span>
            </div>
          `;
        } else {
          bannerHtml = `
            <div class="flex items-start space-x-2 text-rose-800 font-bold text-xs mb-2">
              <svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>
              <div>
                <span>Incorrect Answer</span>
                <p class="font-normal text-[0.72rem] text-rose-700 mt-0.5">
                  Your selection: <span class="line-through font-semibold">Option ${userLetter} ("${escapeHtml(userText)}")</span>
                  <br>
                  Correct selection: <span class="font-bold text-emerald-800">Option ${correctLetter} ("${escapeHtml(correctText)}")</span>
                </p>
              </div>
            </div>
          `;
        }

        explDiv.className = resItem.is_correct
          ? 'p-4 rounded-xl text-xs leading-relaxed mt-3 bg-emerald-50/70 border border-emerald-200 text-emerald-950'
          : 'p-4 rounded-xl text-xs leading-relaxed mt-3 bg-rose-50/70 border border-rose-200 text-slate-900';

        explDiv.innerHTML = `
          ${bannerHtml}
          <div class="pt-2 border-t ${resItem.is_correct ? 'border-emerald-200' : 'border-rose-200'} space-y-2">
            <div>
              <span class="text-[0.65rem] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                Conceptual Breakdown & Theoretical Explanation:
              </span>
              <div class="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white/90 p-3 rounded-lg border border-slate-200 shadow-2xs">
                ${escapeHtml(resItem.explanation)}
              </div>
            </div>
          </div>
        `;
        explDiv.classList.remove('hidden');
      }
    });

    submitQuizBtn.classList.add('hidden');

    if (quizSummaryCard) {
      quizSummaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Refresh history tab
    fetchQuizHistory(activeMaterial.id);
  } catch (err) {
    quizError.textContent = err.message;
    quizError.classList.remove('hidden');
  } finally {
    submitQuizBtn.disabled = false;
    quizSubmitSpinner.classList.add('hidden');
    quizSubmitText.textContent = 'Submit for Evaluation';
  }
});

// Quiz Filtering Logic
function setQuizFilter(filter) {
  const blocks = quizQuestionsContainer.querySelectorAll('[data-question-id]');
  blocks.forEach((block) => {
    const isCorrect = block.dataset.isCorrect === 'true';
    if (filter === 'all') {
      block.style.display = 'block';
    } else if (filter === 'wrong') {
      block.style.display = isCorrect ? 'none' : 'block';
    } else if (filter === 'correct') {
      block.style.display = isCorrect ? 'block' : 'none';
    }
  });

  // Filter button styles
  const activeClass = 'bg-purple-600 text-white';
  const defaultClass = 'bg-white text-slate-700 border border-slate-200';

  if (filterAllBtn) filterAllBtn.className = `px-2.5 py-1 rounded-md font-semibold text-xs transition ${filter === 'all' ? activeClass : defaultClass}`;
  if (filterWrongBtn) filterWrongBtn.className = `px-2.5 py-1 rounded-md font-semibold text-xs transition ${filter === 'wrong' ? 'bg-rose-600 text-white' : defaultClass}`;
  if (filterCorrectBtn) filterCorrectBtn.className = `px-2.5 py-1 rounded-md font-semibold text-xs transition ${filter === 'correct' ? 'bg-emerald-600 text-white' : defaultClass}`;
}

if (filterAllBtn) filterAllBtn.addEventListener('click', () => setQuizFilter('all'));
if (filterWrongBtn) filterWrongBtn.addEventListener('click', () => setQuizFilter('wrong'));
if (filterCorrectBtn) filterCorrectBtn.addEventListener('click', () => setQuizFilter('correct'));

// Retake Quiz
if (retakeQuizBtn) {
  retakeQuizBtn.addEventListener('click', () => {
    if (!currentStudyPack) return;
    renderQuiz(currentStudyPack.questions);
    window.scrollTo({ top: quizQuestionsContainer.offsetTop - 100, behavior: 'smooth' });
  });
}

// 8. Quiz History
async function fetchQuizHistory(matId) {
  try {
    const res = await fetch(`${API_BASE}/api/materials/${matId}/quiz-attempts`);
    if (!res.ok) return;
    const attempts = await res.json();
    renderQuizHistory(attempts);
  } catch (err) {
    console.warn('Could not load quiz history:', err);
  }
}

function renderQuizHistory(attempts) {
  historyContainer.innerHTML = '';
  if (!attempts || attempts.length === 0) {
    historyContainer.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400">
        No past quiz attempts found for this document. Complete the quiz to record scores.
      </div>
    `;
    return;
  }

  attempts.forEach((att, idx) => {
    const attemptNumber = attempts.length - idx;
    const row = document.createElement('div');
    row.className = 'p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-purple-300 hover:bg-purple-50/40 cursor-pointer transition flex items-center justify-between text-xs group';
    
    const isPassing = att.percentage >= 60;
    const badgeClass = isPassing ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300';

    row.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} border border-slate-200 shrink-0">
          #${attemptNumber}
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-bold text-slate-900 group-hover:text-purple-700 transition">Attempt #${attemptNumber}</span>
            <span class="text-3xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}">
              ${att.percentage}%
            </span>
          </div>
          <p class="text-3xs text-slate-400 mt-0.5">${formatDate(att.attempted_at || att.created_at)}</p>
        </div>
      </div>
      <div class="flex items-center space-x-3 text-right">
        <div>
          <span class="font-bold text-slate-900">${att.score} / ${att.total_questions}</span>
          <span class="text-3xs text-slate-500 block">correct answers</span>
        </div>
        <div class="hidden sm:inline-flex items-center text-3xs font-semibold text-purple-700 group-hover:text-white px-2.5 py-1 rounded-lg bg-purple-100 group-hover:bg-purple-600 transition">
          Review Answers & Theory →
        </div>
      </div>
    `;

    row.addEventListener('click', () => {
      openAttemptReviewModal(att, attemptNumber);
    });

    historyContainer.appendChild(row);
  });
}

// Attempt Review Modal Logic (Subject Reader View)
function openAttemptReviewModal(attempt, attemptNumber) {
  if (!attempt) return;

  const isPassing = attempt.percentage >= 60;
  if (modalScoreBadge) {
    modalScoreBadge.textContent = `${attempt.percentage}%`;
    modalScoreBadge.className = `w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm ${isPassing ? 'bg-emerald-600' : 'bg-rose-600'} text-white shadow-md shrink-0`;
  }
  
  if (modalReviewTitle) {
    modalReviewTitle.textContent = `Attempt #${attemptNumber} Review — ${attempt.score} of ${attempt.total_questions} Correct`;
  }
  if (modalGradePill) {
    modalGradePill.textContent = isPassing ? 'Passed (≥ 60%)' : 'Needs Review (< 60%)';
    modalGradePill.className = `text-3xs font-bold px-2 py-0.5 rounded-full ${isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} uppercase`;
  }
  
  if (modalReviewSubtitle) {
    const deckInfo = attempt.material_title || (activeMaterial ? activeMaterial.title : '');
    modalReviewSubtitle.textContent = `Attempted on ${formatDate(attempt.attempted_at || attempt.created_at || new Date())}${deckInfo ? ' • ' + deckInfo : ''}`;
  }

  currentModalAttemptResults = attempt.results || [];
  
  const wrongCount = currentModalAttemptResults.filter(r => !r.is_correct).length;
  const correctCount = currentModalAttemptResults.filter(r => r.is_correct).length;
  if (modalCountAll) modalCountAll.textContent = currentModalAttemptResults.length;
  if (modalCountWrong) modalCountWrong.textContent = wrongCount;
  if (modalCountCorrect) modalCountCorrect.textContent = correctCount;

  currentModalFilter = 'all';
  updateModalFilterButtons();
  renderModalQuestions();

  if (attemptReviewModal) attemptReviewModal.classList.remove('hidden');
}

function closeAttemptReviewModal() {
  if (attemptReviewModal) attemptReviewModal.classList.add('hidden');
}

if (closeAttemptModalBtn) closeAttemptModalBtn.addEventListener('click', closeAttemptReviewModal);
if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeAttemptReviewModal);

function updateModalFilterButtons() {
  const activeClass = 'bg-purple-600 text-white';
  const inactiveWrongClass = 'bg-slate-100 text-rose-700 border border-slate-200 hover:border-rose-300';
  const inactiveCorrectClass = 'bg-slate-100 text-emerald-700 border border-slate-200 hover:border-emerald-300';
  const inactiveAllClass = 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-purple-300';

  if (modalFilterAll) modalFilterAll.className = `px-2.5 py-1 rounded-md text-xs font-semibold transition ${currentModalFilter === 'all' ? activeClass : inactiveAllClass}`;
  if (modalFilterWrong) modalFilterWrong.className = `px-2.5 py-1 rounded-md text-xs font-semibold transition ${currentModalFilter === 'wrong' ? 'bg-rose-600 text-white' : inactiveWrongClass}`;
  if (modalFilterCorrect) modalFilterCorrect.className = `px-2.5 py-1 rounded-md text-xs font-semibold transition ${currentModalFilter === 'correct' ? 'bg-emerald-600 text-white' : inactiveCorrectClass}`;
}

if (modalFilterAll) modalFilterAll.addEventListener('click', () => { currentModalFilter = 'all'; updateModalFilterButtons(); renderModalQuestions(); });
if (modalFilterWrong) modalFilterWrong.addEventListener('click', () => { currentModalFilter = 'wrong'; updateModalFilterButtons(); renderModalQuestions(); });
if (modalFilterCorrect) modalFilterCorrect.addEventListener('click', () => { currentModalFilter = 'correct'; updateModalFilterButtons(); renderModalQuestions(); });

function renderModalQuestions() {
  if (!modalQuestionsList) return;
  modalQuestionsList.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  const filtered = currentModalAttemptResults.filter(r => {
    if (currentModalFilter === 'wrong') return !r.is_correct;
    if (currentModalFilter === 'correct') return r.is_correct;
    return true;
  });

  if (filtered.length === 0) {
    modalQuestionsList.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400">
        No questions match the "${currentModalFilter}" filter.
      </div>
    `;
    return;
  }

  filtered.forEach((resItem) => {
    const card = document.createElement('div');
    card.className = `p-4 rounded-xl border ${resItem.is_correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'} space-y-3`;

    // Options rendering
    const optionsHtml = (resItem.options || []).map((optText, optIdx) => {
      const isSelected = (optIdx === resItem.selected_option_index);
      const isCorrectOpt = (optIdx === resItem.correct_option_index);

      let optBorderBg = 'border-slate-200 bg-white text-slate-700';
      let optTag = '';

      if (isCorrectOpt) {
        optBorderBg = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-400';
        optTag = '<span class="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white ml-2">✓ Correct Answer</span>';
      }
      if (isSelected && !resItem.is_correct) {
        optBorderBg = 'border-rose-500 bg-rose-50 text-rose-900 font-semibold ring-1 ring-rose-400';
        optTag = '<span class="text-3xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white ml-2">✗ Your Selection</span>';
      } else if (isSelected && resItem.is_correct) {
        optTag = '<span class="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white ml-2">✓ Your Selection (Correct)</span>';
      }

      return `
        <div class="p-2.5 rounded-lg border text-xs flex items-center justify-between ${optBorderBg}">
          <div class="flex items-center space-x-2.5">
            <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-3xs ${isCorrectOpt ? 'bg-emerald-600 text-white' : (isSelected ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700')} shrink-0">
              ${letters[optIdx] || optIdx + 1}
            </span>
            <span>${escapeHtml(optText)}</span>
          </div>
          <div>${optTag}</div>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center space-x-2">
          <span class="text-xs font-bold text-slate-800">Question ${currentModalAttemptResults.indexOf(resItem) + 1} of ${currentModalAttemptResults.length}</span>
          <span class="text-3xs font-bold px-2 py-0.5 rounded-full ${resItem.is_correct ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}">
            ${resItem.is_correct ? '✓ Correct' : '✗ Incorrect'}
          </span>
        </div>
        <span class="text-3xs text-slate-500">
          Your Answer: <strong>Option ${letters[resItem.selected_option_index] || 'None'}</strong> • Correct: <strong>Option ${letters[resItem.correct_option_index] || '?'}</strong>
        </span>
      </div>

      <p class="text-xs font-medium text-slate-900 leading-relaxed">
        ${escapeHtml(resItem.question_text)}
      </p>

      <div class="space-y-1.5 pt-1">
        ${optionsHtml}
      </div>

      <!-- Pedagogical Explanation Block -->
      <div class="p-3.5 rounded-xl ${resItem.is_correct ? 'bg-emerald-100/60 border border-emerald-200' : 'bg-rose-100/60 border border-rose-200'} text-xs leading-relaxed space-y-1.5 mt-2">
        <span class="text-3xs font-bold uppercase tracking-wider ${resItem.is_correct ? 'text-emerald-900' : 'text-rose-900'} block">
          Pedagogical Explanation & Concept Takeaway:
        </span>
        <div class="text-xs text-slate-800 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
          ${escapeHtml(resItem.explanation)}
        </div>
      </div>
    `;

    modalQuestionsList.appendChild(card);
  });
}

// 9. Tab Switching
function switchTab(targetTab) {
  const buttons = document.querySelectorAll('.reader-tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  buttons.forEach((b) => {
    if (b.dataset.tab === targetTab) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  panes.forEach((p) => {
    if (p.id === `tab-${targetTab}`) {
      p.classList.remove('hidden');
    } else {
      p.classList.add('hidden');
    }
  });
}
window.switchTab = switchTab;

const tabButtons = document.querySelectorAll('.reader-tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

// 10. Reading Controls (Font Size, Search, Print, Copy)
if (fontDecBtn) {
  fontDecBtn.addEventListener('click', () => {
    notesContent.classList.remove('font-size-md', 'font-size-lg');
    notesContent.classList.add('font-size-sm');
  });
}

if (fontResetBtn) {
  fontResetBtn.addEventListener('click', () => {
    notesContent.classList.remove('font-size-sm', 'font-size-lg');
    notesContent.classList.add('font-size-md');
  });
}

if (fontIncBtn) {
  fontIncBtn.addEventListener('click', () => {
    notesContent.classList.remove('font-size-sm', 'font-size-md');
    notesContent.classList.add('font-size-lg');
  });
}

if (printPdfBtn) {
  printPdfBtn.addEventListener('click', () => {
    window.print();
  });
}

if (copyNotesBtn) {
  copyNotesBtn.addEventListener('click', () => {
    if (currentStudyPack && currentStudyPack.revision_notes) {
      navigator.clipboard.writeText(currentStudyPack.revision_notes).then(() => {
        showToast('Revision notes copied to clipboard.', 'success');
      }).catch(() => {
        showToast('Unable to copy to clipboard.', 'error');
      });
    }
  });
}

// Search Within Notes
function performNotesSearch(query) {
  if (!query || !query.trim()) {
    notesContent.innerHTML = originalNotesHtml;
    clearNotesSearch.classList.add('hidden');
    return;
  }

  clearNotesSearch.classList.remove('hidden');
  const term = query.trim();
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  
  // Replace plain text occurrences while preserving tags
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = originalNotesHtml;

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
  notesContent.innerHTML = tempDiv.innerHTML;

  // Scroll to first match
  const firstMark = notesContent.querySelector('mark');
  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

if (notesSearchInput) {
  notesSearchInput.addEventListener('input', (e) => {
    performNotesSearch(e.target.value);
  });
}

if (clearNotesSearch) {
  clearNotesSearch.addEventListener('click', () => {
    notesSearchInput.value = '';
    performNotesSearch('');
  });
}

// 11. Syllabus Coverage Audit Modal & Workflow
function openSyllabusModal() {
  syllabusAuditError.classList.add('hidden');
  syllabusModal.classList.remove('hidden');
}

function closeSyllabusModalFn() {
  syllabusModal.classList.add('hidden');
}

if (openSyllabusModalLink) openSyllabusModalLink.addEventListener('click', openSyllabusModal);
if (auditSyllabusBannerBtn) auditSyllabusBannerBtn.addEventListener('click', openSyllabusModal);
if (startSyllabusAuditBtn) startSyllabusAuditBtn.addEventListener('click', openSyllabusModal);
if (reAuditBtn) reAuditBtn.addEventListener('click', openSyllabusModal);
if (closeSyllabusModal) closeSyllabusModal.addEventListener('click', closeSyllabusModalFn);
if (cancelSyllabusBtn) cancelSyllabusBtn.addEventListener('click', closeSyllabusModalFn);

syllabusForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = syllabusTextarea.value.trim();
  if (!text) return;

  syllabusAuditError.classList.add('hidden');
  runSyllabusAuditBtn.disabled = true;
  syllabusSpinner.classList.remove('hidden');
  syllabusBtnText.textContent = 'Auditing with AI...';

  try {
    const res = await fetch(`${API_BASE}/api/subjects/${subjectId}/syllabus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syllabus_text: text }),
    });

    const analysis = await res.json();
    if (!res.ok) {
      throw new Error(analysis.detail || 'Syllabus analysis failed.');
    }

    showToast(`Syllabus audited: ${analysis.coverage_percent}% covered.`, 'success');
    closeSyllabusModalFn();
    renderSyllabusAnalysis(analysis);
    switchTab('syllabus');
    await fetchTopics();
  } catch (err) {
    syllabusAuditError.textContent = err.message;
    syllabusAuditError.classList.remove('hidden');
  } finally {
    runSyllabusAuditBtn.disabled = false;
    syllabusSpinner.classList.add('hidden');
    syllabusBtnText.textContent = 'Analyze Coverage';
  }
});

function renderSyllabusAnalysis(analysis) {
  const pct = Math.round(analysis.completion_percentage !== undefined ? analysis.completion_percentage : (analysis.coverage_percent || 0));
  const completed = analysis.completed_count !== undefined ? analysis.completed_count : (analysis.covered_count || 0);
  const total = analysis.total_topics || 0;

  syllabusCoveragePct.textContent = `${pct}% Covered`;
  syllabusProgressBar.style.width = `${pct}%`;
  syllabusStatusText.textContent = `${completed} of ${total} topics covered in uploaded files`;

  if (!syllabusAuditResults) return;

  const items = analysis.topics || [];
  const coveredItems = items.filter(t => t.status === 'covered' || t.status === 'completed');
  const missingItems = items.filter(t => t.status !== 'covered' && t.status !== 'completed');

  syllabusAuditResults.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div class="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
        <span class="text-2xs font-bold text-purple-700 uppercase">Coverage</span>
        <h4 class="text-xl font-bold text-slate-900 mt-0.5">${pct}%</h4>
      </div>
      <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
        <span class="text-2xs font-bold text-emerald-700 uppercase">Covered Topics</span>
        <h4 class="text-xl font-bold text-emerald-900 mt-0.5">${coveredItems.length}</h4>
      </div>
      <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
        <span class="text-2xs font-bold text-rose-700 uppercase">Missing / Gaps</span>
        <h4 class="text-xl font-bold text-rose-900 mt-0.5">${missingItems.length}</h4>
      </div>
    </div>

    <div class="space-y-3">
      <h5 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Curriculum Audit Details</h5>
      ${items.map(item => {
        const title = item.topic_name || item.topic || 'Curriculum Topic';
        const isCovered = item.status === 'covered' || item.status === 'completed';
        const notes = item.coverage_notes || item.notes || (isCovered ? 'Adequately addressed in uploaded lecture slides.' : 'Concept not detected in current class materials.');
        const badge = isCovered
          ? '<span class="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Covered</span>'
          : '<span class="text-2xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Missing in Uploads</span>';
        
        return `
          <div class="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-xs text-slate-900">${escapeHtml(title)}</span>
                ${badge}
              </div>
              <p class="text-2xs text-slate-500 mt-1">${escapeHtml(notes)}</p>
            </div>
            ${!isCovered ? `
              <button 
                onclick="promptMissingTopic('${escapeHtml(title)}')" 
                class="px-2.5 py-1 text-2xs font-semibold rounded btn-purple-outline shrink-0 cursor-pointer"
              >
                Study Topic
              </button>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.promptMissingTopic = function(topicName) {
  showToast(`Tip: Upload a slide deck covering "${topicName}" or use AI Assistant on Dashboard!`, 'info');
};

// 12. Delete Material Modal
window.openDeleteMaterialModal = function(matId) {
  const mat = materialsList.find((m) => m.id === matId);
  if (!mat) return;

  materialToDeleteId = mat.id;
  deleteMaterialName.textContent = mat.original_filename;
  deleteMaterialError.classList.add('hidden');
  deleteMaterialModal.classList.remove('hidden');
};

cancelDeleteMatBtn.addEventListener('click', () => {
  deleteMaterialModal.classList.add('hidden');
  materialToDeleteId = null;
});

confirmDeleteMatBtn.addEventListener('click', async () => {
  if (!materialToDeleteId) return;

  confirmDeleteMatBtn.disabled = true;
  confirmDeleteMatSpinner.classList.remove('hidden');
  deleteMaterialError.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/materials/${materialToDeleteId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Could not delete material.');
    }

    showToast('Class material removed successfully.', 'success');
    deleteMaterialModal.classList.add('hidden');

    const wasActive = activeMaterial && activeMaterial.id === materialToDeleteId;
    materialToDeleteId = null;

    if (wasActive) {
      activeMaterial = null;
      currentStudyPack = null;
    }

    await fetchMaterials();
    await fetchTopics();
  } catch (err) {
    deleteMaterialError.textContent = err.message;
    deleteMaterialError.classList.remove('hidden');
  } finally {
    confirmDeleteMatBtn.disabled = false;
    confirmDeleteMatSpinner.classList.add('hidden');
  }
});

// Refresh button
refreshMaterialsBtn.addEventListener('click', async () => {
  showToast('Refreshing workspace materials and topics...', 'info');
  await Promise.all([
    fetchMaterials(),
    fetchTopics(),
  ]);
});

// Initialize on page load and back/forward cache navigation
document.addEventListener('DOMContentLoaded', () => {
  prehydrateWorkspace();
  initWorkspace();
});

window.addEventListener('pageshow', (event) => {
  prehydrateWorkspace();
  // If navigating back or forward, re-sync workspace without wiping active notes
  if (event.persisted || !currentStudyPack) {
    initWorkspace();
  }
});

window.addEventListener('popstate', () => {
  prehydrateWorkspace();
  initWorkspace();
});


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
