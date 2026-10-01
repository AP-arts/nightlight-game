import * as THREE from "three";
import { Client } from "colyseus.js";

const $=id=>document.getElementById(id);
const menu=$("menu"), hud=$("hud"), status=$("status");
let room, me, scene, camera, renderer, clock, locked=false;
const remote=new Map(), keys={}, raycaster=new THREE.Raycaster();
let yaw=0,pitch=0,velocityY=0,onGround=true,weapon="pistol",ammo=12,lastShot=0,reloading=false;

$("create").onclick=async()=>connect(true);
$("join").onclick=async()=>connect(false);
async function connect(create){
  status.textContent="Connecting…";
  const host=location.hostname==="localhost" ? "http://localhost:2567" : (window.GAME_SERVER||"");
  if(!host){status.textContent="Server URL is not configured. Deploy the server and set GAME_SERVER in game.js.";return}
  const client=new Client(host);
  try{
    room=create?await client.create("battle",{name:$("name").value||"Player"}):await client.joinById($("room").value.trim(),{name:$("name").value||"Player"});
    start(room);
  }catch(e){status.textContent="Could not join room: "+e.message}
}
function start(r){
  room=r; $("roomLabel").textContent="ROOM "+room.roomId.slice(0,6).toUpperCase();
  menu.hidden=true;hud.hidden=false;buildWorld();
  room.onStateChange(state=>syncState(state));
  document.body.requestPointerLock?.();
  room.onLeave(()=>{hud.hidden=true;menu.hidden=false;status.textContent="Disconnected."});
}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x8b7460);scene.fog=new THREE.Fog(0x8b7460,35,95);
  camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,120);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
  clock=new THREE.Clock();
  scene.add(new THREE.HemisphereLight(0xffe4c1,0x30384c,2.1));
  const sun=new THREE.DirectionalLight(0xffc987,2.8);sun.position.set(-20,35,10);sun.castShadow=true;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x403c39,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  makeRoad(0,0,58,7);makeRoad(0,0,7,58);
  for(let x=-28;x<=28;x+=7){for(let z=-28;z<=28;z+=7){if(Math.abs(x)<5||Math.abs(z)<5)continue;makeBuilding(x,z)}}
  makeGateway(0,-27);makeChaiStall(-12,5);makeRickshaw(11,10);makeRickshaw(-13,-9);makeFlagLine();
  addWeaponView();
  addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="Digit1")setWeapon("pistol");if(e.code==="Digit2")setWeapon("ak47");if(e.code==="KeyR")reload()});
  addEventListener("keyup",e=>keys[e.code]=false);
  addEventListener("mousemove",e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.4,Math.min(1.4,pitch));camera.rotation.set(pitch,yaw,0,"YXZ")});
  addEventListener("mousedown",e=>{if(e.button===0){if(!locked)document.body.requestPointerLock();else shoot()}});
  document.addEventListener("pointerlockchange",()=>locked=document.pointerLockElement===document.body);
  requestAnimationFrame(loop);
}
function makeRoad(x,z,w,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.05,d),new THREE.MeshStandardMaterial({color:0x25272b}));m.position.set(x,.025,z);scene.add(m);for(let i=-25;i<=25;i+=6){const line=new THREE.Mesh(new THREE.BoxGeometry(.18,.055,2.4),new THREE.MeshStandardMaterial({color:0xd9c58b}));line.position.set(x,.06,z+i);scene.add(line)}}
function makeBuilding(x,z){const h=THREE.MathUtils.randFloat(4,9),c=[0xb26e4c,0xc78f62,0x6d7b74,0x9b8f76][Math.floor(Math.random()*4)];const b=new THREE.Mesh(new THREE.BoxGeometry(5.3,h,5.3),new THREE.MeshStandardMaterial({color:c,roughness:.85}));b.position.set(x,h/2,z);b.castShadow=b.receiveShadow=true;scene.add(b);const roof=new THREE.Mesh(new THREE.ConeGeometry(3.8,1.2,4),new THREE.MeshStandardMaterial({color:0x433a35}));roof.position.set(x,h+.6,z);roof.rotation.y=Math.PI/4;scene.add(roof)}
function makeGateway(x,z){const mat=new THREE.MeshStandardMaterial({color:0xd6a15e});for(const dx of [-4,4]){const p=new THREE.Mesh(new THREE.BoxGeometry(2,7,2),mat);p.position.set(x+dx,3.5,z);scene.add(p)}const top=new THREE.Mesh(new THREE.BoxGeometry(10,1.7,2),mat);top.position.set(x,7,z);scene.add(top);const dome=new THREE.Mesh(new THREE.SphereGeometry(1.8,12,8,0,Math.PI*2,0,Math.PI/2),mat);dome.position.set(x,8,z);scene.add(dome)}
function makeChaiStall(x,z){const body=new THREE.Mesh(new THREE.BoxGeometry(4,2.5,2.2),new THREE.MeshStandardMaterial({color:0x5d3a27}));body.position.set(x,1.25,z);scene.add(body);const roof=new THREE.Mesh(new THREE.BoxGeometry(4.6,.25,2.8),new THREE.MeshStandardMaterial({color:0x9d332b}));roof.position.set(x,2.7,z);scene.add(roof);const sign=new THREE.Mesh(new THREE.BoxGeometry(3,.7,.12),new THREE.MeshStandardMaterial({color:0xe8d6a7}));sign.position.set(x,2.2,z-1.15);scene.add(sign)}
function makeRickshaw(x,z){const m=new THREE.MeshStandardMaterial({color:0x19724b});const body=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.2,3),m);body.position.set(x,.9,z);scene.add(body);const roof=new THREE.Mesh(new THREE.BoxGeometry(2.3,.3,2.7),new THREE.MeshStandardMaterial({color:0x151515}));roof.position.set(x,1.8,z);scene.add(roof);for(const dz of [-1.15,1.15]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.18,12),new THREE.MeshStandardMaterial({color:0x111}));w.rotation.z=Math.PI/2;w.position.set(x,0.45,z+dz);scene.add(w)}}
function makeFlagLine(){for(let i=-20;i<=20;i+=5){const p=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,4,6),new THREE.MeshStandardMaterial({color:0x59463b}));p.position.set(i,5,-24);scene.add(p);const f=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.8),new THREE.MeshStandardMaterial({color:[0xe67e22,0xf5f5f5,0x138a52][Math.floor(Math.random()*3)],side:THREE.DoubleSide}));f.position.set(i-.65,6,-24);scene.add(f)}}
function addWeaponView(){const g=new THREE.Group();const metal=new THREE.MeshStandardMaterial({color:0x25282b,metalness:.7,roughness:.3});const grip=new THREE.Mesh(new THREE.BoxGeometry(.18,.45,.22),new THREE.MeshStandardMaterial({color:0x49372b}));grip.position.set(.18,-.24,-.55);g.add(grip);const barrel=new THREE.Mesh(new THREE.BoxGeometry(.13,.14,.7),metal);barrel.position.set(0,-.03,-.8);g.add(barrel);g.position.set(.42,-.4,-.8);camera.add(g);scene.add(camera);camera.userData.weapon=g}
function setWeapon(w){weapon=w;ammo=w==="pistol"?12:30;$("weaponName").textContent=w==="pistol"?"PISTOL":"AK-47";$("ammo").textContent=ammo+" / ∞";room?.send("weapon",w)}
function reload(){if(reloading)return;reloading=true;setTimeout(()=>{ammo=weapon==="pistol"?12:30;reloading=false;updateHud()},700)}
function shoot(){const now=performance.now(),rate=weapon==="pistol"?300:105;if(reloading||ammo<=0||now-lastShot<rate)return;lastShot=now;ammo--;updateHud();raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const d=raycaster.ray.direction;room.send("shoot",{dx:d.x,dy:d.y,dz:d.z});const w=camera.userData.weapon;w.position.z+=.06;setTimeout(()=>w.position.z-=.06,55)}
function syncState(state){let count=0;state.players.forEach((p,id)=>{count++;if(id===room.sessionId){me=p;camera.position.set(p.x,p.y,p.z);yaw=p.yaw;pitch=p.pitch;$("health").style.width=p.health+"%";$("kills").textContent=p.kills;$("deaths").textContent=p.deaths}else{let o=remote.get(id);if(!o){o=makeRemote(p);remote.set(id,o)}o.position.lerp(new THREE.Vector3(p.x,p.y-.9,p.z),.35);o.userData.label.textContent=p.name}});$("players").textContent=count+" PLAYERS"}
function makeRemote(p){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.9,4,8),new THREE.MeshStandardMaterial({color:0x9c3f35}));body.position.y=-.7;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshStandardMaterial({color:0x8b5a3c}));head.position.y=.05;g.add(head);const label=document.createElement("div");label.style.position="fixed";label.style.color="#fff";label.style.font="11px monospace";label.style.textShadow="0 1px 3px #000";document.body.appendChild(label);g.userData.label=label;scene.add(g);return g}
function move(dt){if(!me)return;let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0);const len=Math.hypot(f,s)||1;f/=len;s/=len;const speed=keys.ShiftLeft?8:5;const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));const pos=camera.position.clone();pos.addScaledVector(forward,f*speed*dt);pos.addScaledVector(right,s*speed*dt);if(keys.Space&&onGround){velocityY=6.5;onGround=false}velocityY-=18*dt;pos.y+=velocityY*dt;if(pos.y<=1.7){pos.y=1.7;velocityY=0;onGround=true}pos.x=THREE.MathUtils.clamp(pos.x,-29,29);pos.z=THREE.MathUtils.clamp(pos.z,-29,29);camera.position.copy(pos);if(room)room.send("input",{x:pos.x,y:pos.y,z:pos.z,yaw,pitch})}
function updateHud(){$("ammo").textContent=ammo+" / ∞"}
function loop(){const dt=Math.min(clock.getDelta(),.05);move(dt);for(const o of remote.values()){const p=o.position.clone().project(camera);const label=o.userData.label;if(p.z<1){label.style.display="block";label.style.left=(p.x*.5+.5)*innerWidth+"px";label.style.top=(-p.y*.5+.5)*innerHeight+"px"}else label.style.display="none"}renderer.render(scene,camera);requestAnimationFrame(loop)}
