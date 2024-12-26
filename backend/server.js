const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

async function scrapeData() {
  let browser;
  try {
    const username = process.env.IULMS_USERNAME;
    const password = process.env.IULMS_PASSWORD;

    if (!username || !password) {
      throw new Error("Username and password must be set in .env file");
    }

    console.log("Starting scraping process...");
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null
    });

    const page = await browser.newPage();

    // Login process
    await page.goto("https://iulms.edu.pk/login/index.php");
    await page.type("#login_username", username);
    await page.type("#login_password", password);
    await page.click('#login input[type="submit"]');
    await page.waitForNavigation();

    // Navigate to registration page
    await page.goto(
      "https://iulms.edu.pk/registration/Registration_FEST_student_EarlyRegistrationBeta.php"
    );

    // Wait for table with timeout
    try {
      await page.waitForSelector("table", { timeout: 5000 });
    } catch (err) {
      throw new Error("No tables found on the page. Login might have failed.");
    }

    // Extract data
    const formattedData = await page.evaluate(() => {
      const extractTableData = () => {
        // Student Info
        const studentInfo = {};
        const infoTable = document.getElementById("gpaInfo");
        if (infoTable) {
          const rows = infoTable.querySelectorAll("tr");
          rows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 2) {
              const key = cells[0].innerText.replace(":", "").trim();
              
              if (["Name", "Reg. Number", "Program", "Credit Hours Completed", 
                  "Credit Hours Required", "Credit Hours Remaining"].includes(key)) {
                studentInfo[key] = cells[1].innerText.trim();
              }

              if (cells.length === 4 && cells[2].innerText.includes("Credit Hours")) {
                const additionalKey = cells[2].innerText.replace(":", "").trim();
                studentInfo[additionalKey] = cells[3].innerText.trim();
              }
            }
          });
        }

        const normalizeSemester = (semesterString) => {
          const semesterRegex = /^Semester/i;
          return semesterRegex.test(semesterString)
            ? semesterString.trim()
            : "Depth Elective";
        };

        // Extract selected course IDs
        const selectedCourseIds = Array.from(
          document.querySelectorAll('input[type="checkbox"]:checked')
        ).map((checkbox) => checkbox.id);

        const extractSemesterData = (table, semesterName) => {
          const rows = Array.from(table.querySelectorAll("tr")).slice(1);

          return rows
            .map((row) => {
              const columns = Array.from(row.querySelectorAll("td"));
              if (columns.length === 0) return null;

              const statusCell = columns[0];
              let status = "unknown";
              if (statusCell.querySelector('img[src*="tick.png"]')) {
                status = "cleared";
              } else if (statusCell.querySelector('img[src*="lock2.png"]')) {
                status = "locked";
              } else if (statusCell.querySelector('img[src*="cross.png"]')) {
                status = "not offered";
              } else if (statusCell.querySelector('input[type="checkbox"]')) {
                status = "available";
              }

              const checkbox = statusCell.querySelector('input[type="checkbox"]');
              const inputId = checkbox ? checkbox.id : null;

              const timingCell = columns[7] ? columns[7].innerText.trim() : "";
              const timings = timingCell
                .split(",")
                .map((slot) => {
                  const parts = slot.trim().split(" ");
                  let [day, startTime, endTime, room] = ["", "", "", ""];

                  if (parts.length >= 4) {
                    [day, startTime, endTime, room] = parts;
                  } else if (parts.length === 3) {
                    [day, startTime, endTime] = parts;
                  }

                  return { day, startTime, endTime, room };
                })
                .filter(timing => timing.day || timing.startTime || timing.endTime || timing.room);

              return {
                semester: semesterName,
                status,
                inputId,
                courseCode: columns[1]?.innerText.trim() || "",
                preRequisite: columns[2]?.innerText.trim() || "",
                credits: columns[3] ? parseFloat(columns[3].innerText.trim()) : 0,
                courseName: columns[4]?.innerText.trim() || "",
                grade: columns[5]?.innerText.trim() || "",
                facultyName: columns[6]?.innerText.trim() || "",
                timings,
              };
            })
            .filter(Boolean);
        };

        // Process all semester tables
        const semesterTables = Array.from(document.querySelectorAll("table.tableStyle"));
        const courses = semesterTables.reduce((acc, table) => {
          const headerElement = table.querySelector("tr.tableHeaderStyle td");
          const headerText = headerElement?.innerText.trim() || "";
          const semesterName = normalizeSemester(headerText);

          const innerTable = table.querySelector("table");
          if (innerTable) {
            const semesterCourses = extractSemesterData(innerTable, semesterName);
            return [...acc, ...semesterCourses];
          }
          return acc;
        }, []);

        // Group courses by course code
        const groupedCourses = courses.reduce((acc, course) => {
          if (!acc[course.courseCode]) {
            acc[course.courseCode] = [];
          }
          acc[course.courseCode].push(course);
          return acc;
        }, {});

        // Format course groups
        const courseGroups = Object.entries(groupedCourses).map(([courseCode, courses]) => {
          const mainCourse = courses[0];
          const slots = courses.map(course => ({
            inputId: course.inputId,
            timings: course.timings,
            facultyName: course.facultyName,
            status: course.status,
          }));

          let status = mainCourse.status;
          if (status === "unknown") {
            if (mainCourse.facultyName === "In Progress") {
              status = "In Progress";
            } else if (mainCourse.facultyName === "Pre Requisite not cleared") {
              status = "Pre Requisites not cleared";
            }
          }

          return {
            Name: mainCourse.courseName,
            CourseCode: courseCode,
            Status: status,
            PreRequisites: !mainCourse.preRequisite || mainCourse.preRequisite === "-" 
              ? ["None"] 
              : mainCourse.preRequisite.split("\n"),
            Credits: mainCourse.credits,
            SLOTS: slots,
            Grade: mainCourse.grade === "To be taken" ? "N/A" : mainCourse.grade,
            Semester: mainCourse.semester,
          };
        });

        // Group by semester
        const semesterGroups = courseGroups.reduce((acc, course) => {
          const { Semester, ...courseWithoutSemester } = course;
          if (!acc[Semester]) {
            acc[Semester] = [];
          }
          acc[Semester].push(courseWithoutSemester);
          return acc;
        }, {});

        // Sort semesters
        const sortedSemesters = Object.entries(semesterGroups)
          .map(([semester, courses]) => ({
            semester,
            courses,
          }))
          .sort((a, b) => {
            if (a.semester.toLowerCase().includes("depth elective")) return 1;
            if (b.semester.toLowerCase().includes("depth elective")) return -1;

            const getSemesterNumber = sem => {
              const match = sem.match(/\d+/);
              return match ? parseInt(match[0]) : Infinity;
            };

            const aNum = getSemesterNumber(a.semester);
            const bNum = getSemesterNumber(b.semester);

            return isFinite(aNum) && isFinite(bNum)
              ? aNum - bNum
              : a.semester.localeCompare(b.semester);
          });

        return {
          studentInfo,
          selectedCourseIds,
          semesters: sortedSemesters,
        };
      };

      return extractTableData();
    });

    // Save data to file
    const jsonFilePath = "../ActualFrontend/src/data/data.json";
    fs.writeFileSync(jsonFilePath, JSON.stringify(formattedData, null, 2));
    console.log(`Data has been saved to ${jsonFilePath}`);

    return formattedData;

  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed");
    }
  }
}

// Start server and run initial scrape
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await scrapeData();
    console.log("Initial scraping completed successfully");
  } catch (error) {
    console.error("Failed to complete initial scraping:", error.message);
  }
});

// Route to manually trigger scraping
app.post("/api/refresh", async (req, res) => {
  try {
    const data = await scrapeData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});