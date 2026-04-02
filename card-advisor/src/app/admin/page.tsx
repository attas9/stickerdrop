'use client'

import { useState, useEffect, useCallback } from 'react'
import { PendingUpdate } from '@/types'

type TabType = 'pending' | 'approved' | 'rejected'

export default function AdminPage() {
  const [updates, setUpdates] = useState<PendingUpdate[]>([])
  const [tab, setTab] = useState<TabType>('pending')
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeHandle, setScrapeHandle] = useState('')
  const [scrapeResult, setScrapeResult] = useState<string | null>(null)

  const fetchUpdates = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin?status=${tab}`)
    const data = await res.json()
    setUpdates(data.data || [])
    setLoading(false)
  }, [tab])

  useEffect(() => {
    fetchUpdates()
  }, [fetchUpdates])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setUpdates(prev => prev.filter(u => u.id !== id))
  }

  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrapeHandle ? { handle: scrapeHandle } : {}),
    })
    const data = await res.json()
    setScrapeResult(
      data.error
        ? `خطأ: ${data.error}`
        : `تم: ${data.scraped} تغريدة، ${data.relevant} ذات صلة، ${data.queued} في الانتظار`
    )
    setScraping(false)
    if (tab === 'pending') fetchUpdates()
  }

  const tabLabels: Record<TabType, string> = {
    pending: 'في الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
  }

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">لوحة الإدارة</h1>
            <p className="text-sm text-gray-500">مراجعة التحديثات من حسابات البنوك</p>
          </div>
          <a href="/" className="text-sm text-blue-600 hover:underline">← العودة للتطبيق</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Scrape Control */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">تشغيل المسح من X</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={scrapeHandle}
              onChange={e => setScrapeHandle(e.target.value)}
              placeholder="اسم الحساب (اتركه فارغاً لمسح الكل)"
              className="flex-1 min-w-[200px] border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {scraping ? 'جاري المسح...' : 'مسح الآن'}
            </button>
          </div>
          {scrapeResult && (
            <p className="mt-3 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">{scrapeResult}</p>
          )}
        </section>

        {/* Tabs */}
        <div className="flex gap-2">
          {(Object.keys(tabLabels) as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* Updates List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : updates.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            لا توجد تحديثات
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map(update => (
              <div key={update.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                {/* Tweet info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      @{update.bank_handle}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(update.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <a
                    href={update.tweet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    عرض التغريدة ↗
                  </a>
                </div>

                {/* Tweet text */}
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-3 leading-relaxed">
                  {update.tweet_text}
                </p>

                {/* Extracted data */}
                {update.extracted_data && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {update.extracted_data.card_name && (
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xs text-blue-500">البطاقة</div>
                        <div className="text-sm font-medium text-blue-900">{update.extracted_data.card_name}</div>
                      </div>
                    )}
                    {update.extracted_data.reward_rate != null && (
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-xs text-green-500">نسبة المكافأة</div>
                        <div className="text-sm font-medium text-green-900">{update.extracted_data.reward_rate}%</div>
                      </div>
                    )}
                    {update.extracted_data.category && (
                      <div className="bg-purple-50 rounded-lg p-2">
                        <div className="text-xs text-purple-500">الفئة</div>
                        <div className="text-sm font-medium text-purple-900">{update.extracted_data.category}</div>
                      </div>
                    )}
                    {update.extracted_data.merchant_name && (
                      <div className="bg-orange-50 rounded-lg p-2">
                        <div className="text-xs text-orange-500">المتجر</div>
                        <div className="text-sm font-medium text-orange-900">{update.extracted_data.merchant_name}</div>
                      </div>
                    )}
                    {update.extracted_data.valid_until && (
                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-xs text-red-500">ينتهي في</div>
                        <div className="text-sm font-medium text-red-900">{update.extracted_data.valid_until}</div>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">الثقة</div>
                      <div className="text-sm font-medium text-gray-700">
                        {Math.round((update.extracted_data.confidence || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {tab === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(update.id, 'approve')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      ✓ قبول وتطبيق
                    </button>
                    <button
                      onClick={() => handleAction(update.id, 'reject')}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-sm font-medium transition-colors border border-red-200"
                    >
                      ✗ رفض
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
