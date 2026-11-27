export default function Loading() {
  return (
    <div className="loading" role="status" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">Loading… / লোড হচ্ছে…</span>
      <div className="skeleton-stack" aria-hidden="true">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line short" />
      </div>
    </div>
  );
}
