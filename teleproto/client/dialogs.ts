import { Api } from "../tl";
import { RequestIter } from "../requestIter";
import { TelegramClient } from "./";
import * as utils from "../Utils";
import { Dialog } from "../tl/custom/dialog";
import { DateLike, EntityLike } from "../define";
import { TotalList } from "../Helpers";
import bigInt from "big-integer";
import { LogLevel } from "../extensions";

const _MAX_CHUNK_SIZE = 100;

function _dialogMessageKey(peer: Api.TypePeer, messageId: number): string {
    return (
        "" +
        [
            peer instanceof Api.PeerChannel ? peer.channelId : undefined,
            messageId,
        ]
    );
}

export interface DialogsIterInterface {
    offsetDate: number;
    offsetId: number;
    offsetPeer: Api.TypePeer;
    ignorePinned: boolean;
    ignoreMigrated: boolean;
    folder: number;
}

export class _DialogsIter extends RequestIter {
    private request?: Api.messages.GetDialogs;
    private seen?: Set<any>;
    private offsetDate?: number;
    private ignoreMigrated?: boolean;

    async _init({
        offsetDate,
        offsetId,
        offsetPeer,
        ignorePinned,
        ignoreMigrated,
        folder,
    }: DialogsIterInterface) {
        this.request = new Api.messages.GetDialogs({
            offsetDate,
            offsetId,
            offsetPeer,
            limit: 1,
            hash: bigInt.zero,
            excludePinned: ignorePinned,
            folderId: folder,
        });
        if (this.limit <= 0) {
            const dialogs = await this.client.invoke(this.request);
            if ("count" in dialogs) {
                this.total = dialogs.count;
            } else {
                this.total = dialogs.dialogs.length;
            }

            return true;
        }

        this.seen = new Set();
        this.offsetDate = offsetDate;
        this.ignoreMigrated = ignoreMigrated;
    }
    [Symbol.asyncIterator](): AsyncIterator<Dialog, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    async _loadNextChunk(): Promise<boolean | undefined> {
        if (!this.request || !this.seen || !this.buffer) {
            return;
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        const r = await this.client.invoke(this.request);
        if (r instanceof Api.messages.DialogsNotModified) {
            return;
        }
        if ("count" in r) {
            this.total = r.count;
        } else {
            this.total = r.dialogs.length;
        }
        const entities = new Map<string, Api.TypeUser | Api.TypeChat>();
        const messages = new Map<string, Api.Message>();

        for (const entity of [...r.users, ...r.chats]) {
            if (
                entity instanceof Api.UserEmpty ||
                entity instanceof Api.ChatEmpty
            ) {
                continue;
            }
            entities.set(utils.getPeerId(entity), entity);
        }
        for (const m of r.messages) {
            let message = m as unknown as Api.Message;
            try {
                if (message && "_finishInit" in message) {
                    message._finishInit(this.client, entities, undefined);
                }
            } catch (e) {
                console.log("msg", message);
                this.client._log.error(
                    "Got error while trying to finish init message with id " +
                        m.id
                );
                if (this.client._log.canSend(LogLevel.ERROR)) {
                    console.error(e);
                }
                if (this.client._errorHandler) {
                    await this.client._errorHandler(e as Error);
                }
            }
            messages.set(
                _dialogMessageKey(message.peerId!, message.id),
                message
            );
        }
        for (const d of r.dialogs) {
            if (d instanceof Api.DialogFolder) {
                continue;
            }
            const message = messages.get(
                _dialogMessageKey(d.peer, d.topMessage)
            );
            if (this.offsetDate != undefined) {
                const date = message?.date!;
                if (date == undefined || date > this.offsetDate) {
                    continue;
                }
            }
            const peerId = utils.getPeerId(d.peer);
            if (!this.seen.has(peerId)) {
                this.seen.add(peerId);
                if (!entities.has(peerId)) {
                    continue;
                }
                const cd = new Dialog(this.client, d, entities, message);
                if (
                    !this.ignoreMigrated ||
                    (cd.entity != undefined && "migratedTo" in cd.entity)
                ) {
                    this.buffer.push(cd);
                }
            }
        }
        if (
            r.dialogs.length < this.request.limit ||
            !(r instanceof Api.messages.DialogsSlice)
        ) {
            return true;
        }
        let lastMessage;
        for (let dialog of r.dialogs.reverse()) {
            lastMessage = messages.get(
                _dialogMessageKey(dialog.peer, dialog.topMessage)
            );
            if (lastMessage) {
                break;
            }
        }
        this.request.excludePinned = true;
        this.request.offsetId = lastMessage ? lastMessage.id : 0;
        this.request.offsetDate = lastMessage ? lastMessage.date! : 0;
        this.request.offsetPeer =
            this.buffer[this.buffer.length - 1]?.inputEntity;
    }
}

export interface IterDialogsParams {
    limit?: number;
    offsetDate?: DateLike;
    offsetId?: number;
    offsetPeer?: EntityLike;
    ignorePinned?: boolean;
    ignoreMigrated?: boolean;
    folder?: number;
    archived?: boolean;
}

export function iterDialogs(
    client: TelegramClient,
    {
        limit = undefined,
        offsetDate = undefined,
        offsetId = 0,
        offsetPeer = new Api.InputPeerEmpty(),
        ignorePinned = false,
        ignoreMigrated = false,
        folder = undefined,
        archived = undefined,
    }: IterDialogsParams
): _DialogsIter {
    if (archived != undefined) {
        folder = archived ? 1 : 0;
    }

    return new _DialogsIter(
        client,
        limit,
        {},
        {
            offsetDate,
            offsetId,
            offsetPeer,
            ignorePinned,
            ignoreMigrated,
            folder,
        }
    );
}
