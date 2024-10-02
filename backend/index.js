const puppeteer = require("puppeteer");
const fs = require("fs");
require('dotenv').config();

(async () => {
  const usr = process.env.usr;
  const psw = process.env.psw;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://iulms.edu.pk/login/index.php");
  await page.type("#login_username", usr);
  await page.type("#login_password", psw);
  await page.click('#login input[type="submit"]');
  await page.waitForNavigation();

  await page.goto(
    "https://iulms.edu.pk/registration/Registration_FEST_student_EarlyRegistrationBeta.php"
  );

  try {
    await page.waitForSelector("table", { timeout: 5000 });
  } catch (err) {
    console.error("Error: No tables found on the page.", err);
    await browser.close();
    return;
  }

  const extractTableData = () => {
    const normalizeSemester = (semesterString) => {
      const semesterRegex = /^Semester/i;
      
      if (semesterRegex.test(semesterString)) {
        return semesterString.trim();
      }
      
      return "Depth Elective";
    };

    const extractSemesterData = (table, semesterName) => {
      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      
      return rows.map((row) => {
        const columns = Array.from(row.querySelectorAll('td'));
        if (columns.length === 0) return null;

        // Extract status
        const statusCell = columns[0];
        let status = 'unknown';
        if (statusCell.querySelector('img[src*="tick.png"]')) {
          status = 'cleared';
        } else if (statusCell.querySelector('img[src*="lock2.png"]')) {
          status = 'locked';
        } else if (statusCell.querySelector('img[src*="cross.png"]')) {
          status = 'not offered';
        } else if (statusCell.querySelector('input[type="checkbox"]')) {
          status = 'available';
        }

        // Extract timing and room information
        const timingCell = columns[7] ? columns[7].innerText.trim() : '';
        const timings = timingCell.split(',').map(slot => {
          const parts = slot.trim().split(' ');
          let day = '', startTime = '', endTime = '', room = '';
          
          if (parts.length >= 4) {
            day = parts[0];
            startTime = parts[1];
            endTime = parts[2];
            room = parts[3];
          } else if (parts.length === 3) {
            day = parts[0];
            startTime = parts[1];
            endTime = parts[2];
          }

          return {
            day,
            startTime,
            endTime,
            room
          };
        }).filter(timing => timing.day || timing.startTime || timing.endTime || timing.room);

        return {
          semester: semesterName,
          status,
          courseCode: columns[1] ? columns[1].innerText.trim() : '',
          preRequisite: columns[2] ? columns[2].innerText.trim() : '',
          credits: columns[3] ? parseFloat(columns[3].innerText.trim()) : 0,
          courseName: columns[4] ? columns[4].innerText.trim() : '',
          grade: columns[5] ? columns[5].innerText.trim() : '',
          facultyName: columns[6] ? columns[6].innerText.trim() : '',
          timings
        };
      }).filter(row => row !== null);
    };

    const semesterTables = Array.from(document.querySelectorAll('table.tableStyle'));
    let courses = [];

    semesterTables.forEach(table => {
      const headerElement = table.querySelector('tr.tableHeaderStyle td');
      const headerText = headerElement ? headerElement.innerText.trim() : '';
      const semesterName = normalizeSemester(headerText);

      const innerTable = table.querySelector('table');
      if (innerTable) {
        const semesterCourses = extractSemesterData(innerTable, semesterName);
        courses = courses.concat(semesterCourses);
      }
    });

    return courses;
  };

  const formattedData = await page.evaluate(extractTableData);

  const groupedCourses = formattedData.reduce((acc, course) => {
    if (!acc[course.courseCode]) {
      acc[course.courseCode] = [];
    }
    acc[course.courseCode].push(course);
    return acc;
  }, {});

  // Transform grouped courses into CourseGroup objects
  const courseGroups = Object.entries(groupedCourses).map(([courseCode, courses]) => {
    const mainCourse = courses[0];
    let slotIdCounter = 1; // For giving unique slotId
    const slots = courses.map(course => ({
      slotId: slotIdCounter++,
      timings: course.timings,
      facultyName: course.facultyName,
      status: course.status
    }));

    let status = mainCourse.status; // Keep status separate
    if (status === 'unknown' && mainCourse.facultyName === 'In Progress') {
        status = 'In Progress';
    } else if (status === 'unknown' && mainCourse.facultyName === 'Pre Requisite not cleared') {
        status = 'Pre Requisites not cleared';
    }

    let preRequisites;
    if (!mainCourse.preRequisite || mainCourse.preRequisite === '-') {
        preRequisites = ['None'];
    } else {
        preRequisites = mainCourse.preRequisite.split('\n').map(prereq => {
            return `${prereq}`;
        });
    }

    // Set Grade to N/A if it is "To be taken"
    const grade = mainCourse.grade === "To be taken" ? "N/A" : mainCourse.grade;

    return {
        Name: mainCourse.courseName,
        CourseCode: courseCode,
        Status: status,
        PreRequisites: preRequisites,
        Credits: mainCourse.credits,
        SLOTS: slots,
        Grade: grade,
        Semester: mainCourse.semester // Keep this for grouping, we'll remove it later
    };
  });

  // Group courses by semester
  const semesterGroups = courseGroups.reduce((acc, course) => {
    if (!acc[course.Semester]) {
      acc[course.Semester] = [];
    }
    // Create a copy of the course object without the Semester property
    const { Semester, ...courseWithoutSemester } = course;
    acc[course.Semester].push(courseWithoutSemester);
    return acc;
  }, {});

  // Convert to array and sort
  const sortedSemesters = Object.entries(semesterGroups).map(([semester, courses]) => ({
    semester,
    courses
  })).sort((a, b) => {
    // Helper function to extract number from semester string
    const getSemesterNumber = (sem) => {
      const match = sem.match(/\d+/);
      return match ? parseInt(match[0]) : Infinity;
    };

    // Check for special cases first
    if (a.semester.toLowerCase().includes('depth elective')) return 1;
    if (b.semester.toLowerCase().includes('depth elective')) return -1;

    // Sort numerically if both are numbered semesters
    const aNum = getSemesterNumber(a.semester);
    const bNum = getSemesterNumber(b.semester);
    
    if (isFinite(aNum) && isFinite(bNum)) {
      return aNum - bNum;
    }

    // If one or both don't have numbers, sort alphabetically
    return a.semester.localeCompare(b.semester);
  });

  const jsonFilePath = './grouped_courses.json';
  fs.writeFileSync(jsonFilePath, JSON.stringify(sortedSemesters, null, 2));
  console.log(`Grouped courses have been saved to ${jsonFilePath}`);

  await browser.close();
})();