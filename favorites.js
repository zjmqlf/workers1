import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions, utils } from "./teleproto";
import { LogLevel } from "./teleproto/extensions";
import { userString } from "./userString";
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
  chatId = 1;
  endChat = 0;
  // lastChat = 1;
  // reverse = true;
  limit = 10;
  offsetId = 0;
  // error = false;
  fromPeer = null;
  waitTime = 60000;
  pingTime = 5000;
  count = 0;
  errorCount = 0;
  flood = 0;
  time = 0;
  // filterType = 0;
  // filter = Api.InputMessagesFilterVideo;
  // //filterTitle = "媒体";
  messageArray = [];
  cacheMessage = null;
  batchMessage = [];
  dialogArray = [];
  chatArray = userString;

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
        // if (option.filterType) {
        //   this.filterType = option.filterType;
        // }
        // if (option.reverse) {
        //   this.reverse = option.reverse;
        // }
        if (option.limit && option.limit > 0) {
          this.limit = option.limit;
        }
        if (option.offsetId && option.offsetId > 0) {
          this.offsetId = option.offsetId;
        }
      } else {
        this.compress = false;
        this.batch = false;
        this.chatId = 1;
        this.endChat = 0;
        // this.filterType = 0;
        // this.reverse = true;
        this.limit = 20;
        this.offsetId = 0;
      }
      // this.ws = null;
      // this.client = null;
      // this.stop = 0;
      // this.webSocket = [];
      this.apiCount = 0;
      this.currentStep = 0;
      // this.lastChat = 1;
      // this.error = false;
      this.fromPeer = null;
      this.waitTime = 60000;
      this.pingTime = 5000;
      this.count = 0;
      this.errorCount = 0;
      this.flood = 0;
      this.time = 0;
      this.messageArray = [];
      // this.filter = Api.InputMessagesFilterVideo;
      // //this.filterTitle = "媒体";
      this.cacheMessage = null;
      this.batchMessage = [];
      this.dialogArray = [];
      // this.chatArray = JSON.parse(JSON.stringify(userString));
      this.chatArray = userString;
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
      } else if (message.operate === "getChat") {
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
      "operate": operate,
      "offsetId": this.offsetId,
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
    const apiId = 25429403;
    const apiHash = "2bb9a1bfd8f598da6cb5c511f0e5fbdf";
    const sessionString = "1BQANOTEuMTA4LjU2LjE4MwG7IWvEvkNunR7nJsoQNgDYFZaO6cBXfvp9aj4uVcOna4S5rIXy8TcFdi2+K0nZSUT6XqW3Hpa192FO5fc1To5tBA+LdfjhiTHJy6wk5/VnO3pBK6FziQBRz3xvjgkDDdnq1WaaBTTDOCepfHI+3GRIkXaI7BA+nZHW68q2PDJ87cXFKQ/zDT/pw/MLQ2waiVvClL+fC/cDKorcsAN0AiCNC7GfGVHHnm4bn+nTzz0Wt8eFrk8uySsFIdvrw0pCGTI49zc72XPz5J7zJDxhTP+4ysmUTpy+uJ/NpSfngU+3vqNKbUI8Qs94NMKFXdwIgcoakw96419P88TNxHaxNI9kIg==";
    try {
      this.client = new TelegramClient(new sessions.StringSession(sessionString), apiId, apiHash, {
        connectionRetries: Number.MAX_VALUE,
        autoReconnect: true,
        deviceModel: "Desktop",
        systemVersion: "Windows 11",
        appVersion: "6.7.6 x64",
        langCode: "en",
        systemLangCode: "en-US",
        //retryDelay: 0,
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
      configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'user' AND `tgId` = ? LIMIT 1;").bind(this.chatId).run();
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
            // this.chatId = result.chatId;
            // this.lastChat = this.chatId;
            this.offsetId = result.chatId;
          }
        }
        // if (!option || !option.filterType) {
        //   if (result.filterType && result.filterType > 0 && result.filterType <= 9) {
        //     this.filterType = result.filterType;
        //   }
        // }
        // if (!option || !option.reverse) {
        //   if (result.reverse) {
        //     this.reverse = Boolean(result.reverse);
        //   }
        // }
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
  //       //this.filterTitle = "文件";
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

  async getChat(tryCount) {
    if (this.chatId && this.chatId > 0) {
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        if (this.chatArray[this.chatId]) {
          const id = bigInt(this.chatArray[this.chatId].id);
          const accessHash = this.chatArray[this.chatId].accessHash ? bigInt(this.chatArray[this.chatId].accessHash) : bigInt.zero;
          let users = null;
          try {
            users = await this.client.invoke(
              new Api.users.GetUsers({
                id: [
                  new Api.InputUser({
                    userId: id,
                    accessHash: accessHash,
                  }),
                ],
              })
            );
          } catch (e) {
            //console.log("(" + this.currentStep + ")出错 : " + e);
            this.sendLog("getChat", "出错 : " + JSON.stringify(e), null, true);
            if (tryCount === 20) {
              this.stop = 2;
              //console.log("(" + this.currentStep + ")getChat超出tryCount限制");
              this.sendLog("getChat", "超出tryCount限制", null, true);
              await this.close();
            } else {
              await scheduler.wait(10000);
              await this.getChat(tryCount + 1);
            }
            return;
          }
          if (users.length && !(users[0] instanceof Api.UserEmpty)) {
            if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
              this.fromPeer = utils.getInputPeer(users[0]);
              if (this.fromPeer) {
                // this.errorCount = await this.ctx.storage.get(this.chatId) || 0;
                this.sendLog("getChat", this.chatId + " : " + this.chatArray[this.chatId].name, "add", false);
              } else {
                this.chatId += 1;
                if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
                  //console.log(this.chatArray[this.chatId].name + " : chat已不存在了");  //测试
                  this.sendLog("getChat", this.chatArray[this.chatId].name + " : chat已不存在了", null, true);
                  await this.getChat(1);
                } else {
                  //console.log(this.endChat + " : 超过最大chat了");  //测试
                  this.sendLog("getChat", this.endChat + " : 超过最大chat了", null, true);
                }
              }
            } else {
              //console.log(this.endChat + " : 超过最大chat了");  //测试
              this.sendLog("getChat", this.endChat + " : 超过最大chat了", null, true);
            }
          } else {
            this.chatId += 1;
            if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
              //console.log(this.chatArray[this.chatId].name + " : chat已不存在了");  //测试
              this.sendLog("getChat", this.chatArray[this.chatId].name + " : chat已不存在了", null, true);
              // await this.getChat(1);
            } else {
              //console.log(this.endChat + " : 超过最大chat了");  //测试
              this.sendLog("getChat", this.endChat + " : 超过最大chat了", null, true);
            }
          }
        } else {
          //console.log("chat出错");  //测试
          this.sendLog("getChat", "chat出错", null, true);
        }
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.sendLog("getChat", this.endChat + " : 超过最大chat了", null, true);
      }
    } else {
      //console.log("chatId出错");  //测试
      this.sendLog("getChat", "chatId出错", null, true);
    }
  }

  async updateConfigError(tryCount, messageLength) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")updateConfig超出tryCount限制");
      this.sendLog("updateConfig", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.updateConfig(tryCount + 1, messageLength);
    }
  }

  async updateConfig(tryCount, messageLength) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `name` = 'user' AND `tgId` = ?;").bind(this.offsetId, this.chatId).run();
    } catch (e) {
      //console.log("updateConfig出错 : " + e);
      this.sendLog("updateConfig", "出错 : " + JSON.stringify(e), null, true);
      await this.updateConfigError(tryCount, messageLength);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
      //console.log("更新config数据成功 - " + messageLength);
      this.sendLog("updateConfig", "更新config数据成功 - " + messageLength, null, false);
    } else {
      //console.log("更新config数据失败 - " + messageLength);
      this.sendLog("updateConfig", "更新config数据失败 - " + messageLength, null, true);
      await this.updateConfigError(tryCount, messageLength);
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
          // reverse: this.reverse,
          reverse: true,
          addOffset: -this.offsetId,
          //addOffset: 0,  //测试
          // filter: this.filter,
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
        this.fromPeer = null;
        this.chatId += 1;
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          //console.log(this.chatArray[this.chatId].name + " : chat已不存在了");  //测试
          this.sendLog("getMessage", this.chatArray[this.chatId].name + " : chat已不存在了", null, true);
          await this.getChat(1);
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.sendLog("getMessage", this.endChat + " : 超过最大chat了", null, true);
        }
      } else if (e.errorMessage === "FLOOD" || e.code === 420) {
        // this.waitTime += 120000;
        if (e.seconds && e.seconds > 0) {
          this.flood = new Date().getTime() + 60000 + e.seconds * 1000;
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
          if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.close();
            break;
          } else {
            await scheduler.wait(this.pingTime);
            // this.ws.ping();
            // this.ws.send({
            //   "result": "ping",
            // });
            this.broadcast({
              "result": "ping",
            });
          }
        }
      } else {
        await scheduler.wait(time);
      }
    }
  }

  // async selectMediaIndexError(tryCount, id, accessHash) {
  //   if (tryCount === 20) {
  //     this.stop = 2;
  //     //console.log("(" + this.currentStep + ")selectMediaIndex超出tryCount限制");
  //     this.sendLog("selectMediaIndex", "超出tryCount限制", null, true);
  //     await this.close();
  //   } else {
  //     await scheduler.wait(10000);
  //     await this.selectMediaIndex(tryCount + 1, id, accessHash);
  //   }
  // }

  // async selectMediaIndex(tryCount, id, accessHash) {
  //   this.apiCount += 1;
  //   let mediaResult = {};
  //   try {
  //     mediaResult = await this.env.MEDIADB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIAINDEX` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(id, accessHash).run();
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ") selectMediaIndex出错 : " + e);
  //     this.sendGrid("selectMediaIndex", "出错 : " + JSON.stringify(e), "try", true);
  //     await this.selectMediaIndexError(tryCount, id, accessHash);
  //     return;
  //   }
  //   //console.log("mediaResult : " + mediaResult);  //测试
  //   if (mediaResult.success === true) {
  //     if (mediaResult.results && mediaResult.results.length > 0) {
  //       return mediaResult.results[0];
  //     }
  //   } else {
  //     await this.selectMediaIndexError(tryCount, id, accessHash);
  //   }
  // }

  // async insertMediaIndexError(tryCount, Vindex, id, accessHash) {
  //   if (tryCount === 20) {
  //     this.stop = 2;
  //     //console.log("(" + this.currentStep + ")insertMediaIndex超出tryCount限制");
  //     this.sendLog("insertMediaIndex", "超出tryCount限制", null, true);
  //     await this.close();
  //   } else {
  //     await scheduler.wait(10000);
  //     await this.insertMediaIndex(tryCount + 1, Vindex, id, accessHash);
  //   }
  // }

  // async insertMediaIndex(tryCount, Vindex, id, accessHash) {
  //   this.apiCount += 1;
  //   let indexResult = {};
  //   try {
  //     indexResult = await this.env.MEDIADB.prepare("INSERT INTO `MEDIAINDEX` (Vindex, id, accessHash) VALUES (?, ?, ?);").bind(Vindex, id, accessHash).run();
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ") insertMediaIndex出错 : " + e);
  //     this.sendGrid("insertMediaIndex", "出错 : " + JSON.stringify(e), "try", true);
  //     await this.insertMediaIndexError(tryCount, Vindex, id, accessHash);
  //     return;
  //   }
  //   //console.log(indexResult);  //测试
  //   if (indexResult.success === true) {
  //     //console.log("(" + this.currentStep + ") 插入mediaIndex数据成功");
  //     this.sendGrid("insertMediaIndex", "", "success", false);
  //   } else {
  //     //console.log("(" + this.currentStep + ") 插入mediaIndex数据失败");
  //     this.sendGrid("insertMediaIndex", "插入mediaIndex数据失败", "error", true);
  //     await this.insertMediaIndexError(tryCount, Vindex, id, accessHash);
  //   }
  // }

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
      //console.log("(" + this.currentStep + ") selectMedia出错 : " + e);
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

  async insertMediaError(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertMedia超出tryCount限制");
      this.sendLog("insertMedia", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertMedia(tryCount + 1, id, accessHash, dcId, fileName, mimeType, size, duration, width, height);
    }
  }

  async insertMedia(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height) {
    this.apiCount += 1;
    let mediaResult = {};
    try {
      mediaResult = await this.env.MEDIADB.prepare("INSERT INTO `MEDIA` (id, accessHash, dcId, fileName, mimeType, size, duration, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(id, accessHash, dcId, fileName, mimeType, size, duration, width, height).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ") insertMedia出错 : " + e);;
      this.sendGrid("insertMedia", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertMediaError(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height);
      return;
    }
    //console.log(mediaResult);  //测试
    if (mediaResult.success === true) {
      //console.log("(" + this.currentStep + ") 插入media数据成功");
      this.sendGrid("insertMedia", "", "success", false);
      return mediaResult.meta.last_row_id;
    } else {
      //console.log("(" + this.currentStep + ") 插入media数据失败");
      this.sendGrid("insertMedia", "插入media数据失败", "error", true);
      await this.insertMediaError(tryCount, id, accessHash, dcId, fileName, mimeType, size, duration, width, height);
      return 0;
    }
  }

  async endMediaMessage(id, accessHash, dcId, fileName, mimeType, size, duration, width, height) {
    if (this.stop === 1) {
      const index = await this.insertMedia(1, id, accessHash, dcId, fileName, mimeType, size, duration, width, height);
      // if (index > 0) {
      //   await this.insertMediaIndex(1, index, id, accessHash);
      // }
      return index;
    } else if (this.stop === 2) {
      await this.updateConfig(1, 0);
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  // async selectPhotoIndexError(tryCount, id, accessHash, type) {
  //   if (tryCount === 20) {
  //     this.stop = 2;
  //     //console.log("(" + this.currentStep + ")selectPhotoIndex超出tryCount限制");
  //     this.sendLog("selectPhotoIndex", "超出tryCount限制", null, true);
  //     await this.close();
  //   } else {
  //     await scheduler.wait(10000);
  //     await this.selectPhotoIndex(tryCount + 1, id, accessHash, type);
  //   }
  // }

  // async selectPhotoIndex(tryCount, id, accessHash, type) {
  //   this.apiCount += 1;
  //   let photoResult = {};
  //   try {
  //     photoResult = await this.env.PHOTODB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTOINDEX` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(id, accessHash, type).run();
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ") selectPhotoIndex出错 : " + e);
  //     this.sendGrid("selectPhotoIndex", "出错 : " + JSON.stringify(e), "try", true);
  //     await this.selectPhotoIndexError(tryCount, id, accessHash, type);
  //     return;
  //   }
  //   //console.log("photoResult : " + photoResult);  //测试
  //   if (photoResult.success === true) {
  //     if (photoResult.results && photoResult.results.length > 0) {
  //       return photoResult.results[0];
  //     }
  //   } else {
  //     await this.selectPhotoIndexError(tryCount, id, accessHash, type);
  //   }
  // }

  // async insertPhotoIndexError(tryCount, Pindex, id, accessHash, type) {
  //   if (tryCount === 20) {
  //     this.stop = 2;
  //     //console.log("(" + this.currentStep + ")insertPhotoIndex超出tryCount限制");
  //     this.sendLog("insertPhotoIndex", "超出tryCount限制", null, true);
  //     await this.close();
  //   } else {
  //     await scheduler.wait(10000);
  //     await this.insertPhotoIndex(tryCount + 1, Pindex, id, accessHash, type);
  //   }
  // }

  // async insertPhotoIndex(tryCount, Pindex, id, accessHash, type) {
  //   this.apiCount += 1;
  //   let photoResult = {};
  //   try {
  //     photoResult = await this.env.PHOTODB.prepare("INSERT INTO `PHOTOINDEX` (Pindex, id, accessHash, sizeType) VALUES (?, ?, ?, ?);").bind(Pindex, id, accessHash, type).run();
  //   } catch (e) {
  //     //console.log("(" + this.currentStep + ") insertPhotoIndex出错 : " + e);
  //     this.sendGrid("insertPhotoIndex", "出错 : " + JSON.stringify(e), "try", true);
  //     await this.insertPhotoIndexError(tryCount, Pindex, id, accessHash, type);
  //     return;
  //   }
  //   //console.log(photoResult);  //测试
  //   if (photoResult.success === true) {
  //     //console.log("(" + this.currentStep + ") 插入photoIndex数据成功");
  //     this.sendGrid("insertPhotoIndex", "", "success", false);
  //   } else {
  //     //console.log("(" + this.currentStep + ") 插入photoIndex数据失败");
  //     this.sendGrid("insertPhotoIndex", "插入photoIndex数据失败", "error", true);
  //     await this.insertPhotoIndexError(tryCount, Pindex, id, accessHash, type);
  //   }
  // }

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
      //console.log("(" + this.currentStep + ") selectPhoto出错 : " + e);
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

  async insertPhotoError(tryCount, id, accessHash, dcId, photoIndex, type, size) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertPhoto超出tryCount限制");
      this.sendLog("insertPhoto", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertPhoto(tryCount + 1, id, accessHash, dcId, photoIndex, type, size);
    }
  }

  async insertPhoto(tryCount, id, accessHash, dcId, photoIndex, type, size) {
    this.apiCount += 1;
    let photoResult = {};
    try {
      photoResult = await this.env.PHOTODB.prepare("INSERT INTO `PHOTO` (id, accessHash, dcId, sizeType, size) VALUES (?, ?, ?, ?, ?);").bind(id, accessHash, dcId, type, size).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ") (" + photoLength +"/" + photoIndex + ") insertPhoto出错 : " + e);
      this.sendPhoto("insertPhoto", "出错 : " + JSON.stringify(e), photoIndex, "try", true);
      await this.insertPhotoError(tryCount, id, accessHash, dcId, photoIndex, type, size);
      return;
    }
    //console.log(photoResult);  //测试
    if (photoResult.success === true) {
      //console.log("(" + this.currentStep + ") 插入photo数据成功");
      this.sendPhoto("insertPhoto", "", photoIndex, "success", false);
      return photoResult.meta.last_row_id;
    } else {
      //console.log("(" + this.currentStep + ") 插入photo数据失败");
      this.sendPhoto("insertPhoto", "插入photo数据失败", photoIndex, "error", true);
      await this.insertPhotoError(tryCount, id, accessHash, dcId, photoIndex, type, size);
      return 0;
    }
  }

  async endPhotoMessage(id, accessHash, dcId, photoIndex, type, size) {
    if (this.stop === 1) {
      const index = await this.insertPhoto(1, id, accessHash, dcId, photoIndex, type, size);
      // if (index > 0) {
      //   await this.insertPhotoIndex(1, index, id, accessHash, type);
      // }
      return index;
    } else if (this.stop === 2) {
      await this.updateConfig(1, 0);
      this.broadcast({
        "result": "pause",
      });
      await this.close();
    }
  }

  async selectMediaMessageError(tryCount, messageId) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectMediaMessage超出tryCount限制");
      this.sendLog("selectMediaMessage", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectMediaMessage(tryCount + 1, messageId);
    }
  }

  async selectMediaMessage(tryCount, messageId) {
    this.apiCount += 1;
    let messageResult = null;
    try {
      messageResult = await this.env.MESSAGEDB.prepare("SELECT COUNT(id) FROM `MESSAGE` WHERE `userId` = ? AND `id` = ? LIMIT 1;").bind(this.chatId, messageId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ") selectMediaMessage出错 : " + e);
      this.sendGrid("selectMediaMessage", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectMediaMessageError(tryCount, messageId);
      return;
    }
    //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
    if (messageResult.success === true) {
      if (messageResult.results && messageResult.results.length > 0) {
        return messageResult.results[0]["COUNT(id)"];
      }
    } else {
      await this.selectMediaMessageError(tryCount, messageId);
    }
  }

  async selectPhotoMessageError(tryCount, messageId, type) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")selectPhotoMessage超出tryCount限制");
      this.sendLog("selectPhotoMessage", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.selectPhotoMessage(tryCount + 1, messageId, type);
    }
  }

  async selectPhotoMessage(tryCount, messageId, type) {
    this.apiCount += 1;
    let messageResult = null;
    try {
      messageResult = await this.env.MESSAGEDB.prepare("SELECT COUNT(id) FROM `MESSAGE` WHERE `userId` = ? AND `id` = ? AND `sizeType` = ? LIMIT 1;").bind(this.chatId, messageId, type).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ") selectPhotoMessage出错 : " + e);
      this.sendGrid("selectPhotoMessage", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectPhotoMessageError(tryCount, messageId, type);
      return;
    }
    //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
    if (messageResult.success === true) {
      if (messageResult.results && messageResult.results.length > 0) {
        return messageResult.results[0]["COUNT(id)"];
      }
    } else {
      await this.selectPhotoMessageError(tryCount, messageId, type);
    }
  }

  async insertMessageError(tryCount, messageId, category, type, mid, id, accessHash, txt) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertMessage超出tryCount限制");
      this.sendLog("insertMessage", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertMessage(tryCount + 1, messageId, category, type, mid, id, accessHash, txt);
    }
  }

  async insertMessage(tryCount, messageId, category, type, mid, id, accessHash, txt) {
    this.apiCount += 1;
    let messageResult = {};
    try {
      messageResult = await this.env.MESSAGEDB.prepare("INSERT INTO `MESSAGE` (userId, id, category, sizeType, mid, accessId, accessHash, txt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);").bind(this.chatId, messageId, category, type, mid, id, accessHash, txt).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ") insertMessage出错 : " + e);;
      this.sendGrid("insertMessage", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertMessageError(tryCount, messageId, category, type, mid, id, accessHash, txt);
      return;
    }
    //console.log(messageResult);  //测试
    if (messageResult.success === true) {
      //console.log("(" + this.currentStep + ") 插入message数据成功");
      this.sendGrid("insertMessage", "", "success", false);
    } else {
      //console.log("(" + this.currentStep + ") 插入message数据失败");
      this.sendGrid("insertMessage", "插入message数据失败", "error", true);
      await this.insertMessageError(tryCount, messageId, category, type, mid, id, accessHash, txt);
    }
  }

  async endMediaInsert(messageId, category, mid, id, accessHash, txt) {
    const messageCount = await this.selectMediaMessage(1, messageId);
    if (parseInt(messageCount) === 0) {
      await this.insertMessage(1, messageId, category, "", mid, id, accessHash, txt);
    } else {
      //console.log("(" + this.currentStep + ") message已在数据库中");
      this.sendGrid("endMediaInsert", "", "exist", false);
    }
  }

  async endPhotoInsert(messageId, category, type, mid, id, accessHash, txt) {
    const messageCount = await this.selectPhotoMessage(1, messageId, type);
    if (parseInt(messageCount) === 0) {
      await this.insertMessage(1, messageId, category, type, mid, id, accessHash, txt);
    } else {
      //console.log("(" + this.currentStep + ") message已在数据库中");
      this.sendGrid("endPhotoInsert", "", "exist", false);
    }
  }

  async getMedia(message) {
    const messageId = message.id;
    const id = message.media.document.id.toString();
    const accessHash = message.media.document.accessHash.toString();
    if (id && accessHash) {
      // const mediaIndexResult = await this.selectMediaIndex(1, id, accessHash);
      // if (mediaIndexResult) {
        const category = 2;
        const txt = message.message;
      //   const mediaIndexCount = parseInt(mediaIndexResult["COUNT(id)"]);
      //   if (mediaIndexCount === 0) {
          const mediaResult = await this.selectMedia(1, id, accessHash);
          if (mediaResult) {
            const mediaCount = parseInt(mediaResult["COUNT(id)"]);
            if (mediaCount === 0) {
              let duration = 0;
              let width = 0;
              let height = 0;
              let fileName = "";
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
              const dcId = message.media.document.dcId;
              const size = parseInt(message.media.document.size);
              const mimeType = message.media.document.mimeType;
              const time = new Date().getTime();
              this.broadcast({
                "step": this.currentStep,
                "operate": "getMedia",
                "chatId": this.chatId,
                "offsetId": this.offsetId,
                "messageId": messageId,
                "category": category,
                "dcId": dcId,
                "size": size,
                "type": mimeType,
                "fileName": fileName,
                "duration": duration,
                "width": width,
                "height": height,
                "status": "add",
                "time": time,
                "date": time,
              });
              if (this.stop === 1) {
                const Vindex = await this.endMediaMessage(id, accessHash, dcId, fileName, mimeType, size, duration, width, height);
                await this.endMediaInsert(messageId, category, Vindex, id, accessHash, txt);
                this.offsetId += 1;
                return true;
              } else if (this.stop === 2) {
                await this.updateConfig(1, 0);
                this.broadcast({
                  "result": "pause",
                });
                await this.close();
              }
            } else {
              //console.log("(" + this.currentStep + ") 视频已入过库了");
              this.sendGrid("getMedia", "", "fileExist", false);
              const Vindex = mediaResult.Vindex;
              // if (Vindex && Vindex > 0) {
              //   await this.insertMediaIndex(1, Vindex, id, accessHash);
              // }
              await this.endMediaInsert(messageId, category, Vindex, id, accessHash, txt);
              this.offsetId += 1;
            }
          } else {
            //console.log("(" + this.currentStep + ") 视频的mediaResult错误");
            this.sendGrid("getMedia", "视频的mediaResult错误", "error", true);
            this.offsetId += 1;
          }
      //   } else {
      //     //console.log("(" + this.currentStep + ") 视频已入过索引库了");
      //     this.sendGrid("getMedia", "", "indexExist", false);
      //     const Vindex = mediaIndexResult.Vindex;
      //     await this.endMediaInsert(messageId, category, Vindex, id, accessHash, txt);
      //     this.offsetId += 1;
      //   }
      // } else {
      //   //console.log("(" + this.currentStep + ") 视频的mediaIndexResult错误");
      //   this.sendGrid("getMedia", "视频的mediaIndexResult错误", "error", true);
    //   this.offsetId += 1;
      // }
    } else {
      //console.log("(" + this.currentStep + ") 视频的id或accessHash错误");
      this.sendGrid("getMedia", "视频的id或accessHash错误", "error", true);
      this.offsetId += 1;
    }
    return false;
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
        const category = 1;
        const txt = message.message;
        const time = new Date().getTime();
        this.broadcast({
          "step": this.currentStep,
          "operate": "getPhoto",
          "chatId": this.chatId,
          "offsetId": this.offsetId,
          "messageId": messageId,
          "category": category,
          "photoLength": photoLength,
          "status": "add",
          "time": time,
          "date": time,
        });
        for (let index = 0; index < photoLength; index++) {
          const photoIndex = index + 1;
          const type = photoInfo[index].type;
          // const photoIndexResult = await this.selectPhotoIndex(1, id, accessHash, type);
          // if (photoIndexResult) {
          //   const photoIndexCount = parseInt(photoIndexResult["COUNT(id)"]);
          //   if (photoIndexCount === 0) {
              const photoResult = await this.selectPhoto(1, id, accessHash, type);
              if (photoResult) {
                const photoCount = parseInt(photoResult["COUNT(id)"]);
                if (photoCount === 0) {
                  const dcId = photoInfo[index].dcId;
                  const size = photoInfo[index].size;
                  const time = new Date().getTime();
                  this.broadcast({
                    "step": this.currentStep,
                    "operate": "getPhoto",
                    "chatId": this.chatId,
                    "offsetId": this.offsetId,
                    "messageId": messageId,
                    "photoIndex": photoIndex,
                    "dcId": dcId,
                    "type": type,
                    "size": size,
                    "status": "update",
                    "time": time,
                    "date": time,
                  });
                  if (this.stop === 1) {
                    const Pindex = await this.endPhotoMessage(id, accessHash, dcId, photoIndex, type, size);
                    await this.endPhotoInsert(messageId, category, type, Pindex, id, accessHash, txt);
                  } else if (this.stop === 2) {
                    await this.updateConfig(1, 0);
                    this.broadcast({
                      "result": "pause",
                    });
                    await this.close();
                  }
                } else {
                  //console.log("(" + this.currentStep + ") (" + photoLength +"/" + photoIndex + ") 图片"+ type + "已入过库了");
                  this.sendPhoto("getPhoto", "", photoIndex, "fileExist", false);
                  const Pindex = photoResult.Pindex;
                  // if (Pindex && Pindex > 0) {
                  //   await this.insertPhotoIndex(1, Pindex, id, accessHash);
                  // }
                  await this.endPhotoInsert(messageId, category, type, Pindex, id, accessHash, txt);
                }
              } else {
                //console.log("(" + this.currentStep + ") 图片的photoResult错误");
                this.sendPhoto("getPhoto", "图片的photoResult错误", photoIndex, "error", true);
              }
          //   } else {
          //     //console.log("(" + this.currentStep + ") 图片已入过索引库了");
          //     this.sendPhoto("getPhoto", "", photoIndex, "indexExist", false);
          //     const Pindex = photoIndexResult.Pindex;
          //     await this.endPhotoInsert(messageId, category, type, Pindex, id, accessHash, txt);
          //   }
          // } else {
          //   //console.log("(" + this.currentStep + ") 图片的photoIndexResult错误");
          //   this.sendPhoto("getPhoto", "图片的photoIndexResult错误", photoIndex, "error", true);
          // }
        }
        this.offsetId += 1;
        return true;
      } else {
        //console.log("(" + this.currentStep + ") 图片的info错误");
        this.sendPhoto("getPhoto", "图片的info错误", photoIndex, "error", true);
        this.offsetId += 1;
      }
    } else {
      //console.log("(" + this.currentStep + ") 图片的id或accessHash错误");
      this.sendPhoto("getPhoto", "图片的id或accessHash错误", photoIndex, "error", true);
      this.offsetId += 1;
    }
    return false;
  }

  async getFile(message) {
    const messageId = message.id;
    const id = message.media.document.id.toString();
    const accessHash = message.media.document.accessHash.toString();
    if (id && accessHash) {
      // const photoIndexResult = await this.selectPhotoIndex(1, id, accessHash,"p");
      // if (photoIndexResult) {
        const category = 1;
        const txt = message.message;
        // const photoIndexCount = parseInt(photoIndexResult["COUNT(id)"]);
        // if (photoIndexCount === 0) {
          const photoResult = await this.selectPhoto(1, id, accessHash,"p");
          if (photoResult) {
            const photoCount = parseInt(photoResult["COUNT(id)"]);
            if (photoCount === 0) {
              //console.log("(" + this.currentStep + ") 准备查询图片的hash");
              const dcId = message.media.document.dcId;
              const size = parseInt(message.media.document.size);
              const mimeType = message.media.document.mimeType;
              const time = new Date().getTime();
              this.broadcast({
                "step": this.currentStep,
                "operate": "getFile",
                "chatId": this.chatId,
                "offsetId": this.offsetId,
                "messageId": messageId,
                "category": category,
                "dcId": dcId,
                "size": size,
                "type": mimeType,
                "status": "add",
                "time": time,
                "date": time,
              });
              if (this.stop === 1) {
                const Pindex = await this.endPhotoMessage(id, accessHash, dcId, 1, "p", size);
                await this.endMediaInsert(messageId, category, Pindex, id, accessHash, txt);
                this.offsetId += 1;
                return true;
              } else if (this.stop === 2) {
                await this.updateConfig(1, 0);
                this.broadcast({
                  "result": "pause",
                });
                await this.close();
              }
            } else {
              //console.log("(" + this.currentStep + ") 图片已入过库了");
              this.sendGrid("getFile", "", "fileExist", false);
              const Pindex = photoResult.Pindex;
              // if (Pindex && Pindex > 0) {
              //   await this.insertPhotoIndex(1, Pindex, id, accessHash,"p");
              // }
              await this.endMediaInsert(messageId, category, Pindex, id, accessHash, txt);
              this.offsetId += 1;
            }
          } else {
            //console.log("(" + this.currentStep + ") 图片的photoResult错误");
            this.sendGrid("getFile", "图片的photoResult错误", "error", true);
            this.offsetId += 1;
          }
      //   } else {
      //     //console.log("(" + this.currentStep + ") 图片已入过索引库了");
      //     this.sendGrid("getFile", "", "indexExist", false);
      //     const Pindex = photoIndexResult.Pindex;
      //     await this.endMediaInsert(messageId, category, Pindex, id, accessHash, txt);
      //     this.offsetId += 1;
      //   }
      // } else {
      //   //console.log("(" + this.currentStep + ") 图片的photoIndexResult错误");
      //   this.sendGrid("getFile", "图片的photoIndexResult错误", "error", true);
      //   this.offsetId += 1;
      // }
    } else {
      //console.log("(" + this.currentStep + ") 图片的id或accessHash错误");
      this.sendGrid("getFile", "图片的id或accessHash错误", "error", true);
      this.offsetId += 1;
    }
    return false;
  }

  async getNext() {
    this.fromPeer = null;
    this.chatId += 1;
    this.count = 0;
    if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
      await this.getChat(1);
      if (this.fromPeer) {
        if (this.chatId != this.lastChat) {
          // if (this.lastChat != 48) {
            await this.updateConfig(1, 0);
          // }
          // this.lastChat = this.chatId;
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
          toPeer: "me",
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
          this.sendForward("forwardMessage", JSON.stringify(e), 0, "error", true);
        } else if (e.errorMessage === "CHAT_FORWARDS_RESTRICTED" || e.code === 400) {
          // this.offsetId += this.count;
          this.count = 0;
          //console.log("(" + this.currentStep + ") 消息不允许转发" + e);
          this.sendForward("forwardMessage", "消息不允许转发 : " + JSON.stringify(e), 0, "error", true);
          await this.getNext();
          return;
        } else if (e.errorMessage === "FLOOD" || e.code === 420) {
          this.offsetId -= this.count;
          this.count = 0;
          // this.waitTime += 120000;
          if (e.seconds && e.seconds > 0) {
            this.flood = new Date().getTime() + 60000 + e.seconds * 1000;
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
      // this.offsetId += this.count;
      this.count = 0;
      await this.updateConfig(1, messageLength);
      //console.log("(" + this.currentStep + ") 成功转发了" + length + "条消息");
      this.sendForward("forwardMessage", "成功转发了" + messageLength + "条消息", messageLength, "update", false);
    } else {
      // this.offsetId += this.count;
      this.count = 0;
      await this.updateConfig(1, 0);
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
                // if (this.tg[clientIndex].filterType === 2) {
                //   if (messageArray[messageIndex].media) {
                //     if (messageArray[messageIndex].media.document) {
                //       const status = await this.getMedia(messageArray[messageIndex]);
                //       if (status === true) {
                //         fileId = messageArray[messageIndex].media.document.id;
                //       }
                //     }
                //   }
                // } else if (this.tg[clientIndex].filterType === 1) {
                //   if (messageArray[messageIndex].media) {
                //     if (messageArray[messageIndex].media.photo) {
                //       const status = await this.getPhoto(messageArray[messageIndex]);
                //       if (status === true) {
                //         fileId = messageArray[messageIndex].media.photo.id;
                //       }
                //     }
                //   }
                // } else if (this.tg[clientIndex].filterType === 3) {
                //   if (messageArray[messageIndex].media) {
                //     if (messageArray[messageIndex].media.document) {
                //       const mimeType = messageArray[messageIndex].media.document.mimeType;
                //       if (mimeType.startsWith("video/")) {
                //         const status = await this.getMedia(messageArray[messageIndex]);
                //         if (status === true) {
                //           fileId = messageArray[messageIndex].media.document.id;
                //         }
                //       } else if (mimeType.startsWith("image/")) {
                //         const status = await this.getPhoto(messageArray[messageIndex]);
                //         if (status === true) {
                //           fileId = messageArray[messageIndex].media.document.id;
                //         }
                //       // } else if (mimeType.startsWith("application/")) {
                //       // } else {
                //       }
                //     }
                //   }
                // } else if (this.tg[clientIndex].filterType === 4) {
                //   if (messageArray[messageIndex].media) {
                //     if (messageArray[messageIndex].media.document) {
                //       const status = await this.getMedia(messageArray[messageIndex]);
                //       if (status === true) {
                //         fileId = messageArray[messageIndex].media.document.id;
                //       }
                //     }
                //   }
                // } else if (this.tg[clientIndex].filterType === 0) {
                //   if (messageArray[messageIndex].media) {
                //     if (messageArray[messageIndex].media.document) {
                //       const id = messageArray[messageIndex].media.document.id;
                //       const status = await this.getMedia(messageArray[messageIndex]);
                //       if (status === true) {
                //         fileId = messageArray[messageIndex].media.document.id;
                //       }
                //     } else if (messageArray[messageIndex].media.photo) {
                //       const id = messageArray[messageIndex].media.photo.id;
                //       const status = await this.getPhoto(messageArray[messageIndex]);
                //       if (status === true) {
                //         fileId = messageArray[messageIndex].media.photo.id;
                //       }
                //     }
                //   }
                // }
                if (messageArray[messageIndex].media) {
                  if (messageArray[messageIndex].media.document) {
                    const mimeType = messageArray[messageIndex].media.document.mimeType;
                    if (mimeType.startsWith("video/")) {
                      const status = await this.getMedia(messageArray[messageIndex]);
                      if (status === true) {
                        fileId = messageArray[messageIndex].media.document.id;
                      }
                    } else if (mimeType.startsWith("image/")) {
                      const status = await this.getPhoto(messageArray[messageIndex]);
                      if (status === true) {
                        fileId = messageArray[messageIndex].media.document.id;
                      }
                    // } else if (mimeType.startsWith("application/")) {
                    // } else {
                    }
                  } else if (messageArray[messageIndex].media.photo) {
                    fileId = messageArray[messageIndex].media.photo.id;
                    const status = await this.getPhoto(messageArray[messageIndex]);
                    if (status === true) {
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
          // this.offsetId += this.count;
          this.count = 0;
          await this.updateConfig(1, 0);
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
          await this.updateConfig(1, 0);
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
      await this.updateConfig(1, 0);
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
    // this.switchType();
    await this.getChat(1);
    if (this.fromPeer) {
      if (this.chatId != this.lastChat) {
        // if (this.lastChat != 48) {
          await this.updateConfig(1, 0);
        // }
        // this.lastChat = this.chatId;
      }
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
              // if (this.tg[clientIndex].filterType === 2) {
              //   if (messageArray[messageIndex].media) {
              //     if (messageArray[messageIndex].media.document) {
              //       const status = await this.getMedia(messageArray[messageIndex]);
              //       if (status === true) {
              //         fileId = messageArray[messageIndex].media.document.id;
              //       }
              //     }
              //   }
              // } else if (this.tg[clientIndex].filterType === 1) {
              //   if (messageArray[messageIndex].media) {
              //     if (messageArray[messageIndex].media.photo) {
              //       const status = await this.getPhoto(messageArray[messageIndex]);
              //       if (status === true) {
              //         fileId = messageArray[messageIndex].media.photo.id;
              //       }
              //     }
              //   }
              // } else if (this.tg[clientIndex].filterType === 3) {
              //   if (messageArray[messageIndex].media) {
              //     if (messageArray[messageIndex].media.document) {
              //       const mimeType = messageArray[messageIndex].media.document.mimeType;
              //       if (mimeType.startsWith("video/")) {
              //         const status = await this.getMedia(messageArray[messageIndex]);
              //         if (status === true) {
              //           fileId = messageArray[messageIndex].media.document.id;
              //         }
              //       } else if (mimeType.startsWith("image/")) {
              //         const status = await this.getPhoto(messageArray[messageIndex]);
              //         if (status === true) {
              //           fileId = messageArray[messageIndex].media.document.id;
              //         }
              //       // } else if (mimeType.startsWith("application/")) {
              //       // } else {
              //       }
              //     }
              //   }
              // } else if (this.tg[clientIndex].filterType === 4) {
              //   if (messageArray[messageIndex].media) {
              //     if (messageArray[messageIndex].media.document) {
              //       const status = await this.getMedia(messageArray[messageIndex]);
              //       if (status === true) {
              //         fileId = messageArray[messageIndex].media.document.id;
              //       }
              //     }
              //   }
              // } else if (this.tg[clientIndex].filterType === 0) {
              //   if (messageArray[messageIndex].media) {
              //     if (messageArray[messageIndex].media.document) {
              //       const id = messageArray[messageIndex].media.document.id;
              //       const status = await this.getMedia(messageArray[messageIndex]);
              //       if (status === true) {
              //         fileId = messageArray[messageIndex].media.document.id;
              //       }
              //     } else if (messageArray[messageIndex].media.photo) {
              //       const id = messageArray[messageIndex].media.photo.id;
              //       const status = await this.getPhoto(messageArray[messageIndex]);
              //       if (status === true) {
              //         fileId = messageArray[messageIndex].media.photo.id;
              //       }
              //     }
              //   }
              // }
              if (messageArray[messageIndex].media) {
                if (messageArray[messageIndex].media.document) {
                  const mimeType = messageArray[messageIndex].media.document.mimeType;
                  if (mimeType.startsWith("video/")) {
                    const status = await this.getMedia(messageArray[messageIndex]);
                    if (status === true) {
                      fileId = messageArray[messageIndex].media.document.id;
                    }
                  } else if (mimeType.startsWith("image/")) {
                    const status = await this.getPhoto(messageArray[messageIndex]);
                    if (status === true) {
                      fileId = messageArray[messageIndex].media.document.id;
                    }
                  // } else if (mimeType.startsWith("application/")) {
                  // } else {
                  }
                } else if (messageArray[messageIndex].media.photo) {
                  fileId = messageArray[messageIndex].media.photo.id;
                  const status = await this.getPhoto(messageArray[messageIndex]);
                  if (status === true) {
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
          // this.offsetId += this.count;
          this.count = 0;
          await this.updateConfig(1, 0);
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
          await this.updateConfig(1, 0);
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
    } else if (command === "chat") {
      await this.chat(option);
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
    //   await this.updateConfig(1);
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
      const id = env.WEBSOCKET_SERVER.idFromName("favorites");
      const stub = env.WEBSOCKET_SERVER.get(id);
      return stub.fetch(request);
    }

    return new Response("error");
  },
};
