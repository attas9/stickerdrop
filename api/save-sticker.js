import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64, mimeType } = req.body;
  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Missing base64 or mimeType' });
  }

  try {
    const buffer = Buffer.from(base64, 'base64');
    const filename = `sticker-${Date.now()}.png`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
