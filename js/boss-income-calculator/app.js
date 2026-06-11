document.addEventListener("DOMContentLoaded", () => {
  const WEEKLY_CRYSTAL_LIMIT = 90;
  const CHARACTER_WEEKLY_BOSS_LIMIT = 12;
  const STORAGE_KEY = "maple_tools_boss_income_characters_v1";
  const ACTIVE_CHARACTER_KEY = "maple_tools_boss_income_active_character_v1";

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

  // State
  let characters = []; // Array of character objects
  let activeCharacterId = null;

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

  // Load state from LocalStorage
  function loadState() {
    try {
      const storedChars = localStorage.getItem(STORAGE_KEY);
      if (storedChars) {
        characters = JSON.parse(storedChars);
      } else {
        characters = [];
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
      const selectedKeys = Object.keys(char.selectedBosses || {}).filter(k => char.selectedBosses[k]);
      const crystalCount = selectedKeys.length;
      
      let charMeso = 0;
      selectedKeys.forEach(key => {
        const [bossId, diffId] = key.split(":");
        const boss = BOSS_DATA.find(b => b.id === bossId);
        if (boss) {
          const diff = boss.difficulties.find(d => d.id === diffId);
          if (diff) {
            charMeso += diff.price;
          }
        }
      });

      const isActive = char.id === activeCharacterId ? "is-active" : "";
      const avatarLetter = char.name.charAt(0);

      const card = document.createElement("div");
      card.className = `character-card ${isActive}`;
      card.dataset.charId = char.id;

      card.innerHTML = `
        <div class="char-avatar-placeholder">${avatarLetter}</div>
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
          updateUI();
        }
      });

      characterListEl.appendChild(card);
    });
  }

  // Render Middle Column: Boss Selection List
  function renderBosses() {
    if (!bossListContainer) return;
    bossListContainer.innerHTML = "";

    const activeChar = getActiveCharacter();
    const isDisabled = !activeChar;

    BOSS_DATA.forEach(boss => {
      const bossRow = document.createElement("div");
      bossRow.className = "boss-row";
      bossRow.dataset.bossId = boss.id;

      // Force Badge directly under icon
      let badgeHtml = "";
      if (boss.forceType === "arcane") {
        badgeHtml = `<span class="boss-force-label boss-force-label--arcane">아케인</span>`;
      } else if (boss.forceType === "authentic") {
        badgeHtml = `<span class="boss-force-label boss-force-label--authentic">어센틱</span>`;
      }

      // Difficulty buttons HTML
      let diffButtonsHtml = "";
      boss.difficulties.forEach(diff => {
        const key = `${boss.id}:${diff.id}`;
        
        let isSelected = false;
        if (activeChar && activeChar.selectedBosses) {
          isSelected = !!activeChar.selectedBosses[key];
        }

        const selectedClass = isSelected ? "is-selected" : "";
        const formattedPrice = formatMesoKorean(diff.price).replace(" 메소", "");

        diffButtonsHtml += `
          <button 
            type="button" 
            class="boss-difficulty-button ${selectedClass}" 
            data-boss-id="${boss.id}" 
            data-diff-id="${diff.id}"
            data-price="${diff.price}"
            ${isDisabled ? "disabled" : ""}
            title="${diff.label} - ${diff.price.toLocaleString()} 메소"
          >
            <span class="diff-label">${diff.label}</span>
            <span class="diff-price">${formattedPrice}</span>
          </button>
        `;
      });

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
        <span class="boss-name">${boss.name}</span>
        <div class="boss-difficulty-list">
          ${diffButtonsHtml}
        </div>
      `;

      const img = bossRow.querySelector(".boss-icon");
      attachBossIconFallback(img, boss.icon);

      bossListContainer.appendChild(bossRow);
    });

    // Add click event listeners to buttons
    if (!isDisabled) {
      bossListContainer.querySelectorAll(".boss-difficulty-button").forEach(btn => {
        btn.addEventListener("click", () => {
          const bossId = btn.dataset.bossId;
          const diffId = btn.dataset.diffId;
          const key = `${bossId}:${diffId}`;

          if (!activeChar.selectedBosses) {
            activeChar.selectedBosses = {};
          }

          if (activeChar.selectedBosses[key]) {
            delete activeChar.selectedBosses[key];
            btn.classList.remove("is-selected");
          } else {
            activeChar.selectedBosses[key] = true;
            btn.classList.add("is-selected");
          }

          saveState();
          updateUI();
        });
      });
    }
  }

  // Update UI, calculations, summaries, warnings, and persistence
  function updateUI() {
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
        const avatarLetter = activeChar.name.charAt(0);
        selectedCharInfo.innerHTML = `
          <div class="char-profile-header">
            <div class="char-avatar-placeholder">${avatarLetter}</div>
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
    let activeCharMeso = 0;
    let totalCrystalsAll = 0;
    let totalMesoAll = 0;

    // Calculate active character stats & render selected boss list
    if (selectedBossListEl) {
      selectedBossListEl.innerHTML = "";
    }

    if (activeChar && activeChar.selectedBosses) {
      const activeBossKeys = Object.keys(activeChar.selectedBosses).filter(k => activeChar.selectedBosses[k]);
      activeCharCrystals = activeBossKeys.length;

      let activeBossItemsHtml = "";
      activeBossKeys.forEach(key => {
        const [bossId, diffId] = key.split(":");
        const boss = BOSS_DATA.find(b => b.id === bossId);
        if (boss) {
          const diff = boss.difficulties.find(d => d.id === diffId);
          if (diff) {
            activeCharMeso += diff.price;
            activeBossItemsHtml += `
              <li class="selected-boss-item selected-boss-row" data-boss-icon="${boss.icon}">
                <div class="selected-boss-icon-wrapper">
                  <img 
                    alt="${boss.name}" 
                    class="selected-boss-icon" 
                  />
                </div>
                <span class="selected-boss-name">${boss.name} (${diff.label})</span>
                <span class="selected-boss-price">${formatMesoKorean(diff.price)}</span>
              </li>
            `;
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
    characters.forEach(c => {
      if (c.selectedBosses) {
        const keys = Object.keys(c.selectedBosses).filter(k => c.selectedBosses[k]);
        totalCrystalsAll += keys.length;

        keys.forEach(key => {
          const [bossId, diffId] = key.split(":");
          const boss = BOSS_DATA.find(b => b.id === bossId);
          if (boss) {
            const diff = boss.difficulties.find(d => d.id === diffId);
            if (diff) {
              totalMesoAll += diff.price;
            }
          }
        });
      }
    });

    // 4. Update calculations text elements in the Right Column
    if (charCrystalCountEl) {
      charCrystalCountEl.textContent = `${activeCharCrystals} / 12`;
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
    // Character limit warning (12 crystals)
    if (charLimitWarningEl) {
      if (activeCharCrystals > CHARACTER_WEEKLY_BOSS_LIMIT) {
        charLimitWarningEl.innerHTML = `
          <div class="boss-warning-box danger">
            ⚠️ 한 캐릭터 기준 주간 보스 결정석은 최대 12개까지 판매 가능합니다. (현재: ${activeCharCrystals}개)
          </div>
        `;
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
        selectedBosses: {}
      };

      characters.push(newChar);
      activeCharacterId = newChar.id;
      
      charNameInput.value = newChar.name;
      charJobInput.value = newChar.job;

      saveState();
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
      if (activeChar && activeChar.selectedBosses) {
        activeChar.selectedBosses = {};
        saveState();
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
        });
        saveState();
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

  // Initial load & render
  loadState();
  updateUI();

  // Run and schedule KST countdown timer
  updateResetCountdown();
  setInterval(updateResetCountdown, 30000); // Update every 30 seconds
});
