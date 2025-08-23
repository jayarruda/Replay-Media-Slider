## Jellyfin Media Slider

 A customizable media slider component for Jellyfin.

<details>
<summary>🖼️ Ekran Görüntüleri / Screenshots </summary>

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


### Konumlandırma yapılmış normal görünüm / Normal view with proper positioning applied.

![ngy](https://github.com/user-attachments/assets/294cc2a7-3c3c-423b-88ff-a18b79dc6f46)

### Fragman / Trailer

#### Yerleşik Fragman / Embedded Trailer

![yf](https://github.com/user-attachments/assets/c16c85b1-d14d-42a5-88c4-aa4de182795f)

#### Fragman Modalı (Buton) / Trailer Popup (Button)

![fm](https://github.com/user-attachments/assets/2636496c-4f9b-4a39-8516-8580d39b05fe)


### Ayarlar Modalı / Settings Popup

![st](https://github.com/user-attachments/assets/080a819c-a1a4-4f10-81ec-fe0dcba885e1)


 </details>


### Özellikler / Features

### English

- #### Per-user list creation
Allows each Jellyfin user to have their own independent, personalized media lists.

- #### Automatic list updates
Lists are automatically refreshed based on changes in the media library.

- #### Customizable Jellyfin API integration
Flexible API integration enables advanced customization to meet specific needs.

- #### Manual positioning for theme compatibility
UI elements can be manually positioned to adapt seamlessly to any Jellyfin theme.

- #### GMMP Music Player
A comprehensive music playback plugin designed for rich and responsive audio experiences in Jellyfin.

- #### Pause Screen
Displays an informative overlay when content is paused, including media details and playback controls.

- #### Avatar Generator
It is a module that automatically generates and applies avatars based on the username or with DiceBear support.

- #### Advanced settings management
A user-friendly settings panel makes it easy to configure all features.</summary>

### Türkçe

- #### Her kullanıcı için ayrı liste oluşturma
Her Jellyfin kullanıcısı için kişisel, bağımsız medya listeleri oluşturulabilir.

- #### Otomatik liste güncelleme
Medya kitaplığındaki değişikliklere göre listeler otomatik olarak güncellenir.

- #### Özelleştirilebilir Jellyfin API entegrasyonu
İhtiyaca göre şekillendirilebilen esnek API entegrasyonu sayesinde gelişmiş kontrol imkanı.

- #### Her temayla uyumlu manuel konumlandırma
Arayüz öğeleri, farklı temalara uyum sağlayacak şekilde manuel olarak konumlandırılabilir.

- #### GMMP Müzik Oynatıcı
Zengin ve duyarlı bir müzik deneyimi sunan kapsamlı bir Jellyfin müzik oynatma eklentisidir.

- #### Duraklatma Ekranı
İçerik duraklatıldığında, medya bilgileri ve oynatma kontrollerini içeren bir karşılama ekranı gösterilir.

- #### Avatar Oluşturucu
Kullanıcı adına göre veya DiceBear desteği ile otomatik olarak avatar üreten ve uygulayan bir modüldür.

- #### Gelişmiş ayar yönetimi
Kullanıcı dostu ayar paneli ile tüm özellikler kolayca yapılandırılabilir.

### Kurulum/Installation
<details>
<summary> Türkçe Kurulum </summary>

#### Windows için

İndirdiğiniz sıkıştırılmış klasörü herhangi boş bir klasöre çıkarıp ``` install.bat ``` betiğini yönetici olarak çalıştırın ve tarayıcı çerezlerini birkaç kez temizleyin.

#### Yüklemeyi Kaldırma

``` uninstall.bat ``` betiğini yönetici olarak çalıştırın.


#### Linux için

``` git clone https://github.com/G-grbz/Jellyfin-Media-Slider ```

``` cd Jellyfin-Media-Slider ```

#### Kurulum scriptini çalıştırın:

``` sudo chmod +x install.sh && sudo ./install.sh ```

#### Tarayıcı çerezlerini temizleyin.

#### Liste Güncelleme Scripti

listUpdate klasöründeki script belirli aralıklarla kullanıcı listelerini günceller.

#### Gerekli Ayarlar
.env dosyasını düzenleyerek gerekli bilgileri girin.

#### Script Seçenekleri
'updateList'	içerikleri rastgele listeler
( değerleri değiştirmek için /modules/listConfig.json el ile yapılandırılmalı ve script yeniden başlatılmalıdır.

Detaylı açıklamalar;

``` itemLimit: ``` Slider'da gösterilecek maksimum öğe sayısı

``` garantiLimit: ``` Her içerik türünden garanti edilecek minimum öğe sayısı

``` listLimit: ``` Önceki listelerin saklanacağı maksimum sayı (tekrarları önlemek için)

``` listRefresh": ``` "Listenin yenilenme aralığı (milisaniye - 300000ms = 5 dakika)

``` listcustomQueryString: ``` Jellyfin API'si için özel sorgu parametreleri)

# Script Çalıştırma

#### list ve listUpdate klasörüne okuma yazma izni verin

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate ```

#### Gerekli bağımlılıkları yükleyin:

``` cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch ```

#### scripti çalıştırın:

``` node updateList.mjs ```

#### Yüklemeyi Kaldırma

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh && sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ```
</details>

<details>
<summary> English Installation</summary>

#### For Windows
Extract the downloaded compressed folder to any empty folder, then run the ``` install.bat ``` file as administrator and clear your browser cookies a few times.

#### Uninstalling
Run the script ``` uninstall.bat ``` as administrator.

#### For Linux

``` git clone https://github.com/G-grbz/Jellyfin-Media-Slider ```

``` cd Jellyfin-Media-Slider ```

#### Run the installation script:

``` sudo chmod +x install.sh && sudo ./install.sh ```

#### Clear browser cookies to ensure the changes take effect.

### List Update Script

The script in the listUpdate folder updates user lists at specific intervals.

#### Required Settings

Edit the .env file and insert the necessary information.

#### Script Options

'updateList' lists the contents randomly
( /modules/listConfig.json needs to be configured manually and the script needs to be restarted for the changes to take effect.

Detailed explanations;

``` itemLimit: ``` Maximum number of items to show in slider

``` garantiLimit: ``` Minimum guaranteed items per content type (Movie/Series/BoxSet)

``` listLimit: ``` Max number of previous lists to store (prevent duplicates)

``` listRefresh: ``` Refresh interval in milliseconds (300000ms = 5 minutes)

```  listcustomQueryString: ``` Custom query parameters for Jellyfin API )

#### Running the Script

#### Give read-write permission to the list and listUpdate folder

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate ```

#### Install dependencies:

``` cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch ```

#### Run the script:

``` node updateList.mjs ```

#### Uninstallation

#### To remove the installation, run:

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh && sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ``` </details>

<details>
<summary> Senkronize Şarkı Sözleri Betiği / Synchronized Lyrics Script </summary>

### Türkçe

lrclib.net üzerinden şarkı sözlerini çekebilen bir betik ekledim(lrclib.sh). Bu betik eklentiden bağımsız olarak çalışmaktadır. (Linux)

betiği çalıştırmak için gerekli bağımlılıklar: ```curl, jq, find```

mevcut şarkı isim formatınız ``` "'ad soyad' -  'parça adı'" ``` şekilde olmalıdır örn.: ```Ali Kınık - Ali Ayşeyi Seviyor```

Betiği çalıştırmak için gerekli izinleri verin ve

``` sh lrclib.sh /Müzik/Dosya/Yolu ``` komutunu çalıştırın alt klasörler dahil arayarak eşleşen şarkı sözlerini indirecektir. ( Öncelik Senkronize şarkı sözleri mevcut değil ise normal)

Mevcut şarkı sözlerinizin üzerine yazmak isterseniz, komut sonuna ```--overwrite``` ekleyin yani ```sh lrclib.sh /Müzik/Dosya/Yolu --overwrite```

dosya yolunuz boşluk içeriyor ise ```""``` içerisine alın yani ```sh lrclib.sh "/Müzik/Dosya/Müzik Yolu" --overwrite``` (formatlar mp3 ve flac olmalıdır)

### English

A standalone script has been added to fetch synchronized lyrics from lrclib.net. This script operates independently of the plugin and is designed for Linux systems.

Requirements:
To run the script, make sure the following dependencies are installed: curl, jq, and find

Track Filename Format:
Your audio files should follow the naming convention:
```'artist name' - 'track title'```
For example: ```Ali Kınık - Ali Ayşeyi Seviyor```

Usage:
Grant the necessary execution permissions to the script.

Run the command:

```sh lrclib.sh /Path/To/Your/Music/Directory```

This will recursively search all subdirectories and download matching lyrics.
It prioritizes synchronized lyrics, and falls back to regular lyrics if none are available.

To overwrite existing lyrics files, append the --overwrite flag:

```sh lrclib.sh /Path/To/Your/Music/Directory --overwrite```

If your file path contains spaces, enclose it in double quotes, e.g., ``` sh lrclib.sh "/Path/To/Your/Music Path" --overwrite ``` (Supported formats: mp3 and flac)

</details>

<details>
<summary> Trailer Scripts/Fragman Betikleri – Setup Guide (EN & TR) </summary>

<details>
<summary>

### English </summary>

#### Overview

This repository contains **two related scripts** for adding trailers to your Jellyfin media library:

* `trailers.sh` → Downloads and saves **local MP4 trailers** using `yt-dlp`.
* `trailersurl.sh` → Adds only a **trailer URL** into NFO metadata files (trailersurl.sh does not perform downloads. For it to work, you need to have NFO enabled in your Jellyfin library, and the content folders must already contain pre-generated NFO files.).

Both use TMDb for trailer discovery and refresh Jellyfin metadata afterward.

#### Which one should I use?

* Use `trailers.sh` if you want **offline, locally stored MP4 trailers** (more disk usage, but reliable even without internet).
* Use `trailersurl.sh` if you prefer **fast, lightweight setup with no downloads**, but note: trailers will stream online and need internet at playback.

#### Features

* Movie and TV (Series/Season/Episode) support
* Multi‑language trailer discovery (preferred + fallback)
* Metadata refresh after adding trailer (either file or URL)
* Summary report with counts (downloaded/skipped/errors or NFO updated/skipped/errors)

#### Requirements

Common dependencies:

* **Shell**: bash (Linux/macOS)
* **Tools**: `curl`, `jq`

Additional for `trailers.sh`:

* `yt-dlp` (required)
* `ffprobe` (optional, from `ffmpeg`)

#### Installation

Choose your distro and run:

(Note: It is recommended to install yt-dlp via pip. Using pip instead of a package manager ensures you get the latest version and a smoother experience.)

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt install -y curl jq ffmpeg yt-dlp
```

**Arch / Manjaro**

```bash
sudo pacman -S curl jq ffmpeg yt-dlp
```

**Fedora**

```bash
sudo dnf install -y curl jq ffmpeg yt-dlp
```

**openSUSE**

```bash
sudo zypper install -y curl jq ffmpeg yt-dlp
```

**Alpine**

```bash
sudo apk add curl jq ffmpeg yt-dlp
```

#### Get the scripts

```bash
curl -fsSL -o trailers.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/trailers.sh"
curl -fsSL -o trailersurl.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/trailersurl.sh"
chmod +x trailers.sh trailersurl.sh
```

#### Configuration

Both scripts use environment variables. Common ones:

| Variable         | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `JF_BASE`        | Jellyfin base URL (default `http://localhost:8096`)    |
| `JF_API_KEY`     | **Required** Jellyfin API key                          |
| `TMDB_API_KEY`   | **Required** TMDb API key                                   |
| `PREFERRED_LANG` | Preferred language code (default `tr-TR`)                   |
| `FALLBACK_LANG`  | Fallback language (default `en-US`)                         |
| `INCLUDE_TYPES`  | Media types to scan (default `Movie,Series,Season,Episode`) |
| `INCLUDE_LANGS_WIDE`  | Comprehensive search  ( `tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null` )    

Extra for `trailers.sh`:

* `COOKIES_BROWSER` → supply cookies to yt-dlp (firefox/chrome)
* `MIN_FREE_MB` → minimum free disk space to attempt download
* `SLEEP_SECS` → delay between downloads

#### Usage

**Download trailers (trailers.sh):**

```bash
JF_BASE="http://jellyfinserveraddress:8096" \
JF_API_KEY="API-KEY-HERE" \
TMDB_API_KEY="TMDB-API-KEY-HERE" \
COOKIES_BROWSER=chrome \
MIN_FREE_MB=2048 \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null" \
./trailers.sh
```

**Add only trailer URLs (trailersurl.sh):**

```bash
JF_BASE="http://jellyfinserveraddress:8096" \
JF_API_KEY="API-KEY-HERE" \
TMDB_API_KEY="TMDB-API-KEY-HERE" \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null" \
./trailersurl.sh
```

#### Systemd timer (optional)

Create a service at `/etc/systemd/system/trailers.service`:

```ini
[Unit]
Description=Download trailers for Jellyfin library

[Service]
Type=oneshot
Environment=JF_BASE=http://localhost:8096
Environment=JF_API_KEY=<JF_API-KEY>
Environment=TMDB_API_KEY=<TMDB_API-KEY>
Environment=PREFERRED_LANG=tr-TR
Environment=COOKIES_BROWSER=chrome
Environment=INCLUDE_LANGS_WIDE=tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null
WorkingDirectory=/opt/trailers(replace this with the directory path where the scripts are located)
ExecStart=/directory-path/trailers.sh
```

Timer `/etc/systemd/system/trailers.timer`:

```ini
[Unit]
Description=Run trailers.sh daily

[Timer]
OnCalendar=03:30
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now trailers.timer
```
</details>

<details>
<summary>

### Türkçe </summary>

#### Genel Bakış

Bu repo Jellyfin kütüphanenize fragman eklemek için **iki betik** içerir:

* `trailers.sh` → `yt-dlp` ile **yerel MP4 fragmanları** indirir.
* `trailersurl.sh` → Sadece **fragman URL’sini** `.nfo` dosyasına ekler (İndirme işlemi yapmaz. Bunun çalışabilmesi için Jellyfin kütüphanenizde NFO etkin olmalı ve içerik klasörlerinde önceden oluşturulmuş NFO dosyaları bulunmalıdır).

Her ikisi de TMDb üzerinden fragman arar ve işlem sonrası Jellyfin meta verisini yeniler.

#### Hangisini kullanmalı?

* `trailers.sh` → **İnternetsiz çalışabilen yerel MP4 dosyaları** istiyorsanız kullanın (daha fazla disk kullanır).
* `trailersurl.sh` → **Hafif ve hızlı** çözüm istiyorsanız kullanın (disk kullanmaz ama oynatma için internet gerekir).

#### Özellikler

* Film ve Dizi (Dizi/Sezon/Bölüm) desteği
* Tercihli/yedek dil ile çoklu dil desteği
* Fragman eklendikten sonra meta veri yenileme
* Özet rapor (indirilen/atlanılan/hatalı ya da NFO güncellenen/atlanılan)

#### Gerekli Araçlar

Ortak bağımlılıklar:

* **Kabuk**: bash
* **Araçlar**: `curl`, `jq`

Ek olarak `trailers.sh` için:

* `yt-dlp` (zorunlu)
* `ffprobe` (`ffmpeg` paketinden, opsiyonel)

#### Kurulum

Dağıtımınıza göre:

(not: yt-dlp kurulumunu pip üzerinden yapmanız tavsiye edilir. Paket yöneticileriyle kurulum yerine pip kullanmanız daha güncel ve sorunsuz bir deneyim sağlayacaktır.)

**Debian / Ubuntu**

```bash
sudo apt update
sudo apt install -y curl jq ffmpeg yt-dlp
```

**Arch / Manjaro**

```bash
sudo pacman -S curl jq ffmpeg yt-dlp
```

**Fedora**

```bash
sudo dnf install -y curl jq ffmpeg yt-dlp
```

**openSUSE**

```bash
sudo zypper install -y curl jq ffmpeg yt-dlp
```

**Alpine**

```bash
sudo apk add curl jq ffmpeg yt-dlp
```

#### Betikleri indir

```bash
curl -fsSL -o trailers.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/trailers.sh"
curl -fsSL -o trailersurl.sh "https://raw.githubusercontent.com/G-grbz/Jellyfin-Media-Slider/main/trailersurl.sh"
chmod +x trailers.sh trailersurl.sh
```

#### Yapılandırma

Ortak değişkenler:

| Değişken         | Açıklama                                                    |
| ---------------- | ----------------------------------------------------------- |
| `JF_BASE`        | Jellyfin adresi (varsayılan `http://localhost:8096`)   |
| `JF_API_KEY`     | **Zorunlu** Jellyfin API anahtarı                      |
| `TMDB_API_KEY`   | **Zorunlu** TMDb API anahtarı                               |
| `PREFERRED_LANG` | Tercih edilen dil (varsayılan `tr-TR`)                      |
| `FALLBACK_LANG`  | Yedek dil (varsayılan `en-US`)                              |
| `INCLUDE_TYPES`  | Taranacak türler (varsayılan `Movie,Series,Season,Episode`) |
| `INCLUDE_LANGS_WIDE`  | Kapsamlı arama  ( `tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null` )                            |

Ekstra `trailers.sh` için:

* `COOKIES_BROWSER` → yt-dlp için tarayıcı çerezleri (firefox/chrome)
* `MIN_FREE_MB` → İndirme için gereken minimum boş alan
* `SLEEP_SECS` → İndirmeler arası bekleme süresi

#### Örnek Kullanım

**Fragman indir (trailers.sh):**

```bash
JF_BASE="http://jellyfinserveradres:8096" \
JF_API_KEY="API-KEY-BURAYA" \
TMDB_API_KEY="TMDB-API-KEY-BURAYA" \
COOKIES_BROWSER=chrome \
MIN_FREE_MB=2048 \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null" \
./trailers.sh
```

**Sadece URL ekle (trailersurl.sh):**

```bash
JF_BASE="http://jellyfinserveradres:8096" \
JF_API_KEY="API-KEY-BURAYA" \
TMDB_API_KEY="TMDB-API-KEY-BURAYA" \
PREFERRED_LANG=tr-TR \
INCLUDE_LANGS_WIDE="tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null" \
./trailersurl.sh
```

#### Systemd zamanlayıcı (opsiyonel)

`/usr/lib/systemd/system/trailers.service`:

```ini
[Unit]
Description=Jellyfin kütüphanesi için fragman indirme

[Service]
Type=oneshot
Environment=JF_BASE=http://localhost:8096
Environment=JF_API_KEY=<JF_ANAHTAR>
Environment=TMDB_API_KEY=<TMDB_ANAHTAR>
Environment=PREFERRED_LANG=tr-TR
Environment=COOKIES_BROWSER=chrome
Environment=INCLUDE_LANGS_WIDE=tr,en,hi,de,ru,fr,it,es,ar,fa,pt,zh,ja,ko,null
WorkingDirectory=/opt/trailers(burayı betiklerin bulunduğu dizin yolu ile değiştirin)
ExecStart=/dizin-yolu/trailers.sh
```

`/usr/lib/systemd/system/trailers.timer`:

```ini
[Unit]
Description=trailers.sh günlük çalıştırma

[Timer]
OnCalendar=03:30
Persistent=true

[Install]
WantedBy=timers.target
```

Etkinleştir:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now trailers.timer
```
</details>
</details>

#### 📄 License and Usage Notice
This project is not allowed to be copied, redistributed, or published without explicit permission.

If you intend to use, modify, or share any part of this project, you must:

Credit the original author clearly.

Provide a link to the original repository.

Indicate any changes made if the project is modified or forked.

Unauthorized use or redistribution is strictly prohibited.

Thank you for respecting the work and effort behind this project.
