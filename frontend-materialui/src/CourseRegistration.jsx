import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Checkbox,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Badge,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./CourseRegistration.css"

// Function to generate unique IDs for course cards
const generateUniqueId = (course, index) => `${course.courseCode}-${index}`;

const CourseCard = ({ course, isSelected, onSelect }) => {
  const handleClick = () => {
    onSelect(course);
  };

  const displayFacultyName =
    course.facultyName === "FACULTY MEMBER" ? "N/A" : course.facultyName;

  return (
    <Card
      variant="outlined"
      style={{ position: "relative", cursor: "pointer", width: "80%" }}
      onClick={handleClick}
    >
      {course.status === "available" && (
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(course)}
          disabled={course.grade === "cleared"}
          style={{ position: "absolute", top: 8, right: 8 }}
        />
      )}
      <CardContent>
        <Typography color={displayFacultyName === "In Progress" ? "orange" : "inherit"}>
          Faculty: {displayFacultyName}
        </Typography>
        {Array.isArray(course.timings) && course.timings.length > 0 ? (
          course.timings.map((timing, index) => (
            <Typography key={`${course.id}-timing-${index}`}>
              {timing.day} {timing.startTime} - {timing.endTime || "N/A"} | Room:{" "}
              {timing.room}
            </Typography>
          ))
        ) : (
          <Typography>No Timings Available</Typography>
        )}
        <Badge
          color={
            course.status === "cleared"
              ? "success"
              : course.status === "locked"
              ? "error"
              : course.status === "in progress"
              ? "warning"
              : course.status === "unknown"
              ? "info"
              : course.status === "not offered"
              ? "warning"
              : course.status === "available"
              ? "primary"
              : "default"
          }
        >
          {course.status}{" "}
          {course.grade === "To be taken" ||
          course.grade === "Grade" ||
          course.grade === "N/A" ||
          !course.grade
            ? ""
            : "with " + course.grade}
        </Badge>
      </CardContent>
    </Card>
  );
};

const CourseRegistration = ({ courses }) => {
  const [selectedSlots, setSelectedSlots] = useState({});

  const handleSelect = (selectedCourse) => {
    setSelectedSlots((prevSelected) => {
      const isAlreadySelected = !!prevSelected[selectedCourse.id];
      const newSelected = { ...prevSelected };

      if (isAlreadySelected) {
        delete newSelected[selectedCourse.id]; // Deselect the course
      } else {
        newSelected[selectedCourse.id] = selectedCourse; // Select the course
      }

      return newSelected;
    });
  };

  const handleRegister = () => {
    console.log("Registered Courses: ", selectedSlots);
  };

  // Group courses by semester and course code
  const groupedBySemester = courses.reduce((acc, course) => {
    if (!acc[course.semester]) {
      acc[course.semester] = {};
    }
    if (!acc[course.semester][course.courseCode]) {
      acc[course.semester][course.courseCode] = [];
    }
    acc[course.semester][course.courseCode].push(course);
    return acc;
  }, {});

  return (
    <Box p={5}>
      {Object.entries(groupedBySemester).map(
        ([semester, semesterCourses]) => {
          const totalCourses = Object.keys(semesterCourses).length;
          const completedCourses = Object.values(semesterCourses).filter(
            (group) => group.some((course) => course.status === "cleared")
          ).length;

          return (
            <Accordion key={semester} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  {semester} - ({completedCourses}/{totalCourses})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {Object.entries(semesterCourses).map(
                    ([courseCode, grouped]) => {
                      const preRequisite =
                        grouped[0].preRequisite === "-"
                          ? "None"
                          : grouped[0].preRequisite;
                      const inProgressCourse = grouped.find(
                        (course) => course.facultyName === "In Progress"
                      );
                      const isInProgress = Boolean(inProgressCourse);
                      const clearedCourse = grouped.find(
                        (course) => course.status === "cleared"
                      );
                      const isCleared = Boolean(clearedCourse);
                      const clearedGrade = clearedCourse
                        ? clearedCourse.grade
                        : null;

                      return (
                        <Grid item xs={12} key={courseCode}>
                          <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="h6">
                                {courseCode} -{" "}
                                {grouped[0].courseName || "Unnamed Course"}
                              </Typography>
                              <Typography variant="body2">Prerequisites: {preRequisite}</Typography>
                              <Typography>
                                <Badge color="primary">
                                  Credits: {grouped[0].credits || 0}
                                </Badge>
                                <Badge
                                  color={
                                    isCleared
                                      ? "success"
                                      : isInProgress
                                      ? "warning"
                                      : "default"
                                  }
                                >
                                  {isInProgress
                                    ? "In Progress"
                                    : isCleared
                                    ? "Cleared: " + clearedGrade
                                    : "Not Cleared"}
                                </Badge>
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              {isInProgress ? (
                                <Typography fontSize="large" color="orange">
                                  This course is currently in progress
                                </Typography>
                              ) : isCleared ? (
                                <Typography fontSize="large" color="green">
                                  This course has already been cleared with: {clearedGrade}
                                </Typography>
                              ) : (
                                <Grid container spacing={2}>
                                  {grouped.map((course, index) => {
                                    const uniqueId = generateUniqueId(course, index);
                                    return (
                                      <Grid item xs={12} sm={6} md={3} key={uniqueId}>
                                        <CourseCard
                                          course={{ ...course, id: uniqueId }} // Ensure each course has a unique id
                                          isSelected={!!selectedSlots[uniqueId]} // Track selected state by uniqueId
                                          onSelect={handleSelect}
                                        />
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        </Grid>
                      );
                    }
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        }
      )}
      <Button
        variant="contained"
        color="primary"
        onClick={handleRegister}
        style={{ position: "fixed", bottom: 20, width: "90%" }}
      >
        Register
      </Button>
    </Box>
  );
};

export default CourseRegistration;
