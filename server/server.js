import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/db.js';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inggest/index.js";
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
await connectDB();

//Stripe Webhooks route
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks); 

//Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware())

// API Routes
app.get('/', (req, res) => {res.send('Server is Live!');});
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use('/api/show', showRouter);
app.use('/api/booking', bookingRouter);
// Admin Routes
app.use('/api/admin', adminRouter);
//User Routes
app.use('/api/user', userRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});