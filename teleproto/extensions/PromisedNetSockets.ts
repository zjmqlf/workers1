import net from "node:net";
import { Mutex } from "async-mutex";
import { Buffer } from "node:buffer";

const mutex = new Mutex();
const closeError = new Error("NetSocket was closed");

export class PromisedNetSockets {
    private client?: net.Socket;
    private closed: boolean;
    private stream: Buffer;
    private canRead?: boolean | Promise<boolean>;
    private resolveRead: ((value?: any) => void) | undefined;

    constructor() {
        this.client = undefined;
        this.closed = true;
        this.stream = Buffer.alloc(0);
    }

    async readExactly(number: number) {
        let readData = Buffer.alloc(0);
        while (true) {
            const thisTime = await this.read(number);
            readData = Buffer.concat([readData, thisTime]);
            number = number - thisTime.length;
            if (!number || number === -437) {
                return readData;
            }
        }
    }

    async read(number: number) {
        if (this.closed) {
            throw closeError;
        }
        await this.canRead;
        if (this.closed) {
            throw closeError;
        }
        const toReturn = this.stream.slice(0, number);
        this.stream = this.stream.slice(number);
        if (this.stream.length === 0) {
            this.canRead = new Promise((resolve) => {
                this.resolveRead = resolve;
            });
        }

        return toReturn;
    }

    async readAll() {
        if (this.closed || !(await this.canRead)) {
            throw closeError;
        }
        const toReturn = this.stream;
        this.stream = Buffer.alloc(0);
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        return toReturn;
    }

    async connect(port: number, ip: string) {
        this.stream = Buffer.alloc(0);
        let connected = false;
        this.client = new net.Socket();
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        this.closed = false;
        return new Promise((resolve, reject) => {
            if (this.client) {
                if (connected) {
                    this.receive();
                    resolve(this);
                } else {
                    this.client.connect(port, ip, () => {
                        this.receive();
                        resolve(this);
                    });
                }
                this.client.on("error", reject);
                this.client.on("close", () => {
                    if (this.client && this.client.destroyed) {
                        if (this.resolveRead) {
                            this.resolveRead(false);
                        }
                        this.closed = true;
                    }
                });
            }
        });
    }

    write(data: Buffer) {
        if (this.closed) {
            throw closeError;
        }
        if (this.client) {
            this.client.write(data);
        }
    }

    async close() {
        if (this.client) {
            await this.client.destroy();
            this.client.unref();
        }
        this.closed = true;
    }

    async receive() {
        if (this.client) {
            this.client.on("data", async (message: Buffer) => {
                const release = await mutex.acquire();
                try {
                    let data;
                    this.stream = Buffer.concat([this.stream, message]);
                    if (this.resolveRead) {
                        this.resolveRead(true);
                    }
                } finally {
                    release();
                }
            });
        }
    }
    toString() {
        return "PromisedNetSocket";
    }
}
