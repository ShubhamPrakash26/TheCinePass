import stripe from 'stripe';
import Booking from '../models/Booking.js';
import { inngest } from '../inggest/index.js';

export const stripeWebhooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const payment_intent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: payment_intent.id,
                });
                const session = sessionList.data[0];

                if (session && session.metadata && session.metadata.bookingId) {
                    const { bookingId } = session.metadata;

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
                        await inngest.send({
                            name: 'app/show.booked',
                            data: { bookingId }
                        });
                    } else {
                        console.error(`Booking ${bookingId} not found`);
                    }
                } else {
                    console.error('No session or bookingId found in metadata');
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error(`Error processing webhook: ${err.message}`);
        res.status(500).send(`Webhook Error: ${err.message}`);
    }
};