const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

let user = null;

// Auth functions
async function login(e) {
  e.preventDefault();
  const username = document.getElementById('login-user').value;
  const password = document.getElementById('login-pass').value;
  try {
    const res = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (res.ok) { user = await res.json(); updateUI(); loadResources(); } else throw await res.json();
  } catch (err) { alert(err.error); }
}
async function register(e) {
  e.preventDefault();
  const username = document.getElementById('reg-user').value;
  const password = document.getElementById('reg-pass').value;
  try {
    const res = await fetch(`${API_BASE}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (res.ok) { alert('Registered!'); showTab('login'); } else throw await res.json();
  } catch (err) { alert(err.error); }
}
async function logout() { await fetch(`${API_BASE}/logout`, { method: 'POST' }); user = null; updateUI(); }

// UI functions
function showTab(tab) { document.getElementById(tab).style.display = 'block'; document.querySelector('.active').classList.remove('active'); }
function updateUI() { document.getElementById(user ? 'main' : 'auth').style.display = 'block'; user && (document.getElementById('username').textContent = user.username); }
async function loadResources() {
  const res = await fetch(`${API_BASE}/resources`);
  const resources = await res.json();
  document.getElementById('resources').innerHTML = resources.map(r => `
    <div class="resource">
      <h3>${r.name}</h3>
      <p class="status-${r.status}">Status: ${r.status}</p>
      <button onclick="${r.status === 'available' ? 'request' : 'release'}(${r.id})">${r.status === 'available' ? 'Request' : 'Release'}</button>
    </div>
  `).join('');
}
async function request(id) { await fetch(`${API_BASE}/resources/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceId: id }) }); loadResources(); }
async function release(id) { await fetch(`${API_BASE}/resources/release`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceId: id }) }); loadResources(); }

// Event listeners
document.getElementById('login-form').addEventListener('submit', login);
document.getElementById('register-form').addEventListener('submit', register);

// Initialize
(async () => { const res = await fetch(`${API_BASE}/current-user`); if (res.ok) { user = await res.json(); updateUI(); loadResources(); } })();