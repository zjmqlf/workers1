import bigInt from "big-integer";
import { MTProtoState } from "./MTProtoState";
import { Api } from "../tl";
import { toSignedLittleBuffer } from "../Helpers";
import { InvalidBufferError } from "../errors";
import { BinaryReader } from "../extensions";
import type { Connection } from "./connection";
import { Buffer } from "node:buffer";

export class MTProtoPlainSender {
    private _state: MTProtoState;
    private _connection: Connection;

    constructor(connection: any, loggers: any) {
        this._state = new MTProtoState(undefined, loggers);
        this._connection = connection;
    }

    async send(request: Api.AnyRequest) {
        let body = request.getBytes();
        let msgId = this._state._getNewMsgId();
        const m = toSignedLittleBuffer(msgId, 8);
        const b = Buffer.alloc(4);
        b.writeInt32LE(body.length, 0);
        const res = Buffer.concat([
            Buffer.concat([Buffer.alloc(8), m, b]),
            body,
        ]);
        await this._connection.send(res);
        body = await this._connection.recv();
        if (body.length < 8) {
            throw new InvalidBufferError(body);
        }
        const reader = new BinaryReader(body);
        const authKeyId = reader.readLong();
        if (authKeyId.neq(bigInt(0))) {
            throw new Error("Bad authKeyId");
        }
        msgId = reader.readLong();
        if (msgId.eq(bigInt(0))) {
            throw new Error("Bad msgId");
        }
        const length = reader.readInt();
        if (length <= 0) {
            throw new Error("Bad length");
        }
        return reader.tgReadObject();
    }
}
