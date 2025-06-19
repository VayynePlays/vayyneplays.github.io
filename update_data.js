const https = require("https");
const fs = require("fs");

// UEX API endpoint for commodities
const COMMODITIES_API_URL = "https://api.uexcorp.space/2.0/commodities";

// Function to fetch data from UEX API
function fetchCommodities() {
  return new Promise((resolve, reject) => {
    https
      .get(COMMODITIES_API_URL, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.status === "ok" && response.data) {
              resolve(response.data);
            } else {
              reject(new Error("API response indicates error"));
            }
          } catch (error) {
            reject(new Error("Failed to parse API response"));
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

// Function to filter commodities based on criteria
function filterCommodities(commodities) {
  return commodities
    .filter((commodity) => {
      // Only include items that are both visible and available
      return commodity.is_visible === 1 && commodity.is_available === 1;
    })
    .map((commodity) => commodity.name);
}

// Function to update the commodities JSON file
function updateCommoditiesJSON(commodities) {
  const jsonFile = "resources.json";

  try {
    // Create the new JSON structure
    const newData = {
      last_updated: new Date().toISOString(),
      total_commodities: commodities.length,
      commodities: commodities.sort(),
    };

    // Write the updated content to the JSON file
    fs.writeFileSync(jsonFile, JSON.stringify(newData, null, 2), "utf8");
    console.log(
      `✅ Successfully updated ${jsonFile} with ${commodities.length} commodities`
    );
  } catch (error) {
    console.error("❌ Error updating commodities JSON file:", error.message);
  }
}

// Function to update the destinations JSON file
function updateDestinationsJSON() {
  const jsonFile = "destinations.json";

  try {
    // Read the current destinations file
    const currentData = JSON.parse(fs.readFileSync(jsonFile, "utf8"));

    // Update the timestamp
    currentData.last_updated = new Date().toISOString();

    // Recalculate total destinations
    let total = 0;
    Object.values(currentData.hierarchical).forEach((system) => {
      Object.values(system).forEach((region) => {
        total += region.length;
      });
    });
    currentData.total_destinations = total;

    // Write the updated content back to the JSON file
    fs.writeFileSync(jsonFile, JSON.stringify(currentData, null, 2), "utf8");
    console.log(
      `✅ Successfully updated ${jsonFile} with ${total} destinations`
    );
  } catch (error) {
    console.error("❌ Error updating destinations JSON file:", error.message);
  }
}

// Function to save commodities to a detailed JSON file for reference
function saveCommoditiesToJSON(commodities, allCommodities) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `commodities_${timestamp}.json`;

  const data = {
    timestamp: new Date().toISOString(),
    total_commodities: allCommodities.length,
    filtered_commodities: commodities.length,
    commodities: commodities,
    all_commodities: allCommodities.map((c) => ({
      name: c.name,
      code: c.code,
      is_visible: c.is_visible,
      is_available: c.is_available,
      is_illegal: c.is_illegal,
      is_temporary: c.is_temporary,
    })),
  };

  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
  console.log(`📄 Saved detailed commodity data to ${filename}`);
}

// Main function
async function updateData() {
  console.log("🚀 Starting data update process...\n");

  try {
    // Update commodities
    console.log("📦 Fetching commodities from UEX API...");
    const allCommodities = await fetchCommodities();
    console.log(`📊 Fetched ${allCommodities.length} total commodities`);

    const filteredCommodities = filterCommodities(allCommodities);
    console.log(
      `✅ Filtered to ${filteredCommodities.length} visible and available commodities`
    );

    updateCommoditiesJSON(filteredCommodities);
    saveCommoditiesToJSON(filteredCommodities, allCommodities);

    console.log("\n📋 Commodities Summary:");
    console.log(`- Total commodities: ${allCommodities.length}`);
    console.log(`- Visible and available: ${filteredCommodities.length}`);
    console.log(
      `- Excluded (not visible/available): ${
        allCommodities.length - filteredCommodities.length
      }`
    );

    // Show some examples of excluded items
    const excluded = allCommodities.filter(
      (c) => !(c.is_visible === 1 && c.is_available === 1)
    );
    if (excluded.length > 0) {
      console.log("\n🚫 Examples of excluded commodities:");
      excluded.slice(0, 5).forEach((c) => {
        console.log(
          `  - ${c.name} (visible: ${c.is_visible}, available: ${c.is_available})`
        );
      });
    }

    // Update destinations
    console.log("\n🌍 Updating destinations...");
    updateDestinationsJSON();

    console.log("\n🎉 Data update completed successfully!");
    console.log("📁 Updated files:");
    console.log("  - resources.json (commodities)");
    console.log("  - destinations.json (destinations)");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateData();
}

module.exports = {
  updateData,
  fetchCommodities,
  filterCommodities,
  updateCommoditiesJSON,
  updateDestinationsJSON,
};
