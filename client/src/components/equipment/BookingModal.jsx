import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Phone, Clock, FileText } from 'lucide-react';
import { CATEGORY_ICONS, STATUS_COLORS } from '../../utils/equipmentConfig';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

function AvailabilityTimeline({ bookings }) {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const totalMs = dayEnd - dayStart;

  const todayBookings = (bookings || []).filter((b) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    return start < dayEnd && end > dayStart;
  });

  return (
    <div className="mt-3">
      <div className="text-[11px] font-medium text-gray-500 mb-1.5">Today's Schedule</div>
      <div className="relative h-6 bg-emerald-50 border border-emerald-200 rounded-md overflow-hidden">
        {/* Time markers */}
        {[6, 12, 18].map((hr) => (
          <div
            key={hr}
            className="absolute top-0 h-full border-l border-gray-200"
            style={{ left: `${(hr / 24) * 100}%` }}
          >
            <span className="absolute -top-4 text-[8px] text-gray-400 -translate-x-1/2">{hr}:00</span>
          </div>
        ))}
        {/* Booked slots */}
        {todayBookings.map((b, i) => {
          const start = Math.max(new Date(b.startTime) - dayStart, 0);
          const end = Math.min(new Date(b.endTime) - dayStart, totalMs);
          const left = (start / totalMs) * 100;
          const width = ((end - start) / totalMs) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 h-full bg-red-400 opacity-60 rounded-sm"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${b.bookedBy}: ${new Date(b.startTime).toLocaleTimeString()} - ${new Date(b.endTime).toLocaleTimeString()}`}
            />
          );
        })}
        {/* Current time indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-600 z-10"
          style={{ left: `${((now - dayStart) / totalMs) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-gray-400 mt-0.5">
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

function ConfettiEffect() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: ['#22c55e', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
            animation: `confettiFall ${1.5 + Math.random() * 1}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function BookingModal({ equipment: equip, onClose, onBooked }) {
  const [form, setForm] = useState({
    bookedBy: '',
    phone: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!equip) return null;

  const icon = CATEGORY_ICONS[equip.category] || '🔧';

  // Calculate duration and price
  let durationHrs = 0;
  let totalPrice = 0;
  if (form.startTime && form.endTime) {
    const start = new Date(form.startTime);
    const end = new Date(form.endTime);
    durationHrs = Math.max(0, (end - start) / 3600000);
    totalPrice = Math.round(durationHrs * equip.pricePerHour);
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const validate = () => {
    if (!form.bookedBy.trim()) return 'Name is required';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!/^[\d+\-\s]{10,15}$/.test(form.phone.replace(/\s/g, ''))) return 'Invalid phone number';
    if (!form.startTime) return 'Start time is required';
    if (!form.endTime) return 'End time is required';
    const start = new Date(form.startTime);
    const end = new Date(form.endTime);
    if (end <= start) return 'End time must be after start time';
    if ((end - start) / 3600000 > 24) return 'Maximum booking duration is 24 hours';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${SERVER_URL}/equipment/${equip.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Booking failed');
        setSubmitting(false);
        return;
      }

      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onBooked && onBooked(data);
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {showConfetti && <ConfettiEffect />}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{equip.name}</h3>
                <p className="text-xs text-gray-500">{equip.category} · ₹{equip.pricePerHour}/hr</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                <User className="w-3.5 h-3.5" /> Your Name
              </label>
              <input
                type="text"
                value={form.bookedBy}
                onChange={handleChange('bookedBy')}
                placeholder="Enter your full name"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+91-98XXX-XXXXX"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Start Time
                </label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={handleChange('startTime')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Clock className="w-3.5 h-3.5" /> End Time
                </label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={handleChange('endTime')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Duration & Price */}
            {durationHrs > 0 && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-sm text-emerald-700">
                  Duration: {durationHrs.toFixed(1)} hours
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  ₹{totalPrice.toLocaleString()}
                </span>
              </div>
            )}

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Purpose
              </label>
              <textarea
                value={form.purpose}
                onChange={handleChange('purpose')}
                placeholder="What will you use this equipment for?"
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            <AvailabilityTimeline bookings={equip.bookings} />

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-xl font-semibold text-white text-sm transition-all ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'
              }`}
            >
              {submitting ? 'Booking...' : `Confirm Booking · ₹${totalPrice > 0 ? totalPrice.toLocaleString() : '—'}`}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
