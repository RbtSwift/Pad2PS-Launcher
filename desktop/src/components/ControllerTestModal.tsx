import {useEffect, useRef, useState} from 'react';
import {Gamepad2} from 'lucide-react';
import type {ResolvedControllerLayout} from '../types';

interface Props { layout: ResolvedControllerLayout; onExit: () => void; }
interface Snapshot { name: string; axes: number[]; buttons: boolean[]; }

const LABELS: Record<ResolvedControllerLayout, string[]> = {
  playstation: ['×', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', '↑', '↓', '←', '→', 'PS'],
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→', 'Xbox'],
  nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '-', '+', 'L3', 'R3', '↑', '↓', '←', '→', 'Home'],
};

const STICK_POSITIONS: Record<ResolvedControllerLayout, [[number, number], [number, number]]> = {
  playstation: [[405, 350], [595, 350]],
  xbox: [[350, 352], [650, 352]],
  nintendo: [[350, 352], [650, 352]],
};

const EXIT_COMBO: Record<ResolvedControllerLayout, string> = {
  playstation: 'L1 + R1 + Options',
  xbox: 'LB + RB + Menu',
  nintendo: 'L + R + +',
};

export function ControllerTestModal({layout, onExit}: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [progress, setProgress] = useState(0);
  const escHeld = useRef(false);
  const holdStarted = useRef<number | null>(null);
  const labels = LABELS[layout] ?? LABELS.xbox;
  const [leftStick, rightStick] = STICK_POSITIONS[layout] ?? STICK_POSITIONS.xbox;

  useEffect(() => {
    let frame = 0;
    let lastUpdate = 0;
    const tick = (now: number) => {
      const pads = navigator.getGamepads?.();
      const pad = pads ? Array.from(pads).find((item) => item?.connected) : null;
      const buttons = pad ? Array.from(pad.buttons, (button) => button.pressed || button.value > 0.5) : [];
      if (now - lastUpdate > 32) {
        setSnapshot(pad ? {name: pad.id, axes: Array.from(pad.axes), buttons} : null);
        lastUpdate = now;
      }
      const combo = Boolean(buttons[4] && buttons[5] && buttons[9]);
      if (combo || escHeld.current) {
        holdStarted.current ??= now;
        const duration = combo ? 1700 : 2000;
        const amount = Math.min(100, ((now - holdStarted.current) / duration) * 100);
        setProgress(amount);
        if (amount >= 100) { onExit(); return; }
      } else {
        holdStarted.current = null;
        setProgress(0);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); escHeld.current = true; }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === 'Escape') escHeld.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [onExit]);

  const button = (index: number, cx: number, cy: number, r: number, text = labels[index]) => {
    const active = Boolean(snapshot?.buttons[index]);
    const face = [0, 1, 2, 3].includes(index);
    const color = layout === 'playstation' && face
      ? ({0: '#38bdf8', 1: '#f87171', 2: '#f472b6', 3: '#4ade80'} as Record<number, string>)[index]
      : layout === 'nintendo' && face
        ? ({0: '#ef4444', 1: '#38bdf8', 2: '#4ade80', 3: '#facc15'} as Record<number, string>)[index]
        : '#67e8f9';
    return <g key={`button-${index}`} className={active ? 'controller-part controller-part-active' : 'controller-part'}>
      {active && <circle cx={cx} cy={cy} r={r + 10} fill={color} opacity=".22" filter="url(#pad-glow)" />}
      <circle cx={cx} cy={cy} r={r} fill={active ? color : '#151b25'} stroke={active ? color : '#687488'} strokeWidth="3" />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={active && face ? '#07111d' : active ? '#06131a' : '#e2e8f0'} fontSize={text.length > 4 ? 13 : 17} fontWeight="800">{text}</text>
    </g>;
  };

  const shoulder = (index: number, x: number, y: number, w: number, h: number) => {
    const active = Boolean(snapshot?.buttons[index]);
    return <g key={`shoulder-${index}`} className={active ? 'controller-part controller-part-active' : 'controller-part'}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={active ? '#67e8f9' : '#19212e'} stroke={active ? '#a5f3fc' : '#778398'} strokeWidth="3" />
      <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill={active ? '#07111d' : '#e2e8f0'} fontSize="16" fontWeight="800">{labels[index]}</text>
    </g>;
  };

  const stick = (index: number, cx: number, cy: number, axisX: number, axisY: number) => {
    const active = Boolean(snapshot?.buttons[index]);
    const x = snapshot?.axes[axisX] ?? 0;
    const y = snapshot?.axes[axisY] ?? 0;
    const knobX = cx + Math.max(-1, Math.min(1, x)) * 36;
    const knobY = cy + Math.max(-1, Math.min(1, y)) * 36;
    return <g key={`stick-${index}`}>
      <circle cx={cx} cy={cy} r="54" fill={active ? '#164e63' : '#101621'} stroke={active ? '#67e8f9' : '#778398'} strokeWidth={active ? 5 : 3} className="controller-part" />
      <circle cx={cx} cy={cy} r="37" fill="none" stroke="#344052" strokeWidth="2" />
      <path d={`M${cx - 25} ${cy}h50 M${cx} ${cy - 25}v50`} stroke="#344052" strokeWidth="2" />
      {active && <circle cx={cx} cy={cy} r="61" fill="#67e8f9" opacity=".12" filter="url(#pad-glow)" />}
      <circle cx={knobX} cy={knobY} r="23" fill={active ? '#67e8f9' : '#596779'} stroke={active ? '#cffafe' : '#8996a8'} strokeWidth="3" className="controller-knob" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={active ? '#07111d' : '#e2e8f0'} fontSize="12" fontWeight="900">{labels[index]}</text>
    </g>;
  };

  const dpadButton = (index: number, x: number, y: number, w: number, h: number) => {
    const active = Boolean(snapshot?.buttons[index]);
    return <g key={`dpad-${index}`} className={active ? 'controller-part controller-part-active' : 'controller-part'}>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={active ? '#67e8f9' : '#1a2230'} stroke={active ? '#a5f3fc' : '#647185'} strokeWidth="3" />
      <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fill={active ? '#07111d' : '#e2e8f0'} fontSize="19" fontWeight="900">{labels[index]}</text>
    </g>;
  };

  const centerButton = (index: number, cx: number) => {
    const active = Boolean(snapshot?.buttons[index]);
    const w = labels[index].length > 4 ? 82 : 68;
    return <g key={`center-${index}`} className={active ? 'controller-part controller-part-active' : 'controller-part'}>
      {active && <rect x={cx - w / 2 - 7} y="249" width={w + 14} height="48" rx="18" fill="#67e8f9" opacity=".22" filter="url(#pad-glow)"/>}
      <rect x={cx - w / 2} y="256" width={w} height="34" rx="14" fill={active ? '#67e8f9' : '#151b25'} stroke={active ? '#a5f3fc' : '#687488'} strokeWidth="3"/>
      <text x={cx} y="278" textAnchor="middle" fill={active ? '#07111d' : '#e2e8f0'} fontSize={labels[index].length > 5 ? 11 : 13} fontWeight="800">{labels[index]}</text>
    </g>;
  };

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-5">
    <section role="dialog" aria-modal="true" aria-labelledby="controller-test-title" className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-cyan-300/40 bg-[#0c1018] p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,.72)] sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/25 bg-cyan-300/10"><Gamepad2 className="h-6 w-6 text-cyan-200"/></div><div><h2 id="controller-test-title" className="text-xl font-bold tracking-tight">Testar Controle</h2><p className="mt-0.5 max-w-[65vw] truncate text-xs text-slate-400">{snapshot?.name ?? 'Aguardando controle…'}</p></div></div>
        <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[11px] font-semibold text-slate-300">{layout === 'playstation' ? 'PlayStation' : layout === 'nintendo' ? 'Nintendo' : 'Xbox'}</span>
      </header>

      <div className="my-4 rounded-xl border-2 border-amber-300/80 bg-amber-300/[.08] p-3 text-center sm:my-5 sm:p-4">
        <p className="text-sm font-extrabold text-amber-100">Segure {EXIT_COMBO[layout] ?? EXIT_COMBO.xbox} (ou segure Esc por 2s) para sair do teste</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/60"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 shadow-[0_0_18px_rgba(251,191,36,.8)] transition-[width] duration-75" style={{width: `${progress}%`}}/></div>
        <p className="mt-1 text-[10px] text-amber-100/65">Mantenha o combo por cerca de 1,7 s até a barra completar</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[.08] bg-[radial-gradient(ellipse_at_center,rgba(36,52,72,.44),rgba(8,12,19,.96)_72%)] px-1 py-3 sm:px-5 sm:py-4">
        <svg viewBox="0 0 1000 520" role="img" aria-label={`Ilustração de controle ${layout} com botões e analógicos ativos`} className="mx-auto block w-full max-w-[760px] select-none">
          <defs>
            <linearGradient id="pad-shell" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#273345"/><stop offset=".48" stopColor="#151d2a"/><stop offset="1" stopColor="#0b1018"/></linearGradient>
            <linearGradient id="pad-highlight" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#9fb0c5" stopOpacity=".25"/><stop offset="1" stopColor="#9fb0c5" stopOpacity="0"/></linearGradient>
            <filter id="pad-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
          </defs>
          <path d="M205 198 C220 153 267 133 333 151 L408 174 Q500 153 592 174 L667 151 C733 133 780 153 795 198 L852 371 C867 414 838 446 801 425 L703 365 H297 L199 425 C162 446 133 414 148 371 Z" fill="url(#pad-shell)" stroke="#7c899b" strokeWidth="5"/>
          <path d="M220 207 C237 170 273 155 326 167 L411 188 Q500 169 589 188 L674 167 C727 155 763 170 780 207 L814 312 Q700 279 500 286 Q300 279 186 312 Z" fill="url(#pad-highlight)" opacity=".72"/>
          <path d="M229 212 Q260 176 320 179 M771 212 Q740 176 680 179" fill="none" stroke="#cbd5e1" strokeOpacity=".17" strokeWidth="3"/>

          {shoulder(6, 246, 111, 174, 35)}{shoulder(7, 580, 111, 174, 35)}
          {shoulder(4, 255, 154, 190, 43)}{shoulder(5, 555, 154, 190, 43)}

          <g aria-label="D-Pad">{dpadButton(12, 247, 267, 52, 53)}{dpadButton(13, 247, 377, 52, 53)}{dpadButton(14, 192, 322, 53, 53)}{dpadButton(15, 302, 322, 53, 53)}</g>
          <g aria-label="Botões frontais">
            {button(3, 739, 281, 29)}{button(1, 791, 333, 29)}{button(0, 739, 385, 29)}{button(2, 687, 333, 29)}
          </g>

          {stick(10, leftStick[0], leftStick[1], 0, 1)}
          {stick(11, rightStick[0], rightStick[1], 2, 3)}

          {button(16, 500, 221, 22)}
          {centerButton(8, 447)}{centerButton(9, 553)}

          <text x={leftStick[0]} y="440" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="700">ANALÓGICO ESQUERDO</text>
          <text x={rightStick[0]} y="440" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="700">ANALÓGICO DIREITO</text>
          <text x="500" y="478" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="600">Aperte qualquer botão para ver o destaque</text>
        </svg>
      </div>

      {!snapshot && <p className="mt-3 text-center text-xs text-slate-400">Conecte o controle e pressione qualquer botão para começar.</p>}
      <aside className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-3.5 text-xs leading-relaxed text-slate-300 sm:p-4">Para usar funções mais avançadas (overlay flutuante em tempo real, conversão de ícones para PlayStation, bateria e diagnóstico completo), acesse o <a href="https://github.com/RbtSwift/Pad2PS/releases/latest" target="_blank" rel="noreferrer" className="font-bold text-cyan-200 underline decoration-cyan-200/50 underline-offset-2 hover:text-white">Pad2PS Oficial</a>.</aside>
    </section>
  </div>;
}
