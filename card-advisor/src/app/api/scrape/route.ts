export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { scrapeAllBankTweets, scrapeAccountTweets, isRewardRelatedTweet } from '@/lib/scraper'
import { extractRewardData } from '@/lib/extractor'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/scrape - trigger a scrape run
// Body: { handle?: string } — if omitted, scrapes all banks
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { handle } = body as { handle?: string }

  try {
    // Scrape tweets
    const tweets = handle
      ? await scrapeAccountTweets(handle)
      : await scrapeAllBankTweets()

    // Filter to reward-related tweets only
    const relevant = tweets.filter(t => isRewardRelatedTweet(t.tweet_text))

    // Check which tweet IDs already exist in DB
    const tweetIds = relevant.map(t => t.tweet_id)
    const { data: existing } = await supabaseAdmin
      .from('pending_updates')
      .select('tweet_id')
      .in('tweet_id', tweetIds)

    const existingIds = new Set(existing?.map(e => e.tweet_id) || [])
    const newTweets = relevant.filter(t => !existingIds.has(t.tweet_id))

    if (newTweets.length === 0) {
      return NextResponse.json({ message: 'No new reward tweets found', scraped: tweets.length, new: 0 })
    }

    // Extract reward data using Claude
    const processed = []
    for (const tweet of newTweets) {
      const extracted = await extractRewardData(tweet.tweet_text)

      // Only save if extraction has reasonable confidence
      if (!extracted || extracted.confidence < 0.4) continue

      processed.push({
        tweet_id: tweet.tweet_id,
        tweet_url: tweet.tweet_url,
        tweet_text: tweet.tweet_text,
        bank_handle: tweet.bank_handle,
        extracted_data: extracted,
        status: 'pending',
      })
    }

    if (processed.length > 0) {
      const { error } = await supabaseAdmin
        .from('pending_updates')
        .insert(processed)

      if (error) throw error
    }

    return NextResponse.json({
      message: 'Scrape complete',
      scraped: tweets.length,
      relevant: relevant.length,
      new: newTweets.length,
      queued: processed.length,
    })
  } catch (err) {
    console.error('Scrape error:', err)
    return NextResponse.json({ error: 'Scrape failed', details: String(err) }, { status: 500 })
  }
}

// GET /api/scrape - get pending updates count
export async function GET() {
  const { count } = await supabaseAdmin
    .from('pending_updates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ pending_count: count || 0 })
}
