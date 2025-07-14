// auth.js

// --- DOM Event Listeners (No changes in this part) ---
document.addEventListener("DOMContentLoaded", () => {
  // Check auth early for login/registration page redirection
  if (
    localStorage.getItem(CONFIG.AUTH_TOKEN_KEY) &&
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
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      await loginUser(email, password);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      await registerUser(name, email, password);
    });
  }

  const updateOnlineStatus = (online) => {
    document.querySelectorAll("#statusIndicator").forEach((indicator) => {
      const statusText = indicator.querySelector(".status-text");
      if (online) {
        indicator.classList.remove("offline");
        indicator.classList.add("online");
        if (statusText) statusText.textContent = "Online";
      } else {
        indicator.classList.remove("online");
        indicator.classList.add("offline");
        if (statusText) statusText.textContent = "Offline";
      }
    });
  };
  window.addEventListener("online", () => updateOnlineStatus(true));
  window.addEventListener("offline", () => updateOnlineStatus(false));
  updateOnlineStatus(navigator.onLine);
});

// --- Core Authentication Functions ---

async function registerUser(name, email, password) {
  const registerErrorMessage = document.getElementById("registerErrorMessage");
  registerErrorMessage.style.display = "none";

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

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.message || `HTTP error! status: ${response.status}`
      );
    }
    console.log("Registration successful! Logging in...");
    await loginUser(email, password);
  } catch (error) {
    console.error("Registration failed:", error);
    registerErrorMessage.textContent = error.message;
    registerErrorMessage.style.display = "block";
  }
}

async function loginUser(email, password) {
  const loginErrorMessage = document.getElementById("loginErrorMessage");
  loginErrorMessage.style.display = "none";

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        result.message || `HTTP error! status: ${response.status}`
      );
    }

    const responseData = result.data;

    localStorage.setItem(CONFIG.AUTH_TOKEN_KEY, responseData.token); // <-- USE responseData.token
    localStorage.setItem(CONFIG.LOGGED_IN_USER_KEY, responseData.user.email); // <-- USE responseData.user.email

    window.location.href = "index.html";
  } catch (error) {
    console.error("Login failed:", error);
    loginErrorMessage.textContent = error.message;
    loginErrorMessage.style.display = "block";
  }
}

// The rest of auth.js (logoutUser, checkAuth, getCurrentUserEmail) remains unchanged.
function logoutUser() {
  const userEmail = getCurrentUserEmail(); // from auth.js, but also used by data.js
  localStorage.removeItem(CONFIG.LOGGED_IN_USER_KEY);
  localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
  // No need to remove `userData_${userEmail}` key, as it's no longer used for core data.
  // The in-memory cache in data.js will be cleared implicitly by reload or next login.
  window.location.href = "loginregis.html";
}

function checkAuth() {
  const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
  const isLoginPage = window.location.pathname.includes("loginregis.html");
  if (!token && !isLoginPage) {
    window.location.href = "loginregis.html";
    return false;
  }
  if (token && isLoginPage) {
    window.location.href = "index.html";
    return true;
  }
  return !!token;
}

function getCurrentUserEmail() {
  return localStorage.getItem(CONFIG.LOGGED_IN_USER_KEY);
}
