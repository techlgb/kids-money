/*
  ========================================================================
  [持續需要更新] 🌟 學、惟、喬的理財小宇宙 - 設定與擴充說明
  ========================================================================

  === 資料結構總覽 ===
  這個網頁有兩個要維護的區塊：

  (1) `stocks`：股票清單。每一檔股票登記一次，寫顯示名稱與備援參考價。
  (2) `kids`  ：三個孩子。每個孩子有「自己的」一組交易紀錄，
                持股、成本、股息全部各自獨立計算，可以完全不同。

  ------------------------------------------------------------------------
  【如何新增一檔新股票？】
  第一步，在 `stocks` 裡登記這檔股票（每檔只需登記一次）：
  ※ 注意：股票代號是「純數字」，不要加 .TW

  "股票代號": { name: "顯示名稱", fallbackPrice: 抓不到股價時的備援參考價 },

  第二步，到需要的孩子的 `holdings` 裡加上他的交易紀錄（見下方）。
  沒有買這檔的孩子就不用加，他的卡片上不會出現這檔股票。

  ------------------------------------------------------------------------
  【如何新增交易紀錄 (買進/賣出)？】
  在「那一個孩子」的 `holdings` 裡，找到（或新增）該股票代號的陣列，
  然後加一行大括號 {}，格式如下：

  { date: 'YYYY-MM-DD', type: 'BUY' 或 'SELL', qty: 股數, price: 成交單價 }

  * 買進範例 (學買了 500 股 0050，每股 150 元)：
    { date: '2024-05-15', type: 'BUY', qty: 500, price: 150.0 }

  * 賣出範例 (惟賣了 10 股 台積電，每股 2000 元)：
    { date: '2024-08-01', type: 'SELL', qty: 10, price: 2000.0 }

  ※ 三個孩子的股數與價格「可以完全不同」，各買各的、各賣各的都沒問題。
    某個孩子完全沒買某檔股票，就不要在他的 holdings 裡放那個代號。

  ------------------------------------------------------------------------
  【更新網頁】
  在您的電腦上改好 App.jsx 之後，終端機輸入這三行：

  git add .
  git commit -m "更新內容"
  git push

  GitHub 的機器人就會自動幫您更新網頁了，再也不用重新設定！

  ------------------------------------------------------------------------
  ※ 股息計算規則：
  1. 起算基準日寫死為 DIVIDEND_BASE_DATE = '2026-01-01'（見下方常數）。
     所有買進都「視同在這一天就已經持有」，不受實際買進日期影響。
     若日後要改變起算點，只要改那一行即可。
  2. 股息是「累積顯示」：自基準日起，每一次公告的配息都會依照當時持股數累加，
     包含已公告、除息日還沒到的那一次（例如 2330 於 2026-09-16 除息 7 元）。
  3. 賣出採實際日期。賣掉之後的配息就不會再累加給那個孩子。

  ※ 資料來源與防呆：
  1. 股價與配息來源為 FinMind 台股 API (https://finmindtrade.com)，本身就允許跨網域存取，
     不需要任何 CORS 代理。原本用的 corsproxy.io 已改為需付費金鑰(403)、
     codetabs 代理也已失效(522)，兩者同時掛掉會讓畫面永遠卡在載入中，因此整個改掉。
  2. 每次連線都有 10 秒逾時保護，畫面不會再卡住出不來。
  3. 抓不到即時股價時，改用 fallbackPrice 計算並在畫面標示「參考價」；
     若連 fallbackPrice 都沒設，該檔會標示「股價無法取得」並排除在所有合計之外，
     絕不拿 0 元當股價去算出一個看起來正常、其實完全錯誤的數字。
  4. 任何抓取失敗都會在畫面最上方逐條列出原因，不會靜默失敗。
  ========================================================================
*/

import React, { useState, useEffect } from 'react';
import { CircleDollarSign, PiggyBank, Loader2, Coins, History, TriangleAlert, RefreshCw } from 'lucide-react';

// === 1. 股票清單（每檔股票登記一次）===
const stocks = {
  "0050": { name: "0050 (元大台灣50)", fallbackPrice: 106.8 },  // 備援參考價：2026-09-02 收盤
  "2330": { name: "2330 (台積電)", fallbackPrice: 2385.0 },     // 備援參考價：2026-09-02 收盤
};

// === 2. 三個孩子，各自獨立的交易紀錄 ===
// 目前三人買的一樣，但結構上完全獨立，隨時可以改成不同的股票與股數。
const kids = [
  {
    id: 'xue',
    name: '學',
    image: '學01.jpg',
    bg: 'bg-[#E3F2FD]',
    dark: 'bg-[#64B5F6]',
    holdings: {
      "0050": [
        { date: '2026-02-23', type: 'BUY', qty: 1000, price: 77.7 },
      ],
      "2330": [
        { date: '2026-01-12', type: 'BUY', qty: 5, price: 1700.0 },
        { date: '2026-02-11', type: 'BUY', qty: 5, price: 1905.0 },
      ],
    },
  },
  {
    id: 'wei',
    name: '惟',
    image: '惟01.jpg',
    bg: 'bg-[#E8F5E9]',
    dark: 'bg-[#81C784]',
    holdings: {
      "0050": [
        { date: '2026-02-23', type: 'BUY', qty: 1000, price: 77.7 },
      ],
      "2330": [
        { date: '2026-01-12', type: 'BUY', qty: 5, price: 1700.0 },
        { date: '2026-02-11', type: 'BUY', qty: 5, price: 1905.0 },
      ],
    },
  },
  {
    id: 'qiao',
    name: '喬',
    image: '喬01.jpg',
    bg: 'bg-[#F3E5F5]',
    dark: 'bg-[#BA68C8]',
    holdings: {
      "0050": [
        { date: '2026-02-23', type: 'BUY', qty: 1000, price: 77.7 },
      ],
      "2330": [
        { date: '2026-01-12', type: 'BUY', qty: 5, price: 1700.0 },
        { date: '2026-02-11', type: 'BUY', qty: 5, price: 1905.0 },
      ],
    },
  },
];

// === 股息起算基準日（寫死）===
// 自 2026-01-01 起的每一次配息都累加，並「視同這一天就已經持有目前的股數」，
// 不受實際買進日期影響。若日後要改變起算點，只要改這一行即可。
const DIVIDEND_BASE_DATE = '2026-01-01';

// FinMind 台股開放資料 API（回應帶 Access-Control-Allow-Origin: *，瀏覽器可直連）
const FINMIND_API = 'https://api.finmindtrade.com/api/v4/data';
const FETCH_TIMEOUT_MS = 10000;

// 把 'YYYY-MM-DD' 一律解讀為 UTC 零時，確保交易日與除息日用同一把尺比較
const toUTCDate = (d) => new Date(`${d}T00:00:00Z`).getTime();
const shiftDays = (d, days) => new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10);

// 把各種失敗原因翻成看得懂的中文，直接顯示在畫面上，避免「數字錯了卻不知道為什麼」
const describeError = (error) => {
  if (!error) return '未知錯誤';
  if (error.name === 'AbortError') return `連線逾時（超過 ${FETCH_TIMEOUT_MS / 1000} 秒）`;
  if (error instanceof TypeError) return '無法連線（網路中斷或資料來源封鎖）';
  return error.message || String(error);
};

// 工具：數字格式化
const formatMoney = (num) => "$" + Math.round(Math.abs(num)).toLocaleString('zh-TW');

const ProfitDisplay = ({ profit, cost, className = "" }) => {
  const isPositive = profit >= 0;
  const sign = isPositive ? '+' : '-';
  const arrow = isPositive ? '▲' : '▼';
  const defaultColor = isPositive ? 'text-[#E57373]' : 'text-green-600';
  // 若本金為 0 (全數賣出)，則不顯示百分比，只顯示絕對獲利數字
  const percentStr = cost > 0 ? ` (${sign}${Math.abs(((profit / cost) * 100)).toFixed(2)}%)` : '';

  return (
    <span className={`${className || defaultColor}`}>
      {arrow} {sign}{formatMoney(profit)}{percentStr}
    </span>
  );
};

// === 3. 核心計算：把「某個孩子的某一檔股票」結算出來 ===
const analyzePosition = (symbol, transactions, marketData) => {
  const data = marketData[symbol] || {};
  // priceKnown=false 代表連參考價都沒有。此時市值與帳面損益一律視為「未知」，
  // 不會拿 0 當股價去算，也不會被計入任何合計。
  const priceKnown = data.priceKnown === true;
  const currentPrice = priceKnown ? data.currentPrice : 0;
  const dividendList = data.dividends || [];

  let currentQty = 0;
  let currentCost = 0;    // "目前"持股的總成本
  let realizedProfit = 0; // 已實現損益 (賣出賺的錢)

  // 依日期排序交易紀錄，避免順序錯亂
  const sortedTx = [...transactions].sort((a, b) => toUTCDate(a.date) - toUTCDate(b.date));

  // 1. 計算買賣與已實現損益
  sortedTx.forEach(tx => {
    if (tx.type === 'BUY') {
      currentQty += tx.qty;
      currentCost += (tx.qty * tx.price);
    } else if (tx.type === 'SELL') {
      const avgCost = currentQty > 0 ? currentCost / currentQty : 0;
      // 賣出的獲利 = 賣出股數 * (賣出價 - 當時的平均成本)
      realizedProfit += tx.qty * (tx.price - avgCost);
      currentQty -= tx.qty;
      currentCost -= (tx.qty * avgCost); // 扣除對應的成本
    }
  });

  // 2. 累積股息：自基準日起的每一次配息都算
  let earnedDividends = 0;
  const baseTimestamp = toUTCDate(DIVIDEND_BASE_DATE);
  dividendList.forEach(div => {
    let heldQtyAtDivDate = 0;
    // 依基準日規則：所有買進都視同在 DIVIDEND_BASE_DATE 當天就已完成，賣出則採實際日期。
    sortedTx.forEach(tx => {
      const txTimestamp = tx.type === 'BUY' ? baseTimestamp : toUTCDate(tx.date);
      if (txTimestamp < div.timestamp) {
        if (tx.type === 'BUY') heldQtyAtDivDate += tx.qty;
        if (tx.type === 'SELL') heldQtyAtDivDate -= tx.qty;
      }
    });
    if (heldQtyAtDivDate > 0) {
      earnedDividends += (heldQtyAtDivDate * div.amount);
    }
  });

  // 3. 結算目前狀態
  const currentValue = priceKnown ? currentQty * currentPrice : 0;
  const unrealizedProfit = priceKnown ? currentValue - currentCost : 0;
  const avgPrice = currentQty > 0 ? (currentCost / currentQty).toFixed(1) : 0;
  const isSoldOut = currentQty === 0 && transactions.length > 0;

  return {
    symbol,
    name: stocks[symbol]?.name || symbol,
    priceKnown,
    usingFallback: data.usingFallback === true,
    dividendsKnown: data.dividendsKnown !== false,
    currentQty,
    currentCost,
    currentValue,
    unrealizedProfit,
    realizedProfit,
    earnedDividends,
    avgPrice,
    isSoldOut,
  };
};

// === 4. 把一個孩子的所有持股加總起來 ===
const analyzeKid = (kid, marketData) => {
  const positions = Object.keys(kid.holdings).map(
    (symbol) => analyzePosition(symbol, kid.holdings[symbol], marketData)
  );

  let totalValue = 0;
  let totalCost = 0;      // 僅計算"現有持股"的本金
  let totalUnrealized = 0;
  let totalRealized = 0;
  let totalDividends = 0;

  positions.forEach(pos => {
    // 股價未知的股票不併入任何合計，寧可少算也不要算出一個錯的總數
    if (!pos.priceKnown) return;
    totalValue += pos.currentValue;
    totalCost += pos.currentCost;
    totalUnrealized += pos.unrealizedProfit;
    totalRealized += pos.realizedProfit;
    totalDividends += pos.earnedDividends;
  });

  // 總淨利 = 帳面損益 + 已實現損益(賣掉賺的) + 領到的股息
  const netProfit = totalUnrealized + totalRealized + totalDividends;

  return { ...kid, positions, totalValue, totalCost, totalUnrealized, totalRealized, totalDividends, netProfit };
};

export default function App() {
  // === 5. 狀態管理 ===
  const [marketData, setMarketData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  // dataStatus.issues 收集所有抓不到的項目，會原樣顯示在畫面上（絕不靜默失敗）
  const [dataStatus, setDataStatus] = useState({ live: true, asOf: null, issues: [] });

  // === 6. 抓取最新收盤價與配息 ===
  useEffect(() => {
    let isMounted = true;

    // 帶逾時的 fetch：不管對方多慢，最多等 10 秒就放棄，避免畫面永遠卡住
    const fetchJson = async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.status !== 200) throw new Error(json.msg || 'API 回應異常');
        return json.data || [];
      } finally {
        clearTimeout(timer);
      }
    };

    const loadSymbol = async (symbol) => {
      // 配息從基準日再往前多抓 400 天，因為 FinMind 的 date 欄是公告日、可能晚於除息日
      const divFrom = shiftDays(new Date(toUTCDate(DIVIDEND_BASE_DATE)), -400);
      // 股價只要最近 30 天，足以跨過連假找到最後一個有交易的日子
      const priceFrom = shiftDays(new Date(), -30);

      // 用 allSettled：股價掛掉不該讓配息一起陪葬，反之亦然。兩邊各自回報成敗。
      const [priceRes, divRes] = await Promise.allSettled([
        fetchJson(`${FINMIND_API}?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${priceFrom}`),
        fetchJson(`${FINMIND_API}?dataset=TaiwanStockDividend&data_id=${symbol}&start_date=${divFrom}`),
      ]);

      // --- 股價 ---
      let livePrice = null;
      let asOf = null;
      let priceError = null;
      if (priceRes.status === 'fulfilled') {
        // FinMind 依日期由舊到新排列，往回找最後一筆有成交價的紀錄（跳過暫停交易日）
        const lastBar = [...priceRes.value].reverse().find((p) => Number(p.close) > 0);
        if (lastBar) {
          livePrice = Number(lastBar.close);
          asOf = lastBar.date;
        } else {
          priceError = '最近 30 天查無收盤價（代號可能有誤或已下市）';
        }
      } else {
        priceError = describeError(priceRes.reason);
      }

      // --- 配息（累積：基準日之後公告的每一次都算，含尚未到除息日的）---
      let dividends = [];
      let divError = null;
      if (divRes.status === 'fulfilled') {
        const seen = new Set();
        dividends = divRes.value
          .map((d) => ({
            date: d.CashExDividendTradingDate,
            amount: (Number(d.CashEarningsDistribution) || 0) + (Number(d.CashStatutorySurplus) || 0),
          }))
          .filter((d) => d.date && d.amount > 0)
          .map((d) => ({ amount: d.amount, timestamp: toUTCDate(d.date) }))
          .filter((d) => d.timestamp >= toUTCDate(DIVIDEND_BASE_DATE))
          .filter((d) => (seen.has(d.timestamp) ? false : seen.add(d.timestamp)))
          .sort((a, b) => a.timestamp - b.timestamp);
      } else {
        divError = describeError(divRes.reason);
      }

      // 股價抓不到時退回程式內的參考價；連參考價都沒有，就明白標示「無法計算」，
      // 絕不拿 0 元當市值去算出一個看起來像真的、其實完全錯誤的數字。
      const fallbackPrice = stocks[symbol].fallbackPrice;
      const usingFallback = livePrice === null && typeof fallbackPrice === 'number' && fallbackPrice > 0;
      const currentPrice = livePrice !== null ? livePrice : (usingFallback ? fallbackPrice : null);

      return {
        currentPrice,
        priceKnown: currentPrice !== null,
        usingFallback,
        asOf,
        priceError,
        dividends,
        dividendsKnown: divError === null,
        divError,
      };
    };

    const run = async () => {
      // 每檔股票只抓一次，三個孩子共用同一份行情資料
      const entries = await Promise.all(
        Object.keys(stocks).map(async (symbol) => {
          try {
            return [symbol, await loadSymbol(symbol)];
          } catch (error) {
            // 連 loadSymbol 本身都爆掉（理論上不會），仍然給一個可判讀的結果，不讓畫面崩潰
            console.error(`讀取 ${symbol} 時發生未預期錯誤`, error);
            const fallbackPrice = stocks[symbol].fallbackPrice;
            const usingFallback = typeof fallbackPrice === 'number' && fallbackPrice > 0;
            return [symbol, {
              currentPrice: usingFallback ? fallbackPrice : null,
              priceKnown: usingFallback,
              usingFallback,
              asOf: null,
              priceError: describeError(error),
              dividends: [],
              dividendsKnown: false,
              divError: describeError(error),
            }];
          }
        })
      );

      if (!isMounted) return;
      setMarketData(Object.fromEntries(entries));

      // 把每一項問題整理成一句人話，直接掛到畫面上
      const issues = [];
      entries.forEach(([symbol, v]) => {
        const label = stocks[symbol].name;
        if (v.priceError && v.usingFallback) {
          issues.push({ level: 'warn', text: `${label} 股價抓不到（${v.priceError}），已改用程式內參考價 ${v.currentPrice} 計算` });
        } else if (v.priceError) {
          issues.push({ level: 'error', text: `${label} 股價抓不到（${v.priceError}），且未設定備援參考價，已從所有合計中排除` });
        }
        if (v.divError) {
          issues.push({ level: 'warn', text: `${label} 配息資料抓不到（${v.divError}），本檔股息暫以 0 計，實際獲利應高於畫面數字` });
        }
      });

      const asOf = entries.map(([, v]) => v.asOf).filter(Boolean).sort().pop() || null;
      setDataStatus({ live: issues.length === 0, asOf, issues });
    };

    // finally 保證不論成敗都會關掉載入畫面 —— 這是防止再次卡死的最後一道防線
    run()
      .catch((error) => console.error('讀取行情時發生未預期錯誤', error))
      .finally(() => { if (isMounted) setIsLoading(false); });

    return () => { isMounted = false; };
  }, []);

  // === 7. 三個孩子各自結算，再加總 ===
  const analyzedKids = kids.map((kid) => analyzeKid(kid, marketData));

  const grandTotalProfit = analyzedKids.reduce((sum, k) => sum + k.netProfit, 0);
  const grandTotalCost = analyzedKids.reduce((sum, k) => sum + k.totalCost, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center font-sans text-[#5D4037]">
        <Loader2 className="w-12 h-12 animate-spin text-[#64B5F6] mb-4" />
        <h2 className="text-2xl font-black">📡 智能小宇宙連線中...</h2>
        <p className="text-gray-500 mt-2">正在自動核對歷史交易與歷年配息資料</p>
        <p className="text-gray-400 text-sm mt-1">（最多等 10 秒，連不上也會直接顯示畫面）</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans text-[#424242]" style={{ fontFamily: "'Nunito', 'Noto Sans TC', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Noto+Sans+TC:wght@400;700;900&display=swap');`}</style>

      {/* 頂部總覽區 */}
      <div className="text-center mb-10">
        <h1 className="text-[#5D4037] text-3xl font-black mb-4 flex items-center justify-center gap-2">
          🌟 學、惟、喬的財富小宇宙
        </h1>

        <div className="inline-block bg-white px-8 py-4 rounded-full shadow-md text-xl font-bold border border-gray-100">
          三人合計總{grandTotalProfit >= 0 ? '淨利' : '虧損'}：
          <span className="ml-2 text-2xl">
            <ProfitDisplay profit={grandTotalProfit} cost={grandTotalCost} />
          </span>
        </div>
      </div>

      {/* 行情資料狀態列：任何一項抓不到，都會在這裡把原因寫清楚 */}
      {dataStatus.issues.length > 0 ? (
        <div className="max-w-2xl mx-auto -mt-4 mb-10 bg-[#FFF3E0] border border-[#FFCC80] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 font-black text-[#E65100] mb-2">
            <TriangleAlert className="w-5 h-5 shrink-0" />
            資料抓取有狀況，以下數字請留意
          </div>
          <ul className="text-sm text-[#BF360C] font-bold space-y-1 list-disc list-inside">
            {dataStatus.issues.map((issue, i) => (
              <li key={i}>{issue.text}</li>
            ))}
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#E65100] bg-white border border-[#FFCC80] rounded-full px-3 py-1 hover:bg-[#FFF8E1] transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> 重新整理再試一次
          </button>
        </div>
      ) : (
        dataStatus.asOf && (
          <div className="text-center text-xs text-gray-400 -mt-4 mb-10">
            股價更新至 {dataStatus.asOf} 收盤 ・ 股息自 {DIVIDEND_BASE_DATE} 起累積
          </div>
        )
      )}

      {/* 三欄式卡片區：每個孩子的數字都是自己的 */}
      <div className="flex justify-center flex-wrap gap-6 max-w-6xl mx-auto">
        {analyzedKids.map((kid) => {
          const principalPercent = kid.totalValue > 0 ? Math.max(0, Math.min(100, (kid.totalCost / kid.totalValue) * 100)) : 0;
          const profitPercent = kid.totalValue > 0 ? Math.max(0, Math.min(100, (kid.netProfit / kid.totalValue) * 100)) : 100;

          return (
            <div key={kid.id} className={`${kid.bg} w-full md:w-[360px] rounded-[24px] p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative`}>

              <div className="text-center mb-5">
                <img
                  src={kid.image}
                  alt={`${kid.name}的照片`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto bg-gray-200"
                  onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${kid.id}&background=ccc&color=fff&size=100`; }}
                />
                <div className="mt-3 text-xl font-black text-[#5D4037]">{kid.name}</div>
              </div>

              <div className="text-center mb-6 bg-white/60 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-sm text-gray-600 font-bold mb-1">
                  總{kid.netProfit >= 0 ? '淨利' : '損益'} (含已實現與配息)
                </div>
                <div className="text-2xl sm:text-3xl font-black mb-3">
                  <ProfitDisplay profit={kid.netProfit} cost={kid.totalCost} />
                </div>
                <div className="inline-block px-3 py-1 rounded-full text-sm font-bold text-gray-600 bg-white shadow-sm border border-gray-100">
                  現有持股市值: {formatMoney(kid.totalValue)}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm font-bold mb-2 text-center text-gray-700">資產結構比例</div>
                <div className="h-10 bg-white/50 rounded-full flex overflow-hidden relative shadow-inner">
                  {kid.totalCost === 0 && kid.netProfit === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">目前無持股</div>
                  ) : (
                    <>
                      <div className={`group relative h-full flex items-center justify-center text-white font-bold text-xs transition-all duration-1000 ${kid.dark}`} style={{ width: `${principalPercent}%` }}>
                        {principalPercent > 15 ? '現有本金' : ''}
                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-10">
                          投入本金: {formatMoney(kid.totalCost)}
                        </div>
                      </div>
                      {kid.netProfit > 0 && (
                        <div className="group relative h-full flex items-center justify-center text-white font-bold text-xs transition-all duration-1000 bg-[#E57373]" style={{ width: `${profitPercent}%` }}>
                          {profitPercent > 15 ? '獲利' : ''}
                          <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-10">
                            歷史與帳面獲利: {formatMoney(kid.netProfit)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 股票明細清單 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                {kid.positions.length === 0 && (
                  <div className="text-center text-gray-400 text-sm font-bold py-4">尚未開始投資</div>
                )}
                {kid.positions.map((stock, index) => (
                  <div key={stock.symbol} className={`flex justify-between items-start py-3 ${index !== kid.positions.length - 1 ? 'border-b border-gray-100 border-dashed' : ''}`}>
                    <div>
                      <span className="font-bold text-[15px] flex items-center gap-1">
                        {stock.isSoldOut ? <History className="w-4 h-4 text-gray-400" /> : <CircleDollarSign className="w-4 h-4 text-blue-500" />}
                        <span className={stock.isSoldOut ? "text-gray-500 line-through decoration-gray-300" : ""}>{stock.name}</span>
                      </span>

                      {stock.isSoldOut ? (
                        <span className="text-xs font-bold text-gray-400 block mt-1 bg-gray-100 px-2 py-0.5 rounded-md inline-block">已結清 (持股為0)</span>
                      ) : (
                        <span className="text-xs text-gray-500 block mt-1">
                          {stock.currentQty >= 1000 ? `${stock.currentQty / 1000}張` : `${stock.currentQty}股`} (均價 {stock.avgPrice})
                        </span>
                      )}

                      {/* 配息資料抓不到時，明白講出來，不要讓使用者以為就是沒配息 */}
                      {!stock.dividendsKnown && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                            <TriangleAlert className="w-3 h-3" /> 配息資料抓不到，未列入
                          </span>
                        </div>
                      )}

                      {/* 自動累積的配息 */}
                      {stock.dividendsKnown && stock.earnedDividends > 0 && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                            <Coins className="w-3 h-3" /> 累積股息 {formatMoney(stock.earnedDividends)}
                          </span>
                        </div>
                      )}

                      {/* 賣出賺取的價差 */}
                      {stock.realizedProfit !== 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                            <History className="w-3 h-3" /> 歷史波段損益 {formatMoney(stock.realizedProfit)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {!stock.isSoldOut && stock.priceKnown && (
                        <>
                          <div className="font-black text-[15px]">{formatMoney(stock.currentValue)}</div>
                          <div className="text-[13px] font-bold mt-1">
                            <ProfitDisplay profit={stock.unrealizedProfit} cost={stock.currentCost} />
                          </div>
                          {stock.usingFallback && (
                            <div className="text-[10px] font-bold text-orange-500 mt-1">參考價</div>
                          )}
                        </>
                      )}
                      {!stock.isSoldOut && !stock.priceKnown && (
                        <div className="text-[12px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-2 py-1">
                          股價無法取得<br />未計入合計
                        </div>
                      )}
                      {stock.isSoldOut && (stock.realizedProfit !== 0 || stock.earnedDividends > 0) && (
                        <div className="text-[13px] font-bold mt-1 text-gray-600">
                          總貢獻: <span className={stock.realizedProfit + stock.earnedDividends >= 0 ? "text-[#E57373]" : "text-green-600"}>{formatMoney(stock.realizedProfit + stock.earnedDividends)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto mt-12 mb-8 flex justify-center px-4">
        <div className="bg-[#FFF9C4] p-8 md:p-10 rounded-xl shadow-md w-full max-w-2xl -rotate-1 hover:rotate-0 transition-transform duration-300 cursor-default relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/50 backdrop-blur-sm shadow-sm rotate-1"></div>
          <div className="font-black mb-4 text-xl md:text-2xl flex items-center justify-center gap-2 text-[#5D4037]">
            <PiggyBank className="w-7 h-7 text-pink-500" />
            給寶貝們的理財小語
          </div>
          <p className="text-gray-700 text-base md:text-lg leading-relaxed text-center font-bold tracking-wide">
            希望你們從小養成存錢的好習慣！這不僅是累積財富，更是學習管理財務、為自己未來負責的開始。
            看著你們的小宇宙慢慢壯大，未來的你們一定會感謝現在努力的自己！🌱✨
          </p>
        </div>
      </div>

    </div>
  );
}
