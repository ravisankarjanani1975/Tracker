import db from './firestore.js';

async function seedCableData() {
  console.log('🌱 Seeding TV-Cable demo data...\n');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Sample customers for demo
  const customers = [
    { name: 'Rajesh Kumar', phone: '9876543210', stb_number: 'STB001', monthly_amount: 300, area: 'Anna Nagar', address: '123 Main Street', status: 'active' },
    { name: 'Priya Sharma', phone: '9876543211', stb_number: 'STB002', monthly_amount: 250, area: 'T Nagar', address: '456 Park Road', status: 'active' },
    { name: 'Amit Patel', phone: '9876543212', stb_number: 'STB003', monthly_amount: 300, area: 'Adyar', address: '789 Beach Avenue', status: 'active' },
    { name: 'Venkat Reddy', phone: '9876543213', stb_number: 'STB004', monthly_amount: 350, area: 'Velachery', address: '321 Lake View', status: 'active' },
    { name: 'Suresh Kumar', phone: '9876543214', stb_number: 'STB005', monthly_amount: 300, area: 'Anna Nagar', address: '654 Temple Street', status: 'active' },
    { name: 'Lakshmi Devi', phone: '9876543215', stb_number: 'STB006', monthly_amount: 250, area: 'Chromepet', address: '987 Station Road', status: 'inactive' },
    { name: 'Ramesh Babu', phone: '9876543216', stb_number: 'STB007', monthly_amount: 300, area: 'Porur', address: '147 Highway', status: 'active' },
    { name: 'Kavitha Rani', phone: '9876543217', stb_number: 'STB008', monthly_amount: 350, area: 'Tambaram', address: '258 Bus Stand', status: 'active' },
    { name: 'Ganesh Murthy', phone: '9876543218', stb_number: 'STB009', monthly_amount: 300, area: 'Pallavaram', address: '369 Market Street', status: 'active' },
    { name: 'Divya Lakshmi', phone: '9876543219', stb_number: 'STB010', monthly_amount: 250, area: 'Nungambakkam', address: '741 Church Road', status: 'active' }
  ];

  try {
    // Add customers
    const customerIds = [];
    for (const customer of customers) {
      const docRef = await db.collection('cable_customers').add({
        ...customer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      customerIds.push({ id: docRef.id, ...customer });
      console.log(`✓ Added customer: ${customer.name}`);
    }

    console.log(`\n✅ Added ${customers.length} customers\n`);

    // Add payments for some customers (demo: 6 customers paid this month)
    console.log('💰 Adding payments...\n');

    const paidCustomers = customerIds.slice(0, 6);
    for (const customer of paidCustomers) {
      await db.collection('cable_payments').add({
        customer_id: customer.id,
        customer_name: customer.name,
        amount: customer.monthly_amount,
        month: currentMonth,
        payment_date: new Date().toISOString(),
        payment_method: 'cash',
        created_at: new Date().toISOString()
      });
      console.log(`✓ Payment recorded for: ${customer.name} - ₹${customer.monthly_amount}`);
    }

    console.log(`\n✅ Added ${paidCustomers.length} payments`);
    console.log(`📊 Pending: ${customerIds.length - paidCustomers.length} customers\n`);

    console.log('🎉 Demo data seeded successfully!');
    console.log('\nSummary:');
    console.log(`- Total Customers: ${customerIds.length}`);
    console.log(`- Active: ${customerIds.filter(c => c.status === 'active').length}`);
    console.log(`- Inactive: ${customerIds.filter(c => c.status === 'inactive').length}`);
    console.log(`- Paid this month: ${paidCustomers.length}`);
    console.log(`- Pending payment: ${customerIds.length - paidCustomers.length - 1}`); // -1 for inactive
    console.log(`- Total monthly revenue: ₹${customerIds.filter(c => c.status === 'active').reduce((sum, c) => sum + c.monthly_amount, 0)}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedCableData();
