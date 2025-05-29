// js/app.js

let currentPage = "dashboard"; // Default page

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) {
    // checkAuth is from auth.js
    return; // checkAuth will handle redirection if necessary
  }
  initApp();
});

function initApp() {
  const userProfile = getUserProfile(); // From data.js (now user-scoped)
  if (userProfile && userProfile.email) {
    // Ensure profile is valid
    updateSidebarUserDisplay(userProfile); // From ui.js
  } else {
    // This might happen if data is corrupted or user somehow bypassed login init
    console.error("User profile not found or invalid. Logging out.");
    logoutUser();
    return;
  }

  setupNavigation();
  showPage(currentPage);

  document
    .getElementById("addTransactionBtn")
    ?.addEventListener("click", () => openModal());
  document
    .getElementById("transactionForm")
    ?.addEventListener("submit", handleFormSubmit);

  document
    .getElementById("addNewBudgetBtn")
    ?.addEventListener("click", () => openBudgetModal());
  document
    .getElementById("budgetForm")
    ?.addEventListener("submit", handleBudgetFormSubmit);

  document
    .getElementById("addNewGoalBtn")
    ?.addEventListener("click", () => openGoalModal());
  document
    .getElementById("goalForm")
    ?.addEventListener("submit", handleGoalFormSubmit);

  document
    .getElementById("addNewCategoryBtn")
    ?.addEventListener("click", () => openCategoryModal());
  document
    .getElementById("categoryForm")
    ?.addEventListener("submit", handleCategoryFormSubmit);

  const transactionTypeSelect = document.getElementById("type");
  if (transactionTypeSelect) {
    transactionTypeSelect.addEventListener("change", (event) => {
      const selectedType = event.target.value;
      populateCategoryDropdown("category", selectedType);
    });
  }

  const accountForm = document.getElementById("accountForm");
  if (accountForm) {
    accountForm.addEventListener("submit", handleAccountFormSubmit);
  }

  const avatarInput = document.getElementById("accountAvatarInput");
  if (avatarInput) {
    avatarInput.addEventListener("change", handleAvatarPreview);
  }

  document
    .querySelector(".main-content")
    .addEventListener("click", function (event) {
      const target = event.target;
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

  const categoriesPageWidget = document.querySelector(
    "#page-categories .widget"
  );
  if (categoriesPageWidget) {
    categoriesPageWidget.addEventListener("click", function (event) {
      const target = event.target;
      const btnDelete = target.closest(".btn-delete-category");
      if (btnDelete && btnDelete.dataset.name && btnDelete.dataset.type) {
        if (!btnDelete.disabled) {
          handleCategoryAction(
            btnDelete.dataset.name,
            btnDelete.dataset.type,
            "delete"
          );
        }
      }
    });
  }

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser(); // from auth.js
    });
  }
}

function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    // Skip logout link for page navigation logic
    if (link.id === "logoutLink") return;

    link.addEventListener("click", () => {
      const pageId = link.dataset.page;
      if (pageId && pageId !== currentPage) {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        showPage(pageId);
      } else if (pageId === currentPage) {
        // Optionally refresh, or do nothing
      } else if (!pageId) {
        console.warn(
          "Nav link clicked without data-page:",
          link.textContent.trim()
        );
      }
    });
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page-content").forEach((pageDiv) => {
    pageDiv.classList.remove("active-page");
  });

  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add("active-page");
    currentPage = pageId;
    document.getElementById("currentPageTitle").textContent = pageId;
    initCharts();
    refreshCurrentPageContent();
  } else {
    console.warn(`Page content for '${pageId}' not found.`);
    if (pageId !== "dashboard") {
      showPage("dashboard");
      document
        .querySelector('.nav-link[data-page="dashboard"]')
        ?.classList.add("active");
    }
  }
}

function handleFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("transactionId").value;
  const formattedAmountString = document.getElementById("amount").value;
  const unformattedAmountString = formattedAmountString.replace(/\./g, "");

  const transaction = {
    description: document.getElementById("description").value,
    amount: parseFloat(unformattedAmountString),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };

  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    alert("Invalid amount. Please enter a valid positive number.");
    document.getElementById("amount")?.focus();
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

  const budgets = getBudgets(); // Scoped
  let categoryToUpdate;

  if (editingCategory) {
    categoryToUpdate = editingCategory;
  } else {
    categoryToUpdate = selectedCategoryInDropdown;
    if (budgets.hasOwnProperty(categoryToUpdate)) {
      if (
        !confirm(
          `A budget for "${categoryToUpdate}" already exists. Overwrite it?`
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
  saveBudgets(budgets); // Scoped
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
  const targetAmount = parseFloat(targetAmountFormatted.replace(/\./g, ""));
  const currentAmount = parseFloat(currentAmountFormatted.replace(/\./g, ""));

  const goal = {
    name: document.getElementById("goalNameInput").value.trim(),
    targetAmount: targetAmount,
    currentAmount: currentAmount,
    targetDate: document.getElementById("goalTargetDateInput").value || null,
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
      !confirm("Current amount is greater than the target. Is this correct?")
    ) {
      document.getElementById("goalCurrentAmountInput")?.focus();
      return;
    }
  }

  if (id) {
    updateGoal(id, goal); // Scoped
  } else {
    addGoal(goal); // Scoped
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

  if (!categoryName) {
    alert("Category name cannot be empty.");
    return;
  }
  const success = addCategory({ name: categoryName, type: categoryType }); // Scoped
  if (success) {
    closeCategoryModal();
    refreshCurrentPageContent();
    refreshCategoryDependentUIData();
  }
}

function handleTransactionAction(transactionId, actionType) {
  if (actionType === "edit") {
    const transactions = getTransactions(); // Scoped
    const transactionToEdit = transactions.find(
      (tx) => tx.id === transactionId
    );
    if (transactionToEdit) {
      openModal(transactionToEdit);
    }
  } else if (actionType === "delete") {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(transactionId); // Scoped
      refreshCurrentPageContent();
    }
  }
}

function handleBudgetAction(category, actionType, amount = null) {
  if (actionType === "edit") {
    openBudgetModal(category, amount);
  } else if (actionType === "delete") {
    if (
      confirm(`Are you sure you want to delete the budget for "${category}"?`)
    ) {
      const budgets = getBudgets(); // Scoped
      delete budgets[category];
      saveBudgets(budgets); // Scoped
      refreshCurrentPageContent();
    }
  }
}

function handleGoalAction(goalId, actionType) {
  if (actionType === "edit") {
    const goals = getGoals(); // Scoped
    const goalToEdit = goals.find((g) => g.id === goalId);
    if (goalToEdit) {
      openGoalModal(goalToEdit);
    }
  } else if (actionType === "delete") {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoal(goalId); // Scoped
      refreshCurrentPageContent();
    }
  }
}

function handleCategoryAction(categoryName, categoryType, actionType) {
  if (actionType === "delete") {
    if (
      confirm(
        `Are you sure you want to delete the category "${categoryName} (${categoryType})"?`
      )
    ) {
      const success = deleteCategory(categoryName, categoryType); // Scoped
      if (success) {
        refreshCurrentPageContent();
        refreshCategoryDependentUIData();
      }
    }
  }
}

function handleAccountFormSubmit(event) {
  event.preventDefault();
  const accountUpdateStatus = document.getElementById("accountUpdateStatus");
  accountUpdateStatus.textContent = "";
  accountUpdateStatus.classList.remove("success", "error");

  const newName = document.getElementById("accountNameInput").value.trim();
  const newEmail = document.getElementById("accountEmailInput").value.trim();

  const currentLoggedInEmail = getCurrentUserEmail(); // From auth.js

  if (!newName || !newEmail) {
    accountUpdateStatus.textContent = "Name and Email cannot be empty.";
    accountUpdateStatus.classList.add("error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    accountUpdateStatus.textContent = "Please enter a valid email address.";
    accountUpdateStatus.classList.add("error");
    return;
  }

  // Get current user's full data block key (old key if email changes)
  const oldUserDataKey = `userData_${currentLoggedInEmail}`;
  // New user data block key (if email changes)
  const newUserDataKey = `userData_${newEmail}`;

  // Get the current user's profile from their scoped data
  const currentProfile = getUserProfile(); // from data.js, already scoped
  const updatedProfileData = {
    // This is the object to save into the user's data block
    ...currentProfile,
    name: newName,
    email: newEmail, // This is the new email for the profile object
  };

  if (uploadedAvatarDataUrl) {
    updatedProfileData.avatar = uploadedAvatarDataUrl;
  }

  // Update the master list of users (for login)
  let allSystemUsers = JSON.parse(
    localStorage.getItem("finTrackUsers") || "[]"
  );
  const userIndexInSystemList = allSystemUsers.findIndex(
    (u) => u.email === currentLoggedInEmail
  );

  if (userIndexInSystemList !== -1) {
    // Check if new email is taken by ANOTHER user in the system list
    if (
      newEmail !== currentLoggedInEmail &&
      allSystemUsers.some(
        (u, i) => i !== userIndexInSystemList && u.email === newEmail
      )
    ) {
      accountUpdateStatus.textContent =
        "This email is already registered to another account.";
      accountUpdateStatus.classList.add("error");
      return;
    }
    allSystemUsers[userIndexInSystemList].name = newName;
    allSystemUsers[userIndexInSystemList].email = newEmail; // Update email in the system login list
    localStorage.setItem("finTrackUsers", JSON.stringify(allSystemUsers));
  } else {
    accountUpdateStatus.textContent =
      "Error: User not found in system list for update.";
    accountUpdateStatus.classList.add("error");
    return; // Critical error
  }

  // Now handle the user-specific data block in localStorage
  if (newEmail !== currentLoggedInEmail) {
    // Email has changed, so we need to "move" the user's data block
    const currentUserAllData = JSON.parse(
      localStorage.getItem(oldUserDataKey) || "{}"
    );
    currentUserAllData.profile = updatedProfileData; // Put the updated profile into the data

    localStorage.removeItem(oldUserDataKey); // Remove the old data block
    localStorage.setItem(newUserDataKey, JSON.stringify(currentUserAllData)); // Save under the new key

    // IMPORTANT: Update the logged-in user identifier
    localStorage.setItem("finTrackLoggedInUser", newEmail);
  } else {
    // Email is the same, just save the updated profile to the existing user data block
    saveUserProfile(updatedProfileData); // saveUserProfile from data.js saves to current user's block
  }

  updateSidebarUserDisplay(updatedProfileData);
  renderAccountPage(updatedProfileData);

  accountUpdateStatus.textContent = "Profile updated successfully!";
  accountUpdateStatus.classList.add("success");
  setTimeout(() => {
    accountUpdateStatus.textContent = "";
    accountUpdateStatus.classList.remove("success");
  }, 3000);

  uploadedAvatarDataUrl = null;
  document.getElementById("accountAvatarInput").value = "";
}

function refreshCategoryDependentUIData() {
  if (currentPage === "dashboard") {
    const transactions = getTransactions(); // Scoped
    const today = new Date();
    renderExpensesByCategory(
      transactions,
      today.getMonth(),
      today.getFullYear()
    );
  }
  if (currentPage === "budgets") {
    const budgets = getBudgets(); // Scoped
    renderBudgetsPage(budgets);
  }
}

function refreshCurrentPageContent() {
  const transactions = getTransactions(); // Scoped
  const userProfile = getUserProfile(); // Scoped
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
    renderExpensesByCategory(transactions, currentMonth, currentYear);
    updateCashFlowChart(transactions);
  } else if (currentPage === "analytics") {
    updateSpendingTrendsChart(transactions, currentMonth, currentYear);
  } else if (currentPage === "transactions") {
    renderTransactionsPage(transactions);
  } else if (currentPage === "budgets") {
    const budgets = getBudgets(); // Scoped
    renderBudgetsPage(budgets);
  } else if (currentPage === "goals") {
    const goals = getGoals(); // Scoped
    renderGoalsPage(goals);
  } else if (currentPage === "account") {
    renderAccountPage(userProfile); // Uses scoped userProfile
  } else if (currentPage === "categories") {
    renderCategoriesPage(); // Uses getAllCategories which is scoped
  }
}
