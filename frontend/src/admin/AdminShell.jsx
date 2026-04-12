import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminQuestions from "./pages/AdminQuestions";
import AdminQuestionCreate from "./pages/AdminQuestionCreate";
import AdminQuestionUpdate from "./pages/AdminQuestionUpdate";
import AdminGrades from "./pages/AdminGrades";
import AdminMathTypes from "./pages/AdminMathTypes";
import AdminContest from "./pages/AdminContest";
import AdminExams from "./pages/AdminExams";
import AdminExamCreate from "./pages/AdminExamCreate";
import AdminExamUpdate from "./pages/AdminExamUpdate";
import AdminUsers from "./pages/AdminUsers";
import AdminItems from "./pages/AdminItems";

/** Chunk admin — nested routes dưới /admin/* */
export default function AdminShell() {
  return (
    <ProtectedAdminRoute>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="questions/new" element={<AdminQuestionCreate />} />
          <Route path="questions/edit" element={<AdminQuestionUpdate />} />
          <Route path="questions" element={<AdminQuestions />} />
          <Route path="grades" element={<AdminGrades />} />
          <Route path="math-types" element={<AdminMathTypes />} />
          <Route path="lessons" element={<Navigate to="../math-types" replace />} />
          <Route path="operations" element={<Navigate to="../math-types" replace />} />
          <Route path="contest" element={<AdminContest />} />
          <Route path="exams/new" element={<AdminExamCreate />} />
          <Route path="exams/edit" element={<AdminExamUpdate />} />
          <Route path="exams" element={<AdminExams />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="items" element={<AdminItems />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </ProtectedAdminRoute>
  );
}
