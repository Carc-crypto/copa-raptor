const SUPABASE_URL = "https://gigcjdhnnjnrojentaev.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gBHOBIn8vmrgFWZdT0cgVg_prdJJmNC";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const loginMessage = document.getElementById("loginMessage");
const participantsContainer = document.getElementById("participantsContainer");
const participantCount = document.getElementById("participantCount");
const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");

// 1. AUTENTICACIÓN
if (loginForm && supabaseClient) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");

    const email = emailInput ? emailInput.value : "";
    const password = passwordInput ? passwordInput.value : "";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      if (loginMessage) loginMessage.textContent = "Error: " + error.message;
      return;
    }

    if (data?.user) {
      if (loginMessage) loginMessage.textContent = "¡Bienvenido! Verificando permisos...";
      await verifyAdmin(data.user);
    }
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
    if (loginMessage) loginMessage.textContent = "Esta cuenta no tiene permisos de administrador.";
    return;
  }

  if (loginSection) loginSection.style.display = "none";
  if (dashboard) dashboard.style.display = "block";

  await loadParticipants();
  await loadBrackets();
}

// 2. PARTICIPANTES
async function loadParticipants() {
  if (dashboardMessage) dashboardMessage.textContent = "Cargando participantes...";

  const { data, error } = await supabaseClient
    .from("participants")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    if (dashboardMessage) dashboardMessage.textContent = "No se pudieron cargar los participantes.";
    return;
  }

  if (participantCount) participantCount.textContent = data.length;
  if (participantsContainer) participantsContainer.innerHTML = "";

  if (data.length === 0) {
    if (participantsContainer) {
      participantsContainer.innerHTML = "No hay participantes todavía.";
    }
    if (dashboardMessage) dashboardMessage.textContent = "";
    return;
  }

  data.forEach((participant, index) => {
    const card = document.createElement("article");
    card.className = "participant";
    card.innerHTML = `
      <strong>PARTICIPANTE #${index + 1}</strong>
      <div>Nombre: ${escapeHTML(participant.nombre)}</div>
      <div>Gamertag: ${escapeHTML(participant.gamertag)}</div>
      <div>Correo: ${escapeHTML(participant.correo)}</div>
      <div>Edad: ${escapeHTML(participant.edad)}</div>
      <div>Personaje: ${escapeHTML(participant.personaje)}</div>
      <div>Ciudad: ${escapeHTML(participant.ciudad || "No indicada")}</div>
      <div>Espíritu: ${escapeHTML(participant.espiritu)}</div>`;

const deleteBtn = document.createElement("button");
deleteBtn.className = "btn-danger";
deleteBtn.style.cssText = "margin-top: 10px; padding: 6px 12px; font-size: 12px;";
deleteBtn.textContent = "Eliminar";
deleteBtn.addEventListener("click", () => deleteParticipant(participant.id, participant.gamertag));

    card.appendChild(deleteBtn);
    if (participantsContainer) participantsContainer.appendChild(card);
  });

  if (dashboardMessage) dashboardMessage.textContent = "";
}

// 3. BRACKETS (ENRIQUECIMIENTO EN MEMORIA PARA EVITAR ERRORES DE SCHEMA/JOIN)
async function loadBrackets() {
  try {
    const { data: sets, error } = await supabaseClient
      .from("tournament_sets")
      .select("*")
      .order("round_number", { ascending: true });
    if (error) throw error;

const { data: participants, error: pError } = await supabaseClient
  .from("participants")
  .select("id, gamertag");

if (pError) throw pError;

const participantMap = {};
if (participants) {
  participants.forEach(p => { participantMap[p.id] = p; });
}

const enrichedSets = sets.map(s => ({
  ...s,
  player1: participantMap[s.player1_id] || null,
  player2: participantMap[s.player2_id] || null,
  winner: participantMap[s.winner_id] || null
}));

const winnersContainer = document.getElementById("winners-container");
const losersContainer = document.getElementById("losers-container");
const grandFinalsContainer = document.getElementById("grand-finals-container");

if (!winnersContainer || !losersContainer) return;

winnersContainer.innerHTML = "";
losersContainer.innerHTML = "";
if (grandFinalsContainer) grandFinalsContainer.innerHTML = "";

if (!enrichedSets || enrichedSets.length === 0) {
  winnersContainer.innerHTML = "No hay partidas generadas aún.";
  losersContainer.innerHTML = "No hay partidas en Losers.";
  return;
}

const winnersSets = enrichedSets.filter(s => s.bracket_type === "winners");
const losersSets = enrichedSets.filter(s => s.bracket_type === "losers");
const finalsSets = enrichedSets.filter(s => s.bracket_type === "grand_finals");

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
  container.innerHTML = "";
  sets.forEach(set => {
    const p1 = set.player1 ? set.player1.gamertag : "TBD";
    const p2 = set.player2 ? set.player2.gamertag : "TBD";
    const card = document.createElement("div");
card.style.cssText = "background:#12131C; margin: 10px 0; padding: 14px; border-radius: 6px; border-left: 4px solid #f5b52e; color: #fff;";

const p1Score = set.p1_score || 0;
const p2Score = set.p2_score || 0;

card.innerHTML = `
  <div class="set-card-content">
    <div>Ronda ${set.round_number}</div>
    <div>Estado: ${escapeHTML(set.status)}</div>
    <div>${escapeHTML(p1)} vs ${escapeHTML(p2)}</div>
    <div>Marcador: ${p1Score} - ${p2Score}</div>
  </div>
`;

container.appendChild(card);
  });
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// COMPROBAR SESIÓN INICIAL
async function checkSession() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    await verifyAdmin(data.session.user);
  } else {
    if (loginSection) loginSection.style.display = "block";
    if (dashboard) dashboard.style.display = "none";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", checkSession);
} else {
  checkSession();
}