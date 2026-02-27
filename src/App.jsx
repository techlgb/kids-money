/*
  ========================================================================
  [持續需要更新] 🌟 學、惟、喬的理財小宇宙 - 未來擴充設計說明
  ========================================================================
  
  未來如果您買了新股票，或是賣出了股票，請在下方的 `portfolio` 區塊中新增紀錄即可，
  系統會自動抓取最新股價，並自動回推歷史股息，幫您算出最準確的報酬！

  【如何新增一檔新股票？】
  請依照下方的格式，複製並貼上一個新的區塊。
  "股票代號.TW": { 
      name: "顯示名稱",
      transactions: [ ...交易紀錄 ]
  }

  【如何新增交易紀錄 (買進/賣出)？】
  在該股票的 `transactions` 陣列中，新增一行大括號 {}，格式如下：
  { date: 'YYYY-MM-DD', type: 'BUY' 或 'SELL', qty: 股數, price: 成交單價 }

  * 買進範例 (買了 500 股 0050，每股 150 元)：
    { date: '2024-05-15', type: 'BUY', qty: 500, price: 150.0 }
  
  * 賣出範例 (賣了 10 股 台積電，每股 2000 元)：
    { date: '2024-08-01', type: 'SELL', qty: 10, price: 2000.0 }

  未來更新程式碼： 如果以後您想修改畫面（例如修改備忘錄的文字、增加新的股票），只需要在您的電腦上修改 App.jsx
  然後在終端機輸入這三行指令：
    
  git add .
  git commit -m "更新內容"
  git push

  GitHub 的機器人就會自動幫您更新網頁了，再也不用重新設定！

  ※ 備註：
  1. 系統會自動根據您的 `date` (交易日期)，去網路上抓取除息日比對。只要您在除息日前持有，就會自動算入「已領股息」！
  2. 如果股票全部賣光 (持股變 0)，系統會在畫面上標示 [已結清]，但過去賺的價差跟股息都會永久保留在總獲利裡！
  ========================================================================
*/

import React, { useState, useEffect } from 'react';
import { CircleDollarSign, PiggyBank, Loader2, Coins, History } from 'lucide-react';

export default function App() {
  // === 1. 在此設定您的投資組合與歷史交易 ===
  const portfolio = {
    "0050.TW": { 
      name: "0050 (元大台灣50)", 
      transactions: [
        // 2026-02-23 總共買入 3 張，平分給 3 位孩子，每人 1 張 (1000股)
        { date: '2026-02-23', type: 'BUY', qty: 1000, price: 77.7 },
      ]
    },
    "2330.TW": { 
      name: "2330 (台積電)", 
      transactions: [
        // 2026-01-12 總共買入 15 股，平分給 3 位孩子，每人 5 股
        { date: '2026-01-12', type: 'BUY', qty: 5, price: 1700.0 },
        // 2026-02-11 總共買入 15 股，平分給 3 位孩子，每人 5 股
        { date: '2026-02-11', type: 'BUY', qty: 5, price: 1905.0 },
      ]
    }
    // 未來要新增股票，請複製上面的結構，例如 "2317.TW": { ... }
  };

  const kids = [
    { id: 'xue', image: '學01.jpg', bg: 'bg-[#E3F2FD]', dark: 'bg-[#64B5F6]' },
    { id: 'wei', image: '惟01.jpg', bg: 'bg-[#E8F5E9]', dark: 'bg-[#81C784]' },
    { id: 'qiao', image: '喬01.jpg', bg: 'bg-[#F3E5F5]', dark: 'bg-[#BA68C8]' }
  ];

  // === 2. 狀態管理 ===
  const [marketData, setMarketData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // === 3. 抓取即時股價與「歷史配息」 API ===
  useEffect(() => {
    let isMounted = true;
    const fetchMarketData = async () => {
      setIsLoading(true);
      const newMarketData = {};

      for (const symbol of Object.keys(portfolio)) {
        try {
          // 使用 range=10y 抓取過去10年股價與配息紀錄 (events=div)
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=10y&interval=1mo&events=div`;
          
          let response;
          try {
            response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error('Proxy 1 failed');
          } catch (e) {
            response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
          }
          
          if (!response.ok) throw new Error('Network error');
          
          const data = await response.json();
          const result = data.chart.result[0];
          
          // 取得目前最新股價
          const currentPrice = result.meta.regularMarketPrice;
          
          // 解析所有的配息紀錄 { timestamp: amount }
          const dividendsObj = result.events?.dividends || {};
          const dividends = Object.values(dividendsObj).map(d => ({
            amount: d.amount,
            timestamp: d.date * 1000 // 轉換為毫秒時間戳
          })).sort((a, b) => a.timestamp - b.timestamp);

          newMarketData[symbol] = { currentPrice, dividends };
        } catch (error) {
          console.error(`無法取得 ${symbol} 資料`, error);
          // 發生錯誤時給予預設值避免崩潰
          newMarketData[symbol] = { currentPrice: 0, dividends: [] };
        }
      }

      if (isMounted) {
        setMarketData(newMarketData);
        setIsLoading(false);
      }
    };
    fetchMarketData();
    return () => { isMounted = false; };
  }, []);

  // === 4. 核心計算邏輯：自動結算買賣與股息 ===
  const analyzeStock = (symbol, stockConfig) => {
    const data = marketData[symbol] || { currentPrice: 0, dividends: [] };
    const currentPrice = data.currentPrice;
    
    let currentQty = 0;
    let currentCost = 0; // "目前"持股的總成本
    let realizedProfit = 0; // 已實現損益 (賣出賺的錢)
    
    // 依日期排序交易紀錄，避免順序錯亂
    const sortedTx = [...stockConfig.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

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

    // 2. 計算自動股息
    let earnedDividends = 0;
    data.dividends.forEach(div => {
      let heldQtyAtDivDate = 0;
      // 計算在除息日「當下」持有多少股
      sortedTx.forEach(tx => {
        const txTimestamp = new Date(tx.date).getTime();
        // 如果買進日期在除息日之前，就有資格領息
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
    const currentValue = currentQty * currentPrice;
    const unrealizedProfit = currentValue - currentCost; // 帳面(未實現)損益
    const avgPrice = currentQty > 0 ? (currentCost / currentQty).toFixed(1) : 0;
    const isSoldOut = currentQty === 0 && stockConfig.transactions.length > 0;

    return { 
      name: stockConfig.name,
      currentQty, 
      currentCost, 
      currentValue, 
      unrealizedProfit, 
      realizedProfit,
      earnedDividends,
      avgPrice,
      isSoldOut
    };
  };

  // === 5. 總計結算 ===
  const analyzedPortfolio = Object.keys(portfolio).map(symbol => analyzeStock(symbol, portfolio[symbol]));

  let totalValue = 0;
  let totalCost = 0; // 僅計算"現有持股"的本金
  let totalUnrealized = 0;
  let totalRealized = 0;
  let totalDividends = 0;

  analyzedPortfolio.forEach(stock => {
    totalValue += stock.currentValue;
    totalCost += stock.currentCost;
    totalUnrealized += stock.unrealizedProfit;
    totalRealized += stock.realizedProfit;
    totalDividends += stock.earnedDividends;
  });

  // 總淨利 = 帳面損益 + 已實現損益(賣掉賺的) + 領到的股息
  const totalNetProfit = totalUnrealized + totalRealized + totalDividends;
  
  // 三人合計
  const grandTotalProfit = totalNetProfit * 3;
  const grandTotalCost = totalCost * 3;

  // 工具：數字與百分比格式化
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

  const principalPercent = totalValue > 0 ? Math.max(0, Math.min(100, (totalCost / totalValue) * 100)) : 0;
  const profitPercent = totalValue > 0 ? Math.max(0, Math.min(100, (totalNetProfit / totalValue) * 100)) : 100;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center font-sans text-[#5D4037]">
        <Loader2 className="w-12 h-12 animate-spin text-[#64B5F6] mb-4" />
        <h2 className="text-2xl font-black">📡 智能小宇宙連線中...</h2>
        <p className="text-gray-500 mt-2">正在自動核對歷史交易與歷年配息資料</p>
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

      {/* 三欄式卡片區 */}
      <div className="flex justify-center flex-wrap gap-6 max-w-6xl mx-auto">
        {kids.map((kid) => (
          <div key={kid.id} className={`${kid.bg} w-full md:w-[360px] rounded-[24px] p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative`}>
            
            <div className="text-center mb-5">
              <img 
                src={kid.image} 
                alt="孩子照片" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto bg-gray-200"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${kid.id}&background=ccc&color=fff&size=100`; }}
              />
            </div>
            
            <div className="text-center mb-6 bg-white/60 rounded-2xl p-4 backdrop-blur-sm">
              <div className="text-sm text-gray-600 font-bold mb-1">
                總{totalNetProfit >= 0 ? '淨利' : '損益'} (含已實現與配息)
              </div>
              <div className="text-2xl sm:text-3xl font-black mb-3">
                <ProfitDisplay profit={totalNetProfit} cost={totalCost} />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-bold text-gray-600 bg-white shadow-sm border border-gray-100">
                現有持股市值: {formatMoney(totalValue)}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-bold mb-2 text-center text-gray-700">資產結構比例</div>
              <div className="h-10 bg-white/50 rounded-full flex overflow-hidden relative shadow-inner">
                {totalCost === 0 && totalNetProfit === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">目前無持股</div>
                ) : (
                  <>
                    <div className={`group relative h-full flex items-center justify-center text-white font-bold text-xs transition-all duration-1000 ${kid.dark}`} style={{ width: `${principalPercent}%` }}>
                      {principalPercent > 15 ? '現有本金' : ''}
                      <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-10">
                        投入本金: {formatMoney(totalCost)}
                      </div>
                    </div>
                    {totalNetProfit > 0 && (
                      <div className="group relative h-full flex items-center justify-center text-white font-bold text-xs transition-all duration-1000 bg-[#E57373]" style={{ width: `${profitPercent}%` }}>
                        {profitPercent > 15 ? '獲利' : ''}
                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-10">
                          歷史與帳面獲利: {formatMoney(totalNetProfit)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 股票明細清單 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              {analyzedPortfolio.map((stock, index) => (
                <div key={index} className={`flex justify-between items-start py-3 ${index !== analyzedPortfolio.length - 1 ? 'border-b border-gray-100 border-dashed' : ''}`}>
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

                    {/* 自動抓取的配息紀錄 */}
                    {stock.earnedDividends > 0 && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                          <Coins className="w-3 h-3" /> 歷史領息 {formatMoney(stock.earnedDividends)}
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
                    {!stock.isSoldOut && (
                      <>
                        <div className="font-black text-[15px]">{formatMoney(stock.currentValue)}</div>
                        <div className="text-[13px] font-bold mt-1">
                          <ProfitDisplay profit={stock.unrealizedProfit} cost={stock.currentCost} />
                        </div>
                      </>
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
        ))}
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