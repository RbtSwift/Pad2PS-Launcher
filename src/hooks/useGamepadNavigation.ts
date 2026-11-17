import { useEffect, useRef, useState } from 'react';

export interface GamepadActions {
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onConfirm?: () => void; // Cross / A (0) or Enter
  onCancel?: () => void; // Circle / B (1) or Esc
  onOptions?: () => void; // Square / X (2)
  onFavorite?: () => void; // Triangle / Y (3)
  onPrevTab?: () => void; // L1 (4)
  onNextTab?: () => void; // R1 (5)
  onSettings?: () => void; // Start / Options (9)
}

function cleanGamepadName(rawId: string): string {
  if (!rawId) return 'Controle Conectado';
  const cleaned = rawId
    .replace(/\(STANDARD GAMEPAD.*?\)/gi, '')
    .replace(/\(Vendor:.*?\)/gi, '')
    .trim();
  if (/dualsense|054c.*0ce6/i.test(rawId)) return 'DualSense Wireless';
  if (/dualshock|054c/i.test(rawId)) return 'DualShock 4';
  if (/xbox/i.test(rawId)) return 'Controle Xbox';
  if (/8bitdo/i.test(rawId)) return '8BitDo Controller';
  return cleaned.length > 26 ? `${cleaned.slice(0, 24)}…` : cleaned || 'Controle Conectado';
}

const DEADZONE = 0.35;
const INITIAL_REPEAT_DELAY = 340;
const REPEAT_INTERVAL = 135;

export function useGamepadNavigation(actions: GamepadActions) {
  const [connectedGamepad, setConnectedGamepad] = useState<string | null>(null);
  const actionsRef = useRef<GamepadActions>(actions);
  actionsRef.current = actions;

  // Track previous button states & directional repeat timers
  const prevButtonsRef = useRef<boolean[]>([]);
  const dirStateRef = useRef<{
    left: { active: boolean; nextRepeatAt: number };
    right: { active: boolean; nextRepeatAt: number };
    up: { active: boolean; nextRepeatAt: number };
    down: { active: boolean; nextRepeatAt: number };
  }>({
    left: { active: false, nextRepeatAt: 0 },
    right: { active: false, nextRepeatAt: 0 },
    up: { active: false, nextRepeatAt: 0 },
    down: { active: false, nextRepeatAt: 0 },
  });

  useEffect(() => {
    const syncGamepadLabel = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const firstPad = Array.from(pads).find((p) => p && p.connected);
      setConnectedGamepad(firstPad ? cleanGamepadName(firstPad.id) : null);
    };

    const handleConnect = () => syncGamepadLabel();
    const handleDisconnect = () => syncGamepadLabel();

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    syncGamepadLabel();

    let rafId = 0;

    const poll = (now: number) => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        const pad = Array.from(pads).find((p) => p && p.connected);

        if (pad) {
          const btnPressed = (idx: number) =>
            Boolean(pad.buttons[idx] && pad.buttons[idx].pressed);

          // Axes with 0.35 deadzone
          const axX = pad.axes[0] ?? 0;
          const axY = pad.axes[1] ?? 0;

          const isLeft = btnPressed(14) || axX < -DEADZONE;
          const isRight = btnPressed(15) || axX > DEADZONE;
          const isUp = btnPressed(12) || axY < -DEADZONE;
          const isDown = btnPressed(13) || axY > DEADZONE;

          const handleDir = (
            key: 'left' | 'right' | 'up' | 'down',
            active: boolean,
            cb?: () => void
          ) => {
            const state = dirStateRef.current[key];
            if (active) {
              if (!state.active) {
                state.active = true;
                state.nextRepeatAt = now + INITIAL_REPEAT_DELAY;
                cb?.();
              } else if (now >= state.nextRepeatAt) {
                state.nextRepeatAt = now + REPEAT_INTERVAL;
                cb?.();
              }
            } else {
              state.active = false;
            }
          };

          handleDir('left', isLeft, actionsRef.current.onLeft);
          handleDir('right', isRight, actionsRef.current.onRight);
          handleDir('up', isUp, actionsRef.current.onUp);
          handleDir('down', isDown, actionsRef.current.onDown);

          // Edge-triggered action buttons
          const checkEdge = (idx: number, cb?: () => void) => {
            const pressed = btnPressed(idx);
            const wasPressed = prevButtonsRef.current[idx] ?? false;
            if (pressed && !wasPressed) {
              cb?.();
            }
            prevButtonsRef.current[idx] = pressed;
          };

          checkEdge(0, actionsRef.current.onConfirm); // Cross / A
          checkEdge(1, actionsRef.current.onCancel); // Circle / B
          checkEdge(2, actionsRef.current.onOptions); // Square / X
          checkEdge(3, actionsRef.current.onFavorite); // Triangle / Y
          checkEdge(4, actionsRef.current.onPrevTab); // L1
          checkEdge(5, actionsRef.current.onNextTab); // R1
          checkEdge(9, actionsRef.current.onSettings); // Start / Options
        }
      }

      rafId = window.requestAnimationFrame(poll);
    };

    rafId = window.requestAnimationFrame(poll);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  // Keyboard navigation mirroring controller buttons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditing =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        actionsRef.current.onCancel?.();
        return;
      }

      if (isEditing) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          actionsRef.current.onLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          actionsRef.current.onRight?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          actionsRef.current.onUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          actionsRef.current.onDown?.();
          break;
        case 'Enter':
          // Allow native button activation if a specific button/link is focused inside a modal,
          // otherwise trigger confirm
          if (tag !== 'button' && tag !== 'a') {
            e.preventDefault();
            actionsRef.current.onConfirm?.();
          }
          break;
        case 'q':
        case 'Q':
        case '[':
          e.preventDefault();
          actionsRef.current.onPrevTab?.();
          break;
        case 'e':
        case 'E':
        case ']':
          e.preventDefault();
          actionsRef.current.onNextTab?.();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          actionsRef.current.onFavorite?.();
          break;
        case 'm':
        case 'M':
        case 'o':
        case 'O':
          e.preventDefault();
          actionsRef.current.onOptions?.();
          break;
        case 'F1':
        case ',':
          e.preventDefault();
          actionsRef.current.onSettings?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { connectedGamepad };
}
