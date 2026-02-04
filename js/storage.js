function getData() {
  return JSON.parse(localStorage.getItem("attendanceData")) || {
    subjects: {},
    timetable: {},
    history: {}
  };
}

function saveData(data) {
  localStorage.setItem("attendanceData", JSON.stringify(data));
}
