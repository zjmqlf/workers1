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
        },
        {
          "id": 9,
          "pc": 10,
          "name": "zjm2048",
          "phone": "+12393205128",
          "apiId": 14431994,
          "apiHash": "48124b3e3aaf2e980f786f147aff3e69",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQuozJ8cY+Sn5CYwT9OjIFM2y+GwDYGhjyUSN1oowMo55lXcJeg4QDG1mPwLUnTmsKE1Lt+UDGZDUtMPzuSMJzyBrHZ7PtaIx7Vg0FX18392IcB6MCYolTPtk6n/KNKSU/unPPRYIAg5a+5YYWUlZhYxHmDh/hUvJgMNjw5mFPQK5+iJWX+K+ROy1cg5VWG9+0u64nXquDOAeVVfGYckqQqxK6zYCdWKuUjUyrw0+W8G2niIJZd4xe+SqqPDKKmNN+O/8rhYVUDUk/VcpA0GCTFbWWRNu59ogW1KEJr2YNd6+AzOQBP8Hxo22dICr5wnsFBo2UAVtLXCuGpXhN0zbxfw==",
        },
        {
          "id": 10,
          "pc": 10,
          "name": "zjm2049",
          "phone": "+12393065741",
          "apiId": 10448425,
          "apiHash": "3a89b71bba7de11985f76f0206d41ef7",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQuR50mVM4m2Q7I91P3tRh3l14QiuK5TNy9Qb1Hc/lUc4QiVcdr5kN9dCr0o3y/LqmNq2CYxegJMX5CywhuDKk40cMpk/44TcHBJBQMnLWkPWkS40casteQlgv/dFEh5sDcihaa3wQpMoawJyLBL40WDqVXnbJQnegZBykbHCMe4+QDT1LIu1ajI58DJxmbm3N4pVk1yOSf1tx/ggsG8+DvBgTt2cysi0XownzQiXsT9Dpizan3BUFGuNtGbn1q3rSfIOIoqud5ApxgCgfS1LzZozhDwhINRGdl3RcEY9KBtcHa5jZdhUmVDe0NaiF++3IamwZNCh86JynXrcFlR/JWw==",
        },
        {
          "id": 11,
          "pc": 12,
          "name": "zjm2053",
          "phone": "+14709231138",
          "apiId": 19600843,
          "apiHash": "893049221c9c4899f5e9f1e8a06d7ee7",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQMg3jg7H0f9w7WrYoJt0G+efOMdRk7Pg7hxAKt5lyg/TAsX00uFgQUC5CakV5EEx0pcY3X7cPTmnDsj8/XLq8A6An6h/vXlvcXFppIyJMWtWVeziDpxqlATBzBBLgWmx1CZIqJghIzZsf38n/JbyzQdK+56rDIxE6Xz+vir7TywcEOs8Qrov5I2+MLRDEpCX3vtcWKELLpy68FTGytEIsRD541qldZ93Bj6C7Q+phCw9A90x19vY1i6SnmUzhNE0z3eJR86zo/FUzCEq3z5zFlWu5Q7TNuSVgdtOBbMwLz2nXleIGvJ6MH37pfP7h+Y0sOutdF0T2jKVGr7OZ5oN6ug==",
        },
        // {
        //   "id": 12,
        //   "pc": 15,
        //   "name": "zjm2062",
        //   "phone": "+15802031686",
        //   "apiId": 9995085,
        //   "apiHash": "9617564494aa5b62cf0a32ae3ce4127c",
        //   "sessionString": "",
        // },
        // {
        //   "id": 13,
        //   "pc": 15,
        //   "name": "zjm2063",
        //   "phone": "+15802054841",
        //   "apiId": 9611230,
        //   "apiHash": "30a0d2c36c478930bc8ca48f791261b7",
        //   "sessionString": "",
        // },
        {
          "id": 14,
          "pc": 19,
          "name": "zjm2074",
          "phone": "+13478893093",
          "apiId": 12280337,
          "apiHash": "0eb8debe0d285a25a456912668e06bf7",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQbtMc7PAmFp/lDuZ76GeALopLvmKZds298p7oovbuLs8idLzyFxxfmiy1r3n34/wGDLgwC7TJOusPhsSjxsRP93mzM+0XrWOFjDkH5R8DlWYEJSI6HW/jP1u5PIE1yoji78HForxKhAwHn4Ap6CEYgiKdh2I43P9tfAYcDOwMiZ4PPfCQh39M8Ag50/I4ShUKdDy8YlPW18nOQwAm9Ur/AzoCO1215S51V4HL2fm6slAUvhneMMC68xTLbv1EfGwUtFFZIXLYUwFVpBIbrhURz+xAyS9Q9aLjo56xV5EgDFVs9S5wVCzRIKv5POkwT33NMVidGRpXd0O7OjmH86z5oA==",
        },
        {
          "id": 15,
          "pc": 19,
          "name": "zjm2075",
          "phone": "+17408032423",
          "apiId": 15806159,
          "apiHash": "1d01ad9bc4cdc88c194b151613310804",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQHhr0DG+XMzNV30sNmbfCLj1TUrlTRpSyNlnW8eZ8JnbcfxbFtY8F4Ke7SVp1nOg9lPdkgbLHZqwLMajI7kGZCAGEZTlDhvVHo8LgFF1STg9E0hdVFAgNU6QGfLPQEow6LaadH+H/VVya7bik2xaB6lS2n+ulH81HfNOYRIIn7HQx0H4kFTSnsOQFi1C7wj4OLzChus/WzAAdu2wiayRe8PuYAqQE9YGsLcmN18NJCkTnzgbLEo/Ctj1UAtLhWKJt9C5fyKwR+JW8vcaaOKGO8NBb7wIVbBzOauVn37pnHrCvSZDaEV5SVD+uZsca1PV3tqAmogyp60ykIJiPPXNqvQ==",
        },
        {
          "id": 16,
          "pc": 20,
          "name": "zjm2077",
          "phone": "+16066544810",
          "apiId": 19971874,
          "apiHash": "d26fadcacc1ae37e03def776ca46160c",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQqFM35ZO/ubi1s4mjWDH9cv5oFPyTfwZLqFyE22hQnVLLpxbI/z2IjvfopOqbuTy21+dW5aEma1xim31vF0gupNtkhDHOnaMD1/os2J0QjILJxLDLx83dYKM0duqJgxSB7egM/8zGJbi2FMyg3kMP6hNUKErv3KJwfMMRGiyou8rp8Put7rpphQvztHtN4Wv5fV0sDjPdc27PGzU/8IrPS5NHQdaCjADO3ybbtXilHUUYW8mf1w2ngc0Twl+GNbcs/NMugm2u0YdxeddVD5pawK10Fyb5qOGM7VAdNdxVjwfrEL2pMvq7cMavGpzCoJlH1vPV3RPurQ1s933XDc0jng==",
        },
        // {
        //   "id": 17,
        //   "pc": 20,
        //   "name": "zjm2078",
        //   "phone": "+31616465309",
        //   "apiId": 18712270,
        //   "apiHash": "30948555a11cd0f0a8223720c333a1df",
        //   "sessionString": "",
        // },
        // {
        //   "id": 18,
        //   "pc": 21,
        //   "name": "zjm2080",
        //   "phone": "+67074109681",
        //   "apiId": 11206629,
        //   "apiHash": "bae0d9359054fc251ac68a2b58f8749a",
        //   "sessionString": "",
        // },
        {
          "id": 19,
          "pc": 21,
          "name": "zjm2082",
          "phone": "+13527057022",
          "apiId": 11490079,
          "apiHash": "7c588e40b96c442db7d7dcb26eee5917",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQghcGyGyG7GhNT/kA74Gsp7vEiT3dGS6gq1ibJno7fdO4H6xBlT1huhZH9Rtxeb4N3rDIjBzM0wHHiKtCChsrrvv30vMu4ST6Kc4AHLd57ggo1ObGaqb3JGmzSv6V1qpy+65lBvFNP3W9orNw4/kPjVkzImKPB3M+WUe/pr3zkO0691pI8+S2HaqMarI69GhHTQM4H9xFoEbZt1BisYkGAg32Sc0dBJW6KT3mDjATWrh6S/U2BWpEWLyKxondSIoJWBac4jCC6xSZDHnO1YALi/wJnLzZEHaB6hrcO2Fvg4iYgIThcj6Kq+8krxyTrp/dH6SlLYdSa/q4+hrl2CpIIA==",
        },
        {
          "id": 20,
          "pc": 22,
          "name": "zjm2083",
          "phone": "+12406652785",
          "apiId": 11385801,
          "apiHash": "08f6149a2e6b16df038c874eeed1d804",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQsPqiPehQ1dHsITZm6VWR5r+oA6mZaFN8w6Ao+4ra3V3lvKJ5/wSjOg88VzzkNDeRlkXkvYGBXYfBPqEbDSWGwEIAHMYL/MIsm5uBUJ3nRbM9Dpys6jciJoYrabmWTU/VPqM6ppIEIDKaUnJ+A0mW+4RVvqIGQ+0IrHCTpg4yuw8P1g3buLGSFYNONCJKR09qFa2tiIGJDjOCAqOou7rThf1ZFV9p+KIX2g/WjnmbyZ1NzWFdtL5PhcoZNJbhxZAkw6WKzeggmBXegvCWfr/G8+S+O84KKln50MBgeXkVG/eIVgXyjQbO5N+fgPrkX3As2z0hm20Y45zMUsryxakuAw==",
        },
        {
          "id": 21,
          "pc": 22,
          "name": "zjm2084",
          "phone": "+17408037555",
          "apiId": 12897764,
          "apiHash": "cc8565ca4f5c2cda47c898b8f51d55fb",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQxgMPBFdtpvV13IXYh9PDmeLR0z10WfZo45nOb/OfQfdrLB6vprZZbj5bhzC/4u3VyF/IuACrQeWcLmVLl7zEQiSkmC9lgkeAw03FxtkoPyWI66yiEBIyw2/o37DzkaAvqGjjZB8Tf+8uxar9ZYnDTeIYPvAHdCJnqWwxay/45PnAxJ/zlrCOgUPxaMlLHWHJvBDQPEzIAcVECHTJZ6OS79V0hJymU42atwVaIaSBsBNgcy+9LiUTZ2ZIvS15ugrli842lq7bVa2A8thF5lcO1B33zSADvUR7TuiI2nEMXUuGyxkYraB/KMRYVH5eMtSNShd6af+lGU6SzcTG7nE2/w==",
        },
        {
          "id": 22,
          "pc": 26,
          "name": "zjm2097",
          "phone": "+12407567701",
          "apiId": 15816416,
          "apiHash": "22bde2958e42528d60debaa9bfc6a3ac",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQOhVBQg/GX1aEEdRs4l9MQBDnS00ospmsEnhbooeQ8Z/NsDXkgJED/iZkDT2clExrl1CDioBbqm8AOhzfeDJ+2tajYsO54o/jWVTWzpnSDGjs71me+e5DR/S6EJGtY85sGhMmHE+ILjS4rqbiOtS42Py+p6p77SIP+ImPsfDWHVWkGAszNYIAJ5ZmfR55b7xyKKXoqa4mu/fz9kmW4pH1HwQJw8q1rS7fdG8ippwLvP/1tYUSrDN5uPyzNF22XEmANIWbB7ZyBDcN1eaH32Dm3HFSS2fLnetuMQTMUXZbLWFnzWIz73RJbV7DatIK+z7IvUzEPy6a5VOXgFdUYj1pSw==",
        },
        // {
        //   "id": 23,
        //   "pc": 27,
        //   "name": "zjm2099",
        //   "phone": "+13528903059",
        //   "apiId": 15753848,
        //   "apiHash": "0fb65e7746da0f4bc9420632bee4eb56",
        //   "sessionString": "",
        // },
        // {
        //   "id": 24,
        //   "pc": 27,
        //   "name": "zjm2100",
        //   "phone": "+12026296056",
        //   "apiId": 16177121,
        //   "apiHash": "7c6fae7288932173500c9072fc2637e8",
        //   "sessionString": "",
        // },
        // {
        //   "id": 25,
        //   "pc": 29,
        //   "name": "zjm2105",
        //   "phone": "+12023788637",
        //   "apiId": 14267011,
        //   "apiHash": "9ef3ca1ed8a157f59587021fd0a389f8",
        //   "sessionString": "",
        // },
        {
          "id": 26,
          "pc": 35,
          "name": "zjm2125",
          "phone": "+12024760134",
          "apiId": 19251839,
          "apiHash": "601bc804c1e71efe698588c24ca3ba4f",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQqFZlkxggG9g8nQjTsU1Yu23Xrfr9SY4hR+UbLS3vRm1L1A7n+miDT6/y9VztIzcuj7ZXY2sRCQ0dFnb2CJuriFa7H3v6TMmiXQ/Ul/Rma8bX0228pyWLxP5d0ucASWr3lPl1zZqAfKBuV2e/iF6y8Zhaqx4fTwruuR05ZVkF4LzZRcIMtd9pzhj2ofMMLQXgnUCSJ8d2hhI8pMfAPuC28VYQfLpPCjTUL6oDWx2DXEXCQFcZLOObG5jjfGMlwdL33+KxiBMq0npEYh63J5hSJVE3+2AvzcZncnawaEDmIwKf0oMKyvjBACE+PbTCopE69Wbs8v9iFWNgsompxSAcww==",
        },
        {
          "id": 27,
          "pc": 43,
          "name": "zjm2149",
          "phone": "+12407158869",
          "apiId": 16593781,
          "apiHash": "4a6eedd1198bf7f817999216d453fa96",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQZWLvkrDpy3IJxHXO49AeGzKb5OYlTb0hB1EZGDo/0SB1/YEFkIe1B4ewwQJQXuVx0Y1FLdFDQV72+Ld6GVWrlTQaB1bCSr91rju7UHxUnSl4sXwQYYJSRCWckIxiHuzqkVt6wI2W4D2f4Qbn5Eh2+nXdynStoniEd21jsuWDEj7kgLsBU7E6YSMMM1M7jwfKMTC//x0TlnbN8I7vwmTRVmWzXllRGt/awV3A7HngZZ8YbxF6nlEokCA5YIsGWWRFj0IsxIxc2bS+SXT8x43w7KFMvNP66VN6bJtD1QJSz4udN6O1B68sINhD4ygZ39j5rq9kVVvAusFX9FdlSpStFw==",
        },
        {
          "id": 28,
          "pc": 44,
          "name": "zjm2150",
          "phone": "+447362054713",
          "apiId": 15833292,
          "apiHash": "b5798fe55bcfbe23bd8935cd201047c6",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQNWNdfv6fdTZiMxlzWfyhkzZAxcxGj2HmzqFNsWsmIGIT9L2l+5LFnk2HJsk1bpldE8kmOULO+2S+0Ma8YhiHT9ISbsMQUkK2VEAxlp0kOLPtLIRizQD9G6KHoM8C+m4+30NoJAFYa4qjZHGDxvyutqcSrUrelpqtZ86HMudra+w1F7SaKRKMY2qPBCM0a4TCq/ZEvTHxab2DZKhVj5BbWxrR0rDidIVzSdZV3/Nx6zfeyf7BghDlMVYTNQDzwEqLC0RpzVQSEbZXv7scrOhdSMisV4UmUVVeIKj8+eJ6lXdPADqZGDqC9eBLOP9oZR99sQ5tdYmW49jeQmWi/0gg1g==",
        },
        // {
        //   "id": 29,
        //   "pc": 44,
        //   "name": "zjm2152",
        //   "phone": "+436703061883",
        //   "apiId": 15381367,
        //   "apiHash": "ac07d5abc6501fec8f538e688a6780b8",
        //   "sessionString": "",
        // },
        // {
        //   "id": 30,
        //   "pc": 45,
        //   "name": "zjm2154",
        //   "phone": "+13525301285",
        //   "apiId": 12604929,
        //   "apiHash": "4c31287581bd7e09e92d6602e2d1cfc5",
        //   "sessionString": "",
        // },
        // {
        //   "id": 31,
        //   "pc": 46,
        //   "name": "zjm2157",
        //   "phone": "+16149291798",
        //   "apiId": 10018955,
        //   "apiHash": "af7fd0a4266fed7a481b7f970a8a876e",
        //   "sessionString": "",
        // },
        {
          "id": 32,
          "pc": 71,
          "name": "zjm2231",
          "phone": "+12024687761",
          "apiId": 10690381,
          "apiHash": "b880e52ce5a0b5d9829b94ead1904506",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQu7MNVNVPBJyWLS7Cn8Q5L7yXlnRSN1bwACLKaHsQfFx5aID0vnLtl0q83clYCEOWYtc6Hx1Ema9zugSkfXOZ27FwMEPdoZbFxAcJvrwi6uRE0FChVbonoCn3dA8CD8uXroKeNfL2njXvpMdZ8pbzVrsHz1xGm9KwX+5nt/4Nh8BlISFCwsIk9DZjQJ4SIG7OBychUSnw0b6ewCZmDNvMcHkEY9FTR1ImAkeKUXQ25xET3rFBaWoRG4a5esi6To/ufgOxSxnu27JGWtOekB4WcJsQnD3hdu4qM6sRH3cgBYfW1n36MCxv+5feg9Nat1M3m6dwDgih61KVvvrtT2HiLA==",
        },
        {
          "id": 33,
          "pc": 71,
          "name": "zjm2232",
          "phone": "+13528904325",
          "apiId": 9097235,
          "apiHash": "8389d7267098c9799e0676bd47f627a9",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQwivZ5mQgL8pJjgfUjK2ONt59wTXy+QTtiusplnP/B1rR2+sUY7pWsLKxXXo8zWhkQJokwDfXZdsWfcvjUwFZZqeDgLQcy1Bx3w2tUx/FHqbj8D+l00rCu3HIPCcaxlFLLfb82li5I4t19/Uea5q+a2M30Wd6SxU7mD5EFYKJfAXlUAoF3Ttud6CeRfhaV0EQMfGLDGgqf2hrC8cNrewNi2iefj6xoc+wRil5Q5FO6F+D5qHGjAD3lvVZDYczcPjuDnX74/0wySaPqBfoD7WVrFSMjiHzNVyF5SK2oik3cDSB6ZbFzTNb7Pa0dDQJZiz0vY8sPPzINaAPwZ82600Hmg==",
        },
        {
          "id": 34,
          "pc": 71,
          "name": "zjm2233",
          "phone": "+12024685684",
          "apiId": 14346704,
          "apiHash": "b7b0b78f118d3915e1315c94ee16402a",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQpbqlLEg7nFegoxsWpkLGyAS0dUlIt9MqTDaDheZUx9w+pl84i+wPKs4G2eOGmGVMY+QhmrzfeYAEJYDw9cFxEm5xZbPBrazuz++HPDv2yhDy7Hg/gZDPby36lh1yjdCHYjF3ZeNhMU/vftgHFT2M+b7BXvc+dz0keXSLQEPGkj8eTXzMV0DCaJKUYO3yq2xbJ05ceJF/AprLZbw27AQ7i+6vJIDh3pdD6oiV+S25r3db3RjIN2qJ+2v1xG0OtPPx7geZjI1b525y6VDrJ1+iXW2qN+j0HmzKdrWHMrfb6IZOm15SIZcVVH0f7CRS2i5V5r8b+UjWWbro4mJpjOqAlg==",
        },
        {
          "id": 35,
          "pc": 72,
          "name": "zjm2235",
          "phone": "+18194102280",
          "apiId": 15783504,
          "apiHash": "c279d17c86194b14e0959eb987b1b0da",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQOgbeTY9OB5t6NALPM/cIHsK+u5g3hhw1XA0yUEutACbY3wvvxn4HvrLHlpj3OfPsn2g8wuMO75sy9AhWqN8xQFAsfUFtmM2pA9klb46/IuQGh76rGrzc6sO2yDfQRfH/riLQfMiZirDm3wGobwfx7G/D3obxUpZH7fYfhxp5ETYMTovtPUlIr9jjnYFIokwW+nvm4I/GoahEyaxeLLydfWAKPDp/xjDCR+FcBWV1jZ7yJ9BrSrNR7MFUFhIabn/xAsx27YmMnShRTFR5W5s/afrFu50NNfamgkgD0jn5Yx0aaBZZtAgQqkAXhuMYC79IfH+2FNV7cT3qGD2x4QRorw==",
        },
        {
          "id": 36,
          "pc": 72,
          "name": "zjm2236",
          "phone": "+12404214295",
          "apiId": 9046850,
          "apiHash": "bc86cc2ebd1c45002c40da29e1a1d746",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQXCrrwGFqh0fZr7fQpyJ9xS54ydK+Ld0j71pUJsi2z72zbvJyGkcF0o/YTRQBWX8ZSgz3Dctt47QhYDZexRcfpSh62I4WDnAzVs09Q3Uu7cTwc1kqCs+Rkb+8fZxlq2u3xLD8LbCMLHPG2vOL+1sCf0ahYRAZ68f7JuBwBMebZv8kN1bgDFmTZ/F7vcT/IaoidmCS6xO9swdPq2LCvHWnKr+bhhKQWiU/8M6wvNFVr4FeXKKj3JaO+BeyPoMrzxomeTN23vSiZzeyYrlW8NTbDfWmWbnk5dVySkDF5Z59LCp/7Wv7u8ClMVOV7Sju4C0YapmPYsOirRKUgtuwd7Fpvw==",
        },
        {
          "id": 37,
          "pc": 74,
          "name": "zjm2240",
          "phone": "+12404217085",
          "apiId": 14254774,
          "apiHash": "01ab4d78bdbc4dffff967acd4b13de22",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQPd0zKc6i2EytlaP0DOBr1ewCH78Z1CJ4kwK+Irwnc5TkRb1HbUXeMqvO56Mzu0PtDhaB1HHprAFH2wAlQXOquGttupOMMEysfVYy8A2pCFU5mro5TCKRLH94mRfnG5eaUHqtBoc3hEQy7PumgEdyPJKQAUOXUZ4JqjFCRVZMqzu/Af2018ne7kF3+JozmeMHfm6wBivdLTEwP2eb/gKkbDcfByv82a03qywFKl/S7iQwkbGYZEgZqFOL1oBCFckG+ec9EUF1Ay4ssTCXp5g4VFijvaGdAGOWAM8M3j1q5ET1dBRLWnSZr5agu8YkJPBnCTr9+myQ4wJBkOX/c2y5QA==",
        },
        // {
        //   "id": 38,
        //   "pc": 74,
        //   "name": "zjm2241",
        //   "phone": "+13522179773",
        //   "apiId": 11529789,
        //   "apiHash": "18f9b0abbeb32c902a3717662e1bf991",
        //   "sessionString": "",
        // },
        {
          "id": 39,
          "pc": 75,
          "name": "zjm2244",
          "phone": "+37066154513",
          "apiId": 19988259,
          "apiHash": "3cd5347f2f5c8cdfc7d4ff89af2f8a57",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQDMofmsQMVwdjcxJ42pPrB5j7WFrvn6H7LBD8NN6H3z4NlIR68lduR0tRwuMnqcunra/Y+hIFj4kiC1b0ZlXb3w3lWkIf+gxImENPwMlWeq7KmvU9VKTw7LyaFJ61k8MkPUWXaeeMxc3OoSK0JTamDh75VReJeYxJuWdnMepi59vlyBjmaxuhK1Mk1FLEc91lDteMQ1VbztIA09hHNVIqwhq7nGMNNOpZoX7Y8u1pKWUAva7Jk/luY1koczY2Esn/QxF1FnX4LqX9EUKa+vC/E/m7wSHLi63F62qZjly4CSaiQTfx0eRmTVh+d0Cx3DZvswUWP19gXpIlwmHRTHnIdA==",
        },
        {
          "id": 40,
          "pc": 75,
          "name": "zjm2245",
          "phone": "+16143164251",
          "apiId": 15998596,
          "apiHash": "29f9d44ecc51856bacf03486e186f855",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQZkUY+aeZnpxL/kIGAVxbHBapRi8BHIS0uUrDeHyaZmv5bsEr9E+FdCw1R1UXcl0V0TbduQS/ywRwLnQoSshrsKTUhCs4bRNeoR5Ot6rXQNoX+GXCwHIJu2oYlHUmYslelSHJh3Q0cJqRFbE96O95PYbrYabURVXnSQBglQIk1UREMtUJLjmjMmqUbDtY1ECLYpzszHCpGqz0HMM/cw7+vzwmbxlYEAVqiYa8v4KCqh614jRsTh9g3xewjdQ/mKUndgVX6LyZE7hyK15jzS+ARVB/6b6ptcpzFNzOmTaormHEKV6m5wL/S4dLALqrzLqyviBfif3eNFldPyn0J0DOrQ==",
        },
        {
          "id": 41,
          "pc": 76,
          "name": "zjm2246",
          "phone": "+14044836428",
          "apiId": 9866793,
          "apiHash": "e8d898f4a243c682302bbae3b3ae0b4d",
          "sessionString": "1BQANOTEuMTA4LjU2LjEyOABQv9tW5Xt1Pb1Cpz48M7aD9aU9QS15/kKhP8QQl6nt4ZrnMFUg3TsVYQe3l+mPha29cvfj3grxGoKzdQ/AGVJMLWxk7sXJBksA+3R8XkIiyrUFfXWD0TZHqI4naDyXNoAmoc6RISks3Pctu7m9mQroK04F0ke6RFNUVLeQqVmz+zvTyANKsBeV6maCHiW69PcDqBND9XVkHgg3bDtwkwZ0h3Trx/zOZ+ennvgfctNTALC2BUBfTgVtrT322TwvqGyyyYWn67kdSntqZe9kGiFPSyCNQJBRqDQmGS1tbg58K8YgnOVcz7PmKI9pd5PwfAOQy8noPukmnB4yoXiyi4keGg==",
        },
        // {
        //   "id": 42,
        //   "pc": 133,
        //   "name": "zjm2419",
        //   "phone": "+14706523433",
        //   "apiId": 11785576,
        //   "apiHash": "b44fa1e1652981b518ed5420caa3153a",
        //   "sessionString": "",
        // },
        // {
        //   "id": 43,
        //   "pc": 133,
        //   "name": "zjm2420",
        //   "phone": "+16505377616",
        //   "apiId": 17764563,
        //   "apiHash": "6db60ad52ab0f331fee925d7ecd62d68",
        //   "sessionString": "",
        // },
        // {
        //   "id": 44,
        //   "pc": 148,
        //   "name": "zjm2463",
        //   "phone": "+16502106659",
        //   "apiId": 22995669,
        //   "apiHash": "ba356f82d9938db30fe8f8d636301482",
        //   "sessionString": "",
        // },
        // {
        //   "id": 45,
        //   "pc": 149,
        //   "name": "zjm2466",
        //   "phone": "+12023527104",
        //   "apiId": 25102839,
        //   "apiHash": "7a2bc5dbb0faf5cfe0ecba45308171d2",
        //   "sessionString": "",
        // },
        // {
        //   "id": 46,
        //   "pc": 171,
        //   "name": "zjm2589",
        //   "phone": "+447406613751",
        //   "apiId": 26611861,
        //   "apiHash": "479d34e5abc594feb3685117445903df",
        //   "sessionString": "",
        // },
        // {
        //   "id": 47,
        //   "pc": 171,
        //   "name": "zjm2590",
        //   "phone": "+447406613754",
        //   "apiId": 21979386,
        //   "apiHash": "f89dbd720d7b2b2b843ae9aea2e4f02f",
        //   "sessionString": "",
        // }
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
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
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
        //console.log("(" + this.currentStep + ") 第" + this.tg[clientIndex].errorCount + "轮消息无需转发");
        this.broadcast({
          "clientId": this.tg[clientIndex].clientId,
          "chatId": this.tg[clientIndex].chatId,
          "offsetId": this.tg[clientIndex].offsetId,
          "operate": "forwardMessage",
          "step": this.currentStep,
          "clientCount": this.clientCount,
          "message": "第" + this.tg[clientIndex].errorCount + "轮消息无需转发",
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
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "result": "end",
                "operate": "nextStep",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": "当前chat采集完毕",
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
                    "clientId": this.tg[clientIndex].clientId,
                    "chatId": this.tg[clientIndex].chatId,
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
                "clientId": this.tg[clientIndex].clientId,
                "chatId": this.tg[clientIndex].chatId,
                "result": "end",
                "operate": "start",
                "step": this.currentStep,
                "clientCount": this.clientCount,
                "message": "当前chat采集完毕",
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
                    "clientId": this.tg[clientIndex].clientId,
                    "chatId": this.tg[clientIndex].chatId,
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
            "clientId": this.tg[clientIndex].clientId,
            "chatId": this.tg[clientIndex].chatId,
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
