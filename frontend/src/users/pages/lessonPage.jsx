import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getGrades,
  getTypes,
  getLessons,
  getQuestions,
  questionImageUrl,
  externalLoginChild,
} from "../../api";
import { readPregamePayload, persistPregamePayload } from "../lib/playSession";
import {
  getKiloviaContext,
  setKiloviaContextFromMessage,
} from "../lib/kiloviaBridge";
import { publicUrl } from "../../lib/publicUrl";

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
const TOPIC_CIRCLE_SIZE_PX = 200;
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

/** Thời lượng ease-out cho từng đoạn + thời điểm hiện từng ô bài (sau nhánh tới ô đó). */
function computeSpineDrawTiming(lines, lessonCount) {
  const PX = 420;
  const MIN_DUR = 0.1;
  const MAX_DUR = 0.48;
  let acc = 0.06;
  const timed = lines.map((ln) => {
    const dur = Math.min(MAX_DUR, Math.max(MIN_DUR, ln.length / PX + 0.07));
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
  return { timedLines: timed, chipDelays, totalTime: acc };
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
      topicLayoutR: 70,
      topicCssPx: 140,
      typeFontRem: 0.82,
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
      topicLayoutR: 78,
      topicCssPx: 156,
      typeFontRem: 0.88,
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
      topicLayoutR: 88,
      topicCssPx: 176,
      typeFontRem: 0.92,
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
      topicLayoutR: 96,
      topicCssPx: 192,
      typeFontRem: 0.98,
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
    typeFontRem: 1.05,
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
  const [revealedTopicIds, setRevealedTopicIds] = useState(() => new Set());
  const topicNodeRefs = useRef(new Map());
  const restoreFromPregameDone = useRef(false);
  const initialGradeAutoDone = useRef(false);

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

  useLayoutEffect(() => {
    if (expandedTypeId == null) return;
    const el = topicNodeRefs.current.get(String(expandedTypeId));
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [expandedTypeId]);

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
        if (lid != null) setLastChosenLessonId(lid);
        restoreFromPregameDone.current = true;
      })();
      return;
    }

    const defaultId = pickDefaultGradeId(grades);
    if (defaultId == null) return;

    initialGradeAutoDone.current = true;
    void handleSelectGrade(defaultId);
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

    const payload = {
      grade: { id: gradeId },
      type: {
        id: typeId,
        name:
          cache.types[gradeId]?.find(
            (t) => String(t.id) === String(typeId)
          )?.name || null,
      },
      lesson: {
        id: lessonId,
        name:
          cache.lessons[typeId]?.find(
            (row) => String(row.id) === String(lessonId)
          )?.name || null,
      },
      questions: shuffledQuestions,
      user: currentUser,
      ...(kilovia && { kilovia }),
    };
    persistPregamePayload(payload);
    navigate("/play-setup", { state: payload });
  };

  const isTypeExpanded = (t) =>
    expandedTypeId != null && String(expandedTypeId) === String(t.id);

  const toggleType = (typeId) => {
    setExpandedTypeId((prev) =>
      prev != null && String(prev) === String(typeId) ? null : typeId
    );
  };

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
        maxWidth: 1180,
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
      <div style={{ marginBottom: 36 }}>
        <div
          className="choose-lesson-grade-heading"
          style={{
            fontWeight: 700,
            fontSize: "1.05rem",
            marginBottom: 20,
            color: CL.ink,
            fontFamily: "inherit",
            textAlign: "center",
          }}
        >
          Chọn khối lớp bạn muốn học nhé 
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
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGrade(g.id)}
                    className="grade-chevron-btn"
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
                      background:
                        selectedGrade === g.id
                          ? `linear-gradient(135deg, ${CL.periwinkle} 0%, ${CL.lavender} 100%)`
                          : "#ffffff",
                      color: selectedGrade === g.id ? "#fff" : CL.ink,
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
                      boxShadow:
                        selectedGrade === g.id
                          ? `0 4px 16px rgba(108, 126, 225, 0.45)`
                          : "0 2px 8px rgba(108, 126, 225, 0.12)",
                      transition:
                        "transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                        minWidth: 0,
                      }}
                    >
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
          background: linear-gradient(135deg, var(--cl-lavender) 0%, var(--cl-periwinkle) 100%) !important;
          color: white !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(198, 136, 235, 0.45) !important;
          z-index: 40 !important;
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
          width: var(--lesson-topic-px, 200px);
          height: var(--lesson-topic-px, 200px);
          border-radius: 50%;
          border: var(--lesson-topic-border, 7px) solid var(--cl-pink);
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #f5f0ff 45%,
            #e8f2fc 100%
          );
          color: var(--cl-ink);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 800;
          font-size: var(--lesson-topic-font, 1rem);
          line-height: 1.25;
          padding: clamp(8px, 2vw, 14px);
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
        .lesson-map-type-text {
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
          font-size: clamp(0.78rem, 2.6vw, 0.96rem);
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
          font-size: clamp(0.72rem, 2.8vw, 1.08rem);
          font-weight: 700;
          color: var(--cl-ink);
          text-shadow:
            0 1px 2px rgba(255, 255, 255, 0.95),
            0 0 10px rgba(255, 255, 255, 0.75);
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

      {/* Bản đồ xương sống: trục dọc + chủ đề (vòng) + bài học hai bên */}
      {selectedGrade && cache.types[selectedGrade] && (
        <div className="lesson-map-root">
          <p className="lesson-map-title">Lộ trình bài học</p>
          <div className="lesson-map-shell">
            <div className="lesson-map-track" key={String(selectedGrade)}>
              {[...(cache.types[selectedGrade] || [])]
                .sort((a, b) => Number(a.id) - Number(b.id))
                .map((t) => {
                const lessons = [...(cache.lessons[t.id] || [])].sort(
                  (a, b) => Number(a.id) - Number(b.id)
                );
                const layout = getSpineClusterLayout(lessons, lessonMapMetrics);
                const open = isTypeExpanded(t);
                const svgLines = buildSpineClusterSvgLines(layout, lessons.length);
                const { timedLines, chipDelays } = computeSpineDrawTiming(
                  svgLines,
                  lessons.length
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
                    >
                      <div className="lesson-map-type">
                        <span className="lesson-map-type-text">{t.name}</span>
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
                        return (
                          <button
                            key={o.id}
                            type="button"
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
                              backgroundImage: `url(${lessonChipBackgroundUrl(o.id)})`,
                            }}
                            title={o.name}
                            onClick={() =>
                              handleLessonChosen(selectedGrade, t.id, o.id)
                            }
                            aria-label={`Chơi ${o.name}`}
                          >
                            <span className="lesson-map-lesson-chip-label">
                              {o.name}
                            </span>
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
      )}
    </div>
      </div>
    </div>
  );
}
