import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import mysql from 'mysql'

// Load environment variables
dotenv.config();

// Create a new Sequelize instance with mysql dialect
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql', // Use 'mysql' instead of 'mysql2'
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
        console.error(error.stack);
        process.exit(1); // Exit on failure
    }
};

// Export the sequelize instance and connectDB function
export { sequelize, connectDB };
