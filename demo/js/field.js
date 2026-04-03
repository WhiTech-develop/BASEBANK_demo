/* ============================================================
   field.js — 最終完全版
   ============================================================ */

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
    let all = [];
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [fetchActiveDeals] Trying AppSync...');
      const res = await API.graphql({ query: listDealsQuery });
      all = res.data.listDeals.items.filter(d => d.staff_name === Field.loggedInStaff.name);
      console.log('✅ [fetchActiveDeals] AppSync success! Got', all.length, 'deals');
    } catch (appsyncErr) {
      // Fallback to mockdata if AppSync fails (401, network error, etc)
      dataSource = 'Mockdata';
      console.warn('⚠️  [fetchActiveDeals] AppSync failed:', appsyncErr.message);
      console.log('📦 [fetchActiveDeals] Fallback to mockdata...');
      if (typeof window.Store !== 'undefined' && window.Store.getDeals) {
        all = window.Store.getDeals().filter(d => d.staff_name === Field.loggedInStaff.name || d.staffName === Field.loggedInStaff.name);
        console.log('✅ [fetchActiveDeals] Mockdata loaded! Got', all.length, 'deals');
      } else {
        console.error('❌ [fetchActiveDeals] Mockdata not available');
        all = [];
      }
    }

    const active = all.filter(d => d.status === 'waiting' || d.status === 'negotiating');
    const completed = all.filter(d => d.status === 'completed');
    const noDeal = all.filter(d => d.status === 'no_deal');

    console.log(`📊 [fetchActiveDeals] Data source: ${dataSource} | Active: ${active.length}, Completed: ${completed.length}, NoDeal: ${noDeal.length}`);

    let totalBought = 0;
    completed.forEach(d => {
      const ans = typeof d.hqAnswer === 'string' ? JSON.parse(d.hqAnswer || "{}") : (d.hqAnswer || {});
      totalBought += (ans.buyPrice || 0);
    });

    document.getElementById('kpi-buy').textContent = '¥' + totalBought.toLocaleString();
    document.getElementById('kpi-cash').textContent = '¥' + (Field.cashBalance - totalBought).toLocaleString();

    renderList('active-deals', active, true, null);
    renderList('completed-deals', completed, false, '#2563eb');
    renderList('no-deal-list', noDeal, false, '#999');
  } catch (err) { console.error('❌ [fetchActiveDeals] Unexpected error:', err); }
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
  try {
    let deal = null;
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [resumeDeal] Trying AppSync to fetch deal...');
      const res = await API.graphql({ query: listDealsQuery });
      const deals = res.data.listDeals.items;
      deal = deals.find(d => d.id === dealId);
      console.log('✅ [resumeDeal] AppSync success! Deal fetched:', dealId);
    } catch (appsyncErr) {
      // Fallback to mockdata: get deal from localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [resumeDeal] AppSync failed:', appsyncErr.message);
      console.log('📦 [resumeDeal] Fallback to mockdata...');

      if (typeof window.Store !== 'undefined' && window.Store.getDeal) {
        deal = window.Store.getDeal(dealId);
        console.log('✅ [resumeDeal] Mockdata deal fetched:', dealId);
      } else {
        console.error('❌ [resumeDeal] Store not available');
      }
    }

    console.log(`📊 [resumeDeal] Data source: ${dataSource} | Deal: ${deal?.customer}`);

    if (deal && deal.status === 'negotiating') {
      Field.currentDeal = deal;
      showScreen(4);
      handleRealTimeResponse(JSON.parse(deal.hqAnswer || "{}"));
    } else { alert("本部回答待ちです"); }
  } catch (err) { console.error('❌ [resumeDeal] Unexpected error:', err); }
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
    let createdDeal = null;
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [selectMedia] Trying AppSync to create deal...');
      const res = await API.graphql({ query: createDealMutation, variables: { input } });
      createdDeal = res.data.createDeal;
      console.log('✅ [selectMedia] AppSync success! Deal created:', createdDeal.id);
    } catch (appsyncErr) {
      // Fallback to mockdata: create deal in localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [selectMedia] AppSync failed:', appsyncErr.message);
      console.log('📦 [selectMedia] Fallback to mockdata - creating deal locally...');

      createdDeal = {
        id: 'temp_' + Date.now(),
        customer: input.customer,
        status: input.status,
        staff_name: input.staff_name,
        venueLabel: input.venueLabel,
        createdAt: input.createdAt
      };

      if (typeof window.Store !== 'undefined' && window.Store.addDeal) {
        window.Store.addDeal(createdDeal);
        console.log('✅ [selectMedia] Mockdata deal created:', createdDeal.id);
      } else {
        console.error('❌ [selectMedia] Store not available');
      }
    }

    console.log(`📊 [selectMedia] Data source: ${dataSource} | Customer: ${createdDeal.customer}`);
    Field.currentDeal = createdDeal;
    document.getElementById('media-modal').classList.add('hidden');
    showScreen(3);
  } catch (err) { console.error('❌ [selectMedia] Unexpected error:', err); }
}

async function addItemToList() {
  const itemData = {
    dealID: Field.currentDeal.id,
    category: Field.selectedCategory,
    itemName: document.getElementById('item-condition').value || Field.selectedCategory,
    weight: parseFloat(document.getElementById('weight-input')?.value) || 0,
    photos: Field.capturedFiles.map(f => f.base64 || f)  // Base64画像データを含める
  };

  console.log('📋 [addItemToList] itemData created:', {
    category: itemData.category,
    itemName: itemData.itemName,
    weight: itemData.weight,
    photoCount: itemData.photos.length,
    photosIncluded: itemData.photos.length > 0 ? '✅ YES' : '❌ NO'
  });

  try {
    let newItem = null;
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API, Storage } = getAmplify();
      console.log('📡 [addItemToList] Trying AppSync to create item...');
      const res = await API.graphql({ query: createItemMutation, variables: { input: itemData } });
      newItem = res.data.createItem;
      console.log('✅ [addItemToList] AppSync success! Item created:', newItem.id);

      // Upload photos to S3（必要に応じて）
      for (let i = 0; i < Field.capturedFiles.length; i++) {
          const fileData = Field.capturedFiles[i];
          // Base64データをBlob に変換して S3 にアップロード（オプション）
          // const blob = fetch(fileData.base64).then(r => r.blob());
          // await Storage.put(`deals/${Field.currentDeal.id}/${newItem.id}_${i}.jpg`, blob);
      }
    } catch (appsyncErr) {
      // Fallback to mockdata: create item in localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [addItemToList] AppSync failed:', appsyncErr.message);
      console.log('📦 [addItemToList] Fallback to mockdata - creating item locally...');

      newItem = {
        id: 'item_' + Date.now(),
        dealID: Field.currentDeal.id,
        category: itemData.category,
        itemName: itemData.itemName,
        weight: itemData.weight,
        photos: itemData.photos  // 画像データを含める
      };

      if (typeof window.Store !== 'undefined' && window.Store.addItem) {
        window.Store.addItem(newItem);
        console.log('✅ [addItemToList] Mockdata item created:', newItem.id);
      } else {
        console.error('❌ [addItemToList] Store not available');
      }
    }

    console.log(`📊 [addItemToList] Data source: ${dataSource} | Category: ${itemData.category}, Weight: ${itemData.weight}g`);

    // 【重要】newItem に photos が含まれているか確認
    console.log('🔍 [addItemToList] newItem verification:', {
      itemId: newItem.id,
      itemName: newItem.itemName,
      hasPhotos: newItem.photos ? 'YES ✅' : 'NO ❌',
      photoCount: newItem.photos ? newItem.photos.length : 0,
      firstPhotoPreview: newItem.photos && newItem.photos.length > 0 ?
        newItem.photos[0].substring(0, 50) + '...' : 'N/A'
    });

    Field.pendingItems.push(newItem);

    // 【重要】pendingItems に newItem が追加されたか確認
    console.log('📦 [addItemToList] pendingItems updated:', {
      totalItems: Field.pendingItems.length,
      lastItemPhotos: Field.pendingItems[Field.pendingItems.length - 1].photos ?
        Field.pendingItems[Field.pendingItems.length - 1].photos.length + ' photos' : 'no photos'
    });

    renderItemsList();  // リストに画像付きで表示

    // フォームをリセット（入力済みの画像はリストに保存済み）
    console.log('🔄 [addItemToList] Resetting form for next item...');
    console.log('⚠️  [addItemToList] Before reset - Field.capturedFiles:', Field.capturedFiles.length, 'files');

    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('item-condition').value = '';
    const weightInput = document.getElementById('weight-input');
    if (weightInput) weightInput.value = '';
    Field.capturedFiles = [];  // 次の入力用に画像をクリア

    console.log('✅ [addItemToList] Form reset complete');
    console.log('✅ [addItemToList] After reset - Field.capturedFiles:', Field.capturedFiles.length, 'files (OK - data saved in pendingItems)');
    console.log('📊 [addItemToList] Current pendingItems count:', Field.pendingItems.length);
  } catch (err) { console.error('❌ [addItemToList] Unexpected error:', err); }
}

async function sendAssessmentRequest() {
  try {
    // 【重要】送信前に pendingItems に画像が含まれているか確認
    console.log('📤 [sendAssessmentRequest] Verifying pendingItems before sending:');
    Field.pendingItems.forEach((item, idx) => {
      console.log(`  Item ${idx + 1}:`, {
        name: item.itemName,
        hasPhotos: item.photos ? 'YES ✅' : 'NO ❌',
        photoCount: item.photos ? item.photos.length : 0
      });
    });
    console.log(`📊 [sendAssessmentRequest] Total items to send: ${Field.pendingItems.length}`);

    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [sendAssessmentRequest] Trying AppSync to update deal status...');
      await API.graphql({ query: updateDealMutation, variables: { input: { id: Field.currentDeal.id, status: 'waiting' } } });
      console.log('✅ [sendAssessmentRequest] AppSync success! Deal status updated to waiting');
    } catch (appsyncErr) {
      // Fallback to mockdata: update deal in localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [sendAssessmentRequest] AppSync failed:', appsyncErr.message);
      console.log('📦 [sendAssessmentRequest] Fallback to mockdata - updating deal locally...');

      if (typeof window.Store !== 'undefined' && window.Store.updateDeal) {
        window.Store.updateDeal(Field.currentDeal.id, { status: 'waiting' });
        console.log('✅ [sendAssessmentRequest] Mockdata deal updated:', Field.currentDeal.id);
      } else {
        console.error('❌ [sendAssessmentRequest] Store not available');
      }
    }

    console.log(`📊 [sendAssessmentRequest] Data source: ${dataSource} | Deal ID: ${Field.currentDeal.id}`);
    alert("査定依頼を送信しました。");
    Field.currentDeal = null; Field.pendingItems = []; showScreen(2);
  } catch (err) { console.error('❌ [sendAssessmentRequest] Unexpected error:', err); }
}

async function completePurchase() {
  try {
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [completePurchase] Trying AppSync to update deal status to completed...');
      await API.graphql({ query: updateDealMutation, variables: { input: { id: Field.currentDeal.id, status: 'completed' } } });
      console.log('✅ [completePurchase] AppSync success! Deal status updated to completed');
    } catch (appsyncErr) {
      // Fallback to mockdata: update deal in localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [completePurchase] AppSync failed:', appsyncErr.message);
      console.log('📦 [completePurchase] Fallback to mockdata - updating deal locally...');

      if (typeof window.Store !== 'undefined' && window.Store.updateDeal) {
        window.Store.updateDeal(Field.currentDeal.id, { status: 'completed' });
        console.log('✅ [completePurchase] Mockdata deal updated:', Field.currentDeal.id);
      } else {
        console.error('❌ [completePurchase] Store not available');
      }
    }

    console.log(`📊 [completePurchase] Data source: ${dataSource} | Deal ID: ${Field.currentDeal.id}`);
    alert("成約確定しました。");
    showScreen(2);
  } catch (err) { console.error('❌ [completePurchase] Unexpected error:', err); }
}

async function openNoDealModal() {
  if(!confirm("不成約にしますか？")) return;
  try {
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [openNoDealModal] Trying AppSync to update deal status to no_deal...');
      await API.graphql({ query: updateDealMutation, variables: { input: { id: Field.currentDeal.id, status: 'no_deal' } } });
      console.log('✅ [openNoDealModal] AppSync success! Deal status updated to no_deal');
    } catch (appsyncErr) {
      // Fallback to mockdata: update deal in localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [openNoDealModal] AppSync failed:', appsyncErr.message);
      console.log('📦 [openNoDealModal] Fallback to mockdata - updating deal locally...');

      if (typeof window.Store !== 'undefined' && window.Store.updateDeal) {
        window.Store.updateDeal(Field.currentDeal.id, { status: 'no_deal' });
        console.log('✅ [openNoDealModal] Mockdata deal updated:', Field.currentDeal.id);
      } else {
        console.error('❌ [openNoDealModal] Store not available');
      }
    }

    console.log(`📊 [openNoDealModal] Data source: ${dataSource} | Deal ID: ${Field.currentDeal.id}`);
    showScreen(2);
  } catch (err) { console.error('❌ [openNoDealModal] Unexpected error:', err); }
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
  document.getElementById('items-list').innerHTML = Field.pendingItems.map((item, idx) => {
    // 画像を取得
    const photos = item.photos || [];
    const photoHtml = photos.length > 0 ? `
      <div style="display:flex; gap:5px; margin-top:8px;">
        ${photos.map((photo, i) => {
          const src = typeof photo === 'string' && photo.startsWith('data:') ? photo : photo?.base64 || '';
          return src ? `<img src="${src}" style="width:60px; height:60px; border-radius:4px; object-fit:cover;">` : '';
        }).join('')}
      </div>
    ` : '<small style="color:#ccc; margin-top:8px; display:block;">画像なし</small>';

    return `
      <div class="card" style="margin-bottom:8px; padding:10px; background:#f0f7ff;">
        <div style="margin-bottom:8px;">
          <b>${item.itemName}</b> (${item.weight}g)
        </div>
        ${photoHtml}
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('venue-select');
  if (sel) { sel.innerHTML = MockData.venues.map(v => `<option value="${v.id}">${v.name}</option>`).join(''); Field.venueLabel = sel.options[0]?.text; }

  // 画像ファイル入力処理
  const fileInput = document.getElementById('file-input');
  const photoArea = document.getElementById('photo-area');

  if (photoArea) {
    // photo-area をクリックするとfile inputを開く
    photoArea.onclick = () => {
      fileInput.click();
    };
  }

  if (fileInput) {
    // ファイルが選択された時の処理
    fileInput.onchange = (e) => {
      console.log('📁 [Image Upload] File selected:', e.target.files.length, 'files');
      for (let file of e.target.files) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const fileData = {
            name: file.name,
            type: file.type,
            base64: event.target.result
          };
          Field.capturedFiles.push(fileData);
          console.log('✅ [Image Upload] File loaded as Base64:', file.name);

          // サムネイル表示
          const preview = document.getElementById('photo-preview');
          const thumb = document.createElement('div');
          thumb.style.cssText = 'width:60px; height:60px; border-radius:5px; overflow:hidden; border:1px solid #ddd;';
          const img = document.createElement('img');
          img.src = fileData.base64;
          img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
          thumb.appendChild(img);
          preview.appendChild(thumb);
        };
        reader.readAsDataURL(file);
      }
      // ファイル入力をリセット（同じファイルを再度選択可能に）
      fileInput.value = '';
    };
  }

  showScreen(0);
});
