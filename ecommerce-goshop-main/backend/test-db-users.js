const { getPool } = require("./src/config/database");

async function main() {
  const pool = await getPool();
  const result = await pool.request().query(
    "SELECT u.Id, u.Email, u.FullName, u.RoleId, r.Name AS RoleName FROM Users u JOIN Roles r ON u.RoleId = r.Id"
  );
  console.log("Users in database:");
  result.recordset.forEach((u) =>
    console.log(
      `  ID=${u.Id}, Email=${u.Email}, Name=${u.FullName}, Role=${u.RoleName}`
    )
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});