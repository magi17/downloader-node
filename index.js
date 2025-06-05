const express = require('express');
const { ttdl, igdl, fbdl } = require('ruhend-scraper');
const { PornHub } = require('pornhub.js');
const { ytmp3, ytmp4 } = require('kenz-scraper');
const cheerio = require('cheerio');
const axios = require('axios');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const port = 3000;
const pornhub = new PornHub();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Serve index.html from public directory

// Endpoint: localhost:3000/api?url=<video_url>
app.get('/api', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: "Missing 'url' parameter" });
  }

  try {
    const media = await fetchMedia(url);
    if (!media.url && !media.video && !media.audio && !media.download) {
      throw new Error("No media found for this URL.");
    }
    res.json({ success: true, data: media });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: localhost:3000/download?url=<video_url>
app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('Missing video URL');
  }

  try {
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
    });

    const filename = decodeURIComponent(videoUrl.split('/').pop()) || 'video.mp4';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    response.data.pipe(res);
  } catch (err) {
    console.error('Error downloading video:', err.message);
    return res.status(500).send('Failed to download video');
  }
});

// Detect platform based on URL
function detectPlatform(url) {
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("facebook.com")) return "facebook";
  if (url.includes("pornhub.com")) return "pornhub";
  if (url.includes("lootedpinay.com") || url.includes("pinayot.com")) return "pinay";
  return null;
}

// Fetch media URLs based on platform
async function fetchMedia(url) {
  const platform = detectPlatform(url);
  if (!platform) throw new Error("Unsupported URL");

  try {
    switch (platform) {
      case "tiktok": {
        const tiktok = await ttdl(url);
        return { platform, url: tiktok.video };
      }

      case "youtube": {
        const videoData = await ytmp4(url);
        const audioData = await ytmp3(url);
        return {
          platform,
          title: videoData.title,
          author: videoData.author,
          description: videoData.description,
          duration: videoData.duration,
          views: videoData.views,
          upload: videoData.upload,
          thumbnail: videoData.thumbnail,
          video: videoData.video || videoData.url || null,
          audio: audioData.audio || audioData.url || null,
          audio_2: audioData.audio_2 || audioData.url_2 || null,
        };
      }

      case "instagram": {
        const ig = await igdl(url);
        return { platform, url: ig.data.length > 0 ? ig.data[0].url : null };
      }

      case "facebook": {
        const fb = await fbdl(url);
        return { platform, url: fb.data.length > 0 ? fb.data[0].url : null };
      }

      case "pornhub": {
        const video = await pornhub.video(url);
        return {
          platform,
          title: video.title,
          duration: video.duration,
          views: video.views,
          thumbnail: video.thumbnail,
          download: video.download || null,
        };
      }

      case "pinay": {
        const pageRes = await fetch(url);
        if (!pageRes.ok) {
          throw new Error("Failed to fetch page");
        }
        const html = await pageRes.text();
        const $ = cheerio.load(html);

        const video = $('meta[itemprop="contentURL"]').attr('content') || null;
        const thumbnail = $('meta[itemprop="thumbnailUrl"]').attr('content') || null;

        if (!video) {
          throw new Error("Video URL not found in meta tags");
        }

        return {
          platform,
          url: video,
          thumbnail,
        };
      }

      default:
        throw new Error("Platform not supported");
    }
  } catch (error) {
    console.error(`Error fetching ${platform} media:`, error);
    throw new Error(`Failed to fetch ${platform} media.`);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = {
  name: "download",
  category: "media",
  method: "GET",
  usage: "/api?url=",
};
