const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const app = express();

// Render automatic PORT assign karta hai, agar na ho to 3000 use hoga
const PORT = process.env.PORT || 3000;

// CORS ko allow karna taake Netlify par chalne wala frontend is backend se baat kar sake
app.use(cors());
app.use(express.json());

// Main download API endpoint jahan frontend request bhejega
app.post('/api/download', (req, res) => {
    const videoUrl = req.body.url;

    if (!videoUrl) {
        return res.status(400).json({ error: "TikTok URL ki zaroorat hai!" });
    }

    // yt-dlp command jo direct video download link fetch karegi (bina watermark ke)
    // --dump-json se humein video ki saari details json format mein mil jati hain
    exec(`yt-dlp --dump-json "${videoUrl}"`, (error, stdout, stderr) => {
        if (error) {
            console.error("yt-dlp error:", stderr);
            return res.status(500).json({ error: "Video fetch karne mein masla hua. Link check karein ya thodi der baad dubara try karein." });
        }

        try {
            const videoData = JSON.parse(stdout);
            
            // yt-dlp direct video streaming link 'url' field mein deta hai
            const directDownloadLink = videoData.url; 
            const videoTitle = videoData.title || "TikTok Video";

            // Frontend ko response bhejna
            res.json({
                success: true,
                title: videoTitle,
                video_url: directDownloadLink
            });
        } catch (e) {
            console.error("JSON parsing error:", e);
            res.status(500).json({ error: "Data process karne mein masla hua." });
        }
    });
});

// Server ko start karna
app.listen(PORT, () => console.log(`Apna Downloader Server running on port ${PORT}`));