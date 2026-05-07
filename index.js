// ================================
// YouTube Downloader API
// ================================

const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Create downloads folder
const downloadFolder = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder);
}

// --------------------------------
// ROUTE 1: Home - Check API works
// --------------------------------
app.get('/', (req, res) => {
  res.json({
    status: '✅ YouTube Downloader API is Running!',
    usage: {
      getInfo:   'GET /info?url=YOUTUBE_URL',
      download:  'GET /download?url=YOUTUBE_URL&quality=720p',
      audio:     'GET /audio?url=YOUTUBE_URL'
    },
    qualityOptions: ['best', '720p', '480p', '360p', 'worst']
  });
});

// --------------------------------
// ROUTE 2: Get Video Info
// --------------------------------
app.get('/info', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({
      error: '❌ No URL provided',
      example: '/info?url=https://youtube.com/watch?v=dQw4w9WgXcQ'
    });
  }

  try {
    console.log(`📡 Getting info: ${videoUrl}`);

    const info = await ytdlp(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
    });

    res.json({
      success: true,
      title: info.title,
      duration: info.duration + ' seconds',
      uploader: info.uploader,
      views: info.view_count,
      likes: info.like_count,
      thumbnail: info.thumbnail,
      description: info.description
        ? info.description.substring(0, 300) + '...'
        : 'No description',
    });

  } catch (err) {
    console.error('Info error:', err.message);
    res.status(500).json({
      error: '❌ Failed to get info',
      details: err.message
    });
  }
});

// --------------------------------
// ROUTE 3: Download Video
// --------------------------------
app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;
  const quality  = req.query.quality || 'best';

  if (!videoUrl) {
    return res.status(400).json({
      error: '❌ No URL provided',
      example: '/download?url=YOUTUBE_URL&quality=720p'
    });
  }

  try {
    console.log(`⬇️ Downloading: ${videoUrl} | Quality: ${quality}`);

    const timestamp  = Date.now();
    const outputPath = path.join(
      downloadFolder,
      `video_${timestamp}.%(ext)s`
    );

    // Pick format based on quality
    let format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    if (quality === '720p')  format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
    if (quality === '480p')  format = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
    if (quality === '360p')  format = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
    if (quality === 'worst') format = 'worst';

    await ytdlp(videoUrl, {
      format: format,
      output: outputPath,
      noWarnings: true,
      noCheckCertificates: true,
    });

    // Find downloaded file
    const files = fs.readdirSync(downloadFolder);
    const file  = files.find(f => f.startsWith(`video_${timestamp}`));

    if (!file) throw new Error('File not found after download');

    const filePath = path.join(downloadFolder, file);

    // Send file to user then delete it
    res.download(filePath, file, () => {
      fs.unlink(filePath, () => {
        console.log(`🗑️ Deleted: ${file}`);
      });
    });

  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({
      error: '❌ Download failed',
      details: err.message,
      tip: 'Make sure URL is valid and video is public'
    });
  }
});

// --------------------------------
// ROUTE 4: Download Audio Only
// --------------------------------
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({
      error: '❌ No URL provided',
      example: '/audio?url=YOUTUBE_URL'
    });
  }

  try {
    console.log(`🎵 Audio download: ${videoUrl}`);

    const timestamp  = Date.now();
    const outputPath = path.join(
      downloadFolder,
      `audio_${timestamp}.%(ext)s`
    );

    await ytdlp(videoUrl, {
      format: 'bestaudio[ext=m4a]/bestaudio',
      output: outputPath,
      noWarnings: true,
      noCheckCertificates: true,
      extractAudio: true,
    });

    const files = fs.readdirSync(downloadFolder);
    const file  = files.find(f => f.startsWith(`audio_${timestamp}`));

    if (!file) throw new Error('Audio file not found');

    const filePath = path.join(downloadFolder, file);

    res.download(filePath, file, () => {
      fs.unlink(filePath, () => {
        console.log(`🗑️ Deleted: ${file}`);
      });
    });

  } catch (err) {
    console.error('Audio error:', err.message);
    res.status(500).json({
      error: '❌ Audio download failed',
      details: err.message
    });
  }
});

// --------------------------------
// Start Server
// --------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
