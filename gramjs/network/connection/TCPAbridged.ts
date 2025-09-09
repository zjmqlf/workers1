import { readBufferFromBigInt } from "../../Helpers";
import { Connection, PacketCodec } from "./Connection";
import type { PromisedNetSockets } from "../../extensions";
import bigInt from "big-integer";
import { Buffer } from "node:buffer";

export class AbridgedPacketCodec extends PacketCodec {
    static tag = Buffer.from("ef", "hex");
    static obfuscateTag = Buffer.from("efefefef", "hex");
    private tag: Buffer;
    obfuscateTag: Buffer;

    constructor(props: any) {
        super(props);
        this.tag = AbridgedPacketCodec.tag;
        this.obfuscateTag = AbridgedPacketCodec.obfuscateTag;
    }

    encodePacket(data: Buffer) {
        let length = data.length >> 2;
        let temp;
        if (length < 127) {
            const b = Buffer.alloc(1);
            b.writeUInt8(length, 0);
            temp = b;
        } else {
            temp = Buffer.concat([
                Buffer.from("7f", "hex"),
                readBufferFromBigInt(bigInt(length), 3),
            ]);
        }
        return Buffer.concat([temp, data]);
    }

    async readPacket(
        reader: PromisedNetSockets
    ): Promise<Buffer> {
        const readData = await reader.read(1);
        let length = readData[0];
        if (length >= 127) {
            length = Buffer.concat([
                await reader.read(3),
                Buffer.alloc(1),
            ]).readInt32LE(0);
        }

        return reader.read(length << 2);
    }
}

export class ConnectionTCPAbridged extends Connection {
    PacketCodecClass = AbridgedPacketCodec;
}
