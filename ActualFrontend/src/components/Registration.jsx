import React, { useState } from 'react';
import courseData from "../data/data.json";

const Registration = () => {
  // Object to track which semesters are open
  // Using an object instead of array for O(1) lookup
  const [openSemesters, setOpenSemesters] = useState({});

  // Toggle function for opening/closing semesters
  const toggleSemester = (semesterIndex) => {
    setOpenSemesters(prev => ({
      ...prev,
      [semesterIndex]: !prev[semesterIndex]
    }));
  };

  return (
    <div className="course-registration">
      {courseData.semesters.map((semester, index) => (
        <div key={index} className="semester-accordion">
          {/* Clickable semester header */}
          <div 
            className={`semester-header ${openSemesters[index] ? 'open' : ''}`}
            onClick={() => toggleSemester(index)}
          >
            <div className="semester-title">
              {semester.semester}
            </div>
          </div>

          {/* Course content - only shown when semester is open */}
          {openSemesters[index] && (
            <div className="semester-content">
              {semester.courses.map((course, courseIndex) => (
                <div 
                  key={courseIndex} 
                  className="course-item"
                >
                  <div className="course-header">
                    <div className="course-title">
                      {course.CourseCode} - {course.Name}
                    </div>
                    <div className="course-credits">
                      Credits: {course.Credits}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Registration;