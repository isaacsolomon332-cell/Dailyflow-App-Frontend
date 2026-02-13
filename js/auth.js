// Configuration
const API_BASE_URL = "https://dailyflow-backend-kwuc.onrender.com";
const TOKEN_KEY = "dailyflow_token";
const USER_KEY = "dailyflow_user";

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

// ==================== AUTH FUNCTIONS ====================

async function login() {
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Clear previous errors
    clearFieldErrors();

    // Frontend validation
    const validationErrors = [];
    if (!usernameOrEmail) validationErrors.push({ field: 'loginUsername', message: 'Username or email is required' });
    if (!password) validationErrors.push({ field: 'loginPassword', message: 'Password is required' });
    
    if (validationErrors.length > 0) {
        displayFieldErrors(validationErrors);
        showToast('Please fill in all required fields', 'error');
        return;
    }

    showLoader('Signing you in...', 'Authenticating your credentials...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            
            showLoader('Welcome back!', 'Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        hideLoader();
        showToast('Network error. Please check your connection.', 'error');
        console.error('Login error:', error);
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

    // Clear previous errors
    clearFieldErrors();

    // Frontend validation
    const validationErrors = [];

    // Required fields check
    if (!fullName) validationErrors.push({ field: 'fullName', message: 'Full name is required' });
    if (!email) validationErrors.push({ field: 'email', message: 'Email is required' });
    if (!username) validationErrors.push({ field: 'username', message: 'Username is required' });
    if (!password) validationErrors.push({ field: 'password', message: 'Password is required' });
    if (!confirmPassword) validationErrors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
    
    if (!termsAgreement) {
        showToast('You must agree to the Terms of Service', 'warning');
        return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        validationErrors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (username && !usernameRegex.test(username)) {
        validationErrors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Password validation
    if (password) {
        if (password.length < 8) {
            validationErrors.push({ field: 'password', message: 'Password must be at least 8 characters' });
        } else {
            if (!/[A-Z]/.test(password)) {
                validationErrors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
            }
            if (!/[a-z]/.test(password)) {
                validationErrors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
            }
            if (!/\d/.test(password)) {
                validationErrors.push({ field: 'password', message: 'Password must contain at least one number' });
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                validationErrors.push({ field: 'password', message: 'Password must contain at least one special character' });
            }
        }
    }

    // Confirm password match
    if (password && confirmPassword && password !== confirmPassword) {
        validationErrors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    // PHONE NUMBER - NO VALIDATION AT ALL
    // Phone is completely optional - no checks needed

    // If there are validation errors, show them
    if (validationErrors.length > 0) {
        displayFieldErrors(validationErrors);
        
        // Show first error as toast
        showToast(validationErrors[0].message, 'error');
        return;
    }

    showLoader('Creating your account...', 'Setting up your profile...');

    try {
        console.log('Sending signup request...', {
            fullName, email, username, phone: phone || undefined
        });

        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
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
        console.log('Signup response:', data);

        if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            
            showLoader('Welcome to DailyFlow!', 'Setting up your personalized dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            
        } else {
            hideLoader();
            
            // Handle backend validation errors
            if (data.errors && data.errors.length > 0) {
                const backendErrors = data.errors.map(err => ({
                    field: getFieldFromMessage(err.message || err),
                    message: err.message || err
                }));
                displayFieldErrors(backendErrors);
                showToast(backendErrors[0].message, 'error');
            } else {
                showToast(data.message || 'Signup failed. Please try again.', 'error');
            }
        }
    } catch (error) {
        hideLoader();
        console.error('Signup error details:', error);
        showToast('Network error. Please check your connection.', 'error');
    }
}

// Helper function to get field name from error message
function getFieldFromMessage(message) {
    if (!message) return null;
    const msg = message.toLowerCase();
    if (msg.includes('full name')) return 'fullName';
    if (msg.includes('email')) return 'email';
    if (msg.includes('username')) return 'username';
    if (msg.includes('phone')) return 'phone';
    if (msg.includes('password')) return 'password';
    if (msg.includes('confirm')) return 'confirmPassword';
    return null;
}

// Display field errors
function displayFieldErrors(errors) {
    // Clear existing errors first
    clearFieldErrors();
    
    errors.forEach(err => {
        if (!err.field) return;
        
        const field = document.getElementById(err.field);
        if (field) {
            field.classList.add('error');
            
            // Remove existing error message
            const existingMsg = field.parentElement.querySelector('.error-message');
            if (existingMsg) existingMsg.remove();
            
            // Add new error message
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = err.message;
            field.parentElement.appendChild(errorMsg);
        }
    });
}

// Clear all field errors
function clearFieldErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());
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
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    } catch (error) {
        console.error('Token verification error:', error);
    }
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
}

function checkAuthStatus() {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    
    if (token && user) {
        currentUser = JSON.parse(user);
        
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

// ==================== STYLES ====================

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
`;
document.head.appendChild(style);

// Export functions
window.authFunctions = {
    login,
    signup,
    logout,
    showToast,
    showLoader,
    hideLoader
};