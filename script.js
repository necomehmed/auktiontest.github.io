// Initialize Stripe with your publishable key
const stripe = Stripe('pk_test_YourPublishableKey'); // Replace with your Stripe publishable key

// Initialize Stripe Elements
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');

// Handle the bidding and payment process
document.getElementById('bidForm').onsubmit = async function(event) {
    event.preventDefault();
    const bidderName = document.getElementById('bidderName').value;
    const bidAmount = parseFloat(document.getElementById('bidAmount').value);
    const cardErrors = document.getElementById('card-errors');
    const bidMessage = document.getElementById('bidMessage');

    const response = await fetch('/can-place-bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: bidderName })
    });

    const result = await response.json();

    if (!result.canPlaceBid) {
        bidMessage.textContent = 'You must have an active subscription to place a bid.';
        bidMessage.style.color = 'red';
        return;
    }

    if (!isNaN(bidAmount)) {
        try {
            // Create a payment intent on the server
            const response = await fetch('/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: bidAmount * 100 }) // amount in cents
            });

            if (!response.ok) {
                const errorData = await response.json();
                bidMessage.textContent = `Error: ${errorData.error}`;
                bidMessage.style.color = 'red';
                return;
            }

            const paymentIntent = await response.json();

            const result = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
                payment_method: {
                    card: card,
                    billing_details: {
                        name: bidderName,
                    },
                },
            });

            if (result.error) {
                cardErrors.textContent = result.error.message;
                bidMessage.textContent = 'Payment failed. Please try again.';
                bidMessage.style.color = 'red';
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    bidMessage.textContent = 'Payment succeeded and bid placed!';
                    bidMessage.style.color = 'green';
                }
            }
        } catch (error) {
            bidMessage.textContent = 'An error occurred. Please try again.';
            bidMessage.style.color = 'red';
        }
    } else {
        alert('Please enter a valid bid amount.');
    }
};

// Function to check if user is admin
function isAdmin() {
    const username = localStorage.getItem('loggedInUser');
    return username === 'admin';
}

// Toggle between login and registration forms
document.getElementById('showRegister').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('registerChoiceContainer').style.display = 'block';
});

document.getElementById('showLoginFromChoice').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('registerChoiceContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
});

document.getElementById('showPrivateRegister').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('registerChoiceContainer').style.display = 'none';
    document.getElementById('privateRegisterContainer').style.display = 'block';
});

document.getElementById('showBusinessRegister').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('registerChoiceContainer').style.display = 'none';
    document.getElementById('businessRegisterContainer').style.display = 'block';
});

document.getElementById('showLoginFromPrivate').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('privateRegisterContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
});

document.getElementById('showLoginFromBusiness').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('businessRegisterContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
});

// CPR number validation and formatting function
function validateAndFormatCPR(cpr) {
    const cprPattern = /^\d{10}$/;
    if (cprPattern.test(cpr)) {
        return `${cpr.slice(0, 6)}-${cpr.slice(6)}`;
    }
    return null;
}

// Validate CPR input in real-time
document.getElementById('privateCPR').addEventListener('input', function() {
    const cpr = document.getElementById('privateCPR').value;
    const message = document.getElementById('privateCPRMessage');
    if (validateAndFormatCPR(cpr)) {
        message.innerText = '';
    } else {
        message.innerText = 'CPR number must be 10 digits.';
    }
});

document.getElementById('businessCPR').addEventListener('input', function() {
    const cpr = document.getElementById('businessCPR').value;
    const message = document.getElementById('businessCPRMessage');
    if (validateAndFormatCPR(cpr)) {
        message.innerText = '';
    } else {
        message.innerText = 'CPR number must be 10 digits.';
    }
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginMessage = document.getElementById('loginMessage');

    const storedUser = localStorage.getItem('user');
    const storedPass = localStorage.getItem('password');

    if ((username === 'admin' && password === 'adminpass') || (username === storedUser && password === storedPass)) {
        localStorage.setItem('loggedInUser', username);
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        displayProducts();
    } else {
        loginMessage.innerText = 'Invalid username or password';
        loginMessage.style.color = 'red';
    }
});

// Handle private registration form submission
document.getElementById('privateRegisterForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const newUsername = document.getElementById('privateUsername').value;
    const newEmail = document.getElementById('privateEmail').value;
    const newPassword = document.getElementById('privatePassword').value;
    const privateCPR = document.getElementById('privateCPR').value;
    const privateRegisterMessage = document.getElementById('privateRegisterMessage');

    if (!validateAndFormatCPR(privateCPR)) {
        document.getElementById('privateCPRMessage').innerText = 'CPR number must be 10 digits.';
        return;
    }

    const response = await fetch('/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
    });

    const result = await response.json();
    privateRegisterMessage.innerText = result.message;
    privateRegisterMessage.style.color = 'blue';

    const verificationCode = prompt('Enter the verification code sent to your email:');

    const verifyResponse = await fetch('/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, code: verificationCode })
    });

    if (verifyResponse.ok) {
        const formattedCPR = validateAndFormatCPR(privateCPR);
        if (!formattedCPR) {
            privateRegisterMessage.innerText = 'Invalid CPR number format. It should be 10 digits.';
            privateRegisterMessage.style.color = 'red';
            return;
        }

        localStorage.setItem('user', newUsername);
        localStorage.setItem('email', newEmail);
        localStorage.setItem('password', newPassword);
        localStorage.setItem('cpr', formattedCPR);

        privateRegisterMessage.innerText = 'Registration successful! You can now log in.';
        privateRegisterMessage.style.color = 'green';

        setTimeout(function() {
            document.getElementById('privateRegisterContainer').style.display = 'none';
            document.getElementById('loginContainer').style.display = 'block';
        }, 2000);
    } else {
        const errorResult = await verifyResponse.json();
        privateRegisterMessage.innerText = errorResult.message;
        privateRegisterMessage.style.color = 'red';
    }
});

// Handle business registration form submission
document.getElementById('businessRegisterForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const newUsername = document.getElementById('businessUsername').value;
    const newEmail = document.getElementById('businessEmail').value;
    const newPassword = document.getElementById('businessPassword').value;
    const businessName = document.getElementById('businessName').value;
    const businessAddress = document.getElementById('businessAddress').value;
    const businessCPR = document.getElementById('businessCPR').value;
    const businessRegisterMessage = document.getElementById('businessRegisterMessage');

    if (!validateAndFormatCPR(businessCPR)) {
        document.getElementById('businessCPRMessage').innerText = 'CPR number must be 10 digits.';
        return;
    }

    const response = await fetch('/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
    });

    const result = await response.json();
    businessRegisterMessage.innerText = result.message;
    businessRegisterMessage.style.color = 'blue';

    const verificationCode = prompt('Enter the verification code sent to your email:');

    const verifyResponse = await fetch('/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, code: verificationCode })
    });

    if (verifyResponse.ok) {
        const formattedCPR = validateAndFormatCPR(businessCPR);
        if (!formattedCPR) {
            businessRegisterMessage.innerText = 'Invalid CPR number format. It should be 10 digits.';
            businessRegisterMessage.style.color = 'red';
            return;
        }

        const businessData = {
            username: newUsername,
            email: newEmail,
            password: newPassword,
            name: businessName,
            address: businessAddress,
            cpr: formattedCPR
        };

        localStorage.setItem('businessUser', JSON.stringify(businessData));

        businessRegisterMessage.innerText = 'Registration successful! You can now log in.';
        businessRegisterMessage.style.color = 'green';

        setTimeout(function() {
            document.getElementById('businessRegisterContainer').style.display = 'none';
            document.getElementById('loginContainer').style.display = 'block';
        }, 2000);
    } else {
        const errorResult = await verifyResponse.json();
        businessRegisterMessage.innerText = errorResult.message;
        businessRegisterMessage.style.color = 'red';
    }
});

// Display products
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    const products = JSON.parse(localStorage.getItem('products')) || [];

    products.forEach(product => {
        const li = document.createElement('div');
        li.className = 'item';
        li.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p>Auction ends at: ${new Date(product.endTime).toLocaleString()}</p>
            <p id="countdown-${product.id}"></p>
            <button onclick="displayProductDetail(${product.id})">View Details</button>
        `;
        li.dataset.id = product.id;

        if (isAdmin()) {
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.onclick = function() {
                deleteProduct(product.id);
            };
            li.appendChild(deleteButton);
        }

        productList.appendChild(li);

        updateCountdown(product.id, product.endTime);
    });
}

// Delete product function
function deleteProduct(productId) {
    let products = JSON.parse(localStorage.getItem('products')) || [];
    products = products.filter(p => p.id != productId);
    localStorage.setItem('products', JSON.stringify(products));
    displayProducts();
}

// Display product detail and handle bidding
function displayProductDetail(productId) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => p.id == productId);

    if (product) {
        document.getElementById('productTitle').innerText = product.name;
        document.getElementById('productDescriptionText').innerText = product.description;
        document.getElementById('productImageDisplay').src = product.image;
        document.getElementById('auctionEndTimeText').innerText = `Auction ends at: ${new Date(product.endTime).toLocaleString()}`;
        document.getElementById('productDetailContainer').style.display = 'block';
        updateCountdown('productDetail', product.endTime);

        const highestBidderDiv = document.getElementById('highestBidder');
        if (product.highestBid) {
            highestBidderDiv.innerHTML = `<p>Highest Bid: $${product.highestBid.amount} by ${product.highestBid.bidder}</p>`;
        } else {
            highestBidderDiv.innerHTML = '<p>No bids yet.</p>';
        }

        document.getElementById('bidForm').onsubmit = async function(event) {
            event.preventDefault();
            const bidderName = document.getElementById('bidderName').value;
            const bidAmount = parseFloat(document.getElementById('bidAmount').value);
            const cardErrors = document.getElementById('card-errors');
            const bidMessage = document.getElementById('bidMessage');

            const response = await fetch('/can-place-bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: bidderName })
            });

            const result = await response.json();

            if (!result.canPlaceBid) {
                bidMessage.textContent = 'You must have an active subscription to place a bid.';
                bidMessage.style.color = 'red';
                return;
            }

            if (!isNaN(bidAmount)) {
                try {
                    const response = await fetch('/create-payment-intent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: bidAmount * 100 })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        bidMessage.textContent = `Error: ${errorData.error}`;
                        bidMessage.style.color = 'red';
                        return;
                    }

                    const paymentIntent = await response.json();

                    const result = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
                        payment_method: {
                            card: card,
                            billing_details: {
                                name: bidderName,
                            },
                        },
                    });

                    if (result.error) {
                        cardErrors.textContent = result.error.message;
                        bidMessage.textContent = 'Payment failed. Please try again.';
                        bidMessage.style.color = 'red';
                    } else {
                        if (result.paymentIntent.status === 'succeeded') {
                            bidMessage.textContent = 'Payment succeeded and bid placed!';
                            bidMessage.style.color = 'green';

                            product.highestBid = {
                                bidder: bidderName,
                                amount: bidAmount
                            };

                            localStorage.setItem('products', JSON.stringify(products));
                            document.getElementById('highestBidder').innerHTML = `<p>Highest Bid: $${product.highestBid.amount} by ${product.highestBid.bidder}</p>`;
                        }
                    }
                } catch (error) {
                    bidMessage.textContent = 'An error occurred. Please try again.';
                    bidMessage.style.color = 'red';
                }
            } else {
                alert('Please enter a valid bid amount.');
            }
        };

        if (isAdmin()) {
            const deleteBidsButton = document.createElement('button');
            deleteBidsButton.innerText = 'Delete Bids';
            deleteBidsButton.onclick = function() {
                deleteBids(product.id);
            };
            highestBidderDiv.appendChild(deleteBidsButton);
        }

        document.getElementById('hideProductDetailsButton').onclick = function() {
            document.getElementById('productDetailContainer').style.display = 'none';
        };
    }
}

// Delete bids for a product
function deleteBids(productId) {
    let products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => p.id == productId);

    if (product) {
        product.highestBid = null;
        localStorage.setItem('products', JSON.stringify(products));
        displayProductDetail(productId);
    }
}

// Handle adding products
document.getElementById('addProductForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const productName = document.getElementById('productName').value;
    const productDescription = document.getElementById('productDescription').value;
    const productImage = document.getElementById('productImage').files[0];
    const productImageUrl = document.getElementById('productImageUrl').value;
    const auctionEndTime = document.getElementById('auctionEndTime').value;
    const productMessage = document.getElementById('productMessage');

    if (!productImage && !productImageUrl) {
        productMessage.innerText = 'Please provide an image file or URL for the product.';
        productMessage.style.color = 'red';
        return;
    }

    const products = JSON.parse(localStorage.getItem('products')) || [];

    const newProduct = {
        id: Date.now(),
        name: productName,
        description: productDescription,
        image: '',
        endTime: auctionEndTime,
        highestBid: null
    };

    if (productImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            newProduct.image = e.target.result;
            products.push(newProduct);
            localStorage.setItem('products', JSON.stringify(products));
            displayProducts();
            document.getElementById('addProductForm').reset();
            productMessage.innerText = 'Product added successfully!';
            productMessage.style.color = 'green';
        };
        reader.readAsDataURL(productImage);
    } else if (productImageUrl) {
        newProduct.image = productImageUrl;
        products.push(newProduct);
        localStorage.setItem('products', JSON.stringify(products));
        displayProducts();
        document.getElementById('addProductForm').reset();
        productMessage.innerText = 'Product added successfully!';
        productMessage.style.color = 'green';
    }
});

// Update countdown timer for each product
function updateCountdown(productId, endTime) {
    const countdownElement = document.getElementById(`countdown-${productId}`);

    function update() {
        const now = new Date().getTime();
        const distance = new Date(endTime).getTime() - now;

        if (distance < 0) {
            countdownElement.innerText = 'Auction has ended';
            clearInterval(interval);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    update();
    const interval = setInterval(update, 1000);
}

// Initialize products display on page load
document.addEventListener('DOMContentLoaded', function() {
    displayProducts();
});
