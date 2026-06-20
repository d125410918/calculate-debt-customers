import Link from "next/link";

export default function HomePage() {
  return (
    <main className="app-main app-stack">
      <section className="app-hero">
        <div className="app-hero-icon">排</div>
        <div>
          <div className="app-hero-title">還款試算與客戶資料</div>
          <div className="app-hero-subtitle">用網址分隔不同使用者資料</div>
        </div>
      </section>
      <section className="app-card">
        <h1 className="app-title">選擇入口</h1>
        <div className="app-grid">
          <Link className="app-button primary full text-center" href="/u/demo">Demo 使用者頁</Link>
          <Link className="app-button full text-center" href="/original">原始試算頁</Link>
        </div>
      </section>
    </main>
  );
}
