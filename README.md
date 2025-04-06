# Jellyfin Media Slider


### Orijinal eklenti sahibi BobHasNoSoul'a çalışmaları için teşekkür ederim.

Jellyfin için özelleştirilebilir medya slider bileşeni. Orijinal [jellyfin-featured](https://github.com/BobHasNoSoul/jellyfin-featured) eklentisinden fork edilerek geliştirilmiştir.

<details>
<summary>🖼️ Ekran Görüntüleri / Screenshots </summary>

## Kompakt Görünüm / Compact View

![kompak1](https://github.com/user-attachments/assets/8064fc83-1b14-4315-b254-678f1706ee18)

![kompak2](https://github.com/user-attachments/assets/54f145d0-8799-4fb2-abf5-b7394c358909)

## Tam Ekran / Full Screen

![full1](https://github.com/user-attachments/assets/8afefa71-2a38-4338-85e3-6c6450f0cfab)

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

İndirdiğiniz sıkıştırılmış klasörü herhangi boş bir klasöre çıkarıp ``` install.bat ``` dosyasını yönetici olarak çalıştırın ve tarayıcı çerezlerini birkaç kez temizleyin.

### Yüklemeyi Kaldırma

``` uninstall.bat ``` dosyasını yönetici olarak çalıştırın.


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
'updateList'	Rastgele içerikleri listeler ( değerleri değiştirmek için listConfig.json el ile yapılandırılmalı ve script yeniden başlatılmalı.)

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
Run the ``` uninstall.bat ``` file as administrator.

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

# Script Options

updateList random content. (To change the values, manually configure the listConfig.json file and restart the script.)

### Running the Script

### Give read-write permission to the list and listUpdate folder

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list && sudo chmod -R a+rw /usr/share/jellyfin/web/slider/listUpdate ```

### Install dependencies:

``` cd /usr/share/jellyfin/web/slider/listUpdate && npm install dotenv node-fetch ```

### Run the script:

``` node updateList.mjs ```

## Uninstallation

## To remove the installation, run:

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh && sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ``` </details>

# Jellyfin Media Slider

A customizable media slider component for Jellyfin. This project is a fork and enhancement of the original jellyfin-featured plugin. Special thanks to the original creator, BobHasNoSoul, for his work.

## Features

- User-friendly media slider interface

- Individual lists for each user

- API customization when a list is not in use

- Automatic list update functionality

- List type support:

    - Random selection (for customized content)

- User-based personalization


### Contributors

### Original Plugin Author: BobHasNoSoul
