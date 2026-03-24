/* ============================================================
   hq.js — AWS AppSync 統合版 (UIロジック全維持)
   ============================================================ */
const { API, graphqlOperation } = window['aws-amplify'];

const listDealsQuery = `query ListDeals { listDeals { items { id customer status staff_name venueLabel createdAt hqAnswer } } }`;
const updateDealMutation = `mutation UpdateDeal($input: UpdateDealInput!) { updateDeal(input: $input) { id status hqAnswer } }`;
const onCreateDealSubscription = `subscription OnCreateDeal { onCreateDeal { id customer staff_name venueLabel } }`;

let selectedQueueId = null;

async function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
  if (tabId === 'assessment') initAssessment();
}

/* --- 1. AWSリアルタイム監視 --- */
function subscribeToNewDeals() {
  API.graphql(graphqlOperation(onCreateDealSubscription)).subscribe({
    next: () => { initAssessment(); }
  });
}

/* --- 2. 査定コンソール機能 --- */
async function initAssessment() {
  const res = await API.graphql(graphqlOperation(listDealsQuery));
  const queue = res.data.listDeals.items.filter(d => d.status === 'waiting' || d.status === 'negotiating');
  
  document.getElementById('queue-badge').textContent = queue.length;
  const list = document.getElementById('queue-list');
  list.innerHTML = queue.map(q => `
    <div class="queue-card ${q.id === selectedQueueId ? 'selected' : ''}" onclick="selectQueue('${q.id}')">
      <strong>${q.venueLabel}</strong><br>${q.customer}様 | ${q.staff_name}
    </div>
  `).join('');

  if (selectedQueueId) {
    const item = queue.find(q => q.id === selectedQueueId);
    renderAssessPanel(item);
  }
}

function selectQueue(id) { selectedQueueId = id; initAssessment(); }

function renderAssessPanel(item) {
  const panel = document.getElementById('assess-panel');
  if (!item) { panel.innerHTML = '依頼を選択してください'; return; }
  panel.innerHTML = `
    <h3>${item.customer}様の査定</h3>
    <div>下代: <input type="number" id="answer-buy" class="input-field"></div>
    <div>上代: <input type="number" id="answer-sell" class="input-field"></div>
    <textarea id="answer-comment" class="input-field" placeholder="コメント..."></textarea>
    <button class="btn btn-primary btn-block" onclick="submitAnswer('${item.id}')">回答を送信</button>
  `;
}

async function submitAnswer(id) {
  const buy = parseInt(document.getElementById('answer-buy').value);
  const sell = parseInt(document.getElementById('answer-sell').value);
  const comment = document.getElementById('answer-comment').value;
  const hqAnswer = JSON.stringify({ buyPrice: buy, sellPrice: sell, comment });

  await API.graphql(graphqlOperation(updateDealMutation, {
    input: { id, status: 'negotiating', hqAnswer }
  }));
  initAssessment();
}

document.addEventListener('DOMContentLoaded', () => {
  subscribeToNewDeals();
  showTab('dashboard');
});
