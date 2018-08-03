let socket = io();

$(document).ready(function () {    
    $("#page").html("");

    //Sets inlobby cookie to false if first visit to page
    if(getCookie("inLobby") == "") {
        setCookie("inLobby", "false", 3);
        deleteCookie("nickname");
    }

    if (getCookie("inLobby") == "true") {
        showInLobbyScreen();
    } else {
        showJoinLobbyScreen();
    }


    socket.emit('pageLoad');
});

//Check if no players are in lobby (server restart etc.), if so then remove from lobby on client side and then only refresh player names if in lobby
socket.on("refresh", function(nameString) {
    if (nameString == "") {
        reset();
    } else {
        if (getCookie("inLobby") == "true") {
            $("#page").html("");
            var title = document.createElement("p");
            title.appendChild(document.createTextNode("Welcome " + getCookie("nickname")));
            $("#page").append(title);

            let names = nameString.split(',')
            let table = document.createElement("table");
            let tableBody = document.createElement("tbody");
            let topRow = document.createElement("tr");
            let tableTitle = document.createElement("th");
            tableTitle.appendChild(document.createTextNode("Players in lobby"));
            topRow.appendChild(tableTitle);
            tableBody.appendChild(topRow);
            for (i=0; i<names.length; i++) {
                let row = document.createElement("tr");
                let data = document.createElement("td");
                data.appendChild(document.createTextNode(names[i]));
                row.appendChild(data);
                tableBody.appendChild(row);
            }
            table.appendChild(tableBody);
            $("#page").append(table);

            var leaveButton = document.createElement("button");
            leaveButton.innerHTML = "Leave Lobby";
            leaveButton.addEventListener('click', removePlayerFromLobby);
            $("#page").append(leaveButton);     
        } else {
        showJoinLobbyScreen();
    }   
    }  
});

socket.on("inLobbyCheck", function(){
    //reset();
});

function reset() {
    setCookie("inLobby", "false", 3);
    deleteCookie("nickname");
    showJoinLobbyScreen();
}

function removePlayerFromLobby() {
  var nickname = getCookie("nickname");
  setCookie("inLobby", false, 3);
  deleteCookie("nickname");
  socket.emit("removeNameFromLobby", nickname);
  showJoinLobbyScreen();
}

//On client side, global becomes false as this is only called when a page refresh occurs
function showInLobbyScreen() {
    socket.emit("getPlayerNames");
}

function showJoinLobbyScreen() {
    $("#page").html("");
    let title = document.createElement("p");
    title.id = "title";
    title.appendChild(document.createTextNode("Enter name:"));
    $("#page").append(title);
    let input = document.createElement("input");
    input.id = "input";
    $("#page").append(input);
    let joinButton = document.createElement("button");
    joinButton.innerHTML = "Join Lobby";
    joinButton.addEventListener('click', validateName);
    $("#page").append(joinButton);   
}

function validateName() {
  var nickname = $("#input").val();
  socket.emit("validateName", nickname);
}

socket.on("nameValid", function(nickname) {
    socket.emit("addNameToLobby", nickname); //This also sends updated player names to everyone
    setCookie("inLobby", "true", 3);
    setCookie("nickname", nickname, 3);
});

socket.on("nameInvalid", function() {
    $("#title").html("NAME ALREADY TAKEN OR INVALID - Enter name:")
});

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