// ============================================
// DAILYFLOW AUTHENTICATION SYSTEM
// Version: 7.0.0 - LOOP FREE & STABLE
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
let loginAttempts = {};

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

    try {
        const response = await fetchWithTimeout(
            `${API_BASE_URL}/api/health`,
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
// INPUT SANITIZATION
// ============================================
function sanitizeInput(input) {
    if (!input) return '';
    return String(input).replace(/[<>]/g, '').trim();
}

function validateEmail(email) {
    const sanitized = sanitizeInput(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : null;
}

function validatePhone(phone) {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 11 ? digitsOnly : null;
}

// ============================================
// LOADER FUNCTIONS
// ============================================
function showLoader(title, subtitle, type = 'default') {
    const loader = document.getElementById('globalLoader');
    const loaderTitle = document.getElementById('loaderTitle');
    const loaderSubtitle = document.getElementById('loaderSubtitle');

    if (!loader) return;

    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderSubtitle) loaderSubtitle.textContent = subtitle;

    loader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function updateLoaderMessage(title, subtitle) {
    const loaderTitle = document.getElementById('loaderTitle');
    const loaderSubtitle = document.getElementById('loaderSubtitle');

    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderSubtitle) loaderSubtitle.textContent = subtitle;
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info', duration = 5000) {
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
// AGGRESSIVE LOGOUT FUNCTION - NO LOOP
// ============================================
function logout() {
    console.log('🚪 Logout function called');

    // Prevent multiple logout attempts
    if (window.isLoggingOut) return;
    window.isLoggingOut = true;

    // Show feedback to the user
    showToast('Logging out securely...', 'info', 2000);

    try {
        // --- STEP 1: NUKE ALL STORAGE ---
        console.log('🧹 Clearing localStorage...');
        localStorage.clear(); // Wipes everything in localStorage

        console.log('🧹 Clearing sessionStorage...');
        sessionStorage.clear(); // Wipes everything in sessionStorage

        // --- STEP 2: CLEAR COOKIES (Important for some backends) ---
        console.log('🍪 Clearing cookies...');
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
        });

        // --- STEP 3: MANUALLY NUKE SPECIFIC KEYS (Belt & Suspenders) ---
        const keysToNuke = [
            'dailyflow_token',
            'dailyflow_user',
            'dailyflow_currentUser',
            'token_expiry',
            'dailyflow_settings',
            'dailyflow_profile_picture',
            'last_activity',
            'rememberMe'
        ];
        keysToNuke.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        console.log('✅ All storage has been wiped clean.');

        // --- STEP 4: FORCE REDIRECT TO LOGIN PAGE ---
        // Use replace to prevent the browser from keeping the dashboard in history
        setTimeout(() => {
            window.location.replace('index.html');
        }, 150); // Small delay to ensure storage clears

    } catch (error) {
        console.error('Logout error:', error);
        // If something goes wrong, still try to redirect
        window.location.replace('index.html');
    } finally {
        // Reset logout flag after a delay
        setTimeout(() => {
            window.isLoggingOut = false;
        }, 500);
    }
}

// ============================================
// FOOLPROOF AUTH CHECK - PREVENTS LOOPS
// ============================================
function checkAuthStatus() {
    // Determine which page we are on
    const path = window.location.pathname;
    const isLoginPage = path.includes('index.html') || path === '/' || path.endsWith('/');
    const isDashboardPage = path.includes('dashboard.html');

    // Get the token from either storage location
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

    console.log(`📍 On page: ${path}, Token exists: ${!!token}, User exists: ${!!user}`);

    // --- THE GOLDEN RULES ---
    // Rule 1: If I'm on the dashboard but don't have a valid session, GTFO.
    if (isDashboardPage && (!token || !user)) {
        console.log('🚫 Dashboard: No valid session. Redirecting to login.');
        window.location.replace('index.html');
        return;
    }

    // Rule 2: If I'm on the login page AND I have a valid session, go to the dashboard.
    if (isLoginPage && token && user) {
        console.log('✅ Login Page: Valid session found. Redirecting to dashboard.');
        window.location.replace('dashboard.html');
        return;
    }

    // Rule 3: If I'm on the login page with no session, or on the dashboard with a session, do nothing.
    console.log('👍 Auth check passed. Staying put.');
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
    showLoader('🔐 Signing In', 'Please wait...', 'login');
    
    try {
        // Check connection
        updateLoaderMessage('🌐 Connecting', 'Checking server connection...');
        const connection = await checkBackendConnection();
        
        if (!connection.success) {
            hideLoader();
            showToast('⚠️ Cannot connect to server. Please try again.', 'error', 8000);
            isLoggingIn = false;
            return;
        }
        
        // Make login request
        updateLoaderMessage('🔐 Verifying', 'Checking your credentials...');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                usernameOrEmail: sanitizeInput(usernameOrEmail),
                password: password,
                rememberMe: rememberMe
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear any existing data first
            localStorage.clear();
            sessionStorage.clear();
            
            // Store new auth data
            if (rememberMe) {
                localStorage.setItem(TOKEN_KEY, data.data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            } else {
                sessionStorage.setItem(TOKEN_KEY, data.data.token);
                sessionStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            }
            
            localStorage.setItem('dailyflow_currentUser', data.data.user.username || data.data.user.email);
            
            updateLoaderMessage('✅ Success!', 'Redirecting to dashboard...');
            
            setTimeout(() => {
                window.location.replace('dashboard.html'); // Use replace to prevent back button issues
            }, 1500);
        } else {
            hideLoader();
            showToast(data.message || 'Login failed', 'error');
            isLoggingIn = false;
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        hideLoader();
        showToast('Network error. Please try again.', 'error');
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
    
    const fullName = sanitizeInput(document.getElementById('fullName')?.value.trim() || '');
    const email = document.getElementById('email')?.value.trim() || '';
    const username = sanitizeInput(document.getElementById('username')?.value.trim() || '');
    const phone = document.getElementById('phone')?.value.trim() || '';
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const termsAgreement = document.getElementById('termsAgreement')?.checked || false;
    
    // Validation
    if (!fullName || !email || !username || !phone || !password || !confirmPassword) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!termsAgreement) {
        showToast('You must agree to the Terms of Service', 'warning');
        return;
    }
    
    const validatedEmail = validateEmail(email);
    if (!validatedEmail) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    const validatedPhone = validatePhone(phone);
    if (!validatedPhone) {
        showToast('Phone number must be exactly 11 digits', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    isSigningUp = true;
    showLoader('📝 Creating Account', 'Please wait...', 'signup');
    
    try {
        updateLoaderMessage('🌐 Connecting', 'Checking server connection...');
        const connection = await checkBackendConnection();
        
        if (!connection.success) {
            hideLoader();
            showToast('⚠️ Cannot connect to server.', 'error', 8000);
            isSigningUp = false;
            return;
        }
        
        updateLoaderMessage('📝 Creating', 'Setting up your account...');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                fullName: fullName,
                email: validatedEmail,
                username: username,
                phoneNumber: validatedPhone,
                password: password,
                confirmPassword: confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
            localStorage.setItem('dailyflow_currentUser', data.data.user.username || data.data.user.email);
            
            updateLoaderMessage('✅ Account Created!', 'Welcome to DailyFlow! Redirecting...');
            
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 2000);
        } else {
            hideLoader();
            showToast(data.message || 'Signup failed', 'error');
            isSigningUp = false;
        }
    } catch (error) {
        console.error('❌ Signup error:', error);
        hideLoader();
        showToast('Network error. Please try again.', 'error');
        isSigningUp = false;
    }
}

// ============================================
// UI NAVIGATION FUNCTIONS
// ============================================
function showLogin() {
    document.getElementById('loginForm')?.classList.add('active');
    document.getElementById('signupForm')?.classList.remove('active');
}

function showSignup() {
    document.getElementById('signupForm')?.classList.add('active');
    document.getElementById('loginForm')?.classList.remove('active');
}

function useDemoAccount() {
    document.getElementById('loginUsername').value = 'demo@dailyflow.app';
    document.getElementById('loginPassword').value = 'DemoPass123!';
    showToast('✨ Demo credentials loaded!', 'info');
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function setupPasswordToggles() {
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
// PASSWORD STRENGTH CHECKER
// ============================================
function checkPasswordStrength() {
    const password = document.getElementById('password')?.value || '';
    const strengthBars = document.querySelectorAll('.strength-bar');
    
    strengthBars.forEach(bar => bar.classList.remove('weak', 'medium', 'strong'));
    
    if (!password) return;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    for (let i = 0; i < strengthBars.length; i++) {
        if (i < strength) {
            if (strength <= 2) strengthBars[i].classList.add('weak');
            else if (strength <= 4) strengthBars[i].classList.add('medium');
            else strengthBars[i].classList.add('strong');
        }
    }
}

// ============================================
// PHONE FORMATTING
// ============================================
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    input.value = value;
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
            login();
        });
    }
    
    const signupForm = document.getElementById('signupFormElement');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            signup();
        });
    }
}

// ============================================
// INITIALIZATION - THIS RUNS ON EVERY PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DailyFlow Auth System Initializing...');
    console.log('📦 Version: 7.0.0 - Loop Free');
    
    // Setup UI elements
    setupPasswordToggles();
    setupAvatarPreview();
    setupFormHandlers();
    
    // Setup password strength checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    // Setup phone formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
    }
    
    // CRITICAL: Check auth status AFTER everything is set up
    // Small delay ensures DOM is fully ready
    setTimeout(checkAuthStatus, 100);
    
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