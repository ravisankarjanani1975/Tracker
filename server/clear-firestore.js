import db from './firestore.js';

const ADMIN_PASSWORD = 'admin123';

async function clearAllData() {
  console.log('🔥 Starting Firestore data cleanup...\n');

  const collections = [
    'users',
    'cable_customers',
    'cable_payments',
    'cable_collections',
    'chit_members',
    'chit_payments',
    'magalir_loans',
    'magalir_payments'
  ];

  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();

      if (snapshot.empty) {
        console.log(`✓ ${collectionName}: Already empty`);
        continue;
      }

      console.log(`📊 ${collectionName}: Found ${snapshot.size} documents`);

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ ${collectionName}: Deleted ${snapshot.size} documents\n`);
    } catch (error) {
      console.error(`❌ Error clearing ${collectionName}:`, error.message);
    }
  }

  console.log('🎉 Firestore cleanup complete!');
  process.exit(0);
}

// Prompt for password
const args = process.argv.slice(2);
if (args[0] !== ADMIN_PASSWORD) {
  console.error('❌ Invalid admin password. Usage: node clear-firestore.js admin123');
  process.exit(1);
}

clearAllData().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
