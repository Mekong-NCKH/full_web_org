// src/components/TimeSelectorContent.jsx
// (File này được cung cấp ở lượt thứ 2)

import { subHours, addHours, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useMemo } from 'react';

const formatVietnameseTime = (date: Date) => {
  const dayOfWeek = format(date, 'EEEE', { locale: vi });
  const dayAbbreviation = dayOfWeek.startsWith('Chủ nhật') 
    ? 'CN' 
    : `T${dayOfWeek.split(' ')[1]}`;
    
  return `${format(date, 'HH:mm')} ${dayAbbreviation}, ${format(date, 'dd/MM')}`;
};


function TimeSelectorContent({ currentTime, selectedTime, onTimeSelect }: {
  currentTime: Date;
  selectedTime: Date | null;
  onTimeSelect: (date: Date) => void;
}) {
  const timeSlots = useMemo(() => {
    const now = currentTime;
    return [
      { id: 'prev6', label: '06H Trước', date: subHours(now, 6) },
      { id: 'prev3', label: '03H Trước', date: subHours(now, 3) },
      { id: 'now', label: 'HIỆN TẠI', date: now },
      { id: 'next3', label: '03H Tiếp', date: addHours(now, 3) },
      { id: 'next6', label: '06H Tiếp', date: addHours(now, 6) },
    ];
  }, [currentTime]);

  const selectedTimeValue = selectedTime ? selectedTime.getTime() : null;
  const activeSlot = timeSlots.find(slot => slot.date.getTime() === selectedTimeValue);
  const selectedId = activeSlot ? activeSlot.id : null;

  return (
    <div className="flex w-full items-center justify-between text-center">
      {timeSlots.map((slot) => {
        const isActive = slot.id === selectedId;
        const formattedTime = formatVietnameseTime(slot.date);

        return (
          <button
            key={slot.id}
            type="button"
            // Khi click, gọi hàm onTimeSelect với Date object
            onClick={() => onTimeSelect(slot.date)}
            className={`
              rounded-lg p-2 text-base text-[#0060C9] transition-all duration-200
              ${isActive ? 'scale-105 bg-[#E4F5FD] shadow-sm' : 'bg-transparent hover:bg-white/60'}
            `}
          >
            <span className="block text-sm font-semibold" style={{fontFamily: 'UTM Black'}}>
              {slot.label}
            </span>
            <span className="block text-xs text-gray-700">
              {formattedTime}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TimeSelectorContent;