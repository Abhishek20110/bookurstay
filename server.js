import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';
import faqRoutes from './routes/faqRoutes.js'; // Import the FAQ routes

dotenv.config(); // Load environment variables
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Connect to the database
connectDB();

// Use the FAQ routes for all /api/faqs requests
app.use('/api/faqs', faqRoutes);

// Define a route for the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the backend');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
