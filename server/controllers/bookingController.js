import Show from "../models/Shows.js";
import Booking from "../models/Booking.js";

//Funtion to check availability of selected seats for a movie

const checkSeatsAvailability = async (showId, selectedSeats) => {
    try{
        const showData = await Show.findById(showId)
        if (!showData) {
            return false;
        }
        const occupiedSeats = showData.occupiedSeats;
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
        return !isAnySeatTaken;
    } catch(error) {
        console.log(error.message);
        return false;
    }
}

export const createBooking = async (req, res) => {
    try{
        const {userId} =  req.auth();
        const {showId, selectedSeats} = req.body;
        const {origin} = req.headers;
        //Check if the seat is available for the selected show
        const isAvailable = await checkSeatsAvailability(showId, selectedSeats);

       if (!isAvailable) {
            return res.json({
                success: false,
                message: "Selected seats are not available"
            });
        }
        //Get the show details
        const showData = await Show.findById(showId).populate('movie');

        //Create a new booking
        const booking =  await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeat: selectedSeats,
        })
        selectedSeats.map(seat =>{
            showData.occupiedSeats[seat] = userId;
        })
        showData.markModified('occupiedSeats');
        await showData.save();

        //Stripe Gatewau initialization

        res.json({success: true, message: "Booking created successfully"});
    } catch(error) {
        console.log(error.message);
        res.json({
            success: false,
            message: "Something went wrong while creating booking"
        });
    }
}

export const getOccupiedSeats = async (req, res) => {
    try{
        const {showId} = req.params;
        const showData = await Show.findById(showId);
        //Get the occupied seats
        const occupiedSeats = Object.keys(showData.occupiedSeats);
        res.json({
            success: true,
            occupiedSeats
        });
    } catch(error){
        console.log(error.message);
        res.json({
            success: false,
            message: "Something went wrong fetching occupied seats"
        });
    }
}