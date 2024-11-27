const socket = io();

socket.on("connect", () => {
    console.log("Conectado al Server");
});

socket.on("disconnect", () => {
    console.log("Se desconecto el server");
});