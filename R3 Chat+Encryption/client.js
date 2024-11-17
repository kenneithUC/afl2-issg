const io = require("socket.io-client");
const readline = require("readline");
const NodeRSA = require("node-rsa");

const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

let targetUsername = "";
let username = "";
const users = new Map();

const key = new NodeRSA({ b: 512 });
const publicKey = key.exportKey("public");
const privateKey = key.exportKey("private");

socket.on("connect", () => {
  console.log("Connected to the server");

  rl.question("Enter your username: ", (input) => {
    username = input;
    console.log(`Welcome, ${username} to the chat`);

    socket.emit("registerPublicKey", {
      username,
      publicKey,
    });
    rl.prompt();

    rl.on("line", (message) => {
      if (message.trim()) {
        if ((match = message.match(/^!secret (\w+)$/))) {
          targetUsername = match[1];
          console.log(`Now secretly chatting with ${targetUsername}`);
        } else if (message.match(/^!exit$/)) {
          console.log(`No more secretly chatting with ${targetUsername}`);
          targetUsername = "";
        } else {
          if (targetUsername) {
            const targetPublicKey = users.get(targetUsername);
            if (targetPublicKey) {
              const targetKey = new NodeRSA(targetPublicKey);
              const encryptedMessage = targetKey.encrypt(message, "base64");
              socket.emit("message", {
                username,
                target: targetUsername,
                message: encryptedMessage,
                encrypted: true,
              });
              console.log(`Encrypted message to ${targetUsername}: ${encryptedMessage}`);
            } else {
              console.log(`Public key for ${targetUsername} not found.`);
            }
          } else {
            socket.emit("message", { username, message, encrypted: false });
          }
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
  const { username: senderUsername, target, message, encrypted } = data;
  if (encrypted && target === username) {
    try {
      const decryptedMessage = key.decrypt(message, "utf8");
      console.log(`Secret message from ${senderUsername}: ${decryptedMessage}`);
    } catch (error) {
      console.log(`Failed to decrypt message from ${senderUsername}`);
    }
  } else if (!encrypted && senderUsername !== username) {
    console.log(`${senderUsername}: ${message}`);
  } else if (encrypted) {
    console.log(`${senderUsername} sent an encrypted message: ${message}`);
  }
  rl.prompt();
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