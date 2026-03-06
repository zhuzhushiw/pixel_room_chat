export const AVATAR_OPTIONS = [
  { id: 'alice', label: 'Alice', sheet: 'Alicex32.png' },
  { id: 'grace', label: 'Grace', sheet: 'Gracex32.png' },
  { id: 'jack', label: 'Jack', sheet: 'Jackx32.png' },
  { id: 'joe', label: 'Joe', sheet: 'Joex32.png' },
  { id: 'lea', label: 'Lea', sheet: 'Leax32.png' },
  { id: 'monica', label: 'Monica', sheet: 'Monicax32.png' },
  { id: 'stephen', label: 'Stephen', sheet: 'Stephenx32.png' },
  { id: 'tom', label: 'Tom', sheet: 'Tomx32.png' },
] as const;

export type AvatarId = (typeof AVATAR_OPTIONS)[number]['id'];
