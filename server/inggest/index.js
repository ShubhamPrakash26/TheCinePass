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
    async ({event, step}) => {
        const {bookingId} = event.data;
        
        // Add error handling and retry logic
        const booking = await step.run('fetch-booking-details', async () => {
            // First, get the booking without population to check if it exists
            const basicBooking = await Booking.findById(bookingId);
            if (!basicBooking) {
                throw new Error(`Booking with ID ${bookingId} not found`);
            }
            
            console.log(`Found booking: ${bookingId}`, {
                userId: basicBooking.user,
                showId: basicBooking.show,
                isPaid: basicBooking.isPaid
            });
            
            // Check if user exists separately
            const user = await User.findById(basicBooking.user);
            if (!user) {
                console.error(`User with ID ${basicBooking.user} not found for booking ${bookingId}`);
                throw new Error(`User with ID ${basicBooking.user} not found for booking ${bookingId}`);
            }
            
            console.log(`Found user: ${user._id}`, {
                name: user.name,
                email: user.email
            });
            
            // Now populate the booking with retry logic
            let booking = null;
            let retries = 3;
            
            while (retries > 0 && !booking) {
                booking = await Booking.findById(bookingId)
                    .populate({
                        path: 'show',
                        populate: {
                            path: 'movie',
                            model: 'Movie'
                        }
                    })
                    .populate('user');
                
                if (!booking) {
                    console.log(`Failed to populate booking ${bookingId}, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    retries--;
                } else if (!booking.user) {
                    console.log(`User population failed for booking ${bookingId}, retrying... (${retries} attempts left)`);
                    booking = null; // Reset to retry
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                    retries--;
                }
            }
            
            if (!booking) {
                throw new Error(`Failed to populate booking ${bookingId} after retries`);
            }
            
            if (!booking.user) {
                // If population still fails, manually attach the user
                console.log(`Population failed, manually attaching user to booking ${bookingId}`);
                booking.user = user;
            }
            
            if (!booking.user.email) {
                throw new Error(`Email not found for user ${booking.user._id} in booking ${bookingId}`);
            }
            
            if (!booking.show) {
                throw new Error(`Show not found for booking ${bookingId}`);
            }
            
            if (!booking.show.movie) {
                throw new Error(`Movie not found for booking ${bookingId}`);
            }
            
            return booking;
        });
        
        // Send email in a separate step
        await step.run('send-confirmation-email', async () => {
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
                            Hi ${booking.user.name || 'Movie Lover'},
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
            });
            
            console.log(`Booking confirmation email sent successfully for booking ${bookingId}`);
        });
    }
)

// Reminder emails
const showSendReminders = inngest.createFunction(
    {id: "send-show-emails"},
    {cron: "0 */8 * * *"},
    async ({step}) => {
        const now = new Date();
        const targetTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const searchWindowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
        const searchWindowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);   

        const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
            const shows = await Show.find({
                showTime: {$gte: searchWindowStart, $lte: searchWindowEnd},
            }).populate('movie');

            const tasks = [];
            for (const show of shows) {
                if (show.movie && show.occupiedSeats && Object.keys(show.occupiedSeats).length > 0) {
                    const userIds = [...new Set(Object.values(show.occupiedSeats))];
                    
                    if (userIds.length === 0) continue;

                    const users = await User.find({_id: {$in: userIds}}).select('name email');
                    for (const user of users) {
                        tasks.push({
                            userEmail: user.email,
                            userName: user.name,
                            movieTitle: show.movie.title,
                            showTime: show.showTime,
                        });
                    }
                }
            }
            return tasks;
        });

        if(reminderTasks.length === 0) {
            return {sent: 0, message: "No reminders to send"};
        }

        const results = await step.run('send-all-reminders', async () =>{
            return await Promise.all(reminderTasks.map(task => {
                const emailBody = `
                    <div style="max-width:600px; margin:20px auto; background-color:#09090B; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.3); overflow:hidden; color:white; font-family:'Outfit', sans-serif, Arial;">
                        <div style="background-color:#1a1a1d; padding:20px 30px; text-align:center; border-bottom:1px solid #2a2a2d;">
                            <h1 style="margin:0; font-size:26px; color:white; font-family:'Outfit', sans-serif, Arial; letter-spacing:1px;">
                                <span style="display:inline-block; vertical-align:middle; margin-right:8px;">🎬</span> TheCinePass
                            </h1>
                        </div>
                        <div style="padding:25px 35px; line-height:1.6;">
                            <h2 style="color:white; margin-top:0; margin-bottom:20px; font-size:22px; font-family:'Outfit', sans-serif, Arial;">Hello ${task.userName},</h2>
                            <p style="margin-bottom:15px; font-size:16px; font-family:'Outfit', sans-serif, Arial;">This is a quick reminder about your upcoming movie:</p>
                            <div style="background-color:#161618; padding:20px; border-radius:8px; margin-bottom:25px; text-align:center;">
                                <h3 style="color:#F84565; font-size:26px; margin:0; padding:0; font-family:'Outfit', sans-serif, Arial; line-height:1.2;">${task.movieTitle}</h3>
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:25px;">
                                <tr>
                                    <td style="width:50%; padding-right:10px; vertical-align:top;">
                                        <p style="margin:0; font-size:16px; color:#cccccc; font-family:'Outfit', sans-serif, Arial;">
                                            <span style="display:inline-block; vertical-align:middle; margin-right:5px; font-size:20px;">📅</span> Date:
                                            <br>
                                            <strong style="color:#F84565; font-size:18px;">${new Date(task.showTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</strong>
                                        </p>
                                    </td>
                                    <td style="width:50%; padding-left:10px; vertical-align:top;">
                                        <p style="margin:0; font-size:16px; color:#cccccc; font-family:'Outfit', sans-serif, Arial;">
                                            <span style="display:inline-block; vertical-align:middle; margin-right:5px; font-size:20px;">⏰</span> Time:
                                            <br>
                                            <strong style="color:#F84565; font-size:18px;">${new Date(task.showTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin-bottom:25px; font-size:16px; font-family:'Outfit', sans-serif, Arial; text-align:center;">
                                Your show starts in approximately <strong style="color:#F84565; font-size:18px;">8 hours</strong> – get ready for the experience!
                            </p>
                            <p style="text-align:center; margin-top:30px; margin-bottom:20px;">
                                <a href="#" style="display:inline-block; background-color:#F84565; color:white; padding:14px 30px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:18px; font-family:'Outfit', sans-serif, Arial; box-shadow:0 4px 8px rgba(0,0,0,0.2);">
                                    <span style="display:inline-block; vertical-align:middle; margin-right:8px; font-size:22px;">🎟️</span> View My Tickets
                                </a>
                            </p>
                            <p style="margin-top:20px; text-align:center; color:#cccccc; font-size:15px; font-family:'Outfit', sans-serif, Arial;">
                                Enjoy the show!
                            </p>
                        </div>
                        <div style="background-color:#1a1a1d; padding:15px 30px; text-align:center; font-size:13px; color:#888888; border-top:1px solid #2a2a2d; font-family:'Outfit', sans-serif, Arial;">
                            <p style="margin:0;">TheCinePass Team</p>
                            <p style="margin:5px 0 0 0;">&copy; 2025 TheCinePass. All rights reserved.</p>
                        </div>
                    </div>
                `;
            }));
        });
        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - sent;
        return { sent, failed, message: `${sent} reminders sent successfully, ${failed} failed` };
    }
);

// Inngest function to send notification when a new show is created
const sendNewShowNotification = inngest.createFunction(
    {id: "send-new-show-notification"},
    {event: "app/show.created"},
    async ({event}) => {
        const { movieTitle, movieId} = event.data;
        const users = await User.find({});
        for (const user of users) {
            const userEmail = user.email;
            const userName = user.name;
            const subject = `🎬 New Show Added ${movieTitle}`;
            const body = `
                <div style="max-width:600px; margin:20px auto; background-color:#09090B; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.3); overflow:hidden; color:white; font-family:'Outfit', sans-serif, Arial;">
                    <div style="background-color:#1a1a1d; padding:20px 30px; text-align:center; border-bottom:1px solid #2a2a2d;">
                        <h1 style="margin:0; font-size:26px; color:white; font-family:'Outfit', sans-serif, Arial; letter-spacing:1px;">
                            <span style="display:inline-block; vertical-align:middle; margin-right:8px;">🎬</span> TheCinePass
                        </h1>
                    </div>
                    <div style="padding:25px 35px; line-height:1.6;">
                        <h2 style="color:white; margin-top:0; margin-bottom:20px; font-size:22px; font-family:'Outfit', sans-serif, Arial;">Hello ${userName},</h2>
                        <p style="margin-bottom:15px; font-size:16px; font-family:'Outfit', sans-serif, Arial;">We are excited to announce a new show:</p>
                        <div style="background-color:#161618; padding:20px; border-radius:8px; margin-bottom:25px; text-align:center;">
                            <h3 style="color:#F84565; font-size:26px; margin:0; padding:0; font-family:'Outfit', sans-serif, Arial;">${movieTitle}</h3>
                        </div>
                        <p style="text-align:center;">
                            <a href="/show/${movieId}" style="display:inline-block; background-color:#F84565; color:white; padding:14px 30px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:18px; font-family:'Outfit', sans-serif, Arial;">
                                View Show Details
                            </a>
                        </p>
                        <p style="margin-top:20px;">Thank you for being a part of TheCinePass community!</p>
                    </div>
                    <div style="background-color:#1a1a1d; padding:15px 30px; text-align:center; font-size:13px; color:#888888; border-top:1px solid #2a2a2d; font-family:'Outfit', sans-serif, Arial;">
                        <p style="margin:0;">TheCinePass Team</p>
                        <p style="margin:5px 0 0 0;">&copy; 2025 TheCinePass. All rights reserved.</p>
                    </div>
                </div>    
            `;
            await sendEmail({
                to: userEmail,
                subject: subject,
                body: body
            });
        }
        return { message: "New show notification sent to all users" };
    }
)

export const functions = [
    syncUserCreation,
    syncUserDeletion, 
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
    showSendReminders,
    sendNewShowNotification
];
