// Statistics Page Logic
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const totalClasses = document.getElementById('totalClasses');
    const attendedClasses = document.getElementById('attendedClasses');
    const overallPercentage = document.getElementById('overallPercentage');
    const subjectStats = document.getElementById('subjectStats');
    const riskSubjects = document.getElementById('riskSubjects');
    const safeToMiss = document.getElementById('safeToMiss');
    const sortBy = document.getElementById('sortBy');
    const exportStatsBtn = document.getElementById('exportStatsBtn');
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    // Charts
    let attendanceChart = null;
    let weeklyChart = null;
    
    // Calendar state
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    // Initialize
    init();

    function init() {
        loadStatistics();
        renderCharts();
        renderCalendar();
        setupEventListeners();
    }

    function loadStatistics() {
        const stats = Storage.getStatistics();
        
        // Update overview cards
        totalClasses.textContent = stats.totalClasses;
        attendedClasses.textContent = stats.attendedClasses;
        overallPercentage.textContent = `${stats.overallPercentage}%`;
        
        // Update subject performance
        renderSubjectStats(stats.subjectPerformance);
        
        // Update insights
        renderInsights(stats);
        
        // Update month display
        updateMonthDisplay();
    }

    function renderSubjectStats(subjects) {
        // Sort subjects based on selected option
        const sortValue = sortBy ? sortBy.value : 'name';
        let sortedSubjects = [...subjects];
        
        switch(sortValue) {
            case 'name':
                sortedSubjects.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'percentage':
                sortedSubjects.sort((a, b) => b.percentage - a.percentage);
                break;
            case 'risk':
                const riskOrder = { high: 0, medium: 1, low: 2 };
                sortedSubjects.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
                break;
        }
        
        // Clear current list
        subjectStats.innerHTML = '';
        
        if (sortedSubjects.length === 0) {
            subjectStats.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h3>No subjects found</h3>
                    <p>Add subjects in the setup page to see statistics</p>
                    <a href="setup.html" class="btn btn-primary">
                        <i class="fas fa-cog"></i> Go to Setup
                    </a>
                </div>
            `;
            return;
        }
        
        // Create subject cards
        sortedSubjects.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'subject-stat-card';
            
            card.innerHTML = `
                <div class="card-header">
                    <h4>${subject.name}</h4>
                    <div class="risk-indicator ${subject.riskLevel}-risk"></div>
                    <span class="badge badge-${subject.riskLevel}">
                        ${subject.riskLevel.toUpperCase()} RISK
                    </span>
                </div>
                
                <div class="stat-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${Utils.getPercentageColor(subject.percentage, subject.target)}" 
                             style="width: ${Math.min(100, subject.percentage)}%"></div>
                    </div>
                    <div class="progress-label">
                        ${subject.percentage}% (${subject.attended}/${subject.total})
                    </div>
                </div>
                
                <div class="stat-row">
                    <span class="label">Target:</span>
                    <span class="value">${subject.target}%</span>
                </div>
                
                <div class="stat-row">
                    <span class="label">Status:</span>
                    <span class="value ${subject.percentage >= subject.target ? 'text-success' : 'text-danger'}">
                        ${subject.percentage >= subject.target ? '✓ On track' : '✗ Below target'}
                    </span>
                </div>
                
                <div class="stat-row">
                    <span class="label">Needed to reach target:</span>
                    <span class="value">${subject.needed} more classes</span>
                </div>
                
                <div class="stat-row">
                    <span class="label">Safe to miss:</span>
                    <span class="value">${subject.safe} classes</span>
                </div>
            `;
            
            subjectStats.appendChild(card);
        });
    }

    function renderInsights(stats) {
        // At risk subjects
        riskSubjects.innerHTML = '';
        if (stats.atRiskSubjects.length === 0) {
            riskSubjects.innerHTML = `
                <div class="insight-item">
                    <span>No subjects at risk!</span>
                    <span class="text-success">✓</span>
                </div>
            `;
        } else {
            stats.atRiskSubjects.forEach(subject => {
                const item = document.createElement('div');
                item.className = 'insight-item';
                item.innerHTML = `
                    <span>${subject.name}</span>
                    <span class="text-danger">${subject.percentage}%</span>
                `;
                riskSubjects.appendChild(item);
            });
        }
        
        // Safe to miss
        safeToMiss.innerHTML = '';
        if (stats.safeToMiss.length === 0) {
            safeToMiss.innerHTML = `
                <div class="insight-item">
                    <span>No buffer available</span>
                    <span class="text-warning">⚠</span>
                </div>
            `;
        } else {
            stats.safeToMiss.forEach(subject => {
                const item = document.createElement('div');
                item.className = 'insight-item';
                item.innerHTML = `
                    <span>${subject.name}</span>
                    <span class="text-success">${subject.safe} classes</span>
                `;
                safeToMiss.appendChild(item);
            });
        }
    }

    function renderCharts() {
        const stats = Storage.getStatistics();
        
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
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
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
                    }
                }
            });
        }
        
        // Weekly Pattern Chart
        const weeklyCtx = document.getElementById('weeklyChart');
        if (weeklyCtx) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyData = stats.weeklyPattern;
            
            weeklyChart = new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [
                        {
                            label: 'Attended',
                            data: days.map(day => weeklyData[day.toLowerCase()].attended),
                            backgroundColor: '#10b981',
                            borderRadius: 4
                        },
                        {
                            label: 'Total',
                            data: days.map(day => weeklyData[day.toLowerCase()].total),
                            backgroundColor: '#6366f1',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
    }

    function renderCalendar() {
        const calendar = document.querySelector('.calendar');
        if (!calendar) return;
        
        // Clear previous calendar
        calendar.innerHTML = '';
        
        // Create calendar header
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.innerHTML = `
            <button class="icon-btn" id="prevMonth">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span id="currentMonth">${Utils.getMonthName(currentMonth)} ${currentYear}</span>
            <button class="icon-btn" id="nextMonth">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        calendar.appendChild(header);
        
        // Create calendar grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        
        // Day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day';
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });
        
        // Get first day of month
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = Utils.getDaysInMonth(currentYear, currentMonth);
        
        // Add empty cells for days before first day
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date';
            grid.appendChild(emptyCell);
        }
        
        // Add days of month
        const history = Storage.getHistory();
        const timetable = Storage.getTimetable();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = Utils.formatDate(date);
            const dayName = Utils.getDayName(date).toLowerCase();
            const hasClasses = timetable[dayName] && timetable[dayName].length > 0;
            const isToday = Utils.isToday(date);
            
            const dateCell = document.createElement('div');
            dateCell.className = 'calendar-date';
            if (isToday) dateCell.classList.add('today');
            if (hasClasses) dateCell.classList.add('has-class');
            dateCell.textContent = day;
            dateCell.title = dateStr;
            
            // Check attendance for this day
            const dayHistory = history.find(h => h.date === dateStr);
            if (dayHistory && dayHistory.entries.length > 0) {
                const attended = dayHistory.entries.filter(e => e.status === 'attended').length;
                const total = dayHistory.entries.filter(e => e.status !== 'cancelled').length;
                
                if (total > 0) {
                    const percentage = Math.round((attended / total) * 100);
                    dateCell.style.backgroundColor = percentage >= 75 ? '#d1fae5' : 
                                                    percentage >= 50 ? '#fef3c7' : 
                                                    '#fee2e2';
                }
            }
            
            grid.appendChild(dateCell);
        }
        
        calendar.appendChild(grid);
        
        // Add event listeners for navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
            updateMonthDisplay();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
            updateMonthDisplay();
        });
    }

    function updateMonthDisplay() {
        const currentMonthEl = document.getElementById('currentMonth');
        if (currentMonthEl) {
            currentMonthEl.textContent = `${Utils.getMonthName(currentMonth)} ${currentYear}`;
        }
    }

    function exportStatistics() {
        const stats = Storage.getStatistics();
        const subjects = Storage.getSubjects();
        const timetable = Storage.getTimetable();
        
        // Create CSV content
        let csv = 'Subject,Attended,Total,Percentage,Target,Risk Level\n';
        
        stats.subjectPerformance.forEach(subject => {
            csv += `"${subject.name}",${subject.attended},${subject.total},${subject.percentage}%,${subject.target},${subject.riskLevel}\n`;
        });
        
        csv += '\nWeekly Attendance\nDay,Attended,Total,Percentage\n';
        
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        days.forEach(day => {
            const data = stats.weeklyPattern[day];
            const percentage = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
            csv += `${day.charAt(0).toUpperCase() + day.slice(1)},${data.attended},${data.total},${percentage}%\n`;
        });
        
        csv += `\nOverall Statistics\nTotal Classes,${stats.totalClasses}\nAttended Classes,${stats.attendedClasses}\nOverall Percentage,${stats.overallPercentage}%\n`;
        
        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-stats-${Utils.formatDate()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showToast('Statistics exported as CSV!', 'success');
    }

    function setupEventListeners() {
        // Sort by change
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                loadStatistics();
            });
        }
        
        // Export stats button
        if (exportStatsBtn) {
            exportStatsBtn.addEventListener('click', exportStatistics);
        }
        
        // Backup button
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                const data = Storage.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendance-backup-${Utils.formatDate()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                Utils.showToast('Data backed up successfully!', 'success');
            });
        }
        
        // Restore button
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
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
                                Utils.showToast('Data restored successfully!', 'success');
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
                            } else {
                                Utils.showToast('Restore failed: ' + result.error, 'error');
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
        
        // Clear data button
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
                    const result = Storage.clearAllData();
                    if (result.success) {
                        Utils.showToast('All data has been cleared', 'success');
                        setTimeout(() => {
                            window.location.href = 'setup.html';
                        }, 1000);
                    }
                }
            });
        }
        
        // Previous/Next month buttons
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar();
                updateMonthDisplay();
            });
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
                updateMonthDisplay();
            });
        }
    }
});