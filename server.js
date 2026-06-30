const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// ── APNI RAPIDAPI KEY YAHAN LAGAO ──────────────
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '8aba9f3197msha7589af62f7bbe3p1ef07cjsna90d63812975';

// ── CORS Fix — manual headers (works reliably on Render) ──
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// ── Root check ─────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'TikSave Pro Backend Live!', version: '2.0' });
});

// ── Main Download Endpoint ──────────────────────
app.post('/api/download', async (req, res) => {
  const videoUrl = req.body.url;

  if (!videoUrl) {
    return res.status(400).json({ success: false, error: 'TikTok URL provide karein.' });
  }

  console.log('Fetching:', videoUrl);

  try {
    const response = await axios.get('https://tiktok-scraper7.p.rapidapi.com/video/info', {
      params: { url: videoUrl },
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

    // No watermark URL
    const hdUrl  = videoData.play        || videoData.hdplay || '';
    const mp4Url = videoData.wmplay      || videoData.play   || '';
    const mp3Url = videoData.music_info?.play || '';

    const baseUrl  = `https://${req.get('host')}`;
    const title    = (videoData.title || 'TikTok_Video').substring(0, 60);
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
      video_url: `${baseUrl}/api/proxy?url=${encodeURIComponent(hdUrl)}&title=${encodeURIComponent(title)}`,
      mp4_url:   `${baseUrl}/api/proxy?url=${encodeURIComponent(mp4Url)}&title=${encodeURIComponent(title)}&type=mp4`,
      mp3_url:   `${baseUrl}/api/proxy?url=${encodeURIComponent(mp3Url)}&title=${encodeURIComponent(title)}&type=mp3`,
    });

  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + err.message 
    });
  }
});

// ── Proxy Download Route ────────────────────────
app.get('/api/proxy', async (req, res) => {
  const videoUrl   = req.query.url;
  const videoTitle = req.query.title || 'tiksavepro';
  const type       = req.query.type  || 'mp4';

  if (!videoUrl) return res.status(400).json({ error: 'URL missing' });

  try {
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
      }
    });

    const ext         = type === 'mp3' ? 'mp3' : 'mp4';
    const contentType = type === 'mp3' ? 'audio/mpeg' : 'video/mp4';

    res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.${ext}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Stream error: ' + error.message });
  }
});

// ── 404 ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => console.log(`✅ TikSave Pro Backend running on port ${PORT}`));
