// gameScript.js
// Full trading UI logic for game.html with daily tasks

(function(){
  const $ = id => document.getElementById(id);

  // --- persistent state ---
  const MAX_DAYS = 7;
  let day = parseInt(localStorage.getItem("day")) || 1;
  let balance = parseFloat(localStorage.getItem("balance")) || 5000;
  let tradeHistoryHTML = localStorage.getItem("tradeHistory") || "";
  let balanceOverTime = JSON.parse(localStorage.getItem("balanceOverTime")) || [balance];

  // --- exchangeRates representation ---
  let exchangeRates = JSON.parse(localStorage.getItem("exchangeRatesForDay" + day)) || null;

  // --- items ---
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
  const chartCanvas = $("balanceChart");

  let chartInstance = null;

  // --- daily task pool ---
  const fullTaskPool = [
    {
      scenario: "Local supplier raises prices for construction materials.",
      options: [
        { text: "Import cheaper from Thailand", effect: 200, message: "Imported cheaper materials. Profit RM200." },
        { text: "Keep buying local", effect: -100, message: "Paid higher local prices. Loss RM100." },
        { text: "Negotiate with supplier", effect: 50, message: "Negotiated a small discount. Profit RM50." }
      ]
    },
    {
      scenario: "Logistics strike delays shipping.",
      options: [
        { text: "Pay extra for priority shipping", effect: -150, message: "Paid priority shipping. Loss RM150." },
        { text: "Wait for strike to end", effect: 0, message: "Waited it out. No change." },
        { text: "Use alternative land transport", effect: -50, message: "Alternative transport used. Loss RM50." }
      ]
    },
    {
      scenario: "Unexpected demand surge for exports.",
      options: [
        { text: "Increase exports immediately", effect: 250, message: "Sold more products. Profit RM250." },
        { text: "Maintain current levels", effect: 0, message: "No change in balance." },
        { text: "Focus on local market", effect: -50, message: "Lost potential profit. Loss RM50." }
      ]
    },
    {
    scenario: "A sudden demand for your exported Palm Oil arises in India.",
    options: [
      { text: "Accept the deal immediately", effect: 500, message: "You sold Palm Oil quickly at a good price!" },
      { text: "Negotiate for higher price", effect: 300, message: "You negotiated, but it delayed the deal and earned less." }
    ]
  },
  {
    scenario: "Your machinery import shipment is delayed due to customs.",
    options: [
      { text: "Pay extra to speed up delivery", effect: -400, message: "The shipment arrived faster but cost you more." },
      { text: "Wait patiently for the shipment", effect: 0, message: "No extra cost, but your project is delayed." }
    ]
  },
  {
    scenario: "A fire in a local chemical factory reduces supply.",
    options: [
      { text: "Buy chemicals from an alternate supplier", effect: -200, message: "You found a supplier but paid a higher price." },
      { text: "Skip chemical purchase this day", effect: 0, message: "You saved money but your production is slowed." }
    ]
  },
  {
    scenario: "High demand for textiles in Germany.",
    options: [
      { text: "Export all available textiles", effect: 400, message: "Textiles exported successfully!" },
      { text: "Export only half", effect: 200, message: "Partial export reduces immediate profit." }
    ]
  },
  {
    scenario: "Government announces new export tax on rubber.",
    options: [
      { text: "Sell rubber before tax applies", effect: 300, message: "Quick sale helped avoid extra costs!" },
      { text: "Hold rubber hoping price increases", effect: -150, message: "Price dropped, costing you money." }
    ]
  },
  {
    scenario: "Unexpected rise in car import fees.",
    options: [
      { text: "Proceed with import", effect: -500, message: "You paid higher fees for the imported cars." },
      { text: "Cancel import for today", effect: 0, message: "No cars imported, saved money." }
    ]
  },
  {
    scenario: "Local rice harvest is abundant, prices drop.",
    options: [
      { text: "Export rice to USA anyway", effect: 100, message: "You made a small profit despite lower prices." },
      { text: "Hold rice for better prices", effect: 0, message: "No profit today, waiting for market recovery." }
    ]
  }
];

  // --- generate daily exchange rates ---
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

  if (!exchangeRates) {
    exchangeRates = createDailyExchangeRates();
    localStorage.setItem("exchangeRatesForDay" + day, JSON.stringify(exchangeRates));
  }

  // --- seed chosen tasks ---
  function seedChosenTasks() {
    if (!localStorage.getItem("chosenScenarios")) {
      const shuffled = [...fullTaskPool].sort(() => 0.5 - Math.random());
      const chosen = shuffled.slice(0, MAX_DAYS);
      localStorage.setItem("chosenScenarios", JSON.stringify(chosen));
    }
  }

  // --- populate selects ---
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

  // --- quick calculation ---
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

  // --- confirm trade ---
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

    if (tradeTypeEl.value === "import") {
      if (rmTotal > balance) { alert("Not enough balance for this import."); return; }
      balance -= rmTotal;
    } else {
      balance += rmTotal;
    }

    const isProfit = tradeTypeEl.value === "export";
    const sign = isProfit ? "+" : "-";
    const cls = isProfit ? "profit" : "loss";
    tradeHistoryHTML += `<tr class="trade-row"><td>${day}</td><td>${tradeTypeEl.value}</td><td>${itemName}</td>
      <td>${country}</td><td>${qty}</td><td class="${cls}">${sign}RM ${rmTotal.toFixed(2)}</td></tr>`;

    balanceOverTime.push(balance);
    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("tradeHistory", tradeHistoryHTML);
    localStorage.setItem("balanceOverTime", JSON.stringify(balanceOverTime));
    renderHistory();
    renderChart();
    updateCalc();
    flashBalance();
  }

  // --- render history ---
  function renderHistory() {
    if (!historyBody) return;
    historyBody.innerHTML = tradeHistoryHTML;
  }

  // --- render chart ---
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

  // --- show exchange rates ---
  function toggleRatesTable() {
    if (!ratesContainer || !ratesTable) return;
    if (ratesContainer.style.display === "block") { ratesContainer.style.display = "none"; return; }
    ratesTable.innerHTML = `<tr><th>Country</th><th>1 RM = ?</th><th>Sample item (foreign)</th><th>Price in RM</th></tr>`;
    const list = tradeTypeEl.value === "import" ? importItems : exportItems;
    countries.forEach(country => {
      const r = exchangeRates[country];
      list.forEach(item => {
        const priceRM = (item.basePrice / r.rate).toFixed(2);
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${country}</td><td>1 RM = ${r.rate} ${r.currency}</td>
          <td>${item.name}: ${item.basePrice} ${r.currency}</td>
          <td>RM ${priceRM}</td>`;
        ratesTable.appendChild(tr);
      });
    });
    ratesContainer.style.display = "block";
  }

  // --- progress bar ---
  function updateProgressBar() {
    if (!progressBar) return;
    const pct = Math.round((day / MAX_DAYS) * 100);
    progressBar.style.width = pct + "%";
    if (progressText) progressText.textContent = `${day}`;
  }

  // --- proceed to daily task ---
  function proceedToTask() {
    localStorage.setItem("day", day.toString());
    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("tradeHistory", tradeHistoryHTML);
    localStorage.setItem("balanceOverTime", JSON.stringify(balanceOverTime));

    const chosen = JSON.parse(localStorage.getItem("chosenScenarios"));
    const task = chosen ? chosen[day - 1] : null;

    if (!task) {
      alert("No task found. Proceeding to results.");
      window.location.href = "results.html";
      return;
    }

    const optionTexts = task.options.map((opt, i) => `${i+1}: ${opt.text}`).join("\n");
    const choice = prompt(`Day ${day} Task:\n${task.scenario}\n\nOptions:\n${optionTexts}\n\nEnter 1, 2 or 3:`);

    const index = parseInt(choice) - 1;
    if (index < 0 || index >= task.options.length) {
      alert("Invalid choice. Task skipped.");
    } else {
      const option = task.options[index];
      balance += option.effect;
      balanceOverTime.push(balance);

      const color = option.effect >= 0 ? "profit" : "loss";
      tradeHistoryHTML += `<tr class="task-row">
        <td>${day}</td><td>Daily Task</td><td>${task.scenario}</td><td>-</td><td>-</td>
        <td class="${color}">${option.effect >= 0 ? "+" : ""}RM ${option.effect}</td>
      </tr>`;

      localStorage.setItem("balance", balance.toString());
      localStorage.setItem("tradeHistory", tradeHistoryHTML);
      localStorage.setItem("balanceOverTime", JSON.stringify(balanceOverTime));

      alert(option.message);
    }

    if (day >= MAX_DAYS) {
      window.location.href = "results.html";
    } else {
      day++;
      localStorage.setItem("day", day.toString());
      renderChart();
      renderHistory();
      updateCalc();
      alert(`Proceed to Day ${day} trading!`);
    }
  }

  // --- reset game ---
  function resetGame() {
    if (!confirm("Start a new game? This will reset progress.")) return;
    day = 1;
    balance = 5000;
    tradeHistoryHTML = "";
    balanceOverTime = [balance];
    exchangeRates = createDailyExchangeRates();
    localStorage.clear();
    localStorage.setItem("exchangeRatesForDay1", JSON.stringify(exchangeRates));
    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("day", "1");
    renderHistory();
    renderChart();
    updateCalc();
    seedChosenTasks();
    alert("New game started. Good luck!");
  }

  // --- toggle instructions ---
  function toggleInstructions() {
    const rulesBox = $("rulesBox");
    if (!rulesBox) return;
    rulesBox.style.display = rulesBox.style.display === "block" ? "none" : "block";
    toggleRulesBtn.textContent = rulesBox.style.display === "block" ? "Hide Instructions" : "Show Instructions";
  }

  // --- penguin tips ---
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

  // --- initialize ---
  document.addEventListener("DOMContentLoaded", () => {
    seedChosenTasks();
    populateCountries();
    populateItems();
    renderHistory();
    renderChart();
    updateCalc();

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

    if (dayNumberEl) dayNumberEl.textContent = day;
    if (balanceDisplay) balanceDisplay.textContent = balance.toFixed(2);
    updateProgressBar();
  });

  window._trade = { updateCalc, onConfirmTrade, renderChart, renderHistory };
})();
