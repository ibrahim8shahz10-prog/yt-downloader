// ================================
// YouTube Downloader API
// Works on Vercel ✅
// ================================

const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
app.use(cors());
app.use(express.json());

// --------------------------------
// ROUTE 1: Home
// --------------------------------
app.get('/', (req, res) => {
  res.json({
    status: '✅ YouTube Downloader API is Running!',
    routes: {
      info:     'GET /info?url=YOUTUBE_URL',
      download: 'GET /download?url=YOUTUBE_URL&quality=highestvideo',
      audio:    'GET /audio?url=YOUTUBE_URL'
    },
    qualityOptions: [
      'highestvideo',
      'lowestvideo',
      '720p',
      '480p',
      '360p'
    ]
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

  // Check if valid YouTube URL
  if (!ytdl.validateURL(videoUrl)) {
    return res.status(400).json({
      error: '❌ Invalid YouTube URL',
      tip: 'Make sure URL starts with https://youtube.com or https://youtu.be'
    });
  }

  try {
    console.log(`📡 Getting info: ${videoUrl}`);

    const info = await ytdl.getInfo(videoUrl);
    const details = info.videoDetails;

    res.json({
      success: true,
      title: details.title,
      duration: details.lengthSeconds + ' seconds',
      uploader: details.author.name,
      views: details.viewCount,
      thumbnail: details.thumbnails[details.thumbnails.length - 1].url,
      description: details.description
        ? details.description.substring(0, 300) + '...'
        : 'No description',
      formats: info.formats.map(f => ({
        quality: f.qualityLabel || f.audioQuality,
        container: f.container,
        hasVideo: f.hasVideo,
        hasAudio: f.hasAudio,
        contentLength: f.contentLength
          ? (f.contentLength / 1024 / 1024).toFixed(2) + ' MB'
          : 'unknown'
      })).filter(f => f.quality)
    });

  } catch (err) {
    console.error('Info error:', err.message);
    res.status(500).json({
      error: '❌ Failed to get video info',
      details: err.message
    });
  }
});

// --------------------------------
// ROUTE 3: Download Video
// --------------------------------
app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;
  const quality  = req.query.quality || 'highestvideo';

  if (!videoUrl) {
    return res.status(400).json({
      error: '❌ No URL provided',
      example: '/download?url=YOUTUBE_URL&quality=highestvideo'
    });
  }

  if (!ytdl.validateURL(videoUrl)) {
    return res.status(400).json({
      error: '❌ Invalid YouTube URL'
    });
  }

  try {
    console.log(`⬇️ Download started: ${videoUrl}`);

    // Get video info for filename
    const info    = await ytdl.getInfo(videoUrl);
    const title   = info.videoDetails.title
      .replace(/[^\w\s]/gi, '')  // remove special chars
      .substring(0, 50);

    // Set response headers so browser downloads the file
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Stream video directly to user
    ytdl(videoUrl, {
      quality: quality,
      filter: 'videoandaudio',  // Must have both video and audio
    }).pipe(res);

  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({
      error: '❌ Download failed',
      details: err.message,
      tip: 'Try quality=lowestvideo for smaller files'
    });
  }
});

// --------------------------------
// ROUTE 4: Audio Only (MP3/M4A)
// --------------------------------
app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({
      error: '❌ No URL provided',
      example: '/audio?url=YOUTUBE_URL'
    });
  }

  if (!ytdl.validateURL(videoUrl)) {
    return res.status(400).json({
      error: '❌ Invalid YouTube URL'
    });
  }

  try {
    console.log(`🎵 Audio download: ${videoUrl}`);

    const info  = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title
      .replace(/[^\w\s]/gi, '')
      .substring(0, 50);

    // Set headers for audio download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Stream audio only
    ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
    }).pipe(res);

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
