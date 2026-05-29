export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ElevenLabs API key not configured' });

  const { text, voiceId = '9BWtsMINqrJLrRacOk9x', speed = 0.9, stability = 0.45 } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        // speed is a top-level param, NOT inside voice_settings
        speed: Math.min(Math.max(parseFloat(speed), 0.7), 1.2),
        voice_settings: {
          stability:        Math.min(Math.max(parseFloat(stability), 0.1), 1.0),
          similarity_boost: 0.82,
          style:            0.45,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      let errMsg = 'ElevenLabs error';
      try {
        const err = await response.json();
        errMsg = err?.detail?.message || err?.detail || JSON.stringify(err);
      } catch (_) {}
      console.error('ElevenLabs error:', response.status, errMsg);
      return res.status(response.status).json({ error: errMsg });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.byteLength);
    res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
}
