// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
    const userEmailElement = document.getElementById('userEmail');
    const logoutLink = document.getElementById('logoutLink');
    
    // Ensure elements exist before adding listeners
    if (!userEmailElement || !logoutLink) {
        console.error('Required DOM elements not found');
        return;
    }

    fetchUserDetails();
    setupLogoutHandler();
});

async function fetchUserDetails() {
    const userEmailElement = document.getElementById('userEmail');
    
    try {
        const response = await fetch('/user-details', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            // Handle specific HTTP errors
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.user?.email) {
            userEmailElement.textContent = data.user.email;
        } else {
            throw new Error(data.message || 'Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        userEmailElement.textContent = 'Error loading user details';
        
        // Optionally show error to user
        showError('Failed to load user details. Please refresh the page.');
    }
}

function setupLogoutHandler() {
    const logoutLink = document.getElementById('logoutLink');
    
    logoutLink.addEventListener('click', async function (event) {
        event.preventDefault();
        await performLogout();
    });
}

async function performLogout() {
    const logoutLink = document.getElementById('logoutLink');
    
    try {
        // Disable logout button to prevent double-clicks
        logoutLink.disabled = true;
        
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Logout failed with status: ${response.status}`);
        }

        // Successful logout
        window.location.href = '/';
        
    } catch (error) {
        console.error('Error during logout:', error);
        
        // Re-enable logout button
        logoutLink.disabled = false;
        
        // Show error to user
        showError('Logout failed. Please try again.');
    }
}

// Utility function to show errors to the user
function showError(message) {
    showError('Error Pre');
    alert(message);
}
