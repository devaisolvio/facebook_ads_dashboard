import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { SkeletonRows } from "./SkeletonRows";


type AdWeekRow = {
  ad_id: string;
  ad_name_at_launch: string;
  campaign_id: string;
  campaign_name_at_launch: string;
  cohort_week: string;
  week_offset: number; // 1..4
  hit_cum: number;     // 0/1
  purchases: number;
  revenue: number;
  spend: number;
};

type ApiPayload = {
  generated_at: string;
  count: number;
  rows: AdWeekRow[];
};

// ---------- small UI bits ----------
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "2-digit" });

const PerformanceCell: React.FC<{ current: number; previous: number; target: number }> = ({
  current,
  previous,

}) => {
 current = Math.round(current * 10) / 10;
previous = Math.round(previous * 10) / 10;
  const trend = current > previous ? "up" : current < previous ? "down" : "neutral";
 /*  const meets = current >= target; */
  const cfg = {
    up:      { icon: TrendingUp,   color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
    down:    { icon: TrendingDown, color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-900/20" },
    neutral: { icon: Minus,        color: "text-gray-600 dark:text-gray-300",   bg: "bg-gray-50 dark:bg-slate-800" },
  }[trend];
  const Icon = cfg.icon;
  return (
    <td className={`px-4 py-3 ${cfg.bg} `}>
      <div className="flex items-center justify-between">
        <span className={`font-medium ${cfg.color}`}>{isFinite(current) ? current.toFixed(1) : "0.0"}%</span>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
    </td>
  );
};

// ---------- aggregated row rendered in table ----------
type CohortRowView = {
  cohortISO: string;  // original ISO, for stable sort
  date: string;       // formatted
  totalAssets: number;
  hits: number;       // ~ wk4% * totalAssets
  week1: number;
  week2: number;
  week3: number;
  week4: number;
};

const CohortDashboard: React.FC = () => {
  const [raw, setRaw] = useState<AdWeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // filters
  const [campaignFilter, setCampaignFilter] = useState<string>("All");
  const [adFilter, setAdFilter] = useState<string>("All");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("https://facebook-ads-backend-mln8.onrender.com/api/ad-weeks"); // <- your API
        if (!res.ok) throw new Error(`/api/ad-weeks ${res.status}`);
        const json: ApiPayload = await res.json();
        setRaw(json.rows || []);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // options for filters (from data)
  const campaignOptions = useMemo(() => {
    const set = new Set<string>(["All"]);
    raw.forEach(r => { if (r.campaign_name_at_launch) set.add(r.campaign_name_at_launch); });
    return Array.from(set).sort((a,b) => (a==="All"?-1: b==="All"?1 : a.localeCompare(b)));
  }, [raw]);

  const adOptions = useMemo(() => {
    const set = new Set<string>(["All"]);
    raw.forEach(r => { if (r.ad_name_at_launch) set.add(r.ad_name_at_launch); });
    return Array.from(set).sort((a,b) => (a==="All"?-1: b==="All"?1 : a.localeCompare(b)));
  }, [raw]);

  // apply filters BEFORE aggregation
  const filtered = useMemo(() => {
    return raw.filter(r => {
      const okCampaign = campaignFilter === "All" || r.campaign_name_at_launch === campaignFilter;
      const okAd = adFilter === "All" || r.ad_name_at_launch === adFilter;
      return okCampaign && okAd;
    });
  }, [raw, campaignFilter, adFilter]);


// aggregate ad-week rows → cohort grid (future weeks = 0)
const view: CohortRowView[] = useMemo(() => {
  if (filtered.length === 0) return [];

  // helpers (local so the snippet is self-contained)
  const addDaysISO = (iso: string, days: number) => {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  };
  const isOnOrBeforeToday = (d: Date) => d <= new Date();

  // group by cohort_week
  const byCohort = new Map<string, AdWeekRow[]>();
  for (const r of filtered) {
    const arr = byCohort.get(r.cohort_week) || [];
    arr.push(r);
    byCohort.set(r.cohort_week, arr);
  }

  const out: CohortRowView[] = [];

  for (const [cohort, arr] of byCohort.entries()) {
    // denominator = all unique ads in the cohort
    const adSet = new Set(arr.map(x => x.ad_id));
    const totalAssets = adSet.size || 1; // guard against /0

    // which weeks are eligible (boundary reached)?
    const eligible: Record<1|2|3|4, boolean> = {1:false,2:false,3:false,4:false};
    ( [1,2,3,4] as const ).forEach(k => {
      const boundary = addDaysISO(cohort, 7 * k); // week k closes at +7k
      eligible[k] = isOnOrBeforeToday(boundary);
    });

    // Build cumulative hit sets per week by *carrying forward* previous hits,
    // so missing rows in later weeks don't lose already-hit ads.
    const cumSets: Record<1|2|3|4, Set<string>> = {1:new Set(),2:new Set(),3:new Set(),4:new Set()};
    let prev = new Set<string>();

    ( [1,2,3,4] as const ).forEach(wk => {
      const wkRows = arr.filter(x => x.week_offset === wk && x.hit_cum === 1);
      const thisWk = new Set(prev); // start from previous cumulative
      for (const r of wkRows) thisWk.add(r.ad_id);
      cumSets[wk] = thisWk;
      prev = thisWk;
    });

    // Cumulative counts (respect eligibility; future weeks treated as 0)
    const c1 = eligible[1] ? cumSets[1].size : 0;
    const c2 = eligible[2] ? cumSets[2].size : 0;
    const c3 = eligible[3] ? cumSets[3].size : 0;
    const c4 = eligible[4] ? cumSets[4].size : 0;


    // Convert to percentages for your cells
   const p1 = Math.round((c1 / totalAssets) * 1000) / 10;
const p2 = Math.round((c2 / totalAssets) * 1000) / 10;
const p3 = Math.round((c3 / totalAssets) * 1000) / 10;
const p4 = Math.round((c4 / totalAssets) * 1000) / 10;

    // Total hits = cumulative count at latest eligible week
    const latestHits = eligible[4] ? c4 : eligible[3] ? c3 : eligible[2] ? c2 : eligible[1] ? c1 : 0;

    out.push({
      cohortISO: cohort,
      date: fmtDate(cohort),
      totalAssets,
      hits: latestHits,         // exact integer, not pct * denom
      week1: eligible[1] ? p1 : 0,  // weekly *increment* %
      week2: eligible[2] ? p2 : 0,
      week3: eligible[3] ? p3 : 0,
      week4: eligible[4] ? p4 : 0,
    });
  }

  out.sort((a, b) => b.cohortISO.localeCompare(a.cohortISO));
  return out;
}, [filtered]);



  // top cards
  const totals = useMemo(() => {
    if (view.length === 0) return { totalAssets: 0, hits: 0, week1: 0, week2: 0, week3: 0, week4: 0 };
    const n = view.length;
    return {
      totalAssets: view.reduce((s, x) => s + x.totalAssets, 0),
      hits: view.reduce((s, x) => s + x.hits, 0),
      week1: view.reduce((s, x) => s + x.week1, 0) / n,
      week2: view.reduce((s, x) => s + x.week2, 0) / n,
      week3: view.reduce((s, x) => s + x.week3, 0) / n,
      week4: view.reduce((s, x) => s + x.week4, 0) / n,
    };
  }, [view]);


  if (error)   return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-80 bg-white dark:bg-slate-900/40 border-r border-gray-200 dark:border-slate-700/60 overflow-y-auto">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Filters</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Apply before aggregation</p>
          </div>

          {/* Campaign filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaign (at launch)</label>
            <select
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-800"
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
            >
              {campaignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Ad filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ad (at launch)</label>
            <select
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-800"
              value={adFilter}
              onChange={e => setAdFilter(e.target.value)}
            >
              {adOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* header */}
        <div className="bg-white dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Facebook Cohorts</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Cumulative hit% by launch cohort week (filters applied before aggregation)
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* cards */}
        <div className="bg-white dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold">{totals.totalAssets}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Assets</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold">{totals.hits}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Approx Hits (wk4)</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.week1.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Week 1</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.week4.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Week 4</div>
            </div>
          </div>
        </div>

        {/* table */}
        <div className="flex-1 overflow-auto">
          <div className="bg-white dark:bg-slate-900/40">
            <table className="w-full">
              <thead className="bg-gray-900 text-white dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Cohort Week (Mon)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Assets</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Hits (wk4 est)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 1 (+7)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: ≥10%</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 2 (+14)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: ≥20%</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 3 (+21)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: ≥25%</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 4 (+28)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: ≥25%</div>
                  </th>
                </tr>
              </thead>
             <tbody>
  {loading ? (
    <SkeletonRows rows={6} cols={7} />
  ) : view.length === 0 ? (
    <tr>
      <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
        No cohort rows
      </td>
    </tr>
  ) : (
    view.map((row) => {
 
      return (
        <tr
          key={row.cohortISO}
          className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60"
        >
          <td className="px-4 py-3 font-medium">{row.date}</td>
          <td className="px-4 py-3">{row.totalAssets}</td>
          <td className="px-4 py-3">{row.hits}</td>
          <PerformanceCell current={row.week1} previous={0} target={10} />
          <PerformanceCell current={row.week2} previous={row.week1} target={20} />
          <PerformanceCell current={row.week3} previous={row.week2} target={25} />
          <PerformanceCell current={row.week4} previous={row.week3} target={25} />
        </tr>
      );
    })
  )}
</tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CohortDashboard;



