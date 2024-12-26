import React, { useState, useMemo, useCallback } from "react";
import courseData from "../data/data.json";
import "./styles/CourseRegistrationGeneric.css";
import StudentInfo from "./StudentInfo";
import Calendar from "./RegisterCalendar";

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
  const date = new Date(2024, 0, 1 + daysOfWeek.indexOf(day));
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
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

    return (
      <div
        className={`course-card ${
          isSelected ? "selected" : ""
        } ${status.toLowerCase()} 
      ${clashingCourses.length > 0 ? "clashing" : ""} 
      ${isLoading ? "loading" : ""} 
      ${!isSelectable ? "unselectable" : ""}`}
        onClick={handleClick}
      >
        <div className="card-content">
          <div className="faculty-info">Faculty: {displayFacultyName}</div>
          <div className="timings-container">
            {Array.isArray(slot.timings) && slot.timings.length > 0 ? (
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
              disabled={!isSelectable}
            />
          </div>
        </div>
        {clashingCourses.length > 0 && (
          <div className="clashing-courses">
            Clashes with: {clashingCourses.join(", ")}
          </div>
        )}
        {isLoading && <div className="spinner" />}
      </div>
    );
  }
);

const CourseRegistrationGeneric = () => {
  const [selectedSlots, setSelectedSlots] = useState({});
  const [openCourses, setOpenCourses] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  React.useEffect(() => {
    const preselectedCourseIds = courseData.selectedCourseIds || [];
    const newSelectedSlots = {};

    courseData.semesters.forEach((semester) => {
      semester.courses.forEach((course) => {
        const matchingSlot = course.SLOTS?.find(
          (slot) =>
            slot.inputId &&
            preselectedCourseIds.includes(slot.inputId) &&
            slot.status === "available"
        );

        if (matchingSlot) {
          newSelectedSlots[course.CourseCode] = {
            id: matchingSlot.inputId,
            slot: matchingSlot,
            name: course.Name,
            code: course.CourseCode,
          };

          setOpenCourses((prev) => ({
            ...prev,
            [course.CourseCode]: true,
          }));
        }
      });
    });

    setSelectedSlots(newSelectedSlots);
  }, []);

  const courseMap = useMemo(() => {
    const map = new Map();
    courseData.semesters.forEach((semester) => {
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

  const handleSelect = useCallback(
    (courseCode, id, selectedSlot) => {
      setSelectedSlots((prevSelected) => {
        const newSelected = { ...prevSelected };
        if (newSelected[courseCode]?.id === id) {
          delete newSelected[courseCode];
        } else {
          newSelected[courseCode] = {
            id,
            slot: selectedSlot,
            name: courseMap.get(courseCode).name,
            code: courseCode,
          };
        }
        return newSelected;
      });
    },
    [courseMap]
  );

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

        const className = status.includes("cleared")
          ? "prereq-item cleared"
          : status.includes("In Progress")
          ? "prereq-item in-progress"
          : "prereq-item to-be-taken";

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

  return (
    <div className="main">
      <input
        type="checkbox"
        id="sidebar-toggle"
        className="sidebar-toggle"
        checked={isSidebarOpen}
        onChange={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <label htmlFor="sidebar-toggle" className="sidebar-toggle-label">
        <span className="menu-icon"></span>
      </label>

      <div className="course-registration">
        <div className="sidebar-container">
          <div className="semester-list">
            {courseData.semesters.map((semester, semesterIndex) => {
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
                    {semester.semester} - ({completedCourses}/{totalCourses})
                  </div>
                </div>
              );
            })}
            <div
              className={`semester-accordion ${
                selectedItem === "calendar" ? "selected" : ""
              }`}
              onClick={() => handleItemSelect("calendar")}
            >
              <div className="semester-header">Course Timetable</div>
            </div>
          </div>
        </div>
        <div className="content-wrapper">
          {selectedItem === "calendar" ? (
            <div className="calendar-content">
              <Calendar selectedCourses={Object.values(selectedSlots)} />
            </div>
          ) : selectedItem !== null ? (
            <div className="semester-content">
              <div className="semester-title">
                <h2>{courseData.semesters[selectedItem].semester}</h2>
              </div>
              <div className="course-content">
                {courseData.semesters[selectedItem].courses.map(
                  (course, courseIndex) => {
                    const { allCleared, anyInProgress } =
                      checkPrerequisitesStatus(course.PreRequisites);
                    const courseStatus = course.Status || "unknown";
                    const isAvailable = checkCourseAvailability(course);
                    let statusMessage, statusClassName;
                    if (courseStatus.includes("cleared")) {
                      statusMessage = `Cleared: ${course.Grade || "N/A"}`;
                      statusClassName = "status-cleared";
                    } else if (courseStatus.includes("In Progress")) {
                      statusMessage = "Currently In Progress";
                      statusClassName = "status-in-progress";
                    } else if (!allCleared) {
                      statusMessage = "Prerequisites not cleared";
                      statusClassName = "status-not-cleared";
                    } else if (anyInProgress) {
                      statusMessage = "Prerequisites in progress";
                      statusClassName = "status-in-progress";
                    } else if (!isAvailable) {
                      statusMessage = "No slots available";
                      statusClassName = "status-not-available";
                    } else {
                      statusMessage = "Available";
                      statusClassName = "status-available";
                    }
                    return (
                      <div
                        key={`course-${courseIndex}-${course.CourseCode}`}
                        className="course-accordion"
                      >
                        <div
                          className={`course-header ${
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
                              <span
                                className={`status-badge ${statusClassName}`}
                              >
                                {statusMessage}
                              </span>
                            </div>
                          </div>
                        </div>
                        {openCourses[course.CourseCode] &&
                          (courseStatus.includes("cleared") ||
                          courseStatus.includes("In Progress") ? (
                            <div className="course-message">
                              {statusMessage}
                              <p>
                                If you want to re-take this course, contact
                                Learning Facilitators
                              </p>
                            </div>
                          ) : (
                            <div className="course-slots">
                              {(course.SLOTS || []).map((slot, slotIndex) => (
                                <CourseCard
                                  key={`slot-${slotIndex}-${slot.inputId}`}
                                  id={slot.inputId}
                                  course={course}
                                  slot={slot}
                                  isSelected={
                                    selectedSlots[course.CourseCode]?.id ===
                                    slot.inputId
                                  }
                                  onSelect={handleSelect}
                                  clashingCourses={getClashingCourses(
                                    course.CourseCode,
                                    slot
                                  )}
                                />
                              ))}
                            </div>
                          ))}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          ) : (
            <div className="student-info">
              <StudentInfo studentData={courseData.studentInfo} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseRegistrationGeneric;