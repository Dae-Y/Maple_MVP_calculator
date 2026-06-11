document.addEventListener("DOMContentLoaded", () => {
  const WEEKLY_CRYSTAL_LIMIT = 90;
  const CHARACTER_WEEKLY_BOSS_LIMIT = 12;
  const STORAGE_KEY = "maple_tools_boss_income_characters_v1";
  const ACTIVE_CHARACTER_KEY = "maple_tools_boss_income_active_character_v1";
  const BOSS_SECTION_COLLAPSE_KEY = "maple_tools_boss_income_section_collapse_v1";

  // State
  let characters = []; // Array of character objects
  let activeCharacterId = null;
  let crystalPriceData = null;
  const bossUiStates = {}; // Temp UI state for bosses: { ["period:bossId"]: { difficultyId, partySize } }

  let sectionCollapseStates = {
    daily: true,
    weekly: false,
    monthly: true
  };

  // DOM Elements
  const bossListContainer = document.getElementById("bossList");
  
  // Top Overview Card
  const crystalCountEl = document.getElementById("crystalCount");
  const totalMesoEl = document.getElementById("totalMeso");
  const limitMeterBar = document.getElementById("limitMeterBar");
  const weeklyLimitWarningEl = document.getElementById("weeklyLimitWarning");

  // Character column
  const characterListEl = document.getElementById("characterList");
  const addCharForm = document.getElementById("addCharForm");
  const charNameInput = document.getElementById("charNameInput");
  const charJobInput = document.getElementById("charJobInput");
  const addCharacterButton = document.getElementById("addCharacterButton");
  const saveCharacterButton = document.getElementById("saveCharacterButton");

  // Middle column badge
  const activeCharBadge = document.getElementById("activeCharBadge");

  // Right column details
  const selectedCharInfo = document.getElementById("selectedCharInfo");
  const charCrystalCountEl = document.getElementById("charCrystalCount");
  const charMonthlyCountEl = document.getElementById("charMonthlyCount");
  const monthlyCompletionStatusEl = document.getElementById("monthlyCompletionStatus");
  const summaryWeekLabelEl = document.getElementById("summaryWeekLabel");
  const charMesoCountEl = document.getElementById("charMesoCount");
  const totalCrystalCountEl = document.getElementById("totalCrystalCount");
  const totalMesoCountEl = document.getElementById("totalMesoCount");
  const charLimitWarningEl = document.getElementById("charLimitWarning");
  const totalLimitWarningEl = document.getElementById("totalLimitWarning");
  const selectedBossListEl = document.getElementById("selectedBossList");
  const resetCharBtn = document.getElementById("resetCharBtn");
  const resetAllBtn = document.getElementById("resetAllBtn");

  // Meso formatting helper (e.g. 1억 2300만, 1500만)
  function formatMesoKorean(value) {
    if (value === 0) return "0 메소";
    
    const eok = Math.floor(value / 100000000);
    const man = Math.floor((value % 100000000) / 10000);
    
    let result = [];
    if (eok > 0) result.push(`${eok}억`);
    if (man > 0) result.push(`${man}만`);
    
    return result.join(" ") + " 메소";
  }

  // Get price from JSON
  function getCrystalPrice(bossId, diffId) {
    if (crystalPriceData && crystalPriceData.prices && crystalPriceData.prices[bossId]) {
      const price = crystalPriceData.prices[bossId][diffId];
      if (typeof price === "number") return price;
    }
    return 0; // Fallback
  }

  // Helper to filter difficulties by period
  function getBossDifficultiesForPeriod(boss, period) {
    if (!crystalPriceData || !crystalPriceData.periods || !crystalPriceData.periods[boss.id]) {
      // If periods mapping is missing, default to filtering everything as "weekly" as fallback
      if (period === "weekly") {
        return boss.difficulties;
      }
      return [];
    }
    const bossPeriods = crystalPriceData.periods[boss.id];
    return boss.difficulties.filter(diff => bossPeriods[diff.id] === period);
  }

  // Helper to check if period is calculable (included in income/counts)
  function isCalculablePeriod(period) {
    return period === "weekly" || period === "monthly";
  }

  // KST Date and Time Helpers
  function getKstMonthKey(date = new Date()) {
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function getKstIsoString(date = new Date()) {
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(kstDate.getUTCDate()).padStart(2, "0");
    const hours = String(kstDate.getUTCHours()).padStart(2, "0");
    const minutes = String(kstDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(kstDate.getUTCSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
  }

  function formatKstCompletionDate(isoString) {
    if (!isoString) return "";
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      return `${month}월 ${day}일 완료`;
    }
    return "완료";
  }

  function formatKstMonthDay(dateValue) {
    if (!dateValue) return "";
    const match = dateValue.match(/^\d{4}-(\d{2})-(\d{2})/);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      return `${month}월 ${day}일`;
    }
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return "";
    }
  }

  function getKstMonthWeekLabel(date = new Date()) {
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const month = kstDate.getUTCMonth() + 1;
    const day = kstDate.getUTCDate();
    const week = Math.ceil(day / 7);
    return `${month}월 ${week}주차`;
  }

  // Migrate legacy format from storage
  function migrateCharacterData(char) {
    if (!char.selectedBosses) {
      char.selectedBosses = {};
    }
    if (!char.monthlyRecords) {
      char.monthlyRecords = {};
    }

    const currentMonthKey = getKstMonthKey();
    const now = new Date();

    // 1. Process selectedBosses to extract any monthly selections and move them to monthlyRecords
    Object.keys(char.selectedBosses).forEach(key => {
      const val = char.selectedBosses[key];
      if (!val) return;

      const parts = key.split(":");
      const period = val.period || parts[0];
      const bossId = val.bossId || parts[1];

      // Handle daily cleanup (remove from selectedBosses)
      if (period === "daily") {
        delete char.selectedBosses[key];
        return;
      }

      if (period === "monthly") {
        const monthKey = val.monthKey || currentMonthKey;
        const completedAt = val.completedAt || getKstIsoString(now);
        
        // Only keep if the monthKey matches current month
        if (monthKey === currentMonthKey) {
          const recordKey = `${monthKey}:${bossId}`;
          char.monthlyRecords[recordKey] = {
            bossId: bossId,
            period: "monthly",
            difficultyId: val.difficultyId || "hard",
            partySize: val.partySize || 1,
            completedAt: completedAt,
            monthKey: monthKey
          };
        }
        delete char.selectedBosses[key];
      }
    });

    // 2. Also run normal migration for old styles (e.g. zaqqum:chaos) if any remain
    const newSelected = {};
    Object.keys(char.selectedBosses).forEach(key => {
      const val = char.selectedBosses[key];
      if (!val) return;

      const parts = key.split(":");
      const isTargetFormat = parts.length === 2 && ["daily", "weekly", "monthly"].includes(parts[0]);

      if (isTargetFormat) {
        if (parts[0] === "daily" || parts[0] === "monthly") {
          return; // Skip daily or monthly
        }
        newSelected[key] = {
          bossId: val.bossId || parts[1],
          period: val.period || parts[0],
          difficultyId: val.difficultyId,
          partySize: val.partySize || 1
        };
        return;
      }

      // Legacy format migration
      let bossId = "";
      let difficultyId = "";
      let partySize = 1;

      if (parts.length === 2) {
        bossId = parts[0];
        difficultyId = parts[1];
        partySize = 1;
      } else if (parts.length === 1) {
        bossId = key;
        difficultyId = val.difficultyId;
        partySize = val.partySize || 1;
      }

      if (!bossId || !difficultyId) {
        return;
      }

      let period = null;
      if (crystalPriceData && crystalPriceData.periods && crystalPriceData.periods[bossId]) {
        period = crystalPriceData.periods[bossId][difficultyId];
      }

      if (!period) {
        const boss = BOSS_DATA.find(b => b.id === bossId);
        if (boss) {
          const hasDiff = boss.difficulties.some(d => d.id === difficultyId);
          if (hasDiff) {
            if (crystalPriceData && crystalPriceData.prices && crystalPriceData.prices[bossId] && (typeof crystalPriceData.prices[bossId][difficultyId] === 'number')) {
              period = "weekly";
            }
          }
        }
      }

      if (period === "weekly") {
        const newKey = `${period}:${bossId}`;
        newSelected[newKey] = {
          bossId: bossId,
          period: period,
          difficultyId: difficultyId,
          partySize: partySize
        };
      } else if (period === "monthly") {
        const monthKey = currentMonthKey;
        const recordKey = `${monthKey}:${bossId}`;
        char.monthlyRecords[recordKey] = {
          bossId: bossId,
          period: "monthly",
          difficultyId: difficultyId,
          partySize: partySize,
          completedAt: getKstIsoString(now),
          monthKey: monthKey
        };
      }
    });

    char.selectedBosses = newSelected;
  }

  // Populate UI states based on current active character selections
  function populateUiStates() {
    const periods = ["daily", "weekly", "monthly"];
    periods.forEach(period => {
      BOSS_DATA.forEach(boss => {
        const filteredDiffs = getBossDifficultiesForPeriod(boss, period);
        if (filteredDiffs.length > 0) {
          const key = `${period}:${boss.id}`;
          bossUiStates[key] = {
            difficultyId: filteredDiffs[0].id,
            partySize: 1
          };
        }
      });
    });
    
    const activeChar = getActiveCharacter();
    if (activeChar) {
      // 1. Populate weekly
      if (activeChar.selectedBosses) {
        Object.keys(activeChar.selectedBosses).forEach(selectionKey => {
          const selection = activeChar.selectedBosses[selectionKey];
          if (selection) {
            const key = selectionKey;
            const bossId = selection.bossId || selectionKey.split(":")[1];
            const period = selection.period || selectionKey.split(":")[0];
            if (period !== "weekly") return;
            const boss = BOSS_DATA.find(b => b.id === bossId);
            const filteredDiffs = boss ? getBossDifficultiesForPeriod(boss, period) : [];
            const defaultDiffId = filteredDiffs.length > 0 ? filteredDiffs[0].id : "";
            
            bossUiStates[key] = {
              difficultyId: selection.difficultyId || defaultDiffId,
              partySize: selection.partySize || 1
            };
          }
        });
      }

      // 2. Populate monthly
      if (activeChar.monthlyRecords) {
        const currentMonthKey = getKstMonthKey();
        Object.keys(activeChar.monthlyRecords).forEach(recordKey => {
          const record = activeChar.monthlyRecords[recordKey];
          if (record && record.monthKey === currentMonthKey) {
            const key = `monthly:${record.bossId}`;
            const boss = BOSS_DATA.find(b => b.id === record.bossId);
            const filteredDiffs = boss ? getBossDifficultiesForPeriod(boss, "monthly") : [];
            const defaultDiffId = filteredDiffs.length > 0 ? filteredDiffs[0].id : "";

            bossUiStates[key] = {
              difficultyId: record.difficultyId || defaultDiffId,
              partySize: record.partySize || 1
            };
          }
        });
      }
    }
  }

  // Boss Icon WebP / PNG Fallback Candidate generator
  function getBossIconCandidates(iconFileName) {
    if (!iconFileName) return [];

    const candidates = [iconFileName];

    if (iconFileName.endsWith(".webp")) {
      candidates.push(iconFileName.replace(/\.webp$/i, ".png"));
    } else if (iconFileName.endsWith(".png")) {
      candidates.push(iconFileName.replace(/\.png$/i, ".webp"));
    }

    return candidates.map((fileName) => `${BOSS_ICON_BASE}${fileName}`);
  }

  // Attach fallback listeners to image
  function attachBossIconFallback(img, iconFileName) {
    const candidates = getBossIconCandidates(iconFileName);
    let index = 0;

    img.src = candidates[index] || "";
    img.onerror = () => {
      index += 1;

      if (index < candidates.length) {
        img.src = candidates[index];
        return;
      }

      img.onerror = null;
      img.removeAttribute("src");
      img.classList.add("is-missing");
    };
  }

  // Load state from LocalStorage
  function loadState() {
    try {
      const storedChars = localStorage.getItem(STORAGE_KEY);
      if (storedChars) {
        characters = JSON.parse(storedChars);
        // Migrate data
        characters.forEach(migrateCharacterData);

        // Auto reset expired monthly selections and daily selections
        const currentMonthKey = getKstMonthKey();
        let cleanupHappened = false;

        characters.forEach(char => {
          if (!char.monthlyRecords) {
            char.monthlyRecords = {};
            cleanupHappened = true;
          }

          // Check monthlyRecords keys and delete any where monthKey !== currentMonthKey
          Object.keys(char.monthlyRecords).forEach(key => {
            const record = char.monthlyRecords[key];
            if (record) {
              if (record.monthKey !== currentMonthKey) {
                delete char.monthlyRecords[key];
                cleanupHappened = true;
              }
            }
          });

          // Also double check selectedBosses for any lingering daily or monthly
          if (char.selectedBosses) {
            Object.keys(char.selectedBosses).forEach(key => {
              const selection = char.selectedBosses[key];
              if (selection) {
                const period = selection.period || key.split(":")[0];
                if (period === "daily" || period === "monthly") {
                  delete char.selectedBosses[key];
                  cleanupHappened = true;
                }
              }
            });
          }
        });

        if (cleanupHappened) {
          saveState();
        }
      } else {
        characters = [];
      }

      const storedCollapse = localStorage.getItem(BOSS_SECTION_COLLAPSE_KEY);
      if (storedCollapse) {
        try {
          sectionCollapseStates = JSON.parse(storedCollapse);
        } catch (e) {
          // Keep defaults
        }
      }

      const storedActiveId = localStorage.getItem(ACTIVE_CHARACTER_KEY);
      if (storedActiveId && characters.some(c => c.id === storedActiveId)) {
        activeCharacterId = storedActiveId;
      } else if (characters.length > 0) {
        activeCharacterId = characters[0].id;
      } else {
        activeCharacterId = null;
      }

      // Populate input values if there is an active character
      const activeChar = getActiveCharacter();
      if (activeChar) {
        charNameInput.value = activeChar.name;
        charJobInput.value = activeChar.job;
      } else {
        charNameInput.value = "";
        charJobInput.value = "";
      }
    } catch (e) {
      console.error("Failed to load local storage state:", e);
      characters = [];
      activeCharacterId = null;
    }
  }

  // Save state to LocalStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
      if (activeCharacterId) {
        localStorage.setItem(ACTIVE_CHARACTER_KEY, activeCharacterId);
      } else {
        localStorage.removeItem(ACTIVE_CHARACTER_KEY);
      }
    } catch (e) {
      console.error("Failed to save state to local storage:", e);
    }
  }

  // Find active character object
  function getActiveCharacter() {
    return characters.find(c => c.id === activeCharacterId) || null;
  }

  // Load prices from JSON
  async function loadCrystalPrices() {
    try {
      const response = await fetch("data/boss-income-calculator/crystal-prices.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      crystalPriceData = await response.json();
    } catch (e) {
      console.error("Failed to load crystal prices JSON. Using fallback prices of 0.", e);
      crystalPriceData = { prices: {} };
    }
  }

  // Render Left Column: Characters
  function renderCharacters() {
    if (!characterListEl) return;
    characterListEl.innerHTML = "";

    if (characters.length === 0) {
      characterListEl.innerHTML = `
        <div class="empty-state-text">
          캐릭터를 추가하면 보스 선택을 저장할 수 있습니다.
        </div>
      `;
      return;
    }

    characters.forEach(char => {
      // Calculate crystal count and income for this specific character
      // Weekly bosses only for 12 count limit
      const weeklyKeys = Object.keys(char.selectedBosses || {}).filter(key => {
        const period = char.selectedBosses[key].period || key.split(":")[0];
        return period === "weekly";
      });
      const crystalCount = weeklyKeys.length;

      let charMeso = 0;
      
      // Weekly income
      weeklyKeys.forEach(key => {
        const selection = char.selectedBosses[key];
        if (selection && selection.difficultyId) {
          const bossId = selection.bossId || key.split(":")[1];
          const basePrice = getCrystalPrice(bossId, selection.difficultyId);
          const partySize = selection.partySize || 1;
          charMeso += Math.floor(basePrice / partySize);
        }
      });

      // Monthly income (current month)
      const currentMonthKey = getKstMonthKey();
      const monthlyKeys = Object.keys(char.monthlyRecords || {}).filter(key => {
        const record = char.monthlyRecords[key];
        return record && record.monthKey === currentMonthKey;
      });
      monthlyKeys.forEach(key => {
        const record = char.monthlyRecords[key];
        if (record && record.difficultyId) {
          const basePrice = getCrystalPrice(record.bossId, record.difficultyId);
          const partySize = record.partySize || 1;
          charMeso += Math.floor(basePrice / partySize);
        }
      });

      const isActive = char.id === activeCharacterId ? "is-active" : "";
      const card = document.createElement("div");
      card.className = `character-card ${isActive}`;
      card.dataset.charId = char.id;

      card.innerHTML = `
        <div class="char-info-block">
          <div class="char-header-line">
            <span class="char-name">${char.name}</span>
            <span class="char-job">${char.job}</span>
          </div>
          <div class="char-stats-line">
            <span class="char-crystal-badge">${crystalCount} / 12</span>
            <span class="char-income">${formatMesoKorean(charMeso)}</span>
          </div>
        </div>
        <button class="btn-delete-char" type="button" aria-label="캐릭터 삭제" title="삭제">
          &times;
        </button>
      `;

      // Select character on click (except when clicking delete button)
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-delete-char")) return;
        activeCharacterId = char.id;
        // Populate inputs with current character's name/job
        charNameInput.value = char.name;
        charJobInput.value = char.job;
        saveState();
        populateUiStates();
        updateUI();
      });

      // Delete character logic
      const deleteBtn = card.querySelector(".btn-delete-char");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`'${char.name}' 캐릭터를 삭제하시겠습니까?`)) {
          characters = characters.filter(c => c.id !== char.id);
          if (activeCharacterId === char.id) {
            activeCharacterId = characters.length > 0 ? characters[0].id : null;
          }
          const activeChar = getActiveCharacter();
          if (activeChar) {
            charNameInput.value = activeChar.name;
            charJobInput.value = activeChar.job;
          } else {
            charNameInput.value = "";
            charJobInput.value = "";
          }
          saveState();
          populateUiStates();
          updateUI();
        }
      });

      characterListEl.appendChild(card);
    });
  }

  // Render Middle Column: Boss Selection List with Steppers
  function renderBosses() {
    if (!bossListContainer) return;
    bossListContainer.innerHTML = "";

    const activeChar = getActiveCharacter();
    const isDisabled = !activeChar;

    const periods = [
      { id: "daily", label: "일간 보스" },
      { id: "weekly", label: "주간 보스" },
      { id: "monthly", label: "월간 보스" }
    ];

    periods.forEach(pInfo => {
      const periodId = pInfo.id;
      const periodLabel = pInfo.label;

      const filteredBossList = [];
      BOSS_DATA.forEach(boss => {
        const diffs = getBossDifficultiesForPeriod(boss, periodId);
        if (diffs.length > 0) {
          filteredBossList.push({ boss, diffs });
        }
      });

      if (filteredBossList.length === 0) return;

      let selectedCount = 0;
      if (activeChar) {
        if (periodId === "weekly" && activeChar.selectedBosses) {
          filteredBossList.forEach(item => {
            const key = `weekly:${item.boss.id}`;
            if (activeChar.selectedBosses[key]) {
              selectedCount++;
            }
          });
        } else if (periodId === "monthly" && activeChar.monthlyRecords) {
          const currentMonthKey = getKstMonthKey();
          filteredBossList.forEach(item => {
            const recordKey = `${currentMonthKey}:${item.boss.id}`;
            if (activeChar.monthlyRecords[recordKey]) {
              selectedCount++;
            }
          });
        }
      }

      const sectionEl = document.createElement("div");
      const isCollapsed = sectionCollapseStates[periodId];
      sectionEl.className = `boss-period-section ${isCollapsed ? "is-collapsed" : ""}`;
      sectionEl.dataset.period = periodId;

      sectionEl.innerHTML = `
        <button class="boss-period-header" type="button">
          <div class="boss-period-title-group">
            <span class="boss-period-title">${periodLabel}</span>
            ${periodId !== "daily" ? `<span class="boss-period-meta">${selectedCount}개 선택</span>` : ""}
          </div>
          <span class="boss-period-toggle">${isCollapsed ? "›" : "⌄"}</span>
        </button>
        <div class="boss-period-body"></div>
      `;

      const headerBtn = sectionEl.querySelector(".boss-period-header");
      const bodyEl = sectionEl.querySelector(".boss-period-body");
      const toggleEl = sectionEl.querySelector(".boss-period-toggle");

      headerBtn.addEventListener("click", () => {
        const currentlyCollapsed = sectionEl.classList.contains("is-collapsed");
        if (currentlyCollapsed) {
          sectionEl.classList.remove("is-collapsed");
          toggleEl.textContent = "⌄";
          sectionCollapseStates[periodId] = false;
        } else {
          sectionEl.classList.add("is-collapsed");
          toggleEl.textContent = "›";
          sectionCollapseStates[periodId] = true;
        }
        try {
          localStorage.setItem(BOSS_SECTION_COLLAPSE_KEY, JSON.stringify(sectionCollapseStates));
        } catch (e) {}
      });

      if (periodId === "daily") {
        // Render note inside daily section body
        const noteEl = document.createElement("div");
        noteEl.className = "boss-period-note";
        noteEl.textContent = "일간보스 결정석은 가격 참고용으로만 표시됩니다. 이 계산기의 수익 합산에는 포함되지 않습니다.";
        bodyEl.appendChild(noteEl);

        filteredBossList.forEach(item => {
          const { boss, diffs } = item;
          const bossRow = document.createElement("div");
          bossRow.className = "daily-boss-reference-row";

          let badgeHtml = "";
          if (boss.forceType === "arcane") {
            badgeHtml = `<span class="boss-force-label boss-force-label--arcane">아케인</span>`;
          } else if (boss.forceType === "authentic") {
            badgeHtml = `<span class="boss-force-label boss-force-label--authentic">어센틱</span>`;
          }

          let chipsHtml = "";
          diffs.forEach(diff => {
            const price = getCrystalPrice(boss.id, diff.id);
            const priceText = formatMesoKorean(price).replace(" 메소", "");
            chipsHtml += `<span class="daily-boss-price-chip">${diff.label} ${priceText}</span>`;
          });

          bossRow.innerHTML = `
            <div class="boss-icon-stack">
              <div class="boss-icon-wrapper" style="width: 36px; height: 36px;">
                <img 
                  alt="${boss.name}" 
                  class="boss-icon" 
                />
              </div>
              ${badgeHtml}
            </div>
            <div class="daily-boss-info">
              <div class="boss-name" style="font-weight: 800; font-size: 13.5px; margin-bottom: 4px; color: #1e293b;">${boss.name}</div>
              <div class="daily-boss-prices">
                ${chipsHtml}
              </div>
            </div>
          `;

          const img = bossRow.querySelector(".boss-icon");
          attachBossIconFallback(img, boss.icon);

          bodyEl.appendChild(bossRow);
        });
      } else {
        if (periodId === "monthly") {
          // Render note inside monthly section body
          const noteEl = document.createElement("div");
          noteEl.className = "boss-period-note";
          noteEl.textContent = "월간 보스는 캐릭터당 월 1회 기준으로 기록됩니다. 주간 보스 12개 제한에는 포함되지 않지만, 전체 결정석 90개 제한과 수익 합산에는 포함됩니다.";
          bodyEl.appendChild(noteEl);
        }

        // Render weekly/monthly bosses as selectable rows
        filteredBossList.forEach(item => {
          const { boss, diffs } = item;
          const key = `${periodId}:${boss.id}`;

          const bossRow = document.createElement("div");
          bossRow.className = "boss-row";
          bossRow.dataset.bossId = boss.id;
          bossRow.dataset.period = periodId;

          let badgeHtml = "";
          if (boss.forceType === "arcane") {
            badgeHtml = `<span class="boss-force-label boss-force-label--arcane">아케인</span>`;
          } else if (boss.forceType === "authentic") {
            badgeHtml = `<span class="boss-force-label boss-force-label--authentic">어센틱</span>`;
          }

          const state = bossUiStates[key] || { difficultyId: diffs[0].id, partySize: 1 };
          const currentDiffId = state.difficultyId;
          const currentPartySize = state.partySize;

          const diff = diffs.find(d => d.id === currentDiffId) || diffs[0];
          const basePrice = getCrystalPrice(boss.id, diff.id);
          const splitPrice = Math.floor(basePrice / currentPartySize);

          const formattedPrice = formatMesoKorean(splitPrice).replace(" 메소", "");
          const priceText = currentPartySize > 1 ? `${formattedPrice} / ${currentPartySize}인` : formattedPrice;

          const isSelected = activeChar && (
            periodId === "weekly"
              ? (activeChar.selectedBosses && !!activeChar.selectedBosses[key])
              : (activeChar.monthlyRecords && !!activeChar.monthlyRecords[`${getKstMonthKey()}:${boss.id}`])
          );
          if (isSelected) {
            bossRow.classList.add("is-selected");
          }

          let nameGroupHtml = `<span class="boss-name">${boss.name}</span>`;
          if (isSelected && periodId === "monthly") {
            const recordKey = `${getKstMonthKey()}:${boss.id}`;
            const record = activeChar.monthlyRecords ? activeChar.monthlyRecords[recordKey] : null;
            if (record && record.completedAt) {
              const formattedDate = formatKstCompletionDate(record.completedAt);
              nameGroupHtml = `
                <div class="boss-name-group" style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                  <span class="boss-name" style="margin-bottom: 0;">${boss.name}</span>
                  <span class="boss-completion-date" style="font-size: 10.5px; color: #4f46e5; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">이번 달 ${boss.name}: ${formattedDate}</span>
                </div>
              `;
            }
          }

          bossRow.innerHTML = `
            <div class="boss-icon-stack">
              <div class="boss-icon-wrapper">
                <img 
                  alt="${boss.name}" 
                  class="boss-icon" 
                />
              </div>
              ${badgeHtml}
            </div>
            ${nameGroupHtml}
            
            <div class="boss-controls">
              <div class="boss-stepper boss-difficulty-stepper">
                <button class="boss-stepper-btn btn-prev-diff" type="button" ${isDisabled ? "disabled" : ""}>&lt;</button>
                <div class="boss-stepper-val-container">
                  <span class="boss-stepper-label">${diff.label}</span>
                  <span class="boss-stepper-sublabel">${priceText}</span>
                </div>
                <button class="boss-stepper-btn btn-next-diff" type="button" ${isDisabled ? "disabled" : ""}>&gt;</button>
              </div>

              <div class="boss-stepper boss-party-stepper">
                <button class="boss-stepper-btn btn-prev-party" type="button" ${isDisabled ? "disabled" : ""}>&lt;</button>
                <div class="boss-stepper-val-container">
                  <span class="boss-stepper-label">${currentPartySize}인</span>
                </div>
                <button class="boss-stepper-btn btn-next-party" type="button" ${isDisabled ? "disabled" : ""}>&gt;</button>
              </div>
            </div>
          `;

          const img = bossRow.querySelector(".boss-icon");
          attachBossIconFallback(img, boss.icon);

          const btnPrevDiff = bossRow.querySelector(".btn-prev-diff");
          const btnNextDiff = bossRow.querySelector(".btn-next-diff");
          
          const changeDiff = (dir) => {
            const len = diffs.length;
            if (len <= 1) return;
            let idx = diffs.findIndex(d => d.id === state.difficultyId);
            idx = (idx + dir + len) % len;
            const newDiffId = diffs[idx].id;
            
            state.difficultyId = newDiffId;
            if (isSelected) {
              if (periodId === "weekly") {
                activeChar.selectedBosses[key].difficultyId = newDiffId;
              } else if (periodId === "monthly") {
                const recordKey = `${getKstMonthKey()}:${boss.id}`;
                activeChar.monthlyRecords[recordKey].difficultyId = newDiffId;
              }
            }
            saveState();
            updateUI();
          };

          btnPrevDiff.addEventListener("click", (e) => {
            e.stopPropagation();
            changeDiff(-1);
          });
          btnNextDiff.addEventListener("click", (e) => {
            e.stopPropagation();
            changeDiff(1);
          });

          const btnPrevParty = bossRow.querySelector(".btn-prev-party");
          const btnNextParty = bossRow.querySelector(".btn-next-party");

          const changeParty = (dir) => {
            let newPartySize = state.partySize + dir;
            if (newPartySize < 1) newPartySize = 1;
            if (newPartySize > 6) newPartySize = 6;
            
            state.partySize = newPartySize;
            if (isSelected) {
              if (periodId === "weekly") {
                activeChar.selectedBosses[key].partySize = newPartySize;
              } else if (periodId === "monthly") {
                const recordKey = `${getKstMonthKey()}:${boss.id}`;
                activeChar.monthlyRecords[recordKey].partySize = newPartySize;
              }
            }
            saveState();
            updateUI();
          };

          btnPrevParty.addEventListener("click", (e) => {
            e.stopPropagation();
            changeParty(-1);
          });
          btnNextParty.addEventListener("click", (e) => {
            e.stopPropagation();
            changeParty(1);
          });

          bossRow.addEventListener("click", () => {
            if (isDisabled) {
              alert("먼저 캐릭터를 추가하거나 선택하세요.");
              return;
            }

            if (isSelected) {
              if (periodId === "weekly") {
                delete activeChar.selectedBosses[key];
              } else if (periodId === "monthly") {
                const recordKey = `${getKstMonthKey()}:${boss.id}`;
                delete activeChar.monthlyRecords[recordKey];
              }
            } else {
              if (periodId === "weekly") {
                if (!activeChar.selectedBosses) {
                  activeChar.selectedBosses = {};
                }
                activeChar.selectedBosses[key] = {
                  bossId: boss.id,
                  period: periodId,
                  difficultyId: state.difficultyId,
                  partySize: state.partySize
                };
              } else if (periodId === "monthly") {
                if (!activeChar.monthlyRecords) {
                  activeChar.monthlyRecords = {};
                }
                const now = new Date();
                const monthKey = getKstMonthKey(now);
                const recordKey = `${monthKey}:${boss.id}`;
                activeChar.monthlyRecords[recordKey] = {
                  bossId: boss.id,
                  period: periodId,
                  difficultyId: state.difficultyId,
                  partySize: state.partySize,
                  completedAt: getKstIsoString(now),
                  monthKey: monthKey
                };
              }
            }
            saveState();
            updateUI();
          });

          bodyEl.appendChild(bossRow);
        });
      }

      bossListContainer.appendChild(sectionEl);
    });
  }

  // Update UI, calculations, summaries, warnings, and persistence
  function updateUI() {
    if (summaryWeekLabelEl) {
      summaryWeekLabelEl.textContent = getKstMonthWeekLabel();
    }
    renderCharacters();
    renderBosses();

    const activeChar = getActiveCharacter();

    // 1. Update Middle column badge
    if (activeCharBadge) {
      if (activeChar) {
        activeCharBadge.textContent = `${activeChar.name} (${activeChar.job})`;
        activeCharBadge.style.display = "inline-block";
      } else {
        activeCharBadge.textContent = "선택된 캐릭터 없음";
        activeCharBadge.style.display = "inline-block";
      }
    }

    // 2. Update Right column profile
    if (selectedCharInfo) {
      if (activeChar) {
        selectedCharInfo.innerHTML = `
          <div class="char-profile-header">
            <div class="char-profile-text">
              <span class="char-profile-name">${activeChar.name}</span>
              <span class="char-profile-job">${activeChar.job}</span>
            </div>
          </div>
        `;
      } else {
        selectedCharInfo.innerHTML = `
          <p class="no-char-selected-msg">선택된 캐릭터가 없습니다. 캐릭터를 추가하고 선택하세요.</p>
        `;
      }
    }

    // 3. Perform Calculations
    let activeCharCrystals = 0;
    let activeCharMonthly = 0;
    let activeCharMeso = 0;
    let totalCrystalsAll = 0;
    let totalMesoAll = 0;

    // Calculate active character stats & render selected boss list
    if (selectedBossListEl) {
      selectedBossListEl.innerHTML = "";
    }

    if (activeChar) {
      // Character weekly bosses count (weekly only)
      const weeklyActiveKeys = Object.keys(activeChar.selectedBosses || {}).filter(key => {
        const period = activeChar.selectedBosses[key].period || key.split(":")[0];
        return period === "weekly";
      });
      activeCharCrystals = weeklyActiveKeys.length;

      // Character monthly bosses count (current month monthlyRecords)
      const currentMonthKey = getKstMonthKey();
      const monthlyActiveKeys = Object.keys(activeChar.monthlyRecords || {}).filter(key => {
        const record = activeChar.monthlyRecords[key];
        return record && record.monthKey === currentMonthKey;
      });
      activeCharMonthly = monthlyActiveKeys.length;

      let activeBossItemsHtml = "";

      // Weekly bosses selection display
      weeklyActiveKeys.forEach(key => {
        const selection = activeChar.selectedBosses[key];
        if (selection && selection.difficultyId) {
          const bossId = selection.bossId || key.split(":")[1];
          const boss = BOSS_DATA.find(b => b.id === bossId);
          if (boss) {
            const diffs = getBossDifficultiesForPeriod(boss, "weekly");
            const diff = diffs.find(d => d.id === selection.difficultyId) || boss.difficulties.find(d => d.id === selection.difficultyId);
            if (diff) {
              const basePrice = getCrystalPrice(bossId, selection.difficultyId);
              const partySize = selection.partySize || 1;
              const actualPrice = Math.floor(basePrice / partySize);
              activeCharMeso += actualPrice;
              
              const displayLabel = `${boss.name} (${diff.label} · ${partySize}인)`;

              activeBossItemsHtml += `
                <li class="selected-boss-item selected-boss-row" data-boss-icon="${boss.icon}">
                  <div class="selected-boss-icon-wrapper">
                    <img 
                      alt="${boss.name}" 
                      class="selected-boss-icon" 
                    />
                  </div>
                  <div class="selected-boss-info-text">
                    <span class="selected-boss-name">${displayLabel}</span>
                  </div>
                  <span class="selected-boss-price">${formatMesoKorean(actualPrice)}</span>
                </li>
              `;
            }
          }
        }
      });

      // Monthly bosses selection display
      monthlyActiveKeys.forEach(key => {
        const record = activeChar.monthlyRecords[key];
        if (record && record.difficultyId) {
          const boss = BOSS_DATA.find(b => b.id === record.bossId);
          if (boss) {
            const diffs = getBossDifficultiesForPeriod(boss, "monthly");
            const diff = diffs.find(d => d.id === record.difficultyId) || boss.difficulties.find(d => d.id === record.difficultyId);
            if (diff) {
              const basePrice = getCrystalPrice(record.bossId, record.difficultyId);
              const partySize = record.partySize || 1;
              const actualPrice = Math.floor(basePrice / partySize);
              activeCharMeso += actualPrice;
              
              const displayLabel = `${boss.name} (${diff.label} · ${partySize}인)`;
              const dateText = record.completedAt ? formatKstCompletionDate(record.completedAt) : "완료";

              activeBossItemsHtml += `
                <li class="selected-boss-item selected-boss-row" data-boss-icon="${boss.icon}">
                  <div class="selected-boss-icon-wrapper">
                    <img 
                      alt="${boss.name}" 
                      class="selected-boss-icon" 
                    />
                  </div>
                  <div class="selected-boss-info-text">
                    <span class="selected-boss-name">${displayLabel}</span>
                    <span class="selected-boss-date">${dateText}</span>
                  </div>
                  <span class="selected-boss-price">${formatMesoKorean(actualPrice)}</span>
                </li>
              `;
            }
          }
        }
      });

      if (selectedBossListEl) {
        if (activeBossItemsHtml) {
          selectedBossListEl.innerHTML = activeBossItemsHtml;
          selectedBossListEl.querySelectorAll(".selected-boss-item").forEach(item => {
            const iconFileName = item.dataset.bossIcon;
            const img = item.querySelector(".selected-boss-icon");
            if (img && iconFileName) {
              attachBossIconFallback(img, iconFileName);
            }
          });
        } else {
          selectedBossListEl.innerHTML = `<p class="no-bosses-selected">선택한 보스가 없습니다.</p>`;
        }
      }
    } else {
      if (selectedBossListEl) {
        selectedBossListEl.innerHTML = `<p class="no-bosses-selected">선택한 보스가 없습니다.</p>`;
      }
    }

    // Calculate overall stats across all characters
    const currentMonthKeyForTotal = getKstMonthKey();
    characters.forEach(c => {
      // Weekly bosses
      if (c.selectedBosses) {
        const bossKeys = Object.keys(c.selectedBosses);
        const weeklyKeys = bossKeys.filter(key => {
          const period = c.selectedBosses[key].period || key.split(":")[0];
          return period === "weekly";
        });
        totalCrystalsAll += weeklyKeys.length;

        weeklyKeys.forEach(key => {
          const selection = c.selectedBosses[key];
          if (selection && selection.difficultyId) {
            const bossId = selection.bossId || key.split(":")[1];
            const basePrice = getCrystalPrice(bossId, selection.difficultyId);
            const partySize = selection.partySize || 1;
            totalMesoAll += Math.floor(basePrice / partySize);
          }
        });
      }

      // Monthly bosses
      if (c.monthlyRecords) {
        const recordKeys = Object.keys(c.monthlyRecords).filter(key => {
          const record = c.monthlyRecords[key];
          return record && record.monthKey === currentMonthKeyForTotal;
        });
        totalCrystalsAll += recordKeys.length;

        recordKeys.forEach(key => {
          const record = c.monthlyRecords[key];
          if (record && record.difficultyId) {
            const basePrice = getCrystalPrice(record.bossId, record.difficultyId);
            const partySize = record.partySize || 1;
            totalMesoAll += Math.floor(basePrice / partySize);
          }
        });
      }
    });

    // 4. Update calculations text elements in the Right Column
    if (charCrystalCountEl) {
      charCrystalCountEl.textContent = `${activeCharCrystals} / 12`;
    }
    if (charMonthlyCountEl) {
      charMonthlyCountEl.textContent = `${activeCharMonthly} / 1`;
    }
    if (monthlyCompletionStatusEl) {
      if (!activeChar) {
        monthlyCompletionStatusEl.innerHTML = `<div class="monthly-completion-status is-empty">이번 달 검은 마법사: 미완료</div>`;
      } else {
        const monthlyBosses = BOSS_DATA.filter(boss => getBossDifficultiesForPeriod(boss, "monthly").length > 0);
        if (monthlyBosses.length > 0) {
          let statusListHtml = "";
          const currentMonthKey = getKstMonthKey();
          monthlyBosses.forEach(boss => {
            const recordKey = `${currentMonthKey}:${boss.id}`;
            const record = activeChar.monthlyRecords ? activeChar.monthlyRecords[recordKey] : null;
            if (record) {
              const dateText = record.completedAt ? `${formatKstMonthDay(record.completedAt)} 완료` : "완료";
              statusListHtml += `<div class="monthly-completion-status is-complete">✓ 이번 달 ${boss.name}: ${dateText}</div>`;
            } else {
              statusListHtml += `<div class="monthly-completion-status is-empty">이번 달 ${boss.name}: 미완료</div>`;
            }
          });
          
          if (monthlyBosses.length > 1) {
            monthlyCompletionStatusEl.innerHTML = `<div class="monthly-completion-list">${statusListHtml}</div>`;
          } else {
            monthlyCompletionStatusEl.innerHTML = statusListHtml;
          }
        } else {
          monthlyCompletionStatusEl.innerHTML = `<div class="monthly-completion-status is-empty">이번 달 검은 마법사: 미완료</div>`;
        }
      }
    }
    if (charMesoCountEl) {
      charMesoCountEl.textContent = formatMesoKorean(activeCharMeso);
    }
    if (totalCrystalCountEl) {
      totalCrystalCountEl.textContent = `${totalCrystalsAll} / 90`;
    }
    if (totalMesoCountEl) {
      totalMesoCountEl.textContent = formatMesoKorean(totalMesoAll);
    }

    // 5. Update calculations in Top Overview Card
    if (crystalCountEl) {
      crystalCountEl.textContent = totalCrystalsAll;
    }
    if (totalMesoEl) {
      totalMesoEl.textContent = totalMesoAll.toLocaleString();
    }

    // Update meter bar width (percentage up to 100%)
    if (limitMeterBar) {
      const percentage = Math.min((totalCrystalsAll / WEEKLY_CRYSTAL_LIMIT) * 100, 100);
      limitMeterBar.style.width = `${percentage}%`;
      
      // Color coded limits
      if (totalCrystalsAll > WEEKLY_CRYSTAL_LIMIT) {
        limitMeterBar.style.backgroundColor = "#ef4444"; // Red (overflow)
      } else if (totalCrystalsAll >= WEEKLY_CRYSTAL_LIMIT * 0.9) {
        limitMeterBar.style.backgroundColor = "#f59e0b"; // Amber (near limit)
      } else {
        limitMeterBar.style.backgroundColor = "#6366f1"; // Indigo (default)
      }
    }

    // 6. Handle Warnings
    // Character limit warning (12 crystals) and monthly limit warning
    if (charLimitWarningEl) {
      let warningHtml = "";
      if (activeCharCrystals > CHARACTER_WEEKLY_BOSS_LIMIT) {
        warningHtml += `
          <div class="boss-warning-box danger" style="margin-bottom: 8px;">
            ⚠️ 한 캐릭터 기준 주간 보스 결정석은 최대 12개까지 판매 가능합니다. (현재: ${activeCharCrystals}개)
          </div>
        `;
      }
      if (activeCharMonthly > 1) {
        warningHtml += `
          <div class="boss-warning-box danger" style="margin-bottom: 8px;">
            ⚠️ 월간 보스는 캐릭터당 월 1회 기준으로 계산됩니다.
          </div>
        `;
      }

      if (warningHtml) {
        charLimitWarningEl.innerHTML = warningHtml;
      } else if (activeChar) {
        charLimitWarningEl.innerHTML = `
          <div class="boss-helper-text">
            캐릭터당 주간 보스 결정석은 최대 12개까지 판매 가능합니다.
          </div>
        `;
      } else {
        charLimitWarningEl.innerHTML = "";
      }
    }

    // Total limit warning (90 crystals)
    const totalWarningHtml = totalCrystalsAll > WEEKLY_CRYSTAL_LIMIT ? `
      <div class="boss-warning-box danger">
        ⚠️ 주간 결정석 판매 제한 90개를 초과했습니다.
      </div>
    ` : "";

    if (totalLimitWarningEl) {
      totalLimitWarningEl.innerHTML = totalWarningHtml;
    }

    if (weeklyLimitWarningEl) {
      if (totalCrystalsAll > WEEKLY_CRYSTAL_LIMIT) {
        weeklyLimitWarningEl.innerHTML = `
          <div class="boss-warning-box danger">
            ⚠️ 주간 보스 결정석 판매 제한 개수(90개)를 초과했습니다. 실제 게임 내에서는 매주 최대 90개까지만 판매할 수 있으므로, 예상 수익과 차이가 발생할 수 있습니다. (초과분: +${totalCrystalsAll - WEEKLY_CRYSTAL_LIMIT}개)
          </div>
        `;
      } else {
        weeklyLimitWarningEl.innerHTML = "";
      }
    }

    // Enable/Disable resetChar button based on active character
    if (resetCharBtn) {
      resetCharBtn.disabled = !activeChar;
    }
  }

  // Character form submit mapping
  if (addCharForm) {
    addCharForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (addCharacterButton) {
        addCharacterButton.click();
      }
    });
  }

  // Add Character click handler
  if (addCharacterButton) {
    addCharacterButton.addEventListener("click", () => {
      const name = charNameInput.value.trim();
      const job = charJobInput.value.trim();

      if (!name) {
        alert("캐릭터명을 입력하세요.");
        return;
      }

      const newChar = {
        id: "char_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: name,
        job: job,
        avatar: null,
        selectedBosses: {},
        monthlyRecords: {}
      };

      characters.push(newChar);
      activeCharacterId = newChar.id;
      
      charNameInput.value = newChar.name;
      charJobInput.value = newChar.job;

      saveState();
      populateUiStates();
      updateUI();
    });
  }

  // Save Character click handler
  if (saveCharacterButton) {
    saveCharacterButton.addEventListener("click", () => {
      if (!activeCharacterId) {
        alert("수정할 캐릭터를 먼저 선택하세요.");
        return;
      }

      const name = charNameInput.value.trim();
      const job = charJobInput.value.trim();

      if (!name) {
        alert("캐릭터명을 입력하세요.");
        return;
      }

      const char = getActiveCharacter();
      if (char) {
        char.name = name;
        char.job = job;
        saveState();
        updateUI();
      }
    });
  }

  // Reset active character bosses
  if (resetCharBtn) {
    resetCharBtn.addEventListener("click", () => {
      const activeChar = getActiveCharacter();
      if (activeChar) {
        activeChar.selectedBosses = {};
        activeChar.monthlyRecords = {};
        saveState();
        populateUiStates();
        updateUI();
      }
    });
  }

  // Reset all characters boss selections only (keeps character entries)
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      if (confirm("모든 캐릭터의 보스 선택 정보가 초기화됩니다. 계속하시겠습니까?")) {
        characters.forEach(char => {
          char.selectedBosses = {};
          char.monthlyRecords = {};
        });
        saveState();
        populateUiStates();
        updateUI();
      }
    });
  }

  // --- KST Reset Countdown Area ---
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

  function getNextThursdayKst(now = new Date()) {
    const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
    const currentDay = kstNow.getUTCDay(); // Sunday 0, Monday 1, ..., Thursday 4, ...
    
    let daysUntilThursday = (4 - currentDay + 7) % 7;
    if (daysUntilThursday === 0) {
      daysUntilThursday = 7;
    }
    
    const targetYear = kstNow.getUTCFullYear();
    const targetMonth = kstNow.getUTCMonth();
    const targetDate = kstNow.getUTCDate() + daysUntilThursday;
    
    const nextThursdayKstMidnight = Date.UTC(targetYear, targetMonth, targetDate, 0, 0, 0, 0);
    return new Date(nextThursdayKstMidnight - KST_OFFSET_MS);
  }

  function formatKstDateTime(date = new Date()) {
    const options = {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    };
    return new Intl.DateTimeFormat("ko-KR", options).format(date);
  }

  function getResetRemainingText(now, nextReset) {
    const diffMs = nextReset.getTime() - now.getTime();
    if (diffMs <= 0) return "0분 남았습니다.";
    
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    const remainingHrs = diffHrs % 24;
    const remainingMin = diffMin % 60;
    
    if (diffDays > 0) {
      return `${diffDays}일 ${remainingHrs}시간 남았습니다.`;
    } else if (diffHrs > 0) {
      return `${diffHrs}시간 ${remainingMin}분 남았습니다.`;
    } else {
      return `${diffMin}분 남았습니다.`;
    }
  }

  function updateResetCountdown() {
    const now = new Date();
    const nextThursday = getNextThursdayKst(now);
    
    const timeEl = document.getElementById("bossCurrentTime");
    const countdownEl = document.getElementById("bossResetCountdown");
    
    if (timeEl) {
      timeEl.textContent = formatKstDateTime(now);
    }
    if (countdownEl) {
      countdownEl.textContent = getResetRemainingText(now, nextThursday);
    }
  }

  // Async load prices, then init UI
  loadCrystalPrices().then(() => {
    loadState();
    populateUiStates();
    updateUI();

    // Run and schedule KST countdown timer
    updateResetCountdown();
    setInterval(updateResetCountdown, 30000); // Update every 30 seconds
  });
});
