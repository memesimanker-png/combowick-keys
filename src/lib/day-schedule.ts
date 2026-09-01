export type DaySchedule = {
  steps: number;
  skipStep2: boolean;
  label: string;
};

const SCHEDULE: Record<number, DaySchedule> = {
  0: { steps: 3, skipStep2: false, label: "" },
  1: { steps: 3, skipStep2: false, label: "" },
  2: { steps: 2, skipStep2: true, label: "2-Step Wednesday" },
  3: { steps: 3, skipStep2: false, label: "" },
  4: { steps: 2, skipStep2: true, label: "2-Step Friday" },
  5: { steps: 2, skipStep2: true, label: "Weekend Special" },
  6: { steps: 3, skipStep2: false, label: "" },
};

export function getTodaySchedule(): DaySchedule {
  const day = new Date().getDay();
  const remap: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
  return SCHEDULE[remap[day]];
}

export function isRewardDay(): boolean {
  return getTodaySchedule().skipStep2;
}
