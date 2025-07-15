// js/data.js

// --- Authentication & User Identification ---
function getCurrentUserEmail() {
  return localStorage.getItem(CONFIG.LOGGED_IN_USER_KEY);
}

// NEW: Helper to get the storage key for user data
function getDataStorageKey() {
  const email = getCurrentUserEmail();
  if (!email) return null;
  return `fintrack-data-${email}`;
}

// --- In-Memory Data Cache ---
let appData = {
  profile: { name: "Guest", email: "", avatar: null },
  categories: [],
  transactions: [],
  budgets: {},
  goals: [],
};

// NEW: Function to save the entire appData state to localStorage
function saveAllUserDataToLocal() {
  const key = getDataStorageKey();
  if (key) {
    localStorage.setItem(key, JSON.stringify(appData));
  }
}

// MODIFIED: Initialize or clear local appData cache by loading from localStorage first.
function initializeAppData() {
  const key = getDataStorageKey();
  const localData = key ? localStorage.getItem(key) : null;

  if (localData) {
    console.log("Loading data from localStorage.");
    appData = JSON.parse(localData);
  } else {
    console.log("Initializing with default data.");
    const userEmail = getCurrentUserEmail();
    appData = {
      profile: { name: "Loading...", email: userEmail || "", avatar: null },
      categories: [...DEFAULT_CATEGORIES_DATA],
      transactions: [],
      budgets: {},
      goals: [],
    };
  }
}

// MODIFIED: This function now also saves the synced data to localStorage
function setAllUserData(serverData) {
  appData.profile = { ...appData.profile, ...serverData.profile };
  appData.categories = serverData.categories || [...DEFAULT_CATEGORIES_DATA];
  appData.transactions = serverData.transactions || [];
  appData.budgets = serverData.budgets || {};
  appData.goals = serverData.goals || [];

  // After updating from server, save to localStorage to keep it as the source of truth
  saveAllUserDataToLocal();
}

// --- Sub-data 'Getters' and 'Mutators' (now API-driven and localStorage-backed) ---
// All mutators are now "optimistic": they update local data first, save to localStorage,
// and then attempt to sync with the server in the background without blocking the UI.

// -- Transactions --
function getTransactions() {
  return appData.transactions;
}

function addTransaction(transaction) {
  // Generate a local ID for immediate UI update. Server will provide the final ID.
  const newId = `local_${new Date().getTime()}`;
  const newTransaction = { ...transaction, id: newId, isSynced: false }; // Mark as not synced yet
  appData.transactions.push(newTransaction);
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch("/data/index.php?type=transaction", {
      method: "POST",
      body: JSON.stringify(transaction),
    })
      .then((response) => response.json())
      .then((serverResult) => {
        if (serverResult.success && serverResult.data) {
          // Replace local temporary transaction with server-provided one
          appData.transactions = appData.transactions.map((tx) =>
            tx.id === newId ? { ...serverResult.data, isSynced: true } : tx
          );
          saveAllUserDataToLocal(); // Save updated local data with server ID
        } else {
          console.error(
            "Server failed to add transaction, keeping local copy as unsynced:",
            serverResult.message
          );
          // Optionally, mark original local transaction as 'failed to sync'
        }
      })
      .catch((err) => {
        console.error("Background sync for addTransaction failed:", err);
        // Optionally, mark original local transaction as 'failed to sync'
      });
  } else {
    console.log("Offline: Transaction added locally. Will sync when online.");
  }
  return true;
}

function updateTransaction(id, updatedTransaction) {
  appData.transactions = appData.transactions.map(
    (tx) =>
      tx.id === id ? { ...tx, ...updatedTransaction, id, isSynced: false } : tx // Mark as not synced
  );
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch(`/data/index.php?type=transaction&id=${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedTransaction),
    })
      .then((response) => response.json())
      .then((serverResult) => {
        if (serverResult.success) {
          appData.transactions = appData.transactions.map((tx) =>
            tx.id === id ? { ...tx, isSynced: true } : tx
          );
          saveAllUserDataToLocal(); // Update sync status
        } else {
          console.error(
            "Server failed to update transaction, keeping local copy as unsynced:",
            serverResult.message
          );
        }
      })
      .catch((err) =>
        console.error("Background sync for updateTransaction failed:", err)
      );
  } else {
    console.log("Offline: Transaction updated locally. Will sync when online.");
  }
  return true;
}

function deleteTransaction(id) {
  appData.transactions = appData.transactions.filter((tx) => tx.id !== id);
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch(`/data/index.php?type=transaction&id=${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((serverResult) => {
        if (!serverResult.success) {
          console.error(
            "Server failed to delete transaction:",
            serverResult.message
          );
          // Optionally, re-add the transaction to appData if server deletion failed
        }
      })
      .catch((err) =>
        console.error("Background sync for deleteTransaction failed:", err)
      );
  } else {
    console.log("Offline: Transaction deleted locally. Will sync when online.");
  }
  return true;
}

// -- Categories --
const DEFAULT_CATEGORIES_DATA = [
  { name: "Food (expense)", type: "expense", iconKey: "Food", isDefault: true },
  {
    name: "Shopping (expense)",
    type: "expense",
    iconKey: "Shopping",
    isDefault: true,
  },
  {
    name: "Transportation (expense)",
    type: "expense",
    iconKey: "Transportation",
    isDefault: true,
  },
  {
    name: "Entertainment (expense)",
    type: "expense",
    iconKey: "Entertainment",
    isDefault: true,
  },
  {
    name: "Utilities (expense)",
    type: "expense",
    iconKey: "Utilities",
    isDefault: true,
  },
  {
    name: "Healthcare (expense)",
    type: "expense",
    iconKey: "Healthcare",
    isDefault: true,
  },
  {
    name: "Investment (expense)",
    type: "expense",
    iconKey: "Investment",
    isDefault: true,
  },
  {
    name: "Other (expense)",
    type: "expense",
    iconKey: "Other",
    isDefault: true,
  },
  {
    name: "Salary (income)",
    type: "income",
    iconKey: "Salary",
    isDefault: true,
  },
  {
    name: "Freelance (income)",
    type: "income",
    iconKey: "Freelance",
    isDefault: true,
  },
  {
    name: "Investment (income)",
    type: "income",
    iconKey: "Investment",
    isDefault: true,
  },
  { name: "Other (income)", type: "income", iconKey: "Other", isDefault: true },
];

function getAllCategories() {
  return appData.categories;
}

function addCategory(newCategory) {
  const existing = getAllCategories().find(
    (c) =>
      c.name.toLowerCase() === newCategory.name.toLowerCase() &&
      c.type === newCategory.type
  );
  if (existing) {
    alert(
      `Category "${newCategory.name}" already exists for ${newCategory.type}.`
    );
    return false;
  }
  const newId = `local_cat_${new Date().getTime()}`;
  const categoryWithLocalId = { ...newCategory, id: newId, isSynced: false }; // Add local ID and sync status
  appData.categories.push(categoryWithLocalId);
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch("/data/index.php?type=category", {
      method: "POST",
      body: JSON.stringify(newCategory),
    })
      .then((response) => response.json())
      .then((serverResult) => {
        if (serverResult.success && serverResult.data) {
          // Replace local temporary category with server-provided one
          appData.categories = appData.categories.map((cat) =>
            cat.id === newId ? { ...serverResult.data, isSynced: true } : cat
          );
          saveAllUserDataToLocal();
        } else {
          console.error(
            "Server failed to add category, keeping local copy as unsynced:",
            serverResult.message
          );
        }
      })
      .catch((err) =>
        console.error("Background sync for addCategory failed:", err)
      );
  } else {
    console.log("Offline: Category added locally. Will sync when online.");
  }
  return true;
}

function deleteCategory(categoryName, categoryType) {
  const categoryToDelete = getAllCategories().find(
    (c) => c.name === categoryName && c.type === categoryType
  );
  if (!categoryToDelete) {
    alert("Category not found.");
    return false;
  }
  if (categoryToDelete.isDefault) {
    alert("Cannot delete default categories.");
    return false;
  }

  appData.categories = appData.categories.filter(
    (c) => !(c.name === categoryName && c.type === categoryType)
  );
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    const url = `/data/index.php?type=category&name=${encodeURIComponent(
      categoryName
    )}&categoryType=${encodeURIComponent(categoryType)}`;
    apiFetch(url, { method: "DELETE" })
      .then((response) => response.json())
      .then((serverResult) => {
        if (!serverResult.success) {
          console.error(
            "Server failed to delete category:",
            serverResult.message
          );
          // Optionally, re-add the category to appData if server deletion failed
        }
      })
      .catch((err) =>
        console.error("Background sync for deleteCategory failed:", err)
      );
  } else {
    console.log("Offline: Category deleted locally. Will sync when online.");
  }
  return true;
}

// -- Budgets --
function getBudgets() {
  return appData.budgets;
}

function saveBudgets(budgets) {
  appData.budgets = budgets;
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch("/data/index.php?type=budget", {
      method: "PUT",
      body: JSON.stringify(budgets),
    })
      .then((response) => response.json())
      .then((serverResult) => {
        if (!serverResult.success) {
          console.error("Server failed to save budgets:", serverResult.message);
        }
      })
      .catch((err) =>
        console.error("Background sync for saveBudgets failed:", err)
      );
  } else {
    console.log("Offline: Budgets saved locally. Will sync when online.");
  }
  return true;
}

// -- Goals --
function getGoals() {
  return appData.goals;
}

function addGoal(goal) {
  const newId = `local_goal_${new Date().getTime()}`;
  const goalWithLocalId = { ...goal, id: newId, isSynced: false };
  appData.goals.push(goalWithLocalId);
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch("/data/index.php?type=goal", {
      method: "POST",
      body: JSON.stringify(goal),
    })
      .then((response) => response.json())
      .then((serverResult) => {
        if (serverResult.success && serverResult.data) {
          appData.goals = appData.goals.map((g) =>
            g.id === newId ? { ...serverResult.data, isSynced: true } : g
          );
          saveAllUserDataToLocal();
        } else {
          console.error(
            "Server failed to add goal, keeping local copy as unsynced:",
            serverResult.message
          );
        }
      })
      .catch((err) =>
        console.error("Background sync for addGoal failed:", err)
      );
  } else {
    console.log("Offline: Goal added locally. Will sync when online.");
  }
  return true;
}

function updateGoal(id, updatedGoal) {
  appData.goals = appData.goals.map((g) =>
    g.id === id ? { ...g, ...updatedGoal, id, isSynced: false } : g
  );
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch(`/data/index.php?type=goal&id=${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedGoal),
    })
      .then((response) => response.json())
      .then((serverResult) => {
        if (serverResult.success) {
          appData.goals = appData.goals.map((g) =>
            g.id === id ? { ...g, isSynced: true } : g
          );
          saveAllUserDataToLocal();
        } else {
          console.error(
            "Server failed to update goal, keeping local copy as unsynced:",
            serverResult.message
          );
        }
      })
      .catch((err) =>
        console.error("Background sync for updateGoal failed:", err)
      );
  } else {
    console.log("Offline: Goal updated locally. Will sync when online.");
  }
  return true;
}

function deleteGoal(id) {
  appData.goals = appData.goals.filter((g) => g.id !== id);
  saveAllUserDataToLocal();

  if (navigator.onLine) {
    apiFetch(`/data/index.php?type=goal&id=${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((serverResult) => {
        if (!serverResult.success) {
          console.error("Server failed to delete goal:", serverResult.message);
        }
      })
      .catch((err) =>
        console.error("Background sync for deleteGoal failed:", err)
      );
  } else {
    console.log("Offline: Goal deleted locally. Will sync when online.");
  }
  return true;
}

// -- User Profile -- (This remains async and blocking due to its sensitive nature)
function getUserProfile() {
  return appData.profile;
}

async function saveUserProfile(profileData) {
  if (!navigator.onLine) {
    alert("You must be online to update your profile.");
    return false;
  }
  try {
    const response = await apiFetch("/profile/index.php", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to update profile.");
    appData.profile = { ...appData.profile, ...result.data };
    saveAllUserDataToLocal();
    return true;
  } catch (error) {
    console.error("Save profile failed:", error);
    alert(`Failed to save profile: ${error.message}`);
    return false;
  }
}

// --- Helper functions for UI ---
const ICONS = {
  Food: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
  Shopping: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  Transportation: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
  Entertainment: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`,
  Salary: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
  Utilities: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.09961C6.47715 2.09961 2 6.57676 2 12.0996C2 17.6225 6.47715 22.0996 12 22.0996C17.5228 22.0996 22 17.6225 22 12.0996C22 6.57676 17.5228 2.09961 12 2.09961Z"/><path d="M12 12.0996L12 5.09961"/><path d="M12 12.0996L16.9497 16.0494"/></svg>`,
  Healthcare: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`,
  Freelance: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  Investment: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  Other: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const GOAL_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L9 5H5v5l4 4-4 4v5h4l3 3 3-3h4v-5l-4-4 4-4V5h-4L12 2z"></path><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"></path></svg>`;

function getExpenseCategoriesForBudgeting() {
  const allCats = getAllCategories();
  return allCats.filter((cat) => cat.type === "expense").map((cat) => cat.name);
}

function getCategoryIcon(categoryName, categoryType = null) {
  const categories = getAllCategories();
  const categoryData = categories.find(
    (c) =>
      c.name === categoryName && (categoryType ? c.type === categoryType : true)
  );
  const iconKey = categoryData ? categoryData.iconKey : "Other";
  return ICONS[iconKey] || ICONS["Other"];
}

function getCategoryColorClass(categoryName, categoryType = null) {
  const categories = getAllCategories();
  const categoryData = categories.find(
    (c) =>
      c.name === categoryName && (categoryType ? c.type === categoryType : true)
  );
  const iconKey = categoryData ? categoryData.iconKey : "Other";
  const classNameBase = iconKey.replace(/\s+/g, "");
  const definedIconKeys = Object.keys(ICONS);

  if (definedIconKeys.includes(classNameBase)) {
    return `category-icon-${classNameBase}`;
  }
  return "category-icon-Other";
}

// MODIFIED: This must be called at the end of the script, but before app.js needs it.
// We'll call it explicitly in app.js's DOMContentLoaded listener instead.
// initializeAppData(); // No longer called here directly
