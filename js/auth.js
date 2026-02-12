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
    
    // Check if user is already logged in
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        verifyTokenAndRedirect();
    }
});

// ==================== AUTH FUNCTIONS ====================

async function login() {
    const usernameOrEmail = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Validation
    if (!usernameOrEmail || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    showLoader('Signing you in...', 'Authenticating your credentials...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernameOrEmail: usernameOrEmail,
                password: password
            })
        });

        const data = await response.json();

        hideLoader();

        if (data.success) {
            // Store token and user data
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            
            showLoader('Welcome back!', 'Redirecting to dashboard...');
            
            // Update step animations
            updateLoaderStep(1, 'Verifying credentials...');
            updateLoaderStep(2, 'Loading your data...');
            updateLoaderStep(3, 'Preparing dashboard...');
            updateLoaderStep(4, 'Redirecting...');
            
            // Redirect to dashboard after 2 seconds
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
    const termsAgreement = document.getElementById('termsAgreement').checked;
    const newsletter = document.getElementById('newsletter').checked;

    // Validation
    if (!fullName || !email || !username || !password || !confirmPassword) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (!termsAgreement) {
        showToast('You must agree to the Terms of Service', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showToast('Username can only contain letters, numbers, and underscores', 'error');
        return;
    }

    // Password validation
    const passwordError = validatePassword(password);
    if (passwordError) {
        showToast(passwordError, 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    showLoader('Creating your account...', 'Setting up your profile...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
            // Store token and user data
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            
            // Update loader steps for signup
            updateLoaderStep(1, 'Account created successfully!');
            updateLoaderStep(2, 'Setting up your dashboard...');
            updateLoaderStep(3, 'Personalizing your experience...');
            updateLoaderStep(4, 'Almost ready...');
            
            showLoader('Welcome to DailyFlow!', 'Setting up your personalized dashboard...');
            
            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            
        } else {
            hideLoader();
            if (data.errors && data.errors.length > 0) {
                showToast(data.errors[0].message || 'Signup failed', 'error');
            } else {
                showToast(data.message || 'Signup failed. Please try again.', 'error');
            }
        }
    } catch (error) {
        hideLoader();
        showToast('Network error. Please check your connection.', 'error');
        console.error('Signup error:', error);
    }
}

async function verifyTokenAndRedirect() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // User is already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Token is invalid, clear it
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    } catch (error) {
        console.error('Token verification error:', error);
    }
}

function logout() {
    // Clear local storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Redirect to login page
    window.location.href = 'index.html';
}

function checkAuthStatus() {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    
    if (token && user) {
        currentUser = JSON.parse(user);
        
        // If we're on login/signup page but user is logged in, redirect to dashboard
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.includes('login.html') ||
            window.location.pathname.includes('signup.html')) {
            window.location.href = 'dashboard.html';
        }
        
        // Update UI to show user is logged in
        updateUIForLoggedInUser();
    }
}

function updateUIForLoggedInUser() {
    // If we have user info, update UI elements
    if (currentUser && document.getElementById('userGreeting')) {
        document.getElementById('userGreeting').textContent = `Welcome, ${currentUser.fullName || currentUser.username}!`;
    }
}

// ==================== PASSWORD VALIDATION ====================

function validatePassword(password) {
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
    
    // Reset all
    strengthBars.forEach(bar => bar.classList.remove('weak', 'medium', 'strong'));
    checks.forEach(check => check.classList.remove('valid'));
    
    if (!password) return;
    
    let strength = 0;
    
    // Check criteria
    if (password.length >= 8) {
        checks[0].classList.add('valid');
        strength++;
    }
    
    if (/[A-Z]/.test(password)) {
        checks[1].classList.add('valid');
        strength++;
    }
    
    if (/[a-z]/.test(password)) {
        checks[2].classList.add('valid');
        strength++;
    }
    
    if (/\d/.test(password)) {
        checks[3].classList.add('valid');
        strength++;
    }
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        checks[4].classList.add('valid');
        strength++;
    }
    
    // Update strength bars
    for (let i = 0; i < strength; i++) {
        if (i < strengthBars.length) {
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
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
}

function showSignup() {
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
}

function useDemoAccount() {
    document.getElementById('loginUsername').value = 'demo';
    document.getElementById('loginPassword').value = 'DemoPass123!';
    showToast('Demo credentials filled. Click Sign In to continue.', 'info');
}

function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredInputs = this.querySelectorAll('input[required]');
            let isValid = true;
            
            requiredInputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showToast('Please fill in all required fields', 'error');
            }
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
            });
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
    
    loader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Start step animations
    startLoaderAnimation();
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    loader.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset steps
    resetLoaderSteps();
}

function updateLoaderStep(stepNumber, text) {
    const step = document.getElementById(`step${stepNumber}`);
    const subtitle = document.getElementById('loaderSubtitle');
    
    if (step) {
        // Activate current step
        step.classList.add('active');
        
        // Deactivate previous steps
        for (let i = 1; i < stepNumber; i++) {
            const prevStep = document.getElementById(`step${i}`);
            if (prevStep) {
                prevStep.classList.add('completed');
                prevStep.classList.remove('active');
            }
        }
    }
    
    if (subtitle && text) {
        subtitle.textContent = text;
    }
}

function startLoaderAnimation() {
    const steps = document.querySelectorAll('.loader-steps .step');
    let currentStep = 0;
    
    const animateSteps = () => {
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
            setTimeout(animateSteps, 500);
        }
    };
    
    animateSteps();
}

function resetLoaderSteps() {
    const steps = document.querySelectorAll('.loader-steps .step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
}

// ==================== TOAST NOTIFICATION ====================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    // Add type class
    if (type === 'success') {
        toast.classList.add('success');
    } else if (type === 'error') {
        toast.classList.add('error');
    } else if (type === 'warning') {
        toast.classList.add('warning');
    } else {
        toast.classList.add('info');
    }
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// ==================== SETUP ANIMATIONS ====================

function setupAnimations() {
    // Background animation
    const circles = document.querySelectorAll('.circle');
    circles.forEach((circle, index) => {
        circle.style.animationDelay = `${index * 2}s`;
    });
    
    // Form transition animation
    const formContainers = document.querySelectorAll('.form-container');
    formContainers.forEach(container => {
        container.style.transition = 'all 0.5s ease';
    });
}

// ==================== API HELPER FUNCTIONS ====================

async function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!token) {
        showToast('Please login first', 'error');
        window.location.href = 'index.html';
        return null;
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);
        
        if (response.status === 401) {
            // Token expired, logout user
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            showToast('Session expired. Please login again.', 'error');
            window.location.href = 'index.html';
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        showToast('Network error. Please try again.', 'error');
        return null;
    }
}

// For dashboard page - get user profile
async function getUserProfile() {
    const data = await makeAuthenticatedRequest('/api/auth/profile');
    
    if (data && data.success) {
        return data.data.user;
    }
    
    return null;
}

// Export functions for use in other files
window.authFunctions = {
    login,
    signup,
    logout,
    getUserProfile,
    makeAuthenticatedRequest,
    showToast,
    showLoader,
    hideLoader
};

// Also add this CSS for the loader and toast
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

.toast.success {
    background: #10b981;
}

.toast.error {
    background: #ef4444;
}

.toast.warning {
    background: #f59e0b;
}

.toast.info {
    background: #3b82f6;
}

.strength-bar.weak { background: #ef4444; }
.strength-bar.medium { background: #f59e0b; }
.strength-bar.strong { background: #10b981; }

.password-hints li.valid {
    color: #10b981;
    text-decoration: line-through;
}
`;
document.head.appendChild(style);