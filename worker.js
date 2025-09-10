import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions, utils } from "./gramjs";

async function countMedia(env) {
  const mediaResult = await env.MEDIADB.prepare("SELECT COUNT(Vindex) FROM `MEDIA` WHERE 1 = 1;").first();
  //console.log("mediaResult : " + mediaResult["COUNT(Vindex)"]);  //测试
  if (mediaResult && mediaResult["COUNT(Vindex)"]) {
    return mediaResult["COUNT(Vindex)"];
  }
  return -1;
}

async function clearCache(env) {
  const cacheResult = await env.MAINDB.prepare("DELETE FROM `CACHE` WHERE 1 = 1;").run();
  //console.log(cacheResult);  //测试
  return cacheResult.success;
}

async function exportDB() {
  const accountId = "ac4c475ca3875ec3dea2d2306fde9c69";
  const databaseId = "97d41e14-a9b6-45a9-b5cc-f60eb29acc02";   //main
  //const databaseId = "619bf710-136f-4b05-b7a7-ce7ffef02990";   //media1
  //const databaseId = "aab5c1c2-2533-4be0-9993-bd62f306ebcc";  //media2
  //const databaseId = "72893c57-6b53-4f79-a730-217f80da6492";  //media3
  //const databaseId = "c84b9365-6811-437f-87ee-15a09bf3be56";  //media4
  //const databaseId = "1893770b-972c-4ad2-972d-888e305fd0b8";  //media5
  //const databaseId = "532d0baf-ba9c-42c2-80a3-940cbfccf8d3";  //media6
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
  ws;
  client;
  stop;
  currentStep;
  chatId;
  lastChat;
  filterType;
  reverse;
  limit;
  offsetId;
  error;
  fromPeer;
  messageArray;
  messageLength;
  messageIndex;
  hashResult;
  //cacheHashResult;
  filter;
  //filterTitle;

  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.env = env;

    // this.ctx.blockConcurrencyWhile(async () => {
      // this.ws.send(JSON.stringify({
      //   "operate": "blockConcurrencyWhile",
      //   "message": "blockConcurrencyWhile",
      //   "date": new Date().getTime(),
      // }));  //测试
    //   this.init();
    //   if (!this.client) {
    //     await this.open();
    //   }
    // });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async init() {
    this.ws.send(JSON.stringify({
      "operate": "init",
      "message": "init",
      "date": new Date().getTime(),
    }));  //测试
    if (!this.client || !this.stop || this.stop === 0) {
    // if (!this.stop || this.stop === 0) {
      // this.client = null;
      // this.stop = 0;
      this.currentStep = 0;
      this.chatId = 0;
      this.lastChat = 0;
      this.filterType = 0;
      this.reverse = true;
      this.limit = 10;
      this.offsetId = 0;
      this.error = false;
      this.fromPeer = null;
      this.messageArray = [];
      this.messageLength = 0;
      this.messageIndex = 0;
      this.hashResult = {
        "hash": [],
        "offset": 0,
        "index": 0,
        "limit": 0,
      };
      //this.cacheHashResult = null;
      //filter = Api.InputMessagesFilterPhotoVideo;
      filter = Api.InputMessagesFilterVideo;  //测试
      //filter = Api.InputMessagesFilterPhotos;  //测试
      //filterTitle = "媒体";
    }
  }

  async open() {
    // this.ws.send(JSON.stringify({
    //   "operate": "open",
    //   "message": "open",
    //   "date": new Date().getTime(),
    // }));  //测试
    // const apiId = 1334621;
    // const apiHash = "2bc36173f487ece3052a00068be59e7b";
    // const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7VxdGmdW/SYRusjfTnUHfhQfqLFA+A30Jios20XKnGGsRB58mFR33Lnpz966333yugE0ysMX/XMP8Urbbm3ADQ/mCq/fdQqA/qUoeG9L2Wy0Y8WcOlikGkNJ2e/nO9pT9nl1YePq5DD/hJ8+eKNL4BvUY70GAth/N/fv7dA4joQzwWhHdA8wdOUaxDQhnSAk9H62zG4fX5zipV+g2qp2WCT6CWCwUtsgZs8FZ9g9/TMmyfLagFmnMe7MhlZdkMfgCtKCXI8MVrGaHq5SpPRqMMCR4SkFrwV+9Eo6NyehH7bzWl1zyyAr6wP8j0jtduckdvkUcmyoDOP2M3AkNgd+ZcQ==";
    const apiId = 8851987;
    const apiHash = "8c353f36d876aa5b71b671dd221d763c";
    const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7T4XOMd9S70qaT1RsAFjZNt7R7HVArcpGvSs5k4W9Zwv6ifsWA7UjljXCRPelXOooM/t3FIVZZ1pKg4mZ2NyXYZrl6GFR1On7/RjIJ+BDPZDArthDvQoIil7ZEAFDeuGm6zUkZZ8NeMPUS2rEpI8wmjIDH4m8qD3aj56DK0WuMpsJGoK+liLseKOI3EtmyTAkK/1u8jRkRPuV7egGYU4zH3FSkUSZJPxt67Pb87MJx75sZu2lJkicbUn8tcnwcN1eW6HgRnyjnc5b+7S1tfT+9Lxs+xMhO2J77Q2wwQ6rAgas2qC3g/dWIcdzCw295ar08PHSOxCi2UUCIj0+QojJ1g==";
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
      this.ws.send(JSON.stringify({
        "operate": "open",
        "message": "login出错 : " + e,
        "date": new Date().getTime(),
      }));
      await scheduler.wait(30000);
      await this.open();
    }
    this.stop = 1;
    //console.log("连接服务器成功");
    this.ws.send(JSON.stringify({
      "operate": "open",
      "message": "连接服务器成功",
      "date": new Date().getTime(),
    }));  //测试
    //console.log(this.client);  //测试
    //await scheduler.wait(5000);
  }

  async getConfig() {
    this.ws.send(JSON.stringify({
      "operate": "getConfig",
      "message": "getConfig",
      "date": new Date().getTime(),
    }));  //测试
    try {
      const configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'collect' LIMIT 1;").first();
      //console.log("configResult : " + configResult);  //测试
      if (configResult) {
        if (configResult.chatId && configResult.chatId > 0) {
          this.chatId = configResult.chatId;
          this.lastChat = this.chatId;
        }
        if (configResult.filterType && configResult.filterType > 0 && configResult.filterType <= 9) {
          this.filterType = configResult.filterType;
        }
        if (configResult.reverse) {
          this.reverse = Boolean(configResult.reverse);
        }
        if (configResult.limited && configResult.limited > 0) {
          this.limit = configResult.limited;
        }
      } else {
        //console.log("没有预设config");
        this.ws.send(JSON.stringify({
          "operate": "getConfig",
          "message": "没有预设config",
          "date": new Date().getTime(),
        }));
      }
    } catch (e) {
      //console.log("getConfig出错 : " + e);
      this.ws.send(JSON.stringify({
        "operate": "getConfig",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.getConfig();
    }
  }

  // async switchType() {
  //   switch (this.filterType) {
  //     case 0:
  //       this.filter = Api.InputMessagesFilterPhotoVideo;
  //       break;
  //     case 1:
  //       //this.filterTitle = "图片";
  //       this.filter = Api.InputMessagesFilterPhotos;
  //       break;
  //     case 2:
  //       //this.filterTitle = "视频";
  //       this.filter = Api.InputMessagesFilterVideo;
  //       break;
  //     case 3:
  //       //this.filterTitle = "文档";
  //       this.filter = Api.InputMessagesFilterDocument;
  //       break;
  //     case 4:
  //       //this.filterTitle = "动图";
  //       this.filter = Api.InputMessagesFilterGif;
  //       break;
  //     case 5:
  //       this.filter = Api.InputMessagesFilterVoice;
  //       break;
  //     case 6:
  //       this.filter = Api.InputMessagesFilterMusic;
  //       break;
  //     case 7:
  //       this.filter = Api.InputMessagesFilterChatPhotos;
  //       break;
  //     case 8:
  //       this.filter = Api.InputMessagesFilterRoundVoice;
  //       break;
  //     case 9:
  //       this.filter = Api.InputMessagesFilterRoundVideo;
  //       break;
  //     default:
  //       this.filter = Api.InputMessagesFilterPhotoVideo;
  //   }
  // }

  async close() {
    if (this.client) {
      await this.client.destroy();
      this.stop = 0;
      //console.log("断开服务器成功");
      this.ws.send(JSON.stringify({
        "operate": "close",
        "message": "断开服务器成功",
        "date": new Date().getTime(),
      }));
      this.ws.close();
      //await scheduler.wait(1000);
    }
  }

  async getChat() {
    this.ws.send(JSON.stringify({
      "operate": "getChat",
      "message": "getChat",
      "date": new Date().getTime(),
    }));  //测试
    // this.ws.send(JSON.stringify({
    //   "operate": "getChat",
    //   "message": "getChat",
    //   "date": new Date().getTime(),
    // }));  //测试
    if (this.chatId === 0) {
      this.fromPeer = "me";
      const chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `Cindex` = 0 LIMIT 1;").first();
      //console.log("chatResult : " + chatResult"]);  //测试
      if (chatResult) {
        if (this.filterType === 0) {
          this.offsetId = chatResult.current;
        } else if (this.filterType === 1) {
          this.offsetId = chatResult.photo;
        } else if (this.filterType === 2) {
          this.offsetId = chatResult.video;
        } else if (this.filterType === 3) {
          this.offsetId = chatResult.document;
        } else if (this.filterType === 4) {
          this.offsetId = chatResult.gif;
        }
      }
    } else if (this.chatId && this.chatId > 0) {
      while (!this.fromPeer) {
        const chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `Cindex` >= ? AND `exist` = 1 LIMIT 1;").bind(this.chatId).first();
        //console.log("chatResult : " + chatResult"]);  //测试
        if (chatResult) {
          for await (const dialog of this.client.iterDialogs({})) {
            //console.log(dialog);  //测试
            if (dialog.id.toString() === chatResult.channelId) {
              this.fromPeer = dialog;
              //console.log(this.fromPeer);  //测试
              if (this.filterType === 0) {
                this.offsetId = chatResult.current;
              } else if (this.filterType === 1) {
                this.offsetId = chatResult.photo;
              } else if (this.filterType === 2) {
                this.offsetId = chatResult.video;
              } else if (this.filterType === 3) {
                this.offsetId = chatResult.document;
              } else if (this.filterType === 4) {
                this.offsetId = chatResult.gif;
              }
              console.log("获取fromPeer完毕");
              break;
            }
          }
          if (!this.fromPeer) {
            const chatInfo = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(chatResult.Cindex).run();
            //console.log(chatInfo);  //测试
            if (chatInfo.success === true) {
              console.log("更新chat数据成功");
            } else {
              console.log("更新chat数据失败");
            }
            this.chatId = chatResult.Cindex + 1;
          }
        } else {
          console.log("没有chat了");
          break;
        }
      }
    } else {
      let chatResult = {};
      if (this.filterType === 0) {
        chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `current` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
      } else if (this.filterType === 1) {
        chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `photo` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
      } else if (this.filterType === 2) {
        chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `video` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
      } else if (this.filterType === 3) {
        chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `document` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
      } else if (this.filterType === 4) {
        chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `gif` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
      }
      //console.log("chatResult : " + chatResult"]);  //测试
      if (chatResult) {
        for await (const dialog of this.client.iterDialogs({})) {
          //console.log(dialog);  //测试
          //if (dialog.id.toString() === chatResult.channelId) {
          if (dialog.id === chatResult.channelId) {
            this.fromPeer = dialog;
            //console.log(this.fromPeer);  //测试
            if (this.filterType === 0) {
              this.offsetId = chatResult.current;
            } else if (this.filterType === 1) {
              this.offsetId = chatResult.photo;
            } else if (this.filterType === 2) {
              this.offsetId = chatResult.video;
            } else if (this.filterType === 3) {
              this.offsetId = chatResult.document;
            } else if (this.filterType === 4) {
              this.offsetId = chatResult.gif;
            }
            console.log("获取fromPeer完毕");
            break;
          }
        }
      } else {
        console.log("没有chat了");
      }
    }
  }

  async updateConfig() {
    try {
      const chatInfo = await this.env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `name` = 'collect';").bind(this.chatId).run();
      //console.log(chatInfo);  //测试
      if (chatInfo.success === true) {
        //console.log("更新config数据成功");
        this.ws.send(JSON.stringify({
          "operate": "updateConfig",
          "message": "更新config数据成功",
          "date": new Date().getTime(),
        }));
      } else {
        //console.log("更新config数据失败");
        this.ws.send(JSON.stringify({
          "operate": "updateConfig",
          "message": "更新config数据失败",
          "error": true,
          "date": new Date().getTime(),
        }));
      }
    } catch (e) {
      //console.log("updateConfig出错 : " + e);
      this.ws.send(JSON.stringify({
        "operate": "updateConfig",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.updateConfig();
    }
  }

  async getMessage() {
    try {
      let count = 0;
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
          filter: this.filter,
          //filter: Api.InputMessagesFilterVideo,  //测试
          waitTime: 60,
        })
      ) {
        count += 1;
        if (message.media) {
          if (message.media.document) {
            this.messageArray.push(message);
          } else if (message.media.photo) {
            this.messageArray.push(message);
          }
        }
      }
      return count;
    } catch (e) {
      this.messageArray = [];
      //console.log("(" + this.currentStep + ")查询消息出错 : " + e);
      this.ws.send(JSON.stringify({
        "operate": "getMessage",
        "step": this.currentStep,
        "message": "查询消息出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.getMessage();
    }
  }

  async selectMediaIndex() {
    try {
      const mediaResult = await this.env.MAINDB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIAINDEX` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(this.hashResult.id, this.hashResult.accessHash).first();
      //console.log(mediaResult);  //测试
      return mediaResult;
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : selectMediaIndex出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "selectMediaIndex",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.selectMediaIndex();
    }
  }

  async selectMedia() {
    try {
      const mediaResult = await this.env.MEDIADB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIA` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(this.hashResult.id, this.hashResult.accessHash).first();
      //console.log(mediaResult);  //测试
      return mediaResult;
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : selectMedia出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "selectMedia",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.selectMedia();
    }
  }

  async getHash() {
    if (this.stop === 1) {
      try {
        const results = await this.client.invokeWithSender(
          new Api.upload.GetFileHashes({
            location: this.hashResult.location,
            offset: this.hashResult.offset,
          }),
          this.hashResult.sender
        );
        return results;
      } catch (e) {
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "getHash",
          "index": this.hashResult.index,
          "message": JSON.stringify(e),
          "error": true,
          "status": "try",
          "date": new Date().getTime(),
        }));
        if (this.hashResult.index === 1) {
          this.error = true;
          //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 查询首个hash出错 : " + e);
          await scheduler.wait(5000);
        } else {
          //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 查询hash出错");
          await scheduler.wait(10000);
          await this.getHash();
        }
      }
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "pause",
      }));
      await this.close();
    }
  }

  async updateChat() {
    try {
      let chatInfo = {};
      if (this.filterType === 0) {
        chatInfo = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 1) {
        chatInfo = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `photo` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 2) {
        chatInfo = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `video` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 3) {
        chatInfo = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `document` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 4) {
        chatInfo = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `gif` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      }
      //console.log(chatInfo);  //测试
      if (chatInfo.success === true) {
        //console.log("(" + this.currentStep + ")更新chat数据成功");
        this.ws.send(JSON.stringify({
          "operate": "updateChat",
          "step": this.currentStep,
          "message": "更新chat数据成功",
          "date": new Date().getTime(),
        }));
      } else {
        //console.log("(" + this.currentStep + ")更新chat数据失败");
        this.ws.send(JSON.stringify({
          "operate": "updateChat",
          "step": this.currentStep,
          "message": "更新chat数据失败",
          "error": true,
          "date": new Date().getTime(),
        }));
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")updateChat出错 : " + e);
      this.ws.send(JSON.stringify({
        "operate": "updateChat",
        "step": this.currentStep,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.updateChat();
    }
  }

  async insertCache() {
    if (this.hashResult && this.hashResult.category === 2 && this.hashResult.hash && this.hashResult.hash.length && this.hashResult.hash.length > 0) {
      const location = this.hashResult.location;
      const sender = this.hashResult.sender;
      try {
        this.hashResult.limit = 0;
        delete this.hashResult.location;
        delete this.hashResult.sender;
        //const cacheInfo = await this.env.MAINDB.prepare("INSERT INTO `CACHE` (chatId, id, accessHash, hash) VALUES (?, ?, ?, ?);").bind(this.chatId, this.hashResult.id, this.hashResult.accessHash, JSON.stringify(this.hashResult)).run();
        //console.log(cacheInfo);  //测试
        await this.ctx.storage.put(this.hashResult.id + "|" + this.hashResult.accessHash, JSON.stringify(this.hashResult));
        this.hashResult.location = location;
        this.hashResult.sender = sender;
        // if (cacheInfo.success === true) {
        //   //console.log("(" + this.currentStep + ")插入cache("+ this.hashResult.length + " | " + this.hashResult.index + ")数据成功");
          this.ws.send(JSON.stringify({
            "operate": "insertCache",
            "step": this.currentStep,
            "message": "插入cache("+ this.hashResult.length + " | " + this.hashResult.index + ")数据成功",
            "date": new Date().getTime(),
          }));
        // } else {
        //   //console.log("(" + this.currentStep + ")插入cache("+ this.hashResult.length + " | " + this.hashResult.index + ")数据失败");
        //   this.ws.send(JSON.stringify({
        //     "operate": "insertCache",
        //     "step": this.currentStep,
        //     "message": "插入cache("+ this.hashResult.length + " | " + this.hashResult.index + ")数据失败",
        //     "error": true,
        //     "date": new Date().getTime(),
        //   }));
        // }
      } catch (e) {
        if (!this.hashResult.location && location) {
          this.hashResult.location = location;
        }
        if (!this.hashResult.sender && sender) {
          this.hashResult.sender = sender;
        }
        //console.log("(" + this.currentStep + ")insertCache("+ this.hashResult.length + " | " + this.hashResult.index + ")出错 : " + e);
        this.ws.send(JSON.stringify({
          "operate": "insertCache",
          "step": this.currentStep,
          "message": "("+ this.hashResult.length + " | " + this.hashResult.index + ")出错 : " + e,
          "error": true,
          "date": new Date().getTime(),
        }));
        await scheduler.wait(10000);
        await this.insertCache();
      }
    } else {
      //console.log("(" + this.currentStep + ")cache("+ this.hashResult.length + " | " + this.hashResult.index + ")数据错误");
      this.ws.send(JSON.stringify({
        "operate": "insertCache",
        "step": this.currentStep,
        "message": "cache("+ this.hashResult.length + " | " + this.hashResult.index + ")数据错误",
        "error": true,
        "date": new Date().getTime(),
      }));
    }
  }

  // async updateCache() {
  //   try {
  //     delete this.hashResult.location;
  //     delete this.hashResult.sender;
  //     const cacheInfo = await this.env.MAINDB.prepare("UPDATE `CACHE` SET `hash` = ? WHERE `id` = ? AND `accessHash` = ?;").bind(JSON.stringify(this.hashResult), this.hashResult.id, this.hashResult.accessHash).run();
  //     //console.log(cacheInfo);  //测试
  //     if (cacheInfo.success === true) {
  //       //console.log("(" + this.currentStep + ")更新cache数据成功");
  //       this.ws.send(JSON.stringify({
  //         "operate": "updateCache",
  //         "step": this.currentStep,
  //         "message": "更新cache数据成功",
  //         "date": new Date().getTime(),
  //       }));
  //     } else {
  //       //console.log("(" + this.currentStep + ")更新cache数据失败");
  //       this.ws.send(JSON.stringify({
  //         "operate": "updateCache",
  //         "step": this.currentStep,
  //         "message": "更新cache数据失败",
  //         "error": true,
  //         "date": new Date().getTime(),
  //       }));
  //     }
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ")updateCache出错 : " + e);
  //     this.ws.send(JSON.stringify({
  //       "operate": "updateCache",
  //       "step": this.currentStep,
  //       "message": "出错 : " + e,
  //       "error": true,
  //       "date": new Date().getTime(),
  //     }));
  //     await scheduler.wait(10000);
  //     await this.updateCache();
  //   }
  // }

  // async selectCache() {
  //   try {
  //     const cacheResult = await this.env.MAINDB.prepare("SELECT COUNT(id) FROM `CACHE` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(this.hashResult.id, this.hashResult.accessHash).first();
  //     //console.log("cacheResult : " + cacheResult["COUNT(id)"]);  //测试
  //     if (cacheResult) {
  //       return cacheResult["COUNT(id)"];
  //     }
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ")selectCache出错 : " + e);
  //     this.ws.send(JSON.stringify({
  //       "operate": "selectCache",
  //       "step": this.currentStep,
  //       "message": "出错 : " + e,
  //       "error": true,
  //       "date": new Date().getTime(),
  //     }));
  //     await scheduler.wait(10000);
  //     await selectCache();
  //   }
  // }

  // async endCache() {
  //   const cacheCount = await selectCache();
  //   if (parseInt(cacheCount) === 0) {
  //     await this.insertCache();
  //   } else {
  //     await this.updateCache();
  //   }
  // }

  async nextHash() {
    if (this.stop === 1) {
      if (this.hashResult.offset < this.hashResult.size) {
        this.hashResult.index += 1;
        //console.log(this.hashResult.length + " - " + this.hashResult.index);  //测试
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "nextHash",
          "index": this.hashResult.index,
          "status": "update",
          "date": new Date().getTime(),
        }));
        const hashes = await this.getHash();
        if (this.error === false) {
          if (hashes) {
            //console.log(hashes);
            const length = hashes.length;
            if (length && length > 0) {
              for (let i = 0; i < length; i++) {
                this.hashResult.offset += 131072;
                const string = hashes[i].hash.toString("hex");
                //console.log("sha2 : " + string);  //测试
                if (string) {
                  this.hashResult.hash.push(string);
                }
              }
            }
          } else {
            this.hashResult.index -= 1;
            //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : hashes出错");
            this.ws.send(JSON.stringify({
              "offsetId": this.offsetId,
              "operate": "nextHash",
              "message": "hashes出错",
              "error": true,
              "status": "error",
              "date": new Date().getTime(),
            }));
          }
          await scheduler.wait(1000);
          if (this.hashResult.offset < this.hashResult.size) {
            this.hashResult.limit += 1;
            if (this.hashResult.limit === 30) {
              this.hashResult.limit = 0;
              //await endCache();
              await this.insertCache();  //测试
            }
            await this.nextHash();
          }
        }
      }
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "stpauseop",
      }));
      await this.close();
    }
  }

  async insertMedia() {
    try {
      const mediaInfo = await this.env.MEDIADB.prepare("INSERT INTO `MEDIA` (id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(this.hashResult.id, this.hashResult.accessHash, this.hashResult.dcId, this.hashResult.fileName, this.hashResult.mimeType, this.hashResult.size, this.hashResult.duration, this.hashResult.width, this.hashResult.height, JSON.stringify(this.hashResult.hash)).run();
      //console.log(mediaInfo);  //测试
      if (mediaInfo.success === true) {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入media数据成功");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertMedia",
          "status": "success",
          "date": new Date().getTime(),
        }));
        return mediaInfo.meta.last_row_id;
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入media数据失败");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertMedia",
          "message": "插入media数据失败",
          "error": true,
          "status": "error",
          "date": new Date().getTime(),
        }));
        return 0;
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : insertMedia出错 : " + e);;
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "insertMedia",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.insertMedia();
    }
  }

  async insertMediaIndex(id) {
    try {
      const indexInfo = await this.env.MAINDB.prepare("INSERT INTO `MEDIAINDEX` (Vindex, id, accessHash) VALUES (?, ?, ?);").bind(id, this.hashResult.id, this.hashResult.accessHash).run();
      //console.log(indexInfo);  //测试
      if (indexInfo.success === true) {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入mediaIndex数据成功");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertMediaIndex",
          "status": "success",
          "date": new Date().getTime(),
        }));
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入mediaIndex数据失败");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertMediaIndex",
          "message": "插入mediaIndex数据失败",
          "error": true,
          "status": "error",
          "date": new Date().getTime(),
        }));
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : insertMediaIndex出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "insertMediaIndex",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.insertMediaIndex();
    }
  }

  // async selectPhotoIndex() {
  //   try {
  //     const photoResult = await this.env.MAINDB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTOINDEX` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(this.hashResult.id, this.hashResult.accessHash, this.hashResult.type).first();
  //     //console.log(photoResult);  //测试
  //     return photoResult;
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : selectPhotoIndex出错 : " + e);
  //     this.ws.send(JSON.stringify({
  //       "offsetId": this.offsetId,
  //       "operate": "selectPhotoIndex",
  //       "message": JSON.stringify(e),
  //       "error": true,
  //       "status": "try",
  //       "date": new Date().getTime(),
  //     }));
  //     await scheduler.wait(10000);
  //     await this.selectPhotoIndex();
  //   }
  // }

  async selectPhoto() {
    try {
      const photoResult = await this.env.PHOTODB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTO` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(this.hashResult.id, this.hashResult.accessHash, this.hashResult.type).first();
      //console.log(photoResult);  //测试
      return photoResult;
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : selectPhoto出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "selectPhoto",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.selectPhoto();
    }
  }

  async insertPhoto() {
    try {
      const photoInfo = await this.env.PHOTODB.prepare("INSERT INTO `PHOTO` (id, accessHash, dcId, sizeType, size, hash) VALUES (?, ?, ?, ?, ?, ?);").bind(this.hashResult.id, this.hashResult.accessHash, this.hashResult.dcId, this.hashResult.type, this.hashResult.size, JSON.stringify(this.hashResult.hash)).run();
      //console.log(photoInfo);  //测试
      if (photoInfo.success === true) {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入photo数据成功");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertPhoto",
          "photoIndex": ++this.hashResult.photoIndex,
          "status": "success",
          "date": new Date().getTime(),
        }));
        return photoInfo.meta.last_row_id;
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入photo数据失败");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertPhoto",
          "photoIndex": ++this.hashResult.photoIndex,
          "message": "插入photo数据失败",
          "error": true,
          "status": "error",
          "date": new Date().getTime(),
        }));
        return 0;
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : (" + this.hashResult.photoLength +"/" + (this.hashResult.photoIndex + 1) + ") insertPhoto出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "insertPhoto",
        "photoIndex": ++this.hashResult.photoIndex,
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.insertPhoto();
    }
  }

  async insertPhotoIndex(id) {
    try {
      const photoInfo = await this.env.MAINDB.prepare("INSERT INTO `PHOTOINDEX` (Pindex, id, accessHash) VALUES (?, ?, ?);").bind(id, this.hashResult.id, this.hashResult.accessHash).run();
      //console.log(photoInfo);  //测试
      if (photoInfo.success === true) {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入photoIndex数据成功");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertPhotoIndex",
          "status": "success",
          "date": new Date().getTime(),
        }));
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入photoIndex数据失败");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertPhotoIndex",
          "message": "插入photoIndex数据失败",
          "error": true,
          "status": "error",
          "date": new Date().getTime(),
        }));
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : insertPhotoIndex出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "insertPhotoIndex",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.insertPhotoIndex();
    }
  }

  async endMessage(type) {
    if (this.stop === 1) {
      //console.log(this.hashResult.count + " : " + this.hashResult.hash.length);  //测试
      if (this.hashResult.hash.length === this.hashResult.count) {
        let id = 0;
        if (type === 1) {
          id = await this.insertMedia();
          if (id > 0) {
            await this.insertMediaIndex(id);
          }
        } else if (type === 2) {
          id = await this.insertPhoto();
          if (id > 0) {
            await this.insertPhotoIndex(id);
          }
        }
        return id;
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : count不一至 : " + this.hashResult.count + " - " + this.hashResult.hash.length);
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "endMessage",
          "message": "count不一至 : " + this.hashResult.count + " - " + this.hashResult.hash.length,
          "error": true,
          "status": "error",
          "date": new Date().getTime(),
        }));
        return 0;
      }
      //this.offsetId += 1;
      //this.messageIndex += 1;
      // this.hashResult = {
      //   "hash": [],
      //   "offset": 0,
      //   "index": 0,
      //   "limit": 0,
      // };
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "pause",
      }));
      await this.close();
    }
  }

  async selectMessage() {
    try {
      const messageResult = await this.env.MAINDB.prepare("SELECT COUNT(id) FROM `MESSAGE` WHERE `id` = ? LIMIT 1;").bind(this.hashResult.messageId).first();
      //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
      if (messageResult) {
        return messageResult["COUNT(id)"];
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : selectMessage出错 : " + e);
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "selectMessage",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.selectMessage();
    }
  }

  async insertMessage() {
    try {
      const messageInfo = await this.env.MAINDB.prepare("INSERT INTO `MESSAGE` (id, dbIndex, category, txt, ids, status) VALUES (?, ?, ?, ?, ?, ?);").bind(this.hashResult.messageId, 5, this.hashResult.category, this.hashResult.txt, JSON.stringify(this.hashResult.ids), this.hashResult.status).run();
      //console.log(messageInfo);  //测试
      if (messageInfo.success === true) {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入message数据成功");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertMessage",
          "status": "success",
          "date": new Date().getTime(),
        }));
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 插入message数据失败");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "insertMessage",
          "message": "插入message数据失败",
          "error": true,
          "status": "error",
          "date": new Date().getTime()
        }));
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : insertMessage出错 : " + e);;
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "insertMessage",
        "message": JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      }));
      await scheduler.wait(10000);
      await this.insertMessage();
    }
  }

  async endInsert() {
    const messageCount = await this.selectMessage();
    if (parseInt(messageCount) === 0) {
      await this.insertMessage();
    } else {
      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : message已在数据库中");
      this.ws.send(JSON.stringify({
        "offsetId": this.offsetId,
        "operate": "endInsert",
        "status": "exist",
        "date": new Date().getTime(),
      }));
    }
  }

  async endStep() {
    if (this.messageIndex === this.messageLength) {
      this.messageIndex = 0;
      this.messageLength = 0;
      this.messageArray = [];
      if (this.stop === 1) {
        await this.nextStep();
      } else if (this.stop === 2) {
        this.ws.send(JSON.stringify({
          "result": "pause",
        }));
        await this.close();
      }
    } else {
      if (this.stop === 1) {
        await this.checkCache();
        await this.nextMessage();
      } else if (this.stop === 2) {
        this.ws.send(JSON.stringify({
          "result": "pause",
        }));
        await this.close();
      }
    }
  }

  async end() {
    this.offsetId += 1;
    this.messageIndex += 1;
    this.hashResult = {
      "hash": [],
      "offset": 0,
      "index": 0,
      "limit": 0,
    };
    if (this.stop === 1) {
      await this.endStep();
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "pause",
      }));
      await this.close();
    }
  }

  async next() {
    if (this.stop === 1) {
      await this.nextStep();
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "pause",
      }));
      await this.close();
    }
  }

  async nextMessage() {
    if (this.stop === 1) {
      this.hashResult.messageIndex = this.messageIndex + 1;
      if (this.messageIndex >= 0 && this.messageIndex < this.limit) {
        this.hashResult.messageId = this.messageArray[this.messageIndex].id;
        if (this.messageArray[this.messageIndex]) {
          const time = new Date().getTime();
          this.ws.send(JSON.stringify({
            "offsetId": this.offsetId,
            "operate": "nextMessage",
            "step": this.currentStep,
            "messageLength": this.messageLength,
            "messageIndex": this.hashResult.messageIndex,
            "messageId": this.hashResult.messageId,
            "status": "add",
            "time": time,
            "date": time,
          }));
          if (this.messageArray[this.messageIndex].media) {
            if (this.messageArray[this.messageIndex].media.document) {
              this.hashResult.id = this.messageArray[this.messageIndex].media.document.id.toString();
              this.hashResult.accessHash = this.messageArray[this.messageIndex].media.document.accessHash.toString();
              if (this.hashResult.id && this.hashResult.accessHash) {
                // const mimeType = this.messageArray[this.messageIndex].media.document.mimeType;
                // if (mimeType.startsWith("video/")) {
                // } else if (mimeType.startsWith("image/")) {
                // } else {
                //     if (mimeType.startsWith("application/")) {
                //     }
                // }
                const mediaIndexResult = await this.selectMediaIndex();
                if (mediaIndexResult) {
                  this.hashResult.category = 2;
                  this.hashResult.txt = this.messageArray[this.messageIndex].message;
                  this.hashResult.ids = [];
                  this.hashResult.status = 0;
                  const mediaIndexCount = parseInt(mediaIndexResult["COUNT(id)"]);
                  if (mediaIndexCount === 0) {
                    const mediaResult = await this.selectMedia();
                    if (mediaResult) {
                      const mediaCount = parseInt(mediaResult["COUNT(id)"]);
                      if (mediaCount === 0) {
                        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 准备查询视频的hash");
                        const attributes = this.messageArray[this.messageIndex].media.document.attributes;
                        if (attributes.length > 0) {
                          for (const attribute of attributes) {
                            if (attribute) {
                              if (attribute.className === "DocumentAttributeVideo") {
                                this.hashResult.duration = attribute.duration;
                                this.hashResult.width = attribute.w;
                                this.hashResult.height = attribute.h;
                              } else if (attribute.className === "DocumentAttributeFilename") {
                                this.hashResult.fileName = attribute.fileName;
                              }
                            }
                          }
                          if (!this.hashResult.fileName) {
                            this.hashResult.fileName = "";
                          }
                        } else {
                          this.hashResult.duration = 0;
                          this.hashResult.width = 0;
                          this.hashResult.height = 0;
                          this.hashResult.fileName = "";
                        }
                        //console.log(this.hashResult.duration + " - " + this.hashResult.width + " - " + this.hashResult.height + " - " + this.hashResult.fileName);  //测试
                        const info = utils.getFileInfo(this.messageArray[this.messageIndex].media);
                        this.hashResult.dcId = info.dcId;
                        this.hashResult.location = info.location;
                        this.hashResult.size = parseInt(this.messageArray[this.messageIndex].media.document.size);
                        this.hashResult.mimeType = this.messageArray[this.messageIndex].media.document.mimeType;
                        this.hashResult.sender = await this.client.getSender(this.hashResult.dcId);
                        this.hashResult.count = Math.ceil(this.hashResult.size / 131072);
                        this.hashResult.length = Math.ceil(this.hashResult.size / (131072 * 8));
                        this.ws.send(JSON.stringify({
                          "offsetId": this.offsetId,
                          "operate": "nextMessage",
                          "category": this.hashResult.category,
                          "dcId": this.hashResult.dcId,
                          "size": this.hashResult.size,
                          "type": this.hashResult.mimeType,
                          "fileName": this.hashResult.fileName,
                          "duration": this.hashResult.duration,
                          "width": this.hashResult.width,
                          "height": this.hashResult.height,
                          "length": this.hashResult.length,
                          "status": "update",
                          "date": new Date().getTime(),
                        }));
                        if (this.hashResult.length > 0) {
                          await this.nextHash();
                        }
                        if (this.error === false) {
                          if (this.stop === 1) {
                            const lastId = await this.endMessage(1);
                            if (lastId && lastId > 0) {
                              this.hashResult.status = 1;
                              this.hashResult.ids.push(lastId);
                            }
                            await this.endInsert();
                            await this.end();
                          } else if (this.stop === 2) {
                            this.ws.send(JSON.pause({
                              "result": "stop",
                            }));
                            await this.close();
                          }
                        } else {
                          this.error = false;
                          await this.end();
                        }
                      } else {
                        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 视频已入过库了");
                        this.ws.send(JSON.stringify({
                          "offsetId": this.offsetId,
                          "operate": "nextMessage",
                          "status": "fileExist",
                          "date": new Date().getTime(),
                        }));
                        const index = mediaResult.Vindex;
                        if (index && index > 0) {
                          this.hashResult.status = 1;
                          this.hashResult.ids.push(index);
                        }
                        if (index > 0) {
                          await this.insertMediaIndex(index);
                        }
                        await this.endInsert();
                        await this.end();
                      }
                    } else {
                      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 视频的mediaResult错误");
                      this.ws.send(JSON.stringify({
                        "offsetId": this.offsetId,
                        "operate": "nextMessage",
                        "message": "视频的mediaResult错误",
                        "error": true,
                        "status": "error",
                        "date": new Date().getTime(),
                      }));
                      await this.end();
                    }
                  } else {
                    //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 视频已入过索引库了");
                    this.ws.send(JSON.stringify({
                      "offsetId": this.offsetId,
                      "operate": "nextMessage",
                      "status": "indexExist",
                      "date": new Date().getTime(),
                    }));
                    const index = mediaIndexResult.Vindex;
                    if (index && index > 0) {
                      this.hashResult.status = 1;
                      this.hashResult.ids.push(index);
                    }
                    await this.endInsert();
                    await this.end();
                  }
                } else {
                  //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 视频的mediaIndexResult错误");
                  this.ws.send(JSON.stringify({
                    "offsetId": this.offsetId,
                    "operate": "nextMessage",
                    "message": "视频的mediaIndexResult错误",
                    "error": true,
                    "status": "error",
                    "date": new Date().getTime(),
                  }));
                  await this.end();
                }
              } else {
                //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 视频的id或accessHash错误");
                this.ws.send(JSON.stringify({
                  "offsetId": this.offsetId,
                  "operate": "nextMessage",
                  "message": "视频的id或accessHash错误",
                  "error": true,
                  "status": "error",
                  "date": new Date().getTime(),
                }));
                await this.end();
              }
            } else if (this.messageArray[this.messageIndex].media.photo) {
              this.hashResult.id = this.messageArray[this.messageIndex].media.photo.id.toString();
              this.hashResult.accessHash = this.messageArray[this.messageIndex].media.photo.accessHash.toString();
              if (this.hashResult.id && this.hashResult.accessHash) {
                const photoInfo = utils.getPhotoInfo(this.messageArray[this.messageIndex].media);
                this.hashResult.photoLength = photoInfo.length;
                //console.log("photoLength : " + this.hashResult.photoLength);  //测试
                if (this.hashResult.photoLength && this.hashResult.photoLength > 0) {
                  this.hashResult.category = 1;
                  this.hashResult.txt = this.messageArray[this.messageIndex].message;
                  this.hashResult.ids = [];
                  this.hashResult.status = 0;
                  this.hashResult.photoIndex = 0;
                  this.ws.send(JSON.stringify({
                    "offsetId": this.offsetId,
                    "operate": "nextMessage",
                    "category": this.hashResult.category,
                    "photoLength": this.hashResult.photoLength,
                    "status": "update",
                    "date": new Date().getTime(),
                  }));
                  for (this.hashResult.photoIndex; this.hashResult.photoIndex < this.hashResult.photoLength; this.hashResult.photoIndex++) {
                    this.hashResult.type = photoInfo[this.hashResult.photoIndex].type;
                    //const photoResult = await this.selectPhotoIndex();
                    const photoResult = await this.selectPhoto();  //测试
                    if (photoResult) {
                      const photoCount = parseInt(photoResult["COUNT(id)"]);
                      if (photoCount === 0) {
                        this.hashResult.hash = [];
                        this.hashResult.offset = 0;
                        this.hashResult.index = 0;
                        this.hashResult.dcId = photoInfo[this.hashResult.photoIndex].dcId;
                        this.hashResult.location = photoInfo[this.hashResult.photoIndex].location;
                        this.hashResult.size = photoInfo[this.hashResult.photoIndex].size;
                        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : (" + this.hashResult.photoLength +"/" + (this.hashResult.photoIndex + 1) + ") 准备查询图片"+ this.hashResult.type + "的hash");
                        this.ws.send(JSON.stringify({
                          "offsetId": this.offsetId,
                          "operate": "nextMessage",
                          "photoIndex": ++this.hashResult.photoIndex,
                          "dcId": this.hashResult.dcId,
                          "type": this.hashResult.type,
                          "size": this.hashResult.size,
                          "status": "update",
                          "date": new Date().getTime(),
                        }));
                        this.hashResult.sender = await this.client.getSender(this.hashResult.dcId);
                        this.hashResult.count = Math.ceil(this.hashResult.size / 131072);
                        this.hashResult.length = Math.ceil(this.hashResult.size / (131072 * 8));
                        if (this.hashResult.length > 0) {
                          await this.nextHash();
                        }
                        if (this.error === false) {
                          if (this.stop === 1) {
                            const lastId = await this.endMessage(2);
                            if (lastId && lastId > 0) {
                              this.hashResult.status = 1;
                              this.hashResult.ids.push(lastId);
                            }
                          } else if (this.stop === 2) {
                            this.ws.send(JSON.stringify({
                              "result": "pause",
                            }));
                            await this.close();
                          }
                        } else {
                          this.error = false;
                        }
                      } else {
                        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : (" + this.hashResult.photoLength +"/" + (this.hashResult.photoIndex + 1) + ") 图片"+ this.hashResult.type + "已入过库了");
                        this.ws.send(JSON.stringify({
                          "offsetId": this.offsetId,
                          "operate": "nextMessage",
                          "photoIndex": ++this.hashResult.photoIndex,
                          "status": "fileExist",
                          "date": new Date().getTime(),
                        }));
                        const index = photoResult.Pindex;
                        if (index && index > 0) {
                          this.hashResult.status = 1;
                          this.hashResult.ids.push(index);
                        }
                      }
                    } else {
                      //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 图片的photoResult错误");
                      this.ws.send(JSON.stringify({
                        "offsetId": this.offsetId,
                        "operate": "nextMessage",
                        "photoIndex": ++this.hashResult.photoIndex,
                        "message": "图片的photoResult错误",
                        "error": true,
                        "status": "error",
                        "date": new Date().getTime(),
                      }));
                    }
                    await scheduler.wait(2000);
                  }
                  await this.endInsert();
                  await this.end();
                } else {
                  //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 图片的info错误");
                  this.ws.send(JSON.stringify({
                    "offsetId": this.offsetId,
                    "operate": "nextMessage",
                    "photoIndex": ++this.hashResult.photoIndex,
                    "message": "图片的info错误",
                    "error": true,
                    "status": "error",
                    "date": new Date().getTime(),
                  }));
                  await this.end();
                }
              } else {
                //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 图片的id或accessHash错误");
                this.ws.send(JSON.stringify({
                  "offsetId": this.offsetId,
                  "operate": "nextMessage",
                  "photoIndex": ++this.hashResult.photoIndex,
                  "message": "图片的id或accessHash错误",
                  "error": true,
                  "status": "error",
                  "date": new Date().getTime(),
                }));
                await this.end();
              }
            // } else {
            //   console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 未知的媒体");
            //   this.ws.send(JSON.stringify({
            //     "offsetId": this.offsetId,
            //     "operate": "nextMessage",
            //     "message": "未知的媒体",
            //     "error": true,
            //     "status": "error",
            //     "date": new Date().getTime(),
            //   }));
            }
          } else {
            //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 消息不包含媒体");
            this.ws.send(JSON.stringify({
              "offsetId": this.offsetId,
              "operate": "nextMessage",
              "message": "消息不包含媒体",
              "error": true,
              "status": "error",
              "date": new Date().getTime(),
            }));
            await this.end();
          }
        } else {
          //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : 错误的消息");
          this.ws.send(JSON.stringify({
            "offsetId": this.offsetId,
            "operate": "nextMessage",
            "message": "错误的消息",
            "error": true,
            "status": "error",
            "date": new Date().getTime(),
          }));
          await this.end();
        }
      } else {
        //console.log("(" + this.currentStep + ")[" + this.messageLength +"/" + this.hashResult.messageIndex + "] " + this.offsetId + " : messageIndex错误");
        this.ws.send(JSON.stringify({
          "offsetId": this.offsetId,
          "operate": "nextMessage",
          "message": "messageIndex错误",
          "error": true,
          "status": "error",
          "date": new Date().getTime(),
        }));
        this.messageIndex = 0;
        this.messageLength = 0;
        this.messageArray = [];
        await this.next();
      }
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "pause",
      }));
      await this.close();
    }
  }

  async nextStep() {
    if (this.stop === 1) {
      await this.updateChat();
      this.currentStep += 1;
      const messageCount = await this.getMessage();
      this.messageLength = this.messageArray.length;
      if (this.messageLength > 0) {
        //console.log("(" + this.currentStep + ")messageLength : " + this.messageLength);
        this.ws.send(JSON.stringify({
          "operate": "nextStep",
          "step": this.currentStep,
          "message": "messageLength : " + this.messageLength,
          "date": new Date().getTime(),
        }));
        if (this.stop === 1) {
          await this.checkCache();
          await this.nextMessage();
        } else if (this.stop === 2) {
          this.ws.send(JSON.stringify({
            "result": "pause",
          }));
          await this.close();
        }
      } else if (messageCount > 0) {
        //console.log("(" + this.currentStep + ")messageCount : " + messageCount);
        this.ws.send(JSON.stringify({
          "operate": "nextStep",
          "step": this.currentStep,
          "message": "messageCount : " + messageCount,
          "date": new Date().getTime(),
        }));
        this.offsetId += this.limit;
        //this.messageIndex = 0;
        // this.hashResult = {
        //   "hash": [],
        //   "offset": 0,
        //   "index": 0,
        //   "limit": 0,
        // };
        //await this.updateChat();
        await this.next();
      } else {
        await this.updateChat();
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
          await this.next();
        } else {
          //console.log("(" + this.currentStep + ")全部chat采集完毕");
          this.ws.send(JSON.stringify({
            "result": "over",
            "operate": "nextStep",
            "step": this.currentStep,
            "message": "全部chat采集完毕",
            "date": new Date().getTime(),
          }));
          await this.close();
        }
      }
    } else if (this.stop === 2) {
      this.ws.send(JSON.stringify({
        "result": "pause",
      }));
      await this.close();
    }
  }

  // async getCache() {
  //   // this.ws.send(JSON.stringify({
  //   //   "operate": "getCache",
  //   //   "message": "getCache",
  //   //   "date": new Date().getTime(),
  //   // }));  //测试
  //   try {
  //     const cacheResult = await this.env.MAINDB.prepare("SELECT * FROM `CACHE` ORDER BY `Cindex` DESC LIMIT 1;").first();
  //     //console.log(cacheResult);  //测试
  //     if (cacheResult && cacheResult.hash) {
  //       if (cacheResult.chatId && cacheResult.chatId >= 0) {
  //         this.chatId = cacheResult.chatId;
  //       }
  //       if (cacheResult.hash) {
  //         this.cacheHashResult = JSON.parse(cacheResult.hash);
  //       }
  //     }
  //   } catch (e) {
  //     //console.log("getCache出错 : " + e);
  //     this.ws.send(JSON.stringify({
  //       "operate": "getCache",
  //       "message": "出错 : " + JSON.parse(e),
  //       "error": true,
  //       "date": new Date().getTime(),
  //     }));
  //     await scheduler.wait(10000);
  //     await this.getCache();
  //   }
  // }

  async checkCache() {
    if (this.currentStep === 1) {
      if (this.filter === Api.InputMessagesFilterVideo || this.filter === Api.InputMessagesFilterPhotoVideo) {
        if (this.messageArray[this.messageIndex].media) {
          const cacheHashResult = await this.ctx.storage.get(hashResult.id + "|" + hashResult.accessHash);
          if (cacheHashResult) {
            if (this.messageArray[this.messageIndex].media.document.id.toString() === cacheHashResult.id || this.messageArray[this.messageIndex].media.document.accessHash.toString() === cacheHashResult.accessHash) {
              this.hashResult = cacheHashResult;
              //this.cacheHashResult = null;
              //console.log("从(" + this.hashResult.length + " | " + this.hashResult.index + ")处继续");
              this.ws.send(JSON.stringify({
                "operate": "checkCache",
                "message": "从(" + this.hashResult.length + " | " + this.hashResult.index + ")处继续",
                "date": new Date().getTime(),
              }));
            }
          }
        }
      }
    }
  }

  async fetch(request) {
    const webSocketPair = new WebSocketPair();
    const [wsClient, wsServer] = Object.values(webSocketPair);
    this.ctx.acceptWebSocket(wsServer);
    // wsServer.send("chat success");  //测试
    this.ws = wsServer;
    // wsServer.send(JSON.stringify({
    //   "operate": "wsServer",
    //   "message": "wsServer",
    //   "date": new Date().getTime(),
    // }));  //测试
    // const configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'collect' LIMIT 1;").first();  //测试
    // const chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `Cindex` = 0 LIMIT 1;").first();  //测试
    // this.init();  //测试
    // await this.getConfig();
    // await this.getChat();  //测试
    // this.ws.send(JSON.stringify({
    //   "operate": this.chatId + " - " + this.filterType + " - " + this.reverse + " - " + this.limit,
    //   // "message": JSON.stringify(configResult),
    //   // "message": JSON.stringify(chatResult),
    //   "message": this.fromPeer + " - " + this.offsetId,
    //   "date": new Date().getTime(),
    // }));  //测试
    // this.init();
    // if (!this.client) {
    //   await this.open();
    // }
    return new Response(null, {
      status: 101,
      webSocket: wsClient,
    });
  }

  async webSocketMessage(ws, message) {
    //console.log(message);  //测试
    // ws.send(JSON.stringify({
    //   "operate": "webSocketMessage",
    //   "message": message,
    //   "date": new Date().getTime(),
    // }));
    if (message === "start") {
      // ws.send(JSON.stringify({
      //   "operate": "start",
      //   "message": "start1",
      //   "date": new Date().getTime(),
      // }));
      if (this.client || this.stop === 1) {
      // if (this.stop === 1) {
        ws.send(JSON.stringify({
          "operate": "open",
          "message": "服务已经运行过了",
          "date": new Date().getTime(),
        }));
        return;
      }
      // ws.send(JSON.stringify({
      //   "operate": "start",
      //   "message": "start2",
      //   "date": new Date().getTime(),
      // }));
      this.init();
      // this.stop = 1;
      await this.open();
      await this.getConfig();
      // await this.switchType();
      // ws.send(JSON.stringify({
      //   "operate": "start",
      //   "message": this.fromPeer,
      //   "date": new Date().getTime(),
      // }));  //测试
      // if (this.fromPeer) {
      //   if (this.hashResult.length && this.hashResult.length > 0) {
      //     ws.send(JSON.stringify({
      //       "operate": "start",
      //       "message": "继续获取下一个hash",
      //       "date": new Date().getTime(),
      //     }));
      //     if (this.stop === 1) {
      //       await this.nextHash();
      //     } else if (this.stop === 2) {
      //       ws.send(JSON.stringify({
      //         "result": "pause",
      //       }));
      //       await this.close();
      //     }
      //     if (this.stop === 1) {
      //       await this.endMessage();
      //       //await this.endInsert();
      //       await this.end();
      //     } else if (this.stop === 2) {
      //       ws.send(JSON.stringify({
      //         "result": "pause",
      //       }));
      //       await this.close();
      //     }
      //   } else if (this.messageLength > 0) {
      //     ws.send(JSON.stringify({
      //       "operate": "start",
      //       "message": "准备获取下一轮message",
      //       "date": new Date().getTime(),
      //     }));
      //     if (this.stop === 1) {
      //       await this.checkCache();
      //       await this.nextMessage();
      //     } else if (this.stop === 2) {
      //       ws.send(JSON.stringify({
      //         "result": "pause",
      //       }));
      //       await this.close();
      //     }
      //   } else {
      //     ws.send(JSON.stringify({
      //       "operate": "start",
      //       "message": "继续获取下一条message",
      //       "date": new Date().getTime(),
      //     }));
      //     await this.next();
      //   }
      // } else {
      //   await this.getChat();
      //   if (this.fromPeer) {
      //     if (this.chatId != this.lastChat) {
      //       if (this.lastChat != 0) {
      //         await this.updateConfig();
      //       }
      //       this.lastChat = this.chatId;
      //     }
      //     await this.next();
      //   } else {
      //     //console.log("全部chat采集完毕");
      //     ws.send(JSON.stringify({
      //       "result": "over",
      //       "operate": "start",
      //       "message": "全部chat采集完毕",
      //       "date": new Date().getTime(),
      //     }));
      //     await this.close();
      //   }
      // }
      // if (this.filter === Api.InputMessagesFilterVideo || this.filter === Api.InputMessagesFilterPhotoVideo) {
      //   await this.getCache();
      // }
      await this.getChat();
      // ws.send(JSON.stringify({
      //   "operate": this.chatId,
      //   "message": this.fromPeer,
      //   "date": new Date().getTime(),
      // }));  //测试
      if (this.fromPeer) {
        if (this.chatId != this.lastChat) {
          if (this.lastChat != 0) {
            await this.updateConfig();
          }
          this.lastChat = this.chatId;
        }
        if (this.stop === 1) {
          this.currentStep += 1;
          const messageCount = await this.getMessage();
          this.messageLength = this.messageArray.length;
          ws.send(JSON.stringify({
            "operate": this.messageLength,
            "message": JSON.stringify(this.messageArray),
            "date": new Date().getTime(),
          }));  //测试
          if (this.messageLength > 0) {
            ws.send(JSON.stringify({
              "operate": "start",
              "message": "messageLength : " + this.messageLength,
              "date": new Date().getTime(),
            }));
            if (this.stop === 1) {
              await this.checkCache();
              await this.nextMessage();
            } else if (this.stop === 2) {
              ws.send(JSON.stringify({
                "result": "pause",
              }));
              await this.close();
            }
          } else if (messageCount > 0) {
            //console.log("(" + this.currentStep + ")messageCount : " + messageCount");
            ws.send(JSON.stringify({
              "operate": "start",
              "step": this.currentStep,
              "message": "messageCount : " + messageCount,
              "error": true,
              "date": new Date().getTime(),
            }));
            this.offsetId += this.limit;
            //this.messageIndex = 0;
            // this.hashResult = {
            //   "hash": [],
            //   "offset": 0,
            //   "index": 0,
            //   "limit": 0,
            // };
            //await this.updateChat();
            await this.next();
          }
        } else if (this.stop === 2) {
          ws.send(JSON.stringify({
            "result": "pause",
          }));
          await this.close();
        }
      } else {
        //console.log("全部chat采集完毕");
        ws.send(JSON.stringify({
          "result": "over",
          "operate": "start",
          "message": "全部chat采集完毕",
          "date": new Date().getTime(),
        }));
        await this.close();
      }
    } else if (message === "close") {
      this.stop = 2;
    } else if (message === "clear") {
      await this.ctx.storage.deleteAll();
      // const cacheResult = await clearCache(this.env);
      // if (cacheResult === true) {
        //console.log("删除cache成功");
        ws.send(JSON.stringify({
          "operate": "clearCache",
          "message": "删除cache成功",
          "error": true,
          "date": new Date().getTime(),
        }));
      // } else {
      //   //console.log("删除cache失败");
      //   ws.send(JSON.stringify({
      //     "operate": "clearCache",
      //     "message": "删除cache失败",
      //     "error": true,
      //     "date": new Date().getTime(),
      //   }));
      // }
    // } else if (message === "count") {
    //   const mediaResult = await countMedia(this.env);
    //   if (mediaResult >= 0) {
    //     //console.log(mediaResult);
    //     ws.send(JSON.stringify({
    //       "operate": "count",
    //       "message": mediaResult,
    //       "date": new Date().getTime(),
    //     }));
    //   } else {
    //     //console.log("获取media失败");
    //     ws.send(JSON.stringify({
    //       "operate": "count",
    //       "message": "获取media失败",
    //       "error": true,
    //       "date": new Date().getTime(),
    //     }));
    //   }
    } else if (message === "chat") {
      if (this.client || this.stop === 1) {
      // if (this.stop === 1) {
        ws.send(JSON.stringify({
          "operate": "open",
          "message": "服务已经运行过了",
          "date": new Date().getTime(),
        }));
        return;
      }
      // this.stop = 1;
      // await this.open();
      let count = 0;
      for await (const dialog of this.client.iterDialogs({})) {
        //console.log(dialog);  //测试
        const channelId = dialog.inputEntity.channelId.toString();
        //console.log("channelId : " + channelId);  //测试
        const accessHash = dialog.inputEntity.accessHash.toString();
        //console.log("accessHash : " + accessHash);  //测试
        if (channelId && accessHash) {
          const chatResult = await this.env.MAINDB.prepare("SELECT COUNT(id) FROM `CHAT` WHERE `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(channelId, accessHash).first();
          //console.log("chatResult : " + chatResult["COUNT(id)"]);  //测试
          if (chatResult && chatResult["COUNT(id)"] === 0) {
            const chatInfo = await this.env.MAINDB.prepare("INSERT INTO `CHAT` (channelId, accessHash, title, current, photo, video, document, gif, exist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(channelId, accessHash, dialog.title, 0, 0, 0, 0, 0, 1).run();
            //console.log(chatInfo);  //测试
            if (chatInfo.success === true) {
              count += 1;
              //console.log("插入chat数据成功");
              ws.send(JSON.stringify({
                "operate": "chat",
                "message": "插入chat数据成功",
                "date": new Date().getTime(),
              }));
            } else {
              //console.log("插入chat数据失败");
              ws.send(JSON.stringify({
                "operate": "chat",
                "message": "插入chat数据失败",
                "error": true,
                "date": new Date().getTime(),
              }));
            }
          // } else {
          //   //console.log("chat已在数据库中");
          //   ws.send(JSON.stringify({
          //     "operate": "chat",
          //     "message": "chat已在数据库中",
          //     "date": new Date().getTime(),
          //   }));
          }
        } else {
          //console.log("chat的channelId或accessHash错误");
          ws.send(JSON.stringify({
            "operate": "chat",
            "message": "chat的channelId或accessHash错误",
            "error": true,
            "date": new Date().getTime(),
          }));
        }
      }
      //console.log("新插入了" + count + "条数据");
      ws.send(JSON.stringify({
        "operate": "chat",
        "message": "新插入了" + count + "条数据",
        "date": new Date().getTime(),
      }));
      await this.close();
    } else if (message === "backup") {
      const signed_url = await exportDB();
      if (signed_url) {
        ws.send(signed_url);
      } else {
        ws.send("获取signed_url失败");
      }
    } else {
      ws.send(JSON.stringify({
        "operate": "chat",
        "message": "未知消息",
        "error": true,
        "date": new Date().getTime(),
      }));
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    if (this.stop === 1) {
      await this.updateChat();
      //await endCache();
      await this.insertCache();  //测试
    }
    this.stop = 0;
    ws.close(code, "Durable Object is closing WebSocket");
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

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
    } else if (pathname === "/clear") {
      const cacheResult = await clearCache(env);
      if (cacheResult === true) {
        return new Response("删除cache成功");
      } else {
        return new Response("删除cache失败");
      }
    } else if (pathname === "/count") {
      const mediaResult = await countMedia(env);
      if (mediaResult >= 0) {
        return new Response(mediaResult);
      } else {
        return new Response("获取media失败");
      }
    } else if (pathname === "/backup") {
      const signed_url = await exportDB();
      if (signed_url) {
        return new Response(signed_url);
      } else {
        return new Response("获取signed_url失败");
      }
    }

    return new Response("error");
  },
};
