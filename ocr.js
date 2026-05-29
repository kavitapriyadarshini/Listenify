export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { base64, mediaType } = req.body;

    if (!base64 || !mediaType) {
      return res.status(400).json({ error: 'Missing base64 or mediaType' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Extract ALL the text from this image exactly as it appears. 
Rules:
- Preserve paragraph breaks with a blank line between paragraphs
- Join hyphenated line-breaks (e.g. "non-\nconscious" → "nonconscious")
- IMPORTANT: If the first letter of a chapter or paragraph is printed in a large decorative/drop-cap style, you MUST include it as part of the word. For example if a large "W" starts the word "Why", output "Why" not just "hy". If a large "I" starts "It was", output "It was" not "t was". Never omit the enlarged first character.
- If there are two columns, read the left column fully first, then the right column
- Ignore page numbers, headers, footers, and watermarks
- Do NOT add any commentary, just return the raw extracted text`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '';

    return res.status(200).json({ text });

  } catch (err) {
    console.error('OCR error:', err);
    return res.status(500).json({ error: err.message });
  }
}
