// js/data.js

// --- Authentication & User Identification ---
function getCurrentUserEmail() {
  // Uses the shared CONFIG from config.js
  const email = localStorage.getItem(CONFIG.LOGGED_IN_USER_KEY);
  if (!email) {
    console.warn(
      "User not logged in. Cannot determine user for data operations."
    );
  }
  return email;
}

// --- Core User-Scoped Data Storage (Local Cache) ---
function getUserDataKey() {
  const email = getCurrentUserEmail();
  return email ? `userData_${email}` : null;
}

function getAllUserData() {
  const dataKey = getUserDataKey();
  if (!dataKey) {
    console.warn("Attempted to get user data without a logged-in user key.");
    return getDefaultUserDataStructure(true); // isTemporary = true
  }

  const rawData = localStorage.getItem(dataKey);
  if (rawData) {
    try {
      return JSON.parse(rawData);
    } catch (e) {
      console.error("Error parsing user data from localStorage:", e);
      const defaultData = getDefaultUserDataStructure();
      saveAllUserData(defaultData);
      return defaultData;
    }
  }

  console.log(`No local data for ${dataKey}, initializing with defaults.`);
  const defaultData = getDefaultUserDataStructure();
  saveAllUserData(defaultData);
  return defaultData;
}

function saveAllUserData(userData) {
  const dataKey = getUserDataKey();
  if (!dataKey) {
    console.error("CRITICAL: Attempted to save user data without a user key.");
    return;
  }
  localStorage.setItem(dataKey, JSON.stringify(userData));
}

function getDefaultUserDataStructure(isTemporary = false) {
  const userEmail = getCurrentUserEmail();
  return {
    profile: {
      name: isTemporary ? "Guest" : "New User",
      email: userEmail || (isTemporary ? "" : "user@example.com"),
      avatar: null,
    },
    categories: [...DEFAULT_CATEGORIES_DATA],
    transactions: [],
    budgets: { ...DEFAULT_BUDGETS },
    goals: [],
  };
}

// --- Sub-data 'Getters' and 'Savers' ---
// All the specific getter/setter functions (getTransactions, saveTransactions, etc.)
// remain exactly the same as before and do not need to be changed.
// -- Transactions --
function getTransactions() {
  return getAllUserData().transactions || [];
}
function saveTransactions(transactions) {
  const userData = getAllUserData();
  userData.transactions = transactions;
  saveAllUserData(userData);
}
function addTransaction(transaction) {
  const transactions = getTransactions();
  transactions.push({ ...transaction, id: Date.now().toString() });
  saveTransactions(transactions);
}
function updateTransaction(id, updatedTransaction) {
  let transactions = getTransactions();
  transactions = transactions.map((tx) =>
    tx.id === id ? { ...tx, ...updatedTransaction, id } : tx
  );
  saveTransactions(transactions);
}
function deleteTransaction(id) {
  let transactions = getTransactions().filter((tx) => tx.id !== id);
  saveTransactions(transactions);
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
  return getAllUserData().categories || [];
}
function saveAllCategories(categories) {
  const userData = getAllUserData();
  userData.categories = categories;
  saveAllUserData(userData);
}
function addCategory(newCategory) {
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
  categories.push({
    name: newCategory.name,
    type: newCategory.type,
    iconKey: newCategory.iconKey || "Other",
    isDefault: false,
  });
  saveAllCategories(categories);
  return true;
}
function deleteCategory(categoryName, categoryType) {
  let categories = getAllCategories();
  const categoryIndex = categories.findIndex(
    (c) => c.name === categoryName && c.type === categoryType && !c.isDefault
  );
  if (categoryIndex === -1) {
    alert("Cannot delete default categories or category not found.");
    return false;
  }
  categories.splice(categoryIndex, 1);
  saveAllCategories(categories);
  return true;
}

// -- Budgets --
const DEFAULT_BUDGETS = {
  "Entertainment (expense)": 750000,
  "Food (expense)": 2000000,
  "Healthcare (expense)": 300000,
  "Shopping (expense)": 1000000,
  "Transportation (expense)": 500000,
  "Utilities (expense)": 800000,
  "Other (expense)": 500000,
};
function getBudgets() {
  return getAllUserData().budgets || {};
}
function saveBudgets(budgets) {
  const userData = getAllUserData();
  userData.budgets = budgets;
  saveAllUserData(userData);
}

// -- Goals --
function getGoals() {
  return getAllUserData().goals || [];
}
function saveGoals(goals) {
  const userData = getAllUserData();
  userData.goals = goals;
  saveAllUserData(userData);
}
function addGoal(goal) {
  const goals = getGoals();
  goals.push({ ...goal, id: Date.now().toString() });
  saveGoals(goals);
}
function updateGoal(id, updatedGoal) {
  let goals = getGoals().map((g) =>
    g.id === id ? { ...g, ...updatedGoal, id } : g
  );
  saveGoals(goals);
}
function deleteGoal(id) {
  let goals = getGoals().filter((g) => g.id !== id);
  saveGoals(goals);
}

// -- User Profile --
function getUserProfile() {
  const profile = getAllUserData().profile || {};
  if (!profile.email) {
    profile.email = getCurrentUserEmail();
  }
  return profile;
}
function saveUserProfile(profileData) {
  const userData = getAllUserData();
  userData.profile = profileData;
  saveAllUserData(userData);
}

// --- Helper functions for UI (no changes needed) ---
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
