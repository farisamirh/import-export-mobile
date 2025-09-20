(function () {
  const $ = id => document.getElementById(id);

  let day = parseInt(localStorage.getItem("day")) || 1;
  const maxDays = 7;
  let balance = parseFloat(localStorage.getItem("balance")) || 5000;
  let tradeHistoryHTML = localStorage.getItem("tradeHistory") || "";
  let balanceOverTime = JSON.parse(localStorage.getItem("balanceOverTime")) || [balance];

  function renderTask() {
    const chosen = JSON.parse(localStorage.getItem("chosenScenarios"));
    if (!chosen) {
      // fallback in case chosenScenarios is missing
      alert("No tasks found. Returning to game...");
      window.location.href = "game.html";
      return;
    }

    const task = chosen[day - 1]; // day 1 = index 0
    if (!task) {
      alert("Task missing. Returning to game...");
      window.location.href = "game.html";
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
      btn.style.width = "100%";
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

    // increment day **after task completion**
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
  });

  window._taskScript = { renderTask, applyTaskChoice };
})();
