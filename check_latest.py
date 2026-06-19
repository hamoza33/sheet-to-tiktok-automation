import paramiko

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

# Get latest 20 lines
stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 20 --nostream 2>&1 | tail -20", timeout=15)
print(stdout.read().decode().strip())

print("\n---")
stdin, stdout, stderr = client.exec_command("cat ~/sheet-to-tiktok-automation/processed-rows.json 2>/dev/null || echo 'EMPTY'", timeout=5)
print("Processed rows:", stdout.read().decode().strip())

print("\n---")
stdin, stdout, stderr = client.exec_command("cat ~/sheet-to-tiktok-automation/dashboard-activity.json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps(d[\"activities\"][:3], indent=2))' 2>/dev/null || echo 'NO ACTIVITY'", timeout=5)
print("Recent activity:", stdout.read().decode().strip())

client.close()
