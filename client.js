let socket = io();

//Check if no players are in lobby (server restart etc.), if so then remove from lobby on client side and then only refresh player names if in lobby
socket.on("refresh", function(nameString) {
    if (nameString == "") {
        reset();
    } else {
        if (getCookie("lobby") != "") {
            displayPage("inLobbyScreen.html");
            document.getElementById("title").innerHTML = "Welcome " + getCookie("nickname");
            document.getElementById("lobbyCode").innerHTML = "Lobby code: <code>" + getCookie("lobby") + "</code>";
            let names = nameString.split(',')
            
            //Generates the list of players and shows it to the user
            for (i=0; i<names.length; i++) {
                let name = document.createElement("p");
                name.appendChild(document.createTextNode(names[i]));
                name.classList.add("card-text");
                document.getElementById("card-body").appendChild(name);              
            }
            document.getElementById("leaveLobbyButton").addEventListener('click', removePlayerFromLobby);    
        } else {
        showJoinLobbyScreen();
    }   
    }  
});

socket.on("inLobbyCheck", function(){
    if (getCookie("lobby") == "") {
        deleteCookie("nickname");
        showJoinLobbyScreen();
    } else {
        socket.emit("checkForLobby", getCookie("lobby"));
    }    
});

socket.on("reset", function(){
    reset();
});

function reset() {
    setCookie("lobby", "false", 3);
    deleteCookie("nickname");
    showJoinLobbyScreen();
}

function removePlayerFromLobby() {
  var nickname = getCookie("nickname");
  var lobbyCode = getCookie("lobby");
  deleteCookie("lobby");
  //setCookie("lobby", false, 3);
  deleteCookie("nickname");
  socket.emit("removeNameFromLobby", lobbyCode + "," + nickname);
  showJoinLobbyScreen();
}

//On client side, global becomes false as this is only called when a page refresh occurs
function showInLobbyScreen() {
    socket.emit("getPlayerNames", getCookie("lobby"));
}

function showJoinLobbyScreen() {
    displayPage("joinLobbyScreen.html");
    //If user creates lobby, send server their socket id
    document.getElementById("createLobbyButton").addEventListener("click", function() {
        socket.emit("createLobby", document.getElementById("nickname").value);
    });

    document.getElementById("joinLobbyButton").addEventListener("click", function(){
        validateJoinCredentials();
    });
}

function validateJoinCredentials() {
  var nickname = document.getElementById("nickname").value;
  var lobbyCode = document.getElementById("lobbyCode").value;
  socket.emit("validateJoinCredentials", lobbyCode + "," + nickname);
}

socket.on("credentialsValid", function(codeAndNickname) {
    let lobbyCode = codeAndNickname.split(",")[0];
    let nickname = codeAndNickname.split(",")[1];
    socket.emit("addNameToLobby", codeAndNickname); //This also sends updated player names to everyone
    setCookie("lobby", lobbyCode, 3);
    setCookie("nickname", nickname, 3);
});

socket.on("credentialsInvalid", function() {
    document.getElementById("title").innerHTML = "NAME OR LOBBY CODE INVALID";
});

function displayPage(page){
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function() {
         if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
         {
            document.getElementById("page").innerHTML = xmlHttp.responseText;
         }
     };
     xmlHttp.open("GET", page, false);
     xmlHttp.send(null);
}

//#region Cookies
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
          c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
      }
  }
  return "";
}

function deleteCookie(cname) {
  document.cookie = cname + "=; expires Thu, 01 Jan 1970 00:00:00 UTC;";
}
//#endregion