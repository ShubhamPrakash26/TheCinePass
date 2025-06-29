import { Inngest } from "inngest";
import  User  from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Shows.js";
import sendEmail from "../config/nodemailer.js";

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

//Inngest functions to send email when user books a ticket

const sendBookingConfirmationEmail = inngest.createFunction(
    {id: "send-booking-confirmation-email"},
    {event: "app/show.booked"},
    async ({event, step}) =>{
        const {bookingId} = event.data;
        const booking = await Booking.findById(bookingId).populate({
                path: 'show',
                populate: {
                    path: 'movie',
                    model: 'Movie'
                }
            }
        ).populate('user');
        await sendEmail({
            to: booking.user.email,
            subject: `Booking Confirmation: "${booking.show.movie.title}" booked!`,
            body: `
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Outfit', sans-serif; background-color: #09090B; border: 1px solid #27272a; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #F84565 0%, #D63854 100%); color: white; padding: 30px 20px; text-align: center;">
                    <div style="font-size: 28px; font-weight: bold; margin: 0;">🎬 Booking Confirmed!</div>
                    <div style="font-size: 16px; margin-top: 8px; opacity: 0.9;">Your movie tickets are ready</div>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px; background-color: #09090B;">
                    <!-- Greeting -->
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 20px; color: white;">
                        Hi ${booking.user.name},
                    </div>
                    
                    <!-- Confirmation Message -->
                    <div style="font-size: 18px; margin-bottom: 30px; line-height: 1.6; color: #a1a1aa;">
                        Your booking for <span style="color: #F84565; font-weight: 700; font-size: 20px;">"${booking.show.movie.title}"</span> has been confirmed successfully!
                    </div>
                    
                    <!-- Divider -->
                    <div style="height: 2px; background: linear-gradient(90deg, #F84565 0%, #D63854 100%); margin: 20px 0; border-radius: 1px;"></div>
                    
                    <!-- Booking Details -->
                    <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 5px solid #F84565;">
                        
                        <!-- Date Row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #3f3f46;">
                            <span style="font-weight: 600; color: #a1a1aa; font-size: 16px;">📅 Date:</span>
                            <span style="font-weight: 500; color: white; font-size: 16px;">${new Date(booking.show.showDateTime).toLocaleDateString('en-US', {timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                        </div>
                        
                        <!-- Time Row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #3f3f46;">
                            <span style="font-weight: 600; color: #a1a1aa; font-size: 16px;">🕐 Time:</span>
                            <span style="font-weight: 500; color: white; font-size: 16px;">${new Date(booking.show.showDateTime).toLocaleTimeString('en-US', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit'})}</span>
                        </div>
                        
                        <!-- Seats Row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #3f3f46;">
                            <span style="font-weight: 600; color: #a1a1aa; font-size: 16px;">🎫 Seats:</span>
                            <span style="background: #F84565; color: white; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 16px;">${booking.bookedSeat.join(', ')}</span>
                        </div>
                        
                        <!-- Amount Row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                            <span style="font-weight: 600; color: #a1a1aa; font-size: 16px;">💰 Total Amount:</span>
                            <span style="font-size: 18px; font-weight: 700; color: #22c55e;">₹${booking.amount}</span>
                        </div>
                    </div>
                    
                    <!-- Enjoy Message -->
                    <div style="text-align: center; font-size: 20px; font-weight: 600; color: #F84565; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #1c1c1e 0%, #27272a 100%); border-radius: 8px; border: 2px dashed #F84565;">
                        🍿 Enjoy your show! 🎭
                    </div>
                    
                    <!-- Additional Info -->
                    <div style="text-align: center; margin-top: 30px; color: #71717a; font-size: 14px;">
                        <div style="margin-bottom: 10px;">Please arrive at the theater at least 15 minutes before the show time.</div>
                        <div>Thank you for choosing The Cine Pass for your movie experience!</div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #18181b; color: white; padding: 30px; text-align: center; border-top: 1px solid #27272a;">
                    <div style="margin: 0 0 10px 0; font-size: 16px;">Best Regards,</div>
                    <div style="font-size: 20px; font-weight: 700; color: #F84565; margin: 0;">The Cine Pass</div>
                    <div style="margin-top: 15px; font-size: 14px; opacity: 0.8;">Your premium movie booking experience</div>
                </div>
            </div>
            `
        })
    }
)

export const functions = [
    syncUserCreation,
    syncUserDeletion, 
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail
];
