const express = require('express');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
app.use(express.json());

// نخزن هنا كل بث متصل: { username: { connection, position } }
let activeConnections = {};

// ================================
// إعدادات الهدايا - عدّل هذا الجزء حسب رغبتك
// ================================

// أسماء هدايا تخلي الدرجة تنزل بدل ما تطلع (اكتب الاسم بالضبط زي ما يطلع بالـ console)
const NEGATIVE_GIFTS = []; // مثال: ['GG', 'Perfume']

// كم "درجة" تساوي كل هدية، حسب عدد الألماس (Diamonds) حقها
function getStepsForGift(giftData) {
    const diamonds = giftData.diamondCount  1;
    const repeatCount = giftData.repeatCount  1;
    const totalDiamonds = diamonds * repeatCount;

    // سقف أقصى عشان هدية وحدة ما تقفز باللعبة كلها دفعة وحدة
    return Math.min(totalDiamonds, 50);
}

// ================================
// المسارات (Endpoints)
// ================================

app.get('/', (req, res) => {
    res.send('Sallam! TikTok-Roblox Server is Running.');
});

// روبلوكس أو أنت تنادي هذا مرة وحدة عند بداية البث
app.post('/connect', (req, res) => {
    const { tiktokUsername } = req.body;

    if (!tiktokUsername) {
        return res.status(400).json({ error: 'Username required' });
    }

    if (activeConnections[tiktokUsername]) {
        return res.json({
            status: 'Already connected',
            position: activeConnections[tiktokUsername].position
        });
    }

    let tiktokLive = new WebcastPushConnection(tiktokUsername);

    tiktokLive.connect().then(state => {
        console.log(Connected to TikTok Live: ${tiktokUsername});

        activeConnections[tiktokUsername] = {
            connection: tiktokLive,
            position: 0
        };

        // نستمع لكل هدية تجي بالبث
        tiktokLive.on('gift', data => {
            // بعض الهدايا تُرسل بشكل متكرر سريع (streak) - ننتظر لين تخلص العدّة
            if (data.giftType === 1 && data.repeatEnd === false) {
                return;
            }

            const steps = getStepsForGift(data);
            const isNegative = NEGATIVE_GIFTS.includes(data.giftName);
            const change = isNegative ? -steps : steps;

            let conn = activeConnections[tiktokUsername];
            conn.position = Math.max(0, conn.position + change);

            console.log(
                [${tiktokUsername}] هدية: ${data.giftName} x${data.repeatCount || 1} -> الموقع الآن: ${conn.position}
            );
        });

        tiktokLive.on('disconnected', () => {
            console.log(Disconnected from ${tiktokUsername});
        });

        tiktokLive.on('streamEnd', () => {
            console.log(Stream ended for ${tiktokUsername});
            delete activeConnections[tiktokUsername];
        });

        res.json({ status: 'Connected successfully', roomId: state.roomId });
    }).catch(err => {
        console.error('Failed to connect:', err);
        res.status(500).json({ error: 'Connection failed', details: err.toString() });
    });
});

// اللعبة تنادي هذا كل ثانية أو ثانيتين عشان تعرف الموقع الحالي
app.get('/position/:username', (req, res) => {
    const conn = activeConnections[req.params.username];

    if (!conn) {
        return res.status(404).json({ error: 'Not connected. Call /connect first.' });
    }

    res.json({ position: conn.position });
});

// لتصفير الدرجة عند بداية جلسة/بث جديد
app.post('/reset/:username', (req, res) => {
    const conn = activeConnections[req.params.username];

    if (!conn) {
        return res.status(404).json({ error: 'Not connected' });
    }

    conn.position = 0;
    res.json({ status: 'reset', position: 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(Server listening on port ${PORT});
});
