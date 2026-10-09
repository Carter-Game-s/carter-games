import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page">
      <h1>Game not found.</h1>
      <p className="muted">That game isn’t in this collection.</p>
      <Link className="button" href="/games">
        Back to games
      </Link>
    </div>
  );
}
