import React from 'react';
import studentData from "../data/studentInfo.json";

const StudentInfo = () => {
  const infoItems = [
    { label: "Name", value: "Redacted" },
    { label: "Reg. Number", value: "Redacted" },
    { label: "Program", value: studentData.program },
    { label: "Credit Hours Required", value: studentData.creditHoursRequired },
    { label: "Credit Hours Completed", value: studentData.creditHoursCompleted },
    { label: "Credit Hours Remaining", value: studentData.creditHoursRemaining }
  ];

  return (
    <div className="student-info-content">
      {infoItems.map((item, index) => (
        <div key={index} className="info-item">
          <span className="info-label">{item.label}:</span>
          <span className="info-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default StudentInfo;