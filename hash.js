import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions, utils } from "./teleproto";
import { LogLevel } from "./teleproto/extensions";
import bigInt from "big-integer";

async function countMedia(env) {
  const mediaResult = await env.MEDIADB.prepare("SELECT COUNT(Vindex) FROM `MEDIA` WHERE 1 = 1;").run();
  //console.log("mediaResult : " + mediaResult["COUNT(Vindex)"]);  //测试
  if (mediaResult.success === true) {
    if (mediaResult.results && mediaResult.results.length > 0) {
      return mediaResult.results[0]["COUNT(Vindex)"];
    }
  }
  return -1;
}

function getDB(id) {
  const database = [
    "97d41e14-a9b6-45a9-b5cc-f60eb29acc02",  //0 : main
    "619bf710-136f-4b05-b7a7-ce7ffef02990",  //1 : media1
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
  photoDBIndex = 0;
  mediaDBIndex = 0;
  stop = 0;
  apiCount = 0;
  currentStep = 0;
  compress = false;
  batch = false;
  client = null;
  chatId = 0;
  endChat = 0;
  lastChat = 0;
  timeOver = 0;
  reverse = true;
  limit = 10;
  offsetId = 0;
  // error = false;
  fromPeer = null;
  filterType = 0;
  filter = Api.InputMessagesFilterVideo;
  //filterTitle = "媒体";
  messageArray = [];
  cacheMessage = null;
  batchMessage = [];
  dialogArray = [];

  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.storage = ctx.storage;
    // this.sql = ctx.storage.sql;
    this.env = env;

    // this.ctx.getWebSockets().forEach((ws) => {
    //   const found = this.webSocket.find(element => element === ws);
    //   if (!found) {
    //     this.webSocket.push(ws);
    //     //console.log("(" + this.currentStep + ")添加ws成功");
    //     // this.broadcast({
    //     //   "step": this.currentStep,
    //     //   "operate": "constructor",
    //     //   "message": "添加ws成功",
    //     //   "date": new Date().getTime(),
    //     // });
    //   }
    // });

    // this.ctx.blockConcurrencyWhile(async () => {
    //   this.init();
    //   if (!this.client) {
    //     await this.open(1);
    //   }
    // });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  init(option) {
    if (!this.client || !this.stop || this.stop === 0) {
    // if (!this.stop || this.stop === 0) {
      if (option) {
        if (option.compress) {
          this.compress = option.compress;
        }
        if (option.batch) {
          this.batch = option.batch;
        }
        if (option.chatId && option.chatId > 0) {
          this.chatId = option.chatId;
        }
        if (option.endChat && option.endChat > 0) {
          this.endChat = option.endChat;
        }
        if (option.filterType) {
          this.filterType = option.filterType;
        }
        if (option.reverse) {
          this.reverse = option.reverse;
        }
        if (option.limit && option.limit > 0) {
          this.limit = option.limit;
        }
        if (option.offsetId && option.offsetId > 0) {
          this.offsetId = option.offsetId;
        }
      } else {
        this.compress = false;
        this.batch = false;
        this.chatId = 0;
        this.endChat = 0;
        this.filterType = 0;
        this.reverse = true;
        this.limit = 20;
        this.offsetId = 0;
      }
      // this.ws = null;
      // this.client = null;
      // this.stop = 0;
      // this.webSocket = [];
      this.photoDBIndex = this.env.PHOTO_DB_INDEX;
      this.mediaDBIndex = this.env.MEDIA_DB_INDEX;
      this.apiCount = 0;
      this.currentStep = 0;
      this.lastChat = 0;
      this.timeOver = 0;
      // this.error = false;
      this.fromPeer = null;
      this.messageArray = [];
      this.filter = Api.InputMessagesFilterVideo;
      //this.filterTitle = "媒体";
      this.cacheMessage = null;
      this.batchMessage = [];
      this.dialogArray = [];
    }
  }

  updateTime(date) {
    if (date && (date >= this.cacheMessage.time)) {
      this.cacheMessage.date = date;
      if (date >= this.cacheMessage.time) {
        this.cacheMessage.useTime = date - this.cacheMessage.time;
      }
    }
  }

  broadcast(message) {
    // if (this.timeOver > 0 && this.filterType === 1) {
    //   clearTimeout(this.timeOver);
    //   this.timeOver = 0;
    // }
    if (this.compress === true) {
      if (message.operate === "nextHash") {
        if (message.status === "update") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["hashIndex"] = message.hashIndex;
              this.updateTime(message.date);
            }
          }
          return;
        }
      } else if (message.operate === "nextMessage") {
        if (message.status === "add") {
          if (this.cacheMessage) {
            if (message.offsetId > this.cacheMessage.offsetId) {
              const temp = message;
              message = this.cacheMessage;
              this.cacheMessage = temp;
              // this.updateTime(message.date);
            } else {
              this.cacheMessage = null;
              return;
            }
          } else {
            this.cacheMessage = message;
            // this.updateTime(message.date);
            return;
          }
        } else if (message.status === "error") {
        } else if (message.status === "limit") {
        } else if (!message.error) {
        } else {
          return;
        }
      } else if (message.operate === "getMedia" || message.operate === "getPhoto" || message.operate === "getFile") {
        if (message.status === "update") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              const {
                offsetId,
                operate,
                status,
                ...Items
              } = message;
              for (const name in Items) {
                this.cacheMessage[name] = Items[name];
              }
              this.updateTime(message.date);
            }
          }
          return;
        } else if (message.status === "indexExist") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["selectIndex"] = true;
              this.updateTime(message.date);
            }
          }
          return;
        } else if (message.status === "fileExist") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["selectFile"] = true;
              this.updateTime(message.date);
            }
          }
          return;
        } else if (message.status === "error") {
        } else if (message.status === "cache") {
        } else if (!message.error) {
        } else {
          return;
        }
      } else if (message.operate === "insertCache") {
      } else if (message.operate === "insertMedia") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertFile"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertFile"] = false;
            }
            this.updateTime(message.date);
          }
        }
        return;
      } else if (message.operate === "insertMediaIndex") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertIndex"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertIndex"] = false;
            }
            this.updateTime(message.date);
          }
        }
        return;
      } else if (message.operate === "insertPhoto") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertFile"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertFile"] = false;
            }
            this.updateTime(message.date);
          }
        }
        return;
      } else if (message.operate === "insertPhotoIndex") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertIndex"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertIndex"] = false;
            }
            this.updateTime(message.date);
          }
        }
        return;
      } else if (message.operate === "insertMessage") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertMessage"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertMessage"] = false;
            }
            this.updateTime(message.date);
          }
        }
        return;
      } else if (message.operate === "endInsert") {
        if (message.status === "exist") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["selectMessage"] = true;
              this.updateTime(message.date);
            }
          }
        }
        return;
      } else if (message.operate === "open") {
      } else if (message.operate === "close") {
      } else if (message.operate === "checkChat") {
      } else if (message.operate === "chat") {
      } else if (message.operate === "backup") {
      } else if (message.status === "limit") {
      } else if (!message.error) {
        if (!message.result) {
          return;
        }
      }
      if (this.batch === true) {
        if (this.batchMessage.length < this.limit) {
          this.batchMessage.push(message);
          return;
        } else {
          const temp = message;
          message = this.batchMessage;
          // this.batchMessage = [];
          // this.batchMessage.push(temp);
          this.batchMessage = [temp];
        }
      }
    } else if (this.batch === true) {
      if (this.batchMessage.length < this.limit) {
        this.batchMessage.push(message);
        return;
      } else {
        const temp = message;
        message = this.batchMessage;
        // this.batchMessage = [];
        // this.batchMessage.push(temp);
        this.batchMessage = [temp];
      }
    }
    if (this.timeOver > 0 && this.filterType === 1) {
      clearTimeout(this.timeOver);
      this.timeOver = 0;
    }
    // if (typeof message !== "string") {
      message = JSON.stringify(message);
    // }
    this.ctx.getWebSockets().forEach((ws) => {
    // this.webSocket.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // ws.send(JSON.stringify(message));
          ws.send(message);
        } catch (e) {
          // console.log(e);
          // const index = this.webSocket.findIndex(element => element === ws);
          // if (index > -1) {
          //   this.webSocket.splice(index, 1);
          //   //console.log("(" + this.currentStep + ")删除ws成功");
          //   // this.broadcast({
          //   //   "step": this.currentStep,
          //   //   "operate": "broadcast",
          //   //   "message": "删除ws成功",
          //   //   "date": new Date().getTime(),
          //   // });
          // } else {
          //   //console.log("(" + this.currentStep + ")没找到该ws");
          //   this.broadcast({
          //     "step": this.currentStep,
          //     "operate": "broadcast",
          //     "message": "没找到该ws",
          //     "error": true,
          //     "date": new Date().getTime(),
          //   });
          // }
        }
      }
    });
  }

  sendGrid(operate, message, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "operate": operate,
      "offsetId": this.offsetId,
      "message": message,
      "status": status,
      "error": error,
      "date": new Date().getTime(),
    });
  }

  sendHash(operate, message, hashIndex, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "operate": operate,
      "offsetId": this.offsetId,
      "hashIndex": hashIndex,
      "message": message,
      "status": status,
      "error": error,
      "date": new Date().getTime(),
    });
  }

  sendPhoto(operate, message, photoIndex, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "operate": operate,
      "offsetId": this.offsetId,
      "photoIndex": photoIndex,
      "message": message,
      "status": status,
      "error": error,
      "date": new Date().getTime(),
    });
  }

  sendLog(operate, message, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "operate": operate,
      "message": message,
      "status": status,
      "error": error,
      "date": new Date().getTime(),
    });
  }

  async close() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      //console.log("断开服务器成功");
      this.sendLog("close", "断开服务器成功", null, false);
    }
    this.stop = 0;
    this.ws.close();
    this.ctx.abort("reset");
  }

  async open(tryCount) {
    const apiId = 1334621;
    const apiHash = "2bc36173f487ece3052a00068be59e7b";
    const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7VxdGmdW/SYRusjfTnUHfhQfqLFA+A30Jios20XKnGGsRB58mFR33Lnpz966333yugE0ysMX/XMP8Urbbm3ADQ/mCq/fdQqA/qUoeG9L2Wy0Y8WcOlikGkNJ2e/nO9pT9nl1YePq5DD/hJ8+eKNL4BvUY70GAth/N/fv7dA4joQzwWhHdA8wdOUaxDQhnSAk9H62zG4fX5zipV+g2qp2WCT6CWCwUtsgZs8FZ9g9/TMmyfLagFmnMe7MhlZdkMfgCtKCXI8MVrGaHq5SpPRqMMCR4SkFrwV+9Eo6NyehH7bzWl1zyyAr6wP8j0jtduckdvkUcmyoDOP2M3AkNgd+ZcQ==";
    try {
      this.client = new TelegramClient(new sessions.StringSession(sessionString), apiId, apiHash, {
        connectionRetries: Number.MAX_VALUE,
        autoReconnect: true,
        deviceModel: "Desktop",
        systemVersion: "Windows 11",
        appVersion: "6.7.6 x64",
        langCode: "en",
        systemLangCode: "en-US",
        //downloadRetries: 1,
        //retryDelay: 0,
        //useWSS: false,
      });
      this.client.session.setDC(5, "91.108.56.128", 80);
      this.client.setLogLevel(LogLevel.ERROR);
      await this.client.connect();
    } catch (e) {
      //console.log("login出错 : " + e);
      this.sendLog("open", "login出错 : " + e, null, true);
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")open超出tryCount限制");
        this.sendLog("open", "超出tryCount限制", null, true);
        await this.close();
      } else {
        await scheduler.wait(30000);
        await this.open(tryCount + 1);
      }
      return;
    }
    this.stop = 1;
    //console.log("连接服务器成功");
    this.sendLog("open", "连接服务器成功", null, false);  //测试
    //console.log(this.client);  //测试
    //await scheduler.wait(5000);
  }

  async getConfigError(tryCount, option) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")getConfig超出tryCount限制");
      this.sendLog("getConfig", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.getConfig(tryCount + 1, option);
    }
  }

  async getConfig(tryCount, option) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'collect' AND `tgId` = 0 LIMIT 1;").run();
    } catch (e) {
      //console.log("getConfig出错 : " + e);
      this.sendLog("getConfig", "出错 : " + JSON.stringify(e), null, true);
      await this.getConfigError(tryCount, option);
      return;
    }
    //console.log("configResult : " + configResult);  //测试
    if (configResult.success === true) {
      if (configResult.results && configResult.results.length > 0) {
        const result = configResult.results[0];
        if (!option || !option.chatId) {
          if (result.chatId && result.chatId > 0) {
            this.chatId = result.chatId;
            this.lastChat = this.chatId;
          }
        }
        if (!option || !option.filterType) {
          if (result.filterType && result.filterType > 0 && result.filterType <= 9) {
            this.filterType = result.filterType;
          }
        }
        if (!option || !option.reverse) {
          if (result.reverse) {
            this.reverse = Boolean(result.reverse);
          }
        }
        if (!option || !option.limited) {
          if (result.limited && result.limited > 0) {
            this.limit = result.limited;
          }
        }
      } else {
        //console.log("没有预设config");
        this.sendLog("getConfig", "没有预设config", null, false);
      }
    } else {
      //console.log("查询config失败");
      this.sendLog("getConfig", "查询config失败", null, true);
      await this.getConfigError(tryCount, option);
    }
  }

  async switchType() {
    switch (this.filterType) {
      case 0:
        this.filter = Api.InputMessagesFilterPhotoVideo;
        break;
      case 1:
        //this.filterTitle = "图片";
        this.filter = Api.InputMessagesFilterPhotos;
        break;
      case 2:
        //this.filterTitle = "视频";
        this.filter = Api.InputMessagesFilterVideo;
        break;
      case 3:
        //this.filterTitle = "文件";
        this.filter = Api.InputMessagesFilterDocument;
        break;
      case 4:
        //this.filterTitle = "动图";
        this.filter = Api.InputMessagesFilterGif;
        break;
      case 5:
        this.filter = Api.InputMessagesFilterVoice;
        break;
      case 6:
        this.filter = Api.InputMessagesFilterMusic;
        break;
      case 7:
        this.filter = Api.InputMessagesFilterChatPhotos;
        break;
      case 8:
        this.filter = Api.InputMessagesFilterRoundVoice;
        break;
      case 9:
        this.filter = Api.InputMessagesFilterRoundVideo;
        break;
      default:
        this.filter = Api.InputMessagesFilterPhotoVideo;
    }
  }

  async setOffsetId(chatResult) {
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

  async noExistChatError(tryCount, Cindex) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")noExistChat超出tryCount限制");
      this.sendLog("noExistChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.noExistChat(tryCount + 1, Cindex);
    }
  }

  async noExistChat(tryCount, Cindex) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(Cindex).run();
    } catch (e) {
      //console.log("noExistChat出错 : " + e);
      this.sendLog("noExistChat", "出错 : " + JSON.stringify(e), null, true);
      await this.noExistChatError(tryCount, Cindex);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("更新不存在chat数据成功");
      this.sendLog("noExistChat", "更新不存在chat数据成功", null, false);
    } else {
      //console.log("更新不存在chat数据失败");
      this.sendLog("noExistChat", "更新不存在chat数据失败", null, true);
      await this.noExistChatError(tryCount, Cindex);
    }
  }

  async checkChat(tryCount, chatResult) {
    if (chatResult.channelId && chatResult.accessHash) {
      let result = null;
      try {
        result = await this.client.invoke(new Api.channels.GetChannels({
          id: [new Api.InputChannel({
            channelId: bigInt(chatResult.channelId),
            accessHash: bigInt(chatResult.accessHash),
          })],
        }));
      } catch (e) {
        //console.log("(" + this.currentStep + ")出错 : " + e);
        this.sendLog("checkChat", "出错 : " + JSON.stringify(e), null, true);
        if (e.errorMessage === "CHANNEL_INVALID" || e.errorMessage === "CHANNEL_PRIVATE" || e.code === 400) {
          await this.noExistChat(1, chatResult.Cindex);
          this.chatId += 1;
          if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
            //console.log(chatResult.title + " : chat已不存在了");  //测试
            this.sendLog("checkChat", chatResult.title + " : chat已不存在了", null, true);
            await this.nextChat(1, true);
          } else {
            //console.log(this.endChat + " : 超过最大chat了");  //测试
            this.sendLog("checkChat", this.endChat + " : 超过最大chat了", null, true);
          }
        } else {
          if (tryCount === 20) {
            this.stop = 2;
            //console.log("(" + this.currentStep + ")checkChat超出tryCount限制");
            this.sendLog("checkChat", "超出tryCount限制", null, true);
            await this.close();
          } else {
            await scheduler.wait(10000);
            await this.checkChat(tryCount + 1, chatResult);
          }
        }
        return;
      }
      // console.log(this.fromPeer);  //测试
      if (result && result.chats && result.chats.length > 0) {
        this.chatId = chatResult.Cindex;
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          this.fromPeer = result.chats[0];
          if (this.fromPeer) {
            this.setOffsetId(chatResult);
            this.sendLog("checkChat", this.chatId + " : " + chatResult.title, "add", false);
          } else {
            await this.noExistChat(1, chatResult.Cindex);
            this.chatId = chatResult.Cindex + 1;
            if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
              //console.log(chatResult.title + " : chat已不存在了");  //测试
              this.sendLog("checkChat", chatResult.title + " : chat已不存在了", null, true);
              await this.nextChat(1, true);
            } else {
              //console.log(this.endChat + " : 超过最大chat了");  //测试
              this.sendLog("checkChat", this.endChat + " : 超过最大chat了", null, true);
            }
          }
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.sendLog("checkChat", this.endChat + " : 超过最大chat了", null, true);
        }
      } else {
        this.chatId = chatResult.Cindex + 1;
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          //console.log(chatResult.title + " : chat已不存在了");  //测试
          this.sendLog("checkChat", chatResult.title + " : chat已不存在了", null, true);
          await this.nextChat(1, true);
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.sendLog("checkChat", this.endChat + " : 超过最大chat了", null, true);
        }
      }
    } else {
      await this.noExistChat(1, chatResult.Cindex);
      this.chatId = chatResult.Cindex + 1;
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        //console.log(chatResult.title + " : channelId或accessHash出错");  //测试
        this.sendLog("checkChat", chatResult.title + " : channelId或accessHash出错", null, true);
        await this.nextChat(1, true);
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.sendLog("checkChat", this.endChat + " : 超过最大chat了", null, true);
      }
    }
  }

  async nextChatError(tryCount, check) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")nextChat超出tryCount限制");
      this.sendLog("nextChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.nextChat(tryCount + 1, check);
    }
  }

  async nextChat(tryCount, check) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `Cindex` >= ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.chatId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")出错 : " + e);
      this.sendLog("nextChat", "出错 : " + JSON.stringify(e), null, true);
      await this.nextChatError(tryCount, check);
      return;
    }
    //console.log("chatResult : " + chatResult);  //测试
    if (chatResult.success === true) {
      if (chatResult.results && chatResult.results.length > 0) {
        if (check === true) {
          await this.checkChat(1, chatResult.results[0]);
        } else {
          this.chatId = chatResult.results[0].Cindex;
        }
      } else {
        this.chatId = -1;
        //console.log("没有更多chat了");
        this.sendLog("nextChat", "没有更多chat了", null, true);
      }
    } else {
      //console.log("查询chat失败");
      this.sendLog("nextChat", "查询chat失败", null, true);
      await this.nextChatError(tryCount, check);
    }
  }

  async getChat() {
    if (this.chatId === 0) {
      this.fromPeer = "me";
      let tryCount = 0;
      while (tryCount < 30) {
        this.apiCount += 1;
        let chatResult = {};
        try {
          chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `Cindex` = 0 LIMIT 1;").run();
        } catch (e) {
          tryCount += 1;
          //console.log("(" + this.currentStep + ")getChat出错 : " + e);
          this.sendLog("getChat", "出错 : " + JSON.stringify(e), null, true);
          await scheduler.wait(10000);
        }
        //console.log("chatResult : " + chatResult);  //测试
        if (chatResult.success === true) {
          if (chatResult.results && chatResult.results.length > 0) {
            this.setOffsetId(chatResult.results[0]);
            break;
          }
        } else {
          //console.log("查询me失败");  //测试
          this.sendLog("getChat", "查询me失败", null, true);
        }
      }
    } else if (this.chatId && this.chatId > 0) {
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        await this.nextChat(1, true);
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.sendLog("getChat", this.endChat + " : 超过最大chat了", null, true);
      }
    } else {
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        let tryCount = 0;
        while (tryCount < 30) {
          this.apiCount += 1;
          let chatResult = {};
          try {
            // if (this.filterType === 0) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `current` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 1) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `photo` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 2) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `video` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 3) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `document` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 4) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `gif` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // }
            chatResult = await this.env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `tgId` = 0 AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run(this.chatId);
          } catch (e) {
            tryCount += 1;
            //console.log("(" + this.currentStep + ")getChat出错 : " + e);
            this.sendLog("getChat", "出错 : " + JSON.stringify(e), null, true);
            await scheduler.wait(10000);
            return;
          }
          //console.log("chatResult : " + chatResult);  //测试
          if (chatResult.success === true) {
            if (chatResult.results && chatResult.results.length > 0) {
              await this.checkChat(1, chatResult.results[0]);
            } else {
              this.chatId = -1;
              //console.log("没有更多chat了");
              this.sendLog("getChat", "没有更多chat了", null, true);
            }
            break;
          } else {
            //console.log("查询chat失败");
            this.sendLog("getChat", "查询chat失败", null, false);
          }
        }
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.sendLog("getChat", this.endChat + " : 超过最大chat了", null, true);
      }
    }
  }

  async updateConfigError(tryCount) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")updateConfig超出tryCount限制");
      this.sendLog("updateConfig", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.updateConfig(tryCount + 1);
    }
  }

  async updateConfig(tryCount) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `name` = 'collect' AND `tgId` = 0;").bind(this.chatId).run();
    } catch (e) {
      //console.log("updateConfig出错 : " + e);
      this.sendLog("updateConfig", "出错 : " + JSON.stringify(e), null, true);
      await this.updateConfigError(tryCount);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
      //console.log("更新config数据成功");
      this.sendLog("updateConfig", "更新config数据成功", null, false);
    } else {
      //console.log("更新config数据失败");
      this.sendLog("updateConfig", "更新config数据失败", null, true);
      await this.updateConfigError(tryCount);
    }
  }

  async getMessage(tryCount) {
    try {
      let count = 0;
      // this.messageArray = [];
      for await (const message of this.client.iterMessages(
        this.fromPeer,
        //"me",  //测试
        {
          limit: this.limit,
          //limit: 20,  //测试
          reverse: this.reverse,
          //reverse: false,  //测试
          addOffset: this.reverse ? -this.offsetId : this.offsetId,
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
      //console.log("(" + this.currentStep + ")getMessage出错 : " + e);
      this.sendLog("getMessage", "出错 : " + JSON.stringify(e), null, true);
      if (e.errorMessage === "CHANNEL_INVALID" || e.errorMessage === "CHANNEL_PRIVATE" || e.code === 400) {
        await this.noExistChat(1, chatResult.Cindex);
        this.fromPeer = null;
        this.chatId += 1;
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          //console.log(chatResult.title + " : chat已不存在了");  //测试
          this.sendLog("getMessage", chatResult.title + " : chat已不存在了", null, true);
          await this.getChat();
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.sendLog("getMessage", this.endChat + " : 超过最大chat了", null, true);
        }
      } else if (e.errorMessage === "FLOOD" || e.code === 420) {
        //console.log("(" + this.currentStep + ") 触发了洪水警告，请求太频繁" + e);
        this.sendLog("getMessage", "触发了洪水警告，请求太频繁 : " + JSON.stringify(e), "flood", true);
      } else {
        if (tryCount === 20) {
          this.stop = 2;
          //console.log("(" + this.currentStep + ")getMessage超出tryCount限制");
          this.sendLog("getMessage", "超出tryCount限制", null, true);
          await this.close();
        } else {
          await scheduler.wait(10000);
          await this.getMessage(tryCount + 1);
        }
      }
      return;
    }
  }

  async selectMediaIndexError(tryCount, id, accessHash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectMediaIndex超出tryCount限制");
      this.sendLog("selectMediaIndex", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectMediaIndex(tryCount + 1, id, accessHash);
    }
  }

  async selectMediaIndex(tryCount, id, accessHash) {
    this.apiCount += 1;
    let mediaResult = {};
    try {
      mediaResult = await this.env.MAINDB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIAINDEX` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(id, accessHash).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectMediaIndex出错 : " + e);
      this.sendGrid("selectMediaIndex", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectMediaIndexError(tryCount, id, accessHash);
      return;
    }
    //console.log("mediaResult : " + mediaResult);  //测试
    if (mediaResult.success === true) {
      if (mediaResult.results && mediaResult.results.length > 0) {
        return mediaResult.results[0];
      }
    } else {
      await this.selectMediaIndexError(tryCount, id, accessHash);
    }
  }

  async selectMediaError(tryCount, id, accessHash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectMedia超出tryCount限制");
      this.sendLog("selectMedia", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectMedia(tryCount + 1, id, accessHash);
    }
  }

  async selectMedia(tryCount, id, accessHash) {
    this.apiCount += 1;
    let mediaResult = {};
    try {
      mediaResult = await this.env.MEDIADB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIA` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(id, accessHash).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectMedia出错 : " + e);
      this.sendGrid("selectMedia", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectMediaError(tryCount, id, accessHash);
      return;
    }
    //console.log("mediaResult : " + mediaResult);  //测试
    if (mediaResult.success === true) {
      if (mediaResult.results && mediaResult.results.length > 0) {
        return mediaResult.results[0];
      }
    } else {
      await this.selectMediaError(tryCount, id, accessHash);
    }
  }

  async getHash(tryCount, location, sender, offset, hashIndex) {
    if (this.stop === 1) {
      try {
        // const timeOut = new Promise((resolve) => {
        //   setTimeout(function() {
        //     this.sendHash("getHash", "获取超时", hashIndex, "error", true);
        //     return resolve();
        //   }, 10000);
        // });
        // const results = await Promise.race([
        //   this.client.invokeWithSender(
        //     new Api.upload.GetFileHashes({
        //       location: location,
        //       offset: offset,
        //     }),
        //     sender
        //   ),
        //   timeOut
        // ]);
        const results = await this.client.invokeWithSender(
          new Api.upload.GetFileHashes({
            location: location,
            offset: offset,
          }),
          sender
        );
        return results;
      } catch (e) {
        if (e.errorMessage === "FLOOD" || e.code === 420) {
          //console.log("(" + this.currentStep + ") 触发了洪水警告，请求太频繁" + e);
          this.sendLog("getHash", "触发了洪水警告，请求太频繁 : " + JSON.stringify(e), "flood", true);
        }
        this.sendHash("getHash", JSON.stringify(e), hashIndex, "try", true);
        // if (hashIndex === 1) {
        //   this.error = true;
        //   //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 查询首个hash出错 : " + e);
        //   await scheduler.wait(5000);
        // } else {
        //   //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 查询hash出错");
        //   await scheduler.wait(10000);
        //   await this.getHash(tryCount + 1, location, sender, offset, hashIndex);
        // }
        if (this.filterType === 1) {
          return;
        } else if (tryCount === 20) {
          this.stop = 2;
          //console.log("(" + this.currentStep + ")getHash超出tryCount限制");
          this.sendLog("getHash", "超出tryCount限制", null, true);
          await this.close();
        } else {
          await scheduler.wait(10000);
          await this.getHash(tryCount + 1, location, sender, offset, hashIndex);
        }
        return;
      }
    } else if (this.stop === 2) {
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async getCache(id, accessHash) {
    if (this.currentStep === 1) {
      if (this.filter === Api.InputMessagesFilterVideo || this.filter === Api.InputMessagesFilterPhotoVideo || this.filter === Api.InputMessagesFilterDocument) {
        if (id && accessHash) {
          const cacheResult = await this.ctx.storage.get(id + "|" + accessHash);
          if (cacheResult) {
            let cacheHash = undefined;
            try {
              cacheHash = JSON.parse(cacheResult);
            } catch (e) {
              //console.log(this.offsetId + " : 恢复cache失败");
              this.sendLog("getCache", this.offsetId + " : 恢复cache失败", null, true);
            }
            return cacheHash;
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  async insertCache(tryCount, category, id, accessHash, offset, hashLength, hashIndex, hash) {
    if (category === 2 && hash && hash.length && hash.length > 0) {
      try {
        await this.ctx.storage.put(id + "|" + accessHash, JSON.stringify({
          "offset": offset,
          "hashIndex": hashIndex,
          "hash": hash,
        }));
      } catch (e) {
        //console.log("(" + this.currentStep + ")insertCache " + this.offsetId + " : ("+ hashLength + " | " + hashIndex + ")插入cache数据出错 : " + e);
        this.sendLog("insertCache", this.offsetId + " : ("+ hashLength + " | " + hashIndex + ")插入cache数据出错 : " + e, null, true);
        if (tryCount === 20) {
          this.stop = 2;
          //console.log("(" + this.currentStep + ")insertCache超出tryCount限制");
          this.sendLog("insertCache", "超出tryCount限制", null, true);
          await this.close();
        } else {
          await scheduler.wait(10000);
          await this.insertCache(tryCount + 1, category, id, accessHash, offset, hashLength, hashIndex, hash);
        }
        return;
      }
      //console.log("(" + this.currentStep + ")insertCache " + this.offsetId + " : ("+ hashLength + " | " + hashIndex + ")插入cache数据成功");
      this.sendLog("insertCache", this.offsetId + " : ("+ hashLength + " | " + hashIndex + ")插入cache数据成功", null, false);
    } else {
      //console.log("(" + this.currentStep + ")cache("+ hashLength + " | " + hashIndex + ")数据错误");
      this.sendLog("insertCache", "cache("+ hashLength + " | " + hashIndex + ")数据错误", null, true);
    }
  }

  async updateChatError(tryCount) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")updateChat超出tryCount限制");
      this.sendLog("updateChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.updateChat(tryCount + 1);
    }
  }

  async updateChat(tryCount) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      if (this.filterType === 0) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 1) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `photo` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 2) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `video` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 3) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `document` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 4) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `CHAT` SET `gif` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")updateChat出错 : " + e);
      this.sendLog("updateChat", "出错 : " + JSON.stringify(e), null, true);
      await this.updateChatError(tryCount);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("(" + this.currentStep + ")更新chat数据成功");
      this.sendLog("updateChat", "更新chat数据成功", null, false);
    } else {
      //console.log("(" + this.currentStep + ")更新chat数据失败");
      this.sendLog("updateChat", "更新chat数据失败", null, true);
      await this.updateChatError(tryCount);
    }
  }

  async nextHash(location, sender, category, id, accessHash, size, offset, hashLength, hashIndex, limit, hash) {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        if (offset < size) {
          hashIndex += 1;
          //console.log(hashLength + " - " + hashIndex);  //测试
          this.sendHash("nextHash", "", hashIndex, "update", false);
          const hashes = await this.getHash(1, location, sender, offset, hashIndex);
          // if (this.error === false) {
            if (hashes) {
              //console.log(hashes);
              const length = hashes.length;
              if (length && length > 0) {
                for (let i = 0; i < length; i++) {
                  offset += 131072;
                  const string = hashes[i].hash.toString("hex");
                  //console.log("sha2 : " + string);  //测试
                  if (string) {
                    hash.push(string);
                  }
                }
              }
            } else {
              if (this.filterType === 1) {
                return;
              }
              hashIndex -= 1;
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : hashes出错");
              this.sendGrid("nextHash", "hashes出错", "error", true);
            }
            if (offset < size) {
              limit += 1;
              if (limit === 50) {
                limit = 0;
                await this.insertCache(1, category, id, accessHash, offset, hashLength, hashIndex, hash);
              } else {
                await scheduler.wait(1000);
              }
              await this.nextHash(location, sender, category, id, accessHash, size, offset, hashLength, hashIndex, limit, hash);
            } else {
              return;
            }
          // }
        } else {
          return;
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : nextHash超出apiCount限制");
        this.sendGrid("nextHash", "超出apiCount限制", "limit", true);
        await this.updateChat(1);
        await this.insertCache(1, category, id, accessHash, offset, hashLength, hashIndex, hash);
        await this.close();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      await this.updateChat(1);
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async insertMediaError(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertMedia超出tryCount限制");
      this.sendLog("insertMedia", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertMedia(tryCount + 1, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash);
    }
  }

  async insertMedia(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash) {
    this.apiCount += 1;
    let mediaResult = {};
    try {
      mediaResult = await this.env.MEDIADB.prepare("INSERT INTO `MEDIA` (id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(id, accessHash, dcId, fileName, mimeType, size, duration, width, height, JSON.stringify(hash)).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertMedia出错 : " + e);;
      this.sendGrid("insertMedia", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertMediaError(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash);
      return;
    }
    //console.log(mediaResult);  //测试
    if (mediaResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入media数据成功");
      this.sendGrid("insertMedia", "", "success", false);
      return mediaResult.meta.last_row_id;
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入media数据失败");
      this.sendGrid("insertMedia", "插入media数据失败", "error", true);
      await this.insertMediaError(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash);
      return 0;
    }
  }

  async insertMediaIndexError(tryCount, Vindex, id, accessHash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertMediaIndex超出tryCount限制");
      this.sendLog("insertMediaIndex", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertMediaIndex(tryCount + 1, Vindex, id, accessHash);
    }
  }

  async insertMediaIndex(tryCount, Vindex, id, accessHash) {
    this.apiCount += 1;
    let indexResult = {};
    try {
      indexResult = await this.env.MAINDB.prepare("INSERT INTO `MEDIAINDEX` (Vindex, id, accessHash) VALUES (?, ?, ?);").bind(Vindex, id, accessHash).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertMediaIndex出错 : " + e);
      this.sendGrid("insertMediaIndex", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertMediaIndexError(tryCount, Vindex, id, accessHash);
      return;
    }
    //console.log(indexResult);  //测试
    if (indexResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入mediaIndex数据成功");
      this.sendGrid("insertMediaIndex", "", "success", false);
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入mediaIndex数据失败");
      this.sendGrid("insertMediaIndex", "插入mediaIndex数据失败", "error", true);
      await this.insertMediaIndexError(tryCount, Vindex, id, accessHash);
    }
  }

  async selectPhotoIndexError(tryCount, id, accessHash, type) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectPhotoIndex超出tryCount限制");
      this.sendLog("selectPhotoIndex", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectPhotoIndex(tryCount + 1, id, accessHash, type);
    }
  }

  async selectPhotoIndex(tryCount, id, accessHash, type) {
    this.apiCount += 1;
    let photoResult = {};
    try {
      photoResult = await this.env.MAINDB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTOINDEX` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(id, accessHash, type).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectPhotoIndex出错 : " + e);
      this.sendGrid("selectPhotoIndex", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectPhotoIndexError(tryCount, id, accessHash, type);
      return;
    }
    //console.log("photoResult : " + photoResult);  //测试
    if (photoResult.success === true) {
      if (photoResult.results && photoResult.results.length > 0) {
        return photoResult.results[0];
      }
    } else {
      await this.selectPhotoIndexError(tryCount, id, accessHash, type);
    }
  }

  async selectPhotoError(tryCount, id, accessHash, type) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectPhoto超出tryCount限制");
      this.sendLog("selectPhoto", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectPhoto(tryCount + 1, id, accessHash, type);
    }
  }

  async selectPhoto(tryCount, id, accessHash, type) {
    this.apiCount += 1;
    let photoResult = {};
    try {
      photoResult = await this.env.PHOTODB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTO` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(id, accessHash, type).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectPhoto出错 : " + e);
      this.sendGrid("selectPhoto", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectPhotoError(tryCount, id, accessHash, type);
      return;
    }
    //console.log("photoResult : " + photoResult);  //测试
    if (photoResult.success === true) {
      if (photoResult.results && photoResult.results.length > 0) {
        return photoResult.results[0];
      }
    } else {
      await this.selectPhotoError(tryCount, id, accessHash, type);
    }
  }

  async insertPhotoError(tryCount, id, accessHash, dcId, photoIndex, type, size, hash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertPhoto超出tryCount限制");
      this.sendLog("insertPhoto", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertPhoto(tryCount + 1, id, accessHash, dcId, photoIndex, type, size, hash);
    }
  }

  async insertPhoto(tryCount, id, accessHash, dcId, photoIndex, type, size, hash) {
    this.apiCount += 1;
    let photoResult = {};
    try {
      photoResult = await this.env.PHOTODB.prepare("INSERT INTO `PHOTO` (id, accessHash, dcId, sizeType, size, hash) VALUES (?, ?, ?, ?, ?, ?);").bind(id, accessHash, dcId, type, size, JSON.stringify(hash)).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : (" + photoLength +"/" + photoIndex + ") insertPhoto出错 : " + e);
      this.sendPhoto("insertPhoto", "出错 : " + JSON.stringify(e), photoIndex, "try", true);
      await this.insertPhotoError(tryCount, id, accessHash, dcId, photoIndex, type, size, hash);
      return;
    }
    //console.log(photoResult);  //测试
    if (photoResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入photo数据成功");
      this.sendPhoto("insertPhoto", "", photoIndex, "success", false);
      return photoResult.meta.last_row_id;
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入photo数据失败");
      this.sendPhoto("insertPhoto", "插入photo数据失败", photoIndex, "error", true);
      await this.insertPhotoError(tryCount, id, accessHash, dcId, photoIndex, type, size, hash);
      return 0;
    }
  }

  async insertPhotoIndexError(tryCount, Pindex, id, accessHash, type) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertPhotoIndex超出tryCount限制");
      this.sendLog("insertPhotoIndex", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertPhotoIndex(tryCount + 1, Pindex, id, accessHash, type);
    }
  }

  async insertPhotoIndex(tryCount, Pindex, id, accessHash, type) {
    this.apiCount += 1;
    let photoResult = {};
    try {
      photoResult = await this.env.MAINDB.prepare("INSERT INTO `PHOTOINDEX` (Pindex, id, accessHash, sizeType) VALUES (?, ?, ?, ?);").bind(Pindex, id, accessHash, type).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertPhotoIndex出错 : " + e);
      this.sendGrid("insertPhotoIndex", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertPhotoIndexError(tryCount, Pindex, id, accessHash, type);
      return;
    }
    //console.log(photoResult);  //测试
    if (photoResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入photoIndex数据成功");
      this.sendGrid("insertPhotoIndex", "", "success", false);
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入photoIndex数据失败");
      this.sendGrid("insertPhotoIndex", "插入photoIndex数据失败", "error", true);
      await this.insertPhotoIndexError(tryCount, Pindex, id, accessHash, type);
    }
  }

  async endMessage(category, count, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, photoIndex, type, hash) {
    if (this.stop === 1) {
      //console.log(count + " : " + hash.length);  //测试
      if (hash.length === count) {
        let index = 0;
        if (category === 1) {
          index = await this.insertPhoto(1, id, accessHash, dcId, photoIndex, type, size, hash);
          if (index > 0) {
            await this.insertPhotoIndex(1, index, id, accessHash, type);
          }
        } else if (category === 2) {
          index = await this.insertMedia(1, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash);
          if (index > 0) {
            await this.insertMediaIndex(1, index, id, accessHash);
          }
        }
        return index;
      } else {
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : count不一至 : " + count + " - " + hash.length);
        this.sendGrid("endMessage", "count不一至 : " + count + " - " + hash.length, "error", true);
        return 0;
      }
      //this.offsetId += 1;
    } else if (this.stop === 2) {
      await this.updateChat(1);
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async selectMessageError(tryCount, messageId) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectMessage超出tryCount限制");
      this.sendLog("selectMessage", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectMessage(tryCount + 1, messageId);
    }
  }

  async selectMessage(tryCount, messageId) {
    this.apiCount += 1;
    let messageResult = null;
    try {
      messageResult = await this.env.MAINDB.prepare("SELECT COUNT(id) FROM `MESSAGE` WHERE `id` = ? LIMIT 1;").bind(messageId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectMessage出错 : " + e);
      this.sendGrid("selectMessage", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectMessageError(tryCount, messageId);
      return;
    }
    //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
    if (messageResult.success === true) {
      if (messageResult.results && messageResult.results.length > 0) {
        return messageResult.results[0]["COUNT(id)"];
      }
    } else {
      await this.selectMessageError(tryCount, messageId);
    }
  }

  async insertMessageError(tryCount, messageId, category, txt, ids, status) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertMessage超出tryCount限制");
      this.sendLog("insertMessage", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertMessage(tryCount + 1, messageId, category, txt, ids, status);
    }
  }

  async insertMessage(tryCount, messageId, category, txt, ids, status) {
    this.apiCount += 1;
    let messageResult = {};
    let dbIndex = 0;
    if (category === 1) {
      dbIndex = this.photoDBIndex;
    } else if (category === 2) {
      dbIndex = this.mediaDBIndex;
    }
    try {
      messageResult = await this.env.MAINDB.prepare("INSERT INTO `MESSAGE` (id, dbIndex, category, txt, ids, status) VALUES (?, ?, ?, ?, ?, ?);").bind(messageId, dbIndex, category, txt, JSON.stringify(ids), status).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertMessage出错 : " + e);;
      this.sendGrid("insertMessage", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertMessageError(tryCount, messageId, category, txt, ids, status);
      return;
    }
    //console.log(messageResult);  //测试
    if (messageResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入message数据成功");
      this.sendGrid("insertMessage", "", "success", false);
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入message数据失败");
      this.sendGrid("insertMessage", "插入message数据失败", "error", true);
      await this.insertMessageError(tryCount, messageId, category, txt, ids, status);
    }
  }

  async endInsert(messageId, category, txt, ids, status) {
    const messageCount = await this.selectMessage(1, messageId);
    if (parseInt(messageCount) === 0) {
      await this.insertMessage(1, messageId, category, txt, ids, status);
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : message已在数据库中");
      this.sendGrid("endInsert", "", "exist", false);
    }
  }

  async getMedia(message) {
    const messageId = message.id;
    const id = message.media.document.id.toString();
    const accessHash = message.media.document.accessHash.toString();
    if (id && accessHash) {
      const mediaIndexResult = await this.selectMediaIndex(1, id, accessHash);
      if (mediaIndexResult) {
        let status = 0;
        let duration = 0;
        let width = 0;
        let height = 0;
        let fileName = "";
        const category = 2;
        const txt = message.message;
        const ids = [];
        const mediaIndexCount = parseInt(mediaIndexResult["COUNT(id)"]);
        if (mediaIndexCount === 0) {
          const mediaResult = await this.selectMedia(1, id, accessHash);
          if (mediaResult) {
            const mediaCount = parseInt(mediaResult["COUNT(id)"]);
            if (mediaCount === 0) {
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 准备查询视频的hash");
              const attributes = message.media.document.attributes;
              if (attributes.length > 0) {
                for (const attribute of attributes) {
                  if (attribute) {
                    if (attribute.className === "DocumentAttributeVideo") {
                      duration = attribute.duration;
                      width = attribute.w;
                      height = attribute.h;
                    } else if (attribute.className === "DocumentAttributeFilename") {
                      fileName = attribute.fileName;
                    }
                  }
                }
              }
              //console.log(duration + " - " + width + " - " + height + " - " + fileName);  //测试
              let offset = 0;
              let hashIndex = 0;
              let hash = [];
              const info = utils.getFileInfo(message.media);
              const dcId = info.dcId;
              const location = info.location;
              const size = parseInt(message.media.document.size);
              const mimeType = message.media.document.mimeType;
              const sender = await this.client.getSender(dcId);
              const count = Math.ceil(size / 131072);
              const hashLength = Math.ceil(size / (131072 * 8));
              this.broadcast({
                "step": this.currentStep,
                "operate": "getMedia",
                "offsetId": this.offsetId,
                "category": category,
                "dcId": dcId,
                "size": size,
                "type": mimeType,
                "fileName": fileName,
                "duration": duration,
                "width": width,
                "height": height,
                "hashLength": hashLength,
                "status": "update",
                "date": new Date().getTime(),
              });
              const cacheHash = await this.getCache(id, accessHash);
              if (cacheHash) {
                if (cacheHash.offset) {
                  offset = cacheHash.offset;
                }
                if (cacheHash.hashIndex) {
                  hashIndex = cacheHash.hashIndex;
                }
                if (cacheHash.hash) {
                  hash = cacheHash.hash;
                }
                //console.log(this.offsetId + " : 从(" + hashLength + " | " + hashIndex + ")处继续");
                this.sendLog("getMedia", this.offsetId + " : 从(" + hashLength + " | " + hashIndex + ")处继续", "cache", false);
              }
              if (hashLength > 0) {
                await this.nextHash(location, sender, category, id, accessHash, size, offset, hashLength, hashIndex, 0, hash);
              }
              // if (this.error === false) {
                if (this.stop === 1) {
                  const lastId = await this.endMessage(category, count, id, accessHash, dcId, fileName, mimeType, size, duration, width, height, 0, "", hash);
                  if (lastId && lastId > 0) {
                    status = 1;
                    ids.push(lastId);
                  }
                  await this.endInsert(messageId, category, txt, ids, status);
                  this.offsetId += 1;
                } else if (this.stop === 2) {
                  await this.updateChat(1);
                  this.broadcast({
                    "result": "pause",
                  });
                  await this.close();
                }
              // } else {
              //   this.error = false;
              //   this.offsetId += 1;
              // }
            } else {
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 视频已入过库了");
              this.sendGrid("getMedia", "", "fileExist", false);
              const Vindex = mediaResult.Vindex;
              if (Vindex && Vindex > 0) {
                status = 1;
                ids.push(Vindex);
                await this.insertMediaIndex(1, Vindex, id, accessHash);
              }
              await this.endInsert(messageId, category, txt, ids, status);
              this.offsetId += 1;
            }
          } else {
            //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 视频的mediaResult错误");
            this.sendGrid("getMedia", "视频的mediaResult错误", "error", true);
            this.offsetId += 1;
          }
        } else {
          //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 视频已入过索引库了");
          this.sendGrid("getMedia", "", "indexExist", false);
          const Vindex = mediaIndexResult.Vindex;
          if (Vindex && Vindex > 0) {
            status = 1;
            ids.push(Vindex);
          }
          await this.endInsert(messageId, category, txt, ids, status);
          this.offsetId += 1;
        }
      } else {
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 视频的mediaIndexResult错误");
        this.sendGrid("getMedia", "视频的mediaIndexResult错误", "error", true);
        this.offsetId += 1;
      }
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 视频的id或accessHash错误");
      this.sendGrid("getMedia", "视频的id或accessHash错误", "error", true);
      this.offsetId += 1;
    }
  }

  async getPhoto(message) {
    const messageId = message.id;
    const id = message.media.photo.id.toString();
    const accessHash = message.media.photo.accessHash.toString();
    if (id && accessHash) {
      const photoInfo = utils.getPhotoInfo(message.media);
      const photoLength = photoInfo.length;
      //console.log("photoLength : " + photoLength);  //测试
      if (photoLength && photoLength > 0) {
        let status = 0;
        const category = 1;
        const txt = message.message;
        const ids = [];
        this.broadcast({
          "step": this.currentStep,
          "operate": "getPhoto",
          "offsetId": this.offsetId,
          "category": category,
          "photoLength": photoLength,
          "status": "update",
          "date": new Date().getTime(),
        });
        for (let index = 0; index < photoLength; index++) {
          const photoIndex = index + 1;
          const type = photoInfo[index].type;
          const photoIndexResult = await this.selectPhotoIndex(1, id, accessHash, type);
          if (photoIndexResult) {
            const photoIndexCount = parseInt(photoIndexResult["COUNT(id)"]);
            if (photoIndexCount === 0) {
              const photoResult = await this.selectPhoto(1, id, accessHash, type);
              if (photoResult) {
                const photoCount = parseInt(photoResult["COUNT(id)"]);
                if (photoCount === 0) {
                  const dcId = photoInfo[index].dcId;
                  const location = photoInfo[index].location;
                  const size = photoInfo[index].size;
                  //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : (" + photoLength +"/" + photoIndex + ") 准备查询图片"+ type + "的hash");
                  this.broadcast({
                    "step": this.currentStep,
                    "operate": "getPhoto",
                    "offsetId": this.offsetId,
                    "photoIndex": photoIndex,
                    "dcId": dcId,
                    "type": type,
                    "size": size,
                    "status": "update",
                    "date": new Date().getTime(),
                  });
                  const hash = [];
                  const sender = await this.client.getSender(dcId);
                  const count = Math.ceil(size / 131072);
                  const hashLength = Math.ceil(size / (131072 * 8));
                  if (hashLength > 0) {
                    await this.nextHash(location, sender, category, id, accessHash, size, 0, hashLength, 0, 0, hash);
                  }
                  // if (this.error === false) {
                    if (this.stop === 1) {
                      const lastId = await this.endMessage(category, count, id, accessHash, dcId, "", "", size, 0, 0, 0, photoIndex, type, hash);
                      if (lastId && lastId > 0) {
                        status = 1;
                        ids.push(lastId);
                      }
                      await scheduler.wait(1000);
                    } else if (this.stop === 2) {
                      await this.updateChat(1);
                      this.broadcast({
                        "result": "pause",
                      });
                      await this.close();
                    }
                  // } else {
                  //   this.error = false;
                  // }
                } else {
                  //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : (" + photoLength +"/" + photoIndex + ") 图片"+ type + "已入过库了");
                  this.sendPhoto("getPhoto", "", photoIndex, "fileExist", false);
                  const Pindex = photoResult.Pindex;
                  if (Pindex && Pindex > 0) {
                    status = 1;
                    ids.push(Pindex);
                    await this.insertPhotoIndex(1, Pindex, id, accessHash);
                  }
                }
              } else {
                //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的photoResult错误");
                this.sendPhoto("getPhoto", "图片的photoResult错误", photoIndex, "error", true);
                this.offsetId += 1;
              }
            } else {
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片已入过索引库了");
              this.sendPhoto("getPhoto", "", photoIndex, "indexExist", false);
              const Vindex = photoIndexResult.Vindex;
              if (Vindex && Vindex > 0) {
                status = 1;
                ids.push(Vindex);
              }
              await this.endInsert(messageId, category, txt, ids, status);
              this.offsetId += 1;
            }
          } else {
            //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的photoIndexResult错误");
            this.sendPhoto("getPhoto", "图片的photoIndexResult错误", photoIndex, "error", true);
          }
          // await scheduler.wait(1000);
        }
        await this.endInsert(messageId, category, txt, ids, status);
        this.offsetId += 1;
      } else {
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的info错误");
        this.sendPhoto("getPhoto", "图片的info错误", photoIndex, "error", true);
        this.offsetId += 1;
      }
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的id或accessHash错误");
      this.sendPhoto("getPhoto", "图片的id或accessHash错误", photoIndex, "error", true);
      this.offsetId += 1;
    }
  }

  async getFile(message) {
    const messageId = message.id;
    const id = message.media.document.id.toString();
    const accessHash = message.media.document.accessHash.toString();
    if (id && accessHash) {
      const photoIndexResult = await this.selectPhotoIndex(1, id, accessHash,"p");
      if (photoIndexResult) {
        let status = 0;
        const category = 1;
        const txt = message.message;
        const ids = [];
        const photoIndexCount = parseInt(photoIndexResult["COUNT(id)"]);
        if (photoIndexCount === 0) {
          const photoResult = await this.selectPhoto(1, id, accessHash,"p");
          if (photoResult) {
            const photoCount = parseInt(photoResult["COUNT(id)"]);
            if (photoCount === 0) {
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 准备查询图片的hash");
              let offset = 0;
              let hashIndex = 0;
              let hash = [];
              const info = utils.getFileInfo(message.media);
              const dcId = info.dcId;
              const location = info.location;
              const size = parseInt(message.media.document.size);
              const mimeType = message.media.document.mimeType;
              const sender = await this.client.getSender(dcId);
              const count = Math.ceil(size / 131072);
              const hashLength = Math.ceil(size / (131072 * 8));
              this.broadcast({
                "step": this.currentStep,
                "operate": "getFile",
                "offsetId": this.offsetId,
                "category": category,
                "dcId": dcId,
                "size": size,
                "type": mimeType,
                "hashLength": hashLength,
                "status": "update",
                "date": new Date().getTime(),
              });
              if (hashLength > 0) {
                await this.nextHash(location, sender, category, id, accessHash, size, offset, hashLength, hashIndex, 0, hash);
              }
              // if (this.error === false) {
                if (this.stop === 1) {
                  const lastId = await this.endMessage(category, count, id, accessHash, dcId, "", "", size, 0, 0, 0, 1, "p", hash);
                  if (lastId && lastId > 0) {
                    status = 1;
                    ids.push(lastId);
                  }
                  await this.endInsert(messageId, category, txt, ids, status);
                  this.offsetId += 1;
                } else if (this.stop === 2) {
                  await this.updateChat(1);
                  this.broadcast({
                    "result": "pause",
                  });
                  await this.close();
                }
              // } else {
              //   this.error = false;
              //   this.offsetId += 1;
              // }
            } else {
              //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片已入过库了");
              this.sendGrid("getFile", "", "fileExist", false);
              const Vindex = photoResult.Vindex;
              if (Vindex && Vindex > 0) {
                status = 1;
                ids.push(Vindex);
                await this.insertPhotoIndex(1, Vindex, id, accessHash,"p");
              }
              await this.endInsert(messageId, category, txt, ids, status);
              this.offsetId += 1;
            }
          } else {
            //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的photoResult错误");
            this.sendGrid("getFile", "图片的photoResult错误", "error", true);
            this.offsetId += 1;
          }
        } else {
          //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片已入过索引库了");
          this.sendGrid("getFile", "", "indexExist", false);
          const Vindex = photoIndexResult.Vindex;
          if (Vindex && Vindex > 0) {
            status = 1;
            ids.push(Vindex);
          }
          await this.endInsert(messageId, category, txt, ids, status);
          this.offsetId += 1;
        }
      } else {
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的photoIndexResult错误");
        this.sendGrid("getFile", "图片的photoIndexResult错误", "error", true);
        this.offsetId += 1;
      }
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 图片的id或accessHash错误");
      this.sendGrid("getFile", "图片的id或accessHash错误", "error", true);
      this.offsetId += 1;
    }
  }

  async nextMessage(messageLength, messageIndex, message) {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        if (message) {
          const time = new Date().getTime();
          this.broadcast({
            "step": this.currentStep,
            "operate": "nextMessage",
            // "messageLength": messageLength,
            // "messageIndex": messageIndex,
            "chatId": this.chatId,
            "offsetId": this.offsetId,
            "messageId": message.id,
            "status": "add",
            "time": time,
            "date": time,
          });
          if (message.media) {
            if (message.media.document) {
              const mimeType = message.media.document.mimeType;
              if (mimeType.startsWith("video/")) {
                await this.getMedia(message);
              } else if (mimeType.startsWith("image/")) {
                await this.getFile(message);
              } else if (mimeType.startsWith("application/")) {
                // console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : application");
                this.sendGrid("nextMessage", "application", "error", true);
                this.offsetId += 1;
              } else {
                // console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 未知的媒体");
                this.sendGrid("nextMessage", "未知的媒体", "error", true);
                this.offsetId += 1;
              }
            } else if (message.media.photo) {
              await this.getPhoto(message);
            }
          } else {
            //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 消息不包含媒体");
            this.sendGrid("nextMessage", "消息不包含媒体", "error", true);
            this.offsetId += 1;
          }
        } else {
          //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 错误的消息");
          this.sendGrid("nextMessage", "错误的消息", "error", true);
          this.offsetId += 1;
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : nextMessage超出apiCount限制");
        this.sendGrid("nextMessage", "超出apiCount限制", "limit", true);
        await this.updateChat(1);
        //await this.insertCache(1, category, id, accessHash, offset, hashLength, photoIndex, hash);
        await this.close();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      await this.updateChat(1);
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async nextStep() {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        this.currentStep += 1;
        const messageCount = await this.getMessage(1);
        await scheduler.wait(3000);
        const messageArray = this.messageArray.slice();
        const messageLength = messageArray.length;
        this.messageArray = [];
        if (messageLength && messageLength > 0) {
          //console.log("(" + this.currentStep + ")messageLength : " + messageLength);
          this.sendLog("nextStep", "messageLength : " + messageLength, null, false);
          if (this.stop === 1) {
            for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
              await this.nextMessage(messageLength, messageIndex + 1, messageArray[messageIndex]);
              // this.offsetId += 1;
            }
            await this.updateChat(1);
            if (this.stop === 1) {
              if (this.apiCount < 900) {
                await this.nextStep();
              } else {
                this.stop = 2;
                //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
                this.sendLog("nextStep", "超出apiCount限制", "limit", true);
                //await this.insertCache(1, category, id, accessHash, offset, hashLength, hashIndex, hash);
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
            await this.updateChat(1);
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        } else if (messageCount > 0) {
          //console.log("(" + this.currentStep + ")messageCount : " + messageCount);
          this.sendLog("nextStep", "messageCount : " + messageCount, null, true);
          this.offsetId += this.limit;
          await this.updateChat(1);
          if (this.stop === 1) {
            await this.nextStep();
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        } else {
          await this.updateChat(1);
          this.fromPeer = null;
          //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
          this.sendLog("nextStep", this.chatId + " : 当前chat采集完毕", null, false);
          this.broadcast({
            "result": "end",
          });
          this.chatId += 1;
          if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
            await this.getChat();
            if (this.fromPeer) {
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
              this.sendLog("nextStep", "全部chat采集完毕", null, false);
              this.broadcast({
                "result": "over",
              });
              await this.close();
            }
          } else {
            //console.log(this.endChat + " : 超过最大chat了");  //测试
            this.sendLog("nextStep", this.endChat + " : 超过最大chat了", null, true);
          }
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
        this.sendLog("nextStep", "超出apiCount限制", "limit", true);
        await this.updateChat(1);
        //await this.insertCache(1, category, id, accessHash, offset, hashLength, hashIndex, hash);
        await this.close();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      await this.updateChat(1);
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

  async start(option) {
    if (this.client || this.stop === 1) {
    // if (this.stop === 1) {
      this.ws.send(JSON.stringify({
        "step": this.currentStep,
        "operate": "start",
        "message": "服务已经运行过了",
        "error": true,
        "date": new Date().getTime(),
      }));
      return;
    }
    this.init(option);
    // this.stop = 1;
    await this.open(1);
    if (!option || !option.chatId || !option.filterType || !option.reverse || !option.limited) {
      await this.getConfig(1, option);
    }
    if (this.filterType === 1) {
      this.timeOver = setTimeout(async function() {
        this.sendLog("start", "过了1分钟没任何响应", null, true);
        this.offsetId += 1;
        await this.updateChat(1);
        await this.close();
      }, 60000);
    }
    this.switchType();
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
        const messageCount = await this.getMessage(1);
        await scheduler.wait(3000);
        const messageArray = this.messageArray.slice();
        const messageLength = messageArray.length;
        this.messageArray = [];
        this.sendLog("start", "messageLength : " + messageLength, null, false);  //测试
        if (messageLength && messageLength > 0) {
          for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
            await this.nextMessage(messageLength, messageIndex + 1, messageArray[messageIndex]);
            // this.offsetId += 1;
          }
          await this.updateChat(1);
          if (this.stop === 1) {
            if (this.apiCount < 900) {
              await this.nextStep();
            } else {
              this.stop = 2;
              //console.log("(" + this.currentStep + ")start超出apiCount限制");
              this.sendLog("start", "超出apiCount限制", "limit", true);
              await this.close();
              // this.ctx.abort("reset");
            }
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        } else if (messageCount > 0) {
          //console.log("(" + this.currentStep + ")messageCount : " + messageCount");
          this.sendLog("start", "messageCount : " + messageCount, null, true);
          this.offsetId += this.limit;
          await this.updateChat(1);
          if (this.stop === 1) {
            await this.nextStep();
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        } else {
          await this.updateChat(1);
          this.fromPeer = null;
          //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
          this.sendLog("start", this.chatId + " : 当前chat采集完毕", null, false);
          this.broadcast({
            "result": "end",
          });
          this.chatId += 1;
          if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
            await this.getChat();
            if (this.fromPeer) {
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
              this.sendLog("start", "全部chat采集完毕", null, false);
              this.broadcast({
                "result": "over",
              });
              await this.close();
            }
          } else {
            //console.log(this.endChat + " : 超过最大chat了");  //测试
            this.sendLog("start", this.endChat + " : 超过最大chat了", null, true);
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
      this.sendLog("start", "全部chat采集完毕", null, false);
      this.broadcast({
        "result": "over",
      });
      await this.close();
    }
  }

  async getDialog(tryCount) {
    try {
      for await (const dialog of this.client.iterDialogs({})) {
        if (dialog.isChannel === true) {
          this.dialogArray.push(dialog);
        }
      }
    } catch (e) {
      this.dialogArray = [];
      //console.log("(" + this.currentStep + ")getDialog出错 : " + e);
      this.sendLog("getDialog", "出错 : " + JSON.stringify(e), null, true);
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")getDialog超出tryCount限制");
        this.sendLog("getDialog", "超出tryCount限制", null, true);
        await this.close();
      } else {
        await scheduler.wait(10000);
        await this.getDialog(tryCount + 1);
      }
      return;
    }
  }

  async selectChatError(tryCount, channelId, accessHash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("selectChat超出tryCount限制");
      this.sendLog("selectChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectChat(tryCount + 1, channelId, accessHash);
    }
  }

  async selectChat(tryCount, channelId, accessHash) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("SELECT COUNT(Cindex) FROM `CHAT` WHERE `tgId` = 0 AND `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(channelId, accessHash).run();
    } catch (e) {
      //console.log("selectChat出错 : " + e);
      this.sendLog("selectChat", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectChatError(tryCount, channelId, accessHash);
      return;
    }
    //console.log("chatResult : " + chatResult["COUNT(Cindex)"]);  //测试
    if (chatResult.success === true) {
      if (chatResult.results && chatResult.results.length > 0) {
        return chatResult.results[0]["COUNT(Cindex)"];
      }
    } else {
      await this.selectChatError(tryCount, channelId, accessHash);
    }
  }

  async insertChatError(tryCount, channelId, accessHash, username, title) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("insertChat超出tryCount限制");
      this.sendLog("insertChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertChat(tryCount + 1, channelId, accessHash, username, title);
    }
  }

  async insertChat(tryCount, channelId, accessHash, username, title) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("INSERT INTO `CHAT` (channelId, accessHash, username, title, current, photo, video, document, gif, exist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(channelId, accessHash, username, title, 0, 0, 0, 0, 0, 1).run();
    } catch (e) {
      //console.log("insertChat出错 : " + e);;
      this.sendLog("insertChat", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertChatError(tryCount, channelId, accessHash, username, title);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("插入chat数据成功");
      this.sendLog("insertChat", "插入chat数据成功", "success", false);
    } else {
      //console.log("插入chat数据失败");
      this.sendLog("insertChat", "插入chat数据失败", "error", true);
      await this.insertChatError(tryCount, channelId, accessHash, username, title);
    }
  }

  async chat() {
    // if (this.client || this.stop === 1) {
    // // if (this.stop === 1) {
    //   this.ws.send(JSON.stringify({
    //     "step": this.currentStep,
    //     "operate": "chat",
    //     "message": "服务已经运行过了",
    //     "error": true,
    //     "date": new Date().getTime(),
    //   }));
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
      if (this.stop === 1) {
        if (this.apiCount < 900) {
          let channelId = "";
          let accessHash = "";
          if (dialog.isChannel === true) {
            channelId = dialog.inputEntity.channelId.toString();
            accessHash = dialog.inputEntity.accessHash.toString();
          } else {
            // channelId = dialog.id.toString();
            continue;
          }
          //console.log(channelId + " : " + accessHash);  //测试
          if (channelId && accessHash) {
            const chatCount = await this.selectChat(1, channelId, accessHash);
            //console.log("chatCount : " + chatCount);  //测试
            if (parseInt(chatCount) === 0) {
              count += 1;
              const username = dialog.entity.username || dialog.draft._entity.username || "";
              await this.insertChat(1, channelId, accessHash, username, dialog.title);
              //console.log("chat - 新插入chat了 : " + dialog.title);
              this.sendLog("chat", "新插入chat了 : " + dialog.title, null, false);
            } else {
              //console.log("chat - " + count + " : chat已在数据库中 - " + dialog.title);
              this.sendLog("chat", "chat已在数据库中 - " + dialog.title, null, false);
            }
          } else {
            //console.log("chat - channelId或accessHash错误 : " + dialog.title);
            this.sendLog("chat", "channelId或accessHash错误 : " + dialog.title, null, true);
          }
        } else {
          this.stop = 2;
          //console.log("chat - 超出apiCount限制");
          this.sendLog("chat", "超出apiCount限制", "limit", true);
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
    if (count > 0) {
      //console.log("chat - 新插入了" + count + "条chat数据");
      this.sendLog("chat", "新插入了" + count + "条chat数据", null, false);
    }
    await this.close();
  }

  async webSocketMessage(ws, data) {
    let command = "";
    let option = null;
    // if (typeof data === "string") {
      try {
        data = JSON.parse(data);
        command = data.command;
        delete data.command;
        if (JSON.stringify(data) !== "{}") {
          option = data;
        }
      } catch (e) {
        command = data;
        //console.log("parse出错 : " + e);
        this.sendLog("webSocketMessage", "parse出错 : " + e, null, true);
      }
    // }
    if (command === "start") {
      await this.start(option);
    } else if (command === "pause") {
      this.stop = 2;
    } else if (command === "close") {
      this.stop = 2;
      await this.close();
    } else if (command === "over") {
      this.stop = 2;
      this.broadcast({
        "result": "over",
      });
      await this.close();
    } else if (command === "clear") {
      await this.ctx.storage.deleteAll();
      //console.log("删除cache成功");
      this.broadcast({
        "step": this.currentStep,
        "operate": "clearCache",
        "message": "删除cache成功",
        "error": true,
        "date": new Date().getTime(),
      });
    // } else if (command === "count") {
    //   const mediaResult = await countMedia(this.env);
    //   if (mediaResult >= 0) {
    //     //console.log(mediaResult);
    //     this.broadcast({
    //       "step": this.currentStep,
    //       "operate": "count",
    //       "message": mediaResult,
    //       "date": new Date().getTime(),
    //     });
    //   } else {
    //     //console.log("获取media总数失败");
    //     this.broadcast({
    //       "step": this.currentStep,
    //       "operate": "count",
    //       "message": "获取media总数失败",
    //       "error": true,
    //       "date": new Date().getTime(),
    //     });
    //   }
    } else if (command === "chat") {
      await this.chat();
    } else if (command === "compress") {
      this.compress = true;
    } else if (command === "noCompress") {
      this.compress = false;
    } else if (command === "batch") {
      this.batch = true;
    } else if (command === "noBatch") {
      this.batch = false;
    } else if (command === "chatId") {
      if (data.chatId && data.chatId >= 0 && this.chatId !== data.chatId) {
        this.chatId = data.chatId;
      }
    } else if (command === "offsetId") {
      if (data.offsetId && data.offsetId >= 0 && this.offsetId !== data.offsetId) {
        this.offsetId = data.offsetId;
      }
    } else if (command === "endChat") {
      if (data.endChat && data.endChat > 0 && this.endChat !== data.endChat) {
        this.endChat = data.endChat;
      }
    } else if (command === "backup") {
      if (option && option.id && option.id >= 0) {
        const name = getDB(option.id);
        if (name) {
          const signed_url = await exportDB(name);
          if (signed_url) {
            this.broadcast({
              "operate": "backup",
              "message": signed_url,
              "date": new Date().getTime(),
            });
          } else {
            this.broadcast({
              "operate": "backup",
              "message": "获取signed_url失败",
              "error": true,
              "date": new Date().getTime(),
            });
          }
        } else {
          this.broadcast({
            "operate": "backup",
            "message": "获取db失败",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      } else {
        this.broadcast({
          "operate": "backup",
          "message": "要备份的数据库id不能为空",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } else {
      this.broadcast({
        "operate": "webSocketMessage",
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
    // } else if (pathname === "/clear") {
    } else if (pathname === "/count") {
      const mediaResult = await countMedia(env);
      if (mediaResult >= 0) {
        return new Response(mediaResult);
      } else {
        return new Response("获取media总数失败");
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
