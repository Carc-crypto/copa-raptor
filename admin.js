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

  container.innerHTML = "";

  sets.forEach(set => {
    const p1 = set.player1 ? set.player1.gamertag : "TBD";
    const p2 = set.player2 ? set.player2.gamertag : "TBD";
    const card = document.createElement("div");
    card.style = "background:#12131C; margin: 10px 0; padding: 12px; border-radius: 6px; border-left: 4px solid #f1c40f; color: #fff;";

    const isPending = set.status === 'pending';
    const isInProgress = set.status === 'in_progress';
    const isCompleted = set.status === 'completed';
    const hasBothPlayers = set.player1_id && set.player2_id;

    card.innerHTML = `
      <div><strong>Ronda ${set.round_number}</strong> — Estado: <em>${set.status}</em></div>
      <div style="font-size: 16px; font-weight: bold; margin: 8px 0;">${p1} vs ${p2}</div>

      ${isPending && hasBothPlayers ? `
        <button onclick="setMatchInProgres(${set.id})" style="background:#3498db; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-top:5px;">
          ▶️ Marcar "En Curso"
        </button>
      ` : ''}

      ${(isPending || isInProgress) && hasBothPlayers ? `
        <div style="margin-top: 8px; font-size: 13px; color: #aaa;">Declarar Ganador:</div>
        <div style="display:flex; gap:8px; margin-top:4px;">
          <button onclick="setMatchWinner(${set.id}, '${set.player1_id}')" style="background:#2ecc71; color:#000; font-weight:bold; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">
            🏆 ${p1}
          </button>
          <button onclick="setMatchWinner(${set.id}, '${set.player2_id}')" style="background:#2ecc71; color:#000; font-weight:bold; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">
            🏆 ${p2}
          </button>
        </div>
      ` : ''}

      ${isCompleted && set.winner ? `
        <div style="color:#2ecc71; font-weight:bold; margin-top:6px;">🏆 Ganador: ${set.winner.gamertag}</div>
      ` : ''}
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
// MARCAR GANADOR Y MOVER DE MANERA ESTRICTA
async function setMatchWinner(setId, winnerId) {
  // 1. Obtener la partida actual desde Supabase
  const { data: currentSet, error: fetchError } = await supabaseClient
    .from("tournament_sets")
    .select("*")
    .eq("id", setId)
    .single();

  if (fetchError || !currentSet) {
    alert("Error al consultar la partida.");
    return;
  }

  // Convertir a String para evitar errores de comparación entre enteros y cadenas
  const wId = String(winnerId);
  const p1Id = String(currentSet.player1_id);
  const p2Id = String(currentSet.player2_id);

  // Determinar estrictamente la ID del PERDEDOR
  let loserId = null;
  if (wId === p1Id) {
    loserId = currentSet.player2_id;
  } else if (wId === p2Id) {
    loserId = currentSet.player1_id;
  }

  // 2. Actualizar el estado de la partida a completada
  const { error: updateError } = await supabaseClient
    .from("tournament_sets")
    .update({ winner_id: winnerId, status: "completed" })
    .eq("id", setId);

  if (updateError) {
    alert("Error al guardar ganador: " + updateError.message);
    return;
  }

  // 3. Mover a los jugadores según la rama actual
  if (currentSet.bracket_type === "winners") {
    // ENVIAR ÚNICAMENTE AL PERDEDOR A LOSERS
    if (loserId) {
      await advanceOrCreateSet("losers", 1, loserId);
    }

    // ENVIAR ÚNICAMENTE AL GANADOR A LA SIGUIENTE RONDA DE WINNERS
    if (winnerId) {
      await advanceOrCreateSet("winners", currentSet.round_number + 1, winnerId);
    }

  } else if (currentSet.bracket_type === "losers") {
    // En Losers el perdedor queda eliminado. Solo el ganador avanza en Losers.
    if (winnerId) {
      await advanceOrCreateSet("losers", currentSet.round_number + 1, winnerId);
    }
  }

  // 4. Recargar los brackets en la pantalla
  loadBrackets();
}

// INSERCIÓN O ACOPLAMIENTO SIN DUPLICAR
async function advanceOrCreateSet(bracketType, targetRound, playerId) {
  if (!playerId) return;

  // 1. Verificar si el jugador YA está en algún set (completado o pendiente) en esa ronda del bracket
  const { data: existingSets } = await supabaseClient
    .from("tournament_sets")
    .select("*")
    .eq("bracket_type", bracketType)
    .eq("round_number", targetRound)
    .or(`player1_id.eq.\({playerId},player2_id.eq.\){playerId}`);

  if (existingSets && existingSets.length > 0) {
    return; // Si ya existe en esa ronda, no hace nada
  }

  // 2. Buscar si hay una partida pendiente que no tenga Jugador 2
  const { data: pendingSets } = await supabaseClient
    .from("tournament_sets")
    .select("*")
    .eq("bracket_type", bracketType)
    .eq("round_number", targetRound)
    .eq("status", "pending");

  const openSet = pendingSets ? pendingSets.find(s => s.player1_id && !s.player2_id && String(s.player1_id) !== String(playerId)) : null;

  if (openSet) {
    // Asignar en el espacio libre (player2)
    await supabaseClient
      .from("tournament_sets")
      .update({ player2_id: playerId })
      .eq("id", openSet.id);
  } else {
    // Crear una nueva partida con el jugador en player1
    await supabaseClient
      .from("tournament_sets")
      .insert([{
        bracket_type: bracketType,
        round_number: targetRound,
        player1_id: playerId,
        player2_id: null,
        status: "pending"
      }]);
  }
}

// ELIMINAR PARTICIPANTE
async function deleteParticipant(participantId, gamertag) {
  const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar a "${gamertag}" del torneo?`);
  
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("participants")
    .delete()
    .eq("id", participantId);

  if (error) {
    alert("Error al eliminar el participante: " + error.message);
    return;
  }

  // Refrescar la lista de participantes y el contador
  loadParticipants();
}