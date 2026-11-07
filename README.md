# Uno No Mercy — tiny multiplayer game

Files: `index.html` (the whole game), `server.js` (Node + `ws`, unlimited rooms by code), `package.json`.

## Host it (same as the Ludo game)
1. Put these files in a new GitHub repo.
2. On Render, create a new Web Service from that repo. Build command: `npm install`. Start command: `npm start`.
3. Open the URL, enter nickname + color + any code, then share the invite link from the lobby.

Test locally with `npm install && npm start`, then open http://localhost:3000 in two tabs.

## Rules implemented (2-8 players)
168-card deck. Match color or symbol. If you cannot play, draw until you can. Draw cards (+2, +4, +6, +10, Wild Reverse +4) stack: answer with a draw card of the same or higher value, or take the whole pile and lose your turn. 7 = swap hands with anyone. 0 = everyone passes their hand in the direction of play. Skip, Reverse (acts as Skip with 2 players left), Skip Everyone (play again), Discard All (dump every card of that color from your hand), Wild Color Roulette (next player picks a color and draws until it shows up, then loses their turn). 25 or more cards = knocked out. First to empty their hand wins, or be the last one standing. UNO is called for you automatically.
