'use client';

import { useState, useEffect } from 'react';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { cn } from '@/lib/utils';

interface Customer {
  _id: string;
  customerID: string;
  name: string;
  email: string;
  aiUsage?: {
    planId: string;
    autoGenerateRemaining: number;
    autoGenerateTotal: number;
    promptRemaining: number;
    promptTotal: number;
    planExpiresAt: string | null;
  };
}

interface Plan {
  planId: string;
  name: string;
  price: number;
  limits: {
    autoGenerate: number;
    prompt: number;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    planId: 'free',
    autoGenerateRemaining: 0,
    autoGenerateTotal: 0,
    promptRemaining: 0,
    promptTotal: 0,
    planExpiresAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch customers and plans
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, plansRes] = await Promise.all([
        fetch('/api/admin/customers', { credentials: 'include' }),
        fetch('/api/admin/plans', { credentials: 'include' }),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      planId: customer.aiUsage?.planId || 'free',
      autoGenerateRemaining: customer.aiUsage?.autoGenerateRemaining || 0,
      autoGenerateTotal: customer.aiUsage?.autoGenerateTotal || 0,
      promptRemaining: customer.aiUsage?.promptRemaining || 0,
      promptTotal: customer.aiUsage?.promptTotal || 0,
      planExpiresAt: customer.aiUsage?.planExpiresAt 
        ? new Date(customer.aiUsage.planExpiresAt).toISOString().split('T')[0]
        : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedCustomer) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.customerID}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          planExpiresAt: formData.planExpiresAt || null,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData(); // Refresh data
      } else {
        const error = await res.json();
        alert('Error: ' + error.message);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const applyPlanTemplate = (planId: string) => {
    const plan = plans.find(p => p.planId === planId);
    if (plan) {
      setFormData(prev => ({
        ...prev,
        planId,
        autoGenerateRemaining: plan.limits.autoGenerate === -1 ? -1 : plan.limits.autoGenerate,
        autoGenerateTotal: plan.limits.autoGenerate,
        promptRemaining: plan.limits.prompt === -1 ? -1 : plan.limits.prompt,
        promptTotal: plan.limits.prompt,
      }));
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerID?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanName = (planId: string) => {
    const plan = plans.find(p => p.planId === planId);
    return plan?.name || planId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <AnimatedGridPattern
          className={cn(
            "[mask-image:radial-gradient(white,transparent)]",
            "opacity-20"
          )}
          strokeWidth={1}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Customer Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Kelola plan dan usage AI untuk customer
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari customer by name, email, atau ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Customers Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Auto-generate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Prompt AI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-semibold">
                          {customer.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {customer.name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {customer.email}
                          </div>
                          <div className="text-xs text-slate-400">
                            ID: {customer.customerID}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {getPlanName(customer.aiUsage?.planId || 'free')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {customer.aiUsage?.autoGenerateRemaining === -1 ? (
                        <span className="text-green-600 font-medium">∞</span>
                      ) : (
                        <span>
                          {customer.aiUsage?.autoGenerateRemaining || 0} / {customer.aiUsage?.autoGenerateTotal || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {customer.aiUsage?.promptRemaining === -1 ? (
                        <span className="text-green-600 font-medium">∞</span>
                      ) : (
                        <span>
                          {customer.aiUsage?.promptRemaining || 0} / {customer.aiUsage?.promptTotal || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {customer.aiUsage?.planExpiresAt ? (
                        <span className={new Date(customer.aiUsage.planExpiresAt) < new Date() ? 'text-red-500' : ''}>
                          {new Date(customer.aiUsage.planExpiresAt).toLocaleDateString('id-ID')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(customer)}
                        className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Edit Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              Tidak ada customer yang ditemukan
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Edit Plan: {selectedCustomer.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                ID: {selectedCustomer.customerID}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Plan Template Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Apply Plan Template
                </label>
                <select
                  onChange={(e) => applyPlanTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Pilih plan template --</option>
                  {plans.map((plan) => (
                    <option key={plan.planId} value={plan.planId}>
                      {plan.name} (Auto: {plan.limits.autoGenerate === -1 ? '∞' : plan.limits.autoGenerate}, Prompt: {plan.limits.prompt === -1 ? '∞' : plan.limits.prompt})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Plan ID
                </label>
                <input
                  type="text"
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Auto-generate Remaining
                  </label>
                  <input
                    type="number"
                    value={formData.autoGenerateRemaining}
                    onChange={(e) => setFormData({ ...formData, autoGenerateRemaining: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">-1 untuk unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Auto-generate Total
                  </label>
                  <input
                    type="number"
                    value={formData.autoGenerateTotal}
                    onChange={(e) => setFormData({ ...formData, autoGenerateTotal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prompt Remaining
                  </label>
                  <input
                    type="number"
                    value={formData.promptRemaining}
                    onChange={(e) => setFormData({ ...formData, promptRemaining: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">-1 untuk unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prompt Total
                  </label>
                  <input
                    type="number"
                    value={formData.promptTotal}
                    onChange={(e) => setFormData({ ...formData, promptTotal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Plan Expires At
                </label>
                <input
                  type="date"
                  value={formData.planExpiresAt}
                  onChange={(e) => setFormData({ ...formData, planExpiresAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
