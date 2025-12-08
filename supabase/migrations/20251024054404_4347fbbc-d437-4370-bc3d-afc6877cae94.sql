-- Add visible_in_menu column to categories table for admin control
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible_in_menu boolean DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS menu_order integer DEFAULT 0;

-- Add default random views function for books
CREATE OR REPLACE FUNCTION set_random_initial_views()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.views IS NULL OR NEW.views = 0 THEN
    NEW.views := floor(random() * 401 + 100)::integer; -- Random between 100-500
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set random views on book insert
DROP TRIGGER IF EXISTS set_book_initial_views ON books;
CREATE TRIGGER set_book_initial_views
  BEFORE INSERT ON books
  FOR EACH ROW
  EXECUTE FUNCTION set_random_initial_views();

-- Function to increment book views
CREATE OR REPLACE FUNCTION increment_book_views(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE books
  SET views = views + 1
  WHERE id = book_id;
END;
$$;