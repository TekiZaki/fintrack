// js/data.js

// --- Authentication & User Identification ---
// This function relies on auth.js setting the LOGGED_IN_USER_KEY
function getCurrentUserEmail() {
  return localStorage.getItem(CONFIG.LOGGED_IN_USER_KEY);
}

// --- In-Memory Data Cache ---
// This will hold the "current" state of user data fetched from the server.
// It's initialized with defaults but intended to be populated by syncWithServer.
let appData = {
  profile: { name: "Guest", email: "", avatar: null },
  categories: [],
  transactions: [],
  budgets: {},
  goals: [],
};

// --- Core Data Management (Interacting with API) ---

// Initialize or clear local appData cache
function initializeAppData() {
  const userEmail = getCurrentUserEmail();
  appData = {
    profile: {
      name: "Loading...",
      email: userEmail || "",
      avatar: null,
    },
    categories: [...DEFAULT_CATEGORIES_DATA], // Default categories always available
    transactions: [],
    budgets: {},
    goals: [],
  };
}

// This function will be called by app.js's syncWithServer
function setAllUserData(serverData) {
  // Merge server data with local defaults, prioritizing server data if available
  // Profile is a special case, handled by its own endpoint, but we can update
  // name/email if server provides it. Avatar URL is the key.
  appData.profile = {
    ...appData.profile, // Keep existing if server doesn't provide
    ...serverData.profile,
  };
  appData.categories = serverData.categories || [...DEFAULT_CATEGORIES_DATA];
  appData.transactions = serverData.transactions || [];
  appData.budgets = serverData.budgets || {};
  appData.goals = serverData.goals || [];
}

// --- Sub-data 'Getters' and 'Mutators' (now API-driven) ---
// All these functions will now interact with the backend via `apiFetch`
// and update the local `appData` cache.
// `apiFetch` is defined in `app.js` and handles token authorization.

// -- Transactions --
function getTransactions() {
  return appData.transactions;
}
async function addTransaction(transaction) {
  try {
    const response = await apiFetch("/data/index.php?type=transaction", {
      method: "POST",
      body: JSON.stringify(transaction),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to add transaction.");
    // Update local cache with server's new data (optional, but good for consistency)
    appData.transactions.push(result.data); // Assuming server returns the added item with an ID
    return true;
  } catch (error) {
    console.error("Add transaction failed:", error);
    alert(`Failed to add transaction: ${error.message}`);
    return false;
  }
}
async function updateTransaction(id, updatedTransaction) {
  try {
    const response = await apiFetch(
      `/data/index.php?type=transaction&id=${id}`,
      {
        method: "PUT",
        body: JSON.stringify(updatedTransaction),
      }
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to update transaction.");
    // Update local cache
    appData.transactions = appData.transactions.map((tx) =>
      tx.id === id ? { ...tx, ...updatedTransaction, id } : tx
    );
    return true;
  } catch (error) {
    console.error("Update transaction failed:", error);
    alert(`Failed to update transaction: ${error.message}`);
    return false;
  }
}
async function deleteTransaction(id) {
  try {
    const response = await apiFetch(
      `/data/index.php?type=transaction&id=${id}`,
      {
        method: "DELETE",
      }
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to delete transaction.");
    // Update local cache
    appData.transactions = appData.transactions.filter((tx) => tx.id !== id);
    return true;
  } catch (error) {
    console.error("Delete transaction failed:", error);
    alert(`Failed to delete transaction: ${error.message}`);
    return false;
  }
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
  // Returns from cache; `syncWithServer` keeps this updated
  return appData.categories;
}

// Categories don't have update function as they are just names/types
async function addCategory(newCategory) {
  try {
    const categories = getAllCategories();
    const existing = categories.find(
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

    const response = await apiFetch("/data/index.php?type=category", {
      method: "POST",
      body: JSON.stringify(newCategory), // Send name, type, iconKey
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to add category.");

    appData.categories.push(result.data); // Assuming server returns the added category
    return true;
  } catch (error) {
    console.error("Add category failed:", error);
    alert(`Failed to add category: ${error.message}`);
    return false;
  }
}
async function deleteCategory(categoryName, categoryType) {
  try {
    const categories = getAllCategories();
    const categoryToDelete = categories.find(
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

    const response = await apiFetch(
      `/data/index.php?type=category&name=${encodeURIComponent(
        categoryName
      )}&categoryType=${encodeURIComponent(categoryType)}`,
      {
        method: "DELETE",
      }
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to delete category.");

    appData.categories = appData.categories.filter(
      (c) => !(c.name === categoryName && c.type === categoryType)
    );
    return true;
  } catch (error) {
    console.error("Delete category failed:", error);
    alert(`Failed to delete category: ${error.message}`);
    return false;
  }
}

// -- Budgets --
// Default budgets are examples only; user's budgets are driven by DB
const DEFAULT_BUDGETS = {
  // These are now just examples for initial setup if no server data exists.
  // Actual budgets will come from the server or be set by the user.
};

function getBudgets() {
  return appData.budgets;
}
async function saveBudgets(budgets) {
  // This function is for saving the *entire* budget object to the server.
  // It effectively 'replaces' the server's budgets for the user.
  // The UI currently allows setting/updating one budget at a time, so this
  // function should be called with the updated `appData.budgets` object.
  try {
    const response = await apiFetch("/data/index.php?type=budget", {
      method: "PUT", // Or POST if you want to create/overwrite
      body: JSON.stringify(budgets), // Send the whole budgets object
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to save budgets.");
    appData.budgets = budgets; // Update local cache
    return true;
  } catch (error) {
    console.error("Save budgets failed:", error);
    alert(`Failed to save budgets: ${error.message}`);
    return false;
  }
}
// Note: Individual budget add/update/delete logic is handled by `saveBudgets`
// on the client-side which then sends the whole object.
// The server-side will handle individual budget category updates/deletes.

// -- Goals --
function getGoals() {
  return appData.goals;
}
async function addGoal(goal) {
  try {
    const response = await apiFetch("/data/index.php?type=goal", {
      method: "POST",
      body: JSON.stringify(goal),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to add goal.");
    appData.goals.push(result.data); // Assuming server returns the added item with an ID
    return true;
  } catch (error) {
    console.error("Add goal failed:", error);
    alert(`Failed to add goal: ${error.message}`);
    return false;
  }
}
async function updateGoal(id, updatedGoal) {
  try {
    const response = await apiFetch(`/data/index.php?type=goal&id=${id}`, {
      method: "PUT",
      body: JSON.stringify(updatedGoal),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to update goal.");
    appData.goals = appData.goals.map((g) =>
      g.id === id ? { ...g, ...updatedGoal, id } : g
    );
    return true;
  } catch (error) {
    console.error("Update goal failed:", error);
    alert(`Failed to update goal: ${error.message}`);
    return false;
  }
}
async function deleteGoal(id) {
  try {
    const response = await apiFetch(`/data/index.php?type=goal&id=${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to delete goal.");
    appData.goals = appData.goals.filter((g) => g.id !== id);
    return true;
  } catch (error) {
    console.error("Delete goal failed:", error);
    alert(`Failed to delete goal: ${error.message}`);
    return false;
  }
}

// -- User Profile --
function getUserProfile() {
  // Returns from cache; `syncWithServer` or direct `saveUserProfile` keeps this updated
  return appData.profile;
}
async function saveUserProfile(profileData) {
  try {
    // profileData might contain the raw base64 avatar image
    const response = await apiFetch("/profile/index.php", {
      method: "POST", // POST for update/upload, as it might include file data
      body: JSON.stringify(profileData),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Failed to update profile.");

    // Update local cache with the returned data (especially for avatar_url)
    appData.profile = { ...appData.profile, ...result.data };
    return true;
  } catch (error) {
    console.error("Save profile failed:", error);
    alert(`Failed to save profile: ${error.message}`);
    return false;
  }
}

// --- Helper functions for UI (no changes needed for their logic, but they now use appData) ---
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

// Initial setup of appData when script loads (before DOMContentLoaded)
initializeAppData();
