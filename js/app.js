// js/app.js

let currentPage = "dashboard"; // Default page

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  const userProfile = getUserProfile(); // Get profile early
  updateSidebarUserDisplay(userProfile); // Update sidebar immediately

  // populateCategoryDropdown(); // For the transaction modal - This is now handled by ui.js openModal
  // Ensure the transaction modal's category dropdown is populated correctly when it opens.

  setupNavigation(); // Setup sidebar navigation and page switching

  // Show the initial page (default 'dashboard') and render its content
  showPage(currentPage); // This will also call initCharts and refreshCurrentPageContent

  // Setup event listeners for global elements like the modal
  document
    .getElementById("addTransactionBtn")
    ?.addEventListener("click", () => openModal());
  document
    .getElementById("transactionForm")
    ?.addEventListener("submit", handleFormSubmit);

  // Event listener for the "Add New Budget" button on the Budgets page
  document
    .getElementById("addNewBudgetBtn")
    ?.addEventListener("click", () => openBudgetModal());

  // Event listener for the budget form submission
  document
    .getElementById("budgetForm")
    ?.addEventListener("submit", handleBudgetFormSubmit); // Renamed for clarity

  // Goal Modal Listeners (NEW)
  document
    .getElementById("addNewGoalBtn")
    ?.addEventListener("click", () => openGoalModal());
  document
    .getElementById("goalForm")
    ?.addEventListener("submit", handleGoalFormSubmit);

  // Event listener for "Add New Category" button
  document
    .getElementById("addNewCategoryBtn")
    ?.addEventListener("click", () => openCategoryModal()); // openCategoryModal is in ui.js

  // Event listener for the category form submission
  document
    .getElementById("categoryForm")
    ?.addEventListener("submit", handleCategoryFormSubmit);

  // Event listener for transaction type change to update categories in the modal
  const transactionTypeSelect = document.getElementById("type");
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener("change", (event) => {
      const selectedType = event.target.value;
      populateCategoryDropdown("category", selectedType); // populateCategoryDropdown is in ui.js
    });
  }

  // Event listener for account form submission
  const accountForm = document.getElementById("accountForm");
  if (accountForm) {
    accountForm.addEventListener("submit", handleAccountFormSubmit);
  }

  // Event listener for avatar input change (for preview)
  const avatarInput = document.getElementById("accountAvatarInput");
  if (avatarInput) {
    avatarInput.addEventListener("change", handleAvatarPreview);
  }

  // Event delegation for edit/delete buttons on transaction list
  // Attach to a static parent that is always in the DOM (e.g., main-content)
  document
    .querySelector(".main-content")
    .addEventListener("click", function (event) {
      const target = event.target;
      // Check if the click originated from within the transactions list
      const transactionList = target.closest("#recentTransactionsList");

      if (transactionList) {
        const btnEdit = target.closest(".btn-edit");
        const btnDelete = target.closest(".btn-danger");

        if (btnEdit && btnEdit.dataset.id) {
          handleTransactionAction(btnEdit.dataset.id, "edit");
        } else if (btnDelete && btnDelete.dataset.id) {
          handleTransactionAction(btnDelete.dataset.id, "delete");
        }
      }
    });

  // Event delegation for edit/delete budget buttons
  // Attach to a static parent that is always in the DOM for the budgets page
  const budgetsPageWidget = document.querySelector("#page-budgets .widget");
  if (budgetsPageWidget) {
    budgetsPageWidget.addEventListener("click", function (event) {
      const target = event.target;
      const btnEdit = target.closest(".edit-budget-btn");
      const btnDelete = target.closest(".delete-budget-btn");

      if (btnEdit) {
        const category = btnEdit.dataset.category;
        const amount = btnEdit.dataset.amount;
        handleBudgetAction(category, "edit", parseFloat(amount));
      } else if (btnDelete) {
        const category = btnDelete.dataset.category;
        handleBudgetAction(category, "delete");
      }
    });
  }

  // Event delegation for goal list actions (NEW)
  const goalsPageWidget = document.querySelector("#page-goals .widget");
  if (goalsPageWidget) {
    goalsPageWidget.addEventListener("click", function (event) {
      const target = event.target;
      const btnEdit = target.closest(".edit-goal-btn");
      const btnDelete = target.closest(".delete-goal-btn");

      if (btnEdit && btnEdit.dataset.id) {
        handleGoalAction(btnEdit.dataset.id, "edit");
      } else if (btnDelete && btnDelete.dataset.id) {
        handleGoalAction(btnDelete.dataset.id, "delete");
      }
    });
  }

  // Event delegation for delete category buttons
  const categoriesPageWidget = document.querySelector(
    "#page-categories .widget"
  );
  if (categoriesPageWidget) {
    categoriesPageWidget.addEventListener("click", function (event) {
      const target = event.target;
      const btnDelete = target.closest(".btn-delete-category");
      // const btnEdit = target.closest(".btn-edit-category"); // For future edit functionality

      if (btnDelete && btnDelete.dataset.name && btnDelete.dataset.type) {
        if (!btnDelete.disabled) {
          // Check if button is not disabled (i.e., not a default category)
          handleCategoryAction(
            btnDelete.dataset.name,
            btnDelete.dataset.type,
            "delete"
          );
        }
      }
      // if (btnEdit && btnEdit.dataset.name && btnEdit.dataset.type) {
      //   if (!btnEdit.disabled) {
      //     const category = getAllCategories().find(c => c.name === btnEdit.dataset.name && c.type === btnEdit.dataset.type);
      //     if (category) openCategoryModal(category); // openCategoryModal is in ui.js
      //   }
      // }
    });
  }
}

function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const pageId = link.dataset.page;
      if (pageId && pageId !== currentPage) {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        showPage(pageId);
      } else if (pageId === currentPage) {
        // Optionally refresh if clicking the active page again, or do nothing
        // For now, do nothing to prevent unnecessary re-renders
      } else if (!pageId) {
        console.warn(
          "Nav link clicked without data-page attribute:",
          link.textContent.trim()
        );
      }
    });
  });
}

function showPage(pageId) {
  // Hide all page content divs
  document.querySelectorAll(".page-content").forEach((pageDiv) => {
    pageDiv.classList.remove("active-page");
  });

  // Show the selected page content div
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add("active-page");
    currentPage = pageId; // Update current page tracker
    document.getElementById("currentPageTitle").textContent = pageId; // Update header title

    // Initialize charts if necessary for the current page
    // initCharts will only initialize if canvas exists and instance is not already created
    initCharts();

    // Refresh content specific to this page
    refreshCurrentPageContent();
  } else {
    console.warn(`Page content for '${pageId}' not found.`);
    // Fallback to dashboard if requested page doesn't exist
    if (pageId !== "dashboard") {
      showPage("dashboard");
      document
        .querySelector('.nav-link[data-page="dashboard"]')
        .classList.add("active");
    }
  }
}

function handleFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("transactionId").value;

  // Get the formatted amount string from the input
  const formattedAmountString = document.getElementById("amount").value;

  // Remove thousand separators (dots for IDR) before parsing
  const unformattedAmountString = formattedAmountString.replace(/\./g, "");

  const transaction = {
    description: document.getElementById("description").value,
    amount: parseFloat(unformattedAmountString), // Use the unformatted string for parsing
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };

  // Validate amount
  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    // Also check if amount is positive
    alert("Invalid amount. Please enter a valid positive number.");
    const amountInput = document.getElementById("amount");
    if (amountInput) amountInput.focus(); // Focus back on amount field
    return;
  }

  if (id) {
    updateTransaction(id, transaction);
  } else {
    addTransaction(transaction);
  }
  closeModal();
  refreshCurrentPageContent();
}

// Renamed for clarity and to match the new handleBudgetAction
function handleBudgetFormSubmit(event) {
  event.preventDefault();
  if (
    !document.getElementById("budgetCategorySelect") ||
    !document.getElementById("budgetAmountInput") ||
    !document.getElementById("editingBudgetCategoryKey")
  ) {
    console.error("Budget form elements not found.");
    return;
  }

  const selectedCategoryInDropdown = document.getElementById(
    "budgetCategorySelect"
  ).value;
  const formattedAmountString =
    document.getElementById("budgetAmountInput").value;
  const unformattedAmountString = formattedAmountString.replace(/\./g, "");
  const amount = parseFloat(unformattedAmountString);
  const editingCategory = document.getElementById(
    "editingBudgetCategoryKey"
  ).value;

  const budgets = getBudgets();
  let categoryToUpdate;

  if (editingCategory) {
    categoryToUpdate = editingCategory;
  } else {
    categoryToUpdate = selectedCategoryInDropdown;
    if (budgets.hasOwnProperty(categoryToUpdate)) {
      if (
        !confirm(
          `A budget for "${categoryToUpdate}" already exists with an amount of ${formatCurrency(
            budgets[categoryToUpdate]
          )}. Do you want to overwrite it with ${formatCurrency(amount)}?`
        )
      ) {
        return;
      }
    }
  }

  if (!categoryToUpdate) {
    alert("Category not selected or identified.");
    return;
  }
  if (isNaN(amount) || amount < 0) {
    alert("Please enter a valid, non-negative amount for the budget.");
    return;
  }

  budgets[categoryToUpdate] = amount;
  saveBudgets(budgets);
  closeBudgetModal();
  refreshCurrentPageContent();
}

function handleGoalFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("goalIdInput").value;

  const targetAmountFormatted = document.getElementById(
    "goalTargetAmountInput"
  ).value;
  const currentAmountFormatted = document.getElementById(
    "goalCurrentAmountInput"
  ).value;

  const targetAmount = parseFloat(targetAmountFormatted); // Remove thousand separators (dots for IDR)
  const currentAmount = parseFloat(currentAmountFormatted); // Remove thousand separators (dots for IDR)

  const goal = {
    name: document.getElementById("goalNameInput").value.trim(),
    targetAmount: targetAmount,
    currentAmount: currentAmount,
    targetDate: document.getElementById("goalTargetDateInput").value || null, // Store as null if empty
  };

  if (!goal.name) {
    alert("Goal name cannot be empty.");
    document.getElementById("goalNameInput")?.focus();
    return;
  }
  if (isNaN(goal.targetAmount) || goal.targetAmount <= 0) {
    alert("Target amount must be a positive number.");
    document.getElementById("goalTargetAmountInput")?.focus();
    return;
  }
  if (isNaN(goal.currentAmount) || goal.currentAmount < 0) {
    alert("Current amount must be a non-negative number.");
    document.getElementById("goalCurrentAmountInput")?.focus();
    return;
  }
  if (goal.currentAmount > goal.targetAmount) {
    if (
      !confirm(
        "Current amount is greater than the target amount. Is this correct?"
      )
    ) {
      document.getElementById("goalCurrentAmountInput")?.focus();
      return;
    }
  }

  if (id) {
    updateGoal(id, goal);
  } else {
    addGoal(goal);
  }
  closeGoalModal();
  refreshCurrentPageContent();
}

function handleCategoryFormSubmit(event) {
  event.preventDefault();
  const categoryName = document
    .getElementById("categoryNameInput")
    .value.trim();
  const categoryType = document.getElementById("categoryTypeSelect").value;

  // const originalName = document.getElementById("editingCategoryName").value;
  // const isDefault = document.getElementById("isEditingCategoryDefault").value === "true";

  if (!categoryName) {
    alert("Category name cannot be empty.");
    return;
  }

  // For now, only adding new categories. Edit functionality is more complex due to dependencies.
  // if (originalName && !isDefault) { // If originalName exists and it's not a default, it's an edit
  // alert("Editing categories is not yet implemented.");
  // For future: updateCategory(originalName, { name: categoryName, type: categoryType });
  // } else if (originalName && isDefault) {
  // alert("Default categories cannot be modified in this way.");
  // }
  // else { // Adding new category
  const success = addCategory({ name: categoryName, type: categoryType }); // addCategory is in data.js
  if (success) {
    closeCategoryModal(); // in ui.js
    refreshCurrentPageContent();
    refreshCategoryDependentUIData(); // New function to update dropdowns etc.
  }
  // }
}

function handleTransactionAction(transactionId, actionType) {
  // ... (implementation as before) ...
  if (actionType === "edit") {
    const transactions = getTransactions();
    const transactionToEdit = transactions.find(
      (tx) => tx.id === transactionId
    );
    if (transactionToEdit) {
      openModal(transactionToEdit);
    }
  } else if (actionType === "delete") {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(transactionId);
      refreshCurrentPageContent();
    }
  }
}

function handleBudgetAction(category, actionType, amount = null) {
  if (actionType === "edit") {
    openBudgetModal(category, amount); // Pass amount directly, not parsed again
  } else if (actionType === "delete") {
    if (
      confirm(
        `Are you sure you want to delete the budget for "${category}"? This cannot be undone.`
      )
    ) {
      const budgets = getBudgets();
      delete budgets[category];
      saveBudgets(budgets);
      refreshCurrentPageContent();
    }
  }
}

function handleGoalAction(goalId, actionType) {
  if (actionType === "edit") {
    const goals = getGoals();
    const goalToEdit = goals.find((g) => g.id === goalId);
    if (goalToEdit) {
      openGoalModal(goalToEdit);
    }
  } else if (actionType === "delete") {
    if (
      confirm(
        "Are you sure you want to delete this goal? This cannot be undone."
      )
    ) {
      deleteGoal(goalId);
      refreshCurrentPageContent();
    }
  }
}

function handleCategoryAction(categoryName, categoryType, actionType) {
  if (actionType === "delete") {
    if (
      confirm(
        `Are you sure you want to delete the category "${categoryName} (${categoryType})"? This cannot be undone if not used.`
      )
    ) {
      const success = deleteCategory(categoryName, categoryType); // deleteCategory is in data.js
      if (success) {
        refreshCurrentPageContent();
        refreshCategoryDependentUIData();
      }
    }
  }
  // else if (actionType === "edit") {
  //   // Find category and open modal - handled by event listener directly for now
  // }
}
function handleAccountFormSubmit(event) {
  event.preventDefault();
  const accountUpdateStatus = document.getElementById("accountUpdateStatus");
  accountUpdateStatus.textContent = ""; // Clear previous messages
  accountUpdateStatus.classList.remove("success", "error");

  const newName = document.getElementById("accountNameInput").value.trim();
  const newEmail = document.getElementById("accountEmailInput").value.trim();

  if (!newName || !newEmail) {
    accountUpdateStatus.textContent = "Name and Email cannot be empty.";
    accountUpdateStatus.classList.add("error");
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    accountUpdateStatus.textContent = "Please enter a valid email address.";
    accountUpdateStatus.classList.add("error");
    return;
  }

  const currentProfile = getUserProfile();
  const updatedProfile = {
    ...currentProfile, // Keep existing avatar by default
    name: newName,
    email: newEmail,
  };

  if (uploadedAvatarDataUrl) {
    updatedProfile.avatar = uploadedAvatarDataUrl;
  }

  saveUserProfile(updatedProfile);
  updateSidebarUserDisplay(updatedProfile); // Update sidebar
  renderAccountPage(updatedProfile); // Re-render account page with new data (and clear preview)

  // Optional: Show success message
  accountUpdateStatus.textContent = "Profile updated successfully!";
  accountUpdateStatus.classList.add("success");
  setTimeout(() => {
    accountUpdateStatus.textContent = "";
    accountUpdateStatus.classList.remove("success");
  }, 3000);

  uploadedAvatarDataUrl = null; // Clear after successful save
  document.getElementById("accountAvatarInput").value = ""; // Clear file input
}

function refreshCategoryDependentUIData() {
  // Re-populate transaction modal category dropdown
  // The openModal function for transactions in ui.js should already call populateCategoryDropdown.
  // We just need to ensure it's called with the right parameters if the modal is open,
  // or that it will be fresh next time it's opened.
  // For simplicity, we assume openModal will always fetch fresh categories.

  // Re-populate budget modal category dropdown
  // Similar to transaction modal, openBudgetModal in ui.js should handle this.

  // If on dashboard, re-render expenses by category widget as available categories might change
  if (currentPage === "dashboard") {
    const transactions = getTransactions();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    renderExpensesByCategory(transactions, currentMonth, currentYear); // in ui.js
  }
  // If on budgets page, re-render budgets as available categories for new budgets might change
  if (currentPage === "budgets") {
    const budgets = getBudgets();
    renderBudgetsPage(budgets); // in ui.js
  }
}

function refreshCurrentPageContent() {
  const transactions = getTransactions();
  const userProfile = getUserProfile(); // Get latest profile
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const dateRangeBtn = document.getElementById("dateRangeBtn");
  if (dateRangeBtn) {
    dateRangeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          ${today.toLocaleString("default", { month: "long" })} ${currentYear}
      `;
  }

  if (currentPage === "dashboard") {
    updateDashboardSummaries(transactions, currentMonth, currentYear);
    renderExpensesByCategory(transactions, currentMonth, currentYear); // This now uses getBudgets()
    updateCashFlowChart(transactions);
  } else if (currentPage === "analytics") {
    updateSpendingTrendsChart(transactions, currentMonth, currentYear);
  } else if (currentPage === "transactions") {
    renderTransactionsPage(transactions);
  } else if (currentPage === "budgets") {
    const budgets = getBudgets();
    renderBudgetsPage(budgets);
  } else if (currentPage === "goals") {
    // NEW
    const goals = getGoals();
    renderGoalsPage(goals);
  } else if (currentPage === "account") {
    renderAccountPage(userProfile); // Use userProfile here
  } else if (currentPage === "categories") {
    // NEW
    renderCategoriesPage(); // in ui.js
  }
  // ... (other pages) ...
}
