-- ============================================
-- DAILY SNAPSHOT & RESET CRON JOBS
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================

-- ============================================
-- 1. SNAPSHOT TABLE
-- Stores previous day's status before daily reset
-- ============================================
CREATE TABLE IF NOT EXISTS daily_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'neutral', 'red')),
  count INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching the most recent snapshot
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON daily_snapshot(snapshot_date);

-- Enable RLS
ALTER TABLE daily_snapshot ENABLE ROW LEVEL SECURITY;

-- Everyone can read snapshots
CREATE POLICY "Snapshots are viewable by everyone" ON daily_snapshot
  FOR SELECT USING (true);

-- Allow insert/delete for cron operations (service role)
CREATE POLICY "Snapshots can be managed by service role" ON daily_snapshot
  FOR ALL USING (true);

-- ============================================
-- 2. ENABLE pg_cron EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 3. SNAPSHOT CRON JOB (1:59 AM CST = 7:59 AM UTC)
-- Captures current status before the reset
-- ============================================
SELECT cron.schedule(
  'daily-snapshot',
  '59 7 * * *',  -- 7:59 AM UTC = 1:59 AM CST
  $$
    -- Clear previous snapshot (only keep latest)
    DELETE FROM daily_snapshot;

    -- Insert current status as snapshot
    INSERT INTO daily_snapshot (email, name, status, count, snapshot_date)
    SELECT
      ts.email,
      u.name,
      COALESCE(ts.status, 'neutral'),
      COALESCE(ts.count, 0),
      CURRENT_DATE
    FROM tracker_status ts
    JOIN users u ON u.email = ts.email
    WHERE u.role = 'underwriter';
  $$
);

-- ============================================
-- 4. RESET CRON JOB (2:00 AM CST = 8:00 AM UTC)
-- Resets all statuses to neutral and counts to 0
-- ============================================
SELECT cron.schedule(
  'daily-reset',
  '0 8 * * *',  -- 8:00 AM UTC = 2:00 AM CST
  $$
    UPDATE tracker_status
    SET
      status = 'neutral',
      count = 0,
      status_time = NULL,
      status_timestamp = NULL,
      updated_at = NOW();
  $$
);

-- ============================================
-- VERIFY SCHEDULED JOBS
-- Run this to confirm jobs are scheduled:
-- SELECT * FROM cron.job;
-- ============================================
