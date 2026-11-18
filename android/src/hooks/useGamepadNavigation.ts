import { useEffect, useRef, useState } from 'react';
import {
  ControllerLayout,
  GamepadButtonMapping,
  ResolvedControllerLayout,
} from '../types';
import { DEFAULT_BUTTON_MAPPING } from '../utils/gamepadMapping';

export interface GamepadActions {
  buttonMapping?: GamepadButtonMapping;
  isCapturingButton?: boolean;
  isScreensaverActive?: boolean;
  onCaptureButton?: (buttonIndex: number) => void;
  onCaptureConflict?: (message: string) => void;
  onWakeScreensaver?: () => void;
  onGamepadActivity?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onConfirm?: () => void; // Mapped confirm (default 0) or Enter
  onCancel?: () => void; // Mapped cancel (default 1) or Esc
  onOptions?: () => void; // Mapped options (default 2)
  onFavorite?: () => void; // Mapped favorite/random (default 3)
  onPrevTab?: () => void; // Mapped prevTab (default 4)
  onNextTab?: () => void; // Mapped nextTab (default 5)
  onSettings?: () => void; // Start / Options / Menu / + (9)
  onSort?: () => void; // R3 (11) or S key
  onMenu?: () => void; // Guide / Home (16) or Tab key
  onSearch?: () => void; // '/' key
  onTranslator?: () => void; // Mapped translator (default 7) or T key
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
  return cleaned.length > 26
    ? `${cleaned.slice(0, 24)}…`
    : cleaned || 'Controle Conectado';
}

const DEADZONE = 0.35;
const INITIAL_REPEAT_DELAY = 340;
const REPEAT_INTERVAL = 135;
const DPAD_INDICES = new Set([12, 13, 14, 15]);

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

          // Protect against GameSir / 8BitDo firmware combos like Start+Select (8 + 9)
          const startAndSelectCombo = btnPressed(8) && btnPressed(9);

          if (actionsRef.current.isCapturingButton) {
            let capturedIdx: number | null = null;
            let conflictCombo = false;

            for (let i = 0; i < pad.buttons.length; i++) {
              const pressed = btnPressed(i);
              const wasPressed = prevButtonsRef.current[i] ?? false;
              prevButtonsRef.current[i] = pressed;

              if (pressed && !wasPressed && !DPAD_INDICES.has(i)) {
                if (startAndSelectCombo) {
                  conflictCombo = true;
                } else if (capturedIdx === null) {
                  capturedIdx = i;
                }
              }
            }

            if (conflictCombo) {
              actionsRef.current.onCaptureConflict?.(
                'Combo Start+Select ignorado para não conflitar com atalhos de firmware (GameSir/8BitDo).'
              );
            } else if (capturedIdx !== null) {
              actionsRef.current.onCaptureButton?.(capturedIdx);
            }
          } else if (actionsRef.current.isScreensaverActive) {
            let anyButtonEdge = false;
            for (let i = 0; i < pad.buttons.length; i++) {
              const pressed = btnPressed(i);
              const wasPressed = prevButtonsRef.current[i] ?? false;
              if (pressed && !wasPressed) {
                anyButtonEdge = true;
              }
              prevButtonsRef.current[i] = pressed;
            }

            if (anyButtonEdge && !startAndSelectCombo) {
              actionsRef.current.onWakeScreensaver?.();
            }
          } else {
            const axX = pad.axes[0] ?? 0;
            const axY = pad.axes[1] ?? 0;
            const axRX = pad.axes[2] ?? 0;
            const axRY = pad.axes[3] ?? 0;

            const isLeft = btnPressed(14) || axX < -DEADZONE;
            const isRight = btnPressed(15) || axX > DEADZONE;
            const isUp = btnPressed(12) || axY < -DEADZONE;
            const isDown = btnPressed(13) || axY > DEADZONE;

            const anyAxisMoved =
              Math.abs(axX) > DEADZONE ||
              Math.abs(axY) > DEADZONE ||
              Math.abs(axRX) > DEADZONE ||
              Math.abs(axRY) > DEADZONE;

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

            const mapping =
              actionsRef.current.buttonMapping ?? DEFAULT_BUTTON_MAPPING;

            const risingEdges = new Set<number>();
            for (let i = 0; i < pad.buttons.length; i++) {
              const pressed = btnPressed(i);
              const wasPressed = prevButtonsRef.current[i] ?? false;
              if (pressed && !wasPressed) {
                risingEdges.add(i);
              }
              prevButtonsRef.current[i] = pressed;
            }

            if (risingEdges.size > 0 || anyAxisMoved) {
              actionsRef.current.onGamepadActivity?.();
            }

            // Ignore Start+Select combo completely so firmware mode toggles don't trigger launcher actions
            if (!startAndSelectCombo) {
              if (risingEdges.has(mapping.confirm)) {
                actionsRef.current.onConfirm?.();
              } else if (risingEdges.has(mapping.cancel)) {
                actionsRef.current.onCancel?.();
              } else if (risingEdges.has(mapping.options)) {
                actionsRef.current.onOptions?.();
              } else if (risingEdges.has(mapping.favorite)) {
                actionsRef.current.onFavorite?.();
              } else if (risingEdges.has(mapping.prevTab)) {
                actionsRef.current.onPrevTab?.();
              } else if (risingEdges.has(mapping.nextTab)) {
                actionsRef.current.onNextTab?.();
              } else if (risingEdges.has(mapping.translator)) {
                actionsRef.current.onTranslator?.();
              } else if (risingEdges.has(9)) {
                actionsRef.current.onSettings?.();
              } else if (risingEdges.has(11)) {
                actionsRef.current.onSort?.();
              } else if (risingEdges.has(16)) {
                actionsRef.current.onMenu?.();
              }
            }
          }
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
      if (actionsRef.current.isScreensaverActive) {
        e.preventDefault();
        actionsRef.current.onWakeScreensaver?.();
        return;
      }

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
