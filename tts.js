export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set in environment' });

  const { text, voiceId = '9BWtsMINqrJLrRacOk9x', speed = 0.9, stability = 0.45 } = req.body || {};
  if (!text) return res.status(400).json({ error: 'No text provided' });

  // Log what we are sending so Vercel logs show it
  console.log('TTS request — voiceId:', voiceId, 'textLength:', text.length, 'speed:', speed);

  const payload = {
    text,
    model_id: 'eleven_turbo_v2',
    speed: Math.min(Math.max(parseFloat(speed) || 0.9, 0.7), 1.2),
    voice_settings: {
      stability:        Math.min(Math.max(parseFloat(stability) || 0.45, 0.1), 1.0),
      similarity_boost: 0.82,
      style:            0.45,
      use_speaker_boost: true
    }
  };

  console.log('Sending to ElevenLabs:', JSON.stringify(payload).substring(0, 200));

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    console.log('ElevenLabs status:', response.status);

    if (!response.ok) {
      const rawText = await response.text();
      console.error('ElevenLabs error body:', rawText);
      let errMsg = rawText;
      try {
        const errJson = JSON.parse(rawText);
        errMsg = errJson?.detail?.message || errJson?.detail || errJson?.error || rawText;
      } catch (_) {}
      return res.status(response.status).json({ error: errMsg });
    }

    const buffer = await response.arrayBuffer();
    console.log('Audio buffer size:', buffer.byteLength);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.byteLength);
    res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('TTS fetch error:', err);
    res.status(500).json({ error: err.message });
  }
}
