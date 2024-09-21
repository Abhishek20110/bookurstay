import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config(); // Load environment variables

// Create a new Sequelize instance
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

// Authenticate the connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to the database.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

export { sequelize, connectDB }; // Export both the sequelize instance and connectDB function
