import { Client, ClientOptions } from "./client";
import { ClientEngine, ClientEngineOptions } from "./client-engine";
import { NoiseAnalyser as NoiseAnalyser } from "./noise-analyser";
import { Renderer, RendererOptions } from "./renderer";

export interface ClientAppOptions {
  client: ClientOptions;
  engine: ClientEngineOptions;
  renderer: RendererOptions;
}

export class ClientApp {
  private client: Client;
  private engine: ClientEngine;
  private noiseAnalyser: NoiseAnalyser;
  private renderer: Renderer;

  constructor(options: ClientAppOptions) {
    this.client = new Client(options.client);
    this.client.on("open", () => console.log("client connected"));
    this.client.on("close", () => console.log("client disconnected"));
    this.client.on("error", (e) => console.error("client error", e));

    this.engine = new ClientEngine(options.engine);
    this.engine.on("start", () => console.log("engine started"));
    this.engine.on("stop", () => console.log("engine stopped"));
    this.engine.on("error", (e) => console.error("engine error", e));

    this.noiseAnalyser = new NoiseAnalyser();
    this.noiseAnalyser.on("open", () => console.log("noise analyser initialized"));
    this.noiseAnalyser.on("close", () => console.log("noise analyser closed"));
    this.noiseAnalyser.on("error", (e) => console.error("noise analyser error", e));

    this.renderer = new Renderer(options.renderer);

    this.client.on("message", (msg) => {
      this.engine.updateServerState({
        clientCount: msg.clientCount(),
        candleCount: msg.candleCount(),
        blownOutCandleCount: msg.blownOutCandleCount(),
        totalWindForce: msg.totalWindForce(),
      });
    });

    this.engine.on("tick", (state) => {
      this.client.send(state);
      this.renderer.updateEngineState(state);
      const windForce = this.noiseAnalyser.getNoiseLevel();
      this.engine.updateClientState({ windForce });
    });

    this.client.once("open", () => this.engine.start());
  }

  stop(): void {
    this.engine.stop();
    this.client.close();
    this.noiseAnalyser.close();
  }
}
