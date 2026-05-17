import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions } from "./teleproto";
import { LogLevel } from "./teleproto/extensions";
import bigInt from "big-integer";


export class WebSocketServer extends DurableObject {
  // webSocket = [];
  ws = null;
  stop = 0;
  apiCount = 0;
  currentStep = 0;
  compress = true;
  batch = false;
  client = null;
  chatId = 0;
  reverse = true;
  limit = 20;
  offsetId = 0;
  fromPeer = null;
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
        this.compress = true;
        this.batch = false;
        this.chatId = 0;
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
      this.fromPeer = null;
      this.messageArray = [];
      this.cacheMessage = null;
      this.batchMessage = [];
      this.dialogArray = [];
    }
  }

  broadcast(message) {
    if (this.compress === true) {
      if (message.operate === "nextMessage") {
        if (message.status === "add") {
          if (this.cacheMessage) {
            if (message.offsetId > this.cacheMessage.offsetId) {
              const temp = message;
              message = this.cacheMessage;
              this.cacheMessage = temp;
            } else {
              this.cacheMessage = null;
              return;
            }
          } else {
            this.cacheMessage = message;
            return;
          }
        } else if (message.status === "update") {
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
            }
          }
          return;
        } else if (message.status === "indexExist") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["selectMessageIndex"] = true;
            }
          }
          return;
        } else if (message.status === "exist") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["selectMessage"] = true;
            }
          }
          return;
        } else if (message.status === "webpage") {
          if (this.cacheMessage) {
            if (message.offsetId === this.cacheMessage.offsetId) {
              this.cacheMessage["webpage"] = true;
            }
          }
          return;
        } else if (message.status === "error") {
        } else if (message.status === "limit") {
        } else if (!message.error) {
        } else {
          return;
        }
      } else if (message.operate === "insertMessage") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertMessage"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertMessage"] = false;
            }
          }
        }
        return;
      // } else if (message.operate === "insertMessageIndex") {
      //   if (this.cacheMessage) {
      //     if (message.offsetId === this.cacheMessage.offsetId) {
      //       if (message.status === "success") {
      //         this.cacheMessage["insertMessageIndex"] = true;
      //       } else if (message.status === "error") {
      //         this.cacheMessage["insertMessageIndex"] = false;
      //       }
      //     }
      //   }
      //   return;
      } else if (message.operate === "cache") {
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

  async getMessage(tryCount) {
    try {
      // this.messageArray = [];
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
      //console.log("(" + this.currentStep + ")getMessage出错 : " + e);
      this.sendLog("getMessage", "出错 : " + JSON.stringify(e), null, true);
      if (e.errorMessage === "FLOOD" || e.code === 420) {
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
    let messageResult = {};
    try {
      messageResult = await this.env.MAINDB.prepare("SELECT COUNT(id) FROM `CODE` WHERE `chatId` = ? AND  `id` = ? LIMIT 1;").bind(this.chatId, messageId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectMessage出错 : " + e);
      this.sendGrid("selectMessage", "出错 : " + e.message, "try", true);
      if (e.message === "Too many API requests by single Worker invocation. To configure this limit, refer to https://developers.cloudflare.com/workers/wrangler/configuration/#limits") {
        this.stop = 2;
        this.broadcast({
          "result": "pause",
        });
        await this.close();
      } else {
        await this.selectMessageError(tryCount, messageId);
      }
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

  async insertMessageError(tryCount, messageId, txt, id, url) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")insertMessage超出tryCount限制");
      this.sendLog("insertMessage", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertMessage(tryCount + 1, messageId, txt, id, url);
    }
  }

  async insertMessage(tryCount, messageId, txt, id, url) {
    this.apiCount += 1;
    let messageResult = {};
    try {
      messageResult = await this.env.MAINDB.prepare("INSERT INTO `CODE` (chatId, id, txt, webpage, url) VALUES (?, ?, ?, ?, ?);").bind(this.chatId, messageId, txt, id, url).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertMessage出错 : " + e);;
      this.sendGrid("insertMessage", "出错 : " + e.message, "try", true);
      if (e.message === "Too many API requests by single Worker invocation. To configure this limit, refer to https://developers.cloudflare.com/workers/wrangler/configuration/#limits") {
        this.stop = 2;
        this.broadcast({
          "result": "pause",
        });
        await this.close();
      } else {
        await this.insertMessageError(tryCount, messageId, txt, id, url);
      }
      return;
    }
    //console.log(messageResult);  //测试
    if (messageResult.success === true) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入message数据成功");
      this.sendGrid("insertMessage", "", "success", false);
    } else {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入message数据失败");
      this.sendGrid("insertMessage", "插入message数据失败", "error", true);
      await this.insertMessageError(tryCount, messageId, txt, id, url);
    }
  }

  async nextMessage(messageLength, messageIndex, message) {
    if (this.stop === 1) {
      if (this.apiCount < 900) {
        if (message) {
          const messageId = message.id;
          const txt = message.message;
          this.broadcast({
            "step": this.currentStep,
            "operate": "nextMessage",
            // "messageLength": messageLength,
            // "messageIndex": messageIndex,
            "chatId": this.chatId,
            "offsetId": this.offsetId,
            "messageId": messageId,
            "status": "add",
            "date": new Date().getTime(),
          });
          if (txt) {
            // const indexCount = await this.selectMessageIndex(1, messageId);
            // if (parseInt(indexCount) === 0) {
              const messageCount = await this.selectMessage(1, messageId);
              if (parseInt(messageCount) === 0) {
                let webpage = "";
                let url = "";
                if (message.media) {
                  if (message.media.webpage) {
                    this.sendGrid("nextMessage", "", "webpage", false);
                    if (message.media.webpage.id) {
                      webpage = message.media.webpage.id.toString();
                    }
                    if (message.media.webpage.url) {
                      url = message.media.webpage.url;
                    }
                  }
                }
                await this.insertMessage(1, messageId, txt, webpage, url);
                // await this.insertMessageIndex(1, messageId);
              } else {
                //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : message已在数据库中");
                this.sendGrid("nextMessage", "", "exist", false);
              }
            // } else {
            //   //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : messageIndex已在数据库中");
            //   this.sendGrid("nextMessage", "", "indexExist", false);
            // }
            this.offsetId += 1;
          } else {
            //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 错误的消息");
            this.sendGrid("nextMessage", "txt为空", "error", true);
            this.offsetId += 1;
          }
        } else {
          //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 错误的消息");
          this.sendGrid("nextMessage", "错误的消息", "error", true);
          this.offsetId += 1;
        }
      } else {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")nextMessage超出apiCount限制");
        this.sendGrid("nextMessage", "超出apiCount限制", "limit", true);
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
        this.currentStep += 1;
        await this.getMessage(1);
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
        } else {
          this.fromPeer = null;
          //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
          this.sendLog("nextStep", this.chatId + " : 当前chat采集完毕", null, false);
          this.broadcast({
            "result": "end",
          });
        }
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
    await this.getChat();
    if (this.fromPeer) {
      if (this.stop === 1) {
        this.currentStep += 1;
        await this.getMessage(1);
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
        } else {
          this.fromPeer = null;
          //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
          this.sendLog("start", this.chatId + " : 当前chat采集完毕", null, false);
          this.broadcast({
            "result": "end",
          });
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
      const id = env.WEBSOCKET_SERVER.idFromName("code");
      const stub = env.WEBSOCKET_SERVER.get(id);
      return stub.fetch(request);
    }

    return new Response("error");
  },
};
