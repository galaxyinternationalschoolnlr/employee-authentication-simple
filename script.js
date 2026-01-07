// --- CONFIGURATION ---
const LATE_THRESHOLD_HOUR = 8;   
const LATE_THRESHOLD_MIN = 45; 
const MIN_WORK_HOURS = 8;
const MIN_WORK_MINUTES = 30;     

// --- STATE MANAGEMENT ---
let currentStaff = null; // Will hold the full employee object (name, id, photo)
const activeSessions = {}; 

// 1. Clock
setInterval(() => {
    document.getElementById('live-clock').innerText = new Date().toLocaleTimeString();
}, 1000);

// 2. Camera & Authentication Logic
async function startAuth() {
    const idInput = document.getElementById('sid');
    const enteredId = idInput.value.toUpperCase().trim();

    if(!enteredId) return alert("Please Enter Staff ID");

    // --- NEW STEP: LOOKUP IN DATABASE ---
    // We search the 'employeeDatabase' array from config.js
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
        
        // Show "Verifying: Aruna Devi..."
        document.getElementById('scan-btn').innerText = `VERIFYING: ${currentStaff.name.toUpperCase()}...`;
        document.getElementById('scan-btn').disabled = true;

        setTimeout(() => {
            document.getElementById('line').style.display = 'none';
            document.getElementById('input-ui').classList.add('hidden');
            document.getElementById('action-ui').classList.remove('hidden');
            v.classList.add('opacity-50', 'grayscale');
            
            // Optional: Alert success
            // alert(`Identity Confirmed: ${currentStaff.name}`);
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

    // Use the Name from the database, not just the ID
    const displayName = currentStaff ? currentStaff.name : currentId;
    const displayId = currentStaff ? currentStaff.id : "UNKNOWN";

    if (type === 'IN') {
        if(activeSessions[displayId]) return alert("You are already clocked in!");

        const lateLimit = new Date();
        lateLimit.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MIN, 0);
        const isLate = now > lateLimit;
        const timeClass = isLate ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";
        
        activeSessions[displayId] = now;

        const row = document.createElement('tr');
        row.id = `row-${displayId}`;
        row.className = "hover:bg-slate-800/30 transition-colors group";
        
        // ADDED: Show Name in Bold, ID smaller below it
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

        const outCell = document.getElementById(`out-${displayId}`);
        const durCell = document.getElementById(`dur-${displayId}`);
        const row = document.getElementById(`row-${displayId}`);

        const minWorkMs = (MIN_WORK_HOURS * 60 + MIN_WORK_MINUTES) * 60 * 1000;
        const isShort = diffMs < minWorkMs;
        const durClass = isShort ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";

        outCell.innerText = timeString;
        outCell.className = "p-4 text-slate-300 font-mono";
        durCell.innerHTML = `${diffHrs}h ${diffMins}m ${isShort ? '<i class="fas fa-clock ml-1 text-[10px]"></i>' : ''}`;
        durCell.className = `p-4 ${durClass}`;

        row.lastElementChild.innerHTML = `
            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">DONE</span>
        `;
        delete activeSessions[displayId];
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
        currentStaff = null; // Reset user
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
