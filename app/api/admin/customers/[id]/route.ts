import Customer from "@/app/models/customer";
import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";

// GET - Get customer detail (admin only)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Get admin session
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = cookieHeader?.match(/session_token=([^;]+)/)?.[1];
    
    if (!sessionToken) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access only." },
        { status: 401 }
      );
    }
    
    const admin = await RisentaAdm.findOne({ token: sessionToken });
    if (!admin) {
      return NextResponse.json(
        { message: "Unauthorized. Invalid admin session." },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Find customer by ID or customerID
    const customer = await Customer.findOne({
      $or: [{ _id: id }, { customerID: id }]
    }).select('-password');
    
    if (!customer) {
      return NextResponse.json(
        { message: "Customer tidak ditemukan." },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ customer }, { status: 200 });
    
  } catch (error) {
    console.error("Get customer detail error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data customer." },
      { status: 500 }
    );
  }
}

// PUT - Update customer (admin only)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Get admin session
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = cookieHeader?.match(/session_token=([^;]+)/)?.[1];
    
    if (!sessionToken) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access only." },
        { status: 401 }
      );
    }
    
    const admin = await RisentaAdm.findOne({ token: sessionToken });
    if (!admin) {
      return NextResponse.json(
        { message: "Unauthorized. Invalid admin session." },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const updates = await req.json();
    
    // Find customer
    const customer = await Customer.findOne({
      $or: [{ _id: id }, { customerID: id }]
    });
    
    if (!customer) {
      return NextResponse.json(
        { message: "Customer tidak ditemukan." },
        { status: 404 }
      );
    }
    
    // Store old values for audit
    const oldValues = {
      name: customer.name,
      email: customer.email,
      companyName: customer.companyName,
      subscriptionPlan: customer.subscriptionPlan,
      isActive: customer.isActive
    };
    
    // Update fields (exclude sensitive fields)
    const allowedUpdates = ['name', 'companyName', 'subscriptionPlan', 'isActive'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        customer[field] = updates[field];
      }
    });
    
    await customer.save();
    
    // Log the action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'UPDATE_CUSTOMER',
      targetType: 'customer',
      targetCustomerID: customer.customerID,
      targetCustomerEmail: customer.email,
      changes: {
        oldValues,
        newValues: {
          name: customer.name,
          companyName: customer.companyName,
          subscriptionPlan: customer.subscriptionPlan,
          isActive: customer.isActive
        }
      },
      description: `Updated customer ${customer.customerID}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });
    
    return NextResponse.json({
      message: "Customer berhasil diupdate.",
      customer: {
        customerID: customer.customerID,
        name: customer.name,
        email: customer.email,
        companyName: customer.companyName,
        subscriptionPlan: customer.subscriptionPlan,
        isActive: customer.isActive
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate customer." },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate customer (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    // Get admin session
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = cookieHeader?.match(/session_token=([^;]+)/)?.[1];
    
    if (!sessionToken) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access only." },
        { status: 401 }
      );
    }
    
    const admin = await RisentaAdm.findOne({ token: sessionToken });
    if (!admin) {
      return NextResponse.json(
        { message: "Unauthorized. Invalid admin session." },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Find customer
    const customer = await Customer.findOne({
      $or: [{ _id: id }, { customerID: id }]
    });
    
    if (!customer) {
      return NextResponse.json(
        { message: "Customer tidak ditemukan." },
        { status: 404 }
      );
    }
    
    // Soft delete - deactivate instead of hard delete
    customer.isActive = false;
    await customer.save();
    
    // Log the action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'DEACTIVATE_CUSTOMER',
      targetType: 'customer',
      targetCustomerID: customer.customerID,
      targetCustomerEmail: customer.email,
      changes: {
        oldValues: { isActive: true },
        newValues: { isActive: false }
      },
      description: `Deactivated customer ${customer.customerID}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });
    
    return NextResponse.json({
      message: "Customer berhasil dinonaktifkan."
    }, { status: 200 });
    
  } catch (error) {
    console.error("Deactivate customer error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menonaktifkan customer." },
      { status: 500 }
    );
  }
}
