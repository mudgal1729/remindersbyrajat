export const TAGLINES = [
  "Because 'I forgot' isn't a love language",
  "Your memory's backup plan",
  "Relationships run on remembering",
  "The app your spouse wishes you had sooner",
  "Never forget what matters",
  "Making you the thoughtful one since 2026",
] as const

export function pickTagline(): string {
  return TAGLINES[Math.floor(Math.random() * TAGLINES.length)]
}
