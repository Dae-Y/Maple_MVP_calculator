(function () {
  // DEBUG: 테스트할 때는 1소재 시간을 30초로 바꾸려면 아래 MATERIAL_DURATION_MS만 수정.
  const MATERIAL_DURATION_MS = 30 * 60 * 1000; // 실사용: 1소재 = 30분
  // const MATERIAL_DURATION_MS = 30 * 1000; // 테스트용: 1소재 = 30초

  // DOM 요소
  const sessionDisplay = document.getElementById("sessionTimerDisplay");
  const skillDisplay = document.getElementById("skillTimerDisplay");
  const skillAlertMessage = document.getElementById("skillAlertMessage");

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
  const checklistItems = document.querySelectorAll(".chk-reminder");

  // 타이머 관련 변수 (기본값)
  let selectedMaterialCount = 1;
  let selectedSessionMinutes = 30;
  let selectedSkillSeconds = 60;

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
  let remainingSkillMs = selectedSkillSeconds * 1000;
  let remainingErdaMs = 60 * 1000;

  let sessionEndAt = null;
  let skillEndAt = null;
  let erdaEndAt = null;
  let updateIntervalId = null;

  // 데모 및 플래시 관련 상태 변수
  let isSessionDemoRunning = false;
  let demoCountdownTimerId = null;
  let demoCountdownValue = 5;
  let sessionFlashTimeoutId = null;
  let installFlashTimeoutId = null;

  // Web Audio Context (지연 초기화)
  let audioCtx = null;

  // 1. 초기값 및 로컬스토리지 로드
  function init() {
    loadSettings();
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

    // 설치기 주기 설정 로드
    const savedSkill = localStorage.getItem("maple_tools_skill_seconds");
    if (savedSkill) {
      selectedSkillSeconds = parseInt(savedSkill, 10);
      remainingSkillMs = selectedSkillSeconds * 1000;

      // 프리셋 활성화 UI 업데이트
      skillPresets.forEach(btn => {
        if (parseInt(btn.dataset.seconds, 10) === selectedSkillSeconds) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // 에르다 샤워 사용 여부 로드 (기본값: 미사용 / false)
    const savedErda = localStorage.getItem("maple_tools_erda_enabled");
    if (savedErda !== null) {
      isErdaEnabled = savedErda === "true";
    } else {
      isErdaEnabled = false;
    }

    // UI 업데이트
    if (isErdaEnabled) {
      if (btnErdaEnabled) btnErdaEnabled.classList.add("active");
      if (btnErdaDisabled) btnErdaDisabled.classList.remove("active");
      if (erdaTimerDisplayContainer) erdaTimerDisplayContainer.classList.remove("hidden");
    } else {
      if (btnErdaEnabled) btnErdaEnabled.classList.remove("active");
      if (btnErdaDisabled) btnErdaDisabled.classList.add("active");
      if (erdaTimerDisplayContainer) erdaTimerDisplayContainer.classList.add("hidden");
    }

    // 체크리스트 상태 로드
    const savedChecklist = localStorage.getItem("maple_tools_checklist");
    if (savedChecklist) {
      try {
        const checkedStates = JSON.parse(savedChecklist);
        checklistItems.forEach((chk, index) => {
          if (checkedStates[index] !== undefined) {
            chk.checked = checkedStates[index];
            toggleChecklistItemClass(chk);
          }
        });
      } catch (e) {
        console.error("Failed to parse checklist states:", e);
      }
    }
  }

  // 로컬스토리지에 현재 설정값 저장
  function saveSettings() {
    localStorage.setItem("maple_tools_material_count", selectedMaterialCount);
    localStorage.setItem("maple_tools_skill_seconds", selectedSkillSeconds);
    localStorage.setItem("maple_tools_erda_enabled", isErdaEnabled);
  }

  // 로컬스토리지에 체크리스트 상태 저장
  function saveChecklist() {
    const checkedStates = Array.from(checklistItems).map(chk => chk.checked);
    localStorage.setItem("maple_tools_checklist", JSON.stringify(checkedStates));
  }

  // 체크리스트 아이템 CSS 클래스 변경
  function toggleChecklistItemClass(chk) {
    const label = chk.closest(".checklist-item");
    if (label) {
      if (chk.checked) {
        label.classList.add("checked");
      } else {
        label.classList.remove("checked");
      }
    }
  }

  // 2. 디스플레이 갱신 함수
  function updateDisplays() {
    sessionDisplay.textContent = formatMs(remainingSessionMs);
    skillDisplay.textContent = formatMs(remainingSkillMs);
    if (isErdaEnabled && erdaTimerDisplay) {
      erdaTimerDisplay.textContent = formatMs(remainingErdaMs);
    }
    updateMaterialDisplay();
    updateDemoButtonState();
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
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  // 3. Web Audio API 사운드 생성
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

  // 4. 타이머 루프 제어 (고정밀 Date.now() 경과 시간 기준)
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

    btnSessionStart.disabled = true;
    btnSessionPause.disabled = false;

    // 프리셋 버튼 변경 비활성화 (동작 중일 때 혼란 방지)
    togglePresetButtonsDisabled(true);

    updateIntervalId = setInterval(() => {
      const currentTime = Date.now();

      remainingSessionMs = sessionEndAt - currentTime;

      // 솔 야누스 타이머 틱
      if (!isSkillAlerting) {
        remainingSkillMs = skillEndAt - currentTime;

        // 설치기 타이머 만료 시
        if (remainingSkillMs <= 0) {
          triggerSkillAlert();
        }
      } else {
        remainingSkillMs = 0;
      }

      // 에르다 샤워 타이머 틱
      if (isErdaEnabled) {
        if (!isErdaAlerting) {
          remainingErdaMs = erdaEndAt - currentTime;

          // 에르다 샤워 만료 시
          if (remainingErdaMs <= 0) {
            triggerErdaAlert();
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

    skillEndAt = Date.now() + (selectedSkillSeconds * 1000);
    remainingSkillMs = selectedSkillSeconds * 1000;
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

  function pauseTimers() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(updateIntervalId);
    updateIntervalId = null;

    // 멈춘 시점의 잔여 시간 확정 계산
    const currentTime = Date.now();
    remainingSessionMs = Math.max(0, sessionEndAt - currentTime);

    // 야누스 타이머 일시정지 처리
    if (isSkillAlerting) {
      isSkillAlerting = false;
      if (skillRestartTimeoutId) {
        clearTimeout(skillRestartTimeoutId);
        skillRestartTimeoutId = null;
      }
      hideSkillAlert();
      remainingSkillMs = selectedSkillSeconds * 1000;
    } else {
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
      } else {
        remainingErdaMs = Math.max(0, erdaEndAt - currentTime);
      }
    }

    btnSessionStart.disabled = false;
    btnSessionPause.disabled = true;

    // Enable presets on pause
    togglePresetButtonsDisabled(false);
    updateDemoButtonState();
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

    // 야누스 알림 해제
    if (skillRestartTimeoutId) {
      clearTimeout(skillRestartTimeoutId);
      skillRestartTimeoutId = null;
    }
    isSkillAlerting = false;
    hideSkillAlert();

    // 에르다 샤워 알림 해제
    if (erdaRestartTimeoutId) {
      clearTimeout(erdaRestartTimeoutId);
      erdaRestartTimeoutId = null;
    }
    isErdaAlerting = false;
    hideErdaAlert();

    // 데모 상태 해제
    if (isSessionDemoRunning) {
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
    remainingSkillMs = selectedSkillSeconds * 1000;
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

    isSessionDemoRunning = true;
    updateDemoButtonState();

    togglePresetButtonsDisabled(true);
    btnSessionStart.disabled = true;
    btnSessionPause.disabled = true;

    demoCountdownValue = 3;
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
        
        playSessionCompleteSound();
        flashSessionCard();
        showSessionCompleteMessage();
        
        setTimeout(() => {
          alert("사냥 세션 종료 알림 데모입니다.");
        }, 50);

        cleanupDemoState();
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
    
    const overlay = document.getElementById("countdownOverlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }

    btnSessionStart.disabled = false;
    btnSessionPause.disabled = true;
    togglePresetButtonsDisabled(false);
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
    if (btnErdaEnabled) btnErdaEnabled.disabled = disabled;
    if (btnErdaDisabled) btnErdaDisabled.disabled = disabled;
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

  // 5. 이벤트 리스너 바인딩
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
        remainingSkillMs = selectedSkillSeconds * 1000;

        updateDisplays();
        saveSettings();
      });
    });

    // 체크리스트 작동 및 변경사항 로컬스토리지 연동
    checklistItems.forEach(chk => {
      chk.addEventListener("change", () => {
        toggleChecklistItemClass(chk);
        saveChecklist();
      });
    });
  }

  // 타이머 작동 시작
  document.addEventListener("DOMContentLoaded", init);
})();
