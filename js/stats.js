// Statistics Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('Stats page loaded');
    
    // DOM Elements
    const totalClasses = document.getElementById('totalClasses');
    const attendedClasses = document.getElementById('attendedClasses');
    const overallPercentage = document.getElementById('overallPercentage');
    const performanceList = document.getElementById('performanceList');
    const riskSubjects = document.getElementById('riskSubjects');
    const safeToMiss = document.getElementById('safeToMiss');
    const currentMonth = document.getElementById('currentMonth');
    const calendar = document.getElementById('calendar');
    const prevMonthBtn = document.getElementById('prevMonth');
    const todayMonthBtn = document.getElementById('todayMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const exportStatsBtn = document.getElementById('exportStatsBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const emptyStats = document.getElementById('emptyStats');
    
    // Charts
    let attendanceChart = null;
    let weeklyChart = null;
    
    // Calendar state
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonthIndex = currentDate.getMonth();

    // Initialize
    init();

    function init() {
        const stats = calculateStatistics();
        
        if (stats.totalSubjects === 0) {
            emptyStats.classList.remove('hidden');
            return;
        } else {
            emptyStats.classList.add('hidden');
        }
        
        updateOverview(stats);
        renderSubjectPerformance(stats);
        renderCharts(stats);
        renderInsights(stats);
        renderCalendar();
        setupEventListeners();
    }

    function calculateStatistics() {
        const subjects = Storage.getSubjects();
        const history = Storage.getHistory();
        const timetable = Storage.getTimetable();
        
        // Overall statistics
        let totalClassesCount = 0;
        let attendedClassesCount = 0;
        
        subjects.forEach(subject => {
            totalClassesCount += subject.total || 0;
            attendedClassesCount += subject.attended || 0;
        });
        
        const overallPercentage = totalClassesCount > 0 
            ? Math.round((attendedClassesCount / totalClassesCount) * 100)
            : 0;

        // Subject performance
        const subjectPerformance = subjects.map(subject => {
            const percentage = Utils.calculatePercentage(subject.attended, subject.total);
            const riskLevel = Utils.getRiskLevel(percentage, subject.target);
            const needed = Utils.calculateNeeded(subject.attended, subject.total, subject.target);
            const safe = Utils.calculateSafeToMiss(subject.attended, subject.total, subject.target);
            
            return {
                ...subject,
                percentage,
                riskLevel,
                needed,
                safe,
                status: percentage >= subject.target ? 'on-track' : 'at-risk'
            };
        }).sort((a, b) => b.percentage - a.percentage);

        // Weekly pattern
        const weeklyPattern = {
            monday: { attended: 0, total: 0 },
            tuesday: { attended: 0, total: 0 },
            wednesday: { attended: 0, total: 0 },
            thursday: { attended: 0, total: 0 },
            friday: { attended: 0, total: 0 },
            saturday: { attended: 0, total: 0 },
            sunday: { attended: 0, total: 0 }
        };

        history.forEach(day => {
            const date = new Date(day.date);
            const dayName = Utils.getDayName(date).toLowerCase();
            
            day.entries.forEach(entry => {
                if (entry.status === 'attended') {
                    weeklyPattern[dayName].attended += 1;
                    weeklyPattern[dayName].total += 1;
                } else if (entry.status === 'missed') {
                    weeklyPattern[dayName].total += 1;
                }
            });
        });

        // At-risk subjects
        const atRiskSubjects = subjectPerformance
            .filter(subject => subject.riskLevel === 'high')
            .sort((a, b) => a.percentage - b.percentage);

        // Safe to miss
        const safeToMissSubjects = subjectPerformance
            .filter(subject => subject.safe > 0)
            .sort((a, b) => b.safe - a.safe);

        return {
            totalClasses: totalClassesCount,
            attendedClasses: attendedClassesCount,
            overallPercentage,
            subjectPerformance,
            weeklyPattern,
            atRiskSubjects,
            safeToMissSubjects,
            totalSubjects: subjects.length
        };
    }

    function updateOverview(stats) {
        totalClasses.textContent = stats.totalClasses;
        attendedClasses.textContent = stats.attendedClasses;
        overallPercentage.textContent = `${stats.overallPercentage}%`;
    }

    function renderSubjectPerformance(stats) {
        performanceList.innerHTML = '';
        
        if (stats.subjectPerformance.length === 0) {
            performanceList.innerHTML = `
                <div class="empty-stats">
                    <div class="empty-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h3>No Subjects Found</h3>
                    <p>Add subjects in the setup page</p>
                    <a href="setup.html" class="btn btn-primary">
                        <i class="fas fa-cog"></i> Go to Setup
                    </a>
                </div>
            `;
            return;
        }

        stats.subjectPerformance.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'subject-perf-card';
            
            // Progress bar width
            const progressWidth = Math.min(subject.percentage, 100);
            
            card.innerHTML = `
                <div class="perf-header">
                    <div class="subject-name">${subject.name}</div>
                    <div class="risk-badge risk-${subject.riskLevel}">
                        ${subject.riskLevel.toUpperCase()}
                    </div>
                </div>
                <div class="perf-stats">
                    <div class="stat-box">
                        <div class="stat-value">${subject.percentage}%</div>
                        <div class="stat-label">Current</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${subject.target}%</div>
                        <div class="stat-label">Target</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${subject.needed}</div>
                        <div class="stat-label">Needed</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${subject.safe}</div>
                        <div class="stat-label">Safe to Miss</div>
                    </div>
                </div>
                <div class="perf-progress">
                    <div class="progress-info">
                        <span>${subject.attended}/${subject.total} classes</span>
                        <span>${subject.percentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${subject.riskLevel}" style="width: ${progressWidth}%"></div>
                    </div>
                </div>
            `;
            
            performanceList.appendChild(card);
        });
    }

    function renderCharts(stats) {
        // Destroy existing charts
        if (attendanceChart) attendanceChart.destroy();
        if (weeklyChart) weeklyChart.destroy();
        
        // Attendance Distribution Chart
        const attendanceCtx = document.getElementById('attendanceChart');
        if (attendanceCtx) {
            const subjects = stats.subjectPerformance;
            
            attendanceChart = new Chart(attendanceCtx, {
                type: 'doughnut',
                data: {
                    labels: subjects.map(s => s.name),
                    datasets: [{
                        data: subjects.map(s => s.percentage),
                        backgroundColor: subjects.map(s => s.color),
                        borderWidth: 2,
                        borderColor: 'white',
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const subject = subjects[context.dataIndex];
                                    return `${subject.name}: ${subject.percentage}% (${subject.attended}/${subject.total})`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
        
        // Weekly Pattern Chart
        const weeklyCtx = document.getElementById('weeklyChart');
        if (weeklyCtx) {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const weeklyData = stats.weeklyPattern;
            
            weeklyChart = new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [
                        {
                            label: 'Attended',
                            data: days.map(day => weeklyData[day.toLowerCase()].attended),
                            backgroundColor: 'rgba(16, 185, 129, 0.7)',
                            borderColor: 'rgba(16, 185, 129, 1)',
                            borderWidth: 2,
                            borderRadius: 6,
                            borderSkipped: false
                        },
                        {
                            label: 'Total',
                            data: days.map(day => weeklyData[day.toLowerCase()].total),
                            backgroundColor: 'rgba(26, 35, 126, 0.7)',
                            borderColor: 'rgba(26, 35, 126, 1)',
                            borderWidth: 2,
                            borderRadius: 6,
                            borderSkipped: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(26, 35, 126, 0.1)'
                            },
                            ticks: {
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(26, 35, 126, 0.1)'
                            },
                            ticks: {
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    family: 'Inter',
                                    size: 12
                                },
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }
    }

    function renderInsights(stats) {
        // At-risk subjects
        riskSubjects.innerHTML = '';
        if (stats.atRiskSubjects.length === 0) {
            riskSubjects.innerHTML = `
                <div class="insight-item">
                    <span class="insight-subject">All subjects on track!</span>
                    <span class="insight-value text-success">✓</span>
                </div>
            `;
        } else {
            stats.atRiskSubjects.forEach(subject => {
                const item = document.createElement('div');
                item.className = 'insight-item';
                item.innerHTML = `
                    <span class="insight-subject">${subject.name}</span>
                    <span class="insight-value text-danger">${subject.percentage}%</span>
                `;
                riskSubjects.appendChild(item);
            });
        }
        
        // Safe to miss
        safeToMiss.innerHTML = '';
        if (stats.safeToMissSubjects.length === 0) {
            safeToMiss.innerHTML = `
                <div class="insight-item">
                    <span class="insight-subject">No buffer available</span>
                    <span class="insight-value text-warning">⚠</span>
                </div>
            `;
        } else {
            stats.safeToMissSubjects.forEach(subject => {
                const item = document.createElement('div');
                item.className = 'insight-item';
                item.innerHTML = `
                    <span class="insight-subject">${subject.name}</span>
                    <span class="insight-value text-success">${subject.safe} classes</span>
                `;
                safeToMiss.appendChild(item);
            });
        }
    }

    function renderCalendar() {
        calendar.innerHTML = '';
        
        // Month header
        const monthName = Utils.getMonthName(currentMonthIndex);
        currentMonth.textContent = `${monthName} ${currentYear}`;
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });
        
        // Get first day of month
        const firstDay = new Date(currentYear, currentMonthIndex, 1).getDay();
        const daysInMonth = Utils.getDaysInMonth(currentYear, currentMonthIndex);
        const history = Storage.getHistory();
        const today = new Date();
        
        // Empty cells for days before first day
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date';
            calendar.appendChild(emptyCell);
        }
        
        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonthIndex, day);
            const dateStr = Utils.formatDate(date);
            const dayHistory = history.find(h => h.date === dateStr);
            
            const dateElement = document.createElement('div');
            dateElement.className = 'calendar-date';
            dateElement.textContent = day;
            
            // Check if today
            if (date.getDate() === today.getDate() && 
                date.getMonth() === today.getMonth() && 
                date.getFullYear() === today.getFullYear()) {
                dateElement.classList.add('today');
            }
            
            // Check if has attendance data
            if (dayHistory && dayHistory.entries.length > 0) {
                const attended = dayHistory.entries.filter(e => e.status === 'attended').length;
                const total = dayHistory.entries.filter(e => e.status !== 'cancelled').length;
                
                if (total > 0) {
                    if (attended === total) {
                        dateElement.classList.add('has-attendance');
                    } else if (attended > 0) {
                        dateElement.classList.add('partial');
                    }
                    
                    // Add tooltip
                    const percentage = Math.round((attended / total) * 100);
                    const tooltip = document.createElement('div');
                    tooltip.className = 'date-tooltip';
                    tooltip.textContent = `${attended}/${total} (${percentage}%)`;
                    dateElement.appendChild(tooltip);
                }
            }
            
            calendar.appendChild(dateElement);
        }
    }

    function setupEventListeners() {
        // Calendar navigation
        prevMonthBtn.addEventListener('click', () => {
            currentMonthIndex--;
            if (currentMonthIndex < 0) {
                currentMonthIndex = 11;
                currentYear--;
            }
            renderCalendar();
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentMonthIndex++;
            if (currentMonthIndex > 11) {
                currentMonthIndex = 0;
                currentYear++;
            }
            renderCalendar();
        });
        
        todayMonthBtn.addEventListener('click', () => {
            currentDate = new Date();
            currentYear = currentDate.getFullYear();
            currentMonthIndex = currentDate.getMonth();
            renderCalendar();
        });
        
        // Export statistics
        if (exportStatsBtn) {
            exportStatsBtn.addEventListener('click', exportStatistics);
        }
        
        // Export data
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                const data = Storage.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendo-backup-${Utils.formatDate()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                Utils.showToast('Data exported successfully!', 'success');
            });
        }
        
        // Import data
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const result = Storage.importData(event.target.result);
                            if (result.success) {
                                Utils.showToast('Data imported successfully!', 'success');
                                setTimeout(() => location.reload(), 1000);
                            } else {
                                Utils.showToast('Import failed: ' + result.error, 'error');
                            }
                        } catch (error) {
                            Utils.showToast('Invalid file format', 'error');
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
        
        // Clear data
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (confirm('Are you sure? This will delete all your attendance data.')) {
                    const result = Storage.clearAllData();
                    if (result.success) {
                        Utils.showToast('All data cleared', 'info');
                        setTimeout(() => location.reload(), 1000);
                    }
                }
            });
        }
    }

    function exportStatistics() {
        const stats = calculateStatistics();
        
        let csv = 'Subject,Attended,Total,Percentage,Target,Risk Level,Safe to Miss,Needed\n';
        
        stats.subjectPerformance.forEach(subject => {
            csv += `"${subject.name}",${subject.attended},${subject.total},${subject.percentage}%,${subject.target},${subject.riskLevel},${subject.safe},${subject.needed}\n`;
        });
        
        csv += '\nWeekly Attendance\nDay,Attended,Total,Percentage\n';
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            const data = stats.weeklyPattern[day];
            const percentage = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
            csv += `${day.charAt(0).toUpperCase() + day.slice(1)},${data.attended},${data.total},${percentage}%\n`;
        });
        
        csv += `\nOverall Statistics\nTotal Classes,${stats.totalClasses}\nAttended Classes,${stats.attendedClasses}\nOverall Percentage,${stats.overallPercentage}%\nTotal Subjects,${stats.totalSubjects}\n`;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendo-stats-${Utils.formatDate()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showToast('Statistics exported as CSV!', 'success');
    }
});