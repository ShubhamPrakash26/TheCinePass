import stripe from 'stripe';
import Booking from '../models/Booking.js';

export const stripeWebhooks = async (req, res) =>{
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
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
    try{
        switch(event.type) {
            case 'payment_intent.succeeded':
                {
                    const payment_intent = event.data.object;
                    const sessionList = await stripeInstance.checkout.sessions.list({
                        payment_intent: payment_intent.id,
                    })
                    const session = sessionList.data[0];
                    const bookingId = session.metadata.bookingId;
                    await Booking.findByIdAndUpdate(
                        bookingId, {
                            idPaid: true,
                            paymentLink: ""
                        })
                    break;
                }
            default:
                console.log(`Unhandled event type ${event.type}`);
                break;
        }
        res.json({received: true});
    } catch (err) {
        console.error(`Error processing webhook: ${err.message}`);
        res.status(500).send(`Webhook Error: ${err.message}`);
    }
}