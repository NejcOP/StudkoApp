-- Add unique constraint on user_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tutors_user_id_key'
    ) THEN
        ALTER TABLE public.tutors ADD CONSTRAINT tutors_user_id_key UNIQUE (user_id);
    END IF;
END $$;
