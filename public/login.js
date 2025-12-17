// API Base URL
const API_URL = "/api/users";

// DOM Elements
const tabBtns = document.querySelectorAll(".tab-btn");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const messageEl = document.getElementById("message");

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Update active tab
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Show corresponding form
    if (tab === "login") {
      loginForm.classList.add("active");
      signupForm.classList.remove("active");
    } else {
      signupForm.classList.add("active");
      loginForm.classList.remove("active");
    }

    // Clear message
    hideMessage();
  });
});

// Login form submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("login-name").value.trim();
  const password = document.getElementById("login-password").value;

  if (!name || !password) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || "Login failed", "error");
      return;
    }

    showMessage("Login successful! Redirecting...", "success");

    // Store user info (simple localStorage for demo)
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect to main page after a short delay
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("Login error:", error);
    showMessage("An error occurred. Please try again.", "error");
  }
});

// Signup form submission
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("signup-name").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;

  if (!name || !password || !confirm) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  if (password !== confirm) {
    showMessage("Passwords do not match", "error");
    return;
  }

  if (password.length < 4) {
    showMessage("Password must be at least 4 characters", "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || "Signup failed", "error");
      return;
    }

    showMessage("Account created! Logging you in...", "success");

    // Auto-login after signup
    const loginResponse = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok) {
      localStorage.setItem("user", JSON.stringify(loginData.user));
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } else {
      // Fallback: switch to login tab if auto-login fails
      setTimeout(() => {
        tabBtns[0].click();
        signupForm.reset();
      }, 1500);
    }
  } catch (error) {
    console.error("Signup error:", error);
    showMessage("An error occurred. Please try again.", "error");
  }
});

// Show message
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;
}

// Hide message
function hideMessage() {
  messageEl.className = "message";
}
