/* ==========================================================================
   Auth Screen Logic
   ========================================================================== */
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

const loginFormWrap = document.getElementById("login-form-wrap");
const signupFormWrap = document.getElementById("signup-form-wrap");

document.getElementById("show-signup").addEventListener("click", () => {
  loginFormWrap.classList.add("hidden");
  signupFormWrap.classList.remove("hidden");
});

document.getElementById("show-login").addEventListener("click", () => {
  signupFormWrap.classList.add("hidden");
  loginFormWrap.classList.remove("hidden");
});

function setButtonLoading(btn, isLoading, normalText) {
  btn.disabled = isLoading;
  btn.innerHTML = isLoading ? `<span class="loader"></span>` : normalText;
}

function showAuthError(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideAuthError(elId) {
  document.getElementById(elId).classList.add("hidden");
}

// ---- LOGIN ----
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthError("login-error");
  const btn = document.getElementById("login-btn");
  setButtonLoading(btn, true, "Log in");

  try {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const result = await Api.login({ email, password });
    Api.setToken(result.access_token);
    Api.setUser(result.user);
    enterApp();
  } catch (err) {
    showAuthError("login-error", err.message);
  } finally {
    setButtonLoading(btn, false, "Log in");
  }
});

// ---- SIGNUP ----
document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthError("signup-error");
  const btn = document.getElementById("signup-btn");
  setButtonLoading(btn, true, "Account banao");

  try {
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const result = await Api.signup({ name, email, password });
    Api.setToken(result.access_token);
    Api.setUser(result.user);
    enterApp();
  } catch (err) {
    showAuthError("signup-error", err.message);
  } finally {
    setButtonLoading(btn, false, "Account banao");
  }
});

function enterApp() {
  const user = Api.getUser();
  document.getElementById("sidebar-username").textContent = user?.name || "Traveller";
  document.getElementById("sidebar-email").textContent = user?.email || "";
  const avatarEl = document.getElementById("user-avatar");
  if (avatarEl && user?.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  if (typeof initAppData === "function") initAppData();
}

document.getElementById("logout-btn").addEventListener("click", () => {
  Api.clearToken();
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  document.getElementById("login-form").reset();
});

// Auto-login if token already exists
(function checkExistingSession() {
  if (Api.getToken() && Api.getUser()) {
    enterApp();
  }
})();
