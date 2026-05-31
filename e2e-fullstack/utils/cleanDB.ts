import pg from 'pg';

export async function cleanMembers(): Promise<void> {
    const client = new pg.Client({ 
        connectionString: process.env.DB_URL ?? 'postgresql://admin:password123@localhost:5433/alentapp_test_db'
    });
    await client.connect();
    try {
        await client.query('TRUNCATE TABLE payments, medical_certificates, sports, members RESTART IDENTITY CASCADE');
    } finally {
        await client.end();
    }
}