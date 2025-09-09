import { TypeNotFoundError } from "../errors";
import { coreObjects } from "../tl/core";
import { tlobjects } from "../tl/AllTLObjects";
import { readBigIntFromBuffer } from "../Helpers";
import { Buffer } from "node:buffer";

export class BinaryReader {
    private readonly stream: Buffer;
    private _last?: Buffer;
    offset: number;

    constructor(data: Buffer) {
        this.stream = data;
        this._last = undefined;
        this.offset = 0;
    }

    readByte() {
        return this.read(1)[0];
    }

    readInt(signed = true) {
        let res;
        if (signed) {
            res = this.stream.readInt32LE(this.offset);
        } else {
            res = this.stream.readUInt32LE(this.offset);
        }
        this.offset += 4;
        return res;
    }

    readLong(signed = true) {
        return this.readLargeInt(64, signed);
    }

    readFloat() {
        return this.read(4).readFloatLE(0);
    }

    readDouble() {
        return this.read(8).readDoubleLE(0);
    }

    readLargeInt(bits: number, signed = true) {
        const buffer = this.read(Math.floor(bits / 8));
        return readBigIntFromBuffer(buffer, true, signed);
    }

    read(length = -1, checkLength = true) {
        if (length === -1) {
            length = this.stream.length - this.offset;
        }
        const result = this.stream.slice(this.offset, this.offset + length);
        this.offset += length;
        if (checkLength && result.length !== length) {
            throw Error(
                `No more data left to read (need ${length}, got ${result.length}: ${result}); last read ${this._last}`
            );
        }
        this._last = result;
        return result;
    }

    getBuffer() {
        return this.stream;
    }

    tgReadBytes() {
        const firstByte = this.readByte();
        let padding;
        let length;
        if (firstByte === 254) {
            length =
                this.readByte() |
                (this.readByte() << 8) |
                (this.readByte() << 16);
            padding = length % 4;
        } else {
            length = firstByte;
            padding = (length + 1) % 4;
        }
        const data = this.read(length);

        if (padding > 0) {
            padding = 4 - padding;
            this.read(padding);
        }

        return data;
    }

    tgReadString() {
        return this.tgReadBytes().toString("utf-8");
    }

    tgReadBool() {
        const value = this.readInt(false);
        if (value === 0x997275b5) {
            return true;
        } else if (value === 0xbc799737) {
            return false;
        } else {
            throw new Error(`Invalid boolean code ${value.toString(16)}`);
        }
    }

    tgReadDate() {
        const value = this.readInt();
        return new Date(value * 1000);
    }

    tgReadObject(): any {
        const constructorId = this.readInt(false);
        let clazz = tlobjects[constructorId];
        if (clazz === undefined) {
            const value = constructorId;
            if (value === 0x997275b5) {
                return true;
            } else if (value === 0xbc799737) {
                return false;
            } else if (value === 0x1cb5c415) {
                const temp = [];
                const length = this.readInt();
                for (let i = 0; i < length; i++) {
                    temp.push(this.tgReadObject());
                }
                return temp;
            }
            clazz = coreObjects.get(constructorId);
            if (clazz === undefined) {
                this.seek(-4);
                const pos = this.tellPosition();
                const error = new TypeNotFoundError(constructorId, this.read());
                this.setPosition(pos);
                throw error;
            }
        }
        return clazz.fromReader(this);
    }

    tgReadVector() {
        if (this.readInt(false) !== 0x1cb5c415) {
            throw new Error("Invalid constructor code, vector was expected");
        }
        const count = this.readInt();
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push(this.tgReadObject());
        }
        return temp;
    }

    tellPosition() {
        return this.offset;
    }

    setPosition(position: number) {
        this.offset = position;
    }

    seek(offset: number) {
        this.offset += offset;
    }

}
