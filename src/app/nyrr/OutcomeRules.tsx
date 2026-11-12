// With one race left, what the focus team needs is arithmetic, not a forecast:
// a one-line summary and a table of where each rival has to finish

import type { OutcomeRules, RivalPlace, RivalRule, RuleRow } from '@/lib/nyrr/model';
import { ordinal } from '@/lib/nyrr/format';
import styles from './page.module.css';

type Names = (teamCode: string) => string;

export function joinNames(names: string[], both = false): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${both ? 'both ' : ''}${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const orLower = (place: RivalPlace) => (place === 'none' ? 'without a full team' : `${ordinal(place)} or lower`);

// The rival finishes that leave it level on points with the focus team
function levelText(rule: RivalRule, focusPlace: number): string | null {
  const from = rule.levelFrom;
  if (from === null) return null;
  if (from === 'none') return 'without a full team';
  if (typeof rule.behindFrom !== 'number') return `${ordinal(from)} or lower`;
  let last = rule.behindFrom - 1;
  if (last === focusPlace) last--;
  return last <= from ? ordinal(from) : `${ordinal(from)} to ${ordinal(last)}`;
}

// Finishing ahead of every rival in the race is enough in each of the top places
function aheadIsEnough(rules: OutcomeRules, clear: RuleRow[]): boolean {
  return (
    rules.mustBeat === rules.rivals.length &&
    clear.every(
      (row, i) =>
        row.place === i + 1 &&
        row.rivals.every((r) => r.always || (typeof r.behindFrom === 'number' && r.behindFrom <= row.place + 1))
    )
  );
}

interface SummaryProps {
  rules: OutcomeRules;
  spots: number; // how many teams move up this year
  focusName: string;
  raceName: string;
  names: Names;
}

export function RuleSummary({ rules, spots, focusName, raceName, names }: SummaryProps) {
  const clear = rules.rows.filter((r) => r.best === 'clear');
  const levelOnly = rules.rows.filter((r) => r.best === 'level');
  // The rules are for 1st or for 2nd place; which of those brings promotion depends on the year
  const promotes = rules.slots === spots;
  const prize =
    rules.slots === 1
      ? promotes
        ? 'wins the division outright and moves up'
        : 'wins the division outright'
      : promotes
        ? 'is promoted'
        : 'finishes in the top 2';
  const rivals = rules.rivals.map(names);
  const shared = `NYRR lists teams level on points in the same place, so that would be a shared ${ordinal(rules.slots)}`;
  const tieMeans = !promotes
    ? shared
    : rules.slots === 1
      ? `${shared}, and it isn’t known which of them would move up`
      : 'NYRR hasn’t said how a tie for a promotion spot is settled';

  const scope = `Counting only this division’s teams at the ${raceName}`;
  let main: string | null = null;
  const level: string[] = [];
  if (clear.length && aheadIsEnough(rules, clear)) {
    main = `${scope}, ${focusName} ${prize} if it ${
      clear.length === 1 ? 'finishes 1st' : `finishes in the top ${clear.length} and ahead of ${joinNames(rivals, true)}`
    }.`;
    for (const row of levelOnly) {
      const with_ = row.rivals.filter((r) => r.behindFrom === null && r.levelFrom !== null).map((r) => names(r.teamCode));
      level.push(`Finishing ${ordinal(row.place)} could at best leave it level on points with ${joinNames(with_)}.`);
    }
  } else if (clear.length && rules.rivals.length === 1) {
    const rival = rivals[0];
    const paths = clear.map((row) => {
      const r = row.rivals[0];
      return r.always ? ordinal(row.place) : `${ordinal(row.place)} with ${rival} ${orLower(r.behindFrom!)}`;
    });
    main = `${scope}, ${focusName} ${prize} if it finishes ${paths.join(', or ')}.`;
    for (const row of rules.rows) {
      const text = levelText(row.rivals[0], row.place);
      if (text) level.push(`${ordinal(row.place)} with ${rival} ${text} leaves the two level on points.`);
    }
  } else if (clear.length) {
    main = `${focusName} ${prize} if it finishes ahead of ${
      rules.mustBeat === rules.rivals.length ? joinNames(rivals) : `at least ${rules.mustBeat} of ${rivals.join(', ')}`
    } on final points. The table in step 6 shows where each would have to finish.`;
  } else {
    main = `${focusName} can no longer finish clear; the best left is level on points.`;
  }

  return (
    <>
      <strong>What it takes:</strong> {main}
      {level.length > 0 && (
        <>
          {' '}
          {level.join(' ')} {tieMeans}.
        </>
      )}
    </>
  );
}

interface TableProps {
  rules: OutcomeRules;
  focusName: string;
  names: Names;
}

export function RuleTable({ rules, focusName, names }: TableProps) {
  const cell = (rule: RivalRule, place: number) => {
    const level = levelText(rule, place);
    if (rule.always) return 'anywhere';
    if (rule.behindFrom === null) return level ? `level at best (${level})` : 'stays ahead';
    return (
      <>
        {orLower(rule.behindFrom)}
        {level && <span className={styles.muted}> &middot; level if {level}</span>}
      </>
    );
  };
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>If {focusName} finishes</th>
            <th className={styles.num}>Final pts</th>
            {rules.rivals.map((code) => (
              <th key={code}>{names(code)} must finish</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.rows.map((row) => (
            <tr key={row.place}>
              <td>{ordinal(row.place)}</td>
              <td className={styles.num}>{row.finalPoints}</td>
              {row.rivals.map((r) => (
                <td key={r.teamCode}>{cell(r, row.place)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
