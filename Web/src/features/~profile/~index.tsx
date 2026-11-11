import { Link, createFileRoute } from '@tanstack/react-router';

import { useAuthStore, useUserStore } from '@/stores';

export const Route = createFileRoute('/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUserStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <main className="min-h-[70vh] bg-[#f5f8fc] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_12px_36px_rgba(0,86,179,0.08)]">
          <div className="border-b-4 border-[#069843] bg-[#005DCE] px-6 py-5 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
              Cổng dữ liệu BK Mekong
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Thông tin tài khoản</h1>
          </div>

          {isAuthenticated && user ? (
            <dl className="grid gap-px bg-blue-100 sm:grid-cols-2">
              <div className="bg-white p-6 sm:p-8">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Họ và tên
                </dt>
                <dd className="mt-2 text-lg font-semibold text-[#075fc5]">
                  {fullName || 'Chưa cập nhật'}
                </dd>
              </div>
              <div className="bg-white p-6 sm:p-8">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </dt>
                <dd className="mt-2 break-all text-lg font-semibold text-[#075fc5]">
                  {user.email || 'Chưa cập nhật'}
                </dd>
              </div>
              <div className="bg-white p-6 sm:col-span-2 sm:p-8">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trạng thái
                </dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">
                  Tài khoản đang dùng phiên đăng nhập của bản demo. Dữ liệu quan trắc trên trang công khai lấy từ Monitoring API.
                </dd>
              </div>
            </dl>
          ) : (
            <div className="p-6 sm:p-8">
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Chưa có phiên đăng nhập. Bạn vẫn có thể xem bản đồ và dữ liệu lịch sử công khai.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex items-center rounded-lg bg-[#005DCE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004ba8]"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </section>

        <Link
          to="/home"
          hash="top"
          className="mt-5 inline-flex text-sm font-semibold text-[#075fc5] hover:underline"
        >
          Quay lại trang dữ liệu
        </Link>
      </div>
    </main>
  );
}
