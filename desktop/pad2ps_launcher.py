import os
import json
import time
import shlex
import shutil
import threading
import subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from scanner_jogos import build_full_library

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
DATA_DIR = Path.home() / ".local" / "share" / "pad2ps-launcher"
DATA_DIR.mkdir(parents=True, exist_ok=True)
LIBRARY_CACHE = DATA_DIR / "biblioteca.json"
PROFILE_DIR = DATA_DIR / "browser-profile"
PROFILE_DIR.mkdir(parents=True, exist_ok=True)



AUTOSTART_FILE = Path.home() / ".config" / "autostart" / "pad2ps-launcher.desktop"


def resolve_launch_exec() -> str:
    """Detecta como o Pad2PS Launcher está instalado/executado no Linux do usuário."""
    if os.environ.get("APPIMAGE"):
        return f'"{os.environ["APPIMAGE"]}"'
    if os.environ.get("FLATPAK_ID"):
        return f'flatpak run {os.environ["FLATPAK_ID"]}'
    system_bin = shutil.which("pad2ps-launcher")
    if system_bin:
        return f'"{system_bin}"'
    electron_bin = BASE_DIR / "node_modules" / ".bin" / "electron"
    electron_main = BASE_DIR / "electron-main.cjs"
    if electron_bin.exists() and electron_main.exists():
        return f'"{electron_bin}" "{electron_main}"'
    return f'"{Path(__file__).resolve()}"'


def get_autostart_enabled() -> bool:
    return AUTOSTART_FILE.exists()


def set_autostart_enabled(enabled: bool) -> bool:
    if enabled:
        AUTOSTART_FILE.parent.mkdir(parents=True, exist_ok=True)
        exec_cmd = resolve_launch_exec()
        desktop_entry = (
            "[Desktop Entry]\n"
            "Type=Application\n"
            "Name=Pad2PS Launcher\n"
            "Comment=Console-style Game Launcher for Linux\n"
            f"Exec={exec_cmd}\n"
            "Icon=pad2ps-launcher\n"
            "Terminal=false\n"
            "Categories=Game;\n"
            "X-GNOME-Autostart-enabled=true\n"
            "X-GNOME-Autostart-Delay=2\n"
        )
        AUTOSTART_FILE.write_text(desktop_entry, encoding="utf-8")
        return True
    else:
        if AUTOSTART_FILE.exists():
            AUTOSTART_FILE.unlink()
        return False



def get_connected_devices_battery() -> list[dict]:
    """Lê bateria de gamepads e headsets Bluetooth/Wireless via /sys/class/power_supply e upower."""
    devices = []
    seen_names = set()

    # 1) /sys/class/power_supply (DualSense, DualShock 4, Xbox, Switch Pro, GameSir, 8BitDo, etc.)
    ps_root = Path("/sys/class/power_supply")
    if ps_root.exists():
        for entry in ps_root.iterdir():
            try:
                cap_file = entry / "capacity"
                if not cap_file.exists():
                    continue
                scope = (entry / "scope").read_text(encoding="utf-8").strip().lower() if (entry / "scope").exists() else ""
                ps_type = (entry / "type").read_text(encoding="utf-8").strip().lower() if (entry / "type").exists() else ""
                name_raw = entry.name.lower()

                # Ignora bateria interna do notebook (BAT0 / scope == System)
                if scope == "system" or name_raw.startswith(("bat", "ac", "acad", "usb")):
                    if "sony_controller" not in name_raw and "ps-controller" not in name_raw and "xbox" not in name_raw and "nintendo" not in name_raw:
                        continue

                capacity = int(cap_file.read_text(encoding="utf-8").strip())
                status = (entry / "status").read_text(encoding="utf-8").strip() if (entry / "status").exists() else ""
                model = (entry / "model_name").read_text(encoding="utf-8").strip() if (entry / "model_name").exists() else entry.name

                is_headset = any(k in (model + " " + name_raw).lower() for k in ("headset", "headphone", "audio", "buds", "airpods", "wh-", "wf-", "jbl", "hyperx", "logitech g", "razer", "corsair", "steelseries"))
                dev_type = "headset" if is_headset else "gamepad"

                clean_name = model.replace("_", " ").strip()
                if "sony_controller" in name_raw or "ps-controller" in name_raw:
                    clean_name = "Controle PlayStation"
                elif "xbox" in name_raw or "xpad" in name_raw:
                    clean_name = "Controle Xbox / PC"
                elif "nintendo" in name_raw:
                    clean_name = "Controle Nintendo"

                key = f"{dev_type}:{clean_name.lower()}"
                if key not in seen_names:
                    seen_names.add(key)
                    devices.append({
                        "name": clean_name,
                        "type": dev_type,
                        "percentage": max(0, min(100, capacity)),
                        "charging": status.lower() == "charging",
                    })
            except Exception:
                continue

    # 2) upower -d (captura headsets Bluetooth, fones TWS e controles reportados via BlueZ)
    upower_bin = shutil.which("upower")
    if upower_bin:
        try:
            out = subprocess.check_output([upower_bin, "-d"], text=True, timeout=2, stderr=subprocess.DEVNULL)
            blocks = out.split("Device: ")
            for blk in blocks[1:]:
                lines = [l.strip() for l in blk.splitlines() if l.strip()]
                header = lines[0].lower() if lines else ""
                if "line_power" in header or "battery_bat" in header or "displaydevice" in header:
                    continue

                model = ""
                native_path = ""
                percentage = None
                charging = False
                is_headset = "headset" in header or "headphones" in header or "audio" in header
                is_gamepad = "gaming" in header or "joystick" in header or "controller" in header

                for line in lines[1:]:
                    if line.startswith("model:"):
                        model = line.split(":", 1)[1].strip()
                    elif line.startswith("native-path:"):
                        native_path = line.split(":", 1)[1].strip().lower()
                    elif line.startswith("percentage:"):
                        val = line.split(":", 1)[1].strip().rstrip("%")
                        if val.isdigit():
                            percentage = int(val)
                    elif line.startswith("state:"):
                        charging = "charging" in line.split(":", 1)[1].lower() and "discharging" not in line.split(":", 1)[1].lower()

                if percentage is None:
                    continue

                combined = f"{header} {model} {native_path}".lower()
                if any(k in combined for k in ("headset", "headphone", "earbud", "buds", "airpods", "wh-", "wf-", "jbl", "qcy", "edifier", "anker", "soundcore", "hyperx", "arctis", "cloud")):
                    is_headset = True
                elif any(k in combined for k in ("gamepad", "joystick", "controller", "dualsense", "dualshock", "xbox", "gamesir", "8bitdo", "pro controller", "joy-con")):
                    is_gamepad = True
                elif "bluez" in native_path:
                    # Dispositivo Bluetooth genérico não-mouse/teclado assume headset se não tiver mouse/keyboard no nome
                    if not any(k in combined for k in ("mouse", "keyboard", "teclado", "trackpad")):
                        is_headset = True

                if not (is_headset or is_gamepad):
                    continue

                dev_type = "headset" if is_headset else "gamepad"
                clean_name = model or ("Headset Bluetooth" if dev_type == "headset" else "Controle Bluetooth")
                key = f"{dev_type}:{clean_name.lower()}"
                if key not in seen_names:
                    seen_names.add(key)
                    devices.append({
                        "name": clean_name,
                        "type": dev_type,
                        "percentage": max(0, min(100, percentage)),
                        "charging": charging,
                    })
        except Exception:
            pass

    return devices


def run_game_process(game_id: str, command: str):
    start_time = time.time()
    try:
        if "://" in command and not command.startswith("xdg-open"):
            proc = subprocess.Popen(["xdg-open", command])
        else:
            args = shlex.split(command)
            proc = subprocess.Popen(args)
        proc.wait()
    except Exception as exc:
        print(f"[Pad2PS] Erro ao iniciar '{command}': {exc}")
    finally:
        elapsed_hours = round((time.time() - start_time) / 3600.0, 2)
        if elapsed_hours > 0.01 and LIBRARY_CACHE.exists():
            try:
                games = json.loads(LIBRARY_CACHE.read_text(encoding="utf-8"))
                for g in games:
                    if g.get("id") == game_id:
                        g["hoursPlayed"] = round(float(g.get("hoursPlayed", 0)) + elapsed_hours, 1)
                        g["lastPlayed"] = "Agora"
                LIBRARY_CACHE.write_text(json.dumps(games, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception:
                pass


class Pad2PSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def log_message(self, format, *args):
        pass

    def _send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/api/games":
            games = build_full_library(LIBRARY_CACHE)
            self._send_json({"games": games})
            return
        if self.path == "/api/autostart":
            self._send_json({"enabled": get_autostart_enabled()})
            return
        if self.path == "/api/devices":
            self._send_json({"devices": get_connected_devices_battery()})
            return
        super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if self.path == "/api/launch":
            game_id = payload.get("id", "")
            command = payload.get("command", "")
            if command:
                threading.Thread(target=run_game_process, args=(game_id, command), daemon=True).start()
                self._send_json({"ok": True})
            else:
                self._send_json({"ok": False, "error": "Comando vazio"}, status=400)
            return

        if self.path == "/api/autostart":
            enabled = bool(payload.get("enabled", False))
            state = set_autostart_enabled(enabled)
            self._send_json({"ok": True, "enabled": state})
            return

        if self.path == "/api/save":
            games = payload.get("games")
            if isinstance(games, list):
                LIBRARY_CACHE.write_text(json.dumps(games, indent=2, ensure_ascii=False), encoding="utf-8")
            self._send_json({"ok": True})
            return

        self._send_json({"ok": False}, status=404)


def find_app_browser() -> str | None:
    candidates = [
        "opera",
        "opera-developer",
        "brave-browser",
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "microsoft-edge",
        "vivaldi",
    ]
    for name in candidates:
        found = shutil.which(name)
        if found:
            return found
    return None


def main():
    if not (DIST_DIR / "index.html").exists():
        subprocess.run(["npm", "run", "build"], cwd=str(BASE_DIR), check=True)

    print("[Pad2PS] Escaneando Steam, Heroic, Lutris e discos montados...")
    initial_games = build_full_library(LIBRARY_CACHE)
    print(f"[Pad2PS] {len(initial_games)} jogos encontrados!")

    import sys
    forced_port = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--headless" else 0
    server = ThreadingHTTPServer(("127.0.0.1", forced_port), Pad2PSRequestHandler)
    port = server.server_address[1]
    if "--headless" in sys.argv:
        server.serve_forever()
        return
    threading.Thread(target=server.serve_forever, daemon=True).start()

    url = f"http://127.0.0.1:{port}/index.html"
    browser = find_app_browser()

    if browser:
        print(f"[Pad2PS] Abrindo console em tela cheia ({Path(browser).name})...")
        proc = subprocess.Popen([
            browser,
            f"--app={url}",
            f"--user-data-dir={PROFILE_DIR}",
            "--start-fullscreen",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-session-crashed-bubble",
        ])
        proc.wait()
    else:
        import webbrowser
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
