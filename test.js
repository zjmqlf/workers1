import { TelegramClient, Api, sessions, utils } from "./gramjs";
import bigInt from "big-integer";
import { Buffer } from "node:buffer";

export default {
  async fetch(request, env, ctx) {
    let client = null;

    async function open() {
//      const apiId = 1334621;
//      const apiHash = "2bc36173f487ece3052a00068be59e7b";
//      const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7bozM+s7t7L8hRPBYwzto9OLqobDGusMcUFLRi+d1mF7K3EJWdaODLieqH45A1Jzv38bc+bO3q9QCqUQ5MSAQLkqAfDth+gRHNkVx2Jje4z0M2k1tSlexsFiaGgQ5ol8mA4ny/A4syHJ3AITMtLyI3UkAj88N3VvpbHaFaViPoey7Tyk5DBKGNqLbYRvRJ88BjYMnBsPHg+/qGxdU9x1RYfd8sX9uFr0D98IJQpFi4PohsGvgOK+OIWhGEtMKzOIYCm8kUGVOvOR3KxN4LDU57bG3tVU6YcZIfEwb6OheBVNxM5IHr47++zuk3p4RLv/LidyFUBuhHYz0zUVEnQZXOg==";
      const apiId = 8851987;
      const apiHash = "8c353f36d876aa5b71b671dd221d763c";
      const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7T4XOMd9S70qaT1RsAFjZNt7R7HVArcpGvSs5k4W9Zwv6ifsWA7UjljXCRPelXOooM/t3FIVZZ1pKg4mZ2NyXYZrl6GFR1On7/RjIJ+BDPZDArthDvQoIil7ZEAFDeuGm6zUkZZ8NeMPUS2rEpI8wmjIDH4m8qD3aj56DK0WuMpsJGoK+liLseKOI3EtmyTAkK/1u8jRkRPuV7egGYU4zH3FSkUSZJPxt67Pb87MJx75sZu2lJkicbUn8tcnwcN1eW6HgRnyjnc5b+7S1tfT+9Lxs+xMhO2J77Q2wwQ6rAgas2qC3g/dWIcdzCw295ar08PHSOxCi2UUCIj0+QojJ1g==";

      client = await new TelegramClient(new sessions.StringSession(sessionString), apiId, apiHash, {
        connectionRetries : Number.MAX_VALUE,
        autoReconnect : true,
        //downloadRetries : 1,
        //retryDelay : 0,
        //useWSS : false,
        //langCode : "en",
        //systemLangCode : "en",
      })
      await client.session.setDC(5, "91.108.56.128", 80);
      await client.setLogLevel("error");
      await client.connect();
      console.log("连接服务器成功");
      //console.log(client);  //测试
      //await scheduler.wait(5000);
    }

    async function close() {
      if (client) {
        await client.destroy();
        console.log("断开服务器成功");
        //await scheduler.wait(1000);
      }
    }

    if (!client) {
      await open();
    }

//    //let id = 0;
//    let channelId = 0;
//    let accessHash = 0;
//    for await (const dialog of client.iterDialogs({})) {
//      console.log(dialog);  //测试
//      //id = dialog.id;
//      //console.log(id);  //测试
//      channelId = dialog.inputEntity.channelId;
//      accessHash = dialog.inputEntity.accessHash;
//      //console.log(channelId);  //测试
//      //console.log(accessHash);  //测试
//      //console.log(JSON.stringify(dialog));  //测试
//      break;
//    }
//    channelId = bigInt(channelId.toString());
//    accessHash = bigInt(accessHash.toString());
//    const result = await client.invoke(new Api.channels.GetChannels({
//      id: [new Api.InputChannel({
//        channelId: channelId,
//        accessHash: accessHash,
//      })],
//    }));
//    //console.log(result);
//    console.log(result.chats.length);
//    console.log(result.chats[0]);

    let id = 0;
    for await (const message of client.iterMessages(
      "me",
      {
        limit: 10,
        reverse: false,
        addOffset: 0,
        filter: Api.InputMessagesFilterVideo,
        waitTime: 60,
      })
    ) {
      if (message.media) {
        if (message.media.document) {
          //console.log(message);  //测试
          let dcId = message.media.document.dcId;
          let id = message.media.document.id.toString();
          let accessHash = message.media.document.accessHash.toString();
          let fileReference = message.media.document.fileReference;
//          console.log(dcId);  //测试
//          console.log(id);  //测试
//          console.log(accessHash);  //测试
//          console.log(fileReference);  //测试
          const mediaInfo = await env.DB.prepare("INSERT INTO `MEDIA` (id, accessHash, dcId, fileReference) VALUES (?, ?, ?, ?);").bind(id, accessHash, dcId, fileReference).run();
          //console.log(mediaInfo);  //测试
          if (mediaInfo.success === true) {
            console.log("插入media数据成功");
          } else {
            console.log("插入media数据失败");
          }
          //console.log(JSON.stringify(message));  //测试
//          id = message.id;
//          console.log(id);  //测试
//          const result = await client.invoke(new Api.messages.GetMessages({
//            id: [new Api.InputMessageID({ id: id })],
//          }));
//          console.log(result);
//          //console.log(result.chats.length);
//          //console.log(result.chats[0]);
//          console.log(result.messages.length);
//          console.log(result.messages[0]);
          const info = utils.getFileInfo(message.media);
          let sender = await client.getSender(info.dcId);
          let hashes = await client.invokeWithSender(
            new Api.upload.GetFileHashes({
              location: info.location,
              offset: 0,
            }),
            sender
          );
          let hash = [];
          let length = hashes.length;
          if (length > 0) {
            for (let i = 0; i < length; i++) {
              hash.push(hashes[i].hash.toString("hex"));
            }
          }
          //console.log(hash);
          console.log(JSON.stringify(hash));

          const mediaResult = await env.DB.prepare("SELECT * FROM `MEDIA` WHERE `id` = ? AND `accessHash` = ?;").bind(id, accessHash).first();
          //console.log(mediaResult);  //测试
          if (mediaResult) {
            dcId = mediaResult.dcId;
            id = mediaResult.id;
            accessHash = mediaResult.accessHash;
            fileReference = Buffer.from(mediaResult.fileReference);
//            console.log(dcId);  //测试
//            console.log(id);  //测试
//            console.log(accessHash);  //测试
//            console.log(fileReference);  //测试
            id = bigInt(id);
            accessHash = bigInt(accessHash);
            sender = await client.getSender(dcId);
            const location = await new Api.InputDocumentFileLocation({
              id: id,
              accessHash: accessHash,
              fileReference: fileReference,
              thumbSize: "",
            });
            hashes = await client.invokeWithSender(
              new Api.upload.GetFileHashes({
                location: location,
                offset: 0,
              }),
              sender
            );
            hash = [];
            length = hashes.length;
            if (length > 0) {
              for (let i = 0; i < length; i++) {
                hash.push(hashes[i].hash.toString("hex"));
              }
            }
            //console.log(hash);
            console.log(JSON.stringify(hash));
          }
          console.log("-------------------------------------------------------------");
          break;
        }
      }
    }


//    const me = await client.getEntity("me");
//    console.log("My name is",utils.getDisplayName(me));
//    const chat = await client.getInputEntity("username");
//    console.log(chat);
    await close();

    return new Response("error");
  },
};
