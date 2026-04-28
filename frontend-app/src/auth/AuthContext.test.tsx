import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const apiMock = vi.hoisted(() => ({
  getToken: vi.fn<() => string | null>(),
  getRefreshToken: vi.fn<() => string | null>(),
  getMe: vi.fn<() => Promise<{ login: string } | null>>(),
  login: vi.fn<() => Promise<{ access_token: string; refresh_token: string; account: { login: string } }>>(),
  setTokens: vi.fn<(access: string, refresh: string) => void>(),
  logoutRemote: vi.fn<() => Promise<void>>(),
  deleteToken: vi.fn<() => void>(),
}));

vi.mock("../lib/api", () => ({
  api: apiMock,
}));

function Probe() {
  const { isAuthenticated, account, error, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <div data-testid="account">{account?.login ?? "none"}</div>
      <div data-testid="error">{error ?? "none"}</div>
      <button type="button" onClick={() => void login("demo", "demo")}>
        do-login
      </button>
      <button type="button" onClick={() => void logout()}>
        do-logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    apiMock.getToken.mockReset();
    apiMock.getRefreshToken.mockReset();
    apiMock.getMe.mockReset();
    apiMock.login.mockReset();
    apiMock.setTokens.mockReset();
    apiMock.logoutRemote.mockReset();
    apiMock.deleteToken.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("restores session on bootstrap when refresh/getMe succeeds", async () => {
    apiMock.getToken.mockReturnValue(null);
    apiMock.getRefreshToken.mockReturnValue("refresh-token");
    apiMock.getMe.mockResolvedValue({ login: "restored" });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("account")).toHaveTextContent("restored");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("clears session when bootstrap sees expired session", async () => {
    apiMock.getToken.mockReturnValue("expired-token");
    apiMock.getRefreshToken.mockReturnValue("expired-refresh");
    apiMock.getMe.mockResolvedValue(null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
    });
    expect(apiMock.deleteToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("error")).toHaveTextContent("session_expired");
  });

  it("logs out cleanly via logout action", async () => {
    apiMock.getToken.mockReturnValue(null);
    apiMock.getRefreshToken.mockReturnValue(null);
    apiMock.getMe.mockResolvedValue(null);
    apiMock.login.mockResolvedValue({
      access_token: "a",
      refresh_token: "r",
      account: { login: "demo" },
    });
    apiMock.logoutRemote.mockResolvedValue();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "do-login" }));
    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("true");
    });

    await userEvent.click(screen.getByRole("button", { name: "do-logout" }));
    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
    });
    expect(apiMock.logoutRemote).toHaveBeenCalledTimes(1);
    expect(apiMock.deleteToken).toHaveBeenCalled();
  });
});
