/**
 * Setup verification / smoke test.
 *
 * Runs the full registration -> approval -> login -> card-download flow
 * against your OWN MongoDB (the MONGO_URI in your .env). It creates
 * throwaway test records and cleans them up at the end, so it's safe to
 * run against a real (dev/staging) database.
 *
 * Usage:
 *   cp .env.example .env   # fill in a real MONGO_URI etc.
 *   npm install
 *   npm run test:e2e
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set. Copy .env.example to .env and fill it in first.");
  process.exit(1);
}

const { connectDB, disconnectDB } = await import("./src/config/db.js");
await connectDB();

const Admin = (await import("./src/models/Admin.js")).default;
const Zone = (await import("./src/models/Zone.js")).default;
const Coordinator = (await import("./src/models/Coordinator.js")).default;
const MembershipPlan = (await import("./src/models/MembershipPlan.js")).default;
const Member = (await import("./src/models/Member.js")).default;

const TEST_TAG = `e2e-${Date.now()}`;
const cleanupIds = { admins: [], zones: [], coordinators: [], plans: [], members: [] };

const admin = await Admin.create({
  name: "E2E Test Admin",
  email: `${TEST_TAG}@test.local`,
  password: "TestPass@12345",
  role: "super_admin",
});
cleanupIds.admins.push(admin._id);

const zone = await Zone.create({ name: `${TEST_TAG}-zone`, nameEnglish: "Test Zone" });
cleanupIds.zones.push(zone._id);

const coordinator = await Coordinator.create({ name: `${TEST_TAG}-coordinator`, zone: zone._id, phone: "9999999999" });
cleanupIds.coordinators.push(coordinator._id);

const plan = await MembershipPlan.create({ title: `${TEST_TAG}-plan`, price: 500, duration: 12 });
cleanupIds.plans.push(plan._id);

console.log("Seeded throwaway test data:", { admin: admin.email, zone: zone.name, coordinator: coordinator.name });

const { default: app } = await import("./src/app.js");
const http = await import("http");
const server = http.createServer(app);
const PORT = 5090; // avoid browser/undici "bad port" list (e.g. 5061 = SIP-TLS)
await new Promise((resolve) => server.listen(PORT, resolve));

const BASE = `http://localhost:${PORT}/api`;
let failures = 0;

const extractCookies = (res) => {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")];
  return raw.filter(Boolean).map((c) => c.split(";")[0]).join("; ");
};

const check = (label, cond, extra = "") => {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label} ${extra}`);
    failures += 1;
  }
};

try {
  console.log("\n[1] Admin login");
  let res = await fetch(`${BASE}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: admin.email, password: "TestPass@12345" }),
  });
  let json = await res.json();
  const adminCookies = extractCookies(res);
  check("status 200", res.status === 200, res.status);
  check("admin role in response", json.data?.admin?.role === "super_admin");
  check("access/refresh cookies set", adminCookies.includes("accessToken") && adminCookies.includes("refreshToken"));

  console.log("\n[2] Public member registration");
  res = await fetch(`${BASE}/public/members/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      zone: zone._id.toString(),
      nativePlace: "Test Native Place",
      coordinator: coordinator._id.toString(),
      workingCountry: "UAE",
      fullName: "E2E Test Applicant",
      phone: `+9715${Date.now().toString().slice(-8)}`,
      email: `${TEST_TAG}-applicant@test.local`,
      birthYear: 1990,
    }),
  });
  json = await res.json();
  check("status 201", res.status === 201, JSON.stringify(json));
  check("membershipId placeholder issued", json.data?.membershipId?.startsWith("PENDING-"), json.data?.membershipId);
  const applicationId = json.data?.applicationId;
  if (applicationId) cleanupIds.members.push(applicationId);

  console.log("\n[3] Admin views pending applications");
  res = await fetch(`${BASE}/members/pending`, { headers: { Cookie: adminCookies } });
  json = await res.json();
  check("status 200", res.status === 200, res.status);
  check("pending list contains applicant", json.data?.data?.some((m) => m._id === applicationId));

  console.log("\n[4] Admin approves application");
  res = await fetch(`${BASE}/members/${applicationId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookies },
    body: JSON.stringify({ membershipType: plan._id.toString() }),
  });
  json = await res.json();
  check("status 200", res.status === 200, JSON.stringify(json));
  check("real membership ID assigned", json.data?.member?.membershipId?.startsWith("GKAP-"), json.data?.member?.membershipId);
  check("temp password returned", !!json.data?.temporaryPassword);
  check("status active", json.data?.member?.membershipStatus === "active");
  const membershipId = json.data?.member?.membershipId;
  const tempPassword = json.data?.temporaryPassword;

  console.log("\n[5] Member login");
  res = await fetch(`${BASE}/auth/member/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ membershipId, password: tempPassword }),
  });
  json = await res.json();
  const memberCookies = extractCookies(res);
  check("status 200", res.status === 200, JSON.stringify(json));
  check("member data returned", json.data?.member?.fullName === "E2E Test Applicant");

  console.log("\n[6] GET /auth/me as member");
  res = await fetch(`${BASE}/auth/me`, { headers: { Cookie: memberCookies } });
  json = await res.json();
  check("status 200", res.status === 200, res.status);
  check("type is member", json.data?.type === "member");

  console.log("\n[7] Member downloads own card (QR + PDF render)");
  res = await fetch(`${BASE}/dashboard/card`, { headers: { Cookie: memberCookies } });
  const pdfBuf = Buffer.from(await res.arrayBuffer());
  check("status 200", res.status === 200, res.status);
  check("content-type is pdf", res.headers.get("content-type")?.includes("application/pdf"));
  check("pdf has %PDF header", pdfBuf.slice(0, 4).toString() === "%PDF");
  check("pdf size > 1KB", pdfBuf.length > 1024, pdfBuf.length);

  console.log("\n[8] Member adds a family member");
  res = await fetch(`${BASE}/dashboard/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: memberCookies },
    body: JSON.stringify({ name: "Test Spouse", relation: "spouse", gender: "female" }),
  });
  json = await res.json();
  check("status 201", res.status === 201, JSON.stringify(json));

  res = await fetch(`${BASE}/dashboard/family`, { headers: { Cookie: memberCookies } });
  json = await res.json();
  check("family list has 1 entry", json.data?.familyMembers?.length === 1);

  console.log("\n[9] Admin dashboard stats");
  res = await fetch(`${BASE}/members/stats`, { headers: { Cookie: adminCookies } });
  json = await res.json();
  check("status 200", res.status === 200, res.status);
  check("total >= 1", json.data?.total >= 1, json.data?.total);

  console.log("\n[10] Admin exports members to Excel");
  res = await fetch(`${BASE}/members/export`, { headers: { Cookie: adminCookies } });
  const xlsxBuf = Buffer.from(await res.arrayBuffer());
  check("status 200", res.status === 200, res.status);
  check("xlsx zip signature (PK)", xlsxBuf.slice(0, 2).toString() === "PK");

  console.log("\n[11] Member blocked from admin routes");
  res = await fetch(`${BASE}/members`, { headers: { Cookie: memberCookies } });
  check("status 403", res.status === 403, res.status);

  console.log("\n[12] Public zone & coordinator dropdown endpoints");
  res = await fetch(`${BASE}/public/zones`);
  json = await res.json();
  check("zones returned", json.data?.zones?.some((z) => z._id === zone._id.toString()));

  console.log("\n[13] Public membership verification by QR/membershipId");
  res = await fetch(`${BASE}/public/members/verify/${membershipId}`);
  json = await res.json();
  check("status 200", res.status === 200, res.status);
  check("correct member returned", json.data?.member?.membershipId === membershipId);
} finally {
  console.log("\nCleaning up test data...");
  await Admin.deleteMany({ _id: { $in: cleanupIds.admins } });
  await Zone.deleteMany({ _id: { $in: cleanupIds.zones } });
  await Coordinator.deleteMany({ _id: { $in: cleanupIds.coordinators } });
  await MembershipPlan.deleteMany({ _id: { $in: cleanupIds.plans } });
  await Member.deleteMany({ _id: { $in: cleanupIds.members } });

  server.close();
  await disconnectDB();
}

console.log(`\n${failures === 0 ? "ALL TESTS PASSED" : `${failures} TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
