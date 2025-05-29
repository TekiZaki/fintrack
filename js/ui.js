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

function populateCategoryDropdown(
  selectElementId,
  filterType = null,
  includeAllOption = false,
  allOptionText = "All Categories"
) {
  const categorySelect = document.getElementById(selectElementId);
  if (!categorySelect) {
    console.warn(
      `Select element with ID '${selectElementId}' not found for populating categories.`
    );
    return;
  }
  categorySelect.innerHTML = ""; // Clear existing options

  if (includeAllOption) {
    const allOption = document.createElement("option");
    allOption.value = ""; // Or a specific value like "all"
    allOption.textContent = allOptionText;
    categorySelect.appendChild(allOption);
  }

  const allCategories = getAllCategories(); // From data.js
  let categoriesToDisplay = allCategories;

  if (filterType) {
    // filterType can be 'income' or 'expense'
    categoriesToDisplay = allCategories.filter(
      (cat) => cat.type === filterType
    );
  }

  // Sort categories by name for consistent display
  categoriesToDisplay.sort((a, b) => a.name.localeCompare(b.name));

  categoriesToDisplay.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name; // Use name as value, type is implicit or handled by filter
    option.textContent = category.name;
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

  const budgetableExpenseCategories = getExpenseCategoriesForBudgeting(); // From data.js

  for (const category in expensesByCat) {
    if (!budgetableExpenseCategories.includes(category)) continue; // Only show budgeted expense categories

    const spentAmount = expensesByCat[category];

    // For this widget, let's use the set budget, or don't show progress if not explicitly budgeted.
    const budgetAmount =
      currentBudgets[category] !== undefined ? currentBudgets[category] : null;

    let progress = 0;
    let progressBarHtml = '<div class="budget-bar-text">No budget set</div>'; // Default text

    if (budgetAmount !== null && budgetAmount > 0) {
      progress = Math.min((spentAmount / budgetAmount) * 100, 100); // Ensure progress doesn't exceed 100% visually
      let progressBarColor = "var(--progress-green)";
      if (progress > 75 && progress < 95)
        progressBarColor = "var(--progress-yellow)";
      if (progress >= 95) progressBarColor = "var(--progress-red)";
      progressBarHtml = `<div class="budget-bar">
                                    <div class="budget-progress" style="width: ${progress}%; background-color: ${progressBarColor};"></div>
                                 </div>`;
    } else if (budgetAmount === 0) {
      // If budget is 0 and spent > 0, it's 100% over.
      progress = spentAmount > 0 ? 100 : 0;
      progressBarHtml = `<div class="budget-bar">
                                    <div class="budget-progress" style="width: ${progress}%; background-color: var(--progress-red);"></div>
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

// Transaction Modal Elements and Functions
const modal = document.getElementById("transactionModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const transactionForm = document.getElementById("transactionForm");
const modalTitle = document.getElementById("modalTitle");
const transactionIdInput = document.getElementById("transactionId");

function openModal(transaction = null) {
  transactionForm.reset();
  // transactionIdInput, modalTitle are fine

  if (transaction) {
    modalTitle.textContent = "Edit Transaction";
    transactionIdInput.value = transaction.id;
    document.getElementById("description").value = transaction.description;
    document.getElementById("amount").value = transaction.amount;
    document.getElementById("type").value = transaction.type;

    // Populate categories based on the transaction's type FIRST
    populateCategoryDropdown("category", transaction.type);
    // THEN set the category value
    document.getElementById("category").value = transaction.category;

    document.getElementById("date").value = transaction.date;
  } else {
    modalTitle.textContent = "Add Transaction";
    transactionIdInput.value = "";
    document.getElementById("type").value = "expense"; // Default to expense for new transactions
    // Populate categories for the default type (expense)
    populateCategoryDropdown("category", "expense");
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

  const expenseCategories = getAllCategories().filter(
    (cat) => cat.type === "expense"
  );
  expenseCategories.sort((a, b) => a.name.localeCompare(b.name));

  // If editing, and the selectedCategory might have been deleted or changed type,
  // we might need to handle that. For now, assume it's a valid expense category.
  let categoriesToShow = expenseCategories.map((cat) => cat.name);

  if (selectedCategory && !categoriesToShow.includes(selectedCategory)) {
    // This could happen if an old budget refers to a category that was deleted
    // or its type changed. For now, we'll add it to the list to avoid errors,
    // but the user should ideally update it.
    // Or, better, ensure that when a category is deleted, budgets are handled.
    // For now, just show it if it's passed.
    categoriesToShow.push(selectedCategory);
    categoriesToShow.sort();
  }

  categoriesToShow.forEach((categoryName) => {
    const option = document.createElement("option");
    option.value = categoryName;
    option.textContent = categoryName;
    if (categoryName === selectedCategory) {
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

    let progressColor = "var(--progress-green)";
    if (progress >= 95) progressColor = "var(--progress-red)";
    else if (progress > 75) progressColor = "var(--progress-yellow)";

    // console.log(`--- Budget Category: ${category} ---`); // Commented out for cleaner console
    // console.log("Budget Amount:", budgetAmount);
    // console.log(
    //   "Transactions being processed (for this category):",
    //   getTransactions().filter(
    //     (tx) =>
    //       tx.type === "expense" &&
    //       tx.category === category &&
    //       new Date(tx.date + "T00:00:00").getMonth() === currentMonth &&
    //       new Date(tx.date + "T00:00:00").getFullYear() === currentYear
    //   )
    // );
    // console.log("Spent Amount:", spentAmount);
    // console.log("Calculated Progress (%):", progress);
    // console.log("Progress Bar Color:", progressColor);

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

// Goal Modal Elements and Functions
const goalModal = document.getElementById("goalModal");
const closeGoalModalBtn = document.getElementById("closeGoalModalBtn");
const goalForm = document.getElementById("goalForm");
const goalModalTitle = document.getElementById("goalModalTitle");
const goalIdInput = document.getElementById("goalIdInput"); // Hidden input for ID
const categoryModal = document.getElementById("categoryModal");
const closeCategoryModalBtn = document.getElementById("closeCategoryModalBtn");
const categoryForm = document.getElementById("categoryForm");
const categoryModalTitle = document.getElementById("categoryModalTitle");
const editingCategoryNameInput = document.getElementById("editingCategoryName");

function openGoalModal(goal = null) {
  if (!goalModal || !goalForm) return;
  goalForm.reset(); // Clear form fields

  if (goal) {
    goalModalTitle.textContent = "Edit Goal";
    goalIdInput.value = goal.id;
    document.getElementById("goalNameInput").value = goal.name;
    // Format amounts for display in the form, then parse back as float when saving
    document.getElementById("goalTargetAmountInput").value = goal.targetAmount;
    document.getElementById("goalCurrentAmountInput").value =
      goal.currentAmount;
    if (goal.targetDate) {
      document.getElementById("goalTargetDateInput").value = goal.targetDate;
    }
  } else {
    goalModalTitle.textContent = "Add New Goal";
    goalIdInput.value = ""; // Clear ID for new goal
    document.getElementById("goalCurrentAmountInput").value = "0"; // Default current amount to 0
  }
  goalModal.style.display = "block";
}

function closeGoalModal() {
  if (!goalModal) return;
  goalModal.style.display = "none";
}

if (closeGoalModalBtn) closeGoalModalBtn.onclick = closeGoalModal;
window.addEventListener("click", function (event) {
  if (event.target == goalModal) {
    closeGoalModal();
  }
});

function openCategoryModal(category = null) {
  if (!categoryModal || !categoryForm) return;
  categoryForm.reset();

  const categoryNameField = document.getElementById("categoryNameInput");
  const categoryTypeField = document.getElementById("categoryTypeSelect");
  const editingCategoryTypeInput = document.getElementById(
    "editingCategoryType"
  );
  const isEditingCategoryDefaultInput = document.getElementById(
    "isEditingCategoryDefault"
  );

  if (category) {
    // Editing existing category (only non-default for now)
    categoryModalTitle.textContent = "Edit Category";
    editingCategoryNameInput.value = category.name;
    editingCategoryTypeInput.value = category.type;
    isEditingCategoryDefaultInput.value = category.isDefault.toString();

    categoryNameField.value = category.name;
    categoryTypeField.value = category.type;

    // For now, disable editing name/type of default categories, or editing at all.
    // Let's assume we only allow editing user-added categories, and for them, name/type can be changed.
    // If it's a default category, perhaps only allow changing icon/color in a future version.
    // For this iteration, let's say "Edit" is disabled for default categories.
    // If we were to allow editing, we'd need to handle renaming repercussions.
    // For simplicity, let's assume "Add New" only for now, and "Edit" button won't be shown for defaults.
    // If an "Edit" button *is* clicked (for a custom one):
    // categoryNameField.disabled = category.isDefault; // Can't change name of default
    // categoryTypeField.disabled = category.isDefault; // Can't change type of default
  } else {
    // Adding new category
    categoryModalTitle.textContent = "Add New Category";
    editingCategoryNameInput.value = "";
    editingCategoryTypeInput.value = "";
    isEditingCategoryDefaultInput.value = "false";
    categoryNameField.disabled = false;
    categoryTypeField.disabled = false;
  }
  categoryModal.style.display = "block";
}

function closeCategoryModal() {
  if (!categoryModal) return;
  categoryModal.style.display = "none";
}

if (closeCategoryModalBtn) closeCategoryModalBtn.onclick = closeCategoryModal;
window.addEventListener("click", function (event) {
  if (event.target == categoryModal) {
    closeCategoryModal();
  }
});

function renderCategoriesPage() {
  const expenseListEl = document.getElementById("expenseCategoriesList");
  const incomeListEl = document.getElementById("incomeCategoriesList");

  if (!expenseListEl || !incomeListEl) {
    console.warn("Category list elements not found for rendering.");
    return;
  }

  const allCategories = getAllCategories(); // from data.js
  const expenseCategories = allCategories
    .filter((cat) => cat.type === "expense")
    .sort((a, b) => a.name.localeCompare(b.name));
  const incomeCategories = allCategories
    .filter((cat) => cat.type === "income")
    .sort((a, b) => a.name.localeCompare(b.name));

  expenseListEl.innerHTML = ""; // Clear previous
  incomeListEl.innerHTML = ""; // Clear previous

  const createCategoryItemHtml = (cat) => {
    // Delete button is disabled for default categories
    const deleteButtonHtml = `
      <button 
        class="btn btn-danger btn-small btn-delete-category" 
        data-name="${cat.name}" 
        data-type="${cat.type}"
        ${
          cat.isDefault
            ? 'disabled title="Default categories cannot be deleted."'
            : ""
        }
      >Delete</button>`;
    // Edit button could be added here, perhaps disabled for default too or with limited functionality.
    // For now, focusing on Add and Delete (for custom).
    // <button class="btn btn-edit btn-small btn-edit-category" data-name="${cat.name}" data-type="${cat.type}" ${cat.isDefault ? 'disabled' : ''}>Edit</button>

    return `
      <div class="category-item-display ${cat.isDefault ? "is-default" : ""}">
        <div class="category-info-display">
          <div class="category-icon-display ${getCategoryColorClass(
            cat.name,
            cat.type
          )}">
            ${getCategoryIcon(cat.name, cat.type)}
          </div>
          <span class="category-name-display">${cat.name} ${
      cat.isDefault ? "(Default)" : ""
    }</span>
        </div>
        <div class="category-actions-display">
          ${deleteButtonHtml}
        </div>
      </div>
    `;
  };

  if (expenseCategories.length > 0) {
    expenseCategories.forEach(
      (cat) => (expenseListEl.innerHTML += createCategoryItemHtml(cat))
    );
  } else {
    expenseListEl.innerHTML =
      '<p class="no-categories-message">No expense categories found.</p>';
  }
  // Check specifically for non-default expense categories for the "no custom" message
  if (
    !expenseCategories.some((cat) => !cat.isDefault) &&
    expenseCategories.some((cat) => cat.isDefault)
  ) {
    const noCustomMsg = expenseListEl.querySelector(".no-categories-message");
    if (noCustomMsg)
      noCustomMsg.textContent = "No custom expense categories added yet.";
    else
      expenseListEl.insertAdjacentHTML(
        "beforeend",
        '<p class="no-categories-message">No custom expense categories added yet.</p>'
      );
  }

  if (incomeCategories.length > 0) {
    incomeCategories.forEach(
      (cat) => (incomeListEl.innerHTML += createCategoryItemHtml(cat))
    );
  } else {
    incomeListEl.innerHTML =
      '<p class="no-categories-message">No income categories found.</p>';
  }
  if (
    !incomeCategories.some((cat) => !cat.isDefault) &&
    incomeCategories.some((cat) => cat.isDefault)
  ) {
    const noCustomMsg = incomeListEl.querySelector(".no-categories-message");
    if (noCustomMsg)
      noCustomMsg.textContent = "No custom income categories added yet.";
    else
      incomeListEl.insertAdjacentHTML(
        "beforeend",
        '<p class="no-categories-message">No custom income categories added yet.</p>'
      );
  }
}

let uploadedAvatarDataUrl = null; // Temporary store for new avatar

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

// Sidebar Toggle Functionality
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  // const mainContent = document.querySelector(".main-content"); // Not directly used for close logic, so commented out

  if (sidebar && sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent click from immediately closing sidebar via document listener
      sidebar.classList.toggle("open");
    });
  }

  // Close sidebar when clicking outside of it on mobile
  document.addEventListener("click", (event) => {
    if (sidebar && sidebar.classList.contains("open")) {
      // Check if the click is outside the sidebar AND not on the toggle button
      if (
        !sidebar.contains(event.target) &&
        event.target !== sidebarToggleBtn &&
        !sidebarToggleBtn.contains(event.target)
      ) {
        sidebar.classList.remove("open");
      }
    }
  });
});

function formatGoalDate(dateString) {
  if (!dateString) return "No target date";
  const date = new Date(dateString + "T00:00:00"); // Ensure local date
  return date.toLocaleDateString("en-US", {
    // Using en-US for consistency, or id-ID
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

function renderGoalsPage(goals) {
  const container = document.getElementById("goalsListContainer");
  if (!container) return;

  // Select the "no goals" element. If it doesn't exist, it will be null.
  // We'll add it back if needed.
  let noGoalsEl = container.querySelector(".no-goals");
  if (!noGoalsEl) {
    // Create it if it doesn't exist so we can clone it later
    noGoalsEl = document.createElement("p");
    noGoalsEl.className = "no-goals";
    noGoalsEl.style.padding = "1rem 0";
    noGoalsEl.style.color = "var(--gray-400)";
    noGoalsEl.textContent =
      "No goals set up yet. Click 'Add New Goal' to start.";
  }

  // Clear previous items, preserving the "no goals" message if it exists
  while (
    container.firstChild &&
    !container.firstChild.classList?.contains("no-goals")
  ) {
    container.removeChild(container.firstChild);
  }
  // Remove old "no goals" message before re-evaluating, as we'll add a new one if needed
  if (
    container.firstChild &&
    container.firstChild.classList?.contains("no-goals")
  ) {
    container.removeChild(container.firstChild);
  }

  if (goals.length === 0) {
    container.appendChild(noGoalsEl.cloneNode(true)); // Add a clone if no goals
    return;
  }

  goals.sort((a, b) => a.name.localeCompare(b.name)); // Sort by name

  goals.forEach((goal) => {
    const item = document.createElement("div");
    item.className = "goal-item";

    const targetAmount = parseFloat(goal.targetAmount);
    const currentAmount = parseFloat(goal.currentAmount);
    let progress = 0;
    if (targetAmount > 0) {
      progress = Math.min((currentAmount / targetAmount) * 100, 100);
    } else if (currentAmount > 0) {
      // Target is 0, but has current amount (edge case)
      progress = 100; // Consider it completed if target is 0 but already saved some
    }

    let targetDateHtml = "";
    let dateClass = "";
    if (goal.targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date
      const tDate = new Date(goal.targetDate + "T00:00:00");
      if (tDate < today && currentAmount < targetAmount) {
        dateClass = "overdue";
      }
      targetDateHtml = `<div class="goal-target-date ${dateClass}">Target: ${formatGoalDate(
        goal.targetDate
      )}</div>`;
    }

    item.innerHTML = `
      <div class="goal-item-main">
        <div class="goal-icon">
          ${GOAL_ICON_SVG}
        </div>
        <div class="goal-info">
          <div class="goal-name">${goal.name}</div>
          <div class="goal-amounts">
            <span class="current">${formatCurrency(
              currentAmount
            )}</span> saved of 
            <span class="target">${formatCurrency(targetAmount)}</span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress ${
              currentAmount >= targetAmount ? "completed" : ""
            }" style="width: ${progress}%;"></div>
          </div>
          ${targetDateHtml}
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
