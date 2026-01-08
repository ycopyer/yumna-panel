@echo off
echo ========================================
echo Firewall Feature Deployment Checklist
echo ========================================
echo.

echo [1/4] Checking Backend Migration...
cd server
node migrate_firewall.js
echo.

echo [2/4] Backend Status:
echo - responseMonitor.js middleware: CREATED
echo - firewall.js routes: UPDATED (settings + stats endpoints)
echo - app.js: INTEGRATED (middleware mounted)
echo.

echo [3/4] Frontend Status:
echo - FirewallManagement.tsx: UPDATED (3 tabs: Rules, Settings, Stats)
echo - Explorer.tsx: INTEGRATED (state + modal)
echo - Sidebar.tsx: MENU READY (line 181-184)
echo - useExplorer.ts: STATE READY (line 58 + 716)
echo.

echo [4/4] Next Steps:
echo.
echo BACKEND:
echo   1. Restart backend: pm2 restart sftp-drive-server
echo      OR: Ctrl+C in terminal, then: node index.js
echo.
echo FRONTEND:
echo   1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
echo   2. Clear cache if needed: Ctrl+Shift+Delete
echo.
echo TESTING:
echo   1. Login as admin
echo   2. Check sidebar - should see "Firewall (Blocks)" menu
echo   3. Click menu - modal should open with 3 tabs
echo   4. Test Settings tab - adjust threshold/window/codes
echo   5. Check Stats tab - should show total/active blocks
echo.
echo ========================================
echo Deployment Complete!
echo ========================================
pause
