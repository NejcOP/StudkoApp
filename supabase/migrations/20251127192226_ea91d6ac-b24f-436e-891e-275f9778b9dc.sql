-- Create AI conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova pogovora',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI messages table
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_conversations
CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
ON public.ai_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.ai_conversations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.ai_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for ai_messages
CREATE POLICY "Users can view messages from their conversations"
ON public.ai_messages
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ai_conversations
  WHERE ai_conversations.id = ai_messages.conversation_id
  AND ai_conversations.user_id = auth.uid()
));

CREATE POLICY "Users can insert messages to their conversations"
ON public.ai_messages
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ai_conversations
  WHERE ai_conversations.id = ai_messages.conversation_id
  AND ai_conversations.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages from their conversations"
ON public.ai_messages
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.ai_conversations
  WHERE ai_conversations.id = ai_messages.conversation_id
  AND ai_conversations.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update conversation timestamp when message is added
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.ai_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_conversation_timestamp();