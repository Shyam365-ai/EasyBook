/* ============================================================
   EasyBook — app.js (Light Theme Redesign)
   SPA Router + All Pages + Charts + State
   ============================================================ */

/* ============================================================
   DATA & PERSISTENCE
   ============================================================ */
function loadFleet() {
  try {
    const saved = localStorage.getItem('easybook_fleet');
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch(e) {
    console.warn('Failed to load fleet from localStorage', e);
  }
  return [];
}

function saveFleet() {
  try {
    localStorage.setItem('easybook_fleet', JSON.stringify(DB.fleet));
  } catch(e) {
    console.warn('Failed to save fleet to localStorage', e);
  }
}

// Reset pre-populated sample cars on first run so the site starts completely empty
if (localStorage.getItem('easybook_fleet_cleared_v1') !== 'true') {
  localStorage.setItem('easybook_fleet', JSON.stringify([]));
  localStorage.setItem('easybook_fleet_cleared_v1', 'true');
}

const DB = {
  fleet: loadFleet(),
  bookings: [
    { id:'BK-9921', customer:'Marcus Chen', avatar:'MC', color:'#2563eb', vehicle:'Tesla Model 3', plate:'TX-4421', from:'2026-09-12', to:'2026-09-16', total:480, status:'Confirmed', type:'Electric' },
    { id:'BK-9920', customer:'Sarah Johnson', avatar:'SJ', color:'#16a34a', vehicle:'Range Rover Sport', plate:'RR-8812', from:'2026-09-11', to:'2026-09-14', total:585, status:'Confirmed', type:'SUV' },
    { id:'BK-9919', customer:'David Park', avatar:'DP', color:'#d97706', vehicle:'BMW X5', plate:'BM-9901', from:'2026-09-15', to:'2026-09-18', total:435, status:'Pending', type:'SUV' },
    { id:'BK-9918', customer:'Emma Wilson', avatar:'EW', color:'#7c3aed', vehicle:'Audi A4', plate:'AU-5530', from:'2026-09-10', to:'2026-09-13', total:330, status:'Confirmed', type:'Sedan' },
    { id:'BK-9917', customer:'James Rivera', avatar:'JR', color:'#dc2626', vehicle:'Hyundai Tucson', plate:'HT-2290', from:'2026-09-13', to:'2026-09-15', total:180, status:'Pending', type:'SUV' },
    { id:'BK-9916', customer:'Aisha Patel', avatar:'AP', color:'#0891b2', vehicle:'Toyota Camry', plate:'TC-3310', from:'2026-09-09', to:'2026-09-12', total:225, status:'Confirmed', type:'Sedan' },
    { id:'BK-9915', customer:'Oliver Brown', avatar:'OB', color:'#d97706', vehicle:'Mercedes C-Class', plate:'MX-2201', from:'2026-09-08', to:'2026-09-10', total:320, status:'Cancelled', type:'Luxury' },
    { id:'BK-9914', customer:'Sophie Lee', avatar:'SL', color:'#7c3aed', vehicle:'Nissan Leaf', plate:'NL-6600', from:'2026-09-14', to:'2026-09-17', total:255, status:'Pending', type:'Electric' },
  ],
  analytics: {
    revenue: [18200,22400,19800,25600,23100,28900,31200,27400,33800,29600,36100,38400],
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    weekly: [4200,5100,4800,6200,5500,7100,6800],
    weekDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    byType: { Sedan:35, SUV:30, Electric:20, Luxury:10, Van:5 },
  }
};

let nextId = DB.fleet.length > 0 ? Math.max(...DB.fleet.map(v=>v.id)) + 1 : 1;
let editingId = null;
let aiFeedTimer = null;

/* ============================================================
   ROUTER
   ============================================================ */
const Router = {
  current: 'dashboard',
  navigate(page) {
    this.current = page;
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.page === page)
    );
    const labels = { dashboard:'Dashboard', fleet:'Fleet Manager', bookings:'Bookings', analytics:'Analytics', landing:'Landing Page', settings:'Settings' };
    document.getElementById('topbar-title').textContent = labels[page] || page;
    document.getElementById('page-content').innerHTML = '';
    if (aiFeedTimer) { clearInterval(aiFeedTimer); aiFeedTimer = null; }
    Pages[page]?.();
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  }
};

/* ============================================================
   UTILITIES
   ============================================================ */
function badge(status) {
  const key = status.toLowerCase().replace(/\s+/g,'-');
  return `<span class="badge badge-${key}">${status}</span>`;
}

function healthClass(h) { return h >= 75 ? 'health-good' : h >= 50 ? 'health-warn' : 'health-bad'; }

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB',{ day:'2-digit', month:'short', year:'numeric' });
}

function animCount(id, target, ms=1400) {
  const el = document.getElementById(id);
  if (!el) return;
  const t0 = performance.now();
  const ease = t => 1 - Math.pow(1-t, 3);
  const tick = now => {
    const p = Math.min((now-t0)/ms, 1);
    el.textContent = Math.round(ease(p)*target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function showToast(msg, type='success') {
  const icons = { success:'&#10003;', error:'&#10005;', info:'&#9432;' };
  const c = document.getElementById('toast');
  const t = document.createElement('div');
  t.className = `toast-item ${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('toast-out');
    setTimeout(() => t.remove(), 220);
  }, 3200);
}

function openModal(title='Add Vehicle', v=null) {
  editingId = v?.id ?? null;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('v-name').value = v?.name ?? '';
  document.getElementById('v-plate').value = v?.plate ?? '';
  document.getElementById('v-type').value = v?.type ?? 'Sedan';
  document.getElementById('v-rate').value = v?.rate ?? '';
  document.getElementById('v-status').value = v?.status ?? 'Available';
  document.getElementById('v-location').value = v?.location ?? '';
  document.getElementById('v-mileage').value = v?.mileage ?? '';
  const h = document.getElementById('v-health');
  h.value = v?.health ?? 95;
  document.getElementById('v-health-val').textContent = h.value + '%';

  stopCamera();
  if (v?.image) {
    setVehiclePhoto(v.image);
  } else {
    clearVehiclePhoto();
  }

  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
  stopCamera();
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

function deleteVehicle(id) {
  const i = DB.fleet.findIndex(v => v.id === id);
  if (i !== -1) {
    const name = DB.fleet[i].name;
    DB.fleet.splice(i,1);
    saveFleet();
    const badgeEl = document.getElementById('fleet-badge');
    if (badgeEl) badgeEl.textContent = DB.fleet.length;
    showToast(`${name} removed from fleet`,'info');
    if (Router.current === 'fleet') Pages.fleet();
    if (Router.current === 'dashboard') Pages.dashboard();
  }
}

window.openModal = openModal;
window.deleteVehicle = deleteVehicle;
window.approveBooking = id => {
  const b = DB.bookings.find(x=>x.id===id);
  if (b) { b.status='Confirmed'; showToast(`Booking ${id} confirmed`,'success'); Pages.bookings(); }
};
window.cancelBooking = id => {
  const b = DB.bookings.find(x=>x.id===id);
  if (b) { b.status='Cancelled'; showToast(`Booking ${id} cancelled`,'error'); Pages.bookings(); }
};

/* ============================================================
   CANVAS CHARTS
   ============================================================ */
function lineChart(id, labels, datasets) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W*dpr; canvas.height = H*dpr; ctx.scale(dpr,dpr);

  const pad = {top:16, right:16, bottom:34, left:56};
  const cW = W-pad.left-pad.right, cH = H-pad.top-pad.bottom;
  const allV = datasets.flatMap(d=>d.data);
  const maxV = Math.max(...allV)*1.12;

  ctx.clearRect(0,0,W,H);

  // Grid
  for (let i=0;i<=4;i++) {
    const y = pad.top + (i/4)*cH;
    ctx.strokeStyle = 'rgba(229,223,211,0.9)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cW,y); ctx.stroke();
    const val = Math.round(maxV - (i/4)*maxV);
    ctx.fillStyle='#8c827a'; ctx.font=`10px 'JetBrains Mono',monospace`; ctx.textAlign='right';
    ctx.fillText(val>=1000?'$'+(val/1000).toFixed(0)+'k':val, pad.left-8, y+4);
  }

  // X Labels
  ctx.fillStyle='#8c827a'; ctx.font=`11px Inter,sans-serif`; ctx.textAlign='center';
  labels.forEach((l,i)=>{
    const x = pad.left + (i/(labels.length-1))*cW;
    ctx.fillText(l, x, H-8);
  });

  datasets.forEach(ds=>{
    const pts = ds.data.map((v,i)=>({
      x: pad.left+(i/(labels.length-1))*cW,
      y: pad.top+(1-v/maxV)*cH
    }));

    // Area fill
    const grad = ctx.createLinearGradient(0,pad.top,0,pad.top+cH);
    grad.addColorStop(0, ds.color+'22'); grad.addColorStop(1, ds.color+'00');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.top+cH);
    pts.forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.lineTo(pts[pts.length-1].x, pad.top+cH);
    ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle=ds.color; ctx.lineWidth=2; ctx.lineJoin='round';
    pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Dots
    pts.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,Math.PI*2);
      ctx.fillStyle=ds.color; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
    });
  });
}

function barChart(id, labels, data, colors) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W*dpr; canvas.height = H*dpr; ctx.scale(dpr,dpr);

  const pad = {top:12, right:12, bottom:32, left:44};
  const cW = W-pad.left-pad.right, cH = H-pad.top-pad.bottom;
  const maxV = Math.max(...data)*1.2;
  const bW = (cW/labels.length)*0.55;
  const gap = (cW/labels.length)*0.45;

  ctx.clearRect(0,0,W,H);

  for (let i=0;i<=4;i++) {
    const y = pad.top+(i/4)*cH;
    ctx.strokeStyle='rgba(229,223,211,0.9)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cW,y); ctx.stroke();
    const val = Math.round(maxV-(i/4)*maxV);
    ctx.fillStyle='#8c827a'; ctx.font=`10px 'JetBrains Mono',monospace`; ctx.textAlign='right';
    ctx.fillText(val>=1000?'$'+(val/1000).toFixed(0)+'k':val, pad.left-6, y+4);
  }

  data.forEach((v,i)=>{
    const x = pad.left+i*(bW+gap)+gap/2;
    const bH = (v/maxV)*cH;
    const y = pad.top+cH-bH;
    const col = Array.isArray(colors)?colors[i%colors.length]:colors;
    ctx.fillStyle = col+'dd';
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(x,y,bW,bH,[3,3,0,0]); ctx.fill();
    } else {
      ctx.fillRect(x,y,bW,bH);
    }
    ctx.fillStyle='#8c827a'; ctx.font=`10px Inter,sans-serif`; ctx.textAlign='center';
    ctx.fillText(labels[i], x+bW/2, H-8);
  });
}

function donutChart(id, data, colors) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const sz = Math.min(canvas.offsetWidth, canvas.offsetHeight);
  canvas.width = sz*dpr; canvas.height = sz*dpr; ctx.scale(dpr,dpr);
  const total = data.reduce((a,b)=>a+b,0);
  const cx=sz/2, cy=sz/2, oR=sz*0.42, iR=sz*0.28;
  ctx.clearRect(0,0,sz,sz);
  if (total === 0) {
    ctx.beginPath(); ctx.arc(cx,cy,oR,0,Math.PI*2);
    ctx.fillStyle = '#E5DFD3'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,iR,0,Math.PI*2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    return;
  }
  let angle = -Math.PI/2;
  data.forEach((v,i)=>{
    const slice=(v/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,oR,angle,angle+slice); ctx.closePath();
    ctx.fillStyle=colors[i]; ctx.fill();
    angle+=slice;
  });
  // Dividers
  angle=-Math.PI/2;
  data.forEach((v)=>{
    const slice=(v/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,oR,angle,angle+0.025); ctx.closePath();
    ctx.fillStyle='#fff'; ctx.fill();
    angle+=slice;
  });
  ctx.beginPath(); ctx.arc(cx,cy,iR,0,Math.PI*2);
  ctx.fillStyle='#fff'; ctx.fill();
}

/* ============================================================
   PAGES
   ============================================================ */
const Pages = {

  /* ---- DASHBOARD ---- */
  dashboard() {
    const active = DB.fleet.filter(v=>v.status==='Rented').length;
    const avail = DB.fleet.filter(v=>v.status==='Available').length;
    const maint = DB.fleet.filter(v=>v.status==='Maintenance').length;
    const pending = DB.bookings.filter(b=>b.status==='Pending').length;

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="page-header-title">
          <h1>Dashboard</h1>
          <p>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="refresh-btn">Refresh</button>
          <button class="btn btn-primary btn-sm" id="add-vehicle-dash">Add Vehicle</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#eff6ff">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div class="stat-label">Total Fleet</div>
          <div class="stat-value">${DB.fleet.length}</div>
          <div class="stat-change up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
            ${DB.fleet.length ? `${DB.fleet.length} vehicles registered` : 'No vehicles in fleet'}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#f0fdf4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="stat-label">Today's Revenue</div>
          <div class="stat-value">$<span id="rev-count">0</span></div>
          <div class="stat-change up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
            12.4% vs yesterday
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#f5f3ff">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <div class="stat-label">Active Rentals</div>
          <div class="stat-value">${active}</div>
          <div class="stat-change neutral">${active} of ${DB.fleet.length} vehicles active</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:#fef2f2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="stat-label">Pending Actions</div>
          <div class="stat-value">${pending + maint}</div>
          <div class="stat-change down">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
            ${pending} bookings, ${maint} in service
          </div>
        </div>
      </div>

      <div class="dash-grid">
        <!-- Revenue Chart -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Revenue Overview</div>
              <div class="card-subtitle">Monthly performance — 2026</div>
            </div>
            <span style="font-size:0.75rem;font-weight:600;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;padding:3px 8px;border-radius:100px">+18% YoY</span>
          </div>
          <div style="padding:0 22px 18px">
            <div style="height:200px"><canvas id="rev-chart" style="width:100%;height:200px;display:block"></canvas></div>
            <div class="chart-legend" style="margin-top:8px">
              <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div>Revenue 2026</div>
              <div class="legend-item"><div class="legend-dot" style="background:#7c3aed"></div>Target</div>
            </div>
          </div>
        </div>

        <!-- AI Alert Feed -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Automation Alerts</div>
              <div class="card-subtitle">AI-generated, real-time</div>
            </div>
            <div class="live-badge">
              <span class="live-dot"></span> Live
            </div>
          </div>
          <div style="padding:0 16px 16px">
            <div class="alert-feed" id="ai-feed">
              <div class="alert-item success">
                <span class="alert-icon">&#10003;</span>
                <span class="alert-text">Dynamic pricing raised for Airport Zone +18%</span>
                <span class="alert-time">2m ago</span>
              </div>
              <div class="alert-item info">
                <span class="alert-icon">&#9432;</span>
                <span class="alert-text">3 vehicles repositioned to high-demand zones</span>
                <span class="alert-time">5m ago</span>
              </div>
              <div class="alert-item warning">
                <span class="alert-icon">&#9888;</span>
                <span class="alert-text">Vehicle TX-4421: Oil change due in 200 km</span>
                <span class="alert-time">12m ago</span>
              </div>
              <div class="alert-item success">
                <span class="alert-icon">&#10003;</span>
                <span class="alert-text">Booking BK-9921 auto-confirmed successfully</span>
                <span class="alert-time">18m ago</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fleet Map -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Fleet Positions</div>
              <div class="card-subtitle">Live GPS tracking</div>
            </div>
            <div style="display:flex;gap:10px">
              <div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div>Active (${active})</div>
              <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div>Idle (${avail})</div>
              <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div>Service (${maint})</div>
            </div>
          </div>
          <div style="padding:0 20px 20px">
            <div class="map-mock" id="fleet-map">
              <div class="map-grid-lines"></div>
            </div>
          </div>
        </div>

        <!-- Utilization -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Fleet Utilization</div>
          </div>
          <div style="padding:0 20px 16px;display:flex;flex-direction:column;align-items:center">
            <div class="donut-wrap" style="height:160px">
              <canvas id="util-donut" style="width:160px;height:160px"></canvas>
              <div class="donut-center">
                <div class="donut-value">${DB.fleet.length ? Math.round(active/DB.fleet.length*100) : 0}%</div>
                <div class="donut-label">Utilization</div>
              </div>
            </div>
            <div class="chart-legend" style="margin-top:12px;justify-content:center">
              <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div>Rented (${active})</div>
              <div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div>Available (${avail})</div>
              <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div>Service (${maint})</div>
            </div>
          </div>
        </div>

        <!-- Recent Bookings -->
        <div class="card dash-grid-full">
          <div class="card-header">
            <div class="card-title">Recent Bookings</div>
            <button class="btn btn-ghost btn-sm" onclick="Router.navigate('bookings')">View all</button>
          </div>
          <div style="padding:0 0 4px">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Customer</th><th>Vehicle</th><th>Period</th><th>Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${DB.bookings.slice(0,5).map(b=>`
                  <tr>
                    <td class="cell-mono">${b.id}</td>
                    <td>
                      <div class="cust-cell">
                        <div class="cust-av" style="background:${b.color}">${b.avatar}</div>
                        <span class="cell-primary">${b.customer}</span>
                      </div>
                    </td>
                    <td>${b.vehicle}</td>
                    <td style="color:#64748b;font-size:0.8rem">${fmtDate(b.from)} &ndash; ${fmtDate(b.to)}</td>
                    <td><strong>$${b.total}</strong></td>
                    <td>${badge(b.status)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    animCount('rev-count', 24830);
    requestAnimationFrame(()=>{
      const target = [22000,24000,21500,27000,25000,30000,32000,29000,35000,31000,38000,40000];
      lineChart('rev-chart', DB.analytics.months,
        [{data:DB.analytics.revenue, color:'#2563eb'},{data:target,color:'#7c3aed'}]
      );
      donutChart('util-donut',[active,avail,maint],['#2563eb','#16a34a','#d97706']);
      renderMapPins();
    });

    document.getElementById('add-vehicle-dash')?.addEventListener('click', ()=>openModal());
    document.getElementById('refresh-btn')?.addEventListener('click', ()=>{
      showPreloader('Refreshing dashboard...');
      setTimeout(()=>{
        Pages.dashboard();
        hidePreloader();
        showToast('Dashboard refreshed','info');
      }, 700);
    });
    startAIFeed();
  },

  /* ---- FLEET ---- */
  fleet() {
    let filter='all', search='';

    const render = () => {
      const list = DB.fleet.filter(v=>{
        const mf = filter==='all' || v.status.toLowerCase()===filter;
        const ms = !search || v.name.toLowerCase().includes(search) || v.plate.toLowerCase().includes(search);
        return mf && ms;
      });

      document.getElementById('fleet-count').textContent = list.length;
      document.getElementById('fleet-grid').innerHTML = list.length ? list.map(v=>`
        <div class="vehicle-card">
          ${v.image ? `
          <div class="vc-img-wrap">
            <img src="${v.image}" alt="${v.name}" class="vc-img" loading="lazy"/>
          </div>` : ''}
          <div class="vc-header">
            <div>
              <div class="vc-name">${v.name}</div>
              <div class="vc-plate">${v.plate}</div>
            </div>
            <span class="vc-type">${v.type}</span>
          </div>
          <div class="vc-stats">
            <div>
              <div class="vc-stat-label">Daily Rate</div>
              <div class="vc-stat-val">$${v.rate}/day</div>
            </div>
            <div>
              <div class="vc-stat-label">Status</div>
              <div>${badge(v.status)}</div>
            </div>
            <div>
              <div class="vc-stat-label">Location</div>
              <div class="vc-stat-val" style="font-size:0.8rem">${v.location}</div>
            </div>
            <div>
              <div class="vc-stat-label">Mileage</div>
              <div class="vc-stat-val">${v.mileage}</div>
            </div>
          </div>
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:0.6875rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Health Score</span>
              <span style="font-size:0.75rem;font-weight:600;color:#475569">${v.health}%</span>
            </div>
            <div class="health-track">
              <div class="health-fill ${healthClass(v.health)}" style="width:${v.health}%"></div>
            </div>
          </div>
          <div class="vc-footer">
            <button class="btn btn-secondary btn-sm" onclick="openModal('Edit Vehicle',DB.fleet.find(x=>x.id==${v.id}))">Edit</button>
            <button class="btn btn-danger-soft btn-sm" onclick="deleteVehicle(${v.id})">Remove</button>
          </div>
        </div>`).join('') : `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:50px 20px;">
          <div class="empty-state-icon" style="width:60px;height:60px;margin:0 auto 16px;background:var(--accent-light);border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <h3 style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:6px">No vehicles in fleet</h3>
          <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:20px;max-width:380px;margin-left:auto;margin-right:auto">Your fleet is currently empty. Add your vehicles manually to manage telemetry, tracking, and reservations.</p>
          <button class="btn btn-primary" onclick="openModal('Add Vehicle')">+ Add Vehicle Manually</button>
        </div>`;
    };

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="page-header-title">
          <h1>Fleet Manager</h1>
          <p>Manage and monitor your entire vehicle fleet</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="clear-fleet-btn">Clear Fleet</button>
          <button class="btn btn-primary btn-sm" id="add-vehicle-btn">+ Add Vehicle</button>
        </div>
      </div>

      <div class="filter-bar">
        <button class="filter-tab active" data-f="all">All <span id="fleet-count">${DB.fleet.length}</span></button>
        <button class="filter-tab" data-f="available">Available (${DB.fleet.filter(v=>v.status==='Available').length})</button>
        <button class="filter-tab" data-f="rented">Rented (${DB.fleet.filter(v=>v.status==='Rented').length})</button>
        <button class="filter-tab" data-f="maintenance">Maintenance (${DB.fleet.filter(v=>v.status==='Maintenance').length})</button>
        <div class="search-inline">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="fleet-search" placeholder="Search name or plate..."/>
        </div>
      </div>

      <div class="fleet-grid" id="fleet-grid"></div>
    `;

    render();
    document.getElementById('add-vehicle-btn').addEventListener('click',()=>openModal());
    document.getElementById('clear-fleet-btn')?.addEventListener('click',()=>{
      if (DB.fleet.length === 0) {
        showToast('Fleet is already empty','info');
        return;
      }
      if (confirm('Clear all vehicles from your fleet?')) {
        DB.fleet = [];
        saveFleet();
        const b = document.getElementById('fleet-badge');
        if (b) b.textContent = '0';
        showToast('Fleet cleared successfully','info');
        Pages.fleet();
      }
    });
    document.getElementById('fleet-search').addEventListener('input',e=>{ search=e.target.value.toLowerCase(); render(); });
    document.querySelectorAll('[data-f]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-f]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); filter=btn.dataset.f; render();
    }));
  },

  /* ---- BOOKINGS ---- */
  bookings() {
    let filter='all', search='';
    const render = () => {
      const list = DB.bookings.filter(b=>{
        const mf = filter==='all'||b.status.toLowerCase()===filter;
        const ms = !search||b.customer.toLowerCase().includes(search)||b.id.toLowerCase().includes(search)||b.vehicle.toLowerCase().includes(search);
        return mf && ms;
      });
      document.getElementById('bookings-tbody').innerHTML = list.length ? list.map(b=>`
        <tr>
          <td class="cell-mono">${b.id}</td>
          <td>
            <div class="book-cust">
              <div class="book-av" style="background:${b.color}">${b.avatar}</div>
              <span class="book-name">${b.customer}</span>
            </div>
          </td>
          <td>${b.vehicle}<br><span class="cell-mono" style="font-size:0.7rem">${b.plate}</span></td>
          <td><span style="font-size:0.75rem;padding:2px 7px;border-radius:100px;background:#f1f5f9;color:#475569;font-weight:500">${b.type}</span></td>
          <td style="color:#64748b;font-size:0.8rem;white-space:nowrap">${fmtDate(b.from)} &ndash; ${fmtDate(b.to)}</td>
          <td><strong style="font-size:0.9rem">$${b.total}</strong></td>
          <td>${badge(b.status)}</td>
          <td>
            <div class="row-actions">
              ${b.status==='Pending'?`
                <button class="btn btn-success-soft btn-sm btn-icon-only" title="Confirm" onclick="approveBooking('${b.id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="btn btn-danger-soft btn-sm btn-icon-only" title="Cancel" onclick="cancelBooking('${b.id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>`:
                `<button class="btn btn-secondary btn-sm btn-icon-only" title="View">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>`}
            </div>
          </td>
        </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state">
          <div class="empty-state-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <h3>No bookings found</h3><p>Try a different filter or search term.</p></div></td></tr>`;
    };

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="page-header-title">
          <h1>Bookings</h1>
          <p>Manage all rental reservations and customer requests</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary btn-sm">New Booking</button>
        </div>
      </div>

      <div class="filter-bar">
        <button class="filter-tab active" data-f="all">All (${DB.bookings.length})</button>
        <button class="filter-tab" data-f="confirmed">Confirmed (${DB.bookings.filter(b=>b.status==='Confirmed').length})</button>
        <button class="filter-tab" data-f="pending">Pending (${DB.bookings.filter(b=>b.status==='Pending').length})</button>
        <button class="filter-tab" data-f="cancelled">Cancelled (${DB.bookings.filter(b=>b.status==='Cancelled').length})</button>
        <div class="search-inline">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="book-search" placeholder="Search customer or ID..."/>
        </div>
      </div>

      <div class="bookings-wrap">
        <table class="bookings-table">
          <thead>
            <tr><th>Booking ID</th><th>Customer</th><th>Vehicle</th><th>Category</th><th>Period</th><th>Total</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody id="bookings-tbody"></tbody>
        </table>
      </div>
    `;
    render();
    document.getElementById('book-search').addEventListener('input',e=>{ search=e.target.value.toLowerCase(); render(); });
    document.querySelectorAll('[data-f]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-f]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); filter=btn.dataset.f; render();
    }));
  },

  /* ---- ANALYTICS ---- */
  analytics() {
    const active=DB.fleet.filter(v=>v.status==='Rented').length;
    const avail=DB.fleet.filter(v=>v.status==='Available').length;
    const maint=DB.fleet.filter(v=>v.status==='Maintenance').length;

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="page-header-title">
          <h1>Analytics</h1>
          <p>Revenue performance, fleet utilization, and demand insights</p>
        </div>
        <div class="page-actions">
          <select class="field-input" style="width:auto;padding:6px 28px 6px 10px;font-size:0.8125rem">
            <option>2026 — Full Year</option>
            <option>Last 90 Days</option>
            <option>Last 30 Days</option>
          </select>
          <button class="btn btn-secondary btn-sm">Export</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">$<span id="a-rev">0</span>k</div>
          <div class="stat-change up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
            18% year-over-year
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Utilization</div>
          <div class="stat-value">78%</div>
          <div class="stat-change up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
            8% vs last year
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Bookings</div>
          <div class="stat-value"><span id="a-bk">0</span></div>
          <div class="stat-change up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
            22% vs last year
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Daily Rate</div>
          <div class="stat-value">$<span id="a-rate">0</span></div>
          <div class="stat-change up">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
            5% AI pricing impact
          </div>
        </div>
      </div>

      <div class="analytics-main">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Annual Revenue Trend</div>
              <div class="card-subtitle">Monthly breakdown — 2026</div>
            </div>
          </div>
          <div style="padding:0 20px 20px;height:230px">
            <canvas id="annual-chart" style="width:100%;height:230px;display:block"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Fleet Utilization</div></div>
          <div style="padding:0 20px 16px;display:flex;flex-direction:column;align-items:center">
            <div class="donut-wrap" style="height:170px">
              <canvas id="util-donut2" style="width:170px;height:170px"></canvas>
              <div class="donut-center">
                <div class="donut-value">78%</div>
                <div class="donut-label">avg utilization</div>
              </div>
            </div>
            <div class="chart-legend" style="margin-top:12px;justify-content:center">
              <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div>Rented</div>
              <div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div>Available</div>
              <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div>Service</div>
            </div>
          </div>
        </div>
      </div>

      <div class="analytics-row">
        <div class="card">
          <div class="card-header"><div class="card-title">Weekly Revenue</div><div class="card-subtitle">Last 7 days</div></div>
          <div style="padding:0 16px 16px;height:160px">
            <canvas id="weekly-chart" style="width:100%;height:160px;display:block"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Revenue by Category</div></div>
          <div style="padding:0 16px 16px;height:160px">
            <canvas id="type-chart" style="width:100%;height:160px;display:block"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Fleet Health</div></div>
          <div style="padding:0 20px 16px">
            ${DB.fleet.length ? DB.fleet.slice(0,5).map(v=>`
              <div class="health-row">
                <span class="health-name" title="${v.name}">${v.name.split(' ').slice(0,2).join(' ')}</span>
                <div class="health-track-wide">
                  <div class="health-fill ${healthClass(v.health)}" style="width:${v.health}%;height:100%"></div>
                </div>
                <span class="health-pct">${v.health}%</span>
              </div>`).join('') : `<p style="font-size:0.8125rem;color:var(--text-muted);padding:14px 0;text-align:center">No vehicles in fleet</p>`}
          </div>
        </div>
      </div>
    `;

    animCount('a-rev',335,1300);
    animCount('a-bk',1284,1300);
    animCount('a-rate',112,1300);

    requestAnimationFrame(()=>{
      const target=[20000,24000,22000,29000,27000,33000,35000,31000,37000,34000,40000,42000];
      lineChart('annual-chart', DB.analytics.months,
        [{data:DB.analytics.revenue,color:'#2563eb'},{data:target,color:'#7c3aed'}]
      );
      donutChart('util-donut2',[active,avail,maint],['#2563eb','#16a34a','#d97706']);
      barChart('weekly-chart', DB.analytics.weekDays, DB.analytics.weekly,
        ['#2563eb','#3b82f6','#60a5fa','#2563eb','#3b82f6','#60a5fa','#2563eb']
      );
      const tVals=Object.values(DB.analytics.byType);
      const tKeys=Object.keys(DB.analytics.byType);
      barChart('type-chart', tKeys, tVals.map(v=>v*280),
        ['#2563eb','#7c3aed','#16a34a','#d97706','#0891b2']
      );
    });
  },

  /* ---- LANDING ---- */
  landing() {
    document.getElementById('page-content').innerHTML = `
      <div class="landing-wrap">
        <div class="landing-hero">
          <div>
            <div class="landing-tag">
              <span class="landing-tag-dot"></span>
              Intelligent Fleet Automation
            </div>
            <h1 class="landing-h1">
              The operating system for <span class="accent-span">modern car rental</span>
            </h1>
            <p class="landing-p">
              Automate your entire rental operation with real-time IoT tracking, AI-driven pricing, and predictive maintenance — all in one platform built for fleet owners who demand more.
            </p>
            <div class="landing-cta">
              <button class="btn btn-primary btn-lg" onclick="Router.navigate('dashboard')">Open Dashboard</button>
              <button class="btn btn-secondary btn-lg" onclick="Router.navigate('fleet')">View Fleet</button>
            </div>
            <div class="landing-stats">
              ${[['12,000+','Vehicles managed'],['98%','Uptime guarantee'],['340+','Rental operators'],['47%','Average revenue lift']].map(([n,l])=>`
                <div>
                  <div class="landing-stat-num">${n}</div>
                  <div class="landing-stat-label">${l}</div>
                </div>`).join('')}
            </div>
          </div>
          <div class="landing-visual">
            <div class="landing-card">
              <div style="font-size:0.75rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px">Fleet Overview</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
                ${[['Active Rentals','7','#2563eb'],['Revenue Today','$24.8k','#15803d'],['AI Alerts','3','#b45309'],['Health Score','91%','#7c3aed']].map(([l,v,c])=>`
                  <div style="background:#f3efe6;border:1px solid #e5dfd3;border-radius:10px;padding:12px">
                    <div style="font-size:0.6875rem;color:#8c827a;margin-bottom:4px">${l}</div>
                    <div style="font-size:1.25rem;font-weight:700;color:${c};font-family:'JetBrains Mono',monospace">${v}</div>
                  </div>`).join('')}
              </div>
              <div style="height:4px;background:#e5dfd3;border-radius:100px;overflow:hidden">
                <div style="width:58%;height:100%;background:linear-gradient(90deg,#2563eb,#7c3aed);border-radius:100px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:5px">
                <span style="font-size:0.6875rem;color:#8c827a">Fleet utilization</span>
                <span style="font-size:0.6875rem;font-weight:600;color:#2563eb">58%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="features-section">
          <div style="max-width:560px;margin-bottom:40px">
            <div class="section-label">Platform Capabilities</div>
            <h2 class="section-h2">Everything your rental business needs to run on autopilot</h2>
            <p class="section-sub">One platform replaces your entire operations stack — from booking management to predictive AI.</p>
          </div>
          <div class="feat-grid">
            ${[
              ['#eff6ff','#2563eb','Real-Time IoT Tracking','Monitor location, fuel, engine health, and door status across your entire fleet from a single interface.'],
              ['#f5f3ff','#7c3aed','Predictive AI Engine','Machine learning forecasts demand surges, optimal pricing windows, and service requirements before they arise.'],
              ['#f0fdf4','#16a34a','Smart Booking Engine','Automated confirmation, digital contracts, and remote key handoff — no manual steps required.'],
              ['#fffbeb','#d97706','Predictive Maintenance','AI identifies wear patterns early and auto-schedules service, reducing vehicle downtime by up to 60%.'],
              ['#fef2f2','#dc2626','Theft Detection','Instant anomaly alerts when a vehicle deviates from expected routes or exhibits unauthorized usage patterns.'],
              ['#f0fdf4','#0891b2','Revenue Intelligence','Real-time P&L dashboards, utilization analysis, and cohort reporting — so you always know where revenue comes from.'],
            ].map(([bg,color,title,desc])=>`
              <div class="feat-card">
                <div class="feat-icon-wrap" style="background:${bg}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M12 2v2M12 20v2M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2"/></svg>
                </div>
                <h3>${title}</h3>
                <p>${desc}</p>
              </div>`).join('')}
          </div>
        </div>

        <div style="text-align:center;padding:60px 0;border-top:1px solid #efebe1">
          <h2 class="section-h2" style="margin-bottom:10px">Ready to automate your fleet?</h2>
          <p style="font-size:0.9375rem;color:#57534e;margin-bottom:28px">Join 340 operators running smarter with EasyBook.</p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-primary btn-lg" onclick="Router.navigate('dashboard')">Open Dashboard</button>
            <button class="btn btn-secondary btn-lg" onclick="Router.navigate('analytics')">View Analytics</button>
          </div>
        </div>
      </div>
    `;
  },

  /* ---- SETTINGS ---- */
  settings() {
    const sections = {
      account: `
        <div class="settings-card">
          <div class="settings-card-title">Profile</div>
          <div class="settings-card-desc">Update your name, company, and contact information.</div>
          <div class="settings-form">
            <div class="field-row">
              <div class="field"><label class="field-label">Full Name</label><input class="field-input" type="text" value="James Doyle"/></div>
              <div class="field"><label class="field-label">Company</label><input class="field-input" type="text" value="Doyle Fleet Corp"/></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">Email</label><input class="field-input" type="email" value="james@doylefleet.com"/></div>
              <div class="field"><label class="field-label">Phone</label><input class="field-input" type="tel" value="+1 (415) 555-0182"/></div>
            </div>
            <div class="field"><label class="field-label">Headquarters</label><input class="field-input" type="text" value="San Francisco, CA"/></div>
            <div class="field"><label class="field-label">Time Zone</label>
              <select class="field-input field-select"><option>PST — Pacific Standard Time</option><option>EST — Eastern</option><option>GMT</option><option>IST — India</option></select>
            </div>
          </div>
        </div>
        <div class="settings-card">
          <div class="settings-card-title">Password</div>
          <div class="settings-card-desc">Keep your account secure with a strong password.</div>
          <div class="settings-form">
            <div class="field"><label class="field-label">Current Password</label><input class="field-input" type="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"/></div>
            <div class="field-row">
              <div class="field"><label class="field-label">New Password</label><input class="field-input" type="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"/></div>
              <div class="field"><label class="field-label">Confirm Password</label><input class="field-input" type="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"/></div>
            </div>
            <button class="btn btn-secondary btn-sm" style="width:fit-content">Update Password</button>
          </div>
        </div>`,

      notifications: `
        <div class="settings-card">
          <div class="settings-card-title">Notification Preferences</div>
          <div class="settings-card-desc">Choose which alerts and reports you receive from EasyBook.</div>
          ${[['New Booking Request','Instant alert when a customer submits a new booking',true],
             ['AI Pricing Changes','Notified when AI adjusts a rate by more than 10%',true],
             ['Maintenance Alerts','Vehicle health score drops below threshold',true],
             ['Anomaly Detection','Unauthorized vehicle usage or route deviation',true],
             ['Daily Revenue Summary','Digest sent every morning at 8:00 AM',false],
             ['Weekly Performance Report','Comprehensive weekly analytics digest',false]
          ].map(([t,d,on])=>`
            <div class="toggle-row">
              <div class="toggle-info"><h4>${t}</h4><p>${d}</p></div>
              <div class="toggle-switch ${on?'on':''}" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div>
            </div>`).join('')}
        </div>`,

      automation: `
        <div class="settings-card">
          <div class="settings-card-title">Automation Rules</div>
          <div class="settings-card-desc">Configure AI-driven triggers and automated actions for your fleet.</div>
          ${[['AI Dynamic Pricing','Automatically adjust rates based on demand forecasts',true],
             ['Auto-Confirm Bookings','Confirm bookings for verified customers without review',false],
             ['Smart Repositioning','AI recommends vehicle moves to high-demand zones',true],
             ['Auto Maintenance Scheduling','Schedule service when health score falls below 65%',true],
             ['Late Return Alerts','SMS customer when rental exceeds agreed duration',true],
             ['Automated Security Deposit','Charge deposit 24 hours before rental begins',false]
          ].map(([t,d,on])=>`
            <div class="toggle-row">
              <div class="toggle-info"><h4>${t}</h4><p>${d}</p></div>
              <div class="toggle-switch ${on?'on':''}" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div>
            </div>`).join('')}
        </div>
        <div class="settings-card">
          <div class="settings-card-title">Pricing Thresholds</div>
          <div class="settings-card-desc">Set limits for AI-driven pricing adjustments.</div>
          <div class="settings-form">
            <div class="field-row">
              <div class="field"><label class="field-label">Max Surge Multiplier</label><input class="field-input" type="number" value="2.5" step="0.1"/></div>
              <div class="field"><label class="field-label">Discount Threshold (% idle)</label><input class="field-input" type="number" value="40"/></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="field-label">Late Fee (per hour)</label><input class="field-input" type="number" value="25"/></div>
              <div class="field"><label class="field-label">Security Deposit ($)</label><input class="field-input" type="number" value="250"/></div>
            </div>
          </div>
        </div>`,

      integrations: `
        <div class="settings-card">
          <div class="settings-card-title">Connected Services</div>
          <div class="settings-card-desc">Integrate EasyBook with your existing business tools.</div>
          <div class="integrations-grid" style="margin-top:4px">
            ${[['Maps','Google Maps','Fleet tracking and routing','connected','#0f9d58'],
               ['Mail','SendGrid','Email notifications','connected','#1a82e2'],
               ['Pay','Stripe','Payments and deposits','connected','#635bff'],
               ['SMS','Twilio','Customer SMS alerts','connected','#f22f46'],
               ['CRM','Salesforce','Customer management','connect','#00a1e0'],
               ['Auto','Zapier','Workflow automation','connect','#ff4a00'],
               ['App','Firebase','Mobile app backend','connect','#ffcb2f'],
               ['Auth','Auth0','Identity management','connect','#eb5424']
            ].map(([icon,name,desc,status,color])=>`
              <div class="integration-item">
                <div class="integration-icon-box" style="background:${color}15;color:${color};font-size:0.75rem;font-weight:700">${icon}</div>
                <div class="integration-info">
                  <div class="integration-name">${name}</div>
                  <div class="integration-desc">${desc}</div>
                </div>
                <button class="integration-action ${status}">${status==='connected'?'Connected':'Connect'}</button>
              </div>`).join('')}
          </div>
        </div>`,

      billing: `
        <div class="settings-card">
          <div class="settings-card-title">Current Plan</div>
          <div class="settings-card-desc">You are on the <strong style="color:#2563eb">Professional Plan</strong>, billed monthly.</div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:1.5rem;font-weight:700;color:#0f172a;font-family:'JetBrains Mono',monospace">$299<span style="font-size:0.875rem;color:#64748b;font-family:Inter,sans-serif">/month</span></div>
              <div style="font-size:0.8125rem;color:#64748b;margin-top:3px">Up to 100 vehicles — all features included</div>
            </div>
            <button class="btn btn-secondary btn-sm">Upgrade Plan</button>
          </div>
          <div class="settings-form">
            <div class="field-row">
              <div class="field"><label class="field-label">Card Number</label><input class="field-input" type="text" value="&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242" readonly/></div>
              <div class="field"><label class="field-label">Expiry</label><input class="field-input" type="text" value="09 / 27" readonly/></div>
            </div>
            <button class="btn btn-secondary btn-sm" style="width:fit-content">Update Payment Method</button>
          </div>
        </div>`
    };

    document.getElementById('page-content').innerHTML = `
      <div class="page-header">
        <div class="page-header-title"><h1>Settings</h1><p>Manage your account, automation, and integrations</p></div>
        <button class="btn btn-primary btn-sm" id="save-settings">Save Changes</button>
      </div>
      <div class="settings-layout">
        <div class="settings-nav-panel">
          ${[['account','Profile'],['notifications','Notifications'],['automation','Automation'],['integrations','Integrations'],['billing','Billing']].map(([k,l],i)=>`
            <button class="settings-nav-btn ${i===0?'active':''}" data-section="${k}">${l}</button>`).join('')}
        </div>
        <div class="settings-content-area" id="settings-body"></div>
      </div>
    `;

    const render = k => document.getElementById('settings-body').innerHTML = sections[k]||'';
    render('account');
    document.querySelectorAll('.settings-nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.settings-nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); render(btn.dataset.section);
    }));
    document.getElementById('save-settings')?.addEventListener('click',()=>showToast('Settings saved successfully','success'));
  }
};

/* ============================================================
   MAP PINS
   ============================================================ */
function renderMapPins() {
  const map = document.getElementById('fleet-map');
  if (!map) return;
  map.querySelectorAll('.map-pin').forEach(el=>el.remove());
  const existingEmpty = map.querySelector('.map-empty-msg');
  if (existingEmpty) existingEmpty.remove();

  if (DB.fleet.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'map-empty-msg';
    emptyMsg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8c827a;font-size:0.8125rem;font-weight:500;z-index:2;background:rgba(250,247,240,0.75);text-align:center;padding:20px;';
    emptyMsg.textContent = 'No active vehicles to track. Add vehicles to view live positions.';
    map.appendChild(emptyMsg);
    return;
  }

  const statusColors = { Available:'#16a34a', Rented:'#2563eb', Maintenance:'#d97706' };
  const coords = [
    {x:22,y:40},{x:50,y:20},{x:68,y:55},{x:38,y:68},{x:80,y:35},{x:14,y:62},{x:60,y:75},{x:85,y:60},
    {x:45,y:45},{x:72,y:25},{x:30,y:30},{x:55,y:65}
  ];

  DB.fleet.forEach((v, idx)=>{
    const pt = coords[idx % coords.length];
    const c = statusColors[v.status] || '#2563eb';
    const el = document.createElement('div');
    el.className='map-pin';
    el.title = `${v.name} (${v.plate}) — ${v.status}`;
    el.style.cssText=`left:${pt.x}%;top:${pt.y}%`;
    el.innerHTML=`<div class="map-pin-dot" style="background:${c}"></div><div class="map-pin-ring" style="border-color:${c}"></div>`;
    map.appendChild(el);
  });
}

/* ============================================================
   AI FEED
   ============================================================ */
function startAIFeed() {
  const msgs = [
    {type:'success', icon:'&#10003;', text:'Dynamic pricing raised for Downtown Zone +14%'},
    {type:'info', icon:'&#9432;', text:'Vehicle BM-9901 repositioned to Convention Centre'},
    {type:'warning', icon:'&#9888;', text:'Vehicle HC-5521: Brake inspection required'},
    {type:'success', icon:'&#10003;', text:'Booking BK-9914 auto-confirmed for Sophie Lee'},
    {type:'info', icon:'&#9432;', text:'Weekend demand forecast: +38% — 8–11 AM Friday'},
    {type:'success', icon:'&#10003;', text:'NL-6600 fully charged and ready for rental'},
    {type:'warning', icon:'&#9888;', text:'GPS signal degraded on TC-3310 — monitoring'},
  ];
  let i=0;
  aiFeedTimer = setInterval(()=>{
    const feed=document.getElementById('ai-feed');
    if (!feed) { clearInterval(aiFeedTimer); aiFeedTimer=null; return; }
    const m=msgs[i%msgs.length];
    const el=document.createElement('div');
    el.className=`alert-item ${m.type}`;
    el.innerHTML=`<span class="alert-icon">${m.icon}</span><span class="alert-text">${m.text}</span><span class="alert-time">Just now</span>`;
    feed.insertBefore(el, feed.firstChild);
    if (feed.children.length>6) feed.removeChild(feed.lastChild);
    i++;
  }, 4500);
}

/* ============================================================
   PHOTO UPLOAD & CAMERA CAPTURE
   ============================================================ */
let cameraStream = null;

function setVehiclePhoto(dataUrl) {
  const hiddenInput = document.getElementById('v-image-data');
  const previewImg = document.getElementById('photo-preview-img');
  const placeholder = document.getElementById('photo-placeholder');
  const removeBtn = document.getElementById('v-photo-remove');

  if (hiddenInput) hiddenInput.value = dataUrl;
  if (previewImg) {
    previewImg.src = dataUrl;
    previewImg.style.display = 'block';
  }
  if (placeholder) placeholder.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'inline-flex';
}

function clearVehiclePhoto() {
  const hiddenInput = document.getElementById('v-image-data');
  const previewImg = document.getElementById('photo-preview-img');
  const placeholder = document.getElementById('photo-placeholder');
  const removeBtn = document.getElementById('v-photo-remove');
  const fileUpload = document.getElementById('v-file-upload');
  const cameraFallback = document.getElementById('v-camera-fallback');

  if (hiddenInput) hiddenInput.value = '';
  if (previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
  }
  if (placeholder) placeholder.style.display = 'flex';
  if (removeBtn) removeBtn.style.display = 'none';
  if (fileUpload) fileUpload.value = '';
  if (cameraFallback) cameraFallback.value = '';
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const streamWrap = document.getElementById('camera-stream-wrap');
  if (streamWrap) streamWrap.style.display = 'none';
}

function processImageFile(file, callback) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 800;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      callback(compressedDataUrl);
    };
    img.onerror = () => showToast('Failed to load image', 'error');
    img.src = e.target.result;
  };
  reader.onerror = () => showToast('Failed to read file', 'error');
  reader.readAsDataURL(file);
}

// Upload file change
document.getElementById('v-file-upload')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    processImageFile(file, dataUrl => {
      setVehiclePhoto(dataUrl);
      showToast('Photo uploaded successfully', 'success');
    });
  }
});

// Camera fallback file change
document.getElementById('v-camera-fallback')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) {
    processImageFile(file, dataUrl => {
      setVehiclePhoto(dataUrl);
      showToast('Photo captured successfully', 'success');
    });
  }
});

// Open camera stream or fallback
document.getElementById('v-camera-btn')?.addEventListener('click', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false
    }).then(stream => {
      cameraStream = stream;
      const video = document.getElementById('camera-video');
      video.srcObject = stream;
      video.play();
      document.getElementById('camera-stream-wrap').style.display = 'block';
    }).catch(err => {
      console.warn('Camera stream error, falling back to capture picker:', err);
      document.getElementById('v-camera-fallback')?.click();
    });
  } else {
    document.getElementById('v-camera-fallback')?.click();
  }
});

// Snap photo from camera
document.getElementById('camera-snap-btn')?.addEventListener('click', () => {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  if (!video || !canvas) return;

  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const maxDim = 800;
  let dw = w, dh = h;
  if (dw > maxDim || dh > maxDim) {
    if (dw > dh) { dh = Math.round(dh * (maxDim / dw)); dw = maxDim; }
    else { dw = Math.round(dw * (maxDim / dh)); dh = maxDim; }
  }

  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, dw, dh);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  setVehiclePhoto(dataUrl);
  stopCamera();
  showToast('Photo captured!', 'success');
});

// Cancel camera
document.getElementById('camera-cancel-btn')?.addEventListener('click', stopCamera);

// Remove photo
document.getElementById('v-photo-remove')?.addEventListener('click', () => {
  clearVehiclePhoto();
  showToast('Photo removed', 'info');
});

// Click preview box to upload if empty
const previewBox = document.getElementById('photo-preview-box');
previewBox?.addEventListener('click', () => {
  if (!document.getElementById('v-image-data')?.value) {
    document.getElementById('v-file-upload')?.click();
  }
});

// Drag and drop photo
previewBox?.addEventListener('dragover', e => {
  e.preventDefault();
  previewBox.classList.add('drag-over');
});
previewBox?.addEventListener('dragleave', () => {
  previewBox.classList.remove('drag-over');
});
previewBox?.addEventListener('drop', e => {
  e.preventDefault();
  previewBox.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processImageFile(file, dataUrl => {
      setVehiclePhoto(dataUrl);
      showToast('Photo uploaded successfully', 'success');
    });
  }
});

/* ============================================================
   MODAL EVENTS
   ============================================================ */
document.getElementById('vehicle-form').addEventListener('submit', e=>{
  e.preventDefault();
  const name = document.getElementById('v-name').value.trim();
  const plate = document.getElementById('v-plate').value.trim();
  const rate = +document.getElementById('v-rate').value;
  const type = document.getElementById('v-type').value;
  const status = document.getElementById('v-status').value;
  const location = document.getElementById('v-location').value.trim() || 'Main Hub';
  const mileage = document.getElementById('v-mileage').value.trim() || '0 km';
  const image = document.getElementById('v-image-data')?.value || 'car_tesla.jpg';
  const health = +document.getElementById('v-health').value || 90;

  if (!name || !plate || !rate) {
    showToast('Please fill in Name, Plate, and Daily Rate', 'error');
    return;
  }

  const data={
    id: editingId ?? nextId++,
    name,
    plate,
    type,
    rate,
    status,
    location,
    health,
    mileage,
    image,
  };

  if (editingId) {
    const i=DB.fleet.findIndex(v=>v.id===editingId);
    if (i!==-1) DB.fleet[i]=data;
    showToast(`${data.name} updated successfully`,'success');
  } else {
    DB.fleet.unshift(data);
    showToast(`${data.name} added to fleet`,'success');
  }

  saveFleet();
  const badgeEl = document.getElementById('fleet-badge');
  if (badgeEl) badgeEl.textContent = DB.fleet.length;

  closeModal();
  if (Router.current==='fleet') Pages.fleet();
  if (Router.current==='dashboard') Pages.dashboard();
});

document.getElementById('v-health').addEventListener('input',e=>{
  document.getElementById('v-health-val').textContent=e.target.value+'%';
});
document.getElementById('modal-close').addEventListener('click',closeModal);
document.getElementById('modal-cancel').addEventListener('click',closeModal);
document.getElementById('modal-overlay').addEventListener('click',e=>{
  if (e.target===document.getElementById('modal-overlay')) closeModal();
});

/* ============================================================
   SIDEBAR & NAV
   ============================================================ */
document.getElementById('menu-toggle').addEventListener('click',()=>{
  document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('sidebar-close').addEventListener('click',()=>{
  document.getElementById('sidebar').classList.remove('open');
});
document.querySelectorAll('.nav-item[data-page]').forEach(el=>
  el.addEventListener('click',e=>{ e.preventDefault(); Router.navigate(el.dataset.page); })
);

/* ============================================================
   TOPBAR EVENTS
   ============================================================ */
document.getElementById('notif-btn').addEventListener('click',()=>
  showToast('3 pending alerts — 2 bookings, 1 maintenance','info')
);
document.getElementById('global-search').addEventListener('keydown',e=>{
  if (e.key==='Enter' && e.target.value.trim()) {
    showToast(`Searching: "${e.target.value}"`,'info');
    Router.navigate('fleet');
    e.target.value='';
  }
});

/* ============================================================
   PRELOADER CONTROL (CAPYBARA LOADER)
   ============================================================ */
function hidePreloader() {
  const p = document.getElementById('preloader');
  if (p && !p.classList.contains('hidden')) {
    p.classList.add('hidden');
    setTimeout(() => { p.style.display = 'none'; }, 450);
  }
}

function showPreloader(msg = 'Loading platform...') {
  const p = document.getElementById('preloader');
  if (p) {
    const textEl = p.querySelector('.preloader-text');
    if (textEl) textEl.textContent = msg;
    p.style.display = 'flex';
    requestAnimationFrame(() => p.classList.remove('hidden'));
  }
}

window.showPreloader = showPreloader;
window.hidePreloader = hidePreloader;

// Hide preloader after initial load
setTimeout(hidePreloader, 900);

/* ============================================================
   INIT
   ============================================================ */
Router.navigate('dashboard');
