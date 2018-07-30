const app = require("express")();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const chalk = require("chalk");
const chalkAddress = chalk.yellowBright;
const chalkGreen = chalk.greenBright;
const chalkRed = chalk.redBright;
const port = process.env.PORT;
let playersInLobby = [];

//When user sends request to root, send back client.html
app.get("/", function(req, res){
    res.sendFile(__dirname + "/client.html");
});

io.on('connection', function(socket){

    //Gets ip address of new socket, formats it and logs the connection.
    const address = socket.request.connection.remoteAddress.substring(7);
    logEvent("connect", address);

    //When client connects emit this to prompt a refresh if they were in the lobby before server started
    io.to(socket.id).emit("inLobbyCheck");

    //On disconnect, log the disconnection.
    socket.on('disconnect', function(){
        logEvent("disconnect", address);
    });
    
    //Calls sendPlayerNames function with global as false as getPlayerNames is only sent when a page refresh occurs.
    socket.on("getPlayerNames", function(){
        sendPlayerNames(false);
    });

    //If a player has joined or left lobby(global == true), send names to all
    //If a player in lobby refreshes page(global == false), send only to sender
    function sendPlayerNames(global) {
        if (global == true) {
            io.emit("refresh", playersInLobby.join());
        } else {
            io.to(socket.id).emit("refresh", playersInLobby.join());
        }
    }

    //Checks for new name in existing names in lobby and if the name is blank, sends invalid if either true
    socket.on("validateName", function(nickname){
        let emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
        if (playersInLobby.includes(nickname) == true || nickname == "" || nickname.includes(";") == true || emojiRegex.test(nickname) == true) {
            io.to(socket.id).emit("nameInvalid");
        } else {
            io.to(socket.id).emit("nameValid", nickname);
        }
    });

    //Appends the name to the playersInLobby array, logs the join and then emits name list to all
    socket.on("addNameToLobby", function(nickname){
        playersInLobby.push(nickname);
        logEvent("joinLobby", address, nickname);
        sendPlayerNames(true);
    });

    //Removes the name from the playersInLobby array, logs the leave and then emits name list to all
    socket.on("removeNameFromLobby", function(nickname){
        playersInLobby.splice(playersInLobby.indexOf(nickname), 1);
        logEvent("leaveLobby", address, nickname);
        sendPlayerNames(true);
    });
});

server.listen(port, function() {
    console.log(chalkGreen("Server Started"));
    console.log("Listening on port " + chalk.cyanBright(port));
});

//#region Code snippets
/*Displays all connected client ids. Ids are stored in a cookie.
io.sockets.clients((error, clients) => {
    if (error) throw error;
    console.log(clients);
})*/

function logEvent(event, data1, data2) {
    switch(event) {
        case "connect":
            console.log("[" + getFormattedDate() + "] " + chalkAddress(data1) + " " + chalkGreen("connected"));
            break;
        case "disconnect":
            console.log("[" + getFormattedDate() + "] " + chalkAddress(data1) + " " + chalkRed("disconnected"));
            break;
        case "joinLobby":
            console.log("[" + getFormattedDate() + "] " + chalkAddress(data1) + " as " + chalk.yellow(data2) + ": " + chalk.green("joined lobby"));
            break;
        case "leaveLobby":
            console.log("[" + getFormattedDate() + "] " + chalkAddress(data1) + " as " + chalk.yellow(data2) + ": " + chalk.red("left lobby"));
            break;
    }
}

function getFormattedDate(){
    var d = new Date();

    d = d.getFullYear() + "-" + ('0' + (d.getMonth() + 1)).slice(-2) + "-" + ('0' + d.getDate()).slice(-2) + " " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);

    return d;
}
//#endregion