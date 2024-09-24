import { sequelize } from '../config/db.js';

export const search = async (req, res) => {
    const { destination, checkin_date, checkout_date, room_no, adultno, child_no } = req.body;

    // Validate required fields
    if (!destination || !checkin_date || !checkout_date) {
        return res.status(400).json({ message: 'Destination, check-in date, and check-out date are required.' });
    }

    // Set default values for adults and children
    const totalAdults = adultno || 1;
    const totalChildren = child_no || 0;

    try {
        let response = [];

        // Helper function to format date
        const formatDate = (dateStr) => {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month}-${day}`;
        };

        const formattedCheckinDate = formatDate(checkin_date);
        const formattedCheckoutDate = formatDate(checkout_date);

        // Helper function to get all dates between check-in and check-out
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
            `SELECT hotels.*, hotel_infos.bannerimg as image 
             FROM hotels 
             LEFT JOIN hotel_infos ON hotels.id = hotel_infos.hotel_id 
             WHERE hotels.address LIKE :destination AND hotels.id != "9" 
             GROUP BY hotels.id`,
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
            `SELECT 
                rooms.*,
                room_types.total_adult,
                room_types.total_child,
                room_type_images.image,
                room_types.fare AS price
            FROM rooms
            LEFT JOIN room_types ON rooms.room_type_id = room_types.id
            LEFT JOIN room_type_images ON rooms.room_type_id = room_type_images.room_type_id
            WHERE rooms.hotel_id IN (:hotelIds) AND rooms.status = "1"`,
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
        const bookedRoomMap = bookedRooms.reduce((map, { room_id, booked_for }) => {
            if (!map.has(room_id)) {
                map.set(room_id, new Set());
            }
            map.get(room_id).add(booked_for);
            return map;
        }, new Map());

        // Helper function to calculate the number of rooms needed
        const calculateMinRoomsNeeded = (rooms, adults, children) => {
            rooms.sort((a, b) => (b.total_adult + b.total_child) - (a.total_adult + a.total_child));

            let roomsNeeded = 0;
            let remainingAdults = adults;
            let remainingChildren = children;

            for (const room of rooms) {
                if (remainingAdults <= 0 && remainingChildren <= 0) break;

                const adultsToFit = Math.min(room.total_adult, remainingAdults);
                const childrenToFit = Math.min(room.total_child, remainingChildren);

                remainingAdults -= adultsToFit;
                remainingChildren -= childrenToFit;

                if (adultsToFit > 0 || childrenToFit > 0) {
                    roomsNeeded++;
                }
            }

            return remainingAdults > 0 || remainingChildren > 0 ? Infinity : roomsNeeded;
        };

        // Filter available rooms for each hotel and calculate the minimum number of rooms needed
        const availableHotels = hotels.reduce((acc, hotel) => {
            const hotelRooms = rooms.filter(room => room.hotel_id === hotel.id);
            const availableRooms = hotelRooms.filter(room => {
                const bookedDates = bookedRoomMap.get(room.id) || new Set();
                return allDates.every(date => !bookedDates.has(date));
            });

            if (availableRooms.length) {
                const roomsNeeded = calculateMinRoomsNeeded(availableRooms, totalAdults, totalChildren);
                const finalRoomsNeeded = room_no || roomsNeeded;

                if (availableRooms.length >= finalRoomsNeeded) {
                    const roomsByType = availableRooms.reduce((acc, room) => {
                        if (!acc.has(room.room_type_id)) {
                            acc.set(room.room_type_id, []);
                        }
                        acc.get(room.room_type_id).push(room);
                        return acc;
                    }, new Map());

                    const minPrice = Math.min(...availableRooms.map(room => room.price));
                    const maxPrice = Math.max(...availableRooms.map(room => room.price));
                    const groupedRooms = Object.fromEntries(roomsByType);

                    console.log(`Hotel ID: ${hotel.id}, Hotel Name: ${hotel.name}, Total Available Rooms: ${availableRooms.length}`);

                    acc.push({
                        ...hotel,
                        availableRooms: groupedRooms
                    });

                    // Also push in response
                    response.push({
                        hotel_id: hotel.id,
                        hotel_name: hotel.name,
                        image: hotel.id === 23 
                            ? "https://sanabeachresort.bookurstay.in/assets/images/hotelImage/" + hotel.image 
                            : hotel.image,
                        total_available_rooms: availableRooms.length,
                        min_price: minPrice,
                        max_price: maxPrice,
                        available_rooms: groupedRooms
                    });
                    
                }
            }

            return acc;
        }, []);

        if (availableHotels.length > 0) {
            console.log('Available hotels:', availableHotels);
            res.status(200).json({
                message: 'success',
                data: { response ,/*  availableHotels */ }
            });
        } else {
            res.status(200).json({ message: 'No available hotels found for the given criteria.' });
        }
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
