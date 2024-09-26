import { sequelize } from '../config/db.js';

export const search = async (req, res) => {
    const { destination, checkin_date, checkout_date, room_no, adultno = 1, child_no = 0 } = req.body;

    console.log('adultno:', adultno, 'child_no:', child_no);

    // Validate required fields
    if (!destination || !checkin_date || !checkout_date) {
        return res.status(400).json({ message: 'Destination, check-in date, and check-out date are required.' });
    }

    // Helper function to format date using JavaScript's Date object
    const formatDate = (dateStr) => {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
    };

    // Set default values and format the input dates
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

    try {
        let response = [];

        // Fetch hotels based on destination
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

        // Fetch all available rooms for the hotels
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

        // Fetch all booked rooms for the given date range
        const bookedRooms = await sequelize.query(
            'SELECT room_id, booked_for FROM booked_rooms WHERE room_id IN (:roomIds) AND booked_for IN (:allDates)',
            {
                replacements: { roomIds: rooms.map(room => room.id), allDates },
                type: sequelize.QueryTypes.SELECT
            }
        );

        // Map booked rooms for fast lookup
        const bookedRoomMap = bookedRooms.reduce((map, { room_id, booked_for }) => {
            if (!map.has(room_id)) {
                map.set(room_id, new Set());
            }
            map.get(room_id).add(booked_for);
            return map;
        }, new Map());

        // Function to calculate minimum rooms needed
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
                const roomsNeeded = calculateMinRoomsNeeded(availableRooms, adultno, child_no);
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

                    const maxAdults = availableRooms.reduce((sum, room) => sum + room.total_adult, 0);
                    const maxChildren = availableRooms.reduce((sum, room) => sum + room.total_child, 0);

                    if (maxAdults >= adultno && maxChildren >= child_no) {
                        console.log(`Hotel ID: ${hotel.id}, Hotel Name: ${hotel.name}, Total Available Rooms: ${availableRooms.length}, Can Accommodate: Max Adults: ${maxAdults}, Max Children: ${maxChildren}`);

                        acc.push({
                            ...hotel,
                            availableRooms: groupedRooms
                        });

                        // Push to response
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
            }

            return acc;
        }, []);

        if (availableHotels.length > 0) {
            console.log('Available hotels:', availableHotels);
            res.status(200).json({
                message: 'success',
                data: { response }
            });
        } else {
            res.status(200).json({ message: 'No available hotels found for the given criteria.' });
        }
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Hotel details after search 
export const getHotelDetails = async (req, res) => {
    const { hotel_id } = req.params;

    try {
        // Fetch the hotel details
        const hotelDetails = await sequelize.query(
            `SELECT hotels.*, hotel_infos.bannerimg AS image, hotel_infos.description
             FROM hotels 
             LEFT JOIN hotel_infos ON hotels.id = hotel_infos.hotel_id 
             WHERE hotels.id = :hotel_id`,
            {
                replacements: { hotel_id },
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!hotelDetails.length) {
            return res.status(404).json({ message: 'Hotel not found' });
        }

        // Fetch room details for the hotel (without grouping by room type)
        const rooms = await sequelize.query(
            `SELECT 
                rooms.*,
                room_types.name AS room_type,
                room_types.total_adult,
                room_types.total_child,
                room_types.fare AS price,
                GROUP_CONCAT(DISTINCT room_type_images.image) AS images
            FROM rooms
            LEFT JOIN room_types ON rooms.room_type_id = room_types.id
            LEFT JOIN room_type_images ON rooms.room_type_id = room_type_images.room_type_id
            WHERE rooms.hotel_id = :hotel_id AND rooms.status = "1"
            GROUP BY rooms.id`,
            {
                replacements: { hotel_id },
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (!rooms.length) {
            return res.status(404).json({ message: 'No rooms available for this hotel' });
        }

        // Group room types and count the number of rooms per type
        const groupedRooms = rooms.reduce((acc, room) => {
            // Extract the first image from the GROUP_CONCAT result
            const image = room.images?.split(',')[0] || null;

            if (!acc[room.room_type]) {
                acc[room.room_type] = {
                    room_type: room.room_type,
                    total_adult: room.total_adult,
                    total_child: room.total_child,
                    price: room.price,
                    image, // Assign one image per room type
                    rooms: [],
                    room_count: 0 // Initialize room count
                };
            }

            // Add each room individually to the corresponding room type
            acc[room.room_type].rooms.push({
                id: room.id,
                room_no: room.room_number
            });

            // Increment the room count for this room type
            acc[room.room_type].room_count++;

            return acc;
        }, {});

        // Prepare the response data
        const response = {
            hotel: hotelDetails[0],
            rooms: groupedRooms
        };

        res.status(200).json({
            message: 'success',
            data: response
        });
    } catch (error) {
        console.error('Error fetching hotel details:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};