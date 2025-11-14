import { DurableObject } from "cloudflare:workers";
import { TelegramClient, Api, sessions } from "./gramjs";
import bigInt from "big-integer";

async function countMessage(env) {
  const messageResult = await env.PANSOUDB.prepare("SELECT COUNT(Mindex) FROM `PANMESSAGE` WHERE 1 = 1;").run();
  //console.log("messageResult : " + messageResult["COUNT(Mindex)"]);  //测试
  if (messageResult.success === true) {
    if (messageResult.results && messageResult.results.length > 0) {
      return messageResult.results[0]["COUNT(Mindex)"];
    }
  }
  return -1;
}

function getDB(id) {
  const database = [
    "52bec4a2-a12a-484d-8f58-4f254b8cffd0",  //0 : main
    "97d41e14-a9b6-45a9-b5cc-f60eb29acc02",  //1 : pansou1
    "57db5b64-03a6-4cc2-8c43-3c9994240d9d",  //2 : pansou2
    "b6e33f0e-061e-4ff9-8ac6-6f80f86b7d4d",  //3 : pansou3
    "0bce0745-a204-4382-b16f-c03e827a33f2",  //4 : pansou4
    "cd5d8762-0272-451c-b0d4-f4881016b6ad",  //5 : pansou5
  ];
  const length = database.length;
  if (id < length) {
    return database[id];
  } else {
    return undefined;
  }
}

async function exportDB(databaseId) {
  const accountId = "399e535af535f1efb41355caef170840";
  const d1ApiKey = "5IJ_fW5LT68yr15tRIJIU0ekKLVWGiH4vL5Wdj8b";
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
  compress = true;
  batch = false;
  ws = null;
  client = null;
  stop = 0;
  apiCount = 0;
  currentStep = 0;
  chatId = 0;
  endChat = 0;
  lastChat = 0;
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
        this.endChat = 0;
        this.reverse = true;
        this.limit = 20;
        this.offsetId = 0;
      }
      // this.client = null;
      // this.stop = 0;
      // this.webSocket = [];
      this.apiCount = 0;
      this.currentStep = 0;
      this.lastChat = 0;
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
      } else if (message.operate === "insertMessageIndex") {
        if (this.cacheMessage) {
          if (message.offsetId === this.cacheMessage.offsetId) {
            if (message.status === "success") {
              this.cacheMessage["insertMessageIndex"] = true;
            } else if (message.status === "error") {
              this.cacheMessage["insertMessageIndex"] = false;
            }
          }
        }
        return;
      } else if (message.operate === "cache") {
      } else if (message.operate === "open") {
      } else if (message.operate === "checkChat") {
      } else if (message.operate === "chat") {
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
        deviceModel: "Desktop",
        systemVersion: "Windows 10",
        appVersion: "5.12.3 x64",
        langCode: "en",
        systemLangCode: "en-US",
        //downloadRetries: 1,
        //retryDelay: 0,
        //useWSS: false,
      })
      await this.client.session.setDC(5, "91.108.56.128", 80);
      await this.client.setLogLevel("error");
      await this.client.connect();
    } catch (e) {
      //console.log("login出错 : " + e);
      this.broadcast({
        "operate": "open",
        "message": "login出错 : " + e,
        "error": true,
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
      return;
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

  async getConfigError(tryCount, option) {
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
      await this.getConfig(tryCount + 1, option);
    }
  }

  async getConfig(tryCount, option) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'pansou' LIMIT 1;").run();
    } catch (e) {
      //console.log("getConfig出错 : " + e);
      this.broadcast({
        "operate": "getConfig",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
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
        this.broadcast({
          "operate": "getConfig",
          "message": "没有预设config",
          "date": new Date().getTime(),
        });
      }
    } else {
      //console.log("查询config失败");
      this.broadcast({
        "operate": "getConfig",
        "message": "查询config失败",
        "error": true,
        "date": new Date().getTime(),
      });
      await this.getConfigError(tryCount, option);
    }
  }

  async noExistChatError(tryCount, Cindex) {
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
      await this.noExistChat(tryCount + 1, Cindex);
    }
  }

  async noExistChat(tryCount, Cindex) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("UPDATE `PANCHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(Cindex).run();
    } catch (e) {
      //console.log("noExistChat出错 : " + e);
      this.broadcast({
        "operate": "noExistChat",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      await this.noExistChatError(tryCount, Cindex);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("更新不存在chat数据成功");
      this.broadcast({
        "operate": "noExistChat",
        "message": "更新不存在chat数据成功",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("更新不存在chat数据失败");
      this.broadcast({
        "operate": "noExistChat",
        "message": "更新不存在chat数据失败",
        "error": true,
        "date": new Date().getTime(),
      });
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
        this.broadcast({
          "operate": "checkChat",
          "step": this.currentStep,
          "message": "出错 : " + e,
          "error": true,
          "date": new Date().getTime(),
        });
        if (tryCount === 20) {
          this.stop = 2;
          //console.log("(" + this.currentStep + ")checkChat超出tryCount限制");
          this.broadcast({
            "operate": "checkChat",
            "step": this.currentStep,
            "message": "超出tryCount限制",
            "error": true,
            "date": new Date().getTime(),
          });
          await this.close();
        } else {
          await scheduler.wait(10000);
          await this.checkChat(tryCount + 1, chatResult);
        }
        return;
      }
      // console.log(this.fromPeer);  //测试
      if (result && result.chats && result.chats.length > 0) {
        this.chatId = chatResult.Cindex;
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          this.fromPeer = result.chats[0];
          if (this.fromPeer) {
            this.offsetId = chatResult.current;
            //console.log("获取fromPeer成功");  //测试
            // this.broadcast({
            //   "operate": "checkChat",
            //   "message": "获取fromPeer成功",
            //   "date": new Date().getTime(),
            // });  //测试
            this.broadcast({
              "operate": "checkChat",
              "message": this.chatId + " : " + chatResult.title,
              "date": new Date().getTime(),
            });
          } else {
            await this.noExistChat(1, chatResult.Cindex);
            this.chatId = chatResult.Cindex + 1;
            if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
              //console.log(chatResult.title + " : chat已不存在了");  //测试
              this.broadcast({
                "operate": "checkChat",
                "message": chatResult.title + " : chat已不存在了",
                "error": true,
                "date": new Date().getTime(),
              });
              await this.nextChat(1, true);
            } else {
              //console.log(this.endChat + " : 超过最大chat了");  //测试
              this.broadcast({
                "operate": "checkChat",
                "message": this.endChat + " : 超过最大chat了",
                "error": true,
                "date": new Date().getTime(),
              });
            }
          }
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.broadcast({
            "operate": "checkChat",
            "message": this.endChat + " : 超过最大chat了",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      } else {
        this.chatId = chatResult.Cindex + 1;
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          //console.log(chatResult.title + " : chat已不存在了");  //测试
          this.broadcast({
            "operate": "checkChat",
            "message": chatResult.title + " : chat已不存在了",
            "error": true,
            "date": new Date().getTime(),
          });
          await this.nextChat(1, true);
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.broadcast({
            "operate": "checkChat",
            "message": this.endChat + " : 超过最大chat了",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      }
    } else {
      this.chatId = chatResult.Cindex + 1;
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        //console.log(chatResult.title + " : channelId或accessHash出错");  //测试
        this.broadcast({
          "operate": "checkChat",
          "message": chatResult.title + " : channelId或accessHash出错",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.nextChat(1, true);
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "operate": "checkChat",
          "message": this.endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
  }

  async nextChatError(tryCount, check) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")nextChat超出tryCount限制");
      this.broadcast({
        "operate": "nextChat",
        "step": this.currentStep,
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      chatResult = await this.env.MAINDB.prepare("SELECT * FROM `PANCHAT` WHERE `Cindex` >= ? AND `exist` = 1 LIMIT 1;").bind(this.chatId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")出错 : " + e);
      this.broadcast({
        "operate": "nextChat",
        "step": this.currentStep,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
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
        }
      } else {
        this.chatId = -1;
        //console.log("没有更多chat了");
        this.broadcast({
          "operate": "nextChat",
          "message": "没有更多chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } else {
      //console.log("查询chat失败");
      this.broadcast({
        "operate": "nextChat",
        "message": "查询chat失败",
        "error": true,
        "date": new Date().getTime(),
      });
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
          chatResult = await this.env.MAINDB.prepare("SELECT * FROM `PANCHAT` WHERE `Cindex` = 0 LIMIT 1;").run();
        } catch (e) {
          tryCount += 1;
          //console.log("(" + this.currentStep + ")getChat出错 : " + e);
          this.broadcast({
            "operate": "getChat",
            "step": this.currentStep,
            "message": "出错 : " + e,
            "error": true,
            "date": new Date().getTime(),
          });
          await scheduler.wait(10000);
        }
        //console.log("chatResult : " + chatResult"]);  //测试
        if (chatResult.success === true) {
          if (chatResult.results && chatResult.results.length > 0) {
            this.offsetId = chatResult.results[0].current;
            break;
          }
        } else {
          //console.log("查询me失败");  //测试
          this.broadcast({
            "operate": "getChat",
            "message": "查询me失败",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      }
    } else if (this.chatId && this.chatId > 0) {
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        await this.nextChat(1, true);
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "operate": "getChat",
          "message": this.endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    } else {
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        let tryCount = 0;
        while (tryCount < 30) {
          this.apiCount += 1;
          let chatResult = {};
          try {
            chatResult = await this.env.MAINDB.prepare("SELECT * FROM `PANCHAT` WHERE `current` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").run();
          } catch (e) {
            tryCount += 1;
            //console.log("(" + this.currentStep + ")getChat出错 : " + e);
            this.broadcast({
              "operate": "getChat",
              "step": this.currentStep,
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
              await this.checkChat(1, chatResult.results[0]);
            } else {
              this.chatId = -1;
              //console.log("没有更多chat了");
              this.broadcast({
                "operate": "getChat",
                "message": "没有更多chat了",
                "error": true,
                "date": new Date().getTime(),
              });
            }
            break;
          } else {
            //console.log("查询chat失败");
            this.broadcast({
              "operate": "getChat",
              "message": "查询chat失败",
              "date": new Date().getTime(),
            });
          }
        }
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "operate": "getChat",
          "message": this.endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
  }

  async updateConfigError(tryCount) {
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

  async updateConfig(tryCount) {
    this.apiCount += 1;
    let configResult = {};
    try {
      configResult = await this.env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `name` = 'pansou';").bind(this.chatId).run();
    } catch (e) {
      //console.log("updateConfig出错 : " + e);
      this.broadcast({
        "operate": "updateConfig",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      await this.updateConfigError(tryCount);
      return;
    }
    //console.log(configResult);  //测试
    if (configResult.success === true) {
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
      await this.updateConfigError(tryCount);
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
      //console.log("(" + this.currentStep + ")getMessage出错 : " + e);
      this.broadcast({
        "operate": "getMessage",
        "step": this.currentStep,
        "message": "出错 : " + e,
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
      return;
    }
  }

  async selectMessageIndex(tryCount, messageId) {
    // const messageResult = this.sql.exec(`SELECT COUNT(id) FROM CHAT${this.chatId} WHERE id = ?;`, messageId).one();
    // //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
    // if (messageResult) {
    //   return messageResult["COUNT(id)"];
    // }
    let cacheResult = {};
    try {
      cacheResult = await fetch(`https://index.zjmqlf2022.workers.dev/getDB?chatId=${this.chatId}&id=${messageId}`);
    } catch (e) {
      //console.log("出错 : " + e);
      this.broadcast({
        "operate": "selectMessageIndex",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")selectMessageIndex超出tryCount限制");
        this.broadcast({
          "operate": "selectMessageIndex",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(30000);
        await this.selectMessageIndex(tryCount + 1, messageId);
      }
      return;
    }
    if (cacheResult) {
      if (cacheResult.error) {
        //console.log("(" + this.currentStep + ")selectMessageIndex - " + cacheResult.error);
        this.broadcast({
          "operate": "selectMessageIndex",
          "step": this.currentStep,
          "message": cacheResult.error,
          "error": true,
          "date": new Date().getTime(),
        });
      } else {
        return cacheResult.result;
      }
    } else {
      //console.log("(" + this.currentStep + ")selectMessageIndex - " + messageId + " : 插入cache数据出错);
      this.broadcast({
        "operate": "selectMessageIndex",
        "step": this.currentStep,
        "message": messageId + " : 插入cache数据出错",
        "error": true,
        "date": new Date().getTime(),
      });
    }
  }

  async selectMessageError(tryCount, messageId) {
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

  async selectMessage(tryCount, messageId) {
    this.apiCount += 1;
    let messageResult = {};
    try {
      messageResult = await this.env.PANSOUDB.prepare("SELECT COUNT(id) FROM `PANMESSAGE` WHERE `chatId` = ? AND  `id` = ? LIMIT 1;").bind(this.chatId, messageId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : selectMessage出错 : " + e);
      this.broadcast({
        "offsetId": this.offsetId,
        "operate": "selectMessage",
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
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

  async insertMessageError(tryCount, messageId, txt, id, url) {
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

  async insertMessage(tryCount, messageId, txt, id, url) {
    this.apiCount += 1;
    let messageResult = {};
    try {
      messageResult = await this.env.PANSOUDB.prepare("INSERT INTO `PANMESSAGE` (chatId, id, txt, webpage, url) VALUES (?, ?, ?, ?, ?);").bind(this.chatId, messageId, txt, id, url).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : insertMessage出错 : " + e);;
      this.broadcast({
        "offsetId": this.offsetId,
        "operate": "insertMessage",
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
      await this.insertMessageError(tryCount, messageId, txt, id, url);
      return;
    }
    //console.log(messageResult);  //测试
    if (messageResult.success === true) {
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
      await this.insertMessageError(tryCount, messageId, txt, id, url);
    }
  }

  async insertMessageIndex(tryCount, messageId) {
    // this.sql.exec(`INSERT INTO CHAT${this.chatId} (id) VALUES (?);`, messageId);
    // //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : 插入messageIndex数据库成功");
    // this.broadcast({
    //   "offsetId": this.offsetId,
    //   "operate": "insertMessageIndex",
    //   "status": "success",
    //   "date": new Date().getTime(),
    // });
    let cacheResult = {};
    try {
      // cacheResult = await this.env.SERVERS.fetch(`https://test.zjmqlf2022.workers.dev/put?chatId=${this.chatId}&id=${messageId}&dbId=1`);
      cacheResult = await fetch(`https://index.zjmqlf2022.workers.dev/put?chatId=${this.chatId}&id=${messageId}&dbId=1`);
    } catch (e) {
      //console.log("出错 : " + e);
      this.broadcast({
        "operate": "insertMessageIndex",
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      if (tryCount === 20) {
        this.stop = 2;
        //console.log("(" + this.currentStep + ")insertMessageIndex超出tryCount限制");
        this.broadcast({
          "operate": "insertMessageIndex",
          "step": this.currentStep,
          "message": "超出tryCount限制",
          "error": true,
          "date": new Date().getTime(),
        });
        await this.close();
      } else {
        await scheduler.wait(30000);
        await this.insertMessageIndex(tryCount + 1, messageId);
      }
      return;
    }
    this.ws.send(JSON.stringify({
      "operate": "insertMessageIndex",
      "step": this.currentStep,
      "message": "cacheResult : " + JSON.stringify(cacheResult),
      "error": true,
      "date": new Date().getTime(),
    }));  //测试
    if (cacheResult && cacheResult.error) {
      // console.log("(" + this.currentStep + ")insertMessageIndex - 插入cache数据 ; " + cacheResult.error);
      this.broadcast({
        "operate": "insertMessageIndex",
        "step": this.currentStep,
        "message": "插入cache数据 ; " + cacheResult.error,
        "error": true,
        "date": new Date().getTime(),
      });
    } else {
      //console.log("(" + this.currentStep + ")insertMessageIndex - " + messageId + " : 插入cache数据出错);
      this.broadcast({
        "operate": "insertMessageIndex",
        "step": this.currentStep,
        "message": messageId + " : 插入cache数据出错",
        "error": true,
        "date": new Date().getTime(),
      });
    }
  }

  async updateChatError(tryCount) {
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

  async updateChat(tryCount) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("UPDATE `PANCHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(this.offsetId, new Date().getTime(), this.chatId).run();
    } catch (e) {
      //console.log("(" + this.currentStep + ")updateChat出错 : " + e);
      this.broadcast({
        "operate": "updateChat",
        "step": this.currentStep,
        "message": "出错 : " + e,
        "error": true,
        "date": new Date().getTime(),
      });
      await this.updateChatError(tryCount);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
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
      await this.updateChatError(tryCount);
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
            "chatId": this.chatId,
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
                // await this.insertMessageIndex(1, messageId);
              } else {
                //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : message已在数据库中");
                this.broadcast({
                  "offsetId": this.offsetId,
                  "operate": "nextMessage",
                  "status": "exist",
                  "date": new Date().getTime(),
                });
              }
            // } else {
            //   //console.log("(" + this.currentStep + ")[" + messageLength +"/" + messageIndex + "] " + this.offsetId + " : messageIndex已在数据库中");
            //   this.broadcast({
            //     "offsetId": this.offsetId,
            //     "operate": "nextMessage",
            //     "status": "indexExist",
            //     "date": new Date().getTime(),
            //   });
            // }
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
          this.broadcast({
            "result": "end",
            "operate": "nextStep",
            "step": this.currentStep,
            "message": this.chatId + " : 当前chat采集完毕",
            "date": new Date().getTime(),
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
              this.broadcast({
                "result": "over",
                "operate": "nextStep",
                "step": this.currentStep,
                "message": "全部chat采集完毕",
                "date": new Date().getTime(),
              });
              await this.close();
            }
          } else {
            //console.log(this.endChat + " : 超过最大chat了");  //测试
            this.broadcast({
              "operate": "nextStep",
              "message": this.endChat + " : 超过最大chat了",
              "error": true,
              "date": new Date().getTime(),
            });
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
    if (!option || !option.chatId || !option.reverse || !option.limited) {
      await this.getConfig(1, option);
    }
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
        } else {
          await this.updateChat(1);
          this.fromPeer = null;
          //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat采集完毕");
          this.broadcast({
            "result": "end",
            "operate": "start",
            "step": this.currentStep,
            "message": this.chatId + " : 当前chat采集完毕",
            "date": new Date().getTime(),
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
              this.broadcast({
                "result": "over",
                "operate": "start",
                "step": this.currentStep,
                "message": "全部chat采集完毕",
                "date": new Date().getTime(),
              });
              await this.close();
            }
          } else {
            //console.log(this.endChat + " : 超过最大chat了");  //测试
            this.broadcast({
              "operate": "start",
              "message": this.endChat + " : 超过最大chat了",
              "error": true,
              "date": new Date().getTime(),
            });
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
      //console.log("(" + this.currentStep + ")getDialog出错 : " + e);
      this.broadcast({
        "operate": "getDialog",
        "message": "出错 : " + e,
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
      return;
    }
  }

  async selectChatError(tryCount, channelId, accessHash) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("selectChat超出tryCount限制");
      this.broadcast({
        "operate": "selectChat",
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
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
      chatResult = await this.env.MAINDB.prepare("SELECT COUNT(Cindex) FROM `PANCHAT` WHERE `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(channelId, accessHash).run();
    } catch (e) {
      //console.log("selectChat出错 : " + e);
      this.broadcast({
        "offsetId": this.offsetId,
        "operate": "selectChat",
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
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

  async insertChatError(tryCount, channelId, accessHash, title) {
    if (tryCount === 20) {
      this.stop = 2;
      //console.log("insertChat超出tryCount限制");
      this.broadcast({
        "operate": "insertChat",
        "message": "超出tryCount限制",
        "error": true,
        "date": new Date().getTime(),
      });
      await this.close();
    } else {
      await scheduler.wait(10000);
      await this.insertChat(tryCount + 1, channelId, accessHash, title);
    }
  }

  async insertChat(tryCount, channelId, accessHash, title) {
    this.apiCount += 1;
    let chatResult = {};
    try {
      chatResult = await this.env.MAINDB.prepare("INSERT INTO `PANCHAT` (channelId, accessHash, title, current, exist) VALUES (?, ?, ?, ?, ?);").bind(channelId, accessHash, title, 0, 1).run();
    } catch (e) {
      //console.log("insertChat出错 : " + e);;
      this.broadcast({
        "offsetId": this.offsetId,
        "operate": "insertChat",
        "message": "出错 : " + JSON.stringify(e),
        "error": true,
        "status": "try",
        "date": new Date().getTime(),
      });
      await this.insertChatError(tryCount, channelId, accessHash, title);
      return;
    }
    //console.log(chatResult);  //测试
    if (chatResult.success === true) {
      //console.log("插入chat数据成功");
      this.broadcast({
        "operate": "insertChat",
        "status": "success",
        "date": new Date().getTime(),
      });
    } else {
      //console.log("插入chat数据失败");
      this.broadcast({
        "operate": "insertChat",
        "message": "插入chat数据失败",
        "error": true,
        "status": "error",
        "date": new Date().getTime()
      });
      await this.insertChatError(tryCount, channelId, accessHash, title);
    }
  }

  async chat() {
    // if (this.client || this.stop === 1) {
    // // if (this.stop === 1) {
    //   this.ws.send(JSON.stringify({
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
        const chatCount = await this.selectChat(1, channelId, accessHash);
        //console.log("chatCount : " + chatCount);  //测试
        if (parseInt(chatCount) === 0) {
          count += 1;
          await this.insertChat(1, channelId, accessHash, dialog.title);
          //console.log("chat - 新插入chat了 : " + dialog.title);
          this.broadcast({
            "operate": "chat",
            "message": "新插入chat了 : " + dialog.title,
            "date": new Date().getTime(),
          });
        } else {
          //console.log("chat - " + count + " : chat已在数据库中 - " + dialog.title);
          this.broadcast({
            "operate": "chat",
            "message": count + " : chat已在数据库中 - " + dialog.title,
            "date": new Date().getTime(),
          });
        }
      } else {
        //console.log("chat - channelId或accessHash错误 : " + dialog.title);
        this.broadcast({
          "operate": "chat",
          "message": "channelId或accessHash错误 : " + dialog.title,
          "error": true,
          "date": new Date().getTime(),
        });
      }
    }
    if (count > 0) {
      //console.log("chat - 新插入了" + count + "条chat数据");
      this.broadcast({
        "operate": "chat",
        "message": "新插入了" + count + "条chat数据",
        "date": new Date().getTime(),
      });
    }
    await this.close();
  }

  async cache(tryCount) {
    if (this.apiCount < 900) {
      // if (this.offsetId === 1) {
      //   this.sql.exec(`CREATE TABLE IF NOT EXISTS CHAT${this.chatId}(
      //       id    INTEGER PRIMARY KEY
      //     );`
      //   );
      // }
      this.currentStep += 1;
      //console.log("(" + this.currentStep + ")cache - offsetId : " + this.offsetId);  //测试
      // this.broadcast({
      //   "operate": "cache",
      //   "step": this.currentStep,
      //   "message": "("+ this.chatId + ") - offsetId : " + this.offsetId,
      //   "date": new Date().getTime(),
      // });  //测试
      this.apiCount += 1;
      let messageResult = {};
      this.chatId = 131;  //测试
      try {
        messageResult = await this.env.PANSOUDB.prepare("SELECT `Mindex`,`id` FROM `PANMESSAGE` WHERE `chatId` = ? AND  `Mindex` >= ? ORDER BY Mindex ASC LIMIT 0,20;").bind(this.chatId, this.offsetId).run();
      } catch (e) {
        //console.log("(" + this.currentStep + ")cache出错 : " + e);
        this.broadcast({
          "operate": "cache",
          "step": this.currentStep,
          "message": "出错 : " + JSON.stringify(e),
          "error": true,
          "status": "try",
          "date": new Date().getTime(),
        });
        if (tryCount === 20) {
          this.stop = 2;
          //console.log("(" + this.currentStep + ")cache超出tryCount限制");
          this.broadcast({
            "operate": "cache",
            "step": this.currentStep,
            "message": "超出tryCount限制",
            "error": true,
            "date": new Date().getTime(),
          });
          await this.close();
        } else {
          await scheduler.wait(10000);
          await this.cache(tryCount + 1);
        }
        return;
      }
      //console.log("messageResult : " + messageResult.results);  //测试
      const messageLength = messageResult.results.length;
      //console.log("(" + this.currentStep + ")cache - messageLength : " + messageLength);
      this.broadcast({
        "operate": "cache",
        "step": this.currentStep,
        "message": "("+ this.chatId + ") - messageLength : " + messageLength,
        "date": new Date().getTime(),
      });
      if (messageLength > 0) {
        // let temp = [];
        for (let messageIndex = 0; messageIndex < messageLength; messageIndex++) {
          // temp.push("(" + messageResult.results[messageIndex].id + ")");
          // this.offsetId = messageResult.results[messageLength - 1].Mindex;
          //console.log("(" + this.currentStep + ")cache - " + "["+ this.chatId + "] " + this.offsetId + " : " + messageResult.results[messageIndex].id);
          this.offsetId = messageResult.results[messageIndex].Mindex;  //测试
          this.broadcast({
            "operate": "cache",
            "step": this.currentStep,
            "message": "["+ this.chatId + "] " + this.offsetId + " : " + messageResult.results[messageIndex].id,
            "date": new Date().getTime(),
          });  //测试
          await this.insertMessageIndex(1, messageResult.results[messageIndex].id);
        }
        this.offsetId += 1;  //测试
        // this.offsetId = parseInt(messageResult.results[messageLength - 1].Mindex) + 1;
        // this.sql.exec(`INSERT INTO CHAT${this.chatId} (id) VALUES 
        //   ${temp.join(",")};`
        // );
        await this.cache(1);
      } else {
        //console.log("(" + this.currentStep + ")" + this.chatId + " : 当前chat缓存完毕");
        this.broadcast({
          "result": "end",
          "operate": "cache",
          "step": this.currentStep,
          "message": this.chatId + " : 当前chat缓存完毕",
          "date": new Date().getTime(),
        });
        this.chatId += 1;
        this.offsetId = 0;
        await this.nextChat(1, false);
        if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
          await this.cache(1);
        } else {
          //console.log(this.endChat + " : 超过最大chat了");  //测试
          this.broadcast({
            "operate": "cache",
            "message": this.endChat + " : 超过最大chat了",
            "error": true,
            "date": new Date().getTime(),
          });
        }
      }
    } else {
      this.stop = 2;
      //console.log("(" + this.currentStep + ")cache超出apiCount限制");
      this.broadcast({
        "operate": "cache",
        "step": this.currentStep,
        "message": "超出apiCount限制",
        "error": true,
        "status": "limit",
        "date": new Date().getTime(),
      });
      await this.close();
      // this.ctx.abort("reset");
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
      await this.close();
    } else if (command === "over") {
      this.stop = 2;
      this.broadcast({
        "result": "over",
      });
      await this.close();
    } else if (command === "chat") {
      await this.chat();
    } else if (command === "cache") {
      this.init(option);
      await this.nextChat(1, false);
      if (!this.endChat || this.endChat === 0 || (this.endChat > 0 && this.chatId <= this.endChat)) {
        await this.cache(1);
      } else {
        //console.log(this.endChat + " : 超过最大chat了");  //测试
        this.broadcast({
          "operate": "webSocketMessage",
          "message": this.endChat + " : 超过最大chat了",
          "error": true,
          "date": new Date().getTime(),
        });
      }
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
      const signed_url = await exportDB();
      if (signed_url) {
        ws.send(signed_url);
      } else {
        ws.send("获取signed_url失败");
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
      const id = env.WEBSOCKET_SERVER.idFromName("pansou");
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
