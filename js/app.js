// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful');
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// PWA Install Prompt
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('App installed');
        }
        deferredPrompt = null;
        installBtn.classList.add('hidden');
    }
});

// Network Status Management
class NetworkManager {
    constructor() {
        this.offlineNotice = document.getElementById('offlineNotice');
        this.networkToggle = document.getElementById('networkToggle');
        this.initializeNetworkListeners();
        this.updateNetworkToggle();
    }

    initializeNetworkListeners() {
        window.addEventListener('online', () => {
            this.handleOnline();
            this.updateNetworkToggle();
        });
        
        window.addEventListener('offline', () => {
            this.handleOffline();
            this.updateNetworkToggle();
        });
        
        // Network toggle button click handler
        this.networkToggle.addEventListener('click', () => {
            if (navigator.onLine) {
                this.showNotification({
                    title: 'Test Offline Mode',
                    message: 'Switch to offline mode in browser settings or disable network',
                    icon: 'info-circle',
                    type: 'info'
                });
            } else {
                location.reload(); // Try to reconnect
            }
        });

        // Check initial status
        if (!navigator.onLine) {
            this.handleOffline();
        }
    }

    updateNetworkToggle() {
        const status = navigator.onLine ? 'online' : 'offline';
        this.networkToggle.setAttribute('data-status', status);
        this.networkToggle.querySelector('.network-status-text').textContent = 
            status === 'online' ? 'Online Mode' : 'Offline Mode';
    }

    handleOnline() {
        // Show online notification
        this.showNotification({
            title: "You're Back Online",
            message: "All features are now available",
            icon: 'wifi',
            type: 'success'
        });

        // Hide offline notice with animation
        this.offlineNotice.classList.add('hidden');

        // Sync any stored offline data
        this.syncOfflineData();
    }

    handleOffline() {
        // Show offline notice
        this.offlineNotice.classList.remove('hidden');

        // Show offline notification
        this.showNotification({
            title: "You're Offline",
            message: "Some features may be limited",
            icon: 'wifi-slash',
            type: 'error'
        });
    }

    showNotification({ title, message, icon, type }) {
        const notification = document.createElement('div');
        notification.className = `status-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        document.body.appendChild(notification);

        // Add show animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async syncOfflineData() {
        try {
            // Sync stored photos
            const storedPhotos = JSON.parse(localStorage.getItem('photos') || '[]');
            if (storedPhotos.length > 0) {
                this.showNotification({
                    title: 'Syncing Data',
                    message: `Syncing ${storedPhotos.length} photos...`,
                    icon: 'sync',
                    type: 'info'
                });
                // Add your sync logic here
            }

            // Sync stored locations
            const storedLocations = JSON.parse(localStorage.getItem('locations') || '[]');
            if (storedLocations.length > 0) {
                this.showNotification({
                    title: 'Syncing Data',
                    message: `Syncing ${storedLocations.length} locations...`,
                    icon: 'sync',
                    type: 'info'
                });
                // Add your sync logic here
            }
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }
}

// Initialize Network Manager
const networkManager = new NetworkManager();

// Network Mode Management
class NetworkModeManager {
    constructor() {
        this.modeButton = document.querySelector('.online-mode');
        this.offlineNotice = document.getElementById('offlineNotice');
        this.isManualOffline = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Online/Offline mode button click handler
        this.modeButton.addEventListener('click', () => {
            this.isManualOffline = !this.isManualOffline;
            this.updateNetworkStatus();
        });

        // Listen for actual network changes
        window.addEventListener('online', () => {
            if (!this.isManualOffline) {
                this.updateNetworkStatus();
            }
        });
        
        window.addEventListener('offline', () => {
            this.updateNetworkStatus();
        });

        // Initial status check
        this.updateNetworkStatus();
    }

    updateNetworkStatus() {
        const isOnline = !this.isManualOffline && navigator.onLine;
        
        // Update button appearance
        this.modeButton.classList.toggle('offline', !isOnline);
        this.modeButton.innerHTML = isOnline ? 
            '<i class="fas fa-wifi"></i>' :
            '<i class="fas fa-wifi-slash"></i>';
        this.modeButton.title = isOnline ? 'Switch to Offline Mode' : 'Switch to Online Mode';
        
        // Update offline notice
        this.offlineNotice.classList.toggle('hidden', isOnline);
        
        // Show notification
        this.showNotification({
            title: isOnline ? 'Online Mode' : 'Offline Mode',
            message: isOnline ? 
                'All features are now available' : 
                'Limited features available in offline mode',
            type: isOnline ? 'success' : 'warning'
        });

        // Update Service Worker
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: isOnline ? 'ENABLE_NETWORK' : 'DISABLE_NETWORK'
            });
        }
    }

    showNotification({ title, message, type }) {
        const notification = document.createElement('div');
        notification.className = `network-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <div class="notification-progress"></div>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remove after animation
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize Network Mode Manager
const networkModeManager = new NetworkModeManager();

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetView = button.dataset.view;
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        views.forEach(view => view.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(targetView).classList.add('active');
    });
});

// Permission Management
class PermissionManager {
    constructor() {
        this.permissions = {
            location: false,
            camera: false,
            notification: false
        };

        this.initializeButtons();
    }

    initializeButtons() {
        // Location Permission
        const locationBtn = document.getElementById('locationPermission');
        locationBtn.addEventListener('click', async () => {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                if (result.state === 'granted' || await this.requestLocationPermission()) {
                    this.handlePermissionGranted(locationBtn, 'location');
                }
            } catch (error) {
                console.error('Location permission error:', error);
            }
        });

        // Camera Permission
        const cameraBtn = document.getElementById('cameraPermission');
        cameraBtn.addEventListener('click', async () => {
            try {
                const result = await navigator.mediaDevices.getUserMedia({ video: true });
                result.getTracks().forEach(track => track.stop()); // Stop camera after permission
                this.handlePermissionGranted(cameraBtn, 'camera');
            } catch (error) {
                console.error('Camera permission error:', error);
            }
        });

        // Notification Permission
        const notificationBtn = document.getElementById('notificationPermission');
        notificationBtn.addEventListener('click', async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.handlePermissionGranted(notificationBtn, 'notification');
                }
            } catch (error) {
                console.error('Notification permission error:', error);
            }
        });

        // Start App Button
        this.startAppBtn = document.getElementById('startApp');
        this.startAppBtn.addEventListener('click', () => {
            document.getElementById('permissionView').classList.remove('active');
            document.getElementById('weatherView').classList.add('active');
            // Initialize other features
            this.initializeApp();
        });
    }

    async requestLocationPermission() {
        try {
            await navigator.geolocation.getCurrentPosition(() => {});
            return true;
        } catch {
            return false;
        }
    }

    handlePermissionGranted(button, permission) {
        this.permissions[permission] = true;
        button.innerHTML = '<i class="fas fa-check"></i> Permission Granted';
        button.classList.add('granted');
        
        // Show success notification
        this.showNotification('Permission granted successfully!', 'success');

        // Check if all permissions are granted
        if (Object.values(this.permissions).every(p => p)) {
            this.startAppBtn.classList.remove('hidden');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    initializeApp() {
        // Initialize weather service
        const weatherService = new WeatherService();
        weatherService.getCurrentWeather();

        // Initialize camera service
        const cameraService = new CameraService();

        // Initialize location service
        const locationService = new LocationService();
        locationService.startTracking();
    }
}

// Initialize Permission Manager
const permissionManager = new PermissionManager();

// Weather API
class WeatherService {
    constructor() {
        this.weatherInfo = document.getElementById('weatherInfo');
    }

    async getWeather(lat, lon) {
        // Mock weather data
        return {
            name: "Your Location",
            main: {
                temp: 22,
                humidity: 65
            },
            weather: [{
                description: "Partly cloudy"
            }],
            wind: {
                speed: 5.2
            }
        };
    }

    updateWeatherUI(data) {
        this.weatherInfo.innerHTML = `
            <div class="weather-details">
                <h3>${data.name}</h3>
                <p class="temperature">${Math.round(data.main.temp)}°C</p>
                <p class="description">${data.weather[0].description}</p>
                <p class="humidity">Humidity: ${data.main.humidity}%</p>
                <p class="wind">Wind: ${data.wind.speed} m/s</p>
            </div>
        `;
    }
}

// Camera Service
class CameraService {
    constructor() {
        this.video = document.getElementById('camera');
        this.canvas = document.getElementById('photoCanvas');
        this.captureBtn = document.getElementById('captureBtn');
        this.photoGallery = document.getElementById('photoGallery');
        this.stream = null;
        this.isInitialized = false;

        // Add event listeners
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.view === 'cameraView') {
                    this.initializeCamera();
                } else {
                    this.stopCamera();
                }
            });
        });

        this.captureBtn.addEventListener('click', () => this.takePhoto());
    }

    async initializeCamera() {
        if (this.isInitialized) return;
        
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            this.video.srcObject = this.stream;
            this.isInitialized = true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Could not access camera');
        }
    }

    takePhoto() {
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        const photoUrl = this.canvas.toDataURL('image/jpeg');
        this.addPhotoToGallery(photoUrl);
        this.savePhoto(photoUrl);
    }

    addPhotoToGallery(photoUrl) {
        const img = document.createElement('img');
        img.src = photoUrl;
        img.style.width = '100%';
        img.style.borderRadius = '4px';
        
        const photoContainer = document.createElement('div');
        photoContainer.appendChild(img);
        this.photoGallery.insertBefore(photoContainer, this.photoGallery.firstChild);
    }

    savePhoto(photoUrl) {
        // Save to IndexedDB or local storage
        const photos = JSON.parse(localStorage.getItem('photos') || '[]');
        photos.unshift(photoUrl);
        localStorage.setItem('photos', JSON.stringify(photos));
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Location Service
class LocationService {
    constructor() {
        this.locationHistory = document.getElementById('locationHistory');
        this.watchId = null;
        this.init();
    }

    init() {
        // Create location header
        const locationView = document.getElementById('locationView');
        const header = document.createElement('div');
        header.className = 'location-header';
        header.innerHTML = `
            <h2>Location History</h2>
            <p>Track and view your location history with real-time updates</p>
        `;
        locationView.insertBefore(header, locationView.firstChild);

        // Check for existing locations
        this.checkExistingLocations();
    }

    checkExistingLocations() {
        const locations = JSON.parse(localStorage.getItem('locations') || '[]');
        if (locations.length === 0) {
            this.showEmptyState();
        } else {
            locations.forEach(location => this.updateLocationUI(location));
        }
    }

    showEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-location';
        emptyState.innerHTML = `
            <div class="empty-location-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <h3>No Location History</h3>
            <p>Start tracking your location to see your movement history</p>
            <button class="start-tracking-btn" id="startTracking">
                <i class="fas fa-play"></i>
                Start Tracking
            </button>
        `;
        this.locationHistory.appendChild(emptyState);

        // Add event listener to start tracking button
        document.getElementById('startTracking').addEventListener('click', () => {
            this.startTracking();
            emptyState.remove();
        });
    }

    async getCurrentPosition() {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            return position;
        } catch (error) {
            console.error('Error getting location:', error);
            throw error;
        }
    }

    startTracking() {
        if ('geolocation' in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => this.handleNewPosition(position),
                (error) => this.handleError(error),
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        }
    }

    handleNewPosition(position) {
        const { latitude, longitude, accuracy } = position.coords;
        const locationData = {
            lat: latitude,
            lon: longitude,
            accuracy: accuracy,
            timestamp: new Date().toLocaleString()
        };

        this.saveLocation(locationData);
        this.updateLocationUI(locationData);
    }

    handleError(error) {
        console.error('Error tracking location:', error);
        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = `Location error: ${error.message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    saveLocation(locationData) {
        const locations = JSON.parse(localStorage.getItem('locations') || '[]');
        locations.unshift(locationData);
        localStorage.setItem('locations', JSON.stringify(locations.slice(0, 50))); // Keep last 50 locations
    }

    updateLocationUI(locationData) {
        const locationElement = document.createElement('div');
        locationElement.className = 'location-item';
        locationElement.innerHTML = `
            <div class="location-icon">
                <i class="fas fa-map-marker-alt"></i>
            </div>
            <div class="location-details">
                <div class="location-coordinates">
                    ${locationData.lat.toFixed(6)}, ${locationData.lon.toFixed(6)}
                </div>
                <div class="location-timestamp">
                    <i class="fas fa-clock"></i> ${locationData.timestamp}
                </div>
                ${locationData.accuracy ? `
                <div class="location-accuracy">
                    <i class="fas fa-bullseye"></i> Accuracy: ${locationData.accuracy.toFixed(2)}m
                </div>
                ` : ''}
            </div>
            <div class="location-actions">
                <button class="location-action-btn" title="View on Map">
                    <i class="fas fa-map"></i>
                </button>
                <button class="location-action-btn" title="Share Location">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        `;

        // Add click handlers for action buttons
        const [mapBtn, shareBtn] = locationElement.querySelectorAll('.location-action-btn');
        
        mapBtn.addEventListener('click', () => {
            window.open(`https://www.google.com/maps?q=${locationData.lat},${locationData.lon}`);
        });

        shareBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'My Location',
                    text: `Check out my location: ${locationData.lat}, ${locationData.lon}`,
                    url: `https://www.google.com/maps?q=${locationData.lat},${locationData.lon}`
                });
            }
        });

        this.locationHistory.insertBefore(locationElement, this.locationHistory.firstChild);
    }

    stopTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }
}

// Initialize Services
const weatherService = new WeatherService();
const cameraService = new CameraService();
const locationService = new LocationService();

// Initialize app when weather view is active
document.getElementById('refreshWeather').addEventListener('click', async () => {
    try {
        const position = await locationService.getCurrentPosition();
        const weatherData = await weatherService.getWeather(
            position.coords.latitude,
            position.coords.longitude
        );
        weatherService.updateWeatherUI(weatherData);
    } catch (error) {
        console.error('Error updating weather:', error);
    }
});

// Handle camera view activation/deactivation
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (button.dataset.view === 'cameraView') {
            cameraService.initializeCamera();
        } else {
            cameraService.stopCamera();
        }
    });
});
