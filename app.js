// Simple state + mock data for Pocketly demo

// Point frontend to the Express backend (change if you use a different PORT)
const API_BASE = "http://127.0.0.1:5050";

const sections = ["overview", "snap", "goals", "budget", "split", "insights"];

let authToken = null;
let currentUser = null;
let activitySeed = [
  { icon: "☕", label: "Café Latte", category: "Food • Coffee", amount: 140, time: "10:12 AM" },
  { icon: "🚌", label: "Bus Pass", category: "Commute", amount: 450, time: "9:03 AM" },
  { icon: "🍕", label: "Hostel Pizza Night", category: "Food • Split", amount: 220, time: "11:26 PM" },
  { icon: "🎬", label: "Movie Tickets", category: "Fun", amount: 360, time: "Sat • 8:00 PM" },
];

const goalsSeed = [
  { name: "Goa Trip", saved: 6000, total: 10000, emoji: "🏖️" },
  { name: "Noise Cancelling Headphones", saved: 2500, total: 5000, emoji: "🎧" },
  { name: "Birthday Party", saved: 1800, total: 3000, emoji: "🎉" },
  { name: "New Phone Fund", saved: 4200, total: 12000, emoji: "📱" },
];

// Split buddy state
const splitParticipants = new Set(["You"]);
const splitExpenses = [];

const byId = (id) => document.getElementById(id);

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data && data.error ? data.error : res.statusText;
    throw new Error(msg || "RequestFailed");
  }
  return data;
}

async function checkBackendHealth() {
  const authStatus = byId("authStatus");
  if (!authStatus) return;

  try {
    await apiRequest("/api/health", { method: "GET" });
    if (!authToken) {
      authStatus.textContent = "Backend online • Not logged in";
    }
  } catch {
    authStatus.textContent = "Backend offline";
  }
}

async function loginFlow() {
  const email = prompt("Enter email to log in (or sign up):", "student@example.com");
  if (!email) return;
  const password = prompt("Enter password:", "password123");
  if (!password) return;

  try {
    let data;
    try {
      data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      // fallback: auto-register if user doesn't exist
      data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name: "Student" }),
      });
    }

    authToken = data.token;
    currentUser = data.user;
    updateAuthUI();
    await refreshFromBackend();
  } catch (err) {
    alert(`Login failed: ${err.message}`);
  }
}

function updateAuthUI() {
  const authStatus = byId("authStatus");
  const userNameLabel = byId("userNameLabel");
  const loginBtn = byId("loginBtn");

  if (!authStatus || !userNameLabel || !loginBtn) return;

  if (currentUser && authToken) {
    authStatus.textContent = `Connected as ${currentUser.email}`;
    userNameLabel.textContent = currentUser.name || "Student";
    loginBtn.textContent = "Refresh data";
  } else {
    authStatus.textContent = "Not connected";
    userNameLabel.textContent = "Student";
    loginBtn.textContent = "Log in";
  }
}

async function refreshFromBackend() {
  if (!authToken) return;

  try {
    const [txRes] = await Promise.all([
      apiRequest("/api/transactions?limit=5"),
      // categories are fetched but not yet wired into UI; kept for future use
      // apiRequest("/api/categories"),
    ]);

    const list = Array.isArray(txRes.transactions) ? txRes.transactions : [];
    if (list.length) {
      activitySeed = list.map((t) => ({
        icon: t.type === "income" ? "💰" : "💸",
        label: t.note || (t.type === "income" ? "Income" : "Expense"),
        category: t.type === "income" ? "Income" : "Expense",
        amount: t.amount,
        time: new Date(t.occurredAt || t.createdAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
      renderActivity();
    }
  } catch {
    // ignore for now; stays in mock mode
  }
}

function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;

      // Toggle active state
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Toggle sections
      sections.forEach((section) => {
        const el = byId(`${section}-section`);
        if (el) {
          el.classList.toggle("hidden", section !== target);
        }
      });
    });
  });

  // support "view all" jump from overview
  document.querySelectorAll("[data-section-jump]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = chip.getAttribute("data-section-jump");
      const btn = document.querySelector(`.nav-item[data-section="${target}"]`);
      if (btn) btn.click();
    });
  });
}

function renderActivity() {
  const list = byId("activityList");
  if (!list) return;

  list.innerHTML = "";
  activitySeed.forEach((item) => {
    const li = document.createElement("li");
    li.className = "activity-item";
    li.innerHTML = `
      <div class="activity-icon" style="background: rgba(15,23,42,0.9); border: 1px solid rgba(148,163,184,0.6);">
        ${item.icon}
      </div>
      <div class="activity-label">
        <div>${item.label}</div>
        <div class="activity-meta">
          <span>${item.category}</span>
        </div>
      </div>
      <div class="activity-amount">₹${item.amount}</div>
      <div class="activity-time">${item.time}</div>
    `;
    list.appendChild(li);
  });
}

function initSnapTrack() {
  const input = byId("receiptInput");
  const result = byId("snapResult");
  const text = byId("snapText");

  if (!input || !result || !text) return;

  async function handleFile(file) {
    if (!file) return;
    text.textContent = "Reading receipt with OCR…";
    result.classList.remove("hidden");

    try {
      const { data } = await Tesseract.recognize(file, "eng", {
        tessedit_char_whitelist: "0123456789.,ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹",
      });
      const raw = data.text || "";

      // Find the largest number that looks like an amount
      const matches = raw.match(/(\d+[.,]\d{2}|\d+)/g) || [];
      const numeric = matches
        .map((m) => Number(m.replace(",", "")))
        .filter((n) => !Number.isNaN(n));
      const amount = numeric.length ? Math.max(...numeric) : null;

      // Try to guess a merchant: longest word-ish line
      const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const merchant =
        lines.sort((a, b) => b.length - a.length)[0] || file.name.replace(/\.[^.]+$/, "");

      if (amount) {
        text.textContent = `Looks like a receipt from "${merchant}" for around ₹${amount.toFixed(
          0
        )}. In a full build, this would be logged as a transaction and auto-categorised.`;
      } else {
        text.textContent =
          "I couldn't confidently detect an amount from this image, but OCR ran. Try a clearer receipt photo.";
      }
    } catch (err) {
      text.textContent = `OCR failed: ${err.message || "something went wrong."}`;
    }
  }

  input.addEventListener("change", () => {
    if (!input.files || !input.files[0]) return;
    handleFile(input.files[0]);
  });
}

function renderGoals() {
  const board = byId("goalBoard");
  if (!board) return;

  board.innerHTML = "";
  goalsSeed.forEach((goal) => {
    const pct = Math.round((goal.saved / goal.total) * 100);
    const card = document.createElement("div");
    card.className = "goal-card";
    card.innerHTML = `
      <p class="goal-name">${goal.emoji} ${goal.name}</p>
      <p class="goal-amount">₹${goal.saved.toLocaleString()} / ₹${goal.total.toLocaleString()}</p>
      <div class="goal-chip">
        <span>${pct}% funded</span>
      </div>
    `;
    board.appendChild(card);
  });
}

function initAddGoal() {
  const addBtn = byId("addGoalBtn");
  if (!addBtn) return;

  addBtn.addEventListener("click", () => {
    const name = prompt("What's your next goal? (e.g. Europe Trip, Camera)");
    if (!name) return;
    goalsSeed.push({
      name,
      saved: 0,
      total: 5000,
      emoji: "✨",
    });
    renderGoals();
  });
}

function initBudget() {
  const form = byId("budgetForm");
  const result = byId("budgetResult");
  const dailyEl = byId("dailyBudget");
  const tipEl = byId("budgetTip");

  if (!form || !result || !dailyEl || !tipEl) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const income = Number(byId("incomeInput").value || 0);
    const fixed = Number(byId("fixedInput").value || 0);
    const savings = Number(byId("savingsInput").value || 0);

    const days = 30;
    const flex = Math.max(income - fixed - savings, 0);
    const perDay = Math.floor(flex / days);

    dailyEl.textContent = `₹${perDay}`;

    if (perDay < 150) {
      tipEl.textContent =
        "Tight month. Pocketly would lower your food & fun targets, and prioritise your must-have spends first.";
    } else if (perDay < 350) {
      tipEl.textContent =
        "Balanced! You can afford small daily treats, but big spends should come from savings or one-off income.";
    } else {
      tipEl.textContent =
        "You have room to breathe. Consider auto-routing a bit more to your goals so future-you can flex harder.";
    }

    result.classList.remove("hidden");
  });
}

function initSplitBuddy() {
  const addBtn = byId("addSplitBtn");
  const list = byId("splitList");
  const settleBox = byId("settleBox");

  if (!addBtn || !list || !settleBox) return;

  function renderSplitState() {
    list.innerHTML = "";

    if (!splitExpenses.length) return;

    splitExpenses.forEach((exp, idx) => {
      const li = document.createElement("li");
      li.className = "split-item";

      const perPerson = exp.amount / exp.participants.length;

      li.innerHTML = `
        <div>
          <div>${exp.payer}</div>
          <div class="split-meta">
            Paid ₹${exp.amount} for ${exp.participants.join(", ")} 
            (₹${perPerson.toFixed(0)} each)
          </div>
        </div>
        <div>Bill #${idx + 1}</div>
      `;
      list.appendChild(li);
    });

    // ✅ BALANCE CALCULATION
    let balances = {};
    splitParticipants.forEach(p => balances[p] = 0);

    splitExpenses.forEach(e => {
      const share = e.amount / e.participants.length;

      // payer paid full amount
      balances[e.payer] += e.amount;

      // everyone owes equal share
      e.participants.forEach(p => {
        balances[p] -= share;
      });
    });

    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([name, bal]) => {
      const rounded = Math.round(bal);
      if (rounded > 0) creditors.push({ name, amount: rounded });
      else if (rounded < 0) debtors.push({ name, amount: -rounded });
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amt = Math.min(debtor.amount, creditor.amount);

      if (amt > 0) {
        transfers.push({
          from: debtor.name,
          to: creditor.name,
          amount: amt
        });
      }

      debtor.amount -= amt;
      creditor.amount -= amt;

      if (debtor.amount <= 0) i++;
      if (creditor.amount <= 0) j++;
    }

    if (!transfers.length) {
      settleBox.innerHTML = `<p class="settle-line">Everyone is settled up 🎉</p>`;
      return;
    }

    settleBox.innerHTML = `
      ${transfers.map(t =>
        `<p class="settle-line">${t.from} → ${t.to}: <strong>₹${t.amount}</strong></p>`
      ).join("")}
    `;
  }

  addBtn.addEventListener("click", () => {
    const payer = (byId("friendName").value || "").trim();
    const peopleInput = (byId("splitPeople").value || "").trim();
    const amount = Number(byId("totalAmount").value || 0);

    if (!payer || !peopleInput || !amount) return;

    const people = peopleInput.split(",").map(p => p.trim());

    people.forEach(p => splitParticipants.add(p));
    splitParticipants.add(payer);

    splitExpenses.push({
      payer,
      participants: people,
      amount
    });

    byId("friendName").value = "";
    byId("splitPeople").value = "";
    byId("totalAmount").value = "";

    renderSplitState();
  });
}
function initAIHint() {
  const btn = byId("aiSuggestBtn");
  const promptEl = byId("aiPrompt");
  const respEl = byId("aiResponse");
  if (!btn || !promptEl || !respEl) return;

  btn.addEventListener("click", () => {
    const text = (promptEl.value || "").trim();
    respEl.classList.remove("hidden");

    if (!text) {
      respEl.textContent =
        "In the real app, this would be a chat with a money coach. For now, ask something like “How do I save ₹1,000 this month?”";
      return;
    }

    // Super lightweight rule-based response for demo
    if (text.toLowerCase().includes("1000") || text.toLowerCase().includes("1000")) {
      respEl.textContent =
        "Try the 3–2–1 rule for this month:\n• 3 days with no delivery apps\n• 2 nights swapping cabs for metro\n• 1 freelancing gig/extra shift.\nEvery time you win, Pocketly can auto-move that amount into your top goal bucket.";
    } else if (text.toLowerCase().includes("save")) {
      respEl.textContent =
        "Start with your hotspots: food, commute, and impulse buys. Pocketly would spot your pricey zones on the GPS map and suggest small swaps you’re actually likely to stick with.";
    } else {
      respEl.textContent =
        "Pocketly’s AI buddy would read your real transactions, notice patterns (“delivery every Wed night”), and suggest tiny tweaks so you don’t feel broke by the 20th.";
    }
  });
}

function initThemeToggle() {
  const btn = byId("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    document.body.classList.toggle("light");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  renderActivity();
  initSnapTrack();
  renderGoals();
  initAddGoal();
  initBudget();
  initSplitBuddy();
  initAIHint();
  initThemeToggle();
  updateAuthUI();
  checkBackendHealth();

  const loginBtn = byId("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      if (!authToken) {
        loginFlow();
      } else {
        refreshFromBackend();
      }
    });
  }
});

