 // Toggle between login and registration forms
 document.getElementById('showRegister').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('registerContainer').style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('registerContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
});

// Handle login
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginMessage = document.getElementById('loginMessage');

    const storedUser = localStorage.getItem('user');
    const storedPass = localStorage.getItem('password');

    if ((username === 'admin' && password === 'adminpass') || (username === storedUser && password === storedPass)) {
        localStorage.setItem('loggedInUser', username);
        window.location.href = 'bidding.html';
    } else {
        loginMessage.innerText = 'Invalid username or password';
        loginMessage.style.color = 'red';
    }
});

// Handle registration
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;
    const registerMessage = document.getElementById('registerMessage');

    localStorage.setItem('user', newUsername);
    localStorage.setItem('password', newPassword);

    registerMessage.innerText = 'Registration successful! You can now log in.';
    registerMessage.style.color = 'green';

    setTimeout(function() {
        document.getElementById('registerContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'block';
    }, 2000);
});