"use client";

export function TeamProgressRow({
  item,
}: {
  item: {
    code: string;
    flag: string;
    label: string;
    name: string;
    collected: number;
    total: number;
    percent: number;
  };
}) {
  const flag = item.flag?.trim() ? item.flag : "🏳️";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">
          <span className="mr-2">{flag}</span>
          <span className="font-medium">{item.code}</span>
          <span className="ml-2 text-muted-foreground">{item.name}</span>
        </span>
        <span className="shrink-0 text-muted-foreground">
          {item.collected}/{item.total} · {item.percent}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${item.percent}%` }}
        />
      </div>
    </div>
  );
}
