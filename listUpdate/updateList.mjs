import fs from 'fs';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('../modules/listConfig.json');

dotenv.config();

const LISTS_DIR = '/usr/share/jellyfin/web/slider/list/';
const JELLYFIN_URL = process.env.JELLYFIN_URL;
const JELLYFIN_TOKEN = process.env.JELLYFIN_TOKEN;

if (!JELLYFIN_URL || !JELLYFIN_TOKEN) {
  console.error("❌ HATA: JELLYFIN_URL veya JELLYFIN_TOKEN çevre değişkeni eksik!");
  process.exit(1);
}

const userHistories = {};

async function getActiveSessions() {
  try {
    const response = await fetch(`${JELLYFIN_URL}/Sessions`, {
      headers: { Authorization: `MediaBrowser Token="${JELLYFIN_TOKEN}"` }
    });
    return await response.json();
  } catch (error) {
    console.error("⛔ Oturum bilgileri alınırken hata:", error.message);
    return [];
  }
}

function getListFilePath(userId) {
  return `${LISTS_DIR}list_${userId}.txt`;
}

async function fetchAllItems(userId) {
  let allItems = [];
  let startIndex = 0;

  try {
    const initialResponse = await fetch(
      `${JELLYFIN_URL}/Users/${userId}/Items?${config.listcustomQueryString}&Limit=1`,
      {
        headers: {
          Authorization: `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
          'Content-Type': 'application/json'
        }
      }
    );

    const initialData = await initialResponse.json();
    const totalRecords = initialData.TotalRecordCount || 0;
    const limit = 2000;

    while (startIndex < totalRecords) {
      const response = await fetch(
        `${JELLYFIN_URL}/Users/${userId}/Items?${config.listcustomQueryString}&Limit=${limit}&StartIndex=${startIndex}`,
        {
          headers: {
            Authorization: `MediaBrowser Token="${JELLYFIN_TOKEN}"`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.Items?.length > 0) {
        allItems = allItems.concat(data.Items);
        startIndex += data.Items.length;
      } else {
        break;
      }
    }
    return allItems;
  } catch (error) {
    console.error(`⛔ Fetch error: ${error.message}`);
    return [];
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getRandomContentIds(userId, limit = config.itemLimit) {
  try {
    const allItems = await fetchAllItems(userId);
    if (allItems.length === 0) {
      console.warn(`⚠️ [${userId}] Kullanıcısı için içerik bulunamadı`);
      return [];
    }

    const movies = allItems.filter(item => item.Type === "Movie");
    const series = allItems.filter(item => item.Type === "Series");
    const boxSets = allItems.filter(item => item.Type === "BoxSet");

    console.log(`🎬 [${userId}] İçerik Dağılımı - Filmler: ${movies.length}, Diziler: ${series.length}, Koleksiyonlar: ${boxSets.length}`);

    const shuffledMovies = shuffleArray(movies);
    const shuffledSeries = shuffleArray(series);
    const shuffledBoxSets = shuffleArray(boxSets);

    const itemsPerType = Math.floor(limit / 3);
    const selectedMovies = shuffledMovies.slice(0, itemsPerType);
    const selectedSeries = shuffledSeries.slice(0, itemsPerType);
    const selectedBoxSets = shuffledBoxSets.slice(0, itemsPerType);

    let selectedItems = shuffleArray([...selectedMovies, ...selectedSeries, ...selectedBoxSets]);

    if (selectedItems.length < limit) {
      const remainingItems = shuffleArray([...shuffledMovies, ...shuffledSeries, ...shuffledBoxSets])
        .filter(item => !selectedItems.includes(item))
        .slice(0, limit - selectedItems.length);
      selectedItems = selectedItems.concat(remainingItems);
    }

    let ids = selectedItems.map(item => item.Id);

    if (!userHistories[userId]) {
      userHistories[userId] = [];
    }
    const history = userHistories[userId];
    const last30History = history.slice(-50);
    const excludedIds = new Set();
    last30History.forEach(list => list.forEach(id => excludedIds.add(id)));

    const filteredItems = selectedItems.filter(item => !excludedIds.has(item.Id));
    if (filteredItems.length < limit) {
      console.warn(`⚠️ [${userId}] Yeterli yeni içerik yok, ${limit - filteredItems.length} eski içerik tekrar kullanılacak`);
      const additionalItems = allItems.filter(item => !ids.includes(item.Id));
      const additional = shuffleArray(additionalItems).slice(0, limit - filteredItems.length);
      ids = ids.concat(additional.map(item => item.Id));
    }

    history.push(ids);
    if (history.length > 30) history.shift();

    console.log(`✅ [${userId}] ${ids.length} rastgele içerik seçildi`);
    return ids;
  } catch (error) {
    console.error(`⛔ [${userId}] İçerik seçilirken hata:`, error.message);
    return [];
  }
}

async function updateListFileForUser(userId) {
  const newIds = await getRandomContentIds(userId);
  if (newIds.length === 0) {
    console.log(`ℹ️ [${userId}] Güncellenecek yeni içerik bulunamadı`);
    return;
  }

  const limitedIds = newIds.slice(0, config.itemLimit);

  const listFilePath = getListFilePath(userId);
  try {
    await fs.promises.writeFile(listFilePath, limitedIds.join('\n'), 'utf8');
    console.log(`🔄 [${userId}] Liste dosyası güncellendi (${limitedIds.length} içerik)`);
  } catch (error) {
    console.error(`⛔ [${userId}] Dosya yazma hatası:`, error.message);
  }
}

async function updateListFilesForActiveUsers() {
  try {
    console.log("\n=== Liste Güncelleme Başlatıldı ===");
    const sessions = await getActiveSessions();

    if (sessions.length === 0) {
      console.log("ℹ️ Aktif kullanıcı bulunamadı");
      return;
    }

    console.log(`👥 ${sessions.length} aktif kullanıcı tespit edildi`);
    for (const session of sessions) {
      await updateListFileForUser(session.UserId);
    }
    console.log("=== Liste Güncelleme Tamamlandı ===\n");
  } catch (error) {
    console.error("⛔ Liste güncelleme hatası:", error.message);
  }
}

updateListFilesForActiveUsers().catch(error => {
  console.error("⛔ Başlangıç güncelleme hatası:", error.message);
});

const interval = setInterval(updateListFilesForActiveUsers, config.listRefresh || 300000);


process.on('SIGTERM', () => {
  console.log("🛑 SIGTERM alındı - Kapatılıyor...");
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log("🛑 SIGINT alındı - Kapatılıyor...");
  clearInterval(interval);
  process.exit(0);
});
