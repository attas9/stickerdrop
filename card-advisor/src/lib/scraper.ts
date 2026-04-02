import * as cheerio from 'cheerio'

const XCANCEL_BASE = 'https://xcancel.com'

export interface ScrapedTweet {
  tweet_id: string
  tweet_url: string
  tweet_text: string
  timestamp: string
  bank_handle: string
}

// Saudi bank X handles to monitor
export const SAUDI_BANK_HANDLES = [
  'alrajhibank',
  'SNBsaudi',
  'riyadbank',
  'SABB',
  'Alinma_Bank',
  'NCBSaudi',
  'BanqueSaudiFransi',
  'anb_sa',
]

export async function scrapeAccountTweets(handle: string, maxTweets = 20): Promise<ScrapedTweet[]> {
  const url = `${XCANCEL_BASE}/${handle}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CardAdvisorBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ar,en;q=0.9',
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const tweets: ScrapedTweet[] = []

  // xcancel.com uses nitter-like HTML structure
  $('.timeline-item, .tweet').each((_, el) => {
    if (tweets.length >= maxTweets) return false

    const $el = $(el)

    // Extract tweet text
    const tweetText = $el.find('.tweet-content, .tweet-body, .content').text().trim()
    if (!tweetText) return

    // Extract tweet link/ID
    const tweetLink = $el.find('a.tweet-link, a[href*="/status/"]').attr('href') || ''
    const tweetIdMatch = tweetLink.match(/\/status\/(\d+)/)
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : `${handle}_${Date.now()}_${tweets.length}`

    // Extract timestamp
    const timestamp = $el.find('time').attr('datetime') || new Date().toISOString()

    tweets.push({
      tweet_id: tweetId,
      tweet_url: `https://x.com/${handle}/status/${tweetId}`,
      tweet_text: tweetText,
      timestamp,
      bank_handle: handle,
    })
  })

  return tweets
}

export async function scrapeAllBankTweets(): Promise<ScrapedTweet[]> {
  const allTweets: ScrapedTweet[] = []

  for (const handle of SAUDI_BANK_HANDLES) {
    try {
      const tweets = await scrapeAccountTweets(handle)
      allTweets.push(...tweets)
      // Small delay between requests to be polite
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`Error scraping @${handle}:`, err)
    }
  }

  return allTweets
}

// Filter tweets that are likely about credit card rewards
export function isRewardRelatedTweet(text: string): boolean {
  const keywords = [
    // English
    'cashback', 'cash back', 'reward', 'points', 'miles', 'offer', 'discount',
    'benefit', 'credit card', 'platinum', 'gold card', '%', 'SAR', 'back',
    // Arabic
    'كاش باك', 'مكافآت', 'نقاط', 'عروض', 'خصم', 'بطاقة', 'استرداد',
    'راجع', 'فائدة', 'مكافأة', 'امتيازات',
  ]

  const lowerText = text.toLowerCase()
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()))
}
