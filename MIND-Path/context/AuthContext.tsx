import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import * as ExpoCrypto from "expo-crypto";
import { pbkdf2Async } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils";
import { Platform } from "react-native";

const PROFILE_STORAGE_KEY = "mind_path_user_profile";
const PBKDF2_ITERATIONS = Platform.OS === "web" ? 120_000 : 20_000;
const PBKDF2_ASYNC_TICK = Platform.OS === "web" ? 200 : 400;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;
const ENCRYPTION_VERSION = 1 as const;
const PROFILE_STORE_SCHEMA_VERSION = 2 as const;

type StoredUserProfile = {
  username: string;
  zipcode: string;
  previousChatSessionIds: string[];
  recommendedResourceIds: string[];
  clinicIds: string[];
  appointmentsByProvider: Record<string, StoredAppointment[]>;
};

type StoredAppointment = {
  id: string;
  title: string;
  when: string;
  startAt?: string | null;
  notes?: string | null;
  calendarEventId?: string | null;
  calendarId?: string | null;
};

type CreateAccountPayload = StoredUserProfile & {
  password: string;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  loadingProfile: boolean;
  profile: StoredUserProfile | null;
  createAccount: (profileData: CreateAccountPayload) => Promise<void>;
  logIn: (credentials: { username: string; password: string }) => Promise<boolean>;
  logOut: () => Promise<void>;
  updateProfile: (profileUpdates: Partial<StoredUserProfile>) => Promise<void>;
};

const EMPTY_PROFILE: StoredUserProfile = {
  username: "",
  zipcode: "",
  previousChatSessionIds: [],
  recommendedResourceIds: [],
  clinicIds: [],
  appointmentsByProvider: {},
};

type EncryptedProfileRecord = {
  version: typeof ENCRYPTION_VERSION;
  salt: string;
  nonce: string;
  ciphertext: string;
};

type LegacyStoredProfile = CreateAccountPayload;

type ProfileStorePayload = {
  schemaVersion: typeof PROFILE_STORE_SCHEMA_VERSION;
  profiles: Record<string, EncryptedProfileRecord>;
  legacyRecords?: EncryptedProfileRecord[];
  legacyPlainProfiles?: LegacyStoredProfile[];
};

type BrowserStorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

type SubtleCryptoLike = {
  importKey(
    format: "raw",
    keyData: Uint8Array,
    algorithm: string | { name: string },
    extractable: boolean,
    keyUsages: string[]
  ): Promise<unknown>;
  deriveBits(
    algorithm: {
      name: string;
      salt: Uint8Array;
      iterations: number;
      hash: string | { name: string };
    },
    baseKey: unknown,
    length: number
  ): Promise<ArrayBuffer>;
};

function normalizeProfile(data: Partial<StoredUserProfile>): StoredUserProfile {
  return {
    username: data.username ?? "",
    zipcode: data.zipcode ?? "",
    previousChatSessionIds: data.previousChatSessionIds ?? [],
    recommendedResourceIds: data.recommendedResourceIds ?? [],
    clinicIds: data.clinicIds ?? [],
    appointmentsByProvider: data.appointmentsByProvider ?? {},
  };
}

function normalizeUsernameKey(username: string) {
  return username.trim().toLowerCase();
}

function createEmptyStorePayload(): ProfileStorePayload {
  return {
    schemaVersion: PROFILE_STORE_SCHEMA_VERSION,
    profiles: {},
    legacyRecords: [],
    legacyPlainProfiles: [],
  };
}

function isProfileStorePayload(value: unknown): value is ProfileStorePayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<ProfileStorePayload>;
  const profiles = (record as { profiles?: unknown }).profiles;
  return (
    record.schemaVersion === PROFILE_STORE_SCHEMA_VERSION &&
    profiles !== null &&
    typeof profiles === "object" &&
    !Array.isArray(profiles)
  );
}

function parseProfileStorePayload(rawValue: string | null): ProfileStorePayload {
  if (!rawValue) {
    return createEmptyStorePayload();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    console.warn("Stored profile payload was not valid JSON", error);
    return createEmptyStorePayload();
  }

  if (isProfileStorePayload(parsed)) {
    return {
      schemaVersion: PROFILE_STORE_SCHEMA_VERSION,
      profiles: { ...(parsed.profiles ?? {}) },
      legacyRecords: [...(parsed.legacyRecords ?? [])],
      legacyPlainProfiles: [...(parsed.legacyPlainProfiles ?? [])],
    };
  }

  if (isEncryptedRecord(parsed)) {
    return {
      schemaVersion: PROFILE_STORE_SCHEMA_VERSION,
      profiles: {},
      legacyRecords: [parsed],
      legacyPlainProfiles: [],
    };
  }

  if (isLegacyProfile(parsed)) {
    return {
      schemaVersion: PROFILE_STORE_SCHEMA_VERSION,
      profiles: {},
      legacyRecords: [],
      legacyPlainProfiles: [parsed],
    };
  }

  return createEmptyStorePayload();
}

function removeIndex<T>(input: readonly T[] | undefined, index: number): T[] {
  if (!input || input.length === 0) {
    return [];
  }
  return input.filter((_, idx) => idx !== index);
}

type RandomSource = {
  getRandomValues?: (buffer: Uint8Array) => Uint8Array | void;
};

function getBrowserStorage(): BrowserStorageLike | null {
  try {
    const candidate = (globalThis as { localStorage?: BrowserStorageLike }).localStorage;
    if (
      candidate &&
      typeof candidate.getItem === "function" &&
      typeof candidate.setItem === "function"
    ) {
      return candidate;
    }
  } catch {
    // Ignore environments that do not expose localStorage (e.g., Node tests).
  }
  return null;
}

function getSubtleCrypto(): SubtleCryptoLike | null {
  const globalCrypto = (globalThis as { crypto?: { subtle?: SubtleCryptoLike } }).crypto;
  if (globalCrypto && typeof globalCrypto.subtle !== "undefined" && globalCrypto.subtle) {
    return globalCrypto.subtle;
  }
  return null;
}

async function getSecureRandomBytes(byteCount: number): Promise<Uint8Array> {
  if (typeof ExpoCrypto.getRandomBytesAsync === "function") {
    return ExpoCrypto.getRandomBytesAsync(byteCount);
  }

  const webCrypto = (globalThis as { crypto?: RandomSource }).crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const buffer = new Uint8Array(byteCount);
    webCrypto.getRandomValues(buffer);
    return buffer;
  }

  throw new Error("Secure random byte generation is unavailable");
}

async function deriveKey(password: string, saltBytes: Uint8Array): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  if (subtle) {
    const baseKey = await subtle.importKey("raw", utf8ToBytes(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const derivedBits = await subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      KEY_LENGTH * 8
    );
    return new Uint8Array(derivedBits);
  }

  return pbkdf2Async(sha256, utf8ToBytes(password), saltBytes, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH,
    asyncTick: PBKDF2_ASYNC_TICK,
  });
}

async function encryptProfileWithKey(
  key: Uint8Array,
  profile: StoredUserProfile
): Promise<{ nonceHex: string; ciphertextHex: string }> {
  const nonce = await getSecureRandomBytes(NONCE_LENGTH);
  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = utf8ToBytes(JSON.stringify(profile));
  const ciphertext = cipher.encrypt(plaintext);
  plaintext.fill(0);
  return { nonceHex: bytesToHex(nonce), ciphertextHex: bytesToHex(ciphertext) };
}

function decryptProfileWithKey(
  key: Uint8Array,
  record: EncryptedProfileRecord
): StoredUserProfile | null {
  try {
    const nonce = hexToBytes(record.nonce);
    const ciphertext = hexToBytes(record.ciphertext);
    const cipher = xchacha20poly1305(key, nonce);
    const plaintext = cipher.decrypt(ciphertext);
    const parsed = JSON.parse(bytesToUtf8(plaintext)) as StoredUserProfile;
    return normalizeProfile(parsed);
  } catch {
    return null;
  }
}

function isEncryptedRecord(value: unknown): value is EncryptedProfileRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<EncryptedProfileRecord>;
  return (
    record.version === ENCRYPTION_VERSION &&
    typeof record.salt === "string" &&
    typeof record.nonce === "string" &&
    typeof record.ciphertext === "string"
  );
}

function isLegacyProfile(value: unknown): value is LegacyStoredProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<LegacyStoredProfile>;
  return (
    typeof record.username === "string" &&
    typeof record.password === "string" &&
    typeof record.zipcode === "string" &&
    Array.isArray(record.previousChatSessionIds) &&
    Array.isArray(record.recommendedResourceIds) &&
    Array.isArray(record.clinicIds)
  );
}

async function buildEncryptedRecordFromKey(
  profile: StoredUserProfile,
  key: Uint8Array,
  saltHex: string
): Promise<EncryptedProfileRecord> {
  const { nonceHex, ciphertextHex } = await encryptProfileWithKey(key, profile);
  return {
    version: ENCRYPTION_VERSION,
    salt: saltHex,
    nonce: nonceHex,
    ciphertext: ciphertextHex,
  };
}

async function buildEncryptedRecordFromPassword(
  password: string,
  profile: StoredUserProfile
) {
  const saltBytes = await getSecureRandomBytes(SALT_LENGTH);
  const saltHex = bytesToHex(saltBytes);
  const key = await deriveKey(password, saltBytes);
  const record = await buildEncryptedRecordFromKey(profile, key, saltHex);
  return { record, key, saltHex };
}

function clearDerivedKey(ref: React.MutableRefObject<Uint8Array | null>) {
  if (ref.current) {
    ref.current.fill(0);
    ref.current = null;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StoredUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const derivedKeyRef = useRef<Uint8Array | null>(null);
  const saltHexRef = useRef<string | null>(null);
  const activeUsernameKeyRef = useRef<string | null>(null);
  const secureStoreAvailableRef = useRef<boolean | null>(null);
  const fallbackStorageRef = useRef<string | null>(null);

  const ensureSecureStoreAvailability = useCallback(async () => {
    if (secureStoreAvailableRef.current !== null) {
      return secureStoreAvailableRef.current;
    }

    try {
      const available = await SecureStore.isAvailableAsync();
      secureStoreAvailableRef.current = available;
      return available;
    } catch (error) {
      console.warn("SecureStore availability check failed", error);
      secureStoreAvailableRef.current = false;
      return false;
    }
  }, []);

  const readEncryptedProfilePayload = useCallback(async () => {
    const useSecureStore = await ensureSecureStoreAvailability();
    if (useSecureStore) {
      try {
        const value = await SecureStore.getItemAsync(PROFILE_STORAGE_KEY);
        if (value !== null) {
          fallbackStorageRef.current = value;
        }
        return value;
      } catch (error) {
        console.warn("Failed to read encrypted profile from SecureStore", error);
      }
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      try {
        const value = browserStorage.getItem(PROFILE_STORAGE_KEY);
        if (value !== null) {
          fallbackStorageRef.current = value;
        }
        return value;
      } catch (error) {
        console.warn("Failed to read encrypted profile from browser storage", error);
      }
    }

    return fallbackStorageRef.current;
  }, [ensureSecureStoreAvailability]);

  const writeProfileStore = useCallback(
    async (store: ProfileStorePayload) => {
      const toPersist: ProfileStorePayload = {
        schemaVersion: PROFILE_STORE_SCHEMA_VERSION,
        profiles: store.profiles ?? {},
        legacyRecords: store.legacyRecords ?? [],
        legacyPlainProfiles: store.legacyPlainProfiles ?? [],
      };
      const payload = JSON.stringify(toPersist);
      fallbackStorageRef.current = payload;

      const useSecureStore = await ensureSecureStoreAvailability();
      if (useSecureStore) {
        try {
          await SecureStore.setItemAsync(PROFILE_STORAGE_KEY, payload);
          return;
        } catch (error) {
          console.warn("Failed to persist encrypted user profile", error);
        }
      }

      const browserStorage = getBrowserStorage();
      if (browserStorage) {
        try {
          browserStorage.setItem(PROFILE_STORAGE_KEY, payload);
          return;
        } catch (error) {
          console.warn("Failed to persist encrypted profile to browser storage", error);
        }
      }

      // At this point the payload is only retained in-memory via fallbackStorageRef.
    },
    [ensureSecureStoreAvailability]
  );

  const loadProfileStore = useCallback(async () => {
    const rawValue = await readEncryptedProfilePayload();
    return parseProfileStorePayload(rawValue);
  }, [readEncryptedProfilePayload]);

  const persistEncryptedProfile = useCallback(
    async (
      profileData: StoredUserProfile,
      overrideKey?: Uint8Array | null,
      overrideSaltHex?: string | null
    ) => {
      const usernameKey =
        normalizeUsernameKey(profileData.username) || activeUsernameKeyRef.current;
      if (!usernameKey) {
        console.warn("Persist skipped: missing username key");
        return;
      }

      const activeKey = overrideKey ?? derivedKeyRef.current;
      const activeSaltHex = overrideSaltHex ?? saltHexRef.current;

      if (!activeKey || !activeSaltHex) {
        console.warn("Persist skipped: missing derived key or salt");
        return;
      }

      const record = await buildEncryptedRecordFromKey(profileData, activeKey, activeSaltHex);
      const store = await loadProfileStore();
      const nextStore: ProfileStorePayload = {
        ...store,
        profiles: {
          ...store.profiles,
          [usernameKey]: record,
        },
      };
      await writeProfileStore(nextStore);
      activeUsernameKeyRef.current = usernameKey;
    },
    [loadProfileStore, writeProfileStore]
  );

  useEffect(() => {
    let isMounted = true;

    const checkStoredProfile = async () => {
      try {
        await loadProfileStore();
      } catch (error) {
        console.warn("Failed to read stored user profile", error);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    void checkStoredProfile();

    return () => {
      isMounted = false;
    };
  }, [loadProfileStore]);

  const createAccount = useCallback(
    async (payload: CreateAccountPayload) => {
      const { password, ...rest } = payload;
      const normalizedProfile = normalizeProfile(rest);
      const usernameKey = normalizeUsernameKey(normalizedProfile.username);

      const { record, key, saltHex } = await buildEncryptedRecordFromPassword(
        password,
        normalizedProfile
      );

      derivedKeyRef.current = key;
      saltHexRef.current = saltHex;
      activeUsernameKeyRef.current = usernameKey;

      const store = await loadProfileStore();
      const nextStore: ProfileStorePayload = {
        ...store,
        profiles: {
          ...store.profiles,
          [usernameKey]: record,
        },
      };
      await writeProfileStore(nextStore);

      setProfile(normalizedProfile);
      setIsLoggedIn(true);
    },
    [loadProfileStore, writeProfileStore]
  );

  const logIn = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const normalizedUsername = normalizeUsernameKey(username);
      const store = await loadProfileStore();

      const attemptDecrypt = async (record: EncryptedProfileRecord) => {
        try {
          const saltBytes = hexToBytes(record.salt);
          const key = await deriveKey(password, saltBytes);
          const decryptedProfile = decryptProfileWithKey(key, record);
          if (!decryptedProfile) {
            return null;
          }
          return { decryptedProfile, key };
        } catch {
          return null;
        }
      };

      const directRecord = store.profiles[normalizedUsername];
      if (directRecord) {
        const attempt = await attemptDecrypt(directRecord);
        if (!attempt) {
          return false;
        }

        if (
          normalizeUsernameKey(attempt.decryptedProfile.username) !== normalizedUsername
        ) {
          return false;
        }

        derivedKeyRef.current = attempt.key;
        saltHexRef.current = directRecord.salt;
        activeUsernameKeyRef.current = normalizedUsername;
        setProfile(attempt.decryptedProfile);
        setIsLoggedIn(true);
        return true;
      }

      if (store.legacyRecords && store.legacyRecords.length > 0) {
        for (let i = 0; i < store.legacyRecords.length; i += 1) {
          const legacyRecord = store.legacyRecords[i];
          const attempt = await attemptDecrypt(legacyRecord);
          if (!attempt) {
            continue;
          }

          const matchedKey = normalizeUsernameKey(attempt.decryptedProfile.username);
          if (matchedKey !== normalizedUsername) {
            continue;
          }

          const nextStore: ProfileStorePayload = {
            ...store,
            profiles: {
              ...store.profiles,
              [matchedKey]: legacyRecord,
            },
            legacyRecords: removeIndex(store.legacyRecords, i),
          };
          await writeProfileStore(nextStore);

          derivedKeyRef.current = attempt.key;
          saltHexRef.current = legacyRecord.salt;
          activeUsernameKeyRef.current = matchedKey;
          setProfile(attempt.decryptedProfile);
          setIsLoggedIn(true);
          return true;
        }
      }

      if (store.legacyPlainProfiles && store.legacyPlainProfiles.length > 0) {
        for (let i = 0; i < store.legacyPlainProfiles.length; i += 1) {
          const legacyProfile = store.legacyPlainProfiles[i];
          if (
            normalizeUsernameKey(legacyProfile.username) !== normalizedUsername ||
            legacyProfile.password !== password
          ) {
            continue;
          }

          const { password: _, ...rest } = legacyProfile;
          const normalizedProfile = normalizeProfile(rest);
          const { record, key, saltHex } = await buildEncryptedRecordFromPassword(
            password,
            normalizedProfile
          );

          const nextStore: ProfileStorePayload = {
            ...store,
            profiles: {
              ...store.profiles,
              [normalizedUsername]: record,
            },
            legacyPlainProfiles: removeIndex(store.legacyPlainProfiles, i),
          };
          await writeProfileStore(nextStore);

          derivedKeyRef.current = key;
          saltHexRef.current = saltHex;
          activeUsernameKeyRef.current = normalizedUsername;
          setProfile(normalizedProfile);
          setIsLoggedIn(true);
          return true;
        }
      }

      return false;
    },
    [loadProfileStore, writeProfileStore]
  );

  const logOut = useCallback(async () => {
    setIsLoggedIn(false);
    setProfile(null);
    clearDerivedKey(derivedKeyRef);
    saltHexRef.current = null;
    activeUsernameKeyRef.current = null;
  }, []);

  const updateProfile = useCallback(
    async (profileUpdates: Partial<StoredUserProfile>) => {
      let nextProfile: StoredUserProfile | null = null;

      // Functional set avoids races when multiple updates happen back-to-back.
      setProfile(prevProfile => {
        const baseProfile = prevProfile ?? EMPTY_PROFILE;
        const merged = normalizeProfile({ ...baseProfile, ...profileUpdates });
        nextProfile = merged;
        return merged;
      });

      if (!nextProfile) {
        nextProfile = normalizeProfile({ ...EMPTY_PROFILE, ...profileUpdates });
      }

      await persistEncryptedProfile(nextProfile);
    },
    [persistEncryptedProfile]
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
    [isLoggedIn, loadingProfile, profile, createAccount, logIn, logOut, updateProfile]
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
