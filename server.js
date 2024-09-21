import dotenv from 'dotenv';
import express from 'express';
import { Sequelize } from 'sequelize';

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Create a new Sequelize instance for database connection
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql', // Use 'mysql' here
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
        process.exit(1); // Exit the application on error
    }
};

// Connect to the database
connectDB();

// Middleware to parse JSON requests
app.use(express.json());

// Simple route for the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the backend');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
