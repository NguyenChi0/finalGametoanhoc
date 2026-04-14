import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, isAdminUser } from "../auth";
import { getAuthMe } from "../../api";

/**
 * Chỉ cho phép user đã đăng nhập có role === 1 (admin).
 * Không đăng nhập → /login. User thường → /
 */
export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [status, setStatus] = useState(token ? "checking" : "unauthenticated");
  const [serverUser, setServerUser] = useState(() => getStoredUser());

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus("unauthenticated");
      setServerUser(null);
      return;
    }
    getAuthMe()
      .then((data) => {
        if (cancelled) return;
        const nextUser = data?.user || null;
        if (!nextUser) {
          setStatus("unauthenticated");
          setServerUser(null);
          return;
        }
        localStorage.setItem("user", JSON.stringify(nextUser));
        setServerUser(nextUser);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setServerUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "checking") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#57606a" }}>
        Đang kiểm tra quyền truy cập…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdminUser(serverUser)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
