// geocode.js
// 「発生現場」や「警察署名」などの地名テキストを緯度経度に変換する。
// Google Geocoding APIを使用(Google Cloud ConsoleでAPIキーを発行し、
// 環境変数 GOOGLE_GEOCODING_API_KEY に設定してください)。

const axios = require('axios');

async function geocode(address) {
  if (!address) return null;

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_GEOCODING_API_KEY が設定されていません');
    return null;
  }

  try {
    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params: { address, key: apiKey, region: 'jp', language: 'ja' } }
    );

    if (data.status !== 'OK' || !data.results.length) {
      console.warn(`ジオコーディング失敗: "${address}" (${data.status})`);
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (e) {
    console.error(`ジオコーディング中にエラー: "${address}"`, e.message);
    return null;
  }
}

module.exports = { geocode };
