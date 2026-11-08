import { UserBannerType } from "@/types/home.type";

const UserBanner = (props: UserBannerType) => {
  return (
    <div className="mx-auto my-3 flex w-full max-w-sm items-center rounded-full border-2 border-[#0056b3] bg-white p-1.5 pr-3 font-sans shadow-sm">
      
      {/* Khối chứa thông tin văn bản */}
      <div className="ml-2 mr-3 grow text-[#0056b3]"> 
        <h3 className="text-lg font-semibold uppercase leading-tight">
          {/* Tên người dùng */}
          {props.userName || "NGUYỄN VĂN A"} 
        </h3>
        <p className="mt-0.5 text-xs">
          {/* Thông tin đơn vị/ID */}
          {props.unitInfo || "Đơn vị B - 2453445"} 
        </p>
      </div>

      <div className="shrink-0">
        <img
          src={props.avatarSrc || './demo_userBanner.png'}
          alt="User Avatar"
          className="size-12 rounded-full border-2 border-white object-cover shadow-sm"
        />
      </div>
    </div>
  );
};

export default UserBanner;