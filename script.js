
const participantForm = document.getElementById("participantForm") || document.querySelector("form");
const successMessage = document.getElementById("successMessage");

if (participantForm) {
  participantForm.addEventListener("submit", async function (event) {
    event.preventDefault();

   
    const formData = new FormData(participantForm);

    const participante = {
      nombre: formData.get("nombre"),
      gamertag: formData.get("gamertag"),
      correo: formData.get("correo"),
      edad: Number(formData.get("edad")),
      personaje: formData.get("personaje"),
      ciudad: formData.get("ciudad"),
      espiritu: formData.get("espiritu")
    };

    if (successMessage) {
      successMessage.textContent = "Enviando inscripción...";
    }

    // 3. Insertar en Supabase
    const { error } = await supabaseClient
      .from("participants")
      .insert([participante]);

    if (error) {
      console.error(error);
      if (successMessage) {
        successMessage.textContent = "No se pudo completar el registro. Intenta nuevamente.";
      }
      return;
    }

    if (successMessage) {
      successMessage.textContent = "¡Registro completado correctamente!";
    }

    // 4. Limpiar el formulario usando la variable correcta
    participantForm.reset();
  });
}
async function searchPlayerMatches() {
  const searchInput = document.getElementById("playerSearchInput").value.trim();
  const container = document.getElementById("playerSetsContainer");

  if (!searchInput) {
    container.innerHTML = "<p>Ingresa un nombre o gamertag para buscar.</p>";
    return;
  }
  container.innerHTML = "<p>Cargando tus enfrentamientos...</p>";

  try {
    const { data: participant, error: partErr } = await supabaseClient
      .from("participants")
      .select("id, gamertag")
      .ilike("gamertag", searchInput)
      .maybeSingle();

    if (partErr) throw partErr;

    if (!participant) {
      container.innerHTML = `<p>No se encontró ningún participante con el Gamertag "${searchInput}".</p>`;
      return;
    }

    const { data: sets, error: setsErr } = await supabaseClient
      .from("tournament_sets")
      .select(`
        *,
        player1:player1_id(id, gamertag),
        player2:player2_id(id, gamertag),
        winner:winner_id(id, gamertag)
      `)
      .or(`player1_id.eq.${participant.id},player2_id.eq.${participant.id}`)
      .order("round_number", { ascending: true });

    if (setsErr) throw setsErr;

    if (!sets || sets.length === 0) {
      container.innerHTML = `<p>Hola ${participant.gamertag}, aún no tienes partidas asignadas en la bracket.</p>`;
      return;
    }

    container.innerHTML = `<p>Partidas de ${participant.gamertag}:</p>`;

    sets.forEach((set) => {
      const p1 = set.player1 ? set.player1.gamertag : "TBD";
      const p2 = set.player2 ? set.player2.gamertag : "TBD";
      const bracketName = set.bracket_type === "winners" ? "🏆 Winner's Bracket" : "🔥 Loser's Bracket";
      const card = document.createElement("div");

      card.style = "background: #0b0c10; padding: 15px; border-radius: 6px; border-left: 4px solid #66fcf1; margin-bottom: 12px; max-width: 500px;";
      card.innerHTML = `
        <strong>${bracketName} — Ronda ${set.round_number}</strong>
        <p>${p1} vs ${p2}</p>
        <p>Estado: ${set.status === "completed" ? "Finalizada" : "Pendiente"}</p>
        ${set.winner ? `<p>🏆 Ganador: ${set.winner.gamertag}</p>` : ""}
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error al buscar partidas del jugador:", err.message);
    container.innerHTML = "<p>Ocurrió un error al consultar tus partidas.</p>";
  }
}

async function renderPublicBrackets() {
  const { data: sets, error } = await supabase
    .from('tournament_sets')
    .select(`
      id,
      bracket_round,
      match_number,
      player1_score,
      player2_score,
      status,
      winner_id,
      player1:participants!tournament_sets_player1_id_fkey(id, name),
      player2:participants!tournament_sets_player2_id_fkey(id, name)
    `)
    .order('match_number', { ascending: true });

  if (error || !sets) {
    console.error('Error cargando brackets:', error);
    return;
  }

  // Clasificar enfrentamientos según la ronda
  const winnersSets = sets.filter(s => s.bracket_round && s.bracket_round.toLowerCase().includes('winner'));
  const losersSets = sets.filter(s => s.bracket_round && s.bracket_round.toLowerCase().includes('loser'));
  const grandFinalSets = sets.filter(s => s.bracket_round && s.bracket_round.toLowerCase().includes('grand final'));

  const winnersFinished = winnersSets.length > 0 && winnersSets.every(s => s.status === 'completed');
  const losersFinished = losersSets.length > 0 && losersSets.every(s => s.status === 'completed');

  // Si Winners y Losers están completos, oculta ambos y muestra la Grand Final
  if (winnersFinished && losersFinished && grandFinalSets.length > 0) {
    document.getElementById('winnersSection').style.display = 'none';
    document.getElementById('losersSection').style.display = 'none';
    document.getElementById('grandFinalsSection').style.display = 'block';

    renderGrandFinalsClash(grandFinalSets[0]);
  } else {
    document.getElementById('winnersSection').style.display = 'block';
    document.getElementById('losersSection').style.display = 'block';
    document.getElementById('grandFinalsSection').style.display = 'none';

    renderTree('winnersTree', winnersSets);
    renderTree('losersTree', losersSets);
  }
}

// Renderiza la vista de árbol (Winners / Losers)
function renderTree(containerId, sets) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const roundsMap = {};
  sets.forEach(s => {
    const rName = s.bracket_round || 'Ronda';
    if (!roundsMap[rName]) roundsMap[rName] = [];
    roundsMap[rName].push(s);
  });

  Object.keys(roundsMap).forEach(rName => {
    const roundCol = document.createElement('div');
    roundCol.className = 'bracket-round';

    const title = document.createElement('div');
    title.className = 'round-name';
    title.innerText = rName;
    roundCol.appendChild(title);

    roundsMap[rName].forEach(set => {
      const p1Name = set.player1 ? set.player1.name : 'Por determinar';
      const p2Name = set.player2 ? set.player2.name : 'Por determinar';
      const isP1Win = set.winner_id && set.player1 && set.winner_id === set.player1.id;
      const isP2Win = set.winner_id && set.player2 && set.winner_id === set.player2.id;

      const node = document.createElement('div');
      node.className = `match-node ${set.status || ''}`;
      node.innerHTML = `
        < div class="player-slot ${isP1Win ? 'winner' : ''}" >
          < span >${p1Name}< /span >
          < span class="player-score" >${set.player1_score || 0}< /span >
        < /div >
        < div class="player-slot ${isP2Win ? 'winner' : ''}" >
          < span >${p2Name}< /span >
          < span class="player-score" >${set.player2_score || 0}< /span >
        < /div >
      `;
      roundCol.appendChild(node);
    });

    container.appendChild(roundCol);
  });
}

// Renderiza el choque frontal cara a cara (Grand Finals)
function renderGrandFinalsClash(gfSet) {
  const container = document.getElementById('grandFinalsClash');
  if (!container) return;

  const p1Name = gfSet.player1 ? gfSet.player1.name : 'Ganador Winners';
  const p2Name = gfSet.player2 ? gfSet.player2.name : 'Ganador Losers';

  container.innerHTML = `
    < div class="gf-player-capsule" >
      < span class="gf-player-name" >${p1Name}< /span >
      < span class="gf-score" >${gfSet.player1_score || 0}< /span >
    < /div >

    < div class="gf-vs-badge" >VS< /div >

    < div class="gf-player-capsule" >
      < span class="gf-score" >${gfSet.player2_score || 0}< /span >
      < span class="gf-player-name" >${p2Name}< /span >
    < /div >
  `;
}

// Actualización en tiempo real al registrar resultados en el admin
supabase
  .channel('public-bracket-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_sets' }, () => {
    renderPublicBrackets();
  })
  .subscribe();

document.addEventListener('DOMContentLoaded', renderPublicBrackets);