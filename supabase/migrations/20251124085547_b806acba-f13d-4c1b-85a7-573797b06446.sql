-- Create tutors table
CREATE TABLE IF NOT EXISTS public.tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  location TEXT,
  education_level TEXT,
  school_type TEXT,
  subjects TEXT[] NOT NULL,
  price_per_hour NUMERIC NOT NULL,
  mode TEXT NOT NULL,
  bio TEXT,
  experience TEXT,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutors
CREATE POLICY "Tutors are viewable by everyone"
  ON public.tutors
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can insert their own tutor profile"
  ON public.tutors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutor profile"
  ON public.tutors
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create tutor_reviews table
CREATE TABLE public.tutor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tutor_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tutor_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON public.tutor_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reviews"
  ON public.tutor_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.tutor_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.tutor_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create tutor_applications table
CREATE TABLE public.tutor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  location TEXT,
  education_level TEXT,
  school_type TEXT,
  subjects TEXT[] NOT NULL,
  price_per_hour NUMERIC NOT NULL,
  mode TEXT NOT NULL,
  bio TEXT,
  experience TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_applications
CREATE POLICY "Users can view their own applications"
  ON public.tutor_applications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
  ON public.tutor_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_tutors_user_id ON public.tutors(user_id);
CREATE INDEX idx_tutors_status ON public.tutors(status);
CREATE INDEX idx_tutor_reviews_tutor_id ON public.tutor_reviews(tutor_id);
CREATE INDEX idx_tutor_reviews_user_id ON public.tutor_reviews(user_id);
CREATE INDEX idx_tutor_applications_user_id ON public.tutor_applications(user_id);
CREATE INDEX idx_tutor_applications_status ON public.tutor_applications(status);