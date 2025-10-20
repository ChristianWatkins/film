interface AwardBadgeProps {
  awards: string[];
}

export default function AwardBadge({ awards }: AwardBadgeProps) {
  if (!awards || awards.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {awards.map((award, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-900 rounded-full text-xs font-semibold border border-yellow-300"
        >
          <span>🏆</span>
          <span>{award}</span>
        </span>
      ))}
    </div>
  );
}

