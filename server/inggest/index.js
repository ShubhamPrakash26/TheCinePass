import { Inngest } from "inngest";
import  User  from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Shows.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest functions to store user date to a database

const syncUserCreation = inngest.createFunction(
        {id: "sync-user-with-clerk"},
        {event: "clerk/user.created"},
        async ({event}) =>{
            const {id, first_name, last_name, email_addresses, image_url} = event.data;
            const userData = {
                _id: id,
                email: email_addresses[0].email_address,
                name : first_name + " " + last_name,
                image: image_url
            };
            await User.create(userData);
        }
);

// Inngest funtion to delete user data from the databas
const syncUserDeletion = inngest.createFunction(
        {id: "delete-user-with-clerk"},
        {event: "clerk/user.deleted"},
        async ({event}) =>{
            const {id} = event.data;
            await User.findByIdAndDelete({id});
        }
);

// Inngest funtion to update user data from the database 
const syncUserUpdation = inngest.createFunction(
        {id: "update-user-with-clerk"},
        {event: "clerk/user.updated"},
        async ({event}) =>{
            const {id, first_name, last_name, email_addresses, image_url} = event.data;
            const userData = {
                _id: id,
                email: email_addresses[0].email_address,
                name : first_name + " " + last_name,
                image: image_url
            };
            await User.findByIdAndUpdate(id, userData);
        }
);

//Inngest functions array to cancel booking and release the seats after 10 minutes

const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id: "release-seats-and-delete-booking"},
    {event: "app/checkpayment"},
    async ({event, step}) =>{
        const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
        await step.sleepUntil('wait-for-ten-minutes', tenMinutesLater);
        await step.run('check-payment-status', async () =>{
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId);

            // If the booking is not paid, release the seats and delete the booking
            if(!booking.isPaid){
                const show = await Show.findById(booking.show);
                booking.bookedSeat.forEach(seat =>{
                    delete show.occupiedSeats[seat];
                });
                show.markModified('occupiedSeats');
                await show.save();
                await Booking.findByIdAndDelete(bookingId);
            }

        })

    } 
)

export const functions = [
    syncUserCreation,
    syncUserDeletion, 
    syncUserUpdation,
    releaseSeatsAndDeleteBooking
];
