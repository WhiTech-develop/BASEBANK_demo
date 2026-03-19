/* ============================================================
   field.js — 現場バイヤー向けアプリ (完全統合版)
   機能：画像圧縮、並列アップロード、Optimistic UI、リアルタイム通知、既存全画面制御
   ============================================================ */

const Field = {
  screen: 0,
  screenHistory: [],
  cashBalance: MockData.initialCash,
  confirmedCash: null,
  selectedVenueId: 1,
  selectedMedia: null,
  selectedCategory: 'gold',
  currentDeal: null,
  currentDealId: null,
  keypadVal: '',
  isSigned: false,
  chatMessages: [],
  loggedInStaff: null,
  // --- 高速化・並列管理用プロパティ ---
  capturedFiles: [],      // 撮影したRAWファイル
  activeUploads: 0,       // 現在進行中のアップロード数
  completedUploads: 0,    // 完了したアップロード数
  pendingItems: []        // 登録中の商品リスト
};

/* ========================================================
   1. 高速化ロジック (圧縮・並列アップロード)
   ======================================================== */

/**
 * クライアント側で画像をリサイズ・圧縮
 */
async function compressImage(file) {
  const maxWidth = 1200; 
  const quality = 0.7;   
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
    };
  });
}

/**
 * 並列アップロード実行 (プログレッシブ表示対応)
 */
async function uploadFileWithProgress(blob, dealId, itemId, photoIndex) {
  Field.activeUploads++;
  updateTotalProgressUI();

  return new Promise((resolve, reject) => {
    // 実際の実装では AWS S3 Presigned URL 等を使用
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true); 

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        // 個別写真の進捗を更新
        const progressEl = document.querySelector(`[data-photo-index="${photoIndex}"] .photo-progress`);
        if (progressEl) progressEl.style.width = percent + '%';
      }
    };

    xhr.onload = () => {
      Field.completedUploads++;
      Field.activeUploads--;
      updateTotalProgressUI();
      resolve();
    };
    xhr.onerror = () => {
      Field.activeUploads--;
      updateTotalProgressUI();
      reject();
    };
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('dealId', dealId);
    xhr.send(formData);
  });
}

function updateTotalProgressUI() {
  const total = Field.activeUploads + Field.completedUploads;
  const percent = total > 0 ? (Field.completedUploads / total) * 100 : 0;
  const bar = document.getElementById('total-upload-progress');
  const status = document.getElementById('total-upload-status');
  if (bar) bar.style.width = percent + '%';
  if (status) status.classList.toggle('hidden', Field.activeUploads === 0);
}

/* ========================================================
   2. リアルタイム通信 (AppSync 模倣)
   ======================================================== */

function subscribeToAppraisal(dealId) {
  // 本部(hq.js)からのメッセージを監視
  window.addEventListener('message', (event) => {
    if (event.data.type === 'APPRAISAL_RECEIVED' && event.data.dealId === dealId) {
      handleRealTimeResponse(event.data.answer);
    }
  });
}

function handleRealTimeResponse(answer) {
  if (Field.screen === 4) {
    document.getElementById('waiting-card').classList.add('hidden');
    const replyEl = document.getElementById('hq-reply');
    replyEl.classList.remove('hidden');
    replyEl.style.animation = 'slideUp 0.3s ease both';
    
    // 査定結果を反映
    Object.assign(Field.currentDeal, { hqAnswer: answer, status: 'negotiating' });
    renderHQReply(answer);
    initChat();
    showNotification('本部から回答', '査定結果が届きました：' + fmt(answer.buyPrice));
  }
}

/* ========================================================
   3. 画面制御・UIロジック (Optimistic UI 統合)
   ======================================================== */

function showScreen(n) {
  if (Field.screen !== n) Field.screenHistory.push(Field.screen);
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById('screen-' + n);
  if (el) el.classList.remove('hidden');
  Field.screen = n;

  // 各画面の初期化
  if (n === 0) initScreen0();
  if (n === 1) initScreen1();
  if (n === 2) renderDashboard();
  if (n === 3) initScreen3();
  if (n === 4) initScreen4();
  if (n === 5) initScreen5();

  // ログアウト・FABの表示制御
  document.getElementById('nav-logout')?.classList.toggle('hidden', n === 0);
  document.getElementById('fab')?.classList.toggle('hidden', !(n === 2 && Field.loggedInStaff));
  document.getElementById('bottom-nav')?.classList.toggle('hidden', n !== 2);
}

/**
 * 商品追加 (Optimistic UI)
 */
async function addItemToList() {
  const itemData = getItemFromForm();
  if (!itemData.weight && ['gold', 'jewelry'].includes(itemData.category)) {
    showToast('重量を入力してください'); return;
  }

  const tempId = 'item_' + Date.now();
  itemData.id = tempId;
  itemData.status = 'uploading';

  // 1. サーバーの応答を待たずにUI更新 (Optimistic)
  Field.pendingItems.push(itemData);
  renderItemsList();
  
  // 2. バックグラウンドで画像処理・送信を開始
  const filesToUpload = [...Field.capturedFiles];
  Field.capturedFiles = []; // 次の入力のためにクリア
  resetItemForm(); 

  // 非同期で処理
  (async () => {
    for (let i = 0; i < filesToUpload.length; i++) {
      const compressed = await compressImage(filesToUpload[i]);
      await uploadFileWithProgress(compressed, Field.currentDeal.id, tempId, i);
    }
    const item = Field.pendingItems.find(it => it.id === tempId);
    if (item) item.status = 'ready';
    renderItemsList();
  })();

  showToast('商品を追加しました（バックグラウンドで送信中）');
}

function sendAssessmentRequest() {
  if (Field.pendingItems.length === 0) {
    showToast('商品を追加してください'); return;
  }
  
  Field.currentDeal.items = [...Field.pendingItems];
  Field.currentDeal.status = 'waiting';
  Store.updateDeal(Field.currentDeal.id, Field.currentDeal);

  subscribeToAppraisal(Field.currentDeal.id);
  showScreen(4);
}

/* ========================================================
   4. 既存の全補助関数 (ログイン、レジ、精算、描画)
   ======================================================== */

function initScreen0() {
  document.getElementById('login-id').value = '';
  document.getElementById('login-password').value = '';
}

function doLogin() {
  const id = document.getElementById('login-id').value;
  if (!id) return;
  Field.loggedInStaff = { name: id };
  showScreen(1);
}

function initScreen1() {
  const sel = document.getElementById('venue-select');
  sel.innerHTML = MockData.venues.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
}

function openRegister() {
  Field.cashBalance = parseInt(document.getElementById('cash-input').value) || MockData.initialCash;
  showScreen(2);
}

function renderDashboard() {
  document.getElementById('kpi-buy').textContent = fmt(Store.getDeals().filter(d => d.status === 'done').reduce((a, b) => a + (b.buyPrice || 0), 0));
  document.getElementById('kpi-cash').textContent = fmt(Field.cashBalance);
  renderActiveDeals();
}

function renderActiveDeals() {
  const list = document.getElementById('active-deals');
  const items = Store.getDeals().filter(d => d.status !== 'done' && d.status !== 'nodeal');
  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">進行中の案件はありません</div>`;
    return;
  }
  list.innerHTML = items.map(d => `
    <div class="deal-card" onclick="openDealDetail('${d.id}')">
      <div class="deal-info">
        <div class="deal-name">${d.customer}</div>
        <div class="deal-category">${d.items ? d.items.length + '点' : d.categoryLabel}</div>
      </div>
      <span class="badge">${d.status}</span>
    </div>
  `).join('');
}

function initScreen3() {
  Field.pendingItems = [];
  Field.capturedFiles = [];
  renderCategoryTabs();
  renderCategoryFields();
  initPhotoArea();
}

function initPhotoArea() {
  const area = document.getElementById('photo-area');
  area.onclick = () => {
    // デモ用ダミーファイル生成
    const dummy = new File([""], `p_${Date.now()}.jpg`, { type: "image/jpeg" });
    Field.capturedFiles.push(dummy);
    renderPhotoPreviews();
  };
}

function renderPhotoPreviews() {
  const preview = document.getElementById('photo-preview');
  preview.innerHTML = Field.capturedFiles.map((f, i) => `
    <div class="photo-thumb" data-photo-index="${i}">
      <i class="fa-solid fa-image"></i>
      <div class="photo-progress" style="position:absolute; bottom:0; left:0; height:3px; background:var(--accent-blue); width:0%; transition: width 0.2s;"></div>
    </div>
  `).join('');
}

function getItemFromForm() {
  return {
    category: Field.selectedCategory,
    categoryLabel: MockData.categories.find(c => c.id === Field.selectedCategory)?.label,
    weight: document.getElementById('weight-input')?.value,
    itemName: document.getElementById('condition-input')?.value,
    customerNote: document.getElementById('customer-note')?.value,
    condition: document.getElementById('item-condition')?.value
  };
}

function resetItemForm() {
  document.getElementById('customer-note').value = '';
  document.getElementById('item-condition').value = '';
  if (document.getElementById('weight-input')) document.getElementById('weight-input').value = '';
  if (document.getElementById('condition-input')) document.getElementById('condition-input').value = '';
  renderPhotoPreviews();
}

function renderItemsList() {
  const list = document.getElementById('items-list');
  const area = document.getElementById('items-list-area');
  if (Field.pendingItems.length > 0) area.classList.remove('hidden');
  list.innerHTML = Field.pendingItems.map(item => `
    <div class="item-card">
      <div class="item-card-info">
        <div class="item-card-name">${item.itemName || item.categoryLabel}</div>
        <div class="item-card-detail">${item.status === 'uploading' ? '送信中...' : '準備完了'}</div>
      </div>
    </div>
  `).join('');
}

// 共通ユーティリティ
function fmt(n) { return '¥' + Number(n).toLocaleString(); }
function showToast(m) { /* Toast表示ロジック */ console.log("Toast:", m); }

// モーダル制御
function openNewCustomer() { document.getElementById('media-modal').classList.remove('hidden'); }
function selectMedia(id) {
  const name = document.getElementById('customer-name-input').value || '新規顧客';
  Field.currentDeal = Store.addDeal({
    id: Store.genId(), customer: name, media: id, 
    mediaLabel: MockData.mediaOptions.find(m => m.id === id)?.label,
    status: 'registering', createdAt: Store.now()
  });
  document.getElementById('media-modal').classList.add('hidden');
  showScreen(3);
}

// 初期化実行
document.addEventListener('DOMContentLoaded', () => showScreen(0));
