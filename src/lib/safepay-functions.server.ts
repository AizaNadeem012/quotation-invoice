/**
 * Server functions for SafePay integration.
 * These are TanStack Start server functions that run on the server side only,
 * keeping the SAFEPAY_SECRET_KEY secure and never exposing it to the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { createSafePayCheckoutSession, getTransactionStatus } from "./safepay.server";

/**
 * Type for checkout creation request from the client.
 * This is the validated input shape for the server function.
 */
export interface CreateCheckoutRequest {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  clientName: string;
  clientEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Server function to create a SafePay checkout session.
 * Called from the client-side code but executes on the server.
 * The SAFEPAY_SECRET_KEY is never exposed to the client.
 */
export const createSafePayCheckout = createServerFn({ method: "POST" })
  .validator((data: CreateCheckoutRequest) => {
    // Validate required fields
    if (!data.invoiceId) throw new Error("Invoice ID is required");
    if (!data.invoiceNumber) throw new Error("Invoice number is required");
    if (!data.amount || data.amount <= 0) throw new Error("Valid amount is required");
    if (!data.clientName) throw new Error("Client name is required");
    if (!data.successUrl) throw new Error("Success URL is required");
    if (!data.cancelUrl) throw new Error("Cancel URL is required");

    return data;
  })
  .handler(async ({ data }) => {
    console.log(`[SafePay] Server function: Creating checkout for invoice ${data.invoiceNumber}`);

    const result = await createSafePayCheckoutSession({
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      currency: data.currency || "PKR",
      clientName: data.clientName,
      clientEmail: data.clientEmail || "",
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
    });

    if (!result.success) {
      console.error(`[SafePay] Checkout creation failed: ${result.error}`);
    }

    return result;
  });

/**
 * Server function to check the status of a SafePay transaction.
 */
export const checkSafePayTransactionStatus = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => {
    if (!data.token) throw new Error("Token is required");
    return data;
  })
  .handler(async ({ data }) => {
    return await getTransactionStatus(data.token);
  });