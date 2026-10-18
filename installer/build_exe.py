"""
TRACES Toad for Oracle - Executable (.exe) Builder
Usa PyInstaller para compilar o inicializador em um executável autônomo.
"""
import os
import sys
import subprocess
import shutil

def build():
    print("==================================================================")
    print("  COMPILANDO TRACES TOAD FOR ORACLE EM .EXE NATIVO")
    print("==================================================================")

    # 1. Verificar PyInstaller
    try:
        import PyInstaller
    except ImportError:
        print("[INFO] Instalando PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # 2. Caminhos
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    icon_path = os.path.join(project_root, "assets", "traces.ico")
    launcher_py = os.path.join(script_dir, "launcher_wrapper.py")

    # 3. Criar launcher_wrapper.py
    with open(launcher_py, "w", encoding="utf-8") as f:
        f.write('''import os
import sys
import subprocess

def main():
    script_dir = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))
    ps1 = os.path.join(script_dir, "TracesLauncher.ps1")
    if not os.path.exists(ps1):
        # Fallback local
        ps1 = os.path.join(os.getcwd(), "TracesLauncher.ps1")
    
    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1]
    subprocess.call(cmd)

if __name__ == "__main__":
    main()
''')

    # 4. Compilar com PyInstaller
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--name=Traces-Toad-Launcher",
        f"--icon={icon_path}" if os.path.exists(icon_path) else "",
        "--clean",
        launcher_py
    ]
    cmd = [arg for arg in cmd if arg]
    print(f"[CMD] {' '.join(cmd)}")
    subprocess.check_call(cmd)

    dist_exe = os.path.join(os.getcwd(), "dist", "Traces-Toad-Launcher.exe")
    if os.path.exists(dist_exe):
        final_dest = os.path.join(project_root, "Traces-Toad-Launcher.exe")
        shutil.copy2(dist_exe, final_dest)
        print("==================================================================")
        print(f"  ✔ EXECUTÁVEL CRIADO COM SUCESSO:")
        print(f"  {final_dest}")
        print("==================================================================")

if __name__ == "__main__":
    build()
