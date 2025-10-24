import React from "react";
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "@/app/(tabs)/login";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const useRouterMock = useRouter as jest.Mock;
const useAuthMock = useAuth as jest.Mock;

describe("<LoginScreen />", () => {
  let replaceMock: jest.Mock;
  let pushMock: jest.Mock;

  beforeEach(() => {
    replaceMock = jest.fn();
    pushMock = jest.fn();
    useRouterMock.mockReturnValue({
      replace: replaceMock,
      push: pushMock,
    });
    useAuthMock.mockReturnValue({
      logIn: jest.fn(),
      profile: null,
      isLoggedIn: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("submits trimmed credentials and navigates on success", async () => {
    const logInMock = jest.fn().mockResolvedValue(true);
    useAuthMock.mockReturnValue({
      logIn: logInMock,
      profile: null,
      isLoggedIn: false,
    });

    const { getByPlaceholderText, getByRole } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Your name here"), "  user ");
    fireEvent.changeText(getByPlaceholderText("Enter your password"), " secret ");
    fireEvent.press(getByRole("button", { name: "Log in" }));

    await waitFor(() =>
      expect(logInMock).toHaveBeenCalledWith({
        username: "user",
        password: "secret",
      })
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/(tabs)/profile")
    );
  });

  test("shows error when credentials are rejected", async () => {
    const logInMock = jest.fn().mockResolvedValue(false);
    useAuthMock.mockReturnValue({
      logIn: logInMock,
      profile: null,
      isLoggedIn: false,
    });

    const { getByPlaceholderText, getByRole, findByText } = render(
      <LoginScreen />
    );

    fireEvent.changeText(getByPlaceholderText("Your name here"), "user");
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "secret");
    fireEvent.press(getByRole("button", { name: "Log in" }));

    expect(await findByText(/Incorrect username or password/)).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test("navigates to create account screen", () => {
    const { getByRole } = render(<LoginScreen />);

    fireEvent.press(getByRole("button", { name: "Create an account" }));

    expect(pushMock).toHaveBeenCalledWith("/(tabs)/create-account");
  });
});
