const fs = require("fs");
// import fs from "fs";

const showfilesbot = [];
const tgjmqbot = [];
const blgjlqbot = [];
const fileLeakBot = [];
const nnfilebot = [];
const parludecodingBot = [];
const teestpanbot = [];
const atfileslinksbot = [];
const lockHivebot = [];
const tgdecoderbot = [];
const ZYXFilesBot = [];
const ntmjmqbot = [];
const newjmqbot = [];
const filepanbot = [];
// const QQfilebot = [];
// const messengercode = [];
const myseseXBot = [];
const save2BoxBot = [];
const mtfxqbot = [];
const mtfxq2bot = [];
const mediaBK2Bot = [];
const mouseFilebot = [];
const dataPanBot = [];
const filesPan1Bot = [];
const showfilesbotRegexp = /(showfilesbot_\d*p*_*\d*v*_*\d*d*_[A-Za-z0-9]{20})/gi;   //showfilesbot
const showfiles3botRegexp = /(showfiles3bot_\d*p*_*\d*v*_*\d*d*_[A-Za-z0-9]{20})/gi;   //showfiles3bot
const tgjmq1botRegexp = /(tgjmq1bot_\d*p*\d*v*\d*d*_[A-Za-z0-9]{16})/gi;   //tgjmq1bot
const tgjmq3botRegexp = /(tgjmq3bot_\d*p*\d*v*\d*d*_[A-Za-z0-9]{16})/gi;   //tgjmq3bot
const tgjmq5botRegexp = /(tgjmq5bot_\d*p*\d*v*\d*d*_[A-Za-z0-9]{16})/gi;   //tgjmq5bot
const blgjlqbotRegexp = /(blgjlqbot_\d+p\d+v\d+d_[A-Za-z0-9]{16})/gi;   //blgjlqbot
const fileLeakBotRegexp = /(fileLeakBot_\d+p_\d+v_\d+d_[A-Za-z0-9]{13})/gi;   //fileLeakBot
const nnfilebotRegexp = /(nnfilebot_[A-Za-z0-9]*_[A-Za-z0-9]*_[A-Za-z0-9]*_[A-Za-z0-9]{12})/gi;   //nnfilebot
const parludecodingBotRegexp = /(ParludecodingBot_\d+p\d+v\d+d_[A-Za-z0-9]{16})/gi;   //parludecodingBot
const teestpanbotRegexp = /(@Teestpanbot:_\d*P*_*\d*V*_*\d*D*_[A-Za-z0-9]{12})/gi;   //teestpanbot
const atfileslinksbotRegexp = /(atfileslinksbot_\d*p*_*\d*v*_*\d*d*_[A-Za-z0-9]{20})/gi;   //atfileslinksbot
const lockHivebotRegexp = /(LockHivebot_[A-Za-z0-9]{16})/gi;   //lockHivebot
const tgdecoderbotRegexp = /(decoder_\d+p_\d+v_\d+d_[A-Za-z0-9]{12})/gi;   //tgdecoderbot
const ZYXFilesBotRegexp = /(📌 取件码：[A-Za-z0-9]+)/gi;   //ZYXFilesBot
const ntmjmqbotRegexp = /(ntmjmqbot_\d+p_\d+v_\d+d_[A-Za-z0-9]{13})/gi;   //ntmjmqbot
const newjmqbotRegexp = /(newjmqbot_\d+p_\d+v_\d+d_[A-Za-z0-9]{13})/gi;   //newjmqbot
const filepanbotRegexp = /(@filepan_bot:_\d*P*_*\d*V*_*\d*D*_[A-Za-z0-9]{12})/gi;   //filepanbot
const myseseXBotRegexp = /(myseseXBot_\d+p_\d+v_\d+d_[A-Za-z0-9]{13})/gi;   //myseseXBot
const save2BoxBotRegexp = /(Save2BoxBot_\d+p_\d+v_\d+d_[A-Za-z0-9]{13})/gi;   //save2BoxBot
const mtfxqbotRegexp = /(mtfxqbot_[0-9PVD_]*_[A-Za-z0-9]{20})/gi;   //mtfxqbot
const mtfxq2botRegexp = /(mtfxq2bot_[0-9PVD_]*_[A-Za-z0-9]{20})/gi;   //mtfxq2bot
const grpRegexp = /([A-Za-z0-9]{12}_[A-Za-z0-9]{11}=_grp)/gi;   //grp
const mdaRegexp = /([A-Za-z0-9-\+]*=_mda)/gi;   //mda
const v_Regexp = /(v_BAACAg[A-Za-z0-9_\-]*)/gi;   //v_
const vi_Regexp = /(vi_BAACAg[A-Za-z0-9_\-]*)/gi;   //vi_
const p_Regexp = /(p_AgACAg[A-Za-z0-9_\-]*)/gi;   //p_
const d_Regexp = /(d_BQACAg[A-Za-z0-9_\-]*)/gi;   //d_
const P_DataPanBotRegexp = /(P_DataPanBot_[A-Za-z0-9_\-]*)/gi;   //p_FilesPan1Bot
const V_DataPanBotRegexp = /(V_DataPanBot_[A-Za-z0-9_\-]*)/gi;   //v_FilesPan1Bot
const D_DataPanBotRegexp = /(D_DataPanBot_[A-Za-z0-9_\-]*)/gi;   //p_FilesPan1Bot
const p_FilesPan1BotRegexp = /(p_FilesPan1Bot_[A-Za-z0-9_\-]*)/gi;   //p_FilesPan1Bot
const v_FilesPan1BotRegexp = /(v_FilesPan1Bot_[A-Za-z0-9_\-]*)/gi;   //v_FilesPan1Bot
// const str = "炼铜基地原创媒体组分此条媒体分此条媒体分享newjmqbot_0p_32v_4d_uaBpSUCc8NAEd载下来慢慢看这个有人有更多吗结尾 [主要推";
let all = 0;
let data = [];
try {
  // data = fs.readFileSync("./source/ntmssqbot.txt", "utf-8");
  // data = fs.readFileSync("./source/ntmssqbot1.txt", "utf-8");
  // data = fs.readFileSync("./source/@YUYUYUYU.txt", "utf-8");
  // data = fs.readFileSync("./source/6.1-1.31.txt", "utf-8");
  // data = fs.readFileSync("./source/2.1-2.4.txt", "utf-8");
  // data = fs.readFileSync("./source/4月30.txt", "utf-8");
  // data = fs.readFileSync("./source/6.26爬楼收集.txt", "utf-8");
  // data = fs.readFileSync("./source/9.29.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.10.0002.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.10.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.11.0003.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.11.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.15.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.28.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.1.30.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.2.3.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.2.5.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.2.9.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.2.13.txt", "utf-8");
  // data = fs.readFileSync("./source/2025.2.14.txt", "utf-8");
  // data = fs.readFileSync("./source/20251.11.0002.txt", "utf-8");
  // data = fs.readFileSync("./source/20251.11.0002.txt", "utf-8");
  // data = fs.readFileSync("./source/codes_all.txt", "utf-8");
  // data = fs.readFileSync("./source/codes_all1.txt", "utf-8");
  // data = fs.readFileSync("./source/codes_all2.txt", "utf-8");
  // data = fs.readFileSync("./source/linkoutput1.txt", "utf-8");
  // data = fs.readFileSync("./source/MediaBK和sync的一些资源.txt", "utf-8");
  // data = fs.readFileSync("./source/output.txt", "utf-8");
  // data = fs.readFileSync("./source/summary.txt", "utf-8");
  // data = fs.readFileSync("./source/summary1.txt", "utf-8");
  // data = fs.readFileSync("./source/telegram_messages.txt", "utf-8");
  // data = fs.readFileSync("./source/telegram_messages (2).txt", "utf-8");
  // data = fs.readFileSync("./source/百丽宫-3.30.txt", "utf-8");
  // data = fs.readFileSync("./source/百丽宫5.26-5.31 所有代码.txt", "utf-8");
  // data = fs.readFileSync("./source/别人卖的代码合集.txt", "utf-8");
  // data = fs.readFileSync("./source/代码.txt", "utf-8");
  // data = fs.readFileSync("./source/代码1.txt", "utf-8");
  // data = fs.readFileSync("./source/代码合集1.txt", "utf-8");
  // data = fs.readFileSync("./source/代码合集2.txt", "utf-8");
  // data = fs.readFileSync("./source/各种资源.txt", "utf-8");
  // data = fs.readFileSync("./source/合集 (1).txt", "utf-8");
  // data = fs.readFileSync("./source/合集 (2).txt", "utf-8");
  // data = fs.readFileSync("./source/合集.txt", "utf-8");
  // data = fs.readFileSync("./source/a.txt", "utf-8");
  // data = fs.readFileSync("./source/精选资源合集 齐心协力·正能量 整理.txt", "utf-8");
  // data = fs.readFileSync("./source/精选资源合集.txt", "utf-8");
  // data = fs.readFileSync("./source/爬楼.txt", "utf-8");
  // data = fs.readFileSync("./source/爬楼结果.txt", "utf-8");
  // data = fs.readFileSync("./source/去重 (2).txt", "utf-8");
  // data = fs.readFileSync("./source/去重.txt", "utf-8");
  // data = fs.readFileSync("./source/去重代码合集.txt", "utf-8");
  // data = fs.readFileSync("./source/软件源码合集.txt", "utf-8");
  // data = fs.readFileSync("./source/投稿群2.txt", "utf-8");
  // data = fs.readFileSync("./source/文件代码合集.txt", "utf-8");
  // data = fs.readFileSync("./source/2月整合.txt", "utf-8");
  // data = fs.readFileSync("./source/3月整合.txt", "utf-8");
  // data = fs.readFileSync("./source/FilesDriveRobot.txt", "utf-8");
  // data = fs.readFileSync("./source/newjmqbot自整理资源3.0.txt", "utf-8");
  // data = fs.readFileSync("./source/newjmqbot自整理资源3.5.txt", "utf-8");
  // data = fs.readFileSync("./source/代码合集去重2 java10.txt", "utf-8");
  // data = fs.readFileSync("./source/ntmssqbot2.txt", "utf-8");
  // data = fs.readFileSync("./source/文件码总结1761491151718.txt", "utf-8");
  // data = fs.readFileSync("./source/新.txt", "utf-8");
  // data = fs.readFileSync("./source/新2.txt", "utf-8");
  // data = fs.readFileSync("./source/一万个代码，采集的.txt", "utf-8");
  // data = fs.readFileSync("./source/正能量代码.txt", "utf-8");
  // data = fs.readFileSync("./source/正能量基地-3.29.txt", "utf-8");
  // data = fs.readFileSync("./source/新建文本文档.txt", "utf-8");
  // data = fs.readFileSync("./source/资源 (2).txt", "utf-8");
  // data = fs.readFileSync("./source/资源 (3).txt", "utf-8");
  // data = fs.readFileSync("./source/4.26更新资源.txt", "utf-8");
  // data = fs.readFileSync("./source/资源.txt", "utf-8");
  // data = fs.readFileSync("./source/资源1.txt", "utf-8");
  // data = fs.readFileSync("./source/5.txt", "utf-8");
  // data = fs.readFileSync("./source/7.txt", "utf-8");
  // data = fs.readFileSync("./source/bgyc.txt", "utf-8");
  // data = fs.readFileSync("./source/cha.txt", "utf-8");
  // data = fs.readFileSync("./source/douyin.txt", "utf-8");
  // data = fs.readFileSync("./source/luoli3.txt", "utf-8");
  // data = fs.readFileSync("./source/luoli4.txt", "utf-8");
  // data = fs.readFileSync("./source/luoli6.txt", "utf-8");
  // data = fs.readFileSync("./source/telegram_消息.txt", "utf-8");
  // data = fs.readFileSync("./source/xiao马.txt", "utf-8");
  // data = fs.readFileSync("./source/白丝.txt", "utf-8");
  // data = fs.readFileSync("./source/处中.txt", "utf-8");
  // data = fs.readFileSync("./source/二院.txt", "utf-8");
  // data = fs.readFileSync("./source/高中.txt", "utf-8");
  // data = fs.readFileSync("./source/集合.txt", "utf-8");
  // data = fs.readFileSync("./source/快手.txt", "utf-8");
  // data = fs.readFileSync("./source/乱伦.txt", "utf-8");
  // data = fs.readFileSync("./source/萝莉1.txt", "utf-8");
  // data = fs.readFileSync("./source/萝莉2.txt", "utf-8");
  // data = fs.readFileSync("./source/萝莉5.txt", "utf-8");
  // data = fs.readFileSync("./source/哪吒头.txt", "utf-8");
  // data = fs.readFileSync("./source/去衣.txt", "utf-8");
  // data = fs.readFileSync("./source/日本.txt", "utf-8");
  // data = fs.readFileSync("./source/射.txt", "utf-8");
  // data = fs.readFileSync("./source/偷拍.txt", "utf-8");
  // data = fs.readFileSync("./source/我从一堆东西里翻出来的代码整合（4w＋）原名：output.txt", "utf-8");
  // data = fs.readFileSync("./source/舞蹈.txt", "utf-8");
  // data = fs.readFileSync("./source/新3.txt", "utf-8");
  // data = fs.readFileSync("./source/新4.txt", "utf-8");
  // data = fs.readFileSync("./source/新5.txt", "utf-8");
  // data = fs.readFileSync("./source/呦钕.txt", "utf-8");
  // data = fs.readFileSync("./source/新建文本文档 (2).txt", "utf-8");
  // data = fs.readFileSync("./source/整合【教程，代码都在里面】.txt", "utf-8");
  // data = fs.readFileSync("./source/正太.txt", "utf-8");
  // data = fs.readFileSync("./source/种资源.txt", "utf-8");
  // data = fs.readFileSync("./source/资源10.txt", "utf-8");
  // data = fs.readFileSync("./source/足.txt", "utf-8");
  // data = fs.readFileSync("./source/1.txt", "utf-8");
  data = fs.readFileSync("./source/messages.html", "utf-8");
  const array = data.split("\n");
  const length = array.length;
  console.log("length : " + length);  //测试
  if (length > 1) {
    for (let i = 0; i < length; i++) {
      const str = array[i].trim();
      // console.log("str : " + str);  //测试
      if (str) {
        const showfilesbotMatches = str.match(showfilesbotRegexp);
        // console.log(showfilesbotMatches);  //测试
        if (showfilesbotMatches) {
          const showfilesbotMatchesLength = showfilesbotMatches.length;
          // console.log("showfilesbotMatchesLength : " + showfilesbotMatchesLength);  //测试
          if (showfilesbotMatchesLength > 0) {
            for (let j = 0; j < showfilesbotMatchesLength; j++) {
              if (showfilesbotMatches[j]) {
                showfilesbot.push(showfilesbotMatches[j]);
              }
            }
          }
        }

        const showfiles3botMatches = str.match(showfiles3botRegexp);
        // console.log(showfiles3botMatches);  //测试
        if (showfiles3botMatches) {
          const showfiles3botMatchesLength = showfiles3botMatches.length;
          // console.log("showfiles3botMatchesLength : " + showfiles3botMatchesLength);  //测试
          if (showfiles3botMatchesLength > 0) {
            for (let j = 0; j < showfiles3botMatchesLength; j++) {
              if (showfiles3botMatches[j]) {
                showfilesbot.push(showfiles3botMatches[j]);
              }
            }
          }
        }

        const tgjmq1botMatches = str.match(tgjmq1botRegexp);
        // console.log(tgjmq1botMatches);  //测试
        if (tgjmq1botMatches) {
          const tgjmq1botMatchesLength = tgjmq1botMatches.length;
          // console.log("tgjmq1botMatchesLength : " + tgjmq1botMatchesLength);  //测试
          if (tgjmq1botMatchesLength > 0) {
            for (let j = 0; j < tgjmq1botMatchesLength; j++) {
              if (tgjmq1botMatches[j]) {
                tgjmqbot.push(tgjmq1botMatches[j]);
              }
            }
          }
        }

        const tgjmq3botMatches = str.match(tgjmq3botRegexp);
        // console.log(tgjmq3botMatches);  //测试
        if (tgjmq3botMatches) {
          const tgjmq3botMatchesLength = tgjmq3botMatches.length;
          // console.log("tgjmq3botMatchesLength : " + tgjmq3botMatchesLength);  //测试
          if (tgjmq3botMatchesLength > 0) {
            for (let j = 0; j < tgjmq3botMatchesLength; j++) {
              if (tgjmq3botMatches[j]) {
                tgjmqbot.push(tgjmq3botMatches[j]);
              }
            }
          }
        }

        const tgjmq5botMatches = str.match(tgjmq5botRegexp);
        // console.log(tgjmq5botMatches);  //测试
        if (tgjmq5botMatches) {
          const tgjmq5botMatchesLength = tgjmq5botMatches.length;
          // console.log("tgjmq5botMatchesLength : " + tgjmq5botMatchesLength);  //测试
          if (tgjmq5botMatchesLength > 0) {
            for (let j = 0; j < tgjmq5botMatchesLength; j++) {
              if (tgjmq5botMatches[j]) {
                tgjmqbot.push(tgjmq5botMatches[j]);
              }
            }
          }
        }

        const blgjlqbotMatches = str.match(blgjlqbotRegexp);
        // console.log(blgjlqbotMatches);  //测试
        if (blgjlqbotMatches) {
          const blgjlqbotMatchesLength = blgjlqbotMatches.length;
          // console.log("blgjlqbotMatchesLength : " + blgjlqbotMatchesLength);  //测试
          if (blgjlqbotMatchesLength > 0) {
            for (let j = 0; j < blgjlqbotMatchesLength; j++) {
              if (blgjlqbotMatches[j]) {
                blgjlqbot.push(blgjlqbotMatches[j]);
              }
            }
          }
        }

        const fileLeakBotMatches = str.match(fileLeakBotRegexp);
        // console.log(fileLeakBotMatches);  //测试
        if (fileLeakBotMatches) {
          const fileLeakBotMatchesLength = fileLeakBotMatches.length;
          // console.log("fileLeakBotMatchesLength : " + fileLeakBotMatchesLength);  //测试
          if (fileLeakBotMatchesLength > 0) {
            for (let j = 0; j < fileLeakBotMatchesLength; j++) {
              if (fileLeakBotMatches[j]) {
                fileLeakBot.push(fileLeakBotMatches[j]);
              }
            }
          }
        }

        const nnfilebotMatches = str.match(nnfilebotRegexp);
        // console.log(nnfilebotMatches);  //测试
        if (nnfilebotMatches) {
          const nnfilebotMatchesLength = nnfilebotMatches.length;
          // console.log("nnfilebotMatchesLength : " + nnfilebotMatchesLength);  //测试
          if (nnfilebotMatchesLength > 0) {
            for (let j = 0; j < nnfilebotMatchesLength; j++) {
              if (nnfilebotMatches[j]) {
                nnfilebot.push(nnfilebotMatches[j]);
              }
            }
          }
        }

        const parludecodingBotMatches = str.match(parludecodingBotRegexp);
        // console.log(parludecodingBotMatches);  //测试
        if (parludecodingBotMatches) {
          const parludecodingBotMatchesLength = parludecodingBotMatches.length;
          // console.log("parludecodingBotMatchesLength : " + parludecodingBotMatchesLength);  //测试
          if (parludecodingBotMatchesLength > 0) {
            for (let j = 0; j < parludecodingBotMatchesLength; j++) {
              if (parludecodingBotMatches[j]) {
                parludecodingBot.push(parludecodingBotMatches[j]);
              }
            }
          }
        }

        const teestpanbotMatches = str.match(teestpanbotRegexp);
        // console.log(teestpanbotMatches);  //测试
        if (teestpanbotMatches) {
          const teestpanbotMatchesLength = teestpanbotMatches.length;
          // console.log("teestpanbotMatchesLength : " + teestpanbotMatchesLength);  //测试
          if (teestpanbotMatchesLength > 0) {
            for (let j = 0; j < teestpanbotMatchesLength; j++) {
              if (teestpanbotMatches[j]) {
                teestpanbot.push(teestpanbotMatches[j]);
              }
            }
          }
        }

        const atfileslinksbotMatches = str.match(atfileslinksbotRegexp);
        // console.log(atfileslinksbotMatches);  //测试
        if (atfileslinksbotMatches) {
          const atfileslinksbotMatchesLength = atfileslinksbotMatches.length;
          // console.log("atfileslinksbotMatchesLength : " + atfileslinksbotMatchesLength);  //测试
          if (atfileslinksbotMatchesLength > 0) {
            for (let j = 0; j < atfileslinksbotMatchesLength; j++) {
              if (atfileslinksbotMatches[j]) {
                atfileslinksbot.push(atfileslinksbotMatches[j]);
              }
            }
          }
        }

        const lockHivebotMatches = str.match(lockHivebotRegexp);
        // console.log(lockHivebotMatches);  //测试
        if (lockHivebotMatches) {
          const lockHivebotMatchesLength = lockHivebotMatches.length;
          // console.log("lockHivebotMatchesLength : " + lockHivebotMatchesLength);  //测试
          if (lockHivebotMatchesLength > 0) {
            for (let j = 0; j < lockHivebotMatchesLength; j++) {
              if (lockHivebotMatches[j]) {
                lockHivebot.push(lockHivebotMatches[j]);
              }
            }
          }
        }

        const tgdecoderbotMatches = str.match(tgdecoderbotRegexp);
        // console.log(tgdecoderbotMatches);  //测试
        if (tgdecoderbotMatches) {
          const tgdecoderbotMatchesLength = tgdecoderbotMatches.length;
          // console.log("tgdecoderbotMatchesLength : " + tgdecoderbotMatchesLength);  //测试
          if (tgdecoderbotMatchesLength > 0) {
            for (let j = 0; j < tgdecoderbotMatchesLength; j++) {
              if (tgdecoderbotMatches[j]) {
                tgdecoderbot.push(tgdecoderbotMatches[j]);
              }
            }
          }
        }

        const ZYXFilesBotMatches = str.match(ZYXFilesBotRegexp);
        // console.log(ZYXFilesBotMatches);  //测试
        if (ZYXFilesBotMatches) {
          const ZYXFilesBotMatchesLength = ZYXFilesBotMatches.length;
          // console.log("ZYXFilesBotMatchesLength : " + ZYXFilesBotMatchesLength);  //测试
          if (ZYXFilesBotMatchesLength > 0) {
            for (let j = 0; j < ZYXFilesBotMatchesLength; j++) {
              if (ZYXFilesBotMatches[j]) {
                ZYXFilesBot.push(ZYXFilesBotMatches[j]);
              }
            }
          }
        }

        const ntmjmqbotMatches = str.match(ntmjmqbotRegexp);
        // console.log(ntmjmqbotMatches);  //测试
        if (ntmjmqbotMatches) {
          const ntmjmqbotMatchesLength = ntmjmqbotMatches.length;
          // console.log("ntmjmqbotMatchesLength : " + ntmjmqbotMatchesLength);  //测试
          if (ntmjmqbotMatchesLength > 0) {
            for (let j = 0; j < ntmjmqbotMatchesLength; j++) {
              if (ntmjmqbotMatches[j]) {
                ntmjmqbot.push(ntmjmqbotMatches[j]);
              }
            }
          }
        }

        const newjmqbotMatches = str.match(newjmqbotRegexp);
        // console.log(newjmqbotMatches);  //测试
        if (newjmqbotMatches) {
          const newjmqbotMatchesLength = newjmqbotMatches.length;
          // console.log("newjmqbotMatchesLength : " + newjmqbotMatchesLength);  //测试
          if (newjmqbotMatchesLength > 0) {
            for (let j = 0; j < newjmqbotMatchesLength; j++) {
              if (newjmqbotMatches[j]) {
                newjmqbot.push(newjmqbotMatches[j]);
              }
            }
          }
        }

        const filepanbotMatches = str.match(filepanbotRegexp);
        // console.log(filepanbotMatches);  //测试
        if (filepanbotMatches) {
          const filepanbotMatchesLength = filepanbotMatches.length;
          // console.log("filepanbotMatchesLength : " + filepanbotMatchesLength);  //测试
          if (filepanbotMatchesLength > 0) {
            for (let j = 0; j < filepanbotMatchesLength; j++) {
              if (filepanbotMatches[j]) {
                filepanbot.push(filepanbotMatches[j]);
              }
            }
          }
        }

        const myseseXBotMatches = str.match(myseseXBotRegexp);
        // console.log(myseseXBotMatches);  //测试
        if (myseseXBotMatches) {
          const myseseXBotMatchesLength = myseseXBotMatches.length;
          // console.log("myseseXBotMatchesLength : " + myseseXBotMatchesLength);  //测试
          if (myseseXBotMatchesLength > 0) {
            for (let j = 0; j < myseseXBotMatchesLength; j++) {
              if (myseseXBotMatches[j]) {
                myseseXBot.push(myseseXBotMatches[j]);
              }
            }
          }
        }

        const save2BoxBotMatches = str.match(save2BoxBotRegexp);
        // console.log(save2BoxBotMatches);  //测试
        if (save2BoxBotMatches) {
          const save2BoxBotMatchesLength = save2BoxBotMatches.length;
          // console.log("save2BoxBotMatchesLength : " + save2BoxBotMatchesLength);  //测试
          if (save2BoxBotMatchesLength > 0) {
            for (let j = 0; j < save2BoxBotMatchesLength; j++) {
              if (save2BoxBotMatches[j]) {
                save2BoxBot.push(save2BoxBotMatches[j]);
              }
            }
          }
        }

        const mtfxqbotMatches = str.match(mtfxqbotRegexp);
        // console.log(mtfxqbotMatches);  //测试
        if (mtfxqbotMatches) {
          const mtfxqbotMatchesLength = mtfxqbotMatches.length;
          // console.log("mtfxqbotMatchesLength : " + mtfxqbotMatchesLength);  //测试
          if (mtfxqbotMatchesLength > 0) {
            for (let j = 0; j < mtfxqbotMatchesLength; j++) {
              if (mtfxqbotMatches[j]) {
                mtfxqbot.push(mtfxqbotMatches[j]);
              }
            }
          }
        }

        const mtfxq2botMatches = str.match(mtfxq2botRegexp);
        // console.log(mtfxq2botMatches);  //测试
        if (mtfxq2botMatches) {
          const mtfxq2botMatchesLength = mtfxq2botMatches.length;
          // console.log("mtfxq2botMatchesLength : " + mtfxq2botMatchesLength);  //测试
          if (mtfxq2botMatchesLength > 0) {
            for (let j = 0; j < mtfxq2botMatchesLength; j++) {
              if (mtfxq2botMatches[j]) {
                mtfxq2bot.push(mtfxq2botMatches[j]);
              }
            }
          }
        }

        const grpMatches = str.match(grpRegexp);
        // console.log(grpMatches);  //测试
        if (grpMatches) {
          const grpMatchesLength = grpMatches.length;
          // console.log("grpMatchesLength : " + grpMatchesLength);  //测试
          if (grpMatchesLength > 0) {
            for (let j = 0; j < grpMatchesLength; j++) {
              if (grpMatches[j]) {
                mediaBK2Bot.push(grpMatches[j]);
              }
            }
          }
        }

        const mdaMatches = str.match(mdaRegexp);
        // console.log(mdaMatches);  //测试
        if (mdaMatches) {
          const mdaMatchesLength = mdaMatches.length;
          // console.log("mdaMatchesLength : " + mdaMatchesLength);  //测试
          if (mdaMatchesLength > 0) {
            for (let j = 0; j < mdaMatchesLength; j++) {
              if (mdaMatches[j]) {
                mediaBK2Bot.push(mdaMatches[j]);
              }
            }
          }
        }

        const v_Matches = str.match(v_Regexp);
        // console.log(v_Matches);  //测试
        if (v_Matches) {
          const v_MatchesLength = v_Matches.length;
          // console.log("v_MatchesLength : " + v_MatchesLength);  //测试
          if (v_MatchesLength > 0) {
            for (let j = 0; j < v_MatchesLength; j++) {
              if (v_Matches[j]) {
                mouseFilebot.push(v_Matches[j]);
              }
            }
          }
        }

        const vi_Matches = str.match(vi_Regexp);
        // console.log(vi_Matches);  //测试
        if (vi_Matches) {
          const vi_MatchesLength = vi_Matches.length;
          // console.log("vi_MatchesLength : " + vi_MatchesLength);  //测试
          if (vi_MatchesLength > 0) {
            for (let j = 0; j < vi_MatchesLength; j++) {
              if (vi_Matches[j]) {
                mouseFilebot.push(vi_Matches[j]);
              }
            }
          }
        }

        const p_Matches = str.match(p_Regexp);
        // console.log(p_Matches);  //测试
        if (p_Matches) {
          const p_MatchesLength = p_Matches.length;
          // console.log("p_MatchesLength : " + p_MatchesLength);  //测试
          if (p_MatchesLength > 0) {
            for (let j = 0; j < p_MatchesLength; j++) {
              if (p_Matches[j]) {
                mouseFilebot.push(p_Matches[j]);
              }
            }
          }
        }

        const d_Matches = str.match(d_Regexp);
        // console.log(d_Matches);  //测试
        if (d_Matches) {
          const d_MatchesLength = d_Matches.length;
          // console.log("d_MatchesLength : " + d_MatchesLength);  //测试
          if (d_MatchesLength > 0) {
            for (let j = 0; j < d_MatchesLength; j++) {
              if (d_Matches[j]) {
                mouseFilebot.push(d_Matches[j]);
              }
            }
          }
        }

        const P_DataPanBotMatches = str.match(P_DataPanBotRegexp);
        // console.log(P_DataPanBotMatches);  //测试
        if (P_DataPanBotMatches) {
          const P_DataPanBotMatchesLength = P_DataPanBotMatches.length;
          // console.log("P_DataPanBotMatchesLength : " + P_DataPanBotMatchesLength);  //测试
          if (P_DataPanBotMatchesLength > 0) {
            for (let j = 0; j < P_DataPanBotMatchesLength; j++) {
              if (P_DataPanBotMatches[j]) {
                dataPanBot.push(P_DataPanBotMatches[j]);
              }
            }
          }
        }

        const V_DataPanBotMatches = str.match(V_DataPanBotRegexp);
        // console.log(V_DataPanBotMatches);  //测试
        if (V_DataPanBotMatches) {
          const V_DataPanBotMatchesLength = V_DataPanBotMatches.length;
          // console.log("V_DataPanBotMatchesLength : " + V_DataPanBotMatchesLength);  //测试
          if (V_DataPanBotMatchesLength > 0) {
            for (let j = 0; j < V_DataPanBotMatchesLength; j++) {
              if (V_DataPanBotMatches[j]) {
                dataPanBot.push(V_DataPanBotMatches[j]);
              }
            }
          }
        }

        const D_DataPanBotMatches = str.match(D_DataPanBotRegexp);
        // console.log(D_DataPanBotMatches);  //测试
        if (D_DataPanBotMatches) {
          const D_DataPanBotMatchesLength = D_DataPanBotMatches.length;
          // console.log("D_DataPanBotMatchesLength : " + D_DataPanBotMatchesLength);  //测试
          if (D_DataPanBotMatchesLength > 0) {
            for (let j = 0; j < D_DataPanBotMatchesLength; j++) {
              if (D_DataPanBotMatches[j]) {
                dataPanBot.push(D_DataPanBotMatches[j]);
              }
            }
          }
        }

        const p_FilesPan1BotMatches = str.match(p_FilesPan1BotRegexp);
        // console.log(p_FilesPan1BotMatches);  //测试
        if (p_FilesPan1BotMatches) {
          const p_FilesPan1BotMatchesLength = p_FilesPan1BotMatches.length;
          // console.log("p_FilesPan1BotMatchesLength : " + p_FilesPan1BotMatchesLength);  //测试
          if (p_FilesPan1BotMatchesLength > 0) {
            for (let j = 0; j < p_FilesPan1BotMatchesLength; j++) {
              if (p_FilesPan1BotMatches[j]) {
                filesPan1Bot.push(p_FilesPan1BotMatches[j]);
              }
            }
          }
        }

        const v_FilesPan1BotMatches = str.match(v_FilesPan1BotRegexp);
        // console.log(v_FilesPan1BotMatches);  //测试
        if (v_FilesPan1BotMatches) {
          const v_FilesPan1BotMatchesLength = v_FilesPan1BotMatches.length;
          // console.log("v_FilesPan1BotMatchesLength : " + v_FilesPan1BotMatchesLength);  //测试
          if (v_FilesPan1BotMatchesLength > 0) {
            for (let j = 0; j < v_FilesPan1BotMatchesLength; j++) {
              if (v_FilesPan1BotMatches[j]) {
                filesPan1Bot.push(v_FilesPan1BotMatches[j]);
              }
            }
          }
        }

        // break;  //测试
      }
    }
  } else {
    console.log("split错误");
  }

  all += showfilesbot.length;
  console.log("showfilesbot : " + showfilesbot.length);  //测试
  if (showfilesbot.length > 0) {
    const data = fs.readFileSync("./code/showfilesbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...showfilesbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/showfilesbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += tgjmqbot.length;
  console.log("tgjmqbot : " + tgjmqbot.length);  //测试
  if (tgjmqbot.length > 0) {
    const data = fs.readFileSync("./code/tgjmqbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...tgjmqbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/tgjmqbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += blgjlqbot.length;
  console.log("blgjlqbot : " + blgjlqbot.length);  //测试
  if (blgjlqbot.length > 0) {
    const data = fs.readFileSync("./code/blgjlqbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...blgjlqbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/blgjlqbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += fileLeakBot.length;
  console.log("fileLeakBot : " + fileLeakBot.length);  //测试
  if (fileLeakBot.length > 0) {
    const data = fs.readFileSync("./code/fileLeakBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...fileLeakBot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/fileLeakBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += nnfilebot.length;
  console.log("nnfilebot : " + nnfilebot.length);  //测试
  if (nnfilebot.length > 0) {
    const data = fs.readFileSync("./code/nnfilebot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...nnfilebot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/nnfilebot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += parludecodingBot.length;
  console.log("parludecodingBot : " + parludecodingBot.length);  //测试
  if (parludecodingBot.length > 0) {
    const data = fs.readFileSync("./code/parludecodingBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...parludecodingBot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/parludecodingBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += teestpanbot.length;
  console.log("teestpanbot : " + teestpanbot.length);  //测试
  if (teestpanbot.length > 0) {
    const data = fs.readFileSync("./code/teestpanbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...teestpanbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/teestpanbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += atfileslinksbot.length;
  console.log("atfileslinksbot : " + atfileslinksbot.length);  //测试
  if (atfileslinksbot.length > 0) {
    const data = fs.readFileSync("./code/atfileslinksbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...atfileslinksbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/atfileslinksbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += lockHivebot.length;
  console.log("lockHivebot : " + lockHivebot.length);  //测试
  if (lockHivebot.length > 0) {
    const data = fs.readFileSync("./code/lockHivebot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...lockHivebot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/lockHivebot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += tgdecoderbot.length;
  console.log("tgdecoderbot : " + tgdecoderbot.length);  //测试
  if (tgdecoderbot.length > 0) {
    const data = fs.readFileSync("./code/tgdecoderbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...tgdecoderbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/tgdecoderbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += ZYXFilesBot.length;
  console.log("ZYXFilesBot : " + ZYXFilesBot.length);  //测试
  if (ZYXFilesBot.length > 0) {
    const data = fs.readFileSync("./code/ZYXFilesBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...ZYXFilesBot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/ZYXFilesBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += ntmjmqbot.length;
  console.log("ntmjmqbot : " + ntmjmqbot.length);  //测试
  if (ntmjmqbot.length > 0) {
    const data = fs.readFileSync("./code/ntmjmqbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...ntmjmqbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/ntmjmqbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += newjmqbot.length;
  console.log("newjmqbot : " + newjmqbot.length);  //测试
  if (newjmqbot.length > 0) {
    const data = fs.readFileSync("./code/newjmqbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...newjmqbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/newjmqbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += filepanbot.length;
  console.log("filepanbot : " + filepanbot.length);  //测试
  if (filepanbot.length > 0) {
    const data = fs.readFileSync("./code/filepanbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...filepanbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/filepanbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += myseseXBot.length;
  console.log("myseseXBot : " + myseseXBot.length);  //测试
  if (myseseXBot.length > 0) {
    const data = fs.readFileSync("./code/myseseXBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...myseseXBot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/myseseXBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += save2BoxBot.length;
  console.log("save2BoxBot : " + save2BoxBot.length);  //测试
  if (save2BoxBot.length > 0) {
    const data = fs.readFileSync("./code/save2BoxBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...save2BoxBot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/save2BoxBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += mtfxqbot.length;
  console.log("mtfxqbot : " + mtfxqbot.length);  //测试
  if (mtfxqbot.length > 0) {
    const data = fs.readFileSync("./code/mtfxqbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...mtfxqbot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/mtfxqbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += mtfxq2bot.length;
  console.log("mtfxq2bot : " + mtfxq2bot.length);  //测试
  if (mtfxq2bot.length > 0) {
    const data = fs.readFileSync("./code/mtfxq2bot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...mtfxq2bot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/mtfxq2bot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += mediaBK2Bot.length;
  console.log("mediaBK2Bot : " + mediaBK2Bot.length);  //测试
  if (mediaBK2Bot.length > 0) {
    const data = fs.readFileSync("./code/mediaBK2Bot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...mediaBK2Bot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/mediaBK2Bot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += mouseFilebot.length;
  console.log("mouseFilebot : " + mouseFilebot.length);  //测试
  if (mouseFilebot.length > 0) {
    const data = fs.readFileSync("./code/mouseFilebot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...mouseFilebot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/mouseFilebot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += dataPanBot.length;
  console.log("dataPanBot : " + dataPanBot.length);  //测试
  if (dataPanBot.length > 0) {
    const data = fs.readFileSync("./code/dataPanBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...dataPanBot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/dataPanBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  all += filesPan1Bot.length;
  console.log("filesPan1Bot : " + filesPan1Bot.length);  //测试
  if (filesPan1Bot.length > 0) {
    const data = fs.readFileSync("./code/filesPan1Bot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      const oldLength = uniqueArr.length;
      uniqueArr = [...uniqueArr, ...filesPan1Bot];
      uniqueArr = [...new Set(uniqueArr)];
      if (uniqueArr.length > oldLength) {
        fs.writeFile("./code/filesPan1Bot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
          if (err) {
            console.log(err);
          }
        });
      // } else {
      //   console.log("没有新加数据");
      }
    } catch (e) {
      console.log(e);
    }
  }

  console.log("all : " + all);  //测试
} catch (e) {
  console.log(e);
}


//console.log(sha2Result);

