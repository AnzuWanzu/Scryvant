const fs = require("node:fs");
const path = require("node:path");
const failures = [];
function visit(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) visit(file);
    else if (file.endsWith(".ts") && !file.endsWith(".test.ts")) {
      const code = fs.readFileSync(file, "utf8");
      if (file.includes("/domain/") || file.includes("/application/")) {
        for (const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          if (
            /express|mongoose|nodemailer|jsonwebtoken|\/adapters\/|platform\/(mongo|http|composition)/.test(
              match[1],
            )
          )
            failures.push(`${file}: ${match[1]}`);
        }
      }
    }
  }
}
visit("backend/src/modules");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Domain and application dependency boundaries pass.");
