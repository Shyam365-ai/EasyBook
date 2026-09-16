@echo off
set "PATH=C:\Users\ADMIN\AppData\Local\Programs\MinGit\cmd;C:\Users\ADMIN\AppData\Local\Programs\MinGit\mingw64\bin;%PATH%"
cd /d "%~dp0"
echo ==============================================
echo   Pushing EasyBook to GitHub (Shyam365-ai)
echo ==============================================
echo.
git push -u origin main --force
echo.
if %ERRORLEVEL% equ 0 (
    echo ==============================================
    echo   SUCCESS! Upload completed.
    echo   Vercel will now automatically deploy your site!
    echo ==============================================
) else (
    echo [ERROR] Push failed. Please check your credentials or token.
)
pause
