# 🎯 Barber Slot Booking System - QUICK START GUIDE

## ✅ What's Been Implemented

Your barber slot booking system is now fully integrated! Here's what you have:

### 📁 New Files Created
1. **[utils/slotService.js](utils/slotService.js)** - Core slot generation logic
2. **[SLOT_BOOKING_SYSTEM.md](SLOT_BOOKING_SYSTEM.md)** - Complete API documentation
3. **[SLOT_SYSTEM_ARCHITECTURE.md](SLOT_SYSTEM_ARCHITECTURE.md)** - System architecture & diagrams
4. **[SLOT_BOOKING_EXAMPLES.js](SLOT_BOOKING_EXAMPLES.js)** - Code examples for frontend & backend

### 🔧 Updated Files
1. **[controller/user.controller.js](controller/user.controller.js)**
   - ✅ `getBerber()` - Now returns availableSlots
   - ✅ `createReservation()` - Uses slot validation
   - ✅ `updateReservation()` - Uses slot validation

---

## 🚀 Quick Start - 3 Steps

### Step 1: Get Available Slots
```bash
curl "http://localhost:3000/api/user/berber/507f1f77bcf86cd799439011?days=7"
```

**Response includes:**
```json
{
  "data": {
    "name": "John Barber",
    "openingHours": [...],
    "availableSlots": {
      "2026-02-18": [
        { "time": "09:00", "available": true },
        { "time": "09:30", "available": true },
        { "time": "10:00", "available": true }
      ]
    }
  }
}
```

### Step 2: Make a Booking
```bash
curl -X POST http://localhost:3000/api/user/reservation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "berberId": "507f1f77bcf86cd799439011",
    "serviceName": "Haircut",
    "date": "2026-02-18",
    "time": "09:00"
  }'
```

### Step 3: Reschedule if Needed
```bash
curl -X PATCH http://localhost:3000/api/user/reservation/RESERVATION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date": "2026-02-19",
    "time": "10:30"
  }'
```

---

## 🎯 Key Features

### ✨ Automatic Slot Generation
- **30-minute slots** generated automatically based on opening hours
- **Skips closed days** (isClosed: true)
- **Respects opening hours** (open time → close time)

### 🛡️ Smart Validation
- **Conflict detection**: Can't book already reserved slots
- **Status filtering**: Only blocks "pending" and "confirmed" (cancellations don't block)
- **Real-time availability**: Queries database each time to ensure accuracy

### 📅 Flexible Date Support
- Query parameter `?days=7` (default: 7 days)
- Can request 1-30+ days of slots
- YYYY-MM-DD format for dates

### 🔄 Automatic Slot Blocking
When a reservation is created:
- ✅ Time slot is locked
- ✅ Other users can't book same slot
- ✅ Can still reschedule to different time
- ✅ Cancelling opens the slot again

---

## 📊 Data Structure

**Barber Opening Hours (in User Model):**
```javascript
openingHours: [
  {
    day: "monday",        // enum: [monday-sunday]
    open: "09:00",        // HH:mm format
    close: "18:00",       // HH:mm format
    isClosed: false       // boolean
  },
  {
    day: "sunday",
    isClosed: true        // Shop closed on Sunday
  }
]
```

**Available Slot Returned:**
```javascript
{
  time: "09:00",
  startMinutes: 540,      // for internal calculations
  endMinutes: 570,        // for internal calculations
  available: true         // always true in availableSlots array
}
```

---

## 🧑‍💻 Using in Your Code

### Backend Controller Usage
```javascript
import { getAvailableSlotsForDays } from "../utils/slotService.js";

// In your controller
const slots = await getAvailableSlotsForDays(barber, 7, Reservation);
// Returns: { "2026-02-18": [...], "2026-02-19": [...], ... }
```

### Frontend (React) Example
```javascript
// Fetch barber and slots
const response = await fetch(`/api/user/berber/${barberId}?days=7`);
const { data } = await response.json();

// Display slots for selected date
const dateSlots = data.availableSlots["2026-02-18"];
dateSlots.forEach(slot => {
  console.log(`Available: ${slot.time}`);
});
```

---

## ⚠️ Important Notes

### Time Format
- ✅ **Correct:** "09:00", "14:30", "18:00"
- ❌ **Wrong:** "9:00", "9.30", "1800"

### Slot Duration
- Fixed at **30 minutes** per slot
- 09:00-09:30, 09:30-10:00, 10:00-10:30, etc.

### Reservation Status Handling
- **pending** → Blocks slot ✓
- **confirmed** → Blocks slot ✓
- **cancelled** → Doesn't block ✗
- **completed** → Doesn't block ✗

---

## 🔍 Testing Checklist

- [ ] Fetch barber returns availableSlots
- [ ] Can book an available slot
- [ ] Cannot book already booked slot (409 error)
- [ ] Can reschedule to different slot
- [ ] Cannot reschedule to occupied slot
- [ ] Cancelled reservations free up slots
- [ ] Closed days return empty slots
- [ ] Invalid time format handled gracefully

---

## 📖 Complete Documentation

For detailed information, see:
- **API Reference:** [SLOT_BOOKING_SYSTEM.md](SLOT_BOOKING_SYSTEM.md)
- **Architecture:** [SLOT_SYSTEM_ARCHITECTURE.md](SLOT_SYSTEM_ARCHITECTURE.md)
- **Code Examples:** [SLOT_BOOKING_EXAMPLES.js](SLOT_BOOKING_EXAMPLES.js)

---

## 🎓 Example: Full Frontend Integration

```javascript
function BarberBookingPage({ barberId }) {
  const [barber, setBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    // Fetch barber with slots
    fetch(`/api/user/berber/${barberId}?days=7`)
      .then(r => r.json())
      .then(data => setBarber(data.data));
  }, []);

  const handleBooking = async () => {
    const response = await fetch('/api/user/reservation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        berberId: barberId,
        serviceName: 'Haircut',
        date: selectedDate,
        time: selectedTime
      })
    });
    
    if (response.ok) {
      alert('Booking confirmed!');
    } else {
      alert('Slot no longer available');
    }
  };

  return (
    <div>
      <h2>{barber?.shopName}</h2>
      
      <select onChange={(e) => setSelectedDate(e.target.value)}>
        <option>Select Date</option>
        {barber?.availableSlots && 
          Object.keys(barber.availableSlots).map(date => (
            <option key={date} value={date}>{date}</option>
          ))
        }
      </select>

      {selectedDate && (
        <div>
          {barber?.availableSlots[selectedDate]?.map(slot => (
            <button
              key={slot.time}
              onClick={() => setSelectedTime(slot.time)}
              className={selectedTime === slot.time ? 'selected' : ''}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}

      <button 
        onClick={handleBooking}
        disabled={!selectedDate || !selectedTime}
      >
        Book Now
      </button>
    </div>
  );
}
```

---

## 🚨 Troubleshooting

**Q: No slots showing for a barber?**
- A: Check if `openingHours` is configured in the barber's profile
- A: Verify `isClosed` is not true for that day

**Q: Getting "Slot not available" error?**
- A: The slot might be already booked
- A: Fetch fresh slots to verify availability

**Q: Time format issues?**
- A: Ensure times are in HH:mm format (24-hour)
- A: Check that times are 30-minute increments

**Q: Database performance slow?**
- A: Create MongoDB indexes (see SLOT_SYSTEM_ARCHITECTURE.md)
- A: Limit days parameter if fetching many days

---

## ✅ Implementation Complete

Your system is ready to use! The slot booking now works as follows:

```
User Opens App
    ↓
Fetch Barber + Available Slots (GET /api/user/berber/:id?days=7)
    ↓
Display Calendar with Available Times
    ↓
User Selects Date & Time
    ↓
Book Appointment (POST /api/user/reservation)
    ↓
System Validates Slot Available
    ↓
Confirmation Email/Notification Sent
    ↓
Slot Marked as Booked
```

Happy booking! 🎉
