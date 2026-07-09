require('dotenv').config();
const connectDB = require('./src/config/db');
const seedData = require('./src/utils/seeder');

connectDB()
  .then(async () => {
    console.log('Connected to DB. Starting seed...');
    await seedData();
    console.log('Seed completed successfully. Exiting.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to run seeder:', err.message);
    process.exit(1);
  });
