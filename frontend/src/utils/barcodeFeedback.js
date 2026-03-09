/**
 * Barcode Feedback Utilities
 * 
 * Provides audio and visual feedback for barcode scanning events
 * - Success beep
 * - Error double beep
 * - Toast notifications
 */

/**
 * Play audio feedback for scan results
 */
export function playBarcodeSound(type = 'success') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
      // Single beep: 1000Hz for 100ms
      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'error') {
      // Double beep: 600Hz twice with gap
      oscillator.frequency.value = 600;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      // Second beep
      oscillator.start(audioContext.currentTime + 0.15);
      oscillator.stop(audioContext.currentTime + 0.25);
    } else if (type === 'warning') {
      // Warning: descending tone
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (e) {
    console.debug('Audio feedback not available:', e.message);
  }
}

/**
 * Show visual toast notification
 */
export function showNotification(message, type = 'success', duration = 3000) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg text-white font-semibold shadow-lg z-50 animate-slideIn ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500'
  }`;
  
  toast.textContent = message;
  document.body.appendChild(toast);

  // Add animation
  toast.style.animation = 'slideInRight 0.3s ease-out';

  // Remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}

/**
 * Flash element on scan
 */
export function flashElement(element, duration = 200) {
  if (!element) return;
  
  const originalBg = element.style.backgroundColor;
  element.style.backgroundColor = '#d4edda'; // Light green
  
  setTimeout(() => {
    element.style.backgroundColor = originalBg;
  }, duration);
}

export default {
  playBarcodeSound,
  showNotification,
  flashElement
};
