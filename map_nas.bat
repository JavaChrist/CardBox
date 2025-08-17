@echo off
REM === Paramètres ===
set "NAS=192.168.1.82"
set "USER=Christian"
set "PASS=Superviseur67"

REM === Ajouter/mettre à jour les identifiants NAS dans le Gestionnaire d’identifiants ===
REM (Évite de mettre le mot de passe en clair dans les commandes net use)
cmdkey /add:%NAS% /user:%USER% /pass:%PASS% >nul 2>&1

REM === Nettoyage des anciens mappings (ignore erreurs) ===
for %%D in (Z: Y: X:) do (
  net use %%D /delete /y >nul 2>&1
)

REM === Connexions persistantes ===
net use Z: \\%NAS%\MySafeBoxData /persistent:yes
net use Y: \\%NAS%\web           /persistent:yes
net use X: \\%NAS%\web_packages  /persistent:yes

echo.
echo [OK] Lecteurs mappes : Z: MySafeBoxData, Y: web, X: web_packages
exit /b 0
