document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signupForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const inputs = [emailInput, passwordInput, confirmPasswordInput];
    const button = document.querySelector('.login-btn');

    // Toggle password visibility
    if (togglePassword && passwordInput && confirmPasswordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            confirmPasswordInput.setAttribute('type', type); // Toggle confirmPassword field as well

            // Toggle icon between eye and eye-slash
            if (type === 'password') {
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            } else {
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            }
        });
    }

    // Input focus and focusout events for span styling
    inputs.forEach(input => {
        input.addEventListener('focus', handleFocus);
        input.addEventListener('focusout', handleFocusOut);
        input.addEventListener('input', handleChange);
    });

    function handleFocus({ target }) {
        const span = target.previousElementSibling;
        if (span) span.classList.add('span-active');
    }

    function handleFocusOut({ target }) {
        if (target.value === '') {
            const span = target.previousElementSibling;
            if (span) span.classList.remove('span-active');
        }
    }

    function handleChange() {
        if (
            emailInput.value &&
            passwordInput.value.length >= 8 &&
            passwordInput.value === confirmPasswordInput.value
        ) {
            button.removeAttribute('disabled');
        } else {
            button.setAttribute('disabled', '');
        }
    }

    // Form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Password validation
        if (password.length < 8) {
            alert('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.success) {
                alert('Account created successfully! Redirecting to login.');
                window.location.href = '/';
            } else {
                alert(data.message || 'Signup failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again later.');
        }
    });
});
