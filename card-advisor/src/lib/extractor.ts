import Anthropic from '@anthropic-ai/sdk'
import { ExtractedRewardData } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const EXTRACTION_PROMPT = `You are an expert at extracting Saudi credit card reward information from Arabic and English social media posts.

Given a tweet from a Saudi bank's official account, extract structured reward/offer data.

Return a JSON object with these fields (use null if not found):
- card_name: string | null (name of the credit card)
- bank_name: string | null (name of the bank)
- reward_type: "cashback" | "points" | "miles" | null
- reward_rate: number | null (percentage or points per SAR, e.g. 5 for 5%)
- category: string | null (one of: "grocery", "dining", "travel", "fuel", "shopping", "online", "all")
- merchant_name: string | null (specific store name if mentioned)
- valid_until: string | null (ISO date string if expiry mentioned)
- notes: string | null (any other important offer details)
- confidence: number (0.0 to 1.0 - how confident you are this is about card rewards)

Only return valid JSON, no explanation.

Tweet text:`

export async function extractRewardData(tweetText: string): Promise<ExtractedRewardData | null> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n${tweetText}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') return null

    const text = content.text.trim()
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n?([\s\S]+?)\n?```/) || text.match(/(\{[\s\S]+\})/)
    if (!jsonMatch) return null

    const data = JSON.parse(jsonMatch[1] || jsonMatch[0]) as ExtractedRewardData
    return data
  } catch (err) {
    console.error('Extraction error:', err)
    return null
  }
}

export async function extractBatchRewards(tweets: Array<{ tweet_id: string; tweet_text: string }>) {
  const results = []

  for (const tweet of tweets) {
    const extracted = await extractRewardData(tweet.tweet_text)
    results.push({ tweet_id: tweet.tweet_id, extracted })
    // Rate limit: ~3 requests/sec for Haiku
    await new Promise(r => setTimeout(r, 350))
  }

  return results
}
