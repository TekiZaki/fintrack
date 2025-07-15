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
  // Initialize data from localStorage first for offline access
  initializeAppData(); // from data.js
  initApp();
});

async function initApp() {
  setupOnlineStatusListeners();
  updateSidebarUserDisplay(getUserProfile()); // Initial display from local/cached profile

  setupEventListeners();
  showPage(currentPage); // Shows the page content with locally stored data
  await checkInitialOnlineStatus(); // Then, check connection and attempt sync
}

// --- Online/Offline & Synchronization Logic ---
function setupOnlineStatusListeners() {
  window.addEventListener("online", () => handleConnectionChange(true));
  window.addEventListener("offline", () => handleConnectionChange(false));
}

async function checkInitialOnlineStatus() {
  updateOnlineStatusUI(navigator.onLine);
  if (navigator.onLine) {
    await syncData(); // Sync with server on startup if online
  }
}

async function handleConnectionChange(online) {
  const justCameOnline = online && !isOnline;
  updateOnlineStatusUI(online);

  if (justCameOnline) {
    console.log("Connection restored. Triggering server sync.");
    await syncData(); // Sync all data from server
  }
}

function updateOnlineStatusUI(online) {
  isOnline = online;
  const logoutLink = document.getElementById("logoutLink");

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

  // NEW: Disable logout when offline
  if (logoutLink) {
    if (online) {
      logoutLink.classList.remove("disabled");
      logoutLink.title = "Logout";
    } else {
      logoutLink.classList.add("disabled");
      logoutLink.title = "You must be online to log out.";
    }
  }
}

// RENAMED & MODIFIED: from syncWithServer to syncData
async function syncData() {
  if (!navigator.onLine) {
    console.log("Offline. Skipping server sync.");
    updateOnlineStatusUI(false);
    return;
  }

  console.log("Attempting to sync data with server...");
  try {
    // Step 1: UPLOAD local changes first (Last Write Wins)
    // This assumes a server endpoint that accepts and merges the entire data object.
    const localDataKey = getDataStorageKey();
    const localData = localDataKey
      ? JSON.parse(localStorage.getItem(localDataKey))
      : null;
    if (localData) {
      console.log("Uploading local state...");
      // NOTE: This assumes you will create this endpoint on your server.
      // For a full implementation, you'd send only unsynced changes or a full snapshot
      // depending on your backend's merging strategy.
      // The current data.js optimistic updates mark items as isSynced: false.
      // A more robust sync would filter these and send them individually or in batches.
      await apiFetch("/data/index.php?type=sync_upload", {
        method: "POST",
        body: JSON.stringify(localData), // Sending the whole data object
      });
    }

    // Step 2: DOWNLOAD the master/merged data from the server
    console.log("Downloading master data from server...");
    const downloadResponse = await apiFetch("/data/index.php?type=all");
    if (!downloadResponse.ok) throw new Error("Data download failed.");
    const serverData = await downloadResponse.json();

    // Step 3: Update local cache and save to localStorage
    setAllUserData(serverData.data); // From data.js, sets cache and saves to localStorage

    updateOnlineStatusUI(true);
    refreshAllUI();
    console.log("Sync complete. Local data is now up-to-date with server.");
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
  updateSidebarUserDisplay(getUserProfile()); // from ui.js
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
  // MODIFIED: Logout listener
  document.getElementById("logoutLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (e.currentTarget.classList.contains("disabled")) {
      alert("Logout is disabled while you are offline.");
      return;
    }
    if (confirm("Are you sure you want to log out?")) {
      logoutUser();
    }
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
  const sidebar = document.querySelector(".sidebar"); // Get the sidebar element

  navLinks.forEach((link) => {
    if (link.id === "logoutLink") return;
    link.addEventListener("click", () => {
      const pageId = link.dataset.page;
      if (pageId && pageId !== currentPage) {
        navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
        showPage(pageId);
        // Close the sidebar if it's open (for mobile view)
        if (sidebar && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
        }
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
    document.getElementById("currentPageTitle").textContent =
      pageId.charAt(0).toUpperCase() + pageId.slice(1); // Capitalize
    refreshCurrentPageContent(); // Ensure current page content is fresh
  } else {
    showPage("dashboard"); // Fallback to dashboard
  }
}

// --- Form & Action Handlers (made optimistic) ---

function handleFormSubmit(event) {
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

  const success = id
    ? updateTransaction(id, transaction)
    : addTransaction(transaction); // Call data.js functions

  if (success) {
    closeModal();
    refreshCurrentPageContent(); // Refresh UI from local data immediately
    if (isOnline) syncData(); // Sync in background to get server IDs etc.
  }
}

function handleBudgetFormSubmit(event) {
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
  let currentBudgets = getBudgets(); // Get from local appData cache
  const updatedBudgets = { ...currentBudgets, [category]: amount };

  const success = saveBudgets(updatedBudgets); // Call data.js function

  if (success) {
    closeBudgetModal();
    refreshCurrentPageContent();
    if (isOnline) syncData();
  }
}

function handleGoalFormSubmit(event) {
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

  const success = id ? updateGoal(id, goal) : addGoal(goal); // Call data.js functions

  if (success) {
    closeGoalModal();
    refreshCurrentPageContent();
    if (isOnline) syncData();
  }
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

  const success = addCategory({
    name: categoryName,
    type: categoryType,
    iconKey: "Other",
    isDefault: false,
  }); // Call data.js function

  if (success) {
    closeCategoryModal();
    refreshCurrentPageContent();
    if (isOnline) syncData();
  }
}

function handleTransactionAction(id, action) {
  if (action === "edit") {
    const tx = getTransactions().find((t) => t.id === id);
    if (tx) openModal(tx);
  } else if (action === "delete") {
    if (confirm("Are you sure you want to delete this transaction?")) {
      if (deleteTransaction(id)) {
        // Call data.js function
        refreshCurrentPageContent();
        if (isOnline) syncData();
      }
    }
  }
}

function handleBudgetAction(category, action, amount = null) {
  if (action === "edit") {
    openBudgetModal(category, amount);
  } else if (action === "delete") {
    if (
      confirm(`Are you sure you want to delete the budget for "${category}"?`)
    ) {
      const budgets = getBudgets();
      delete budgets[category];
      if (saveBudgets(budgets)) {
        // Call data.js function
        refreshCurrentPageContent();
        if (isOnline) syncData();
      }
    }
  }
}

function handleGoalAction(id, action) {
  if (action === "edit") {
    const goal = getGoals().find((g) => g.id === id);
    if (goal) openGoalModal(goal);
  } else if (action === "delete") {
    if (confirm("Are you sure you want to delete this goal?")) {
      if (deleteGoal(id)) {
        // Call data.js function
        refreshCurrentPageContent();
        if (isOnline) syncData();
      }
    }
  }
}

function handleCategoryAction(name, type, action) {
  if (action === "delete") {
    if (
      confirm(`Are you sure you want to delete category "${name} (${type})"?`)
    ) {
      if (deleteCategory(name, type)) {
        // Call data.js function
        refreshCurrentPageContent();
        if (isOnline) syncData();
      }
    }
  }
}

// NOTE: handleAccountFormSubmit remains async because saveUserProfile is a blocking call.
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
  const currentEmail = getCurrentUserEmail(); // from auth.js / data.js
  const profileUpdate = { name, email };
  if (uploadedAvatarDataUrl) {
    profileUpdate.avatar = uploadedAvatarDataUrl; // Base64 data
  }
  try {
    const success = await saveUserProfile(profileUpdate); // from data.js
    if (!success) throw new Error("Failed to update profile."); // saveUserProfile now returns true/false
    statusEl.textContent = "Profile updated successfully!";
    statusEl.classList.add("success");
    if (email !== currentEmail) {
      alert(
        "Your email has been updated. Please log in again with your new email address."
      );
      logoutUser(); // from auth.js
    } else {
      // Sync from server to ensure latest profile data (especially avatar URL) is reflected
      await syncData(); // Renamed from syncWithServer
    }
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.classList.add("error");
  } finally {
    uploadedAvatarDataUrl = null;
    document.getElementById("accountAvatarInput").value = "";
  }
}

// --- Page Content & Rendering ---
function refreshCategoryDependentUIData() {
  if (currentPage === "dashboard") {
    const today = new Date();
    renderExpensesByCategory(
      getTransactions(), // from data.js
      today.getMonth(),
      today.getFullYear()
    );
  }
  if (currentPage === "budgets") {
    renderBudgetsPage(getBudgets()); // from data.js
  }
}

function refreshCurrentPageContent() {
  const transactions = getTransactions(); // from data.js
  const userProfile = getUserProfile(); // from data.js
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
      renderBudgetsPage(getBudgets()); // from data.js
      break;
    case "goals":
      renderGoalsPage(getGoals()); // from data.js
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
