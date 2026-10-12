import { openApiSpec } from "../src/lib/openapi-spec";
import fs from "fs";
import path from "path";

fs.writeFileSync(
  path.join(process.cwd(), "public", "openapi.json"),
  JSON.stringify(openApiSpec, null, 2)
);
console.log("Successfully wrote public/openapi.json");
