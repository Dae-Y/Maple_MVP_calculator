(function () {
  // DEBUG: 테스트할 때는 1소재 시간을 30초로 바꾸려면 아래 MATERIAL_DURATION_MS만 수정.
  const MATERIAL_DURATION_MS = 30 * 60 * 1000; // 실사용: 1소재 = 30분
  // const MATERIAL_DURATION_MS = 30 * 1000; // 테스트용: 1소재 = 30초

  const JANUS_BASE_DURATION_MS_BY_LEVEL = {
    60: 60_000,
    70: 70_000,
    80: 80_000,
    120: 120_000,
  };

  const LUNA_EXTENSION_MAX_DURATION_MS = 300_000;
  const LUNA_GATHERING_INTERVAL_MS = 90_000;
  const LUNA_GATHERING_DAILY_LIMIT = 230;

  const MAGNET_PET_MODE_KEY = "maple_tools_hunting_magnet_pet_mode_v1";
  const LUNA_GATHERING_DAILY_KEY = "maple_tools_hunting_luna_gathering_daily_v1";

  const JANUS_LEVEL_DESCRIPTIONS = {
    60: "야누스 1렙은 구체 1개, 지속시간 60초입니다. 에르다 샤워 사용을 권장합니다.",
    70: "야누스 10렙은 구체 2개, 지속시간 70초입니다. 에르다 샤워를 사용해도 좋습니다.",
    80: "야누스 20렙은 구체 3개, 지속시간 80초입니다.",
    120: "야누스 30렙은 구체 3개, 지속시간 120초입니다."
  };

  // DOM 요소
  const sessionDisplay = document.getElementById("sessionDisplay");
  const sessionTimeDisplay = document.getElementById("sessionTimerDisplay");
  const skillDisplay = document.getElementById("skillTimerDisplay");
  const skillTimerSubLabel = document.getElementById("skillTimerSubLabel");
  const skillAlertMessage = document.getElementById("skillAlertMessage");
  const janusLevelDescription = document.getElementById("janusLevelDescription");
  const magnetPetDescription = document.getElementById("magnetPetDescription");

  const lunaGatheringPanel = document.getElementById("lunaGatheringPanel");
  const lunaGatheringCountEl = document.getElementById("lunaGatheringCount");
  const lunaGatheringLimitText = document.getElementById("lunaGatheringLimitText");
  const lunaExtensionBadge = document.getElementById("lunaExtensionBadge");
  const lunaGatheringCountControls = document.getElementById("lunaGatheringCountControls");
  const lunaGatheringCountInput = document.getElementById("lunaGatheringCountInput");
  const btnApplyLunaGatheringCount = document.getElementById("btnApplyLunaGatheringCount");
  const btnResetLunaGatheringCount = document.getElementById("btnResetLunaGatheringCount");

  const erdaTimerDisplay = document.getElementById("erdaTimerDisplay");
  const erdaTimerDisplayContainer = document.getElementById("erdaTimerDisplayContainer");
  const btnErdaEnabled = document.getElementById("btnErdaEnabled");
  const btnErdaDisabled = document.getElementById("btnErdaDisabled");
  const erdaAlertMessage = document.getElementById("erdaAlertMessage");

  const btnSessionStart = document.getElementById("btnSessionStart");
  const btnSessionPause = document.getElementById("btnSessionPause");
  const btnSessionReset = document.getElementById("btnSessionReset");
  const btnSessionDemo = document.getElementById("btnSessionDemo");
  const sessionCompleteMessage = document.getElementById("sessionCompleteMessage");

  const btnMaterialMinus = document.getElementById("btnMaterialMinus");
  const btnMaterialPlus = document.getElementById("btnMaterialPlus");
  const materialCountValue = document.getElementById("materialCountValue");

  const skillPresets = document.querySelectorAll(".btn-preset-skill");
  const magnetPetButtons = document.querySelectorAll(".btn-preset-magnet");

  // 타이머 관련 변수 (기본값)
  let selectedMaterialCount = 1;
  let selectedSessionMinutes = 30;
  let selectedSkillSeconds = 60;

  // 자석펫 및 루나 게더링 상태 변수
  let magnetPetMode = "0-3"; // "0-3", "4", "5"
  let lunaGatheringCount = 0;
  let lunaGatheringDateKey = "";
  let lunaGatheringNextAt = null;
  let remainingLunaGatheringMs = LUNA_GATHERING_INTERVAL_MS;
  let hasStartedLunaGatheringForSession = false;

  // 타이머 실행 상태 변수 (localStorage 저장 제외)
  let isRunning = false;
  let isCountingDown = false;
  let countdownTimerId = null;
  let countdownValue = 3;
  let isSkillAlerting = false;
  let skillRestartTimeoutId = null;

  let isErdaEnabled = false;
  let isErdaAlerting = false;
  let erdaRestartTimeoutId = null;

  let remainingSessionMs = selectedMaterialCount * MATERIAL_DURATION_MS;
  let remainingSkillMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
  let remainingErdaMs = 60 * 1000;

  let sessionEndAt = null;
  let skillEndAt = null;
  let erdaEndAt = null;
  let updateIntervalId = null;
  let lastTickTime = null;
  let pulseTimeoutId = null;

  // 데모 및 플래시 관련 상태 변수
  let isSessionDemoRunning = false;
  let demoCountdownTimerId = null;
  let demoTransitionTimeoutId = null;
  let demoCleanupTimeoutId = null;
  let demoCountdownValue = 5;
  let sessionFlashTimeoutId = null;
  let installFlashTimeoutId = null;

  // Web Audio Context (지연 초기화)
  let audioCtx = null;

  // 뽀모도로 Constants & DOM elements
  const POMODORO_FOCUS_MS = 25 * 60 * 1000;
  const POMODORO_SHORT_BREAK_MS = 5 * 60 * 1000;
  const POMODORO_LONG_BREAK_MS = 15 * 60 * 1000;
  const POMODORO_MAX_FOCUS = 4;

  const pomodoroCard = document.querySelector(".pomodoro-card");
  const pomodoroHeader = document.getElementById("pomodoroHeader");
  const btnPomodoroToggle = document.getElementById("btnPomodoroToggle");
  const pomodoroBody = document.getElementById("pomodoroBody");
  const pomodoroDisplay = document.getElementById("pomodoroDisplay");
  const pomodoroModeText = document.getElementById("pomodoroModeText");
  const pomodoroFocusCounter = document.getElementById("pomodoroFocusCounter");
  const pomodoroBreakCounter = document.getElementById("pomodoroBreakCounter");
  const pomodoroAlertMessage = document.getElementById("pomodoroAlertMessage");
  
  const btnPomodoroStart = document.getElementById("btnPomodoroStart");
  const btnPomodoroPause = document.getElementById("btnPomodoroPause");
  const btnPomodoroReset = document.getElementById("btnPomodoroReset");

  // 뽀모도로 States
  let pomodoroMode = "focus"; // focus | shortBreak | longBreak
  let pomodoroFocusCount = 0;
  let pomodoroBreakCount = 0;
  let remainingPomodoroMs = POMODORO_FOCUS_MS;
  let pomodoroEndAt = null;
  let isPomodoroRunning = false;
  let pomodoroIntervalId = null;
  let pomodoroTransitionTimeoutId = null;
  let pomodoroFlashTimeoutId = null;

  // 1. 초기값 및 로컬스토리지 로드
  function init() {
    loadSettings();
    hideLunaExtensionPulse();
    updateDisplays();
    setupEventListeners();
  }

  // 로컬스토리지에서 설정값 및 체크리스트 상태 로드
  function loadSettings() {
    // 세션 시간 설정 로드
    const savedMaterial = localStorage.getItem("maple_tools_material_count");
    if (savedMaterial) {
      selectedMaterialCount = parseInt(savedMaterial, 10);
      if (isNaN(selectedMaterialCount) || selectedMaterialCount < 1) selectedMaterialCount = 1;
      if (selectedMaterialCount > 10) selectedMaterialCount = 10;
    } else {
      // Fallback to legacy saved minutes if available
      const savedSession = localStorage.getItem("maple_tools_session_minutes");
      if (savedSession) {
        const legacyMinutes = parseInt(savedSession, 10);
        selectedMaterialCount = Math.floor(legacyMinutes / 30);
        if (selectedMaterialCount < 1) selectedMaterialCount = 1;
        if (selectedMaterialCount > 10) selectedMaterialCount = 10;
      } else {
        selectedMaterialCount = 1;
      }
    }
    selectedSessionMinutes = selectedMaterialCount * 30;
    remainingSessionMs = selectedMaterialCount * MATERIAL_DURATION_MS;

    // 자석펫 모드 로드
    const savedMagnetPet = localStorage.getItem(MAGNET_PET_MODE_KEY);
    if (savedMagnetPet === "4" || savedMagnetPet === "5") {
      magnetPetMode = savedMagnetPet;
    } else {
      magnetPetMode = "0-3";
    }
    updateMagnetPetButtonsUI();

    // 루나 게더링 일일 데이터 로드
    loadLunaGatheringData();

    // 설치기 주기 설정 로드
    const savedSkill = localStorage.getItem("maple_tools_skill_seconds");
    if (savedSkill) {
      selectedSkillSeconds = parseInt(savedSkill, 10);

      // 프리셋 활성화 UI 업데이트
      skillPresets.forEach(btn => {
        if (parseInt(btn.dataset.seconds, 10) === selectedSkillSeconds) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    const baseJanusMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
    remainingSkillMs = baseJanusMs;

    // 에르다 샤워 사용 여부 로드 (기본값: 미사용 / false)
    const savedErda = localStorage.getItem("maple_tools_erda_enabled");
    if (savedErda !== null) {
      isErdaEnabled = savedErda === "true";
    } else {
      isErdaEnabled = false;
    }

    updateErdaAutoGuidance();

    // 뽀모도로 접기/펼치기 상태 로드
    const savedPomodoroCollapsed = localStorage.getItem("maple_tools_pomodoro_collapsed");
    if (savedPomodoroCollapsed === "false") {
      if (pomodoroCard) pomodoroCard.classList.remove("is-collapsed");
      if (pomodoroBody) pomodoroBody.hidden = false;
      if (btnPomodoroToggle) {
        btnPomodoroToggle.textContent = "접기";
        btnPomodoroToggle.setAttribute("aria-expanded", "true");
      }
    } else {
      if (pomodoroCard) pomodoroCard.classList.add("is-collapsed");
      if (pomodoroBody) pomodoroBody.hidden = true;
      if (btnPomodoroToggle) {
        btnPomodoroToggle.textContent = "펼치기";
        btnPomodoroToggle.setAttribute("aria-expanded", "false");
      }
    }
  }

  // 로컬스토리지에 현재 설정값 저장
  function saveSettings() {
    localStorage.setItem("maple_tools_material_count", selectedMaterialCount);
    localStorage.setItem("maple_tools_skill_seconds", selectedSkillSeconds);
    localStorage.setItem("maple_tools_erda_enabled", isErdaEnabled);
    localStorage.setItem(MAGNET_PET_MODE_KEY, magnetPetMode);
  }

  // 2. KST 및 루나 게더링 헬퍼 함수들
  function getKstDateKey(date = new Date()) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    } catch (e) {
      const kstDate = new Date(date.getTime() + (date.getTimezoneOffset() + 9 * 60) * 60 * 1000);
      const year = kstDate.getFullYear();
      const month = String(kstDate.getMonth() + 1).padStart(2, "0");
      const day = String(kstDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  function loadLunaGatheringData() {
    const currentKstDateKey = getKstDateKey();
    const savedData = localStorage.getItem(LUNA_GATHERING_DAILY_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed && parsed.dateKey === currentKstDateKey) {
          lunaGatheringDateKey = currentKstDateKey;
          lunaGatheringCount = Math.min(Math.max(parseInt(parsed.count, 10) || 0, 0), LUNA_GATHERING_DAILY_LIMIT);
          return;
        }
      } catch (e) {
        console.error("Failed to parse Luna Gathering data:", e);
      }
    }
    lunaGatheringDateKey = currentKstDateKey;
    lunaGatheringCount = 0;
    saveLunaGatheringData();
  }

  function saveLunaGatheringData() {
    localStorage.setItem(
      LUNA_GATHERING_DAILY_KEY,
      JSON.stringify({
        dateKey: lunaGatheringDateKey || getKstDateKey(),
        count: lunaGatheringCount,
      })
    );
  }

  function checkKstDateReset() {
    const currentKstDateKey = getKstDateKey();
    if (lunaGatheringDateKey !== currentKstDateKey) {
      lunaGatheringDateKey = currentKstDateKey;
      lunaGatheringCount = 0;
      saveLunaGatheringData();
      updateDisplays();
    }
  }

  function isLunaGatheringEnabled() {
    return magnetPetMode === "4" || magnetPetMode === "5";
  }

  function isLunaExtensionActive() {
    return magnetPetMode === "5" && lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT;
  }

  function applyLunaExtension() {
    if (!isLunaExtensionActive()) return false;
    if (remainingSkillMs <= 0) return false;

    const extensionMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
    remainingSkillMs = Math.min(LUNA_EXTENSION_MAX_DURATION_MS, remainingSkillMs + extensionMs);
    if (isRunning) {
      skillEndAt = Date.now() + remainingSkillMs;
    }

    showLunaExtensionPulse(extensionMs);
    return true;
  }

  const LUNA_EXTENSION_PULSE_DURATION_MS = 3000;
  let lunaExtensionPulseTimeoutId = null;

  function showLunaExtensionPulse(extensionMs) {
    const pulseEl = document.getElementById("lunaExtensionPulse");
    if (!pulseEl) return;

    if (lunaExtensionPulseTimeoutId !== null) {
      clearTimeout(lunaExtensionPulseTimeoutId);
      lunaExtensionPulseTimeoutId = null;
    }

    const formatted = formatMs(extensionMs);
    pulseEl.textContent = "+" + formatted;
    pulseEl.hidden = false;
    pulseEl.classList.add("is-visible");

    lunaExtensionPulseTimeoutId = setTimeout(() => {
      hideLunaExtensionPulse();
    }, LUNA_EXTENSION_PULSE_DURATION_MS);
  }

  function hideLunaExtensionPulse() {
    if (lunaExtensionPulseTimeoutId !== null) {
      clearTimeout(lunaExtensionPulseTimeoutId);
      lunaExtensionPulseTimeoutId = null;
    }

    const pulseEl = document.getElementById("lunaExtensionPulse");
    if (pulseEl) {
      pulseEl.hidden = true;
      pulseEl.classList.remove("is-visible");
      pulseEl.textContent = "";
    }
  }

  function updateErdaAutoGuidance() {
    const erdaDisabledNote = document.getElementById("erdaDisabledNote");
    const isJanusHighLevel = selectedSkillSeconds === 80 || selectedSkillSeconds === 120;

    if (isJanusHighLevel) {
      if (isErdaEnabled) {
        isErdaEnabled = false;
        saveSettings();
      }

      if (btnErdaEnabled) {
        btnErdaEnabled.disabled = true;
        btnErdaEnabled.classList.remove("active");
      }
      if (btnErdaDisabled) {
        btnErdaDisabled.classList.add("active");
      }
      if (erdaTimerDisplayContainer) {
        erdaTimerDisplayContainer.classList.add("hidden");
      }
      if (erdaDisabledNote) {
        erdaDisabledNote.hidden = false;
      }
    } else {
      if (!isRunning && !isCountingDown && !isSessionDemoRunning) {
        if (btnErdaEnabled) btnErdaEnabled.disabled = false;
      }
      if (erdaDisabledNote) {
        erdaDisabledNote.hidden = true;
      }
    }
  }

  function updateMagnetPetButtonsUI() {
    magnetPetButtons.forEach(btn => {
      const mode = btn.dataset.magnetPetMode;
      if (mode === magnetPetMode) {
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      }
    });
  }

  function setMagnetPetMode(mode) {
    if (isRunning || isCountingDown || isSessionDemoRunning) return;
    if (mode !== "0-3" && mode !== "4" && mode !== "5") return;

    magnetPetMode = mode;
    saveSettings();
    updateMagnetPetButtonsUI();
    hideLunaExtensionPulse();

    resetTimers(false);
  }

  // 3. 디스플레이 갱신 함수
  function updateDisplays() {
    if (sessionTimeDisplay) {
      sessionTimeDisplay.textContent = formatMs(remainingSessionMs);
    }

    skillDisplay.textContent = formatMs(remainingSkillMs);
    if (skillTimerSubLabel) skillTimerSubLabel.hidden = true;

    if (isErdaEnabled && erdaTimerDisplay) {
      erdaTimerDisplay.textContent = formatMs(remainingErdaMs);
    }

    updateErdaAutoGuidance();
    updateLunaGatheringDisplay();
    updateMaterialDisplay();
    updateDemoButtonState();
    updateJanusDescription();
    updateMagnetPetDescription();
    updatePomodoroDisplay();
    updatePomodoroModeText();
    updatePomodoroCounters();
  }

  function updateLunaGatheringDisplay() {
    if (!sessionDisplay || !lunaGatheringPanel) return;

    if (isLunaGatheringEnabled()) {
      sessionDisplay.classList.add("has-luna-gathering");
      lunaGatheringPanel.hidden = false;
      if (lunaGatheringCountControls) lunaGatheringCountControls.hidden = false;

      if (magnetPetMode === "5" && isLunaExtensionActive()) {
        if (lunaExtensionBadge) lunaExtensionBadge.hidden = false;
      } else {
        if (lunaExtensionBadge) lunaExtensionBadge.hidden = true;
      }

      if (lunaGatheringCountEl) {
        lunaGatheringCountEl.textContent = `${lunaGatheringCount} / ${LUNA_GATHERING_DAILY_LIMIT}`;
      }

      if (lunaGatheringCountInput && document.activeElement !== lunaGatheringCountInput) {
        lunaGatheringCountInput.value = String(lunaGatheringCount);
      }

      if (lunaGatheringCount >= LUNA_GATHERING_DAILY_LIMIT) {
        lunaGatheringPanel.classList.add("is-limit-reached");
        if (lunaGatheringLimitText) lunaGatheringLimitText.hidden = false;
      } else {
        lunaGatheringPanel.classList.remove("is-limit-reached");
        if (lunaGatheringLimitText) lunaGatheringLimitText.hidden = true;
      }
    } else {
      sessionDisplay.classList.remove("has-luna-gathering");
      lunaGatheringPanel.hidden = true;
      if (lunaGatheringCountControls) lunaGatheringCountControls.hidden = true;
      if (lunaExtensionBadge) lunaExtensionBadge.hidden = true;
    }
  }

  function getJanusExtensionFormattedText(seconds) {
    if (seconds === 60) return "1분";
    if (seconds === 70) return "1분 10초";
    if (seconds === 80) return "1분 20초";
    if (seconds === 120) return "2분";
    return "";
  }

  function updateJanusDescription() {
    if (!janusLevelDescription) return;
    if (magnetPetMode === "5") {
      const extText = getJanusExtensionFormattedText(selectedSkillSeconds);
      janusLevelDescription.innerHTML = `루나 게더링 발동 시 남은 솔 야누스 시간에 기본 지속시간이 추가됩니다.<br>현재 레벨은 게더링 1회당 ${extText}가 증가하며, 최대 5분까지 유지할 수 있습니다.`;
    } else if (magnetPetMode === "4") {
      janusLevelDescription.textContent = (JANUS_LEVEL_DESCRIPTIONS[selectedSkillSeconds] || "") + " 루나 게더링 횟수만 기록하며, 야누스 재설치 타이머는 기존 방식으로 동작합니다.";
    } else {
      janusLevelDescription.textContent = JANUS_LEVEL_DESCRIPTIONS[selectedSkillSeconds] || "";
    }
  }

  function updateMagnetPetDescription() {
    if (!magnetPetDescription) return;
    if (magnetPetMode === "4") {
      magnetPetDescription.hidden = false;
      magnetPetDescription.innerHTML = "루나 게더링이 90초마다 발동하며, 하루 최대 230회까지 사용 횟수를 기록합니다.";
    } else if (magnetPetMode === "5") {
      magnetPetDescription.hidden = false;
      magnetPetDescription.innerHTML = '루나 게더링이 90초마다 발동하며, 루나 익스텐션이 설치된 솔 야누스의 지속시간을 연장합니다.<br><span class="magnet-pet-sub-desc">※ 사냥 시작 직후 솔 야누스 설치와 루나 게더링 1회 사용 기준입니다.</span>';
    } else {
      magnetPetDescription.hidden = true;
      magnetPetDescription.innerHTML = "";
    }
  }

  function updateMaterialDisplay() {
    if (materialCountValue) {
      materialCountValue.textContent = `${selectedMaterialCount}소재`;
    }
    if (btnMaterialMinus) {
      btnMaterialMinus.disabled = isRunning || isCountingDown || selectedMaterialCount <= 1;
    }
    if (btnMaterialPlus) {
      btnMaterialPlus.disabled = isRunning || isCountingDown || selectedMaterialCount >= 10;
    }
  }

  function toggleMaterialButtonsDisabled(disabled) {
    if (disabled) {
      if (btnMaterialMinus) btnMaterialMinus.disabled = true;
      if (btnMaterialPlus) btnMaterialPlus.disabled = true;
    } else {
      updateMaterialDisplay();
    }
  }

  // 시간 포맷팅 (ms -> MM:SS)
  function formatMs(ms) {
    if (ms === Infinity) return "-";
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  // 4. Web Audio API 사운드 생성
  function initAudio() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    } catch (e) {
      console.warn("Failed to initialize AudioContext:", e);
    }
  }

  function playSessionCompleteSound() {
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      // Ascending sparkly arpeggio tones to create a "샤라라랑" magical feel, stretched to ~3 seconds
      const notes = [
        { freq: 523.25, type: "sine", delay: 0.0 },     // C5
        { freq: 659.25, type: "triangle", delay: 0.2 }, // E5
        { freq: 783.99, type: "sine", delay: 0.4 },     // G5
        { freq: 1046.50, type: "triangle", delay: 0.6 },// C6
        { freq: 1318.51, type: "sine", delay: 0.8 },    // E6
        { freq: 1567.98, type: "triangle", delay: 1.0 },// G6
        { freq: 2093.00, type: "sine", delay: 1.2 },    // C7

        // Shimmering descend
        { freq: 1975.53, type: "sine", delay: 1.5 },    // B6
        { freq: 1567.98, type: "triangle", delay: 1.7 },// G6
        { freq: 1318.51, type: "sine", delay: 1.9 },    // E6
        { freq: 987.77, type: "triangle", delay: 2.1 }, // B5
        { freq: 783.99, type: "sine", delay: 2.2 },     // G5

        // Final soft chord resonance
        { freq: 523.25, type: "sine", delay: 2.4 },     // C5
        { freq: 659.25, type: "sine", delay: 2.4 },     // E5
        { freq: 783.99, type: "sine", delay: 2.4 }      // G5
      ];

      notes.forEach(note => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = note.type;
        osc.frequency.setValueAtTime(note.freq, now + note.delay);

        gainNode.gain.setValueAtTime(0.0, now + note.delay);
        gainNode.gain.linearRampToValueAtTime(0.04, now + note.delay + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.6);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(now + note.delay);
        osc.stop(now + note.delay + 0.7);
      });
    } catch (e) {
      console.warn("Audio Context complete sound playback failed:", e);
    }
  }

  function playAlertSound(type) {
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      if (type === "skill" || type === "erda") {
        // "삐비빅 삐비빅" 패턴 (beep 0ms, 120ms, 240ms, pause, 620ms, 740ms, 860ms)
        const beeps = [0, 0.12, 0.24, 0.62, 0.74, 0.86];
        const gainVal = (type === "erda") ? 0.08 : 0.12; // 에르다 샤워는 약간 부드럽게 출력
        beeps.forEach(delay => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now + delay);

          gainNode.gain.setValueAtTime(gainVal, now + delay);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          osc.start(now + delay);
          osc.stop(now + delay + 0.1);
        });
      } else if (type === "completion") {
        playSessionCompleteSound();
      }
    } catch (e) {
      console.warn("Audio Context playback failed or blocked by policy:", e);
    }
  }

  // 5. 타이머 루프 제어 (고정밀 Date.now() 경과 시간 기준)
  function handleStartClick() {
    if (isRunning || isCountingDown || isSessionDemoRunning) return;

    hideSessionCompleteMessage();

    // Only countdown when starting from stopped/reset state
    if (remainingSessionMs === selectedMaterialCount * MATERIAL_DURATION_MS) {
      startCountdown();
    } else {
      startTimers();
    }
  }

  function startCountdown() {
    if (isCountingDown) return;

    isCountingDown = true;
    countdownValue = 3;

    btnSessionStart.disabled = true;
    btnSessionPause.disabled = true;
    togglePresetButtonsDisabled(true);
    updateDemoButtonState();

    const overlay = document.getElementById("countdownOverlay");
    const numEl = document.getElementById("countdownNumber");

    if (overlay && numEl) {
      overlay.classList.remove("hidden");
      numEl.textContent = countdownValue;

      numEl.style.animation = 'none';
      numEl.offsetHeight; /* trigger reflow */
      numEl.style.animation = '';
    }

    initAudio();

    function tick() {
      if (!isCountingDown) return;

      countdownValue--;
      if (countdownValue > 0) {
        if (numEl) {
          numEl.textContent = countdownValue;
          numEl.style.animation = 'none';
          numEl.offsetHeight; /* trigger reflow */
          numEl.style.animation = '';
        }
        countdownTimerId = setTimeout(tick, 1000);
      } else {
        if (overlay) {
          overlay.classList.add("hidden");
        }
        isCountingDown = false;
        countdownTimerId = null;
        startTimers();
      }
    }

    countdownTimerId = setTimeout(tick, 1000);
  }

  function advanceHuntingTimers(elapsedMs, currentTime) {
    let remainingStepMs = elapsedMs;

    while (remainingStepMs > 0) {
      let timeUntilJanusEvent = Infinity;
      if (!isSkillAlerting && remainingSkillMs > 0) {
        timeUntilJanusEvent = remainingSkillMs;
      }

      let timeUntilGatheringEvent = Infinity;
      if (isLunaGatheringEnabled() && lunaGatheringNextAt !== null && lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
        timeUntilGatheringEvent = remainingLunaGatheringMs;
      }

      const stepMs = Math.min(remainingStepMs, timeUntilJanusEvent, timeUntilGatheringEvent);

      if (stepMs === Infinity || stepMs <= 0) {
        if (!isSkillAlerting && remainingSkillMs > 0) {
          remainingSkillMs = Math.max(0, remainingSkillMs - remainingStepMs);
        }
        if (isLunaGatheringEnabled() && lunaGatheringNextAt !== null && lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
          remainingLunaGatheringMs = Math.max(0, remainingLunaGatheringMs - remainingStepMs);
        }
        break;
      }

      if (!isSkillAlerting && remainingSkillMs > 0) {
        remainingSkillMs = Math.max(0, remainingSkillMs - stepMs);
      }
      if (isLunaGatheringEnabled() && lunaGatheringNextAt !== null && lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
        remainingLunaGatheringMs = Math.max(0, remainingLunaGatheringMs - stepMs);
      }

      remainingStepMs -= stepMs;

      const janusExpired = (timeUntilJanusEvent === stepMs && remainingSkillMs === 0);
      const gatheringTriggered = (timeUntilGatheringEvent === stepMs && remainingLunaGatheringMs === 0);

      // Ordering rule: Janus expiration MUST be handled before Gathering activation
      if (janusExpired) {
        triggerSkillAlert();
      }

      if (gatheringTriggered) {
        handleLunaGatheringActivation({ allowExtension: !janusExpired });
      }
    }
  }

  function handleLunaGatheringActivation(options = {}) {
    const allowExtension = options.allowExtension ?? true;

    if (lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
      lunaGatheringCount++;
      saveLunaGatheringData();

      if (magnetPetMode === "5" && allowExtension && !isSkillAlerting && remainingSkillMs > 0) {
        applyLunaExtension();
      }
    }

    if (lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
      remainingLunaGatheringMs = LUNA_GATHERING_INTERVAL_MS;
      lunaGatheringNextAt = Date.now() + LUNA_GATHERING_INTERVAL_MS;
    } else {
      remainingLunaGatheringMs = 0;
      lunaGatheringNextAt = null;
    }
  }

  function startTimers() {
    if (isRunning) return;

    // 브라우저 오디오 권한 활성화를 위해 재생 초기화
    initAudio();

    isRunning = true;
    sessionEndAt = Date.now() + remainingSessionMs;

    if (!isSkillAlerting) {
      skillEndAt = Date.now() + remainingSkillMs;
    }

    if (isErdaEnabled && !isErdaAlerting) {
      erdaEndAt = Date.now() + remainingErdaMs;
    }

    // 루나 게더링 시작/재개 처리
    if (isLunaGatheringEnabled()) {
      if (!hasStartedLunaGatheringForSession) {
        // 새 사냥 세션 시작 시 즉시 1회 등록
        hasStartedLunaGatheringForSession = true;
        if (lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
          lunaGatheringCount++;
          saveLunaGatheringData();

          if (magnetPetMode === "5") {
            // Apply immediate extension at session start
            applyLunaExtension();
          }

          remainingLunaGatheringMs = LUNA_GATHERING_INTERVAL_MS;
          lunaGatheringNextAt = Date.now() + LUNA_GATHERING_INTERVAL_MS;
        } else {
          remainingLunaGatheringMs = 0;
          lunaGatheringNextAt = null;
        }
      } else {
        if (lunaGatheringCount < LUNA_GATHERING_DAILY_LIMIT) {
          lunaGatheringNextAt = Date.now() + remainingLunaGatheringMs;
        }
      }
    }

    btnSessionStart.disabled = true;
    btnSessionPause.disabled = false;

    // 프리셋 버튼 변경 비활성화 (동작 중일 때 혼란 방지)
    togglePresetButtonsDisabled(true);

    lastTickTime = Date.now();

    updateIntervalId = setInterval(() => {
      checkKstDateReset();

      const currentTime = Date.now();
      const elapsedMs = currentTime - lastTickTime;
      lastTickTime = currentTime;

      remainingSessionMs = sessionEndAt - currentTime;

      advanceHuntingTimers(elapsedMs, currentTime);

      // 에르다 샤워 타이머 틱
      if (isErdaEnabled) {
        if (!isErdaAlerting) {
          remainingErdaMs = erdaEndAt - currentTime;
          if (remainingErdaMs < 0) {
            remainingErdaMs = 0;
          }

          if (remainingErdaMs <= 0) {
            if (magnetPetMode === "5") {
              triggerErdaAlert(); // 5석펫: 에르다 샤워 단독 알림
            } else {
              triggerErdaSyncAlert(); // 0~3 / 4석펫: 기존 동기화 알림
            }
          }
        } else {
          remainingErdaMs = 0;
        }
      }

      // 세션 타이머 만료 시
      if (remainingSessionMs <= 0) {
        remainingSessionMs = 0;
        remainingSkillMs = 0;
        remainingErdaMs = 0;
        updateDisplays();

        playSessionCompleteSound();
        flashSessionCard();
        showSessionCompleteMessage();

        // Defer alert so the page has a chance to render the animation first
        setTimeout(() => {
          alert("사냥 세션이 완료되었습니다! 수고하셨습니다.");
        }, 50);

        resetTimers(true);
        return;
      }

      updateDisplays();
    }, 100);
  }

  function triggerSkillAlert() {
    isSkillAlerting = true;
    remainingSkillMs = 0;
    hideLunaExtensionPulse();
    updateDisplays();

    playAlertSound("skill");
    showSkillAlert();
    flashInstallCard();

    skillRestartTimeoutId = setTimeout(finishSkillAlert, 2000);
  }

  function finishSkillAlert() {
    if (!isRunning) return;
    isSkillAlerting = false;
    skillRestartTimeoutId = null;
    hideSkillAlert();

    const baseMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
    remainingSkillMs = baseMs;
    skillEndAt = Date.now() + remainingSkillMs;
    updateDisplays();
  }

  function triggerErdaAlert() {
    isErdaAlerting = true;
    remainingErdaMs = 0;
    updateDisplays();

    playAlertSound("erda");
    showErdaAlert();
    flashInstallCard();

    erdaRestartTimeoutId = setTimeout(finishErdaAlert, 2000);
  }

  function finishErdaAlert() {
    if (!isRunning) return;
    isErdaAlerting = false;
    erdaRestartTimeoutId = null;
    hideErdaAlert();

    erdaEndAt = Date.now() + (60 * 1000);
    remainingErdaMs = 60 * 1000;
    updateDisplays();
  }

  function triggerErdaSyncAlert() {
    if (isErdaAlerting || isSkillAlerting) return;

    isErdaAlerting = true;
    isSkillAlerting = true;
    remainingErdaMs = 0;
    remainingSkillMs = 0;
    updateDisplays();

    showErdaAlert();
    showSkillAlert();

    playAlertSound("erda");
    flashInstallCard();

    erdaRestartTimeoutId = setTimeout(finishErdaSyncAlert, 2000);
  }

  function finishErdaSyncAlert() {
    if (!isRunning) return;
    isErdaAlerting = false;
    isSkillAlerting = false;
    erdaRestartTimeoutId = null;
    hideErdaAlert();
    hideSkillAlert();

    remainingErdaMs = 60 * 1000;
    const baseMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
    remainingSkillMs = baseMs;

    erdaEndAt = Date.now() + remainingErdaMs;
    skillEndAt = Date.now() + remainingSkillMs;
    updateDisplays();
  }

  function pauseTimers() {
    if (!isRunning) return;

    isRunning = false;
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      updateIntervalId = null;
    }

    const currentTime = Date.now();
    remainingSessionMs = Math.max(0, sessionEndAt - currentTime);

    // 루나 게더링 일시정지 처리
    if (isLunaGatheringEnabled() && lunaGatheringNextAt !== null) {
      remainingLunaGatheringMs = Math.max(0, lunaGatheringNextAt - currentTime);
      lunaGatheringNextAt = null;
    }

    // 야누스 타이머 일시정지 처리
    if (isSkillAlerting) {
      isSkillAlerting = false;
      if (skillRestartTimeoutId) {
        clearTimeout(skillRestartTimeoutId);
        skillRestartTimeoutId = null;
      }
      hideSkillAlert();
      remainingSkillMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
    } else if (skillEndAt !== null) {
      remainingSkillMs = Math.max(0, skillEndAt - currentTime);
    }

    // 에르다 샤워 일시정지 처리
    if (isErdaEnabled) {
      if (isErdaAlerting) {
        isErdaAlerting = false;
        if (erdaRestartTimeoutId) {
          clearTimeout(erdaRestartTimeoutId);
          erdaRestartTimeoutId = null;
        }
        hideErdaAlert();
        remainingErdaMs = 60 * 1000;
      } else if (erdaEndAt !== null) {
        remainingErdaMs = Math.max(0, erdaEndAt - currentTime);
      }
    }

    btnSessionStart.disabled = false;
    btnSessionPause.disabled = true;

    // Enable presets on pause
    togglePresetButtonsDisabled(false);
    updateDemoButtonState();
    updateDisplays();
  }

  function resetTimers(keepSessionFlash = false) {
    // 3-2-1 카운트다운 정지
    if (countdownTimerId) {
      clearTimeout(countdownTimerId);
      countdownTimerId = null;
    }
    isCountingDown = false;
    const overlay = document.getElementById("countdownOverlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }

    // 루나 게더링 세션 상태 리셋 (일일 0/230 카운트는 유지)
    hasStartedLunaGatheringForSession = false;
    lunaGatheringNextAt = null;
    remainingLunaGatheringMs = LUNA_GATHERING_INTERVAL_MS;

    // 야누스 알림 해제
    if (skillRestartTimeoutId) {
      clearTimeout(skillRestartTimeoutId);
      skillRestartTimeoutId = null;
    }
    isSkillAlerting = false;
    hideSkillAlert();
    hideLunaExtensionPulse();

    // 에르다 샤워 알림 해제
    if (erdaRestartTimeoutId) {
      clearTimeout(erdaRestartTimeoutId);
      erdaRestartTimeoutId = null;
    }
    isErdaAlerting = false;
    hideErdaAlert();

    // 데모 상태 해제
    if (isSessionDemoRunning || demoCleanupTimeoutId) {
      cleanupDemoState();
    }

    // 플래시 애니메이션 및 타이머 정리
    if (!keepSessionFlash) {
      const sessionCard = document.querySelector(".session-timer-card");
      if (sessionCard) {
        sessionCard.classList.remove("is-session-complete-flashing");
      }
      if (sessionFlashTimeoutId) {
        clearTimeout(sessionFlashTimeoutId);
        sessionFlashTimeoutId = null;
      }
      hideSessionCompleteMessage();
    }

    const installCard = document.querySelector(".install-timer-card");
    if (installCard) {
      installCard.classList.remove("is-install-alert-flashing");
    }
    if (installFlashTimeoutId) {
      clearTimeout(installFlashTimeoutId);
      installFlashTimeoutId = null;
    }

    isRunning = false;
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
      updateIntervalId = null;
    }

    remainingSessionMs = selectedMaterialCount * MATERIAL_DURATION_MS;
    remainingSkillMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);
    remainingErdaMs = 60 * 1000;

    btnSessionStart.disabled = false;
    btnSessionPause.disabled = true;

    togglePresetButtonsDisabled(false);
    updateDisplays();
  }

  function updateDemoButtonState() {
    if (!btnSessionDemo) return;
    const isRealTimerActive = isRunning || isCountingDown || (remainingSessionMs !== selectedMaterialCount * MATERIAL_DURATION_MS);
    btnSessionDemo.disabled = isRealTimerActive || isSessionDemoRunning;
  }

  function startSessionCompleteDemo() {
    if (isRunning || isCountingDown || isSessionDemoRunning || (remainingSessionMs !== selectedMaterialCount * MATERIAL_DURATION_MS)) return;

    hideSessionCompleteMessage();
    hideSkillAlert();
    hideErdaAlert();

    isSessionDemoRunning = true;
    updateDemoButtonState();

    togglePresetButtonsDisabled(true);
    btnSessionStart.disabled = true;
    btnSessionPause.disabled = true;

    // First and only countdown: Session completion demo (3 -> 2 -> 1)
    runDemoCountdown(3, () => {
      // Trigger session complete effects
      playSessionCompleteSound();
      flashSessionCard();
      showSessionCompleteMessage();

      // Wait 800ms, then directly trigger install demo alerts (Janus & Erda) without second countdown
      demoTransitionTimeoutId = setTimeout(() => {
        demoTransitionTimeoutId = null;

        playAlertSound("skill");
        flashInstallCard();

        // Show both messages regardless of settings to preview both alert types
        showSkillAlert();
        showErdaAlert();

        // Schedule automatic cleanup after 3 seconds
        demoCleanupTimeoutId = setTimeout(() => {
          demoCleanupTimeoutId = null;
          cleanupDemoState();
        }, 3000);
      }, 800);
    });
  }

  function runDemoCountdown(startValue, onComplete) {
    demoCountdownValue = startValue;
    const overlay = document.getElementById("countdownOverlay");
    const numEl = document.getElementById("countdownNumber");

    if (overlay && numEl) {
      overlay.classList.remove("hidden");
      numEl.textContent = demoCountdownValue;

      numEl.style.animation = 'none';
      numEl.offsetHeight; // trigger reflow
      numEl.style.animation = '';
    }

    initAudio();

    function tickDemo() {
      if (!isSessionDemoRunning) return;

      demoCountdownValue--;
      if (demoCountdownValue > 0) {
        if (numEl) {
          numEl.textContent = demoCountdownValue;
          numEl.style.animation = 'none';
          numEl.offsetHeight; // trigger reflow
          numEl.style.animation = '';
        }
        demoCountdownTimerId = setTimeout(tickDemo, 1000);
      } else {
        if (overlay) {
          overlay.classList.add("hidden");
        }
        demoCountdownTimerId = null;
        onComplete();
      }
    }

    demoCountdownTimerId = setTimeout(tickDemo, 1000);
  }

  function cleanupDemoState() {
    isSessionDemoRunning = false;
    if (demoCountdownTimerId) {
      clearTimeout(demoCountdownTimerId);
      demoCountdownTimerId = null;
    }
    if (demoTransitionTimeoutId) {
      clearTimeout(demoTransitionTimeoutId);
      demoTransitionTimeoutId = null;
    }
    if (demoCleanupTimeoutId) {
      clearTimeout(demoCleanupTimeoutId);
      demoCleanupTimeoutId = null;
    }
    
    const overlay = document.getElementById("countdownOverlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }

    hideSessionCompleteMessage();
    hideSkillAlert();
    hideErdaAlert();

    const sessionCard = document.querySelector(".session-timer-card");
    if (sessionCard) {
      sessionCard.classList.remove("is-session-complete-flashing");
    }
    if (sessionFlashTimeoutId) {
      clearTimeout(sessionFlashTimeoutId);
      sessionFlashTimeoutId = null;
    }

    const installCard = document.querySelector(".install-timer-card");
    if (installCard) {
      installCard.classList.remove("is-install-alert-flashing");
    }
    if (installFlashTimeoutId) {
      clearTimeout(installFlashTimeoutId);
      installFlashTimeoutId = null;
    }

    if (!isRunning) {
      btnSessionStart.disabled = false;
      btnSessionPause.disabled = true;
      togglePresetButtonsDisabled(false);
    }
    updateDemoButtonState();
  }

  function flashSessionCard() {
    const card = document.querySelector(".session-timer-card");
    if (!card) return;
    
    card.classList.remove("is-session-complete-flashing");
    void card.offsetWidth; // trigger reflow
    card.classList.add("is-session-complete-flashing");
    
    if (sessionFlashTimeoutId) {
      clearTimeout(sessionFlashTimeoutId);
    }
    sessionFlashTimeoutId = setTimeout(() => {
      card.classList.remove("is-session-complete-flashing");
      sessionFlashTimeoutId = null;
    }, 4200);
  }

  function flashInstallCard() {
    const card = document.querySelector(".install-timer-card");
    if (!card) return;
    
    card.classList.remove("is-install-alert-flashing");
    void card.offsetWidth; // trigger reflow
    card.classList.add("is-install-alert-flashing");
    
    if (installFlashTimeoutId) {
      clearTimeout(installFlashTimeoutId);
    }
    installFlashTimeoutId = setTimeout(() => {
      card.classList.remove("is-install-alert-flashing");
      installFlashTimeoutId = null;
    }, 2200);
  }

  function showSessionCompleteMessage() {
    if (sessionCompleteMessage) {
      sessionCompleteMessage.classList.add("show");
    }
  }

  function hideSessionCompleteMessage() {
    if (sessionCompleteMessage) {
      sessionCompleteMessage.classList.remove("show");
    }
  }

  // 설치기 만료 시 시각 알림 활성화
  function showSkillAlert() {
    if (skillAlertMessage) {
      skillAlertMessage.classList.add("show", "is-flashing");
    }
  }

  function hideSkillAlert() {
    if (skillAlertMessage) {
      skillAlertMessage.classList.remove("show", "is-flashing");
    }
  }

  function showErdaAlert() {
    if (erdaAlertMessage) {
      erdaAlertMessage.classList.add("show", "is-flashing");
    }
  }

  function hideErdaAlert() {
    if (erdaAlertMessage) {
      erdaAlertMessage.classList.remove("show", "is-flashing");
    }
  }

  function togglePresetButtonsDisabled(disabled) {
    toggleMaterialButtonsDisabled(disabled);
    skillPresets.forEach(btn => btn.disabled = disabled);
    if (btnErdaEnabled) {
      const isJanusHighLevel = selectedSkillSeconds === 80 || selectedSkillSeconds === 120;
      btnErdaEnabled.disabled = disabled || isJanusHighLevel;
    }
    if (btnErdaDisabled) btnErdaDisabled.disabled = disabled;
    magnetPetButtons.forEach(btn => btn.disabled = disabled);

    if (lunaGatheringCountInput) lunaGatheringCountInput.disabled = disabled;
    if (btnApplyLunaGatheringCount) btnApplyLunaGatheringCount.disabled = disabled;
    if (btnResetLunaGatheringCount) btnResetLunaGatheringCount.disabled = disabled;
  }

  function applyManualLunaGatheringCount() {
    if (isRunning || isCountingDown || isSessionDemoRunning) return;
    if (!lunaGatheringCountInput) return;

    let rawVal = parseInt(lunaGatheringCountInput.value, 10);
    if (isNaN(rawVal)) {
      lunaGatheringCountInput.value = String(lunaGatheringCount);
      return;
    }

    const normalizedCount = Math.min(Math.max(rawVal, 0), LUNA_GATHERING_DAILY_LIMIT);
    lunaGatheringCount = normalizedCount;
    saveLunaGatheringData();
    updateDisplays();
  }

  function resetManualLunaGatheringCount() {
    if (isRunning || isCountingDown || isSessionDemoRunning) return;

    const confirmed = window.confirm("오늘의 루나 게더링 사용 횟수를 0회로 초기화하시겠습니까?");
    if (!confirmed) return;

    lunaGatheringCount = 0;
    saveLunaGatheringData();
    updateDisplays();
  }

  function adjustMaterialCount(delta) {
    if (isRunning || isCountingDown || isSessionDemoRunning) return;

    selectedMaterialCount += delta;
    if (selectedMaterialCount < 1) selectedMaterialCount = 1;
    if (selectedMaterialCount > 10) selectedMaterialCount = 10;

    selectedSessionMinutes = selectedMaterialCount * 30;
    remainingSessionMs = selectedSessionMinutes * 60 * 1000;

    updateDisplays();
    saveSettings();
  }

  function setErdaEnabled(enabled) {
    if (isRunning || isCountingDown || isSessionDemoRunning) return;
    if (enabled && (selectedSkillSeconds === 80 || selectedSkillSeconds === 120)) return;

    isErdaEnabled = enabled;
    saveSettings();

    if (isErdaEnabled) {
      if (btnErdaEnabled) btnErdaEnabled.classList.add("active");
      if (btnErdaDisabled) btnErdaDisabled.classList.remove("active");
      if (erdaTimerDisplayContainer) erdaTimerDisplayContainer.classList.remove("hidden");
    } else {
      if (btnErdaEnabled) btnErdaEnabled.classList.remove("active");
      if (btnErdaDisabled) btnErdaDisabled.classList.add("active");
      if (erdaTimerDisplayContainer) erdaTimerDisplayContainer.classList.add("hidden");

      // 알림 상태 및 타임아웃 해제
      isErdaAlerting = false;
      if (erdaRestartTimeoutId) {
        clearTimeout(erdaRestartTimeoutId);
        erdaRestartTimeoutId = null;
      }
      hideErdaAlert();
    }
    resetTimers();
  }

  // --- 뽀모도로 타이머 함수 시작 ---
  function togglePomodoroCollapse() {
    const isCollapsed = pomodoroCard.classList.toggle("is-collapsed");
    if (pomodoroBody) {
      pomodoroBody.hidden = isCollapsed;
    }
    if (btnPomodoroToggle) {
      btnPomodoroToggle.textContent = isCollapsed ? "펼치기" : "접기";
      btnPomodoroToggle.setAttribute("aria-expanded", !isCollapsed);
    }
    localStorage.setItem("maple_tools_pomodoro_collapsed", isCollapsed);
  }

  function startPomodoro() {
    if (isPomodoroRunning) return;

    initAudio();

    isPomodoroRunning = true;
    pomodoroEndAt = Date.now() + remainingPomodoroMs;

    if (btnPomodoroStart) btnPomodoroStart.disabled = true;
    if (btnPomodoroPause) btnPomodoroPause.disabled = false;

    pomodoroIntervalId = setInterval(() => {
      const currentTime = Date.now();
      remainingPomodoroMs = pomodoroEndAt - currentTime;

      if (remainingPomodoroMs <= 0) {
        remainingPomodoroMs = 0;
        updatePomodoroDisplay();
        handlePomodoroPhaseComplete();
        return;
      }

      updatePomodoroDisplay();
    }, 100);
  }

  function pausePomodoro() {
    if (pomodoroTransitionTimeoutId) {
      clearTimeout(pomodoroTransitionTimeoutId);
      pomodoroTransitionTimeoutId = null;
      transitionToNextPomodoroPhase(false); // Move to next phase paused
      return;
    }

    if (!isPomodoroRunning) return;

    isPomodoroRunning = false;
    if (pomodoroIntervalId) {
      clearInterval(pomodoroIntervalId);
      pomodoroIntervalId = null;
    }

    const currentTime = Date.now();
    remainingPomodoroMs = Math.max(0, pomodoroEndAt - currentTime);

    if (btnPomodoroStart) btnPomodoroStart.disabled = false;
    if (btnPomodoroPause) btnPomodoroPause.disabled = true;
    updatePomodoroDisplay();
  }

  function resetPomodoro() {
    if (pomodoroIntervalId) {
      clearInterval(pomodoroIntervalId);
      pomodoroIntervalId = null;
    }
    if (pomodoroTransitionTimeoutId) {
      clearTimeout(pomodoroTransitionTimeoutId);
      pomodoroTransitionTimeoutId = null;
    }

    isPomodoroRunning = false;
    pomodoroMode = "focus";
    pomodoroFocusCount = 0;
    pomodoroBreakCount = 0;
    remainingPomodoroMs = POMODORO_FOCUS_MS;

    hidePomodoroAlert();
    
    if (pomodoroCard) {
      pomodoroCard.classList.remove("is-pomodoro-flashing");
    }
    if (pomodoroFlashTimeoutId) {
      clearTimeout(pomodoroFlashTimeoutId);
      pomodoroFlashTimeoutId = null;
    }

    updatePomodoroDisplay();
    updatePomodoroModeText();
    updatePomodoroCounters();

    if (btnPomodoroStart) btnPomodoroStart.disabled = false;
    if (btnPomodoroPause) btnPomodoroPause.disabled = true;
  }

  function updatePomodoroDisplay() {
    if (pomodoroDisplay) {
      pomodoroDisplay.textContent = formatMs(remainingPomodoroMs);
    }
  }

  function updatePomodoroModeText() {
    const modeIcon = document.querySelector(".pomodoro-icon");
    if (pomodoroModeText) {
      if (pomodoroMode === "focus") {
        pomodoroModeText.textContent = "집중 — 방해 금지, 한 작업만";
        if (modeIcon) modeIcon.textContent = "📚";
      } else if (pomodoroMode === "shortBreak") {
        pomodoroModeText.textContent = "휴식 — 자리에서 일어나기, 물 마시기, 스트레칭";
        if (modeIcon) modeIcon.textContent = "🥤";
      } else if (pomodoroMode === "longBreak") {
        pomodoroModeText.textContent = "긴 휴식 — 오래 앉아 있었으니 충분히 쉬어가기";
        if (modeIcon) modeIcon.textContent = "🥤";
      }
    }
  }

  function updatePomodoroCounters() {
    if (pomodoroFocusCounter) {
      pomodoroFocusCounter.textContent = `집중 ${pomodoroFocusCount} / 4`;
    }
    if (pomodoroBreakCounter) {
      pomodoroBreakCounter.textContent = `휴식 ${pomodoroBreakCount}`;
    }
  }

  function handlePomodoroPhaseComplete() {
    if (pomodoroIntervalId) {
      clearInterval(pomodoroIntervalId);
      pomodoroIntervalId = null;
    }
    isPomodoroRunning = false;

    // Play beep sound (existing install alert beep function)
    playAlertSound("skill");

    // Flash card softly
    flashPomodoroCard();

    // Determine message and count increments
    let alertMsg = "";
    if (pomodoroMode === "focus") {
      pomodoroFocusCount++;
      alertMsg = "집중 시간이 끝났습니다! 잠깐 쉬어가세요.";
    } else if (pomodoroMode === "shortBreak") {
      pomodoroBreakCount++;
      alertMsg = "휴식이 끝났습니다! 다시 집중할 시간입니다.";
    } else if (pomodoroMode === "longBreak") {
      pomodoroFocusCount = 0;
      pomodoroBreakCount = 0;
      alertMsg = "긴 휴식이 끝났습니다! 새 뽀모도로를 시작할 준비가 됐습니다.";
    }
    showPomodoroAlert(alertMsg);
    updatePomodoroCounters();

    // Disable start/pause button during transition
    if (btnPomodoroStart) btnPomodoroStart.disabled = true;
    if (btnPomodoroPause) btnPomodoroPause.disabled = false; // Allow skip/pause during transition

    pomodoroTransitionTimeoutId = setTimeout(() => {
      pomodoroTransitionTimeoutId = null;
      transitionToNextPomodoroPhase(true); // Auto start next phase
    }, 2000);
  }

  function transitionToNextPomodoroPhase(autoStart) {
    if (pomodoroMode === "focus") {
      if (pomodoroFocusCount >= POMODORO_MAX_FOCUS) {
        pomodoroMode = "longBreak";
        remainingPomodoroMs = POMODORO_LONG_BREAK_MS;
      } else {
        pomodoroMode = "shortBreak";
        remainingPomodoroMs = POMODORO_SHORT_BREAK_MS;
      }
    } else {
      pomodoroMode = "focus";
      remainingPomodoroMs = POMODORO_FOCUS_MS;
    }

    hidePomodoroAlert();
    updatePomodoroModeText();
    updatePomodoroDisplay();

    if (btnPomodoroStart) btnPomodoroStart.disabled = false;
    if (btnPomodoroPause) btnPomodoroPause.disabled = true;

    if (autoStart) {
      startPomodoro();
    }
  }

  // Flash card animation
  function flashPomodoroCard() {
    if (!pomodoroCard) return;

    pomodoroCard.classList.remove("is-pomodoro-flashing");
    void pomodoroCard.offsetWidth; // trigger reflow
    pomodoroCard.classList.add("is-pomodoro-flashing");

    if (pomodoroFlashTimeoutId) {
      clearTimeout(pomodoroFlashTimeoutId);
    }
    pomodoroFlashTimeoutId = setTimeout(() => {
      pomodoroCard.classList.remove("is-pomodoro-flashing");
      pomodoroFlashTimeoutId = null;
    }, 2200);
  }

  function showPomodoroAlert(msg) {
    if (pomodoroAlertMessage) {
      pomodoroAlertMessage.textContent = msg;
      pomodoroAlertMessage.classList.add("show");
    }
  }

  function hidePomodoroAlert() {
    if (pomodoroAlertMessage) {
      pomodoroAlertMessage.classList.remove("show");
      pomodoroAlertMessage.textContent = "";
    }
  }
  // --- 뽀모도로 타이머 함수 끝 ---

  // 6. 이벤트 리스너 바인딩
  function setupEventListeners() {
    // 세션 타이머 제어
    btnSessionStart.addEventListener("click", handleStartClick);
    btnSessionPause.addEventListener("click", pauseTimers);
    btnSessionReset.addEventListener("click", () => resetTimers(false));

    if (btnSessionDemo) {
      btnSessionDemo.addEventListener("click", startSessionCompleteDemo);
    }

    // 에르다 샤워 사용 여부 변경
    if (btnErdaEnabled && btnErdaDisabled) {
      btnErdaEnabled.addEventListener("click", () => setErdaEnabled(true));
      btnErdaDisabled.addEventListener("click", () => setErdaEnabled(false));
    }

    // 소재 수량 조절 버튼
    if (btnMaterialMinus) {
      btnMaterialMinus.addEventListener("click", () => adjustMaterialCount(-1));
    }
    if (btnMaterialPlus) {
      btnMaterialPlus.addEventListener("click", () => adjustMaterialCount(1));
    }

    // 스킬 프리셋 변경
    skillPresets.forEach(btn => {
      btn.addEventListener("click", () => {
        if (isRunning || isCountingDown || isSessionDemoRunning) return;

        skillPresets.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        selectedSkillSeconds = parseInt(btn.dataset.seconds, 10);
        remainingSkillMs = JANUS_BASE_DURATION_MS_BY_LEVEL[selectedSkillSeconds] ?? (selectedSkillSeconds * 1000);

        // 야누스 고레벨일 경우 에르다 자동 해제
        if (selectedSkillSeconds === 80 || selectedSkillSeconds === 120) {
          setErdaEnabled(false);
        }

        hideLunaExtensionPulse();
        updateDisplays();
        saveSettings();
      });
    });

    // 자석펫 모드 버튼 선택
    magnetPetButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        setMagnetPetMode(btn.dataset.magnetPetMode);
      });
    });

    // 루나 게더링 횟수 관리 버튼 및 엔터키 입력
    if (btnApplyLunaGatheringCount) {
      btnApplyLunaGatheringCount.addEventListener("click", applyManualLunaGatheringCount);
    }
    if (btnResetLunaGatheringCount) {
      btnResetLunaGatheringCount.addEventListener("click", resetManualLunaGatheringCount);
    }
    if (lunaGatheringCountInput) {
      lunaGatheringCountInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          applyManualLunaGatheringCount();
        }
      });
    }

    // 뽀모도로 타이머 제어
    if (pomodoroHeader) {
      pomodoroHeader.addEventListener("click", togglePomodoroCollapse);
    }
    if (btnPomodoroStart) {
      btnPomodoroStart.addEventListener("click", startPomodoro);
    }
    if (btnPomodoroPause) {
      btnPomodoroPause.addEventListener("click", pausePomodoro);
    }
    if (btnPomodoroReset) {
      btnPomodoroReset.addEventListener("click", resetPomodoro);
    }
  }

  // 타이머 작동 시작
  document.addEventListener("DOMContentLoaded", init);
})();

