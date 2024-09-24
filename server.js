import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';
import webRouter from './routes/webRoutes.js';

dotenv.config(); // Load environment variables
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Middleware to handle URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Connect to the database
connectDB();

// Define a route for the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the backend');
});

// Use the webRouter for all /api/* requests
app.use('/api', webRouter);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
