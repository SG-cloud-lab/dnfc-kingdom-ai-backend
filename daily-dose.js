fetch("current/today.json")
  .then(response => response.json())
  .then(devotion => {

    const container = document.getElementById("devotions-list");

    container.innerHTML = `
      <div style="
        background:white;
        padding:20px;
        border-radius:16px;
        box-shadow:0 4px 16px rgba(0,0,0,0.05);
      ">

        <p style="color:#6c5ce7;font-weight:700;">
          ${devotion.date}
        </p>

        <h2 style="color:#1b0a38;">
          ${devotion.theme}
        </h2>

        <p style="line-height:1.6;">
          ${devotion.teaching}
        </p>

        <p style="font-weight:700;">
          ${devotion.goldenNugget}
        </p>

        <small>
          ${devotion.hashtag}
        </small>

      </div>
    `;

  })
  .catch(error => {
    console.log("Error loading devotion:", error);
  });
