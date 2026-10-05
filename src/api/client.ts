import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Base URL of the DocForge backend. Override at build time with:
//   EXPO_PUBLIC_API_URL=https://your-backend.example.com
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "https://api.pdfedit.app";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const TOKEN_KEY = "pdfedit_jwt";

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export interface ToolInfo {
  slug: string;
  name: string;
  accepts_files: boolean;
  multiple_files: boolean;
  url: string;
  accept: string;
}

export interface JobStatus {
  job_id: string;
  tool: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  error?: string | null;
  download_url?: string;
  file_name?: string;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export function validatePdfFiles(files: PickedFile[]): string | null {
  if (!files.length) return "Choose at least one PDF file to continue.";

  for (const file of files) {
    const name = (file.name ?? "").toLowerCase();
    if (!name.endsWith(".pdf")) {
      return "Only PDF files are supported at the moment.";
    }
    if (typeof file.size === "number" && file.size > MAX_FILE_SIZE_BYTES) {
      return "Each PDF must be smaller than 25 MB.";
    }
  }

  return null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listTools(): Promise<ToolInfo[]> {
  const res = await fetch(`${API_BASE_URL}/api/tools`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Could not load tools (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.tools) ? data.tools : [];
}

export async function submitJob(
  slug: string,
  files: PickedFile[],
  options: Record<string, string> = {}
): Promise<{ job_id: string; status_url: string }> {
  const fileValidationError = validatePdfFiles(files);
  if (fileValidationError) {
    throw new Error(fileValidationError);
  }

  const form = new FormData();
  for (const f of files) {
    form.append("files", {
      uri: f.uri,
      name: f.name,
      type: f.mimeType ?? "application/pdf",
    } as unknown as Blob);
  }
  for (const [key, value] of Object.entries(options)) {
    form.append(key, value);
  }

  const res = await fetch(`${API_BASE_URL}/api/tools/${slug}`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (${res.status})`);
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Could not check job status (${res.status})`);
  return res.json();
}

export function downloadUrl(path: string): string {
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}

export async function login(email: string, password: string): Promise<void> {
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!res.ok) throw new Error("Login failed — check your email and password.");
  const data = await res.json();
  await setToken(data.access_token ?? data.token);
}

export async function register(email: string, password: string): Promise<void> {
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Registration failed.");
  }

  const data = await res.json();
  if (data.access_token ?? data.token) {
    await setToken(data.access_token ?? data.token);
  }
}
