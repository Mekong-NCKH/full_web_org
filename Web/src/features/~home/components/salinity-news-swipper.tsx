import { useEffect, useState } from "react";

import { NewsType } from "@/types/home.type";


export default function SalinityNewsSwiper() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const rssUrl =
          "https://news.google.com/rss/search?q=xâm+nhập+mặn+Tiền+Giang&hl=vi&gl=VN&ceid=VN:vi";
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
          rssUrl
        )}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data?.items) {
          const items = data.items.slice(0, 10).map((item: NewsType) => ({
            title: item.title,
            link: item.link,
            image:
              item.enclosure?.link ||
              item.thumbnail ||
              "../../news_banner.webp",
            source: item.author,
          }));
          setArticles(items);
        }
      } catch (err) {
        console.error("Lỗi tải tin tức:", err);
      }
    };

    fetchNews();
    const daily = setInterval(fetchNews, 24 * 60 * 60 * 1000);
    return () => clearInterval(daily);
  }, []);

  return (
    // 1. ĐÃ THAY ĐỔI: Sử dụng chính xác màu xanh #0D6EFD từ hình ảnh
    <div className="rounded-2xl bg-[#0D6EFD] p-4 shadow-lg" style={{fontFamily: 'UTM Black'}}>
      
      {/* 2. Tiêu đề màu trắng (bg-base-100) */}
      <div className="bg-base-100 mb-4 w-fit rounded-lg px-4 py-2 shadow">
        {/* 3. ĐÃ THAY ĐỔI: Chữ tiêu đề dùng màu xanh #0D6EFD */}
        <h3 className="text-sm font-semibold text-[#0D6EFD]">
          Tin tức: Xâm nhập mặn
        </h3>
      </div>

      {/* 4. Container cho các thẻ tin tức */}
      <div className="flex items-start space-x-4 overflow-x-auto pb-2">
        {articles.length === 0 ? (
          // 5. ĐÃ THAY ĐỔI: Dùng màu trắng (với độ mờ) cho chữ loading trên nền xanh
          <span className="whitespace-nowrap text-sm italic text-white/80">
            Đang tải tin tức...
          </span>
        ) : (
          articles.map((a: NewsType, i: number) => (
            <a
              key={i}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              // Thẻ tin tức vẫn là màu trắng (bg-base-100)
              className="bg-base-100 w-52 flex-none overflow-hidden rounded-xl shadow transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="h-28 w-full rounded-t-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${a.image})` }}
              ></div>
              <div className="flex h-16 items-center justify-center overflow-hidden text-ellipsis p-2 text-center text-sm font-medium leading-snug">
                <span className="line-clamp-2">{a.title}</span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}