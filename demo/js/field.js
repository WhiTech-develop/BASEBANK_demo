/* ============================================================
   field.js — 最終安定版 (重複エラー・機能エラー解消)
   ============================================================ */

// グローバル状態
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

/**
 * ライブラリを安全に取得
 */
function getAmplify() {
  const amp = window.Amplify;
  if (!amp) throw new Error("Amplify library is missing.");
  const API = amp.API || (amp.default && amp.default.API);
  const Storage = amp.Storage || (amp.default && amp.default.Storage);
  if (!API) throw new Error("Amplify API is not ready.");
  return { API, Storage };
}

// Mutation定義
const createDealMutation = `mutation CreateDeal($input: CreateDealInput!) { createDeal(input: $input) { id customer status staff_name venueLabel } }`;
const createItemMutation = `mutation CreateItem($input: CreateItemInput!) { createItem(input: $input) { id dealID category itemName weight buy_price } }`;
const updateDealMutation = `mutation UpdateDeal($input: UpdateDealInput!) { updateDeal(input: $input) { id status hqAnswer } }`;

/* --- 1. 画面遷移 --- */
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

function navBack() { if (Field.screenHistory.length > 0) showScreen(Field.screenHistory.pop()); }

function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-password').value.trim();
  if (id === 'Keita062' && pass === '1234') {
    Field.loggedInStaff = { name: '古川 健太' };
    showScreen(1);
  } else {
    alert('IDまたはパスワードが正しくありません。');
  }
}

function loginInputChanged() {
  const id = document.getElementById('login-id').value;
  const pass = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  if (btn) btn.disabled = !(id && pass);
}

function openRegister() {
  const input = document.getElementById('cash-input');
  Field.cashBalance = parseInt(input.value) || 500000;
  const sel = document.getElementById('venue-select');
  if (sel) Field.venueLabel = sel.options[sel.selectedIndex]?.text || Field.venueLabel;
  showScreen(2);
}

/* --- 2. 案件作成 (＋ボタンからの操作) --- */
function openNewCustomer() {
  document.getElementById('media-modal').classList.remove('hidden');
  const grid = document.getElementById('media-grid');
  if (grid && typeof MockData !== 'undefined') {
    grid.innerHTML = MockData.mediaOptions.map(m => 
      `<button class="btn btn-secondary" onclick="selectMedia('${m.id}')">${m.label}</button>`
    ).join('');
  }
}

async function selectMedia(mediaId) {
  const name = document.getElementById('customer-name-input').value || '新規顧客';
  
  const inputParams = {
    customer: name, 
    status: 'registering',
    staff_name: Field.loggedInStaff.name,
    venueLabel: Field.venueLabel,
    createdAt: new Date().toISOString()
  };

  try {
    const amp = getAmplify();
    // graphqlOperationを使わず、直接オブジェクトで渡すのが最も安全です
    const res = await amp.API.graphql({
      query: createDealMutation,
      variables: { input: inputParams }
    });
    
    Field.currentDeal = res.data.createDeal;
    document.getElementById('media-modal').classList.add('hidden');
    showScreen(3);
    console.log("✅ 案件作成成功:", Field.currentDeal.id);
  } catch (err) {
    console.error("❌ AWS案件作成エラー:", err);
    alert("AWSとの接続に失敗しました。");
  }
}

/* --- 3. アイテム登録 & S3 --- */
async function addItemToList() {
  const itemData = {
    dealID: Field.currentDeal.id, 
    category: Field.selectedCategory,
    itemName: document.getElementById('item-condition').value || Field.selectedCategory,
    weight: parseFloat(document.getElementById('weight-input')?.value) || 0
  };

  try {
    const amp = getAmplify();
    const res = await amp.API.graphql({
      query: createItemMutation,
      variables: { input: itemData }
    });
    const newItem = res.data.createItem;

    // S3アップロード
    for (let i = 0; i < Field.capturedFiles.length; i++) {
        const fileName = `deals/${Field.currentDeal.id}/${newItem.id}_${i}.jpg`;
        await amp.Storage.put(fileName, Field.capturedFiles[i], { contentType: 'image/jpeg', level: 'public' });
        console.log("✅ S3 Uploaded:", fileName);
    }

    Field.pendingItems.push(newItem);
    renderItemsList();
    Field.capturedFiles = [];
    document.getElementById('photo-preview').innerHTML = '';
  } catch (err) { console.error(err); }
}

async function sendAssessmentRequest() {
  try {
    const amp = getAmplify();
    await amp.API.graphql({
      query: updateDealMutation,
      variables: { input: { id: Field.currentDeal.id, status: 'waiting' } }
    });
    
    // 修正：照会中画面(4)に行かず、アラートを出してホーム(2)に戻る
    alert("査定依頼を送信しました。本部の回答を待つ間に次の案件を登録できます。");
    
    // 現在の案件情報をリセットして、ホーム画面に戻る
    Field.currentDeal = null; 
    Field.pendingItems = []; // アイテムリストもクリア
    showScreen(2); 
    
    console.log("✅ 査定依頼完了。次の案件を受付可能です。");
  } catch (err) { 
    console.error("送信エラー:", err); 
    alert("送信に失敗しました。");
  }
}

/* --- 4. UI --- */
function renderDashboard() {
  document.getElementById('kpi-cash').textContent = '¥' + Field.cashBalance.toLocaleString();
}

function initScreen3() {
  Field.pendingItems = [];
  const tabs = document.getElementById('cat-tabs');
  if (tabs) {
    tabs.innerHTML = MockData.categories.map(c => 
      `<button class="btn ${Field.selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}" onclick="selectCategory('${c.id}')">${c.label}</button>`
    ).join('');
  }
  renderCategoryFields();
}

function selectCategory(id) { Field.selectedCategory = id; initScreen3(); }

function renderCategoryFields() {
  const wrap = document.getElementById('purity-weight-wrap');
  if (!wrap) return;
  wrap.innerHTML = (['gold','jewelry'].includes(Field.selectedCategory)) ?
    `<label class="form-label">重量(g)</label><input type="number" id="weight-input" class="input-field" placeholder="0.00">` : '';
}

function renderItemsList() {
  const area = document.getElementById('items-list-area');
  const list = document.getElementById('items-list');
  const btn = document.getElementById('send-assessment-btn');
  area?.classList.remove('hidden');
  btn?.classList.remove('hidden');
  if (list) {
    list.innerHTML = Field.pendingItems.map(item => `<div class="card" style="margin-bottom:10px; padding:10px; background:#f0f7ff;">${item.itemName} (${item.weight}g)</div>`).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('venue-select');
  if (sel && typeof MockData !== 'undefined') {
    sel.innerHTML = MockData.venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    Field.venueLabel = sel.options[0]?.text;
  }
  const photoArea = document.getElementById('photo-area');
  if (photoArea) {
    photoArea.onclick = () => {
      const dummy = new File([""], `img_${Date.now()}.jpg`, { type: "image/jpeg" });
      Field.capturedFiles.push(dummy);
      document.getElementById('photo-preview').innerHTML += `<div class="photo-thumb" style="width:50px; height:50px; background:#ddd; border-radius:5px; display:flex; align-items:center; justify-content:center;">📷</div>`;
    };
  }
  showScreen(0);
});
