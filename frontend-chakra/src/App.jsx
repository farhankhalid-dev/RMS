import React from "react";
import Course from "./components/CourseRegistrationGeneric.jsx"
import CourseRegistration from "./components/CourseRegistration.jsx";
import RegistrationModule from "./components/RegistrationModule.jsx";

const App = () => {
  return (
    <div className="App">
      <h1>Course Registration</h1>
      <Course />
      {/* <RegistrationModule courses={coursesData} /> */}
      {/* <CourseRegistration courses={coursesData} /> */}
    </div>
  );
};

export default App;
