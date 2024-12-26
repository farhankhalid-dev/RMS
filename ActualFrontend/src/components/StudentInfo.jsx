import React from "react";
import "./styles/CourseRegistrationGeneric.css";
import NewComponent from "./NewComponent.jsx";

const StudentInfo = ({ studentData }) => {
  const infoItems = [
    { label: "Name", value: studentData.Name },
    { label: "Reg. Number", value: studentData["Reg. Number"] },
    { label: "Program", value: studentData.Program },
    {
      label: "Credit Hours Required",
      value: studentData["Credit Hours Required"],
    },
    {
      label: "Credit Hours Completed",
      value: studentData["Credit Hours Completed"],
    },
    {
      label: "Credit Hours Remaining",
      value: studentData["Credit Hours Remaining"],
    },
  ];

  return (
    <div className="student-info-content">
      {/* <NewComponent /> */}
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