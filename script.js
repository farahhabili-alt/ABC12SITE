/* ============================================================
   ABC CONFERENCE — shared behavior
   ============================================================ */

// ---- 1. CONFIGURE THIS ----
// Paste the URL you get after deploying the Google Apps Script
// web app (see SETUP-GOOGLE-SHEETS.md) between the quotes below.
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz71c-_mcPe4ut6mpuaqiG5Jg5qFYO85RC-NBynK7qQuVNZ7OrnHckdJgYO_EfloQ1Faw/exec";

// ---- Mobile nav toggle ----
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }
});

// ---- Generic "send this form's data to the Google Sheet" helper ----
// formType is written into its own column so the same sheet (or a
// second tab) can tell registrations apart from store orders.
async function sendToSheet(formEl, formType, statusEl, extraFields = {}) {
  const data = Object.fromEntries(new FormData(formEl).entries());
  data.formType = formType;
  data.submittedAt = new Date().toISOString();
  Object.assign(data, extraFields);

  if (!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.includes("PASTE_YOUR")) {
    showStatus(
      statusEl,
      "error",
      "This form isn't connected to Google Sheets yet. See SETUP-GOOGLE-SHEETS.md, paste your Web App URL into script.js, then try again."
    );
    console.log("Form data that would have been sent:", data);
    return false;
  }

  showStatus(statusEl, "loading", "Sending your response to the scribes of Olympus…");

  try {
    // Apps Script web apps don't send CORS headers back, so we use
    // no-cors mode: the request still reaches the sheet, we just
    // can't read the response. We treat "no network error" as success.
    await fetch(SHEET_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });
    showStatus(statusEl, "success", "Recorded! Your response has been added to the sheet.");
    formEl.reset();
    return true;
  } catch (err) {
    console.error(err);
    showStatus(statusEl, "error", "Something went wrong sending your response. Please try again in a moment.");
    return false;
  }
}

function showStatus(el, kind, message) {
  if (!el) return;
  el.textContent = message;
  el.className = "form-status visible " + kind;
}

// ---- Agenda day toggle (agenda.html) ----
function initAgendaToggle() {
  const buttons = document.querySelectorAll(".day-toggle button");
  const groups = document.querySelectorAll("[data-day]");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const day = btn.dataset.showDay;
      groups.forEach((g) => {
        g.style.display = g.dataset.day === day || day === "all" ? "grid" : "none";
      });
    });
  });
}
document.addEventListener("DOMContentLoaded", initAgendaToggle);

// ---- Store: running order summary (store.html) ----
function initStoreForm() {
  const form = document.getElementById("order-form");
  if (!form) return;
  const statusEl = document.getElementById("order-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const items = [];
    form.querySelectorAll(".item-card").forEach((card) => {
      const qtyInput = card.querySelector("input[type='number']");
      const qty = parseInt(qtyInput.value, 10) || 0;
      if (qty > 0) {
        items.push(`${card.dataset.itemName} x${qty}`);
      }
    });

    if (items.length === 0) {
      showStatus(statusEl, "error", "Choose a quantity for at least one item before submitting.");
      return;
    }

    await sendToSheet(form, "store-order", statusEl, { items: items.join("; ") });
  });
}
document.addEventListener("DOMContentLoaded", initStoreForm);

// ---- Registration form (register.html) ----
function initRegisterForm() {
  const form = document.getElementById("registration-form");
  if (!form) return;
  const statusEl = document.getElementById("register-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendToSheet(form, "registration", statusEl);
  });
}
document.addEventListener("DOMContentLoaded", initRegisterForm);
