import { DurableObject } from "cloudflare:workers";
// import { TelegramClient, Api, sessions, utils } from "./gramjs";
import { TelegramClient, Api, sessions, utils } from "./teleproto";
// import { LogLevel } from "./gramjs/extensions";
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
  api = [];
  clientCount = 0;
  tg = [];
  waitTime = 180000;
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
    // this.storage = ctx.storage;
    // this.sql = ctx.storage.sql;
    this.env = env;

    // this.ctx.getWebSockets().forEach((ws) => {
    //   const found = this.webSocket.find(element => element === ws);
    //   if (!found) {
    //     this.webSocket.push(ws);
    //     //console.log("(" + this.currentStep + ")添加ws成功");
    //     // this.broadcast({
    //     //   "operate": "constructor",
    //     //   "step": this.currentStep,
    //     //   "clientCount": this.clientCount,
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
      this.api = [
        // {
        //   "id": 0,
        //   "name": "name",
        //   "phone": "phone",
        //   "apiId": 123456,
        //   "apiHash": "apiHash",
        //   "sessionString": "sessionString",
        // },
        {
          "id": 1,
          "pc": 3,
          "name": "zjm2023",
          "phone": "+8615015178337",
          "apiId": 8851987,
          "apiHash": "8c353f36d876aa5b71b671dd221d763c",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQLHDMD4nttp5nlyYavCPWP5Mu6WVqx7EprUCty5ZofNENdyWJn6FsczIjIQ95L/qNm5v3Z/pCBJ7kC25NdWudkeIAKXQBrE37b16VObxHq+0oXQk/ySOspHUPJSFy3E1UDPQjFdWS0lbKiAs4Fhd1/P7FYFNpXeGobfi9lfWY8TZlbS0m5+7s2L6bxj/JGWbNFtPL+0B+F0QbhGW9pFdmpdw/eEAiw7ZENCZxY0hJ74KNiPRqunDHXQRiXLPlXU/NoxygvOizxKFsCduCKrcloIrjZTLnbeF26SmNR3EdC8MmC1emxoPyfxd1KpQyWUPRmx+nZBV4NRDZPS3Y8JetHw==",
        },
        {
          "id": 2,
          "pc": 3,
          "name": "zjm2024",
          "phone": "+8615817718306",
          "apiId": 18848967,
          "apiHash": "894c7cd30639e0e898702b7ff3672282",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQIlXrXd7o7Vs/Jl61BFUmpwKNJM/lMK8WhUQctOvWiMpGr4o5tXB3zFKUcPBbynH/VsphMD20JT17nzAKRsDMvnhwcNjWnIBPvqcCoQlxCl1Be8vYSLqWrlUCfpfUxdzxP3R1XlS2t3f1Rdtp+RG23vkcBzBmmQHgZfw5Ty1YoMzJVnrKAOje2WKJu8wLC1VXMAFToiKsdZGmOff2dJJEVR7MgP8AtyconAuc8NmkIOsUEamh6L5Y8gajDk3wZGmhjwdAv0gNVeEpb9dSYQYURAN0Aa7k0sv5KjIXVJIONaM+zlDZV6Is1Pk2BvPrGdjS0SN2hmDsci/sq6pnKDPYRw==",
        },
        {
          "id": 3,
          "pc": 3,
          "name": "zjm2025",
          "phone": "+8615015170034",
          "apiId": 11322827,
          "apiHash": "f13a574d518557713ca6eff0306e838f",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQYDGS8hPTs40IReZCouYiIwtKelTny+ROgAUXhqS/0W+/L5iwRBk7au1c7W0YRRR9iSZoG0UQoW3TxMaatQnUHzM3s42QeOq88wEoyNoxewx6LRdX/twCwEHfyf1MGR78h5ITMbn/xhPA/BhctBzos6wGDQ7sFjBxxT7UMRG7VFSS3bNeHIPfGgIngAAWeEUSmEWl0B7rro6pQ6wpdaEgHRQGRzAMYCfJpEc/tBQAr4mXziLfNYZQcxcfzZ4OSehmi2qi8oWyt/07GOUCq/jRwUD0/xKblgwi++qhfHSoMkYfmUbSkiYlRYiD2nT4tnKYQPiCcqOAk5GvSDiAqAHg/A==",
        },
        {
          "id": 4,
          "pc": 4,
          "name": "zjm2026",
          "phone": "+8615015138112",
          "apiId": 10483870,
          "apiHash": "0d275d0a85762e0bd8da7ea43ec6a88c",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQuYVH+XfTL7Xz81fPLXvG/aJXeHyrbwN2lR82cjJCuPnfO8URLXbfZOgsFQq2L4p1NcH7+XKrxPhEpz4+ye2daAJpLBBoq6kvrRRjOe41LSeiv/Aov4UiUrlBxxNfdNRO51EHg48VZbez7PVviM1SKwTF0Vs0SpTm3qQn1iONI0tUl/mVOe5OotkrjfklEgQU9CsyknMwQ/E0Mzx5vr9ChPZS38BO0wUwbZXfkx1wY2To8QKwv7hSKShw+au1kuenrLbVFNRVyKP+znNuJMZjBkAlvCq6PaPH2ETd9M15pIkUht+W5zye1Ckc+iDqyzJVkA4+2EP2E9yPM2nbHHqI8w==",
        },
        {
          "id": 5,
          "pc": 4,
          "name": "zjm2027",
          "phone": "+8615112760327",
          "apiId": 10490964,
          "apiHash": "288dee9bb4e7a16febea366fc6252364",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQhQXbhbGD9Eada7i3mQetaj3Gi44q6bQ41urfSbyxcJ0ZHNBCDwh5rupQW6mVaFITgss1+iWm6U2j95/LXiKE9x2S69AojiY08SZFXoMVlg8HysJc8QMftK8yCGRKa7I+fbYUtMfljtQBzVQDOrkSJDzVjwesunCscMYTXWnZGYgv1gYsqej/JQLvx4ikCAt1yV1/qgUngKroHW3FJ+jcCQkW9+yaeDGJkonyv+gT8yhsooT/LlRAns5Z8xAluizJce8EIwAUuOB/RaC1aReMYcnlDUBTe/+BlOVbGc0eOj849KZRfAOdFHZlXQcSibL2fi+6B95N0CLFy4aNfm9rdA==",
        },
        {
          "id": 6,
          "pc": 5,
          "name": "zjm2034",
          "phone": "+19297322444",
          "apiId": 19419096,
          "apiHash": "4b1c4d1f87156adc7433b5dd760a4e9d",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQQCX34zbrBFR/5z5cKA5qHiAcyyjxf2/P3JY3JE0X/SkXRkGzwraFBu48W5WG9K1NermNVpAf7p7x+vkpg61kYLhr7XZ055rDrifvi2AFXSRvMZNICh1gOzKQ7zVEZIz8H+BRVmhOxu1bS4u3XzmHgwSp68je8zLWFFJbzkiyLu1XWOUss8De3w7OdmV0Aa/0nD+68jb0UNHzYhFv1ygJTv40Y3vDU0PUZGgde7nibwdfScKwCix4ssXcV5Ek7qdEnz9oJPGnkgCitTY7edisxYP7Rg7lo+jEQvdvF4EV95ZqrRPykHYc8C0VRHd6TJ9+HLyF66iCL8pPI1DcKKICqA==",
        },
        // {
        //   "id": 7,
        //   "pc": 7,
        //   "name": "zjm2039",
        //   "phone": +351920491460,
        //   "apiId": 14936309,
        //   "apiHash": "02bc2490824d8ae6e111dc8d9f5730cc",
        //   "sessionString": "sessionString",
        // },
        {
          "id": 8,
          "pc": 7,
          "name": "zjm2040",
          "phone": "+85255742290",
          "apiId": 16349596,
          "apiHash": "44964f46a2f3699afcde27da231e9109",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQDjl1J8lThy1WR2qSo1wTO1JgHdFqBjfB32czp7ypGwUXaRwIXcItj5EkB0KO3HXVcDg57UICHzeR5kGgIyY2xuJj7N1kPDS8D/8qYnCTxx7TvM2q40QiBV9p7DTAylndvS6oNyO4no/+1q80Mh1Y2ftasTRfPZI+Xsj0dFZWFBFx92aZp1nIsxabB2aPCPys8OEe0Xwk7vTH67Q1LEPE2/L9LJgIkCoeziaW+UeU12zRUEt+mp/s7oJ7zK5zs8jzB9IyP7/VhdTsouHa+G8ASSHWZTIpBsFtqym71SM+riYthllRFYSp5mmIx081Vrv7TPMV5leZwB98NAjJkXMoLg==",
        }
      ];
      this.clientCount = this.api.length;
      this.tg = Array(this.clientCount).fill(null);
      this.waitTime = 180000;
      this.messageArray = [];
      this.filter = Api.InputMessagesFilterVideo;
      //this.filterTitle = "媒体";
      this.cacheMessage = null;
      this.batchMessage = [];
      this.dialogArray = [];
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
    if (this.compress === true) {
      if (message.operate === "open") {
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
          //   //   "operate": "broadcast",
          //   //   "step": this.currentStep,
          //   //   "clientCount": this.clientCount,
          //   //   "message": "删除ws成功",
          //   //   "date": new Date().getTime(),
          //   // });
          // } else {
          //   //console.log("(" + this.currentStep + ")没找到该ws");
          //   this.broadcast({
          //     "operate": "broadcast",
          //     "step": this.currentStep,
          //     "clientCount": this.clientCount,
          //     "message": "没找到该ws",
          //     "error": true,
          //     "date": new Date().getTime(),
          //   });
          // }
        }
      }
    });
  }

  async close(clientIndex) {
    if (this.tg[clientIndex].client) {
      await this.tg[clientIndex].client.destroy();
      this.tg[clientIndex].client = null;
      //console.log("断开服务器" + (clientIndex + 1) + "成功");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "close",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "断开服务器" + (clientIndex + 1) + "成功",
        "date": new Date().getTime(),
      });
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
      await this.tg[clientIndex].client.session.setDC(5, "91.108.56.128", 80);
      await this.tg[clientIndex].client.setLogLevel(LogLevel.ERROR);
      await this.tg[clientIndex].client.connect();
    } catch (e) {
      //console.log("login出错 : " + e);
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "open",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "login出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        //console.log("(" + this.currentStep + ")open超出tryCount限制");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "open",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close(clientIndex);
      } else {
        await scheduler.wait(30000);
        await this.open(clientIndex, tryCount + 1);
      }
      return;
    }
    this.stop = 1;
    //console.log("连接服务器" + (clientIndex + 1) + "成功");
    this.broadcast({
      "clientId": this.tg[clientIndex].clientId,
      "chatId": this.tg[clientIndex].chatId,
      "operate": "open",
      "step": this.currentStep,
      "clientCount": this.clientCount,
      "message": "连接服务器" + (clientIndex + 1) + "成功",
      "date": new Date().getTime(),
    });  //测试
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
      await this.insertConfigError(clientIndex, tryCount);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] 插入config数据成功");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "插入config数据成功",
        "status": "success",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] 插入config数据失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "插入config数据失败",
        "error": true,
        "status": "error",
        "date": new Date().getTime(),
      });
      await this.insertConfigError(clientIndex, tryCount);
    }
  }

  async getConfigError(clientIndex, tryCount, option) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")getConfig超出tryCount限制");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "getConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "getConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
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
        // this.broadcast({
        //   "clientId": this.tg[clientIndex].clientId,
        //   "chatId": this.tg[clientIndex].chatId,
        //   "operate": "getConfig",
        //   "step": this.currentStep,
        //   "clientCount": this.clientCount,
        //   "message": "没有预设config",
        //   "date": new Date().getTime(),
        // });
        this.tg[clientIndex].chatId = 1;
        this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
        this.tg[clientIndex].reverse = true;
        this.tg[clientIndex].limit = 100;
        await this.insertConfig(clientIndex, 1);
      }
    } else {
      //console.log("查询config失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "getConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "查询config失败",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "noExistChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "noExistChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      await this.noExistChatError(clientIndex, tryCount, Cindex);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("更新不存在chat数据成功");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "noExistChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "更新不存在chat数据成功",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("更新不存在chat数据失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "noExistChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "更新不存在chat数据失败",
        "error": true,
        "date": new Date().getTime(),
      });
      await this.noExistChatError(clientIndex, tryCount, Cindex);
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
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "checkChat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "出错 : " + e,
          "error": true,
          "date": new Date().getTime(),
        });
        const err = e.toString();
        if (err.includes("CHANNEL_INVALID") === true) {
          await this.noExistChat(clientIndex, 1, chatResult.Cindex);
        } else if (err.includes("CHANNEL_PRIVATE") === true) {
          await this.noExistChat(clientIndex, 1, chatResult.Cindex);
        } else if (err.includes("400") === true) {
          await this.noExistChat(clientIndex, 1, chatResult.Cindex);
        } else {
          if (tryCount === 20) {
            //console.log("(" + this.currentStep + ")checkChat超出tryCount限制");
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "operate": "checkChat",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": "超出tryCount限制",
              "error": true,
              "date": new Date().getTime(),
            });
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
          this.tg[clientIndex].fromPeer = result.chats[0];
          if (this.tg[clientIndex].fromPeer) {
            this.setOffsetId(clientIndex, chatResult);
            //console.log("获取fromPeer成功");  //测试
            // this.broadcast({
            //   "clientId": this.tg[clientIndex].clientId,
            //   "chatId": this.tg[clientIndex].chatId,
            //   "operate": "checkChat",
            //   "step": this.currentStep,
            //   "clientCount": this.clientCount,
            //   "message": "获取fromPeer成功",
            //   "date": new Date().getTime(),
            // });  //测试
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "offsetId": this.tg[clientIndex].offsetId,
              "operate": "checkChat",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": this.tg[clientIndex].chatId + " : " + chatResult.title,
              "status": "add",
              "date": new Date().getTime(),
            });
          } else {
            await this.noExistChat(clientIndex, 1, chatResult.Cindex);
            this.tg[clientIndex].chatId = chatResult.Cindex + 1;
            if (this.contrastChat(clientIndex)) {
              //console.log(chatResult.title + " : chat已不存在了");  //测试
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "checkChat",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": chatResult.title + " : chat已不存在了",
                "error": true,
                "date": new Date().getTime(),
              });
              await this.nextChat(clientIndex, 1, true);
            } else {
              //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "checkChat",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
                "error": true,
                "date": new Date().getTime(),
              });
            }
          }
        } else {
          //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "operate": "checkChat",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      } else {
        this.tg[clientIndex].chatId = chatResult.Cindex + 1;
        if (this.contrastChat(clientIndex)) {
          //console.log(chatResult.title + " : chat已不存在了");  //测试
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "operate": "checkChat",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": chatResult.title + " : chat已不存在了",
            "error": true,
            "date": new Date().getTime(),
          });
          await this.nextChat(clientIndex, 1, true);
        } else {
          //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "operate": "checkChat",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      }
    } else {
      this.tg[clientIndex].chatId = chatResult.Cindex + 1;
      if (this.contrastChat(clientIndex)) {
        //console.log(chatResult.title + " : channelId或accessHash出错");  //测试
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "checkChat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": chatResult.title + " : channelId或accessHash出错",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.nextChat(clientIndex, 1, true);
      } else {
        //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "checkChat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
  }

  async nextChatError(clientIndex, tryCount, check) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")nextChat超出tryCount限制");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "nextChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` >= ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")出错 : " + e);
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "nextChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
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
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "offsetId": this.tg[clientIndex].offsetId,
            "operate": "nextChat",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": this.tg[clientIndex].chatId + " : " + chatResult.results[0].title,
            "status": "add",
            "date": new Date().getTime(),
          });
        }
      } else {
        this.tg[clientIndex].chatId = -1;
        //console.log("没有更多chat了");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "nextChat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "没有更多chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } else {
      //console.log("查询chat失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "nextChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "查询chat失败",
        "error": true,
        "date": new Date().getTime(),
      });
      await this.nextChatError(clientIndex, tryCount, check);
    }
  }

  async getChat(clientIndex) {
    if (this.tg[clientIndex].chatId && this.tg[clientIndex].chatId > 0) {
      if (this.contrastChat(clientIndex)) {
        await this.nextChat(clientIndex, 1, true);
      } else {
        //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "getChat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } else {
      if (this.contrastChat(clientIndex)) {
        let tryCount = 0;
        while (tryCount < 30) {
          this.apiCount += 1;
          let chatResult = {};
          try {
            if (this.filterType === 0) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 1) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 2) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 3) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            } else if (this.filterType === 4) {
              chatResult = await this.env.MAINDB.prepare("SELECT * FROM `FORWARDCHAT` WHERE `tgId` = ? AND `Cindex` > ? AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").bind(this.tg[clientIndex].clientId, this.tg[clientIndex].chatId).run();
            }
          } catch (e) {
            tryCount += 1;
            //console.log("(" + this.currentStep + ")getChat出错 : " + e);
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "operate": "getChat",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": "出错 : " + e,
              "error": true,
              "date": new Date().getTime(),
            });
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
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "getChat",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": "没有更多chat了",
                "error": true,
                "date": new Date().getTime(),
              });
            }
            break;
          } else {
            //console.log("查询chat失败");
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "operate": "getChat",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": "查询chat失败",
              "date": new Date().getTime(),
            });
          }
        }
      } else {
        //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "getChat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
  }

  async updateConfigError(clientIndex, tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")updateConfig超出tryCount限制");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      await this.updateConfigError(clientIndex, tryCount);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
      //console.log("更新config数据成功");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "更新config数据成功",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("更新config数据失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateConfig",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "更新config数据失败",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "getMessage",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        //console.log("(" + this.currentStep + ")getMessage超出tryCount限制");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "getMessage",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close(clientIndex);
      } else {
        await scheduler.wait(10000);
        await this.getMessage(clientIndex, tryCount + 1);
      }
      return;
    }
  }

  async updateChatError(clientIndex, tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")updateChat超出tryCount限制");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      await this.updateChatError(clientIndex, tryCount);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("(" + this.currentStep + ")更新chat数据成功");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "更新chat数据成功",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("(" + this.currentStep + ")更新chat数据失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "updateChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "更新chat数据失败",
        "error": true,
        "date": new Date().getTime(),
      });
      await this.updateChatError(clientIndex, tryCount);
    }
  }

  async getNext(clientIndex) {
    this.tg[clientIndex].fromPeer = null;
    this.tg[clientIndex].chatId += 1;
    if (this.contrastChat(clientIndex)) {
      this.tg[clientIndex].errorCount = 0;
      await this.getChat(clientIndex);
      if (this.tg[clientIndex].fromPeer) {
        if (this.tg[clientIndex].chatId != this.tg[clientIndex].lastChat) {
          if (this.tg[clientIndex].lastChat != 0) {
            await this.updateConfig(clientIndex);
          }
          this.tg[clientIndex].lastChat = this.tg[clientIndex].chatId;
        }
      } else {
        //console.log("(" + this.currentStep + ")全部chat采集完毕");
        this.broadcast({
          "result": "over",
          "operate": "getNext",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "全部chat采集完毕",
          "date": new Date().getTime(),
        });
        await this.close(clientIndex);
      }
    } else {
      //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "getNext",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
        "error": true,
        "date": new Date().getTime(),
      });
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
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "offsetId": this.tg[clientIndex].offsetId,
          "operate": "forwardMessage",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "还需等待" + Math.ceil(time / 1000) + "秒",
          "status": "wait",
          "date": new Date().getTime(),
        });
        // const pingInterval = setInterval(function () {
        //   // this.ws.ping();
        //   this.ws.send("ping");
        // }, 30000);
        // await this.ctx.storage.setAlarm(30000);
        // await scheduler.wait(time);
        // clearInterval(pingInterval);
        // await this.ctx.storage.deleteAlarm();
        if (time > 60000) {
          // const timeLength = Math.floor(time / 60000);
          const timeLength = Math.ceil(time / 60000);
          for (let i = 0; i < timeLength; i++) {
            await scheduler.wait(60000);
            // this.ws.ping();
            this.ws.send("ping");
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
        // this.broadcast({
        //   "clientId": this.tg[clientIndex].clientId,
        //   "chatId": this.tg[clientIndex].chatId,
        //   "offsetId": this.tg[clientIndex].offsetId,
        //   "operate": "forwardMessage",
        //   "step": this.currentStep,
        //   "clientCount": this.clientCount,
        //   "message": JSON.stringify(forwardResult),
        //   "date": new Date().getTime(),
        // });
      } catch (e) {
        if (e.errorMessage === "CHAT_FORWARDS_RESTRICTED" || e.code === 400) {
          this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
          //console.log("(" + this.currentStep + ") 消息不允许转发" + e);
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "offsetId": this.tg[clientIndex].offsetId,
            "operate": "forwardMessage",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": "消息不允许转发 : " + JSON.stringify(e),
            "status": "error",
            "error": true,
            "date": new Date().getTime(),
          });
          await this.getNext(clientIndex);
        } else if (e.errorMessage === "FLOOD" || e.code === 420) {
          this.waitTime += 120000;
          //console.log("(" + this.currentStep + ") 触发了洪水警告，请求太频繁" + e);
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "offsetId": this.tg[clientIndex].offsetId,
            "operate": "forwardMessage",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": "触发了洪水警告，请求太频繁 : " + JSON.stringify(e),
            "status": "error",
            "error": true,
            "date": new Date().getTime(),
          });
        } else {
          //console.log("(" + this.currentStep + ") 转发消息时发生错误" + e);
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "offsetId": this.tg[clientIndex].offsetId,
            "operate": "forwardMessage",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": "转发消息时发生错误 : " + JSON.stringify(e),
            "status": "error",
            "error": true,
            "date": new Date().getTime(),
          });
        }
        return;
      }
      this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
      await this.updateChat(clientIndex, 1);
      //console.log("(" + this.currentStep + ") 成功转发了" + length + "条消息");
      this.broadcast({
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
      // this.tg[clientIndex].time = new Date().getTime();
    } else {
      this.tg[clientIndex].offsetId += this.tg[clientIndex].limit;
      await this.updateChat(clientIndex, 1);
      this.tg[clientIndex].errorCount += 1;
      if (this.tg[clientIndex].errorCount >= 10) {
        //console.log("(" + this.currentStep + ") 连续10次的消息无需转发");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "offsetId": this.tg[clientIndex].offsetId,
          "operate": "forwardMessage",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "连续10次的消息无需转发",
          "status": "error",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.getNext(clientIndex);
      } else {
        //console.log("(" + this.currentStep + ") 消息无需转发");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "offsetId": this.tg[clientIndex].offsetId,
          "operate": "forwardMessage",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "消息无需转发",
          "status": "error",
          "error": true,
          "date": new Date().getTime(),
        });
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
            const messageArray = this.messageArray;
            const messageLength = messageArray.length;
            this.messageArray = [];
            //console.log("(" + this.currentStep + ")messageLength : " + messageLength);
            // this.broadcast({
            //   "clientId": this.tg[clientIndex].clientId,
            //   "chatId": this.tg[clientIndex].chatId,
            //   "operate": "nextStep",
            //   "step": this.currentStep,
            //   "clientCount": this.clientCount,
            //   "message": "messageLength : " + messageLength,
            //   "date": new Date().getTime(),
            // });  //测试
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
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "nextStep",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": "messageCount : " + messageCount,
                "error": true,
                "date": new Date().getTime(),
              });
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
              this.broadcast({
                "result": "end",
                "operate": "nextStep",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": this.tg[clientIndex].chatId + " : 当前chat采集完毕",
                "date": new Date().getTime(),
              });
              this.tg[clientIndex].chatId += 1;
              if (this.contrastChat(clientIndex)) {
                this.tg[clientIndex].errorCount = 0;
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
                  //console.log("(" + this.currentStep + ")全部chat采集完毕");
                  this.broadcast({
                    "result": "over",
                    "operate": "nextStep",
                    "step": this.currentStep,
                    "clientCount": this.clientCount,
                    "message": "全部chat采集完毕",
                    "date": new Date().getTime(),
                  });
                  await this.close(clientIndex);
                  this.tg.splice(clientIndex, 1);
                  this.clientCount--;
                  clientIndex--;
                }
              } else {
                //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
                this.broadcast({
                  "clientId": this.tg[clientIndex].clientId,
                  "chatId": this.tg[clientIndex].chatId,
                  "operate": "nextStep",
                  "step": this.currentStep,
                  "clientCount": this.clientCount,
                  "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
                  "error": true,
                  "date": new Date().getTime(),
                });
                await this.close(clientIndex);
                this.tg.splice(clientIndex, 1);
                this.clientCount--;
                clientIndex--;
              }
            }
          } else {
            //console.log("连接TG服务" + clientIndex + "失败");
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "operate": "nextStep",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": "连接TG服务" + clientIndex + "失败",
              "error": true,
              "date": new Date().getTime(),
            });
          }
        }
        if (this.stop === 1) {
          if (this.apiCount < 900) {
            await this.nextStep();
          } else {
            this.stop = 2;
            //console.log("(" + this.currentStep + ")nextStep超出apiCount限制");
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "operate": "nextStep",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": "超出apiCount限制",
              "error": true,
              "status": "limit",
              "date": new Date().getTime(),
            });
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
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "nextStep",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "超出apiCount限制",
          "error": true,
          "status": "limit",
          "date": new Date().getTime(),
        });
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
        "operate": "start",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "服务已经运行过了",
        "error": true,
        "date": new Date().getTime(),
      }));
      return;
    }
    this.init(option);
    // this.stop = 1;
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
            const messageArray = this.messageArray;
            const messageLength = messageArray.length;
            this.messageArray = [];
            // this.broadcast({
            //   "clientId": this.tg[clientIndex].clientId,
            //   "chatId": this.tg[clientIndex].chatId,
            //   "operate": "start",
            //   "step": this.currentStep,
            //   "clientCount": this.clientCount,
            //   "message": "messageLength : " + messageLength,
            //   "date": new Date().getTime(),
            // });  //测试
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
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "start",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": "messageCount : " + messageCount,
                "error": true,
                "date": new Date().getTime(),
              });
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
              this.broadcast({
                "result": "end",
                "operate": "start",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": this.tg[clientIndex].chatId + " : 当前chat采集完毕",
                "date": new Date().getTime(),
              });
              this.tg[clientIndex].errorCount = 0;
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
                  //console.log("(" + this.currentStep + ")全部chat采集完毕");
                  this.broadcast({
                    "result": "over",
                    "operate": "start",
                    "step": this.currentStep,
                    "clientCount": this.clientCount,
                    "message": "全部chat采集完毕",
                    "date": new Date().getTime(),
                  });
                  await this.close(clientIndex);
                  this.tg.splice(clientIndex, 1);
                  this.clientCount--;
                  clientIndex--;
                }
              } else {
                //console.log(this.tg[clientIndex].endChat + " : 超过最大chat了");  //测试
                this.broadcast({
                  "clientId": this.tg[clientIndex].clientId,
                  "chatId": this.tg[clientIndex].chatId,
                  "operate": "start",
                  "step": this.currentStep,
                  "clientCount": this.clientCount,
                  "message": this.tg[clientIndex].endChat + " : 超过最大chat了",
                  "error": true,
                  "date": new Date().getTime(),
                });
                await this.close(clientIndex);
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
          //console.log("全部chat采集完毕");
          this.broadcast({
            "result": "over",
            "operate": "start",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": "全部chat采集完毕",
            "date": new Date().getTime(),
          });
          await this.close(clientIndex);
          this.tg.splice(clientIndex, 1);
          this.clientCount--;
          clientIndex--;
        }
      } else {
        //console.log("连接TG服务" + clientIndex + "失败");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "start",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "连接TG服务" + clientIndex + "失败",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        await this.nextStep();
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")start超出apiCount限制");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "start",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "超出apiCount限制",
          "error": true,
          "status": "limit",
          "date": new Date().getTime(),
        });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "getDialog",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        //console.log("(" + this.currentStep + ")getDialog超出tryCount限制");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "getDialog",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "selectChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "selectChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
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

  async insertChatError(clientIndex, tryCount, channelId, accessHash, username, title) {
    if (tryCount === 20) {
      //console.log("insertChat超出tryCount限制");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
      await this.close(clientIndex);
    } else {
      await scheduler.wait(10000);
      await this.insertChat(clientIndex, tryCount + 1, channelId, accessHash, username, title);
    }
  }

  async insertChat(clientIndex, tryCount, channelId, accessHash, username, title) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("INSERT INTO `FORWARDCHAT` (tgId, channelId, accessHash, username, title, current, exist) VALUES (?, ?, ?, ?, ?, ?, ?);").bind(this.tg[clientIndex].clientId, channelId, accessHash, username, title, 0, 1).run();
    } catch (e) {
      //console.log("insertChat出错 : " + e);;
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
      await this.insertChatError(clientIndex, tryCount, channelId, accessHash, username, title);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("插入chat数据成功");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "status": "success",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("插入chat数据失败");
      this.broadcast({
        "clientId": this.tg[clientIndex].clientId,
        "chatId": this.tg[clientIndex].chatId,
        "operate": "insertChat",
        "step": this.currentStep,
        "clientCount": this.clientCount,
        "message": "插入chat数据失败",
        "error": true,
        "status": "error",
        "date": new Date().getTime()
      });
      await this.insertChatError(clientIndex, tryCount, channelId, accessHash, username, title);
    }
  }

  async chat(option) {
    // // if (this.client || this.stop === 1) {
    // if (this.stop === 1) {
    //   this.ws.send(JSON.stringify({
    //     "operate": "chat",
    //     "step": this.currentStep,
    //     "clientCount": this.clientCount,
    //     "message": "服务已经运行过了",
    //     "error": true,
    //     "date": new Date().getTime(),
    //   }));
    //   return;
    // }
    // this.stop = 1;
    this.init(option);
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
        "time": 0,
      };
      this.tg[clientIndex].clientId = this.api[clientIndex].id;
      await this.open(clientIndex, 1);
      if (this.tg[clientIndex].client) {
        let count = 0;
        // this.tg[clientIndex].clientId = this.api[clientIndex].id;
        await this.getDialog(clientIndex, 1);
        const dialogArray = this.dialogArray;
        // const dialogLength = dialogArray.length;
        this.dialogArray = [];
        // for (let dialogIndex = 0; dialogIndex < dialogLength; dialogIndex++) {
        for await (const dialog of dialogArray) {
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
              await this.insertChat(clientIndex, 1, channelId, accessHash, username, dialog.title);
              //console.log("chat - 新插入chat了 : " + dialog.title);
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "chat",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": this.tg[clientIndex].clientId + " - " + count + " : 新插入chat了 : " + dialog.title,
                "date": new Date().getTime(),
              });
            } else {
              //console.log("chat - " + count + " : chat已在数据库中 - " + dialog.title);
              this.broadcast({
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "operate": "chat",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": this.tg[clientIndex].clientId + " - " + count + " : chat已在数据库中 - " + dialog.title,
                "date": new Date().getTime(),
              });
            }
          } else {
            //console.log("chat - channelId或accessHash错误 : " + dialog.title);
            this.broadcast({
              "clientId": this.tg[clientIndex].clientId,
              "chatId": this.tg[clientIndex].chatId,
              "operate": "chat",
              "step": this.currentStep,
              "clientCount": this.clientCount,
              "message": this.tg[clientIndex].clientId + " - " + count + " : channelId或accessHash错误 : " + dialog.title,
              "error": true,
              "date": new Date().getTime(),
            });
          }
        }
        if (count > 0) {
          //console.log("chat - 新插入了" + count + "条chat数据");
          this.broadcast({
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
            "operate": "chat",
            "step": this.currentStep,
            "clientCount": this.clientCount,
            "message": this.tg[clientIndex].clientId + " - " + count + " : 新插入了" + count + "条chat数据",
            "date": new Date().getTime(),
          });
        }
        await this.close(clientIndex);
      } else {
        //console.log("连接TG服务" + clientIndex + "失败");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "operate": "chat",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": this.tg[clientIndex].clientId + " - 连接TG服务" + clientIndex + "失败",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
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
          "operate": "webSocketMessage",
          "step": this.currentStep,
          "clientCount": this.clientCount,
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
        "operate": "webSocketMessage",
        "step": this.currentStep,
        "clientCount": this.clientCount,
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
