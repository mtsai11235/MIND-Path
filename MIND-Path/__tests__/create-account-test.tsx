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
import CreateAccountScreen from "@/app/(tabs)/create-account";
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

describe("<CreateAccountScreen />", () => {
  let replaceMock: jest.Mock;
  let backMock: jest.Mock;

  beforeEach(() => {
    replaceMock = jest.fn();
    backMock = jest.fn();
    useRouterMock.mockReturnValue({
      replace: replaceMock,
      back: backMock,
    });
    useAuthMock.mockReturnValue({
      createAccount: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("creates account with optional zipcode and redirects", async () => {
    const createAccountMock = jest.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      createAccount: createAccountMock,
    });

    const { getByPlaceholderText, getByRole } = render(
      <CreateAccountScreen />
    );

    fireEvent.changeText(getByPlaceholderText("Choose a username"), "  user ");
    fireEvent.changeText(getByPlaceholderText("Create a password"), " secret ");
    fireEvent.changeText(getByPlaceholderText("5-digit zip code"), " 12345 ");

    fireEvent.press(getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith({
        username: "user",
        password: "secret",
        zipcode: "12345",
        previousChatSessionIds: [],
        recommendedResourceIds: [],
        clinicIds: [],
      })
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/(tabs)/login")
    );
  });

  test("does not submit when username or password missing", () => {
    const createAccountMock = jest.fn();
    useAuthMock.mockReturnValue({
      createAccount: createAccountMock,
    });

    const { getByRole } = render(<CreateAccountScreen />);

    fireEvent.press(getByRole("button", { name: "Create account" }));

    expect(createAccountMock).not.toHaveBeenCalled();
  });

  test("navigates back to sign in", () => {
    const { getByRole } = render(<CreateAccountScreen />);

    fireEvent.press(
      getByRole("button", { name: "Already have an account? Sign in" })
    );

    expect(backMock).toHaveBeenCalled();
  });
});
