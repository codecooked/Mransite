
document.querySelector('.form-container').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const resetKey = document.getElementById('resetKey').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ resetKey, newPassword })
        });

        const data = await response.json();
        if (data.success) {
            alert('Password has been reset successfully.');
            window.location.href = '/'; // Redirect to login
        } else {
            alert('Failed to reset password: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while resetting the password.');
    }
    const messageElement = document.getElementById('message');
    if (data.success) {
        messageElement.textContent = 'Password has been reset successfully.';
        messageElement.style.color = 'green';
        setTimeout(() => window.location.href = '/', 2000); // Redirect to login
    } else {
        messageElement.textContent = 'Failed to reset password: ' + data.message;
    }
});
