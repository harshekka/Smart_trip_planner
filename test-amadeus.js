import axios from 'axios';

const API_KEY = "tG248ACn6Lqi7suJYh7iTmToDyEnVDYB";
const API_SECRET = "B38BwBBOI0gH4KUV";

async function run() {
    try {
        const tokenRes = await axios.post(
            'https://test.api.amadeus.com/v1/security/oauth2/token',
            new URLSearchParams({ grant_type: 'client_credentials', client_id: API_KEY, client_secret: API_SECRET }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const token = tokenRes.data.access_token;

        // Search Hotels by geocode (NYC)
        const lat = 40.7128;
        const lng = -74.0060;
        const hotelsRes = await axios.get(
            `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode?latitude=${lat}&longitude=${lng}&radius=5&radiusUnit=KM&ratings=3,4,5`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const hotels = hotelsRes.data.data.slice(0, 10);
        console.log("Checking offers for", hotels.length, "hotels in NYC...");

        for (let h of hotels) {
            try {
                const url = `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${h.hotelId}&adults=1`;
                const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
                if (res.data?.data?.length > 0) {
                    console.log(`[SUCCESS] ${h.name} (${h.hotelId}): ${res.data.data[0].offers[0].price.total} ${res.data.data[0].offers[0].price.currency}`);
                } else {
                    console.log(`[EMPTY] ${h.name} (${h.hotelId})`);
                }
            } catch (e) {
                console.log(`[NO ROOMS] ${h.name} (${h.hotelId})`);
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
