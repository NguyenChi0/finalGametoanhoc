const fs = require("fs");

/** numerator / 10^denomPow -> chuoi VN */
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

const meta = {
  difficulty: "easy",
  tags: [],
  hierarchy: {
    gradeId: 5,
    gradeName: "L\u1edbp 5",
    subjectId: 6,
    subjectName: "To\u00e1n 5",
    topicId: 84,
    topicTitle: "Ph\u00e9p chia s\u1ed1 th\u1eadp ph\u00e2n",
    subtopicId: 460,
    subtopicTitle: "Chia s\u1ed1 th\u1eadp ph\u00e2n cho s\u1ed1 t\u1ef1 nhi\u00ean",
  },
};

/** Giong mau id 3689: 8 dong trong sau dau cham */
const promptTail = ".........\n\n\n\n\n\n\n\n";

const divisors = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 2,
  3, 4, 5, 6, 7, 8, 9, 10, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

const rows = [];
for (let i = 0; i < 40; i++) {
  const d = BigInt(divisors[i]);
  const qCent = 127n + BigInt(i * 211) % 8873n;
  const dividendCent = qCent * d;
  const dividendStr = formatVn(dividendCent, 2);
  const divisorStr = formatVn(d, 0);
  const options = buildOptions(qCent, 2);
  const prompt =
    "Ch\u1ecdn \u0111\u00e1p \u00e1n \u0111\u00fang \u0111\u1ec3 \u0111i\u1ec1n v\u00e0o ch\u1ed7 ch\u1ea5m. K\u1ebft qu\u1ea3 c\u1ee7a " +
    dividendStr +
    " : " +
    divisorStr +
    " b\u1eb1ng " +
    promptTail;
  const obj = {
    version: 1,
    kind: "mcq_single",
    prompt,
    media: [],
    detail: { options, shuffle: true },
    questionTitle: "Th\u1ef1c hi\u1ec7n b\u00e0i to\u00e1n sau:",
    scoring: { full_points: 1, partial_points: 0, penalty: 0 },
    meta,
  };
  const json = JSON.stringify(obj);
  const forSql = json.replace(/\\/g, "\\\\").replace(/'/g, "''");
  rows.push(
    "('Th\u1ef1c hi\u1ec7n b\u00e0i to\u00e1n sau:', NULL, '" +
      forSql +
      "', 460, 1, NOW(), NOW())"
  );
}

const sql =
  "INSERT INTO questions (question_title, question_image, question_detail, sub_topic_id, question_type_id, created_at, updated_at) VALUES\n" +
  rows.join(",\n") +
  ";\n";

const outPath = "D:\\gametoanhoc-vite\\tmp_insert_40_questions_div_460.sql";
fs.writeFileSync(outPath, sql, "utf8");
console.log("Wrote " + outPath);
