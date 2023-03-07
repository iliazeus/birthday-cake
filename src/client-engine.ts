import EventEmitter from "eventemitter3";
import shuffle from "knuth-shuffle-seeded";
import type { ClientMessageObject } from "./client";
import type { ServerMessageObject } from "./server";

export interface ClientEngineOptions {
  msPerTick: number;
  windPhi: number;
}

export interface ClientEngineState extends ClientMessageObject {
  clientCount: number;
  readonly totalWindForce: { x: number; z: number };
  readonly candles: ClientEngineState.Candle[];
}

export namespace ClientEngineState {
  export interface Candle {
    x: number;
    z: number;
    isLit: boolean;
  }
}

export class ClientEngine extends EventEmitter<{
  start: [];
  stop: [];
  error: [any];
  tick: [Readonly<ClientEngineState>];
}> {
  private running = false;
  private lastTickTime = 0;

  private readonly options: ClientEngineOptions;

  private readonly state: ClientEngineState;

  constructor(options: ClientEngineOptions) {
    super();

    options = structuredClone(options);

    this.options = options;

    this.state = {
      windForce: 0,
      clientCount: 0,
      totalWindForce: { x: 0, z: 0 },
      candles: [],
    };
  }

  updateServerState(msg: Readonly<ServerMessageObject>): void {
    const { log2, floor, ceil, sin, cos, PI } = Math;

    this.state.clientCount = msg.clientCount;

    this.state.totalWindForce.x = msg.totalWindForce * cos(this.options.windPhi);
    this.state.totalWindForce.z = msg.totalWindForce * sin(this.options.windPhi);

    if (this.state.candles.length !== msg.candleCount) {
      this.state.candles.splice(0, this.state.candles.length);

      if (msg.candleCount !== 0) {
        const n = msg.candleCount;
        const nc = ceil(log2(n));
        const dr = 0.9 / nc;

        for (let i = 0; i < n; i++) {
          const ic = floor(log2(i + 1));
          const npc = 2 ** (ic + 1) <= n ? 2 ** ic : n - 2 ** ic + 1;
          const r = ic * dr;
          const dphi = (2 * PI) / npc;
          const ipc = i - (2 ** ic - 1);
          const phi = dphi * ipc + (PI * ic) / nc;

          this.state.candles.push({
            x: r * cos(phi),
            z: r * sin(phi),
            isLit: true,
          });
        }
      }

      shuffle(this.state.candles, msg.candleCount);
    }

    let blownOutCandleCount = 0;
    for (const candle of this.state.candles) {
      if (!candle.isLit) blownOutCandleCount += 1;
    }

    while (blownOutCandleCount > msg.blownOutCandleCount) {
      blownOutCandleCount -= 1;
      this.state.candles[blownOutCandleCount].isLit = true;
    }

    while (blownOutCandleCount < msg.blownOutCandleCount) {
      this.state.candles[blownOutCandleCount].isLit = false;
      blownOutCandleCount += 1;
    }
  }

  updateClientState(msg: Readonly<ClientMessageObject>): void {
    this.state.windForce = msg.windForce;
  }

  private tick(deltaMs: number): void {
    this.emit("tick", this.state);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickTime = performance.now();

    const run = () => {
      try {
        const now = performance.now();
        const deltaMs = now - this.lastTickTime;

        this.tick(deltaMs);

        this.lastTickTime = now;

        if (this.running) {
          setTimeout(run, this.options.msPerTick);
        } else {
          this.emit("stop");
        }
      } catch (error) {
        this.emit("error", error);
      }
    };

    setTimeout(() => {
      this.emit("start");
      run();
    }, this.options.msPerTick);
  }

  stop(): void {
    this.running = false;
  }
}
