-- Create safepay_transactions table to track SafePay payment transactions
CREATE TABLE IF NOT EXISTS public.safepay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  safepay_token TEXT,
  safepay_reference TEXT,
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (cents)
  currency TEXT NOT NULL DEFAULT 'PKR',
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  customer_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_safepay_transactions_invoice_id ON public.safepay_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_safepay_transactions_token ON public.safepay_transactions(safepay_token);
CREATE INDEX IF NOT EXISTS idx_safepay_transactions_status ON public.safepay_transactions(status);

-- Enable Row Level Security
ALTER TABLE public.safepay_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for safepay_transactions
-- Users can view transactions related to their company's invoices
CREATE POLICY "Users can view their company safepay transactions"
  ON public.safepay_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.user_roles ur ON ur.company_id = i.company_id
      WHERE i.id = safepay_transactions.invoice_id
      AND ur.user_id = auth.uid()
    )
  );

-- Only service role can insert/update transactions (from webhook)
CREATE POLICY "Service role can insert safepay transactions"
  ON public.safepay_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update safepay transactions"
  ON public.safepay_transactions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');