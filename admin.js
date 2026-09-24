const SUPABASE_URL =
  "https://gigcjdhnnjnrojentaev.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_gBHOBIn8vmrgFWZdT0cgVg_prdJJmNC";

const supabaseClient = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    )
  : null;


/* ==========================================
   VARIABLES
========================================== */

let loginForm;
let loginSection;
let dashboard;
let loginMessage;

let participantsContainer;
let participantCount;
let dashboardMessage;
let logoutButton;


/* ==========================================
   INICIALIZAR DOM
========================================== */

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
    document.getElementById(
      "participantsContainer"
    );

  participantCount =
    document.getElementById(
      "participantCount"
    );

  dashboardMessage =
    document.getElementById(
      "dashboardMessage"
    );

  logoutButton =
    document.getElementById(
      "logoutButton"
    );

  const btnGenerate =
    document.getElementById(
      "btn-generate-brackets"
    );

  const btnReset =
    document.getElementById(
      "btn-reset-brackets"
    );

  if (btnGenerate) {
    btnGenerate.onclick = generateBrackets;
  }

  if (btnReset) {
    btnReset.onclick = resetBrackets;
  }

  if (logoutButton) {

    logoutButton.onclick = async () => {

      await supabaseClient.auth.signOut();

      window.location.reload();

    };

  }
}


/* ==========================================
   LOGIN
========================================== */

function setupLoginForm() {

  if (!loginForm || !supabaseClient) {
    return;
  }

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const email =
        document.getElementById(
          "adminEmail"
        ).value.trim();

      const password =
        document.getElementById(
          "adminPassword"
        ).value;

      if (loginMessage) {
        loginMessage.textContent =
          "Verificando acceso...";
      }

      const { data, error } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {

        if (loginMessage) {
          loginMessage.textContent =
            "Error: " +
            error.message;
        }

        return;
      }

      if (data?.user) {
        await verifyAdmin(data.user);
      }

    }
  );
}


/* ==========================================
   VERIFICAR ADMIN
========================================== */

async function verifyAdmin(user) {

  const { data, error } =
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

  loginSection.style.display = "none";
  dashboard.style.display = "block";

  initDOMElements();

  await loadParticipants();
  await loadBrackets();
}


/* ==========================================
   PARTICIPANTES
========================================== */

async function loadParticipants() {

  setMessage(
    "Cargando participantes..."
  );

  const { data, error } =
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

    setMessage(
      "No se pudieron cargar los participantes."
    );

    return;
  }

  participantCount.textContent =
    data?.length || 0;

  participantsContainer.innerHTML = "";

  if (!data || data.length === 0) {

    participantsContainer.innerHTML =
      `<div class="empty-msg">
        No hay participantes registrados todavía.
      </div>`;

    setMessage("");

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
          ${escapeHTML(
            participant.espiritu
          )}
        </p>
      `;

      const deleteBtn =
        document.createElement(
          "button"
        );

      deleteBtn.className =
        "btn-danger";

      deleteBtn.style.width = "100%";
      deleteBtn.style.marginTop = "12px";

      deleteBtn.textContent =
        "ELIMINAR";

      deleteBtn.onclick =
        () =>
          deleteParticipant(
            participant.id,
            participant.gamertag
          );

      card.appendChild(deleteBtn);

      participantsContainer.appendChild(
        card
      );

    }
  );

  setMessage("");
}


/* ==========================================
   ELIMINAR PARTICIPANTE
========================================== */

async function deleteParticipant(
  id,
  gamertag
) {

  const confirmed =
    confirm(
      `¿Deseas eliminar a "${gamertag}"?`
    );

  if (!confirmed) {
    return;
  }

  try {

    setMessage(
      "Eliminando participante..."
    );

    const { error } =
      await supabaseClient
        .from("participants")
        .delete()
        .eq("id", id);

    if (error) {
      throw error;
    }

    await loadParticipants();
    await loadBrackets();

    setMessage(
      `Participante "${gamertag}" eliminado.`
    );

  } catch (error) {

    console.error(error);

    alert(
      "No se pudo eliminar: " +
      error.message
    );

    setMessage("");
  }
}


/* ==========================================
   GENERAR BRACKET
========================================== */

async function generateBrackets() {

  const confirmed =
    confirm(
      "¿Deseas generar un nuevo bracket? " +
      "Esto eliminará el bracket actual."
    );

  if (!confirmed) {
    return;
  }

  try {

    setMessage(
      "Generando doble eliminación..."
    );

    const {
      data: participants,
      error
    } =
      await supabaseClient
        .from("participants")
        .select("id, gamertag")
        .order(
          "created_at",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    if (
      !participants ||
      participants.length < 4
    ) {

      alert(
        "Se necesitan al menos 4 participantes."
      );

      setMessage("");

      return;
    }

    if (participants.length > 32) {

      alert(
        "Esta versión admite hasta 32 participantes."
      );

      setMessage("");

      return;
    }


    /*
      Para mantener el formato estándar de Smash,
      el bracket se redondea a 4, 8, 16 o 32.
    */

    const bracketSize =
      nextPowerOfTwo(
        participants.length
      );

    if (bracketSize < 4) {
      throw new Error(
        "El bracket mínimo es de 4 participantes."
      );
    }


    await supabaseClient
      .from("tournament_sets")
      .delete()
      .not("id", "is", null);


    await supabaseClient
      .from("tournament_state")
      .delete()
      .not("id", "is", null);


    const plan =
      buildDoubleEliminationPlan(
        participants,
        bracketSize
      );


    const {
      error: insertError
    } =
      await supabaseClient
        .from("tournament_sets")
        .insert(plan.matches);

    if (insertError) {
      throw insertError;
    }


    await supabaseClient
      .from("tournament_state")
      .insert({
        id: 1,
        status: "in_progress",
        champion_id: null
      });


    await resolveInitialByes();

    await loadBrackets();

    setMessage(
      "¡Bracket de doble eliminación generado!"
    );

  } catch (error) {

    console.error(
      "Error generando bracket:",
      error
    );

    alert(
      "Error generando bracket:\n" +
      error.message
    );

    setMessage("");
  }
}


/* ==========================================
   CONSTRUIR BRACKET
========================================== */

function buildDoubleEliminationPlan(
  participants,
  size
) {

  const matches = [];

  const winnersRounds = [];

  const losersRounds = [];

  const winnersRoundCount =
    Math.log2(size);

  let displayNumber = 1;


  /*
    Orden de seeds estándar.
    Ejemplo 8:
    1,8,4,5,2,7,3,6
  */

  const seedOrder =
    generateSeedOrder(size);


  /*
    WINNERS
  */

  for (
    let round = 1;
    round <= winnersRoundCount;
    round++
  ) {

    const count =
      size /
      Math.pow(2, round);

    const currentRound = [];

    for (
      let i = 0;
      i < count;
      i++
    ) {

      const id =
        crypto.randomUUID();

      const match = {

        id,

        bracket_type:
          "winners",

        bracket_round:
          round,

        round_number:
          round,

        match_number:
          displayNumber++,

        player1_id: null,
        player2_id: null,

        p1_score: 0,
        p2_score: 0,

        best_of:
          round === winnersRoundCount
            ? 5
            : 3,

        status:
          "pending",

        winner_id: null,
        loser_id: null,

        next_match_winner_id:
          null,

        next_match_winner_slot:
          null,

        next_match_loser_id:
          null,

        next_match_loser_slot:
          null,

        stage_name:
          null,

        is_reset:
          false
      };


      /*
        Primera ronda:
        colocar participantes.
      */

      if (round === 1) {

        const seed1 =
          seedOrder[i * 2];

        const seed2 =
          seedOrder[i * 2 + 1];

        match.player1_id =
          participants[
            seed1 - 1
          ]?.id
          ? String(
              participants[
                seed1 - 1
              ].id
            )
          : null;

        match.player2_id =
          participants[
            seed2 - 1
          ]?.id
          ? String(
              participants[
                seed2 - 1
              ].id
            )
          : null;
      }


      currentRound.push(
        match
      );

      matches.push(match);
    }

    winnersRounds.push(
      currentRound
    );
  }


  /*
    CONEXIONES WINNERS
  */

  for (
    let round = 0;
    round < winnersRoundCount;
    round++
  ) {

    const current =
      winnersRounds[round];

    const next =
      winnersRounds[round + 1];


    current.forEach(
      (match, index) => {

        /*
          GANADOR → siguiente Winners
        */

        if (next) {

          const destination =
            next[
              Math.floor(index / 2)
            ];

          match.next_match_winner_id =
            destination.id;

          match.next_match_winner_slot =
            index % 2 === 0
              ? 1
              : 2;
        }


        /*
          PERDEDOR → LOSERS
        */

        if (round === 0) {

          const loserRound =
            losersRounds[0];

          if (loserRound) {

            const destination =
              loserRound[
                Math.floor(index / 2)
              ];

            match.next_match_loser_id =
              destination.id;

            match.next_match_loser_slot =
              index % 2 === 0
                ? 1
                : 2;
          }

        } else {

          const loserRoundIndex =
            round * 2 - 1;

          const loserRound =
            losersRounds[
              loserRoundIndex
            ];

          if (loserRound) {

            /*
              Se invierte el orden de entrada
              para evitar rematches inmediatos.
            */

            const destination =
              loserRound[
                loserRound.length -
                1 -
                index
              ];

            match.next_match_loser_id =
              destination.id;

            match.next_match_loser_slot =
              1;
          }
        }

      }
    );
  }


  /*
    LOSERS
  */

  const loserRoundCount =
    winnersRoundCount * 2 - 2;


  for (
    let round = 1;
    round <= loserRoundCount;
    round++
  ) {

    const count =
      size /
      Math.pow(
        2,
        Math.ceil(
          round / 2
        ) + 1
      );

    const currentRound = [];

    for (
      let i = 0;
      i < count;
      i++
    ) {

      const match = {

        id:
          crypto.randomUUID(),

        bracket_type:
          "losers",

        bracket_round:
          round,

        round_number:
          round,

        match_number:
          displayNumber++,

        player1_id: null,
        player2_id: null,

        p1_score: 0,
        p2_score: 0,

        best_of:
          round === loserRoundCount
            ? 5
            : 3,

        status:
          "pending",

        winner_id: null,
        loser_id: null,

        next_match_winner_id:
          null,

        next_match_winner_slot:
          null,

        next_match_loser_id:
          null,

        next_match_loser_slot:
          null,

        stage_name:
          null,

        is_reset:
          false
      };

      currentRound.push(match);

      matches.push(match);
    }

    losersRounds.push(
      currentRound
    );
  }


  /*
    CONEXIONES LOSERS
  */

  for (
    let r = 0;
    r < losersRounds.length;
    r++
  ) {

    const current =
      losersRounds[r];

    const next =
      losersRounds[r + 1];


    current.forEach(
      (match, index) => {

        if (!next) {
          return;
        }


        if (
          (r + 1) % 2 === 1
        ) {

          /*
            Round impar:
            Losers vs Losers
          */

          const destination =
            next[
              Math.floor(index / 2)
            ];

          match.next_match_winner_id =
            destination.id;

          match.next_match_winner_slot =
            index % 2 === 0
              ? 1
              : 2;

        } else {

          /*
            Round par:
            survivor vs drop-in de Winners
          */

          const destination =
            next[
              Math.floor(index / 2)
            ];

          match.next_match_winner_id =
            destination.id;

          match.next_match_winner_slot =
            index % 2 === 0
              ? 1
              : 2;
        }

      }
    );
  }


  /*
    GRAND FINALS
  */

  const winnersFinal =
    winnersRounds[
      winnersRounds.length - 1
    ][0];

  const losersFinal =
    losersRounds[
      losersRounds.length - 1
    ][0];


  const grandFinal1 = {

    id:
      crypto.randomUUID(),

    bracket_type:
      "grand_finals",

    bracket_round:
      1,

    round_number:
      1,

    match_number:
      displayNumber++,

    player1_id:
      null,

    player2_id:
      null,

    p1_score: 0,
    p2_score: 0,

    best_of: 5,

    status:
      "pending",

    winner_id: null,
    loser_id: null,

    next_match_winner_id:
      null,

    next_match_winner_slot:
      null,

    next_match_loser_id:
      null,

    next_match_loser_slot:
      null,

    stage_name:
      null,

    is_reset:
      false
  };


  const grandFinal2 = {

    id:
      crypto.randomUUID(),

    bracket_type:
      "grand_finals",

    bracket_round:
      2,

    round_number:
      2,

    match_number:
      displayNumber++,

    player1_id:
      null,

    player2_id:
      null,

    p1_score: 0,
    p2_score: 0,

    best_of: 5,

    status:
      "locked",

    winner_id: null,
    loser_id: null,

    next_match_winner_id:
      null,

    next_match_winner_slot:
      null,

    next_match_loser_id:
      null,

    next_match_loser_slot:
      null,

    stage_name:
      null,

    is_reset:
      true
  };


  winnersFinal.next_match_winner_id =
    grandFinal1.id;

  winnersFinal.next_match_winner_slot =
    1;


  losersFinal.next_match_winner_id =
    grandFinal1.id;

  losersFinal.next_match_winner_slot =
    2;


  winnersFinal.next_match_loser_id =
    losersFinal.id;

  winnersFinal.next_match_loser_slot =
    2;


  grandFinal1.next_match_winner_id =
    grandFinal2.id;

  grandFinal1.next_match_winner_slot =
    1;


  matches.push(
    grandFinal1,
    grandFinal2
  );


  return {
    matches
  };
}


/* ==========================================
   ORDEN DE SEEDS
========================================== */

function generateSeedOrder(size) {

  let order = [1];

  for (
    let current = 2;
    current <= size;
    current *= 2
  ) {

    const next = [];

    const max = current;

    order.forEach(
      seed => {

        next.push(seed);

        next.push(
          max + 1 - seed
        );

      }
    );

    order = next;
  }

  return order;
}


/* ==========================================
   BYES
========================================== */

async function resolveInitialByes() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("tournament_sets")
      .select("*")
      .eq(
        "bracket_type",
        "winners"
      )
      .eq(
        "bracket_round",
        1
      );

  if (error) {
    throw error;
  }

  for (const match of data || []) {

    if (
      match.player1_id &&
      !match.player2_id
    ) {

      await completeBye(
        match,
        match.player1_id
      );

    } else if (
      !match.player1_id &&
      match.player2_id
    ) {

      await completeBye(
        match,
        match.player2_id
      );

    }
  }
}


async function completeBye(
  match,
  playerId
) {

  await supabaseClient
    .from("tournament_sets")
    .update({
      status: "completed",
      winner_id: playerId,
      loser_id: null,
      p1_score:
        match.player1_id
          ? 1
          : 0,
      p2_score:
        match.player2_id
          ? 1
          : 0
    })
    .eq(
      "id",
      match.id
    );

  await advanceWinnerAndLoser(
    match.id,
    playerId,
    null
  );
}


/* ==========================================
   ACTUALIZAR SCORE
========================================== */

async function updateMatchScore(
  matchId,
  player1Score,
  player2Score
) {

  const p1 =
    Math.max(
      0,
      parseInt(
        player1Score,
        10
      ) || 0
    );

  const p2 =
    Math.max(
      0,
      parseInt(
        player2Score,
        10
      ) || 0
    );


  const { data: match, error } =
    await supabaseClient
      .from("tournament_sets")
      .select("best_of,status")
      .eq(
        "id",
        matchId
      )
      .single();

  if (error) {
    throw error;
  }


  if (
    match.status === "completed"
  ) {
    return;
  }


  const target =
    match.best_of === 5
      ? 3
      : 2;


  let status = "in_progress";


  if (
    p1 >= target ||
    p2 >= target
  ) {
    status = "completed";
  }


  const { error: updateError } =
    await supabaseClient
      .from("tournament_sets")
      .update({
        p1_score: p1,
        p2_score: p2,
        status
      })
      .eq(
        "id",
        matchId
      );

  if (updateError) {
    throw updateError;
  }

  return {
    player1Score: p1,
    player2Score: p2,
    completed:
      status === "completed"
  };
}


/* ==========================================
   GUARDAR SET
========================================== */

async function saveSet(
  matchId
) {

  try {

    const p1Input =
      document.getElementById(
        `score-p1-${matchId}`
      );

    const p2Input =
      document.getElementById(
        `score-p2-${matchId}`
      );

    const format =
      document.getElementById(
        `format-${matchId}`
      );

    const stage =
      document.getElementById(
        `stage-${matchId}`
      );


    const p1 =
      parseInt(
        p1Input?.value || 0,
        10
      );

    const p2 =
      parseInt(
        p2Input?.value || 0,
        10
      );


    const bestOf =
      parseInt(
        format?.value || 3,
        10
      );


    const target =
      bestOf === 5
        ? 3
        : 2;


    if (
      (p1 !== target &&
        p2 !== target) ||
      p1 === p2
    ) {

      alert(
        `El marcador debe terminar en ${target} para el ganador.`
      );

      return;
    }


    if (
      (p1 > target) ||
      (p2 > target)
    ) {

      alert(
        "El marcador no puede superar el límite del formato."
      );

      return;
    }


    await supabaseClient
      .from("tournament_sets")
      .update({
        best_of: bestOf,
        stage_name:
          stage?.value || null
      })
      .eq(
        "id",
        matchId
      );


    await updateMatchScore(
      matchId,
      p1,
      p2
    );


    const {
      data: match,
      error
    } =
      await supabaseClient
        .from("tournament_sets")
        .select("*")
        .eq(
          "id",
          matchId
        )
        .single();

    if (error) {
      throw error;
    }


    const winnerId =
      p1 > p2
        ? match.player1_id
        : match.player2_id;

    const loserId =
      p1 > p2
        ? match.player2_id
        : match.player1_id;


    await advanceWinnerAndLoser(
      matchId,
      winnerId,
      loserId
    );


    if (
      match.bracket_type ===
      "grand_finals"
    ) {

      await handleGrandFinals(
        matchId,
        winnerId,
        winnerId ===
          match.player2_id
      );

    }


    await loadBrackets();

    setMessage(
      "¡Set guardado correctamente!"
    );

  } catch (error) {

    console.error(error);

    alert(
      "No se pudo guardar el set:\n" +
      error.message
    );
  }
}


/* ==========================================
   DECLARAR GANADOR MANUALMENTE
========================================== */

async function declareWinner(
  matchId,
  playerNumber
) {

  const {
    data: match,
    error
  } =
    await supabaseClient
      .from("tournament_sets")
      .select("*")
      .eq(
        "id",
        matchId
      )
      .single();

  if (error) {
    alert(error.message);
    return;
  }


  const target =
    match.best_of === 5
      ? 3
      : 2;


  const winnerId =
    playerNumber === 1
      ? match.player1_id
      : match.player2_id;

  const loserId =
    playerNumber === 1
      ? match.player2_id
      : match.player1_id;


  if (!winnerId || !loserId) {
    return;
  }


  const scores =
    playerNumber === 1
      ? {
          p1_score: target,
          p2_score: 0
        }
      : {
          p1_score: 0,
          p2_score: target
        };


  await supabaseClient
    .from("tournament_sets")
    .update({
      ...scores,
      status: "completed",
      winner_id: winnerId,
      loser_id: loserId
    })
    .eq(
      "id",
      matchId
    );


  await advanceWinnerAndLoser(
    matchId,
    winnerId,
    loserId
  );


  if (
    match.bracket_type ===
    "grand_finals"
  ) {

    await handleGrandFinals(
      matchId,
      winnerId,
      winnerId ===
        match.player2_id
    );

  }


  await loadBrackets();
}


/* ==========================================
   AVANCE WINNER / LOSER
========================================== */

async function advanceWinnerAndLoser(
  matchId,
  winnerId,
  loserId
) {

  const {
    data: match,
    error
  } =
    await supabaseClient
      .from("tournament_sets")
      .select("*")
      .eq(
        "id",
        matchId
      )
      .single();

  if (error) {
    throw error;
  }


  await supabaseClient
    .from("tournament_sets")
    .update({
      winner_id:
        winnerId || null,

      loser_id:
        loserId || null,

      status:
        "completed"
    })
    .eq(
      "id",
      matchId
    );


  /*
    WINNER
  */

  if (
    winnerId &&
    match.next_match_winner_id
  ) {

    await putPlayerInMatch(
      match.next_match_winner_id,
      match.next_match_winner_slot,
      winnerId
    );

  }


  /*
    LOSER
  */

  if (
    loserId &&
    match.next_match_loser_id
  ) {

    await putPlayerInMatch(
      match.next_match_loser_id,
      match.next_match_loser_slot,
      loserId
    );

  }


  /*
    Si perdió en Losers,
    queda eliminado.
  */

  if (
    loserId &&
    match.bracket_type ===
    "losers" &&
    !match.next_match_loser_id
  ) {

    console.log(
      "Jugador eliminado:",
      loserId
    );
  }
}


/* ==========================================
   COLOCAR JUGADOR EN SIGUIENTE SET
========================================== */

async function putPlayerInMatch(
  matchId,
  slot,
  playerId
) {

  if (!matchId || !playerId) {
    return;
  }


  const {
    data: destination,
    error
  } =
    await supabaseClient
      .from("tournament_sets")
      .select(
        "player1_id,player2_id,status"
      )
      .eq(
        "id",
        matchId
      )
      .single();

  if (error) {
    throw error;
  }


  const field =
    slot === 1
      ? "player1_id"
      : "player2_id";


  /*
    No sobrescribir un jugador
    que ya llegó correctamente.
  */

  if (
    destination[field] &&
    String(
      destination[field]
    ) !== String(playerId)
  ) {

    throw new Error(
      "Error de bracket: el espacio ya está ocupado."
    );
  }


  await supabaseClient
    .from("tournament_sets")
    .update({
      [field]:
        String(playerId),

      status:
        destination.status ===
        "locked"
          ? "pending"
          : destination.status
    })
    .eq(
      "id",
      matchId
    );
}


/* ==========================================
   GRAND FINALS
========================================== */

async function handleGrandFinals(
  matchId,
  winnerId,
  isLoserChampion
) {

  const {
    data: match,
    error
  } =
    await supabaseClient
      .from("tournament_sets")
      .select("*")
      .eq(
        "id",
        matchId
      )
      .single();

  if (error) {
    throw error;
  }


  /*
    GF1
  */

  if (
    match.bracket_round === 1
  ) {

    /*
      Ganó el jugador que venía
      de Losers.
    */

    if (isLoserChampion) {

      const {
        data: reset
      } =
        await supabaseClient
          .from("tournament_sets")
          .select("*")
          .eq(
            "is_reset",
            true
          )
          .single();


      if (reset) {

        await supabaseClient
          .from("tournament_sets")
          .update({
            player1_id:
              match.player1_id,

            player2_id:
              match.player2_id,

            status:
              "pending",

            p1_score: 0,
            p2_score: 0,

            winner_id: null,
            loser_id: null
          })
          .eq(
            "id",
            reset.id
          );

        setMessage(
          "🔥 BRACKET RESET ACTIVADO — GRAND FINALS SET 2"
        );
      }

      return;
    }


    /*
      Ganó el Winners Champion.
      TORNEO TERMINADO.
    */

    await finishTournament(
      winnerId
    );

    return;
  }


  /*
    GF2
  */

  if (
    match.bracket_round === 2
  ) {

    await finishTournament(
      winnerId
    );
  }
}


/* ==========================================
   TERMINAR TORNEO
========================================== */

async function finishTournament(
  championId
) {

  await supabaseClient
    .from("tournament_state")
    .upsert({
      id: 1,
      status: "completed",
      champion_id:
        String(championId)
    });

  setMessage(
    "🏆 ¡TORNEO FINALIZADO!"
  );
}


/* ==========================================
   RESET
========================================== */

async function resetBrackets() {

  const confirmed =
    confirm(
      "¿Seguro que deseas resetear TODO el bracket?"
    );

  if (!confirmed) {
    return;
  }


  try {

    setMessage(
      "Reseteando brackets..."
    );


    await supabaseClient
      .from("tournament_sets")
      .delete()
      .not(
        "id",
        "is",
        null
      );


    await supabaseClient
      .from("tournament_state")
      .delete()
      .not(
        "id",
        "is",
        null
      );


    await loadBrackets();


    setMessage(
      "Brackets reseteados."
    );

  } catch (error) {

    console.error(error);

    alert(
      "No se pudieron resetear:\n" +
      error.message
    );

  }
}


/* ==========================================
   CARGAR BRACKETS
========================================== */

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
          "match_number",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }


    const {
      data: participants
    } =
      await supabaseClient
        .from("participants")
        .select(
          "id,gamertag"
        );


    const participantMap = {};


    (participants || [])
      .forEach(
        participant => {

          participantMap[
            String(
              participant.id
            )
          ] = participant;

        }
      );


    const enriched =
      (sets || []).map(
        set => ({

          ...set,

          player1:
            participantMap[
              String(
                set.player1_id
              )
            ] || null,

          player2:
            participantMap[
              String(
                set.player2_id
              )
            ] || null,

          winner:
            participantMap[
              String(
                set.winner_id
              )
            ] || null

        })
      );


    const winners =
      document.getElementById(
        "winners-container"
      );

    const losers =
      document.getElementById(
        "losers-container"
      );

    const finals =
      document.getElementById(
        "grand-finals-container"
      );


    winners.innerHTML = "";
    losers.innerHTML = "";
    finals.innerHTML = "";


    renderSetsList(
      enriched.filter(
        set =>
          set.bracket_type ===
          "winners"
      ),
      winners
    );


    renderSetsList(
      enriched.filter(
        set =>
          set.bracket_type ===
          "losers"
      ),
      losers
    );


    renderSetsList(
      enriched.filter(
        set =>
          set.bracket_type ===
          "grand_finals"
      ),
      finals
    );


  } catch (error) {

    console.error(
      "Error cargando brackets:",
      error
    );
  }
}


/* ==========================================
   RENDER SETS
========================================== */

function renderSetsList(
  sets,
  container
) {

  if (
    !sets ||
    sets.length === 0
  ) {

    container.innerHTML =
      `<div class="empty-msg">
        Sin enfrentamientos en esta sección.
      </div>`;

    return;
  }


  sets.forEach(
    set => {

      const card =
        document.createElement(
          "article"
        );

      const completed =
        set.status ===
        "completed";

      const inProgress =
        set.status ===
        "in_progress";

      const locked =
        set.status ===
        "locked";


      card.className =
        "set-card" +
        (completed
          ? " completed"
          : "") +
        (set.is_reset
          ? " reset-match"
          : "");


      const p1Name =
        set.player1
          ? set.player1.gamertag
          : "TBD";

      const p2Name =
        set.player2
          ? set.player2.gamertag
          : "TBD";


      const statusClass =
        completed
          ? "status-completed"
          : inProgress
          ? "status-progress"
          : "status-pending";


      const statusText =
        completed
          ? "FINALIZADO"
          : inProgress
          ? "EN CURSO"
          : locked
          ? "BLOQUEADO"
          : "PENDIENTE";


      const target =
        set.best_of === 5
          ? 3
          : 2;


      const editable =
        !completed &&
        !locked &&
        set.player1 &&
        set.player2;


      card.innerHTML = `

        <div class="set-top">

          <span class="set-round">
            ${
              set.is_reset
                ? "🔥 GRAND FINALS RESET"
                : `RONDA ${set.bracket_round}`
            }
          </span>

          <span class="set-status ${statusClass}">
            ${statusText}
          </span>

        </div>


        <div class="players-row">

          <div class="player ${
            set.winner_id ===
            set.player1_id
              ? "winner"
              : ""
          }">

            <span class="player-name">
              ${escapeHTML(p1Name)}
            </span>

            ${
              editable
                ? `
                <div class="score-controls">

                  <button
                    class="score-btn"
                    onclick="changeScore('${set.id}', 1, -1)"
                  >
                    −
                  </button>

                  <input
                    id="score-p1-${set.id}"
                    class="score-input"
                    type="number"
                    min="0"
                    max="${target}"
                    value="${set.p1_score || 0}"
                  >

                  <button
                    class="score-btn"
                    onclick="changeScore('${set.id}', 1, 1)"
                  >
                    +
                  </button>

                </div>
              `
                : ""
            }

          </div>


          <div class="vs">
            VS
          </div>


          <div class="player ${
            set.winner_id ===
            set.player2_id
              ? "winner"
              : ""
          }">

            <span class="player-name">
              ${escapeHTML(p2Name)}
            </span>

            ${
              editable
                ? `
                <div class="score-controls">

                  <button
                    class="score-btn"
                    onclick="changeScore('${set.id}', 2, -1)"
                  >
                    −
                  </button>

                  <input
                    id="score-p2-${set.id}"
                    class="score-input"
                    type="number"
                    min="0"
                    max="${target}"
                    value="${set.p2_score || 0}"
                  >

                  <button
                    class="score-btn"
                    onclick="changeScore('${set.id}', 2, 1)"
                  >
                    +
                  </button>

                </div>
              `
                : ""
            }

          </div>

        </div>


        ${
          completed
            ? `
              <div class="completed-result">

                🏆 Ganador:
                ${escapeHTML(
                  set.winner?.gamertag ||
                  "Desconocido"
                )}

                <br>

                Marcador:
                ${set.p1_score} -
                ${set.p2_score}

              </div>
            `
            : editable
            ? `

              <div class="set-options">

                <div class="set-option">

                  <label>
                    FORMATO
                  </label>

                  <select
                    id="format-${set.id}"
                  >

                    <option
                      value="3"
                      ${
                        set.best_of === 3
                          ? "selected"
                          : ""
                      }
                    >
                      BO3
                    </option>

                    <option
                      value="5"
                      ${
                        set.best_of === 5
                          ? "selected"
                          : ""
                      }
                    >
                      BO5
                    </option>

                  </select>

                </div>


                <div class="set-option">

                  <label>
                    ESCENARIO
                  </label>

                  <select
                    id="stage-${set.id}"
                  >

                    <option value="">
                      Seleccionar
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

                    <option value="Pokemon Stadium 2">
                      Pokémon Stadium 2
                    </option>

                    <option value="Smashville">
                      Smashville
                    </option>

                    <option value="Town and City">
                      Town & City
                    </option>

                    <option value="Hollow Bastion">
                      Hollow Bastion
                    </option>

                    <option value="Kalos Pokemon League">
                      Kalos Pokémon League
                    </option>

                  </select>

                </div>

              </div>


              <div class="set-actions">

                <button
                  class="btn-win"
                  onclick="declareWinner('${set.id}', 1)"
                >
                  🏆 GANADOR ${escapeHTML(p1Name)}
                </button>

                <button
                  class="btn-win"
                  onclick="declareWinner('${set.id}', 2)"
                >
                  🏆 GANADOR ${escapeHTML(p2Name)}
                </button>

                <button
                  class="btn-save"
                  onclick="saveSet('${set.id}')"
                >
                  💾 GUARDAR SET Y AVANZAR
                </button>

              </div>

            `
            : `
              <div class="completed-result">
                Esperando jugadores...
              </div>
            `
        }

      `;

      container.appendChild(card);

    }
  );
}


/* ==========================================
   CAMBIAR SCORE
========================================== */

function changeScore(
  matchId,
  player,
  amount
) {

  const input =
    document.getElementById(
      player === 1
        ? `score-p1-${matchId}`
        : `score-p2-${matchId}`
    );

  if (!input) {
    return;
  }


  const format =
    document.getElementById(
      `format-${matchId}`
    );


  const max =
    format?.value === "5"
      ? 3
      : 2;


  let value =
    parseInt(
      input.value || 0,
      10
    );


  value += amount;


  value =
    Math.max(
      0,
      Math.min(
        max,
        value
      )
    );


  input.value = value;
}


/* ==========================================
   ESCAPE HTML
========================================== */

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


/* ==========================================
   UTILIDADES
========================================== */

function nextPowerOfTwo(
  number
) {

  let value = 1;

  while (
    value < number
  ) {
    value *= 2;
  }

  return value;
}


function setMessage(
  message
) {

  if (
    dashboardMessage
  ) {
    dashboardMessage.textContent =
      message;
  }
}


/* ==========================================
   SESIÓN
========================================== */

async function checkSession() {

  initDOMElements();

  setupLoginForm();


  if (!supabaseClient) {

    console.error(
      "Supabase no está disponible."
    );

    return;
  }


  const {
    data
  } =
    await supabaseClient.auth
      .getSession();


  if (
    data?.session
  ) {

    await verifyAdmin(
      data.session.user
    );

  } else {

    loginSection.style.display =
      "block";

    dashboard.style.display =
      "none";
  }
}


/* ==========================================
   INICIO
========================================== */

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