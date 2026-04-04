import { DurableObject } from "cloudflare:workers";
// import { TelegramClient, Api, sessions, utils } from "./gramjs";
import { TelegramClient, Api, sessions, utils } from "./teleproto";
// import { LogLevel } from "./gramjs/extensions";
import { LogLevel } from "./teleproto/extensions";
import { apiString } from "./apiString";
import bigInt from "big-integer";

export class WebSocketServer extends DurableObject {
  // webSocket = [];
  ws = null;
  stop = 0;
  apiCount = 0;
  currentStep = 0;
  compress = false;
  batch = false;
  api = apiString.slice();
  clientCount = 0;
  tg = [];
  waitTime = 180000;
  pingTime = 20000;
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
    //     //   "clientCount": this.clientCount,
    //     //   "operate": "constructor",
    //     //   "message": "添加ws成功",
    //     //   "date": new Date().getTime(),
    //     // });
    //   }
    // });

    // this.ctx.blockConcurrencyWhile(async () => {
    //   this.init();
    //   if (!this.client[0]) {
    //     await this.open(1, 0);
    //   }
    // });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  getExcludeIndex(option, begin, end, exclude) {
    const temp = [];
    for (let clientIndex = begin; clientIndex < end; clientIndex++) {
      if (exclude.includes(clientIndex) === false) {
        temp.push(this.api[clientIndex]);
        if (option.clientCount && option.clientCount > 0) {
          if (temp.length === option.clientCount) {
            break;
          }
        }
      }
    }
    this.api = temp;
    this.clientCount = this.api.length;
    this.tg = Array(this.clientCount).fill(null);
  }

  getExcludeId(option, begin, end, exclude) {
    const temp = [];
    for (let clientIndex = begin; clientIndex < end; clientIndex++) {
      if (exclude.includes(this.api[clientIndex].id) === false) {
        temp.push(this.api[clientIndex]);
        if (option.clientCount && option.clientCount > 0) {
          if (temp.length === option.clientCount) {
            break;
          }
        }
      }
    }
    this.api = temp;
    this.clientCount = this.api.length;
    this.tg = Array(this.clientCount).fill(null);
  }

  getClientCount(option, begin, end) {
    this.api = this.api.slice(begin, end);
    if (option.clientCount && option.clientCount > 0) {
      this.api = this.api.slice(0, option.clientCount);
    }
    this.clientCount = this.api.length;
    this.tg = Array(this.clientCount).fill(null);
  }

  init(option) {
    if (!this.stop || this.stop === 0) {
      if (option) {
        if (option.compress) {
          this.compress = option.compress;
        }
        if (option.batch) {
          this.batch = option.batch;
        }
        if (option.filterType) {
          this.filterType = option.filterType;
        }
      } else {
        this.compress = true;
        this.batch = false;
        this.filterType = 0;
      }
      // this.ws = null;
      // this.stop = 0;
      // this.webSocket = [];
      this.apiCount = 0;
      this.currentStep = 0;
      this.api = apiString.slice();
      this.clientCount = this.api.length;
      this.tg = Array(this.clientCount).fill(null);
      this.waitTime = 180000;
      this.pingTime = 20000;
      this.messageArray = [];
      this.filter = Api.InputMessagesFilterVideo;
      //this.filterTitle = "媒体";
      this.cacheMessage = null;
      this.batchMessage = [];
      this.dialogArray = [];
      if (option.includeIndex && option.includeIndex.length && option.includeIndex.length > 0) {
        const temp = [];
        for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
          if (option.includeIndex.includes(clientIndex) === true) {
            temp.push(this.api[clientIndex]);
            if (option.clientCount && option.clientCount > 0) {
              if (temp.length === option.clientCount) {
                break;
              }
            }
          }
        }
        this.api = temp;
        this.clientCount = this.api.length;
        this.tg = Array(this.clientCount).fill(null);
      } else if (option.includeId && option.includeId.length && option.includeId.length > 0) {
        const temp = [];
        for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
          if (option.includeId.includes(this.api[clientIndex].id) === true) {
            temp.push(this.api[clientIndex]);
            if (option.clientCount && option.clientCount > 0) {
              if (temp.length === option.clientCount) {
                break;
              }
            }
          }
        }
        this.api = temp;
        this.clientCount = this.api.length;
        this.tg = Array(this.clientCount).fill(null);
      } else if (option.beginIndex && option.beginIndex > 0) {
        if (option.endIndex && option.endIndex > 0) {
          if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
            this.getExcludeIndex(option, option.beginIndex, option.endIndex, option.excludeIndex);
          } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
            this.getExcludeId(option, option.beginIndex, option.endIndex, option.excludeId);
          } else {
            this.getClientCount(option, option.beginIndex, option.endIndex);
          }
        } else {
          if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
            this.getExcludeIndex(option, option.beginIndex, this.clientCount, option.excludeIndex);
          } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
            this.getExcludeId(option, option.beginIndex, this.clientCount, option.excludeId);
          } else {
            this.getClientCount(option, option.beginIndex, this.clientCount);
          }
        }
      } else if (option.endIndex && option.endIndex > 0) {
        if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
          this.getExcludeIndex(option, 0, option.endIndex, option.excludeIndex);
        } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
          this.getExcludeId(option, 0, option.endIndex, option.excludeId);
        } else {
          this.getClientCount(option, 0, option.endIndex);
        }
      } else if (option.beginId && option.beginId > 0) {
        if (option.endId && option.endId > 0) {
          if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
            const temp = [];
            for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
              if (this.api[clientIndex].id >= option.beginId && this.api[clientIndex].id <= option.endId) {
                if (option.excludeIndex.includes(clientIndex) === false) {
                  temp.push(this.api[clientIndex]);
                  if (option.clientCount && option.clientCount > 0) {
                    if (temp.length === option.clientCount) {
                      break;
                    }
                  }
                }
              }
            }
            this.api = temp;
          } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
            const temp = [];
            for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
              if (this.api[clientIndex].id >= option.beginId && this.api[clientIndex].id <= option.endId) {
                if (option.excludeId.includes(this.api[clientIndex].id) === false) {
                  temp.push(this.api[clientIndex]);
                  if (option.clientCount && option.clientCount > 0) {
                    if (temp.length === option.clientCount) {
                      break;
                    }
                  }
                }
              }
            }
            this.api = temp;
          } else {
            const temp = [];
            for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
              if (this.api[clientIndex].id >= option.beginId && this.api[clientIndex].id <= option.endId) {
                temp.push(this.api[clientIndex]);
                if (option.clientCount && option.clientCount > 0) {
                  if (temp.length === option.clientCount) {
                    break;
                  }
                }
              }
            }
            this.api = temp;
            if (option.clientCount && option.clientCount > 0) {
              this.api = this.api.slice(0, option.clientCount);
            }
          }
        } else {
          if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
            const temp = [];
            for (let clientIndex = option.beginIndex; clientIndex < this.clientCount; clientIndex++) {
              if (this.api[clientIndex].id >= option.beginId) {
                if (option.excludeIndex.includes(clientIndex) === false) {
                  temp.push(this.api[clientIndex]);
                  if (option.clientCount && option.clientCount > 0) {
                    if (temp.length === option.clientCount) {
                      break;
                    }
                  }
                }
              }
            }
            this.api = temp;
          } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
            const temp = [];
            for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
              if (this.api[clientIndex].id >= option.beginId) {
                if (option.excludeId.includes(this.api[clientIndex].id) === false) {
                  temp.push(this.api[clientIndex]);
                  if (option.clientCount && option.clientCount > 0) {
                    if (temp.length === option.clientCount) {
                      break;
                    }
                  }
                }
              }
            }
            this.api = temp;
          } else {
            const temp = [];
            for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
              if (this.api[clientIndex].id >= option.beginId) {
                temp.push(this.api[clientIndex]);
                if (option.clientCount && option.clientCount > 0) {
                  if (temp.length === option.clientCount) {
                    break;
                  }
                }
              }
            }
            this.api = temp;
            if (option.clientCount && option.clientCount > 0) {
              this.api = this.api.slice(0, option.clientCount);
            }
          }
        }
        this.clientCount = this.api.length;
        this.tg = Array(this.clientCount).fill(null);
      } else if (option.endId && option.endId > 0) {
        if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
          const temp = [];
          for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
            if (this.api[clientIndex].id <= option.endId) {
              if (option.excludeIndex.includes(clientIndex) === false) {
                temp.push(this.api[clientIndex]);
                if (option.clientCount && option.clientCount > 0) {
                  if (temp.length === option.clientCount) {
                    break;
                  }
                }
              }
            }
          }
          this.api = temp;
        } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
          const temp = [];
          for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
            if (this.api[clientIndex].id <= option.endId) {
              if (option.excludeId.includes(this.api[clientIndex].id) === false) {
                temp.push(this.api[clientIndex]);
                if (option.clientCount && option.clientCount > 0) {
                  if (temp.length === option.clientCount) {
                    break;
                  }
                }
              }
            }
          }
          this.api = temp;
        } else {
          const temp = [];
          for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
            if (this.api[clientIndex].id <= option.endId) {
              temp.push(this.api[clientIndex]);
              if (option.clientCount && option.clientCount > 0) {
                if (temp.length === option.clientCount) {
                  break;
                }
              }
            }
          }
          this.api = temp;
          if (option.clientCount && option.clientCount > 0) {
            this.api = this.api.slice(0, option.clientCount);
          }
        }
        this.clientCount = this.api.length;
        this.tg = Array(this.clientCount).fill(null);
      } else {
        if (option.excludeIndex && option.excludeIndex.length && option.excludeIndex.length > 0) {
          this.getExcludeIndex(option, 0, this.clientCount, option.excludeIndex);
        } else if (option.excludeId && option.excludeId.length && option.excludeId.length > 0) {
          this.getExcludeId(option, 0, this.clientCount, option.excludeId);
        } else if (option.clientCount && option.clientCount > 0) {
          this.api = this.api.slice(0, option.clientCount);
          this.clientCount = this.api.length;
          this.tg = Array(this.clientCount).fill(null);
        }
      }
      // this.sendLog(0, "init", "clientCount : " + this.clientCount, null, false);  //测试
      this.broadcast({
        "step": this.currentStep,
        "operate": "init",
        "message": "clientCount : " + this.clientCount,
        "date": new Date().getTime(),
      });  //测试
    }
  }

  initChat(clientIndex, option) {
    if (!this.tg[clientIndex].client || !this.stop || this.stop === 0) {
    // if (!this.stop || this.stop === 0) {
      if (option) {
        if (option.chatId && option.chatId > 0) {
          this.tg[clientIndex].chatId = option.chatId;
        }
        if (option.endChat && option.endChat > 0) {
          this.tg[clientIndex].endChat = option.endChat;
        }
        if (option.reverse) {
          this.tg[clientIndex].reverse = option.reverse;
        }
        if (option.limit && option.limit > 0) {
          this.tg[clientIndex].limit = option.limit;
        }
        if (option.offsetId && option.offsetId > 0) {
          this.tg[clientIndex].offsetId = option.offsetId;
        }
      } else {
        this.tg[clientIndex].chatId = 0;
        this.tg[clientIndex].endChat = 0;
        this.tg[clientIndex].reverse = true;
        this.tg[clientIndex].limit = 100;
        this.tg[clientIndex].offsetId = 0;
      }
      // this.tg[clientIndex].client = null;
      this.tg[clientIndex].lastChat = 0;
      this.tg[clientIndex].fromPeer = null;
    }
  }

  broadcast(message) {
    if (message === "ping") {
      this.ctx.getWebSockets().forEach((ws) => {
      // this.webSocket.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(message);
          } catch (e) {
          }
        }
      });
      return;
    } else if (this.compress === true) {
      if (message.operate === "open") {
      } else if (message.operate === "close") {
      } else if (message.operate === "checkChat") {
      } else if (message.operate === "chat") {
      } else if (message.status === "limit") {
      } else if (!message.error) {
        if (!message.result) {
          return;
        }
      }
      if (this.batch === true) {
        if (this.batchMessage.length < this.tg[clientIndex].limit) {
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
      if (this.batchMessage.length < this.tg[clientIndex].limit) {
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
          //   //   "clientCount": this.clientCount,
          //   //   "operate": "broadcast",
          //   //   "message": "删除ws成功",
          //   //   "date": new Date().getTime(),
          //   // });
          // } else {
          //   //console.log("(" + this.currentStep + ")没找到该ws");
          //   this.broadcast({
          //     "step": this.currentStep,
          //     "clientCount": this.clientCount,
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

  sendGrid(clientIndex, operate, message, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "clientCount": this.clientCount,
      "clientIndex": clientIndex + 1,
      "clientId": this.tg[clientIndex].clientId,
      "chatId": this.tg[clientIndex].chatId,
      "offsetId": this.tg[clientIndex].offsetId,
      "operate": operate,
      "message": message,
      "status": status,
      "error": error,
      "date": new Date().getTime(),
    });
  }

  sendLog(clientIndex, operate, message, status, error) {
    this.broadcast({
      "step": this.currentStep,
      "clientCount": this.clientCount,
      "clientIndex": clientIndex + 1,
      "clientId": this.tg[clientIndex].clientId,
      "chatId": this.tg[clientIndex].chatId,
      "operate": operate,
      "message": message,
      "status": status,
      "error": error,
      "date": new Date().getTime(),
    });
  }

  async close(clientIndex) {
    if (this.tg[clientIndex].client) {
      await this.tg[clientIndex].client.destroy();
      this.tg[clientIndex].client = null;
      //console.log("断开服务器" + (clientIndex + 1) + "成功");
      this.sendLog(clientIndex, "close", "断开服务器" + (clientIndex + 1) + "成功", null, false);
    }
  }

  async open(clientIndex, tryCount) {
    try {
      this.tg[clientIndex].client = await new TelegramClient(new sessions.StringSession(this.api[clientIndex].sessionString), this.api[clientIndex].apiId, this.api[clientIndex].apiHash, {
        connectionRetries: Number.MAX_VALUE,
        autoReconnect: true,
        deviceModel: "Desktop",
        systemVersion: "Windows 10",
        appVersion: "5.12.3 x64",
        langCode: "en",
        systemLangCode: "en-US",
        //downloadRetries: 1,
        //retryDelay: 0,
        //useWSS: false,
      })
      if (this.api[clientIndex].dc === 5) {
        await this.tg[clientIndex].client.session.setDC(5, "91.108.56.128", 80);
      }
      await this.tg[clientIndex].client.setLogLevel(LogLevel.ERROR);
      await this.tg[clientIndex].client.connect();
    } catch (e) {
      //console.log("login出错 : " + e);
      this.sendLog(clientIndex, "open", "login出错 : " + e, null, true);
      if (tryCount === 20) {
        //console.log("(" + this.currentStep + ")open超出tryCount限制");
        this.sendLog(clientIndex, "open", "超出tryCount限制", null, true);
        await this.close(clientIndex);
      } else {
        await scheduler.wait(30000);
        await this.open(clientIndex, tryCount + 1);
      }
      return;
    }
    //console.log("连接服务器" + (clientIndex + 1) + "成功");
    this.sendLog(clientIndex, "open", "连接服务器" + (clientIndex + 1) + "成功", null, false);  //测试
    //console.log(this.tg[clientIndex].client);  //测试
    await scheduler.wait(5000);
  }

  async closeAll() {
    for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
      await this.close(clientIndex);
    }
    this.stop = 0;
    this.ws.close();
    this.ctx.abort("reset");
  }

  async insertConfigError(clientIndex, tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")insertConfig超出tryCount限制");
      this.sendLog(clientIndex, "insertConfig", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.insertConfig(clientIndex, tryCount + 1);
    }
  }

  async insertConfig(clientIndex, tryCount) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("INSERT INTO `CONFIG` (tgId, name, chatId, reverse, limited) VALUES (?, ?, ?, ?, ?);").bind(this.tg[clientIndex].clientId, 'forward', this.tg[clientIndex].chatId, this.tg[clientIndex].reverse, this.tg[clientIndex].limit).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] insertConfig出错 : " + e);;
      this.sendLog(clientIndex, "insertConfig", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertConfigError(clientIndex, tryCount);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] 插入config数据成功");
      this.sendLog(clientIndex, "insertConfig", "插入config数据成功", "success", false);
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] 插入config数据失败");
      this.sendLog(clientIndex, "insertConfig", "插入config数据失败", "error", true);
      await this.insertConfigError(clientIndex, tryCount);
    }
  }

  async getConfigError(clientIndex, tryCount, option) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")getConfig超出tryCount限制");
      this.sendLog(clientIndex, "getConfig", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.getConfig(clientIndex, tryCount + 1, option);
    }
  }

  async getConfig(clientIndex, tryCount, option) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `tgId` = ? AND `name` = 'forward' LIMIT 1;").bind(this.tg[clientIndex].clientId).run();
    } catch (e) {
      //console.log("getConfig出错 : " + e);
      this.sendLog(clientIndex, "getConfig", "出错 : " + JSON.stringify(e), null, true);
      await this.getConfigError(clientIndex, tryCount, option);
      return;
    }
    //console.log("configResult : " + configResult);  //测试
    if (configResult.success === true) {
      if (configResult.results && configResult.results.length > 0) {
        const result = configResult.results[0];
        if (!option || !option.chatId) {
          if (result.chatId && result.chatId > 0) {
            this.tg[clientIndex].chatId = result.chatId;
            this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
          }
        }
        if (!option || !option.reverse) {
          if (result.reverse) {
            this.tg[clientIndex].reverse = Boolean(result.reverse);
          }
        }
        if (!option || !option.limited) {
          if (result.limited && result.limited > 0) {
            this.tg[clientIndex].limit = result.limited;
          }
        }
      } else {
        //console.log("没有预设config");
        // this.sendLog(clientIndex, "getConfig", "没有预设config", null, false);
        this.tg[clientIndex].chatId = 1;
        this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
        this.tg[clientIndex].reverse = true;
        this.tg[clientIndex].limit = 100;
        await this.insertConfig(clientIndex, 1);
      }
    } else {
      //console.log("查询config失败");
      this.sendLog(clientIndex, "getConfig", "查询config失败", null, true);
      await this.getConfigError(clientIndex, tryCount, option);
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
        //this.filterTitle = "文档";
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

  async setOffsetId(clientIndex, chatResult) {
    if (this.filterType === 0) {
      this.tg[clientIndex].offsetId = chatResult.current;
    } else if (this.filterType === 1) {
      this.tg[clientIndex].offsetId = chatResult.photo;
    } else if (this.filterType === 2) {
      this.tg[clientIndex].offsetId = chatResult.video;
    } else if (this.filterType === 3) {
      this.tg[clientIndex].offsetId = chatResult.document;
    } else if (this.filterType === 4) {
      this.tg[clientIndex].offsetId = chatResult.gif;
    }
  }

  async contrastChat(clientIndex) {
    return !this.tg[clientIndex].endChat || this.tg[clientIndex].endChat === 0 || (this.tg[clientIndex].endChat > 0 && this.tg[clientIndex].chatId <= this.tg[clientIndex].endChat);
  }

  async noExistChatError(clientIndex, tryCount, Cindex) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")noExistChat超出tryCount限制");
      this.sendLog(clientIndex, "noExistChat", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.noExistChat(clientIndex, tryCount + 1, Cindex);
    }
  }

  async noExistChat(clientIndex, tryCount, Cindex) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(Cindex).run();
    } catch (e) {
      //console.log("noExistChat出错 : " + e);
      this.sendLog(clientIndex, "noExistChat", "出错 : " + JSON.stringify(e), null, true);
      await this.noExistChatError(clientIndex, tryCount, Cindex);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("更新不存在chat数据成功");
      this.sendLog(clientIndex, "noExistChat", "更新不存在chat数据成功", null, false);
    } else {
      //console.log("更新不存在chat数据失败");
      this.sendLog(clientIndex, "noExistChat", "更新不存在chat数据失败", null, true);
      await this.noExistChatError(clientIndex, tryCount, Cindex);
    }
  }

  async noforwardChatError(clientIndex, tryCount, Cindex) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")noforwardChat超出tryCount限制");
      this.sendLog(clientIndex, "noforwardChat", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.noforwardChat(clientIndex, tryCount + 1, Cindex);
    }
  }

  async noforwardChat(clientIndex, tryCount, Cindex) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `noforwards` = 1 WHERE `Cindex` = ?;").bind(Cindex).run();
    } catch (e) {
      //console.log("noforwardChat出错 : " + e);
      this.sendLog(clientIndex, "noforwardChat", "出错 : " + JSON.stringify(e), null, true);
      await this.noforwardChatError(clientIndex, tryCount, Cindex);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("更新不允许转发消息的chat数据成功");
      this.sendLog(clientIndex, "noforwardChat", "更新不允许转发消息的chat数据成功", null, false);
    } else {
      //console.log("更新不允许转发消息的chat数据失败");
      this.sendLog(clientIndex, "noforwardChat", "更新不允许转发消息的chat数据失败", null, true);
      await this.noforwardChatError(clientIndex, tryCount, Cindex);
    }
  }

  async checkChat(clientIndex, tryCount, chatResult) {
    if (chatResult.channelId && chatResult.accessHash) {
      let result = null;
      try {
        result = await this.tg[clientIndex].client.invoke(new Api.channels.GetChannels({
          id: [new Api.InputChannel({
            channelId: bigInt(chatResult.channelId),
            accessHash: bigInt(chatResult.accessHash),
          })],
        }));
      } catch (e) {
        //console.log("(" + this.currentStep + ")出错 : " + e);
        this.sendLog(clientIndex, "checkChat", "出错 : " + JSON.stringify(e), null, true);
        if (e.errorMessage === "CHANNEL_INVALID" || e.errorMessage === "CHANNEL_PRIVATE" || e.code === 400) {
          await this.noExistChat(clientIndex, 1, chatResult.Cindex);
        } else {
          if (tryCount === 20) {
            //console.log("(" + this.currentStep + ")checkChat超出tryCount限制");
            this.sendLog(clientIndex, "checkChat", "超出tryCount限制", null, true);
            await this.close(clientIndex);
          } else {
            await scheduler.wait(10000);
            await this.checkChat(clientIndex, tryCount + 1, chatResult);
          }
        }
        return;
      }
      // console.log(this.tg[clientIndex].fromPeer);  //测试
      if (result && result.chats && result.chats.length > 0) {
        this.tg[clientIndex].chatId = chatResult.Cindex;
        if (this.contrastChat(clientIndex)) {
          if (result.chats[0].noforwards === true) {
            await this.noforwardChat(clientIndex, 1, chatResult.Cindex);
            this.tg[clientIndex].chatId = chatResult.Cindex + 1;
            if (this.contrastChat(clientIndex)) {
              //console.log(chatResult.title + " : chat不允许转发消息");  //测试
              this.sendLog(clientIndex, "checkChat", chatResult.title + " : chat不允许转发消息", null, true);
              await this.nextChat(clientIndex, 1, true);
            } else {
              //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
              this.sendLog(clientIndex, "checkChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
            }
          } else {
            this.tg[clientIndex].fromPeer = result.chats[0];
            if (this.tg[clientIndex].fromPeer) {
              this.setOffsetId(clientIndex, chatResult);
              this.sendGrid(clientIndex, "checkChat", this.tg[clientIndex].chatId + " : " + chatResult.title, "add", false);
            } else {
              await this.noExistChat(clientIndex, 1, chatResult.Cindex);
              this.tg[clientIndex].chatId = chatResult.Cindex + 1;
              if (this.contrastChat(clientIndex)) {
                //console.log(chatResult.title + " : chat已不存在了");  //测试
                this.sendLog(clientIndex, "checkChat", chatResult.title + " : chat已不存在了", null, true);
                await this.nextChat(clientIndex, 1, true);
              } else {
                //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
                this.sendLog(clientIndex, "checkChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
              }
            }
          }
        } else {
          //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
          this.sendLog(clientIndex, "checkChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
        }
      } else {
        await this.noExistChat(clientIndex, 1, chatResult.Cindex);
        this.tg[clientIndex].chatId = chatResult.Cindex + 1;
        if (this.contrastChat(clientIndex)) {
          //console.log(chatResult.title + " : chat已不存在了");  //测试
          this.sendLog(clientIndex, "checkChat", chatResult.title + " : chat已不存在了", null, true);
          await this.nextChat(clientIndex, 1, true);
        } else {
          //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
          this.sendLog(clientIndex, "checkChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
        }
      }
    } else {
      this.tg[clientIndex].chatId = chatResult.Cindex + 1;
      if (this.contrastChat(clientIndex)) {
        //console.log(chatResult.title + " : channelId或accessHash出错");  //测试
        this.sendLog(clientIndex, "checkChat", chatResult.title + " : channelId或accessHash出错", null, true);
        await this.nextChat(clientIndex, 1, true);
      } else {
        //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
        this.sendLog(clientIndex, "checkChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
      }
    }
  }

  async nextChatError(clientIndex, tryCount, check) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")nextChat超出tryCount限制");
      this.sendLog(clientIndex, "nextChat", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.nextChat(clientIndex, tryCount + 1, check);
    }
  }

  async nextChat(clientIndex, tryCount, check) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` >= ? AND `noforwards` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")出错 : " + e);
      this.sendLog(clientIndex, "nextChat", "出错 : " + JSON.stringify(e), null, true);
      await this.nextChatError(clientIndex, tryCount, check);
      return;
    }
    //console.log("chatResult : " + chatResult"]);  //测试
    if (chatResult.success === true) {
      if (chatResult.results && chatResult.results.length > 0) {
        if (check === true) {
          await this.checkChat(clientIndex, 1, chatResult.results[0]);
        } else {
          this.tg[clientIndex].chatId = chatResult.results[0].Cindex;
          this.sendGrid(clientIndex, "nextChat", this.tg[clientIndex].chatId + " : " + chatResult.results[0].title, "add", false);
        }
      } else {
        this.tg[clientIndex].chatId = -1;
        //console.log("没有更多chat了");
        this.sendLog(clientIndex, "nextChat", "没有更多chat了", null, true);
      }
    } else {
      //console.log("查询chat失败");
      this.sendLog(clientIndex, "nextChat", "查询chat失败", null, true);
      await this.nextChatError(clientIndex, tryCount, check);
    }
  }

  async getChat(clientIndex) {
    if (this.tg[clientIndex].chatId && this.tg[clientIndex].chatId > 0) {
      if (this.contrastChat(clientIndex)) {
        await this.nextChat(clientIndex, 1, true);
      } else {
        //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
        this.sendLog(clientIndex, "getChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
      }
    } else {
      if (this.contrastChat(clientIndex)) {
        let tryCount = 0;
        while (tryCount < 30) {
          this.apiCount += 1;
          let chatResult = {};
          try {
            if (this.filterType === 0) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `noforwards` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 1) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `noforwards` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 2) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `noforwards` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 3) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `noforwards` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 4) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `noforwards` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            }
          } catch (e) {
            tryCount += 1;
            //console.log("(" + this.currentStep + ")getChat出错 : " + e);
            this.sendLog(clientIndex, "getChat", "出错 : " + JSON.stringify(e), null, true);
            await scheduler.wait(10000);
            return;
          }
          //console.log("chatResult : " + chatResult"]);  //测试
          if (chatResult.success === true) {
            if (chatResult.results && chatResult.results.length > 0) {
              await this.checkChat(clientIndex, 1, chatResult.results[0]);
            } else {
              this.tg[clientIndex].chatId = -1;
              //console.log("没有更多chat了");
              this.sendLog(clientIndex, "getChat", "没有更多chat了", null, true);
            }
            break;
          } else {
            //console.log("查询chat失败");
            this.sendLog(clientIndex, "getChat", "查询chat失败", null, true);
          }
        }
      } else {
        //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
        this.sendLog(clientIndex, "getChat", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
      }
    }
  }

  async updateConfigError(clientIndex, tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")updateConfig超出tryCount限制");
      this.sendLog(clientIndex, "updateConfig", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.updateConfig(clientIndex, tryCount + 1);
    }
  }

  async updateConfig(clientIndex, tryCount) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `tgId` = ?;").bind(this.tg[clientIndex].chatId, this.tg[clientIndex].clientId).run();
    } catch (e) {
      //console.log("updateConfig出错 : " + e);
      this.sendLog(clientIndex, "updateConfig", "出错 : " + JSON.stringify(e), null, true);
      await this.updateConfigError(clientIndex, tryCount);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
      //console.log("更新config数据成功");
      this.sendLog(clientIndex, "updateConfig", "更新config数据成功", null, false);
    } else {
      //console.log("更新config数据失败");
      this.sendLog(clientIndex, "updateConfig", "更新config数据失败", null, true);
      await this.updateConfigError(clientIndex, tryCount);
    }
  }

  async getMessage(clientIndex, tryCount) {
    try {
      let count = 0;
      for await (const message of this.tg[clientIndex].client.iterMessages(
        this.tg[clientIndex].fromPeer,
        //"me",  //测试
        {
          limit: this.tg[clientIndex].limit,
          //limit: 20,  //测试
          reverse: this.tg[clientIndex].reverse,
          //reverse: false,  //测试
          addOffset: -this.tg[clientIndex].offsetId,
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
      this.sendLog(clientIndex, "getMessage", "出错 : " + JSON.stringify(e), null, true);
      if (e.errorMessage === "CHANNEL_INVALID" || e.errorMessage === "CHANNEL_PRIVATE" || e.code === 400) {
        await this.noExistChat(clientIndex, 1, chatResult.Cindex);
      } else {
        if (tryCount === 20) {
          //console.log("(" + this.currentStep + ")getMessage超出tryCount限制");
          this.sendLog(clientIndex, "getMessage", "超出tryCount限制", null, true);
          await this.close(clientIndex);
        } else {
          await scheduler.wait(10000);
          await this.getMessage(clientIndex, tryCount + 1);
        }
      }
      return;
    }
  }

  async updateChatError(clientIndex, tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")updateChat超出tryCount限制");
      this.sendLog(clientIndex, "updateChat", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.updateChat(clientIndex, tryCount + 1);
    }
  }

  async updateChat(clientIndex, tryCount) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      if (this.filterType === 0) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.tg[clientIndex].offsetId, new Date().getTime(), this.tg[clientIndex].chatId).run();
      } else if (this.filterType === 1) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `photo` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.tg[clientIndex].offsetId, new Date().getTime(), this.tg[clientIndex].chatId).run();
      } else if (this.filterType === 2) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `video` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.tg[clientIndex].offsetId, new Date().getTime(), this.tg[clientIndex].chatId).run();
      } else if (this.filterType === 3) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `document` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.tg[clientIndex].offsetId, new Date().getTime(), this.tg[clientIndex].chatId).run();
      } else if (this.filterType === 4) {
        chatResult = await this.env.MAINDB.prepare("UPDATE `FORWARDCHAT` SET `gif` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.tg[clientIndex].offsetId, new Date().getTime(), this.tg[clientIndex].chatId).run();
      }
    } catch (e) {
      //console.log("(" + this.currentStep + ")updateChat出错 : " + e);
      this.sendLog(clientIndex, "updateChat", "出错 : " + JSON.stringify(e), null, true);
      await this.updateChatError(clientIndex, tryCount);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("(" + this.currentStep + ")更新chat数据成功");
      this.sendLog(clientIndex, "updateChat", "更新chat数据成功", null, false);
    } else {
      //console.log("(" + this.currentStep + ")更新chat数据失败");
      this.sendLog(clientIndex, "updateChat", "更新chat数据失败", null, true);
      await this.updateChatError(clientIndex, tryCount);
    }
  }

  async getNext(clientIndex) {
    this.tg[clientIndex].fromPeer = null;
    this.tg[clientIndex].chatId += 1;
    if (this.contrastChat(clientIndex)) {
      this.tg[clientIndex].errorCount = await this.ctx.storage.get(this.tg[clientIndex].chatId) || 0;
      await this.getChat(clientIndex);
      if (this.tg[clientIndex].fromPeer) {
        if (this.tg[clientIndex].chatId != this.tg[clientIndex].lastChat) {
          if (this.tg[clientIndex].lastChat != 0) {
            await this.updateConfig(clientIndex);
          }
          this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
        }
      } else {
        if (this.clientCount === 1) {
          //console.log("(" + this.currentStep + ")全部client的chat采集完毕");
          this.sendLog(clientIndex, "getNext", "全部client的chat采集完毕", null, false);
          this.broadcast({
            "result": "over",
          });
        } else {
          //console.log("(" + this.currentStep + ")当前client的全部chat采集完毕");
          this.sendLog(clientIndex, "getNext", "当前client的全部chat采集完毕", null, false);
        }
        await this.close(clientIndex);
      }
    } else {
      //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
      this.sendLog(clientIndex, "getNext", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
      await this.close(clientIndex);
    }
  }

  async forwardMessage(clientIndex, idArray, fileIdArray) {
    const messageLength = idArray.length;
    //console.log(length);
    if (this.tg[clientIndex].time && this.tg[clientIndex].time > 0) {
      const time = this.waitTime - (new Date().getTime() - this.tg[clientIndex].time);
      if (time > 0) {
        //console.log("(" + this.currentStep + ") 还需等待" + (time / 1000) + "秒");
        this.sendGrid(clientIndex, "forwardMessage", "还需等待" + Math.ceil(time / 1000) + "秒", "wait", false);
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
            // this.ws.send("ping");
            this.broadcast("ping");
          }
        } else {
          await scheduler.wait(time);
        }
      }
    }
    if (messageLength > 0) {
      try {
        const forwardResult = await this.tg[clientIndex].client.invoke(new Api.messages.ForwardMessages({
          fromPeer: this.tg[clientIndex].fromPeer,
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
        // this.sendLog(clientIndex, "forwardMessage", JSON.stringify(forwardResult), null, false);
      } catch (e) {
        if (e.errorMessage === "CHAT_FORWARDS_RESTRICTED" || e.code === 400) {
          this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
          //console.log("(" + this.currentStep + ") 消息不允许转发" + e);
          this.sendGrid(clientIndex, "forwardMessage", "消息不允许转发 : " + JSON.stringify(e), "error", true);
          await this.getNext(clientIndex);
        } else if (e.errorMessage === "FLOOD" || e.code === 420) {
          this.waitTime += 120000;
          //console.log("(" + this.currentStep + ") 触发了洪水警告，请求太频繁" + e);
          this.sendGrid(clientIndex, "forwardMessage", "触发了洪水警告，请求太频繁 : " + JSON.stringify(e), "error", true);
        } else {
          //console.log("(" + this.currentStep + ") 转发消息时发生错误" + e);
          this.sendGrid(clientIndex, "forwardMessage", "转发消息时发生错误 : " + JSON.stringify(e), "error", true);
        }
        return;
      }
      this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
      await this.updateChat(clientIndex, 1);
      //console.log("(" + this.currentStep + ") 成功转发了" + length + "条消息");
      this.broadcast({
        "clientIndex": clientIndex,
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "offsetId": this.tg[clientIndex].offsetId,
        "operate": "forwardMessage",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "messageLength": messageLength,
        "message": "成功转发了" + messageLength + "条消息",
        "status": "update",
        "date": new Date().getTime(),
      });
    } else {
      this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
      await this.updateChat(clientIndex, 1);
      this.tg[clientIndex].errorCount += 1;
      if (this.tg[clientIndex].errorCount >= 3) {
        // await this.ctx.storage.put(this.tg[clientIndex].chatId, 0);
        //console.log("(" + this.currentStep + ") 连续3轮的消息无需转发");
        this.sendGrid(clientIndex, "forwardMessage", "连续3轮的消息无需转发", "error", true);
        await this.getNext(clientIndex);
      } else {
        await this.ctx.storage.put(this.tg[clientIndex].chatId, this.tg[clientIndex].errorCount);
        //console.log("(" + this.currentStep + ") 第" + this.tg[clientIndex].errorCount + "轮消息无需转发");
        this.sendGrid(clientIndex, "forwardMessage", "第" + this.tg[clientIndex].errorCount + "轮消息无需转发", "error", true);
      }
    }
    this.tg[clientIndex].time = new Date().getTime();
  }

  async nextStep() {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        this.currentStep += 1;
        await scheduler.wait(3000);
        for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
          if (this.tg[clientIndex].client) {
            const messageCount = await this.getMessage(clientIndex, 1);
            const messageArray = this.messageArray.slice();
            const messageLength = messageArray.length;
            this.messageArray = [];
            //console.log("(" + this.currentStep + ")messageLength : " + messageLength);
            // this.sendLog(clientIndex, "nextStep", "messageLength : " + messageLength, null, false);  //测试
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
                    } else if (this.filterType === 0) {
                      if (messageArray[messageIndex].media) {
                        if (messageArray[messageIndex].media.document) {
                          fileId = messageArray[messageIndex].media.document.id;
                        }
                      } else if (messageArray[messageIndex].media) {
                        if (messageArray[messageIndex].media.photo) {
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
                await this.forwardMessage(clientIndex, idArray, fileIdArray);
              } else if (this.stop === 2) {
                this.broadcast({
                  "result": "pause",
                });
                await this.closeAll();
              }
            } else if (messageCount > 0) {
              //console.log("(" + this.currentStep + ")messageCount : " + messageCount);
              this.sendLog(clientIndex, "nextStep", "messageCount : " + messageCount, null, true);
              this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
              await this.updateChat(clientIndex, 1);
              if (this.stop === 2) {
                this.broadcast({
                  "result": "pause",
                });
                await this.close();
              }
            } else {
              await this.updateChat(clientIndex, 1);
              this.tg[clientIndex].fromPeer = null;
              //console.log("(" + this.currentStep + ")" + this.tg[clientIndex].chatId + " : 当前chat采集完毕");
              this.sendLog(clientIndex, "nextStep", "当前chat采集完毕", null, false);
              this.broadcast({
                "result": "end",
              });
              this.tg[clientIndex].chatId += 1;
              if (this.contrastChat(clientIndex)) {
                this.tg[clientIndex].errorCount = await this.ctx.storage.get(this.tg[clientIndex].chatId) || 0;
                await this.getChat(clientIndex);
                if (this.tg[clientIndex].fromPeer) {
                  if (this.tg[clientIndex].chatId != this.tg[clientIndex].lastChat) {
                    if (this.tg[clientIndex].lastChat != 0) {
                      await this.updateConfig(clientIndex);
                    }
                    this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
                  }
                  if (this.stop === 2) {
                    this.broadcast({
                      "result": "pause",
                    });
                    await this.closeAll();
                  }
                } else {
                  if (this.clientCount === 1) {
                    //console.log("(" + this.currentStep + ")全部client的chat采集完毕");
                    this.sendLog(clientIndex, "nextStep", "全部client的chat采集完毕", null, false);
                    this.broadcast({
                      "result": "over",
                    });
                  } else {
                    //console.log("(" + this.currentStep + ")当前client的全部chat采集完毕");
                    this.sendLog(clientIndex, "nextStep", "当前client的全部chat采集完毕", null, false);
                  }
                  await this.close(clientIndex);
                  this.api.splice(clientIndex, 1);
                  this.tg.splice(clientIndex, 1);
                  this.clientCount--;
                  clientIndex--;
                }
              } else {
                //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
                this.sendLog(clientIndex, "nextStep", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
                await this.close(clientIndex);
                this.api.splice(clientIndex, 1);
                this.tg.splice(clientIndex, 1);
                this.clientCount--;
                clientIndex--;
              }
            }
          } else {
            //console.log("连接TG服务" + clientIndex + "失败");
            this.sendLog(clientIndex, "nextStep", "连接TG服务" + clientIndex + "失败", null, true);
          }
        }
        if (this.stop === 1) {
          if (this.apiCount < 900) {
            await this.nextStep();
          } else {
            this.stop = 2;
            //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
            this.sendLog(clientIndex, "nextStep", "超出apiCount限制", "limit", true);
            await this.closeAll();
            // this.ctx.abort("reset");
          }
        } else if (this.stop === 2) {
          this.broadcast({
            "result": "pause",
          });
          await this.closeAll();
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
        this.sendLog(clientIndex, "nextStep", "超出apiCount限制", "limit", true);
        await this.closeAll();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      this.broadcast({
        "result": "pause",
      });
      await this.closeAll();
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
    // if (this.client || this.stop === 1) {
    if (this.stop === 1) {
      this.ws.send(JSON.stringify({
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "operate": "start",
        "message": "服务已经运行过了",
        "error": true,
        "date": new Date().getTime(),
      }));
      return;
    }
    this.init(option);
    this.stop = 1;
    this.switchType();
    this.currentStep += 1;
    for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
      this.tg[clientIndex] = {
        "clientId": 0,
        "client": null,
        "chatId": 0,
        "endChat": 0,
        "lastChat": 0,
        "reverse": true,
        "limit": 100,
        "offsetId": 0,
        "fromPeer": null,
        "errorCount": 0,
        "time": 0,
      };
      this.tg[clientIndex].clientId = this.api[clientIndex].id;
      this.initChat(clientIndex, option);
      await this.open(clientIndex, 1);
      if (this.tg[clientIndex].client) {
        if (!option || !option.chatId || !option.reverse || !option.limited) {
          await this.getConfig(clientIndex, 1, option);
        }
        await this.getChat(clientIndex);
        if (this.tg[clientIndex].fromPeer) {
          if (this.tg[clientIndex].chatId != this.tg[clientIndex].lastChat) {
            if (this.tg[clientIndex].lastChat != 0) {
              await this.updateConfig(clientIndex);
            }
            this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
          }
          if (this.stop === 1) {
            const messageCount = await this.getMessage(clientIndex, 1);
            const messageArray = this.messageArray.slice();
            const messageLength = messageArray.length;
            this.messageArray = [];
            // this.sendLog(clientIndex, "start", "messageLength : " + messageLength, null, false);  //测试
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
                  } else if (this.filterType === 0) {
                    if (messageArray[messageIndex].media) {
                      if (messageArray[messageIndex].media.document) {
                        fileId = messageArray[messageIndex].media.document.id;
                      }
                    } else if (messageArray[messageIndex].media) {
                      if (messageArray[messageIndex].media.photo) {
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
              await this.forwardMessage(clientIndex, idArray, fileIdArray);
            } else if (messageCount > 0) {
              //console.log("(" + this.currentStep + ")messageCount : " + messageCount");
              this.sendLog(clientIndex, "start", "messageCount : " + messageCount, null, true);
              this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
              await this.updateChat(clientIndex, 1);
              if (this.stop === 2) {
                this.broadcast({
                  "result": "pause",
                });
                await this.close();
              }
            } else {
              await this.updateChat(clientIndex, 1);
              this.tg[clientIndex].fromPeer = null;
              //console.log("(" + this.currentStep + ")" + this.tg[clientIndex].chatId + " : 当前chat采集完毕");
              this.sendLog(clientIndex, "start", "当前chat采集完毕", null, false);
              this.broadcast({
                "result": "end",
              });
              this.tg[clientIndex].errorCount = await this.ctx.storage.get(this.tg[clientIndex].chatId) || 0;
              this.tg[clientIndex].chatId += 1;
              if (this.contrastChat(clientIndex)) {
                await this.getChat(clientIndex);
                if (this.tg[clientIndex].fromPeer) {
                  if (this.tg[clientIndex].chatId != this.tg[clientIndex].lastChat) {
                    if (this.tg[clientIndex].lastChat != 0) {
                      await this.updateConfig(clientIndex);
                    }
                    this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
                  }
                  if (this.stop === 2) {
                    this.broadcast({
                      "result": "pause",
                    });
                    await this.closeAll();
                  }
                } else {
                  if (this.clientCount === 1) {
                    //console.log("(" + this.currentStep + ")全部client的chat采集完毕");
                    this.sendLog(clientIndex, "start", "全部client的chat采集完毕", null, false);
                    this.broadcast({
                      "result": "over",
                    });
                  } else {
                    //console.log("(" + this.currentStep + ")当前client的全部chat采集完毕");
                    this.sendLog(clientIndex, "start", "当前client的全部chat采集完毕", null, false);
                  }
                  await this.close(clientIndex);
                  this.api.splice(clientIndex, 1);
                  this.tg.splice(clientIndex, 1);
                  this.clientCount--;
                  clientIndex--;
                }
              } else {
                //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
                this.sendLog(clientIndex, "start", this.tg[clientIndex].endChat + " : 超过最大chat了", null, true);
                await this.close(clientIndex);
                this.api.splice(clientIndex, 1);
                this.tg.splice(clientIndex, 1);
                this.clientCount--;
                clientIndex--;
              }
            }
          } else if (this.stop === 2) {
            this.broadcast({
              "result": "pause",
            });
            await this.closeAll();
          }
        } else {
          if (this.clientCount === 1) {
            //console.log("(" + this.currentStep + ")全部client的chat采集完毕");
            this.sendLog(clientIndex, "start", "全部client的chat采集完毕", null, false);
            this.broadcast({
              "result": "over",
            });
          } else {
            //console.log("(" + this.currentStep + ")当前client的全部chat采集完毕");
            this.sendLog(clientIndex, "start", "当前client的全部chat采集完毕", null, false);
          }
          await this.close(clientIndex);
          this.api.splice(clientIndex, 1);
          this.tg.splice(clientIndex, 1);
          this.clientCount--;
          clientIndex--;
        }
      } else {
        //console.log("连接TG服务" + clientIndex + "失败");
        this.sendLog(clientIndex, "start", "连接TG服务" + clientIndex + "失败", null, true);
      }
    }
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        await this.nextStep();
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")start超出apiCount限制");
        this.sendLog(clientIndex, "start", "超出apiCount限制", "limit", true);
        await this.closeAll();
        // this.ctx.abort("reset");
      }
    } else if (this.stop === 2) {
      this.broadcast({
        "result": "pause",
      });
      await this.closeAll();
    }
  }

  async getDialog(clientIndex, tryCount) {
    try {
      for await (const dialog of this.tg[clientIndex].client.iterDialogs({})) {
        this.dialogArray.push(dialog);
      }
    } catch (e) {
      this.dialogArray = [];
      //console.log("(" + this.currentStep + ")getDialog出错 : " + e);
      this.sendLog(clientIndex, "getDialog", "出错 : " + JSON.stringify(e), null, true);
      if (tryCount === 20) {
        //console.log("(" + this.currentStep + ")getDialog超出tryCount限制");
        this.sendLog(clientIndex, "getDialog", "超出tryCount限制", null, true);
        await this.close(clientIndex);
      } else {
        await scheduler.wait(10000);
        await this.getDialog(clientIndex, tryCount + 1);
      }
      return;
    }
  }

  async selectChatError(clientIndex, tryCount, channelId, accessHash) {
    if (tryCount === 20) {
      //console.log("selectChat超出tryCount限制");
      this.sendLog(clientIndex, "selectChat", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.selectChat(clientIndex, tryCount + 1, channelId, accessHash);
    }
  }

  async selectChat(clientIndex, tryCount, channelId, accessHash) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("SELECT COUNT(Cindex) FROM `FORWARDCHAT` WHERE `tgId` = ? AND `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(this.tg[clientIndex].clientId, channelId, accessHash).run();
    } catch (e) {
      //console.log("selectChat出错 : " + e);
      this.sendLog(clientIndex, "selectChat", "出错 : " + JSON.stringify(e), "try", true);
      await this.selectChatError(clientIndex, tryCount, channelId, accessHash);
      return;
    }
    //console.log("chatResult : " + chatResult["COUNT(Cindex)"]);  //测试
    if (chatResult.success === true) {
      if (chatResult.results && chatResult.results.length > 0) {
        return chatResult.results[0]["COUNT(Cindex)"];
      }
    } else {
      await this.selectChatError(clientIndex, tryCount, channelId, accessHash);
    }
  }

  async insertChatError(clientIndex, tryCount, channelId, accessHash, username, title, noforwards) {
    if (tryCount === 20) {
      //console.log("insertChat超出tryCount限制");
      this.sendLog(clientIndex, "insertChat", "超出tryCount限制", null, true);
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.insertChat(clientIndex, tryCount + 1, channelId, accessHash, username, title, noforwards);
    }
  }

  async insertChat(clientIndex, tryCount, channelId, accessHash, username, title, noforwards) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("INSERT INTO `FORWARDCHAT` (tgId, channelId, accessHash, username, title, noforwards, current, photo, video, document, gif, exist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(this.tg[clientIndex].clientId, channelId, accessHash, username, title, noforwards, 0, 0, 0, 0, 0, 1).run();
    } catch (e) {
      //console.log("insertChat出错 : " + e);;
      this.sendLog(clientIndex, "insertChat", "出错 : " + JSON.stringify(e), "try", true);
      await this.insertChatError(clientIndex, tryCount, channelId, accessHash, username, title, noforwards);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("插入chat数据成功");
      this.sendLog(clientIndex, "insertChat", "插入chat数据成功", "success", false);
    } else {
      //console.log("插入chat数据失败");
      this.sendLog(clientIndex, "insertChat", "插入chat数据失败", "error", true);
      await this.insertChatError(clientIndex, tryCount, channelId, accessHash, username, title, noforwards);
    }
  }

  async chat(option) {
    // // if (this.client || this.stop === 1) {
    // if (this.stop === 1) {
    //   this.ws.send(JSON.stringify({
    //     "step": this.currentStep,
    //     "clientCount": this.clientCount,
    //     "operate": "chat",
    //     "message": "服务已经运行过了",
    //     "error": true,
    //     "date": new Date().getTime(),
    //   }));
    //   return;
    // }
    this.init(option);
    this.stop = 1;
    let currentIndex = 0;
    for (let clientIndex = 0; clientIndex < this.clientCount; clientIndex++) {
      if (this.stop === 1) {
        if (this.apiCount < 900) {
          this.tg[clientIndex] = {
            "clientId": 0,
            "client": null,
            "chatId": 0,
            "endChat": 0,
            "lastChat": 0,
            "reverse": true,
            "limit": 100,
            "offsetId": 0,
            "fromPeer": null,
            "time": 0,
          };
          this.tg[clientIndex].clientId = this.api[clientIndex].id;
          await this.open(clientIndex, 1);
          if (this.tg[clientIndex].client) {
            currentIndex += 1;
            let count = 0;
            await this.getDialog(clientIndex, 1);
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
                    const isChannel = dialog.isChannel;
                    // console.log("isChannel : " + isChannel);  //测试
                    if (isChannel === true) {
                      channelId = dialog.inputEntity.channelId.toString();
                      accessHash = dialog.inputEntity.accessHash.toString();
                    } else {
                      channelId = dialog.id.toString();
                    }
                    //console.log(channelId + " : " + accessHash);  //测试
                    if (channelId && accessHash) {
                      const chatCount = await this.selectChat(clientIndex, 1, channelId, accessHash);
                      //console.log("chatCount : " + chatCount);  //测试
                      if (parseInt(chatCount) === 0) {
                        count += 1;
                        const username = dialog.username || "";
                        const noforwards = dialog.noforwards === true ? 1 : 0;
                        await this.insertChat(clientIndex, 1, channelId, accessHash, username, dialog.title, noforwards);
                        //console.log("chat - 新插入chat了 : " + dialog.title);
                        this.sendLog(clientIndex, "chat", this.tg[clientIndex].clientId + " : 新插入chat了 : " + dialog.title, null, false);
                      } else {
                        //console.log("chat - " + count + " : chat已在数据库中 - " + dialog.title);
                        this.sendLog(clientIndex, "chat", this.tg[clientIndex].clientId + " : chat已在数据库中 - " + dialog.title, null, false);
                      }
                    } else {
                      //console.log("chat - channelId或accessHash错误 : " + dialog.title);
                      this.sendLog(clientIndex, "chat", this.tg[clientIndex].clientId + " : channelId或accessHash错误 : " + dialog.title, null, true);
                    }
                  }
                } else {
                  this.stop = 2;
                  //console.log("chat - 超出apiCount限制");
                  this.sendLog(clientIndex, "chat", "超出apiCount限制", "limit", true);
                  await this.closeAll();
                  // this.ctx.abort("reset");
                }
              } else if (this.stop === 2) {
                this.broadcast({
                  "result": "pause",
                });
                await this.closeAll();
              }
            }
            if (count > 0) {
              //console.log("chat - 新插入了" + count + "条chat数据");
              this.sendLog(clientIndex, "chat", this.tg[clientIndex].clientId + " : 新插入了" + count + "条chat数据", null, false);
            }
            await this.close(clientIndex);
            if (currentIndex === 2) {
              break;
            }
          } else {
            //console.log("连接TG服务" + clientIndex + "失败");
            this.sendLog(clientIndex, "chat", this.tg[clientIndex].clientId + " - 连接TG服务" + clientIndex + "失败", null, true);
          }
        } else {
          this.stop = 2;
          //console.log("chat - 超出apiCount限制");
          this.sendLog(clientIndex, "chat", "超出apiCount限制", "limit", true);
          await this.closeAll();
          // this.ctx.abort("reset");
        }
      } else if (this.stop === 2) {
        this.broadcast({
          "result": "pause",
        });
        await this.closeAll();
      }
    }
    //console.log("chat - 全部client获取chat完毕");
    this.sendLog("chat", "全部client获取chat完毕", null, false);
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
        this.broadcast({
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "operate": "webSocketMessage",
          "message": "parse出错 : " + e,
          "error": true,
          "date": new Date().getTime(),
        });
      }
    // }
    if (command === "start") {
      await this.start(option);
    } else if (command === "pause") {
      this.stop = 2;
    } else if (command === "close") {
      this.stop = 2;
      await this.closeAll();
    } else if (command === "over") {
      this.stop = 2;
      this.broadcast({
        "result": "over",
      });
      await this.closeAll();
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
      if (data.chatId && data.chatId >= 0 && this.tg[clientIndex].chatId !== data.chatId) {
        this.tg[clientIndex].chatId = data.chatId;
      }
    } else if (command === "offsetId") {
      if (data.offsetId && data.offsetId >= 0 && this.tg[clientIndex].offsetId !== data.offsetId) {
        this.tg[clientIndex].offsetId = data.offsetId;
      }
    } else if (command === "endChat") {
      if (data.endChat && data.endChat > 0 && this.tg[clientIndex].endChat !== data.endChat) {
        this.tg[clientIndex].endChat = data.endChat;
      }
    } else {
      this.broadcast({
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "operate": "webSocketMessage",
        "message": "未知消息",
        "error": true,
        "date": new Date().getTime(),
      });
    }
  }

  // async alarm() {
  //   this.ws.send("ping");
  // }

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
