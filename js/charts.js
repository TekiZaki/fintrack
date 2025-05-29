// js/charts.js

let cashFlowChartInstance = null;
let spendingTrendsChartInstance = null;

// Initialize charts if their canvas elements exist and they haven't been initialized yet
function initCharts() {
  const cashFlowCanvas = document.getElementById("cashFlowChart");
  if (cashFlowCanvas && !cashFlowChartInstance) {
    const cashFlowCtx = cashFlowCanvas.getContext("2d");
    cashFlowChartInstance = new Chart(cashFlowCtx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { boxWidth: 10, usePointStyle: true, pointStyle: "circle" },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => formatCurrency(value) },
          },
        },
        tooltips: {
          // Note: 'tooltips' is for Chart.js v2. For v3 it's 'tooltip'
          callbacks: {
            label: (
              tooltipItem // For v3, tooltipItem.formattedValue or parse raw value
            ) =>
              `${tooltipItem.dataset.label}: ${formatCurrency(
                tooltipItem.raw
              )}`,
          },
        },
      },
    });
  }

  const spendingTrendsCanvas = document.getElementById("spendingTrendsChart");
  if (spendingTrendsCanvas && !spendingTrendsChartInstance) {
    const spendingTrendsCtx = spendingTrendsCanvas.getContext("2d");
    spendingTrendsChartInstance = new Chart(spendingTrendsCtx, {
      type: "bar",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { boxWidth: 10, usePointStyle: true, pointStyle: "rect" },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => formatCurrency(value) },
          },
        },
        tooltips: {
          // Note: 'tooltips' is for Chart.js v2. For v3 it's 'tooltip'
          callbacks: {
            label: (
              tooltipItem // For v3, tooltipItem.formattedValue or parse raw value
            ) =>
              `${tooltipItem.dataset.label}: ${formatCurrency(
                tooltipItem.raw
              )}`,
          },
        },
      },
    });
  }
}

function updateCashFlowChart(transactions) {
  if (!cashFlowChartInstance) return;

  const monthlyData = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);

  for (let i = 0; i <= 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(sixMonthsAgo.getMonth() + i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    monthlyData[monthKey] = {
      income: 0,
      expenses: 0,
      label: d.toLocaleString("default", { month: "short" }),
    };
  }

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date + "T00:00:00");
    if (txDate < sixMonthsAgo) return;

    const monthKey = `${txDate.getFullYear()}-${String(
      txDate.getMonth() + 1
    ).padStart(2, "0")}`;
    if (monthlyData[monthKey]) {
      if (tx.type === "income")
        monthlyData[monthKey].income += parseFloat(tx.amount);
      else monthlyData[monthKey].expenses += parseFloat(tx.amount);
    }
  });

  const sortedMonthKeys = Object.keys(monthlyData).sort();

  cashFlowChartInstance.data.labels = sortedMonthKeys.map(
    (key) => monthlyData[key].label
  );
  cashFlowChartInstance.data.datasets = [
    {
      label: "Income",
      data: sortedMonthKeys.map((key) => monthlyData[key].income),
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      borderColor: "#10B981",
      borderWidth: 2,
      tension: 0.4,
      fill: true,
    },
    {
      label: "Expenses",
      data: sortedMonthKeys.map((key) => monthlyData[key].expenses),
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderColor: "#EF4444",
      borderWidth: 2,
      tension: 0.4,
      fill: true,
    },
  ];
  cashFlowChartInstance.update();
}

function updateSpendingTrendsChart(transactions, currentMonth, currentYear) {
  if (!spendingTrendsChartInstance) return;

  const categories = [
    "Food",
    "Shopping",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Other",
  ];
  const thisMonthData = {};
  const lastMonthData = {};

  categories.forEach((cat) => {
    thisMonthData[cat] = 0;
    lastMonthData[cat] = 0;
  });

  const lastMonthDate = new Date(currentYear, currentMonth, 1);
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  transactions.forEach((tx) => {
    if (tx.type === "expense") {
      const txDate = new Date(tx.date + "T00:00:00");
      const category = categories.includes(tx.category) ? tx.category : "Other";
      const amount = parseFloat(tx.amount);

      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        thisMonthData[category] += amount;
      } else if (
        txDate.getMonth() === lastMonth &&
        txDate.getFullYear() === lastMonthYear
      ) {
        lastMonthData[category] += amount;
      }
    }
  });

  spendingTrendsChartInstance.data.labels = categories;
  spendingTrendsChartInstance.data.datasets = [
    {
      label: "Last Month",
      data: categories.map((cat) => lastMonthData[cat]),
      backgroundColor: "rgba(99, 102, 241, 0.4)",
      borderColor: "rgba(99, 102, 241, 1)",
      borderWidth: 1,
    },
    {
      label: "This Month",
      data: categories.map((cat) => thisMonthData[cat]),
      backgroundColor: "rgba(99, 102, 241, 1)",
      borderColor: "rgba(99, 102, 241, 1)",
      borderWidth: 1,
    },
  ];
  spendingTrendsChartInstance.update();
}
