#!/usr/bin/env python3
import re
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path


def plain_text(value: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"\*\*(.*?)\*\*", r"\1", value)
    return value.strip()


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "usage: generate-apt-changelog.py VERSION RELEASE_NOTES OUTPUT_PATH"
        )

    version, notes_path, output_path = sys.argv[1:]
    if not re.fullmatch(r"[0-9][A-Za-z0-9.+:~-]*", version):
        raise SystemExit(f"invalid Debian package version: {version}")

    converted_notes: list[str] = []
    for raw_line in Path(notes_path).read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("# "):
            continue
        if line.startswith("## "):
            converted_notes.append(f"  * {plain_text(line[3:])}")
        elif line.startswith("- "):
            converted_notes.append(f"    - {plain_text(line[2:])}")
        else:
            converted_notes.append(f"    {plain_text(line)}")

    if not converted_notes:
        raise SystemExit("release notes are empty")

    timestamp = format_datetime(datetime.now(timezone.utc))
    changelog = (
        f"pad2ps-launcher ({version}) stable; urgency=medium\n\n"
        + "\n".join(converted_notes)
        + f"\n\n -- Pad2PS Launcher <contato@pad2ps.com.br>  {timestamp}\n"
    )

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(changelog, encoding="utf-8")


if __name__ == "__main__":
    main()
