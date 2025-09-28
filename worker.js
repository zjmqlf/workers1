import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions, utils } from "./gramjs";
import bigInt from "big-integer";

async function countMessage(env) {
  const messageResult = await env.MAINDB.prepare("SELECT COUNT(Mindex) FROM `PANMESSAGE` WHERE 1 = 1;").first();
  //console.log("messageResult : " + messageResult["COUNT(Mindex)"]);  //测试
  if (messageResult && messageResult["COUNT(Mindex)"]) {
    return messageResult["COUNT(Mindex)"];
  }
  return -1;
}

function getDB(id) {
  const database = [
    "97d41e14-a9b6-45a9-b5cc-f60eb29acc02",  //0 : main
    "619bf710-136f-4b05-b7a7-ce7ffef02990",  //1 : media1
    "aab5c1c2-2533-4be0-9993-bd62f306ebcc",  //2 : media2
    "72893c57-6b53-4f79-a730-217f80da6492",  //3 : media3
    "c84b9365-6811-437f-87ee-15a09bf3be56",  //4 : media4
    "1893770b-972c-4ad2-972d-888e305fd0b8",  //5 : media5
    "532d0baf-ba9c-42c2-80a3-940cbfccf8d3",  //6 : media6
    "e629851c-d683-4b3b-a10e-3ca9d67b9142",  //7 : media7
  ];
  const length = database.length;
  if (id < length) {
    return database[id];
  } else {
    return undefined;
  }
}

async function exportDB(databaseId) {
  const accountId = "ac4c475ca3875ec3dea2d2306fde9c69";
  const d1ApiKey = "Vk_7LsZt_ZEwDMMU4tqHHaYghAApWQ8I5M5TV7x9";
  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
  const method = "POST";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${d1ApiKey}`,
  };
  const bookmarkRes = await fetch(d1Url, {
    method,
    headers,
    body: JSON.stringify({ output_format: "polling" }),
  });
  //console.log(bookmarkRes);  //测试
  const { result: bookmarkResult } = await bookmarkRes.json();
  //console.log(bookmarkResult);  //测试
  if (bookmarkResult && bookmarkResult.at_bookmark) {
    //console.log(bookmarkResult.at_bookmark);  //测试
    const urlRes = await fetch(d1Url, {
      method,
      headers,
      body: JSON.stringify({ current_bookmark: bookmarkResult.at_bookmark }),
    });
    //console.log(urlRes);  //测试
    const { result: urlResult } = await urlRes.json();
    //console.log(urlResult);  //测试
    if (urlResult) {
      //console.log(urlResult.signed_url);  //测试
      return urlResult.signed_url;
    } else {
      //console.log("signed_url错误");
      return "";
    }
  } else {
    //console.log("at_bookmark错误");
    return "";
  }
}

export class WebSocketServer extends DurableObject {
  // webSocket = [];
  ws = null;
  client = null;
  stop = 0;
  apiCount = 0;
  currentStep = 0;
  chatId = 0;
  lastChat = 0;
  reverse = true;
  limit = 20;
  offsetId = 0;
  fromPeer = null;
  messageArray = [];
  dialogArray = [];

  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.env = env;

    // this.ctx.getWebSockets().forEach((ws) => {
    //   const found = this.webSocket.find(element => element === ws);
    //   if (!found) {
    //     this.webSocket.push(ws);
    //     //console.log("(" + this.currentStep + ")添加ws成功");
    //     // this.broadcast({
    //     //   "operate": "constructor",
    //     //   "step": this.currentStep,
    //     //   "message": "添加ws成功",
    //     //   "date": new Date().getTime(),
    //     // });
    //   }
    // });

    // this.ctx.blockConcurrencyWhile(async () => {
    //   this.init();
    //   if (!this.client) {
    //     await this.open();
    //   }
    // });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  init() {
    if (!this.client || !this.stop || this.stop === 0) {
    // if (!this.stop || this.stop === 0) {
      // this.client = null;
      // this.stop = 0;
      // this.webSocket = [];
      this.apiCount = 0;
      this.currentStep = 0;
      this.chatId = 0;
      this.lastChat = 0;
      this.reverse = true;
      this.limit = 20;
      this.offsetId = 0;
      this.fromPeer = null;
      this.messageArray = [];
      this.dialogArray = [];
    }
  }

  broadcast(message) {
    // if (typeof message !== "string") {
    //   message = JSON.stringify(message);
    // }
    this.ctx.getWebSockets().forEach((ws) => {
    // this.webSocket.forEach((ws) => {
      try {
        ws.send(JSON.stringify(message));
      } catch (e) {
        // console.log(e);
        // const index = this.webSocket.findIndex(element => element === ws);
        // if (index > -1) {
        //   this.webSocket.splice(index, 1);
        //   //console.log("(" + this.currentStep + ")删除ws成功");
        //   // this.broadcast({
        //   //   "operate": "broadcast",
        //   //   "step": this.currentStep,
        //   //   "message": "删除ws成功",
        //   //   "date": new Date().getTime(),
        //   // });
        // } else {
        //   //console.log("(" + this.currentStep + ")没找到该ws");
        //   this.broadcast({
        //     "operate": "broadcast",
        //     "step": this.currentStep,
        //     "message": "没找到该ws",
        //     "error": true,
        //     "date": new Date().getTime(),
        //   });
        // }
      }
    });
  }

  async close() {
    if (this.client) {
      await this.client.destroy();
      //console.log("断开服务器成功");
      this.broadcast({
        "operate": "close",
        "message": "断开服务器成功",
        "date": new Date().getTime(),
      });
    }
    this.stop = 0;
    this.ws.close();
    this.ctx.abort("reset");
  }

  async open(tryCount) {
    // const apiId = 1334621;
    // const apiHash = "2bc36173f487ece3052a00068be59e7b";
    // const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7VxdGmdW/SYRusjfTnUHfhQfqLFA+A30Jios20XKnGGsRB58mFR33Lnpz966333yugE0ysMX/XMP8Urbbm3ADQ/mCq/fdQqA/qUoeG9L2Wy0Y8WcOlikGkNJ2e/nO9pT9nl1YePq5DD/hJ8+eKNL4BvUY70GAth/N/fv7dA4joQzwWhHdA8wdOUaxDQhnSAk9H62zG4fX5zipV+g2qp2WCT6CWCwUtsgZs8FZ9g9/TMmyfLagFmnMe7MhlZdkMfgCtKCXI8MVrGaHq5SpPRqMMCR4SkFrwV+9Eo6NyehH7bzWl1zyyAr6wP8j0jtduckdvkUcmyoDOP2M3AkNgd+ZcQ==";
    // const apiId = 8851987;
    // const apiHash = "8c353f36d876aa5b71b671dd221d763c";
    // const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7T4XOMd9S70qaT1RsAFjZNt7R7HVArcpGvSs5k4W9Zwv6ifsWA7UjljXCRPelXOooM/t3FIVZZ1pKg4mZ2NyXYZrl6GFR1On7/RjIJ+BDPZDArthDvQoIil7ZEAFDeuGm6zUkZZ8NeMPUS2rEpI8wmjIDH4m8qD3aj56DK0WuMpsJGoK+liLseKOI3EtmyTAkK/1u8jRkRPuV7egGYU4zH3FSkUSZJPxt67Pb87MJx75sZu2lJkicbUn8tcnwcN1eW6HgRnyjnc5b+7S1tfT+9Lxs+xMhO2J77Q2wwQ6rAgas2qC3g/dWIcdzCw295ar08PHSOxCi2UUCIj0+QojJ1g==";
    const apiId = 25429403;
    const apiHash = "2bb9a1bfd8f598da6cb5c511f0e5fbdf";
    const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7be+PddSzlPTzgS/mbCsxeZYLhE9ohnesT10Ntv+pdypA3wfrAUdXGXBLb2uturgLlkO49XMxAsIoELAdi8OprHkYfeEWZrQPF9RqjucdgWviAVd3oy/JIHk6lbB6NCS06US2CMdLZMxAsLFLu2JTgWiI07Xm2tpCIaaYED9mmH7NiROvqBx+jpB2GoFM4xzqaoB3y43BURo/ZYPEM3uUB4AVsS7IwdK0/j8pJL/ChB3buNnNtyVADe8wFvEAcbMn/385Xz53T21BdYqanzMuZX2O9cv4UNCpA9P6HoEYRn0D9XsljY6xJFNdR/RRKGHBqlVLK/Xt6PagRm321YBAvw==";
    try {
      this.client = await new TelegramClient(new sessions.StringSession(sessionString), apiId, apiHash, {
        connectionRetries: Number.MAX_VALUE,
        autoReconnect: true,
        //downloadRetries: 1,
        //retryDelay: 0,
        //useWSS: false,
        //langCode: "en",
        //systemLangCode: "en",
      })
      await this.client.session.setDC(5, "91.108.56.128", 80);
      await this.client.setLogLevel("error");
      await this.client.connect();
    } catch (e) {
      //console.log("login出错 : " + e);
      this.broadcast({
        "operate": "open",
        "message": "login出错 : " + e,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")open超出tryCount限制");
        this.broadcast({
          "operate": "open",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(30000);
        await this.open(tryCount + 1);
      }
    }
    this.stop = 1;
    //console.log("连接服务器成功");
    this.broadcast({
      "operate": "open",
      "message": "连接服务器成功",
      "date": new Date().getTime(),
    });  //测试
    //console.log(this.client);  //测试
    //await scheduler.wait(5000);
  }

  async getConfig(tryCount) {
    this.apiCount += 1;
    try {
      const configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'pansou' LIMIT 1;").first();
      //console.log("configResult : " + configResult);  //测试
      if (configResult) {
        if (configResult.chatId && configResult.chatId > 0) {
          this.chatId = configResult.chatId;
          this.lastChat = this.chatId;
        }
        if (configResult.reverse) {
          this.reverse = Boolean(configResult.reverse);
        }
        if (configResult.limited && configResult.limited > 0) {
          this.limit = configResult.limited;
        }
      } else {
        //console.log("没有预设config");
        this.broadcast({
          "operate": "getConfig",
          "message": "没有预设config",
          "date": new Date().getTime(),
        });
      }
    } catch (e) {
      //console.log("getConfig出错 : " + e);
      this.broadcast({
        "operate": "getConfig",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")getConfig超出tryCount限制");
        this.broadcast({
          "operate": "getConfig",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.getConfig(tryCount + 1);
      }
    }
  }

  async noExistChat(tryCount) {
    this.apiCount += 1;
    try {
      const chatInfo = await this.env.MAINDB.prepare("UPDATE `PANCHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(chatResult.Cindex).run();
      //console.log(chatInfo);  //测试
      if (chatInfo.success === true) {
        //console.log("更新chat数据成功");
        this.broadcast({
          "operate": "noExistChat",
          "message": "更新chat数据成功",
          "date": new Date().getTime(),
        });
      } else {
        //console.log("更新chat数据失败");
        this.broadcast({
          "operate": "noExistChat",
          "message": "更新chat数据失败",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } catch (e) {
      //console.log("noExistChat出错 : " + e);
      this.broadcast({
        "operate": "noExistChat",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")noExistChat超出tryCount限制");
        this.broadcast({
          "operate": "noExistChat",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.noExistChat(tryCount + 1);
      }
    }
  }

  async checkChat(chatResult, next) {
    const result = await this.client.invoke(new Api.channels.GetChannels({
      id: [new Api.InputChannel({
        channelId: bigInt(chatResult.channelId),
        accessHash: bigInt(chatResult.accessHash),
      })],
    }));
    // console.log(this.fromPeer);  //测试
    if (result && result.chats && result.chats.length > 0) {
      this.chatId = chatResult.Cindex;
      this.fromPeer = result.chats[0];
      if (this.fromPeer) {
        this.offsetId = chatResult.current;
        //console.log("获取fromPeer成功");  //测试
        // this.broadcast({
        //   "operate": "checkChat",
        //   "message": "获取fromPeer成功",
        //   "date": new Date().getTime(),
        // });  //测试
      } else {
        await this.noExistChat(1);
        this.chatId = chatResult.Cindex + 1;
        this.broadcast({
          "operate": "checkChat",
          "message": chatResult.title + " - chat已不存在了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } else {
      this.chatId = chatResult.Cindex + 1;
      this.broadcast({
        "operate": "checkChat",
        "message": chatResult.title + " - chat已不存在了",
        "error": true,
        "date": new Date().getTime(),
      });
      if (next) {
        await this.nextChat();
      }
    }
  }

  async nextChat() {
    while (!this.fromPeer) {
      this.apiCount += 1;
      const chatResult = await this.env.MAINDB.prepare("SELECT * FROM `PANCHAT` WHERE `Cindex` >= ? AND `exist` = 1 LIMIT 1;").bind(this.chatId).first();
      //console.log("chatResult : " + chatResult"]);  //测试
      if (chatResult) {
        await this.checkChat(chatResult, false);
        if (this.fromPeer) {
          break;
        }
      } else {
        //console.log("没有更多chat了");
        this.broadcast({
          "operate": "nextChat",
          "message": "没有更多chat了",
          "date": new Date().getTime(),
        });
        break;
      }
    }
  }

  async getChat() {
    if (this.chatId === 0) {
      this.fromPeer = "me";
      this.apiCount += 1;
      const chatResult = await this.env.MAINDB.prepare("SELECT * FROM `PANCHAT` WHERE `Cindex` = 0 LIMIT 1;").first();
      //console.log("chatResult : " + chatResult"]);  //测试
      if (chatResult) {
        this.offsetId = chatResult.current;
      }
    } else if (this.chatId && this.chatId > 0) {
      await this.nextChat();
    } else {
      this.apiCount += 1;
      const chatResult = await this.env.MAINDB.prepare("SELECT * FROM `PANCHAT` WHERE `current` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
      //console.log("chatResult : " + chatResult"]);  //测试
      if (chatResult) {
        await this.checkChat(chatResult, true);
      } else {
        //console.log("没有更多chat了");
        this.broadcast({
          "operate": "getChat",
          "message": "没有更多chat了",
          "date": new Date().getTime(),
        });
      }
    }
  }

  async updateConfig(tryCount) {
    this.apiCount += 1;
    try {
      const chatInfo = await this.env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `name` = 'pansou';").bind(this.chatId).run();
      //console.log(chatInfo);  //测试
      if (chatInfo.success === true) {
        //console.log("更新config数据成功");
        this.broadcast({
          "operate": "updateConfig",
          "message": "更新config数据成功",
          "date": new Date().getTime(),
        });
      } else {
        //console.log("更新config数据失败");
        this.broadcast({
          "operate": "updateConfig",
          "message": "更新config数据失败",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } catch (e) {
      //console.log("updateConfig出错 : " + e);
      this.broadcast({
        "operate": "updateConfig",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")updateConfig超出tryCount限制");
        this.broadcast({
          "operate": "updateConfig",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.updateConfig(tryCount + 1);
      }
    }
  }

  async getMessage(tryCount) {
    try {
      for await (const message of this.client.iterMessages(
        this.fromPeer,
        //"me",  //测试
        {
          limit: this.limit,
          //limit: 20,  //测试
          reverse: this.reverse,
          //reverse: false,  //测试
          addOffset: -this.offsetId,
          //addOffset: 0,  //测试
          waitTime: 60,
        })
      ) {
        // if (message.message) {
        //   this.messageArray.push(message);
        // }
        this.messageArray.push(message);
      }
    } catch (e) {
      this.messageArray = [];
      //console.log("(" + this.currentStep + ")查询消息出错 : " + e);
      this.broadcast({
        "operate": "getMessage",
        "step": this.currentStep,
        "message": "查询消息出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")getMessage超出tryCount限制");
        this.broadcast({
          "operate": "getMessage",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.getMessage(tryCount + 1);
      }
    }
  }

  async selectMessage(tryCount, messageId) {
    this.apiCount += 1;
    try {
      const messageResult = await this.env.MAINDB.prepare("SELECT COUNT(id) FROM `PANMESSAGE` WHERE `chatId` = ? AND  `id` = ? LIMIT 1;").bind(this.chatId, messageId).first();
      //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
      if (messageResult) {
        return messageResult["COUNT(id)"];
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectMessage出错 : " + e);
      this.broadcast({
        "offsetId": this.offsetId,
        "operate": "selectMessage",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")selectMessage超出tryCount限制");
        this.broadcast({
          "operate": "selectMessage",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.selectMessage(tryCount + 1, messageId);
      }
    }
  }

  async insertMessage(tryCount, messageId, txt, id, url) {
    this.apiCount += 1;
    try {
      const messageInfo = await this.env.MAINDB.prepare("INSERT INTO `PANMESSAGE` (chatId, id, txt, webpage, url) VALUES (?, ?, ?, ?, ?);").bind(this.chatId, messageId, txt, id, url).run();
      //console.log(messageInfo);  //测试
      if (messageInfo.success === true) {
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入message数据成功");
        this.broadcast({
          "offsetId": this.offsetId,
          "operate": "insertMessage",
          "status": "success",
          "date": new Date().getTime(),
        });
      } else {
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入message数据失败");
        this.broadcast({
          "offsetId": this.offsetId,
          "operate": "insertMessage",
          "message": "插入message数据失败",
          "error": true,
          "status": "error",
          "date": new Date().getTime()
        });
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertMessage出错 : " + e);;
      this.broadcast({
        "offsetId": this.offsetId,
        "operate": "insertMessage",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")insertMessage超出tryCount限制");
        this.broadcast({
          "operate": "insertMessage",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.insertMessage(tryCount + 1, messageId, txt, id, url);
      }
    }
  }

  async updateChat(tryCount) {
    this.apiCount += 1;
    try {
      const chatInfo = await this.env.MAINDB.prepare("UPDATE `PANCHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      //console.log(chatInfo);  //测试
      if (chatInfo.success === true) {
        //console.log("(" + this.currentStep + ")更新chat数据成功");
        this.broadcast({
          "operate": "updateChat",
          "step": this.currentStep,
          "message": "更新chat数据成功",
          "date": new Date().getTime(),
        });
      } else {
        //console.log("(" + this.currentStep + ")更新chat数据失败");
        this.broadcast({
          "operate": "updateChat",
          "step": this.currentStep,
          "message": "更新chat数据失败",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")updateChat出错 : " + e);
      this.broadcast({
        "operate": "updateChat",
        "step": this.currentStep,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")updateChat超出tryCount限制");
        this.broadcast({
          "operate": "updateChat",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.updateChat(tryCount + 1);
      }
    }
  }

  async nextMessage(messageLength, messageIndex, message) {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        if (message) {
          const messageId = message.id;
          const txt = message.message;
          this.broadcast({
            "offsetId": this.offsetId,
            "operate": "nextMessage",
            "step": this.currentStep,
            // "messageLength": messageLength,
            // "messageIndex": messageIndex,
            "messageId": messageId,
            "status": "add",
            "date": new Date().getTime(),
          });
          if (txt) {
            const messageCount = await this.selectMessage(1, messageId);
            if (parseInt(messageCount) === 0) {
              let webpage = "";
              let url = "";
              if (message.media) {
                if (message.media.webpage) {
                  this.broadcast({
                    "offsetId": this.offsetId,
                    "operate": "nextMessage",
                    "status": "webpage",
                    "date": new Date().getTime(),
                  });
                  if (message.media.webpage.id) {
                    webpage = message.media.webpage.id.toString();
                  }
                  if (message.media.webpage.url) {
                    url = message.media.webpage.url;
                  }
                }
              }
              await this.insertMessage(1, messageId, txt, webpage, url);
            } else {
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : message已在数据库中");
              this.broadcast({
                "offsetId": this.offsetId,
                "operate": "nextMessage",
                "status": "exist",
                "date": new Date().getTime(),
              });
            }
            this.offsetId += 1;
          } else {
            //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 错误的消息");
            this.broadcast({
              "offsetId": this.offsetId,
              "operate": "nextMessage",
              "message": "txt为空",
              "error": true,
              "status": "error",
              "date": new Date().getTime(),
            });
            this.offsetId += 1;
          }
        } else {
          //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 错误的消息");
          this.broadcast({
            "offsetId": this.offsetId,
            "operate": "nextMessage",
            "message": "错误的消息",
            "error": true,
            "status": "error",
            "date": new Date().getTime(),
          });
          this.offsetId += 1;
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")nextMessage超出apiCount限制");
        this.broadcast({
          "offsetId": this.offsetId,
          "operate": "nextMessage",
          "message": "超出apiCount限制",
          "error": true,
          "status": "limit",
          "date": new Date().getTime(),
        });
        await this.updateChat(1);
        await this.close();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async nextStep() {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        await this.updateChat(1);
        this.currentStep += 1;
        await scheduler.wait(3000);
        await this.getMessage(1);
        const messageArray = this.messageArray;
        const messageLength = messageArray.length;
        this.messageArray = [];
        if (messageLength && messageLength > 0) {
          //console.log("(" + this.currentStep + ")messageLength : " + messageLength);
          this.broadcast({
            "operate": "nextStep",
            "step": this.currentStep,
            "message": "messageLength : " + messageLength,
            "date": new Date().getTime(),
          });
          if (this.stop === 1) {
            for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
              await this.nextMessage(messageLength, messageIndex + 1, messageArray[messageIndex]);
              // this.offsetId += 1;
            }
            if (this.stop === 1) {
              if (this.apiCount < 900) {
                await this.nextStep();
            } else {
              this.stop = 2;
              //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
              this.broadcast({
                "operate": "nextStep",
                "step": this.currentStep,
                "message": "超出apiCount限制",
                "error": true,
                "date": new Date().getTime(),
              });
              await this.updateChat(1);
              await this.close();
              // this.ctx.abort("reset");
            }
            } else if (this.stop === 2) {
              this.broadcast({
                "result": "pause",
              });
              await this.close();
            }
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        } else {
          await this.updateChat(1);
          this.fromPeer = null;
          this.chatId += 1;
          await this.getChat();
          if (this.fromPeer) {
            this.offsetId = 0;
            if (this.chatId != this.lastChat) {
              if (this.lastChat != 0) {
                await this.updateConfig();
              }
              this.lastChat = this.chatId;
            }
            if (this.stop === 1) {
              await this.nextStep();
            } else if (this.stop === 2) {
              this.broadcast({
                "result": "pause",
              });
              await this.close();
            }
          } else {
            //console.log("(" + this.currentStep + ")全部chat采集完毕");
            this.broadcast({
              "result": "over",
              "operate": "nextStep",
              "step": this.currentStep,
              "message": "全部chat采集完毕",
              "date": new Date().getTime(),
            });
            await this.close();
          }
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
        this.broadcast({
          "operate": "nextStep",
          "step": this.currentStep,
          "message": "超出apiCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.updateChat(1);
        await this.close();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async fetch(request) {
    const webSocketPair = new WebSocketPair();
    const [wsClient, wsServer] = Object.values(webSocketPair);
    this.ctx.acceptWebSocket(wsServer);
    // wsServer.send("chat success");  //测试
    this.ws = wsServer;
    return new Response(null, {
      status: 101,
      webSocket: wsClient,
    });
  }

  async start() {
    if (this.client || this.stop === 1) {
    // if (this.stop === 1) {
      this.broadcast({
        "operate": "start",
        "message": "服务已经运行过了",
        "error": true,
        "date": new Date().getTime(),
      });
      return;
    }
    this.init();
    // this.stop = 1;
    await this.open(1);
    await this.getConfig(1);
    await this.getChat();
    if (this.fromPeer) {
      if (this.chatId != this.lastChat) {
        if (this.lastChat != 0) {
          await this.updateConfig();
        }
        this.lastChat = this.chatId;
      }
      if (this.stop === 1) {
        this.currentStep += 1;
        await this.getMessage(1);
        const messageArray = this.messageArray;
        const messageLength = messageArray.length;
        this.messageArray = [];
        this.broadcast({
          "operate": "start",
          "message": "messageLength : " + messageLength,
          "date": new Date().getTime(),
        });  //测试
        if (messageLength && messageLength > 0) {
          for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
            await this.nextMessage(messageLength, messageIndex + 1, messageArray[messageIndex]);
            // this.offsetId += 1;
          }
          if (this.stop === 1) {
            if (this.apiCount < 900) {
              await this.nextStep();
            } else {
              this.stop = 2;
              //console.log("(" + this.currentStep + ")start超出apiCount限制");
              this.broadcast({
                "operate": "start",
                "step": this.currentStep,
                "message": "超出apiCount限制",
                "error": true,
                "date": new Date().getTime(),
              });
              await this.updateChat(1);
              await this.close();
              // this.ctx.abort("reset");
            }
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        }
      } else if (this.stop === 2) {
        this.broadcast({
          "result": "pause",
        });
        await this.close();
      }
    } else {
      //console.log("全部chat采集完毕");
      this.broadcast({
        "result": "over",
        "operate": "start",
        "message": "全部chat采集完毕",
        "date": new Date().getTime(),
      });
      await this.close();
    }
  }

  async getDialog(tryCount) {
    try {
      for await (const dialog of this.client.iterDialogs({})) {
        this.dialogArray.push(dialog);
      }
    } catch (e) {
      this.dialogArray = [];
      //console.log("(" + this.currentStep + ")查询dialog出错 : " + e);
      this.broadcast({
        "operate": "getDialog",
        "message": "查询dialog出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")getDialog超出tryCount限制");
        this.broadcast({
          "operate": "getDialog",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.getDialog(tryCount + 1);
      }
    }
  }

  async chat() {
    // if (this.client || this.stop === 1) {
    // // if (this.stop === 1) {
    //   this.broadcast({
    //     "operate": "chat",
    //     "message": "服务已经运行过了",
    //     "error": true,
    //     "date": new Date().getTime(),
    //   });
    //   return;
    // }
    // this.stop = 1;
    if (!this.client) {
      await this.open(1);
    }
    let count = 0;
    await this.getDialog(1);
    const dialogArray = this.dialogArray;
    // const dialogLength = dialogArray.length;
    this.dialogArray = [];
    // for (let dialogIndex = 0; dialogIndex < dialogLength; dialogIndex++) {
    for await (const dialog of dialogArray) {
      // this.broadcast({
      //   "operate": JSON.stringify(dialog),
      //   "message": JSON.stringify(dialog.inputEntity),
      //   "date": new Date().getTime(),
      // });  //测试
      // break;  //测试
      let channelId = "";
      let accessHash = "";
      const isChannel = dialog.isChannel;
      // console.log("isChannel : " + isChannel);  //测试
      if (isChannel === true) {
        channelId = dialog.inputEntity.channelId.toString();
        accessHash = dialog.inputEntity.accessHash.toString();
      } else {
        channelId = dialog.id.toString();
      }
      //console.log("channelId : " + channelId);  //测试
      //console.log("accessHash : " + accessHash);  //测试
      //console.log(channelId + " : " + accessHash);  //测试
      //console.log(dialog);  //测试
      // this.broadcast({
      //   "operate": channelId + " - " + accessHash,
      //   "message": JSON.stringify(dialog),
      //   "date": new Date().getTime(),
      // });  //测试
      if (channelId) {
        const chatResult = await this.env.MAINDB.prepare("SELECT COUNT(Cindex) FROM `PANCHAT` WHERE `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(channelId, accessHash).first();
        //console.log("chatResult : " + chatResult["COUNT(id)"]);  //测试
        if (chatResult && chatResult["COUNT(Cindex)"] === 0) {
          const chatInfo = await this.env.MAINDB.prepare("INSERT INTO `PANCHAT` (channelId, accessHash, title, current, exist) VALUES (?, ?, ?, ?, ?);").bind(channelId, accessHash, dialog.title, 0, 1).run();
          //console.log(chatInfo);  //测试
          if (chatInfo.success === true) {
            count += 1;
            //console.log("插入chat数据成功");
            this.broadcast({
              "operate": "chat",
              "message": "插入chat数据成功",
              "date": new Date().getTime(),
            });
          } else {
            //console.log("插入chat数据失败");
            this.broadcast({
              "operate": "chat",
              "message": "插入chat数据失败",
              "error": true,
              "date": new Date().getTime(),
            });
          }
        // } else {
        //   //console.log("chat已在数据库中");
        //   this.broadcast({
        //     "operate": "chat",
        //     "message": "chat已在数据库中",
        //     "date": new Date().getTime(),
        //   });
        }
      } else {
        //console.log("chat的channelId错误");
        this.broadcast({
          "operate": "chat",
          "message": "chat的channelId错误",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
    //console.log("新插入了" + count + "条数据");
    this.broadcast({
      "operate": "chat",
      "message": "新插入了" + count + "条数据",
      "date": new Date().getTime(),
    });
    await this.close();
  }

  async webSocketMessage(ws, message) {
    //console.log(message);  //测试
    if (message === "start") {
      await this.start();
    } else if (message === "pause") {
      this.stop = 2;
    } else if (message === "chat") {
      await this.chat();
    } else if (message === "backup") {
      const signed_url = await exportDB();
      if (signed_url) {
        ws.send(signed_url);
      } else {
        ws.send("获取signed_url失败");
      }
    } else {
      this.broadcast({
        "operate": "chat",
        "message": "未知消息",
        "error": true,
        "date": new Date().getTime(),
      });
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    // if (this.stop === 1) {
    //   await this.updateChat(1);
    // }
    // this.stop = 0;
    ws.close(code, "Durable Object is closing WebSocket");
  }
}

export default {
  async fetch(request, env, ctx) {
    // const { pathname } = new URL(request.url);
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Worker expected Upgrade: websocket", {
          status: 426,
        });
      }
      const id = env.WEBSOCKET_SERVER.idFromName("tg");
      const stub = env.WEBSOCKET_SERVER.get(id);
      return stub.fetch(request);
    } else if (pathname === "/count") {
      const messageResult = await countMessage(env);
      if (messageResult >= 0) {
        return new Response(messageResult);
      } else {
        return new Response("获取message总数失败");
      }
    } else if (pathname === "/backup") {
      const id = url.searchParams.get('id');
      if (id && id >= 0) {
        const name = getDB(id);
        if (name) {
          const signed_url = await exportDB(name);
          if (signed_url) {
            return new Response(signed_url);
          } else {
            return new Response("获取signed_url失败");
          }
        } else {
          return new Response("获取db失败");
        }
      } else {
        return new Response("要备份的数据库id不能为空");
      }
    }

    return new Response("error");
  },
};
