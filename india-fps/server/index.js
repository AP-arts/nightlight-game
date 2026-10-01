import express from "express";
import http from "http";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { BattleRoom } from "./rooms/BattleRoom.js";

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true, game: "india-strike" }));
app.use("/monitor", monitor());

const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("battle", BattleRoom, { maxClients: 12 });

const port = Number(process.env.PORT || 2567);
gameServer.listen(port);
console.log(`India Strike server listening on :${port}`);
