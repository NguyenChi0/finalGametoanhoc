import React from "react";
import { Link } from "react-router-dom";
import { publicUrl } from "../../lib/publicUrl";

const BG1 = `${publicUrl}/component-images/home-s1.png`;
const BG2 = `${publicUrl}/component-images/home-s2.png`;
const BG3 = `${publicUrl}/component-images/home-s3.png`;
const BG4 = `${publicUrl}/component-images/home-s4.png`;
const BG5 = `${publicUrl}/component-images/home-s5.png`;
const FEEDBACK_BG = `${publicUrl}/component-images/home-feedback.png`;

const SERVICES = [
  {
    title: "Luyện bài",
    desc: "Làm bài theo khối, chủ đề và mức độ phù hợp.",
    image: `${publicUrl}/component-images/service-home/service1.png`,
  },
  {
    title: "Thi thử",
    desc: "Rèn tốc độ làm bài trong thời gian giới hạn.",
    image: `${publicUrl}/component-images/service-home/service2.png`,
  },
  {
    title: "Cá nhân hóa",
    desc: "Gợi ý bài học theo kết quả gần nhất.",
    image: `${publicUrl}/component-images/service-home/service3.png`,
  },
  {
    title: "Theo dõi tiến độ",
    desc: "Xem điểm số và sự tiến bộ mỗi ngày.",
    image: `${publicUrl}/component-images/service-home/service4.png`,
  },
];

const REVIEWS = [
  {
    name: "Học sinh lớp 6",
    quote: "Trang này giúp em vào học nhanh, làm bài dễ và không bị rối mắt.",
  },
  {
    name: "Phụ huynh",
    quote: "Bố cục rõ ràng, con tôi tự học được và có động lực hơn mỗi ngày.",
  },
  {
    name: "Giáo viên",
    quote: "Rất tiện để giao bài, ôn tập và theo dõi kết quả luyện tập của học sinh.",
  },
];

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-session home-session--hero home-session--solid" style={{ backgroundImage: `url(${BG1})` }}>
        <div className="home-session__inner home-session__inner--hero home-session__inner--text-left">
          <div className="home-hero-copy">
            <p className="home-hero-kicker">Welcome to the fun world of learning</p>
            <h1>be kind<br />with kids</h1>
            <p className="home-hero-desc">
              Chào mừng bạn đến với không gian học toán thân thiện, sinh động và dễ tiếp cận.
              Học sinh có thể chọn khối, luyện bài, xem kết quả và tiếp tục tiến bộ mỗi ngày.
            </p>
            <div className="home-actions">
              <Link to="/lessons" className="home-btn home-btn--primary">
                Explore platform
              </Link>
              <Link to="/contest" className="home-btn home-btn--secondary">
                Join a challenge
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-session home-session--about" style={{ backgroundImage: `url(${BG2})` }}>
        <div className="home-session__inner home-session__inner--about home-session__inner--text-left">
          <div className="home-panel home-panel--transparent home-panel--left">
            <h2>Hệ thống học tập rõ ràng, vui tươi và phù hợp cho từng học sinh</h2>
            <p>
              Giao diện được thiết kế theo phong cách nhẹ nhàng, giúp học sinh tập trung vào nội
              dung học tập. Mọi chức năng đều được sắp xếp trực quan để vào học nhanh, làm bài dễ
              và theo dõi kết quả thuận tiện.
            </p>
          </div>
        </div>
      </section>

      <section className="home-session home-session--services" style={{ backgroundImage: `url(${BG3})` }}>
        <div className="home-session__inner home-session__inner--stack home-session__inner--features">
          <div className="home-title-block home-title-block--features">
            <h2>Những tính năng chính của hệ thống</h2>
          </div>
          <div className="home-service-grid">
            {SERVICES.map((item) => (
              <article key={item.title} className="home-service-card">
                <img className="home-service-image" src={item.image} alt={item.title} />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-session home-session--reviews" style={{ backgroundImage: `url(${BG4})` }}>
        <div className="home-session__inner home-session__inner--stack home-session__inner--feedback">
          <div className="home-title-block home-title-block--light home-title-block--feedback">
            <h2>Người dùng nói gì về trải nghiệm?</h2>
          </div>
          <div className="home-review-grid">
            {REVIEWS.map((item) => (
              <article
                key={item.name}
                className="home-review-card"
                style={{ backgroundImage: `url(${FEEDBACK_BG})` }}
              >
                <p className="home-review-quote">"{item.quote}"</p>
                <strong className="home-review-author">{item.name}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-session home-session--footer" style={{ backgroundImage: `url(${BG5})` }}>
        <div className="home-session__inner home-session__inner--stack home-footer-inner">
          <div className="home-footer-left">
            <h2>Sẵn sàng để học toán theo cách vui vẻ hơn?</h2>
            <p>
              Bắt đầu ngay để khám phá bài học, thử sức với các thử thách mới và xây dựng thói
              quen học tập hiệu quả hơn.
            </p>
            <div className="home-actions">
              <Link to="/lessons" className="home-btn home-btn--primary">
                Vào học ngay
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .home-page {
          width: 100%;
          overflow-x: hidden;
          color: #3f423a;
        }
        .home-session {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          min-height: 100vh;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
        }
        .home-session::before {
          content: none;
        }
        .home-session__inner {
          position: relative;
          z-index: 1;
          max-width: 1180px;
          min-height: inherit;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          padding: 40px 16px;
        }
        .home-session__inner--hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          align-items: center;
          padding-top: calc(40px + var(--navbar-height, 76px));
        }
        .home-session__inner--text-left {
          justify-content: flex-start;
        }
        .home-session__inner--left {
          justify-content: flex-start;
        }
        .home-session__inner--stack {
          flex-direction: column;
          justify-content: center;
        }
        .home-hero-copy {
          max-width: 470px;
        }
        .home-hero-kicker,
        .home-section-label {
          margin: 0 0 12px;
          font-size: 0.95rem;
          font-weight: 700;
          color: #4e5842;
        }
        .home-hero-copy h1 {
          margin: 0;
          font-family: inherit;
          font-size: clamp(3.4rem, 7vw, 6rem);
          line-height: 0.9;
          letter-spacing: -0.06em;
          font-weight: 700;
          color: #454038;
        }
        .home-hero-desc,
        .home-panel p,
        .home-footer-left p {
          margin: 18px 0 0;
          color: #59624e;
          line-height: 1.8;
          font-size: 1rem;
        }
        .home-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 22px;
        }
        .home-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 170px;
          padding: 14px 22px;
          border-radius: 16px;
          text-decoration: none;
          font-weight: 800;
          font-size: 0.98rem;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        .home-btn:hover {
          transform: translateY(-1px);
          opacity: 0.96;
        }
        .home-btn--primary {
          background: #9ebc88;
          color: #fff;
        }
        .home-btn--secondary {
          background: rgba(255, 255, 255, 0.9);
          color: #55604f;
        }
        .home-hero-art {
          position: relative;
          min-height: 600px;
        }
        .hero-cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.55);
          border-radius: 999px;
        }
        .hero-cloud::before,
        .hero-cloud::after {
          content: "";
          position: absolute;
          background: inherit;
          border-radius: 999px;
        }
        .hero-cloud--1 {
          width: 120px;
          height: 60px;
          right: 4%;
          top: 2%;
        }
        .hero-cloud--1::before { width: 52px; height: 52px; left: 18px; top: -18px; }
        .hero-cloud--1::after { width: 66px; height: 66px; right: 12px; top: -24px; }
        .hero-cloud--2 {
          width: 110px;
          height: 54px;
          left: 44%;
          top: 7%;
        }
        .hero-cloud--2::before { width: 48px; height: 48px; left: 14px; top: -16px; }
        .hero-cloud--2::after { width: 58px; height: 58px; right: 10px; top: -18px; }
        .hero-cloud--3 {
          width: 72px;
          height: 38px;
          right: 23%;
          top: 20%;
        }
        .hero-sun {
          position: absolute;
          left: 44%;
          top: 16%;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #f5d4bb;
          border: 2px solid rgba(71, 74, 65, 0.85);
          box-shadow: 0 0 0 10px rgba(245, 212, 187, 0.25);
        }
        .hero-duck {
          position: absolute;
          right: 16%;
          top: 26%;
          width: 52px;
          height: 28px;
          border: 2px solid rgba(71, 74, 65, 0.85);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
        }
        .hero-duck::before {
          content: "";
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          left: -10px;
          top: -6px;
          border: 2px solid rgba(71, 74, 65, 0.85);
          background: rgba(255, 255, 255, 0.92);
        }
        .hero-duck::after {
          content: "";
          position: absolute;
          right: -8px;
          top: 10px;
          width: 12px;
          height: 8px;
          border-radius: 999px 999px 999px 0;
          background: #f0a97a;
          border: 2px solid rgba(71, 74, 65, 0.85);
          transform: rotate(-8deg);
        }
        .hero-cat {
          position: absolute;
          left: 48%;
          top: 31%;
          width: 24px;
          height: 34px;
          border: 2px solid rgba(71, 74, 65, 0.85);
          border-radius: 999px 999px 8px 8px;
          background: rgba(255, 248, 238, 0.92);
        }
        .hero-cat::before,
        .hero-cat::after {
          content: "";
          position: absolute;
          top: -7px;
          width: 8px;
          height: 10px;
          border: 2px solid rgba(71, 74, 65, 0.85);
          background: rgba(255, 248, 238, 0.92);
        }
        .hero-cat::before { left: 1px; transform: rotate(-20deg); border-radius: 3px; }
        .hero-cat::after { right: 1px; transform: rotate(20deg); border-radius: 3px; }
        .hero-cat::marker { display: none; }
        .hero-hill {
          position: absolute;
          left: 0;
          right: 0;
          border-radius: 50% 50% 0 0;
        }
        .hero-hill--back {
          bottom: 150px;
          height: 210px;
          background: #9ebc88;
          opacity: 0.95;
        }
        .hero-hill--front {
          bottom: 0;
          height: 250px;
          background: #cfe0ad;
        }
        .hero-house {
          position: absolute;
          right: 26%;
          bottom: 160px;
          width: 130px;
          height: 160px;
        }
        .hero-house__roof {
          position: absolute;
          left: 18px;
          top: 0;
          width: 95px;
          height: 95px;
          transform: rotate(45deg);
          border-radius: 18px;
          background: #f8f5ef;
          border: 2px solid rgba(71, 74, 65, 0.85);
        }
        .hero-house__body {
          position: absolute;
          left: 32px;
          bottom: 8px;
          width: 70px;
          height: 92px;
          border-radius: 18px 18px 12px 12px;
          background: #f8f5ef;
          border: 2px solid rgba(71, 74, 65, 0.85);
        }
        .hero-people {
          position: absolute;
          left: 33%;
          bottom: 92px;
          width: 280px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .hero-person {
          display: block;
          width: 28px;
          border: 2px solid rgba(71, 74, 65, 0.85);
          border-radius: 999px;
          position: relative;
        }
        .hero-person::before {
          content: "";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: -22px;
          width: 26px;
          height: 26px;
          border: 2px solid rgba(71, 74, 65, 0.85);
          border-radius: 999px;
          background: #fff4e6;
        }
        .hero-person--pink { height: 56px; background: #f3c5d7; }
        .hero-person--peach { height: 70px; background: #f3dbc5; }
        .hero-person--blue { height: 48px; background: #d9ecf8; }

        .home-panel,
        .home-service-card,
        .home-footer-left {
          max-width: 560px;
          border-radius: 24px;
          box-shadow: 0 16px 36px rgba(74, 80, 128, 0.08);
        }
        .home-panel {
          padding: 0;
        }
        .home-panel--transparent,
        .home-footer-left {
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: none;
          box-shadow: none;
        }
        .home-panel--right {
          max-width: 620px;
          margin-left: auto;
          text-align: left;
        }
        .home-panel h2,
        .home-title-block h2,
        .home-footer-left h2 {
          transform: translateY(-10vh);
          margin: 0 0 12px;
          font-family: inherit;
          font-size: clamp(2rem, 4.8vw, 4rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
          font-weight: 700;
          color: #454038;
        }
        .home-panel p,
        .home-title-block + .home-service-grid,
        .home-footer-left p {
          transform: translateY(-10vh);
        }
        .home-title-block {
          text-align: center;
          margin-bottom: 22px;
        }
        .home-title-block--light h2,
        .home-title-block--light .home-section-label,
        .home-section-label--light {
          color: #f4f0e8;
        }
        .home-service-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
        }
        .home-service-card {
          padding: 20px 12px;
          text-align: center;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .home-service-image {
          width: 200px;
          height: 200px;
          display: block;
          margin: 0 auto 16px;
          object-fit: contain;
        }
        .home-service-card h3 {
          margin: 0 0 10px;
          font-size: 1.08rem;
          color: #454038;
        }
        .home-service-card h3 {
          font-size: 1.2rem;
        }
        .home-service-card p,
        .home-footer-left p {
          margin: 0;
          color: #59624e;
          line-height: 1.7;
        }
        .home-session--reviews::before {
          background: rgba(103, 153, 109, 0.18);
        }
        .home-session__inner--feedback {
          gap: 40px;
        }
        .home-title-block--feedback {
          margin-bottom: 0;
          width: 100%;
        }
        .home-title-block--feedback h2 {
          transform: none;
          margin: 0;
        }
        .home-title-block--feedback .home-section-label {
          margin-bottom: 12px;
        }
        .home-review-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
          align-items: stretch;
        }
        .home-review-card {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 280px;
          padding: 48px 36px 40px;
          background-size: 100% 100%;
          background-position: center;
          background-repeat: no-repeat;
          border: none;
          box-shadow: none;
        }
        .home-review-quote {
          margin: 0 0 14px;
          font-style: italic;
          color: #454038;
          line-height: 1.65;
          font-size: 0.98rem;
        }
        .home-review-author {
          display: block;
          margin: 0;
          font-size: 1rem;
          color: #4e5842;
        }
        .home-session--services {
          min-height: auto;
        }
        .home-session--services::before {
          background: rgba(223, 232, 176, 0.08);
        }
        .home-session__inner--features {
          min-height: auto;
          justify-content: flex-start;
          padding: 56px 16px 64px;
        }
        .home-title-block--features {
          margin-bottom: 32px;
        }
        .home-title-block--features h2 {
          transform: translateY(-10vh);
          margin: 0;
        }
        .home-title-block--features + .home-service-grid {
          transform: translateY(-10vh);
        }
        .home-session--about::before {
          background: rgba(223, 232, 176, 0.04);
        }
        .home-session--footer::before {
          background: rgba(223, 232, 176, 0.08);
        }
        .home-footer-inner {
          align-items: flex-start;
          justify-content: center;
        }
        .home-footer-left {
          padding: 28px;
          max-width: 620px;
        }

        @media (max-width: 1100px) {
          .home-session__inner--hero {
            grid-template-columns: 1fr;
          }
          .home-service-grid,
          .home-review-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .home-hero-copy,
          .home-panel--right {
            max-width: 100%;
          }
        }
        @media (max-width: 768px) {
          .home-session {
            min-height: auto;
          }
          .home-session__inner {
            padding: 28px 12px;
          }
          .home-session__inner--hero {
            gap: 18px;
          }
          .home-hero-copy h1 {
            font-size: clamp(3rem, 15vw, 4.4rem);
          }
          .home-hero-art {
            min-height: 420px;
          }
          .home-service-grid,
          .home-review-grid {
            grid-template-columns: 1fr;
          }
          .home-service-image {
            width: 160px;
            height: 160px;
          }
          .home-session__inner--features {
            padding: 40px 12px 48px;
          }
          .home-actions {
            flex-direction: column;
          }
          .home-btn {
            width: 100%;
          }
          .home-panel,
          .home-footer-left,
          .home-service-card {
            border-radius: 20px;
          }
        }
      `}</style>
    </div>
  );
}
