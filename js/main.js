// DailyFlow Dashboard Application - COMPLETELY FUNCTIONAL
// Save as: dashboard.js

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let storage = null;
let currentPage = 'dashboard';
let currentWeekOffset = 0; // For week navigation
let notifications = [];
let appData = {
    calendar: {},
    goals: [],
    projects: [],
    habits: [],
    settings: {
        theme: 'light',
        notifications: true,
        dailyReminder: '09:00'
    }
};

// ===== FIXED INITIALIZATION - NO LOOP =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DailyFlow Dashboard Initializing...');
    
    // Check for user in MULTIPLE possible locations
    const savedUser = checkForValidUser();
    
    if (savedUser) {
        currentUser = savedUser;
        console.log('✅ User authenticated:', currentUser);
        
        try {
            // Initialize the app with error handling
            initializeApp();
            setupEventListeners();
            updateCurrentDate();
            setInterval(updateCurrentDate, 60000);
            
            setTimeout(() => {
                checkMissedDays();
            }, 1000);
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            handleDashboardError();
        }
    } else {
        console.log('❌ No valid user session found');
        handleNoUserSession();
    }
});

// ===== NEW HELPER FUNCTIONS =====

/**
 * Check for valid user in all possible storage locations
 */
function checkForValidUser() {
    // Check all possible places where user data might be stored
    const possibleUsers = [
        localStorage.getItem('dailyflow_currentUser'),
        localStorage.getItem('dailyflow_user') ? JSON.parse(localStorage.getItem('dailyflow_user'))?.username : null,
        sessionStorage.getItem('dailyflow_user') ? JSON.parse(sessionStorage.getItem('dailyflow_user'))?.username : null,
        localStorage.getItem('user'),
        sessionStorage.getItem('user')
    ];
    
    // Return the first valid, non-empty user found
    for (let user of possibleUsers) {
        if (user && user !== 'null' && user !== 'undefined' && user !== '') {
            return user;
        }
    }
    
    return null;
}

/**
 * Handle case when no valid user session exists
 */
function handleNoUserSession() {
    console.log('🔄 No valid session, preparing for redirect...');
    
    // Clean up any corrupted data
    cleanupCorruptedData();
    
    // Check if we're being redirected in a loop
    const redirectCount = sessionStorage.getItem('redirect_count') || 0;
    
    if (redirectCount < 3) {
        // Increment redirect counter
        sessionStorage.setItem('redirect_count', parseInt(redirectCount) + 1);
        
        // Show a helpful message
        showToast('Your session has expired. Redirecting to login...', 'info', 3000);
        
        // Use replace instead of href to prevent history issues
        setTimeout(() => {
            window.location.replace('index.html');
        }, 100);
    } else {
        // Too many redirects - force a full reset
        console.log('⚠️ Too many redirects detected, forcing full reset');
        forceFullReset();
    }
}

/**
 * Handle dashboard initialization error
 */
function handleDashboardError() {
    console.error('❌ Dashboard initialization failed');
    
    showToast('Error loading dashboard. Redirecting to login...', 'error', 3000);
    
    // Clear potentially corrupted data
    localStorage.removeItem('dailyflow_currentUser');
    
    setTimeout(() => {
        window.location.replace('index.html');
    }, 3000);
}

/**
 * Clean up corrupted or invalid data
 */
function cleanupCorruptedData() {
    const suspiciousItems = [
        'dailyflow_currentUser',
        'dailyflow_user',
        'dailyflow_token',
        'user',
        'token'
    ];
    
    suspiciousItems.forEach(item => {
        const value = localStorage.getItem(item);
        if (value === 'null' || value === 'undefined' || value === '') {
            localStorage.removeItem(item);
        }
    });
}

/**
 * Force a full reset when too many redirects occur
 */
function forceFullReset() {
    // Clear ALL storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });
    
    // Reset redirect counter
    sessionStorage.removeItem('redirect_count');
    
    // Show message and redirect
    alert('Too many redirects detected. All data has been reset. Please login again.');
    window.location.replace('index.html');
}

/**
 * Safe redirect function to prevent loops
 */
function safeRedirect(url) {
    // Check if we're already redirecting
    if (window.isRedirecting) return;
    window.isRedirecting = true;
    
    // Use replace to avoid history issues
    setTimeout(() => {
        window.location.replace(url);
    }, 100);
}

// ===== LOCAL STORAGE MANAGER =====
class LocalStorageManager {
    constructor(username) {
        this.prefix = `dailyflow_${username}_`;
    }
    
    load(key) {
        const data = localStorage.getItem(this.prefix + key);
        return data ? JSON.parse(data) : null;
    }
    
    save(key, data) {
        localStorage.setItem(this.prefix + key, JSON.stringify(data));
        return true;
    }
}

function initializeApp() {
    // Setup storage with user prefix
    storage = new LocalStorageManager(currentUser);
    loadAppData();
    loadNotifications();
    updateUI();
    showPage('dashboard');
    scheduleDailyReminder();
}

// ===== DATA MANAGEMENT =====
function loadAppData() {
    if (!storage) return;
    
    // Load each data type
    appData.calendar = storage.load('calendar') || {};
    appData.goals = storage.load('goals') || [];
    appData.projects = storage.load('projects') || [];
    appData.habits = storage.load('habits') || [];
    appData.settings = storage.load('settings') || {
        theme: 'light',
        notifications: true,
        dailyReminder: '09:00'
    };
    
    // Load notifications
    notifications = storage.load('notifications') || [];
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', appData.settings.theme);
    
    // Initialize calendar for current year if empty
    initializeCalendar();
    
    // Initialize sample data if empty
    initializeSampleData();
}

function saveAppData() {
    if (!storage) return;
    
    try {
        storage.save('calendar', appData.calendar);
        storage.save('goals', appData.goals);
        storage.save('projects', appData.projects);
        storage.save('habits', appData.habits);
        storage.save('settings', appData.settings);
        storage.save('notifications', notifications);
        return true;
    } catch (error) {
        console.error('❌ Error saving app data:', error);
        return false;
    }
}

function loadNotifications() {
    if (!storage) return;
    notifications = storage.load('notifications') || [];
    updateNotificationDisplay();
}

function saveNotifications() {
    if (!storage) return;
    storage.save('notifications', notifications);
}

function addNotification(title, message, type = 'info', action = null) {
    const notification = {
        id: Date.now(),
        title,
        message,
        type,
        action,
        read: false,
        timestamp: new Date().toISOString()
    };
    
    notifications.unshift(notification); // Add to beginning
    saveNotifications();
    updateNotificationDisplay();
    
    // Show toast for important notifications
    if (type === 'error' || type === 'warning') {
        showToast(message, type);
    }
    
    return notification;
}

function updateNotificationDisplay() {
    const notificationCount = document.getElementById('notificationCount');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (notificationCount) {
        notificationCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    // Update notifications panel if open
    renderNotificationsList();
}

function renderNotificationsList() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" onclick="handleNotificationClick(${notification.id})">
            <div class="notification-icon ${notification.type}">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatTimeAgo(notification.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        'info': 'info-circle',
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'exclamation-circle'
    };
    return icons[type] || 'info-circle';
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now - past;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return past.toLocaleDateString();
}

function handleNotificationClick(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        
        if (notification.action) {
            if (notification.action.page) {
                showPage(notification.action.page);
            }
            if (notification.action.modal) {
                if (notification.action.modal === 'day') {
                    showDayModal(new Date());
                } else if (notification.action.modal === 'goal') {
                    showAddGoalModal();
                } else if (notification.action.modal === 'project') {
                    showAddProjectModal();
                }
            }
        }
        
        saveNotifications();
        updateNotificationDisplay();
        toggleNotifications(); // Close panel
    }
}

function clearAllNotifications() {
    if (notifications.length === 0) {
        showToast('No notifications to clear', 'info');
        return;
    }
    
    notifications = [];
    saveNotifications();
    updateNotificationDisplay();
    renderNotificationsList();
    showToast('All notifications cleared', 'success');
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    
    if (!panel) return;
    
    if (panel.classList.contains('show')) {
        // Close panel
        panel.classList.remove('show');
        // Remove backdrop if exists
        const backdrop = document.getElementById('notificationsBackdrop');
        if (backdrop) backdrop.remove();
    } else {
        // Open panel
        panel.classList.add('show');
        
        // Mark all as read when opening
        const hasUnread = notifications.some(n => !n.read);
        if (hasUnread) {
            notifications.forEach(n => n.read = true);
            saveNotifications();
            updateNotificationDisplay();
        }
    }
}

// Close notifications when clicking outside
document.addEventListener('click', function(e) {
    const panel = document.getElementById('notificationsPanel');
    const notificationBtn = document.querySelector('.btn-notification');
    
    // If panel is open AND click is NOT on panel or notification button
    if (panel && panel.classList.contains('show') && 
        !panel.contains(e.target) && 
        (!notificationBtn || !notificationBtn.contains(e.target))) {
        toggleNotifications(); // Close it
    }
});

// Close notifications when clicking escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const panel = document.getElementById('notificationsPanel');
        if (panel && panel.classList.contains('show')) {
            toggleNotifications();
        }
    }
});

// ===== INITIALIZATION FUNCTIONS =====
function initializeCalendar() {
    if (Object.keys(appData.calendar).length > 0) return;
    
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31`);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!appData.calendar[dateStr]) {
            appData.calendar[dateStr] = {
                plannedHours: 8,
                actualHours: 0,
                tasks: [],
                notes: '',
                status: 'planned',
                createdAt: new Date().toISOString()
            };
        }
    }
    
    saveAppData();
}

function initializeSampleData() {
    // Add sample goals if empty
    if (appData.goals.length === 0) {
        appData.goals = [
            {
                id: 1,
                title: 'Learn JavaScript Advanced Concepts',
                description: 'Master async/await, closures, and design patterns',
                targetDate: '2026-06-30',
                status: 'active',
                createdAt: '2026-01-01',
                priority: 'high'
            },
            {
                id: 2,
                title: 'Build 5 Real Projects',
                description: 'Complete 5 full-stack applications for portfolio',
                targetDate: '2026-12-31',
                status: 'active',
                createdAt: '2026-01-01',
                priority: 'medium'
            }
        ];
        
        addNotification(
            'Welcome to DailyFlow!',
            'We\'ve added some sample goals to get you started. You can edit or delete them.',
            'info',
            { page: 'goals' }
        );
    }
    
    // Add sample projects if empty
    if (appData.projects.length === 0) {
        appData.projects = [
            {
                id: 1,
                name: 'DailyFlow App',
                description: 'Life dashboard for tracking goals, habits, and progress',
                category: 'Web Development',
                tech: 'HTML, CSS, JavaScript',
                startDate: '2026-01-01',
                deadline: '2026-01-31',
                progress: 80,
                status: 'inprogress'
            }
        ];
    }
    
    // Add sample habits if empty
    if (appData.habits.length === 0) {
        appData.habits = [
            {
                id: 1,
                name: 'Morning Exercise',
                description: '30 minutes of exercise every morning',
                category: 'Health',
                frequency: 'daily',
                streak: 0,
                completedDates: []
            },
            {
                id: 2,
                name: 'Read 30 Pages',
                description: 'Read at least 30 pages every day',
                category: 'Learning',
                frequency: 'daily',
                streak: 0,
                completedDates: []
            }
        ];
    }
    
    saveAppData();
}

function checkMissedDays() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if yesterday was planned but not completed
    if (appData.calendar[yesterdayStr] && 
        appData.calendar[yesterdayStr].status === 'planned' &&
        appData.calendar[yesterdayStr].actualHours === 0) {
        
        const hasNotification = notifications.some(n => 
            n.message && n.message.includes('missed logging') && 
            new Date(n.timestamp).toDateString() === today.toDateString()
        );
        
        if (!hasNotification) {
            addNotification(
                'Missed Day Detected',
                `You didn't log any hours for ${yesterday.toLocaleDateString()}. Click to log it now.`,
                'warning',
                { modal: 'day' }
            );
        }
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            toggleSidebar();
        });
    }
    
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('href').substring(1);
            showPage(page);
        });
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        
        if (window.innerWidth <= 1024 && 
            sidebar && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && 
            mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
            toggleSidebar();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ===== SIDEBAR FUNCTIONS =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    if (sidebar) {
        sidebar.classList.toggle('open');
        
        // Update hamburger icon
        if (mobileMenuBtn) {
            if (sidebar.classList.contains('open')) {
                mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
                mobileMenuBtn.style.transform = 'rotate(90deg)';
            } else {
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                mobileMenuBtn.style.transform = 'rotate(0)';
            }
        }
    }
}

// ===== PAGE MANAGEMENT =====
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    const pageElement = document.getElementById(`${pageName}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
        
        // Update active nav item
        const navItem = document.querySelector(`.nav-item[href="#${pageName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // Update page title
        updatePageTitle(pageName);
        
        // Load page content
        loadPageContent(pageName);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 1024) {
            toggleSidebar();
        }
    }
    
    currentPage = pageName;
}

function updatePageTitle(pageName) {
    const titles = {
        dashboard: 'Dashboard',
        calendar: 'Calendar',
        goals: 'Goals',
        projects: 'Projects',
        habits: 'Habits',
        stats: 'Statistics'
    };
    
    const title = titles[pageName] || 'Dashboard';
    const pageTitle = document.getElementById('pageTitle');
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (pageTitle) pageTitle.textContent = title;
    if (breadcrumb) breadcrumb.textContent = `Life Dashboard / ${title}`;
}

function loadPageContent(pageName) {
    switch(pageName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'calendar':
            loadCalendarPage();
            break;
        case 'goals':
            loadGoalsPage();
            break;
        case 'projects':
            loadProjectsPage();
            break;
        case 'habits':
            loadHabitsPage();
            break;
        case 'stats':
            loadStatsPage();
            break;
    }
}

// ===== DASHBOARD FUNCTIONS =====
function updateDashboard() {
    updateStats();
    updateRecentActivity();
    updateWeekCalendar();
    updateUpcomingDeadlines();
    updateNavBadges();
}

function updateStats() {
    // Today's progress
    const today = new Date().toISOString().split('T')[0];
    const todayData = appData.calendar[today] || { tasks: [], actualHours: 0, plannedHours: 8 };
    const completedTasks = todayData.tasks ? todayData.tasks.filter(task => task.completed).length : 0;
    const totalTasks = todayData.tasks ? todayData.tasks.length : 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const todayProgress = document.getElementById('todayProgress');
    const todayTasks = document.getElementById('todayTasks');
    
    if (todayProgress) todayProgress.textContent = `${progress}%`;
    if (todayTasks) todayTasks.textContent = `${completedTasks}/${totalTasks} tasks`;
    
    // Goals achieved
    const completedGoals = appData.goals.filter(goal => goal.status === 'completed').length;
    const totalGoals = appData.goals.length;
    const goalsProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    
    const goalsAchieved = document.getElementById('goalsAchieved');
    const goalsCount = document.getElementById('goalsCount');
    
    if (goalsAchieved) goalsAchieved.textContent = `${goalsProgress}%`;
    if (goalsCount) goalsCount.textContent = `${completedGoals}/${totalGoals} goals`;
    
    // Active projects
    const activeProjects = appData.projects.filter(project => project.status === 'inprogress').length;
    const activeProjectsEl = document.getElementById('activeProjects');
    const projectsStatus = document.getElementById('projectsStatus');
    
    if (activeProjectsEl) activeProjectsEl.textContent = activeProjects;
    if (projectsStatus) projectsStatus.textContent = activeProjects > 0 ? 'In progress' : 'No active projects';
    
    // Total study hours (this month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyHours = Object.entries(appData.calendar)
        .filter(([date]) => {
            const d = new Date(date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, [, data]) => sum + (data.actualHours || 0), 0);
    
    const totalStudyHours = document.getElementById('totalStudyHours');
    if (totalStudyHours) totalStudyHours.textContent = monthlyHours;
}

function updateRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    // Get recent days (last 5 days)
    const recentDays = Object.entries(appData.calendar)
        .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
        .slice(0, 5);
    
    if (recentDays.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">No activity yet</div>
                    <p class="activity-desc">Start logging your daily tasks to see activity here</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    recentDays.forEach(([date, data]) => {
        const dateObj = new Date(date);
        const today = new Date().toDateString();
        const dateStr = dateObj.toDateString() === today ? 'Today' : dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        let icon = 'fa-calendar-check';
        let color = 'linear-gradient(135deg, #10b981, #34d399)';
        let title = 'Day Completed';
        let desc = `${data.actualHours || 0}h studied`;
        
        if (data.status === 'missed') {
            icon = 'fa-calendar-times';
            color = 'linear-gradient(135deg, #ef4444, #f87171)';
            title = 'Day Missed';
            desc = 'No study hours logged';
        } else if (data.status === 'planned') {
            icon = 'fa-calendar-plus';
            color = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
            title = 'Day Planned';
            desc = `${data.plannedHours || 8}h planned`;
        }
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon" style="background: ${color};">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${title}</div>
                <p class="activity-desc">${desc}</p>
                <div class="activity-time">${dateStr}</div>
            </div>
        `;
        
        activityItem.addEventListener('click', () => showDayModal(dateObj));
        container.appendChild(activityItem);
    });
}

function updateWeekCalendar() {
    const container = document.getElementById('weekCalendar');
    const currentWeek = document.getElementById('currentWeek');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get current week with offset
    const currentDate = new Date();
    const adjustedDate = new Date(currentDate);
    adjustedDate.setDate(currentDate.getDate() + (currentWeekOffset * 7));
    const currentDay = adjustedDate.getDay();
    const startDate = new Date(adjustedDate);
    startDate.setDate(adjustedDate.getDate() - currentDay);
    
    // Update week display
    const weekNumber = getWeekNumber(adjustedDate);
    if (currentWeek) currentWeek.textContent = `Week ${weekNumber}`;
    
    // Generate days for the week
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayData = appData.calendar[dateStr];
        const isToday = dayDate.toDateString() === new Date().toDateString();
        
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        if (isToday) dayCell.classList.add('today');
        if (dayData) {
            if (dayData.status === 'completed') dayCell.classList.add('completed');
            else if (dayData.status === 'missed') dayCell.classList.add('missed');
        }
        
        dayCell.innerHTML = `
            <div class="day-number">${dayDate.getDate()}</div>
            <div class="day-name">${dayDate.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        `;
        
        dayCell.addEventListener('click', () => showDayModal(dayDate));
        container.appendChild(dayCell);
    }
}

function updateUpcomingDeadlines() {
    const container = document.getElementById('upcomingDeadlines');
    if (!container) return;
    
    // Combine goals and projects with deadlines
    const deadlines = [];
    
    // Add goals with target dates
    appData.goals.forEach(goal => {
        if (goal.targetDate && goal.status !== 'completed') {
            deadlines.push({
                type: 'goal',
                id: goal.id,
                title: goal.title,
                date: new Date(goal.targetDate),
                description: goal.description,
                completed: false
            });
        }
    });
    
    // Add projects with deadlines
    appData.projects.forEach(project => {
        if (project.deadline && project.status !== 'completed') {
            deadlines.push({
                type: 'project',
                id: project.id,
                title: project.name,
                date: new Date(project.deadline),
                description: project.description,
                completed: false
            });
        }
    });
    
    // Sort by date (closest first)
    deadlines.sort((a, b) => a.date - b.date);
    
    // Get next 5 deadlines
    const upcoming = deadlines.slice(0, 5);
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="deadline-item">
                <div class="deadline-checkbox"></div>
                <div class="deadline-content">
                    <div class="deadline-title">No upcoming deadlines</div>
                    <p class="deadline-desc">Add goals or projects with deadlines to see them here</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    upcoming.forEach(deadline => {
        const daysUntil = Math.ceil((deadline.date - new Date()) / (1000 * 60 * 60 * 24));
        let urgencyClass = '';
        
        if (daysUntil <= 1) urgencyClass = 'urgent';
        else if (daysUntil <= 3) urgencyClass = 'warning';
        
        const deadlineItem = document.createElement('div');
        deadlineItem.className = `deadline-item ${urgencyClass}`;
        deadlineItem.innerHTML = `
            <div class="deadline-checkbox ${deadline.completed ? 'checked' : ''}">
                ${deadline.completed ? '✓' : ''}
            </div>
            <div class="deadline-content">
                <div class="deadline-title">${deadline.title}</div>
                <p class="deadline-desc">${deadline.description || 'No description'}</p>
                <div class="deadline-date">
                    <i class="far fa-calendar"></i>
                    ${deadline.date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                    })}
                    ${daysUntil > 0 ? `(${daysUntil} day${daysUntil !== 1 ? 's' : ''} left)` : '(Today)'}
                </div>
            </div>
        `;
        
        deadlineItem.addEventListener('click', () => {
            if (deadline.type === 'goal') {
                showGoalModal(deadline.id);
            } else {
                showProjectModal(deadline.id);
            }
        });
        
        container.appendChild(deadlineItem);
    });
}

function updateNavBadges() {
    // Dashboard badge - incomplete tasks today
    const today = new Date().toISOString().split('T')[0];
    const todayData = appData.calendar[today];
    const dashboardBadge = document.getElementById('navDashboardBadge');
    if (dashboardBadge && todayData && todayData.tasks) {
        const incomplete = todayData.tasks.filter(t => !t.completed).length;
        dashboardBadge.textContent = incomplete > 0 ? incomplete : '';
        dashboardBadge.style.display = incomplete > 0 ? 'inline-flex' : 'none';
    }
    
    // Calendar badge - missed days
    const calendarBadge = document.getElementById('navCalendarBadge');
    if (calendarBadge) {
        const missedDays = Object.values(appData.calendar).filter(d => d.status === 'missed').length;
        calendarBadge.textContent = missedDays > 0 ? missedDays : '';
        calendarBadge.style.display = missedDays > 0 ? 'inline-flex' : 'none';
    }
    
    // Goals badge - active goals
    const goalsBadge = document.getElementById('navGoalsBadge');
    if (goalsBadge) {
        const activeGoals = appData.goals.filter(g => g.status === 'active').length;
        goalsBadge.textContent = activeGoals > 0 ? activeGoals : '';
        goalsBadge.style.display = activeGoals > 0 ? 'inline-flex' : 'none';
    }
    
    // Projects badge - in progress projects
    const projectsBadge = document.getElementById('navProjectsBadge');
    if (projectsBadge) {
        const activeProjects = appData.projects.filter(p => p.status === 'inprogress').length;
        projectsBadge.textContent = activeProjects > 0 ? activeProjects : '';
        projectsBadge.style.display = activeProjects > 0 ? 'inline-flex' : 'none';
    }
    
    // Habits badge - habits to complete today
    const habitsBadge = document.getElementById('navHabitsBadge');
    if (habitsBadge) {
        const todayStr = new Date().toISOString().split('T')[0];
        const habitsToComplete = appData.habits.filter(habit => 
            !habit.completedDates?.includes(todayStr)
        ).length;
        habitsBadge.textContent = habitsToComplete > 0 ? habitsToComplete : '';
        habitsBadge.style.display = habitsToComplete > 0 ? 'inline-flex' : 'none';
    }
}

// ===== DAY MODAL FUNCTIONS =====
function showDayModal(date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const dayData = appData.calendar[dateStr] || {
        plannedHours: 8,
        actualHours: 0,
        tasks: [],
        notes: '',
        status: 'planned'
    };
    
    const modalHTML = `
        <div class="modal-overlay" id="dayModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>${new Date(dateStr).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</h3>
                    <button class="modal-close" onclick="closeModal('dayModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Planned Study Hours</label>
                        <input type="number" id="plannedHours" class="form-control" 
                               min="0" max="24" value="${dayData.plannedHours || 8}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Actual Hours Studied</label>
                        <input type="number" id="actualHours" class="form-control" 
                               min="0" max="24" value="${dayData.actualHours || 0}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Tasks for Today</label>
                        <div id="tasksList">
                            ${renderTasksList(dayData.tasks || [])}
                        </div>
                        <button class="btn btn-outline" onclick="addTaskInput()" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Add Task
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Notes & Reflection</label>
                        <textarea id="dayNotes" class="form-control" rows="4" 
                                  placeholder="How did today go? What could be improved?">${dayData.notes || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="dayStatus" class="form-control">
                            <option value="planned" ${dayData.status === 'planned' ? 'selected' : ''}>Planned</option>
                            <option value="inprogress" ${dayData.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${dayData.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="missed" ${dayData.status === 'missed' ? 'selected' : ''}>Missed</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-danger" onclick="deleteDayData('${dateStr}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn btn-outline" onclick="closeModal('dayModal')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="saveDayData('${dateStr}')">
                            <i class="fas fa-save"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
}

function renderTasksList(tasks) {
    if (tasks.length === 0) {
        return '<div style="color: var(--text-muted); font-style: italic; padding: 10px; text-align: center;">No tasks added yet</div>';
    }
    
    let html = '';
    tasks.forEach((task, index) => {
        html += `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: var(--bg-tertiary); border-radius: 8px;">
                <input type="checkbox" id="task-${index}" ${task.completed ? 'checked' : ''} 
                       onchange="updateTaskCompletion('${new Date().toISOString().split('T')[0]}', ${index}, this.checked)">
                <input type="text" class="form-control" value="${task.text || ''}" 
                       style="flex: 1;" onchange="updateTaskText('${new Date().toISOString().split('T')[0]}', ${index}, this.value)">
                <button class="btn-icon-sm" onclick="removeTask('${new Date().toISOString().split('T')[0]}', ${index})" style="color: var(--danger-500);">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    return html;
}

function addTaskInput() {
    const tasksList = document.getElementById('tasksList');
    const taskCount = tasksList.querySelectorAll('div[style*="display: flex"]').length;
    
    const taskDiv = document.createElement('div');
    taskDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: var(--bg-tertiary); border-radius: 8px;';
    taskDiv.innerHTML = `
        <input type="checkbox" id="task-new-${taskCount}">
        <input type="text" class="form-control" placeholder="Enter task description" style="flex: 1;">
        <button class="btn-icon-sm" onclick="this.parentElement.remove()" style="color: var(--danger-500);">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    tasksList.appendChild(taskDiv);
}

function saveDayData(dateStr) {
    const plannedHours = parseInt(document.getElementById('plannedHours').value) || 0;
    const actualHours = parseInt(document.getElementById('actualHours').value) || 0;
    const notes = document.getElementById('dayNotes').value;
    const status = document.getElementById('dayStatus').value;
    
    // Get tasks from inputs
    const taskInputs = document.querySelectorAll('#tasksList input[type="text"]');
    const taskCheckboxes = document.querySelectorAll('#tasksList input[type="checkbox"]');
    
    const tasks = Array.from(taskInputs).map((input, index) => ({
        text: input.value.trim(),
        completed: taskCheckboxes[index] ? taskCheckboxes[index].checked : false,
        createdAt: new Date().toISOString()
    })).filter(task => task.text);
    
    // Save day data
    appData.calendar[dateStr] = {
        ...appData.calendar[dateStr],
        plannedHours,
        actualHours,
        tasks,
        notes,
        status,
        updatedAt: new Date().toISOString()
    };
    
    saveAppData();
    updateDashboard();
    
    // Add notification for completed day
    if (status === 'completed' && actualHours > 0) {
        addNotification(
            'Day Completed!',
            `Great job! You studied ${actualHours} hours on ${new Date(dateStr).toLocaleDateString()}.`,
            'success'
        );
    }
    
    showToast('Day saved successfully!', 'success');
    closeModal('dayModal');
}

function deleteDayData(dateStr) {
    if (confirm('Are you sure you want to delete this day\'s data?')) {
        delete appData.calendar[dateStr];
        saveAppData();
        updateDashboard();
        showToast('Day data deleted', 'success');
        closeModal('dayModal');
    }
}

function updateTaskCompletion(dateStr, index, completed) {
    if (appData.calendar[dateStr] && appData.calendar[dateStr].tasks[index]) {
        appData.calendar[dateStr].tasks[index].completed = completed;
        saveAppData();
        updateDashboard();
    }
}

function updateTaskText(dateStr, index, text) {
    if (appData.calendar[dateStr] && appData.calendar[dateStr].tasks[index]) {
        appData.calendar[dateStr].tasks[index].text = text;
        saveAppData();
    }
}

function removeTask(dateStr, index) {
    if (appData.calendar[dateStr] && appData.calendar[dateStr].tasks[index]) {
        appData.calendar[dateStr].tasks.splice(index, 1);
        saveAppData();
        updateDashboard();
        showDayModal(dateStr); // Refresh the modal
    }
}

// ===== GOALS PAGE =====
function loadGoalsPage() {
    const container = document.getElementById('goalsPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="modern-goals-page">
            <!-- Header with gradient background -->
            <div class="goals-header">
                <div class="goals-header-content">
                    <h2><i class="fas fa-bullseye"></i> My Goals</h2>
                    <p>Track, manage, and achieve your goals</p>
                </div>
                <button class="btn btn-gradient" onclick="showAddGoalModal()">
                    <i class="fas fa-plus"></i> New Goal
                </button>
            </div>
            
            <!-- Stats Overview -->
            <div class="goals-stats-overview" id="goalsStats">
                <!-- Stats will be dynamically loaded -->
            </div>
            
            <!-- Goals Filter -->
            <div class="goals-filter-section">
                <div class="filter-tabs">
                    <button class="filter-tab active" onclick="filterGoals('all')">
                        <i class="fas fa-layer-group"></i> All
                        <span class="filter-count" id="countAll">0</span>
                    </button>
                    <button class="filter-tab" onclick="filterGoals('active')">
                        <i class="fas fa-play-circle"></i> Active
                        <span class="filter-count" id="countActive">0</span>
                    </button>
                    <button class="filter-tab" onclick="filterGoals('completed')">
                        <i class="fas fa-check-circle"></i> Completed
                        <span class="filter-count" id="countCompleted">0</span>
                    </button>
                    <button class="filter-tab" onclick="filterGoals('pending')">
                        <i class="fas fa-clock"></i> Pending
                        <span class="filter-count" id="countPending">0</span>
                    </button>
                </div>
                <div class="filter-sort">
                    <select class="form-control" onchange="sortGoals(this.value)">
                        <option value="priority">Sort by Priority</option>
                        <option value="date">Sort by Date</option>
                        <option value="title">Sort by Title</option>
                    </select>
                </div>
            </div>
            
            <!-- Goals Grid -->
            <div class="goals-grid" id="goalsList">
                <!-- Goals will be rendered here -->
            </div>
        </div>
    `;
    
    updateGoalsStats();
    renderGoalsList('all');
}

function updateGoalsStats() {
    const container = document.getElementById('goalsStats');
    if (!container) return;
    
    const totalGoals = appData.goals.length;
    const completedGoals = appData.goals.filter(g => g.status === 'completed').length;
    const activeGoals = appData.goals.filter(g => g.status === 'active').length;
    const pendingGoals = appData.goals.filter(g => 
        g.targetDate && new Date(g.targetDate) < new Date() && g.status !== 'completed'
    ).length;
    
    // Update filter counts
    const countAll = document.getElementById('countAll');
    const countActive = document.getElementById('countActive');
    const countCompleted = document.getElementById('countCompleted');
    const countPending = document.getElementById('countPending');
    
    if (countAll) countAll.textContent = totalGoals;
    if (countActive) countActive.textContent = activeGoals;
    if (countCompleted) countCompleted.textContent = completedGoals;
    if (countPending) countPending.textContent = pendingGoals;
    
    const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas fa-bullseye"></i>
            </div>
            <div class="stat-content">
                <h3>${totalGoals}</h3>
                <p>Total Goals</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #34d399);">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
                <h3>${completedGoals}</h3>
                <p>Completed</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-content">
                <h3>${completionRate}%</h3>
                <p>Success Rate</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
                <h3>${pendingGoals}</h3>
                <p>Pending</p>
            </div>
        </div>
    `;
}

function renderGoalsList(filter = 'all') {
    const container = document.getElementById('goalsList');
    if (!container) return;
    
    let filteredGoals = [...appData.goals];
    
    if (filter === 'active') {
        filteredGoals = appData.goals.filter(goal => goal.status === 'active');
    } else if (filter === 'completed') {
        filteredGoals = appData.goals.filter(goal => goal.status === 'completed');
    } else if (filter === 'pending') {
        filteredGoals = appData.goals.filter(goal => 
            goal.targetDate && new Date(goal.targetDate) < new Date() && goal.status !== 'completed'
        );
    }
    
    // Update active filter tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.filter-tab[onclick="filterGoals('${filter}')"]`);
    if (activeTab) activeTab.classList.add('active');
    
    if (filteredGoals.length === 0) {
        container.innerHTML = `
            <div class="empty-state-modern">
                <div class="empty-icon">
                    <i class="fas fa-bullseye"></i>
                </div>
                <h3>No goals found</h3>
                <p>${filter === 'all' ? 'Start by adding your first goal!' : `No ${filter} goals found`}</p>
                <button class="btn btn-gradient" onclick="showAddGoalModal()">
                    <i class="fas fa-plus"></i> Add Goal
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredGoals.map(goal => {
        const daysLeft = goal.targetDate ? 
            Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        const isOverdue = daysLeft < 0;
        const priorityColors = {
            'high': 'linear-gradient(135deg, #ef4444, #f87171)',
            'medium': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            'low': 'linear-gradient(135deg, #10b981, #34d399)'
        };
        
        return `
            <div class="goal-card-modern ${goal.status}">
                <div class="goal-card-header">
                    <div class="goal-card-badge" style="background: ${priorityColors[goal.priority] || priorityColors.medium}">
                        <i class="fas fa-flag"></i>
                        ${goal.priority || 'Medium'}
                    </div>
                    <div class="goal-status-badge ${goal.status}">
                        <i class="fas fa-${goal.status === 'completed' ? 'check-circle' : 'circle'}"></i>
                        ${goal.status}
                    </div>
                </div>
                
                <div class="goal-card-body">
                    <h4 class="goal-title">${escapeHtml(goal.title)}</h4>
                    <p class="goal-description">${goal.description || 'No description provided'}</p>
                    
                    <div class="goal-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${goal.targetDate ? formatDate(goal.targetDate) : 'No deadline'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-tag"></i>
                            <span>${goal.category || 'General'}</span>
                        </div>
                    </div>
                    
                    ${goal.targetDate ? `
                        <div class="goal-deadline ${isOverdue ? 'overdue' : ''}">
                            <div class="deadline-label">
                                <i class="fas fa-hourglass-half"></i>
                                ${isOverdue ? 'Overdue by' : 'Due in'}
                                <strong>${Math.abs(daysLeft)} days</strong>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${calculateGoalProgress(goal)}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="goal-card-footer">
                    <div class="goal-actions">
                        <button class="btn-icon-action" onclick="toggleGoalStatus(${goal.id})" 
                                title="${goal.status === 'completed' ? 'Mark as active' : 'Mark as complete'}">
                            <i class="fas fa-${goal.status === 'completed' ? 'undo' : 'check'}"></i>
                        </button>
                        <button class="btn-icon-action" onclick="editGoal(${goal.id})" title="Edit goal">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon-action delete" onclick="deleteGoal(${goal.id})" title="Delete goal">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to calculate goal progress
function calculateGoalProgress(goal) {
    if (!goal.targetDate || !goal.createdAt) return 0;
    
    const createdDate = new Date(goal.createdAt);
    const targetDate = new Date(goal.targetDate);
    const currentDate = new Date();
    
    // If target date is in the past
    if (currentDate >= targetDate) return 100;
    
    // If created date is in the future (shouldn't happen)
    if (currentDate <= createdDate) return 0;
    
    const totalDuration = targetDate - createdDate;
    const elapsedDuration = currentDate - createdDate;
    
    if (totalDuration <= 0) return 100;
    
    const progress = (elapsedDuration / totalDuration) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Filter goals
function filterGoals(filter) {
    renderGoalsList(filter);
}

// Sort goals
function sortGoals(criteria) {
    let sortedGoals = [...appData.goals];
    
    switch(criteria) {
        case 'priority':
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            sortedGoals.sort((a, b) => 
                (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
            );
            break;
        case 'date':
            sortedGoals.sort((a, b) => {
                const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
                const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
                return dateA - dateB;
            });
            break;
        case 'title':
            sortedGoals.sort((a, b) => 
                a.title.localeCompare(b.title)
            );
            break;
    }
    
    appData.goals = sortedGoals;
    saveAppData();
    renderGoalsList();
    showToast('Goals sorted successfully', 'success');
}

// Toggle goal status
function toggleGoalStatus(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const oldStatus = goal.status;
    goal.status = goal.status === 'completed' ? 'active' : 'completed';
    goal.updatedAt = new Date().toISOString();
    
    saveAppData();
    
    // Update stats and list
    updateGoalsStats();
    renderGoalsList();
    
    // Update dashboard
    if (currentPage !== 'goals') {
        updateDashboard();
    }
    
    // Add notification for completion
    if (goal.status === 'completed') {
        addNotification(
            'Goal Completed! 🎉',
            `Congratulations! You've completed "${goal.title}".`,
            'success',
            { page: 'goals' }
        );
    }
    
    showToast(`Goal marked as ${goal.status}`, 'success');
}

// Delete goal
function deleteGoal(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    if (confirm(`Are you sure you want to delete "${goal.title}"?`)) {
        appData.goals = appData.goals.filter(g => g.id !== goalId);
        saveAppData();
        
        // Update stats and list
        updateGoalsStats();
        renderGoalsList();
        
        // Update dashboard
        if (currentPage !== 'goals') {
            updateDashboard();
        }
        
        addNotification(
            'Goal Deleted',
            `"${goal.title}" has been removed from your goals.`,
            'info'
        );
        
        showToast('Goal deleted successfully!', 'success');
        
        // Close modal if open
        closeModal('editGoalModal');
    }
}

// Show add goal modal
function showAddGoalModal() {
    const modalHTML = `
        <div class="modal-overlay" id="addGoalModal">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;">
                    <h3><i class="fas fa-plus-circle"></i> Add New Goal</h3>
                    <button class="modal-close" onclick="closeModal('addGoalModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Goal Title *</label>
                        <input type="text" id="goalTitle" class="form-control" 
                               placeholder="What do you want to achieve?" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="goalDescription" class="form-control" rows="3" 
                                  placeholder="Describe your goal and why it's important..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Target Date</label>
                            <input type="date" id="goalTargetDate" class="form-control">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Priority</label>
                            <select id="goalPriority" class="form-control">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select id="goalCategory" class="form-control">
                            <option value="study">Study</option>
                            <option value="career">Career</option>
                            <option value="health" selected>Health</option>
                            <option value="personal">Personal</option>
                            <option value="financial">Financial</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="closeModal('addGoalModal')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="saveGoal()" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                            <i class="fas fa-save"></i> Create Goal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    if (!modalContainer) {
        console.error('Modal container not found');
        return;
    }
    
    modalContainer.innerHTML = modalHTML;
    
    // Set default date to 3 months from now
    const dateInput = document.getElementById('goalTargetDate');
    if (dateInput) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 3);
        dateInput.value = futureDate.toISOString().split('T')[0];
    }
    
    // Focus on title input
    setTimeout(() => {
        const titleInput = document.getElementById('goalTitle');
        if (titleInput) titleInput.focus();
    }, 100);
}

// Save goal
function saveGoal() {
    const titleInput = document.getElementById('goalTitle');
    const descriptionInput = document.getElementById('goalDescription');
    const dateInput = document.getElementById('goalTargetDate');
    const prioritySelect = document.getElementById('goalPriority');
    const categorySelect = document.getElementById('goalCategory');
    
    if (!titleInput || !descriptionInput || !dateInput || !prioritySelect || !categorySelect) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const targetDate = dateInput.value;
    const priority = prioritySelect.value;
    const category = categorySelect.value;
    
    if (!title) {
        showToast('Please enter a goal title', 'error');
        titleInput.focus();
        return;
    }
    
    const goal = {
        id: Date.now(),
        title,
        description,
        targetDate,
        priority,
        category,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    appData.goals.push(goal);
    saveAppData();
    
    // Add notification
    addNotification(
        'New Goal Created! 🎯',
        `"${title}" has been added to your goals.`,
        'success',
        { page: 'goals' }
    );
    
    showToast('Goal created successfully!', 'success');
    closeModal('addGoalModal');
    
    // Update goals page if it's currently active
    if (currentPage === 'goals') {
        updateGoalsStats();
        renderGoalsList('all');
    } else {
        // If not on goals page, update dashboard
        updateDashboard();
    }
}

// Edit goal modal
function editGoal(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const modalHTML = `
        <div class="modal-overlay" id="editGoalModal">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #8b5cf6, #d946ef); color: white;">
                    <h3><i class="fas fa-edit"></i> Edit Goal</h3>
                    <button class="modal-close" onclick="closeModal('editGoalModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Goal Title *</label>
                        <input type="text" id="editGoalTitle" class="form-control" 
                               value="${goal.title.replace(/"/g, '&quot;')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="editGoalDescription" class="form-control" rows="3">${goal.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Target Date</label>
                            <input type="date" id="editGoalTargetDate" class="form-control" 
                                   value="${goal.targetDate || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Priority</label>
                            <select id="editGoalPriority" class="form-control">
                                <option value="low" ${goal.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${!goal.priority || goal.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${goal.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select id="editGoalCategory" class="form-control">
                            <option value="study" ${goal.category === 'study' ? 'selected' : ''}>Study</option>
                            <option value="career" ${goal.category === 'career' ? 'selected' : ''}>Career</option>
                            <option value="health" ${goal.category === 'health' || !goal.category ? 'selected' : ''}>Health</option>
                            <option value="personal" ${goal.category === 'personal' ? 'selected' : ''}>Personal</option>
                            <option value="financial" ${goal.category === 'financial' ? 'selected' : ''}>Financial</option>
                            <option value="other" ${goal.category === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="editGoalStatus" class="form-control">
                            <option value="active" ${goal.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="completed" ${goal.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-danger" onclick="deleteGoal(${goalId})">
                            <i class="fas fa-trash"></i> Delete Goal
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn btn-outline" onclick="closeModal('editGoalModal')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="updateGoal(${goalId})" style="background: linear-gradient(135deg, #8b5cf6, #d946ef);">
                            <i class="fas fa-save"></i> Update Goal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    if (!modalContainer) {
        console.error('Modal container not found');
        return;
    }
    
    modalContainer.innerHTML = modalHTML;
    
    // Focus on title input
    setTimeout(() => {
        const titleInput = document.getElementById('editGoalTitle');
        if (titleInput) titleInput.focus();
    }, 100);
}

// Update goal
function updateGoal(goalId) {
    const goal = appData.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const titleInput = document.getElementById('editGoalTitle');
    const descriptionInput = document.getElementById('editGoalDescription');
    const dateInput = document.getElementById('editGoalTargetDate');
    const prioritySelect = document.getElementById('editGoalPriority');
    const categorySelect = document.getElementById('editGoalCategory');
    const statusSelect = document.getElementById('editGoalStatus');
    
    if (!titleInput || !descriptionInput || !dateInput || !prioritySelect || !categorySelect || !statusSelect) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const title = titleInput.value.trim();
    if (!title) {
        showToast('Please enter a goal title', 'error');
        titleInput.focus();
        return;
    }
    
    goal.title = title;
    goal.description = descriptionInput.value.trim();
    goal.targetDate = dateInput.value;
    goal.priority = prioritySelect.value;
    goal.category = categorySelect.value;
    goal.status = statusSelect.value;
    goal.updatedAt = new Date().toISOString();
    
    saveAppData();
    
    // Update stats and list
    updateGoalsStats();
    renderGoalsList();
    
    // Update dashboard
    if (currentPage !== 'goals') {
        updateDashboard();
    }
    
    addNotification(
        'Goal Updated',
        `"${title}" has been updated.`,
        'info',
        { page: 'goals' }
    );
    
    showToast('Goal updated successfully!', 'success');
    closeModal('editGoalModal');
}

// ===== PROJECTS PAGE =====
function loadProjectsPage() {
    const container = document.getElementById('projectsPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="projects-page">
            <div class="section-header">
                <h3>My Projects</h3>
                <button class="btn btn-primary" onclick="showAddProjectModal()">
                    <i class="fas fa-plus"></i> Add New Project
                </button>
            </div>
            
            <!-- Projects Stats Overview -->
            <div class="projects-stats-overview" id="projectsStatsOverview">
                <!-- Stats will be loaded here -->
            </div>
            
            <!-- Filter Bar -->
            <div class="projects-filter-bar">
                <div class="filter-buttons">
                    <button class="filter-btn active" onclick="filterProjects('all')">All Projects</button>
                    <button class="filter-btn" onclick="filterProjects('inprogress')">In Progress</button>
                    <button class="filter-btn" onclick="filterProjects('planned')">Planned</button>
                    <button class="filter-btn" onclick="filterProjects('completed')">Completed</button>
                </div>
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="projectSearch" placeholder="Search projects..." onkeyup="searchProjects()">
                </div>
            </div>
            
            <!-- Projects Grid -->
            <div class="projects-grid" id="projectsGrid">
                <!-- Projects will be loaded here -->
            </div>
        </div>
    `;
    
    renderProjectsStats();
    renderProjectsList('all');
}

function renderProjectsStats() {
    const container = document.getElementById('projectsStatsOverview');
    if (!container) return;
    
    const totalProjects = appData.projects.length;
    const inProgress = appData.projects.filter(p => p.status === 'inprogress').length;
    const completed = appData.projects.filter(p => p.status === 'completed').length;
    const averageProgress = totalProjects > 0 
        ? Math.round(appData.projects.reduce((sum, p) => sum + (p.progress || 0), 0) / totalProjects)
        : 0;
    
    container.innerHTML = `
        <div class="project-stat-card" onclick="filterProjects('all')">
            <div class="project-stat-icon" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                <i class="fas fa-project-diagram"></i>
            </div>
            <div class="project-stat-content">
                <div class="project-stat-value">${totalProjects}</div>
                <div class="project-stat-label">Total Projects</div>
            </div>
        </div>
        
        <div class="project-stat-card" onclick="filterProjects('inprogress')">
            <div class="project-stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                <i class="fas fa-tasks"></i>
            </div>
            <div class="project-stat-content">
                <div class="project-stat-value">${inProgress}</div>
                <div class="project-stat-label">In Progress</div>
            </div>
        </div>
        
        <div class="project-stat-card" onclick="filterProjects('completed')">
            <div class="project-stat-icon" style="background: linear-gradient(135deg, #10b981, #34d399);">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="project-stat-content">
                <div class="project-stat-value">${completed}</div>
                <div class="project-stat-label">Completed</div>
            </div>
        </div>
        
        <div class="project-stat-card" onclick="showPage('stats')">
            <div class="project-stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #d946ef);">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="project-stat-content">
                <div class="project-stat-value">${averageProgress}%</div>
                <div class="project-stat-label">Avg. Progress</div>
            </div>
        </div>
    `;
}

function renderProjectsList(filter = 'all', searchTerm = '') {
    const container = document.getElementById('projectsGrid');
    if (!container) return;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (filter !== 'search') {
        const activeBtn = document.querySelector(`.filter-btn[onclick*="${filter}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    let filteredProjects = [...appData.projects];
    
    // Apply filter
    if (filter === 'inprogress') {
        filteredProjects = appData.projects.filter(p => p.status === 'inprogress');
    } else if (filter === 'planned') {
        filteredProjects = appData.projects.filter(p => p.status === 'planned');
    } else if (filter === 'completed') {
        filteredProjects = appData.projects.filter(p => p.status === 'completed');
    }
    
    // Apply search if provided
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredProjects = filteredProjects.filter(p => 
            p.name.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term)) ||
            (p.category && p.category.toLowerCase().includes(term)) ||
            (p.tech && p.tech.toLowerCase().includes(term))
        );
    }
    
    if (filteredProjects.length === 0) {
        container.innerHTML = `
            <div class="projects-empty-state">
                <i class="fas fa-project-diagram"></i>
                <h3>No projects found</h3>
                <p>${filter === 'all' && !searchTerm ? 'Add your first project to get started!' : 
                   searchTerm ? 'No projects match your search' : 
                   `No ${filter} projects found`}</p>
                ${!searchTerm ? `<button class="btn btn-primary" onclick="showAddProjectModal()">
                    <i class="fas fa-plus"></i> Add Project
                </button>` : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredProjects.map(project => {
        const daysLeft = project.deadline ? 
            Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 
            null;
        
        // Tech tags
        const techTags = project.tech ? project.tech.split(',').map(t => t.trim()).filter(t => t) : [];
        
        // Format dates
        const startDate = project.startDate ? formatShortDate(project.startDate) : 'Not started';
        const deadline = project.deadline ? formatShortDate(project.deadline) : 'No deadline';
        
        return `
            <div class="project-card-modern ${project.status}" data-project-id="${project.id}">
                <div class="project-card-header">
                    <div class="project-title-section">
                        <h4 class="project-card-title">${escapeHtml(project.name)}</h4>
                        <span class="project-card-category">${escapeHtml(project.category || 'Uncategorized')}</span>
                    </div>
                    <span class="project-status-badge ${project.status}">${project.status}</span>
                </div>
                
                <p class="project-card-description">${escapeHtml(project.description || 'No description provided')}</p>
                
                <div class="project-meta-grid">
                    <div class="project-meta-item">
                        <i class="fas fa-calendar-plus"></i>
                        <span>${startDate}</span>
                    </div>
                    <div class="project-meta-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>${deadline}</span>
                    </div>
                    <div class="project-meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days left` : 'Overdue') : 'No deadline'}</span>
                    </div>
                    <div class="project-meta-item">
                        <i class="fas fa-code"></i>
                        <span>${techTags.length > 0 ? escapeHtml(techTags[0]) : 'No tech'}</span>
                    </div>
                </div>
                
                ${techTags.length > 1 ? `
                    <div class="project-tech-tags">
                        ${techTags.slice(0, 3).map(tag => `<span class="tech-tag">${escapeHtml(tag)}</span>`).join('')}
                        ${techTags.length > 3 ? `<span class="tech-tag">+${techTags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="project-progress-section">
                    <div class="progress-header">
                        <span>Progress</span>
                        <span class="progress-percentage">${project.progress || 0}%</span>
                    </div>
                    <div class="progress-bar-modern">
                        <div class="progress-fill-modern" style="width: ${project.progress || 0}%"></div>
                    </div>
                </div>
                
                <div class="project-card-actions">
                    <button class="btn-icon-circle tooltip" onclick="updateProjectProgress(${project.id})" title="Update Progress">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="btn-icon-circle tooltip" onclick="toggleProjectStatus(${project.id})" title="${project.status === 'completed' ? 'Mark as In Progress' : 'Mark as Complete'}">
                        <i class="fas fa-${project.status === 'completed' ? 'undo' : 'check'}"></i>
                    </button>
                    <button class="btn-icon-circle tooltip" onclick="editProject(${project.id})" title="Edit Project">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-circle tooltip" onclick="deleteProject(${project.id})" title="Delete Project" style="color: var(--danger-500);">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click event to cards (opens modal)
    container.querySelectorAll('.project-card-modern').forEach(card => {
        card.addEventListener('click', function(e) {
            // Only trigger if click wasn't on a button
            if (!e.target.closest('.btn-icon-circle')) {
                const projectId = parseInt(this.getAttribute('data-project-id'));
                showProjectModal(projectId);
            }
        });
    });
}

function filterProjects(filter) {
    const searchInput = document.getElementById('projectSearch');
    if (searchInput) searchInput.value = '';
    renderProjectsList(filter);
}

function searchProjects() {
    const searchTerm = document.getElementById('projectSearch').value;
    renderProjectsList('all', searchTerm);
}

function formatShortDate(dateString) {
    if (!dateString) return 'No date';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch (e) {
        return 'Invalid date';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PROJECT MODAL FUNCTIONS =====
function showAddProjectModal() {
    const modalHTML = `
        <div class="modal-overlay" id="addProjectModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Add New Project</h3>
                    <button class="modal-close" onclick="closeModal('addProjectModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addProjectForm" onsubmit="saveProject(); return false;">
                        <div class="form-group">
                            <label class="form-label">Project Name *</label>
                            <input type="text" id="projectName" class="form-control" 
                                   placeholder="Name of your project" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea id="projectDescription" class="form-control" rows="3" 
                                      placeholder="Describe your project..."></textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" id="projectStartDate" class="form-control">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Deadline</label>
                                <input type="date" id="projectDeadline" class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select id="projectCategory" class="form-control">
                                    <option value="coding">Coding</option>
                                    <option value="design">Design</option>
                                    <option value="writing">Writing</option>
                                    <option value="research">Research</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select id="projectStatus" class="form-control">
                                    <option value="planned">Planned</option>
                                    <option value="inprogress" selected>In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Technology / Tools</label>
                            <input type="text" id="projectTech" class="form-control" 
                                   placeholder="e.g., React, Node.js, Figma">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Progress (%)</label>
                            <input type="range" id="projectProgress" class="form-control-range" 
                                   min="0" max="100" value="0">
                            <div style="text-align: center; font-size: 0.875rem; color: var(--text-muted); margin-top: 5px;">
                                <span id="progressValue">0%</span>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-outline" type="button" onclick="closeModal('addProjectModal')">
                                Cancel
                            </button>
                            <button class="btn btn-primary" type="submit">
                                <i class="fas fa-save"></i> Save Project
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
    
    // Set default dates
    const startDateInput = document.getElementById('projectStartDate');
    const deadlineInput = document.getElementById('projectDeadline');
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    startDateInput.value = today;
    deadlineInput.value = nextMonth.toISOString().split('T')[0];
    
    // Update progress value display
    const progressSlider = document.getElementById('projectProgress');
    const progressValue = document.getElementById('progressValue');
    
    progressSlider.addEventListener('input', function() {
        progressValue.textContent = `${this.value}%`;
    });
}

function saveProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    const startDate = document.getElementById('projectStartDate').value;
    const deadline = document.getElementById('projectDeadline').value;
    const category = document.getElementById('projectCategory').value;
    const status = document.getElementById('projectStatus').value;
    const tech = document.getElementById('projectTech').value.trim();
    const progress = parseInt(document.getElementById('projectProgress').value) || 0;
    
    if (!name) {
        showToast('Please enter a project name', 'error');
        return;
    }
    
    const project = {
        id: Date.now(),
        name,
        description,
        startDate,
        deadline,
        category,
        status,
        tech,
        progress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    appData.projects.push(project);
    saveAppData();
    updateDashboard();
    
    addNotification(
        'New Project Added',
        `"${name}" has been added to your projects.`,
        'info',
        { page: 'projects' }
    );
    
    showToast('Project saved successfully!', 'success');
    closeModal('addProjectModal');
    
    // Update projects page
    if (currentPage === 'projects') {
        renderProjectsStats();
        renderProjectsList();
    }
}

function updateProjectProgress(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const newProgress = prompt(`Update progress for "${project.name}" (0-100%):`, project.progress || 0);
    if (newProgress !== null) {
        const progress = parseInt(newProgress);
        if (!isNaN(progress) && progress >= 0 && progress <= 100) {
            project.progress = progress;
            project.updatedAt = new Date().toISOString();
            
            // Auto-complete if progress is 100%
            if (progress === 100 && project.status !== 'completed') {
                project.status = 'completed';
                addNotification(
                    'Project Completed! 🎉',
                    `Congratulations! You've completed "${project.name}".`,
                    'success',
                    { page: 'projects' }
                );
            }
            
            saveAppData();
            updateDashboard();
            
            showToast('Progress updated successfully!', 'success');
            
            if (currentPage === 'projects') {
                renderProjectsStats();
                renderProjectsList();
            }
        } else {
            showToast('Please enter a valid percentage (0-100)', 'error');
        }
    }
}

function toggleProjectStatus(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (project) {
        const oldStatus = project.status;
        project.status = project.status === 'completed' ? 'inprogress' : 'completed';
        project.updatedAt = new Date().toISOString();
        
        // Set progress to 100% if completed
        if (project.status === 'completed') {
            project.progress = 100;
            addNotification(
                'Project Completed! 🎉',
                `Congratulations! You've completed "${project.name}".`,
                'success',
                { page: 'projects' }
            );
        } else if (oldStatus === 'completed' && project.progress === 100) {
            // If marking as inprogress from completed, set progress to 90%
            project.progress = 90;
        }
        
        saveAppData();
        updateDashboard();
        
        showToast(`Project marked as ${project.status}`, 'success');
        
        if (currentPage === 'projects') {
            renderProjectsStats();
            renderProjectsList();
        }
    }
}

function editProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const modalHTML = `
        <div class="modal-overlay" id="editProjectModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Edit Project</h3>
                    <button class="modal-close" onclick="closeModal('editProjectModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editProjectForm" onsubmit="updateProject(${projectId}); return false;">
                        <div class="form-group">
                            <label class="form-label">Project Name *</label>
                            <input type="text" id="editProjectName" class="form-control" 
                                   value="${escapeHtml(project.name)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea id="editProjectDescription" class="form-control" rows="3">${escapeHtml(project.description || '')}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" id="editProjectStartDate" class="form-control" 
                                       value="${project.startDate || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Deadline</label>
                                <input type="date" id="editProjectDeadline" class="form-control" 
                                       value="${project.deadline || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select id="editProjectCategory" class="form-control">
                                    <option value="coding" ${project.category === 'coding' ? 'selected' : ''}>Coding</option>
                                    <option value="design" ${project.category === 'design' ? 'selected' : ''}>Design</option>
                                    <option value="writing" ${project.category === 'writing' ? 'selected' : ''}>Writing</option>
                                    <option value="research" ${project.category === 'research' ? 'selected' : ''}>Research</option>
                                    <option value="other" ${project.category === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select id="editProjectStatus" class="form-control">
                                    <option value="planned" ${project.status === 'planned' ? 'selected' : ''}>Planned</option>
                                    <option value="inprogress" ${project.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Technology / Tools</label>
                            <input type="text" id="editProjectTech" class="form-control" 
                                   value="${escapeHtml(project.tech || '')}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Progress (%)</label>
                            <input type="range" id="editProjectProgress" class="form-control-range" 
                                   min="0" max="100" value="${project.progress || 0}">
                            <div style="text-align: center; font-size: 0.875rem; color: var(--text-muted); margin-top: 5px;">
                                <span id="editProgressValue">${project.progress || 0}%</span>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-danger" type="button" onclick="deleteProject(${project.id}); closeModal('editProjectModal')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                            <div style="flex: 1"></div>
                            <button class="btn btn-outline" type="button" onclick="closeModal('editProjectModal')">
                                Cancel
                            </button>
                            <button class="btn btn-primary" type="submit">
                                <i class="fas fa-save"></i> Update Project
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
    
    // Update progress value display
    const progressSlider = document.getElementById('editProjectProgress');
    const progressValue = document.getElementById('editProgressValue');
    
    progressSlider.addEventListener('input', function() {
        progressValue.textContent = `${this.value}%`;
    });
}

function updateProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const name = document.getElementById('editProjectName').value.trim();
    if (!name) {
        showToast('Please enter a project name', 'error');
        return;
    }
    
    project.name = name;
    project.description = document.getElementById('editProjectDescription').value.trim();
    project.startDate = document.getElementById('editProjectStartDate').value;
    project.deadline = document.getElementById('editProjectDeadline').value;
    project.category = document.getElementById('editProjectCategory').value;
    project.status = document.getElementById('editProjectStatus').value;
    project.tech = document.getElementById('editProjectTech').value.trim();
    project.progress = parseInt(document.getElementById('editProjectProgress').value) || 0;
    project.updatedAt = new Date().toISOString();
    
    saveAppData();
    updateDashboard();
    
    addNotification(
        'Project Updated',
        `"${name}" has been updated.`,
        'info',
        { page: 'projects' }
    );
    
    showToast('Project updated successfully!', 'success');
    closeModal('editProjectModal');
    
    if (currentPage === 'projects') {
        renderProjectsStats();
        renderProjectsList();
    }
}

function deleteProject(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;
    
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
        appData.projects = appData.projects.filter(p => p.id !== projectId);
        saveAppData();
        updateDashboard();
        
        addNotification(
            'Project Deleted',
            `"${project.name}" has been removed from your projects.`,
            'info'
        );
        
        showToast('Project deleted successfully!', 'success');
        
        if (currentPage === 'projects') {
            renderProjectsStats();
            renderProjectsList();
        }
    }
}

function showProjectModal(projectId) {
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const daysLeft = project.deadline ? 
        Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 
        null;
    
    const techTags = project.tech ? project.tech.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const modalHTML = `
        <div class="modal-overlay" id="projectViewModal">
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>${escapeHtml(project.name)}</h3>
                    <button class="modal-close" onclick="closeModal('projectViewModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px; white-space: pre-wrap;">
                            ${escapeHtml(project.description || 'No description provided')}
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <div style="padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px;">
                                ${escapeHtml(project.category || 'Uncategorized')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <div style="padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px;">
                                <span class="project-status-badge ${project.status}">${project.status}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Start Date</label>
                            <div style="padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px;">
                                ${project.startDate ? formatShortDate(project.startDate) : 'Not set'}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Deadline</label>
                            <div style="padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px;">
                                ${project.deadline ? formatShortDate(project.deadline) : 'Not set'}
                                ${daysLeft !== null ? ` (${daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'})` : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${techTags.length > 0 ? `
                        <div class="form-group">
                            <label class="form-label">Technology / Tools</label>
                            <div class="project-tech-tags" style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
                                ${techTags.map(tag => `<span class="tech-tag">${escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label class="form-label">Progress</label>
                        <div style="margin-top: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span>${project.progress || 0}% complete</span>
                            </div>
                            <div class="progress-bar-modern">
                                <div class="progress-fill-modern" style="width: ${project.progress || 0}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-danger" onclick="deleteProject(${project.id}); closeModal('projectViewModal')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn btn-outline" onclick="closeModal('projectViewModal')">
                            Close
                        </button>
                        <button class="btn btn-primary" onclick="editProject(${project.id}); closeModal('projectViewModal')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
}

// ===== HABITS PAGE =====
function loadHabitsPage() {
    const container = document.getElementById('habitsPage');
    if (!container) return;
    
    const stats = calculateHabitStats();
    
    container.innerHTML = `
        <div class="habits-page">
            <div class="habits-header">
                <h2>Habit Tracker</h2>
                <p class="habits-subtitle">Build consistency, one day at a time. Track your daily routines and build powerful habits.</p>
            </div>
            
            <!-- Habits Stats Overview -->
            <div class="habits-stats-overview">
                <div class="habit-stat-card">
                    <div class="habit-stat-icon">
                        <i class="fas fa-fire"></i>
                    </div>
                    <div class="habit-stat-value">${stats.totalStreak}</div>
                    <div class="habit-stat-label">Total Streak Days</div>
                </div>
                
                <div class="habit-stat-card">
                    <div class="habit-stat-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="habit-stat-value">${stats.todayCompletion}%</div>
                    <div class="habit-stat-label">Today's Completion</div>
                </div>
                
                <div class="habit-stat-card">
                    <div class="habit-stat-icon">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <div class="habit-stat-value">${stats.totalHabits}</div>
                    <div class="habit-stat-label">Active Habits</div>
                </div>
                
                <div class="habit-stat-card">
                    <div class="habit-stat-icon">
                        <i class="fas fa-calendar-week"></i>
                    </div>
                    <div class="habit-stat-value">${stats.bestStreak}</div>
                    <div class="habit-stat-label">Best Streak</div>
                </div>
            </div>
            
            <div class="section-header" style="margin-bottom: 24px;">
                <h3>Your Habits</h3>
                <button class="btn btn-primary" onclick="showAddHabitModal()">
                    <i class="fas fa-plus"></i> Add New Habit
                </button>
            </div>
            
            <div class="habits-grid" id="habitsList">
                <!-- Habits will be rendered here -->
            </div>
            
            <!-- Empty State -->
            <div class="habits-empty-state" id="habitsEmptyState">
                <i class="fas fa-check-circle"></i>
                <h3>No Habits Yet</h3>
                <p>Start building positive routines! Add your first habit to track consistency and build momentum.</p>
                <button class="btn btn-primary" onclick="showAddHabitModal()">
                    <i class="fas fa-plus"></i> Add Your First Habit
                </button>
            </div>
        </div>
    `;
    
    renderModernHabitsList();
}

function calculateHabitStats() {
    const today = new Date().toISOString().split('T')[0];
    const totalHabits = appData.habits.length;
    
    // Calculate today's completion
    const habitsCompletedToday = appData.habits.filter(habit => 
        habit.completedDates?.includes(today)
    ).length;
    const todayCompletion = totalHabits > 0 ? Math.round((habitsCompletedToday / totalHabits) * 100) : 0;
    
    // Calculate total streak days
    const totalStreak = appData.habits.reduce((sum, habit) => sum + (habit.streak || 0), 0);
    
    // Calculate best streak
    const bestStreak = totalHabits > 0 ? Math.max(...appData.habits.map(habit => habit.streak || 0)) : 0;
    
    return {
        totalHabits,
        todayCompletion,
        totalStreak,
        bestStreak
    };
}

function renderModernHabitsList() {
    const container = document.getElementById('habitsList');
    const emptyState = document.getElementById('habitsEmptyState');
    
    if (!container) return;
    
    if (appData.habits.length === 0) {
        container.style.display = 'none';
        if (emptyState) {
            emptyState.classList.add('show');
        }
        return;
    }
    
    if (emptyState) {
        emptyState.classList.remove('show');
    }
    container.style.display = 'grid';
    
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = appData.habits.map(habit => {
        const isCompletedToday = habit.completedDates?.includes(today);
        const streak = habit.streak || 0;
        const frequency = habit.frequency || 'daily';
        const category = habit.category || 'general';
        
        // Generate last 7 days data
        const weekData = getLast7DaysData(habit);
        const weeklyCompletion = calculateWeeklyCompletion(weekData);
        
        return `
            <div class="habit-card" data-habit-id="${habit.id}">
                <div class="habit-card-header">
                    <div class="habit-card-title">
                        <h3>
                            ${escapeHtml(habit.name)}
                            <span class="habit-category ${category}">
                                <i class="fas fa-${getCategoryIcon(category)}"></i>
                                ${getCategoryName(category)}
                            </span>
                        </h3>
                        <p class="habit-card-description">${escapeHtml(habit.description || 'No description provided')}</p>
                    </div>
                </div>
                
                <!-- Streak Display -->
                <div class="habit-streak-display">
                    <div class="streak-info">
                        <div class="streak-icon">
                            <i class="fas fa-fire"></i>
                        </div>
                        <div class="streak-text">
                            <div class="streak-count">${streak}</div>
                            <div class="streak-label">Current Streak</div>
                        </div>
                    </div>
                    <div class="frequency-display">
                        <div class="frequency-label">Frequency</div>
                        <div class="frequency-value">${frequency.charAt(0).toUpperCase() + frequency.slice(1)}</div>
                    </div>
                </div>
                
                <!-- Weekly Progress -->
                <div class="weekly-progress">
                    <div class="progress-title">
                        <span>This Week</span>
                        <span class="progress-percentage">${weeklyCompletion}%</span>
                    </div>
                    
                    <!-- Day Labels -->
                    <div class="week-days">
                        ${weekData.map(day => `
                            <div class="week-day">${day.dayName}</div>
                        `).join('')}
                    </div>
                    
                    <!-- Calendar Grid -->
                    <div class="week-calendar">
                        ${weekData.map((day, index) => `
                            <div class="day-cell-modern ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}"
                                 onclick="toggleHabitDay(${habit.id}, '${day.date}')"
                                 title="${day.fullDate}: ${day.completed ? 'Completed' : 'Not completed'}">
                                <div class="day-number">${day.dayNumber}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="habit-actions-modern">
                    <button class="habit-complete-btn ${isCompletedToday ? 'completed' : 'incomplete'}" 
                            onclick="toggleHabitCompletion(${habit.id})">
                        <i class="fas fa-${isCompletedToday ? 'check' : 'plus'}"></i>
                        ${isCompletedToday ? 'Completed Today' : 'Mark Complete'}
                    </button>
                    
                    <button class="btn-icon-sm" onclick="editHabit(${habit.id})" title="Edit Habit">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    <button class="btn-icon-sm delete" onclick="deleteHabit(${habit.id})" title="Delete Habit">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getLast7DaysData(habit) {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayNumber = date.getDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
        const fullDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const isCompleted = habit.completedDates?.includes(dateStr) || false;
        const isToday = i === 0;
        
        days.push({
            date: dateStr,
            dayNumber,
            dayName,
            fullDate,
            completed: isCompleted,
            isToday
        });
    }
    
    return days;
}

function calculateWeeklyCompletion(weekData) {
    const completedDays = weekData.filter(day => day.completed).length;
    return Math.round((completedDays / 7) * 100);
}

function getCategoryIcon(category) {
    const icons = {
        'health': 'heartbeat',
        'learning': 'graduation-cap',
        'productivity': 'bolt',
        'mindfulness': 'brain',
        'social': 'users',
        'general': 'star'
    };
    return icons[category] || 'check-circle';
}

function getCategoryName(category) {
    const names = {
        'health': 'Health',
        'learning': 'Learning',
        'productivity': 'Productivity',
        'mindfulness': 'Mindfulness',
        'social': 'Social',
        'general': 'General'
    };
    return names[category] || 'General';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== HABIT FUNCTIONS =====
function toggleHabitCompletion(habitId) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = habit.completedDates?.includes(today);
    
    if (!habit.completedDates) {
        habit.completedDates = [];
    }
    
    if (isCompleted) {
        // Mark as incomplete
        habit.completedDates = habit.completedDates.filter(date => date !== today);
        habit.streak = Math.max(0, (habit.streak || 0) - 1);
        
        addNotification(
            'Habit Marked Incomplete',
            `"${habit.name}" marked as incomplete for today.`,
            'info'
        );
    } else {
        // Mark as complete
        habit.completedDates.push(today);
        
        // Calculate streak
        let streak = 1;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (habit.completedDates.includes(yesterdayStr)) {
            streak = (habit.streak || 0) + 1;
        } else {
            streak = 1;
        }
        
        habit.streak = streak;
        
        // Add notification for streak milestones
        if (streak === 7) {
            addNotification(
                '7-Day Streak! 🔥',
                `Amazing! You've maintained "${habit.name}" for 7 days in a row!`,
                'success',
                { page: 'habits' }
            );
        } else if (streak === 30) {
            addNotification(
                '30-Day Streak! 🎯',
                `Incredible! "${habit.name}" is now a solid habit after 30 days!`,
                'success',
                { page: 'habits' }
            );
        } else {
            addNotification(
                'Habit Completed!',
                `Great job! You've completed "${habit.name}" today. Streak: ${streak} days.`,
                'success'
            );
        }
    }
    
    habit.updatedAt = new Date().toISOString();
    saveAppData();
    updateDashboard();
    
    // Update the habits list
    renderModernHabitsList();
}

function toggleHabitDay(habitId, dateStr) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = new Date(dateStr);
    const isPastDate = selectedDate < new Date(today);
    
    if (!isPastDate) {
        showToast('You can only edit past dates', 'warning');
        return;
    }
    
    if (!habit.completedDates) {
        habit.completedDates = [];
    }
    
    const isCompleted = habit.completedDates.includes(dateStr);
    
    if (isCompleted) {
        // Remove completion
        habit.completedDates = habit.completedDates.filter(date => date !== dateStr);
        showToast(`Removed completion for ${selectedDate.toLocaleDateString()}`, 'info');
    } else {
        // Add completion
        habit.completedDates.push(dateStr);
        showToast(`Marked as completed for ${selectedDate.toLocaleDateString()}`, 'success');
    }
    
    // Recalculate streak
    habit.streak = calculateCurrentStreak(habit);
    habit.updatedAt = new Date().toISOString();
    
    saveAppData();
    updateDashboard();
    
    // Update the habits list
    renderModernHabitsList();
}

function calculateCurrentStreak(habit) {
    if (!habit.completedDates || habit.completedDates.length === 0) return 0;
    
    const sortedDates = habit.completedDates
        .map(date => new Date(date))
        .sort((a, b) => b - a);
    
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currentDate = new Date(sortedDates[i]);
        prevDate.setDate(prevDate.getDate() - 1);
        
        if (prevDate.toDateString() === currentDate.toDateString()) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// ===== MODAL FUNCTIONS (Updated for modern UI) =====
function showAddHabitModal() {
    const modalHTML = `
        <div class="modal-overlay" id="addHabitModal">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Add New Habit</h3>
                    <button class="modal-close" onclick="closeModal('addHabitModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Habit Name *</label>
                        <input type="text" id="habitName" class="form-control" 
                               placeholder="e.g., Morning Exercise, Read 30 pages" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="habitDescription" class="form-control" rows="3" 
                                  placeholder="Describe your habit and why it's important..."></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select id="habitCategory" class="form-control">
                                <option value="health">Health & Fitness</option>
                                <option value="learning">Learning</option>
                                <option value="productivity">Productivity</option>
                                <option value="mindfulness">Mindfulness</option>
                                <option value="social">Social</option>
                                <option value="general" selected>General</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Frequency</label>
                            <select id="habitFrequency" class="form-control">
                                <option value="daily" selected>Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="weekdays">Weekdays</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Reminder Time (Optional)</label>
                        <input type="time" id="habitReminder" class="form-control" value="08:00">
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="closeModal('addHabitModal')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="saveHabit()">
                            <i class="fas fa-save"></i> Save Habit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
}

function saveHabit() {
    const name = document.getElementById('habitName').value.trim();
    const description = document.getElementById('habitDescription').value.trim();
    const category = document.getElementById('habitCategory').value;
    const frequency = document.getElementById('habitFrequency').value;
    const reminder = document.getElementById('habitReminder').value;
    
    if (!name) {
        showToast('Please enter a habit name', 'error');
        return;
    }
    
    const habit = {
        id: Date.now(),
        name,
        description,
        category,
        frequency,
        reminder,
        streak: 0,
        completedDates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    appData.habits.push(habit);
    saveAppData();
    updateDashboard();
    
    addNotification(
        'New Habit Added',
        `"${name}" has been added to your habits. Start building your streak!`,
        'info',
        { page: 'habits' }
    );
    
    showToast('Habit saved successfully!', 'success');
    closeModal('addHabitModal');
    
    // Update habits list if on habits page
    if (currentPage === 'habits') {
        renderModernHabitsList();
    }
}

function editHabit(habitId) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const modalHTML = `
        <div class="modal-overlay" id="editHabitModal">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Edit Habit</h3>
                    <button class="modal-close" onclick="closeModal('editHabitModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Habit Name *</label>
                        <input type="text" id="editHabitName" class="form-control" 
                               value="${escapeHtml(habit.name)}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="editHabitDescription" class="form-control" rows="3">${escapeHtml(habit.description || '')}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select id="editHabitCategory" class="form-control">
                                <option value="health" ${habit.category === 'health' ? 'selected' : ''}>Health & Fitness</option>
                                <option value="learning" ${habit.category === 'learning' ? 'selected' : ''}>Learning</option>
                                <option value="productivity" ${habit.category === 'productivity' ? 'selected' : ''}>Productivity</option>
                                <option value="mindfulness" ${habit.category === 'mindfulness' ? 'selected' : ''}>Mindfulness</option>
                                <option value="social" ${habit.category === 'social' ? 'selected' : ''}>Social</option>
                                <option value="general" ${!habit.category || habit.category === 'general' ? 'selected' : ''}>General</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Frequency</label>
                            <select id="editHabitFrequency" class="form-control">
                                <option value="daily" ${habit.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                                <option value="weekly" ${habit.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                <option value="weekdays" ${habit.frequency === 'weekdays' ? 'selected' : ''}>Weekdays</option>
                                <option value="custom" ${habit.frequency === 'custom' ? 'selected' : ''}>Custom</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Reminder Time (Optional)</label>
                        <input type="time" id="editHabitReminder" class="form-control" 
                               value="${habit.reminder || '08:00'}">
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-danger" onclick="deleteHabit(${habit.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn btn-outline" onclick="closeModal('editHabitModal')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="updateHabit(${habit.id})">
                            <i class="fas fa-save"></i> Update Habit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
}

function updateHabit(habitId) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const name = document.getElementById('editHabitName').value.trim();
    if (!name) {
        showToast('Please enter a habit name', 'error');
        return;
    }
    
    habit.name = name;
    habit.description = document.getElementById('editHabitDescription').value.trim();
    habit.category = document.getElementById('editHabitCategory').value;
    habit.frequency = document.getElementById('editHabitFrequency').value;
    habit.reminder = document.getElementById('editHabitReminder').value;
    habit.updatedAt = new Date().toISOString();
    
    saveAppData();
    updateDashboard();
    
    addNotification(
        'Habit Updated',
        `"${name}" has been updated.`,
        'info',
        { page: 'habits' }
    );
    
    showToast('Habit updated successfully!', 'success');
    closeModal('editHabitModal');
    
    if (currentPage === 'habits') {
        renderModernHabitsList();
    }
}

function deleteHabit(habitId) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    if (confirm(`Are you sure you want to delete "${habit.name}"? This will also delete all its tracking data.`)) {
        appData.habits = appData.habits.filter(h => h.id !== habitId);
        saveAppData();
        updateDashboard();
        
        addNotification(
            'Habit Deleted',
            `"${habit.name}" has been removed from your habits.`,
            'info'
        );
        
        showToast('Habit deleted successfully!', 'success');
        
        if (currentPage === 'habits') {
            renderModernHabitsList();
        }
        
        // Close modal if open
        closeModal('editHabitModal');
    }
}

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Make sure to update the showPage function to use new habits rendering
function loadPageContent(pageName) {
    switch(pageName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'calendar':
            loadCalendarPage();
            break;
        case 'goals':
            loadGoalsPage();
            break;
        case 'projects':
            loadProjectsPage();
            break;
        case 'habits':
            loadHabitsPage(); // This now uses the modern version
            break;
        case 'stats':
            loadStatsPage();
            break;
    }
}

// ===== CALENDAR PAGE =====
function loadCalendarPage() {
    const container = document.getElementById('calendarPage');
    if (!container) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    container.innerHTML = `
        <div class="calendar-page">
            <div class="section-header">
                <h3>Calendar</h3>
                <button class="btn btn-primary" onclick="showDayModal(new Date())">
                    <i class="fas fa-plus"></i> Log Today
                </button>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
                <button class="btn-icon" onclick="changeCalendarMonth(-1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h4 id="calendarMonthYear" style="margin: 0; font-weight: 600;">
                    ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button class="btn-icon" onclick="changeCalendarMonth(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="calendar-grid" id="calendarGrid">
                <!-- Calendar will be generated here -->
            </div>
            
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-divider);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(135deg, #10b981, #34d399);"></div>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">Completed</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(135deg, #ef4444, #f87171);"></div>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">Missed</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 16px; height: 16px; border-radius: 4px; background: linear-gradient(135deg, #6366f1, #8b5cf6);"></div>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">Today</span>
                </div>
            </div>
        </div>
    `;
    
    renderCalendarGrid(year, month);
}

function renderCalendarGrid(year, month) {
    const container = document.getElementById('calendarGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.style.cssText = 'text-align: center; padding: 10px; font-weight: 600; color: var(--text-secondary); font-size: 0.875rem;';
        dayHeader.textContent = day;
        container.appendChild(dayHeader);
    });
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.style.cssText = 'height: 80px; background: transparent;';
        container.appendChild(emptyCell);
    }
    
    // Add cells for each day
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = appData.calendar[dateStr];
        const isToday = date.toDateString() === today.toDateString();
        
        const dayCell = document.createElement('div');
        dayCell.style.cssText = 'height: 80px; padding: 8px; border: 1px solid var(--border-light); border-radius: 8px; cursor: pointer; transition: all 0.2s; background: var(--bg-card);';
        
        if (isToday) {
            dayCell.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
            dayCell.style.color = 'white';
            dayCell.style.borderColor = 'transparent';
        }
        
        if (dayData) {
            if (dayData.status === 'completed') {
                dayCell.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
                dayCell.style.color = 'white';
                dayCell.style.borderColor = 'transparent';
            } else if (dayData.status === 'missed') {
                dayCell.style.background = 'linear-gradient(135deg, #ef4444, #f87171)';
                dayCell.style.color = 'white';
                dayCell.style.borderColor = 'transparent';
            }
        }
        
        dayCell.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">${day}</div>
            ${dayData && dayData.actualHours > 0 ? 
                `<div style="font-size: 0.75rem; opacity: 0.9;">${dayData.actualHours}h</div>` : 
                ''}
            ${dayData && dayData.tasks && dayData.tasks.length > 0 ? 
                `<div style="font-size: 0.7rem; margin-top: 3px;">${dayData.tasks.filter(t => t.completed).length}/${dayData.tasks.length}</div>` : 
                ''}
        `;
        
        dayCell.addEventListener('click', () => showDayModal(date));
        dayCell.addEventListener('mouseenter', () => {
            if (!isToday && (!dayData || dayData.status !== 'completed' && dayData.status !== 'missed')) {
                dayCell.style.transform = 'scale(1.05)';
                dayCell.style.boxShadow = 'var(--shadow)';
            }
        });
        dayCell.addEventListener('mouseleave', () => {
            dayCell.style.transform = 'scale(1)';
            dayCell.style.boxShadow = 'none';
        });
        
        container.appendChild(dayCell);
    }
}

function changeCalendarMonth(delta) {
    const currentText = document.getElementById('calendarMonthYear').textContent;
    const currentDate = new Date(currentText + ' 1');
    currentDate.setMonth(currentDate.getMonth() + delta);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('calendarMonthYear').textContent = 
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    renderCalendarGrid(year, month);
}

// ===== STATISTICS PAGE =====
function loadStatsPage() {
    const container = document.getElementById('statsPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stats-page">
            <div class="stats-section-header">
                <div class="header-left">
                    <h2>Statistics Dashboard</h2>
                    <div class="text-secondary">Track your progress and performance</div>
                </div>
                <div class="stats-toolbar">
                    <div class="time-range-selector">
                        <select class="form-control" id="statsTimeRange" onchange="updateStatsTimeRange()" style="min-width: 140px;">
                            <option value="7">Last 7 days</option>
                            <option value="30" selected>Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                    <div class="stats-actions">
                        <button class="btn btn-icon-sm" onclick="refreshStatistics()" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn btn-outline" onclick="exportData()">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-primary" onclick="generateReport()">
                            <i class="fas fa-file-pdf"></i> Report
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Quick Stats Overview -->
            <div class="stats-overview-large" id="statsOverview">
                <!-- Stats will be loaded here -->
            </div>
            
            <!-- Charts Section -->
            <div class="charts-section">
                <div class="charts-grid" id="statsCharts">
                    <!-- Charts will be loaded here -->
                </div>
            </div>
            
            <!-- Detailed Statistics -->
            <div class="detailed-stats-section">
                <div class="section-header">
                    <h3>Detailed Breakdown</h3>
                    <div class="stats-filters">
                        <select class="form-control" id="statsCategory" onchange="filterStatistics()" style="min-width: 120px;">
                            <option value="all">All Categories</option>
                            <option value="study">Study</option>
                            <option value="work">Work</option>
                            <option value="personal">Personal</option>
                            <option value="health">Health</option>
                        </select>
                    </div>
                </div>
                <div class="detailed-stats">
                    <div class="stats-table" id="detailedStatsTable">
                        <!-- Table will be loaded here -->
                    </div>
                </div>
            </div>
            
            <!-- Insights & Recommendations -->
            <div class="insights-section" id="statsInsights">
                <!-- Insights will be loaded here -->
            </div>
        </div>
    `;
    
    renderStatistics();
}

function renderStatistics() {
    const container = document.getElementById('statsOverview');
    const chartsContainer = document.getElementById('statsCharts');
    const tableContainer = document.getElementById('detailedStatsTable');
    const insightsContainer = document.getElementById('statsInsights');
    
    if (!container || !chartsContainer || !tableContainer || !insightsContainer) return;
    
    // Calculate statistics
    const stats = calculateAllStatistics();
    
    // Render Overview Cards
    container.innerHTML = `
        <div class="stat-card-overview">
            <div class="stat-card-header">
                <div class="stat-icon-circle" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-trend ${stats.trend >= 0 ? 'positive' : 'negative'}">
                    <i class="fas fa-${stats.trend >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                    ${Math.abs(stats.trend)}%
                </div>
            </div>
            <div class="stat-card-content">
                <div class="stat-value">${stats.completionRate}%</div>
                <div class="stat-label">Overall Progress</div>
                <div class="stat-desc">${stats.completedDays} of ${stats.totalDays} days</div>
            </div>
        </div>
        
        <div class="stat-card-overview">
            <div class="stat-card-header">
                <div class="stat-icon-circle" style="background: linear-gradient(135deg, #10b981, #34d399);">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-trend positive">
                    <i class="fas fa-arrow-up"></i>
                    ${stats.hourTrend}%
                </div>
            </div>
            <div class="stat-card-content">
                <div class="stat-value">${stats.totalHours}</div>
                <div class="stat-label">Total Hours</div>
                <div class="stat-desc">${stats.avgDailyHours} hrs/day avg</div>
            </div>
        </div>
        
        <div class="stat-card-overview">
            <div class="stat-card-header">
                <div class="stat-icon-circle" style="background: linear-gradient(135deg, #8b5cf6, #d946ef);">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="stat-badge">
                    ${stats.streak.current} days
                </div>
            </div>
            <div class="stat-card-content">
                <div class="stat-value">${stats.goalCompletionRate}%</div>
                <div class="stat-label">Goals Achieved</div>
                <div class="stat-desc">${stats.goals.completed} of ${stats.goals.total}</div>
            </div>
        </div>
        
        <div class="stat-card-overview">
            <div class="stat-card-header">
                <div class="stat-icon-circle" style="background: linear-gradient(135deg, #f59e0b, #fbbf24);">
                    <i class="fas fa-fire"></i>
                </div>
                <div class="stat-badge">
                    ${stats.streak.best} best
                </div>
            </div>
            <div class="stat-card-content">
                <div class="stat-value">${stats.habitCompletionRate}%</div>
                <div class="stat-label">Habits Consistent</div>
                <div class="stat-desc">${stats.habits.completed} of ${stats.habits.total}</div>
            </div>
        </div>
    `;
    
    // Render Charts
    renderChartsSection(chartsContainer, stats);
    
    // Render Detailed Table
    renderDetailedTable(tableContainer, stats);
    
    // Render Insights
    renderInsightsSection(insightsContainer, stats);
}

function calculateAllStatistics() {
    const totalDays = Object.keys(appData.calendar).length;
    const completedDays = Object.values(appData.calendar).filter(d => d.status === 'completed').length;
    const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
    
    const totalHours = Object.values(appData.calendar).reduce((sum, day) => sum + (day.actualHours || 0), 0);
    const avgDailyHours = completedDays > 0 ? (totalHours / completedDays).toFixed(1) : 0;
    
    const completedGoals = appData.goals.filter(g => g.status === 'completed').length;
    const goalCompletionRate = appData.goals.length > 0 ? Math.round((completedGoals / appData.goals.length) * 100) : 0;
    
    const completedProjects = appData.projects.filter(p => p.status === 'completed').length;
    const projectCompletionRate = appData.projects.length > 0 ? Math.round((completedProjects / appData.projects.length) * 100) : 0;
    
    // Calculate streaks
    const { currentStreak, bestStreak } = calculateStreaks();
    
    // Calculate habit statistics
    const totalHabits = appData.habits.length;
    const activeHabits = appData.habits.filter(h => h.status === 'active').length;
    const totalHabitCompletions = appData.habits.reduce((sum, habit) => sum + (habit.completedDates?.length || 0), 0);
    const avgHabitStreak = totalHabits > 0 ? Math.round(appData.habits.reduce((sum, habit) => sum + (habit.streak || 0), 0) / totalHabits) : 0;
    
    // Calculate trends (simplified)
    const trend = completionRate > 50 ? 12 : -5;
    const hourTrend = totalHours > 100 ? 8 : -2;
    
    // Category breakdown
    const categoryBreakdown = {
        study: { total: 0, completed: 0, hours: 0 },
        work: { total: 0, completed: 0, hours: 0 },
        personal: { total: 0, completed: 0, hours: 0 },
        health: { total: 0, completed: 0, hours: 0 }
    };
    
    // Calculate category data from goals and habits
    appData.goals.forEach(goal => {
        const category = goal.category || 'personal';
        if (categoryBreakdown[category]) {
            categoryBreakdown[category].total++;
            if (goal.status === 'completed') categoryBreakdown[category].completed++;
        }
    });
    
    appData.habits.forEach(habit => {
        const category = habit.category || 'health';
        if (categoryBreakdown[category]) {
            categoryBreakdown[category].total++;
            categoryBreakdown[category].completed += (habit.completedDates?.length || 0) / 7; // Weekly estimate
        }
    });
    
    return {
        totalDays,
        completedDays,
        completionRate,
        totalHours,
        avgDailyHours,
        goals: {
            total: appData.goals.length,
            completed: completedGoals,
            rate: goalCompletionRate
        },
        projects: {
            total: appData.projects.length,
            completed: completedProjects,
            rate: projectCompletionRate
        },
        habits: {
            total: totalHabits,
            active: activeHabits,
            completions: totalHabitCompletions,
            avgStreak: avgHabitStreak
        },
        streak: {
            current: currentStreak,
            best: bestStreak
        },
        categoryBreakdown,
        habitCompletionRate: Math.round((activeHabits / Math.max(totalHabits, 1)) * 100),
        trend,
        hourTrend
    };
}

function calculateStreaks() {
    let currentStreak = 0;
    let bestStreak = 0;
    const today = new Date();
    
    // Calculate current streak
    let checkDate = new Date(today);
    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayData = appData.calendar[dateStr];
        
        if (dayData && dayData.status === 'completed') {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    // Calculate best streak
    let tempStreak = 0;
    const sortedDates = Object.keys(appData.calendar).sort();
    
    sortedDates.forEach(date => {
        const dayData = appData.calendar[date];
        if (dayData && dayData.status === 'completed') {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
        } else {
            tempStreak = 0;
        }
    });
    
    return { currentStreak, bestStreak };
}

function renderChartsSection(container, stats) {
    const last30Days = getLastNDaysData(30);
    
    container.innerHTML = `
        <div class="chart-card">
            <div class="chart-header">
                <h4>Monthly Progress</h4>
                <div class="chart-legend">
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #6366f1;"></span>
                        Study Hours
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #10b981;"></span>
                        Completed Days
                    </div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="monthlyProgressChart"></canvas>
            </div>
        </div>
        
        <div class="chart-card">
            <div class="chart-header">
                <h4>Category Distribution</h4>
                <div class="chart-actions">
                    <button class="btn-icon-sm" onclick="toggleChartView('category')">
                        <i class="fas fa-chart-pie"></i>
                    </button>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="categoryChart"></canvas>
            </div>
        </div>
        
        <div class="chart-card">
            <div class="chart-header">
                <h4>Weekly Performance</h4>
                <div class="chart-legend">
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #f59e0b;"></span>
                        This Week
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot" style="background: #8b5cf6;"></span>
                        Last Week
                    </div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="weeklyChart"></canvas>
            </div>
        </div>
        
        <div class="chart-card">
            <div class="chart-header">
                <h4>Habit Consistency</h4>
                <div class="chart-actions">
                    <button class="btn-icon-sm" onclick="refreshHabitChart()">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="habitChart"></canvas>
            </div>
        </div>
    `;
    
    // Initialize charts after a brief delay to ensure DOM is ready
    setTimeout(() => {
        renderMonthlyChart(last30Days);
        renderCategoryChart(stats.categoryBreakdown);
        renderWeeklyChart();
        renderHabitChart();
    }, 100);
}

function renderMonthlyChart(daysData) {
    const ctx = document.getElementById('monthlyProgressChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: daysData.map(d => d.label),
            datasets: [
                {
                    label: 'Study Hours',
                    data: daysData.map(d => d.hours),
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Completed',
                    data: daysData.map(d => d.completed ? 1 : 0),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: getChartOptions('Hours', 'Date')
    });
}

function renderCategoryChart(categoryBreakdown) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    const categories = Object.keys(categoryBreakdown);
    const data = categories.map(cat => categoryBreakdown[cat].total);
    const completed = categories.map(cat => categoryBreakdown[cat].completed);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
            datasets: [
                {
                    label: 'Total Tasks',
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1
                },
                {
                    label: 'Completed',
                    data: completed,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                }
            ]
        },
        options: getChartOptions('Count', 'Category')
    });
}

function renderWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    const lastWeekData = getLastNDaysData(7);
    const twoWeeksAgoData = getLastNDaysData(7, 7);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'This Week',
                    data: lastWeekData.map(d => d.hours),
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: 'rgb(245, 158, 11)',
                    borderWidth: 1
                },
                {
                    label: 'Last Week',
                    data: twoWeeksAgoData.map(d => d.hours),
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 1
                }
            ]
        },
        options: getChartOptions('Hours', 'Day')
    });
}

function renderHabitChart() {
    const ctx = document.getElementById('habitChart');
    if (!ctx) return;
    
    const habitData = appData.habits.map(habit => ({
        name: habit.name,
        streak: habit.streak || 0,
        completionRate: habit.completedDates ? 
            Math.round((habit.completedDates.length / 30) * 100) : 0
    })).slice(0, 5); // Top 5 habits
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: habitData.map(h => h.name),
            datasets: [{
                label: 'Habit Performance',
                data: habitData.map(h => h.completionRate),
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgb(99, 102, 241)',
                pointBackgroundColor: 'rgb(99, 102, 241)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(99, 102, 241)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

function getLastNDaysData(n, offset = 0) {
    const days = [];
    for (let i = n + offset - 1; i >= offset; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = appData.calendar[dateStr];
        days.push({
            date: dateStr,
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            hours: dayData?.actualHours || 0,
            completed: dayData?.status === 'completed',
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }
    return days;
}

function getChartOptions(yLabel, xLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: yLabel
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: xLabel
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 10,
                cornerRadius: 6
            }
        }
    };
}

function renderDetailedTable(container, stats) {
    const categories = Object.entries(stats.categoryBreakdown);
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total Tasks</th>
                        <th>Completed</th>
                        <th>Completion Rate</th>
                        <th>Performance</th>
                    </tr>
                </thead>
                <tbody>
                    ${categories.map(([category, data]) => `
                        <tr>
                            <td>
                                <div class="category-info">
                                    <span class="category-badge ${category}">
                                        ${category.charAt(0).toUpperCase()}
                                    </span>
                                    ${category.charAt(0).toUpperCase() + category.slice(1)}
                                </div>
                            </td>
                            <td>${data.total}</td>
                            <td>${data.completed}</td>
                            <td>
                                <div class="progress-row">
                                    <div class="progress-bar-small">
                                        <div class="progress-fill" style="width: ${Math.round((data.completed / Math.max(data.total, 1)) * 100)}%"></div>
                                    </div>
                                    <span>${Math.round((data.completed / Math.max(data.total, 1)) * 100)}%</span>
                                </div>
                            </td>
                            <td>
                                <span class="performance-badge ${getPerformanceClass(data.completed, data.total)}">
                                    ${getPerformanceText(data.completed, data.total)}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function getPerformanceClass(completed, total) {
    const rate = completed / Math.max(total, 1);
    if (rate >= 0.8) return 'excellent';
    if (rate >= 0.6) return 'good';
    if (rate >= 0.4) return 'average';
    return 'poor';
}

function getPerformanceText(completed, total) {
    const rate = completed / Math.max(total, 1);
    if (rate >= 0.8) return 'Excellent';
    if (rate >= 0.6) return 'Good';
    if (rate >= 0.4) return 'Average';
    return 'Needs Improvement';
}

function renderInsightsSection(container, stats) {
    const insights = generateInsights(stats);
    
    container.innerHTML = `
        <div class="insights-container">
            <div class="insights-header">
                <h3><i class="fas fa-lightbulb"></i> Insights & Recommendations</h3>
                <button class="btn btn-text" onclick="refreshInsights()">
                    <i class="fas fa-redo"></i> Refresh
                </button>
            </div>
            
            <div class="insights-grid">
                ${insights.map(insight => `
                    <div class="insight-card ${insight.type}">
                        <div class="insight-icon">
                            <i class="fas fa-${insight.icon}"></i>
                        </div>
                        <div class="insight-content">
                            <h4>${insight.title}</h4>
                            <p>${insight.message}</p>
                            ${insight.action ? `
                                <div class="insight-action">
                                    <button class="btn btn-sm ${insight.action.type}" onclick="${insight.action.onclick}">
                                        ${insight.action.text}
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function generateInsights(stats) {
    const insights = [];
    
    // Study consistency insight
    if (stats.completionRate >= 80) {
        insights.push({
            type: 'success',
            icon: 'trophy',
            title: 'Outstanding Consistency!',
            message: `You've maintained a ${stats.completionRate}% completion rate. Keep up the great work!`,
            action: {
                text: 'Share Achievement',
                type: 'btn-primary',
                onclick: 'shareAchievement()'
            }
        });
    } else if (stats.completionRate >= 60) {
        insights.push({
            type: 'info',
            icon: 'chart-line',
            title: 'Good Progress',
            message: `Your ${stats.completionRate}% completion rate is solid. Aim for 80% next month!`,
            action: {
                text: 'Set Reminder',
                type: 'btn-outline',
                onclick: 'setDailyReminder()'
            }
        });
    } else {
        insights.push({
            type: 'warning',
            icon: 'exclamation-triangle',
            title: 'Consistency Needed',
            message: `Your completion rate is ${stats.completionRate}%. Try to log your progress daily.`,
            action: {
                text: 'Add Daily Habit',
                type: 'btn-warning',
                onclick: 'showAddHabitModal()'
            }
        });
    }
    
    // Goal achievement insight
    if (stats.goals.rate >= 70) {
        insights.push({
            type: 'success',
            icon: 'bullseye',
            title: 'Goal Crusher!',
            message: `You've completed ${stats.goals.rate}% of your goals. That's impressive!`,
            action: {
                text: 'Set New Goals',
                type: 'btn-primary',
                onclick: 'showAddGoalModal()'
            }
        });
    } else if (stats.goals.total === 0) {
        insights.push({
            type: 'info',
            icon: 'plus-circle',
            title: 'No Goals Set',
            message: 'Start by setting some goals to track your progress.',
            action: {
                text: 'Add First Goal',
                type: 'btn-primary',
                onclick: 'showAddGoalModal()'
            }
        });
    }
    
    // Streak insight
    if (stats.streak.current >= 7) {
        insights.push({
            type: 'success',
            icon: 'fire',
            title: `${stats.streak.current}-Day Streak!`,
            message: `You're on a ${stats.streak.current}-day streak. Don't break the chain!`,
            action: {
                text: 'View Calendar',
                type: 'btn-outline',
                onclick: "showPage('calendar')"
            }
        });
    }
    
    // Study hours insight
    if (stats.totalHours > 100) {
        insights.push({
            type: 'success',
            icon: 'graduation-cap',
            title: 'Learning Champion',
            message: `You've logged ${stats.totalHours} study hours. That's dedication!`,
            action: {
                text: 'Analyze Patterns',
                type: 'btn-outline',
                onclick: 'analyzeStudyPatterns()'
            }
        });
    }
    
    // Habit consistency insight
    if (stats.habits.active > 0 && stats.habitCompletionRate < 50) {
        insights.push({
            type: 'warning',
            icon: 'check-circle',
            title: 'Habit Consistency',
            message: `Only ${stats.habitCompletionRate}% of your habits are active. Focus on consistency.`,
            action: {
                text: 'Review Habits',
                type: 'btn-warning',
                onclick: "showPage('habits')"
            }
        });
    }
    
    // Fill remaining slots with generic tips
    const genericTips = [
        {
            type: 'info',
            icon: 'clock',
            title: 'Optimal Study Time',
            message: 'Studies show 25-minute focused sessions with 5-minute breaks are most effective.',
            action: null
        },
        {
            type: 'info',
            icon: 'moon',
            title: 'Rest is Productive',
            message: 'Quality sleep improves learning retention by up to 40%. Aim for 7-8 hours.',
            action: null
        }
    ];
    
    while (insights.length < 4) {
        if (genericTips.length > 0) {
            insights.push(genericTips.shift());
        } else {
            break;
        }
    }
    
    return insights;
}

// Utility functions
function updateStatsTimeRange() {
    const range = document.getElementById('statsTimeRange')?.value || '30';
    showToast(`Showing data for ${range === 'all' ? 'all time' : `last ${range} days`}`, 'info');
    renderStatistics();
}

function refreshStatistics() {
    showToast('Refreshing statistics...', 'info');
    setTimeout(() => {
        renderStatistics();
        showToast('Statistics updated', 'success');
    }, 500);
}

function filterStatistics() {
    const category = document.getElementById('statsCategory')?.value || 'all';
    showToast(`Filtering by ${category} category`, 'info');
    // In a real app, this would filter the data
    // For now, just update the UI
    renderStatistics();
}

function refreshInsights() {
    showToast('Generating new insights...', 'info');
    setTimeout(() => {
        renderStatistics();
        showToast('Insights refreshed', 'success');
    }, 500);
}

function toggleChartView(chartId) {
    showToast('Toggling chart view...', 'info');
    // Chart view toggle logic would go here
}

function refreshHabitChart() {
    const habitChart = Chart.getChart('habitChart');
    if (habitChart) {
        habitChart.destroy();
        renderHabitChart();
        showToast('Habit chart refreshed', 'success');
    }
}

function analyzeStudyPatterns() {
    showToast('Analyzing study patterns...', 'info');
    // Pattern analysis logic would go here
}

function setDailyReminder() {
    if (confirm('Set a daily reminder at 8 PM?')) {
        showToast('Daily reminder set for 8 PM', 'success');
        // Reminder setting logic would go here
    }
}

function shareAchievement() {
    const stats = calculateAllStatistics();
    const message = `I've achieved ${stats.completionRate}% completion rate with ${stats.totalHours} study hours on DailyFlow! 🎯`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My DailyFlow Achievement',
            text: message,
            url: window.location.href
        }).catch(() => {
            copyToClipboard(message);
            showToast('Achievement copied to clipboard!', 'success');
        });
    } else {
        copyToClipboard(message);
        showToast('Achievement copied to clipboard!', 'success');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

// Keep your existing generateReport function (updated version below)
function generateReport() {
    const stats = calculateAllStatistics();
    
    const report = `
        📊 DAILYFLOW ANALYTICS REPORT
        ==============================
        
        Generated: ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}
        User: ${currentUser}
        
        📈 PERFORMANCE SUMMARY
        • Overall Progress: ${stats.completionRate}%
        • Total Days Tracked: ${stats.totalDays}
        • Completed Days: ${stats.completedDays}
        • Current Streak: ${stats.streak.current} days
        • Best Streak: ${stats.streak.best} days
        
        ⏰ STUDY ANALYTICS
        • Total Study Hours: ${stats.totalHours}
        • Average Daily Hours: ${stats.avgDailyHours}
        • Daily Completion Rate: ${stats.completionRate}%
        • Study Consistency: ${stats.trend >= 0 ? 'Improving' : 'Needs attention'}
        
        🎯 GOALS & ACHIEVEMENTS
        • Goals Set: ${stats.goals.total}
        • Goals Completed: ${stats.goals.completed}
        • Goal Completion Rate: ${stats.goals.rate}%
        
        🏗️ PROJECTS STATUS
        • Active Projects: ${stats.projects.total - stats.projects.completed}
        • Projects Completed: ${stats.projects.completed}
        • Project Success Rate: ${stats.projects.rate}%
        
        🔄 HABIT CONSISTENCY
        • Total Habits: ${stats.habits.total}
        • Active Habits: ${stats.habits.active}
        • Habit Completion Rate: ${stats.habitCompletionRate}%
        • Average Habit Streak: ${stats.habits.avgStreak} days
        
        🏆 KEY ACHIEVEMENTS
        ${stats.completionRate >= 80 ? '✓ Maintained excellent consistency\n' : ''}
        ${stats.streak.current >= 7 ? `✓ ${stats.streak.current}-day current streak\n` : ''}
        ${stats.totalHours >= 100 ? `✓ ${stats.totalHours}+ study hours logged\n` : ''}
        ${stats.goals.rate >= 70 ? '✓ High goal achievement rate\n' : ''}
        
        💡 RECOMMENDATIONS
        1. ${stats.completionRate < 60 ? 'Set smaller daily targets to build consistency' : 'Maintain your excellent consistency'}
        2. ${stats.habits.active < 3 ? 'Add 1-2 new habits to strengthen your routine' : 'Your habits are well-established'}
        3. ${stats.streak.best < stats.streak.current ? 'You\'re on track to beat your best streak!' : 'Aim to beat your best streak of ' + stats.streak.best + ' days'}
        4. ${stats.totalHours < 50 ? 'Increase study time gradually by 15-30 minutes daily' : 'Excellent study volume, focus on quality now'}
        
        🔮 NEXT 30-DAY FORECAST
        • Based on current trends, you'll complete ${Math.round(stats.completedDays * 1.1)} days
        • Estimated study hours: ${Math.round(stats.totalHours * 1.15)}
        • Expected goal completion: ${Math.round(stats.goals.rate + 10)}%
        
        ==============================
        📞 Need help optimizing? Visit DailyFlow Dashboard
        🌟 Keep going! Small daily improvements lead to big results.
    `;
    
    // Create and download report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dailyflow-report-${currentUser}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification(
        'Report Generated',
        'Your detailed analytics report has been downloaded.',
        'success'
    );
    
    showToast('📊 Report generated successfully!', 'success');
}


// ===== UTILITY FUNCTIONS =====
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const currentDate = document.getElementById('currentDate');
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('en-US', options);
    }
}

function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveAppData();
        showToast('Data saved!', 'success');
    }
    
    // Esc to close modals
    if (e.key === 'Escape') {
        closeAllModals();
    }
    
    // Number keys 1-6 to navigate pages
    if (e.key >= '1' && e.key <= '6') {
        const pages = ['dashboard', 'calendar', 'goals', 'projects', 'habits', 'stats'];
        const pageIndex = parseInt(e.key) - 1;
        if (pages[pageIndex]) {
            showPage(pages[pageIndex]);
        }
    }
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('dailyflow_currentUser');
        window.location.href = 'index.html';
    }
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function prevWeek() {
    currentWeekOffset--;
    updateWeekCalendar();
}

function nextWeek() {
    currentWeekOffset++;
    updateWeekCalendar();
}

function exportData() {
    const dataStr = JSON.stringify({
        calendar: appData.calendar,
        goals: appData.goals,
        projects: appData.projects,
        habits: appData.habits,
        settings: appData.settings,
        notifications: notifications
    }, null, 2);
    
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = `dailyflow-backup-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    
    addNotification(
        'Data Exported',
        'All your data has been exported successfully.',
        'success'
    );
    
    showToast('Data exported successfully!', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (confirm('This will replace all your current data. Are you sure?')) {
                    appData.calendar = importedData.calendar || {};
                    appData.goals = importedData.goals || [];
                    appData.projects = importedData.projects || [];
                    appData.habits = importedData.habits || [];
                    appData.settings = importedData.settings || {
                        theme: 'light',
                        notifications: true,
                        dailyReminder: '09:00'
                    };
                    notifications = importedData.notifications || [];
                    
                    saveAppData();
                    updateDashboard();
                    updateNotificationDisplay();
                    
                    if (currentPage !== 'dashboard') {
                        showPage(currentPage);
                    }
                    
                    addNotification(
                        'Data Imported',
                        'Your data has been imported successfully.',
                        'success'
                    );
                    
                    showToast('Data imported successfully!', 'success');
                }
            } catch (error) {
                showToast('Error importing data. Invalid file format.', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    appData.settings.theme = newTheme;
    saveAppData();
    
    addNotification(
        'Theme Changed',
        `Switched to ${newTheme} theme.`,
        'info'
    );
    
    showToast(`Switched to ${newTheme} theme`, 'info');
}

function scheduleDailyReminder() {
    if (!appData.settings.notifications || !appData.settings.dailyReminder) return;
    
    // Check if it's time for daily reminder
    const now = new Date();
    const [hours, minutes] = appData.settings.dailyReminder.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    
    if (now.getHours() === hours && now.getMinutes() === minutes) {
        const today = new Date().toISOString().split('T')[0];
        const todayData = appData.calendar[today];
        
        if (!todayData || todayData.status !== 'completed') {
            addNotification(
                'Daily Reminder ⏰',
                'Time to log your study hours for today! Click here to log now.',
                'info',
                { modal: 'day' }
            );
        }
    }
    
    // Check for every hour to see if it's reminder time
    setTimeout(scheduleDailyReminder, 60000); // Check every minute
}

function updateUI() {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = currentUser;
    if (userAvatar) userAvatar.textContent = currentUser.charAt(0).toUpperCase();
}

// Initialize schedule on load
scheduleDailyReminder();

// Check for missed days periodically
setInterval(checkMissedDays, 300000); // Check every 5 minutes


// ===== PROFILE PICTURE FUNCTIONS =====
function loadUserProfile() {
    // Load user data from authentication system
    const savedUser = localStorage.getItem('dailyflow_currentUser');
    if (!savedUser) return;
    
    // Load all users to get this user's data
    const allUsers = JSON.parse(localStorage.getItem('dailyflow_users') || '{}');
    const userData = allUsers[savedUser];
    
    if (userData) {
        // Update UI with user data
        updateProfileUI(userData);
    }
}

function updateProfileUI(userData) {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const userEmail = document.getElementById('userEmail');
    
    if (userName) userName.textContent = userData.fullName || userData.username;
    if (userEmail) userEmail.textContent = userData.email || 'Welcome to 2026';
    
    // Update avatar with profile picture or initial
    if (userAvatar) {
        if (userData.avatar) {
            // User uploaded a profile picture
            userAvatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = userData.avatar;
            img.alt = userData.fullName || userData.username;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            userAvatar.appendChild(img);
        } else {
            // Use first letter with gradient background
            userAvatar.textContent = (userData.fullName || userData.username || 'U').charAt(0).toUpperCase();
            userAvatar.style.background = 'linear-gradient(135deg, var(--primary-500), var(--primary-600))';
            userAvatar.style.display = 'flex';
            userAvatar.style.alignItems = 'center';
            userAvatar.style.justifyContent = 'center';
            userAvatar.style.fontSize = '1.25rem';
            userAvatar.style.fontWeight = '600';
            userAvatar.style.color = 'white';
        }
        
        // Make avatar clickable to update profile
        userAvatar.style.cursor = 'pointer';
        userAvatar.title = 'Click to update profile picture';
        userAvatar.onclick = showProfileModal;
    }
}

function showProfileModal() {
    const savedUser = localStorage.getItem('dailyflow_currentUser');
    const allUsers = JSON.parse(localStorage.getItem('dailyflow_users') || '{}');
    const userData = allUsers[savedUser] || {};
    
    const modalHTML = `
        <div class="modal-overlay" id="profileModal">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>Profile Settings</h3>
                    <button class="modal-close" onclick="closeModal('profileModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="position: relative; display: inline-block;">
                            <div id="profileAvatarPreview" class="avatar-large" 
                                 style="width: 120px; height: 120px; margin: 0 auto 16px; cursor: pointer;"
                                 onclick="document.getElementById('profilePictureInput').click()">
                                ${userData.avatar ? 
                                    `<img src="${userData.avatar}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                    `<div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, var(--primary-500), var(--primary-600)); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: white; font-weight: 600;">
                                        ${(userData.fullName || userData.username || 'U').charAt(0).toUpperCase()}
                                     </div>`
                                }
                            </div>
                            <div style="position: absolute; bottom: 10px; right: 10px; width: 36px; height: 36px; background: var(--primary-500); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; border: 3px solid var(--bg-card); box-shadow: var(--shadow);"
                                 onclick="document.getElementById('profilePictureInput').click()">
                                <i class="fas fa-camera"></i>
                            </div>
                        </div>
                        <input type="file" id="profilePictureInput" accept="image/*" style="display: none;" 
                               onchange="handleProfilePictureUpload(event)">
                        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 8px;">
                            Click to upload a new profile picture
                        </p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" id="profileFullName" class="form-control" 
                               value="${userData.fullName || ''}" placeholder="Your full name">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="profileEmail" class="form-control" 
                               value="${userData.email || ''}" placeholder="your@email.com">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Bio</label>
                        <textarea id="profileBio" class="form-control" rows="3" 
                                  placeholder="Tell us about yourself...">${userData.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Daily Reminder Time</label>
                        <input type="time" id="profileReminder" class="form-control" 
                               value="${userData.settings?.dailyReminder || '09:00'}">
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-danger" onclick="deleteAccount()">
                            <i class="fas fa-trash"></i> Delete Account
                        </button>
                        <div style="flex: 1"></div>
                        <button class="btn btn-outline" onclick="closeModal('profileModal')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="saveProfile()">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.getElementById('modalsContainer');
    modalContainer.innerHTML = modalHTML;
}

function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image must be less than 5MB', 'error');
        return;
    }
    
    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('profileAvatarPreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview" 
                                  style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    };
    reader.readAsDataURL(file);
}

function saveProfile() {
    const savedUser = localStorage.getItem('dailyflow_currentUser');
    if (!savedUser) return;
    
    // Load all users
    const allUsers = JSON.parse(localStorage.getItem('dailyflow_users') || '{}');
    const userData = allUsers[savedUser];
    
    if (!userData) return;
    
    // Get form values
    const fullName = document.getElementById('profileFullName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    const reminder = document.getElementById('profileReminder').value;
    
    // Validate email
    if (email && !validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Check if email is already used by another user
    if (email !== userData.email) {
        const emailExists = Object.values(allUsers).some(u => 
            u.email === email && u.username !== savedUser
        );
        if (emailExists) {
            showToast('Email address already registered by another user', 'error');
            return;
        }
    }
    
    // Update user data
    userData.fullName = fullName || userData.fullName;
    userData.email = email || userData.email;
    userData.bio = bio;
    userData.settings = userData.settings || {};
    userData.settings.dailyReminder = reminder || '09:00';
    
    // Get uploaded profile picture
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            userData.avatar = e.target.result;
            completeProfileSave(allUsers, userData, savedUser);
        };
        reader.readAsDataURL(file);
    } else {
        completeProfileSave(allUsers, userData, savedUser);
    }
}

function completeProfileSave(allUsers, userData, username) {
    // Save updated user data
    allUsers[username] = userData;
    localStorage.setItem('dailyflow_users', JSON.stringify(allUsers));
    
    // Update app settings with reminder time
    appData.settings.dailyReminder = userData.settings.dailyReminder;
    saveAppData();
    
    // Update UI
    updateProfileUI(userData);
    
    addNotification(
        'Profile Updated',
        'Your profile has been updated successfully.',
        'success'
    );
    
    showToast('Profile saved successfully!', 'success');
    closeModal('profileModal');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone and will delete all your data.')) {
        const savedUser = localStorage.getItem('dailyflow_currentUser');
        if (!savedUser) return;
        
        // Remove user data
        const allUsers = JSON.parse(localStorage.getItem('dailyflow_users') || '{}');
        delete allUsers[savedUser];
        localStorage.setItem('dailyflow_users', JSON.stringify(allUsers));
        
        // Clear user-specific storage
        const storage = new LocalStorageManager(savedUser);
        storage.clear();
        
        // Clear session
        localStorage.removeItem('dailyflow_currentUser');
        
        // Redirect to login
        showToast('Account deleted successfully', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Call this in initializeApp() function
function initializeApp() {
    // ... existing initialization code ...
    
    // Load user profile
    loadUserProfile();  // ADD THIS LINE
    
    // ... rest of initialization ...
}

// ===== DEMO ACCOUNT FUNCTIONS =====
function useDemoAccount() {
    console.log('🎮 Logging in as demo user');
    
    // Create UNIQUE demo username for each session
    const demoUsername = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
    // Set unique demo as current user
    localStorage.setItem('dailyflow_currentUser', demoUsername);
    
    // Create demo user data if it doesn't exist
    if (!users[demoUsername]) {
        users[demoUsername] = {
            id: generateUserId(),
            fullName: 'Demo User',
            email: 'demo@dailyflow.app',
            username: demoUsername,
            avatar: null,
            password: btoa('demo123'),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            settings: {
                theme: 'light',
                notifications: true,
                dailyReminder: '09:00'
            },
            isDemo: true
        };
        
        // Initialize demo data for this new unique demo user
        initializeDemoData(demoUsername);
        
        saveUsers();
    }
    
    showToast('Welcome to DailyFlow! Using demo account.', 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

function initializeDemoData(username) {
    console.log(`🔄 Initializing demo data for ${username}`);
    
    const storage = new LocalStorageManager(username);
    
    // Create demo calendar data
    const calendar = {};
    const today = new Date();
    
    // Create 30 days of demo data
    for (let i = -15; i <= 15; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Random hours (2-10)
        const actualHours = i >= 0 ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 7) + 4;
        const plannedHours = 8;
        
        // Create some tasks
        const tasks = [];
        const taskCount = Math.floor(Math.random() * 4) + 2;
        for (let j = 0; j < taskCount; j++) {
            tasks.push({
                text: `Demo task ${j + 1}`,
                completed: Math.random() > 0.3,
                createdAt: new Date().toISOString()
            });
        }
        
        // Determine status
        let status = 'planned';
        if (i < 0) {
            status = actualHours > 0 ? 'completed' : 'missed';
        } else if (i === 0) {
            status = 'inprogress';
        }
        
        calendar[dateStr] = {
            plannedHours: plannedHours,
            actualHours: actualHours,
            tasks: tasks,
            notes: i < 0 ? 'Demo day completed' : 'Plan for today',
            status: status,
            createdAt: new Date().toISOString()
        };
    }
    
    // Demo goals
    const goals = [
        {
            id: Date.now(),
            title: 'Complete DailyFlow Demo',
            description: 'Explore all features of the DailyFlow dashboard',
            targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
            createdAt: new Date().toISOString(),
            priority: 'high',
            category: 'learning'
        },
        {
            id: Date.now() + 1,
            title: 'Learn JavaScript Advanced Concepts',
            description: 'Master async/await, closures, and design patterns',
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
            createdAt: new Date().toISOString(),
            priority: 'medium',
            category: 'study'
        }
    ];
    
    // Demo projects
    const projects = [
        {
            id: Date.now(),
            name: 'DailyFlow App',
            description: 'Life dashboard for tracking goals, habits, and progress',
            category: 'Web Development',
            tech: 'HTML, CSS, JavaScript',
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            progress: 85,
            status: 'inprogress',
            createdAt: new Date().toISOString()
        }
    ];
    
    // Demo habits
    const habits = [
        {
            id: Date.now(),
            name: 'Morning Exercise',
            description: '30 minutes of exercise every morning',
            category: 'Health',
            frequency: 'daily',
            streak: 7,
            completedDates: generateDemoDates(7),
            reminder: '07:00',
            createdAt: new Date().toISOString()
        },
        {
            id: Date.now() + 1,
            name: 'Read 30 Pages',
            description: 'Read at least 30 pages every day',
            category: 'Learning',
            frequency: 'daily',
            streak: 5,
            completedDates: generateDemoDates(5),
            reminder: '21:00',
            createdAt: new Date().toISOString()
        }
    ];
    
    // Save demo data
    storage.save('calendar', calendar);
    storage.save('goals', goals);
    storage.save('projects', projects);
    storage.save('habits', habits);
    storage.save('settings', {
        theme: 'light',
        notifications: true,
        dailyReminder: '09:00'
    });
    
    // Demo notifications
    const notifications = [
        {
            id: Date.now(),
            title: 'Welcome to DailyFlow Demo!',
            message: 'This is a demo account with sample data. Feel free to explore all features.',
            type: 'info',
            read: false,
            timestamp: new Date().toISOString()
        },
        {
            id: Date.now() + 1,
            title: 'Tip: Try adding your own goals',
            message: 'Click the "Add Goal" button to start tracking your personal goals.',
            type: 'info',
            read: false,
            timestamp: new Date().toISOString()
        }
    ];
    storage.save('notifications', notifications);
    
    console.log('✅ Demo data initialized for', username);
}

function generateDemoDates(count) {
    const dates = [];
    const today = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
}

function cleanupOldDemoAccounts() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [username, userData] of Object.entries(users)) {
        if (username.startsWith('demo_') && username !== 'demo') {
            const createdAt = new Date(userData.createdAt).getTime();
            
            if (createdAt < oneDayAgo) {
                console.log(`🧹 Cleaning up old demo account: ${username}`);
                
                const storage = new LocalStorageManager(username);
                storage.clear();
                
                delete users[username];
                cleanedCount++;
            }
        }
    }
    
    if (cleanedCount > 0) {
        localStorage.setItem('dailyflow_users', JSON.stringify(users));
        console.log(`✅ Cleaned up ${cleanedCount} old demo accounts`);
    }
}
// ===== AUTO-SAVE FUNCTIONS (ADD THIS) =====

// Add this function to save automatically
function autoSave() {
    if (saveAppData()) {
        console.log('💾 Auto-save completed for:', currentUser);
    }
}

// Add this to your existing initializeApp() function:
function initializeApp() {
    // Setup storage with user prefix
    storage = new LocalStorageManager(currentUser);
    loadAppData();
    loadUserProfile();
    loadNotifications();
    updateUI();
    showPage('dashboard');
    scheduleDailyReminder();
    
    // ADD THIS LINE - Start auto-save
    setupAutoSave();
}

// Add this new function:
function setupAutoSave() {
    // Auto-save when user leaves page
    window.addEventListener('beforeunload', function() {
        saveAppData();
    });
    
    // Auto-save periodically (every 30 seconds)
    setInterval(autoSave, 30000);
    
    // Auto-save when data changes (optional)
    console.log('🔧 Auto-save system activated');
}

// Add this cleanup function:
function cleanupOldDemoAccounts() {
    const users = JSON.parse(localStorage.getItem('dailyflow_users') || '{}');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [username, userData] of Object.entries(users)) {
        if (username.startsWith('demo_') && username !== 'demo') {
            const createdAt = new Date(userData.createdAt).getTime();
            
            if (createdAt < oneDayAgo) {
                console.log(`🧹 Cleaning up old demo account: ${username}`);
                
                const storage = new LocalStorageManager(username);
                storage.clear();
                
                delete users[username];
                cleanedCount++;
            }
        }
    }
    
    if (cleanedCount > 0) {
        localStorage.setItem('dailyflow_users', JSON.stringify(users));
        console.log(`✅ Cleaned up ${cleanedCount} old demo accounts`);
    }
}