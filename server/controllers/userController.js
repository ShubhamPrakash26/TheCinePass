import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import { clerkClient } from "@clerk/express";

//API controller funciton to get user bookings
export const getUserBookings = async (req, res) => {
    try{
        const user = req.auth().userId;
        const bookings = await Booking.find({ user }).populate({
            path: "show",
            populate:{
                path: "movie"
            }
        }).sort({ createdAt: -1 });
        res.json({
            success: true,
            bookings
        });
    } catch(error) {
        console.error(error);
        res.json({
            success: false,
            message: "Something went wrong while fetching user bookings"
        });
    }
}

//API controller to update favorite movie in clerk user metadata

export const updateFavorite = async (req, res) => {
    try{
        const userId = req.auth().userId;
        const { movieId } = req.body;
        const user = await clerkClient.users.getUser(userId);
        if(!user.privateMetadata.favorites) {
            user.privateMetadata.favorites = [];
        }
        if(!user.privateMetadata.favorites.includes(movieId)) {
            user.privateMetadata.favorites.push(movieId);
        } else {
           user.privateMetadata.favorites = user.privateMetadata.favorites.filter(item => item !== movieId); 
        }
        await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: user.privateMetadata
        });
        res.json({
            success: true,
            message: "Favorite movie updated successfully"
        });
    } catch(error) {
        console.error(error);
        res.json({
            success: false,
            message: "Something went wrong while adding favorite movie"
        });
    }
}

//API controller to get favorite movies from clerk user metadata
export const getFavoriteMovies = async (req, res) => {
    try{
        const userId = req.auth().userId;
        const user = await clerkClient.users.getUser(userId);
        const favorites = user.privateMetadata.favorites;

        //getting movies from database
        const movies = await Movie.find({_id: { $in: favorites }})

        res.json({
            success: true,
            movies
        });
    } catch(error) {
        console.error(error);
        res.json({
            success: false,
            message: "Something went wrong while fetching favorite movies"
        });
    }
}