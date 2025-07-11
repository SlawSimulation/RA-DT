document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const api_key = document.getElementById('api_key').value.trim();
  const result = document.getElementById('result');

  const res = await fetch('https://your-vercel-function-or-endpoint.vercel.app/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, api_key })
  });

  const msg = await res.text();
  result.textContent = msg;
  result.style.color = res.ok ? 'green' : 'red';
});
