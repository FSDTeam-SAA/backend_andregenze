/**
 * Generates available 30-minute slots for a barber
 * @param {Object} barber - User object with openingHours and reservations
 * @param {Date} date - Date to generate slots for
 * @param {Array} booked - Array of booked reservations
 * @returns {Array} Array of available time slots
 */
export const generateAvailableSlots = (barber, date, booked = []) => {
  const dayName = new Date(date)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  // Find opening hours for this day
  const dayHours = barber.openingHours?.find(
    (oh) => oh.day.toLowerCase() === dayName
  );

  if (!dayHours || dayHours.isClosed) {
    return [];
  }

  const slots = [];
  const slotDuration = 30; // minutes

  // Parse times (assuming format HH:mm)
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };

  const openMinutes = parseTime(dayHours.open);
  const closeMinutes = parseTime(dayHours.close);

  if (openMinutes === null || closeMinutes === null) {
    return [];
  }

  // Create booked times set for quick lookup
  const bookedTimes = new Set(
    booked.map((b) => {
      const dateStr = new Date(b.date).toDateString();
      const currentDateStr = new Date(date).toDateString();
      if (dateStr === currentDateStr) {
        return b.time;
      }
      return null;
    })
  );

  // Generate slots
  for (let minutes = openMinutes; minutes < closeMinutes; minutes += slotDuration) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

    if (!bookedTimes.has(timeStr)) {
      slots.push({
        time: timeStr,
        startMinutes: minutes,
        endMinutes: minutes + slotDuration,
        available: true,
      });
    }
  }

  return slots;
};

/**
 * Gets available slots with booking information
 * @param {Object} barber - User object
 * @param {Date} date - Date for slots
 * @param {Model} Reservation - Reservation model for query
 * @returns {Promise<Array>} Available slots
 */
export const getAvailableSlotsForDate = async (barber, date, Reservation) => {
  // Get all reservations for this barber on this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const booked = await Reservation.find({
    berber: barber._id,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["pending", "confirmed"] }, // Don't count cancelled
  });

  return generateAvailableSlots(barber, date, booked);
};

/**
 * Generates slots for multiple dates (next N days)
 * @param {Object} barber - User object
 * @param {Number} days - Number of days to generate slots for
 * @param {Model} Reservation - Reservation model
 * @returns {Promise<Object>} Object with dates as keys and available slots as values
 */
export const getAvailableSlotsForDays = async (barber, days = 7, Reservation) => {
  const result = {};
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    result[dateKey] = await getAvailableSlotsForDate(barber, date, Reservation);
  }

  return result;
};

/**
 * Validates if a requested slot is available
 * @param {Object} barber - User object
 * @param {Date} date - Date for slot
 * @param {String} time - Time in HH:mm format
 * @param {Model} Reservation - Reservation model
 * @returns {Promise<Boolean>} True if slot is available
 */
export const isSlotAvailable = async (barber, date, time, Reservation) => {
  // Check if slot is within opening hours
  const dayName = new Date(date)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const dayHours = barber.openingHours?.find(
    (oh) => oh.day.toLowerCase() === dayName
  );

  if (!dayHours || dayHours.isClosed) {
    return false;
  }

  // Check if already booked
  const existing = await Reservation.findOne({
    berber: barber._id,
    date: {
      $gte: new Date(date).setHours(0, 0, 0, 0),
      $lt: new Date(date).setHours(23, 59, 59, 999),
    },
    time,
    status: { $in: ["pending", "confirmed"] },
  });

  return !existing;
};
