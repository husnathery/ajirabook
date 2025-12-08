-- Add AdSense settings to admin_settings
INSERT INTO admin_settings (setting_key, setting_value)
VALUES 
  ('enable_adsense', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create a new table for storing AdSense codes
CREATE TABLE IF NOT EXISTS public.adsense_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_type TEXT NOT NULL UNIQUE,
  ad_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.adsense_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for adsense_settings
CREATE POLICY "Anyone can view active ads"
  ON public.adsense_settings
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage ads"
  ON public.adsense_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_adsense_settings_updated_at
  BEFORE UPDATE ON public.adsense_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();