// src/App.js — code splitting: route-based lazy loading
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./users/components/navbar";

const Home = lazy(() => import("./users/pages/home"));
const Login = lazy(() => import("./users/pages/login"));
const Register = lazy(() => import("./users/pages/register"));
const Contest = lazy(() => import("./users/pages/contest"));
const ContestDetailPage = lazy(() => import("./users/pages/contestDetailPage"));
const GamePage = lazy(() => import("./users/pages/gamepage"));
const Profile = lazy(() => import("./users/pages/profile"));
const Shop = lazy(() => import("./users/pages/shop"));
const AdminShell = lazy(() => import("./admin/AdminShell"));

function PageFallback() {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        color: "#455a64",
        fontSize: "1rem",
      }}
    >
      Đang tải…
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const hideUserNavbar = location.pathname.startsWith("/admin");

  return (
    <>
      {!hideUserNavbar && <Navbar />}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contest" element={<Contest />} />
          <Route path="/contest/:contestId" element={<ContestDetailPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin/*" element={<AdminShell />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/gametoanhoc">
      <AppShell />
    </BrowserRouter>
  );
}
