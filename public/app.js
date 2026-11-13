const socket = io(window.WATCHTOGETHER_SERVER || window.location.origin);
const $ = id => document.getElementById(id);
let currentRoom = "", player = null, playerReady = false, pendingVideo = "", applyingRemote = false;
let messageCount = 0, userName = localStorage.getItem("wt-name") || "Guest";
$("displayName").value = userName; $("profileBtn").textContent = userName[0].toUpperCase();
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function profile(){userName=($("displayName").value||"Guest").trim().slice(0,24)||"Guest";localStorage.setItem("wt-name",userName);$("profileBtn").textContent=userName[0].toUpperCase()}
$("profileBtn").onclick=()=>{const n=prompt("Choose your display name",userName);if(n!==null){$("displayName").value=n;profile();toast("Display name updated")}};

function enterRoom(result){
  if(!result?.ok){$("lobbyError").textContent=result?.error||"Couldn't join that room.";return}
  currentRoom=result.code;$("roomCode").textContent=currentRoom;
  $("lobby").classList.add("hidden");$("watch").classList.remove("hidden");
  $("lobbyError").textContent="";renderUsers(result.state.users||[]);
  (result.state.messages||[]).forEach(addMessage);
  if(result.state.videoId)loadVideo(result.state.videoId,result.state.currentTime,result.state.playing);
  history.replaceState({}, "", `/${currentRoom}`);
  $("copyInvite").onclick=async()=>{const url=location.origin+"/"+currentRoom;try{await navigator.clipboard.writeText(url);toast("Invite link copied!")}catch{prompt("Copy this invite link",url)}};
}
function join(code){profile();socket.emit("join-room",{code,profile:{name:userName}},enterRoom)}
$("createBtn").onclick=()=>{profile();socket.emit("create-room",{name:userName},enterRoom)};
$("joinBtn").onclick=()=>join($("roomInput").value.trim().toUpperCase());
$("roomInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("joinBtn").click()});
$("leaveBtn").onclick=()=>{currentRoom="";location.href="/"};
const pathCode=location.pathname.slice(1).toUpperCase();if(/^[A-Z0-9]{6}$/.test(pathCode)){$("roomInput").value=pathCode;join(pathCode)}

function extractId(url){try{const u=new URL(url);let id=u.searchParams.get("v");if(u.hostname==="youtu.be")id=u.pathname.slice(1);if(u.pathname.startsWith("/shorts/")||u.pathname.startsWith("/embed/"))id=u.pathname.split("/")[2];return /^[\w-]{11}$/.test(id||"")?id:null}catch{return null}}
$("videoForm").onsubmit=e=>{e.preventDefault();const id=extractId($("youtubeUrl").value.trim());if(!id){$("videoError").textContent="Paste a valid YouTube video URL.";return}$("videoError").textContent="";socket.emit("set-video",{videoId:id})};
window.onYouTubeIframeAPIReady=()=>{player=new YT.Player("player",{width:"100%",height:"100%",videoId:"",playerVars:{playsinline:1,rel:0,origin:location.origin},events:{onReady:()=>{playerReady=true;if(pendingVideo)player.loadVideoById(pendingVideo)},onStateChange:onPlayerState}})};
function loadVideo(id,time=0,playing=false){pendingVideo=id;$("playerPlaceholder").classList.add("hidden");if(playerReady){player.loadVideoById({videoId:id,startSeconds:time});if(!playing)player.pauseVideo()}}
function onPlayerState(e){if(applyingRemote||!currentRoom||!playerReady)return;if(e.data===YT.PlayerState.PLAYING)socket.emit("playback",{action:"play",currentTime:player.getCurrentTime()});if(e.data===YT.PlayerState.PAUSED)socket.emit("playback",{action:"pause",currentTime:player.getCurrentTime()})}
socket.on("video-changed",d=>{loadVideo(d.videoId,d.currentTime,d.playing);$("youtubeUrl").value=`https://youtu.be/${d.videoId}`;toast("Video changed for everyone")});
socket.on("playback",d=>{if(!playerReady||!pendingVideo)return;applyingRemote=true;const delta=Math.abs(player.getCurrentTime()-d.currentTime);if(delta>1.5)player.seekTo(d.currentTime,true);if(d.action==="play")player.playVideo();else player.pauseVideo();setTimeout(()=>applyingRemote=false,700)});
socket.on("room-update",d=>renderUsers(d.users||[]));
function renderUsers(users){$("peopleCount").textContent=users.length;$("peopleList").innerHTML="";users.forEach(u=>{const el=document.createElement("div");el.className="person";const av=document.createElement("span");av.className="person-avatar";av.textContent=(u.name||"G")[0].toUpperCase();const nm=document.createElement("span");nm.textContent=u.name;const you=document.createElement("span");you.className="you";you.textContent=u.id===socket.id?"YOU":"ONLINE";el.append(av,nm,you);$("peopleList").append(el)})}
function addMessage(m){const wrap=document.createElement("div");wrap.className="message";const head=document.createElement("div");head.className="message-head";const name=document.createElement("span");name.className="message-name";name.textContent=m.name;const time=document.createElement("span");time.className="message-time";time.textContent=new Date(m.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});const body=document.createElement("div");body.className="message-text";body.textContent=m.text;head.append(name,time);wrap.append(head,body);$("messages").append(wrap);$("messages").scrollTop=$("messages").scrollHeight;messageCount++;$("chatCount").textContent=messageCount}
$("chatForm").onsubmit=e=>{e.preventDefault();const text=$("chatInput").value.trim();if(!text)return;socket.emit("chat-message",{text});$("chatInput").value=""};
socket.on("chat-message",addMessage);
document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));$("chatPane").classList.toggle("hidden",tab.dataset.tab!=="chat");$("peoplePane").classList.toggle("hidden",tab.dataset.tab!=="people")});
socket.on("connect_error",()=>{$("lobbyError").textContent="Connection problem. Refresh and try again."});
