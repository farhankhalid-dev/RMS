import React, { useState, useCallback } from "react";
import {
  Box,
  SimpleGrid,
  Card,
  Heading,
  Text,
  Checkbox,
  Badge,
  Button,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import "./styles/CourseRegistration.css";

// Assign unique IDs to course cards programmatically
const generateUniqueId = (course, index) => `${course.courseCode}-${index}`;

const CourseCard = React.memo(({ course, isSelected, onSelect }) => {
  const handleClick = () => {
    onSelect(course);
  };

  const displayFacultyName =
    course.facultyName === "FACULTY MEMBER" ? "N/A" : course.facultyName;

  return (
    <Card
      p={4}
      position="relative"
      onClick={handleClick}
      cursor="pointer"
      width="80%"
      className="course-card"
    >
      {course.status === "available" && (
        <Checkbox
          position="absolute"
          top={2}
          right={2}
          isChecked={isSelected}
          onChange={() => onSelect(course)}
          isDisabled={course.grade === "cleared"}
        />
      )}
      <Text
        color={displayFacultyName === "In Progress" ? "yellow.500" : "inherit"}
      >
        Faculty: {displayFacultyName}
      </Text>
      {Array.isArray(course.timings) && course.timings.length > 0 ? (
        course.timings.map((timing, index) => (
          <Text key={`${course.id}-timing-${index}`}>
            {timing.day} {timing.startTime} - {timing.endTime || "N/A"} | Room:{" "}
            {timing.room}
          </Text>
        ))
      ) : (
        <Text>No Timings Available</Text>
      )}
      <Badge
        colorScheme={
          course.status === "cleared"
            ? "green"
            : course.status === "locked"
            ? "red"
            : course.status === "in progress"
            ? "yellow"
            : course.status === "unknown"
            ? "orange"
            : course.status === "not offered"
            ? "yellow"
            : course.status === "available"
            ? "blue"
            : "purple"
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
    </Card>
  );
});

const CourseRegistration = ({ courses }) => {
  // State to track selected slots by unique course card id
  const [selectedSlots, setSelectedSlots] = useState({});

  // Handle selection: Cap to 1 slot per courseCode and unselect others in the same group
  const handleSelect = useCallback((selectedCourse) => {
    setSelectedSlots((prevSelected) => {
      const courseCode = selectedCourse.courseCode;

      // Deselect all other courses with the same courseCode and select the clicked one
      const newSelected = { ...prevSelected };
      Object.keys(newSelected).forEach((key) => {
        if (newSelected[key].courseCode === courseCode) {
          delete newSelected[key];
        }
      });

      // Select the clicked course
      newSelected[selectedCourse.id] = selectedCourse;

      return newSelected;
    });
  }, []);

  const handleRegister = () => {
    console.log("Registered Courses: ", selectedSlots);
  };

  // Group courses by semester and then by course code
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
      <Accordion allowMultiple>
        {Object.entries(groupedBySemester).map(([semester, semesterCourses]) => {
          const totalCourses = Object.keys(semesterCourses).length;
          const completedCourses = Object.values(semesterCourses).filter(
            (group) => group.some((course) => course.status === "cleared")
          ).length;

          return (
            <AccordionItem key={semester}>
              <AccordionButton className="accordion-header">
                <Box flex="1" textAlign="left">
                  <Heading size="lg">
                    {semester} - ({completedCourses}/{totalCourses})
                  </Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <Accordion allowMultiple>
                  {Object.entries(semesterCourses).map(
                    ([courseCode, grouped], courseIndex) => {
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
                      const firstCourseCredits = grouped[0].credits || 0;

                      return (
                        <AccordionItem key={courseCode}>
                          <AccordionButton className="accordion-header">
                            <Box flex="1" textAlign="left">
                              <Heading size="md">
                                {courseCode} -{" "}
                                {grouped[0].courseName || "Unnamed Course"}
                              </Heading>
                              <Text>Prerequisites: {preRequisite}</Text>
                              <Text>
                                <Badge colorScheme="blue" ml={2}>
                                  Credits: {firstCourseCredits}
                                </Badge>
                                <Badge
                                  className="accordion-badge"
                                  colorScheme={
                                    isCleared
                                      ? "green"
                                      : isInProgress
                                      ? "yellow"
                                      : "orange"
                                  }
                                >
                                  {isInProgress
                                    ? "In Progress"
                                    : isCleared
                                    ? "Cleared: " + clearedGrade
                                    : "Not Cleared"}
                                </Badge>
                              </Text>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel pb={4} className="accordion-panel">
                            {isInProgress ? (
                              <Text
                                fontSize="lg"
                                className="text-in-progress"
                              >
                                This course is currently in progress
                              </Text>
                            ) : isCleared ? (
                              <Text fontSize="lg" className="text-cleared">
                                This course has already been cleared with:{" "}
                                {clearedGrade}
                              </Text>
                            ) : (
                              <SimpleGrid
                                columns={{ base: 1, md: 2, lg: 4 }}
                                spacing={5}
                              >
                                {grouped.map((course, index) => {
                                  // Assign a unique ID to each course card using courseCode and index
                                  const uniqueId = generateUniqueId(course, index);
                                  return (
                                    <CourseCard
                                      key={uniqueId}
                                      course={{ ...course, id: uniqueId }} // Ensure each course has a unique id
                                      isSelected={selectedSlots[uniqueId]} // Track selected state by uniqueId
                                      onSelect={handleSelect}
                                    />
                                  );
                                })}
                              </SimpleGrid>
                            )}
                          </AccordionPanel>
                        </AccordionItem>
                      );
                    }
                  )}
                </Accordion>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
      <Button
        className="register-button"
        colorScheme="blue"
        onClick={handleRegister}
        position="fixed"
        bottom={4}
        w="full"
      >
        Register
      </Button>
    </Box>
  );
};

export default CourseRegistration;
