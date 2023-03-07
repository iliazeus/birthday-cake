import { EventEmitter } from "eventemitter3";
import { ByteBuffer, Builder } from "flatbuffers";
import { ClientMessage, ServerMessage } from "./flatbuffers/birthday-cake";

export interface ClientOptions {
  url: string;
}

export interface ClientMessageObject {
  windForce: number;
}

export class Client extends EventEmitter<{
  open: [];
  close: [];
  error: [any];
  message: [ServerMessage];
}> {
  private readonly socket: WebSocket;

  constructor({ url }: ClientOptions) {
    super();

    this.socket = new WebSocket(url);
    this.socket.binaryType = "arraybuffer";
    this.socket.onopen = (e) => this.onSocketOpen(e);
    this.socket.onclose = (e) => this.onSocketClose(e);
    this.socket.onerror = (e) => this.onSocketError(e);
    this.socket.onmessage = (e) => this.onSocketMessage(e);
  }

  static open(options: ClientOptions): Promise<Client> {
    return new Promise((rs, rj) => {
      const client = new Client(options);

      client.once("error", (err) => {
        client.off("open");
        rj(err);
      });

      client.once("open", () => {
        client.off("error");
        rs(client);
      });
    });
  }

  private onSocketOpen(e: unknown): void {
    this.emit("open");
  }

  private onSocketClose(e: unknown): void {
    this.emit("close");
  }

  private onSocketError(e: any): void {
    this.emit("error", e);
  }

  private onSocketMessage(e: MessageEvent<ArrayBuffer>): void {
    const buffer = new ByteBuffer(new Uint8Array(e.data));
    const message = ServerMessage.getRootAsServerMessage(buffer);
    this.emit("message", message);
  }

  send(msg: ClientMessageObject): void {
    const builder = new Builder(32);
    builder.finish(ClientMessage.createClientMessage(builder, msg.windForce));
    this.socket.send(builder.asUint8Array());
  }

  close(): void {
    this.socket.close();
  }
}
