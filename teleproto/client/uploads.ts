import { Buffer } from "node:buffer";

export class CustomFile {
    name: string;
    size: number;
    path: string;
    buffer?: Buffer;

    constructor(name: string, size: number, path: string, buffer?: Buffer) {
        this.name = name;
        this.size = size;
        this.path = path;
        this.buffer = buffer;
    }
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT = 15 * 1000;
const DISCONNECT_SLEEP = 1000;
const BUFFER_SIZE_2GB = 2 ** 31;
const BUFFER_SIZE_20MB = 20 * 1024 * 1024;
