// good SkeletonRows (put this in its own file or above)
export const SkeletonRows: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 7 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="border-b border-gray-100 dark:border-slate-800">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={`sk-${i}-${j}`} className="px-4 py-3">
            <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
          </td>
        ))}
      </tr>
    ))}
  </>
);
