import {Controller} from "@hotwired/stimulus";
import {FetchRequest} from "@rails/request.js";
import { handleGetWeather } from "services/get_weather"

export default class extends Controller {
  static targets = ["transcript", "captions", "audioDisplay", "micIcon", "micToggle"];
  static values = {
    isAiTalking: { type: Boolean, default: false },
    aiTalkingIntervalId: { type: String, default: null }
  };

  async connect() {
    // Initial transcript text
    this.transcriptTarget.textContent = "Jarvis iniciando...";
    // Track will hold the single audio track once granted
    this.audioTrack         = null;

    handleGetWeather.call(this, {forecast: "current"}, false);

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
      } catch (err) {
        console.warn("Permissão de microfone negada no desktop:", err);
      }
    }
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
      console.log("Chave efêmera:", this.ephemeralKey);

      // Cria a conexão RTCPeerConnection e a data channel
      this.pc = new RTCPeerConnection();
      this.pc.oniceconnectionstatechange = () => console.log("Estado ICE:", this.pc.iceConnectionState);
      this.pc.onconnectionstatechange = () => console.log("Estado PeerConnection:", this.pc.connectionState);
      this.pc.ontrack = (event) => {
        console.log("Recebido track remoto:", event);
        if (event.streams && event.streams[0]) {
          this.remoteAudioStream = event.streams[0];
          // Opcional: se quiser reproduzir o áudio remoto, crie um elemento <audio>
          if (!this.audioElement) {
            this.audioElement = document.createElement("audio");
            this.audioElement.autoplay = true;
            this.audioElement.srcObject = this.remoteAudioStream;
            this.element.appendChild(this.audioElement);
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
          console.log("Data channel aberto.");
          resolve();
        };
      });

      // Solicita acesso apenas ao microfone
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const [audioTrack] = this.audioStream.getTracks();
      this.pc.addTrack(audioTrack, this.audioStream);

      // Cria a SDP offer
      const offer = await this.pc.createOffer();
      console.log("SDP local:", offer.sdp);
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
      console.log("SDP remoto:", remoteSdp);
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

  _handleDataChannelMessage(evt) {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === "response.output_item.done") {
        this.isAiTalkingValue = true;
        const text = msg.item?.content?.[0]?.transcript || "";
        console.log("Recebido da IA:", text);
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
        console.log(msg)
        const name = msg.name;
        const rawArgs = msg.arguments || "";
        console.log("Done message received. Function name:", name, "Raw args:", rawArgs);

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
          // this._handleCreateReminder(parsed);
        } else if (name === "get_weather") {
          handleGetWeather.call(this, parsed);
        } else {
          console.warn("Unknown function call:", name);
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
