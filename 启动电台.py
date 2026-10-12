# 一键启动前端开发服务器，启动后在终端打印本机与局域网访问地址
# vite.config.js 已设 host: true，无需额外参数即监听局域网
import re
import shutil
import socket
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "前端"
TITLE_MARK = "沉浸式电台"


def lan_ip():
    # 借一次 UDP 连接让系统选出本机出口地址，不会真正发包
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def already_running():
    # 5173 上若已是本项目在服务，则直接复用，不再重复启动
    try:
        with urllib.request.urlopen("http://127.0.0.1:5173/", timeout=2) as r:
            return TITLE_MARK in r.read().decode("utf-8", "ignore")
    except OSError:
        return False


def print_addresses(port, note=""):
    line = "-" * 46
    print(f"\n{line}")
    print(f"开发服务器已就绪 {note}")
    print(f"  本机访问：   http://127.0.0.1:{port}")
    print(f"  局域网访问： http://{lan_ip()}:{port}")
    print(f"{line}\n")


def main():
    # 行缓冲保证重定向输出时也能实时看到 Vite 日志；特殊字符不至于让脚本中断
    sys.stdout.reconfigure(line_buffering=True, errors="backslashreplace")

    if already_running():
        print_addresses(5173, "（已在运行，直接复用）")
        return

    if not (FRONTEND / "node_modules").is_dir():
        print("缺少依赖：请先在 前端/ 目录执行 npm install")
        sys.exit(1)

    npm = shutil.which("npm") or "npm.cmd"
    try:
        proc = subprocess.Popen(
            [npm, "run", "dev"],
            cwd=FRONTEND,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        print("未找到 npm，请确认 Node.js 已安装并在 PATH 中")
        sys.exit(1)

    printed = False
    try:
        while True:
            line = proc.stdout.readline()
            if not line:
                break
            print(line, end="")
            # 从 Vite 打印的 Local 行取实际端口，防止端口被占后自动顺延
            if not printed:
                m = re.search(r"Local:.*?:(\d+)", line)
                if m:
                    printed = True
                    print_addresses(m.group(1))
        proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if proc.poll() is None:
            # 连同子进程整树结束，避免 vite 残留继续占用端口
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                capture_output=True,
            )
        print("开发服务器已停止")


if __name__ == "__main__":
    main()
