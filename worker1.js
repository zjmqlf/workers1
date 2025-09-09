import { TelegramClient, Api, sessions, utils } from "./gramjs";

//let running = false;

export default {
  async fetch(request, env, ctx) {
    // if (running === true) {
    //   console.log("程序已运行了");
    //   return new Response("error");
    // }
    // running = true;
    const { pathname } = new URL(request.url);
    let client = null;
    let apiCount = 0;
    let currentStep = 0;
    let chatId = 0;
    let lastChat = 0;
    let filterType = 0;
    let reverse = false;
    let limit = 10;
    let offsetId = 0;
    let error = false;
    let fromPeer = null;
    let messageArray = [];
    let messageLength = 0;
    let messageIndex = 0;
    let hashResult = {
      "hash": [],
      "offset": 0,
      "index": 0,
      "limit": 0,
    };
    let cacheHashResult = null;
    //let filter = Api.InputMessagesFilterPhotoVideo;
    let filter = Api.InputMessagesFilterVideo;  //测试
    //let filter = Api.InputMessagesFilterPhotos;  //测试
    //let filterTitle = "媒体";

    async function countMedia() {
        const mediaResult = await env.MEDIADB.prepare("SELECT COUNT(Vindex) FROM `MEDIA` WHERE 1 = 1;").first();
        //console.log("mediaResult : " + mediaResult["COUNT(Vindex)"]);  //测试
        if (mediaResult && mediaResult["COUNT(Vindex)"]) {
          return mediaResult["COUNT(Vindex)"];
        }
        return -1;
    }

    async function clearCache() {
        const cacheResult = await env.MAINDB.prepare("DELETE FROM `CACHE` WHERE 1 = 1;").run();
        //console.log(cacheResult);  //测试
        return cacheResult.success;
    }

    async function exportDB() {
      const accountId = "ac4c475ca3875ec3dea2d2306fde9c69";
      const databaseId = "619bf710-136f-4b05-b7a7-ce7ffef02990";
      const d1ApiKey = "Vk_7LsZt_ZEwDMMU4tqHHaYghAApWQ8I5M5TV7x9";
      const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;
      //const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/import`;
      const method = "POST";
      // const headers = new Headers();
      // headers.append("Content-Type", "application/json");
      // headers.append("Authorization", `Bearer ${d1ApiKey}`);
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
          console.log(urlResult.signed_url);  //测试
          return urlResult.signed_url;
          // const dumpResponse = await fetch(urlResult.signed_url);
          // console.log(dumpResponse);  //测试
          // if (dumpResponse.ok) {
          //   //await env.BACKUP_BUCKET.put(urlResult.filename, dumpResponse.body);
          //   // const downfile = new File(dumpResponse.body, "urlResult.filename", {
          //   //   type: "text/plain",
          //   // });
          //   // const tmpLink = document.createElement("a");
          //   // const objectUrl = URL.createObjectURL(downfile);
          //   // tmpLink.href = objectUrl;
          //   // tmpLink.download = downfile.name;
          //   // //tmpLink.setAttribute("download", downfile.name);
          //   // document.body.appendChild(tmpLink);
          //   // tmpLink.click();
          //   // //document.body.removeChild(tmpLink);
          //   // URL.revokeObjectURL(objectUrl);
          //   // //window.URL.revokeObjectURL(objectUrl);
          // } else {
          //   console.log("dump file错误");
          // }
        } else {
          console.log("signed_url错误");
          return "";
        }
      } else {
        console.log("at_bookmark错误");
        return "";
      }
    }

    async function open() {
      const apiId = 1334621;
      const apiHash = "2bc36173f487ece3052a00068be59e7b";
      const sessionString = "1BQAWZmxvcmEud2ViLnRlbGVncmFtLm9yZwG7VxdGmdW/SYRusjfTnUHfhQfqLFA+A30Jios20XKnGGsRB58mFR33Lnpz966333yugE0ysMX/XMP8Urbbm3ADQ/mCq/fdQqA/qUoeG9L2Wy0Y8WcOlikGkNJ2e/nO9pT9nl1YePq5DD/hJ8+eKNL4BvUY70GAth/N/fv7dA4joQzwWhHdA8wdOUaxDQhnSAk9H62zG4fX5zipV+g2qp2WCT6CWCwUtsgZs8FZ9g9/TMmyfLagFmnMe7MhlZdkMfgCtKCXI8MVrGaHq5SpPRqMMCR4SkFrwV+9Eo6NyehH7bzWl1zyyAr6wP8j0jtduckdvkUcmyoDOP2M3AkNgd+ZcQ==";
      try {
        client = await new TelegramClient(new sessions.StringSession(sessionString), apiId, apiHash, {
          connectionRetries: Number.MAX_VALUE,
          autoReconnect: true,
          //downloadRetries: 1,
          //retryDelay: 0,
          //useWSS: false,
          //langCode: "en",
          //systemLangCode: "en",
        })
        await client.session.setDC(5, "91.108.56.128", 80);
        await client.setLogLevel("error");
        await client.connect();
      } catch (e) {
        console.log("login出错 : " + e);
        await scheduler.wait(30000);
        await open();
      }
      console.log("连接服务器成功");
      //console.log(client);  //测试
      //await scheduler.wait(5000);
    }

    async function getConfig() {
      apiCount += 1;
      try {
        const configResult = await env.MAINDB.prepare("SELECT * FROM `CONFIG` WHERE `name` = 'collect' LIMIT 1;").first();
        //console.log("configResult : " + configResult);  //测试
        if (configResult) {
          if (configResult.chatId && configResult.chatId > 0) {
            chatId = configResult.chatId;
            lastChat = chatId;
          }
          if (configResult.filterType && configResult.filterType > 0 && configResult.filterType <= 9) {
            filterType = configResult.filterType;
          }
          if (configResult.reverse) {
            reverse = Boolean(configResult.reverse);
          }
          if (configResult.limited && configResult.limited > 0) {
            limit = configResult.limited;
          }
        } else {
          console.log("没有预设config");
        }
      } catch (e) {
        console.log("getConfig出错 : " + e);
        await scheduler.wait(10000);
        await getConfig();
      }
    }

    // async function switchType() {
    //   switch (filterType) {
    //     case 0:
    //       filter = Api.InputMessagesFilterPhotoVideo;
    //       break;
    //     case 1:
    //       //filterTitle = "图片";
    //       filter = Api.InputMessagesFilterPhotos;
    //       break;
    //     case 2:
    //       //filterTitle = "视频";
    //       filter = Api.InputMessagesFilterVideo;
    //       break;
    //     case 3:
    //       //filterTitle = "文档";
    //       filter = Api.InputMessagesFilterDocument;
    //       break;
    //     case 4:
    //       //filterTitle = "动图";
    //       filter = Api.InputMessagesFilterGif;
    //       break;
    //     case 5:
    //       filter = Api.InputMessagesFilterVoice;
    //       break;
    //     case 6:
    //       filter = Api.InputMessagesFilterMusic;
    //       break;
    //     case 7:
    //       filter = Api.InputMessagesFilterChatPhotos;
    //       break;
    //     case 8:
    //       filter = Api.InputMessagesFilterRoundVoice;
    //       break;
    //     case 9:
    //       filter = Api.InputMessagesFilterRoundVideo;
    //       break;
    //     default:
    //       filter = Api.InputMessagesFilterPhotoVideo;
    //   }
    // }

    async function getChat() {
      //console.log("getChat");  //测试
      if (chatId === 0) {
        fromPeer = "me";
        apiCount += 1;
        const chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `Cindex` = 0 LIMIT 1;").first();
        //console.log("chatResult : " + chatResult"]);  //测试
        if (chatResult) {
          if (filterType === 0) {
            offsetId = chatResult.current;
          } else if (filterType === 1) {
            offsetId = chatResult.photo;
          } else if (filterType === 2) {
            offsetId = chatResult.video;
          } else if (filterType === 3) {
            offsetId = chatResult.document;
          } else if (filterType === 4) {
            offsetId = chatResult.gif;
          }
        }
      } else if (chatId && chatId > 0) {
        while (!fromPeer) {
          apiCount += 1;
          const chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `Cindex` >= ? AND `exist` = 1 LIMIT 1;").bind(chatId).first();
          //console.log("chatResult : " + chatResult"]);  //测试
          if (chatResult) {
            for await (const dialog of client.iterDialogs({})) {
              //console.log(dialog);  //测试
              if (dialog.id.toString() === chatResult.channelId) {
                fromPeer = dialog;
                //console.log(fromPeer);  //测试
                if (filterType === 0) {
                  offsetId = chatResult.current;
                } else if (filterType === 1) {
                  offsetId = chatResult.photo;
                } else if (filterType === 2) {
                  offsetId = chatResult.video;
                } else if (filterType === 3) {
                  offsetId = chatResult.document;
                } else if (filterType === 4) {
                  offsetId = chatResult.gif;
                }
                console.log("获取fromPeer完毕");
                break;
              }
            }
            if (!fromPeer) {
              apiCount += 1;
              const chatInfo = await env.MAINDB.prepare("UPDATE `CHAT` SET `exist` = 0 WHERE `Cindex` = ?;").bind(chatResult.Cindex).run();
              //console.log(chatInfo);  //测试
              if (chatInfo.success === true) {
                console.log("更新chat数据成功");
              } else {
                console.log("更新chat数据失败");
              }
              chatId = chatResult.Cindex + 1;
            }
          } else {
            console.log("没有chat了");
            break;
          }
        }
      } else {
        apiCount += 1;
        let chatResult = {};
        if (filterType === 0) {
          chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `current` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
        } else if (filterType === 1) {
          chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `photo` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
        } else if (filterType === 2) {
          chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `video` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
        } else if (filterType === 3) {
          chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `document` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
        } else if (filterType === 4) {
          chatResult = await env.MAINDB.prepare("SELECT * FROM `CHAT` WHERE `gif` = 0 AND `exist` = 1 ORDER BY `Cindex` ASC LIMIT 1;").first();
        }
        //console.log("chatResult : " + chatResult"]);  //测试
        if (chatResult) {
          for await (const dialog of client.iterDialogs({})) {
            //console.log(dialog);  //测试
            //if (dialog.id.toString() === chatResult.channelId) {
            if (dialog.id === chatResult.channelId) {
              fromPeer = dialog;
              //console.log(fromPeer);  //测试
              if (filterType === 0) {
                offsetId = chatResult.current;
              } else if (filterType === 1) {
                offsetId = chatResult.photo;
              } else if (filterType === 2) {
                offsetId = chatResult.video;
              } else if (filterType === 3) {
                offsetId = chatResult.document;
              } else if (filterType === 4) {
                offsetId = chatResult.gif;
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

    async function updateConfig() {
      apiCount += 1;
      try {
        const chatInfo = await env.MAINDB.prepare("UPDATE `CONFIG` SET `chatId` = ? WHERE `name` = 'collect';").bind(chatId).run();
        //console.log(chatInfo);  //测试
        if (chatInfo.success === true) {
          console.log("更新config数据成功");
        } else {
          console.log("更新config数据失败");
        }
      } catch (e) {
        console.log("updateConfig出错 : " + e);
        await scheduler.wait(10000);
        await updateConfig();
      }
    }

    async function getMessage() {
      try {
        let count = 0;
        for await (const message of client.iterMessages(
          fromPeer,
          //"me",  //测试
          {
            limit: limit,
            //limit: 20,  //测试
            reverse: reverse,
            //reverse: false,  //测试
            addOffset: offsetId,
            //addOffset: 0,  //测试
            filter: filter,
            //filter: Api.InputMessagesFilterVideo,  //测试
            waitTime: 60,
          })
        ) {
          count += 1;
          if (message.media) {
            if (message.media.document) {
              messageArray.push(message);
            } else if (message.media.photo) {
              messageArray.push(message);
            }
          }
        }
        return count;
      } catch (e) {
        messageArray = [];
        console.log("(" + currentStep + ")查询消息出错 : " + e);
        await scheduler.wait(10000);
        await getMessage();
      }
    }

    async function selectMediaIndex() {
      apiCount += 1;
      try {
        const mediaResult = await env.MAINDB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIAINDEX` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(hashResult.id, hashResult.accessHash).first();
        //console.log(mediaResult);  //测试
        return mediaResult;
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : selectMediaIndex出错 : " + e);
        await scheduler.wait(10000);
        await selectMediaIndex();
      }
    }

    async function selectMedia() {
      apiCount += 1;
      try {
        const mediaResult = await env.MEDIADB.prepare("SELECT `Vindex`, COUNT(id) FROM `MEDIA` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(hashResult.id, hashResult.accessHash).first();
        //console.log(mediaResult);  //测试
        return mediaResult;
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : selectMedia出错 : " + e);
        await scheduler.wait(10000);
        await selectMedia();
      }
    }

    async function getHash() {
        try {
          const results = await client.invokeWithSender(
            new Api.upload.GetFileHashes({
              location: hashResult.location,
              offset: hashResult.offset,
            }),
            hashResult.sender
          );
          return results;
        } catch (e) {
          if (hashResult.index === 1) {
            error = true;
            console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 查询首个hash出错 : " + e);
            await scheduler.wait(5000);
          } else {
            console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 查询hash出错");
            await scheduler.wait(10000);
            await getHash();
          }
        }
    }

    async function updateChat() {
      apiCount += 1;
      try {
        let chatInfo = {};
        if (filterType === 0) {
          chatInfo = await env.MAINDB.prepare("UPDATE `CHAT` SET `current` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(offsetId, Date.now(), chatId).run();
        } else if (filterType === 1) {
          chatInfo = await env.MAINDB.prepare("UPDATE `CHAT` SET `photo` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(offsetId, Date.now(), chatId).run();
        } else if (filterType === 2) {
          chatInfo = await env.MAINDB.prepare("UPDATE `CHAT` SET `video` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(offsetId, Date.now(), chatId).run();
        } else if (filterType === 3) {
          chatInfo = await env.MAINDB.prepare("UPDATE `CHAT` SET `document` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(offsetId, Date.now(), chatId).run();
        } else if (filterType === 4) {
          chatInfo = await env.MAINDB.prepare("UPDATE `CHAT` SET `gif` = ?, `updated` = ? WHERE `Cindex` = ?;").bind(offsetId, Date.now(), chatId).run();
        }
        //console.log(chatInfo);  //测试
        if (chatInfo.success === true) {
          console.log("(" + currentStep + ")更新chat数据成功");
        } else {
          console.log("(" + currentStep + ")更新chat数据失败");
        }
      } catch (e) {
        console.log("(" + currentStep + ")updateChat出错 : " + e);
        await scheduler.wait(10000);
        await updateChat();
      }
    }

    async function insertCache() {
      if (hashResult && hashResult.category === 2 && hashResult.hash && hashResult.hash.length && hashResult.hash.length > 0) {
        apiCount += 1;
        const location = hashResult.location;
        const sender = hashResult.sender;
        try {
          hashResult.limit = 0;
          delete hashResult.location;
          delete hashResult.sender;
          const cacheInfo = await env.MAINDB.prepare("INSERT INTO `CACHE` (chatId, id, accessHash, hash) VALUES (?, ?, ?, ?);").bind(chatId, hashResult.id, hashResult.accessHash, JSON.stringify(hashResult)).run();
          //console.log(cacheInfo);  //测试
          hashResult.location = location;
          hashResult.sender = sender;
          if (cacheInfo.success === true) {
            console.log("(" + currentStep + ")插入cache("+ hashResult.length + " | " + hashResult.index + ")数据成功");
          } else {
            console.log("(" + currentStep + ")插入cache("+ hashResult.length + " | " + hashResult.index + ")数据失败");
          }
        } catch (e) {
          if (!hashResult.location && location) {
            hashResult.location = location;
          }
          if (!hashResult.sender && sender) {
            hashResult.sender = sender;
          }
          console.log("(" + currentStep + ")insertCache("+ hashResult.length + " | " + hashResult.index + ")出错 : " + e);
          await scheduler.wait(10000);
          await insertCache();
        }
      } else {
        console.log("(" + currentStep + ")cache("+ hashResult.length + " | " + hashResult.index + ")数据错误");
      }
    }

    // async function updateCache() {
    //   apiCount += 1;
    //   try {
    //     delete hashResult.location;
    //     delete hashResult.sender;
    //     const cacheInfo = await env.MAINDB.prepare("UPDATE `CACHE` SET `hash` = ? WHERE `id` = ? AND `accessHash` = ?;").bind(JSON.stringify(hashResult), hashResult.id, hashResult.accessHash).run();
    //     //console.log(cacheInfo);  //测试
    //     if (cacheInfo.success === true) {
    //       console.log("(" + currentStep + ")更新cache数据成功");
    //     } else {
    //       console.log("(" + currentStep + ")更新cache数据失败");
    //     }
    //   } catch (e) {
    //     console.log("(" + currentStep + ")updateCache出错 : " + e);
    //     await scheduler.wait(10000);
    //     await updateCache();
    //   }
    // }

    // async function selectCache() {
    //   apiCount += 1;
    //   try {
    //     const cacheResult = await env.MAINDB.prepare("SELECT COUNT(id) FROM `CACHE` WHERE `id` = ? AND `accessHash` = ? LIMIT 1;").bind(hashResult.id, hashResult.accessHash).first();
    //     //console.log("cacheResult : " + cacheResult["COUNT(id)"]);  //测试
    //     if (cacheResult) {
    //       return cacheResult["COUNT(id)"];
    //     }
    //   } catch (e) {
    //     console.log("(" + currentStep + ")selectCache出错 : " + e);
    //     await scheduler.wait(10000);
    //     await selectCache();
    //   }
    // }

    // async function endCache() {
    //   const cacheCount = await selectCache();
    //   if (parseInt(cacheCount) === 0) {
    //     await insertCache();
    //   } else {
    //     await updateCache();
    //   }
    // }

    async function nextHash() {
      if (apiCount < 800) {
        if (hashResult.offset < hashResult.size) {
          hashResult.index += 1;
          console.log(hashResult.length + " - " + hashResult.index);  //测试
          const hashes = await getHash();
          if (error === false) {
            if (hashes) {
              //console.log(hashes);
              const length = hashes.length;
              if (length && length > 0) {
                for (let i = 0; i < length; i++) {
                  hashResult.offset += 131072;
                  const string = hashes[i].hash.toString("hex");
                  //console.log("sha2 : " + string);  //测试
                  if (string) {
                    hashResult.hash.push(string);
                  }
                }
              }
            } else {
              hashResult.index -= 1;
              console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : hashes出错");
            }
            await scheduler.wait(1000);
            if (hashResult.offset < hashResult.size) {
              hashResult.limit += 1;
              if (hashResult.limit === 50) {
                hashResult.limit = 0;
                //await endCache();
                await insertCache();  //测试
              }
              await nextHash();
            }
          }
        }
      } else {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : nextHash超出apiCount限制");
        await updateChat();
        //await endCache();
        await insertCache();  //测试
      }
    }

    async function insertMedia() {
      apiCount += 1;
      try {
        const mediaInfo = await env.MEDIADB.prepare("INSERT INTO `MEDIA` (id, accessHash, dcId, fileName, mimeType, size, duration, width, height, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(hashResult.id, hashResult.accessHash, hashResult.dcId, hashResult.fileName, hashResult.mimeType, hashResult.size, hashResult.duration, hashResult.width, hashResult.height, JSON.stringify(hashResult.hash)).run();
        //console.log(mediaInfo);  //测试
        if (mediaInfo.success === true) {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入media数据成功");
          return mediaInfo.meta.last_row_id;
        } else {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入media数据失败");
          return 0;
        }
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : insertMedia出错 : " + e);;
        await scheduler.wait(10000);
        await insertMedia();
      }
    }

    async function insertMediaIndex(id) {
      apiCount += 1;
      try {
        const indexInfo = await env.MAINDB.prepare("INSERT INTO `MEDIAINDEX` (Vindex, id, accessHash) VALUES (?, ?, ?);").bind(id, hashResult.id, hashResult.accessHash).run();
        //console.log(indexInfo);  //测试
        if (indexInfo.success === true) {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入mediaIndex数据成功");
        } else {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入mediaIndex数据失败");
        }
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : insertMediaIndex出错 : " + e);
        await scheduler.wait(10000);
        await insertMediaIndex();
      }
    }

    // async function selectPhotoIndex() {
    //   apiCount += 1;
    //   try {
    //     const photoResult = await env.MAINDB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTOINDEX` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(hashResult.id, hashResult.accessHash, hashResult.type).first();
    //     //console.log(photoResult);  //测试
    //     return photoResult;
    //   } catch (e) {
    //     console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : selectPhotoIndex出错 : " + e);
    //     await scheduler.wait(10000);
    //     await selectPhotoIndex();
    //   }
    // }

    async function selectPhoto() {
      apiCount += 1;
      try {
        const photoResult = await env.PHOTODB.prepare("SELECT `Pindex`, COUNT(id) FROM `PHOTO` WHERE `id` = ? AND `accessHash` = ? AND `sizeType` = ? LIMIT 1;").bind(hashResult.id, hashResult.accessHash, hashResult.type).first();
        //console.log(photoResult);  //测试
        return photoResult;
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : selectPhoto出错 : " + e);
        await scheduler.wait(10000);
        await selectPhoto();
      }
    }

    async function insertPhoto() {
      apiCount += 1;
      try {
        const photoInfo = await env.PHOTODB.prepare("INSERT INTO `PHOTO` (id, accessHash, dcId, sizeType, size, hash) VALUES (?, ?, ?, ?, ?, ?);").bind(hashResult.id, hashResult.accessHash, hashResult.dcId, hashResult.type, hashResult.size, JSON.stringify(hashResult.hash)).run();
        //console.log(photoInfo);  //测试
        if (photoInfo.success === true) {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入photo数据成功");
          return photoInfo.meta.last_row_id;
        } else {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入photo数据失败");
          return 0;
        }
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : (" + hashResult.photoLength +"/" + (hashResult.photoIndex + 1) + ") insertPhoto出错 : " + e);
        await scheduler.wait(10000);
        await insertPhoto();
      }
    }

    async function insertPhotoIndex(id) {
      apiCount += 1;
      try {
        const photoInfo = await env.MAINDB.prepare("INSERT INTO `PHOTOINDEX` (Pindex, id, accessHash) VALUES (?, ?, ?);").bind(id, hashResult.id, hashResult.accessHash).run();
        //console.log(photoInfo);  //测试
        if (photoInfo.success === true) {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入photoIndex数据成功");
        } else {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入photoIndex数据失败");
        }
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : insertPhotoIndex出错 : " + e);
        await scheduler.wait(10000);
        await insertPhotoIndex();
      }
    }

  async function endMessage(type) {
    //console.log(hashResult.count + " : " + hashResult.hash.length);  //测试
    if (hashResult.hash.length === hashResult.count) {
      let id = 0;
      if (type === 1) {
        id = await insertMedia();
        if (id > 0) {
          await insertMediaIndex(id);
        }
      } else if (type === 2) {
        id = await insertPhoto();
        if (id > 0) {
          await insertPhotoIndex(id);
        }
      }
      return id;
    } else {
      console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : count不一至 : " + hashResult.count + " - " + hashResult.hash.length);
      return 0;
    }
    //offsetId += 1;
    //messageIndex += 1;
    // hashResult = {
    //   "hash": [],
    //   "offset": 0,
    //   "index": 0,
    //   "limit": 0,
    // };
    }

    async function selectMessage() {
      apiCount += 1;
      try {
        const messageResult = await env.MAINDB.prepare("SELECT COUNT(id) FROM `MESSAGE` WHERE `id` = ? LIMIT 1;").bind(hashResult.messageId).first();
        //console.log("messageResult : " + messageResult["COUNT(id)"]);  //测试
        if (messageResult) {
          return messageResult["COUNT(id)"];
        }
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : selectMessage出错 : " + e);
        await scheduler.wait(10000);
        await selectMessage();
      }
    }

    async function insertMessage() {
      apiCount += 1;
      try {
        const messageInfo = await env.MAINDB.prepare("INSERT INTO `MESSAGE` (id, dbIndex, category, txt, ids, status) VALUES (?, ?, ?, ?, ?, ?);").bind(hashResult.messageId, 2, hashResult.category, hashResult.txt, JSON.stringify(hashResult.ids), hashResult.status).run();
        //console.log(messageInfo);  //测试
        if (messageInfo.success === true) {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入message数据成功");
        } else {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 插入message数据失败");
        }
      } catch (e) {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : insertMessage出错 : " + e);;
        await scheduler.wait(10000);
        await insertMessage();
      }
    }

    async function endInsert() {
      const messageCount = await selectMessage();
      if (parseInt(messageCount) === 0) {
        await insertMessage();
      } else {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : message已在数据库中");
      }
    }

    async function endStep() {
      if (messageIndex === messageLength) {
        messageIndex = 0;
        messageLength = 0;
        messageArray = [];
        if (apiCount < 800) {
          await nextStep();
        } else {
          console.log("(" + currentStep + ")endStep超出apiCount限制");
          await updateChat();
          //await endCache();
          //await insertCache();  //测试
        }
      } else {
        await checkCache();
        await nextMessage();
      }
    }

    async function end() {
      offsetId += 1;
      messageIndex += 1;
      hashResult = {
        "hash": [],
        "offset": 0,
        "index": 0,
        "limit": 0,
      };
      await endStep();
    }

    async function nextMessage() {
      hashResult.messageIndex = messageIndex + 1;
      if (apiCount < 800) {
        if (messageIndex >= 0 && messageIndex < limit) {
          hashResult.messageId = messageArray[messageIndex].id;
          if (messageArray[messageIndex]) {
            if (messageArray[messageIndex].media) {
              if (messageArray[messageIndex].media.document) {
                hashResult.id = messageArray[messageIndex].media.document.id.toString();
                hashResult.accessHash = messageArray[messageIndex].media.document.accessHash.toString();
                if (hashResult.id && hashResult.accessHash) {
                  // const mimeType = messageArray[messageIndex].media.document.mimeType;
                  // if (mimeType.startsWith("video/")) {
                  // } else if (mimeType.startsWith("image/")) {
                  // } else {
                  //     if (mimeType.startsWith("application/")) {
                  //     }
                  // }
                  const mediaIndexResult = await selectMediaIndex();
                  if (mediaIndexResult) {
                    hashResult.category = 2;
                    hashResult.txt = messageArray[messageIndex].message;
                    hashResult.ids = [];
                    hashResult.status = 0;
                    const mediaIndexCount = parseInt(mediaIndexResult["COUNT(id)"]);
                    if (mediaIndexCount === 0) {
                      const mediaResult = await selectMedia();
                      if (mediaResult) {
                        const mediaCount = parseInt(mediaResult["COUNT(id)"]);
                        if (mediaCount === 0) {
                          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 准备查询视频的hash");
                          const attributes = messageArray[messageIndex].media.document.attributes;
                          if (attributes.length > 0) {
                            for (const attribute of attributes) {
                              if (attribute) {
                                if (attribute.className === "DocumentAttributeVideo") {
                                  hashResult.duration = attribute.duration;
                                  hashResult.width = attribute.w;
                                  hashResult.height = attribute.h;
                                } else if (attribute.className === "DocumentAttributeFilename") {
                                  hashResult.fileName = attribute.fileName;
                                }
                              }
                            }
                            if (!hashResult.fileName) {
                              hashResult.fileName = "";
                            }
                          } else {
                            hashResult.duration = 0;
                            hashResult.width = 0;
                            hashResult.height = 0;
                            hashResult.fileName = "";
                          }
                          //console.log(hashResult.duration + " - " + hashResult.width + " - " + hashResult.height + " - " + hashResult.fileName);  //测试
                          const info = utils.getFileInfo(messageArray[messageIndex].media);
                          hashResult.dcId = info.dcId;
                          hashResult.location = info.location;
                          hashResult.size = parseInt(messageArray[messageIndex].media.document.size);
                          hashResult.mimeType = messageArray[messageIndex].media.document.mimeType;
                          hashResult.sender = await client.getSender(hashResult.dcId);
                          hashResult.count = Math.ceil(hashResult.size / 131072);
                          hashResult.length = Math.ceil(hashResult.size / (131072 * 8));
                          if (hashResult.length > 0) {
                            await nextHash();
                          }
                          if (error === false) {
                            const lastId = await endMessage(1);
                            if (lastId && lastId > 0) {
                              hashResult.status = 1;
                              hashResult.ids.push(lastId);
                            }
                            await endInsert();
                            await end();
                          } else {
                            error = false;
                            await end();
                          }
                        } else {
                          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 视频已入过库了");
                          const index = mediaResult.Vindex;
                          if (index && index > 0) {
                            hashResult.status = 1;
                            hashResult.ids.push(index);
                          }
                          if (index > 0) {
                            await insertMediaIndex(index);
                          }
                          await endInsert();
                          await end();
                        }
                      } else {
                        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 视频的mediaResult错误");
                        await end();
                      }
                    } else {
                      console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 视频已入过索引库了");
                      const index = mediaIndexResult.Vindex;
                      if (index && index > 0) {
                        hashResult.status = 1;
                        hashResult.ids.push(index);
                      }
                      await endInsert();
                      await end();
                    }
                  } else {
                    console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 视频的mediaIndexResult错误");
                    await end();
                  }
                } else {
                  console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 视频的id或accessHash错误");
                  await end();
                }
              } else if (messageArray[messageIndex].media.photo) {
                hashResult.id = messageArray[messageIndex].media.photo.id.toString();
                hashResult.accessHash = messageArray[messageIndex].media.photo.accessHash.toString();
                if (hashResult.id && hashResult.accessHash) {
                  const photoInfo = utils.getPhotoInfo(messageArray[messageIndex].media);
                  hashResult.photoLength = photoInfo.length;
                  //console.log("photoLength : " + hashResult.photoLength);  //测试
                  if (hashResult.photoLength && hashResult.photoLength > 0) {
                    hashResult.category = 1;
                    hashResult.txt = messageArray[messageIndex].message;
                    hashResult.ids = [];
                    hashResult.status = 0;
                    hashResult.photoIndex = 0;
                    for (hashResult.photoIndex; hashResult.photoIndex < hashResult.photoLength; hashResult.photoIndex++) {
                      hashResult.type = photoInfo[hashResult.photoIndex].type;
                      //const photoResult = await selectPhotoIndex();
                      const photoResult = await selectPhoto();  //测试
                      if (photoResult) {
                        const photoCount = parseInt(photoResult["COUNT(id)"]);
                        if (photoCount === 0) {
                          hashResult.hash = [];
                          hashResult.offset = 0;
                          hashResult.index = 0;
                          hashResult.dcId = photoInfo[hashResult.photoIndex].dcId;
                          hashResult.location = photoInfo[hashResult.photoIndex].location;
                          hashResult.size = photoInfo[hashResult.photoIndex].size;
                          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : (" + hashResult.photoLength +"/" + (hashResult.photoIndex + 1) + ") 准备查询图片"+ hashResult.type + "的hash");
                          hashResult.sender = await client.getSender(hashResult.dcId);
                          hashResult.count = Math.ceil(hashResult.size / 131072);
                          hashResult.length = Math.ceil(hashResult.size / (131072 * 8));
                          if (hashResult.length > 0) {
                            await nextHash();
                          }
                          if (error === false) {
                            const lastId = await endMessage(2);
                            if (lastId && lastId > 0) {
                              hashResult.status = 1;
                              hashResult.ids.push(lastId);
                            }
                          } else {
                            error = false;
                          }
                        } else {
                          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : (" + hashResult.photoLength +"/" + (hashResult.photoIndex + 1) + ") 图片"+ hashResult.type + "已入过库了");
                          const index = photoResult.Pindex;
                          if (index && index > 0) {
                            hashResult.status = 1;
                            hashResult.ids.push(index);
                          }
                        }
                      } else {
                        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 图片的photoResult错误");
                      }
                      await scheduler.wait(2000);
                    }
                    await endInsert();
                    await end();
                  } else {
                    console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 图片的info错误");
                    await end();
                  }
                } else {
                  console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 图片的id或accessHash错误");
                  await end();
                }
              // } else {
              //   console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 未知的媒体");
              }
            } else {
              console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 消息不包含媒体");
              await end();
            }
          } else {
            console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : 错误的消息");
            await end();
          }
        } else {
          console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : messageIndex错误");
          messageIndex = 0;
          messageLength = 0;
          messageArray = [];
          await nextStep();
        }
      } else {
        console.log("(" + currentStep + ")[" + messageLength +"/" + hashResult.messageIndex + "] " + offsetId + " : nextMessage超出apiCount限制");
        await updateChat();
        //await endCache();
        //await insertCache();  //测试
      }
    }

    async function close() {
      if (client) {
        await client.destroy();
        //running = false;
        console.log("断开服务器成功");
        //await scheduler.wait(1000);
      }
    }

    async function nextStep() {
      if (apiCount < 800) {
        await updateChat();
        currentStep += 1;
        const messageCount = await getMessage();
        messageLength = messageArray.length;
        if (messageLength > 0) {
          console.log("(" + currentStep + ")messageLength : " + messageLength);
          await checkCache();
          await nextMessage();
        } else if (messageCount > 0) {
          console.log("(" + currentStep + ")messageCount : " + messageCount);
          offsetId += limit;
          //messageIndex = 0;
          // hashResult = {
          //   "hash": [],
          //   "offset": 0,
          //   "index": 0,
          //   "limit": 0,
          // };
          //await updateChat();
          await nextStep();
        } else {
          await updateChat();
          fromPeer = null;
          chatId += 1;
          await getChat();
          if (fromPeer) {
            offsetId = 0;
            if (chatId != lastChat) {
              if (lastChat != 0) {
                await updateConfig();
              }
              lastChat = chatId;
            }
            await nextStep();
          } else {
            console.log("(" + currentStep + ")全部chat采集完毕");
            await close();
          }
        }
      } else {
        console.log("(" + currentStep + ")nextStep超出apiCount限制");
        await updateChat();
        //await endCache();
        //await insertCache();  //测试
      }
    }

    async function getCache() {
      // console.log("getCache");  //测试
      apiCount += 1;
      try {
        const cacheResult = await env.MAINDB.prepare("SELECT * FROM `CACHE` ORDER BY `Cindex` DESC LIMIT 1;").first();
        //console.log(cacheResult);  //测试
        if (cacheResult && cacheResult.hash) {
          if (cacheResult.chatId && cacheResult.chatId >= 0) {
            chatId = cacheResult.chatId;
          }
          if (cacheResult.hash) {
            cacheHashResult = JSON.parse(cacheResult.hash);
          }
        }
      } catch (e) {
        console.log("getCache出错 : " + e);
        await scheduler.wait(10000);
        await getCache();
      }
    }

    async function checkCache() {
      if (cacheHashResult) {
        if (filter === Api.InputMessagesFilterVideo || filter === Api.InputMessagesFilterPhotoVideo) {
          if (messageArray[messageIndex].media) {
            if (messageArray[messageIndex].media.document.id.toString() === cacheHashResult.id || messageArray[messageIndex].media.document.accessHash.toString() === cacheHashResult.accessHash) {
              hashResult = cacheHashResult;
              cacheHashResult = null;
              console.log("从(" + hashResult.length + " | " + hashResult.index + ")处继续");
            }
          }
        }
      }
    }

    //if (pathname.startsWith('/start/')) {
    if (pathname === "/start") {
      error = false;
      if (!client) {
        await open();
      }
      await getConfig();
      //await switchType();
      await getChat();
      if (fromPeer) {
        if (chatId != lastChat) {
          if (lastChat != 0) {
            await updateConfig();
          }
          lastChat = chatId;
        }
        await nextStep();
      } else {
        console.log("全部chat采集完毕");
        await close();
      }
    } else if (pathname === "/reconnect") {
      error = false;
      if (!client) {
        await open();
      }
      await getConfig();
      //await switchType();
      //console.log(fromPeer);  //测试
      // if (fromPeer) {
      //   if (hashResult.length && hashResult.length > 0) {
      //     console.log("继续获取下一个hash");
      //     await nextHash();
      //     await endMessage();
      //     //await endInsert();
      //     await end();
      //   } else if (messageLength > 0) {
      //     console.log("准备获取下一轮message");
      //     await checkCache();
      //     await nextMessage();
      //   } else {
      //     console.log("继续获取下一条message");
      //     await nextStep();
      //   }
      // } else {
      //   await getChat();
      //   if (fromPeer) {
      //     if (chatId != lastChat) {
      //       if (lastChat != 0) {
      //         await updateConfig();
      //       }
      //       lastChat = chatId;
      //     }
      //     await nextStep();
      //   } else {
      //     //console.log("全部chat采集完毕");
      //     await close();
      //   }
      // }
      if (filter === Api.InputMessagesFilterVideo || filter === Api.InputMessagesFilterPhotoVideo) {
        await getCache();
      }
      await getChat();
      if (fromPeer) {
        if (chatId != lastChat) {
          if (lastChat != 0) {
            await updateConfig();
          }
          lastChat = chatId;
        }
        currentStep += 1;
        const messageCount = await getMessage();
        messageLength = messageArray.length;
        if (messageLength > 0) {
          console.log("messageLength : " + messageLength);
          await checkCache();
          await nextMessage();
        } else if (messageCount > 0) {
          console.log("(" + currentStep + ")messageCount : " + messageCount);
          offsetId += limit;
          //messageIndex = 0;
          // hashResult = {
          //   "hash": [],
          //   "offset": 0,
          //   "index": 0,
          //   "limit": 0,
          // };
          //await updateChat();
          await nextStep();
        }
      } else {
        console.log("全部chat采集完毕");
        await close();
      }
    } else if (pathname === "/chat") {
      if (!client) {
        await open();
      }
      let count = 0;
      for await (const dialog of client.iterDialogs({})) {
        //console.log(dialog);  //测试
        const channelId = dialog.inputEntity.channelId.toString();
        //console.log("channelId : " + channelId);  //测试
        const accessHash = dialog.inputEntity.accessHash.toString();
        //console.log("accessHash : " + accessHash);  //测试
        if (channelId && accessHash) {
          const chatResult = await env.MAINDB.prepare("SELECT COUNT(id) FROM `CHAT` WHERE `channelId` = ? AND `accessHash` = ? LIMIT 1;").bind(channelId, accessHash).first();
          //console.log("chatResult : " + chatResult["COUNT(id)"]);  //测试
          if (chatResult && chatResult["COUNT(id)"] === 0) {
            const chatInfo = await env.MAINDB.prepare("INSERT INTO `CHAT` (channelId, accessHash, title, current, photo, video, document, gif, exist) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);").bind(channelId, accessHash, dialog.title, 0, 0, 0, 0, 0, 1).run();
            //console.log(chatInfo);  //测试
            if (chatInfo.success === true) {
              count += 1;
              console.log("插入chat数据成功");
            } else {
              console.log("插入chat数据失败");
            }
          // } else {
          //   console.log("chat已在数据库中");
          }
        } else {
          console.log("chat的channelId或accessHash错误");
        }
      }
      console.log("新插入了" + count + "条数据");
      await close();
    } else if (pathname === "/clear") {
      const cacheResult = await clearCache();
      if (cacheResult === true) {
        return new Response("删除cache成功");
      } else {
        return new Response("删除cache失败");
      }
    } else if (pathname === "/count") {
      const mediaResult = await countMedia();
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
