
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