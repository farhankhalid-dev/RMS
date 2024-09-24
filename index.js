const puppeteer = require("puppeteer");
const fs = require("fs");
require('dotenv').config();

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
    console.error("Error: No tables found on the page.", err);
    await browser.close();
    return;
  }

  // Define the function to extract data from a table within the browser context
  const extractTableData = () => {
    const extractData = (table) => {
      const rows = Array.from(table.querySelectorAll("tr"));
      return rows.map((row) => {
        const columns = Array.from(row.querySelectorAll("td, th"));
        return columns.map((column) => {
          // Check for nested tables within a cell
          const nestedTable = column.querySelector("table");
          if (nestedTable) {
            // If there's a nested table, recursively extract its data
            return extractData(nestedTable);
          }
          return column.innerText.trim();
        });
      });
    };

    const tables = Array.from(document.querySelectorAll("table"));
    return tables.map((table) => extractData(table));
  };

  const tables = await page.evaluate(extractTableData);

  // Format to JSON
  const formattedData = tables.map((tableData, index) => {
    return {
      tableName: `Table${index + 1}`,
      data: tableData.map((row) => {
        return row.reduce((acc, curr, i) => {
          acc[`Column${i + 1}`] = curr;
          return acc;
        }, {});
      }),
    };
  });

  const jsonFilePath = "./scraped_tables.json";

  // Save the formatted data to a JSON file
  fs.writeFileSync(jsonFilePath, JSON.stringify(formattedData, null, 2));

  console.log(`Data has been saved to ${jsonFilePath}`);

  await browser.close();
})();
