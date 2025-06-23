// js/ui.js
// This file is the "View" layer of the application. Its sole responsibility is to
// take data and render it into HTML. It is "unaware" of the server or the
// online/offline state. The controller (app.js) provides it with data from the
// local cache (data.js), and this file simply displays that data.

/**
 * Formats a number as Indonesian Rupiah (IDR).
 * @param {number} amount - The number to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date string (YYYY-MM-DD) into a more readable format.
 * @param {string} dateString - The date string to format.
 * @returns {string} The formatted date string.
 */
function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00"); // Ensure date is parsed as local
  return date.toLocaleDateString("id-ID", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Populates a <select> dropdown with categories from the local cache.
 * @param {string} selectElementId - The ID of the <select> element.
 * @param {string|null} filterType - 'income' or 'expense' to filter categories.
 */
function populateCategoryDropdown(selectElementId, filterType = null) {
  const categorySelect = document.getElementById(selectElementId);
  if (!categorySelect) return;
  categorySelect.innerHTML = ""; // Clear existing options

  const allCategories = getAllCategories(); // From data.js (local cache)
  let categoriesToDisplay = filterType
    ? allCategories.filter((cat) => cat.type === filterType)
    : allCategories;

  categoriesToDisplay.sort((a, b) => a.name.localeCompare(b.name));

  categoriesToDisplay.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  });
}

/**
 * Renders all transactions to the 'Transactions' page list.
 * @param {Array<object>} transactions - The array of transaction objects from the local cache.
 */
function renderTransactionsPage(transactions) {
  const listElement = document.getElementById("recentTransactionsList");
  if (!listElement) return;
  listElement.innerHTML = ""; // Clear previous content

  if (transactions.length === 0) {
    listElement.innerHTML = `<p class="no-transactions">No transactions yet.</p>`;
    return;
  }

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

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
          <button class="btn btn-edit btn-small" data-id="${
            tx.id
          }">Edit</button>
          <button class="btn btn-danger btn-small" data-id="${
            tx.id
          }">Del</button>
        </div>
      `;
    listElement.appendChild(item);
  });
}

/**
 * Renders the "Expenses by Category" widget on the dashboard.
 * @param {Array<object>} transactions - All transactions from local cache.
 * @param {number} currentMonth - The current month (0-11).
 * @param {number} currentYear - The current year.
 */
function renderExpensesByCategory(transactions, currentMonth, currentYear) {
  const listElement = document.getElementById("expensesByCategoryList");
  if (!listElement) return;
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

  const budgetableCategories = Object.keys(expensesByCat);
  if (budgetableCategories.length === 0) {
    listElement.innerHTML = `<p style="padding: 1rem 0; color: var(--text-muted);">No expenses this month.</p>`;
    return;
  }

  const currentBudgets = getBudgets(); // from data.js

  budgetableCategories
    .sort((a, b) => expensesByCat[b] - expensesByCat[a]) // Sort by most spent
    .forEach((category) => {
      const spentAmount = expensesByCat[category];
      const budgetAmount = currentBudgets[category];
      let progress = 0;
      let progressBarHtml = `<div class="budget-bar-text">No budget set</div>`;

      if (budgetAmount !== undefined && budgetAmount > 0) {
        progress = Math.min((spentAmount / budgetAmount) * 100, 100);
        let color = "var(--progress-green)";
        if (progress > 90) color = "var(--progress-red)";
        else if (progress > 70) color = "var(--progress-yellow)";
        progressBarHtml = `<div class="budget-bar"><div class="budget-progress" style="width: ${progress}%; background-color: ${color};"></div></div>`;
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
    });
}

/**
 * Updates the four main summary cards on the dashboard.
 * @param {Array<object>} transactions - All transactions from local cache.
 * @param {number} currentMonth - The current month (0-11).
 * @param {number} currentYear - The current year.
 */
function updateDashboardSummaries(transactions, currentMonth, currentYear) {
  let totalIncome = 0,
    totalExpenses = 0,
    monthlyIncome = 0,
    monthlyExpenses = 0;

  transactions.forEach((tx) => {
    const amount = parseFloat(tx.amount);
    if (tx.type === "income") totalIncome += amount;
    else totalExpenses += amount;

    const txDate = new Date(tx.date + "T00:00:00");
    if (
      txDate.getMonth() === currentMonth &&
      txDate.getFullYear() === currentYear
    ) {
      if (tx.type === "income") monthlyIncome += amount;
      else monthlyExpenses += amount;
    }
  });

  const savingsRate =
    monthlyIncome > 0
      ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
      : 0;

  document.getElementById("totalBalanceAmount").textContent = formatCurrency(
    totalIncome - totalExpenses
  );
  document.getElementById("monthlyIncomeAmount").textContent =
    formatCurrency(monthlyIncome);
  document.getElementById("monthlyExpensesAmount").textContent =
    formatCurrency(monthlyExpenses);
  document.getElementById(
    "savingsRateAmount"
  ).textContent = `${savingsRate.toFixed(1)}%`;
}

// --- Modal Management (Transaction, Budget, Goal, Category) ---
// These functions control the visibility and state of the various pop-up modals.

const transactionModal = document.getElementById("transactionModal");
const budgetModal = document.getElementById("budgetModal");
const goalModal = document.getElementById("goalModal");
const categoryModal = document.getElementById("categoryModal");

// Generic close listeners
[
  { modal: transactionModal, btnId: "closeModalBtn" },
  { modal: budgetModal, btnId: "closeBudgetModalBtn" },
  { modal: goalModal, btnId: "closeGoalModalBtn" },
  { modal: categoryModal, btnId: "closeCategoryModalBtn" },
].forEach(({ modal, btnId }) => {
  if (!modal) return;
  document
    .getElementById(btnId)
    ?.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });
});

function openModal(transaction = null) {
  const form = document.getElementById("transactionForm");
  form.reset();
  if (transaction) {
    document.getElementById("modalTitle").textContent = "Edit Transaction";
    document.getElementById("transactionId").value = transaction.id;
    document.getElementById("description").value = transaction.description;
    document.getElementById("amount").value = new Intl.NumberFormat(
      "id-ID"
    ).format(transaction.amount);
    document.getElementById("type").value = transaction.type;
    populateCategoryDropdown("category", transaction.type);
    document.getElementById("category").value = transaction.category;
    document.getElementById("date").value = transaction.date;
  } else {
    document.getElementById("modalTitle").textContent = "Add Transaction";
    document.getElementById("transactionId").value = "";
    document.getElementById("type").value = "expense";
    populateCategoryDropdown("category", "expense");
    document.getElementById("date").valueAsDate = new Date();
  }
  transactionModal.style.display = "block";
}
function closeModal() {
  transactionModal.style.display = "none";
}

/**
 * Populates the category dropdown in the budget modal.
 * Filters for 'expense' categories and sorts them.
 * @param {string|null} selectedCategoryKey - The category to pre-select (if any).
 */
function populateBudgetCategoryDropdown(selectedCategoryKey = null) {
  const categorySelect = document.getElementById("budgetCategorySelect");
  if (!categorySelect) {
    console.error("Budget category select dropdown not found.");
    return;
  }
  categorySelect.innerHTML = ""; // Clear existing options

  const allCategories = getAllCategories(); // From data.js
  const expenseCategories = allCategories
    .filter((cat) => cat.type === "expense")
    .sort((a, b) => a.name.localeCompare(b.name));

  if (expenseCategories.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No expense categories available";
    option.disabled = true;
    categorySelect.appendChild(option);
    return;
  }

  expenseCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    if (selectedCategoryKey && category.name === selectedCategoryKey) {
      option.selected = true;
    }
    categorySelect.appendChild(option);
  });
}

function openBudgetModal(categoryKey = null, amount = null) {
  const form = document.getElementById("budgetForm");
  const categorySelect = document.getElementById("budgetCategorySelect");
  form.reset();
  document.getElementById("editingBudgetCategoryKey").value = categoryKey || "";
  populateBudgetCategoryDropdown(categoryKey); // Call the new function

  if (categoryKey) {
    document.getElementById("budgetModalTitle").textContent = "Edit Budget";
    // The populateBudgetCategoryDropdown function now handles pre-selection.
    // We still need to disable it if a categoryKey is provided (editing mode).
    if (categorySelect.querySelector(`option[value="${categoryKey}"]`)) {
        categorySelect.value = categoryKey; // Ensure the value is set if the option exists
    }
    categorySelect.disabled = true;
    document.getElementById("budgetAmountInput").value = new Intl.NumberFormat(
      "id-ID"
    ).format(amount);
  } else {
    document.getElementById("budgetModalTitle").textContent = "Add New Budget";
    categorySelect.disabled = false; // Ensure it's enabled for new budgets
  }
  budgetModal.style.display = "block";
}
function closeBudgetModal() {
  budgetModal.style.display = "none";
}

function openGoalModal(goal = null) {
  const form = document.getElementById("goalForm");
  form.reset();
  if (goal) {
    document.getElementById("goalModalTitle").textContent = "Edit Goal";
    document.getElementById("goalIdInput").value = goal.id;
    document.getElementById("goalNameInput").value = goal.name;
    document.getElementById("goalTargetAmountInput").value =
      new Intl.NumberFormat("id-ID").format(goal.targetAmount);
    document.getElementById("goalCurrentAmountInput").value =
      new Intl.NumberFormat("id-ID").format(goal.currentAmount);
    document.getElementById("goalTargetDateInput").value =
      goal.targetDate || "";
  } else {
    document.getElementById("goalModalTitle").textContent = "Add New Goal";
    document.getElementById("goalIdInput").value = "";
    document.getElementById("goalCurrentAmountInput").value = "0";
  }
  goalModal.style.display = "block";
}
function closeGoalModal() {
  goalModal.style.display = "none";
}

function openCategoryModal() {
  const form = document.getElementById("categoryForm");
  form.reset();
  document.getElementById("categoryModalTitle").textContent =
    "Add New Category";
  categoryModal.style.display = "block";
}
function closeCategoryModal() {
  categoryModal.style.display = "none";
}

// --- Page-Specific Renderers ---

/**
 * Renders the entire 'Budgets' page content.
 * @param {object} budgets - The budgets object { 'categoryName': amount }.
 */
function renderBudgetsPage(budgets) {
  const container = document.getElementById("budgetsListContainer");
  if (!container) return;
  container.innerHTML = "";
  const budgetEntries = Object.entries(budgets);

  if (budgetEntries.length === 0) {
    container.innerHTML = `<p class="no-budgets">No budgets set up yet. Click 'Add/Edit Budget' to start.</p>`;
    return;
  }

  const transactions = getTransactions();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  budgetEntries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([category, budgetAmount]) => {
      const spentAmount = transactions
        .filter(
          (tx) =>
            tx.type === "expense" &&
            tx.category === category &&
            new Date(tx.date + "T00:00:00").getMonth() === currentMonth &&
            new Date(tx.date + "T00:00:00").getFullYear() === currentYear
        )
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      const progress =
        budgetAmount > 0
          ? Math.min((spentAmount / budgetAmount) * 100, 100)
          : spentAmount > 0
          ? 100
          : 0;
      const remaining = budgetAmount - spentAmount;
      let progressColor = "var(--progress-green)";
      if (progress >= 95) progressColor = "var(--progress-red)";
      else if (progress > 75) progressColor = "var(--progress-yellow)";

      const item = document.createElement("div");
      item.className = "budget-item";
      item.innerHTML = `
        <div class="budget-item-main">
          <div class="budget-icon ${getCategoryColorClass(
            category
          )}">${getCategoryIcon(category)}</div>
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

/**
 * Renders the entire 'Goals' page content.
 * @param {Array<object>} goals - The array of goal objects.
 */
function renderGoalsPage(goals) {
  const container = document.getElementById("goalsListContainer");
  if (!container) return;
  container.innerHTML = "";

  if (goals.length === 0) {
    container.innerHTML = `<p class="no-goals">No goals set up yet. Click 'Add New Goal' to start.</p>`;
    return;
  }

  [...goals]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((goal) => {
      const targetAmount = parseFloat(goal.targetAmount);
      const currentAmount = parseFloat(goal.currentAmount);
      const progress =
        targetAmount > 0
          ? Math.min((currentAmount / targetAmount) * 100, 100)
          : 100;

      const item = document.createElement("div");
      item.className = "goal-item";
      item.innerHTML = `
        <div class="goal-item-main">
          <div class="goal-icon">${GOAL_ICON_SVG}</div>
          <div class="goal-info">
            <div class="goal-name">${goal.name}</div>
            <div class="goal-amounts">
              <span class="current">${formatCurrency(currentAmount)}</span> of 
              <span class="target">${formatCurrency(targetAmount)}</span>
            </div>
            <div class="goal-progress-bar">
              <div class="goal-progress ${
                progress >= 100 ? "completed" : ""
              }" style="width: ${progress}%;"></div>
            </div>
            ${
              goal.targetDate
                ? `<div class="goal-target-date">Target: ${formatDate(
                    goal.targetDate
                  )}</div>`
                : ""
            }
          </div>
        </div>
        <div class="goal-item-actions">
          <button class="btn btn-edit btn-small edit-goal-btn" data-id="${
            goal.id
          }">Edit</button>
          <button class="btn btn-danger btn-small delete-goal-btn" data-id="${
            goal.id
          }">Delete</button>
        </div>
      `;
      container.appendChild(item);
    });
}

/**
 * Renders the 'Categories' page content.
 */
function renderCategoriesPage() {
  const expenseListEl = document.getElementById("expenseCategoriesList");
  const incomeListEl = document.getElementById("incomeCategoriesList");
  if (!expenseListEl || !incomeListEl) return;

  const allCategories = getAllCategories();
  const expenseCategories = allCategories
    .filter((c) => c.type === "expense")
    .sort((a, b) => a.name.localeCompare(b.name));
  const incomeCategories = allCategories
    .filter((c) => c.type === "income")
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderList = (element, categories, type) => {
    element.innerHTML = "";
    if (categories.length === 0) {
      element.innerHTML = `<p class="no-categories-message">No ${type} categories found.</p>`;
      return;
    }
    categories.forEach((cat) => {
      element.innerHTML += `
        <div class="category-item-display ${cat.isDefault ? "is-default" : ""}">
          <div class="category-info-display">
            <div class="category-icon-display ${getCategoryColorClass(
              cat.name,
              cat.type
            )}">${getCategoryIcon(cat.name, cat.type)}</div>
            <span class="category-name-display">${cat.name} ${
        cat.isDefault ? "(Default)" : ""
      }</span>
          </div>
          <div class="category-actions-display">
            <button class="btn btn-danger btn-small btn-delete-category" data-name="${
              cat.name
            }" data-type="${cat.type}" ${
        cat.isDefault
          ? 'disabled title="Default categories cannot be deleted."'
          : ""
      }>Delete</button>
          </div>
        </div>
      `;
    });
  };

  renderList(expenseListEl, expenseCategories, "expense");
  renderList(incomeListEl, incomeCategories, "income");
}

let uploadedAvatarDataUrl = null; // Temp store for new avatar data URL

/**
 * Updates the user display in the sidebar.
 * @param {object} userProfile - The user's profile object.
 */
function updateSidebarUserDisplay(userProfile) {
  const avatarEl = document.getElementById("sidebarUserAvatar");
  const nameEl = document.getElementById("sidebarUserName");
  const emailEl = document.getElementById("sidebarUserEmail");
  if (!avatarEl || !nameEl || !emailEl) return;

  nameEl.textContent = userProfile.name;
  emailEl.textContent = userProfile.email;
  avatarEl.innerHTML = "";

  if (userProfile.avatar) {
    const img = document.createElement("img");
    img.src = userProfile.avatar;
    img.alt = userProfile.name;
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = (userProfile.name || "JD")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }
}

/**
 * Renders the 'Account' page with the user's current profile data.
 * @param {object} userProfile - The user's profile object.
 */
function renderAccountPage(userProfile) {
  document.getElementById("accountNameInput").value = userProfile.name;
  document.getElementById("accountEmailInput").value = userProfile.email;
  uploadedAvatarDataUrl = null;
  document.getElementById("accountAvatarInput").value = "";

  const avatarImg = document.getElementById("currentAccountAvatar");
  const avatarInitials = document.getElementById(
    "currentAccountAvatarInitials"
  );

  if (userProfile.avatar) {
    avatarImg.src = userProfile.avatar;
    avatarImg.style.display = "block";
    avatarInitials.style.display = "none";
  } else {
    avatarInitials.textContent = (userProfile.name || "JD")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    avatarImg.style.display = "none";
    avatarInitials.style.display = "block";
  }
}

/**
 * Handles the file input change event for the avatar, showing a preview.
 * @param {Event} event - The file input change event.
 */
function handleAvatarPreview(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const avatarImg = document.getElementById("currentAccountAvatar");
    const avatarInitials = document.getElementById(
      "currentAccountAvatarInitials"
    );
    avatarImg.src = e.target.result;
    avatarImg.style.display = "block";
    avatarInitials.style.display = "none";
    uploadedAvatarDataUrl = e.target.result; // Store base64 data for submission
  };
  reader.readAsDataURL(file);
}

// Sidebar Toggle Functionality for mobile
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  if (sidebar && sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        !sidebarToggleBtn.contains(e.target)
      ) {
        sidebar.classList.remove("open");
      }
    });
  }
});
