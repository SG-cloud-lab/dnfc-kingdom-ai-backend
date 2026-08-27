fetch("current/today.json")
  .then(response => response.json())
  .then(today => {
    return fetch("archive/august-2026/day1.json");
  })
  .then(response => response.json())
  .then(devotion => {

    document.getElementById("devotions-list").innerHTML = `
      <div style="background:white;padding:16px;border-radius:16px;">
        <h3>${devotion.theme}</h3>
        <p><strong>${devotion.verse}</strong></p>
        <p>${devotion.teaching}</p>
        <p><strong>Golden Nugget:</strong><br>${devotion.goldenNugget}</p>
        <p>${devotion.prayerDeclaration}</p>
        <p>${devotion.hashtag}</p>
      </div>
    `;

  })
  .catch(error => {
    console.error("Daily Dose Error:", error);
  });
