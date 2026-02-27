import('axios').then(async (axios) => {
    try {
        const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
        const startAddr = "India Gate, New Delhi";
        const destAddr = "Red Fort, New Delhi";
        
        const res = await axios.default.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(startAddr)}&destination=${encodeURIComponent(destAddr)}&mode=driving&alternatives=true&key=${GOOGLE_MAPS_API_KEY}`);
        
        console.log("Status:", res.data.status);
        console.log("Error Message:", res.data.error_message);
        if (res.data.routes) {
            console.log("Routes found:", res.data.routes.length);
        }
    } catch(err) {
        console.error("Request Failed", err.message);
    }
});
