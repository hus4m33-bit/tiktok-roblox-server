const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
app.use(express.json());

let activeConnections = {};

app.get('/', (req, res) => {
    res.send('Sallam! TikTok-Roblox Server is Running.');
});

app.post('/connect', (req, res) => {
    const { tiktokUsername } = req.body;

    if (!tiktokUsername) {
        return res.status(400).json({ error: 'Username required' });
    }

    if (activeConnections[tiktokUsername]) {
        return res.json({ status: 'Already connected' });
    }

    let tiktokLive = new WebcastPushConnection(tiktokUsername);

    tiktokLive.connect().then(state => {
        console.log(`Connected to TikTok Live: ${tiktokUsername}`);
        activeConnections[tiktokUsername] = tiktokLive;
        res.json({ status: 'Connected successfully', roomId: state.roomId });
    }).catch(err => {
        console.error('Failed to connect:', err);
        res.status(500).json({ error: 'Connection failed', details: err.toString() });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
