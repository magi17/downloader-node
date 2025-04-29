const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// API to proxy and force download
app.get('/download', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).send('Missing URL');

  try {
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="video.mp4"',
    });

    response.data.pipe(res);
  } catch (error) {
    res.status(500).send('Download failed');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
