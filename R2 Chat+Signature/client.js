const io = require("socket.io-client");
const readline = require("readline");
const crypto = require("crypto");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let registeredUsername = "";
let username = "";
const users = new Map(); 
let privateKey; 
let publicKey; 

function generateKeyPair() {
  const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  privateKey = privKey.export({ type: "pkcs1", format: "pem" });
  publicKey = pubKey.export({ type: "pkcs1", format: "pem" });
}

function signMessage(message) {
  const signer = crypto.createSign("sha256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "hex");
}

function verifyMessage(message, signature, senderPublicKey) {
  const verifier = crypto.createVerify("sha256");
  verifier.update(message);
  verifier.end();
  return verifier.verify(senderPublicKey, signature, "hex");
}

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    registeredUsername = input;
    console.log(`Welcome, ${username} to the chat`);

    generateKeyPair();

    socket.emit("registerPublicKey", {
      username,
      publicKey,
    });
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        if ((match = message.match(/^!impersonate (\w+)$/))) {
          username = match[1];
          console.log(`Now impersonating as ${username}`);
        } else if (message.match(/^!exit$/)) {
          username = registeredUsername;
          console.log(`Now you are ${username}`);
        } else {
          const signedMessage = signMessage(message);
          socket.emit("message", { username, message, signature: signedMessage });
        }
      }
      rl.prompt();
    });
  });
});

socket.on("init", (keys) => {
  keys.forEach(([user, key]) => users.set(user, key));
  console.log(`\nThere are currently ${users.size} users in the chat`);
  rl.prompt();
});

socket.on("newUser", (data) => {
  const { username, publicKey } = data;
  users.set(username, publicKey);
  console.log(`${username} joined the chat`);
  rl.prompt();
});

socket.on("message", (data) => {
  const { username: senderUsername, message: senderMessage, signature } = data;

  if (senderUsername !== username) {
    const senderPublicKey = users.get(senderUsername);

    if (!senderPublicKey) {
      console.log(`[Warning] Received message from unknown user: ${senderUsername}`);
    } else if (verifyMessage(senderMessage, signature, senderPublicKey)) {
      console.log(`${senderUsername}: ${senderMessage}`);
    } else {
      console.log(`[Warning] This user is fake: ${senderUsername}`);
    }

    rl.prompt();
  }
});

socket.on("disconnect", () => {
  console.log("Server disconnected, Exiting...");
  rl.close();
  process.exit(0);
});

rl.on("SIGINT", () => {
  console.log("\nExiting...");
  socket.disconnect();
  rl.close();
  process.exit(0);
});
