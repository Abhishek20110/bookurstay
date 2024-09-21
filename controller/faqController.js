import { sequelize } from '../config/db.js'; // Import the Sequelize instance

// Controller to get all FAQs using raw SQL
export const getAllFAQs = async (req, res) => {
    try {
        const [faqs, metadata] = await sequelize.query('SELECT * FROM faqs'); // Raw SQL query
        console.log('All FAQs:', faqs); // Log FAQs to the console
        res.status(200).json(faqs); // Send response with the FAQs
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
