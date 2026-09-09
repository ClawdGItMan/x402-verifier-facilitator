export const THRESHOLD_PASS = 70;
export const THRESHOLD_REJECT = 40;

export const isPass = (score: number): boolean => score >= THRESHOLD_PASS;
export const isReject = (score: number): boolean => score < THRESHOLD_REJECT;
export const isGrayZone = (score: number): boolean =>
  score >= THRESHOLD_REJECT && score < THRESHOLD_PASS;
