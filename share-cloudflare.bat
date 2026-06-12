@echo off
echo ========================================
echo   Sharing your localhost:3000
echo   Using Cloudflare Tunnel (FREE, NO PASSWORD)
echo ========================================
echo.
echo Starting tunnel...
echo You'll get a URL like: https://xxxxx.trycloudflare.com
echo Share that URL with your friend - NO PASSWORD NEEDED!
echo.
echo Press Ctrl+C to stop the tunnel when done.
echo.
npx --yes cloudflared tunnel --url http://localhost:3000

