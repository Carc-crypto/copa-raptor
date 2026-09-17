const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const loginMessage = document.getElementById("loginMessage");
const participantsContainer = document.getElementById("participantsContainer");
const participantCount = document.getElementById("participantCount");
const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");

// 1. INICIO DE SESIÓN
if (loginForm) {
loginForm.addEventListener("submit", async function(event) {
event.preventDefault();

const email = document.getElementById("adminEmail").value;
const password = document.getElementById("adminPassword").value;

loginMessage.textContent = "Iniciando sesión...";

const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: email,
  password: password
});

if (error) {
  console.error("Error exacto de Auth:", error.message);
  loginMessage.textContent = `Error: ${error.message}`;
  return;
}

await verifyAdmin(data.user);
});
}

async function verifyAdmin(user) {
const { data, error } = await supabaseClient
.from("admin_users")
.select("user_id")
.eq("user_id", user.id)
.maybeSingle();

if (error || !data) {
await supabaseClient.auth.signOut();
loginMessage.textContent = "Esta cuenta no tiene permisos de administrador.";
return;
}

if (loginSection) loginSection.style.display = "none";
if (dashboard) dashboard.style.display = "block";

loadParticipants();
loadBrackets();
}

// 2. GESTIÓN DE PARTICIPANTES
async function loadParticipants() {
if (!dashboardMessage) return;
dashboardMessage.textContent = "Cargando participantes...";

const { data, error } = await supabaseClient
.from("participants")
.select("*")
.order("created_at", { ascending: true });

if (error) {
console.error(error);
dashboardMessage.textContent = "No se pudieron cargar los participantes.";
return;
}

if (participantCount) participantCount.textContent = data.length;
if (participantsContainer) participantsContainer.innerHTML = "";

if (data.length === 0) {
if (participantsContainer) {
  participantsContainer.innerHTML = `<div class="participant"><h2>No hay participantes todavía.</h2><div class="details">Cuando alguien complete el formulario aparecerá aquí.</div></div>`;
}
dashboardMessage.textContent = "";
return;
}

data.forEach((participant, index) => {
const card = document.createElement("article");
card.className = "participant";
card.innerHTML = `<div class="participant-number">PARTICIPANTE #${index + 1}</div><h2>${escapeHTML(participant.nombre)}</h2><div class="gamertag">${escapeHTML(participant.gamertag)}</div><div class="details"><strong>Correo:</strong> ${escapeHTML(participant.correo)}<br><strong>Edad:</strong> ${participant.edad}<br><strong>Personaje:</strong> ${escapeHTML(participant.personaje)}<br><strong>Ciudad:</strong> ${escapeHTML(participant.ciudad || "No indicada")}<br><strong>Espíritu:</strong> ${escapeHTML(participant.espiritu)}</div>`;
if (participantsContainer) participantsContainer.appendChild(card);
});

dashboardMessage.textContent = "";
}

function escapeHTML(value) {
return String(value)
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

if (logoutButton) {
logoutButton.addEventListener("click", async function() {
await supabaseClient.auth.signOut();
if (dashboard) dashboard.style.display = "none";
if (loginSection) loginSection.style.display = "block";
});
}

async function checkSession() {
const { data } = await supabaseClient.auth.getSession();
if (!data.session) return;
await verifyAdmin(data.session.user);
}

checkSession();

// 3. GESTIÓN DE BRACKETS
async function loadBrackets() {
try {
const { data: sets, error } = await supabaseClient
.from("tournament_sets")
.select("*, player1:player1_id(id, gamertag), player2:player2_id(id, gamertag), winner:winner_id(id, gamertag)")
.order("round_number", { ascending: true });

if (error) throw error;

const winnersContainer = document.getElementById("winners-container");
const losersContainer = document.getElementById("losers-container");
const grandFinalsContainer = document.getElementById("grand-finals-container");

if (!winnersContainer || !losersContainer) return;

winnersContainer.innerHTML = "";
losersContainer.innerHTML = "";
if (grandFinalsContainer) grandFinalsContainer.innerHTML = "";

if (!sets || sets.length === 0) {
  winnersContainer.innerHTML = "No hay partidas generadas aún.";
  losersContainer.innerHTML = "No hay partidas en Losers.";
  return;
}

const winnersSets = sets.filter(s => s.bracket_type === 'winners');
const losersSets = sets.filter(s => s.bracket_type === 'losers');
const finalsSets = sets.filter(s => s.bracket_type === 'grand_finals');

renderSetsList(winnersSets, winnersContainer);
renderSetsList(losersSets, losersContainer);
if (grandFinalsContainer) renderSetsList(finalsSets, grandFinalsContainer);
} catch (err) {
console.error("Error al cargar brackets:", err.message);
}
}

function renderSetsList(sets, container) {
if (!sets || sets.length === 0) {
container.innerHTML = "Sin enfrentamientos en esta sección.";
return;
}

sets.forEach(set => {
const p1 = set.player1 ? set.player1.gamertag : "TBD";
const p2 = set.player2 ? set.player2.gamertag : "TBD";
const card = document.createElement("div");
card.style = "background:#12131C; margin: 10px 0; padding: 12px; border-radius: 6px; border-left: 4px solid #f1c40f; color: #fff;";

const canDeclareWinner = set.status !== 'completed' && set.player1_id && set.player2_id;

card.innerHTML = `
  <div>Ronda ${set.round_number} — Estado: ${set.status}</div>
  <div>${p1} vs ${p2}</div>
  ${canDeclareWinner ? `<div>⚔️ Baneo / Escenario</div>` : ''}
  ${set.winner ? `<div>🏆 Ganador: ${set.winner.gamertag}</div>` : ''}
`;

container.appendChild(card);
});
}

async function generateInitialBrackets() {
if (!confirm("¿Deseas generar los Brackets con los participantes registrados?")) return;

const { data: participants, error } = await supabaseClient
.from("participants")
.select("id, gamertag");

if (error || !participants || participants.length < 2) {
alert("Se necesitan al menos 2 participantes.");
return;
}

await supabaseClient.from("tournament_sets").delete().not("id", "is", null);

const shuffled = [...participants].sort(() => 0.5 - Math.random());
const newSets = [];

for (let i = 0; i < shuffled.length; i += 2) {
if (shuffled[i + 1]) {
newSets.push({
bracket_type: 'winners',
round_number: 1,
player1_id: shuffled[i].id,
player2_id: shuffled[i + 1].id,
status: 'pending'
});
}
}

await supabaseClient.from("tournament_sets").insert(newSets);
loadBrackets();
}

async function resetTournamentBrackets() {
const confirmAction = confirm("¿Estás seguro de que deseas resetear y borrar TODAS las brackets del torneo?");
if (!confirmAction) return;

try {
const { error } = await supabaseClient
.from("tournament_sets")
.delete()
.not("id", "is", null);

if (error) throw error;

alert("Las brackets se han reseteado correctamente.");
loadBrackets();
} catch (err) {
console.error("Error al resetear brackets:", err.message);
alert("Ocurrió un error al intentar resetear las brackets: " + err.message);
}
}

document.addEventListener("DOMContentLoaded", () => {
const btnGen = document.getElementById("btn-generate-brackets");
if (btnGen) {
btnGen.addEventListener("click", generateInitialBrackets);
}

const btnReset = document.getElementById("btn-reset-brackets");
if (btnReset) {
btnReset.addEventListener("click", resetTournamentBrackets);
}
});