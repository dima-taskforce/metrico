declare module 'passport-vkontakte' {
  import { Strategy as PassportStrategy } from 'passport';

  interface VkProfile {
    id: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
  }

  interface VkStrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    apiVersion?: string;
  }

  type VkVerifyCallback = (
    accessToken: string,
    refreshToken: string,
    params: { email?: string },
    profile: VkProfile,
    done: (error: Error | null, user?: unknown) => void,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: VkStrategyOptions, verify: VkVerifyCallback);
  }
}
