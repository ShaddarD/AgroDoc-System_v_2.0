import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "./RequireAuth";

const useAuthMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function LoginProbe() {
  const location = useLocation();
  const state = location.state as { from?: string; reason?: string } | null;
  return (
    <div>
      <div data-testid="path">{location.pathname}</div>
      <div data-testid="from">{state?.from ?? "none"}</div>
      <div data-testid="reason">{state?.reason ?? "none"}</div>
    </div>
  );
}

describe("RequireAuth", () => {
  it("redirects to login with full return path and reason", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      error: "session_expired",
    });

    render(
      <MemoryRouter initialEntries={["/applications/123?tab=audit#v2"]}>
        <Routes>
          <Route
            path="/applications/:id"
            element={
              <RequireAuth>
                <div>protected</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("path")).toHaveTextContent("/login");
    expect(screen.getByTestId("from")).toHaveTextContent("/applications/123?tab=audit#v2");
    expect(screen.getByTestId("reason")).toHaveTextContent("session_expired");
  });
});
