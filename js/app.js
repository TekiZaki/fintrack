// js/app.js

let currentPage = "dashboard"; // Default page

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  const userProfile = getUserProfile(); // Get profile early
  updateSidebarUserDisplay(userProfile); // Update sidebar immediately

  populateCategoryDropdown(); // For the transaction modal
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
    ?.addEventListener("submit", function (event) {
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
      // Get the formatted amount string from the input
      const formattedAmountString =
        document.getElementById("budgetAmountInput").value;
      // Remove thousand separators (dots for IDR) before parsing
      const unformattedAmountString = formattedAmountString.replace(/\./g, "");

      const amount = parseFloat(unformattedAmountString);
      const editingCategory = document.getElementById(
        "editingBudgetCategoryKey"
      ).value;

      const budgets = getBudgets();
      let categoryToUpdate;

      if (editingCategory) {
        // We are in edit mode (category field was disabled)
        categoryToUpdate = editingCategory;
      } else {
        // We are in add mode
        categoryToUpdate = selectedCategoryInDropdown;
        // Check if budget for this category already exists when adding a NEW budget
        if (budgets.hasOwnProperty(categoryToUpdate)) {
          if (
            !confirm(
              `A budget for "${categoryToUpdate}" already exists with an amount of ${formatCurrency(
                budgets[categoryToUpdate]
              )}. Do you want to overwrite it with ${formatCurrency(amount)}?`
            )
          ) {
            return; // User cancelled
          }
        }
      }

      if (!categoryToUpdate) {
        alert("Category not selected or identified. Please select a category.");
        return;
      }
      if (isNaN(amount) || amount < 0) {
        alert("Please enter a valid, non-negative amount for the budget.");
        return;
      }

      budgets[categoryToUpdate] = amount;
      saveBudgets(budgets);
      closeBudgetModal();
      refreshCurrentPageContent(); // Refresh the budgets page (or whichever page is active)
    });

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
        openBudgetModal(category, parseFloat(amount));
      } else if (btnDelete) {
        const category = btnDelete.dataset.category;
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

function handleTransactionAction(transactionId, actionType) {
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
  } else if (currentPage === "account") {
    renderAccountPage(userProfile); // Use userProfile here
  }
  // ... (other pages) ...
}
