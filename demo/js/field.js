/* ============================================================
   field.js — 最終完全版
   ============================================================ */
const onUpdateDealSub = `subscription OnUpdateDeal {
  onUpdateDeal {
    id
    status
    hqAnswer
  }
}`;

const Field = {
  screen: 0,
  screenHistory: [],
  cashBalance: 500000,
  currentDeal: null,
  capturedFiles: [],
  pendingItems: [],
  loggedInStaff: null,
  selectedCategory: 'gold',
  venueLabel: 'コーナン 西宮今津'
};

function getAmplify() {
  const amp = window.Amplify;
  if (!amp) throw new Error("Amplify missing");
  const API = amp.API || (amp.default && amp.default.API);
  const Storage = amp.Storage || (amp.default && amp.default.Storage);
  return { API, Storage };
}

const listDealsQuery = `query ListDeals { listDeals { items { id customer status staff_name venueLabel hqAnswer createdAt } } }`;
const createDealMutation = `mutation CreateDeal($input: CreateDealInput!) { createDeal(input: $input) { id customer status staff_name venueLabel } }`;
const updateDealMutation = `mutation UpdateDeal($input: UpdateDealInput!) { updateDeal(input: $input) { id status hqAnswer } }`;
const createItemMutation = `mutation CreateItem($input: CreateItemInput!) { createItem(input: $input) { id dealID category itemName weight buy_price } }`;

async function showScreen(n) {
  if (Field.screen !== n) Field.screenHistory.push(Field.screen);
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById('screen-' + n);
  if (target) target.classList.remove('hidden');
  Field.screen = n;
  if (n === 2) { renderDashboard(); await fetchActiveDeals(); }
  if (n === 3) initScreen3();
  document.getElementById('fab')?.classList.toggle('hidden', n !== 2);
  document.getElementById('nav-logout')?.classList.toggle('hidden', n === 0);
}

function navBack() { if (Field.screenHistory.length > 0) showScreen(Field.screenHistory.pop()); }

function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-password').value.trim();
  if (id === 'Keita062' && pass === '1234') {
    Field.loggedInStaff = { name: '古川 健太' };
    showScreen(1);
  } else { alert('ID不一致'); }
}

function loginInputChanged() {
  const btn = document.getElementById('login-btn');
  if (btn) btn.disabled = !(document.getElementById('login-id').value && document.getElementById('login-password').value);
}

function openRegister() {
  Field.cashBalance = parseInt(document.getElementById('cash-input').value) || 500000;
  const sel = document.getElementById('venue-select');
  if (sel) Field.venueLabel = sel.options[sel.selectedIndex]?.text || Field.venueLabel;
  showScreen(2);
}

async function fetchActiveDeals() {
  try {
    const { API } = getAmplify();
    const res = await API.graphql({ query: listDealsQuery, authMode: 'API_KEY' });
    const all = res.data.listDeals.items.filter(d => d.staff_name === Field.loggedInStaff.name);
    const active = all.filter(d => d.status === 'waiting' || d.status === 'negotiating');
    const completed = all.filter(d => d.status === 'completed');
    const noDeal = all.filter(d => d.status === 'no_deal');

    let totalBought = 0;
    completed.forEach(d => {
      const ans = JSON.parse(d.hqAnswer || "{}");
      totalBought += (ans.buyPrice || 0);
    });
    
    document.getElementById('kpi-buy').textContent = '¥' + totalBought.toLocaleString();
    document.getElementById('kpi-cash').textContent = '¥' + (Field.cashBalance - totalBought).toLocaleString();

    renderList('active-deals', active, true, null);
    renderList('completed-deals', completed, false, '#2563eb');
    renderList('no-deal-list', noDeal, false, '#999');
  } catch (err) { console.error(err); }
}

function renderList(elementId, items, clickable, color) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (items.length === 0) { el.innerHTML = '<div style="font-size:12px;color:#ccc;padding:10px;">なし</div>'; return; }
  el.innerHTML = items.map(d => `
    <div class="card" ${clickable ? `onclick="resumeDeal('${d.id}')"` : ''} style="margin-bottom:8px; border-left:4px solid ${color || (d.status==='negotiating'?'#10b981':'#ef4444')}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div><b>${d.customer}様</b><br><small>${new Date(d.createdAt).toLocaleTimeString()}</small></div>
        <div style="text-align:right;">${d.status === 'completed' ? '¥'+JSON.parse(d.hqAnswer).buyPrice.toLocaleString() : ''}</div>
      </div>
    </div>
  `).join('');
}

async function resumeDeal(dealId) {
  const { API } = getAmplify();
  const res = await API.graphql({ query: listDealsQuery, authMode: 'API_KEY' });
  const deal = res.data.listDeals.items.find(d => d.id === dealId);
  if (deal && deal.status === 'negotiating') {
    Field.currentDeal = deal;
    showScreen(4);
    handleRealTimeResponse(JSON.parse(deal.hqAnswer));
  } else { alert("本部回答待ちです"); }
}

function openNewCustomer() {
  document.getElementById('media-modal').classList.remove('hidden');
  const grid = document.getElementById('media-grid');
  if (grid && typeof MockData !== 'undefined') {
    grid.innerHTML = MockData.mediaOptions.map(m => `<button class="btn btn-secondary" onclick="selectMedia('${m.id}')">${m.label}</button>`).join('');
  }
}

async function selectMedia(mediaId) {
  const name = document.getElementById('customer-name-input').value || '新規顧客';
  const input = { customer: name, status: 'registering', staff_name: Field.loggedInStaff.name, venueLabel: Field.venueLabel, createdAt: new Date().toISOString() };
  try {
    const { API } = getAmplify();
    const res = await API.graphql({ query: createDealMutation, variables: { input }, authMode: 'API_KEY' });
    Field.currentDeal = res.data.createDeal;
    document.getElementById('media-modal').classList.add('hidden');
    showScreen(3);
  } catch (err) { console.error(err); }
}

async function addItemToList() {
  const itemData = { dealID: Field.currentDeal.id, category: Field.selectedCategory, itemName: document.getElementById('item-condition').value || Field.selectedCategory, weight: parseFloat(document.getElementById('weight-input')?.value) || 0 };
  try {
    const { API, Storage } = getAmplify();
    const res = await API.graphql({ query: createItemMutation, variables: { input: itemData }, authMode: 'API_KEY' });
    const newItem = res.data.createItem;
    for (let i = 0; i < Field.capturedFiles.length; i++) {
        await Storage.put(`deals/${Field.currentDeal.id}/${newItem.id}_${i}.jpg`, Field.capturedFiles[i]);
    }
    Field.pendingItems.push(newItem);
    renderItemsList();
    document.getElementById('photo-preview').innerHTML = '';
  } catch (err) { console.error(err); }
}

async function sendAssessmentRequest() {
  try {
    const { API } = getAmplify();
    await API.graphql({ query: updateDealMutation, variables: { input: { id: Field.currentDeal.id, status: 'waiting' } }, authMode: 'API_KEY' });
    alert("査定依頼を送信しました。");
    Field.currentDeal = null; Field.pendingItems = []; showScreen(2);
  } catch (err) { console.error(err); }
}

async function completePurchase() {
  try {
    const { API } = getAmplify();
    await API.graphql({ query: updateDealMutation, variables: { input: { id: Field.currentDeal.id, status: 'completed' } }, authMode: 'API_KEY' });
    alert("成約確定しました。");
    showScreen(2);
  } catch (err) { console.error(err); }
}

async function openNoDealModal() {
  if(!confirm("不成約にしますか？")) return;
  try {
    const { API } = getAmplify();
    await API.graphql({ query: updateDealMutation, variables: { input: { id: Field.currentDeal.id, status: 'no_deal' } }, authMode: 'API_KEY' });
    showScreen(2);
  } catch (err) { console.error(err); }
}

function handleRealTimeResponse(answer) {
  document.getElementById('waiting-card').classList.add('hidden');
  const replyEl = document.getElementById('hq-reply');
  replyEl.classList.remove('hidden');
  document.getElementById('reply-buy').textContent = '¥' + answer.buyPrice.toLocaleString();
  document.getElementById('reply-sell').textContent = '¥' + answer.sellPrice.toLocaleString();
  document.getElementById('reply-comment').textContent = answer.comment;
}

function renderDashboard() { document.getElementById('kpi-cash').textContent = '¥' + Field.cashBalance.toLocaleString(); }
function initScreen3() { 
  Field.pendingItems = []; 
  document.getElementById('cat-tabs').innerHTML = MockData.categories.map(c => `<button class="btn ${Field.selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}" onclick="selectCategory('${c.id}')">${c.label}</button>`).join('');
  renderCategoryFields(); 
}
function selectCategory(id) { Field.selectedCategory = id; initScreen3(); }
function renderCategoryFields() {
  const wrap = document.getElementById('purity-weight-wrap');
  if (!wrap) return;
  wrap.innerHTML = (['gold','jewelry'].includes(Field.selectedCategory)) ? `<label class="form-label">重量(g)</label><input type="number" id="weight-input" class="input-field" placeholder="0.00">` : '';
}
function renderItemsList() {
  document.getElementById('items-list-area').classList.remove('hidden');
  document.getElementById('send-assessment-btn').classList.remove('hidden');
  document.getElementById('items-list').innerHTML = Field.pendingItems.map(item => `<div class="card" style="margin-bottom:8px; padding:10px; background:#f0f7ff;">${item.itemName} (${item.weight}g)</div>`).join('');
}

function setupSubscriptions() {
  try {
    const { API } = getAmplify();
    
    API.graphql({ query: onUpdateDealSub, authMode: 'API_KEY' }).subscribe({
      next: (data) => {
        const updatedDeal = data.value.data.onUpdateDeal;
        console.log("🔔 本部からの更新を検知:", updatedDeal);

        // ダッシュボード（画面2）にいる場合、リストを再描画して緑色にする
        if (Field.screen === 2) {
          fetchActiveDeals(); 
        }

        // 個別案件の待機画面（画面4）にいる場合、結果を表示する
        if (Field.screen === 4 && Field.currentDeal && updatedDeal.id === Field.currentDeal.id) {
          if (updatedDeal.status === 'negotiating') {
            handleRealTimeResponse(JSON.parse(updatedDeal.hqAnswer));
          }
        }
      },
      error: (err) => console.error("🚨 サブスクリプションエラー:", err)
    });
  } catch (err) {
    // Amplifyの初期化が間に合わない場合は1秒後に再試行
    setTimeout(setupSubscriptions, 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('venue-select');
  if (sel) { 
    sel.innerHTML = MockData.venues.map(v => `<option value="${v.id}">${v.name}</option>`).join(''); 
    Field.venueLabel = sel.options[0]?.text; 
  }
  
  // 写真撮影エリアの処理（既存のまま）
  const photoArea = document.getElementById('photo-area');
  if (photoArea) {
    photoArea.onclick = () => {
      const dummy = new File([""], `img_${Date.now()}.jpg`, { type: "image/jpeg" });
      Field.capturedFiles.push(dummy);
      document.getElementById('photo-preview').innerHTML += `<div class="photo-thumb" style="width:50px; height:50px; background:#ddd; border-radius:5px; display:flex; align-items:center; justify-content:center;">📷</div>`;
    };
  }

  // ★重要：ここでサブスクリプションを開始する
  setupSubscriptions();

  showScreen(0);
});
