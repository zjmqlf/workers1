import { Api } from "../tl";
import type {
    DateLike,
    EntityLike,
    FileLike,
    MessageIDLike,
    MessageLike,
} from "../define";
import { RequestIter } from "../requestIter";
import {
    _EntityType,
    _entityType,
    TotalList,
    isArrayLike,
    groupBy,
    generateRandomBigInt,
} from "../Helpers";
import { getInputMedia, getMessageId, getPeerId, parseID } from "../Utils";
import type { TelegramClient } from "./";
import * as utils from "../Utils";
import { _parseMessageText } from "./messageParse";
import { _getPeer } from "./users";
import bigInt from "big-integer";

const _MAX_CHUNK_SIZE = 100;

interface MessageIterParams {
    entity: EntityLike;
    offsetId: number;
    minId: number;
    maxId: number;
    fromUser?: EntityLike;
    offsetDate: DateLike;
    addOffset: number;
    filter: any;
    search: string;
    replyTo: MessageIDLike;
}

export class _MessagesIter extends RequestIter {
    entity?: Api.TypeInputPeer;
    request?:
        | Api.messages.SearchGlobal
        | Api.messages.GetReplies
        | Api.messages.GetHistory
        | Api.messages.Search;
    addOffset?: number;
    maxId?: number;
    minId?: number;
    lastId?: number;

    async _init({
        entity,
        offsetId,
        minId,
        maxId,
        fromUser,
        offsetDate,
        addOffset,
        filter,
        search,
        replyTo,
    }: MessageIterParams) {
        if (entity) {
            this.entity = await this.client.getInputEntity(entity);
        } else {
            this.entity = undefined;
            if (this.reverse) {
                throw new Error("Cannot reverse global search");
            }
        }
        if (this.reverse) {
            offsetId = Math.max(offsetId, minId);
            if (offsetId && maxId) {
                if (maxId - offsetId <= 1) {
                    return false;
                }
            }
            if (!maxId) {
                maxId = Number.MAX_SAFE_INTEGER;
            }
        } else {
            offsetId = Math.max(offsetId, maxId);
            if (offsetId && minId) {
                if (offsetId - minId <= 1) {
                    return false;
                }
            }
        }
        if (this.reverse) {
            if (offsetId) {
                offsetId += 1;
            } else if (!offsetDate) {
                offsetId = 1;
            }
        }
        if (fromUser) {
            fromUser = await this.client.getInputEntity(fromUser);
        }
        if (!this.entity && fromUser) {
            this.entity = new Api.InputPeerEmpty();
        }
        if (!filter) {
            filter = new Api.InputMessagesFilterEmpty();
        }
        if (!this.entity) {
            this.request = new Api.messages.SearchGlobal({
                q: search || "",
                filter: filter,
                minDate: undefined,
                maxDate: offsetDate,
                offsetRate: undefined,
                offsetPeer: new Api.InputPeerEmpty(),
                offsetId: offsetId,
                limit: 1,
            });
        } else if (replyTo !== undefined) {
            this.request = new Api.messages.GetReplies({
                peer: this.entity,
                msgId: replyTo,
                offsetId: offsetId,
                offsetDate: offsetDate,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: bigInt.zero,
            });
        } else if (
            search !== undefined ||
            !(filter instanceof Api.InputMessagesFilterEmpty) ||
            fromUser !== undefined
        ) {
            this.request = new Api.messages.Search({
                peer: this.entity,
                q: search || "",
                filter: typeof filter === "function" ? new filter() : filter,
                minDate: undefined,
                maxDate: offsetDate,
                offsetId: offsetId,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: generateRandomBigInt(),
                fromId: fromUser,
            });
            if (
                !(filter instanceof Api.InputMessagesFilterEmpty) &&
                offsetDate &&
                !search &&
                !offsetId
            ) {
                for await (const m of this.client.iterMessages(this.entity, {
                    limit: 1,
                    offsetDate: offsetDate,
                })) {
                    this.request.offsetId = m.id + 1;
                }
            }
        } else {
            this.request = new Api.messages.GetHistory({
                peer: this.entity,
                limit: 1,
                offsetDate: offsetDate,
                offsetId: offsetId,
                minId: 0,
                maxId: 0,
                addOffset: addOffset,
                hash: bigInt.zero,
            });
        }
        if (this.limit <= 0) {
            const result = await this.client.invoke(this.request);
            if (result instanceof Api.messages.MessagesNotModified) {
                this.total = result.count;
            } else {
                if ("count" in result) {
                    this.total = result.count;
                } else {
                    this.total = result.messages.length;
                }
            }
            return false;
        }
        if (!this.waitTime) {
            this.waitTime = this.limit > 3000 ? 1 : 0;
        }
        if (
            this.reverse &&
            !(this.request instanceof Api.messages.SearchGlobal)
        ) {
            this.request.addOffset -= _MAX_CHUNK_SIZE;
        }
        this.addOffset = addOffset;
        this.maxId = maxId;
        this.minId = minId;
        this.lastId = this.reverse ? 0 : Number.MAX_SAFE_INTEGER;
    }

    async _loadNextChunk() {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        if (this.reverse && this.request.limit != _MAX_CHUNK_SIZE) {
            if (!(this.request instanceof Api.messages.SearchGlobal)) {
                this.request.addOffset = this.addOffset! - this.request.limit;
            }
        }
        const r = await this.client.invoke(this.request);
        if (r instanceof Api.messages.MessagesNotModified) {
            return true;
        }
        if ("count" in r) {
            this.total = r.count;
        } else {
            this.total = r.messages.length;
        }
        const entities = new Map();
        for (const x of [...r.users, ...r.chats]) {
            entities.set(getPeerId(x), x);
        }
        const messages: Api.Message[] = this.reverse
            ? (r.messages.reverse() as unknown as Api.Message[])
            : (r.messages as unknown as Api.Message[]);
        for (const message of messages) {
            if (!this._messageInRange(message)) {
                return true;
            }
            this.lastId = message.id;
            try {
                message._finishInit(this.client, entities, this.entity);
            } catch (e) {}
            message._entities = entities;
            this.buffer?.push(message);
        }
        if (r.messages.length < this.request.limit) {
            return true;
        }
        if (this.buffer) {
            this._updateOffset(this.buffer[this.buffer.length - 1], r);
        } else {
            return true;
        }
    }

    _messageInRange(message: Api.Message) {
        if (this.entity) {
            if (this.reverse) {
                if (message.id <= this.lastId! || message.id >= this.maxId!) {
                    return false;
                }
            } else {
                if (message.id >= this.lastId! || message.id <= this.minId!) {
                    return false;
                }
            }
        }
        return true;
    }

    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    _updateOffset(lastMessage: Api.Message, response: any) {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.offsetId = Number(lastMessage.id);
        if (this.reverse) {
            this.request.offsetId += 1;
        }
        if (this.request instanceof Api.messages.Search) {
            this.request.maxDate = -1;
        } else {
            if (!(this.request instanceof Api.messages.SearchGlobal)) {
                this.request.offsetDate = lastMessage.date!;
            }
        }
        if (this.request instanceof Api.messages.SearchGlobal) {
            if (lastMessage.inputChat) {
                this.request.offsetPeer = lastMessage.inputChat;
            } else {
                this.request.offsetPeer = new Api.InputPeerEmpty();
            }
            this.request.offsetRate = response.nextRate;
        }
    }
}

interface IDsIterInterface {
    entity: EntityLike;
    ids: Api.TypeInputMessage[];
}

export class _IDsIter extends RequestIter {
    _ids?: Api.TypeInputMessage[];
    _offset?: number;
    _ty: number | undefined;
    private _entity: Api.TypeInputPeer | undefined;

    async _init({ entity, ids }: IDsIterInterface) {
        this.total = ids.length;
        this._ids = this.reverse ? ids.reverse() : ids;
        this._offset = 0;
        this._entity = entity
            ? await this.client.getInputEntity(entity)
            : undefined;
        this._ty = this._entity ? _entityType(this._entity) : undefined;
        if (!this.waitTime) {
            this.waitTime = this.limit > 300 ? 10 : 0;
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    async _loadNextChunk() {
        const ids = this._ids!.slice(
            this._offset,
            this._offset! + _MAX_CHUNK_SIZE
        );
        if (!ids.length) {
            return false;
        }
        this._offset! += _MAX_CHUNK_SIZE;
        let fromId;
        let r;
        if (this._ty == _EntityType.CHANNEL) {
            try {
                r = await this.client.invoke(
                    new Api.channels.GetMessages({
                        channel: this._entity,
                        id: ids,
                    })
                );
            } catch (e: any) {
                if (e.errorMessage == "MESSAGE_IDS_EMPTY") {
                    r = new Api.messages.MessagesNotModified({
                        count: ids.length,
                    });
                } else {
                    throw e;
                }
            }
        } else {
            r = await this.client.invoke(
                new Api.messages.GetMessages({
                    id: ids,
                })
            );
            if (this._entity) {
                fromId = await _getPeer(this.client, this._entity);
            }
        }
        if (r instanceof Api.messages.MessagesNotModified) {
            this.buffer?.push(...Array(ids.length));
            return;
        }
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(utils.getPeerId(entity), entity);
        }
        let message: Api.TypeMessage;
        for (message of r.messages) {
            if (
                message instanceof Api.MessageEmpty ||
                (fromId &&
                    utils.getPeerId(message.peerId) != utils.getPeerId(fromId))
            ) {
                this.buffer?.push(undefined);
            } else {
                const temp: Api.Message = message as unknown as Api.Message;
                temp._finishInit(this.client, entities, this._entity);
                temp._entities = entities;
                this.buffer?.push(temp);
            }
        }
    }
}

export interface IterMessagesParams {
    limit?: number;
    offsetDate?: DateLike;
    offsetId: number;
    maxId: number;
    minId: number;
    addOffset: number;
    search?: string;
    filter?: Api.TypeMessagesFilter | Api.TypeMessagesFilter[];
    fromUser?: EntityLike;
    waitTime?: number;
    ids?: number | number[] | Api.TypeInputMessage | Api.TypeInputMessage[];
    reverse?: boolean;
    replyTo?: number;
    scheduled: boolean;
}

const IterMessagesDefaults: IterMessagesParams = {
    limit: undefined,
    offsetDate: undefined,
    offsetId: 0,
    maxId: 0,
    minId: 0,
    addOffset: 0,
    search: undefined,
    filter: undefined,
    fromUser: undefined,
    waitTime: undefined,
    ids: undefined,
    reverse: false,
    replyTo: undefined,
    scheduled: false,
};

export interface ForwardMessagesParams {
    messages: MessageIDLike | MessageIDLike[];
    fromPeer: EntityLike;
    silent?: boolean;
    schedule?: DateLike;
    dropAuthor?: boolean;
    noforwards?: boolean;
    topMsgId?: number | Api.Message;
}

export function iterMessages(
    client: TelegramClient,
    entity: EntityLike | undefined,
    options: Partial<IterMessagesParams>
) {
    const {
        limit,
        offsetDate,
        offsetId,
        maxId,
        minId,
        addOffset,
        search,
        filter,
        fromUser,
        waitTime,
        ids,
        reverse,
        replyTo,
    } = { ...IterMessagesDefaults, ...options };
    if (ids) {
        let idsArray;
        if (!isArrayLike(ids)) {
            idsArray = [ids];
        } else {
            idsArray = ids;
        }
        return new _IDsIter(
            client,
            idsArray.length,
            {
                reverse: reverse,
                waitTime: waitTime,
            },
            {
                entity: entity,
                ids: idsArray,
            }
        );
    }
    return new _MessagesIter(
        client,
        limit,
        {
            waitTime: waitTime,
            reverse: reverse,
        },
        {
            entity: entity,
            offsetId: offsetId,
            minId: minId,
            maxId: maxId,
            fromUser: fromUser,
            offsetDate: offsetDate,
            addOffset: addOffset,
            filter: filter,
            search: search,
            replyTo: replyTo,
        }
    );
}

export async function forwardMessages(
    client: TelegramClient,
    entity: EntityLike,
    {
        messages,
        fromPeer,
        silent,
        schedule,
        noforwards,
        dropAuthor,
        topMsgId,
    }: ForwardMessagesParams & { topMsgId?: number | Api.Message }
) {
    if (!isArrayLike(messages)) {
        messages = [messages];
    }

    entity = await client.getInputEntity(entity);

    let fromPeerId: string | undefined;
    if (fromPeer) {
        fromPeer = await client.getInputEntity(fromPeer);
        fromPeerId = await client.getPeerId(fromPeer);
    }

    const getKey = (m: string | Api.Message) => {
        if (m instanceof Api.Message) {
            return m.chatId;
        }
        let msgId = parseID(m);
        if (msgId) {
            if (fromPeerId !== undefined) return fromPeerId;
            throw new Error("fromPeer must be given if integer IDs are used");
        } else {
            throw new Error(`Cannot forward ${m}`);
        }
    };

    const sent: Api.Message[] = [];

    for (let [chatId, chunk] of groupBy(messages, getKey) as Map<
        number,
        Api.Message[] | number[]
    >) {
        let chat;
        let numbers: number[] = [];
        if (typeof chunk[0] == "number") {
            chat = fromPeer;
            numbers = chunk as number[];
        } else {
            chat = await (chunk as Api.Message[])[0].getInputChat();
            numbers = (chunk as Api.Message[]).map((m: Api.Message) => m.id);
        }

        const request = new Api.messages.ForwardMessages({
            fromPeer: chat,
            id: numbers,
            toPeer: entity,
            silent: silent,
            scheduleDate: schedule,
            noforwards: noforwards,
            dropAuthor: dropAuthor,
            topMsgId: topMsgId ? getMessageId(topMsgId) : undefined,
        });

        const result = await client.invoke(request);
        sent.push(
            client._getResponseMessage(request, result, entity) as Api.Message
        );
    }

    return sent;
}
