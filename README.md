# WatchTogether

A responsive Watch2Gether-style YouTube watch party starter with room codes, shareable invite URLs, synchronized playback events, participant list, and live chat.

## Run locally

1. Install Node.js 18 or newer.
2. Extract this folder.
3. In this folder run:

   ```bash
   npm install
   npm start
   ```

4. Open `http://localhost:3000` in your browser.
5. Open the same address in another browser/device to test rooms. For a phone on the same Wi-Fi, use your computer's local network IP, e.g. `http://192.168.x.x:3000`.

## Deploy

Deploy to a Node.js host that supports long-lived WebSocket connections (for example Render, Railway, or a VPS). Set the start command to `npm start`. Use HTTPS in production. Share the deployed URL plus the six-character room code.

## Included

- Create rooms and join with a six-character code
- Invite link based on `/<ROOMCODE>`
- YouTube URL parsing (watch, youtu.be, shorts, embed)
- Shared video changes and play/pause/seek synchronization events
- Live room chat and online participant list
- Responsive dark premium UI

## Important implementation notes

- This is a runnable starter, not a managed hosted service. It needs Node.js hosting to be reachable by friends over the internet.
- Room state is held in memory. Rooms disappear after the last participant leaves and the cleanup window passes; server restarts clear all rooms. For production scale or multiple server instances, use Redis/database-backed room state and a Socket.IO adapter.
- YouTube embeds may be unavailable for videos whose owners disable embedding, age/region restrictions, or other YouTube restrictions. Use videos that permit embedding.
- Browser autoplay rules may require each participant to interact with the player before playback starts. Synchronization is event-based; it is not frame-perfect.
- The server does not download, proxy, or store YouTube videos. Playback uses the official YouTube IFrame Player API.
- Add rate limiting, moderation/report controls, authentication, stronger input validation, and HTTPS before public production use.


## Netlify + Render deployment

1. Deploy this repository root as a Render Web Service using `npm install` and `npm start`.
2. Copy the Render service URL (for example `https://your-app.onrender.com`).
3. Edit `public/config.js` and replace `https://YOUR-RENDER-SERVICE.onrender.com` with that URL.
4. Deploy the same repository to Netlify. The included `netlify.toml` publishes the `public` folder; `_redirects` supports direct room invite links.
5. Ensure the Render service is deployed and available. The Socket.IO server currently allows cross-origin connections; for a production launch, restrict CORS to your Netlify domain.

For Netlify's Git-based deployment, connect the repository and leave the build command empty; Netlify reads `netlify.toml`.
