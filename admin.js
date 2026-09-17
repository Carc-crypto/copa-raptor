<><div id="login-section">
  <h1>Panel de Administración</h1>
  <form id="loginForm">
    <div>
      <label for="adminEmail">Correo Electrónico:</label>
      <input type="email" id="adminEmail" required />
    </div>
    <div>
      <label for="adminPassword">Contraseña:</label>
      <input type="password" id="adminPassword" required />
    </div>
    <button type="submit">Iniciar Sesión</button>
  </form>
</div><div id="admin-dashboard" style="display: none;">
    <h1>Dashboard de Administración</h1>
    <button id="logoutButton">Cerrar Sesión</button>
    <div id="dashboardMessage"></div>
    <div id="participantCount">0 participantes</div>
    <div id="participantsContainer"></div>
  </div></>

const loginForm =
  document.getElementById("loginForm");


const loginSection =
  document.getElementById("loginSection");


const dashboard =
  document.getElementById("dashboard");


const loginMessage =
  document.getElementById("loginMessage");


const participantsContainer =
  document.getElementById(
    "participantsContainer"
  );


const participantCount =
  document.getElementById(
    "participantCount"
  );


const dashboardMessage =
  document.getElementById(
    "dashboardMessage"
  );


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


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





async function verifyAdmin(user) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();


  if (error || !data) {

    await supabaseClient.auth.signOut();


    loginMessage.textContent =
      "Esta cuenta no tiene permisos de administrador.";

    return;

  }
  loginSection.style.display =
    "none";


  dashboard.style.display =
    "block";


  loadParticipants();

}



async function loadParticipants() {

  dashboardMessage.textContent =
    "Cargando participantes...";


  const {
    data,
    error
  } =
    await supabaseClient
      .from("participants")
      .select("*")
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    dashboardMessage.textContent =
      "No se pudieron cargar los participantes.";

    return;

  }


  participantCount.textContent =
    data.length;


  participantsContainer.innerHTML =
    "";


  if (data.length === 0) {

    participantsContainer.innerHTML = `

      <div class="participant">

        <h2>
          No hay participantes todavía.
        </h2>

        <div class="details">
          Cuando alguien complete el formulario
          aparecerá aquí.
        </div>

      </div>

    `;

    dashboardMessage.textContent =
      "";

    return;

  }



  data.forEach(
    (participant, index) => {

      const card =
        document.createElement("article");


      card.className =
        "participant";


      card.innerHTML = `

        <div class="participant-number">

          PARTICIPANTE #${index + 1}

        </div>


        <h2>

          ${escapeHTML(
            participant.nombre
          )}

        </h2>


        <div class="gamertag">

          ${escapeHTML(
            participant.gamertag
          )}

        </div>


        <div class="details">

          <strong>
            Correo:
          </strong>

          ${escapeHTML(
            participant.correo
          )}

          <br>


          <strong>
            Edad:
          </strong>

          ${participant.edad}

          <br>


          <strong>
            Personaje:
          </strong>

          ${escapeHTML(
            participant.personaje
          )}

          <br>


          <strong>
            Ciudad:
          </strong>

          ${escapeHTML(
            participant.ciudad || "No indicada"
          )}

          <br>


          <strong>
            Espíritu:
          </strong>

          ${escapeHTML(
            participant.espiritu
          )}

        </div>

      `;


      participantsContainer.appendChild(
        card
      );

    }

  );


  dashboardMessage.textContent =
    "";

}





function escapeHTML(value) {

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}





logoutButton.addEventListener(
  "click",
  async function() {

    await supabaseClient.auth.signOut();

    dashboard.style.display =
      "none";

    loginSection.style.display =
      "block";

  }

);





async function checkSession() {

  const {
    data
  } =
    await supabaseClient.auth.getSession();


  if (!data.session) {

    return;

  }


  await verifyAdmin(
    data.session.user
  );

}

checkSession();

const STAGES = [
  { name: "Campo de batalla", img: "battlefield.jpg" },
  { name: "Pequeño campo de batalla", img: "small battlefield.jpg" },
  { name: "Destino final", img: "final destination.jpg" },
  { name: "Pueblo Smash", img: "smashville.jpg" },
  { name: "Estadio Pokémon 2", img: "pokemon stadium 2.jpg" },
  { name: "Sobrevolando el pueblo", img: "town and city.jpg" },
  { name: "Yoshi's Story", img: "yoshi's story.jpg" },
  { name: "Bastión Hueco", img: "hollow bastion.jpg" },
  { name: "Liga Pokémon de Kalos", img: "kalos pokemon league.jpg" }
];


let currentSetId = null;
let bannedStages = [];
let selectedStage = null;


document.addEventListener("DOMContentLoaded", () => {
  loadBrackets();

  const btnGen = document.getElementById("btn-generate-brackets");
  if (btnGen) btnGen.addEventListener("click", generateInitialBrackets);
});


async function loadBrackets() {
  const { data: sets, error } = await supabaseClient
    .from("tournament_sets")
    .select(`
      *,
      player1:player1_id(id, gamertag),
      player2:player2_id(id, gamertag),
      winner:winner_id(id, gamertag)
    `)
    .order("id");

  if (error) {
    console.error("Error cargando brackets:", error);
    return;
  }

  renderBracketContainer("winners-container", sets.filter(s => s.bracket_type === 'winners'));
  renderBracketContainer("losers-container", sets.filter(s => s.bracket_type === 'losers'));
  renderBracketContainer("grand-finals-container", sets.filter(s => s.bracket_type === 'grand_finals'));
}


function renderBracketContainer(containerId, sets) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (sets.length === 0) {
    container.innerHTML = `
      <div class="empty-bracket">
        No hay sets en este bracket.
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  sets.forEach((set) => {
    const setCard = document.createElement("div");
    setCard.className = "bracket-set";
    setCard.innerHTML = `
      <div class="players">
        <span>${set.player1 ? set.player1.gamertag : "TBD"}</span>
        <span>vs</span>
        <span>${set.player2 ? set.player2.gamertag : "TBD"}</span>
      </div>
      <div class="winner">
        ${set.winner ? set.winner.gamertag : "Pendiente"}
      </div>
    `;
    fragment.appendChild(setCard);
  });

  container.appendChild(fragment);
}

function renderSets(sets) {
  const container = document.getElementById("sets-container");
  if (!container) return;

  container.innerHTML = "";

  if (!sets || sets.length === 0) {
    container.innerHTML = `
      <div class="empty-set-list">No hay sets disponibles en esta fase.</div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  sets.forEach((set) => {
    const p1 = set.player1 ? set.player1.gamertag : "TBD";
    const p2 = set.player2 ? set.player2.gamertag : "TBD";
    const card = document.createElement("div");
    card.style = "background:#2b2b36; margin: 10px 0; padding: 12px; border-radius: 6px; border-left: 4px solid #f1c40f; color: #fff;";

    const banText = set.status !== "completed" && set.player1_id && set.player2_id
      ? "<div>⚔️ Baneo / Escenario</div>"
      : "";

    const winnerText = set.winner
      ? `<div>🏆 Ganador: ${set.winner.gamertag}</div>`
      : "";

    card.innerHTML = `
      <div>Ronda ${set.round_number} — Estado: ${set.status}</div>
      <div>${p1} (${set.score_p1}) vs ${p2} (${set.score_p2})</div>
      ${banText}
      ${winnerText}
    `;

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}
async function loadBrackets() {
  try {

    const { data: sets, error } = await supabaseClient
      .from("tournament_sets")
      .select(`
        *,
        player1:player1_id(id, gamertag),
        player2:player2_id(id, gamertag),
        winner:winner_id(id, gamertag)
      `)
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

    card.innerHTML = `
      <div>Ronda ${set.round_number} — Estado: ${set.status}</div>
      <div>${p1} (${set.score_p1 || 0}) vs ${p2} (${set.score_p2 || 0})</div>
      ${set.status !== 'completed' && set.player1_id && set.player2_id ? '<div>⚔️ Baneo / Escenario</div>' : ''}
      ${set.winner ? `<div>🏆 Ganador: ${set.winner.gamertag}</div>` : ''}
    `;

    container.appendChild(card);
  });
}

async function completeSet(setId, winnerId, loserId, scoreP1, scoreP2) {
  try {
    
    const { data: currentSet, error: setErr } = await supabaseClient
      .from("tournament_sets")
      .update({
        winner_id: winnerId,
        score_p1: scoreP1,
        score_p2: scoreP2,
        status: "completed"
      })
      .eq("id", setId)
      .select()
      .single();

    if (setErr) throw setErr;

    
    if (currentSet.bracket_type === "winners") {
      
      const { data: loserSet } = await supabaseClient
        .from("tournament_sets")
        .select("*")
        .eq("bracket_type", "losers")
        .eq("round_number", 1)
        .or("player1_id.is.null,player2_id.is.null")
        .maybeSingle();

      if (loserSet) {
        
        const slotToUpdate = !loserSet.player1_id ? { player1_id: loserId } : { player2_id: loserId };
        await supabaseClient
          .from("tournament_sets")
          .update(slotToUpdate)
          .eq("id", loserSet.id);
      } else {
        
        await supabaseClient.from("tournament_sets").insert({
          bracket_type: "losers",
          round_number: 1,
          player1_id: loserId,
          status: "pending"
        });
      }
    }

    loadBrackets(); 
  } catch (err) {
    console.error("Error al completar el set:", err.message);
  }
}
async function loadBrackets() {
  try {
    const { data: sets, error } = await supabaseClient
      .from("tournament_sets")
      .select(`
        *,
        player1:player1_id(id, gamertag),
        player2:player2_id(id, gamertag),
        winner:winner_id(id, gamertag)
      `)
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

// Renderiza cada tarjeta con botones para declarar ganador/perdedor
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

// Si la partida está activa (ambos jugadores listos y no completada)
const canDeclareWinner = set.status !== 'completed' && set.player1_id && set.player2_id;

card.innerHTML = `
Ronda ${set.round_number} — Estado: ${set.status}

${p1}
${canDeclareWinner ? `

🏆 Marcar Ganador
` : ''}

${p2}
${canDeclareWinner ? `

🏆 Marcar Ganador
` : ''}

${canDeclareWinner ? `

⚔️ Baneo / Escenario
` : ''}

${set.winner ? `

🏆 Ganador: ${set.winner.gamertag}

  ` : ''}
`;

container.appendChild(card);
});
}
async function setWinner(setId, winnerId, loserId, bracketType) {
if (!confirm("¿Confirmar este resultado?")) return;

try {

const { error: updateErr } = await supabaseClient
.from("tournament_sets")
.update({
winner_id: winnerId,
status: "completed"
})
.eq("id", setId);

if (updateErr) throw updateErr;


if (bracketType === "winners") {
 
  const { data: openLoserSet } = await supabaseClient
    .from("tournament_sets")
    .select("*")
    .eq("bracket_type", "losers")
    .eq("round_number", 1)
    .or("player1_id.is.null,player2_id.is.null")
    .limit(1)
    .maybeSingle();

  if (openLoserSet) {
    const slot = !openLoserSet.player1_id ? { player1_id: loserId } : { player2_id: loserId };
    await supabaseClient
      .from("tournament_sets")
      .update(slot)
      .eq("id", openLoserSet.id);
  } else {
    
    await supabaseClient.from("tournament_sets").insert({
      bracket_type: "losers",
      round_number: 1,
      player1_id: loserId,
      status: "pending"
    });
  }
}


loadBrackets();
} catch (err) {
console.error("Error al registrar resultado:", err.message);
alert("Ocurrió un error al guardar el resultado.");
}
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


await supabaseClient.from("tournament_sets").delete().neq("id", "00000000-0000-0000-0000-000000000000");


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


document.addEventListener("DOMContentLoaded", () => {
loadBrackets();

const btnGen = document.getElementById("btn-generate-brackets");
if (btnGen) {
btnGen.addEventListener("click", generateInitialBrackets);
}
});
async function resetTournamentBrackets() {
const confirmAction = confirm("¿Estás seguro de que deseas resetear y borrar TODAS las brackets del torneo?");
if (!confirmAction) return;

try {
const { error } = await supabaseClient
.from("tournament_sets")
.delete()
async function resetTournamentBrackets() {
const confirmAction = confirm("¿Estás seguro de que deseas resetear y borrar TODAS las brackets del torneo?");
if (!confirmAction) return;

try {
const { error } = await supabaseClient
.from("tournament_sets")
.delete()
.neq("id", 0);

if (error) throw error;

alert("Las brackets se han reseteado correctamente.");

if (typeof loadBrackets === "function") {
  loadBrackets();
} else {
  location.reload();
}
} catch (err) {
console.error("Error al resetear brackets:", err.message);
alert("Ocurrió un error al intentar resetear las brackets: " + err.message);
}
}

if (error) throw error;

alert("Las brackets se han reseteado correctamente.");

if (typeof loadBrackets === "function") {
  loadBrackets();
} else {
  location.reload();
}
} catch (err) {
console.error("Error al resetear brackets:", err.message);
alert("Ocurrió un error al intentar resetear las brackets.");
}
}
supabaseClient.auth.onAuthStateChange((event, session) => {
const loginSection = document.getElementById("login-section");
const adminDashboard = document.getElementById("admin-dashboard");

if (session) {
if (loginSection) loginSection.style.display = "none";
if (adminDashboard) adminDashboard.style.display = "block";
if (typeof loadBrackets === "function") loadBrackets();
} else {
if (loginSection) loginSection.style.display = "block";
if (adminDashboard) adminDashboard.style.display = "none";
}
});