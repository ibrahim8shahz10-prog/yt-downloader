const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const downloadFolder = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder);
}

// HOME
app.get('/', (req, res) => {
  res.json({
    status: '✅ API Running on Railway!',
    routes: {
      info:     '/info?url=YOUTUBE_URL',
      download: '/download?url=YOUTUBE_URL&quality=best',
      audio:    '/audio?url=YOUTUBE_URL'
    }
  });
});

// INFO
app.get('/info', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'Provide url parameter' });

  const cmd = `yt-dlp --dump-json --no-warnings "${videoUrl}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: '❌ Failed to get info',
        details: stderr || error.message
      });
    }
    try {
      const info = JSON.parse(stdout);
      res.json({
        success: true,
        title: info.title,
        duration: info.duration + ' seconds',
        uploader: info.uploader,
        views: info.view_count,
        thumbnail: info.thumbnail,
        description: info.description
          ? info.description.substring(0, 300)
          : 'No description'
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse info' });
    }
  });
});

// DOWNLOAD VIDEO
app.get('/download', (req, res) => {
  const videoUrl = req.query.url;
  const quality  = req.query.quality || 'best';
  if (!videoUrl) return res.status(400).json({ error: 'Provide url parameter' });

  const timestamp  = Date.now();
  const outputPath = path.join(downloadFolder, `video_${timestamp}.%(ext)s`);

  let format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  if (quality === '720p')  format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
  if (quality === '480p')  format = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
  if (quality === '360p')  format = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
  if (quality === 'worst') format = 'worst';

  const cmd = `yt-dlp -f "${format}" -o "${outputPath}" --no-warnings "${videoUrl}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: '❌ Download failed',
        details: stderr || error.message
      });
    }

    const files = fs.readdirSync(downloadFolder);
    const file  = files.find(f => f.startsWith(`video_${timestamp}`));
    if (!file) return res.status(500).json({ error: 'File not found' });

    const filePath = path.join(downloadFolder, file);
    res.download(filePath, file, () => {
      fs.unlink(filePath, () => {});
    });
  });
});

// AUDIO ONLY
app.get('/audio', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'Provide url parameter' });

  const timestamp  = Date.now();
  const outputPath = path.join(downloadFolder, `audio_${timestamp}.%(ext)s`);

  const cmd = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -o "${outputPath}" --no-warnings "${videoUrl}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: '❌ Audio download failed',
        details: stderr || error.message
      });
    }

    const files = fs.readdirSync(downloadFolder);
    const file  = files.find(f => f.startsWith(`audio_${timestamp}`));
    if (!file) return res.status(500).json({ error: 'File not found' });

    const filePath = path.join(downloadFolder, file);
    res.download(filePath, file, () => {
      fs.unlink(filePath, () => {});
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
