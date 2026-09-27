const CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbxIGXgO2hOL40rfsZTXB76_XK_n86P6UymXv7jYZMFNAF0JCvaGKb-e3bpl7MO6JQ2u/exec",
  questionsPerModule: 27,
  moduleSeconds: 32 * 60,
};

const modules = [
  {
    id: "module1",
    label: "Module 1",
    title: "Reading and Writing",
    imagePath: "./assets/questions/module1/q",
  },
  {
    id: "module2",
    label: "Module 2 - Harder",
    title: "Reading and Writing",
    imagePath: "./assets/questions/module2/q",
  },
];

const ANSWER_KEY = {
  module1: [
    "D", "B", "B", "A", "D", "A", "A", "A", "A",
    "B", "A", "B", "D", "A", "C", "C", "D", "A",
    "A", "B", "B", "C", "D", "D", "C", "D", "C",
  ],
  module2: [
    "C", "B", "C", "D", "A", "C", "A", "D", "A",
    "B", "B", "A", "A", "A", "C", "A", "C", "B",
    "A", "A", "D", "D", "A", "C", "D", "D", "B",
  ],
};

const state = {
  studentName: "",
  studentId: "",
  moduleIndex: 0,
  questionIndex: 0,
  secondsLeft: CONFIG.moduleSeconds,
  timerId: null,
  timerExpired: false,
  submissionStarted: false,
  answers: {
    module1: Array(CONFIG.questionsPerModule).fill(""),
    module2: Array(CONFIG.questionsPerModule).fill(""),
  },
  startedAt: "",
};

const els = {
  startScreen: document.getElementById("startScreen"),
  testScreen: document.getElementById("testScreen"),
  doneScreen: document.getElementById("doneScreen"),
  studentForm: document.getElementById("studentForm"),
  studentName: document.getElementById("studentName"),
  studentId: document.getElementById("studentId"),
  moduleLabel: document.getElementById("moduleLabel"),
  moduleTitle: document.getElementById("moduleTitle"),
  timerText: document.getElementById("timerText"),
  questionCounter: document.getElementById("questionCounter"),
  questionImage: document.getElementById("questionImage"),
  answerButtons: document.getElementById("answerButtons"),
  questionGrid: document.getElementById("questionGrid"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  moduleActionBtn: document.getElementById("moduleActionBtn"),
  submissionMessage: document.getElementById("submissionMessage"),
  scoreSummary: document.getElementById("scoreSummary"),
  satEstimate: document.getElementById("satEstimate"),
  satEstimateRange: document.getElementById("satEstimateRange"),
  module1Score: document.getElementById("module1Score"),
  module2Score: document.getElementById("module2Score"),
  totalScore: document.getElementById("totalScore"),
};

function padQuestion(number) {
  return String(number).padStart(2, "0");
}

function currentModule() {
  return modules[state.moduleIndex];
}

function currentAnswers() {
  return state.answers[currentModule().id];
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderTimer() {
  els.timerText.textContent = formatTime(state.secondsLeft);
  els.timerText.classList.toggle("submit-warning", state.secondsLeft <= 300);
}

function startTimer() {
  if (state.timerExpired || state.submissionStarted) return;
  clearInterval(state.timerId);
  renderTimer();
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    if (state.secondsLeft <= 0) {
      state.secondsLeft = 0;
      clearInterval(state.timerId);
      state.timerId = null;
      state.timerExpired = true;
      renderTimer();
      handleModuleTimeExpired();
      return;
    }
    renderTimer();
  }, 1000);
}

function renderQuestion() {
  const module = currentModule();
  const questionNumber = state.questionIndex + 1;
  const answer = currentAnswers()[state.questionIndex];

  els.moduleLabel.textContent = module.label;
  els.moduleTitle.textContent = module.title;
  els.questionCounter.textContent = `Question ${questionNumber} of ${CONFIG.questionsPerModule}`;
  els.questionImage.src = `${module.imagePath}${padQuestion(questionNumber)}.png`;
  els.questionImage.alt = `${module.label}, question ${questionNumber}`;
  els.prevBtn.disabled = state.questionIndex === 0;
  els.nextBtn.disabled = state.questionIndex === CONFIG.questionsPerModule - 1;
  els.moduleActionBtn.textContent = state.moduleIndex === 0 ? "Finish Module 1" : "Submit Test";

  els.answerButtons.innerHTML = "";
  ["A", "B", "C", "D"].forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `choice-button${answer === choice ? " selected" : ""}`;
    button.textContent = choice;
    button.addEventListener("click", () => {
      currentAnswers()[state.questionIndex] = choice;
      renderQuestion();
    });
    els.answerButtons.appendChild(button);
  });

  renderQuestionGrid();
}

function renderQuestionGrid() {
  const answers = currentAnswers();
  els.questionGrid.innerHTML = "";
  answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "question-tile",
      answer ? "answered" : "",
      index === state.questionIndex ? "current" : "",
    ]
      .filter(Boolean)
      .join(" ");
    button.textContent = `Q ${index + 1}`;
    button.addEventListener("click", () => {
      state.questionIndex = index;
      renderQuestion();
    });
    els.questionGrid.appendChild(button);
  });
}

function unansweredCount(moduleId) {
  return state.answers[moduleId].filter((answer) => !answer).length;
}

function goToNextModule() {
  if (state.timerExpired || state.submissionStarted) return;
  state.moduleIndex = 1;
  state.questionIndex = 0;
  state.secondsLeft = CONFIG.moduleSeconds;
  renderQuestion();
  startTimer();
}

function handleModuleTimeExpired() {
  window.alert(
    "Time is up. Your answers recorded so far will now be submitted."
  );
  submitTest();
}

function handleModuleAction() {
  const module = currentModule();
  const missing = unansweredCount(module.id);

  if (state.moduleIndex === 0) {
    const message =
      missing > 0
        ? `You have ${missing} unanswered question(s) in Module 1. Continue to Module 2?`
        : "Finish Module 1 and continue to Module 2?";
    if (window.confirm(message)) {
      goToNextModule();
    }
    return;
  }

  const message =
    missing > 0
      ? `You have ${missing} unanswered question(s) in Module 2. Submit your test now?`
      : "Submit your test now?";
  if (window.confirm(message)) {
    submitTest();
  }
}

function buildPayload() {
  return {
    testName: "SAT Reading and Writing Practice Test 2 - Aug-Oct 2026 (Module 2 Harder)",
    studentName: state.studentName,
    studentId: state.studentId,
    startedAt: state.startedAt,
    submittedAt: new Date().toISOString(),
    answers: {
      module1: state.answers.module1,
      module2: state.answers.module2,
    },
  };
}

function scoreModule(studentAnswers, answerKey) {
  return answerKey.reduce(
    (score, correctAnswer, index) => score + (studentAnswers[index] === correctAnswer ? 1 : 0),
    0
  );
}

function estimateSatScore(totalCorrect) {
  const clampedTotal = Math.max(0, Math.min(CONFIG.questionsPerModule * 2, totalCorrect));
  return Math.round(200 + (clampedTotal / (CONFIG.questionsPerModule * 2)) * 600);
}

function estimateSatRange(score) {
  const low = Math.max(200, score - 40);
  const high = Math.min(800, score + 40);
  return `${low}-${high}`;
}

function calculateScoreSummary() {
  const module1Correct = scoreModule(state.answers.module1, ANSWER_KEY.module1);
  const module2Correct = scoreModule(state.answers.module2, ANSWER_KEY.module2);
  const totalCorrect = module1Correct + module2Correct;
  const satEstimate = estimateSatScore(totalCorrect);

  return {
    module1Correct,
    module2Correct,
    totalCorrect,
    satEstimate,
    satRange: estimateSatRange(satEstimate),
  };
}

function renderScoreSummary(summary) {
  els.scoreSummary.hidden = false;
  els.module1Score.textContent = `${summary.module1Correct}/${CONFIG.questionsPerModule}`;
  els.module2Score.textContent = `${summary.module2Correct}/${CONFIG.questionsPerModule}`;
  els.totalScore.textContent = `${summary.totalCorrect}/${CONFIG.questionsPerModule * 2}`;
  els.satEstimate.textContent = summary.satEstimate;
  els.satEstimateRange.textContent = `Estimated range: ${summary.satRange}`;
}

async function submitTest() {
  if (state.submissionStarted) return;
  state.submissionStarted = true;
  clearInterval(state.timerId);
  state.timerId = null;
  const payload = buildPayload();
  const scoreSummary = calculateScoreSummary();

  els.testScreen.hidden = true;
  els.doneScreen.hidden = false;
  renderScoreSummary(scoreSummary);

  if (!CONFIG.scriptUrl) {
    els.submissionMessage.textContent =
      "Submission is not connected yet. Add your Google Apps Script web app URL in app.js before sharing this test.";
    return;
  }

  try {
    await fetch(CONFIG.scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    els.submissionMessage.textContent =
      "Your answers were submitted. Your instructor will review your results.";
  } catch (error) {
    els.submissionMessage.textContent =
      "Your answers could not be submitted. Tell your instructor before closing this page.";
  }
}

els.studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.studentName = els.studentName.value.trim();
  state.studentId = els.studentId.value.trim();
  state.startedAt = new Date().toISOString();
  els.startScreen.hidden = true;
  els.testScreen.hidden = false;
  renderQuestion();
  startTimer();
});

els.prevBtn.addEventListener("click", () => {
  state.questionIndex = Math.max(0, state.questionIndex - 1);
  renderQuestion();
});

els.nextBtn.addEventListener("click", () => {
  state.questionIndex = Math.min(CONFIG.questionsPerModule - 1, state.questionIndex + 1);
  renderQuestion();
});

els.moduleActionBtn.addEventListener("click", handleModuleAction);

document.addEventListener("keydown", (event) => {
  if (els.testScreen.hidden) return;
  const key = event.key.toUpperCase();
  if (["A", "B", "C", "D"].includes(key)) {
    currentAnswers()[state.questionIndex] = key;
    renderQuestion();
  }
});
