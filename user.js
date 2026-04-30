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
  lastChat = 48;
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
  chatArray = {};

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
        this.chatId = 0;
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
      this.lastChat = 48;
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
      this.chatArray = {
        "0": {
          "uid": 0,
          "name": "zjm1985",
          "id": 1231007796,
          "accessHash": 13848420579109566,
        },
        "1": {
          "uid": 1,
          "name": "zjm2023",
          "id": 2029656369,
          "accessHash": -3528954742784820459,
        },
        "2": {
          "uid": 2,
          "name": "zjm2024",
          "id": 2022378939,
          "accessHash": 8376691521853558144,
        },
        "3": {
          "uid": 3,
          "name": "zjm2025",
          "id": 2021287347,
          "accessHash": -2474463327330163547,
        },
        "4": {
          "uid": 4,
          "name": "zjm2026",
          "id": 2132946221,
          "accessHash": -3017218929268163713,
        },
        "5": {
          "uid": 5,
          "name": "zjm2027",
          "id": 5092267287,
          "accessHash": -97939840328277599,
        },
        "6": {
          "uid": 6,
          "name": "zjm2034",
          "id": 5111333624,
          "accessHash": -8159676459379074185,
        },
        "7": {
          "uid": 7,
          "name": "zjm2039",
          "id": 5210817361,
          "accessHash": -3108192830429356175,
        },
        "8": {
          "uid": 8,
          "name": "zjm2040",
          "id": 5298607595,
          "accessHash": 7213706693544433367,
        },
        "9": {
          "uid": 9,
          "name": "zjm2048",
          "id": 5248558475,
          "accessHash": -8820145577148596942,
        },
        "10": {
          "uid": 10,
          "name": "zjm2049",
          "id": 5334367957,
          "accessHash": 554218287056445660,
        },
        "11": {
          "uid": 11,
          "name": "zjm2053",
          "id": 5498421412,
          "accessHash": -6188665553229195970,
        },
        "12": {
          "uid": 12,
          "name": "zjm2062",
          "id": 5515666705,
          "accessHash": 3305284847822540224,
        },
        "13": {
          "uid": 13,
          "name": "zjm2063",
          "id": 5301758687,
          "accessHash": -9174745641888598645,
        },
        "14": {
          "uid": 14,
          "name": "zjm2074",
          "id": 5537189866,
          "accessHash": 3914977698310866214,
        },
        "15": {
          "uid": 15,
          "name": "zjm2075",
          "id": 5405759157,
          "accessHash": 2204436030224743240,
        },
        "16": {
          "uid": 16,
          "name": "zjm2077",
          "id": 5453647062,
          "accessHash": 472178056653034692,
        },
        "17": {
          "uid": 17,
          "name": "zjm2078",
          "id": 5487160489,
          "accessHash": -8927191219834325638,
        },
        "18": {
          "uid": 18,
          "name": "zjm2080",
          "id": 5586638035,
          "accessHash": -2343795431669195591,
        },
        "19": {
          "uid": 19,
          "name": "zjm2082",
          "id": 5494013993,
          "accessHash": 3668647721456956830,
        },
        "20": {
          "uid": 20,
          "name": "zjm2083",
          "id": 5201326284,
          "accessHash": 8133162126715863839,
        },
        "21": {
          "uid": 21,
          "name": "zjm2084",
          "id": 5562399529,
          "accessHash": 4761404054046032014,
        },
        "22": {
          "uid": 22,
          "name": "zjm2097",
          "id": 5544807930,
          "accessHash": 2125645380340792600,
        },
        "23": {
          "uid": 23,
          "name": "zjm2099",
          "id": 5506554632,
          "accessHash": -7465790480777399794,
        },
        "24": {
          "uid": 24,
          "name": "zjm2100",
          "id": 5422048899,
          "accessHash": -1491779870861780025,
        },
        "25": {
          "uid": 25,
          "name": "zjm2105",
          "id": 1881739674,
          "accessHash": 7510714810549306348,
        },
        "26": {
          "uid": 26,
          "name": "zjm2125",
          "id": 5174498261,
          "accessHash": 3118062895719256586,
        },
        "27": {
          "uid": 28,
          "name": "zjm2150",
          "id": 5491512462,
          "accessHash": -6282068444938499337,
        },
        "28": {
          "uid": 29,
          "name": "zjm2152",
          "id": 5376809814,
          "accessHash": -4316963345977593904,
        },
        "29": {
          "uid": 30,
          "name": "zjm2154",
          "id": 5460596906,
          "accessHash": 1907811185440497142,
        },
        "30": {
          "uid": 31,
          "name": "zjm2157",
          "id": 5525279326,
          "accessHash": -8914150951960224709,
        },
        "31": {
          "uid": 32,
          "name": "zjm2231",
          "id": 5785355067,
          "accessHash": -4485372488949249025,
        },
        "32": {
          "uid": 33,
          "name": "zjm2232",
          "id": 5759109125,
          "accessHash": 7367771000016874444,
        },
        "33": {
          "uid": 34,
          "name": "zjm2233",
          "id": 5621617477,
          "accessHash": -2442527438641502374,
        },
        "34": {
          "uid": 35,
          "name": "zjm2235",
          "id": 5722372365,
          "accessHash": 2813860196518871567,
        },
        "35": {
          "uid": 36,
          "name": "zjm2236",
          "id": 5616445057,
          "accessHash": 2579704128359772066,
        },
        "36": {
          "uid": 37,
          "name": "zjm2240",
          "id": 5782586850,
          "accessHash": -4211117113720985042,
        },
        "37": {
          "uid": 38,
          "name": "zjm2241",
          "id": 5698979470,
          "accessHash": 6277457358829574092,
        },
        "38": {
          "uid": 39,
          "name": "zjm2244",
          "id": 5681167816,
          "accessHash": 1531362886672261269,
        },
        "39": {
          "uid": 40,
          "name": "zjm2245",
          "id": 5616772046,
          "accessHash": 129998216348589648,
        },
        "40": {
          "uid": 41,
          "name": "zjm2246",
          "id": 5678215894,
          "accessHash": 7046863568563790536,
        },
        "41": {
          "uid": 42,
          "name": "zjm2419",
          "id": 5677089513,
          "accessHash": 4167421863166183979,
        },
        "42": {
          "uid": 43,
          "name": "zjm2420",
          "id": 5735084131,
          "accessHash": -6430412094933543253,
        },
        "43": {
          "uid": 44,
          "name": "zjm2463",
          "id": 5468542202,
          "accessHash": -920943731606205159,
        },
        "44": {
          "uid": 45,
          "name": "zjm2466",
          "id": 5552832255,
          "accessHash": 855812436444788388,
        },
        "45": {
          "uid": 46,
          "name": "zjm2589",
          "id": 5741561468,
          "accessHash": 7798784543598409350,
        },
        "46": {
          "uid": 47,
          "name": "zjm2590",
          "id": 5403359805,
          "accessHash": -4817051678776716002,
        },
        "47": {
          "uid": 48,
          "name": "zjm4039",
          "id": 8636590734,
          "accessHash": -94760164909719154,
        },
      }
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
    const apiId = 25429403;
    const apiHash = "2bb9a1bfd8f598da6cb5c511f0e5fbdf";
    const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7be+PddSzlPTzgS/mbCsxeZYLhE9ohnesT10Ntv+pdypA3wfrAUdXGXBLb2uturgLlkO49XMxAsIoELAdi8OprHkYfeEWZrQPF9RqjucdgWviAVd3oy/JIHk6lbB6NCS06US2CMdLZMxAsLFLu2JTgWiI07Xm2tpCIaaYED9mmH7NiROvqBx+jpB2GoFM4xzqaoB3y43BURo/ZYPEM3uUB4AVsS7IwdK0/j8pJL/ChB3buNnNtyVADe8wFvEAcbMn/385Xz53T21BdYqanzMuZX2O9cv4UNCpA9P6HoEYRn0D9XsljY6xJFNdR/RRKGHBqlVLK/Xt6PagRm321YBAvw==";
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
      // this.client.setLogLevel(LogLevel.ERROR);
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
        if (chatArray[this.chatId]) {
          const id = chatArray[this.chatId].id;
          const accessHash = chatArray[this.chatId].accessHash ? bigInt(chatArray[this.chatId].accessHash) : bigInt.zero;
          let users = null;
          try {
            users = await this.client.invoke(
              new Api.users.GetUsers({
                id: [
                  new Api.InputUser({
                    userId: bigInt(id),
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
                this.sendGrid("getChat", this.chatId + " : " + chatArray[this.chatId].name, "add", false);
              } else {
                this.chatId += 1;
                if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
                  //console.log(chatArray[this.chatId].name + " : chat已不存在了");  //测试
                  this.sendLog("getChat", chatArray[this.chatId].name + " : chat已不存在了", null, true);
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
              //console.log(chatArray[this.chatId].name + " : chat已不存在了");  //测试
              this.sendLog("getChat", chatArray[this.chatId].name + " : chat已不存在了", null, true);
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
          //console.log(chatArray[this.chatId].name + " : chat已不存在了");  //测试
          this.sendLog("getMessage", chatArray[this.chatId].name + " : chat已不存在了", null, true);
          await this.getChat(1);
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

  async getNext() {
    this.fromPeer = null;
    this.chatId += 1;
    this.count = 0;
    if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
      await this.getChat(1);
      if (this.fromPeer) {
        if (this.chatId != this.lastChat) {
          // if (this.lastChat != 48) {
            await this.updateConfig(1);
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
      await this.updateConfig(1, messageLength);
      //console.log("(" + this.currentStep + ") 成功转发了" + length + "条消息");
      this.sendForward("forwardMessage", "成功转发了" + messageLength + "条消息", messageLength, "update", false);
    } else {
      this.offsetId += this.count;
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
                if (messageArray[messageIndex].media) {
                  if (messageArray[messageIndex].media.document) {
                    // const mimeType = messageArray[messageIndex].media.document.mimeType;
                    // if (mimeType.startsWith("video/")) {
                    //   fileId = messageArray[messageIndex].media.document.id;
                    // } else if (mimeType.startsWith("image/")) {
                    //   fileId = messageArray[messageIndex].media.document.id;
                    // // } else if (mimeType.startsWith("application/")) {
                    // // } else {
                    // }
                    fileId = messageArray[messageIndex].media.document.id;
                  } else if (messageArray[messageIndex].media.photo) {
                    fileId = messageArray[messageIndex].media.photo.id;
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
    // await this.open(1);
    await this.getChat(1);
    if (this.fromPeer) {
      if (this.chatId != this.lastChat) {
        // if (this.lastChat != 48) {
          await this.updateConfig();
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
        if (!option || !option.chatId || !option.filterType || !option.reverse || !option.limited) {
          await this.getConfig(1, option);
        }
        // this.switchType();
        await this.open(1);
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
              if (messageArray[messageIndex].media) {
                if (messageArray[messageIndex].media.document) {
                  // const mimeType = messageArray[messageIndex].media.document.mimeType;
                  // if (mimeType.startsWith("video/")) {
                  //   fileId = messageArray[messageIndex].media.document.id;
                  // } else if (mimeType.startsWith("image/")) {
                  //   fileId = messageArray[messageIndex].media.document.id;
                  // // } else if (mimeType.startsWith("application/")) {
                  // // } else {
                  // }
                  fileId = messageArray[messageIndex].media.document.id;
                } else if (messageArray[messageIndex].media.photo) {
                  fileId = messageArray[messageIndex].media.photo.id;
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
      const id = env.WEBSOCKET_SERVER.idFromName("user");
      const stub = env.WEBSOCKET_SERVER.get(id);
      return stub.fetch(request);
    }

    return new Response("error");
  },
};
