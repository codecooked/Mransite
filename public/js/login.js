document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            if (type === 'password') {
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    }
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Clear previous error messages
        document.getElementById('emailError').textContent = '';
        document.getElementById('passwordError').textContent = '';
        document.getElementById('formError').textContent = '';

        // Retrieve input values
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        let hasError = false;

        // Simple email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            document.getElementById('emailError').textContent = 'Please enter a valid email address.';
            hasError = true;
        }

        // Password validation (minimum 8 characters)
        if (password.length < 8) {
            document.getElementById('passwordError').textContent = 'Password must be at least 8 characters long.';
            hasError = true;
        }

        // If validation fails, stop form submission
        if (hasError) {
            return;
        }

        // Get the base URL dynamically
        const baseUrl = window.location.origin;

        // Submit form data
        fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password }),
            credentials: 'include' // Include credentials for session cookies
        })
        .then(response => {
            return response.json().then(data => {
                if (!response.ok) {
                    throw new Error(data.message || 'Login failed.');
                }
                return data;
            });
        })
        .then(data => {
            if (data.success) {
                // Check user role and redirect accordingly using dynamic base URL
                if (data.role === 'admin') {
                    window.location.href = `${baseUrl}/admin_dashboard`;
                } else {
                    window.location.href = `${baseUrl}/dashboard`;
                }
            } else {
                document.getElementById('formError').textContent = data.message;
            }
        })
        .catch(error => {
            console.error('Error during login:', error);
            document.getElementById('formError').textContent = error.message || 'An error occurred during login.';
        });
    });
}