const csv = require("fs").readFileSync("data/raw/Description_PROC.csv", "utf-8");
const lines = csv.split("\n").filter(l => l.trim());
const headers = lines[0].split(",");

function parseCSVLine(line) {
  const result = []; let current = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = ""; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
}

const row1 = parseCSVLine(lines[1]);
headers.forEach((h, i) => {
  const val = (row1[i] || "").substring(0, 200);
  console.log(`${h}: ${val}`);
});
