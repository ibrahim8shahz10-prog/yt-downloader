const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const downloadFolder = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadFolder)) fs.mkdirSync(downloadFolder);

// HOME
app.get('/', (req, res) => {
  res.json({
    status: '✅ YT Downloader API Running!',
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
  if (!videoUrl) return res.status(400).json({ error: 'Provide ?url=' });

  exec(`yt-dlp --dump-json --no-warnings "${videoUrl}"`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr || err.message });
    try {
      const info = JSON.parse(stdout);
      res.json({
        title: info.title,
        duration: info.duration + ' sec',
        uploader: info.uploader,
        views: info.view_count,
        thumbnail: info.thumbnail
      });
    } catch (e) {
      res.status(500).json({ error: 'Parse failed' });
    }
  });
});

// DOWNLOAD VIDEO
app.get('/download', (req, res) => {
  const videoUrl = req.query.url;
  const quality  = req.query.quality || 'best';
  if (!videoUrl) return res.status(400).json({ error: 'Provide ?url=' });

  const timestamp  = Date.now();
  const outputPath = path.join(downloadFolder, `video_${timestamp}.%(ext)s`);

  let format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  if (quality === '720p')  format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
  if (quality === '480p')  format = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
  if (quality === '360p')  format = 'bestvideo[height<=360]+bestaudio/best[height<=360]';

  exec(`yt-dlp -f "${format}" -o "${outputPath}" --no-warnings "${videoUrl}"`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr || err.message });

    const files = fs.readdirSync(downloadFolder);
    const file  = files.find(f => f.startsWith(`video_${timestamp}`));
    if (!file) return res.status(500).json({ error: 'File not found' });

    const filePath = path.join(downloadFolder, file);
    res.download(filePath, file, () => fs.unlink(filePath, () => {}));
  });
});

// AUDIO
app.get('/audio', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'Provide ?url=' });

  const timestamp  = Date.now();
  const outputPath = path.join(downloadFolder, `audio_${timestamp}.%(ext)s`);

  exec(`yt-dlp -f "bestaudio" -o "${outputPath}" --no-warnings "${videoUrl}"`, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr || err.message });

    const files = fs.readdirSync(downloadFolder);
    const file  = files.find(f => f.startsWith(`audio_${timestamp}`));
    if (!file) return res.status(500).json({ error: 'File not found' });

    const filePath = path.join(downloadFolder, file);
    res.download(filePath, file, () => fs.unlink(filePath, () => {}));
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
