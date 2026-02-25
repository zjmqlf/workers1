import { SenderGetter } from "./senderGetter";
import type { Entity, EntityLike } from "../../define";
import { Api } from "../";
import type { TelegramClient } from "../../client";
import { ChatGetter } from "./chatGetter";
import * as utils from "../../Utils";
import { Forward } from "./forward";
import { File } from "./file";
import { returnBigInt } from "../../Helpers";
import { _selfId } from "../../client/users";
import bigInt, { BigInteger } from "big-integer";
import { Buffer } from "node:buffer";

interface MessageBaseInterface {
    id: any;
    peerId?: any;
    date?: any;
    out?: any;
    mentioned?: any;
    mediaUnread?: any;
    silent?: any;
    post?: any;
    fromId?: any;
    replyTo?: any;
    message?: any;
    fwdFrom?: any;
    viaBotId?: any;
    media?: any;
    replyMarkup?: any;
    entities?: any;
    views?: any;
    editDate?: any;
    postAuthor?: any;
    groupedId?: any;
    fromScheduled?: any;
    legacy?: any;
    editHide?: any;
    pinned?: any;
    restrictionReason?: any;
    forwards?: any;
    ttlPeriod?: number;
    replies?: any;
    action?: any;
    reactions?: any;
    noforwards?: any;
    _entities?: Map<string, Entity>;
}

export class CustomMessage extends SenderGetter {
    static CONSTRUCTOR_ID: number;
    static SUBCLASS_OF_ID: number;
    CONSTRUCTOR_ID!: number;
    SUBCLASS_OF_ID!: number;
    out?: boolean;
    mentioned?: boolean;
    mediaUnread?: boolean;
    silent?: boolean;
    post?: boolean;
    fromScheduled?: boolean;
    legacy?: boolean;
    editHide?: boolean;
    pinned?: boolean;
    id!: number;
    fromId?: Api.TypePeer;
    peerId!: Api.TypePeer;
    fwdFrom?: Api.TypeMessageFwdHeader;
    viaBotId?: bigInt.BigInteger;
    replyTo?: Api.MessageReplyHeader;
    date!: number;
    message!: string;
    media?: Api.TypeMessageMedia;
    replyMarkup?: Api.TypeReplyMarkup;
    entities?: Api.TypeMessageEntity[];
    views?: number;
    forwards?: number;
    replies?: Api.TypeMessageReplies;
    editDate?: number;
    postAuthor?: string;
    groupedId?: BigInteger;
    restrictionReason?: Api.TypeRestrictionReason[];
    action!: Api.TypeMessageAction;
    ttlPeriod?: number;
    reactions?: Api.MessageReactions;
    noforwards?: boolean;
    _actionEntities?: any;
    _client?: TelegramClient;
    _text?: string;
    _file?: File;
    _replyMessage?: Api.Message;
    _viaBot?: EntityLike;
    _viaInputBot?: EntityLike;
    _inputSender?: any;
    _forward?: Forward;
    _sender?: any;
    _entities?: Map<string, Entity>;
    /* @ts-ignore */
    getBytes(): Buffer;
    originalArgs: any;
    patternMatch?: RegExpMatchArray;

    init({
        id,
        peerId = undefined,
        date = undefined,
        out = undefined,
        mentioned = undefined,
        mediaUnread = undefined,
        silent = undefined,
        post = undefined,
        fromId = undefined,
        replyTo = undefined,
        message = undefined,
        fwdFrom = undefined,
        viaBotId = undefined,
        media = undefined,
        replyMarkup = undefined,
        entities = undefined,
        views = undefined,
        editDate = undefined,
        postAuthor = undefined,
        groupedId = undefined,
        fromScheduled = undefined,
        legacy = undefined,
        editHide = undefined,
        pinned = undefined,
        restrictionReason = undefined,
        forwards = undefined,
        replies = undefined,
        action = undefined,
        reactions = undefined,
        noforwards = undefined,
        ttlPeriod = undefined,
        _entities = new Map<string, Entity>(),
    }: MessageBaseInterface) {
        if (!id) throw new Error("id is a required attribute for Message");
        let senderId = undefined;
        if (fromId) {
            senderId = utils.getPeerId(fromId);
        } else if (peerId) {
            if (post || (!out && peerId instanceof Api.PeerUser)) {
                senderId = utils.getPeerId(peerId);
            }
        }
        this._entities = _entities;
        this.out = out;
        this.mentioned = mentioned;
        this.mediaUnread = mediaUnread;
        this.silent = silent;
        this.post = post;
        this.post = post;
        this.fromScheduled = fromScheduled;
        this.legacy = legacy;
        this.editHide = editHide;
        this.ttlPeriod = ttlPeriod;
        this.id = id;
        this.fromId = fromId;
        this.peerId = peerId;
        this.fwdFrom = fwdFrom;
        this.viaBotId = viaBotId;
        this.replyTo = replyTo;
        this.date = date;
        this.message = message;
        this.media = media instanceof Api.MessageMediaEmpty ? media : undefined;
        this.replyMarkup = replyMarkup;
        this.entities = entities;
        this.views = views;
        this.forwards = forwards;
        this.replies = replies;
        this.editDate = editDate;
        this.pinned = pinned;
        this.postAuthor = postAuthor;
        this.groupedId = groupedId;
        this.restrictionReason = restrictionReason;
        this.action = action;
        this.noforwards = noforwards;
        this.reactions = reactions;
        this._client = undefined;
        this._text = undefined;
        this._file = undefined;
        this._replyMessage = undefined;
        this._viaBot = undefined;
        this._viaInputBot = undefined;
        this._actionEntities = undefined;
        ChatGetter.initChatClass(this, { chatPeer: peerId, broadcast: post });
        SenderGetter.initSenderClass(this, {
            senderId: senderId ? returnBigInt(senderId) : undefined,
        });
        this._forward = undefined;
    }

    constructor(args: MessageBaseInterface) {
        super();
        this.init(args);
    }

    _finishInit(
        client: TelegramClient,
        entities: Map<string, Entity>,
        inputChat?: EntityLike
    ) {
        this._client = client;
        const cache = client._entityCache;
        if (this.senderId) {
            [this._sender, this._inputSender] = utils._getEntityPair(
                this.senderId.toString(),
                entities,
                cache
            );
        }
        if (this.chatId) {
            [this._chat, this._inputChat] = utils._getEntityPair(
                this.chatId.toString(),
                entities,
                cache
            );
        }
        if (inputChat) {
            this._inputChat = inputChat;
        }
        if (this.viaBotId) {
            [this._viaBot, this._viaInputBot] = utils._getEntityPair(
                this.viaBotId.toString(),
                entities,
                cache
            );
        }
        if (this.fwdFrom) {
            this._forward = new Forward(this._client, this.fwdFrom, entities);
        }
        if (this.action) {
            if (
                this.action instanceof Api.MessageActionChatAddUser ||
                this.action instanceof Api.MessageActionChatCreate
            ) {
                this._actionEntities = this.action.users.map((i) =>
                    entities.get(i.toString())
                );
            } else if (this.action instanceof Api.MessageActionChatDeleteUser) {
                this._actionEntities = [
                    entities.get(this.action.userId.toString()),
                ];
            } else if (
                this.action instanceof Api.MessageActionChatJoinedByLink
            ) {
                this._actionEntities = [
                    entities.get(
                        utils.getPeerId(
                            new Api.PeerChannel({
                                channelId: this.action.inviterId,
                            })
                        )
                    ),
                ];
            } else if (
                this.action instanceof Api.MessageActionChannelMigrateFrom
            ) {
                this._actionEntities = [
                    entities.get(
                        utils.getPeerId(
                            new Api.PeerChat({ chatId: this.action.chatId })
                        )
                    ),
                ];
            }
        }
    }

    get client() {
        return this._client;
    }

    get text() {
        if (this._text === undefined && this._client) {
            if (!this._client.parseMode) {
                this._text = this.message;
            } else {
                this._text = this._client.parseMode.unparse(
                    this.message || "",
                    this.entities || []
                );
            }
        }
        return this._text || "";
    }

    set text(value: string) {
        this._text = value;
        if (this._client && this._client.parseMode) {
            [this.message, this.entities] = this._client.parseMode.parse(value);
        } else {
            this.message = value;
            this.entities = [];
        }
    }

    get rawText() {
        return this.message || "";
    }

    set rawText(value: string) {
        this.message = value;
        this.entities = [];
        this._text = "";
    }

    get isReply(): boolean {
        return !!this.replyTo;
    }

    get forward() {
        return this._forward;
    }

    get file() {
        if (!this._file) {
            const media = this.photo || this.document;
            if (media) {
                this._file = new File(media);
            }
        }
        return this._file;
    }

    get photo() {
        if (this.media instanceof Api.MessageMediaPhoto) {
            if (this.media.photo instanceof Api.Photo) return this.media.photo;
        } else if (this.action instanceof Api.MessageActionChatEditPhoto) {
            return this.action.photo;
        } else {
            return this.webPreview && this.webPreview.photo instanceof Api.Photo
                ? this.webPreview.photo
                : undefined;
        }
        return undefined;
    }

    get document() {
        if (this.media instanceof Api.MessageMediaDocument) {
            if (this.media.document instanceof Api.Document)
                return this.media.document;
        } else {
            const web = this.webPreview;
            return web && web.document instanceof Api.Document
                ? web.document
                : undefined;
        }
        return undefined;
    }

    get webPreview() {
        if (this.media instanceof Api.MessageMediaWebPage) {
            if (this.media.webpage instanceof Api.WebPage)
                return this.media.webpage;
        }
    }

    get audio() {
        return this._documentByAttribute(
            Api.DocumentAttributeAudio,
            (attr: Api.DocumentAttributeAudio) => !attr.voice
        );
    }

    get voice() {
        return this._documentByAttribute(
            Api.DocumentAttributeAudio,
            (attr: Api.DocumentAttributeAudio) => !!attr.voice
        );
    }

    get video() {
        return this._documentByAttribute(Api.DocumentAttributeVideo);
    }

    get videoNote() {
        return this._documentByAttribute(
            Api.DocumentAttributeVideo,
            (attr: Api.DocumentAttributeVideo) => !!attr.roundMessage
        );
    }

    get gif() {
        return this._documentByAttribute(Api.DocumentAttributeAnimated);
    }

    get sticker() {
        return this._documentByAttribute(Api.DocumentAttributeSticker);
    }

    get contact() {
        if (this.media instanceof Api.MessageMediaContact) {
            return this.media;
        }
    }

    get game() {
        if (this.media instanceof Api.MessageMediaGame) {
            return this.media.game;
        }
    }

    get geo() {
        if (
            this.media instanceof Api.MessageMediaGeo ||
            this.media instanceof Api.MessageMediaGeoLive ||
            this.media instanceof Api.MessageMediaVenue
        ) {
            return this.media.geo;
        }
    }

    get invoice() {
        if (this.media instanceof Api.MessageMediaInvoice) {
            return this.media;
        }
    }

    get poll() {
        if (this.media instanceof Api.MessageMediaPoll) {
            return this.media;
        }
    }

    get venue() {
        if (this.media instanceof Api.MessageMediaVenue) {
            return this.media;
        }
    }

    get dice() {
        if (this.media instanceof Api.MessageMediaDice) {
            return this.media;
        }
    }

    get actionEntities() {
        return this._actionEntities;
    }

    get viaBot() {
        return this._viaBot;
    }

    get viaInputBot() {
        return this._viaInputBot;
    }

    get replyToMsgId() {
        return this.replyTo?.replyToMsgId;
    }

    get toId() {
        if (this._client && !this.out && this.isPrivate) {
            return new Api.PeerUser({
                userId: _selfId(this._client)!,
            });
        }
        return this.peerId;
    }

    getEntitiesText(cls?: Function) {
        let ent = this.entities;
        if (!ent || ent.length == 0) return;
        if (cls) {
            ent = ent.filter((v: any) => v instanceof cls);
        }
        const texts = utils.getInnerText(this.message || "", ent);
        const zip = (rows: any[]) =>
            rows[0].map((_: any, c: string | number) =>
                rows.map((row) => row[c])
            );

        return zip([ent, texts]);
    }

    async forwardTo(entity: EntityLike) {
        if (this._client) {
            entity = await this._client.getInputEntity(entity);
            const params = {
                messages: [this.id],
                fromPeer: (await this.getInputChat())!,
            };
            return this._client.forwardMessages(entity, params);
        }
    }

    _documentByAttribute(kind: Function, condition?: Function) {
        const doc = this.document;
        if (doc) {
            for (const attr of doc.attributes) {
                if (attr instanceof kind) {
                    if (
                        condition == undefined ||
                        (typeof condition == "function" && condition(attr))
                    ) {
                        return doc;
                    }
                    return undefined;
                }
            }
        }
    }
}
