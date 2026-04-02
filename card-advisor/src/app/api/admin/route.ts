export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/admin?status=pending - get pending updates for review
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const { data, error, count } = await supabaseAdmin
    .from('pending_updates')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

// PATCH /api/admin - approve or reject a pending update
export async function PATCH(request: Request) {
  const body = await request.json()
  const { id, action, override_data } = body as {
    id: string
    action: 'approve' | 'reject'
    override_data?: Record<string, unknown>
  }

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('pending_updates')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'rejected' })
  }

  if (action === 'approve') {
    // Get the pending update
    const { data: update, error: fetchError } = await supabaseAdmin
      .from('pending_updates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    const data = override_data || update.extracted_data

    // Try to find the matching card and create/update reward rule
    if (data?.card_name || data?.bank_name) {
      // Find bank
      const { data: bank } = await supabaseAdmin
        .from('banks')
        .select('id')
        .ilike('name', `%${data.bank_name || ''}%`)
        .limit(1)
        .single()

      if (bank) {
        // Find or match card
        const { data: card } = await supabaseAdmin
          .from('credit_cards')
          .select('id')
          .eq('bank_id', bank.id)
          .ilike('name', `%${data.card_name || ''}%`)
          .limit(1)
          .single()

        if (card && data.reward_rate) {
          // Insert new reward rule
          await supabaseAdmin.from('reward_rules').insert({
            card_id: card.id,
            category: data.category || 'all',
            merchant_name: data.merchant_name || null,
            reward_rate: data.reward_rate,
            valid_until: data.valid_until || null,
            notes: data.notes || `Sourced from @${update.bank_handle} tweet`,
          })
        }
      }
    }

    // Mark as approved
    const { error } = await supabaseAdmin
      .from('pending_updates')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'approved' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
