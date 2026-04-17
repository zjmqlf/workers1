const fs = require("fs");
const crypto = require("crypto");
//import { fs } from "fs";
//import { crypto } from "crypto";

let sqlInsert = "";
const fileName = "./sql/1.sql";
const accountId = "ac4c475ca3875ec3dea2d2306fde9c69";
const databaseId = "97d41e14-a9b6-45a9-b5cc-f60eb29acc02";
const d1ApiKey = "Vk_7LsZt_ZEwDMMU4tqHHaYghAApWQ8I5M5TV7x9";
const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/import`;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${d1ApiKey}`,
};

async function pollImport(bookmark) {
  while (true) {
    const pollResponse = await fetch(d1Url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "poll",
        current_bookmark: bookmark,
      }),
    });
    const { result } = await pollResponse.json();
    console.log("Poll Response:", result);  //测试
    const { success, error } = result;
    if (
      success ||
      (!success && error === "Not currently importing anything.")
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function uploadToD1() {
  const hashStr = crypto.createHash("md5").update(sqlInsert).digest("hex").toString();
  //console.log("hashStr : " + hashStr);  //测试
  try {
    const initResponse = await fetch(d1Url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "init",
        etag: hashStr,
      }),
    });
    //console.log(initResponse);  //测试
    const { result : uploadData } = await initResponse.json();
    //console.log(uploadData);  //测试
    const uploadUrl = uploadData.upload_url;
    //console.log("uploadUrl : " + uploadUrl);  //测试
    const filename = uploadData.filename;
    //console.log("filename : " + filename);  //测试
    if (uploadUrl && filename) {
      const r2Response = await fetch(uploadUrl, {
        method: "PUT",
        body: sqlInsert,
      });
      //console.log(r2Response);  //测试
      //console.log("ETag : " + r2Response.headers.get("ETag"));  //测试
      const r2Etag = r2Response.headers.get("ETag").replace(/"/g, "");
      //console.log("ETag : " + r2Etag);  //测试
      if (r2Etag === hashStr) {
        const ingestResponse = await fetch(d1Url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "ingest",
            etag: hashStr,
            filename,
          }),
        });
        //console.log(ingestResponse);  //测试
        const { result : ingestData } = await ingestResponse.json();
        console.log("ingestData : ", ingestData);  //测试
        if (ingestData.success) {
         console.log("at_bookmark : ", ingestData.at_bookmark);  //测试
          await pollImport(ingestData.at_bookmark);
          return "import成功";
        } else {
          console.log("status : ", ingestData,status);  //测试
          console.log("error : ", ingestData.error);  //测试
          return "import失败";
        }
      } else {
        console.log("ETag出错");
      }
    } else {
      console.log("uploadUrl或filename出错");
      return "import失败";
    }
  } catch (e) {
    console.log("error : ", e);
    return "import失败";
  }
}

async function importDB() {
  const exists = fs.existsSync(fileName);
  if (exists) {
    //sqlInsert = fs.readFileSync(fileName, "utf-8");
    sqlInsert = fs.readFileSync(fileName);
    //console.log("sqlInsert : " + sqlInsert);  //测试
    if (sqlInsert) {
      const result = await uploadToD1();
      console.log(result);
    } else {
      console.log("SQL文件内容有问题");
    }
  } else {
    console.log("SQL文件不存在");
  }
}

importDB();
