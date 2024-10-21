import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const generateUniqueId = (course, slot) =>
  `${course.CourseCode}-${slot.inputId}`;

const convertToTimestamp = (day, time) => {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(2023, 0, 1 + daysOfWeek.indexOf(day));
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
};

const checkTimeClash = (slot1, slot2) => {
  if (!slot1.timings || !slot2.timings) return false;

  return slot1.timings.some((timing1) =>
    slot2.timings.some(
      (timing2) =>
        timing1.day === timing2.day &&
        convertToTimestamp(timing1.day, timing1.startTime) <
          convertToTimestamp(timing2.day, timing2.endTime) &&
        convertToTimestamp(timing2.day, timing2.startTime) <
          convertToTimestamp(timing1.day, timing1.endTime)
    )
  );
};

const CourseCard = React.memo(
  ({ course, slot, isSelected, onSelect, id, clashingCourses }) => {
    const [isLoading, setIsLoading] = useState(false);
    const displayFacultyName =
      slot.facultyName === "FACULTY MEMBER" ? "N/A" : slot.facultyName;
    const status = slot.status || "Unknown";

    const handleClick = async () => {
      if (
        status === "available" &&
        !isLoading &&
        clashingCourses.length === 0
      ) {
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));
        onSelect(course.CourseCode, id, slot);
        setIsLoading(false);
      }
    };

    const isSelectable = status === "available" && clashingCourses.length === 0;

    const cardClass = `course-card ${
      isSelected ? "selected" : ""
    } ${status.toLowerCase()} ${clashingCourses.length > 0 ? "clashing" : ""} ${
      isLoading ? "loading" : ""
    } ${!isSelectable ? "unselectable" : ""}`;

    return (
      <div className={cardClass} onClick={handleClick}>
        <div className="card-content">
          <div className="faculty-info">Faculty: {displayFacultyName}</div>
          <div className="timings-container">
            {slot.timings && slot.timings.length > 0 ? (
              slot.timings.map((timing, index) => (
                <div className="slot-timings" key={`${id}-timing-${index}`}>
                  <span className="slot-day">{timing.day}</span>
                  <span className="slot-time">
                    {timing.startTime} - {timing.endTime}
                  </span>
                  <span className="slot-room">
                    Room: {timing.room || "TBA"}
                  </span>
                </div>
              ))
            ) : (
              <div className="slot-timings">No Timings Available</div>
            )}
          </div>
          <div className="status-container">
            <span className={`slot-status ${status.toLowerCase()}`}>
              {status}
            </span>
            <input
              type="radio"
              checked={isSelected}
              onChange={handleClick}
              disabled={!isSelectable || isLoading}
            />
          </div>
        </div>
        {clashingCourses.length > 0 && (
          <div className="clashing-courses">
            Clashes with: {clashingCourses.join(", ")}
          </div>
        )}
        <div className="spinner"></div>
      </div>
    );
  }
);

const Calendar = React.memo(({ selectedCourses }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [courseColors, setCourseColors] = useState({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const colors = {};
    selectedCourses.forEach((course, index) => {
      const hue = (index * 137.5) % 360;
      colors[course.courseCode] = `hsl(${hue}, 70%, 65%)`;
    });
    setCourseColors(colors);

    return () => window.removeEventListener("resize", checkMobile);
  }, [selectedCourses]);

  const renderTimeSlots = () => {
    const DAYS = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const HOURS = Array.from({ length: 27 }, (_, i) => i / 2 + 8);

    return (
      <div className="calendar-grid">
        <div className="time-header">Time</div>
        {DAYS.map((day) => (
          <div key={day} className="calendar-header">
            {day}
          </div>
        ))}
        {HOURS.map((hour) => {
          const timeString = `${Math.floor(hour)}:${hour % 1 ? "30" : "00"}`;
          return (
            <React.Fragment key={hour}>
              <div className="time-slot">{timeString}</div>
              {DAYS.map((day) => (
                <div key={`${day}-${hour}`} className="calendar-cell">
                  {selectedCourses.map((course) => {
                    if (!course.slot?.timings) return null;

                    const timing = course.slot.timings.find((t) => {
                      const dayMatch = t.day === day.slice(0, 3).toUpperCase();
                      const [startHour, startMinute] = t.startTime
                        .split(":")
                        .map(Number);
                      const [endHour, endMinute] = t.endTime
                        .split(":")
                        .map(Number);
                      const start = startHour + startMinute / 60;
                      const end = endHour + endMinute / 60;
                      return dayMatch && hour >= start && hour < end;
                    });

                    if (!timing) return null;

                    return (
                      <div
                        key={course.courseCode}
                        className="course-label"
                        style={{
                          backgroundColor: courseColors[course.courseCode],
                          gridRow: `span ${Math.ceil(
                            (timing.endTime.split(":")[0] -
                              timing.startTime.split(":")[0]) *
                              2
                          )}`,
                        }}
                        title={`${course.name}\n${timing.startTime} - ${timing.endTime}`}
                      >
                        <span className="course-name">{course.courseCode}</span>
                        <span className="course-time">
                          {timing.startTime} - {timing.endTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return <div className="register-calendar">{renderTimeSlots()}</div>;
});

const Register = () => {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [openCourses, setOpenCourses] = useState({});
  const [selectedSlots, setSelectedSlots] = useState({});
  const [view, setView] = useState("courses");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (location.state?.userData) {
      setData(location.state.userData);
      setSelectedSemester(location.state.userData.semesters[0]?.semester);

      if (location.state.userData.selectedCourseIds) {
        const selections = {};
        location.state.userData.semesters.forEach((semester) => {
          semester.courses.forEach((course) => {
            const matchingSlot = course.SLOTS.find((slot) =>
              location.state.userData.selectedCourseIds.includes(slot.inputId)
            );
            if (matchingSlot) {
              selections[course.CourseCode] = {
                id: matchingSlot.inputId,
                slot: matchingSlot,
              };
            }
          });
        });
        setSelectedSlots(selections);
      }
    }
  }, [location]);

  const handleSelect = (courseCode, id, selectedSlot) => {
    setSelectedSlots((prev) => ({
      ...prev,
      [courseCode]: { id, slot: selectedSlot },
    }));
  };

  const getClashingCourses = (courseCode, slot) => {
    return Object.entries(selectedSlots)
      .filter(
        ([otherCourseCode, { slot: otherSlot }]) =>
          otherCourseCode !== courseCode && checkTimeClash(slot, otherSlot)
      )
      .map(([clashingCourseCode]) => clashingCourseCode);
  };

  const toggleCourse = (courseCode) => {
    setOpenCourses((prev) => ({
      ...prev,
      [courseCode]: !prev[courseCode],
    }));
  };

  if (!data) {
    return <div className="p-8">Loading...</div>;
  }

  const currentSemester = data.semesters.find(
    (sem) => sem.semester === selectedSemester
  );

  return (
    <div className="main">
      <input
        type="checkbox"
        id="sidebar-toggle"
        className="sidebar-toggle"
        checked={isSidebarOpen}
        onChange={() => setIsSidebarOpen((prev) => !prev)}
      />
      <label htmlFor="sidebar-toggle" className="sidebar-toggle-label">
        <span className="menu-icon"></span>
      </label>

      <div className="course-registration">
        <div className="sidebar-container">
          <div className="semester-list">
            {data.semesters.map((semester, index) => (
              <div
                key={`${semester.semester}-${index}`}
                className={`semester-accordion ${
                  selectedSemester === semester.semester ? "selected" : ""
                }`}
                onClick={() => setSelectedSemester(semester.semester)}
              >
                <div className="semester-header">
                  <span>{semester.semester}</span>
                </div>
              </div>
            ))}
            <div
              className={`semester-accordion ${
                view === "calendar" ? "selected" : ""
              }`}
              onClick={() =>
                setView((v) => (v === "courses" ? "calendar" : "courses"))
              }
            >
              <div className="semester-header">
                <span>Course Timetable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="course-content-area">
          {view === "calendar" ? (
            <div className="calendar-content">
              <h2 className="semester-title sticky">Course Timetable</h2>
              <Calendar
                selectedCourses={Object.entries(selectedSlots).map(
                  ([code, { slot }]) => ({
                    courseCode: code,
                    name: currentSemester?.courses.find(
                      (c) => c.CourseCode === code
                    )?.Name,
                    slot,
                  })
                )}
              />
            </div>
          ) : (
            <div className="semester-content">
              <h2 className="semester-title sticky">{selectedSemester}</h2>
              {currentSemester?.courses.map((course) => (
                <div
                  key={`course-${course.CourseCode}`}
                  className="course-accordion"
                >
                  <div
                    className={`course-header sticky ${
                      openCourses[course.CourseCode] ? "open" : ""
                    }`}
                    onClick={() => toggleCourse(course.CourseCode)}
                  >
                    <div className="course-title">
                      {course.CourseCode} - {course.Name}
                    </div>
                    <div className="course-info">
                      <div className="course-meta">
                        <span className="credits-badge">
                          Credits: {course.Credits}
                        </span>
                        <span
                          className={`status-badge status-${course.Status.toLowerCase()}`}
                        >
                          {course.Status}
                          {course.Grade && ` • ${course.Grade}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {openCourses[course.CourseCode] && (
                    <div className="course-content">
                      <div className="course-slots">
                        {course.SLOTS.map((slot, slotIndex) => {
                          const id =
                            slot.inputId || generateUniqueId(course, slot);
                          return (
                            <CourseCard
                              key={`slot-${slotIndex}-${id}`}
                              course={course}
                              slot={slot}
                              id={id}
                              isSelected={
                                selectedSlots[course.CourseCode]?.id === id
                              }
                              onSelect={handleSelect}
                              clashingCourses={getClashingCourses(
                                course.CourseCode,
                                slot
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
