import EventEmitter from "eventemitter3";
import type { ServerMessageObject } from "./server";
import type { ClientMessageObject } from "./client";

export interface ServerEngineOptions {
  msPerTick: number;
  candleCount: number;
  targetWindForcePerClient: number;
  firstCandleWindForceFactor: number;
  candleLifetimeMs: number;
}

export interface ServerEngineState extends ServerMessageObject {
  targetWindForce: number;
  msAtTargetWindForce: number;
}

export class ServerEngine extends EventEmitter<{
  error: [any];
  start: [];
  stop: [];
  reset: [];
  tick: [Readonly<ServerEngineState>];
}> {
  private running = false;
  private lastTickTime = 0;

  private readonly options: ServerEngineOptions;

  private readonly state: ServerEngineState;
  private readonly clientStates = new Map<unknown, ClientMessageObject>();

  constructor(options: ServerEngineOptions) {
    super();

    options = structuredClone(options);
    this.options = options;

    this.state = {
      clientCount: 0,
      candleCount: options.candleCount,
      blownOutCandleCount: 0,
      totalWindForce: 0,
      targetWindForce: 0,
      msAtTargetWindForce: 0,
    };
  }

  addClient(clientId: unknown): void {
    this.clientStates.set(clientId, { windForce: 0 });
    this.state.clientCount = this.clientStates.size;
    this.state.targetWindForce = this.state.clientCount * this.options.targetWindForcePerClient;
  }

  removeClient(clientId: unknown): void {
    this.clientStates.delete(clientId);
    this.state.clientCount = this.clientStates.size;
    this.state.targetWindForce = this.state.clientCount * this.options.targetWindForcePerClient;
  }

  updateClientState(clientId: unknown, clientState: ClientMessageObject): void {
    this.clientStates.set(clientId, clientState);
  }

  reset(): void {
    this.state.blownOutCandleCount = 0;
    this.state.msAtTargetWindForce = 0;
    this.emit("reset");
  }

  private tick(deltaMs: number): void {
    const { state, clientStates, options } = this;

    state.totalWindForce = 0;
    for (const clientState of clientStates.values()) state.totalWindForce += clientState.windForce;

    if (state.totalWindForce === 0) {
      state.msAtTargetWindForce = 0;
    } else if (
      state.blownOutCandleCount === 0 &&
      state.totalWindForce < state.targetWindForce * options.firstCandleWindForceFactor
    ) {
      state.msAtTargetWindForce = 0;
    } else if (state.totalWindForce < state.targetWindForce) {
      state.msAtTargetWindForce = 0;
    } else {
      state.msAtTargetWindForce += deltaMs;

      while (state.msAtTargetWindForce >= options.candleLifetimeMs) {
        state.msAtTargetWindForce -= options.candleLifetimeMs;
        if (state.blownOutCandleCount < state.candleCount) state.blownOutCandleCount += 1;
      }
    }

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
