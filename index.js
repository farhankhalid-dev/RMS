const puppeteer = require("puppeteer");
const xlsx = require("xlsx");
require('dotenv').config(); // Load environment variables from .env file

// Function to extract data from a table, including nested tables
const extractTableData = (table) => {
  const rows = Array.from(table.querySelectorAll("tr"));
  return rows.map((row) => {
    const columns = Array.from(row.querySelectorAll("td, th"));
    return columns.map((column) => {
      // Check for nested tables within a cell
      const nestedTable = column.querySelector("table");
      if (nestedTable) {
        // If there's a nested table, recursively extract its data
        return extractTableData(nestedTable);
      }
      return column.innerText.trim();
    });
  });
};

(async () => {
  const usr = process.env.usr;
  const psw = process.env.psw; 

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Go to login page
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
    console.error("Error: No tables found on the page.");
    await browser.close();
    return;
  }

  const tables = await page.$$eval("table", (tables) => {
    return tables.map((table) => extractTableData(table));
  });

  const workbook = xlsx.utils.book_new();

  tables.forEach((tableData, index) => {
    const worksheet = xlsx.utils.json_to_sheet(tableData.flat(1));
    xlsx.utils.book_append_sheet(workbook, worksheet, `Table${index + 1}`);
  });

  const filePath = "./scraped_tables.xlsx";

  xlsx.writeFile(workbook, filePath);

  console.log(`Data has been saved to ${filePath}`);

  await browser.close();
})();
