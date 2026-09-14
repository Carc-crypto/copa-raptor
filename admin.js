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


loginForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const email =
      document.getElementById(
        "adminEmail"
      ).value;


    const password =
      document.getElementById(
        "adminPassword"
      ).value;


    loginMessage.textContent =
      "Iniciando sesión...";


    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({

          email: email,

          password: password

        });


    if (error) {

      console.error(error);

      loginMessage.textContent =
        "Correo o contraseña incorrectos.";

      return;

    }


    await verifyAdmin(data.user);

  }

);





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
