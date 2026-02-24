"use client";

export function Landing() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="flex items-center gap-2 font-bold tracking-tight text-4xl sm:text-5xl">
        <span className="rounded bg-primary/10 px-2 py-1 font-bold text-primary">OP</span>
        <span>Tracker</span>
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground text-lg">
        A place to track your inventory and build decks with what you already own.
      </p>
    </div>
  );
}
