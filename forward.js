import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions, utils } from "./teleproto";
import { LogLevel } from "./teleproto/extensions";
import bigInt from "big-integer";

export class WebSocketServer extends DurableObject {
  // webSocket = [];
  ws = null;
  stop = 0;
  apiCount = 0;
  currentStep = 0;
  compress = false;
  batch = false;
  client = null;
  chatId = 0;
  endChat = 0;
  lastChat = 0;
  reverse = true;
  limit = 10;
  offsetId = 0;
  // error = false;
  fromPeer = null;
  toPeer = null;
  waitTime = 60000;
  pingTime = 5000;
  count = 0;
  errorCount = 0;
  flood = 0;
  time = 0;
  filterType = 0;
  filter = Api.InputMessagesFilterVideo;
  //filterTitle = "媒体";
  messageArray = [];
  cacheMessage = null;
  batchMessage = [];

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
      this.apiCount = 0;
      this.currentStep = 0;
      this.lastChat = 0;
      // this.error = false;
      this.fromPeer = null;
      this.toPeer = null;
      this.waitTime = 60000;
      this.pingTime = 5000;
      this.count = 0;
      this.errorCount = 0;
      this.flood = 0;
      this.time = 0;
      this.messageArray = [];
      this.filter = Api.InputMessagesFilterVideo;
      //this.filterTitle = "媒体";
      this.cacheMessage = null;
      this.batchMessage = [];
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
    if (this.compress === true) {
      if (message.operate === "forwardMessage") {
        if (message.status === "update") {
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
      } else if (message.operate === "open") {
      } else if (message.operate === "close") {
      } else if (message.operate === "checkChat") {
      } else if (message.operate === "chat") {
      } else if (message.status === "limit") {
      } else if (message.status === "flood") {
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
      "chatId": this.chatId,
      "offsetId": this.offsetId,
      "operate": operate,
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

  sendForward(operate, message, messageLength, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "chatId": this.chatId,
      "offsetId": this.offsetId,
      "operate": operate,
      "messageLength": messageLength,
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
        timeout: 5,
        retryDelay: 1000,
        connectionRetries: 5,
        autoReconnect: true,
        deviceModel: "Desktop",
        systemVersion: "Windows 11",
        appVersion: "6.7.6 x64",
        langCode: "en",
        systemLangCode: "en-US",
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
      configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'forward' AND `tgId` = 0 LIMIT 1;").run();
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
      chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(Cindex).run();
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
    if (chatResult.chatType === 1) {
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
              // this.errorCount = await this.ctx.storage.get(this.chatId) || 0;
              this.sendGrid("checkChat", this.chatId + " : " + chatResult.title, "add", false);
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
    } else if (chatResult.chatType === 2) {
      if (chatResult.channelId) {
        let users = null;
        try {
          users = await this.client.invoke(
            new Api.users.GetUsers({
              id: [
                new Api.InputUser({
                  userId: bigInt(chatResult.channelId),
                  accessHash: chatResult.accessHash ? bigInt(chatResult.accessHash) : bigInt.zero,
                }),
              ],
            })
          );
        } catch (e) {
          //console.log("(" + this.currentStep + ")出错 : " + e);
          this.sendLog("checkChat", "出错 : " + JSON.stringify(e), null, true);
          if (tryCount === 20) {
            this.stop = 2;
            //console.log("(" + this.currentStep + ")checkChat超出tryCount限制");
            this.sendLog("checkChat", "超出tryCount限制", null, true);
            await this.close();
          } else {
            await scheduler.wait(10000);
            await this.checkChat(tryCount + 1, chatResult);
          }
          return;
        }
        if (users.length && !(users[0] instanceof Api.UserEmpty)) {
          if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
            this.chatId = chatResult.Cindex;
            this.fromPeer = utils.getInputPeer(users[0]);
            if (this.fromPeer) {
              this.setOffsetId(chatResult);
              // this.errorCount = await this.ctx.storage.get(this.chatId) || 0;
              this.sendGrid("checkChat", this.chatId + " : " + chatResult.title, "add", false);
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
          //console.log(chatResult.title + " : channelId出错");  //测试
          this.sendLog("checkChat", chatResult.title + " : channelId出错", null, true);
          await this.nextChat(1, true);
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.sendLog("checkChat", this.endChat + " : 超过最大chat了", null, true);
        }
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
      chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `Cindex` >= ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.chatId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")出错 : " + e);
      this.sendLog("nextChat", "出错 : " + JSON.stringify(e), null, true);
      await this.nextChatError(tryCount, check);
      return;
    }
    //console.log("chatResult : " + chatResult"]);  //测试
    if (chatResult.success === true) {
      if (chatResult.results && chatResult.results.length > 0) {
        if (check === true) {
          await this.checkChat(1, chatResult.results[0]);
        } else {
          this.chatId = chatResult.results[0].Cindex;
          // this.errorCount = await this.ctx.storage.get(this.chatId) || 0;
          this.sendGrid("nextChat", this.chatId + " : " + chatResult.results[0].title, "add", false);
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
          chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `Cindex` = 0 LIMIT 1;").run();
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
            this.sendGrid("getChat", this.chatId + " : " + chatResult.results[0].title, "add", false);
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
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `current` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 1) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `photo` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 2) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `video` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 3) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `document` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // } else if (this.filterType === 4) {
            //   chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `gif` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
            // }
            chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run(this.chatId);
          } catch (e) {
            tryCount += 1;
            //console.log("(" + this.currentStep + ")getChat出错 : " + e);
            this.sendLog("getChat", "出错 : " + JSON.stringify(e), null, true);
            await scheduler.wait(10000);
            return;
          }
          //console.log("chatResult : " + chatResult"]);  //测试
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
      // let count = 0;
      // this.messageArray = [];
      this.count = 0;
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
        // count += 1;
        this.count += 1;
        if (message.noforwards === false) {
          if (message.media) {
            if (message.media.document) {
              this.messageArray.push(message);
            } else if (message.media.photo) {
              this.messageArray.push(message);
            }
          }
        }
      }
      // if (this.count > this.limit) {
      //   //console.log("(" + this.currentStep + ") messageCount比limit大");
      //   this.sendLog("getMessage", "messageCount比limit大", null, true);
      // }
      // return count;
    } catch (e) {
      this.messageArray = [];
      // this.count = 0;
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
        // this.waitTime += 120000;
        if (e.seconds && e.seconds > 0) {
          this.flood = new Date().getTime() + 30000 + e.seconds * 1000;
          await this.ctx.storage.put("client", this.flood);
        }
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

  async updateChatError(tryCount, messageLength) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")updateChat超出tryCount限制");
      this.sendLog("updateChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.updateChat(tryCount + 1, messageLength);
    }
  }

  async updateChat(tryCount, messageLength) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      if (this.filterType === 0) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 1) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `photo` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 2) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `video` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 3) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `document` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      } else if (this.filterType === 4) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `gif` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")updateChat出错 : " + e);
      this.sendLog("updateChat", "出错 : " + JSON.stringify(e), null, true);
      await this.updateChatError(tryCount, messageLength);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("(" + this.currentStep + ")更新chat数据成功 - " + messageLength);
      this.sendLog("updateChat", "更新chat数据成功 - " + messageLength, null, false);
    } else {
      //console.log("(" + this.currentStep + ")更新chat数据失败 - " + messageLength);
      this.sendLog("updateChat", "更新chat数据失败 - " + messageLength, null, true);
      await this.updateChatError(tryCount, messageLength);
    }
  }

  async waitNext(time, flood) {
    if (time && time > 0) {
      if (flood === false) {
        //console.log("(" + this.currentStep + ") 还需等待" + (time / 1000) + "秒");
        this.sendForward("waitNext", "还需等待" + Math.ceil(time / 1000) + "秒", 0, "wait", true);
      }
      // const pingInterval = setInterval(function () {
      //   // this.ws.ping();
      //   this.ws.send("ping");
      // }, 30000);
      // await this.ctx.storage.setAlarm(30000);
      // await scheduler.wait(time);
      // clearInterval(pingInterval);
      // await this.ctx.storage.deleteAlarm();
      if (time > this.pingTime) {
        // const timeLength = Math.floor(time / 60000);
        const timeLength = Math.ceil(time / this.pingTime);
        for (let i = 0; i < timeLength; i++) {
          await scheduler.wait(this.pingTime);
          // this.ws.ping();
          // this.ws.send({
          //   "result": "ping",
          // });
          this.broadcast({
            "result": "ping",
          });
        }
      } else {
        await scheduler.wait(time);
      }
    }
  }

  async getNext() {
    this.fromPeer = null;
    this.chatId += 1;
    this.count = 0;
    if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
      await this.getChat();
      if (this.fromPeer) {
        if (this.chatId != this.lastChat) {
          if (this.lastChat != 0) {
            await this.updateConfig(1);
          }
          this.lastChat = this.chatId;
        }
        if (this.stop === 2) {
          this.broadcast({
            "result": "pause",
          });
          await this.close();
        }
      } else {
        //console.log("(" + this.currentStep + ")全部client的chat采集完毕");
        this.sendLog("getNext", "全部client的chat采集完毕", null, false);
        this.broadcast({
          "result": "over",
        });
        await this.close();
      }
    } else {
      //console.log(this.endChat + " : 超过最大chat了");  //测试
      this.sendLog("getNext", this.endChat + " : 超过最大chat了", null, true);
      await this.close();
    }
  }

  async forwardMessage(idArray, fileIdArray) {
    const messageLength = idArray.length;
    // if (messageLength > this.limit) {
    //   //console.log("(" + this.currentStep + ") messageLength比limit大");
    //   this.sendForward("forwardMessage", "messageLength比limit大", 0, "error", true);
    // }
    //console.log(length);  //测试
    if (this.flood && this.flood > 0) {
      this.count = 0;
      if (this.flood > new Date().getTime()) {
        //console.log("(" + this.currentStep + ") 还需等待" + ((this.flood - new Date().getTime()) / 1000) + "秒的洪水警告时间");
        this.sendForward("forwardMessage", "还需等待" + Math.ceil((this.flood - new Date().getTime()) / 1000) + "秒的洪水警告时间", 0, "flood", true);
        return;
      } else {
        this.flood = 0;
        await this.ctx.storage.put("client", 0);
      }
    } else {
      const time = this.waitTime - (new Date().getTime() - this.time);
      await this.waitNext(time, false);
    }
    if (messageLength > 0) {
      try {
        const forwardResult = await this.client.invoke(new Api.messages.ForwardMessages({
          fromPeer: this.fromPeer,
          id: idArray,
          randomId: fileIdArray,
          toPeer: this.toPeer,
          silent: true,
          background: true,
          withMyScore: true,
          dropAuthor: true,
          dropMediaCaptions: true,
          // noforwards: true,
          // scheduleDate: 0,
          // sendAs: "username",
        }));
        //console.log(forwardResult);
        // this.sendLog("forwardMessage", JSON.stringify(forwardResult), null, false);
      } catch (e) {
        if (e.errorMessage === "RANDOM_ID_DUPLICATE" || e.code === 500) {
          //console.log("(" + this.currentStep + ") " + e);
          this.sendForward(clientIndex, "forwardMessage", JSON.stringify(e), 0, "error", true);
        } else if (e.errorMessage === "CHAT_FORWARDS_RESTRICTED" || e.code === 400) {
          this.offsetId += this.count;
          this.count = 0;
          //console.log("(" + this.currentStep + ") 消息不允许转发" + e);
          this.sendForward("forwardMessage", "消息不允许转发 : " + JSON.stringify(e), 0, "error", true);
          await this.getNext();
          return;
        } else if (e.errorMessage === "FLOOD" || e.code === 420) {
          this.count = 0;
          // this.waitTime += 120000;
          if (e.seconds && e.seconds > 0) {
            this.flood = new Date().getTime() + 30000 + e.seconds * 1000;
            await this.ctx.storage.put("client", this.flood);
          }
          //console.log("(" + this.currentStep + ") 触发了洪水警告，请求太频繁" + e);
          this.sendForward("forwardMessage", "触发了洪水警告，请求太频繁 : " + JSON.stringify(e), 0, "flood", true);
          return;
        } else {
          this.count = 0;
          //console.log("(" + this.currentStep + ") 转发消息时发生错误" + e);
          this.sendForward("forwardMessage", "转发消息时发生错误 : " + JSON.stringify(e), 0, "error", true);
          return;
        }
      }
      this.offsetId += this.count;
      this.count = 0;
      await this.updateChat(1, messageLength);
      //console.log("(" + this.currentStep + ") 成功转发了" + length + "条消息");
      this.sendForward("forwardMessage", "成功转发了" + messageLength + "条消息", messageLength, "update", false);
    } else {
      this.offsetId += this.count;
      this.count = 0;
      await this.updateChat(1, 0);
      this.errorCount += 1;
      // if (this.errorCount >= 3) {
      //   await this.ctx.storage.put(this.chatId, 0);
      //   //console.log("(" + this.currentStep + ") 连续2轮的消息无需转发");
      //   this.sendForward("forwardMessage", "连续2轮的消息无需转发", 0, "error", true);
      //   await this.getNext();
      // } else {
      //   await this.ctx.storage.put(this.chatId, this.errorCount);
        //console.log("(" + this.currentStep + ") 第" + this.errorCount + "轮消息无需转发");
        this.sendForward("forwardMessage", "第" + this.errorCount + "轮消息无需转发", 0, "error", true);
      // }
    }
    this.time = new Date().getTime();
  }

  async nextStep() {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        this.currentStep += 1;
        if (this.flood && this.flood > 0) {
          this.count = 0;
          if (this.flood > new Date().getTime()) {
            const time = this.flood - new Date().getTime();
            //console.log("(" + this.currentStep + ") 还需等待" + Math.ceil(time / 1000) + "秒的洪水警告时间");
            this.sendLog("nextStep", "还需等待" + Math.ceil(time / 1000) + "秒的洪水警告时间", "flood", true);
            await this.waitNext(time, true);
          } else {
            this.flood = 0;
            await this.ctx.storage.put("client", 0);
          }
        }
        await this.getMessage(1);
        await scheduler.wait(5000);
        const messageArray = this.messageArray.slice();
        const messageLength = messageArray.length;
        this.messageArray = [];
        //console.log("(" + this.currentStep + ")messageLength : " + messageLength);  //测试
        // this.sendLog("nextStep", "messageLength : " + messageLength, null, false);  //测试
        // if (messageLength > this.limit) {
        //   //console.log("(" + this.currentStep + ") messageLength比limit大");
        //   this.sendLog("nextStep", "messageLength比limit大", null, true);
        // }
        if (messageLength && messageLength > 0) {
          if (this.stop === 1) {
            const idArray = [];
            const fileIdArray = [];
            for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
              if (!messageArray[messageIndex].noforwards || messageArray[messageIndex].noforwards === false) {
                let fileId = null;
                const id = messageArray[messageIndex].id;
                if (this.filterType === 2) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      fileId = messageArray[messageIndex].media.document.id;
                    }
                  }
                } else if (this.filterType === 1) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.photo) {
                      fileId = messageArray[messageIndex].media.photo.id;
                    }
                  }
                } else if (this.filterType === 3) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      const mimeType = messageArray[messageIndex].media.document.mimeType;
                      if (mimeType.startsWith("video/")) {
                        fileId = messageArray[messageIndex].media.document.id;
                      } else if (mimeType.startsWith("image/")) {
                        fileId = messageArray[messageIndex].media.document.id;
                      // } else if (mimeType.startsWith("application/")) {
                      // } else {
                      }
                    }
                  }
                } else if (this.filterType === 4) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      fileId = messageArray[messageIndex].media.document.id;
                    }
                  }
                } else if (this.filterType === 0) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      fileId = messageArray[messageIndex].media.document.id;
                    } else if (messageArray[messageIndex].media.photo) {
                      fileId = messageArray[messageIndex].media.photo.id;
                    }
                  }
                }
                if (id && fileId) {
                  idArray.push(id);
                  fileIdArray.push(fileId);
                }
              }
            }
            await this.forwardMessage(idArray, fileIdArray);
            if (this.stop === 1) {
              if (this.apiCount < 900) {
                await this.nextStep();
              } else {
                this.stop = 2;
                //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
                this.sendLog("nextStep", "超出apiCount限制", "limit", true);
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
        } else if (this.count > 0) {
          this.offsetId += this.count;
          this.count = 0;
          await this.updateChat(1, 0);
          this.errorCount += 1;
          // if (this.errorCount >= 3) {
          //   await this.ctx.storage.put(this.chatId, 0);
          //   //console.log("(" + this.currentStep + ") 连续3轮没有获取到包含有效媒体的消息");
          //   this.sendForward("nextStep", "连续3轮没有获取到包含有效媒体的消息", 0, "error", true);
          //   await this.getNext();
          // } else {
          //   await this.ctx.storage.put(this.chatId, this.errorCount);
            //console.log("(" + this.currentStep + ") 第" + this.errorCount + "轮没有获取到包含有效媒体的消息");
            this.sendForward("nextStep", "第" + this.errorCount + "轮没有获取到包含有效媒体的消息", 0, "error", true);
          // }
          if (this.stop === 1) {
            if (this.apiCount < 900) {
              await this.nextStep();
            } else {
              this.stop = 2;
              //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
              this.sendLog("nextStep", "超出apiCount限制", "limit", true);
              await this.close();
              // this.ctx.abort("reset");
            }
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
          }
        } else {
          await this.updateChat(1, 0);
          //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
          this.sendLog("nextStep", "当前chat采集完毕", null, false);
          this.broadcast({
            "result": "end",
          });
          await this.getNext();
        }
        if (this.stop === 1) {
          if (this.apiCount < 900) {
            await this.nextStep();
          } else {
            this.stop = 2;
            //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
            this.sendLog("nextStep", "超出apiCount限制", "limit", true);
            await this.close();
            // this.ctx.abort("reset");
          }
        } else if (this.stop === 2) {
          this.broadcast({
            "result": "pause",
          });
          await this.close();
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
        this.sendLog("nextStep", "超出apiCount限制", "limit", true);
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

  async getUser() {
    const users = await this.client.invoke(
      new Api.users.GetUsers({
        id: [
          new Api.InputUser({
            // userId: 2029656369,   //zjm2023
            userId: 7585811878,   //zjm4038
            accessHash: bigInt.zero,
          }),
        ],
      })
    );
    // console.log(users);  //测试
    // console.log(users.length);  //测试
    if (users.length && !(users[0] instanceof Api.UserEmpty)) {
      this.toPeer = utils.getInputPeer(users[0]);
      // console.log(toPeer);  //测试
    }
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
    this.switchType();
    await this.getChat();
    if (this.fromPeer) {
      if (this.chatId != this.lastChat) {
        if (this.lastChat != 0) {
          await this.updateConfig();
        }
        this.lastChat = this.chatId;
      }
      await this.getUser();
      if (this.toPeer) {
        if (this.stop === 1) {
          this.currentStep += 1;
          this.flood = await this.ctx.storage.get("client") || 0;
          if (this.flood > 0) {
            if (this.flood > new Date().getTime()) {
              const time = this.flood - new Date().getTime();
              //console.log("(" + this.currentStep + ") 还需等待" + Math.ceil(time / 1000) + "秒的洪水警告时间");
              this.sendLog("start", "还需等待" + Math.ceil(time / 1000) + "秒的洪水警告时间", "flood", true);
              await this.waitNext(time, true);
            } else {
              this.flood = 0;
              await this.ctx.storage.put("client", 0);
            }
          }
          await this.getMessage(1);
          await scheduler.wait(5000);
          const messageArray = this.messageArray.slice();
          const messageLength = messageArray.length;
          this.messageArray = [];
          //console.log("(" + this.currentStep + ")messageLength : " + messageLength);  //测试
          // this.sendLog("start", "messageLength : " + messageLength, null, false);  //测试
          // if (messageLength > this.limit) {
          //   //console.log("(" + this.currentStep + ") messageLength比limit大");
          //   this.sendLog("start", "messageLength比limit大", null, true);
          // }
          if (messageLength && messageLength > 0) {
            const idArray = [];
            const fileIdArray = [];
            for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
              if (!messageArray[messageIndex].noforwards || messageArray[messageIndex].noforwards === false) {
                let fileId = null;
                const id = messageArray[messageIndex].id;
                if (this.filterType === 2) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      fileId = messageArray[messageIndex].media.document.id;
                    }
                  }
                } else if (this.filterType === 1) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.photo) {
                      fileId = messageArray[messageIndex].media.photo.id;
                    }
                  }
                } else if (this.filterType === 3) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      const mimeType = messageArray[messageIndex].media.document.mimeType;
                      if (mimeType.startsWith("video/")) {
                        fileId = messageArray[messageIndex].media.document.id;
                      } else if (mimeType.startsWith("image/")) {
                        fileId = messageArray[messageIndex].media.document.id;
                      // } else if (mimeType.startsWith("application/")) {
                      // } else {
                      }
                    }
                  }
                } else if (this.filterType === 4) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      fileId = messageArray[messageIndex].media.document.id;
                    }
                  }
                } else if (this.filterType === 0) {
                  if (messageArray[messageIndex].media) {
                    if (messageArray[messageIndex].media.document) {
                      fileId = messageArray[messageIndex].media.document.id;
                    } else if (messageArray[messageIndex].media.photo) {
                      fileId = messageArray[messageIndex].media.photo.id;
                    }
                  }
                }
                if (id && fileId) {
                  idArray.push(id);
                  fileIdArray.push(fileId);
                }
              }
            }
            await this.forwardMessage(idArray, fileIdArray);
            if (this.stop === 1) {
              if (this.apiCount < 900) {
                await this.nextStep();
              } else {
                this.stop = 2;
                //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
                this.sendLog("nextStep", "超出apiCount限制", "limit", true);
                await this.close();
                // this.ctx.abort("reset");
              }
            } else if (this.stop === 2) {
              this.broadcast({
                "result": "pause",
              });
              await this.close();
            }
          } else if (this.count > 0) {
            this.offsetId += this.count;
            this.count = 0;
            await this.updateChat(1, 0);
            this.errorCount += 1;
            // if (this.errorCount >= 3) {
            //   await this.ctx.storage.put(this.chatId, 0);
            //   //console.log("(" + this.currentStep + ") 连续3轮没有获取到包含有效媒体的消息");
            //   this.sendForward("start", "连续3轮没有获取到包含有效媒体的消息", 0, "error", true);
            //   await this.getNext();
            // } else {
            //   await this.ctx.storage.put(this.chatId, this.errorCount);
              //console.log("(" + this.currentStep + ") 第" + this.errorCount + "轮没有获取到包含有效媒体的消息");
              this.sendForward("start", "第" + this.errorCount + "轮没有获取到包含有效媒体的消息", 0, "error", true);
            // }
            if (this.stop === 1) {
              if (this.apiCount < 900) {
                await this.nextStep();
              } else {
                this.stop = 2;
                //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
                this.sendLog("nextStep", "超出apiCount限制", "limit", true);
                await this.close();
                // this.ctx.abort("reset");
              }
            } else if (this.stop === 2) {
              this.broadcast({
                "result": "pause",
              });
              await this.close();
            }
          } else {
            await this.updateChat(1, 0);
            //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
            this.sendLog("start", "当前chat采集完毕", null, false);
            this.broadcast({
              "result": "end",
            });
            await this.getNext();
          }
        } else if (this.stop === 2) {
          this.broadcast({
            "result": "pause",
          });
          await this.close();
        }
      } else {
        //console.log("获取toPeer出错");
        this.sendLog("start", "获取toPeer出错", "error", true);
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
        // if (dialog.isChannel === true) {
          this.dialogArray.push(dialog);
        // }
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
      chatResult = await this.env.MAINDB.prepare("SELECT COUNT(Cindex) FROM `FORWARDCHAT` WHERE `tgId` = 0 AND `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(channelId, accessHash).run();
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

  async insertChatError(tryCount, channelId, accessHash, chatType, username, title, noforwards) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("insertChat超出tryCount限制");
      this.sendLog("insertChat", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertChat(tryCount + 1, channelId, accessHash, chatType, username, title, noforwards);
    }
  }

  async insertChat(tryCount, channelId, accessHash, chatType, username, title, noforwards) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("INSERT INTO `FORWARDCHAT` (tgId, channelId, accessHash, chatType, username, title, noforwards, current, photo, video, document, gif, currentForward, photoForward, videoForward, documentForward, gifForward, exist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(0, channelId, accessHash, chatType, username, title, noforwards, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1).run();
    } catch (e) {
      //console.log("insertChat出错 : " + e);;
      this.sendLog("insertChat", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertChatError(tryCount, channelId, accessHash, chatType, username, title, noforwards);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("插入chat数据成功");
      this.sendLog("insertChat", "插入chat数据成功", "success", false);
    } else {
      //console.log("插入chat数据失败");
      this.sendLog("insertChat", "插入chat数据失败", "error", true);
      await this.insertChatError(tryCount, channelId, accessHash, chatType, username, title, noforwards);
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
          if (dialog.title === "test110") {
          } else {
            let channelId = "";
            let accessHash = "";
            let chatType = 0;
            if (dialog.isChannel === true) {
              chatType = 1;
              channelId = dialog.inputEntity.channelId.toString();
              accessHash = dialog.inputEntity.accessHash.toString();
            } else if (dialog.isUser === true) {
              chatType = 2;
              // if (dialog.draft._entity.bot === true && dialog.draft._entity.deleted === false) {
              // if (dialog.entity.bot === true && dialog.entity.deleted === false) {
              // if (dialog.draft._entity.bot === true) {
              if (dialog.entity.bot === true) {
                channelId = dialog.inputEntity.userId.toString();
                accessHash = dialog.inputEntity.accessHash.toString();
              }
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
                const noforwards = (dialog.entity.noforwards === true || dialog.draft._entity.noforwards === true) ? 1 : 0;
                await this.insertChat(1, channelId, accessHash, chatType, username, dialog.title, noforwards);
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
        "operate": "clearCache",
        "step": this.currentStep,
        "message": "删除cache成功",
        "error": true,
        "date": new Date().getTime(),
      });
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
      const id = env.WEBSOCKET_SERVER.idFromName("forward");
      const stub = env.WEBSOCKET_SERVER.get(id);
      return stub.fetch(request);
    }

    return new Response("error");
  },
};
