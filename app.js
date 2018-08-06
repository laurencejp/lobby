const app = require("express")();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const port = process.env.PORT;
let lobbies = [];

//When user sends request to root, send back client.html
app.get("/", function(req, res){
    res.sendFile(__dirname + "/client.html");
});

app.get("/client.js", function(req, res){
    res.sendFile(__dirname + "/client.js");
});

app.get("/joinLobbyScreen.html", function(req, res){
    res.sendFile(__dirname + "/pages/joinLobbyScreen.html");
});

app.get("/inLobbyScreen.html", function(req, res){
    res.sendFile(__dirname + "/pages/inLobbyScreen.html");
});

app.get("/includes/bootstrap.min.css", function(req, res){
    res.sendFile(__dirname + "/includes/bootstrap.min.css");
});

io.on('connection', function(socket){

    //When client connects emit this to prompt a refresh if they were in the lobby before server started
    io.to(socket.id).emit("inLobbyCheck");
    
    //Calls sendPlayerNames function with global as false as getPlayerNames is only sent when a page refresh occurs.
    socket.on("getPlayerNames", function(lobbyCode){
        sendPlayerNames(false, lobbyCode);
    });

    socket.on("checkForLobby", function(lobbyCode){
        if (getIndexOfLobby(lobbyCode) != -1) {
            sendPlayerNames(false, lobbyCode);
        } else {
            io.to(socket.id).emit("reset");
        }
    });

    //If a player has joined or left lobby(global == true), send names to all
    //If a player in lobby refreshes page(global == false), send only to sender
    function sendPlayerNames(global, lobbyCode) {
        let index = getIndexOfLobby(lobbyCode);
        if (global == true) {
            io.to(lobbyCode).emit("refresh", lobbies[index].members.join());
        } else {
            io.to(socket.id).emit("refresh", lobbies[index].members.join());
        }
    }

    //Runs checks on nickname and lobby code and returns valid or invalid
    socket.on("validateJoinCredentials", function(codeAndNickname){
        let lobbyCode = codeAndNickname.split(",")[0];
        let nickname = codeAndNickname.split(",")[1];
        let valid = false;
        
        //Test for invalid names
        if (validateNickname(nickname) == true) {
            
            //Tests for a lobby with the given code
            let lobbyIndex = getIndexOfLobby(lobbyCode);
            if (lobbyIndex != -1) {

                //Test if the nickname is already in the given lobby
                for (i = 0; i < lobbies[lobbyIndex].members.length; i++) {
                    if (lobbies[lobbyIndex].members.includes(nickname) == false) {
                        valid = true;
                    }
                }
            }  
        }

        if (valid == false) {
            io.to(socket.id).emit("credentialsInvalid");
        } else {
            io.to(socket.id).emit("credentialsValid", codeAndNickname);
        }
    });

    function validateNickname(nickname) {
        let emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
        if (nickname == "" || nickname.includes(";") == true || nickname.includes("\,") == true || emojiRegex.test(nickname) == true) {
            return false;
        } else {
            return true;
        }
    }

    function getIndexOfLobby(lobbyCode) {
        for (i = 0; i < lobbies.length; i++) {
            if (lobbies[i].lobbyCode == lobbyCode) {
                return i;
            }
        }
        return -1;
    }

    //Appends the name to the lobbies array, logs the join and then emits name list to all
    socket.on("addNameToLobby", function(codeAndNickname){
        let lobbyCode = codeAndNickname.split(",")[0];
        let nickname = codeAndNickname.split(",")[1];
        let index = getIndexOfLobby(lobbyCode)

        lobbies[index].members.push(nickname);

        //Join the room so messages can be recieved for this specific lobby.
        socket.join(lobbyCode, function(){
            sendPlayerNames(true, lobbyCode);   
        });
    });

    //Removes the name from the lobbies array, logs the leave and then emits name list to all
    socket.on("removeNameFromLobby", function(codeAndNickname){
        let lobbyCode = codeAndNickname.split(",")[0];
        let nickname = codeAndNickname.split(",")[1];
        let index = getIndexOfLobby(lobbyCode);

        //Removes the nickname from the members of the given lobby
        lobbies[index].members.splice(lobbies[index].members.indexOf(nickname), 1);

        socket.leave(lobbyCode, function(){
            //If the lobby is now empty, remove the lobby from lobbies array, if not then broadcast player names
            if (lobbies[index].members.length == 0) {
                lobbies.splice(index, 1);
            } else {
                sendPlayerNames(true, lobbyCode);    
            }  
        });
    });

    socket.on("createLobby", function(nickname){
        if (validateNickname(nickname) == false) {
            io.to(socket.id).emit("credentialsInvalid");
        } else {
            let lobbyCode

            //Loop until new code is generated
            do {
                lobbyCode = generateLobbyCode();
            } while (getIndexOfLobby(lobbyCode) != -1);

            //Add empty lobby to lobbies array
            lobbies.push({lobbyCode: lobbyCode, members:[]});

            //Player can now join lobby as if they were joining existing lobby
            io.to(socket.id).emit("credentialsValid", lobbyCode + "," + nickname);    
        }      
    });

    function generateLobbyCode() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      
        for (var i = 0; i < 5; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
      
        return text;
      }
});

server.listen(port, function() {
});