'use client'

import { useState, useEffect } from 'react'
import { CreditCard, CompareResult } from '@/types'

export default function Home() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [results, setResults] = useState<CompareResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCards, setLoadingCards] = useState(true)

  useEffect(() => {
    fetch('/api/cards')
      .then(r => r.json())
      .then(d => setCards(d.data || []))
      .finally(() => setLoadingCards(false))
  }, [])

  const toggleCard = (id: string) => {
    setSelectedCards(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleCompare = async () => {
    if (selectedCards.length === 0 || !merchant.trim()) return
    setLoading(true)
    setResults(null)

    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_ids: selectedCards,
        merchant_name: merchant,
        amount: amount ? parseFloat(amount) : undefined,
      }),
    })

    const data = await res.json()
    setResults(data.results || [])
    setLoading(false)
  }

  const cardsByBank = cards.reduce((acc, card) => {
    const bankName = card.bank?.name || 'Other'
    if (!acc[bankName]) acc[bankName] = []
    acc[bankName].push(card)
    return acc
  }, {} as Record<string, CreditCard[]>)

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">بطاقتي الأفضل</h1>
            <p className="text-sm text-gray-500 mt-0.5">اختر أفضل بطاقة ائتمانية لكل عملية شراء</p>
          </div>
          <div className="text-3xl">💳</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Step 1: Select Cards */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            <span className="bg-blue-100 text-blue-700 rounded-full w-7 h-7 inline-flex items-center justify-center text-sm font-bold ml-2">١</span>
            اختر بطاقاتك
          </h2>
          {loadingCards ? (
            <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(cardsByBank).map(([bankName, bankCards]) => (
                <div key={bankName}>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{bankName}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bankCards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => toggleCard(card.id)}
                        className={`text-right p-3 rounded-xl border-2 transition-all ${
                          selectedCards.includes(card.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">{card.name_ar}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {card.reward_type === 'cashback' && `${card.base_reward_rate}% كاش باك`}
                          {card.reward_type === 'points' && `${card.base_reward_rate} نقطة/ريال`}
                          {card.reward_type === 'miles' && `${card.base_reward_rate} ميل/ريال`}
                        </div>
                        {selectedCards.includes(card.id) && (
                          <span className="text-blue-500 text-xs">✓ محدد</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Enter Store */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            <span className="bg-blue-100 text-blue-700 rounded-full w-7 h-7 inline-flex items-center justify-center text-sm font-bold ml-2">٢</span>
            أين ستشتري؟
          </h2>
          <input
            type="text"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            placeholder="مثال: جرير، الدانوب، نون..."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </section>

        {/* Step 3: Amount (optional) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            <span className="bg-blue-100 text-blue-700 rounded-full w-7 h-7 inline-flex items-center justify-center text-sm font-bold ml-2">٣</span>
            المبلغ <span className="text-gray-400 font-normal text-base">(اختياري)</span>
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
            <span className="text-gray-500 font-medium">ريال</span>
          </div>
        </section>

        {/* Compare Button */}
        <button
          onClick={handleCompare}
          disabled={selectedCards.length === 0 || !merchant.trim() || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 rounded-2xl transition-colors text-lg"
        >
          {loading ? 'جاري المقارنة...' : 'قارن الآن'}
        </button>

        {/* Results */}
        {results && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">النتائج</h2>
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
                لا توجد بيانات مكافآت لهذا المتجر
              </div>
            ) : (
              results.map((result, i) => (
                <div
                  key={result.card.id}
                  className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                    result.is_best ? 'border-green-500 shadow-md' : 'border-gray-100'
                  }`}
                >
                  {result.is_best && (
                    <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                      ⭐ الأفضل لهذا المتجر
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{result.card.name_ar}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{result.card.bank?.name_ar}</div>
                      {result.reward_rule?.notes && (
                        <div className="text-xs text-blue-600 mt-1">{result.reward_rule.notes}</div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className={`text-2xl font-bold ${result.is_best ? 'text-green-600' : 'text-gray-700'}`}>
                        {result.reward_label}
                      </div>
                      {result.estimated_reward != null && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          ≈ {result.estimated_reward} ريال
                        </div>
                      )}
                    </div>
                  </div>
                  {i === 0 && results.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      أفضل بـ {(result.reward_rate - results[1].reward_rate).toFixed(1)}% من البطاقة التالية
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {/* Admin link */}
        <div className="text-center pt-4">
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600">لوحة الإدارة</a>
        </div>
      </div>
    </main>
  )
}
