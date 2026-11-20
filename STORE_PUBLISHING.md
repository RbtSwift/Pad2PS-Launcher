# Linux store publishing

The GitHub release workflow creates the Linux `.AppImage`, `.deb`, `.rpm`,
`.tar.gz`, and `.flatpak` assets. The separate `Publish Linux Stores` workflow
uses the versioned `.tar.gz` asset after a GitHub Release is published:

- **Snap Store:** add the exported Snapcraft login credentials as the repository
  Actions secret `SNAPCRAFT_STORE_CREDENTIALS`. The JSON must authorize uploads
  to the `pad2ps-launcher` snap. The workflow uploads the package to the
  `stable` channel; without this secret, the upload is skipped.
- **AUR:** add an SSH private key as the repository Actions secret
  `AUR_SSH_PRIVATE_KEY`. Its public key must belong to an AUR account with
  write access to `pad2ps-launcher-bin`. Register the package in the AUR once
  before enabling automated updates. Without this secret, the update is
  skipped.

Neither store credential is needed to build GitHub release artifacts.

## Flathub

Flathub has its own submission, review, and build pipeline; this repository
does not upload to Flathub. The checked-in `desktop/io.github.rbtswift.Pad2PSLauncher.yml`
is the local Flatpak-bundle recipe used by the release build and consumes the
locally built Electron payload. The root
`io.github.rbtswift.Pad2PSLauncher.yml` is the Flathub source-build manifest. It
pins the current app tag and Electron runtime, tracks stable GitHub releases
with `x-checker-data`, and vendors the npm sources in
`desktop/generated-sources.json` for offline builds.

Regenerate the npm sources after changing the desktop lockfile with
`flatpak-node-generator npm desktop/package-lock.json --output desktop/generated-sources.json`.
Flathub submission and review remain separate from publishing GitHub release
assets; the repository workflow deliberately does not submit or publish there.
