const SUPABASE_URL = "https://gigcjdhnnjnrojentaev.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gBHOBIn8vmrgFWZdT0cgVg_prdJJmNC";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Variables globales del DOM
let loginForm, loginSection, dashboard, loginMessage;
let participantsContainer, participantCount, dashboardMessage, logoutButton;

function initDOMElements() {
  loginForm = document.getElementById("loginForm");
  loginSection = document.getElementById("loginSection");
  dashboard = document.getElementById("dashboard");
  loginMessage = document.getElementById("loginMessage");
  participantsContainer = document.getElementById("participantsContainer");
  participantCount = document.getElementById("participantCount");
  dashboardMessage = document.getElementById("dashboardMessage");
  logoutButton = document.getElementById("logoutButton");

  const btnGenerate = document.getElementById("btn-generate-brackets");
  const btnReset = document.getElementById("btn-reset-brackets");

  if (btnGenerate) btnGenerate.onclick = generateBrackets;
  if (btnReset) btnReset.onclick = resetBrackets;
  if (logoutButton) {
    logoutButton.onclick = async () => {
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  }
}

// 1. AUTENTICACIÓN
function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (form && supabaseClient) {
    form.addEventListener("submit", async (e) => {
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

  initDOMElements();
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

  if (participantCount) participantCount.textContent = data ? data.length : 0;
  if (participantsContainer) participantsContainer.innerHTML = "";

  if (!data || data.length === 0) {
    if (participantsContainer) {
      participantsContainer.innerHTML = "No hay participantes registrados todavía.";
}
if (dashboardMessage) dashboardMessage.textContent = "";
return;
}data.forEach((participant, index) => {
const card = document.createElement("article");
card.className = "participant";card.innerHTML = `
PARTICIPANTE #${index + 1}Nombre: ${escapeHTML(participant.nombre)}Gamertag: ${escapeHTML(participant.gamertag)}Correo: ${escapeHTML(participant.correo)}Edad: ${participant.edad}Personaje: ${escapeHTML(participant.personaje)}Ciudad: ${escapeHTML(participant.ciudad || "No indicada")}Espíritu: ${escapeHTML(participant.espiritu)}`;

const deleteBtn = document.createElement("button");
deleteBtn.className = "btn-danger";
deleteBtn.style.cssText = "margin-top: 12px; padding: 8px 14px; font-size: 11px; width: 100%;";
deleteBtn.textContent = "ELIMINAR";
deleteBtn.addEventListener("click", () => deleteParticipant(participant.id, participant.gamertag));

card.appendChild(deleteBtn);
if (participantsContainer) participantsContainer.appendChild(card);
});if (dashboardMessage) dashboardMessage.textContent = "";
}// 3. ELIMINAR PARTICIPANTE
async function deleteParticipant(id, gamertag) {
const confirmed = confirm("¿Estás seguro de que deseas eliminar al participante \"" + gamertag + "\"?");
if (!confirmed) return;try {
if (dashboardMessage) dashboardMessage.textContent = "Eliminando participante...";const { error } = await supabaseClient
  .from("participants")
  .delete()
  .eq("id", id);

if (error) {
  alert(`No se pudo eliminar a "\({gamertag}". Si las llaves ya fueron generadas, primero debes resetearlas.\nDetalle:\){error.message}`);
  if (dashboardMessage) dashboardMessage.textContent = "";
  return;
}

if (dashboardMessage) dashboardMessage.textContent = `Participante "${gamertag}" eliminado con éxito.`;

await loadParticipants();
await loadBrackets();
} catch (err) {
console.error("Error al eliminar participante:", err);
alert("Ocurrió un error inesperado al eliminar.");
}
}// 4. GENERAR Y RESETEAR BRACKETS
async function generateBrackets() {
const confirmed = confirm("¿Deseas generar los enfrentamientos con los participantes actuales?");
if (!confirmed) return;try {
if (dashboardMessage) dashboardMessage.textContent = "Generando brackets...";const { data: participants, error: pError } = await supabaseClient
  .from("participants")
  .select("id, gamertag")
  .order("created_at", { ascending: true });

if (pError) throw new Error("Error al consultar participantes: " + pError.message);

if (!participants || participants.length < 2) {
  alert("Se necesitan al menos 2 participantes para generar los enfrentamientos.");
  if (dashboardMessage) dashboardMessage.textContent = "";
  return;
}

// Limpiar tablas previas
await supabaseClient.from("stage_selections").delete().not("id", "is", null);
await supabaseClient.from("tournament_sets").delete().not("id", "is", null);

const setsToInsert = [];
for (let i = 0; i < participants.length; i += 2) {
  const player1 = participants[i];
  const player2 = participants[i + 1] || null;

  setsToInsert.push({
    round_number: 1,
    bracket_type: "winners",
    player1_id: player1.id,
    player2_id: player2 ? player2.id : null,
    p1_score: 0,
    p2_score: 0,
    status: player2 ? "pending" : "completed",
    winner_id: player2 ? null : player1.id
  });
}

const { error: insertError } = await supabaseClient
  .from("tournament_sets")
  .insert(setsToInsert);

if (insertError) {
  throw new Error("Supabase rechazó la inserción: " + insertError.message);
}

if (dashboardMessage) dashboardMessage.textContent = "¡Brackets generados con éxito!";
await loadBrackets();
} catch (err) {
console.error("Error al generar brackets:", err);
alert("Error al generar brackets: " + err.message);
if (dashboardMessage) dashboardMessage.textContent = "";
}
}async function resetBrackets() {
const confirmed = confirm("¿Estás seguro de que deseas resetear las llaves? Se borrarán todas las partidas actuales.");
if (!confirmed) return;try {
if (dashboardMessage) dashboardMessage.textContent = "Reseteando brackets...";await supabaseClient.from("stage_selections").delete().not("id", "is", null);
const { error } = await supabaseClient.from("tournament_sets").delete().not("id", "is", null);

if (error) throw error;

if (dashboardMessage) dashboardMessage.textContent = "Brackets reseteados correctamente.";
await loadBrackets();
} catch (err) {
console.error("Error al resetear brackets:", err);
alert("No se pudieron resetear los brackets: " + err.message);
if (dashboardMessage) dashboardMessage.textContent = "";
}
}// 5. CARGAR Y RENDEREAR BRACKETS
async function loadBrackets() {
try {
const { data: sets, error } = await supabaseClient
.from("tournament_sets")
.select("*")
.order("round_number", { ascending: true });if (error) throw error;

const { data: participants, error: pError } = await supabaseClient
  .from("participants")
  .select("id, gamertag");

if (pError) throw pError;

const participantMap = {};
if (participants) {
  participants.forEach(p => { participantMap[p.id] = p; });
}

const enrichedSets = (sets || []).map(s => ({
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
}const winnersSets = enrichedSets.filter(s => s.bracket_type === "winners");
const losersSets = enrichedSets.filter(s => s.bracket_type === "losers");
const finalsSets = enrichedSets.filter(s => s.bracket_type === "grand_finals");

renderSetsList(winnersSets, winnersContainer);
renderSetsList(losersSets, losersContainer);
if (grandFinalsContainer) renderSetsList(finalsSets, grandFinalsContainer);
} catch (err) {
console.error("Error al cargar brackets:", err.message);
}
}// INTERFAZ INTERACTIVA PARA CADA SET
function renderSetsList(sets, container) {
  if (!sets || sets.length === 0) {
    container.innerHTML = "Sin enfrentamientos en esta sección.";
return;
}container.innerHTML = "";
sets.forEach(set => {
const p1Name = set.player1 ? set.player1.gamertag : "TBD";
const p2Name = set.player2 ? set.player2.gamertag : "TBD";
const isCompleted = set.status === "completed";
const winnerTag = set.winner ? set.winner.gamertag : "Ninguno";const card = document.createElement("div");
card.style.cssText = `
  background: #0f172a !important;
  border: 1px solid #1e293b !important;
  border-left: 5px solid ${isCompleted ? '#10b981' : '#f5b52e'} !important;
  border-radius: 8px !important;
  padding: 16px !important;
  margin: 14px 0 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  text-align: left !important;
  box-sizing: border-box !important;
  width: 100% !important;
`;

card.innerHTML = `
Ronda ${set.round_number}${isCompleted ? 'FINALIZADO' : 'PENDIENTE'}${escapeHTML(p1Name)}VS${escapeHTML(p2Name)}Escenario Jugado:${isCompleted ? `🏆 Ganador: ${escapeHTML(winnerTag)}` : ''}${set.player1_id ? `Gana ${escapeHTML(p1Name)}` : ''}
${set.player2_id ? `Gana ${escapeHTML(p2Name)}` : ''}💾 Guardar Marcador y Escenario`;

container.appendChild(card);

setTimeout(() => {
  const btnWin1 = document.getElementById(`btn-win-p1-${set.id}`);
  const btnWin2 = document.getElementById(`btn-win-p2-${set.id}`);
  const btnSave = document.getElementById(`btn-save-${set.id}`);

  if (btnWin1) btnWin1.onclick = () => saveSetResult(set.id, set.player1_id, set.player1_id, set.player2_id);
  if (btnWin2) btnWin2.onclick = () => saveSetResult(set.id, set.player2_id, set.player1_id, set.player2_id);
  if (btnSave) btnSave.onclick = () => saveSetResult(set.id, null, set.player1_id, set.player2_id);
}, 0);
});
}
// FUNCIONALIDAD PARA GUARDAR SCORE, GANADOR Y ESCENARIO
async function saveSetResult(setId, winnerId, player1Id, player2Id) {
try {
const p1Input = document.getElementById(`score-p1-${setId}`);
const p2Input = document.getElementById(`score-p2-${setId}`);
const stageSelect = document.getElementById(`stage-${setId}`);
const p1Score = p1Input ? parseInt(p1Input.value, 10) || 0 : 0;
const p2Score = p2Input ? parseInt(p2Input.value, 10) || 0 : 0;
const stageName = stageSelect ? stageSelect.value : "";

if (dashboardMessage) dashboardMessage.textContent = "Guardando resultado...";

// Si se hace clic en un botón de ganador
let finalStatus = "pending";
let finalWinnerId = winnerId;

if (winnerId) {
  finalStatus = "completed";
} else {
  // Si solo se guarda el marcador y algún puntaje llegó a 2 o 3 (Bo3 / Bo5), o ya había ganador
  if (p1Score > 0 || p2Score > 0) {
    if (p1Score > p2Score && p1Score >= 2) {
      finalWinnerId = player1Id;
      finalStatus = "completed";
    } else if (p2Score > p1Score && p2Score >= 2) {
      finalWinnerId = player2Id;
      finalStatus = "completed";
    }
  }
}

// Update en tournament_sets
const updateData = {
  p1_score: p1Score,
  p2_score: p2Score,
  status: finalStatus
};
if (finalWinnerId) {
  updateData.winner_id = finalWinnerId;
}

const { error: setErr } = await supabaseClient
  .from("tournament_sets")
  .update(updateData)
  .eq("id", setId);

if (setErr) throw setErr;

// Guardar escenario en stage_selections si fue elegido
if (stageName) {
  await supabaseClient
    .from("stage_selections")
    .insert({
      set_id: setId,
      stage_name: stageName,
      status: "selected",
      action_by: finalWinnerId || player1Id
    });
}

if (dashboardMessage) dashboardMessage.textContent = "¡Resultado actualizado!";
await loadBrackets();
} catch (err) {
console.error("Error al guardar resultado:", err);
alert("No se pudo guardar el resultado: " + err.message);
if (dashboardMessage) dashboardMessage.textContent = "";
}
}function escapeHTML(value) {
if (value === null || value === undefined) return "";
return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', '&quot;')
.replaceAll("'", "'");
}// INICIALIZACIÓN
async function checkSession() {
initDOMElements();
setupLoginForm();
if (!supabaseClient) return;
const { data } = await supabaseClient.auth.getSession();
if (data?.session) {
await verifyAdmin(data.session.user);
} else {
if (loginSection) loginSection.style.display = "block";
if (dashboard) dashboard.style.display = "none";
}
}if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", checkSession);
} else {
checkSession();
}
document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("tu-id-contenedor"); // Reemplaza por el ID correspondiente

  if (rootElement) {
    // Código que inicializa el componente usando rootElement
  } else {
    console.error("El elemento raíz no existe en esta página.");
  }
});