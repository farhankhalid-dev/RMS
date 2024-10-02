import React, { useState } from "react";
import "./styles/RegistrationModule.css";

// Student Info Component
const StudentInfo = () => {
  return <div className="student-info">Student info</div>;
};

// Semester Accordion Component
const SemAcc = ({ semester, courses, isOpen, toggleAccordion }) => {
  return (
    <div className="semester-accordion">
      <button className="accordion-header" onClick={toggleAccordion}>
        {semester}
      </button>
      {isOpen && (
        <div className="accordion-content">
          {courses.map((course, index) => (
            <CourseAcc key={index} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};

// Course Accordion (Represents each course within a semester)
const CourseAcc = ({ course }) => {
  const [isOpenCourse, setIsOpenCourse] = useState(false);

  const toggleCourseAccordion = () => {
    setIsOpenCourse(!isOpenCourse);
  };

  return (
    <div className="course-accordion">
      <button className="course-header" onClick={toggleCourseAccordion}>
        <strong>
          {course.CourseCode} - {course.Name}
        </strong>
      </button>

      {isOpenCourse && (
        <div className="course-details">
          <p>
            <strong>Credits:</strong> {course.Credits}
          </p>
          <p>
            <strong>Prerequisites:</strong>{" "}
            {course.PreRequisites.join(", ") || "None"}
          </p>

          {/* Display slots for the course */}
          <CourseSlot slots={course.SLOTS} />
        </div>
      )}
    </div>
  );
};

// Course Slot Component (Represents each slot in a course)
const CourseSlot = ({ slots }) => {
  const [selectedSlots, setSelectedSlots] = useState({});

  // Handle checkbox selection for slots
  const handleSlotSelect = (slotId) => {
    setSelectedSlots((prevSelected) => ({
      ...prevSelected,
      [slotId]: !prevSelected[slotId], // Toggle slot selection
    }));
  };

  return (
    <div className="course-slot">
      {slots.map((slot, index) => {
        const slotId = `${slot.slotId}-${index}`; // Unique ID for each slot
        const isSelected = selectedSlots[slotId] || false;

        return (
          <div key={index} className={`slot-details ${!slot.status === "available" ? "unavailable" : ""}`}>
            {/* Slot checkbox to select/deselect */}
            {slot.status === "available" ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSlotSelect(slotId)}
                className="slot-checkbox"
              />
            ) : (
              <span className="slot-unavailable-text">Unavailable</span>
            )}

            {/* Slot details */}
            <div className="slot-info">
              <p><strong>Faculty:</strong> {slot.facultyName}</p>
              {Array.isArray(slot.timings) && slot.timings.length > 0 ? (
                slot.timings.map((timing, timingIndex) => (
                  <p key={timingIndex}>
                    <strong>Timings:</strong> {timing.day} {timing.startTime} - {timing.endTime} | Room: {timing.room}
                  </p>
                ))
              ) : (
                <p>No timings available</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Main registration Module
const RegistrationModule = ({ courses }) => {
  const [openSemesters, setOpenSemesters] = useState([]);

  // Function to handle opening/closing accordions
  const handleToggleAccordion = (semester) => {
    setOpenSemesters((prevOpen) => {
      if (prevOpen.includes(semester)) {
        return prevOpen.filter((sem) => sem !== semester); // Close if the same semester is clicked again
      } else {
        return [...prevOpen, semester]; // Open the clicked semester
      }
    });
  };

  const handleToggleSem = () => {
    if (openSemesters.length === Object.keys(groupedCoursesBySemester).length) {
      setOpenSemesters([]); // Close all if all are currently open
    } else {
      setOpenSemesters(Object.keys(groupedCoursesBySemester)); // Open all if any are closed
    }
  };

  // Group courses by semester
  const groupedCoursesBySemester = courses.reduce((acc, course) => {
    const semester = course.Semester;
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(course);
    return acc;
  }, {});

  return (
    <div>
      <StudentInfo />
      <div className="semester-toggle">
        <button onClick={handleToggleSem}>Toggle All Semesters</button>
      </div>
      {Object.keys(groupedCoursesBySemester).map((semester, index) => (
        <SemAcc
          key={index}
          semester={semester}
          courses={groupedCoursesBySemester[semester]}
          isOpen={openSemesters.includes(semester)} // Check if the semester is open
          toggleAccordion={() => handleToggleAccordion(semester)}
        />
      ))}
    </div>
  );
};

export default RegistrationModule;
