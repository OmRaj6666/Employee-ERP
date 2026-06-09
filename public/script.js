// Robust frontend logic for employee-website
async function loadEmployees(){
    try{
        const res = await fetch('/employees', { credentials: 'same-origin' });
        const data = await res.json();

        document.getElementById('count').innerText = data.length || 0;

        const depts = new Set();
        let totalSalary = 0;

        const reservedSet = new Set(JSON.parse(localStorage.getItem('reservedEmployees') || '[]'));

        const rows = data.map(emp => {
            depts.add(emp.dept || '—');
            totalSalary += Number(emp.salary) || 0;
            const reserved = reservedSet.has(String(emp.emp_id));
            return `
                <tr data-id="${emp.emp_id}" class="${reserved? 'reserved-row':''}">
                    <td>${emp.emp_id}</td>
                    <td>${emp.fname} ${emp.lname}</td>
                    <td>${emp.dept}</td>
                    <td>₹${emp.salary}</td>
                    <td>
                      <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${emp.emp_id}">Delete</button>
                      <button class="btn btn-outline-secondary btn-sm ms-2" data-action="copy" data-id="${emp.emp_id}">Copy</button>
                      <button class="btn btn-reserve btn-sm ms-2 ${reserved? 'active':''}" data-action="reserve" data-id="${emp.emp_id}">${reserved? 'Reserved':'Reserve'}</button>
                    </td>
                </tr>`;
        }).join('');

        document.getElementById('tableBody').innerHTML = rows;

        document.getElementById('departments').innerText = depts.size || 0;
        document.getElementById('avgSalary').innerText = depts.size? `₹${Math.round(totalSalary / (data.length || 1))}` : '—';

        // table actions are handled via delegated listener attached once on DOMContentLoaded

    }catch(err){
        console.error(err);
    }
}

async function addEmployee(){
    const fname = document.getElementById('fname');
    const lname = document.getElementById('lname');
    const email = document.getElementById('email');
    const dept = document.getElementById('dept');
    const salary = document.getElementById('salary');

    const payload = {
        fname: fname.value.trim(),
        lname: lname.value.trim(),
        email: email.value.trim(),
        dept: dept.value.trim(),
        salary: salary.value.trim()
    };

    const addBtn = document.getElementById('addEmployeeBtn');
    try{
        if(addBtn){ addBtn.disabled = true; addBtn.innerText = 'Adding...'; }
        const res = await fetch('/employees', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'same-origin',
            body: JSON.stringify(payload)
        });

        if(!res.ok) throw new Error(await res.text());

        // clear form
        [fname,lname,email,dept,salary].forEach(i=>i.value='');
        showToast('Employee added');
        await loadEmployees();
    }catch(err){
        console.error(err);
        showToast('Failed to add employee');
    } finally {
        if(addBtn){ addBtn.disabled = false; addBtn.innerText = 'Add Employee'; }
    }
}

async function deleteEmployee(id, btn){
    try{
        if(!confirm('Delete employee #' + id + '?')) return;
        if(btn){ btn.disabled = true; btn.innerText = 'Deleting...'; }
        const res = await fetch('/employees/'+id, {method:'DELETE', credentials:'same-origin'});
        if(!res.ok) throw new Error(await res.text());
        showToast('Employee deleted');
        await loadEmployees();
    }catch(err){
        console.error(err);
        showToast('Delete failed');
    } finally {
        if(btn){ btn.disabled = false; btn.innerText = 'Delete'; }
    }
}

async function copyEmployee(id){
    try{
        const tr = document.querySelector(`tr[data-id="${id}"]`);
        if(!tr) return showToast('No record to copy');
        const name = tr.children[1].innerText.trim();
        const dept = tr.children[2].innerText.trim();
        const salary = tr.children[3].innerText.trim();
        const text = `ID: ${id}\nName: ${name}\nDepartment: ${dept}\nSalary: ${salary}`;
        if(navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(text);
            showToast('Employee copied to clipboard');
        } else {
            // fallback
            const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
            showToast('Employee copied to clipboard');
        }
    }catch(err){console.error(err); showToast('Copy failed')}
}

function getReservedSet(){
    return new Set(JSON.parse(localStorage.getItem('reservedEmployees') || '[]'));
}

function toggleReserve(id, btn){
    const set = getReservedSet();
    const sid = String(id);
    if(set.has(sid)){
        set.delete(sid);
        showToast('Reservation removed');
    } else {
        set.add(sid);
        showToast('Reserved');
    }
    localStorage.setItem('reservedEmployees', JSON.stringify(Array.from(set)));
    // refresh row/button UI
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if(tr) tr.classList.toggle('reserved-row');
    if(btn) btn.classList.toggle('active');
    if(btn) btn.innerText = btn.classList.contains('active')? 'Reserved':'Reserve';
}

function showToast(msg, timeout=2500){
    const container = document.getElementById('toast');
    if(!container) return;
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = msg;
    container.appendChild(el);
    // animate in
    requestAnimationFrame(()=> el.classList.add('visible'));
    setTimeout(()=>{ el.classList.remove('visible'); el.classList.add('hide'); setTimeout(()=>el.remove(),300); }, timeout);
}

// Idle auto-logout
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let idleTimer = null;

function resetIdleTimer(){
    if(idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(async ()=>{
        const loggedIn = await checkSession();
        if(loggedIn){
            showToast('Session timed out after 30 minutes of inactivity');
            await logout();
        }
    }, IDLE_TIMEOUT_MS);
}

function setupIdleTracking(){
    ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
}

// Initialize
document.addEventListener('DOMContentLoaded', ()=>{
    // auth gate
    initAuth();
    // wire add button (by id)
    const addBtn = document.getElementById('addEmployeeBtn');
    if(addBtn) addBtn.addEventListener('click', (e)=>{ e.preventDefault(); addEmployee(); });
    // wire profile and report buttons
    const profile = document.getElementById('profileBtn'); if(profile) profile.addEventListener('click', ()=> showToast('Profile clicked'));
    const report = document.getElementById('createReportBtn'); if(report) report.addEventListener('click', ()=> createPdfReport());
    const logoutBtn = document.getElementById('logoutBtn'); if(logoutBtn) logoutBtn.addEventListener('click', logout);
    const logoutMenuBtn = document.getElementById('logoutMenuBtn'); if(logoutMenuBtn) logoutMenuBtn.addEventListener('click', logout);
    // init background parallax
    initBgParallax();
    // attach table delegation once
    const tbody = document.getElementById('tableBody');
    if(tbody) tbody.addEventListener('click', (e)=>{
        const btn = e.target.closest('button');
        if(!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if(action === 'delete') return deleteEmployee(id, btn);
        if(action === 'copy') return copyEmployee(id);
        if(action === 'reserve') return toggleReserve(id, btn);
    });

    setupIdleTracking();
});

function initAuth(){
    const loginScreen = document.getElementById('loginScreen');
    const content = document.querySelector('.content');
    const sidebar = document.querySelector('.sidebar');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutMenuBtn = document.getElementById('logoutMenuBtn');
    checkSession().then((isLoggedIn)=>{
        if(isLoggedIn){
            if(loginScreen) loginScreen.style.display = 'none';
            if(content) content.style.display = '';
            if(sidebar) sidebar.style.display = '';
            if(logoutBtn) logoutBtn.style.display = '';
            if(logoutMenuBtn) logoutMenuBtn.style.display = '';
            loadEmployees();
        } else {
            if(loginScreen) loginScreen.style.display = 'flex';
            if(content) content.style.display = 'none';
            if(sidebar) sidebar.style.display = 'none';
            if(logoutBtn) logoutBtn.style.display = 'none';
            if(logoutMenuBtn) logoutMenuBtn.style.display = 'none';
        }
    }).catch(()=>{
        if(loginScreen) loginScreen.style.display = 'flex';
        if(content) content.style.display = 'none';
        if(sidebar) sidebar.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(logoutMenuBtn) logoutMenuBtn.style.display = 'none';
    });

    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn) loginBtn.onclick = doLogin;
}

async function checkSession(){
    const res = await fetch('/auth/me', { credentials: 'same-origin' });
    if(!res.ok) return false;
    const data = await res.json();
    return Boolean(data.authenticated);
}

async function doLogin(){
    const u = (document.getElementById('loginUser')?.value || '').trim();
    const p = (document.getElementById('loginPass')?.value || '').trim();
    try{
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ username: u, password: p })
        });
        if(!res.ok) throw new Error('Invalid credentials');
        showToast('Login successful');
        initAuth();
    }catch(err){
        showToast('Invalid credentials');
    }
}

async function logout(){
    try{
        await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    }catch(err){
        console.error(err);
    }
    showToast('Logged out');
    initAuth();
}

// Parallax background interaction
function initBgParallax(){
    const bg = document.querySelector('.bg-3d');
    if(!bg) return;
    // disable on touch devices or reduced motion
    if(('ontouchstart' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const shapes = Array.from(bg.querySelectorAll('.shape'));
    // set initial inline left/top if not set
    shapes.forEach(s=>{
        if(!s.style.left) s.style.left = s.style.getPropertyValue('--left') || '10%';
        if(!s.style.top) s.style.top = s.style.getPropertyValue('--top') || '10%';
    });

    let mouseX = 0, mouseY = 0;
    let lx = 0, ly = 0;

    function onMove(e){
        const x = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || window.innerWidth/2;
        const y = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || window.innerHeight/2;
        const cx = window.innerWidth/2, cy = window.innerHeight/2;
        mouseX = (x - cx) / cx;
        mouseY = (y - cy) / cy;
    }

    window.addEventListener('mousemove', onMove, {passive:true});

    function animate(){
        lx += (mouseX - lx) * 0.08;
        ly += (mouseY - ly) * 0.08;

        shapes.forEach(s => {
            const depth = parseFloat(s.dataset.depth) || 0.04;
            const tx = lx * depth * 80; // horizontal move
            const ty = ly * depth * 60; // vertical move
            const rz = depth * 12; // slight rotate
            s.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${ly*rz}deg) rotateY(${lx*rz}deg)`;
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// Create PDF report: bar graph (employees per department) + table
async function createPdfReport(){
    const btn = document.getElementById('createReportBtn');
    if(btn){ btn.disabled = true; btn.innerText = 'Generating...'; }
    try{
        const res = await fetch('/employees', { credentials: 'same-origin' });
        const data = await res.json();

        // prepare counts per department
        const counts = {};
        data.forEach(e => { const d = e.dept || 'Unassigned'; counts[d] = (counts[d]||0) + 1; });
        const labels = Object.keys(counts);
        const values = labels.map(l => counts[l]);

        // draw chart on hidden canvas
        const ctx = document.getElementById('reportChart').getContext('2d');
        // destroy existing chart if any
        if(window._reportChart) { try{ window._reportChart.destroy(); }catch(e){} }
        window._reportChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Employees per Department', data: values, backgroundColor: 'rgba(99,102,241,0.8)' }] },
            options: { responsive: false, plugins: { legend:{ display:false } } }
        });

        // build HTML table for employees
        const tbl = document.getElementById('reportTable');
        let html = '<table style="width:100%;border-collapse:collapse;margin-top:18px">';
        html += '<thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">ID</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Name</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Department</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd">Salary</th></tr></thead>';
        html += '<tbody>';
        data.forEach(e=>{
            html += `<tr><td style="padding:6px;border-bottom:1px solid #f0f0f0">${e.emp_id}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0">${e.fname} ${e.lname}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0">${e.dept || ''}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0">${e.salary}</td></tr>`;
        });
        html += '</tbody></table>';
        tbl.innerHTML = html;

        // wait a moment for chart to render
        await new Promise(r => setTimeout(r, 300));

        // render the reportContent to canvas using html2canvas
        const reportEl = document.getElementById('reportContent');
        const canvas = await html2canvas(reportEl, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        // create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        // scale image to page width with margin
        const margin = 40;
        const imgWidth = pageWidth - margin*2;
        const imgHeight = canvas.height * (imgWidth / canvas.width);
        let y = margin;
        pdf.setFontSize(18);
        pdf.text('Employees Report', pageWidth/2, 30, { align: 'center' });
        pdf.addImage(imgData, 'PNG', margin, y+10, imgWidth, imgHeight);

        pdf.save('employees_report.pdf');
        showToast('Report generated and downloaded');

    }catch(err){
        console.error(err);
        showToast('Failed to generate report');
    } finally {
        if(btn){ btn.disabled = false; btn.innerText = 'Create Report'; }
    }
}