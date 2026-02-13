// Configuration
const API_BASE_URL = "https://dailyflow-backend-kwuc.onrender.com";
const TOKEN_KEY = "dailyflow_token";
const USER_KEY = "dailyflow_user";

// Error types for better handling
const ErrorTypes = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    AUTH: 'authentication',
    SERVER: 'server',
    UNKNOWN: 'unknown'
};

// DOM Elements
let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupPasswordToggles();
    setupFormValidation();
    setupInputErrorListeners();
    
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        verifyTokenAndRedirect();
    }
});

// ==================== ADVANCED ERROR HANDLER ====================

class ErrorHandler {
    static handle(error, context = '') {
        console.error(`❌ Error in ${context}:`, error);
        
        let userMessage = 'An unexpected error occurred. Please try again.';
        let errorType = ErrorTypes.UNKNOWN;
        let shouldLogout = false;
        
        // Network errors
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            userMessage = 'Cannot connect to server. Please check your internet connection.';
            errorType = ErrorTypes.NETWORK;
        }
        
        // API response errors
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            switch(status) {
                case 400:
                    userMessage = data.message || 'Invalid request. Please check your input.';
                    errorType = ErrorTypes.VALIDATION;
                    break;
                    
                case 401:
                    userMessage = 'Your session has expired. Please login again.';
                    errorType = ErrorTypes.AUTH;
                    shouldLogout = true;
                    break;
                    
                case 403:
                    userMessage = 'You don\'t have permission to perform this action.';
                    errorType = ErrorTypes.AUTH;
                    break;
                    
                case 404:
                    userMessage = 'The requested resource was not found.';
                    errorType = ErrorTypes.SERVER;
                    break;
                    
                case 409:
                    userMessage = data.message || 'This information already exists.';
                    errorType = ErrorTypes.VALIDATION;
                    break;
                    
                case 422:
                    userMessage = 'Validation failed. Please check your input.';
                    errorType = ErrorTypes.VALIDATION;
                    if (data.errors) {
                        this.displayFieldErrors(data.errors);
                    }
                    break;
                    
                case 423:
                    userMessage = data.message || 'Account is temporarily locked.';
                    errorType = ErrorTypes.AUTH;
                    break;
                    
                case 429:
                    userMessage = 'Too many requests. Please wait a moment.';
                    errorType = ErrorTypes.SERVER;
                    break;
                    
                case 500:
                case 502:
                case 503:
                    userMessage = 'Server is having issues. Please try again later.';
                    errorType = ErrorTypes.SERVER;
                    break;
                    
                default:
                    userMessage = data.message || 'Something went wrong.';
            }
        }
        
        // Handle validation errors from backend
        if (error.validationErrors) {
            this.displayFieldErrors(error.validationErrors);
            userMessage = 'Please fix the errors in the form.';
            errorType = ErrorTypes.VALIDATION;
        }
        
        // Show user-friendly message
        showToast(userMessage, this.getToastType(errorType));
        
        // Logout if needed
        if (shouldLogout) {
            setTimeout(() => logout(), 2000);
        }
        
        // Track error for debugging
        this.logError(error, context, errorType);
        
        return { userMessage, errorType };
    }
    
    static displayFieldErrors(errors) {
        if (Array.isArray(errors)) {
            errors.forEach(err => {
                const field = document.getElementById(err.field);
                if (field) {
                    field.classList.add('error');
                    
                    // Add error message below field
                    let errorMsg = field.parentElement.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        field.parentElement.appendChild(errorMsg);
                    }
                    errorMsg.textContent = err.message;
                    
                    // Remove error on input
                    field.addEventListener('input', function() {
                        this.classList.remove('error');
                        const msg = this.parentElement.querySelector('.error-message');
                        if (msg) msg.remove();
                    }, { once: true });
                }
            });
        }
    }
    
    static getToastType(errorType) {
        switch(errorType) {
            case ErrorTypes.NETWORK:
            case ErrorTypes.SERVER:
                return 'warning';
            case ErrorTypes.AUTH:
                return 'error';
            case ErrorTypes.VALIDATION:
                return 'info';
            default:
                return 'error';
        }
    }
    
    static logError(error, context, type) {
        // In production, you could send this to a logging service
        const errorLog = {
            timestamp: new Date().toISOString(),
            context,
            type,
            message: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('Error Log:', errorLog);
        
        // Store recent errors for debugging
        const errors = JSON.parse(localStorage.getItem('dailyflow_errors') || '[]');
        errors.unshift(errorLog);
        if (errors.length > 10) errors.pop();
        localStorage.setItem('dailyflow_errors', JSON.stringify(errors));
    }
    
    static getRecentErrors() {
        return JSON.parse(localStorage.getItem('dailyflow_errors') || '[]');
    }
    
    static clearErrorLog() {
        localStorage.removeItem('dailyflow_errors');
        showToast('Error log cleared', 'success');
    }
}

// ==================== AUTH FUNCTIONS WITH ERROR HANDLING ====================

async function login() {
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    // Clear previous errors
    clearFieldErrors();

    // Frontend validation
    const validationErrors = [];
    if (!usernameOrEmail) validationErrors.push({ field: 'loginUsername', message: 'Username or email is required' });
    if (!password) validationErrors.push({ field: 'loginPassword', message: 'Password is required' });
    
    if (validationErrors.length > 0) {
        ErrorHandler.displayFieldErrors(validationErrors);
        showToast('Please fill in all required fields', 'error');
        return;
    }

    showLoader('Signing you in...', 'Authenticating your credentials...');

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                usernameOrEmail: usernameOrEmail,
                password: password
            })
        });

        const data = await response.json();

        hideLoader();

        if (data.success) {
            // Store auth data
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            
            if (rememberMe) {
                // Token already has 7 day expiry, but we can store preference
                localStorage.setItem('remember_me', 'true');
            }
            
            showLoader('Welcome back!', 'Redirecting to dashboard...');
            
            // Track successful login
            trackUserAction('login_success', data.data.user.username);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } else {
            ErrorHandler.handle({ response: { status: 400, data } }, 'login');
        }
    } catch (error) {
        hideLoader();
        ErrorHandler.handle(error, 'login');
    }
}

async function signup() {
    // Get form values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAgreement = document.getElementById('termsAgreement')?.checked || false;
    const newsletter = document.getElementById('newsletter')?.checked || false;

    // Clear previous errors
    clearFieldErrors();

    // Frontend validation
    const validationErrors = [];

    if (!fullName) validationErrors.push({ field: 'fullName', message: 'Full name is required' });
    if (!email) validationErrors.push({ field: 'email', message: 'Email is required' });
    if (!username) validationErrors.push({ field: 'username', message: 'Username is required' });
    if (!password) validationErrors.push({ field: 'password', message: 'Password is required' });
    if (!confirmPassword) validationErrors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
    
    if (!termsAgreement) {
        showToast('You must agree to the Terms of Service', 'warning');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        validationErrors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (username && !usernameRegex.test(username)) {
        validationErrors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Password validation
    const passwordError = validatePassword(password);
    if (passwordError) {
        validationErrors.push({ field: 'password', message: passwordError });
    }

    if (password && confirmPassword && password !== confirmPassword) {
        validationErrors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    // Phone validation (optional)
    if (phone) {
        const phoneRegex = /^[\+]?[1-9][0-9\-\(\)\.]{9,}$/;
        if (!phoneRegex.test(phone)) {
            validationErrors.push({ field: 'phone', message: 'Please enter a valid phone number' });
        }
    }

    if (validationErrors.length > 0) {
        ErrorHandler.displayFieldErrors(validationErrors);
        showToast('Please fix the errors in the form', 'error');
        return;
    }

    showLoader('Creating your account...', 'Setting up your profile...');

    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                username: username,
                phoneNumber: phone || undefined,
                password: password,
                confirmPassword: confirmPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store auth data
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            
            // Track successful signup
            trackUserAction('signup_success', username);
            
            showLoader('Welcome to DailyFlow!', 'Setting up your personalized dashboard...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            
        } else {
            ErrorHandler.handle({ response: { status: 400, data } }, 'signup');
        }
    } catch (error) {
        hideLoader();
        ErrorHandler.handle(error, 'signup');
    }
}

// ==================== UTILITY FUNCTIONS ====================

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout. Please check your connection.');
        }
        throw error;
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

function trackUserAction(action, username) {
    // Track for analytics (optional)
    const actions = JSON.parse(localStorage.getItem('dailyflow_actions') || '[]');
    actions.unshift({
        action,
        username,
        timestamp: new Date().toISOString(),
        url: window.location.href
    });
    if (actions.length > 20) actions.pop();
    localStorage.setItem('dailyflow_actions', JSON.stringify(actions));
}

async function verifyTokenAndRedirect() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                window.location.href = 'dashboard.html';
            }
        } else {
            // Token invalid, clear storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    } catch (error) {
        console.error('Token verification error:', error);
    }
}

function logout() {
    // Clear all auth data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('remember_me');
    
    // Track logout
    trackUserAction('logout', 'user');
    
    // Redirect to login
    window.location.href = 'index.html';
}

function checkAuthStatus() {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    
    if (token && user) {
        currentUser = JSON.parse(user);
        
        // If on auth page, redirect to dashboard
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.includes('login.html') ||
            window.location.pathname.includes('signup.html')) {
            window.location.href = 'dashboard.html';
        }
        
        updateUIForLoggedInUser();
    }
}

function updateUIForLoggedInUser() {
    if (currentUser && document.getElementById('userGreeting')) {
        document.getElementById('userGreeting').textContent = `Welcome, ${currentUser.fullName || currentUser.username}!`;
    }
}

// ==================== PASSWORD VALIDATION ====================

function validatePassword(password) {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
    return null;
}

function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthBars = document.querySelectorAll('.strength-bar');
    const checks = document.querySelectorAll('.password-hints li');
    
    strengthBars.forEach(bar => bar.classList.remove('weak', 'medium', 'strong'));
    checks.forEach(check => check.classList.remove('valid'));
    
    if (!password) return;
    
    let strength = 0;
    
    if (password.length >= 8) {
        checks[0]?.classList.add('valid');
        strength++;
    }
    
    if (/[A-Z]/.test(password)) {
        checks[1]?.classList.add('valid');
        strength++;
    }
    
    if (/[a-z]/.test(password)) {
        checks[2]?.classList.add('valid');
        strength++;
    }
    
    if (/\d/.test(password)) {
        checks[3]?.classList.add('valid');
        strength++;
    }
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        checks[4]?.classList.add('valid');
        strength++;
    }
    
    for (let i = 0; i < strengthBars.length; i++) {
        if (i < strength) {
            if (strength <= 2) {
                strengthBars[i].classList.add('weak');
            } else if (strength <= 4) {
                strengthBars[i].classList.add('medium');
            } else {
                strengthBars[i].classList.add('strong');
            }
        }
    }
}

// ==================== UI FUNCTIONS ====================

function showLogin() {
    document.getElementById('loginForm')?.classList.add('active');
    document.getElementById('signupForm')?.classList.remove('active');
    clearFieldErrors();
}

function showSignup() {
    document.getElementById('signupForm')?.classList.add('active');
    document.getElementById('loginForm')?.classList.remove('active');
    clearFieldErrors();
}

function useDemoAccount() {
    document.getElementById('loginUsername').value = 'demo';
    document.getElementById('loginPassword').value = 'DemoPass123!';
    showToast('Demo credentials filled. Click Sign In to continue.', 'info');
}

function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon?.classList.remove('fa-eye');
                icon?.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon?.classList.remove('fa-eye-slash');
                icon?.classList.add('fa-eye');
            }
        });
    });
}

function setupFormValidation() {
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredInputs = this.querySelectorAll('input[required]');
            let isValid = true;
            
            requiredInputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showToast('Please fill in all required fields', 'error');
            }
        });
        
        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
                const msg = this.parentElement.querySelector('.error-message');
                if (msg) msg.remove();
            });
        });
    });
}

function setupInputErrorListeners() {
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('invalid', function(e) {
            e.preventDefault();
            this.classList.add('error');
        });
    });
}

// ==================== LOADER FUNCTIONS ====================

function showLoader(title = 'Loading...', subtitle = 'Please wait...') {
    const loader = document.getElementById('globalLoader');
    const loaderTitle = document.getElementById('loaderTitle');
    const loaderSubtitle = document.getElementById('loaderSubtitle');
    
    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderSubtitle) loaderSubtitle.textContent = subtitle;
    
    if (loader) {
        loader.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        startLoaderAnimation();
    }
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetLoaderSteps();
    }
}

function startLoaderAnimation() {
    const steps = document.querySelectorAll('.loader-steps .step');
    let currentStep = 0;
    
    const animateSteps = () => {
        if (currentStep < steps.length) {
            steps[currentStep]?.classList.add('active');
            currentStep++;
            setTimeout(animateSteps, 500);
        }
    };
    
    animateSteps();
}

function resetLoaderSteps() {
    document.querySelectorAll('.loader-steps .step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
}

// ==================== TOAST NOTIFICATION ====================

function showToast(message, type = 'info', duration = 5000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    const typeClasses = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    
    toast.classList.add(typeClasses[type] || 'info');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ==================== API HELPER FUNCTIONS ====================

async function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!token) {
        showToast('Please login first', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return null;
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
    };
    
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}${url}`, {
            ...defaultOptions,
            ...options
        });
        
        if (response.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        ErrorHandler.handle(error, 'authenticated_request');
        return null;
    }
}

async function getUserProfile() {
    const data = await makeAuthenticatedRequest('/api/auth/profile');
    return data?.success ? data.data.user : null;
}

// Debug function to show recent errors (press F12, type showErrors())
window.showErrors = function() {
    console.table(ErrorHandler.getRecentErrors());
};

window.clearErrors = function() {
    ErrorHandler.clearErrorLog();
};

// Export functions
window.authFunctions = {
    login,
    signup,
    logout,
    getUserProfile,
    makeAuthenticatedRequest,
    showToast,
    showLoader,
    hideLoader,
    showErrors,
    clearErrors
};

// Add enhanced CSS for error states
const style = document.createElement('style');
style.textContent = `
.loader-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: 'Inter', sans-serif;
}

.toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 10000;
    max-width: 400px;
    word-wrap: break-word;
}

.toast.show {
    transform: translateY(0);
    opacity: 1;
}

.toast.success { background: #10b981; }
.toast.error { background: #ef4444; }
.toast.warning { background: #f59e0b; }
.toast.info { background: #3b82f6; }

/* Error States */
input.error {
    border-color: #ef4444 !important;
    animation: shake 0.3s ease-in-out;
}

.error-message {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 4px;
    margin-left: 35px;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

/* Password strength */
.strength-bar.weak { background: #ef4444; }
.strength-bar.medium { background: #f59e0b; }
.strength-bar.strong { background: #10b981; }

.password-hints li.valid {
    color: #10b981;
    text-decoration: line-through;
}

/* Debug panel (hidden by default) */
.debug-panel {
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: rgba(0,0,0,0.8);
    color: #0f0;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    max-width: 300px;
    max-height: 200px;
    overflow: auto;
    display: none;
    z-index: 10001;
}

.show-debug .debug-panel {
    display: block;
}
`;
document.head.appendChild(style);