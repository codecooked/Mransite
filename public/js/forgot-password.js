document.querySelector('.form-container').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the default form submission

    const email = document.getElementById('email').value;
    const messageElement = document.getElementById('message');

    try {
        // Sending the POST request using Fetch API
        const response = await fetch('/send-password-reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (response.ok) {
            // Redirect to reset password page
            window.location.href = '/reset-password';
        } else {
            // Display error message if something went wrong
            messageElement.textContent = data.message || 'An error occurred. Please try again.';
        }
    } catch (error) {
        console.error('Error:', error);
        messageElement.textContent = 'An error occurred. Please try again.';
    }
});