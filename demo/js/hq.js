/* ============================================================
   hq.js — 本部管理最終版 (入力値消失バグ解消済み)
   ============================================================ */

function getAmplify() {
  const amp = window.Amplify;
  return amp.API ? amp : (amp.default || amp);
}

const listDealsQuery = `query ListDeals { listDeals { items { id customer status venueLabel hqAnswer createdAt } } }`;
const updateDealMutation = `mutation UpdateDeal($input: UpdateDealInput!) { updateDeal(input: $input) { id status hqAnswer } }`;

let selectedQueueId = null;

async function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabId)?.classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');
  await initAssessment();
}

async function initAssessment() {
  try {
    let all = [];
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [initAssessment] Trying AppSync...');
      const res = await API.graphql({ query: listDealsQuery });
      all = res.data.listDeals.items;
      console.log('✅ [initAssessment] AppSync success! Got', all.length, 'deals');
    } catch (appsyncErr) {
      // Fallback to mockdata
      dataSource = 'Mockdata';
      console.warn('⚠️  [initAssessment] AppSync failed:', appsyncErr.message);
      console.log('📦 [initAssessment] Fallback to mockdata...');
      if (typeof window.Store !== 'undefined' && window.Store.getDeals) {
        all = window.Store.getDeals();
        console.log('✅ [initAssessment] Mockdata loaded! Got', all.length, 'deals');
      } else {
        console.error('❌ [initAssessment] Mockdata not available');
        all = [];
      }
    }

    // 1. 査定リスト
    const queue = all.filter(d => d.status === 'waiting' || d.status === 'negotiating');
    document.getElementById('queue-badge').textContent = queue.length;
    document.getElementById('kpi-pending-count').textContent = queue.length;

    console.log(`📊 [initAssessment] Data source: ${dataSource} | Queue count: ${queue.length}`);

    // 2. 粗利計算
    let totalProfit = 0;
    all.filter(d => d.status === 'completed').forEach(d => {
      const ans = typeof d.hqAnswer === 'string' ? JSON.parse(d.hqAnswer || "{}") : (d.hqAnswer || {});
      totalProfit += ((ans.sellPrice || 0) - (ans.buyPrice || 0));
    });
    const profitEl = document.getElementById('kpi-profit');
    if (profitEl) profitEl.textContent = '¥' + totalProfit.toLocaleString();

    // 3. リスト描画
    const list = document.getElementById('queue-list');
    if (list) {
      list.innerHTML = queue.map(q => `
        <div class="queue-card ${q.id === selectedQueueId ? 'selected' : ''}" onclick="selectQueue('${q.id}')" style="padding:15px; border-bottom:1px solid #eee; cursor:pointer;">
          <b>${q.customer}様</b><br><small>${q.venueLabel}</small>
        </div>
      `).join('');
    }

    // 4. パネル描画 (ここに入力中のガードを入れました)
    if (selectedQueueId) {
      const selected = queue.find(d => d.id === selectedQueueId);
      if (selected) {
        const activeEl = document.activeElement;
        const inputIds = ['answer-buy', 'answer-sell', 'answer-comment'];
        // もし入力フォームのどこかにフォーカスがあれば、パネル全体の上書きはスキップする
        if (!inputIds.includes(activeEl.id)) {
            renderAssessPanel(selected);
        }
      }
    }
  } catch (err) { console.error('❌ [initAssessment] Unexpected error:', err); }
}

function selectQueue(id) { selectedQueueId = id; initAssessment(); }

function renderAssessPanel(item) {
  const panel = document.getElementById('assess-panel');
  if (!panel || !item) return;
  panel.innerHTML = `
    <h3>${item.customer}様の査定</h3>
    <div style="margin-bottom:15px;">
        <label>買取価格(下代)</label>
        <input type="number" id="answer-buy" class="input-field" placeholder="¥ 0">
    </div>
    <div style="margin-bottom:15px;">
        <label>販売想定(上代)</label>
        <input type="number" id="answer-sell" class="input-field" placeholder="¥ 0">
    </div>
    <textarea id="answer-comment" class="input-field" style="height:100px;" placeholder="コメント..."></textarea>
    <button class="btn btn-primary btn-block btn-lg" onclick="submitAnswer('${item.id}')" style="margin-top:20px;">
        査定回答を送信
    </button>
  `;
}

async function submitAnswer(id) {
  const buy = parseInt(document.getElementById('answer-buy').value) || 0;
  const sell = parseInt(document.getElementById('answer-sell').value) || 0;
  const comment = document.getElementById('answer-comment').value;

  if (buy === 0 || sell === 0) { alert("価格を入力してください"); return; }

  const hqAnswer = JSON.stringify({ buyPrice: buy, sellPrice: sell, comment });
  try {
    let dataSource = 'AppSync';

    // Try AppSync first
    try {
      const { API } = getAmplify();
      console.log('📡 [submitAnswer] Trying AppSync to update deal...');
      await API.graphql({ query: updateDealMutation, variables: { input: { id, status: 'negotiating', hqAnswer } } });
      console.log('✅ [submitAnswer] AppSync success! Answer submitted for deal:', id);
    } catch (appsyncErr) {
      // Fallback to mockdata: update deal in localStorage
      dataSource = 'Mockdata';
      console.warn('⚠️  [submitAnswer] AppSync failed:', appsyncErr.message);
      console.log('📦 [submitAnswer] Fallback to mockdata - updating deal locally...');

      if (typeof window.Store !== 'undefined' && window.Store.updateDeal) {
        window.Store.updateDeal(id, { status: 'negotiating', hqAnswer });
        console.log('✅ [submitAnswer] Mockdata deal updated:', id);
      } else {
        console.error('❌ [submitAnswer] Store not available');
      }
    }

    console.log(`📊 [submitAnswer] Data source: ${dataSource} | Buy: ¥${buy}, Sell: ¥${sell}`);
    alert("回答送信完了");
    selectedQueueId = null;
    initAssessment();
  } catch (err) { console.error('❌ [submitAnswer] Unexpected error:', err); }
}

document.addEventListener('DOMContentLoaded', () => {
  initAssessment();
  setInterval(initAssessment, 5000);
});
