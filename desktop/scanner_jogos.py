import os
import json
import sqlite3
from pathlib import Path

try:
    import vdf
except ImportError:
    vdf = None

HOME = Path.home()
USER = os.environ.get("USER", "")

ROM_SYSTEMS = {
    "PS2": {
        "folders": {"ps2", "pcsx2", "playstation 2", "playstation2"},
        "exts": {".iso", ".chd", ".gz", ".cso"},
        "cmd": 'pcsx2-qt -fullscreen "{rom}"',
        "label": "PCSX2 · PS2",
    },
    "PS1": {
        "folders": {"psx", "ps1", "duckstation", "playstation", "playstation 1"},
        "exts": {".chd", ".cue", ".pbp", ".m3u"},
        "cmd": 'duckstation-qt -fullscreen "{rom}"',
        "label": "DuckStation · PS1",
    },
    "PSP": {
        "folders": {"psp", "ppsspp"},
        "exts": {".iso", ".cso", ".chd"},
        "cmd": 'PPSSPPSDL --fullscreen "{rom}"',
        "label": "PPSSPP · PSP",
    },
    "Switch": {
        "folders": {"switch", "yuzu", "ryujinx", "eden", "sudachi"},
        "exts": {".nsp", ".xci"},
        "cmd": 'eden -f -g "{rom}"',
        "label": "Switch",
    },
    "N64": {
        "folders": {"n64", "nintendo 64", "nintendo64"},
        "exts": {".z64", ".n64", ".v64"},
        "cmd": 'mupen64plus --fullscreen "{rom}"',
        "label": "Nintendo 64",
    },
    "GameCube": {
        "folders": {"gc", "gamecube", "ngc"},
        "exts": {".rvz", ".iso", ".gcz"},
        "cmd": 'dolphin-emu -b -e "{rom}"',
        "label": "Dolphin · GameCube",
    },
    "Wii": {
        "folders": {"wii"},
        "exts": {".rvz", ".wbfs", ".iso"},
        "cmd": 'dolphin-emu -b -e "{rom}"',
        "label": "Dolphin · Wii",
    },
    "WiiU": {
        "folders": {"wiiu", "cemu"},
        "exts": {".wua", ".wux", ".rpx"},
        "cmd": 'cemu -f -g "{rom}"',
        "label": "Cemu · Wii U",
    },
    "Dreamcast": {
        "folders": {"dreamcast", "dc"},
        "exts": {".chd", ".cdi", ".gdi"},
        "cmd": 'flycast "{rom}"',
        "label": "Dreamcast",
    },
}


def get_mounted_drives() -> list[Path]:
    drives = [HOME]
    for base in [Path(f"/media/{USER}"), Path("/mnt"), Path("/run/media") / USER]:
        if base.exists() and base.is_dir():
            for entry in base.iterdir():
                if entry.is_dir() and os.access(entry, os.R_OK):
                    drives.append(entry)
    return drives


def scan_steam_games() -> list[dict]:
    games = []
    vdf_candidates = [
        HOME / ".local/share/Steam/steamapps/libraryfolders.vdf",
        HOME / ".steam/steam/steamapps/libraryfolders.vdf",
        HOME / ".var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/libraryfolders.vdf",
    ]

    library_paths = set()
    for vdf_file in vdf_candidates:
        if vdf_file.exists():
            library_paths.add(vdf_file.parent)
            if vdf:
                try:
                    data = vdf.load(open(vdf_file, encoding="utf-8", errors="ignore"))
                    folders = data.get("libraryfolders", {})
                    for _, info in folders.items():
                        if isinstance(info, dict) and "path" in info:
                            steamapps = Path(info["path"]) / "steamapps"
                            if steamapps.exists():
                                library_paths.add(steamapps)
                except Exception:
                    pass

    for drive in get_mounted_drives():
        for candidate in [drive / "Steam/steamapps", drive / "SteamLibrary/steamapps"]:
            if candidate.exists():
                library_paths.add(candidate)

    seen_ids = set()
    for steamapps in library_paths:
        for acf in steamapps.glob("appmanifest_*.acf"):
            try:
                appid = acf.stem.replace("appmanifest_", "")
                if appid in seen_ids or appid == "228980":
                    continue
                name = None
                if vdf:
                    parsed = vdf.load(open(acf, encoding="utf-8", errors="ignore"))
                    name = parsed.get("AppState", {}).get("name")
                else:
                    for line in acf.read_text(encoding="utf-8", errors="ignore").splitlines():
                        if '"name"' in line:
                            name = line.split('"')[3]
                            break

                if name and "Proton" not in name and "Steam Linux Runtime" not in name:
                    seen_ids.add(appid)
                    games.append({
                        "id": f"steam-{appid}",
                        "title": name,
                        "platform": "Steam",
                        "platformLabel": "Steam",
                        "coverUrl": f"https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900_2x.jpg",
                        "command": f"steam://rungameid/{appid}",
                        "hoursPlayed": 0,
                        "favorite": False,
                    })
            except Exception:
                continue

    return games


def scan_heroic_games() -> list[dict]:
    games = []
    heroic_configs = [
        HOME / ".config/heroic",
        HOME / ".var/app/com.heroicgameslauncher.hgl/config/heroic",
    ]

    for cfg in heroic_configs:
        epic_installed = cfg / "legendaryConfig/legendary/installed.json"
        if epic_installed.exists():
            try:
                data = json.loads(epic_installed.read_text(encoding="utf-8"))
                for app_name, info in data.items():
                    title = info.get("title") or app_name
                    games.append({
                        "id": f"heroic-epic-{app_name}",
                        "title": title,
                        "platform": "Heroic",
                        "platformLabel": "Heroic · Epic",
                        "coverUrl": "",
                        "command": f"xdg-open heroic://launch/legendary/{app_name}",
                        "hoursPlayed": 0,
                        "favorite": False,
                    })
            except Exception:
                pass

        gog_installed = cfg / "gog_store/installed.json"
        if gog_installed.exists():
            try:
                data = json.loads(gog_installed.read_text(encoding="utf-8"))
                for info in data.get("installed", []):
                    app_name = info.get("appName")
                    title = info.get("title") or app_name
                    if app_name:
                        games.append({
                            "id": f"heroic-gog-{app_name}",
                            "title": title,
                            "platform": "GOG",
                            "platformLabel": "Heroic · GOG",
                            "coverUrl": "",
                            "command": f"xdg-open heroic://launch/gog/{app_name}",
                            "hoursPlayed": 0,
                            "favorite": False,
                        })
            except Exception:
                pass

    return games


def scan_lutris_games() -> list[dict]:
    games = []
    db_candidates = [
        HOME / ".local/share/lutris/pga.db",
        HOME / ".var/app/net.lutris.Lutris/data/lutris/pga.db",
    ]
    for db_path in db_candidates:
        if not db_path.exists():
            continue
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, slug, runner FROM games WHERE installed = 1")
            for gid, name, slug, runner in cursor.fetchall():
                games.append({
                    "id": f"lutris-{gid}",
                    "title": name,
                    "platform": "Lutris",
                    "platformLabel": f"Lutris · {runner or 'PC'}",
                    "coverUrl": "",
                    "command": f"lutris lutris:rungameid/{gid}",
                    "hoursPlayed": 0,
                    "favorite": False,
                })
            conn.close()
        except Exception:
            pass
    return games


def scan_roms_across_drives() -> list[dict]:
    games = []
    drives = get_mounted_drives()
    rom_root_candidates = [
        "ROMs",
        "Roms",
        "roms",
        "Emuladores",
        "RetroDECK/retrodeck/roms",
        "retrodeck/roms",
        "Emulation/roms",
    ]

    for drive in drives:
        for rel_root in rom_root_candidates:
            rom_base = drive / rel_root
            if not rom_base.exists() or not rom_base.is_dir():
                continue

            for sys_folder in rom_base.iterdir():
                if not sys_folder.is_dir():
                    continue
                folder_lower = sys_folder.name.lower()
                matched_sys = None
                for sys_key, spec in ROM_SYSTEMS.items():
                    if folder_lower in spec["folders"]:
                        matched_sys = sys_key
                        break

                if not matched_sys:
                    continue

                spec = ROM_SYSTEMS[matched_sys]
                for file in sys_folder.rglob("*"):
                    if file.is_file() and file.suffix.lower() in spec["exts"]:
                        clean_title = file.stem.split("(")[0].strip()
                        games.append({
                            "id": f"emu-{matched_sys.lower()}-{file.stem}",
                            "title": clean_title,
                            "platform": "Emulador",
                            "consoleSystem": matched_sys,
                            "platformLabel": spec["label"],
                            "coverUrl": "",
                            "command": spec["cmd"].format(rom=str(file)),
                            "hoursPlayed": 0,
                            "favorite": False,
                        })
    return games


def build_full_library(cache_path: Path) -> list[dict]:
    existing_by_id = {}
    if cache_path.exists():
        try:
            old_list = json.loads(cache_path.read_text(encoding="utf-8"))
            for item in old_list:
                existing_by_id[item["id"]] = item
        except Exception:
            pass

    detected = (
        scan_steam_games()
        + scan_heroic_games()
        + scan_lutris_games()
        + scan_roms_across_drives()
    )

    merged = []
    seen = set()
    for game in detected:
        gid = game["id"]
        if gid in seen:
            continue
        seen.add(gid)
        if gid in existing_by_id:
            old = existing_by_id[gid]
            game["coverUrl"] = old.get("coverUrl") or game["coverUrl"]
            game["favorite"] = old.get("favorite", False)
            game["hoursPlayed"] = old.get("hoursPlayed", 0)
            game["lastPlayed"] = old.get("lastPlayed")
        merged.append(game)

    for gid, old in existing_by_id.items():
        if gid not in seen:
            merged.append(old)

    cache_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    return merged
