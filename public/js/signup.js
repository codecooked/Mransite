document.addEventListener('DOMContentLoaded', function() { 
    const form = document.getElementById('signupForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword1 = document.getElementById('togglePassword1');
    const togglePassword2 = document.getElementById('togglePassword2');
    const inputs = [emailInput, passwordInput, confirmPasswordInput];
    const button = document.querySelector('.login-btn');

    // Password requirements
    const passwordRequirements = {
        minLength: 8,
        hasUpperCase: /[A-Z]/,
        hasLowerCase: /[a-z]/,
        hasNumbers: /\d/,
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
    };

    // Function to validate password
    function validatePassword(password) {
        const errors = [];
        
        if (password.length < passwordRequirements.minLength) {
            errors.push(`Password must be at least ${passwordRequirements.minLength} characters long`);
        }
        if (!passwordRequirements.hasUpperCase.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!passwordRequirements.hasLowerCase.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!passwordRequirements.hasNumbers.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!passwordRequirements.hasSpecialChar.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return errors;
    }

    // Toggle password visibility for both password fields
    [togglePassword1, togglePassword2].forEach((toggle, idx) => {
        if (toggle && passwordInput && confirmPasswordInput) {
            toggle.addEventListener('click', function () {
                const targetInput = idx === 0 ? passwordInput : confirmPasswordInput;
                const type = targetInput.getAttribute('type') === 'password' ? 'text' : 'password';
                targetInput.setAttribute('type', type);

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
    });

    // Input focus and focusout events for span styling
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('focus', handleFocus);
            input.addEventListener('focusout', handleFocusOut);
            input.addEventListener('input', handleChange);
        }
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
        const password = passwordInput.value;
        const passwordErrors = validatePassword(password);
        
        if (
            emailInput.value &&
            passwordErrors.length === 0 &&
            passwordInput.value === confirmPasswordInput.value
        ) {
            button.removeAttribute('enabled');
        } else {
            button.setAttribute('enabled', '');
        }
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            // Password validation
            const passwordErrors = validatePassword(password);
            
            if (passwordErrors.length > 0) {
                alert(passwordErrors.join('\n'));
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
                    // Check if the account does not exist
                    if (data.message === 'Account does not exist') {
                        alert('Account does not exist. Please check your credentials.');
                    } else {
                        alert(data.message || 'Signup failed. Please try again.');
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again later.');
            }
        });
    }
});
