import React, { useState, useEffect } from 'react';
import { useDevices } from './hooks/useDevices';
import { useEquipment } from './hooks/useEquipment';
import { useUserLocation } from './hooks/useUserLocation';
import { injectStyles } from './utils/injectStyles';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import EquipmentPanel from './components/equipment/EquipmentPanel';
import BookingModal from './components/equipment/BookingModal';
import EquipmentDetailDrawer from './components/equipment/EquipmentDetailDrawer';

export default function App() {
  const { devices, loading: devLoading, error: devError, connected } = useDevices();
  const { equipment, stats, loading: equipLoading, error: equipError, refetch } = useEquipment();
  const { userLat, userLng } = useUserLocation();

  const [focusedDevice, setFocusedDevice] = useState(null);
  const [activeTab, setActiveTab] = useState('tracking');
  const [showEquipment, setShowEquipment] = useState(false);
  const [bookingEquipment, setBookingEquipment] = useState(null);
  const [detailEquipment, setDetailEquipment] = useState(null);
  const [flyToEquipment, setFlyToEquipment] = useState(null);

  useEffect(() => {
    injectStyles();
  }, []);

  // Auto-show equipment layer when on equipment tab
  useEffect(() => {
    setShowEquipment(activeTab === 'equipment');
  }, [activeTab]);

  const handleViewOnMap = (equip) => {
    setFlyToEquipment(equip);
    // Reset after fly animation
    setTimeout(() => setFlyToEquipment(null), 2000);
  };

  const handleBookNow = (equip) => {
    setBookingEquipment(equip);
  };

  const handleViewDetails = (equip) => {
    setDetailEquipment(equip);
  };

  const handleBooked = () => {
    refetch();
    setBookingEquipment(null);
  };

  // Show loading only during initial connection
  const isInitialLoad = devLoading && equipLoading;

  if (isInitialLoad) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Connecting to server…</span>
        </div>
      </div>
    );
  }

  // Only show error if BOTH hooks failed
  if (devError && equipError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-1">Failed to connect</p>
          <p className="text-sm text-gray-400">{devError}</p>
          <p className="text-xs text-gray-400 mt-2">Make sure the server is running on port 4000</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-gray-900 font-sans overflow-hidden">
      <Navbar connected={connected} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex overflow-hidden">
        <MapView
          devices={devices}
          focusedDevice={focusedDevice}
          setFocusedDevice={setFocusedDevice}
          equipment={equipment}
          showEquipment={showEquipment}
          userLat={userLat}
          userLng={userLng}
          onBookFromMap={handleBookNow}
          flyToEquipment={flyToEquipment}
        />
        {activeTab === 'tracking' ? (
          <Sidebar
            devices={devices}
            focusedDevice={focusedDevice}
            setFocusedDevice={setFocusedDevice}
          />
        ) : (
          <EquipmentPanel
            equipment={equipment}
            stats={stats}
            loading={equipLoading}
            userLat={userLat}
            userLng={userLng}
            onViewOnMap={handleViewOnMap}
            onBookNow={handleBookNow}
            onViewDetails={handleViewDetails}
            onRefresh={refetch}
          />
        )}
      </main>

      {/* Booking Modal */}
      {bookingEquipment && (
        <BookingModal
          equipment={bookingEquipment}
          onClose={() => setBookingEquipment(null)}
          onBooked={handleBooked}
        />
      )}

      {/* Detail Drawer */}
      {detailEquipment && (
        <EquipmentDetailDrawer
          equipment={detailEquipment}
          onClose={() => setDetailEquipment(null)}
          onBook={handleBookNow}
          userLat={userLat}
          userLng={userLng}
        />
      )}
    </div>
  );
}
