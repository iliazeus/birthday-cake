import EventEmitter from "eventemitter3";

export interface NoiseAnalyserOptions {
  bufferMs: number;
}

export class NoiseAnalyser extends EventEmitter<{
  open: [];
  close: [];
  error: [any];
}> {
  private ctx: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;

  private data!: Float32Array;

  constructor({ bufferMs }: NoiseAnalyserOptions) {
    super();

    navigator.mediaDevices
      .getUserMedia({ audio: { sampleRate: 8000, noiseSuppression: false } })
      .then((mediaStream) => {
        this.ctx = new AudioContext({
          sampleRate: mediaStream.getAudioTracks()[0].getSettings().sampleRate!,
        });
        this.data = new Float32Array(Math.ceil(this.ctx.sampleRate * (bufferMs / 1000)));
        this.mediaStreamSource = this.ctx.createMediaStreamSource(mediaStream);
        this.analyser = this.ctx.createAnalyser();
        this.mediaStreamSource.connect(this.analyser);
        this.emit("open");
      })
      .catch((err) => {
        this.emit("error", err);
      });
  }

  close(): void {
    this.analyser?.disconnect();
    this.mediaStreamSource?.disconnect();
    this.ctx
      ?.close()
      .then(() => this.emit("close"))
      .catch((err) => this.emit("error", err));
  }

  getNoiseLevel(): number {
    if (!this.data || !this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.data);

    let l = 0;
    let min = this.data[0];
    let max = this.data[0];

    for (let i = 1; i < this.data.length; i++) {
      l += (this.data[i] - this.data[i - 1]) ** 2;
      min = Math.min(min, this.data[i]);
      max = Math.max(max, this.data[i]);
    }

    const a = Math.max(max - min, 0.1);
    const n = this.data.length;

    return l / (a * n);
  }
}
