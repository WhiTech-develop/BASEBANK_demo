/* ============================================================
   field.js — AWS Amplify 統合版 (UIロジック全維持)
   ============================================================ */
/* ============================================================
   field.js — AWS Amplify 統合・エラー解消版
   ============================================================ */
const Field = {
  screen: 0,
  screenHistory: [],
  cashBalance: 500000,
  currentDeal: null,
  capturedFiles: [],
  pendingItems: [],
  loggedInStaff: null,
  selectedCategory: 'gold'
};

// 2. ライブラリを安全に取得 (グローバル変数 window.Amplify を使用)
// ブラウザが Amplify を読み込めていない場合に備え、空の機能（ダミー）をセット
const ampBase = window.Amplify || window['aws-amplify'] || {};
const API = ampBase.API || { graphql: () => Promise.reject("Amplify not loaded") };
const graphqlOperation = ampBase.graphqlOperation || ((q, v) => ({query: q, variables: v}));
const Storage = ampBase.Storage || { put: () => Promise.reject("S3 not available") };

// 3. GraphQL定義 (場所はここでも問題ありません)
const createDealMutation = `mutation CreateDeal($input: CreateDealInput!) { createDeal(input: $input) { id customer status staff_name venueLabel } }`;
const updateDealMutation = `mutation UpdateDeal($input: UpdateDealInput!) { updateDeal(input: $input) { id status hqAnswer } }`;
const createItemMutation = `mutation CreateItem($input: CreateItemInput!) { createItem(input: $input) { id dealID category itemName weight buy_price } }`;
const onUpdateDealSubscription = `subscription OnUpdateDeal { onUpdateDeal { id status hqAnswer } }`;

/* --- 1. 画面遷移 & ログイン --- */
function showScreen(n) {
  if (Field.screen !== n) Field.screenHistory.push(Field.screen);
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById('screen-' + n);
  if (target) target.classList.remove('hidden');
  
  Field.screen = n;
  if (n === 2) renderDashboard();
  if (n === 3) initScreen3();
  document.getElementById('fab')?.classList.toggle('hidden', n !== 2);
  document.getElementById('nav-logout')?.classList.toggle('hidden', n === 0);
}

// ID: Keita062 / Pass: 1234 限定ログイン
function doLogin() {
  const idInput = document.getElementById('login-id').value.trim();
  const passInput = document.getElementById('login-password').value.trim();

  if (idInput === 'Keita062' && passInput === '1234') {
    Field.loggedInStaff = { name: '古川 健太' };
    showScreen(1);
  } else {
    alert('IDまたはパスワードが正しくありません。');
  }
}

function loginInputChanged() {
  const id = document.getElementById('login-id').value;
  const pass = document.getElementById('login-password').value;
  // IDとパスワード両方入力されたらボタンを有効化
  document.getElementById('login-btn').disabled = !(id && pass);
}

function openRegister() {
  Field.cashBalance = parseInt(document.getElementById('cash-input').value) || 500000;
  showScreen(2);
}

/* --- 2. AWS S3: 画像圧縮 & アップロード --- */
async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1200;
        let width = img.width, height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
      };
    };
  });
}

async function uploadToS3(blob, dealId, itemId, index) {
  const fileName = `deals/${dealId}/${itemId}_${index}.jpg`;
  try {
    await Storage.put(fileName, blob, { contentType: 'image/jpeg', level: 'public' });
    console.log("S3 Uploaded:", fileName);
  } catch (err) { console.error("S3 Error:", err); }
}

/* --- 3. AWS AppSync: リアルタイム査定 --- */
function openNewCustomer() {
  document.getElementById('media-modal').classList.remove('hidden');
  const grid = document.getElementById('media-grid');
  grid.innerHTML = MockData.mediaOptions.map(m => `<button class="btn btn-secondary" onclick="selectMedia('${m.id}')">${m.label}</button>`).join('');
}

async function selectMedia(mediaId) {
  const name = document.getElementById('customer-name-input').value || '新規顧客';
  const input = {
    customer: name, status: 'registering', staff_name: Field.loggedInStaff.name,
    venueLabel: 'コーナン 西宮今津', createdAt: new Date().toISOString()
  };
  const res = await API.graphql(graphqlOperation(createDealMutation, { input }));
  Field.currentDeal = res.data.createDeal;
  document.getElementById('media-modal').classList.add('hidden');
  showScreen(3);
}

async function addItemToList() {
  const itemData = {
    dealID: Field.currentDeal.id, category: Field.selectedCategory,
    itemName: document.getElementById('item-condition').value || Field.selectedCategory,
    weight: parseFloat(document.getElementById('weight-input')?.value) || 0
  };
  const res = await API.graphql(graphqlOperation(createItemMutation, { input: itemData }));
  const newItem = res.data.createItem;

  for (let i = 0; i < Field.capturedFiles.length; i++) {
    const compressed = await compressImage(Field.capturedFiles[i]);
    await uploadToS3(compressed, Field.currentDeal.id, newItem.id, i);
  }
  Field.pendingItems.push(newItem);
  renderItemsList();
  Field.capturedFiles = [];
  document.getElementById('photo-preview').innerHTML = '';
}

async function sendAssessmentRequest() {
  await API.graphql(graphqlOperation(updateDealMutation, {
    input: { id: Field.currentDeal.id, status: 'waiting' }
  }));
  subscribeToAppraisal(Field.currentDeal.id);
  showScreen(4);
}

function subscribeToAppraisal(dealId) {
  API.graphql(graphqlOperation(onUpdateDealSubscription)).subscribe({
    next: (data) => {
      const updated = data.value.data.onUpdateDeal;
      if (updated.id === dealId && updated.status === 'negotiating') {
        handleRealTimeResponse(JSON.parse(updated.hqAnswer));
      }
    }
  });
}

function handleRealTimeResponse(answer) {
  document.getElementById('waiting-card').classList.add('hidden');
  const replyEl = document.getElementById('hq-reply');
  replyEl.classList.remove('hidden');
  document.getElementById('reply-buy').textContent = '¥' + answer.buyPrice.toLocaleString();
  document.getElementById('reply-sell').textContent = '¥' + answer.sellPrice.toLocaleString();
  document.getElementById('reply-comment').textContent = answer.comment;
}

/* --- 4. 既存UIレンダリング (変更なし) --- */
function renderDashboard() {
  document.getElementById('kpi-cash').textContent = '¥' + Field.cashBalance.toLocaleString();
  document.getElementById('kpi-buy').textContent = '¥0';
}

function initScreen3() {
  Field.pendingItems = [];
  document.getElementById('cat-tabs').innerHTML = MockData.categories.map(c => 
    `<button class="btn ${Field.selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}" onclick="selectCategory('${c.id}')">${c.label}</button>`
  ).join('');
  renderCategoryFields();
}

function selectCategory(id) { Field.selectedCategory = id; initScreen3(); }

function renderCategoryFields() {
  const wrap = document.getElementById('purity-weight-wrap');
  if (['gold','jewelry'].includes(Field.selectedCategory)) {
    wrap.innerHTML = `<label class="form-label">重量(g)</label><input type="number" id="weight-input" class="input-field" placeholder="0.00">`;
  } else { wrap.innerHTML = ''; }
}

function renderItemsList() {
  const list = document.getElementById('items-list');
  document.getElementById('items-list-area').classList.remove('hidden');
  document.getElementById('send-assessment-btn').classList.remove('hidden');
  list.innerHTML = Field.pendingItems.map(item => `<div class="card">${item.itemName} (${item.weight}g)</div>`).join('');
}

document.getElementById('photo-area').onclick = () => {
  const dummy = new File([""], `img_${Date.now()}.jpg`, { type: "image/jpeg" });
  Field.capturedFiles.push(dummy);
  document.getElementById('photo-preview').innerHTML += `<div class="photo-thumb">📷</div>`;
};

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('venue-select');
  if (sel) sel.innerHTML = MockData.venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
  showScreen(0);
});
