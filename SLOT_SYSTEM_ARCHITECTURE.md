# Slot Booking System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT/FRONTEND                              │
│  (React, Vue, Flutter, or any other client)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
        Query: GET /api/user/berber/:id?days=7
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Controllers (user.controller.js)                       │   │
│  │                                                         │   │
│  │  getBerber()                                            │   │
│  │  ├─ Fetch User from DB                                │   │
│  │  ├─ Check if role = "berber"                         │   │
│  │  └─ Call getAvailableSlotsForDays()                   │   │
│  │                                                         │   │
│  │  createReservation()                                    │   │
│  │  ├─ Validate input (berberId, serviceName, date, time)│   │
│  │  ├─ Call isSlotAvailable()                            │   │
│  │  ├─ If available → Create Reservation                 │   │
│  │  └─ If not → Return 409 Conflict error                │   │
│  └────────────┬─────────────────────────────────┬────────┘   │
│               │                                 │              │
│               ↓                                 ↓              │
│  ┌──────────────────────────┐    ┌──────────────────────────┐ │
│  │ Slot Service Utils       │    │ Models & DB             │ │
│  │ (slotService.js)         │    │                          │ │
│  │                          │    │ - User (openingHours)    │ │
│  │ Functions:               │    │ - Reservation (booked)   │ │
│  │ - generateSlots()        │    │                          │ │
│  │ - getAvailableSlots      │    │ MongoDB Queries:         │ │
│  │   ForDate()              │    │ - User.findById()        │ │
│  │ - getAvailableSlots      │    │ - Reservation.find()     │ │
│  │   ForDays()              │    │                          │ │
│  │ - isSlotAvailable()      │    │                          │ │
│  └──────────┬───────────────┘    └────────────┬─────────────┘ │
│             │                                  │                │
│             └──────────────┬───────────────────┘                │
│                            ↓                                    │
│             ┌──────────────────────────────┐                   │
│             │ Slot Generation Algorithm    │                   │
│             │                              │                   │
│             │ 1. Get day name from date   │                   │
│             │ 2. Find openingHours for day│                   │
│             │ 3. Parse open & close times │                   │
│             │ 4. Generate 30-min slots    │                   │
│             │ 5. Query booked slots       │                   │
│             │ 6. Filter out booked slots  │                   │
│             │ 7. Return available slots   │                   │
│             └──────────────┬───────────────┘                   │
│                            │                                    │
│                            ↓                                    │
│             ┌──────────────────────────────┐                   │
│             │ Response Processing          │                   │
│             │                              │                   │
│             │ - Serialize Barber data      │                   │
│             │ - Add availableSlots field   │                   │
│             │ - Format JSON response       │                   │
│             └──────────────┬───────────────┘                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
     Response: { barber data + availableSlots }
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT/FRONTEND                              │
│  Display slots to user in calendar/dropdown                    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Step 1: Fetch Barber with Slots
```
Client: GET /api/user/berber/507f77bcf86cd799439011?days=7

Server:
  1. Find User with ID: 507f77bcf86cd799439011
  2. Check role === "berber" ✓
  3. Check openingHours configured ✓
  4. For each of 7 days:
     - Get day name (Monday, Tuesday, etc.)
     - Get opening hours for that day
     - Generate slots from open time to close time
     - Query Reservation collection for booked slots
     - Exclude booked slots from available slots
  5. Build response with availableSlots

Response: 
{
  data: {
    _id: "507f77bcf86cd799439011",
    name: "John Barber",
    openingHours: [...],
    availableSlots: {
      "2026-02-18": [
        { time: "09:00", available: true },
        { time: "09:30", available: true },
        // booked slot 10:00 is skipped
        { time: "10:30", available: true },
        ...
      ],
      "2026-02-19": [...],
      ...
    }
  }
}
```

### Step 2: User Selects a Slot and Books
```
Client: POST /api/user/reservation
{
  "berberId": "507f77bcf86cd799439011",
  "serviceName": "Haircut",
  "date": "2026-02-18",
  "time": "09:00"
}

Server:
  1. Validate all fields present
  2. Find Barber by ID
  3. Call isSlotAvailable():
     - Get opening hours for that day
     - Check if time is within hours
     - Query if already booked
  4. If available:
     - Create Reservation document
     - Return 201 Created
  5. If not available:
     - Return 409 Conflict

Response: 201 Created
{
  data: {
    _id: "reservation_id",
    berber: "507f77bcf86cd799439011",
    user: "user_id",
    serviceName: "Haircut",
    date: "2026-02-18",
    time: "09:00",
    status: "pending"
  }
}
```

### Step 3: User Tries to Book Same Slot (Should Fail)
```
Client: POST /api/user/reservation
{
  "berberId": "507f77bcf86cd799439011",
  "serviceName": "Shave",
  "date": "2026-02-18",
  "time": "09:00"  // Same time
}

Server:
  1. isSlotAvailable() returns false
  2. Throw error: "Slot not available or already booked"

Response: 409 Conflict
{
  message: "Slot not available or already booked"
}
```

## Slot Generation Algorithm

```javascript
Algorithm: Generate30MinSlots(barber, date)
  Input: barber object, target date
  Output: array of available time slots

  1. day ← dayNameFromDate(date)  // "monday", "tuesday", etc.
  
  2. dayHours ← findInArray(barber.openingHours, 
                            hour.day == day)
  
  3. IF dayHours.isClosed OR dayHours not found
       RETURN empty array
  
  4. openMinutes ← parseTime(dayHours.open)   // "09:00" → 540
  
  5. closeMinutes ← parseTime(dayHours.close) // "18:00" → 1080
  
  6. bookedSlots ← queryDatabase(
       Reservation.find({
         berber: barber._id,
         date: date,
         status: ["pending", "confirmed"]  // Skip cancelled
       })
     )
  
  7. FOR each 30-minute slot from openMinutes to closeMinutes
       slot = {
         time: formatTime(currentMinutes),
         startMinutes: currentMinutes,
         endMinutes: currentMinutes + 30,
         available: true
       }
       
       IF slot.time NOT IN bookedSlots
         ADD slot to availableSlots
  
  8. RETURN availableSlots
```

## Time Format Transformations

```
Input: "09:00" (HH:mm)
  1. Parse: hours=9, minutes=0
  2. Convert to minutes: (9 * 60) + 0 = 540 minutes
  3. Generate slots: 540, 570, 600, 630, ... until close time
  4. Convert back: 540 → "09:00", 570 → "09:30", 600 → "10:00"

Example for 09:00 to 18:00:
  09:00 → 540 minutes
  09:30 → 570 minutes
  10:00 → 600 minutes
  10:30 → 630 minutes
  ...
  17:30 → 1050 minutes
  (18:00 would be 1080, but slots end at 1050)
```

## Error Handling Flow

```
                    Request to Book Slot
                            ↓
                   ┌─────────────────┐
                   │ Validate Input  │
                   └────────┬────────┘
                            ↓
                   Is berberId valid?
                   /             \
                  NO             YES
                  ↓               ↓
              404 Error     Check opening hours
                           /             \
                         NO             YES
                         ↓               ↓
                    Empty slots    Is slot available?
                                    /             \
                                  NO             YES
                                  ↓               ↓
                            409 Conflict    Create Reservation
                            (Already          ↓
                             booked)      201 Created
```

## Database Indexes

Recommended MongoDB indexes for optimal performance:

```javascript
// In Reservation model, ensure these indexes exist:
db.reservations.createIndex({ berber: 1, date: 1, time: 1 });
db.reservations.createIndex({ berber: 1, status: 1 });
db.reservations.createIndex({ user: 1 });

// In User model (usually already exists):
db.users.createIndex({ role: 1 });
db.users.createIndex({ "address.location": "2dsphere" });
```

## Performance Considerations

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Generate slots for 1 day | O(n) | n = slots in day (~32 for 09-18) |
| Generate slots for 7 days | O(7n) | ~224 slots total |
| Query booked slots | O(1) with index | Index on (berber, date, time) |
| Check available slot | O(1) | Single document lookup |
| Create reservation | O(1) | Simple insert |

## State Management for Each Reservation

```
┌─────────────────────────────────────────────────────────┐
│              RESERVATION STATES                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  pending ──→ confirmed ──→ completed                   │
│       ↖                                                │
│        ─ cancelled                                     │
│                                                         │
│  Timeline:                                             │
│  ├─ pending: Just booked, awaits confirmation          │
│  ├─ confirmed: Barber/system confirmed the booking    │
│  ├─ completed: Appointment finished                    │
│  └─ cancelled: Either user or barber cancelled         │
│                                                         │
│  Slot Blocking:                                        │
│  ├─ pending: Blocks slot ✓                             │
│  ├─ confirmed: Blocks slot ✓                           │
│  ├─ cancelled: Does NOT block slot ✗                   │
│  └─ completed: Does NOT block slot ✗                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Future Implementation Ideas

1. **Service Duration**: Different services take different lengths
   - Haircut: 30 min
   - Full grooming: 60 min
   - Adjust slot blocking based on service

2. **Multiple Barbers**: Share opening hours or have individual hours

3. **Buffer Time**: Time between appointments for setup
   - Auto-block 15 minutes after appointment

4. **Recurring Slots**: Configure weekly/monthly recurring availability

5. **Timezone Support**: Handle slots across timezones

6. **Smart Availability**: ML-based predictions for best times
