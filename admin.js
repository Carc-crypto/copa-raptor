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
      participantsContainer.innerHTML = `
No hay participantes todavía.Cuando alguien complete el formulario aparecerá aquí.`;}dashboardMessage.textContent = "";return;}data.forEach((participant, index) => {const card = document.createElement("article");card.className = "participant";card.innerHTML = `PARTICIPANTE #${index + 1}${escapeHTML(participant.nombre)}${escapeHTML(participant.gamertag)}Correo: ${escapeHTML(participant.correo)}Edad: ${participant.edad}Personaje: ${escapeHTML(participant.personaje)}Ciudad: ${escapeHTML(participant.ciudad || "No indicada")}Espíritu: ${escapeHTML(participant.espiritu)}  Eliminar
`;
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
  if (!data || !data.session) return;
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
    card.style = "background:#12131C; margin: 10px 0; padding: 14px; border-radius: 6px; border-left: 4px solid #f1c40f; color: #fff;";
    const isCompleted = set.status === "completed";
const hasBothPlayers = set.player1_id && set.player2_id;

const isBo5 = set.bracket_type === 'grand_finals' || set.is_final_round; 
const maxWinsToWinSet = isBo5 ? 3 : 2; 

const p1Score = set.p1_score || 0;
const p2Score = set.p2_score || 0;

let actionsHTML = "";
if (hasBothPlayers && !isCompleted) {
  actionsHTML = `
MARCAR GANADOR DE DE PELEA INDIVIDUAL:➕ Partida para ${escapeHTML(p1)}➕ Partida para ${escapeHTML(p2)}🗺️ Seleccionar Escenario`;}let winnerHTML = "";if (isCompleted && set.winner) {winnerHTML = `🏆 Ganador del Set: ${escapeHTML(set.winner.gamertag)}`;}card.innerHTML = `
Ronda ${set.round_number} (${isBo5 ? 'Best of 5' : 'Best of 3'})Estado: ${set.status}${escapeHTML(p1)} vs${escapeHTML(p2)}${p1Score} -${p2Score}  ${actionsHTML}
  ${winnerHTML}
`;

container.appendChild(card);
});}async function generateInitialBrackets() {if (!confirm("¿Deseas generar los Brackets con los participantes registrados?")) return;const { data: participants, error } = await supabaseClient.from("participants").select("id, gamertag");if (error || !participants || participants.length < 2) {alert("Se necesitan al menos 2 participantes para generar la bracket.");return;}await supabaseClient.from("tournament_sets").delete().not("id", "is", null);const shuffled = [...participants].sort(() => 0.5 - Math.random());const newSets = [];for (let i = 0; i < shuffled.length; i += 2) {if (shuffled[i + 1]) {newSets.push({bracket_type: 'winners',round_number: 1,player1_id: shuffled[i].id,player2_id: shuffled[i + 1].id,status: 'pending'});}}await supabaseClient.from("tournament_sets").insert(newSets);loadBrackets();}async function resetTournamentBrackets() {const confirmAction = confirm("¿Estás seguro de que deseas resetear y borrar TODAS las brackets del torneo?");if (!confirmAction) return;try {const { error } = await supabaseClient.from("tournament_sets").delete().not("id", "is", null);if (error) throw error;

alert("Las brackets se han reseteado correctamente.");
loadBrackets();
} catch (err) {console.error("Error al resetear brackets:", err.message);alert("Ocurrió un error al intentar resetear las brackets: " + err.message);}}document.addEventListener("DOMContentLoaded", () => {const btnGen = document.getElementById("btn-generate-brackets");if (btnGen) {btnGen.addEventListener("click", generateInitialBrackets);}const btnReset = document.getElementById("btn-reset-brackets");if (btnReset) {btnReset.addEventListener("click", resetTournamentBrackets);}});// MARCAR GANADOR Y MOVER DE MANERA ESTRICTAasync function setMatchWinner(setId, winnerId) {const { data: currentSet, error: fetchError } = await supabaseClient.from("tournament_sets").select("*").eq("id", setId).single();if (fetchError || !currentSet) {alert("Error al consultar la partida.");return;}const wId = String(winnerId);const p1Id = String(currentSet.player1_id);const p2Id = String(currentSet.player2_id);let loserId = null;if (wId === p1Id) {loserId = currentSet.player2_id;} else if (wId === p2Id) {loserId = currentSet.player1_id;}const { error: updateError } = await supabaseClient.from("tournament_sets").update({ winner_id: winnerId, status: "completed" }).eq("id", setId);if (updateError) {alert("Error al guardar ganador: " + updateError.message);return;}if (currentSet.bracket_type === "winners") {if (loserId) {await advanceOrCreateSet("losers", 1, loserId);}if (winnerId) {await advanceOrCreateSet("winners", currentSet.round_number + 1, winnerId);}} else if (currentSet.bracket_type === "losers") {if (winnerId) {await advanceOrCreateSet("losers", currentSet.round_number + 1, winnerId);}}loadBrackets();}// INSERCIÓN O ACOPLAMIENTO SIN DUPLICARasync function advanceOrCreateSet(bracketType, targetRound, playerId) {if (!playerId) return;const { data: existingSets } = await supabaseClient.from("tournament_sets").select("*").eq("bracket_type", bracketType).eq("round_number", targetRound).or(player1_id.eq.\({playerId},player2_id.eq.\){playerId});if (existingSets && existingSets.length > 0) {return;}const { data: pendingSets } = await supabaseClient.from("tournament_sets").select("*").eq("bracket_type", bracketType).eq("round_number", targetRound).eq("status", "pending");const openSet = pendingSets ? pendingSets.find(s => s.player1_id && !s.player2_id && String(s.player1_id) !== String(playerId)) : null;if (openSet) {await supabaseClient.from("tournament_sets").update({ player2_id: playerId }).eq("id", openSet.id);} else {await supabaseClient.from("tournament_sets").insert([{bracket_type: bracketType,round_number: targetRound,player1_id: playerId,player2_id: null,status: "pending"}]);}}// ELIMINAR PARTICIPANTEasync function deleteParticipant(participantId, gamertag) {const confirmDelete = confirm(¿Estás seguro de que deseas eliminar a "${gamertag}" del torneo?);if (!confirmDelete) return;const { error } = await supabaseClient.from("participants").delete().eq("id", participantId);if (error) {alert("Error al eliminar el participante: " + error.message);return;}loadParticipants();}// GESTIÓN DE ESCENARIOSconst STARTER_STAGES = ["Campo de Batalla (Battlefield)","Destino Final (Final Destination)","Lylat Cruise","Pueblo Smash (Smashville)","Pueblo y Ciudad (Town & City)"];const COUNTERPICK_STAGES = [...STARTER_STAGES,"Estadio Pokémon 2 (Pokemon Stadium 2)","Sistema Solar (Kalos Pokemon League)","Bastión Hueco (Hollow Bastion)"];let currentStageState = {setId: null,gameNumber: 1,player1Name: "",player2Name: "",lastWinnerId: null,bannedStages: [],selectedStage: null};function openStageStriking(setId, p1Name, p2Name, gameNumber = 1, lastWinnerId = null, lastWinnerName = "") {currentStageState = {setId,gameNumber,player1Name: p1Name,player2Name: p2Name,lastWinnerId,bannedStages: [],selectedStage: null};const modal = document.getElementById("stageModal");if (modal) modal.style.display = "flex";if (gameNumber === 1) {renderStageBanPhase1();} else {renderStageCounterpickPhase(lastWinnerName);}}function renderStageBanPhase1() {const instruction = document.getElementById("stageInstruction");if (instruction) instruction.innerHTML = Fase 1 (Partida 1): **${currentStageState.player1Name}** debe seleccionar 3 escenarios para BANEAR.;const container = document.getElementById("stagesContainer");if (!container) return;container.innerHTML = "";STARTER_STAGES.forEach(stage => {const btn = document.createElement("button");btn.style = "background: #12131C; color: #fff; border: 1px solid #4eacc5; padding: 10px; border-radius: 5px; text-align: left; cursor: pointer; font-size: 13px;";btn.textContent = stage;btn.onclick = () => {
  if (currentStageState.bannedStages.includes(stage)) {
    currentStageState.bannedStages = currentStageState.bannedStages.filter(s => s !== stage);
    btn.style.background = "#12131C";
    btn.style.color = "#fff";
  } else {
    if (currentStageState.bannedStages.length < 3) {
      currentStageState.bannedStages.push(stage);
      btn.style.background = "#e94560";
      btn.style.color = "#fff";
    } else {
      alert("Ya seleccionaste 3 escenarios para banear.");
    }
  }
;
container.appendChild(btn);
;const confirmBtn = document.getElementById("btnConfirmStageAction");if (confirmBtn) {confirmBtn.onclick = () => {if (currentStageState.bannedStages.length !== 3) {alert("Debes banear exactamente 3 escenarios.");return;}renderStagePickPhase1();};}function renderStagePickPhase1() {const instruction = document.getElementById("stageInstruction");if (instruction) instruction.innerHTML = `Fase 2 (Partida 1): **${currentStageState.player2Name}** debe ELEGIR EL ESCENARIO para jugar.`;const container = document.getElementById("stagesContainer");if (!container) return;container.innerHTML = "";const availableStages = STARTER_STAGES.filter(s => !currentStageState.bannedStages.includes(s));availableStages.forEach(stage => {const btn = document.createElement("button");btn.style = "background: #12131C; color: #fff; border: 1px solid #2ecc71; padding: 10px; border-radius: 5px; text-align: left; cursor: pointer; font-size: 13px;";btn.textContent = stage;btn.onclick = () => {
  currentStageState.selectedStage = stage;
  Array.from(container.children).forEach(c => c.style.background = "#12131C");
  btn.style.background = "#2ecc71";
  btn.style.color = "#000";
};
container.appendChild(btn);
});const confirmBtn = document.getElementById("btnConfirmStageAction");if (confirmBtn) {confirmBtn.onclick = () => {if (!currentStageState.selectedStage) {alert("Debes seleccionar un escenario.");return;}alert(`¡Escenario confirmado para la Partida 1!: ${currentStageState.selectedStage}`);closeStageModal();};}}function renderStageCounterpickPhase(lastWinnerName) {const loserName = currentStageState.player1Name === lastWinnerName ? currentStageState.player2Name : currentStageState.player1Name;const instruction = document.getElementById("stageInstruction");if (instruction) {instruction.innerHTML = `Counterpick (Partida ${currentStageState.gameNumber}):${lastWinnerName} (Ganador) banea 1 escenario.${loserName} (Perdedor) elige el escenario.`;}const container = document.getElementById("stagesContainer");if (!container) return;container.innerHTML = "";COUNTERPICK_STAGES.forEach(stage => {const btn = document.createElement("button");btn.style = "background: #12131C; color: #fff; border: 1px solid #f1c40f; padding: 10px; border-radius: 5px; text-align: left; cursor: pointer; font-size: 13px;";btn.textContent = stage;btn.onclick = () => {
  if (currentStageState.bannedStages.includes(stage)) {
    currentStageState.bannedStages = [];
    currentStageState.selectedStage = stage;
    Array.from(container.children).forEach(c => c.style.background = "#12131C");
    btn.style.background = "#2ecc71";
    btn.style.color = "#000";
  } else {
    currentStageState.bannedStages = [stage];
    currentStageState.selectedStage = null;
    Array.from(container.children).forEach(c => c.style.background = "#12131C");
    btn.style.background = "#e94560";
    btn.style.color = "#fff";
  }
};
container.appendChild(btn);
});
const confirmBtn = document.getElementById("btnConfirmStageAction");
if (confirmBtn) {
  confirmBtn.onclick = () => {
    if (!currentStageState.selectedStage) {
      alert("Selecciona el escenario final para jugar.");
      return;
    }
    alert(`¡Escenario confirmado para la Partida ${currentStageState.gameNumber}!: ${currentStageState.selectedStage}`);
    closeStageModal();
  };
}
}

function closeStageModal() {
  const modal = document.getElementById("stageModal");
  if (modal) modal.style.display = "none";
}

// AUMENTAR MARCADOR Y VERIFICAR GANADOR DEL SET
async function addGameWin(setId, playerId, newP1Score, newP2Score, targetWins) {
  const { error } = await supabaseClient
    .from("tournament_sets")
    .update({
      p1_score: newP1Score,
      p2_score: newP2Score,
      status: "in_progress"
    })
    .eq("id", setId);

  if (error) {
    alert("Error al actualizar la partida: " + error.message);
    return;
  }

  if (newP1Score >= targetWins || newP2Score >= targetWins) {
    await setMatchWinner(setId, playerId);
  } else {
    loadBrackets();
  }
}