// ===== FORGOT PASSWORD FUNCTIONS =====
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = document.querySelector(`[onclick="togglePassword('${inputId}')"]`);
    
    if (input && toggleBtn) {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('password')?.value || '';
    const strengthBars = document.querySelectorAll('.password-strength .strength-bar');
    const hints = document.querySelectorAll('.password-hints li');
    
    if (!password) {
        // Reset all
        strengthBars.forEach(bar => bar.style.background = 'var(--gray-200)');
        hints.forEach(hint => hint.classList.remove('valid'));
        return;
    }
    
    // Check criteria
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    // Update hints
    hints.forEach(hint => {
        const id = hint.id.replace('Check', '').toLowerCase();
        if (checks[id]) {
            hint.classList.add('valid');
        } else {
            hint.classList.remove('valid');
        }
    });
    
    // Calculate score
    const score = Object.values(checks).filter(Boolean).length;
    
    // Update strength bars
    strengthBars.forEach((bar, index) => {
        if (index < score) {
            if (score <= 2) bar.style.background = 'var(--danger)';
            else if (score <= 3) bar.style.background = 'var(--warning)';
            else if (score <= 4) bar.style.background = 'var(--accent)';
            else bar.style.background = 'var(--success)';
        } else {
            bar.style.background = 'var(--gray-200)';
        }
    });
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredInputs = form.querySelectorAll('input[required]');
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
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function setupAnimations() {
    // Add animation on load
    document.querySelectorAll('.feature').forEach((feature, index) => {
        feature.style.animationDelay = `${index * 0.1}s`;
    });
}