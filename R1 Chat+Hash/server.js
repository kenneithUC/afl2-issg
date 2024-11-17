const http =require("http");
const socektIo =require("socket.io");

const server=http.createServer();
const io=socektIo(server);

io.on("connection",(socket)=>{
    console.log(`Client${socket.id} connected`);

    socket.on("disconnected",()=>{
        console.log(`Client ${socket.id} disconnected`);
    });

    socket.on("message",(data)=>{
        let {username,message,hash}=data;
        console.log(`retrieve message from ${username}:${message}`);
        io.emit("message",{username,message,hash});
    });
});

const port=3000;
server.listen(port,() =>{console.log(`Server running on port ${port}`)});