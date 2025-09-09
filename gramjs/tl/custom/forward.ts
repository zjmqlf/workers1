import { ChatGetter } from "./chatGetter";
import { SenderGetter } from "./senderGetter";
import { Api } from "../";
import type { TelegramClient } from "../../client";
import type { Entity } from "../../define";
import {
    _EntityType,
    _entityType,
    betterConsoleLog,
    returnBigInt,
} from "../../Helpers";
import { _getEntityPair, getPeerId } from "../../Utils";
import { inspect } from "node:util";

export class Forward extends SenderGetter {
    private originalFwd: Api.MessageFwdHeader;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        original: Api.MessageFwdHeader,
        entities: Map<string, Entity>
    ) {
        super();
        this.originalFwd = original;
        let senderId = undefined;
        let sender = undefined;
        let inputSender = undefined;
        let peer = undefined;
        let chat = undefined;
        let inputChat = undefined;
        if (original.fromId) {
            const ty = _entityType(original.fromId);
            if (ty === _EntityType.USER) {
                senderId = getPeerId(original.fromId);
                [sender, inputSender] = _getEntityPair(
                    senderId,
                    entities,
                    client._entityCache
                );
            } else if (ty === _EntityType.CHANNEL || ty === _EntityType.CHAT) {
                peer = original.fromId;
                [chat, inputChat] = _getEntityPair(
                    getPeerId(peer),
                    entities,
                    client._entityCache
                );
            }
        }
        ChatGetter.initChatClass(this, {
            chatPeer: peer,
            chat: chat,
            inputChat: inputChat,
        });
        SenderGetter.initSenderClass(this, {
            senderId: senderId ? returnBigInt(senderId) : undefined,
            sender: sender,
            inputSender: inputSender,
        });
        this._client = client;
    }
}

export interface Forward extends ChatGetter, SenderGetter {}
