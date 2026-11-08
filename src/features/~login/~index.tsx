import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
// import Lottie from 'lottie-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// import CustomGoogleButton from '@/components/button/google-button';
import handleAxiosError from '@/helpers/handle-axios-error';
import { useAuthStore, useUserStore } from '@/stores';

import mockupUsers from '../../../public/mockupUsers.json';
// import overseaStudent from '../../assets/animations/Uy24MEqryK.json';
import BachKhoaLogo from '../../assets/bachkhoa.png';

import { WaveLeft, WaveRight, WaveRightRotated } from './wave';


export const Route = createFileRoute('/login/')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useUserStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  void loading;
  const [wrongCredentials, setWrongCredentials] = useState(false);

  // Load remembered email from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rememberedEmail');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);
  // const loginWithGoogle = async (credentialResponse: string) => {
  //   try {
  //     setLoading(true);
  //     // const { accessToken } = (
  //     //   await AuthService.loginWithGoogle(credentialResponse)
  //     // ).data;
  //     console.log('credentialResponse', credentialResponse);
  //     const accessToken = 'hehe123'; // temp data
  //     // Persist token via the auth store (zustand + persist)
  //     setToken(accessToken);
  //     navigate({ to: '/dashboard' });
  //   } catch (error: unknown) {
  //     handleAxiosError(error, (message: string) => {
  //       toast.error(message);
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const ViewPassworIcon = ({ className }: { className?: string }) => {
    return (
      <svg
        width="22"
        height="15"
        viewBox="0 0 22 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        onClick={() => setViewPassword((s) => !s)}
        role="button"
        aria-hidden="true"
      >
        <path d="M11 0C6 0 1.73 3.11 0 7.5C1.73 11.89 6 15 11 15C16 15 20.27 11.89 22 7.5C20.27 3.11 16 0 11 0ZM11 12.5C8.24 12.5 6 10.26 6 7.5C6 4.74 8.24 2.5 11 2.5C13.76 2.5 16 4.74 16 7.5C16 10.26 13.76 12.5 11 12.5ZM11 4.5C9.34 4.5 8 5.84 8 7.5C8 9.16 9.34 10.5 11 10.5C12.66 10.5 14 9.16 14 7.5C14 5.84 12.66 4.5 11 4.5Z" fill="#3D4863" />
      </svg>

    )
  }
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Find user from mockup data
      const foundUser = mockupUsers.find(
        (u) => u.email === email && u.password === password
      );

      if (!foundUser) {
        // toast.error('Email hoặc mật khẩu không đúng!');
        setWrongCredentials(true);
        return;
      }

      // Generate a token based on user info
      const accessToken = `token-${foundUser.role}-${Date.now()}`;

      // Set token in auth store (this also sets isAuthenticated = true)
      setToken(accessToken);

      // Persist remembered email if requested
      try {
        if (rememberMe) localStorage.setItem('rememberedEmail', foundUser.email);
        else localStorage.removeItem('rememberedEmail');
      } catch {
        // ignore storage errors
      }

      // Set user data in user store
      setUser({
        _id: foundUser.email,
        googleId: '',
        appleId: null,
        email: foundUser.email,
        firstName: foundUser.role.charAt(0).toUpperCase() + foundUser.role.slice(1),
        lastName: 'User',
        picture: null,
        dateOfBirth: null,
        phone: null,
        isManager: foundUser.role === 'coordinator' || foundUser.role === 'tutor' || foundUser.role === 'chairman',
        isStudent: foundUser.role === 'student',
        isTutor: foundUser.role === 'tutor',
        isCoordinator: foundUser.role === 'coordinator',
        statisticalPermission: foundUser.role === 'coordinator' || foundUser.role === 'chairman',
        isChairman: foundUser.role === 'chairman',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        address: '',
        highSchool: null,
      });

      toast.success(`Đăng nhập thành công với vai trò ${foundUser.role}!`);
      navigate({ to: '/dashboard' });
    } catch (error: unknown) {
      handleAxiosError(error, (message: string) => {
        toast.error(message);
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen max-h-screen w-screen overflow-hidden bg-white">
      <div className="absolute left-8 top-8 flex items-center gap-x-2 2xs:left-10 2xs:top-10 md:left-12 md:top-12 lg:left-16 lg:top-16">
        <img
          src={BachKhoaLogo}
          alt="BachKhoa Logo"
          className="h-8 md:h-10 lg:h-[90px]"
        />
        <span className='text-5xl font-bold text-[#0329E9]'
        >HCMUT SSO</span>
      </div>
      <div className=" m-auto flex size-full min-h-0 flex-col items-center justify-center gap-y-4 overflow-hidden 2xs:gap-y-5 md:gap-y-6 lg:gap-y-8 3xl:gap-y-12">
        <h2 className="-mb-4 text-center text-[16px] font-bold text-[#0329E9] 2xs:text-[20px] md:text-[24px] xl:text-[32px] 3xl:text-[40px]">
          ĐĂNG NHẬP
        </h2>
        <h3>
          Nhập thông tin tài khoản của bạn
        </h3>
        {/* <div className="flex size-36 items-center justify-center rounded-full bg-primary-700 2xs:size-40 md:size-56 lg:size-72 3xl:size-[360px] 4xl:size-[400px]">
          <div className="m-auto flex size-32 items-center justify-center rounded-full bg-primary-300 2xs:size-36 md:size-[200px] lg:size-[260px] 3xl:size-[320px] 4xl:size-[360px]">
            <Lottie
              loop={true}
              animationData={overseaStudent}
              className="size-28 md:size-44 lg:size-[200px] 3xl:size-[240px] 4xl:size-[280px]"
            />
          </div>
        </div>
        <h3 className="mx-auto w-full text-center text-xs font-semibold leading-6 text-secondary md:w-full md:text-[16px] lg:max-w-96 2xl:text-[20px]">
          Tutor Support System
          <br />
          Nền tảng học tập, hỗ trợ học sinh mạnh mẽ
        </h3> */}
        <form onSubmit={handleEmailLogin} className="flex flex-col items-center gap-y-3">
          <div className='font-bold'>
            <h4>Nhập email của bạn</h4>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={`w-72 rounded border px-3 py-2 text-sm shadow-sm ${wrongCredentials ? 'border-red-500' : ''}`}
              required
            />
            {wrongCredentials && (
              <p className="mt-1 text-xs text-red-600">sai tên người dùng</p>
            )}
          </div>

          <div className='font-bold'>
            <h4>Mật khẩu</h4>

            <div className="relative">

              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type={viewPassword && password ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-72 rounded border py-2 pl-3 pr-10 text-sm shadow-sm ${wrongCredentials ? 'border-red-500' : ''}`}
                required
              />
              <ViewPassworIcon className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" />
              {wrongCredentials && (
                <p className="mt-1 text-xs text-red-600">sai mật khẩu</p>
              )}
            </div>

          </div>
          {/* checkbox remember this device and forgot password link */}
          <div className="flex w-72 items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Nhớ thiết bị này</span>
            </label>
            <a
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="text-blue-600 hover:underline"
            >
              Quên mật khẩu?
            </a>
          </div>
          <button
            type="submit"
            className="w-72 rounded bg-[#0329E9] px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {/* <div className="">Hoặc</div>
        <CustomGoogleButton
          onSuccess={async (credentialResponse) => {
            if (!credentialResponse.credential) {
              toast.error(
                'Có lỗi xảy ra khi đăng nhập bằng tài khoản Google. Vui lòng thử lại!',
              );
              return;
            }
            await loginWithGoogle(credentialResponse.credential);
          }}
          onError={() => {
            toast.error(
              'Có lỗi xảy ra khi đăng nhập bằng tài khoản Google. Vui lòng thử lại!',
            );
          }}
        /> */}
      </div>
      <div className="bg-primary"></div>
      <div className="absolute right-0 top-0 max-h-44 w-1/2 rotate-180 xs:w-1/3 md:max-h-52 lg:hidden">
        <WaveRightRotated className="size-full" />
      </div>
      <div className="absolute bottom-0 left-0 max-h-44 w-1/2 xs:w-1/3 md:max-h-52 lg:max-h-60 lg:w-[30%] xl:max-h-64 xl:w-1/4 2xl:max-h-72 2xl:w-1/5">
        <WaveLeft className="size-full" />
      </div>
      <div className="absolute bottom-0 right-0 hidden max-h-52 w-1/3 lg:flex lg:max-h-60 lg:w-[30%] xl:max-h-64 xl:w-1/4 2xl:max-h-72 2xl:w-1/5">
        <WaveRight className="size-full" />
      </div>
    </div>
  );
}
