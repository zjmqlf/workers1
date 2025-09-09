import { Api } from "../tl";
import type { Entity, EntityLike } from "../define";
import { getPeerId as peerUtils, parseID } from "../Utils";
import {
    _entityType,
    _EntityType,
    sleep,
    isArrayLike,
    returnBigInt,
} from "../Helpers";
import * as errors from "../errors";
import * as utils from "../Utils";
import type { TelegramClient } from "./";
import bigInt from "big-integer";
import { LogLevel } from "../extensions";
import { RequestState, MTProtoSender } from "../network";

export async function invoke<R extends Api.AnyRequest>(
    client: TelegramClient,
    request: R,
    dcId?: number,
    otherSender?: MTProtoSender
): Promise<R["__response"]> {
    if (request.classType !== "request") {
        throw new Error("You can only invoke MTProtoRequests");
    }
    let sender = client._sender;
    if (dcId) {
        sender = await client.getSender(dcId);
    }
    if (otherSender != undefined) {
        sender = otherSender;
    }
    if (sender == undefined) {
        throw new Error(
            "Cannot send requests while disconnected. You need to call .connect()"
        );
    }
    if (sender.userDisconnected) {
        throw new Error(
            "Cannot send requests while disconnected. Please reconnect."
        );
    }
    await client._connectedDeferred.promise;
    await request.resolve(client, utils);
    client._lastRequest = new Date().getTime();
    const state = new RequestState(request);
    let attempt: number = 0;
    for (attempt = 0; attempt < client._requestRetries; attempt++) {
        sender!.addStateToQueue(state);
        try {
            const result = await state.promise;
            state.finished.resolve();
            client.session.processEntities(result);
            client._entityCache.add(result);
            return result;
        } catch (e: any) {
            if (
                e instanceof errors.ServerError ||
                e.errorMessage === "RPC_CALL_FAIL" ||
                e.errorMessage === "RPC_MCGET_FAIL"
            ) {
                client._log.warn(
                    `Telegram is having internal issues ${e.constructor.name}`
                );
                await sleep(2000);
            } else if (
                e instanceof errors.FloodWaitError ||
                e instanceof errors.FloodTestPhoneWaitError
            ) {
                if (e.seconds <= client.floodSleepThreshold) {
                    client._log.info(
                        `Sleeping for ${e.seconds}s on flood wait (Caused by ${request.className})`
                    );
                    await sleep(e.seconds * 1000);
                } else {
                    state.finished.resolve();
                    throw e;
                }
            } else if (
                e instanceof errors.PhoneMigrateError ||
                e instanceof errors.NetworkMigrateError ||
                e instanceof errors.UserMigrateError
            ) {
                client._log.info(`Phone migrated to ${e.newDc}`);
                const shouldRaise =
                    e instanceof errors.PhoneMigrateError ||
                    e instanceof errors.NetworkMigrateError;
                if (shouldRaise) {
                    state.finished.resolve();
                    throw e;
                }
                await client._switchDC(e.newDc);
                sender =
                    dcId === undefined
                        ? client._sender
                        : await client.getSender(dcId);
            } else if (e instanceof errors.MsgWaitError) {
                await state.isReady();
                state.after = undefined;
            } else if (e.message === "CONNECTION_NOT_INITED") {
                await client.disconnect();
                await sleep(2000);
                await client.connect();
            } else {
                state.finished.resolve();
                throw e;
            }
        }
        state.resetPromise();
    }
    throw new Error(`Request was unsuccessful ${attempt} time(s)`);
}

export async function getMe<
    T extends boolean,
    R = T extends true ? Api.InputPeerUser : Api.User
>(client: TelegramClient, inputPeer: T): Promise<R> {
    if (inputPeer && client._selfInputPeer) {
        return client._selfInputPeer as unknown as R;
    }
    const me = (
        await client.invoke(
            new Api.users.GetUsers({ id: [new Api.InputUserSelf()] })
        )
    )[0] as Api.User;
    client._bot = me.bot;
    if (!client._selfInputPeer) {
        client._selfInputPeer = utils.getInputPeer(
            me,
            false
        ) as Api.InputPeerUser;
    }
    return inputPeer
        ? (client._selfInputPeer as unknown as R)
        : (me as unknown as R);
}

export async function getEntity(
    client: TelegramClient,
    entity: EntityLike | EntityLike[]
): Promise<Entity | Entity[]> {
    const single = !isArrayLike(entity);
    let entityArray: EntityLike[] = [];
    if (isArrayLike<EntityLike>(entity)) {
        entityArray = entity;
    } else {
        entityArray.push(entity);
    }
    const inputs = [];
    for (const x of entityArray) {
        if (typeof x === "string") {
            const valid = parseID(x);
            if (valid) {
                inputs.push(await client.getInputEntity(valid));
            } else {
                inputs.push(x);
            }
        } else {
            inputs.push(await client.getInputEntity(x));
        }
    }
    const lists = new Map<number, any[]>([
        [_EntityType.USER, []],
        [_EntityType.CHAT, []],
        [_EntityType.CHANNEL, []],
    ]);
    for (const x of inputs) {
        try {
            lists.get(_entityType(x))!.push(x);
        } catch (e) {}
    }
    let users = lists.get(_EntityType.USER)!;
    let chats = lists.get(_EntityType.CHAT)!;
    let channels = lists.get(_EntityType.CHANNEL)!;
    if (users.length) {
        users = await client.invoke(
            new Api.users.GetUsers({
                id: users,
            })
        );
    }
    if (chats.length) {
        const chatIds = chats.map((x) => x.chatId);
        chats = (
            await client.invoke(new Api.messages.GetChats({ id: chatIds }))
        ).chats;
    }
    if (channels.length) {
        channels = (
            await client.invoke(new Api.channels.GetChannels({ id: channels }))
        ).chats;
    }
    const idEntity = new Map<string, any>();
    for (const user of users) {
        idEntity.set(peerUtils(user), user);
    }
    for (const channel of channels) {
        idEntity.set(peerUtils(channel), channel);
    }
    for (const chat of chats) {
        idEntity.set(peerUtils(chat), chat);
    }
    const result = [];
    for (const x of inputs) {
        if (typeof x === "string") {
            result.push(await _getEntityFromString(client, x));
        } else if (!(x instanceof Api.InputPeerSelf)) {
            result.push(idEntity.get(peerUtils(x)));
        } else {
            for (const [key, u] of idEntity.entries()) {
                if (u instanceof Api.User && u.self) {
                    result.push(u);
                    break;
                }
            }
        }
    }
    return single ? result[0] : result;
}

export async function getInputEntity(
    client: TelegramClient,
    peer: EntityLike
): Promise<Api.TypeInputPeer> {
    try {
        return utils.getInputPeer(peer);
    } catch (e) {}
    try {
        if (typeof peer == "string") {
            const valid = parseID(peer);
            if (valid) {
                const res = client._entityCache.get(peer);
                if (res) {
                    return res;
                }
            }
        }
        if (
            typeof peer === "number" ||
            typeof peer === "bigint" ||
            bigInt.isInstance(peer)
        ) {
            const res = client._entityCache.get(peer.toString());
            if (res) {
                return res;
            }
        }
        if (
            typeof peer == "object" &&
            !bigInt.isInstance(peer) &&
            peer.SUBCLASS_OF_ID === 0x2d45687
        ) {
            const res = client._entityCache.get(utils.getPeerId(peer));
            if (res) {
                return res;
            }
        }
    } catch (e) {}
    if (typeof peer == "string") {
        if (["me", "this", "self"].includes(peer)) {
            return new Api.InputPeerSelf();
        }
    }
    try {
        if (peer != undefined) {
            return client.session.getInputEntity(peer);
        }
    } catch (e) {}
    if (typeof peer === "string") {
        return utils.getInputPeer(await _getEntityFromString(client, peer));
    }
    if (typeof peer === "number") {
        peer = returnBigInt(peer);
    }
    peer = utils.getPeer(peer);
    if (peer instanceof Api.PeerUser) {
        const users = await client.invoke(
            new Api.users.GetUsers({
                id: [
                    new Api.InputUser({
                        userId: peer.userId,
                        accessHash: bigInt.zero,
                    }),
                ],
            })
        );
        if (users.length && !(users[0] instanceof Api.UserEmpty)) {
            return utils.getInputPeer(users[0]);
        }
    } else if (peer instanceof Api.PeerChat) {
        return new Api.InputPeerChat({
            chatId: peer.chatId,
        });
    } else if (peer instanceof Api.PeerChannel) {
        try {
            const channels = await client.invoke(
                new Api.channels.GetChannels({
                    id: [
                        new Api.InputChannel({
                            channelId: peer.channelId,
                            accessHash: bigInt.zero,
                        }),
                    ],
                })
            );

            return utils.getInputPeer(channels.chats[0]);
        } catch (e) {
            if (client._errorHandler) {
                await client._errorHandler(e as Error);
            }
            if (client._log.canSend(LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }
    throw new Error(
        `Could not find the input entity for ${JSON.stringify(peer)}.
         Please read https://` +
            "docs.telethon.dev/en/stable/concepts/entities.html to" +
            " find out more details."
    );
}

export async function _getEntityFromString(
    client: TelegramClient,
    string: string
) {
    const phone = utils.parsePhone(string);
    if (phone) {
        try {
            const result = await client.invoke(
                new Api.contacts.GetContacts({
                    hash: bigInt.zero,
                })
            );
            if (!(result instanceof Api.contacts.ContactsNotModified)) {
                for (const user of result.users) {
                    if (user instanceof Api.User && user.phone === phone) {
                        return user;
                    }
                }
            }
        } catch (e: any) {
            if (e.errorMessage === "BOT_METHOD_INVALID") {
                throw new Error(
                    "Cannot get entity by phone number as a " +
                        "bot (try using integer IDs, not strings)"
                );
            }
            throw e;
        }
    }
    const id = utils.parseID(string);
    if (id != undefined) {
        return getInputEntity(client, id);
    } else if (["me", "this"].includes(string.toLowerCase())) {
        return client.getMe();
    } else {
        const { username, isInvite } = utils.parseUsername(string);
        if (isInvite) {
            const invite = await client.invoke(
                new Api.messages.CheckChatInvite({
                    hash: username,
                })
            );
            if (invite instanceof Api.ChatInvite) {
                throw new Error(
                    "Cannot get entity from a channel (or group) " +
                        "that you are not part of. Join the group and retry"
                );
            } else if (invite instanceof Api.ChatInviteAlready) {
                return invite.chat;
            }
        } else if (username) {
            try {
                const result = await client.invoke(
                    new Api.contacts.ResolveUsername({ username: username })
                );
                const pid = utils.getPeerId(result.peer, false);
                if (result.peer instanceof Api.PeerUser) {
                    for (const x of result.users) {
                        if (returnBigInt(x.id).equals(returnBigInt(pid))) {
                            return x;
                        }
                    }
                } else {
                    for (const x of result.chats) {
                        if (returnBigInt(x.id).equals(returnBigInt(pid))) {
                            return x;
                        }
                    }
                }
            } catch (e: any) {
                if (e.errorMessage === "USERNAME_NOT_OCCUPIED") {
                    throw new Error(`No user has "${username}" as username`);
                }
                throw e;
            }
        }
    }
    throw new Error(`Cannot find any entity corresponding to "${string}"`);
}

export async function getPeerId(
    client: TelegramClient,
    peer: EntityLike,
    addMark = true
) {
    if (typeof peer == "string") {
        const valid = parseID(peer);
        if (valid) {
            return utils.getPeerId(peer, addMark);
        } else {
            peer = await client.getInputEntity(peer);
        }
    }
    if (
        typeof peer == "number" ||
        typeof peer == "bigint" ||
        bigInt.isInstance(peer)
    ) {
        return utils.getPeerId(peer, addMark);
    }
    if (peer.SUBCLASS_OF_ID == 0x2d45687 || peer.SUBCLASS_OF_ID == 0xc91c90b6) {
        peer = await client.getInputEntity(peer);
    }
    if (peer instanceof Api.InputPeerSelf) {
        peer = await client.getMe(true);
    }
    return utils.getPeerId(peer, addMark);
}

export async function _getPeer(client: TelegramClient, peer: EntityLike) {
    if (!peer) {
        return undefined;
    }
    const [i, cls] = utils.resolveId(
        returnBigInt(await client.getPeerId(peer))
    );
    return new cls({
        userId: i,
        channelId: i,
        chatId: i,
    });
}

export async function _getInputDialog(client: TelegramClient, dialog: any) {
    try {
        if (dialog.SUBCLASS_OF_ID == 0xa21c9795) {
            dialog.peer = await client.getInputEntity(dialog.peer);
            return dialog;
        } else if (dialog.SUBCLASS_OF_ID == 0xc91c90b6) {
            return new Api.InputDialogPeer({
                peer: dialog,
            });
        }
    } catch (e) {}
    return new Api.InputDialogPeer({
        peer: dialog,
    });
}

export async function _getInputNotify(client: TelegramClient, notify: any) {
    try {
        if (notify.SUBCLASS_OF_ID == 0x58981615) {
            if (notify instanceof Api.InputNotifyPeer) {
                notify.peer = await client.getInputEntity(notify.peer);
            }
            return notify;
        }
    } catch (e) {}
    return new Api.InputNotifyPeer({
        peer: await client.getInputEntity(notify),
    });
}

export function _selfId(client: TelegramClient) {
    return client._selfInputPeer ? client._selfInputPeer.userId : undefined;
}
