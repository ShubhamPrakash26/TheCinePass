import express from 'express';
import { getFavoriteMovies, getUserBookings, updateFavorite } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/bookings', getUserBookings);
userRouter.post('/update-favorites', updateFavorite);
userRouter.get('/favorites', getFavoriteMovies);

export default userRouter;