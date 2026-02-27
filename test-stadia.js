const axios = require('axios');
const STADIA_API_KEY = "534bce13-9580-4c5b-9b4f-856e32935bd5";
const routePayload = {
    locations: [
        { lat: 28.6129, lon: 77.2295 }, // India Gate
        { lat: 28.6562, lon: 77.2410 }  // Red Fort
    ],
    costing: "pedestrian",
    alternates: 2
};

axios.post(`https://api.stadiamaps.com/route/v1?api_key=${STADIA_API_KEY}`, routePayload)
    .then(res => console.log("Success!"))
    .catch(err => {
        console.error("Error status:", err.response?.status);
        console.error("Error data:", err.response?.data);
    });
