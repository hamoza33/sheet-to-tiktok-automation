import paramiko
import time

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

commands = [
    # Clear processed rows tracking
    "rm -f ~/sheet-to-tiktok-automation/processed-rows.json",
    # Full stop and restart from ecosystem file
    "cd ~/sheet-to-tiktok-automation && pm2 delete sheet-to-tiktok && pm2 start ecosystem.config.cjs",
    "sleep 3",
    # Verify env is correct
    "pm2 env 0 | grep BUFFER_ACCESS",
    "pm2 list",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)
print("Connected!\n")

for cmd in commands:
    print(f">>> {cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(f"  {out.strip()[:300]}")
    if err.strip() and 'WARN' not in err:
        print(f"  ERR: {err.strip()[:200]}")
    print()

# Wait for poll
print("Waiting 70 seconds for poll cycle...")
time.sleep(70)

# Check results
stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 10 --nostream", timeout=15)
print("\n>>> LOGS:")
print(stdout.read().decode().strip())

client.close()
print("\n=== DONE ===")
