// --- CONFIGURATION ---
const LATE_THRESHOLD_HOUR = 9;   // 9:00 AM
const LATE_THRESHOLD_MIN = 0; 
const MIN_WORK_HOURS = 9;        // Red if duration < 9 hrs

// --- STATE MANAGEMENT ---
let currentId = null;
const activeSessions = {}; 

// 1. Clock
setInterval(() => {
    document.getElementById('live-clock').innerText = new Date().toLocaleTimeString();
}, 1000);

// 2. Camera Simulation & Auth
async function startAuth() {
    const idInput = document.getElementById('sid');
    if(!idInput.value) return alert("Please Enter Staff ID");
    currentId = idInput.value.toUpperCase();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const v = document.getElementById('v');
        v.srcObject = stream;
        
        v.classList.remove('opacity-50', 'grayscale');
        document.getElementById('cam-overlay').classList.add('hidden');
        document.getElementById('line').style.display = 'block';
        document.getElementById('scan-btn').innerText = "SCANNING FACE...";
        document.getElementById('scan-btn').disabled = true;

        setTimeout(() => {
            document.getElementById('line').style.display = 'none';
            document.getElementById('input-ui').classList.add('hidden');
            document.getElementById('action-ui').classList.remove('hidden');
            v.classList.add('opacity-50', 'grayscale');
        }, 2000);

    } catch (e) {
        alert("Camera Access Denied. Please enable camera permissions.");
    }
}

// 3. Process Check In / Check Out
function processAttendance(type) {
    const table = document.getElementById('log-table');
    const emptyState = document.getElementById('empty-state');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: true });

    if(emptyState) emptyState.style.display = 'none';

    if (type === 'IN') {
        if(activeSessions[currentId]) return alert("Staff Member already checked in!");

        const lateLimit = new Date();
        lateLimit.setHours(LATE_THRESHOLD_HOUR, LATE_THRESHOLD_MIN, 0);
        const isLate = now > lateLimit;
        const timeClass = isLate ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";
        
        activeSessions[currentId] = now;

        const row = document.createElement('tr');
        row.id = `row-${currentId}`;
        row.className = "hover:bg-slate-800/30 transition-colors group";
        row.innerHTML = `
            <td class="p-4 font-bold text-white tracking-wide">${currentId}</td>
            <td class="p-4 ${timeClass}">
                ${timeString} ${isLate ? '<i class="fas fa-exclamation-circle ml-1 text-[10px]"></i>' : ''}
            </td>
            <td class="p-4 text-slate-600 font-mono" id="out-${currentId}">--:--:--</td>
            <td class="p-4 text-slate-600 font-mono" id="dur-${currentId}">0h 0m</td>
            <td class="p-4 text-right">
                <span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold">WORKING</span>
            </td>
        `;
        table.prepend(row);

    } else if (type === 'OUT') {
        if(!activeSessions[currentId]) return alert("No active Check-In found for this ID!");

        const startTime = activeSessions[currentId];
        const diffMs = now - startTime;
        
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);

        const outCell = document.getElementById(`out-${currentId}`);
        const durCell = document.getElementById(`dur-${currentId}`);
        const row = document.getElementById(`row-${currentId}`);

        const isShort = diffHrs < MIN_WORK_HOURS;
        const durClass = isShort ? "text-rose-500 font-bold" : "text-emerald-400 font-mono";

        outCell.innerText = timeString;
        outCell.className = "p-4 text-slate-300 font-mono";
        durCell.innerHTML = `${diffHrs}h ${diffMins}m ${isShort ? '<i class="fas fa-clock ml-1 text-[10px]"></i>' : ''}`;
        durCell.className = `p-4 ${durClass}`;

        row.lastElementChild.innerHTML = `
            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">DONE</span>
        `;
        delete activeSessions[currentId];
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
