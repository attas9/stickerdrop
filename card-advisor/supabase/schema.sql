-- =============================================
-- Card Advisor - Supabase Database Schema
-- =============================================

-- Banks table
CREATE TABLE banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  x_handle TEXT NOT NULL UNIQUE, -- e.g. "alrajhibank"
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit cards table
CREATE TABLE credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  card_type TEXT CHECK (card_type IN ('visa', 'mastercard', 'mada', 'amex')) DEFAULT 'visa',
  reward_type TEXT CHECK (reward_type IN ('cashback', 'points', 'miles')) DEFAULT 'cashback',
  reward_currency TEXT, -- e.g. "Nqoodha", "Airmiles"
  base_reward_rate DECIMAL(5,2) DEFAULT 0, -- % cashback or points per SAR
  annual_fee DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward rules (category/merchant specific)
CREATE TABLE reward_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'grocery','dining','travel','fuel','shopping','online','all'
  merchant_name TEXT, -- specific merchant e.g. "Jarir"
  merchant_name_ar TEXT,
  reward_rate DECIMAL(5,2) NOT NULL, -- % or points per SAR
  max_reward DECIMAL(10,2), -- monthly SAR cap
  valid_from DATE,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchants/stores directory
CREATE TABLE merchants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  category TEXT NOT NULL,
  aliases TEXT[], -- alternative names for matching
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending updates from X scraping
CREATE TABLE pending_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id TEXT NOT NULL UNIQUE,
  tweet_url TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  bank_handle TEXT NOT NULL,
  extracted_data JSONB,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- =============================================
-- SEED DATA - Saudi Banks
-- =============================================

INSERT INTO banks (name, name_ar, x_handle) VALUES
  ('Al Rajhi Bank', 'مصرف الراجحي', 'alrajhibank'),
  ('Saudi National Bank (SNB)', 'البنك الأهلي السعودي', 'SNBsaudi'),
  ('Riyad Bank', 'بنك الرياض', 'riyadbank'),
  ('SABB', 'البنك السعودي البريطاني', 'SABB'),
  ('Alinma Bank', 'مصرف الإنماء', 'Alinma_Bank'),
  ('Al Ahli Bank (NCB)', 'البنك الأهلي التجاري', 'NCBSaudi'),
  ('Banque Saudi Fransi', 'البنك السعودي الفرنسي', 'BanqueSaudiFransi'),
  ('Arab National Bank', 'البنك العربي الوطني', 'anb_sa');

-- =============================================
-- SEED DATA - Credit Cards
-- =============================================

-- Al Rajhi Cards
INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, base_reward_rate, annual_fee)
SELECT b.id, 'Al Rajhi Cashback Platinum', 'بلاتينيوم كاش باك الراجحي', 'visa', 'cashback', 1.5, 0
FROM banks b WHERE b.x_handle = 'alrajhibank';

INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, reward_currency, base_reward_rate, annual_fee)
SELECT b.id, 'Al Rajhi Travel Card', 'بطاقة سفر الراجحي', 'visa', 'miles', 'Airmiles', 1.0, 500
FROM banks b WHERE b.x_handle = 'alrajhibank';

-- SNB Cards
INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, base_reward_rate, annual_fee)
SELECT b.id, 'SNB Cashback Credit Card', 'بطاقة كاش باك الأهلي', 'visa', 'cashback', 2.0, 0
FROM banks b WHERE b.x_handle = 'SNBsaudi';

INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, reward_currency, base_reward_rate, annual_fee)
SELECT b.id, 'SNB Rewards Card', 'بطاقة مكافآت الأهلي', 'mastercard', 'points', 'Nqoodha', 1.5, 300
FROM banks b WHERE b.x_handle = 'SNBsaudi';

-- Riyad Bank Cards
INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, base_reward_rate, annual_fee)
SELECT b.id, 'Riyad Bank Cashback Card', 'بطاقة كاش باك بنك الرياض', 'visa', 'cashback', 1.5, 0
FROM banks b WHERE b.x_handle = 'riyadbank';

-- SABB Cards
INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, base_reward_rate, annual_fee)
SELECT b.id, 'SABB Platinum Card', 'بطاقة سامبا بلاتينيوم', 'visa', 'cashback', 1.0, 0
FROM banks b WHERE b.x_handle = 'SABB';

-- Alinma Cards
INSERT INTO credit_cards (bank_id, name, name_ar, card_type, reward_type, reward_currency, base_reward_rate, annual_fee)
SELECT b.id, 'Alinma Rewards Card', 'بطاقة مكافآت الإنماء', 'visa', 'points', 'Nqoodha', 2.0, 0
FROM banks b WHERE b.x_handle = 'Alinma_Bank';

-- =============================================
-- SEED DATA - Reward Rules
-- =============================================

-- Al Rajhi Cashback - category bonuses
INSERT INTO reward_rules (card_id, category, reward_rate, notes)
SELECT c.id, 'grocery', 3.0, 'Supermarkets and grocery stores'
FROM credit_cards c WHERE c.name = 'Al Rajhi Cashback Platinum';

INSERT INTO reward_rules (card_id, category, reward_rate, notes)
SELECT c.id, 'dining', 3.0, 'Restaurants and cafes'
FROM credit_cards c WHERE c.name = 'Al Rajhi Cashback Platinum';

INSERT INTO reward_rules (card_id, category, merchant_name, reward_rate, notes)
SELECT c.id, 'shopping', 'Jarir', 2.0, 'Jarir Bookstore'
FROM credit_cards c WHERE c.name = 'Al Rajhi Cashback Platinum';

-- SNB Cashback - category bonuses
INSERT INTO reward_rules (card_id, category, reward_rate, notes)
SELECT c.id, 'grocery', 5.0, 'Grocery and supermarkets'
FROM credit_cards c WHERE c.name = 'SNB Cashback Credit Card';

INSERT INTO reward_rules (card_id, category, reward_rate, notes)
SELECT c.id, 'online', 3.0, 'Online purchases'
FROM credit_cards c WHERE c.name = 'SNB Cashback Credit Card';

INSERT INTO reward_rules (card_id, category, merchant_name, reward_rate, notes)
SELECT c.id, 'shopping', 'Jarir', 3.0, 'Extra cashback at Jarir'
FROM credit_cards c WHERE c.name = 'SNB Cashback Credit Card';

-- Alinma Rewards - category bonuses
INSERT INTO reward_rules (card_id, category, reward_rate, notes)
SELECT c.id, 'dining', 4.0, 'Dining and restaurants'
FROM credit_cards c WHERE c.name = 'Alinma Rewards Card';

INSERT INTO reward_rules (card_id, category, reward_rate, notes)
SELECT c.id, 'travel', 3.0, 'Travel and airlines'
FROM credit_cards c WHERE c.name = 'Alinma Rewards Card';

-- =============================================
-- SEED DATA - Merchants
-- =============================================

INSERT INTO merchants (name, name_ar, category, aliases) VALUES
  ('Jarir Bookstore', 'مكتبة جرير', 'shopping', ARRAY['jarir', 'جرير']),
  ('Al Danube', 'الدانوب', 'grocery', ARRAY['danube', 'الدانوب']),
  ('Panda', 'بندة', 'grocery', ARRAY['panda', 'بنده']),
  ('Carrefour', 'كارفور', 'grocery', ARRAY['carrefour', 'كارفور']),
  ('IKEA', 'ايكيا', 'shopping', ARRAY['ikea', 'ايكيا']),
  ('Noon', 'نون', 'online', ARRAY['noon', 'نون']),
  ('Amazon', 'أمازون', 'online', ARRAY['amazon', 'أمازون']),
  ('McDonald''s', 'ماكدونالدز', 'dining', ARRAY['mcdonalds', 'ماكدونالدز']),
  ('Starbucks', 'ستاربكس', 'dining', ARRAY['starbucks', 'ستاربكس']),
  ('Saudi Aramco', 'أرامكو السعودية', 'fuel', ARRAY['aramco']),
  ('Shell', 'شل', 'fuel', ARRAY['shell']),
  ('Extra', 'إكسترا', 'shopping', ARRAY['extra', 'اكسترا']),
  ('Virgin Megastore', 'فيرجن ميغاستور', 'shopping', ARRAY['virgin']),
  ('Lulu Hypermarket', 'لولو هايبر ماركت', 'grocery', ARRAY['lulu', 'لولو']),
  ('Tamimi Markets', 'أسواق التميمي', 'grocery', ARRAY['tamimi', 'التميمي']);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_credit_cards_bank_id ON credit_cards(bank_id);
CREATE INDEX idx_reward_rules_card_id ON reward_rules(card_id);
CREATE INDEX idx_reward_rules_category ON reward_rules(category);
CREATE INDEX idx_reward_rules_merchant ON reward_rules(merchant_name);
CREATE INDEX idx_pending_updates_status ON pending_updates(status);
CREATE INDEX idx_merchants_name ON merchants USING gin(aliases);
