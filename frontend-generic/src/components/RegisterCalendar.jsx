import React, { useState, useEffect } from 'react';
import './styles/RegisterCalendar.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 27 }, (_, i) => i / 2 + 8);
const DAY_MAP = {
  'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday',
  'THU': 'Thursday', 'FRI': 'Friday', 'SAT': 'Saturday', 'SUN': 'Sunday'
};

const RegisterCalendar = ({ selectedCourses }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const parseTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + minutes / 60;
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const getInitials = (courseName) => {
    const [mainPart, labPart] = courseName.split(/\s*\(([^)]+)\)/).filter(Boolean);
    const mainInitials = mainPart
      .split(/\s+/)
      .map(word => word[0].toUpperCase())
      .join('');
    const labInitial = labPart ? `-${labPart[0].toUpperCase()}` : '';
    return mainInitials + labInitial;
  };

  const getSlotStyle = (day, hour, course) => {
    const timing = course.slot.timings.find(t => DAY_MAP[t.day] === day);
    if (timing) {
      const start = parseTime(timing.startTime);
      const end = parseTime(timing.endTime);
      if (hour >= start && hour < end) {
        return {
          backgroundColor: 'var(--accent-color)',
          gridColumn: `${DAYS.indexOf(day) + 2}`,
          gridRowStart: `${Math.round((start - 8) * 2 + 2)}`,
          gridRowEnd: `${Math.round((end - 8) * 2 + 2)}`,
          zIndex: 1,
        };
      }
    }
    return null;
  };

  const renderDesktopCourseLabel = (course, day, hour) => {
    const style = getSlotStyle(day, hour, course);
    if (style) {
      const timing = course.slot.timings.find(t => DAY_MAP[t.day] === day);
      const isFirstSlot = parseTime(timing.startTime) === hour;
      const duration = parseTime(timing.endTime) - parseTime(timing.startTime);
      const slots = Math.ceil(duration * 2); // 2 slots per hour

      return (
        <div 
          key={course.code} 
          className="course-label"
          style={{
            ...style,
            gridRowEnd: `span ${slots}`,
          }}
          title={`${course.name}\n${formatTime(timing.startTime)} - ${formatTime(timing.endTime)}`}
        >
          {isFirstSlot && (
            <>
              <span className="course-name">{getInitials(course.name)}</span>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const renderDesktopView = () => (
    <div className="calendar-grid">
      <div className="calendar-header time-header">Time</div>
      {DAYS.map(day => (
        <div key={day} className="calendar-header">{day}</div>
      ))}
      {HOURS.map(hour => (
        <React.Fragment key={hour}>
          <div className="time-slot">{formatTime(`${Math.floor(hour)}:${hour % 1 ? '30' : '00'}`)}</div>
          {DAYS.map(day => (
            <div key={`${day}-${hour}`} className="calendar-cell">
              {selectedCourses.map(course => renderDesktopCourseLabel(course, day, hour))}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );

  const renderMobileCourseLabel = (course, day) => {
    const timing = course.slot.timings.find(t => DAY_MAP[t.day] === day);

    return (
      <div key={course.code} className="course-label">
        <span className="course-name">{course.name}</span>
        <span className="course-time">
          {`${formatTime(timing.startTime)} - ${formatTime(timing.endTime)}`}
        </span>
      </div>
    );
  };

  const renderMobileView = () => (
    <div className="calendar-grid mobile">
      {DAYS.map(day => (
        <React.Fragment key={day}>
          <h3 className="day-header">{day}</h3>
          {selectedCourses
            .filter(course => course.slot.timings.some(t => t.day === day.substring(0, 3).toUpperCase()))
            .map(course => renderMobileCourseLabel(course, day))}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="register-calendar">
      {isMobile ? renderMobileView() : renderDesktopView()}
    </div>
  );
};

export default RegisterCalendar;