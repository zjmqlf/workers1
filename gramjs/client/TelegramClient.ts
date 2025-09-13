import { TelegramBaseClient, TelegramClientParams } from "./telegramBaseClient";
import * as parseMethods from "./messageParse";
import * as messageMethods from "./messages";
import * as userMethods from "./users";
import * as dialogMethods from "./dialogs";
import type { Entity, EntityLike, MessageIDLike } from "../define";
import { Api } from "../tl";
import { sanitizeParseMode } from "../Utils";
import { MTProtoSender } from "../network";
import { LAYER } from "../tl/AllTLObjects";
import { betterConsoleLog } from "../Helpers";
import { Session } from "../sessions";
import { LogLevel } from "../extensions";
import { inspect } from "node:util";

export class TelegramClient extends TelegramBaseClient {
    constructor(
        session: string | Session,
        apiId: number,
        apiHash: string,
        clientParams: TelegramClientParams
    ) {
        super(session, apiId, apiHash, clientParams);
    }

    get parseMode() {
        return this._parseMode;
    }

    setParseMode(
        mode:
            | "md"
            | "md2"
            | "markdown"
            | "markdownv2"
            | "html"
            | parseMethods.ParseInterface
            | undefined
    ) {
        if (mode) {
            this._parseMode = sanitizeParseMode(mode);
        } else {
            this._parseMode = undefined;
        }
    }

    iterMessages(
        entity: EntityLike | undefined,
        iterParams: Partial<messageMethods.IterMessagesParams> = {}
    ) {
        return messageMethods.iterMessages(this, entity, iterParams);
    }

    forwardMessages(
        entity: EntityLike,
        forwardMessagesParams: messageMethods.ForwardMessagesParams
    ) {
        return messageMethods.forwardMessages(
            this,
            entity,
            forwardMessagesParams
        );
    }

    iterDialogs(iterDialogsParams: dialogMethods.IterDialogsParams = {}) {
        return dialogMethods.iterDialogs(this, iterDialogsParams);
    }

    getDialogs(params: dialogMethods.IterDialogsParams = {}) {
        return dialogMethods.getDialogs(this, params);
    }

    invoke<R extends Api.AnyRequest>(
        request: R,
        dcId?: number
    ): Promise<R["__response"]> {
        return userMethods.invoke(this, request, dcId);
    }
    invokeWithSender<R extends Api.AnyRequest>(
        request: R,
        sender?: MTProtoSender
    ): Promise<R["__response"]> {
        return userMethods.invoke(this, request, undefined, sender);
    }

    getMe(inputPeer: true): Promise<Api.InputPeerUser>;
    getMe(inputPeer?: false): Promise<Api.User>;
    getMe(inputPeer = false) {
        return userMethods.getMe(this, inputPeer);
    }

    getEntity(entity: EntityLike): Promise<Entity>;
    getEntity(entity: EntityLike[]): Promise<Entity[]>;
    getEntity(entity: any) {
        return userMethods.getEntity(this, entity);
    }

    getInputEntity(entity: EntityLike) {
        return userMethods.getInputEntity(this, entity);
    }

    getPeerId(peer: EntityLike, addMark = true) {
        return userMethods.getPeerId(this, peer, addMark);
    }

    _getInputDialog(peer: any) {
        return userMethods._getInputDialog(this, peer);
    }

    _getInputNotify(notify: any) {
        return userMethods._getInputNotify(this, notify);
    }

    async _handleReconnect() {
        this._log.info("Handling reconnect!");
        try {
            const res = await this.getMe();
        } catch (e) {
            this._log.error(`Error while trying to reconnect`);
            if (this._errorHandler) {
                await this._errorHandler(e as Error);
            }
            if (this._log.canSend(LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }

    async connect() {
        await this._initSession();
        if (this._sender === undefined) {
            this._sender = new MTProtoSender(this.session.getAuthKey(), {
                logger: this._log,
                dcId: this.session.dcId || 4,
                retries: this._connectionRetries,
                delay: this._retryDelay,
                autoReconnect: this._autoReconnect,
                connectTimeout: this._timeout,
                authKeyCallback: this._authKeyCallback.bind(this),
                isMainSender: true,
                client: this,
                securityChecks: this._securityChecks,
                autoReconnectCallback: this._handleReconnect.bind(this),
                _exportedSenderPromises: this._exportedSenderPromises,
                reconnectRetries: this._reconnectRetries,
            });
        }
        const connection = new this._connection({
            ip: this.session.serverAddress,
            port: this.useWSS ? 443 : 80,
            dcId: this.session.dcId,
            loggers: this._log,
            socket: this.networkSocket,
        });
        if (!(await this._sender.connect(connection, false))) {
            return false;
        }
        this.session.setAuthKey(this._sender.authKey);
        this.session.save();

        this._initRequest.query = new Api.help.GetConfig();
        this._log.info(`Using LAYER ${LAYER} for initial connect`);
        await this._sender.send(
            new Api.InvokeWithLayer({
                layer: LAYER,
                query: this._initRequest,
            })
        );
        this._connectedDeferred.resolve();
        this._isSwitchingDc = false;
        return true;
    }

    async _switchDC(newDc: number) {
        this._log.info(`Reconnecting to new data center ${newDc}`);
        const DC = await this.getDC(newDc);
        this.session.setDC(newDc, DC.ipAddress, DC.port);
        await this._sender!.authKey.setKey(undefined);
        this.session.setAuthKey(undefined);
        this.session.save();
        this._isSwitchingDc = true;
        await this._disconnect();
        this._sender = undefined;
        return await this.connect();
    }

    async getDC(
        dcId: number,
        downloadDC = false,
        web = false
    ): Promise<{ id: number; ipAddress: string; port: number }> {
        this._log.debug(`Getting DC ${dcId}`);
        if (!this._config) {
            this._config = await this.invoke(new Api.help.GetConfig());
        }
        for (const DC of this._config.dcOptions) {
            if (DC.id === dcId && !!DC.ipv6 === this._useIPV6) {
                return {
                    id: DC.id,
                    ipAddress: DC.ipAddress,
                    port: 443,
                };
            }
        }
        throw new Error(`Cannot find the DC with the ID of ${dcId}`);
    }

    _removeSender(dcId: number) {
        delete this._borrowedSenderPromises[dcId];
    }

    _getResponseMessage(req: any, result: any, inputChat: any) {
        return parseMethods._getResponseMessage(this, req, result, inputChat);
    }

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

}
