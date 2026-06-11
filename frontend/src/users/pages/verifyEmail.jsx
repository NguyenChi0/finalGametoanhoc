import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

/** Redirect trang verify-email cũ sang trang nhập OTP (bắt buộc có email). */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = (searchParams.get("email") || "").trim();
  if (!email) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Navigate to={`/verify-email-pending?email=${encodeURIComponent(email)}`} replace />
  );
}
