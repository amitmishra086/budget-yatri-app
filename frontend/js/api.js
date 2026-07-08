/* ==========================================================================
   API Helper — all backend calls go through here.
   Change API_BASE_URL when you deploy the backend somewhere.
   ========================================================================== */
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "https://budget-yatri-app.onrender.com";

const Api = {
  getToken() {
    return localStorage.getItem("by_token");
  },

  setToken(token) {
    localStorage.setItem("by_token", token);
  },

  clearToken() {
    localStorage.removeItem("by_token");
    localStorage.removeItem("by_user");
  },

  setUser(user) {
    localStorage.setItem("by_user", JSON.stringify(user));
  },

  getUser() {
    const raw = localStorage.getItem("by_user");
    return raw ? JSON.parse(raw) : null;
  },

  async request(path, { method = "GET", body = null, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error("Server se connect nahi ho paya. Check karo backend chal raha hai ya nahi.");
    }

    if (response.status === 204) return null;

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = (data && data.detail) ? data.detail : `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },

  // Auth
  signup(payload) {
    return this.request("/auth/signup", { method: "POST", body: payload, auth: false });
  },
  login(payload) {
    return this.request("/auth/login", { method: "POST", body: payload, auth: false });
  },

  // Trips
  createTrip(payload) {
    return this.request("/trips/", { method: "POST", body: payload });
  },
  listTrips() {
    return this.request("/trips/");
  },
  getTrip(id) {
    return this.request(`/trips/${id}`);
  },
  deleteTrip(id) {
    return this.request(`/trips/${id}`, { method: "DELETE" });
  },

  // Expenses
  addExpense(payload) {
    return this.request("/expenses/", { method: "POST", body: payload });
  },
  listExpenses(tripId) {
    return this.request(`/expenses/trip/${tripId}`);
  },
  budgetSummary(tripId) {
    return this.request(`/expenses/trip/${tripId}/summary`);
  },
  deleteExpense(id) {
    return this.request(`/expenses/${id}`, { method: "DELETE" });
  },

  // Chat
  sendChat(message) {
    return this.request("/chat/", { method: "POST", body: { message } });
  },
  chatHistory() {
    return this.request("/chat/history");
  },
};

function showToast(message, type = "default") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
