import express from 'express';
import cors from 'cors';
import db from './firestore.js';

const app = express();
const PORT = process.env.PORT || 3000;

const VERSION = '1.0.0';
console.log(`📺 Cable Connection Tracker v${VERSION}`);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

// ============ DASHBOARD STATS ============

app.get('/api/stats', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all customers
    const customersSnapshot = await db.collection('cable_customers').get();

    let totalActive = 0;
    let totalInactive = 0;
    let totalMonthlyAmount = 0;

    const customerIds = [];
    customersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') {
        totalActive++;
        totalMonthlyAmount += data.monthly_amount || 0;
        customerIds.push(doc.id);
      } else {
        totalInactive++;
      }
    });

    // Get payments for current month
    const paymentsSnapshot = await db.collection('cable_payments')
      .where('month', '==', currentMonth)
      .get();

    let collectedThisMonth = 0;
    const paidCustomerIds = new Set();

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      collectedThisMonth += data.amount || 0;
      paidCustomerIds.add(data.customer_id);
    });

    // Calculate pending
    let pendingThisMonth = 0;
    customersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active' && !paidCustomerIds.has(doc.id)) {
        pendingThisMonth += data.monthly_amount || 0;
      }
    });

    res.json({
      totalCustomers: customersSnapshot.size,
      totalActive,
      totalInactive,
      collectedThisMonth,
      pendingThisMonth,
      totalMonthlyAmount,
      currentMonth
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ CUSTOMER ROUTES ============

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const { status, search } = req.query;

    const snapshot = await db.collection('cable_customers').get();

    let customers = [];
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };

      // Filter by status if provided
      if (status && data.status !== status) return;

      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = data.name?.toLowerCase().includes(searchLower);
        const phoneMatch = data.phone?.includes(search);
        const stbMatch = data.stb_number?.toLowerCase().includes(searchLower);
        const areaMatch = data.area?.toLowerCase().includes(searchLower);
        if (!nameMatch && !phoneMatch && !stbMatch && !areaMatch) return;
      }

      customers.push(data);
    });

    // Sort by created_at descending
    customers.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single customer
app.get('/api/customers/:id', async (req, res) => {
  try {
    const doc = await db.collection('cable_customers').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create customer
app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, address, stb_number, monthly_amount, area } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const customerData = {
      name,
      phone,
      address: address || '',
      stb_number: stb_number || '',
      monthly_amount: parseFloat(monthly_amount) || 0,
      area: area || '',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const docRef = await db.collection('cable_customers').add(customerData);

    res.status(201).json({ id: docRef.id, ...customerData });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update customer
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, phone, address, stb_number, monthly_amount, area, status } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (stb_number !== undefined) updateData.stb_number = stb_number;
    if (monthly_amount !== undefined) updateData.monthly_amount = parseFloat(monthly_amount);
    if (area !== undefined) updateData.area = area;
    if (status !== undefined) updateData.status = status;

    await db.collection('cable_customers').doc(req.params.id).update(updateData);

    const doc = await db.collection('cable_customers').doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Archive/Inactivate customer
app.put('/api/customers/:id/archive', async (req, res) => {
  try {
    await db.collection('cable_customers').doc(req.params.id).update({
      status: 'inactive',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Customer archived successfully' });
  } catch (error) {
    console.error('Error archiving customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reactivate customer
app.put('/api/customers/:id/reactivate', async (req, res) => {
  try {
    await db.collection('cable_customers').doc(req.params.id).update({
      status: 'active',
      archived_at: null,
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Customer reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
  try {
    // Also delete all payments for this customer
    const paymentsSnapshot = await db.collection('cable_payments')
      .where('customer_id', '==', req.params.id)
      .get();

    const batch = db.batch();
    paymentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    batch.delete(db.collection('cable_customers').doc(req.params.id));

    await batch.commit();

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PAYMENT ROUTES ============

// Get collection for a month
app.get('/api/collection', async (req, res) => {
  try {
    const { month } = req.query;

    // Default to current month
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all active customers
    const customersSnapshot = await db.collection('cable_customers')
      .where('status', '==', 'active')
      .get();

    // Get payments for the month
    const paymentsSnapshot = await db.collection('cable_payments')
      .where('month', '==', targetMonth)
      .get();

    // Create payment lookup
    const paymentsByCustomer = {};
    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      paymentsByCustomer[data.customer_id] = { id: doc.id, ...data };
    });

    // Build collection list
    const collection = [];
    customersSnapshot.forEach(doc => {
      const customer = doc.data();
      const payment = paymentsByCustomer[doc.id];

      collection.push({
        customer_id: doc.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        stb_number: customer.stb_number,
        area: customer.area,
        monthly_amount: customer.monthly_amount,
        payment_id: payment?.id || null,
        paid: !!payment,
        paid_date: payment?.paid_date || null,
        paid_amount: payment?.amount || 0,
        payment_mode: payment?.payment_mode || null,
        whatsapp_sent: payment?.whatsapp_sent || false
      });
    });

    // Sort: unpaid first, then by name
    collection.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return a.customer_name.localeCompare(b.customer_name);
    });

    res.json({
      month: targetMonth,
      collection,
      summary: {
        total: collection.length,
        paid: collection.filter(c => c.paid).length,
        unpaid: collection.filter(c => !c.paid).length,
        collected: collection.reduce((sum, c) => sum + (c.paid_amount || 0), 0),
        pending: collection.reduce((sum, c) => sum + (c.paid ? 0 : c.monthly_amount), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark payment as paid
app.post('/api/payments', async (req, res) => {
  try {
    const { customer_id, month, amount, payment_mode } = req.body;

    if (!customer_id || !month) {
      return res.status(400).json({ error: 'Customer ID and month are required' });
    }

    // Check if payment already exists
    const existingPayment = await db.collection('cable_payments')
      .where('customer_id', '==', customer_id)
      .where('month', '==', month)
      .get();

    if (!existingPayment.empty) {
      return res.status(400).json({ error: 'Payment already exists for this month' });
    }

    // Get customer details
    const customerDoc = await db.collection('cable_customers').doc(customer_id).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerDoc.data();
    const paymentAmount = amount || customer.monthly_amount;

    const paymentData = {
      customer_id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      month,
      amount: parseFloat(paymentAmount),
      payment_mode: payment_mode || 'cash',
      paid_date: new Date().toISOString(),
      whatsapp_sent: false,
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('cable_payments').add(paymentData);

    res.status(201).json({ id: docRef.id, ...paymentData });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Undo payment (delete)
app.delete('/api/payments/:id', async (req, res) => {
  try {
    await db.collection('cable_payments').doc(req.params.id).delete();
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark WhatsApp sent
app.put('/api/payments/:id/whatsapp-sent', async (req, res) => {
  try {
    await db.collection('cable_payments').doc(req.params.id).update({
      whatsapp_sent: true,
      whatsapp_sent_at: new Date().toISOString()
    });
    res.json({ message: 'WhatsApp status updated' });
  } catch (error) {
    console.error('Error updating WhatsApp status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment history for a customer
app.get('/api/customers/:id/payments', async (req, res) => {
  try {
    const snapshot = await db.collection('cable_payments')
      .where('customer_id', '==', req.params.id)
      .get();

    const payments = [];
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    // Sort by month descending
    payments.sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ REPORTS ============

// Get monthly report
app.get('/api/reports/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all payments for the month
    const paymentsSnapshot = await db.collection('cable_payments')
      .where('month', '==', targetMonth)
      .get();

    const payments = [];
    let totalCollected = 0;

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      payments.push({ id: doc.id, ...data });
      totalCollected += data.amount || 0;
    });

    // Get all active customers for pending calculation
    const customersSnapshot = await db.collection('cable_customers')
      .where('status', '==', 'active')
      .get();

    const paidCustomerIds = new Set(payments.map(p => p.customer_id));
    let totalPending = 0;
    const unpaidCustomers = [];

    customersSnapshot.forEach(doc => {
      const data = doc.data();
      if (!paidCustomerIds.has(doc.id)) {
        totalPending += data.monthly_amount || 0;
        unpaidCustomers.push({ id: doc.id, ...data });
      }
    });

    res.json({
      month: targetMonth,
      totalCollected,
      totalPending,
      totalCustomers: customersSnapshot.size,
      paidCount: payments.length,
      unpaidCount: unpaidCustomers.length,
      payments,
      unpaidCustomers
    });
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trend data (last 6 months)
app.get('/api/reports/trend', async (req, res) => {
  try {
    const now = new Date();
    const months = [];

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    // Get all active customers for calculating pending
    const customersSnapshot = await db.collection('cable_customers')
      .where('status', '==', 'active')
      .get();

    const totalMonthlyAmount = customersSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().monthly_amount || 0);
    }, 0);

    // Get payments for these months
    const trendData = [];

    for (const month of months) {
      const paymentsSnapshot = await db.collection('cable_payments')
        .where('month', '==', month)
        .get();

      let collected = 0;
      paymentsSnapshot.forEach(doc => {
        collected += doc.data().amount || 0;
      });

      trendData.push({
        month,
        collected,
        pending: Math.max(0, totalMonthlyAmount - collected)
      });
    }

    res.json(trendData);
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ BACKUP & RESTORE ============

// Export all data (backup)
app.get('/api/backup', async (req, res) => {
  try {
    const customersSnapshot = await db.collection('cable_customers').get();
    const paymentsSnapshot = await db.collection('cable_payments').get();

    const customers = [];
    customersSnapshot.forEach(doc => {
      customers.push({ id: doc.id, ...doc.data() });
    });

    const payments = [];
    paymentsSnapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        customers,
        payments
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import data (restore)
app.post('/api/restore', async (req, res) => {
  try {
    const { data, mode } = req.body;

    if (!data || !data.customers) {
      return res.status(400).json({ error: 'Invalid backup data' });
    }

    const batch = db.batch();
    let importedCustomers = 0;
    let importedPayments = 0;

    // If mode is 'replace', delete existing data first
    if (mode === 'replace') {
      const existingCustomers = await db.collection('cable_customers').get();
      const existingPayments = await db.collection('cable_payments').get();

      existingCustomers.forEach(doc => batch.delete(doc.ref));
      existingPayments.forEach(doc => batch.delete(doc.ref));
    }

    // Import customers
    for (const customer of data.customers) {
      const { id, ...customerData } = customer;
      const docRef = mode === 'replace' && id
        ? db.collection('cable_customers').doc(id)
        : db.collection('cable_customers').doc();
      batch.set(docRef, customerData);
      importedCustomers++;
    }

    // Import payments
    if (data.payments) {
      for (const payment of data.payments) {
        const { id, ...paymentData } = payment;
        const docRef = mode === 'replace' && id
          ? db.collection('cable_payments').doc(id)
          : db.collection('cable_payments').doc();
        batch.set(docRef, paymentData);
        importedPayments++;
      }
    }

    await batch.commit();

    res.json({
      message: 'Data restored successfully',
      importedCustomers,
      importedPayments
    });
  } catch (error) {
    console.error('Error restoring data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all payments (for export)
app.get('/api/payments', async (req, res) => {
  try {
    const { month } = req.query;

    let snapshot;
    if (month) {
      snapshot = await db.collection('cable_payments')
        .where('month', '==', month)
        .get();
    } else {
      snapshot = await db.collection('cable_payments').get();
    }

    const payments = [];
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    // Sort by created_at descending
    payments.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SETTINGS ============

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const doc = await db.collection('cable_settings').doc('main').get();

    if (!doc.exists) {
      return res.json({
        reminderDay: 1,
        reminderEnabled: false,
        businessName: 'Cable TV Service',
        businessPhone: '',
        staffMembers: []
      });
    }

    res.json(doc.data());
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const { reminderDay, reminderEnabled, businessName, businessPhone } = req.body;

    const settingsRef = db.collection('cable_settings').doc('main');
    const doc = await settingsRef.get();

    const updateData = {
      reminderDay: reminderDay || 1,
      reminderEnabled: reminderEnabled || false,
      businessName: businessName || 'Cable TV Service',
      businessPhone: businessPhone || '',
      updated_at: new Date().toISOString()
    };

    if (doc.exists) {
      await settingsRef.update(updateData);
    } else {
      await settingsRef.set({ ...updateData, staffMembers: [] });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add staff member
app.post('/api/settings/staff', async (req, res) => {
  try {
    const { name, phone, role } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const settingsRef = db.collection('cable_settings').doc('main');
    const doc = await settingsRef.get();

    const staffMember = {
      id: Date.now().toString(),
      name,
      phone,
      role: role || 'collector',
      created_at: new Date().toISOString()
    };

    if (doc.exists) {
      const data = doc.data();
      const staffMembers = data.staffMembers || [];
      staffMembers.push(staffMember);
      await settingsRef.update({ staffMembers });
    } else {
      await settingsRef.set({
        reminderDay: 1,
        reminderEnabled: false,
        businessName: 'Cable TV Service',
        businessPhone: '',
        staffMembers: [staffMember]
      });
    }

    res.status(201).json(staffMember);
  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove staff member
app.delete('/api/settings/staff/:id', async (req, res) => {
  try {
    const settingsRef = db.collection('cable_settings').doc('main');
    const doc = await settingsRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    const data = doc.data();
    const staffMembers = (data.staffMembers || []).filter(s => s.id !== req.params.id);
    await settingsRef.update({ staffMembers });

    res.json({ message: 'Staff member removed' });
  } catch (error) {
    console.error('Error removing staff:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ MAGALIR LOAN MODULE ============

// Get all groups
app.get('/api/magalir/groups', async (req, res) => {
  try {
    const snapshot = await db.collection('magalir_groups').get();
    const groups = [];
    snapshot.forEach(doc => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    groups.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create group
app.post('/api/magalir/groups', async (req, res) => {
  try {
    const { name, description, monthly_amount } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    const groupData = {
      name,
      description: description || '',
      monthly_amount: parseFloat(monthly_amount) || 0,
      status: 'active',
      member_count: 0,
      created_at: new Date().toISOString()
    };
    const docRef = await db.collection('magalir_groups').add(groupData);
    res.status(201).json({ id: docRef.id, ...groupData });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update group
app.put('/api/magalir/groups/:id', async (req, res) => {
  try {
    const { name, description, monthly_amount, status } = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (monthly_amount !== undefined) updateData.monthly_amount = parseFloat(monthly_amount);
    if (status !== undefined) updateData.status = status;
    await db.collection('magalir_groups').doc(req.params.id).update(updateData);
    const doc = await db.collection('magalir_groups').doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete group
app.delete('/api/magalir/groups/:id', async (req, res) => {
  try {
    // Delete all members and payments in this group
    const membersSnapshot = await db.collection('magalir_members')
      .where('group_id', '==', req.params.id).get();
    const paymentsSnapshot = await db.collection('magalir_payments')
      .where('group_id', '==', req.params.id).get();

    const batch = db.batch();
    membersSnapshot.forEach(doc => batch.delete(doc.ref));
    paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('magalir_groups').doc(req.params.id));
    await batch.commit();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get members of a group
app.get('/api/magalir/groups/:groupId/members', async (req, res) => {
  try {
    const snapshot = await db.collection('magalir_members')
      .where('group_id', '==', req.params.groupId).get();
    const members = [];
    snapshot.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
    });
    members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add member to group
app.post('/api/magalir/groups/:groupId/members', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Member name is required' });
    }
    const memberData = {
      group_id: req.params.groupId,
      name,
      phone: phone || '',
      address: address || '',
      status: 'active',
      created_at: new Date().toISOString()
    };
    const docRef = await db.collection('magalir_members').add(memberData);

    // Update member count
    const groupRef = db.collection('magalir_groups').doc(req.params.groupId);
    const groupDoc = await groupRef.get();
    if (groupDoc.exists) {
      await groupRef.update({ member_count: (groupDoc.data().member_count || 0) + 1 });
    }

    res.status(201).json({ id: docRef.id, ...memberData });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update member
app.put('/api/magalir/members/:id', async (req, res) => {
  try {
    const { name, phone, address, status } = req.body;
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;
    await db.collection('magalir_members').doc(req.params.id).update(updateData);
    const doc = await db.collection('magalir_members').doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete member
app.delete('/api/magalir/members/:id', async (req, res) => {
  try {
    const memberDoc = await db.collection('magalir_members').doc(req.params.id).get();
    const groupId = memberDoc.data()?.group_id;

    // Delete member's payments
    const paymentsSnapshot = await db.collection('magalir_payments')
      .where('member_id', '==', req.params.id).get();

    const batch = db.batch();
    paymentsSnapshot.forEach(doc => batch.delete(doc.ref));
    batch.delete(db.collection('magalir_members').doc(req.params.id));
    await batch.commit();

    // Update member count
    if (groupId) {
      const groupRef = db.collection('magalir_groups').doc(groupId);
      const groupDoc = await groupRef.get();
      if (groupDoc.exists) {
        await groupRef.update({ member_count: Math.max(0, (groupDoc.data().member_count || 1) - 1) });
      }
    }

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get collection for a group and month
app.get('/api/magalir/groups/:groupId/collection', async (req, res) => {
  try {
    const { month } = req.query;
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get group info
    const groupDoc = await db.collection('magalir_groups').doc(req.params.groupId).get();
    const group = groupDoc.exists ? { id: groupDoc.id, ...groupDoc.data() } : null;

    // Get all members
    const membersSnapshot = await db.collection('magalir_members')
      .where('group_id', '==', req.params.groupId)
      .where('status', '==', 'active').get();

    // Get payments for this month
    const paymentsSnapshot = await db.collection('magalir_payments')
      .where('group_id', '==', req.params.groupId)
      .where('month', '==', targetMonth).get();

    const paymentsByMember = {};
    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      paymentsByMember[data.member_id] = { id: doc.id, ...data };
    });

    const collection = [];
    membersSnapshot.forEach(doc => {
      const member = doc.data();
      const payment = paymentsByMember[doc.id];
      collection.push({
        member_id: doc.id,
        member_name: member.name,
        member_phone: member.phone,
        expected_amount: group?.monthly_amount || 0,
        payment_id: payment?.id || null,
        paid: !!payment,
        paid_amount: payment?.amount || 0,
        paid_date: payment?.paid_date || null
      });
    });

    collection.sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return a.member_name.localeCompare(b.member_name);
    });

    res.json({
      month: targetMonth,
      group,
      collection,
      summary: {
        total: collection.length,
        paid: collection.filter(c => c.paid).length,
        unpaid: collection.filter(c => !c.paid).length,
        collected: collection.reduce((sum, c) => sum + (c.paid_amount || 0), 0),
        pending: collection.reduce((sum, c) => sum + (c.paid ? 0 : (group?.monthly_amount || 0)), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record payment
app.post('/api/magalir/payments', async (req, res) => {
  try {
    const { group_id, member_id, month, amount } = req.body;
    if (!group_id || !member_id || !month) {
      return res.status(400).json({ error: 'Group, member, and month are required' });
    }

    // Check if already paid
    const existing = await db.collection('magalir_payments')
      .where('group_id', '==', group_id)
      .where('member_id', '==', member_id)
      .where('month', '==', month).get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Payment already recorded for this month' });
    }

    // Get member info
    const memberDoc = await db.collection('magalir_members').doc(member_id).get();
    const member = memberDoc.data();

    const paymentData = {
      group_id,
      member_id,
      member_name: member?.name || '',
      member_phone: member?.phone || '',
      month,
      amount: parseFloat(amount) || 0,
      paid_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('magalir_payments').add(paymentData);
    res.status(201).json({ id: docRef.id, ...paymentData });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete payment (undo)
app.delete('/api/magalir/payments/:id', async (req, res) => {
  try {
    await db.collection('magalir_payments').doc(req.params.id).delete();
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get member payment history
app.get('/api/magalir/members/:id/payments', async (req, res) => {
  try {
    const snapshot = await db.collection('magalir_payments')
      .where('member_id', '==', req.params.id).get();
    const payments = [];
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    payments.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Magalir stats
app.get('/api/magalir/stats', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const groupsSnapshot = await db.collection('magalir_groups').get();
    const membersSnapshot = await db.collection('magalir_members').where('status', '==', 'active').get();
    const paymentsSnapshot = await db.collection('magalir_payments')
      .where('month', '==', currentMonth).get();

    let totalCollected = 0;
    paymentsSnapshot.forEach(doc => {
      totalCollected += doc.data().amount || 0;
    });

    res.json({
      totalGroups: groupsSnapshot.size,
      totalMembers: membersSnapshot.size,
      collectedThisMonth: totalCollected,
      paidThisMonth: paymentsSnapshot.size,
      currentMonth
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ CLEAR ALL DATA (USE WITH CAUTION) ============

app.delete('/api/clear-all-data', async (req, res) => {
  try {
    const { confirm } = req.query;

    if (confirm !== 'YES_DELETE_EVERYTHING') {
      return res.status(400).json({ error: 'Add ?confirm=YES_DELETE_EVERYTHING to confirm' });
    }

    const collections = [
      'cable_customers',
      'cable_payments',
      'cable_settings',
      'chit_groups',
      'chit_members',
      'chit_payments',
      'chit_auctions',
      'magalir_groups',
      'magalir_members',
      'magalir_payments'
    ];

    let totalDeleted = 0;

    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      if (snapshot.size > 0) {
        await batch.commit();
      }
    }

    res.json({
      success: true,
      message: `Deleted ${totalDeleted} documents from ${collections.length} collections`,
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
