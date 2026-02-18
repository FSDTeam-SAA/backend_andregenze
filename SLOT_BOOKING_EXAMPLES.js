/**
 * SLOT BOOKING SYSTEM - USAGE EXAMPLES
 * 
 * This file demonstrates how to use the barber slot booking system
 * in your backend and frontend applications.
 */

// ============================================================================
// FRONTEND/API CLIENT EXAMPLES
// ============================================================================

/**
 * Example 1: Fetch Barber with Available Slots (Next 7 Days)
 */
async function fetchBerberWithSlots(barberId) {
  try {
    const response = await fetch(`/api/user/berber/${barberId}?days=7`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Barber:', data.data.name);
      console.log('Available Slots:', data.data.availableSlots);
      
      // Process slots to display in UI
      Object.entries(data.data.availableSlots).forEach(([date, slots]) => {
        console.log(`\nDate: ${date}`);
        slots.forEach(slot => {
          console.log(`  - ${slot.time} (${slot.startMinutes}-${slot.endMinutes} mins)`);
        });
      });
    }
  } catch (error) {
    console.error('Error fetching barber:', error);
  }
}

/**
 * Example 2: Make a Reservation
 */
async function makeReservation(token, barberId, serviceName, date, time) {
  try {
    const response = await fetch('/api/user/reservation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        berberId: barberId,
        serviceName: serviceName,
        date: date,      // "2026-02-18"
        time: time       // "09:00"
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Reservation created:', data.data);
      alert('Booking confirmed!');
    } else {
      console.error('Booking failed:', data.message);
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error making reservation:', error);
  }
}

/**
 * Example 3: Reschedule Reservation
 */
async function updateReservation(token, reservationId, newDate, newTime) {
  try {
    const response = await fetch(`/api/user/reservation/${reservationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        date: newDate,   // "2026-02-19"
        time: newTime    // "10:30"
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Reservation updated:', data.data);
      alert('Booking rescheduled!');
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Error updating reservation:', error);
  }
}

// ============================================================================
// BACKEND/CONTROLLER EXAMPLES
// ============================================================================

/**
 * Example: Custom Controller to Get Slots for Specific Date
 */
function exampleControllerUsage() {
  const exampleCode = `
import { getAvailableSlotsForDate } from "../utils/slotService.js";
import { Reservation } from "../model/reservation.model.js";
import { User } from "../model/user.model.js";
import catchAsync from "../utils/catchAsync.js";

export const getAvailableSlotsForSpecificDate = catchAsync(async (req, res) => {
  const { barberId, date } = req.query;
  
  const barber = await User.findById(barberId);
  if (!barber) {
    return res.status(404).json({ message: "Barber not found" });
  }
  
  const slots = await getAvailableSlotsForDate(barber, new Date(date), Reservation);
  
  res.json({
    date,
    slots,
    totalAvailable: slots.length
  });
});
  `;
  
  console.log(exampleCode);
}

// ============================================================================
// REACT COMPONENT EXAMPLES
// ============================================================================

/**
 * Example: React Booking Form Component
 */
function ReactBookingFormExample() {
  return `
import React, { useState, useEffect } from 'react';

export function BarberBooking({ barberId, token }) {
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [serviceName, setServiceName] = useState('');

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    const response = await fetch(\`/api/user/berber/\${barberId}?days=7\`);
    const data = await response.json();
    setSlots(data.data.availableSlots || {});
    setLoading(false);
  };

  const handleBooking = async () => {
    const response = await fetch('/api/user/reservation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      },
      body: JSON.stringify({
        berberId: barberId,
        serviceName,
        date: selectedDate,
        time: selectedTime
      })
    });

    if (response.ok) {
      alert('Booking confirmed!');
    } else {
      alert('Booking failed. Please try another slot.');
    }
  };

  if (loading) return <div>Loading available slots...</div>;

  const daysWithSlots = Object.entries(slots).filter(([_, daySlots]) => daySlots.length > 0);

  return (
    <div className="booking-form">
      <h2>Book an Appointment</h2>
      
      <div>
        <label>Service:</label>
        <input 
          type="text" 
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="e.g., Haircut"
        />
      </div>

      <div>
        <label>Date:</label>
        <select 
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedTime(''); // Reset time when date changes
          }}
        >
          <option value="">Select a date</option>
          {daysWithSlots.map(([date, _]) => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </div>

      {selectedDate && slots[selectedDate] && (
        <div>
          <label>Time:</label>
          <div className="time-slots">
            {slots[selectedDate].map(slot => (
              <button
                key={slot.time}
                className={\`slot \${selectedTime === slot.time ? 'selected' : ''}\`}
                onClick={() => setSelectedTime(slot.time)}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={handleBooking}
        disabled={!selectedDate || !selectedTime || !serviceName}
      >
        Book Appointment
      </button>
    </div>
  );
}
  `;
}

// ============================================================================
// UTILITY IMPORTS EXAMPLE
// ============================================================================

/**
 * How to import slot utilities in your code
 */
const importExamples = `
// For generating slots
import { 
  generateAvailableSlots,
  getAvailableSlotsForDate,
  getAvailableSlotsForDays,
  isSlotAvailable
} from "../utils/slotService.js";

// Usage
const slots = generateAvailableSlots(barber, new Date(), []);
const slotsForDate = await getAvailableSlotsForDate(barber, new Date(), Reservation);
const slotsByDay = await getAvailableSlotsForDays(barber, 7, Reservation);
const isAvailable = await isSlotAvailable(barber, new Date(), "09:00", Reservation);
`;

// ============================================================================
// DATA STRUCTURE EXAMPLES
// ============================================================================

const slotDataStructure = {
  date: "2026-02-18",
  slots: [
    {
      time: "09:00",
      startMinutes: 540,      // 9 * 60
      endMinutes: 570,        // 9.5 * 60
      available: true
    },
    {
      time: "09:30",
      startMinutes: 570,
      endMinutes: 600,
      available: true
    },
    {
      time: "10:00",
      startMinutes: 600,
      endMinutes: 630,
      available: true
    }
    // ... more slots ...
  ]
};

const barberWithSlots = {
  _id: "507f1f77bcf86cd799439011",
  name: "John Barber",
  shopName: "Premium Cuts",
  email: "john@barbershop.com",
  phone: "1234567890",
  openingHours: [
    {
      day: "monday",
      open: "09:00",
      close: "18:00",
      isClosed: false
    },
    {
      day: "tuesday",
      open: "09:00",
      close: "18:00",
      isClosed: false
    },
    {
      day: "sunday",
      open: "11:00",
      close: "17:00",
      isClosed: false
    }
  ],
  services: [
    {
      name: "Haircut",
      price: 25,
      description: "Regular haircut"
    },
    {
      name: "Shave",
      price: 15,
      description: "Professional shave"
    },
    {
      name: "Haircut + Shave",
      price: 35,
      description: "Full grooming service"
    }
  ],
  availableSlots: {
    "2026-02-18": [
      { time: "09:00", startMinutes: 540, endMinutes: 570, available: true },
      { time: "09:30", startMinutes: 570, endMinutes: 600, available: true },
      { time: "10:00", startMinutes: 600, endMinutes: 630, available: true },
      { time: "10:30", startMinutes: 630, endMinutes: 660, available: true },
      // ... more slots ...
    ],
    "2026-02-19": [
      // slots for next day
    ]
  }
};

// ============================================================================
// COMMON SCENARIOS
// ============================================================================

const commonScenarios = `
SCENARIO 1: User wants to see available slots for next 7 days
- Frontend calls: GET /api/user/berber/:id?days=7
- Backend retrieves barber and generates slots
- Response includes availableSlots object with 7 days of data

SCENARIO 2: User wants to book a specific slot
- Frontend calls: POST /api/user/reservation
- Backend validates slot availability using isSlotAvailable()
- If available, creates reservation and returns confirmation
- If not available, returns 409 Conflict error

SCENARIO 3: User wants to reschedule their appointment
- Frontend calls: PATCH /api/user/reservation/:id
- Backend validates new slot is available (excluding current reservation)
- Updates reservation with new date/time
- Returns updated reservation data

SCENARIO 4: User views all bookings including slots that are booked
- These appear as "not available" when fetching slots
- Booked slots are excluded from availableSlots array automatically
`;

console.log("Slot Booking System Examples Loaded");
export { 
  fetchBerberWithSlots, 
  makeReservation, 
  updateReservation,
  slotDataStructure,
  barberWithSlots,
  commonScenarios
};
