
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