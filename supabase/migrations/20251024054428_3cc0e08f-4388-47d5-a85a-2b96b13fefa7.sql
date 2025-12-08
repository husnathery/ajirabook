-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION set_random_initial_views()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.views IS NULL OR NEW.views = 0 THEN
    NEW.views := floor(random() * 401 + 100)::integer;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, region, account_type)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'region',
    (NEW.raw_user_meta_data->>'account_type')::account_type
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'account_type')::user_role
  );
  
  RETURN NEW;
END;
$$;