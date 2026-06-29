const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Root route — server check ──────────────────
app.get('/', (req, res) => {
  res.json({ 
    status: 'TikTok Downloader Backend Live!',
    endpoints: {
      download: 'POST /api/download  body: { url: "tiktok_link" }',
      proxy:    'GET  /api/proxy?url=...&title=...'
    }
  });
});

// ── Main Download Endpoint ─────────────────────
app.post('/api/download', (req, res) => {
  const videoUrl = req.body.url;

  if (!videoUrl) {
    return res.status(400).json({ 
      success: false,
      error: 'TikTok URL provide karein.' 
    });
  }

  console.log('Fetching:', videoUrl);

  // yt-dlp se video info fetch karo
  const cmd = `yt-dlp --dump-json --no-playlist --no-warnings "${videoUrl}"`;

  exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp error:', stderr || error.message);
      return res.status(500).json({ 
        success: false,
        error: 'Video fetch nahi ho saki. TikTok link check karein ya thodi der baad try karein.' 
      });
    }

    try {
      const videoData = JSON.parse(stdout.trim());
      
      // Best quality URL nikalo
      let directUrl = '';
      
      // formats array se best url lo
      if (videoData.formats && videoData.formats.length > 0) {
        // watermark-free format dhundo
        const noWatermark = videoData.formats.find(f => 
          f.url && f.format_note && f.format_note.includes('no_watermark')
        );
        const bestFormat = videoData.formats
          .filter(f => f.url && f.ext === 'mp4')
          .pop();
        
        directUrl = (noWatermark && noWatermark.url) || 
                    (bestFormat && bestFormat.url) || 
                    videoData.url || '';
      } else {
        directUrl = videoData.url || '';
      }

      if (!directUrl) {
        return res.status(500).json({ 
          success: false,
          error: 'Video URL extract nahi ho saki.' 
        });
      }

      const videoTitle = (videoData.title || 'TikTok_Video')
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .trim()
        .substring(0, 50);

      const author = videoData.uploader || videoData.creator || 'unknown';
      const duration = videoData.duration ? 
        `${Math.floor(videoData.duration/60)}:${String(videoData.duration%60).padStart(2,'0')}` : 
        '0:00';

      // Proxy URL banao — direct TikTok URL browser mein block hoti hai
      const baseUrl = `https://${req.get('host')}`;
      const proxyUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(directUrl)}&title=${encodeURIComponent(videoTitle)}`;

      console.log('Success:', videoTitle);

      res.json({
        success: true,
        title: videoTitle,
        author: author,
        duration: duration,
        thumbnail: videoData.thumbnail || '',
        video_url: proxyUrl
      });

    } catch (parseErr) {
      console.error('Parse error:', parseErr.message);
      res.status(500).json({ 
        success: false,
        error: 'Video data process karne mein masla hua.' 
      });
    }
  });
});

// ── Proxy Download Route ───────────────────────
app.get('/api/proxy', async (req, res) => {
  const videoUrl   = req.query.url;
  const videoTitle = req.query.title || 'tiksavepro_video';

  if (!videoUrl) {
    return res.status(400).json({ error: 'URL missing' });
  }

  try {
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      }
    });

    res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Stream error:', err.message);
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Video stream karne mein masla hua.' });
  }
});

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ TikSave Pro Backend running on port ${PORT}`);
});
