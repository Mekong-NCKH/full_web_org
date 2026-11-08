import { useState } from 'react';

import useLockBodyScroll from '@/hooks/use-lock-body-scroll';

// --- Định nghĩa SVG Icons ---

const BellIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
  >
    <path
      fillRule="evenodd"
      d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5"
  >
    <path
      fillRule="evenodd"
      d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
      clipRule="evenodd"
    />
  </svg>
);

// --- Mock Notification Data ---

type Notification = {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Bài nộp mới',
    message: 'Bạn có một bài nộp mới trong khóa học Kỹ thuật phần mềm',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 phút trước
    isRead: false,
    type: 'info',
  },
  {
    id: '2',
    title: 'Điểm mới',
    message: 'Bài nộp "Bài tập tuần 3" đã được chấm điểm: 9.5/10',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 phút trước
    isRead: false,
    type: 'success',
  },
  {
    id: '3',
    title: 'Thông báo quan trọng',
    message: 'Lịch học tuần sau sẽ thay đổi. Vui lòng kiểm tra lại thời khóa biểu.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 giờ trước
    isRead: true,
    type: 'warning',
  },
  {
    id: '4',
    title: 'Tài liệu mới',
    message: 'Giảng viên đã đăng tài liệu mới cho bài giảng "Design Patterns"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 giờ trước
    isRead: true,
    type: 'info',
  },
];

// Mock function to generate more notifications
const generateMoreNotifications = (startId: number, count: number): Notification[] => {
  const titles = [
    'Bài giảng mới',
    'Nhắc nhở deadline',
    'Cập nhật khóa học',
    'Thảo luận mới',
    'Phản hồi bài tập',
    'Thông báo hệ thống',
    'Tin nhắn mới',
    'Lịch hẹn sắp tới',
  ];
  
  const messages = [
    'Giảng viên đã đăng bài giảng mới cho tuần này',
    'Còn 2 ngày để nộp bài tập lớn',
    'Khóa học đã được cập nhật nội dung mới',
    'Có thảo luận mới trong diễn đàn',
    'Giảng viên đã phản hồi bài tập của bạn',
    'Hệ thống sẽ bảo trì vào cuối tuần',
    'Bạn có tin nhắn mới từ giảng viên',
    'Lịch hẹn tư vấn sẽ diễn ra vào ngày mai',
  ];
  
  const types: Array<'info' | 'success' | 'warning' | 'error'> = ['info', 'success', 'warning', 'error'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: String(startId + i),
    title: titles[i % titles.length],
    message: messages[i % messages.length],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * (6 + i)), // Giờ trước đó
    isRead: Math.random() > 0.3, // 70% đã đọc
    type: types[i % types.length],
  }));
};


const initialNotifications = [
  ...mockNotifications,
  ...generateMoreNotifications(mockNotifications.length + 1, 20),
];

let _notificationsStore: Notification[] = initialNotifications.slice();
const _subscribers = new Set<(items: Notification[]) => void>();

export const getNotificationsStore = () => _notificationsStore;
export const subscribeNotifications = (cb: (items: Notification[]) => void) => {
  _subscribers.add(cb);
  // immediately call with current value
  cb(_notificationsStore);
  return () => _subscribers.delete(cb);
};

const notifySubscribers = () => {
  _subscribers.forEach((cb) => cb(_notificationsStore));
};

const updateNotificationsStore = (next: Notification[]) => {
  _notificationsStore = next;
  notifySubscribers();
};

// --- Component Chính ---

type NotificationPopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

const NotificationPopup = ({ isOpen, onClose }: NotificationPopupProps) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => getNotificationsStore());
  const [showSettings, setShowSettings] = useState(false);

  // Lock body scroll while notification popup is open
  useLockBodyScroll(!!isOpen);

  // Đếm số thông báo chưa đọc
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Đánh dấu một thông báo là đã đọc
  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const next = prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif));
      // keep shared store in sync
      updateNotificationsStore(next);
      return next;
    });
  };

  // Đánh dấu tất cả là đã đọc
  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((notif) => ({ ...notif, isRead: true }));
      updateNotificationsStore(next);
      return next;
    });
  };

  // Format thời gian hiển thị
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[97] bg-black/20"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed right-4 top-24 z-[99] flex h-[calc(100vh-120px)] w-[400px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <BellIcon />
            <h2 className="text-lg font-bold text-gray-800">Thông báo</h2>
            {unreadCount > 0 && (
              <span className="flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[#0329E9] transition hover:bg-blue-50"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckIcon />
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-center rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100"
              title="Cài đặt thông báo"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-b border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Cài đặt thông báo</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Thông báo bài nộp</span>
                <input type="checkbox" className="size-4 rounded border-gray-300" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Thông báo điểm số</span>
                <input type="checkbox" className="size-4 rounded border-gray-300" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Thông báo tài liệu</span>
                <input type="checkbox" className="size-4 rounded border-gray-300" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Thông báo hệ thống</span>
                <input type="checkbox" className="size-4 rounded border-gray-300" defaultChecked />
              </label>
            </div>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <BellIcon />
              <p className="mt-4 text-gray-500">Bạn không có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`cursor-pointer p-4 transition hover:bg-gray-50 ${
                    !notif.isRead ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) {
                      // Navigate to link if exists
                      window.location.href = notif.link;
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Dot indicator for unread */}
                    <div className="mt-1">
                      {!notif.isRead ? (
                        <div className="size-2.5 rounded-full bg-[#0329E9]" />
                      ) : (
                        <div className="size-2.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <h3
                          className={`text-sm font-semibold ${
                            !notif.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {notif.title}
                        </h3>
                      </div>
                      <p className="mb-2 text-sm text-gray-600">
                        {notif.message}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPopup;
