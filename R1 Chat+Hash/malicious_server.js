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
        let {username,message}=data;
        console.log(`retrieve message from ${username}:${message}`);
        
        message=message+"(modified by server)";

        io.emit("message",{username,message});
    });
});

const port=3000;
server.listen(port,() =>{console.log(`Server running on port ${port}`)});