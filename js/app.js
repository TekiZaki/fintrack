// js/app.js

// --- Globals & Configuration ---
let currentPage = "dashboard";
let isOnline = false;

// --- App Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) {
    // from auth.js
    return;
  }
  initApp();
});

function initApp() {
  setupOnlineStatusListeners();

  const userProfile = getUserProfile(); // from data.js
  if (userProfile && userProfile.email) {
    updateSidebarUserDisplay(userProfile); // from ui.js
  } else {
    console.error("User profile not found locally. Logging out.");
    logoutUser(); // from auth.js
    return;
  }

  setupEventListeners();
  showPage(currentPage);
  checkInitialOnlineStatus();
}

// --- Online/Offline & Synchronization Logic ---
function setupOnlineStatusListeners() {
  window.addEventListener("online", () => handleConnectionChange(true));
  window.addEventListener("offline", () => handleConnectionChange(false));
}

// MODIFIED: Streamlined initial check
async function checkInitialOnlineStatus() {
  updateOnlineStatusUI(navigator.onLine);
  if (navigator.onLine) {
    await syncWithServer();
  }
}

async function handleConnectionChange(online) {
  const justCameOnline = online && !isOnline;
  updateOnlineStatusUI(online);

  if (justCameOnline) {
    console.log("Connection restored. Triggering server sync.");
    await syncWithServer();
  }
}

function updateOnlineStatusUI(online) {
  isOnline = online;
  document.querySelectorAll("#statusIndicator").forEach((indicator) => {
    const statusText = indicator.querySelector(".status-text");
    if (online) {
      indicator.classList.remove("offline");
      indicator.classList.add("online");
      statusText.textContent = "Online";
    } else {
      indicator.classList.remove("online");
      indicator.classList.add("offline");
      statusText.textContent = "Offline";
    }
  });
}

async function syncWithServer() {
  if (!navigator.onLine) {
    // Use navigator.onLine as the primary check
    console.log("Offline. Skipping server sync.");
    updateOnlineStatusUI(false);
    return;
  }

  console.log("Attempting to sync with server...");
  try {
    const allLocalData = getAllUserData();

    // --- FIX STARTS HERE ---
    // Create a payload for syncing that EXCLUDES the large profile data.
    // The profile is synced separately via its own dedicated endpoint.
    const syncPayload = {
      categories: allLocalData.categories,
      transactions: allLocalData.transactions,
      budgets: allLocalData.budgets,
      goals: allLocalData.goals,
    };
    // --- FIX ENDS HERE ---

    // FIX: Corrected endpoint path and use the new, smaller payload
    const uploadResponse = await apiFetch("/data/sync.php", {
      method: "POST",
      body: JSON.stringify(syncPayload), // Use the smaller syncPayload
    });
    if (!uploadResponse.ok) throw new Error("Data upload failed.");
    console.log("Local data successfully pushed to server.");

    // The rest of the function remains the same, as the GET request should
    // still return the complete master data, including the correct profile.
    const downloadResponse = await apiFetch("/data/sync.php");
    if (!downloadResponse.ok) throw new Error("Data download failed.");
    const serverData = await downloadResponse.json();
    console.log("Master data successfully downloaded from server.");

    saveAllUserData(serverData);

    updateOnlineStatusUI(true);
    refreshAllUI();
    console.log("Sync complete. Local data is now up-to-date.");
  } catch (error) {
    console.error("Server sync failed:", error.message);
    if (error.message !== "Unauthorized") {
      updateOnlineStatusUI(false);
    }
  }
}

// --- API Helper ---
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Use CONFIG.API_BASE_URL which is ".../api"
  const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.error("API request unauthorized. Logging out.");
    logoutUser();
    throw new Error("Unauthorized");
  }

  return response;
}

// --- UI & Event Listener Setup ---
function refreshAllUI() {
  const userProfile = getUserProfile();
  updateSidebarUserDisplay(userProfile);
  refreshCurrentPageContent();
  initCharts();
}

function setupEventListeners() {
  setupNavigation();
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
  document
    .getElementById("accountForm")
    ?.addEventListener("submit", handleAccountFormSubmit);
  document
    .getElementById("accountAvatarInput")
    ?.addEventListener("change", handleAvatarPreview);
  document
    .getElementById("type")
    ?.addEventListener("change", (e) =>
      populateCategoryDropdown("category", e.target.value)
    );
  document.body.addEventListener("click", handleActionClicks);
  document.getElementById("logoutLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
  });
}

function handleActionClicks(event) {
  const target = event.target;
  const editTxBtn = target.closest(".btn-edit[data-id]");
  const deleteTxBtn = target.closest(".btn-danger[data-id]");
  if (editTxBtn) handleTransactionAction(editTxBtn.dataset.id, "edit");
  if (deleteTxBtn) handleTransactionAction(deleteTxBtn.dataset.id, "delete");
  const editBudgetBtn = target.closest(".edit-budget-btn");
  if (editBudgetBtn)
    handleBudgetAction(
      editBudgetBtn.dataset.category,
      "edit",
      parseFloat(editBudgetBtn.dataset.amount)
    );
  const deleteBudgetBtn = target.closest(".delete-budget-btn");
  if (deleteBudgetBtn)
    handleBudgetAction(deleteBudgetBtn.dataset.category, "delete");
  const editGoalBtn = target.closest(".edit-goal-btn");
  if (editGoalBtn) handleGoalAction(editGoalBtn.dataset.id, "edit");
  const deleteGoalBtn = target.closest(".delete-goal-btn");
  if (deleteGoalBtn) handleGoalAction(deleteGoalBtn.dataset.id, "delete");
  const deleteCategoryBtn = target.closest(".btn-delete-category");
  if (deleteCategoryBtn && !deleteCategoryBtn.disabled)
    handleCategoryAction(
      deleteCategoryBtn.dataset.name,
      deleteCategoryBtn.dataset.type,
      "delete"
    );
}

function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    if (link.id === "logoutLink") return;
    link.addEventListener("click", () => {
      const pageId = link.dataset.page;
      if (pageId && pageId !== currentPage) {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        showPage(pageId);
      }
    });
  });
}

function showPage(pageId) {
  document
    .querySelectorAll(".page-content")
    .forEach((p) => p.classList.remove("active-page"));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add("active-page");
    currentPage = pageId;
    document.getElementById("currentPageTitle").textContent = pageId;
    refreshCurrentPageContent();
  } else {
    showPage("dashboard");
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("transactionId").value;
  const formattedAmount = document.getElementById("amount").value;
  const unformattedAmount = formattedAmount.replace(/\./g, "");
  const transaction = {
    description: document.getElementById("description").value,
    amount: parseFloat(unformattedAmount),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };
  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    alert("Please enter a valid positive number for the amount.");
    return;
  }
  if (id) {
    updateTransaction(id, transaction);
  } else {
    addTransaction(transaction);
  }
  closeModal();
  refreshCurrentPageContent();
  await syncWithServer();
}

async function handleBudgetFormSubmit(event) {
  event.preventDefault();
  const category =
    document.getElementById("editingBudgetCategoryKey").value ||
    document.getElementById("budgetCategorySelect").value;
  const amount = parseFloat(
    document.getElementById("budgetAmountInput").value.replace(/\./g, "")
  );
  if (!category || isNaN(amount) || amount < 0) {
    alert("Please select a category and enter a valid, non-negative amount.");
    return;
  }
  const budgets = getBudgets();
  budgets[category] = amount;
  saveBudgets(budgets);
  closeBudgetModal();
  refreshCurrentPageContent();
  await syncWithServer();
}

async function handleGoalFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("goalIdInput").value;
  const goal = {
    name: document.getElementById("goalNameInput").value.trim(),
    targetAmount: parseFloat(
      document.getElementById("goalTargetAmountInput").value.replace(/\./g, "")
    ),
    currentAmount: parseFloat(
      document.getElementById("goalCurrentAmountInput").value.replace(/\./g, "")
    ),
    targetDate: document.getElementById("goalTargetDateInput").value || null,
  };
  if (!goal.name || isNaN(goal.targetAmount) || goal.targetAmount <= 0) {
    alert("Please enter a goal name and a valid positive target amount.");
    return;
  }
  if (id) {
    updateGoal(id, goal);
  } else {
    addGoal(goal);
  }
  closeGoalModal();
  refreshCurrentPageContent();
  await syncWithServer();
}

async function handleCategoryFormSubmit(event) {
  event.preventDefault();
  const categoryName = document
    .getElementById("categoryNameInput")
    .value.trim();
  const categoryType = document.getElementById("categoryTypeSelect").value;
  if (!categoryName) {
    alert("Category name cannot be empty.");
    return;
  }
  if (addCategory({ name: categoryName, type: categoryType })) {
    closeCategoryModal();
    refreshCurrentPageContent();
    refreshCategoryDependentUIData();
    await syncWithServer();
  }
}

async function handleTransactionAction(id, action) {
  if (action === "edit") {
    const tx = getTransactions().find((t) => t.id === id);
    if (tx) openModal(tx);
  } else if (action === "delete") {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(id);
      refreshCurrentPageContent();
      await syncWithServer();
    }
  }
}

async function handleBudgetAction(category, action, amount = null) {
  if (action === "edit") {
    openBudgetModal(category, amount);
  } else if (action === "delete") {
    if (
      confirm(`Are you sure you want to delete the budget for "${category}"?`)
    ) {
      const budgets = getBudgets();
      delete budgets[category];
      saveBudgets(budgets);
      refreshCurrentPageContent();
      await syncWithServer();
    }
  }
}

async function handleGoalAction(id, action) {
  if (action === "edit") {
    const goal = getGoals().find((g) => g.id === id);
    if (goal) openGoalModal(goal);
  } else if (action === "delete") {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteGoal(id);
      refreshCurrentPageContent();
      await syncWithServer();
    }
  }
}

async function handleCategoryAction(name, type, action) {
  if (action === "delete") {
    if (
      confirm(`Are you sure you want to delete category "${name} (${type})"?`)
    ) {
      if (deleteCategory(name, type)) {
        refreshCurrentPageContent();
        refreshCategoryDependentUIData();
        await syncWithServer();
      }
    }
  }
}

async function handleAccountFormSubmit(event) {
  event.preventDefault();
  const statusEl = document.getElementById("accountUpdateStatus");
  statusEl.textContent = "";
  statusEl.className = "form-status-message"; // Reset classes

  if (!isOnline) {
    statusEl.textContent = "You must be online to update your profile.";
    statusEl.classList.add("error");
    return;
  }
  const name = document.getElementById("accountNameInput").value.trim();
  const email = document.getElementById("accountEmailInput").value.trim();
  const currentEmail = getCurrentUserEmail();
  const profileUpdate = { name, email };
  if (uploadedAvatarDataUrl) {
    profileUpdate.avatar = uploadedAvatarDataUrl;
  }
  try {
    // FIX: Corrected endpoint path
    const response = await apiFetch("/profile/index.php", {
      method: "POST",
      body: JSON.stringify(profileUpdate),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to update.");
    const userProfile = getUserProfile();
    userProfile.name = name;
    userProfile.email = email;
    if (profileUpdate.avatar) {
      userProfile.avatar = profileUpdate.avatar;
    }
    saveUserProfile(userProfile);
    statusEl.textContent = "Profile updated successfully!";
    statusEl.classList.add("success");
    if (email !== currentEmail) {
      alert(
        "Your email has been updated. Please log in again with your new email address."
      );
      logoutUser();
    } else {
      refreshAllUI();
    }
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.classList.add("error");
  } finally {
    uploadedAvatarDataUrl = null;
    document.getElementById("accountAvatarInput").value = "";
  }
}

function refreshCategoryDependentUIData() {
  if (currentPage === "dashboard") {
    const today = new Date();
    renderExpensesByCategory(
      getTransactions(),
      today.getMonth(),
      today.getFullYear()
    );
  }
  if (currentPage === "budgets") {
    renderBudgetsPage(getBudgets());
  }
}

function refreshCurrentPageContent() {
  const transactions = getTransactions();
  const userProfile = getUserProfile();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  document.getElementById("dateRangeBtn").innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${today.toLocaleString("default", { month: "long" })} ${currentYear}
    `;
  switch (currentPage) {
    case "dashboard":
      updateDashboardSummaries(transactions, currentMonth, currentYear);
      renderExpensesByCategory(transactions, currentMonth, currentYear);
      updateCashFlowChart(transactions);
      break;
    case "analytics":
      updateSpendingTrendsChart(transactions, currentMonth, currentYear);
      break;
    case "transactions":
      renderTransactionsPage(transactions);
      break;
    case "budgets":
      renderBudgetsPage(getBudgets());
      break;
    case "goals":
      renderGoalsPage(getGoals());
      break;
    case "account":
      renderAccountPage(userProfile);
      break;
    case "categories":
      renderCategoriesPage();
      break;
  }
  initCharts();
}
