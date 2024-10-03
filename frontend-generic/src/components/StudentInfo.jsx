import React, { useState } from 'react';
import studentData from "../data/studentInfo.json"
import "./styles/StudentInfo.css"

const StudentInfo = ( ) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => setIsOpen(!isOpen);

  return (
    <div className="student-info-accordion">
      <div 
        className={`student-info-header ${isOpen ? 'open' : ''}`} 
        onClick={toggleAccordion}
      >
        <h2>Student Information</h2>
      </div>
      {isOpen && (
        <div className="student-info-content">
          <div className="student-info-grid">
            <InfoItem label="Name" value="Redacted" />
            <InfoItem label="Reg. Number" value="Redacted" />
            <InfoItem label="Program" value={studentData.program} />
            <InfoItem label="Credit Hours Required" value={studentData.creditHoursRequired} />
            <InfoItem label="Credit Hours Completed" value={studentData.creditHoursCompleted} />
            <InfoItem label="Credit Hours Remaining" value={studentData.creditHoursRemaining} />
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="info-item">
    <span className="info-label">{label}:</span>
    <span className="info-value">{value}</span>
  </div>
);

export default StudentInfo;