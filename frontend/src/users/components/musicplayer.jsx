// src/components/musicplayer.jsx
import React, { useEffect, useState, useRef } from "react";
import api, { getMusicList } from "../../api";
import { publicUrl } from "../../lib/publicUrl";

export default function MusicPlayer() {
  const [musicList, setMusicList] = useState([]);
  const [current, setCurrent] = useState(null);
  const audioRef = useRef(null);

  // Origin backend (nếu cần fallback dùng backend)
  const API_ORIGIN = (() => {
    const base = api?.defaults?.baseURL || import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
    return base.replace(/\/api\/?$/, "");
  })();

  // PUBLIC URL (create-react-app: public files served from root)
  const PUBLIC_PREFIX = publicUrl;

  useEffect(() => {
    let mounted = true;
    getMusicList()
      .then((data) => {
        if (mounted) setMusicList(data || []);
      })
      .catch((err) => {
        console.error("Lỗi lấy danh sách nhạc:", err);
      });
    return () => (mounted = false);
  }, []);

  const makeSrc = (link) => {
    if (!link) return "";
    // absolute URL => return luôn
    if (/^https?:\/\//i.test(link)) return link;

    // nếu link là chỉ file name như "song.mp3"
    if (!link.includes("/")) {
      return `${PUBLIC_PREFIX || ""}/music/${link}`;
    }

    // nếu link bắt đầu bằng "music/..." hoặc "/music/..." => phục vụ từ public
    if (/^\/?music\//i.test(link)) {
      const clean = link.startsWith("/") ? link : `/${link}`;
      return `${PUBLIC_PREFIX}${clean}`;
    }

    // nếu link bắt đầu bằng "/" (nhưng không phải /music) -> coi là path tuyệt đối trên host frontend
    if (link.startsWith("/")) {
      return link; // ví dụ "/uploads/song.mp3" — có thể server frontend hoặc reverse proxy phục vụ
    }

    // fallback: ghép với API origin (cho trường hợp file lưu trên backend)
    const cleanLink = link.startsWith("/") ? link : `/${link}`;
    return `${API_ORIGIN}${cleanLink}`;
  };

  const handleSelect = (music) => {
    setCurrent(music);
    if (!audioRef.current) return;

    const src = makeSrc(music.link || music.filename || music.path || "");
    console.log("Resolved audio src:", src); // <-- mở devtools để kiểm tra
    audioRef.current.pause();
    audioRef.current.src = src;
    // force reload source
    try {
      audioRef.current.load();
    } catch (e) {
      // ignore
    }
    audioRef.current
      .play()
      .catch((err) => {
        // autoplay có thể bị chặn — vẫn ok, user có thể bấm play
        console.warn("Audio play prevented:", err);
      });
  };

  const handleEnded = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <select
        onChange={(e) =>
          handleSelect(musicList.find((m) => m.id === Number(e.target.value)))
        }
        value={current?.id || ""}
        style={{
          padding: "4px 2px",
          borderRadius: 4,
          border: "1px solid #ccc",
          background: "#fff",
        }}
      >
        <option value="">🎶</option>
        {musicList.map((music) => (
          <option key={music.id} value={music.id}>
            {music.name}
          </option>
        ))}
      </select>

      <audio
        ref={audioRef}
        controls
        onEnded={handleEnded}
        style={{ height: 30, width: 100 }}
      />
    </div>
  );
}
