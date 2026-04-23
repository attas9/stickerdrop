import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64, mimeType, vibe, model, mode } = req.body;
  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Missing base64 or mimeType' });
  }

  try {
    const buffer = Buffer.from(base64, 'base64');

    // Build a descriptive filename.
    // - Snapchat shares (mode='share' or default) go to root
    // - Auto-saves of every generation go under gallery/ with vibe + model tags
    const safe = (s = '') => String(s).replace(/[^a-z0-9-]/gi, '').slice(0, 20).toLowerCase();
    const ts = Date.now();
    const filename = mode === 'gallery'
      ? `gallery/${safe(vibe) || 'misc'}-${safe(model) || 'model'}-${ts}.png`
      : `sticker-${ts}.png`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: mode === 'gallery', // prevent collisions on parallel gallery saves
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
