import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

const PROFILE_KEY = "mind_path_user_profile";

type UserProfile = {
  username: string;
  password: string;
  zipcode: string;
  previousChatSessionIds: string[];
  recommendedResourceIds: string[];
  clinicIds: string[];
};

type AuthContextValue = {
  isLoggedIn: boolean;
  loadingProfile: boolean;
  profile: UserProfile | null;
  createAccount: (profileData: UserProfile) => Promise<void>;
  logIn: (credentials: { username: string; password: string }) => Promise<boolean>;
  logOut: () => Promise<void>;
  updateProfile: (profileUpdates: Partial<UserProfile>) => Promise<void>;
};

const EMPTY_PROFILE: UserProfile = {
  username: "",
  password: "",
  zipcode: "",
  previousChatSessionIds: [],
  recommendedResourceIds: [],
  clinicIds: [],
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const persistProfile = useCallback(async (nextProfile: UserProfile) => {
    try {
      await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(nextProfile));
    } catch (error) {
      console.warn("Failed to persist user profile", error);
    }
  }, []);

  const readStoredProfile = useCallback(async () => {
    try {
      let storedProfile = await SecureStore.getItemAsync(PROFILE_KEY);
      if (storedProfile) {
        await persistProfile(JSON.parse(storedProfile) as UserProfile);
      }
      if (!storedProfile) return null;
      return JSON.parse(storedProfile) as UserProfile;
    } catch (error) {
      console.warn("Failed to read stored user profile", error);
      return null;
    }
  }, [persistProfile]);

  useEffect(() => {
    let isMounted = true;

    const restoreProfile = async () => {
      try {
        const parsedProfile = await readStoredProfile();
        if (parsedProfile && isMounted) {
          setProfile(parsedProfile);
        }
      } catch (error) {
        console.warn("Failed to restore user profile", error);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, [readStoredProfile]);

  const createAccount = useCallback(
    async (profileData: UserProfile) => {
      setProfile(profileData);
      setIsLoggedIn(true);
      await persistProfile(profileData);
    },
    [persistProfile]
  );

  const logIn = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const storedProfile = profile ?? (await readStoredProfile());

      if (!storedProfile) {
        return false;
      }

      const usernameMatches =
        storedProfile.username.trim().toLowerCase() === username.trim().toLowerCase();
      const passwordMatches = storedProfile.password === password;

      if (!usernameMatches || !passwordMatches) {
        return false;
      }

      setProfile(storedProfile);
      setIsLoggedIn(true);
      return true;
    },
    [profile, readStoredProfile]
  );

  const logOut = useCallback(async () => {
    setIsLoggedIn(false);
  }, []);

  const updateProfile = useCallback(
    async (profileUpdates: Partial<UserProfile>) => {
      const currentProfile = profile ?? EMPTY_PROFILE;
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...profileUpdates,
      };

      setProfile(updatedProfile);
      await persistProfile(updatedProfile);
    },
    [persistProfile, profile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn,
      loadingProfile,
      profile,
      createAccount,
      logIn,
      logOut,
      updateProfile,
    }),
    [profile, loadingProfile, createAccount, logIn, logOut, updateProfile, isLoggedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
