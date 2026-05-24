import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getGrades,
  getTypes,
  getLessons,
  getQuestions,
  getLessonProgress,
  getLastLessonProgress,
  getCompletedLessonsForReview,
  questionImageUrl,
  typeImageUrl,
  lessonImageUrl,
  gradeImageUrl,
  externalLoginChild,
} from "../../api";
import {
  readPregamePayload,
  persistPregamePayload,
  persistReviewSession,
} from "../lib/playSession";
import {
  getKiloviaContext,
  setKiloviaContextFromMessage,
} from "../lib/kiloviaBridge";
import { publicUrl } from "../../lib/publicUrl";
import LessonStarRating from "../components/LessonStarRating";
import TopicCompleteTick from "../components/TopicCompleteTick";
import LessonReviewPanel from "../components/LessonReviewPanel";
import LessonSidebarSlot from "../components/LessonSidebarSlot";

function mapLessonProgressItems(items) {
  const m = {};
  if (!Array.isArray(items)) return m;
  for (const row of items) {
    if (row?.lessonId != null) {
      m[String(row.lessonId)] = row;
    }
  }
  return m;
}

/** Chủ đề hoàn thành khi mọi bài học đã có tiến độ (đã chơi xong ít nhất 1 lần). */
function isTopicFullyComplete(lessons, progressByLessonId) {
  const list = Array.isArray(lessons) ? lessons : [];
  if (list.length === 0) return false;
  return list.every((lesson) => progressByLessonId[String(lesson.id)] != null);
}

async function fetchLessonProgressForGrade(gradeId) {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  if (!token || gradeId == null) return {};
  try {
    const data = await getLessonProgress(gradeId);
    return mapLessonProgressItems(data?.items);
  } catch (err) {
    console.warn("Không tải được tiến độ bài học:", err);
    return {};
  }
}

async function fetchLastLessonSelection() {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;
  try {
    const progress = await getLastLessonProgress();
    if (
      !progress ||
      progress.lessonId == null ||
      progress.gradeId == null ||
      progress.typeId == null
    ) {
      return null;
    }
    return {
      gradeId: progress.gradeId,
      typeId: progress.typeId,
      lessonId: progress.lessonId,
    };
  } catch (err) {
    console.warn("Không tải được bài học gần nhất:", err);
    return null;
  }
}

const ALLOWED_KILOVIA_ORIGINS = [
  "https://kilovia.com",
  "http://localhost:3000",
  "http://localhost:5173",
  typeof window !== "undefined" ? window.location.origin : "",
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_KILOVIA_ORIGINS.some(
    (allowed) => origin === allowed || origin.endsWith(".kilovia.com")
  );
}

const PAGE_BG = `${publicUrl}/component-images/home-background.png`;
const TYPE_TOPIC_BG = `${publicUrl}/component-images/types-background.png`;

const LESSON_CHIP_BG_IMAGES = [
  `${publicUrl}/component-images/imgLessonType1.png`,
  `${publicUrl}/component-images/imgLessonType2.png`,
  `${publicUrl}/component-images/imgLessonType3.png`,
];

/** Mỗi bài một ảnh nền cố định (1 trong 3), trông ngẫu nhiên nhưng không đổi khi re-render. */
function lessonChipBackgroundUrl(lessonId) {
  const s = String(lessonId ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return LESSON_CHIP_BG_IMAGES[hash % LESSON_CHIP_BG_IMAGES.length];
}

function lessonDisplayImageUrl(lesson) {
  const custom = lesson?.image ? lessonImageUrl(lesson.image) : "";
  return custom || lessonChipBackgroundUrl(lesson?.id);
}

function typeDisplayImageUrl(typeRow) {
  return typeRow?.image ? typeImageUrl(typeRow.image) : "";
}

/** Bảng màu UI (periwinkle → sky → peach → pink → lavender) */
const CL = {
  periwinkle: "#6C7EE1",
  sky: "#92B9E3",
  peach: "#FFC4A4",
  pink: "#FBA2D0",
  lavender: "#C688EB",
  ink: "#4A5080",
  inkMuted: "#6B7099",
};

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GRADES_PER_ROW_DESKTOP = 6;
/** Kích thước cố định mỗi ô khối lớp (px) — desktop; mobile dùng metrics */
const GRADE_CHEVRON_WIDTH_PX = 156;
const GRADE_CHEVRON_HEIGHT_PX = 52;
/** Một hình cho mọi ô: trái lõm (khía tam giác), phải nhọn — nối chuỗi giống breadcrumb */
const GRADE_CHEVRON_CLIP =
  "polygon(14% 50%, 0% 0%, 86% 0%, 100% 50%, 86% 100%, 0% 100%)";

/** Cạnh hình vuông ô bài học trên bản đồ (px) — cố định, đổi một chỗ là đủ. */
const LESSON_CHIP_SIZE_PX = 200;

/** Đường kính vòng chủ đề desktop (px) — đổi một chỗ, layout tự tính bán kính. */
const TOPIC_CIRCLE_SIZE_PX = 260;
/** Nửa đường kính vòng chủ đề trong SVG (px) */
const SPINE_TOPIC_R = TOPIC_CIRCLE_SIZE_PX / 2;

/** Khoảng hở giữa đầu nét nhánh ngang và viền ô bài (px), không chạm border */
const SPINE_BRANCH_GAP_FROM_CHIP = 6;
/** Đỉnh đoạn spine hồng đầu tiên trong SVG hub (px): sát mép trên để nối cầu hồng, không để lộ trục xanh). */
const SPINE_FIRST_SEGMENT_HUB_TOP_Y = -2;

/** Độ dày line dọc nối các chủ đề (`.lesson-map-track::before`) — chỉnh ở đây. */
const SPINE_TOPIC_LINK_WIDTH_PX = 20;
const SPINE_TOPIC_LINK_WIDTH_MOBILE_PX = 10;

/** Hiệu ứng chủ đề khi scroll tới (ease-out). */
const TOPIC_REVEAL_DURATION_S = 0.52;
const TOPIC_SCROLL_REVEAL_THRESHOLD = 0.22;

/**
 * Trục + nhánh theo thứ tự vẽ từ chủ đề xuống: spine→branch cho từng bài.
 */
function buildSpineClusterSvgLines(layout, lessonCount) {
  const lines = [];
  const { spineX, points, lessonSize } = layout;
  if (!lessonCount || !points.length) return lines;
  const half = lessonSize / 2;
  const gap = SPINE_BRANCH_GAP_FROM_CHIP;
  const yFirstSpineStart = Math.min(
    points[0].cy - 8,
    SPINE_FIRST_SEGMENT_HUB_TOP_Y
  );

  const push = (variant, x1, y1, x2, y2) => {
    lines.push({
      variant,
      x1,
      y1,
      x2,
      y2,
      length: Math.max(1, Math.hypot(x2 - x1, y2 - y1)),
    });
  };

  for (let i = 0; i < lessonCount; i++) {
    if (i === 0) {
      push("spine", spineX, yFirstSpineStart, spineX, points[0].cy);
    } else {
      push("spine", spineX, points[i - 1].cy, spineX, points[i].cy);
    }
    const { cx, cy } = points[i];
    if (Math.abs(cx - spineX) >= 1) {
      if (cx < spineX) {
        push("branch", spineX, cy, cx + half + gap, cy);
      } else {
        push("branch", spineX, cy, cx - half - gap, cy);
      }
    }
  }

  return lines;
}

/** Chủ đề >10 bài: tăng tốc reveal để không chờ quá lâu (vd. 18 bài). */
function spineRevealSpeed(lessonCount) {
  if (lessonCount <= 10) return 1;
  return Math.min(3, 1 + (lessonCount - 10) * 0.2);
}

/** Thời lượng ease-out cho từng đoạn + thời điểm hiện từng ô bài (sau nhánh tới ô đó). */
function computeSpineDrawTiming(lines, lessonCount) {
  const speed = spineRevealSpeed(lessonCount);
  const PX = 420;
  const MIN_DUR = 0.1 / speed;
  const MAX_DUR = 0.48 / speed;
  let acc = 0.06 / speed;
  const timed = lines.map((ln) => {
    const dur = Math.min(
      MAX_DUR,
      Math.max(MIN_DUR, (ln.length / PX + 0.07) / speed)
    );
    const animStart = acc;
    acc += dur;
    return { ...ln, animStart, animDur: dur };
  });
  const chipDelays = [];
  let idx = 0;
  for (let i = 0; i < lessonCount; i++) {
    const spineEntry = timed[idx];
    if (!spineEntry) break;
    idx += 1;
    let end = spineEntry.animStart + spineEntry.animDur;
    if (idx < timed.length && timed[idx].variant === "branch") {
      const br = timed[idx];
      idx += 1;
      end = br.animStart + br.animDur;
    }
    chipDelays.push(end);
  }

  const chipFadeDur = lessonCount > 10 ? 0.22 : 0.36;
  if (lessonCount > 10) {
    const maxEnd = 2.4 + Math.min(lessonCount - 10, 14) * 0.06;
    const lastEnd = chipDelays[chipDelays.length - 1] ?? acc;
    if (lastEnd > maxEnd && lastEnd > 0) {
      const scale = maxEnd / lastEnd;
      return {
        timedLines: timed.map((ln) => ({
          ...ln,
          animStart: ln.animStart * scale,
          animDur: ln.animDur * scale,
        })),
        chipDelays: chipDelays.map((d) => d * scale),
        totalTime: acc * scale,
        chipFadeDur,
      };
    }
  }

  return { timedLines: timed, chipDelays, totalTime: acc, chipFadeDur };
}

function chunkArray(arr, size) {
  const chunks = [];
  const list = Array.isArray(arr) ? arr : [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

/** Khối mặc định khi vào trang: id=1, hoặc tên "Khối 1", hoặc khối nhỏ nhất theo id. */
function pickDefaultGradeId(grades) {
  const list = Array.isArray(grades) ? grades : [];
  if (!list.length) return null;
  const byId = list.find((g) => Number(g.id) === 1 || String(g.id) === "1");
  if (byId) return byId.id;
  const byName = list.find((g) => /khối\s*1\b/i.test(String(g.name || "")));
  if (byName) return byName.id;
  const sorted = [...list].sort((a, b) => Number(a.id) - Number(b.id));
  return sorted[0]?.id ?? null;
}

/** Bản đồ xương sống ziczac: mỗi bài một hàng, 0 trái — 1 phải — 2 trái — … */
const SPINE_CLUSTER_PAD_TOP = -140;
const SPINE_CLUSTER_PAD_BOTTOM = 22;
const SPINE_LESSON_GAP_BELOW_TYPE = 4;
/** Âm = các tâm bài gần nhau hơn chiều dọc (nhánh ngang trên trục dày đặc hơn); ô bài chồng nhẹ, z-index theo thứ tự */
const SPINE_LESSON_ROW_GAP = -60;
/** Khoảng từ trục tới tâm ô bài (px) — nhỏ hơn = ô + line ngang gần trục hơn */
const SPINE_LATERAL_OFFSET = 150;

/**
 * Thông số bố cục theo chiều ngang viewport (responsive).
 */
function getLessonMapMetrics(innerWidth) {
  const iw = typeof innerWidth === "number" ? innerWidth : 1024;
  const clusterMax = Math.min(1100, Math.max(280, iw - 16));
  if (iw <= 360) {
    return {
      gradesPerRow: 2,
      gradeChevronWidth: 92,
      gradeChevronHeight: 42,
      gradeOverlap: -10,
      gradeFontPx: 11,
      gradePadding: "8px 8px 8px 12px",
      lessonSize: 112,
      lateralOffset: 48,
      clusterPadTop: 8,
      clusterPadBottom: 14,
      lessonGapBelowType: 0,
      lessonRowGap: -44,
      topicLayoutR: 90,
      topicCssPx: 180,
      typeFontRem: 1.62,
      typeBorderPx: 5,
      clusterMaxWidth: clusterMax,
    };
  }
  if (iw <= 480) {
    return {
      gradesPerRow: 3,
      gradeChevronWidth: 110,
      gradeChevronHeight: 44,
      gradeOverlap: -11,
      gradeFontPx: 11.5,
      gradePadding: "8px 12px 8px 14px",
      lessonSize: 128,
      lateralOffset: 62,
      clusterPadTop: 8,
      clusterPadBottom: 16,
      lessonGapBelowType: 0,
      lessonRowGap: -48,
      topicLayoutR: 100,
      topicCssPx: 200,
      typeFontRem: 1.72,
      typeBorderPx: 5,
      clusterMaxWidth: clusterMax,
    };
  }
  if (iw <= 640) {
    return {
      gradesPerRow: 4,
      gradeChevronWidth: 128,
      gradeChevronHeight: 48,
      gradeOverlap: -14,
      gradeFontPx: 12,
      gradePadding: "9px 14px 9px 17px",
      lessonSize: 158,
      lateralOffset: 88,
      clusterPadTop: -40,
      clusterPadBottom: 18,
      lessonGapBelowType: 3,
      lessonRowGap: -54,
      topicLayoutR: 114,
      topicCssPx: 228,
      typeFontRem: 1.85,
      typeBorderPx: 6,
      clusterMaxWidth: clusterMax,
    };
  }
  if (iw <= 900) {
    return {
      gradesPerRow: 5,
      gradeChevronWidth: 142,
      gradeChevronHeight: 50,
      gradeOverlap: -16,
      gradeFontPx: 12,
      gradePadding: "10px 18px 10px 21px",
      lessonSize: 180,
      lateralOffset: 120,
      clusterPadTop: -90,
      clusterPadBottom: 20,
      lessonGapBelowType: 4,
      lessonRowGap: -56,
      topicLayoutR: 124,
      topicCssPx: 248,
      typeFontRem: 1.95,
      typeBorderPx: 7,
      clusterMaxWidth: clusterMax,
    };
  }
  return {
    gradesPerRow: GRADES_PER_ROW_DESKTOP,
    gradeChevronWidth: GRADE_CHEVRON_WIDTH_PX,
    gradeChevronHeight: GRADE_CHEVRON_HEIGHT_PX,
    gradeOverlap: -18,
    gradeFontPx: 13,
    gradePadding: "10px 20px 10px 24px",
    lessonSize: LESSON_CHIP_SIZE_PX,
    lateralOffset: SPINE_LATERAL_OFFSET,
    clusterPadTop: SPINE_CLUSTER_PAD_TOP,
    clusterPadBottom: SPINE_CLUSTER_PAD_BOTTOM,
    lessonGapBelowType: SPINE_LESSON_GAP_BELOW_TYPE,
    lessonRowGap: SPINE_LESSON_ROW_GAP,
    topicLayoutR: SPINE_TOPIC_R,
    topicCssPx: TOPIC_CIRCLE_SIZE_PX,
    typeFontRem: 2.1,
    typeBorderPx: 8,
    clusterMaxWidth: clusterMax,
  };
}

/**
 * Chủ đề trên trục; các bài xếp dọc, xen kẽ trái / phải (một bài mỗi mức).
 */
function getSpineClusterLayout(lessons, m) {
  const lessonCount = Array.isArray(lessons) ? lessons.length : 0;
  const lessonSize = m.lessonSize;
  const lateral = m.lateralOffset;
  const padTop = m.clusterPadTop;
  const padBottom = m.clusterPadBottom;
  const gapBelow = m.lessonGapBelowType;
  const rowGap = m.lessonRowGap;
  const topicR = m.topicLayoutR;
  const clusterW = Math.min(
    m.clusterMaxWidth,
    Math.max(260, Math.ceil(2 * (lateral + lessonSize / 2 + 14)))
  );
  const spineX = clusterW / 2;
  const topicCx = spineX;
  const topicCy = padTop + topicR;

  if (lessonCount <= 0) {
    const clusterH = padTop + topicR * 2 + 120 + padBottom;
    return {
      clusterW,
      clusterH,
      spineX,
      typeCx: topicCx,
      typeCy: topicCy,
      topicR,
      points: [],
      lessonSize,
    };
  }

  const points = [];
  for (let i = 0; i < lessonCount; i++) {
    const cy =
      topicCy +
      topicR +
      gapBelow +
      lessonSize / 2 +
      i * (lessonSize + rowGap);
    const cx =
      i % 2 === 0 ? spineX - lateral : spineX + lateral;
    points.push({ cx, cy });
  }

  const lastCenterY =
    topicCy +
    topicR +
    gapBelow +
    lessonSize / 2 +
    (lessonCount - 1) * (lessonSize + rowGap);
  const clusterH = lastCenterY + lessonSize / 2 + padBottom;

  return {
    clusterW,
    clusterH,
    spineX,
    typeCx: topicCx,
    typeCy: topicCy,
    topicR,
    points,
    lessonSize,
  };
}

/** DB: `/questions-images/...` — nối origin API để `<img src>` tải đúng. */
function withResolvedQuestionMedia(q) {
  if (!q || typeof q !== "object") return q;
  return {
    ...q,
    question_image: q.question_image
      ? questionImageUrl(q.question_image) || q.question_image
      : q.question_image,
    answers: Array.isArray(q.answers)
      ? q.answers.map((a) =>
          !a || typeof a !== "object"
            ? a
            : {
                ...a,
                image: a.image ? questionImageUrl(a.image) || a.image : a.image,
              }
        )
      : q.answers,
  };
}

function filterCurriculumRows(types, lessonsMap, query) {
  const list = Array.isArray(types) ? types : [];
  const q = String(query || "").trim().toLowerCase();
  if (!q) {
    return list.map((t) => ({
      type: t,
      lessons: [...(lessonsMap[t.id] || [])],
    }));
  }
  const rows = [];
  for (const t of list) {
    const lessons = [...(lessonsMap[t.id] || [])];
    const topicMatch = [t.id, t.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
    const matchedLessons = lessons.filter((l) =>
      [l.id, l.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
    if (topicMatch) {
      rows.push({ type: t, lessons });
    } else if (matchedLessons.length > 0) {
      rows.push({ type: t, lessons: matchedLessons });
    }
  }
  return rows;
}

function SummarySearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M20 20l-4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LessonCurriculumSummary({
  gradeName,
  types,
  lessonsMap,
  expandedTypeId,
  lastChosenLessonId,
  progressByLessonId,
  onTopicClick,
  onLessonClick,
  onCollapse,
}) {
  const list = Array.isArray(types) ? types : [];
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(
    () => filterCurriculumRows(list, lessonsMap, search),
    [list, lessonsMap, search]
  );
  const hasSearch = search.trim().length > 0;

  return (
    <aside
      id="lesson-curriculum-summary"
      className="lesson-curriculum-summary"
      aria-label="Tóm tắt chủ đề và bài học"
    >
      <div className="lesson-curriculum-summary__head">
        <h2 className="lesson-curriculum-summary__title">Tóm tắt</h2>
        <button
          type="button"
          className="lesson-curriculum-summary__collapse-btn"
          onClick={onCollapse}
          aria-label="Thu gọn tóm tắt"
          title="Thu gọn"
        >
          Thu gọn
        </button>
      </div>
      {gradeName ? (
        <p className="lesson-curriculum-summary__grade">{gradeName}</p>
      ) : null}
      {list.length === 0 ? (
        <p className="lesson-curriculum-summary__muted">Chưa có chủ đề cho khối này.</p>
      ) : (
        <>
          <form
            className="lesson-curriculum-summary__search"
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="search"
              className="lesson-curriculum-summary__search-input"
              placeholder="Tìm chủ đề hoặc bài học…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm trong danh sách chủ đề và bài học"
            />
            <button
              type="submit"
              className="lesson-curriculum-summary__search-btn"
              aria-label="Tìm kiếm"
              title="Tìm kiếm"
            >
              <SummarySearchIcon />
            </button>
            {hasSearch ? (
              <button
                type="button"
                className="lesson-curriculum-summary__search-clear"
                onClick={() => setSearch("")}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                ×
              </button>
            ) : null}
          </form>
          <div className="lesson-curriculum-summary__scroll">
            {filteredRows.length === 0 ? (
              <p className="lesson-curriculum-summary__muted">
                Không tìm thấy kết quả cho &ldquo;{search.trim()}&rdquo;.
              </p>
            ) : (
          <table className="lesson-curriculum-summary__table">
            <thead>
              <tr>
                <th scope="col">TT</th>
                <th scope="col">Chủ đề / Bài học</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ type: t, lessons }, topicIdx) => {
                const topicOpen =
                  expandedTypeId != null &&
                  String(expandedTypeId) === String(t.id);
                const topicComplete = isTopicFullyComplete(
                  lessons,
                  progressByLessonId
                );
                return (
                  <React.Fragment key={t.id}>
                    <tr
                      className={`lesson-curriculum-summary__topic${
                        topicOpen ? " is-open" : ""
                      }`}
                    >
                      <td>{topicIdx + 1}</td>
                      <td>
                        <button
                          type="button"
                          className="lesson-curriculum-summary__btn"
                          onClick={() => onTopicClick(t.id)}
                          aria-expanded={topicOpen}
                        >
                          <span className="lesson-curriculum-summary__topic-label">
                            <span>{t.name}</span>
                            {topicComplete ? (
                              <TopicCompleteTick
                                size="sm"
                                className="lesson-curriculum-summary__topic-tick"
                              />
                            ) : null}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {lessons.length === 0 ? (
                      <tr className="lesson-curriculum-summary__empty-row">
                        <td />
                        <td>
                          <span className="lesson-curriculum-summary__empty">
                            Chưa có bài học
                          </span>
                        </td>
                      </tr>
                    ) : (
                      lessons.map((lesson, lessonIdx) => {
                        const isLast =
                          lastChosenLessonId != null &&
                          String(lastChosenLessonId) === String(lesson.id);
                        return (
                          <tr
                            key={lesson.id}
                            className={`lesson-curriculum-summary__lesson${
                              isLast ? " is-last" : ""
                            }`}
                          >
                            <td>
                              {topicIdx + 1}.{lessonIdx + 1}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="lesson-curriculum-summary__btn lesson-curriculum-summary__btn--lesson"
                                onClick={() => onLessonClick(t.id, lesson.id)}
                              >
                                <span className="lesson-curriculum-summary__lesson-label">
                                  <span>{lesson.name}</span>
                                  <LessonStarRating
                                    stars={progressByLessonId?.[String(lesson.id)]?.stars ?? 0}
                                    size="xs"
                                    className="lesson-curriculum-summary__stars"
                                  />
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

export default function LessonPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [kiloviaFromMessage, setKiloviaFromMessage] = useState(() =>
    getKiloviaContext()
  );

  const kilovia = useMemo(() => {
    const token = searchParams.get("kilovia_token");
    const lessonName = searchParams.get("lesson_name") || "Game";
    const childCode = searchParams.get("ma_tre_em");

    if (token || childCode) {
      return { token, lessonName, childCode };
    }
    if (kiloviaFromMessage?.token) {
      return {
        token: kiloviaFromMessage.token,
        lessonName: "Game",
        childCode: kiloviaFromMessage.childCode ?? null,
      };
    }
    return null;
  }, [searchParams, kiloviaFromMessage]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type !== "KILOVIA_CHILD_TOKEN" || !event.data?.childToken) return;
      if (!isAllowedOrigin(event.origin)) return;
      setKiloviaContextFromMessage(
        event.data.childToken,
        event.data.ma_tre_em || event.data.maTreEm || null
      );
      setKiloviaFromMessage(getKiloviaContext());
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!kilovia?.childCode) return;
    externalLoginChild({ maTreEm: kilovia.childCode })
      .then((data) => {
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch((err) => {
        console.warn("externalLoginChild error:", err);
      });
  }, [kilovia]);

  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [cache, setCache] = useState({ types: {}, lessons: {}, questions: {} });
  const [error, setError] = useState(null);
  const [expandedTypeId, setExpandedTypeId] = useState(null);
  const [lastChosenLessonId, setLastChosenLessonId] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [reviewDays, setReviewDays] = useState(7);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSelectedIds, setReviewSelectedIds] = useState(() => new Set());
  const [reviewQuestionsPerLesson, setReviewQuestionsPerLesson] = useState(5);
  const [reviewStarting, setReviewStarting] = useState(false);
  const [lessonProgressById, setLessonProgressById] = useState({});
  const [revealedTopicIds, setRevealedTopicIds] = useState(() => new Set());
  const topicNodeRefs = useRef(new Map());
  const lessonChipRefs = useRef(new Map());
  const lessonMapRootRef = useRef(null);
  const restoreFromPregameDone = useRef(false);
  const initialGradeAutoDone = useRef(false);
  const scrollToLastLessonPending = useRef(false);

  const [viewportW, setViewportW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const ro = () => setViewportW(window.innerWidth);
    ro();
    window.addEventListener("resize", ro, { passive: true });
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener?.("change", ro);
    return () => {
      window.removeEventListener("resize", ro);
      mq.removeEventListener?.("change", ro);
    };
  }, []);
  const lessonMapMetrics = useMemo(
    () => getLessonMapMetrics(viewportW),
    [viewportW]
  );

  const reviewLoggedIn =
    typeof localStorage !== "undefined" && Boolean(localStorage.getItem("token"));

  useEffect(() => {
    let cancelled = false;
    if (!reviewLoggedIn) {
      setReviewItems([]);
      setReviewLoading(false);
      setReviewError("");
      return undefined;
    }
    setReviewLoading(true);
    setReviewError("");
    void (async () => {
      try {
        const data = await getCompletedLessonsForReview(reviewDays);
        if (!cancelled) {
          setReviewItems(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setReviewItems([]);
          setReviewError(
            err.response?.data?.message || "Không tải được danh sách ôn tập."
          );
        }
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewDays, reviewLoggedIn]);

  useEffect(() => {
    setReviewSelectedIds((prev) => {
      const valid = new Set(
        reviewItems.map((item) => String(item.lessonId))
      );
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [reviewItems]);

  useLayoutEffect(() => {
    if (expandedTypeId == null) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = reduced ? "auto" : "smooth";

    if (scrollToLastLessonPending.current && lastChosenLessonId != null) {
      const scrollToChip = () => {
        const chip = lessonChipRefs.current.get(String(lastChosenLessonId));
        if (!chip) return false;
        scrollToLastLessonPending.current = false;
        chip.scrollIntoView({
          behavior: scrollBehavior,
          block: "center",
          inline: "nearest",
        });
        return true;
      };
      if (scrollToChip()) return undefined;
      const t = window.setTimeout(() => scrollToChip(), 480);
      return () => window.clearTimeout(t);
    }

    const el = topicNodeRefs.current.get(String(expandedTypeId));
    if (!el) return undefined;
    el.scrollIntoView({
      behavior: scrollBehavior,
      block: "start",
      inline: "nearest",
    });
    return undefined;
  }, [expandedTypeId, lastChosenLessonId]);

  const gradeTypes = selectedGrade ? cache.types[selectedGrade] : null;

  /** Chủ đề hiện khi scroll tới (IntersectionObserver), không animate hết một lúc. */
  useEffect(() => {
    setRevealedTopicIds(new Set());
    topicNodeRefs.current.clear();

    if (!selectedGrade || !gradeTypes?.length) return undefined;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setRevealedTopicIds(
        new Set(gradeTypes.map((t) => String(t.id)))
      );
      return undefined;
    }

    let observer = null;

    const attachObserver = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.getAttribute("data-topic-id");
            if (!id) return;
            setRevealedTopicIds((prev) => {
              if (prev.has(id)) return prev;
              const next = new Set(prev);
              next.add(id);
              return next;
            });
            observer.unobserve(entry.target);
          });
        },
        {
          root: null,
          rootMargin: "-6% 0px -10% 0px",
          threshold: TOPIC_SCROLL_REVEAL_THRESHOLD,
        }
      );

      topicNodeRefs.current.forEach((el) => {
        if (el) observer.observe(el);
      });
    };

    const raf = requestAnimationFrame(attachObserver);
    const t = window.setTimeout(attachObserver, 150);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      observer?.disconnect();
    };
  }, [selectedGrade, gradeTypes]);

  // Tải danh sách lớp học
  useEffect(() => {
    getGrades()
      .then(setGrades)
      .catch((err) => setError(err.message));
  }, []);

  const handleSelectGrade = async (gradeId, opts = {}) => {
    const { restoreTypeId = null } = opts;
    if (selectedGrade != null && String(selectedGrade) !== String(gradeId)) {
      setExpandedTypeId(null);
      setLastChosenLessonId(null);
      setLessonProgressById({});
    }
    setSelectedGrade(gradeId);
    try {
      if (!cache.types[gradeId]) {
        const types = await getTypes(gradeId);
        setCache((prev) => ({ ...prev, types: { ...prev.types, [gradeId]: types } }));

        // Load lessons (bài học) cho từng type luôn
        const newLessons = {};
        for (const t of types) {
          const lessons = await getLessons(t.id);
          newLessons[t.id] = lessons;
        }
        setCache((prev) => ({ ...prev, lessons: { ...prev.lessons, ...newLessons } }));
      }
      const progressMap = await fetchLessonProgressForGrade(gradeId);
      setLessonProgressById(progressMap);
      if (restoreTypeId != null) {
        setExpandedTypeId(restoreTypeId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Lần đầu có danh sách khối: tự mở Khối 1 (hoặc khôi phục từ pre-game nếu vừa quay lại).
   */
  useEffect(() => {
    if (grades.length === 0 || initialGradeAutoDone.current) return;

    const pre = readPregamePayload();
    const canRestorePregame =
      pre?.grade?.id != null &&
      pre.type?.id != null &&
      grades.some((g) => String(g.id) === String(pre.grade.id));

    if (canRestorePregame && !restoreFromPregameDone.current) {
      const gid = pre.grade.id;
      const tid = pre.type.id;
      const lid = pre.lesson?.id != null ? pre.lesson.id : null;
      initialGradeAutoDone.current = true;
      void (async () => {
        await handleSelectGrade(gid, { restoreTypeId: tid });
        if (lid != null) {
          scrollToLastLessonPending.current = true;
          setLastChosenLessonId(lid);
        }
        restoreFromPregameDone.current = true;
      })();
      return;
    }

    initialGradeAutoDone.current = true;
    void (async () => {
      const saved = await fetchLastLessonSelection();
      const canRestoreLast =
        saved != null &&
        grades.some((g) => String(g.id) === String(saved.gradeId));

      if (canRestoreLast) {
        await handleSelectGrade(saved.gradeId, {
          restoreTypeId: saved.typeId,
        });
        scrollToLastLessonPending.current = true;
        setLastChosenLessonId(saved.lessonId);
        return;
      }

      const defaultId = pickDefaultGradeId(grades);
      if (defaultId != null) {
        await handleSelectGrade(defaultId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- một lần khi grades sẵn sàng
  }, [grades]);

  const handleLessonChosen = async (gradeId, typeId, lessonId) => {
    let questions = cache.questions[lessonId];
    if (!questions) {
      try {
        const res = await getQuestions({
          grade_id: gradeId,
          type_id: typeId,
          lesson_id: lessonId,
          randomize: true,
        });
        questions = res.data || res;
        setCache((prev) => ({
          ...prev,
          questions: { ...prev.questions, [lessonId]: questions },
        }));
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    if (!Array.isArray(questions)) {
      return;
    }
    const rawUser = localStorage.getItem("user");
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    const shuffledQuestions = shuffleArray(
      questions.map(withResolvedQuestionMedia)
    );

    setLastChosenLessonId(lessonId);

    const typeRow =
      cache.types[gradeId]?.find((t) => String(t.id) === String(typeId)) || null;
    const lessonRow =
      cache.lessons[typeId]?.find((row) => String(row.id) === String(lessonId)) ||
      null;
    const typeName = typeRow?.name || null;
    const lessonName = lessonRow?.name || null;

    const payload = {
      grade: { id: gradeId },
      type: {
        id: typeId,
        name: typeName,
        image: typeRow?.image ?? null,
      },
      lesson: {
        id: lessonId,
        name: lessonName,
        image: lessonRow?.image ?? null,
        description: lessonRow?.description ?? null,
      },
      questions: shuffledQuestions,
      user: currentUser,
      ...(kilovia && { kilovia }),
    };
    persistPregamePayload(payload);
    navigate("/play-setup", { state: payload });
  };

  const handleToggleReviewLesson = (lessonId) => {
    setReviewSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(lessonId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleReviewSelectAll = () => {
    setReviewSelectedIds(
      new Set(reviewItems.map((item) => String(item.lessonId)))
    );
  };

  const handleReviewClearAll = () => {
    setReviewSelectedIds(new Set());
  };

  const handleStartBatchReview = async () => {
    if (reviewStarting || reviewSelectedIds.size === 0) return;
    setReviewStarting(true);
    setReviewError("");
    try {
      const selected = reviewItems.filter((item) =>
        reviewSelectedIds.has(String(item.lessonId))
      );
      const perLesson = reviewQuestionsPerLesson;
      const results = await Promise.all(
        selected.map(async (item) => {
          const res = await getQuestions({
            grade_id: item.gradeId,
            type_id: item.typeId,
            lesson_id: item.lessonId,
            randomize: true,
            limit: perLesson,
          });
          const questions = res?.data ?? res;
          return {
            item,
            questions: Array.isArray(questions) ? questions : [],
          };
        })
      );

      const seen = new Set();
      const merged = [];
      for (const { questions } of results) {
        for (const q of questions) {
          if (q?.id != null && !seen.has(q.id)) {
            seen.add(q.id);
            merged.push(withResolvedQuestionMedia(q));
          }
        }
      }

      const shuffledQuestions = shuffleArray(merged);
      if (shuffledQuestions.length === 0) {
        setReviewError("Không có câu hỏi để ôn tập.");
        return;
      }

      const rawUser = localStorage.getItem("user");
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const lessons = selected.map((item) => ({
        lessonId: item.lessonId,
        lessonName: item.lessonName,
        typeName: item.typeName,
        gradeName: item.gradeName,
        gradeId: item.gradeId,
        typeId: item.typeId,
      }));

      const payload = {
        reviewMode: true,
        batchReview: true,
        questionsPerLesson: perLesson,
        lessons,
        questions: shuffledQuestions,
        user: currentUser,
        ...(kilovia && { kilovia }),
      };

      persistReviewSession(payload);
      navigate("/lesson-review", { state: payload });
    } catch (err) {
      setReviewError(err.message || "Không tải được câu hỏi ôn tập.");
    } finally {
      setReviewStarting(false);
    }
  };

  const isTypeExpanded = (t) =>
    expandedTypeId != null && String(expandedTypeId) === String(t.id);

  const toggleType = (typeId) => {
    setExpandedTypeId((prev) =>
      prev != null && String(prev) === String(typeId) ? null : typeId
    );
  };

  const scrollMapIntoView = useCallback(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lessonMapRootRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, []);

  const revealTopicOnMap = useCallback((typeId) => {
    const id = String(typeId);
    setRevealedTopicIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSummaryTopicClick = (typeId) => {
    const id = String(typeId);
    const isOpen =
      expandedTypeId != null && String(expandedTypeId) === id;
    scrollMapIntoView();
    revealTopicOnMap(typeId);
    if (!isOpen) {
      setExpandedTypeId(typeId);
      requestAnimationFrame(() => {
        topicNodeRefs.current
          .get(id)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      toggleType(typeId);
    }
  };

  const handleSummaryLessonClick = (typeId, lessonId) => {
    const tid = String(typeId);
    const lid = String(lessonId);
    const needsExpand =
      expandedTypeId == null || String(expandedTypeId) !== tid;

    scrollMapIntoView();
    revealTopicOnMap(typeId);
    setLastChosenLessonId(lessonId);

    if (needsExpand) {
      scrollToLastLessonPending.current = true;
      setExpandedTypeId(typeId);
      return;
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = reduced ? "auto" : "smooth";

    requestAnimationFrame(() => {
      topicNodeRefs.current
        .get(tid)
        ?.scrollIntoView({ behavior: scrollBehavior, block: "center" });
      const chip = lessonChipRefs.current.get(lid);
      chip?.scrollIntoView({
        behavior: scrollBehavior,
        block: "center",
        inline: "nearest",
      });
    });
  };

  const selectedGradeName = useMemo(
    () => grades.find((g) => String(g.id) === String(selectedGrade))?.name,
    [grades, selectedGrade]
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundColor: "#9ed3e7ff",
          backgroundImage: `url(${PAGE_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          padding: "32px 20px 56px",
        }}
      >
    <div
      className="choose-lesson-root"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 1600,
        margin: "0 auto",
        padding: "12px 12px 40px",
        borderRadius: 12,
        boxSizing: "border-box",
        touchAction: "manipulation",
        ["--lesson-topic-px"]: `${lessonMapMetrics.topicCssPx}px`,
        ["--lesson-topic-border"]: `${lessonMapMetrics.typeBorderPx}px`,
        ["--lesson-topic-font"]: `${lessonMapMetrics.typeFontRem}rem`,
        ["--cl-periwinkle"]: CL.periwinkle,
        ["--cl-sky"]: CL.sky,
        ["--cl-peach"]: CL.peach,
        ["--cl-pink"]: CL.pink,
        ["--cl-lavender"]: CL.lavender,
        ["--cl-ink"]: CL.ink,
        ["--cl-ink-muted"]: CL.inkMuted,
      }}
    >
      {error && (
        <div style={{ color: "red" }}>
          Lỗi: {error}
          <button onClick={() => setError(null)}>OK</button>
        </div>
      )}

      {/* Danh sách lớp — hàng ngang dạng mũi tên nối nhau */}
      <div className="choose-lesson-grade-panel" style={{ marginBottom: 36 }}>
        <div
          className="choose-lesson-grade-heading"
          style={{
            fontWeight: 700,
            fontSize: "1.9rem",
            marginBottom: 20,
            color: CL.ink,
            fontFamily: "inherit",
            textAlign: "center",
          }}
        >
          Bạn đang tìm kiếm bài học lớp nào?
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            width: "100%",
            maxWidth: "100%",
            fontFamily: "inherit",
            fontSize: "1.6rem",
          }}
        >
          {chunkArray(grades, lessonMapMetrics.gradesPerRow).map((rowGrades, rowIndex) => (
            <div
              key={rowIndex}
              className="grade-chevron-row"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "max-content",
                maxWidth: "100%",
                marginLeft: "auto",
                marginRight: "auto",
                minHeight: lessonMapMetrics.gradeChevronHeight,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              {rowGrades.map((g, index) => {
                const gradeBg = g.image ? gradeImageUrl(g.image) : "";
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGrade(g.id)}
                    className={`grade-chevron-btn${
                      selectedGrade === g.id ? " grade-chevron-btn--selected" : ""
                    }${gradeBg ? " grade-chevron-btn--has-image" : ""}`}
                    style={{
                      position: "relative",
                      zIndex: index + 1,
                      flex: `0 0 ${lessonMapMetrics.gradeChevronWidth}px`,
                      width: lessonMapMetrics.gradeChevronWidth,
                      height: lessonMapMetrics.gradeChevronHeight,
                      minWidth: lessonMapMetrics.gradeChevronWidth,
                      maxWidth: lessonMapMetrics.gradeChevronWidth,
                      minHeight: lessonMapMetrics.gradeChevronHeight,
                      maxHeight: lessonMapMetrics.gradeChevronHeight,
                      boxSizing: "border-box",
                      marginLeft:
                        index === 0 ? 0 : lessonMapMetrics.gradeOverlap,
                      padding: lessonMapMetrics.gradePadding,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: `${lessonMapMetrics.gradeFontPx}px`,
                      lineHeight: 1.2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      clipPath: GRADE_CHEVRON_CLIP,
                      WebkitClipPath: GRADE_CHEVRON_CLIP,
                      fontFamily: "inherit",
                      animationDelay: `${
                        (rowIndex * lessonMapMetrics.gradesPerRow + index) * 0.055
                      }s`,
                      ...(gradeBg
                        ? {
                            backgroundImage: `linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.38)), url(${gradeBg})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            color: "#fff",
                          }
                        : {}),
                    }}
                  >
                    <span className="grade-chevron-btn-label">
                      {g.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .choose-lesson-root {
          -webkit-tap-highlight-color: transparent;
          --grade-ease: cubic-bezier(0.33, 1, 0.68, 1);
          --grade-duration: 0.52s;
        }
        @keyframes chooseLessonGradePanelIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gradeChevronBtnIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gradeColorFlashSweep {
          0% {
            background-position: -20% 50%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            background-position: 120% 50%;
            opacity: 0;
          }
        }
        .choose-lesson-grade-panel {
          animation: chooseLessonGradePanelIn 0.5s ease both;
        }
        .choose-lesson-grade-heading {
          transition: opacity var(--grade-duration) var(--grade-ease);
        }
        .grade-chevron-btn {
          overflow: hidden;
          background: #ffffff;
          color: var(--cl-ink);
          box-shadow: 0 2px 8px rgba(108, 126, 225, 0.12);
          animation: gradeChevronBtnIn 0.45s ease backwards;
          transition:
            color var(--grade-duration) var(--grade-ease),
            box-shadow var(--grade-duration) var(--grade-ease);
        }
        .grade-chevron-btn--has-image::before {
          opacity: 0 !important;
        }
        .grade-chevron-btn--has-image.grade-chevron-btn--selected,
        .grade-chevron-btn--has-image:hover {
          color: #fff;
        }
        /* Lớp màu gradient — fade mượt */
        .grade-chevron-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          background: linear-gradient(
            135deg,
            var(--cl-periwinkle) 0%,
            var(--cl-lavender) 100%
          );
          opacity: 0;
          transition: opacity var(--grade-duration) var(--grade-ease);
        }
        /* Vệt sáng flashback — phủ cả ô, lướt trái → phải */
        .grade-chevron-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 38%,
            rgba(255, 255, 255, 0.22) 44%,
            rgba(255, 255, 255, 0.78) 50%,
            rgba(255, 230, 252, 0.65) 56%,
            transparent 62%,
            transparent 100%
          );
          background-size: 220% 100%;
          background-position: -20% 50%;
          background-repeat: no-repeat;
        }
        .grade-chevron-btn-label {
          position: relative;
          z-index: 2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          min-width: 0;
          transition: color var(--grade-duration) var(--grade-ease);
        }
        .grade-chevron-btn--selected::before,
        .grade-chevron-btn:hover::before {
          opacity: 1;
        }
        .grade-chevron-btn:hover::after,
        .grade-chevron-btn--selected::after {
          animation: gradeColorFlashSweep 0.85s var(--grade-ease) forwards;
        }
        .grade-chevron-btn--selected {
          color: #fff;
          box-shadow: 0 4px 18px rgba(108, 126, 225, 0.42);
        }
        @media (max-width: 520px) {
          .choose-lesson-root {
            padding: 8px 6px 28px !important;
          }
          .choose-lesson-grade-heading {
            font-size: 0.95rem !important;
            margin-bottom: 12px !important;
          }
        }
        .grade-chevron-row {
          overflow-x: auto;
          overflow-y: visible;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
          font-family: inherit;
          justify-content: center;
          width: max-content;
          max-width: 100%;
          margin-left: auto;
          margin-right: auto;
        }
        .grade-chevron-btn:hover {
          color: #fff !important;
          box-shadow: 0 6px 20px rgba(198, 136, 235, 0.45) !important;
          z-index: 40 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .choose-lesson-grade-panel,
          .grade-chevron-btn {
            animation: none !important;
          }
          .grade-chevron-btn,
          .grade-chevron-btn::before,
          .grade-chevron-btn-label {
            transition-duration: 0.01s !important;
          }
          .grade-chevron-btn::after {
            animation: none !important;
            opacity: 0 !important;
            background-position: -20% 50% !important;
          }
        }

        .lesson-page-map-layout {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 20px;
          width: 100%;
          max-width: min(1680px, 100%);
          margin: 16px auto 0;
          box-sizing: border-box;
        }
        @media (min-width: 960px) {
          .lesson-page-map-layout {
            flex-direction: row;
            align-items: flex-start;
            gap: 24px;
          }
        }
        .lesson-curriculum-summary {
          flex: 0 0 auto;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          padding: 16px 14px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(146, 185, 227, 0.35);
          box-shadow: 0 8px 28px rgba(74, 80, 128, 0.08);
          font-family: inherit;
          color: var(--cl-ink);
        }
        @media (min-width: 960px) {
          .lesson-curriculum-summary {
            width: min(320px, 28vw);
            max-height: calc(100vh - 48px);
            display: flex;
            flex-direction: column;
          }
        }
        .lesson-curriculum-summary__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }
        .lesson-curriculum-summary__title {
          margin: 0;
          font-size: clamp(0.95rem, 2.5vw, 1.08rem);
          font-weight: 800;
          color: var(--cl-periwinkle);
          line-height: 1.3;
        }
        .lesson-curriculum-summary__collapse-btn {
          flex: 0 0 auto;
          margin: 0;
          padding: 6px 12px;
          border: 1px solid rgba(146, 185, 227, 0.55);
          border-radius: 10px;
          background: #fff;
          color: var(--cl-ink-muted);
          font-size: 0.78rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: box-shadow 0.2s ease, transform 0.2s ease, color 0.2s ease;
        }
        .lesson-curriculum-summary__collapse-btn:hover,
        .lesson-curriculum-summary__collapse-btn:focus-visible {
          color: var(--cl-periwinkle);
          box-shadow: 0 6px 18px rgba(74, 80, 128, 0.12);
          transform: translateY(-1px);
          outline: none;
        }
        .lesson-page-map-layout--summary-collapsed .lesson-map-root {
          flex: 1 1 100%;
          max-width: none;
        }
        .lesson-page-map-layout--review-collapsed .lesson-map-root {
          flex: 1 1 auto;
        }
        .lesson-curriculum-summary__grade {
          margin: 0 0 10px;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--cl-ink-muted);
        }
        .lesson-curriculum-summary__search {
          display: flex;
          align-items: stretch;
          gap: 6px;
          margin-bottom: 8px;
          position: relative;
        }
        .lesson-curriculum-summary__search-input {
          flex: 1 1 auto;
          min-width: 0;
          padding: 9px 36px 9px 12px;
          border: 2px solid rgba(146, 185, 227, 0.65);
          border-radius: 10px;
          font-size: 0.86rem;
          font-family: inherit;
          color: var(--cl-ink);
          background: #fff;
          box-sizing: border-box;
        }
        .lesson-curriculum-summary__search-input:focus {
          outline: none;
          border-color: var(--cl-periwinkle);
          box-shadow: 0 0 0 3px rgba(108, 126, 225, 0.2);
        }
        .lesson-curriculum-summary__search-btn {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          padding: 0;
          border: none;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            var(--cl-periwinkle) 0%,
            var(--cl-lavender) 100%
          );
          color: #fff;
          cursor: pointer;
          font-family: inherit;
        }
        .lesson-curriculum-summary__search-btn:hover {
          filter: brightness(1.06);
        }
        .lesson-curriculum-summary__search-clear {
          position: absolute;
          right: 50px;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: rgba(107, 112, 153, 0.15);
          color: var(--cl-ink-muted);
          font-size: 1.1rem;
          line-height: 1;
          cursor: pointer;
          font-family: inherit;
        }
        .lesson-curriculum-summary__muted {
          margin: 0;
          font-size: 0.9rem;
          color: var(--cl-ink-muted);
          font-style: italic;
        }
        .lesson-curriculum-summary__scroll {
          overflow: auto;
          flex: 1 1 auto;
          min-height: 0;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 959px) {
          .lesson-curriculum-summary__scroll {
            max-height: min(42vh, 360px);
          }
        }
        .lesson-curriculum-summary__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.84rem;
          line-height: 1.35;
        }
        .lesson-curriculum-summary__table th {
          position: sticky;
          top: 0;
          z-index: 1;
          text-align: left;
          font-weight: 700;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--cl-ink-muted);
          padding: 8px 4px 10px;
          background: #fff;
          border-bottom: none;
        }
        .lesson-curriculum-summary__table th:first-child {
          width: 52px;
          text-align: center;
        }
        .lesson-curriculum-summary__table td {
          vertical-align: middle;
          padding: 3px 4px;
          border-bottom: none;
        }
        .lesson-curriculum-summary__table td:first-child {
          text-align: center;
          font-weight: 700;
          color: var(--cl-ink-muted);
          white-space: nowrap;
        }
        .lesson-curriculum-summary__topic td:first-child {
          color: var(--cl-pink);
        }
        .lesson-curriculum-summary__topic td,
        .lesson-curriculum-summary__topic.is-open td {
          background: transparent;
        }
        .lesson-curriculum-summary__topic.is-open .lesson-curriculum-summary__btn {
          color: var(--cl-pink);
        }
        .lesson-curriculum-summary__topic .lesson-curriculum-summary__btn {
          font-weight: 800;
          color: var(--cl-pink);
        }
        .lesson-curriculum-summary__topic-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .lesson-curriculum-summary__topic-tick {
          flex-shrink: 0;
        }
        .lesson-curriculum-summary__lesson td:first-child {
          font-size: 0.78rem;
          font-weight: 600;
        }
        .lesson-curriculum-summary__lesson.is-last td {
          background: transparent;
        }
        .lesson-curriculum-summary__empty-row td {
          padding-top: 2px;
          padding-bottom: 10px;
        }
        .lesson-curriculum-summary__empty {
          font-size: 0.82rem;
          color: var(--cl-ink-muted);
          font-style: italic;
          padding-left: 4px;
        }
        .lesson-curriculum-summary__btn {
          display: flex;
          align-items: center;
          width: 100%;
          margin: 0;
          padding: 8px 10px;
          border: none;
          border-radius: 10px;
          background: transparent;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          font-family: inherit;
          word-break: break-word;
          box-sizing: border-box;
          transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .lesson-curriculum-summary__btn--lesson {
          font-weight: 500;
          color: var(--cl-ink-muted);
        }
        .lesson-curriculum-summary__lesson-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }
        .lesson-curriculum-summary__stars {
          flex-shrink: 0;
        }
        .lesson-curriculum-summary__btn:hover,
        .lesson-curriculum-summary__btn:focus-visible {
          background: #fff;
          box-shadow: 0 6px 18px rgba(74, 80, 128, 0.12);
          transform: translateY(-2px);
          color: var(--cl-periwinkle);
          outline: none;
          text-decoration: none;
        }
        .lesson-curriculum-summary__topic .lesson-curriculum-summary__btn:hover,
        .lesson-curriculum-summary__topic .lesson-curriculum-summary__btn:focus-visible {
          color: #e86fb0;
        }
        .lesson-curriculum-summary__lesson.is-last .lesson-curriculum-summary__btn--lesson {
          color: var(--cl-ink);
          font-weight: 600;
        }
        .lesson-curriculum-summary__lesson.is-last .lesson-curriculum-summary__btn--lesson:hover,
        .lesson-curriculum-summary__lesson.is-last .lesson-curriculum-summary__btn--lesson:focus-visible {
          color: var(--cl-periwinkle);
        }
        .lesson-page-map-layout .lesson-map-root {
          flex: 1 1 auto;
          min-width: 0;
          margin-top: 0;
          max-width: none;
        }
        .lesson-map-root {
          margin-top: 16px;
          padding: 0;
          border-radius: 0;
          background: transparent;
          border: none;
          box-shadow: none;
          font-family: inherit;
          width: 100%;
          max-width: min(1100px, 100%);
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
          overflow: visible;
          transition:
            flex 0.32s cubic-bezier(0.33, 1, 0.68, 1),
            max-width 0.32s cubic-bezier(0.33, 1, 0.68, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .lesson-map-root {
            transition-duration: 0.01s !important;
          }
        }
        @media (max-width: 520px) {
          .lesson-map-root {
            margin-top: 8px;
          }
        }
        .lesson-map-title {
          text-align: center;
          font-weight: 800;
          font-size: clamp(1.05rem, 3.8vw, 1.4rem);
          color: var(--cl-periwinkle);
          margin: 0 0 28px;
          letter-spacing: 0.02em;
          padding: 0 12px;
          line-height: 1.35;
        }
        @media (max-width: 520px) {
          .lesson-map-title {
            margin-bottom: 16px;
          }
        }
        .lesson-map-shell {
          position: relative;
          overflow: visible;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
          box-sizing: border-box;
        }
        .lesson-map-track {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 40px 72px;
          gap: 0;
        }
        @media (max-width: 520px) {
          .lesson-map-track {
            padding: 36px 8px 40px;
          }
          .lesson-map-track::before {
            top: 28px;
            bottom: 32px;
            width: ${SPINE_TOPIC_LINK_WIDTH_MOBILE_PX}px;
            margin-left: ${-SPINE_TOPIC_LINK_WIDTH_MOBILE_PX / 2}px;
          }
        }
        .lesson-map-track::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 48px;
          bottom: 48px;
          width: ${SPINE_TOPIC_LINK_WIDTH_PX}px;
          margin-left: ${-SPINE_TOPIC_LINK_WIDTH_PX / 2}px;
          border-radius: 7px;
          background: linear-gradient(
            180deg,
            var(--cl-lavender) 0%,
            var(--cl-periwinkle) 38%,
            var(--cl-sky) 100%
          );
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
          z-index: 0;
          pointer-events: none;
        }
        .lesson-map-node {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: min(20vh, 120px);
          scroll-margin-top: 20px;
        }
        .lesson-map-node-expanded {
          margin-bottom: 56px;
        }
        @media (max-width: 520px) {
          .lesson-map-node {
            margin-bottom: min(14vh, 72px);
            scroll-margin-top: 12px;
          }
          .lesson-map-node-expanded {
            margin-bottom: 36px;
          }
        }
        .lesson-map-node:last-child {
          margin-bottom: 0;
        }
        .lesson-map-topic-head {
          position: relative;
          overflow: visible;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: min(420px, 100%);
          margin: 0 auto;
          padding: 0;
          border: none;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          cursor: pointer;
          font-family: inherit;
        }
        .lesson-map-topic-head:hover {
          background: transparent;
          box-shadow: none;
        }
        .lesson-map-topic-head:hover .lesson-map-type {
          box-shadow: 0 10px 28px rgba(183, 58, 255, 0.86);
          transform: scale(1.02);
        }
        .lesson-map-topic-head .lesson-map-type {
          cursor: pointer;
          position: relative;
          z-index: 1;
        }
        .lesson-map-topic-complete {
          position: absolute;
          top: -20px;
          left: calc(50% + var(--lesson-topic-px, 260px) / 2 + 6px);
          transform: translateX(-100%);
          z-index: 6;
          pointer-events: none;
        }
        @media (max-width: 520px) {
          .lesson-map-topic-complete {
            top: -14px;
            left: calc(50% + var(--lesson-topic-px, 200px) / 2 + 4px);
          }
        }
        .lesson-map-topic-head:not(.lesson-map-topic-head--in-view) .lesson-map-type {
          opacity: 0;
          transform: scale(0.82) translateY(-20px);
        }
        .lesson-map-topic-head--in-view .lesson-map-type {
          animation: lessonMapTopicReveal ${TOPIC_REVEAL_DURATION_S}s ease-out forwards;
        }
        @keyframes lessonMapTopicReveal {
          from {
            opacity: 0;
            transform: scale(0.82) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .lesson-map-hub-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 0;
          position: relative;
          z-index: 2;
          padding: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes lessonMapLineDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        .lesson-map-line-draw {
          animation-name: lessonMapLineDraw;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        .lesson-map-lesson-chip--reveal {
          opacity: 0;
          animation: lessonMapChipFadeIn 0.36s ease-out forwards;
        }
        @keyframes lessonMapChipFadeIn {
          to {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lesson-map-line-draw {
            animation-duration: 0.01s !important;
            animation-delay: 0s !important;
          }
          .lesson-map-lesson-chip--reveal {
            animation: none;
            opacity: 1;
          }
          .lesson-map-topic-head:not(.lesson-map-topic-head--in-view) .lesson-map-type,
          .lesson-map-topic-head--in-view .lesson-map-type {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
        .lesson-map-hub {
          position: relative;
          margin: 0 auto;
          box-sizing: border-box;
          max-width: 100%;
        }
        .lesson-map-hub-svg {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
          overflow: visible;
        }
        .lesson-map-spine-v {
          stroke: var(--cl-pink);
          stroke-width: 8;
          stroke-linecap: round;
          opacity: 0.94;
        }
        .lesson-map-spoke {
          stroke: var(--cl-pink);
          stroke-width: 4;
          stroke-linecap: round;
          opacity: 0.9;
        }
        @media (max-width: 520px) {
          .lesson-map-spine-v {
            stroke-width: 6;
          }
          .lesson-map-spoke {
            stroke-width: 3.5;
          }
        }
        .lesson-map-type-anchor {
          position: absolute;
          z-index: 3;
          transform: translate(-50%, -50%);
        }
        .lesson-map-type {
          flex-shrink: 0;
          width: var(--lesson-topic-px, 260px);
          height: var(--lesson-topic-px, 260px);
          border-radius: 16px;
          border: var(--lesson-topic-border, 7px) solid var(--cl-pink);
          background-color: #f5f0e8;
          background-image: url('${TYPE_TOPIC_BG}');
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          color: var(--cl-ink);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 800;
          font-size: var(--lesson-topic-font, 1rem);
          line-height: 1.25;
          padding: clamp(18px, 5vw, 28px);
          box-sizing: border-box;
          box-shadow: 0 16px 40px rgba(108, 126, 225, 0.28);
          cursor: default;
          user-select: none;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .lesson-map-type-anchor:hover .lesson-map-type {
          box-shadow: 0 10px 28px rgba(198, 136, 235, 0.38);
          transform: scale(1.02);
        }
        .lesson-map-type--has-image {
          padding: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .lesson-map-type-text {
          font-family: 'SVN Bublont', sans-serif;
          font-weight: 400;
          font-synthesis: none;
          font-size: 1em;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }
        .lesson-map-lesson-chip {
          position: absolute;
          z-index: 2;
          transform: translate(-50%, -50%);
          box-sizing: border-box;
          padding: clamp(14px, 4vw, 22px) clamp(10px, 3vw, 16px);
          border: none;
          border-radius: 0;
          background-color: transparent;
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          color: var(--cl-ink);
          font-weight: 700;
          font-size: clamp(1.28rem, 4.6vw, 1.72rem);
          line-height: 1.35;
          text-align: center;
          cursor: pointer;
          font-family: inherit;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, filter 0.15s ease;
          overflow: hidden;
        }
        .lesson-map-lesson-chip-label {
          font-family: 'SVN Bublont', sans-serif;
          font-weight: 400;
          font-synthesis: none;
          flex: 0 1 auto;
          max-height: 100%;
          min-height: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          white-space: normal;
          word-break: break-word;
          hyphens: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: clamp(1.35rem, 5.2vw, 1.95rem);
          font-weight: 400;
          color: var(--cl-ink);
          text-shadow:
            0 1px 2px rgba(255, 255, 255, 0.95),
            0 0 10px rgba(255, 255, 255, 0.75);
        }
        /* Bản đồ ngoài: tên rất dài — thu nhỏ chữ (tóm tắt bên không dùng class này) */
        .lesson-map-lesson-chip-label--long {
          font-size: clamp(1.02rem, 3.85vw, 1.42rem);
          line-height: 1.24;
        }
        .lesson-map-lesson-chip:hover {
          transform: translate(-50%, -50%) scale(1.04);
          filter: brightness(1.06);
        }
        .lesson-map-lesson-chip--last-picked {
          filter: drop-shadow(0 0 10px rgba(255, 126, 193, 0.85));
        }
        .lesson-map-lesson-chip--last-picked:hover {
          transform: translate(-50%, -50%) scale(1.04);
          filter: brightness(1.06) drop-shadow(0 0 10px rgba(251, 162, 208, 0.9));
        }
        .lesson-map-lesson-chip-stars {
          position: absolute;
          left: 50%;
          bottom: 4%;
          transform: translateX(-50%);
          z-index: 3;
          max-width: 96%;
          justify-content: center;
        }
        @media (max-width: 520px) {
          .lesson-map-lesson-chip-stars {
            bottom: 3%;
          }
        }
        .lesson-map-hub-empty {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2;
          font-size: 0.95rem;
          color: var(--cl-ink-muted);
          font-style: italic;
          text-align: center;
          max-width: min(360px, 88%);
          padding: 0 8px;
        }
      `}</style>

      {/* Bản đồ xương sống: trục dọc + chủ đề (ô bo góc) + bài học hai bên */}
      {selectedGrade && cache.types[selectedGrade] && (
        <div
          className={`lesson-page-map-layout${
            summaryOpen ? "" : " lesson-page-map-layout--summary-collapsed"
          }${reviewOpen ? "" : " lesson-page-map-layout--review-collapsed"}`}
        >
          <LessonSidebarSlot
            open={summaryOpen}
            onOpen={() => setSummaryOpen(true)}
            side="left"
            tabLabel="Tóm tắt"
            panelId="lesson-curriculum-summary"
          >
            <LessonCurriculumSummary
              gradeName={selectedGradeName}
              types={cache.types[selectedGrade] || []}
              lessonsMap={cache.lessons}
              expandedTypeId={expandedTypeId}
              lastChosenLessonId={lastChosenLessonId}
              onTopicClick={handleSummaryTopicClick}
              onLessonClick={handleSummaryLessonClick}
              progressByLessonId={lessonProgressById}
              onCollapse={() => setSummaryOpen(false)}
            />
          </LessonSidebarSlot>
          <div className="lesson-map-root" ref={lessonMapRootRef}>
          <p className="lesson-map-title">Lộ trình bài học</p>
          <div className="lesson-map-shell">
            <div className="lesson-map-track" key={String(selectedGrade)}>
              {[...(cache.types[selectedGrade] || [])].map((t) => {
                const lessons = [...(cache.lessons[t.id] || [])];
                const layout = getSpineClusterLayout(lessons, lessonMapMetrics);
                const open = isTypeExpanded(t);
                const svgLines = buildSpineClusterSvgLines(layout, lessons.length);
                const { timedLines, chipDelays, chipFadeDur } =
                  computeSpineDrawTiming(svgLines, lessons.length);
                const typeImg = typeDisplayImageUrl(t);
                const topicComplete = isTopicFullyComplete(
                  lessons,
                  lessonProgressById
                );

                return (
                  <div
                    key={t.id}
                    data-topic-id={t.id}
                    className={`lesson-map-node${open ? " lesson-map-node-expanded" : ""}`}
                    ref={(el) => {
                      const k = String(t.id);
                      if (el) topicNodeRefs.current.set(k, el);
                      else topicNodeRefs.current.delete(k);
                    }}
                  >
                    <button
                      type="button"
                      className={`lesson-map-topic-head${
                        revealedTopicIds.has(String(t.id))
                          ? " lesson-map-topic-head--in-view"
                          : ""
                      }`}
                      onClick={() => toggleType(t.id)}
                      aria-expanded={open}
                      aria-controls={`lesson-hub-${t.id}`}
                      aria-label={t.name}
                    >
                      {topicComplete ? (
                        <TopicCompleteTick
                          size="lg"
                          className="lesson-map-topic-complete"
                        />
                      ) : null}
                      <div
                        className={`lesson-map-type${
                          typeImg ? " lesson-map-type--has-image" : ""
                        }`}
                        style={
                          typeImg ? { backgroundImage: `url(${typeImg})` } : undefined
                        }
                      >
                        {!typeImg && (
                          <span className="lesson-map-type-text">{t.name}</span>
                        )}
                      </div>
                    </button>
                    {open && (
                    <>
                    <div
                      className="lesson-map-hub-wrap"
                      id={`lesson-hub-${t.id}`}
                    >
                    <div
                      className="lesson-map-hub"
                      style={{
                        width: layout.clusterW,
                        height: layout.clusterH,
                      }}
                      role="group"
                      aria-label={`Bài học ${t.name}`}
                    >
                      <svg
                        className="lesson-map-hub-svg"
                        width={layout.clusterW}
                        height={layout.clusterH}
                        viewBox={`0 0 ${layout.clusterW} ${layout.clusterH}`}
                        aria-hidden
                      >
                        {timedLines.map((ln, i) => (
                          <line
                            key={i}
                            className={`lesson-map-line-draw ${
                              ln.variant === "spine"
                                ? "lesson-map-spine-v"
                                : "lesson-map-spoke"
                            }`}
                            x1={ln.x1}
                            y1={ln.y1}
                            x2={ln.x2}
                            y2={ln.y2}
                            style={{
                              strokeDasharray: ln.length,
                              strokeDashoffset: ln.length,
                              animationDuration: `${ln.animDur}s`,
                              animationDelay: `${ln.animStart}s`,
                            }}
                          />
                        ))}
                      </svg>
                      {lessons.map((o, i) => {
                        const p = layout.points[i];
                        if (!p) return null;
                        const isLastPicked =
                          lastChosenLessonId != null &&
                          String(o.id) === String(lastChosenLessonId);
                        const lessonStars =
                          lessonProgressById[String(o.id)]?.stars ?? 0;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            ref={(el) => {
                              const k = String(o.id);
                              if (el) lessonChipRefs.current.set(k, el);
                              else lessonChipRefs.current.delete(k);
                            }}
                            className={`lesson-map-lesson-chip lesson-map-lesson-chip--reveal${
                              isLastPicked ? " lesson-map-lesson-chip--last-picked" : ""
                            }`}
                            style={{
                              left: p.cx,
                              top: p.cy,
                              zIndex: 2 + i,
                              width: layout.lessonSize,
                              height: layout.lessonSize,
                              maxWidth: layout.lessonSize,
                              maxHeight: layout.lessonSize,
                              animationDelay: `${chipDelays[i] ?? 0}s`,
                              animationDuration: `${chipFadeDur}s`,
                              backgroundImage: `url(${lessonDisplayImageUrl(o)})`,
                            }}
                            title={o.name}
                            onClick={() =>
                              handleLessonChosen(selectedGrade, t.id, o.id)
                            }
                            aria-label={`Chơi ${o.name}`}
                          >
                            <span
                              className={`lesson-map-lesson-chip-label${
                                String(o.name ?? "").length >= 40
                                  ? " lesson-map-lesson-chip-label--long"
                                  : ""
                              }`}
                            >
                              {o.name}
                            </span>
                            <LessonStarRating
                              stars={lessonStars}
                              size="lg"
                              className="lesson-map-lesson-chip-stars"
                            />
                          </button>
                        );
                      })}
                      {lessons.length === 0 ? (
                        <p
                          className="lesson-map-hub-empty"
                          style={{
                            top: layout.typeCy + layout.topicR + 16,
                          }}
                        >
                          Chưa có bài học
                        </p>
                      ) : null}
                    </div>
                    </div>
                    </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
          <LessonSidebarSlot
            open={reviewOpen}
            onOpen={() => setReviewOpen(true)}
            side="right"
            tabLabel="Ôn tập"
            panelId="lesson-review-panel"
          >
            <LessonReviewPanel
              days={reviewDays}
              onDaysChange={setReviewDays}
              items={reviewItems}
              loading={reviewLoading}
              error={reviewError}
              isLoggedIn={reviewLoggedIn}
              selectedIds={reviewSelectedIds}
              onToggleLesson={handleToggleReviewLesson}
              onSelectAll={handleReviewSelectAll}
              onClearAll={handleReviewClearAll}
              questionsPerLesson={reviewQuestionsPerLesson}
              onQuestionsPerLessonChange={setReviewQuestionsPerLesson}
              onStartReview={() => void handleStartBatchReview()}
              startingReview={reviewStarting}
              onCollapse={() => setReviewOpen(false)}
            />
          </LessonSidebarSlot>
        </div>
      )}
    </div>
      </div>
    </div>
  );
}
