import connectDB from "./mongodb";
import Customer from "@/app/models/customer";
import AIUsageLog from "@/app/models/aiUsageLog";

export type AIActionType = 'auto-generate' | 'prompt';

export interface AIUsageResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

/**
 * Check if customer has remaining quota for AI action
 * Returns the remaining count if allowed, or error message if not
 */
export async function checkAIUsage(
  customerID: string,
  action: AIActionType
): Promise<AIUsageResult> {
  try {
    await connectDB();

    const customer = await Customer.findOne({ customerID });
    if (!customer) {
      return { allowed: false, remaining: 0, error: "Customer tidak ditemukan" };
    }

    // Check if plan has expired
    const now = new Date();
    const planExpired = customer.aiUsage?.planExpiresAt && customer.aiUsage.planExpiresAt < now;

    if (planExpired && customer.subscriptionPlan !== 'free') {
      return { allowed: false, remaining: 0, error: "Plan Anda telah expired. Silakan perpanjang plan." };
    }

    // Check quota based on action type
    if (action === 'auto-generate') {
      const remaining = customer.aiUsage?.autoGenerateRemaining ?? 0;
      const carriedOver = customer.aiUsage?.carriedOverAutoGenerate ?? 0;
      const total = remaining + carriedOver;

      if (total <= 0 && remaining !== -1) {
        return {
          allowed: false,
          remaining: 0,
          error: "Kuota auto-generate Anda telah habis. Silakan tambah kredit atau upgrade plan."
        };
      }

      return { allowed: true, remaining: total };
    } else if (action === 'prompt') {
      const remaining = customer.aiUsage?.promptRemaining ?? 0;
      const carriedOver = customer.aiUsage?.carriedOverPrompt ?? 0;
      const total = remaining + carriedOver;

      if (total <= 0 && remaining !== -1) {
        return {
          allowed: false,
          remaining: 0,
          error: "Kuota prompt AI Anda telah habis. Silakan tambah kredit atau upgrade plan."
        };
      }

      return { allowed: true, remaining: total };
    }

    return { allowed: false, remaining: 0, error: "Invalid action type" };
  } catch (error) {
    console.error("Error checking AI usage:", error);
    return { allowed: false, remaining: 0, error: "Terjadi kesalahan saat memeriksa kuota" };
  }
}

/**
 * Decrement AI usage for customer after successful AI call
 * Returns true if successful, false otherwise
 */
export async function decrementAIUsage(
  customerID: string,
  action: AIActionType,
  success: boolean,
  metadata?: {
    prompt?: string;
    responseLength?: number;
    documentId?: string;
    template?: string;
    topic?: string;
  }
): Promise<boolean> {
  try {
    await connectDB();

    const customer = await Customer.findOne({ customerID });
    if (!customer) {
      console.error("Customer not found for decrement:", customerID);
      return false;
    }

    // Don't decrement for unlimited plans (-1)
    if (action === 'auto-generate') {
      if (customer.aiUsage?.autoGenerateRemaining === -1) {
        // Unlimited plan - still log but don't decrement
        await logAIUsage(customer._id, action, success, metadata);
        return true;
      }

      // First use carried over quota
      if ((customer.aiUsage?.carriedOverAutoGenerate || 0) > 0) {
        customer.aiUsage.carriedOverAutoGenerate -= 1;
      } else if ((customer.aiUsage?.autoGenerateRemaining || 0) > 0) {
        customer.aiUsage.autoGenerateRemaining -= 1;
      }

      customer.aiUsage.totalAutoGenerateUsed += 1;
    } else if (action === 'prompt') {
      if (customer.aiUsage?.promptRemaining === -1) {
        // Unlimited plan - still log but don't decrement
        await logAIUsage(customer._id, action, success, metadata);
        return true;
      }

      // First use carried over quota
      if ((customer.aiUsage?.carriedOverPrompt || 0) > 0) {
        customer.aiUsage.carriedOverPrompt -= 1;
      } else if ((customer.aiUsage?.promptRemaining || 0) > 0) {
        customer.aiUsage.promptRemaining -= 1;
      }

      customer.aiUsage.totalPromptUsed += 1;
    }

    await customer.save();

    // Log usage
    await logAIUsage(customer._id, action, success, metadata);

    return true;
  } catch (error) {
    console.error("Error decrementing AI usage:", error);
    return false;
  }
}

/**
 * Log AI usage to AIUsageLog collection
 */
async function logAIUsage(
  customerId: string,
  action: AIActionType,
  success: boolean,
  metadata?: {
    prompt?: string;
    responseLength?: number;
    documentId?: string;
    template?: string;
    topic?: string;
  }
): Promise<void> {
  try {
    await AIUsageLog.create({
      customerId,
      action,
      success,
      prompt: metadata?.prompt?.substring(0, 1000), // Limit prompt length
      responseLength: metadata?.responseLength || 0,
      metadata: {
        documentId: metadata?.documentId,
        template: metadata?.template,
        topic: metadata?.topic,
      },
    });
  } catch (error) {
    console.error("Error logging AI usage:", error);
    // Don't throw - logging failure shouldn't break the flow
  }
}

/**
 * Get customer ID from session cookie
 * Returns customerID or null if not authenticated
 */
export function getCustomerIDFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const customerSession = cookieHeader.match(/customer_session=([^;]+)/)?.[1];
  const customerID = cookieHeader.match(/customer_id=([^;]+)/)?.[1];

  if (!customerSession || !customerID) return null;

  // Verify session format
  if (!customerSession.startsWith(`customer_${customerID}_`)) return null;

  return customerID;
}

/**
 * Get admin session token from cookie
 * Returns sessionToken or null if not authenticated as admin
 */
export function getAdminSessionFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  return cookieHeader.match(/session_token=([^;]+)/)?.[1] || null;
}

/**
 * Check if user is authenticated (either customer or admin)
 * Returns object with type and id/token
 */
export function getAuthFromCookie(cookieHeader: string | null): 
  | { type: 'customer'; customerID: string }
  | { type: 'admin'; sessionToken: string }
  | null {
  if (!cookieHeader) return null;

  // Check customer auth first
  const customerID = getCustomerIDFromCookie(cookieHeader);
  if (customerID) {
    return { type: 'customer', customerID };
  }

  // Check admin auth
  const sessionToken = getAdminSessionFromCookie(cookieHeader);
  if (sessionToken) {
    return { type: 'admin', sessionToken };
  }

  return null;
}
