import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="rounded-2xl border border-neutral-200 dark:border-[rgba(148,163,184,0.24)] card-bg p-8 sm:p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-serif font-semibold text-primary">
          Page Not Found
        </h1>
        <p className="mt-4 text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
          The page you requested does not exist or has been moved.
        </p>
        <p className="mt-2 text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
          你访问的页面不存在，或已被移动。
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-accent/25 px-4 py-2 text-sm font-medium text-primary hover:bg-accent/35 transition-colors duration-200"
          >
            Back to Home / 返回首页
          </Link>
        </div>
      </div>
    </section>
  );
}
