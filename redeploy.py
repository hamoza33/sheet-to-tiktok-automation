import paramiko, subprocess, sys

# First push locally
subprocess.run(["git", "add", "-A"], cwd=r"c:\Users\MSI\Desktop\kiro")
subprocess.run(["git", "commit", "-m", "fix: add root route to health server"], cwd=r"c:\Users\MSI\Desktop\kiro")
subprocess.run(["git", "push", "origin", "main"], cwd=r"c:\Users\MSI\Desktop\kiro")

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

commands = [
    "cd ~/sheet-to-tiktok-automation && git pull origin main",
    "cd ~/sheet-to-tiktok-automation && npm run build",
    "cd ~/sheet-to-tiktok-automation && pm2 restart sheet-to-tiktok --update-env",
    "sleep 2",
    "curl -s http://localhost:3000/ 2>&1",
    "curl -s http://localhost:3000/health 2>&1",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)
print("Connected to VPS!\n")

for cmd in commands:
    print(f">>> {cmd[:100]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(f"  {out.strip()[:300]}")
    if err.strip():
        print(f"  ERR: {err.strip()[:200]}")
    print()

client.close()
print("=== DONE ===")
