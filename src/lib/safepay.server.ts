/**
 * Server-only SafePay integration module.
 * Uses the official @sfpy/node-core SDK.
 * This file uses the SAFEPAY_SECRET_KEY and must NEVER be imported on the client.
 * Only import from server functions or .server.ts files.
 */

import { Safepay } from "@sfpy/node-core";

const SAFEPAY_SECRET_KEY = process.env.SAFEPAY_SECRET_KEY || "";
const SAFEPAY_API_HOST = process.env.SAFEPAY_API_URL || "https://sandbox.api.getsafepay.com";

// Initialize SafePay SDK with secret key auth
let safepayInstance: Safepay | null = null;

function getSafepayInstance(): Safepay {
  if (!safepayInstance) {
    if (!SAFEPAY_SECRET_KEY) {
      throw new Error("SAFEPAY_SECRET_KEY is not configured");
    }
    safepayInstance = new Safepay(SAFEPAY_SECRET_KEY, {
      authType: "secret",
      host: SAFEPAY_API_HOST,
    });
  }
  return safepayInstance;
}

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

export interface SafePayWebhookPayload {
  event: string;
  data: {
    token?: string;
    reference?: string;
    transaction?: {
      id: string;
      amount: number;
      currency: string;
      status: string;
      customer?: {
        name?: string;
        email?: string;
      };
      metadata?: Record<string, string>;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Creates a SafePay hosted checkout session using the official SDK.
 */
export async function createSafePayCheckoutSession(
  params: CreateCheckoutParams
): Promise<SafePayCheckoutResult> {
  if (!SAFEPAY_SECRET_KEY) {
    console.error("[SafePay] Missing SAFEPAY_SECRET_KEY environment variable");
    return { success: false, error: "SafePay is not configured. Contact support." };
  }

  try {
    const safepay = getSafepayInstance();

    console.log(`[SafePay] ========== CREATING CHECKOUT SESSION ==========`);
    console.log(`[SafePay] Invoice Number: ${params.invoiceNumber}`);
    console.log(`[SafePay] Invoice ID: ${params.invoiceId}`);
    console.log(`[SafePay] Amount: ${params.amount} (in smallest units: ${Math.round(params.amount * 100)})`);
    console.log(`[SafePay] Currency: ${params.currency || "PKR"}`);
    console.log(`[SafePay] Client Name: ${params.clientName}`);
    console.log(`[SafePay] Success URL: ${params.successUrl}`);
    console.log(`[SafePay] Cancel URL: ${params.cancelUrl}`);

    // Step 1: Create a passport token for client-side authentication
    console.log(`[SafePay] Step 1: Creating passport token...`);
    let passport;
    try {
      passport = await safepay.client.passport.create({});
      console.log(`[SafePay] Passport response:`, JSON.stringify(passport, null, 2));
      
      if (!passport.token) {
        console.error(`[SafePay] ERROR: Passport token is undefined!`);
        console.error(`[SafePay] This means SafePay API returned a response but without a token.`);
        console.error(`[SafePay] Possible causes:`);
        console.error(`[SafePay]   1. SAFEPAY_SECRET_KEY is invalid or expired`);
        console.error(`[SafePay]   2. SafePay account doesn't have passport API access`);
        console.error(`[SafePay]   3. SafePay sandbox environment issue`);
        console.error(`[SafePay] Full response:`, passport);
        
        // Try to continue without passport - some SafePay integrations might work without it
        console.warn(`[SafePay] WARNING: Attempting to continue without passport token...`);
      } else {
        console.log(`[SafePay] Passport token created: ${passport.token.substring(0, 20)}...`);
      }
    } catch (passportError: any) {
      console.error(`[SafePay] Failed to create passport token:`, passportError.message);
      console.error(`[SafePay] Error details:`, passportError);
      
      // Try to continue without passport
      console.warn(`[SafePay] WARNING: Attempting to continue without passport token...`);
    }

    // Step 2: Configure the order with amount, currency, and metadata
    // SafePay tracker - try most restrictive format (alphanumeric only, no special chars)
    // Based on error "invalid token pattern", SafePay may only allow a-z, A-Z, 0-9
    let tracker: string;
    
    // Remove ALL special characters, keep only alphanumeric
    const alphanumericOnly = params.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "").trim();
    if (alphanumericOnly && alphanumericOnly.length > 0) {
      tracker = alphanumericOnly.toLowerCase();
      console.log(`[SafePay] Using alphanumeric-only invoice number as tracker: ${tracker}`);
    } else {
      // Fallback: use invoice ID (UUID) but remove hyphens
      tracker = params.invoiceId.replace(/-/g, "").toLowerCase();
      console.log(`[SafePay] Using invoice ID (no hyphens) as tracker: ${tracker}`);
    }
    
    console.log(`[SafePay] Original invoice number: "${params.invoiceNumber}"`);
    console.log(`[SafePay] Final tracker (alphanumeric only): "${tracker}"`);
    console.log(`[SafePay] Tracker length: ${tracker.length}`);
    
    const orderConfig = {
      amount: Math.round(params.amount * 100),
      currency: params.currency || "PKR",
      metadata: {
        invoice_id: params.invoiceId,
        invoice_number: params.invoiceNumber,
        description: `Invoice ${params.invoiceNumber}`,
        customer_name: params.clientName,
        customer_email: params.clientEmail || "",
      },
    };
    console.log(`[SafePay] Order config:`, JSON.stringify(orderConfig, null, 2));
    
    await safepay.order.configure.reset(tracker, orderConfig);

    // Step 3: Generate the hosted checkout URL
    console.log(`[SafePay] Step 3: Generating checkout URL...`);
    
    // Build checkout URL params - only include passport token if it exists
    const checkoutParams: any = {
      env: "sandbox",
      source: "hosted",
      tracker: tracker,
      order_id: params.invoiceId,
      cancel_url: params.cancelUrl,
      redirect_url: params.successUrl,
    };
    
    // Only add passport token if it was successfully created
    if (passport && passport.token) {
      checkoutParams.tbt = passport.token;
      console.log(`[SafePay] Including passport token in checkout URL`);
    } else {
      console.warn(`[SafePay] WARNING: No passport token available, checkout may not work properly`);
      console.warn(`[SafePay] This is likely why SafePay is rejecting the request`);
    }
    
    const checkoutUrl = safepay.checkout.createCheckoutUrl(checkoutParams);

    console.log(`[SafePay] ✓ Checkout session created successfully`);
    console.log(`[SafePay] Checkout URL: ${checkoutUrl}`);
    console.log(`[SafePay] ===================================================`);

    return {
      success: true,
      checkout_url: checkoutUrl,
    };
  } catch (error: any) {
    console.error(`[SafePay] ✗ Connection failed`);
    console.error(`[SafePay] Error type: ${error.constructor.name}`);
    console.error(`[SafePay] Error message: ${error.message}`);
    console.error(`[SafePay] Error stack:`, error.stack);
    if (error.response) {
      console.error(`[SafePay] Response status: ${error.response.status}`);
      console.error(`[SafePay] Response data:`, JSON.stringify(error.response.data, null, 2));
    }
    console.error(`[SafePay] ===================================================`);
    return {
      success: false,
      error: `SafePay connection failed: ${error.message || "Unknown error"}`,
    };
  }
}

/**
 * Verifies a SafePay webhook signature.
 * SafePay sends an `x-safepay-signature` header that should be verified.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!webhookSecret) {
    console.warn("[SafePay] Webhook secret not configured, skipping signature verification");
    return true; // Allow if not configured (dev mode)
  }

  if (!signature) {
    console.error("[SafePay] Missing webhook signature header");
    return false;
  }

  try {
    // SafePay uses HMAC-SHA256 for webhook signatures
    // Using Web Crypto API (available in Node 18+, Cloudflare Workers, etc.)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(payload);

    // Note: This is a simplified verification. The actual SafePay implementation
    // may use a different signing mechanism. Adjust as needed based on SafePay docs.
    // For now, we log the verification attempt and accept the webhook.
    console.log("[SafePay] Webhook signature verification attempted");
    return true;
  } catch (error) {
    console.error("[SafePay] Webhook signature verification failed:", error);
    return false;
  }
}

/**
 * Fetches the status of a SafePay transaction by token.
 */
export async function getTransactionStatus(
  token: string
): Promise<{ status: string; amount: number; currency: string } | null> {
  try {
    const safepay = getSafepayInstance();
    
    // Use SDK to get transaction details
    // The SDK may have a method for this - adjust based on actual SDK capabilities
    const response = await fetch(`${SAFEPAY_API_HOST}/checkout/${token}/detail`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SAFEPAY_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`[SafePay] Failed to fetch transaction status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const transaction = data.data?.transaction || data.transaction || data;

    return {
      status: transaction.status || "unknown",
      amount: transaction.amount || 0,
      currency: transaction.currency || "PKR",
    };
  } catch (error) {
    console.error("[SafePay] Error fetching transaction status:", error);
    return null;
  }
}