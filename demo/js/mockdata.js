/* ============================================================
   mockdata.js — 催事買取統合システム デモ用モックデータ
   ============================================================ */
window.MockData = {

  // 今日の日付・担当者
  today: { date: '2026年3月8日（日）', staffName: '古川 健太', staffId: 1 },

  // スタッフ一覧 (ログイン用)
  staffList: [
    { id: 1, name: '古川 健太',  pin: '1234' },
    { id: 2, name: '山田 花子',  pin: '5678' },
    { id: 3, name: '中村 俊介',  pin: '9012' },
    { id: 4, name: '田中 麻衣',  pin: '3456' },
  ],

  // 会場リスト
  venues: [
    { id: 1, name: 'コーナン 西宮今津',  sub: '2F ロピア前',     status: 'active'   },
    { id: 2, name: 'コーナン 尼崎',      sub: '1F 入口前',       status: 'active'   },
    { id: 3, name: 'ライフ 梅田店',      sub: 'B1F 催事スペース', status: 'active'   },
    { id: 4, name: 'ヤマナカ 名古屋北',  sub: '1F 特設コーナー',  status: 'inactive' },
  ],

  // レジ初期残高
  initialCash: 500000,

  // 今日の現場ステータス (ダッシュボード用)
  fieldToday: {
    totalBuyAmount:   580000,
    cashBalance:      320000,
    assessmentCount:  12,
    dealCount:        8,
    successRate:      66.7,
  },

  // 進行中案件
  activeDeals: [],

  // 流入経路選択肢
  mediaOptions: [
    { id: 'flyer',        label: '折込チラシ',  icon: 'fa-newspaper'     },
    { id: 'dm',           label: 'DM・はがき', icon: 'fa-envelope'      },
    { id: 'line',         label: 'LINE',        icon: 'fa-comments'      },
    { id: 'repeat',       label: 'リピーター',   icon: 'fa-rotate-right'  },
    { id: 'catch',        label: 'キャッチ',    icon: 'fa-person-walking' },
    { id: 'walkin',       label: '直接来店',    icon: 'fa-store'         },
    { id: 'other',        label: 'その他',      icon: 'fa-circle-dot'    },
  ],

  // カテゴリ選択肢
  categories: [
    { id: 'gold',    label: '地金',     icon: 'fa-coins'       },
    { id: 'jewelry', label: 'ジュエリー',icon: 'fa-gem'         },
    { id: 'brand',   label: 'ブランド', icon: 'fa-bag-shopping' },
    { id: 'watch',   label: '時計',     icon: 'fa-clock'       },
    { id: 'other',   label: 'その他',   icon: 'fa-box-open'    },
  ],

  // 品位リスト
  purities: ['K24','K22','K18','K14','K10','Pt999','Pt950','Pt900','Sv999','Sv925'],

  // 不成約理由
  noDealReasons: [
    '希望額未達','相見積もり','持ち帰り検討','家族と相談','その他'
  ],

  // 査定モック回答 (Screen 4 用)
  mockAssessmentReply: {
    buyPrice:    65000,
    sellPrice:   92000,
    comment:     'K18 23.5g。傷はあるが品位良好。刻印確認済。相場K18=¥9,360/g にて計算。良状態加算込みで¥65,000提示します。',
    staffName:   '鈴木 査定員',
    repliedAt:   '14:38',
  },

  // ============================================================
  // 本部用データ (HQ)
  // ============================================================

  // 全社月間KPI
  monthlyKPI: {
    totalAssessments:  245,
    completedDeals:    168,
    successRate:       68.6,
    totalProfit:       4830000,
    monthTarget:       5850000,
    targetRate:        82.5,
  },

  // 会場別ステータス (ダッシュボード表)
  venueStats: [
    { id:1, name:'コーナン 西宮今津', buyer:'古川 健太',  sales:580000,  cash:320000, deals:8,  assessments:12, active:true  },
    { id:2, name:'コーナン 尼崎',     buyer:'山田 花子',  sales:420000,  cash:480000, deals:6,  assessments:9,  active:true  },
    { id:3, name:'ライフ 梅田店',     buyer:'中村 俊介',  sales:890000,  cash:110000, deals:11, assessments:14, active:true  },
    { id:4, name:'ヤマナカ 名古屋北', buyer:'—',         sales:0,       cash:0,      deals:0,  assessments:0,  active:false },
  ],

  // 媒体別実績 (グラフ用)
  mediaStats: [
    { media:'折込チラシ',    deals:18, profit:680000  },
    { media:'DM・はがき',    deals:12, profit:520000  },
    { media:'LINE',          deals:9,  profit:350000  },
    { media:'リピーター',    deals:15, profit:980000  },
    { media:'キャッチ',      deals:6,  profit:180000  },
    { media:'その他',        deals:4,  profit:120000  },
  ],

  // 商品データベース
  inventory: [
    { id:1,  date:'2026-03-08', venue:'コーナン 西宮今津', buyer:'古川 健太',  media:'折込チラシ',   customer:'田中 良子', category:'地金',     item:'K18ネックレス',         purity:'K18',   weight:12.5,  buyPrice:58000,  sellPrice:82000,   profit:24000 },
    { id:2,  date:'2026-03-08', venue:'コーナン 西宮今津', buyer:'古川 健太',  media:'リピーター',  customer:'山本 太郎', category:'時計',     item:'SEIKO クレドール',       purity:null,    weight:null,  buyPrice:35000,  sellPrice:52000,   profit:17000 },
    { id:3,  date:'2026-03-08', venue:'ライフ 梅田店',     buyer:'中村 俊介',  media:'LINE',       customer:'佐藤 花子', category:'ジュエリー',item:'Pt900 ダイヤリング',      purity:'Pt900', weight:8.2,   buyPrice:45000,  sellPrice:68000,   profit:23000 },
    { id:4,  date:'2026-03-07', venue:'コーナン 尼崎',     buyer:'山田 花子',  media:'折込チラシ',   customer:'鈴木 一郎', category:'地金',     item:'K24 インゴット',          purity:'K24',   weight:100.0, buyPrice:980000, sellPrice:1250000, profit:270000 },
    { id:5,  date:'2026-03-07', venue:'ライフ 梅田店',     buyer:'中村 俊介',  media:'DM・はがき',    customer:'高橋 美咲', category:'ブランド', item:'LV モノグラムバッグ',     purity:null,    weight:null,  buyPrice:28000,  sellPrice:45000,   profit:17000 },
    { id:6,  date:'2026-03-07', venue:'コーナン 西宮今津', buyer:'古川 健太',  media:'キャッチ',    customer:'伊藤 健',   category:'ジュエリー',item:'K18 ダイヤブレスレット',  purity:'K18',   weight:18.0,  buyPrice:120000, sellPrice:175000,  profit:55000 },
    { id:7,  date:'2026-03-06', venue:'コーナン 尼崎',     buyer:'山田 花子',  media:'リピーター',  customer:'渡辺 由美', category:'地金',     item:'K18 指輪×3点',           purity:'K18',   weight:22.3,  buyPrice:105000, sellPrice:148000,  profit:43000 },
    { id:8,  date:'2026-03-06', venue:'ライフ 梅田店',     buyer:'中村 俊介',  media:'折込チラシ',   customer:'中島 裕子', category:'時計',     item:'OMEGA シーマスター',      purity:null,    weight:null,  buyPrice:85000,  sellPrice:130000,  profit:45000 },
    { id:9,  date:'2026-03-05', venue:'コーナン 西宮今津', buyer:'古川 健太',  media:'LINE',       customer:'木村 大輔', category:'ブランド', item:'GUCCI レザーウォレット',  purity:null,    weight:null,  buyPrice:12000,  sellPrice:22000,   profit:10000 },
    { id:10, date:'2026-03-05', venue:'コーナン 尼崎',     buyer:'山田 花子',  media:'DM・はがき',    customer:'西村 智子', category:'ジュエリー',item:'K18 ルビーペンダント',   purity:'K18',   weight:5.8,   buyPrice:38000,  sellPrice:56000,   profit:18000 },
  ],

  // 本部査定キュー
  assessmentQueue: [
    {
      id: 1, status: 'pending',
      venue: 'コーナン 西宮今津', buyer: '古川 健太', time: '14:32',
      category: '地金', purity: 'K18', weight: 23.5,
      customerNote: '希望額：¥80,000', condition: '傷あり・刻印確認済',
    },
    {
      id: 2, status: 'pending',
      venue: 'コーナン 尼崎', buyer: '山田 花子', time: '14:45',
      category: 'ブランド', purity: null, weight: null,
      customerNote: '希望額：¥50,000以上', condition: 'LOUIS VUITTON 財布・箱あり・良好',
    },
    {
      id: 3, status: 'answered',
      venue: 'ライフ 梅田店', buyer: '中村 俊介', time: '15:02',
      category: 'ジュエリー', purity: 'Pt900', weight: 8.2,
      customerNote: '特になし', condition: 'ダイヤモンドリング・石あり',
      answer: { buyPrice: 45000, sellPrice: 68000, comment: 'ダイヤ込みで評価。良状態につき高め査定。' },
    },
    {
      id: 4, status: 'pending',
      venue: 'ライフ 梅田店', buyer: '中村 俊介', time: '15:18',
      category: '時計', purity: null, weight: null,
      customerNote: '希望額：¥30,000', condition: 'CITIZEN シチズン 傷多め・動作確認済',
    },
    {
      id: 5, status: 'pending',
      venue: 'コーナン 西宮今津', buyer: '古川 健太', time: '15:25',
      items: [
        { category: 'jikin', categoryLabel: '地金', categoryIcon: 'fa-coins', itemName: 'K18 喜平ネックレス', purity: 'K18', weight: 31.2, condition: '良好' },
        { category: 'jikin', categoryLabel: '地金', categoryIcon: 'fa-coins', itemName: 'K24 インゴット 5g', purity: 'K24', weight: 5.0, condition: '新品同様' },
        { category: 'jewelry', categoryLabel: 'ジュエリー', categoryIcon: 'fa-gem', itemName: 'Pt900 ダイヤリング 0.3ct', purity: 'Pt900', weight: 4.8, condition: '小傷あり' },
      ],
      customerNote: '希望額：3点まとめて¥400,000',
    },
    {
      id: 6, status: 'answered',
      venue: 'コーナン 尼崎', buyer: '山田 花子', time: '13:50',
      items: [
        { category: 'brand', categoryLabel: 'ブランド', categoryIcon: 'fa-tag', itemName: 'GUCCI トートバッグ', purity: null, weight: null, condition: '使用感あり' },
        { category: 'brand', categoryLabel: 'ブランド', categoryIcon: 'fa-tag', itemName: 'COACH 長財布', purity: null, weight: null, condition: '良好・箱付き' },
      ],
      customerNote: '希望額：2点で¥60,000',
      answer: { buyPrice: 42000, sellPrice: 65000, comment: 'GUCCI トートは人気モデル。COACHは箱付きでプラス査定。' },
    },
    {
      id: 7, status: 'pending',
      venue: 'ライフ 梅田店', buyer: '中村 俊介', time: '15:40',
      category: '地金', purity: 'Pt900', weight: 15.6,
      customerNote: '希望額：¥70,000', condition: 'Pt900 ネックレス・美品',
    },
    {
      id: 8, status: 'pending',
      venue: 'コーナン 西宮今津', buyer: '古川 健太', time: '15:52',
      items: [
        { category: 'jikin', categoryLabel: '地金', categoryIcon: 'fa-coins', itemName: 'K18 ブレスレット', purity: 'K18', weight: 12.4, condition: '良好' },
        { category: 'watch', categoryLabel: '時計', categoryIcon: 'fa-clock', itemName: 'SEIKO プレザージュ', purity: null, weight: null, condition: '動作確認済・ケース小傷' },
      ],
      customerNote: '希望額：¥150,000',
    },
  ],

  // 地金相場 (当日)
  goldRates: {
    K24:   12480, K22: 11440, K18: 9360, K14: 7280, K10: 5198,
    Pt999: 5440,  Pt950: 5168, Pt900: 4896,
    Sv999: 152,   Sv925: 140,
    updated: '2026-03-08 09:00',
  },
};

/* ================================================================
   window.Store — localStorage ラッパー (field ⇔ HQ 共有)
   ================================================================ */
window.Store = {
  KEY_DEALS: 'bb_deals_v1',
  KEY_SESSION: 'bb_session_v1',

  /* --- 案件一覧 --- */
  getDeals() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_DEALS) || '[]');
    } catch { return []; }
  },
  saveDeals(deals) {
    localStorage.setItem(this.KEY_DEALS, JSON.stringify(deals));
  },
  addDeal(deal) {
    const deals = this.getDeals();
    deals.unshift(deal);
    this.saveDeals(deals);
    return deal;
  },
  updateDeal(id, patch) {
    const deals = this.getDeals();
    const idx = deals.findIndex(d => d.id === id);
    if (idx !== -1) { deals[idx] = Object.assign({}, deals[idx], patch); this.saveDeals(deals); return deals[idx]; }
    return null;
  },
  getDeal(id) { return this.getDeals().find(d => d.id === id) || null; },
  addItem(item) {
    const deals = this.getDeals();
    const dealIdx = deals.findIndex(d => d.id === item.dealID);
    if (dealIdx !== -1) {
      if (!deals[dealIdx].items) deals[dealIdx].items = [];
      deals[dealIdx].items.push(item);
      this.saveDeals(deals);
    }
    return item;
  },

  /* --- セッション状態 (現場) --- */
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_SESSION) || '{}');
    } catch { return {}; }
  },
  saveSession(obj) { localStorage.setItem(this.KEY_SESSION, JSON.stringify(obj)); },

  /* --- ユーティリティ --- */
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
  now() { return new Date().toLocaleString('ja-JP', { hour12: false }); },
};
