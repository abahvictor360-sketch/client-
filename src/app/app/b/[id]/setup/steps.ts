// The setup steps a new campaign goes through before it launches, in order.
export const SETUP_STEPS = [
  { id: "company", title: "Is this your company?" },
  { id: "buyers", title: "Who should we reach?" },
  { id: "plan", title: "How you pay" },
  { id: "sender", title: "Sender name and booking link" },
  { id: "mailbox", title: "Your sending address" },
  { id: "facts", title: "Tell auto-replies about your business" },
  { id: "schedule", title: "Sending schedule and budget" },
  { id: "source", title: "How did you hear about us?" },
  { id: "launch", title: "Ready to launch" },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]["id"];

export function stepIndex(step: string | undefined) {
  const i = SETUP_STEPS.findIndex((s) => s.id === step);
  return i < 0 ? 0 : i;
}

export function setupHref(id: string, step: SetupStep) {
  return `/app/b/${id}/setup?step=${step}`;
}

export const HEARD_FROM = [
  "Twitter / X",
  "Google / search engine",
  "ChatGPT / AI tool",
  "LinkedIn",
  "Cold email",
  "Instagram",
  "Facebook",
  "Reddit",
  "Friend or colleague",
  "Other",
] as const;
