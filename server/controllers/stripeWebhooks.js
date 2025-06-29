import stripe from 'stripe';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { inngest } from '../inggest/index.js';

export const stripeWebhooks = async (req, res) => {
    const stripeInstance = new stripe(process.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch(event.type) {
            case 'payment_intent.succeeded':
                {
                    const payment_intent = event.data.object;
                    const sessionList = await stripeInstance.checkout.sessions.list({
                        payment_intent: payment_intent.id,
                    });
                    const session = sessionList.data[0];
                    
                    if (session && session.metadata && session.metadata.bookingId) {
                        const { bookingId } = session.metadata;
                        
                        console.log(`Processing payment for booking: ${bookingId}`);
                        
                        // First, check if booking exists and log its current state
                        const existingBooking = await Booking.findById(bookingId);
                        if (!existingBooking) {
                            console.error(`Booking ${bookingId} not found in database`);
                            return res.status(404).json({ error: 'Booking not found' });
                        }
                        
                        console.log(`Found booking ${bookingId}:`, {
                            userId: existingBooking.user,
                            showId: existingBooking.show,
                            currentPaidStatus: existingBooking.isPaid,
                            amount: existingBooking.amount,
                            seats: existingBooking.bookedSeat
                        });
                        
                        // Check if the user exists
                        const user = await User.findById(existingBooking.user);
                        if (!user) {
                            console.error(`User ${existingBooking.user} not found for booking ${bookingId}`);
                            return res.status(404).json({ error: 'User not found' });
                        }
                        
                        console.log(`Found user ${user._id}:`, {
                            name: user.name,
                            email: user.email
                        });
                        
                        // Update the booking
                        const updatedBooking = await Booking.findByIdAndUpdate(
                            bookingId,
                            {
                                isPaid: true,
                                paymentLink: ""
                            },
                            { new: true }
                        );
                        
                        if (updatedBooking) {
                            console.log(`Booking ${bookingId} marked as paid successfully`);
                            console.log(`Updated booking details:`, {
                                isPaid: updatedBooking.isPaid,
                                user: updatedBooking.user,
                                show: updatedBooking.show
                            });
                            
                            // Add a small delay to ensure all database operations are complete
                            setTimeout(async () => {
                                try {
                                    await inngest.send({
                                        name: 'app/show.booked',
                                        data: { bookingId }
                                    });
                                    console.log(`Inngest event sent for booking ${bookingId}`);
                                } catch (inngestError) {
                                    console.error(`Failed to send Inngest event for booking ${bookingId}:`, inngestError);
                                }
                            }, 1000); // 1 second delay
                            
                        } else {
                            console.error(`Failed to update booking ${bookingId}`);
                        }
                    } else {
                        console.error('No session or bookingId found in metadata');
                    }
                    break;
                }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.json({received: true});
    } catch (err) {
        console.error(`Error processing webhook: ${err.message}`);
        res.status(500).send(`Webhook Error: ${err.message}`);
    }
}