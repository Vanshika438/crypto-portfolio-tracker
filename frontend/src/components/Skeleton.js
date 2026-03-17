const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-800/60 rounded-lg ${className}`} />
);

export const SkeletonCard = () => (
  <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-xl">
    <Skeleton className="h-3 w-24 mb-4" />
    <Skeleton className="h-7 w-36 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const SkeletonRow = () => (
  <tr className="border-b border-slate-800/60">
    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
    <td className="px-4 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
    <td className="px-4 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
    <td className="px-4 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
    <td className="px-4 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
    <td className="px-4 py-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
  </tr>
);

export const SkeletonTable = ({ rows = 6 }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="border-y border-slate-800/60 bg-slate-900/40">
        <tr>
          {[...Array(6)].map((_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-3 w-16" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
      </tbody>
    </table>
  </div>
);

export default Skeleton;