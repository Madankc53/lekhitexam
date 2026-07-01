/* Likhit Exam Nepal — Quiz Engine
   Vanilla JS, no dependencies. Reads question bank from TESTS (questions.js). */

(function () {
  "use strict";

  const TIME_LIMIT_SECONDS = 30 * 60; // 30 min per mock test, same as real exam pacing
  const PASS_PERCENT = 60; // matches official pass criteria (15/25); scaled for 30-Q tests

  let state = {
    category: "B",
    currentTest: null,
    questions: [],
    current: 0,
    answers: [],      // selected option index per question, null if unanswered
    timeLeft: TIME_LIMIT_SECONDS,
    timerId: null,
    finished: false,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------- Category selection ---------------- */
  function initCategorySelect() {
    $$(".category-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".category-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.category = chip.dataset.cat;
      });
    });
  }

  /* ---------------- Test grid render ---------------- */
  function renderTestGrid() {
    const grid = $("#testGrid");
    if (!grid) return;
    grid.innerHTML = "";
    TESTS.forEach((t, i) => {
      const card = document.createElement("div");
      card.className = "test-card";
      card.innerHTML = `
        <span class="num">${i + 1}</span>
        <h3>${t.title}</h3>
        <p>${t.questions.length} questions · full mock exam covering this section in depth.</p>
        <div class="meta"><span>⏱ 30 min</span><span>📝 ${t.questions.length} Qs</span><span>🎯 Pass 60%</span></div>
        <button class="btn btn-primary btn-block" data-testid="${t.id}">Start ${t.title.split("—")[0].trim()}</button>
      `;
      grid.appendChild(card);
      card.querySelector("button").addEventListener("click", () => startTest(t.id));
    });
    // Placeholder cards for tests 4-6 (coming soon), keeps structure ready
    const soonTitles = ["Test 4 — Advanced Mixed Practice", "Test 5 — Full Length Mock A", "Test 6 — Full Length Mock B"];
    soonTitles.forEach((title, i) => {
      const card = document.createElement("div");
      card.className = "test-card locked";
      card.innerHTML = `
        <span class="num">${TESTS.length + i + 1}</span>
        <h3>${title}</h3>
        <p>30 questions · being added to the question bank.</p>
        <span class="badge-soon">Coming soon</span>
      `;
      grid.appendChild(card);
    });
  }

  /* ---------------- Start / run test ---------------- */
  function startTest(testId) {
    const test = TESTS.find((t) => t.id === testId);
    if (!test) return;
    state.currentTest = test;
    state.questions = shuffle(test.questions).map((q) => ({
      ...q,
      options: q.options // keep option order stable (matches answer index) for reliability
    }));
    state.current = 0;
    state.answers = new Array(state.questions.length).fill(null);
    state.timeLeft = TIME_LIMIT_SECONDS;
    state.finished = false;

    showScreen("quizScreen");
    $("#quizTestTitle").textContent = test.title;
    renderQuestion();
    startTimer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startTimer() {
    clearInterval(state.timerId);
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      state.timeLeft--;
      updateTimerDisplay();
      if (state.timeLeft <= 0) {
        clearInterval(state.timerId);
        finishTest();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
    const s = (state.timeLeft % 60).toString().padStart(2, "0");
    const el = $("#timerDisplay");
    if (!el) return;
    el.textContent = `${m}:${s}`;
    el.classList.toggle("warn", state.timeLeft <= 60);
  }

  function renderQuestion() {
    const q = state.questions[state.current];
    const total = state.questions.length;
    $("#qCount").textContent = `Question ${state.current + 1} of ${total}`;
    $("#qText").textContent = q.q;
    $("#progressFill").style.width = `${((state.current) / total) * 100}%`;

    const optWrap = $("#optionsWrap");
    optWrap.innerHTML = "";
    const letters = ["A", "B", "C", "D"];
    q.options.forEach((opt, idx) => {
      const div = document.createElement("div");
      div.className = "opt" + (state.answers[state.current] === idx ? " selected" : "");
      div.innerHTML = `<span class="letter">${letters[idx]}</span><span>${opt}</span>`;
      div.addEventListener("click", () => {
        state.answers[state.current] = idx;
        renderQuestion();
      });
      optWrap.appendChild(div);
    });

    $("#prevBtn").disabled = state.current === 0;
    $("#nextBtn").textContent = state.current === total - 1 ? "Submit Test" : "Next →";
  }

  function initQuizNav() {
    $("#prevBtn").addEventListener("click", () => {
      if (state.current > 0) { state.current--; renderQuestion(); }
    });
    $("#nextBtn").addEventListener("click", () => {
      const total = state.questions.length;
      if (state.current < total - 1) {
        state.current++;
        renderQuestion();
      } else {
        finishTest();
      }
    });
    $("#exitQuizBtn").addEventListener("click", () => {
      if (confirm("Exit this test? Your progress will be lost.")) {
        clearInterval(state.timerId);
        showScreen("home");
      }
    });
  }

  /* ---------------- Finish / score ---------------- */
  function finishTest() {
    clearInterval(state.timerId);
    state.finished = true;
    const total = state.questions.length;
    let correct = 0;
    state.answers.forEach((a, i) => { if (a === state.questions[i].answer) correct++; });
    const percent = Math.round((correct / total) * 100);
    const passed = percent >= PASS_PERCENT;

    saveScore(state.currentTest.title, correct, total, percent, passed);

    showScreen("resultScreen");
    const ring = $("#scoreRing");
    ring.className = "score-ring " + (passed ? "pass" : "fail");
    $("#scoreNum").textContent = `${correct}/${total}`;
    $("#scorePercent").textContent = `${percent}%`;
    const tag = $("#passTag");
    tag.className = "pass-tag " + (passed ? "pass" : "fail");
    tag.textContent = passed ? "✔ PASSED" : "✘ NOT PASSED — Keep Practicing";

    renderRecentScores();
  }

  function saveScore(title, correct, total, percent, passed) {
    try {
      const key = "likhit_scores";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ title, correct, total, percent, passed, date: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 10)));
    } catch (e) { /* localStorage unavailable — skip silently */ }
  }

  function renderRecentScores() {
    const wrap = $("#recentScores");
    if (!wrap) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem("likhit_scores") || "[]"); } catch (e) {}
    if (!list.length) { wrap.innerHTML = "<p style='color:var(--ink-soft);font-size:.85rem'>No previous attempts yet.</p>"; return; }
    wrap.innerHTML = list.slice(0, 5).map(s => `
      <div class="review-item" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${s.title}</strong><br>
          <span style="font-size:.8rem;color:var(--ink-soft)">${new Date(s.date).toLocaleDateString()}</span>
        </div>
        <span class="tag ${s.passed ? "correct" : "wrong"}">${s.correct}/${s.total} · ${s.percent}%</span>
      </div>
    `).join("");
  }

  /* ---------------- Review answers ---------------- */
  function renderReview() {
    const wrap = $("#reviewWrap");
    wrap.innerHTML = "";
    state.questions.forEach((q, i) => {
      const userAns = state.answers[i];
      const isCorrect = userAns === q.answer;
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <span class="tag ${isCorrect ? "correct" : "wrong"}">${isCorrect ? "Correct" : "Wrong"}</span>
        <strong>Q${i + 1}. ${q.q}</strong>
        <div class="explain-box">
          Your answer: <b>${userAns !== null ? q.options[userAns] : "Not answered"}</b><br>
          Correct answer: <b>${q.options[q.answer]}</b><br>
          ${q.explain}
        </div>
      `;
      wrap.appendChild(div);
    });
  }

  /* ---------------- Screen switching ---------------- */
  function showScreen(id) {
    ["home", "quizScreen", "resultScreen", "reviewScreen"].forEach((s) => {
      const el = $("#" + s);
      if (el) el.classList.toggle("hide", s !== id);
    });
    const sticky = $("#stickyCta");
    if (sticky) sticky.classList.toggle("hide", id !== "home");
  }

  /* ---------------- FAQ accordion ---------------- */
  function initFaq() {
    $$(".faq-q").forEach((q) => {
      q.addEventListener("click", () => {
        q.parentElement.classList.toggle("open");
      });
    });
  }

  /* ---------------- Dark mode ---------------- */
  function initDarkMode() {
    const btn = $("#darkModeBtn");
    if (!btn) return;
    try {
      if (localStorage.getItem("likhit_dark") === "1") document.body.classList.add("dark");
    } catch (e) {}
    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      try { localStorage.setItem("likhit_dark", document.body.classList.contains("dark") ? "1" : "0"); } catch (e) {}
    });
  }

  /* ---------------- Result screen buttons ---------------- */
  function initResultButtons() {
    $("#retryBtn").addEventListener("click", () => startTest(state.currentTest.id));
    $("#reviewBtn").addEventListener("click", () => { renderReview(); showScreen("reviewScreen"); });
    $("#backHomeBtn").addEventListener("click", () => showScreen("home"));
    $("#reviewBackBtn").addEventListener("click", () => showScreen("resultScreen"));
    $("#shareBtn").addEventListener("click", async () => {
      const text = `I scored ${$("#scoreNum").textContent} on the ${state.currentTest.title} mock test on Likhit Exam Nepal!`;
      if (navigator.share) {
        try { await navigator.share({ title: "Likhit Exam Nepal", text, url: location.href }); } catch (e) {}
      } else {
        try { await navigator.clipboard.writeText(text + " " + location.href); alert("Copied to clipboard!"); } catch (e) { alert(text); }
      }
    });
  }

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initCategorySelect();
    renderTestGrid();
    initQuizNav();
    initResultButtons();
    initFaq();
    initDarkMode();
    showScreen("home");

    $$(".start-test-cta").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelector("#practice").scrollIntoView({ behavior: "smooth" });
      });
    });
  });
})();
