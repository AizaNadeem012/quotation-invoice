// Simple test to verify SafePay credentials
import { Safepay } from "@sfpy/node-core";

const SAFEPAY_SECRET_KEY = "695219a475c0fdebaa3ac5e8693979625afdc2bb5a88dba600905e69a535bddc";
const SAFEPAY_API_HOST = "https://sandbox.api.getsafepay.com";

async function testSafePay() {
  console.log("Testing SafePay connection...");
  console.log("Secret Key (first 20 chars):", SAFEPAY_SECRET_KEY.substring(0, 20) + "...");
  console.log("API Host:", SAFEPAY_API_HOST);
  
  try {
    const safepay = new Safepay(SAFEPAY_SECRET_KEY, {
      authType: "secret",
      host: SAFEPAY_API_HOST,
    });

    console.log("\n1. Testing passport creation...");
    const passport = await safepay.client.passport.create({});
    console.log("Passport response:", JSON.stringify(passport, null, 2));
    
    if (!passport.token) {
      console.error("\n❌ FAILED: Passport token is undefined!");
      console.error("This means your SAFEPAY_SECRET_KEY is invalid or your account is not properly configured.");
      console.error("\nPlease check:");
      console.error("1. Your SafePay merchant account is active");
      console.error("2. The secret key is correct (not expired or revoked)");
      console.error("3. Your account has access to the sandbox environment");
      console.error("4. Contact SafePay support to verify your credentials");
      process.exit(1);
    }
    
    console.log("\n✓ Passport token created successfully!");
    console.log("Token (first 30 chars):", passport.token.substring(0, 30) + "...");
    
    console.log("\n2. Testing order configuration with simple tracker...");
    const testTracker = "test123";
    const orderConfig = {
      amount: 100, // 1.00 PKR
      currency: "PKR",
      metadata: {
        test: "true"
      }
    };
    
    await safepay.order.configure.reset(testTracker, orderConfig);
    console.log("✓ Order configured successfully with tracker:", testTracker);
    
    console.log("\n3. Generating checkout URL...");
    const checkoutUrl = safepay.checkout.createCheckoutUrl({
      env: "sandbox",
      source: "hosted",
      tbt: passport.token,
      tracker: testTracker,
      order_id: "test-order",
      cancel_url: "http://localhost:8080/cancel",
      redirect_url: "http://localhost:8080/success",
    });
    
    console.log("✓ Checkout URL generated:", checkoutUrl);
    console.log("\n✅ All tests passed! SafePay is working correctly.");
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Error type:", error.constructor.name);
    console.error("Full error:", error);
    process.exit(1);
  }
}

testSafePay();