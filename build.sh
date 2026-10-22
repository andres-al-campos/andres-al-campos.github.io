#!/bin/bash
# build.sh - Open the portfolio, or check it.
#
#   ./build.sh          Open the site in the default browser. It's static, so no
#                       server is needed; GitHub Pages serves main as it is.
#   ./build.sh check    Run every law in laws/ (rules a bug once broke).

set -e
cd "$(dirname "$0")"

case "${1:-open}" in
    open)
        if command -v open >/dev/null; then open index.html
        elif command -v xdg-open >/dev/null; then xdg-open index.html
        else echo "❌ No 'open' or 'xdg-open' here. Open index.html in a browser by hand."; exit 1
        fi
        ;;
    check)
        failed=0
        for law in laws/*.mjs; do node "$law" || failed=1; done
        [ "$failed" = 0 ] || { echo "❌ A law failed. Each message above says what broke and how to fix it."; exit 1; }
        echo "✅ All laws hold."
        ;;
    *)
        echo "❌ Unknown option '$1'. Use: ./build.sh (open the site) or ./build.sh check"
        exit 1
        ;;
esac
