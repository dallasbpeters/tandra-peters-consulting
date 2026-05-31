/**
 * Reference header — no Next.js or icon-package imports so this file stays
 * valid when opened from the repo root (Vite app) without the nested app's
 * `node_modules`. In the real ecommerce example app, prefer `next/link` and
 * `lucide-react` per that app's `package.json`.
 */
export function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <a href="/" className="text-xl font-semibold tracking-tight">
          Store
        </a>

        <nav className="flex items-center gap-6">
          <a href="/products" className="text-sm text-neutral-600 hover:text-neutral-900">
            Products
          </a>

          <button aria-label="Cart" type="button" className="text-neutral-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
