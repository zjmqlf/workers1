import { AuthKey } from "../crypto/AuthKey";
import { MTProtoState } from "./MTProtoState";
import { BinaryReader, Logger, MessagePacker } from "../extensions";
import { GZIPPacked, MessageContainer, RPCResult, TLMessage } from "../tl/core";
import { Api } from "../tl";
import bigInt from "big-integer";
import { sleep } from "../Helpers";
import { RequestState } from "./RequestState";
import { doAuthentication } from "./Authenticator";
import { MTProtoPlainSender } from "./MTProtoPlainSender";
import {
    BadMessageError,
    InvalidBufferError,
    RPCError,
    RPCMessageToError,
    SecurityError,
    TypeNotFoundError,
} from "../errors";
import { Connection, UpdateConnectionState } from ".";
import type { TelegramClient } from "../client";
import { LogLevel } from "../extensions/Logger";
import { Mutex } from "async-mutex";
import { PendingState } from "../extensions/PendingState";
import MsgsAck = Api.MsgsAck;
import { Buffer } from "node:buffer";

interface DEFAULT_OPTIONS {
    logger: any;
    retries: number;
    reconnectRetries: number;
    delay: number;
    autoReconnect: boolean;
    connectTimeout: any;
    authKeyCallback: any;
    updateCallback?: any;
    autoReconnectCallback?: any;
    isMainSender: boolean;
    dcId: number;
    senderCallback?: any;
    client: TelegramClient;
    onConnectionBreak?: CallableFunction;
    securityChecks: boolean;
    _exportedSenderPromises: Map<number, Promise<MTProtoSender>>;
}

export class MTProtoSender {
    static DEFAULT_OPTIONS = {
        logger: null,
        reconnectRetries: Infinity,
        retries: Infinity,
        delay: 2000,
        autoReconnect: true,
        connectTimeout: null,
        authKeyCallback: null,
        updateCallback: null,
        autoReconnectCallback: null,
        isMainSender: null,
        senderCallback: null,
        onConnectionBreak: undefined,
        securityChecks: true,
    };
    _connection?: Connection;
    private readonly _log: Logger;
    private _dcId: number;
    private readonly _retries: number;
    private _reconnectRetries: number;
    private _currentRetries: number;
    private readonly _delay: number;
    private _connectTimeout: null;
    private _autoReconnect: boolean;
    private readonly _authKeyCallback: any;
    public _updateCallback: (
        client: TelegramClient,
        update: UpdateConnectionState
    ) => void;
    private readonly _autoReconnectCallback?: any;
    private readonly _senderCallback: any;
    private readonly _isMainSender: boolean;
    _userConnected: boolean;
    isReconnecting: boolean;
    _reconnecting: boolean;
    _disconnected: boolean;
    private _sendLoopHandle: any;
    private _recvLoopHandle: any;
    readonly authKey: AuthKey;
    private readonly _state: MTProtoState;
    private _sendQueue: MessagePacker;
    _pendingState: PendingState;
    private readonly _pendingAck: Set<any>;
    private readonly _lastAcks: any[];
    private readonly _handlers: any;
    private readonly _client: TelegramClient;
    private readonly _onConnectionBreak?: CallableFunction;
    userDisconnected: boolean;
    isConnecting: boolean;
    _authenticated: boolean;
    private _securityChecks: boolean;
    private _connectMutex: Mutex;
    private _cancelSend: boolean;
    private _abortController: AbortController;
    private _finishedConnecting: boolean;
    private _exportedSenderPromises = new Map<number, Promise<MTProtoSender>>();

    constructor(authKey: undefined | AuthKey, opts: DEFAULT_OPTIONS) {
        const args = {
            ...MTProtoSender.DEFAULT_OPTIONS,
            ...opts,
        };
        this._finishedConnecting = false;
        this._cancelSend = false;
        this._abortController = new AbortController();
        this._connection = undefined;
        this._log = args.logger;
        this._dcId = args.dcId;
        this._retries = args.retries;
        this._currentRetries = 0;
        this._reconnectRetries = args.reconnectRetries;
        this._delay = args.delay;
        this._autoReconnect = args.autoReconnect;
        this._connectTimeout = args.connectTimeout;
        this._authKeyCallback = args.authKeyCallback;
        this._updateCallback = args.updateCallback;
        this._autoReconnectCallback = args.autoReconnectCallback;
        this._isMainSender = args.isMainSender;
        this._senderCallback = args.senderCallback;
        this._client = args.client;
        this._onConnectionBreak = args.onConnectionBreak;
        this._securityChecks = args.securityChecks;
        this._connectMutex = new Mutex();
        this._exportedSenderPromises = args._exportedSenderPromises;
        this.userDisconnected = false;
        this.isConnecting = false;
        this._authenticated = false;
        this._userConnected = false;
        this.isReconnecting = false;
        this._reconnecting = false;
        this._disconnected = true;
        this._sendLoopHandle = null;
        this._recvLoopHandle = null;
        this.authKey = authKey || new AuthKey();
        this._state = new MTProtoState(
            this.authKey,
            this._log,
            this._securityChecks
        );
        this._sendQueue = new MessagePacker(this._state, this._log);
        this._pendingState = new PendingState();
        this._pendingAck = new Set();
        this._lastAcks = [];
        this._handlers = {
            [RPCResult.CONSTRUCTOR_ID.toString()]:
                this._handleRPCResult.bind(this),
            [MessageContainer.CONSTRUCTOR_ID.toString()]:
                this._handleContainer.bind(this),
            [GZIPPacked.CONSTRUCTOR_ID.toString()]:
                this._handleGzipPacked.bind(this),
            [Api.Pong.CONSTRUCTOR_ID.toString()]: this._handlePong.bind(this),
            [Api.BadServerSalt.CONSTRUCTOR_ID.toString()]:
                this._handleBadServerSalt.bind(this),
            [Api.BadMsgNotification.CONSTRUCTOR_ID.toString()]:
                this._handleBadNotification.bind(this),
            [Api.MsgDetailedInfo.CONSTRUCTOR_ID.toString()]:
                this._handleDetailedInfo.bind(this),
            [Api.MsgNewDetailedInfo.CONSTRUCTOR_ID.toString()]:
                this._handleNewDetailedInfo.bind(this),
            [Api.NewSessionCreated.CONSTRUCTOR_ID.toString()]:
                this._handleNewSessionCreated.bind(this),
            [Api.MsgsAck.CONSTRUCTOR_ID.toString()]: this._handleAck.bind(this),
            [Api.FutureSalts.CONSTRUCTOR_ID.toString()]:
                this._handleFutureSalts.bind(this),
            [Api.MsgsStateReq.CONSTRUCTOR_ID.toString()]:
                this._handleStateForgotten.bind(this),
            [Api.MsgResendReq.CONSTRUCTOR_ID.toString()]:
                this._handleStateForgotten.bind(this),
            [Api.MsgsAllInfo.CONSTRUCTOR_ID.toString()]:
                this._handleMsgAll.bind(this),
        };
    }

    set dcId(dcId: number) {
        this._dcId = dcId;
    }

    get dcId() {
        return this._dcId;
    }

    async connect(connection: Connection, force: boolean): Promise<boolean> {
        this.userDisconnected = false;
        if (this._userConnected && !force) {
            this._log.info("User is already connected!");
            return false;
        }
        this.isConnecting = true;
        this._connection = connection;
        this._finishedConnecting = false;
        for (let attempt = 0; attempt < this._retries; attempt++) {
            try {
                await this._connect();
                if (this._updateCallback) {
                    this._updateCallback(
                        this._client,
                        new UpdateConnectionState(
                            UpdateConnectionState.connected
                        )
                    );
                }
                this._finishedConnecting = true;
                break;
            } catch (err) {
                if (this._updateCallback && attempt === 0) {
                    this._updateCallback(
                        this._client,
                        new UpdateConnectionState(
                            UpdateConnectionState.disconnected
                        )
                    );
                }
                this._log.error(
                    `Connection failed attempt: ${attempt + 1}`
                );
                if (this._client._errorHandler) {
                    await this._client._errorHandler(err as Error);
                }
                if (this._log.canSend(LogLevel.ERROR)) {
                    console.error(err);
                }
                await sleep(this._delay);
            }
        }
        this.isConnecting = false;

        return this._finishedConnecting;
    }

    isConnected() {
        return this._userConnected;
    }

    _transportConnected() {
        return (
            !this._reconnecting &&
            this._connection &&
            this._connection._connected
        );
    }

    async disconnect() {
        this.userDisconnected = true;
        this._log.warn("Disconnecting...");
        await this._disconnect();
    }

    send(request: Api.AnyRequest) {
        const state = new RequestState(request);
        this._log.debug(`Send ${request.className}`);
        this._sendQueue.append(state);
        return state.promise;
    }

    addStateToQueue(state: RequestState) {
        this._sendQueue.append(state);
    }

    async _connect() {
        const connection = this._connection!;
        if (!connection.isConnected()) {
            this._log.info(
                "Connecting to {0}...".replace("{0}", connection.toString())
            );
            await connection.connect();
            this._log.debug("Connection success!");
        }
        if (!this.authKey.getKey()) {
            const plain = new MTProtoPlainSender(connection, this._log);
            this._log.debug("New auth_key attempt ...");
            const res = await doAuthentication(plain, this._log);
            this._log.debug("Generated new auth_key successfully");
            await this.authKey.setKey(res.authKey);
            this._state.timeOffset = res.timeOffset;
            if (this._authKeyCallback) {
                await this._authKeyCallback(this.authKey, this._dcId);
            }
        } else {
            this._authenticated = true;
            this._log.debug("Already have an auth key ...");
        }
        this._userConnected = true;
        this._disconnected = false;
        this.isReconnecting = false;
        if (!this._sendLoopHandle) {
            this._log.debug("Starting send loop");
            this._sendLoopHandle = this._sendLoop();
        }
        if (!this._recvLoopHandle) {
            this._log.debug("Starting receive loop");
            this._recvLoopHandle = this._recvLoop();
        }
        this._log.info(
            "Connection to %s complete!".replace("%s", connection.toString())
        );
    }

    async _disconnect() {
        const connection = this._connection;
        if (this._updateCallback) {
            this._updateCallback(
                this._client,
                new UpdateConnectionState(UpdateConnectionState.disconnected)
            );
        }
        if (connection === undefined) {
            this._log.info("Not disconnecting (already have no connection)");
            return;
        }
        this._log.info(
            "Disconnecting from %s...".replace("%s", connection.toString())
        );
        this._userConnected = false;
        this._disconnected = true;
        this._log.debug("Closing current connection...");
        this._abortController.abort();
        await connection.disconnect();
    }

    _cancelLoops() {
        this._cancelSend = true;
        this._abortController.abort();
    }

    async _sendLoop() {
        this._sendQueue.prepend(this._pendingState.values());
        this._pendingState.clear();
        while (this._userConnected && !this.isReconnecting) {
            const appendAcks = () => {
                if (this._pendingAck.size) {
                    const ack = new RequestState(
                        new MsgsAck({ msgIds: Array(...this._pendingAck) })
                    );
                    this._sendQueue.append(ack);
                    this._lastAcks.push(ack);
                    if (this._lastAcks.length >= 10) {
                        this._lastAcks.shift();
                    }
                    this._pendingAck.clear();
                }
            };
            appendAcks();
            this._log.debug(
                `Waiting for messages to send... ${this.isReconnecting}`
            );
            await this._sendQueue.wait();
            appendAcks();
            const res = await this._sendQueue.get();
            this._log.debug(`Got ${res?.batch.length} message(s) to send`);
            if (this.isReconnecting) {
                this._log.debug("Reconnecting");
                this._sendLoopHandle = undefined;
                return;
            }
            if (!res) {
                continue;
            }
            let { data } = res;
            const { batch } = res;
            this._log.debug(
                `Encrypting ${batch.length} message(s) in ${data.length} bytes for sending`
            );
            this._log.debug(
                `Sending   ${batch.map((m) => m.request.className)}`
            );
            data = await this._state.encryptMessageData(data);
            for (const state of batch) {
                if (!Array.isArray(state)) {
                    if (state.request.classType === "request") {
                        this._pendingState.set(state.msgId, state);
                    }
                } else {
                    for (const s of state) {
                        if (s.request.classType === "request") {
                            this._pendingState.set(s.msgId, s);
                        }
                    }
                }
            }
            try {
                await this._connection!.send(data);
            } catch (e) {
                if (!this.userDisconnected) {
                    this._log.debug(
                        `Connection closed while sending data ${e}`
                    );
                    if (this._log.canSend(LogLevel.DEBUG)) {
                        console.error(e);
                    }
                    this.reconnect();
                }
                this._sendLoopHandle = undefined;
                return;
            }
            this._log.debug("Encrypted messages put in a queue to be sent");
        }
        this._sendLoopHandle = undefined;
    }

    async _recvLoop() {
        this._abortController = new AbortController();
        const signal = this._abortController.signal;
        
        let body;
        let message;
        while (this._userConnected && !this.isReconnecting) {
            if (signal.aborted) {
                this._log.debug("Receive loop aborted");
                this._recvLoopHandle = undefined;
                return;
            }
            this._log.debug("Receiving items from the network...");
            try {
                body = await this._connection!.recv();
            } catch (e) {
                if (signal.aborted) {
                    this._log.debug("Receive operation was aborted");
                    this._recvLoopHandle = undefined;
                    return;
                }
                if (this._currentRetries > this._reconnectRetries) {
                    for (const state of this._pendingState.values()) {
                        state.reject(
                            "Maximum reconnection retries reached. Aborting!"
                        );
                    }
                    this.userDisconnected = true;
                    return;
                }
                if (!this.userDisconnected) {
                    this._log.warn("Connection closed while receiving data");
                    if (this._log.canSend(LogLevel.WARN)) {
                        console.error(e);
                    }
                    this.reconnect();
                }
                this._recvLoopHandle = undefined;
                return;
            }
            try {
                message = await this._state.decryptMessageData(body);
            } catch (e) {
                this._log.debug(
                    `Error while receiving items from the network ${e}`
                );
                if (e instanceof TypeNotFoundError) {
                    this._log.info(
                        `Type ${e.invalidConstructorId} not found, remaining data ${e.remaining}`
                    );
                    continue;
                } else if (e instanceof SecurityError) {
                    this._log.warn(
                        `Security error while unpacking a received message: ${e}`
                    );
                    continue;
                } else if (e instanceof InvalidBufferError) {
                    if (e.code === 404) {
                        this._handleBadAuthKey();
                    } else {
                        this._log.warn(
                            `Invalid buffer ${e.code} for dc ${this._dcId}`
                        );
                        this.reconnect();
                    }
                    this._recvLoopHandle = undefined;
                    return;
                } else {
                    this._log.error("Unhandled error while receiving data");
                    if (this._client._errorHandler) {
                        await this._client._errorHandler(e as Error);
                    }
                    if (this._log.canSend(LogLevel.ERROR)) {
                        console.log(e);
                    }
                    this.reconnect();
                    this._recvLoopHandle = undefined;
                    return;
                }
            }
            try {
                await this._processMessage(message);
            } catch (e) {
                if (e instanceof RPCError) {
                    const rpcMessage = e.errorMessage;
                    if (
                        rpcMessage === "AUTH_KEY_UNREGISTERED" ||
                        rpcMessage === "SESSION_REVOKED"
                    ) {
                        this._handleBadAuthKey(true);
                    }
                } else {
                    this._log.error("Unhandled error while receiving data");
                    if (this._client._errorHandler) {
                        await this._client._errorHandler(e as Error);
                    }
                    if (this._log.canSend(LogLevel.ERROR)) {
                        console.log(e);
                    }
                }
            }
            this._currentRetries = 0;
        }
        this._recvLoopHandle = undefined;
    }

    _handleBadAuthKey(shouldSkipForMain: boolean = false) {
        if (shouldSkipForMain && this._isMainSender) {
            return;
        }
        this._log.warn(
            `Broken authorization key for dc ${this._dcId}, resetting...`
        );
        if (this._isMainSender && this._updateCallback) {
            this._updateCallback(
                this._client,
                new UpdateConnectionState(UpdateConnectionState.broken)
            );
        } else if (!this._isMainSender && this._onConnectionBreak) {
            this._onConnectionBreak(this._dcId);
        }
    }

    async _processMessage(message: TLMessage) {
        this._pendingAck.add(message.msgId);
        message.obj = await message.obj;
        let handler = this._handlers[message.obj.CONSTRUCTOR_ID.toString()];
        if (!handler) {
            handler = this._handleUpdate.bind(this);
        }
        await handler(message);
    }

    _popStates(msgId: bigInt.BigInteger) {
        const state = this._pendingState.getAndDelete(msgId);
        if (state) {
            return [state];
        }
        const toPop = [];
        for (const pendingState of this._pendingState.values()) {
            if (pendingState.containerId?.equals(msgId)) {
                toPop.push(pendingState.msgId!);
            }
        }
        if (toPop.length) {
            const temp = [];
            for (const x of toPop) {
                temp.push(this._pendingState.getAndDelete(x));
            }
            return temp;
        }
        for (const ack of this._lastAcks) {
            if (ack.msgId === msgId) {
                return [ack];
            }
        }

        return [];
    }

    _handleRPCResult(message: TLMessage) {
        const result = message.obj;
        const state = this._pendingState.getAndDelete(result.reqMsgId);
        this._log.debug(`Handling RPC result for message ${result.reqMsgId}`);
        if (!state) {
            try {
                const reader = new BinaryReader(result.body);
                if (!(reader.tgReadObject() instanceof Api.upload.File)) {
                    throw new TypeNotFoundError(0, Buffer.alloc(0));
                }
            } catch (e) {
                if (e instanceof TypeNotFoundError) {
                    this._log.info(
                        `Received response without parent request: ${result.body}`
                    );
                    return;
                }
                throw e;
            }
            return;
        }
        if (result.error) {
            const error = RPCMessageToError(result.error, state.request);
            this._sendQueue.append(
                new RequestState(new MsgsAck({ msgIds: [state.msgId!] }))
            );
            state.reject(error);
            throw error;
        } else {
            try {
                const reader = new BinaryReader(result.body);
                const read = state.request.readResult(reader);
                this._log.debug(`Handling RPC result ${read?.className}`);
                state.resolve(read);
            } catch (err) {
                state.reject(err);
                throw err;
            }
        }
    }

    async _handleContainer(message: TLMessage) {
        this._log.debug("Handling container");
        for (const innerMessage of message.obj.messages) {
            await this._processMessage(innerMessage);
        }
    }

    async _handleGzipPacked(message: TLMessage) {
        this._log.debug("Handling gzipped data");
        const reader = new BinaryReader(message.obj.data);
        message.obj = reader.tgReadObject();
        await this._processMessage(message);
    }

    async _handleUpdate(message: TLMessage) {
        if (message.obj.SUBCLASS_OF_ID !== 0x8af52aac) {
            this._log.warn(
                `Note: ${message.obj.className} is not an update, not dispatching it`
            );
            return;
        }
        this._log.debug("Handling update " + message.obj.className);
        if (this._updateCallback) {
            this._updateCallback(this._client, message.obj);
        }
    }

    async _handlePong(message: TLMessage) {
        const pong = message.obj;
        this._log.debug(`Handling pong for message ${pong.msgId}`);
        const state = this._pendingState.get(pong.msgId.toString());
        this._pendingState.delete(pong.msgId.toString());
        if (state) {
            state.resolve(pong);
        }
    }

    async _handleBadServerSalt(message: TLMessage) {
        const badSalt = message.obj;
        this._log.debug(`Handling bad salt for message ${badSalt.badMsgId}`);
        this._state.salt = badSalt.newServerSalt;
        const states = this._popStates(badSalt.badMsgId);
        this._sendQueue.extend(states);
        this._log.debug(`${states.length} message(s) will be resent`);
    }

    async _handleBadNotification(message: TLMessage) {
        const badMsg = message.obj;
        const states = this._popStates(badMsg.badMsgId);
        this._log.debug(`Handling bad msg ${JSON.stringify(badMsg)}`);
        if ([16, 17].includes(badMsg.errorCode)) {
            const to = this._state.updateTimeOffset(bigInt(message.msgId));
            this._log.info(`System clock is wrong, set time offset to ${to}s`);
        } else if (badMsg.errorCode === 32) {
            this._state._sequence += 64;
        } else if (badMsg.errorCode === 33) {
            this._state._sequence -= 16;
        } else {
            for (const state of states) {
                state.reject(
                    new BadMessageError(state.request, badMsg.errorCode)
                );
            }

            return;
        }
        this._sendQueue.extend(states);
        this._log.debug(
            `${states.length} messages will be resent due to bad msg`
        );
    }

    async _handleDetailedInfo(message: TLMessage) {
        const msgId = message.obj.answerMsgId;
        this._log.debug(`Handling detailed info for message ${msgId}`);
        this._pendingAck.add(msgId);
    }

    async _handleNewDetailedInfo(message: TLMessage) {
        const msgId = message.obj.answerMsgId;
        this._log.debug(`Handling new detailed info for message ${msgId}`);
        this._pendingAck.add(msgId);
    }

    async _handleNewSessionCreated(message: TLMessage) {
        this._log.debug("Handling new session created");
        this._state.salt = message.obj.serverSalt;
    }

    _handleAck() {}

    async _handleFutureSalts(message: TLMessage) {
        this._log.debug(`Handling future salts for message ${message.msgId}`);
        const state = this._pendingState.getAndDelete(message.msgId);
        if (state) {
            state.resolve(message.obj);
        }
    }

    async _handleStateForgotten(message: TLMessage) {
        this._sendQueue.append(
            new RequestState(
                new Api.MsgsStateInfo({
                    reqMsgId: message.msgId,
                    info: String.fromCharCode(1).repeat(message.obj.msgIds),
                })
            )
        );
    }

    async _handleMsgAll(message: TLMessage) {}

    reconnect() {
        if (this._userConnected && !this.isReconnecting) {
            this.isReconnecting = true;
            this._currentRetries++;
            if (this._isMainSender) {
                this._log.debug("Reconnecting all senders");
                for (const promise of this._exportedSenderPromises.values()) {
                    promise
                        .then((sender) => {
                            if (sender && !sender._isMainSender) {
                                sender.reconnect();
                            }
                        })
                        .catch((error) => {
                            this._log.warn(
                                "Error getting sender to reconnect to"
                            );
                        });
                }
            }
            sleep(1000).then(() => {
                this._log.info("Started reconnecting");
                this._reconnect();
            });
        }
    }

    async _reconnect() {
        try {
            this._log.warn("[Reconnect] Closing current connection...");
            await this._disconnect();
        } catch (err) {
            this._log.warn("Error happened while disconnecting");
            if (this._client._errorHandler) {
                await this._client._errorHandler(err as Error);
            }
            if (this._log.canSend(LogLevel.ERROR)) {
                console.error(err);
            }
        }
        this._log.debug(
            `Adding ${this._sendQueue._pendingStates.length} old request to resend`
        );
        for (let i = 0; i < this._sendQueue._pendingStates.length; i++) {
            if (this._sendQueue._pendingStates[i].msgId != undefined) {
                this._pendingState.set(
                    this._sendQueue._pendingStates[i].msgId!,
                    this._sendQueue._pendingStates[i]
                );
            }
        }
        this._sendQueue.clear();
        this._state.reset();
        const connection = this._connection!;
        // @ts-ignore
        const newConnection = new connection.constructor({
            ip: connection._ip,
            port: connection._port,
            dcId: connection._dcId,
            loggers: connection._log,
            socket: this._client.networkSocket,
        });
        await this.connect(newConnection, true);
        this.isReconnecting = false;
        this._sendQueue.prepend(this._pendingState.values());
        this._pendingState.clear();
        if (this._autoReconnectCallback) {
            await this._autoReconnectCallback();
        }
    }
}
