// DailyFlow Forgot Password System - With On-Screen Code Display
// Save as: js/forgot-password.js

// ===== GLOBAL VARIABLES =====
let currentStep = 1;
let foundUser = null;
let countdownInterval = null;
let codeGenerationInterval = null;
let timeLeft = 300; // 5 minutes in seconds
let codeGenerationTime = 5; // 5 seconds countdown for code generation

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔑 DailyFlow Forgot Password System Initialized');
    
    // Show step 1 initially
    showStep(1);
    
    // Setup event listeners
    setupEventListeners();
    
    // Test: Check if localStorage has users
    testLocalStorage();
});

function testLocalStorage() {
    const users = JSON.parse(localStorage.getItem('dailyflow_users') || '{}');
    console.log('📊 Current users in localStorage:', Object.keys(users).length);
    if (Object.keys(users).length === 0) {
        console.warn('⚠️ No users found in localStorage. Create an account first.');
    } else {
        console.log('👥 Users:', Object.keys(users));
    }
}

function setupEventListeners() {
    // Email input event for real-time search
    const emailInput = document.getElementById('resetEmail');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            searchUserByEmail(this.value);
        });
        
        // Allow Enter key to trigger send
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendResetCode();
            }
        });
    }
    
    // Password strength real-time checking
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            checkPasswordStrength();
            checkPasswordMatch();
        });
        
        newPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                resetPassword();
            }
        });
    }
    
    // Password match checking
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
        
        confirmPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                resetPassword();
            }
        });
    }
    
    // Setup code input navigation
    setupCodeInputs();
    
    // Add click event to send button for debugging
    const sendBtn = document.getElementById('sendCodeBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', function(e) {
            console.log('🔄 Send button clicked');
            console.log('📧 Email input value:', document.getElementById('resetEmail').value);
            console.log('👤 Found user:', foundUser);
            console.log('🔓 Button disabled:', this.disabled);
        });
    }
}

// ===== STEP MANAGEMENT =====
function showStep(stepNumber) {
    console.log(`📱 Switching to step ${stepNumber}`);
    
    // Update current step
    currentStep = stepNumber;
    
    // Hide all steps
    document.querySelectorAll('.reset-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show the requested step
    const stepElement = document.getElementById(`step${stepNumber}`);
    if (stepElement) {
        stepElement.classList.add('active');
        
        // Step-specific initialization
        switch(stepNumber) {
            case 1:
                initializeStep1();
                break;
            case 2:
                initializeStep2();
                break;
            case 3:
                initializeStep3();
                break;
            case 4:
                initializeStep4();
                break;
        }
        
        // Add animation
        stepElement.style.animation = 'slideIn 0.3s ease';
        setTimeout(() => stepElement.style.animation = '', 300);
    }
}

function initializeStep1() {
    console.log('🔧 Initializing Step 1');
    
    // Focus on email input
    const emailInput = document.getElementById('resetEmail');
    if (emailInput) {
        setTimeout(() => {
            emailInput.focus();
            emailInput.value = '';
        }, 100);
    }
    
    // Clear any previous user info
    document.getElementById('userFoundInfo').style.display = 'none';
    document.getElementById('noUserFound').style.display = 'none';
    
    // Enable send button initially (will be disabled by search if no user found)
    const sendBtn = document.getElementById('sendCodeBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
    }
    
    // Reset found user
    foundUser = null;
}

function initializeStep2() {
    console.log('🔧 Initializing Step 2');
    
    // Stop any existing timers
    stopAllTimers();
    
    if (!foundUser) {
        console.error('❌ No user found when entering step 2');
        showToast('User not found. Please start over.', 'error');
        setTimeout(() => showStep(1), 1000);
        return;
    }
    
    console.log('✅ Proceeding with user:', foundUser.username);
    
    // Display the email
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        userEmailElement.textContent = foundUser.email;
    }
    
    // Clear code display
    const codeDisplay = document.getElementById('codeDisplay');
    const codeCountdown = document.getElementById('codeCountdown');
    if (codeDisplay) {
        codeDisplay.textContent = '';
        codeDisplay.className = 'verification-code';
    }
    if (codeCountdown) {
        codeCountdown.textContent = 'Generating code in 5 seconds...';
        codeCountdown.style.color = '#ed8936';
    }
    
    // Clear code inputs
    clearCodeInputs();
    
    // Start code generation countdown
    startCodeGeneration();
    
    // Start verification code expiry countdown
    startCountdown();
    
    // Focus on first code input after code appears
    setTimeout(() => {
        const code1 = document.getElementById('code1');
        if (code1) code1.focus();
    }, 6000); // Wait for code generation (5 seconds + buffer)
}

function initializeStep3() {
    console.log('🔧 Initializing Step 3');
    
    // Stop all timers
    stopAllTimers();
    
    if (!foundUser) {
        console.error('❌ No user found when entering step 3');
        showToast('User not found. Please start over.', 'error');
        setTimeout(() => showStep(1), 1000);
        return;
    }
    
    // Display username
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
        usernameDisplay.textContent = foundUser.username;
    }
    
    // Display current password
    const currentPasswordDisplay = document.getElementById('currentPasswordDisplay');
    if (currentPasswordDisplay) {
        currentPasswordDisplay.textContent = foundUser.password || 'No password set';
    }
    
    // Clear password fields
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Reset validation displays
    resetPasswordValidation();
    
    // Focus on new password input
    setTimeout(() => {
        document.getElementById('newPassword').focus();
    }, 100);
}

function initializeStep4() {
    console.log('✅ Password reset successful!');
}

// ===== STEP 1: FIND USER =====
function searchUserByEmail(email) {
    console.log('🔍 Searching for email:', email);
    
    const userFoundInfo = document.getElementById('userFoundInfo');
    const noUserFound = document.getElementById('noUserFound');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    
    // Clear previous displays
    userFoundInfo.style.display = 'none';
    noUserFound.style.display = 'none';
    
    // If email is empty, just return
    if (!email || !email.trim()) {
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
        return;
    }
    
    // Validate email format
    if (!validateEmail(email)) {
        noUserFound.style.display = 'block';
        noUserFound.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter a valid email address';
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
        return;
    }
    
    // Search for user in localStorage
    foundUser = findUserInLocalStorage(email);
    
    if (foundUser) {
        console.log('✅ User found:', foundUser.username);
        
        // Update user info display
        document.getElementById('foundUsername').textContent = foundUser.username;
        document.getElementById('foundUserEmail').textContent = foundUser.email;
        document.getElementById('foundCurrentPassword').textContent = foundUser.password || 'Not set';
        
        // Show user found info
        userFoundInfo.style.display = 'block';
        noUserFound.style.display = 'none';
        
        // Enable send code button
        sendCodeBtn.disabled = false;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
        
        // Animate the display
        userFoundInfo.style.animation = 'slideIn 0.5s ease';
        setTimeout(() => userFoundInfo.style.animation = '', 500);
        
        // Show success toast
        showToast(`Account found! Welcome back ${foundUser.username}`, 'success');
    } else {
        console.log('❌ User not found for email:', email);
        
        // Show no user found
        noUserFound.style.display = 'block';
        noUserFound.innerHTML = '<i class="fas fa-user-times"></i> No account found with this email';
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
        foundUser = null;
    }
}

function sendResetCode() {
    console.log('🚀 Sending reset code...');
    
    // Get email from input
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    
    // Validate email
    if (!email) {
        showToast('Please enter your email address', 'error');
        emailInput.focus();
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        emailInput.focus();
        return;
    }
    
    // If no user found yet, search for them
    if (!foundUser) {
        foundUser = findUserInLocalStorage(email);
    }
    
    // Check if user was found
    if (!foundUser) {
        showToast('No account found with this email. Please sign up first.', 'error');
        return;
    }
    
    console.log('✅ User verified:', foundUser.username);
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Store the code with user info
    localStorage.setItem('dailyflow_verification_code', JSON.stringify({
        code: verificationCode,
        email: foundUser.email,
        username: foundUser.username,
        expiresAt: Date.now() + 300000 // 5 minutes
    }));
    
    // Store in foundUser for step 2
    foundUser.verificationCode = verificationCode;
    
    // Disable send button temporarily
    const sendBtn = document.getElementById('sendCodeBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }
    
    // Move to step 2 after brief delay
    setTimeout(() => {
        showStep(2);
        showToast('Verification code will appear in 5 seconds...', 'info');
        
        // Re-enable send button (it will be on different step)
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code';
        }
    }, 500);
}

// ===== STEP 2: CODE VERIFICATION =====
function startCodeGeneration() {
    console.log('⏳ Starting code generation countdown...');
    
    let secondsLeft = 5;
    const codeDisplay = document.getElementById('codeDisplay');
    const codeCountdown = document.getElementById('codeCountdown');
    
    // Clear any existing interval
    if (codeGenerationInterval) {
        clearInterval(codeGenerationInterval);
    }
    
    // Start countdown
    codeGenerationInterval = setInterval(() => {
        if (secondsLeft > 0) {
            codeCountdown.textContent = `Code will appear in ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''}...`;
            secondsLeft--;
        } else {
            // Generate and display code
            clearInterval(codeGenerationInterval);
            
            // Use stored code or generate new one
            const storedCode = JSON.parse(localStorage.getItem('dailyflow_verification_code') || '{}');
            const verificationCode = storedCode.code || generateVerificationCode();
            
            console.log('🔐 Generated code:', verificationCode);
            
            // Display the code
            codeDisplay.textContent = verificationCode;
            codeDisplay.classList.add('code-reveal');
            codeCountdown.innerHTML = '<i class="fas fa-arrow-down"></i> Enter this code below:';
            codeCountdown.style.color = '#48bb78';
            
            // Store in foundUser for verification
            foundUser.verificationCode = verificationCode;
            
            // Also show in console for debugging
            console.log('📋 Verification Code:', verificationCode);
            console.log('👤 For user:', foundUser.username);
            console.log('📧 Email:', foundUser.email);
            
            // Auto-focus on first code input
            setTimeout(() => {
                const code1 = document.getElementById('code1');
                if (code1) {
                    code1.focus();
                    console.log('🎯 Auto-focused on code input');
                }
            }, 300);
            
            showToast('Verification code generated! Enter it below.', 'success');
        }
    }, 1000);
}

function setupCodeInputs() {
    console.log('🔧 Setting up code inputs...');
    
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`code${i}`);
        if (input) {
            // Allow only numbers
            input.addEventListener('keydown', function(e) {
                // Allow: backspace, delete, tab, escape, enter, arrow keys
                if ([8, 9, 13, 27, 37, 38, 39, 40, 46].includes(e.keyCode)) {
                    return;
                }
                
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                if ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && e.ctrlKey) {
                    return;
                }
                
                // Only allow numbers 0-9
                if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            });
            
            // Auto-focus next input
            input.addEventListener('input', function() {
                if (this.value.length === 1 && i < 6) {
                    const nextInput = document.getElementById(`code${i + 1}`);
                    if (nextInput) {
                        setTimeout(() => nextInput.focus(), 10);
                    }
                }
                
                // Auto-verify if all 6 digits are entered
                if (i === 6 && this.value.length === 1) {
                    setTimeout(verifyCode, 300);
                }
            });
            
            // Also allow moveToNext for onclick
            input.setAttribute('oninput', `moveToNext(${i})`);
        }
    }
}

function moveToNext(currentIndex) {
    const input = document.getElementById(`code${currentIndex}`);
    if (input && input.value.length === 1) {
        input.classList.add('filled');
        
        // Auto-focus next input if not last
        if (currentIndex < 6) {
            const nextInput = document.getElementById(`code${currentIndex + 1}`);
            if (nextInput) {
                setTimeout(() => nextInput.focus(), 10);
            }
        }
    } else {
        input.classList.remove('filled');
    }
}

function verifyCode() {
    console.log('🔐 Verifying code...');
    
    // Get entered code
    let enteredCode = '';
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`code${i}`);
        if (input && input.value) {
            enteredCode += input.value;
        }
    }
    
    console.log('📝 Entered code:', enteredCode);
    
    // Check if complete code is entered
    if (enteredCode.length !== 6) {
        showToast('Please enter the complete 6-digit code', 'error');
        return;
    }
    
    // Get stored verification code
    const storedCodeData = JSON.parse(localStorage.getItem('dailyflow_verification_code') || '{}');
    console.log('💾 Stored code:', storedCodeData.code);
    
    // Check if code matches
    if (!storedCodeData.code || enteredCode !== storedCodeData.code) {
        console.log('❌ Code mismatch');
        showToast('Invalid verification code. Please try again.', 'error');
        
        // Shake animation
        document.querySelectorAll('.code-input').forEach(input => {
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        });
        
        // Clear inputs and refocus
        clearCodeInputs();
        setTimeout(() => {
            const code1 = document.getElementById('code1');
            if (code1) code1.focus();
        }, 100);
        return;
    }
    
    // Check if code expired
    if (Date.now() > storedCodeData.expiresAt) {
        showToast('Verification code has expired. Please request a new one.', 'error');
        showStep(1);
        return;
    }
    
    // Code verified successfully
    console.log('✅ Code verified successfully!');
    showToast('Email verified successfully!', 'success');
    
    // Move to step 3 after delay
    setTimeout(() => showStep(3), 500);
}

function resendCode() {
    console.log('🔄 Resending code...');
    
    if (!foundUser) {
        showToast('User not found. Please start over.', 'error');
        showStep(1);
        return;
    }
    
    // Generate new code
    const newVerificationCode = generateVerificationCode();
    
    // Update localStorage
    localStorage.setItem('dailyflow_verification_code', JSON.stringify({
        code: newVerificationCode,
        email: foundUser.email,
        username: foundUser.username,
        expiresAt: Date.now() + 300000
    }));
    
    // Update foundUser
    foundUser.verificationCode = newVerificationCode;
    
    // Reset code display
    const codeDisplay = document.getElementById('codeDisplay');
    const codeCountdown = document.getElementById('codeCountdown');
    
    if (codeDisplay) {
        codeDisplay.textContent = '';
        codeDisplay.classList.remove('code-reveal');
    }
    
    if (codeCountdown) {
        codeCountdown.textContent = 'Generating new code...';
        codeCountdown.style.color = '#ed8936';
    }
    
    // Clear code inputs
    clearCodeInputs();
    
    // Restart timers
    timeLeft = 300;
    startCountdown();
    startCodeGeneration();
    
    showToast('New verification code will appear in 5 seconds...', 'info');
}

function changeEmail() {
    console.log('📧 Changing email...');
    showStep(1);
}

function clearCodeInputs() {
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById(`code${i}`);
        if (input) {
            input.value = '';
            input.classList.remove('filled');
        }
    }
}

// ===== STEP 3: RESET PASSWORD =====
function resetPassword() {
    console.log('🔑 Resetting password...');
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    console.log('New password length:', newPassword.length);
    console.log('Confirm password length:', confirmPassword.length);
    
    // Basic validation
    if (!newPassword || !confirmPassword) {
        showToast('Please enter and confirm your new password', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        document.getElementById('confirmPassword').focus();
        return;
    }
    
    // Check if new password is same as old
    if (newPassword === foundUser.password) {
        showToast('New password cannot be the same as current password', 'error');
        return;
    }
    
    // Check password strength
    const strength = checkPasswordStrength();
    if (strength.score < 3) {
        showToast('Please use a stronger password', 'error');
        return;
    }
    
    // Update password in localStorage
    const success = updateUserPassword(foundUser.username, newPassword);
    
    if (success) {
        // Clear verification code
        localStorage.removeItem('dailyflow_verification_code');
        
        // Show success and move to step 4
        showToast('Password reset successfully!', 'success');
        setTimeout(() => showStep(4), 500);
        
        // Log for demo
        console.log('✅ Password updated successfully');
        console.log('👤 User:', foundUser.username);
        console.log('🔐 Old password:', foundUser.password);
        console.log('🔑 New password:', newPassword);
    } else {
        showToast('Failed to update password. Please try again.', 'error');
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('passwordStrength');
    const requirements = {
        length: document.getElementById('reqLength'),
        uppercase: document.getElementById('reqUppercase'),
        lowercase: document.getElementById('reqLowercase'),
        number: document.getElementById('reqNumber')
    };
    
    let score = 0;
    
    // Check each requirement
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
    };
    
    // Update requirement indicators
    Object.keys(checks).forEach(key => {
        if (requirements[key]) {
            const icon = requirements[key].querySelector('i');
            if (checks[key]) {
                requirements[key].classList.add('valid');
                icon.className = 'fas fa-check-circle';
                score++;
            } else {
                requirements[key].classList.remove('valid');
                icon.className = 'fas fa-circle';
            }
        }
    });
    
    // Update strength bars
    strengthBars.forEach((bar, index) => {
        bar.style.backgroundColor = '#e2e8f0'; // Reset
        if (index < score) {
            if (score <= 1) bar.style.backgroundColor = '#f56565';
            else if (score <= 2) bar.style.backgroundColor = '#ed8936';
            else if (score <= 3) bar.style.backgroundColor = '#ecc94b';
            else bar.style.backgroundColor = '#48bb78';
        }
    });
    
    // Update strength text
    if (strengthText) {
        const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        strengthText.textContent = strengthLabels[score] || 'Very Weak';
        strengthText.style.color = score <= 1 ? '#f56565' : 
                                  score <= 2 ? '#ed8936' : 
                                  score <= 3 ? '#ecc94b' : '#48bb78';
    }
    
    return { score, checks };
}

function checkPasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const matchElement = document.getElementById('passwordMatch');
    
    if (!matchElement) return;
    
    if (!password) {
        matchElement.innerHTML = '<i class="fas fa-info-circle"></i> Enter a password first';
        matchElement.style.color = '#718096';
        return;
    }
    
    if (!confirm) {
        matchElement.innerHTML = '<i class="fas fa-info-circle"></i> Confirm your password';
        matchElement.style.color = '#718096';
        return;
    }
    
    if (password === confirm) {
        matchElement.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match';
        matchElement.style.color = '#48bb78';
    } else {
        matchElement.innerHTML = '<i class="fas fa-times-circle"></i> Passwords do not match';
        matchElement.style.color = '#f56565';
    }
}

function resetPasswordValidation() {
    // Reset requirement indicators
    const requirements = ['reqLength', 'reqUppercase', 'reqLowercase', 'reqNumber'];
    requirements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('valid');
            const icon = element.querySelector('i');
            if (icon) icon.className = 'fas fa-circle';
        }
    });
    
    // Reset strength bars
    document.querySelectorAll('.strength-bar').forEach(bar => {
        bar.style.backgroundColor = '#e2e8f0';
    });
    
    // Reset strength text
    const strengthText = document.getElementById('passwordStrength');
    if (strengthText) {
        strengthText.textContent = '';
    }
    
    // Reset match message
    const matchElement = document.getElementById('passwordMatch');
    if (matchElement) {
        matchElement.innerHTML = '<i class="fas fa-info-circle"></i> Passwords must match';
        matchElement.style.color = '#718096';
    }
}

// ===== UTILITY FUNCTIONS =====
function findUserInLocalStorage(email) {
    try {
        // Get users from localStorage
        const usersJSON = localStorage.getItem('dailyflow_users');
        if (!usersJSON) {
            console.log('❌ No users found in localStorage');
            return null;
        }
        
        const users = JSON.parse(usersJSON);
        console.log('📊 Users in storage:', Object.keys(users));
        
        // Search for user by email
        for (const [username, userData] of Object.entries(users)) {
            console.log(`🔍 Checking user: ${username}, email: ${userData.email}`);
            if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
                console.log('✅ Match found!');
                return {
                    username: username,
                    email: userData.email,
                    password: userData.password || 'Not set',
                    fullName: userData.fullName || 'User'
                };
            }
        }
        
        console.log('❌ No match found for email:', email);
        return null;
    } catch (error) {
        console.error('❌ Error searching for user:', error);
        return null;
    }
}

function generateVerificationCode() {
    // Generate a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function updateUserPassword(username, newPassword) {
    try {
        // Get users from localStorage
        const usersJSON = localStorage.getItem('dailyflow_users');
        if (!usersJSON) return false;
        
        const users = JSON.parse(usersJSON);
        
        // Check if user exists
        if (!users[username]) {
            console.error('❌ User not found:', username);
            return false;
        }
        
        // Update password
        users[username].password = newPassword;
        users[username].lastPasswordChange = new Date().toISOString();
        
        // Save back to localStorage
        localStorage.setItem('dailyflow_users', JSON.stringify(users));
        
        // Update foundUser for display
        if (foundUser && foundUser.username === username) {
            foundUser.password = newPassword;
        }
        
        console.log('✅ Password updated for user:', username);
        return true;
    } catch (error) {
        console.error('❌ Error updating password:', error);
        return false;
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggleBtn = field.nextElementSibling;
    
    if (!field || !toggleBtn) return;
    
    if (field.type === 'password') {
        field.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        toggleBtn.setAttribute('aria-label', 'Hide password');
    } else {
        field.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        toggleBtn.setAttribute('aria-label', 'Show password');
    }
}

// ===== TIMER FUNCTIONS =====
function startCountdown() {
    // Clear any existing timer
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Reset time
    timeLeft = 300;
    
    // Update display immediately
    updateCountdownDisplay();
    
    // Start countdown
    countdownInterval = setInterval(() => {
        timeLeft--;
        updateCountdownDisplay();
        
        if (timeLeft <= 0) {
            stopCountdown();
            showToast('Verification code has expired', 'error');
            document.getElementById('resendBtn').disabled = false;
        }
    }, 1000);
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function updateCountdownDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const countdownElement = document.getElementById('countdown');
    
    if (countdownElement) {
        countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color based on time remaining
        if (timeLeft < 60) {
            countdownElement.style.color = '#f56565';
        } else if (timeLeft < 120) {
            countdownElement.style.color = '#ed8936';
        } else {
            countdownElement.style.color = '#667eea';
        }
    }
}

function stopAllTimers() {
    stopCountdown();
    
    if (codeGenerationInterval) {
        clearInterval(codeGenerationInterval);
        codeGenerationInterval = null;
    }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    switch(type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'exclamation-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
    }
    
    // Toast content
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// ===== GLOBAL FUNCTION EXPORTS =====
// Make functions available to HTML onclick handlers
window.sendResetCode = sendResetCode;
window.verifyCode = verifyCode;
window.resetPassword = resetPassword;
window.resendCode = resendCode;
window.changeEmail = changeEmail;
window.moveToNext = moveToNext;
window.togglePassword = togglePassword;
window.searchUserByEmail = searchUserByEmail;

console.log('✅ Forgot Password System Ready!');
console.log('📝 Debug mode: ON - Check console for detailed logs');