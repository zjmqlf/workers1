import * as Helpers from "../Helpers";
import { AES_IGE } from "@cryptography/aes";
import { Buffer } from "node:buffer";

export class IGE {
    private ige: any;

    constructor(key: Buffer, iv: Buffer) {
        this.ige = new AES_IGE(key, iv);
    }

    decryptIge(cipherText: Buffer): Buffer {
        return Helpers.convertToLittle(this.ige.decrypt(cipherText));
    }

    encryptIge(plainText: Buffer): Buffer {
        const padding = plainText.length % 16;
        if (padding) {
            plainText = Buffer.concat([
                plainText,
                Helpers.generateRandomBytes(16 - padding),
            ]);
        }

        return Helpers.convertToLittle(this.ige.encrypt(plainText));
    }
}
