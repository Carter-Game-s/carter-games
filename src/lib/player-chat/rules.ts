export const agreementVersion = "1";
export const agreementKey = "getmoremath-player-agreement";
export const playerRules = [
  "Don’t ruin it for everyone. Your actions can affect every other player using the website.",
  "Don’t share private accounts. Never give someone else your login credentials.",
  "Don’t spam or overload the website. Avoid excessive messages, repeated requests, or intentionally crashing services.",
  "Don’t exploit vulnerabilities. Do not attempt to hack accounts, bypass authentication, or interfere with server infrastructure.",
  "Respect other players. No bullying, harassment, threats, discrimination, or impersonation.",
  "Keep the chat appropriate. No explicit sexual content, graphic violence, or other harmful material.",
  "Don’t share personal information. Avoid posting addresses, phone numbers, passwords, school schedules, or other sensitive details.",
  "Don’t distribute harmful links. No phishing, malware, scams, or malicious downloads.",
  "Report problems responsibly. Report bugs and abuse rather than exploiting them.",
  "Don’t impersonate staff. Do not claim to be an administrator or moderator.",
  "Use shared resources responsibly. Excessive usage can slow down the website for everyone.",
  "Follow moderation decisions. Moderators may remove inappropriate messages or restrict abusive accounts.",
  "Account access may be revoked. Serious or repeated violations may result in temporary or permanent restrictions.",
];
export type PlayerMessage = {
  id: number;
  name: string;
  text: string;
  created: number;
  announcement: number;
};

export type RoomControls = {
  locked: boolean;
  slow: number;
  pinned: PlayerMessage | null;
};

export const siteFeatures = { ai: "AI Chat", sounds: "Soundboard" } as const;
export type SiteFeature = keyof typeof siteFeatures;
export type SiteStatus = {
  notice: { text: string; tone: "info" | "warning"; until: number } | null;
  pauses: Partial<Record<SiteFeature, number>>;
};
