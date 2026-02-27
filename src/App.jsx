import React, { useState, useEffect } from 'react';
import { CircleDollarSign, PiggyBank, Loader2 } from 'lucide-react';

export default function App() {
  // === 1. 設定初始資料與狀態 ===
  // 預設股價 (當網路 API 抓取失敗時的備用數字)
  const [price0050, setPrice0050] = useState(81.3);
  const [priceTSMC, setPriceTSMC] = useState(2010.0);
  const [isLoading, setIsLoading] = useState(true);

  // 原始股票成本資料
  const portfolio = {
    stock0050: { name: "0050 (元大台灣50)", qty: 1000, buyPrice: 77.7, totalCost: 77700 }, // 1張 = 1000股
    stockTSMC: { name: "2330 (台積電)", qty: 10, buyPrice: 1805.3, totalCost: 18053 }
  };

  // 孩子們的專屬設定 (已將頭像替換為真實照片路徑，並移除文字名稱設定)
  const kids = [
    { id: 'xue', image: '學01.jpg', bg: 'bg-[#E3F2FD]', dark: 'bg-[#64B5F6]' },
    { id: 'wei', image: '惟01.jpg', bg: 'bg-[#E8F5E9]', dark: 'bg-[#81C784]' },
    { id: 'qiao', image: '喬01.jpg', bg: 'bg-[#F3E5F5]', dark: 'bg-[#BA68C8]' }
  ];

  // === 2. 抓取即時股價 API ===
  useEffect(() => {
    let isMounted = true;
    
    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        // 使用公開的 Proxy 繞過瀏覽器 CORS 限制，抓取 Yahoo Finance 的最新股價
        const fetchStock = async (symbol) => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
          
          // 嘗試第一個 Proxy (corsproxy.io)
          try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
              const data = await response.json();
              return data.chart.result[0].meta.regularMarketPrice;
            }
          } catch (e) {
            console.warn("第一個 Proxy 失敗，嘗試備用方案...", e);
          }
          
          // 嘗試第二個 Proxy (codetabs) 作為備用
          const fallbackProxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
          const response = await fetch(fallbackProxyUrl);
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          return data.chart.result[0].meta.regularMarketPrice;
        };

        const [p0050, p2330] = await Promise.all([
          fetchStock('0050.TW'),
          fetchStock('2330.TW')
        ]);

        if (isMounted) {
          setPrice0050(p0050);
          setPriceTSMC(p2330);
        }
      } catch (error) {
        console.error("無法取得即時股價，使用預設/最後已知股價", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPrices();
    
    return () => { isMounted = false; };
  }, []);


  // === 3. 核心計算邏輯 ===
  // 計算 0050 的現值與盈虧
  const value0050 = price0050 * portfolio.stock0050.qty;
  const profit0050 = value0050 - portfolio.stock0050.totalCost;

  // 計算 台積電 的現值與盈虧
  const valueTSMC = priceTSMC * portfolio.stockTSMC.qty;
  const profitTSMC = valueTSMC - portfolio.stockTSMC.totalCost;

  // 單人總結
  const totalCost = portfolio.stock0050.totalCost + portfolio.stockTSMC.totalCost;
  const totalValue = value0050 + valueTSMC;
  const totalProfit = profit0050 + profitTSMC;

  // 三人合計
  const grandTotalProfit = totalProfit * 3;
  const grandTotalCost = totalCost * 3;

  // 數字與百分比格式化工具
  const formatMoney = (num) => "$" + Math.round(Math.abs(num)).toLocaleString('zh-TW');
  
  // 渲染獲利(含百分比)的共用小元件
  const ProfitDisplay = ({ profit, cost, className = "" }) => {
    const percent = ((profit / cost) * 100).toFixed(2);
    const isPositive = profit >= 0;
    const sign = isPositive ? '+' : '-';
    const arrow = isPositive ? '▲' : '▼';
    const defaultColor = isPositive ? 'text-[#E57373]' : 'text-green-600';

    return (
      <span className={`${className || defaultColor}`}>
        {arrow} {sign}{formatMoney(profit)} ({sign}{Math.abs(percent)}%)
      </span>
    );
  };

  // 圖表比例 (確保不會超過 100% 或低於 0%)
  const principalPercent = Math.max(0, Math.min(100, (totalCost / totalValue) * 100)) || 0;
  const profitPercent = Math.max(0, Math.min(100, (totalProfit / totalValue) * 100)) || 0;

  // 如果正在抓取資料，顯示載入畫面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center font-sans text-[#5D4037]">
        <Loader2 className="w-12 h-12 animate-spin text-[#64B5F6] mb-4" />
        <h2 className="text-2xl font-black">📡 小宇宙連線中...</h2>
        <p className="text-gray-500 mt-2">正在為您抓取最新市場股價</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] p-4 md:p-8 font-sans text-[#424242]" style={{ fontFamily: "'Nunito', 'Noto Sans TC', sans-serif" }}>
      {/* 載入字體 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Noto+Sans+TC:wght@400;700;900&display=swap');
      `}</style>

      {/* 頂部總覽區 */}
      <div className="text-center mb-10">
        <h1 className="text-[#5D4037] text-3xl font-black mb-4 flex items-center justify-center gap-2">
          🌟 學、惟、喬的財富小宇宙
        </h1>
        
        <div className="inline-block bg-white px-8 py-4 rounded-full shadow-md text-xl font-bold border border-gray-100">
          三人合計總獲利： 
          <span className="ml-2 text-2xl">
            <ProfitDisplay profit={grandTotalProfit} cost={grandTotalCost} />
          </span>
        </div>
      </div>

      {/* 三欄式卡片區 */}
      <div className="flex justify-center flex-wrap gap-6 max-w-6xl mx-auto">
        {kids.map((kid) => (
          <div 
            key={kid.id} 
            className={`${kid.bg} w-full md:w-[340px] rounded-[24px] p-6 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative`}
          >
            {/* 頭像區域 (已替換為真實照片，並移除下方的名字) */}
            <div className="text-center mb-5">
              <img 
                src={kid.image} 
                alt="孩子照片" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto bg-gray-200"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${kid.id}&background=ccc&color=fff&size=100`; }}
              />
            </div>
            
            {/* 總資產與獲利標籤 (已將獲利放大，並將總市值縮小作為附註) */}
            <div className="text-center mb-6 bg-white/60 rounded-2xl p-4 backdrop-blur-sm">
              <div className="text-sm text-gray-600 font-bold mb-1">目前總獲利</div>
              <div className="text-2xl sm:text-3xl font-black mb-3">
                <ProfitDisplay profit={totalProfit} cost={totalCost} />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-bold text-gray-600 bg-white shadow-sm border border-gray-100">
                股票總市值: {formatMoney(totalValue)}
              </div>
            </div>

            {/* 互動式本金獲利堆疊圖 (已將 Tooltip 分拆至各自的區塊) */}
            <div className="mb-6">
              <div className="text-sm font-bold mb-2 text-center text-gray-700">本金 vs 獲利比例</div>
              <div className="h-10 bg-white/50 rounded-full flex overflow-hidden relative shadow-inner">
                
                {/* 本金區塊 */}
                <div 
                  className={`group relative h-full flex items-center justify-center text-white font-bold text-xs transition-all duration-1000 ${kid.dark}`} 
                  style={{ width: `${principalPercent}%` }}
                >
                  {principalPercent > 15 ? '本金' : ''}
                  <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap transition-opacity z-10 shadow-lg pointer-events-none">
                    投入本金: {formatMoney(totalCost)}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
                
                {/* 獲利區塊 */}
                {totalProfit > 0 && (
                  <div 
                    className="group relative h-full flex items-center justify-center text-white font-bold text-xs transition-all duration-1000 bg-[#E57373]" 
                    style={{ width: `${profitPercent}%` }}
                  >
                    {profitPercent > 15 ? '獲利' : ''}
                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap transition-opacity z-10 shadow-lg pointer-events-none">
                      獲利金額: {formatMoney(totalProfit)}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 股票明細清單 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {/* 0050 */}
              <div className="flex justify-between items-center py-3 border-b border-gray-100 border-dashed">
                <div>
                  <span className="font-bold text-[15px] flex items-center gap-1">
                    <CircleDollarSign className="w-4 h-4 text-blue-500" /> {portfolio.stock0050.name}
                  </span>
                  <span className="text-xs text-gray-500 block mt-1">1張 (現價 {price0050})</span>
                </div>
                <div className="text-right">
                  <div className="font-black text-[15px]">{formatMoney(value0050)}</div>
                  <div className="text-[13px] font-bold mt-1">
                    <ProfitDisplay profit={profit0050} cost={portfolio.stock0050.totalCost} />
                  </div>
                </div>
              </div>
              
              {/* 2330 */}
              <div className="flex justify-between items-center py-3">
                <div>
                  <span className="font-bold text-[15px] flex items-center gap-1">
                    <CircleDollarSign className="w-4 h-4 text-orange-500" /> {portfolio.stockTSMC.name}
                  </span>
                  <span className="text-xs text-gray-500 block mt-1">10股 (現價 {priceTSMC})</span>
                </div>
                <div className="text-right">
                  <div className="font-black text-[15px]">{formatMoney(valueTSMC)}</div>
                  <div className="text-[13px] font-bold mt-1">
                    <ProfitDisplay profit={profitTSMC} cost={portfolio.stockTSMC.totalCost} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部備註區 - 給寶貝們的理財小語 */}
      <div className="max-w-4xl mx-auto mt-12 mb-8 flex justify-center px-4">
        <div className="bg-[#FFF9C4] p-8 md:p-10 rounded-xl shadow-md w-full max-w-2xl -rotate-1 hover:rotate-0 transition-transform duration-300 cursor-default relative">
          {/* 頂部膠帶裝飾 */}
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