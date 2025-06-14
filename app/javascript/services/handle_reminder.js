/**
 * @param {Object} opts
 * @this {import("@hotwired/stimulus").Controller}  bound to your Jarvis controller
 */
export async function handleCreateReminder(opts, shouldSpeak = true) {
  this.transcriptTarget.textContent = `Jarvis: criando lembrete...`;

  console.log(opts)

  try {
    const resp = await fetch(`/api/v1/reminders?=${encodeURIComponent(opts)}`,
      {
        method: "POST",
        headers: { "Accept": "application/json"
      }
    });

    if (!resp.ok) throw new Error(`Status ${resp.status}`);

    const reminder = await resp.json();

    console.log("Reminder data received from Rails:", reminder);

    if (shouldSpeak){
      const followUp = {
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions:
            "Responda com as informações do lembrete criado " +
            reminder
        }
      };
      this.dataChannel.send(JSON.stringify(followUp));
    }
  } catch (err) {
    console.error("Error creating reminder from Rails:", err);
    this.transcriptTarget.textContent =
      "Jarvis: Erro ao criar lembrete.";
  }
}

export async function handleGetReminders(shouldSpeak = true) {
  try {
    const resp = await fetch(
      `/api/v1/reminders`,
      { headers: { "Accept": "application/json" } }
    );
    if (!resp.ok) throw new Error(`Status ${resp.status}`);

    const reminders = await resp.json();

    console.log("Reminder data received from Rails:", reminders);

    let response_instruction =
      `${reminders.length} Lembretes encontrados: ` +
      reminders.map(r => `${r.title} - ${r.description} - ${r.urgent ? "Urgente" : ""}`).join(", ");

    if (shouldSpeak){
      const followUp = {
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions:
            "Responda com as informações dos lembretes encontrados " +
            response_instruction
        }
      };
      this.dataChannel.send(JSON.stringify(followUp));
    }
  } catch (err) {
    console.error("Error fetching reminder from Rails:", err);
    this.transcriptTarget.textContent = "Jarvis: Erro ao encontrar lembretes.";
  }
}
