import type {
  ChangePasswordBody,
  CurrentUser,
  ForgotPasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  UpdateProfileBody,
} from "@car-rental/contracts";
import { isApiError } from "@/shared/api/api-error";
import { apiRequest } from "@/shared/api/client";

type UserResponse = { user: CurrentUser };

export const authApi = {
  /** The signed-in user, or null for visitors. */
  async me(): Promise<CurrentUser | null> {
    try {
      return (await apiRequest<UserResponse>("/v1/auth/me")).user;
    } catch (error) {
      if (isApiError(error, 401)) return null;
      throw error;
    }
  },
  login: async (body: LoginBody) => (await apiRequest<UserResponse>("/v1/auth/login", { method: "POST", body })).user,
  register: async (body: RegisterBody) => (await apiRequest<UserResponse>("/v1/auth/register", { method: "POST", body })).user,
  logout: () => apiRequest<void>("/v1/auth/logout", { method: "POST", body: {} }),
  forgotPassword: (body: ForgotPasswordBody) => apiRequest<void>("/v1/auth/password/forgot", { method: "POST", body }),
  resetPassword: (body: ResetPasswordBody) => apiRequest<void>("/v1/auth/password/reset", { method: "POST", body }),
  changePassword: (body: ChangePasswordBody) => apiRequest<void>("/v1/me/password", { method: "POST", body }),
  updateProfile: async (body: UpdateProfileBody) => (await apiRequest<UserResponse>("/v1/me", { method: "PATCH", body })).user,
  becomeOwner: async () => (await apiRequest<UserResponse>("/v1/me/become-owner", { method: "POST", body: {} })).user,
};
