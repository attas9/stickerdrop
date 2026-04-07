export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    const buffer = await upstream.arrayBuffer();
    const mimeType = upstream.headers.get('content-type') || 'image/png';
    const base64 = Buffer.from(buffer).toString('base64');
    return res.status(200).json({ dataUrl: `data:${mimeType};base64,${base64}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
