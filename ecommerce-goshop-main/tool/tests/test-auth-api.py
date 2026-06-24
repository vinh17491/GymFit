import json, subprocess, sys

def go():
    with open("C:/Users/vinh/t.txt", encoding="utf-8") as f:
        tkn = f.read().strip()
    print(f"|token|={len(tkn)} chars")

    base = "http://localhost:3000"
    ah = "Authorization: Bearer " + tkn

    def test(path, method="GET", data=None):
        cmd = ["curl", "-s", "--max-time", "5"]
        if method == "POST":
            cmd += ["-X", "POST", "-H", "Content-Type: application/json", "-d", json.dumps(data) if data else "{}"]
        cmd += ["-H", ah]
        if method == "GET":
            cmd += ["-w", "\nHTTP:%{http_code}"]
        cmd.append(base + path)
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout, r.stderr

    tests = [
        ("/auth/me", "GET"),
        ("/membership/my", "GET"),
        ("/membership/purchase", "POST", {"planId": 1}),
        ("/checkout/create-order", "POST", {"addressId": 1, "note": "test"}),
        ("/credits/balance", "GET"),
        ("/logbook/member-logs", "GET"),
    ]

    for args in tests:
        path = args[0]
        method = args[1]
        data = args[2] if len(args) > 2 else None
        stdout, stderr = test(path, method, data)
        code = [l for l in stdout.split('\n') if l.startswith('HTTP:')]
        code_str = code[0] if code else '--'
        body = stdout.replace('\n' + code_str, '') if code else stdout
        print(f"\n=== {method} {path} === {code_str}")
        print(body[:300])

go()
