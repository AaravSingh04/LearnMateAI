/**
 * StudyAI LMS — Dedicated Quiz & Practice Hub JavaScript
 */

const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:8005' : '';

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
    setTimeout(() => toast.remove(), 4000);
  }, 4000);
}

// State
let subjectsList = [];
let materialsList = [];
let activeMaterial = null;
let currentStudyPack = null;
let currentQuizResults = [];

// DOM Elements
const subjectSelect = document.getElementById('quiz-subject-select');
const materialSelect = document.getElementById('quiz-material-select');
const quizEmptyState = document.getElementById('quiz-empty-state');
const quizForm = document.getElementById('quiz-form');
const quizQuestionsContainer = document.getElementById('quiz-questions-container');
const submitQuizBtn = document.getElementById('submit-quiz-btn');
const quizSubmitSpinner = document.getElementById('quiz-submit-spinner');
const quizSubmitText = document.getElementById('quiz-submit-text');
const quizError = document.getElementById('quiz-error');

// Summary & Filter Elements
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

// History Elements
const quizHistorySection = document.getElementById('quiz-history-section');
const historyContainer = document.getElementById('history-container');

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

// AI Assistant Elements
const aiModal = document.getElementById('ai-assistant-modal');
const openAssistantNavBtn = document.getElementById('open-assistant-nav-btn');
const closeAssistantBtn = document.getElementById('close-assistant-btn');
const assistantMessages = document.getElementById('assistant-chat-messages');
const assistantInput = document.getElementById('assistant-text-input');
const assistantSendBtn = document.getElementById('assistant-send-btn');
const assistantMicBtn = document.getElementById('assistant-mic-btn');

// Initialize
async function initQuizHub() {
  await fetchSubjects();

  // Handle URL deep-link (e.g. ?subject_id=3&material_id=4)
  const urlParams = new URLSearchParams(window.location.search);
  const targetSubId = urlParams.get('subject_id');
  const targetMatId = urlParams.get('material_id');

  if (targetSubId) {
    subjectSelect.value = targetSubId;
    await handleSubjectChange(targetSubId);
    if (targetMatId) {
      materialSelect.value = targetMatId;
      await loadMaterialQuiz(targetMatId);
    }
  }
}

// 1. Fetch Subjects
async function fetchSubjects() {
  try {
    const res = await fetch(`${API_BASE}/api/subjects`);
    if (!res.ok) throw new Error('Could not load subjects.');
    subjectsList = await res.json();

    subjectSelect.innerHTML = '<option value="">-- Choose Course --</option>';
    subjectsList.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.materials_count || 0} decks)`;
      subjectSelect.appendChild(opt);
    });

    if (subjectsList.length > 0) {
      subjectSelect.value = subjectsList[0].id;
      await handleSubjectChange(subjectsList[0].id);
    }
  } catch (err) {
    console.error(err);
  }
}

// 2. Handle Subject Change
async function handleSubjectChange(subId) {
  if (!subId) {
    materialSelect.innerHTML = '<option value="">Select deck...</option>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/subjects/${subId}/materials`);
    if (!res.ok) throw new Error('Could not load materials.');
    materialsList = await res.json();

    materialSelect.innerHTML = '<option value="">-- Choose Lecture Deck --</option>';
    materialsList.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.original_filename} (${m.file_type.toUpperCase()})`;
      materialSelect.appendChild(opt);
    });

    if (materialsList.length > 0) {
      materialSelect.value = materialsList[0].id;
      await loadMaterialQuiz(materialsList[0].id);
    } else {
      quizEmptyState.classList.remove('hidden');
      quizForm.classList.add('hidden');
      quizSummaryCard.classList.add('hidden');
      quizHistorySection.classList.add('hidden');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

subjectSelect.addEventListener('change', (e) => {
  handleSubjectChange(e.target.value);
});

materialSelect.addEventListener('change', (e) => {
  if (e.target.value) {
    loadMaterialQuiz(e.target.value);
  }
});

// 3. Load Quiz for selected Material
async function loadMaterialQuiz(matId) {
  activeMaterial = materialsList.find(m => m.id === parseInt(matId, 10)) || { id: matId };
  quizError.classList.add('hidden');
  quizSummaryCard.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/materials/${matId}/study-pack`);
    if (res.status === 404) {
      quizEmptyState.innerHTML = `
        <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h3 class="text-base font-bold text-white">Study Pack Not Generated Yet</h3>
        <p class="text-xs text-[#A5B4FC] max-w-sm mx-auto mt-1 mb-4">Click below to generate interactive quiz questions from this presentation deck.</p>
        <a href="subject.html?subject_id=${subjectSelect.value}" class="btn-purple-glow px-4 py-2 text-xs font-semibold inline-block">
          Open Subject Workspace
        </a>
      `;
      quizEmptyState.classList.remove('hidden');
      quizForm.classList.add('hidden');
      quizHistorySection.classList.add('hidden');
      return;
    }

    if (!res.ok) throw new Error('Could not retrieve questions.');
    currentStudyPack = await res.json();

    renderQuestions(currentStudyPack.questions);
    fetchQuizHistory(matId);

    quizEmptyState.classList.add('hidden');
    quizForm.classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 4. Render Questions
function renderQuestions(questions) {
  quizQuestionsContainer.innerHTML = '';
  submitQuizBtn.disabled = false;
  submitQuizBtn.classList.remove('hidden');

  if (!questions || questions.length === 0) {
    quizQuestionsContainer.innerHTML = `
      <div class="p-8 text-center rounded-xl bg-[#151748]/50 border border-purple-500/20 text-xs text-[#A5B4FC]">
        No questions generated for this file.
      </div>
    `;
    submitQuizBtn.classList.add('hidden');
    return;
  }

  questions.forEach((q, idx) => {
    const block = document.createElement('div');
    block.className = 'dark-card p-5 border border-purple-500/20 bg-[#151748]/90 space-y-3.5 transition';
    block.id = `q-block-${q.id}`;
    block.dataset.questionId = q.id;

    const optionsHtml = q.options.map((opt, optIdx) => {
      const letters = ['A', 'B', 'C', 'D'];
      return `
        <label 
          class="quiz-option-label !bg-[#080B2F] !border-purple-500/20 text-[#F5F3FF] hover:!border-purple-400 hover:!bg-[#27205F]/60"
          id="label_q_${q.id}_opt_${optIdx}"
        >
          <input type="radio" name="question_${q.id}" value="${optIdx}" class="w-4 h-4 text-purple-600 focus:ring-purple-500 shrink-0" required>
          <span class="w-6 h-6 rounded-md bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
            ${letters[optIdx] || optIdx + 1}
          </span>
          <span class="text-xs text-[#DDD6FE] leading-relaxed">${escapeHtml(opt)}</span>
          <span class="option-tag hidden"></span>
        </label>
      `;
    }).join('');

    block.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-3xs font-bold px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30 uppercase">
          Question ${idx + 1}
        </span>
        <div id="q_status_${q.id}"></div>
      </div>
      <p class="text-sm font-semibold text-white leading-relaxed">${escapeHtml(q.question_text)}</p>
      <div class="space-y-2 pt-1">
        ${optionsHtml}
      </div>
      <div id="explanation_${q.id}" class="hidden"></div>
    `;

    quizQuestionsContainer.appendChild(block);
  });
}

// 5. Submit Quiz for Evaluation
quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeMaterial || !currentStudyPack) return;

  quizError.classList.add('hidden');
  const answers = [];

  for (const q of currentStudyPack.questions) {
    const selectedInput = document.querySelector(`input[name="question_${q.id}"]:checked`);
    if (!selectedInput) {
      quizError.textContent = 'Please answer all questions before submitting for evaluation.';
      quizError.classList.remove('hidden');
      return;
    }
    answers.push({
      question_id: q.id,
      selected_option_index: parseInt(selectedInput.value, 10),
    });
  }

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
    if (!res.ok) throw new Error(attempt.detail || 'Evaluation failed.');

    currentQuizResults = attempt.results;
    showToast(`Quiz completed: ${attempt.score} / ${attempt.total_questions} (${attempt.percentage}%)`, 'success');

    // Display Summary Card
    quizSummaryCard.classList.remove('hidden');
    const rounded = Math.round(attempt.percentage);
    quizScoreCircle.textContent = `${rounded}%`;
    quizScoreCircle.className = `w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-base shadow-lg shrink-0 ${
      rounded >= 80 ? 'bg-emerald-600 text-white' : rounded >= 60 ? 'bg-purple-600 text-white' : 'bg-rose-600 text-white'
    }`;

    if (rounded >= 80) {
      quizGradePill.textContent = 'Mastery Achieved';
      quizGradePill.className = 'text-3xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase';
      quizPerformanceTitle.textContent = `Outstanding! ${attempt.score} of ${attempt.total_questions} Correct`;
    } else if (rounded >= 60) {
      quizGradePill.textContent = 'Proficient';
      quizGradePill.className = 'text-3xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase';
      quizPerformanceTitle.textContent = `Good Effort! ${attempt.score} of ${attempt.total_questions} Correct`;
    } else {
      quizGradePill.textContent = 'Revision Recommended';
      quizGradePill.className = 'text-3xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase';
      quizPerformanceTitle.textContent = `Revision Needed: ${attempt.score} of ${attempt.total_questions} Correct`;
    }

    const wrongCount = attempt.results.filter(r => !r.is_correct).length;
    const correctCount = attempt.results.filter(r => r.is_correct).length;
    countAllQ.textContent = attempt.total_questions;
    countWrongQ.textContent = wrongCount;
    countCorrectQ.textContent = correctCount;

    // Apply Explanations to Questions
    attempt.results.forEach((resItem) => {
      const qBlock = document.getElementById(`q-block-${resItem.question_id}`);
      const explDiv = document.getElementById(`explanation_${resItem.question_id}`);
      const qStatus = document.getElementById(`q_status_${resItem.question_id}`);

      if (qBlock) qBlock.dataset.isCorrect = resItem.is_correct ? 'true' : 'false';

      if (qStatus) {
        qStatus.innerHTML = resItem.is_correct
          ? '<span class="badge-choice-correct">✓ Correct</span>'
          : '<span class="badge-choice-incorrect">✗ Incorrect</span>';
      }

      // Disable inputs
      if (qBlock) {
        qBlock.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
      }

      // Highlight options
      const selectedLabel = document.getElementById(`label_q_${resItem.question_id}_opt_${resItem.selected_option_index}`);
      const correctLabel = document.getElementById(`label_q_${resItem.question_id}_opt_${resItem.correct_option_index}`);
      const letters = ['A', 'B', 'C', 'D'];

      if (resItem.is_correct) {
        if (selectedLabel) {
          selectedLabel.classList.add('!border-emerald-500', '!bg-emerald-950/40');
        }
      } else {
        if (selectedLabel) {
          selectedLabel.classList.add('!border-rose-500', '!bg-rose-950/40');
        }
        if (correctLabel) {
          correctLabel.classList.add('!border-emerald-500', '!bg-emerald-950/40');
        }
      }

      // 3-Part In-Depth Pedagogical Breakdown
      if (explDiv) {
        explDiv.className = resItem.is_correct
          ? 'p-4 rounded-xl text-xs leading-relaxed mt-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-100'
          : 'p-4 rounded-xl text-xs leading-relaxed mt-3 bg-rose-950/40 border border-rose-500/40 text-rose-100';

        const optUser = letters[resItem.selected_option_index] || '?';
        const optCorr = letters[resItem.correct_option_index] || '?';

        explDiv.innerHTML = `
          <div class="flex items-center space-x-2 font-bold text-xs mb-2">
            <span>${resItem.is_correct ? `✓ Accurate Choice (${optUser})` : `✗ Incorrect Selection (${optUser}) • Correct is (${optCorr})`}</span>
          </div>
          <div class="pt-2 border-t border-white/10 space-y-2">
            <span class="text-3xs font-bold uppercase tracking-wider text-purple-300 block">
              Pedagogical Explanation & Theory:
            </span>
            <div class="text-xs text-[#DDD6FE] leading-relaxed whitespace-pre-line bg-[#080B2F]/80 p-3 rounded-lg border border-purple-500/20">
              ${escapeHtml(resItem.explanation)}
            </div>
          </div>
        `;
        explDiv.classList.remove('hidden');
      }
    });

    submitQuizBtn.classList.add('hidden');
    quizSummaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// Filter Handlers
function filterQuestions(type) {
  const blocks = quizQuestionsContainer.querySelectorAll('[data-question-id]');
  blocks.forEach(b => {
    const isCorr = b.dataset.isCorrect === 'true';
    if (type === 'all') b.style.display = 'block';
    else if (type === 'wrong') b.style.display = isCorr ? 'none' : 'block';
    else if (type === 'correct') b.style.display = isCorr ? 'block' : 'none';
  });

  filterAllBtn.className = `px-2.5 py-1 rounded-md font-semibold text-xs transition ${type === 'all' ? 'bg-purple-600 text-white' : 'bg-[#151748] border border-purple-500/30 text-[#C4B5FD]'}`;
  filterWrongBtn.className = `px-2.5 py-1 rounded-md font-semibold text-xs transition ${type === 'wrong' ? 'bg-rose-600 text-white' : 'bg-[#151748] border border-purple-500/30 text-rose-300'}`;
  filterCorrectBtn.className = `px-2.5 py-1 rounded-md font-semibold text-xs transition ${type === 'correct' ? 'bg-emerald-600 text-white' : 'bg-[#151748] border border-purple-500/30 text-emerald-300'}`;
}

filterAllBtn.addEventListener('click', () => filterQuestions('all'));
filterWrongBtn.addEventListener('click', () => filterQuestions('wrong'));
filterCorrectBtn.addEventListener('click', () => filterQuestions('correct'));

retakeQuizBtn.addEventListener('click', () => {
  if (currentStudyPack) {
    renderQuestions(currentStudyPack.questions);
    quizSummaryCard.classList.add('hidden');
    quizQuestionsContainer.scrollIntoView({ behavior: 'smooth' });
  }
});

// 6. Fetch Past Attempts History
async function fetchQuizHistory(matId) {
  try {
    const res = await fetch(`${API_BASE}/api/materials/${matId}/quiz-attempts`);
    if (!res.ok) return;
    const history = await res.json();
    renderQuizHistory(history);
  } catch (err) {
    console.error(err);
  }
}

function renderQuizHistory(attempts) {
  historyContainer.innerHTML = '';
  if (!attempts || attempts.length === 0) {
    quizHistorySection.classList.add('hidden');
    return;
  }

  quizHistorySection.classList.remove('hidden');
  attempts.forEach((att, idx) => {
    const attemptNumber = attempts.length - idx;
    const row = document.createElement('div');
    row.className = 'p-3.5 rounded-xl bg-[#080B2F] border border-purple-500/20 hover:border-purple-400 hover:bg-[#151748]/80 cursor-pointer transition flex items-center justify-between text-xs group';
    
    const isPassing = att.percentage >= 60;
    const badgeColor = isPassing ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

    row.innerHTML = `
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${isPassing ? 'bg-emerald-600/30 text-emerald-300' : 'bg-rose-600/30 text-rose-300'} border border-white/10 shrink-0">
          #${attemptNumber}
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-bold text-white group-hover:text-purple-300 transition">Attempt #${attemptNumber}</span>
            <span class="text-3xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor}">
              ${att.percentage}% Score
            </span>
          </div>
          <p class="text-3xs text-[#818CF8] mt-0.5">${formatDate(att.attempted_at || att.created_at)}</p>
        </div>
      </div>
      <div class="flex items-center space-x-3 text-right">
        <div>
          <span class="font-bold text-white">${att.score} / ${att.total_questions}</span>
          <span class="text-3xs text-[#A5B4FC] block">correct responses</span>
        </div>
        <div class="hidden sm:inline-flex items-center text-3xs font-semibold text-purple-300 group-hover:text-white px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 group-hover:bg-purple-600 transition">
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

// Attempt Review Modal Logic
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
    modalGradePill.className = `text-3xs font-bold px-2 py-0.5 rounded-full ${isPassing ? 'bg-emerald-600' : 'bg-rose-600'} text-white uppercase`;
  }
  
  if (modalReviewSubtitle) {
    const deckInfo = attempt.material_title || (activeMaterial ? activeMaterial.title : '');
    modalReviewSubtitle.textContent = `Attempted on ${formatDate(attempt.attempted_at || attempt.created_at)}${deckInfo ? ' • ' + deckInfo : ''}`;
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
  const inactiveWrongClass = 'bg-[#151748] text-rose-300 border border-purple-500/30 hover:border-rose-400';
  const inactiveCorrectClass = 'bg-[#151748] text-emerald-300 border border-purple-500/30 hover:border-emerald-400';
  const inactiveAllClass = 'bg-[#151748] text-purple-200 border border-purple-500/30 hover:border-purple-400';

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
      <div class="text-center py-8 text-xs text-[#818CF8]">
        No questions match the "${currentModalFilter}" filter.
      </div>
    `;
    return;
  }

  filtered.forEach((resItem) => {
    const card = document.createElement('div');
    card.className = `p-4 rounded-xl border ${resItem.is_correct ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20'} space-y-3`;

    // Options rendering
    const optionsHtml = (resItem.options || []).map((optText, optIdx) => {
      const isSelected = (optIdx === resItem.selected_option_index);
      const isCorrectOpt = (optIdx === resItem.correct_option_index);

      let optBorderBg = 'border-purple-500/20 bg-[#080B2F]/60 text-slate-300';
      let optTag = '';

      if (isCorrectOpt) {
        optBorderBg = 'border-emerald-500 bg-emerald-950/60 text-emerald-100 font-semibold ring-1 ring-emerald-500/50';
        optTag = '<span class="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white ml-2">✓ Correct Answer</span>';
      }
      if (isSelected && !resItem.is_correct) {
        optBorderBg = 'border-rose-500 bg-rose-950/60 text-rose-100 font-semibold ring-1 ring-rose-500/50';
        optTag = '<span class="text-3xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white ml-2">✗ Your Selection</span>';
      } else if (isSelected && resItem.is_correct) {
        optTag = '<span class="text-3xs font-bold px-2 py-0.5 rounded bg-emerald-600 text-white ml-2">✓ Your Selection (Correct)</span>';
      }

      return `
        <div class="p-2.5 rounded-lg border text-xs flex items-center justify-between ${optBorderBg}">
          <div class="flex items-center space-x-2.5">
            <span class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-3xs ${isCorrectOpt ? 'bg-emerald-600 text-white' : (isSelected ? 'bg-rose-600 text-white' : 'bg-purple-900/40 text-purple-300')} shrink-0">
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
          <span class="text-xs font-bold text-[#DDD6FE]">Question ${currentModalAttemptResults.indexOf(resItem) + 1} of ${currentModalAttemptResults.length}</span>
          <span class="text-3xs font-bold px-2 py-0.5 rounded-full ${resItem.is_correct ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}">
            ${resItem.is_correct ? '✓ Correct' : '✗ Incorrect'}
          </span>
        </div>
        <span class="text-3xs text-[#A5B4FC]">
          Your Answer: <strong>Option ${letters[resItem.selected_option_index] || 'None'}</strong> • Correct: <strong>Option ${letters[resItem.correct_option_index] || '?'}</strong>
        </span>
      </div>

      <p class="text-xs font-medium text-white leading-relaxed">
        ${escapeHtml(resItem.question_text)}
      </p>

      <div class="space-y-1.5 pt-1">
        ${optionsHtml}
      </div>

      <!-- Pedagogical Explanation Block -->
      <div class="p-3.5 rounded-xl ${resItem.is_correct ? 'bg-emerald-950/40 border border-emerald-500/30' : 'bg-rose-950/40 border border-rose-500/30'} text-xs leading-relaxed space-y-1.5 mt-2">
        <span class="text-3xs font-bold uppercase tracking-wider ${resItem.is_correct ? 'text-emerald-300' : 'text-rose-300'} block">
          Pedagogical Explanation & Concept Takeaway:
        </span>
        <div class="text-xs text-[#DDD6FE] whitespace-pre-line bg-[#080B2F]/80 p-3 rounded-lg border border-purple-500/20">
          ${escapeHtml(resItem.explanation)}
        </div>
      </div>
    `;

    modalQuestionsList.appendChild(card);
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

document.addEventListener('DOMContentLoaded', initQuizHub);
