// Initialize Stripe with your publishable key
const stripe = Stripe('pk_live_51ObqwXGHGy6J1RO3cJ7a2r44CoZMv4zOLe8vYR2zEevEF8sjmymr98q9uDy9d0fP0uUoGrF0cBoMQlkoy4ZIMgE400vgaRl1rE');

// Initialize Stripe Elements
const elements = stripe.elements();
const card = elements.create('card', {
    style: {
        base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
        }
    }
});
card.mount('#card-element');

// Handle subscription form submission
document.getElementById('subscription-form').onsubmit = async function(event) {
    event.preventDefault();
    const cardErrors = document.getElementById('card-errors');
    const subscriptionMessage = document.getElementById('subscriptionMessage');

    try {
        // Create a subscription on the server
        const response = await fetch('/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorData = await response.json();
            subscriptionMessage.textContent = `Error: ${errorData.error}`;
            subscriptionMessage.style.color = 'red';
            return;
        }

        const subscription = await response.json();

        const result = await stripe.confirmCardPayment(subscription.clientSecret, {
            payment_method: {
                card: card,
            },
        });

        if (result.error) {
            cardErrors.textContent = result.error.message;
            subscriptionMessage.textContent = 'Subscription failed. Please try again.';
            subscriptionMessage.style.color = 'red';
        } else {
            if (result.paymentIntent.status === 'succeeded') {
                subscriptionMessage.textContent = 'Subscription successful!';
                subscriptionMessage.style.color = 'green';

                localStorage.setItem('subscriptionStatus', 'active');
            }
        }
    } catch (error) {
        subscriptionMessage.textContent = 'An error occurred. Please try again.';
        subscriptionMessage.style.color = 'red';
    }
};
