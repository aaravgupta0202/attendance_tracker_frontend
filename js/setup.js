const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const daySelect = document.getElementById("day");
const subjectSelect = document.getElementById("subjectSelect");
const ttView = document.getElementById("ttView");

days.forEach(d => {
  let o = document.createElement("option");
  o.value = d;
  o.textContent = d;
  daySelect.appendChild(o);
});

function refreshSubjects() {
  subjectSelect.innerHTML = "";
  const data = getData();
  Object.keys(data.subjects).forEach(s => {
    let o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    subjectSelect.appendChild(o);
  });
}

function addSubject() {
  const name = subjectName.value;
  const target = parseInt(document.getElementById("target").value);
  if (!name || !target) return;

  const data = getData();
  data.subjects[name] = { attended: 0, total: 0, target };
  saveData(data);
  refreshSubjects();
}

function addToTimetable() {
  const data = getData();
  const d = day.value;
  const s = subjectSelect.value;
  if (!data.timetable[d]) data.timetable[d] = [];
  data.timetable[d].push(s);
  saveData(data);
  ttView.textContent = JSON.stringify(data.timetable, null, 2);
}

refreshSubjects();
