import React from "react";
import CourseRegistration from "./CourseRegistration.jsx";
import coursesData from "./courses.json";

function App() {
  return (
    <div className="App">
      <h1>Course Registration</h1>
      <CourseRegistration courses={coursesData} />
    </div>
  );
}

export default App;
