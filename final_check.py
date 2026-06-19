import paramiko
import time

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

# Force clear and restart fresh
commands = [
    "rm -f ~/sheet-to-tiktok-automation/processed-rows.json",
    "cd ~/sheet-to-tiktok-automation && pm2 delete sheet-to-tiktok 2>/dev/null; pm2 start ecosystem.config.cjs",
]

for cmd in commands:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    stdout.read()

print("Restarted. Waiting 65s...")
time.sleep(65)

# Check result
stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 8 --nostream", timeout=15)
logs = stdout.read().decode().strip()
print(logs)

print("\n---")
stdin, stdout, stderr = client.exec_command("cat ~/sheet-to-tiktok-automation/processed-rows.json 2>/dev/null || echo 'EMPTY'", timeout=5)
print("Processed:", stdout.read().decode().strip())

if "Successfully scheduled post" in logs:
    print("\n🎉 SUCCESS!")
elif "Failed to schedule" in logs:
    for line in logs.split('\n'):
        if 'Failed to schedule' in line or 'error' in line.lower():
            # Find error message
            import json
            try:
                idx = line.index('{')
                data = json.loads(line[idx:])
                print(f"\n❌ Error: {data.get('context', {}).get('error', 'unknown')[:200]}")
            except:
                print(f"\n❌ {line[-200:]}")
            break
else:
    print("\n⏳ No post attempt in logs yet")

client.close()
