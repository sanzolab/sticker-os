export default function AppSkeleton() {
  return (
    <main className="min-h-dvh bg-background text-foreground animate-pulse">
      {/* HEADER */}
      <header className="safe-top fixed inset-x-0 top-0 z-40 bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="h-6 w-28 rounded bg-muted" />

          <div className="flex items-center gap-2">
            <div className="size-10 rounded-sm bg-muted" />
            <div className="size-10 rounded-sm bg-muted" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 lg:px-8" style={{ paddingTop: "calc(var(--top-bar-height) + 1.25rem)" }}>
        {/* TOP STATS */}
        <section className="mb-8 border rounded-sm divide-y">
          <div className="grid grid-cols-3 divide-x">
            {/* CIRCLE */}
            <div className="grid place-items-center p-4 md:p-6">
              <div className="size-[72px] rounded-full bg-muted" />
            </div>

            {/* PROGRESS TEXT */}
            <div className="grid place-items-center p-4 md:p-6">
              <div className="h-3 w-24 bg-muted rounded mb-2" />
              <div className="h-6 w-16 bg-muted rounded" />
            </div>

            {/* BUTTON */}
            <div className="grid place-items-center p-4 md:p-6">
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          </div>

          {/* 4 STATS */}
          <div className="grid grid-cols-4 divide-x text-center">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 md:p-6"
              >
                <div className="size-5 bg-muted rounded-full" />
                <div className="h-5 w-6 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="sticky top-[var(--top-bar-height)] z-30 -mx-4 bg-background px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {/* TABS */}
          <div className="grid grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 flex items-center justify-center">
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* SEARCH + FILTER */}
          <div className="mt-3 grid grid-cols-[1fr_3.5rem] gap-3">
            <div className="h-12 w-full rounded-sm bg-muted" />
            <div className="h-12 w-full rounded-sm bg-muted" />
          </div>
        </section>

        {/* CONTENT */}
        <section className="space-y-6 pt-4">
          {[1, 2].map((section) => (
            <section key={section}>
              {/* SECTION HEADER */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="h-5 w-40 bg-muted rounded mb-2" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
                <div className="size-5 bg-muted rounded" />
              </div>

              {/* GRID */}
              <div className="grid grid-cols-4 gap-3 py-3 min-[430px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4.35] rounded-sm bg-muted"
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
