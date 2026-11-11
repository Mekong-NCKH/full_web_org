import { ReactNode } from 'react';

import ScrollToTop from '@/components/scroll-to-top';
import { useUserStore } from '@/stores';

// import CountdownBar from '../countdown-bar';

import Footer from './footer';
import Header from './header';
import Subheader from './sub-header';
// import SidebarDesktop from './sidebar-desktop';
// import SidebarMobile from './sidebar-mobile';

type LoggedInProps = {
  children: ReactNode;
};

const LoggedInLayout = ({ children }: LoggedInProps) => {
  const { user, setUser } = useUserStore();

  return (
    <div className="relative flex min-h-screen w-full min-w-[320px] flex-col bg-white">
      <ScrollToTop />
      <Header user={user} setUser={setUser} />
      <Subheader />
      <div className="relative flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
};

export default LoggedInLayout;
