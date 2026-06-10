document.addEventListener("DOMContentLoaded", () => {
  const WEEKLY_CRYSTAL_LIMIT = 90;
  const CHARACTER_WEEKLY_BOSS_LIMIT = 12;

  // State
  const selectedKeys = new Set(); // Stores "bossId-difficultyId"

  // Elements
  const bossListContainer = document.getElementById("bossList");
  const crystalCountEl = document.getElementById("crystalCount");
  const totalMesoEl = document.getElementById("totalMeso");
  const limitMeterBar = document.getElementById("limitMeterBar");
  const characterLimitWarning = document.getElementById("characterLimitWarning");
  const weeklyLimitWarning = document.getElementById("weeklyLimitWarning");
  const resetBtn = document.getElementById("resetBtn");

  // Format Meso Helper (Korean units or standard formatting)
  function formatMeso(value) {
    if (value === 0) return "0";
    
    // Format in Korean style for readability (억 / 만 / 원)
    const eok = Math.floor(value / 100000000);
    const man = Math.floor((value % 100000000) / 10000);
    
    let result = "";
    if (eok > 0) {
      result += `${eok}억 `;
    }
    if (man > 0) {
      result += `${man}만`;
    }
    
    return result.trim() || value.toLocaleString();
  }

  // Render bosses
  function renderBosses() {
    if (!bossListContainer) return;
    bossListContainer.innerHTML = "";

    BOSS_DATA.forEach(boss => {
      const bossRow = document.createElement("div");
      bossRow.className = "boss-row";
      bossRow.dataset.bossId = boss.id;

      // Force Badge
      let badgeHtml = "";
      if (boss.forceType === "arcane") {
        badgeHtml = `<span class="boss-force-badge force-arcane">아케인</span>`;
      } else if (boss.forceType === "authentic") {
        badgeHtml = `<span class="boss-force-badge force-authentic">어센틱</span>`;
      }

      // Icon Path
      const iconSrc = `${BOSS_ICON_BASE}${boss.icon}`;

      // Difficulty buttons HTML
      let diffButtonsHtml = "";
      boss.difficulties.forEach(diff => {
        const key = `${boss.id}-${diff.id}`;
        const isSelected = selectedKeys.has(key) ? "is-selected" : "";
        const formattedPrice = formatMeso(diff.price);
        
        diffButtonsHtml += `
          <button 
            type="button" 
            class="boss-difficulty-button ${isSelected}" 
            data-boss-id="${boss.id}" 
            data-diff-id="${diff.id}"
            data-price="${diff.price}"
            title="${diff.label} - ${diff.price.toLocaleString()} 메소"
          >
            <span class="diff-label">${diff.label}</span>
            <span class="diff-price">${formattedPrice}</span>
          </button>
        `;
      });

      bossRow.innerHTML = `
        <div class="boss-info-col">
          <div class="boss-icon-wrapper">
            <img 
              src="${iconSrc}" 
              alt="${boss.name}" 
              class="boss-icon" 
              onerror="this.classList.add('is-missing'); this.removeAttribute('src');" 
            />
          </div>
          <div class="boss-name-wrap">
            <span class="boss-name">${boss.name}</span>
            ${badgeHtml}
          </div>
        </div>
        <div class="boss-difficulty-list">
          ${diffButtonsHtml}
        </div>
      `;

      bossListContainer.appendChild(bossRow);
    });

    // Add event listeners to difficulty buttons
    bossListContainer.querySelectorAll(".boss-difficulty-button").forEach(btn => {
      btn.addEventListener("click", () => {
        const bossId = btn.dataset.bossId;
        const diffId = btn.dataset.diffId;
        const key = `${bossId}-${diffId}`;

        if (selectedKeys.has(key)) {
          selectedKeys.delete(key);
          btn.classList.remove("is-selected");
        } else {
          selectedKeys.add(key);
          btn.classList.add("is-selected");
        }

        updateCalculations();
      });
    });
  }

  // Update calculations & warnings
  function updateCalculations() {
    const selectedCount = selectedKeys.size;
    let totalMeso = 0;

    // Calculate total meso based on selected buttons
    if (bossListContainer) {
      bossListContainer.querySelectorAll(".boss-difficulty-button.is-selected").forEach(btn => {
        totalMeso += parseInt(btn.dataset.price, 10);
      });
    }

    // Update Text Elements
    if (crystalCountEl) {
      crystalCountEl.textContent = selectedCount;
    }
    if (totalMesoEl) {
      totalMesoEl.textContent = totalMeso.toLocaleString();
    }

    // Update meter bar width (percentage up to 100%)
    if (limitMeterBar) {
      const percentage = Math.min((selectedCount / WEEKLY_CRYSTAL_LIMIT) * 100, 100);
      limitMeterBar.style.width = `${percentage}%`;
      
      // Change color based on fullness
      if (selectedCount > WEEKLY_CRYSTAL_LIMIT) {
        limitMeterBar.style.backgroundColor = "#ef4444"; // Red for overflow
      } else if (selectedCount >= WEEKLY_CRYSTAL_LIMIT * 0.9) {
        limitMeterBar.style.backgroundColor = "#f59e0b"; // Amber for near limit
      } else {
        limitMeterBar.style.backgroundColor = "#6366f1"; // Indigo default
      }
    }

    // Handle Warnings
    if (weeklyLimitWarning) {
      if (selectedCount > WEEKLY_CRYSTAL_LIMIT) {
        weeklyLimitWarning.innerHTML = `
          <div class="boss-warning-box danger">
            ⚠️ 주간 보스 결정석 판매 제한 개수(90개)를 초과했습니다. 실제 게임 내에서는 매주 최대 90개까지만 판매할 수 있으므로, 예상 수익과 차이가 발생할 수 있습니다. (초과분: +${selectedCount - WEEKLY_CRYSTAL_LIMIT}개)
          </div>
        `;
      } else {
        weeklyLimitWarning.innerHTML = "";
      }
    }

    if (characterLimitWarning) {
      if (selectedCount > CHARACTER_WEEKLY_BOSS_LIMIT) {
        characterLimitWarning.innerHTML = `
          <div class="boss-warning-box info">
            ℹ️ 한 캐릭터 기준 12개를 초과했습니다. 여러 캐릭터 수익 계산 기능은 이후 추가 예정입니다.
          </div>
        `;
      } else {
        characterLimitWarning.innerHTML = `
          <div class="boss-helper-text">
            캐릭터당 주간 보스 결정석은 최대 12개까지 판매 가능합니다.
          </div>
        `;
      }
    }
  }

  // Reset functionality
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      selectedKeys.clear();
      
      // Remove selected classes from UI
      if (bossListContainer) {
        bossListContainer.querySelectorAll(".boss-difficulty-button.is-selected").forEach(btn => {
          btn.classList.remove("is-selected");
        });
      }

      updateCalculations();
    });
  }

  // Initialize
  renderBosses();
  updateCalculations();
});
