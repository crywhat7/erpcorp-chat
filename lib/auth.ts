const USER_ID_KEY = "erp_user_id";
const USER_NAME_KEY = "erp_user_name";
const USER_ROLE_KEY = "erp_user_role";
const USER_AVATAR_KEY = "erp_user_avatar";

export type SessionUser = {
  userId: string;
  userName: string;
  userRole: string;
  userAvatar: string | null;
};

export function setSession(
  userId: string,
  userName: string,
  userRole: string = "user",
  userAvatar: string | null = null
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_NAME_KEY, userName);
  localStorage.setItem(USER_ROLE_KEY, userRole);
  localStorage.setItem(USER_AVATAR_KEY, userAvatar ?? "");
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const userId = localStorage.getItem(USER_ID_KEY);
  const userName = localStorage.getItem(USER_NAME_KEY);
  if (!userId || !userName) return null;
  return {
    userId,
    userName,
    userRole: localStorage.getItem(USER_ROLE_KEY) ?? "user",
    userAvatar: localStorage.getItem(USER_AVATAR_KEY) || null,
  };
}

export function updateSessionAvatar(avatarUrl: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_AVATAR_KEY, avatarUrl ?? "");
}

export function updateSessionProfile(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_NAME_KEY, name);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_AVATAR_KEY);
}

export function getUserId(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(USER_ID_KEY) : null;
}

export function isAdmin(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(USER_ROLE_KEY) === "admin";
}
