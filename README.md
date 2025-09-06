## Jellyfin Media Slider

#### An all-in-one JavaScript toolkit for Jellyfin, featuring a customizable Media Slider builder, music player, Netflix-style pause screen, Netflix-like HoverVideo, quality labels on cards, DiceBear avatar generator, and a sleek notification panel.

## 📑 Table of Contents

* [🖼️ Screenshots / Ekran Görüntüleri](#screenshots)
* [✨ Features / Özellikler](#features)
* [⚙️ Installation / Kurulum](#install)

  * [🇹🇷 Türkçe Kurulum](#tr-install)
  * [🇬🇧 English Installation](#en-install)
* [🎵 Synchronized Lyrics Script / Senkronize Şarkı Sözleri Betiği](#lyrics)

  * [🇹🇷 Türkçe Kullanım](#lyrics-tr)
  * [🇬🇧 English Usage](#lyrics-en)
* [🎬 Trailer Scripts / Fragman Betikleri](#trailers)

  * [🇬🇧 English Guide](#trailers-en)
  * [🇹🇷 Türkçe Rehber](#trailers-tr)
* [📄 License](#license)

---

<a id="screenshots"></a>

## 🖼️ Screenshots / Ekran Görüntüleri

<details>
<summary>Show / Göster</summary>

### DiceBear Avatar Görünümü / DiceBear Avatar Skin

![diceBear](https://github.com/user-attachments/assets/713fc481-7e60-43ab-bdf8-463bbb47ff78)

### Bildirim Modalı / Notification Modal

![bildirim](https://github.com/user-attachments/assets/b6533b70-743f-454d-adab-083d1d8a40ca)
![bildirim1](https://github.com/user-attachments/assets/041f9727-6ee9-4583-bebf-5ac7e7bd0a86)

### Duraklatma Ekranı / Pause Screen

![pause](https://github.com/user-attachments/assets/8e3ec49b-b7f2-406a-818d-064f6f64eac7)

### Kompakt Görünüm / Compact View

![co](https://github.com/user-attachments/assets/afac00a0-68c7-4a7e-b551-f946ec4f1e7b)

### Tam Ekran / Full Screen

![fsc](https://github.com/user-attachments/assets/e7ec8a4c-b82c-426c-ab76-8dd561b28845)

### Normal görünüm / Normal view

![ng](https://github.com/user-attachments/assets/80e7b0fb-6c8b-4076-ad33-4832bbf1e972)

### Konumlandırma yapılmış normal görünüm / Normal view with positioning

![ngy](https://github.com/user-attachments/assets/294cc2a7-3c3c-423b-88ff-a18b79dc6f46)

### Fragman / Trailer

#### Yerleşik Fragman / Embedded Trailer

![yf](https://github.com/user-attachments/assets/c16c85b1-d14d-42a5-88c4-aa4de182795f)

#### Fragman Modalı / Trailer Popup

![fm](https://github.com/user-attachments/assets/2636496c-4f9b-4a39-8516-8580d39b05fe)

### Ayarlar Modalı / Settings Popup

![st](https://github.com/user-attachments/assets/080a819c-a1a4-4f10-81ec-fe0dcba885e1)

</details>

---

<a id="features"></a>

## ✨ Features / Özellikler

### English

* Per-user list creation
* Automatic list updates
* Customizable Jellyfin API integration
* Manual positioning for theme compatibility
* GMMP Music Player
* Pause Screen
* Avatar Generator (DiceBear supported)
* Advanced settings management
* Global Quality Labels in Jellyfin
* Netflix-like Hover Video Previews
* Newly Added Content & Notifications Module
* StudioHubs (Disney+ style)
* Trailer Fetching Scripts

### Türkçe

* Her kullanıcı için ayrı liste oluşturma
* Otomatik liste güncelleme
* Özelleştirilebilir Jellyfin API entegrasyonu
* Manuel konumlandırma (tema uyumluluğu)
* GMMP Müzik Oynatıcı
* Duraklatma Ekranı
* Avatar Oluşturucu (DiceBear desteğiyle)
* Gelişmiş ayar yönetimi
* Jellyfin genelinde kalite etiketleri
* Netflix benzeri hover video önizlemeleri
* Yeni içerik ve sistem bildirim modülü
* StudioHubs (Disney+ tarzı)
* Fragman edinim betikleri

---

<a id="install"></a>

## ⚙️ Installation / Kurulum

* 🇹🇷 **Türkçe Kurulum**

  * Eklenti kurulumu → [Detaylı Açıklama](#tr-install)
  * Manuel Windows/Linux kurulumu → [Detaylı Açıklama](#tr-install)
* 🇬🇧 **English Installation**

  * Plugin installation → [Detailed Guide](#en-install)
  * Manual Windows/Linux installation → [Detailed Guide](#en-install)

<a id="tr-install"></a>

<details>
<summary><strong>Türkçe Kurulum</strong></summary>

#### Eklenti olarak

* Jellyfin yönetici paneline giriş yapın.
* Eklentiler (Plugins) bölümüne gidin.
* Katalog (Catalog) sekmesine tıklayın.
* Üsteki ayar ikonuna tıklayarak + ikonu ile yeni kaynak ekle sayfasını açın ve aşağıdaki adresi ekleyin

```
https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/manifest.json 
```

* Kaynağı kaydedin ve Katalog bölümünde JMSFusion eklentisini bulun ve yükleyin.
* JMS-Fusion yüklendikten sonra değişikliklerin geçerli olması için Jellyfin’i tekrar yeniden başlatın.
* Yeniden başlatma sonrası ana sayfaya dönüp bir kaç kez ctrl + f5 ile sayfayı yenileyin

### Manuel Kurulum

#### Windows için

İndirdiğiniz sıkıştırılmış klasörü herhangi boş bir klasöre çıkarıp `install.bat` betiğini yönetici olarak çalıştırın ve tarayıcı çerezlerini birkaç kez temizleyin.

#### Yüklemeyi Kaldırma

`uninstall.bat` betiğini yönetici olarak çalıştırın.

#### Linux için

```bash
git clone https://github.com/G-grbz/Jellyfin-Media-Slider
cd Jellyfin-Media-Slider/Resources/slider/
```

#### Kurulum scriptini çalıştırın:

```bash
sudo chmod +x install.sh && sudo ./install.sh
```

#### Tarayıcı çerezlerini temizleyin.

#### Liste Güncelleme Scripti

listUpdate klasöründeki script belirli aralıklarla kullanıcı listelerini günceller.

#### Gerekli Ayarlar

`.env` dosyasını düzenleyerek gerekli bilgileri girin.

#### Script Seçenekleri

`updateList` içerikleri rastgele listeler (değerleri değiştirmek için `/modules/listConfig.json` el ile yapılandırılmalı ve script yeniden başlatılmalıdır.)

Detaylı açıklamalar;

* `itemLimit:` Slider'da gösterilecek maksimum öğe sayısı
* `garantiLimit:` Her içerik türünden garanti edilecek minimum öğe sayısı
* `listLimit:` Önceki listelerin saklanacağı maksimum sayı (tekrarları önlemek için)
* `listRefresh:` Listenin yenilenme aralığı (milisaniye - 300000ms = 5 dakika)
* `listcustomQueryString:` Jellyfin API'si için özel sorgu parametreleri

### Script Çalıştırma

#### list ve listUpdate klasörüne okuma yazma izni verin

```bash
sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate
```

#### Gerekli bağımlılıkları yükleyin:

```bash
cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch
```

#### scripti çalıştırın:

```bash
node updateList.mjs
```

#### Yüklemeyi Kaldırma

```bash
sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh && sudo sh /usr/share/jellyfin/web/slider/uninstall.sh
```

</details>

<a id="en-install"></a>

<details>
<summary><strong>English Installation</strong></summary>

### Installation with a plugin

* Log in to your Jellyfin admin dashboard.
* Go to the Plugins section.
* Click on the Catalog tab.
* Click the settings icon at the top, then use the + button to open the “Add Repository” page and enter the following address:

```
https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/manifest.json
```

* Save the repository, then go to the Catalog section, find the JMS-Fusion plugin, and install it.
* After installing JMS-Fusion, restart Jellyfin again to apply the changes.
* After restarting, go back to the home page and refresh the page with ctrl + f5 a few times.

### Manual Installation

#### For Windows

Extract the downloaded compressed folder to any empty folder, then run the `install.bat` file as administrator and clear your browser cookies a few times.

#### Uninstalling

Run the script `uninstall.bat` as administrator.

#### For Linux

```bash
git clone https://github.com/G-grbz/Jellyfin-Media-Slider
cd Jellyfin-Media-Slider/Resources/slider/
```

#### Run the installation script:

```bash
sudo chmod +x install.sh && sudo ./install.sh
```

#### Clear browser cookies to ensure the changes take effect.

### List Update Script

The script in the listUpdate folder updates user lists at specific intervals.

#### Required Settings

Edit the .env file and insert the necessary information.

#### Script Options

`updateList` lists the contents randomly (`/modules/listConfig.json` needs to be configured manually and the script needs to be restarted for the changes to take effect.)

Detailed explanations:

* `itemLimit:` Maximum number of items to show in slider
* `garantiLimit:` Minimum guaranteed items per content type (Movie/Series/BoxSet)
* `listLimit:` Max number of previous lists to store (prevent duplicates)
* `listRefresh:` Refresh interval in milliseconds (300000ms = 5 minutes)
* `listcustomQueryString:` Custom query parameters for Jellyfin API

#### Running the Script

##### Give read-write permission to the list and listUpdate folder

```bash
sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate
```

##### Install dependencies:

```bash
cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch
```

##### Run the script:

```bash
node updateList.mjs
```

##### Uninstallation

```bash
sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh && sudo sh /usr/share/jellyfin/web/slider/uninstall.sh
```

</details>

---

<a id="lyrics"></a>

## 🎵 Synchronized Lyrics Script / Senkronize Şarkı Sözleri Betiği

* 🇹🇷 Türkçe kullanım → [Detaylı Açıklama](#lyrics-tr)
* 🇬🇧 English usage → [Detailed Guide](#lyrics-en)

<a id="lyrics-tr"></a>

<details>
<summary><strong>Türkçe</strong></summary>

`lrclib.net` üzerinden şarkı sözlerini çekebilen bir betik ekledim (`lrclib.sh`). Bu betik eklentiden bağımsız olarak çalışmaktadır. (Linux)

**Gerekenler:** `curl`, `jq`, `find`

**Dosya adı formatı:** `'sanatçı' - 'parça adı'` (Örn: `Ali Kınık - Ali Ayşeyi Seviyor`)

**Kullanım:**

İzin verin ve çalıştırın:

```bash
sh lrclib.sh /Müzik/Dosya/Yolu
```

Mevcut sözlerin üzerine yazmak için:

```bash
sh lrclib.sh /Müzik/Dosya/Yolu --overwrite
```

Yol boşluk içeriyorsa:

```bash
sh lrclib.sh "/Müzik/Dosya/Müzik Yolu" --overwrite
```

(Desteklenen biçimler: `mp3`, `flac`)

</details>

<a id="lyrics-en"></a>

<details>
<summary><strong>English</strong></summary>

A standalone script to fetch synchronized lyrics from `lrclib.net` (`lrclib.sh`). Works independently of the plugin (Linux).

**Requirements:** `curl`, `jq`, `find`

**Track filename format:** `'artist' - 'track title'` (e.g., `Ali Kınık - Ali Ayşeyi Seviyor`)

**Usage:**

```bash
sh lrclib.sh /Path/To/Your/Music/Directory
```

Overwrite existing lyrics:

```bash
sh lrclib.sh /Path/To/Your/Music/Directory --overwrite
```

Paths with spaces:

```bash
sh lrclib.sh "/Path/To/Your/Music Path" --overwrite
```

(Supported formats: `mp3`, `flac`)

</details>

---

<a id="trailers"></a>

## 🎬 Trailer Scripts / Fragman Betikleri

* 🇬🇧 English Guide → [Detailed Guide](#trailers-en)
* 🇹🇷 Türkçe Rehber → [Detaylı Açıklama](#trailers-tr)

<a id="trailers-en"></a>

<details>
<summary><strong>English</strong></summary>

### Overview

Two scripts:

* `trailers.sh` → Downloads local MP4 trailers via `yt-dlp`.
* `trailersurl.sh` → Writes only a **trailer URL** into NFO (no download; NFO must be enabled and present).

Both use TMDb for discovery and refresh Jellyfin metadata.

### Requirements

Common: `bash`, `curl`, `jq`
Extra for `trailers.sh`: `yt-dlp` (required), `ffprobe` (optional)

### Get the scripts

```bash
curl -fsSL -o trailers.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/Resources/slider/trailers.sh"
curl -fsSL -o trailersurl.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/Resources/slider/trailersurl.sh"
chmod +x trailers.sh trailersurl.sh
```

### Usage (download trailers)

```bash
JF_BASE="http://jellyfinserveraddress:8096" \
JF_API_KEY="API-KEY-HERE" \
TMDB_API_KEY="TMDB-API-KEY-HERE" \
COOKIES_BROWSER=chrome \
MIN_FREE_MB=2048 \
OVERWRITE_POLICY=if-better \
ENABLE_THEME_LINK=1 \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,nl,pl,sv,cs,uk,el,null" \
./trailers.sh
```

### Usage (URL only)

```bash
JF_BASE="http://jellyfinserveraddress:8096" \
JF_API_KEY="API-KEY-HERE" \
TMDB_API_KEY="TMDB-API-KEY-HERE" \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,nl,pl,sv,cs,uk,el,null" \
./trailersurl.sh
```

*(Further env vars and systemd examples are available in the repository description above.)*

</details>

<a id="trailers-tr"></a>

<details>
<summary><strong>Türkçe</strong></summary>

### Genel Bakış

İki betik:

* `trailers.sh` → `yt-dlp` ile **yerel MP4** indirir.
* `trailersurl.sh` → Sadece **URL**'i NFO'ya yazar (indirme yok; NFO açık ve mevcut olmalı).

Her ikisi de TMDb kullanır ve işlem sonunda Jellyfin meta verisini yeniler.

### Gerekli Araçlar

Ortak: `bash`, `curl`, `jq`
Ek: `trailers.sh` için `yt-dlp` (zorunlu), `ffprobe` (opsiyonel)

### Betikleri indir

```bash
curl -fsSL -o trailers.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/Resources/slider/trailers.sh"
curl -fsSL -o trailersurl.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/Resources/slider/trailersurl.sh"
chmod +x trailers.sh trailersurl.sh
```

### Kullanım (indir)

```bash
JF_BASE="http://jellyfinserveradres:8096" \
JF_API_KEY="API-KEY-BURAYA" \
TMDB_API_KEY="TMDB-API-KEY-BURAYA" \
COOKIES_BROWSER=chrome \
MIN_FREE_MB=2048 \
ENABLE_THEME_LINK=1 \
OVERWRITE_POLICY=if-better \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,nl,pl,sv,cs,uk,el,null" \
./trailers.sh
```

### Kullanım (sadece URL)

```bash
JF_BASE="http://jellyfinserveradres:8096" \
JF_API_KEY="API-KEY-BURAYA" \
TMDB_API_KEY="TMDB-API-KEY-BURAYA" \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,nl,pl,sv,cs,uk,el,null" \
./trailersurl.sh
```

*(Diğer ortam değişkenleri ve systemd örnekleri yukarıdaki açıklamada mevcuttur.)*

</details>

---

<a id="license"></a>

## 📄 License and Usage Notice

This project is not allowed to be copied, redistributed, or published without explicit permission.

If you intend to use, modify, or share any part of this project, you must:

* Credit the original author clearly.
* Provide a link to the original repository.
* Indicate any changes made if the project is modified or forked.

Unauthorized use or redistribution is strictly prohibited.

Thank you for respecting the work and effort behind this project.
