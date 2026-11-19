import {useEffect, useRef, useState} from 'react';
import {Gamepad2} from 'lucide-react';
import type {ResolvedControllerLayout} from '../types';

interface Props { layout: ResolvedControllerLayout; onExit: () => void; }
interface Snapshot { name: string; axes: number[]; buttons: boolean[]; }

const BUTTON_LABELS: Record<ResolvedControllerLayout, string[]> = {
  xbox: ['A','B','X','Y','LB','RB','LT','RT','View','Start','LS','RS','↑','↓','←','→','Xbox'],
  playstation: ['×','○','□','△','L1','R1','L2','R2','Share','Options','L3','R3','↑','↓','←','→','PS'],
  nintendo: ['B','A','Y','X','L','R','ZL','ZR','−','+','LS','RS','↑','↓','←','→','Home'],
};

export function ControllerTestModal({layout, onExit}: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [progress, setProgress] = useState(0);
  const escHeld = useRef(false);
  const holdStarted = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    let lastUpdate = 0;
    const tick = (now: number) => {
      const pads = navigator.getGamepads?.();
      const pad = pads ? Array.from(pads).find((item) => item?.connected) : null;
      const buttons = pad ? Array.from(pad.buttons, (button) => button.pressed || button.value > 0.5) : [];
      if (now - lastUpdate > 33) {
        setSnapshot(pad ? {name: pad.id, axes: Array.from(pad.axes), buttons} : null);
        lastUpdate = now;
      }
      const combo = Boolean(buttons[4] && buttons[5] && buttons[9]);
      const holding = combo || escHeld.current;
      if (holding) {
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

  const stick = (title: string, x: number, y: number) => (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3"><p className="mb-2 text-xs font-semibold text-zinc-200">{title}</p><div className="relative mx-auto h-28 w-28 rounded-full border border-white/20 bg-white/[0.03]"><span className="absolute left-1/2 top-0 h-full border-l border-white/10"/><span className="absolute top-1/2 left-0 w-full border-t border-white/10"/><span className="absolute h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" style={{left: `${((x + 1) / 2) * 100}%`, top: `${((y + 1) / 2) * 100}%`, transform: 'translate(-50%, -50%)'}}/></div><p className="mt-2 text-center font-mono text-[10px] text-zinc-400">X {x.toFixed(2)} · Y {y.toFixed(2)}</p></div>
  );

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="controller-test-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-400/40 bg-[#111116] p-5 text-white shadow-2xl sm:p-7">
    <header className="flex items-center gap-3"><Gamepad2 className="h-7 w-7 text-cyan-300"/><div><h2 id="controller-test-title" className="text-xl font-bold">Testar Controle</h2><p className="text-xs text-zinc-400">{snapshot?.name ?? 'Aguardando controle…'}</p></div></header>
    <div className="my-5 rounded-xl border-2 border-amber-400 bg-amber-400/10 p-4 text-center"><p className="text-sm font-extrabold text-amber-200">Segure L1 + R1 + Start (ou segure Esc por 2s) para sair do teste</p><div className="mt-3 h-3 overflow-hidden rounded-full bg-black/60"><div className="h-full rounded-full bg-amber-300 transition-[width] duration-75" style={{width: `${progress}%`}}/></div><p className="mt-1 text-[11px] text-amber-100/70">Mantenha pressionado até a barra completar</p></div>
    {!snapshot ? <div className="rounded-xl border border-white/10 p-6 text-center text-sm text-zinc-400">Conecte o controle e pressione qualquer botão para começar.</div> : <>
      <div className="grid grid-cols-2 gap-3">{stick('Analógico esquerdo', snapshot.axes[0] ?? 0, snapshot.axes[1] ?? 0)}{stick('Analógico direito', snapshot.axes[2] ?? 0, snapshot.axes[3] ?? 0)}</div>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">{(BUTTON_LABELS[layout] ?? BUTTON_LABELS.xbox).map((label, index) => <div key={`${label}-${index}`} className={`rounded-lg border p-2 text-center text-xs font-bold transition-colors ${snapshot.buttons[index] ? 'border-cyan-300 bg-cyan-400 text-black shadow-[0_0_12px_#22d3ee]' : 'border-white/10 bg-black/30 text-zinc-400'}`}>{label}</div>)}</div>
    </>}
    <aside className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-300">Para usar funções mais avançadas (overlay flutuante em tempo real, conversão de ícones para PlayStation, bateria e diagnóstico completo), acesse o <a href="https://github.com/RbtSwift/Pad2PS/releases/latest" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline">Pad2PS Oficial</a>.</aside>
  </section></div>;
}
