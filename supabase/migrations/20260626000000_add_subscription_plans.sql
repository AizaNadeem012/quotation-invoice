-- Add subscription plan support to companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Create subscription_plans enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
  END IF;
END $$;

-- Update the plan column to use the enum type
ALTER TABLE public.companies 
  ALTER COLUMN plan TYPE subscription_plan 
  USING plan::subscription_plan;

-- Create subscription_status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'incomplete');
  END IF;
END $$;

-- Update the subscription_status column to use the enum type
ALTER TABLE public.companies 
  ALTER COLUMN subscription_status TYPE subscription_status 
  USING subscription_status::subscription_status;

-- Create index for quick plan lookups
CREATE INDEX IF NOT EXISTS idx_companies_plan ON public.companies(plan);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies(subscription_status);

-- Update RLS policies to allow users to read their company's plan info
CREATE POLICY "Users can view their company subscription details"
  ON public.companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.company_id = companies.id
      AND ur.user_id = auth.uid()
    )
  );

-- Allow service role to update subscription info
CREATE POLICY "Service role can update company subscriptions"
  ON public.companies
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert default plans for existing companies (all get free plan by default)
UPDATE public.companies 
SET plan = 'free', subscription_status = 'active'
WHERE plan IS NULL OR subscription_status IS NULL;

-- Add comment
COMMENT ON COLUMN public.companies.plan IS 'Subscription plan: free, pro, or enterprise';
COMMENT ON COLUMN public.companies.subscription_status IS 'Subscription status: active, past_due, canceled, or incomplete';
COMMENT ON COLUMN public.companies.subscription_id IS 'External subscription ID from payment provider (e.g., SafePay)';
COMMENT ON COLUMN public.companies.subscription_expires_at IS 'When the current subscription period ends';