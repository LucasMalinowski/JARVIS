import {Controller} from "@hotwired/stimulus";
import {FetchRequest} from "@rails/request.js";
import { handleGetWeather } from "services/get_weather"
import { handleCreateReminder, handleGetReminders } from "services/handle_reminder";

export default class extends Controller {
  static targets = [
    "transcript", "captions", "audioDisplay",
    "micIcon", "micToggle", "audio", "muteIcon", "unmuteIcon"
  ];
  static values = {
    isAiTalking: { type: Boolean, default: false },
    aiTalkingIntervalId: { type: String, default: null },
    audioEnabled: { type: Boolean, default: true }
  };

  async connect() {
    // Initial transcript text
    this.transcriptTarget.textContent = "Jarvis iniciando...";
    // Track will hold the single audio track once granted
    this.audioTrack         = null;

    this.initialCalls()

    // Detect mobile vs desktop
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // On mobile: show the mic‑toggle, but do NOT start session yet
      this.micToggleTarget.classList.remove("hidden");
      this.mobileMode = true;
    } else {
      // On desktop: hide the mic‑toggle, request mic, then start immediately
      this.micToggleTarget.classList.add("hidden");
      this.mobileMode = false;
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioTrack  = this.audioStream.getTracks()[0];
        this.audioTrack.enabled = true;
        this.micIconTarget.classList.replace("fa-microphone-slash", "fa-microphone");
        // Now that we have permission, start the realtime session
        this._startSession();
        this.toggleAudio()
      } catch (err) {
        console.warn("Permissão de microfone negada no desktop:", err);
      }
    }
  }

  async initialCalls() {
    // kick off the delayed work, but don’t await it
    setTimeout(() => {
      handleGetWeather.call(this, { forecast: "current" }, false);
      handleGetReminders.call(this, false);
    }, 2000);
  }

  // request or revoke mic permission
  async toggleMicPermission(event) {
    event.preventDefault();

    // First time click: request mic permission
    if (!this.audioTrack) {
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioTrack  = this.audioStream.getTracks()[0];
        this.audioTrack.enabled = true;
        this.micIconTarget.classList.replace("fa-microphone-slash", "fa-microphone");
        // If on mobile, only now start the session
        if (this.mobileMode) {
          this._startSession();
        }
      } catch (err) {
        console.warn("Permissão de microfone negada:", err);
      }
      return;
    }

    // Subsequent clicks: just mute/unmute the existing track
    this.audioTrack.enabled = !this.audioTrack.enabled;
    if (this.audioTrack.enabled) {
      this.micIconTarget.classList.replace("fa-microphone-slash", "fa-microphone");
    } else {
      this.micIconTarget.classList.replace("fa-microphone", "fa-microphone-slash");
    }
  }

  async _startSession() {
    try {
      // Solicita a criação da sessão realtime ao backend
      const request = new FetchRequest("post", "/jarvis/create_openai_realtime_session", { responseKind: "json" });
      const response = await request.perform();
      if (!response.ok) {
        const errText = await response.text();
        console.error("Erro ao criar sessão realtime:", errText);
        this.transcriptTarget.textContent = "Erro ao conectar com Jarvis.";
        return;
      }
      const data = await response.json;
      this.ephemeralKey = data?.realtime_session?.client_secret?.value;

      // Cria a conexão RTCPeerConnection e a data channel
      this.pc = new RTCPeerConnection();
      this.pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.remoteAudioStream = event.streams[0];
          if (this.hasAudioTarget) {
            this.audioTarget.srcObject = this.remoteAudioStream;
            this.audioTarget.muted = !this.audioEnabledValue;
          }
        }
      };

      // Cria a dataChannel para comunicação realtime
      this.dataChannel = this.pc.createDataChannel("jarvis-realtime");
      this.dataChannel.onmessage = (evt) => this._handleDataChannelMessage(evt);
      this.dataChannel.onerror = (err) => console.error("Data channel error:", err);
      // Aguarda a abertura da data channel
      const waitForDCOpen = new Promise((resolve, reject) => {
        const dcTimeout = setTimeout(() => reject(new Error("Timeout ao abrir dataChannel")), 15000);
        this.dataChannel.onopen = () => {
          clearTimeout(dcTimeout);
          resolve();
        };
      });

      // Solicita acesso apenas ao microfone
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const [audioTrack] = this.audioStream.getTracks();
      this.pc.addTrack(audioTrack, this.audioStream);

      // Cria a SDP offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Envia a offer para a sessão realtime da OpenAI
      const model = "gpt-4o-mini-realtime-preview";
      const endpoint = `https://api.openai.com/v1/realtime?model=${model}`;
      const sdpResponse = await fetch(endpoint, {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Authorization": `Bearer ${this.ephemeralKey}`,
          "Content-Type": "application/sdp"
        }
      });
      const remoteSdp = await sdpResponse.text();
      await this.pc.setRemoteDescription({ type: "answer", sdp: remoteSdp });

      // Aguarda a data channel abrir
      await waitForDCOpen;

      // Opcional: envie uma mensagem de introdução para iniciar a conversa
      const introMsg = {
        type: "response.create",
        response: { modalities: ["audio", "text"] }
      };
      this.dataChannel.send(JSON.stringify(introMsg));
      this.transcriptTarget.textContent = "Jarvis está online. Fale normalmente.";
    } catch (error) {
      console.error("Erro em _startSession:", error);
      this.transcriptTarget.textContent = error == "NotAllowedError: Permission denied" ? "Erro: Permissão de microfone negada." : "Erro ao iniciar sessão com Jarvis.";
    }
  }

  toggleAudio() {
    this.audioEnabledValue = !this.audioEnabledValue;

    if (this.hasAudioTarget) {
      this.audioTarget.muted = !this.audioEnabledValue;
    }

    if (this.hasAudioDisplayTarget) {
      this.audioDisplayTarget.classList.toggle("hidden", !this.audioEnabledValue);
    }

    if (this.hasMuteIconTarget) {
      this.muteIconTarget.classList.toggle("hidden", this.audioEnabledValue);
      this.unmuteIconTarget.classList.toggle("hidden", !this.audioEnabledValue);
    }
  }



  _handleDataChannelMessage(evt) {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === "response.output_item.done") {
        this.isAiTalkingValue = true;
        const text = msg.item?.content?.[0]?.transcript || "";
        this.transcriptTarget.textContent = "Jarvis: " + text;
        const transcriptCtrl = this.application.getControllerForElementAndIdentifier(
          this.element,
          "transcript"
        );
        if (transcriptCtrl) {
          transcriptCtrl.addTranscriptLine("Jarvis: " + text);
        }
      }

      if (msg.type === "response.function_call_arguments.done") {
        const name = msg.name;
        const rawArgs = msg.arguments || "";

        // If raw arguments are empty, bail
        if (!rawArgs.trim()) return;

        let parsed;
        try {
          parsed = JSON.parse(rawArgs);
        } catch (err) {
          console.error("Failed to parse done message function arguments:", err, rawArgs);
          return;
        }

        console.log("Parsed done message:", name, parsed);
        if (name === "create_reminder") {
          handleCreateReminder.call(this,parsed);
        } else if (name === "get_weather") {
          handleGetWeather.call(this, parsed);
        } else if (name === "get_reminders") {
          handleGetReminders.call(this);
        } else {
          console.error("Unknown function call:", name);
        }
      }

      if (msg.type === "output_audio_buffer.stopped") {
        this.isAiTalkingValue = false;
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  }

  isAiTalkingValueChanged(value) {
    const bars = document.querySelectorAll("[data-jarvis-target='audioDisplay'] .bar");
    if (value) {
      this.aiTalkingIntervalIdValue = setInterval(() => {
        bars.forEach((bar) => {
          bar.classList.remove("!h-1")
          const scale = Math.random() * (5 - 1) + 1;
          bar.style.transformOrigin = "center center";
          bar.style.transform = `scaleY(${scale})`;
        });
      }, 100);
    } else {
      clearInterval(this.aiTalkingIntervalIdValue);
      this.aiTalkingIntervalIdValue = null;
      bars.forEach((bar) => {
        bar.classList.add("!h-1")
        bar.style.transform = `scaleY(1)`
      });
    }
  }
}
