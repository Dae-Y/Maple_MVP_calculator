const ICON_BASE = "assets/mvp-calculator/items/";
const MVP_ICON_BASE = "assets/mvp-calculator/tiers/";
const FALLBACK_ICON = `${ICON_BASE}fallback.png`;
const AUCTION_FEE_RATE = 0.03;
const STORAGE_KEY = "maple_mvp_calculator_state_v1";

let latestPlanResults = null;

const MVP_LEVELS = [
  {
    id: "bronze",
    name: "브론즈",
    amount: 150_000,
    nextId: "silver",
  },
  {
    id: "silver",
    name: "실버",
    amount: 300_000,
    nextId: "gold",
  },
  {
    id: "gold",
    name: "골드",
    amount: 600_000,
    nextId: "diamond",
  },
  {
    id: "diamond",
    name: "다이아",
    amount: 900_000,
    nextId: "red",
  },
  {
    id: "red",
    name: "레드",
    amount: 1_500_000,
    nextId: "black",
  },
  {
    id: "black",
    name: "블랙",
    amount: 3_000_000,
    nextId: null,
  },
];

const MVP_TIERS = [
  {
    id: "silver",
    name: "실버",
    amount: 300_000,
    icon: "mvp_silver.webp",
  },
  {
    id: "gold",
    name: "골드",
    amount: 600_000,
    icon: "mvp_gold.webp",
  },
  {
    id: "diamond",
    name: "다이아",
    amount: 900_000,
    icon: "mvp_diamond.webp",
  },
  {
    id: "red",
    name: "레드",
    amount: 1_500_000,
    icon: "mvp_red.webp",
  },
  {
    id: "black",
    name: "블랙",
    amount: 3_000_000,
    icon: "mvp_black.webp",
  },
];

if (!window.DEFAULT_CASH_ITEMS) {
  console.error("cashItems.js가 로드되지 않았습니다. index.html에서 app.js보다 먼저 불러와야 합니다.");
}
const ITEMS = [...(window.DEFAULT_CASH_ITEMS ?? [])];

const $ = (id) => document.getElementById(id);

function formatNumber(value) {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatKRW(value) {
  return `${formatNumber(value)}원`;
}

function formatCash(value) {
  return `${formatNumber(value)} 캐시`;
}

function formatCompactCash(value) {
  const rounded = Math.round(value);

  if (rounded === 0) return "0 캐시";

  const man = Math.floor(rounded / 10_000);
  const rest = rounded % 10_000;

  if (man > 0 && rest > 0) {
    return `${man}만 ${formatNumber(rest)} 캐시`;
  }

  if (man > 0) {
    return `${man}만 캐시`;
  }

  return `${formatNumber(rest)} 캐시`;
}

function formatMeso(value) {
  const rounded = Math.round(value);

  if (rounded === 0) return "0";

  const eok = Math.floor(rounded / 100_000_000);
  const man = Math.floor((rounded % 100_000_000) / 10_000);
  const rest = rounded % 10_000;

  const parts = [];

  if (eok > 0) parts.push(`${eok}억`);
  if (man > 0) parts.push(`${man}만`);
  if (rest > 0) parts.push(`${rest}`);

  return parts.join(" ");
}

function formatCompactMeso(value) {
  const rounded = Math.round(value);

  if (rounded === 0) return "0";

  if (rounded >= 100_000_000) {
    const eokVal = rounded / 100_000_000;
    const floored = Math.floor(eokVal * 1000) / 1000;
    const formattedNum = Number(floored.toFixed(3)).toString();
    return `${formattedNum}억`;
  }

  if (rounded >= 10_000) {
    const manVal = rounded / 10_000;
    const floored = Math.floor(manVal * 1000) / 1000;
    const formattedNum = Number(floored.toFixed(3)).toString();
    return `${formattedNum}만`;
  }

  return formatNumber(rounded);
}

function renderCompactMesoSpan(value) {
  const fullText = `${formatMeso(value)} 메소`;
  const compactText = formatCompactMeso(value);
  return `<span class="compact-meso-value" title="${fullText}" aria-label="${fullText}">${compactText}</span>`;
}

function parseNumberInput(value) {
  const cleaned = String(value ?? "").replaceAll(",", "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMesoText(value) {
  return String(value ?? "")
    .replaceAll(",", "")
    .trim()
    // 한영키 안 누른 상태에서 1억, 1만을 입력한 경우 대응
    // 억 = djr, 만 = aks
    .replace(/djr/gi, "억")
    .replace(/aks/gi, "만");
}

function parseMesoInput(value) {
  const text = normalizeMesoText(value);

  if (!text) return 0;

  let total = 0;

  const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억/);
  const manMatch = text.match(/(\d+(?:\.\d+)?)\s*만/);

  if (eokMatch) {
    total += Number(eokMatch[1]) * 100_000_000;
  }

  if (manMatch) {
    total += Number(manMatch[1]) * 10_000;
  }

  const remainderText = text
    .replace(/(\d+(?:\.\d+)?)\s*억/, "")
    .replace(/(\d+(?:\.\d+)?)\s*만/, "")
    .replace(/[^\d]/g, "");

  if (remainderText) {
    total += Number(remainderText);
  }

  if (total > 0) return total;

  const numericOnly = text.replace(/[^\d]/g, "");
  return numericOnly ? Number(numericOnly) : 0;
}

function getIconPath(icon) {
  return `${ICON_BASE}${icon || "fallback.png"}`;
}

function getMvpLevelById(id) {
  return MVP_LEVELS.find((level) => level.id === id) ?? MVP_LEVELS[0];
}

function getNextMvpLevel(currentLevel) {
  if (!currentLevel.nextId) return null;
  return getMvpLevelById(currentLevel.nextId);
}

function calculateCurrentMvpFromTier() {
  const currentTierId = $("currentTier").value;
  const currentLevel = getMvpLevelById(currentTierId);
  const nextLevel = getNextMvpLevel(currentLevel);
  const remainingToNext = parseNumberInput($("remainingToNext").value);

  if (!nextLevel) {
    return {
      currentMvp: currentLevel.amount,
      currentLevel,
      nextLevel: null,
      remainingToNext: 0,
      warning: "블랙 등급은 다음 등급이 없어 현재 누적금액을 블랙 기준 금액으로 계산합니다.",
    };
  }

  const currentMvp = Math.max(0, nextLevel.amount - remainingToNext);

  let warning = "";

  if (
    currentLevel.id === "bronze" &&
    remainingToNext === nextLevel.amount
  ) {
    warning = "MVP작을 처음 하시는군요!";
  } else if (currentMvp < currentLevel.amount) {
    warning = `${currentLevel.name} 등급 기준보다 낮게 계산되었습니다. 입력한 남은 캐시가 너무 큰지 확인해보세요.`;
  }

  if (currentMvp > nextLevel.amount) {
    warning = `${nextLevel.name} 기준보다 높게 계산되었습니다. 남은 캐시는 0 이상이어야 합니다.`;
  }

  return {
    currentMvp,
    currentLevel,
    nextLevel,
    remainingToNext,
    warning,
  };
}

function updateCurrentMvpPreview() {
  const result = calculateCurrentMvpFromTier();

  $("computedCurrentMvp").textContent = formatCash(result.currentMvp);

  if (!result.nextLevel) {
    $("remainingToNextLabel").textContent = "다음 등급까지 남은 캐시";
    $("remainingToNext").value = 0;
    $("remainingToNext").disabled = true;
    $("computedCurrentMvpNote").textContent = result.warning;
    return;
  }

  $("remainingToNext").disabled = false;
  $("remainingToNextLabel").textContent = `${result.nextLevel.name} 등급까지 남은 캐시`;

  $("computedCurrentMvpNote").textContent =
    result.warning ||
    `${result.nextLevel.name} 기준 ${formatCash(result.nextLevel.amount)} - 남은 캐시 ${formatCash(result.remainingToNext)}로 계산했습니다.`;
}

function getSelectedTier() {
  const selectedAmount = parseNumberInput($("selectedTargetMvp").value);
  return MVP_TIERS.find((tier) => tier.amount === selectedAmount) ?? MVP_TIERS[3];
}

function renderMvpTiers() {
  const selectedAmount = parseNumberInput($("selectedTargetMvp").value);
  const tierList = $("mvpTierList");

  tierList.innerHTML = MVP_TIERS.map((tier) => {
    const activeClass = tier.amount === selectedAmount ? "active" : "";

    return `
      <button
        type="button"
        class="mvp-tier-button ${activeClass}"
        data-mvp-amount="${tier.amount}"
        data-tier-id="${tier.id}"
        aria-label="${tier.name} 선택"
      >
        <img src="${MVP_ICON_BASE}${tier.icon}" alt="${tier.name}" />
        <span>${tier.name}</span>
        <small>${formatCash(tier.amount)}</small>
      </button>
    `;
  }).join("");

  document.querySelectorAll(".mvp-tier-button").forEach((button) => {
    button.addEventListener("click", () => {
      $("selectedTargetMvp").value = button.dataset.mvpAmount;
      renderMvpTiers();
    });
  });
}

function getCurrentAuctionInputValues() {
  const values = {};

  document.querySelectorAll(".auction-input").forEach((input) => {
    values[input.id] = input.value;
  });

  return values;
}

function renderItemRows(items) {
  return items.map((item) => {
    const inputId = `auction-${item.id}`;

    return `
      <div class="item-row">
        <img
          class="item-icon"
          src="${getIconPath(item.icon)}"
          alt="${item.name}"
          onerror="this.src='${FALLBACK_ICON}'"
        />

        <div class="item-info">
          <div class="item-name cash-item-name" title="${item.name}">${item.name}</div>
        </div>

        <div class="cash-price" title="${formatCash(item.cashPrice)}">${formatCash(item.cashPrice)}</div>

        <div class="auction-container">
          <input
            class="auction-input"
            id="${inputId}"
            type="text"
            inputmode="text"
            lang="ko"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="예상 판매가격 입력"
          />
          <button
            class="btn-reset-auction"
            type="button"
            data-target="${inputId}"
            title="이 가격만 초기화"
            aria-label="${item.name} 경매장 가격 초기화"
          >
            ⟳
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function attachAuctionResetHandlers() {
  document.querySelectorAll(".btn-reset-auction").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      const input = $(targetId);

      if (input) {
        input.value = "";
        input.focus();
      }
    });
  });
}

function renderItems(preserveInputValues = false) {
  const previousValues = preserveInputValues ? getCurrentAuctionInputValues() : {};
  const itemList = $("itemList");

  const nonMileageItems = ITEMS.filter((item) => !item.mileageDiscount);
  const mileageItems = ITEMS.filter((item) => item.mileageDiscount);

  itemList.innerHTML = `
    <div class="item-groups">
      <section class="item-group">
        <div class="item-group-header">
          <h3>마일리지 미적용 품목</h3>
          <p>넥슨캐시로만 구매 가능합니다.</p>
        </div>

        <div class="grouped-item-list">
          ${renderItemRows(nonMileageItems)}
        </div>
      </section>

      <section class="item-group">
        <div class="item-group-header">
          <h3>마일리지 적용 품목</h3>
          <p>보유 마일리지를 최대 30%까지 사용할 수 있습니다.</p>
        </div>

        <div class="grouped-item-list">
          ${renderItemRows(mileageItems)}
        </div>
      </section>
    </div>
  `;

  Object.entries(previousValues).forEach(([inputId, value]) => {
    const input = $(inputId);
    if (input) input.value = value;
  });

  attachAuctionResetHandlers();
}

function addCustomItem() {
  const name = $("customItemName").value.trim();
  const cashPrice = parseNumberInput($("customItemCashPrice").value);
  const mileageDiscount = $("customItemMileage").checked;

  if (!name) {
    alert("아이템 이름을 입력해주세요.");
    return;
  }

  if (cashPrice <= 0) {
    alert("캐시 가격을 올바르게 입력해주세요.");
    return;
  }

  const customItem = {
    id: `custom_${Date.now()}`,
    name,
    cashPrice,
    icon: "fallback.png",
    mileageDiscount,
    isCustom: true,
  };

  ITEMS.push(customItem);

  $("customItemName").value = "";
  $("customItemCashPrice").value = "";
  $("customItemMileage").checked = false;

  renderItems(true);
}

function getAuctionInputValues() {
  const values = {};

  for (const item of ITEMS) {
    const input = $(`auction-${item.id}`);
    if (input && input.value.trim()) {
      values[item.id] = input.value.trim();
    }
  }

  return values;
}

function getCustomItemsForStorage() {
  return ITEMS
    .filter((item) => item.isCustom)
    .map((item) => ({
      id: item.id,
      name: item.name,
      cashPrice: item.cashPrice,
      icon: "fallback.png",
      mileageDiscount: item.mileageDiscount,
      isCustom: true,
    }));
}

function saveCalculatorState() {
  const state = {
    version: 1,
    savedAt: new Date().toISOString(),

    inputs: {
      currentMileage: $("currentMileage").value,
      waterRate: $("waterRate").value,
      currentTier: $("currentTier").value,
      remainingToNext: $("remainingToNext").value,
      selectedTargetMvp: $("selectedTargetMvp").value,
      disableMileage: $("disableMileage").checked,
      includeMileageEfficiencyComparison: $("includeMileageEfficiencyComparison") ? $("includeMileageEfficiencyComparison").checked : false,
    },

    auctionInputs: getAuctionInputValues(),
    customItems: getCustomItemsForStorage(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  alert("저장되었습니다. 다음에 이 브라우저에서 다시 열어도 입력값이 유지됩니다.");
}

function loadCalculatorState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    return JSON.parse(raw);
  } catch (error) {
    console.warn("저장된 데이터를 불러오지 못했습니다.", error);
    return null;
  }
}

function applySavedCustomItems(savedState) {
  if (!savedState || !Array.isArray(savedState.customItems)) {
    return;
  }

  for (const item of savedState.customItems) {
    const alreadyExists = ITEMS.some((existingItem) => existingItem.id === item.id);

    if (!alreadyExists) {
      ITEMS.push({
        id: item.id,
        name: item.name,
        cashPrice: Number(item.cashPrice),
        icon: "fallback.png",
        mileageDiscount: Boolean(item.mileageDiscount),
        isCustom: true,
      });
    }
  }
}

function applySavedInputs(savedState) {
  if (!savedState || !savedState.inputs) {
    return;
  }

  const inputs = savedState.inputs;

  if ($("currentMileage")) $("currentMileage").value = inputs.currentMileage ?? 0;
  if ($("waterRate")) $("waterRate").value = inputs.waterRate ?? 1600;
  if ($("currentTier")) $("currentTier").value = inputs.currentTier ?? "bronze";
  if ($("remainingToNext")) $("remainingToNext").value = inputs.remainingToNext ?? 300_000;
  if ($("selectedTargetMvp")) $("selectedTargetMvp").value = inputs.selectedTargetMvp ?? 1_500_000;
  if ($("disableMileage")) $("disableMileage").checked = Boolean(inputs.disableMileage);
  if ($("includeMileageEfficiencyComparison")) {
    $("includeMileageEfficiencyComparison").checked = Boolean(inputs.includeMileageEfficiencyComparison);
  }

  if (savedState.auctionInputs) {
    Object.entries(savedState.auctionInputs).forEach(([itemId, value]) => {
      const input = $(`auction-${itemId}`);
      if (input) {
        input.value = value;
      }
    });
  }

  renderMvpTiers();
  updateCurrentMvpPreview();
}

function getAuctionPrices() {
  const prices = {};

  for (const item of ITEMS) {
    const input = $(`auction-${item.id}`);
    if (input) {
      prices[item.id] = parseMesoInput(input.value);
    }
  }

  return prices;
}

function calculateSinglePurchase(
  item,
  currentMileage,
  auctionPrice,
  waterRate,
  disableMileage
) {
  const maxMileageDiscount = item.mileageDiscount && !disableMileage
    ? Math.floor(item.cashPrice * 0.3)
    : 0;

  const mileageUsed = Math.min(currentMileage, maxMileageDiscount);
  const actualCashSpent = item.cashPrice - mileageUsed;

  const mileageEarned = Math.floor(actualCashSpent * 0.05);

  const mesoAfterFee = auctionPrice * (1 - AUCTION_FEE_RATE);
  const recoveredCash = Math.floor((mesoAfterFee / 100_000_000) * waterRate);

  const loss = actualCashSpent - recoveredCash;
  const efficiency = actualCashSpent > 0 ? recoveredCash / actualCashSpent : 0;

  return {
    item,
    mileageUsed,
    actualCashSpent,
    mileageEarned,
    mesoAfterFee,
    recoveredCash,
    loss,
    efficiency,
  };
}

function makeSummaryBox(label, value) {
  return `
    <div class="summary-box">
      <div class="summary-label">${label}</div>
      <div class="summary-value">${value}</div>
    </div>
  `;
}

function formatMvpAndSpent(currentMvp, totalCashSpent) {
  if (Math.round(currentMvp) === Math.round(totalCashSpent)) {
    return formatCompactCash(currentMvp);
  }

  return `
    <div>누적 ${formatCompactCash(currentMvp)}</div>
    <div>사용 ${formatCompactCash(totalCashSpent)}</div>
  `;
}

function getTotalItemCount(plan) {
  return Object.values(plan).reduce((sum, entry) => sum + entry.count, 0);
}

function getStrategyCandidates(items, auctionPrices, mileage, waterRate, disableMileage, strategy, itemCounts) {
  return items
    .map((item) => {
      const auctionPrice = auctionPrices[item.id];

      if (!auctionPrice || auctionPrice <= 0) {
        return null;
      }

      if (strategy === "speed" && (itemCounts[item.id] ?? 0) >= 5) {
        return null;
      }

      return calculateSinglePurchase(
        item,
        mileage,
        auctionPrice,
        waterRate,
        disableMileage
      );
    })
    .filter((candidate) => candidate !== null && candidate.actualCashSpent > 0);
}

function sortCandidates(candidates, strategy) {
  if (strategy === "profit") {
    candidates.sort((a, b) => {
      if (b.efficiency !== a.efficiency) {
        return b.efficiency - a.efficiency;
      }

      return b.actualCashSpent - a.actualCashSpent;
    });

    return;
  }

  if (strategy === "speed") {
    candidates.sort((a, b) => {
      if (b.item.cashPrice !== a.item.cashPrice) {
        return b.item.cashPrice - a.item.cashPrice;
      }

      if (b.actualCashSpent !== a.actualCashSpent) {
        return b.actualCashSpent - a.actualCashSpent;
      }

      return b.efficiency - a.efficiency;
    });
  }
}

function simulatePurchasePlan({
  strategy,
  startingMileage,
  waterRate,
  targetMvp,
  currentMvpInput,
  disableMileage,
  auctionPrices,
}) {
  let mileage = startingMileage;
  let currentMvp = currentMvpInput;

  let totalCashSpent = 0;
  let totalMileageUsed = 0;
  let totalMileageEarned = 0;
  let totalMesoAfterFee = 0;
  let totalRecoveredCash = 0;

  const plan = {};
  const itemCounts = {};
  const maxIterations = 100_000;

  let iterations = 0;
  let stoppedReason = "";

  while (currentMvp < targetMvp && iterations < maxIterations) {
    iterations++;

    const candidates = getStrategyCandidates(
      ITEMS,
      auctionPrices,
      mileage,
      waterRate,
      disableMileage,
      strategy,
      itemCounts
    );

    if (candidates.length === 0) {
      stoppedReason = strategy === "speed"
        ? "시간우선 조합은 동일 아이템 5개 제한 안에서 목표 MVP 금액을 달성하지 못했습니다. 더 많은 아이템 가격을 입력하거나 제한을 늘려야 합니다."
        : "입력된 경매장 가격 기준으로 구매 가능한 아이템이 없어 계산이 중단되었습니다.";
      break;
    }

    sortCandidates(candidates, strategy);

    const best = candidates[0];
    const itemId = best.item.id;

    itemCounts[itemId] = (itemCounts[itemId] ?? 0) + 1;

    mileage -= best.mileageUsed;

    currentMvp += best.actualCashSpent;
    totalCashSpent += best.actualCashSpent;

    mileage += best.mileageEarned;
    totalMileageUsed += best.mileageUsed;
    totalMileageEarned += best.mileageEarned;

    totalRecoveredCash += best.recoveredCash;
    totalMesoAfterFee += best.mesoAfterFee;

    if (!plan[itemId]) {
      plan[itemId] = {
        name: best.item.name,
        count: 0,
        totalCashSpent: 0,
        totalMileageUsed: 0,
        totalRecoveredCash: 0,
        totalLoss: 0,
      };
    }

    plan[itemId].count += 1;
    plan[itemId].totalCashSpent += best.actualCashSpent;
    plan[itemId].totalMileageUsed += best.mileageUsed;
    plan[itemId].totalRecoveredCash += best.recoveredCash;
    plan[itemId].totalLoss += best.loss;
  }

  if (iterations >= maxIterations) {
    stoppedReason = "반복 횟수가 너무 많아 계산이 중단되었습니다.";
  }

  const actualCost = totalCashSpent - totalRecoveredCash;
  const mvpAchieved = currentMvp >= targetMvp;

  return {
    strategy,
    actualCost,
    targetMvp,
    currentMvp,
    mvpAchieved,
    mileage,
    totalCashSpent,
    totalMileageUsed,
    totalMileageEarned,
    totalMesoAfterFee,
    totalRecoveredCash,
    totalItemCount: getTotalItemCount(plan),
    plan,
    stoppedReason,
  };
}

function runSimulation() {
  const startingMileage = parseNumberInput($("currentMileage").value);
  const waterRate = parseNumberInput($("waterRate").value);
  const targetMvp = parseNumberInput($("selectedTargetMvp").value);
  const currentMvpInput = calculateCurrentMvpFromTier().currentMvp;
  const disableMileage = $("disableMileage").checked;

  const selectedTier = getSelectedTier();
  const auctionPrices = getAuctionPrices();

  if (targetMvp <= 0 || waterRate <= 0) {
    alert("목표 MVP 등급과 물통비율을 올바르게 입력해주세요.");
    return;
  }

  const hasAnyAuctionPrice = Object.values(auctionPrices).some((price) => price > 0);

  if (!hasAnyAuctionPrice) {
    alert("최소 1개 이상의 아이템 경매장 가격을 입력해주세요.");
    return;
  }

  const profitPlan = simulatePurchasePlan({
    strategy: "profit",
    startingMileage,
    waterRate,
    targetMvp,
    currentMvpInput,
    disableMileage,
    auctionPrices,
  });

  const speedPlan = simulatePurchasePlan({
    strategy: "speed",
    startingMileage,
    waterRate,
    targetMvp,
    currentMvpInput,
    disableMileage,
    auctionPrices,
  });

  latestPlanResults = {
    selectedTier,
    targetMvp,
    disableMileage,
    profitPlan,
    speedPlan,
  };

  if ($("strategySelect")) {
    $("strategySelect").value = "profit";
  }

  renderResults(latestPlanResults);
  renderSelectedStrategyPlan("profit");
}

function setupCollapsibleSection({ buttonId, bodyId, expandedLabel, collapsedLabel }) {
  const button = $(buttonId);
  const body = $(bodyId);
  if (!button || !body) return;

  button.addEventListener("click", () => {
    const isCollapsed = body.classList.contains("is-collapsed");
    if (isCollapsed) {
      body.classList.remove("is-collapsed");
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", expandedLabel);
    } else {
      body.classList.add("is-collapsed");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", collapsedLabel);
    }
  });
}

function expandCollapsibleSection({ buttonId, bodyId, expandedLabel }) {
  const button = $(buttonId);
  const body = $(bodyId);
  if (body) {
    body.classList.remove("is-collapsed");
  }
  if (button) {
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", expandedLabel);
  }
}

function renderResults(result) {
  $("resultSection").classList.remove("hidden");
  expandCollapsibleSection({
    buttonId: "toggleMvpResultBtn",
    bodyId: "mvpCalculationResultBody",
    expandedLabel: "MVP 계산 결과 접기",
  });
  renderStrategySummary("profit");
}

function getPlanResultByStrategy(strategy) {
  if (!latestPlanResults) return null;

  return strategy === "speed"
    ? latestPlanResults.speedPlan
    : latestPlanResults.profitPlan;
}

function getStrategyDisplayName(strategy) {
  return strategy === "speed" ? "시간우선" : "이익우선";
}

function renderStrategySummary(strategy) {
  if (!latestPlanResults) return;

  const planResult = getPlanResultByStrategy(strategy);
  const strategyName = getStrategyDisplayName(strategy);

  $("resultTitle").textContent = `계산 결과 - ${strategyName} 계산 결과 기준입니다.`;

  const recoveryRate =
    planResult.totalCashSpent > 0
      ? `${((planResult.totalRecoveredCash / planResult.totalCashSpent) * 100).toFixed(2)}%`
      : "-";

  $("summaryGrid").innerHTML = [
    makeSummaryBox("목표 MVP 등급", `${latestPlanResults.selectedTier.name} / ${formatCompactCash(latestPlanResults.targetMvp)}`),
    makeSummaryBox("실제 소모된 내 현금", formatKRW(planResult.actualCost)),
    makeSummaryBox("총 MVP 누적 / 사용 캐시", formatMvpAndSpent(planResult.currentMvp, planResult.totalCashSpent)),
    makeSummaryBox("총 회수 현금", formatKRW(planResult.totalRecoveredCash)),
    makeSummaryBox("최종 회수율", recoveryRate),
    makeSummaryBox("총 마일리지 사용", `${formatNumber(planResult.totalMileageUsed)} 마일리지`),
    makeSummaryBox("총 마일리지 적립", `${formatNumber(planResult.totalMileageEarned)} 마일리지`),
    makeSummaryBox("최종 마일리지", `${formatNumber(planResult.mileage)} 마일리지`),
  ].join("");
}

function renderPlanRows(plan) {
  const rows = Object.values(plan)
    .sort((a, b) => b.totalCashSpent - a.totalCashSpent)
    .map((entry) => {
      return `
        <tr>
          <td>${entry.name}</td>
          <td>${formatNumber(entry.count)}개</td>
          <td>${formatCash(entry.totalCashSpent)}</td>
          <td>${formatNumber(entry.totalMileageUsed)}</td>
          <td>${formatKRW(entry.totalRecoveredCash)}</td>
          <td>${formatKRW(entry.totalLoss)}</td>
        </tr>
      `;
    })
    .join("");

  return rows || `
    <tr>
      <td colspan="6">구매 가능한 조합이 없습니다.</td>
    </tr>
  `;
}

function renderStrategyNotes(planResult, disableMileage) {
  const notes = [];

  notes.push(`수수료 후 받은 총 메소는 ${formatMeso(planResult.totalMesoAfterFee)} 메소입니다.`);

  if (planResult.mvpAchieved) {
    notes.push("목표 MVP 금액을 달성했습니다. MVP 누적은 마일리지 할인 후 실제 넥슨캐시가 차감된 금액 기준으로 계산했습니다.");
  } else {
    notes.push("목표 MVP 금액을 달성하지 못했습니다. 입력값 또는 아이템 제한을 확인해보세요.");
  }

  if (disableMileage) {
    notes.push("마일리지 미사용 옵션이 켜져 있어, 마일리지 할인 가능 아이템도 마일리지를 사용하지 않는 것으로 계산했습니다.");
  } else {
    notes.push("마일리지 할인 가능 아이템은 보유 마일리지 한도 내에서 최대 30%까지 사용하는 것으로 계산했습니다.");
  }

  notes.push("예상 손실의 마이너스 수치는 캐시템을 해당 가격에 판매하면 이득을 보는 것을 뜻합니다.");

  if (planResult.actualCost < 0) {
    notes.push("축하합니다. 이득보고 MVP작 하셨네요!");
  }

  if (planResult.stoppedReason) {
    notes.push(planResult.stoppedReason);
  }

  $("resultNote").innerHTML = `
    <ul>
      ${notes.map((note) => `<li>${note}</li>`).join("")}
    </ul>
  `;
}

function renderStrategySummarySentence(planResult, strategy) {
  const strategyName = strategy === "speed" ? "시간우선" : "이익우선";
  const cashText = formatCompactCash(planResult.totalCashSpent);
  const costText = formatKRW(Math.abs(planResult.actualCost));

  let detail = "";

  if (!planResult.mvpAchieved) {
    detail = "현재 입력값 기준으로는 목표 MVP 등급 달성이 어려워 보입니다. 아이템 가격을 더 입력하거나 계산 방식을 바꿔보세요.";
  } else if (planResult.actualCost < 0) {
    detail = `현재 상황에선 ${cashText}를 사용해서 위 캐시 아이템을 팔고, 총합 대략 ${costText} 이득을 보면서 원하는 MVP 등급을 달성 가능해 보입니다.`;
  } else {
    detail = `현재 상황에선 ${cashText}를 사용해서 위 캐시 아이템을 팔고, 총합 대략 ${costText} 소모해서 원하는 MVP 등급을 달성 가능해 보입니다.`;
  }

  $("strategySummarySentence").innerHTML = `
    <div class="summary-title">요약: ${strategyName}</div>
    <div class="summary-detail">- ${detail}</div>
  `;
}

function renderSelectedStrategyPlan(strategy) {
  if (!latestPlanResults) return;

  const planResult = getPlanResultByStrategy(strategy);

  renderStrategySummary(strategy);

  $("planTableBody").innerHTML = renderPlanRows(planResult.plan);

  if ($("strategyDescription")) {
    if (strategy === "speed") {
      $("strategyDescription").textContent =
        "손실을 조금 감수하더라도 빠르게 MVP작을 끝내는 조합입니다. 동일 아이템은 최대 5개까지만 사용하고, 비싼 캐시템 위주로 계산합니다.";
    } else {
      $("strategyDescription").textContent =
        "예상 손실을 최소화하는 구매 조합입니다. 다만 같은 아이템을 여러 개 팔아야 해서 시간이 오래 걸릴 수 있습니다.";
    }
  }

  renderStrategyNotes(planResult, latestPlanResults.disableMileage);
  renderStrategySummarySentence(planResult, strategy);
}

function calculateBreakEvenSalePrice(costKrw, waterRate, feePercent) {
  const feeMultiplier = 1 - (feePercent / 100);
  if (waterRate <= 0 || feeMultiplier <= 0) return 0;
  return Math.ceil((costKrw / waterRate) * 100_000_000 / feeMultiplier);
}

function classifyEfficiency(profitKrw) {
  const rounded = Math.round(profitKrw);
  if (rounded > 0) {
    return { key: "profit", label: "흑자", className: "is-profit" };
  } else if (rounded === 0) {
    return { key: "break-even", label: "본전", className: "is-break-even" };
  } else {
    return { key: "loss", label: "손실", className: "is-loss" };
  }
}

function formatEfficiencyProfitText(profitKrw) {
  const rounded = Math.round(profitKrw);
  if (rounded > 0) {
    return `+${formatNumber(rounded)}원 이득`;
  } else if (rounded === 0) {
    return `0원 본전`;
  } else {
    return `-${formatNumber(Math.abs(rounded))}원 손실`;
  }
}

function formatBreakEvenDiffText(expectedSalePrice, breakEvenMeso) {
  const diff = expectedSalePrice - breakEvenMeso;
  if (diff > 0) {
    return `본전보다 ${formatCompactMeso(diff)} 높음`;
  } else if (diff < 0) {
    return `본전보다 ${formatCompactMeso(Math.abs(diff))} 낮음`;
  } else {
    return `본전과 동일`;
  }
}

function calculateItemEfficiency(item, options) {
  const { expectedSalePrice, waterRate, feePercent } = options;
  const feeMultiplier = 1 - (feePercent / 100);
  const grossSaleMeso = expectedSalePrice;
  const netSaleMeso = grossSaleMeso * feeMultiplier;
  const recoveredKrw = (netSaleMeso / 100_000_000) * waterRate;

  const cashOnlyCostKrw = item.cashPrice;
  const cashOnlyProfitKrw = recoveredKrw - cashOnlyCostKrw;
  const cashOnlyRecoveryRate = cashOnlyCostKrw > 0 ? (recoveredKrw / cashOnlyCostKrw) * 100 : 0;
  const cashOnlyBreakEvenMeso = calculateBreakEvenSalePrice(cashOnlyCostKrw, waterRate, feePercent);
  const cashOnlyStatus = classifyEfficiency(cashOnlyProfitKrw);

  let mileageAnalysis = null;
  if (item.mileageDiscount) {
    const maxMileageDiscount = Math.floor(item.cashPrice * 0.3);
    const mileageCashCostKrw = item.cashPrice - maxMileageDiscount;
    const mileageProfitKrw = recoveredKrw - mileageCashCostKrw;
    const mileageRecoveryRate = mileageCashCostKrw > 0 ? (recoveredKrw / mileageCashCostKrw) * 100 : 0;
    const mileageBreakEvenMeso = calculateBreakEvenSalePrice(mileageCashCostKrw, waterRate, feePercent);
    const mileageStatus = classifyEfficiency(mileageProfitKrw);

    mileageAnalysis = {
      discountAmount: maxMileageDiscount,
      mileageCashCostKrw,
      mileageProfitKrw,
      mileageRecoveryRate,
      mileageBreakEvenMeso,
      mileageStatus,
    };
  }

  return {
    item,
    expectedSalePrice,
    grossSaleMeso,
    netSaleMeso,
    recoveredKrw,
    cashOnlyCostKrw,
    cashOnlyProfitKrw,
    cashOnlyRecoveryRate,
    cashOnlyBreakEvenMeso,
    cashOnlyStatus,
    mileageAnalysis,
  };
}

function renderItemEfficiencyEmptyState(message) {
  const summaryEl = $("itemEfficiencySummary");
  const containerEl = $("itemEfficiencyTableContainer");

  if (summaryEl) summaryEl.innerHTML = "";
  if (containerEl) {
    containerEl.innerHTML = `
      <div class="item-efficiency-empty">
        ${message}
      </div>
    `;
  }
}

function renderItemEfficiencyResults(results, options) {
  const { totalCount, validCount, excludedCount, includeMileage } = options;
  const summaryEl = $("itemEfficiencySummary");
  const containerEl = $("itemEfficiencyTableContainer");

  const profitItemsCount = results.filter((r) => r.cashOnlyProfitKrw > 0).length;
  const topResult = results[0];

  const summaryBoxesHtml = `
    <div class="summary-grid">
      ${makeSummaryBox("비교 품목", `${validCount}개 ${excludedCount > 0 ? `<small style="font-size:12px;color:#6b7280;">(미입력 ${excludedCount}개 제외)</small>` : ""}`)}
      ${makeSummaryBox("흑자 품목", `${profitItemsCount}개`)}
      <div class="summary-box summary-checkbox-card">
        <div class="summary-label">마일리지 비교</div>
        <label class="summary-checkbox-row">
          <input id="includeMileageEfficiencyComparison" type="checkbox" ${includeMileage ? "checked" : ""} />
          <div>
            <span>30% 적용 비교</span>
            <small>적용 가능 품목 최대 30% 할인</small>
          </div>
        </label>
      </div>
    </div>
  `;

  let highlightHtml = "";
  if (topResult) {
    if (topResult.cashOnlyProfitKrw > 0) {
      const diffText = formatBreakEvenDiffText(topResult.expectedSalePrice, topResult.cashOnlyBreakEvenMeso).replace("본전보다 ", "");
      const profitText = formatEfficiencyProfitText(topResult.cashOnlyProfitKrw);
      highlightHtml = `
        <div class="item-efficiency-best-item">
          현재 입력한 시세에서는 <strong>${topResult.item.name}</strong>의 현금 사용 기준 회수율이 가장 높습니다.<br />
          본전 경매장가보다 약 <strong>${diffText}</strong>, 1회 구매 기준 약 <strong>${profitText}</strong>입니다.
        </div>
      `;
    } else {
      highlightHtml = `
        <div class="item-efficiency-best-item">
          현재 입력한 시세에서는 흑자 품목이 없습니다.<br />
          그중 <strong>${topResult.item.name}</strong>이 가장 높은 회수율(<strong>${topResult.cashOnlyRecoveryRate.toFixed(2)}%</strong>)을 보입니다.
        </div>
      `;
    }
  }

  if (summaryEl) {
    summaryEl.innerHTML = summaryBoxesHtml + highlightHtml;
  }

  const tableRowsHtml = results.map((res, index) => {
    const rankText = `${index + 1}위`;
    const itemCell = `
      <div class="efficiency-item-cell">
        <img src="${getIconPath(res.item.icon)}" alt="${res.item.name}" onerror="this.src='${FALLBACK_ICON}'" />
        <span class="item-efficiency-item-name">${res.item.name}</span>
      </div>
    `;

    const expectedSaleCell = renderCompactMesoSpan(res.expectedSalePrice);

    let rateCell = "";
    let profitCell = "";
    let breakEvenCell = "";

    if (includeMileage) {
      rateCell = `
        <div><span class="efficiency-label">현금</span>${res.cashOnlyRecoveryRate.toFixed(2)}%</div>
        <div class="item-efficiency-detail"><span class="efficiency-label">마일리지</span>${res.mileageAnalysis ? `${res.mileageAnalysis.mileageRecoveryRate.toFixed(2)}%` : "적용 불가"}</div>
      `;
      profitCell = `
        <div><span class="efficiency-label">현금</span><span class="item-efficiency-profit-cell ${res.cashOnlyStatus.className}">${formatEfficiencyProfitText(res.cashOnlyProfitKrw)}</span></div>
        <div class="item-efficiency-detail"><span class="efficiency-label">마일리지</span>${res.mileageAnalysis ? formatEfficiencyProfitText(res.mileageAnalysis.mileageProfitKrw) : "적용 불가"}</div>
      `;
      breakEvenCell = `
        <div><span class="efficiency-label">현금</span>${renderCompactMesoSpan(res.cashOnlyBreakEvenMeso)}</div>
        <div class="item-efficiency-detail">(${formatBreakEvenDiffText(res.expectedSalePrice, res.cashOnlyBreakEvenMeso)})</div>
        <div class="item-efficiency-detail" style="margin-top:4px;"><span class="efficiency-label">마일리지</span>${res.mileageAnalysis ? `${renderCompactMesoSpan(res.mileageAnalysis.mileageBreakEvenMeso)} (${formatBreakEvenDiffText(res.expectedSalePrice, res.mileageAnalysis.mileageBreakEvenMeso)})` : "적용 불가"}</div>
      `;
    } else {
      rateCell = `${res.cashOnlyRecoveryRate.toFixed(2)}%`;
      profitCell = `<span class="item-efficiency-profit-cell ${res.cashOnlyStatus.className}">${formatEfficiencyProfitText(res.cashOnlyProfitKrw)}</span>`;
      breakEvenCell = `
        <div>${renderCompactMesoSpan(res.cashOnlyBreakEvenMeso)}</div>
        <div class="item-efficiency-detail">${formatBreakEvenDiffText(res.expectedSalePrice, res.cashOnlyBreakEvenMeso)}</div>
      `;
    }

    return `
      <tr>
        <td>${rankText}</td>
        <td>${itemCell}</td>
        <td>${formatCash(res.item.cashPrice)}</td>
        <td>${expectedSaleCell}</td>
        <td>${rateCell}</td>
        <td>${profitCell}</td>
        <td>${breakEvenCell}</td>
      </tr>
    `;
  }).join("");

  if (containerEl) {
    containerEl.innerHTML = `
      <table class="item-efficiency-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>아이템</th>
            <th>캐시 가격</th>
            <th>예상 판매가</th>
            <th>회수율</th>
            <th>1개당 손익</th>
            <th>본전 경매장가</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    `;
  }
}

function runItemEfficiencyComparison() {
  const waterRate = parseNumberInput($("waterRate").value);
  const feePercent = AUCTION_FEE_RATE * 100;
  const includeMileage = $("includeMileageEfficiencyComparison") ? $("includeMileageEfficiencyComparison").checked : false;

  const section = $("itemEfficiencyResultSection");
  if (section) {
    section.classList.remove("hidden");
  }
  expandCollapsibleSection({
    buttonId: "toggleEfficiencyResultBtn",
    bodyId: "itemEfficiencyResultBody",
    expandedLabel: "가성비 비교 결과 접기",
  });

  if (waterRate <= 0) {
    renderItemEfficiencyEmptyState("물통비율을 올바르게 입력해주세요.");
    return;
  }

  const auctionPrices = getAuctionPrices();
  const validEntries = [];
  let totalCount = 0;

  ITEMS.forEach((item, index) => {
    totalCount++;
    const expectedSalePrice = auctionPrices[item.id];
    if (item.cashPrice > 0 && expectedSalePrice > 0) {
      validEntries.push({
        item,
        expectedSalePrice,
        originalIndex: index,
      });
    }
  });

  const excludedCount = totalCount - validEntries.length;

  if (validEntries.length === 0) {
    renderItemEfficiencyEmptyState("비교할 캐시 아이템의 예상 판매가격을 먼저 입력하세요.");
    return;
  }

  const results = validEntries.map((entry) => {
    const eff = calculateItemEfficiency(entry.item, {
      expectedSalePrice: entry.expectedSalePrice,
      waterRate,
      feePercent,
    });
    eff.originalIndex = entry.originalIndex;
    return eff;
  });

  results.sort((a, b) => {
    const rateDifference = b.cashOnlyRecoveryRate - a.cashOnlyRecoveryRate;
    if (Math.abs(rateDifference) > 0.000001) {
      return rateDifference;
    }
    return a.originalIndex - b.originalIndex;
  });

  renderItemEfficiencyResults(results, {
    totalCount,
    validCount: validEntries.length,
    excludedCount,
    includeMileage,
  });

  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function resetInputs() {
  const confirmed = confirm("모든 입력값과 저장된 가격을 초기화하시겠습니까?");

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  latestPlanResults = null;

  for (let i = ITEMS.length - 1; i >= 0; i--) {
    if (ITEMS[i].isCustom) {
      ITEMS.splice(i, 1);
    }
  }

  renderItems();

  for (const item of ITEMS) {
    const input = $(`auction-${item.id}`);
    if (input) input.value = "";
  }

  $("currentMileage").value = 0;
  $("waterRate").value = 1600;
  $("currentTier").value = "bronze";
  $("remainingToNext").value = 300_000;
  $("selectedTargetMvp").value = 1_500_000;
  $("disableMileage").checked = false;
  if ($("includeMileageEfficiencyComparison")) {
    $("includeMileageEfficiencyComparison").checked = false;
  }

  renderMvpTiers();
  updateCurrentMvpPreview();
  $("resultSection").classList.add("hidden");
  if ($("itemEfficiencyResultSection")) {
    $("itemEfficiencyResultSection").classList.add("hidden");
  }

  expandCollapsibleSection({
    buttonId: "toggleMvpResultBtn",
    bodyId: "mvpCalculationResultBody",
    expandedLabel: "MVP 계산 결과 접기",
  });
  expandCollapsibleSection({
    buttonId: "toggleEfficiencyResultBtn",
    bodyId: "itemEfficiencyResultBody",
    expandedLabel: "가성비 비교 결과 접기",
  });

  alert("입력값이 초기화되었습니다.");
}

const savedState = loadCalculatorState();

applySavedCustomItems(savedState);

renderMvpTiers();
renderItems();

applySavedInputs(savedState);
updateCurrentMvpPreview();

$("currentTier").addEventListener("change", updateCurrentMvpPreview);
$("remainingToNext").addEventListener("input", updateCurrentMvpPreview);

$("calculateBtn").addEventListener("click", runSimulation);
if ($("compareItemEfficiencyButton")) {
  $("compareItemEfficiencyButton").addEventListener("click", runItemEfficiencyComparison);
}
$("saveStateBtn").addEventListener("click", saveCalculatorState);
$("resetBtn").addEventListener("click", resetInputs);
$("addCustomItemBtn").addEventListener("click", addCustomItem);

document.addEventListener("change", (event) => {
  if (event.target && event.target.id === "includeMileageEfficiencyComparison") {
    const section = $("itemEfficiencyResultSection");
    if (section && !section.classList.contains("hidden")) {
      runItemEfficiencyComparison();
    }
  }
});

setupCollapsibleSection({
  buttonId: "toggleMvpResultBtn",
  bodyId: "mvpCalculationResultBody",
  expandedLabel: "MVP 계산 결과 접기",
  collapsedLabel: "MVP 계산 결과 펼치기",
});

setupCollapsibleSection({
  buttonId: "toggleEfficiencyResultBtn",
  bodyId: "itemEfficiencyResultBody",
  expandedLabel: "가성비 비교 결과 접기",
  collapsedLabel: "가성비 비교 결과 펼치기",
});

if ($("strategySelect")) {
  $("strategySelect").addEventListener("change", (event) => {
    renderSelectedStrategyPlan(event.target.value);
  });
}