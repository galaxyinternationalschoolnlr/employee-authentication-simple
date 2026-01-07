// --- CONFIGURATION ---
const LATE_THRESHOLD_HOUR = 8;        // Changed from 9 to 8
const LATE_THRESHOLD_MIN = 45;        // Changed from 0 to 45
const MIN_WORK_HOURS = 8;             // Changed from 9 to 8
const MIN_WORK_MINUTES = 30;          // Added for 8hr 30min

const RESET_CODE = "RESET123";        // Special code for data reset

// --- STATE MANAGEMENT ---
let currentStaff = null; // Will hold the full employee object (name, id, photo)
const activeSessions = {};          // Will hold { id: Date } pairs

// -- Persistence helpers --
function saveSessions() {
    localStorage.setItem('activeSessions',
        JSON.stringify(Object.fromEntries(
            Object.entries(activeSessions).map(([id, date]) => [id, date.toISOString()])
        ))
    );
}

function loadSessions() {
    const data = localStorage.getItem('activeSessions');
    if (data) {
        const parsed = JSON.parse(data);
        for (const id in parsed) {
            if (parsed.hasOwnProperty(id)) {
                activeSessions[id] = new Date(parsed[id]);
            }
        }
    }
}
function clearSessions() {
    localStorage.removeItem('activeSessions');
    for (const id in activeSessions) {
        delete activeSessions[id];
    }
}

// ---- Restore session data and table on page load ----
function restoreLogTable() {
    loadSessions();
    const table = document.getElementById('log-table');
    for (const id in activeSessions) {
        // Show row as 'working', no checkOut info
        // Try to find employee in database
        const empObj = (typeof employeeDatabase !== "undefined")
            ? employeeDatabase.find(emp => emp.id === id)
            : null;
        const displayName = empObj ? empObj.name : id;
        const displayId = id;
        // Assume check-in time was
        const checkInTime = activeSessions[id];
        const timeString = checkInTime.toLocaleTimeString('en-US', { hour12: true });
        // Late check-in?
        const lateLimit = new Date(checkInTime);
        lateLimit.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MIN, 0);
        const isLate = checkInTime > lateLimit;
        const timeClass = isLate ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";

        const row = document.createElement('tr');
        row.id = `row-${displayId}`;
        row.className = "hover:bg-slate-800/30 transition-colors group";
        row.innerHTML = `
            <td class="p-4">
                <div class="font-bold text-white">${displayName}</div>
                <div class="text-[10px] text-slate-500">${displayId}</div>
            </td>
            <td class="p-4 ${timeClass}">
                ${timeString} ${isLate ? '<i class="fas fa-exclamation-circle ml-1 text-[10px]"></i>' : ''}
            </td>
            <td class="p-4 text-slate-600 font-mono" id="out-${displayId}">--:--:--</td>
            <td class="p-4 text-slate-600 font-mono" id="dur-${displayId}">0h 0m</td>
            <td class="p-4 text-right">
                <span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold">WORKING</span>
            </td>
        `;
        table.appendChild(row);
    }
}
restoreLogTable();

// 1. Live Clock
setInterval(() => {
    document.getElementById('live-clock').innerText = new Date().toLocaleTimeString();
}, 1000);

// 2. Camera & Authentication Logic
async function startAuth() {
    const idInput = document.getElementById('sid');
    const enteredId = idInput.value.toUpperCase().trim();

    // --- SPECIAL RESET CODE ---
    if (enteredId === RESET_CODE) {
        clearSessions();
        document.getElementById('log-table').innerHTML = '';
        alert('System has been reset!');
        idInput.value = "";
        return;
    }

    if(!enteredId) return alert("Please Enter Staff ID");

    // --- LOOKUP IN DATABASE (employeeDatabase from config.js assumed) ---
    const foundEmployee = employeeDatabase.find(emp => emp.id === enteredId);

    if (!foundEmployee) {
        alert("ACCESS DENIED: Staff ID not found in system.");
        idInput.value = ""; // Clear bad input
        return; 
    }

    // Store found user for later
    currentStaff = foundEmployee; 

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const v = document.getElementById('v');
        v.srcObject = stream;

        v.classList.remove('opacity-50', 'grayscale');
        document.getElementById('cam-overlay').classList.add('hidden');
        document.getElementById('line').style.display = 'block';

        document.getElementById('scan-btn').innerText = `VERIFYING: ${currentStaff.name.toUpperCase()}...`;
        document.getElementById('scan-btn').disabled = true;

        setTimeout(() => {
            document.getElementById('line').style.display = 'none';
            document.getElementById('input-ui').classList.add('hidden');
            document.getElementById('action-ui').classList.remove('hidden');
            v.classList.add('opacity-50', 'grayscale');
        }, 2000);

    } catch (e) {
        alert("Camera Access Denied.");
    }
}

// 3. Process Check In / Check Out
function processAttendance(type) {
    const table = document.getElementById('log-table');
    const emptyState = document.getElementById('empty-state');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: true });

    if(emptyState) emptyState.style.display = 'none';

    const displayName = currentStaff ? currentStaff.name : (typeof currentId !== 'undefined' ? currentId : "UNKNOWN");
    const displayId = currentStaff ? currentStaff.id : "UNKNOWN";

    if (type === 'IN') {
        if(activeSessions[displayId]) return alert("You are already clocked in!");

        const lateLimit = new Date();
        lateLimit.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MIN, 0);
        const isLate = now > lateLimit;
        const timeClass = isLate ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";

        activeSessions[displayId] = now;
        saveSessions();

        const row = document.createElement('tr');
        row.id = `row-${displayId}`;
        row.className = "hover:bg-slate-800/30 transition-colors group";

        row.innerHTML = `
            <td class="p-4">
                <div class="font-bold text-white">${displayName}</div>
                <div class="text-[10px] text-slate-500">${displayId}</div>
            </td>
            <td class="p-4 ${timeClass}">
                ${timeString} ${isLate ? '<i class="fas fa-exclamation-circle ml-1 text-[10px]"></i>' : ''}
            </td>
            <td class="p-4 text-slate-600 font-mono" id="out-${displayId}">--:--:--</td>
            <td class="p-4 text-slate-600 font-mono" id="dur-${displayId}">0h 0m</td>
            <td class="p-4 text-right">
                <span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold">WORKING</span>
            </td>
        `;
        table.prepend(row);

    } else if (type === 'OUT') {
        if(!activeSessions[displayId]) return alert("No active Check-In found for this ID!");

        const startTime = activeSessions[displayId];
        const diffMs = now - startTime;

        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);

        // Minimum duration in ms for 8hr 30min
        const minWorkMs = (MIN_WORK_HOURS * 60 + MIN_WORK_MINUTES) * 60 * 1000;
        const isShort = diffMs < minWorkMs;
        const durClass = isShort ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";

        const outCell = document.getElementById(`out-${displayId}`);
        const durCell = document.getElementById(`dur-${displayId}`);
        const row = document.getElementById(`row-${displayId}`);

        outCell.innerText = timeString;
        outCell.className = "p-4 text-slate-300 font-mono";
        durCell.innerHTML = `${diffHrs}h ${diffMins}m ${isShort ? '<i class="fas fa-clock ml-1 text-[10px]"></i>' : ''}`;
        durCell.className = `p-4 ${durClass}`;

        row.lastElementChild.innerHTML = `
            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">DONE</span>
        `;
        delete activeSessions[displayId];
        saveSessions();
    }
    resetSystem();
}

function resetSystem() {
    setTimeout(() => {
        document.getElementById('action-ui').classList.add('hidden');
        document.getElementById('input-ui').classList.remove('hidden');
        document.getElementById('sid').value = "";
        document.getElementById('scan-btn').innerText = "INITIATE SCAN";
        document.getElementById('scan-btn').disabled = false;

        const v = document.getElementById('v');
        if(v.srcObject) {
            v.srcObject.getTracks().forEach(track => track.stop());
        }
        v.srcObject = null;
        document.getElementById('cam-overlay').classList.remove('hidden');
        currentStaff = null;
    }, 1000);
}

function exportData() {
    alert("Exporting data to .XLSX for Payroll...");
}

// Press Enter to Scan
document.getElementById('sid').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        startAuth();
    }
});
