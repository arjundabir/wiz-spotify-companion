var express = require("express");
const querystring = require("querystring");
const axios = require("axios");
const { access } = require("fs");
const schedule = require("node-schedule");
const getColors = require("get-image-colors");
var cors = require("cors");
const cookieParser = require("cookie-parser");

var app = express();
const PORT = 4000;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = "http://localhost:4000/callback";
const URL = "https://api.spotify.com/v1";
let refresh = null;
let hsl = [];

app.use(cors());
app.use(cookieParser());

function generateRandomString(length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function getImageColors(image) {
  try {
    const colors = await getColors(image);
    hsl = [];
    colors.map((color) => {
      hsl.push(color.hsl());
    });
    return hsl;
  } catch (error) {
    console.log(error);
    res.redirect("/error");
  }
}

async function authLights(colArray) {
  const options = {
    method: "post",
    url: "http://localhost:8581/api/auth/login",
    data: new URLSearchParams({
      username: "arjundabir",
      password: "AG*Ey#L.bXca2*D",
    }).toString(),
  };
  try {
    const response = await axios(options);
    const { access_token } = response.data;
    changeLights(colArray, access_token);
    console.log("success");
  } catch (error) {
    console.log(error);
  }
}

async function changeLights(colArray, access_token) {
  const index = 3;
  const h = colArray[index][0] == NaN ? 0 : Math.trunc(colArray[0][0]);
  const s = Math.trunc(colArray[index][1] * 100);
  const l = Math.trunc(colArray[index][2] * 100);
  const uniqueIds = [process.env.UUID1, process.env.UUID2];
  const modes = [
    { mode: "Hue", value: h },
    { mode: "Saturation", value: s },
    { mode: "Brightness", value: l },
  ];
  uniqueIds.map((uniqueId) =>
    modes.map(async (mode) => {
      console.log(mode.mode + mode.value);
      const options = {
        method: "PUT",
        url: "http://localhost:8581/api/accessories/" + uniqueId,
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer " + access_token,
        },
        data: {
          characteristicType: mode.mode,
          value: mode.value,
        },
      };
      try {
        const response = await axios(options);
      } catch (error) {
        console.log(error);
      }
    })
  );
  //
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  const scope =
    "user-read-currently-playing user-read-playback-state user-read-email";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", async function (req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;

  if (state === null) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    var authOptions = {
      method: "post",
      url: "https://accounts.spotify.com/api/token",
      data: new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      }).toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    };
    try {
      const response = await axios(authOptions);
      const { access_token, refresh_token } = response.data;
      refresh = refresh_token;
      res.redirect(`/setcookie?access_token=${access_token}`);
    } catch (error) {
      console.log(error);
      res.redirect("/error");
    }
  }
});

app.get("/setcookie", (req, res) => {
  const { access_token } = req.query;
  res.cookie("access_token", access_token, { maxAge: 3600000 });
  res.redirect("http://localhost:3000/song");
});

app.get("/deletecookie", function (req, res) {
  res.clearCookie("access_token");
  res.send("cookie foo cleared");
});

app.get("/api/currentsong", async (req, res) => {
  const { access_token } = req.query;
  const player = {
    method: "GET",
    url: URL + "/me/player",
    headers: {
      Authorization: "Bearer " + access_token,
    },
  };

  try {
    const response = await axios(player);
    if (response.data != "") {
      const image = response.data.item.album.images[0].url;
      const songName = response.data.item.name;
      let artists = [];
      response.data.item.artists.map((artist) => {
        artists.push(artist.name);
      });

      const colors = await getImageColors(image);
      const returnVal = {
        image: image,
        colors: colors,
        artists: artists,
        song: songName,
      };
      authLights(colors);
      res.json(returnVal);
    } else {
      res.redirect("/error");
    }
  } catch (error) {
    console.log(error);
    res.redirect("/error");
  }
});

app.get("/refresh_token", async (req, res) => {
  const { refresh_token } = req.query;
  const refreshOptions = {
    method: "POST",
    url: "https://accounts.spotify.com/api/token",
    data: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
      client_id: client_id,
    }).toString(),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
  };
  try {
    const response = await axios(refreshOptions);
    const { access_token } = response.data;
    res.redirect(
      `/api/currentsong?access_token=${access_token}&refresh_token=${refresh_token}`
    );
  } catch (error) {
    console.log(error);
    res.redirect("/error");
  }
});

app.get("/error", (req, res) => {
  res.send("error");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
