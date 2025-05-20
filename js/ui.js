// js/ui.js

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    // Changed "en-ID" to "id-ID" for Indonesian locale
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00"); // Ensure date is parsed as local
  return date.toLocaleDateString("id-ID", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function populateCategoryDropdown() {
  const categorySelect = document.getElementById("category");
  categorySelect.innerHTML = ""; // Clear existing options
  CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// Renamed from renderRecentTransactions and modified to show all transactions for the page
function renderTransactionsPage(transactions) {
  const listElement = document.getElementById("recentTransactionsList"); // This ID is now on the Transactions page

  // Preserve or create the "no transactions" message element
  let noTransactionsEl = listElement.querySelector(".no-transactions");
  if (!noTransactionsEl) {
    noTransactionsEl = document.createElement("p");
    noTransactionsEl.className = "no-transactions";
    noTransactionsEl.style.padding = "1rem 0";
    noTransactionsEl.style.color = "var(--gray-400)";
    noTransactionsEl.textContent = "No transactions yet.";
  }

  listElement.innerHTML = ""; // Clear existing content (except the template 'noTransactionsEl')

  if (transactions.length === 0) {
    listElement.appendChild(noTransactionsEl); // Add the message if no transactions
    return;
  }

  const sortedTransactions = transactions.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  ); // Sort all transactions

  sortedTransactions.forEach((tx) => {
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = `
        <div class="expense-icon ${getCategoryColorClass(tx.category)}">
          ${getCategoryIcon(tx.category)}
        </div>
        <div class="expense-info">
          <div class="expense-name">${tx.description}</div>
          <div class="expense-date">${formatDate(tx.date)}</div>
        </div>
        <div class="expense-amount ${tx.type}">${
      tx.type === "income" ? "+" : "-"
    }${formatCurrency(tx.amount)}</div>
        <div class="transaction-actions">
          <button class="btn btn-edit" data-id="${tx.id}">Edit</button>
          <button class="btn btn-danger" data-id="${tx.id}">Del</button>
        </div>
      `;
    listElement.appendChild(item);
  });
}

// Update renderExpensesByCategory to use dynamic budgets and consistent progress bar colors
function renderExpensesByCategory(transactions, currentMonth, currentYear) {
  const listElement = document.getElementById("expensesByCategoryList");
  listElement.innerHTML = "";

  const monthlyExpenses = transactions.filter((tx) => {
    const txDate = new Date(tx.date + "T00:00:00");
    return (
      tx.type === "expense" &&
      txDate.getMonth() === currentMonth &&
      txDate.getFullYear() === currentYear
    );
  });

  const expensesByCat = monthlyExpenses.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + parseFloat(tx.amount);
    return acc;
  }, {});

  if (Object.keys(expensesByCat).length === 0) {
    listElement.innerHTML =
      '<p style="padding: 1rem 0; color: var(--gray-400);">No expenses this month.</p>';
    return;
  }

  const currentBudgets = getBudgets(); // Get user-defined budgets

  for (const category in expensesByCat) {
    if (!EXPENSE_CATEGORIES_FOR_BUDGETING.includes(category)) continue; // Only show budgeted expense categories

    const spentAmount = expensesByCat[category];
    // Use actual budget if set, otherwise, if category is budgetable but has no set budget,
    // we might show it without a progress bar or treat budget as effectively 0 or spentAmount.
    // For this widget, let's use the set budget, or don't show progress if not explicitly budgeted.
    const budgetAmount =
      currentBudgets[category] !== undefined ? currentBudgets[category] : null;

    let progress = 0;
    let progressBarHtml = '<div class="budget-bar-text">No budget set</div>'; // Default text

    if (budgetAmount !== null && budgetAmount > 0) {
      progress = Math.min((spentAmount / budgetAmount) * 100, 100);
      let progressBarColor = "var(--green-500)";
      if (progress > 75 && progress < 95)
        progressBarColor = "var(--yellow-500)";
      if (progress >= 95) progressBarColor = "var(--red-500)";
      progressBarHtml = `<div class="budget-bar">
                                    <div class="budget-progress" style="width: ${progress}%; background-color: ${progressBarColor};"></div>
                                 </div>`;
    } else if (budgetAmount === 0) {
      // If budget is 0 and spent > 0, it's 100% over.
      progress = spentAmount > 0 ? 100 : 0;
      progressBarHtml = `<div class="budget-bar">
                                    <div class="budget-progress" style="width: ${progress}%; background-color: var(--red-500);"></div>
                                 </div>`;
    }

    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = `
          <div class="expense-icon ${getCategoryColorClass(category)}">
            ${getCategoryIcon(category)}
          </div>
          <div class="expense-info">
            <div class="expense-name">${category}</div>
            ${progressBarHtml}
          </div>
          <div class="expense-amount">${formatCurrency(spentAmount)}</div>
        `;
    listElement.appendChild(item);
  }
}

function updateDashboardSummaries(transactions, currentMonth, currentYear) {
  let totalIncome = 0;
  let totalExpenses = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amount);
    const txDate = new Date(tx.date + "T00:00:00"); // Ensure date is parsed as local

    if (tx.type === "income") {
      totalIncome += amount;
      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        monthlyIncome += amount;
      }
    } else {
      totalExpenses += amount;
      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        monthlyExpenses += amount;
      }
    }
  });

  const totalBalance = totalIncome - totalExpenses;
  const savingsRate =
    monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
      : 0;

  document.getElementById("totalBalanceAmount").textContent =
    formatCurrency(totalBalance);
  document.getElementById("monthlyIncomeAmount").textContent =
    formatCurrency(monthlyIncome);
  document.getElementById("monthlyExpensesAmount").textContent =
    formatCurrency(monthlyExpenses);
  document.getElementById(
    "savingsRateAmount"
  ).textContent = `${savingsRate.toFixed(1)}%`;
}

// Modal handling
const modal = document.getElementById("transactionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const transactionForm = document.getElementById("transactionForm");
const modalTitle = document.getElementById("modalTitle");
const transactionIdInput = document.getElementById("transactionId");

function openModal(transaction = null) {
  transactionForm.reset();
  populateCategoryDropdown(); // Ensure categories are fresh
  if (transaction) {
    modalTitle.textContent = "Edit Transaction";
    transactionIdInput.value = transaction.id;
    document.getElementById("description").value = transaction.description;
    document.getElementById("amount").value = transaction.amount;
    document.getElementById("type").value = transaction.type;
    document.getElementById("category").value = transaction.category;
    document.getElementById("date").value = transaction.date;
  } else {
    modalTitle.textContent = "Add Transaction";
    transactionIdInput.value = "";
    // Set date to today by default for new transactions
    document.getElementById("date").valueAsDate = new Date();
  }
  modal.style.display = "block";
}

function closeModal() {
  modal.style.display = "none";
}

closeModalBtn.onclick = closeModal;
window.onclick = function (event) {
  if (event.target == modal) {
    closeModal();
  }
};

// Budget Modal Elements and Functions
const budgetModal = document.getElementById("budgetModal");
const closeBudgetModalBtn = document.getElementById("closeBudgetModalBtn");
const budgetForm = document.getElementById("budgetForm");
const budgetModalTitle = document.getElementById("budgetModalTitle");
const editingBudgetCategoryKeyInput = document.getElementById(
  "editingBudgetCategoryKey"
);
const budgetCategorySelect = document.getElementById("budgetCategorySelect");
const budgetAmountInput = document.getElementById("budgetAmountInput");

function populateBudgetCategoryDropdown(selectedCategory = null) {
  if (!budgetCategorySelect) return;
  budgetCategorySelect.innerHTML = "";

  // Use EXPENSE_CATEGORIES_FOR_BUDGETING from data.js
  let categoriesToShow = [...EXPENSE_CATEGORIES_FOR_BUDGETING];

  if (selectedCategory && !categoriesToShow.includes(selectedCategory)) {
    // This case should ideally not happen if selectedCategory comes from EXPENSE_CATEGORIES_FOR_BUDGETING
    categoriesToShow.push(selectedCategory);
  }
  categoriesToShow.sort();

  categoriesToShow.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    if (category === selectedCategory) {
      option.selected = true;
    }
    budgetCategorySelect.appendChild(option);
  });
}

function openBudgetModal(categoryKey = null, amount = null) {
  if (!budgetModal) return;
  budgetForm.reset();
  editingBudgetCategoryKeyInput.value = categoryKey || "";

  if (categoryKey) {
    budgetModalTitle.textContent = "Edit Budget for " + categoryKey;
    populateBudgetCategoryDropdown(categoryKey);
    budgetCategorySelect.value = categoryKey;
    budgetCategorySelect.disabled = true; // Disable changing category when editing
    budgetAmountInput.value = amount;
  } else {
    budgetModalTitle.textContent = "Add New Budget";
    populateBudgetCategoryDropdown();
    budgetCategorySelect.disabled = false; // Enable for new budget
  }
  budgetModal.style.display = "block";
}

function closeBudgetModal() {
  if (!budgetModal) return;
  budgetModal.style.display = "none";
  if (budgetCategorySelect) budgetCategorySelect.disabled = false; // Always re-enable on close
}

if (closeBudgetModalBtn) closeBudgetModalBtn.onclick = closeBudgetModal;
// also close on window click outside modal (similar to transactionModal)
window.addEventListener("click", function (event) {
  if (event.target == budgetModal) {
    // Note: use == for comparison with event.target
    closeBudgetModal();
  }
});

function renderBudgetsPage(budgets) {
  const container = document.getElementById("budgetsListContainer");
  if (!container) return;
  const noBudgetsEl = container.querySelector(".no-budgets"); // Preserve or create

  // Clear previous items, but keep the noBudgetsEl template if it exists
  while (
    container.firstChild &&
    !container.firstChild.classList?.contains("no-budgets")
  ) {
    container.removeChild(container.firstChild);
  }
  if (
    container.firstChild &&
    container.firstChild.classList?.contains("no-budgets")
  ) {
    container.removeChild(container.firstChild); // remove old no-budgets message before re-evaluating
  }

  const budgetEntries = Object.entries(budgets);

  if (budgetEntries.length === 0) {
    if (noBudgetsEl)
      container.appendChild(noBudgetsEl.cloneNode(true)); // Use a clone
    else
      container.innerHTML =
        '<p class="no-budgets" style="padding: 1rem 0; color: var(--gray-400);">No budgets set up yet. Click \'Add/Edit Budget\' to start.</p>';
    return;
  }

  budgetEntries.sort((a, b) => a[0].localeCompare(b[0])); // Sort by category name

  budgetEntries.forEach(([category, amount]) => {
    const item = document.createElement("div");
    item.className = "budget-item";

    const transactions = getTransactions();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let spentAmount = 0;
    transactions.forEach((tx) => {
      const txDate = new Date(tx.date + "T00:00:00");
      if (
        tx.type === "expense" &&
        tx.category === category &&
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        spentAmount += parseFloat(tx.amount);
      }
    });

    const budgetAmount = parseFloat(amount);
    const progress =
      budgetAmount > 0
        ? Math.min((spentAmount / budgetAmount) * 100, 100)
        : spentAmount > 0
        ? 100
        : 0;
    const remaining = budgetAmount - spentAmount;

    let progressColor = "var(--green-500)";
    if (progress >= 95) progressColor = "var(--red-500)";
    else if (progress > 75) progressColor = "var(--yellow-500)";

    item.innerHTML = `
      <div class="budget-item-main">
        <div class="budget-icon ${getCategoryColorClass(category)}">
          ${getCategoryIcon(category)}
        </div>
        <div class="budget-info">
          <div class="budget-category-name">${category}</div>
          <div class="budget-details">
            <span class="budget-spent">${formatCurrency(
              spentAmount
            )}</span> spent of ${formatCurrency(budgetAmount)}
          </div>
          <div class="budget-item-bar">
            <div class="budget-item-progress" style="width: ${progress}%; background-color: ${progressColor};"></div>
          </div>
          <div class="budget-remaining ${remaining < 0 ? "overspent" : ""}">
            ${
              remaining >= 0
                ? formatCurrency(remaining) + " left"
                : formatCurrency(Math.abs(remaining)) + " overspent"
            }
          </div>
        </div>
      </div>
      <div class="budget-item-actions">
        <button class="btn btn-edit btn-small edit-budget-btn" data-category="${category}" data-amount="${budgetAmount}">Edit</button>
        <button class="btn btn-danger btn-small delete-budget-btn" data-category="${category}">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Helper to get a color for progress bars (aligns with icon colors) - This is NOT used for budget progress bars anymore.
// It was used by the dashboard widget previously, but that's now updated.
/* function getColorForCategory(category) {
  if (category.toLowerCase().includes("food")) return "var(--danger)";
  if (category.toLowerCase().includes("shopping")) return "var(--warning)";
  // ... other categories ...
  return "var(--gray-400)"; // Default
} */

function updateSidebarUserDisplay(userProfile) {
  const sidebarAvatarEl = document.getElementById("sidebarUserAvatar");
  const sidebarUserNameEl = document.getElementById("sidebarUserName");
  const sidebarUserEmailEl = document.getElementById("sidebarUserEmail");

  if (!sidebarAvatarEl || !sidebarUserNameEl || !sidebarUserEmailEl) return;

  sidebarUserNameEl.textContent = userProfile.name;
  sidebarUserEmailEl.textContent = userProfile.email;

  sidebarAvatarEl.innerHTML = ""; // Clear previous content
  if (userProfile.avatar) {
    const img = document.createElement("img");
    img.src = userProfile.avatar;
    img.alt = userProfile.name.substring(0, 2).toUpperCase();
    sidebarAvatarEl.appendChild(img);
    sidebarAvatarEl.classList.add("has-image"); // For specific styling if needed
    sidebarAvatarEl.style.backgroundImage = `url(${userProfile.avatar})`;
    sidebarAvatarEl.textContent = ""; // Clear initials if image is present
  } else {
    sidebarAvatarEl.textContent = userProfile.name
      ? userProfile.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "JD";
    sidebarAvatarEl.classList.remove("has-image");
    sidebarAvatarEl.style.backgroundImage = "none";
  }
}

let uploadedAvatarDataUrl = null; // Temporary store for new avatar

function renderAccountPage(userProfile) {
  const nameInput = document.getElementById("accountNameInput");
  const emailInput = document.getElementById("accountEmailInput");
  const avatarInput = document.getElementById("accountAvatarInput");
  const currentAvatarImg = document.getElementById("currentAccountAvatar");
  const currentAvatarInitials = document.getElementById(
    "currentAccountAvatarInitials"
  );
  const accountUpdateStatus = document.getElementById("accountUpdateStatus");

  if (
    !nameInput ||
    !emailInput ||
    !avatarInput ||
    !currentAvatarImg ||
    !currentAvatarInitials ||
    !accountUpdateStatus
  ) {
    console.warn("Account page elements not fully found.");
    return;
  }

  accountUpdateStatus.textContent = ""; // Clear status message
  nameInput.value = userProfile.name;
  emailInput.value = userProfile.email;
  uploadedAvatarDataUrl = null; // Reset on page load
  avatarInput.value = ""; // Clear file input

  if (userProfile.avatar) {
    currentAvatarImg.src = userProfile.avatar;
    currentAvatarImg.style.display = "block";
    currentAvatarInitials.style.display = "none";
  } else {
    currentAvatarInitials.textContent = userProfile.name
      ? userProfile.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "JD";
    currentAvatarImg.style.display = "none";
    currentAvatarInitials.style.display = "block";
  }
}

function handleAvatarPreview(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const currentAvatarImg = document.getElementById("currentAccountAvatar");
      const currentAvatarInitials = document.getElementById(
        "currentAccountAvatarInitials"
      );
      if (currentAvatarImg && currentAvatarInitials) {
        currentAvatarImg.src = e.target.result;
        currentAvatarImg.style.display = "block";
        currentAvatarInitials.style.display = "none";
        uploadedAvatarDataUrl = e.target.result; // Store for submission
      }
    };
    reader.readAsDataURL(file);
  }
}
