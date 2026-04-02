export interface Bank {
  id: string
  name: string
  name_ar: string
  x_handle: string
  logo_url?: string
}

export interface CreditCard {
  id: string
  bank_id: string
  name: string
  name_ar: string
  card_type: 'visa' | 'mastercard' | 'mada' | 'amex'
  reward_type: 'cashback' | 'points' | 'miles'
  reward_currency?: string // e.g. "Airmiles", "Nqoodha points"
  base_reward_rate: number // percentage or points per SAR
  annual_fee: number
  is_active: boolean
  bank?: Bank
}

export interface RewardRule {
  id: string
  card_id: string
  category: string // 'grocery', 'dining', 'travel', 'fuel', 'shopping', 'online', 'all'
  merchant_name?: string // specific merchant e.g. "Jarir"
  merchant_name_ar?: string
  reward_rate: number // percentage or points per SAR
  max_reward?: number // monthly cap
  valid_from?: string
  valid_until?: string
  notes?: string
  card?: CreditCard
}

export interface PendingUpdate {
  id: string
  tweet_id: string
  tweet_url: string
  tweet_text: string
  bank_handle: string
  extracted_data: ExtractedRewardData | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at?: string
}

export interface ExtractedRewardData {
  card_name?: string
  bank_name?: string
  reward_type?: string
  reward_rate?: number
  category?: string
  merchant_name?: string
  valid_until?: string
  notes?: string
  confidence: number // 0-1
}

export interface CompareRequest {
  card_ids: string[]
  merchant_name: string
  amount?: number
}

export interface CompareResult {
  card: CreditCard
  reward_rule: RewardRule | null
  reward_rate: number
  estimated_reward: number | null
  reward_label: string
  is_best: boolean
}
