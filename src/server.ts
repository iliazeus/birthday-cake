import EventEmitter from "eventemitter3";
import { Builder, ByteBuffer } from "flatbuffers";
import { WebSocket, WebSocketServer } from "ws";
import { ClientMessage, ServerMessage } from "./flatbuffers/birthday-cake";

export interface ServerOptions {
  host: string;
  port: number;
}

export interface ServerMessageObject {
  clientCount: number;
  candleCount: number;
  blownOutCandleCount: number;
  totalWindForce: number;
}

export class Server extends EventEmitter<{
  open: [];
  close: [];
  error: [any];
  connect: [WebSocket];
  disconnect: [WebSocket];
  message: [WebSocket, ClientMessage];
}> {
  private readonly wsServer: WebSocketServer;
  private readonly openSockets = new Set<WebSocket>();
  private readonly builder = new Builder(64);

  constructor({ host, port }: ServerOptions) {
    super();

    this.wsServer = new WebSocketServer({ host, port });
    this.wsServer.on("error", (e) => this.onWsServerError(e));
    this.wsServer.on("listening", () => this.onWsServerListening());
    this.wsServer.on("connection", (ws) => this.onWsServerConnection(ws));
    this.wsServer.on("close", () => this.onWsServerClose());
  }

  static open(options: ServerOptions): Promise<Server> {
    return new Promise((rs, rj) => {
      const server = new Server(options);

      server.once("error", (err) => {
        server.off("open");
        rj(err);
      });

      server.once("open", () => {
        server.off("error");
        rs(server);
      });
    });
  }

  private onWsServerError(e: any): void {
    this.emit("error", e);
  }

  private onWsServerListening(): void {
    this.emit("open");
  }

  private onWsServerConnection(ws: WebSocket): void {
    this.openSockets.add(ws);
    this.emit("connect", ws);
    ws.on("message", (data) => this.onSocketMessage(ws, data as Uint8Array));
    ws.on("close", () => this.onSocketClose(ws));
  }

  private onWsServerClose(): void {
    this.emit("close");
  }

  private onSocketMessage(ws: WebSocket, data: Uint8Array): void {
    const buffer = new ByteBuffer(data);
    const message = ClientMessage.getRootAsClientMessage(buffer);
    this.emit("message", ws, message);
  }

  private onSocketClose(ws: WebSocket): void {
    this.openSockets.delete(ws);
    this.emit("disconnect", ws);
  }

  get clientCount(): number {
    return this.openSockets.size;
  }

  send(ws: WebSocket, msg: ServerMessageObject): void {
    ServerMessage.createServerMessage(
      this.builder,
      msg.clientCount,
      msg.candleCount,
      msg.blownOutCandleCount,
      msg.totalWindForce
    );

    ws.send(this.builder.asUint8Array());
    this.builder.clear();
  }

  broadcast(msg: ServerMessageObject): void {
    ServerMessage.createServerMessage(
      this.builder,
      msg.clientCount,
      msg.candleCount,
      msg.blownOutCandleCount,
      msg.totalWindForce
    );

    const data = this.builder.asUint8Array();
    for (const socket of this.openSockets) socket.send(data);
    this.builder.clear();
  }

  close(): void {
    this.wsServer.close();
    for (const socket of this.openSockets) socket.close();
  }
}
