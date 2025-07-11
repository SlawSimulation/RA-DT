// site/js/main.js

const form = document.getElementById("register-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  const msg = document.getElementById("response-message");

  if (res.ok) {
    msg.style.color = "#43b581"; // green
    msg.textContent = result.message || "✅ Registration complete.";
  } else {
    msg.style.color = "#f04747"; // red
    msg.textContent = result.error || "❌ Something went wrong.";
  }
});
