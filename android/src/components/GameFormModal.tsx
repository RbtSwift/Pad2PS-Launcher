import React, { RefObject, useRef, useState } from "react";
import { ChevronDown, FolderSearch, Gamepad2, ImagePlus, Search, Upload, X } from "lucide-react";
import { Game, Platform } from "../types";
import { getAndroidAppIcon, isAndroidNative, listAndroidLaunchableApps } from "../utils/androidBridge";
import type { AndroidLaunchableApp } from "../utils/androidBridge";
import { resizeImageFileTo600x900 } from "../utils/coverSearch";
import { CancelButtonIcon } from "./ControllerIcons";
import { CoverFinderHandle, CoverFinderModal } from "./CoverFinderModal";

interface GameFormModalProps {
  initialGame?: Game | null;
  coverFinderRef?: RefObject<CoverFinderHandle | null>;
  isCoverFinderOpen?: boolean;
  onCoverFinderOpenChange?: (open: boolean) => void;
  onGoToApiSettings?: () => void;
  onSave: (game: Game) => void;
  onClose: () => void;
}

const PLATFORMS: Platform[] = ["Steam", "Epic", "Heroic", "GOG", "Xbox", "Lutris", "itch.io", "Emulador", "Outro"];
const CONSOLE_PRESETS = ["PS2", "PS1", "PSP", "Switch", "N64", "Xbox", "Wii U", "Dreamcast"];

export const GameFormModal: React.FC<GameFormModalProps> = ({
  initialGame, coverFinderRef, isCoverFinderOpen: controlledFinderOpen, onCoverFinderOpenChange, onGoToApiSettings, onSave, onClose,
}) => {
  const isEditing = Boolean(initialGame);
  const isAndroid = isAndroidNative();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialGame?.title ?? "");
  const [platform, setPlatform] = useState<Platform>(initialGame?.platform ?? "Outro");
  const [platformLabel, setPlatformLabel] = useState(initialGame?.platformLabel ?? "");
  const [consoleSystem, setConsoleSystem] = useState(initialGame?.consoleSystem ?? "");
  const [genre, setGenre] = useState(initialGame?.genre ?? "");
  const [hoursPlayed, setHoursPlayed] = useState(initialGame ? String(initialGame.hoursPlayed) : "0");
  const [coverUrl, setCoverUrl] = useState(initialGame?.coverUrl ?? "");
  const [command, setCommand] = useState(initialGame?.command ?? "");
  const [favorite, setFavorite] = useState(initialGame?.favorite ?? false);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialGame));
  const [errorMsg, setErrorMsg] = useState("");
  const [resizingCover, setResizingCover] = useState(false);
  const [internalFinderOpen, setInternalFinderOpen] = useState(false);
  const [androidAppPickerOpen, setAndroidAppPickerOpen] = useState(false);
  const [androidApps, setAndroidApps] = useState<AndroidLaunchableApp[]>([]);
  const [androidAppsLoading, setAndroidAppsLoading] = useState(false);
  const [androidAppSearch, setAndroidAppSearch] = useState("");
  const [androidAppPickerError, setAndroidAppPickerError] = useState("");

  const showCoverFinder = controlledFinderOpen ?? internalFinderOpen;
  const setShowCoverFinder = (open: boolean) => { setInternalFinderOpen(open); onCoverFinderOpenChange?.(open); };

  const handleOpenAndroidAppPicker = async () => {
    setAndroidAppPickerOpen(true);
    setAndroidAppSearch("");
    setAndroidAppsLoading(true);
    setAndroidAppPickerError("");
    setErrorMsg("");
    try {
      setAndroidApps(await listAndroidLaunchableApps());
    } catch {
      setAndroidAppPickerError("Não foi possível carregar os apps instalados neste aparelho.");
    } finally {
      setAndroidAppsLoading(false);
    }
  };

  const handleSelectAndroidApp = async (app: AndroidLaunchableApp) => {
    setTitle(app.title);
    setCommand(app.packageName);
    setPlatform("Outro");
    setPlatformLabel("Android");
    setGenre("Jogo Android");
    setErrorMsg("");
    setAndroidAppPickerOpen(false);
    try {
      const icon = await getAndroidAppIcon(app.packageName);
      if (icon) setCoverUrl(icon);
    } catch {
      // Mantém o app selecionado mesmo se o Android não fornecer seu ícone.
    }
  };

  const handlePickGameFile = async () => {
    try {
      const res = await fetch("/api/pick-game", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (!data.canceled && data.path) {
          setCommand(data.path);
          if (!title.trim() && data.title) setTitle(data.title);
          const ext = data.path.split(".").pop()?.toLowerCase() ?? "";
          if (["iso", "bin", "chd", "cso", "nsp", "xci", "z64", "n64", "gba", "sfc", "smc", "nds", "3ds"].includes(ext)) setPlatform("Emulador");
          setErrorMsg("");
          return;
        }
      }
    } catch {}
    setShowAdvanced(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setResizingCover(true);
      setCoverUrl(await resizeImageFileTo600x900(file));
      setErrorMsg("");
    } catch { setErrorMsg("Não foi possível processar a imagem selecionada."); }
    finally { setResizingCover(false); e.target.value = ""; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErrorMsg("Informe o nome do jogo."); return; }
    if (!command.trim()) {
      if (!isAndroid) setShowAdvanced(true);
      setErrorMsg(isAndroid ? "Selecione um app instalado no aparelho." : "Selecione o arquivo do jogo ou preencha o caminho em Configurações Avançadas.");
      return;
    }
    const id = initialGame?.id ?? (isAndroid ? `android-picked-app:${command.trim()}` : `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`);
    const trimmedConsole = consoleSystem.trim();
    onSave({
      id, title: title.trim(), platform,
      platformLabel: isAndroid ? "Android" : platformLabel.trim() || (platform === "Emulador" && trimmedConsole ? trimmedConsole : platform === "Outro" ? "PC" : platform),
      consoleSystem: trimmedConsole || undefined,
      coverUrl: coverUrl.trim(), command: command.trim(),
      hoursPlayed: Number(Math.max(0, Number.parseFloat(hoursPlayed) || 0).toFixed(1)),
      favorite, genre: isAndroid ? "Jogo Android" : genre.trim() || undefined, lastPlayed: initialGame?.lastPlayed ?? "Recente",
    });
  };

  return (
    <>
      <div className="android-game-form-overlay fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-4" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget && !showCoverFinder) onClose(); }}>
        <div className="android-game-form-panel theme-surface w-full max-w-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between gap-4 pb-3.5 mb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">{isEditing ? `Editar ${initialGame?.title}` : "Adicionar Jogo"}</h2>
            <button type="button" onClick={onClose} className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="android-game-form grid grid-cols-1 sm:grid-cols-[155px_1fr] gap-5">
            <div className="android-game-form-cover flex flex-col items-center gap-2">
              <div className="theme-control w-32 sm:w-full aspect-[2/3] overflow-hidden border flex items-center justify-center" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}>
                {coverUrl ? <img src={coverUrl} alt="Capa" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center text-center p-2 text-[var(--text-secondary)]"><ImagePlus className="w-7 h-7 mb-1 opacity-70" /><span className="text-[11px]">Sem Capa</span></div>}
              </div>
              <button type="button" onClick={() => setShowCoverFinder(true)} className="theme-control w-full flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold text-white cursor-pointer hover:brightness-110" style={{ backgroundColor: "var(--accent)", boxShadow: "var(--accent-glow)" }}>
                <Search className="w-3.5 h-3.5" /><span>Buscar Capa</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button type="button" disabled={resizingCover} onClick={() => fileInputRef.current?.click()} className="theme-control w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 border text-xs text-[var(--text-primary)] cursor-pointer" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}>
                <Upload className="w-3.5 h-3.5" /><span>{resizingCover ? "Otimizando..." : "Enviar Imagem"}</span>
              </button>
            </div>
            <div className="flex flex-col gap-3.5">
              {errorMsg && <div className="theme-control px-3 py-2 bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">{errorMsg}</div>}
              {isAndroid ? (
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={handleOpenAndroidAppPicker} className="theme-control w-full flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer" style={{ backgroundColor: "var(--bg-deep)", borderColor: command ? "var(--accent)" : "var(--border-subtle)" }}>
                    <Gamepad2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span>{command ? "Trocar app selecionado" : "1. Selecionar app instalado"}</span>
                  </button>
                  <p className="text-[11px] text-[var(--text-secondary)]">Escolha um app instalado no aparelho para adicioná-lo à biblioteca.</p>
                </div>
              ) : (
                <button type="button" onClick={handlePickGameFile} className="theme-control w-full flex items-center justify-center gap-2.5 px-4 py-3 border-2 border-dashed text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer" style={{ backgroundColor: "var(--bg-deep)", borderColor: command ? "var(--accent)" : "var(--border-subtle)" }}>
                  <FolderSearch className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span>{command ? "Arquivo Selecionado (Trocar)" : "1. Selecionar Arquivo ou Executável do Jogo"}</span>
                </button>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">2. Nome do Jogo *</label>
                <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setErrorMsg(""); }} placeholder="Ex: God of War II" className="theme-control w-full px-3.5 py-2 border text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">3. Categoria</label>
                  {isAndroid ? (
                    <div className="theme-control w-full px-3 py-2 border text-sm text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}>App Android</div>
                  ) : (
                    <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="theme-control w-full px-3 py-2 border text-sm text-[var(--text-primary)] focus:outline-none" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p === "Outro" ? "Jogo PC / Executável" : p}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer select-none">
                    <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="w-4 h-4 accent-[var(--accent)] rounded" />
                    <span>Marcar como favorito</span>
                  </label>
                </div>
              </div>
              {!isAndroid && <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-white/5 cursor-pointer">
                <span>Configurações Avançadas (caminho, console, horas)</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              </button>}
              {showAdvanced && !isAndroid && (
                <div className="flex flex-col gap-3 p-3 rounded-xl border" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Caminho ou Comando *</label>
                    <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="/caminho/para/jogo ou executável..." className="theme-control w-full px-3 py-1.5 border text-xs font-mono-tech text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Console / Sistema</label>
                      <input type="text" value={consoleSystem} onChange={(e) => setConsoleSystem(e.target.value)} placeholder="Ex: PS2, Switch" className="theme-control w-full px-3 py-1.5 border text-xs text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Horas Jogadas</label>
                      <input type="number" step="0.1" min="0" value={hoursPlayed} onChange={(e) => setHoursPlayed(e.target.value)} className="theme-control w-full px-3 py-1.5 border text-xs text-[var(--text-primary)]" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)" }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {CONSOLE_PRESETS.map((c) => <button key={c} type="button" onClick={() => { setPlatform("Emulador"); setConsoleSystem(c); }} className="px-2 py-0.5 rounded text-[10px] border border-white/15 text-[var(--text-secondary)] hover:text-white cursor-pointer">{c}</button>)}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t flex items-center justify-end gap-2.5" style={{ borderColor: "var(--border-subtle)" }}>
                <button type="button" onClick={onClose} className="theme-control inline-flex items-center gap-1.5 px-4 py-2 border text-xs font-medium text-[var(--text-primary)] cursor-pointer" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}><CancelButtonIcon className="w-4 h-4" /><span>Cancelar</span></button>
                <button type="submit" className="theme-control inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white cursor-pointer hover:brightness-110" style={{ backgroundColor: "var(--accent)", boxShadow: "var(--accent-glow)" }}><Gamepad2 className="w-4 h-4" /><span>{isEditing ? "Salvar" : "Adicionar"}</span></button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {androidAppPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" role="dialog" aria-modal="true" aria-label="Selecionar app instalado" onClick={(event) => { if (event.target === event.currentTarget) setAndroidAppPickerOpen(false); }}>
          <div className="theme-surface w-full max-w-xl max-h-[85vh] flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 pb-3 mb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">Escolher app instalado</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Selecione o jogo que deseja adicionar.</p>
              </div>
              <button type="button" onClick={() => setAndroidAppPickerOpen(false)} className="theme-control p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer" aria-label="Fechar seletor"><X className="w-5 h-5" /></button>
            </div>
            <label className="relative block mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input autoFocus type="search" value={androidAppSearch} onChange={(event) => setAndroidAppSearch(event.target.value)} placeholder="Buscar pelo nome do app" className="theme-control w-full pl-10 pr-3 py-2.5 border text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }} />
            </label>
            <div className="min-h-0 overflow-y-auto flex flex-col gap-2 pr-1" style={{ touchAction: "pan-y" }}>
              {androidAppsLoading ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Carregando apps instalados…</p> : androidApps.filter((app) => `${app.title} ${app.packageName}`.toLocaleLowerCase().includes(androidAppSearch.trim().toLocaleLowerCase())).map((app) => (
                <button key={app.packageName} type="button" onClick={() => void handleSelectAndroidApp(app)} className="theme-control flex items-center gap-3 p-3 text-left border text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer" style={{ backgroundColor: "var(--bg-deep)", borderColor: "var(--border-subtle)" }}>
                  <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-[var(--accent)] bg-white/5"><Gamepad2 className="w-5 h-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{app.title}</span><span className="block text-[10px] text-[var(--text-secondary)] font-mono-tech truncate">{app.packageName}</span></span>
                </button>
              ))}
              {!androidAppsLoading && androidAppPickerError && <p className="py-8 text-center text-sm text-rose-300">{androidAppPickerError}</p>}
              {!androidAppsLoading && !androidAppPickerError && androidApps.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Nenhum app com opção de abertura foi encontrado.</p>}
              {!androidAppsLoading && androidApps.length > 0 && !androidApps.some((app) => `${app.title} ${app.packageName}`.toLocaleLowerCase().includes(androidAppSearch.trim().toLocaleLowerCase())) && <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Nenhum app corresponde à busca.</p>}
            </div>
          </div>
        </div>
      )}
      {showCoverFinder && <CoverFinderModal ref={coverFinderRef} initialTitle={title} initialCommand={command} onSelectCover={(u) => { setCoverUrl(u); setShowCoverFinder(false); }} onGoToApiSettings={onGoToApiSettings ? () => { setShowCoverFinder(false); onGoToApiSettings(); } : undefined} onClose={() => setShowCoverFinder(false)} />}
    </>
  );
};
