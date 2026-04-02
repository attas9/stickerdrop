export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { compareCards } from '@/lib/compare'

// POST /api/compare
// Body: { card_ids: string[], merchant_name: string, amount?: number }
export async function POST(request: Request) {
  const body = await request.json()
  const { card_ids, merchant_name, amount } = body

  if (!card_ids?.length || !merchant_name) {
    return NextResponse.json(
      { error: 'card_ids and merchant_name are required' },
      { status: 400 }
    )
  }

  try {
    const results = await compareCards(card_ids, merchant_name, amount)
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
