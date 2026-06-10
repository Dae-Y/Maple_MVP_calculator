// js/cube-simulator/cubeSimulator.js
window.cubeSimulatorState = (function () {
  let rollCount = 0;
  let mesoUsed = 0;
  let meisterUsed = 0;

  return {
    getStats: () => ({ rollCount, mesoUsed, meisterUsed }),
    incrementStats: (cubeKind, count, cost) => {
      rollCount += count;
      if (cubeKind === "meister") {
        meisterUsed += count;
      } else {
        mesoUsed += cost * count;
      }
    },
    resetStats: () => {
      rollCount = 0;
      mesoUsed = 0;
      meisterUsed = 0;
    }
  };
})();

(function () {
  const CUBE_ID_BLACK = "5062010";   // 블랙 큐브
  const CUBE_ID_ADDI = "5062500";    // 에디셔널 큐브
  const CUBE_ID_MEISTER = "2711004"; // 명장의 큐브

  // Disabled because Azmos Canyon is no longer available in the current game.
  const SHOW_AZMOS_ESTIMATE = false;

  let currentLines = [];
  let rollCandidates = [[], [], []];
  let logEntries = [];
  let logVisible = false;

  let pendingAutoRollSuccessCandidate = null;
  let pendingAutoRollSuccessBatch = null;

  // 1. Initial Loader
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      await window.cubeData.load();
      initCurrentOption();
      updateCubeHelperText(getSelectedCubeId());
      updateStatsTags();
      renderLog();
      updateLogVisibility();
      if (window.CubeTips) {
        window.CubeTips.init();
      }
    } catch (err) {
      console.error("큐브 시뮬레이터 초기화 실패:", err);
    }

    // 2. Bind DOM Events
    document.getElementById("rollBtn").addEventListener("click", () => {
      if (window.autoRoll.getIsRunning()) return;
      doOneRollStep();
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      if (window.autoRoll.getIsRunning()) return;
      handleReset();
    });

    document.querySelectorAll(".cube-option-box.candidate").forEach(box => {
      box.addEventListener("click", (e) => {
        if (window.autoRoll.getIsRunning()) return;
        const index = Number(e.currentTarget.getAttribute("data-choice")) - 1;
        chooseCandidate(index);
      });
    });

    document.getElementById("cubeTypeSelect").addEventListener("change", () => {
      const cubeId = getSelectedCubeId();
      window.cubeSimulatorState.resetStats();
      updateCubeHelperText(cubeId);
      initCurrentOption();
      window.autoRoll.clearHighlights();
      showStatusMsg(null); // Clear status msg
    });

    document.getElementById("itemLevel").addEventListener("change", () => {
      window.cubeSimulatorState.resetStats();
      initCurrentOption();
      window.autoRoll.clearHighlights();
      showStatusMsg(null); // Clear status msg
    });

    document.getElementById("partsType").addEventListener("change", () => {
      window.cubeSimulatorState.resetStats();
      initCurrentOption();
      window.autoRoll.clearHighlights();
      showStatusMsg(null); // Clear status msg
    });

    // Rebuild UI highlights if goals change manually
    ["goalLine1", "goalLine2", "goalLine3", "goalCategory", "goalCategoryCount"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          renderAllBoxes();
        });
      }
    });

    document.getElementById("toggleLogBtn").addEventListener("click", () => {
      logVisible = !logVisible;
      updateLogVisibility();
    });

    const logLimitSelect = document.getElementById("logLimitSelect");
    if (logLimitSelect) {
      logLimitSelect.addEventListener("change", () => {
        renderLog();
      });
    }

    const clearLogBtn = document.getElementById("clearLogBtn");
    if (clearLogBtn) {
      clearLogBtn.addEventListener("click", () => {
        logEntries = [];
        renderLog();
      });
    }

    // 3. Auto-Roll Events Bindings
    const autoRollBtn = document.getElementById("autoRollBtn");
    if (autoRollBtn) {
      autoRollBtn.addEventListener("click", () => {
        if (window.autoRoll.getIsRunning()) {
          window.autoRoll.stop();
          showStatusMsg("⚠️ 자동 돌리기를 중단했습니다.", "warning");
        } else {
          if (pendingAutoRollSuccessCandidate) {
            applyCandidateAsCurrentOption(pendingAutoRollSuccessCandidate);
            pendingAutoRollSuccessCandidate = null;
            pendingAutoRollSuccessBatch = null;
          }
          startAutoRollSequence();
        }
      });
    }

    // 4. Goal Help Popover Events
    const goalHelpBtn = document.getElementById("goalHelpBtn");
    const goalHelpPopover = document.getElementById("goalHelpPopover");
    if (goalHelpBtn && goalHelpPopover) {
      const closePopover = () => {
        goalHelpPopover.classList.remove("open");
        goalHelpBtn.setAttribute("aria-expanded", "false");
      };

      goalHelpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = goalHelpPopover.classList.toggle("open");
        goalHelpBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      // Close on clicking outside
      document.addEventListener("click", (e) => {
        if (!goalHelpBtn.contains(e.target) && !goalHelpPopover.contains(e.target)) {
          closePopover();
        }
      });

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closePopover();
        }
      });
    }

    window.addEventListener("cubeSim:autoRollEnd", (e) => {
      updateAutoButtonState(false);
      const detail = e.detail;
      if (detail.reached) {
        // Find the log entry corresponding to the winning candidate
        const idx = detail.index;
        const count = window.cubeSimulatorState.getStats().rollCount;
        const targetRollNumber = count - (2 - idx);

        const entry = logEntries.find(ent => ent.rollNumber === targetRollNumber);
        if (entry) {
          entry.isHit = true;
          renderLog();
        }

        showStatusMsg("목표 옵션 달성! 재설정을 중단합니다.", "success");

        pendingAutoRollSuccessCandidate = rollCandidates[idx].map(l => ({ ...l }));
        pendingAutoRollSuccessBatch = rollCandidates.map(c => c.map(l => ({ ...l })));

        rollCandidates = pendingAutoRollSuccessBatch.map(c => c.map(l => ({ ...l })));
        renderAllBoxes();
      } else if (detail.limit) {
        showStatusMsg("⚠️ 최대 반복 횟수(10만 회)에 도달했지만 목표 옵션을 달성하지 못했습니다.", "warning");
      } else if (detail.error) {
        showStatusMsg("⚠️ 재설정 중 오류가 발생했거나 해당 조합의 데이터가 존재하지 않습니다.", "warning");
      }
    });
  });

  // Helper text dynamically updated
  function updateCubeHelperText(cubeId) {
    const el = document.getElementById("cubeHelperText");
    if (!el) return;

    let text = "";
    if (cubeId === CUBE_ID_BLACK) {
      text = `윗잠 (블큐): 블랙 큐브 계열 확률입니다. 같은 이름이 포함된 카르마/이벤트 큐브도 동일한 확률을 사용합니다.`;
    } else if (cubeId === CUBE_ID_MEISTER) {
      text = `윗잠 (명큐 / 골큐): 명장의 큐브와 골드 큐브 계열 확률입니다. 같은 이름이 포함된 카르마/이벤트 큐브도 동일한 확률을 사용합니다.`;
    } else if (cubeId === CUBE_ID_ADDI) {
      text = `아랫잠 (에디셔널): 에디셔널 잠재능력 재설정 및 에디셔널/화이트 에디셔널 큐브 계열 확률입니다. 카르마/이벤트 큐브도 동일한 확률을 사용합니다.`;
    }

    el.innerHTML = `${text}<br><span class="cube-helper-note">※ 확률은 공식 확률표의 반올림 표기를 기준으로 계산됩니다.</span>`;
  }

  // Inline status message handler
  function showStatusMsg(text, type) {
    const el = document.getElementById("cubeStatusMsg");
    if (!el) return;
    if (!text) {
      el.style.display = "none";
      el.innerHTML = "";
      return;
    }
    el.style.display = "block";
    el.className = `cube-status-message cube-status-${type}`;
    el.innerHTML = text;
  }

  // Check empty state
  function checkEmptyPool() {
    const cubeItemID = getSelectedCubeId();
    const partsType = getSelectedPartsType();
    const reqLev = getSelectedLevel();

    const pool1 = window.cubeData.getBasePool(cubeItemID, partsType, reqLev, 1);
    const isEmpty = !pool1 || pool1.length === 0;

    const rollBtn = document.getElementById("rollBtn");
    const autoRollBtn = document.getElementById("autoRollBtn");
    const statusArea = document.getElementById("cubeStatusMessage");

    if (isEmpty) {
      rollBtn.disabled = true;
      autoRollBtn.disabled = true;
      if (statusArea) {
        statusArea.style.display = "block";
        statusArea.innerHTML = `
          <div style="background: #fef3c7; color: #b45309; padding: 16px; border-radius: 12px; border: 1px solid #fde68a; margin-bottom: 20px; font-size: 14px; font-weight: 700; line-height: 1.5;">
            ⚠️ 선택한 큐브/부위/레벨 조합의 확률 데이터가 없습니다.
          </div>
        `;
      }
    } else {
      rollBtn.disabled = false;
      autoRollBtn.disabled = false;
      if (statusArea) {
        statusArea.style.display = "none";
        statusArea.innerHTML = "";
      }
    }
    return isEmpty;
  }

  // Main roll mechanics
  function initCurrentOption() {
    const cubeItemID = getSelectedCubeId();
    const partsType = getSelectedPartsType();
    const reqLev = getSelectedLevel();

    pendingAutoRollSuccessCandidate = null;
    pendingAutoRollSuccessBatch = null;

    // Rebuild exact line targets dynamically
    window.cubeGoals.populateLineTargetSelects(cubeItemID, partsType, reqLev);

    const isEmpty = checkEmptyPool();
    if (isEmpty) {
      currentLines = [];
      rollCandidates = [[], [], []];
      renderAllBoxes();
      return;
    }

    const first = window.cubeRoller.rollOneSet(cubeItemID, partsType, reqLev, []);
    if (!first) {
      currentLines = [];
      rollCandidates = [[], [], []];
      renderAllBoxes();
      return;
    }

    currentLines = first;
    rollCandidates = [[], [], []];
    renderAllBoxes();
  }

  function doOneRollStep() {
    // Clear status on manual roll starts
    showStatusMsg(null);

    const cubeItemID = getSelectedCubeId();
    const partsType = getSelectedPartsType();
    const reqLev = getSelectedLevel();
    const cubeKind = getSelectedCubeKind();

    const cand1 = window.cubeRoller.rollOneSet(cubeItemID, partsType, reqLev, currentLines);
    const cand2 = window.cubeRoller.rollOneSet(cubeItemID, partsType, reqLev, currentLines);
    const cand3 = window.cubeRoller.rollOneSet(cubeItemID, partsType, reqLev, currentLines);

    if (!cand1 || !cand2 || !cand3) {
      showStatusMsg("⚠️ 해당 조합의 데이터가 부족하여 큐브를 재설정할 수 없습니다.", "warning");
      return null;
    }

    rollCandidates = [cand1, cand2, cand3];

    // Compute costs
    const cost = getCostPerSet(reqLev, cubeItemID);
    window.cubeSimulatorState.incrementStats(cubeKind, 3, cost);

    // Logging entries
    const count = window.cubeSimulatorState.getStats().rollCount;
    addLogEntry(count - 2, cand1.map(l => l.optionText));
    addLogEntry(count - 1, cand2.map(l => l.optionText));
    addLogEntry(count, cand3.map(l => l.optionText));

    updateStatsTags();
    renderAllBoxes();
    triggerCandidatesFadeIn();
    return true;
  }

  function applyCandidateAsCurrentOption(candidate) {
    currentLines = candidate.map(l => ({ ...l }));
    rollCandidates = [[], [], []];
    renderAllBoxes();
  }

  function chooseCandidate(index) {
    const cand = rollCandidates[index];
    if (!cand || !cand.length) return;

    pendingAutoRollSuccessCandidate = null;
    pendingAutoRollSuccessBatch = null;

    applyCandidateAsCurrentOption(cand);
  }

  function handleReset() {
    window.cubeSimulatorState.resetStats();
    logEntries = [];
    renderLog();
    initCurrentOption();
    updateStatsTags();
    window.autoRoll.clearHighlights();
    showStatusMsg(null); // Clear status message
  }

  // Cost calculators
  function getCostPerSet(level, cubeItemID) {
    const isAddi = cubeItemID === CUBE_ID_ADDI;
    const tableMain = [
      { min: 250, max: 300, cost: 50000000 },
      { min: 200, max: 249, cost: 45000000 },
      { min: 160, max: 199, cost: 42500000 },
      { min: 1, max: 159, cost: 40000000 }
    ];
    const tableAddi = [
      { min: 250, max: 300, cost: 98000000 },
      { min: 200, max: 249, cost: 88000000 },
      { min: 160, max: 199, cost: 83000000 },
      { min: 1, max: 159, cost: 78000000 }
    ];
    const table = isAddi ? tableAddi : tableMain;
    for (const row of table) {
      if (level >= row.min && level <= row.max) return row.cost;
    }
    return table[table.length - 1].cost;
  }

  // UI render bindings
  const POTENTIAL_ICON_BASE = "assets/cube-simulator/potential/";

  const POTENTIAL_GRADE_ICONS = {
    rare: `${POTENTIAL_ICON_BASE}rare.png`,
    epic: `${POTENTIAL_ICON_BASE}epic.png`,
    unique: `${POTENTIAL_ICON_BASE}unique.png`,
    legendary: `${POTENTIAL_ICON_BASE}legendary.png`,
  };

  function getPotentialGradeIconForOption(optionText, lineNumber) {
    if (!optionText) return POTENTIAL_GRADE_ICONS.legendary;

    const cleanOpt = optionText.trim();
    const cubeItemID = getSelectedCubeId();
    const partsType = getSelectedPartsType();
    const reqLev = getSelectedLevel();

    // 1. Fetch Line 1 Option Pool
    const line1Pool = window.cubeData.getBasePool(cubeItemID, partsType, reqLev, 1);

    // 2. Check if the optionText is in the Line 1 (Legendary) pool
    const isLegendary = line1Pool.some(r => (r.optionText || "").trim() === cleanOpt);

    if (isLegendary) {
      return POTENTIAL_GRADE_ICONS.legendary;
    }

    // Default to unique for line 2/3 if it's not a legendary-tier option
    if (lineNumber === 2 || lineNumber === 3) {
      return POTENTIAL_GRADE_ICONS.unique;
    }

    // Default fallback
    return lineNumber === 1 ? POTENTIAL_GRADE_ICONS.legendary : POTENTIAL_GRADE_ICONS.unique;
  }

  // UI render bindings
  function renderLines(elemId, lines) {
    const elem = document.getElementById(elemId);
    elem.innerHTML = "";
    if (!lines || !lines.length) {
      elem.innerHTML = "<div style='color:#9ca3af;'>-</div>";
      return;
    }

    const goal = window.cubeGoals.getGoalFromUI();
    const hasGoal = goal.category || goal.exactLines[1] || goal.exactLines[2] || goal.exactLines[3];

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const div = document.createElement("div");
      div.className = "cube-line";

      const lineNum = i + 1;
      const iconPath = getPotentialGradeIconForOption(l.optionText, lineNum);

      // Create icon image element
      const iconImg = document.createElement("img");
      iconImg.className = "potential-grade-icon";
      iconImg.src = iconPath;

      let altText = "Unique";
      if (iconPath.includes("legendary")) altText = "Legendary";
      else if (iconPath.includes("epic")) altText = "Epic";
      else if (iconPath.includes("rare")) altText = "Rare";
      iconImg.alt = altText;

      // Text span element
      const textSpan = document.createElement("span");
      textSpan.textContent = l.optionText;

      div.appendChild(iconImg);
      div.appendChild(textSpan);

      if (hasGoal) {
        let isHit = false;

        // Check exact option text match
        if (goal.exactLines[lineNum] && l.optionText.trim() === goal.exactLines[lineNum].trim()) {
          isHit = true;
        }

        // Check category regex match
        if (goal.category) {
          const matcher = window.cubeGoals.getCategoryMatcher(goal.category);
          if (matcher(l.optionText.trim())) {
            isHit = true;
          }
        }

        if (isHit) {
          div.className += " hit";
        }
      }

      elem.appendChild(div);
    }
  }

  function renderAllBoxes() {
    renderLines("lines-current", currentLines);
    renderLines("lines-roll1", rollCandidates[0]);
    renderLines("lines-roll2", rollCandidates[1]);
    renderLines("lines-roll3", rollCandidates[2]);
  }

  function triggerCandidatesFadeIn() {
    const ids = ["box-roll1", "box-roll2", "box-roll3"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("fade-in-fast");
      void el.offsetWidth;
      el.classList.add("fade-in-fast");
      el.addEventListener("animationend", () => {
        el.classList.remove("fade-in-fast");
      }, { once: true });
    });
  }

  function renderLog() {
    const logEl = document.getElementById("log");
    if (!logEl) return;
    logEl.innerHTML = "";

    if (!logEntries || logEntries.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "cube-log-empty";
      emptyEl.textContent = "아직 재설정 로그가 없습니다.";
      logEl.appendChild(emptyEl);
      return;
    }

    const limitSelect = document.getElementById("logLimitSelect");
    const limit = limitSelect ? Number(limitSelect.value) : 100;
    const displayEntries = logEntries.slice(0, limit);

    displayEntries.forEach(entry => {
      const entryEl = document.createElement("div");
      entryEl.className = "cube-log-entry" + (entry.isHit ? " hit" : "");

      const titleEl = document.createElement("div");
      titleEl.className = "cube-log-title";

      const titleSpan = document.createElement("span");
      titleSpan.textContent = `#${entry.rollNumber}회째`;
      titleEl.appendChild(titleSpan);

      if (entry.isHit) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "cube-log-hit-icon";
        badgeEl.textContent = "💡";
        badgeEl.title = "목표 달성";
        badgeEl.setAttribute("aria-label", "목표 달성");
        titleEl.appendChild(badgeEl);
      }

      entryEl.appendChild(titleEl);

      entry.options.forEach((opt, idx) => {
        const lineEl = document.createElement("div");
        lineEl.className = "cube-log-line";

        const lineNum = idx + 1;
        const iconPath = getPotentialGradeIconForOption(opt, lineNum);

        // Icon Image
        const iconImg = document.createElement("img");
        iconImg.className = "potential-grade-icon";
        iconImg.src = iconPath;

        let altText = "Unique";
        if (iconPath.includes("legendary")) altText = "Legendary";
        else if (iconPath.includes("epic")) altText = "Epic";
        else if (iconPath.includes("rare")) altText = "Rare";
        iconImg.alt = altText;

        // Text Span
        const textSpan = document.createElement("span");
        textSpan.textContent = opt;

        lineEl.appendChild(iconImg);
        lineEl.appendChild(textSpan);

        entryEl.appendChild(lineEl);
      });

      logEl.appendChild(entryEl);
    });
  }

  function addLogEntry(rollNumber, options, isHit = false) {
    logEntries.unshift({ rollNumber, options, isHit });
    if (logEntries.length > 200) {
      logEntries.pop();
    }
    renderLog();
  }

  function updateStatsTags() {
    const cubeKind = getSelectedCubeKind();
    const stats = window.cubeSimulatorState.getStats();

    const countLabelEl = document.getElementById("rollCountLabel");
    const countValueEl = document.getElementById("rollCountValue");
    const mesoContainer = document.getElementById("mesoContainer");
    const mesoValueEl = document.getElementById("mesoValue");
    const azmosEl = document.getElementById("azmosTag");

    if (cubeKind === "meister") {
      if (countLabelEl) countLabelEl.textContent = "소모된 명장의 큐브";
      if (countValueEl) countValueEl.textContent = `${stats.meisterUsed.toLocaleString("ko-KR")}개`;
      if (mesoContainer) mesoContainer.style.display = "none";
      if (azmosEl) {
        if (SHOW_AZMOS_ESTIMATE) {
          azmosEl.style.display = "block";
          const weeks = Math.ceil(stats.meisterUsed / 29);
          azmosEl.textContent = `아즈모스 협곡 1만점: ${weeks}주 분량`;
        } else {
          azmosEl.style.display = "none";
        }
      }
    } else {
      if (countLabelEl) countLabelEl.textContent = "재설정 횟수";
      if (countValueEl) countValueEl.textContent = `${stats.rollCount.toLocaleString("ko-KR")}회`;
      if (mesoContainer) mesoContainer.style.display = "";
      const formattedMeso = formatMesoKorean(stats.mesoUsed).replace(/\s*메소$/, "");
      if (mesoValueEl) mesoValueEl.textContent = formattedMeso;
      if (azmosEl) azmosEl.style.display = "none";
    }
  }

  function updateLogVisibility() {
    const logDiv = document.getElementById("log");
    const btn = document.getElementById("toggleLogBtn");
    if (logVisible) {
      logDiv.style.display = "block";
      btn.textContent = "접기";
    } else {
      logDiv.style.display = "none";
      btn.textContent = "펼치기";
    }
  }

  function formatMesoKorean(v) {
    if (!v) return "0 메소";
    const jo = Math.floor(v / 1000000000000);
    let rem = v % 1000000000000;
    const eok = Math.floor(rem / 100000000);
    rem = rem % 100000000;
    const man = Math.floor(rem / 10000);
    const one = rem % 10000;

    const parts = [];
    if (jo) parts.push(jo + "조");
    if (eok) parts.push(eok + "억");
    if (man) parts.push(man + "만");
    if (one || parts.length === 0) parts.push(one.toLocaleString("ko-KR"));

    return parts.join(" ") + " 메소";
  }

  // Getters
  function getSelectedLevel() {
    return Number(document.getElementById("itemLevel").value);
  }

  function getSelectedPartsType() {
    return Number(document.getElementById("partsType").value);
  }

  // CubeKind is read directly from select value
  function getSelectedCubeKind() {
    const val = document.getElementById("cubeTypeSelect").value;
    if (val === CUBE_ID_ADDI) return "addi";
    if (val === CUBE_ID_MEISTER) return "meister";
    return "black";
  }

  function getSelectedCubeId() {
    return document.getElementById("cubeTypeSelect").value;
  }

  // Start Auto Roll Sequence
  function startAutoRollSequence() {
    // Clear status msg on auto-roll start
    showStatusMsg(null);

    const goal = window.cubeGoals.getGoalFromUI();
    const hasExact = goal.exactLines[1] || goal.exactLines[2] || goal.exactLines[3];
    const hasCategory = !!goal.category;

    if (!hasExact && !hasCategory) {
      showStatusMsg("⚠️ 자동 돌리기 목표를 하나 이상 선택해주세요.", "warning");
      return;
    }

    updateAutoButtonState(true);

    const checkGoal = () => {
      for (let i = 0; i < 3; i++) {
        const evalResult = window.cubeGoals.evaluateGoal(rollCandidates[i], goal);
        if (evalResult.reached) {
          return { reached: true, index: i };
        }
      }
      return { reached: false };
    };

    const onRoll = () => {
      const rolled = doOneRollStep();
      return rolled;
    };

    window.autoRoll.start(checkGoal, onRoll);
  }

  function updateAutoButtonState(running) {
    const btn = document.getElementById("autoRollBtn");
    if (btn) {
      btn.textContent = running ? "자동 돌리기 정지" : "자동 돌리기 시작";
      btn.className = running ? "btn btn-danger" : "btn btn-secondary";
    }
    document.getElementById("rollBtn").disabled = running;
    document.getElementById("resetBtn").disabled = running;
    document.getElementById("itemLevel").disabled = running;
    document.getElementById("partsType").disabled = running;
    document.getElementById("cubeTypeSelect").disabled = running;

    // Disable goal dropdowns to prevent user edits mid-flight
    ["goalLine1", "goalLine2", "goalLine3", "goalCategory", "goalCategoryCount"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = running;
    });
  }
})();
