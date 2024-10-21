import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

export const config = {
  runtime: 'edge',
  regions: ['fra1'],
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  let browser
  try {
    const body = await req.json()
    const { username, password } = body

    browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    })

    const page = await browser.newPage()
    await page.goto("https://iulms.edu.pk/login/index.php")
    await page.type("#login_username", username)
    await page.type("#login_password", password)
    await page.click('#login input[type="submit"]')
    await page.waitForNavigation()

    await page.goto("https://iulms.edu.pk/registration/Registration_FEST_student_EarlyRegistrationBeta.php")

    try {
      await page.waitForSelector("table", { timeout: 5000 })
    } catch (err) {
      await browser.close()
      return new Response(
        JSON.stringify({ error: "Invalid credentials or data not found" }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const formattedData = await page.evaluate(() => {
      const studentInfo = {}
      const infoTable = document.getElementById("gpaInfo")
      if (infoTable) {
        const rows = infoTable.querySelectorAll("tr")
        rows.forEach((row) => {
          const cells = row.querySelectorAll("td")
          if (cells.length >= 2) {
            const key = cells[0].innerText.replace(":", "").trim()

            if (key === "Name" || key === "Reg. Number" || key === "Program") {
              studentInfo[key] = cells[1].innerText.trim()
            } else if (key === "Credit Hours Completed") {
              studentInfo[key] = cells[1].innerText.trim()
            } else if (key === "Credit Hours Required") {
              studentInfo[key] = cells[1].innerText.trim()
            } else if (key === "Credit Hours Remaining") {
              studentInfo[key] = cells[1].innerText.trim()
            }

            if (cells.length === 4 && cells[2].innerText.includes("Credit Hours")) {
              const additionalKey = cells[2].innerText.replace(":", "").trim()
              studentInfo[additionalKey] = cells[3].innerText.trim()
            }
          }
        })
      }

      const normalizeSemester = (semesterString) => {
        const semesterRegex = /^Semester/i
        return semesterRegex.test(semesterString) ? semesterString.trim() : "Depth Elective"
      }

      const selectedCourseIds = Array.from(
        document.querySelectorAll('input[type="checkbox"]:checked')
      ).map((checkbox) => checkbox.id)

      const extractSemesterData = (table, semesterName) => {
        const rows = Array.from(table.querySelectorAll("tr")).slice(1)

        return rows
          .map((row) => {
            const columns = Array.from(row.querySelectorAll("td"))
            if (columns.length === 0) return null

            const statusCell = columns[0]
            let status = "unknown"
            if (statusCell.querySelector('img[src*="tick.png"]')) {
              status = "cleared"
            } else if (statusCell.querySelector('img[src*="lock2.png"]')) {
              status = "locked"
            } else if (statusCell.querySelector('img[src*="cross.png"]')) {
              status = "not offered"
            } else if (statusCell.querySelector('input[type="checkbox"]')) {
              status = "available"
            }

            const checkbox = statusCell.querySelector('input[type="checkbox"]')
            const inputId = checkbox ? checkbox.id : null

            const timingCell = columns[7] ? columns[7].innerText.trim() : ""
            const timings = timingCell
              .split(",")
              .map((slot) => {
                const parts = slot.trim().split(" ")
                let day = "", startTime = "", endTime = "", room = ""

                if (parts.length >= 4) {
                  [day, startTime, endTime, room] = parts
                } else if (parts.length === 3) {
                  [day, startTime, endTime] = parts
                }

                return { day, startTime, endTime, room }
              })
              .filter((timing) => timing.day || timing.startTime || timing.endTime || timing.room)

            return {
              semester: semesterName,
              status,
              inputId,
              courseCode: columns[1] ? columns[1].innerText.trim() : "",
              preRequisite: columns[2] ? columns[2].innerText.trim() : "",
              credits: columns[3] ? parseFloat(columns[3].innerText.trim()) : 0,
              courseName: columns[4] ? columns[4].innerText.trim() : "",
              grade: columns[5] ? columns[5].innerText.trim() : "",
              facultyName: columns[6] ? columns[6].innerText.trim() : "",
              timings,
            }
          })
          .filter((row) => row !== null)
      }

      const semesterTables = Array.from(document.querySelectorAll("table.tableStyle"))
      let courses = []

      semesterTables.forEach((table) => {
        const headerElement = table.querySelector("tr.tableHeaderStyle td")
        const headerText = headerElement ? headerElement.innerText.trim() : ""
        const semesterName = normalizeSemester(headerText)

        const innerTable = table.querySelector("table")
        if (innerTable) {
          const semesterCourses = extractSemesterData(innerTable, semesterName)
          courses = courses.concat(semesterCourses)
        }
      })

      const groupedCourses = courses.reduce((acc, course) => {
        if (!acc[course.courseCode]) {
          acc[course.courseCode] = []
        }
        acc[course.courseCode].push(course)
        return acc
      }, {})

      const courseGroups = Object.entries(groupedCourses).map(([courseCode, courses]) => {
        const mainCourse = courses[0]
        const slots = courses.map((course) => ({
          inputId: course.inputId,
          timings: course.timings,
          facultyName: course.facultyName,
          status: course.status,
        }))

        let status = mainCourse.status
        if (status === "unknown" && mainCourse.facultyName === "In Progress") {
          status = "In Progress"
        } else if (status === "unknown" && mainCourse.facultyName === "Pre Requisite not cleared") {
          status = "Pre Requisites not cleared"
        }

        let preRequisites = !mainCourse.preRequisite || mainCourse.preRequisite === "-"
          ? ["None"]
          : mainCourse.preRequisite.split("\n").map((prereq) => prereq)

        const grade = mainCourse.grade === "To be taken" ? "N/A" : mainCourse.grade

        return {
          Name: mainCourse.courseName,
          CourseCode: courseCode,
          Status: status,
          PreRequisites: preRequisites,
          Credits: mainCourse.credits,
          SLOTS: slots,
          Grade: grade,
          Semester: mainCourse.semester,
        }
      })

      const semesterGroups = courseGroups.reduce((acc, course) => {
        if (!acc[course.Semester]) {
          acc[course.Semester] = []
        }
        const { Semester, ...courseWithoutSemester } = course
        acc[course.Semester].push(courseWithoutSemester)
        return acc
      }, {})

      const sortedSemesters = Object.entries(semesterGroups)
        .map(([semester, courses]) => ({
          semester,
          courses,
        }))
        .sort((a, b) => {
          const getSemesterNumber = (sem) => {
            const match = sem.match(/\d+/)
            return match ? parseInt(match[0]) : Infinity
          }

          if (a.semester.toLowerCase().includes("depth elective")) return 1
          if (b.semester.toLowerCase().includes("depth elective")) return -1

          const aNum = getSemesterNumber(a.semester)
          const bNum = getSemesterNumber(b.semester)

          if (isFinite(aNum) && isFinite(bNum)) {
            return aNum - bNum
          }

          return a.semester.localeCompare(b.semester)
        })

      return {
        studentInfo,
        selectedCourseIds,
        semesters: sortedSemesters,
      }
    })

    return new Response(JSON.stringify(formattedData), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}