import express from "express";
import EventEmitter from "eventemitter3";
import { Builder, ByteBuffer } from "flatbuffers";
import { Server as HttpServer } from "http";
import { AddressInfo, WebSocket, WebSocketServer } from "ws";
import { ClientMessage } from "./flatbuffers/birthday-cake/client-message";
import { ServerMessage } from "./flatbuffers/birthday-cake/server-message";

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
  open: [AddressInfo];
  close: [];
  error: [any];
  connect: [WebSocket];
  disconnect: [WebSocket];
  message: [WebSocket, ClientMessage];
}> {
  private readonly httpServer: HttpServer;
  private readonly wsServer: WebSocketServer;
  private readonly openSockets = new Set<WebSocket>();

  constructor({ host, port }: ServerOptions) {
    super();

    this.httpServer = express().use(express.static(__dirname)).listen(port, host);
    this.httpServer.on("listening", () => this.onHttpServerListening());
    this.httpServer.on("close", () => this.onHttpServerClose());
    this.httpServer.on("error", (e) => this.onHttpServerError(e));

    this.httpServer.on("upgrade", (req, socket, head) => {
      if (req.url !== "/socket") {
        socket.destroy();
        return;
      }

      this.wsServer.handleUpgrade(req, socket, head, (ws) => {
        this.wsServer.emit("connection", ws);
      });
    });

    this.wsServer = new WebSocketServer({ noServer: true });
    this.wsServer.on("error", (e) => this.onWsServerError(e));
    this.wsServer.on("connection", (ws) => this.onWsServerConnection(ws));
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

  private onHttpServerError(e: any): void {
    this.emit("error", e);
  }

  private onHttpServerListening(): void {
    this.emit("open", this.httpServer.address()! as AddressInfo);
  }

  private onWsServerConnection(ws: WebSocket): void {
    this.openSockets.add(ws);
    this.emit("connect", ws);
    ws.on("message", (data) => this.onSocketMessage(ws, data as Uint8Array));
    ws.on("close", () => this.onSocketClose(ws));
  }

  private onHttpServerClose(): void {
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
    const builder = new Builder(64);

    builder.finish(
      ServerMessage.createServerMessage(
        builder,
        msg.clientCount,
        msg.candleCount,
        msg.blownOutCandleCount,
        msg.totalWindForce
      )
    );

    ws.send(builder.asUint8Array());
  }

  broadcast(msg: ServerMessageObject): void {
    const builder = new Builder(64);

    builder.finish(
      ServerMessage.createServerMessage(
        builder,
        msg.clientCount,
        msg.candleCount,
        msg.blownOutCandleCount,
        msg.totalWindForce
      )
    );

    const data = builder.asUint8Array();
    for (const socket of this.openSockets) socket.send(data);
  }

  close(): void {
    this.httpServer.close();
    for (const socket of this.openSockets) socket.close();
  }
}
