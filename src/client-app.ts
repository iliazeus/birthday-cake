import { Client, ClientOptions } from "./client";
import { ClientEngine, ClientEngineOptions } from "./client-engine";

export interface ClientAppOptions {
  client: ClientOptions;
  engine: ClientEngineOptions;
}

export class ClientApp {
  private client: Client;
  private engine: ClientEngine;

  constructor(options: ClientAppOptions) {
    this.client = new Client(options.client);
    this.client.on("open", () => console.log("client connected"));
    this.client.on("close", () => console.log("client disconnected"));
    this.client.on("error", (e) => console.error("client error", e));

    this.engine = new ClientEngine(options.engine);
    this.engine.on("start", () => console.log("engine started"));
    this.engine.on("stop", () => console.log("engine stopped"));
    this.engine.on("error", (e) => console.error("engine error", e));

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
    });
  }

  stop(): void {
    this.engine.stop();
    this.client.close();
  }
}
