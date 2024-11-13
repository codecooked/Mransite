document.querySelector('.form-container').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const resetKey = document.getElementById('resetKey').value;
    const newPassword = document.getElementById('newPassword').value;
    const messageElement = document.getElementById('message');

    try {
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetKey, newPassword })
        });

        const data = await response.json();
        if (data.success) {
            messageElement.textContent = 'Password has been reset successfully.';
            messageElement.style.color = 'green';
            setTimeout(() => window.location.href = '/', 2000); // Redirect to login
        } else {
            messageElement.textContent = 'Failed to reset password: ' + data.message;
            messageElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred while resetting the password.';
        messageElement.style.color = 'red';
    }
});

// Toggle password visibility
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('newPassword');
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Toggle icon classes based on the visibility state
        this.classList.toggle('fa-eye-slash', type === 'text');
        this.classList.toggle('fa-eye', type === 'password');
    });
}
