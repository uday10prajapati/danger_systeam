import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * BarcodeScanner Component
 * 
 * Captures barcode input from scanner (behaves like keyboard)
 * - Listens for Enter key to confirm scan
 * - Auto-focuses on component mount
 * - Clears input after successful scan
 * - Provides visual/audio feedback
 */
export default function BarcodeScanner({ 
  companyId, 
  onScanSuccess, 
  onScanError, 
  autoFocus = true,
  placeholder = 'Scan barcode or enter item code...',
  className = ''
}) {
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Ensure input stays focused when needed
  useEffect(() => {
    const handleWindowFocus = () => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [autoFocus]);

  /**
   * Handle barcode input change
   * Allows manual entry or scanner input
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setBarcode(value);
  };

  /**
   * Process barcode scan on Enter key
   */
  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await processScan(barcode.trim());
    }
  };

  /**
   * Process the barcode scan
   * - Prevent duplicate scans within 500ms
   * - Fetch item from API
   * - Trigger callback
   */
  const processScan = async (scannedCode) => {
    if (!scannedCode) {
      handleScanError('Empty barcode');
      return;
    }

    // Prevent duplicate rapid scans (scanner sends Enter twice sometimes)
    if (scannedCode === lastScannedBarcode) {
      const timeSinceLastScan = Date.now() - lastScanTime;
      if (timeSinceLastScan < 500) {
        // Duplicate scan, ignore
        setBarcode('');
        inputRef.current?.focus();
        return;
      }
    }

    setIsScanning(true);
    setLastScannedBarcode(scannedCode);
    setLastScanTime(Date.now());

    try {
      // Fetch item by barcode from API
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/items/barcode/${encodeURIComponent(scannedCode)}`,
        {
          headers: { 'x-company-id': companyId, 'x-user-id': 1 }
        }
      );

      if (response.data.success) {
        const item = response.data.data;

        // Success feedback
        handleScanSuccess(item);
        
        // Clear input for next scan
        setBarcode('');
        inputRef.current?.focus();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Barcode not found';
      handleScanError(errorMessage);
      
      // Clear input for next attempt
      setBarcode('');
      inputRef.current?.focus();
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Handle successful scan
   */
  const handleScanSuccess = (item) => {
    // Play beep sound (success)
    playSound('success');

    // Trigger parent callback
    if (onScanSuccess) {
      onScanSuccess(item);
    }
  };

  /**
   * Handle scan error
   */
  const handleScanError = (errorMessage) => {
    // Play error sound
    playSound('error');

    // Log error
    console.warn('Barcode scan error:', errorMessage);

    // Trigger parent callback
    if (onScanError) {
      onScanError(errorMessage);
    }
  };

  /**
   * Play audio feedback
   * success: beep sound
   * error: double beep sound
   */
  const playSound = (type = 'success') => {
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
        // Double beep: 600Hz twice
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime + 0.15);
        oscillator.stop(audioContext.currentTime + 0.25);
      }
    } catch (e) {
      // Audio context not available in some environments
      console.debug('Audio feedback not available');
    }
  };

  return (
    <div className={`barcode-scanner ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={barcode}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isScanning}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 transition"
        style={{
          fontSize: '16px', // Prevent iOS zoom on focus
          height: '44px' // Touch-friendly size
        }}
        aria-label="Barcode Scanner Input"
      />
      {isScanning && (
        <div className="text-xs text-gray-500 mt-1">Scanning...</div>
      )}
    </div>
  );
}
