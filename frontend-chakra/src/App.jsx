import React from "react";
import CourseRegistration from "./components/CourseRegistration.jsx";
import coursesData from "./data/courses.json";

function App() {
  return (
    <div className="App">
      <h1>Course Registration</h1>
      <CourseRegistration courses={coursesData} />
    </div>
  );
}

export default App;