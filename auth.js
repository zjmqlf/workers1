// const inquirer = require('inquirer')
import inquirer from 'inquirer';
// const { EOL } = require('os')
import { EOL } from 'os';
// const { writeFileSync } = require('fs')
import { writeFileSync } from 'fs';
// const fetch = require('node-fetch')
import * as fetch from 'node-fetch';
// const path = require('path')
import * as path from 'path';

const headers = {
  'content-type': 'application/x-www-form-urlencoded',
}

// Prompt and acquire code, returns credentials
async function init() {
  let questions = [
    {
      type: 'input',
      name: 'client_id',
      message: 'client_id:',
    },
    {
      type: 'input',
      name: 'client_secret',
      message: 'client_secret:',
    },
  ]

  let res = await inquirer.prompt(questions)

  const {
    client_id,
    client_secret,
  } = res

  const auth_endpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0'

  questions = [
    {
      type: 'input',
      name: 'code',
      message: `登录地址:\n${auth_endpoint}/authorize?${
        new URLSearchParams({
          client_id,
          scope: 'Files.Read.All Files.ReadWrite.All offline_access',
          response_type: 'code',
        }).toString()
      }&redirect_uri=http://localhost\n请输入浏览器访问后重定向的地址:\n`,
    },
  ]

  res = await inquirer.prompt(questions)
  const code = new URL(res.code).searchParams.get('code')
  const credentials = {
    code,
    client_id,
    client_secret,
    auth_endpoint,
  }

  return credentials
}

// Acquire token with credentials, then output it
async function acquireToken(credentials) {
  try {
    const {
      code,
      client_id,
      client_secret,
      auth_endpoint,
    } = credentials

    const res = await fetch(`${auth_endpoint}/token`, {
      method: 'POST',
      body: `${
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id,
          client_secret,
        }).toString()
      }&redirect_uri=http://localhost`,
      headers,
    })
    if (res.ok) {
      const data = await res.json()
      credentials.refresh_token = data.refresh_token
      credentials.access_token = data.access_token
    }
  } catch (e) {
    console.warn(e)
  }
  return credentials
}

async function getDriveApi(credentials) {
  const { access_token } = credentials
  const graphApi = 'https://graph.microsoft.com/v1.0'
  credentials.drive_api = `${graphApi}/me/drive`
}

function delKey(credentials) {
  delete credentials.code
  delete credentials.access_token
}

;(async () => {
  const credentials = await acquireToken(await init())
  await getDriveApi(credentials)
  delKey(credentials)
  writeFileSync(
    path.resolve('./.env'),
    Object.keys(credentials).reduce((env, e) => {
      return `${env}${e} = ${credentials[e]}${EOL}`
    }, ''),
  )
  console.warn('环境变量已自动配置 🎉, 文件已保存至 ./.env')
})()
