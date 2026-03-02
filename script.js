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
const changePinBtn = document.getElementById('changePinBtn');
const changePinOverlay = document.getElementById('changePinOverlay');
const pinStep1 = document.getElementById('pinStep1');
const pinStep2 = document.getElementById('pinStep2');
const pinStep3 = document.getElementById('pinStep3');
const pinStep4 = document.getElementById('pinStep4');
const pinAuthPassword = document.getElementById('pinAuthPassword');
const newAdminPin = document.getElementById('newAdminPin');
const confirmAdminPin = document.getElementById('confirmAdminPin');
const pinAuthError = document.getElementById('pinAuthError');
const newPinError = document.getElementById('newPinError');
const confirmPinError = document.getElementById('confirmPinError');

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

// Privacy Mode Elements
const privacyModeToggle = document.getElementById('privacyModeToggle');
const manualSignOutBtn = document.getElementById('manualSignOutBtn');

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

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDoIIfPL7Zf30ap1b_qdpY0ktVrFApiLmg",
    authDomain: "attendanceportal-3b6e3.firebaseapp.com",
    projectId: "attendanceportal-3b6e3",
    storageBucket: "attendanceportal-3b6e3.firebasestorage.app",
    messagingSenderId: "251041246418",
    appId: "1:251041246418:web:7d39f86a6f15a96526d10b",
    measurementId: "G-YWZ1CWTE1Y"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// V53: Enable Offline Persistence
db.enablePersistence()
    .catch(function (err) {
        if (err.code == 'failed-precondition') {
            console.log("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
        } else if (err.code == 'unimplemented') {
            console.log("The current browser does not support all of the features required to enable persistence.");
        }
    });
// -------------------------------

// State
let attendanceData = [];
let activeSessions = [];
let systemMembers = [];
let welcomeMessage = '';
let selectedTimezone = 'Australia/Melbourne';
let autoSignOutConfig = { enabled: false, time: "23:00" };
let scheduleRules = [];
let lastAutoSignoutDate = '';
let currentPin = '';
let ADMIN_PIN = '0000';
let isAdminUnlocked = false;
let isPrivacyModeEnabled = false;

// --- FIREBASE SYNC HELPERS ---
function saveSettingsToCloud() {
    if (!auth.currentUser) return;
    db.collection('stations').doc(auth.currentUser.uid).set({
        welcomeMessage,
        selectedTimezone,
        autoSignOutConfig,
        lastAutoSignoutDate,
        adminPin: ADMIN_PIN,
        isPrivacyModeEnabled: isPrivacyModeEnabled
    }, { merge: true });
}

function saveSystemMembersToCloud() {
    if (!auth.currentUser) return;
    db.collection('stations').doc(auth.currentUser.uid).collection('data').doc('members').set({ array: systemMembers });
}

function saveActiveSessionsToCloud() {
    if (!auth.currentUser) return;
    db.collection('stations').doc(auth.currentUser.uid).collection('data').doc('activeSessions').set({ array: activeSessions });
}

function saveAttendanceDataToCloud() {
    if (!auth.currentUser) return;
    db.collection('stations').doc(auth.currentUser.uid).collection('data').doc('attendanceHistory').set({ array: attendanceData });
}

function saveScheduleRulesToCloud() {
    if (!auth.currentUser) return;
    db.collection('stations').doc(auth.currentUser.uid).collection('data').doc('scheduleRules').set({ array: scheduleRules });
}

let unsubscribes = [];
function attachCloudListeners(uid) {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];

    const stationRef = db.collection('stations').doc(uid);
    const dataRef = stationRef.collection('data');

    // Settings Listener
    unsubscribes.push(stationRef.onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            welcomeMessage = data.welcomeMessage || '';
            selectedTimezone = data.selectedTimezone || 'Australia/Melbourne';
            autoSignOutConfig = data.autoSignOutConfig || { enabled: false, time: "23:00" };
            lastAutoSignoutDate = data.lastAutoSignoutDate || '';
            ADMIN_PIN = data.adminPin || '0000';
            isPrivacyModeEnabled = data.isPrivacyModeEnabled || false;

            // V55: Explicitly force 0000 into the cloud if it was missing 
            // (New accounts already trigger the else block below)
            if (!data.adminPin) {
                saveSettingsToCloud();
            }

            welcomeMsgInput.value = welcomeMessage;
            timezoneSelect.value = selectedTimezone;
            autoSignOutToggle.checked = autoSignOutConfig.enabled;
            privacyModeToggle.checked = isPrivacyModeEnabled;
            if (autoSignOutTime) autoSignOutTime.value = autoSignOutConfig.time;

            updateClock();
        } else {
            saveSettingsToCloud();
        }
    }));

    // Data Listeners
    unsubscribes.push(dataRef.doc('members').onSnapshot(doc => {
        const rawMembers = doc.exists ? doc.data().array : [];
        // V52: Sanitize legacy string entries into full data objects instantly
        systemMembers = rawMembers.map(m => {
            if (typeof m === 'string') {
                return {
                    name: m,
                    role: 'member',
                    type: 'member',
                    status: 'active',
                    createdAt: Date.now() - 31536000000 // Safely backdate standard 1 year
                };
            }
            if (m && !m.name) m.name = 'Unknown User'; // Safety fallback
            if (m && !m.role) m.role = m.type || 'member'; // Historical safety fallback
            return m || { name: 'Unknown User', role: 'member', type: 'member', status: 'active', createdAt: Date.now() };
        });

        renderMembers();
        updateSuggestions();
        populateMemberFilter();
    }));

    unsubscribes.push(dataRef.doc('activeSessions').onSnapshot(doc => {
        activeSessions = doc.exists ? doc.data().array : [];
        renderActiveSessions();
    }));

    unsubscribes.push(dataRef.doc('attendanceHistory').onSnapshot(doc => {
        attendanceData = doc.exists ? doc.data().array : [];

        // V63: Auto-Sanitize Corrupted Cloud Data (historical iOS sleep bug)
        let needsSanitization = false;
        attendanceData.forEach(session => {
            if (parseFloat(session.duration) > 16) {
                needsSanitization = true;
                const signInDate = new Date(session.signIn);
                let target = new Date(signInDate);
                const fallbackTime = (typeof autoSignOutConfig !== 'undefined' && autoSignOutConfig.time) ? autoSignOutConfig.time : "02:00";
                const [cfgHour, cfgMinute] = fallbackTime.split(':').map(Number);
                target.setHours(cfgHour, cfgMinute, 0, 0);
                if (target <= signInDate) {
                    target.setDate(target.getDate() + 1);
                }
                session.signOut = target.toISOString();
                const updatedDurationMs = Math.max(0, target - signInDate);
                session.duration = (updatedDurationMs / (1000 * 60 * 60)).toFixed(2);
                console.log(`[V63 Auto-Sanitize] Fixed ${session.name} cross-day session. Duration is now ${session.duration} hours.`);
            }
        });

        if (needsSanitization) {
            saveAttendanceDataToCloud();
        }

        renderAttendance();
    }));

    unsubscribes.push(dataRef.doc('scheduleRules').onSnapshot(doc => {
        scheduleRules = doc.exists ? doc.data().array : [];
        renderRules();
    }));
}
// -----------------------------

// Initialize
function init() {
    // Check for session authentication via Firebase
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            loginView.classList.add('hidden');
            mainView.classList.remove('hidden');

            // V56 & V57: Dynamic Profile Naming
            if (user.email) {
                const prefix = user.email.split('@')[0];
                const capitalizedName = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
                const unitTitle = `${capitalizedName}`;

                // V57: Set the Profile Settings Modal text
                const profileNameNode = document.getElementById('profileNameDisplay');
                if (profileNameNode) profileNameNode.textContent = unitTitle;

                const profileEmailNode = document.getElementById('profileEmailDisplay');
                if (profileEmailNode) profileEmailNode.textContent = user.email;
            }

            attachCloudListeners(user.uid);
        } else {
            // User is signed out.
            loginView.classList.remove('hidden');
            mainView.classList.add('hidden');

            // Unsubscribe listeners when logged out
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];

            // V56: Local Memory Flush (Fix Data Bleed)
            activeSessions = [];
            attendanceData = [];
            systemMembers = [];
            scheduleRules = [];

            renderActiveSessions();
            renderAttendance();
            renderMembers();
            if (typeof renderRules === 'function') renderRules();
        }
    });

    updateClock();
    setInterval(updateClock, 1000);
    setInterval(checkAutoSignOut, 60000); // Check once a minute
    renderAttendance();
    renderActiveSessions();

    // Event Listeners
    signInBtn.addEventListener('click', handleSignIn);
    manualSignOutBtn.addEventListener('click', handleManualSignOut);

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Auto-save Settings UI Listeners
    autoSignOutToggle.addEventListener('change', saveSettings);
    autoSignOutTime.addEventListener('change', saveSettings);
    welcomeMsgInput.addEventListener('change', saveSettings);
    timezoneSelect.addEventListener('change', saveSettings);
    privacyModeToggle.addEventListener('change', saveSettings);

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

    changePinBtn.addEventListener('click', () => {
        pinAuthPassword.value = '';
        newAdminPin.value = '';
        confirmAdminPin.value = '';
        pinAuthError.classList.add('hidden');
        newPinError.classList.add('hidden');
        confirmPinError.classList.add('hidden');

        pinStep1.classList.remove('hidden');
        pinStep2.classList.add('hidden');
        pinStep3.classList.add('hidden');
        pinStep4.classList.add('hidden');

        changePinOverlay.classList.remove('hidden');
        setTimeout(() => changePinOverlay.classList.add('visible'), 10);
    });

    document.getElementById('submitPinAuthBtn').addEventListener('click', () => {
        const password = pinAuthPassword.value;
        if (!password) {
            pinAuthError.textContent = 'Please enter your password.';
            pinAuthError.classList.remove('hidden');
            return;
        }

        const credential = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, password);
        auth.currentUser.reauthenticateWithCredential(credential)
            .then(() => {
                pinAuthError.classList.add('hidden');
                pinStep1.classList.add('hidden');
                pinStep2.classList.remove('hidden');
                newAdminPin.focus();
            })
            .catch((error) => {
                console.error("Reauth Error", error);
                pinAuthError.textContent = 'Invalid Password. Please try again.';
                pinAuthError.classList.remove('hidden');
            });
    });

    document.getElementById('submitNewPinBtn').addEventListener('click', () => {
        const pin = newAdminPin.value;
        if (!/^\d{4}$/.test(pin)) {
            newPinError.classList.remove('hidden');
            return;
        }
        newPinError.classList.add('hidden');
        pinStep2.classList.add('hidden');
        pinStep3.classList.remove('hidden');
        confirmAdminPin.focus();
    });

    document.getElementById('submitConfirmPinBtn').addEventListener('click', () => {
        const pin1 = newAdminPin.value;
        const pin2 = confirmAdminPin.value;

        if (pin1 !== pin2) {
            confirmPinError.classList.remove('hidden');
            return;
        }
        confirmPinError.classList.add('hidden');

        ADMIN_PIN = pin1;
        saveSettingsToCloud();

        pinStep3.classList.add('hidden');
        pinStep4.classList.remove('hidden');
    });

    document.getElementById('finishPinBtn').addEventListener('click', closeChangePinModal);
}

// Authentication logic
function handleLogin() {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login successful. The onAuthStateChanged listener will handle the UI switch.
            loginError.classList.add('hidden');
        })
        .catch((error) => {
            console.error("Login failed:", error);
            loginError.classList.remove('hidden');
        });
}

function handleLogout() {
    auth.signOut().then(() => {
        location.reload();
    });
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
    saveActiveSessionsToCloud();

    // Check if the member already exists in the system
    const existingMember = systemMembers.find(m => m.name.toLowerCase() === name.toLowerCase());

    if (existingMember) {
        // V32 Auto-Reactivation Logic
        if (existingMember.status === 'archived') {
            existingMember.status = 'active';
            existingMember.role = 'guest'; // Auto-reactivated as a Guest
            saveSystemMembersToCloud();
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
        saveSystemMembersToCloud();
        populateMemberFilter();
        if (typeof renderMembers === 'function') renderMembers();
    }

    fullNameInput.value = '';
    renderActiveSessions();
    showToast(`Welcome ${name}`);

    // V52: Play Success Chime
    const sound = document.getElementById('signInChime');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play blocked:", e));
    }

    // V60: Auto-scroll to top so the input is ready for the next person
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Toast Notification Logic
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');

    toastMsg.textContent = message;
    toast.classList.remove('hidden');

    // Slight delay to allow display:block to render before transitioning opacity
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 400); // Wait for transition out
    }, 3000);
}

// Manual Sign Out
function handleManualSignOut() {
    const name = fullNameInput.value.trim();
    if (!name) return;

    const sessionIndex = activeSessions.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
    const signInErrorEl = document.getElementById('signInError');

    if (sessionIndex !== -1) {
        const sessionId = activeSessions[sessionIndex].id;
        handleSignOut(sessionId); // Chime will play here
        fullNameInput.value = '';
        showToast(`Goodbye ${name}`);
    } else {
        signInErrorEl.textContent = 'User not found in active sessions.';
        signInErrorEl.style.color = "var(--danger)";
        signInErrorEl.classList.remove('hidden');
        setTimeout(() => signInErrorEl.classList.add('hidden'), 3000);
    }
}

// Sign Out
function handleSignOut(id, silent = false, overrideSignOutTime = null) {
    const sessionIndex = activeSessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return;

    const session = activeSessions[sessionIndex];
    const signOutTime = overrideSignOutTime || new Date();
    const signInTime = new Date(session.signIn);
    const durationMs = Math.max(0, signOutTime - signInTime); // Prevent negative duration
    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

    const completedSession = {
        ...session,
        signOut: signOutTime.toISOString(),
        duration: durationHours
    };

    attendanceData.unshift(completedSession);
    saveAttendanceDataToCloud();

    activeSessions.splice(sessionIndex, 1);
    saveActiveSessionsToCloud();

    renderActiveSessions();
    renderAttendance();

    // V52: Play Sign-out Chime if not silent
    if (!silent) {
        const sound = document.getElementById('signOutChime');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Audio play blocked:", e));
        }
    }
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

    // Suggest ACTIVE members. When in Privacy Mode, we also suggest signed-in members so they can sign out.
    const matches = systemMembers
        .filter(m => {
            if (m.status !== 'active') return false;
            if (isPrivacyModeEnabled) return true;
            return !activeNames.includes(m.name.toLowerCase());
        })
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

    // V51 Privacy Mode Interceptor
    if (isPrivacyModeEnabled) {
        manualSignOutBtn.classList.remove('hidden');
        if (activeSessions.length === 0) {
            noActiveEl.style.display = 'block';
        } else {
            noActiveEl.style.display = 'none';
        }
        return; // Halt rendering of the actual tiles
    } else {
        manualSignOutBtn.classList.add('hidden');
    }

    if (activeSessions.length === 0) {
        noActiveEl.style.display = 'block';
    } else {
        noActiveEl.style.display = 'none';
    }

    // Sort alphabetically by name before generating the DOM elements
    const sortedSessions = [...activeSessions].sort((a, b) => a.name.localeCompare(b.name));

    sortedSessions.forEach(session => {
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

    // Re-populate dynamic dropdowns whenever we switch to a relevant tab,
    // ensuring Firebase data is always fresh (Firebase is async so init-time
    // calls may happen before data arrives)
    if (tabId === 'settings') {
        populateMemberFilter();
    } else if (tabId === 'members') {
        renderMembers();
    } else if (tabId === 'reports') {
        populateReportTargetMembers();
    }
}

// Settings Logic
function loadSettings() {
    welcomeMsgInput.value = welcomeMessage;
    timezoneSelect.value = selectedTimezone;
    autoSignOutToggle.checked = autoSignOutConfig.enabled;
    autoSignOutTime.value = autoSignOutConfig.time;
    privacyModeToggle.checked = isPrivacyModeEnabled;
    renderRules();
}

function saveSettings() {
    welcomeMessage = welcomeMsgInput.value.trim();
    selectedTimezone = timezoneSelect.value;
    isPrivacyModeEnabled = privacyModeToggle.checked;

    // Reset today's trigger flag if the configuration fundamentally changed so they can test/execute it immediately
    if (autoSignOutTime.value !== (autoSignOutConfig.time || '') || autoSignOutToggle.checked !== autoSignOutConfig.enabled) {
        lastAutoSignoutDate = '';
    }

    autoSignOutConfig = {
        enabled: autoSignOutToggle.checked,
        time: autoSignOutTime.value
    };

    saveSettingsToCloud();

    updateClock();
}

function checkAutoSignOut() {
    if (!autoSignOutConfig.enabled || !autoSignOutConfig.time) return;
    if (activeSessions.length === 0) return;

    const now = new Date();
    const [cfgHour, cfgMinute] = autoSignOutConfig.time.split(':').map(Number);
    const sessionsToSignOut = [];

    // V62: Deterministic Mathematical Sign-Out
    // Evaluate every active session individually to calculate its exact intended sign-out target.
    activeSessions.forEach(session => {
        const signInDate = new Date(session.signIn);

        // Calculate what the target time *would* be on the day they signed in
        let target = new Date(signInDate);
        target.setHours(cfgHour, cfgMinute, 0, 0);

        // If this target is BEFORE or EQUAL to their sign-in time, 
        // their actual auto-sign-out target is that time on the NEXT day.
        if (target <= signInDate) {
            target.setDate(target.getDate() + 1);
        }

        // If the current time has mathematically passed their specific target line, bag them for sign-out.
        if (now >= target) {
            sessionsToSignOut.push({ id: session.id, targetTime: target });
        }
    });

    if (sessionsToSignOut.length > 0) {
        sessionsToSignOut.forEach(s => {
            console.log(`[Auto Sign-Out] Retroactively signing out ${s.id} at exactly ${s.targetTime}`);
            handleSignOut(s.id, true, s.targetTime);
        });

        // V52: Play a single chime for the entire batch
        const sound = document.getElementById('signOutChime');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Audio play blocked:", e));
        }
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
    saveSystemMembersToCloud();
    memberInput.value = '';
    renderMembers();
    populateMemberFilter();
}

function removeMember(name) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.status = 'archived'; // Archive instead of delete
        saveSystemMembersToCloud();
        renderMembers();
        populateMemberFilter();
    }
}

function reactivateMember(name) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.status = 'active';
        member.role = 'guest'; // Defaults to guest upon reactivation
        saveSystemMembersToCloud();
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
            saveSystemMembersToCloud();
            saveAttendanceDataToCloud();
            saveActiveSessionsToCloud();

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
        saveSystemMembersToCloud();
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
        saveSystemMembersToCloud();
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
    saveScheduleRulesToCloud();
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
        saveScheduleRulesToCloud();
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
        saveScheduleRulesToCloud();
        renderRules();
    }
    closeDeleteRuleModal();
};

window.updateMemberType = function (name, newType) {
    const member = systemMembers.find(m => m.name === name);
    if (member) {
        member.type = newType;
        member.role = newType;
        saveSystemMembersToCloud();
        populateMemberFilter();
        renderMembers(); // Re-render to apply class updates
    }
};

// Reports Logic
function populateMemberFilter() {
    // 1. Populate Schedule Rules specific target multi-select
    const ruleTargetDropdown = document.getElementById('ruleTargetDropdown');
    if (ruleTargetDropdown) {
        ruleTargetDropdown.innerHTML = `
            <label class="multi-select-label">
                <input type="checkbox" value="all" checked onchange="handleMultiSelectChange('ruleTargetContainer')"> All members
            </label>
        `;
        // Show ALL active members (both Member and Guest roles) so no one is missed
        systemMembers.filter(m => {
            if (!m || !m.name) return false;
            const mStatus = m.status || (m.deleted ? 'archived' : 'active');
            return mStatus === 'active';
        }).sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
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

    availableProfiles.filter(m => m && m.name).sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
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
        let logTimeEnd = dtOut.getHours() * 60 + dtOut.getMinutes();

        // V63: Handle cross-day overlaps mathematically (if sign-out was next day)
        if (dtOut.getDate() !== dt.getDate() || dtOut.getMonth() !== dt.getMonth() || dtOut.getFullYear() !== dt.getFullYear()) {
            logTimeEnd += 1440; // Add 24 hours to the end bound
        }

        const [startH, startM] = (rule.start || "18:30").split(':').map(Number);
        const [endH, endM] = (rule.end || "21:30").split(':').map(Number);
        const rangeStart = startH * 60 + startM;
        let rangeEnd = endH * 60 + endM;

        // V63: If a training rule supposedly goes past midnight, its rangeEnd would be logically smaller.
        if (rangeEnd < rangeStart) {
            rangeEnd += 1440;
        }

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
            let logTimeEnd = dtOut.getHours() * 60 + dtOut.getMinutes();

            // V63: Handle cross-day overlaps mathematically (if sign-out was next day)
            if (dtOut.getDate() !== dt.getDate() || dtOut.getMonth() !== dt.getMonth() || dtOut.getFullYear() !== dt.getFullYear()) {
                logTimeEnd += 1440;
            }

            const [startH, startM] = (rule.start || "18:30").split(':').map(Number);
            const [endH, endM] = (rule.end || "21:30").split(':').map(Number);
            const rangeStart = startH * 60 + startM;
            let rangeEnd = endH * 60 + endM;

            // V63: If a training rule supposedly goes past midnight, its rangeEnd would be logically smaller.
            if (rangeEnd < rangeStart) {
                rangeEnd += 1440;
            }

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
window.closeChangePinModal = closeChangePinModal;

function closeChangePinModal() {
    changePinOverlay.classList.remove('visible');
    setTimeout(() => {
        changePinOverlay.classList.add('hidden');
    }, 300);
}

// Boot
init();
