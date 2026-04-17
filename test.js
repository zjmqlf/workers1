import { TelegramClient, Api, sessions, utils } from "./teleproto";
import { LogLevel } from "./teleproto/extensions";
import bigInt from "big-integer";
import { Buffer } from "node:buffer";
import * as crypto from "node:crypto";
// import { oneDriveAPI } from "./onedrive-api";

export default {
  async fetch(request, env, ctx) {
    let channelId = 0;
    let channelAccessHash = 0;
    let dcId = 0;
    let id = "";
    let accessHash = "";
    let fileReference = "";
    const clientIndex = 2;
    const client = [null, null, null];
    const apiIdArray = [
      1334621,   //zjm1985
      8851987,   //zjm2023
      25429403   //zjm4038
    ];
    const apiHashArray = [
      "2bc36173f487ece3052a00068be59e7b",
      "8c353f36d876aa5b71b671dd221d763c",
      "2bb9a1bfd8f598da6cb5c511f0e5fbdf"
    ];
    const sessionStringArray = [
      "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7VxdGmdW/SYRusjfTnUHfhQfqLFA+A30Jios20XKnGGsRB58mFR33Lnpz966333yugE0ysMX/XMP8Urbbm3ADQ/mCq/fdQqA/qUoeG9L2Wy0Y8WcOlikGkNJ2e/nO9pT9nl1YePq5DD/hJ8+eKNL4BvUY70GAth/N/fv7dA4joQzwWhHdA8wdOUaxDQhnSAk9H62zG4fX5zipV+g2qp2WCT6CWCwUtsgZs8FZ9g9/TMmyfLagFmnMe7MhlZdkMfgCtKCXI8MVrGaHq5SpPRqMMCR4SkFrwV+9Eo6NyehH7bzWl1zyyAr6wP8j0jtduckdvkUcmyoDOP2M3AkNgd+ZcQ==",
      "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7MFhLSZ0gGHyL7Qbuxizzc+mW8bnmTfSKFMletIh9p1CWZwFAAE7KQ+i2L/WZGkiS3V2KNPjhIo9xMm4Ko9KJSetwU7X0XlxZ9QQmM2qNfl7WWpzv/Yd/F1blJDTtz8m6CSJIV7PgT7+JTWdyYajFkg+JqDLIhcrG6tqqkzT/WrKhQp7Qoi1ULuKV4/KwWOx1rH/7vb1TrdeBTZgR77qfawyRErfezIC4WG/dMjr/u918sKFSKVAbVe0BAaToKAlUXJRNIuijAN2rHF+1ITiQZP9lLEK55lpNXTf3ZnsEy+cxlJHFgvbFTq4yKBnYFfnbSs+DFHRR/mjryJhOVyH59g==",
      "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7be+PddSzlPTzgS/mbCsxeZYLhE9ohnesT10Ntv+pdypA3wfrAUdXGXBLb2uturgLlkO49XMxAsIoELAdi8OprHkYfeEWZrQPF9RqjucdgWviAVd3oy/JIHk6lbB6NCS06US2CMdLZMxAsLFLu2JTgWiI07Xm2tpCIaaYED9mmH7NiROvqBx+jpB2GoFM4xzqaoB3y43BURo/ZYPEM3uUB4AVsS7IwdK0/j8pJL/ChB3buNnNtyVADe8wFvEAcbMn/385Xz53T21BdYqanzMuZX2O9cv4UNCpA9P6HoEYRn0D9XsljY6xJFNdR/RRKGHBqlVLK/Xt6PagRm321YBAvw=="
    ];

    async function open(index) {
      client[index] = new TelegramClient(new sessions.StringSession(sessionStringArray[index]), apiIdArray[index], apiHashArray[index], {
        // connectionRetries : Number.MAX_VALUE,
        timeout: 5,
        retryDelay: 1000,
        connectionRetries: 5,
        autoReconnect: true,
        deviceModel: "Desktop",
        systemVersion: "Windows 10",
        appVersion: "5.12.3 x64",
        langCode: "en",
        systemLangCode: "en-US",
      });
      client[index].session.setDC(5, "91.108.56.128", 80);
      client[index].setLogLevel("error");
      await client[index].connect();
      console.log("连接服务器" + (index + 1) + "成功");  //测试
      //console.log(client[index]);  //测试
      await scheduler.wait(2000);
    }

    async function selectMessage(messageId) {
      let messageResult = null;
      try {
        messageResult = await env.MAINDB.prepare("SELECT * FROM `MESSAGE` WHERE `id` = ? LIMIT 1;").bind(messageId).run();
      } catch (e) {
        console.log(messageId + " : selectMessage出错 : " + e);  //测试
      }
      console.log("messageResult : ");  //测试
      console.log(messageResult);  //测试
      if (messageResult.success === true) {
        if (messageResult.results && messageResult.results.length > 0) {
          return messageResult.results[0];
        }
      }
    }

    async function close(index) {
      if (client[index]) {
        await client[index].destroy();
        console.log("断开服务器" + (index + 1) + "成功");
        //await scheduler.wait(1000);
      }
    }

    // function getDB(dbIndex) {
    //   const db = {
    //     "0": env.MEDIADB,
    //     "1": env.MEDIADB1,
    //     "2": env.MEDIADB2,
    //     "3": env.MEDIADB3,
    //     "4": env.MEDIADB4,
    //     "5": env.MEDIADB5,
    //     "6": env.MEDIADB6,
    //     "7": env.MEDIADB7,
    //     "8": env.MEDIADB8,
    //     '9': env.MEDIADB9,
    //     "10": env.MEDIADB10,
    //     "11": env.MEDIADB11,
    //     '12': env.MEDIADB12,
    //     "13": env.MEDIADB13,
    //     "14": env.MEDIADB14,
    //     "15": env.MEDIADB15,
    //     "16": env.MEDIADB16,
    //     "17": env.MEDIADB17,
    //     "18": env.MEDIADB18,
    //     "19": env.MEDIADB19,
    //   };
    //   return db[dbIndex];
    // }

    // async function selectMedia(dbIndex, Vindex) {
    //   const db = getDB(dbIndex);
    //   // console.log("db : " + db);  //测试
    //   let mediaResult = {};
    //   try {
    //     mediaResult = await db.prepare("SELECT * FROM `MEDIA` WHERE `Vindex` = ? LIMIT 1;").bind(Vindex).run();
    //   } catch (e) {
    //     console.log("selectMedia出错 : " + e);
    //   }
    //   console.log("mediaResult : ");  //测试
    //   console.log(mediaResult);  //测试
    //   if (mediaResult.success === true) {
    //     if (mediaResult.results && mediaResult.results.length > 0) {
    //       return mediaResult.results[0];
    //     }
    //   }
    // }

    // function getPath(str) {
    //   const strToArr = str.split("");
    //   let length = str.length;
    //   for (let i = 2; i < length; i += 3) {
    //     strToArr.splice(i, 0, "/");
    //     length += 1;
    //   }
    //   return strToArr.join("");
    // }

    // async function uploadFile(accessToken, drive, filename, sign, index) {
    //   //console.log("正准备异步上传");  //测试
    //   const filePath = getPath(md5Result.substring(8, 24));
    //   // console.log("filePath : " + filePath);  //测试
    //   oneDriveAPI.items.uploadSimple({
    //     accessToken: accessToken,
    //     drive: "site",
    //     driveId: drive,
    //     parentPath: filePath,
    //     filename: filename,
    //     readableStream: sign,
    //     // prefix: "",
    //     index: index,
    //   }).then(async (item) => {
    //     //console.log(item);  //测试
    //     if (item.id && item.webUrl) {
    //       console.log("itemId : " + item.id);  //测试
    //       console.log("webUrl : " + item.webUrl);  //测试
    //     } else {
    //       console.log(" 第" + index + "视频分块onedrive的id或url为空");
    //       await uploadFile(accessToken, drive, filePath, filename, sign, index);
    //     }
    //   });
    // }

    await open(clientIndex);
    // let id = 0;
    if (client[clientIndex]) {
    // let id = 0;
    // let channelId = 0;
    // let accessHash = 0;
    let index = 0;
    for await (const dialog of client[clientIndex].iterDialogs({})) {
      index += 1;
      if (index === 5) {
      //   const cache = [];
      //   const json_str = JSON.stringify(dialog, function(key, value) {
      //     if (typeof value === 'object' && value !== null) {
      //       if (cache.indexOf(value) !== -1) {
      //         return;
      //       }
      //       cache.push(value);
      //     }
      //     return value;
      //   });
      //   console.log(json_str);  //测试
      //   break;  //测试
        if (dialog.isChannel === true) {
          console.log(dialog.entity.username);  //测试
          console.log(dialog.draft._entity.username);  //测试
          break;  //测试
        }
      }
      // console.log(dialog);  //测试
      // console.log(dialog.username);  //测试
      // console.log(JSON.stringify(dialog));  //测试
      //id = dialog.id;
      //console.log(id);  //测试
      // channelId = dialog.inputEntity.channelId;
      // // channelId = dialog.draft._peer.channelId;
      // // channelId = dialog.draft._entity.id;
      // // channelId = dialog.entity.id;
      // accessHash = dialog.inputEntity.accessHash;
      // // accessHash = dialog.draft._entity.accessHash;
      // // accessHash = dialog.entity.accessHash;
      // console.log({"channelId1" : channelId});  //测试
      // console.log({"accessHash2" : accessHash});  //测试
      // break;  //测试
    }
    // const fromPeer = await client[clientIndex].getInputEntity("me");
    // // console.log(fromPeer);  //测试
    // console.log(JSON.stringify(fromPeer));  //测试
    // const toPeer = await client[clientIndex].invoke(
    //     new Api.users.GetUsers({
    //         id: [
    //             new Api.InputUser({
    //                 userId: 7585811878,
    //                 accessHash: bigInt.zero,
    //             }),
    //         ],
    //     })
    // );
    // console.log(JSON.stringify(toPeer));  //测试

    // const timeOut = new Promise((resolve, reject) => {
    //   setTimeout(() => {
    //     return resolve();
    //     // return reject(new Error("error"));
    //   }, 5000);
    // });
    // // await Promise.race([
    // //   client[clientIndex].getInputEntity(8349419657),
    // //   timeOut
    // // ]).then((value) => {
    // //   console.log(value);  //测试
    // //   console.log({"value" : "111"});  //测试
    // // });
    // const value = await Promise.race([
    //   // client[clientIndex].getInputEntity(8349419657),
    //   client[clientIndex].invoke(
    //       new Api.users.GetUsers({
    //           id: [
    //               new Api.InputUser({
    //                   userId: 7585811878,
    //                   accessHash: bigInt.zero,
    //               }),
    //           ],
    //       })
    //   ),
    //   timeOut
    // ]);
    // console.log(value);  //测试
    // console.log({"value" : "111"});  //测试

    // let toPeer = null;
    // const users = await client[clientIndex].invoke(
    //   new Api.users.GetUsers({
    //     id: [
    //       new Api.InputUser({
    //         userId: 2029656369,
    //         accessHash: bigInt.zero,
    //       }),
    //     ],
    //   })
    // );
    // // console.log(users);  //测试
    // // console.log(users.length);  //测试
    // if (users.length && !(users[0] instanceof Api.UserEmpty)) {
    //   toPeer = utils.getInputPeer(users[0]);
    // }
    // console.log(toPeer);  //测试
    // console.log(JSON.stringify(toPeer));  //测试

    // channelId = bigInt(channelId.toString());
    // accessHash = bigInt(accessHash.toString());
    // const result = await client[clientIndex].invoke(new Api.channels.GetChannels({
    //   id: [new Api.InputChannel({
    //     channelId: channelId,
    //     accessHash: accessHash,
    //   })],
    // }));
    // //console.log(result);  //测试
    // console.log(result.chats.length);  //测试
    // console.log(result.chats[0]);  //测试

    // await open(2);
    // for await (const dialog of client[2].iterDialogs({})) {
    //   // console.log(dialog);  //测试
    //   //id = dialog.id;
    //   //console.log(id);  //测试
    //   channelId = dialog.inputEntity.channelId;
    //   accessHash = dialog.inputEntity.accessHash;
    //   console.log({"channelId2" : channelId});  //测试
    //   console.log({"accessHash2" : accessHash});  //测试
    //   // console.log(JSON.stringify(dialog));  //测试
    //   break;
    // }

    // const idArray = [];
    // const fileIdArray = [];
    // for await (const message of client[clientIndex].iterMessages(
    //     "me",
    //     {
    //       limit: 20,
    //       // reverse: false,
    //       reverse: true,
    //       // addOffset: 10000,
    //       addOffset: -1,
    //       filter: Api.InputMessagesFilterVideo,
    //       waitTime: 60,
    //     })
    //   ) {
    //     // const forwardResult = await client[clientIndex].invoke(new Api.messages.ForwardMessages({
    //     //   silent: true,
    //     //   background: true,
    //     //   withMyScore: true,
    //     //   fromPeer: fromPeer,
    //     //   toPeer: toPeer,
    //     //   id: [message.id],
    //     //   randomId: [message.id],
    //     //   //scheduleDate: 0,
    //     // }));
    //     // // console.log(JSON.stringify(forwardResult));  //测试
    //     // console.log("-------------------------------------------------------------");  //测试
    //     // break;
    //     //console.log(forwardResult);  //测试
    //     if (message.media) {
    //       if (message.media.document) {
    //         const result = await client[clientIndex].invoke(new Api.messages.SendMedia({
    //           // peer: "me",
    //           peer: toPeer,
    //           media: message.media,
    //           message: message.message,
    //           // entities: msgEntities,
    //           // replyTo: replyObject,
    //           // replyMarkup: markup,
    //           // silent: silent,
    //           // scheduleDate: scheduleDate,
    //           // clearDraft: clearDraft,
    //           // noforwards: false,
    //           // sendAs: sendAs,
    //           // effect: effect,
    //           // invertMedia: invertMedia,
    //         }));
    //         const messageId = message.id;
    //         console.log("messageId : " + messageId);  //测试
    //         if (messageId > 0) {
    //           const messageResult = await selectMessage(messageId);
    //           // console.log(messageResult);  //测试
    //           const dbIndex = messageResult.dbIndex;
    //           const ids = JSON.parse(messageResult.ids);
    //           const length = ids.length;
    //           if (dbIndex > 0 && length > 0) {
    //             const mediaResult = await selectMedia(dbIndex, ids[0]);
    //             const hash = JSON.parse(mediaResult.hash);
    //             console.log("hash : " + hash[0]);  //测试
    //             const hashLength = hash.length;
    //             const size = parseInt(message.media.document.size);
    //             const count = Math.ceil(size / 131072);
    //             if (count === hashLength) {
    //               const fileArray = [];
    //               const info = utils.getFileInfo(message.media);
    //               let sender = await client[clientIndex].getSender(info.dcId);
    //               for (let currentPart = 0; currentPart < count; currentPart++) {
    //                 let result = undefined;
    //                 try {
    //                   result = await client[clientIndex].invokeWithSender(
    //                     new Api.upload.GetFile({
    //                       location: info.location,
    //                       offset: currentPart * 131072,
    //                       limit: 131072,
    //                     }),
    //                     sender
    //                   );
    //                 } catch (e) {
    //                 }
    //                 if (result) {
    //                   const buffer = result.bytes;
    //                   console.log("buffer length : " + buffer.length);  //测试
    //                   const md5 = crypto.createHash("md5");
    //                   md5.update(buffer);
    //                   const md5Result = md5.digest("hex");
    //                   console.log("md5 : " + md5Result);  //测试
    //                   const sha1 = crypto.createHash("sha1");
    //                   const sha1Result = sha1.update(buffer).digest("hex");
    //                   console.log("sha1 : " + sha1Result);  //测试
    //                   const sha2 = crypto.createHash("sha256");
    //                   const sha2Result = sha2.update(buffer).digest("hex");
    //                   console.log("sha2 : " + sha2Result);  //测试
    //                   if (sha2Result === hash[0]) {
    //                     const key = Buffer.from(sha2Result.substring(0, 32), "utf8");
    //                     const iv = Buffer.from(md5Result.substring(8, 24), "utf8");
    //                     const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    //                     let sign = [];
    //                     sign.push(cipher.update(buffer));
    //                     sign.push(cipher.final());
    //                     sign = Buffer.concat(sign);
    //                     // console.log("sign type : " + typeof sign);  //测试
    //                     // console.log("sign : " + sign);  //测试
    //                     console.log("sign length : " + sign.length);  //测试
    //                     const newMd5 = crypto.createHash("md5");
    //                     newMd5.update(sign);
    //                     const filename = newMd5.digest("hex");
    //                     console.log("filename : " + filename);  //测试
    //                     fileArray.push(filename);
    //                     // const accessToken = await getCurrentToken(driveIndex, i);
    //                     // await uploadFile(accessToken, drive, filename, sign, currentPart);
    //                   } else {
    //                     console.log("!hash");  //测试
    //                   }
    //                 } else {
    //                   console.log("!result");  //测试
    //                 }
    //                 break;  //测试
    //               }
    //             } else {
    //               console.log("!=");  //测试
    //             }
    //           }
    //         }
    //         break;  //测试
    //         // // console.log(message);  //测试
    //         // // console.log(JSON.stringify(message));  //测试
    //         // dcId = message.media.document.dcId;
    //         // id = message.media.document.id.toString();
    //         // accessHash = message.media.document.accessHash.toString();
    //         // fileReference = message.media.document.fileReference.toString("base64");
    //         // // fileReference = message.media.document.fileReference.toString("utf8");
    //         // // const decoder = new TextDecoder('utf-8');
    //         // // const decoder = new TextDecoder();
    //         // // fileReference = decoder.decode(message.media.document.fileReference);
    //         // // console.log(id);  //测试   6102674127003320582
    //         // // console.log(Number(message.media.document.id));  //测试   6102674127003320000
    //         // // console.log(dcId);  //测试
    //         // // console.log(id);  //测试
    //         // // console.log(accessHash);  //测试
    //         // // console.log(fileReference);  //测试
    //         // // const mediaInfo = await env.DB.prepare("INSERT INTO `MEDIA` (id, accessHash, dcId, fileReference) VALUES (?, ?, ?, ?);").bind(id, accessHash, dcId, fileReference).run();
    //         // // //console.log(mediaInfo);  //测试
    //         // // if (mediaInfo.success === true) {
    //         // //   console.log("插入media数据成功");
    //         // // } else {
    //         // //   console.log("插入media数据失败");
    //         // // }
    //         // //console.log(JSON.stringify(message));  //测试
    //         // // id = message.id;
    //         // // channelId = message.savedPeerId.channelId.toString();
    //         // // if (message.savedPeerId.accessHash) {
    //         // //   channelAccessHash = message.savedPeerId.accessHash.toString();
    //         // // }
    //         // // console.log(id);  //测试
    //         // // const result = await client[clientIndex].invoke(new Api.messages.GetMessages({
    //         // //   id: [new Api.InputMessageID({ id: id })],
    //         // // }));
    //         // // console.log(result);  //测试
    //         // // //console.log(result.chats.length);  //测试
    //         // // //console.log(result.chats[0]);  //测试
    //         // // console.log(result.messages.length);  //测试
    //         // // console.log(result.messages[0]);  //测试
    //         // const info = utils.getFileInfo(message.media);
    //         // let sender = await client[clientIndex].getSender(info.dcId);
    //         // let hashes = await client[clientIndex].invokeWithSender(
    //         //   new Api.upload.GetFileHashes({
    //         //     location: info.location,
    //         //     offset: 0,
    //         //   }),
    //         //   sender
    //         // );
    //         // let hash = [];
    //         // let length = hashes.length;
    //         // if (length > 0) {
    //         //   for (let i = 0; i < length; i++) {
    //         //     hash.push(hashes[i].hash.toString("hex"));
    //         //   }
    //         // }
    //         // //console.log(hash);  //测试
    //         // console.log(JSON.stringify(hash));  //测试

    //     //     // const mediaResult = await env.DB.prepare("SELECT * FROM `MEDIA` WHERE `id` = ? AND `accessHash` = ?;").bind(id, accessHash).first();
    //     //     // //console.log(mediaResult);  //测试
    //     //     // if (mediaResult) {
    //     //     //   dcId = mediaResult.dcId;
    //     //     //   id = mediaResult.id;
    //     //     //   accessHash = mediaResult.accessHash;
    //     //     //   fileReference = Buffer.from(mediaResult.fileReference);
    //     //     //   // console.log(dcId);  //测试
    //     //     //   // console.log(id);  //测试
    //     //     //   // console.log(accessHash);  //测试
    //     //     //   // console.log(fileReference);  //测试
    //     //     //   id = bigInt(id);
    //     //     //   accessHash = bigInt(accessHash);
    //     //     //   sender = await client[clientIndex].getSender(dcId);
    //     //     //   const location = await new Api.InputDocumentFileLocation({
    //     //     //     id: id,
    //     //     //     accessHash: accessHash,
    //     //     //     fileReference: fileReference,
    //     //     //     thumbSize: "",
    //     //     //   });
    //     //     //   hashes = await client[clientIndex].invokeWithSender(
    //     //     //     new Api.upload.GetFileHashes({
    //     //     //       location: location,
    //     //     //       offset: 0,
    //     //     //     }),
    //     //     //     sender
    //     //     //   );
    //     //     //   hash = [];
    //     //     //   length = hashes.length;
    //     //     //   if (length > 0) {
    //     //     //     for (let i = 0; i < length; i++) {
    //     //     //       hash.push(hashes[i].hash.toString("hex"));
    //     //     //     }
    //     //     //   }
    //     //     //   //console.log(hash);  //测试
    //     //     //   console.log(JSON.stringify(hash));  //测试
    //     //     // }
    //         // console.log("-------------------------------------------------------------");  //测试
    //         // break;  //测试
    //       }
    //     // } else {
    //     //   console.log(message);  //测试
    //     //   idArray.push(message.id);  //测试
    //     //   fileIdArray.push(message.id);  //测试
    //     }
    //     // break;  //测试
    //   }
      // console.log(idArray);  //测试
      // console.log(idArray.length);  //测试
      
      // const forwardResult = await client[clientIndex].invoke(new Api.messages.ForwardMessages({
      //   fromPeer: "me",
      //   id: idArray,
      //   randomId: fileIdArray,
      //   toPeer: toPeer,
      //   silent: true,
      //   background: true,
      //   withMyScore: true,
      //   dropAuthor: true,
      //   dropMediaCaptions: true,
      //   // noforwards: true,
      //   // scheduleDate: 0,
      //   // sendAs: "username",
      // }));

      await close(clientIndex);
      // await open(2);

      // id = bigInt(id);
      // accessHash = bigInt(accessHash);
      // fileReference = Buffer.from(fileReference, "base64");
      // // fileReference = Buffer.from(fileReference, "utf8");
      // // fileReference = new Uint8Array(fileReference).buffer;
      // // const encoder = new TextEncoder();
      // // fileReference = encoder.encode(fileReference).buffer;
      // // console.log(fileReference);  //测试
      // const sender = await client[2].getSender(dcId);
      // const location = await new Api.InputDocumentFileLocation({
      //   id: id,
      //   accessHash: accessHash,
      //   fileReference: fileReference,
      //   thumbSize: "",
      // });
      // const hashes = await client[2].invokeWithSender(
      //   new Api.upload.GetFileHashes({
      //     location: location,
      //     offset: 0,
      //   }),
      //   sender
      // );
      // const hash = [];
      // const length = hashes.length;
      // if (length > 0) {
      //   for (let i = 0; i < length; i++) {
      //     hash.push(hashes[i].hash.toString("hex"));
      //   }
      // }
      // //console.log(hash);  //测试
      // console.log(JSON.stringify(hash));  //测试

      // // const result = await client[2].invoke(new Api.messages.GetMessages({
      // //   id: [new Api.InputMessageID({ id: id })],
      // // }));

      // // channelId = bigInt(channelId);
      // // if (channelAccessHash) {
      // //   channelAccessHash = bigInt(channelAccessHash);
      // // } else {
      // //   channelAccessHash = bigInt.zero;
      // // }
      // // const result = await client[2].invoke(new Api.channels.GetMessages({
      // //   channel: new Api.InputChannel({
      // //     channelId: channelId,
      // //     accessHash: channelAccessHash,
      // //   }),
      // //   id: [new Api.InputMessageID({ id: id })],
      // // }));
      // // console.log(JSON.stringify(result));  //测试

      // console.log("-------------------------------------------------------------");  //测试
      // await close(2);
  }

//    const me = await client[clientIndex].getEntity("me");
//    console.log("My name is",utils.getDisplayName(me));  //测试
//    const chat = await client[clientIndex].getInputEntity("username");
//    console.log(chat);  //测试
//    await close(clientIndex);

    return new Response("error");
  },
};
