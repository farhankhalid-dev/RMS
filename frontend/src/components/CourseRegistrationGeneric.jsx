import React, { useState, useMemo, useCallback } from "react";
import coursesData from "../data/courses.json";
import StudentInfo from "./StudentInfo.jsx";
import Calendar from "./RegisterCalendar.jsx";
import "./styles/CourseRegistrationGeneric.css";

const generateUniqueId = (course, slot) =>
  `${course.CourseCode}-${slot.slotId}`;

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

    const handleClick = useCallback(() => {
      if (
        status === "available" &&
        !isLoading &&
        clashingCourses.length === 0
      ) {
        setIsLoading(true);
        setTimeout(() => {
          onSelect(course.CourseCode, id, slot);
          setIsLoading(false);
        }, 300);
      }
    }, [
      course.CourseCode,
      id,
      onSelect,
      status,
      slot,
      isLoading,
      clashingCourses,
    ]);

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
            {Array.isArray(slot.timings) && slot.timings.length > 0 ? (
              slot.timings.map((timing, index) => (
                <div className="slot-timings" key={`${id}-timing-${index}`}>
                  <span className="slot-day">{timing.day.slice(0, 3)}</span>
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

const CourseRegistrationGeneric = () => {
  const [selectedSlots, setSelectedSlots] = useState({});
  const [openCourses, setOpenCourses] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const courseMap = useMemo(() => {
    const map = new Map();
    coursesData.forEach((semester) => {
      semester.courses.forEach((course) => {
        if (course.CourseCode) {
          map.set(course.CourseCode, {
            name: course.Name,
            status: course.Status,
            grade: course.Grade,
            slots: course.SLOTS,
          });
        }
      });
    });
    return map;
  }, []);

  const handleSelect = useCallback((courseCode, id, selectedSlot) => {
    setSelectedSlots((prevSelected) => {
      const newSelected = { ...prevSelected };
      if (newSelected[courseCode]?.id === id) {
        delete newSelected[courseCode];
      } else {
        newSelected[courseCode] = { 
          id, 
          slot: selectedSlot,
          name: courseMap.get(courseCode).name,
          code: courseCode
        };
      }
      return newSelected;
    });
  }, [courseMap]);

  const getClashingCourses = useCallback(
    (courseCode, slot) => {
      return Object.entries(selectedSlots)
        .filter(
          ([otherCourseCode, { slot: otherSlot }]) =>
            otherCourseCode !== courseCode && checkTimeClash(slot, otherSlot)
        )
        .map(([clashingCourseCode]) => courseMap.get(clashingCourseCode).name);
    },
    [selectedSlots, courseMap]
  );

  const renderPrerequisites = useCallback(
    (preRequisites = []) => {
      return preRequisites.map((prerequisite, index) => {
        if (prerequisite === "None") {
          return <span key={`prereq-${index}`}>None</span>;
        }

        const courseDetails = courseMap.get(prerequisite);
        const courseName = courseDetails ? courseDetails.name : prerequisite;
        const status = courseDetails ? courseDetails.status : "Unknown";

        let className = "prereq-item unknown";
        if (status.includes("cleared")) {
          className = "prereq-item cleared";
        } else if (status.includes("In Progress")) {
          className = "prereq-item in-progress";
        }

        return (
          <span key={`prereq-${index}`} className={className}>
            {courseName}
          </span>
        );
      });
    },
    [courseMap]
  );

  const checkPrerequisitesStatus = useCallback(
    (preRequisites = []) => {
      let allCleared = true;
      let anyInProgress = false;

      preRequisites.forEach((prerequisite) => {
        if (prerequisite !== "None") {
          const prereqDetail = courseMap.get(prerequisite);
          if (prereqDetail) {
            if (prereqDetail.status.includes("cleared")) {
              return;
            } else if (prereqDetail.status.includes("In Progress")) {
              anyInProgress = true;
            } else {
              allCleared = false;
            }
          }
        }
      });

      return { allCleared, anyInProgress };
    },
    [courseMap]
  );

  const checkCourseAvailability = useCallback((course) => {
    return (
      course.SLOTS && course.SLOTS.some((slot) => slot.status === "available")
    );
  }, []);

  const handleRegister = useCallback(() => {
    console.log("Registered Courses: ", selectedSlots);
    // Handle registration logic here
  }, [selectedSlots]);

  const handleItemSelect = useCallback((item) => {
    setSelectedItem((prevItem) => (prevItem === item ? null : item));
    setIsSidebarOpen(false);
  }, []);

  const toggleCourse = useCallback((courseCode) => {
    setOpenCourses((prev) => ({
      ...prev,
      [courseCode]: !prev[courseCode],
    }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="main">
      <input
        type="checkbox"
        id="sidebar-toggle"
        className="sidebar-toggle"
        checked={isSidebarOpen}
        onChange={toggleSidebar}
      />
      <label htmlFor="sidebar-toggle" className="sidebar-toggle-label">
        <span className="menu-icon"></span>
      </label>

      <div className="course-registration">
        <div className="sidebar-container">
          <div className="semester-list">
            {coursesData.map((semester, semesterIndex) => {
              const totalCourses = semester.courses.length;
              const completedCourses = semester.courses.filter((course) =>
                (course.Status || "").includes("cleared")
              ).length;

              return (
                <div
                  key={`semester-${semesterIndex}-${semester.semester}`}
                  className={`semester-accordion ${
                    selectedItem === semesterIndex ? "selected" : ""
                  }`}
                  onClick={() => handleItemSelect(semesterIndex)}
                >
                  <div className="semester-header">
                    <span>
                      {semester.semester} - ({completedCourses}/{totalCourses})
                    </span>
                  </div>
                </div>
              );
            })}
            <div
              className={`semester-accordion ${
                selectedItem === 'calendar' ? "selected" : ""
              }`}
              onClick={() => handleItemSelect('calendar')}
            >
              <div className="semester-header">
                <span>Course Timetable</span>
              </div>
            </div>
            <button className="register-button" onClick={handleRegister}>
              Register
            </button>
          </div>
        </div>

        <div className="course-content-area">
          {selectedItem === 'calendar' ? (
            <div className="calendar-content">
              <h2 className="semester-title sticky">Course Timetable</h2>
              <Calendar selectedCourses={Object.values(selectedSlots)} />
            </div>
          ) : selectedItem !== null ? (
            <div className="semester-content">
              <h2 className="semester-title sticky">
                {coursesData[selectedItem].semester}
              </h2>
              {coursesData[selectedItem].courses.map(
                (course, courseIndex) => {
                  const { allCleared, anyInProgress } =
                    checkPrerequisitesStatus(course.PreRequisites);
                  let prerequisiteStatusMessage = "";
                  let statusClassName = "";

                  const courseStatus = course.Status || "unknown";
                  const isAvailable = checkCourseAvailability(course);

                  if (courseStatus.includes("cleared")) {
                    prerequisiteStatusMessage = `Cleared: ${
                      course.Grade || "N/A"
                    }`;
                    statusClassName = "status-cleared";
                  } else if (courseStatus.includes("In Progress")) {
                    prerequisiteStatusMessage = "Currently In Progress";
                    statusClassName = "status-in-progress";
                  } else if (!allCleared) {
                    prerequisiteStatusMessage = "Prerequisites not cleared";
                    statusClassName = "status-not-cleared";
                  } else if (anyInProgress) {
                    prerequisiteStatusMessage = "Prerequisites in progress";
                    statusClassName = "status-in-progress";
                  } else if (!isAvailable) {
                    prerequisiteStatusMessage = "No slots available";
                    statusClassName = "status-not-available";
                  } else {
                    prerequisiteStatusMessage = "Available";
                    statusClassName = "status-available";
                  }

                  return (
                    <div
                      key={`course-${courseIndex}-${course.CourseCode}`}
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
                          <div className="prereq">
                            Prerequisites:{" "}
                            {renderPrerequisites(course.PreRequisites)}
                          </div>
                          <div className="course-meta">
                            <span className="credits-badge">
                              Credits: {course.Credits}
                            </span>
                            <span className={`status-badge ${statusClassName}`}>
                              {prerequisiteStatusMessage}
                            </span>
                          </div>
                        </div>
                      </div>
                      {openCourses[course.CourseCode] && (
                        <div className="course-content">
                          {courseStatus.includes("cleared") ||
                          courseStatus.includes("In Progress") ? (
                            <div className="course-message">
                              {prerequisiteStatusMessage}
                              <p>
                                If you want to re-take this course, contact
                                Learning Facilitators
                              </p>
                            </div>
                          ) : (
                            <div className="course-slots">
                              {(course.SLOTS || []).map((slot, slotIndex) => {
                                const id = generateUniqueId(course, slot);
                                return (
                                  <CourseCard
                                    key={`slot-${slotIndex}-${id}`}
                                    id={id}
                                    course={course}
                                    slot={slot}
                                    isSelected={
                                      selectedSlots[course.CourseCode]?.id ===
                                      id
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
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="placeholder">
              <StudentInfo />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseRegistrationGeneric;