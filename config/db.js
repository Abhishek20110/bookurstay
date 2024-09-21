import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';  // Import mysql2 in ES module syntax
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Create a new Sequelize instance
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    dialectModule: mysql2,  // Use the mysql2 import directly
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

// Function to authenticate the connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

export { sequelize, connectDB };
