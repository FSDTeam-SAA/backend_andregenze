# Barber Slot Booking System

## Overview
This system generates 30-minute time slots for barber appointments based on their opening hours and existing reservations. Only available slots are returned, and slots that are already booked are automatically excluded.

## Features
- ✅ Generates 30-minute slots automatically based on opening hours
- ✅ Filters out booked reservations (confirmed & pending)
- ✅ Supports for next N days (default: 7 days)
- ✅ Validates slots before creating/updating reservations
- ✅ Respects "isClosed" flag for closed days
- ✅ Ignores cancelled reservations when calculating availability

## API Endpoints

### 1. Get Barber with Available Slots
**Endpoint:** `GET /api/user/berber/:id`

**Query Parameters:**
- `days` (optional, default: 7) - Number of days to fetch slots for

**Example Request:**
```bash
GET /api/user/berber/507f1f77bcf86cd799439011?days=14
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Berber fetched",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Barber",
    "shopName": "Premium Cuts",
    "email": "john@barbershop.com",
    "openingHours": [
      {
        "day": "monday",
        "open": "09:00",
        "close": "18:00",
        "isClosed": false
      },
      {
        "day": "sunday",
        "isClosed": true
      }
    ],
    "services": [
      {
        "name": "Haircut",
        "price": 25,
        "description": "Regular haircut"
      }
    ],
    "availableSlots": {
      "2026-02-18": [
        { "time": "09:00", "startMinutes": 540, "endMinutes": 570, "available": true },
        { "time": "09:30", "startMinutes": 570, "endMinutes": 600, "available": true },
        { "time": "10:00", "startMinutes": 600, "endMinutes": 630, "available": true },
        // ... skipped booked slots ...
        { "time": "17:30", "startMinutes": 1050, "endMinutes": 1080, "available": true }
      ],
      "2026-02-19": [
        // slots for next day
      ]
    }
  }
}
```

### 2. Create Reservation
**Endpoint:** `POST /api/user/reservation`

**Request Body:**
```json
{
  "berberId": "507f1f77bcf86cd799439011",
  "serviceName": "Haircut",
  "date": "2026-02-18",
  "time": "09:00"
}
```

**Validation:**
- Slot must exist in available slots
- Slot must not already be booked
- Time must be within opening hours
- Cancelled reservations don't block slots

**Response Success:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Reservation created successfully",
  "data": {
    "_id": "reservation_id",
    "user": { "_id": "user_id", "name": "Customer Name" },
    "berber": { "_id": "berber_id", "name": "John Barber" },
    "serviceName": "Haircut",
    "date": "2026-02-18T00:00:00Z",
    "time": "09:00",
    "status": "pending"
  }
}
```

**Response Error (Slot Not Available):**
```json
{
  "statusCode": 409,
  "success": false,
  "message": "Slot not available or already booked"
}
```

### 3. Update Reservation
**Endpoint:** `PATCH /api/user/reservation/:id`

**Request Body:**
```json
{
  "date": "2026-02-19",
  "time": "10:30"
}
```

**Validation:**
- New slot must be available
- Can't update to same slot that's already booked by others
- Can't update cancelled reservations

## Utility Functions

### Available in `utils/slotService.js`

#### 1. `generateAvailableSlots(barber, date, booked)`
Generates 30-minute slots for a specific date.

```javascript
import { generateAvailableSlots } from "../utils/slotService.js";

const slots = generateAvailableSlots(barber, new Date(), []);
// Returns: [{ time: "09:00", startMinutes: 540, endMinutes: 570, available: true }, ...]
```

#### 2. `getAvailableSlotsForDate(barber, date, Reservation)`
Gets available slots for a date, automatically querying for booked slots.

```javascript
import { getAvailableSlotsForDate } from "../utils/slotService.js";

const slots = await getAvailableSlotsForDate(barber, new Date(), Reservation);
```

#### 3. `getAvailableSlotsForDays(barber, days, Reservation)`
Gets available slots for multiple days.

```javascript
import { getAvailableSlotsForDays } from "../utils/slotService.js";

const slotsByDay = await getAvailableSlotsForDays(barber, 7, Reservation);
// Returns: { "2026-02-18": [...], "2026-02-19": [...], ... }
```

#### 4. `isSlotAvailable(barber, date, time, Reservation)`
Validates if a specific slot is available.

```javascript
import { isSlotAvailable } from "../utils/slotService.js";

const available = await isSlotAvailable(barber, new Date(), "09:00", Reservation);
// Returns: true or false
```

## Opening Hours Format

Opening hours should be stored in the barber profile with the following format:

```javascript
openingHours: [
  {
    day: "monday",        // enum: monday, tuesday, wednesday, thursday, friday, saturday, sunday
    open: "09:00",        // HH:mm format
    close: "18:00",       // HH:mm format
    isClosed: false       // boolean, if true, no slots generated
  },
  {
    day: "sunday",
    isClosed: true        // Closed on Sunday
  }
]
```

## Example Usage in Controller

```javascript
import { getAvailableSlotsForDays } from "../utils/slotService.js";
import { Reservation } from "../model/reservation.model.js";

export const getBerber = catchAsync(async (req, res) => {
  const { id } = req.params;
  const daysToFetch = req.query.days || 7;
  
  const berber = await User.findById(id);
  if (!berber) throw new AppError(httpStatus.NOT_FOUND, "Berber not found");

  let availableSlots = {};
  if (berber.role === "berber" && berber.openingHours?.length > 0) {
    availableSlots = await getAvailableSlotsForDays(
      berber,
      parseInt(daysToFetch),
      Reservation
    );
  }

  const response = berber.toObject ? berber.toObject() : berber;
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Berber fetched",
    data: {
      ...response,
      availableSlots,
    },
  });
});
```

## Database Queries Optimization

The system uses efficient MongoDB queries:
1. **Date Range Filtering:** Uses `$gte` and `$lte` for precise date matching
2. **Status Filtering:** Only counts "pending" and "confirmed" reservations (ignores cancelled)
3. **Indexing:** Uses existing indexes on Reservation model for date and berber fields

## Edge Cases Handled

✅ **Midnight Crossing:** Times that don't cross midnight work correctly
✅ **Closed Days:** Days with `isClosed: true` return empty slot arrays
✅ **Invalid Time Format:** Returns empty slots if time format is invalid
✅ **No Opening Hours:** Returns empty slots if opening hours not configured
✅ **Cancelled Slots:** Cancelled reservations don't block new bookings
✅ **Same-day Bookings:** Supports same-day slot validation

## Time Format Requirements

- **Opening/Closing Times:** Use 24-hour format with colons (HH:mm)
  - Valid: "09:00", "18:30", "23:45"
  - Invalid: "9:00", "18.30", "1800"

- **Reservation Times:** Exactly matches slot times (HH:mm)
  - Valid: "09:00", "09:30", "10:00"
  - Invalid: "9:00", "09:15" (not 30-min increments)

## Testing

### Test Case 1: Get Slots for Open Day
```bash
curl "http://localhost:3000/api/user/berber/507f1f77bcf86cd799439011?days=1"
```

### Test Case 2: Make Reservation
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

### Test Case 3: Try Booking Already Booked Slot
```bash
# Should fail with 409 Conflict if slot already booked
```

## Future Enhancements

- [ ] Support for service duration (different services have different lengths)
- [ ] Break times/lunch hours support
- [ ] Multiple staff members with separate slots
- [ ] Slot buffer time between appointments
- [ ] Timezone support in slot generation
- [ ] Slot blocking by barber (manual availability control)
- [ ] Recurring slots configuration
