const fs = require("fs");
// import fs from "fs";

const ntmjmqbot = [];
const showfilesbot = [];
const mediaBK2Bot = [];
const mouseFilebot = [];
const dataPanBot = [];
const filesPan1Bot = [];
const ntmjmqbotRegexp = /(ntmjmqbot_\d+p_\d+v_\d+d_[A-Za-z0-9]{13})/gi;   //ntmjmqbot
const showfilesbotRegexp = /(showfilesbot_\d*p*_*\d*v*_*\d*d*_[A-Za-z0-9]{20})/gi;   //showfilesbot
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
// const str = "炼铜基地原创媒体组分此条媒体分此条媒体分享link: vid+vzvd6B8vvTd3FtY+y88B6w8AApA=_mda载下来慢慢看这个有人有更多吗结尾 [主要推";
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
  data = fs.readFileSync("./source/文件代码合集.txt", "utf-8");
  const array = data.split("\n");
  const length = array.length;
  console.log("length : " + length);  //测试
  if (length > 1) {
    for (let i = 0; i < length; i++) {
      const str = array[i].trim();
      // console.log("str : " + str);  //测试
      if (str) {
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

  console.log("ntmjmqbot : " + ntmjmqbot.length);  //测试
  if (ntmjmqbot.length > 0) {
    const data = fs.readFileSync("./code/ntmjmqbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      uniqueArr = [...uniqueArr, ...ntmjmqbot];
      uniqueArr = [...new Set(uniqueArr)];
      fs.writeFile("./code/ntmjmqbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
        if (err) {
          console.log(err);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  console.log("showfilesbot : " + showfilesbot.length);  //测试
  if (showfilesbot.length > 0) {
    const data = fs.readFileSync("./code/showfilesbot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      uniqueArr = [...uniqueArr, ...showfilesbot];
      uniqueArr = [...new Set(uniqueArr)];
      fs.writeFile("./code/showfilesbot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
        if (err) {
          console.log(err);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  console.log("mediaBK2Bot : " + mediaBK2Bot.length);  //测试
  if (mediaBK2Bot.length > 0) {
    const data = fs.readFileSync("./code/mediaBK2Bot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      uniqueArr = [...uniqueArr, ...mediaBK2Bot];
      uniqueArr = [...new Set(uniqueArr)];
      fs.writeFile("./code/mediaBK2Bot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
        if (err) {
          console.log(err);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  console.log("mouseFilebot : " + mouseFilebot.length);  //测试
  if (mouseFilebot.length > 0) {
    const data = fs.readFileSync("./code/mouseFilebot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      uniqueArr = [...uniqueArr, ...mouseFilebot];
      uniqueArr = [...new Set(uniqueArr)];
      fs.writeFile("./code/mouseFilebot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
        if (err) {
          console.log(err);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  console.log("dataPanBot : " + dataPanBot.length);  //测试
  if (dataPanBot.length > 0) {
    const data = fs.readFileSync("./code/dataPanBot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      uniqueArr = [...uniqueArr, ...dataPanBot];
      uniqueArr = [...new Set(uniqueArr)];
      fs.writeFile("./code/dataPanBot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
        if (err) {
          console.log(err);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }

  console.log("filesPan1Bot : " + filesPan1Bot.length);  //测试
  if (filesPan1Bot.length > 0) {
    const data = fs.readFileSync("./code/filesPan1Bot.txt", "utf-8");
    try {
      let uniqueArr = JSON.parse(data);
      uniqueArr = [...uniqueArr, ...filesPan1Bot];
      uniqueArr = [...new Set(uniqueArr)];
      fs.writeFile("./code/filesPan1Bot.txt", JSON.stringify(uniqueArr, null, 2), function(err) {
        if (err) {
          console.log(err);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }
} catch (e) {
  console.log(e);
}


//console.log(sha2Result);

