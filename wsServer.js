let count = 0;

//async function handleSession(websocket, env) {
const handleSession = async (websocket, env) => {
  websocket.accept();
//  websocket.addEventListener('message', event => {
//    console.log(event.data);
//  });
  websocket.addEventListener("message", async ({ data }) => {
    count += 1;
    //await env.KV.put('count', count);
    //console.log(data);
    websocket.send('count : ' + count);
  })

  websocket.addEventListener("close", async evt => {
    //console.log(evt);
    //count = 0;
  })
}

const websocketHandler = async (request, env) => {
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }
  const [client, server] = Object.values(new WebSocketPair());
  await handleSession(server, env);
  //server.send("collect");

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

export default {
  async fetch(request, env, ctx) {
//    try {
      const url = new URL(request.url)
      switch (url.pathname) {
        case "/":
          // const url = "https://ws.zjmqlf2021.workers.dev/ws";
          // const resp = await fetch(url, {
          //   headers: {
          //     Upgrade: 'websocket',
          //   },
          // });
          // console.log(resp);
          // let ws = resp.webSocket;
          // if (!ws) {
          //   throw new Error("server didn't accept WebSocket");
          // }
          // ws.accept();
          // ws.send('hello');
          // ws.addEventListener('message', msg => {
          //   console.log(msg.data);
          // });

          //const url = new URL(window.location);
          // url.protocol = "wss";
          // url.pathname = "/ws";
          // const ws = await new WebSocket(url);
//          const ws = await new WebSocket('wss://ws.zjmqlf2021.workers.dev/ws');
//          ws.addEventListener('message', event => {
//            console.log(event.data);
//            ws.send('MESSAGE');
//          });
//          //ws.send('MESSAGE');
//
//          //await ctx.waitUntil(2000);
//          return new Response(JSON.stringify(ws));

          const template = `
          <button id="open">open</button>
          <button id="click">click</button>
          <button id="close">close</button>
          <h4>Incoming WebSocket data</h4>
          <ul id="events"></ul>
          <script>
            let ws;
            const list = document.querySelector("#events");
            const url = new URL(window.location);
            url.protocol = "wss";
            url.pathname = "/ws";
            const addNewEvent = (data) => {
              const item = document.createElement("li");
              item.innerText = data;
              list.prepend(item);
            }
            const closeConnection = () => ws.close();

            async function websocket(url) {
              ws = new WebSocket(url);
              console.log(ws);
              if (!ws) {
                throw new Error("server didn't accept ws");
              }
              ws.addEventListener("open", () => {
                console.log('Opened websocket')
              });
              ws.addEventListener("message", ({ data }) => {
                addNewEvent(data)
              });
              ws.addEventListener("close", () => {
                console.log('Closed websocket');
                //list.innerText = "";
              });
            }

            document.querySelector("#click").addEventListener("click", () => {
              ws.send("CLICK");
            });
            document.querySelector("#open").addEventListener("click", () => {
              websocket(url);
            });
            document.querySelector("#close").addEventListener("click", closeConnection);
          </script>
          `;
          return new Response(template, {
            headers: {
              'Content-type': 'text/html; charset=utf-8'
            }
          });
        case "/ws":
          //console.log("ws");
          return await websocketHandler(request, env);
        default:
          return new Response("Not found", { status: 404 });
      }
    // } catch (err) {
    //   return new Response(err.toString())
    // }
  },
};
