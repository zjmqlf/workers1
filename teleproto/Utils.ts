import bigInt from "big-integer";
import mime from "mime";
import type { ParseInterface } from "./client/messageParse";
import { CustomFile } from "./client/uploads";
import type { Entity, EntityLike, MessageIDLike } from "./define";
import { EntityCache } from "./entityCache";
import { HTMLParser } from "./extensions/html";
import { MarkdownParser } from "./extensions/markdown";
import { MarkdownV2Parser } from "./extensions/markdownv2";
import { returnBigInt } from "./Helpers";
import { Api } from "./tl";
import { Buffer } from "node:buffer";

export function getFileInfo(
    fileLocation:
        | Api.Message
        | Api.MessageMediaDocument
        | Api.MessageMediaPhoto
        | Api.TypeInputFileLocation
): {
    dcId?: number;
    location: Api.TypeInputFileLocation;
    size?: bigInt.BigInteger;
} {
    if (!fileLocation || !fileLocation.SUBCLASS_OF_ID) {
        _raiseCastFail(fileLocation, "InputFileLocation");
    }
    if (fileLocation.SUBCLASS_OF_ID == 354669666) {
        return {
            dcId: undefined,
            location: fileLocation,
            size: undefined,
        };
    }
    let location;
    if (fileLocation instanceof Api.Message) {
        location = fileLocation.media;
    }
    if (fileLocation instanceof Api.MessageMediaDocument) {
        location = fileLocation.document;
    } else if (fileLocation instanceof Api.MessageMediaPhoto) {
        location = fileLocation.photo;
    }
    if (location instanceof Api.Document) {
        return {
            dcId: location.dcId,
            location: new Api.InputDocumentFileLocation({
                id: location.id,
                accessHash: location.accessHash,
                fileReference: location.fileReference,
                thumbSize: "",
            }),
            size: location.size,
        };
    } else if (location instanceof Api.Photo) {
        return {
            dcId: location.dcId,
            location: new Api.InputPhotoFileLocation({
                id: location.id,
                accessHash: location.accessHash,
                fileReference: location.fileReference,
                thumbSize: location.sizes[location.sizes.length - 1].type,
            }),
            size: bigInt(
                _photoSizeByteCount(
                    location.sizes[location.sizes.length - 1]
                ) || 0
            ),
        };
    }
    _raiseCastFail(fileLocation, "InputFileLocation");
}

export function getPhotoInfo(
    fileLocation:
        | Api.Message
        | Api.MessageMediaPhoto
        | Api.TypeInputFileLocation
): {
    dcId?: number;
    location: Api.TypeInputFileLocation;
    size?: bigInt.BigInteger;
} {
    if (!fileLocation || !fileLocation.SUBCLASS_OF_ID) {
        _raiseCastFail(fileLocation, "InputFileLocation");
    }
    if (fileLocation.SUBCLASS_OF_ID == 354669666) {
        return {
            dcId: undefined,
            location: fileLocation,
            size: undefined,
        };
    }
    let location;
    if (fileLocation instanceof Api.Message) {
        location = fileLocation.media;
    }
    if (fileLocation instanceof Api.MessageMediaPhoto) {
        location = fileLocation.photo;
    }
    if (location instanceof Api.Photo) {
        const array = [];
        for (const size of location.sizes) {
          array.push({
              dcId: location.dcId,
              type: size.type,
              size: _photoSizeByteCount(size) || 0,
              location: new Api.InputPhotoFileLocation({
                  id: location.id,
                  accessHash: location.accessHash,
                  fileReference: location.fileReference,
                  thumbSize: size.type,
              }),
          });
        }
        return array;
    }
    _raiseCastFail(fileLocation, "InputFileLocation");
}

export function* chunks<T>(arr: T[], size = 100): Generator<T[]> {
    for (let i = 0; i < arr.length; i += size) {
        yield arr.slice(i, i + size);
    }
}

import TypeInputFile = Api.TypeInputFile;

const USERNAME_RE = new RegExp(
    "@|(?:https?:\\/\\/)?(?:www\\.)?" +
        "(?:telegram\\.(?:me|dog)|t\\.me)\\/(@|joinchat\\/)?",
    "i"
);

const JPEG_HEADER = Buffer.from(
    "ffd8ffe000104a46494600010100000100010000ffdb004300281c1e231e19282321232d2b28303c64413c37373c7b585d4964918099968f808c8aa0b4e6c3a0aadaad8a8cc8ffcbdaeef5ffffff9bc1fffffffaffe6fdfff8ffdb0043012b2d2d3c353c76414176f8a58ca5f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8ffc00011080000000003012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00",
    "hex"
);
const JPEG_FOOTER = Buffer.from("ffd9", "hex");
const TG_JOIN_RE = new RegExp("tg:\\/\\/(join)\\?invite=", "i");
const VALID_USERNAME_RE = new RegExp(
    "^([a-z]((?!__)[\\w\\d]){2,30}[a-z\\d]|gif|vid|" +
        "pic|bing|wiki|imdb|bold|vote|like|coub)$",
    "i"
);

function _raiseCastFail(entity: any, target: string): never {
    let toWrite = entity;
    if (typeof entity === "object" && "className" in entity) {
        toWrite = entity.className;
    }
    throw new Error(`Cannot cast ${toWrite} to any kind of ${target}`);
}

export function getInputPeer(
    entity: any,
    allowSelf = true,
    checkHash = true
): Api.TypeInputPeer {
    if (entity.SUBCLASS_OF_ID === undefined) {
        if (allowSelf && "inputEntity" in entity) {
            return entity.inputEntity;
        } else if ("entity" in entity) {
            return getInputPeer(entity.entity);
        } else {
            _raiseCastFail(entity, "InputPeer");
        }
    }
    if (entity.SUBCLASS_OF_ID === 0xc91c90b6) {
        return entity;
    }
    if (entity instanceof Api.User) {
        if (entity.self && allowSelf) {
            return new Api.InputPeerSelf();
        } else if (
            (entity.accessHash !== undefined && !entity.min) ||
            !checkHash
        ) {
            return new Api.InputPeerUser({
                userId: entity.id,
                accessHash: entity.accessHash || bigInt(0),
            });
        } else {
            throw new Error("User without accessHash or min cannot be input");
        }
    }
    if (
        entity instanceof Api.Chat ||
        entity instanceof Api.ChatEmpty ||
        entity instanceof Api.ChatForbidden
    ) {
        return new Api.InputPeerChat({ chatId: entity.id });
    }
    if (entity instanceof Api.Channel) {
        if ((entity.accessHash !== undefined && !entity.min) || !checkHash) {
            return new Api.InputPeerChannel({
                channelId: entity.id,
                accessHash: entity.accessHash || bigInt(0),
            });
        } else {
            throw new TypeError(
                "Channel without accessHash or min info cannot be input"
            );
        }
    }
    if (entity instanceof Api.ChannelForbidden) {
        return new Api.InputPeerChannel({
            channelId: entity.id,
            accessHash: entity.accessHash,
        });
    }
    if (entity instanceof Api.InputUser) {
        return new Api.InputPeerUser({
            userId: entity.userId,
            accessHash: entity.accessHash,
        });
    }
    if (entity instanceof Api.InputChannel) {
        return new Api.InputPeerChannel({
            channelId: entity.channelId,
            accessHash: entity.accessHash,
        });
    }
    if (entity instanceof Api.UserEmpty) {
        return new Api.InputPeerEmpty();
    }
    if (entity instanceof Api.UserFull) {
        return getInputPeer(entity.id);
    }
    if (entity instanceof Api.ChatFull) {
        return new Api.InputPeerChat({ chatId: entity.id });
    }
    if (entity instanceof Api.PeerChat) {
        return new Api.InputPeerChat({
            chatId: entity.chatId,
        });
    }

    _raiseCastFail(entity, "InputPeer");
}

export function _photoSizeByteCount(size: Api.TypePhotoSize) {
    if (size instanceof Api.PhotoSize) {
        return size.size;
    } else if (size instanceof Api.PhotoStrippedSize) {
        if (size.bytes.length < 3 || size.bytes[0] != 1) {
            return size.bytes.length;
        }
        return size.bytes.length + 622;
    } else if (size instanceof Api.PhotoCachedSize) {
        return size.bytes.length;
    } else if (size instanceof Api.PhotoSizeEmpty) {
        return 0;
    } else if (size instanceof Api.PhotoSizeProgressive) {
        return size.sizes[size.sizes.length - 1];
    } else {
        return undefined;
    }
}

export function _getEntityPair(
    entityId: string,
    entities: Map<string, Entity>,
    cache: EntityCache,
    getInputPeerFunction: any = getInputPeer
): [Entity?, Api.TypeInputPeer?] {
    const entity = entities.get(entityId);
    let inputEntity;
    try {
        inputEntity = cache.get(entityId);
    } catch (e: any) {
        try {
            inputEntity = getInputPeerFunction(inputEntity);
        } catch (e) {}
    }
    return [entity, inputEntity];
}

export function getInnerText(text: string, entities: Api.TypeMessageEntity[]) {
    const result: string[] = [];
    entities.forEach(function (value, key) {
        const start = value.offset;
        const end = value.offset + value.length;
        result.push(text.slice(start, end));
    });
    return result;
}

export function getInputChannel(entity: EntityLike) {
    if (
        typeof entity === "string" ||
        typeof entity == "number" ||
        typeof entity == "bigint" ||
        bigInt.isInstance(entity)
    ) {
        _raiseCastFail(entity, "InputChannel");
    }
    if (entity.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(entity, "InputChannel");
    }
    if (entity.SUBCLASS_OF_ID === 0x40f202fd) {
        return entity;
    }
    if (
        entity instanceof Api.Channel ||
        entity instanceof Api.ChannelForbidden
    ) {
        return new Api.InputChannel({
            channelId: entity.id,
            accessHash: entity.accessHash || bigInt.zero,
        });
    }
    if (entity instanceof Api.InputPeerChannel) {
        return new Api.InputChannel({
            channelId: entity.channelId,
            accessHash: entity.accessHash,
        });
    }
    _raiseCastFail(entity, "InputChannel");
}

export function getInputUser(entity: EntityLike): Api.TypeInputUser {
    if (
        typeof entity === "string" ||
        typeof entity == "number" ||
        typeof entity == "bigint" ||
        bigInt.isInstance(entity)
    ) {
        _raiseCastFail(entity, "InputUser");
    }
    if (entity.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(entity, "InputUser");
    }
    if (entity.SUBCLASS_OF_ID === 0xe669bf46) {
        return entity;
    }
    if (entity instanceof Api.User) {
        if (entity.self) {
            return new Api.InputUserSelf();
        } else {
            return new Api.InputUser({
                userId: entity.id,
                accessHash: entity.accessHash || bigInt.zero,
            });
        }
    }
    if (entity instanceof Api.InputPeerSelf) {
        return new Api.InputUserSelf();
    }
    if (
        entity instanceof Api.UserEmpty ||
        entity instanceof Api.InputPeerEmpty
    ) {
        return new Api.InputUserEmpty();
    }
    if (entity instanceof Api.UserFull) {
        return getInputUser(entity);
    }
    if (entity instanceof Api.InputPeerUser) {
        return new Api.InputUser({
            userId: entity.userId,
            accessHash: entity.accessHash,
        });
    }
    if (entity instanceof Api.InputPeerUserFromMessage) {
        return new Api.InputUserFromMessage({
            userId: entity.userId,
            peer: entity.peer,
            msgId: entity.msgId,
        });
    }
    _raiseCastFail(entity, "InputUser");
}

export function getInputMessage(message: any): Api.InputMessageID {
    if (typeof message === "number") {
        return new Api.InputMessageID({ id: message });
    }
    if (message === undefined || message.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(message, "InputMessage");
    }
    if (message.SUBCLASS_OF_ID === 0x54b6bcc5) {
        return message;
    } else if (message.SUBCLASS_OF_ID === 0x790009e3) {
        return new Api.InputMessageID({ id: message.id });
    }
    _raiseCastFail(message, "InputMessage");
}

export function getInputChatPhoto(photo: any): Api.TypeInputChatPhoto {
    if (photo === undefined || photo.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(photo, "InputChatPhoto");
    }
    if (photo.SUBCLASS_OF_ID === 0xd4eb2d74) {
        return photo;
    } else if (photo.SUBCLASS_OF_ID === 0xe7655f1f) {
        return new Api.InputChatUploadedPhoto({
            file: photo,
        });
    }
    photo = getInputPhoto(photo);
    if (photo instanceof Api.InputPhoto) {
        return new Api.InputChatPhoto({
            id: photo,
        });
    } else if (photo instanceof Api.InputPhotoEmpty) {
        return new Api.InputChatPhotoEmpty();
    }
    _raiseCastFail(photo, "InputChatPhoto");
}

export function strippedPhotoToJpg(stripped: Buffer) {
    if (stripped.length < 3 || stripped[0] !== 1) {
        return stripped;
    }
    const header = Buffer.from(JPEG_HEADER);
    header[164] = stripped[1];
    header[166] = stripped[2];
    return Buffer.concat([header, stripped.slice(3), JPEG_FOOTER]);
}

export function getInputPhoto(photo: any): Api.TypeInputPhoto {
    if (photo.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(photo, "InputPhoto");
    }
    if (photo.SUBCLASS_OF_ID === 2221106144) {
        return photo;
    }
    if (photo instanceof Api.Message) {
        photo = photo.media;
    }
    if (
        photo instanceof Api.photos.Photo ||
        photo instanceof Api.MessageMediaPhoto
    ) {
        photo = photo.photo;
    }
    if (photo instanceof Api.Photo) {
        return new Api.InputPhoto({
            id: photo.id,
            accessHash: photo.accessHash,
            fileReference: photo.fileReference,
        });
    }
    if (photo instanceof Api.PhotoEmpty) {
        return new Api.InputPhotoEmpty();
    }
    if (photo instanceof Api.messages.ChatFull) {
        photo = photo.fullChat;
    }
    if (photo instanceof Api.ChannelFull) {
        return getInputPhoto(photo.chatPhoto);
    } else {
        if (photo instanceof Api.UserFull) {
            return getInputPhoto(photo.profilePhoto);
        } else {
            if (
                photo instanceof Api.Channel ||
                photo instanceof Api.Chat ||
                photo instanceof Api.User
            ) {
                return getInputPhoto(photo.photo);
            }
        }
    }
    if (
        photo instanceof Api.UserEmpty ||
        photo instanceof Api.ChatEmpty ||
        photo instanceof Api.ChatForbidden ||
        photo instanceof Api.ChannelForbidden
    ) {
        return new Api.InputPhotoEmpty();
    }
    _raiseCastFail(photo, "InputPhoto");
}

export function getInputDocument(
    document: any
): Api.InputDocument | Api.InputDocumentEmpty {
    if (document.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(document, "InputDocument");
    }
    if (document.SUBCLASS_OF_ID === 0xf33fdb68) {
        return document;
    }
    if (document instanceof Api.Document) {
        return new Api.InputDocument({
            id: document.id,
            accessHash: document.accessHash,
            fileReference: document.fileReference,
        });
    }
    if (document instanceof Api.DocumentEmpty) {
        return new Api.InputDocumentEmpty();
    }
    if (document instanceof Api.MessageMediaDocument) {
        return getInputDocument(document.document);
    }
    if (document instanceof Api.Message) {
        return getInputDocument(document.media);
    }
    _raiseCastFail(document, "InputDocument");
}

interface GetAttributesParams {
    attributes?: any;
    mimeType?: string;
    forceDocument?: boolean;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
    thumb?: any;
}

export function isAudio(file: any): boolean {
    const ext = _getExtension(file);
    if (!ext) {
        const metadata = _getMetadata(file);
        return (metadata.get("mimeType") || "").startsWith("audio/");
    } else {
        file = "a" + ext;
        return (mime.getType(file) || "").startsWith("audio/");
    }
}

export function isImage(file: any): boolean {
    const ext = _getExtension(file).toLowerCase();
    return (
        ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg")
    );
}

export function getExtension(media: any): string {
    try {
        getInputPhoto(media);
        return ".jpg";
    } catch (e) {}
    if (
        media instanceof Api.UserProfilePhoto ||
        media instanceof Api.ChatPhoto
    ) {
        return ".jpg";
    }
    if (media instanceof Api.MessageMediaDocument) {
        media = media.document;
    }
    if (
        media instanceof Api.Document ||
        media instanceof Api.WebDocument ||
        media instanceof Api.WebDocumentNoProxy
    ) {
        if (media.mimeType === "application/octet-stream") {
            return "";
        } else {
            return mime.getExtension(media.mimeType) || "";
        }
    }
    return "";
}

function _getExtension(file: any): string {
    if (typeof file === "string") {
        return "." + file.split(".").pop();
    } else if ("name" in file) {
        return _getExtension(file.name);
    } else {
        return getExtension(file);
    }
}

function _getMetadata(file: any): Map<string, string> {
    return new Map<string, string>();
}

function isVideo(file: any): boolean {
    const ext = _getExtension(file);
    if (!ext) {
        const metadata = _getMetadata(file);
        if (metadata.has("mimeType")) {
            return metadata.get("mimeType")?.startsWith("video/") || false;
        } else {
            return false;
        }
    } else {
        file = "a" + ext;
        return (mime.getType(file) || "").startsWith("video/");
    }
}

export function getAttributes(
    file: File | CustomFile | TypeInputFile | string,
    {
        attributes = null,
        mimeType = undefined,
        forceDocument = false,
        voiceNote = false,
        videoNote = false,
        supportsStreaming = false,
        thumb = null,
    }: GetAttributesParams
) {
    const name: string =
        typeof file == "string"
            ? file
            : "name" in file
            ? file.name || "unnamed"
            : "unnamed";
    if (mimeType === undefined) {
        mimeType = mime.getType(name) || "application/octet-stream";
    }
    const attrObj = new Map();
    attrObj.set(
        Api.DocumentAttributeFilename,
        new Api.DocumentAttributeFilename({
            fileName: name.split(/[\\/]/).pop() || "",
        })
    );
    if (isAudio(file)) {
        const m = _getMetadata(file);
        attrObj.set(
            Api.DocumentAttributeAudio,
            new Api.DocumentAttributeAudio({
                voice: voiceNote,
                title: m.has("title") ? m.get("title") : undefined,
                performer: m.has("author") ? m.get("author") : undefined,
                duration: Number.parseInt(m.get("duration") ?? "0"),
            })
        );
    }
    if (!forceDocument && isVideo(file)) {
        let doc;
        if (thumb) {
            const t_m = _getMetadata(thumb);
            const width = Number.parseInt(t_m?.get("width") || "1");
            const height = Number.parseInt(t_m?.get("height") || "1");
            doc = new Api.DocumentAttributeVideo({
                duration: 0,
                h: height,
                w: width,
                roundMessage: videoNote,
                supportsStreaming: supportsStreaming,
            });
        } else {
            const m = _getMetadata(file);
            doc = new Api.DocumentAttributeVideo({
                roundMessage: videoNote,
                w: Number.parseInt(m.get("width") ?? "1"),
                h: Number.parseInt(m.get("height") ?? "1"),
                duration: Number.parseInt(m.get("duration") ?? "0"),
                supportsStreaming: supportsStreaming,
            });
        }
        attrObj.set(Api.DocumentAttributeVideo, doc);
    }
    if (videoNote) {
        if (attrObj.has(Api.DocumentAttributeAudio)) {
            attrObj.get(Api.DocumentAttributeAudio).voice = true;
        } else {
            attrObj.set(
                Api.DocumentAttributeAudio,
                new Api.DocumentAttributeAudio({
                    duration: 0,
                    voice: true,
                })
            );
        }
    }
    if (attributes) {
        for (const a of attributes) {
            attrObj.set(a.constructor, a);
        }
    }

    return {
        attrs: Array.from(attrObj.values()) as Api.TypeDocumentAttribute[],
        mimeType: mimeType,
    };
}

export function getInputGeo(geo: any): Api.TypeInputGeoPoint {
    if (geo === undefined || geo.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(geo, "InputGeoPoint");
    }
    if (geo.SUBCLASS_OF_ID === 0x430d225) {
        return geo;
    }
    if (geo instanceof Api.GeoPoint) {
        return new Api.InputGeoPoint({ lat: geo.lat, long: geo.long });
    }
    if (geo instanceof Api.GeoPointEmpty) {
        return new Api.InputGeoPointEmpty();
    }
    if (geo instanceof Api.MessageMediaGeo) {
        return getInputGeo(geo.geo);
    }
    if (geo instanceof Api.Message) {
        return getInputGeo(geo.media);
    }
    _raiseCastFail(geo, "InputGeoPoint");
}

export interface GetInputMediaInterface {
    isPhoto?: boolean;
    attributes?: Api.TypeDocumentAttribute[];
    forceDocument?: boolean;
    voiceNote?: boolean;
    videoNote?: boolean;
    supportsStreaming?: boolean;
}

export function getInputMedia(
    media: any,
    {
        isPhoto = false,
        attributes = undefined,
        forceDocument = false,
        voiceNote = false,
        videoNote = false,
        supportsStreaming = false,
    }: GetInputMediaInterface = {}
): Api.TypeInputMedia {
    if (media.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(media, "InputMedia");
    }
    if (media.SUBCLASS_OF_ID === 0xfaf846f4) {
        return media;
    } else {
        if (media.SUBCLASS_OF_ID === 2221106144) {
            return new Api.InputMediaPhoto({ id: media });
        } else {
            if (media.SUBCLASS_OF_ID === 4081048424) {
                return new Api.InputMediaDocument({ id: media });
            }
        }
    }
    if (media instanceof Api.MessageMediaPhoto) {
        return new Api.InputMediaPhoto({
            id: getInputPhoto(media.photo),
            ttlSeconds: media.ttlSeconds,
        });
    }
    if (
        media instanceof Api.Photo ||
        media instanceof Api.photos.Photo ||
        media instanceof Api.PhotoEmpty
    ) {
        return new Api.InputMediaPhoto({ id: getInputPhoto(media) });
    }
    if (media instanceof Api.MessageMediaDocument) {
        return new Api.InputMediaDocument({
            id: getInputDocument(media.document),
            ttlSeconds: media.ttlSeconds,
        });
    }
    if (media instanceof Api.Document || media instanceof Api.DocumentEmpty) {
        return new Api.InputMediaDocument({ id: getInputDocument(media) });
    }
    if (media instanceof Api.InputFile || media instanceof Api.InputFileBig) {
        if (isPhoto) {
            return new Api.InputMediaUploadedPhoto({ file: media });
        } else {
            const { attrs, mimeType } = getAttributes(media, {
                attributes: attributes,
                forceDocument: forceDocument,
                voiceNote: voiceNote,
                videoNote: videoNote,
                supportsStreaming: supportsStreaming,
            });
            return new Api.InputMediaUploadedDocument({
                file: media,
                mimeType: mimeType,
                attributes: attrs,
                forceFile: forceDocument,
            });
        }
    }
    if (media instanceof Api.MessageMediaGame) {
        return new Api.InputMediaGame({
            id: new Api.InputGameID({
                id: media.game.id,
                accessHash: media.game.accessHash,
            }),
        });
    }
    if (media instanceof Api.MessageMediaContact) {
        return new Api.InputMediaContact({
            phoneNumber: media.phoneNumber,
            firstName: media.firstName,
            lastName: media.lastName,
            vcard: "",
        });
    }
    if (media instanceof Api.MessageMediaGeo) {
        return new Api.InputMediaGeoPoint({ geoPoint: getInputGeo(media.geo) });
    }
    if (media instanceof Api.MessageMediaVenue) {
        return new Api.InputMediaVenue({
            geoPoint: getInputGeo(media.geo),
            title: media.title,
            address: media.address,
            provider: media.provider,
            venueId: media.venueId,
            venueType: "",
        });
    }
    if (media instanceof Api.MessageMediaDice) {
        return new Api.InputMediaDice({
            emoticon: media.emoticon,
        });
    }
    if (
        media instanceof Api.MessageMediaEmpty ||
        media instanceof Api.MessageMediaUnsupported ||
        media instanceof Api.ChatPhotoEmpty ||
        media instanceof Api.UserProfilePhotoEmpty ||
        media instanceof Api.ChatPhoto ||
        media instanceof Api.UserProfilePhoto
    ) {
        return new Api.InputMediaEmpty();
    }
    if (media instanceof Api.Message) {
        return getInputMedia(media.media, { isPhoto: isPhoto });
    }
    if (media instanceof Api.MessageMediaPoll) {
        let correctAnswers;
        if (media.poll.quiz) {
            if (!media.results.results) {
                throw new Error(
                    "Cannot cast unanswered quiz to any kind of InputMedia."
                );
            }
            correctAnswers = [];
            for (const r of media.results.results) {
                if (r.correct) {
                    correctAnswers.push(r.option);
                }
            }
        } else {
            correctAnswers = undefined;
        }
        return new Api.InputMediaPoll({
            poll: media.poll,
            correctAnswers: correctAnswers,
            solution: media.results.solution,
            solutionEntities: media.results.solutionEntities,
        });
    }
    if (media instanceof Api.Poll) {
        return new Api.InputMediaPoll({
            poll: media,
        });
    }
    _raiseCastFail(media, "InputMedia");
}

export function getAppropriatedPartSize(fileSize: bigInt.BigInteger) {
    if (fileSize.lesser(104857600)) {
        return 128;
    }
    if (fileSize.lesser(786432000)) {
        return 256;
    }
    return 512;
}

export function getPeer(peer: EntityLike | any) {
    if (!peer) {
        _raiseCastFail(peer, "undefined");
    }
    if (typeof peer === "string") {
        _raiseCastFail(peer, "peer");
    }
    if (typeof peer == "number" || typeof peer == "bigint") {
        peer = returnBigInt(peer);
    }
    try {
        if (bigInt.isInstance(peer)) {
            const res = resolveId(peer);
            if (res[1] === Api.PeerChannel) {
                return new Api.PeerChannel({ channelId: res[0] });
            } else if (res[1] === Api.PeerChat) {
                return new Api.PeerChat({ chatId: res[0] });
            } else {
                return new Api.PeerUser({ userId: res[0] });
            }
        }
        if (peer.SUBCLASS_OF_ID === undefined) {
            throw new Error();
        }
        if (peer.SUBCLASS_OF_ID === 0x2d45687) {
            return peer;
        } else if (
            peer instanceof Api.contacts.ResolvedPeer ||
            peer instanceof Api.InputNotifyPeer ||
            peer instanceof Api.TopPeer ||
            peer instanceof Api.Dialog ||
            peer instanceof Api.DialogPeer
        ) {
            return peer.peer;
        } else if (peer instanceof Api.ChannelFull) {
            return new Api.PeerChannel({ channelId: peer.id });
        }
        if (
            peer.SUBCLASS_OF_ID === 0x7d7c6f86 ||
            peer.SUBCLASS_OF_ID === 0xd9c7fc18
        ) {
            if ("userId" in peer) {
                return new Api.PeerUser({ userId: peer.userId });
            }
        }
        peer = getInputPeer(peer, false, false);
        if (peer instanceof Api.InputPeerUser) {
            return new Api.PeerUser({ userId: peer.userId });
        } else if (peer instanceof Api.InputPeerChat) {
            return new Api.PeerChat({ chatId: peer.chatId });
        } else if (peer instanceof Api.InputPeerChannel) {
            return new Api.PeerChannel({ channelId: peer.channelId });
        }
    } catch (e) {}
    _raiseCastFail(peer, "peer");
}

export function sanitizeParseMode(
    mode: string | ParseInterface
): ParseInterface {
    if (mode === "md" || mode === "markdown") {
        return MarkdownParser;
    }
    if (mode === "md2" || mode === "markdownv2") {
        return MarkdownV2Parser;
    }
    if (mode == "html") {
        return HTMLParser;
    }
    if (typeof mode == "object") {
        if ("parse" in mode && "unparse" in mode) {
            return mode;
        }
    }
    throw new Error(`Invalid parse mode type ${mode}`);
}

export function getPeerId(peer: EntityLike, addMark = true): string {
    if (typeof peer == "string" && parseID(peer)) {
        peer = returnBigInt(peer);
    }
    if (bigInt.isInstance(peer)) {
        return addMark ? peer.toString() : resolveId(peer)[0].toString();
    }
    if (peer instanceof Api.InputPeerSelf) {
        _raiseCastFail(peer, "int (you might want to use client.get_peer_id)");
    }
    try {
        peer = getPeer(peer);
    } catch (e) {
        _raiseCastFail(peer, "int");
    }
    if (peer instanceof Api.PeerUser) {
        return peer.userId.toString();
    } else if (peer instanceof Api.PeerChat) {
        peer.chatId = resolveId(returnBigInt(peer.chatId))[0];
        return addMark
            ? peer.chatId.negate().toString()
            : peer.chatId.toString();
    } else if (typeof peer == "object" && "channelId" in peer) {
        peer.channelId = resolveId(returnBigInt(peer.channelId))[0];
        if (!addMark) {
            return peer.channelId.toString();
        }
        return "-100" + peer.channelId.toString();
    }
    _raiseCastFail(peer, "int");
}

export function resolveId(
    markedId: bigInt.BigInteger
): [
    bigInt.BigInteger,
    typeof Api.PeerUser | typeof Api.PeerChannel | typeof Api.PeerChat
] {
    if (markedId.greaterOrEquals(bigInt.zero)) {
        return [markedId, Api.PeerUser];
    }
    const m = markedId.toString().match(/-100([^0]\d*)/);
    if (m) {
        return [bigInt(m[1]), Api.PeerChannel];
    }
    return [markedId.negate(), Api.PeerChat];
}

export function getMessageId(
    message: number | Api.TypeMessage | MessageIDLike | undefined
): number | undefined {
    if (!message) {
        return undefined;
    } else if (typeof message === "number") {
        return message;
    } else if (message.SUBCLASS_OF_ID === 0x790009e3 || "id" in message) {
        return message.id;
    } else {
        throw new Error(`Invalid message type: ${message.constructor.name}`);
    }
}

export function parsePhone(phone: string) {
    phone = phone.toString().replace(/[()\s-]/gm, "");
    if (phone.startsWith("+") && phone.split("+").length - 1 == 1) {
        return !isNaN(Number(phone)) ? phone.replace("+", "") : undefined;
    }
}

export function parseID(id: string) {
    const isValid = /^(-?[0-9][0-9]*)$/.test(id);

    return isValid ? bigInt(id) : undefined;
}

export function resolveInviteLink(link: string): string | undefined {
    if (!link) {
        return undefined;
    }

    link = link.trim();

    const tmeMatch = link.match(
        /(?:https?:\/\/)?(?:www\.)?(?:telegram\.(?:me|dog)|t\.me)\/(?:joinchat\/|\+)([a-zA-Z0-9_-]+)/i
    );
    if (tmeMatch) {
        return tmeMatch[1];
    }

    const tgMatch = link.match(/tg:\/\/join\?invite=([a-zA-Z0-9_-]+)/i);
    if (tgMatch) {
        return tgMatch[1];
    }

    return undefined;
}

export function parseUsername(username: string): {
    username?: string;
    isInvite: boolean;
} {
    username = username.trim();
    const m = username.match(USERNAME_RE) || username.match(TG_JOIN_RE);
    if (m) {
        username = username.replace(m[0], "");
        if (m[1]) {
            return {
                username: username,
                isInvite: true,
            };
        } else {
            username = rtrim(username, "/");
        }
    }
    if (username.match(VALID_USERNAME_RE)) {
        return {
            username: username.toLowerCase(),
            isInvite: false,
        };
    } else {
        return {
            username: undefined,
            isInvite: false,
        };
    }
}

export function rtrim(s: string, mask: string) {
    while (~mask.indexOf(s[s.length - 1])) {
        s = s.slice(0, -1);
    }
    return s;
}

export function getDisplayName(entity: EntityLike) {
    if (entity instanceof Api.User) {
        if (entity.lastName && entity.firstName) {
            return `${entity.firstName} ${entity.lastName}`;
        } else if (entity.firstName) {
            return entity.firstName;
        } else if (entity.lastName) {
            return entity.lastName;
        } else {
            return "";
        }
    } else if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
        return entity.title;
    }
    return "";
}

export function isGif(file: any): boolean {
    const ext = _getExtension(file).toLowerCase();
    if (ext === ".gif") {
        return true;
    }
    const metadata = _getMetadata(file);
    return (metadata.get("mimeType") || "") === "image/gif";
}

export function encodeWaveform(waveform: number[]): Buffer {
    const bitCount = waveform.length * 5;
    const byteCount = Math.floor((bitCount + 7) / 8);
    const result = Buffer.alloc(byteCount);

    let bitPos = 0;
    for (const value of waveform) {
        const bytePos = Math.floor(bitPos / 8);
        const shift = bitPos % 8;

        result[bytePos] |= (value & 0x1f) << shift;
        if (shift > 3 && bytePos + 1 < byteCount) {
            result[bytePos + 1] |= (value & 0x1f) >> (8 - shift);
        }
        bitPos += 5;
    }

    return result;
}

export function decodeWaveform(
    waveform: Buffer,
    valueCount?: number
): number[] {
    if (!waveform || waveform.length === 0) {
        return [];
    }

    const bitCount = waveform.length * 8;
    const count = valueCount ?? Math.floor(bitCount / 5);
    const result: number[] = [];

    let bitPos = 0;
    for (let i = 0; i < count; i++) {
        const bytePos = Math.floor(bitPos / 8);
        const shift = bitPos % 8;

        let value = (waveform[bytePos] >> shift) & 0x1f;
        if (shift > 3 && bytePos + 1 < waveform.length) {
            value |= (waveform[bytePos + 1] << (8 - shift)) & 0x1f;
        }
        result.push(value);
        bitPos += 5;
    }

    return result;
}

export function splitText(
    text: string,
    entities: Api.TypeMessageEntity[] = [],
    limit: number = 4096
): [string, Api.TypeMessageEntity[]][] {
    if (text.length <= limit) {
        return [[text, entities]];
    }

    const result: [string, Api.TypeMessageEntity[]][] = [];
    let offset = 0;

    while (offset < text.length) {
        let end = Math.min(offset + limit, text.length);

        if (end < text.length) {
            const newlinePos = text.lastIndexOf("\n", end);
            const spacePos = text.lastIndexOf(" ", end);

            if (newlinePos > offset + limit / 2) {
                end = newlinePos + 1;
            } else if (spacePos > offset + limit / 2) {
                end = spacePos + 1;
            }
        }

        const chunk = text.slice(offset, end);
        const chunkEntities: Api.TypeMessageEntity[] = [];

        for (const entity of entities) {
            const entityEnd = entity.offset + entity.length;

            if (entityEnd <= offset) {
                continue;
            }
            if (entity.offset >= end) {
                continue;
            }

            const newOffset = Math.max(0, entity.offset - offset);
            const newLength = Math.min(
                entity.length,
                end - offset - newOffset,
                entityEnd - offset - newOffset
            );

            if (newLength > 0) {
                const clonedEntity = Object.assign(
                    Object.create(Object.getPrototypeOf(entity)),
                    entity,
                    { offset: newOffset, length: newLength }
                );
                chunkEntities.push(clonedEntity);
            }
        }

        result.push([chunk, chunkEntities]);
        offset = end;
    }

    return result;
}

export function getInputDialog(dialog: any): Api.TypeInputDialogPeer {
    if (dialog.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(dialog, "InputDialogPeer");
    }
    if (dialog.SUBCLASS_OF_ID === 0xa21c9795) {
        return dialog;
    }
    if (dialog.SUBCLASS_OF_ID === 0xc91c90b6) {
        return new Api.InputDialogPeer({ peer: dialog });
    }

    try {
        return new Api.InputDialogPeer({ peer: getInputPeer(dialog) });
    } catch (e) {
        _raiseCastFail(dialog, "InputDialogPeer");
    }
}

const FILE_REFERENCE_FLAG = 0x01000000;
const WEB_LOCATION_FLAG = 0x02000000;

enum BotFileType {
    Thumbnail = 0,
    ProfilePhoto = 1,
    Photo = 2,
    Voice = 3,
    Video = 4,
    Document = 5,
    Encrypted = 6,
    Temp = 7,
    Sticker = 8,
    Audio = 9,
    Animation = 10,
    EncryptedThumbnail = 11,
    Wallpaper = 12,
    VideoNote = 13,
    SecureRaw = 14,
    Secure = 15,
    Background = 16,
    DocumentAsFile = 17,
}

function _rleDecodeFileId(data: Buffer): Buffer {
    const result: number[] = [];
    let i = 0;
    while (i < data.length) {
        if (data[i] === 0x00 && i + 1 < data.length) {
            const count = data[i + 1];
            for (let j = 0; j < count; j++) {
                result.push(0x00);
            }
            i += 2;
        } else {
            result.push(data[i]);
            i += 1;
        }
    }
    return Buffer.from(result);
}

function _rleEncodeFileId(data: Buffer): Buffer {
    const result: number[] = [];
    let i = 0;
    while (i < data.length) {
        if (data[i] === 0x00) {
            let count = 0;
            while (i < data.length && data[i] === 0x00 && count < 255) {
                count++;
                i++;
            }
            result.push(0x00, count);
        } else {
            result.push(data[i]);
            i++;
        }
    }
    return Buffer.from(result);
}

export function resolveBotFileId(
    fileId: string
): Api.InputDocument | Api.InputPhoto | undefined {
    try {
        const data = Buffer.from(
            fileId.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
        );

        if (data.length < 8) {
            return undefined;
        }

        const decoded = _rleDecodeFileId(data);
        if (!decoded || decoded.length < 8) {
            return undefined;
        }

        let offset = 0;

        const fileType = decoded.readUInt32LE(offset);
        offset += 4;

        offset += 4;

        const hasFileReference = (fileType & FILE_REFERENCE_FLAG) !== 0;
        const hasWebLocation = (fileType & WEB_LOCATION_FLAG) !== 0;
        const actualFileType = fileType & 0x00ffffff;

        if (hasWebLocation) {
            return undefined;
        }

        let fileReference = Buffer.alloc(0);
        if (hasFileReference && offset < decoded.length) {
            const refLength = decoded[offset];
            offset += 1;
            if (offset + refLength <= decoded.length) {
                fileReference = Buffer.from(decoded.subarray(offset, offset + refLength));
                offset += refLength;
            }
        }

        if (offset + 16 > decoded.length) {
            return undefined;
        }

        const id = decoded.readBigInt64LE(offset);
        offset += 8;

        const accessHash = decoded.readBigInt64LE(offset);

        if (actualFileType === BotFileType.Photo || actualFileType === BotFileType.ProfilePhoto) {
            return new Api.InputPhoto({
                id: bigInt(id.toString()),
                accessHash: bigInt(accessHash.toString()),
                fileReference: fileReference,
            });
        } else {
            return new Api.InputDocument({
                id: bigInt(id.toString()),
                accessHash: bigInt(accessHash.toString()),
                fileReference: fileReference,
            });
        }
    } catch (e) {
        return undefined;
    }
}

export function packBotFileId(
    media: Api.Document | Api.Photo | Api.TypeInputDocument | Api.TypeInputPhoto
): string | undefined {
    try {
        let id: bigInt.BigInteger;
        let accessHash: bigInt.BigInteger;
        let fileReference = Buffer.alloc(0);
        let fileType: BotFileType;
        let dcId = 0;

        if (media instanceof Api.Document) {
            id = media.id;
            accessHash = media.accessHash;
            fileReference = Buffer.from(media.fileReference);
            dcId = media.dcId;

            if (media.mimeType === "audio/ogg") {
                fileType = BotFileType.Voice;
            } else if (media.mimeType?.startsWith("audio/")) {
                fileType = BotFileType.Audio;
            } else if (media.mimeType?.startsWith("video/")) {
                const isVideoNote = media.attributes?.some(
                    (a) => a instanceof Api.DocumentAttributeVideo && a.roundMessage
                );
                fileType = isVideoNote ? BotFileType.VideoNote : BotFileType.Video;
            } else if (media.mimeType === "application/x-tgsticker" || media.mimeType === "image/webp") {
                fileType = BotFileType.Sticker;
            } else if (media.mimeType === "video/mp4" || media.mimeType === "image/gif") {
                fileType = BotFileType.Animation;
            } else {
                fileType = BotFileType.Document;
            }
        } else if (media instanceof Api.Photo) {
            id = media.id;
            accessHash = media.accessHash;
            fileReference = Buffer.from(media.fileReference);
            dcId = media.dcId;
            fileType = BotFileType.Photo;
        } else if (media instanceof Api.InputDocument) {
            id = media.id;
            accessHash = media.accessHash;
            fileReference = media.fileReference ? Buffer.from(media.fileReference) : Buffer.alloc(0);
            fileType = BotFileType.Document;
        } else if (media instanceof Api.InputPhoto) {
            id = media.id;
            accessHash = media.accessHash;
            fileReference = media.fileReference ? Buffer.from(media.fileReference) : Buffer.alloc(0);
            fileType = BotFileType.Photo;
        } else {
            return undefined;
        }

        const hasFileRef = fileReference.length > 0;
        const typeWithFlags = fileType | (hasFileRef ? FILE_REFERENCE_FLAG : 0);

        const bufferSize = 4 + 4 + (hasFileRef ? 1 + fileReference.length : 0) + 8 + 8;
        const buffer = Buffer.alloc(bufferSize);
        let offset = 0;

        buffer.writeUInt32LE(typeWithFlags, offset);
        offset += 4;

        buffer.writeUInt32LE(dcId, offset);
        offset += 4;

        if (hasFileRef) {
            buffer.writeUInt8(fileReference.length, offset);
            offset += 1;
            fileReference.copy(buffer, offset);
            offset += fileReference.length;
        }

        buffer.writeBigInt64LE(BigInt(id.toString()), offset);
        offset += 8;

        buffer.writeBigInt64LE(BigInt(accessHash.toString()), offset);

        const encoded = _rleEncodeFileId(buffer);
        return encoded
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    } catch (e) {
        return undefined;
    }
}