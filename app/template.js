// A template re-mounts on every navigation, which replays the CSS entrance animation (smooth page changes).
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
