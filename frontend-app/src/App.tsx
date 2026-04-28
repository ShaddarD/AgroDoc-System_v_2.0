import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

function ApplicationDetailRoute() {
  const { id } = useParams();
  return <ApplicationDetailPage key={id ?? ""} />;
}

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="applications"
          element={
            <RequireAuth>
              <ApplicationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="applications/:id"
          element={
            <RequireAuth>
              <ApplicationDetailRoute />
            </RequireAuth>
          }
        />
        <Route
          path="password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
