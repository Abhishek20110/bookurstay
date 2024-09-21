import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to the database gvv
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
