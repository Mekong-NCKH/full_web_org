import { Link, useMatches, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'react-toastify';

import handleAxiosError from '@/helpers/handle-axios-error';
import { useAuthStore } from '@/stores';
import { User } from '@/types';
import storage from '@/utils/storage';

import UserBanner from './user-banner';



type HeaderProps = {
  user: User | null;
  setUser: (user: User | null) => void;
  toggleSidebarMobile: () => void;
  toggleSidebarDesktop: () => void;
};

const Header = ({
  user,
  setUser,
  toggleSidebarDesktop,
  toggleSidebarMobile,
}: HeaderProps) => {
  const { logout: authLogout, isAuthenticated } = useAuthStore();

  // const [dropdownOpened, setDropdownOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const matches = useMatches();
  const navigate = useNavigate();

  const isHomePage = true;
  const isWorkingPage = matches.some(match => match.pathname === '/working');
  const logout = async () => {
    try {
      setLoading(true);
      // await AuthService.logout();

      // Use store's logout to clear auth state
      authLogout();

      // Clear any legacy token storage
      storage.removeItem('token');

      // Clear user state
      setUser(null);

      navigate({ to: '/login' });
    } catch (error: unknown) {
      handleAxiosError(error, (message: string) => {
        toast.error(message);
      });
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div
        id="study-layout-header"
        // className="border-tertiary-300 3xl:h-24 3xl:px-10 sticky top-0 z-[98] flex h-20 w-full flex-row items-center border-b border-solid bg-white p-5"
        className='z-50 border-b backdrop-blur-lg'
      >
        <div className="max-w-7xl">
          <div className="navbar min-h-14 justify-between px-4">
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      id="logged-in-layout-header"
      // className="border-tertiary-300 3xl:h-24 3xl:px-10 sticky top-0 z-[98] flex h-20 w-full flex-row items-center border-b border-solid bg-white p-5"
      className='z-50 w-full border-b p-4 backdrop-blur-lg'
    >
      {/* <SidebarToggleIcon
        onClick={toggleSidebarMobile}
        className="relative flex size-8 cursor-pointer fill-tertiary xl:hidden"
      />
      <SidebarToggleIcon
        onClick={toggleSidebarDesktop}
        className="relative hidden size-8 cursor-pointer fill-tertiary xl:flex"
      /> */}
      <div className="navbar flex min-h-14 justify-between px-4">
        {/* LOGO */}
        <div className="flex-1 lg:flex-none">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <div className="flex items-center gap-2">
              {/* <ShoppingCartIcon className="size-9 text-primary" /> */}
              <img src="/tien_giang_icon.webp " alt="Logo" className="size-10 object-contain" />
              <div>

                {!isAuthenticated && (
                  <span
                    className="font-mono text-xl font-semibold tracking-widest text-[#0060C9]" style={{ fontFamily: 'UTM Black' }}
                  >
                    BK MÊKÔNG
                  </span>
                )}
                {isAuthenticated && (
                  <span
                    className="font-mono text-xl font-semibold tracking-widest text-[#069843]" style={{ fontFamily: 'UTM Black' }}
                  >
                    CỔNG ĐIỆN TỬ CÔNG TY ABCD
                  </span>
                )}

                <div
                  className={`text-xs opacity-70 ${!isAuthenticated ? 'text-[#0060C9]' : isAuthenticated ? 'text-[#069843]' : 'text-[#003264]'} line-2 hidden max-w-[40rem] md:block`}
                  style={{ fontFamily: 'SVN Arial, sans-serif' }}
                >
                  <span>
                    Dự án web được thực hiện bởi sinh viên Trường Đại học Bách Khoa TP.HCM (HCMUT), nhằm theo dõi và phân tích tình hình xâm nhập mặn
                  </span>
                </div>

              </div>
            </div>
          </Link>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-4">

          {!isAuthenticated && (
            <div className="indicator flex flex-col items-center">
              {/* CHANGED: Thêm 'hidden md:block' để ẩn text trên màn hình nhỏ */}
              <div className="hidden rounded-full p-2 text-[#069843] transition-colors md:block" style={{ fontFamily: 'UTM Black' }}>
                ĐƠN VỊ TÀI TRỢ VÀ HỢP TÁC
              </div>

              {/* separated sponsor circles placed under the label */}
              {/* CHANGED: Điều chỉnh margin và gap cho di động */}
              <div className="flex justify-between gap-2 md:mt-2 md:gap-4" aria-hidden="true">
                <span className="inline-block size-7 rounded-full bg-[#069843]" />
                <span className="inline-block size-7 rounded-full bg-[#069843]" />
                <span className="inline-block size-7 rounded-full bg-[#069843]" />
                <span className="inline-block size-7 rounded-full bg-[#069843]" />
              </div>
            </div>
          )}

          {isAuthenticated && (
            <div className="indicator relative flex items-center justify-between">
              {/* CHANGED: Giảm gap trên di động */}
              <div className="flex items-center gap-2 md:gap-3" aria-hidden="true">

                {/* CHANGED: Thu nhỏ icon '?' trên di động */}
                <span className="inline-block size-10 rounded-full border-2 border-solid border-[#0060C9] bg-white md:size-14">
                  <Link to='/' className="flex size-full items-center justify-center text-2xl font-bold text-[#0060C9] md:text-4xl" style={{ fontFamily: 'UTM Black' }}>?</Link>
                </span>

                {/* CHANGED: Thu nhỏ icon 'setting' trên di động */}
                <span className="inline-block size-10 rounded-full border-2 border-solid border-[#0060C9] bg-white md:size-14">
                  <Link
                    to='/home' className="flex size-full items-center justify-center text-4xl">
                    <img src='/setting.png' alt='home icon' className='size-6 object-contain md:size-8' />
                  </Link>
                </span>
              </div>



              <div className="ml-2 shrink-0 md:ml-4">
                <UserBanner userName={''} unitInfo={''} avatarSrc={''} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>


  );
};

export default Header;
