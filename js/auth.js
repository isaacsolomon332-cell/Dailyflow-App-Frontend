// ============================================
// DAILYFLOW AUTHENTICATION SYSTEM
// Version: 6.0.0
// Clear error handling & CORS-friendly
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const API_BASE_URL = "https://dailyflow-backend-kwuc.onrender.com";
const TOKEN_KEY = "dailyflow_token";
const USER_KEY = "dailyflow_user";

// State management
let isLoggingIn = false;
let isSigningUp = false;

// ============================================
// HELPER FUNCTION: Fetch with timeout
// ============================================
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
        throw error;
    }
}

// ============================================
// BACKEND CONNECTION CHECK
// ============================================
async function checkBackendConnection() {
    console.log('🔍 Checking backend connection...');
    
    const maxAttempts = 3;
    const attemptDelay = 3000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`🔄 Connection attempt ${attempt}/${maxAttempts}`);
            
            // First attempt: no-cors mode to wake up server
            await fetch(`${API_BASE_URL}/api/auth/health`, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache'
            });
            
            // Wait a bit for server to wake up
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, attemptDelay));
            }
            
        } catch (error) {
            console.log(`⚠️ Attempt ${attempt} note:`, error.message);
            // In no-cors mode, errors are expected - we ignore them
        }
    }
    
    // Now try a real request to verify connection
    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/auth/health`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            },
            5000
        );
        
        if (response.ok) {
            console.log('✅ Backend is connected!');
            return { success: true, message: 'Connected to server' };
        } else {
            return { 
                success: false, 
                message: `Server responded with status: ${response.status}` 
            };
        }
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return { 
                success: false, 
                message: 'Connection timeout - server is taking too long to respond' 
            };
        } else if (error.message.includes('Failed to fetch')) {
            return { 
                success: false, 
                message: 'Cannot reach server - it might be starting up or offline' 
            };
        } else {
            return { 
                success: false, 
                message: `Connection error: ${error.message}` 
            };
        }
    }
}

// ============================================
// LOADER FUNCTIONS
// ============================================
function showLoader(title, subtitle, type = 'default') {
    console.log('🔄 Show loader:', title);
    
    const loader = document.getElementById('globalLoader');
    const loaderTitle = document.getElementById('loaderTitle');
    const loaderSubtitle = document.getElementById('loaderSubtitle');
    
    if (!loader) {
        console.warn('Loader element not found');
        return;
    }
    
    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderSubtitle) loaderSubtitle.textContent = subtitle;
    
    resetLoaderSteps();
    
    loader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    startLoaderSteps(type);
}

function startLoaderSteps(type) {
    const steps = document.querySelectorAll('.loader-steps .step');
    if (!steps.length) return;
    
    let currentStep = 0;
    
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    const messages = {
        login: [
            'Verifying credentials...',
            'Checking security...',
            'Loading dashboard...',
            'Welcome back!'
        ],
        signup: [
            'Creating account...',
            'Setting up profile...',
            'Personalizing...',
            'Welcome to DailyFlow!'
        ],
        default: [
            'Processing...',
            'Almost there...',
            'Just a moment...',
            'Ready!'
        ]
    };
    
    const stepMessages = messages[type] || messages.default;
    
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            if (currentStep > 0) {
                steps[currentStep - 1].classList.add('completed');
                steps[currentStep - 1].classList.remove('active');
            }
            
            steps[currentStep].classList.add('active');
            
            const messageEl = document.querySelector('.loader-message');
            if (messageEl && stepMessages[currentStep]) {
                messageEl.innerHTML = `<i class="fas fa-${getStepIcon(currentStep, type)}"></i> <span>${stepMessages[currentStep]}</span>`;
            }
            
            currentStep++;
        } else {
            clearInterval(interval);
        }
    }, 800);
    
    window.loaderInterval = interval;
}

function getStepIcon(step, type) {
    if (type === 'login') {
        const icons = ['user-check', 'shield-alt', 'tachometer-alt', 'smile'];
        return icons[step] || 'circle-notch';
    } else if (type === 'signup') {
        const icons = ['user-plus', 'cog', 'palette', 'rocket'];
        return icons[step] || 'circle-notch';
    }
    const icons = ['circle-notch', 'spinner', 'sync', 'check'];
    return icons[step] || 'circle-notch';
}

function resetLoaderSteps() {
    const steps = document.querySelectorAll('.loader-steps .step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    if (steps.length > 0) {
        steps[0].classList.add('active');
    }
    
    const messageEl = document.querySelector('.loader-message');
    if (messageEl) {
        messageEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Processing...</span>';
    }
}

function updateLoaderMessage(title, subtitle) {
    const loaderTitle = document.getElementById('loaderTitle');
    const loaderSubtitle = document.getElementById('loaderSubtitle');
    
    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderSubtitle) loaderSubtitle.textContent = subtitle;
}

function hideLoader() {
    console.log('✅ Hide loader');
    
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        if (window.loaderInterval) {
            clearInterval(window.loaderInterval);
            window.loaderInterval = null;
        }
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info', duration = 5000) {
    console.log(`📢 Toast (${type}):`, message);
    
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(message);
        return;
    }
    
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type === 'success') toast.classList.add('success');
    else if (type === 'error') toast.classList.add('error');
    else if (type === 'warning') toast.classList.add('warning');
    else if (type === 'info') toast.classList.add('info');
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ============================================
// LOGIN FUNCTION
// ============================================
async function login() {
    console.log('🔐 Login function called');
    
    if (isLoggingIn) {
        showToast('Login already in progress...', 'info');
        return;
    }
    
    const usernameOrEmail = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    if (!usernameOrEmail || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }
    
    isLoggingIn = true;
    
    showLoader(
        '🔐 Signing In',
        'Please wait...',
        'login'
    );
    
    try {
        // Step 1: Check connection
        updateLoaderMessage('🌐 Connecting', 'Checking server connection...');
        const connection = await checkBackendConnection();
        
        if (!connection.success) {
            hideLoader();
            
            let userMessage = '⚠️ Cannot connect to server.\n\n';
            
            if (connection.message.includes('timeout')) {
                userMessage += 'The server is taking too long to respond. This can happen if it\'s starting up.\n\nPlease try again in 1-2 minutes.';
            } else if (connection.message.includes('Cannot reach')) {
                userMessage += 'The server might be offline or starting up.\n\nPlease wait a moment and try again.';
            } else {
                userMessage += connection.message;
            }
            
            showToast(userMessage, 'error', 8000);
            isLoggingIn = false;
            return;
        }
        
        // Step 2: Make login request
        updateLoaderMessage('🔐 Verifying', 'Checking your credentials...');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                usernameOrEmail: usernameOrEmail,
                password: password,
                rememberMe: rememberMe
            })
        });
        
        const data = await response.json();
        
        // Step 3: Handle response
        if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            localStorage.setItem('dailyflow_currentUser', data.data.user.username || data.data.user.email);
            
            updateLoaderMessage('✅ Success!', 'Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            hideLoader();
            
            let errorMsg = 'Login failed. ';
            
            if (data.message) {
                if (data.message.includes('Invalid') || data.message.includes('credentials')) {
                    errorMsg = '❌ Invalid username or password. Please try again.';
                } else if (data.message.includes('not found')) {
                    errorMsg = '❌ Account not found. Please check your username or sign up.';
                } else {
                    errorMsg = `❌ ${data.message}`;
                }
            } else {
                errorMsg = '❌ Login failed. Please try again.';
            }
            
            showToast(errorMsg, 'error');
            isLoggingIn = false;
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        hideLoader();
        
        let errorMessage = '❌ Login failed.\n\n';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Cannot connect to server. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
            errorMessage += 'Request timed out. The server is taking too long to respond.';
        } else if (error.message.includes('401')) {
            errorMessage += 'Invalid username or password.';
        } else {
            errorMessage += `Error: ${error.message}`;
        }
        
        showToast(errorMessage, 'error', 7000);
        isLoggingIn = false;
    }
}

// ============================================
// SIGNUP FUNCTION
// ============================================
async function signup() {
    console.log('📝 Signup function called');
    
    if (isSigningUp) {
        showToast('Account creation already in progress...', 'info');
        return;
    }
    
    const fullName = document.getElementById('fullName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const username = document.getElementById('username')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const termsAgreement = document.getElementById('termsAgreement')?.checked || false;
    
    // Validation with clear messages
    if (!fullName || !email || !username || !phone || !password || !confirmPassword) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!termsAgreement) {
        showToast('You must agree to the Terms of Service', 'warning');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 11) {
        showToast('Phone number must be exactly 11 digits', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
    }
    
    if (!/[A-Z]/.test(password)) {
        showToast('Password must contain at least one uppercase letter', 'error');
        return;
    }
    
    if (!/[0-9]/.test(password)) {
        showToast('Password must contain at least one number', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    isSigningUp = true;
    
    showLoader(
        '📝 Creating Account',
        'Please wait...',
        'signup'
    );
    
    try {
        // Step 1: Check connection
        updateLoaderMessage('🌐 Connecting', 'Checking server connection...');
        const connection = await checkBackendConnection();
        
        if (!connection.success) {
            hideLoader();
            
            let userMessage = '⚠️ Cannot connect to server.\n\n';
            
            if (connection.message.includes('timeout')) {
                userMessage += 'The server is taking too long to respond. Please try again in 1-2 minutes.';
            } else {
                userMessage += connection.message;
            }
            
            showToast(userMessage, 'error', 8000);
            isSigningUp = false;
            return;
        }
        
        // Step 2: Make signup request
        updateLoaderMessage('📝 Creating', 'Setting up your account...');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                fullName: fullName,
                email: email,
                username: username,
                phoneNumber: digitsOnly,
                password: password,
                confirmPassword: confirmPassword
            })
        });
        
        const data = await response.json();
        
        // Step 3: Handle response
        if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            localStorage.setItem('dailyflow_currentUser', data.data.user.username || data.data.user.email);
            
            await handleProfilePicture();
            
            updateLoaderMessage('✅ Account Created!', 'Welcome to DailyFlow! Redirecting...');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            hideLoader();
            
            let errorMsg = '❌ Signup failed.\n\n';
            
            if (data.message) {
                if (data.message.includes('already exists') || data.message.includes('already taken')) {
                    errorMsg = '❌ An account with this email or username already exists.\n\nPlease try logging in instead.';
                } else {
                    errorMsg = `❌ ${data.message}`;
                }
            } else {
                errorMsg += 'Please try again later.';
            }
            
            if (data.errors && data.errors.length > 0) {
                errorMsg = `❌ ${data.errors[0].message}`;
            }
            
            showToast(errorMsg, 'error', 7000);
            isSigningUp = false;
        }
    } catch (error) {
        console.error('❌ Signup error:', error);
        hideLoader();
        
        let errorMessage = '❌ Signup failed.\n\n';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Cannot connect to server. Please check your internet connection.';
        } else if (error.message.includes('timeout')) {
            errorMessage += 'Request timed out. Please try again.';
        } else {
            errorMessage += `Error: ${error.message}`;
        }
        
        showToast(errorMessage, 'error', 6000);
        isSigningUp = false;
    }
}

// ============================================
// PROFILE PICTURE HANDLING
// ============================================
async function handleProfilePicture() {
    const avatarInput = document.getElementById('avatarInput');
    if (!avatarInput || !avatarInput.files || avatarInput.files.length === 0) {
        return;
    }
    
    const file = avatarInput.files[0];
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'warning');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'warning');
        return;
    }
    
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            localStorage.setItem('dailyflow_profile_picture', e.target.result);
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// ============================================
// UI NAVIGATION FUNCTIONS
// ============================================
function showLogin() {
    console.log('Showing login form');
    document.getElementById('loginForm')?.classList.add('active');
    document.getElementById('signupForm')?.classList.remove('active');
    clearErrors();
}

function showSignup() {
    console.log('Showing signup form');
    document.getElementById('signupForm')?.classList.add('active');
    document.getElementById('loginForm')?.classList.remove('active');
    clearErrors();
}

function useDemoAccount() {
    console.log('Loading demo account');
    document.getElementById('loginUsername').value = 'demo@dailyflow.app';
    document.getElementById('loginPassword').value = 'DemoPass123!';
    showToast('✨ Demo credentials loaded! Click Sign In to continue.', 'info');
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

// ============================================
// PASSWORD STRENGTH CHECKER
// ============================================
function checkPasswordStrength() {
    const password = document.getElementById('password')?.value || '';
    const strengthBars = document.querySelectorAll('.strength-bar');
    const checks = {
        length: document.getElementById('lengthCheck'),
        uppercase: document.getElementById('uppercaseCheck'),
        lowercase: document.getElementById('lowercaseCheck'),
        number: document.getElementById('numberCheck'),
        special: document.getElementById('specialCheck')
    };
    
    strengthBars.forEach(bar => {
        bar.classList.remove('weak', 'medium', 'strong');
    });
    
    Object.values(checks).forEach(check => {
        if (check) check.classList.remove('valid');
    });
    
    if (!password) return;
    
    let strength = 0;
    
    if (password.length >= 8) {
        if (checks.length) checks.length.classList.add('valid');
        strength++;
    }
    
    if (/[A-Z]/.test(password)) {
        if (checks.uppercase) checks.uppercase.classList.add('valid');
        strength++;
    }
    
    if (/[a-z]/.test(password)) {
        if (checks.lowercase) checks.lowercase.classList.add('valid');
        strength++;
    }
    
    if (/\d/.test(password)) {
        if (checks.number) checks.number.classList.add('valid');
        strength++;
    }
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        if (checks.special) checks.special.classList.add('valid');
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

// ============================================
// PHONE FORMATTING
// ============================================
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 11) {
        value = value.slice(0, 11);
    }
    
    input.value = value;
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });
    
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
}

// ============================================
// AVATAR PREVIEW
// ============================================
function setupAvatarPreview() {
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    avatarPreview.innerHTML = `<img src="${event.target.result}" alt="Profile Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    avatarPreview.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// ============================================
// FORM SUBMISSION HANDLERS
// ============================================
function setupFormHandlers() {
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            window.login();
        });
    }
    
    const signupForm = document.getElementById('signupFormElement');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            window.signup();
        });
    }
}

// ============================================
// LOGOUT FUNCTION
// ============================================
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// ============================================
// CHECK AUTH STATUS
// ============================================
function checkAuthStatus() {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    
    if (token && user && !window.location.pathname.includes('dashboard.html')) {
        console.log('User already logged in, redirecting to dashboard');
        window.location.href = 'dashboard.html';
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DailyFlow Auth System Initializing...');
    
    checkAuthStatus();
    setupFormHandlers();
    setupPasswordToggles();
    setupAvatarPreview();
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
    }
    
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('error');
            const errorMsg = this.parentElement.parentElement?.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
    });
    
    console.log('✅ Auth System Ready');
});

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
window.login = login;
window.signup = signup;
window.logout = logout;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.useDemoAccount = useDemoAccount;
window.checkPasswordStrength = checkPasswordStrength;
window.showToast = showToast;
window.showLoader = showLoader;
window.hideLoader = hideLoader;

console.log('✅ Global functions attached');