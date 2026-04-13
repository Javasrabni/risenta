import AdminAudit from "@/app/models/adminAudit";
import connectDB from "@/lib/mongodb";

export interface AuditLogData {
  adminID: string;
  adminName: string;
  isInternalAdmin?: boolean;
  action: string;
  targetType: 'customer' | 'system' | 'referral';
  targetId?: string;
  targetCustomerID?: string;
  targetCustomerEmail?: string;
  changes?: {
    oldValues?: any;
    newValues?: any;
  };
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  subdomain?: string;
}

export async function logAdminAction(data: AuditLogData) {
  try {
    await connectDB();
    
    const auditEntry = new AdminAudit({
      adminID: data.adminID,
      adminName: data.adminName,
      isInternalAdmin: data.isInternalAdmin || false,
      action: data.action,
      targetType: data.targetType,
      targetCustomerID: data.targetCustomerID,
      targetCustomerEmail: data.targetCustomerEmail,
      changes: data.changes || { oldValues: null, newValues: null },
      description: data.description,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      subdomain: data.subdomain || 'write',
      timestamp: new Date()
    });
    
    await auditEntry.save();
    console.log(`Admin action logged: ${data.action} by ${data.adminName}`);
    return true;
  } catch (error) {
    console.error("Failed to log admin action:", error);
    return false;
  }
}

// Helper untuk mendapatkan IP dan User Agent dari request
export function getRequestInfo(req: Request) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown'
  };
}
