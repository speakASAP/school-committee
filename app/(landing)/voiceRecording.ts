export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recording = false;

  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
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

  async startRecording(): Promise<void> {
    if (this.recording) throw new Error("Recording already in progress");

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
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.recording) {
        reject(new Error("No recording in progress"));
        return;
      }
      this.mediaRecorder.onstop = () => {
        this.recording = false;
        this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.audioChunks, { type: "audio/webm" }));
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
