-- UW Assignment Tracker Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- USERS TABLE
-- Stores underwriters and assigners
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('underwriter', 'assigner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- TRACKER STATUS TABLE
-- Stores current status and count for each UW
-- ============================================
CREATE TABLE IF NOT EXISTS tracker_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  status TEXT DEFAULT 'neutral' CHECK (status IN ('green', 'neutral', 'red')),
  count INTEGER DEFAULT 0 CHECK (count >= 0 AND count <= 99),
  status_time TEXT, -- Display time like "8:42 AM"
  status_timestamp BIGINT, -- Epoch ms for sorting
  last_reset_date TEXT, -- Date string for daily reset tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracker_email ON tracker_status(email);

-- ============================================
-- AUDIT LOG TABLE (Optional)
-- Tracks all changes for accountability
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT, -- Email of who performed action
  target TEXT, -- Email of who was affected
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for filtering audit logs
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Everyone can read users (needed to display the board)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Only authenticated users can insert/update/delete (will add admin check later)
CREATE POLICY "Users can be managed by authenticated users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- Tracker status policies
-- Everyone can read tracker status
CREATE POLICY "Tracker status is viewable by everyone" ON tracker_status
  FOR SELECT USING (true);

-- Authenticated users can update tracker status
CREATE POLICY "Tracker status can be updated by authenticated users" ON tracker_status
  FOR ALL USING (auth.role() = 'authenticated');

-- Audit log policies
-- Only authenticated users can read audit log
CREATE POLICY "Audit log is viewable by authenticated users" ON audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can insert audit entries
CREATE POLICY "Audit log entries can be created by authenticated users" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tracker_status_updated_at
  BEFORE UPDATE ON tracker_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA - Initial Users
-- ============================================

-- Insert underwriters
INSERT INTO users (email, name, role) VALUES
  ('brian.mosman@nationslending.com', 'Brian Mosman', 'underwriter'),
  ('jill.beaulieu@nationslending.com', 'Jill Beaulieu', 'underwriter'),
  ('miranda.gammella@nationslending.com', 'Miranda Gammella', 'underwriter'),
  ('ronnie.rasso@nationslending.com', 'Ronnie Rasso', 'underwriter'),
  ('shelley.tobin@nationslending.com', 'Shelley Tobin', 'underwriter'),
  ('lisa.kinsinger@nationslending.com', 'Lisa Kinsinger', 'underwriter'),
  ('mary.butler@nationslending.com', 'Mary Butler', 'underwriter'),
  ('shannon.villasenor@nationslending.com', 'Shannon Villasenor', 'underwriter'),
  ('tonya.ross@nationslending.com', 'Tonya Ross', 'underwriter'),
  ('terry.lunsford@nationslending.com', 'Terry Lunsford', 'underwriter'),
  ('rachel.anselmi@nationslending.com', 'Rachel Anselmi', 'underwriter'),
  ('christie.santucci@nationslending.com', 'Christie Santucci', 'underwriter'),
  ('tamara.johnson@nationslending.com', 'Tamara Johnson', 'underwriter'),
  ('linda.baehr@nationslending.com', 'Linda Baehr', 'underwriter'),
  ('demian.brown@nationslending.com', 'Demian Brown', 'underwriter'),
  ('judy.marsh@nationslending.com', 'Judy Marsh', 'underwriter'),
  ('cindy.hoffman@nationslending.com', 'Cindy Hoffman', 'underwriter'),
  ('tracy.harvey@nationslending.com', 'Tracy Harvey', 'underwriter'),
  ('gaby.degroot@nationslending.com', 'Gaby DeGroot', 'underwriter')
ON CONFLICT (email) DO NOTHING;

-- Insert assigners
INSERT INTO users (email, name, role) VALUES
  ('daniel.obenauf@nationslending.com', 'Daniel Obenauf', 'assigner'),
  ('ricky.hanchett@nationslending.com', 'Ricky Hanchett', 'assigner'),
  ('kylie.mason@nationslending.com', 'Kylie Mason', 'assigner'),
  ('karen.hatfield@nationslending.com', 'Karen Hatfield', 'assigner')
ON CONFLICT (email) DO NOTHING;

-- Initialize tracker status for all underwriters
INSERT INTO tracker_status (email, status, count)
SELECT email, 'neutral', 0 FROM users WHERE role = 'underwriter'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- REALTIME
-- Enable realtime for tracker_status table
-- ============================================
-- Note: You may need to enable this in the Supabase Dashboard:
-- Database > Replication > Add table: tracker_status
