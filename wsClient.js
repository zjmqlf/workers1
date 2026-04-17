export const onRequest = async (context) => {
//  const ws = await new WebSocket('wss://ws.zjmqlf2021.workers.dev/ws');
//    ws.addEventListener('message', event => {
//    console.log('Message received from server');
//    console.log(event.data);
//  });
//  ws.send('MESSAGE');
//  //ws.close();

  async function websocket(url) {
    let resp = await fetch(url, {
      headers: {
        Upgrade: 'websocket',
      },
    });

    let ws = resp.webSocket;
    if (!ws) {
      throw new Error("server didn't accept WebSocket");
    }

    ws.accept();

    ws.send('hello');
    ws.addEventListener('message', msg => {
      console.log(msg.data);
    });
  }

  const url = "https://ws.zjmqlf2021.workers.dev/ws";
  await websocket(url);
  //await scheduler.wait(10000);
  return new Response("OK!")
};