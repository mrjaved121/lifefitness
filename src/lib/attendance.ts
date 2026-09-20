export type AttendanceSummary = {
  totalVisits: number;
  thisMonthVisits: number;
  lastVisit: string | null;
};

// `dates` is check_in_date strings in any order; `today` and `monthStart`
// are both "YYYY-MM-DD" so this needs no Date parsing (lexicographic
// comparison on that format sorts and bounds correctly).
export function summarizeAttendance(dates: string[], monthStart: string): AttendanceSummary {
  return {
    totalVisits: dates.length,
    thisMonthVisits: dates.filter((d) => d >= monthStart).length,
    lastVisit: dates.length === 0 ? null : dates.reduce((latest, d) => (d > latest ? d : latest)),
  };
}
