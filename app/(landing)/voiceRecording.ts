// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recording = false;
  private recognition: AnySpeechRecognition | null = null;
  private transcriptParts: string[] = [];
  private onTranscriptUpdate: ((text: string) => void) | null = null;

  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  isSpeechRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  async checkPermissions(): Promise<{ granted: boolean }> {
    try {
      const result = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return { granted: result.state === "granted" };
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return { granted: true };
      } catch {
        return { granted: false };
      }
    }
  }

  async startRecording(onTranscriptUpdate?: (text: string) => void): Promise<void> {
    if (this.recording) throw new Error("Recording already in progress");

    this.onTranscriptUpdate = onTranscriptUpdate ?? null;
    this.transcriptParts = [];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    const mimeType =
      ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      ) ?? "audio/webm";

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.mediaRecorder.start(1000);
    this.recording = true;

    if (this.isSpeechRecognitionSupported()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      this.recognition = new SR();
      this.recognition.lang = "cs-CZ";
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            this.transcriptParts.push(result[0].transcript);
          } else {
            interimTranscript = result[0].transcript;
          }
        }
        const currentText = [...this.transcriptParts, interimTranscript].join(" ").trim();
        if (this.onTranscriptUpdate) this.onTranscriptUpdate(currentText);
      };

      this.recognition.onerror = () => {
        // ignore recognition errors — recording still works
      };

      try {
        this.recognition.start();
      } catch {
        // speech recognition unavailable, proceed without it
      }
    }
  }

  stopRecording(): Promise<{ blob: Blob; transcript: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.recording) {
        reject(new Error("No recording in progress"));
        return;
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch {
          // ignore
        }
        this.recognition = null;
      }

      this.mediaRecorder.onstop = () => {
        this.recording = false;
        this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.audioChunks, { type: "audio/webm" });
        const transcript = this.transcriptParts.join(" ").trim();
        resolve({ blob, transcript });
      };
      this.mediaRecorder.stop();
    });
  }

  getIsRecording(): boolean {
    return this.recording;
  }

  getPermissionInstructions(): string {
    if (typeof navigator === "undefined") return "";
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("chrome"))
      return "Klikněte na ikonu mikrofonu v adresním řádku a povolte přístup.";
    if (ua.includes("firefox"))
      return "Klikněte na ikonu mikrofonu v adresním řádku a povolte přístup.";
    if (ua.includes("safari"))
      return "Safari → Předvolby → Webové stránky → Mikrofon → Povolit.";
    return "Povolte přístup k mikrofonu v nastavení prohlížeče.";
  }
}

export const voiceRecordingService = new VoiceRecordingService();
