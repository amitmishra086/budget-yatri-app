/* ==========================================================================
   Main App Logic
   ========================================================================== */
const pages = {
  home: document.getElementById("page-home"),
  planner: document.getElementById("page-planner"),
  trips: document.getElementById("page-trips"),
  "trip-detail": document.getElementById("page-trip-detail"),
  chat: document.getElementById("page-chat"),
};

function showPage(name) {
  Object.values(pages).forEach(p => p.classList.add("hidden"));
  pages[name].classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const navBtn = document.querySelector(`.nav-item[data-page="${name}"]`);
  if (navBtn) navBtn.classList.add("active");

  if (name === "trips") loadTripsList();
  if (name === "chat") loadChatHistory();
}

document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.querySelectorAll(".home-action-card[data-page]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.getElementById("back-to-trips").addEventListener("click", () => showPage("trips"));

function initAppData() {
  const user = Api.getUser();
  const greetingEl = document.getElementById("home-greeting");
  if (greetingEl && user?.name) {
    greetingEl.textContent = `Namaste, ${user.name}! 👋`;
  }
  showPage("home");
}

/* ==========================================================================
   TRIP PLANNER
   ========================================================================== */
document.getElementById("planner-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("planner-submit");
  const resultEl = document.getElementById("planner-result");

  const payload = {
    destination: document.getElementById("planner-destination").value.trim(),
    days: parseInt(document.getElementById("planner-days").value, 10),
    travelers: parseInt(document.getElementById("planner-travelers").value, 10),
    budget_total: parseFloat(document.getElementById("planner-budget").value),
    is_low_budget: document.getElementById("planner-lowbudget").checked,
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="loader"></span> Generating plan...`;
  resultEl.innerHTML = "";

  try {
    const trip = await Api.createTrip(payload);
    showToast("Trip plan ready! 🎉", "success");
    resultEl.innerHTML = renderItineraryCard(trip);
    document.getElementById("planner-form").reset();
    document.getElementById("planner-days").value = 3;
    document.getElementById("planner-travelers").value = 1;
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Generate trip plan";
  }
});

function renderItineraryCard(trip) {
  const itinerary = trip.itinerary_json ? JSON.parse(trip.itinerary_json) : null;
  if (!itinerary) {
    return `<div class="card"><p>Plan generate nahi ho paya. Phir try karo.</p></div>`;
  }

  const isTight = (itinerary.budget_status || "").includes("tight");
  const sourceBadge = itinerary.source === "claude_ai"
    ? `<span class="badge badge-ai">AI Powered</span>`
    : `<span class="badge badge-template">Demo Mode</span>`;

  const placesTags = (itinerary.must_visit_places || []).map(p => `<span class="tag">📍 ${escapeHtml(p)}</span>`).join("");
  const foodTags = (itinerary.must_try_food || []).map(f => `<span class="tag">🍽️ ${escapeHtml(f)}</span>`).join("");
  const hotelTags = (itinerary.budget_hotel_suggestions || []).map(h => `<span class="tag">🏨 ${escapeHtml(h)}</span>`).join("");

  const dayPlanHtml = (itinerary.day_wise_plan || []).map(d => `
    <div class="day-plan-item">
      <div class="day-num">${String(d.day).padStart(2, '0')}</div>
      <div class="day-plan-text">
        <strong>${escapeHtml(d.suggested_activity || "")}</strong>
        <span>🍴 Try: ${escapeHtml(d.food_suggestion || "")}</span>
      </div>
    </div>
  `).join("");

  return `
    <div class="card">
      <div class="itinerary-header">
        <div>
          <div class="itinerary-dest">${escapeHtml(itinerary.destination || trip.destination)}</div>
          <div class="itinerary-famous">${escapeHtml(itinerary.famous_for || "")}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${sourceBadge}
          <span class="badge ${isTight ? 'badge-tight' : 'badge-comfortable'}">
            ${isTight ? '⚠ Tight Budget' : '✓ Comfortable Budget'}
          </span>
        </div>
      </div>

      <div class="section-label">Must visit places</div>
      <div class="tag-row">${placesTags}</div>

      <div class="section-label">Must try food</div>
      <div class="tag-row">${foodTags}</div>

      <div class="section-label">Budget stay options</div>
      <div class="tag-row">${hotelTags}</div>

      <div class="section-label">Day-wise plan</div>
      <div>${dayPlanHtml}</div>

      <div class="tip-box">💡 <strong>Money saving tip:</strong> ${escapeHtml(itinerary.money_saving_tip || "")}</div>

      <div style="margin-top:20px; display:flex; gap:12px;">
        <button class="btn-primary" style="width:auto; padding:10px 20px;" onclick="openTripDetail(${trip.id})">
          ${trip.is_low_budget ? 'Track Budget for this Trip →' : 'View Trip →'}
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   MY TRIPS LIST
   ========================================================================== */
async function loadTripsList() {
  const listEl = document.getElementById("trips-list");
  listEl.innerHTML = `<div class="card"><p style="color:var(--color-ink-soft);">Loading...</p></div>`;

  try {
    const trips = await Api.listTrips();
    if (!trips.length) {
      listEl.innerHTML = `
        <div class="card empty-state">
          <div class="empty-state-icon">🧳</div>
          <strong>Koi trip plan nahi hai abhi</strong>
          <p style="margin-top:6px;">Trip Planner se naya plan banao!</p>
        </div>`;
      return;
    }

    listEl.innerHTML = trips.map(trip => `
      <div class="card trip-card" onclick="openTripDetail(${trip.id})">
        <div>
          <div class="trip-card-dest">${escapeHtml(trip.destination)}</div>
          <div class="trip-card-meta">${trip.days} days · ${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''} ${trip.is_low_budget ? '· 🎯 Budget tracked' : ''}</div>
        </div>
        <div class="trip-card-budget">₹${formatNum(trip.budget_total)}</div>
      </div>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${escapeHtml(err.message)}</p></div>`;
  }
}

/* ==========================================================================
   TRIP DETAIL + BUDGET TRACKER
   ========================================================================== */
let currentTripId = null;

async function openTripDetail(tripId) {
  currentTripId = tripId;
  showPage("trip-detail");
  const contentEl = document.getElementById("trip-detail-content");
  contentEl.innerHTML = `<div class="card"><p style="color:var(--color-ink-soft);">Loading...</p></div>`;

  try {
    const trip = await Api.getTrip(tripId);
    let html = renderItineraryCard(trip);

    if (trip.is_low_budget) {
      html += await renderBudgetTracker(tripId, trip);
    }

    contentEl.innerHTML = html;

    if (trip.is_low_budget) {
      attachExpenseFormHandler(tripId);
    }
  } catch (err) {
    contentEl.innerHTML = `<div class="card"><p style="color:var(--color-danger);">${escapeHtml(err.message)}</p></div>`;
  }
}

async function renderBudgetTracker(tripId, trip) {
  const [summary, expenses] = await Promise.all([
    Api.budgetSummary(tripId),
    Api.listExpenses(tripId),
  ]);

  const pct = Math.min(summary.percent_used, 100);
  const barClass = summary.is_over_budget ? "over" : (summary.percent_used > 75 ? "warn" : "");

  const categoryHtml = Object.entries(summary.by_category || {}).map(([cat, amt]) => `
    <div class="cat-bd-row"><span>${escapeHtml(cat)}</span><span>₹${formatNum(amt)}</span></div>
  `).join("") || `<p style="color:var(--color-ink-soft); font-size:0.85rem;">Abhi koi expense add nahi hua.</p>`;

  const expenseListHtml = expenses.map(exp => `
    <div class="expense-row">
      <div><span class="expense-cat-tag">${escapeHtml(exp.category)}</span>${escapeHtml(exp.note || "")}</div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="expense-amount">₹${formatNum(exp.amount)}</span>
        <button class="btn-delete-x" onclick="deleteExpenseRow(${exp.id}, ${tripId})">✕</button>
      </div>
    </div>
  `).join("") || `<p style="color:var(--color-ink-soft); font-size:0.85rem; padding:10px 0;">Koi expense nahi hai abhi.</p>`;

  return `
    <div class="card">
      <h3 style="margin-bottom:4px;">🎯 Budget Tracker</h3>
      <p style="color:var(--color-ink-soft); font-size:0.88rem; margin-bottom:6px;">Trip budget ka real-time hisaab.</p>

      <div class="budget-bar-track">
        <div class="budget-bar-fill ${barClass}" style="width:${pct}%;"></div>
      </div>
      <div class="budget-stats-row">
        <span>Spent: <strong>₹${formatNum(summary.total_spent)}</strong></span>
        <span>${summary.is_over_budget ? '⚠ Over by' : 'Remaining:'} <strong style="color:${summary.is_over_budget ? 'var(--color-danger)' : 'inherit'}">₹${formatNum(Math.abs(summary.remaining))}</strong></span>
        <span>Total: <strong>₹${formatNum(summary.budget_total)}</strong></span>
      </div>
      ${summary.is_over_budget ? `<p style="color:var(--color-danger); font-size:0.85rem; margin-top:8px;">⚠ Budget cross ho gaya hai! Agle expenses pe nazar rakho.</p>` : ''}

      <div class="section-label">Add expense</div>
      <form class="expense-form-row" id="expense-form">
        <select id="expense-category" required>
          <option value="">Category</option>
          <option value="transport">Transport</option>
          <option value="hotel">Hotel</option>
          <option value="food">Food</option>
          <option value="activities">Activities</option>
          <option value="misc">Misc</option>
        </select>
        <input type="number" id="expense-amount" placeholder="Amount (₹)" required min="1">
        <input type="text" id="expense-note" placeholder="Note (optional)">
        <button type="submit" class="btn-add-expense">+ Add</button>
      </form>

      <div class="section-label">Category breakdown</div>
      <div class="category-breakdown">${categoryHtml}</div>

      <div class="section-label">Recent expenses</div>
      <div class="expense-list" id="expense-list">${expenseListHtml}</div>
    </div>
  `;
}

function attachExpenseFormHandler(tripId) {
  const form = document.getElementById("expense-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    try {
      await Api.addExpense({
        trip_id: tripId,
        category: document.getElementById("expense-category").value,
        amount: parseFloat(document.getElementById("expense-amount").value),
        note: document.getElementById("expense-note").value.trim() || null,
      });
      showToast("Expense add ho gaya ✓", "success");
      openTripDetail(tripId); // refresh
    } catch (err) {
      showToast(err.message, "error");
      submitBtn.disabled = false;
    }
  });
}

async function deleteExpenseRow(expenseId, tripId) {
  try {
    await Api.deleteExpense(expenseId);
    showToast("Expense delete ho gaya", "success");
    openTripDetail(tripId);
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ==========================================================================
   CHAT
   ========================================================================== */
async function loadChatHistory() {
  const messagesEl = document.getElementById("chat-messages");
  try {
    const history = await Api.chatHistory();
    if (history.length === 0) return; // keep empty state

    document.getElementById("chat-empty-state")?.remove();
    messagesEl.innerHTML = history.map(m => chatBubbleHtml(m.role, m.content)).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } catch (err) {
    // silent fail - chat will just start fresh
  }
}

function chatBubbleHtml(role, content) {
  return `<div class="chat-bubble ${role === 'user' ? 'user' : 'assistant'}">${escapeHtml(content)}</div>`;
}

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (!message) return;
  await sendChatMessage(message);
});

document.querySelectorAll(".chat-suggestion-chip").forEach(chip => {
  chip.addEventListener("click", () => sendChatMessage(chip.textContent));
});

async function sendChatMessage(message) {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  const messagesEl = document.getElementById("chat-messages");

  document.getElementById("chat-empty-state")?.remove();

  messagesEl.insertAdjacentHTML("beforeend", chatBubbleHtml("user", message));
  input.value = "";
  sendBtn.disabled = true;

  const typingHtml = `<div class="typing-indicator" id="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  messagesEl.insertAdjacentHTML("beforeend", typingHtml);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const result = await Api.sendChat(message);
    document.getElementById("typing-indicator")?.remove();
    messagesEl.insertAdjacentHTML("beforeend", chatBubbleHtml("assistant", result.reply));
  } catch (err) {
    document.getElementById("typing-indicator")?.remove();
    messagesEl.insertAdjacentHTML("beforeend", chatBubbleHtml("assistant", `⚠ ${err.message}`));
  } finally {
    sendBtn.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

/* ==========================================================================
   Utils
   ========================================================================== */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function formatNum(num) {
  return Number(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/* ==========================================================================
   HOME PAGE — TRIP SUGGESTIONS (with live photos)
   ========================================================================== */
// Destinations shown as suggestion cards. wikiTitle is used to fetch a real
// photo from Wikipedia's free public API (no key needed). budgetHint is just
// a rough "starting from" figure shown on the card.
const TRIP_SUGGESTIONS = [
  { name: "Goa", wikiTitle: "Goa", tagline: "Beaches, nightlife & Portuguese vibes", budgetHint: "₹1,500/day" },
  { name: "Manali", wikiTitle: "Manali", tagline: "Snow mountains & adventure sports", budgetHint: "₹1,200/day" },
  { name: "Jaipur", wikiTitle: "Jaipur", tagline: "Forts, palaces & Rajasthani bazaars", budgetHint: "₹1,000/day" },
  { name: "Rishikesh", wikiTitle: "Rishikesh", tagline: "Yoga, rafting & Ganga Aarti", budgetHint: "₹900/day" },
  { name: "Hampi", wikiTitle: "Hampi", tagline: "Ancient ruins & boulder landscapes", budgetHint: "₹900/day" },
  { name: "Pondicherry", wikiTitle: "Puducherry", tagline: "French quarter & Auroville", budgetHint: "₹1,100/day" },
  { name: "Udaipur", wikiTitle: "Udaipur", tagline: "City of Lakes & royal palaces", budgetHint: "₹1,000/day" },
  { name: "Mcleodganj", wikiTitle: "McLeod Ganj", tagline: "Tibetan culture & Himalayan views", budgetHint: "₹800/day" },
];

let suggestionsLoaded = false;

async function loadTripSuggestions() {
  if (suggestionsLoaded) return; // only fetch once per session
  suggestionsLoaded = true;

  const grid = document.getElementById("suggestion-grid");
  if (!grid) return;

  // Render cards immediately with placeholder, then fill in photos as they arrive
  grid.innerHTML = TRIP_SUGGESTIONS.map((dest, i) => `
    <button class="suggestion-card" data-index="${i}">
      <div class="suggestion-card-img-wrap" id="sugg-img-${i}">
        <div class="suggestion-card-img-placeholder">🏞️</div>
        <span class="suggestion-card-budget-pill">from ${dest.budgetHint}</span>
      </div>
      <div class="suggestion-card-body">
        <div class="suggestion-card-name">${escapeHtml(dest.name)}</div>
        <div class="suggestion-card-desc">${escapeHtml(dest.tagline)}</div>
      </div>
    </button>
  `).join("");

  // Click handler -> prefill planner form and navigate there
  grid.querySelectorAll(".suggestion-card").forEach(card => {
    card.addEventListener("click", () => {
      const dest = TRIP_SUGGESTIONS[parseInt(card.dataset.index, 10)];
      document.getElementById("planner-destination").value = dest.name;
      showPage("planner");
      document.getElementById("planner-destination").focus();
    });
  });

  // Fetch real photos from Wikipedia's free public API (no key required)
  TRIP_SUGGESTIONS.forEach((dest, i) => fetchDestinationPhoto(dest, i));
}

async function fetchDestinationPhoto(dest, index) {
  const wrap = document.getElementById(`sugg-img-${index}`);
  if (!wrap) return;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(dest.wikiTitle)}`
    );
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    const imgUrl = data?.thumbnail?.source || data?.originalimage?.source;

    if (imgUrl) {
      // Request a slightly larger version for crisper cards where possible
      const betterUrl = imgUrl.replace(/\/\d+px-/, "/500px-");
      const img = new Image();
      img.onload = () => {
        wrap.innerHTML = `<img src="${betterUrl}" alt="${escapeHtml(dest.name)}" loading="lazy">
          <span class="suggestion-card-budget-pill">from ${dest.budgetHint}</span>`;
      };
      img.onerror = () => {
        // betterUrl failed (rare) - fall back to the original thumbnail size
        wrap.innerHTML = `<img src="${imgUrl}" alt="${escapeHtml(dest.name)}" loading="lazy">
          <span class="suggestion-card-budget-pill">from ${dest.budgetHint}</span>`;
      };
      img.src = betterUrl;
    }
  } catch (err) {
    // Silent fail - placeholder icon stays, card is still fully usable
  }
}

// Hook into navigation: load suggestions the first time Home is shown
const _originalShowPage = showPage;
showPage = function (name) {
  _originalShowPage(name);
  if (name === "home") loadTripSuggestions();
};

