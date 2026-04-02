export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/cards - list all active cards with bank info
export async function GET() {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*, bank:banks(id, name, name_ar, x_handle)')
    .eq('is_active', true)
    .order('bank_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
