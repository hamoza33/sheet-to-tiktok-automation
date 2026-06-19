import paramiko

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

# Get the latest activity from the dashboard
stdin, stdout, stderr = client.exec_command("cat ~/sheet-to-tiktok-automation/dashboard-activity.json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); a=d.get(\"activities\",[]); print(f\"Total activities: {len(a)}\"); [print(f\"  [{x[\\\"status\\\"]}] Row {x[\\\"rowNumber\\\"]} - {x[\\\"details\\\"][:150]}\") for x in a[:3]]' 2>&1", timeout=10)
print(stdout.read().decode().strip())

print("\n---")
# Get pm2 logs from ONLY the current instance (filter by newest timestamps)
stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 5 --nostream 2>&1 | grep -v 'TAILING\\|error.log\\|^$'", timeout=10)
print("Latest PM2 logs:")
print(stdout.read().decode().strip())

client.close()
