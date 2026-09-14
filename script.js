const participantForm = document.getElementById("tu-formulario-id");


const successMessage =
  document.getElementById("successMessage");

  

form.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const formData =
      new FormData(form);


    const participante = {

      nombre:
        formData.get("nombre"),

      gamertag:
        formData.get("gamertag"),

      correo:
        formData.get("correo"),

      edad:
        Number(formData.get("edad")),

      personaje:
        formData.get("personaje"),

      ciudad:
        formData.get("ciudad"),

      espiritu:
        formData.get("espiritu")

    };


    successMessage.textContent =
      "Enviando inscripción...";


    const {
      error
    } = await supabaseClient
      .from("participants")
      .insert([participante]);


    if (error) {

      console.error(error);


      successMessage.textContent =
        "No se pudo completar el registro. Intenta nuevamente.";

      return;

    }


    successMessage.textContent =
      "¡Registro completado correctamente!";


    form.reset();

  }
);