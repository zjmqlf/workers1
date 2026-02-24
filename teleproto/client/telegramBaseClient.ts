import { Connection } from "../network";
import { TelegramClient } from "./";
import { sleep } from "../Helpers";
import {
    ConnectionTCPFull,
    ConnectionTCPObfuscated,
} from "../network";
import { Session, StoreSession } from "../sessions";
import { Logger, PromisedNetSockets } from "../extensions";
import { Api } from "../tl";
import type { AuthKey } from "../crypto/AuthKey";
import { EntityCache } from "../entityCache";
import type { ParseInterface } from "./messageParse";
import { MarkdownParser, LogLevel, Deferred } from "../extensions";
import { MTProtoSender } from "../network";
import { LAYER } from "../tl/AllTLObjects";
import { Semaphore } from "async-mutex";

const EXPORTED_SENDER_RECONNECT_TIMEOUT = 1000;
const EXPORTED_SENDER_RELEASE_TIMEOUT = 30000;
const DEFAULT_DC_ID = 4;
const DEFAULT_IPV4_IP = "149.154.167.91";
const DEFAULT_IPV6_IP = "2001:067c:04e8:f004:0000:0000:0000:000a";

export interface TelegramClientParams {
    connection?: typeof Connection;
    useIPV6?: boolean;
    timeout?: number;
    requestRetries?: number;
    connectionRetries?: number;
    reconnectRetries?: number;
    downloadRetries?: number;
    retryDelay?: number;
    autoReconnect?: boolean;
    sequentialUpdates?: boolean;
    floodSleepThreshold?: number;
    deviceModel?: string;
    systemVersion?: string;
    appVersion?: string;
    langCode?: string;
    systemLangCode?: string;
    baseLogger?: Logger;
    useWSS?: boolean;
    maxConcurrentDownloads?: number;
    securityChecks?: boolean;
    networkSocket?: typeof PromisedNetSockets;
    reCaptchaCallback?: (siteKey: string) => Promise<string>;
}

const clientParamsDefault = {
    connection: ConnectionTCPFull,
    networkSocket: PromisedNetSockets,
    useIPV6: false,
    timeout: 10,
    requestRetries: 5,
    connectionRetries: Infinity,
    reconnectRetries: Infinity,
    retryDelay: 1000,
    downloadRetries: 5,
    autoReconnect: true,
    sequentialUpdates: false,
    floodSleepThreshold: 60,
    deviceModel: "",
    systemVersion: "",
    appVersion: "",
    langCode: "en",
    systemLangCode: "en",
    _securityChecks: true,
    useWSS: false,
};

export abstract class TelegramBaseClient {
    _config?: Api.Config;
    public _log: Logger;
    public _floodSleepThreshold: number;
    public session: Session;
    public apiHash: string;
    public apiId: number;
    public _requestRetries: number;
    public _downloadRetries: number;
    public _connectionRetries: number;
    public _reconnectRetries: number;
    public _retryDelay: number;
    public _timeout: number;
    public _autoReconnect: boolean;
    public _connection: typeof Connection;
    public _initRequest: Api.InitConnection;
    public _sender?: MTProtoSender;
    public _floodWaitedRequests: any;
    public _borrowedSenderPromises: any;
    public _bot?: boolean;
    public _useIPV6: boolean;
    public _selfInputPeer?: Api.InputPeerUser;
    public useWSS: boolean;
    public _errorHandler?: (error: Error) => Promise<void>;
    public _eventBuilders: [EventBuilder, CallableFunction][];
    public _entityCache: EntityCache;
    public _lastRequest?: number;
    public _parseMode?: ParseInterface;
    public _ALBUMS = new Map<
        string,
        [ReturnType<typeof setTimeout>, Api.TypeUpdate[]]
    >();
    public _exportedSenderPromises = new Map<number, Promise<MTProtoSender>>();
    _loopStarted: boolean;
    _updateState?: { pts: number; qts: number; date: number; seq: number };
    _reconnecting: boolean;
    _destroyed: boolean;
    _isSwitchingDc: boolean;
    _semaphore: Semaphore;
    _securityChecks: boolean;
    public networkSocket: typeof PromisedNetSockets;
    _connectedDeferred: Deferred<void>;

    constructor(
        session: string | Session,
        apiId: number,
        apiHash: string,
        clientParams: TelegramClientParams
    ) {
        clientParams = { ...clientParamsDefault, ...clientParams };
        if (!apiId || !apiHash) {
            throw new Error("Your API ID or Hash cannot be empty or undefined");
        }
        if (clientParams.baseLogger) {
            this._log = clientParams.baseLogger;
        } else {
            this._log = new Logger();
        }
        this._log.info("Running gramJS");
        if (session && typeof session == "string") {
            session = new StoreSession(session);
        }
        if (!(session instanceof Session)) {
            throw new Error(
                "Only StringSession and StoreSessions are supported currently :( "
            );
        }
        this._floodSleepThreshold = clientParams.floodSleepThreshold!;
        this.session = session;
        this.apiId = apiId;
        this.apiHash = apiHash;
        this._useIPV6 = clientParams.useIPV6!;
        this._requestRetries = clientParams.requestRetries!;
        this._downloadRetries = clientParams.downloadRetries!;
        this._connectionRetries = clientParams.connectionRetries!;
        this._reconnectRetries = clientParams.reconnectRetries!;
        this._retryDelay = clientParams.retryDelay || 0;
        this._timeout = clientParams.timeout!;
        this._autoReconnect = clientParams.autoReconnect!;
        this._semaphore = new Semaphore(
            clientParams.maxConcurrentDownloads || 1
        );
        this.networkSocket = clientParams.networkSocket || PromisedNetSockets;
        this._reCaptchaCallback = clientParams.reCaptchaCallback;
        if (!(clientParams.connection instanceof Function)) {
            throw new Error("Connection should be a class not an instance");
        }
        this._connection = clientParams.connection;
        this._initRequest = new Api.InitConnection({
            apiId: this.apiId,
            deviceModel:
                clientParams.deviceModel || "Unknown",
            systemVersion:
                clientParams.systemVersion || "1.0",
            appVersion: clientParams.appVersion || "1.0",
            langCode: clientParams.langCode,
            langPack: "",
            systemLangCode: clientParams.systemLangCode,
        });

        this._floodWaitedRequests = {};
        this._borrowedSenderPromises = {};
        this._bot = undefined;
        this._selfInputPeer = undefined;
        this.useWSS = clientParams.useWSS!;
        this._securityChecks = !!clientParams.securityChecks;
        this._entityCache = new EntityCache();
        this._config = undefined;
        this._loopStarted = false;
        this._reconnecting = false;
        this._destroyed = false;
        this._isSwitchingDc = false;
        this._connectedDeferred = new Deferred();
        this._parseMode = MarkdownParser;
    }

    get floodSleepThreshold() {
        return this._floodSleepThreshold;
    }

    set floodSleepThreshold(value: number) {
        this._floodSleepThreshold = Math.min(value || 0, 24 * 60 * 60);
    }

    set maxConcurrentDownloads(value: number) {
        // @ts-ignore
        this._semaphore._value = value;
    }

    async _initSession() {
        await this.session.load();
        if (!this.session.serverAddress) {
            this.session.setDC(
                DEFAULT_DC_ID,
                this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP,
                this.useWSS ? 443 : 80
            );
        } else {
            this._useIPV6 = this.session.serverAddress.includes(":");
        }
    }

    get connected() {
        return this._sender && this._sender.isConnected();
    }

    async disconnect() {
        await this._disconnect();
        await Promise.all(
            Object.values(this._exportedSenderPromises)
                .map((promises) => {
                    return Object.values(promises).map((promise: any) => {
                        return (
                            promise &&
                            promise.then((sender: MTProtoSender) => {
                                if (sender) {
                                    return sender.disconnect();
                                }
                                return undefined;
                            })
                        );
                    });
                })
                .flat()
        );
        this._exportedSenderPromises.clear();
    }

    get disconnected() {
        return !this._sender || this._sender._disconnected;
    }

    async _disconnect() {
        this._loopStarted = false;
        await this._sender?.disconnect();
    }

    async destroy() {
        this._destroyed = true;
        await Promise.all([
            this.disconnect(),
            ...Object.values(this._borrowedSenderPromises).map(
                (promise: any) => {
                    return promise.then((sender: any) => sender.disconnect());
                }
            ),
        ]);
    }

    async _authKeyCallback(authKey: AuthKey, dcId: number) {
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }

    async _cleanupExportedSender(dcId: number) {
        if (this.session.dcId !== dcId) {
            this.session.setAuthKey(undefined, dcId);
        }
        let sender = await this._exportedSenderPromises.get(dcId);
        this._exportedSenderPromises.delete(dcId);
        await sender?.disconnect();
    }

    async _connectSender(sender: MTProtoSender, dcId: number) {
        const dc = await this.getDC(dcId, !!sender.authKey.getKey());
        while (true) {
            try {
                await sender.connect(
                    new this._connection({
                        ip: dc.ipAddress,
                        port: dc.port,
                        dcId: dcId,
                        loggers: this._log,
                        socket: this.networkSocket,
                    }),
                    false
                );
                if (this.session.dcId !== dcId && !sender._authenticated) {
                    this._log.info(
                        `Exporting authorization for data center ${dc.ipAddress} with layer ${LAYER}`
                    );
                    const auth = await this.invoke(
                        new Api.auth.ExportAuthorization({ dcId: dcId })
                    );
                    this._initRequest.query = new Api.auth.ImportAuthorization({
                        id: auth.id,
                        bytes: auth.bytes,
                    });
                    const req = new Api.InvokeWithLayer({
                        layer: LAYER,
                        query: this._initRequest,
                    });
                    await sender.send(req);
                    sender._authenticated = true;
                }
                sender.dcId = dcId;
                sender.userDisconnected = false;

                return sender;
            } catch (err: any) {
                if (err.errorMessage === "DC_ID_INVALID") {
                    sender._authenticated = true;
                    sender.userDisconnected = false;
                    return sender;
                }
                if (this._errorHandler) {
                    await this._errorHandler(err as Error);
                } else if (this._log.canSend(LogLevel.ERROR)) {
                    console.error(err);
                }
                await sleep(1000);
                await sender.disconnect();
            }
        }
    }

    async _borrowExportedSender(
        dcId: number,
        shouldReconnect?: boolean,
        existingSender?: MTProtoSender
    ): Promise<MTProtoSender> {
        if (!this._exportedSenderPromises.get(dcId) || shouldReconnect) {
            this._exportedSenderPromises.set(
                dcId,
                this._connectSender(
                    existingSender || this._createExportedSender(dcId),
                    dcId
                )
            );
        }
        let sender: MTProtoSender;
        try {
            sender = await this._exportedSenderPromises.get(dcId)!;
            if (!sender.isConnected()) {
                if (sender.isConnecting) {
                    await sleep(EXPORTED_SENDER_RECONNECT_TIMEOUT);
                    return this._borrowExportedSender(dcId, false, sender);
                } else {
                    return this._borrowExportedSender(dcId, true, sender);
                }
            }
        } catch (err) {
            if (this._errorHandler) {
                await this._errorHandler(err as Error);
            }
            if (this._log.canSend(LogLevel.ERROR)) {
                console.error(err);
            }
            return this._borrowExportedSender(dcId, true);
        }

        return sender;
    }

    _createExportedSender(dcId: number) {
        return new MTProtoSender(this.session.getAuthKey(dcId), {
            logger: this._log,
            dcId,
            retries: this._connectionRetries,
            delay: this._retryDelay,
            autoReconnect: this._autoReconnect,
            connectTimeout: this._timeout,
            authKeyCallback: this._authKeyCallback.bind(this),
            isMainSender: dcId === this.session.dcId,
            onConnectionBreak: this._cleanupExportedSender.bind(this),
            client: this as unknown as TelegramClient,
            securityChecks: this._securityChecks,
            _exportedSenderPromises: this._exportedSenderPromises,
            reconnectRetries: this._reconnectRetries,
        });
    }

    getSender(dcId: number): Promise<MTProtoSender> {
        return dcId
            ? this._borrowExportedSender(dcId)
            : Promise.resolve(this._sender!);
    }

    async getDC(
        dcId: number,
        download: boolean
    ): Promise<{ id: number; ipAddress: string; port: number }> {
        throw new Error("Cannot be called from here!");
    }

    invoke<R extends Api.AnyRequest>(request: R): Promise<R["__response"]> {
        throw new Error("Cannot be called from here!");
    }

    setLogLevel(level: LogLevel) {
        this._log.setLevel(level);
    }

    get logger() {
        return this._log;
    }

    set onError(handler: (error: Error) => Promise<void>) {
        this._errorHandler = async (error: Error) => {
            try {
                await handler(error);
            } catch (e: any) {
                if (this._log.canSend(LogLevel.ERROR)) {
                    e.message = `Error ${e.message} thrown while handling top-level error: ${error.message}`;
                    console.error(e);
                }
            }
        };
    }
}
