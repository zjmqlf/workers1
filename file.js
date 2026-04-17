const fs = require("fs");
const crypto = require("crypto");

//const data = fs.readFileSync('./1.mp4');
//const sha2 = crypto.createHash("sha256");
//const sha2Result = sha2.update(data).digest("hex");
//console.log("sha2 : " + sha2Result);

//let data = '';
let data = [];
//const sha2 = crypto.createHash("sha256");
const readerStream = fs.createReadStream('./1.mp4',{
//    start:131072 * 8,
//    end:131072 * 9 - 1,
    start:0,
    //end:0,
    highWaterMark: 131072
})
//readerStream.setEncoding('UTF8');
readerStream.on('data', function(chunk) {
  //data += chunk;
  //data.push(chunk);
  //console.log("length : " + chunk.length);
  const sha2 = crypto.createHash("sha256");
  //const sha2Result = sha2.update(chunk).digest("hex");
  data.push(sha2.update(chunk).digest("hex"));
  //sha2.update(chunk);
});

readerStream.on('end',function(){
  //sha2.update(data);
  console.log(data);
  //console.log("length : " + data.length);
  const sha2 = crypto.createHash("sha256");
  //const sha2Result = sha2.update(Buffer.concat(data)).digest("hex");
  //const sha2Result = sha2.update(Buffer.from(data.join(''))).digest("hex");
  const sha2Result = sha2.update(data.join('')).digest("hex");
  //const sha2Result = sha2.digest("hex");
  console.log("sha2 : " + sha2Result);
});
readerStream.on('error', function(err){
   console.log(err.stack);
});

 //const sha2Result = sha2.digest("hex");
 //console.log(sha2Result);

