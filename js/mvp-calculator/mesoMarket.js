const MM_$ = (id) => document.getElementById(id);

function mmFormatNumber(value) {
    return Math.round(value).toLocaleString("ko-KR");
}

function mmFormatKRW(value) {
    return `${mmFormatNumber(value)}원`;
}

function mmFormatPoint(value) {
    return `${mmFormatNumber(value)} 메포`;
}

function mmFormatPercent(value) {
    return `${value.toFixed(2)}%`;
}

function mmFormatMesoEok(value) {
    const rounded = Math.floor(value * 10000) / 10000;

    if (rounded >= 10000) {
        const jo = Math.floor(rounded / 10000);
        const eok = rounded % 10000;

        if (eok === 0) {
            return `${jo}조`;
        }

        return `${jo}조 ${mmFormatNumber(eok)}억`;
    }

    return `${mmFormatNumber(rounded)}억`;
}

function mmParseNumber(value) {
    const text = String(value ?? "")
        .replaceAll(",", "")
        .trim()
        // 한영키 안 누른 상태 대응
        // 만 = aks
        .replace(/aks/gi, "만");

    if (!text) return 0;

    const manMatch = text.match(/(\d+(?:\.\d+)?)\s*만/);

    if (manMatch) {
        const manValue = Number(manMatch[1]) * 10_000;

        const remainderText = text
            .replace(/(\d+(?:\.\d+)?)\s*만/, "")
            .replace(/[^\d]/g, "");

        const remainder = remainderText ? Number(remainderText) : 0;

        return manValue + remainder;
    }

    const numericOnly = text.replace(/[^\d]/g, "");
    return numericOnly ? Number(numericOnly) : 0;
}

function mmMakeSummaryBox(label, value) {
    return `
    <div class="summary-box">
      <div class="summary-label">${label}</div>
      <div class="summary-value">${value}</div>
    </div>
  `;
}

function calculateMesoMarketRoute() {
    const pointBudget = mmParseNumber(MM_$("mmPointBudget").value);
    const marketRate = MM_$("mmMarketRate") ? mmParseNumber(MM_$("mmMarketRate").value) : 0;
    const waterRate = MM_$("waterRate") ? mmParseNumber(MM_$("waterRate").value) : 0;

    if (pointBudget <= 0 || marketRate <= 0 || waterRate <= 0) {
        const missing = [];
        if (pointBudget <= 0) missing.push("사용할 넥슨캐시/메이플포인트");
        if (marketRate <= 0) missing.push("시장 시세의 메소마켓 가격");
        if (waterRate <= 0) missing.push("시장 시세의 물통비율");

        alert(`${missing.join(", ")}을(를) 올바르게 입력해주세요.`);
        return;
    }

    const purchasableEok = Math.floor(pointBudget / marketRate);

    MM_$("mmResultSection").classList.remove("hidden");

    if (purchasableEok < 1) {
        MM_$("mmSummaryGrid").innerHTML = [
            mmMakeSummaryBox("입력 메이플포인트", mmFormatPoint(pointBudget)),
            mmMakeSummaryBox("메소마켓 구매 희망가격", `${mmFormatNumber(marketRate)} 메포 / 1억`),
            mmMakeSummaryBox("구매 가능 메소", "0억 메소"),
            mmMakeSummaryBox("계산 상태", "1억 미만"),
        ].join("");

        MM_$("mmSummarySentence").innerHTML = `
      <div class="summary-title">요약: 메소마켓 루트</div>
      <div class="summary-detail">- 최소 1억 메소 이상 구매해야 계산이 가능합니다. 현재 구매 희망가격 기준으로는 최소 ${mmFormatPoint(marketRate)} 이상 입력해주세요.</div>
    `;

        return;
    }

    const usedPoints = purchasableEok * marketRate;
    const remainingPoints = pointBudget - usedPoints;

    const recoveredCash = Math.floor(purchasableEok * waterRate);
    const actualCost = usedPoints - recoveredCash;

    const recoveryRate = recoveredCash / usedPoints;
    const lossRate = actualCost / usedPoints;

    MM_$("mmSummaryGrid").innerHTML = [
        mmMakeSummaryBox("MVP 누적 예상", `${mmFormatNumber(pointBudget)} 캐시`),
        mmMakeSummaryBox("메소마켓 실제 사용", mmFormatPoint(usedPoints)),
        mmMakeSummaryBox("남은 메이플포인트", mmFormatPoint(remainingPoints)),
        mmMakeSummaryBox("획득 예상 메소", `${mmFormatNumber(purchasableEok)}억 메소`),
        mmMakeSummaryBox("물통 현금화 예상", mmFormatKRW(recoveredCash)),
        mmMakeSummaryBox("실제 소모된 내 현금", mmFormatKRW(actualCost)),
        mmMakeSummaryBox("현금 회수율", mmFormatPercent(recoveryRate * 100)),
        mmMakeSummaryBox("손실률", mmFormatPercent(lossRate * 100)),
    ].join("");

    let detail = "";

    if (actualCost < 0) {
        detail = `현재 상황에선 ${mmFormatPoint(usedPoints)}를 메소마켓에 실제 사용해서 ${mmFormatNumber(purchasableEok)}억 메소를 얻고, 물통 현금화 기준 총합 대략 ${mmFormatKRW(Math.abs(actualCost))} 이득입니다.`;
    } else {
        detail = `현재 상황에선 ${mmFormatPoint(usedPoints)}를 메소마켓에 실제 사용해서 ${mmFormatNumber(purchasableEok)}억 메소를 얻고, 물통 현금화 기준 총합 대략 ${mmFormatKRW(actualCost)} 소모됩니다.`;
    }

    if (remainingPoints > 0) {
        detail += ` 남은 ${mmFormatPoint(remainingPoints)}는 메소마켓 계산에서 제외했습니다.`;
    }

    MM_$("mmSummarySentence").innerHTML = `
    <div class="summary-title">요약: 메소마켓 루트</div>
    <div class="summary-detail">- ${detail}</div>
  `;
}

if (MM_$("mmCalculateBtn")) {
    MM_$("mmCalculateBtn").addEventListener("click", calculateMesoMarketRoute);
}