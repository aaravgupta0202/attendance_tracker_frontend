// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    // Initialize PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Check for first run
    const settings = JSON.parse(localStorage.getItem('attendo_settings') || '{}');
    if (settings.firstRun !== false) {
        // Show welcome message on first run
        setTimeout(() => {
            Utils.showToast('Welcome to Attendo! Start by setting up your subjects.', 'info', 5000);
            settings.firstRun = false;
            localStorage.setItem('attendo_settings', JSON.stringify(settings));
        }, 1000);
    }
    
    // Add ripple effect to buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn, .action-btn, .nav-btn, .icon-btn')) {
            const btn = e.target;
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                top: ${y}px;
                left: ${x}px;
                pointer-events: none;
            `;
            
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        }
    });
    
    // Add ripple animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Handle online/offline status
    window.addEventListener('online', () => {
        Utils.showToast('You are back online!', 'success');
    });
    
    window.addEventListener('offline', () => {
        Utils.showToast('You are offline. Changes will sync when back online.', 'warning');
    });
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const saveBtn = document.querySelector('#saveSetupBtn, #saveBtn');
            if (saveBtn) saveBtn.click();
        }
        
        // Escape to close menu
        if (e.key === 'Escape') {
            const menu = document.querySelector('.side-menu.active');
            if (menu) {
                menu.classList.remove('active');
                document.querySelector('.menu-overlay')?.classList.remove('active');
            }
        }
    });
});