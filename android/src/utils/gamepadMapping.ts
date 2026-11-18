import {
  GamepadButtonMapping,
  RemappableAction,
  ResolvedControllerLayout,
} from '../types';

export const BUTTON_MAPPING_STORAGE_KEY = 'pad2ps_launcher_button_map_v1';

export const DEFAULT_BUTTON_MAPPING: GamepadButtonMapping = {
  confirm: 0,
  cancel: 1,
  options: 2,
  favorite: 3,
  prevTab: 4,
  nextTab: 5,
  translator: 7,
};

export const REMAPPABLE_ACTIONS_META: {
  id: RemappableAction;
  label: string;
  description: string;
}[] = [
  {
    id: 'confirm',
    label: 'Confirmar / Jogar',
    description: 'Inicia o jogo selecionado ou ativa o item em foco.',
  },
  {
    id: 'cancel',
    label: 'Voltar',
    description: 'Fecha modais ou retorna para a navegação anterior.',
  },
  {
    id: 'options',
    label: 'Opções do Jogo',
    description: 'Abre menu para editar, favoritar ou buscar capa.',
  },
  {
    id: 'favorite',
    label: 'Favoritar / Aleatório',
    description: 'Sorteia um jogo aleatório na biblioteca atual.',
  },
  {
    id: 'prevTab',
    label: 'Aba Anterior',
    description: 'Alterna para a página anterior (Favoritos / Biblioteca).',
  },
  {
    id: 'nextTab',
    label: 'Próxima Aba',
    description: 'Alterna para a próxima página (Biblioteca / Sistema).',
  },
  {
    id: 'translator',
    label: 'Abrir Site Pad2PS',
    description: 'Abre o painel de acesso rápido ao Tradutor Pad2PS.',
  },
];

export function loadStoredButtonMapping(): GamepadButtonMapping {
  try {
    const raw = localStorage.getItem(BUTTON_MAPPING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BUTTON_MAPPING };
    const parsed = JSON.parse(raw) as Partial<GamepadButtonMapping>;
    return {
      confirm:
        typeof parsed.confirm === 'number'
          ? parsed.confirm
          : DEFAULT_BUTTON_MAPPING.confirm,
      cancel:
        typeof parsed.cancel === 'number'
          ? parsed.cancel
          : DEFAULT_BUTTON_MAPPING.cancel,
      options:
        typeof parsed.options === 'number'
          ? parsed.options
          : DEFAULT_BUTTON_MAPPING.options,
      favorite:
        typeof parsed.favorite === 'number'
          ? parsed.favorite
          : DEFAULT_BUTTON_MAPPING.favorite,
      prevTab:
        typeof parsed.prevTab === 'number'
          ? parsed.prevTab
          : DEFAULT_BUTTON_MAPPING.prevTab,
      nextTab:
        typeof parsed.nextTab === 'number'
          ? parsed.nextTab
          : DEFAULT_BUTTON_MAPPING.nextTab,
      translator:
        typeof parsed.translator === 'number'
          ? parsed.translator
          : DEFAULT_BUTTON_MAPPING.translator,
    };
  } catch {
    return { ...DEFAULT_BUTTON_MAPPING };
  }
}

export function saveStoredButtonMapping(mapping: GamepadButtonMapping): void {
  try {
    localStorage.setItem(BUTTON_MAPPING_STORAGE_KEY, JSON.stringify(mapping));
  } catch {
    // ignore storage errors
  }
}

export function formatGamepadButtonName(
  buttonIndex: number,
  layout: ResolvedControllerLayout
): string {
  const namesByLayout: Record<
    ResolvedControllerLayout,
    Record<number, string>
  > = {
    playstation: {
      0: 'Botão 0 (✕ Cruz)',
      1: 'Botão 1 (○ Círculo)',
      2: 'Botão 2 (□ Quadrado)',
      3: 'Botão 3 (△ Triângulo)',
      4: 'Botão 4 (L1)',
      5: 'Botão 5 (R1)',
      6: 'Botão 6 (L2)',
      7: 'Botão 7 (R2)',
      8: 'Botão 8 (Create / Share)',
      9: 'Botão 9 (Options)',
      10: 'Botão 10 (L3)',
      11: 'Botão 11 (R3)',
      16: 'Botão 16 (PS)',
    },
    xbox: {
      0: 'Botão 0 (A)',
      1: 'Botão 1 (B)',
      2: 'Botão 2 (X)',
      3: 'Botão 3 (Y)',
      4: 'Botão 4 (LB)',
      5: 'Botão 5 (RB)',
      6: 'Botão 6 (LT)',
      7: 'Botão 7 (RT)',
      8: 'Botão 8 (View)',
      9: 'Botão 9 (Menu)',
      10: 'Botão 10 (LS / L3)',
      11: 'Botão 11 (RS / R3)',
      16: 'Botão 16 (Xbox)',
    },
    nintendo: {
      0: 'Botão 0 (B)',
      1: 'Botão 1 (A)',
      2: 'Botão 2 (Y)',
      3: 'Botão 3 (X)',
      4: 'Botão 4 (L)',
      5: 'Botão 5 (R)',
      6: 'Botão 6 (ZL)',
      7: 'Botão 7 (ZR)',
      8: 'Botão 8 (-)',
      9: 'Botão 9 (+)',
      10: 'Botão 10 (L-Stick)',
      11: 'Botão 11 (R-Stick)',
      16: 'Botão 16 (Home)',
    },
  };

  return namesByLayout[layout][buttonIndex] ?? `Botão ${buttonIndex}`;
}
