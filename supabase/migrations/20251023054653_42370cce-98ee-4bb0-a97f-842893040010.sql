-- Fix security warnings by setting search_path
CREATE OR REPLACE FUNCTION increment_buyer_balance(buyer_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = buyer_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_buyer_balance(buyer_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET balance = balance - amount
  WHERE id = buyer_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_seller_balance(seller_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = seller_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_book_sales(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE books
  SET sales = sales + 1
  WHERE id = book_id;
END;
$$;