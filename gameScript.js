// gameScript.js
// Full trading UI logic for game.html
// IDs used in HTML must match exactly

(function(){
  // DOM helper
  const $ = id => document.getElementById(id);

  // --- persistent state ---
  const MAX_DAYS = 7;
  let day = parseInt(localStorage.getItem("day")) || 1;
  let balance = parseFloat(localStorage.getItem("balance")) || 5000;
  let tradeHistoryHTML = localStorage.getItem("tradeHistory") || "";
  let balanceOverTime = JSON.parse(localStorage.getItem("balanceOverTime")) || [balance];

  // --- exchangeRates representation:
  // exchangeRates[country] = number of foreign currency units equal to 1 RM
  // Example: exchangeRates["Japan"] = 33 means 1 RM = 33 JPY
  let exchangeRates = JSON.parse(localStorage.getItem("exchangeRatesForDay" + day)) || null;

  // --- items with example foreign-currency prices per unit (price is in foreign currency units) ---
  // For simplicity each item price is interpreted as price *in the country's currency*.
  const importItems = [
    { name: "Electronics", basePrice: 120 },
    { name: "Machinery", basePrice: 350 },
    { name: "Chemicals", basePrice: 45 },
    { name: "Cars", basePrice: 8000 }
  ];
  const exportItems = [
    { name: "Palm Oil", basePrice: 80 },
    { name: "Rubber", basePrice: 60 },
    { name: "Furniture", basePrice: 150 },
    { name: "Rice", basePrice: 40 },
    { name: "Textiles", basePrice: 30 }
  ];
  const countries = ["China","India","Japan","USA","Germany"];

  // --- DOM refs ---
  const dayNumberEl = $("dayNumber");
  const balanceDisplay = $("balanceDisplay");
  const tradeTypeEl = $("tradeType");
  const countrySelect = $("countrySelect");
  const itemSelect = $("itemSelect");
  const quantityInput = $("quantityInput");
  const calcResult = $("calcResult");
  const confirmBtn = $("confirmBtn");
  const showRatesBtn = $("showRatesBtn");
  const ratesContainer = $("ratesTableContainer");
  const ratesTable = $("ratesTable");
  const proceedTaskBtn = $("proceedTaskBtn");
  const historyBody = $("historyBody");
  const progressBar = $("progressBar");
  const progressText = $("progressText");
  const resetBtn = $("resetBtn");
  const toggleRulesBtn = $("toggleRulesBtn");
  const penguinImg = $("penguinImg");
  const penguinTip = $("penguinTip");

  // chart
  let chartInstance = null;
  const chartCanvas = $("balanceChart");

  // --- utility: generate new daily exchange rates snapshot ---
  function createDailyExchangeRates() {
    const rates = {
      China: { rate: parseFloat((1.5 + Math.random()*0.4).toFixed(3)), currency: "CNY" },
      India: { rate: parseFloat((18 + Math.random()*2).toFixed(3)), currency: "INR" },
      Japan: { rate: parseFloat((33 + Math.random()*3).toFixed(3)), currency: "JPY" },
      USA: { rate: parseFloat((0.22 + Math.random()*0.03).toFixed(4)), currency: "USD" },
      Germany: { rate: parseFloat((0.19 + Math.random()*0.03).toFixed(4)), currency: "EUR" }
    };
    return rates;
  }

  // ensure daily rates exist (persisted for the day so it doesn't change mid-day)
  if (!exchangeRates) {
    exchangeRates = createDailyExchangeRates();
    localStorage.setItem("exchangeRatesForDay" + day, JSON.stringify(exchangeRates));
  }

  // --- populate country select and items ---
  function populateCountries() {
    if (!countrySelect) return;
    countrySelect.innerHTML = "";
    countries.forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      countrySelect.appendChild(o);
    });
  }

  function populateItems() {
    if (!itemSelect) return;
    itemSelect.innerHTML = "";
    const list = tradeTypeEl.value === "import" ? importItems : exportItems;
    list.forEach(it => {
      const o = document.createElement("option");
      o.value = it.name;
      o.textContent = `${it.name} — example price: ${it.basePrice} (country currency)`;
      itemSelect.appendChild(o);
    });
    updateCalc();
  }

  // --- quick calculation
  // foreignTotal = basePrice * qty (in that country's currency)
  // converted RM = foreignTotal / (1 RM = rate foreign)  => RM = foreignTotal / rate
  function updateCalc() {
    const qty = parseInt(quantityInput.value) || 0;
    const itemName = itemSelect.value;
    const country = countrySelect.value;
    if (!itemName || !country) { calcResult.textContent = ""; return; }

    const list = tradeTypeEl.value === "import" ? importItems : exportItems;
    const item = list.find(i => i.name === itemName);
    const rateObj = exchangeRates[country];
    if (!item || !rateObj) return;

    const foreignTotal = item.basePrice * qty;
    const rmTotal = foreignTotal / rateObj.rate;
    const msg = `${qty} x ${item.name} = ${foreignTotal.toFixed(2)} ${rateObj.currency} ≈ RM ${rmTotal.toFixed(2)} (1 RM = ${rateObj.rate} ${rateObj.currency})`;
    calcResult.textContent = msg;
    calcResult.style.color = (tradeTypeEl.value === "import" && rmTotal > balance) ? "red" : "green";
    return { foreignTotal, rmTotal, currency: rateObj.currency };
  }

  // --- confirm trade
  function onConfirmTrade() {
    const qty = parseInt(quantityInput.value) || 0;
    const itemName = itemSelect.value;
    const country = countrySelect.value;
    if (!qty || qty <= 0) { alert("Enter a valid quantity."); return; }
    if (!itemName || !country) { alert("Choose item and country."); return; }

    const list = tradeTypeEl.value === "import" ? importItems : exportItems;
    const item = list.find(i => i.name === itemName);
    const rateObj = exchangeRates[country];
    const foreignTotal = item.basePrice * qty;
    const rmTotal = parseFloat((foreignTotal / rateObj.rate).toFixed(2));

    // imports deduct, exports add
    if (tradeTypeEl.value === "import") {
      if (rmTotal > balance) { alert("Not enough balance for this import."); return; }
      balance -= rmTotal;
    } else {
      balance += rmTotal;
    }

    // save history row with inline color
    const isProfit = tradeTypeEl.value === "export";
    const sign = isProfit ? "+" : "-";
    const cls = isProfit ? "profit" : "loss";
    tradeHistoryHTML += `<tr class="trade-row"><td>${day}</td><td>${tradeTypeEl.value}</td><td>${itemName}</td>
      <td>${country}</td><td>${qty}</td><td class="${cls}">${sign}RM ${rmTotal.toFixed(2)}</td></tr>`;

    // persist and update visuals
    balanceOverTime.push(balance);
    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("tradeHistory", tradeHistoryHTML);
    localStorage.setItem("balanceOverTime", JSON.stringify(balanceOverTime));
    renderHistory();
    renderChart();
    updateCalc();
    flashBalance();
  }

  // --- render history
  function renderHistory() {
    if (!historyBody) return;
    historyBody.innerHTML = tradeHistoryHTML;
  }

  // --- render chart with Chart.js
  function renderChart() {
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: balanceOverTime.map((_,i)=> "T" + i),
        datasets: [{
          label: 'Balance (RM)',
          data: balanceOverTime,
          borderColor: '#0b84ff',
          backgroundColor: 'rgba(11,132,255,0.12)',
          fill: true,
          tension: 0.2
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
    // update displayed balance and day
    if (balanceDisplay) balanceDisplay.textContent = balance.toFixed(2);
    if (dayNumberEl) dayNumberEl.textContent = day.toString();
    updateProgressBar();
  }

  function flashBalance(){
    if (!balanceDisplay) return;
    balanceDisplay.style.transition = 'none';
    balanceDisplay.style.transform = 'scale(1.05)';
    setTimeout(()=> balanceDisplay.style.transform = '', 160);
  }

  // --- show exchange rates table
  function toggleRatesTable() {
    if (!ratesContainer || !ratesTable) return;
    if (ratesContainer.style.display === "block") { ratesContainer.style.display = "none"; return; }
    // rebuild table
    ratesTable.innerHTML = `<tr><th>Country</th><th>1 RM = ?</th><th>Sample item (foreign)</th><th>Price in RM</th></tr>`;
    const list = tradeTypeEl.value === "import" ? importItems : exportItems;
    countries.forEach(country => {
      const r = exchangeRates[country];
      list.forEach(item => {
        const priceForeign = item.basePrice;
        const priceRM = (priceForeign / r.rate).toFixed(2);
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${country}</td><td>1 RM = ${r.rate} ${r.currency}</td>
          <td>${item.name}: ${priceForeign} ${r.currency}</td>
          <td>RM ${priceRM}</td>`;
        ratesTable.appendChild(tr);
      });
    });
    ratesContainer.style.display = "block";
  }

  // --- progress bar update
  function updateProgressBar() {
    if (!progressBar) return;
    const pct = Math.round((day / MAX_DAYS) * 100);
    progressBar.style.width = pct + "%";
    if (progressText) progressText.textContent = `${day}`;
  }

  // --- proceed to daily task page
  function proceedToTask() {
    // persist state and go to dailyTask.html
    localStorage.setItem("day", day.toString());
    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("tradeHistory", tradeHistoryHTML);
    localStorage.setItem("balanceOverTime", JSON.stringify(balanceOverTime));
    // ensure chosenScenarios seeded by task script if not present
    window.location.href = "dailyTask.html";
  }

  // --- reset new game
  function resetGame() {
    if (!confirm("Start a new game? This will reset progress.")) return;
    day = 1;
    balance = 5000;
    tradeHistoryHTML = "";
    balanceOverTime = [balance];
    // new exchange rates for day 1
    exchangeRates = createDailyExchangeRates();
    localStorage.clear();
    localStorage.setItem("exchangeRatesForDay1", JSON.stringify(exchangeRates));
    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("day", "1");
    renderHistory();
    renderChart();
    updateCalc();
    alert("New game started. Good luck!");
  }

  // --- toggle instructions box if present
  function toggleInstructions() {
    const rulesBox = document.getElementById("rulesBox");
    if (!rulesBox) return;
    rulesBox.style.display = rulesBox.style.display === "block" ? "none" : "block";
    toggleRulesBtn.textContent = rulesBox.style.display === "block" ? "Hide Instructions" : "Show Instructions";
  }

  // --- penguin tips
  function showPenguinTip() {
    if (!penguinTip) return;
    const tips = [
      "Tip: Check exchange rates — they change each day.",
      "Tip: Import reduces RM balance; Export increases it.",
      "Tip: You can make many trades in one day before proceeding.",
      "Tip: If calculation shows red, you don't have enough RM for that import."
    ];
    penguinTip.textContent = tips[Math.floor(Math.random() * tips.length)];
    penguinTip.style.display = "block";
    setTimeout(()=> penguinTip.style.display = "none", 3500);
  }

  // --- wire DOM events after load ---
  document.addEventListener("DOMContentLoaded", () => {
    // init UI
    populateCountries();
    populateItems();
    renderHistory();
    renderChart();
    updateCalc();

    // wire events
    if (tradeTypeEl) tradeTypeEl.addEventListener("change", populateItems);
    if (countrySelect) countrySelect.addEventListener("change", updateCalc);
    if (itemSelect) itemSelect.addEventListener("change", updateCalc);
    if (quantityInput) quantityInput.addEventListener("input", updateCalc);
    if (confirmBtn) confirmBtn.addEventListener("click", onConfirmTrade);
    if (showRatesBtn) showRatesBtn.addEventListener("click", toggleRatesTable);
    if (proceedTaskBtn) proceedTaskBtn.addEventListener("click", proceedToTask);
    if (resetBtn) resetBtn.addEventListener("click", resetGame);
    if (toggleRulesBtn) toggleRulesBtn.addEventListener("click", toggleInstructions);
    if (penguinImg) penguinImg.addEventListener("click", showPenguinTip);

    // update top displays
    if (dayNumberEl) dayNumberEl.textContent = day;
    if (balanceDisplay) balanceDisplay.textContent = balance.toFixed(2);
    updateProgressBar();
  });

  // expose small helpers for other pages if necessary
  window._trade = { updateCalc, onConfirmTrade, renderChart, renderHistory };

})();
