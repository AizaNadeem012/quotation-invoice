/**
 * SafePay Webhook Handler
 *
 * Receives payment status updates from SafePay after a transaction completes.
 * Updates the invoice payment status in Supabase accordingly.
 *
 * Endpoint: POST /api/safepay-webhook
 *
 * This is a Nitro API route that handles POST requests.
 * Nitro exports the handler as the default export.
 */

import { verifyWebhookSignature } from "@/lib/safepay.server";

/**
 * Updates the invoice payment status in Supabase.
 * Uses the Supabase service role key (admin) to bypass RLS.
 */
async function updateInvoicePayment(
  invoiceId: string,
  amountPaid: number,
  invoiceTotal: number
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const newPaid = amountPaid;
    const total = invoiceTotal;
    const status = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "sent";

    const { error } = await supabaseAdmin
      .from("invoices")
      .update({
        amount_paid: newPaid,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (error) {
      console.error(`[SafePay Webhook] Supabase update error:`, error);
      return false;
    }

    console.log(
      `[SafePay Webhook] Invoice ${invoiceId} updated: amount_paid=${newPaid}, status=${status}`
    );
    return true;
  } catch (error) {
    console.error(`[SafePay Webhook] Failed to update invoice:`, error);
    return false;
  }
}

/**
 * Main webhook handler for SafePay payment notifications.
 * Accepts standard Request and returns standard Response.
 */
export async function handler(request: Request): Promise<Response> {
  try {
    // Read the raw body as text for signature verification
    const rawBody = await request.text();
    if (!rawBody) {
      console.error("[SafePay Webhook] Empty request body");
      return new Response(JSON.stringify({ error: "Empty body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Verify webhook signature if webhook secret is configured
    const signature = request.headers.get("x-safepay-signature") || null;
    const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET || "";

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[SafePay Webhook] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Parse the JSON body
    const body = JSON.parse(rawBody);

    console.log(`[SafePay Webhook] Received event: ${body.event || "unknown"}`);

    // Helper to extract data from various payload formats
    const getData = () => body.data || {};
    const getTransaction = () => getData().transaction || getData();

    // Handle different event types
    switch (body.event) {
      case "checkout.completed":
      case "transaction.completed":
      case "payment.completed": {
        const transaction = getTransaction();

        const invoiceId = transaction.invoice_id || getData().invoice_id || "";
        const amountRaw = transaction.amount || 0;
        const amount = typeof amountRaw === "number" && amountRaw > 100
          ? Math.round(amountRaw / 100) // Convert from cents
          : amountRaw;
        const reference = getData().reference || transaction.reference || "";

        console.log(
          `[SafePay Webhook] Payment completed: invoice=${invoiceId}, amount=${amount}, reference=${reference}`
        );

        if (!invoiceId) {
          console.error("[SafePay Webhook] No invoice ID in webhook payload");
          return new Response(JSON.stringify({ received: true, warning: "Missing invoice ID" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        // Fetch the invoice to get the total and existing amount_paid
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: invoice, error: fetchError } = await supabaseAdmin
          .from("invoices")
          .select("total, amount_paid")
          .eq("id", invoiceId)
          .single();

        if (fetchError || !invoice) {
          console.error(`[SafePay Webhook] Invoice not found: ${invoiceId}`, fetchError);
          return new Response(JSON.stringify({ received: true, warning: "Invoice not found" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        const existingPaid = Number(invoice.amount_paid) || 0;
        const totalPaid = existingPaid + amount;

        const success = await updateInvoicePayment(invoiceId, totalPaid, Number(invoice.total));

        if (success) {
          console.log(`[SafePay Webhook] Invoice ${invoiceId} updated successfully`);
        } else {
          console.error(`[SafePay Webhook] Failed to update invoice ${invoiceId}`);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      case "checkout.failed":
      case "payment.failed": {
        console.error(`[SafePay Webhook] Payment failed:`, getData());
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      case "checkout.expired":
      case "payment.expired": {
        console.log(`[SafePay Webhook] Checkout expired:`, getData());
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      default:
        // Unknown event type - log and acknowledge
        console.log(`[SafePay Webhook] Unknown event type: ${body.event}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("[SafePay Webhook] Error processing webhook:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

/** Default export for Nitro routes */
export default handler;