import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions, utils } from "./teleproto";
import { LogLevel } from "./teleproto/extensions";
import { codeString } from "./blgjlq";
import bigInt from "big-integer";

export class WebSocketServer extends DurableObject {
  // webSocket = [];
  ws = null;
  stop = 0;
  currentStep = 0;
  compress = false;
  batch = false;
  codeIndex = 0;
  codes = codeString.slice();
  codeLength = 0;
  client = null;
  endCode = 0;
  limit = 100;
  offsetId = 0;
  // error = false;
  fromPeer = null;
  toPeer = null;
  queue = false;
  waitTime = 60000;
  pingTime = 5000;
  count = 0;
  flood = 0;
  time = 0;
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

  async init(option) {
    if (!this.client || !this.stop || this.stop === 0) {
    // if (!this.stop || this.stop === 0) {
      if (option) {
        if (option.compress) {
          this.compress = option.compress;
        }
        if (option.batch) {
          this.batch = option.batch;
        }
        if (option.codeIndex && option.codeIndex > 0) {
          this.codeIndex = option.codeIndex;
        }
        if (option.endCode && option.endCode > 0) {
          this.endCode = option.endCode;
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
        this.codeIndex = await this.ctx.storage.get("codeIndex") || 0;
        this.endCode = 0;
        this.limit = 100;
        this.offsetId = await this.ctx.storage.get("offsetId") || 0;
      }
      // this.ws = null;
      // this.client = null;
      // this.stop = 0;
      // this.webSocket = [];
      this.currentStep = 0;
      this.codes = codeString.slice();
      this.codeLength = this.codes.length;
      // this.error = false;
      this.fromPeer = null;
      this.toPeer = null;
      this.queue = await this.ctx.storage.get("queue") || false;
      this.waitTime = 60000;
      this.pingTime = 5000;
      this.count = 0;
      this.flood = 0;
      this.time = 0;
      this.messageArray = [];
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
      "codeIndex": this.codeIndex + 1,
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
      "codeIndex": this.codeIndex + 1,
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
          reverse: true,  //测试
          addOffset: -this.offsetId,
          //addOffset: 0,  //测试
          waitTime: 60,
        })
      ) {
        // count += 1;
        this.count += 1;
        if (message.noforwards === false) {
          this.messageArray.push(message);
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
      if (e.errorMessage === "FLOOD" || e.code === 420) {
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
          this.sendForward("forwardMessage", JSON.stringify(e), 0, "error", true);
        } else if (e.errorMessage === "CHAT_FORWARDS_RESTRICTED" || e.code === 400) {
          this.offsetId += this.count;
          this.count = 0;
          //console.log("(" + this.currentStep + ") 消息不允许转发" + e);
          this.sendForward("forwardMessage", "消息不允许转发 : " + JSON.stringify(e), 0, "error", true);
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
      await this.ctx.storage.put("offsetId", this.offsetId);
      //console.log("(" + this.currentStep + ") 成功转发了" + length + "条消息");
      this.sendForward("forwardMessage", "成功转发了" + messageLength + "条消息", messageLength, "update", false);
    } else {
      this.offsetId += this.count;
      this.count = 0;
      await this.ctx.storage.put("offsetId", this.offsetId);
      //console.log("(" + this.currentStep + ") 消息无需转发");
      this.sendForward("forwardMessage", "消息无需转发", 0, "error", true);
    }
    this.time = new Date().getTime();
  }

  async nextStep() {
    if (this.stop === 1) {
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
          let temp = null;
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
                if (id && fileId) {
                  idArray.push(id);
                  fileIdArray.push(fileId);
                }
              } else if (messageArray[messageIndex].replyMarkup) {
                if (messageArray[messageIndex].replyMarkup.rows) {
                  // console.log(message);  //测试
                  for (const row of messageArray[messageIndex].replyMarkup.rows) {
                    // console.log(row);  //测试
                    for (let button of row.buttons) {
                      // console.log(button);  //测试
                      if (button.text === "加入队列全部推送") {
                        temp = {button, id};
                      }
                    }
                  }
                }
              } else {
                const message = messageArray[messageIndex].message;
                if (message.substr(0, 10) === "blgjlqbot_") {
                  await this.ctx.storage.put(message, 1);
                } else if (message === "所有媒体已发送完毕。") {
                  temp = null;
                  this.queue = false;
                  await this.ctx.storage.put("queue", false);
                } else {
                  const regexp = /这是第 \d+ 页 \/ 共 \d+ 页/gi;
                  if (regexp.test(message)) {
                    const regexp = / (\d+?) /gi;
                    const matches = message.match(regexp);
                    // console.log(matches);  //测试
                    if (matches.length === 2) {
                      if (matches[0] === matches[1]) {
                        temp = null;
                        this.queue = false;
                        await this.ctx.storage.put("queue", false);
                      }
                    }
                  }
                }
              }
            }
          }
          if (this.queue === false) {
            this.queue = true;
            await this.ctx.storage.put("queue", true);
            if (temp) {
              await this.client.invoke(
                new Api.messages.GetBotCallbackAnswer({
                  peer: fromPeer,
                  msgId: temp.id,
                  data: temp.data,
                })
              );
            } else {
              await this.sendQuery(1);
            }
          }
          await this.forwardMessage(idArray, fileIdArray);
          if (this.stop === 1) {
            await this.nextStep();
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
      } else if ((this.endCode && this.codeIndex > this.endCode) && this.codeIndex > this.codeLength) {
        await this.ctx.storage.put("offsetId", this.offsetId);
        //console.log("(" + this.currentStep + ") 当前bot采集完毕");
        this.sendLog("nextStep", "当前bot采集完毕", null, false);
        this.broadcast({
          "result": "end",
        });
        await this.close()
      } else {
        if (this.count > 0) {
          this.offsetId += this.count;
          this.count = 0;
          await this.ctx.storage.put("offsetId", this.offsetId);
        }
        //console.log("(" + this.currentStep + ") 没有获取到有效的消息");
        this.sendForward("nextStep", "没有获取到有效的消息", 0, "error", true);
        if (this.stop === 1) {
          if (this.queue === false) {
            await this.sendQuery(1);
          }
          await scheduler.wait(10000);
          await this.nextStep();
        } else if (this.stop === 2) {
          this.broadcast({
            "result": "pause",
          });
          await this.close();
        }
      }
      if (this.stop === 1) {
        await this.nextStep();
      } else if (this.stop === 2) {
        this.broadcast({
          "result": "pause",
        });
        await this.close();
      }
    } else if (this.stop === 2) {
      await this.ctx.storage.put("offsetId", this.offsetId);
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

  async getBot() {
    const users = await this.client.invoke(
      new Api.users.GetUsers({
        id: [
          new Api.InputUser({
            userId: bigInt("8633923875"),  //blgjlqbot
            accessHash: bigInt("3740805468883295251"),
          }),
        ],
      })
    );
    // console.log(users);  //测试
    // console.log(users.length);  //测试
    if (users.length && !(users[0] instanceof Api.UserEmpty)) {
      this.fromPeer = utils.getInputPeer(users[0]);
      // console.log(this.fromPeer);  //测试
    }
  }

  async getUserError(tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")getUser超出tryCount限制");
      this.sendLog("getUser", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.getUser(tryCount + 1);
    }
  }

  async getUser(tryCount) {
    let users = {};
    try {
      users = await this.client.invoke(
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
    } catch (e) {
      //console.log("getUser出错 : " + e);
      this.sendLog("getUser", "出错 : " + JSON.stringify(e), null, true);
      await this.getUserError(tryCount);
      return;
    }
    // console.log(users);  //测试
    // console.log(users.length);  //测试
    if (users.length && !(users[0] instanceof Api.UserEmpty)) {
      this.toPeer = utils.getInputPeer(users[0]);
      // console.log(toPeer);  //测试
    }
  }

  async sendQueryError(tryCount) {
    if (tryCount === 20) {
      //console.log("(" + this.currentStep + ")sendQuery超出tryCount限制");
      this.sendLog("sendQuery", "超出tryCount限制", null, true);
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.sendQuery(tryCount + 1);
    }
  }

  async sendQuery(tryCount) {
    this.codeIndex += 1;
    if (this.endCode && this.codeIndex > this.endCode) {
      //console.log("(" + this.currentStep + ") 已经没有code了");
      this.sendLog("sendQuery", "已经没有code了", "error", true);
      return;
    }
    if (this.codeIndex < this.codeLength) {
      await this.ctx.storage.put("codeIndex", this.codeIndex);
      const code = this.codes[this.codeIndex];
      if (code) {
        try {
          const result = await this.client.invoke(
            new Api.messages.SendMessage({
              peer: this.fromPeer,
              message: code,
              silent: true,
            })
          );
        } catch (e) {
          //console.log("sendQuery出错 : " + e);
          this.sendLog("sendQuery", "出错 : " + JSON.stringify(e), null, true);
          await this.sendQueryError(tryCount);
          return;
        }
        //console.log("(" + this.currentStep + ") code : " + code);  //测试
        this.sendLog("sendQuery", "code : " + code, "error", true);  //测试
      } else {
        //console.log("(" + this.currentStep + ") code为空");
        this.sendLog("sendQuery", "code为空", "error", true);
      }
    } else {
      //console.log("(" + this.currentStep + ") 已经没有code了");
      this.sendLog("sendQuery", "已经没有code了", "error", true);
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
    await this.init(option);
    // this.stop = 1;
    await this.open(1);
    await this.getBot();
    if (this.fromPeer) {
      await this.getUser(1);
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
            let temp = null;
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
                  if (id && fileId) {
                    idArray.push(id);
                    fileIdArray.push(fileId);
                  }
                } else if (messageArray[messageIndex].replyMarkup) {
                  if (messageArray[messageIndex].replyMarkup.rows) {
                    // console.log(message);  //测试
                    for (const row of messageArray[messageIndex].replyMarkup.rows) {
                      // console.log(row);  //测试
                      for (let button of row.buttons) {
                        // console.log(button);  //测试
                        if (button.text === "加入队列全部推送") {
                          temp = {button, id};
                        }
                      }
                    }
                  }
                } else {
                  const message = messageArray[messageIndex].message;
                  if (message.substr(0, 10) === "blgjlqbot_") {
                    await this.ctx.storage.put(message, 1);
                  } else if (message === "所有媒体已发送完毕。") {
                    temp = null;
                    this.queue = false;
                    await this.ctx.storage.put("queue", false);
                  } else {
                    const regexp = /这是第 \d+ 页 \/ 共 \d+ 页/gi;
                    if (regexp.test(message)) {
                      const regexp = / (\d+?) /gi;
                      const matches = message.match(regexp);
                      // console.log(matches);  //测试
                      if (matches.length === 2) {
                        if (matches[0] === matches[1]) {
                          temp = null;
                          this.queue = false;
                          await this.ctx.storage.put("queue", false);
                        }
                      }
                    }
                  }
                }
              }
            }
            if (this.queue === false) {
              this.queue = true;
              await this.ctx.storage.put("queue", true);
              if (temp) {
                await this.client.invoke(
                  new Api.messages.GetBotCallbackAnswer({
                    peer: fromPeer,
                    msgId: temp.id,
                    data: temp.data,
                  })
                );
              } else {
                await this.sendQuery(1);
              }
            }
            await this.forwardMessage(idArray, fileIdArray);
            if (this.stop === 1) {
              await this.nextStep();
            } else if (this.stop === 2) {
              this.broadcast({
                "result": "pause",
              });
              await this.close();
            }
          } else if ((this.endCode && this.codeIndex > this.endCode) && this.codeIndex > this.codeLength) {
            await this.ctx.storage.put("offsetId", this.offsetId);
            //console.log("(" + this.currentStep + ") 当前bot采集完毕");
            this.sendLog("start", "当前bot采集完毕", null, false);
            this.broadcast({
              "result": "end",
            });
            await this.close()
          } else {
            if (this.count > 0) {
              this.offsetId += this.count;
              this.count = 0;
              await this.ctx.storage.put("offsetId", this.offsetId);
            }
            //console.log("(" + this.currentStep + ") 没有获取到有效的消息");
            this.sendForward("start", "没有获取到有效的消息", 0, "error", true);
            if (this.stop === 1) {
              if (this.queue === false) {
                await this.sendQuery(1);
              }
              await scheduler.wait(10000);
              await this.nextStep();
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
        //console.log("获取toPeer出错");
        this.sendLog("start", "获取toPeer出错", "error", true);
        await this.close();
      }
    } else {
      //console.log("全部bot采集完毕");
      this.sendLog("start", "全部bot采集完毕", null, false);
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
    } else if (command === "codeIndex") {
      if (data.codeIndex && data.codeIndex >= 0 && this.codeIndex !== data.codeIndex) {
        this.codeIndex = data.codeIndex;
        await this.ctx.storage.put("codeIndex", this.codeIndex);
      }
    } else if (command === "offsetId") {
      if (data.offsetId && data.offsetId >= 0 && this.offsetId !== data.offsetId) {
        this.offsetId = data.offsetId;
      }
    } else if (command === "endCode") {
      if (data.endCode && data.endCode > 0 && this.endCode !== data.endCode) {
        this.endCode = data.endCode;
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
    //   await this.ctx.storage.put("offsetId", this.offsetId);
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
      const id = env.WEBSOCKET_SERVER.idFromName("bot");
      const stub = env.WEBSOCKET_SERVER.get(id);
      return stub.fetch(request);
    }

    return new Response("error");
  },
};
