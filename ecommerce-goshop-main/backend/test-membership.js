const http = require("http");

function request(method, path, data, token) {
  return new Promise((resolve) => {
    const dataStr = data ? JSON.stringify(data) : null;
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) options.headers["Authorization"] = "Bearer " + token;
    if (dataStr) options.headers["Content-Length"] = Buffer.byteLength(dataStr);

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on("error", (e) => resolve({ status: 0, body: e.message }));
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function main() {
  console.log("=== Test Membership APIs ===\n");

  const testEmail = "testmember_" + Date.now() + "@test.com";

  // 1. Register a new MEMBER user
  console.log("1. POST /auth/register (new member)");
  let res = await request("POST", "/auth/register", {
    email: testEmail,
    password: "test123!",
    fullName: "Test Member",
  });
  console.log("   Status:", res.status, res.status === 201 ? "PASS" : "FAIL");
  const memberToken = res.body?.accessToken;
  console.log("   Token:", memberToken ? "PASS" : "FAIL");

  // 2. GET /membership/plans - Public
  console.log("\n2. GET /membership/plans");
  res = await request("GET", "/membership/plans");
  console.log("   Status:", res.status, res.status === 200 ? "PASS" : "FAIL");
  if (Array.isArray(res.body)) console.log("   Plans count:", res.body.length);

  // 3. GET /membership/plans/1 - Public
  console.log("\n3. GET /membership/plans/1");
  res = await request("GET", "/membership/plans/1");
  console.log("   Status:", res.status, res.status === 200 ? "PASS" : "FAIL");
  if (res.body?.Name) console.log("   Plan name:", res.body.Name);

  // 4. GET /membership/my - Auth required
  console.log("\n4. GET /membership/my");
  if (memberToken) {
    res = await request("GET", "/membership/my", null, memberToken);
    console.log("   Status:", res.status, "Body:", JSON.stringify(res.body));
  }

  // 5. GET /membership/history - Auth required
  console.log("\n5. GET /membership/history");
  if (memberToken) {
    res = await request("GET", "/membership/history", null, memberToken);
    console.log(
      "   Status:",
      res.status,
      "Count:",
      Array.isArray(res.body) ? res.body.length : "N/A"
    );
  }

  // 6. POST /membership/purchase - MEMBER only
  console.log("\n6. POST /membership/purchase (planId=2 - has Stripe price)");
  if (memberToken) {
    res = await request("POST", "/membership/purchase", { planId: 2 }, memberToken);
    console.log("   Status:", res.status);
    if (res.body?.sessionId) console.log("   sessionId:", res.body.sessionId, "PASS");
    else if (res.body?.message) console.log("   Message:", res.body.message);
    else console.log("   Body:", JSON.stringify(res.body));
  }

  // 7. POST /membership/purchase again (should fail - already active or pending)
  console.log("\n7. POST /membership/purchase (again - should fail)");
  if (memberToken) {
    res = await request("POST", "/membership/purchase", { planId: 1 }, memberToken);
    console.log("   Status:", res.status);
    console.log("   Body:", JSON.stringify(res.body));
  }

  // 8. POST /membership/:id/cancel
  console.log("\n8. POST /membership/:id/cancel");
  if (memberToken) {
    res = await request("GET", "/membership/my", null, memberToken);
    if (res.body?.Id) {
      const cancelRes = await request("POST", "/membership/" + res.body.Id + "/cancel", null, memberToken);
      console.log("   Status:", cancelRes.status, "Body:", JSON.stringify(cancelRes.body));
    } else {
      console.log("   Skip - no active membership to cancel");
    }
  }

  // 9. Admin endpoints - need an admin token
  console.log("\n9. Admin endpoints check");
  // Register as admin (or try to login as admin) - registration always creates MEMBER
  // For admin endpoints, the test will depend on having admin credentials
  // We can try to access without admin to verify role guard works
  if (memberToken) {
    res = await request("POST", "/membership/admin/plans", {
      Name: "Test Plan",
      DurationDays: 30,
      Price: 99000,
    }, memberToken);
    console.log("   POST /membership/admin/plans (as member):", res.status, res.status === 403 ? "PASS (forbidden)" : "UNEXPECTED");
  }

  // 10. Admin login via hardcoded credentials
  console.log("\n10. POST /auth/login (try admin)");
  res = await request("POST", "/auth/login", {
    email: "admin@gymfit.com",
    password: "admin123",
  });
  console.log("   Status:", res.status, res.status === 200 ? "PASS" : "FAIL (unknown credentials)");
  const adminToken = res.body?.accessToken;
  if (adminToken) {
    res = await request("GET", "/membership/admin/memberships", null, adminToken);
    console.log("   GET /membership/admin/memberships:", res.status, Array.isArray(res.body) ? "Count: " + res.body.length : JSON.stringify(res.body));
  }

  console.log("\n=== Test Complete ===");
}

main().catch(console.error);