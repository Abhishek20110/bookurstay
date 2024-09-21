import express from 'express';
import { getAllFAQs } from '../controller/faqController.js'; // Import the controller function

const router = express.Router();

// Define the route to get all FAQs
router.get('/', getAllFAQs);

export default router;
