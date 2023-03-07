import { Server, ServerOptions } from "./server";
import { ServerEngine, ServerEngineOptions } from "./server-engine";

export interface ServerAppOptions {
  server: ServerOptions;
  engine: ServerEngineOptions;
}

export class ServerApp {
  private server: Server;
  private engine: ServerEngine;

  constructor(options: ServerAppOptions) {
    console.log(`pid is ${process.pid}`);

    this.server = new Server(options.server);
    this.server.on("open", () => console.log("server started"));
    this.server.on("close", () => console.log("server stopped"));
    this.server.on("error", (e) => console.error("server error", e));

    this.engine = new ServerEngine(options.engine);
    this.engine.on("start", () => console.log("engine started"));
    this.engine.on("stop", () => console.log("engine stopped"));
    this.engine.on("reset", () => console.log("engine reset"));
    this.engine.on("error", (e) => console.error("engine error", e));

    this.server.on("connect", (ws) => {
      console.log("client connected");
      console.log(`clients total: ${this.server.clientCount}`);
      this.engine.addClient(ws);
    });

    this.server.on("disconnect", (ws) => {
      console.log("client disconnected");
      console.log(`clients total: ${this.server.clientCount}`);
      this.engine.removeClient(ws);
    });

    this.server.on("message", (ws, msg) => {
      this.engine.updateClientState(ws, { windForce: msg.windForce() });
    });

    this.engine.on("tick", (state) => {
      this.server.broadcast(state);
    });

    this.engine.start();
  }

  reset(): void {
    this.engine.reset();
  }

  stop(): void {
    this.server.close();
    this.engine.stop();
  }
}
