-- Create tutor_availability table
CREATE TABLE public.tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(tutor_id, weekday, start_time)
);

-- Create tutor_bookings table
CREATE TABLE public.tutor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  meeting_url TEXT,
  subject TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutor_availability
CREATE POLICY "Availability is viewable by everyone"
  ON public.tutor_availability FOR SELECT
  USING (true);

CREATE POLICY "Tutors can manage their own availability"
  ON public.tutor_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tutors 
      WHERE tutors.id = tutor_availability.tutor_id 
      AND tutors.user_id = auth.uid()
    )
  );

-- RLS Policies for tutor_bookings
CREATE POLICY "Users can view their own bookings"
  ON public.tutor_bookings FOR SELECT
  USING (
    auth.uid() = student_id OR
    EXISTS (
      SELECT 1 FROM public.tutors 
      WHERE tutors.id = tutor_bookings.tutor_id 
      AND tutors.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can create bookings"
  ON public.tutor_bookings FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Tutors can update their bookings"
  ON public.tutor_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tutors 
      WHERE tutors.id = tutor_bookings.tutor_id 
      AND tutors.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can cancel their bookings"
  ON public.tutor_bookings FOR UPDATE
  USING (auth.uid() = student_id AND status = 'pending');

-- Indexes for performance
CREATE INDEX idx_tutor_availability_tutor ON public.tutor_availability(tutor_id);
CREATE INDEX idx_tutor_bookings_tutor ON public.tutor_bookings(tutor_id);
CREATE INDEX idx_tutor_bookings_student ON public.tutor_bookings(student_id);
CREATE INDEX idx_tutor_bookings_status ON public.tutor_bookings(status);
CREATE INDEX idx_tutor_bookings_start_time ON public.tutor_bookings(start_time);

-- Function to update booking updated_at
CREATE OR REPLACE FUNCTION update_tutor_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tutor_bookings_updated_at_trigger
  BEFORE UPDATE ON public.tutor_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_tutor_bookings_updated_at();