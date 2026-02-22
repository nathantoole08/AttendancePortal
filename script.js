// DOM Elements
const currentTimeEl = document.getElementById('currentTime');
const currentDateEl = document.getElementById('currentDate');
const sessionStatusEl = document.getElementById('sessionStatus');
const fullNameInput = document.getElementById('fullName');
const signInBtn = document.getElementById('signInBtn');
const activeSessionsList = document.getElementById('activeSessionsList');
const activeCountEl = document.getElementById('activeCount');
const noActiveEl = document.getElementById('noActive');
const historyBody = document.getElementById('historyBody');
const noDataEl = document.getElementById('noData');
const exportBtn = document.getElementById('exportBtn');
const resetStatus = document.getElementById('resetStatus');
const mainView = document.getElementById('mainView');
const adminView = document.getElementById('adminView');
const suggestionsListEl = document.getElementById('suggestionsList');
const loginView = document.getElementById('loginView');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Admin Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.admin-tab-content');
const welcomeMsgInput = document.getElementById('welcomeMsgInput');
const timezoneSelect = document.getElementById('timezoneSelect');
const ruleModeSelect = document.getElementById('ruleModeSelect');
const ruleDaySelect = document.getElementById('ruleDaySelect');
const ruleDateInput = document.getElementById('ruleDateInput');
const ruleTypeSelect = document.getElementById('ruleTypeSelect');
const ruleStart = document.getElementById('ruleStart');
const ruleEnd = document.getElementById('ruleEnd');
const addMemberBtn = document.getElementById('addMemberBtn');
const memberInput = document.getElementById('memberInput');
const membersList = document.getElementById('membersList');
const autoSignOutToggle = document.getElementById('autoSignOutToggle');
const autoSignOutTime = document.getElementById('autoSignOutTime');
const reportType = document.getElementById('reportType');
const reportStart = document.getElementById('reportStart');
const reportEnd = document.getElementById('reportEnd');
const reportMemberFilter = document.getElementById('reportMemberFilter');
const reportMemberGroup = document.getElementById('reportMemberGroup');
const generateReportBtn = document.getElementById('generateReportBtn');
const exportReportBtn = document.getElementById('exportReportBtn');
const reportResult = document.getElementById('reportResult');
const reportTableHeader = document.getElementById('reportTableHeader');
const reportTableBody = document.getElementById('reportTableBody');

// V34 Custom Multi-Select logic
window.updateMultiSelectBtnState = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const btn = container.querySelector('.multi-select-btn');
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const allCheckbox = checkboxes.find(c => c.value === 'all');
    const checkedBoxes = checkboxes.filter(c => c.checked && c.value !== 'all');

    if (allCheckbox && allCheckbox.checked) {
        btn.textContent = containerId === 'ruleTargetContainer' ? 'All members' : 'All in category';
    } else if (checkedBoxes.length === 0) {
        btn.textContent = 'None selected';
    } else if (checkedBoxes.length === 1) {
        btn.textContent = checkedBoxes[0].nextSibling.textContent.trim();
    } else {
        btn.textContent = `${checkedBoxes.length} selected`;
    }
};

window.handleMultiSelectChange = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const allCheckbox = checkboxes.find(c => c.value === 'all');

    // Find the currently clicked checkbox (the one that triggered this event)
    const eventTarget = event.target;

    if (eventTarget === allCheckbox && allCheckbox.checked) {
        // If "All" was just checked, uncheck everything else
        checkboxes.forEach(c => { if (c !== allCheckbox) c.checked = false; });
    } else if (eventTarget !== allCheckbox && eventTarget.checked) {
        // If a specific person was checked, uncheck "All"
        if (allCheckbox) allCheckbox.checked = false;
    }

    // Edge case: if nothing is checked anymore, auto-check "All"
    if (!checkboxes.some(c => c.checked) && allCheckbox) {
        allCheckbox.checked = true;
    }

    updateMultiSelectBtnState(containerId);
};

// Close dropdowns when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.multi-select-container')) {
        document.querySelectorAll('.multi-select-dropdown.open').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
});

// State
let attendanceData = JSON.parse(localStorage.getItem('attendance_data')) || [];
let activeSessions = JSON.parse(localStorage.getItem('active_sessions')) || [];
let systemMembers = JSON.parse(localStorage.getItem('system_members')) || [];
// Migrate old string array to object array if needed
if (systemMembers.length > 0 && typeof systemMembers[0] === 'string') {
    systemMembers = systemMembers.map(name => ({ name, type: 'member' }));
    localStorage.setItem('system_members', JSON.stringify(systemMembers));
}
let welcomeMessage = localStorage.getItem('welcome_message') || '';
let selectedTimezone = localStorage.getItem('selected_timezone') || 'Australia/Melbourne';
let autoSignOutConfig = JSON.parse(localStorage.getItem('auto_signout_config')) || { enabled: false, time: "23:00" };

// Migrate legacy configs to new unified scheduleRules engine
let scheduleRules = JSON.parse(localStorage.getItem('schedule_rules'));
if (!scheduleRules) {
    scheduleRules = [];
    let oldTrainingConfig = JSON.parse(localStorage.getItem('training_config')) || { day: "3", start: "18:30", end: "21:30" };
    scheduleRules.push({
        id: Date.now().toString(),
        mode: 'recurring',
        type: 'include',
        day: oldTrainingConfig.day,
        start: oldTrainingConfig.start,
        end: oldTrainingConfig.end
    });

    let oldExceptions = JSON.parse(localStorage.getItem('training_exceptions')) || [];
    oldExceptions.forEach((ex, idx) => {
        scheduleRules.push({
            id: (Date.now() + idx + 1).toString(),
            mode: 'specific',
            type: ex.type,
            date: ex.date,
            start: ex.start || "18:30",
            end: ex.end || "21:30"
        });
    });
    localStorage.setItem('schedule_rules', JSON.stringify(scheduleRules));
}
let lastAutoSignoutDate = localStorage.getItem('last_auto_signout_date') || '';
let currentPin = '';
const ADMIN_PIN = '0000';
let isAdminUnlocked = false;

// Initialize
function init() {
    // Check for session authentication
    if (sessionStorage.getItem('is_authenticated') === 'true') {
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
    } else {
        loginView.classList.remove('hidden');
        mainView.classList.add('hidden');
    }

    updateClock();
    setInterval(updateClock, 1000);
    setInterval(checkAutoSignOut, 60000); // Check once a minute
    renderAttendance();
    renderActiveSessions();

    // Event Listeners
    signInBtn.addEventListener('click', handleSignIn);

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Auto-save Settings UI Listeners
    autoSignOutToggle.addEventListener('change', saveSettings);
    autoSignOutTime.addEventListener('change', saveSettings);
    welcomeMsgInput.addEventListener('change', saveSettings);
    timezoneSelect.addEventListener('change', saveSettings);

    addMemberBtn.addEventListener('click', addMember);
    generateReportBtn.addEventListener('click', generateReport);
    exportReportBtn.addEventListener('click', exportReport);

    loginBtn.addEventListener('click', handleLogin);
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    logoutBtn.addEventListener('click', handleLogout);

    memberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMember();
    });

    loadSettings();
    renderMembers();
    populateMemberFilter();
    populateTimezones();

    reportType.addEventListener('change', () => {
        const isTraining = reportType.value === 'training';
        reportMemberGroup.classList.toggle('hidden', isTraining);
    });

    adminLockBtn.addEventListener('click', () => {
        if (isAdminUnlocked) {
            lockAdmin();
        } else {
            adminOverlay.classList.add('visible');
            clearPin();
        }
    });

    // Allow Enter key to sign in
    fullNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignIn();
    });

    fullNameInput.addEventListener('input', handleNameInput);

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!fullNameInput.contains(e.target) && !suggestionsListEl.contains(e.target)) {
            suggestionsListEl.classList.add('hidden');
        }
    });

    // Profile Settings
    profileBtn.addEventListener('click', () => {
        profileOverlay.classList.add('visible');
    });

    passwordResetBtn.addEventListener('click', () => {
        resetStatus.classList.remove('hidden');
        setTimeout(() => resetStatus.classList.add('hidden'), 5000);
    });
}

// Authentication logic
function handleLogin() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    // Hardcoded credentials as requested
    if (email === 'craigieburn@ses.vic.gov.au' && password === 'Craigieburn3064') {
        sessionStorage.setItem('is_authenticated', 'true');
        loginView.classList.add('hidden');
        mainView.classList.remove('hidden');
        loginError.classList.add('hidden');
    } else {
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    sessionStorage.removeItem('is_authenticated');
    location.reload();
}

// Clock & Timers logic
function updateClock() {
    const now = new Date();

    // Use Intl for timezone support
    const timeOptions = {
        hour12: false,
        timeZone: selectedTimezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    currentTimeEl.textContent = new Intl.DateTimeFormat('en-US', timeOptions).format(now);

    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: selectedTimezone
    };
    currentDateEl.textContent = new Intl.DateTimeFormat('en-AU', dateOptions).format(now);

    sessionStatusEl.textContent = welcomeMessage;

    // Update session timers
    activeSessions.forEach(session => {
        const timerEl = document.getElementById(`timer-${session.id}`);
        if (timerEl) {
            const start = new Date(session.signIn);
            const diff = Math.floor((now - start) / 1000);
            const hrs = Math.floor(diff / 3600);
            const mins = Math.floor((diff % 3600) / 60);
            const secs = diff % 60;
            timerEl.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    });
}

// Sign In
function handleSignIn() {
    let rawName = fullNameInput.value.trim();
    if (!rawName) {
        fullNameInput.style.borderColor = 'var(--danger)';
        setTimeout(() => fullNameInput.style.borderColor = 'var(--glass-border)', 2000);
        return;
    }

    // Auto-capitalize: first letter of each word
    const parts = rawName.split(/\s+/).filter(p => p.length > 0);
    const signInErrorEl = document.getElementById('signInError');

    // Validation: Require at least two words (First Last)
    if (parts.length < 2) {
        signInErrorEl.textContent = "Please enter your full name (First Last)";
        signInErrorEl.classList.remove('hidden');
        fullNameInput.style.borderColor = 'var(--danger)';

        setTimeout(() => {
            signInErrorEl.classList.add('hidden');
            fullNameInput.style.borderColor = 'var(--glass-border)';
            // Reset text after fade out
            setTimeout(() => signInErrorEl.textContent = "Already signed in", 500);
        }, 3000);
        return;
    }

    const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

    // Check for duplicate sign-in
    const alreadySignedIn = activeSessions.some(s => s.name.toLowerCase() === name.toLowerCase());

    if (alreadySignedIn) {
        signInErrorEl.textContent = "Already signed in";
        signInErrorEl.classList.remove('hidden');
        fullNameInput.style.borderColor = 'var(--danger)';

        setTimeout(() => {
            signInErrorEl.classList.add('hidden');
            fullNameInput.style.borderColor = 'var(--glass-border)';
        }, 3000);
        return;
    }

    const newSession = {
        id: Date.now(),
        name: name,
        date: new Date().toLocaleDateString('en-AU'),
        signIn: new Date().toISOString(),
        signOut: null,
        duration: null
    };

    activeSessions.push(newSession);
    localStorage.setItem('active_sessions', JSON.stringify(activeSessions));

    // Check if the member already exists in the system
    const existingMember = systemMembers.find(m => m.name.toLowerCase() === name.toLowerCase());

    if (existingMember) {
        // V32 Auto-Reactivation Logic
        if (existingMember.status === 'archived') {
            existingMember.status = 'active';
            existingMember.role = 'guest'; // Auto-reactivated as a Guest
            localStorage.setItem('system_members', JSON.stringify(systemMembers));
            populateMemberFilter();
            if (typeof renderMembers === 'function') renderMembers();

            // Show a brief toast or alert that they were reactivated
            signInErrorEl.textContent = "Profile Reactivated!";
            signInErrorEl.style.color = "var(--success)";
            signInErrorEl.classList.remove('hidden');
            setTimeout(() => {
                signInErrorEl.classList.add('hidden');
                signInErrorEl.style.color = "var(--danger)"; // Restore default red
                signInErrorEl.textContent = "Already signed in"; // Restore default text
            }, 3000);
        }
    } else {
        // Automatically add new person to systemMembers using V32 Schema
        systemMembers.push({
            name: name,
            role: 'guest',
            status: 'active',
            createdAt: Date.now()
        });
        systemMembers.sort((a, b) => a.name.localeCompare(b.name));
        localStorage.setItem('system_members', JSON.stringify(systemMembers));
        populateMemberFilter();
        if (typeof renderMembers === 'function') renderMembers();
    }

    fullNameInput.value = '';
    renderActiveSessions();
}

// Sign Out
function handleSignOut(id) {
    const sessionIndex = activeSessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return;

    const session = activeSessions[sessionIndex];
    const signOutTime = new Date();
    const signInTime = new Date(session.signIn);
    const durationMs = signOutTime - signInTime;
    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

    const completedSession = {
        ...session,
        signOut: signOutTime.toISOString(),
        duration: durationHours
    };

    attendanceData.unshift(completedSession);
    localStorage.setItem('attendance_data', JSON.stringify(attendanceData));

    activeSessions.splice(sessionIndex, 1);
    localStorage.setItem('active_sessions', JSON.stringify(activeSessions));

    renderActiveSessions();
    renderAttendance();
}

// Name Suggestion Logic
function handleNameInput() {
    if (!suggestionsListEl) {
        console.error('V6 Error: suggestionsListEl not found in DOM!');
        return;
    }
    const input = fullNameInput.value.trim().toLowerCase();
    suggestionsListEl.innerHTML = '';

    if (input.length < 1) {
        suggestionsListEl.classList.add('hidden');
        return;
    }

    const activeNames = activeSessions.map(s => s.name.toLowerCase());
    console.log('V6: Input:', input, 'SystemMembers Count:', systemMembers.length, 'ActiveNames:', activeNames);

    // Only suggest members who are ACTIVE and NOT already signed in
    const matches = systemMembers
        .filter(m => m.status === 'active' && !activeNames.includes(m.name.toLowerCase()))
        .map(m => m.name)
        .filter(name => name.toLowerCase().includes(input))
        .slice(0, 5);

    if (matches.length === 0) {
        console.log('V6: No matches found for:', input);
        suggestionsListEl.classList.add('hidden');
        return;
    }

    console.log('V6: Found matches:', matches);
    matches.forEach(name => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = name;
        div.addEventListener('click', () => {
            fullNameInput.value = name;
            suggestionsListEl.classList.add('hidden');
            fullNameInput.focus();
        });
        suggestionsListEl.appendChild(div);
    });

    suggestionsListEl.classList.remove('hidden');
}

// Render Active Sessions
function renderActiveSessions() {
    activeSessionsList.innerHTML = '';
    activeCountEl.textContent = activeSessions.length;

    if (activeSessions.length === 0) {
        noActiveEl.style.display = 'block';
    } else {
        noActiveEl.style.display = 'none';
    }

    activeSessions.forEach(session => {
        const card = document.createElement('div');
        card.className = 'active-card';
        card.innerHTML = `
            <div class="active-info">
                <span class="active-name">${session.name}</span>
                <span class="active-time" id="timer-${session.id}">00:00:00</span>
            </div>
            <button class="sign-out-sm" onclick="handleSignOut(${session.id})">Sign Out</button>
        `;
        activeSessionsList.appendChild(card);
    });
}

// Render History
function renderAttendance() {
    historyBody.innerHTML = '';

    const now = new Date();
    const threshold = 24 * 60 * 60 * 1000; // 24 hours in ms

    const recentData = attendanceData.filter(session => {
        const sessionDate = new Date(session.signIn);
        return (now - sessionDate) <= threshold;
    });

    // Sort by most recent first
    recentData.sort((a, b) => new Date(b.signIn) - new Date(a.signIn));

    if (recentData.length === 0) {
        noDataEl.style.display = 'block';
        return;
    }

    noDataEl.style.display = 'none';

    recentData.forEach(session => {
        const row = document.createElement('tr');
        const signInStr = new Date(session.signIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const signOutStr = new Date(session.signOut).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        row.innerHTML = `
            <td><strong>${session.name}</strong></td>
            <td>${session.date}</td>
            <td>${signInStr}</td>
            <td>${signOutStr}</td>
            <td>${session.duration} hrs</td>
        `;
        historyBody.appendChild(row);
    });
}

// PIN PAD Logic
window.appendPin = function (digit) {
    if (currentPin.length < 4) {
        currentPin += digit;
        updatePinDisplay();
    }

    if (currentPin.length === 4) {
        if (currentPin === ADMIN_PIN) {
            unlockAdmin();
        } else {
            flashError();
        }
    }
}

window.clearPin = function () {
    currentPin = '';
    updatePinDisplay();
}

window.closeAdmin = function () {
    adminOverlay.classList.remove('visible');
}

window.closeProfile = function () {
    profileOverlay.classList.remove('visible');
}

function updatePinDisplay() {
    pinDisplay.textContent = '*'.repeat(currentPin.length).padEnd(4, '-');
}

function flashError() {
    pinDisplay.style.color = 'var(--danger)';
    setTimeout(() => {
        clearPin();
        pinDisplay.style.color = 'var(--primary)';
    }, 500);
}

function unlockAdmin() {
    isAdminUnlocked = true;
    mainView.classList.add('hidden');
    adminView.classList.remove('hidden');
    adminOverlay.classList.remove('visible');
    adminLockBtn.classList.add('unlocked');
    adminLockBtn.innerHTML = '<span>🔓</span>';
    renderAttendance();
}

function lockAdmin() {
    isAdminUnlocked = false;
    adminView.classList.add('hidden');
    mainView.classList.remove('hidden');
    adminLockBtn.classList.remove('unlocked');
    adminLockBtn.innerHTML = '<span>🔒</span>';
}

// Tab Switching logic
function switchTab(tabId) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabContents.forEach(content => content.classList.toggle('active', content.id === `tab-${tabId}`));
}

// Settings Logic
function loadSettings() {
    welcomeMsgInput.value = welcomeMessage;
    timezoneSelect.value = selectedTimezone;
    autoSignOutToggle.checked = autoSignOutConfig.enabled;
    autoSignOutTime.value = autoSignOutConfig.time;
    renderRules();
}

function saveSettings() {
    welcomeMessage = welcomeMsgInput.value.trim();
    selectedTimezone = timezoneSelect.value;
    // Reset today's trigger flag if the time fundamentally changed so they can test/execute it immediately
    if (autoSignOutTime.value !== (autoSignOutConfig.time || '')) {
        lastAutoSignoutDate = '';
        localStorage.removeItem('last_auto_signout_date');
    }

    autoSignOutConfig = {
        enabled: autoSignOutToggle.checked,
        time: autoSignOutTime.value
    };

    localStorage.setItem('welcome_message', welcomeMessage);
    localStorage.setItem('selected_timezone', selectedTimezone);
    localStorage.setItem('auto_signout_config', JSON.stringify(autoSignOutConfig));

    updateClock();
    // alert('Settings saved successfully!'); // Removed for auto-save
}

function checkAutoSignOut() {
    if (!autoSignOutConfig.enabled) return;

    const now = new Date();

    // Use en-GB to guarantee consistent 24-hour "HH:mm:ss" format regardless of the platform
    const timeString = now.toLocaleTimeString('en-GB', {
        timeZone: selectedTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const [hourStr, minuteStr] = timeString.split(':');
    let parsedHour = parseInt(hourStr, 10);
    // Handle the 24:00 midnight edge case
    if (parsedHour === 24) parsedHour = 0;

    const currentTotalMinutes = parsedHour * 60 + parseInt(minuteStr, 10);
    const [cfgHour, cfgMinute] = (autoSignOutConfig.time || '23:00').split(':').map(Number);
    const cfgTotalMinutes = cfgHour * 60 + cfgMinute;

    const dateKey = now.toLocaleDateString('en-GB', { timeZone: selectedTimezone });

    // --- DIAGNOSTIC LOG (To prove exactly what the script is doing every 60 seconds) ---
    console.log(`[Auto Sign-Out] Current: ${parsedHour}:${minuteStr} (${currentTotalMinutes}m) | Target: ${cfgHour}:${cfgMinute} (${cfgTotalMinutes}m) | Stale Date Flag: ${lastAutoSignoutDate === dateKey ? 'BLOCKED TODAY' : 'CLEAR'}`);

    // Primary Auto Sign-Out Boundary (Catches normal cases and asleep browsers waking up same-day)
    if (currentTotalMinutes >= cfgTotalMinutes && lastAutoSignoutDate !== dateKey) {
        if (activeSessions.length > 0) {
            console.log('Auto Sign-out boundary reached at', `${hourStr}:${minuteStr}`);
            const sessionsToSignOut = [...activeSessions];
            sessionsToSignOut.forEach(session => handleSignOut(session.id));
        }
        // Mark as triggered so anyone signing in natively AFTER the cutoff isn't instantly kicked out
        lastAutoSignoutDate = dateKey;
        localStorage.setItem('last_auto_signout_date', lastAutoSignoutDate);
    }

    // Safety fallback: Cross-day sleepers (if browser was asleep for days and wakes up before cfg time)
    if (activeSessions.length > 0) {
        const sessionsToSignOut = [...activeSessions];
        sessionsToSignOut.forEach(session => {
            const sessionDate = new Date(session.signIn);
            const durationHours = (now - sessionDate) / (1000 * 60 * 60);
            const sessionDateKey = sessionDate.toLocaleDateString('en-GB', { timeZone: selectedTimezone });

            // If they are from a previous day AND have been active for over 14 hours
            if (sessionDateKey !== dateKey && durationHours > 14) {
                console.log('Auto Sign-out fallback triggered for stale session:', session.name);
                handleSignOut(session.id);
            }
        });
    }
}

function populateTimezones() {
    const zones = [
        { label: '(GMT-11:00) Niue', value: 'Pacific/Niue' },
        { label: '(GMT-10:00) Hawaii', value: 'Pacific/Honolulu' },
        { label: '(GMT-09:00) Alaska', value: 'America/Anchorage' },
        { label: '(GMT-08:00) Los Angeles', value: 'America/Los_Angeles' },
        { label: '(GMT-07:00) Denver', value: 'America/Denver' },
        { label: '(GMT-06:00) Chicago', value: 'America/Chicago' },
        { label: '(GMT-05:00) New York', value: 'America/New_York' },
        { label: '(GMT-04:00) Santiago', value: 'America/Santiago' },
        { label: '(GMT-03:00) Sao Paulo', value: 'America/Sao_Paulo' },
        { label: '(GMT-02:00) South Georgia', value: 'Atlantic/South_Georgia' },
        { label: '(GMT-01:00) Azores', value: 'Atlantic/Azores' },
        { label: '(GMT+00:00) London, UTC', value: 'UTC' },
        { label: '(GMT+01:00) Paris, Berlin', value: 'Europe/Paris' },
        { label: '(GMT+02:00) Helsinki, Kyiv', value: 'Europe/Helsinki' },
        { label: '(GMT+02:00) Jerusalem', value: 'Asia/Jerusalem' },
        { label: '(GMT+02:00) Windhoek', value: 'Africa/Windhoek' },
        { label: '(GMT+03:00) Kuwait, Riyadh', value: 'Asia/Kuwait' },
        { label: '(GMT+03:00) Moscow, St. Pete', value: 'Europe/Moscow' },
        { label: '(GMT+03:30) Tehran', value: 'Asia/Tehran' },
        { label: '(GMT+04:00) Abu Dhabi, Muscat', value: 'Asia/Dubai' },
        { label: '(GMT+04:30) Kabul', value: 'Asia/Kabul' },
        { label: '(GMT+05:00) Islamabad, Karachi', value: 'Asia/Karachi' },
        { label: '(GMT+05:30) Chennai, Mumbai', value: 'Asia/Kolkata' },
        { label: '(GMT+06:00) Almaty, Dhaka', value: 'Asia/Almaty' },
        { label: '(GMT+07:00) Bangkok, Jakarta', value: 'Asia/Bangkok' },
        { label: '(GMT+07:00) Krasnoyarsk', value: 'Asia/Krasnoyarsk' },
        { label: '(GMT+08:00) Beijing, Hong Kong', value: 'Asia/Shanghai' },
        { label: '(GMT+08:00) Kuala Lumpur', value: 'Asia/Kuala_Lumpur' },
        { label: '(GMT+08:00) Perth, Singapore', value: 'Australia/Perth' },
        { label: '(GMT+09:00) Tokyo, Seoul', value: 'Asia/Tokyo' },
        { label: '(GMT+09:30) Adelaide', value: 'Australia/Adelaide' },
        { label: '(GMT+09:30) Darwin', value: 'Australia/Darwin' },
        { label: '(GMT+10:00) Brisbane', value: 'Australia/Brisbane' },
        { label: '(GMT+10:00) Melbourne, Sydney', value: 'Australia/Melbourne' },
        { label: '(GMT+11:00) Solomon Islands', value: 'Pacific/Guadalcanal' },
        { label: '(GMT+12:00) Auckland, Fiji', value: 'Pacific/Auckland' }
    ];

    timezoneSelect.innerHTML = '';
    zones.forEach(zone => {
        const opt = document.createElement('option');
        opt.value = zone.value;
        opt.textContent = zone.label;
        timezoneSelect.appendChild(opt);
    });
    timezoneSelect.value = selectedTimezone;
}
// Member Management
function addMember() {
    const memberInput = document.getElementById('memberInput');
    const name = memberInput ? memberInput.value.trim() : '';
    if (!name) return;

    const errorContainer = document.getElementById('addMemberError');

    // V31: Require First and Last Name (at least two words)
    if (name.split(/\s+/).length < 2) {
        if (errorContainer) {
            errorContainer.textContent = "Please enter a full name (First Last)";
            errorContainer.style.display = 'block';
        }
        return;
    }

    // Clear error if successful
    if (errorContainer) errorContainer.style.display = 'none';

    // Standardize capitalization
    const formattedName = name.split(/\s+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(' ');

    const roleSelect = document.getElementById('memberRoleSelect');
    const newRole = roleSelect ? roleSelect.value : 'member';

    const existing = systemMembers.find(m => m.name === formattedName);
    if (existing) {
        existing.status = 'active';
        existing.role = newRole;
        existing.type = newRole;
    } else {
        // V32 Archiving Data Structure
        systemMembers.push({
            name: formattedName,
            role: newRole,
            type: newRole,
            status: 'active',
            createdAt: Date.now()
        });
    }

    systemMembers.sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('system_members', JSON.stringify(systemMembers));
    memberInput.value = '';
    renderMembers();
    populateMemberFilter();
}

function removeMember(name) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.status = 'archived'; // Archive instead of delete
        localStorage.setItem('system_members', JSON.stringify(systemMembers));
        renderMembers();
        populateMemberFilter();
    }
}

function reactivateMember(name) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.status = 'active';
        member.role = 'guest'; // Defaults to guest upon reactivation
        localStorage.setItem('system_members', JSON.stringify(systemMembers));
        renderMembers();
        populateMemberFilter();
        alert(`${name} has been reactivated as a Guest.`);
    }
}

function editMemberName(oldName) {
    const memberNameSpan = document.querySelector(`.member-name[data-name="${oldName}"]`);
    if (!memberNameSpan) return;

    const currentName = memberNameSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'member-name-edit';

    // Replace span with input
    memberNameSpan.replaceWith(input);
    input.focus();
    input.select();

    const saveName = () => {
        const newName = input.value.trim();
        if (!newName) {
            // Revert if empty
            input.replaceWith(memberNameSpan);
            return;
        }

        // Standardize capitalization
        const formattedName = newName.split(/\s+/)
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(' ');

        // If name hasn't changed, just revert
        if (formattedName === oldName) {
            input.replaceWith(memberNameSpan);
            return;
        }

        // Check if new name already exists (excluding the current member)
        const existing = systemMembers.find(m => m.name === formattedName && !m.deleted);
        if (existing) {
            alert('A person with this name already exists.');
            input.replaceWith(memberNameSpan);
            return;
        }

        // Update the member's name in systemMembers
        const member = systemMembers.find(m => m.name === oldName);
        if (member) {
            member.name = formattedName;

            // CRITICAL: Update all attendance records with the old name to the new name
            attendanceData.forEach(session => {
                if (session.name === oldName) {
                    session.name = formattedName;
                }
            });

            // Update active sessions as well
            activeSessions.forEach(session => {
                if (session.name === oldName) {
                    session.name = formattedName;
                }
            });

            // Save all updated data
            systemMembers.sort((a, b) => a.name.localeCompare(b.name));
            localStorage.setItem('system_members', JSON.stringify(systemMembers));
            localStorage.setItem('attendance_data', JSON.stringify(attendanceData));
            localStorage.setItem('active_sessions', JSON.stringify(activeSessions));

            // Re-render everything to reflect changes
            renderMembers();
            populateMemberFilter();
            renderActiveSessions();
            renderAttendance();
        }
    };

    input.addEventListener('blur', saveName);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
}

function renderMembers() {
    syncHistoricalMembers();
    membersList.innerHTML = '';

    const statusFilter = document.getElementById('memberStatusSelect').value; // 'active' or 'archived'
    const roleFilter = document.getElementById('memberRoleSelect').value;     // 'member' or 'guest'

    // Toggle Add Profile form visibility (Hide if Archived is selected)
    const addFormContainer = document.getElementById('addMemberFormContainer');
    if (addFormContainer) {
        addFormContainer.style.display = (statusFilter === 'archived') ? 'none' : 'flex';
    }

    // Filter members based on both dropdowns. Treat implicitly missing status as 'active' and missing type as 'guest'
    const visibleMembers = systemMembers.filter(m => {
        const mStatus = m.status || (m.deleted ? 'archived' : 'active');
        const mRole = m.role || m.type || 'guest';
        return mStatus === statusFilter && mRole === roleFilter;
    });

    if (visibleMembers.length === 0) {
        membersList.innerHTML = `<p style="padding: 1rem; color: var(--text-muted); text-align: center;">No ${statusFilter} ${roleFilter}s found.</p>`;
        return;
    }

    visibleMembers.forEach(member => {
        const div = document.createElement('div');
        div.className = 'member-row';

        // Safety Fallbacks for legacy data
        const currentRole = member.role || member.type || 'guest';
        const selectClass = currentRole === 'member' ? 'type-toggle-select status-member' : 'type-toggle-select';

        // Define Action Buttons based on Status context
        let actionButtonsHtml = '';
        let roleDropdownHtml = '';

        if (statusFilter === 'active') {
            roleDropdownHtml = `
                <select class="${selectClass}" onchange="updateMemberType('${member.name}', this.value)">
                    <option value="member" ${currentRole === 'member' ? 'selected' : ''}>Member</option>
                    <option value="guest" ${currentRole === 'guest' ? 'selected' : ''}>Guest</option>
                </select>
            `;
            actionButtonsHtml = `
                <button class="edit-member-btn" onclick="editMemberName('${member.name}')" title="Edit Name">✏️</button>
                <button class="delete-member-btn" onclick="removeMember('${member.name}')" title="Archive Profile">🗑️</button>
            `;
        } else {
            // Archived State: No Edit, No Delete, No Role Dropdown. Just Reactivate.
            actionButtonsHtml = `
                <button class="action-btn sign-in" style="width: auto; padding: 0.25rem 1rem; font-size: 0.8rem;" onclick="reactivateMember('${member.name}')">Reactivate</button>
            `;
        }

        div.innerHTML = `
            <div class="member-info">
                <span class="member-name" data-name="${member.name}">${member.name}</span>
            </div>
            <div class="member-actions">
                ${roleDropdownHtml}
                ${actionButtonsHtml}
            </div>
        `;
        membersList.appendChild(div);
    });
}

function updateMemberType(name, newRole) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.role = newRole;
        member.type = newRole; // Legacy fallback
        localStorage.setItem('system_members', JSON.stringify(systemMembers));
        renderMembers();
        populateMemberFilter();
    }
}

function syncHistoricalMembers() {
    let changed = false;
    const historicalNames = [...new Set(attendanceData.map(s => s.name))];

    historicalNames.forEach(name => {
        if (!systemMembers.find(m => m.name === name)) {
            // Push missing historical data using V32 Schema defaults
            systemMembers.push({
                name: name,
                role: 'guest',
                status: 'active',
                createdAt: Date.now() // Assume created now if entirely missing
            });
            changed = true;
        }
    });

    // Also migrate any legacy users missing the V32 properties silently
    systemMembers.forEach(m => {
        if (!m.status) {
            m.status = m.deleted ? 'archived' : 'active';
            changed = true;
        }
        if (!m.role) {
            m.role = m.type || 'guest';
            changed = true;
        }
        if (!m.createdAt) {
            m.createdAt = Date.now();
            changed = true;
        }
    });

    if (changed) {
        systemMembers.sort((a, b) => a.name.localeCompare(b.name));
        localStorage.setItem('system_members', JSON.stringify(systemMembers));
    }
}

// Schedule Rules Logic
window.toggleRuleInputMode = function () {
    if (ruleModeSelect.value === 'recurring') {
        ruleDaySelect.style.display = 'block';
        ruleDateInput.style.display = 'none';
    } else {
        ruleDaySelect.style.display = 'none';
        ruleDateInput.style.display = 'block';
    }
};

window.renderRules = function () {
    const listEl = document.getElementById('rulesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const statusFilter = document.getElementById('ruleStatusFilter');
    const showArchived = statusFilter && statusFilter.value === 'archived';

    if (scheduleRules.length === 0) {
        listEl.innerHTML = `<p style="padding: 1rem; color: var(--text-muted); text-align: center;">No ${showArchived ? 'archived' : 'active'} rules found.</p>`;
        return;
    }

    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Sort by type (recurring first, then specific) and filter deleted/archived
    const sorted = [...scheduleRules]
        .filter(r => showArchived ? r.deleted === true : !r.deleted)
        .sort((a, b) => {
            if (a.mode === b.mode && a.mode === 'specific') {
                return new Date(a.date) - new Date(b.date);
            }
            return a.mode === 'recurring' ? -1 : 1;
        });

    if (sorted.length === 0) {
        listEl.innerHTML = `<p style="padding: 1rem; color: var(--text-muted); text-align: center;">No ${showArchived ? 'archived' : 'active'} rules found.</p>`;
        return;
    }

    sorted.forEach(rule => {
        const div = document.createElement('div');
        div.className = 'member-row';

        let labelStr = '';
        if (rule.mode === 'recurring') {
            labelStr = `Every ${daysMap[parseInt(rule.day)]}`;
        } else {
            labelStr = new Date(rule.date).toLocaleDateString('en-GB');
        }

        const timeStr = ` (${rule.start} - ${rule.end})`;

        let targetStr = 'All Members';
        if (rule.targetMembers && !rule.targetMembers.includes('all')) {
            targetStr = rule.targetMembers.length + ' Member(s)';
        }

        div.innerHTML = `
            <div class="member-info">
                <span class="member-name">${labelStr}<span style="font-size: 0.8em; color: var(--text-muted);">${timeStr}</span></span>
            </div>
            <div class="member-actions" style="gap: 1rem; align-items: center;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">${targetStr}</span>
                <span class="exception-badge ${rule.type}">${rule.type === 'include' ? 'Included' : 'Excluded'}</span>
                <button class="delete-member-btn" onclick="removeRule('${rule.id}')" title="Delete Rule">🗑️</button>
            </div>
        `;
        listEl.appendChild(div);
    });
};

window.addScheduleRule = function () {
    const mode = ruleModeSelect.value;
    const type = ruleTypeSelect.value;
    const start = ruleStart.value || "18:30";
    const end = ruleEnd.value || "21:30";

    // V33: Extract multiple selected targets
    const targetDropdown = document.getElementById('ruleTargetDropdown');
    const checkedBoxes = Array.from(targetDropdown.querySelectorAll('input[type="checkbox"]:checked'));
    const selectedTargets = checkedBoxes.map(cb => cb.value);

    // If "All members" is selected alongside specific people, just collapse it to "all"
    const finalTargets = selectedTargets.includes('all') || selectedTargets.length === 0 ? ['all'] : selectedTargets;

    const rule = {
        id: Date.now().toString(),
        mode: mode,
        type: type,
        start: start,
        end: end,
        targetMembers: finalTargets
    };

    if (mode === 'recurring') {
        rule.day = ruleDaySelect.value;
    } else {
        const dateInput = ruleDateInput.value;
        if (!dateInput) {
            alert("Please select a date.");
            return;
        }
        rule.date = dateInput;
    }

    scheduleRules.push(rule);
    localStorage.setItem('schedule_rules', JSON.stringify(scheduleRules));
    renderRules();
};

window.removeRule = function (id) {
    const ruleIndex = scheduleRules.findIndex(r => r.id === id);
    if (ruleIndex > -1) {
        const rule = scheduleRules[ruleIndex];
        if (!rule.deleted) {
            // Stage 1: Soft-delete (Archive)
            rule.deleted = true;
            rule.deletedAt = Date.now();
        } else {
            // Stage 2: Hard-delete (permanently destroy rule)
            openDeleteRuleModal(id);
            return; // Exit early to wait for modal confirmation
        }
        localStorage.setItem('schedule_rules', JSON.stringify(scheduleRules));
        renderRules();
    }
};

let ruleToDelete = null;

window.openDeleteRuleModal = function (id) {
    ruleToDelete = id;
    let overlay = document.getElementById('deleteRuleOverlay');

    // Anti-cache fallback: dynamically inject the modal if the browser has a cached index.html
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'deleteRuleOverlay';
        overlay.className = 'admin-overlay';
        overlay.innerHTML = `
            <div class="pin-container profile-card" style="text-align: center;">
                <div class="pin-header" style="justify-content: center; margin-bottom: 1rem;">
                    <h3 style="color: var(--danger);">⚠️ Permanent Deletion</h3>
                </div>
                <p style="color: var(--text-main); margin-bottom: 2rem;">
                    Are you sure you want to permanently delete this rule from historical records? This cannot be undone.
                </p>
                <div style="display: flex; gap: 1rem; width: 100%;">
                    <button class="action-btn sign-in" onclick="executeDeleteRule()" style="background-color: var(--danger); flex: 1;">Delete</button>
                    <button class="secondary-btn" onclick="closeDeleteRuleModal()" style="flex: 1;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // Strip any inline 'display: none' that might be lingering from HTML
    overlay.style.display = 'flex';
    // The CSS restricts opacity to 0 unless .visible is mapped
    setTimeout(() => overlay.classList.add('visible'), 10);
};

window.closeDeleteRuleModal = function () {
    ruleToDelete = null;
    const overlay = document.getElementById('deleteRuleOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.style.display = 'none', 300); // Wait for CSS transition
    }
};

window.executeDeleteRule = function () {
    if (!ruleToDelete) return;
    const ruleIndex = scheduleRules.findIndex(r => r.id === ruleToDelete);
    if (ruleIndex > -1) {
        scheduleRules.splice(ruleIndex, 1);
        localStorage.setItem('schedule_rules', JSON.stringify(scheduleRules));
        renderRules();
    }
    closeDeleteRuleModal();
};

window.updateMemberType = function (name, newType) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.type = newType;
        member.role = newType;
        localStorage.setItem('system_members', JSON.stringify(systemMembers));
        populateMemberFilter();
        renderMembers(); // Re-render to apply class updates
    }
};

// Reports Logic
function populateMemberFilter() {
    // 1. Populate Schedule Rules specific target multi-select
    const ruleTargetDropdown = document.getElementById('ruleTargetDropdown');
    const ruleTargetBtn = document.getElementById('ruleTargetBtn');
    if (ruleTargetDropdown) {
        ruleTargetDropdown.innerHTML = `
            <label class="multi-select-label">
                <input type="checkbox" value="all" checked onchange="handleMultiSelectChange('ruleTargetContainer')"> All members
            </label>
        `;
        systemMembers.filter(m => {
            const mStatus = m.status || (m.deleted ? 'archived' : 'active');
            const mRole = m.role || m.type || 'guest';
            return mStatus === 'active' && mRole === 'member';
        }).forEach(m => {
            const label = document.createElement('label');
            label.className = 'multi-select-label';
            label.innerHTML = `<input type="checkbox" value="${m.name}" onchange="handleMultiSelectChange('ruleTargetContainer')"> ${m.name}`;
            ruleTargetDropdown.appendChild(label);
        });
        updateMultiSelectBtnState('ruleTargetContainer');
    }

    // 2. Refresh the Report Filter
    populateReportTargetMembers();
}

window.toggleReportFilters = function () {
    const reportType = document.getElementById('reportType');
    const statusGroup = document.getElementById('reportStatusGroup');

    if (!reportType || !statusGroup) return;

    if (reportType.value === 'training') {
        // Training implicitly applies to Active members only, so we hide the status filter.
        statusGroup.style.display = 'none';

        // Ensure the status filter is internally set to 'active' before repopulating
        const statusSelect = document.getElementById('reportStatusFilter');
        if (statusSelect) statusSelect.value = 'active';

    } else {
        // General attendance allows selecting active/archived/all
        statusGroup.style.display = 'flex';
    }

    // Refresh the target members list based on the new visual state
    populateReportTargetMembers();
};

window.populateReportTargetMembers = function () {
    const statusSelect = document.getElementById('reportStatusFilter');
    const memberDropdown = document.getElementById('reportMemberDropdown');
    const memberBtn = document.getElementById('reportMemberBtn');
    if (!statusSelect || !memberDropdown) return;

    const statusMode = statusSelect.value;
    memberDropdown.innerHTML = `
        <label class="multi-select-label">
            <input type="checkbox" value="all" checked onchange="handleMultiSelectChange('reportMemberContainer')"> All in category
        </label>
    `;

    let availableProfiles = [];

    if (statusMode === 'all') {
        availableProfiles = [...systemMembers];
    } else {
        availableProfiles = systemMembers.filter(m => {
            const mStatus = m.status || (m.deleted ? 'archived' : 'active');
            return mStatus === statusMode;
        });
    }

    availableProfiles.sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
        const label = document.createElement('label');
        label.className = 'multi-select-label';
        label.innerHTML = `<input type="checkbox" value="${m.name}" onchange="handleMultiSelectChange('reportMemberContainer')"> ${m.name}`;
        memberDropdown.appendChild(label);
    });
    updateMultiSelectBtnState('reportMemberContainer');
};

function generateReport() {
    const type = reportType.value;
    const start = reportStart.value;
    const end = reportEnd.value;

    let filtered = attendanceData;

    if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(s => new Date(s.signIn) >= startDate);
    }
    if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(s => new Date(s.signIn) <= endDate);
    }

    // V33: Multi-Select Filter Parsing
    const memberDropdown = document.getElementById('reportMemberDropdown');
    const checkedBoxes = Array.from(memberDropdown.querySelectorAll('input[type="checkbox"]:checked'));
    const selectedTargets = checkedBoxes.map(cb => cb.value);
    const filterAll = selectedTargets.includes('all') || selectedTargets.length === 0;

    const statusMode = document.getElementById('reportStatusFilter').value;

    // Filter by explicit selection OR by general category
    if (!filterAll) {
        filtered = filtered.filter(s => selectedTargets.includes(s.name));
    } else if (statusMode !== 'all') {
        const matchingNames = systemMembers.filter(m => (m.status || (m.deleted ? 'archived' : 'active')) === statusMode).map(m => m.name);
        filtered = filtered.filter(s => matchingNames.includes(s.name));
    }

    if (type === 'general') {
        renderGeneralReport(filtered);
    } else {
        renderTrainingReport(filtered, selectedTargets, filterAll, statusMode);
    }
}

function renderGeneralReport(data) {
    reportTableHeader.innerHTML = '<tr><th>Name</th><th>Date</th><th>Sign In</th><th>Sign Out</th><th>Duration</th></tr>';
    reportTableBody.innerHTML = '';
    reportResult.classList.remove('hidden');

    if (data.length === 0) {
        reportTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No matching records found.</td></tr>';
        return;
    }

    data.forEach(session => {
        const row = document.createElement('tr');
        const signInStr = new Date(session.signIn).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const signOutStr = new Date(session.signOut).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        row.innerHTML = `
            <td><strong>${session.name}</strong></td>
            <td>${session.date}</td>
            <td>${signInStr}</td>
            <td>${signOutStr}</td>
            <td>${session.duration} hrs</td>
        `;
        reportTableBody.appendChild(row);
    });
}

function renderTrainingReport(data, selectedTargets = [], filterAll = true, statusMode = 'active') {
    reportTableHeader.innerHTML = '<tr><th>Member Name</th><th>Training Joined</th><th>Total Required</th><th>Attendance %</th><th>Status</th></tr>';
    reportTableBody.innerHTML = '';
    reportResult.classList.remove('hidden');

    let membersOnly = systemMembers.filter(m => {
        const mStatus = m.status || (m.deleted ? 'archived' : 'active');
        const mRole = m.role || m.type || 'guest';

        // Match general filter selection
        if (mRole !== 'member') return false;
        if (statusMode !== 'all' && mStatus !== statusMode) return false;

        // Match explicit targets if not 'all'
        if (!filterAll && !selectedTargets.includes(m.name)) return false;

        return true;
    });

    if (membersOnly.length === 0) {
        reportTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No members match the selected criteria.</td></tr>';
        return;
    }

    if (data.length === 0 && (!reportStart.value || !reportEnd.value)) {
        reportTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No attendance data available. Please select a correct date range.</td></tr>';
        return;
    }

    let rangeStartDt = reportStart.value ? new Date(reportStart.value) : new Date(Math.min(...data.map(s => new Date(s.signIn))));
    let rangeEndDt = reportEnd.value ? new Date(reportEnd.value) : new Date();

    rangeStartDt.setHours(0, 0, 0, 0);
    rangeEndDt.setHours(23, 59, 59, 999);

    if (isNaN(rangeStartDt.getTime())) {
        reportTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Invalid date range.</td></tr>';
        return;
    }

    // Helper to see if a session falls within a rule's time bounds
    const isSessionInRuleBounds = (session, rule) => {
        const dt = new Date(session.signIn);
        const logTimeStart = dt.getHours() * 60 + dt.getMinutes();

        const dtOut = new Date(session.signOut || session.signIn);
        const logTimeEnd = dtOut.getHours() * 60 + dtOut.getMinutes();

        const [startH, startM] = (rule.start || "18:30").split(':').map(Number);
        const [endH, endM] = (rule.end || "21:30").split(':').map(Number);
        const rangeStart = startH * 60 + startM;
        const rangeEnd = endH * 60 + endM;

        return logTimeStart <= rangeEnd && logTimeEnd >= rangeStart;
    };

    membersOnly.forEach(m => {
        let expectedTrainingDays = 0;
        let validTrainingSessions = [];

        const memberCreatedAt = m.createdAt ? new Date(m.createdAt) : new Date(0); // Fallback to beginning of time
        memberCreatedAt.setHours(0, 0, 0, 0);

        // 1. Calculate the denominator for THIS specific member
        for (let d = new Date(rangeStartDt); d <= rangeEndDt; d.setDate(d.getDate() + 1)) {
            // Skip days before the member was created
            if (d < memberCreatedAt) continue;

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            const dayOfWeek = d.getDay().toString();

            // Find applicable rules for this date. Order of precedence: Specific Date > Recurring
            const specificRules = scheduleRules.filter(r => r.mode === 'specific' && r.date === dateString && (!r.deleted || !r.deletedAt || d.getTime() < r.deletedAt));
            const recurringRules = scheduleRules.filter(r => r.mode === 'recurring' && r.day === dayOfWeek && (!r.deleted || !r.deletedAt || d.getTime() < r.deletedAt));

            const activeRules = [...specificRules, ...recurringRules];

            let isExcluded = false;
            let targetedByRule = null;

            for (const r of activeRules) {
                const targets = r.targetMembers || ['all'];
                if (targets.includes('all') || targets.includes(m.name)) {
                    if (r.type === 'exclude') {
                        isExcluded = true;
                    } else if (r.type === 'include' && !targetedByRule) {
                        targetedByRule = r;
                    }
                }
            }

            if (targetedByRule && !isExcluded) {
                expectedTrainingDays++;

                // Filter the member's data on this day intersecting the time bounds
                const sessionsThatDay = data.filter(s => {
                    if (s.name !== m.name) return false;
                    const sDate = new Date(s.signIn);
                    return sDate.getFullYear() === year && sDate.getMonth() + 1 === parseInt(month) && sDate.getDate() === parseInt(day);
                });

                const validOverlaps = sessionsThatDay.filter(s => isSessionInRuleBounds(s, targetedByRule));
                if (validOverlaps.length > 0) {
                    // Mark this day as attended for the member
                    validTrainingSessions.push(dateString);
                }
            }
        }

        // Count unique dates attended by this member
        const memberAttended = [...new Set(validTrainingSessions)].length;

        const percentage = expectedTrainingDays > 0 ? ((memberAttended / expectedTrainingDays) * 100).toFixed(0) : 100; // If 0 required, technically 100% compliant
        const isCompliant = percentage >= 60;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${m.name}</strong></td>
            <td>${memberAttended}</td>
            <td>${expectedTrainingDays}</td>
            <td>${percentage}%</td>
            <td><span class="badge-type ${isCompliant ? 'badge-member' : 'badge-guest'}">${isCompliant ? 'Compliant' : 'Below 60%'}</span></td>
        `;
        reportTableBody.appendChild(row);
    });
}

function exportReport() {
    const type = reportType.value;
    const start = reportStart.value;
    const end = reportEnd.value;

    let filtered = attendanceData;
    if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(s => new Date(s.signIn) >= startDate);
    }
    if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(s => new Date(s.signIn) <= endDate);
    }

    if (filtered.length === 0) {
        alert('No data to export');
        return;
    }

    let csvRows = [];
    let filename = "";

    if (type === 'general') {
        const memberDropdown = document.getElementById('reportMemberDropdown');
        const checkedBoxes = Array.from(memberDropdown.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedTargets = checkedBoxes.map(cb => cb.value);
        const filterAll = selectedTargets.includes('all') || selectedTargets.length === 0;
        const statusMode = document.getElementById('reportStatusFilter').value;

        if (!filterAll) {
            filtered = filtered.filter(s => selectedTargets.includes(s.name));
        } else if (statusMode !== 'all') {
            const matchingNames = systemMembers.filter(m => (m.status || (m.deleted ? 'archived' : 'active')) === statusMode).map(m => m.name);
            filtered = filtered.filter(s => matchingNames.includes(s.name));
        }

        csvRows.push("Name,Date,Sign In,Sign Out,Duration (hrs)");
        filtered.forEach(row => {
            csvRows.push(`"${row.name}",${row.date},${row.signIn},${row.signOut},${row.duration}`);
        });
        filename = `Attendance_Log_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
        csvRows.push("Member Name,Training Joined,Total Required,Attendance %,Status");

        const memberDropdown = document.getElementById('reportMemberDropdown');
        const checkedBoxes = Array.from(memberDropdown.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedTargets = checkedBoxes.map(cb => cb.value);
        const filterAll = selectedTargets.includes('all') || selectedTargets.length === 0;
        const statusMode = document.getElementById('reportStatusFilter').value;

        let membersOnly = systemMembers.filter(m => {
            const mStatus = m.status || (m.deleted ? 'archived' : 'active');
            const mRole = m.role || m.type || 'guest';
            if (mRole !== 'member') return false;
            if (statusMode !== 'all' && mStatus !== statusMode) return false;
            if (!filterAll && !selectedTargets.includes(m.name)) return false;
            return true;
        });

        let rangeStartDt = reportStart.value ? new Date(reportStart.value) : new Date(Math.min(...filtered.map(s => new Date(s.signIn))));
        let rangeEndDt = reportEnd.value ? new Date(reportEnd.value) : new Date();

        // If no attendance data exists to extract a start date from, default to a 30-day lookback window
        if (isNaN(rangeStartDt.getTime())) {
            rangeStartDt = new Date();
            rangeStartDt.setDate(rangeStartDt.getDate() - 30);
        }

        rangeStartDt.setHours(0, 0, 0, 0);
        rangeEndDt.setHours(23, 59, 59, 999);

        const isSessionInRuleBounds = (session, rule) => {
            const dt = new Date(session.signIn);
            const logTimeStart = dt.getHours() * 60 + dt.getMinutes();
            const dtOut = new Date(session.signOut || session.signIn);
            const logTimeEnd = dtOut.getHours() * 60 + dtOut.getMinutes();
            const [startH, startM] = (rule.start || "18:30").split(':').map(Number);
            const [endH, endM] = (rule.end || "21:30").split(':').map(Number);
            const rangeStart = startH * 60 + startM;
            const rangeEnd = endH * 60 + endM;
            return logTimeStart <= rangeEnd && logTimeEnd >= rangeStart;
        };

        membersOnly.forEach(m => {
            let expectedTrainingDays = 0;
            let validTrainingSessions = [];

            let memberCreatedAt = m.createdAt ? new Date(m.createdAt) : new Date(0);

            // Backdate correction: If they have logs older than their createdAt time (V32 schema patch), 
            // artificial limit is removed so they don't get 100% false compliance.
            const memberLogs = attendanceData.filter(s => s.name === m.name);
            if (memberLogs.length > 0) {
                const firstLogTime = Math.min(...memberLogs.map(s => new Date(s.signIn).getTime()));
                if (firstLogTime < memberCreatedAt.getTime()) {
                    memberCreatedAt = new Date(firstLogTime);
                }
            }

            memberCreatedAt.setHours(0, 0, 0, 0);

            for (let d = new Date(rangeStartDt); d <= rangeEndDt; d.setDate(d.getDate() + 1)) {
                if (d < memberCreatedAt) continue;

                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                const dayOfWeek = d.getDay().toString();

                const specificRules = scheduleRules.filter(r => r.mode === 'specific' && r.date === dateString && (!r.deleted || !r.deletedAt || d.getTime() < r.deletedAt));
                const recurringRules = scheduleRules.filter(r => r.mode === 'recurring' && r.day === dayOfWeek && (!r.deleted || !r.deletedAt || d.getTime() < r.deletedAt));

                const activeRules = [...specificRules, ...recurringRules];

                let isExcluded = false;
                let targetedByRule = null;

                for (const r of activeRules) {
                    const targets = r.targetMembers || ['all'];
                    if (targets.includes('all') || targets.includes(m.name)) {
                        if (r.type === 'exclude') {
                            isExcluded = true;
                        } else if (r.type === 'include' && !targetedByRule) {
                            targetedByRule = r;
                        }
                    }
                }

                if (targetedByRule && !isExcluded) {
                    expectedTrainingDays++;
                    const sessionsThatDay = filtered.filter(s => {
                        if (s.name !== m.name) return false;
                        const sDate = new Date(s.signIn);
                        return sDate.getFullYear() === year && sDate.getMonth() + 1 === parseInt(month) && sDate.getDate() === parseInt(day);
                    });

                    const validOverlaps = sessionsThatDay.filter(s => isSessionInRuleBounds(s, targetedByRule));
                    if (validOverlaps.length > 0) validTrainingSessions.push(dateString);
                }
            }

            const memberAttended = [...new Set(validTrainingSessions)].length;
            const percentage = expectedTrainingDays > 0 ? ((memberAttended / expectedTrainingDays) * 100).toFixed(0) : 100;
            csvRows.push(`"${m.name}",${memberAttended},${expectedTrainingDays},${percentage}%,${percentage >= 60 ? 'Compliant' : 'Below 60%'}`);
        });
        filename = `Training_Attendance_Stats_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const BOM = '\uFEFF'; // UTF-8 BOM
    const csvContent = BOM + csvRows.join('\n');
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Global exposure for onclick
window.removeMember = removeMember;
window.editMemberName = editMemberName;

// Boot
init();
