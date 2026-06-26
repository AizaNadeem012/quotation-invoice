/**
 * Client-side SafePay integration.
 * 
 * DEPRECATED: This file is no longer used. All SafePay API calls now go through
 * the server function (safepay-functions.server.ts) which uses the official
 * @sfpy/node-core SDK.
 *
 * Do not import from this file. Use createSafePayCheckout from
 * src/lib/safepay-functions.server.ts instead.
 */

export interface CreateCheckoutParams {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  clientName: string;
  clientEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SafePayCheckoutResult {
  success: boolean;
  checkout_url?: string;
  token?: string;
  reference?: string;
  error?: string;
}

/**
 * @deprecated Use createSafePayCheckout from safepay-functions.server.ts instead.
 * This function is no longer implemented as SafePay API calls must be made server-side.
 */
export async function createSafePayCheckoutSession(
  _params: CreateCheckoutParams
): Promise<SafePayCheckoutResult> {
  return {
    success: false,
    error: "This client-side function is deprecated. Use the server function instead.",
  };
}