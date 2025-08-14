require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const scoreMoodMap = {
    1: "depressed",
    2: "very sad",
    3: "sad",
    4: "melancholy",
    5: "calm",
    6: "neutral",
    7: "happy",
    8: "excited",
    9: "energetic",
    10: "ecstatic"
};

function getMoodKeyword(score) {
    if (score < 1) score = 1;
    if (score > 10) score = 10;
    return scoreMoodMap[score];
}

async function getSpotify() {
    const auth = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });

    const data = await res.json();
    return data.access_token;
}


app.post("/suggest", async (req, res) => {
    try {
        // console.log("body", req.body);
        const { mood } = req.body;
        const moodKey = getMoodKeyword(mood);
        // console.log(`User mood is: ${moodKey}`);
        const token = await getSpotify();
        if (!token) {
            console.log("Token err");
            return res.json({ mood: moodKey })
        }

        if (!mood) {
            return res.status(400).json({ error: "invalid emoji err" });
        }
        const extraWords = ["hits", "playlist", "mix", "favorites"];
        const randomWord = extraWords[Math.floor(Math.random() * extraWords.length)];
        const query = encodeURIComponent(`best ${moodKey} ${randomWord}`);

        // console.log(query);
        const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;

        const searchRes = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await searchRes.json();

        if (!data.tracks || !data.tracks.items) {
            return res.json({ mood: moodKey, songs: [] });
        }

        const tracks = data.tracks.items.map(track => ({
            title: track.name,
            artist: track.artists[0].name,
            url: track.external_urls.spotify
        }));


        res.json({ mood: moodKey, song: tracks });
    } catch (err) {
        console.error("OpenAI Error:", err);
        res.status(500).json({ error: "AI request failed" });
    }
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
