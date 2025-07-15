const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
    // 1. Create admin user
    const adminUserRef = db.collection('users').doc('admin1');
    await adminUserRef.set({
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'hashedpassword', // Use real hash in production
        role: 'admin'
    });

    // 2. Create company owner user
    const ownerUserRef = db.collection('users').doc('owner1');
    await ownerUserRef.set({
        name: 'Business Owner',
        email: 'owner@example.com',
        password: 'hashedpassword',
        role: 'owner'
    });

    // 3. Create a company
    const companyRef = db.collection('companies').doc('company1');
    await companyRef.set({
        name: 'Acme Inc.',
        owner: 'Business Owner',
        ownerId: 'owner1',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        revenue: 12000,
        services: [
            { name: 'Consulting', price: 100 },
            { name: 'Support', price: 50 }
        ]
    });

    // 4. Add clients to the company
    const clients = [
        {
            name: 'Jane Smith',
            number: '555-1234',
            address: '123 Main St',
            email: 'jane@example.com',
            referrals: 2,
            referralAmount: 25
        },
        {
            name: 'Bob Johnson',
            number: '555-5678',
            address: '456 Oak Ave',
            email: 'bob@example.com',
            referrals: 1,
            referralAmount: 10
        }
    ];

    for (const client of clients) {
        await companyRef.collection('clients').add(client);
    }

    // 5. Add another company for variety
    const company2Ref = db.collection('companies').doc('company2');
    await company2Ref.set({
        name: 'Beta LLC',
        owner: 'Another Owner',
        ownerId: 'owner2',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        revenue: 8000,
        services: [
            { name: 'Design', price: 200 }
        ]
    });

    console.log('Sample data pushed to Firestore!');
}

seed().then(() => process.exit());
