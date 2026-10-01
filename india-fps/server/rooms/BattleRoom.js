import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

class Player extends Schema {
  constructor() {
    super();
    this.x = 0;
    this.y = 1.7;
    this.z = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.health = 100;
    this.kills = 0;
    this.deaths = 0;
    this.name = "Player";
    this.weapon = "pistol";
  }
}
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "z");
type("number")(Player.prototype, "yaw");
type("number")(Player.prototype, "pitch");
type("number")(Player.prototype, "health");
type("number")(Player.prototype, "kills");
type("number")(Player.prototype, "deaths");
type("string")(Player.prototype, "name");
type("string")(Player.prototype, "weapon");

class State extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
type({ map: Player })(State.prototype, "players");

const SPAWNS = [
  [-18, 1.7, -18], [18, 1.7, 18], [-18, 1.7, 18], [18, 1.7, -18],
  [0, 1.7, -20], [0, 1.7, 20], [-20, 1.7, 0], [20, 1.7, 0]
];

export class BattleRoom extends Room {
  maxClients = 12;

  onCreate() {
    this.setState(new State());
    this.onMessage("input", (client, input) => this.handleInput(client, input));
    this.onMessage("shoot", (client, shot) => this.handleShot(client, shot));
    this.onMessage("weapon", (client, weapon) => {
      const p = this.state.players.get(client.sessionId);
      if (p && (weapon === "pistol" || weapon === "ak47")) p.weapon = weapon;
    });
    this.onMessage("reload", () => {});
    this.setSimulationInterval(() => this.tick(), 50);
  }

  onJoin(client, options = {}) {
    const p = new Player();
    const spawn = SPAWNS[this.clients.length % SPAWNS.length];
    p.x = spawn[0]; p.y = spawn[1]; p.z = spawn[2];
    p.name = String(options.name || "Player").slice(0, 16);
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
  }

  handleInput(client, input = {}) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (Number.isFinite(input.x)) p.x = Math.max(-28, Math.min(28, input.x));
    if (Number.isFinite(input.y)) p.y = Math.max(1.2, Math.min(12, input.y));
    if (Number.isFinite(input.z)) p.z = Math.max(-28, Math.min(28, input.z));
    if (Number.isFinite(input.yaw)) p.yaw = input.yaw;
    if (Number.isFinite(input.pitch)) p.pitch = Math.max(-1.45, Math.min(1.45, input.pitch));
  }

  handleShot(client, shot = {}) {
    const shooter = this.state.players.get(client.sessionId);
    if (!shooter) return;

    const weapon = shooter.weapon === "ak47" ? {
      damage: 24, range: 70, cooldown: 105
    } : { damage: 34, range: 55, cooldown: 300 };

    const now = Date.now();
    if (shooter._lastShot && now - shooter._lastShot < weapon.cooldown) return;
    shooter._lastShot = now;

    let best = null;
    let bestDist = weapon.range;
    const origin = { x: shooter.x, y: shooter.y, z: shooter.z };
    const dir = normalize({ x: Number(shot.dx) || 0, y: Number(shot.dy) || 0, z: Number(shot.dz) || -1 });

    for (const [id, target] of this.state.players) {
      if (id === client.sessionId || target.health <= 0) continue;
      const to = { x: target.x-origin.x, y: target.y-origin.y, z: target.z-origin.z };
      const along = dot(to, dir);
      if (along <= 0 || along > weapon.range) continue;
      const closest = {
        x: origin.x + dir.x*along,
        y: origin.y + dir.y*along,
        z: origin.z + dir.z*along
      };
      const d2 = (target.x-closest.x)**2 + (target.y-closest.y)**2 + (target.z-closest.z)**2;
      if (d2 < 1.15 && along < bestDist) { best = target; bestDist = along; }
    }

    if (best) {
      best.health = Math.max(0, best.health - weapon.damage);
      if (best.health === 0) {
        shooter.kills += 1;
        best.deaths += 1;
        const spawn = SPAWNS[best.deaths % SPAWNS.length];
        best.x = spawn[0]; best.y = spawn[1]; best.z = spawn[2];
        best.health = 100;
      }
    }
  }

  tick() {
    for (const p of this.state.players.values()) {
      p.y = Math.max(1.2, p.y);
    }
  }
}

function dot(a,b){ return a.x*b.x+a.y*b.y+a.z*b.z; }
function normalize(v){
  const n = Math.hypot(v.x,v.y,v.z) || 1;
  return {x:v.x/n,y:v.y/n,z:v.z/n};
}
