import { Controller } from "@hotwired/stimulus";
import { FetchRequest } from "@rails/request.js";

export default class extends Controller {
  static targets = ["transcript"];
  static values = {
    apiEndpoint: String
  };

  connect() {
    this.transcriptTarget.textContent = "Conectando com Jarvis...";
    this.started = false;
    this._startSession();
  }

  async _startSession() {
    try {
      // Solicita a criação da sessão realtime ao backend
      const request = new FetchRequest("post", this.apiEndpointValue, { responseKind: "json" });
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

      // Atualiza a interface para indicar que Jarvis está online
      this.started = true;
      this.transcriptTarget.textContent = "Jarvis está online. Fale normalmente.";
    } catch (error) {
      console.error("Erro em _startSession:", error);
      this.transcriptTarget.textContent = "Erro ao iniciar sessão com Jarvis.";
    }
  }

  _handleDataChannelMessage(evt) {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === "response.output_item.done") {
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
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  }


  _speakMessage(message) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "pt-BR";
    window.speechSynthesis.speak(utterance);
  }

  disconnect() {
    console.log("Desconectando Jarvis...");
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }
}
