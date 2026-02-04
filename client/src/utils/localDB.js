// Local Database using localStorage for offline mode

const DB_KEYS = {
  CHIT_GROUPS: 'rs_chit_groups',
  CHIT_MEMBERS: 'rs_chit_members',
  CHIT_PAYMENTS: 'rs_chit_payments',
  CHIT_SETTINGS: 'rs_chit_settings',
  CHIT_AUCTIONS: 'rs_chit_auctions',
};

// Generate unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Generic CRUD operations
const getData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return [];
  }
};

const setData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error writing to localStorage:', e);
    return false;
  }
};

// Chit Groups
export const chitGroupsDB = {
  getAll: () => getData(DB_KEYS.CHIT_GROUPS),

  getById: (id) => {
    const groups = getData(DB_KEYS.CHIT_GROUPS);
    return groups.find(g => g.id === id);
  },

  create: (data) => {
    const groups = getData(DB_KEYS.CHIT_GROUPS);
    const newGroup = {
      id: generateId(),
      ...data,
      created_at: new Date().toISOString()
    };
    groups.push(newGroup);
    setData(DB_KEYS.CHIT_GROUPS, groups);
    return newGroup;
  },

  update: (id, data) => {
    const groups = getData(DB_KEYS.CHIT_GROUPS);
    const index = groups.findIndex(g => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...data };
      setData(DB_KEYS.CHIT_GROUPS, groups);
      return groups[index];
    }
    return null;
  },

  delete: (id) => {
    const groups = getData(DB_KEYS.CHIT_GROUPS);
    const filtered = groups.filter(g => g.id !== id);
    setData(DB_KEYS.CHIT_GROUPS, filtered);
    // Also delete related members and payments
    const members = getData(DB_KEYS.CHIT_MEMBERS).filter(m => m.chit_group_id !== id);
    setData(DB_KEYS.CHIT_MEMBERS, members);
    const payments = getData(DB_KEYS.CHIT_PAYMENTS).filter(p => p.chit_group_id !== id);
    setData(DB_KEYS.CHIT_PAYMENTS, payments);
    return true;
  }
};

// Chit Members
export const chitMembersDB = {
  getByChitId: (chitGroupId) => {
    const members = getData(DB_KEYS.CHIT_MEMBERS);
    return members.filter(m => m.chit_group_id === chitGroupId);
  },

  create: (data) => {
    const members = getData(DB_KEYS.CHIT_MEMBERS);
    const newMember = {
      id: generateId(),
      ...data,
      created_at: new Date().toISOString()
    };
    members.push(newMember);
    setData(DB_KEYS.CHIT_MEMBERS, members);
    return newMember;
  },

  update: (id, data) => {
    const members = getData(DB_KEYS.CHIT_MEMBERS);
    const index = members.findIndex(m => m.id === id);
    if (index !== -1) {
      members[index] = { ...members[index], ...data };
      setData(DB_KEYS.CHIT_MEMBERS, members);
      return members[index];
    }
    return null;
  },

  delete: (id) => {
    const members = getData(DB_KEYS.CHIT_MEMBERS);
    const filtered = members.filter(m => m.id !== id);
    setData(DB_KEYS.CHIT_MEMBERS, filtered);
    // Also delete related payments
    const payments = getData(DB_KEYS.CHIT_PAYMENTS).filter(p => p.member_id !== id);
    setData(DB_KEYS.CHIT_PAYMENTS, payments);
    return true;
  }
};

// Chit Payments
export const chitPaymentsDB = {
  getByChitAndMonth: (chitGroupId, month) => {
    const payments = getData(DB_KEYS.CHIT_PAYMENTS);
    return payments.filter(p => p.chit_group_id === chitGroupId && p.month === month);
  },

  create: (data) => {
    const payments = getData(DB_KEYS.CHIT_PAYMENTS);
    const newPayment = {
      id: generateId(),
      ...data,
      created_at: new Date().toISOString()
    };
    payments.push(newPayment);
    setData(DB_KEYS.CHIT_PAYMENTS, payments);
    return newPayment;
  },

  delete: (id) => {
    const payments = getData(DB_KEYS.CHIT_PAYMENTS);
    const filtered = payments.filter(p => p.id !== id);
    setData(DB_KEYS.CHIT_PAYMENTS, filtered);
    return true;
  }
};

// Chit Settings
export const chitSettingsDB = {
  get: (chitGroupId, month) => {
    const settings = getData(DB_KEYS.CHIT_SETTINGS);
    return settings.find(s => s.chit_group_id === chitGroupId && s.month === month) || { chit_number: '', custom_note: '' };
  },

  save: (chitGroupId, month, data) => {
    const settings = getData(DB_KEYS.CHIT_SETTINGS);
    const index = settings.findIndex(s => s.chit_group_id === chitGroupId && s.month === month);
    if (index !== -1) {
      settings[index] = { ...settings[index], ...data };
    } else {
      settings.push({
        id: generateId(),
        chit_group_id: chitGroupId,
        month,
        ...data
      });
    }
    setData(DB_KEYS.CHIT_SETTINGS, settings);
    return true;
  }
};

// Chit Auctions
export const chitAuctionsDB = {
  getByChitAndMonth: (chitGroupId, month) => {
    const auctions = getData(DB_KEYS.CHIT_AUCTIONS);
    return auctions.find(a => a.chit_group_id === chitGroupId && a.month === month) || {};
  },

  getAllByChit: (chitGroupId) => {
    const auctions = getData(DB_KEYS.CHIT_AUCTIONS);
    return auctions.filter(a => a.chit_group_id === chitGroupId);
  },

  save: (chitGroupId, month, data) => {
    const auctions = getData(DB_KEYS.CHIT_AUCTIONS);
    const index = auctions.findIndex(a => a.chit_group_id === chitGroupId && a.month === month);
    if (index !== -1) {
      auctions[index] = { ...auctions[index], ...data };
    } else {
      auctions.push({
        id: generateId(),
        chit_group_id: chitGroupId,
        month,
        ...data
      });
    }
    setData(DB_KEYS.CHIT_AUCTIONS, auctions);
    return true;
  }
};

// Get chit details with members and payments for a month
export const getChitDetails = (chitGroupId, month) => {
  const chitGroup = chitGroupsDB.getById(chitGroupId);
  if (!chitGroup) return null;

  const members = chitMembersDB.getByChitId(chitGroupId);
  const payments = chitPaymentsDB.getByChitAndMonth(chitGroupId, month);

  // Map payments to members
  const membersWithPayments = members.map(member => {
    const payment = payments.find(p => p.member_id === member.id);
    return {
      ...member,
      paid: !!payment,
      payment_id: payment?.id,
      payment_date: payment?.payment_date
    };
  });

  return {
    ...chitGroup,
    members: membersWithPayments,
    paid_count: membersWithPayments.filter(m => m.paid).length,
    unpaid_count: membersWithPayments.filter(m => !m.paid).length
  };
};

export default {
  chitGroupsDB,
  chitMembersDB,
  chitPaymentsDB,
  chitSettingsDB,
  chitAuctionsDB,
  getChitDetails
};
