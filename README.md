# Jellyfin Media Slider

 A customizable media slider component for Jellyfin.

<details>
<summary>🖼️ Ekran Görüntüleri / Screenshots </summary>

## DiceBear Avatar Görünümü / DiceBear Avatar Skin

![diceBear](https://github.com/user-attachments/assets/713fc481-7e60-43ab-bdf8-463bbb47ff78)

## Duraklatma Ekranı / Pause Screen

![pause](https://github.com/user-attachments/assets/8e3ec49b-b7f2-406a-818d-064f6f64eac7)


## Kompakt Görünüm / Compact View

![co](https://github.com/user-attachments/assets/afac00a0-68c7-4a7e-b551-f946ec4f1e7b)


## Tam Ekran / Full Screen

![fsc](https://github.com/user-attachments/assets/e7ec8a4c-b82c-426c-ab76-8dd561b28845)

## Normal görünüm / Normal view

![ng](https://github.com/user-attachments/assets/80e7b0fb-6c8b-4076-ad33-4832bbf1e972)


## Konumlandırma yapılmış normal görünüm / Normal view with proper positioning applied.

![ngy](https://github.com/user-attachments/assets/294cc2a7-3c3c-423b-88ff-a18b79dc6f46)

## Fragman / Trailer

### Yerleşik Fragman / Embedded Trailer

![yf](https://github.com/user-attachments/assets/c16c85b1-d14d-42a5-88c4-aa4de182795f)

### Fragman Modalı (Buton) / Trailer Popup (Button)

![fm](https://github.com/user-attachments/assets/2636496c-4f9b-4a39-8516-8580d39b05fe)


## Ayarlar Modalı / Settings Popup

![st](https://github.com/user-attachments/assets/080a819c-a1a4-4f10-81ec-fe0dcba885e1)


 </details>


## Özellikler / Features

# English

- ### Per-user list creation
Allows each Jellyfin user to have their own independent, personalized media lists.

- ### Automatic list updates
Lists are automatically refreshed based on changes in the media library.

- ### Customizable Jellyfin API integration
Flexible API integration enables advanced customization to meet specific needs.

- ### Manual positioning for theme compatibility
UI elements can be manually positioned to adapt seamlessly to any Jellyfin theme.

- ### GMMP Music Player
A comprehensive music playback plugin designed for rich and responsive audio experiences in Jellyfin.

- ### Pause Screen
Displays an informative overlay when content is paused, including media details and playback controls.

- ### Avatar Generator
It is a module that automatically generates and applies avatars based on the username or with DiceBear support.

- ### Advanced settings management
A user-friendly settings panel makes it easy to configure all features.</summary>

# Türkçe

- ### Her kullanıcı için ayrı liste oluşturma
Her Jellyfin kullanıcısı için kişisel, bağımsız medya listeleri oluşturulabilir.

- ### Otomatik liste güncelleme
Medya kitaplığındaki değişikliklere göre listeler otomatik olarak güncellenir.

- ### Özelleştirilebilir Jellyfin API entegrasyonu
İhtiyaca göre şekillendirilebilen esnek API entegrasyonu sayesinde gelişmiş kontrol imkanı.

- ### Her temayla uyumlu manuel konumlandırma
Arayüz öğeleri, farklı temalara uyum sağlayacak şekilde manuel olarak konumlandırılabilir.

- ### GMMP Müzik Oynatıcı
Zengin ve duyarlı bir müzik deneyimi sunan kapsamlı bir Jellyfin müzik oynatma eklentisidir.

- ### Duraklatma Ekranı
İçerik duraklatıldığında, medya bilgileri ve oynatma kontrollerini içeren bir karşılama ekranı gösterilir.

- ### Avatar Oluşturucu
Kullanıcı adına göre veya DiceBear desteği ile otomatik olarak avatar üreten ve uygulayan bir modüldür.

- ### Gelişmiş ayar yönetimi
Kullanıcı dostu ayar paneli ile tüm özellikler kolayca yapılandırılabilir.
  
## Kurulum/Installation
<details>
<summary> Türkçe Kurulum </summary>

### Windows için

İndirdiğiniz sıkıştırılmış klasörü herhangi boş bir klasöre çıkarıp ``` install.bat ``` betiğini yönetici olarak çalıştırın ve tarayıcı çerezlerini birkaç kez temizleyin.

### Yüklemeyi Kaldırma

``` uninstall.bat ``` betiğini yönetici olarak çalıştırın.


### Linux için

``` git clone https://github.com/G-grbz/Jellyfin-Media-Slider ```

``` cd Jellyfin-Media-Slider ```

### Kurulum scriptini çalıştırın:

``` sudo chmod +x install.sh && sudo ./install.sh ```

### Tarayıcı çerezlerini temizleyin.

### Liste Güncelleme Scripti

listUpdate klasöründeki script belirli aralıklarla kullanıcı listelerini günceller.

### Gerekli Ayarlar
.env dosyasını düzenleyerek gerekli bilgileri girin.

### Script Seçenekleri
'updateList'	içerikleri rastgele listeler
( değerleri değiştirmek için /modules/listConfig.json el ile yapılandırılmalı ve script yeniden başlatılmalıdır.

Detaylı açıklamalar;

``` itemLimit: ``` Slider'da gösterilecek maksimum öğe sayısı

``` garantiLimit: ``` Her içerik türünden garanti edilecek minimum öğe sayısı

``` listLimit: ``` Önceki listelerin saklanacağı maksimum sayı (tekrarları önlemek için)

``` listRefresh": ``` "Listenin yenilenme aralığı (milisaniye - 300000ms = 5 dakika)

``` listcustomQueryString: ``` Jellyfin API'si için özel sorgu parametreleri)

# Script Çalıştırma

### list ve listUpdate klasörüne okuma yazma izni verin

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate ```

### Gerekli bağımlılıkları yükleyin:

``` cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch ```

### scripti çalıştırın:

``` node updateList.mjs ```

### Yüklemeyi Kaldırma

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh && sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ```
</details>

<details>
<summary> English Installation</summary>

### For Windows
Extract the downloaded compressed folder to any empty folder, then run the ``` install.bat ``` file as administrator and clear your browser cookies a few times.

### Uninstalling
Run the script ``` uninstall.bat ``` as administrator.

### For Linux

``` git clone https://github.com/G-grbz/Jellyfin-Media-Slider ```

``` cd Jellyfin-Media-Slider ```

### Run the installation script:

``` sudo chmod +x install.sh && sudo ./install.sh ```

### Clear browser cookies to ensure the changes take effect.

## List Update Script

The script in the listUpdate folder updates user lists at specific intervals.

### Required Settings

Edit the .env file and insert the necessary information.

### Script Options

'updateList' lists the contents randomly
( /modules/listConfig.json needs to be configured manually and the script needs to be restarted for the changes to take effect.

Detailed explanations;

``` itemLimit: ``` Maximum number of items to show in slider

``` garantiLimit: ``` Minimum guaranteed items per content type (Movie/Series/BoxSet)

``` listLimit: ``` Max number of previous lists to store (prevent duplicates)

``` listRefresh: ``` Refresh interval in milliseconds (300000ms = 5 minutes)

```  listcustomQueryString: ``` Custom query parameters for Jellyfin API )

### Running the Script

### Give read-write permission to the list and listUpdate folder

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate ```

### Install dependencies:

``` cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch ```

### Run the script:

``` node updateList.mjs ```

### Uninstallation

### To remove the installation, run:

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

## 📄 License and Usage Notice
This project is not allowed to be copied, redistributed, or published without explicit permission.

If you intend to use, modify, or share any part of this project, you must:

Credit the original author clearly.

Provide a link to the original repository.

Indicate any changes made if the project is modified or forked.

Unauthorized use or redistribution is strictly prohibited.

Thank you for respecting the work and effort behind this project.
