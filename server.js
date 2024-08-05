const express = require('express');
const stripe = require('stripe')('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'); // Replace with your Stripe secret key
const path = require('path');
const sgMail = require('@sendgrid/mail');
const app = express();
const verificationCodes = {}; // In-memory store for verification codes

sgMail.setApiKey('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'); // Replace with your SendGrid API key

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Route to serve index.html explicitly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to check subscription status
async function checkSubscriptionStatus(customerId) {
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
    });
    return subscriptions.data.length > 0;
}

// Example user data (replace with your actual user management logic)
const users = {
    admin: {
        role: 'admin',
        customerId: null,
    },
    user1: {
        role: 'user',
        customerId: 'cus_123', // Replace with actual customer ID
    },
    // Add more users as needed
};

// Route to check if a user can place a bid
app.post('/can-place-bid', async (req, res) => {
    const { username } = req.body;
    const user = users[username];

    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }

    if (user.role === 'admin') {
        return res.send({ canPlaceBid: true });
    }

    const hasSubscription = await checkSubscriptionStatus(user.customerId);
    res.send({ canPlaceBid: hasSubscription });
});

app.post('/create-payment-intent', async (req, res) => {
    const { amount } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (e) {
        console.error('Error creating payment intent:', e);
        res.status(400).send({
            error: e.message,
        });
    }
});

// Email verification route
app.post('/send-verification-email', async (req, res) => {
    const { email } = req.body;
    const verificationCode = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit code
    verificationCodes[email] = verificationCode;

    const msg = {
        to: email,
        from: 'necat9911@gmail.com', // Use the email address or domain you verified with SendGrid
        subject: '<Email Verification Code>',
        text: `Your verification code is: ${verificationCode}`,
    };

    try {
        await sgMail.send(msg);
        res.send({ message: 'Verification email sent!' });
    } catch (error) {
        console.error('Error sending verification email:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        res.status(500).send({ message: 'Failed to send verification email' });
    }
});

// Email verification check route
app.post('/verify-email', (req, res) => {
    const { email, code } = req.body;
    if (verificationCodes[email] === parseInt(code)) {
        delete verificationCodes[email]; // Remove code after verification
        res.send({ message: 'Email verified successfully!' });
    } else {
        res.status(400).send({ message: 'Invalid verification code' });
    }
});

// Create a subscription route
app.post('/create-subscription', async (req, res) => {
    const { plan } = req.body; // Receive plan from client-side

    const priceIdMapping = {
        "price_90_dkk": "price_1PTN5dGHGy6J1RO3wBoGR04l", // Replace with actual price ID
        "price_150_dkk": "price_150_dkk_actual_id", // Replace with actual price ID
        "price_289_dkk": "price_289_dkk_actual_id" // Replace with actual price ID
    };

    const priceId = priceIdMapping[plan];

    if (!priceId) {
        return res.status(400).send({ error: 'Invalid plan selected' });
    }

    try {
        const customer = await stripe.customers.create();
        console.log('Customer created:', customer.id);

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }], // Use plan from client-side
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        });

        console.log('Subscription created:', subscription);

        if (!subscription.latest_invoice || !subscription.latest_invoice.payment_intent) {
            console.error('Failed to retrieve payment intent:', subscription);
            throw new Error('Failed to create payment intent.');
        }

        res.send({
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (e) {
        console.error('Error creating subscription:', e);
        res.status(400).send({
            error: e.message,
        });
    }
});

// Unsubscribe route
app.post('/unsubscribe', async (req, res) => {
    const { subscriptionId } = req.body;

    try {
        const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
        res.send({ message: 'Subscription cancelled successfully', deletedSubscription });
    } catch (e) {
        console.error('Error cancelling subscription:', e);
        res.status(400).send({ error: e.message });
    }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
