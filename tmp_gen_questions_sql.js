const fs = require("fs");

/** numerator / 10^denomPow → chuỗi VN (dấu . nghìn, dấu , thập phân) */
function formatVn(numerator, denomPow) {
  let s = String(BigInt(numerator));
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  if (denomPow === 0) {
    const intWithDots = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-" : "") + intWithDots;
  }
  while (s.length <= denomPow) s = "0" + s;
  const intRaw = s.slice(0, -denomPow);
  const fracRaw = s.slice(-denomPow).replace(/0+$/, "") || "";
  const intPart = intRaw.replace(/^0+/, "") || "0";
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = fracRaw ? intWithDots + "," + fracRaw : intWithDots;
  return (neg ? "-" : "") + body;
}

function buildOptions(N, D) {
  const correctStr = formatVn(N, D);
  const candidates = [];
  const tryPush = (n, d) => {
    if (d < 0) return;
    const t = formatVn(n, d);
    if (t !== correctStr && !candidates.includes(t)) candidates.push(t);
  };
  tryPush(N * 10n, D);
  tryPush(N, D + 1);
  tryPush(N * 100n, D);
  if (D > 0) tryPush(N, D - 1);
  tryPush(N * 1000n, D);
  let k = 1n;
  while (candidates.length < 3) {
    tryPush(N + k, D);
    k += 1n;
  }
  const wrong = candidates.slice(0, 3);
  return [
    { id: "A", text: correctStr, correct: true },
    { id: "B", text: wrong[0], correct: false },
    { id: "C", text: wrong[1], correct: false },
    { id: "D", text: wrong[2], correct: false },
  ];
}

const mults = [
  ["0,1", 1],
  ["0,01", 2],
  ["0,001", 3],
];

const bases = [
  [1234, 5],
  [987, 6],
  [5432, 1],
  [1200, 8],
  [3456, 7],
  [888, 88],
  [7654, 3],
  [2109, 5],
  [4321, 9],
  [6000, 4],
  [3333, 3],
  [7777, 7],
  [1500, 25],
  [4820, 6],
  [9050, 2],
  [1111, 1],
  [2468, 2],
  [1357, 9],
  [8642, 4],
  [5005, 5],
  [2727, 27],
  [9090, 9],
  [4040, 4],
  [8181, 81],
  [6363, 63],
  [1212, 12],
  [4848, 48],
  [3030, 3],
  [7070, 7],
  [2525, 25],
  [3737, 37],
  [6262, 62],
  [1414, 14],
  [5858, 58],
  [6969, 69],
  [8080, 8],
  [9191, 91],
  [2323, 23],
  [4545, 45],
  [6767, 67],
];

const meta = {
  difficulty: "easy",
  tags: [],
  hierarchy: {
    gradeId: 5,
    gradeName: "Lớp 5",
    subjectId: 6,
    subjectName: "Toán 5",
    topicId: 83,
    topicTitle: "Phép nhân số thập phân",
    subtopicId: 457,
    subtopicTitle: "Nhân số thập phân với 0,1; 0,01; 0,001;...",
  },
};

const rows = [];
for (let i = 0; i < 40; i++) {
  const [bi, bd] = bases[i];
  const f = String(bd).length;
  const baseInt = BigInt(bi) * 10n ** BigInt(f) + BigInt(bd);
  const addPlaces = mults[i % 3][1];
  const D = f + addPlaces;
  const N = baseInt;
  const intPart = String(bi).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const baseStr = intPart + "," + bd;
  const mlabel = mults[i % 3][0];
  const options = buildOptions(N, D);
  const prompt =
    "Chọn đáp án đúng để điền vào chỗ chấm. Tính nhẩm: " +
    baseStr +
    " × " +
    mlabel +
    " = ..........\n\n\n\n\n";
  const obj = {
    version: 1,
    kind: "mcq_single",
    prompt,
    media: [],
    detail: { options, shuffle: true },
    questionTitle: "Thực hiện bài toán sau:",
    scoring: { full_points: 1, partial_points: 0, penalty: 0 },
    meta,
  };
  const json = JSON.stringify(obj);
  const forSql = json.replace(/\\/g, "\\\\").replace(/'/g, "''");
  rows.push(
    "('Thực hiện bài toán sau:', NULL, '" + forSql + "', 457, 1, NOW(), NOW())"
  );
}

const sql =
  "INSERT INTO questions (question_title, question_image, question_detail, sub_topic_id, question_type_id, created_at, updated_at) VALUES\n" +
  rows.join(",\n") +
  ";\n";

fs.writeFileSync("D:\\gametoanhoc-vite\\tmp_insert_40_questions.sql", sql, "utf8");
