// js/data.js

// --- NEW Category Management ---
const USER_CATEGORIES_STORAGE_KEY = "userCategories";

const DEFAULT_CATEGORIES_DATA = [
  { name: "Food", type: "expense", iconKey: "Food", isDefault: true },
  { name: "Shopping", type: "expense", iconKey: "Shopping", isDefault: true },
  {
    name: "Transportation",
    type: "expense",
    iconKey: "Transportation",
    isDefault: true,
  },
  {
    name: "Entertainment",
    type: "expense",
    iconKey: "Entertainment",
    isDefault: true,
  },
  { name: "Utilities", type: "expense", iconKey: "Utilities", isDefault: true },
  {
    name: "Healthcare",
    type: "expense",
    iconKey: "Healthcare",
    isDefault: true,
  },
  { name: "Other", type: "expense", iconKey: "Other", isDefault: true }, // Default expense 'Other'
  { name: "Salary", type: "income", iconKey: "Salary", isDefault: true },
  { name: "Freelance", type: "income", iconKey: "Freelance", isDefault: true },
  {
    name: "Investment",
    type: "income",
    iconKey: "Investment",
    isDefault: true,
  }, // Assuming default Investment is income
  { name: "Other", type: "income", iconKey: "Other", isDefault: true }, // Default income 'Other'
];

const DEFAULT_BUDGETS = {
  // Monthly budgets for typical expense categories
  // These refer to the `name` property of default expense categories
  Food: 2000000, // IDR 2,000,000
  Shopping: 1000000, // IDR 1,000,000
  Transportation: 500000, // IDR 500,000
  Entertainment: 750000, // IDR 750,000
  Utilities: 800000, // IDR 800,000 (listrik, air, internet, dll.)
  Healthcare: 300000, // IDR 300,000
  Other: 500000, // IDR 500,000 for other expenses
};

// Define categories that are typically used for expense budgeting
// This is now a function: getExpenseCategoriesForBudgeting()

const ICONS = {
  Food: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
  Shopping: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  Transportation: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
  Entertainment: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`,
  Salary: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
  Utilities: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.09961C6.47715 2.09961 2 6.57676 2 12.0996C2 17.6225 6.47715 22.0996 12 22.0996C17.5228 22.0996 22 17.6225 22 12.0996C22 6.57676 17.5228 2.09961 12 2.09961Z"/><path d="M12 12.0996L12 5.09961"/><path d="M12 12.0996L16.9497 16.0494"/></svg>`, // Example icon
  Healthcare: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>`, // Example icon
  Freelance: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`, // Example icon
  Investment: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, // Example icon
  Other: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`, // Example icon
};

const GOAL_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L9 5H5v5l4 4-4 4v5h4l3 3 3-3h4v-5l-4-4 4-4V5h-4L12 2z"></path><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"></path></svg>`; // Trophy Icon

function getAllCategories() {
  const storedCategories = localStorage.getItem(USER_CATEGORIES_STORAGE_KEY);
  if (storedCategories) {
    return JSON.parse(storedCategories);
  }
  // Initialize with defaults if nothing is stored
  localStorage.setItem(
    USER_CATEGORIES_STORAGE_KEY,
    JSON.stringify(DEFAULT_CATEGORIES_DATA)
  );
  return [...DEFAULT_CATEGORIES_DATA];
}

function saveAllCategories(categories) {
  localStorage.setItem(USER_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
}

function addCategory(newCategory) {
  // newCategory = { name, type, iconKey (optional) }
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
    iconKey: newCategory.iconKey || "Other", // Default icon if not specified
    isDefault: false, // User-added categories are not default
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
    // This case should ideally be prevented by disabling delete button for default categories in UI
    alert(
      "Cannot delete default categories or category not found for deletion."
    );
    return false;
  }

  // Basic check (can be expanded to check transactions/budgets if strict deletion is needed)
  // For now, we allow deletion of unused custom categories.
  // A more robust check would iterate transactions and budgets.
  // const transactions = getTransactions();
  // const isUsed = transactions.some(t => t.category === categoryName && t.type === categoryType);
  // if (isUsed) {
  //   alert(`Category "${categoryName}" is in use and cannot be deleted.`);
  //   return false;
  // }

  categories.splice(categoryIndex, 1);
  saveAllCategories(categories);
  return true;
}

function getTransactions() {
  const transactions = localStorage.getItem("transactions");
  return transactions ? JSON.parse(transactions) : [];
}

function saveTransactions(transactions) {
  localStorage.setItem("transactions", JSON.stringify(transactions));
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
  let transactions = getTransactions();
  transactions = transactions.filter((tx) => tx.id !== id);
  saveTransactions(transactions);
}

// Budget Functions
function getBudgets() {
  const budgetsFromStorage = localStorage.getItem("budgets");
  // console.log("Budgets from localStorage:", budgetsFromStorage); // Log raw string - commented out for cleaner console
  if (budgetsFromStorage) {
    const parsedBudgets = JSON.parse(budgetsFromStorage);
    // console.log("Parsed budgets from localStorage:", parsedBudgets); // commented out
    return parsedBudgets;
  }
  // console.log("Falling back to DEFAULT_BUDGETS:", DEFAULT_BUDGETS); // commented out
  return { ...DEFAULT_BUDGETS }; // Return a copy of defaults
}

function saveBudgets(budgets) {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}
// Individual budget updates (add/edit/delete) will be handled by:
// 1. getBudgets()
// 2. Modify the returned object
// 3. saveBudgets(modifiedObject)

// User Profile Functions
const DEFAULT_USER_PROFILE = {
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: null, // Will store image as Base64 Data URL
};

function getUserProfile() {
  const profile = localStorage.getItem("userProfile");
  if (profile) {
    return JSON.parse(profile);
  }
  // If no profile, save and return default (ensures sidebar updates on first load too)
  saveUserProfile(DEFAULT_USER_PROFILE);
  return { ...DEFAULT_USER_PROFILE };
}

function saveUserProfile(profileData) {
  localStorage.setItem("userProfile", JSON.stringify(profileData));
}

// Goal Functions
function getGoals() {
  const goals = localStorage.getItem("goals");
  return goals ? JSON.parse(goals) : [];
}

function saveGoals(goals) {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function addGoal(goal) {
  const goals = getGoals();
  goals.push({ ...goal, id: Date.now().toString() });
  saveGoals(goals);
}

function updateGoal(id, updatedGoal) {
  let goals = getGoals();
  goals = goals.map((g) => (g.id === id ? { ...g, ...updatedGoal, id } : g));
  saveGoals(goals);
}

function deleteGoal(id) {
  let goals = getGoals();
  goals = goals.filter((g) => g.id !== id);
  saveGoals(goals);
}

// Update EXPENSE_CATEGORIES_FOR_BUDGETING to be dynamic
function getExpenseCategoriesForBudgeting() {
  const allCats = getAllCategories();
  return allCats.filter((cat) => cat.type === "expense").map((cat) => cat.name);
}

// --- Modify getCategoryIcon and getCategoryColorClass ---
function getCategoryIcon(categoryName, categoryType = null) {
  // categoryType might be needed if names can overlap
  const categories = getAllCategories();
  // Find the category to get its iconKey
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
  const iconKey = categoryData ? categoryData.iconKey : "Other"; // Use iconKey for class consistency

  const classNameBase = iconKey.replace(/\s+/g, ""); // Use iconKey for class name
  const definedIconKeys = Object.keys(ICONS); // Check against keys in ICONS

  if (definedIconKeys.includes(classNameBase)) {
    return `category-icon-${classNameBase}`;
  }
  return "category-icon-Other";
}
