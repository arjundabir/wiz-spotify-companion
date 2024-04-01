import React, { useState, useEffect } from "react";
import axios from "axios";

const Song = () => {
  const [form, setState] = useState({
    image: "",
    colors: [
      [0, 0, 100],
      [0, 0, 100],
      [0, 0, 100],
      [0, 0, 100],
      [0, 0, 100],
    ],
    artists: [],
    song: "Song Name",
  });
  const getCurrentSong = async () => {
    var access_token = document.cookie.split("=")[1];
    const response = await axios.get(
      `http://localhost:4000/api/currentsong?access_token=${access_token}`
    );
    const { image, colors, artists, song } = response.data;
    setState({ image, colors, artists, song });
  };

  useEffect(() => {
    getCurrentSong();
  });

  return (
    <>
      <div
        className="bg-white w-dvw h-dvh absolute opacity-75"
        style={{
          backgroundImage: `linear-gradient(45deg, white, hsl(${
            form.colors[3][0]
          }, ${form.colors[3][1] * 100}%, ${form.colors[3][2] * 100}%)`,
        }}
      ></div>
      <div className="w-dvw h-dvh flex justify-center items-center">
        <div
          id="song-container"
          className="rounded-2xl h-1/2 flex flex-col justify-center items-center"
        >
          <img src={form.image} className="rounded-xl h-3/4 drop-shadow-xl" />
          <div className="w-full self-start p-2">
            <h1 className="text-3xl font-medium">{form.song}</h1>
            <h2 className="truncate text-lg">
              {form.artists.map((artist) => (
                <span key={artist}>{artist} </span>
              ))}
            </h2>
          </div>
        </div>
      </div>
    </>
  );
};

export default Song;
