import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { ReactNode, useMemo } from 'react';

import {
  HomeIcon,
  SidebarToggleIcon,
} from '@/components/icons';

import BachKhoaLogo from '../../assets/bachkhoa.png';


type ItemProps = {
  isComingSoon?: boolean;
  name: string;
  route: string;
  children: ReactNode;
  current: string;
};

const Item = ({ isComingSoon, name, route, children, current }: ItemProps) => {
  const selected = useMemo(() => {
    return current.startsWith(route);
  }, [current, route]);

  if (isComingSoon)
    return (
      <div
        className={` ${selected ? 'bg-primary font-bold text-white' : ''} group relative flex h-14 w-full cursor-not-allowed flex-row items-center gap-4 overflow-x-hidden rounded-lg p-4 duration-200 ease-in-out hover:bg-tertiary-300 hover:text-white`}
      >
        {children}
        <span className="flex group-hover:hidden">{name}</span>
        <span className="hidden font-bold opacity-0 group-hover:flex group-hover:opacity-100">
          SẮP RA MĂT
        </span>
      </div>
    );

  return (
    <Link
      to={route}
      className={` ${selected ? 'bg-primary font-bold text-white' : ''} group relative flex h-14 w-full flex-row items-center gap-4 overflow-x-hidden rounded-lg p-4 duration-200 ease-in-out hover:bg-primary-300 hover:text-white`}
    >
      {children}
      {name}
    </Link>
  );
};

type SidebarMobileProps = {
  isManager?: boolean;
  opened: boolean;
  close: () => void;
};

const SidebarMobile = ({ opened, close }: SidebarMobileProps) => {
  const router = useRouterState();
  const navigate = useNavigate();

  // const { isStudent } = useUserStore();

  return (
    <>
      <div
        className={`${opened ? 'fixed' : 'hidden'} left-0 top-0 z-[99] h-screen w-screen cursor-pointer bg-[#00000080] xl:hidden`}
        onClick={close}
      />
      <div
        className={`${opened ? 'left-0' : '-left-full'} fixed top-0 z-[99] flex h-screen w-80 flex-col justify-between gap-5 overflow-hidden border-r border-solid border-tertiary-300 bg-white p-5 duration-200 ease-in-out md:w-[22.5rem] xl:hidden`}
      >
        <div className="flex size-full flex-col gap-5 overflow-hidden overflow-y-auto">
          <div className="relative flex h-20 w-full flex-row items-center justify-between md:h-20 3xl:h-24">
            <img
              aria-label="BachKhoa Logo"
              src={BachKhoaLogo}
              onClick={() => {
                navigate({ to: '/dashboard' });
              }}
              className="relative h-6 w-auto cursor-pointer md:h-8"
            />
            <SidebarToggleIcon
              onClick={close}
              className="relative size-8 cursor-pointer fill-tertiary"
            />
          </div>
          <div className="relative flex flex-col gap-2">
            <div className="mb-2 font-bold">Chung</div>
            <Item
              name="Trang chủ"
              route="/dashboard"
              current={router.location.pathname}
            >
              <HomeIcon
                className={`${router.location.pathname.startsWith('/dashboard') ? 'fill-white' : 'fill-tertiary group-hover:fill-white'} size-6 duration-200 ease-in-out `}
              />
            </Item>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarMobile;
