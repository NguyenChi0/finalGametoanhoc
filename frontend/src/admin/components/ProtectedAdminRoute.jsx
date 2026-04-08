import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, isAdminUser } from "../auth";

/**
 * Chỉ cho phép user đã đăng nhập có role === 1 (admin).
 * Không đăng nhập → /login. User thường → /
 */
export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
