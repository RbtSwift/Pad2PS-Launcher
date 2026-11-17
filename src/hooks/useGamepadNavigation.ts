import { useEffect, useRef, useState } from 'react';
import { ControllerLayout, ResolvedControllerLayout } from '../types';

export interface GamepadActions {
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onConfirm?: () => void; // Cross / A / B(Nintendo) (0) or Enter
  onCancel?: () => void; // Circle / B / A(Nintendo) (1) or Esc
  onOptions?: () => void; // Square / X / Y(Nintendo) (2)
  onFavorite?: () => void; // Triangle / Y / X(Nintendo) (3)
  onPrevTab?: () => void; // L1 / LB / L (4)
  onNextTab?: () => void; // R1 / RB / R (5)
  onSettings?: () => void; // Start / Options / Menu / + (9)
  onSort?: () => void; // R3 (11) or S key
  onMenu?: () => void; // Guide / Home (16) or Tab key
  onSearch?: () => void; // '/' key
  onTranslator?: () => void; // R2 / RT / ZR (7) or T key
}

export function detectGamepadLayout(rawId: string | null): ResolvedControllerLayout {
  if (!rawId) return 'xbox';
  const lower = rawId.toLowerCase();
  if (
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('playstation') ||
    lower.includes('054c')
  ) {
    return 'playstation';
  }
  if (
    lower.includes('nintendo') ||
    lower.includes('switch') ||
    lower.includes('joy-con') ||
    lower.includes('pro controller')
  ) {
    return 'nintendo';
  }
  return 'xbox';
}

export function resolveControllerLayout(
  preference: ControllerLayout,
  rawGamepadId: string | null
): ResolvedControllerLayout {
  if (preference === 'auto') {
    return detectGamepadLayout(rawGamepadId);
  }
  return preference;
}

function cleanGamepadName(rawId: string): string {
  if (!rawId) return 'Controle Conectado';
  const cleaned = rawId
    .replace(/\(STANDARD GAMEPAD.*?\)/gi, '')
    .replace(/\(Vendor:.*?\)/gi, '')
    .trim();
  if (/dualsense|054c.*0ce6/i.test(rawId)) return 'DualSense Wireless';
  if (/dualshock|054c/i.test(rawId)) return 'DualShock 4';
  if (/nintendo|switch|joy-con|pro controller/i.test(rawId))
    return 'Nintendo Controller';
  if (/xbox/i.test(rawId)) return 'Controle Xbox';
  if (/8bitdo/i.test(rawId)) return '8BitDo Controller';
  if (/gamesir/i.test(rawId)) return 'GameSir Controller';
  return cleaned.length > 26 ? `${cleaned.slice(0, 24)}…` : cleaned || 'Controle Conectado';
}

const DEADZONE = 0.35;
const INITIAL_REPEAT_DELAY = 340;
const REPEAT_INTERVAL = 135;

export function useGamepadNavigation(actions: GamepadActions) {
  const [connectedGamepad, setConnectedGamepad] = useState<string | null>(null);
  const [rawGamepadId, setRawGamepadId] = useState<string | null>(null);
  const actionsRef = useRef<GamepadActions>(actions);
  actionsRef.current = actions;

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
      setRawGamepadId(firstPad ? firstPad.id : null);
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

          const checkEdge = (idx: number, cb?: () => void) => {
            const pressed = btnPressed(idx);
            const wasPressed = prevButtonsRef.current[idx] ?? false;
            if (pressed && !wasPressed) {
              cb?.();
            }
            prevButtonsRef.current[idx] = pressed;
          };

          checkEdge(0, actionsRef.current.onConfirm);
          checkEdge(1, actionsRef.current.onCancel);
          checkEdge(2, actionsRef.current.onOptions);
          checkEdge(3, actionsRef.current.onFavorite);
          checkEdge(4, actionsRef.current.onPrevTab);
          checkEdge(5, actionsRef.current.onNextTab);
          checkEdge(7, actionsRef.current.onTranslator);
          checkEdge(9, actionsRef.current.onSettings);
          checkEdge(11, actionsRef.current.onSort);
          checkEdge(16, actionsRef.current.onMenu);
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
        case 'Tab':
          e.preventDefault();
          actionsRef.current.onMenu?.();
          break;
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
        case 's':
        case 'S':
          e.preventDefault();
          actionsRef.current.onSort?.();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          actionsRef.current.onTranslator?.();
          break;
        case '/':
          e.preventDefault();
          actionsRef.current.onSearch?.();
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

  return { connectedGamepad, rawGamepadId };
}
