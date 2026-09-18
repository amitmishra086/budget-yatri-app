/* ==========================================================================
   Main App Logic
   ========================================================================== */
const pages = {
  home: document.getElementById("page-home"),
  planner: document.getElementById("page-planner"),
  trips: document.getElementById("page-trips"),
  "trip-detail": document.getElementById("page-trip-detail"),
  chat: document.getElementById("page-chat"),
  saved: document.getElementById("page-saved"),
};

function showPage(name) {
  Object.values(pages).forEach(p => p && p.classList.add("hidden"));
  pages[name].classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const navBtn = document.querySelector(`.nav-item[data-page="${name}"]`);
  if (navBtn) navBtn.classList.add("active");

  if (name === "trips") loadTripsList();
  if (name === "chat") loadChatHistory();
  if (name === "saved") loadSavedPage();
}

document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.querySelectorAll(".quick-card[data-page]").forEach(btn => {
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
    <div class="card itinerary-card">
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

      <div class="per-day-budget-chip">₹${formatNum(itinerary.per_day_budget || 0)} <span>/ day estimated</span></div>

      <div class="section-label">Must visit places</div>
      <div class="tag-row">${placesTags}</div>

      <div class="section-label">Must try food</div>
      <div class="tag-row">${foodTags}</div>

      <div class="section-label">Budget stay options</div>
      <div class="tag-row">${hotelTags}</div>

      <div class="section-label">Day-wise plan</div>
      <div>${dayPlanHtml}</div>

      <div class="tip-box">💡 <strong>Money saving tip:</strong> ${escapeHtml(itinerary.money_saving_tip || "")}</div>

      <div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap;">
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

    html += renderPackingChecklistShell(trip);

    contentEl.innerHTML = html;

    if (trip.is_low_budget) {
      attachExpenseFormHandler(tripId);
    }
    attachPackingChecklist(trip);
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
// a rough "starting from" figure shown on the card. category drives the
// filter chips and the packing-checklist logic below.
const CATEGORY_META = {
  beach: { label: "🏖️ Beach", },
  mountain: { label: "🏔️ Mountain" },
  heritage: { label: "🏰 Heritage" },
  spiritual: { label: "🕉️ Spiritual" },
  nature: { label: "🌿 Nature" },
  backwaters: { label: "🛶 Backwaters" },
  hillstation: { label: "⛰️ Hill Station" },
};

const TRIP_SUGGESTIONS = [
  { name: "Goa", wikiTitle: "Goa", tagline: "Beaches, nightlife & Portuguese vibes", budgetHint: "₹1,500/day", category: "beach" },
  { name: "Manali", wikiTitle: "Manali", tagline: "Snow mountains & adventure sports", budgetHint: "₹1,200/day", category: "mountain" },
  { name: "Jaipur", wikiTitle: "Jaipur", tagline: "Forts, palaces & Rajasthani bazaars", budgetHint: "₹1,000/day", category: "heritage" },
  { name: "Rishikesh", wikiTitle: "Rishikesh", tagline: "Yoga, rafting & Ganga Aarti", budgetHint: "₹900/day", category: "spiritual" },
  { name: "Hampi", wikiTitle: "Hampi", tagline: "Ancient ruins & boulder landscapes", budgetHint: "₹800/day", category: "heritage" },
  { name: "Pondicherry", wikiTitle: "Puducherry", tagline: "French quarter & Auroville", budgetHint: "₹1,100/day", category: "beach" },
  { name: "Udaipur", wikiTitle: "Udaipur", tagline: "City of Lakes & royal palaces", budgetHint: "₹1,300/day", category: "heritage" },
  { name: "Mcleodganj", wikiTitle: "McLeod Ganj", tagline: "Tibetan culture & Himalayan views", budgetHint: "₹900/day", category: "mountain" },
  { name: "Varanasi", wikiTitle: "Varanasi", tagline: "Ganga Aarti & ancient ghats", budgetHint: "₹700/day", category: "spiritual" },
  { name: "Coorg", wikiTitle: "Kodagu", tagline: "Coffee estates & misty hills", budgetHint: "₹1,400/day", category: "nature" },
  { name: "Spiti Valley", wikiTitle: "Spiti Valley", tagline: "Cold desert & high monasteries", budgetHint: "₹1,000/day", category: "mountain" },
  { name: "Munnar", wikiTitle: "Munnar", tagline: "Endless tea gardens & cool air", budgetHint: "₹1,200/day", category: "nature" },
  { name: "Leh-Ladakh", wikiTitle: "Leh", tagline: "Pangong Lake & mountain passes", budgetHint: "₹1,500/day", category: "mountain" },
  { name: "Alleppey", wikiTitle: "Alappuzha", tagline: "Kerala backwaters & houseboats", budgetHint: "₹1,300/day", category: "backwaters" },
  { name: "Amritsar", wikiTitle: "Amritsar", tagline: "Golden Temple & Wagah Border", budgetHint: "₹700/day", category: "spiritual" },
  { name: "Gokarna", wikiTitle: "Gokarna", tagline: "Quiet beaches & cliffside treks", budgetHint: "₹900/day", category: "beach" },
];

let suggestionsLoaded = false;
let activeCategory = "all";
let activeSearch = "";

/* ---------------- Wishlist (localStorage-backed, per-browser) ---------------- */
const WISHLIST_KEY = "yatri_wishlist";

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function isWishlisted(name) {
  return getWishlist().includes(name);
}

function toggleWishlist(name) {
  let list = getWishlist();
  if (list.includes(name)) {
    list = list.filter(n => n !== name);
  } else {
    list.push(name);
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  return list.includes(name);
}

const _photoCache = {}; // dest.name -> resolved image URL, so we never re-fetch

function suggestionCardHtml(dest, keyPrefix) {
  const catMeta = CATEGORY_META[dest.category];
  const saved = isWishlisted(dest.name);
  const cachedImg = _photoCache[dest.name];
  const imgInner = cachedImg
    ? `<img src="${cachedImg}" alt="${escapeHtml(dest.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
    : `<div class="suggestion-card-placeholder">🏞️</div>`;

  return `
    <div class="suggestion-card" data-dest="${escapeHtml(dest.name)}">
      <button class="wishlist-heart ${saved ? 'active' : ''}" data-dest="${escapeHtml(dest.name)}" aria-label="Save to wishlist" title="Save to wishlist">${saved ? '❤️' : '🤍'}</button>
      <div class="suggestion-card-img-wrap" id="${keyPrefix}-img-${escapeHtml(dest.name).replace(/\s+/g, '_')}">${imgInner}</div>
      <div class="suggestion-card-overlay"></div>
      <div class="suggestion-card-body">
        ${catMeta ? `<span class="suggestion-card-cat">${catMeta.label}</span>` : ""}
        <div class="suggestion-card-name">${escapeHtml(dest.name)}</div>
        <span class="suggestion-card-budget">from ${dest.budgetHint}</span>
      </div>
    </div>`;
}

function buildGrid(gridEl, destList, keyPrefix, emptyHtml) {
  if (!gridEl) return;

  if (!destList.length) {
    gridEl.innerHTML = emptyHtml || `<div class="card empty-state"><div class="empty-state-icon">🔍</div><strong>Kuch nahi mila</strong></div>`;
    return;
  }

  gridEl.innerHTML = destList.map(dest => suggestionCardHtml(dest, keyPrefix)).join("");

  // Card click (but not the heart button) -> prefill planner and navigate
  gridEl.querySelectorAll(".suggestion-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".wishlist-heart")) return;
      const dest = TRIP_SUGGESTIONS.find(d => d.name === card.dataset.dest);
      if (!dest) return;
      document.getElementById("planner-destination").value = dest.name;
      showPage("planner");
      document.getElementById("planner-destination").focus();
    });
  });

  // Wishlist heart toggle
  gridEl.querySelectorAll(".wishlist-heart").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = btn.dataset.dest;
      const nowSaved = toggleWishlist(name);
      btn.classList.toggle("active", nowSaved);
      btn.textContent = nowSaved ? "❤️" : "🤍";
      showToast(nowSaved ? `${name} wishlist mein add ho gaya ❤️` : `${name} wishlist se hata diya`, "success");
      if (document.getElementById("page-saved") && !document.getElementById("page-saved").classList.contains("hidden")) {
        loadSavedPage();
      }
    });
  });

  // Fetch real photos from Wikipedia's free public API (no key required)
  destList.forEach(dest => {
    if (_photoCache[dest.name]) return; // already have it
    fetchDestinationPhoto(dest, keyPrefix);
  });
}

function applyHomeFilters() {
  const grid = document.getElementById("suggestion-grid");
  if (!grid) return;
  const filtered = TRIP_SUGGESTIONS.filter(d => {
    const matchesCat = activeCategory === "all" || d.category === activeCategory;
    const matchesSearch = !activeSearch || d.name.toLowerCase().includes(activeSearch) || (d.tagline || "").toLowerCase().includes(activeSearch);
    return matchesCat && matchesSearch;
  });
  buildGrid(grid, filtered, "sugg", `<div class="card empty-state"><div class="empty-state-icon">🔍</div><strong>Koi destination nahi mila</strong><p style="margin-top:6px;">Search ya filter change karke try karo.</p></div>`);
}

function loadTripSuggestions() {
  const grid = document.getElementById("suggestion-grid");
  if (!grid) return;

  if (!suggestionsLoaded) {
    suggestionsLoaded = true;

    // Category filter chips
    const chipsWrap = document.getElementById("category-chips");
    if (chipsWrap) {
      chipsWrap.addEventListener("click", (e) => {
        const chip = e.target.closest(".cat-chip");
        if (!chip) return;
        chipsWrap.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeCategory = chip.dataset.category;
        applyHomeFilters();
      });
    }

    // Search box
    const searchInput = document.getElementById("dest-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        activeSearch = searchInput.value.trim().toLowerCase();
        applyHomeFilters();
      });
    }
  }

  applyHomeFilters();
}

async function fetchDestinationPhoto(dest, keyPrefix) {
  const id = `${keyPrefix}-img-${dest.name.replace(/\s+/g, '_')}`;

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(dest.wikiTitle)}`
    );
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    const imgUrl = data?.thumbnail?.source || data?.originalimage?.source;

    if (imgUrl) {
      const betterUrl = imgUrl.replace(/\/\d+px-/, "/500px-");
      const img = new Image();
      img.onload = () => {
        _photoCache[dest.name] = betterUrl;
        const wrap = document.getElementById(id);
        if (wrap) wrap.innerHTML = `<img src="${betterUrl}" alt="${escapeHtml(dest.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
      };
      img.onerror = () => {
        _photoCache[dest.name] = imgUrl;
        const wrap = document.getElementById(id);
        if (wrap) wrap.innerHTML = `<img src="${imgUrl}" alt="${escapeHtml(dest.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
      };
      img.src = betterUrl;
    }
  } catch (err) {
    // Silent fail - placeholder icon stays, card is still fully usable
  }
}

/* ==========================================================================
   SAVED / WISHLIST PAGE
   ========================================================================== */
function loadSavedPage() {
  const grid = document.getElementById("saved-grid");
  if (!grid) return;
  const saved = getWishlist();
  const destList = TRIP_SUGGESTIONS.filter(d => saved.includes(d.name));
  buildGrid(grid, destList, "saved", `
    <div class="card empty-state">
      <div class="empty-state-icon">🤍</div>
      <strong>Abhi kuch bhi saved nahi hai</strong>
      <p style="margin-top:6px;">Home page pe destinations ke ❤️ icon pe click karke wishlist banao.</p>
    </div>`);
}

/* ==========================================================================
   PACKING CHECKLIST (trip detail page)
   ========================================================================== */
const PACKING_BASE_ITEMS = ["ID proof (Aadhaar/DL)", "Phone charger & power bank", "Cash + UPI apps ready", "Basic first-aid & medicines", "Reusable water bottle"];

const PACKING_CATEGORY_ITEMS = {
  beach: ["Sunscreen (SPF 50+)", "Flip-flops", "Swimwear", "Light cotton clothes", "Sunglasses"],
  mountain: ["Warm jacket", "Trekking shoes", "Thermal wear", "Cap/beanie", "Lip balm (cold, dry air)"],
  heritage: ["Comfortable walking shoes", "Modest clothing for temples/forts", "Camera", "Cap/hat for sun"],
  spiritual: ["Modest clothing", "Shawl/stole for temple visits", "Comfortable slip-on footwear"],
  nature: ["Trekking shoes", "Insect repellent", "Light rain jacket", "Binoculars"],
  backwaters: ["Light cotton clothes", "Sunscreen", "Motion sickness tablets", "Waterproof phone pouch"],
  hillstation: ["Light woollens", "Comfortable shoes", "Umbrella / raincoat"],
  default: ["Weather-appropriate clothes", "Daypack for sightseeing"],
};

function detectCategory(destinationName) {
  const name = (destinationName || "").toLowerCase();
  const match = TRIP_SUGGESTIONS.find(d => name.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(name));
  return match ? match.category : "default";
}

function renderPackingChecklistShell(trip) {
  return `
    <div class="card packing-card">
      <h3 class="packing-title">🎒 Packing Checklist</h3>
      <p class="packing-sub">${escapeHtml(trip.destination)} ke liye suggested items — check off jo pack kar liya.</p>
      <div class="packing-list" id="packing-list-${trip.id}"></div>
    </div>`;
}

function attachPackingChecklist(trip) {
  const listEl = document.getElementById(`packing-list-${trip.id}`);
  if (!listEl) return;

  const category = detectCategory(trip.destination);
  const items = [...PACKING_BASE_ITEMS, ...(PACKING_CATEGORY_ITEMS[category] || PACKING_CATEGORY_ITEMS.default)];
  const storageKey = `yatri_packing_${trip.id}`;
  let checked = {};
  try { checked = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (e) { checked = {}; }

  listEl.innerHTML = items.map((item, i) => `
    <label class="packing-item">
      <input type="checkbox" data-idx="${i}" ${checked[i] ? "checked" : ""}>
      <span>${escapeHtml(item)}</span>
    </label>
  `).join("");

  listEl.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      checked[cb.dataset.idx] = cb.checked;
      localStorage.setItem(storageKey, JSON.stringify(checked));
    });
  });
}

// Hook into navigation: load suggestions the first time Home is shown
const _originalShowPage = showPage;
showPage = function (name) {
  _originalShowPage(name);
  if (name === "home") loadTripSuggestions();
};
