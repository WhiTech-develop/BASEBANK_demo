/* ============================================================
   hq.js — AWS AppSync 本部管理 (フルコード)
   ============================================================ */

function getAmplify() {
  const raw = window.Amplify || window['aws-amplify'];
  return raw.Amplify || raw.default || raw;
}

const listDealsQuery = `query ListDeals { listDeals { items { id customer status staff_name venueLabel createdAt hqAnswer } } }`;
const updateDealMutation = `mutation UpdateDeal($input: UpdateDealInput!) { updateDeal(input: $input) { id status hqAnswer } }`;
const onCreateDealSubscription = `subscription OnCreateDeal { onCreateDeal { id customer staff_name venueLabel } }`;

let selectedQueueId = null;

async function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navItem) navItem.classList.add('active');
  if (tabId === 'assessment') initAssessment();
}

async function subscribeToNewDeals() {
  const amp = getAmplify();
  amp.API.graphql({ query: onCreateDealSubscription }).subscribe({
    next: () => { initAssessment(); }
  });
}

async function initAssessment() {
  try {
    const amp = getAmplify();
    const res = await amp.API.graphql({ query: listDealsQuery });
    const queue = res.data.listDeals.items.filter(d => d.status === 'waiting' || d.status === 'negotiating');
    
    const badge = document.getElementById('queue-badge');
    if (badge) badge.textContent = queue.length;
    
    const list = document.getElementById('queue-list');
    if (list) {
      list.innerHTML = queue.map(q => `
        <div class="queue-card ${q.id === selectedQueueId ? 'selected' : ''}" onclick="selectQueue('${q.id}')">
          <strong>${q.venueLabel}</strong><br>${q.customer}様 | ${q.staff_name}
        </div>
      `).join('');
    }

    if (selectedQueueId) {
      const item = queue.find(q => q.id === selectedQueueId);
      renderAssessPanel(item);
    }
  } catch (err) { console.error(err); }
}

function selectQueue(id) { selectedQueueId = id; initAssessment(); }

function renderAssessPanel(item) {
  const panel = document.getElementById('assess-panel');
  if (!panel) return;
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
  const buyInput = document.getElementById('answer-buy');
  const sellInput = document.getElementById('answer-sell');
  const commentInput = document.getElementById('answer-comment');
  
  const buy = parseInt(buyInput?.value || 0);
  const sell = parseInt(sellInput?.value || 0);
  const comment = commentInput?.value || "";
  const hqAnswer = JSON.stringify({ buyPrice: buy, sellPrice: sell, comment });

  try {
    const amp = getAmplify();
    await amp.API.graphql({
      query: updateDealMutation,
      variables: { input: { id, status: 'negotiating', hqAnswer } }
    });
    initAssessment();
  } catch (err) { console.error(err); }
}

document.addEventListener('DOMContentLoaded', () => {
  subscribeToNewDeals();
  showTab('dashboard');
});
