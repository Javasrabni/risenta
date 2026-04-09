"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Building2, Gift, Crown, LogOut, Copy, CheckCircle } from "lucide-react";

interface CustomerData {
  customerID: string;
  email: string;
  name: string;
  companyName: string;
  subscriptionPlan: string;
  referralCode: string;
  emailVerified: boolean;
  createdAt: string;
}

interface ReferralStats {
  totalSignups: number;
  activeReferrals: number;
  convertedToPaid: number;
  totalRevenue: number;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const res = await fetch("/api/customer/auth/me", {
          credentials: 'include'
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch customer data");
        }
        
        const data = await res.json();
        
        if (data.loggedIn) {
          setCustomer(data.customer);
          setReferralStats(data.referralStats);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerData();
  }, [router]);

  const handleLogout = async () => {
    try {
      // Logout
      await fetch("/api/customer/auth/logout", {
        method: "POST",
        credentials: 'include'
      });
      
      // Redirect to login
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const copyReferralCode = () => {
    if (customer?.referralCode) {
      navigator.clipboard.writeText(customer.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'text-purple-400';
      case 'enterprise': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">Selamat datang, {customer.name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Informasi Profil
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Nama</p>
                  <p className="text-white font-medium">{customer.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Email</p>
                  <p className="text-white font-medium">{customer.email}</p>
                </div>
              </div>
              {customer.companyName && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Perusahaan</p>
                    <p className="text-white font-medium">{customer.companyName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Subscription
            </h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Plan Saat Ini</p>
                <p className={`text-2xl font-bold capitalize ${getPlanColor(customer.subscriptionPlan)}`}>
                  {customer.subscriptionPlan}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Customer ID</p>
                <p className="text-white font-mono text-sm">{customer.customerID}</p>
              </div>
            </div>
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Referral Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-400" />
            Program Referral
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-2">Kode Referral Anda</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-lg">
                  {customer.referralCode}
                </code>
                <button
                  onClick={copyReferralCode}
                  className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-slate-500 text-sm mt-2">
                Bagikan kode ini untuk mendapatkan reward!
              </p>
            </div>

            {referralStats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{referralStats.totalSignups}</p>
                  <p className="text-slate-400 text-sm">Total Signup</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{referralStats.activeReferrals}</p>
                  <p className="text-slate-400 text-sm">Referral Aktif</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{referralStats.convertedToPaid}</p>
                  <p className="text-slate-400 text-sm">Upgrade ke Paid</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">${referralStats.totalRevenue}</p>
                  <p className="text-slate-400 text-sm">Total Revenue</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/write/projects" className="bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-6 transition-colors">
            <h3 className="text-lg font-medium text-white mb-2">Proyek Saya</h3>
            <p className="text-slate-400 text-sm">Kelola dokumen dan proyek menulis Anda</p>
          </Link>
          <Link href="/write/templates" className="bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-6 transition-colors">
            <h3 className="text-lg font-medium text-white mb-2">Template</h3>
            <p className="text-slate-400 text-sm">Jelajahi template siap pakai</p>
          </Link>
          <Link href="/write/support" className="bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-6 transition-colors">
            <h3 className="text-lg font-medium text-white mb-2">Support</h3>
            <p className="text-slate-400 text-sm">Butuh bantuan? Hubungi kami</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
