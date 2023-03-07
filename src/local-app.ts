import { ClientEngine, ClientEngineOptions } from "./client-engine";
import { NoiseAnalyser } from "./noise-analyser";
import { Renderer, RendererOptions } from "./renderer";
import { ServerEngine, ServerEngineOptions } from "./server-engine";

export interface LocalAppOptions {
  serverEngine: ServerEngineOptions;
  clientEngine: ClientEngineOptions;
  renderer: RendererOptions;
}

export class LocalApp {
  private serverEngine: ServerEngine;
  private clientEngine: ClientEngine;
  private noiseAnalyser: NoiseAnalyser;
  private renderer: Renderer;

  constructor(options: LocalAppOptions) {
    this.serverEngine = new ServerEngine(options.serverEngine);
    this.serverEngine.on("start", () => console.log("server engine started"));
    this.serverEngine.on("stop", () => console.log("server engine stopped"));
    this.serverEngine.on("error", (e) => console.error("server engine error", e));

    this.clientEngine = new ClientEngine(options.clientEngine);
    this.clientEngine.on("start", () => console.log("client engine started"));
    this.clientEngine.on("stop", () => console.log("client engine stopped"));
    this.clientEngine.on("error", (e) => console.error("client engine error", e));

    this.noiseAnalyser = new NoiseAnalyser();
    this.noiseAnalyser.on("open", () => console.log("noise analyser initialized"));
    this.noiseAnalyser.on("close", () => console.log("noise analyser closed"));
    this.noiseAnalyser.on("error", (e) => console.error("noise analyser error", e));

    this.renderer = new Renderer(options.renderer);

    this.serverEngine.on("tick", (state) => {
      this.clientEngine.updateServerState(state);
    });

    this.clientEngine.on("tick", (state) => {
      this.serverEngine.updateClientState(null, state);
      this.renderer.updateEngineState(state);
      const windForce = this.noiseAnalyser.getNoiseLevel();
      this.clientEngine.updateClientState({ windForce });
    });

    this.serverEngine.start();
    this.clientEngine.start();

    this.serverEngine.addClient(null);
  }

  stop(): void {
    this.serverEngine.removeClient(null);
    this.serverEngine.stop();
    this.clientEngine.stop();
    this.noiseAnalyser.close();
  }
}
