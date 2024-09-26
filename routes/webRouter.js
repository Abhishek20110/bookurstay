import express from 'express';
import multer from 'multer';

import { search ,
    getHotelDetails
 } from '../controller/searchController.js';



const webRouter = express.Router();
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

webRouter.get('/search' ,upload.none(),  search);
webRouter.get('/hotel/:hotel_id', getHotelDetails);

export default webRouter;
