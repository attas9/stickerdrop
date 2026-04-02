import { supabase } from './supabase'
import { CompareResult, CreditCard, RewardRule } from '@/types'

// Find which category a merchant belongs to
export async function getMerchantCategory(merchantName: string): Promise<string | null> {
  const { data } = await supabase
    .from('merchants')
    .select('category')
    .or(`name.ilike.%${merchantName}%,aliases.cs.{${merchantName.toLowerCase()}}`)
    .limit(1)
    .single()

  return data?.category || null
}

// Get the best reward rule for a card at a specific merchant
export async function getBestRuleForCard(
  cardId: string,
  merchantName: string,
  category: string | null
): Promise<{ rule: RewardRule | null; rate: number }> {
  const { data: rules } = await supabase
    .from('reward_rules')
    .select('*')
    .eq('card_id', cardId)
    .or(
      [
        `merchant_name.ilike.%${merchantName}%`,
        category ? `category.eq.${category}` : '',
        'category.eq.all',
      ]
        .filter(Boolean)
        .join(',')
    )
    .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().split('T')[0])

  if (!rules || rules.length === 0) {
    // Fall back to base reward rate
    return { rule: null, rate: 0 }
  }

  // Merchant-specific rule takes priority, then highest rate
  const merchantRule = rules.find(r =>
    r.merchant_name?.toLowerCase().includes(merchantName.toLowerCase())
  )
  if (merchantRule) return { rule: merchantRule, rate: merchantRule.reward_rate }

  const best = rules.reduce((a, b) => (a.reward_rate > b.reward_rate ? a : b))
  return { rule: best, rate: best.reward_rate }
}

export async function compareCards(
  cardIds: string[],
  merchantName: string,
  amount?: number
): Promise<CompareResult[]> {
  // Fetch all requested cards with bank info
  const { data: cards } = await supabase
    .from('credit_cards')
    .select('*, bank:banks(*)')
    .in('id', cardIds)
    .eq('is_active', true)

  if (!cards || cards.length === 0) return []

  const category = await getMerchantCategory(merchantName)

  const results: CompareResult[] = await Promise.all(
    cards.map(async (card: CreditCard) => {
      const { rule, rate: specialRate } = await getBestRuleForCard(card.id, merchantName, category)

      // Use special rate if higher than base, otherwise base
      const effectiveRate = Math.max(specialRate, card.base_reward_rate)

      const estimatedReward =
        amount != null ? parseFloat(((amount * effectiveRate) / 100).toFixed(2)) : null

      const rewardLabel =
        card.reward_type === 'cashback'
          ? `${effectiveRate}% cashback`
          : card.reward_type === 'points'
          ? `${effectiveRate} pts/SAR`
          : `${effectiveRate} miles/SAR`

      return {
        card,
        reward_rule: rule,
        reward_rate: effectiveRate,
        estimated_reward: estimatedReward,
        reward_label: rewardLabel,
        is_best: false,
      }
    })
  )

  // Mark the best card
  const maxRate = Math.max(...results.map(r => r.reward_rate))
  results.forEach(r => {
    r.is_best = r.reward_rate === maxRate
  })

  // Sort: best first
  return results.sort((a, b) => b.reward_rate - a.reward_rate)
}
