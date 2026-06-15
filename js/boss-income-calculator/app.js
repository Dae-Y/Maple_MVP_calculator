document.addEventListener("DOMContentLoaded", () => {
  const WEEKLY_CRYSTAL_LIMIT = 90;
  const CHARACTER_WEEKLY_BOSS_LIMIT = 12;
  const STORAGE_KEY = "maple_tools_boss_income_characters_v1";
  const ACTIVE_CHARACTER_KEY = "maple_tools_boss_income_active_character_v1";
  const BOSS_SECTION_COLLAPSE_KEY = "maple_tools_boss_income_section_collapse_v1";
  const BOSS_ORDER_MODE_KEY = "maple_tools_boss_income_order_mode_v1";
  const BOSS_WEEKLY_FILTER_KEY = "maple_tools_boss_income_weekly_filter_v1";
  const BOSS_BACKUP_SCHEMA_VERSION = 2;
  const BOSS_CHARACTER_COPY_TEMPLATE_KEY = "mapleToolsBossCharacterCopyTemplateV1";
  const BOSS_CHARACTER_COPY_TEMPLATE_VERSION = 1;
  const BOSS_WEEKLY_ACTUAL_RECORDS_KEY = "mapleToolsBossWeeklyActualRecordsV1";

  const BELOW_LOTUS_DAMIEN_WEEKLY_BOSS_IDS = [
    "zaqqum",
    "magnus",
    "hilla",
    "vonbon",
    "pierre",
    "bloodyqueen",
    "vellum",
    "pinkbean",
    "cygnus"
  ];

  const SELECTED_BOSS_NAME_ALIASES = {
    "찬란한 흉성": "흉성",
    "최초의 대적자": "대적자",
    "감시자 칼로스": "칼로스",
    "선택받은 세렌": "세렌",
    "가디언 엔젤 슬라임": "가엔슬"
  };

  // State
  let characters = []; // Array of character objects
  let activeCharacterId = null;
  let crystalPriceData = null;
  const bossUiStates = {}; // Temp UI state for bosses: { ["period:bossId"]: { difficultyId, partySize } }
  let bossOrderMode = "default"; // "default" or "reverse"
  let weeklyFilterState = {
    hideBelowLotusDamien: false
  };
  let isWeeklyFilterMenuOpen = false;

  let sectionCollapseStates = {
    daily: true,
    weekly: false,
    monthly: true,
    seasonal: true
  };

  let weeklyActualRecords = {}; // Weekly actual income records
  let viewedWeeklyRecordMonth = { year: 2026, month: 6 };
  let expandedWeeklyRecordKey = null; // Key of the currently expanded weekly record row

  // DOM Elements
  const bossListContainer = document.getElementById("bossList");
  const bossOrderDefaultButton = document.getElementById("bossOrderDefaultButton");
  const bossOrderReverseButton = document.getElementById("bossOrderReverseButton");
  const bossFilterButton = document.getElementById("bossFilterButton");
  const bossFilterDropdown = document.getElementById("bossFilterDropdown");
  const hideBelowLotusDamienCheckbox = document.getElementById("hideBelowLotusDamienCheckbox");
  const bossFilterIndicator = document.getElementById("bossFilterIndicator");
  
  // Top Overview Card
  const crystalCountEl = document.getElementById("crystalCount");
  const totalMesoEl = document.getElementById("totalMeso");
  const limitMeterBar = document.getElementById("limitMeterBar");
  const weeklyLimitWarningEl = document.getElementById("weeklyLimitWarning");

  // Previous Week Actual Summary DOM Elements (relocated to Top Left card)
  const previousWeekActualSummaryEl = document.getElementById("previousWeekActualSummary");
  const previousWeekActualSaleLabelEl = document.getElementById("previousWeekActualSaleLabel");
  const previousWeekActualCrystalCountEl = document.getElementById("previousWeekActualCrystalCount");
  const previousWeekActualIncomeEl = document.getElementById("previousWeekActualIncome");
  const previousWeekActualProgressEl = document.getElementById("previousWeekActualProgress");

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
  const charSeasonalCountEl = document.getElementById("charSeasonalCount");
  const seasonalCompletionStatusEl = document.getElementById("seasonalCompletionStatus");
  const summaryWeekLabelEl = document.getElementById("summaryWeekLabel");
  const charMesoCountEl = document.getElementById("charMesoCount");
  const totalCrystalCountEl = document.getElementById("totalCrystalCount");
  const totalMesoCountEl = document.getElementById("totalMesoCount");
  const charLimitWarningEl = document.getElementById("charLimitWarning");
  const totalLimitWarningEl = document.getElementById("totalLimitWarning");
  const selectedBossListEl = document.getElementById("selectedBossList");
  const resetCharBtn = document.getElementById("resetCharBtn");
  const resetAllBtn = document.getElementById("resetAllBtn");

  const btnPrevMonth = document.getElementById("btnPrevMonth");
  const btnNextMonth = document.getElementById("btnNextMonth");

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

  function formatCompactEok(value) {
    const eok = value / 100000000;
    const formatted = eok.toFixed(2).replace(/\.?0+$/, "");
    return `${formatted}억`;
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

  // Calculate Thursday-Wednesday weekly cycle period matching countdown resets
  function getKstWeeklyPeriod(date = new Date()) {
    const nextThursday = getNextThursdayKst(date);
    // startKst is Thursday 00:00 KST (7 days before next Thursday)
    // We add 1 hour offset to representative date to avoid any UTC boundary issue when formatting
    const representativeDate = new Date(nextThursday.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000); // Thursday 01:00 KST
    
    const startKst = new Date(nextThursday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endKst = new Date(nextThursday.getTime() - 1000); // end date is Wednesday 23:59:59 KST
    
    // Format start and end date labels: YYYY-MM-DD in KST
    const getKstYmd = (d) => {
      const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const year = kst.getUTCFullYear();
      const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
      const day = String(kst.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startKstDate = getKstYmd(startKst);
    const endKstDate = getKstYmd(endKst);
    
    const weekLabel = getKstMonthWeekLabel(representativeDate);
    
    const kstRep = new Date(representativeDate.getTime() + 9 * 60 * 60 * 1000);
    const rMonth = kstRep.getUTCMonth() + 1;
    const rMonthStr = String(rMonth).padStart(2, "0");
    const rYear = kstRep.getUTCFullYear();
    const rDayVal = kstRep.getUTCDate();
    const rWeekIndex = Math.ceil(rDayVal / 7);
    
    const weekKey = `${rYear}-${rMonthStr}-W${rWeekIndex}`;
    const monthKey = `${rYear}-${rMonthStr}`;
    
    return {
      weekKey: weekKey,
      monthKey: monthKey,
      weekLabel: weekLabel,
      startKstDate: startKstDate,
      endKstDate: endKstDate
    };
  }

  // Snapshot active character's current week setup for actual records
  function getCharacterSnapshot(char) {
    const weeklyKeys = Object.keys(char.selectedBosses || {}).filter(key => {
      const period = char.selectedBosses[key].period || key.split(":")[0];
      return period === "weekly";
    });
    
    let crystalCount = weeklyKeys.length;
    let actualMeso = 0;
    
    // Weekly income
    weeklyKeys.forEach(key => {
      const selection = char.selectedBosses[key];
      if (selection && selection.difficultyId) {
        const bossId = selection.bossId || key.split(":")[1];
        const basePrice = getCrystalPrice(bossId, selection.difficultyId);
        const partySize = selection.partySize || 1;
        actualMeso += Math.floor(basePrice / partySize);
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
        actualMeso += Math.floor(basePrice / partySize);
      }
    });

    // Deep clone selected weekly bosses
    const bossesSnapshot = JSON.parse(JSON.stringify(char.selectedBosses || {}));
    const monthlySnapshot = JSON.parse(JSON.stringify(char.monthlyRecords || {}));

    return {
      characterId: char.id,
      name: char.name,
      job: char.job,
      crystalCount: crystalCount,
      actualMeso: actualMeso,
      bossesSnapshot: bossesSnapshot,
      monthlySnapshot: monthlySnapshot,
      completedAt: new Date().toISOString()
    };
  }

  // Calculate totals from snapshot characters list
  function getWeeklyActualRecordTotals(record) {
    if (!record) {
      return { crystalCount: 0, actualMeso: 0, completedCharacterCount: 0, isManual: false };
    }

    let completedCharacterCount = 0;
    if (record.completedCharacters) {
      completedCharacterCount = Object.keys(record.completedCharacters).filter(
        charId => record.completedCharacters[charId]
      ).length;
    }

    if (typeof record.manualActualMeso === "number") {
      return {
        crystalCount: typeof record.manualCrystalCount === "number" ? record.manualCrystalCount : null,
        actualMeso: record.manualActualMeso,
        completedCharacterCount: completedCharacterCount,
        isManual: true
      };
    }

    let crystalCount = 0;
    let actualMeso = 0;
    if (record.completedCharacters) {
      Object.keys(record.completedCharacters).forEach(charId => {
        const charSnapshot = record.completedCharacters[charId];
        if (charSnapshot) {
          crystalCount += charSnapshot.crystalCount || 0;
          actualMeso += charSnapshot.actualMeso || 0;
        }
      });
    }

    return {
      crystalCount: crystalCount,
      actualMeso: actualMeso,
      completedCharacterCount: completedCharacterCount,
      isManual: false
    };
  }

  // Validate completion status
  function isCharacterCompletedForCurrentWeek(charId) {
    const periodInfo = getKstWeeklyPeriod();
    const weekKey = periodInfo.weekKey;
    return !!(weeklyActualRecords[weekKey] && 
              weeklyActualRecords[weekKey].completedCharacters && 
              weeklyActualRecords[weekKey].completedCharacters[charId]);
  }

  // Save active character name/job text edits if not empty
  function saveActiveCharacterEdits() {
    if (activeCharacterId) {
      const name = charNameInput.value.trim();
      const job = charJobInput.value.trim();
      if (name) {
        const char = getActiveCharacter();
        if (char) {
          char.name = name;
          char.job = job;
        }
      }
    }
  }

  // Migrate legacy format from storage
  function migrateCharacterData(char) {
    if (!char.selectedBosses) {
      char.selectedBosses = {};
    }
    if (!char.monthlyRecords) {
      char.monthlyRecords = {};
    }
    if (!char.seasonalRecords) {
      char.seasonalRecords = {};
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
    const periods = ["daily", "weekly", "monthly", "seasonal"];
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

      // 3. Populate seasonal
      if (activeChar.seasonalRecords) {
        Object.keys(activeChar.seasonalRecords).forEach(recordKey => {
          const record = activeChar.seasonalRecords[recordKey];
          if (record) {
            const key = `seasonal:${record.bossId}`;
            const boss = BOSS_DATA.find(b => b.id === record.bossId);
            const filteredDiffs = boss ? getBossDifficultiesForPeriod(boss, "seasonal") : [];
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
          if (!char.seasonalRecords) {
            char.seasonalRecords = {};
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
          const parsed = JSON.parse(storedCollapse);
          if (parsed && typeof parsed === "object") {
            sectionCollapseStates = {
              ...sectionCollapseStates,
              ...parsed
            };
          }
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

      // Load boss display order mode
      try {
        const storedOrderMode = localStorage.getItem(BOSS_ORDER_MODE_KEY);
        if (storedOrderMode === "default" || storedOrderMode === "reverse") {
          bossOrderMode = storedOrderMode;
        } else {
          bossOrderMode = "default";
        }
      } catch (e) {
        bossOrderMode = "default";
      }

      // Load boss weekly filter state
      try {
        const storedFilter = localStorage.getItem(BOSS_WEEKLY_FILTER_KEY);
        if (storedFilter) {
          const parsed = JSON.parse(storedFilter);
          if (parsed && typeof parsed.hideBelowLotusDamien === "boolean") {
            weeklyFilterState.hideBelowLotusDamien = parsed.hideBelowLotusDamien;
          }
        }
      } catch (e) {
        weeklyFilterState.hideBelowLotusDamien = false;
      }

      if (hideBelowLotusDamienCheckbox) {
        hideBelowLotusDamienCheckbox.checked = weeklyFilterState.hideBelowLotusDamien;
      }

      // Load weekly actual records
      try {
        const storedWeekly = localStorage.getItem(BOSS_WEEKLY_ACTUAL_RECORDS_KEY);
        if (storedWeekly) {
          const parsed = JSON.parse(storedWeekly);
          if (parsed && typeof parsed === "object") {
            weeklyActualRecords = parsed;
          } else {
            weeklyActualRecords = {};
          }
        } else {
          weeklyActualRecords = {};
        }
      } catch (e) {
        weeklyActualRecords = {};
      }
      
      // Initialize viewedWeeklyRecordMonth to current KST month
      const kstParts = getCurrentKstDateParts();
      viewedWeeklyRecordMonth = { year: kstParts.year, month: kstParts.month };
    } catch (e) {
      console.error("Failed to load local storage state:", e);
      characters = [];
      activeCharacterId = null;
      weeklyActualRecords = {};
      const kstParts = getCurrentKstDateParts();
      viewedWeeklyRecordMonth = { year: kstParts.year, month: kstParts.month };
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
      localStorage.setItem(BOSS_WEEKLY_ACTUAL_RECORDS_KEY, JSON.stringify(weeklyActualRecords));
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
      const isCompleted = isCharacterCompletedForCurrentWeek(char.id);
      const cardClass = `character-card ${isActive} ${isCompleted ? "is-week-completed" : ""}`;
      const completeBtnClass = `character-complete-button ${isCompleted ? "is-active" : ""}`;

      const card = document.createElement("div");
      card.className = cardClass;
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
        <div class="char-card-actions">
          <button class="${completeBtnClass}" type="button" aria-label="완료 여부" title="완료 체크">✓</button>
          <button class="btn-delete-char" type="button" aria-label="캐릭터 삭제" title="삭제">
            &times;
          </button>
        </div>
      `;

      // Select character on click (except when clicking delete button or complete button)
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-delete-char") || e.target.classList.contains("character-complete-button")) return;
        activeCharacterId = char.id;
        // Populate inputs with current character's name/job
        charNameInput.value = char.name;
        charJobInput.value = char.job;
        saveState();
        populateUiStates();
        updateUI();
      });

      // Complete character logic
      const completeBtn = card.querySelector(".character-complete-button");
      completeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Save current active character name/job text inputs before toggling completion
        saveActiveCharacterEdits();

        const periodInfo = getKstWeeklyPeriod();
        const weekKey = periodInfo.weekKey;

        if (isCharacterCompletedForCurrentWeek(char.id)) {
          // Uncheck: remove snapshot from weekly actual records
          if (weeklyActualRecords[weekKey] && weeklyActualRecords[weekKey].completedCharacters) {
            delete weeklyActualRecords[weekKey].completedCharacters[char.id];
            if (Object.keys(weeklyActualRecords[weekKey].completedCharacters).length === 0) {
              delete weeklyActualRecords[weekKey];
            }
          }
        } else {
          // Check: save snapshot of current selected bosses & totals
          if (!weeklyActualRecords[weekKey]) {
            weeklyActualRecords[weekKey] = {
              completedCharacters: {}
            };
          }
          // Snapshot rule: save a snapshot of the character's current selected bosses, crystal count, and actual meso
          // so that later changes to character selections do not automatically modify this saved record.
          const snapshot = getCharacterSnapshot(char);
          weeklyActualRecords[weekKey].completedCharacters[char.id] = snapshot;
        }

        saveState();
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
      { id: "monthly", label: "월간 보스" },
      { id: "seasonal", label: "시즌 보스" }
    ];

    periods.forEach(pInfo => {
      const periodId = pInfo.id;
      const periodLabel = pInfo.label;

      const filteredBossList = [];
      BOSS_DATA.forEach(boss => {
        const diffs = getBossDifficultiesForPeriod(boss, periodId);
        if (diffs.length > 0) {
          if (periodId === "weekly" && weeklyFilterState.hideBelowLotusDamien && BELOW_LOTUS_DAMIEN_WEEKLY_BOSS_IDS.includes(boss.id)) {
            return;
          }
          filteredBossList.push({ boss, diffs });
        }
      });

      if (filteredBossList.length === 0) return;

      if ((periodId === "weekly" || periodId === "monthly") && bossOrderMode === "reverse") {
        filteredBossList.reverse();
      }

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
        } else if (periodId === "seasonal" && activeChar.seasonalRecords) {
          filteredBossList.forEach(item => {
            const recordKey = item.boss.id;
            if (activeChar.seasonalRecords[recordKey]) {
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
        } else if (periodId === "seasonal") {
          // Render note inside seasonal section body
          const noteEl = document.createElement("div");
          noteEl.className = "boss-period-note";
          noteEl.innerHTML = `
            시즌 보스는 기간 한정 보스 기록용입니다. 현재 수익 합산과 결정석 90개 제한에는 포함되지 않습니다.<br />
            <span style="font-weight: 800; color: #4f46e5;">고정 보상 참고: 황금 메소 주머니, 솔 에르다의 기운, 카이 보상 상자 등</span>
          `;
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
              : (periodId === "monthly"
                ? (activeChar.monthlyRecords && !!activeChar.monthlyRecords[`${getKstMonthKey()}:${boss.id}`])
                : (activeChar.seasonalRecords && !!activeChar.seasonalRecords[boss.id]))
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
          } else if (isSelected && periodId === "seasonal") {
            const recordKey = boss.id;
            const record = activeChar.seasonalRecords ? activeChar.seasonalRecords[recordKey] : null;
            if (record && record.completedAt) {
              const formattedDate = formatKstCompletionDate(record.completedAt);
              nameGroupHtml = `
                <div class="boss-name-group" style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                  <span class="boss-name" style="margin-bottom: 0;">${boss.name}</span>
                  <span class="boss-completion-date" style="font-size: 10.5px; color: #4f46e5; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">✓ 완료 (${formattedDate})</span>
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

              ${periodId === "seasonal"
                ? `
                  <div class="boss-stepper boss-party-stepper" style="border-color: transparent; background: #f3f4f6; justify-content: center; cursor: default;">
                    <div class="boss-stepper-val-container">
                      <span class="boss-stepper-label" style="color: #4b5563;">1인</span>
                    </div>
                  </div>
                `
                : `
                  <div class="boss-stepper boss-party-stepper">
                    <button class="boss-stepper-btn btn-prev-party" type="button" ${isDisabled ? "disabled" : ""}>&lt;</button>
                    <div class="boss-stepper-val-container">
                      <span class="boss-stepper-label">${currentPartySize}인</span>
                    </div>
                    <button class="boss-stepper-btn btn-next-party" type="button" ${isDisabled ? "disabled" : ""}>&gt;</button>
                  </div>
                `
              }
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
              } else if (periodId === "seasonal") {
                activeChar.seasonalRecords[boss.id].difficultyId = newDiffId;
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

          if (btnPrevParty) {
            btnPrevParty.addEventListener("click", (e) => {
              e.stopPropagation();
              changeParty(-1);
            });
          }
          if (btnNextParty) {
            btnNextParty.addEventListener("click", (e) => {
              e.stopPropagation();
              changeParty(1);
            });
          }

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
              } else if (periodId === "seasonal") {
                delete activeChar.seasonalRecords[boss.id];
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
              } else if (periodId === "seasonal") {
                if (!activeChar.seasonalRecords) {
                  activeChar.seasonalRecords = {};
                }
                const now = new Date();
                activeChar.seasonalRecords[boss.id] = {
                  bossId: boss.id,
                  period: periodId,
                  difficultyId: state.difficultyId,
                  partySize: 1,
                  completedAt: getKstIsoString(now)
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

  // Update weekly filter menu visibility classes and aria attributes
  function updateWeeklyFilterMenuVisibility() {
    if (!bossFilterDropdown || !bossFilterButton) return;
    bossFilterDropdown.classList.toggle("is-open", isWeeklyFilterMenuOpen);
    bossFilterButton.setAttribute("aria-expanded", String(isWeeklyFilterMenuOpen));
  }

  // Update order buttons active status
  function updateOrderButtonsUI() {
    if (!bossOrderDefaultButton || !bossOrderReverseButton) return;
    if (bossOrderMode === "reverse") {
      bossOrderDefaultButton.classList.remove("is-active");
      bossOrderReverseButton.classList.add("is-active");
    } else {
      bossOrderDefaultButton.classList.add("is-active");
      bossOrderReverseButton.classList.remove("is-active");
    }
  }

  // Update UI, calculations, summaries, warnings, and persistence
  function updateUI() {
    if (bossFilterIndicator) {
      bossFilterIndicator.style.display = weeklyFilterState.hideBelowLotusDamien ? "inline-block" : "none";
    }
    if (bossFilterButton) {
      if (weeklyFilterState.hideBelowLotusDamien) {
        bossFilterButton.classList.add("is-active");
      } else {
        bossFilterButton.classList.remove("is-active");
      }
    }

    const currentWeekPeriod = getKstWeeklyPeriod();
    const weeklySaleCountLabelEl = document.getElementById("weeklySaleCountLabel");
    if (weeklySaleCountLabelEl) {
      weeklySaleCountLabelEl.textContent = `${currentWeekPeriod.weekLabel} 판매 개수 (전체)`;
    }
    if (summaryWeekLabelEl) {
      summaryWeekLabelEl.textContent = currentWeekPeriod.weekLabel;
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
    let activeCharSeasonal = 0;
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

      // Character seasonal bosses count
      activeCharSeasonal = Object.keys(activeChar.seasonalRecords || {}).length;

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
              
              const bossDisplayName = SELECTED_BOSS_NAME_ALIASES[boss.name] || boss.name;
              const displayLabel = `${bossDisplayName} (${diff.label} · ${partySize}인)`;

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
                  <span class="selected-boss-price">${formatCompactEok(actualPrice)}</span>
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
              
              const bossDisplayName = SELECTED_BOSS_NAME_ALIASES[boss.name] || boss.name;
              const displayLabel = `${bossDisplayName} (${diff.label} · ${partySize}인)`;
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
                  <span class="selected-boss-price">${formatCompactEok(actualPrice)}</span>
                </li>
              `;
            }
          }
        }
      });

      // Seasonal bosses selection display
      const seasonalActiveKeys = Object.keys(activeChar.seasonalRecords || {});
      seasonalActiveKeys.forEach(key => {
        const record = activeChar.seasonalRecords[key];
        if (record && record.difficultyId) {
          const boss = BOSS_DATA.find(b => b.id === record.bossId);
          if (boss) {
            const diffs = getBossDifficultiesForPeriod(boss, "seasonal");
            const diff = diffs.find(d => d.id === record.difficultyId) || boss.difficulties.find(d => d.id === record.difficultyId);
            if (diff) {
              const bossDisplayName = SELECTED_BOSS_NAME_ALIASES[boss.name] || boss.name;
              const displayLabel = `${bossDisplayName} (${diff.label} · 1인)`;
              
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
                    <span class="selected-boss-date" style="color: #6d28d9; font-weight: 700;">시즌 보스 완료</span>
                  </div>
                  <span class="selected-boss-price" style="color: #6d28d9; font-weight: 700;">보상 기록</span>
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
    if (charSeasonalCountEl) {
      charSeasonalCountEl.textContent = `${activeCharSeasonal}개`;
    }
    if (seasonalCompletionStatusEl) {
      if (!activeChar) {
        seasonalCompletionStatusEl.innerHTML = `<div class="seasonal-completion-status is-empty">이번 시즌 카이: 미완료</div>`;
      } else {
        const seasonalBosses = BOSS_DATA.filter(boss => getBossDifficultiesForPeriod(boss, "seasonal").length > 0);
        if (seasonalBosses.length > 0) {
          let statusListHtml = "";
          seasonalBosses.forEach(boss => {
            const record = activeChar.seasonalRecords ? activeChar.seasonalRecords[boss.id] : null;
            if (record) {
              const dateText = record.completedAt ? `${formatKstMonthDay(record.completedAt)} 완료` : "완료";
              statusListHtml += `<div class="seasonal-completion-status is-complete">✓ 이번 시즌 ${boss.name}: ${dateText}</div>`;
            } else {
              statusListHtml += `<div class="seasonal-completion-status is-empty">이번 시즌 ${boss.name}: 미완료</div>`;
            }
          });
          
          if (seasonalBosses.length > 1) {
            seasonalCompletionStatusEl.innerHTML = `<div class="seasonal-completion-list">${statusListHtml}</div>`;
          } else {
            seasonalCompletionStatusEl.innerHTML = statusListHtml;
          }
        } else {
          seasonalCompletionStatusEl.innerHTML = `<div class="seasonal-completion-status is-empty">이번 시즌 카이: 미완료</div>`;
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
      totalMesoEl.textContent = formatMesoKorean(totalMesoAll).replace(" 메소", "");
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

    // Update display order buttons active status
    updateOrderButtonsUI();
    updateWeeklyFilterMenuVisibility();

    // Render weekly actual summaries
    renderPrevWeekSummary();
    renderBossIncomeCalendar();
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
        monthlyRecords: {},
        seasonalRecords: {}
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
        activeChar.seasonalRecords = {};
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
          char.seasonalRecords = {};
        });
        saveState();
        populateUiStates();
        updateUI();
      }
    });
  }

  // Boss display order button click handlers
  if (bossOrderDefaultButton) {
    bossOrderDefaultButton.addEventListener("click", () => {
      if (bossOrderMode !== "default") {
        bossOrderMode = "default";
        try {
          localStorage.setItem(BOSS_ORDER_MODE_KEY, "default");
        } catch (e) {}
        updateUI();
      }
    });
  }

  if (bossOrderReverseButton) {
    bossOrderReverseButton.addEventListener("click", () => {
      if (bossOrderMode !== "reverse") {
        bossOrderMode = "reverse";
        try {
          localStorage.setItem(BOSS_ORDER_MODE_KEY, "reverse");
        } catch (e) {}
        updateUI();
      }
    });
  }

  // Boss weekly filter dropdown click toggler
  if (bossFilterButton && bossFilterDropdown) {
    bossFilterButton.addEventListener("click", (e) => {
      e.stopPropagation();
      isWeeklyFilterMenuOpen = !isWeeklyFilterMenuOpen;
      updateWeeklyFilterMenuVisibility();
    });
  }

  // Filter checkbox change handler
  if (hideBelowLotusDamienCheckbox) {
    hideBelowLotusDamienCheckbox.addEventListener("change", (e) => {
      weeklyFilterState.hideBelowLotusDamien = e.target.checked;
      try {
        localStorage.setItem(BOSS_WEEKLY_FILTER_KEY, JSON.stringify(weeklyFilterState));
      } catch (err) {}
      updateUI();
    });
  }

  // Prevent closing dropdown when clicking inside it
  if (bossFilterDropdown) {
    bossFilterDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Click outside listener to close dropdown
  document.addEventListener("click", (e) => {
    if (bossFilterDropdown && isWeeklyFilterMenuOpen) {
      const isClickInside = bossFilterDropdown.contains(e.target) || (bossFilterButton && bossFilterButton.contains(e.target));
      if (!isClickInside) {
        isWeeklyFilterMenuOpen = false;
        updateWeeklyFilterMenuVisibility();
      }
    }
  });

  // Escape key press to close dropdown
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bossFilterDropdown && isWeeklyFilterMenuOpen) {
      isWeeklyFilterMenuOpen = false;
      updateWeeklyFilterMenuVisibility();
    }
  });

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

  // JSON Backup export download helper
  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  // Export Boss Backup
  function exportBossBackup() {
    // Save current character name/job text inputs before export if not empty
    saveActiveCharacterEdits();
    saveState();

    const now = new Date();
    const kstIsoString = getKstIsoString(now);
    const kstDateLabel = kstIsoString.substring(0, 10);
    
    const backupData = {
      app: "Maple Tools",
      tool: "boss-income-calculator",
      schemaVersion: BOSS_BACKUP_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      exportedAtKstLabel: kstDateLabel,
      data: {
        characters: characters,
        activeCharacterId: activeCharacterId,
        weeklyActualRecords: weeklyActualRecords,
        uiPreferences: {
          bossOrderMode: bossOrderMode,
          weeklyFilter: weeklyFilterState,
          sectionCollapse: sectionCollapseStates
        }
      }
    };

    const filename = `maple-tools-boss-backup-${kstDateLabel}.json`;
    downloadJson(filename, backupData);
  }

  // Import Boss Backup
  function importBossBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        // 1. Base validation
        if (!backup || typeof backup !== "object" || backup.app !== "Maple Tools" || backup.tool !== "boss-income-calculator") {
          alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
          bossBackupFileInput.value = "";
          return;
        }
        
        // 2. Schema version validation
        if (backup.schemaVersion !== 1 && backup.schemaVersion !== 2) {
          alert("지원하지 않는 백업 파일 버전입니다.");
          bossBackupFileInput.value = "";
          return;
        }
        
        // 3. Characters array validation
        if (!backup.data || !Array.isArray(backup.data.characters)) {
          alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
          bossBackupFileInput.value = "";
          return;
        }

        // 4. Character object validation to prevent crashes
        for (const char of backup.data.characters) {
          if (!char || typeof char !== "object") {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
          if (typeof char.id !== "string" || !char.id) {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
          if (typeof char.name !== "string" || !char.name.trim()) {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
          if (char.job !== undefined && typeof char.job !== "string") {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
          if (char.selectedBosses !== undefined && (typeof char.selectedBosses !== "object" || char.selectedBosses === null)) {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
          if (char.monthlyRecords !== undefined && (typeof char.monthlyRecords !== "object" || char.monthlyRecords === null)) {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
          if (char.seasonalRecords !== undefined && (typeof char.seasonalRecords !== "object" || char.seasonalRecords === null)) {
            alert("올바른 보스 수익 계산기 백업 파일이 아닙니다.");
            bossBackupFileInput.value = "";
            return;
          }
        }

        // 5. Ask for confirmation
        if (!confirm("현재 브라우저에 저장된 보스 계산기 기록을 백업 파일 내용으로 교체할까요?")) {
          bossBackupFileInput.value = "";
          return;
        }

        // 6. Restore data
        characters = backup.data.characters;

        // Restore weeklyActualRecords based on schemaVersion
        if (backup.schemaVersion === 2) {
          if (backup.data.weeklyActualRecords && typeof backup.data.weeklyActualRecords === "object") {
            const cleaned = {};
            Object.keys(backup.data.weeklyActualRecords).forEach(key => {
              const record = backup.data.weeklyActualRecords[key];
              if (record && typeof record === "object") {
                const cleanRecord = {
                  schemaVersion: typeof record.schemaVersion === "number" ? record.schemaVersion : 1,
                  weekKey: typeof record.weekKey === "string" ? record.weekKey : key,
                  monthKey: typeof record.monthKey === "string" ? record.monthKey : "",
                  weekLabel: typeof record.weekLabel === "string" ? record.weekLabel : "",
                  startKstDate: typeof record.startKstDate === "string" ? record.startKstDate : "",
                  endKstDate: typeof record.endKstDate === "string" ? record.endKstDate : "",
                  completedCharacters: record.completedCharacters && typeof record.completedCharacters === "object" ? record.completedCharacters : {}
                };

                // Validate manualActualMeso
                if (record.manualActualMeso !== undefined) {
                  if (typeof record.manualActualMeso === "number" && record.manualActualMeso >= 0 && !isNaN(record.manualActualMeso)) {
                    cleanRecord.manualActualMeso = record.manualActualMeso;
                  }
                }

                // Validate manualCrystalCount
                if (record.manualCrystalCount !== undefined) {
                  if (typeof record.manualCrystalCount === "number" && record.manualCrystalCount >= 0 && !isNaN(record.manualCrystalCount)) {
                    cleanRecord.manualCrystalCount = record.manualCrystalCount;
                  } else if (record.manualCrystalCount === null) {
                    cleanRecord.manualCrystalCount = null;
                  }
                }

                // Validate manualNote / manualUpdatedAt
                if (typeof record.manualNote === "string") {
                  cleanRecord.manualNote = record.manualNote;
                }
                if (typeof record.manualUpdatedAt === "string") {
                  cleanRecord.manualUpdatedAt = record.manualUpdatedAt;
                }

                cleaned[key] = cleanRecord;
              }
            });
            weeklyActualRecords = cleaned;
          } else {
            weeklyActualRecords = {};
          }
        } else {
          weeklyActualRecords = {};
        }

        // 7. Normalization & migration & cleanup
        const currentMonthKey = getKstMonthKey();
        characters.forEach(char => {
          if (!char.selectedBosses) char.selectedBosses = {};
          if (!char.monthlyRecords) char.monthlyRecords = {};
          if (!char.seasonalRecords) char.seasonalRecords = {};

          migrateCharacterData(char);

          // Daily/monthly selectedBosses cleanup
          Object.keys(char.selectedBosses).forEach(key => {
            const selection = char.selectedBosses[key];
            if (selection) {
              const period = selection.period || key.split(":")[0];
              if (period === "daily" || period === "monthly") {
                delete char.selectedBosses[key];
              }
            }
          });

          // Expired monthly records cleanup
          Object.keys(char.monthlyRecords).forEach(key => {
            const record = char.monthlyRecords[key];
            if (record && record.monthKey !== currentMonthKey) {
              delete char.monthlyRecords[key];
            }
          });
        });

        // 8. Restore active character ID
        const importedActiveId = backup.data.activeCharacterId;
        if (importedActiveId && characters.some(c => c.id === importedActiveId)) {
          activeCharacterId = importedActiveId;
        } else if (characters.length > 0) {
          activeCharacterId = characters[0].id;
        } else {
          activeCharacterId = null;
        }

        // 9. UI Preferences (with default fallback to protect against crash/missing keys)
        if (backup.data.uiPreferences) {
          const prefs = backup.data.uiPreferences;
          
          if (prefs.bossOrderMode === "default" || prefs.bossOrderMode === "reverse") {
            bossOrderMode = prefs.bossOrderMode;
            localStorage.setItem(BOSS_ORDER_MODE_KEY, bossOrderMode);
          }
          
          if (prefs.weeklyFilter && typeof prefs.weeklyFilter.hideBelowLotusDamien === "boolean") {
            weeklyFilterState.hideBelowLotusDamien = prefs.weeklyFilter.hideBelowLotusDamien;
            localStorage.setItem(BOSS_WEEKLY_FILTER_KEY, JSON.stringify(weeklyFilterState));
            if (hideBelowLotusDamienCheckbox) {
              hideBelowLotusDamienCheckbox.checked = weeklyFilterState.hideBelowLotusDamien;
            }
          }
          
          if (prefs.sectionCollapse && typeof prefs.sectionCollapse === "object") {
            sectionCollapseStates = {
              ...sectionCollapseStates,
              ...prefs.sectionCollapse
            };
            localStorage.setItem(BOSS_SECTION_COLLAPSE_KEY, JSON.stringify(sectionCollapseStates));
          }
        }

        saveState();

        // 10. Sync inputs of restored active character
        const activeChar = getActiveCharacter();
        if (activeChar) {
          charNameInput.value = activeChar.name;
          charJobInput.value = activeChar.job;
        } else {
          charNameInput.value = "";
          charJobInput.value = "";
        }

        // 11. Re-render UI
        populateUiStates();
        updateUI();

        alert("백업을 불러왔습니다.");
      } catch (err) {
        console.error(err);
        alert("파일 읽기 또는 파싱 중 오류가 발생했습니다.");
      }
      bossBackupFileInput.value = "";
    };
    reader.readAsText(file);
  }

  // Query backup/restore buttons
  const btnExportBossBackup = document.getElementById("btnExportBossBackup");
  const btnImportBossBackup = document.getElementById("btnImportBossBackup");
  const bossBackupFileInput = document.getElementById("bossBackupFileInput");

  if (btnExportBossBackup) {
    btnExportBossBackup.addEventListener("click", exportBossBackup);
  }

  if (btnImportBossBackup && bossBackupFileInput) {
    btnImportBossBackup.addEventListener("click", () => {
      bossBackupFileInput.click();
    });
    bossBackupFileInput.addEventListener("change", importBossBackup);
  }

  // Copy active character template
  function copyActiveCharacter() {
    // Save current active character name/job text inputs before copy if not empty
    saveActiveCharacterEdits();
    saveState();

    const activeChar = getActiveCharacter();
    if (!activeChar) {
      alert("먼저 복사할 캐릭터를 선택해 주세요.");
      return;
    }

    // Filter and copy only weekly selected bosses
    const weeklyBossesList = [];
    if (activeChar.selectedBosses) {
      Object.keys(activeChar.selectedBosses).forEach(key => {
        const selection = activeChar.selectedBosses[key];
        const period = selection.period || key.split(":")[0];
        if (period === "weekly") {
          weeklyBossesList.push({
            key: key,
            bossId: selection.bossId || key.split(":")[1],
            period: period,
            difficultyId: selection.difficultyId,
            partySize: selection.partySize || 1
          });
        }
      });
    }

    const template = {
      tool: "boss-income-calculator",
      type: "character-copy-template",
      schemaVersion: BOSS_CHARACTER_COPY_TEMPLATE_VERSION,
      copiedAt: new Date().toISOString(),
      sourceName: activeChar.name,
      data: {
        job: activeChar.job || "",
        selectedBosses: weeklyBossesList
      }
    };

    try {
      localStorage.setItem(BOSS_CHARACTER_COPY_TEMPLATE_KEY, JSON.stringify(template));
      alert(`${activeChar.name} 보스 설정을 복사했습니다.`);
    } catch (e) {
      console.error(e);
      alert("캐릭터 복사 중 오류가 발생했습니다.");
    }
  }

  // Paste copied character template
  function pasteCopiedCharacter() {
    let templateStr = null;
    try {
      templateStr = localStorage.getItem(BOSS_CHARACTER_COPY_TEMPLATE_KEY);
    } catch (e) {
      console.error(e);
    }

    if (!templateStr) {
      alert("먼저 캐릭터 복사를 해주세요.");
      return;
    }

    let template = null;
    try {
      template = JSON.parse(templateStr);
    } catch (e) {
      console.error(e);
    }

    // Validation
    if (!template || typeof template !== "object" || 
        template.tool !== "boss-income-calculator" || 
        template.type !== "character-copy-template" || 
        template.schemaVersion !== 1 || 
        !template.data || 
        !Array.isArray(template.data.selectedBosses)) {
      alert("복사된 캐릭터 설정을 불러올 수 없습니다. 다시 복사해 주세요.");
      return;
    }

    // Generate unique name
    const baseName = `${template.sourceName} 복사본`;
    let uniqueName = baseName;
    let counter = 2;
    while (characters.some(c => c.name === uniqueName)) {
      uniqueName = `${baseName} ${counter}`;
      counter++;
    }

    // Deep copy weekly selected bosses from template
    const selectedBossesObj = {};
    template.data.selectedBosses.forEach(item => {
      const key = item.key || `${item.period}:${item.bossId}`;
      selectedBossesObj[key] = {
        bossId: item.bossId,
        period: item.period,
        difficultyId: item.difficultyId,
        partySize: item.partySize
      };
    });

    const newChar = {
      id: "char_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: uniqueName,
      job: template.data.job || "",
      avatar: null,
      selectedBosses: selectedBossesObj,
      monthlyRecords: {},
      seasonalRecords: {}
    };

    // Migrate data
    migrateCharacterData(newChar);

    // Save state
    characters.push(newChar);
    activeCharacterId = newChar.id;
    charNameInput.value = newChar.name;
    charJobInput.value = newChar.job;
    saveState();

    // Re-render
    populateUiStates();
    updateUI();

    // Focus input
    if (charNameInput) {
      charNameInput.focus();
      charNameInput.select();
    }

    alert("복사본을 추가했습니다. 캐릭터명과 직업을 수정해 주세요.");
  }

  // Query character copy/paste buttons
  const btnCopyActiveCharacter = document.getElementById("btnCopyActiveCharacter");
  const btnPasteCopiedCharacter = document.getElementById("btnPasteCopiedCharacter");

  if (btnCopyActiveCharacter) {
    btnCopyActiveCharacter.addEventListener("click", copyActiveCharacter);
  }

  if (btnPasteCopiedCharacter) {
    btnPasteCopiedCharacter.addEventListener("click", pasteCopiedCharacter);
  }

  // Help button toggle behavior
  const btnBossBackupHelp = document.getElementById("btnBossBackupHelp");
  const bossBackupHelpPanel = document.getElementById("bossBackupHelpPanel");

  if (btnBossBackupHelp && bossBackupHelpPanel) {
    btnBossBackupHelp.addEventListener("click", () => {
      const isHidden = bossBackupHelpPanel.hidden;
      bossBackupHelpPanel.hidden = !isHidden;
      btnBossBackupHelp.setAttribute("aria-expanded", String(isHidden));
    });
  }

  // Get current KST date parts
  function getCurrentKstDateParts() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    const parts = formatter.formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day)
    };
  }

  // Parse Korean Meso Input
  function parseKoreanMesoInput(input) {
    if (typeof input !== "string") return null;
    let clean = input.replace(/,/g, "").replace(/\s+/g, "").replace(/메소/g, "").trim();
    if (!clean) return null;

    // Check if it's a raw integer/float without units
    if (/^\d+(\.\d+)?$/.test(clean)) {
      const val = parseFloat(clean);
      return isNaN(val) || val < 0 ? null : Math.floor(val);
    }

    let eokVal = 0;
    let manVal = 0;

    const eokMatch = clean.match(/^(\d+(?:\.\d+)?)억/);
    if (eokMatch) {
      eokVal = parseFloat(eokMatch[1]) * 100000000;
      clean = clean.substring(eokMatch[0].length);
    }

    const manMatch = clean.match(/^(\d+(?:\.\d+)?)만/);
    if (manMatch) {
      manVal = parseFloat(manMatch[1]) * 10000;
      clean = clean.substring(manMatch[0].length);
    }

    const total = Math.floor(eokVal + manVal);
    if (isNaN(total) || total < 0) return null;

    if (clean.trim()) {
      if (/^\d+$/.test(clean.trim())) {
        const rem = parseInt(clean.trim(), 10);
        if (!isNaN(rem)) {
          return total + rem;
        }
      }
      return null;
    }

    return total;
  }

  // Edit Weekly Actual Income Flow
  function editWeeklyActualIncome(weekKey) {
    const record = weeklyActualRecords[weekKey];
    let initialMesoText = "";
    if (record && typeof record.manualActualMeso === "number") {
      initialMesoText = formatMesoKorean(record.manualActualMeso);
    }

    let promptMsg = "";
    if (initialMesoText) {
      promptMsg = `현재 수동 입력: ${initialMesoText}\n새 실제 수익을 입력하세요.\n수동 입력을 삭제하려면 "삭제"라고 입력하세요.`;
    } else {
      promptMsg = `실제 수익을 입력하세요. 예: 48억, 48억 3000만, 4800000000`;
    }

    const userInput = window.prompt(promptMsg);
    if (userInput === null) {
      return; // Cancelled
    }

    const trimmedInput = userInput.trim();
    if (trimmedInput === "") {
      return; // Empty input, do nothing
    }

    if (trimmedInput === "삭제") {
      if (record) {
        delete record.manualActualMeso;
        delete record.manualCrystalCount;
        delete record.manualNote;
        delete record.manualUpdatedAt;

        // If no completed characters snapshot exists, delete the empty record entirely
        if (!record.completedCharacters || Object.keys(record.completedCharacters).length === 0) {
          delete weeklyActualRecords[weekKey];
        }
        
        saveState();
        updateUI();
      }
      return;
    }

    const parsedMeso = parseKoreanMesoInput(trimmedInput);
    if (parsedMeso === null) {
      alert("수익 입력 형식을 확인해 주세요. 예: 48억, 48억 3000만, 4800000000");
      return;
    }

    // Save manual record
    if (!weeklyActualRecords[weekKey]) {
      const parts = weekKey.split("-");
      const month = parseInt(parts[1], 10);
      const weekNum = parseInt(parts[2].replace("W", ""), 10);
      const weekLabel = `${month}월 ${weekNum}주차`;

      weeklyActualRecords[weekKey] = {
        schemaVersion: 1,
        weekKey: weekKey,
        monthKey: `${parts[0]}-${parts[1]}`,
        weekLabel: weekLabel,
        startKstDate: "",
        endKstDate: "",
        completedCharacters: {}
      };
    }

    const entry = weeklyActualRecords[weekKey];
    entry.manualActualMeso = parsedMeso;
    entry.manualCrystalCount = null;
    entry.manualNote = "수동 입력";
    entry.manualUpdatedAt = new Date().toISOString();

    saveState();
    updateUI();
  }

  // Render Previous Week actual summary
  function renderPrevWeekSummary() {
    const now = new Date();
    const prevWeekPeriod = getKstWeeklyPeriod(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const prevRecord = weeklyActualRecords[prevWeekPeriod.weekKey];

    let totals = { crystalCount: 0, actualMeso: 0, isManual: false };
    if (prevRecord && (Object.keys(prevRecord.completedCharacters || {}).length > 0 || typeof prevRecord.manualActualMeso === "number")) {
      totals = getWeeklyActualRecordTotals(prevRecord);
    }
    const percentage = totals.crystalCount === null ? 0 : Math.min((totals.crystalCount / WEEKLY_CRYSTAL_LIMIT) * 100, 100);

    if (previousWeekActualSaleLabelEl) {
      previousWeekActualSaleLabelEl.textContent = `${prevWeekPeriod.weekLabel} (저번주) 판매 개수 (전체)`;
    }
    if (previousWeekActualCrystalCountEl) {
      previousWeekActualCrystalCountEl.textContent = totals.crystalCount === null ? "?" : totals.crystalCount;
    }
    if (previousWeekActualIncomeEl) {
      previousWeekActualIncomeEl.textContent = formatMesoKorean(totals.actualMeso).replace(" 메소", "");
    }
    if (previousWeekActualProgressEl) {
      previousWeekActualProgressEl.style.width = `${percentage}%`;
    }
  }

  // Render Boss Income Calendar
  function renderBossIncomeCalendar() {
    const titleEl = document.getElementById("bossCalendarTitle");
    const listEl = document.getElementById("weeklyRecordList");
    if (!titleEl || !listEl) return;

    // Set title
    titleEl.textContent = `${viewedWeeklyRecordMonth.year}년 ${viewedWeeklyRecordMonth.month}월`;

    listEl.innerHTML = "";

    const currentPeriod = getKstWeeklyPeriod(new Date());
    const monthStr = String(viewedWeeklyRecordMonth.month).padStart(2, "0");

    for (let w = 1; w <= 5; w++) {
      const weekKey = `${viewedWeeklyRecordMonth.year}-${monthStr}-W${w}`;
      const isCurrentWeek = weekKey === currentPeriod.weekKey;
      
      const record = weeklyActualRecords[weekKey];
      const totals = getWeeklyActualRecordTotals(record);
      const hasRecord = record && (totals.completedCharacterCount > 0 || totals.isManual);

      const row = document.createElement("div");
      row.className = `weekly-record-row ${hasRecord ? "has-record" : ""}`;

      // Left side: Label (e.g. 3주차 [진행 중])
      let labelText = `${w}주차`;
      if (isCurrentWeek) {
        labelText += ` <span class="weekly-record-muted">[진행 중]</span>`;
      }

      // Right side: Value (crystal count & Meso)
      let valueHtml = "";
      if (hasRecord) {
        const isExpanded = expandedWeeklyRecordKey === weekKey;
        let infoStr = "";
        if (totals.isManual) {
          const crystalText = totals.crystalCount === null ? "? / 90개" : `${totals.crystalCount} / 90개`;
          infoStr = `${formatMesoKorean(totals.actualMeso)} · ${crystalText} · 수동 입력`;
        } else {
          infoStr = `${formatMesoKorean(totals.actualMeso)} · ${totals.crystalCount} / 90개`;
        }

        valueHtml = `
          <div style="display: flex; align-items: center;">
            <span>${infoStr}</span>
            <span class="weekly-record-toggle-arrow">${isExpanded ? "▲" : "▼"}</span>
          </div>
        `;
      } else {
        valueHtml = `<span class="weekly-record-muted">기록이 없습니다.</span>`;
      }

      row.innerHTML = `
        <span class="weekly-record-label">${labelText}</span>
        <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
          <span class="weekly-record-value">${valueHtml}</span>
          <button type="button" class="weekly-record-edit-button">수정</button>
        </div>
      `;

      // Expand/collapse on click if it has a record
      if (hasRecord) {
        row.addEventListener("click", () => {
          if (expandedWeeklyRecordKey === weekKey) {
            expandedWeeklyRecordKey = null;
          } else {
            expandedWeeklyRecordKey = weekKey;
          }
          renderBossIncomeCalendar();
        });
      }

      // Add edit button click handler
      const editBtn = row.querySelector(".weekly-record-edit-button");
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          editWeeklyActualIncome(weekKey);
        });
      }

      listEl.appendChild(row);

      // Render details if expanded
      if (hasRecord && expandedWeeklyRecordKey === weekKey) {
        const detailContainer = document.createElement("div");
        detailContainer.className = "weekly-record-detail";
        // Stop clicks from bubbling up to row click listener
        detailContainer.addEventListener("click", (e) => e.stopPropagation());

        let charRowsHtml = "";
        const charKeys = Object.keys(record.completedCharacters || {});
        if (charKeys.length > 0) {
          charKeys.forEach(charId => {
            const charSnapshot = record.completedCharacters[charId];
            if (charSnapshot) {
              const charName = charSnapshot.name;
              const charJob = charSnapshot.job || "직업 없음";
              const cCount = charSnapshot.crystalCount || 0;
              const aMeso = charSnapshot.actualMeso || 0;

              charRowsHtml += `
                <div class="weekly-record-character-row">
                  <span class="weekly-record-char-info" style="font-weight: 800; color: #111827;">${charName} · ${charJob}</span>
                  <span class="weekly-record-char-value" style="font-weight: 700; color: #4f46e5;">${cCount}개 · ${formatMesoKorean(aMeso)}</span>
                </div>
              `;
            }
          });
        } else {
          charRowsHtml = `<div class="weekly-record-muted" style="text-align: center; padding: 6px 0;">완료 기록 스냅샷이 없습니다.</div>`;
        }

        detailContainer.innerHTML = `
          <div class="weekly-record-detail-title">완료 캐릭터</div>
          <div class="weekly-record-character-list">
            ${charRowsHtml}
          </div>
          <button type="button" class="weekly-record-delete-button">이 주차 기록 삭제</button>
        `;

        // Safe delete listener
        const deleteBtn = detailContainer.querySelector(".weekly-record-delete-button");
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm("이 주차의 실제 수익 기록을 삭제할까요?")) {
            delete weeklyActualRecords[weekKey];
            expandedWeeklyRecordKey = null;
            saveState();
            updateUI();
          }
        });

        listEl.appendChild(detailContainer);
      }
    }
  }

  // Calendar toggle behavior
  const btnBossCalendarToggle = document.getElementById("btnBossCalendarToggle");
  const bossCalendarBody = document.getElementById("bossCalendarBody");

  if (btnBossCalendarToggle && bossCalendarBody) {
    btnBossCalendarToggle.addEventListener("click", () => {
      const shouldOpen = bossCalendarBody.hidden;
      bossCalendarBody.hidden = !shouldOpen;
      btnBossCalendarToggle.setAttribute("aria-expanded", String(shouldOpen));

      if (previousWeekActualSummaryEl) {
        previousWeekActualSummaryEl.hidden = !shouldOpen;
      }

      const icon = btnBossCalendarToggle.querySelector(".reset-calendar-toggle-icon");
      if (icon) {
        icon.textContent = shouldOpen ? "▲" : "▼";
      }

      if (shouldOpen) {
        renderPrevWeekSummary();
        renderBossIncomeCalendar();
      }
    });
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
