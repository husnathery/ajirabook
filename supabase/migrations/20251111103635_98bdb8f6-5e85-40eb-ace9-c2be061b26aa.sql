-- Add review_status column to books table (enum already exists)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS review_status review_status NOT NULL DEFAULT 'approved';

-- Create admin_settings table for feature toggles
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage settings" ON admin_settings;
DROP POLICY IF EXISTS "Anyone can view settings" ON admin_settings;

-- RLS policies for admin_settings
CREATE POLICY "Admins can manage settings"
ON admin_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Anyone can view settings"
ON admin_settings
FOR SELECT
USING (true);

-- Insert default setting for book review feature (OFF by default)
INSERT INTO admin_settings (setting_key, setting_value)
VALUES ('require_book_review', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Add trigger for admin_settings updated_at
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();