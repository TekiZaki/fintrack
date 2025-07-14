// js/config.js

// This file contains shared configuration for the entire application.
// It should be loaded before any other script files.

const CONFIG = {
  // IMPORTANT: Update this to your actual server path where fintrack-api/api is located
  API_BASE_URL: "https://tekizaki.my.id/fintrack/fintrack-api/api",

  // Local Storage Keys
  AUTH_TOKEN_KEY: "finTrackToken", // The key for the JWT
  LOGGED_IN_USER_KEY: "finTrackLoggedInUser", // The key for the user's email
};
