import React, { useState, useMemo, useCallback } from "react";
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

// import "./styles/CourseRegistration.css";

// Unique ID generator for course cards
const generateUniqueId = (course, slot) => `${course.CourseCode}-${slot.slotId}`;

// CourseCard Component
const CourseCard = React.memo(({ course, slot, isSelected, onSelect, id }) => {
  const handleClick = useCallback(() => {
    onSelect(course.CourseCode, id);
  }, [course.CourseCode, id, onSelect]);

  const displayFacultyName = slot.facultyName === "FACULTY MEMBER" ? "N/A" : slot.facultyName;
  const status = course.Status || slot.status || "Unknown";

  return (
    <Card
      p={4}
      position="relative"
      onClick={handleClick}
      cursor="pointer"
      width="80%"
      className={`course-card ${isSelected ? 'selected' : ''}`}
    >
      {status === "available" && (
        <Checkbox
          position="absolute"
          top={2}
          right={2}
          isChecked={isSelected}
          onChange={handleClick}
          isDisabled={status.includes("cleared")}
        />
      )}
      <Text
        className="slot-instructor"
        color={displayFacultyName === "In Progress" ? "yellow.500" : "inherit"}
        fontWeight="bold"
      >
        Faculty: {displayFacultyName}
      </Text>
      {Array.isArray(slot.timings) && slot.timings.length > 0 ? (
        slot.timings.map((timing, index) => (
          <Text
            className="slot-timings"
            key={`${id}-timing-${index}`}
            p="0.5rem 0 0.5rem 0.8rem"
          >
            {timing.day} {timing.startTime} - {timing.endTime} | Room: {timing.room}
          </Text>
        ))
      ) : (
        <Text className="slot-timings" p="0.5rem 0 0.5rem 0.8rem">
          No Timings Available
        </Text>
      )}
      <Badge
        className="slot-status"
        colorScheme={
          status.includes("cleared")
            ? "green"
            : status === "locked"
            ? "red"
            : status === "In Progress"
            ? "yellow"
            : status === "not offered"
            ? "yellow"
            : status === "available"
            ? "blue"
            : "purple"
        }
      >
        {status}
      </Badge>
    </Card>
  );
});

const CourseRegistration = ({ courses }) => {
  const [selectedSlots, setSelectedSlots] = useState({});

  const courseMap = useMemo(() => {
    const map = new Map();
    courses.forEach((course) => {
      if (course.CourseCode) {
        map.set(course.CourseCode, {
          name: course.Name,
          status: course.Status,
          grade: course.Grade,
        });
      }
    });
    return map;
  }, [courses]);

  const handleSelect = useCallback((courseCode, id) => {
    setSelectedSlots((prevSelected) => {
      const newSelected = { ...prevSelected };
      
      if (newSelected[courseCode] === id) {
        // If the same slot is clicked again, unselect it
        delete newSelected[courseCode];
      } else {
        // Select the new slot for this course
        newSelected[courseCode] = id;
      }

      return newSelected;
    });
  }, []);

  const renderPrerequisites = useCallback((preRequisites = []) => {
    return preRequisites.map((prerequisite, index) => {
      if (prerequisite === "None") {
        return "None";
      }

      const courseDetails = courseMap.get(prerequisite);
      const courseName = courseDetails ? courseDetails.name : prerequisite;
      const status = courseDetails ? courseDetails.status : "Unknown";

      let color = "red.500";
      if (status.includes("cleared")) {
        color = "green.500";
      } else if (status.includes("In Progress")) {
        color = "yellow.500";
      }

      return (
        <Text as="span" key={index} color={color} mr={2}>
          {courseName}
        </Text>
      );
    });
  }, [courseMap]);

  const checkPrerequisitesStatus = useCallback((preRequisites = []) => {
    let allCleared = true;
    let anyInProgress = false;

    preRequisites.forEach((prerequisite) => {
      if (prerequisite !== "None") {
        const prereqDetail = courseMap.get(prerequisite);
        if (prereqDetail) {
          if (prereqDetail.status.includes("cleared")) {
            return;
          } else if (prereqDetail.status.includes("In Progress")) {
            anyInProgress = true;
          } else {
            allCleared = false;
          }
        }
      }
    });

    return {
      allCleared,
      anyInProgress,
    };
  }, [courseMap]);

  const handleRegister = useCallback(() => {
    console.log("Registered Courses: ", selectedSlots);
    // Handle registration logic here
  }, [selectedSlots]);

  const groupedBySemester = useMemo(() => {
    return courses.reduce((acc, course) => {
      if (!acc[course.Semester]) {
        acc[course.Semester] = [];
      }
      acc[course.Semester].push(course);
      return acc;
    }, {});
  }, [courses]);

  return (
    <Box p={5} className="Main">
      <Accordion allowMultiple>
        {Object.entries(groupedBySemester).map(([semester, semesterCourses]) => {
          const totalCourses = semesterCourses.length;
          const completedCourses = semesterCourses.filter((course) =>
            (course.Status || "").includes("cleared")
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
                  {semesterCourses.map((course) => {
                    const { allCleared, anyInProgress } = checkPrerequisitesStatus(course.PreRequisites);
                    let prerequisiteStatusMessage = "";
                    let badgeColor = "green";
                    let showCourseClearedMessage = false;

                    if (course.Status.includes("cleared")) {
                      prerequisiteStatusMessage = `Cleared: ${courseMap.get(course.CourseCode).grade}`;
                      badgeColor = "green";
                      showCourseClearedMessage = true;
                    } else if (course.Status.includes("In Progress")) {
                      prerequisiteStatusMessage = "Currently In Progress";
                      badgeColor = "yellow";
                    } else if (!allCleared) {
                      prerequisiteStatusMessage = "Prerequisites not cleared";
                      badgeColor = "red";
                    } else if (anyInProgress) {
                      prerequisiteStatusMessage = "Prerequisites in progress";
                      badgeColor = "yellow";
                    } else if (course.SLOTS.every((slot) => slot.status !== "available")) {
                      prerequisiteStatusMessage = "No slots available";
                      badgeColor = "red";
                    } else {
                      prerequisiteStatusMessage = "Available";
                      badgeColor = "blue";
                    }

                    return (
                      <AccordionItem key={course.CourseCode}>
                        <AccordionButton className="accordion-header">
                          <Box className="course-group" flex="1" textAlign="left">
                            <Heading size="md">
                              {course.CourseCode} - {course.Name}
                            </Heading>
                            <Text className="prereq" fontWeight="bold">
                              Prerequisites: {renderPrerequisites(course.PreRequisites)}
                            </Text>
                            <Text>
                              <Badge className="accordion-badge credits" colorScheme="blue" ml={2}>
                                Credits: {course.Credits}
                              </Badge>
                              <Badge className="prereq-badge" colorScheme={badgeColor} ml={2}>
                                {prerequisiteStatusMessage}
                              </Badge>
                            </Text>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4} className="accordion-panel">
                          {showCourseClearedMessage ? (
                            <Text fontSize="lg" className="text-cleared">
                              {prerequisiteStatusMessage}
                            </Text>
                          ) : (course.Status || "").includes("In Progress") ? (
                            <Text fontSize="lg" className="text-in-progress">
                              This course is currently in progress
                            </Text>
                          ) : (course.Status || "").includes("cleared") ? (
                            <Text fontSize="lg" className="text-cleared">
                              {prerequisiteStatusMessage}
                            </Text>
                          ) : (
                            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5}>
                              {course.SLOTS.map((slot) => {
                                const id = generateUniqueId(course, slot);
                                return (
                                  <CourseCard
                                    key={id}
                                    id={id}
                                    course={course}
                                    slot={slot}
                                    isSelected={selectedSlots[course.CourseCode] === id}
                                    onSelect={handleSelect}
                                  />
                                );
                              })}
                            </SimpleGrid>
                          )}
                        </AccordionPanel>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
      <Button className="register-button" colorScheme="blue" onClick={handleRegister}>
        Register
      </Button>
    </Box>
  );
};

export default CourseRegistration;