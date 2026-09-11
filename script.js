const form = document.getElementById("registrationForm");
const successMessage = document.getElementById("successMessage");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const nombre = data.get("nombre");
  const gamertag = data.get("gamertag");

  successMessage.textContent =
    `¡Registro recibido, ${nombre}! Tu gamertag "${gamertag}" quedó listo para la Copa Raptor 2026.`;

  form.reset();
});
