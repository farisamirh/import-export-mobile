// taskScript.js
// Expected DOM IDs (in dailyTask.html):
// - taskDay (span), scenarioText (p), optionsContainer (div), penguinTip (div)
// Uses localStorage keys: chosenScenarios, day, balance, tradeHistory, balanceOverTime

(function () {
  const $ = id => document.getElementById(id);

  let day = parseInt(localStorage.getItem("day")) || 1;
  const maxDays = 7;
  let balance = parseFloat(localStorage.getItem("balance")) || 5000;
  let tradeHistoryHTML = localStorage.getItem("tradeHistory") || "";
  let balanceOverTime = JSON.parse(localStorage.getItem("balanceOverTime")) || [balance];

  // Full pool of exactly 7 scenarios
  const fullPool = [
    {
      scenario: "Local supplier raises prices for construction materials.",
      options: [
        { text: "Import cheaper from Thailand", effect: +200, message: "Imported cheaper materials. Profit RM200." },
        { text: "Keep buying local materials", effect: -100, message: "Paid higher local prices. Loss RM100." },
        { text: "Negotiate with supplier", effect: +50, message: "Negotiated a small discount. Profit RM50." }
      ]
    },
    {
      scenario: "Logistics strike delays shipping for cars.",
      options: [
        { text: "Pay extra for priority shipping", effect: -150, message: "Paid priority shipping. Loss RM150." },
        { text: "Wait for strike to end", effect: 0, message: "Waited it out. No change." },
        { text: "Use alternative transport", effect: -50, message: "Alternative transport used. Loss RM50." }
      ]
    },
    {
      scenario: "A company in China wants to negotiate palm oil price from Malaysia.",
      options: [
        { text: "Agree to discount", effect: +100, message: "Sold more at lower margin. Net RM100." },
        { text: "Refuse and keep export price", effect: 0, message: "Deal cancelled. No change." },
        { text: "Offer partial discount for bulk order", effect: +250, message: "Big order accepted. Profit RM250." }
      ]
    },
    {
      scenario: "Government offers export incentives.",
      options: [
        { text: "Apply for subsidy", effect: +300, message: "You received subsidy. Profit RM300." },
        { text: "Ignore the offer", effect: 0, message: "No change." },
        { text: "Accept but kept the incentive to yourself", effect: -50, message: "Missed timing. Loss RM50." }
      ]
    },
    {
      scenario: "Probability of storm damaging your shipment is high.",
      options: [
        { text: "File for insurance claim in advance", effect: +100, message: "Insurance covered some loss. +RM100." },
        { text: "Absorb the loss", effect: -200, message: "You paid for the loss. -RM200." },
        { text: "Negotiate the loss with buyer", effect: -50, message: "Partial deal made. -RM50." }
      ]
    },
    {
      scenario: "European Union increases import taxes.",
      options: [
        { text: "Accept tax burden", effect: -200, message: "Taxes reduced profit. -RM200." },
        { text: "Find alternative markets from Asia", effect: +100, message: "Found new market. +RM100." },
        { text: "Negotiate tax deal with the European Union", effect: +50, message: "Small success. +RM50." }
      ]
    },
    {
      scenario: "ASEAN free trade agreement lowers tariffs.",
      options: [
        { text: "Expand exports quickly with every ASEAN countries", effect: +250, message: "Expanded exports. +RM250." },
        { text: "Wait for lower tariffs", effect: -50, message: "Tariffs may not be low but can increase soon. Loss RM50" },
        { text: "Strengthen partnerships with only one country", effect: +100, message: "Partnerships succeed. +RM100." }
      ]
    }
  ];

  // --- Always use exactly these 7 scenarios ---
  function ensureChosenScenarios() {
    if (!localStorage.getItem("chosenScenarios")) {
      localStorage.setItem("chosenScenarios", JSON.stringify(fullPool));
    }
  }

  function renderTask() {
    ensureChosenScenarios();
    const chosen = JSON.parse(localStorage.getItem("chosenScenarios"));
    const idx = day - 1;
    const task = chosen[idx];
    if (!task) {
      document.body.innerHTML = "<p>No task found. Redirecting to game...</p>";
      setTimeout(() => { window.location.href = "game.html"; }, 1000);
      return;
    }
    if ($("taskDay")) $("taskDay").textContent = day;
    if ($("scenarioText")) $("scenarioText").textContent = task.scenario;

    const optionsContainer = $("optionsContainer");
    if (!optionsContainer) return;
    optionsContainer.innerHTML = "";
    task.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.textContent = opt.text;
      btn.style.width = "100%"; // full width like trade buttons
      btn.addEventListener("click", () => applyTaskChoice(task, i));
      optionsContainer.appendChild(btn);
    });

    const peng = $("penguinTip");
    if (peng) {
      peng.textContent = "Tip: Read the choices carefully — outcomes differ!";
      peng.style.display = "block";
      setTimeout(() => peng.style.display = "none", 3000);
    }
  }

  function applyTaskChoice(task, optionIndex) {
    const option = task.options[optionIndex];
    balance += option.effect;
    balanceOverTime.push(balance);

    const color = option.effect >= 0 ? "profit" : "loss";
    tradeHistoryHTML += `<tr class="task-row">
      <td>${day}</td>
      <td>Daily Task</td>
      <td>${task.scenario}</td>
      <td>-</td>
      <td>-</td>
      <td class="${color}">${option.effect >= 0 ? "+" : ""}RM ${option.effect}</td>
    </tr>`;

    localStorage.setItem("balance", balance.toString());
    localStorage.setItem("tradeHistory", tradeHistoryHTML);
    localStorage.setItem("balanceOverTime", JSON.stringify(balanceOverTime));

    alert(option.message + ` (${option.effect >= 0 ? "+" : ""}${option.effect} RM)`);

    if (day >= maxDays) {
      window.location.href = "results.html";
    } else {
      day++;
      localStorage.setItem("day", day.toString());
      window.location.href = "game.html";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if ($("taskDay")) renderTask();

    window.showTaskTip = function () {
      const peng = $("penguinTip");
      if (!peng) return;
      const tips = [
        "Tip: Consider long-term effects before choosing.",
        "Tip: Small losses can avoid bigger problems later.",
        "Tip: Some choices bring immediate profit but risk future loss."
      ];
      peng.textContent = tips[Math.floor(Math.random() * tips.length)];
      peng.style.display = "block";
      setTimeout(() => peng.style.display = "none", 3000);
    };
  });

  window._taskScript = { renderTask, applyTaskChoice };
})();
