pkgname=pad2ps-launcher-bin
pkgver=1.0.19
pkgrel=1
pkgdesc='Console-style game launcher for Linux with full gamepad navigation'
arch=('x86_64')
url='https://github.com/RbtSwift/Pad2PS-Launcher'
license=('MIT')
depends=(
  'alsa-lib'
  'at-spi2-core'
  'gtk3'
  'libnotify'
  'libxss'
  'nss'
  'xdg-utils'
)
source=(
  "Pad2PS-Launcher-${pkgver}-x86_64.tar.gz::https://github.com/RbtSwift/Pad2PS-Launcher/releases/download/v${pkgver}/Pad2PS-Launcher-${pkgver}-x86_64.tar.gz"
)
sha256sums=('2df034b3301504fb7283c868a6ae3860ce5a1431747fbf2fe52ccfbe63499532')

package() {
  install -d "$pkgdir/opt/Pad2PS-Launcher"
  cp -a linux-unpacked/. "$pkgdir/opt/Pad2PS-Launcher/"
  install -Dm755 pad2ps-launcher-bin.sh "$pkgdir/usr/bin/pad2ps-launcher"
  install -Dm644 pad2ps-launcher.desktop "$pkgdir/usr/share/applications/pad2ps-launcher.desktop"
  install -Dm644 icon-256.png "$pkgdir/usr/share/icons/hicolor/256x256/apps/io.github.rbtswift.Pad2PSLauncher.png"
  install -Dm644 icon.png "$pkgdir/usr/share/icons/hicolor/512x512/apps/io.github.rbtswift.Pad2PSLauncher.png"
  install -Dm644 io.github.rbtswift.Pad2PSLauncher.metainfo.xml "$pkgdir/usr/share/metainfo/io.github.rbtswift.Pad2PSLauncher.metainfo.xml"
}
