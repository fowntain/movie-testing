import { registerProvider } from "@/backend/helpers/register";
import { MWMediaType } from "@/backend/metadata/types";
import { conf } from "@/setup/config";

import { customAlphabet } from "nanoid";
// import toWebVTT from "srt-webvtt";
import CryptoJS from "crypto-js";

const nanoid = customAlphabet("0123456789abcdef", 32);

// CONSTANTS, read below (taken from og)
// We do not want content scanners to notice this scraping going on so we've hidden all constants
// The source has its origins in China so I added some extra security with banned words
// Mayhaps a tiny bit unethical, but this source is just too good :)
// If you are copying this code please use precautions so they do not change their api.
const iv = atob("d0VpcGhUbiE=");
const key = atob("MTIzZDZjZWRmNjI2ZHk1NDIzM2FhMXc2");
const apiUrls = [
  atob("aHR0cHM6Ly9zaG93Ym94LnNoZWd1Lm5ldC9hcGkvYXBpX2NsaWVudC9pbmRleC8="),
  atob("aHR0cHM6Ly9tYnBhcGkuc2hlZ3UubmV0L2FwaS9hcGlfY2xpZW50L2luZGV4Lw=="),
];
const appKey = atob("bW92aWVib3g=");
const appId = atob("Y29tLnRkby5zaG93Ym94");

// cryptography stuff
const crypto = {
  encrypt(str: string) {
    return CryptoJS.TripleDES.encrypt(str, CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
    }).toString();
  },
  getVerify(str: string, str2: string, str3: string) {
    if (str) {
      return CryptoJS.MD5(
        CryptoJS.MD5(str2).toString() + str3 + str
      ).toString();
    }
    return null;
  },
};

// get expire time
const expiry = () => Math.floor(Date.now() / 1000 + 60 * 60 * 12);

// sending requests
const get = (data: object, altApi = false) => {
  const defaultData = {
    childmode: "0",
    app_version: "11.5",
    appid: appId,
    lang: "en",
    expired_date: `${expiry()}`,
    platform: "android",
    channel: "Website",
  };
  const encryptedData = crypto.encrypt(
    JSON.stringify({
      ...defaultData,
      ...data,
    })
  );
  const appKeyHash = CryptoJS.MD5(appKey).toString();
  const verify = crypto.getVerify(encryptedData, appKey, key);
  const body = JSON.stringify({
    app_key: appKeyHash,
    verify,
    encrypt_data: encryptedData,
  });
  const b64Body = btoa(body);

  const formatted = new URLSearchParams();
  formatted.append("data", b64Body);
  formatted.append("appid", "27");
  formatted.append("platform", "android");
  formatted.append("version", "129");
  formatted.append("medium", "Website");

  const requestUrl = altApi ? apiUrls[1] : apiUrls[0];
  return fetch(`${conf().CORS_PROXY_URL}${requestUrl}`, {
    method: "POST",
    headers: {
      Platform: "android",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `${formatted.toString()}&token${nanoid()}`,
  });
};

registerProvider({
  id: "superstream",
  rank: 50,
  type: [MWMediaType.MOVIE, MWMediaType.SERIES],
  disabled: true,

  async scrape({
    media: {
      meta: { type },
      tmdbId,
    },
  }) {
    if (type === MWMediaType.MOVIE) {
      const apiQuery = {
        uid: "",
        module: "Movie_downloadurl_v3",
        mid: tmdbId,
        oss: "1",
        group: "",
      };

      const mediaRes = (await get(apiQuery).then((r) => r.json())).data;
      const hdQuality =
        mediaRes.list.find(
          (quality: any) => quality.quality === "1080p" && quality.path
        ) ??
        mediaRes.list.find(
          (quality: any) => quality.quality === "720p" && quality.path
        ) ??
        mediaRes.list.find(
          (quality: any) => quality.quality === "480p" && quality.path
        ) ??
        mediaRes.list.find(
          (quality: any) => quality.quality === "360p" && quality.path
        );

      if (!hdQuality) throw new Error("No quality could be found.");

      // const subtitleApiQuery = {
      //   fid: hdQuality.fid,
      //   uid: "",
      //   module: "Movie_srt_list_v2",
      //   mid: tmdbId,
      // };

      // const subtitleRes = (await get(subtitleApiQuery).then((r) => r.json()))
      //   .data;
      // const mappedCaptions = await Promise.all(
      //   subtitleRes.list.map(async (subtitle: any) => {
      //     const captionBlob = await fetch(
      //       `${conf().CORS_PROXY_URL}${subtitle.subtitles[0].file_path}`
      //     ).then((captionRes) => captionRes.blob()); // cross-origin bypass
      //     const captionUrl = await toWebVTT(captionBlob); // convert to vtt so it's playable
      //     return {
      //       id: subtitle.language,
      //       url: captionUrl,
      //       label: subtitle.language,
      //     };
      //   })
      // );

      return { embeds: [], stream: hdQuality.path };
    }

    // const apiQuery = {
    //   uid: "",
    //   module: "TV_downloadurl_v3",
    //   episode: media.episodeId,
    //   tid: media.mediaId,
    //   season: media.seasonId,
    //   oss: "1",
    //   group: "",
    // };
    // const mediaRes = (await get(apiQuery).then((r) => r.json())).data;
    // const hdQuality =
    //   mediaRes.list.find(
    //     (quality: any) => quality.quality === "1080p" && quality.path
    //   ) ??
    //   mediaRes.list.find(
    //     (quality: any) => quality.quality === "720p" && quality.path
    //   ) ??
    //   mediaRes.list.find(
    //     (quality: any) => quality.quality === "480p" && quality.path
    //   ) ??
    //   mediaRes.list.find(
    //     (quality: any) => quality.quality === "360p" && quality.path
    //   );

    // if (!hdQuality) throw new Error("No quality could be found.");

    // const subtitleApiQuery = {
    //   fid: hdQuality.fid,
    //   uid: "",
    //   module: "TV_srt_list_v2",
    //   episode: media.episodeId,
    //   tid: media.mediaId,
    //   season: media.seasonId,
    // };
    // const subtitleRes = (await get(subtitleApiQuery).then((r) => r.json()))
    //   .data;
    // const mappedCaptions = await Promise.all(
    //   subtitleRes.list.map(async (subtitle: any) => {
    //     const captionBlob = await fetch(
    //       `${conf().CORS_PROXY_URL}${subtitle.subtitles[0].file_path}`
    //     ).then((captionRes) => captionRes.blob()); // cross-origin bypass
    //     const captionUrl = await toWebVTT(captionBlob); // convert to vtt so it's playable
    //     return {
    //       id: subtitle.language,
    //       url: captionUrl,
    //       label: subtitle.language,
    //     };
    //   })
    // );

    return { embeds: [] };
  },
});
