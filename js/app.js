// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // Check for online/offline status
    window.addEventListener('online', () => {
        Utils.showToast('You are back online!', 'success');
    });

    window.addEventListener('offline', () => {
        Utils.showToast('You are offline. Changes will sync when back online.', 'warning');
    });

    // Setup navigation menu for all pages
    setupNavigationMenu();

    // Initialize app based on current page
    const currentPage = window.location.pathname.split('/').pop();
    
    // Remove loading state if any
    document.body.classList.remove('loading');

    // Set current year in footer if exists
    const currentYear = new Date().getFullYear();
    const yearElements = document.querySelectorAll('.current-year');
    yearElements.forEach(el => {
        el.textContent = currentYear;
    });

    // Add click animation to all buttons
    document.querySelectorAll('.btn, .icon-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.7);
                transform: scale(0);
                animation: ripple 600ms linear;
                width: ${size}px;
                height: ${size}px;
                top: ${y}px;
                left: ${x}px;
                pointer-events: none;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        .btn, .icon-btn {
            position: relative;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);

    // Handle back button in browser
    window.addEventListener('popstate', () => {
        // Smooth transition between pages
        document.body.classList.add('page-transition');
        setTimeout(() => {
            document.body.classList.remove('page-transition');
        }, 300);
    });

    // Add smooth page transitions for internal links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            const target = link.getAttribute('href');
            if (!target.includes('#') && target !== window.location.pathname) {
                e.preventDefault();
                document.body.classList.add('page-transition-out');
                
                setTimeout(() => {
                    window.location.href = target;
                }, 300);
            }
        }
    });

    // Add page transition styles
    const pageTransitionStyle = document.createElement('style');
    pageTransitionStyle.textContent = `
        .page-transition {
            animation: fadeOut 0.3s ease;
        }
        .page-transition-out {
            animation: fadeOut 0.3s ease forwards;
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        body {
            animation: fadeIn 0.3s ease;
        }
    `;
    document.head.appendChild(pageTransitionStyle);

    // Check for first run
    const settings = Storage.getSettings();
    if (settings.firstRun) {
        // Show welcome message
        setTimeout(() => {
            Utils.showToast('Welcome to AttendSwipe! Start by setting up your subjects.', 'success', 5000);
            Storage.updateSetting('firstRun', false);
        }, 1000);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.querySelector('#saveBtn');
            if (saveBtn) saveBtn.click();
        }
        
        // Escape to close modal/menu
        if (e.key === 'Escape') {
            const menu = document.querySelector('.side-menu.active');
            if (menu) {
                menu.classList.remove('active');
                document.querySelector('.menu-overlay').classList.remove('active');
            }
        }
        
        // Arrow keys for navigation
        if (e.key === 'ArrowLeft') {
            const prevBtn = document.querySelector('.btn-prev');
            if (prevBtn && !e.ctrlKey && !e.metaKey) prevBtn.click();
        }
        
        if (e.key === 'ArrowRight') {
            const nextBtn = document.querySelector('.btn-next');
            if (nextBtn && !e.ctrlKey && !e.metaKey) nextBtn.click();
        }
    });

    // Initialize tooltips
    const tooltips = document.querySelectorAll('[title]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const title = e.target.getAttribute('title');
            if (!title) return;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = title;
            document.body.appendChild(tooltip);
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.cssText = `
                position: fixed;
                background: var(--gray-800);
                color: white;
                padding: 0.5rem 0.75rem;
                border-radius: var(--radius-sm);
                font-size: 0.875rem;
                z-index: 9999;
                top: ${rect.bottom + 5}px;
                left: ${rect.left + (rect.width / 2)}px;
                transform: translateX(-50%);
                white-space: nowrap;
                pointer-events: none;
                animation: tooltipFadeIn 0.2s ease;
            `;
            
            e.target.setAttribute('data-original-title', title);
            e.target.removeAttribute('title');
        });
        
        element.addEventListener('mouseleave', (e) => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
            
            const originalTitle = e.target.getAttribute('data-original-title');
            if (originalTitle) {
                e.target.setAttribute('title', originalTitle);
                e.target.removeAttribute('data-original-title');
            }
        });
    });

    // Add tooltip animation style
    const tooltipStyle = document.createElement('style');
    tooltipStyle.textContent = `
        @keyframes tooltipFadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .tooltip::after {
            content: '';
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            border-width: 0 5px 5px 5px;
            border-style: solid;
            border-color: transparent transparent var(--gray-800) transparent;
        }
    `;
    document.head.appendChild(tooltipStyle);

    // Handle responsive behavior
    window.addEventListener('resize', Utils.debounce(() => {
        // Update any responsive elements
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile', isMobile);
        document.body.classList.toggle('desktop', !isMobile);
    }, 250));

    // Initialize responsive classes
    window.dispatchEvent(new Event('resize'));
});

// Navigation Menu Setup Function
function setupNavigationMenu() {
    // Create menu button if it doesn't exist (for pages that don't have it)
    if (!document.getElementById('menuBtn')) {
        const headerLeft = document.querySelector('.header-left');
        if (headerLeft) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'icon-btn menu-btn';
            menuBtn.id = 'menuBtn';
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            headerLeft.prepend(menuBtn);
        }
    }
    
    // Create side menu if it doesn't exist
    if (!document.getElementById('sideMenu')) {
        const sideMenu = document.createElement('div');
        sideMenu.className = 'side-menu';
        sideMenu.id = 'sideMenu';
        sideMenu.innerHTML = `
            <div class="menu-header">
                <h3>Menu</h3>
                <button class="icon-btn close-menu" id="closeMenu">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="menu-items">
                <a href="index.html" class="menu-item">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </a>
                <a href="stats.html" class="menu-item">
                    <i class="fas fa-chart-bar"></i>
                    <span>Statistics</span>
                </a>
                <a href="setup.html" class="menu-item">
                    <i class="fas fa-cog"></i>
                    <span>Setup</span>
                </a>
                <div class="menu-divider"></div>
                <button class="menu-item" id="exportData">
                    <i class="fas fa-download"></i>
                    <span>Export Data</span>
                </button>
                <button class="menu-item" id="importData">
                    <i class="fas fa-upload"></i>
                    <span>Import Data</span>
                </button>
                <button class="menu-item" id="resetData">
                    <i class="fas fa-trash"></i>
                    <span>Reset Data</span>
                </button>
            </div>
            <div class="menu-footer">
                <div class="app-version">AttendSwipe v1.0</div>
                <div class="storage-info">
                    <i class="fas fa-database"></i>
                    <span id="storageUsage">0% used</span>
                </div>
            </div>
        `;
        
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'menu-overlay';
        menuOverlay.id = 'menuOverlay';
        
        document.body.appendChild(sideMenu);
        document.body.appendChild(menuOverlay);
    }
    
    // Setup menu toggle
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (menuBtn && sideMenu && menuOverlay) {
        menuBtn.addEventListener('click', () => {
            sideMenu.classList.add('active');
            menuOverlay.classList.add('active');
        });
        
        if (closeMenu) {
            closeMenu.addEventListener('click', () => {
                sideMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        menuOverlay.addEventListener('click', () => {
            sideMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
        });
    }
    
    // Setup menu actions
    setupMenuActions();
}

// Setup menu actions
function setupMenuActions() {
    // Export data
    const exportData = document.getElementById('exportData');
    if (exportData) {
        exportData.addEventListener('click', () => {
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
            
            Utils.showToast('Data exported successfully!', 'success');
        });
    }
    
    // Import data
    const importData = document.getElementById('importData');
    if (importData) {
        importData.addEventListener('click', () => {
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
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
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
    
    // Reset data
    const resetData = document.getElementById('resetData');
    if (resetData) {
        resetData.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
                const result = Storage.clearAllData();
                if (result.success) {
                    Utils.showToast('All data has been reset', 'success');
                    setTimeout(() => {
                        window.location.href = 'setup.html';
                    }, 1000);
                }
            }
        });
    }
    
    // Update storage usage
    updateStorageUsage();
}

// Update storage usage display
function updateStorageUsage() {
    const storageInfo = Utils.calculateStorageUsage();
    const storageUsage = document.getElementById('storageUsage');
    if (storageUsage) {
        storageUsage.textContent = `${storageInfo.percentage}% used`;
    }
}