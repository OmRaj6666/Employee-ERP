// Robust frontend logic for employee-website
let employeesCache = [];
const appPrefs = {
    compactTable: localStorage.getItem('compactTable') === 'true',
    reservedOnly: localStorage.getItem('reservedOnly') === 'true'
};

const viewMeta = {
    dashboardView: {
        title: 'Dashboard',
        meta: 'Operational overview for Raj Construction.'
    },
    employeesView: {
        title: 'Employees',
        meta: 'Manage workforce records, departments, and payroll details.'
    },
    reportsView: {
        title: 'Reports',
        meta: 'Review department distribution and payroll totals.'
    },
    settingsView: {
        title: 'Settings',
        meta: 'System health, session details, and local preferences.'
    }
};

function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function formatCurrency(value){
    const amount = Number(value);
    if(!Number.isFinite(amount)) return '—';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatTime(value = new Date()){
    return new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(value);
}

function getCurrentFilters(){
    return {
        search: (document.getElementById('employeeSearch')?.value || '').trim().toLowerCase(),
        department: document.getElementById('departmentFilter')?.value || ''
    };
}

function getFilteredEmployees(){
    const { search, department } = getCurrentFilters();
    const reservedSet = getReservedSet();
    return employeesCache.filter((emp) => {
        const dept = emp.dept || 'Unassigned';
        const haystack = [
            emp.emp_id,
            emp.fname,
            emp.lname,
            emp.email,
            dept,
            emp.salary
        ].join(' ').toLowerCase();

        const matchesSearch = !search || haystack.includes(search);
        const matchesDepartment = !department || dept === department;
        const matchesReserved = !appPrefs.reservedOnly || reservedSet.has(String(emp.emp_id));
        return matchesSearch && matchesDepartment && matchesReserved;
    });
}

function updateDepartmentFilter(data){
    const filter = document.getElementById('departmentFilter');
    if(!filter) return;

    const previous = filter.value;
    const departments = Array.from(new Set(data.map(emp => emp.dept || 'Unassigned'))).sort();
    filter.innerHTML = '<option value="">All departments</option>' + departments.map((dept) => (
        `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`
    )).join('');

    if(departments.includes(previous)) filter.value = previous;
}

function updateSummary(visibleCount, totalCount){
    const summary = document.getElementById('recordSummary');
    if(!summary) return;
    if(!totalCount){
        summary.innerText = 'No employees have been added yet.';
        return;
    }
    summary.innerText = visibleCount === totalCount
        ? `${totalCount} employee${totalCount === 1 ? '' : 's'} in the system`
        : `${visibleCount} of ${totalCount} employee${totalCount === 1 ? '' : 's'} shown`;
}

function getWorkforceMetrics(data = employeesCache){
    const departments = new Map();
    let totalSalary = 0;
    let salaryCount = 0;

    data.forEach((emp) => {
        const dept = emp.dept || 'Unassigned';
        const current = departments.get(dept) || { count: 0, payroll: 0 };
        const salary = Number(emp.salary) || 0;
        current.count += 1;
        current.payroll += salary;
        departments.set(dept, current);
        if(Number.isFinite(Number(emp.salary))){
            totalSalary += salary;
            salaryCount += 1;
        }
    });

    return {
        totalEmployees: data.length,
        departmentCount: departments.size,
        departments,
        totalSalary,
        averageSalary: salaryCount ? totalSalary / salaryCount : null,
        reservedCount: getReservedSet().size
    };
}

function renderMetricBreakdown(containerId, departments){
    const container = document.getElementById(containerId);
    if(!container) return;

    const entries = Array.from(departments.entries()).sort((a, b) => b[1].count - a[1].count);
    if(!entries.length){
        container.innerHTML = '<div class="empty-state">No department data available.</div>';
        return;
    }

    const max = Math.max(...entries.map(([, details]) => details.count), 1);
    container.innerHTML = entries.map(([dept, details]) => {
        const width = Math.max(8, Math.round((details.count / max) * 100));
        return `
            <div class="metric-row">
                <span>
                    <strong>${escapeHtml(dept)}</strong>
                    <span class="employee-subtle">${details.count} employee${details.count === 1 ? '' : 's'} · ${formatCurrency(details.payroll)}</span>
                    <span class="metric-bar" aria-hidden="true"><span style="width:${width}%"></span></span>
                </span>
                <strong>${details.count}</strong>
            </div>`;
    }).join('');
}

function updateDashboard(){
    const metrics = getWorkforceMetrics();
    const snapshot = document.getElementById('dashboardSnapshot');
    if(snapshot){
        snapshot.innerText = metrics.totalEmployees
            ? `${metrics.totalEmployees} employee${metrics.totalEmployees === 1 ? '' : 's'} across ${metrics.departmentCount} department${metrics.departmentCount === 1 ? '' : 's'}.`
            : 'No employee records are available yet.';
    }
    renderMetricBreakdown('dashboardDepartments', metrics.departments);
}

function updateReports(){
    const metrics = getWorkforceMetrics();
    const reportCount = document.getElementById('reportEmployeeCount');
    const payrollTotal = document.getElementById('reportPayrollTotal');
    const reservedCount = document.getElementById('reportReservedCount');
    const reportSummary = document.getElementById('reportSummary');

    if(reportCount) reportCount.innerText = metrics.totalEmployees;
    if(payrollTotal) payrollTotal.innerText = formatCurrency(metrics.totalSalary);
    if(reservedCount) reservedCount.innerText = Array.from(getReservedSet()).filter((id) => employeesCache.some((emp) => String(emp.emp_id) === id)).length;
    if(reportSummary){
        reportSummary.innerText = metrics.totalEmployees
            ? 'This breakdown is generated from the latest employee records.'
            : 'Add employees before generating a meaningful report.';
    }
    renderMetricBreakdown('departmentBreakdown', metrics.departments);
    renderReportInsights(metrics);
}

function updateSettingsUI(){
    document.body.classList.toggle('compact-table', appPrefs.compactTable);
    const compactToggle = document.getElementById('compactModeToggle');
    const reservedToggle = document.getElementById('reservedOnlyToggle');
    if(compactToggle) compactToggle.checked = appPrefs.compactTable;
    if(reservedToggle) reservedToggle.checked = appPrefs.reservedOnly;
}

function updateAllViews(){
    renderEmployees();
    updateDashboard();
    updateReports();
    renderRecentEmployees();
    updateSettingsUI();
}

function updateSyncLabels(){
    const label = `Synced ${formatTime()}`;
    const lastSync = document.getElementById('lastSync');
    const sidebarSync = document.getElementById('sidebarSync');
    if(lastSync) lastSync.innerText = label;
    if(sidebarSync) sidebarSync.innerText = label;
}

function renderRecentEmployees(){
    const container = document.getElementById('recentEmployees');
    if(!container) return;

    const recent = employeesCache.slice(-4).reverse();
    if(!recent.length){
        container.innerHTML = '<div class="empty-state">No recent employees yet.</div>';
        return;
    }

    container.innerHTML = recent.map((emp) => {
        const name = `${emp.fname || ''} ${emp.lname || ''}`.trim() || 'Unnamed employee';
        return `
            <div class="mini-row">
                <span>
                    <strong>${escapeHtml(name)}</strong>
                    <small>${escapeHtml(emp.dept || 'Unassigned')} · ${escapeHtml(emp.email || 'No email')}</small>
                </span>
                <strong>${formatCurrency(emp.salary)}</strong>
            </div>`;
    }).join('');
}

function renderReportInsights(metrics){
    const container = document.getElementById('reportInsights');
    if(!container) return;

    if(!metrics.totalEmployees){
        container.innerHTML = '<div class="empty-state">No insights available until employees are added.</div>';
        return;
    }

    const departmentEntries = Array.from(metrics.departments.entries());
    const largestDepartment = departmentEntries.sort((a, b) => b[1].count - a[1].count)[0];
    const avgPerDepartment = metrics.departmentCount ? metrics.totalEmployees / metrics.departmentCount : 0;
    const activeReservedCount = Array.from(getReservedSet()).filter((id) => employeesCache.some((emp) => String(emp.emp_id) === id)).length;

    container.innerHTML = `
        <div class="insight-card">
            <strong>${escapeHtml(largestDepartment?.[0] || 'Unassigned')}</strong>
            <span>Largest department by headcount</span>
        </div>
        <div class="insight-card">
            <strong>${avgPerDepartment.toFixed(1)}</strong>
            <span>Average employees per department</span>
        </div>
        <div class="insight-card">
            <strong>${activeReservedCount}</strong>
            <span>Reserved records in current dataset</span>
        </div>`;
}

function renderEmployees(){
    const tbody = document.getElementById('tableBody');
    if(!tbody) return;

    const data = getFilteredEmployees();
    const reservedSet = getReservedSet();

    if(!employeesCache.length){
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No employees yet. Add the first record above.</td></tr>';
        updateSummary(0, 0);
        return;
    }

    if(!data.length){
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No employees match the current filters.</td></tr>';
        updateSummary(0, employeesCache.length);
        return;
    }

    const rows = data.map(emp => {
        const id = escapeHtml(emp.emp_id);
        const reserved = reservedSet.has(String(emp.emp_id));
        const name = `${emp.fname || ''} ${emp.lname || ''}`.trim() || 'Unnamed employee';
        const dept = emp.dept || 'Unassigned';
        return `
            <tr data-id="${id}" class="${reserved? 'reserved-row':''}">
                <td>${id}</td>
                <td>
                    <span class="employee-name">${escapeHtml(name)}</span>
                    <span class="employee-subtle">${escapeHtml(emp.email || 'No email')}</span>
                </td>
                <td>${escapeHtml(dept)}</td>
                <td><span class="salary-value">${formatCurrency(emp.salary)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-outline-danger btn-sm" type="button" data-action="delete" data-id="${id}">Delete</button>
                        <button class="btn btn-outline-secondary btn-sm" type="button" data-action="copy" data-id="${id}">Copy</button>
                        <button class="btn btn-reserve btn-sm ${reserved? 'active':''}" type="button" data-action="reserve" data-id="${id}">${reserved? 'Reserved':'Reserve'}</button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    tbody.innerHTML = rows;
    updateSummary(data.length, employeesCache.length);
}

async function loadEmployees(){
    try{
        const tbody = document.getElementById('tableBody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Loading employees...</td></tr>';
        const res = await fetch('/employees', { credentials: 'same-origin' });
        if(!res.ok) throw new Error(await res.text());
        const data = await res.json();
        employeesCache = Array.isArray(data) ? data : [];

        document.getElementById('count').innerText = employeesCache.length || 0;

        const depts = new Set();
        let totalSalary = 0;

        employeesCache.forEach(emp => {
            depts.add(emp.dept || 'Unassigned');
            totalSalary += Number(emp.salary) || 0;
        });

        document.getElementById('departments').innerText = depts.size || 0;
        document.getElementById('avgSalary').innerText = employeesCache.length ? formatCurrency(totalSalary / employeesCache.length) : '—';

        updateDepartmentFilter(employeesCache);
        updateAllViews();
        updateSyncLabels();

    }catch(err){
        console.error(err);
        const tbody = document.getElementById('tableBody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Could not load employee records.</td></tr>';
        updateSummary(0, 0);
        showToast('Failed to load employees');
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
        if(!payload.fname || !payload.lname){
            showToast('First and last name are required');
            return;
        }
        if(payload.salary && Number(payload.salary) < 0){
            showToast('Salary cannot be negative');
            return;
        }
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
        const emp = employeesCache.find((item) => String(item.emp_id) === String(id));
        if(!emp) return showToast('No record to copy');
        const name = `${emp.fname || ''} ${emp.lname || ''}`.trim() || 'Unnamed employee';
        const text = `ID: ${emp.emp_id}\nName: ${name}\nEmail: ${emp.email || 'No email'}\nDepartment: ${emp.dept || 'Unassigned'}\nSalary: ${formatCurrency(emp.salary)}`;
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
    updateDashboard();
    updateReports();
    if(appPrefs.reservedOnly) renderEmployees();
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

function showView(viewId){
    const views = document.querySelectorAll('.app-view');
    const navItems = document.querySelectorAll('.nav-item');
    const current = viewMeta[viewId] || viewMeta.dashboardView;
    views.forEach((view) => view.classList.toggle('active', view.id === viewId));
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === viewId));
    const title = document.getElementById('currentViewTitle');
    const meta = document.getElementById('currentViewMeta');
    if(title) title.innerText = current.title;
    if(meta) meta.innerText = current.meta;
    localStorage.setItem('activeView', viewId);
    if(viewId === 'settingsView') refreshSystemStatus();
}

function setupNavigation(){
    document.querySelectorAll('[data-view]').forEach((item) => {
        item.addEventListener('click', () => showView(item.dataset.view));
    });

    document.querySelectorAll('[data-nav-target]').forEach((item) => {
        item.addEventListener('click', () => showView(item.dataset.navTarget));
    });

    document.querySelectorAll('[data-action="logout"]').forEach((item) => {
        item.addEventListener('click', logout);
    });

    const savedView = localStorage.getItem('activeView');
    if(savedView && document.getElementById(savedView)) showView(savedView);
}

function setupSettings(){
    updateSettingsUI();

    const compactToggle = document.getElementById('compactModeToggle');
    if(compactToggle){
        compactToggle.addEventListener('change', () => {
            appPrefs.compactTable = compactToggle.checked;
            localStorage.setItem('compactTable', String(appPrefs.compactTable));
            updateSettingsUI();
            showToast('Display preference saved');
        });
    }

    const reservedToggle = document.getElementById('reservedOnlyToggle');
    if(reservedToggle){
        reservedToggle.addEventListener('change', () => {
            appPrefs.reservedOnly = reservedToggle.checked;
            localStorage.setItem('reservedOnly', String(appPrefs.reservedOnly));
            renderEmployees();
            updateSettingsUI();
            showToast('Employee filter preference saved');
        });
    }

    const refreshBtn = document.getElementById('refreshSystemBtn');
    if(refreshBtn) refreshBtn.addEventListener('click', refreshSystemStatus);
}

async function refreshSystemStatus(){
    const summary = document.getElementById('systemStatusSummary');
    const list = document.getElementById('systemStatusList');
    const authStatus = document.getElementById('authStatus');

    try{
        if(summary) summary.innerText = 'Checking system status...';
        const [statusRes, authRes] = await Promise.all([
            fetch('/system/status', { credentials: 'same-origin' }),
            fetch('/auth/me', { credentials: 'same-origin' })
        ]);

        if(!statusRes.ok) throw new Error(await statusRes.text());
        const status = await statusRes.json();
        const auth = authRes.ok ? await authRes.json() : { authenticated: false };

        if(authStatus) authStatus.innerText = auth.authenticated ? 'Signed in' : 'Signed out';
        if(summary) summary.innerText = `${status.database} database · ${status.https ? 'HTTPS enabled' : 'HTTP local mode'}`;
        if(list){
            list.innerHTML = `
                <div class="metric-row"><span>Database</span><strong>${escapeHtml(status.database)}</strong></div>
                <div class="metric-row"><span>Server</span><strong>${escapeHtml(status.host)}:${escapeHtml(status.port)}</strong></div>
                <div class="metric-row"><span>HTTPS</span><strong>${status.https ? 'Enabled' : 'Not configured'}</strong></div>
                <div class="metric-row"><span>Secure cookie</span><strong>${status.cookieSecure ? 'Enabled' : 'Disabled'}</strong></div>
                <div class="metric-row"><span>Session TTL</span><strong>${escapeHtml(status.sessionTtlMinutes)} minutes</strong></div>
                <div class="metric-row"><span>Active sessions</span><strong>${escapeHtml(status.activeSessions)}</strong></div>`;
        }
    }catch(err){
        console.error(err);
        if(authStatus) authStatus.innerText = 'Unknown';
        if(summary) summary.innerText = 'System status is unavailable.';
        if(list) list.innerHTML = '<div class="empty-state">Could not load system settings.</div>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', ()=>{
    // auth gate
    initAuth();
    // wire add button (by id)
    const addBtn = document.getElementById('addEmployeeBtn');
    if(addBtn) addBtn.addEventListener('click', (e)=>{ e.preventDefault(); addEmployee(); });
    // wire profile and report buttons
    setupNavigation();
    setupSettings();
    const profile = document.getElementById('profileBtn'); if(profile) profile.addEventListener('click', ()=> showView('settingsView'));
    const report = document.getElementById('createReportBtn'); if(report) report.addEventListener('click', ()=> createPdfReport());
    const reportPage = document.getElementById('createReportPageBtn'); if(reportPage) reportPage.addEventListener('click', ()=> createPdfReport());
    const refreshDataBtn = document.getElementById('refreshDataBtn'); if(refreshDataBtn) refreshDataBtn.addEventListener('click', loadEmployees);
    const logoutBtn = document.getElementById('logoutBtn'); if(logoutBtn) logoutBtn.addEventListener('click', logout);
    const logoutMenuBtn = document.getElementById('logoutMenuBtn'); if(logoutMenuBtn) logoutMenuBtn.addEventListener('click', logout);
    const employeeSearch = document.getElementById('employeeSearch'); if(employeeSearch) employeeSearch.addEventListener('input', renderEmployees);
    const departmentFilter = document.getElementById('departmentFilter'); if(departmentFilter) departmentFilter.addEventListener('change', renderEmployees);
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
            if(document.getElementById('settingsView')?.classList.contains('active')) refreshSystemStatus();
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
    const buttons = [document.getElementById('createReportBtn'), document.getElementById('createReportPageBtn')].filter(Boolean);
    buttons.forEach((btn) => { btn.disabled = true; btn.innerText = 'Generating...'; });
    try{
        if(typeof Chart === 'undefined' || typeof html2canvas === 'undefined' || !window.jspdf){
            throw new Error('Report libraries are unavailable');
        }
        const res = await fetch('/employees', { credentials: 'same-origin' });
        if(!res.ok) throw new Error(await res.text());
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
            const name = `${e.fname || ''} ${e.lname || ''}`.trim() || 'Unnamed employee';
            html += `<tr><td style="padding:6px;border-bottom:1px solid #f0f0f0">${escapeHtml(e.emp_id)}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0">${escapeHtml(name)}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0">${escapeHtml(e.dept || 'Unassigned')}</td><td style="padding:6px;border-bottom:1px solid #f0f0f0">${formatCurrency(e.salary)}</td></tr>`;
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
        buttons.forEach((btn) => {
            btn.disabled = false;
            btn.innerText = btn.id === 'createReportPageBtn' ? 'Download PDF' : 'Create Report';
        });
    }
}
