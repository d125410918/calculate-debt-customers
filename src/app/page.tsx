import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="card p-6">
        <h1 className="text-2xl font-bold">還款試算與客戶資料</h1>
        <p className="mt-3 text-slate-600">目前先不做登入，用網址分隔不同使用者資料。</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="rounded-xl bg-slate-900 px-4 py-3 text-center text-white" href="/original">原始試算頁</Link>
          <Link className="rounded-xl bg-blue-700 px-4 py-3 text-center text-white" href="/u/demo">Demo 使用者頁</Link>
        </div>
      </section>
    </main>
  );
}
