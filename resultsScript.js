(function () {
  const $ = id => document.getElementById(id);

  const startingBalance = 5000; 
  const balance = parseFloat(localStorage.getItem("balance")) || startingBalance;
  const tradeHistoryHTML = localStorage.getItem("tradeHistory") || "";
  const balanceOverTime = JSON.parse(localStorage.getItem("balanceOverTime")) || [startingBalance];

  function renderFinals() {
    if ($("finalBalance")) $("finalBalance").textContent = `RM ${balance.toFixed(2)}`;

    //Calculate profit/loss
    const netChange = balance - startingBalance;
    const plEl = document.createElement("p");
    plEl.textContent = `${netChange >= 0 ? "Profit" : "Loss"}: RM ${netChange.toFixed(2)}`;
    plEl.style.color = netChange >= 0 ? "green" : "red";
    if ($("finalBalance")) $("finalBalance").after(plEl);

    // Render history table
    const historyTable = $("historyTable");
    if (historyTable) {
      historyTable.innerHTML = tradeHistoryHTML;
    }

    // Render chart
    const canvas = $("resultsChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: balanceOverTime.map((_, i) => "Step " + i),
          datasets: [{
            label: "Balance (RM)",
            data: balanceOverTime,
            borderColor: "#3498db",
            backgroundColor: "rgba(52,152,219,0.2)",
            fill: true,
            tension: 0.2
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });
    }

    // Penguin final tip
    const peng = $("penguinFinalTip");
    if (peng) {
      peng.textContent = "Click the penguin for a final tip!";
    }
  }

  function showFinalPenguinTip() {
    const peng = $("penguinFinalTip");
    if (!peng) return;
    const quotes = [
      "Great job — review what worked and try again!",
      "Small consistent gains beat rare big wins.",
      "Use what you learned today to plan next runs."
    ];
    peng.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    peng.style.display = "block";
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderFinals();

    const pengImg = $("penguinMascot");
    if (pengImg) pengImg.addEventListener("click", showFinalPenguinTip);
  });
})();
