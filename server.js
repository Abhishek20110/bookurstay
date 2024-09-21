// Import necessary modules
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
