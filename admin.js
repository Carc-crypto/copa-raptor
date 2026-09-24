const SUPABASE_URL = "https://gigcjdhnnjnrojentaev.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_gBHOBIn8vmrgFWZdT0cgVg_prdJJmNC";


const supabaseClient = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )
  : null;


/* =========================================================
   VARIABLES GLOBALES
   ========================================================= */

let loginForm;
let loginSection;
let dashboard;
let loginMessage;

let participantsContainer;
let participantCount;
let dashboardMessage;
let logoutButton;


/* =========================================================
   INICIALIZAR DOM
   ========================================================= */

function initDOMElements() {

  loginForm =
    document.getElementById("loginForm");

  loginSection =
    document.getElementById("loginSection");

  dashboard =
    document.getElementById("dashboard");

  loginMessage =
    document.getElementById("loginMessage");

  participantsContainer =
    document.getElementById("participantsContainer");

  participantCount =
    document.getElementById("participantCount");

  dashboardMessage =
    document.getElementById("dashboardMessage");

  logoutButton =
    document.getElementById("logoutButton");


  const btnGenerate =
    document.getElementById(
      "btn-generate-brackets"
    );

  const btnReset =
    document.getElementById(
      "btn-reset-brackets"
    );


  if (btnGenerate) {

    btnGenerate.onclick =
      generateBrackets;

  }


  if (btnReset) {

    btnReset.onclick =
      resetBrackets;

  }


  if (logoutButton) {

    logoutButton.onclick =
      async () => {

        await supabaseClient.auth.signOut();

        window.location.reload();

      };

  }

}


/* =========================================================
   AUTENTICACIÓN
   ========================================================= */

function setupLoginForm() {

  const form =
    document.getElementById("loginForm");


  if (!form || !supabaseClient) {
    return;
  }


  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      const emailInput =
        document.getElementById(
          "adminEmail"
        );

      const passwordInput =
        document.getElementById(
          "adminPassword"
        );


      const email =
        emailInput
          ? emailInput.value.trim()
          : "";


      const password =
        passwordInput
          ? passwordInput.value
          : "";


      const {
        data,
        error
      } =
        await supabaseClient.auth.signInWithPassword(
          {
            email,
            password
          }
        );


      if (error) {

        if (loginMessage) {

          loginMessage.textContent =
            "Error: " + error.message;

        }

        return;

      }


      if (data?.user) {

        if (loginMessage) {

          loginMessage.textContent =
            "¡Bienvenido! Verificando permisos...";

        }

        await verifyAdmin(data.user);

      }

    }
  );

}


/* =========================================================
   VERIFICAR ADMIN
   ========================================================= */

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


    if (loginMessage) {

      loginMessage.textContent =
        "Esta cuenta no tiene permisos de administrador.";

    }

    return;

  }


  if (loginSection) {

    loginSection.style.display =
      "none";

  }


  if (dashboard) {

    dashboard.style.display =
      "block";

  }


  initDOMElements();

  await loadParticipants();

  await loadBrackets();

}


/* =========================================================
   PARTICIPANTES
   ========================================================= */

async function loadParticipants() {

  if (dashboardMessage) {

    dashboardMessage.textContent =
      "Cargando participantes...";

  }


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


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "No se pudieron cargar los participantes.";

    }

    return;

  }


  if (participantCount) {

    participantCount.textContent =
      data
        ? data.length
        : 0;

  }


  if (participantsContainer) {

    participantsContainer.innerHTML =
      "";

  }


  if (!data || data.length === 0) {

    if (participantsContainer) {

      participantsContainer.innerHTML = `
        <div class="empty-msg">
          No hay participantes registrados todavía.
        </div>
      `;

    }


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "";

    }

    return;

  }


  data.forEach(
    (participant, index) => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "participant";


      card.innerHTML = `
        <h3>
          PARTICIPANTE #${index + 1}
        </h3>

        <p>
          <strong>Nombre:</strong>
          ${escapeHTML(participant.nombre)}
        </p>

        <p>
          <strong>Gamertag:</strong>
          ${escapeHTML(participant.gamertag)}
        </p>

        <p>
          <strong>Correo:</strong>
          ${escapeHTML(participant.correo)}
        </p>

        <p>
          <strong>Edad:</strong>
          ${escapeHTML(participant.edad)}
        </p>

        <p>
          <strong>Personaje:</strong>
          ${escapeHTML(participant.personaje)}
        </p>

        <p>
          <strong>Ciudad:</strong>
          ${escapeHTML(
            participant.ciudad ||
            "No indicada"
          )}
        </p>

        <p>
          <strong>Espíritu:</strong>
          ${escapeHTML(participant.espiritu)}
        </p>
      `;


      const deleteBtn =
        document.createElement(
          "button"
        );


      deleteBtn.className =
        "btn-danger";


      deleteBtn.style.cssText =
        `
          margin-top: 12px;
          padding: 8px 14px;
          font-size: 11px;
          width: 100%;
        `;


      deleteBtn.textContent =
        "ELIMINAR";


      deleteBtn.addEventListener(
        "click",
        () => {

          deleteParticipant(
            participant.id,
            participant.gamertag
          );

        }
      );


      card.appendChild(
        deleteBtn
      );


      if (participantsContainer) {

        participantsContainer.appendChild(
          card
        );

      }

    }
  );


  if (dashboardMessage) {

    dashboardMessage.textContent =
      "";

  }

}


/* =========================================================
   ELIMINAR PARTICIPANTE
   ========================================================= */

async function deleteParticipant(
  id,
  gamertag
) {

  const confirmed =
    confirm(
      `¿Estás seguro de que deseas eliminar al participante "${gamertag}"?`
    );


  if (!confirmed) {
    return;
  }


  try {

    if (dashboardMessage) {

      dashboardMessage.textContent =
        "Eliminando participante...";

    }


    const {
      error
    } =
      await supabaseClient
        .from("participants")
        .delete()
        .eq("id", id);


    if (error) {

      alert(
        `No se pudo eliminar a "${gamertag}". ` +
        `Si las llaves ya fueron generadas, ` +
        `primero debes resetearlas.\n\n` +
        `Detalle: ${error.message}`
      );


      if (dashboardMessage) {

        dashboardMessage.textContent =
          "";

      }

      return;

    }


    if (dashboardMessage) {

      dashboardMessage.textContent =
        `Participante "${gamertag}" eliminado con éxito.`;

    }


    await loadParticipants();

    await loadBrackets();


  } catch (err) {

    console.error(
      "Error al eliminar participante:",
      err
    );


    alert(
      "Ocurrió un error inesperado al eliminar."
    );

  }

}


/* =========================================================
   GENERAR BRACKETS
   ========================================================= */

async function generateBrackets() {

  const confirmed =
    confirm(
      "¿Deseas generar los enfrentamientos con los participantes actuales?"
    );


  if (!confirmed) {
    return;
  }


  try {

    if (dashboardMessage) {

      dashboardMessage.textContent =
        "Generando brackets...";

    }


    const {
      data: participants,
      error: pError
    } =
      await supabaseClient
        .from("participants")
        .select(
          "id, gamertag"
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (pError) {

      throw new Error(
        "Error al consultar participantes: " +
        pError.message
      );

    }


    if (
      !participants ||
      participants.length < 2
    ) {

      alert(
        "Se necesitan al menos 2 participantes para generar los enfrentamientos."
      );


      if (dashboardMessage) {

        dashboardMessage.textContent =
          "";

      }

      return;

    }


    /* LIMPIAR DATOS ANTERIORES */

    await supabaseClient
      .from("stage_selections")
      .delete()
      .not(
        "id",
        "is",
        null
      );


    await supabaseClient
      .from("tournament_sets")
      .delete()
      .not(
        "id",
        "is",
        null
      );


    const setsToInsert = [];


    for (
      let i = 0;
      i < participants.length;
      i += 2
    ) {

      const player1 =
        participants[i];

      const player2 =
        participants[i + 1] ||
        null;


      setsToInsert.push({

        round_number: 1,

        bracket_type: "winners",

        player1_id:
          player1.id,

        player2_id:
          player2
            ? player2.id
            : null,

        p1_score: 0,

        p2_score: 0,

        status:
          player2
            ? "pending"
            : "completed",

        winner_id:
          player2
            ? null
            : player1.id

      });

    }


    const {
      error: insertError
    } =
      await supabaseClient
        .from("tournament_sets")
        .insert(
          setsToInsert
        );


    if (insertError) {

      throw new Error(
        "Supabase rechazó la inserción: " +
        insertError.message
      );

    }


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "¡Brackets generados con éxito!";

    }


    await loadBrackets();


  } catch (err) {

    console.error(
      "Error al generar brackets:",
      err
    );


    alert(
      "Error al generar brackets: " +
      err.message
    );


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "";

    }

  }

}


/* =========================================================
   RESETEAR BRACKETS
   ========================================================= */

async function resetBrackets() {

  const confirmed =
    confirm(
      "¿Estás seguro de que deseas resetear las llaves? " +
      "Se borrarán todas las partidas actuales."
    );


  if (!confirmed) {
    return;
  }


  try {

    if (dashboardMessage) {

      dashboardMessage.textContent =
        "Reseteando brackets...";

    }


    await supabaseClient
      .from("stage_selections")
      .delete()
      .not(
        "id",
        "is",
        null
      );


    const {
      error
    } =
      await supabaseClient
        .from("tournament_sets")
        .delete()
        .not(
          "id",
          "is",
          null
        );


    if (error) {
      throw error;
    }


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "Brackets reseteados correctamente.";

    }


    await loadBrackets();


  } catch (err) {

    console.error(
      "Error al resetear brackets:",
      err
    );


    alert(
      "No se pudieron resetear los brackets: " +
      err.message
    );


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "";

    }

  }

}


/* =========================================================
   CARGAR BRACKETS
   ========================================================= */

async function loadBrackets() {

  try {

    const {
      data: sets,
      error
    } =
      await supabaseClient
        .from("tournament_sets")
        .select("*")
        .order(
          "round_number",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    const {
      data: participants,
      error: pError
    } =
      await supabaseClient
        .from("participants")
        .select(
          "id, gamertag"
        );


    if (pError) {
      throw pError;
    }


    const participantMap = {};


    if (participants) {

      participants.forEach(
        (participant) => {

          participantMap[
            participant.id
          ] = participant;

        }
      );

    }


    const enrichedSets =
      (sets || []).map(
        (set) => ({

          ...set,

          player1:
            participantMap[
              set.player1_id
            ] || null,

          player2:
            participantMap[
              set.player2_id
            ] || null,

          winner:
            participantMap[
              set.winner_id
            ] || null

        })
      );


    const winnersContainer =
      document.getElementById(
        "winners-container"
      );


    const losersContainer =
      document.getElementById(
        "losers-container"
      );


    const grandFinalsContainer =
      document.getElementById(
        "grand-finals-container"
      );


    if (
      !winnersContainer ||
      !losersContainer
    ) {
      return;
    }


    winnersContainer.innerHTML =
      "";

    losersContainer.innerHTML =
      "";


    if (grandFinalsContainer) {

      grandFinalsContainer.innerHTML =
        "";

    }


    if (
      !enrichedSets ||
      enrichedSets.length === 0
    ) {

      winnersContainer.innerHTML = `
        <div class="empty-msg">
          No hay partidas generadas aún.
        </div>
      `;


      losersContainer.innerHTML = `
        <div class="empty-msg">
          No hay partidas en Losers.
        </div>
      `;


      if (grandFinalsContainer) {

        grandFinalsContainer.innerHTML = `
          <div class="empty-msg">
            No hay Grand Finals todavía.
          </div>
        `;

      }


      return;

    }


    const winnersSets =
      enrichedSets.filter(
        (set) =>
          set.bracket_type ===
          "winners"
      );


    const losersSets =
      enrichedSets.filter(
        (set) =>
          set.bracket_type ===
          "losers"
      );


    const finalsSets =
      enrichedSets.filter(
        (set) =>
          set.bracket_type ===
          "grand_finals"
      );


    renderSetsList(
      winnersSets,
      winnersContainer
    );


    renderSetsList(
      losersSets,
      losersContainer
    );


    if (grandFinalsContainer) {

      renderSetsList(
        finalsSets,
        grandFinalsContainer
      );

    }


  } catch (err) {

    console.error(
      "Error al cargar brackets:",
      err
    );

  }

}


/* =========================================================
   RENDERIZAR SETS
   ========================================================= */

function renderSetsList(
  sets,
  container
) {

  if (
    !sets ||
    sets.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-msg">
        Sin enfrentamientos en esta sección.
      </div>
    `;

    return;

  }


  container.innerHTML =
    "";


  sets.forEach(
    (set) => {

      const p1Name =
        set.player1
          ? set.player1.gamertag
          : "TBD";


      const p2Name =
        set.player2
          ? set.player2.gamertag
          : "TBD";


      const isCompleted =
        set.status ===
        "completed";


      const winnerTag =
        set.winner
          ? set.winner.gamertag
          : "";


      const p1IsWinner =
        set.winner_id ===
        set.player1_id;


      const p2IsWinner =
        set.winner_id ===
        set.player2_id;


      const card =
        document.createElement(
          "div"
        );


      card.className =
        `set-card ${
          isCompleted
            ? "completed"
            : ""
        }`;


      card.innerHTML = `

        <div class="set-header">

          <span class="set-round">
            Ronda ${set.round_number}
          </span>

          <span class="set-badge ${
            isCompleted
              ? "completed"
              : "pending"
          }">

            ${
              isCompleted
                ? "Finalizado"
                : "Pendiente"
            }

          </span>

        </div>


        <div class="set-match">

          <div class="player-row">

            <span class="player-name ${
              p1IsWinner
                ? "winner-text"
                : ""
            }">

              ${escapeHTML(p1Name)}

            </span>

            <span class="player-score">
              ${Number(set.p1_score) || 0}
            </span>

          </div>


          <div class="vs-divider">
            VS
          </div>


          <div class="player-row">

            <span class="player-name ${
              p2IsWinner
                ? "winner-text"
                : ""
            }">

              ${escapeHTML(p2Name)}

            </span>

            <span class="player-score">
              ${Number(set.p2_score) || 0}
            </span>

          </div>

        </div>


        ${
          isCompleted
            ? `
              <div class="winner-announcement">
                🏆 Ganador:
                ${escapeHTML(winnerTag)}
              </div>
            `
            : `
              <div class="set-controls">

                <div class="control-row">

                  <input
                    type="number"
                    id="score-p1-${set.id}"
                    class="score-input"
                    min="0"
                    value="${Number(set.p1_score) || 0}"
                    placeholder="P1"
                  >

                  <input
                    type="number"
                    id="score-p2-${set.id}"
                    class="score-input"
                    min="0"
                    value="${Number(set.p2_score) || 0}"
                    placeholder="P2"
                  >

                </div>


                <select
                  id="stage-${set.id}"
                  class="stage-select"
                >

                  <option value="">
                    Seleccionar escenario
                  </option>

                  <option value="Battlefield">
                    Battlefield
                  </option>

                  <option value="Small Battlefield">
                    Small Battlefield
                  </option>

                  <option value="Final Destination">
                    Final Destination
                  </option>

                  <option value="Pokémon Stadium 2">
                    Pokémon Stadium 2
                  </option>

                  <option value="Smashville">
                    Smashville
                  </option>

                  <option value="Town and City">
                    Town and City
                  </option>

                  <option value="Hollow Bastion">
                    Hollow Bastion
                  </option>

                  <option value="Kalos Pokémon League">
                    Kalos Pokémon League
                  </option>

                </select>


                <div class="control-row">

                  <button
                    type="button"
                    id="btn-win-p1-${set.id}"
                    class="set-button btn-win"
                  >
                    🏆 Gana ${escapeHTML(p1Name)}
                  </button>


                  <button
                    type="button"
                    id="btn-win-p2-${set.id}"
                    class="set-button btn-win"
                  >
                    🏆 Gana ${escapeHTML(p2Name)}
                  </button>

                </div>


                <button
                  type="button"
                  id="btn-save-${set.id}"
                  class="set-button btn-save-score"
                >
                  💾 Guardar Marcador y Escenario
                </button>

              </div>
            `
        }

      `;


      container.appendChild(
        card
      );


      const btnWin1 =
        document.getElementById(
          `btn-win-p1-${set.id}`
        );


      const btnWin2 =
        document.getElementById(
          `btn-win-p2-${set.id}`
        );


      const btnSave =
        document.getElementById(
          `btn-save-${set.id}`
        );


      if (btnWin1) {

        btnWin1.onclick =
          () =>
            saveSetResult(
              set.id,
              set.player1_id,
              set.player1_id,
              set.player2_id
            );

      }


      if (btnWin2) {

        btnWin2.onclick =
          () =>
            saveSetResult(
              set.id,
              set.player2_id,
              set.player1_id,
              set.player2_id
            );

      }


      if (btnSave) {

        btnSave.onclick =
          () =>
            saveSetResult(
              set.id,
              null,
              set.player1_id,
              set.player2_id
            );

      }

    }
  );

}


/* =========================================================
   GUARDAR RESULTADO
   ========================================================= */

async function saveSetResult(
  setId,
  winnerId,
  player1Id,
  player2Id
) {

  try {

    const p1Input =
      document.getElementById(
        `score-p1-${setId}`
      );


    const p2Input =
      document.getElementById(
        `score-p2-${setId}`
      );


    const stageSelect =
      document.getElementById(
        `stage-${setId}`
      );


    const p1Score =
      p1Input
        ? parseInt(
            p1Input.value,
            10
          ) || 0
        : 0;


    const p2Score =
      p2Input
        ? parseInt(
            p2Input.value,
            10
          ) || 0
        : 0;


    const stageName =
      stageSelect
        ? stageSelect.value
        : "";


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "Guardando resultado...";

    }


    let finalStatus =
      "pending";


    let finalWinnerId =
      winnerId;


    if (winnerId) {

      finalStatus =
        "completed";

    } else {

      if (
        p1Score > 0 ||
        p2Score > 0
      ) {

        if (
          p1Score > p2Score &&
          p1Score >= 2
        ) {

          finalWinnerId =
            player1Id;

          finalStatus =
            "completed";

        } else if (
          p2Score > p1Score &&
          p2Score >= 2
        ) {

          finalWinnerId =
            player2Id;

          finalStatus =
            "completed";

        }

      }

    }


    const updateData = {

      p1_score:
        p1Score,

      p2_score:
        p2Score,

      status:
        finalStatus

    };


    if (finalWinnerId) {

      updateData.winner_id =
        finalWinnerId;

    }


    const {
      error: setErr
    } =
      await supabaseClient
        .from("tournament_sets")
        .update(updateData)
        .eq(
          "id",
          setId
        );


    if (setErr) {

      throw setErr;

    }


    /* GUARDAR ESCENARIO */

    if (stageName) {

      const {
        error: stageError
      } =
        await supabaseClient
          .from("stage_selections")
          .insert({

            set_id:
              setId,

            stage_name:
              stageName,

            status:
              "selected",

            action_by:
              finalWinnerId ||
              player1Id

          });


      if (stageError) {

        console.error(
          "Error al guardar escenario:",
          stageError
        );

      }

    }


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "¡Resultado actualizado!";

    }


    await loadBrackets();


  } catch (err) {

    console.error(
      "Error al guardar resultado:",
      err
    );


    alert(
      "No se pudo guardar el resultado: " +
      err.message
    );


    if (dashboardMessage) {

      dashboardMessage.textContent =
        "";

    }

  }

}


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   COMPROBAR SESIÓN
   ========================================================= */

async function checkSession() {

  initDOMElements();

  setupLoginForm();


  if (!supabaseClient) {

    console.error(
      "Supabase no pudo inicializarse."
    );

    return;

  }


  const {
    data
  } =
    await supabaseClient.auth.getSession();


  if (data?.session) {

    await verifyAdmin(
      data.session.user
    );

  } else {

    if (loginSection) {

      loginSection.style.display =
        "block";

    }


    if (dashboard) {

      dashboard.style.display =
        "none";

    }

  }

}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    checkSession
  );

} else {

  checkSession();

}