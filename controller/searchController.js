import { sequelize } from '../config/db.js';

export const search = async (req, res) => {
    const { destination, checkin_date, checkout_date, room_no, adultno, child_no } = req.body;

    if (!destination || !checkin_date || !checkout_date) {
        return res.status(400).json({ message: 'Destination, check-in date, and check-out date are required.' });
    }

    try {
        // Helper function to format date
        const formatDate = (dateStr) => {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month}-${day}`;
        };

        const formattedCheckinDate = formatDate(checkin_date);
        const formattedCheckoutDate = formatDate(checkout_date);

        // Get all dates between check-in and check-out
        const getDatesBetween = (startDate, endDate) => {
            const dates = [];
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                dates.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return dates;
        };

        const startDate = new Date(formattedCheckinDate);
        const endDate = new Date(formattedCheckoutDate);
        const allDates = getDatesBetween(startDate, endDate);

        // Fetch hotels based on the destination
        const hotels = await sequelize.query(
            'SELECT * FROM `hotels` WHERE address LIKE :destination AND id != "9"',
            {
                replacements: { destination: `%${destination}%` },
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!hotels.length) {
            return res.status(200).json({ message: 'No hotels found for the given destination.' });
        }

        const hotelIds = hotels.map(hotel => hotel.id);

        // Fetch all available rooms for the hotels in a single query
        const rooms = await sequelize.query(
            'SELECT * FROM rooms WHERE hotel_id IN (:hotelIds) AND status = "1"',
            {
                replacements: { hotelIds },
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!rooms.length) {
            return res.status(200).json({ message: 'No available rooms found for the given hotels.' });
        }

        // Fetch all booked rooms for the given date range in a single query
        const bookedRooms = await sequelize.query(
            'SELECT room_id, booked_for FROM booked_rooms WHERE room_id IN (:roomIds) AND booked_for IN (:allDates)',
            {
                replacements: { roomIds: rooms.map(room => room.id), allDates },
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Create a map for easy lookup of booked rooms
        const bookedRoomMap = new Map();
        bookedRooms.forEach(({ room_id, booked_for }) => {
            if (!bookedRoomMap.has(room_id)) {
                bookedRoomMap.set(room_id, new Set());
            }
            bookedRoomMap.get(room_id).add(booked_for);
        });

        // Filter available rooms for each hotel
        const availableHotels = hotels.reduce((acc, hotel) => {
            const hotelRooms = rooms.filter(room => room.hotel_id === hotel.id);
            const availableRooms = hotelRooms.filter(room => {
                const bookedDates = bookedRoomMap.get(room.id) || new Set();
                return allDates.every(date => !bookedDates.has(date));
            });

            if (availableRooms.length && (!room_no || availableRooms.length >= room_no)) {
                // Group rooms by room_type_id using a Map for better performance
                const roomsByType = availableRooms.reduce((acc, room) => {
                    if (!acc.has(room.room_type_id)) {
                        acc.set(room.room_type_id, []);
                    }
                    acc.get(room.room_type_id).push(room);
                    return acc;
                }, new Map());

                // Convert roomsByType Map back to an object
                const groupedRooms = Object.fromEntries(roomsByType);

                console.log(`Hotel ID: ${hotel.id}, Hotel Name: ${hotel.name}, Total Available Rooms: ${availableRooms.length}`);

                acc.push({
                    ...hotel,
                    availableRooms: groupedRooms
                });
            }

            return acc;
        }, []);

        res.status(200).json({
            message: 'success',
            data: {
                availableHotels
            }
        });
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
