const container = document.getElementById("classContainer");
const data = getData();
const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
const classes = data.timetable[today] || [];

classes.forEach(subject => {
  const card = document.createElement("div");
  const s = data.subjects[subject];
  const percent = s.total ? (s.attended / s.total) * 100 : 100;

  card.className = "card " + (percent >= s.target ? "safe" : percent >= s.target - 5 ? "warn" : "danger");
  card.innerHTML = `
    <h3>${subject}</h3>
    <p>${percent.toFixed(1)}%</p>
    <button onclick="cancel('${subject}')">Cancelled</button>
  `;

  let startX = 0;
  card.addEventListener("touchstart", e => startX = e.touches[0].clientX);
  card.addEventListener("touchend", e => {
    let diff = e.changedTouches[0].clientX - startX;
    if (diff > 50) attend(subject);
    if (diff < -50) miss(subject);
  });

  container.appendChild(card);
});

function attend(s) {
  const d = getData();
  d.subjects[s].attended++;
  d.subjects[s].total++;
  saveData(d);
  location.reload();
}

function miss(s) {
  const d = getData();
  d.subjects[s].total++;
  saveData(d);
  location.reload();
}

function cancel(s) {
  location.reload();
}
