# Jellyfin Media Slider


### Orijinal eklenti sahibi BobHasNoSoul'a çalışmaları için teşekkür ederim.

Jellyfin için özelleştirilebilir medya slider bileşeni. Orijinal [jellyfin-featured](https://github.com/BobHasNoSoul/jellyfin-featured) eklentisinden fork edilerek geliştirilmiştir.

<details>
<summary>🖼️ Ekran Görüntüleri / Screenshots </summary>

## Kompakt Görünüm / Compact View

![1](https://github.com/user-attachments/assets/e18593d9-38fc-4ab1-9203-bf71d41d7145)

![kompak2](https://github.com/user-attachments/assets/54f145d0-8799-4fb2-abf5-b7394c358909)

## Tam Ekran / Full Screen

![2](https://github.com/user-attachments/assets/0bb2aaa7-c495-4d8a-9ffd-c4ad7e818a54)


![full2](https://github.com/user-attachments/assets/1d368599-9b0f-45c1-86f7-1e8420edbf19)

## Ayarlar Sayfası / Settings Page

![settings](https://github.com/user-attachments/assets/e8228f2f-1a6e-4bef-89d1-202655fa1dc4)


 </details>


## Özellikler

- Kullanıcı dostu medya slider arayüzü
- Her kullanıcı için ayrı liste oluşturma
- Liste kullanılmadığında api özelleştirme
- Otomatik liste güncelleme özelliği
- Liste türü desteği:
  - Rastgele seçim
- Kullanıcı bazlı özelleştirme
  
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

### Jellyfin Media Slider

A customizable media slider component for Jellyfin. This project is a fork and enhancement of the original jellyfin-featured plugin. Special thanks to the original creator, BobHasNoSoul, for his work.

### Features

- User-friendly media slider interface

- Individual lists for each user

- API customization when a list is not in use

- Automatic list update functionality

- List type support:

    - Random selection (for customized content)

- User-based personalization


### Contributors

### Original Plugin Author: BobHasNoSoul
