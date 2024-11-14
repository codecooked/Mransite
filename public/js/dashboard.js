// Constants
const API_ENDPOINTS = {
    USER_DETAILS: '/user-details',
    LOGOUT: '/logout',
    LOGIN: '/login'
};

// Security utility functions
const security = {
    getAuthToken() {
        return localStorage.getItem('authToken');
    },

    isAuthenticated() {
        const token = this.getAuthToken();
        return !!token;
    },

    getRequestHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }
};

// Enhanced API client
const api = {
    async request(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: security.getRequestHeaders(),
        };

        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(endpoint, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.handleAuthError();
                return null;
            }

            // Handle other error status codes
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    },

    handleAuthError() {
        localStorage.removeItem('authToken');
        window.location.href = API_ENDPOINTS.LOGIN;
    }
};

// Enhanced dashboard functionality
class Dashboard {
    constructor() {
        this.userEmailElement = document.getElementById('userEmail');
        this.logoutLink = document.getElementById('logoutLink');
        
        // Check if required elements exist
        if (!this.userEmailElement || !this.logoutLink) {
            throw new Error('Required DOM elements not found');
        }

        // Initialize security check
        this.initSecurityCheck();
    }

    async initSecurityCheck() {
        if (!security.isAuthenticated()) {
            window.location.href = API_ENDPOINTS.LOGIN;
            return;
        }

        this.initialize();
    }

    initialize() {
        this.fetchUserDetails();
        this.setupLogoutHandler();
        this.setupInactivityMonitor();
    }

    async fetchUserDetails() {
        try {
            const data = await api.request(API_ENDPOINTS.USER_DETAILS);
            
            if (data?.success && data.user?.email) {
                this.userEmailElement.textContent = data.user.email;
            } else {
                throw new Error(data?.message || 'Invalid response format');
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            this.userEmailElement.textContent = 'Error loading user details';
            this.showError('Failed to load user details. Please refresh the page.');
        }
    }

    setupLogoutHandler() {
        this.logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            await this.performLogout();
        });
    }

    async performLogout() {
        try {
            this.logoutLink.disabled = true;
            
            await api.request(API_ENDPOINTS.LOGOUT, {
                method: 'POST'
            });

            // Clear authentication data
            localStorage.removeItem('authToken');
            window.location.href = '/';
            
        } catch (error) {
            console.error('Error during logout:', error);
            this.logoutLink.disabled = false;
            this.showError('Logout failed. Please try again.');
        }
    }

    setupInactivityMonitor() {
        let inactivityTimeout;
        const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

        const resetTimer = () => {
            clearTimeout(inactivityTimeout);
            inactivityTimeout = setTimeout(() => {
                this.performLogout();
            }, TIMEOUT_DURATION);
        };

        // Reset timer on user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });

        resetTimer();
    }

    showError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = message;
        
        document.body.appendChild(errorContainer);
        
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        new Dashboard();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        alert('Failed to initialize dashboard. Please refresh the page.');
    }
});
