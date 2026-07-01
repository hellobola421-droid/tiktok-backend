const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY_HERE';

// ── CORS ───────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

// ── Root check ─────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'TikSave Pro Backend Live!', version: '3.0' });
});

// ── Main Download Endpoint ──────────────────────
// Sirf direct CDN URLs return karta hai — koi proxy nahi
app.post('/api/download', async (req, res) => {
  const videoUrl = req.body.url;

  if (!videoUrl) {
    return res.status(400).json({ success: false, error: 'TikTok URL provide karein.' });
  }

  console.log('Fetching:', videoUrl);

  try {
    const response = await axios.get('https://tiktok-scraper7.p.rapidapi.com/', {
      params: { url: videoUrl, hd: 1 },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com'
      },
      timeout: 30000
    });

    const data = response.data;

    if (!data || data.code !== 0) {
      return res.status(500).json({
        success: false,
        error: 'Video fetch nahi ho saki. Link check karein.'
      });
    }

    const videoData = data.data;

    // Direct CDN URLs — koi proxy nahi, seedha TikTok CDN se download hoga
    const hdUrl  = videoData.hdplay || videoData.play || '';
    const mp4Url = videoData.wmplay || videoData.play || '';
    const mp3Url = videoData.music_info?.play || '';

    const rawTitle = videoData.title || 'TikTok_Video';
    const title    = rawTitle.replace(/[^\x20-\x7E]/g, '').trim().substring(0, 60) || 'TikTok_Video';
    const author   = videoData.author?.nickname || 'unknown';
    const duration = videoData.duration || 0;
    const mins     = Math.floor(duration / 60);
    const secs     = String(duration % 60).padStart(2, '0');

    res.json({
      success:   true,
      title:     title,
      author:    author,
      duration:  `${mins}:${secs}`,
      thumbnail: videoData.cover || '',
      // Direct CDN URLs — user seedha TikTok CDN se download karega
      video_url: hdUrl,
      mp4_url:   mp4Url,
      mp3_url:   mp3Url,
    });

  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + err.message
    });
  }
});

// ── 404 ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => console.log(`✅ TikSave Pro Backend running on port ${PORT}`));
