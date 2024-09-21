import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// Load environment variables from .env file
dotenv.config();

// Create a new Sequelize instance
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

// Function to authenticate the connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
};

// Export the sequelize instance and connectDB function
export { sequelize, connectDB };
