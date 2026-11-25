import { isProfileComplete, type User } from '../../domain/entity/User';

/** GET /me and every route that changes the profile. */
export type MeResponse = User & {
  /** true: the app asks for the last name, first name and sex before booking. */
  profilIncomplet: boolean;
};

export function toMeResponse(user: User): MeResponse {
  return { ...user, profilIncomplet: !isProfileComplete(user) };
}
