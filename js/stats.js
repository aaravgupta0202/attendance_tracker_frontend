const container = document.getElementById("statsContainer");
const data = getData();

Object.entries(data.subjects).forEach(([name, s]) => {
  const percent = s.total ? (s.attended / s.total) * 100 : 100;

  let needed = 0;
  let a = s.attended, t = s.total;
  while ((a / t) * 100 < s.target) {
    a++; t++; needed++;
  }

  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <h3>${name}</h3>
    <p>${percent.toFixed(1)}%</p>
    <p>Classes needed for ${s.target}%: ${needed}</p>
  `;
  container.appendChild(div);
});
