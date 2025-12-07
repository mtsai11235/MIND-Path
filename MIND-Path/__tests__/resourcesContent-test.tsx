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
import ResourcesContent from "@/app/(tabs)/resourcesContent";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { fetchResourcesForFuzzy, fetchSymptomSynonyms } from "@/utils/supabaseContent";

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...(actual as Record<string, any>),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utils/supabaseContent", () => ({
  __esModule: true,
  fetchResourcesForFuzzy: jest.fn(),
  fetchSymptomSynonyms: jest.fn(),
}));

const useAuthMock = useAuth as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const fetchResourcesForFuzzyMock = fetchResourcesForFuzzy as jest.MockedFunction<typeof fetchResourcesForFuzzy>;
const fetchSymptomSynonymsMock = fetchSymptomSynonyms as jest.MockedFunction<typeof fetchSymptomSynonyms>;

const baseProfile = {
  username: "sam",
  zipcode: "90210",
  previousChatSessionIds: [],
  recommendedResourceIds: [],
  clinicIds: [],
};

describe("<ResourcesContent />", () => {
  let pushMock: jest.Mock;
  let updateProfileMock: jest.Mock;

  beforeEach(() => {
    pushMock = jest.fn();
    updateProfileMock = jest.fn().mockResolvedValue(undefined);
    useRouterMock.mockReturnValue({
      push: pushMock,
    });
    fetchSymptomSynonymsMock.mockResolvedValue({
      anxiety: ["anxious", "panic"],
      insomnia: ["cant sleep", "sleep issues"],
    });
    fetchResourcesForFuzzyMock.mockResolvedValue([
      {
        id: "res-1",
        title: "Breathing 101",
        type: "article",
        org: "Mind Path",
        url: "example.com",
        symptom_tags: ["anxiety"],
        tags: ["sleep"],
      },
    ] as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const triggerSearch = async (value: string) => {
    const utils = render(<ResourcesContent />);
    fireEvent.changeText(
      utils.getByPlaceholderText(
        "Symptom (in English), e.g., anxiety / ocd / adhd"
      ),
      value
    );
    fireEvent.press(utils.getByText("Search"));
    await waitFor(() => expect(fetchResourcesForFuzzyMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(utils.getByText("Breathing 101")).toBeTruthy());
    return utils;
  };

  test("saves a resource to the profile", async () => {
    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      profile: { ...baseProfile },
      updateProfile: updateProfileMock,
    });

    const utils = await triggerSearch(" Anxiety ");

    fireEvent.press(utils.getByText("Save to profile"));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({
        recommendedResourceIds: ["res-1"],
      })
    );
  });

  test("removes a saved resource when toggled again", async () => {
    useAuthMock.mockReturnValue({
      isLoggedIn: true,
      profile: { ...baseProfile, recommendedResourceIds: ["res-1"] },
      updateProfile: updateProfileMock,
    });

    const utils = await triggerSearch("anxiety");

    fireEvent.press(utils.getByText("Saved to profile"));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith({
        recommendedResourceIds: [],
      })
    );
  });
});
