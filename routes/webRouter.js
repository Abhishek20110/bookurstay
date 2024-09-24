import express from 'express';
import multer from 'multer';

import { search } from '../controller/searchController.js';



const webRouter = express.Router();
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

webRouter.get('/search' ,upload.none(),  search);

export default webRouter;
