const io = require("socket.io-client");
const readline=require("readline");
const crypto = require("crypto");

const socket=io("http://localhost:3000");

const rl=readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt:"> "
});

let username="";

function generateHash(message){
    return crypto.createHash("sha256").update(message).digest("hex");
}

socket.on("connect",()=>{
    console.log("Connected to the server");

    rl.question("enter your username: ",(input)=>{
        username=input;
        console.log(`Welcome,${username} to the chat`);
        rl.prompt();

        rl.on("line",(message)=>{
            if(message.trim()){
                const hash=generateHash(message);
                socket.emit("message",{username,message});
            }
            rl.prompt();

        });
    });
});

socket.on("message",(data)=>{
    const{username: senderUsername,message: senderMessage,hash:senderHash=""}=data;

    if(senderUsername != username){
        const computedHash = generateHash(senderMessage);
        if (computedHash === senderHash) {
            console.log(`${senderUsername}: ${senderMessage}`);
        } else {
            console.log(`Warning: Message from ${senderUsername} was tampered with!`);
        }
    rl.prompt();  
    }
});

socket.on("disconnect",()=>{
    console.log("Server disconnected, Existing...");
    rl.close();
    process.exit(0);
});

rl.on("SIGINT",()=>{
    console.log("\nExiting...");
    socket.disconnect();
    rl.close();
    process.exit(0);
});