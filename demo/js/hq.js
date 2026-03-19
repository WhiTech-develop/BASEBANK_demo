/* ============================================================
   hq.js — 本部スタッフ向けダッシュボード ロジック (完全版)
   機能：リアルタイム査定、KPI分析、商品DB管理、現場へのPush通知統合
   ============================================================ */

/* ========================================================
   1. グローバル変数・定数
   ======================================================== */
let charts = {};   // Chart.js インスタンス保管
let selectedQueueId = null;
let selectedRatePurity = 'K18';

// 商品データベース用
let inventoryFiltered = [];
let inventoryAll = [];
let invCurrentPage = 1;
const INV_PAGE_SIZE = 30;

/* ========================================================
   2. タブ切り替え・ユーティリティ
   ======================================================== */
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => el.classList.remove('active'));

  const content = document.getElementById('tab-' + tabId);
  if (content) content.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // タブごとの初期化
  if (tabId === 'dashboard')   initDashboard();
  if (tabId === 'inventory')   initInventory();
  if (tabId === 'assessment')  initAssessment();
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return '¥' + Number(n).toLocaleString('ja-JP');
}

function esc(s) {
  if (!s) return '—';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ========================================================
   3. TAB 1: ダッシュボード (分析・KPI)
   ======================================================== */
function initDashboard() {
  _populateDashFilters();
  applyDashFilters();
}

function _populateDashFilters() {
  const venueSelect = document.getElementById('dash-venue-filter');
  const mediaSelect = document.getElementById('dash-media-filter');
  const buyerSelect = document.getElementById('dash-buyer-filter');
  if (!venueSelect) return;

  const venues = MockData.venueStats.map(v => v.name);
  venueSelect.innerHTML = '<option value="">全会場</option>' + venues.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');

  const medias = MockData.mediaStats.map(m => m.media);
  mediaSelect.innerHTML = '<option value="">全媒体</option>' + medias.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');

  const buyers = [...new Set(MockData.venueStats.filter(v => v.buyer && v.buyer !== '—').map(v => v.buyer))];
  buyerSelect.innerHTML = '<option value="">全バイヤー</option>' + buyers.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
}

function applyDashFilters() {
  const venueVal = document.getElementById('dash-venue-filter')?.value || '';
  const mediaVal = document.getElementById('dash-media-filter')?.value || '';
  const buyerVal = document.getElementById('dash-buyer-filter')?.value || '';
  renderKPI(venueVal, buyerVal);
  renderVenueTable(venueVal, buyerVal);
  renderCharts(mediaVal);
  renderActivityFeed(venueVal);
  renderMediaPerf(mediaVal);
}

function resetDashFilters() {
  ['dash-venue-filter', 'dash-media-filter', 'dash-buyer-filter'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  applyDashFilters();
}

function renderKPI(venueFilter, buyerFilter) {
  const k = MockData.monthlyKPI;
  let filteredVenues = MockData.venueStats;
  if (venueFilter) filteredVenues = filteredVenues.filter(v => v.name === venueFilter);
  if (buyerFilter) filteredVenues = filteredVenues.filter(v => v.buyer === buyerFilter);
  const isFiltered = venueFilter || buyerFilter;

  let storeDeals = Store.getDeals();
  if (venueFilter) storeDeals = storeDeals.filter(d => (d.venueLabel || '') === venueFilter);
  if (buyerFilter) storeDeals = storeDeals.filter(d => (d.buyerName || '') === buyerFilter);
  
  const storeDone = storeDeals.filter(d => d.status === 'done');
  const storeProfit = storeDone.reduce((s, d) => s + (Math.max(0, (d.hqAnswer?.sellPrice || 0) - (d.buyPrice || 0))), 0);

  const totalAssess = (isFiltered ? filteredVenues.reduce((s,v) => s + v.assessments, 0) : k.totalAssessments) + storeDeals.length;
  const totalDeals  = (isFiltered ? filteredVenues.reduce((s,v) => s + v.deals, 0) : k.completedDeals) + storeDone.length;
  const baseProfit  = isFiltered ? filteredVenues.reduce((s,v) => s + v.sales, 0) * 0.15 : k.totalProfit;
  const totalProfit = baseProfit + storeProfit;

  document.getElementById('kpi-assessments').textContent = totalAssess.toLocaleString();
  document.getElementById('kpi-deals').textContent       = totalDeals.toLocaleString();
  document.getElementById('kpi-rate').textContent        = totalAssess > 0 ? (totalDeals / totalAssess * 100).toFixed(1) + '%' : '0%';
  document.getElementById('kpi-profit').textContent      = fmt(totalProfit);
  
  const targetRate = k.monthTarget > 0 ? (totalProfit / k.monthTarget * 100) : 0;
  document.getElementById('kpi-target').textContent = targetRate.toFixed(1) + '%';
  const bar = document.getElementById('target-bar');
  if (bar) bar.style.width = Math.min(targetRate, 100) + '%';
}

function renderVenueTable(venueFilter, buyerFilter) {
  const tbody = document.getElementById('venue-tbody');
  let stats = MockData.venueStats;
  if (venueFilter) stats = stats.filter(v => v.name === venueFilter);
  if (buyerFilter) stats = stats.filter(v => v.buyer === buyerFilter);

  tbody.innerHTML = stats.map(v => {
    const rate = v.assessments > 0 ? Math.round(v.deals / v.assessments * 100) : 0;
    return `
      <tr class="${v.active ? '' : 'inactive-row'}">
        <td>
          <div class="venue-name-cell">
            <div class="venue-status-dot ${v.active ? 'dot-active' : 'dot-inactive'}"></div>
            <div>
              <div style="font-weight:600">${esc(v.name)}</div>
              <div style="font-size:11px;color:var(--text-secondary)">${esc(v.buyer)}</div>
            </div>
          </div>
        </td>
        <td class="mono buy-val">${fmt(v.sales)}</td>
        <td class="mono">${fmt(v.cash)}</td>
        <td class="mono" style="color:var(--text-secondary)">${v.deals} / ${v.assessments}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;background:var(--border-subtle);border-radius:3px;height:5px;overflow:hidden;min-width:60px">
              <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,var(--accent-blue-dark),var(--accent-blue));"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:var(--accent-blue);min-width:30px">${rate}%</span>
          </div>
        </td>
        <td><span class="badge ${v.active ? 'badge-green' : 'badge-red'}">${v.active ? '稼働中' : '休催'}</span></td>
      </tr>`;
  }).join('');
}

function renderCharts(mediaFilter) {
  const canvasBar = document.getElementById('media-bar-chart');
  if (canvasBar) {
    if (charts.mediaBar) charts.mediaBar.destroy();
    let stats = MockData.mediaStats;
    if (mediaFilter) stats = stats.filter(m => m.media === mediaFilter);
    charts.mediaBar = new Chart(canvasBar, {
      type: 'bar',
      data: {
        labels: stats.map(m => m.media),
        datasets: [
          { label: '成約件数', data: stats.map(m => m.deals), backgroundColor: 'rgba(37,99,235,0.7)', yAxisID: 'y' },
          { label: '粗利(万円)', data: stats.map(m => m.profit / 10000), type: 'line', borderColor: '#4BBA88', yAxisID: 'y1' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y1: { position: 'right', grid: { display: false } } } }
    });
  }

  const canvasPie = document.getElementById('success-doughnut');
  if (canvasPie) {
    if (charts.doughnut) charts.doughnut.destroy();
    charts.doughnut = new Chart(canvasPie, {
      type: 'doughnut',
      data: {
        labels: ['成約', '不成約'],
        datasets: [{ data: [MockData.monthlyKPI.completedDeals, MockData.monthlyKPI.totalAssessments - MockData.monthlyKPI.completedDeals], backgroundColor: ['#2563EB', '#E5E7EB'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }
}

function renderActivityFeed(venueFilter) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  const storeActivities = Store.getDeals().slice(0, 5).map(d => ({
    icon: d.status === 'done' ? 'fa-handshake' : 'fa-paper-plane',
    color: d.status === 'done' ? 'var(--accent-green)' : 'var(--accent-blue)',
    text: `${d.buyerName || '担当'} が ${d.customer}様の案件を${d.status === 'done' ? '成約' : '更新'}`,
    time: d.createdAt?.slice(-8, -3) || '--:--'
  }));
  feed.innerHTML = storeActivities.map(a => `
    <div class="activity-item">
      <div class="activity-icon" style="background:${a.color}15;color:${a.color}"><i class="fa-solid ${a.icon}"></i></div>
      <div class="activity-text">${esc(a.text)}</div>
      <div class="activity-time">${a.time}</div>
    </div>`).join('');
}

function renderMediaPerf(mediaFilter) {
  const grid = document.getElementById('media-perf-grid');
  if (!grid) return;
  let stats = MockData.mediaStats;
  if (mediaFilter) stats = stats.filter(m => m.media === mediaFilter);
  grid.innerHTML = stats.map(m => `
    <div class="media-perf-card">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">${esc(m.media)}</div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:var(--text-secondary)">成約数</span><span style="font-weight:700">${m.deals}件</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:var(--text-secondary)">粗利</span><span style="font-weight:700;color:var(--accent-green)">${fmt(m.profit)}</span>
      </div>
    </div>`).join('');
}

/* ========================================================
   4. TAB 2: 商品データベース (一元管理)
   ======================================================== */
function _buildInventoryAll() {
  const base = MockData.inventory.map(i => ({ ...i, _source: 'mock' }));
  const storeRows = [];
  Store.getDeals().filter(d => d.status === 'done').forEach(d => {
    const common = {
      date: d.createdAt?.slice(0, 10) || '—',
      venue: d.venueLabel || '—',
      buyer: d.buyerName || '—',
      media: d.mediaLabel || '—',
      customer: d.customer || '—',
      buyPrice: d.buyPrice || 0,
      sellPrice: d.hqAnswer?.sellPrice || 0,
      profit: (d.hqAnswer?.sellPrice || 0) - (d.buyPrice || 0)
    };
    if (d.items?.length > 0) {
      d.items.forEach((item, idx) => {
        storeRows.push({ ...common, id: d.id + '_' + idx, category: item.categoryLabel || '—', item: item.itemName || '—', purity: item.purity, weight: item.weight, buyPrice: idx === 0 ? common.buyPrice : null });
      });
    } else {
      storeRows.push({ ...common, id: d.id, category: d.categoryLabel || '—', item: d.categoryLabel || '—' });
    }
  });
  return [...storeRows, ...base];
}

function initInventory() {
  inventoryAll = _buildInventoryAll();
  filterInventory();
}

function filterInventory() {
  const catVal = document.getElementById('filter-cat')?.value || '';
  const search = document.getElementById('inv-search')?.value.trim().toLowerCase() || '';
  inventoryFiltered = inventoryAll.filter(item => {
    if (catVal && item.category !== catVal) return false;
    if (search && !((item.item || '').toLowerCase().includes(search) || (item.customer || '').toLowerCase().includes(search))) return false;
    return true;
  });
  invCurrentPage = 1;
  renderInventoryTable();
}

function renderInventoryTable() {
  const tbody = document.getElementById('inv-tbody');
  const start = (invCurrentPage - 1) * INV_PAGE_SIZE;
  const pageItems = inventoryFiltered.slice(start, start + INV_PAGE_SIZE);

  document.getElementById('inv-total-items').textContent = inventoryFiltered.length + '件';
  document.getElementById('inv-total-profit').textContent = fmt(inventoryFiltered.reduce((s,i) => s + (i.profit || 0), 0));

  tbody.innerHTML = pageItems.map(item => `
    <tr>
      <td style="font-size:12px">${esc(item.date)}</td>
      <td style="font-size:12px">${esc(item.venue)}</td>
      <td>${esc(item.customer)}</td>
      <td>${esc(item.category)}</td>
      <td style="font-weight:600">${esc(item.item)}</td>
      <td class="mono buy-val">${item.buyPrice ? fmt(item.buyPrice) : '—'}</td>
      <td class="mono profit-val">${item.profit ? fmt(item.profit) : '—'}</td>
    </tr>`).join('');
  renderInvPagination();
}

function renderInvPagination() {
  const el = document.getElementById('inv-pagination');
  const totalPages = Math.ceil(inventoryFiltered.length / INV_PAGE_SIZE);
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `<button onclick="goInvPage(${invCurrentPage-1})" ${invCurrentPage===1?'disabled':''}>前へ</button>
                  <span>${invCurrentPage}/${totalPages}</span>
                  <button onclick="goInvPage(${invCurrentPage+1})" ${invCurrentPage===totalPages?'disabled':''}>次へ</button>`;
}

function goInvPage(p) { invCurrentPage = p; renderInventoryTable(); }

function exportCSV() {
  const csv = [["日付","会場","顧客","商品","下代","粗利"], ...inventoryFiltered.map(i => [i.date, i.venue, i.customer, i.item, i.buyPrice, i.profit])]
    .map(r => r.join(',')).join('\n');
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'inventory.csv'; a.click();
}

/* ========================================================
   5. TAB 3: 査定コンソール (リアルタイム通信統合)
   ======================================================== */
function initAssessment() {
  renderRateWidget();
  renderQueueList();
  renderAssessPanel(null);
}

function renderRateWidget() {
  const grid = document.getElementById('rate-grid');
  const rates = MockData.goldRates;
  grid.innerHTML = ['K24','K18','Pt900','Pt950'].map(k => `
    <div class="rate-item ${k === selectedRatePurity ? 'selected' : ''}" onclick="selectRate('${k}')">
      <div class="rate-name">${k}</div>
      <div class="rate-price">${rates[k]?.toLocaleString()}円/g</div>
    </div>`).join('');
  document.getElementById('rate-updated').textContent = '更新：' + rates.updated;
  updateCalc();
}

function selectRate(p) { selectedRatePurity = p; renderRateWidget(); }

function updateCalc() {
  const rate = MockData.goldRates[selectedRatePurity] || 0;
  const weight = parseFloat(document.getElementById('calc-weight')?.value) || 0;
  const result = Math.floor(rate * weight);
  document.getElementById('calc-rate').textContent = rate.toLocaleString() + ' 円/g';
  document.getElementById('calc-result').textContent = result > 0 ? fmt(result) : '—';
}

function _buildAllQueue() {
  const storeWaiting = Store.getDeals().filter(d => d.status === 'waiting' || d.status === 'negotiating').map(d => ({
    id: d.id, status: d.hqAnswer ? 'answered' : 'pending', venue: d.venueLabel, buyer: d.buyerName, time: d.createdAt?.slice(-8, -3),
    category: d.categoryLabel, items: d.items, customerNote: d.customerNote, condition: d.condition, _isStore: true
  }));
  return [...storeWaiting, ...MockData.assessmentQueue];
}

function renderQueueList() {
  const list = document.getElementById('queue-list');
  const all = _buildAllQueue();
  document.getElementById('queue-badge').textContent = all.filter(q => q.status === 'pending').length;
  list.innerHTML = all.map(q => `
    <div class="queue-card ${q.id === selectedQueueId ? 'selected' : ''} ${q.status === 'answered' ? 'answered' : ''}" onclick="selectQueue('${q.id}')">
      <div class="queue-header"><span class="queue-venue">${esc(q.venue)}</span><span class="queue-time">${q.time}</span></div>
      <div class="queue-detail">${esc(q.buyer)} | ${q.items?.length || 1}点</div>
    </div>`).join('');
}

function selectQueue(id) {
  selectedQueueId = id;
  const item = _buildAllQueue().find(q => q.id === id);
  renderAssessPanel(item);
  renderQueueList();
}

function renderAssessPanel(item) {
  const panel = document.getElementById('assess-panel');
  if (!item) { panel.innerHTML = '<div class="assess-panel-empty">依頼を選択してください</div>'; return; }
  panel.innerHTML = `
    <div style="margin-bottom:20px"><strong>${esc(item.venue)}</strong> (${esc(item.buyer)})</div>
    <div class="assess-section">
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">商材</div><div class="detail-value">${esc(item.category)}</div></div>
        <div class="detail-item"><div class="detail-label">希望額</div><div class="detail-value">${esc(item.customerNote || 'なし')}</div></div>
      </div>
    </div>
    <div class="assess-section">
      <div class="assess-section-title">査定回答</div>
      <div class="answer-row">
        <div class="answer-input-wrap"><span>¥</span><input type="number" id="answer-buy" placeholder="下代"></div>
        <div class="answer-input-wrap"><span>¥</span><input type="number" id="answer-sell" placeholder="上代"></div>
      </div>
      <textarea id="answer-comment" class="input-field" style="margin-top:10px" placeholder="コメント..."></textarea>
      <button class="btn btn-primary btn-block" style="margin-top:15px" onclick="submitAnswer('${item.id}')">
        現場へ査定結果をリアルタイム送信
      </button>
    </div>
    <div class="assess-section">
      <div class="assess-section-title">メッセージ</div>
      <div id="hq-chat-area" class="chat-area" style="background:var(--bg-secondary);height:120px;overflow-y:auto;padding:10px;border-radius:8px">
        ${_renderHQChatMessages(item)}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="hq-chat-input" class="input-field" style="flex:1" placeholder="メッセージ...">
        <button class="btn btn-primary btn-sm" onclick="sendHQMessage('${item.id}')">送信</button>
      </div>
    </div>`;
}

function submitAnswer(id) {
  const buy = parseInt(document.getElementById('answer-buy').value);
  const sell = parseInt(document.getElementById('answer-sell').value);
  const comment = document.getElementById('answer-comment').value;

  if (!buy || !sell) { showHQToast('金額を入力してください', 'error'); return; }

  const answer = { buyPrice: buy, sellPrice: sell, comment, staffName: '本部査定員', repliedAt: new Date().toLocaleTimeString() };

  // Store更新 & リアルタイム通知 (postMessageを利用したWebSocketシミュレート)
  Store.updateDeal(id, { status: 'negotiating', hqAnswer: answer });
  if (window.opener || window.parent) {
    (window.opener || window.parent).postMessage({ type: 'APPRAISAL_RECEIVED', dealId: id, answer }, '*');
  }

  showHQToast('現場に送信しました！', 'success');
  renderQueueList();
}

function _renderHQChatMessages(item) {
  const deal = Store.getDeal(item.id);
  const msgs = deal?.messages || [];
  return msgs.map(m => `<div style="text-align:${m.from==='hq'?'right':'left'}"><div style="display:inline-block;background:${m.from==='hq'?'#1D4ED8':'#fff'};color:${m.from==='hq'?'#fff':'#000'};padding:5px 10px;border-radius:8px;font-size:12px;margin:2px">${esc(m.text)}</div></div>`).join('');
}

function sendHQMessage(id) {
  const input = document.getElementById('hq-chat-input');
  if (!input.value.trim()) return;
  const deal = Store.getDeal(id);
  const msgs = deal?.messages || [];
  msgs.push({ from: 'hq', text: input.value, time: new Date().toLocaleTimeString() });
  Store.updateDeal(id, { messages: msgs });
  input.value = '';
  _refreshChat(id);
}

function _refreshChat(id) {
  const area = document.getElementById('hq-chat-area');
  const item = _buildAllQueue().find(q => q.id === id);
  if (area && item) area.innerHTML = _renderHQChatMessages(item);
}

function showHQToast(msg, type) { console.log(`HQ Toast: ${msg}`); }

/* ========================================================
   DOMContentLoaded
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
  showTab('dashboard');
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => el.addEventListener('click', () => showTab(el.dataset.tab)));
});
