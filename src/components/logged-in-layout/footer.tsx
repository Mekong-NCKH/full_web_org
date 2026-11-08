import React from 'react';

const Footer: React.FC = () => {
  return (
     <footer className="flex items-center justify-center bg-[#0056b3] px-3 py-5 font-sans">

      <div className="w-full max-w-6xl overflow-hidden rounded-xl shadow-md" style={{ fontFamily: 'UTM Black' }}>

        <div className="bg-white p-6 text-center text-[#005DCE] md:px-10">
          {/* Tên công ty */}
          <h3 className="text-lg font-bold md:text-xl">
            CÔNG TY TNHH MỘT THÀNH VIÊN KHAI THÁC CÔNG TRÌNH THỦY LỢI TIỀN GIANG
          </h3>
        </div>

        <div className="bg-[#e6f7ff] px-6 pb-6 text-center text-[#004080] md:px-10">
          <hr className="mx-auto mb-4 h-px w-3/5 border-0 bg-[#004080]" />

          {/* Khối thông tin liên hệ */}
          <div className="text-sm leading-relaxed md:text-base">

            {/* Địa chỉ */}
            <p className="mb-2.5">
              Địa chỉ: 65/4 Trần Hưng Đạo - Phường 06 - TP. Mỹ Tho - Tỉnh Tiền Giang
            </p>

            {/* Thông tin SĐT, Fax, Email */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
              <span className="whitespace-nowrap">Điện thoại: 073.3870221</span>
              <span className="whitespace-nowrap">Fax: 073.3871388</span>
              <span className="whitespace-nowrap">Email: ktcttltg@yahoo.com.vn</span>
            </div>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;