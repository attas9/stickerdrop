export default function handler(req, res) {
  const stickerUrl = req.query.sticker;
  if (!stickerUrl) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send('<h1>Missing sticker parameter</h1>');
  }

  // Only allow URLs from Vercel Blob storage to prevent abuse
  if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(stickerUrl)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send('<h1>Invalid sticker URL</h1>');
  }

  // Construct the Snapchat scan URL pointing back to this exact page
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const selfUrl = `${proto}://${host}/api/share?sticker=${encodeURIComponent(stickerUrl)}`;
  const snapUrl = `https://snapchat.com/scan?attachmentUrl=${encodeURIComponent(selfUrl)}`;

  // Server-rendered HTML so Snapchat's crawler can read the meta tags
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StickerDrop ✨</title>

  <meta property="og:site_name" content="StickerDrop">
  <meta property="og:title" content="My StickerDrop sticker">
  <meta property="og:image" content="${stickerUrl}">
  <meta property="snapchat:sticker" content="${stickerUrl}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;800;900&display=swap" rel="stylesheet">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Nunito', sans-serif;
      background: linear-gradient(145deg, #FFF0FA 0%, #F0EEFF 40%, #FFF8E7 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
      gap: 1.5rem;
    }
    .logo {
      font-family: 'Fredoka One', cursive;
      font-size: 2rem;
      background: linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F59E0B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    img.sticker {
      width: 240px;
      height: 240px;
      border-radius: 24px;
      object-fit: contain;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }
    .label {
      font-size: 1rem;
      font-weight: 800;
      color: #6B7280;
      text-align: center;
    }
    .snap-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: #FFFC00;
      color: #000;
      text-decoration: none;
      border-radius: 100px;
      font-weight: 900;
      font-size: 1.1rem;
      box-shadow: 0 6px 22px rgba(255,252,0,0.5);
      transition: transform 0.15s;
    }
    .snap-btn:hover { transform: translateY(-2px); }
    .back-link {
      font-size: 0.85rem;
      color: #7C3AED;
      font-weight: 800;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="logo">StickerDrop ✨</div>
  <img class="sticker" src="${stickerUrl}" alt="Your sticker">
  <div class="label">Tap below to open Snapchat with your sticker 👇</div>
  <a class="snap-btn" href="${snapUrl}">👻 Open in Snapchat</a>
  <a class="back-link" href="/">← Make another sticker</a>
</body>
</html>`);
}
