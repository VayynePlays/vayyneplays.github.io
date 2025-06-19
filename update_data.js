const https = require("https");
const fs = require("fs");
const axios = require("axios");

// UEX API endpoint for commodities
const COMMODITIES_API_URL = "https://api.uexcorp.space/2.0/commodities";

// UEX API endpoints
const STAR_SYSTEMS_API_URL = "https://api.uexcorp.space/2.0/star_systems";
const POI_API_URL = "https://api.uexcorp.space/2.0/poi";
const PLANETS_API_URL = "https://api.uexcorp.space/2.0/planets?id_star_system=";
const MOONS_API_URL = "https://api.uexcorp.space/2.0/moons?id_star_system=";
const SPACE_STATIONS_API_URL =
  "https://api.uexcorp.space/2.0/space_stations?id_star_system=";

const OUTPOSTS_API_URL = "https://api.uexcorp.space/2.0/outposts";

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

// Helper to fetch POIs for a given query param
async function fetchPOIs(params) {
  const url = `${POI_API_URL}?${params}`;
  const res = await axios.get(url);
  if (res.data.status !== "ok")
    throw new Error("Failed to fetch POIs for " + params);
  return res.data.data;
}

// Main update function for destinations
async function updateDestinationsJSONFull() {
  // Fetch all star systems
  const starSystems = await axios
    .get(STAR_SYSTEMS_API_URL)
    .then((res) => res.data.data);
  // Fetch all outposts once
  const outposts = await axios
    .get(OUTPOSTS_API_URL)
    .then((res) => res.data.data);

  // Build system id to name map
  const systemMap = Object.fromEntries(starSystems.map((s) => [s.id, s.name]));

  // For each system, fetch planets, moons, space stations, and all POIs
  const hierarchical = {};
  for (const system of starSystems) {
    // Only process Stanton and Pyro
    if (system.name !== "Stanton" && system.name !== "Pyro") continue;
    console.log(`Processing system: ${system.name}`);
    let allPOIs = [];
    // Fetch planets, moons, stations
    const [planets, moons, stations] = await Promise.all([
      axios.get(PLANETS_API_URL + system.id).then((res) => res.data.data),
      axios.get(MOONS_API_URL + system.id).then((res) => res.data.data),
      axios
        .get(SPACE_STATIONS_API_URL + system.id)
        .then((res) => res.data.data),
    ]);
    // Build lookup maps for this system
    const planetMap = Object.fromEntries(planets.map((p) => [p.id, p.name]));
    const moonMap = Object.fromEntries(moons.map((m) => [m.id, m.name]));
    const stationMap = Object.fromEntries(stations.map((s) => [s.id, s.name]));
    // Fetch POIs for each planet
    for (const planet of planets) {
      try {
        const pois = await fetchPOIs(`id_planet=${planet.id}`);
        allPOIs = allPOIs.concat(pois);
      } catch (err) {
        console.error(
          `Error fetching POIs for planet ${planet.name}:`,
          err.message
        );
      }
    }
    // Fetch POIs for each moon
    for (const moon of moons) {
      try {
        const pois = await fetchPOIs(`id_moon=${moon.id}`);
        allPOIs = allPOIs.concat(pois);
      } catch (err) {
        console.error(
          `Error fetching POIs for moon ${moon.name}:`,
          err.message
        );
      }
    }
    // Fetch POIs for each space station
    for (const station of stations) {
      try {
        const pois = await fetchPOIs(`id_space_station=${station.id}`);
        allPOIs = allPOIs.concat(pois);
      } catch (err) {
        console.error(
          `Error fetching POIs for space station ${station.name}:`,
          err.message
        );
      }
    }
    // Fetch system-level POIs
    try {
      const pois = await fetchPOIs(`id_star_system=${system.id}`);
      allPOIs = allPOIs.concat(pois);
    } catch (err) {
      console.error(
        `Error fetching POIs for system ${system.name}:`,
        err.message
      );
    }
    // Add outposts for this system
    const systemOutposts = outposts.filter(
      (o) => o.is_available_live === 1 && o.star_system_name === system.name
    );
    allPOIs = allPOIs.concat(systemOutposts);
    // Remove duplicates by POI name
    const seen = new Set();
    allPOIs = allPOIs.filter((poi) => {
      const key = poi.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Debug: log POI counts
    console.log(
      `System: ${system.name} - Total POIs before filtering: ${allPOIs.length}`
    );
    const filtered = allPOIs.filter((poi) => poi.is_available_live === 1);
    console.log(
      `System: ${system.name} - POIs with is_available_live === 1: ${filtered.length}`
    );
    if (system.name.toLowerCase().includes("hurston")) {
      console.log(
        "Hurston POIs:",
        filtered.map((poi) => poi.name)
      );
    }
    // Group by region (planet, moon, station, orbit)
    const regions = {};
    filtered.forEach((poi) => {
      const region =
        planetMap[poi.id_planet] ||
        moonMap[poi.id_moon] ||
        stationMap[poi.id_space_station] ||
        poi.orbit_name ||
        "Other";
      if (!regions[region]) regions[region] = [];
      regions[region].push(poi.name);
    });
    hierarchical[system.name] = regions;
  }
  // Count total
  const total = Object.values(hierarchical).reduce(
    (sum, sys) =>
      sum + Object.values(sys).reduce((s, reg) => s + reg.length, 0),
    0
  );
  // Write destinations.json
  const newData = {
    last_updated: new Date().toISOString(),
    total_destinations: total,
    hierarchical,
  };
  fs.writeFileSync(
    "destinations.json",
    JSON.stringify(newData, null, 2),
    "utf8"
  );
  console.log(
    `✅ Successfully updated destinations.json with ${total} destinations`
  );
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

// Fetch all lookup tables and outposts
async function fetchAllLookupsAndOutposts() {
  const [outposts, starSystems, planets, moons, spaceStations] =
    await Promise.all([
      axios.get(OUTPOSTS_API_URL).then((res) => res.data.data),
      axios.get(STAR_SYSTEMS_API_URL).then((res) => res.data.data),
      axios.get(PLANETS_API_URL).then((res) => res.data.data),
      axios.get(MOONS_API_URL).then((res) => res.data.data),
      axios.get(SPACE_STATIONS_API_URL).then((res) => res.data.data),
    ]);
  return { outposts, starSystems, planets, moons, spaceStations };
}

// Build ID-to-name maps
function buildIdMaps(starSystems, planets, moons, spaceStations) {
  return {
    systemMap: Object.fromEntries(starSystems.map((s) => [s.id, s.name])),
    planetMap: Object.fromEntries(planets.map((p) => [p.id, p.name])),
    moonMap: Object.fromEntries(moons.map((m) => [m.id, m.name])),
    stationMap: Object.fromEntries(spaceStations.map((s) => [s.id, s.name])),
  };
}

// Group outposts by system and region using names
function groupOutpostsBySystemAndRegion(
  outposts,
  systemMap,
  planetMap,
  moonMap,
  stationMap
) {
  const hierarchical = {};
  outposts.forEach((outpost) => {
    if (
      outpost.is_available_live !== 1 ||
      outpost.is_visible !== 1 ||
      outpost.has_freight_elevator !== 1
    )
      return;
    const system = systemMap[outpost.id_star_system] || "Unknown System";
    const region =
      planetMap[outpost.id_planet] ||
      moonMap[outpost.id_moon] ||
      stationMap[outpost.id_space_station] ||
      outpost.orbit_name ||
      "Other";
    if (!hierarchical[system]) hierarchical[system] = {};
    if (!hierarchical[system][region]) hierarchical[system][region] = [];
    hierarchical[system][region].push(outpost.name);
  });
  return hierarchical;
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
    console.log("\n🌍 Fetching full destinations list from UEX...");
    await updateDestinationsJSONFull();

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
  updateDestinationsJSONFull,
};
