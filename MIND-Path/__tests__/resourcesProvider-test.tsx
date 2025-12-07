import React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import ResourcesTab from "@/app/(tabs)/resourcesProvider";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { searchProvidersPagedGeoAware } from "@/utils/supabaseProvider";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utils/supabaseProvider", () => ({
  searchProvidersPagedGeoAware: jest.fn(),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 0 },
}));

const useAuthMock = useAuth as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const searchProvidersPagedGeoAwareMock =
  searchProvidersPagedGeoAware as jest.Mock;

const baseProfile = {
  username: "sam",
  zipcode: "02110",
  previousChatSessionIds: [],
  recommendedResourceIds: [],
  clinicIds: [],
};

const mockProviderRow = {
  provider_id: 123,
  basic_name: "Mindful Therapy",
  city: "Boston",
  state: "MA",
  phone: "555-123-4567",
  taxonomy_desc: null,
  specialty: "Therapy",
  enumeration_type: null,
  npi: null,
  updated_at: null,
  distance_m: null,
};

describe("<ResourcesTab /> provider save toggle", () => {
  let pushMock: jest.Mock;
  let updateProfileMock: jest.Mock;

  beforeEach(() => {
    pushMock = jest.fn();
    updateProfileMock = jest.fn().mockResolvedValue(undefined);
    useRouterMock.mockReturnValue({ push: pushMock });
    searchProvidersPagedGeoAwareMock.mockResolvedValue({
      rows: [mockProviderRow],
      total: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("saves a provider to the profile", async () => {
    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      profile: { ...baseProfile, clinicIds: [] },
      updateProfile: updateProfileMock,
    });

    const utils = render(<ResourcesTab />);

    await waitFor(() => expect(searchProvidersPagedGeoAwareMock).toHaveBeenCalled());
    await waitFor(() => expect(utils.getByText("Mindful Therapy")).toBeTruthy());

    fireEvent.press(utils.getByText("Save to profile"));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({ clinicIds: ["123"] })
    );
  });

  test("removes a saved provider when toggled", async () => {
    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      profile: { ...baseProfile, clinicIds: ["123"] },
      updateProfile: updateProfileMock,
    });

    const utils = render(<ResourcesTab />);

    await waitFor(() => expect(searchProvidersPagedGeoAwareMock).toHaveBeenCalled());
    await waitFor(() => expect(utils.getByText("Mindful Therapy")).toBeTruthy());

    fireEvent.press(utils.getByText("Saved to profile"));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({ clinicIds: [] })
    );
  });
});
