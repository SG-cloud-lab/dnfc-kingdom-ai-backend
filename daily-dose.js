// DNFC Daily Dose Loader

fetch("current/today.json")
  .then(response => response.json())
  .then(data => {
    console.log("Today's Devotion:", data);
  })
  .catch(error => {
    console.error("Error loading Daily Dose:", error);
  });
