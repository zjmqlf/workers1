import bigInt from "big-integer";
import type { EntityLike } from "./define";
import type { Api } from "./tl";
import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";

export function readBigIntFromBuffer(
    buffer: Buffer,
    little = true,
    signed = false
): bigInt.BigInteger {
    let randBuffer = Buffer.from(buffer);
    const bytesNumber = randBuffer.length;
    if (little) {
        randBuffer = randBuffer.reverse();
    }
    let bigIntVar = bigInt(randBuffer.toString("hex"), 16) as bigInt.BigInteger;

    if (signed && Math.floor(bigIntVar.toString(2).length / 8) >= bytesNumber) {
        bigIntVar = bigIntVar.subtract(bigInt(2).pow(bigInt(bytesNumber * 8)));
    }
    return bigIntVar;
}

export function generateRandomBigInt() {
    return readBigIntFromBuffer(generateRandomBytes(8), false);
}

export function escapeRegex(string: string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function groupBy(list: any[], keyGetter: Function) {
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
}

export function betterConsoleLog(object: { [key: string]: any }) {
    const toPrint: { [key: string]: any } = {};
    for (const key in object) {
        if (object.hasOwnProperty(key)) {
            if (!key.startsWith("_") && key != "originalArgs") {
                toPrint[key] = object[key];
            }
        }
    }
    return toPrint;
}

export const isArrayLike = <T>(x: any): x is Array<T> =>
    x &&
    typeof x.length === "number" &&
    typeof x !== "function" &&
    typeof x !== "string";

export function toSignedLittleBuffer(
    big: bigInt.BigInteger | string | number,
    number = 8
): Buffer {
    const bigNumber = returnBigInt(big);
    const byteArray = [];
    for (let i = 0; i < number; i++) {
        byteArray[i] = bigNumber.shiftRight(8 * i).and(255);
    }

    return Buffer.from(byteArray as unknown as number[]);
}

export function readBufferFromBigInt(
    bigIntVar: bigInt.BigInteger,
    bytesNumber: number,
    little = true,
    signed = false
): Buffer {
    bigIntVar = bigInt(bigIntVar);
    const bitLength = bigIntVar.bitLength().toJSNumber();
    const bytes = Math.ceil(bitLength / 8);
    if (bytesNumber < bytes) {
        throw new Error("OverflowError: int too big to convert");
    }
    if (!signed && bigIntVar.lesser(bigInt(0))) {
        throw new Error("Cannot convert to unsigned");
    }
    if (signed && bigIntVar.lesser(bigInt(0))) {
        bigIntVar = bigInt(2)
            .pow(bigInt(bytesNumber).multiply(8))
            .add(bigIntVar);
    }
    const hex = bigIntVar.toString(16).padStart(bytesNumber * 2, "0");
    let buffer = Buffer.from(hex, "hex");
    if (little) {
        buffer = buffer.reverse();
    }

    return buffer;
}

export function generateRandomLong(signed = true) {
    return readBigIntFromBuffer(generateRandomBytes(8), true, signed);
}

export function mod(n: number, m: number) {
    return ((n % m) + m) % m;
}

export function bigIntMod(
    n: bigInt.BigInteger,
    m: bigInt.BigInteger
): bigInt.BigInteger {
    return n.remainder(m).add(m).remainder(m);
}

export function generateRandomBytes(count: number) {
    return Buffer.from(crypto.randomBytes(count));
}

export function stripText(text: string, entities: Api.TypeMessageEntity[]) {
    if (!entities || !entities.length) {
        return text.trim();
    }
    while (text && text[text.length - 1].trim() === "") {
        const e = entities[entities.length - 1];
        if (e.offset + e.length == text.length) {
            if (e.length == 1) {
                entities.pop();
                if (!entities.length) {
                    return text.trim();
                }
            } else {
                e.length -= 1;
            }
        }
        text = text.slice(0, -1);
    }
    while (text && text[0].trim() === "") {
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            if (e.offset != 0) {
                e.offset--;
                continue;
            }
            if (e.length == 1) {
                entities.shift();
                if (!entities.length) {
                    return text.trimLeft();
                }
            } else {
                e.length -= 1;
            }
        }
        text = text.slice(1);
    }
    return text;
}

export async function generateKeyDataFromNonce(
    serverNonceBigInt: bigInt.BigInteger,
    newNonceBigInt: bigInt.BigInteger
) {
    const serverNonce = toSignedLittleBuffer(serverNonceBigInt, 16);
    const newNonce = toSignedLittleBuffer(newNonceBigInt, 32);
    const [hash1, hash2, hash3] = await Promise.all([
        sha1(Buffer.concat([newNonce, serverNonce])),
        sha1(Buffer.concat([serverNonce, newNonce])),
        sha1(Buffer.concat([newNonce, newNonce])),
    ]);
    const keyBuffer = Buffer.concat([hash1, hash2.slice(0, 12)]);
    const ivBuffer = Buffer.concat([
        hash2.slice(12, 20),
        hash3,
        newNonce.slice(0, 4),
    ]);
    return {
        key: keyBuffer,
        iv: ivBuffer,
    };
}

export function convertToLittle(buf: Buffer) {
    const correct = Buffer.alloc(buf.length * 4);
    for (let i = 0; i < buf.length; i++) {
        correct.writeUInt32BE(buf[i], i * 4);
    }
    return correct;
}

export function sha1(data: Buffer): Promise<Buffer> {
    const shaSum = crypto.createHash("sha1");
    shaSum.update(data);
    // @ts-ignore
    return shaSum.digest();
}

export function sha256(data: Buffer): Promise<Buffer> {
    const shaSum = crypto.createHash("sha256");
    shaSum.update(data);
    // @ts-ignore
    return shaSum.digest();
}

export function modExp(
    a: bigInt.BigInteger,
    b: bigInt.BigInteger,
    n: bigInt.BigInteger
): bigInt.BigInteger {
    a = a.remainder(n);
    let result = bigInt.one;
    let x = a;
    while (b.greater(bigInt.zero)) {
        const leastSignificantBit = b.remainder(bigInt(2));
        b = b.divide(bigInt(2));
        if (leastSignificantBit.eq(bigInt.one)) {
            result = result.multiply(x);
            result = result.remainder(n);
        }
        x = x.multiply(x);
        x = x.remainder(n);
    }
    return result;
}

export function getByteArray(
    integer: bigInt.BigInteger | number,
    signed = false
) {
    const bits = integer.toString(2).length;
    const byteLength = Math.floor((bits + 8 - 1) / 8);
    return readBufferFromBigInt(
        typeof integer == "number" ? bigInt(integer) : integer,
        byteLength,
        false,
        signed
    );
}

export function returnBigInt(
    num: bigInt.BigInteger | string | number | bigint
) {
    if (bigInt.isInstance(num)) {
        return num;
    }
    if (typeof num == "number") {
        return bigInt(num);
    }
    if (typeof num == "bigint") {
        return bigInt(num);
    }
    return bigInt(num);
}

export function getMinBigInt(
    arrayOfBigInts: (bigInt.BigInteger | string)[]
): bigInt.BigInteger {
    if (arrayOfBigInts.length == 0) {
        return bigInt.zero;
    }
    if (arrayOfBigInts.length == 1) {
        return returnBigInt(arrayOfBigInts[0]);
    }
    let smallest = returnBigInt(arrayOfBigInts[0]);
    for (let i = 1; i < arrayOfBigInts.length; i++) {
        if (returnBigInt(arrayOfBigInts[i]).lesser(smallest)) {
            smallest = returnBigInt(arrayOfBigInts[i]);
        }
    }
    return smallest;
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const sleep = (ms: number, isUnref: boolean = false) =>
    new Promise((resolve) =>
        isUnref ? setTimeout(resolve, ms).unref() : setTimeout(resolve, ms)
    );

export function bufferXor(a: Buffer, b: Buffer) {
    const res = [];
    for (let i = 0; i < a.length; i++) {
        res.push(a[i] ^ b[i]);
    }
    return Buffer.from(res);
}

function makeCRCTable() {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        crcTable[n] = c;
    }
    return crcTable;
}

let crcTable: number[] | undefined = undefined;

export function crc32(buf: Buffer | string) {
    if (!crcTable) {
        crcTable = makeCRCTable();
    }
    if (!Buffer.isBuffer(buf)) {
        buf = Buffer.from(buf);
    }
    let crc = -1;

    for (let index = 0; index < buf.length; index++) {
        const byte = buf[index];
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
}

export class TotalList<T> extends Array<T> {
    public total?: number;
    constructor() {
        super();
        this.total = 0;
    }
}

export const _EntityType = {
    USER: 0,
    CHAT: 1,
    CHANNEL: 2,
};
Object.freeze(_EntityType);

export function _entityType(entity: EntityLike) {
    if (typeof entity !== "object" || !("SUBCLASS_OF_ID" in entity)) {
        throw new Error(
            `${entity} is not a TLObject, cannot determine entity type`
        );
    }
    if (
        ![
            0x2d45687,
            0xc91c90b6,
            0xe669bf46,
            0x40f202fd,
            0x2da17977,
            0xc5af5d94,
            0x1f4661b9,
            0xd49a2697,
        ].includes(entity.SUBCLASS_OF_ID)
    ) {
        throw new Error(`${entity} does not have any entity type`);
    }
    const name = entity.className;
    if (name.includes("User")) {
        return _EntityType.USER;
    } else if (name.includes("Chat")) {
        return _EntityType.CHAT;
    } else if (name.includes("Channel")) {
        return _EntityType.CHANNEL;
    } else if (name.includes("Self")) {
        return _EntityType.USER;
    }
    throw new Error(`${entity} does not have any entity type`);
}
