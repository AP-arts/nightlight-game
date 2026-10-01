# India Strike — Browser Multiplayer FPS

A browser-playable multiplayer FPS prototype set in an India-inspired urban market district.

## Stack
- Three.js client
- Colyseus authoritative multiplayer server
- Node.js
- Procedural low-poly environment for the first prototype
- Designed to deploy the server on Railway and the client as static files

## Gameplay
- Room code create/join flow
- First-person mouse look + WASD
- Sprint, jump
- Pistol and AK-47
- Hitscan damage
- Health, kills and deaths
- Player nameplates
- India-inspired bazaar streets, chai stall, temple-style gateway, auto-rickshaw props and road layout

## Controls
WASD = move · Shift = sprint · Space = jump · Mouse = aim · Left click = fire · 1/2 = weapon · R = reload · Esc = release cursor

## Asset licensing
The environment is intentionally procedural in this first playable build so the repository stays small and immediately runnable. The next asset pass can use CC0 Kenney packs (buildings/roads/weapons) and Poly Haven/ambientCG materials. Kenney's 3D packs are available under CC0, including Modular Buildings and Blaster Kit.

Multiplayer room architecture follows Colyseus' authoritative room/state model.
