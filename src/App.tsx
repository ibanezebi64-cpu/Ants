import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mountain, 
  ArrowDown, 
  ArrowUp, 
  Pause, 
  Play, 
  Info, 
  Bug, 
  Leaf, 
  Droplets,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  X,
  RefreshCw
} from 'lucide-react';
import { useSimulation } from './useSimulation';
import { SimulationCanvas } from './SimulationCanvas';
import { AntType, CellType } from './types';
import { GRID_SIZE, CELL_SIZE } from './constants';

export default function App() {
  const { world, level, setLevel, isPaused, setIsPaused, addElement, addEnemy, resetSimulation, tick } = useSimulation();
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stats
  const antCount = world?.ants.length || 0;
  const foodCount = world?.resources.food || 0;
  const waterCount = world?.resources.water || 0;
  const dirtCount = world?.resources.dirtMound || 0;
  const larvaeCount = world?.larvae?.length || 0;
  const enemiesCount = world?.enemies?.length || 0;
  const workers = world?.ants.filter((a: any) => a.type === AntType.WORKER).length || 0;
  const soldiers = world?.ants.filter((a: any) => a.type === AntType.SOLDIER).length || 0;
  const nurses = world?.ants.filter((a: any) => a.type === AntType.NURSE).length || 0;

  useEffect(() => {
     if (containerRef.current) {
         containerRef.current.scrollLeft = (GRID_SIZE * CELL_SIZE - window.innerWidth) / 2;
         containerRef.current.scrollTop = (GRID_SIZE * CELL_SIZE - window.innerHeight) / 2;
     }
  }, []);

  const [activeTool, setActiveTool] = useState<CellType | 'ENEMY' | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / CELL_SIZE;
    const y = (e.clientY - rect.top) / CELL_SIZE;
    
    if (activeTool === 'ENEMY') {
        addEnemy(x, y);
    } else {
        addElement(x, y, activeTool);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-earth text-[#d4d4c8] font-sans overflow-hidden select-none">
      {/* Floating Info Button */}
      <button 
        onClick={() => setShowInfo(true)}
        className="fixed top-6 left-6 z-40 px-6 py-3 bg-accent-lime hover:bg-lime-400 text-stone-900 rounded-full font-bold shadow-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 animate-pulse"
      >
        <Info size={20} />
        <span className="tracking-widest text-xs">ИНСТРУКЦИЯ</span>
      </button>

      {/* HEADER */}
      <header className="h-16 bg-[#0a0a08] border-b border-ui-border flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center space-x-8 pl-24">
          <div className="text-xl font-bold tracking-tighter text-accent-lime uppercase flex items-center shrink-0">
            MYRMEX <span className="text-[10px] font-normal text-stone-500 ml-1 tracking-widest hidden sm:inline">v0.8.5-BETA</span>
          </div>
          
          <div className="flex space-x-6 items-center border-l border-ui-border pl-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Особей</span>
              <span className="text-sm font-mono text-white">{antCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Личинок</span>
              <span className="text-sm font-mono text-blue-300">{larvaeCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Еда</span>
              <span className="text-sm font-mono text-amber-400">{foodCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider">Земля</span>
              <span className="text-sm font-mono text-stone-400">{dirtCount}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="px-3 py-1.5 bg-ui-panel border border-ui-border rounded flex items-center space-x-3">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] uppercase font-bold tracking-widest text-green-500">Симуляция: АКТИВНА</span>
          </div>
          
          <div className="text-right border-l border-ui-border pl-6">
             <div className="text-[10px] uppercase text-stone-500 tracking-wider">Время</div>
             <div className="text-sm font-mono">{world?.time || 0}</div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
               onClick={resetSimulation}
               className="p-2 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
               title="Сброс симуляции"
            >
              <RefreshCw size={18} />
            </button>
            <button 
               onClick={() => setIsPaused(!isPaused)}
               className={`p-2 rounded transition-colors ${isPaused ? 'text-accent-lime' : 'text-stone-400 hover:text-white'}`}
            >
               {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT NAV - DEPTH CONTROL */}
        <nav className="w-16 bg-[#0a0a08] border-r border-ui-border flex flex-col items-center py-4 space-y-4 shrink-0">
          <button 
            onClick={() => setLevel(0)}
            className={`w-10 h-10 rounded border transition-all flex items-center justify-center text-xs font-bold
              ${level === 0 ? 'border-accent-lime bg-accent-lime/20 text-accent-lime' : 'border-ui-border text-stone-500 hover:border-stone-500'}`}
          >
            S
          </button>
          
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none py-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <button
                key={i}
                onClick={() => setLevel(i)}
                className={`w-10 h-10 rounded border transition-all flex items-center justify-center text-[10px] font-mono shrink-0
                  ${level === i 
                    ? 'border-accent-lime bg-accent-lime/20 text-accent-lime' 
                    : 'border-ui-border text-stone-500 hover:border-stone-500'}`}
              >
                {i}
              </button>
            ))}
          </div>

          <button className="w-10 h-10 rounded border border-ui-border flex items-center justify-center text-stone-600 text-xs hover:text-stone-400">
            ∞
          </button>
        </nav>

        {/* VIEWPORT */}
        <section 
          ref={containerRef}
          className="flex-1 relative bg-soil-dark overflow-auto scrollbar-none cursor-grab active:cursor-grabbing p-24"
        >
          <div className="relative inline-block shadow-[0_0_100px_rgba(0,0,0,0.5)]" onClick={handleCanvasClick}>
            <SimulationCanvas world={world} currentLevel={level} tick={tick} />
            
            {/* Context Legends */}
            <div className="absolute bottom-6 right-6 bg-black/60 p-4 border border-ui-border rounded backdrop-blur-md text-[10px] space-y-2 pointer-events-none">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-lime" />
                  <span className="uppercase tracking-widest opacity-60">ТРОПА ДОМОЙ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="uppercase tracking-widest opacity-60">ТРОПА К ЕДЕ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="uppercase tracking-widest opacity-60">МЕТКА УГРОЗЫ</span>
                </div>
            </div>
          </div>
        </section>

        {/* ASIDE - UTILS */}
        <aside className="w-64 bg-[#0d0d0b] border-l border-ui-border flex flex-col shrink-0">
          <div className="p-4 border-b border-ui-border bg-stone-900/50 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
            Инструментарий
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-none">
            <ToolButton 
              active={activeTool === CellType.FOOD} 
              onClick={() => setActiveTool(activeTool === CellType.FOOD ? null : CellType.FOOD)}
              label="Добавить еду" 
              hotkey="F1" 
              color="text-amber-400"
            />
            <ToolButton 
              active={activeTool === CellType.WATER} 
              onClick={() => setActiveTool(activeTool === CellType.WATER ? null : CellType.WATER)}
              label="Добавить воду" 
              hotkey="F2" 
              color="text-blue-400"
            />
            <ToolButton 
              active={activeTool === CellType.OBSTACLE} 
              onClick={() => setActiveTool(activeTool === CellType.OBSTACLE ? null : CellType.OBSTACLE)}
              label="Препятствие" 
              hotkey="F3" 
              color="text-stone-400"
            />
            <ToolButton 
              active={activeTool === 'ENEMY'} 
              onClick={() => setActiveTool(activeTool === 'ENEMY' ? null : 'ENEMY')} 
              label="Враг (Жук)" 
              hotkey="F4" 
              color="text-red-400"
            />

            <div className="pt-8 space-y-4">
              <div className="text-[10px] uppercase text-stone-500 font-bold tracking-widest">Касты колонии</div>
              <CasteProgress label="Рабочие" count={workers} max={antCount} color="bg-accent-lime" />
              <CasteProgress label="Солдаты" count={soldiers} max={antCount} color="bg-red-500" />
              <CasteProgress label="Няньки" count={nurses} max={antCount} color="bg-blue-400" />
              <CasteProgress label="Личинки" count={larvaeCount} max={larvaeCount + 10} color="bg-blue-200" />
            </div>
          </div>

          <div className="p-4 bg-stone-900/80 border-t border-ui-border">
            <div className="text-[9px] uppercase text-stone-600 mb-2 font-bold tracking-widest">Статус королевы</div>
            <div className="text-xs leading-relaxed italic text-stone-400 font-serif">
              {foodCount > 30 
                ? "«Королева сыта. Личинки развиваются стабильно.»" 
                : "«Королева просит еды. Требуется больше фуражиров.»"}
            </div>
          </div>
        </aside>
      </main>

      {/* FOOTER */}
      <footer className="h-8 bg-[#050504] border-t border-ui-border flex items-center px-4 justify-between text-[9px] text-stone-700 uppercase tracking-[0.3em] shrink-0 font-bold">
        <div>Логика феромонов: Активна</div>
        <div>Авто-экспансия: ВКЛ</div>
        <div className="flex gap-4">
           <span className="text-stone-500">Тики: {world?.time}</span>
           <span className="text-accent-lime uppercase">Под землей</span>
        </div>
      </footer>

      {/* Instruction Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-6 right-6 p-2 hover:bg-stone-800 rounded-lg transition-colors text-stone-400"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-3xl font-bold text-stone-100 font-sans tracking-tight mb-6">Инструкция Колонии</h2>
            
            <div className="space-y-6 text-stone-300 font-sans leading-relaxed">
              <section>
                <h3 className="text-xl font-semibold text-accent-lime mb-2">Обзор игры</h3>
                <p>
                  Это симулятор жизни муравьиной колонии. Вы наблюдаете за автоматической жизнью колонии 
                  и можете влиять на нее, размещая еду, препятствия или врагов.
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-stone-800/40 border border-stone-700 rounded-xl">
                  <h4 className="font-bold text-stone-100 mb-1">🐜 Рабочие (Workers)</h4>
                  <p className="text-xs">Единственные, кто роет туннели и собирает еду снаружи. Настоящие двигатели прогресса.</p>
                </div>
                <div className="p-4 bg-stone-800/40 border border-stone-700 rounded-xl">
                  <h4 className="font-bold text-stone-100 mb-1">🛡️ Солдаты (Soldiers)</h4>
                  <p className="text-xs">Только защита. Патрулируют уровни, не отвлекаясь на сбор ресурсов. Быстрее рабочих.</p>
                </div>
                <div className="p-4 bg-stone-800/40 border border-stone-700 rounded-xl">
                  <h4 className="font-bold text-stone-100 mb-1">🍼 Няньки (Nurses)</h4>
                  <p className="text-xs">Обслуживают Королеву и личинок. Не покидают муравейник. Таскают еду из складов вглубь.</p>
                </div>
                <div className="p-4 bg-stone-800/40 border border-stone-700 rounded-xl">
                  <h4 className="font-bold text-stone-100 mb-1">👑 Королева (Queen)</h4>
                  <p className="text-xs">Только ест и рожает. Ждет, пока рабочие выроют ей комнаты на 2-м уровне, прежде чем спуститься.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-accent-lime mb-2">Уровни и комнаты</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>S (Поверхность)</strong>: Сбор еды и борьба с жуками.</li>
                  <li><strong>Уровень 1</strong>: Склады (коричневые) и казармы солдат.</li>
                  <li><strong>Уровень 2</strong>: Королевские покои и ясли для личинок.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-red-400 mb-2">Враги (Жуки)</h3>
                <p className="text-sm border-l-2 border-red-500/30 pl-4 py-1">
                  Крупные хищники патрулируют поверхность. Если жук замечает муравья, он начинает погоню. 
                  Укушенный муравей выделяет феромон страха, на который сбегаются <span className="text-red-400 font-bold">солдаты</span>.
                </p>
              </section>

              <button 
                onClick={() => setShowInfo(false)}
                className="w-full py-4 bg-accent-lime hover:bg-lime-500 text-stone-900 font-bold rounded-xl transition-all shadow-lg active:scale-95"
              >
                К УПРАВЛЕНИЮ КОЛОНИЕЙ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({ active, label, hotkey, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex justify-between items-center p-3 rounded-md border transition-all text-left group
        ${active 
          ? 'bg-white/5 border-accent-lime shadow-[inset_0_0_10px_rgba(163,230,53,0.1)]' 
          : 'border-transparent hover:bg-white/5 hover:border-ui-border'}`}
    >
      <span className={`text-sm italic tracking-tight font-serif ${color}`}>{label}</span>
      <span className="text-[9px] bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded uppercase font-mono">{hotkey}</span>
    </button>
  );
}

function CasteProgress({ label, count, color, max }: any) {
  const percent = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="uppercase text-stone-400">{label}</span>
        <span className="text-white">{count}</span>
      </div>
      <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

