-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('seller', 'buyer');

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'seller', 'buyer');

-- Create enum for withdrawal status
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'completed', 'rejected');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(10) NOT NULL UNIQUE,
  region TEXT NOT NULL,
  account_type account_type NOT NULL,
  password_hash TEXT,
  name TEXT,
  profile_picture_url TEXT,
  balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  total_withdrawn DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT phone_format CHECK (phone ~ '^(07|06)\d{8}$')
);

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  year INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  cover_url TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  views INTEGER DEFAULT 0 NOT NULL,
  sales INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_phone VARCHAR(10) NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  transaction_id TEXT NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT buyer_phone_format CHECK (buyer_phone ~ '^(07|06)\d{8}$')
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone VARCHAR(10) NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  status withdrawal_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT phone_format CHECK (phone ~ '^(07|06)\d{8}$'),
  CONSTRAINT min_amount CHECK (amount >= 10000)
);

-- Create deposits table (for buyer credit balance topup)
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone VARCHAR(10) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id TEXT NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT phone_format CHECK (phone ~ '^(07|06)\d{8}$')
);

-- Create temporary passwords table for OTP and password reset
CREATE TABLE public.temporary_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(10) NOT NULL,
  temp_password TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT phone_format CHECK (phone ~ '^(07|06)\d{8}$')
);

-- Insert default categories
INSERT INTO public.categories (name) VALUES
  ('Love stories books'),
  ('Math Books'),
  ('Religious books'),
  ('Science Books');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_passwords ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for books
CREATE POLICY "Anyone can view published books"
  ON public.books FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Sellers can create books"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Sellers can update their own books"
  ON public.books FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own books"
  ON public.books FOR DELETE
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all books"
  ON public.books FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for purchases
CREATE POLICY "Buyers can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Anyone can create purchases"
  ON public.purchases FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all purchases"
  ON public.purchases FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for withdrawals
CREATE POLICY "Sellers can view their own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create withdrawal requests"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for deposits
CREATE POLICY "Buyers can view their own deposits"
  ON public.deposits FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can create deposits"
  ON public.deposits FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all deposits"
  ON public.deposits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for temporary_passwords (service access only)
CREATE POLICY "Service can manage temporary passwords"
  ON public.temporary_passwords FOR ALL
  TO service_role
  USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('book-covers', 'book-covers', true),
  ('book-pdfs', 'book-pdfs', false);

-- Storage policies for book covers (public)
CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Sellers can upload book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers' AND
    public.has_role(auth.uid(), 'seller')
  );

CREATE POLICY "Sellers can update their book covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Admins can manage book covers"
  ON storage.objects FOR ALL
  USING (bucket_id = 'book-covers' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for book PDFs (private, download only for purchasers)
CREATE POLICY "Authenticated users can view PDF metadata"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Sellers can upload book PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-pdfs' AND
    public.has_role(auth.uid(), 'seller')
  );

CREATE POLICY "Sellers can update their book PDFs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'book-pdfs' AND public.has_role(auth.uid(), 'seller'));

CREATE POLICY "Admins can manage book PDFs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'book-pdfs' AND public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  
  -- Assign role based on account_type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'account_type')::user_role
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();