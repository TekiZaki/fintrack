// auth.js

const USERS_STORAGE_KEY = "finTrackUsers";
const LOGGED_IN_USER_KEY = "finTrackLoggedInUser";

document.addEventListener("DOMContentLoaded", () => {
  if (
    localStorage.getItem(LOGGED_IN_USER_KEY) &&
    window.location.pathname.includes("loginregis.html")
  ) {
    window.location.href = "index.html";
    return;
  }

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegisterLink = document.getElementById("showRegister");
  const showLoginLink = document.getElementById("showLogin");
  const loginFormContainer = document.getElementById("loginFormContainer");
  const registerFormContainer = document.getElementById(
    "registerFormContainer"
  );
  const loginErrorMessage = document.getElementById("loginErrorMessage");
  const registerErrorMessage = document.getElementById("registerErrorMessage");

  if (showRegisterLink) {
    showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      loginFormContainer.style.display = "none";
      registerFormContainer.style.display = "block";
      if (loginErrorMessage) loginErrorMessage.style.display = "none";
      if (registerErrorMessage) registerErrorMessage.style.display = "none";
    });
  }

  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      registerFormContainer.style.display = "none";
      loginFormContainer.style.display = "block";
      if (loginErrorMessage) loginErrorMessage.style.display = "none";
      if (registerErrorMessage) registerErrorMessage.style.display = "none";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      loginUser(email, password);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      registerUser(name, email, password);
    });
  }
});

function getSystemUsers() {
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  return users ? JSON.parse(users) : [];
}

function saveSystemUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function registerUser(name, email, password) {
  const users = getSystemUsers();
  const registerErrorMessage = document.getElementById("registerErrorMessage");
  registerErrorMessage.style.display = "none";

  if (users.find((user) => user.email === email)) {
    registerErrorMessage.textContent = "User with this email already exists.";
    registerErrorMessage.style.display = "block";
    return;
  }
  if (!name || !email || !password) {
    registerErrorMessage.textContent = "All fields are required.";
    registerErrorMessage.style.display = "block";
    return;
  }
  if (password.length < 6) {
    registerErrorMessage.textContent =
      "Password must be at least 6 characters long.";
    registerErrorMessage.style.display = "block";
    return;
  }

  // WARNING: Storing plain text password. In a real app, HASH the password.
  users.push({ name, email, password });
  saveSystemUsers(users);

  localStorage.setItem(LOGGED_IN_USER_KEY, email);

  // Initialize user-specific data using functions from data.js
  // getAllUserData() will create and save default data if it doesn't exist.
  const initialUserData = getAllUserData(); // from data.js
  // Ensure the profile within this new user's data reflects their registration details
  if (initialUserData && initialUserData.profile) {
    initialUserData.profile.name = name;
    initialUserData.profile.email = email; // Should match the login email
    saveAllUserData(initialUserData); // from data.js
  } else {
    // This case should ideally not happen if getAllUserData initializes correctly
    console.error("Failed to initialize user profile data.");
  }

  window.location.href = "index.html";
}

function loginUser(email, password) {
  const users = getSystemUsers();
  const user = users.find((u) => u.email === email);
  const loginErrorMessage = document.getElementById("loginErrorMessage");
  loginErrorMessage.style.display = "none";

  // WARNING: Comparing plain text password.
  if (user && user.password === password) {
    localStorage.setItem(LOGGED_IN_USER_KEY, email);
    window.location.href = "index.html";
  } else {
    loginErrorMessage.textContent = "Invalid email or password.";
    loginErrorMessage.style.display = "block";
  }
}

function logoutUser() {
  localStorage.removeItem(LOGGED_IN_USER_KEY);
  window.location.href = "loginregis.html";
}

function checkAuth() {
  const loggedInUser = localStorage.getItem(LOGGED_IN_USER_KEY);
  const isLoginPage = window.location.pathname.includes("loginregis.html");

  if (!loggedInUser && !isLoginPage) {
    window.location.href = "loginregis.html";
    return false;
  }
  if (loggedInUser && isLoginPage) {
    window.location.href = "index.html";
    // This return true is a bit misleading as it causes a redirect.
    // The primary purpose is to gate access to index.html.
    return true;
  }
  return !!loggedInUser;
}

function getCurrentUserEmail() {
  return localStorage.getItem(LOGGED_IN_USER_KEY);
}
