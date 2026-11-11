import { useEffect, useState } from 'react';

import type { NewsType } from '@/types/home.type';

type NewsFeedResponse = {
  items?: Array<{
    title: string;
    link: string;
    enclosure?: { link?: string };
    thumbnail?: string;
    author?: string;
  }>;
};

export default function SalinityNewsSwiper() {
  const [articles, setArticles] = useState<NewsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchNews = async () => {
      try {
        const rssUrl =
          'https://news.google.com/rss/search?q=xâm+nhập+mặn+Tiền+Giang&hl=vi&gl=VN&ceid=VN:vi';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(apiUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('Không tải được nguồn tin.');
        const data = (await response.json()) as NewsFeedResponse;
        const nextArticles = (data.items ?? []).slice(0, 10).map((item) => ({
          title: item.title,
          link: item.link,
          image: item.enclosure?.link || item.thumbnail || '/news_banner.webp',
          source: item.author || 'Nguồn báo chí công khai',
        }));

        setArticles(nextArticles);
        setLoadError(false);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchNews();
    const refreshTimer = window.setInterval(() => void fetchNews(), 24 * 60 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, []);

  return (
    <div className="rounded-2xl bg-[#005DCE] p-4 shadow-[0_10px_28px_rgba(0,86,179,0.16)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#005DCE]">
          Tin tức: Xâm nhập mặn
        </h3>
        <span className="text-xs text-white/80">
          Nguồn tổng hợp tin công khai · cập nhật hằng ngày
        </span>
      </div>

      {loading && articles.length === 0 ? (
        <p role="status" className="rounded-xl bg-white/10 px-4 py-6 text-sm text-white/90">
          Đang tải tin tức…
        </p>
      ) : articles.length > 0 ? (
        <div className="flex items-stretch gap-4 overflow-x-auto pb-2">
          {articles.map((article) => (
            <a
              key={article.link}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-60 flex-none overflow-hidden rounded-xl bg-white shadow transition hover:-translate-y-1 hover:shadow-lg"
            >
              <img
                src={article.image}
                alt=""
                loading="lazy"
                className="h-32 w-full bg-blue-50 object-cover"
              />
              <div className="flex min-h-28 flex-col justify-between gap-3 p-3">
                <p className="line-clamp-3 text-sm font-semibold leading-5 text-slate-900">
                  {article.title}
                </p>
                <span className="line-clamp-1 text-[11px] text-slate-500">
                  {article.source}
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p role={loadError ? 'status' : undefined} className="rounded-xl bg-white/10 px-4 py-6 text-sm text-white/90">
          {loadError
            ? 'Nguồn tin chưa tải được lúc này. Vui lòng thử lại sau.'
            : 'Chưa có bài viết phù hợp từ nguồn tin công khai.'}
        </p>
      )}
    </div>
  );
}
