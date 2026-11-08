import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { ReactNode, useMemo, SVGProps } from 'react';

// import { HomeIcon } from '@/components/icons';

const rawUserStore = localStorage.getItem('userStore');
const userStore = rawUserStore ? JSON.parse(rawUserStore as string) : null;
const State = userStore?.state ?? null;
const userLocalStore = State.user ?? null;

type IconProps = SVGProps<SVGSVGElement>;
// Icon cho "Khóa học"
const IconKhoaHoc = (props: IconProps) => (
  <svg viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M18 3.78741H14V1.8937C14 0.842698 13.11 0 12 0H8C6.89 0 6 0.842698 6 1.8937V3.78741H2C0.89 3.78741 0.00999999 4.63011 0.00999999 5.68111L0 16.0965C0 17.1475 0.89 17.9902 2 17.9902H18C19.11 17.9902 20 17.1475 20 16.0965V5.68111C20 4.63011 19.11 3.78741 18 3.78741ZM12 3.78741H8V1.8937H12V3.78741Z" fill="currentColor" />
  </svg>
);

//Icon cho "Đăng ký môn học"
const IconDangKyMonHoc = (props: IconProps) => (
  <svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M4 9.63895V13.4264L11 17.0433L18 13.4264V9.63895L11 13.2559L4 9.63895ZM11 0L0 5.68111L11 11.3622L20 6.71318V13.2559H22V5.68111L11 0Z" fill="#3D4863" />
  </svg>
);

// Icon cho "Lịch sử đăng ký"
const IconLichSu = (props: IconProps) => (
  <svg viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M13.1055 9H17.0585C17.6045 9 18.0465 9.448 18.0465 10C18.0465 10.552 17.6045 11 17.0585 11H12.1175C11.987 10.9992 11.8579 10.9727 11.7376 10.922C11.6173 10.8714 11.5082 10.7975 11.4164 10.7046C11.3247 10.6118 11.2521 10.5017 11.2029 10.3808C11.1537 10.2599 11.1287 10.1305 11.1295 10V4C11.1295 3.448 11.5715 3 12.1175 3C12.6635 3 13.1055 3.448 13.1055 4V9ZM19.1055 2.929C20.9654 4.81183 22.0056 7.35348 21.9995 10C21.9995 15.523 17.5755 20 12.1175 20V18C16.4835 18 20.0235 14.418 20.0235 10C20.0286 7.88253 19.196 5.84899 17.7075 4.343C16.9781 3.60074 16.1081 3.01126 15.1483 2.60898C14.1885 2.20669 13.1582 1.99967 12.1175 2C8.57353 2 5.57353 4.36 4.57053 7.612L5.92253 6.689C6.03 6.61562 6.15101 6.56436 6.27849 6.53821C6.40597 6.51205 6.53739 6.51153 6.66507 6.53665C6.79276 6.56178 6.91418 6.61206 7.02224 6.68457C7.13031 6.75708 7.22287 6.85037 7.29453 6.959C7.4412 7.17907 7.49542 7.44801 7.44546 7.70772C7.3955 7.96742 7.24538 8.19705 7.02753 8.347L3.75053 10.584C3.64305 10.6574 3.52204 10.7086 3.39456 10.7348C3.26708 10.7609 3.13567 10.7615 3.00798 10.7363C2.88029 10.7112 2.75888 10.6609 2.65081 10.5884C2.54275 10.5159 2.45019 10.4226 2.37853 10.314L0.169526 6.998C0.0225357 6.77785 -0.0318606 6.50868 0.0181082 6.24873C0.068077 5.98878 0.218392 5.75896 0.436526 5.609C0.544005 5.53562 0.665009 5.48436 0.792491 5.45821C0.919973 5.43205 1.05139 5.43153 1.17907 5.45665C1.30676 5.48178 1.42818 5.53206 1.53624 5.60457C1.64431 5.67708 1.73687 5.77037 1.80853 5.879L2.64753 7.138C3.86253 3.01 7.64253 0 12.1175 0C14.8465 0 17.3175 1.12 19.1055 2.929Z" fill="currentColor" />
  </svg>
);

// Icon cho "Thư viện"
const IconThuVien = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M3 22.5H2.25C1.85218 22.5 1.47064 22.342 1.18934 22.0607C0.908035 21.7794 0.75 21.3978 0.75 21V5.25C0.75 4.85218 0.908035 4.47064 1.18934 4.18934C1.47064 3.90804 1.85218 3.75 2.25 3.75H3C3.39782 3.75 3.77936 3.90804 4.06066 4.18934C4.34196 4.47064 4.5 4.85218 4.5 5.25V21C4.5 21.3978 4.34196 21.7794 4.06066 22.0607C3.77936 22.342 3.39782 22.5 3 22.5Z" fill="currentColor" />
    <path d="M11.25 8.25C11.25 7.85218 11.092 7.47064 10.8107 7.18934C10.5294 6.90804 10.1478 6.75 9.75 6.75H6.75C6.35218 6.75 5.97064 6.90804 5.68934 7.18934C5.40804 7.47064 5.25 7.85218 5.25 8.25V9.5625C5.25 9.61223 5.26975 9.65992 5.30492 9.69508C5.34008 9.73025 5.38777 9.75 5.4375 9.75H11.0625C11.1122 9.75 11.1599 9.73025 11.1951 9.69508C11.2302 9.65992 11.25 9.61223 11.25 9.5625V8.25Z" fill="currentColor" />
    <path d="M5.25 21C5.25 21.3978 5.40804 21.7794 5.68934 22.0607C5.97064 22.342 6.35218 22.5 6.75 22.5H9.75C10.1478 22.5 10.5294 22.342 10.8107 22.0607C11.092 21.7794 11.25 21.3978 11.25 21V19.5938C11.25 19.5689 11.2401 19.545 11.2225 19.5275C11.205 19.5099 11.1811 19.5 11.1562 19.5H5.34375C5.31889 19.5 5.29504 19.5099 5.27746 19.5275C5.25988 19.545 5.25 19.5689 5.25 19.5938V21Z" fill="currentColor" />
    <path d="M11.1562 11.25H5.34375C5.29197 11.25 5.25 11.292 5.25 11.3438V17.9062C5.25 17.958 5.29197 18 5.34375 18H11.1562C11.208 18 11.25 17.958 11.25 17.9062V11.3438C11.25 11.292 11.208 11.25 11.1562 11.25Z" fill="currentColor" />
    <path d="M15 22.5H13.5C13.1022 22.5 12.7206 22.342 12.4393 22.0607C12.158 21.7794 12 21.3978 12 21V3C12 2.60218 12.158 2.22064 12.4393 1.93934C12.7206 1.65804 13.1022 1.5 13.5 1.5H15C15.3978 1.5 15.7794 1.65804 16.0607 1.93934C16.342 2.22064 16.5 2.60218 16.5 3V21C16.5 21.3978 16.342 21.7794 16.0607 22.0607C15.7794 22.342 15.3978 22.5 15 22.5Z" fill="currentColor" />
    <path d="M23.245 20.8803L21.7343 4.94276C21.6649 4.20916 20.9402 3.67713 20.1157 3.75635L18.6227 3.89698C17.7982 3.97526 17.186 4.63338 17.2554 5.36698L18.7661 21.3045C18.8355 22.0381 19.5602 22.5701 20.3847 22.4909L21.8777 22.3503C22.7022 22.272 23.3144 21.6139 23.245 20.8803Z" fill="currentColor" />
  </svg>
);

// Icon cho "Thống kê"
const IconThongKe = (props: IconProps) => (
  <svg width="19" height="10" viewBox="0 0 19 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17.1878 3.35866e-07C16.9334 6.58455e-05 16.6829 0.0622479 16.4579 0.181144C16.233 0.30004 16.0406 0.472054 15.8972 0.682242C15.7539 0.89243 15.6641 1.13443 15.6356 1.38723C15.607 1.64002 15.6406 1.89596 15.7335 2.13281L12.4456 5.4207C12.0791 5.27643 11.6715 5.27643 11.305 5.4207L8.95459 3.07031C9.04766 2.83341 9.08144 2.57736 9.05301 2.32442C9.02458 2.07149 8.93478 1.82933 8.79144 1.61901C8.64809 1.40868 8.45554 1.23656 8.23052 1.11761C8.00549 0.998655 7.75482 0.936475 7.50029 0.936475C7.24576 0.936475 6.99509 0.998655 6.77007 1.11761C6.54505 1.23656 6.35249 1.40868 6.20914 1.61901C6.0658 1.82933 5.97601 2.07149 5.94757 2.32442C5.91914 2.57736 5.95293 2.83341 6.04599 3.07031L2.1331 6.9832C1.79893 6.85212 1.42982 6.84009 1.08782 6.94914C0.745824 7.05819 0.451804 7.28167 0.2552 7.58201C0.0585955 7.88234 -0.0286031 8.24121 0.00826602 8.59827C0.0451351 8.95534 0.203823 9.28882 0.457648 9.54264C0.711473 9.79647 1.04495 9.95516 1.40202 9.99203C1.75908 10.0289 2.11795 9.9417 2.41829 9.74509C2.71862 9.54849 2.9421 9.25447 3.05115 8.91247C3.16021 8.57048 3.14818 8.20136 3.01709 7.86719L6.92998 3.9543C7.2965 4.09857 7.70408 4.09857 8.0706 3.9543L10.421 6.30469C10.3279 6.54159 10.2941 6.79764 10.3226 7.05058C10.351 7.30351 10.4408 7.54567 10.5841 7.756C10.7275 7.96632 10.92 8.13844 11.1451 8.25739C11.3701 8.37635 11.6208 8.43853 11.8753 8.43853C12.1298 8.43853 12.3805 8.37635 12.6055 8.25739C12.8305 8.13844 13.0231 7.96632 13.1664 7.756C13.3098 7.54567 13.3996 7.30351 13.428 7.05058C13.4564 6.79764 13.4227 6.54159 13.3296 6.30469L16.6175 3.0168C16.8314 3.10085 17.0613 3.13666 17.2907 3.12168C17.5201 3.10669 17.7433 3.04128 17.9445 2.9301C18.1457 2.81893 18.3199 2.66473 18.4547 2.47851C18.5894 2.29228 18.6814 2.07861 18.7241 1.85274C18.7668 1.62687 18.7592 1.39436 18.7017 1.1718C18.6442 0.949228 18.5383 0.742083 18.3916 0.565135C18.2449 0.388186 18.0609 0.245792 17.8528 0.148106C17.6447 0.0504202 17.4177 -0.000150373 17.1878 3.35866e-07Z" fill="white"/>
  </svg>
);

// Icon cho "Lịch học"
const IconLichHoc = (props: IconProps) => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M5 0.625C5 0.45924 4.93415 0.300269 4.81694 0.183058C4.69973 0.065848 4.54076 0 4.375 0C4.20924 0 4.05027 0.065848 3.93306 0.183058C3.81585 0.300269 3.75 0.45924 3.75 0.625V1.25H2.5C1.83696 1.25 1.20107 1.51339 0.732233 1.98223C0.263392 2.45107 0 3.08696 0 3.75L0 5H20V3.75C20 3.08696 19.7366 2.45107 19.2678 1.98223C18.7989 1.51339 18.163 1.25 17.5 1.25H16.25V0.625C16.25 0.45924 16.1842 0.300269 16.0669 0.183058C15.9497 0.065848 15.7908 0 15.625 0C15.4592 0 15.3003 0.065848 15.1831 0.183058C15.0658 0.300269 15 0.45924 15 0.625V1.25H5V0.625ZM20 17.5V6.25H0V17.5C0 18.163 0.263392 18.7989 0.732233 19.2678C1.20107 19.7366 1.83696 20 2.5 20H17.5C18.163 20 18.7989 19.7366 19.2678 19.2678C19.7366 18.7989 20 18.163 20 17.5ZM15.625 8.75H16.875C17.0408 8.75 17.1997 8.81585 17.3169 8.93306C17.4342 9.05027 17.5 9.20924 17.5 9.375V10.625C17.5 10.7908 17.4342 10.9497 17.3169 11.0669C17.1997 11.1842 17.0408 11.25 16.875 11.25H15.625C15.4592 11.25 15.3003 11.1842 15.1831 11.0669C15.0658 10.9497 15 10.7908 15 10.625V9.375C15 9.20924 15.0658 9.05027 15.1831 8.93306C15.3003 8.81585 15.4592 8.75 15.625 8.75Z" fill="currentColor" />
  </svg>
);

// Icon cho "Giám sát hệ thống" (DÙNG STROKE)
const IconGiamSat = (props: IconProps) => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_1266_3570)">
      <path d="M8.60417 3.5975C8.95917 2.13417 11.0408 2.13417 11.3958 3.5975C11.4491 3.81733 11.5535 4.02148 11.7006 4.19333C11.8477 4.36518 12.0332 4.49988 12.2422 4.58645C12.4512 4.67303 12.6776 4.70904 12.9032 4.69156C13.1287 4.67407 13.3469 4.60359 13.54 4.48583C14.8258 3.7025 16.2983 5.17417 15.515 6.46083C15.3974 6.65388 15.327 6.87195 15.3096 7.09731C15.2922 7.32267 15.3281 7.54897 15.4146 7.75782C15.5011 7.96666 15.6356 8.15215 15.8073 8.29921C15.9789 8.44627 16.1829 8.55075 16.4025 8.60417C17.8658 8.95917 17.8658 11.0408 16.4025 11.3958C16.1827 11.4491 15.9785 11.5535 15.8067 11.7006C15.6348 11.8477 15.5001 12.0332 15.4135 12.2422C15.327 12.4512 15.291 12.6776 15.3084 12.9032C15.3259 13.1287 15.3964 13.3469 15.5142 13.54C16.2975 14.8258 14.8258 16.2983 13.5392 15.515C13.3461 15.3974 13.1281 15.327 12.9027 15.3096C12.6773 15.2922 12.451 15.3281 12.2422 15.4146C12.0333 15.5011 11.8479 15.6356 11.7008 15.8073C11.5537 15.9789 11.4492 16.1829 11.3958 16.4025C11.0408 17.8658 8.95917 17.8658 8.60417 16.4025C8.5509 16.1827 8.44648 15.9785 8.29941 15.8067C8.15233 15.6348 7.96676 15.5001 7.75779 15.4135C7.54882 15.327 7.32236 15.291 7.09685 15.3084C6.87133 15.3259 6.65313 15.3964 6.46 15.5142C5.17417 16.2975 3.70167 14.8258 4.485 13.5392C4.60258 13.3461 4.67296 13.1281 4.6904 12.9027C4.70785 12.6773 4.67187 12.451 4.58539 12.2422C4.49892 12.0333 4.36438 11.8479 4.19273 11.7008C4.02107 11.5537 3.81714 11.4492 3.5975 11.3958C2.13417 11.0408 2.13417 8.95917 3.5975 8.60417C3.81733 8.5509 4.02148 8.44648 4.19333 8.29941C4.36518 8.15233 4.49988 7.96676 4.58645 7.75779C4.67303 7.54882 4.70904 7.32236 4.69156 7.09685C4.67407 6.87133 4.60359 6.65313 4.48583 6.46C3.7025 5.17417 5.17417 3.70167 6.46083 4.485C7.29417 4.99167 8.37417 4.54333 8.60417 3.5975Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="clip0_1266_3570">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

import BachKhoaLogo from '../../assets/bachkhoa.png';

// import { useUserStore } from '@/stores';

type ItemProps = {
  isComingSoon?: boolean;
  name: string;
  route: string;
  children?: ReactNode;
  opened: boolean;
  current: string;
};

const Item = ({
  isComingSoon,
  opened,
  name,
  route,
  children,
  current,
}: ItemProps) => {
  const selected = useMemo(() => {
    return current.startsWith(route);
  }, [current, route]);

  if (isComingSoon)
    return (
      <div
        className={`${opened ? 'justify-start' : 'max-w-14 justify-center'} ${selected ? 'bg-primary font-bold text-white ' : 'hover:bg-tertiary-300 hover:text-white'} group relative flex h-14 w-full shrink-0 cursor-not-allowed select-none flex-row items-center gap-4 overflow-x-hidden rounded-lg p-4 duration-200 ease-in-out`}
      >
        {children}
        <span
          className={`${opened ? 'flex' : 'hidden'} overflow-hidden truncate`}
        >
          <span className="flex group-hover:hidden">{name}</span>
          <span className="hidden font-bold uppercase opacity-0 group-hover:flex group-hover:opacity-100">
            SẮP RA MẮT
          </span>
        </span>
      </div>
    );

  return (
    <Link
      to={route}
      className={`${opened ? 'justify-start' : 'max-w-14 justify-center'} ${selected ? 'bg-primary font-bold text-white ' : 'hover:bg-primary-300 hover:text-white'} group relative flex h-14 w-full flex-row items-center gap-4 overflow-x-hidden rounded-lg p-4 duration-200 ease-in-out`}
    >
      {children}
      <span
        className={`${opened ? 'flex' : 'hidden'} overflow-hidden truncate`}
      >
        {name}
      </span>
    </Link>
  );
};

type SidebarDesktopProps = {
  isManager?: boolean;
  opened: boolean;
};

const SidebarDesktop = ({ opened }: SidebarDesktopProps) => {
  const router = useRouterState();
  const navigate = useNavigate();
  // const { isStudent } = useUserStore();

  return (
    <div
      className={`${opened ? 'w-80 3xl:w-[22.5rem]' : 'w-24'} sticky left-0 top-0 z-50 hidden h-screen flex-col justify-between gap-5 overflow-hidden border-r border-solid border-tertiary-300 bg-white px-5 pb-5 duration-200 ease-in-out xl:flex`}
    >
      <div className="relative flex h-full flex-col gap-5 overflow-hidden overflow-y-auto">
        <div className="relative flex h-20 w-full shrink-0 flex-row items-center gap-4 overflow-x-hidden md:h-20 3xl:h-24">
          <img
            alt='BackKhoaLogo'
            src={BachKhoaLogo}
            onClick={() => {
              navigate({ to: '/dashboard' });
            }}
            className="h-10 cursor-pointer"
          />
          {opened && (
            <div className="shrink-0 select-none text-xl font-bold text-[#0329E9]">
              Tutor System
            </div>
          )}
        </div>

        {/* Common */}
        <div className="relative flex shrink-0 flex-col gap-2">
          {/*           
          <Item
            opened={opened}
            name="Trang chủ"
            route="/dashboard"
            current={router.location.pathname}
          >
            <HomeIcon
              className={`${router.location.pathname.startsWith('/dashboard') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
            />
          </Item> */}
          <Item
            opened={opened}
            name="Khóa học của tôi"
            route="/dashboard"
            current={router.location.pathname}
          >
            <IconKhoaHoc
              className={`${router.location.pathname.startsWith('/my-courses') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
            />
          </Item>

          <Item
            opened={opened}
            name="Đăng ký môn học"
            route="/register-session"
            current={router.location.pathname}
          >
            <IconDangKyMonHoc
              className={`${router.location.pathname.startsWith('/register-session') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
            />
          </Item>

          <Item
            opened={opened}
            name="Lịch sử đăng ký"
            route="/registration-history"
            current={router.location.pathname}
          >
            <IconLichSu
              className={`${router.location.pathname.startsWith('/registration-history') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
            />
          </Item>

          <Item
            opened={opened}
            name="Thư viện"
            route="/library"
            current={router.location.pathname}
          >
            <IconThuVien
              className={`${router.location.pathname.startsWith('/library') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
            />
          </Item>

          <Item
            opened={opened}
            name="Lịch học"
            route="/schedule"
            current={router.location.pathname}
          >
            <IconLichHoc
              className={`${router.location.pathname.startsWith('/schedule') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
            />
          </Item>

          {userLocalStore && userLocalStore.statisticalPermission && (

            <Item
              opened={opened}
              name="Giám sát hệ thống"
              route="/system-monitoring"
              current={router.location.pathname}
            >

              {/* QUAN TRỌNG: Icon này dùng 'stroke', không dùng 'fill'.
        Hãy đổi className thành 'stroke-white' và 'stroke-tertiary'.
               */}
              <IconGiamSat
                className={`${router.location.pathname.startsWith('/system-monitoring') ? 'stroke-white' : 'stroke-tertiary group-hover:stroke-white'} size-6 duration-200 ease-in-out `}
              />
            </Item>
          )}
          {userLocalStore && userLocalStore.statisticalPermission && (

            <Item
              opened={opened}
              name="Thống Kê"
              route="/statistical"
              current={router.location.pathname}
            >

              {/* QUAN TRỌNG: Icon này dùng 'stroke', không dùng 'fill'.
        Hãy đổi className thành 'stroke-white' và 'stroke-tertiary'.
               */}
              <IconThongKe
                className={`${router.location.pathname.startsWith('/statistical') ? 'stroke-white' : 'stroke-tertiary group-hover:stroke-white'} size-6 duration-200 ease-in-out `}
              />
            </Item>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarDesktop;
