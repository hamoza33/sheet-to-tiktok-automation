import paramiko
import time

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

commands = [
    "cd ~/sheet-to-tiktok-automation && git pull origin main",
    "cd ~/sheet-to-tiktok-automation && npm run build",
    "rm -f ~/sheet-to-tiktok-automation/processed-rows.json",
    "cd ~/sheet-to-tiktok-automation && pm2 delete sheet-to-tiktok && pm2 start ecosystem.config.cjs",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)
print("Connected!\n")

for cmd in commands:
    print(f">>> {cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    stdout.read()
    stderr.read()

print("Deployed. Waiting 70s for poll cycle...")
time.sleep(70)

stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 8 --nostream", timeout=15)
logs = stdout.read().decode().strip()
print("\n>>> LATEST LOGS:")
print(logs)

if "Successfully scheduled post" in logs:
    print("\n🎉 SUCCESS! Post was scheduled and sent via Buffer!")
elif "Cannot add to queue" in logs:
    print("\n❌ Still queue issue")
elif "Failed to schedule post" in logs:
    print("\n❌ Buffer still rejecting")
elif "processedRows\":1" in logs or "processedRows\":2" in logs:
    print("\n✅ Rows processed (check Buffer for the post)")
else:
    print("\n⏳ Check dashboard for status")

client.close()
